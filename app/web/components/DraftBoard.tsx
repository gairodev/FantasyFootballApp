'use client';

import { useState, useEffect } from 'react';
import { Clock, Users, Target, TrendingUp, Shield, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { Draft, League, Pick, Player, Recommendation, Strategy } from '../types';

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
          const playersResponse = await fetch('/api/players');
          if (playersResponse.ok) {
            const playersData = await playersResponse.json();
            setPlayers(playersData.players);
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
  }, [draft.draft_id, players.length]);

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

  useEffect(() => {
    if (teamOnClock && remainingPlayers.length > 0) {
      fetchRecommendations();
    }
  }, [teamOnClock, remainingPlayers.length, strategy]);

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
      case 'need': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'upside': return 'bg-green-100 text-green-800 border-green-200';
      case 'safe': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'value': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'stack': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <div className="space-y-6">
      {/* Draft Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {league.name} - Draft
            </h2>
            <p className="text-gray-600">
              {draft.type === 'snake' ? 'Snake Draft' : draft.type} • {draft.settings?.rounds || 15} rounds
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-primary-600">
              Pick {currentPick}
            </div>
            <div className="text-sm text-gray-500">
              Round {currentRound}, Pick {pickInRound}
            </div>
          </div>
        </div>

        {/* Strategy Selector */}
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Strategy:</span>
          <div className="flex space-x-2">
            {(['safe', 'balanced', 'upside'] as Strategy[]).map((strat) => (
              <button
                key={strat}
                onClick={() => setStrategy(strat)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  strategy === strat
                    ? 'bg-primary-100 text-primary-800 border border-primary-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {getStrategyIcon(strat)}
                <span className="capitalize">{strat}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          {getStrategyDescription(strategy)}
        </div>

        {/* AI Status */}
        <div className="mt-3 flex items-center space-x-2">
          {llmEnabled ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          )}
          <span className="text-xs text-gray-600">
            {llmEnabled ? 'AI-powered recommendations enabled' : 'Deterministic rankings only (OpenAI not configured)'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Picks */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Picks</span>
            </h3>
            
            {picks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No picks yet - draft hasn't started
              </div>
            ) : (
              <div className="space-y-3">
                {picks.slice(-10).reverse().map((pick) => (
                  <div key={pick.pick_no} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-medium text-gray-900">
                        #{pick.pick_no}
                      </div>
                      <div className="text-sm text-gray-600">
                        Round {pick.round}, Pick {pick.pick}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        Team {pick.roster_id}
                      </div>
                      <div className="text-sm text-gray-600">
                        {getPlayerName(pick.player_id)} ({getPlayerPosition(pick.player_id)})
                        {getPlayerTeam(pick.player_id) && ` - ${getPlayerTeam(pick.player_id)}`}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(pick.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 text-xs text-gray-500 text-center">
              Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never'}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Top Picks</span>
            </h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.slice(0, 8).map((rec, index) => (
                  <div key={rec.player_id} className="p-3 border rounded-md hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900">
                        {index + 1}. {getPlayerName(rec.player_id)}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full border ${getFitColor(rec.fit)}`}>
                        {rec.fit}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      {rec.reason}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-2">
                      <div>VORP: {rec.vorp?.toFixed(1) || 'N/A'}</div>
                      <div>ADP: {rec.adp_discount?.toFixed(1) || 'N/A'}</div>
                      <div>Need: {rec.need_boost?.toFixed(1) || 'N/A'}</div>
                      <div>Scarcity: {rec.scarcity_boost?.toFixed(1) || 'N/A'}</div>
                    </div>
                    
                    {rec.edge_vs_next > 0 && (
                      <div className="text-xs text-green-600 font-medium">
                        +{rec.edge_vs_next.toFixed(1)} vs next best
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-400 mt-2">
                      {getPlayerPosition(rec.player_id)}
                      {getPlayerTeam(rec.player_id) && ` • ${getPlayerTeam(rec.player_id)}`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No recommendations available
              </div>
            )}
            
            {teamOnClock && (
              <div className="mt-4 p-3 bg-primary-50 rounded-md">
                <div className="text-sm font-medium text-primary-900">
                  Team {teamOnClock} is on the clock
                </div>
                <div className="text-xs text-primary-600 mt-1">
                  Pick {currentPick} • Round {currentRound}
                </div>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={fetchRecommendations}
              disabled={isLoading || !teamOnClock}
              className="w-full mt-4 py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Refreshing...' : 'Refresh Recommendations'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        </div>
      )}
    </div>
  );
}
