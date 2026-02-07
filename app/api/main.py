from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any, Tuple
import httpx
import os
from dotenv import load_dotenv
import time
import json
import logging
import asyncio
from collections import defaultdict

# Import database and models
from database import init_database, test_connection, close_database_pool
from models import (
    RecommendationRequest, RecommendationResponse, DiscoverResponse,
    DraftsResponse, PicksResponse, PlayersResponse,
    Recommendation as RecommendationModel, DatabaseUser, DatabaseLeague, UserLeague
)
from db_operations import (
    create_user, create_or_update_league, create_user_league,
    create_or_update_draft, create_pick, bulk_create_picks,
    create_recommendation, get_recent_recommendations
)
from player_sync import (
    ensure_players_loaded, get_sync_status, start_periodic_sync,
    stop_periodic_sync, sync_players
)

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Sleeper Draft Assistant API",
    description="API for intelligent fantasy football draft recommendations powered by Claude",
    version="2.0.0"
)

# CORS middleware — strip whitespace from origins
allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
SLEEPER_BASE = os.getenv("SLEEPER_BASE_URL", "https://api.sleeper.app")
CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", "60"))
PLAYER_CACHE_TTL = int(os.getenv("PLAYER_CACHE_TTL_SECONDS", "21600"))
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")

# Rate limiting
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 10  # max /recommend calls per window per IP
_rate_limit_store: Dict[str, List[float]] = defaultdict(list)

# Simple in-memory cache
cache: Dict[str, Tuple[Any, float, Optional[int]]] = {}

# Replacement-level baselines for VORP (fantasy points per season)
REPLACEMENT_BASELINES: Dict[str, float] = {
    "QB": 200.0, "RB": 120.0, "WR": 110.0, "TE": 75.0, "K": 100.0, "DEF": 80.0,
}

# Position scarcity multipliers
POSITION_SCARCITY: Dict[str, float] = {
    "RB": 50.0, "TE": 40.0, "WR": 25.0, "QB": 15.0, "K": 5.0, "DEF": 10.0,
}


def get_cache_key(endpoint: str, params: dict) -> str:
    return f"{endpoint}:{json.dumps(params, sort_keys=True)}"


def get_from_cache(key: str):
    if key in cache:
        data, timestamp, ttl = cache[key]
        ttl_seconds = ttl if ttl is not None else CACHE_TTL
        if ttl_seconds <= 0 or time.time() - timestamp < ttl_seconds:
            return data
        del cache[key]
    return None


def set_cache(key: str, data: Any, ttl: Optional[int] = None):
    cache[key] = (data, time.time(), ttl)


