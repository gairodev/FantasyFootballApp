import { League, Draft, Pick, Player } from '@fantasy-football/core';

export class SleeperClient {
  private baseUrl = 'https://api.sleeper.app';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTtl = 3000; // 3 seconds for picks, longer for other data

  constructor(private cacheTtlSeconds: number = 3000) {
    this.cacheTtl = cacheTtlSeconds * 1000;
  }

  /**
   * Find user by username and get their leagues for a season
   */
  async discoverUser(username: string, season: string): Promise<{ user_id: string; leagues: League[] }> {
    const cacheKey = `user:${username}:${season}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Get user ID first
      const userResponse = await fetch(`${this.baseUrl}/v1/user/${username}`);
      if (!userResponse.ok) {
        throw new Error(`User not found: ${username}`);
      }
      const user = await userResponse.json();
      
      if (!user.user_id) {
        throw new Error(`Invalid user data for: ${username}`);
      }

      // Get user's leagues for the season
      const leaguesResponse = await fetch(`${this.baseUrl}/v1/user/${user.user_id}/leagues/nfl/${season}`);
      if (!leaguesResponse.ok) {
        throw new Error(`Failed to fetch leagues for user: ${username}`);
      }
      const leagues = await leaguesResponse.json();

      const result = {
        user_id: user.user_id,
        leagues: leagues.map((league: any) => this.transformLeague(league))
      };

      this.setCache(cacheKey, result, 60000); // Cache for 1 minute
      return result;
    } catch (error) {
      console.error('Error discovering user:', error);
      throw error;
    }
  }

  /**
   * Get drafts for a league
   */
  async getDrafts(leagueId: string): Promise<{ drafts: Draft[] }> {
    const cacheKey = `drafts:${leagueId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/v1/league/${leagueId}/drafts`);
      if (!response.ok) {
        throw new Error(`Failed to fetch drafts for league: ${leagueId}`);
      }
      
      const drafts = await response.json();
      const result = { drafts: drafts.map((draft: any) => this.transformDraft(draft)) };
      
      this.setCache(cacheKey, result, 300000); // Cache for 5 minutes
      return result;
    } catch (error) {
      console.error('Error fetching drafts:', error);
      throw error;
    }
  }

  /**
   * Get picks for a draft (with short cache for live updates)
   */
  async getPicks(draftId: string): Promise<{ picks: Pick[] }> {
    const cacheKey = `picks:${draftId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/v1/draft/${draftId}/picks`);
      if (!response.ok) {
        throw new Error(`Failed to fetch picks for draft: ${draftId}`);
      }
      
      const picks = await response.json();
      const result = { picks: picks.map((pick: any) => this.transformPick(pick)) };
      
      this.setCache(cacheKey, result, this.cacheTtl); // Short cache for live updates
      return result;
    } catch (error) {
      console.error('Error fetching picks:', error);
      throw error;
    }
  }

  /**
   * Get all NFL players (cached for longer periods)
   */
  async getPlayers(): Promise<{ players: Player[] }> {
    const cacheKey = 'players:nfl';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/v1/players/nfl`);
      if (!response.ok) {
        throw new Error('Failed to fetch NFL players');
      }
      
      const players = await response.json();
      const result = { 
        players: Object.values(players).map((player: any) => this.transformPlayer(player))
      };
      
      this.setCache(cacheKey, result, 86400000); // Cache for 24 hours
      return result;
    } catch (error) {
      console.error('Error fetching players:', error);
      throw error;
    }
  }

  /**
   * Get rosters for a league
   */
  async getRosters(leagueId: string): Promise<{ rosters: any[] }> {
    const cacheKey = `rosters:${leagueId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/v1/league/${leagueId}/rosters`);
      if (!response.ok) {
        throw new Error(`Failed to fetch rosters for league: ${leagueId}`);
      }
      
      const rosters = await response.json();
      const result = { rosters };
      
      this.setCache(cacheKey, result, 300000); // Cache for 5 minutes
      return result;
    } catch (error) {
      console.error('Error fetching rosters:', error);
      throw error;
    }
  }

  /**
   * Clear cache for a specific key or all cache
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTtl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private transformLeague(league: any): League {
    return {
      league_id: league.league_id,
      name: league.name,
      scoring_settings: league.scoring_settings || {},
      roster_positions: league.roster_positions || [],
      season: league.season,
      sport: league.sport,
      status: league.status
    };
  }

  private transformDraft(draft: any): Draft {
    return {
      draft_id: draft.draft_id,
      league_id: draft.league_id,
      type: draft.type || 'snake',
      rounds: draft.settings?.rounds || 15,
      draft_order: draft.draft_order || {},
      status: draft.status || 'pre_draft',
      settings: draft.settings
    };
  }

  private transformPick(pick: any): Pick {
    return {
      draft_id: pick.draft_id,
      round: pick.round,
      pick: pick.pick,
      pick_no: pick.pick_no,
      roster_id: pick.roster_id,
      player_id: pick.player_id,
      timestamp: pick.timestamp,
      metadata: {
        is_keeper: pick.metadata?.is_keeper || false,
        traded_from: pick.metadata?.traded_from
      }
    };
  }

  private transformPlayer(player: any): Player {
    return {
      player_id: player.player_id,
      full_name: player.full_name || player.name || 'Unknown Player',
      pos: player.position || player.pos || 'UNK',
      team: player.team,
      adp: player.adp,
      tier: player.tier,
      projection_baseline: player.projection_baseline || player.fantasy_points_ppr || 0,
      bye_week: player.bye_week,
      injury_status: this.mapInjuryStatus(player.injury_status),
      news: player.news,
      ...player // Include any additional fields from Sleeper
    };
  }

  private mapInjuryStatus(status: string | undefined): "healthy" | "questionable" | "doubtful" | "out" {
    if (!status) return 'healthy';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('out') || statusLower.includes('ir')) return 'out';
    if (statusLower.includes('doubtful')) return 'doubtful';
    if (statusLower.includes('questionable') || statusLower.includes('probable')) return 'questionable';
    
    return 'healthy';
  }
}
