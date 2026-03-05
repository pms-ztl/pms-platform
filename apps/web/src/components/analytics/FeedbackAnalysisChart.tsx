import { useQuery } from '@tanstack/react-query';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { analyticsApi, type FeedbackTrend } from '@/lib/api';
import { SkeletonCard, ChartTooltip } from '@/components/ui';
import { useChartColors } from '@/hooks/useChartColors';

interface FeedbackAnalysisChartProps {
  months?: number;
  className?: string;
}

// Feedback colors are semantic (praise=green, constructive=amber) - imported from hook

function FeedbackAnalysisChart({ months = 12, className = '' }: FeedbackAnalysisChartProps) {
  const cc = useChartColors();
  const PIE_COLORS = [...cc.feedbackColors];
  const { data, isLoading } = useQuery({
    queryKey: ['feedback-trends', months],
    queryFn: () => analyticsApi.getFeedbackTrends(months),
    staleTime: 120_000,
  });

  if (isLoading) return <SkeletonCard />;

  const trends: FeedbackTrend[] = data ?? [];

  if (!trends.length) {
    return (
      <div className={`glass-deep rounded-2xl p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <ChatBubbleLeftRightIcon className="w-5 h-5 text-teal-500" />
          <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Feedback Analysis</h3>
        </div>
        <p className="text-sm text-secondary-500 dark:text-secondary-400">No feedback data available.</p>
      </div>
    );
  }

  // Aggregate for pie chart
  const totalPraise = trends.reduce((sum, t) => sum + t.praise, 0);
  const totalConstructive = trends.reduce((sum, t) => sum + t.constructive, 0);
  const pieData = [
    { name: 'Praise', value: totalPraise },
    { name: 'Constructive', value: totalConstructive },
  ];

  // Line chart data
  const lineData = trends.map((t) => ({
    label: new Date(t.month).toLocaleDateString('en-US', { month: 'short' }),
    praise: t.praise,
    constructive: t.constructive,
    total: t.total,
  }));

  return (
    <div className={`glass-deep rounded-2xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <ChatBubbleLeftRightIcon className="w-5 h-5 text-teal-500" />
        <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Feedback Analysis</h3>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Pie Chart - ratio */}
        <div className="col-span-2 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                dataKey="value"
                strokeWidth={3}
                stroke="var(--color-surface-card, #fff)"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip isAnimationActive={false} content={<ChartTooltip />} cursor={{ fill: cc.cursorFill }} />
              <Legend wrapperStyle={{  fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart - trend */}
        <div className="col-span-3 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 600, fill: 'var(--color-secondary-300, #cbd5e1)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: 'var(--color-secondary-300, #cbd5e1)' }} axisLine={false} tickLine={false} />
              <Tooltip isAnimationActive={false} content={<ChartTooltip />} cursor={{ fill: cc.cursorFill }} />
              <Line type="monotone" dataKey="praise" name="Praise" stroke={cc.feedbackColors[0]} strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="constructive" name="Constructive" stroke={cc.feedbackColors[1]} strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default FeedbackAnalysisChart;
