import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  UsersIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { useAuthStore } from '@/store/auth';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  performanceMathApi,
  engagementApi,
  healthApi,
  analyticsApi,
  usersApi,
} from '@/lib/api';
import type { TeamAnalyticsResult, GoalTrend, FeedbackTrend, OrganizationalHealth, AtRiskEmployee } from '@/lib/api';

import { PerformanceDistribution, TeamHealthGauge, MemberScorecard } from '@/components/team-insights';

// ── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ForwardRefExoticComponent<any>;
  color: string;
  bgColor: string;
  subtitle?: string;
}

function StatCard({ label, value, icon: Icon, color, bgColor, subtitle }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-4">
      <div className="flex items-center gap-3">
        <div className={clsx('p-2 rounded-lg', bgColor)}>
          <Icon className={clsx('h-5 w-5', color)} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-secondary-500 dark:text-secondary-400 font-medium">{label}</p>
          <p className="text-xl font-bold text-secondary-900 dark:text-white break-words">{value}</p>
          {subtitle && <p className="text-2xs text-secondary-400 dark:text-secondary-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton Loader ──────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 h-20">
            <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-16 mb-2" />
            <div className="h-6 bg-secondary-200 dark:bg-secondary-700 rounded w-12" />
          </div>
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6 h-80">
            <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-40 mb-4" />
            <div className="h-56 bg-secondary-100 dark:bg-secondary-700/50 rounded-lg" />
          </div>
        ))}
      </div>
      {/* Table */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6 h-64">
        <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-32 mb-6" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 bg-secondary-100 dark:bg-secondary-700/50 rounded mb-2" />
        ))}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function TeamInsightsPage() {
  usePageTitle('Team Insights');
  const { user } = useAuthStore();

  // ── Data Queries ─────────────────────────────────────────────────────────

  const { data: teamAnalytics, isLoading: loadingTeam, isError: errorTeam } = useQuery({
    queryKey: ['team-analytics', user?.id],
    queryFn: () => performanceMathApi.getTeamAnalytics(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: atRiskData, isLoading: loadingAtRisk } = useQuery({
    queryKey: ['at-risk-employees'],
    queryFn: () => engagementApi.getAtRisk({ limit: 50 }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const atRiskEmployees = Array.isArray(atRiskData) ? atRiskData : (atRiskData?.employees ?? []);

  const { data: healthData, isLoading: loadingHealth } = useQuery({
    queryKey: ['health-latest'],
    queryFn: () => healthApi.getLatest(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: goalTrends = [], isLoading: loadingGoals } = useQuery({
    queryKey: ['goal-trends', 6],
    queryFn: () => analyticsApi.getGoalTrends(6),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: feedbackTrends = [], isLoading: loadingFeedback } = useQuery({
    queryKey: ['feedback-trends', 6],
    queryFn: () => analyticsApi.getFeedbackTrends(6),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: directReports = [] } = useQuery({
    queryKey: ['my-reports'],
    queryFn: () => usersApi.getMyReports(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // ── Computed Values ──────────────────────────────────────────────────────

  const isLoading = loadingTeam || loadingAtRisk || loadingHealth || loadingGoals || loadingFeedback;

  const teamMembers = useMemo(() => {
    return teamAnalytics?.memberZScores ?? [];
  }, [teamAnalytics]);

  const teamFlightRisk = useMemo(() => {
    if (!teamAnalytics || !atRiskEmployees.length) return 0;
    const teamIds = new Set(teamMembers.map((m) => m.userId));
    return atRiskEmployees.filter((e) => teamIds.has(e.userId) && e.riskLevel === 'HIGH').length;
  }, [teamAnalytics, atRiskEmployees, teamMembers]);

  const velocityLabel = useMemo(() => {
    if (!teamAnalytics) return '-';
    const v = Number(teamAnalytics.velocityTrend ?? 0);
    if (v > 0.05) return `+${(v * 100).toFixed(1)}%`;
    if (v < -0.05) return `${(v * 100).toFixed(1)}%`;
    return 'Stable';
  }, [teamAnalytics]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Team Insights</h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">Loading team analytics...</p>
        </div>
        <PageSkeleton />
      </div>
    );
  }

  if (errorTeam && !teamAnalytics) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Team Insights</h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">Performance distribution, health metrics, and team analytics</p>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-amber-400 mb-4" />
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Unable to load team analytics</h2>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">Team data is not available right now. You may not have direct reports assigned, or the data hasn&apos;t been generated yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Team Insights</h1>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
          Performance distribution, health metrics, and team analytics for your direct reports
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Team Size"
          value={teamAnalytics?.teamSize ?? directReports.length}
          icon={UsersIcon}
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-50 dark:bg-blue-900/30"
          subtitle="Direct reports"
        />
        <StatCard
          label="Average Score"
          value={teamAnalytics?.avgScore != null ? Number(teamAnalytics.avgScore).toFixed(1) : '-'}
          icon={ChartBarIcon}
          color="text-emerald-600 dark:text-emerald-400"
          bgColor="bg-emerald-50 dark:bg-emerald-900/30"
          subtitle="Team average"
        />
        <StatCard
          label="Score Spread"
          value={teamAnalytics?.scoreSpread != null ? Number(teamAnalytics.scoreSpread).toFixed(2) : '-'}
          icon={ArrowsPointingOutIcon}
          color="text-purple-600 dark:text-purple-400"
          bgColor="bg-purple-50 dark:bg-purple-900/30"
          subtitle="Std deviation"
        />
        <StatCard
          label="Velocity"
          value={velocityLabel}
          icon={ArrowTrendingUpIcon}
          color="text-indigo-600 dark:text-indigo-400"
          bgColor="bg-indigo-50 dark:bg-indigo-900/30"
          subtitle="Performance trend"
        />
        <StatCard
          label="Flight Risk"
          value={teamFlightRisk}
          icon={ExclamationTriangleIcon}
          color={teamFlightRisk > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}
          bgColor={teamFlightRisk > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-green-50 dark:bg-green-900/30'}
          subtitle="High risk members"
        />
        <StatCard
          label="Predicted Average"
          value={teamAnalytics?.predictedNextAvg != null ? Number(teamAnalytics.predictedNextAvg).toFixed(1) : '-'}
          icon={SparklesIcon}
          color="text-amber-600 dark:text-amber-400"
          bgColor="bg-amber-50 dark:bg-amber-900/30"
          subtitle="Next period forecast"
        />
      </div>

      {/* Charts Grid (2x2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Distribution */}
        <PerformanceDistribution members={teamMembers} />

        {/* Goal Completion Trends */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Goal Completion Trends</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">6-month created vs completed goals</p>
          {goalTrends.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={goalTrends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="goalCreatedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="goalCompletedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-secondary-200 dark:stroke-secondary-700" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-slate-900/80 backdrop-blur-xl shadow-2xl rounded-xl px-3 py-2 border border-white/10 text-xs space-y-1">
                          <p className="font-semibold text-white">{label}</p>
                          {payload.map((p) => (
                            <p key={p.name} style={{ color: p.color }}>
                              {p.name}: {p.value}
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="created"
                    name="Created"
                    stroke="#3b82f6"
                    fill="url(#goalCreatedGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="#22c55e"
                    fill="url(#goalCompletedGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-secondary-400 text-center py-16">No goal trend data available.</p>
          )}
        </div>

        {/* Feedback Activity Trends */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Feedback Activity</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">6-month praise vs constructive feedback</p>
          {feedbackTrends.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={feedbackTrends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="praiseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="constructiveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-secondary-200 dark:stroke-secondary-700" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-slate-900/80 backdrop-blur-xl shadow-2xl rounded-xl px-3 py-2 border border-white/10 text-xs space-y-1">
                          <p className="font-semibold text-white">{label}</p>
                          {payload.map((p) => (
                            <p key={p.name} style={{ color: p.color }}>
                              {p.name}: {p.value}
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="praise"
                    name="Praise"
                    stroke="#10b981"
                    fill="url(#praiseGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="constructive"
                    name="Constructive"
                    stroke="#f59e0b"
                    fill="url(#constructiveGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-secondary-400 text-center py-16">No feedback trend data available.</p>
          )}
        </div>

        {/* Team Health Gauge */}
        <TeamHealthGauge
          score={healthData?.overallHealthScore ?? 0}
          flightRiskCount={healthData?.flightRiskCount ?? 0}
          turnoverRate={healthData?.turnoverRate ?? 0}
          retentionRate={healthData?.retentionRate ?? 0}
        />
      </div>

      {/* Member Scorecard Table */}
      <MemberScorecard
        members={teamMembers}
        atRiskEmployees={atRiskEmployees}
      />
    </div>
  );
}
