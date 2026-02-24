// ============================================================================
// Engagement & eNPS Dashboard Page
// Displays engagement metrics, trends, department comparisons, at-risk
// employees, and recent engagement events for MANAGER+ users.
// ============================================================================

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChatBubbleLeftRightIcon,
  StarIcon,
  BoltIcon,
  FlagIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import clsx from 'clsx';

import { EngagementHeatmap, DepartmentRadar, ActionPlansWidget } from '@/components/engagement';
import {
  engagementApi,
  type EngagementOverview,
  type EngagementTrendPoint,
  type DepartmentEngagement,
  type AtRiskEmployee,
  type EngagementEvent,
} from '@/lib/api/engagement';
import { usePageTitle } from '@/hooks/usePageTitle';

// ── Constants ──

type TimeRange = 3 | 6 | 12;

const TIME_RANGE_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: '3M', value: 3 },
  { label: '6M', value: 6 },
  { label: '12M', value: 12 },
];

const DISTRIBUTION_LEVELS = [
  { key: 'VERY_HIGH' as const, label: 'Very High', color: '#16a34a', bgClass: 'bg-green-500' },
  { key: 'HIGH' as const, label: 'High', color: '#22c55e', bgClass: 'bg-green-400' },
  { key: 'MODERATE' as const, label: 'Moderate', color: '#eab308', bgClass: 'bg-yellow-500' },
  { key: 'LOW' as const, label: 'Low', color: '#f97316', bgClass: 'bg-orange-500' },
  { key: 'VERY_LOW' as const, label: 'Very Low', color: '#ef4444', bgClass: 'bg-red-500' },
];

const RISK_LEVEL_STYLES: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  MEDIUM: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  LOW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
};

const SCORE_LEVEL_STYLES: Record<string, string> = {
  VERY_HIGH: 'text-green-600 dark:text-green-400',
  HIGH: 'text-green-500 dark:text-green-400',
  MODERATE: 'text-yellow-600 dark:text-yellow-400',
  LOW: 'text-orange-600 dark:text-orange-400',
  VERY_LOW: 'text-red-600 dark:text-red-400',
};

const EVENT_CATEGORY_ICONS: Record<string, React.ElementType> = {
  RECOGNITION: StarIcon,
  COMMUNICATION: ChatBubbleLeftRightIcon,
  PARTICIPATION: UserGroupIcon,
  INITIATIVE: BoltIcon,
  MILESTONE: FlagIcon,
  COLLABORATION: UserGroupIcon,
};

const DEPT_BAR_COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e',
];

// ── Sort types ──

type AtRiskSortField = 'name' | 'score' | 'riskLevel' | 'department';
type SortDir = 'asc' | 'desc';

const RISK_LEVEL_ORDER: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

// ── Skeleton helpers ──

function SkeletonCard() {
  return (
    <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-secondary-200 dark:bg-secondary-700 rounded" />
          <div className="h-7 w-16 bg-secondary-200 dark:bg-secondary-700 rounded" />
        </div>
        <div className="h-12 w-12 bg-secondary-200 dark:bg-secondary-700 rounded-lg" />
      </div>
      <div className="mt-3 h-3 w-32 bg-secondary-200 dark:bg-secondary-700 rounded" />
    </div>
  );
}

function SkeletonChart({ height = 'h-64' }: { height?: string }) {
  return (
    <div className={clsx('animate-pulse', height)}>
      <div className="h-full w-full bg-secondary-100 dark:bg-secondary-700/50 rounded-lg" />
    </div>
  );
}

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-8 bg-secondary-100 dark:bg-secondary-700/50 rounded" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-secondary-50 dark:bg-secondary-800/50 rounded" />
      ))}
    </div>
  );
}

// ── Trend arrow helper ──

