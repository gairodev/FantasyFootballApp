import os
import asyncpg
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "fantasy_football")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

# Connection pool
_pool: Optional[asyncpg.Pool] = None

async def get_database_pool() -> asyncpg.Pool:
    """Get or create database connection pool"""
    global _pool
    
    if _pool is None:
        if DATABASE_URL:
            # Use Railway's DATABASE_URL if available
            _pool = await asyncpg.create_pool(DATABASE_URL)
        else:
            # Fallback to individual environment variables
            _pool = await asyncpg.create_pool(
                host=DB_HOST,
                port=DB_PORT,
                database=DB_NAME,
                user=DB_USER,
                password=DB_PASSWORD,
                min_size=1,
                max_size=10
            )
        
        logger.info("Database connection pool created")
    
    return _pool

@asynccontextmanager
async def get_db_connection():
    """Get a database connection from the pool"""
    pool = await get_database_pool()
    async with pool.acquire() as connection:
        yield connection

async def close_database_pool():
    """Close the database connection pool"""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Database connection pool closed")

async def init_database():
    """Initialize database tables"""
    async with get_db_connection() as conn:
        # Create tables if they don't exist
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id VARCHAR(50) PRIMARY KEY,
                username VARCHAR(100) NOT NULL,
                display_name VARCHAR(100),
                avatar VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS leagues (
                league_id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                season VARCHAR(10) NOT NULL,
                sport VARCHAR(10) DEFAULT 'nfl',
                status VARCHAR(20) DEFAULT 'active',
                roster_positions JSONB,
                scoring_settings JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_leagues (
                user_id VARCHAR(50) REFERENCES users(user_id),
                league_id VARCHAR(50) REFERENCES leagues(league_id),
                role VARCHAR(20) DEFAULT 'member',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, league_id)
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS drafts (
                draft_id VARCHAR(50) PRIMARY KEY,
                league_id VARCHAR(50) REFERENCES leagues(league_id),
                type VARCHAR(20) DEFAULT 'snake',
                status VARCHAR(20) DEFAULT 'pre_draft',
                settings JSONB,
                draft_order JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS picks (
                id SERIAL PRIMARY KEY,
                draft_id VARCHAR(50) REFERENCES drafts(draft_id),
                round INTEGER NOT NULL,
                pick INTEGER NOT NULL,
                pick_no INTEGER NOT NULL,
                roster_id INTEGER NOT NULL,
                player_id VARCHAR(50),
                timestamp BIGINT,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS players (
                player_id VARCHAR(50) PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                pos VARCHAR(10),
                team VARCHAR(10),
                adp DECIMAL(5,2),
                tier INTEGER,
                projection_baseline DECIMAL(8,2),
                bye_week INTEGER,
                injury_status VARCHAR(20),
                news TEXT,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS recommendations (
                id SERIAL PRIMARY KEY,
                draft_id VARCHAR(50) REFERENCES drafts(draft_id),
                team_on_clock VARCHAR(50),
                strategy VARCHAR(20),
                player_id VARCHAR(50) REFERENCES players(player_id),
                reason TEXT,
                fit VARCHAR(20),
                score DECIMAL(8,4),
                vorp DECIMAL(8,4),
                adp_discount DECIMAL(8,4),
                need_boost DECIMAL(8,4),
                scarcity_boost DECIMAL(8,4),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes for better performance
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_picks_draft_id ON picks(draft_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_picks_round_pick ON picks(round, pick)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_user_leagues_user_id ON user_leagues(user_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_user_leagues_league_id ON user_leagues(league_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_recommendations_draft_id ON recommendations(draft_id)")
        
        logger.info("Database tables initialized successfully")

async def test_connection():
    """Test database connection"""
    try:
        async with get_db_connection() as conn:
            result = await conn.fetchval("SELECT 1")
            logger.info(f"Database connection test successful: {result}")
            return True
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False
