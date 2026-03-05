import { useQuery } from '@tanstack/react-query';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { skillsApi } from '@/lib/api';
import clsx from 'clsx';
import { useChartColors } from '@/hooks/useChartColors';

interface ProfileSkillsRadarProps {
  userId: string;
  className?: string;
}

export function ProfileSkillsRadar({ userId, className }: ProfileSkillsRadarProps) {
  const cc = useChartColors();
  const { data: skills, isLoading } = useQuery({
    queryKey: ['skill-matrix-profile', userId],
    queryFn: () => skillsApi.getUserSkillMatrix(userId),
    staleTime: 120_000,
  });

  if (isLoading) {
    return (
      <div className={clsx('bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6', className)}>
        <div className="h-4 w-32 bg-secondary-200 dark:bg-secondary-700 rounded animate-pulse mb-4" />
        <div className="h-48 bg-secondary-100 dark:bg-secondary-900/50 rounded-full mx-auto w-48 animate-pulse" />
      </div>
    );
  }

  const skillEntries = Array.isArray(skills) ? skills : [];

  // Take top 8 skills by gap (most impactful to show)
  const chartData = skillEntries
    .sort((a: any, b: any) => Math.abs(b.gap || 0) - Math.abs(a.gap || 0))
    .slice(0, 8)
    .map((entry: any) => ({
      skill: entry.skillName,
      current: entry.currentLevel ?? 0,
      target: entry.targetLevel ?? 0,
    }));

  return (
    <div className={clsx('bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6', className)}>
      <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">
        Skills Radar
      </h3>
      {chartData.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-secondary-500 dark:text-secondary-400">No skills assessed yet.</p>
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="55%">
              <PolarGrid className="stroke-secondary-300 dark:stroke-secondary-500" strokeWidth={1.5} />
              <PolarAngleAxis
                dataKey="skill"
                tick={(props: any) => {
                  const { x, y, payload, cx, cy } = props;
                  const dx = x - (cx ?? 0);
                  const dy = y - (cy ?? 0);
                  const cos = dx / (Math.sqrt(dx * dx + dy * dy) || 1);
                  const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle';
                  const maxLen = Math.abs(cos) > 0.3 ? 18 : 14;
                  const raw: string = payload.value ?? '';
                  const label = raw.length > maxLen ? raw.slice(0, maxLen - 1).trimEnd() + '…' : raw;
                  return (
                    <text x={x} y={y} textAnchor={anchor} dominantBaseline="central"
                      fontSize={10} fontWeight={600} fill="currentColor"
                      className="fill-secondary-500 dark:fill-secondary-300">
                      {label}
                    </text>
                  );
                }}
              />
              <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
              <Radar
                name="Current"
                dataKey="current"
                stroke={cc.primary}
                fill={cc.primary}
                fillOpacity={0.2}
                strokeWidth={3}
              />
              <Radar
                name="Target"
                dataKey="target"
                stroke={cc.semantic.neutral}
                fill="none"
                strokeDasharray="5 5"
                strokeWidth={2.5}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
