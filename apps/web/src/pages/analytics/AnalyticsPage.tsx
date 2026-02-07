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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import clsx from 'clsx';
import toast from 'react-hot-toast';

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

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

export function AnalyticsPage() {
  const { user } = useAuthStore();
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'goals' | 'feedback' | 'fairness'>('overview');

  const isHRAdmin = user?.roles?.includes('HR_ADMIN') || user?.roles?.includes('ADMIN');
  const isManager = user?.roles?.includes('MANAGER') || isHRAdmin;

  const { data: dashboard, isLoading: loadingDashboard } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => analyticsApi.getDashboard(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: distribution } = useQuery({
    queryKey: ['analytics', 'distribution', selectedCycleId],
    queryFn: () => analyticsApi.getPerformanceDistribution(selectedCycleId || undefined),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: goalTrends } = useQuery({
    queryKey: ['analytics', 'goal-trends'],
    queryFn: () => analyticsApi.getGoalTrends(6),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: feedbackTrends } = useQuery({
    queryKey: ['analytics', 'feedback-trends'],
    queryFn: () => analyticsApi.getFeedbackTrends(6),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: teamPerformance } = useQuery({
    queryKey: ['analytics', 'team-performance'],
    queryFn: () => analyticsApi.getTeamPerformance(),
    enabled: isHRAdmin,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
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
          <p className="text-2xl font-bold text-secondary-900 dark:text-white mt-1">{value}</p>
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
    if (loadingDashboard || !dashboard) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
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
            'Avg Goal Progress',
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Goal Status</h3>
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
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Reviews Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600 dark:text-secondary-400">Active Cycles</span>
                <span className="text-lg font-bold dark:text-white">{dashboard.reviews.activeCycles}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600 dark:text-secondary-400">Avg Rating</span>
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
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Team Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary-900 dark:text-white">{dashboard.team.totalEmployees}</div>
                <div className="text-sm text-secondary-500 dark:text-secondary-400">Total Employees</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-success-600 dark:text-success-400">{dashboard.team.activeEmployees}</div>
                <div className="text-sm text-secondary-500 dark:text-secondary-400">Active</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{dashboard.team.avgGoalsPerEmployee}</div>
                <div className="text-sm text-secondary-500 dark:text-secondary-400">Avg Goals/Employee</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPerformance = () => (
    <div className="space-y-6">
      {/* Cycle selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-secondary-600 dark:text-secondary-400">Review Cycle:</label>
        <select
          value={selectedCycleId}
          onChange={(e) => setSelectedCycleId(e.target.value)}
          className="input w-64 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
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
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Performance Rating Distribution</h3>
        {distribution && distribution.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" tickFormatter={(v) => `${v} Star`} />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} employees`, 'Count']} />
                <Bar dataKey="count" fill="#3b82f6">
                  {distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
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
          <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Team Performance Comparison</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
              <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase">Department</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase">Employees</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase">Avg Goal Progress</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase">Avg Rating</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase">Feedback</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
                {teamPerformance.map((team: TeamPerformance) => (
                  <tr key={team.departmentId} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
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
    <div className="space-y-6">
      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Goal Completion Trends (Last 6 Months)</h3>
        {goalTrends && goalTrends.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={goalTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-secondary-200 dark:stroke-secondary-700" />
                <XAxis dataKey="month" className="fill-secondary-500 dark:fill-secondary-400" />
                <YAxis className="fill-secondary-500 dark:fill-secondary-400" />
                <Tooltip contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', borderColor: 'var(--tooltip-border, #e5e7eb)' }} />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#3b82f6" name="Created" strokeWidth={2} />
                <Line type="monotone" dataKey="completed" stroke="#22c55e" name="Completed" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-secondary-500 dark:text-secondary-400 text-center py-8">No goal trends data available.</p>
        )}
      </div>

      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Goal Completion Rate</h3>
        {goalTrends && goalTrends.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={goalTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-secondary-200 dark:stroke-secondary-700" />
                <XAxis dataKey="month" className="fill-secondary-500 dark:fill-secondary-400" />
                <YAxis unit="%" className="fill-secondary-500 dark:fill-secondary-400" />
                <Tooltip formatter={(value) => [`${value}%`, 'Completion Rate']} />
                <Bar dataKey="completionRate" fill="#22c55e" name="Completion Rate" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-secondary-500 dark:text-secondary-400 text-center py-8">No data available.</p>
        )}
      </div>
    </div>
  );

  const renderFeedbackTrends = () => (
    <div className="space-y-6">
      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Feedback Trends (Last 6 Months)</h3>
        {feedbackTrends && feedbackTrends.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={feedbackTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-secondary-200 dark:stroke-secondary-700" />
                <XAxis dataKey="month" className="fill-secondary-500 dark:fill-secondary-400" />
                <YAxis className="fill-secondary-500 dark:fill-secondary-400" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="praise" stroke="#22c55e" name="Praise" strokeWidth={2} />
                <Line type="monotone" dataKey="constructive" stroke="#f97316" name="Constructive" strokeWidth={2} />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-secondary-500 dark:text-secondary-400 text-center py-8">No feedback trends data available.</p>
        )}
      </div>

      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Feedback Type Breakdown</h3>
        {feedbackTrends && feedbackTrends.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Praise', value: feedbackTrends.reduce((acc, t) => acc + t.praise, 0) },
                    { name: 'Constructive', value: feedbackTrends.reduce((acc, t) => acc + t.constructive, 0) },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#f97316" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-secondary-500 dark:text-secondary-400 text-center py-8">No data available.</p>
        )}
      </div>
    </div>
  );

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
      <div className="space-y-6">
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
              <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
                <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase">Dimension</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase">Category</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase">Count</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase">Avg Rating</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase">Variance</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
                  {biasMetrics.map((metric: BiasMetric, index: number) => (
                    <tr key={index} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Analytics</h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">Insights into performance, goals, and feedback</p>
        </div>
        {isHRAdmin && (
          <div className="flex gap-2">
            <button onClick={() => handleExport('goals')} className="btn-secondary text-sm">
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Export Goals
            </button>
            <button onClick={() => handleExport('reviews')} className="btn-secondary text-sm">
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Export Reviews
            </button>
            <button onClick={() => handleExport('feedback')} className="btn-secondary text-sm">
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Export Feedback
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-secondary-200 dark:border-secondary-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'performance', label: 'Performance' },
            { key: 'goals', label: 'Goals' },
            { key: 'feedback', label: 'Feedback' },
            ...(isHRAdmin ? [{ key: 'fairness', label: 'Fairness' }] : []),
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={clsx(
                'py-4 px-1 border-b-2 font-medium text-sm',
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
      {activeTab === 'fairness' && renderFairness()}
    </div>
  );
}
