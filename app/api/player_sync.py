import asyncio
import logging
import os
import time
from typing import Dict, Any, Optional

import httpx

from db_operations import bulk_create_or_update_players, get_all_players
from models import DatabasePlayer

logger = logging.getLogger(__name__)

SLEEPER_BASE = os.getenv("SLEEPER_BASE_URL", "https://api.sleeper.app")
SYNC_INTERVAL_SECONDS = int(os.getenv("PLAYER_SYNC_INTERVAL_SECONDS", "21600"))  # 6 hours
MIN_SYNC_RETRY_SECONDS = int(os.getenv("PLAYER_SYNC_MIN_RETRY_SECONDS", "300"))

_sync_lock = asyncio.Lock()
_last_sync_attempt: Optional[float] = None
_last_successful_sync: Optional[float] = None
_last_sync_error: Optional[str] = None
_periodic_task: Optional[asyncio.Task] = None


def _serialize_player(player: DatabasePlayer) -> Dict[str, Any]:
    """Convert a DatabasePlayer into a JSON-serializable dict."""
    return {
        "player_id": player.player_id,
        "full_name": player.full_name,
        "pos": player.pos,
        "team": player.team,
        "adp": float(player.adp) if player.adp is not None else None,
        "tier": player.tier,
        "projection_baseline": float(player.projection_baseline)
        if player.projection_baseline is not None
        else None,
        "bye_week": player.bye_week,
        "injury_status": player.injury_status,
        "news": player.news,
        **(player.metadata or {}),
    }


async def _fetch_players_from_sleeper() -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{SLEEPER_BASE}/v1/players/nfl")
        response.raise_for_status()
        return response.json()


async def _store_players(players: Dict[str, Any]) -> int:
    player_models = []
    for player_id, player_data in players.items():
        if not isinstance(player_data, dict):
            continue
        full_name = player_data.get("full_name")
        if not full_name:
            continue
        player_models.append(
            DatabasePlayer(
                player_id=player_id,
                full_name=full_name,
                pos=player_data.get("pos"),
                team=player_data.get("team"),
                adp=player_data.get("adp"),
                tier=player_data.get("tier"),
                projection_baseline=player_data.get("projection_baseline"),
                bye_week=player_data.get("bye_week"),
                injury_status=player_data.get("injury_status"),
                news=player_data.get("news"),
                metadata=player_data,
            )
        )

    if not player_models:
        return 0

    await bulk_create_or_update_players(player_models)
    return len(player_models)


async def _load_players_from_db() -> Dict[str, Dict[str, Any]]:
    db_players = await get_all_players()
    serialized: Dict[str, Dict[str, Any]] = {}
    for player_id, player in db_players.items():
        serialized[player_id] = _serialize_player(player)
    return serialized


async def sync_players(force: bool = False) -> Dict[str, Any]:
    """Fetch the latest players from Sleeper and persist them."""
    global _last_sync_attempt, _last_successful_sync, _last_sync_error

    now = time.time()
    if not force and _last_successful_sync and now - _last_successful_sync < SYNC_INTERVAL_SECONDS:
        players = await _load_players_from_db()
        return {
            "status": "skipped",
            "reason": "recent-sync",
            "last_synced": _last_successful_sync,
            "synced": 0,
            "source": "database",
            "players": players,
        }

    if not force and _last_sync_attempt and now - _last_sync_attempt < MIN_SYNC_RETRY_SECONDS:
        players = await _load_players_from_db()
        return {
            "status": "skipped",
            "reason": "retry-window",
            "last_synced": _last_successful_sync,
            "synced": 0,
            "source": "database",
            "players": players,
        }

    async with _sync_lock:
        # Double-check after acquiring the lock to avoid duplicate fetches
        now = time.time()
        if not force and _last_successful_sync and now - _last_successful_sync < SYNC_INTERVAL_SECONDS:
            players = await _load_players_from_db()
            return {
                "status": "skipped",
                "reason": "recent-sync",
                "last_synced": _last_successful_sync,
                "synced": 0,
                "source": "database",
                "players": players,
            }

        _last_sync_attempt = now
        try:
            raw_players = await _fetch_players_from_sleeper()
            stored = await _store_players(raw_players)
            _last_successful_sync = time.time()
            _last_sync_error = None
            players = await _load_players_from_db()
            return {
                "status": "updated",
                "synced": stored,
                "last_synced": _last_successful_sync,
                "source": "sleeper",
                "players": players,
            }
        except Exception as exc:  # pragma: no cover - logging path
            _last_sync_error = str(exc)
            logger.error("Player sync failed: %s", exc)
            raise


def get_sync_status() -> Dict[str, Any]:
    return {
        "last_attempt": _last_sync_attempt,
        "last_synced": _last_successful_sync,
        "last_error": _last_sync_error,
        "interval_seconds": SYNC_INTERVAL_SECONDS,
    }


async def ensure_players_loaded() -> Dict[str, Dict[str, Any]]:
    players = await _load_players_from_db()
    if players:
        return players

    result = await sync_players(force=True)
    return result["players"]


def start_periodic_sync() -> None:
    global _periodic_task
    if SYNC_INTERVAL_SECONDS <= 0:
        logger.info("Player sync interval disabled")
        return

    if _periodic_task and not _periodic_task.done():
        return

    loop = asyncio.get_running_loop()
    _periodic_task = loop.create_task(_periodic_sync_loop())


async def stop_periodic_sync() -> None:
    global _periodic_task
    if _periodic_task:
        _periodic_task.cancel()
        try:
            await _periodic_task
        except asyncio.CancelledError:
            pass
        _periodic_task = None


async def _periodic_sync_loop():  # pragma: no cover - long-running task
    while True:
        try:
            await sync_players()
        except Exception as exc:
            logger.warning("Background player sync failed: %s", exc)
        await asyncio.sleep(max(SYNC_INTERVAL_SECONDS, MIN_SYNC_RETRY_SECONDS))
