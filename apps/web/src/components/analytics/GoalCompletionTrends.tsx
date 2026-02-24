import { useQuery } from '@tanstack/react-query';
import { FlagIcon } from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { analyticsApi, type GoalTrend } from '@/lib/api';
import { SkeletonCard } from '@/components/ui';

interface GoalCompletionTrendsProps {
  months?: number;
  className?: string;
}

function GoalCompletionTrends({ months = 12, className = '' }: GoalCompletionTrendsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['goal-trends', months],
    queryFn: () => analyticsApi.getGoalTrends(months),
    staleTime: 120_000,
  });

  if (isLoading) return <SkeletonCard />;

  const trends: GoalTrend[] = data ?? [];

  if (!trends.length) {
    return (
      <div className={`glass-deep rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <FlagIcon className="w-5 h-5 text-emerald-500" />
          <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Goal Completion Trends</h3>
        </div>
        <p className="text-sm text-secondary-500 dark:text-secondary-400">No goal trend data available.</p>
      </div>
    );
  }

  const chartData = trends.map((t) => ({
    label: new Date(t.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    created: t.created,
    completed: t.completed,
    rate: Math.round(t.completionRate),
  }));

  return (
    <div className={`glass-deep rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FlagIcon className="w-5 h-5 text-emerald-500" />
          <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Goal Completion Trends</h3>
        </div>
        <span className="text-xs text-secondary-500 dark:text-secondary-400">Last {months} months</span>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="goalCreatedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="goalCompletedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-secondary-400)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-secondary-400)' }} axisLine={false} tickLine={false} />
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
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Area type="monotone" dataKey="created" name="Created" stroke="#3b82f6" fill="url(#goalCreatedGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" fill="url(#goalCompletedGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default GoalCompletionTrends;
