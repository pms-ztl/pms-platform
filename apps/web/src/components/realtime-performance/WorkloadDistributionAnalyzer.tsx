/**
 * Feature 5: Live Workload Distribution Analyzer
 *
 * Real-time workload balance monitor with redistribution recommendations
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ScaleIcon,
  UserGroupIcon,
  ArrowsRightLeftIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import clsx from 'clsx';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface WorkloadAnalysis {
  userId: string;
  name?: string;
  workloadScore: number;
  balanceStatus: 'underloaded' | 'optimal' | 'heavy' | 'overloaded';
  activeGoals: number;
  activeTasks: number;
  pendingReviews: number;
  estimatedHoursRequired: number;
  availableHours: number;
  capacityUtilization: number;
  redistributionRecommended: boolean;
  recommendedActions: string[];
}

interface TeamWorkloadData {
  teamMembers: WorkloadAnalysis[];
  teamMetrics: {
    avgWorkloadScore: number;
    workloadVariance: number;
    giniCoefficient: number;
    overloadedCount: number;
    optimalCount: number;
    underloadedCount: number;
  };
  redistributionOpportunities: Array<{
    from: { userId: string; name: string };
    to: { userId: string; name: string };
    potentialTransfer: number;
    impact: string;
  }>;
}

const api = {
  getWorkload: async (): Promise<WorkloadAnalysis> => {
    const res = await fetchWithAuth('/api/v1/realtime-performance/workload');
    const data = await res.json();
    return data.data;
  },
  getTeamWorkload: async (): Promise<TeamWorkloadData> => {
    const res = await fetchWithAuth('/api/v1/realtime-performance/workload/team');
    const data = await res.json();
    return data.data;
  },
};

const statusConfig = {
  underloaded: {
    color: 'blue',
    label: 'Underloaded',
    description: 'Has capacity for more work',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  optimal: {
    color: 'green',
    label: 'Optimal',
    description: 'Well balanced workload',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  heavy: {
    color: 'yellow',
    label: 'Heavy',
    description: 'High but manageable',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
  },
  overloaded: {
    color: 'red',
    label: 'Overloaded',
    description: 'Needs redistribution',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-600 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800',
  },
};

const WorkloadGauge = ({ score, status }: { score: number; status: string }) => {
  const config = statusConfig[status as keyof typeof statusConfig];

  return (
    <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
        <circle
          cx="64"
          cy="64"
          r="56"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-secondary-200 dark:text-secondary-700"
        />
        <circle
          cx="64"
          cy="64"
          r="56"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeDasharray={`${score * 3.52} 352`}
          className={config.textColor}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-secondary-900 dark:text-white">{Math.round(score)}</span>
        <span className={clsx('text-xs font-medium', config.textColor)}>{config.label}</span>
      </div>
    </div>
  );
};

const WorkloadCard = ({ data }: { data: WorkloadAnalysis }) => {
  const config = statusConfig[data.balanceStatus];

  return (
    <div className={clsx('rounded-xl border p-4', config.bgColor, config.borderColor)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-secondary-300 dark:bg-secondary-600 flex items-center justify-center">
            <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
              {data.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-secondary-900 dark:text-white">
              {data.name || 'User'}
            </h4>
            <span className={clsx('text-xs', config.textColor)}>{config.description}</span>
          </div>
        </div>
        <div className={clsx('text-2xl font-bold', config.textColor)}>
          {Math.round(data.workloadScore)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-semibold text-secondary-900 dark:text-white">{data.activeGoals}</div>
          <div className="text-xs text-secondary-500 dark:text-secondary-400">Goals</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-secondary-900 dark:text-white">{data.pendingReviews}</div>
          <div className="text-xs text-secondary-500 dark:text-secondary-400">Reviews</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-secondary-900 dark:text-white">
            {Math.round(data.capacityUtilization)}%
          </div>
          <div className="text-xs text-secondary-500 dark:text-secondary-400">Capacity</div>
        </div>
      </div>
    </div>
  );
};

const RedistributionCard = ({
  opportunity,
}: {
  opportunity: TeamWorkloadData['redistributionOpportunities'][0];
}) => (
  <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
    <div className="flex items-center space-x-4">
      <div className="flex-1">
        <div className="text-sm font-medium text-secondary-900 dark:text-white">{opportunity.from.name}</div>
        <div className="text-xs text-red-500">Overloaded</div>
      </div>
      <ArrowRightIcon className="h-5 w-5 text-secondary-400" />
      <div className="flex-1">
        <div className="text-sm font-medium text-secondary-900 dark:text-white">{opportunity.to.name}</div>
        <div className="text-xs text-blue-500">Underloaded</div>
      </div>
    </div>
    <div className="mt-3 text-xs text-secondary-500 dark:text-secondary-400">
      <LightBulbIcon className="h-4 w-4 inline mr-1 text-yellow-500" />
      {opportunity.impact}
    </div>
  </div>
);

export function WorkloadDistributionAnalyzer() {
  const [viewMode, setViewMode] = useState<'personal' | 'team'>('personal');

  const { data: personalWorkload, isLoading: loadingPersonal } = useQuery({
    queryKey: ['personalWorkload'],
    queryFn: api.getWorkload,
    enabled: viewMode === 'personal',
  });

  const { data: teamWorkload, isLoading: loadingTeam } = useQuery({
    queryKey: ['teamWorkload'],
    queryFn: api.getTeamWorkload,
    enabled: viewMode === 'team',
  });

  const isLoading = viewMode === 'personal' ? loadingPersonal : loadingTeam;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3" />
        <div className="h-64 bg-secondary-200 dark:bg-secondary-700 rounded-xl" />
      </div>
    );
  }

  const chartData = teamWorkload?.teamMembers?.map((m) => ({
    name: m.name?.split(' ')[0] || 'User',
    workload: m.workloadScore,
    status: m.balanceStatus,
  })) || [];

  const pieData = [
    { name: 'Optimal', value: teamWorkload?.teamMetrics.optimalCount || 0, color: '#10b981' },
    { name: 'Overloaded', value: teamWorkload?.teamMetrics.overloadedCount || 0, color: '#ef4444' },
    { name: 'Underloaded', value: teamWorkload?.teamMetrics.underloadedCount || 0, color: '#3b82f6' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg">
            <ScaleIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-secondary-900 dark:text-white">
              Workload Distribution
            </h2>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              Real-time workload balance analysis
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('personal')}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              viewMode === 'personal'
                ? 'bg-white dark:bg-secondary-700 shadow text-secondary-900 dark:text-white'
                : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900'
            )}
          >
            My Workload
          </button>
          <button
            onClick={() => setViewMode('team')}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              viewMode === 'team'
                ? 'bg-white dark:bg-secondary-700 shadow text-secondary-900 dark:text-white'
                : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900'
            )}
          >
            <UserGroupIcon className="h-4 w-4 inline mr-1" />
            Team View
          </button>
        </div>
      </div>

      {viewMode === 'personal' && personalWorkload && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workload Gauge */}
          <div className="lg:col-span-1 bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6 flex flex-col items-center">
            <h3 className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-4">
              Current Workload
            </h3>
            <WorkloadGauge score={personalWorkload.workloadScore} status={personalWorkload.balanceStatus} />
            <div className="mt-4 text-center">
              <p className="text-sm text-secondary-600 dark:text-secondary-300">
                {statusConfig[personalWorkload.balanceStatus].description}
              </p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="lg:col-span-2 bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Workload Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg">
                <div className="text-2xl font-bold text-secondary-900 dark:text-white">
                  {personalWorkload.activeGoals}
                </div>
                <div className="text-xs text-secondary-500">Active Goals</div>
              </div>
              <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg">
                <div className="text-2xl font-bold text-secondary-900 dark:text-white">
                  {personalWorkload.pendingReviews}
                </div>
                <div className="text-xs text-secondary-500">Pending Reviews</div>
              </div>
              <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg">
                <div className="text-2xl font-bold text-secondary-900 dark:text-white">
                  {Math.round(personalWorkload.estimatedHoursRequired)}h
                </div>
                <div className="text-xs text-secondary-500">Estimated Hours</div>
              </div>
              <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg">
                <div className="text-2xl font-bold text-secondary-900 dark:text-white">
                  {Math.round(personalWorkload.capacityUtilization)}%
                </div>
                <div className="text-xs text-secondary-500">Utilization</div>
              </div>
            </div>

            {/* Recommendations */}
            {personalWorkload.recommendedActions.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                  Recommendations
                </h4>
                <ul className="space-y-2">
                  {personalWorkload.recommendedActions.map((action, idx) => (
                    <li key={idx} className="flex items-start space-x-2 text-sm text-secondary-600 dark:text-secondary-400">
                      <LightBulbIcon className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'team' && teamWorkload && (
        <div className="space-y-6">
          {/* Team Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
              <div className="text-sm text-secondary-500 dark:text-secondary-400">Average Workload</div>
              <div className="text-2xl font-bold text-secondary-900 dark:text-white">
                {Math.round(teamWorkload.teamMetrics.avgWorkloadScore)}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4">
              <div className="text-sm text-green-600 dark:text-green-400">Optimal</div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {teamWorkload.teamMetrics.optimalCount}
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4">
              <div className="text-sm text-red-600 dark:text-red-400">Overloaded</div>
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                {teamWorkload.teamMetrics.overloadedCount}
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
              <div className="text-sm text-blue-600 dark:text-blue-400">Underloaded</div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {teamWorkload.teamMetrics.underloadedCount}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                Team Workload Scores
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-secondary-200 dark:stroke-secondary-700" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} />
                    <Bar dataKey="workload" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.status === 'overloaded'
                              ? '#ef4444'
                              : entry.status === 'optimal'
                                ? '#10b981'
                                : entry.status === 'heavy'
                                  ? '#f59e0b'
                                  : '#3b82f6'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs text-secondary-600 dark:text-secondary-400">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Team Members</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamWorkload.teamMembers.map((member) => (
                <WorkloadCard key={member.userId} data={member} />
              ))}
            </div>
          </div>

          {/* Redistribution Opportunities */}
          {teamWorkload.redistributionOpportunities.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <ArrowsRightLeftIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                  Redistribution Opportunities
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teamWorkload.redistributionOpportunities.map((opp, idx) => (
                  <RedistributionCard key={idx} opportunity={opp} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WorkloadDistributionAnalyzer;
