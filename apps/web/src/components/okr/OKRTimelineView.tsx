import { useMemo } from 'react';
import { FlagIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { Goal } from '@/lib/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function progressColor(p: number) {
  if (p >= 70) return 'bg-green-500';
  if (p >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function progressTextColor(p: number) {
  if (p >= 70) return 'text-green-600 dark:text-green-400';
  if (p >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface OKRTimelineViewProps {
  objectives: Goal[];
  krByParent: Map<string, Goal[]>;
  onCheckin: (krId: string) => void;
}

export function OKRTimelineView({ objectives, krByParent }: OKRTimelineViewProps) {
  const { minDate, maxDate, totalDays } = useMemo(() => {
    const now = new Date();
    let min = new Date(now.getFullYear(), now.getMonth(), 1);
    let max = new Date(now.getFullYear(), now.getMonth() + 3, 0);

    objectives.forEach((obj) => {
      if (obj.startDate && new Date(obj.startDate) < min) min = new Date(obj.startDate);
      if (obj.dueDate && new Date(obj.dueDate) > max) max = new Date(obj.dueDate);
      (krByParent.get(obj.id) || []).forEach((kr) => {
        if (kr.startDate && new Date(kr.startDate) < min) min = new Date(kr.startDate);
        if (kr.dueDate && new Date(kr.dueDate) > max) max = new Date(kr.dueDate);
      });
    });

    const days = Math.max(1, Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)));
    return { minDate: min, maxDate: max, totalDays: days };
  }, [objectives, krByParent]);

  const months = useMemo(() => {
    const result: Array<{ label: string; left: number; width: number }> = [];
    const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (current <= maxDate) {
      const start = Math.max(0, (current.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
      const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      const end = Math.min(totalDays, (nextMonth.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
      result.push({
        label: current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        left: (start / totalDays) * 100,
        width: ((end - start) / totalDays) * 100,
      });
      current.setMonth(current.getMonth() + 1);
    }
    return result;
  }, [minDate, maxDate, totalDays]);

  const todayPct = useMemo(() => {
    const now = new Date();
    const days = (now.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.min(100, (days / totalDays) * 100));
  }, [minDate, totalDays]);

  function getBarStyle(goal: Goal) {
    const start = goal.startDate ? new Date(goal.startDate) : minDate;
    const end = goal.dueDate ? new Date(goal.dueDate) : maxDate;
    const startPct = Math.max(0, ((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100);
    const endPct = Math.min(100, ((end.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100);
    return { left: `${startPct}%`, width: `${Math.max(2, endPct - startPct)}%` };
  }

  if (objectives.length === 0) {
    return (
      <div className="text-center py-16">
        <FlagIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
        <p className="mt-2 text-sm text-secondary-500 dark:text-secondary-400">No OKRs to display on timeline</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Month headers */}
          <div className="flex border-b border-secondary-200 dark:border-secondary-700">
            <div className="w-64 shrink-0 px-4 py-2 text-xs font-semibold text-secondary-500 dark:text-secondary-400 border-r border-secondary-200 dark:border-secondary-700">
              Objective / Key Result
            </div>
            <div className="flex-1 relative h-8">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full flex items-center text-[10px] font-medium text-secondary-400 dark:text-secondary-500 border-l border-secondary-100 dark:border-secondary-700 pl-1.5"
                  style={{ left: `${m.left}%`, width: `${m.width}%` }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {objectives.map((obj) => {
            const krs = krByParent.get(obj.id) || [];
            const avgProgress =
              krs.length > 0 ? Math.round(krs.reduce((s, kr) => s + kr.progress, 0) / krs.length) : obj.progress;

            return (
              <div key={obj.id}>
                {/* Objective row */}
                <div className="flex border-b border-secondary-100 dark:border-secondary-700/50 hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors">
                  <div className="w-64 shrink-0 px-4 py-3 border-r border-secondary-200 dark:border-secondary-700">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 shrink-0">
                        OBJ
                      </span>
                      <span className="text-sm font-medium text-secondary-900 dark:text-white truncate">
                        {obj.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={clsx('text-[10px] font-semibold', progressTextColor(avgProgress))}>
                        {avgProgress}%
                      </span>
                      <span className="text-[10px] text-secondary-400">
                        {obj.owner?.firstName} {obj.owner?.lastName?.[0]}.
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 relative py-3 px-2">
                    <div
                      className="absolute top-0 bottom-0 w-px bg-red-400 dark:bg-red-500 z-10 opacity-60"
                      style={{ left: `${todayPct}%` }}
                    />
                    <div
                      className="absolute top-2.5 h-6 rounded-md bg-primary-100 dark:bg-primary-900/30 border border-primary-300 dark:border-primary-700 overflow-hidden"
                      style={getBarStyle(obj)}
                    >
                      <div
                        className={clsx('h-full rounded-md', progressColor(avgProgress))}
                        style={{ width: `${Math.min(avgProgress, 100)}%`, opacity: 0.7 }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-secondary-900 dark:text-white">
                        {avgProgress}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* KR rows */}
                {krs.map((kr) => (
                  <div
                    key={kr.id}
                    className="flex border-b border-secondary-50 dark:border-secondary-800 bg-secondary-50/30 dark:bg-secondary-900/10 hover:bg-secondary-100/50 dark:hover:bg-secondary-800/30 transition-colors"
                  >
                    <div className="w-64 shrink-0 px-4 pl-10 py-2 border-r border-secondary-200 dark:border-secondary-700">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 shrink-0">
                          KR
                        </span>
                        <span className="text-xs text-secondary-700 dark:text-secondary-300 truncate">
                          {kr.title}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 relative py-2 px-2">
                      <div
                        className="absolute top-0 bottom-0 w-px bg-red-400 dark:bg-red-500 z-10 opacity-60"
                        style={{ left: `${todayPct}%` }}
                      />
                      <div
                        className="absolute top-1.5 h-4 rounded bg-secondary-200 dark:bg-secondary-700 overflow-hidden"
                        style={getBarStyle(kr)}
                      >
                        <div
                          className={clsx('h-full rounded', progressColor(kr.progress))}
                          style={{ width: `${Math.min(kr.progress, 100)}%`, opacity: 0.7 }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-secondary-800 dark:text-secondary-200">
                          {Math.round(kr.progress)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-secondary-200 dark:border-secondary-700 flex items-center gap-4 text-[10px] text-secondary-400 dark:text-secondary-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-6 bg-red-400 rounded-sm opacity-60" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-3 bg-green-500 rounded-sm opacity-70" />
          <span>On Track (&ge;70%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-3 bg-amber-500 rounded-sm opacity-70" />
          <span>At Risk (40-70%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-3 bg-red-500 rounded-sm opacity-70" />
          <span>Behind (&lt;40%)</span>
        </div>
      </div>
    </div>
  );
}
