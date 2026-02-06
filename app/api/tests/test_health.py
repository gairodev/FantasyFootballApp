import pytest
from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_root_ok():
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "healthy"


def test_health_ok():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "healthy"
    assert isinstance(data.get("timestamp"), int)
    assert isinstance(data.get("cache_entries"), int)
    assert data.get("llm_provider") == "anthropic"
    assert isinstance(data.get("llm_configured"), bool)
