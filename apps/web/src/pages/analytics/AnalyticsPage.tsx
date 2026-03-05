import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  FlagIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { ChartTooltip } from '@/components/ui';

import {
  analyticsApi,
  reviewsApi,
  type DashboardMetrics,
  type PerformanceDistribution,
  type GoalTrend,
  type FeedbackTrend,
  type TeamPerformance,
  type BiasMetric,
  type ReviewCycle,
} from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  AnalyticsFilters,
  ExportToolbar,
  TeamPerformanceChart,
  GoalCompletionTrends,
  FeedbackAnalysisChart,
  PerformanceDistributionChart,
  type FilterState,
} from '@/components/analytics';
import { PageHeader } from '@/components/ui';
import { useChartColors } from '@/hooks/useChartColors';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6']; // semantic rating scale

export function AnalyticsPage() {
  const cc = useChartColors();
  usePageTitle('Analytics');
  const { user } = useAuthStore();
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'goals' | 'feedback' | 'fairness' | 'team'>('overview');
  const [filters, setFilters] = useState<FilterState>({ months: 6, cycleId: '' });

  const isHRAdmin = user?.roles?.includes('HR_ADMIN') || user?.roles?.includes('ADMIN');
  const isManager = user?.roles?.includes('MANAGER') || isHRAdmin;

  const { data: dashboard, isLoading: loadingDashboard, isError: dashboardError } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => analyticsApi.getDashboard(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const { data: distribution } = useQuery({
    queryKey: ['analytics', 'distribution', selectedCycleId],
    queryFn: () => analyticsApi.getPerformanceDistribution(selectedCycleId || undefined),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const { data: goalTrends } = useQuery({
    queryKey: ['analytics', 'goal-trends', filters.months],
    queryFn: () => analyticsApi.getGoalTrends(filters.months),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const { data: feedbackTrends } = useQuery({
    queryKey: ['analytics', 'feedback-trends', filters.months],
    queryFn: () => analyticsApi.getFeedbackTrends(filters.months),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const { data: teamPerformance } = useQuery({
    queryKey: ['analytics', 'team-performance'],
    queryFn: () => analyticsApi.getTeamPerformance(),
    enabled: isHRAdmin,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const { data: biasMetrics } = useQuery({
    queryKey: ['analytics', 'bias-metrics', selectedCycleId],
    queryFn: () => analyticsApi.getBiasMetrics(selectedCycleId || undefined),
    enabled: isHRAdmin,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: cycles } = useQuery({
    queryKey: ['review-cycles'],
    queryFn: () => reviewsApi.listCycles({}),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const handleExport = async (dataType: 'goals' | 'reviews' | 'feedback') => {
    try {
      const csv = await analyticsApi.exportData(dataType);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataType}-export-${Date.now()}.csv`;
      a.click();
      toast.success('Export downloaded');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const renderMetricCard = (
    title: string,
    value: number | string,
    icon: React.ReactNode,
    trend?: { value: number; positive: boolean },
    subtitle?: string
  ) => (
    <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-secondary-500 dark:text-secondary-400">{title}</p>
          <p className="text-xl font-bold text-secondary-900 dark:text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">{icon}</div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-sm">
          {trend.positive ? (
            <ArrowTrendingUpIcon className="h-4 w-4 text-success-500" />
          ) : (
            <ArrowTrendingDownIcon className="h-4 w-4 text-danger-500" />
          )}
          <span className={trend.positive ? 'text-success-600' : 'text-danger-600'}>
            {trend.value}%
          </span>
          <span className="text-secondary-500">vs last period</span>
        </div>
      )}
    </div>
  );

  const renderOverview = () => {
    if (loadingDashboard) {
      return (
        <div className="flex justify-center py-12">
          <div className="glass-spinner" />
        </div>
      );
    }

    if (dashboardError || !dashboard) {
      return (
        <div className="text-center py-12">
          <ChartBarIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
          <h3 className="mt-2 text-lg font-medium text-secondary-900 dark:text-white">No Analytics Data Yet</h3>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Analytics will populate as employees create goals, complete reviews, and provide feedback.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Key metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderMetricCard(
            'Total Goals',
            dashboard.goals.total,
            <FlagIcon className="h-6 w-6 text-primary-600" />,
            undefined,
            `${dashboard.goals.completed} completed`
          )}
          {renderMetricCard(
            'Average Goal Progress',
            `${dashboard.goals.avgProgress}%`,
            <ChartBarIcon className="h-6 w-6 text-primary-600" />,
            undefined,
            `${dashboard.goals.onTrack} on track`
          )}
          {renderMetricCard(
            'Review Completion',
            `${dashboard.reviews.completionRate}%`,
            <DocumentTextIcon className="h-6 w-6 text-primary-600" />,
            undefined,
            `${dashboard.reviews.pendingReviews} pending`
          )}
          {renderMetricCard(
            'Feedback Given',
            dashboard.feedback.total,
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-primary-600" />,
            undefined,
            `${dashboard.feedback.praiseCount} praise`
          )}
        </div>

        {/* Goal status breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <h3 className="text-lg font-bold text-secondary-900 dark:text-white mb-4">Goal Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-success-500" />
                  <span className="text-sm text-secondary-700 dark:text-secondary-300">On Track</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium dark:text-white">{dashboard.goals.onTrack}</span>
                  <div className="w-24 bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-success-500"
                      style={{
                        width: `${dashboard.goals.total > 0 ? (dashboard.goals.onTrack / dashboard.goals.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-warning-500" />
                  <span className="text-sm text-secondary-700 dark:text-secondary-300">At Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium dark:text-white">{dashboard.goals.atRisk}</span>
                  <div className="w-24 bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-warning-500"
                      style={{
                        width: `${dashboard.goals.total > 0 ? (dashboard.goals.atRisk / dashboard.goals.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-danger-500" />
                  <span className="text-sm text-secondary-700 dark:text-secondary-300">Overdue</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium dark:text-white">{dashboard.goals.overdue}</span>
                  <div className="w-24 bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-danger-500"
                      style={{
                        width: `${dashboard.goals.total > 0 ? (dashboard.goals.overdue / dashboard.goals.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <h3 className="text-lg font-bold text-secondary-900 dark:text-white mb-4">Reviews Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600 dark:text-secondary-400">Active Cycles</span>
                <span className="text-lg font-bold dark:text-white">{dashboard.reviews.activeCycles}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600 dark:text-secondary-400">Average Rating</span>
                <span className="text-lg font-bold text-primary-600 dark:text-primary-400">{dashboard.reviews.avgRating}/5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600 dark:text-secondary-400">Submitted</span>
                <span className="text-lg font-bold text-success-600 dark:text-success-400">{dashboard.reviews.submittedReviews}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600 dark:text-secondary-400">Pending</span>
                <span className="text-lg font-bold text-warning-600 dark:text-warning-400">{dashboard.reviews.pendingReviews}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Team metrics (for managers) */}
        {isManager && dashboard.team.totalEmployees > 0 && (
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">Team Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-secondary-900 dark:text-white">{dashboard.team.totalEmployees}</div>
                <div className="text-sm text-secondary-500 dark:text-secondary-400">Total Employees</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-success-600 dark:text-success-400">{dashboard.team.activeEmployees}</div>
                <div className="text-sm text-secondary-500 dark:text-secondary-400">Active</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-primary-600 dark:text-primary-400">{dashboard.team.avgGoalsPerEmployee}</div>
                <div className="text-sm text-secondary-500 dark:text-secondary-400">Average Goals/Employee</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPerformance = () => (
    <div className="space-y-4">
      {/* Cycle selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-secondary-600 dark:text-secondary-400">Review Cycle:</label>
        <select
          value={selectedCycleId}
          onChange={(e) => setSelectedCycleId(e.target.value)}
          className="input w-64"
        >
          <option value="">All Cycles</option>
          {cycles?.map((cycle: ReviewCycle) => (
            <option key={cycle.id} value={cycle.id}>
              {cycle.name}
            </option>
          ))}
        </select>
      </div>

      {/* Rating distribution */}
      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <h3 className="text-lg font-bold text-secondary-900 dark:text-white mb-4">Performance Rating Distribution</h3>
        {distribution && distribution.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-secondary-300 dark:stroke-secondary-500" strokeOpacity={0.5} />
                <XAxis dataKey="rating" tickFormatter={(v) => `${v} Star`} tick={{ fontWeight: 600 }} className="fill-secondary-500 dark:fill-secondary-300" />
                <YAxis tick={{ fontWeight: 600 }} className="fill-secondary-500 dark:fill-secondary-300" />
                <Tooltip isAnimationActive={false} cursor={{ fill: cc.cursorFill }} formatter={(value) => [`${value} employees`, 'Count']} />
                <Bar dataKey="count" fill={cc.primary} strokeWidth={2}>
                  {distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} stroke={COLORS[index]} strokeWidth={2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-secondary-500 dark:text-secondary-400 text-center py-8">No performance data available.</p>
        )}
      </div>

      {/* Department comparison (HR admin only) */}
      {isHRAdmin && teamPerformance && teamPerformance.length > 0 && (
        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
          <h3 className="text-lg font-bold text-secondary-900 dark:text-white mb-4">Team Performance Comparison</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-100/60 dark:divide-white/[0.04]">
              <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400">Department</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">Employees</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">Average Goal Progress</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">Average Rating</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">Feedback</th>
                </tr>
              </thead>
              <tbody className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl divide-y divide-secondary-100/60 dark:divide-white/[0.04]">
                {teamPerformance.map((team: TeamPerformance) => (
                  <tr key={team.departmentId} className="hover:bg-primary-50/30 dark:hover:bg-white/[0.03]/50">
                    <td className="px-6 py-4 font-medium text-secondary-900 dark:text-white">{team.departmentName}</td>
                    <td className="px-6 py-4 text-center dark:text-secondary-300">{team.employeeCount}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-primary-500"
                            style={{ width: `${team.avgGoalProgress}%` }}
                          />
                        </div>
                        <span className="text-sm dark:text-secondary-300">{team.avgGoalProgress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-primary-600 dark:text-primary-400">{team.avgRating}</td>
                    <td className="px-6 py-4 text-center dark:text-secondary-300">{team.feedbackCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderGoalsTrends = () => (
    <div className="space-y-4">
      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <h3 className="text-lg font-bold text-secondary-900 dark:text-white mb-4">Goal Completion Trends (Last 6 Months)</h3>
        {goalTrends && goalTrends.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={goalTrends}>
                <defs>
                  <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={cc.primary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={cc.primary} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={cc.semantic.success} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={cc.semantic.success} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-secondary-300 dark:stroke-secondary-500" strokeOpacity={0.5} />
                <XAxis dataKey="month" className="fill-secondary-500 dark:fill-secondary-300" tick={{ fontWeight: 600 }} />
                <YAxis className="fill-secondary-500 dark:fill-secondary-300" tick={{ fontWeight: 600 }} />
                <Tooltip isAnimationActive={false} content={<ChartTooltip />} cursor={{ fill: cc.cursorFill }} />
                <Legend />
                <Area type="monotone" dataKey="created" stroke={cc.primary} name="Created" strokeWidth={3} fill="url(#gradCreated)" />
                <Area type="monotone" dataKey="completed" stroke={cc.semantic.success} name="Completed" strokeWidth={3} fill="url(#gradCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-secondary-500 dark:text-secondary-400 text-center py-8">No goal trends data available.</p>
        )}
      </div>

      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <h3 className="text-lg font-bold text-secondary-900 dark:text-white mb-4">Goal Completion Rate</h3>
        {goalTrends && goalTrends.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={goalTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-secondary-300 dark:stroke-secondary-500" strokeOpacity={0.5} />
                <XAxis dataKey="month" className="fill-secondary-500 dark:fill-secondary-300" tick={{ fontWeight: 600 }} />
                <YAxis unit="%" className="fill-secondary-500 dark:fill-secondary-300" tick={{ fontWeight: 600 }} />
                <Tooltip isAnimationActive={false} cursor={{ fill: cc.cursorFill }} formatter={(value) => [`${value}%`, 'Completion Rate']} />
                <Bar dataKey="completionRate" fill="#22c55e" name="Completion Rate" stroke={cc.semantic.success} strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-secondary-500 dark:text-secondary-400 text-center py-8">No data available.</p>
        )}
      </div>
    </div>
  );

  const renderFeedbackTrends = () => {
    const totalPraise = feedbackTrends?.reduce((a, t) => a + t.praise, 0) ?? 0;
    const totalConstructive = feedbackTrends?.reduce((a, t) => a + t.constructive, 0) ?? 0;
    const totalFeedback = totalPraise + totalConstructive;
    const praisePercent = totalFeedback > 0 ? Math.round((totalPraise / totalFeedback) * 100) : 0;
    const constructivePercent = 100 - praisePercent;

    const barData = (feedbackTrends ?? []).map(t => ({
      month: t.month,
      Praise: t.praise,
      Constructive: t.constructive,
    }));

    const pieData = [
      { name: 'Praise', value: totalPraise },
      { name: 'Constructive', value: totalConstructive },
    ];

    return (
      <div className="space-y-4">
        {/* Feedback Trends Area Chart — full width */}
        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
          <h3 className="text-lg font-bold text-secondary-900 dark:text-white mb-4">Feedback Trends (Last 6 Months)</h3>
          {feedbackTrends && feedbackTrends.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={feedbackTrends}>
                  <defs>
                    <linearGradient id="gradPraise" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={cc.semantic.success} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={cc.semantic.success} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gradConstructive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={cc.feedbackColors[1]} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={cc.feedbackColors[1]} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={cc.primary} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={cc.primary} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-secondary-300 dark:stroke-secondary-500" strokeOpacity={0.5} />
                  <XAxis dataKey="month" className="fill-secondary-500 dark:fill-secondary-300" tick={{ fontWeight: 600 }} />
                  <YAxis className="fill-secondary-500 dark:fill-secondary-300" tick={{ fontWeight: 600 }} />
                  <Tooltip isAnimationActive={false} content={<ChartTooltip />} cursor={{ fill: cc.cursorFill }} />
                  <Legend />
                  <Area type="monotone" dataKey="praise" stroke={cc.semantic.success} name="Praise" strokeWidth={3} fill="url(#gradPraise)" />
                  <Area type="monotone" dataKey="constructive" stroke={cc.feedbackColors[1]} name="Constructive" strokeWidth={3} fill="url(#gradConstructive)" />
                  <Area type="monotone" dataKey="total" stroke={cc.primary} name="Total" strokeWidth={3} fill="url(#gradTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-secondary-500 dark:text-secondary-400 text-center py-8">No feedback trends data available.</p>
          )}
        </div>

        {/* Bottom row — Donut with center stats + Monthly Stacked Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left: Feedback Ratio donut with center stats */}
          <div className="lg:col-span-2 card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <h3 className="text-lg font-bold text-secondary-900 dark:text-white mb-1">Feedback Ratio</h3>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-3">Praise vs constructive split</p>
            {totalFeedback > 0 ? (
              <>
                <div className="relative" style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <linearGradient id="gradPieGreen" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={cc.semantic.success} />
                          <stop offset="100%" stopColor={cc.feedbackColors[0]} />
                        </linearGradient>
                        <linearGradient id="gradPieOrange" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={cc.feedbackColors[1]} />
                          <stop offset="100%" stopColor={cc.semantic.warning} />
                        </linearGradient>
                      </defs>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius="52%"
                        outerRadius="88%"
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                        cornerRadius={6}
                      >
                        <Cell fill="url(#gradPieGreen)" />
                        <Cell fill="url(#gradPieOrange)" />
                      </Pie>
                      <Tooltip isAnimationActive={false} content={<ChartTooltip />} cursor={{ fill: cc.cursorFill }} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center overlay stats */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-extrabold text-secondary-900 dark:text-white leading-none">{totalFeedback}</span>
                    <span className="text-2xs text-secondary-500 dark:text-secondary-400 mt-0.5">Total</span>
                  </div>
                </div>
                {/* Legend pills */}
                <div className="flex items-center justify-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-xs font-semibold text-secondary-700 dark:text-secondary-300">
                      {totalPraise} <span className="text-green-600 dark:text-green-400">({praisePercent}%)</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-xs font-semibold text-secondary-700 dark:text-secondary-300">
                      {totalConstructive} <span className="text-orange-600 dark:text-orange-400">({constructivePercent}%)</span>
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-secondary-500 dark:text-secondary-400 text-center py-8">No data available.</p>
            )}
          </div>

          {/* Right: Monthly Stacked Bar Chart */}
          <div className="lg:col-span-3 card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <h3 className="text-lg font-bold text-secondary-900 dark:text-white mb-1">Monthly Breakdown</h3>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-3">Feedback volume by month</p>
            {barData.length > 0 ? (
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                    <defs>
                      <linearGradient id="gradBarPraise" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={cc.semantic.success} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={cc.feedbackColors[0]} stopOpacity={0.7} />
                      </linearGradient>
                      <linearGradient id="gradBarConstr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={cc.feedbackColors[1]} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={cc.semantic.warning} stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-secondary-300, #cbd5e1)" strokeOpacity={0.4} vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fontWeight: 600, fill: 'var(--color-secondary-500, #64748b)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fontWeight: 600, fill: 'var(--color-secondary-500, #64748b)' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip isAnimationActive={false} content={<ChartTooltip />} cursor={{ fill: cc.cursorFill }} />
                    <Legend
                      wrapperStyle={{  fontSize: '11px', fontWeight: 600 }}
                      formatter={(value: string) => <span className="text-secondary-600 dark:text-secondary-400">{value}</span>}
                    />
                    <Bar dataKey="Praise" stackId="fb" fill="url(#gradBarPraise)" radius={[0, 0, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="Constructive" stackId="fb" fill="url(#gradBarConstr)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-secondary-500 dark:text-secondary-400 text-center py-8">No data available.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderFairness = () => {
    if (!isHRAdmin) {
      return (
        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700 text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
          <p className="mt-2 text-secondary-600 dark:text-secondary-400">
            Fairness metrics are only available to HR administrators.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="card card-body bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800">
          <h3 className="font-medium text-primary-900 dark:text-primary-100">About Fairness Analytics</h3>
          <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
            These metrics help identify potential bias in performance ratings. High variance or significant
            differences between groups may indicate areas that need attention. Data is only shown for
            groups with 5+ members to protect privacy.
          </p>
        </div>

        {biasMetrics && biasMetrics.length > 0 ? (
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Rating Analysis by Dimension</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-100/60 dark:divide-white/[0.04]">
                <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400">Dimension</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400">Category</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">Count</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">Average Rating</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">Variance</th>
                  </tr>
                </thead>
                <tbody className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl divide-y divide-secondary-100/60 dark:divide-white/[0.04]">
                  {biasMetrics.map((metric: BiasMetric, index: number) => (
                    <tr key={index} className="hover:bg-primary-50/30 dark:hover:bg-white/[0.03]/50">
                      <td className="px-6 py-4 text-sm text-secondary-500 dark:text-secondary-400">{metric.dimension}</td>
                      <td className="px-6 py-4 font-medium text-secondary-900 dark:text-white">{metric.category}</td>
                      <td className="px-6 py-4 text-center dark:text-secondary-300">{metric.count}</td>
                      <td className="px-6 py-4 text-center font-bold text-primary-600 dark:text-primary-400">{metric.avgRating}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={clsx(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            metric.variance > 1 ? 'bg-warning-100 text-warning-800 dark:bg-warning-900/40 dark:text-warning-300' : 'bg-success-100 text-success-800 dark:bg-success-900/40 dark:text-success-300'
                          )}
                        >
                          {metric.variance}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700 text-center py-12">
            <p className="text-secondary-500 dark:text-secondary-400">Not enough data to show fairness metrics.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader title="Analytics" subtitle="Insights into performance, goals, and feedback">
        {isHRAdmin && <ExportToolbar />}
      </PageHeader>

      {/* Filters */}
      <AnalyticsFilters
        filters={filters}
        onChange={setFilters}
        cycles={cycles}
      />

      {/* Tabs */}
      <div className="border-b border-secondary-200/60 dark:border-white/[0.06]">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'performance', label: 'Performance' },
            { key: 'goals', label: 'Goals' },
            { key: 'feedback', label: 'Feedback' },
            ...(isManager ? [{ key: 'team', label: 'Team' }] : []),
            ...(isHRAdmin ? [{ key: 'fairness', label: 'Fairness' }] : []),
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={clsx(
                'py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'performance' && renderPerformance()}
      {activeTab === 'goals' && renderGoalsTrends()}
      {activeTab === 'feedback' && renderFeedbackTrends()}
      {activeTab === 'team' && isManager && (
        <div className="space-y-4">
          <TeamPerformanceChart managerId={user?.id} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GoalCompletionTrends months={filters.months} />
            <PerformanceDistributionChart cycleId={filters.cycleId || undefined} />
          </div>
        </div>
      )}
      {activeTab === 'fairness' && renderFairness()}
    </div>
  );
}
