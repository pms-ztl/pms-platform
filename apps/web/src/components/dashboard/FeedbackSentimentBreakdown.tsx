import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { analyticsApi } from '@/lib/api/analytics';
import { useChartColors } from '@/hooks/useChartColors';
import { ChartTooltip } from '@/components/ui';
import { useLiveDashboard } from '@/hooks/useLiveDashboard';

interface FeedbackSentimentBreakdownProps {
  months?: number;
  className?: string;
}

export default function FeedbackSentimentBreakdown({ months = 6, className = '' }: FeedbackSentimentBreakdownProps) {
  const cc = useChartColors();
  const { pollingInterval } = useLiveDashboard();

  const { data: trends } = useQuery({
    queryKey: ['feedback-trends', months],
    queryFn: () => analyticsApi.getFeedbackTrends(months),
    staleTime: 120_000,
    refetchInterval: pollingInterval || undefined,
  });

  const totals = (trends ?? []).reduce(
    (acc, t) => ({
      praise: acc.praise + (t.praise ?? 0),
      constructive: acc.constructive + (t.constructive ?? 0),
    }),
    { praise: 0, constructive: 0 }
  );

  const total = totals.praise + totals.constructive;

  const data = [
    { name: 'Praise', value: totals.praise, fill: cc.feedbackColors[0] },
    { name: 'Constructive', value: totals.constructive, fill: cc.feedbackColors[1] },
  ];

  return (
    <div className={`glass-deep rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Feedback Sentiment</h3>
        <span className="text-2xs text-slate-500 dark:text-slate-400">{total} total</span>
      </div>
      <div className="relative" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="75%"
              paddingAngle={4}
              dataKey="value"
              nameKey="name"
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span className="text-2xs text-slate-600 dark:text-slate-300">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label inside donut */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 24 }}>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{total}</p>
            <p className="text-2xs text-slate-500 dark:text-slate-400">feedback</p>
          </div>
        </div>
      </div>
      {total > 0 && (
        <div className="flex justify-center gap-6 mt-1">
          <div className="text-center">
            <p className="text-lg font-bold text-slate-800 dark:text-white">
              {Math.round((totals.praise / total) * 100)}%
            </p>
            <p className="text-2xs text-slate-500">Praise</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-800 dark:text-white">
              {Math.round((totals.constructive / total) * 100)}%
            </p>
            <p className="text-2xs text-slate-500">Constructive</p>
          </div>
        </div>
      )}
    </div>
  );
}
