import { useQuery } from '@tanstack/react-query';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { analyticsApi, type PerformanceDistribution } from '@/lib/api';
import { SkeletonCard } from '@/components/ui';

interface PerformanceDistributionChartProps {
  cycleId?: string;
  className?: string;
}

const RATING_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
const RATING_LABELS = ['Needs Improvement', 'Below Expectations', 'Meets Expectations', 'Exceeds Expectations', 'Outstanding'];

function PerformanceDistributionChart({ cycleId, className = '' }: PerformanceDistributionChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['perf-distribution', cycleId],
    queryFn: () => analyticsApi.getPerformanceDistribution(cycleId),
    staleTime: 120_000,
  });

  if (isLoading) return <SkeletonCard />;

  const distribution: PerformanceDistribution[] = data ?? [];

  if (!distribution.length) {
    return (
      <div className={`glass-deep rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <ChartBarIcon className="w-5 h-5 text-violet-500" />
          <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Performance Distribution</h3>
        </div>
        <p className="text-sm text-secondary-500 dark:text-secondary-400">No distribution data available.</p>
      </div>
    );
  }

  const chartData = distribution.map((d) => ({
    rating: `${d.rating} Star${d.rating !== 1 ? 's' : ''}`,
    ratingNum: d.rating,
    count: d.count,
    percentage: Math.round(d.percentage),
    label: RATING_LABELS[d.rating - 1] ?? `Rating ${d.rating}`,
  }));

  return (
    <div className={`glass-deep rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5 text-violet-500" />
          <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Performance Distribution</h3>
        </div>
        <span className="text-xs text-secondary-500 dark:text-secondary-400">
          {distribution.reduce((sum, d) => sum + d.count, 0)} ratings
        </span>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
            <XAxis
              dataKey="rating"
              tick={{ fontSize: 10, fill: 'var(--color-secondary-500)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--color-secondary-400)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface-card, #fff)',
                border: '1px solid var(--color-secondary-200)',
                borderRadius: '0.75rem',
                fontSize: '0.75rem',
              }}
              formatter={(value: number, _name: string, props: any) => [
                `${value} employees (${props.payload.percentage}%)`,
                props.payload.label,
              ]}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={36}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={RATING_COLORS[entry.ratingNum - 1] ?? '#3b82f6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default PerformanceDistributionChart;
