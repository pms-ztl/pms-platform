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
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  HeartIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  actionableInsightsApi,
  type OrgHealthMetrics,
  type CultureDiagnostic,
} from '@/lib/api/actionable-insights';
import { usePageTitle } from '@/hooks/usePageTitle';

// ── constants ────────────────────────────────────────────────────────────────

const HEALTH_LEVELS: Record<string, { cls: string; color: string }> = {
  EXCELLENT: { cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', color: '#22c55e' },
  GOOD: { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', color: '#3b82f6' },
  FAIR: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', color: '#f59e0b' },
  POOR: { cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', color: '#f97316' },
  CRITICAL: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', color: '#ef4444' },
};

const scoreColor = (s: number) => s >= 80 ? '#22c55e' : s >= 60 ? '#3b82f6' : s >= 40 ? '#f59e0b' : '#ef4444';

const PERIODS = ['MONTHLY', 'QUARTERLY', 'ANNUAL'] as const;

// ── component ────────────────────────────────────────────────────────────────

export function CultureDiagnosticsPage() {
  usePageTitle('Culture Diagnostics');
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState<string>('QUARTERLY');

  // ── queries ─────────────────────────────────────────────────────────────

  const { data: healthRaw, isLoading: loadingHealth } = useQuery({
    queryKey: ['culture', 'health', period],
    queryFn: () => actionableInsightsApi.calculateOrganizationalHealth({ period }),
    staleTime: 60_000,
  });

  const [diagnostic, setDiagnostic] = useState<CultureDiagnostic | null>(null);

  // ── mutations ─────────────────────────────────────────────────────────

  const diagnosticMutation = useMutation({
    mutationFn: () => actionableInsightsApi.conductCultureDiagnostic(),
    onSuccess: (raw) => {
      const res = (raw as any)?.data ?? raw;
      setDiagnostic(res);
      toast.success('Culture diagnostic complete');
    },
    onError: () => toast.error('Diagnostic failed'),
  });

  // ── normalize ─────────────────────────────────────────────────────────

  const health: OrgHealthMetrics | null = useMemo(() => {
    const raw = (healthRaw as any)?.data ?? healthRaw;
    if (!raw || !raw.overallHealthScore) return null;
    return raw;
  }, [healthRaw]);

  // ── chart data ────────────────────────────────────────────────────────

  const dimensionData = useMemo(() => {
    if (!health) return [];
    return [
      { dimension: 'Engagement', score: health.engagementScore },
      { dimension: 'Performance', score: health.performanceScore },
      { dimension: 'Culture', score: health.cultureScore },
      { dimension: 'Leadership', score: health.leadershipScore },
      { dimension: 'Collaboration', score: health.collaborationScore },
      { dimension: 'Innovation', score: health.innovationScore },
      { dimension: 'Wellbeing', score: health.wellbeingScore },
    ];
  }, [health]);

  const cultureRadar = useMemo(() => {
    if (!diagnostic) return [];
    return [
      { type: 'Clan', score: diagnostic.clanCulture },
      { type: 'Adhocracy', score: diagnostic.adhocracyCulture },
      { type: 'Market', score: diagnostic.marketCulture },
      { type: 'Hierarchy', score: diagnostic.hierarchyCulture },
    ];
  }, [diagnostic]);

  const cultureDimensions = useMemo(() => {
    if (!diagnostic) return [];
    return [
      { name: 'Psychological Safety', score: diagnostic.psychologicalSafety },
      { name: 'Trust Level', score: diagnostic.trustLevel },
      { name: 'Transparency', score: diagnostic.transparency },
      { name: 'Accountability', score: diagnostic.accountability },
      { name: 'Innovation', score: diagnostic.innovation },
    ];
  }, [diagnostic]);

  const healthGauge = useMemo(() => {
    if (!health) return [];
    return [
      { name: 'Score', value: health.overallHealthScore },
      { name: 'Remaining', value: 100 - health.overallHealthScore },
    ];
  }, [health]);

  // ── tooltip ───────────────────────────────────────────────────────────

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-xl px-3 py-2 shadow-2xl text-xs space-y-1">
        <p className="font-semibold text-white">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color || p.fill }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</p>
        ))}
      </div>
    );
  };

  // ── skeleton ──────────────────────────────────────────────────────────

  if (loadingHealth) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-72 rounded bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-xl bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
      </div>
    );
  }

  const level = health ? (HEALTH_LEVELS[health.healthLevel] || HEALTH_LEVELS.FAIR) : HEALTH_LEVELS.FAIR;
  const hasData = health != null;

  // ── empty state ───────────────────────────────────────────────────────

  if (!hasData) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900 dark:text-white flex items-center gap-2">
              <HeartIcon className="w-6 h-6 text-rose-500" />
              Culture & Organizational Health
            </h1>
            <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
              Comprehensive organizational health metrics and culture diagnostics
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24">
          <HeartIcon className="w-16 h-16 text-secondary-300 dark:text-secondary-600 mb-4" />
          <h3 className="text-lg font-semibold text-secondary-700 dark:text-secondary-300 mb-2">No health data available</h3>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 text-center max-w-md">
            Organizational health metrics will appear here once the AI engine has enough data to calculate scores.
          </p>
        </div>
      </div>
    );
  }

  // ── main ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white flex items-center gap-2">
            <HeartIcon className="w-6 h-6 text-rose-500" />
            Culture & Organizational Health
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
            Comprehensive organizational health metrics and culture diagnostics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select value={period} onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-1.5 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent">
            {PERIODS.map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
          </select>
          <button
            onClick={() => diagnosticMutation.mutate()}
            disabled={diagnosticMutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={clsx('w-4 h-4', diagnosticMutation.isPending && 'animate-spin')} />
            {diagnosticMutation.isPending ? 'Running...' : 'Run Diagnostic'}
          </button>
        </div>
      </div>

      {/* Overall health gauge + 7-dimension chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gauge */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-2">Overall Health</h3>
          <div className="h-[100px] w-[200px] mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie data={healthGauge} dataKey="value" startAngle={180} endAngle={0} cx="50%" cy="100%" outerRadius={80} innerRadius={55} paddingAngle={0}>
                  <Cell fill={level.color} />
                  <Cell fill="var(--color-secondary-200, #e5e7eb)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-3xl font-bold mt-[-30px]" style={{ color: level.color }}>{(health.overallHealthScore ?? 0).toFixed(0)}</p>
          <span className={clsx('px-3 py-1 rounded-full text-xs font-medium mt-2', level.cls)}>{health.healthLevel}</span>
        </div>

        {/* 7-dimension bar chart */}
        <div className="lg:col-span-2 bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">Health Dimensions</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dimensionData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-secondary-200, #e5e7eb)" opacity={0.5} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="dimension" tick={{ fontSize: 11, fill: 'var(--color-secondary-500, #6b7280)' }} axisLine={false} tickLine={false} width={75} />
                <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} content={<ChartTooltip />} />
                <Bar dataKey="score" name="Score" barSize={16} radius={[0, 6, 6, 0]}>
                  {dimensionData.map((d, i) => <Cell key={i} fill={scoreColor(d.score)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Headcount', value: health.headcount, icon: UserGroupIcon, color: 'text-indigo-600 dark:text-indigo-400' },
          { label: 'Turnover Rate', value: `${health.turnoverRate?.toFixed(1)}%`, icon: ExclamationTriangleIcon, color: health.turnoverRate > 15 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400' },
          { label: 'eNPS', value: health.eNPS, icon: HeartIcon, color: health.eNPS >= 30 ? 'text-green-600 dark:text-green-400' : health.eNPS >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400' },
          { label: 'At-Risk Employees', value: health.atRiskEmployees, icon: FireIcon, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Burnout Risk', value: health.burnoutRiskCount, icon: ExclamationTriangleIcon, color: 'text-red-600 dark:text-red-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-secondary-500 dark:text-secondary-400">{s.label}</p>
              <s.icon className={clsx('w-4 h-4', s.color)} />
            </div>
            <p className={clsx('text-2xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Culture diagnostic results */}
      {diagnostic && (
        <>
          {/* Culture RadarChart + Dimension cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
              <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Culture Profile</h3>
              <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">Competing Values Framework</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={cultureRadar} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="var(--color-secondary-300, #d1d5db)" />
                    <PolarAngleAxis dataKey="type" tick={{ fontSize: 11, fill: 'var(--color-secondary-500, #6b7280)' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8, fill: 'var(--color-secondary-400, #9ca3af)' }} />
                    <Radar name="Culture Score" dataKey="score" stroke="#e11d48" fill="#e11d48" fillOpacity={0.25} />
                    <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} content={<ChartTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
              <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">Culture Dimensions</h3>
              <div className="space-y-4">
                {cultureDimensions.map((d) => (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-secondary-700 dark:text-secondary-300">{d.name}</span>
                      <span className="text-xs font-bold" style={{ color: scoreColor(d.score) }}>{(d.score ?? 0).toFixed(0)}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-secondary-200 dark:bg-secondary-600 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${d.score}%`, backgroundColor: scoreColor(d.score) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cultural Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
              <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-3">Cultural Strengths</h3>
              {diagnostic.culturalStrengths?.length ? (
                <ul className="space-y-2">
                  {diagnostic.culturalStrengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-secondary-700 dark:text-secondary-300">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />{s}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-secondary-400">No strengths identified.</p>}
            </div>
            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">Cultural Weaknesses</h3>
              {diagnostic.culturalWeaknesses?.length ? (
                <ul className="space-y-2">
                  {diagnostic.culturalWeaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-secondary-700 dark:text-secondary-300">
                      <ExclamationTriangleIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />{w}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-secondary-400">No weaknesses identified.</p>}
            </div>
          </div>
        </>
      )}

      {/* Strengths & Concerns from health metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-base font-semibold text-green-700 dark:text-green-400 mb-3">Organizational Strengths</h3>
          {health.strengths?.length ? (
            <ul className="space-y-2">
              {health.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-secondary-700 dark:text-secondary-300">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />{s}
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-secondary-400">No strengths data.</p>}
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-base font-semibold text-amber-700 dark:text-amber-400 mb-3">Concerns</h3>
          {health.concerns?.length ? (
            <ul className="space-y-2">
              {health.concerns.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-secondary-700 dark:text-secondary-300">
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />{c}
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-secondary-400">No concerns identified.</p>}
        </div>
      </div>

      {/* AI Recommendations */}
      {health.recommendations?.length > 0 && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">AI Recommendations</h3>
          <div className="space-y-3">
            {health.recommendations.map((rec: any, i: number) => (
              <div key={i} className="flex items-start gap-3 border-b border-secondary-100 dark:border-secondary-700/50 pb-3 last:border-0 last:pb-0">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mt-0.5">
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">{i + 1}</span>
                </div>
                <div className="flex-1">
                  {rec.category && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-300 mr-2">{rec.category}</span>}
                  <p className="text-xs text-secondary-700 dark:text-secondary-300 mt-1">{typeof rec === 'string' ? rec : rec.description || rec.action || rec.recommendation || JSON.stringify(rec)}</p>
                  {rec.impact && <p className="text-[10px] text-secondary-400 mt-1">Expected impact: {rec.impact}</p>}
                </div>
                {rec.priority && (
                  <span className={clsx('px-2 py-0.5 rounded text-[10px] font-medium shrink-0',
                    rec.priority === 'HIGH' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                    rec.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  )}>{rec.priority}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
