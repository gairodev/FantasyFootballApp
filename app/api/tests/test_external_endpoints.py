import json
from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


def test_discover_user_not_found(monkeypatch):
    # First call returns a user without user_id → API should return 404
    async def fake_get(self, url, *args, **kwargs):  # type: ignore
        class Resp:
            is_success = True
            def json(self):
                return {}
        return Resp()

    import httpx
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    resp = client.get("/discover", params={"username": "nope", "season": "2024"})
    assert resp.status_code == 404


def test_players_success(monkeypatch):
    # Minimal player payload
    players_payload = {"123": {"full_name": "Test Player", "pos": "RB"}}

    class Resp:
        is_success = True
        def json(self):
            return players_payload

    import httpx
    async def fake_get(self, url, *a, **k):  # type: ignore
        return Resp()
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    resp = client.get("/players")
    assert resp.status_code == 200
    data = resp.json()
    assert "players" in data and isinstance(data["players"], dict)


def test_get_drafts_success(monkeypatch):
    drafts_payload = [{"draft_id": "d1"}]

    class Resp:
        is_success = True
        def json(self):
            return drafts_payload

    import httpx
    async def fake_get(self, url, *a, **k):  # type: ignore
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
    async def fake_get(self, url, *a, **k):  # type: ignore
        return Resp()
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    resp = client.get("/picks", params={"draft_id": "D1"})
    assert resp.status_code == 200
    assert resp.json()["picks"] == picks_payload


