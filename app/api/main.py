from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any, Tuple
import httpx
import os
from dotenv import load_dotenv
import time
import json

# Import database and models
from database import init_database, test_connection, close_database_pool
from models import (
    RecommendationRequest, RecommendationResponse, DiscoverResponse,
    DraftsResponse, PicksResponse, PlayersResponse
)
from db_operations import (
    create_user, create_or_update_league, create_user_league,
    create_or_update_draft, create_pick, bulk_create_picks,
    create_recommendation
)
from player_sync import (
    ensure_players_loaded, get_sync_status, start_periodic_sync,
    stop_periodic_sync, sync_players
)

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Sleeper Draft Assistant API",
    description="API for intelligent fantasy football draft recommendations",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
SLEEPER_BASE = os.getenv("SLEEPER_BASE_URL", "https://api.sleeper.app")
CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", "60"))
PLAYER_CACHE_TTL = int(os.getenv("PLAYER_CACHE_TTL_SECONDS", "21600"))
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Simple in-memory cache (keeping for API responses, database for persistent data)
cache: Dict[str, Tuple[Any, float, Optional[int]]] = {}

def get_cache_key(endpoint: str, params: dict) -> str:
    """Generate cache key for endpoint and parameters"""
    return f"{endpoint}:{json.dumps(params, sort_keys=True)}"

def get_from_cache(key: str):
    """Get data from cache if not expired"""
    if key in cache:
        data, timestamp, ttl = cache[key]
        ttl_seconds = ttl if ttl is not None else CACHE_TTL
        if ttl_seconds <= 0 or time.time() - timestamp < ttl_seconds:
            return data
        del cache[key]
    return None


def set_cache(key: str, data: Any, ttl: Optional[int] = None):
    """Set data in cache with current timestamp"""
    cache[key] = (data, time.time(), ttl)

# Database initialization
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    try:
        await init_database()
        # Test database connection
        if await test_connection():
            print("✅ Database connection successful")
        else:
            print("❌ Database connection failed")
        try:
            await ensure_players_loaded()
        except Exception as sync_error:
            print(f"⚠️ Initial player sync failed: {sync_error}")
        start_periodic_sync()
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up database connections on shutdown"""
    await stop_periodic_sync()
    await close_database_pool()

async def get_players_with_cache() -> Dict[str, Any]:
    """Get players with longer cache for ranking calculations"""
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
    Calculate deterministic rankings using VORP + roster needs + scarcity + ADP
    This is a simplified version - in production you'd use the core ranking module
    """
    
    # Strategy weights
    strategy_weights = {
        "safe": {"w1": 1.1, "w2": 0.30, "w3": 0.6, "w4": 0.25, "w5": 0.08, "w6": 0.18, "w7": 0.05},
        "balanced": {"w1": 1.0, "w2": 0.35, "w3": 0.5, "w4": 0.3, "w5": 0.05, "w6": 0.15, "w7": 0.1},
        "upside": {"w1": 1.0, "w2": 0.35, "w3": 0.4, "w4": 0.35, "w5": 0.03, "w6": 0.10, "w7": 0.25}
    }
    
    weights = strategy_weights.get(strategy, strategy_weights["balanced"])
    
    # Get drafted player IDs
    drafted_ids = {pick["player_id"] for pick in picks if pick.get("player_id")}
    
    # Filter remaining players
    remaining_players = []
    for player_id, player_data in players.items():
        if player_id not in drafted_ids and player_data.get("pos") in ["QB", "RB", "WR", "TE"]:
            remaining_players.append({
                "player_id": player_id,
                "full_name": player_data.get("full_name", "Unknown"),
                "pos": player_data.get("pos", "UNK"),
                "team": player_data.get("team"),
                "adp": player_data.get("adp"),
                "tier": player_data.get("tier"),
                "projection_baseline": player_data.get("fantasy_points_ppr", 0),
                "bye_week": player_data.get("bye_week"),
                "injury_status": player_data.get("injury_status", "healthy")
            })
    
    # Calculate scores for each player
    scored_players = []
    for player in remaining_players:
        # VORP calculation (simplified)
        vorp = max(0, (player["projection_baseline"] or 0) - 100)
        
        # ADP discount
        adp_discount = max(0, (player["adp"] or 999) - pick_no) if player["adp"] else 0
        
        # Roster need boost (simplified)
        need_boost = 0.5 if player["pos"] in ["RB", "WR"] else 0.3
        
        # Positional scarcity
        scarcity_boost = 50 if player["pos"] == "RB" else 30 if player["pos"] == "TE" else 20
        
        # Bye week penalty (simplified)
        bye_penalty = 0
        
        # Injury penalty
        injury_penalty = 0
        if player["injury_status"] == "out":
            injury_penalty = 50
        elif player["injury_status"] == "doubtful":
            injury_penalty = 30
        elif player["injury_status"] == "questionable":
            injury_penalty = 15
        
        # Upside bonus
        upside_bonus = (1 / (player["tier"] or 10)) * 20 if player["tier"] else 0
        
        # Calculate final score
        score = (vorp * weights["w1"] + 
                adp_discount * weights["w2"] + 
                need_boost * weights["w3"] + 
                scarcity_boost * weights["w4"] - 
                bye_penalty * weights["w5"] - 
                injury_penalty * weights["w6"] + 
                upside_bonus * weights["w7"])
        
        scored_players.append({
            "player_id": player["player_id"],
            "full_name": player["full_name"],
            "pos": player["pos"],
            "team": player["team"],
            "score": score,
            "vorp": vorp,
            "adp_discount": adp_discount,
            "need_boost": need_boost,
            "scarcity_boost": scarcity_boost,
            "bye_penalty": bye_penalty,
            "injury_penalty": injury_penalty,
            "upside_bonus": upside_bonus
        })
    
    # Sort by score and return top 12
    scored_players.sort(key=lambda x: x["score"], reverse=True)
    return scored_players[:12]

