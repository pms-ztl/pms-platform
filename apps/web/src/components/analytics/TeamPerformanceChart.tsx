import { useQuery } from '@tanstack/react-query';
import { UserGroupIcon } from '@heroicons/react/24/outline';
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

import { performanceMathApi, type TeamAnalyticsResult } from '@/lib/api';
import { SkeletonCard } from '@/components/ui';

interface TeamPerformanceChartProps {
  managerId: string;
  className?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  high: '#10b981',
  average: '#3b82f6',
  low: '#ef4444',
};

function TeamPerformanceChart({ managerId, className = '' }: TeamPerformanceChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['team-analytics', managerId],
    queryFn: () => performanceMathApi.getTeamAnalytics(managerId),
    staleTime: 120_000,
    enabled: !!managerId,
  });

  if (isLoading) return <SkeletonCard />;

  const teamData = data as TeamAnalyticsResult | undefined;
  const members = teamData?.memberZScores ?? [];

  if (!members.length) {
    return (
      <div className={`glass-deep rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <UserGroupIcon className="w-5 h-5 text-blue-500" />
          <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Team Performance</h3>
        </div>
        <p className="text-sm text-secondary-500 dark:text-secondary-400">No team data available yet.</p>
      </div>
    );
  }

  const chartData = members.map((m) => {
    const displayName = (m.name ?? m.userId ?? 'Unknown');
    return {
      name: displayName.length > 12 ? displayName.split(' ')[0] : displayName,
      fullName: displayName,
      score: Math.round(m.score ?? 0),
      zScore: Math.round((m.zScore ?? 0) * 100) / 100,
      category: m.category,
    };
  });

  return (
    <div className={`glass-deep rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UserGroupIcon className="w-5 h-5 text-blue-500" />
          <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Team Performance</h3>
        </div>
        <div className="text-xs text-secondary-500 dark:text-secondary-400">
          {members.length} members &middot; Average: {Math.round(teamData?.avgScore ?? 0)}
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: 'var(--color-secondary-500, #64748b)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #94a3b8)' }}
              axisLine={false}
              tickLine={false}
            />
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
              formatter={(value: number, _name: string, props: any) => [
                `Score: ${value} (z: ${props.payload.zScore})`,
                props.payload.fullName,
              ]}
            />
            <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={24}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={CATEGORY_COLORS[entry.category] ?? '#3b82f6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-2 text-[11px] text-secondary-400 dark:text-secondary-500">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> High</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Average</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Low</div>
      </div>
    </div>
  );
}

export default TeamPerformanceChart;
