from typing import List, Dict, Any, Optional
from database import get_db_connection
from models import (
    DatabaseUser, DatabaseLeague, DatabaseDraft, DatabasePick, 
    DatabasePlayer, UserLeague, Recommendation
)
import json
import logging

logger = logging.getLogger(__name__)

# User operations
async def create_user(user: DatabaseUser) -> bool:
    """Create a new user"""
    try:
        async with get_db_connection() as conn:
            await conn.execute("""
                INSERT INTO users (user_id, username, display_name, avatar)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id) DO UPDATE SET
                    username = EXCLUDED.username,
                    display_name = EXCLUDED.display_name,
                    avatar = EXCLUDED.avatar,
                    updated_at = CURRENT_TIMESTAMP
            """, user.user_id, user.username, user.display_name, user.avatar)
            return True
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        return False

async def get_user(user_id: str) -> Optional[DatabaseUser]:
    """Get user by ID"""
    try:
        async with get_db_connection() as conn:
            row = await conn.fetchrow("""
                SELECT user_id, username, display_name, avatar, created_at, updated_at
                FROM users WHERE user_id = $1
            """, user_id)
            if row:
                return DatabaseUser(**dict(row))
            return None
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        return None

# League operations
async def create_or_update_league(league: DatabaseLeague) -> bool:
    """Create or update a league"""
    try:
        async with get_db_connection() as conn:
            await conn.execute("""
                INSERT INTO leagues (league_id, name, season, sport, status, roster_positions, scoring_settings)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (league_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    season = EXCLUDED.season,
                    sport = EXCLUDED.sport,
                    status = EXCLUDED.status,
                    roster_positions = EXCLUDED.roster_positions,
                    scoring_settings = EXCLUDED.scoring_settings,
                    updated_at = CURRENT_TIMESTAMP
            """, league.league_id, league.name, league.season, league.sport, 
                 league.status, json.dumps(league.roster_positions) if league.roster_positions else None,
                 json.dumps(league.scoring_settings) if league.scoring_settings else None)
            return True
    except Exception as e:
        logger.error(f"Error creating/updating league: {e}")
        return False

async def get_league(league_id: str) -> Optional[DatabaseLeague]:
    """Get league by ID"""
    try:
        async with get_db_connection() as conn:
            row = await conn.fetchrow("""
                SELECT league_id, name, season, sport, status, roster_positions, scoring_settings, created_at, updated_at
                FROM leagues WHERE league_id = $1
            """, league_id)
            if row:
                data = dict(row)
                # Parse JSON fields
                if data.get('roster_positions'):
                    data['roster_positions'] = json.loads(data['roster_positions'])
                if data.get('scoring_settings'):
                    data['scoring_settings'] = json.loads(data['scoring_settings'])
                return DatabaseLeague(**data)
            return None
    except Exception as e:
        logger.error(f"Error getting league: {e}")
        return None

async def get_user_leagues(user_id: str, season: str) -> List[DatabaseLeague]:
    """Get all leagues for a user in a specific season"""
    try:
        async with get_db_connection() as conn:
            rows = await conn.fetch("""
                SELECT l.league_id, l.name, l.season, l.sport, l.status, 
                       l.roster_positions, l.scoring_settings, l.created_at, l.updated_at
                FROM leagues l
                JOIN user_leagues ul ON l.league_id = ul.league_id
                WHERE ul.user_id = $1 AND l.season = $2
                ORDER BY l.name
            """, user_id, season)
            
            leagues = []
            for row in rows:
                data = dict(row)
                # Parse JSON fields
                if data.get('roster_positions'):
                    data['roster_positions'] = json.loads(data['roster_positions'])
                if data.get('scoring_settings'):
                    data['scoring_settings'] = json.loads(data['scoring_settings'])
                leagues.append(DatabaseLeague(**data))
            
            return leagues
    except Exception as e:
        logger.error(f"Error getting user leagues: {e}")
        return []

# User-League relationship operations
async def create_user_league(user_league: UserLeague) -> bool:
    """Create user-league relationship"""
    try:
        async with get_db_connection() as conn:
            await conn.execute("""
                INSERT INTO user_leagues (user_id, league_id, role)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, league_id) DO UPDATE SET
                    role = EXCLUDED.role
            """, user_league.user_id, user_league.league_id, user_league.role)
            return True
    except Exception as e:
        logger.error(f"Error creating user-league relationship: {e}")
        return False

