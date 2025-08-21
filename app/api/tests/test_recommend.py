from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


def test_recommend_with_mocked_dependencies(monkeypatch):
    # Mock picks endpoint call used inside get_recommendations
    async def fake_get_picks(draft_id):
        return {"picks": []}
    monkeypatch.setattr("main.get_picks", lambda draft_id: fake_get_picks(draft_id))

    # Mock players cache to return minimal structure
    async def fake_players_with_cache():
        return {"players": {"p1": {"full_name": "A RB", "pos": "RB", "adp": 50}}}

    monkeypatch.setattr("main.get_players_with_cache", lambda: fake_players_with_cache())

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