def check_rate_limit(client_ip: str) -> bool:
    """Return True if request is allowed, False if rate-limited."""
    now = time.time()
    _rate_limit_store[client_ip] = [
        t for t in _rate_limit_store[client_ip] if now - t < RATE_LIMIT_WINDOW
    ]
    if len(_rate_limit_store[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        return False
    _rate_limit_store[client_ip].append(now)
    return True


@app.on_event("startup")
async def startup_event():
    try:
        await init_database()
        if await test_connection():
            logger.info("Database connection successful")
        else:
            logger.warning("Database connection failed")
        try:
            await ensure_players_loaded()
        except Exception as sync_error:
            logger.warning("Initial player sync failed: %s", sync_error)
        start_periodic_sync()
    except Exception as e:
        logger.error("Database initialization failed: %s", e)


@app.on_event("shutdown")
async def shutdown_event():
    await stop_periodic_sync()
    await close_database_pool()


async def get_players_with_cache() -> Dict[str, Any]:
    cache_key = "players:ranking"
    cached = get_from_cache(cache_key)
    if cached:
        return cached
    try:
        players = await ensure_players_loaded()
        result = {"players": players}
        set_cache(cache_key, result, ttl=PLAYER_CACHE_TTL)
        return result
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Sleeper API timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching players: {str(e)}")


def calculate_deterministic_rankings(
    players: Dict[str, Any],
    picks: List[Dict[str, Any]],
    roster_positions: List[str],
    scoring: Dict[str, Any],
    pick_no: int,
    strategy: str,
    team_on_clock: str
) -> List[Dict[str, Any]]:
    """
    Calculate deterministic rankings using VORP + roster needs + scarcity + ADP.
    Uses proper replacement-level baselines and actual roster need analysis.
    """
    strategy_weights = {
        "safe": {"w1": 1.1, "w2": 0.30, "w3": 0.6, "w4": 0.25, "w5": 0.08, "w6": 0.18, "w7": 0.05},
        "balanced": {"w1": 1.0, "w2": 0.35, "w3": 0.5, "w4": 0.3, "w5": 0.05, "w6": 0.15, "w7": 0.1},
        "upside": {"w1": 1.0, "w2": 0.35, "w3": 0.4, "w4": 0.35, "w5": 0.03, "w6": 0.10, "w7": 0.25},
    }
    weights = strategy_weights.get(strategy, strategy_weights["balanced"])

    drafted_ids = {pick["player_id"] for pick in picks if pick.get("player_id")}

    # Analyse team roster needs from actual picks
    team_picks = [p for p in picks if str(p.get("roster_id")) == str(team_on_clock)]
    team_positions: Dict[str, int] = defaultdict(int)
    for tp in team_picks:
        pid = tp.get("player_id")
        if pid and pid in players:
            pos = players[pid].get("pos")
            if pos:
                team_positions[pos] += 1

    # Count starter slots by position
    starter_slots: Dict[str, int] = defaultdict(int)
    for pos in roster_positions:
        if pos not in ("BN", "IR", "FLEX", "SUPER_FLEX", "REC_FLEX"):
            starter_slots[pos] += 1
    flex_count = roster_positions.count("FLEX") + roster_positions.count("REC_FLEX")
    superflex_count = roster_positions.count("SUPER_FLEX")

    remaining_players = []
    for player_id, player_data in players.items():
        if player_id in drafted_ids:
            continue
        pos = player_data.get("pos")
        if pos not in ("QB", "RB", "WR", "TE"):
            continue
        remaining_players.append({
            "player_id": player_id,
            "full_name": player_data.get("full_name", "Unknown"),
            "pos": pos,
            "team": player_data.get("team"),
            "adp": player_data.get("adp"),
            "tier": player_data.get("tier"),
            "projection_baseline": (
                player_data.get("fantasy_points_ppr")
                or player_data.get("projection_baseline")
                or 0
            ),
            "bye_week": player_data.get("bye_week"),
            "injury_status": player_data.get("injury_status", "healthy"),
        })

    remaining_by_pos: Dict[str, int] = defaultdict(int)
    for p in remaining_players:
        remaining_by_pos[p["pos"]] += 1

    scored_players = []
    for player in remaining_players:
        pos = player["pos"]
        baseline = player["projection_baseline"] or 0
        replacement = REPLACEMENT_BASELINES.get(pos, 100)
        vorp = max(0, baseline - replacement)

        adp = player["adp"]
        adp_discount = max(0, (adp or 999) - pick_no) if adp else 0

        # Roster need boost based on actual team composition
        filled = team_positions.get(pos, 0)
        required = starter_slots.get(pos, 0)
        if pos in ("RB", "WR", "TE"):
            effective_required = required + (flex_count if filled < required else 0)
        else:
            effective_required = required + (superflex_count if pos == "QB" else 0)
        unfilled = max(0, effective_required - filled)
        need_boost = unfilled * 0.5 if unfilled > 0 else 0.1

        # Positional scarcity based on remaining pool
        base_scarcity = POSITION_SCARCITY.get(pos, 20)
        pool_size = remaining_by_pos.get(pos, 1)
        scarcity_boost = base_scarcity * (100 / max(pool_size, 1)) * 0.1

        # Bye-week penalty
        bye_penalty = 0
        if player["bye_week"]:
            same_bye = sum(
                1 for tp in team_picks
                if tp.get("player_id") in players
                and players[tp["player_id"]].get("bye_week") == player["bye_week"]
            )
            bye_penalty = 20 if same_bye >= 3 else 10 if same_bye >= 2 else 0

        # Injury penalty
        inj = player["injury_status"]
        injury_penalty = {"out": 50, "doubtful": 30, "questionable": 15}.get(inj, 0)

        # Upside bonus
        upside_bonus = (1 / (player["tier"] or 10)) * 20 if player["tier"] else 0

        score = (
            vorp * weights["w1"]
            + adp_discount * weights["w2"]
            + need_boost * weights["w3"]
            + scarcity_boost * weights["w4"]
            - bye_penalty * weights["w5"]
            - injury_penalty * weights["w6"]
            + upside_bonus * weights["w7"]
        )

        scored_players.append({
            "player_id": player["player_id"],
            "full_name": player["full_name"],
            "pos": player["pos"],
            "team": player["team"],
            "score": round(score, 2),
            "vorp": round(vorp, 2),
            "adp_discount": round(adp_discount, 2),
            "need_boost": round(need_boost, 2),
            "scarcity_boost": round(scarcity_boost, 2),
            "bye_penalty": round(bye_penalty, 2),
            "injury_penalty": round(injury_penalty, 2),
            "upside_bonus": round(upside_bonus, 2),
        })

    scored_players.sort(key=lambda x: x["score"], reverse=True)

    for i, p in enumerate(scored_players):
        if i + 1 < len(scored_players):
            p["edge_vs_next"] = round(p["score"] - scored_players[i + 1]["score"], 2)
        else:
            p["edge_vs_next"] = 0.0

    return scored_players[:12]


async def get_llm_recommendations(
    deterministic_rankings: List[Dict[str, Any]],
    context: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Get LLM recommendations using Claude as tie-breaker."""
    if not ANTHROPIC_API_KEY:
        return deterministic_rankings

    try:
        import anthropic

        candidates = deterministic_rankings[:8]

        system_prompt = """You are an NFL draft strategy expert. Given league settings, roster needs, and the candidate list with VORP/ADP/tier/risks, re-rank the candidates and provide reasons.

Key considerations:
- Prefer VORP and positional scarcity
- Avoid overreacting to minor news
- Keep reasons concise (max 140 chars)
- Consider roster construction needs
- Factor in draft position value

You MUST respond with ONLY a valid JSON object matching this exact schema, no other text:
{
  "ranked": [
    {
      "player_id": "string",
      "reason": "string (max 140 chars)",
      "fit": "value|need|stack|upside|safe",
      "edge_vs_next": number
    }
  ]
}"""

        user_prompt = f"""League: {context.get('league_name', 'Unknown')}
Team on clock: {context.get('team_on_clock', 'Unknown')}
Pick number: {context.get('pick_no', 0)}
Strategy: {context.get('strategy', 'balanced')}
Roster positions: {json.dumps(context.get('roster_positions', []))}

Candidates (pre-ranked by VORP model):
{json.dumps(candidates, indent=2)}

Respond with ONLY the JSON object."""

        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=1500,
            temperature=0.3,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )

        content = response.content[0].text

        # Robust JSON parsing — handle markdown code fences
        json_str = content.strip()
        if json_str.startswith("```"):
            lines = json_str.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            json_str = "\n".join(lines)

        parsed = json.loads(json_str)

        if "ranked" in parsed and isinstance(parsed["ranked"], list):
            validated = []
            valid_fits = {"value", "need", "stack", "upside", "safe"}
            for entry in parsed["ranked"]:
                if isinstance(entry, dict) and "player_id" in entry:
                    entry.setdefault("reason", "High value pick")
                    entry.setdefault("fit", "value")
                    if entry["fit"] not in valid_fits:
                        entry["fit"] = "value"
                    entry.setdefault("edge_vs_next", 0.0)
                    validated.append(entry)
            if validated:
                return validated

        return deterministic_rankings[:8]

    except json.JSONDecodeError as e:
        logger.warning("Claude returned invalid JSON: %s", e)
        return deterministic_rankings[:8]
    except Exception as e:
        logger.warning("Claude recommendation error: %s", e)
        return deterministic_rankings[:8]


@app.get("/")
async def root():
    return {"message": "Sleeper Draft Assistant API", "status": "healthy"}


@app.get("/discover")
async def discover(
    username: str = Query(..., description="Sleeper username"),
    season: str = Query(..., description="NFL season (e.g., 2024)")
):
    cache_key = get_cache_key("discover", {"username": username, "season": season})
    cached = get_from_cache(cache_key)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            user_response = await client.get(f"{SLEEPER_BASE}/v1/user/{username}")
            if not user_response.is_success:
                raise HTTPException(status_code=404, detail="Username not found")

            user = user_response.json()
            if "user_id" not in user:
                raise HTTPException(status_code=404, detail="Invalid user data")

            leagues_response = await client.get(
                f"{SLEEPER_BASE}/v1/user/{user['user_id']}/leagues/nfl/{season}"
            )
            if not leagues_response.is_success:
                raise HTTPException(status_code=500, detail="Failed to fetch leagues")

            leagues = leagues_response.json()
            result = {"user_id": user["user_id"], "leagues": leagues}
            set_cache(cache_key, result)

            # Persist user and leagues to DB (fire-and-forget)
            asyncio.create_task(_persist_discovery(user, leagues, season))

            return result

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Sleeper API timeout")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error discovering user: {str(e)}")


async def _persist_discovery(user: dict, leagues: list, season: str):
    """Background task to persist discovered user/league data."""
    try:
        await create_user(DatabaseUser(
            user_id=user["user_id"],
            username=user.get("username", user["user_id"]),
            display_name=user.get("display_name"),
            avatar=user.get("avatar"),
        ))
        for league_data in leagues:
            if not isinstance(league_data, dict):
                continue
            league_id = league_data.get("league_id")
            if not league_id:
                continue
            await create_or_update_league(DatabaseLeague(
                league_id=league_id,
                name=league_data.get("name", "Unknown League"),
                season=league_data.get("season", season),
                sport=league_data.get("sport", "nfl"),
                status=league_data.get("status", "active"),
                roster_positions=league_data.get("roster_positions"),
                scoring_settings=league_data.get("scoring_settings"),
            ))
            await create_user_league(UserLeague(
                user_id=user["user_id"],
                league_id=league_id,
            ))
    except Exception as e:
        logger.warning("Failed to persist discovery data: %s", e)


@app.get("/drafts")
async def get_drafts(league_id: str = Query(..., description="League ID")):
    cache_key = get_cache_key("drafts", {"league_id": league_id})
    cached = get_from_cache(cache_key)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{SLEEPER_BASE}/v1/league/{league_id}/drafts")
            if not response.is_success:
                raise HTTPException(status_code=404, detail="Failed to fetch drafts")

            drafts = response.json()
            result = {"drafts": drafts}
            set_cache(cache_key, result)
            return result

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Sleeper API timeout")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching drafts: {str(e)}")


@app.get("/picks")
async def get_picks(draft_id: str = Query(..., description="Draft ID")):
    cache_key = get_cache_key("picks", {"draft_id": draft_id})
    cached = get_from_cache(cache_key)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{SLEEPER_BASE}/v1/draft/{draft_id}/picks")
            if not response.is_success:
                raise HTTPException(status_code=404, detail="Failed to fetch picks")

            picks = response.json()
            result = {"picks": picks}
            set_cache(cache_key, result)
            return result

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Sleeper API timeout")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching picks: {str(e)}")


@app.get("/players")
async def get_players(
    pos: Optional[str] = Query(None, description="Filter by position (QB, RB, WR, TE)"),
    limit: int = Query(500, ge=1, le=5000, description="Max players to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    """Get NFL players with optional filtering and pagination."""
    cache_key = get_cache_key("players", {"pos": pos, "limit": limit, "offset": offset})
    cached = get_from_cache(cache_key)
    if cached:
        return cached

    try:
        all_players = await ensure_players_loaded()

        if pos:
            filtered = {
                pid: pdata for pid, pdata in all_players.items()
                if pdata.get("pos") == pos.upper()
            }
        else:
            filtered = all_players

        total = len(filtered)
        sorted_ids = sorted(filtered.keys())
        page_ids = sorted_ids[offset:offset + limit]
        paginated = {pid: filtered[pid] for pid in page_ids}

        result = {"players": paginated, "total": total, "limit": limit, "offset": offset}
        set_cache(cache_key, result, ttl=PLAYER_CACHE_TTL)
        return result
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Sleeper API timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching players: {str(e)}")


@app.post("/players/sync")
async def trigger_player_sync(force: bool = Query(False, description="Force refresh from Sleeper")):
    try:
        result = await sync_players(force=force)
        payload = {"players": result["players"]}
        set_cache("players:ranking", payload, ttl=PLAYER_CACHE_TTL)
        return {
            "status": result["status"],
            "synced": result.get("synced", 0),
            "last_synced": result.get("last_synced"),
            "source": result.get("source"),
            "reason": result.get("reason"),
        }
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="Failed to sync players from Sleeper")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync players: {str(e)}")


@app.get("/players/sync/status")
async def get_player_sync_status():
    return get_sync_status()


@app.post("/recommend", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest, req: Request):
    """
    Get AI-powered pick recommendations using deterministic scoring + Claude tie-breaker.
    Rate-limited to prevent abuse.
    """
    client_ip = req.client.host if req.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Max 10 recommendation requests per minute.",
        )

    try:
        picks_response = await get_picks(request.draft_id)
        picks = picks_response["picks"]

        # Fetch league settings from Sleeper (fall back to defaults)
        roster_positions = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF",
                           "BN", "BN", "BN", "BN", "BN", "BN"]
        scoring: Dict[str, Any] = {
            "passing_yard": 0.04, "passing_td": 4,
            "rushing_yard": 0.1, "rushing_td": 6,
            "receiving_yard": 0.1, "receiving_td": 6, "ppr": 1.0,
        }
        league_name = "Fantasy League"

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                draft_resp = await client.get(f"{SLEEPER_BASE}/v1/draft/{request.draft_id}")
                if draft_resp.is_success:
                    draft_data = draft_resp.json()
                    lid = draft_data.get("league_id")
                    if lid:
                        league_resp = await client.get(f"{SLEEPER_BASE}/v1/league/{lid}")
                        if league_resp.is_success:
                            ld = league_resp.json()
                            roster_positions = ld.get("roster_positions", roster_positions)
                            scoring = ld.get("scoring_settings", scoring)
                            league_name = ld.get("name", league_name)
        except Exception:
            pass

        players_data = await get_players_with_cache()
        players = players_data["players"]
        pick_no = len(picks) + 1

        deterministic_rankings = calculate_deterministic_rankings(
            players=players, picks=picks, roster_positions=roster_positions,
            scoring=scoring, pick_no=pick_no, strategy=request.strategy,
            team_on_clock=request.team_on_clock,
        )

        context = {
            "league_name": league_name,
            "team_on_clock": request.team_on_clock,
            "pick_no": pick_no,
            "strategy": request.strategy,
            "roster_positions": roster_positions,
        }

        llm_recommendations = await get_llm_recommendations(deterministic_rankings, context)

        formatted: List[Dict[str, Any]] = []
        for rec in llm_recommendations:
            if not isinstance(rec, dict) or "player_id" not in rec:
                continue
            formatted.append({
                "player_id": rec["player_id"],
                "reason": rec.get("reason", "High value pick"),
                "fit": rec.get("fit", "value"),
                "edge_vs_next": rec.get("edge_vs_next", 0.0),
                "score": rec.get("score", 0.0),
                "vorp": rec.get("vorp", 0.0),
                "adp_discount": rec.get("adp_discount", 0.0),
                "need_boost": rec.get("need_boost", 0.0),
                "scarcity_boost": rec.get("scarcity_boost", 0.0),
                "bye_penalty": rec.get("bye_penalty", 0.0),
                "injury_penalty": rec.get("injury_penalty", 0.0),
                "upside_bonus": rec.get("upside_bonus", 0.0),
            })

        # Persist recommendations to DB (fire-and-forget)
        asyncio.create_task(_persist_recommendations(request, formatted))

        return RecommendationResponse(
            ranked=formatted,
            generated_at=int(time.time()),
            strategy=request.strategy,
            llm_enabled=bool(ANTHROPIC_API_KEY),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Recommendation error: %s", e)
        raise HTTPException(status_code=500, detail="Error generating recommendations")


async def _persist_recommendations(request: RecommendationRequest, recommendations: list):
    """Background task to persist recommendations to DB."""
    try:
        for rec in recommendations[:8]:
            await create_recommendation(RecommendationModel(
                draft_id=request.draft_id,
                team_on_clock=request.team_on_clock,
                strategy=request.strategy,
                player_id=rec["player_id"],
                reason=rec.get("reason", ""),
                fit=rec.get("fit", "value"),
                score=rec.get("score"),
                vorp=rec.get("vorp"),
                adp_discount=rec.get("adp_discount"),
                need_boost=rec.get("need_boost"),
                scarcity_boost=rec.get("scarcity_boost"),
            ))
    except Exception as e:
        logger.warning("Failed to persist recommendations: %s", e)


@app.get("/recommendations/history")
async def get_recommendation_history(
    draft_id: str = Query(..., description="Draft ID"),
    limit: int = Query(10, ge=1, le=50),
):
    """Get past recommendations for a draft."""
    try:
        recs = await get_recent_recommendations(draft_id, limit=limit)
        return {"recommendations": [r.model_dump() for r in recs]}
    except Exception as e:
        logger.error("Error fetching recommendation history: %s", e)
        raise HTTPException(status_code=500, detail="Error fetching recommendations")


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": int(time.time()),
        "llm_provider": "anthropic",
        "llm_configured": bool(ANTHROPIC_API_KEY),
        "llm_model": ANTHROPIC_MODEL if ANTHROPIC_API_KEY else None,
        "cache_entries": len(cache),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("DEBUG", "false").lower() == "true",
    )
