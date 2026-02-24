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
import { SkeletonCard } from '@/components/ui';

interface PerformanceTrendChartProps {
  currentScore: number;
}

function PerformanceTrendChart({ currentScore }: PerformanceTrendChartProps) {
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
      <div className="glass-deep rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <ArrowTrendingUpIcon className="w-5 h-5 text-primary-500" />
          <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Performance Trend</h3>
        </div>
        <p className="text-sm text-secondary-500 dark:text-secondary-400">Not enough data yet. Performance trends will appear as you progress.</p>
      </div>
    );
  }

  return (
    <div className="glass-deep rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ArrowTrendingUpIcon className="w-5 h-5 text-primary-500" />
          <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Performance Trend</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-2xl font-bold text-secondary-900 dark:text-white">{Math.round(currentScore)}</span>
          <span className="text-xs text-secondary-500 dark:text-secondary-400">/100</span>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="perfTrendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary-500, #8b5cf6)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-primary-500, #8b5cf6)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-secondary-200, #e2e8f0)" strokeOpacity={0.3} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--color-secondary-400, #94a3b8)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: 'var(--color-secondary-400, #94a3b8)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
              contentStyle={{
                background: 'rgba(15, 23, 42, 0.80)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                borderRadius: '0.75rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
                fontSize: '0.75rem',
                color: '#f1f5f9',
              }}
              labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
              itemStyle={{ color: '#e2e8f0' }}
              formatter={(value: number) => [`${value}%`, 'Completion Rate']}
            />
            <Area
              type="monotone"
              dataKey="rate"
              stroke="var(--color-primary-500, #8b5cf6)"
              strokeWidth={2}
              fill="url(#perfTrendGradient)"
              dot={{ r: 3, fill: 'var(--color-primary-500, #8b5cf6)' }}
              activeDot={{ r: 5 }}
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
