// Core data models for the fantasy football draft assistant

export type League = {
  league_id: string;
  name: string;
  scoring_settings: Record<string, number>;
  roster_positions: string[]; // e.g., ["QB","RB","RB","WR","WR","TE","FLEX","K","DEF","BN","BN"...]
  season: string;
  sport: string;
  status: string;
};

export type Draft = {
  draft_id: string;
  league_id: string;
  type: "snake" | "auction" | string;
  rounds: number;
  draft_order: Record<string, number>; // roster_id -> slot
  status: "pre_draft" | "in_progress" | "complete";
  settings?: {
    rounds: number;
    pick_timer: number;
    [key: string]: any;
  };
};

export type Pick = {
  draft_id: string;
  round: number;
  pick: number;
  pick_no: number;      // global pick number
  roster_id: number;    // team making the pick
  player_id: string;
  timestamp: number;
  metadata?: {
    is_keeper?: boolean;
    traded_from?: number;
    [key: string]: any;
  };
};

export type Player = {
  player_id: string;
  full_name: string;
  pos: "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | string;
  team?: string;
  adp?: number;               // optional; seed from a file
  tier?: number;              // optional; your tiering
  projection_baseline?: number; // optional; your projection
  bye_week?: number;
  injury_status?: "healthy" | "questionable" | "doubtful" | "out";
  news?: string;
  [key: string]: any; // Sleeper API may have additional fields
};

export type Roster = {
  roster_id: number;
  owner_id: string;
  players: string[]; // player_ids
  starters: string[]; // player_ids
  taxi: string[]; // player_ids
  metadata?: {
    wins: number;
    losses: number;
    ties: number;
    points_for: number;
    points_against: number;
    [key: string]: any;
  };
};

export type DraftState = {
  draft_id: string;
  picks: Pick[];
  remaining_players: Player[];
  current_pick: number;
  team_on_clock: number;
  round: number;
  pick_in_round: number;
  is_paused: boolean;
  last_updated: number;
};

export type Recommendation = {
  player_id: string;
  reason: string;
  fit: "value" | "need" | "stack" | "upside" | "safe";
  edge_vs_next: number;
  score: number;
  vorp: number;
  adp_discount: number;
  need_boost: number;
  scarcity_boost: number;
  bye_penalty: number;
  injury_penalty: number;
  upside_bonus: number;
};

export type Strategy = "safe" | "balanced" | "upside";

export type RankingContext = {
  remaining: Player[];
  picks: Pick[];
  roster_positions: string[];
  scoring: Record<string, number>;
  pick_no: number;
  strategy: Strategy;
  team_on_clock: number;
  league: League;
  draft: Draft;
};
