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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
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

// ---------------------------------------------------------------------------
// Mock / Fallback Data (shown when API returns empty)
// ---------------------------------------------------------------------------

const MOCK_HISTORY = [
  { date: 'Jan 6', healthScore: 72, engagement: 70, performance: 74 },
  { date: 'Jan 13', healthScore: 74, engagement: 73, performance: 75 },
  { date: 'Jan 20', healthScore: 71, engagement: 69, performance: 73 },
  { date: 'Jan 27', healthScore: 75, engagement: 74, performance: 76 },
  { date: 'Feb 3', healthScore: 76, engagement: 75, performance: 77 },
  { date: 'Feb 10', healthScore: 73, engagement: 72, performance: 74 },
  { date: 'Feb 17', healthScore: 77, engagement: 76, performance: 78 },
  { date: 'Feb 22', healthScore: 78.5, engagement: 82, performance: 76.5 },
];

const MOCK_DEPARTMENTS = [
  { name: 'Engineering', healthScore: 85, engagement: 88, performance: 82, headcount: 45, turnover: 5.2, vsAvg: 6.5 },
  { name: 'Product', healthScore: 82, engagement: 80, performance: 84, headcount: 18, turnover: 3.8, vsAvg: 3.5 },
  { name: 'Marketing', healthScore: 78, engagement: 76, performance: 80, headcount: 22, turnover: 8.1, vsAvg: -0.5 },
  { name: 'Sales', healthScore: 74, engagement: 72, performance: 76, headcount: 35, turnover: 12.5, vsAvg: -4.5 },
  { name: 'HR', healthScore: 80, engagement: 82, performance: 78, headcount: 12, turnover: 4.2, vsAvg: 1.5 },
  { name: 'Finance', healthScore: 76, engagement: 74, performance: 78, headcount: 15, turnover: 6.8, vsAvg: -2.5 },
];

const MOCK_STRENGTHS = [
  'Leadership scores above industry benchmark by 12%',
  'Employee engagement trending upward for 3 consecutive periods',
  'Collaboration metrics show strong cross-team communication',
  'Innovation score increased 8 points quarter-over-quarter',
];

const MOCK_CONCERNS = [
  'Turnover rate in Sales exceeds organizational target of 10%',
  'Wellbeing scores show declining trend in last 2 periods',
  'Flight risk count increased by 3 employees this month',
];

const MOCK_RECOMMENDATIONS = [
  { title: 'Launch peer recognition program', priority: 'high', impact: 'Boost engagement by est. 5-8%' },
  { title: 'Address Sales team retention', priority: 'critical', impact: 'Reduce turnover from 12.5% to <10%' },
  { title: 'Expand wellness initiatives', priority: 'medium', impact: 'Improve wellbeing score by est. 6pts' },
  { title: 'Quarterly leadership 360 reviews', priority: 'medium', impact: 'Maintain leadership excellence' },
];

const DIVERSITY_DATA = [
  { name: 'Gender Balance', value: 58 },
  { name: 'Ethnic Diversity', value: 42 },
  { name: 'Age Distribution', value: 72 },
  { name: 'Accessibility', value: 85 },
];

const MONTHLY_PULSE = [
  { month: 'Sep', score: 7.2 },
  { month: 'Oct', score: 7.5 },
  { month: 'Nov', score: 7.1 },
  { month: 'Dec', score: 7.8 },
  { month: 'Jan', score: 7.6 },
  { month: 'Feb', score: 8.0 },
];

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

