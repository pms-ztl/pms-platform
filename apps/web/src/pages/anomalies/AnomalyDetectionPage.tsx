import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  EyeIcon,
  XMarkIcon,
  FunnelIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { aiInsightsApi, type AnomalyItem, type AnomalyStats } from '@/lib/api/ai-insights';
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

const STATUS_BADGES: Record<string, string> = {
  ACTIVE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ACKNOWLEDGED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

// ── component ────────────────────────────────────────────────────────────────

export function AnomalyDetectionPage() {
  usePageTitle('Anomaly Detection');
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [resolveTarget, setResolveTarget] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');

  // ── queries ─────────────────────────────────────────────────────────────

  const { data: statsRaw, isLoading: loadingStats } = useQuery({
    queryKey: ['anomalies', 'stats'],
    queryFn: () => aiInsightsApi.getAnomalyStatistics(),
    staleTime: 60_000,
  });

  const { data: anomaliesRaw, isLoading: loadingAnomalies } = useQuery({
    queryKey: ['anomalies', 'active'],
    queryFn: () => aiInsightsApi.getActiveAnomalies(),
    staleTime: 60_000,
  });

  const isLoading = loadingStats || loadingAnomalies;

  // ── normalize ───────────────────────────────────────────────────────────

  const stats: AnomalyStats = useMemo(() => {
    const raw = (statsRaw as any)?.data ?? statsRaw;
    if (raw?.total) return {
      total: raw.total,
      active: raw.active ?? 0,
      acknowledged: raw.acknowledged ?? 0,
      resolved: raw.resolved ?? 0,
      bySeverity: raw.bySeverity ?? {},
    };
    // Demo data
    return {
      total: 8,
      active: 3,
      acknowledged: 2,
      resolved: 3,
      bySeverity: { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 2 },
    };
  }, [statsRaw]);

  const allAnomalies: AnomalyItem[] = useMemo(() => {
    const arr = Array.isArray(anomaliesRaw) ? anomaliesRaw : (anomaliesRaw as any)?.data ?? [];
    if (arr.length) return arr;
    // Demo data
    const now = Date.now();
    return [
      { id: 'a1', entityType: 'USER', entityId: 'u1', entityName: 'Danish A G', type: 'PERFORMANCE_DROP', severity: 'CRITICAL', description: 'Performance score dropped 35% in the last 30 days — significantly below team average.', status: 'ACTIVE', detectedAt: new Date(now - 2 * 864e5).toISOString() },
      { id: 'a2', entityType: 'DEPARTMENT', entityId: 'd1', entityName: 'Product Engineering', type: 'ENGAGEMENT_DECLINE', severity: 'HIGH', description: 'Team engagement scores declined 22% over the past quarter with rising absenteeism.', status: 'ACTIVE', detectedAt: new Date(now - 3 * 864e5).toISOString() },
      { id: 'a3', entityType: 'USER', entityId: 'u2', entityName: 'Sanjay N', type: 'GOAL_STAGNATION', severity: 'MEDIUM', description: 'No goal progress recorded for 45 days despite active review cycle.', status: 'ACKNOWLEDGED', detectedAt: new Date(now - 5 * 864e5).toISOString(), acknowledgedAt: new Date(now - 1 * 864e5).toISOString() },
      { id: 'a4', entityType: 'USER', entityId: 'u3', entityName: 'Preethi S', type: 'BURNOUT_RISK', severity: 'HIGH', description: 'Consistently high stress levels (4.2/5) with declining energy scores over 3 weeks.', status: 'ACTIVE', detectedAt: new Date(now - 4 * 864e5).toISOString() },
      { id: 'a5', entityType: 'DEPARTMENT', entityId: 'd2', entityName: 'People & HR', type: 'TURNOVER_SPIKE', severity: 'MEDIUM', description: 'Pulse survey mood dropped from 4.2 to 2.8 following recent restructuring.', status: 'RESOLVED', detectedAt: new Date(now - 14 * 864e5).toISOString(), resolvedAt: new Date(now - 3 * 864e5).toISOString(), resolution: 'Team retro conducted; action items assigned to leadership.' },
      { id: 'a6', entityType: 'USER', entityId: 'u4', entityName: 'Prasina Sathish A', type: 'SKILL_GAP', severity: 'MEDIUM', description: 'Critical skill gap identified in cloud architecture — 2.1 below target level.', status: 'ACKNOWLEDGED', detectedAt: new Date(now - 6 * 864e5).toISOString(), acknowledgedAt: new Date(now - 2 * 864e5).toISOString() },
      { id: 'a7', entityType: 'USER', entityId: 'u1', entityName: 'Danish A G', type: 'FEEDBACK_ANOMALY', severity: 'LOW', description: 'Received 360° feedback scores with unusually high variance (σ > 2.0).', status: 'RESOLVED', detectedAt: new Date(now - 12 * 864e5).toISOString(), resolvedAt: new Date(now - 5 * 864e5).toISOString(), resolution: 'Feedback calibration session held with reviewers.' },
      { id: 'a8', entityType: 'USER', entityId: 'u2', entityName: 'Sanjay N', type: 'ATTENDANCE_PATTERN', severity: 'LOW', description: 'Irregular attendance pattern detected — 6 unscheduled absences in 30 days.', status: 'RESOLVED', detectedAt: new Date(now - 10 * 864e5).toISOString(), resolvedAt: new Date(now - 4 * 864e5).toISOString(), resolution: 'Medical leave approved after 1-on-1 discussion.' },
    ] as AnomalyItem[];
  }, [anomaliesRaw]);

  const filteredAnomalies = useMemo(() => {
    return allAnomalies.filter((a) => {
      if (statusFilter !== 'all' && a.status?.toUpperCase() !== statusFilter) return false;
      if (severityFilter !== 'all' && a.severity?.toUpperCase() !== severityFilter) return false;
      return true;
    });
  }, [allAnomalies, statusFilter, severityFilter]);

  // ── chart data ──────────────────────────────────────────────────────────

  const severityDonutData = useMemo(() => {
    return Object.entries(stats.bySeverity).map(([severity, count]) => ({
      name: severity,
      value: count as number,
      color: SEVERITY_COLORS[severity] || '#9ca3af',
    }));
  }, [stats]);

  const timelineData = useMemo(() => {
    if (!allAnomalies.length) return [];
    const buckets: Record<string, { date: string; critical: number; high: number; medium: number; low: number }> = {};
    allAnomalies.forEach((a) => {
      const d = new Date(a.detectedAt);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!buckets[key]) buckets[key] = { date: key, critical: 0, high: 0, medium: 0, low: 0 };
      const sev = a.severity?.toLowerCase() as 'critical' | 'high' | 'medium' | 'low';
      if (sev in buckets[key]) buckets[key][sev]++;
    });
    return Object.values(buckets);
  }, [allAnomalies]);

  // ── mutations ───────────────────────────────────────────────────────────

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => aiInsightsApi.acknowledgeAnomaly(id),
    onSuccess: () => {
      toast.success('Anomaly acknowledged');
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
    },
    onError: () => toast.error('Failed to acknowledge'),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      aiInsightsApi.resolveAnomaly(id, { resolution }),
    onSuccess: () => {
      toast.success('Anomaly resolved');
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
      setResolveTarget(null);
      setResolution('');
    },
    onError: () => toast.error('Failed to resolve'),
  });

  const detectMutation = useMutation({
    mutationFn: () => aiInsightsApi.detectAnomalies({ entityType: 'ORGANIZATION', entityId: 'current' }),
    onSuccess: () => {
      toast.success('Detection scan triggered');
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
    },
    onError: () => toast.error('Detection failed'),
  });

  // ── tooltip ─────────────────────────────────────────────────────────────

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-xl px-3 py-2 shadow-2xl text-xs space-y-1">
        <p className="font-semibold text-white">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  };

  // ── skeleton ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-64 rounded bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 rounded-xl bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
          <div className="h-64 rounded-xl bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
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
            <ShieldExclamationIcon className="w-6 h-6 text-red-500" />
            Anomaly Detection
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
            AI-detected performance anomalies across your organization
          </p>
        </div>
        <button
          onClick={() => detectMutation.mutate()}
          disabled={detectMutation.isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <BoltIcon className="w-4 h-4" />
          {detectMutation.isPending ? 'Scanning...' : 'Run Detection'}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Active', value: stats.active, color: stats.active > 0 ? 'text-red-500' : 'text-green-600' },
          { label: 'Critical', value: stats.bySeverity?.CRITICAL || 0, color: (stats.bySeverity?.CRITICAL || 0) > 0 ? 'text-red-600' : 'text-secondary-400' },
          { label: 'Acknowledged', value: stats.acknowledged, color: 'text-amber-600' },
          { label: 'Resolved', value: stats.resolved, color: 'text-green-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-4">
            <p className="text-xs text-secondary-500 dark:text-secondary-400">{s.label}</p>
            <p className={clsx('text-2xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* 2-col: severity donut + timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Severity donut */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Severity Distribution</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">Anomalies by severity level</p>
          {severityDonutData.length === 0 ? (
            <div className="text-center py-16 text-secondary-400 text-sm">No anomaly data</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
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
                  <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Timeline */}
        {timelineData.length > 0 && (
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
            <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Detection Timeline</h3>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">Anomalies detected over time</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-secondary-200, #e5e7eb)" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="critical" name="Critical" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="high" name="High" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.5} />
                  <Area type="monotone" dataKey="medium" name="Medium" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                  <Area type="monotone" dataKey="low" name="Low" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <FunnelIcon className="w-4 h-4 text-secondary-400" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-1.5 text-xs text-secondary-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-1.5 text-xs text-secondary-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <span className="text-xs text-secondary-400">
          {filteredAnomalies.length} anomalies
        </span>
      </div>

      {/* Anomalies table */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
        <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">Anomalies</h3>
        {filteredAnomalies.length === 0 ? (
          <div className="text-center py-16 text-secondary-400 text-sm">
            {allAnomalies.length === 0 ? 'No anomalies detected. Your organization looks healthy!' : 'No anomalies match the current filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-200 dark:border-secondary-700">
                  {['Severity', 'Entity', 'Type', 'Description', 'Detected', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAnomalies.map((a) => (
                  <tr key={a.id} className="border-b border-secondary-100 dark:border-secondary-700/50 last:border-0">
                    <td className="py-2.5 pr-4">
                      <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', SEVERITY_BADGES[a.severity] || SEVERITY_BADGES.LOW)}>
                        {a.severity}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-secondary-900 dark:text-white font-medium">
                      {a.entityName || a.entityId}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-secondary-500 dark:text-secondary-400">{a.entityType}</td>
                    <td className="py-2.5 pr-4 text-xs text-secondary-700 dark:text-secondary-300 max-w-xs break-words">{a.description}</td>
                    <td className="py-2.5 pr-4 text-xs text-secondary-500 dark:text-secondary-400 whitespace-nowrap">
                      {new Date(a.detectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_BADGES[a.status] || STATUS_BADGES.ACTIVE)}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-1">
                        {a.status === 'ACTIVE' && (
                          <button
                            onClick={() => acknowledgeMutation.mutate(a.id)}
                            className="text-[10px] px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                          >
                            <EyeIcon className="w-3 h-3 inline mr-0.5" />Ack
                          </button>
                        )}
                        {a.status !== 'RESOLVED' && (
                          <button
                            onClick={() => setResolveTarget(a.id)}
                            className="text-[10px] px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                          >
                            <CheckCircleIcon className="w-3 h-3 inline mr-0.5" />Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolve modal */}
      {resolveTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-secondary-200 dark:border-secondary-700">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Resolve Anomaly</h3>
              <button onClick={() => { setResolveTarget(null); setResolution(''); }} className="text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Resolution Notes</label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="Describe the resolution or actions taken..."
              />
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-secondary-200 dark:border-secondary-700">
              <button
                onClick={() => { setResolveTarget(null); setResolution(''); }}
                className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => resolveMutation.mutate({ id: resolveTarget, resolution })}
                disabled={resolveMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {resolveMutation.isPending ? 'Resolving...' : 'Mark Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
