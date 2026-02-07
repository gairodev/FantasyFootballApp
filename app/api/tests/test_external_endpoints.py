import pytest
from fastapi.testclient import TestClient

from main import app
import main


client = TestClient(app)


def test_discover_user_not_found(monkeypatch):
    async def fake_get(self, url, *args, **kwargs):
        class Resp:
            is_success = True
            def json(self):
                return {}
        return Resp()

    import httpx
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    resp = client.get("/discover", params={"username": "nope", "season": "2024"})
    assert resp.status_code == 404


def test_players_success_with_pagination(monkeypatch):
    players_payload = {
        "1": {"full_name": "Test Player", "pos": "RB"},
        "2": {"full_name": "Another Player", "pos": "QB"},
        "3": {"full_name": "Third Player", "pos": "WR"},
    }

    async def fake_ensure_players_loaded():
        return players_payload

    monkeypatch.setattr(main, "ensure_players_loaded", fake_ensure_players_loaded)

    # Default request
    resp = client.get("/players")
    assert resp.status_code == 200
    data = resp.json()
    assert "players" in data
    assert data["total"] == 3
    assert data["limit"] == 500
    assert data["offset"] == 0

    # Paginated request
    resp = client.get("/players", params={"limit": 1, "offset": 0})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["players"]) == 1
    assert data["total"] == 3

    # Position filter
    resp = client.get("/players", params={"pos": "RB"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1


def test_get_drafts_success(monkeypatch):
    drafts_payload = [{"draft_id": "d1"}]

    class Resp:
        is_success = True
        def json(self):
            return drafts_payload

    import httpx
    async def fake_get(self, url, *a, **k):
        return Resp()
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    resp = client.get("/drafts", params={"league_id": "L1"})
    assert resp.status_code == 200
    assert resp.json()["drafts"] == drafts_payload


def test_get_picks_success(monkeypatch):
    picks_payload = [{"pick_no": 1, "player_id": "123"}]

    class Resp:
        is_success = True
        def json(self):
            return picks_payload

    import httpx
    async def fake_get(self, url, *a, **k):
        return Resp()
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    resp = client.get("/picks", params={"draft_id": "D1"})
    assert resp.status_code == 200
    assert resp.json()["picks"] == picks_payload


def test_player_sync_endpoint(monkeypatch):
    async def fake_sync_players(force: bool = False):
        return {
            "status": "updated",
            "synced": 2,
            "last_synced": 123.0,
            "source": "sleeper",
            "players": {"1": {"full_name": "A", "pos": "RB"}},
        }

    monkeypatch.setattr(main, "sync_players", fake_sync_players)

    resp = client.post("/players/sync")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "updated"
    assert body["synced"] == 2


def test_player_sync_status(monkeypatch):
    monkeypatch.setattr(main, "get_sync_status", lambda: {"last_synced": 456.0, "last_error": None, "interval_seconds": 60})

    resp = client.get("/players/sync/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["last_synced"] == 456.0
