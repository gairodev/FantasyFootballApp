import pytest
from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_recommend_with_mocked_dependencies(monkeypatch):
    # Mock picks endpoint call used inside get_recommendations
    async def fake_get_picks(draft_id):
        return {"picks": []}
    monkeypatch.setattr("main.get_picks", fake_get_picks)

    # Mock players cache to return minimal structure
    async def fake_players_with_cache():
        return {"players": {"p1": {"full_name": "A RB", "pos": "RB", "adp": 50}}}
    monkeypatch.setattr("main.get_players_with_cache", fake_players_with_cache)

    payload = {
        "draft_id": "D1",
        "team_on_clock": "team_1",
        "strategy": "balanced"
    }

    resp = client.post("/recommend", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "ranked" in data
    assert data["strategy"] == "balanced"
    assert isinstance(data["llm_enabled"], bool)


def test_recommend_rate_limit(monkeypatch):
    """Verify that /recommend enforces rate limiting."""
    async def fake_get_picks(draft_id):
        return {"picks": []}
    monkeypatch.setattr("main.get_picks", fake_get_picks)

    async def fake_players_with_cache():
        return {"players": {"p1": {"full_name": "A RB", "pos": "RB", "adp": 50}}}
    monkeypatch.setattr("main.get_players_with_cache", fake_players_with_cache)

    # Clear rate limit store
    import main
    main._rate_limit_store.clear()

    payload = {
        "draft_id": "D1",
        "team_on_clock": "team_1",
        "strategy": "balanced"
    }

    # Send 10 requests (should succeed)
    for _ in range(10):
        resp = client.post("/recommend", json=payload)
        assert resp.status_code == 200

    # 11th request should be rate-limited
    resp = client.post("/recommend", json=payload)
    assert resp.status_code == 429

    # Clean up
    main._rate_limit_store.clear()
