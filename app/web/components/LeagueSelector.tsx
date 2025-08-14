'use client';

import { useState, useEffect } from 'react';
import { Users, Calendar, ArrowRight, ChevronDown, ChevronRight, Crown, Settings, TrendingUp, Clock } from 'lucide-react';
import { League, Draft } from '../types';

interface LeagueSelectorProps {
  leagues: League[];
  selectedLeague: League | null;
  onLeagueSelect: (league: League) => void;
  onDraftSelect: (draft: Draft) => void;
}

export default function LeagueSelector({ 
  leagues, 
  selectedLeague, 
  onLeagueSelect, 
  onDraftSelect 
}: LeagueSelectorProps) {
  const [expandedLeague, setExpandedLeague] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft[]>>({});
  const [loadingDrafts, setLoadingDrafts] = useState<string | null>(null);

  const toggleLeague = async (leagueId: string) => {
    if (expandedLeague === leagueId) {
      setExpandedLeague(null);
      return;
    }

    setExpandedLeague(leagueId);
    
    // Load drafts if not already loaded
    if (!drafts[leagueId]) {
      setLoadingDrafts(leagueId);
      try {
        const response = await fetch(`/api/drafts?league_id=${leagueId}`);
        if (response.ok) {
          const data = await response.json();
          setDrafts(prev => ({ ...prev, [leagueId]: data.drafts }));
        }
      } catch (error) {
        console.error('Failed to load drafts:', error);
      } finally {
        setLoadingDrafts(null);
      }
    }
  };

  const handleLeagueSelect = (league: League) => {
    onLeagueSelect(league);
    if (!drafts[league.league_id]) {
      toggleLeague(league.league_id);
    }
  };

  const getRosterSize = (positions: string[]) => {
    return positions.filter(pos => pos !== 'BN' && pos !== 'IR').length;
  };

  const getBenchSize = (positions: string[]) => {
    return positions.filter(pos => pos === 'BN').length;
  };

  const formatScoring = (scoring: Record<string, number>) => {
    const mainScoring = Object.entries(scoring)
      .filter(([key]) => !key.includes('bonus') && !key.includes('penalty'))
      .slice(0, 3);
    
    return mainScoring.map(([key, value]) => `${key}: ${value}`).join(', ');
  };

  const getLeagueType = (rosterPositions: string[]) => {
    const qbCount = rosterPositions.filter(pos => pos === 'QB').length;
    const rbCount = rosterPositions.filter(pos => pos === 'RB').length;
    const wrCount = rosterPositions.filter(pos => pos === 'WR').length;
    const teCount = rosterPositions.filter(pos => pos === 'TE').length;
    
    if (qbCount === 1 && rbCount === 2 && wrCount === 2 && teCount === 1) {
      return 'Standard';
    } else if (rbCount === 2 && wrCount === 3 && teCount === 1) {
      return '3-WR';
    } else if (teCount === 2) {
      return '2-TE';
    } else if (rbCount === 1) {
      return '1-RB';
    }
    return 'Custom';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">
          Your Leagues
        </h2>
        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-4 py-2 rounded-full border border-purple-500/30">
          <Users className="h-4 w-4 text-purple-400" />
          <span className="text-purple-300 font-medium">{leagues.length} League{leagues.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      
      <div className="grid gap-6">
        {leagues.map((league, index) => {
          const isExpanded = expandedLeague === league.league_id;
          const leagueDrafts = drafts[league.league_id] || [];
          const isLoading = loadingDrafts === league.league_id;
          const isSelected = selectedLeague?.league_id === league.league_id;
          const leagueType = getLeagueType(league.roster_positions);
          
          return (
            <div 
              key={league.league_id} 
              className={`sleeper-card overflow-hidden transition-all duration-500 ${
                isSelected ? 'ring-2 ring-purple-500/50 bg-white/10' : ''
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* League Header */}
              <div 
                className={`p-6 cursor-pointer transition-all duration-300 ${
                  isSelected ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10' : 'hover:bg-white/5'
                }`}
                onClick={() => handleLeagueSelect(league)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        league.status === 'active' ? 'bg-green-500 animate-pulse' :
                        league.status === 'in_season' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`} />
                      <h3 className="text-xl font-bold text-white">
                        {league.name}
                      </h3>
                      <div className="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-full text-xs font-medium text-blue-300">
                        {leagueType}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center space-x-2 text-white/70">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
                          <Users className="h-4 w-4 text-purple-400" />
                        </div>
                        <div>
                          <div className="text-sm text-white/50">Starters</div>
                          <div className="font-semibold text-white">{getRosterSize(league.roster_positions)}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-white/70">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-green-400" />
                        </div>
                        <div>
                          <div className="text-sm text-white/50">Season</div>
                          <div className="font-semibold text-white">{league.season}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-white/70">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center">
                          <TrendingUp className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                          <div className="text-sm text-white/50">Bench</div>
                          <div className="font-semibold text-white">{getBenchSize(league.roster_positions)}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-white/70">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          league.status === 'active' ? 'bg-green-500/20' :
                          league.status === 'in_season' ? 'bg-yellow-500/20' : 'bg-gray-500/20'
                        }`}>
                          <Crown className={`h-4 w-4 ${
                            league.status === 'active' ? 'text-green-400' :
                            league.status === 'in_season' ? 'text-yellow-400' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <div className="text-sm text-white/50">Status</div>
                          <div className={`font-semibold capitalize ${
                            league.status === 'active' ? 'text-green-400' : 
                            league.status === 'in_season' ? 'text-yellow-400' : 'text-gray-400'
                          }`}>
                            {league.status.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {Object.keys(league.scoring_settings).length > 0 && (
                      <div className="flex items-center space-x-2 text-white/50 text-sm">
                        <Settings className="h-4 w-4" />
                        <span>Scoring: {formatScoring(league.scoring_settings)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {isSelected && (
                      <div className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-full">
                        Selected
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLeague(league.league_id);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-6 w-6 text-white/60" />
                      ) : (
                        <ChevronRight className="h-6 w-6 text-white/60" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Drafts Section */}
              {isExpanded && (
                <div className="border-t border-white/10 bg-black/20">
                  <div className="p-6">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg flex items-center justify-center">
                        <Clock className="h-4 w-4 text-yellow-400" />
                      </div>
                      <span>Drafts</span>
                    </h4>
                    
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                      </div>
                    ) : leagueDrafts.length > 0 ? (
                      <div className="grid gap-3">
                        {leagueDrafts.map((draft) => (
                          <div
                            key={draft.draft_id}
                            className="group flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-purple-500/30 transition-all duration-300 cursor-pointer"
                            onClick={() => onDraftSelect(draft)}
                          >
                            <div className="flex items-center space-x-4">
                              <div className={`w-4 h-4 rounded-full ${
                                draft.status === 'in_progress' ? 'bg-green-500 animate-pulse' :
                                draft.status === 'complete' ? 'bg-gray-500' : 'bg-yellow-500'
                              }`} />
                              <div>
                                <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                                  {draft.type === 'snake' ? 'Snake Draft' : 
                                   draft.type === 'auction' ? 'Auction Draft' : 
                                   `${draft.type} Draft`}
                                </div>
                                <div className="text-sm text-white/60">
                                  {draft.settings?.rounds || 15} rounds
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                                draft.status === 'in_progress' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                                draft.status === 'complete' ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30' : 
                                'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                              }`}>
                                {draft.status.replace('_', ' ')}
                              </span>
                              <ArrowRight className="h-5 w-5 text-white/40 group-hover:text-purple-400 transition-colors" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-white/50">
                        <Clock className="h-12 w-12 mx-auto mb-3 text-white/30" />
                        <p>No drafts found for this league</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
