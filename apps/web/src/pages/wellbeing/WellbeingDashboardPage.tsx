import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  HeartIcon,
  FaceSmileIcon,
  FireIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';

import { usePageTitle } from '@/hooks/usePageTitle';
import { pulseApi, engagementApi, healthApi } from '@/lib/api';
import type { AtRiskEmployee } from '@/lib/api';
import { BurnoutRiskChart } from './BurnoutRiskChart';
import { MoodFaceIcon } from '@/components/ui/MoodFaceIcon';

// ── Helpers ──────────────────────────────────────────────────────────────────

const MOOD_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

const MOOD_EMOJI: Record<number, string> = { 1: '😢', 2: '😟', 3: '😐', 4: '😊', 5: '🤩' };

function stressColor(s: number): string {
  if (s >= 4) return 'text-red-600 dark:text-red-400';
  if (s >= 3) return 'text-amber-600 dark:text-amber-400';
  return 'text-green-600 dark:text-green-400';
}

const RISK_BADGE: Record<string, { bg: string; text: string }> = {
  HIGH: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  MEDIUM: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  LOW: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-xl px-3 py-2 shadow-2xl text-xs space-y-1">
      <p className="font-medium text-slate-300">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : Number(entry.value ?? 0).toFixed(2)}
        </p>
      ))}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 h-20">
            <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-16 mb-2" />
            <div className="h-6 bg-secondary-200 dark:bg-secondary-700 rounded w-12" />
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6 h-80">
        <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-40 mb-4" />
        <div className="h-60 bg-secondary-100 dark:bg-secondary-700/50 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6 h-72" />
        ))}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function WellbeingDashboardPage() {
  usePageTitle('Wellbeing & Burnout');

  const [daysRange, setDaysRange] = useState<30 | 60 | 90>(30);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['wellbeing', 'overview', daysRange],
    queryFn: () => pulseApi.getAnalyticsOverview({ days: daysRange }),
    staleTime: 60_000,
  });

  const { data: trends = [], isLoading: loadingTrends } = useQuery({
    queryKey: ['wellbeing', 'trends', daysRange],
    queryFn: () => pulseApi.getAnalyticsTrends({ days: daysRange }),
    staleTime: 60_000,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['wellbeing', 'departments'],
    queryFn: () => pulseApi.getAnalyticsDepartments(),
    staleTime: 60_000,
  });

  const { data: distribution } = useQuery({
    queryKey: ['wellbeing', 'distribution', daysRange],
    queryFn: () => pulseApi.getAnalyticsDistribution({ days: daysRange }),
    staleTime: 60_000,
  });

  const { data: atRiskEmployees = [] } = useQuery<AtRiskEmployee[]>({
    queryKey: ['wellbeing', 'at-risk'],
    queryFn: () => engagementApi.getAtRisk({ limit: 20 }),
    staleTime: 60_000,
  });

  const { data: healthData } = useQuery({
    queryKey: ['wellbeing', 'health'],
    queryFn: () => healthApi.getLatest(),
    staleTime: 60_000,
  });

  const isLoading = loadingOverview || loadingTrends;

  // ── Computed ───────────────────────────────────────────────────────────────

  const burnoutData = useMemo(() => {
    return trends
      .filter((t) => t.averageEnergy != null && t.averageStress != null)
      .map((t) => ({
        date: (() => { try { return format(parseISO(t.date), 'MMM d'); } catch { return t.date; } })(),
        energy: t.averageEnergy,
        stress: t.averageStress,
      }));
  }, [trends]);

  const trendChartData = useMemo(() => {
    return trends.map((t) => ({
      ...t,
      label: (() => { try { return format(parseISO(t.date), 'MMM d'); } catch { return t.date; } })(),
    }));
  }, [trends]);

  const deptBarData = useMemo(() => {
    return [...departments].sort((a, b) => b.averageMood - a.averageMood);
  }, [departments]);

  const moodDistData = useMemo(() => {
    if (!distribution) return [];
    return Object.entries(distribution).map(([key, value]) => ({
      name: `Mood ${key}`,
      value: value as number,
      score: parseInt(key, 10),
    }));
  }, [distribution]);

  const TrendIcon = overview?.trendDirection === 'IMPROVING'
    ? ArrowTrendingUpIcon
    : overview?.trendDirection === 'DECLINING'
      ? ArrowTrendingDownIcon
      : MinusIcon;

  const trendColor = overview?.trendDirection === 'IMPROVING'
    ? 'text-green-600 dark:text-green-400'
    : overview?.trendDirection === 'DECLINING'
      ? 'text-red-600 dark:text-red-400'
      : 'text-secondary-500 dark:text-secondary-400';

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Wellbeing & Burnout Dashboard</h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">Loading wellbeing data...</p>
        </div>
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Wellbeing & Burnout Dashboard</h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
            Monitor team wellness, mood trends, and burnout risk indicators
          </p>
        </div>
        <div className="flex items-center bg-secondary-100 dark:bg-secondary-700 rounded-lg p-0.5">
          {([30, 60, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDaysRange(d)}
              className={clsx(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                daysRange === d
                  ? 'bg-white dark:bg-secondary-600 text-secondary-900 dark:text-white shadow-sm'
                  : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300'
              )}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center gap-2">
            <HeartIcon className="h-4 w-4 text-pink-500" />
            <p className="text-[10px] text-secondary-500 dark:text-secondary-400 font-medium">Wellbeing</p>
          </div>
          <p className="text-xl font-bold text-secondary-900 dark:text-white mt-1">{healthData?.wellbeingScore != null ? Number(healthData.wellbeingScore).toFixed(0) : '-'}</p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center gap-2">
            <FaceSmileIcon className="h-4 w-4 text-amber-500" />
            <p className="text-[10px] text-secondary-500 dark:text-secondary-400 font-medium">Average Mood</p>
          </div>
          <p className="text-xl font-bold text-secondary-900 dark:text-white mt-1 flex items-center gap-2">
            {overview?.averageMood != null ? Number(overview.averageMood).toFixed(1) : '-'}
            {overview?.averageMood ? (
              <MoodFaceIcon
                score={Math.round(Math.max(1, Math.min(5, overview.averageMood))) as 1|2|3|4|5}
                className="w-6 h-6"
              />
            ) : null}
          </p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center gap-2">
            <FireIcon className="h-4 w-4 text-red-500" />
            <p className="text-[10px] text-secondary-500 dark:text-secondary-400 font-medium">Average Stress</p>
          </div>
          <p className={clsx('text-xl font-bold mt-1', stressColor(overview?.averageStress ?? 0))}>
            {overview?.averageStress != null ? Number(overview.averageStress).toFixed(1) : '-'}
          </p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
            <p className="text-[10px] text-secondary-500 dark:text-secondary-400 font-medium">Burnout Risk</p>
          </div>
          <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{healthData?.flightRiskCount ?? 0}</p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center gap-2">
            <UserGroupIcon className="h-4 w-4 text-blue-500" />
            <p className="text-[10px] text-secondary-500 dark:text-secondary-400 font-medium">Participation</p>
          </div>
          <p className="text-xl font-bold text-secondary-900 dark:text-white mt-1">
            {overview?.participationRate != null ? `${Number(overview.participationRate).toFixed(0)}%` : '-'}
          </p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center gap-2">
            <TrendIcon className={clsx('h-4 w-4', trendColor)} />
            <p className="text-[10px] text-secondary-500 dark:text-secondary-400 font-medium">Trend</p>
          </div>
          <p className={clsx('text-lg font-bold mt-1', trendColor)}>
            {overview?.trendDirection?.replace('_', ' ') || 'Stable'}
          </p>
        </div>
      </div>

      {/* Mood/Energy/Stress Trend */}
      {trendChartData.length > 0 && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Mood, Energy & Stress Trends</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">Last {daysRange} days — scale 1 to 5</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-secondary-200, #e5e7eb)" opacity={0.5} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[1, 5]}
                  tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} content={ChartTooltip} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="averageMood" name="Mood" stroke="#8b5cf6" fill="url(#moodGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="averageEnergy" name="Energy" stroke="#f59e0b" fill="url(#energyGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="averageStress" name="Stress" stroke="#ef4444" fill="url(#stressGrad)" strokeWidth={2} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Burnout Risk + Department Wellness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BurnoutRiskChart data={burnoutData} />

        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Department Wellness</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">Average mood score by department</p>
          {deptBarData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptBarData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-secondary-200, #e5e7eb)" opacity={0.5} />
                  <XAxis
                    type="number"
                    domain={[0, 5]}
                    tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="departmentName"
                    tick={{ fontSize: 10, fill: 'var(--color-secondary-500, #6b7280)' }}
                    axisLine={false}
                    tickLine={false}
                    width={100}
                  />
                  <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} content={ChartTooltip} />
                  <Bar dataKey="averageMood" name="Average Mood" radius={[0, 6, 6, 0]} maxBarSize={20}>
                    {deptBarData.map((d, i) => (
                      <Cell key={i} fill={d.averageMood >= 4 ? '#22c55e' : d.averageMood >= 3 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-secondary-400 text-center py-16">No department data available.</p>
          )}
        </div>
      </div>

      {/* At-Risk Employees */}
      {atRiskEmployees.length > 0 && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700">
          <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
            <h3 className="text-base font-semibold text-secondary-900 dark:text-white">At-Risk Employees</h3>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{atRiskEmployees.length} employees showing engagement concerns</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
              <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400">Department</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">Score</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">Risk Level</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">Trend</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400">Risk Factors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700">
                {atRiskEmployees.slice(0, 10).map((emp) => {
                  const badge = RISK_BADGE[emp.riskLevel || ''] || RISK_BADGE.LOW;
                  return (
                    <tr key={emp.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/30 transition-colors">
                      <td className="px-6 py-3">
                        <div>
                          <p className="text-sm font-medium text-secondary-900 dark:text-white">{emp.firstName} {emp.lastName}</p>
                          <p className="text-[10px] text-secondary-400">{emp.jobTitle || 'No title'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-secondary-600 dark:text-secondary-400">{emp.department || '-'}</td>
                      <td className="px-6 py-3 text-center">
                        <span className="text-sm font-semibold text-secondary-900 dark:text-white">{Number(emp.overallScore ?? 0).toFixed(1)}</span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={clsx('inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full', badge.bg, badge.text)}>
                          {emp.riskLevel || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        {emp.trendDirection === 'DECLINING' && <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mx-auto" />}
                        {emp.trendDirection === 'IMPROVING' && <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mx-auto" />}
                        {(!emp.trendDirection || emp.trendDirection === 'STABLE') && <MinusIcon className="h-4 w-4 text-secondary-400 mx-auto" />}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(emp.riskFactors as any[] || []).slice(0, 3).map((f: any, i: number) => (
                            <span key={i} className="inline-flex px-1.5 py-0.5 text-[9px] bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-400 rounded">
                              {typeof f === 'string' ? f : f?.factor || f?.name || 'factor'}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mood Distribution + Wellbeing Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mood Distribution Donut */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Mood Distribution</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">How team members are feeling overall</p>
          {moodDistData.length > 0 ? (
            <div className="relative h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={moodDistData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {moodDistData.map((d, i) => (
                      <Cell key={i} fill={MOOD_COLORS[d.score - 1] || '#9ca3af'} />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-xl px-3 py-2 shadow-2xl text-xs">
                          <p className="font-semibold text-white">{MOOD_EMOJI[d.score] || ''} Mood {d.score}</p>
                          <p className="text-slate-300">{d.value} responses</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-secondary-900 dark:text-white">
                  {overview?.totalResponses ?? 0}
                </span>
                <span className="text-[10px] text-secondary-500 dark:text-secondary-400">Responses</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-secondary-400 text-center py-16">No mood distribution data.</p>
          )}
          <div className="flex justify-center gap-3 mt-2">
            {MOOD_COLORS.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[10px] text-secondary-500">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                {MOOD_EMOJI[i + 1]}
              </span>
            ))}
          </div>
        </div>

        {/* Wellbeing Insights */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">Wellbeing Insights</h3>
          <div className="space-y-6">
            {/* Strengths */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheckIcon className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Strengths</span>
              </div>
              {(healthData?.strengths ?? []).length > 0 ? (
                <ul className="space-y-1.5">
                  {healthData!.strengths.slice(0, 5).map((s, i) => (
                    <li key={i} className="text-xs text-secondary-600 dark:text-secondary-400 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-secondary-400">No strengths data available.</p>
              )}
            </div>

            {/* Concerns */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <LightBulbIcon className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Areas of Concern</span>
              </div>
              {(healthData?.concerns ?? []).length > 0 ? (
                <ul className="space-y-1.5">
                  {healthData!.concerns.slice(0, 5).map((c, i) => (
                    <li key={i} className="text-xs text-secondary-600 dark:text-secondary-400 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-secondary-400">No concerns identified.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
