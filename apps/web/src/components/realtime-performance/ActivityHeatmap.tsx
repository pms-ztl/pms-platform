/**
 * Activity Heatmap Component
 * GitHub-style contribution heatmap for individual and team activity
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDaysIcon, UserGroupIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { useAuthStore } from '@/store/auth';

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

const LEVEL_COLORS = [
  'bg-secondary-100 dark:bg-secondary-800',       // 0 - no activity
  'bg-emerald-200 dark:bg-emerald-900/60',         // 1 - low
  'bg-emerald-400 dark:bg-emerald-700/80',         // 2 - medium
  'bg-emerald-500 dark:bg-emerald-600',            // 3 - high
  'bg-emerald-700 dark:bg-emerald-500',            // 4 - very high
];

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function HeatmapGrid({ data, compact = false }: { data: HeatmapDay[]; compact?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the right (current date) on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data]);

  const { weeks, monthPositions } = useMemo(() => {
    if (!data || data.length === 0) {
      return { weeks: [], monthPositions: [] };
    }

    // Group data into weeks (columns)
    const weeksArr: HeatmapDay[][] = [];
    let currentWeek: HeatmapDay[] = [];

    // Pad the first week if it doesn't start on Sunday
    const firstDate = new Date(data[0].date);
    const firstDayOfWeek = firstDate.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: '', count: 0, level: -1 }); // -1 = empty
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

    // Calculate month label positions
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

  const cellSize = compact ? 10 : 13;
  const cellGap = 2;
  const totalCellSize = cellSize + cellGap;

  if (weeks.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-secondary-400 dark:text-secondary-500 text-sm">
        No activity data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" ref={scrollRef}>
      <div style={{ minWidth: weeks.length * totalCellSize + 40 }}>
        {/* Month labels */}
        <div className="flex" style={{ marginLeft: compact ? 0 : 32 }}>
          {monthPositions.map((pos, i) => (
            <span
              key={i}
              className="text-2xs text-secondary-400 dark:text-secondary-500"
              style={{
                position: 'relative',
                left: pos.col * totalCellSize,
                marginRight: i < monthPositions.length - 1
                  ? ((monthPositions[i + 1]?.col || 0) - pos.col) * totalCellSize - 20
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
            <div className="flex flex-col mr-1" style={{ gap: cellGap }}>
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="text-2xs text-secondary-400 dark:text-secondary-500 flex items-center justify-end pr-1"
                  style={{ height: cellSize, width: 28 }}
                >
                  {label}
                </div>
              ))}
            </div>
          )}

          {/* Weeks */}
          <div className="flex" style={{ gap: cellGap }}>
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col" style={{ gap: cellGap }}>
                {week.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    className={`rounded-sm ${day.level === -1 ? '' : LEVEL_COLORS[day.level] || LEVEL_COLORS[0]} transition-colors group relative`}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      opacity: day.level === -1 ? 0 : 1,
                    }}
                  >
                    {/* Tooltip */}
                    {day.date && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                        <div className="bg-secondary-900 dark:bg-secondary-700 text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap shadow-lg">
                          <span className="font-semibold">{day.count} activit{day.count !== 1 ? 'ies' : 'y'}</span>
                          <span className="text-secondary-300 ml-1">
                            on {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-3 text-2xs text-secondary-400 dark:text-secondary-500">
        <span>Less</span>
        {LEVEL_COLORS.map((color, i) => (
          <div key={i} className={`${color} rounded-sm`} style={{ width: cellSize, height: cellSize }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

export function ActivityHeatmap({ mode = 'individual' }: { mode?: 'individual' | 'team' }) {
  const { user } = useAuthStore();
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  // Individual heatmap
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

  // Team heatmap
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

  const totalActivities = useMemo(() => {
    if (mode === 'individual' && individualData) {
      return individualData.reduce((sum, d) => sum + d.count, 0);
    }
    if (mode === 'team' && teamData) {
      return teamData.teamAggregate.reduce((sum, d) => sum + d.count, 0);
    }
    return 0;
  }, [mode, individualData, teamData]);

  const isLoading = mode === 'individual' ? loadingIndividual : loadingTeam;

  return (
    <div className="bg-white dark:bg-secondary-800/50 rounded-2xl border border-secondary-200/60 dark:border-secondary-700/60 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-secondary-200/60 dark:border-secondary-700/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10">
              {mode === 'individual' ? (
                <CalendarDaysIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <UserGroupIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">
                {mode === 'individual' ? 'Activity Heatmap' : 'Team Activity Heatmap'}
              </h3>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">
                {totalActivities} total activities in the last year
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
          </div>
        ) : mode === 'individual' ? (
          <HeatmapGrid data={individualData || []} />
        ) : (
          <div className="space-y-6">
            {/* Team aggregate */}
            <div>
              <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-3">
                Team Overview
              </h4>
              <HeatmapGrid data={teamData?.teamAggregate || []} />
            </div>

            {/* Individual members */}
            {teamData?.members && teamData.members.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-3">
                  Team Members
                </h4>
                <div className="space-y-2">
                  {teamData.members.map((member) => (
                    <div
                      key={member.userId}
                      className="border border-secondary-200/60 dark:border-secondary-700/60 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => toggleMember(member.userId)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary-50 dark:hover:bg-secondary-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
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
                        <div className="px-4 pb-4">
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
      </div>
    </div>
  );
}
