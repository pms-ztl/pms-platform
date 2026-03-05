import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { oneOnOnesApi } from '@/lib/api/one-on-ones';
import { useChartColors } from '@/hooks/useChartColors';
import { useLiveDashboard } from '@/hooks/useLiveDashboard';

interface OneOnOneMeetingTrackerProps {
  className?: string;
}

/** Calendar heatmap showing 1-on-1 meeting cadence over the last 13 weeks */
export default function OneOnOneMeetingTracker({ className = '' }: OneOnOneMeetingTrackerProps) {
  const cc = useChartColors();
  const { pollingInterval } = useLiveDashboard();

  const { data: meetings } = useQuery({
    queryKey: ['one-on-ones'],
    queryFn: () => oneOnOnesApi.list({ limit: 200 }),
    staleTime: 120_000,
    refetchInterval: pollingInterval || undefined,
  });

  const { weeks, maxCount } = useMemo(() => {
    const now = new Date();
    const dayMs = 86400000;
    const startDate = new Date(now.getTime() - 90 * dayMs);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Align to Sunday

    // Count meetings per day
    const dayCounts: Record<string, number> = {};
    (meetings?.data ?? []).forEach((m) => {
      const d = m.scheduledAt?.split('T')[0];
      if (d) dayCounts[d] = (dayCounts[d] ?? 0) + 1;
    });

    const weeksArr: { date: string; count: number; dayOfWeek: number }[][] = [];
    let max = 0;
    const current = new Date(startDate);

    while (current <= now) {
      const week: { date: string; count: number; dayOfWeek: number }[] = [];
      for (let d = 0; d < 7 && current <= now; d++) {
        const key = current.toISOString().split('T')[0];
        const count = dayCounts[key] ?? 0;
        if (count > max) max = count;
        week.push({ date: key, count, dayOfWeek: current.getDay() });
        current.setDate(current.getDate() + 1);
      }
      weeksArr.push(week);
    }

    return { weeks: weeksArr, maxCount: max };
  }, [meetings]);

  function getColor(count: number): string {
    if (count === 0) return 'rgba(148,163,184,0.15)';
    const intensity = Math.min(count / Math.max(maxCount, 1), 1);
    if (intensity <= 0.25) return cc.rgba(200, 0.5);
    if (intensity <= 0.5) return cc.rgba(300, 0.6);
    if (intensity <= 0.75) return cc.rgba(500, 0.7);
    return cc.rgba(600, 0.85);
  }

  const totalMeetings = (meetings?.data ?? []).length;
  const completedCount = (meetings?.data ?? []).filter((m) => m.status === 'COMPLETED').length;

  return (
    <div className={`glass-deep rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">1-on-1 Meeting Cadence</h3>
        <span className="text-2xs text-slate-500 dark:text-slate-400">
          {completedCount}/{totalMeetings} completed
        </span>
      </div>
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <div
                key={day.date}
                className="w-3 h-3 rounded-[2px] transition-colors"
                style={{ backgroundColor: getColor(day.count) }}
                title={`${day.date}: ${day.count} meeting${day.count !== 1 ? 's' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 justify-end">
        <span className="text-3xs text-slate-400">Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((level) => (
          <div
            key={level}
            className="w-2.5 h-2.5 rounded-[2px]"
            style={{ backgroundColor: getColor(level * Math.max(maxCount, 1)) }}
          />
        ))}
        <span className="text-3xs text-slate-400">More</span>
      </div>
    </div>
  );
}
