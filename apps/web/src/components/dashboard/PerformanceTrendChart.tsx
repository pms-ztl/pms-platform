import { useQuery } from '@tanstack/react-query';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { analyticsApi, type GoalTrend } from '@/lib/api';
import { SkeletonCard, ChartTooltip } from '@/components/ui';
import { useChartColors } from '@/hooks/useChartColors';

interface PerformanceTrendChartProps {
  currentScore: number;
}

function PerformanceTrendChart({ currentScore }: PerformanceTrendChartProps) {
  const cc = useChartColors();
  const { data: trends, isLoading } = useQuery({
    queryKey: ['goal-trends-dashboard'],
    queryFn: () => analyticsApi.getGoalTrends(12),
    staleTime: 120_000,
  });

  if (isLoading) return <SkeletonCard />;

  const chartData = (trends ?? []).map((t: GoalTrend) => ({
    month: t.month.slice(0, 7), // "2026-01"
    label: new Date(t.month).toLocaleDateString('en-US', { month: 'short' }),
    rate: Math.round(t.completionRate),
  }));

  if (!chartData.length) {
    return (
      <div className="glass-deep rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <ArrowTrendingUpIcon className="w-5 h-5 text-primary-500" />
          <h3 className="text-sm font-bold text-secondary-700 dark:text-secondary-300">Performance Trend</h3>
        </div>
        <p className="text-sm text-secondary-500 dark:text-secondary-400">Not enough data yet. Performance trends will appear as you progress.</p>
      </div>
    );
  }

  return (
    <div className="glass-deep rounded-2xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ArrowTrendingUpIcon className="w-5 h-5 text-primary-500" />
          <h3 className="text-sm font-bold text-secondary-700 dark:text-secondary-300">Performance Trend</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-bold text-secondary-900 dark:text-white">{Math.round(currentScore)}</span>
          <span className="text-xs text-secondary-500 dark:text-secondary-400">/100</span>
        </div>
      </div>

      <div className="flex-1 min-h-[10rem]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="perfTrendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={cc.primary} stopOpacity={0.45} />
                <stop offset="95%" stopColor={cc.primary} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-secondary-400, #94a3b8)" strokeOpacity={0.45} strokeWidth={1.5} />
            <XAxis
              dataKey="label"
              tick={{   fontSize: 11, fontWeight: 600, fill: 'var(--color-secondary-300, #cbd5e1)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{   fontSize: 11, fontWeight: 600, fill: 'var(--color-secondary-300, #cbd5e1)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip isAnimationActive={false} content={<ChartTooltip unit="%" />} cursor={{ fill: cc.cursorFill }} />
            <Area
              type="monotone"
              dataKey="rate"
              name="Rate"
              stroke={cc.primary}
              strokeWidth={3}
              fill="url(#perfTrendGradient)"
              dot={{ r: 4, fill: cc.primary, strokeWidth: 2, stroke: cc.primaryExtraDark }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-2">
        Goal completion rate over the last 12 months
      </p>
    </div>
  );
}

export default PerformanceTrendChart;
