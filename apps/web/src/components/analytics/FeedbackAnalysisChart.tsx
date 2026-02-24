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
import { SkeletonCard } from '@/components/ui';

interface FeedbackAnalysisChartProps {
  months?: number;
  className?: string;
}

const PIE_COLORS = ['#10b981', '#f59e0b'];

function FeedbackAnalysisChart({ months = 12, className = '' }: FeedbackAnalysisChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['feedback-trends', months],
    queryFn: () => analyticsApi.getFeedbackTrends(months),
    staleTime: 120_000,
  });

  if (isLoading) return <SkeletonCard />;

  const trends: FeedbackTrend[] = data ?? [];

  if (!trends.length) {
    return (
      <div className={`glass-deep rounded-2xl p-6 ${className}`}>
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
    <div className={`glass-deep rounded-2xl p-6 ${className}`}>
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
                strokeWidth={2}
                stroke="var(--color-surface-card, #fff)"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i]} />
                ))}
              </Pie>
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
                formatter={(value: number, name: string) => [`${value}`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart - trend */}
        <div className="col-span-3 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--color-secondary-400)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--color-secondary-400)' }} axisLine={false} tickLine={false} />
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
              <Line type="monotone" dataKey="praise" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="constructive" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default FeedbackAnalysisChart;
