'use client';

import { useState, useEffect } from 'react';
import { Search, Users, Trophy, Clock, Sparkles, Zap, Target, BarChart3 } from 'lucide-react';
import LeagueSelector from '../components/LeagueSelector';
import DraftBoard from '../components/DraftBoard';
import LoadingSpinner from '../components/LoadingSpinner';
import { League, Draft } from '../types';

export default function Home() {
  const [username, setUsername] = useState('');
  const [season, setSeason] = useState('2024');
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<{ user_id: string; leagues: League[] } | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDiscover = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/discover?username=${encodeURIComponent(username)}&season=${season}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to discover user');
      }

      const data = await response.json();
      setUserData(data);
      setSelectedLeague(null);
      setSelectedDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeagueSelect = (league: League) => {
    setSelectedLeague(league);
    setSelectedDraft(null);
  };

  const handleDraftSelect = (draft: Draft) => {
    setSelectedDraft(draft);
  };

  const resetSelection = () => {
    setSelectedDraft(null);
    setSelectedLeague(null);
    setUserData(null);
    setUsername('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        
        {/* Floating particles */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-purple-400 rounded-full animate-float opacity-60"></div>
        <div className="absolute top-40 right-32 w-1 h-1 bg-pink-400 rounded-full animate-float opacity-40" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-32 w-1.5 h-1.5 bg-blue-400 rounded-full animate-float opacity-50" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-20 w-1 h-1 bg-cyan-400 rounded-full animate-float opacity-30" style={{ animationDelay: '3s' }}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl animate-pulse-glow">
                  <Trophy className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">
                  Draft Master
                </h1>
                <p className="text-white/60 text-sm">AI-Powered Fantasy Football Assistant</p>
              </div>
            </div>
            {userData && (
              <button
                onClick={resetSelection}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/30 hover:scale-105"
              >
                Start Over
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!userData ? (
          /* Username Discovery Section */
          <div className="max-w-2xl mx-auto animate-fade-in-up">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-4 py-2 rounded-full border border-purple-500/30 mb-6">
                <Sparkles className="h-5 w-5 text-purple-400" />
                <span className="text-purple-300 font-medium">Powered by AI</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Discover Your
                <span className="gradient-text-secondary block">Fantasy Leagues</span>
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                Connect your Sleeper account and get AI-powered draft insights, player rankings, and strategic recommendations.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="sleeper-card p-6 text-center group hover:scale-105 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Smart Rankings</h3>
                <p className="text-white/60 text-sm">AI-powered player rankings based on your league settings</p>
              </div>
              
              <div className="sleeper-card p-6 text-center group hover:scale-105 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Draft Strategy</h3>
                <p className="text-white/60 text-sm">Personalized draft strategies and positional needs</p>
              </div>
              
              <div className="sleeper-card p-6 text-center group hover:scale-105 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Real-time Updates</h3>
                <p className="text-white/60 text-sm">Live draft board with instant recommendations</p>
              </div>
            </div>

            {/* Discovery Form */}
            <div className="sleeper-card p-8">
              <div className="space-y-6">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-white/80 mb-3">
                    Sleeper Username
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
                    <input
                      type="text"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your Sleeper username"
                      className="sleeper-input w-full pl-12 pr-4 py-4 text-lg"
                      onKeyPress={(e) => e.key === 'Enter' && handleDiscover()}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="season" className="block text-sm font-medium text-white/80 mb-3">
                    Season
                  </label>
                  <select
                    id="season"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="sleeper-input w-full px-4 py-4 text-lg"
                  >
                    <option value="2024">2024 Season</option>
                    <option value="2023">2023 Season</option>
                    <option value="2022">2022 Season</option>
                  </select>
                </div>

                <button
                  onClick={handleDiscover}
                  disabled={isLoading || !username.trim()}
                  className="sleeper-button w-full py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-300"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <LoadingSpinner size="sm" variant="trophy" text="" />
                      <span>Discovering...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Users className="h-5 w-5" />
                      <span>Discover Leagues</span>
                    </div>
                  )}
                </button>

                {error && (
                  <div className="bg-red-500/20 border border-red-500/30 text-red-300 p-4 rounded-xl text-center">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Info */}
            <div className="text-center mt-8 text-white/50 text-sm">
              <p>Your data is secure and never stored. We only access public league information.</p>
            </div>
          </div>
        ) : (
          /* League and Draft Selection */
          <div className="space-y-8 animate-slide-in-right">
            <LeagueSelector
              leagues={userData.leagues}
              selectedLeague={selectedLeague}
              onLeagueSelect={handleLeagueSelect}
              onDraftSelect={handleDraftSelect}
            />
            
            {selectedDraft && (
              <DraftBoard
                draft={selectedDraft}
                league={selectedLeague!}
                username={username}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
