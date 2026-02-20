import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { aiInsightsApi, type AnomalyItem, type AnomalyStats, type AtRiskUser, type ProductivityPrediction } from '@/lib/api/ai-insights';
import { usePageTitle } from '@/hooks/usePageTitle';

// ── constants ────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#f59e0b',
  LOW: '#6366f1',
};

const SEVERITY_BADGES: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOW: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

const RISK_BADGES: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

// ── component ────────────────────────────────────────────────────────────────

export function AIInsightsDashboardPage() {
  usePageTitle('AI Insights');
  const queryClient = useQueryClient();
  const [daysRange, setDaysRange] = useState<30 | 60 | 90>(30);

  // ── queries ─────────────────────────────────────────────────────────────

  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - daysRange);

  const { data: sentimentTrendRaw, isLoading: loadingSentiment } = useQuery({
    queryKey: ['ai-insights', 'sentiment-trend', daysRange],
    queryFn: () => aiInsightsApi.getSentimentTrend({
      periodType: 'daily',
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
    }),
    staleTime: 60_000,
  });

  const { data: anomalyStatsRaw, isLoading: loadingAnomalyStats } = useQuery({
    queryKey: ['ai-insights', 'anomaly-stats'],
    queryFn: () => aiInsightsApi.getAnomalyStatistics(),
    staleTime: 60_000,
  });

  const { data: activeAnomaliesRaw, isLoading: loadingAnomalies } = useQuery({
    queryKey: ['ai-insights', 'active-anomalies'],
    queryFn: () => aiInsightsApi.getActiveAnomalies(),
    staleTime: 60_000,
  });

  const { data: productivityRaw, isLoading: loadingProductivity } = useQuery({
    queryKey: ['ai-insights', 'productivity'],
    queryFn: () => aiInsightsApi.getProductivityPredictions(),
    staleTime: 60_000,
  });

  const { data: atRiskRaw, isLoading: loadingAtRisk } = useQuery({
    queryKey: ['ai-insights', 'at-risk'],
    queryFn: () => aiInsightsApi.getAtRiskUsers(),
    staleTime: 60_000,
  });

  const isLoading = loadingSentiment || loadingAnomalyStats || loadingAnomalies || loadingProductivity || loadingAtRisk;

  // ── normalize data ──────────────────────────────────────────────────────

  const sentimentTrend = useMemo(() => {
    const raw = Array.isArray(sentimentTrendRaw) ? sentimentTrendRaw : (sentimentTrendRaw as any)?.data ?? [];
    return raw.map((p: any) => ({
      date: p.date ? new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
      avgScore: typeof p.avgScore === 'number' ? p.avgScore : 0,
      count: typeof p.count === 'number' ? p.count : 0,
    }));
  }, [sentimentTrendRaw]);

  const anomalyStats: AnomalyStats = useMemo(() => {
    const raw = (anomalyStatsRaw as any)?.data ?? anomalyStatsRaw;
    return {
      total: raw?.total ?? 0,
      active: raw?.active ?? 0,
      acknowledged: raw?.acknowledged ?? 0,
      resolved: raw?.resolved ?? 0,
      bySeverity: raw?.bySeverity ?? {},
    };
  }, [anomalyStatsRaw]);

  const activeAnomalies: AnomalyItem[] = useMemo(() => {
    return Array.isArray(activeAnomaliesRaw) ? activeAnomaliesRaw : (activeAnomaliesRaw as any)?.data ?? [];
  }, [activeAnomaliesRaw]);

  const predictions: ProductivityPrediction[] = useMemo(() => {
    return Array.isArray(productivityRaw) ? productivityRaw : (productivityRaw as any)?.data ?? [];
  }, [productivityRaw]);

  const atRiskUsers: AtRiskUser[] = useMemo(() => {
    return Array.isArray(atRiskRaw) ? atRiskRaw : (atRiskRaw as any)?.data ?? [];
  }, [atRiskRaw]);

  // ── mutations ───────────────────────────────────────────────────────────

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => aiInsightsApi.acknowledgeAnomaly(id),
    onSuccess: () => {
      toast.success('Anomaly acknowledged');
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
    },
    onError: () => toast.error('Failed to acknowledge anomaly'),
  });

  // ── chart tooltip ───────────────────────────────────────────────────────

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-secondary-200 bg-white px-3 py-2 shadow-lg dark:border-secondary-700 dark:bg-secondary-800 text-xs space-y-1">
        <p className="font-semibold text-secondary-900 dark:text-white">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</p>
        ))}
      </div>
    );
  };

  // ── severity donut data ─────────────────────────────────────────────────

  const severityDonutData = useMemo(() => {
    return Object.entries(anomalyStats.bySeverity).map(([severity, count]) => ({
      name: severity,
      value: count as number,
      color: SEVERITY_COLORS[severity] || '#9ca3af',
    }));
  }, [anomalyStats]);

  // ── stats ───────────────────────────────────────────────────────────────

  const avgSentiment = useMemo(() => {
    if (!sentimentTrend.length) return 0;
    return sentimentTrend.reduce((s: number, p: any) => s + p.avgScore, 0) / sentimentTrend.length;
  }, [sentimentTrend]);

  // ── skeleton ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-64 rounded bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-xl bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-72 rounded-xl bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
          <div className="h-72 rounded-xl bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white flex items-center gap-2">
            <SparklesIcon className="w-6 h-6 text-indigo-500" />
            AI-Powered Insights
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
            Sentiment analysis, anomaly detection &amp; productivity forecasting
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 p-0.5">
          {([30, 60, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDaysRange(d)}
              className={clsx(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                daysRange === d ? 'bg-indigo-600 text-white' : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700',
              )}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Active Anomalies', value: anomalyStats.active, color: anomalyStats.active > 0 ? 'text-red-500' : 'text-green-600', icon: ShieldExclamationIcon },
          { label: 'Avg Sentiment', value: avgSentiment ? avgSentiment.toFixed(2) : '—', color: avgSentiment >= 0.5 ? 'text-green-600' : 'text-amber-600', icon: SparklesIcon },
          { label: 'At-Risk Users', value: atRiskUsers.length, color: atRiskUsers.length > 0 ? 'text-amber-600' : 'text-green-600', icon: ExclamationTriangleIcon },
          { label: 'Productivity Index', value: predictions.length ? (predictions.reduce((s, p) => s + p.predicted, 0) / predictions.length).toFixed(1) : '—', color: 'text-purple-600', icon: ArrowTrendingUpIcon },
          { label: 'Resolved Anomalies', value: anomalyStats.resolved, color: 'text-indigo-600', icon: CheckCircleIcon },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-4">
              <div className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-secondary-400" />
                <p className="text-xs text-secondary-500 dark:text-secondary-400">{s.label}</p>
              </div>
              <p className={clsx('text-2xl font-bold mt-1', s.color)}>{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Sentiment trend */}
      {sentimentTrend.length > 0 && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Sentiment Trend</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">Average sentiment score over the past {daysRange} days</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sentimentTrend} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradSentiment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-secondary-200, #e5e7eb)" opacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="avgScore" name="Sentiment" stroke="#6366f1" fill="url(#gradSentiment)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 2-col: anomalies + productivity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active anomalies */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Active Anomalies</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">
            {activeAnomalies.length} anomalies requiring attention
          </p>
          {activeAnomalies.length === 0 ? (
            <div className="text-center py-12 text-secondary-400 text-sm">No active anomalies detected</div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {activeAnomalies.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary-50 dark:bg-secondary-700/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', SEVERITY_BADGES[a.severity] || SEVERITY_BADGES.LOW)}>
                        {a.severity}
                      </span>
                      <span className="text-[10px] text-secondary-400">{a.entityType}</span>
                    </div>
                    <p className="text-xs text-secondary-700 dark:text-secondary-300 mt-1 line-clamp-2">{a.description}</p>
                    <p className="text-[10px] text-secondary-400 mt-1">
                      {new Date(a.detectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  {a.status !== 'ACKNOWLEDGED' && (
                    <button
                      onClick={() => acknowledgeMutation.mutate(a.id)}
                      className="text-[10px] px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors whitespace-nowrap"
                    >
                      <EyeIcon className="w-3 h-3 inline mr-0.5" />Ack
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Anomaly severity donut + productivity bar */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Anomaly Severity Breakdown</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">Distribution by severity level</p>
          {severityDonutData.length === 0 ? (
            <div className="text-center py-16 text-secondary-400 text-sm">No anomaly data available</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    style={{ fontSize: 10 }}
                  >
                    {severityDonutData.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Productivity predictions */}
      {predictions.length > 0 && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Productivity Predictions</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">Predicted vs actual productivity scores</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={predictions.slice(0, 15)} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-secondary-200, #e5e7eb)" opacity={0.5} />
                <XAxis dataKey="entityName" tick={{ fontSize: 9, fill: 'var(--color-secondary-400, #9ca3af)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="predicted" name="Predicted" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* At-risk users */}
      {atRiskUsers.length > 0 && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">At-Risk Users</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">Users identified by AI engagement scoring as at-risk ({atRiskUsers.length})</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-200 dark:border-secondary-700">
                  {['User', 'Department', 'Score', 'Risk', 'Factors', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {atRiskUsers.slice(0, 15).map((u) => (
                  <tr key={u.userId} className="border-b border-secondary-100 dark:border-secondary-700/50 last:border-0">
                    <td className="py-2.5 pr-4 text-xs text-secondary-900 dark:text-white font-medium">{u.userName || u.userId}</td>
                    <td className="py-2.5 pr-4 text-xs text-secondary-500 dark:text-secondary-400">{u.department || '—'}</td>
                    <td className="py-2.5 pr-4 text-xs font-medium text-secondary-900 dark:text-white">{u.engagementScore?.toFixed(1) ?? '—'}</td>
                    <td className="py-2.5 pr-4">
                      <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', RISK_BADGES[u.riskLevel] || RISK_BADGES.LOW)}>
                        {u.riskLevel}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {(u.factors || []).slice(0, 3).map((f, i) => (
                          <span key={i} className="inline-flex items-center rounded-full bg-secondary-100 dark:bg-secondary-700 px-2 py-0.5 text-[10px] text-secondary-600 dark:text-secondary-400">
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {(u.recommendedActions || []).slice(0, 2).map((a, i) => (
                          <span key={i} className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 text-[10px] text-indigo-600 dark:text-indigo-400">
                            {a}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state when all sections are empty */}
      {sentimentTrend.length === 0 && activeAnomalies.length === 0 && predictions.length === 0 && atRiskUsers.length === 0 && (
        <div className="rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 p-16 text-center">
          <SparklesIcon className="w-12 h-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" />
          <p className="text-secondary-500 dark:text-secondary-400 text-sm">No AI insights data available yet. Insights will appear as the system analyzes your organization&apos;s data.</p>
        </div>
      )}
    </div>
  );
}
