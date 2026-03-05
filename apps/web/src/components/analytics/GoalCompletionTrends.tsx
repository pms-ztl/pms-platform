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
import { SkeletonCard, ChartTooltip } from '@/components/ui';
import { useChartColors } from '@/hooks/useChartColors';

interface GoalCompletionTrendsProps {
  months?: number;
  className?: string;
}

function GoalCompletionTrends({ months = 12, className = '' }: GoalCompletionTrendsProps) {
  const cc = useChartColors();
  const [colorCreated, colorCompleted] = cc.palette(2);
  const { data, isLoading } = useQuery({
    queryKey: ['goal-trends', months],
    queryFn: () => analyticsApi.getGoalTrends(months),
    staleTime: 120_000,
  });

  if (isLoading) return <SkeletonCard />;

  const trends: GoalTrend[] = data ?? [];

  if (!trends.length) {
    return (
      <div className={`glass-deep rounded-2xl p-4 ${className}`}>
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
    <div className={`glass-deep rounded-2xl p-4 ${className}`}>
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
                <stop offset="5%" stopColor={colorCreated} stopOpacity={0.2} />
                <stop offset="95%" stopColor={colorCreated} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="goalCompletedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colorCompleted} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colorCompleted} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-secondary-400, #94a3b8)" strokeOpacity={0.4} />
            <XAxis dataKey="label" tick={{  fontSize: 11, fontWeight: 600, fill: 'var(--color-secondary-300, #cbd5e1)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{  fontSize: 11, fontWeight: 600, fill: 'var(--color-secondary-300, #cbd5e1)' }} axisLine={false} tickLine={false} />
            <Tooltip isAnimationActive={false} content={<ChartTooltip />} cursor={{ fill: cc.cursorFill }} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Area type="monotone" dataKey="created" name="Created" stroke={colorCreated} fill="url(#goalCreatedGrad)" strokeWidth={3} />
            <Area type="monotone" dataKey="completed" name="Completed" stroke={colorCompleted} fill="url(#goalCompletedGrad)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default GoalCompletionTrends;
