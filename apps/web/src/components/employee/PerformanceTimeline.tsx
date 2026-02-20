import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { reviewsApi } from '@/lib/api';
import clsx from 'clsx';

interface PerformanceTimelineProps {
  userId: string;
  className?: string;
}

export function PerformanceTimeline({ userId, className }: PerformanceTimelineProps) {
  // Build timeline from review history
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['employee-reviews-timeline', userId],
    queryFn: () => reviewsApi.listMyReviews({ asReviewee: true }),
    staleTime: 120_000,
  });

  // Build chart data from reviews (sorted by date)
  const chartData = (Array.isArray(reviews) ? reviews : [])
    .filter((r: any) => r.overallRating && r.overallRating > 0)
    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((r: any) => ({
      date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      rating: Number(r.overallRating),
      cycle: r.cycleName || 'Review',
    }));

  if (isLoading) {
    return (
      <div className={clsx('bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6', className)}>
        <div className="h-4 w-40 bg-secondary-200 dark:bg-secondary-700 rounded animate-pulse mb-4" />
        <div className="h-48 bg-secondary-100 dark:bg-secondary-900/50 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={clsx('bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6', className)}>
      <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">
        Performance Timeline
      </h3>
      {chartData.length < 2 ? (
        <div className="text-center py-8">
          <p className="text-sm text-secondary-500 dark:text-secondary-400">
            Not enough review data to show a timeline.
          </p>
        </div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-secondary-200 dark:stroke-secondary-700" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-secondary-500 dark:fill-secondary-400" />
              <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} className="fill-secondary-500 dark:fill-secondary-400" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, #fff)',
                  borderColor: 'var(--tooltip-border, #e5e7eb)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value}/5`, 'Rating']}
              />
              <Area
                type="monotone"
                dataKey="rating"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#perfGradient)"
                dot={{ r: 4, fill: '#3b82f6' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
