"""Tests for the deterministic ranking algorithm."""
import pytest
from main import calculate_deterministic_rankings


PLAYERS = {
    "rb1": {
        "full_name": "Elite RB",
        "pos": "RB",
        "team": "KC",
        "adp": 5,
        "tier": 1,
        "fantasy_points_ppr": 300,
        "bye_week": 6,
        "injury_status": "healthy",
    },
    "wr1": {
        "full_name": "Elite WR",
        "pos": "WR",
        "team": "SF",
        "adp": 8,
        "tier": 1,
        "fantasy_points_ppr": 280,
        "bye_week": 9,
        "injury_status": "healthy",
    },
    "qb1": {
        "full_name": "Top QB",
        "pos": "QB",
        "team": "BUF",
        "adp": 20,
        "tier": 2,
        "fantasy_points_ppr": 350,
        "bye_week": 12,
        "injury_status": "healthy",
    },
    "te1": {
        "full_name": "Top TE",
        "pos": "TE",
        "team": "LV",
        "adp": 15,
        "tier": 2,
        "fantasy_points_ppr": 180,
        "bye_week": 10,
        "injury_status": "healthy",
    },
    "rb2": {
        "full_name": "Injured RB",
        "pos": "RB",
        "team": "DAL",
        "adp": 10,
        "tier": 2,
        "fantasy_points_ppr": 250,
        "bye_week": 7,
        "injury_status": "out",
    },
}

ROSTER_POSITIONS = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "BN", "BN", "BN"]

SCORING = {"passing_yard": 0.04, "passing_td": 4, "rushing_yard": 0.1, "rushing_td": 6}


def test_returns_ranked_list():
    result = calculate_deterministic_rankings(
        players=PLAYERS,
        picks=[],
        roster_positions=ROSTER_POSITIONS,
        scoring=SCORING,
        pick_no=1,
        strategy="balanced",
        team_on_clock="1",
    )
    assert isinstance(result, list)
    assert len(result) > 0
    # Scores should be descending
    scores = [r["score"] for r in result]
    assert scores == sorted(scores, reverse=True)


def test_excludes_drafted_players():
    picks = [{"player_id": "rb1", "roster_id": 1}]
    result = calculate_deterministic_rankings(
        players=PLAYERS,
        picks=picks,
        roster_positions=ROSTER_POSITIONS,
        scoring=SCORING,
        pick_no=2,
        strategy="balanced",
        team_on_clock="2",
    )
    player_ids = [r["player_id"] for r in result]
    assert "rb1" not in player_ids


def test_injured_player_penalized():
    result = calculate_deterministic_rankings(
        players=PLAYERS,
        picks=[],
        roster_positions=ROSTER_POSITIONS,
        scoring=SCORING,
        pick_no=1,
        strategy="balanced",
        team_on_clock="1",
    )
    rb1 = next(r for r in result if r["player_id"] == "rb1")
    rb2 = next(r for r in result if r["player_id"] == "rb2")
    assert rb2["injury_penalty"] > 0
    assert rb1["injury_penalty"] == 0
    # The healthy elite RB should rank higher than the injured one
    assert rb1["score"] > rb2["score"]


def test_edge_vs_next_calculated():
    result = calculate_deterministic_rankings(
        players=PLAYERS,
        picks=[],
        roster_positions=ROSTER_POSITIONS,
        scoring=SCORING,
        pick_no=1,
        strategy="balanced",
        team_on_clock="1",
    )
    # First player should have a positive edge vs next
    assert result[0]["edge_vs_next"] >= 0
    # Last player should have edge_vs_next of 0
    assert result[-1]["edge_vs_next"] == 0.0


def test_strategy_affects_scores():
    safe_result = calculate_deterministic_rankings(
        players=PLAYERS, picks=[], roster_positions=ROSTER_POSITIONS,
        scoring=SCORING, pick_no=1, strategy="safe", team_on_clock="1",
    )
    upside_result = calculate_deterministic_rankings(
        players=PLAYERS, picks=[], roster_positions=ROSTER_POSITIONS,
        scoring=SCORING, pick_no=1, strategy="upside", team_on_clock="1",
    )
    # Different strategies should produce different scores
    safe_scores = {r["player_id"]: r["score"] for r in safe_result}
    upside_scores = {r["player_id"]: r["score"] for r in upside_result}
    assert safe_scores != upside_scores


def test_vorp_uses_proper_baselines():
    result = calculate_deterministic_rankings(
        players=PLAYERS, picks=[], roster_positions=ROSTER_POSITIONS,
        scoring=SCORING, pick_no=1, strategy="balanced", team_on_clock="1",
    )
    qb = next(r for r in result if r["player_id"] == "qb1")
    rb = next(r for r in result if r["player_id"] == "rb1")
    te = next(r for r in result if r["player_id"] == "te1")

    # QB: 350 - 200 = 150 VORP
    assert qb["vorp"] == 150.0
    # RB: 300 - 120 = 180 VORP
    assert rb["vorp"] == 180.0
    # TE: 180 - 75 = 105 VORP
    assert te["vorp"] == 105.0