async def get_llm_recommendations(
    deterministic_rankings: List[Dict[str, Any]],
    context: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Get LLM recommendations using OpenAI as tie-breaker"""
    if not OPENAI_API_KEY:
        return deterministic_rankings
    
    try:
        # Prepare candidates for LLM
        candidates = deterministic_rankings[:8]  # Top 8 for LLM
        
        # Create prompt for LLM
        system_prompt = """You are an NFL draft strategy expert. Given league settings, roster needs, and the candidate list with VORP/ADP/tier/risks, output a strict JSON object.

Key considerations:
- Prefer VORP and positional scarcity
- Avoid overreacting to minor news
- Keep reasons concise (≤140 chars)
- Consider roster construction needs
- Factor in draft position value

Output only valid JSON matching this schema:
{
  "ranked": [
    {
      "player_id": "string",
      "reason": "string (≤140 chars)",
      "fit": "value|need|stack|upside|safe",
      "edge_vs_next": number
    }
  ]
}"""

        user_prompt = f"""League: {context.get('league_name', 'Unknown')}
Team on clock: {context.get('team_on_clock', 'Unknown')}
Pick number: {context.get('pick_no', 0)}
Strategy: {context.get('strategy', 'balanced')}

Candidates:
{json.dumps(candidates, indent=2)}

Return only the JSON response."""

        # Make OpenAI API call
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": OPENAI_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1000
                }
            )
            
            if response.is_success:
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                
                # Try to extract JSON from response
                try:
                    # Find JSON in the response
                    start_idx = content.find('{')
                    end_idx = content.rfind('}') + 1
                    if start_idx >= 0 and end_idx > start_idx:
                        json_str = content[start_idx:end_idx]
                        parsed = json.loads(json_str)
                        
                        if "ranked" in parsed and isinstance(parsed["ranked"], list):
                            return parsed["ranked"]
                except (json.JSONDecodeError, KeyError):
                    pass
                
                # Fallback: return deterministic rankings with basic formatting
                return deterministic_rankings[:8]
            else:
                return deterministic_rankings[:8]
                
    except Exception as e:
        print(f"LLM recommendation error: {e}")
        return deterministic_rankings[:8]

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Sleeper Draft Assistant API", "status": "healthy"}

@app.get("/discover")
async def discover(
    username: str = Query(..., description="Sleeper username"),
    season: str = Query(..., description="NFL season (e.g., 2024)")
):
    """
    Discover user and their leagues for a given season
    """
    cache_key = get_cache_key("discover", {"username": username, "season": season})
    cached = get_from_cache(cache_key)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Get user ID first
            user_response = await client.get(f"{SLEEPER_BASE}/v1/user/{username}")
            if not user_response.is_success:
                raise HTTPException(status_code=404, detail=f"Username not found: {username}")
            
            user = user_response.json()
            if "user_id" not in user:
                raise HTTPException(status_code=404, detail=f"Invalid user data for: {username}")

            # Get user's leagues for the season
            leagues_response = await client.get(f"{SLEEPER_BASE}/v1/user/{user['user_id']}/leagues/nfl/{season}")
            if not leagues_response.is_success:
                raise HTTPException(status_code=500, detail=f"Failed to fetch leagues for user: {username}")
            
            leagues = leagues_response.json()
            
            result = {
                "user_id": user["user_id"],
                "leagues": leagues
            }
            
            set_cache(cache_key, result)
            return result

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Sleeper API timeout")
    except HTTPException as e:
        # Re-raise explicit HTTP errors (e.g., 404)
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error discovering user: {str(e)}")

@app.get("/drafts")
async def get_drafts(
    league_id: str = Query(..., description="League ID")
):
    """
    Get drafts for a specific league
    """
    cache_key = get_cache_key("drafts", {"league_id": league_id})
    cached = get_from_cache(cache_key)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{SLEEPER_BASE}/v1/league/{league_id}/drafts")
            if not response.is_success:
                raise HTTPException(status_code=404, detail=f"Failed to fetch drafts for league: {league_id}")
            
            drafts = response.json()
            result = {"drafts": drafts}
            
            set_cache(cache_key, result)
            return result

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Sleeper API timeout")
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching drafts: {str(e)}")

@app.get("/picks")
async def get_picks(
    draft_id: str = Query(..., description="Draft ID")
):
    """
    Get picks for a specific draft (with short cache for live updates)
    """
    cache_key = get_cache_key("picks", {"draft_id": draft_id})
    cached = get_from_cache(cache_key)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{SLEEPER_BASE}/v1/draft/{draft_id}/picks")
            if not response.is_success:
                raise HTTPException(status_code=404, detail=f"Failed to fetch picks for draft: {draft_id}")
            
            picks = response.json()
            result = {"picks": picks}
            
            # Short cache for live updates
            set_cache(cache_key, result)
            return result

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Sleeper API timeout")
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching picks: {str(e)}")

@app.get("/players")
async def get_players():
    """
    Get all NFL players (cached for longer periods)
    """
    cache_key = get_cache_key("players", {})
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
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching players: {str(e)}")


@app.post("/players/sync")
async def trigger_player_sync(force: bool = Query(False, description="Force refresh from Sleeper")):
    try:
        result = await sync_players(force=force)
        payload = {"players": result["players"]}
        set_cache(get_cache_key("players", {}), payload, ttl=PLAYER_CACHE_TTL)
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
    status = get_sync_status()
    return status

@app.post("/recommend", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """
    Get AI-powered pick recommendations using deterministic scoring + LLM tie-breaker
    """
    try:
        # Get current draft state
        picks_response = await get_picks(request.draft_id)
        picks = picks_response["picks"]
        
        # Get league info (we need roster positions and scoring)
        # For now, use defaults - in production you'd fetch this from the league endpoint
        roster_positions = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF", "BN", "BN", "BN", "BN", "BN", "BN"]
        scoring = {"passing_yard": 0.04, "passing_td": 4, "rushing_yard": 0.1, "rushing_td": 6, "receiving_yard": 0.1, "receiving_td": 6}
        
        # Get players for ranking
        players_data = await get_players_with_cache()
        players = players_data["players"]
        
        # Calculate current pick number
        pick_no = len(picks) + 1
        
        # Get deterministic rankings
        deterministic_rankings = calculate_deterministic_rankings(
            players=players,
            picks=picks,
            roster_positions=roster_positions,
            scoring=scoring,
            pick_no=pick_no,
            strategy=request.strategy,
            team_on_clock=request.team_on_clock
        )
        
        # Get LLM recommendations if available
        context = {
            "league_name": "Fantasy League",  # Would get from league data
            "team_on_clock": request.team_on_clock,
            "pick_no": pick_no,
            "strategy": request.strategy
        }
        
        llm_recommendations = await get_llm_recommendations(deterministic_rankings, context)
        
        # Format recommendations for response
        formatted_recommendations = []
        for rec in llm_recommendations:
            if isinstance(rec, dict) and "player_id" in rec:
                formatted_recommendations.append({
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
                    "upside_bonus": rec.get("upside_bonus", 0.0)
                })
        
        return RecommendationResponse(
            ranked=formatted_recommendations,
            generated_at=int(time.time()),
            strategy=request.strategy,
            llm_enabled=bool(OPENAI_API_KEY)
        )

    except Exception as e:
        print(f"Recommendation error: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check with API status"""
    return {
        "status": "healthy",
        "timestamp": int(time.time()),
        "openai_configured": bool(OPENAI_API_KEY),
        "cache_entries": len(cache)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("DEBUG", "false").lower() == "true"
    )