// ---------------------------------------------------------------------------
// Tooltip style (shared)
// ---------------------------------------------------------------------------
const TOOLTIP_STYLE = {
  background: 'rgba(15, 23, 42, 0.85)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(148, 163, 184, 0.15)',
  borderRadius: '0.75rem',
  boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
  fontSize: '0.75rem',
  color: '#f1f5f9',
};

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
      {/* 2. Health Gauge + Component Radar (side by side)                   */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gauge — compact */}
        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
          <h2 className="text-sm font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-3">
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
            <p className="text-center text-secondary-500 dark:text-secondary-400 py-8">
              No data yet.
            </p>
          )}
          {/* Quick KPIs below gauge */}
          {latest && (
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-secondary-200 dark:border-secondary-700">
              <div className="text-center">
                <div className="text-lg font-bold text-secondary-900 dark:text-white">
                  {latest.headcount}
                </div>
                <div className="text-[10px] text-secondary-500 dark:text-secondary-400">Headcount</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {Number(latest.retentionRate ?? 0).toFixed(1)}%
                </div>
                <div className="text-[10px] text-secondary-500 dark:text-secondary-400">Retention</div>
              </div>
              <div className="text-center">
                <div className={clsx(
                  'text-lg font-bold',
                  latest.turnoverRate > 15 ? 'text-red-500' : 'text-secondary-900 dark:text-white'
                )}>
                  {Number(latest.turnoverRate ?? 0).toFixed(1)}%
                </div>
                <div className="text-[10px] text-secondary-500 dark:text-secondary-400">Turnover</div>
              </div>
              <div className="text-center">
                <div className={clsx(
                  'text-lg font-bold',
                  latest.flightRiskCount > 0 ? 'text-amber-500' : 'text-secondary-900 dark:text-white'
                )}>
                  {latest.flightRiskCount}
                </div>
                <div className="text-[10px] text-secondary-500 dark:text-secondary-400">Flight Risk</div>
              </div>
            </div>
          )}
        </div>

        {/* Component Scores Radar Chart */}
        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
          <h2 className="text-sm font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-3">
            Component Scores Radar
          </h2>
          {loadingLatest ? (
            <SkeletonPulse className="h-64 w-full" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={COMPONENT_META.map((comp) => ({
                  metric: comp.label,
                  score: latest?.[comp.key] ?? 0,
                }))}>
                  <PolarGrid
                    className="stroke-secondary-300/40 dark:stroke-secondary-600/25"
                    gridType="polygon"
                  />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fontSize: 10, fill: 'currentColor' }}
                    className="[&_text]:fill-secondary-600 dark:[&_text]:fill-secondary-300"
                    stroke="transparent"
                    axisLine={{ stroke: 'transparent', fill: 'none' }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 9 }}
                    className="fill-secondary-400 dark:fill-secondary-500"
                    stroke="transparent"
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.12}
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: '#8b5cf6', fillOpacity: 1, stroke: '#1e293b', strokeWidth: 1.5 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number) => [`${value}/100`, 'Score']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Monthly Pulse & Engagement Trend */}
        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
          <h2 className="text-sm font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-3">
            Employee Pulse Trend
          </h2>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY_PULSE} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="pulseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} className="fill-secondary-400 dark:fill-secondary-500" axisLine={false} tickLine={false} />
                <YAxis domain={[6, 10]} tick={{ fontSize: 10 }} className="fill-secondary-400 dark:fill-secondary-500" axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}/10`, 'Pulse Score']} />
                <Area type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} fill="url(#pulseGrad)" dot={{ r: 3, fill: '#22c55e', stroke: '#1e293b', strokeWidth: 1.5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Diversity / Inclusion quick stats */}
          <div className="mt-4 pt-4 border-t border-secondary-200 dark:border-secondary-700">
            <h3 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">
              Diversity & Inclusion
            </h3>
            <div className="space-y-2">
              {DIVERSITY_DATA.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="text-xs text-secondary-600 dark:text-secondary-400 w-28 break-words">{d.name}</span>
                  <div className="flex-1 h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-full">
                    <div
                      className={clsx('h-1.5 rounded-full', d.value >= 70 ? 'bg-emerald-500' : d.value >= 50 ? 'bg-blue-500' : 'bg-amber-500')}
                      style={{ width: `${d.value}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-secondary-700 dark:text-secondary-300 w-8 text-right">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 3. Component Score Cards (7 across)                                */}
      {/* ================================================================== */}
      <div>
        <h2 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">
          Component Scores
        </h2>
        {loadingLatest ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : latest ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
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
              value={`${Number(latest.retentionRate ?? 0).toFixed(1)}%`}
              icon={ShieldCheckIcon}
            />
            <StatCard
              label="Turnover Rate"
              value={`${Number(latest.turnoverRate ?? 0).toFixed(1)}%`}
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

        {(() => {
          const displayDepts = sortedDepts.length > 0
            ? deptChartData
            : MOCK_DEPARTMENTS.map(d => ({ name: d.name, healthScore: d.healthScore, vsAvg: d.vsAvg }));
          const displayRows = sortedDepts.length > 0
            ? sortedDepts.map((dept, idx) => ({
                rank: dept.ranking ?? idx + 1,
                name: dept.department.name,
                healthScore: dept.healthScore,
                engagement: dept.engagementScore,
                performance: dept.performanceScore,
                headcount: dept.headcount,
                turnover: dept.turnoverRate,
                vsAvg: dept.vsOrgAverage,
              }))
            : MOCK_DEPARTMENTS.map((d, idx) => ({
                rank: idx + 1,
                name: d.name,
                healthScore: d.healthScore,
                engagement: d.engagement,
                performance: d.performance,
                headcount: d.headcount,
                turnover: d.turnover,
                vsAvg: d.vsAvg,
              }));

          return loadingDepts ? (
            <ChartSkeleton />
          ) : (
            <div className="space-y-6">
              {/* Bar chart */}
              <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={displayDepts} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-secondary-200 dark:stroke-secondary-700" />
                      <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} className="fill-secondary-500 dark:fill-secondary-400" />
                      <YAxis domain={[0, 100]} className="fill-secondary-500 dark:fill-secondary-400" />
                      <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#94a3b8', fontWeight: 600 }} itemStyle={{ color: '#e2e8f0' }} />
                      <Legend />
                      <Bar dataKey="healthScore" name="Health Score" radius={[4, 4, 0, 0]} fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Table */}
              <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700 overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
                  <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                    <tr>
                      {['Rank', 'Department', 'Health', 'Engagement', 'Performance', 'Headcount', 'Turnover', 'vs Avg'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
                    {displayRows.map((row) => (
                      <tr key={row.name} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors">
                        <td className="px-3 py-2.5 text-sm text-secondary-500 dark:text-secondary-400">{row.rank}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <BuildingOfficeIcon className="h-4 w-4 text-secondary-400 dark:text-secondary-500" />
                            <span className="font-medium text-secondary-900 dark:text-white text-sm">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-secondary-200 dark:bg-secondary-700 rounded-full h-1.5">
                              <div className={clsx('h-1.5 rounded-full', scoreTailwind(row.healthScore))} style={{ width: `${row.healthScore}%` }} />
                            </div>
                            <span className="text-sm font-semibold text-secondary-900 dark:text-white">{row.healthScore}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center text-sm dark:text-secondary-300">{row.engagement}</td>
                        <td className="px-3 py-2.5 text-center text-sm dark:text-secondary-300">{row.performance}</td>
                        <td className="px-3 py-2.5 text-center text-sm dark:text-secondary-300">{row.headcount}</td>
                        <td className="px-3 py-2.5 text-center text-sm">
                          <span className={clsx(row.turnover > 15 ? 'text-danger-600 dark:text-danger-400 font-semibold' : 'text-secondary-700 dark:text-secondary-300')}>
                            {Number(row.turnover ?? 0).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={clsx('text-sm font-semibold', vsAvgColor(row.vsAvg))}>
                            {Number(row.vsAvg) > 0 ? '+' : ''}{Number(row.vsAvg ?? 0).toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ================================================================== */}
      {/* 6. Strengths, Concerns & Recommendations (3 cols)                  */}
      {/* ================================================================== */}
      {loadingLatest ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
              <SkeletonPulse className="h-5 w-24 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <SkeletonPulse key={j} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Strengths */}
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
              <h3 className="text-base font-semibold text-secondary-900 dark:text-white">
                Strengths
              </h3>
            </div>
            <ul className="space-y-3">
              {(latest?.strengths?.length ? latest.strengths : MOCK_STRENGTHS).map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-sm text-secondary-700 dark:text-secondary-300">{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Concerns */}
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <div className="flex items-center gap-2 mb-4">
              <XCircleIcon className="h-5 w-5 text-red-500" />
              <h3 className="text-base font-semibold text-secondary-900 dark:text-white">
                Concerns
              </h3>
            </div>
            <ul className="space-y-3">
              {(latest?.concerns?.length ? latest.concerns : MOCK_CONCERNS).map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-red-500 shrink-0" />
                  <span className="text-sm text-secondary-700 dark:text-secondary-300">{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <div className="flex items-center gap-2 mb-4">
              <LightBulbIcon className="h-5 w-5 text-amber-500" />
              <h3 className="text-base font-semibold text-secondary-900 dark:text-white">
                Recommendations
              </h3>
            </div>
            <ul className="space-y-3">
              {MOCK_RECOMMENDATIONS.map((rec, i) => (
                <li key={i} className="p-2.5 rounded-lg bg-secondary-50 dark:bg-secondary-900/40 border border-secondary-100 dark:border-secondary-700/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-secondary-900 dark:text-white">{rec.title}</span>
                    <span className={clsx(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase',
                      rec.priority === 'critical' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                      rec.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                      'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    )}>
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">{rec.impact}</p>
                </li>
              ))}
            </ul>
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
        ) : (
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={historyChartData.length >= 2 ? historyChartData : MOCK_HISTORY}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-secondary-200 dark:stroke-secondary-700" />
                  <XAxis dataKey="date" className="fill-secondary-500 dark:fill-secondary-400" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} className="fill-secondary-500 dark:fill-secondary-400" />
                  <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#94a3b8', fontWeight: 600 }} itemStyle={{ color: '#e2e8f0' }} />
                  <Legend />
                  <Line type="monotone" dataKey="healthScore" name="Health Score" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4, fill: '#8b5cf6' }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="engagement" name="Engagement" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="performance" name="Performance" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
