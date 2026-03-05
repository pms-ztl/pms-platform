import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { analyticsApi } from '@/lib/api/analytics';
import { useChartColors } from '@/hooks/useChartColors';
import { ChartTooltip } from '@/components/ui';
import { useLiveDashboard } from '@/hooks/useLiveDashboard';

interface TeamFeedbackActivityProps {
  months?: number;
  className?: string;
}

export default function TeamFeedbackActivity({ months = 6, className = '' }: TeamFeedbackActivityProps) {
  const cc = useChartColors();
  const { pollingInterval } = useLiveDashboard();

  const { data: trends } = useQuery({
    queryKey: ['feedback-trends', months],
    queryFn: () => analyticsApi.getFeedbackTrends(months),
    staleTime: 120_000,
    refetchInterval: pollingInterval || undefined,
  });

  const chartData = (trends ?? []).map((t) => ({
    month: t.month,
    Praise: t.praise ?? 0,
    Constructive: t.constructive ?? 0,
    Total: t.total ?? 0,
  }));

  return (
    <div className={`glass-deep rounded-xl p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">Team Feedback Activity</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={cc.gridColor} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600, fill: cc.tickColor }} />
          <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: cc.tickColor }} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: cc.primary, strokeDasharray: '4 4' }} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => (
              <span className="text-2xs text-slate-600 dark:text-slate-300">{value}</span>
            )}
          />
          <Line
            type="monotone"
            dataKey="Praise"
            name="Praise"
            stroke={cc.feedbackColors.praise}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="Constructive"
            name="Constructive"
            stroke={cc.feedbackColors.constructive}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
