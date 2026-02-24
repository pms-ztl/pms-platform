/**
 * Feature 3: Real-Time Goal Progress Dashboard
 *
 * Displays live progress toward KPIs with color-coded status indicators
 * (green=on-track, yellow=at-risk, red=off-track)
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FlagIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  CalendarDaysIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface GoalItem {
  id: string;
  title: string;
  progress: number;
  status: 'on_track' | 'at_risk' | 'off_track';
  dueDate: string | null;
  daysRemaining: number | null;
  trend: 'improving' | 'stable' | 'declining';
}

interface GoalDashboard {
  totalGoals: number;
  onTrack: number;
  atRisk: number;
  offTrack: number;
  goals: GoalItem[];
}

const api = {
  getGoalDashboard: async (includeTeamGoals: boolean): Promise<GoalDashboard> => {
    const res = await fetchWithAuth(
      `/api/v1/realtime-performance/goals/dashboard?includeTeamGoals=${includeTeamGoals}`
    );
    const data = await res.json();
    return data.data;
  },
};

const StatusBadge = ({ status }: { status: 'on_track' | 'at_risk' | 'off_track' }) => {
  const config = {
    on_track: {
      icon: CheckCircleIcon,
      text: 'On Track',
      bg: 'bg-green-100 dark:bg-green-900/30',
      text_color: 'text-green-700 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
    },
    at_risk: {
      icon: ExclamationTriangleIcon,
      text: 'At Risk',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text_color: 'text-yellow-700 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-800',
    },
    off_track: {
      icon: XCircleIcon,
      text: 'Off Track',
      bg: 'bg-red-100 dark:bg-red-900/30',
      text_color: 'text-red-700 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
    },
  };

  const { icon: Icon, text, bg, text_color, border } = config[status];

  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', bg, text_color, border)}>
      <Icon className="h-3.5 w-3.5 mr-1" />
      {text}
    </span>
  );
};

const TrendIndicator = ({ trend }: { trend: 'improving' | 'stable' | 'declining' }) => {
  const config = {
    improving: { icon: ArrowTrendingUpIcon, color: 'text-green-500', label: 'Improving' },
    stable: { icon: MinusIcon, color: 'text-secondary-400', label: 'Stable' },
    declining: { icon: ArrowTrendingDownIcon, color: 'text-red-500', label: 'Declining' },
  };

  const { icon: Icon, color, label } = config[trend];

  return (
    <div className={clsx('flex items-center', color)} title={label}>
      <Icon className="h-4 w-4" />
    </div>
  );
};

const ProgressBar = ({ progress, status }: { progress: number; status: string }) => {
  const colorClass = {
    on_track: 'bg-green-500',
    at_risk: 'bg-yellow-500',
    off_track: 'bg-red-500',
  }[status] || 'bg-secondary-500';

  return (
    <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2.5">
      <div
        className={clsx('h-2.5 rounded-full transition-all duration-500', colorClass)}
        style={{ width: `${Math.min(100, progress)}%` }}
      />
    </div>
  );
};

const GoalCard = ({ goal }: { goal: GoalItem }) => {
  const dueText = goal.daysRemaining !== null
    ? goal.daysRemaining < 0
      ? `${Math.abs(goal.daysRemaining)} days overdue`
      : goal.daysRemaining === 0
        ? 'Due today'
        : `${goal.daysRemaining} days left`
    : 'No deadline';

  const dueColor = goal.daysRemaining !== null && goal.daysRemaining < 0
    ? 'text-red-600 dark:text-red-400'
    : goal.daysRemaining !== null && goal.daysRemaining <= 7
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-secondary-500 dark:text-secondary-400';

  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-100 dark:border-secondary-700 p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-secondary-900 dark:text-white break-words">
            {goal.title}
          </h4>
          <div className={clsx('text-xs mt-1 flex items-center', dueColor)}>
            <CalendarDaysIcon className="h-3.5 w-3.5 mr-1" />
            {dueText}
          </div>
        </div>
        <TrendIndicator trend={goal.trend} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-secondary-500 dark:text-secondary-400">Progress</span>
          <span className="font-medium text-secondary-900 dark:text-white">{Math.round(goal.progress)}%</span>
        </div>
        <ProgressBar progress={goal.progress} status={goal.status} />
      </div>

      <div className="mt-3 flex justify-between items-center">
        <StatusBadge status={goal.status} />
        <a
          href={`/goals/${goal.id}`}
          className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
        >
          View details →
        </a>
      </div>
    </div>
  );
};

const SummaryCard = ({
  title,
  count,
  total,
  icon: Icon,
  color,
  bgColor,
}: {
  title: string;
  count: number;
  total: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className={clsx('rounded-xl p-4 border', bgColor)}>
      <div className="flex items-center justify-between">
        <div>
          <p className={clsx('text-sm font-medium', color)}>{title}</p>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white mt-1">
            {count}
            <span className="text-sm font-normal text-secondary-500 ml-1">/ {total}</span>
          </p>
        </div>
        <div className={clsx('p-2 rounded-lg', color.replace('text-', 'bg-').replace('-600', '-100').replace('-500', '-100'))}>
          <Icon className={clsx('h-6 w-6', color)} />
        </div>
      </div>
      <div className="mt-3">
        <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-1.5">
          <div
            className={clsx('h-1.5 rounded-full', color.replace('text-', 'bg-'))}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">{percentage}% of total</p>
      </div>
    </div>
  );
};

export function GoalProgressDashboard() {
  const [includeTeamGoals, setIncludeTeamGoals] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_track' | 'at_risk' | 'off_track'>('all');

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['goalDashboard', includeTeamGoals],
    queryFn: () => api.getGoalDashboard(includeTeamGoals),
    refetchInterval: 60000, // Refresh every minute
  });

  const filteredGoals = dashboard?.goals?.filter(
    (goal) => statusFilter === 'all' || goal.status === statusFilter
  ) || [];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-secondary-200 dark:bg-secondary-700 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-secondary-200 dark:bg-secondary-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
            <ChartBarIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-secondary-900 dark:text-white">
              Real-Time Goal Progress
            </h2>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              Live KPI status with color-coded indicators
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeTeamGoals}
              onChange={(e) => setIncludeTeamGoals(e.target.checked)}
              className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-secondary-700 dark:text-secondary-300">Include team goals</span>
          </label>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="On Track"
          count={dashboard?.onTrack || 0}
          total={dashboard?.totalGoals || 0}
          icon={CheckCircleIcon}
          color="text-green-600 dark:text-green-400"
          bgColor="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800"
        />
        <SummaryCard
          title="At Risk"
          count={dashboard?.atRisk || 0}
          total={dashboard?.totalGoals || 0}
          icon={ExclamationTriangleIcon}
          color="text-yellow-600 dark:text-yellow-400"
          bgColor="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800"
        />
        <SummaryCard
          title="Off Track"
          count={dashboard?.offTrack || 0}
          total={dashboard?.totalGoals || 0}
          icon={XCircleIcon}
          color="text-red-600 dark:text-red-400"
          bgColor="bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-secondary-200 dark:border-secondary-700">
        {[
          { key: 'all', label: 'All Goals' },
          { key: 'on_track', label: 'On Track', color: 'text-green-600' },
          { key: 'at_risk', label: 'At Risk', color: 'text-yellow-600' },
          { key: 'off_track', label: 'Off Track', color: 'text-red-600' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key as any)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              statusFilter === tab.key
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300'
            )}
          >
            {tab.label}
            {tab.key !== 'all' && (
              <span className={clsx('ml-2 px-2 py-0.5 rounded-full text-xs', tab.color)}>
                {tab.key === 'on_track' ? dashboard?.onTrack : tab.key === 'at_risk' ? dashboard?.atRisk : dashboard?.offTrack}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      {filteredGoals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FlagIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 dark:text-white">No goals found</h3>
          <p className="text-sm text-secondary-500 dark:text-secondary-400">
            {statusFilter !== 'all'
              ? `No goals with "${statusFilter.replace('_', ' ')}" status`
              : 'Create your first goal to start tracking progress'}
          </p>
        </div>
      )}
    </div>
  );
}

export default GoalProgressDashboard;
