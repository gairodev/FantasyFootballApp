'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Users, Target, TrendingUp, Shield, Zap, AlertCircle, CheckCircle, RefreshCw, Play, Pause, Trophy } from 'lucide-react';
import { Draft, League, Pick, Player, Recommendation, Strategy, PlayerSyncStatus } from '../types';

interface DraftBoardProps {
  draft: Draft;
  league: League;
  username: string;
}

export default function DraftBoard({ draft, league, username }: DraftBoardProps) {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [strategy, setStrategy] = useState<Strategy>('balanced');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [isSyncingPlayers, setIsSyncingPlayers] = useState(false);
  const [playerSyncMessage, setPlayerSyncMessage] = useState<string | null>(null);
  const [playerSyncError, setPlayerSyncError] = useState<string | null>(null);
  const [lastPlayerSync, setLastPlayerSync] = useState<number | null>(null);
  const [playerSyncStatus, setPlayerSyncStatus] = useState<PlayerSyncStatus | null>(null);

  const loadPlayers = useCallback(async () => {
    const response = await fetch('/api/players');
    let data: any = null;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error('Failed to parse player data');
    }

    if (!response.ok || !data) {
      throw new Error(data?.detail || 'Failed to load player data');
    }

    const normalizedPlayers: Player[] = Array.isArray(data.players)
      ? data.players
      : Object.values(data.players || {});
    setPlayers(normalizedPlayers);
  }, []);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/players/sync/status');
      if (!response.ok) {
        return;
      }
      const status: PlayerSyncStatus = await response.json();
      setPlayerSyncStatus(status);
      if (status.last_synced) {
        setLastPlayerSync(status.last_synced * 1000);
      }
    } catch (statusError) {
      console.error('Failed to fetch player sync status:', statusError);
    }
  }, []);

  // Polling interval for live updates
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch picks
        const picksResponse = await fetch(`/api/picks?draft_id=${draft.draft_id}`);
        if (picksResponse.ok) {
          const picksData = await picksResponse.json();
          setPicks(picksData.picks);
          setLastUpdated(Date.now());
        }

        // Fetch players (only once)
        if (players.length === 0) {
          try {
            await loadPlayers();
          } catch (playerError) {
            console.error('Failed to load player data:', playerError);
            setError('Failed to load player data');
          }
        }
      } catch (error) {
        console.error('Failed to fetch draft data:', error);
        setError('Failed to load draft data');
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling every 3 seconds
    const interval = setInterval(fetchData, 3000);

    return () => clearInterval(interval);
  }, [draft.draft_id, players.length, loadPlayers]);

  // Calculate current draft state
  const currentPick = picks.length + 1;
  const currentRound = Math.ceil(currentPick / Object.keys(draft.draft_order).length);
  const pickInRound = ((currentPick - 1) % Object.keys(draft.draft_order).length) + 1;
  const teamOnClock = Object.entries(draft.draft_order).find(([_, slot]) => slot === pickInRound)?.[0];

  // Get remaining players (not yet drafted)
  const draftedPlayerIds = new Set(picks.map(pick => pick.player_id));
  const remainingPlayers = players.filter(player => !draftedPlayerIds.has(player.player_id));

  // Get recommendations
  const fetchRecommendations = async () => {
    if (!teamOnClock) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draft_id: draft.draft_id,
          team_on_clock: teamOnClock,
          strategy: strategy,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.ranked);
        setLlmEnabled(data.llm_enabled);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch recommendations');
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncPlayers = async () => {
    setIsSyncingPlayers(true);
    setPlayerSyncMessage(null);
    setPlayerSyncError(null);

    try {
      const response = await fetch('/api/players/sync', {
        method: 'POST',
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch (parseError) {
        if (!response.ok) {
          throw new Error('Failed to sync players');
        }
      }

      if (!response.ok) {
        throw new Error(data?.detail || 'Failed to sync players');
      }

      if (data?.last_synced) {
        setLastPlayerSync(data.last_synced * 1000);
      }

      if (data?.status === 'updated') {
        const updatedCount = data?.synced ? ` (${data.synced} players updated)` : '';
        setPlayerSyncMessage(`Player pool refreshed${updatedCount}`);
      } else if (data?.reason === 'recent-sync') {
        setPlayerSyncMessage('Player data already up to date');
      } else if (data?.reason === 'retry-window') {
        setPlayerSyncMessage('Please wait a bit before syncing again');
      } else {
        setPlayerSyncMessage('Player sync completed');
      }

      await loadPlayers();
      await fetchSyncStatus();
    } catch (syncError) {
      console.error('Failed to sync players:', syncError);
      setPlayerSyncError(syncError instanceof Error ? syncError.message : 'Failed to sync players');
    } finally {
      setIsSyncingPlayers(false);
    }
  };

  useEffect(() => {
    if (teamOnClock && remainingPlayers.length > 0) {
      fetchRecommendations();
    }
  }, [teamOnClock, remainingPlayers.length, strategy]);

  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  const getStrategyIcon = (strat: Strategy) => {
    switch (strat) {
      case 'safe': return <Shield className="h-4 w-4" />;
      case 'balanced': return <Target className="h-4 w-4" />;
      case 'upside': return <TrendingUp className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getStrategyDescription = (strat: Strategy) => {
    switch (strat) {
      case 'safe': return 'Prioritizes proven players and roster completion';
      case 'balanced': return 'Balanced approach between safety and upside';
      case 'upside': return 'Focuses on high-ceiling players and scarcity';
      default: return 'Balanced approach';
    }
  };

  const getFitColor = (fit: string) => {
    switch (fit) {
      case 'need': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'upside': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'safe': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'value': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'stack': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString();
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.player_id === playerId);
    return player?.full_name || 'Unknown Player';
  };

  const getPlayerPosition = (playerId: string) => {
    const player = players.find(p => p.player_id === playerId);
    return player?.pos || 'UNK';
  };

  const getPlayerTeam = (playerId: string) => {
    const player = players.find(p => p.player_id === playerId);
    return player?.team || '';
  };

  return (
    <div className="space-y-8">
      {/* Draft Header */}
      <div className="sleeper-card p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {league.name} - Draft
            </h2>
            <div className="flex items-center space-x-3">
              <div className="px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full text-sm font-medium text-purple-300">
                {draft.type === 'snake' ? 'Snake Draft' : draft.type}
              </div>
              <div className="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-full text-sm font-medium text-blue-300">
                {draft.settings?.rounds || 15} rounds
              </div>
            </div>
          </div>
          
        <div className="flex flex-col items-end space-y-3 text-right">
          <div>
            <div className="text-4xl font-bold gradient-text mb-1">
              Pick {currentPick}
            </div>
            <div className="text-white/60">
              Round {currentRound}, Pick {pickInRound}
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <button
              onClick={handleSyncPlayers}
              disabled={isSyncingPlayers}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/20 bg-white/10 hover:bg-white/20 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncingPlayers ? 'animate-spin' : ''}`} />
              <span>{isSyncingPlayers ? 'Syncing…' : 'Sync player data'}</span>
            </button>
            <span className="text-white/50 text-xs">
              {lastPlayerSync
                ? `Last synced ${new Date(lastPlayerSync).toLocaleString()}`
                : 'Auto-sync keeps players fresh'}
            </span>
            {playerSyncMessage && (
              <div className="flex items-center space-x-2 text-green-300 text-xs bg-green-500/10 border border-green-500/20 rounded-md px-2 py-1">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>{playerSyncMessage}</span>
              </div>
            )}
            {playerSyncError && (
              <div className="flex items-center space-x-2 text-red-300 text-xs bg-red-500/10 border border-red-500/20 rounded-md px-2 py-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{playerSyncError}</span>
              </div>
            )}
            {!playerSyncError && playerSyncStatus?.last_error && (
              <div className="flex items-center space-x-2 text-amber-200 text-xs bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{playerSyncStatus.last_error}</span>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Strategy Selector */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <span className="text-white/80 font-medium">Strategy:</span>
            <div className="flex space-x-3">
              {(['safe', 'balanced', 'upside'] as Strategy[]).map((strat) => (
                <button
                  key={strat}
                  onClick={() => setStrategy(strat)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    strategy === strat
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                      : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/20'
                  }`}
                >
                  {getStrategyIcon(strat)}
                  <span className="capitalize">{strat}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="text-white/60 text-sm">
            {getStrategyDescription(strategy)}
          </div>
        </div>

        {/* AI Status */}
        <div className="mt-6 flex items-center space-x-3 p-4 bg-white/5 rounded-xl border border-white/10">
          {llmEnabled ? (
            <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
          )}
          <div>
            <div className="text-white font-medium">
              {llmEnabled ? 'AI-powered recommendations enabled' : 'Deterministic rankings only'}
            </div>
            <div className="text-white/60 text-sm">
              {llmEnabled ? 'OpenAI integration active' : 'OpenAI not configured'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Picks */}
        <div className="lg:col-span-2">
          <div className="sleeper-card p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <span>Recent Picks</span>
            </h3>
            
            {picks.length === 0 ? (
              <div className="text-center py-12 text-white/50">
                <Clock className="h-16 w-16 mx-auto mb-4 text-white/30" />
                <p className="text-lg">No picks yet - draft hasn't started</p>
                <p className="text-sm text-white/40">Picks will appear here as the draft progresses</p>
              </div>
            ) : (
              <div className="space-y-3">
                {picks.slice(-10).reverse().map((pick, index) => (
                  <div key={pick.pick_no} className="group p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-purple-500/30 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center text-sm font-bold text-white">
                          #{pick.pick_no}
                        </div>
                        <div className="space-y-1">
                          <div className="text-white font-medium">
                            {getPlayerName(pick.player_id)}
                          </div>
                          <div className="flex items-center space-x-3 text-sm text-white/60">
                            <span>Round {pick.round}, Pick {pick.pick}</span>
                            <span>Team {pick.roster_id}</span>
                            <span className="px-2 py-1 bg-white/10 rounded-full text-xs">
                              {getPlayerPosition(pick.player_id)}
                              {getPlayerTeam(pick.player_id) && ` • ${getPlayerTeam(pick.player_id)}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-white/50 text-sm">
                        {formatTime(pick.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 text-center text-white/40 text-sm">
              Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never'}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="lg:col-span-1">
          <div className="sleeper-card p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg flex items-center justify-center">
                <Target className="h-5 w-5 text-green-400" />
              </div>
              <span>Top Picks</span>
            </h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
              </div>
            ) : recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations.slice(0, 8).map((rec, index) => (
                  <div key={rec.player_id} className="group p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-purple-500/30 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center text-xs font-bold text-white">
                          {index + 1}
                        </div>
                        <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                          {getPlayerName(rec.player_id)}
                        </div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full border ${getFitColor(rec.fit)}`}>
                        {rec.fit}
                      </div>
                    </div>
                    
                    <div className="text-white/70 text-sm mb-3">
                      {rec.reason}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-white/50 mb-3">
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                        <span>VORP: {rec.vorp?.toFixed(1) || 'N/A'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        <span>ADP: {rec.adp_discount?.toFixed(1) || 'N/A'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                        <span>Need: {rec.need_boost?.toFixed(1) || 'N/A'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                        <span>Scarcity: {rec.scarcity_boost?.toFixed(1) || 'N/A'}</span>
                      </div>
                    </div>
                    
                    {rec.edge_vs_next > 0 && (
                      <div className="text-xs text-green-400 font-medium mb-2">
                        +{rec.edge_vs_next.toFixed(1)} vs next best
                      </div>
                    )}
                    
                    <div className="text-xs text-white/40">
                      {getPlayerPosition(rec.player_id)}
                      {getPlayerTeam(rec.player_id) && ` • ${getPlayerTeam(rec.player_id)}`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-white/50">
                <Target className="h-16 w-16 mx-auto mb-4 text-white/30" />
                <p>No recommendations available</p>
                <p className="text-sm text-white/40">Select a strategy to get started</p>
              </div>
            )}
            
            {teamOnClock && (
              <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg flex items-center justify-center">
                    <Play className="h-4 w-4 text-yellow-400" />
                  </div>
                  <div className="text-white font-semibold">
                    Team {teamOnClock} is on the clock
                  </div>
                </div>
                <div className="text-white/60 text-sm">
                  Pick {currentPick} • Round {currentRound}
                </div>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={fetchRecommendations}
              disabled={isLoading || !teamOnClock}
              className="w-full mt-6 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5" />
                  <span>Refresh Recommendations</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="sleeper-card p-6 border-red-500/30 bg-red-500/10">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="text-red-300 text-sm">{error}</div>
          </div>
        </div>
      )}
    </div>
  );
}
