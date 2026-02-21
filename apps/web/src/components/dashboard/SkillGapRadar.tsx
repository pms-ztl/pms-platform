import { useQuery } from '@tanstack/react-query';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { skillsApi, type SkillMatrixEntry } from '@/lib/api';
import { SkeletonCard, Badge } from '@/components/ui';

interface SkillGapRadarProps {
  userId: string;
}

function SkillGapRadar({ userId }: SkillGapRadarProps) {
  const { data: skills, isLoading } = useQuery({
    queryKey: ['skill-matrix', userId],
    queryFn: () => skillsApi.getUserSkillMatrix(userId),
    staleTime: 120_000,
    enabled: !!userId,
  });

  if (isLoading) return <SkeletonCard />;

  const matrix = skills ?? [];

  if (!matrix.length) {
    return (
      <div className="glass-deep rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AcademicCapIcon className="w-5 h-5 text-violet-500" />
          <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Skill Gap Analysis</h3>
        </div>
        <p className="text-sm text-secondary-500 dark:text-secondary-400">No skill assessments yet. Ask your manager to set up skill targets.</p>
      </div>
    );
  }

  const chartData = matrix.slice(0, 8).map((s: SkillMatrixEntry) => ({
    skill: s.skillName.length > 12 ? s.skillName.slice(0, 12) + '...' : s.skillName,
    current: s.currentLevel,
    target: s.targetLevel,
    fullName: s.skillName,
  }));

  const topGaps = [...matrix]
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);

  return (
    <div className="glass-deep rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <AcademicCapIcon className="w-5 h-5 text-violet-500" />
        <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Skill Gap Analysis</h3>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="var(--color-secondary-300, #cbd5e1)" strokeOpacity={0.3} />
            <PolarAngleAxis
              dataKey="skill"
              tick={{ fontSize: 10, fill: 'var(--color-secondary-500, #64748b)' }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 5]}
              tick={{ fontSize: 9, fill: 'var(--color-secondary-400, #94a3b8)' }}
            />
            <Radar
              name="Current"
              dataKey="current"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Radar
              name="Target"
              dataKey="target"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.1}
              strokeWidth={2}
              strokeDasharray="4 4"
            />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {topGaps.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[11px] font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">Top Gaps</p>
          {topGaps.map((g, i) => (
            <div key={g.skillId ?? g.skillName ?? i} className="flex items-center justify-between text-xs">
              <span className="text-secondary-700 dark:text-secondary-300 truncate max-w-[60%]">{g.skillName}</span>
              <Badge variant={g.gap >= 2 ? 'danger' : g.gap >= 1 ? 'warning' : 'info'} size="sm">
                Gap: {g.gap}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SkillGapRadar;
