import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import clsx from 'clsx';

interface MemberScore {
  userId: string;
  name: string;
  score: number;
  zScore: number;
  category: 'high' | 'average' | 'low';
}

interface PerformanceDistributionProps {
  members: MemberScore[];
  className?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  high: '#10b981',
  average: '#3b82f6',
  low: '#f59e0b',
};

const CATEGORY_LABELS: Record<string, string> = {
  high: 'High Performer',
  average: 'On Track',
  low: 'Needs Attention',
};

export function PerformanceDistribution({ members, className }: PerformanceDistributionProps) {
  const chartData = useMemo(
    () => [...members].sort((a, b) => b.score - a.score).map((m) => ({
      ...m,
      shortName: (m.name ?? '').split(' ').map((n) => n[0]).join(''),
      displayName: (m.name ?? '').length > 15 ? (m.name ?? '').slice(0, 12) + '...' : (m.name ?? '—'),
    })),
    [members]
  );

  const categoryCounts = useMemo(() => {
    const counts = { high: 0, average: 0, low: 0 };
    members.forEach((m) => { counts[m.category]++; });
    return counts;
  }, [members]);

  if (members.length === 0) {
    return (
      <div className={clsx('bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6', className)}>
        <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">Performance Distribution</h3>
        <p className="text-sm text-secondary-400 text-center py-8">No team data available.</p>
      </div>
    );
  }

  return (
    <div className={clsx('bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6', className)}>
      <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Performance Distribution</h3>
      <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">Team members ranked by performance score</p>

      {/* Category summary */}
      <div className="flex gap-3 mb-4">
        {(['high', 'average', 'low'] as const).map((cat) => (
          <div
            key={cat}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: `${CATEGORY_COLORS[cat]}15`, color: CATEGORY_COLORS[cat] }}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
            {CATEGORY_LABELS[cat]}: {categoryCounts[cat]}
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
            <XAxis
              type="number"
              domain={[0, 'auto']}
              tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="displayName"
              tick={{ fontSize: 10, fill: 'var(--color-secondary-500, #6b7280)' }}
              axisLine={false}
              tickLine={false}
              width={100}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as MemberScore & { displayName: string };
                return (
                  <div className="bg-white dark:bg-secondary-800 shadow-lg rounded-lg px-3 py-2 border border-secondary-200 dark:border-secondary-700 text-xs space-y-1">
                    <p className="font-semibold text-secondary-900 dark:text-white">{d.name}</p>
                    <p className="text-secondary-600 dark:text-secondary-400">Score: {(d.score ?? 0).toFixed(2)}</p>
                    <p className="text-secondary-600 dark:text-secondary-400">Z-Score: {(d.zScore ?? 0).toFixed(2)}</p>
                    <p style={{ color: CATEGORY_COLORS[d.category] }}>{CATEGORY_LABELS[d.category]}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="score" radius={[0, 6, 6, 0]} maxBarSize={24}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={CATEGORY_COLORS[entry.category]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