# Draft operations
async def create_or_update_draft(draft: DatabaseDraft) -> bool:
    """Create or update a draft"""
    try:
        async with get_db_connection() as conn:
            await conn.execute("""
                INSERT INTO drafts (draft_id, league_id, type, status, settings, draft_order)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (draft_id) DO UPDATE SET
                    league_id = EXCLUDED.league_id,
                    type = EXCLUDED.type,
                    status = EXCLUDED.status,
                    settings = EXCLUDED.settings,
                    draft_order = EXCLUDED.draft_order,
                    updated_at = CURRENT_TIMESTAMP
            """, draft.draft_id, draft.league_id, draft.type, draft.status,
                 json.dumps(draft.settings) if draft.settings else None,
                 json.dumps(draft.draft_order) if draft.draft_order else None)
            return True
    except Exception as e:
        logger.error(f"Error creating/updating draft: {e}")
        return False

async def get_drafts_for_league(league_id: str) -> List[DatabaseDraft]:
    """Get all drafts for a league"""
    try:
        async with get_db_connection() as conn:
            rows = await conn.fetch("""
                SELECT draft_id, league_id, type, status, settings, draft_order, created_at, updated_at
                FROM drafts WHERE league_id = $1 ORDER BY created_at DESC
            """, league_id)
            
            drafts = []
            for row in rows:
                data = dict(row)
                # Parse JSON fields
                if data.get('settings'):
                    data['settings'] = json.loads(data['settings'])
                if data.get('draft_order'):
                    data['draft_order'] = json.loads(data['draft_order'])
                drafts.append(DatabaseDraft(**data))
            
            return drafts
    except Exception as e:
        logger.error(f"Error getting drafts for league: {e}")
        return []

# Pick operations
async def create_pick(pick: DatabasePick) -> bool:
    """Create a new pick"""
    try:
        async with get_db_connection() as conn:
            await conn.execute("""
                INSERT INTO picks (draft_id, round, pick, pick_no, roster_id, player_id, timestamp, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """, pick.draft_id, pick.round, pick.pick, pick.pick_no, 
                 pick.roster_id, pick.player_id, pick.timestamp,
                 json.dumps(pick.metadata) if pick.metadata else None)
            return True
    except Exception as e:
        logger.error(f"Error creating pick: {e}")
        return False

async def get_picks_for_draft(draft_id: str) -> List[DatabasePick]:
    """Get all picks for a draft"""
    try:
        async with get_db_connection() as conn:
            rows = await conn.fetch("""
                SELECT id, draft_id, round, pick, pick_no, roster_id, player_id, timestamp, metadata, created_at
                FROM picks WHERE draft_id = $1 ORDER BY pick_no
            """, draft_id)
            
            picks = []
            for row in rows:
                data = dict(row)
                # Parse JSON fields
                if data.get('metadata'):
                    data['metadata'] = json.loads(data['metadata'])
                picks.append(DatabasePick(**data))
            
            return picks
    except Exception as e:
        logger.error(f"Error getting picks for draft: {e}")
        return []

async def bulk_create_picks(picks: List[DatabasePick]) -> bool:
    """Create multiple picks in a transaction"""
    try:
        async with get_db_connection() as conn:
            async with conn.transaction():
                for pick in picks:
                    await conn.execute("""
                        INSERT INTO picks (draft_id, round, pick, pick_no, roster_id, player_id, timestamp, metadata)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    """, pick.draft_id, pick.round, pick.pick, pick.pick_no, 
                         pick.roster_id, pick.player_id, pick.timestamp,
                         json.dumps(pick.metadata) if pick.metadata else None)
            return True
    except Exception as e:
        logger.error(f"Error bulk creating picks: {e}")
        return False

