'use client';

import { useState } from 'react';
import { Search, Users, Trophy, Clock } from 'lucide-react';
import LeagueSelector from '../components/LeagueSelector';
import DraftBoard from '../components/DraftBoard';
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Trophy className="h-8 w-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Sleeper Draft Assistant
              </h1>
            </div>
            {userData && (
              <button
                onClick={resetSelection}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Start Over
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!userData ? (
          /* Username Discovery Section */
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Discover Your Leagues
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                    Sleeper Username
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your Sleeper username"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleDiscover()}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="season" className="block text-sm font-medium text-gray-700 mb-2">
                    Season
                  </label>
                  <select
                    id="season"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                  </select>
                </div>

                <button
                  onClick={handleDiscover}
                  disabled={isLoading || !username.trim()}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    'Discover Leagues'
                  )}
                </button>

                {error && (
                  <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* League and Draft Selection */
          <div className="space-y-6">
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
