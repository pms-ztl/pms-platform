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
import { SkeletonCard, ChartTooltip } from '@/components/ui';
import { useChartColors } from '@/hooks/useChartColors';

interface TeamPerformanceChartProps {
  managerId: string;
  className?: string;
}

// Category colors derived from accent palette

function TeamPerformanceChart({ managerId, className = '' }: TeamPerformanceChartProps) {
  const cc = useChartColors();
  const CATEGORY_COLORS: Record<string, string> = {
    high: cc.semantic.success,
    average: cc.semantic.info,
    low: cc.semantic.danger,
  };
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
      <div className={`glass-deep rounded-2xl p-4 ${className}`}>
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
    <div className={`glass-deep rounded-2xl p-4 ${className}`}>
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
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-secondary-400, #94a3b8)" strokeOpacity={0.4} />
            <XAxis
              dataKey="name"
              tick={{  fontSize: 11, fontWeight: 600, fill: 'var(--color-secondary-300, #cbd5e1)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{  fontSize: 11, fontWeight: 600, fill: 'var(--color-secondary-300, #cbd5e1)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip isAnimationActive={false} content={<ChartTooltip />} cursor={{ fill: cc.cursorFill }} />
            <Bar dataKey="score" name="Score" radius={[4, 4, 0, 0]} barSize={24}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={CATEGORY_COLORS[entry.category] ?? cc.primary} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-2 text-xs">
        {Object.entries(CATEGORY_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span style={{ color }} className="font-medium capitalize">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TeamPerformanceChart;
