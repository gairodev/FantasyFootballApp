'use client';

import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export default function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  variant = 'primary',
  trend,
  className = ''
}: StatsCardProps) {
  const variantStyles = {
    primary: {
      iconBg: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-400',
      border: 'border-purple-500/30',
      trendPositive: 'text-purple-400',
      trendNegative: 'text-pink-400'
    },
    secondary: {
      iconBg: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-400',
      border: 'border-blue-500/30',
      trendPositive: 'text-blue-400',
      trendNegative: 'text-cyan-400'
    },
    success: {
      iconBg: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-400',
      border: 'border-green-500/30',
      trendPositive: 'text-green-400',
      trendNegative: 'text-emerald-400'
    },
    warning: {
      iconBg: 'from-yellow-500/20 to-orange-500/20',
      iconColor: 'text-yellow-400',
      border: 'border-yellow-500/30',
      trendPositive: 'text-yellow-400',
      trendNegative: 'text-orange-400'
    },
    danger: {
      iconBg: 'from-red-500/20 to-pink-500/20',
      iconColor: 'text-red-400',
      border: 'border-red-500/30',
      trendPositive: 'text-red-400',
      trendNegative: 'text-pink-400'
    },
    info: {
      iconBg: 'from-indigo-500/20 to-purple-500/20',
      iconColor: 'text-indigo-400',
      border: 'border-indigo-500/30',
      trendPositive: 'text-indigo-400',
      trendNegative: 'text-purple-400'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className={`sleeper-card p-6 group hover:scale-105 transition-all duration-300 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`w-12 h-12 bg-gradient-to-br ${styles.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
              <Icon className={`h-6 w-6 ${styles.iconColor}`} />
            </div>
            <div>
              <h3 className="text-white/60 text-sm font-medium uppercase tracking-wide">
                {title}
              </h3>
              {subtitle && (
                <p className="text-white/40 text-xs">{subtitle}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-3xl font-bold text-white">
              {value}
            </div>
            
            {trend && (
              <div className="flex items-center space-x-2">
                <div className={`flex items-center space-x-1 text-sm ${
                  trend.isPositive ? styles.trendPositive : styles.trendNegative
                }`}>
                  <div className={`w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent ${
                    trend.isPositive ? 'border-b-current' : 'border-t-current border-t-4 border-b-0'
                  }`}></div>
                  <span className="font-medium">
                    {trend.isPositive ? '+' : ''}{trend.value}%
                  </span>
                </div>
                <span className="text-white/40 text-xs">
                  from last period
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Decorative element */}
        <div className={`w-16 h-16 bg-gradient-to-br ${styles.iconBg} rounded-full opacity-20 group-hover:opacity-30 transition-opacity duration-300`}></div>
      </div>
    </div>
  );
}

// Mini stats card for compact layouts
export function MiniStatsCard({ 
  title, 
  value, 
  icon: Icon, 
  variant = 'primary',
  className = ''
}: Omit<StatsCardProps, 'subtitle' | 'trend'>) {
  const variantStyles = {
    primary: {
      iconBg: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-400'
    },
    secondary: {
      iconBg: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-400'
    },
    success: {
      iconBg: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-400'
    },
    warning: {
      iconBg: 'from-yellow-500/20 to-orange-500/20',
      iconColor: 'text-yellow-400'
    },
    danger: {
      iconBg: 'from-red-500/20 to-pink-500/20',
      iconColor: 'text-red-400'
    },
    info: {
      iconBg: 'from-indigo-500/20 to-purple-500/20',
      iconColor: 'text-indigo-400'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className={`sleeper-card p-4 group hover:scale-105 transition-all duration-300 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${styles.iconBg} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`h-5 w-5 ${styles.iconColor}`} />
        </div>
        <div className="flex-1">
          <h3 className="text-white/60 text-xs font-medium uppercase tracking-wide">
            {title}
          </h3>
          <div className="text-xl font-bold text-white">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

// Metric display component
export function MetricDisplay({ 
  label, 
  value, 
  unit = '', 
  className = '' 
}: { 
  label: string; 
  value: string | number; 
  unit?: string;
  className?: string;
}) {
  return (
    <div className={`text-center ${className}`}>
      <div className="text-2xl font-bold text-white mb-1">
        {value}{unit}
      </div>
      <div className="text-white/60 text-sm font-medium">
        {label}
      </div>
    </div>
  );
}
