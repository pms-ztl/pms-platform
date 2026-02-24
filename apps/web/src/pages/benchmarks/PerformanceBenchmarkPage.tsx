import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  ChartBarSquareIcon,
  PlusIcon,
  XMarkIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UserGroupIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  aiInsightsApi,
  type BenchmarkComparison,
  type TeamBenchmarkSummary,
} from '@/lib/api/ai-insights';
import { usePageTitle } from '@/hooks/usePageTitle';

// ── constants ────────────────────────────────────────────────────────────────

const PERCENTILE_COLORS: Record<string, string> = {
  top: 'text-green-600 dark:text-green-400',
  mid: 'text-amber-600 dark:text-amber-400',
  low: 'text-red-600 dark:text-red-400',
};

const percentileColor = (p: number) =>
  p >= 75 ? PERCENTILE_COLORS.top : p >= 40 ? PERCENTILE_COLORS.mid : PERCENTILE_COLORS.low;

const DEPT_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#7c3aed', '#4f46e5', '#4338ca'];

// ── component ────────────────────────────────────────────────────────────────

export function PerformanceBenchmarkPage() {
  usePageTitle('Performance Benchmarks');
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ benchmarkName: '', department: '', level: '' });

  // ── queries ─────────────────────────────────────────────────────────────

  const { data: summaryRaw, isLoading: loadingSummary } = useQuery({
    queryKey: ['benchmarks', 'team-summary'],
    queryFn: () => aiInsightsApi.getTeamBenchmarkSummary(),
    staleTime: 60_000,
  });

  const { data: comparisonsRaw, isLoading: loadingComparisons } = useQuery({
    queryKey: ['benchmarks', 'comparisons'],
    queryFn: () => aiInsightsApi.getUserComparisons(),
    staleTime: 60_000,
  });

  const isLoading = loadingSummary || loadingComparisons;

  // ── normalize ───────────────────────────────────────────────────────────

  const summary: TeamBenchmarkSummary | null = useMemo(() => {
    const raw = (summaryRaw as any)?.data ?? summaryRaw;
    if (!raw || (!raw.benchmarkId && !raw.benchmarkName)) return null;
    return {
      benchmarkId: raw.benchmarkId ?? '',
      benchmarkName: raw.benchmarkName ?? 'Team Benchmark',
      teamAvg: raw.teamAvg ?? 0,
      orgAvg: raw.orgAvg ?? 0,
      dimensions: Array.isArray(raw.dimensions) ? raw.dimensions : [],
      comparisons: Array.isArray(raw.comparisons) ? raw.comparisons : [],
    };
  }, [summaryRaw]);

  const comparisons: BenchmarkComparison[] = useMemo(() => {
    const raw = (comparisonsRaw as any)?.data ?? comparisonsRaw;
    return Array.isArray(raw) ? raw : [];
  }, [comparisonsRaw]);

  // ── derived stats ─────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const aboveBenchmark = comparisons.filter((c) => c.delta > 0).length;
    const avgScore = comparisons.length
      ? Math.round((comparisons.reduce((s, c) => s + c.score, 0) / comparisons.length) * 10) / 10
      : 0;
    return {
      totalBenchmarks: summary ? 1 : 0,
      comparisonsRun: comparisons.length,
      abovePct: comparisons.length ? Math.round((aboveBenchmark / comparisons.length) * 100) : 0,
      avgScore,
    };
  }, [summary, comparisons]);

  // ── chart data ────────────────────────────────────────────────────────

  const radarData = useMemo(() => {
    if (!summary?.dimensions?.length) return [];
    return summary.dimensions.map((d) => ({
      dimension: d.name,
      team: Math.round(d.teamAvg * 10) / 10,
      benchmark: Math.round(d.orgAvg * 10) / 10,
    }));
  }, [summary]);

  const deptBarData = useMemo(() => {
    if (!comparisons.length) return [];
    const deptMap: Record<string, { scores: number[]; benchmarks: number[] }> = {};
    comparisons.forEach((c) => {
      const dept = c.department || 'Unknown';
      if (!deptMap[dept]) deptMap[dept] = { scores: [], benchmarks: [] };
      deptMap[dept].scores.push(c.score);
      deptMap[dept].benchmarks.push(c.benchmarkScore);
    });
    return Object.entries(deptMap)
      .map(([dept, vals]) => ({
        department: dept,
        avgScore: Math.round((vals.scores.reduce((a, b) => a + b, 0) / vals.scores.length) * 10) / 10,
        benchmark: Math.round((vals.benchmarks.reduce((a, b) => a + b, 0) / vals.benchmarks.length) * 10) / 10,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [comparisons]);

  const distributionData = useMemo(() => {
    if (!comparisons.length) return [];
    const buckets: Record<string, number> = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    comparisons.forEach((c) => {
      const p = c.percentile;
      if (p <= 20) buckets['0-20']++;
      else if (p <= 40) buckets['21-40']++;
      else if (p <= 60) buckets['41-60']++;
      else if (p <= 80) buckets['61-80']++;
      else buckets['81-100']++;
    });
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [comparisons]);

  // ── mutations ─────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: { benchmarkName: string; department?: string; level?: number }) =>
      aiInsightsApi.createBenchmark(data),
    onSuccess: () => {
      toast.success('Benchmark created');
      queryClient.invalidateQueries({ queryKey: ['benchmarks'] });
      setShowCreateModal(false);
      setCreateForm({ benchmarkName: '', department: '', level: '' });
    },
    onError: () => toast.error('Failed to create benchmark'),
  });

  // ── tooltip ───────────────────────────────────────────────────────────

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-xl px-3 py-2 shadow-2xl text-xs space-y-1">
        <p className="font-semibold text-white">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color || p.fill }}>
            {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
          </p>
        ))}
      </div>
    );
  };

  // ── skeleton ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-72 rounded bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-72 rounded-xl bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
          <div className="h-72 rounded-xl bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
        </div>
        <div className="h-64 rounded-xl bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
      </div>
    );
  }

  // ── empty state ───────────────────────────────────────────────────────

  const hasData = summary || comparisons.length > 0;

  if (!hasData) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900 dark:text-white flex items-center gap-2">
              <ChartBarSquareIcon className="w-6 h-6 text-indigo-500" />
              Performance Benchmarks
            </h1>
            <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
              Compare team and individual performance against organizational benchmarks
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Create Benchmark
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-24">
          <ChartBarSquareIcon className="w-16 h-16 text-secondary-300 dark:text-secondary-600 mb-4" />
          <h3 className="text-lg font-semibold text-secondary-700 dark:text-secondary-300 mb-2">No benchmarks yet</h3>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 text-center max-w-md">
            Create your first performance benchmark to start comparing team and individual scores against organizational standards.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Create Benchmark
          </button>
        </div>
        {renderCreateModal()}
      </div>
    );
  }

  // ── main render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white flex items-center gap-2">
            <ChartBarSquareIcon className="w-6 h-6 text-indigo-500" />
            Performance Benchmarks
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
            Compare team and individual performance against organizational benchmarks
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Create Benchmark
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Benchmarks', value: stats.totalBenchmarks, icon: ChartBarSquareIcon, color: 'text-indigo-600 dark:text-indigo-400' },
          { label: 'Comparisons Run', value: stats.comparisonsRun, icon: UserGroupIcon, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Above Benchmark', value: `${stats.abovePct}%`, icon: TrophyIcon, color: stats.abovePct >= 50 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400' },
          { label: 'Team Average Score', value: summary?.teamAvg?.toFixed(1) ?? (stats.avgScore ?? 0).toFixed(1), icon: ArrowTrendingUpIcon, color: 'text-purple-600 dark:text-purple-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-secondary-500 dark:text-secondary-400">{s.label}</p>
              <s.icon className={clsx('w-4 h-4', s.color)} />
            </div>
            <p className={clsx('text-2xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* RadarChart — Team vs Org Benchmark */}
      {radarData.length > 0 && (
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">
            Team vs Organization Benchmark
          </h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">
            {summary?.benchmarkName || 'Benchmark'} — multi-dimension comparison
          </p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="var(--color-secondary-300, #d1d5db)" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fontSize: 11, fill: 'var(--color-secondary-500, #6b7280)' }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: 'var(--color-secondary-400, #9ca3af)' }}
                />
                <Radar
                  name="Team Average"
                  dataKey="team"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.3}
                />
                <Radar
                  name="Org Benchmark"
                  dataKey="benchmark"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.15}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  iconType="circle"
                />
                <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} content={<ChartTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 2-col: Department comparison + Score distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Department comparison */}
        {deptBarData.length > 0 && (
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
            <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">
              Department Comparison
            </h3>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">
              Average scores by department vs benchmark
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={deptBarData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, bottom: 5, left: 60 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-secondary-200, #e5e7eb)"
                    opacity={0.5}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="department"
                    tick={{ fontSize: 10, fill: 'var(--color-secondary-500, #6b7280)' }}
                    axisLine={false}
                    tickLine={false}
                    width={55}
                  />
                  <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} content={<ChartTooltip />} />
                  <Bar dataKey="avgScore" name="Department Average" fill="#6366f1" barSize={14} radius={[0, 4, 4, 0]}>
                    {deptBarData.map((_, i) => (
                      <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                    ))}
                  </Bar>
                  <ReferenceLine
                    x={summary?.orgAvg ?? deptBarData[0]?.benchmark ?? 50}
                    stroke="#f59e0b"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    label={{ value: 'Benchmark', position: 'top', fontSize: 10, fill: '#f59e0b' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Score distribution histogram */}
        {distributionData.length > 0 && (
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
            <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">
              Percentile Distribution
            </h3>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">
              How employees rank across percentile ranges
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-secondary-200, #e5e7eb)"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Employees" barSize={40} radius={[6, 6, 0, 0]}>
                    {distributionData.map((entry, i) => {
                      const colors = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#6366f1'];
                      return <Cell key={i} fill={colors[i % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Comparison results table */}
      <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
        <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">
          Individual Comparisons
        </h3>
        {comparisons.length === 0 ? (
          <div className="text-center py-16 text-secondary-400 text-sm">
            No individual comparison data available yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-200/60 dark:border-white/[0.06]">
                  {['Employee', 'Department', 'Score', 'Benchmark', 'Delta', 'Percentile'].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 pb-2 pr-4"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisons.map((c) => {
                  const deltaPositive = c.delta > 0;
                  return (
                    <tr
                      key={c.userId}
                      className="border-b border-secondary-100 dark:border-secondary-700/50 last:border-0"
                    >
                      <td className="py-2.5 pr-4 text-xs font-medium text-secondary-900 dark:text-white">
                        {c.userName || c.userId}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-secondary-500 dark:text-secondary-400">
                        {c.department || '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-xs font-semibold text-secondary-900 dark:text-white">
                        {(c.score ?? 0).toFixed(1)}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-secondary-500 dark:text-secondary-400">
                        {(c.benchmarkScore ?? 0).toFixed(1)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-0.5 text-xs font-medium',
                            deltaPositive
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          )}
                        >
                          {deltaPositive ? (
                            <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowTrendingDownIcon className="w-3.5 h-3.5" />
                          )}
                          {deltaPositive ? '+' : ''}
                          {(c.delta ?? 0).toFixed(1)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-secondary-200 dark:bg-secondary-600 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-indigo-500"
                              style={{ width: `${Math.min(c.percentile, 100)}%` }}
                            />
                          </div>
                          <span className={clsx('text-xs font-medium', percentileColor(c.percentile))}>
                            P{Math.round(c.percentile)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create benchmark modal */}
      {renderCreateModal()}
    </div>
  );

  // ── modal renderer ────────────────────────────────────────────────────

  function renderCreateModal() {
    if (!showCreateModal) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between p-6 border-b border-secondary-200/60 dark:border-white/[0.06]">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Create Benchmark</h3>
            <button
              onClick={() => {
                setShowCreateModal(false);
                setCreateForm({ benchmarkName: '', department: '', level: '' });
              }}
              className="text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Benchmark Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={createForm.benchmarkName}
                onChange={(e) => setCreateForm((p) => ({ ...p, benchmarkName: e.target.value }))}
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g. Q1 2026 Engineering Benchmark"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Department <span className="text-secondary-400">(optional)</span>
              </label>
              <input
                type="text"
                value={createForm.department}
                onChange={(e) => setCreateForm((p) => ({ ...p, department: e.target.value }))}
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g. Engineering, Sales"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Level <span className="text-secondary-400">(optional)</span>
              </label>
              <input
                type="number"
                value={createForm.level}
                onChange={(e) => setCreateForm((p) => ({ ...p, level: e.target.value }))}
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g. 1, 2, 3"
                min={1}
                max={10}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 p-6 border-t border-secondary-200/60 dark:border-white/[0.06]">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setCreateForm({ benchmarkName: '', department: '', level: '' });
              }}
              className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!createForm.benchmarkName.trim()) {
                  toast.error('Benchmark name is required');
                  return;
                }
                createMutation.mutate({
                  benchmarkName: createForm.benchmarkName.trim(),
                  department: createForm.department.trim() || undefined,
                  level: createForm.level ? Number(createForm.level) : undefined,
                });
              }}
              disabled={createMutation.isPending || !createForm.benchmarkName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Benchmark'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
