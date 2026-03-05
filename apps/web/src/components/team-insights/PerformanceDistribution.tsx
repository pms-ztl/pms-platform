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
import { useChartColors } from '@/hooks/useChartColors';

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

// Category colors derived from semantic palette

const CATEGORY_LABELS: Record<string, string> = {
  high: 'High Performer',
  average: 'On Track',
  low: 'Needs Attention',
};

export function PerformanceDistribution({ members, className }: PerformanceDistributionProps) {
  const cc = useChartColors();
  const CATEGORY_COLORS: Record<string, string> = {
    high: cc.semantic.success,
    average: cc.semantic.info,
    low: cc.semantic.warning,
  };
  const chartData = useMemo(
    () => [...members].sort((a, b) => b.score - a.score).map((m) => ({
      ...m,
      shortName: (m.name ?? '').split(' ').map((n) => n[0]).join(''),
      displayName: m.name ?? '—',
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
      <div className={clsx('bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6', className)}>
        <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">Performance Distribution</h3>
        <p className="text-sm text-secondary-400 text-center py-8">No team data available.</p>
      </div>
    );
  }

  return (
    <div className={clsx('bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6', className)}>
      <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Performance Distribution</h3>
      <p className="text-xs text-secondary-600 dark:text-secondary-300 mb-3">Team members ranked by performance score</p>

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
      <div style={{ height: Math.max(80, Math.min(256, chartData.length * 40 + 40)) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
            <XAxis
              type="number"
              domain={[0, 'auto']}
              tick={{  fontSize: 11, fontWeight: 600, fill: 'var(--color-secondary-500, #64748b)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="displayName"
              tick={{  fontSize: 11, fontWeight: 600, fill: 'var(--color-secondary-500, #64748b)' }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Tooltip isAnimationActive={false}
              cursor={{ fill: cc.cursorFill }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as MemberScore & { displayName: string };
                return (
                  <div className="bg-white dark:bg-secondary-800 shadow-lg rounded-lg px-3 py-2 border border-secondary-200 dark:border-secondary-700 text-xs space-y-1">
                    <p className="font-semibold text-secondary-900 dark:text-white">{d.name}</p>
                    <p className="text-secondary-600 dark:text-secondary-300">Score: {(d.score ?? 0).toFixed(2)}</p>
                    <p className="text-secondary-600 dark:text-secondary-300">Z-Score: {(d.zScore ?? 0).toFixed(2)}</p>
                    <p style={{ color: CATEGORY_COLORS[d.category] }}>{CATEGORY_LABELS[d.category]}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={18}>
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
