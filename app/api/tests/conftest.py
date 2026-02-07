import os
import sys
import asyncio
import pytest

# Ensure we can import the API module directly
CURRENT_DIR = os.path.dirname(__file__)
API_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if API_DIR not in sys.path:
    sys.path.insert(0, API_DIR)

from main import app  # type: ignore


@pytest.fixture(autouse=True)
def no_anthropic(monkeypatch):
    """Disable LLM usage during tests to avoid external calls."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    yield


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


