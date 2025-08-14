'use client';

import { Trophy, Sparkles } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  variant?: 'default' | 'trophy' | 'sparkles';
}

export default function LoadingSpinner({ 
  size = 'md', 
  text = 'Loading...', 
  variant = 'default' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const renderIcon = () => {
    switch (variant) {
      case 'trophy':
        return (
          <div className={`${sizeClasses[size]} bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl animate-pulse-glow`}>
            <Trophy className={`${size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8'} text-white`} />
          </div>
        );
      case 'sparkles':
        return (
          <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-2xl animate-pulse-glow`}>
            <Sparkles className={`${size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8'} text-white`} />
          </div>
        );
      default:
        return (
          <div className={`${sizeClasses[size]} border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin`}></div>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      {renderIcon()}
      {text && (
        <div className={`text-white/70 font-medium ${textSizes[size]} text-center`}>
          {text}
        </div>
      )}
    </div>
  );
}

// Pulse dots loading animation
export function PulseDots() {
  return (
    <div className="flex items-center justify-center space-x-2">
      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
    </div>
  );
}

// Skeleton loading component
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`sleeper-card p-6 animate-pulse ${className}`}>
      <div className="space-y-4">
        <div className="h-6 bg-white/10 rounded-lg w-3/4"></div>
        <div className="h-4 bg-white/10 rounded-lg w-1/2"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-8 bg-white/10 rounded-lg"></div>
          <div className="h-8 bg-white/10 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

// Wave loading animation
export function WaveLoading() {
  return (
    <div className="flex items-center justify-center space-x-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-2 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full animate-pulse"
          style={{
            animationDelay: `${i * 100}ms`,
            animationDuration: '1s'
          }}
        ></div>
      ))}
    </div>
  );
}
