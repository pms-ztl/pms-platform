/**
 * Feature 1: Hourly Performance Tracker
 *
 * Captures and visualizes employee micro-performance data in real time
 * with time-series charts
 */

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  BoltIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface HourlyMetric {
  id: string;
  metricHour: string;
  tasksCompleted: number;
  tasksCreated: number;
  activeMinutes: number;
  focusMinutes: number;
  meetingMinutes: number;
  productivityScore: number;
  engagementScore: number;
  performanceScore: number;
}

interface PerformanceSnapshot {
  timestamp: string;
  today: {
    tasksCompleted: number;
    tasksCreated: number;
    activeMinutes: number;
    focusMinutes: number;
    meetingMinutes: number;
    avgProductivityScore: number;
    avgEngagementScore: number;
  };
  currentHour: HourlyMetric | null;
  hourlyTrend: HourlyMetric[];
}

const api = {
  getSnapshot: async (): Promise<PerformanceSnapshot> => {
    const res = await fetchWithAuth('/api/v1/realtime-performance/snapshot');
    const data = await res.json();
    return data.data;
  },
  getHourlyMetrics: async (startTime: string, endTime: string): Promise<HourlyMetric[]> => {
    const res = await fetchWithAuth(
      `/api/v1/realtime-performance/hourly?startTime=${startTime}&endTime=${endTime}`
    );
    const data = await res.json();
    return data.data;
  },
};

const StatCard = ({
  title,
  value,
  unit,
  trend,
  icon: Icon,
  color,
}: {
  title: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ElementType;
  color: string;
}) => {
  const TrendIcon = trend === 'up' ? ArrowTrendingUpIcon : trend === 'down' ? ArrowTrendingDownIcon : MinusIcon;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-secondary-400';

  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-100 dark:border-secondary-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={clsx('p-2 rounded-lg', color)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend && <TrendIcon className={clsx('h-4 w-4', trendColor)} />}
      </div>
      <div className="mt-3">
        <p className="text-sm text-secondary-500 dark:text-secondary-400">{title}</p>
        <p className="text-2xl font-bold text-secondary-900 dark:text-white">
          {value}
          {unit && <span className="text-sm font-normal text-secondary-500 ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  );
};

const ScoreGauge = ({
  label,
  score,
  maxScore = 100,
  color,
}: {
  label: string;
  score: number;
  maxScore?: number;
  color: string;
}) => {
  const percentage = (score / maxScore) * 100;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-secondary-200 dark:text-secondary-700"
          />
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={`${percentage * 2.64} 264`}
            className={color}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-secondary-900 dark:text-white">{Math.round(score)}</span>
        </div>
      </div>
      <p className="mt-2 text-sm text-secondary-600 dark:text-secondary-400">{label}</p>
    </div>
  );
};

export function HourlyPerformanceTracker() {
  const [refreshInterval, setRefreshInterval] = useState(60000); // 1 minute

  const { data: snapshot, isLoading } = useQuery({
    queryKey: ['performanceSnapshot'],
    queryFn: api.getSnapshot,
    refetchInterval: refreshInterval,
  });

  const chartData = snapshot?.hourlyTrend?.map((m) => ({
    hour: new Date(m.metricHour).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    productivity: m.productivityScore || 0,
    engagement: m.engagementScore || 0,
    tasks: m.tasksCompleted,
    active: m.activeMinutes,
  })).reverse() || [];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-1/4" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-secondary-200 dark:bg-secondary-700 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-secondary-200 dark:bg-secondary-700 rounded-xl" />
      </div>
    );
  }

  const today = snapshot?.today;
  const currentHour = snapshot?.currentHour;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
            <ClockIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-secondary-900 dark:text-white">
              Hourly Performance Tracker
            </h2>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              Real-time micro-performance metrics
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-secondary-500">Auto-refresh:</span>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="text-xs border border-secondary-300 dark:border-secondary-600 rounded px-2 py-1 bg-white dark:bg-secondary-800"
          >
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={300000}>5m</option>
          </select>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-600 dark:text-green-400">Live</span>
          </div>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Tasks Completed"
          value={today?.tasksCompleted || 0}
          trend={today?.tasksCompleted && today.tasksCompleted > 5 ? 'up' : 'stable'}
          icon={BoltIcon}
          color="bg-gradient-to-br from-emerald-500 to-green-500"
        />
        <StatCard
          title="Active Time"
          value={Math.round((today?.activeMinutes || 0) / 60 * 10) / 10}
          unit="hrs"
          trend="stable"
          icon={ClockIcon}
          color="bg-gradient-to-br from-blue-500 to-cyan-500"
        />
        <StatCard
          title="Focus Time"
          value={Math.round((today?.focusMinutes || 0) / 60 * 10) / 10}
          unit="hrs"
          trend={today?.focusMinutes && today.focusMinutes > 120 ? 'up' : 'down'}
          icon={FireIcon}
          color="bg-gradient-to-br from-orange-500 to-amber-500"
        />
        <StatCard
          title="Meeting Time"
          value={Math.round((today?.meetingMinutes || 0) / 60 * 10) / 10}
          unit="hrs"
          icon={ClockIcon}
          color="bg-gradient-to-br from-violet-500 to-purple-500"
        />
      </div>

      {/* Score Gauges */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-100 dark:border-secondary-700 p-6">
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Performance Scores</h3>
        <div className="flex justify-around">
          <ScoreGauge
            label="Productivity"
            score={today?.avgProductivityScore || 0}
            color="text-emerald-500"
          />
          <ScoreGauge
            label="Engagement"
            score={today?.avgEngagementScore || 0}
            color="text-blue-500"
          />
          <ScoreGauge
            label="Current Hour"
            score={currentHour?.performanceScore || 0}
            color="text-violet-500"
          />
        </div>
      </div>

      {/* Hourly Trend Chart */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-100 dark:border-secondary-700 p-6">
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Hourly Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorProductivity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-secondary-200 dark:stroke-secondary-700" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip
                cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                contentStyle={{
                  background: 'rgba(15, 23, 42, 0.80)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  borderRadius: '0.75rem',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
                  fontSize: '0.75rem',
                  color: '#f1f5f9',
                }}
                labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="productivity"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorProductivity)"
                name="Productivity"
              />
              <Area
                type="monotone"
                dataKey="engagement"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorEngagement)"
                name="Engagement"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Current Hour Details */}
      {currentHour && (
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-secondary-800 dark:to-secondary-800 rounded-xl p-6 border border-cyan-100 dark:border-secondary-700">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
            Current Hour Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Tasks</p>
              <p className="text-xl font-bold text-secondary-900 dark:text-white">{currentHour.tasksCompleted}</p>
            </div>
            <div>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Active</p>
              <p className="text-xl font-bold text-secondary-900 dark:text-white">{currentHour.activeMinutes}m</p>
            </div>
            <div>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Focus</p>
              <p className="text-xl font-bold text-secondary-900 dark:text-white">{currentHour.focusMinutes}m</p>
            </div>
            <div>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Interactions</p>
              <p className="text-xl font-bold text-secondary-900 dark:text-white">{currentHour.interactionsCount || 0}</p>
            </div>
            <div>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Score</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {currentHour.performanceScore || 0}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HourlyPerformanceTracker;
