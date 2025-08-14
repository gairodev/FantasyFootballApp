from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal

# Base models for database entities
class User(BaseModel):
    user_id: str = Field(..., max_length=50)
    username: str = Field(..., max_length=100)
    display_name: Optional[str] = Field(None, max_length=100)
    avatar: Optional[str] = Field(None, max_length=255)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class League(BaseModel):
    league_id: str = Field(..., max_length=50)
    name: str = Field(..., max_length=255)
    season: str = Field(..., max_length=10)
    sport: str = Field(default="nfl", max_length=10)
    status: str = Field(default="active", max_length=20)
    roster_positions: Optional[List[str]] = None
    scoring_settings: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class UserLeague(BaseModel):
    user_id: str = Field(..., max_length=50)
    league_id: str = Field(..., max_length=50)
    role: str = Field(default="member", max_length=20)
    joined_at: Optional[datetime] = None

class Draft(BaseModel):
    draft_id: str = Field(..., max_length=50)
    league_id: str = Field(..., max_length=50)
    type: str = Field(default="snake", max_length=20)
    status: str = Field(default="pre_draft", max_length=20)
    settings: Optional[Dict[str, Any]] = None
    draft_order: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class Pick(BaseModel):
    id: Optional[int] = None
    draft_id: str = Field(..., max_length=50)
    round: int = Field(..., ge=1)
    pick: int = Field(..., ge=1)
    pick_no: int = Field(..., ge=1)
    roster_id: int = Field(..., ge=0)
    player_id: Optional[str] = Field(None, max_length=50)
    timestamp: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

class Player(BaseModel):
    player_id: str = Field(..., max_length=50)
    full_name: str = Field(..., max_length=255)
    pos: Optional[str] = Field(None, max_length=10)
    team: Optional[str] = Field(None, max_length=10)
    adp: Optional[Decimal] = Field(None, decimal_places=2)
    tier: Optional[int] = Field(None, ge=1)
    projection_baseline: Optional[Decimal] = Field(None, decimal_places=2)
    bye_week: Optional[int] = Field(None, ge=1, le=18)
    injury_status: Optional[str] = Field(None, max_length=20)
    news: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class Recommendation(BaseModel):
    id: Optional[int] = None
    draft_id: str = Field(..., max_length=50)
    team_on_clock: str = Field(..., max_length=50)
    strategy: str = Field(..., max_length=20)
    player_id: str = Field(..., max_length=50)
    reason: str
    fit: str = Field(..., max_length=20)
    score: Optional[Decimal] = Field(None, decimal_places=4)
    vorp: Optional[Decimal] = Field(None, decimal_places=4)
    adp_discount: Optional[Decimal] = Field(None, decimal_places=4)
    need_boost: Optional[Decimal] = Field(None, decimal_places=4)
    scarcity_boost: Optional[Decimal] = Field(None, decimal_places=4)
    created_at: Optional[datetime] = None

# API request/response models
class RecommendationRequest(BaseModel):
    draft_id: str
    team_on_clock: str
    strategy: Optional[str] = "balanced"

class RecommendationResponse(BaseModel):
    ranked: List[Dict[str, Any]]
    generated_at: int
    strategy: str
    llm_enabled: bool

class DiscoverResponse(BaseModel):
    user_id: str
    leagues: List[League]

class DraftsResponse(BaseModel):
    drafts: List[Draft]

class PicksResponse(BaseModel):
    picks: List[Pick]

class PlayersResponse(BaseModel):
    players: Dict[str, Player]

# Database operation models
class DatabaseUser(BaseModel):
    user_id: str
    username: str
    display_name: Optional[str] = None
    avatar: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class DatabaseLeague(BaseModel):
    league_id: str
    name: str
    season: str
    sport: str = "nfl"
    status: str = "active"
    roster_positions: Optional[List[str]] = None
    scoring_settings: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class DatabaseDraft(BaseModel):
    draft_id: str
    league_id: str
    type: str = "snake"
    status: str = "pre_draft"
    settings: Optional[Dict[str, Any]] = None
    draft_order: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class DatabasePick(BaseModel):
    id: Optional[int] = None
    draft_id: str
    round: int
    pick: int
    pick_no: int
    roster_id: int
    player_id: Optional[str] = None
    timestamp: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

class DatabasePlayer(BaseModel):
    player_id: str
    full_name: str
    pos: Optional[str] = None
    team: Optional[str] = None
    adp: Optional[Decimal] = None
    tier: Optional[int] = None
    projection_baseline: Optional[Decimal] = None
    bye_week: Optional[int] = None
    injury_status: Optional[str] = None
    news: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
