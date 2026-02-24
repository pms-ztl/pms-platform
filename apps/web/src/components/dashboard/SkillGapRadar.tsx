import { useEffect, useState } from 'react';
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

/** Watch for Tailwind dark-class changes on <html> */
function useIsDark() {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

function SkillGapRadar({ userId }: SkillGapRadarProps) {
  const isDark = useIsDark();

  const { data: skills, isLoading } = useQuery({
    queryKey: ['skill-matrix', userId],
    queryFn: () => skillsApi.getUserSkillMatrix(userId),
    staleTime: 120_000,
    enabled: !!userId,
  });

  if (isLoading) return <SkeletonCard />;

  const matrix = skills ?? [];

  // Theme-aware colours for Recharts SVG props
  const gridStroke   = isDark ? '#475569' : '#94a3b8';   // slate-600 / slate-400
  const tickFill     = isDark ? '#94a3b8' : '#475569';   // slate-400 / slate-600
  const radiusFill   = isDark ? '#64748b' : '#94a3b8';   // slate-500 / slate-400

  const header = (
    <div className="flex items-center gap-2 mb-4">
      <AcademicCapIcon className="w-5 h-5 text-violet-500" />
      <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">
        Skill Gap Analysis
      </h3>
    </div>
  );

  if (!matrix.length) {
    return (
      <div className="glass-deep rounded-2xl p-6">
        {header}
        <p className="text-sm text-secondary-500 dark:text-secondary-400">
          No skill assessments yet. Ask your manager to set up skill targets.
        </p>
      </div>
    );
  }

  const chartData = matrix.slice(0, 8).map((s: SkillMatrixEntry) => ({
    skill: s.skillName.length > 13 ? s.skillName.slice(0, 13) + '…' : s.skillName,
    current: s.currentLevel,
    target: s.targetLevel,
    fullName: s.skillName,
  }));

  const topGaps = [...matrix]
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);

  // Radar needs ≥ 3 distinct axes to form a proper polygon
  const useRadar = chartData.length >= 3;

  const gapsList = topGaps.length > 0 && (
    <div className="mt-3 space-y-1.5">
      <p className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider">
        Top Gaps
      </p>
      {topGaps.map((g, i) => (
        <div key={g.skillId ?? g.skillName ?? i} className="flex items-center justify-between text-xs">
          <span className="text-secondary-700 dark:text-secondary-300 break-words">
            {g.skillName}
          </span>
          <Badge variant={g.gap >= 2 ? 'danger' : g.gap >= 1 ? 'warning' : 'info'} size="sm">
            Gap: {g.gap}
          </Badge>
        </div>
      ))}
    </div>
  );

  return (
    <div className="glass-deep rounded-2xl p-6">
      {header}

      {useRadar ? (
        /* ── Radar chart (≥ 3 skills) ── */
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke={gridStroke} strokeOpacity={0.65} />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fontSize: 10, fill: tickFill }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 5]}
                tick={{ fontSize: 9, fill: radiusFill }}
              />
              <Radar
                name="Current"
                dataKey="current"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.4}
                strokeWidth={2.5}
              />
              <Radar
                name="Target"
                dataKey="target"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.2}
                strokeWidth={2}
                strokeDasharray="4 4"
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: tickFill }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        /* ── Progress-bar fallback (< 3 skills) ── */
        <div className="space-y-3 py-1">
          {chartData.map((s, i) => (
            <div key={i}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-medium text-secondary-700 dark:text-secondary-300 break-words">
                  {s.fullName}
                </span>
                <span className="text-xs text-secondary-500 dark:text-secondary-400 tabular-nums">
                  {s.current} / {s.target}
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-secondary-200 dark:bg-secondary-700 overflow-hidden">
                {/* Target ghost bar */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-amber-400/35 dark:bg-amber-500/25"
                  style={{ width: `${(s.target / 5) * 100}%` }}
                />
                {/* Current bar */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-violet-500 dark:bg-violet-400 transition-all duration-500"
                  style={{ width: `${(s.current / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {/* Mini legend */}
          <div className="flex items-center gap-4 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400 inline-block" />
              <span className="text-2xs text-secondary-500 dark:text-secondary-400">Current</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full bg-amber-400/60 inline-block" />
              <span className="text-2xs text-secondary-500 dark:text-secondary-400">Target</span>
            </div>
          </div>
        </div>
      )}

      {gapsList}
    </div>
  );
}

export default SkillGapRadar;
