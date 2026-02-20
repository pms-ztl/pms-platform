// ============================================================================
// Organizational Health Dashboard
// Displays org health metrics, component scores, people metrics, department
// comparisons, strengths/concerns, and historical trends for MANAGER+ users.
// ============================================================================

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  HeartIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  LightBulbIcon,
  ChatBubbleLeftRightIcon,
  StarIcon,
  BoltIcon,
  FaceSmileIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import {
  RadialBarChart,
  RadialBar,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import clsx from 'clsx';

import {
  healthApi,
  type OrganizationalHealth,
  type DepartmentHealth,
} from '@/lib/api/health';
import { usePageTitle } from '@/hooks/usePageTitle';

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

const HEALTH_LEVEL_CONFIG: Record<
  OrganizationalHealth['healthLevel'],
  { label: string; color: string; bg: string; bgDark: string; ring: string }
> = {
  EXCELLENT: {
    label: 'Excellent',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-100',
    bgDark: 'dark:bg-emerald-900/30',
    ring: 'ring-emerald-500/20',
  },
  GOOD: {
    label: 'Good',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-100',
    bgDark: 'dark:bg-blue-900/30',
    ring: 'ring-blue-500/20',
  },
  FAIR: {
    label: 'Fair',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-100',
    bgDark: 'dark:bg-amber-900/30',
    ring: 'ring-amber-500/20',
  },
  POOR: {
    label: 'Poor',
    color: 'text-orange-700 dark:text-orange-300',
    bg: 'bg-orange-100',
    bgDark: 'dark:bg-orange-900/30',
    ring: 'ring-orange-500/20',
  },
  CRITICAL: {
    label: 'Critical',
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-100',
    bgDark: 'dark:bg-red-900/30',
    ring: 'ring-red-500/20',
  },
};

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  if (score >= 20) return '#f97316';
  return '#ef4444';
}

function scoreTailwind(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-amber-500';
  if (score >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}

function vsAvgColor(diff: number): string {
  if (diff > 3) return 'text-emerald-600 dark:text-emerald-400';
  if (diff < -3) return 'text-red-600 dark:text-red-400';
  return 'text-secondary-500 dark:text-secondary-400';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Skeleton Components
// ---------------------------------------------------------------------------

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-lg bg-secondary-200 dark:bg-secondary-700',
        className,
      )}
    />
  );
}

function GaugeSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <SkeletonPulse className="h-48 w-48 rounded-full" />
      <SkeletonPulse className="mt-4 h-6 w-32" />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
      <SkeletonPulse className="h-4 w-24 mb-3" />
      <SkeletonPulse className="h-8 w-16 mb-2" />
      <SkeletonPulse className="h-2 w-full" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
      <SkeletonPulse className="h-5 w-48 mb-6" />
      <div className="flex items-end gap-3 h-48">
        {[40, 65, 55, 80, 45, 70, 60].map((h, i) => (
          <SkeletonPulse
            key={i}
            className="flex-1"
            style={{ height: `${h}%` } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

const COMPONENT_META: {
  key: keyof Pick<
    OrganizationalHealth,
    | 'engagementScore'
    | 'performanceScore'
    | 'cultureScore'
    | 'leadershipScore'
    | 'collaborationScore'
    | 'innovationScore'
    | 'wellbeingScore'
  >;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: 'engagementScore', label: 'Engagement', icon: BoltIcon },
  { key: 'performanceScore', label: 'Performance', icon: StarIcon },
  { key: 'cultureScore', label: 'Culture', icon: SparklesIcon },
  { key: 'leadershipScore', label: 'Leadership', icon: ShieldCheckIcon },
  { key: 'collaborationScore', label: 'Collaboration', icon: ChatBubbleLeftRightIcon },
  { key: 'innovationScore', label: 'Innovation', icon: LightBulbIcon },
  { key: 'wellbeingScore', label: 'Wellbeing', icon: FaceSmileIcon },
];

/** Large radial gauge for the overall health score */
function HealthGauge({ score, healthLevel }: { score: number; healthLevel: OrganizationalHealth['healthLevel'] }) {
  const fillColor = scoreColor(score);
  const data = [
    { name: 'score', value: score, fill: fillColor },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-56 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            barSize={18}
            data={data}
            startAngle={225}
            endAngle={-45}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={10}
              background={{ fill: 'rgba(148,163,184,0.15)' }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-4xl font-bold font-display"
            style={{ color: fillColor }}
          >
            {score}
          </span>
          <span className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
            out of 100
          </span>
        </div>
      </div>
      <span
        className={clsx(
          'mt-2 text-sm font-semibold',
          HEALTH_LEVEL_CONFIG[healthLevel]?.color,
        )}
      >
        {HEALTH_LEVEL_CONFIG[healthLevel]?.label ?? healthLevel}
      </span>
    </div>
  );
}

/** Single component score card */
function ComponentCard({
  label,
  score,
  Icon,
}: {
  label: string;
  score: number;
  Icon: React.ElementType;
}) {
  return (
    <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
          <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </div>
        <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
          {label}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-secondary-900 dark:text-white">
          {score}
        </span>
        <span className="text-xs text-secondary-400 dark:text-secondary-500 mb-1">/100</span>
      </div>
      {/* Progress bar */}
      <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
        <div
          className={clsx('h-2 rounded-full transition-all duration-500', scoreTailwind(score))}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );
}

/** Single stat card for people metrics */
function StatCard({
  label,
  value,
  icon: Icon,
  subtext,
  danger,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  subtext?: string;
  danger?: boolean;
}) {
  return (
    <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-secondary-500 dark:text-secondary-400">{label}</p>
          <p
            className={clsx(
              'text-2xl font-bold mt-1',
              danger
                ? 'text-danger-600 dark:text-danger-400'
                : 'text-secondary-900 dark:text-white',
            )}
          >
            {value}
          </p>
          {subtext && (
            <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
              {subtext}
            </p>
          )}
        </div>
        <div
          className={clsx(
            'p-3 rounded-lg',
            danger
              ? 'bg-danger-100 dark:bg-danger-900/30'
              : 'bg-primary-100 dark:bg-primary-900/30',
          )}
        >
          <Icon
            className={clsx(
              'h-6 w-6',
              danger
                ? 'text-danger-600 dark:text-danger-400'
                : 'text-primary-600 dark:text-primary-400',
            )}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export function HealthDashboardPage() {
  usePageTitle('Organizational Health');
  // ── Queries ──
  const {
    data: latest,
    isLoading: loadingLatest,
    isError: errorLatest,
  } = useQuery({
    queryKey: ['health-metrics', 'latest'],
    queryFn: () => healthApi.getLatest(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['health-metrics', 'history'],
    queryFn: () => healthApi.getHistory({ limit: 12 }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const { data: departments, isLoading: loadingDepts } = useQuery({
    queryKey: ['health-metrics', 'departments'],
    queryFn: () => healthApi.getDepartments(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // ── Derived data ──

  const historyChartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return [...history]
      .sort(
        (a, b) =>
          new Date(a.metricDate).getTime() - new Date(b.metricDate).getTime(),
      )
      .map((h) => ({
        date: formatDate(h.metricDate),
        healthScore: h.overallHealthScore,
        engagement: h.engagementScore,
        performance: h.performanceScore,
      }));
  }, [history]);

  const sortedDepts = useMemo(() => {
    if (!departments || departments.length === 0) return [];
    return [...departments].sort((a, b) => b.healthScore - a.healthScore);
  }, [departments]);

  const deptChartData = useMemo(() => {
    return sortedDepts.map((d) => ({
      name: d.department.name,
      healthScore: d.healthScore,
      vsAvg: d.vsOrgAverage,
    }));
  }, [sortedDepts]);

  // ── Trend indicator ──
  const trendDirection = latest?.trendDirection;
  const TrendIcon =
    trendDirection === 'IMPROVING'
      ? ArrowTrendingUpIcon
      : trendDirection === 'DECLINING'
        ? ArrowTrendingDownIcon
        : MinusIcon;
  const trendColor =
    trendDirection === 'IMPROVING'
      ? 'text-emerald-600 dark:text-emerald-400'
      : trendDirection === 'DECLINING'
        ? 'text-red-600 dark:text-red-400'
        : 'text-secondary-400 dark:text-secondary-500';
  const trendLabel =
    trendDirection === 'IMPROVING'
      ? 'Improving'
      : trendDirection === 'DECLINING'
        ? 'Declining'
        : 'Stable';

  // ── Error state ──
  if (errorLatest) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ExclamationTriangleIcon className="h-12 w-12 text-danger-400 mb-4" />
        <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
          Unable to load health metrics
        </h2>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
          Please try again later or contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ================================================================== */}
      {/* 1. Header                                                          */}
      {/* ================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <HeartIcon className="h-7 w-7 text-primary-600 dark:text-primary-400" />
            <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
              Organizational Health
            </h1>
          </div>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">
            Holistic view of workforce health, engagement, and culture
          </p>
        </div>

        {/* Health level badge + trend */}
        {latest && (
          <div className="flex items-center gap-3">
            <span
              className={clsx(
                'inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ring-1 ring-inset',
                HEALTH_LEVEL_CONFIG[latest.healthLevel]?.bg,
                HEALTH_LEVEL_CONFIG[latest.healthLevel]?.bgDark,
                HEALTH_LEVEL_CONFIG[latest.healthLevel]?.color,
                HEALTH_LEVEL_CONFIG[latest.healthLevel]?.ring,
              )}
            >
              {HEALTH_LEVEL_CONFIG[latest.healthLevel]?.label ?? latest.healthLevel}
            </span>
            <div className={clsx('flex items-center gap-1 text-sm font-medium', trendColor)}>
              <TrendIcon className="h-4 w-4" />
              <span>{trendLabel}</span>
            </div>
          </div>
        )}
        {loadingLatest && <SkeletonPulse className="h-9 w-40" />}
      </div>

      {/* ================================================================== */}
      {/* 2. Health Score Gauge                                              */}
      {/* ================================================================== */}
      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <h2 className="text-lg font-medium text-secondary-900 dark:text-white mb-2 text-center">
          Overall Health Score
        </h2>
        {loadingLatest ? (
          <GaugeSkeleton />
        ) : latest ? (
          <HealthGauge
            score={latest.overallHealthScore}
            healthLevel={latest.healthLevel}
          />
        ) : (
          <p className="text-center text-secondary-500 dark:text-secondary-400 py-12">
            No health data available yet.
          </p>
        )}
      </div>

      {/* ================================================================== */}
      {/* 3. Component Score Cards (7 in 2 rows)                             */}
      {/* ================================================================== */}
      <div>
        <h2 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">
          Component Scores
        </h2>
        {loadingLatest ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : latest ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COMPONENT_META.map((comp) => (
              <ComponentCard
                key={comp.key}
                label={comp.label}
                score={latest[comp.key]}
                Icon={comp.icon}
              />
            ))}
          </div>
        ) : (
          <p className="text-secondary-500 dark:text-secondary-400">
            No component scores available.
          </p>
        )}
      </div>

      {/* ================================================================== */}
      {/* 4. People Metrics Row                                              */}
      {/* ================================================================== */}
      <div>
        <h2 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">
          People Metrics
        </h2>
        {loadingLatest ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : latest ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Headcount"
              value={latest.headcount.toLocaleString()}
              icon={UserGroupIcon}
              subtext={`${latest.activeEmployees.toLocaleString()} active`}
            />
            <StatCard
              label="Retention Rate"
              value={`${(latest.retentionRate ?? 0).toFixed(1)}%`}
              icon={ShieldCheckIcon}
            />
            <StatCard
              label="Turnover Rate"
              value={`${(latest.turnoverRate ?? 0).toFixed(1)}%`}
              icon={ArrowPathIcon}
              danger={latest.turnoverRate > 15}
            />
            <StatCard
              label="Flight Risk"
              value={latest.flightRiskCount}
              icon={ExclamationTriangleIcon}
              subtext={`${latest.disengagedEmployees} disengaged`}
              danger={latest.flightRiskCount > 0}
            />
          </div>
        ) : (
          <p className="text-secondary-500 dark:text-secondary-400">
            No people metrics available.
          </p>
        )}
      </div>

      {/* ================================================================== */}
      {/* 5. Department Comparison                                           */}
      {/* ================================================================== */}
      <div>
        <h2 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">
          Department Health Comparison
        </h2>

        {loadingDepts ? (
          <ChartSkeleton />
        ) : sortedDepts.length > 0 ? (
          <div className="space-y-6">
            {/* Bar chart */}
            <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={deptChartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 30 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-secondary-200 dark:stroke-secondary-700"
                    />
                    <XAxis
                      dataKey="name"
                      angle={-35}
                      textAnchor="end"
                      tick={{ fontSize: 11 }}
                      className="fill-secondary-500 dark:fill-secondary-400"
                    />
                    <YAxis
                      domain={[0, 100]}
                      className="fill-secondary-500 dark:fill-secondary-400"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tooltip-bg, #fff)',
                        borderColor: 'var(--tooltip-border, #e5e7eb)',
                        borderRadius: '0.5rem',
                      }}
                      formatter={(value: number, name: string) => {
                        const label = name === 'healthScore' ? 'Health Score' : 'vs Org Avg';
                        return [`${value}`, label];
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="healthScore"
                      name="Health Score"
                      radius={[4, 4, 0, 0]}
                      fill="#3b82f6"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table */}
            <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700 overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
                <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Health Score
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Engagement
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Performance
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Headcount
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Turnover
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      vs Org Avg
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
                  {sortedDepts.map((dept, idx) => (
                    <tr
                      key={dept.id}
                      className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-secondary-500 dark:text-secondary-400">
                        {dept.ranking ?? idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <BuildingOfficeIcon className="h-4 w-4 text-secondary-400 dark:text-secondary-500" />
                          <span className="font-medium text-secondary-900 dark:text-white text-sm">
                            {dept.department.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                            <div
                              className={clsx(
                                'h-2 rounded-full transition-all',
                                scoreTailwind(dept.healthScore),
                              )}
                              style={{ width: `${dept.healthScore}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-secondary-900 dark:text-white w-8 text-right">
                            {dept.healthScore}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm dark:text-secondary-300">
                        {dept.engagementScore}
                      </td>
                      <td className="px-4 py-3 text-center text-sm dark:text-secondary-300">
                        {dept.performanceScore}
                      </td>
                      <td className="px-4 py-3 text-center text-sm dark:text-secondary-300">
                        {dept.headcount}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <span
                          className={clsx(
                            dept.turnoverRate > 15
                              ? 'text-danger-600 dark:text-danger-400 font-semibold'
                              : 'text-secondary-700 dark:text-secondary-300',
                          )}
                        >
                          {(dept.turnoverRate ?? 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={clsx(
                            'text-sm font-semibold',
                            vsAvgColor(dept.vsOrgAverage),
                          )}
                        >
                          {dept.vsOrgAverage > 0 ? '+' : ''}
                          {(dept.vsOrgAverage ?? 0).toFixed(1)}
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
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
            <p className="mt-2 text-secondary-500 dark:text-secondary-400">
              No department health data available.
            </p>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* 6. Strengths & Concerns                                            */}
      {/* ================================================================== */}
      {latest && (latest.strengths.length > 0 || latest.concerns.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
              <h3 className="text-lg font-medium text-secondary-900 dark:text-white">
                Strengths
              </h3>
            </div>
            {latest.strengths.length > 0 ? (
              <ul className="space-y-3">
                {latest.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-sm text-secondary-700 dark:text-secondary-300">
                      {s}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-secondary-400 dark:text-secondary-500">
                No strengths identified yet.
              </p>
            )}
          </div>

          {/* Concerns */}
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <div className="flex items-center gap-2 mb-4">
              <XCircleIcon className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-medium text-secondary-900 dark:text-white">
                Concerns
              </h3>
            </div>
            {latest.concerns.length > 0 ? (
              <ul className="space-y-3">
                {latest.concerns.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-red-500 shrink-0" />
                    <span className="text-sm text-secondary-700 dark:text-secondary-300">
                      {c}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-secondary-400 dark:text-secondary-500">
                No concerns identified.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Skeleton for strengths/concerns while loading */}
      {loadingLatest && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <SkeletonPulse className="h-5 w-24 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <SkeletonPulse key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <SkeletonPulse className="h-5 w-24 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <SkeletonPulse key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* 7. Historical Trend                                                */}
      {/* ================================================================== */}
      <div>
        <h2 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">
          Historical Trend
        </h2>

        {loadingHistory ? (
          <ChartSkeleton />
        ) : historyChartData.length > 0 ? (
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={historyChartData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-secondary-200 dark:stroke-secondary-700"
                  />
                  <XAxis
                    dataKey="date"
                    className="fill-secondary-500 dark:fill-secondary-400"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    className="fill-secondary-500 dark:fill-secondary-400"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg, #fff)',
                      borderColor: 'var(--tooltip-border, #e5e7eb)',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="healthScore"
                    name="Health Score"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#8b5cf6' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="engagement"
                    name="Engagement"
                    stroke="#22c55e"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="performance"
                    name="Performance"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700 text-center py-12">
            <ArrowTrendingUpIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
            <p className="mt-2 text-secondary-500 dark:text-secondary-400">
              Not enough historical data to show trends yet. Check back after the next measurement period.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
