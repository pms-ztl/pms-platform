/**
 * Activity Heatmap Component
 * Premium GitHub-style contribution heatmap — cells auto-scale to fill width
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDaysIcon, UserGroupIcon, ChevronDownIcon, ChevronUpIcon, FireIcon, BoltIcon } from '@heroicons/react/24/outline';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { useAuthStore } from '@/store/auth';
import { useChartColors } from '@/hooks/useChartColors';

interface HeatmapDay {
  date: string;
  count: number;
  level: number; // 0-4
}

interface TeamMemberHeatmap {
  userId: string;
  name: string;
  heatmap: HeatmapDay[];
}

interface TeamHeatmapData {
  teamAggregate: HeatmapDay[];
  members: TeamMemberHeatmap[];
}

const LEVEL_COLORS_BG = [
  'bg-secondary-100 dark:bg-secondary-800',       // 0 - no activity
  'bg-emerald-200 dark:bg-emerald-900/60',         // 1 - low
  'bg-emerald-400 dark:bg-emerald-700/80',         // 2 - medium
  'bg-emerald-500 dark:bg-emerald-600',            // 3 - high
  'bg-emerald-700 dark:bg-emerald-500',            // 4 - very high
];

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

/** Compute stats from heatmap data */
function computeStats(data: HeatmapDay[]) {
  const activeDays = data.filter(d => d.count > 0);
  const total = activeDays.reduce((s, d) => s + d.count, 0);
  const bestDay = activeDays.length
    ? activeDays.reduce((a, b) => (b.count > a.count ? b : a))
    : null;

  let streak = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].count > 0) streak++;
    else if (streak > 0) break;
  }

  const weeks = new Set(activeDays.map(d => {
    const dt = new Date(d.date);
    const jan1 = new Date(dt.getFullYear(), 0, 1);
    return `${dt.getFullYear()}-${Math.ceil(((dt.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)}`;
  }));
  const avgPerWeek = weeks.size > 0 ? Math.round(total / weeks.size) : 0;

  return { total, activeDays: activeDays.length, bestDay, streak, avgPerWeek };
}