function TrendIndicator({
  direction,
  change,
  size = 'sm',
}: {
  direction: string | null;
  change: number | null;
  size?: 'sm' | 'lg';
}) {
  const iconClass = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  const textClass = size === 'lg' ? 'text-sm font-medium' : 'text-xs';

  if (!direction || direction === 'STABLE') {
    return (
      <span className="inline-flex items-center gap-1 text-secondary-400">
        <MinusIcon className={iconClass} />
        <span className={textClass}>Stable</span>
      </span>
    );
  }
  if (direction === 'UP' || direction === 'IMPROVING') {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
        <ArrowTrendingUpIcon className={iconClass} />
        {change != null && <span className={textClass}>+{Number(change ?? 0).toFixed(1)}%</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
      <ArrowTrendingDownIcon className={iconClass} />
      {change != null && <span className={textClass}>{Number(change ?? 0).toFixed(1)}%</span>}
    </span>
  );
}

// ── Score color helper ──

function getScoreColor(score: number): string {
  if (score >= 4.5) return '#16a34a';
  if (score >= 3.5) return '#22c55e';
  if (score >= 2.5) return '#eab308';
  if (score >= 1.5) return '#f97316';
  return '#ef4444';
}

// ── Custom tooltip for charts ──

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-xl px-3 py-2 shadow-2xl text-xs space-y-1">
      <p className="font-medium text-slate-300">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : Number(entry.value ?? 0).toFixed(1)}
        </p>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function EngagementDashboardPage() {
  usePageTitle('Engagement Dashboard');
  const [timeRange, setTimeRange] = useState<TimeRange>(6);
  const [atRiskSort, setAtRiskSort] = useState<{ field: AtRiskSortField; dir: SortDir }>({
    field: 'riskLevel',
    dir: 'desc',
  });
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  // ── Queries ──

  const { data: overview, isLoading: loadingOverview, isError: errorOverview } = useQuery({
    queryKey: ['engagement', 'overview'],
    queryFn: () => engagementApi.getOverview(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const { data: trends, isLoading: loadingTrends } = useQuery({
    queryKey: ['engagement', 'trends', timeRange],
    queryFn: () => engagementApi.getTrends({ months: timeRange }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const { data: departments, isLoading: loadingDepts } = useQuery({
    queryKey: ['engagement', 'departments'],
    queryFn: () => engagementApi.getDepartments(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const { data: atRiskData, isLoading: loadingAtRisk } = useQuery({
    queryKey: ['engagement', 'at-risk'],
    queryFn: () => engagementApi.getAtRisk({ limit: 50 }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const atRiskEmployees: AtRiskEmployee[] = Array.isArray(atRiskData) ? atRiskData : (atRiskData?.employees ?? []);

  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ['engagement', 'events'],
    queryFn: () => engagementApi.getEvents({ limit: 15 }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // ── Error state — show friendly message if main data fails ──
  const allFailed = errorOverview && !overview;
  if (allFailed && !loadingOverview) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Engagement Dashboard</h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">Monitor employee engagement levels and trends</p>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-amber-400 mb-4" />
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">No engagement data available</h2>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">Engagement metrics haven&apos;t been generated yet, or you may not have permission to view this data.</p>
        </div>
      </div>
    );
  }

  // ── Sorted at-risk employees ──

  const sortedAtRisk = useMemo(() => {
    if (!atRiskEmployees) return [];
    return [...atRiskEmployees].sort((a, b) => {
      const dir = atRiskSort.dir === 'asc' ? 1 : -1;
      switch (atRiskSort.field) {
        case 'name':
          return dir * `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'score':
          return dir * ((a.overallScore ?? 0) - (b.overallScore ?? 0));
        case 'riskLevel':
          return dir * ((RISK_LEVEL_ORDER[a.riskLevel || ''] || 0) - (RISK_LEVEL_ORDER[b.riskLevel || ''] || 0));
        case 'department':
          return dir * (a.department || '').localeCompare(b.department || '');
        default:
          return 0;
      }
    });
  }, [atRiskEmployees, atRiskSort]);

  // ── Radar data for selected department ──

  const selectedDept = useMemo(() => {
    if (!selectedDeptId || !departments) return null;
    return departments.find((d) => d.departmentId === selectedDeptId) || null;
  }, [selectedDeptId, departments]);

  const radarData = useMemo(() => {
    if (!selectedDept) return null;
    const cs = selectedDept.componentScores;
    return [
      { subject: 'Participation', value: cs.participation, fullMark: 5 },
      { subject: 'Communication', value: cs.communication, fullMark: 5 },
      { subject: 'Collaboration', value: cs.collaboration, fullMark: 5 },
      { subject: 'Initiative', value: cs.initiative, fullMark: 5 },
      { subject: 'Responsiveness', value: cs.responsiveness, fullMark: 5 },
    ];
  }, [selectedDept]);

  // ── Distribution total ──

  const distributionTotal = useMemo(() => {
    if (!overview) return 0;
    return Object.values(overview.distribution).reduce((sum, v) => sum + v, 0);
  }, [overview]);

  // ── Sort toggle handler ──

  const toggleSort = (field: AtRiskSortField) => {
    setAtRiskSort((prev) =>
      prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'desc' }
    );
  };

  const SortIcon = ({ field }: { field: AtRiskSortField }) => {
    if (atRiskSort.field !== field) return null;
    return atRiskSort.dir === 'asc' ? (
      <ChevronUpIcon className="inline h-3 w-3 ml-0.5" />
    ) : (
      <ChevronDownIcon className="inline h-3 w-3 ml-0.5" />
    );
  };

  // ── Department bar chart data ──

  const deptChartData = useMemo(() => {
    if (!departments) return [];
    return departments
      .slice()
      .sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0))
      .map((d) => ({
        name: d.departmentName,
        fullName: d.departmentName,
        score: Number(Number(d.averageScore ?? 0).toFixed(2)),
        atRisk: d.atRiskCount,
        id: d.departmentId,
      }));
  }, [departments]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
          Engagement Dashboard
        </h1>
        <p className="mt-1 text-secondary-600 dark:text-secondary-400">
          Monitor employee engagement levels, identify at-risk individuals, and track trends across departments
        </p>
      </div>

      {/* ================================================================== */}
      {/* 1. Key Metrics Row                                                 */}
      {/* ================================================================== */}
      {loadingOverview ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : overview ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Average Engagement Score */}
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">
                  Average Engagement Score
                </p>
                <p className="text-2xl font-bold mt-1" style={{ color: getScoreColor(overview.averageScore ?? 0) }}>
                  {Number(overview.averageScore ?? 0).toFixed(1)}
                  <span className="text-sm font-normal text-secondary-400 dark:text-secondary-500">/5.0</span>
                </p>
              </div>
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <div className="mt-3">
              <TrendIndicator direction={overview.trendDirection} change={overview.changeFromPrevious} />
            </div>
          </div>

          {/* At-Risk Count */}
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">
                  At-Risk Employees
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {overview.atRiskCount}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="mt-3 text-xs text-secondary-400 dark:text-secondary-500">
              of {overview.totalEmployees} total employees
            </p>
          </div>

          {/* Participation Rate */}
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">
                  Participation Rate
                </p>
                <p className="text-2xl font-bold text-secondary-900 dark:text-white mt-1">
                  {Number(overview.participationRate ?? 0).toFixed(0)}%
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-3 w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${Math.min(overview.participationRate ?? 0, 100)}%` }}
              />
            </div>
          </div>

          {/* Trend Indicator */}
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">
                  Overall Trend
                </p>
                <div className="mt-1">
                  <TrendIndicator direction={overview.trendDirection} change={overview.changeFromPrevious} size="lg" />
                </div>
              </div>
              <div
                className={clsx(
                  'p-3 rounded-lg',
                  overview.trendDirection === 'UP' || overview.trendDirection === 'IMPROVING'
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : overview.trendDirection === 'DOWN' || overview.trendDirection === 'DECLINING'
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : 'bg-secondary-100 dark:bg-secondary-700/30'
                )}
              >
                {overview.trendDirection === 'UP' || overview.trendDirection === 'IMPROVING' ? (
                  <ArrowTrendingUpIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : overview.trendDirection === 'DOWN' || overview.trendDirection === 'DECLINING' ? (
                  <ArrowTrendingDownIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                ) : (
                  <MinusIcon className="h-6 w-6 text-secondary-400" />
                )}
              </div>
            </div>
            <p className="mt-3 text-xs text-secondary-400 dark:text-secondary-500">
              Compared to previous period
            </p>
          </div>
        </div>
      ) : null}

      {/* ================================================================== */}
      {/* 2. Engagement Distribution                                         */}
      {/* ================================================================== */}
      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <h2 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">
          Engagement Distribution
        </h2>
        {loadingOverview ? (
          <SkeletonChart height="h-16" />
        ) : overview && distributionTotal > 0 ? (
          <div className="space-y-3">
            {/* Stacked horizontal bar */}
            <div className="flex h-8 w-full rounded-lg overflow-hidden">
              {DISTRIBUTION_LEVELS.map((level) => {
                const count = overview.distribution[level.key];
                const pct = (count / distributionTotal) * 100;
                if (pct === 0) return null;
                return (
                  <div
                    key={level.key}
                    className={clsx(level.bgClass, 'transition-all duration-500 relative group')}
                    style={{ width: `${pct}%` }}
                    title={`${level.label}: ${count} (${Number(pct ?? 0).toFixed(1)}%)`}
                  >
                    {pct >= 8 && (
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
                        {Number(pct ?? 0).toFixed(0)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {DISTRIBUTION_LEVELS.map((level) => {
                const count = overview.distribution[level.key];
                return (
                  <div key={level.key} className="flex items-center gap-1.5">
                    <span className={clsx('inline-block h-3 w-3 rounded-sm', level.bgClass)} />
                    <span className="text-xs text-secondary-600 dark:text-secondary-400">
                      {level.label}
                    </span>
                    <span className="text-xs font-medium text-secondary-900 dark:text-white">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-secondary-500 dark:text-secondary-400 text-center py-6">
            No distribution data available.
          </p>
        )}
      </div>

      {/* ================================================================== */}
      {/* 3. Trend Line Chart                                                */}
      {/* ================================================================== */}
      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-secondary-900 dark:text-white">
            Engagement Trend
          </h2>
          <div className="inline-flex rounded-lg bg-secondary-100 dark:bg-secondary-700 p-0.5">
            {TIME_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimeRange(opt.value)}
                className={clsx(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  timeRange === opt.value
                    ? 'bg-white dark:bg-secondary-600 text-secondary-900 dark:text-white shadow-sm'
                    : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loadingTrends ? (
          <SkeletonChart />
        ) : trends && trends.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-secondary-200 dark:stroke-secondary-700"
                />
                <XAxis
                  dataKey="month"
                  className="fill-secondary-500 dark:fill-secondary-400"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  domain={[0, 5]}
                  className="fill-secondary-500 dark:fill-secondary-400"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="averageScore"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                  name="Average Score"
                />
                <Line
                  type="monotone"
                  dataKey="atRiskCount"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#ef4444', strokeWidth: 0, r: 3 }}
                  name="At-Risk Count"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-secondary-500 dark:text-secondary-400 text-center py-12">
            No trend data available for the selected period.
          </p>
        )}
      </div>

      {/* ================================================================== */}
      {/* 3b. Engagement Heatmap                                             */}
      {/* ================================================================== */}
      {trends && Array.isArray(trends) && trends.length > 0 && (
        <EngagementHeatmap
          trends={trends.map((t: EngagementTrendPoint) => ({ date: t.month, score: t.averageScore }))}
          mode="engagement"
        />
      )}

      {/* ================================================================== */}
      {/* 4. Department Comparison                                           */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="xl:col-span-2 card card-body dark:bg-secondary-800 dark:border-secondary-700">
          <h2 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">
            Department Comparison
          </h2>
          {loadingDepts ? (
            <SkeletonChart />
          ) : deptChartData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-secondary-200 dark:stroke-secondary-700"
                  />
                  <XAxis
                    dataKey="name"
                    className="fill-secondary-500 dark:fill-secondary-400"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    domain={[0, 5]}
                    className="fill-secondary-500 dark:fill-secondary-400"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-xl px-3 py-2 shadow-2xl">
                          <p className="text-sm font-medium text-white">
                            {item.fullName}
                          </p>
                          <p className="text-sm" style={{ color: getScoreColor(item.score) }}>
                            Score: {item.score}
                          </p>
                          <p className="text-xs text-slate-300">
                            At-Risk: {item.atRisk}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="score"
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={(data: any) => {
                      if (data?.id) setSelectedDeptId(data.id === selectedDeptId ? null : data.id);
                    }}
                  >
                    {deptChartData.map((entry, index) => (
                      <Cell
                        key={entry.id}
                        fill={
                          selectedDeptId === entry.id
                            ? '#8b5cf6'
                            : DEPT_BAR_COLORS[index % DEPT_BAR_COLORS.length]
                        }
                        opacity={selectedDeptId && selectedDeptId !== entry.id ? 0.4 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-secondary-500 dark:text-secondary-400 text-center py-12">
              No department data available.
            </p>
          )}
        </div>

        {/* Multi-department radar comparison */}
        {departments && departments.length > 0 && (
          <DepartmentRadar
            departments={(departments as DepartmentEngagement[]).map((d) => ({
              departmentId: d.departmentId,
              departmentName: d.departmentName,
              averageScore: d.averageScore,
              employeeCount: d.employeeCount,
              componentScores: d.componentScores ?? {
                participation: 0,
                communication: 0,
                collaboration: 0,
                initiative: 0,
                responsiveness: 0,
              },
            }))}
            selectedDeptIds={selectedDeptId ? [selectedDeptId] : undefined}
          />
        )}
      </div>

      {/* Department table */}
      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <h2 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">
          Department Details
        </h2>
        {loadingDepts ? (
          <SkeletonTable rows={4} />
        ) : departments && departments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
              <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400">
                    Department
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">
                    Employees
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">
                    Average Score
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">
                    Top Level
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">
                    At-Risk
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">
                    Score Bar
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
                {departments.map((dept) => {
                  const pct = ((dept.averageScore ?? 0) / 5) * 100;
                  return (
                    <tr
                      key={dept.departmentId}
                      className={clsx(
                        'hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors cursor-pointer',
                        selectedDeptId === dept.departmentId && 'bg-primary-50/50 dark:bg-primary-900/10'
                      )}
                      onClick={() =>
                        setSelectedDeptId(dept.departmentId === selectedDeptId ? null : dept.departmentId)
                      }
                    >
                      <td className="px-4 py-3 font-medium text-secondary-900 dark:text-white text-sm">
                        {dept.departmentName}
                      </td>
                      <td className="px-4 py-3 text-center text-sm dark:text-secondary-300">
                        {dept.employeeCount}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="text-sm font-bold"
                          style={{ color: getScoreColor(dept.averageScore ?? 0) }}
                        >
                          {Number(dept.averageScore ?? 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={clsx(
                            'inline-block px-2 py-0.5 rounded-full text-xs font-medium',
                            SCORE_LEVEL_STYLES[dept.topLevel] || 'text-secondary-500'
                          )}
                        >
                          {(dept.topLevel || 'Unknown').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {dept.atRiskCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400">
                            <ExclamationTriangleIcon className="h-4 w-4" />
                            {dept.atRiskCount}
                          </span>
                        ) : (
                          <span className="text-sm text-secondary-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-24 mx-auto bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: getScoreColor(dept.averageScore ?? 0),
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-secondary-500 dark:text-secondary-400 text-center py-8">
            No department data available.
          </p>
        )}
      </div>

      {/* ================================================================== */}
      {/* 5. At-Risk Employees Table                                         */}
      {/* ================================================================== */}
      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-secondary-900 dark:text-white">
            At-Risk Employees
          </h2>
          {atRiskEmployees && atRiskEmployees.length > 0 && (
            <span className="text-xs text-secondary-400 dark:text-secondary-500">
              {atRiskEmployees.length} employee{atRiskEmployees.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loadingAtRisk ? (
          <SkeletonTable rows={5} />
        ) : sortedAtRisk.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
              <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 cursor-pointer hover:text-secondary-700 dark:hover:text-secondary-300 select-none"
                    onClick={() => toggleSort('name')}
                  >
                    Employee <SortIcon field="name" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400">
                    Job Title
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 cursor-pointer hover:text-secondary-700 dark:hover:text-secondary-300 select-none"
                    onClick={() => toggleSort('department')}
                  >
                    Department <SortIcon field="department" />
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 cursor-pointer hover:text-secondary-700 dark:hover:text-secondary-300 select-none"
                    onClick={() => toggleSort('score')}
                  >
                    Score <SortIcon field="score" />
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">
                    Level
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 cursor-pointer hover:text-secondary-700 dark:hover:text-secondary-300 select-none"
                    onClick={() => toggleSort('riskLevel')}
                  >
                    Risk <SortIcon field="riskLevel" />
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
                {sortedAtRisk.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-secondary-900 dark:text-white">
                        {emp.firstName} {emp.lastName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-600 dark:text-secondary-400">
                      {emp.jobTitle || '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-secondary-600 dark:text-secondary-400">
                      {emp.department || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="text-sm font-bold"
                        style={{ color: getScoreColor(emp.overallScore ?? 0) }}
                      >
                        {Number(emp.overallScore ?? 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={clsx(
                          'text-xs font-medium',
                          SCORE_LEVEL_STYLES[emp.scoreLevel] || 'text-secondary-500'
                        )}
                      >
                        {(emp.scoreLevel || 'Unknown').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {emp.riskLevel ? (
                        <span
                          className={clsx(
                            'inline-block px-2 py-0.5 rounded-full text-xs font-semibold',
                            RISK_LEVEL_STYLES[emp.riskLevel] || 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-300'
                          )}
                        >
                          {emp.riskLevel}
                        </span>
                      ) : (
                        <span className="text-xs text-secondary-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <TrendIndicator direction={emp.trendDirection} change={emp.changeFromPrevious} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 text-secondary-400 dark:text-secondary-500">
            <CheckCircleIcon className="h-10 w-10 mb-2 text-green-400" />
            <p className="text-sm">No at-risk employees identified.</p>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* 5b. Action Plans for At-Risk Employees                             */}
      {/* ================================================================== */}
      {atRiskEmployees && atRiskEmployees.length > 0 && (
        <ActionPlansWidget
          atRiskEmployees={(atRiskEmployees as AtRiskEmployee[]).map((e) => ({
            id: e.id,
            userId: e.userId,
            firstName: e.firstName,
            lastName: e.lastName,
            department: e.department,
            overallScore: e.overallScore,
          }))}
        />
      )}

      {/* ================================================================== */}
      {/* 6. Recent Events Timeline                                          */}
      {/* ================================================================== */}
      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <h2 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">
          Recent Engagement Events
        </h2>
        {loadingEvents ? (
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-8 w-8 bg-secondary-200 dark:bg-secondary-700 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 bg-secondary-200 dark:bg-secondary-700 rounded" />
                  <div className="h-3 w-1/2 bg-secondary-100 dark:bg-secondary-700/50 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-secondary-200 dark:bg-secondary-700" />

            <div className="space-y-6">
              {events.map((event, idx) => {
                const IconComponent = EVENT_CATEGORY_ICONS[event.eventCategory] || ClockIcon;
                const isPositive = event.positiveIndicator;
                const timestamp = new Date(event.eventTimestamp);
                const relativeTime = getRelativeTime(timestamp);

                return (
                  <div key={event.id} className="relative flex gap-4 pl-0">
                    {/* Timeline dot */}
                    <div
                      className={clsx(
                        'relative z-10 flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full ring-4 ring-white dark:ring-secondary-800',
                        isPositive
                          ? 'bg-green-100 dark:bg-green-900/40'
                          : 'bg-red-100 dark:bg-red-900/40'
                      )}
                    >
                      <IconComponent
                        className={clsx(
                          'h-4 w-4',
                          isPositive
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        )}
                      />
                    </div>

                    {/* Event content */}
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-secondary-900 dark:text-white">
                            {formatEventType(event.eventType)}
                          </p>
                          {event.user && (
                            <p className="text-xs text-secondary-500 dark:text-secondary-400">
                              {event.user.firstName} {event.user.lastName}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={clsx(
                              'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                              isPositive
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            )}
                          >
                            {isPositive ? (
                              <ArrowTrendingUpIcon className="h-3 w-3" />
                            ) : (
                              <ArrowTrendingDownIcon className="h-3 w-3" />
                            )}
                            {Number(event.engagementImpact ?? 0) > 0 ? '+' : ''}
                            {Number(event.engagementImpact ?? 0).toFixed(1)}
                          </span>
                          <span className="text-xs text-secondary-400 dark:text-secondary-500 whitespace-nowrap">
                            {relativeTime}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-block px-1.5 py-0.5 text-[10px] tracking-wider font-medium rounded bg-secondary-100 text-secondary-500 dark:bg-secondary-700 dark:text-secondary-400">
                          {event.eventCategory.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 text-secondary-400 dark:text-secondary-500">
            <ClockIcon className="h-10 w-10 mb-2" />
            <p className="text-sm">No recent engagement events.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ──

function formatEventType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