# Player operations
async def create_or_update_player(player: DatabasePlayer) -> bool:
    """Create or update a player"""
    try:
        async with get_db_connection() as conn:
            await conn.execute("""
                INSERT INTO players (player_id, full_name, pos, team, adp, tier, projection_baseline, bye_week, injury_status, news, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (player_id) DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    pos = EXCLUDED.pos,
                    team = EXCLUDED.team,
                    adp = EXCLUDED.adp,
                    tier = EXCLUDED.tier,
                    projection_baseline = EXCLUDED.projection_baseline,
                    bye_week = EXCLUDED.bye_week,
                    injury_status = EXCLUDED.injury_status,
                    news = EXCLUDED.news,
                    metadata = EXCLUDED.metadata,
                    updated_at = CURRENT_TIMESTAMP
            """, player.player_id, player.full_name, player.pos, player.team,
                 player.adp, player.tier, player.projection_baseline, player.bye_week,
                 player.injury_status, player.news,
                 json.dumps(player.metadata) if player.metadata else None)
            return True
    except Exception as e:
        logger.error(f"Error creating/updating player: {e}")
        return False

async def bulk_create_or_update_players(players: List[DatabasePlayer]) -> bool:
    """Create or update multiple players in a transaction"""
    try:
        async with get_db_connection() as conn:
            async with conn.transaction():
                for player in players:
                    await conn.execute("""
                        INSERT INTO players (player_id, full_name, pos, team, adp, tier, projection_baseline, bye_week, injury_status, news, metadata)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        ON CONFLICT (player_id) DO UPDATE SET
                            full_name = EXCLUDED.full_name,
                            pos = EXCLUDED.pos,
                            team = EXCLUDED.team,
                            adp = EXCLUDED.adp,
                            tier = EXCLUDED.tier,
                            projection_baseline = EXCLUDED.projection_baseline,
                            bye_week = EXCLUDED.bye_week,
                            injury_status = EXCLUDED.injury_status,
                            news = EXCLUDED.news,
                            metadata = EXCLUDED.metadata,
                            updated_at = CURRENT_TIMESTAMP
                    """, player.player_id, player.full_name, player.pos, player.team,
                         player.adp, player.tier, player.projection_baseline, player.bye_week,
                         player.injury_status, player.news,
                         json.dumps(player.metadata) if player.metadata else None)
            return True
    except Exception as e:
        logger.error(f"Error bulk creating/updating players: {e}")
        return False

async def get_all_players() -> Dict[str, DatabasePlayer]:
    """Get all players"""
    try:
        async with get_db_connection() as conn:
            rows = await conn.fetch("""
                SELECT player_id, full_name, pos, team, adp, tier, projection_baseline, bye_week, injury_status, news, metadata, created_at, updated_at
                FROM players
            """)
            
            players = {}
            for row in rows:
                data = dict(row)
                # Parse JSON fields
                if data.get('metadata'):
                    data['metadata'] = json.loads(data['metadata'])
                players[data['player_id']] = DatabasePlayer(**data)
            
            return players
    except Exception as e:
        logger.error(f"Error getting all players: {e}")
        return {}

# Recommendation operations
async def create_recommendation(recommendation: Recommendation) -> bool:
    """Create a new recommendation"""
    try:
        async with get_db_connection() as conn:
            await conn.execute("""
                INSERT INTO recommendations (draft_id, team_on_clock, strategy, player_id, reason, fit, score, vorp, adp_discount, need_boost, scarcity_boost)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """, recommendation.draft_id, recommendation.team_on_clock, recommendation.strategy,
                 recommendation.player_id, recommendation.reason, recommendation.fit,
                 recommendation.score, recommendation.vorp, recommendation.adp_discount,
                 recommendation.need_boost, recommendation.scarcity_boost)
            return True
    except Exception as e:
        logger.error(f"Error creating recommendation: {e}")
        return False

async def get_recent_recommendations(draft_id: str, limit: int = 10) -> List[Recommendation]:
    """Get recent recommendations for a draft"""
    try:
        async with get_db_connection() as conn:
            rows = await conn.fetch("""
                SELECT id, draft_id, team_on_clock, strategy, player_id, reason, fit, score, vorp, adp_discount, need_boost, scarcity_boost, created_at
                FROM recommendations 
                WHERE draft_id = $1 
                ORDER BY created_at DESC 
                LIMIT $2
            """, draft_id, limit)
            
            recommendations = []
            for row in rows:
                recommendations.append(Recommendation(**dict(row)))
            
            return recommendations
    except Exception as e:
        logger.error(f"Error getting recent recommendations: {e}")
        return []
