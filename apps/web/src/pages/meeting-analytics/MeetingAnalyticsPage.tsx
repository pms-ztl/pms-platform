import { useMemo, useState } from 'react';
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
import clsx from 'clsx';
import { oneOnOnesApi, type OneOnOne } from '@/lib/api/one-on-ones';
import { usePageTitle } from '@/hooks/usePageTitle';

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#22c55e',
  SCHEDULED: '#6366f1',
  IN_PROGRESS: '#f59e0b',
  CANCELLED: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Completed',
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  CANCELLED: 'Cancelled',
};

const DURATION_BUCKETS = [
  { label: '0–15 Minutes', min: 0, max: 15 },
  { label: '15–30 Minutes', min: 15, max: 30 },
  { label: '30–45 Minutes', min: 30, max: 45 },
  { label: '45–60 Minutes', min: 45, max: 60 },
  { label: '60+ Minutes', min: 60, max: Infinity },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM – 6 PM

function fmtMonth(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function fmtWeek(d: Date) {
  const start = new Date(d);
  start.setDate(start.getDate() - start.getDay() + 1);
  return `${start.getMonth() + 1}/${start.getDate()}`;
}

function cadenceColor(count: number): string {
  if (count === 0) return 'bg-secondary-100 dark:bg-secondary-700';
  if (count <= 2) return 'bg-indigo-100 dark:bg-indigo-900/40';
  if (count <= 5) return 'bg-indigo-300 dark:bg-indigo-700';
  return 'bg-indigo-500 dark:bg-indigo-500';
}

// ── component ────────────────────────────────────────────────────────────────

export function MeetingAnalyticsPage() {
  usePageTitle('Meeting Analytics');
  const [timeRange, setTimeRange] = useState<3 | 6 | 12>(6);

  // Fetch all meetings (large limit for analytics)
  const { data: meetingsRaw, isLoading: loadingMeetings } = useQuery({
    queryKey: ['one-on-ones', 'all'],
    queryFn: () => oneOnOnesApi.list({ limit: 200 }),
    staleTime: 60_000,
  });

  const { data: upcoming, isLoading: loadingUpcoming } = useQuery({
    queryKey: ['one-on-ones', 'upcoming'],
    queryFn: () => oneOnOnesApi.getUpcoming(),
    staleTime: 60_000,
  });

  // Filter meetings to time range
  const meetings = useMemo(() => {
    const all: OneOnOne[] = (meetingsRaw as any)?.data ?? (Array.isArray(meetingsRaw) ? meetingsRaw : []);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - timeRange);
    return all.filter((m) => new Date(m.scheduledAt) >= cutoff);
  }, [meetingsRaw, timeRange]);

  const isLoading = loadingMeetings || loadingUpcoming;

  // ── computed analytics ──────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (!meetings.length) return null;

    const completed = meetings.filter((m) => m.status === 'COMPLETED');
    const totalActions = meetings.reduce((s, m) => s + (m.actionItems?.length || 0), 0);
    const doneActions = meetings.reduce((s, m) => s + (m.actionItems?.filter((a) => a.done).length || 0), 0);
    const avgDuration = completed.length
      ? completed.reduce((s, m) => s + (m.duration || 0), 0) / completed.length
      : 0;
    const avgAgenda = meetings.length
      ? meetings.reduce((s, m) => s + (m.agenda?.length || 0), 0) / meetings.length
      : 0;

    return {
      total: meetings.length,
      completionRate: meetings.length ? (completed.length / meetings.length) * 100 : 0,
      avgDuration: Math.round(avgDuration),
      actionItems: { done: doneActions, total: totalActions },
      avgAgenda: (avgAgenda ?? 0).toFixed(1),
      upcomingCount: Array.isArray(upcoming) ? upcoming.length : 0,
    };
  }, [meetings, upcoming]);

  // ── frequency trend (by month) ──────────────────────────────────────

  const frequencyData = useMemo(() => {
    if (!meetings.length) return [];
    const buckets: Record<string, { label: string; count: number; completed: number }> = {};

    meetings.forEach((m) => {
      const d = new Date(m.scheduledAt);
      const key = timeRange <= 3 ? fmtWeek(d) : fmtMonth(d);
      if (!buckets[key]) buckets[key] = { label: key, count: 0, completed: 0 };
      buckets[key].count++;
      if (m.status === 'COMPLETED') buckets[key].completed++;
    });

    return Object.values(buckets);
  }, [meetings, timeRange]);

  // ── status distribution ─────────────────────────────────────────────

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    meetings.forEach((m) => {
      const s = m.status || 'UNKNOWN';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_LABELS[status] || status,
      value,
      color: STATUS_COLORS[status] || '#9ca3af',
    }));
  }, [meetings]);

  // ── action item completion over time ────────────────────────────────

  const actionTrendData = useMemo(() => {
    if (!meetings.length) return [];
    const buckets: Record<string, { label: string; total: number; done: number }> = {};

    meetings.forEach((m) => {
      const d = new Date(m.scheduledAt);
      const key = timeRange <= 3 ? fmtWeek(d) : fmtMonth(d);
      if (!buckets[key]) buckets[key] = { label: key, total: 0, done: 0 };
      m.actionItems?.forEach((a) => {
        buckets[key].total++;
        if (a.done) buckets[key].done++;
      });
    });

    return Object.values(buckets);
  }, [meetings, timeRange]);

  // ── duration histogram ──────────────────────────────────────────────

  const durationData = useMemo(() => {
    return DURATION_BUCKETS.map((b) => ({
      label: b.label,
      count: meetings.filter((m) => {
        const dur = m.duration || 0;
        return dur >= b.min && dur < b.max;
      }).length,
    }));
  }, [meetings]);

  // ── cadence heatmap (day × hour) ───────────────────────────────────

  const cadenceData = useMemo(() => {
    const grid: number[][] = DAYS.map(() => HOURS.map(() => 0));
    meetings.forEach((m) => {
      const d = new Date(m.scheduledAt);
      const day = (d.getDay() + 6) % 7; // Mon=0
      const hour = d.getHours();
      const hi = HOURS.indexOf(hour);
      if (hi >= 0) grid[day][hi]++;
    });
    return grid;
  }, [meetings]);

  // ── overdue action items ────────────────────────────────────────────

  const overdueItems = useMemo(() => {
    const items: Array<{
      meetingDate: string;
      participant: string;
      title: string;
      assignee: string;
    }> = [];
    meetings.forEach((m) => {
      if (m.status !== 'COMPLETED') return;
      m.actionItems?.forEach((ai) => {
        if (!ai.done) {
          items.push({
            meetingDate: new Date(m.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            participant: `${m.employee?.firstName || ''} ${m.employee?.lastName || ''}`.trim() || 'Unknown',
            title: ai.title,
            assignee: ai.assignee || 'Unassigned',
          });
        }
      });
    });
    return items.slice(0, 20);
  }, [meetings]);

  // ── chart tooltip ───────────────────────────────────────────────────

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-xl px-3 py-2 shadow-2xl text-xs space-y-1">
        <p className="font-semibold text-white">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  };

  // ── skeleton ────────────────────────────────────────────────────────

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

  // ── empty state ─────────────────────────────────────────────────────

  if (!meetings.length) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Meeting Analytics</h1>
        <div className="rounded-xl border border-secondary-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl p-16 text-center">
          <p className="text-secondary-400 text-sm">No meeting data available for the selected time range.</p>
        </div>
      </div>
    );
  }

  // ── render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Meeting Analytics</h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
            One-on-one meeting insights &amp; trends
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-secondary-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl p-0.5">
          {([3, 6, 12] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={clsx(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                timeRange === r
                  ? 'bg-indigo-600 text-white'
                  : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700',
              )}
            >
              {r}M
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Meetings', value: stats.total, sub: `${stats.upcomingCount} upcoming`, color: 'text-indigo-600' },
            { label: 'Completion Rate', value: `${(stats.completionRate ?? 0).toFixed(0)}%`, sub: `${meetings.filter((m) => m.status === 'COMPLETED').length} completed`, color: 'text-green-600' },
            { label: 'Average Duration', value: `${stats.avgDuration} minutes`, sub: 'per meeting', color: 'text-purple-600' },
            { label: 'Action Items', value: `${stats.actionItems.done}/${stats.actionItems.total}`, sub: stats.actionItems.total ? `${((stats.actionItems.done / stats.actionItems.total) * 100).toFixed(0)}% done` : 'None tracked', color: 'text-amber-600' },
            { label: 'Average Agenda Topics', value: stats.avgAgenda, sub: 'per meeting', color: 'text-cyan-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-4">
              <p className="text-xs text-secondary-500 dark:text-secondary-400">{s.label}</p>
              <p className={clsx('text-2xl font-bold mt-1', s.color)}>{s.value}</p>
              <p className="text-2xs text-secondary-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Meeting frequency area chart */}
      <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
        <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Meeting Frequency</h3>
        <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">
          Meetings per {timeRange <= 3 ? 'week' : 'month'} — total vs completed
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={frequencyData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-secondary-200, #e5e7eb)" opacity={0.5} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="count" name="Total" stroke="#6366f1" fill="url(#gradTotal)" strokeWidth={2} />
              <Area type="monotone" dataKey="completed" name="Completed" stroke="#22c55e" fill="url(#gradCompleted)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2-col: status distribution + action item trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status distribution donut */}
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Status Distribution</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">Meeting outcomes breakdown</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  style={{ fontSize: 10 }}
                >
                  {statusData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action item completion bar chart */}
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Action Item Completion</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">Completed vs total action items per period</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={actionTrendData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-secondary-200, #e5e7eb)" opacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="total" name="Total" fill="#e0e7ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="done" name="Done" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 2-col: duration histogram + cadence heatmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Duration histogram */}
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Duration Distribution</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">How long meetings typically last</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-secondary-200, #e5e7eb)" opacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} content={<ChartTooltip />} />
                <Bar dataKey="count" name="Meetings" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                  {durationData.map((_, i) => (
                    <Cell key={i} fill={['#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9'][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Meeting cadence heatmap */}
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Meeting Cadence</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">When meetings are typically held (day × hour)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-2xs">
              <thead>
                <tr>
                  <th className="text-left text-secondary-500 dark:text-secondary-400 pb-1 pr-2" />
                  {HOURS.map((h) => (
                    <th key={h} className="text-center text-secondary-500 dark:text-secondary-400 pb-1 px-0.5 font-normal">
                      {h > 12 ? `${h - 12}p` : h === 12 ? '12p' : `${h}a`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, di) => (
                  <tr key={day}>
                    <td className="text-secondary-500 dark:text-secondary-400 pr-2 py-0.5 font-medium">{day}</td>
                    {HOURS.map((_, hi) => (
                      <td key={hi} className="px-0.5 py-0.5">
                        <div
                          className={clsx('w-full aspect-square rounded-sm min-w-[18px]', cadenceColor(cadenceData[di][hi]))}
                          title={`${day} ${HOURS[hi]}:00 — ${cadenceData[di][hi]} meetings`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Legend */}
            <div className="flex items-center gap-2 mt-2 text-2xs text-secondary-400">
              <span>Less</span>
              {['bg-secondary-100 dark:bg-secondary-700', 'bg-indigo-100 dark:bg-indigo-900/40', 'bg-indigo-300 dark:bg-indigo-700', 'bg-indigo-500 dark:bg-indigo-500'].map((c, i) => (
                <span key={i} className={clsx('w-3 h-3 rounded-sm', c)} />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue action items table */}
      {overdueItems.length > 0 && (
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Overdue Action Items</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">
            Incomplete items from completed meetings ({overdueItems.length})
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-200/60 dark:border-white/[0.06]">
                  {['Meeting Date', 'Participant', 'Action Item', 'Assignee'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 pb-2 pr-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overdueItems.map((item, i) => (
                  <tr key={i} className="border-b border-secondary-100 dark:border-secondary-700/50 last:border-0">
                    <td className="py-2.5 pr-4 text-xs text-secondary-600 dark:text-secondary-300 whitespace-nowrap">
                      {item.meetingDate}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-secondary-900 dark:text-white font-medium whitespace-nowrap">
                      {item.participant}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-secondary-700 dark:text-secondary-300 max-w-xs break-words">
                      {item.title}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-2xs font-medium text-amber-700 dark:text-amber-400">
                        {item.assignee}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
