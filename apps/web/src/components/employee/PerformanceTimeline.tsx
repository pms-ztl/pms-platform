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
import { ChartTooltip } from '@/components/ui';
import clsx from 'clsx';
import { useChartColors } from '@/hooks/useChartColors';

interface PerformanceTimelineProps {
  userId: string;
  className?: string;
}

export function PerformanceTimeline({ userId, className }: PerformanceTimelineProps) {
  const cc = useChartColors();
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
      <div className={clsx('bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6', className)}>
        <div className="h-4 w-40 bg-secondary-200 dark:bg-secondary-700 rounded animate-pulse mb-4" />
        <div className="h-48 bg-secondary-100 dark:bg-secondary-900/50 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={clsx('bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6', className)}>
      <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">
        Performance Timeline
      </h3>
      {chartData.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-secondary-500 dark:text-secondary-400">
            No review data with ratings yet.
          </p>
        </div>
      ) : chartData.length === 1 ? (
        /* Single data point — rich visual ring-gauge display */
        (() => {
          const r = chartData[0];
          const pct = (r.rating / 5) * 100;
          const circumference = 2 * Math.PI * 42;
          const dashLen = (r.rating / 5) * circumference;
          const level = r.rating >= 4.5 ? 'Outstanding' : r.rating >= 4 ? 'Excellent' : r.rating >= 3 ? 'Meets Expectations' : r.rating >= 2 ? 'Needs Improvement' : 'Below Expectations';
          const fullStars = Math.floor(r.rating);
          const hasHalf = r.rating - fullStars >= 0.3;
          return (
            <div className="flex flex-col items-center gap-2.5 py-1">
              {/* Ring gauge */}
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 100 100" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth="7"
                    className="stroke-secondary-200 dark:stroke-secondary-700" />
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth="7"
                    stroke={cc.primary} strokeLinecap="round"
                    strokeDasharray={`${dashLen} ${circumference}`}
                    style={{ transition: 'stroke-dasharray 1s ease-out' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold" style={{ color: cc.primary }}>{r.rating.toFixed(1)}</span>
                  <span className="text-xs font-medium text-secondary-400 dark:text-secondary-500">out of 5</span>
                </div>
              </div>

              {/* Stars */}
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <span key={i} className={clsx(
                    'text-lg leading-none',
                    i <= fullStars
                      ? 'text-amber-400'
                      : (i === fullStars + 1 && hasHalf)
                        ? 'text-amber-300'
                        : 'text-secondary-300 dark:text-secondary-600'
                  )}>★</span>
                ))}
              </div>

              {/* Level badge */}
              <span className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: `${cc.primary}18`, color: cc.primary }}>
                {level}
              </span>

              {/* Cycle + date */}
              <div className="text-center">
                <p className="text-sm font-semibold text-secondary-800 dark:text-secondary-200">{r.cycle}</p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400">{r.date}</p>
              </div>

              {/* Full-width gradient bar with scale */}
              <div className="w-full mt-1">
                <div className="w-full h-3 rounded-full bg-secondary-200 dark:bg-secondary-700 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${cc.primary}, ${cc.semantic?.success || cc.primary})` }} />
                </div>
                <div className="flex justify-between mt-1 px-0.5">
                  {[0, 1, 2, 3, 4, 5].map(n => (
                    <span key={n} className={clsx(
                      'text-2xs tabular-nums',
                      n === Math.round(r.rating) ? 'font-bold' : 'text-secondary-400 dark:text-secondary-500'
                    )} style={n === Math.round(r.rating) ? { color: cc.primary } : undefined}>
                      {n}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-2xs text-secondary-400 dark:text-secondary-500 text-center">
                More reviews will build your performance timeline
              </p>
            </div>
          );
        })()
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cc.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={cc.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-secondary-300 dark:stroke-secondary-500" strokeOpacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 600 }} className="fill-secondary-500 dark:fill-secondary-300" />
              <YAxis domain={[0, 5]} tick={{ fontSize: 11, fontWeight: 600 }} className="fill-secondary-500 dark:fill-secondary-300" />
              <Tooltip isAnimationActive={false} content={<ChartTooltip />} cursor={{ fill: cc.cursorFill }} />
              <Area
                type="monotone"
                dataKey="rating"
                stroke={cc.primary}
                strokeWidth={3}
                fill="url(#perfGradient)"
                dot={{ r: 4, fill: cc.primary, strokeWidth: 2, stroke: cc.primaryExtraDark }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