function HeatmapGrid({ data, compact = false }: { data: HeatmapDay[]; compact?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { weeks, monthPositions } = useMemo(() => {
    if (!data || data.length === 0) {
      return { weeks: [], monthPositions: [] };
    }

    const weeksArr: HeatmapDay[][] = [];
    let currentWeek: HeatmapDay[] = [];

    const firstDate = new Date(data[0].date);
    const firstDayOfWeek = firstDate.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: '', count: 0, level: -1 });
    }

    for (const day of data) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', count: 0, level: -1 });
      }
      weeksArr.push(currentWeek);
    }

    // NO trimming — use full data so cells can scale to fill width

    const positions: { month: string; col: number }[] = [];
    let lastMonth = '';
    for (let col = 0; col < weeksArr.length; col++) {
      for (const day of weeksArr[col]) {
        if (day.date) {
          const month = MONTH_LABELS[new Date(day.date).getMonth()];
          if (month !== lastMonth) {
            positions.push({ month, col });
            lastMonth = month;
          }
          break;
        }
      }
    }

    return { weeks: weeksArr, monthPositions: positions };
  }, [data]);

  // Calculate cell size to fill the container width
  const dayLabelWidth = compact ? 0 : 30;
  const minGap = 2;
  const numWeeks = weeks.length || 1;
  const availableWidth = Math.max(containerWidth - dayLabelWidth - 4, 100);
  // cellSize + gap must tile across numWeeks columns
  const rawCellTotal = availableWidth / numWeeks;
  const cellSize = Math.max(compact ? 8 : 10, Math.min(compact ? 14 : 22, Math.floor(rawCellTotal - minGap)));
  const cellGap = Math.max(1, Math.min(3, Math.floor(rawCellTotal - cellSize)));
  const totalCellSize = cellSize + cellGap;

  if (weeks.length === 0) {
    return (
      <div ref={containerRef} className="flex items-center justify-center py-6 text-secondary-400 dark:text-secondary-500 text-sm">
        No activity data available
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      {/* Month labels */}
      <div className="flex" style={{ marginLeft: dayLabelWidth }}>
        {monthPositions.map((pos, i) => (
          <span
            key={i}
            className="text-2xs font-medium text-secondary-500 dark:text-secondary-400 truncate"
            style={{
              position: 'relative',
              left: pos.col * totalCellSize,
              marginRight: i < monthPositions.length - 1
                ? Math.max(0, ((monthPositions[i + 1]?.col || 0) - pos.col) * totalCellSize - 28)
                : 0,
            }}
          >
            {pos.month}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="flex mt-1">
        {/* Day labels */}
        {!compact && (
          <div className="flex flex-col flex-shrink-0" style={{ gap: cellGap, width: dayLabelWidth }}>
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="text-2xs font-medium text-secondary-400 dark:text-secondary-500 flex items-center justify-end pr-1"
                style={{ height: cellSize }}
              >
                {label}
              </div>
            ))}
          </div>
        )}

        {/* Weeks grid — fills available width */}
        <div className="flex flex-1" style={{ gap: cellGap }}>
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col" style={{ gap: cellGap }}>
              {week.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  className={`rounded-[3px] ${day.level === -1 ? '' : LEVEL_COLORS_BG[day.level] || LEVEL_COLORS_BG[0]} transition-all duration-150 group relative hover:ring-2 hover:ring-emerald-400/50 hover:ring-offset-1 dark:hover:ring-offset-secondary-900`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    opacity: day.level === -1 ? 0 : 1,
                  }}
                >
                  {day.date && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                      <div className="bg-secondary-900 dark:bg-secondary-700 text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap shadow-xl">
                        <span className="font-semibold">{day.count} activit{day.count !== 1 ? 'ies' : 'y'}</span>
                        <span className="text-secondary-300 ml-1">
                          on {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-secondary-900 dark:border-t-secondary-700" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ActivityHeatmap({ mode = 'individual' }: { mode?: 'individual' | 'team' }) {
  const { user } = useAuthStore();
  const cc = useChartColors();
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  const { data: individualData, isLoading: loadingIndividual } = useQuery({
    queryKey: ['heatmap', 'individual'],
    queryFn: async () => {
      const res = await fetchWithAuth('/api/v1/realtime-performance/heatmap/individual');
      const json = await res.json();
      return json.data as HeatmapDay[];
    },
    enabled: mode === 'individual',
    staleTime: 60_000,
  });

  const { data: teamData, isLoading: loadingTeam } = useQuery({
    queryKey: ['heatmap', 'team'],
    queryFn: async () => {
      const res = await fetchWithAuth('/api/v1/realtime-performance/heatmap/team');
      const json = await res.json();
      return json.data as TeamHeatmapData;
    },
    enabled: mode === 'team',
    staleTime: 60_000,
  });

  const toggleMember = (userId: string) => {
    setExpandedMembers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const heatmapData = mode === 'individual' ? individualData : teamData?.teamAggregate;
  const stats = useMemo(() => computeStats(heatmapData || []), [heatmapData]);
  const isLoading = mode === 'individual' ? loadingIndividual : loadingTeam;

  return (
    <div className="glass-deep rounded-2xl overflow-hidden">
      {/* Header + inline legend */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/15">
              {mode === 'individual' ? (
                <CalendarDaysIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <UserGroupIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">
              {mode === 'individual' ? 'Activity Heatmap' : 'Team Activity'}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-2xs text-secondary-400 dark:text-secondary-500">
            <span>Less</span>
            {LEVEL_COLORS_BG.map((color, i) => (
              <div key={i} className={`${color} rounded-[2px]`} style={{ width: 10, height: 10 }} />
            ))}
            <span>More</span>
          </div>
        </div>

        {/* Stats row */}
        {!isLoading && stats.total > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 px-3 py-2 text-center">
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{stats.total}</p>
              <p className="text-2xs text-secondary-500 dark:text-secondary-400">total</p>
            </div>
            <div className="rounded-lg bg-secondary-50/80 dark:bg-secondary-800/50 px-3 py-2 text-center">
              <p className="text-lg font-bold text-secondary-800 dark:text-white">{stats.activeDays}</p>
              <p className="text-2xs text-secondary-500 dark:text-secondary-400">active days</p>
            </div>
            <div className="rounded-lg bg-secondary-50/80 dark:bg-secondary-800/50 px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1">
                <FireIcon className="w-3.5 h-3.5 text-orange-500" />
                <p className="text-lg font-bold text-secondary-800 dark:text-white">{stats.streak}</p>
              </div>
              <p className="text-2xs text-secondary-500 dark:text-secondary-400">day streak</p>
            </div>
            <div className="rounded-lg bg-secondary-50/80 dark:bg-secondary-800/50 px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1">
                <BoltIcon className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-lg font-bold text-secondary-800 dark:text-white">{stats.avgPerWeek}</p>
              </div>
              <p className="text-2xs text-secondary-500 dark:text-secondary-400">avg/week</p>
            </div>
          </div>
        )}
      </div>

      {/* Heatmap grid — fills full width */}
      <div className="px-5 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-emerald-500" />
          </div>
        ) : mode === 'individual' ? (
          <HeatmapGrid data={individualData || []} />
        ) : (
          <div className="space-y-4">
            <HeatmapGrid data={teamData?.teamAggregate || []} />

            {teamData?.members && teamData.members.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-2">
                  Team Members
                </h4>
                <div className="space-y-1.5">
                  {teamData.members.map((member) => (
                    <div
                      key={member.userId}
                      className="border border-secondary-200/60 dark:border-secondary-700/60 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => toggleMember(member.userId)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary-50 dark:hover:bg-secondary-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                            <span className="text-2xs font-medium text-emerald-700 dark:text-emerald-300">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-secondary-900 dark:text-white">
                            {member.name}
                          </span>
                          <span className="text-xs text-secondary-400">
                            {member.heatmap.reduce((sum, d) => sum + d.count, 0)} activities
                          </span>
                        </div>
                        {expandedMembers.has(member.userId) ? (
                          <ChevronUpIcon className="h-4 w-4 text-secondary-400" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4 text-secondary-400" />
                        )}
                      </button>
                      {expandedMembers.has(member.userId) && (
                        <div className="px-4 pb-3">
                          <HeatmapGrid data={member.heatmap} compact />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Best day callout */}
        {!isLoading && stats.bestDay && (
          <div className="mt-3 flex items-center gap-2 text-2xs text-secondary-500 dark:text-secondary-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Most active: <span className="font-medium text-secondary-700 dark:text-secondary-300">
              {stats.bestDay.count} activities on {new Date(stats.bestDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
