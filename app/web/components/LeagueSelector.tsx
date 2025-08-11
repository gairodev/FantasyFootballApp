'use client';

import { useState, useEffect } from 'react';
import { Users, Calendar, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
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

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">
        Your Leagues ({leagues.length})
      </h2>
      
      <div className="grid gap-4">
        {leagues.map((league) => {
          const isExpanded = expandedLeague === league.league_id;
          const leagueDrafts = drafts[league.league_id] || [];
          const isLoading = loadingDrafts === league.league_id;
          const isSelected = selectedLeague?.league_id === league.league_id;
          
          return (
            <div key={league.league_id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* League Header */}
              <div 
                className={`p-4 cursor-pointer transition-colors ${
                  isSelected ? 'bg-primary-50 border-l-4 border-primary-500' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleLeagueSelect(league)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {league.name}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>{getRosterSize(league.roster_positions)} starters</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{league.season}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Bench:</span>
                        <span>{getBenchSize(league.roster_positions)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Status:</span>
                        <span className={`capitalize ${
                          league.status === 'active' ? 'text-success-600' : 
                          league.status === 'in_season' ? 'text-warning-600' : 'text-gray-500'
                        }`}>
                          {league.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    {Object.keys(league.scoring_settings).length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        Scoring: {formatScoring(league.scoring_settings)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isSelected && (
                      <div className="text-primary-600 font-medium">Selected</div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLeague(league.league_id);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Drafts Section */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-4">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Drafts</h4>
                    
                    {isLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                      </div>
                    ) : leagueDrafts.length > 0 ? (
                      <div className="space-y-2">
                        {leagueDrafts.map((draft) => (
                          <div
                            key={draft.draft_id}
                            className="flex items-center justify-between p-3 bg-white rounded-md border hover:border-primary-300 transition-colors cursor-pointer"
                            onClick={() => onDraftSelect(draft)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${
                                draft.status === 'in_progress' ? 'bg-success-500 animate-pulse-slow' :
                                draft.status === 'complete' ? 'bg-gray-500' : 'bg-warning-500'
                              }`} />
                              <div>
                                <div className="font-medium text-gray-900">
                                  {draft.type === 'snake' ? 'Snake Draft' : 
                                   draft.type === 'auction' ? 'Auction Draft' : 
                                   `${draft.type} Draft`}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {draft.settings?.rounds || 15} rounds
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <span className={`text-sm px-2 py-1 rounded-full ${
                                draft.status === 'in_progress' ? 'bg-success-100 text-success-800' :
                                draft.status === 'complete' ? 'bg-gray-100 text-gray-800' : 'bg-warning-100 text-warning-800'
                              }`}>
                                {draft.status.replace('_', ' ')}
                              </span>
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        No drafts found for this league
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
