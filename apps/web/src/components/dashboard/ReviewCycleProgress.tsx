import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { reviewsApi } from '@/lib/api/reviews';
import { useChartColors } from '@/hooks/useChartColors';
import { ChartTooltip } from '@/components/ui';
import { useLiveDashboard } from '@/hooks/useLiveDashboard';

interface ReviewCycleProgressProps {
  className?: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted',
  ACKNOWLEDGED: 'Acknowledged',
};

export default function ReviewCycleProgress({ className = '' }: ReviewCycleProgressProps) {
  const cc = useChartColors();
  const { pollingInterval } = useLiveDashboard();

  const { data: reviews } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => reviewsApi.listMyReviews({}),
    staleTime: 120_000,
    refetchInterval: pollingInterval || undefined,
  });

  const STATUS_COLORS: Record<string, string> = {
    PENDING: cc.semantic.neutral,
    IN_PROGRESS: cc.primary,
    SUBMITTED: cc.semantic.info,
    ACKNOWLEDGED: cc.semantic.success,
  };

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(STATUS_LABELS).forEach((s) => (counts[s] = 0));

    (reviews ?? []).forEach((r) => {
      const status = r.status?.toUpperCase().replace(/\s+/g, '_') ?? 'PENDING';
      if (status in counts) counts[status]++;
      else counts['PENDING']++;
    });

    return Object.entries(STATUS_LABELS).map(([key, label]) => ({
      status: key,
      label,
      count: counts[key],
    }));
  }, [reviews]);

  const total = reviews?.length ?? 0;

  return (
    <div className={`glass-deep rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Review Cycle Progress</h3>
        <span className="text-2xs text-slate-500 dark:text-slate-400">{total} reviews</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={cc.gridColor} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fontWeight: 600, fill: cc.tickColor }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11, fontWeight: 600, fill: cc.tickColor }}
            width={90}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: cc.cursorFill }} />
          <Bar dataKey="count" name="Reviews" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {data.map((entry) => (
              <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? cc.primary} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
