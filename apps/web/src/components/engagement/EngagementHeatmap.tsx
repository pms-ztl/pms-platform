import { useMemo, useState } from 'react';
import clsx from 'clsx';

interface HeatmapPoint {
  date: string;
  score: number; // 0-5 range
}

interface EngagementHeatmapProps {
  trends: HeatmapPoint[];
  mode?: 'engagement' | 'pulse';
  className?: string;
}

const LEVEL_COLORS = [
  'bg-secondary-100 dark:bg-secondary-800',
  'bg-blue-200 dark:bg-blue-900/60',
  'bg-blue-300 dark:bg-blue-800/70',
  'bg-blue-400 dark:bg-blue-700/80',
  'bg-blue-500 dark:bg-blue-600',
  'bg-blue-700 dark:bg-blue-500',
];

const LEVEL_LABELS = ['No data', 'Very Low', 'Low', 'Moderate', 'High', 'Very High'];

function scoreToLevel(score: number): number {
  if (!score || score <= 0) return 0;
  if (score < 1.5) return 1;
  if (score < 2.5) return 2;
  if (score < 3.5) return 3;
  if (score < 4.5) return 4;
  return 5;
}

const CELL_SIZE = 14;
const CELL_GAP = 2;
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DayCell {
  date: string;
  score: number;
  level: number;
  empty: boolean;
}

export function EngagementHeatmap({ trends, mode = 'engagement', className }: EngagementHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<DayCell | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const { weeks, monthLabels } = useMemo(() => {
    // Build a date->score lookup from trends
    const scoreMap = new Map<string, number>();
    trends.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      scoreMap.set(key, t.score);
    });

    // Build 13 weeks (91 days) ending today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 90);

    // Align to start of week (Sunday)
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const allDays: DayCell[] = [];
    const cur = new Date(startDate);
    while (cur <= today) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      const score = scoreMap.get(key) ?? 0;
      allDays.push({
        date: key,
        score,
        level: scoreToLevel(score),
        empty: cur > today,
      });
      cur.setDate(cur.getDate() + 1);
    }

    // Group into weeks (7-day columns)
    const wks: DayCell[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      wks.push(allDays.slice(i, i + 7));
    }

    // Month labels — find where each month starts
    const labels: { text: string; col: number }[] = [];
    let lastMonth = -1;
    wks.forEach((week, colIdx) => {
      const firstDay = week.find((d) => !d.empty);
      if (firstDay) {
        const month = new Date(firstDay.date).getMonth();
        if (month !== lastMonth) {
          labels.push({ text: MONTHS_SHORT[month], col: colIdx });
          lastMonth = month;
        }
      }
    });

    return { weeks: wks, monthLabels: labels };
  }, [trends]);

  const handleMouseEnter = (cell: DayCell, e: React.MouseEvent) => {
    if (cell.empty) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const parent = (e.target as HTMLElement).closest('[data-heatmap-container]')?.getBoundingClientRect();
    if (parent) {
      setTooltipPos({ x: rect.left - parent.left + CELL_SIZE / 2, y: rect.top - parent.top - 8 });
    }
    setHoveredCell(cell);
  };

  return (
    <div className={clsx('bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6', className)}>
      <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">
        {mode === 'pulse' ? 'Pulse Check-in Activity' : 'Engagement Activity'}
      </h3>

      <div className="relative" data-heatmap-container>
        {/* Month labels */}
        <div className="flex ml-8" style={{ gap: 0 }}>
          {monthLabels.map((ml, i) => (
            <div
              key={i}
              className="text-[10px] text-secondary-400 dark:text-secondary-500"
              style={{
                position: 'absolute',
                left: 32 + ml.col * (CELL_SIZE + CELL_GAP),
                top: 0,
              }}
            >
              {ml.text}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex mt-5" style={{ gap: CELL_GAP }}>
          {/* Day labels */}
          <div className="flex flex-col justify-between flex-shrink-0" style={{ width: 28, height: 7 * (CELL_SIZE + CELL_GAP) - CELL_GAP }}>
            {[1, 3, 5].map((dayIdx) => (
              <div
                key={dayIdx}
                className="text-[10px] text-secondary-400 dark:text-secondary-500 leading-none"
                style={{ position: 'absolute', top: 20 + dayIdx * (CELL_SIZE + CELL_GAP) + 1 }}
              >
                {DAYS_SHORT[dayIdx]}
              </div>
            ))}
          </div>

          {/* Week columns */}
          {weeks.map((week, colIdx) => (
            <div key={colIdx} className="flex flex-col" style={{ gap: CELL_GAP }}>
              {week.map((cell, rowIdx) => (
                <div
                  key={rowIdx}
                  className={clsx(
                    'rounded-sm transition-colors',
                    cell.empty ? 'bg-transparent' : LEVEL_COLORS[cell.level],
                    !cell.empty && 'cursor-pointer hover:ring-1 hover:ring-secondary-400'
                  )}
                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
                  onMouseEnter={(e) => handleMouseEnter(cell, e)}
                  onMouseLeave={() => setHoveredCell(null)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {hoveredCell && !hoveredCell.empty && (
          <div
            className="absolute z-50 pointer-events-none"
            style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -100%)' }}
          >
            <div className="bg-secondary-900 text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap shadow-lg">
              <span className="font-semibold">{(hoveredCell.score ?? 0).toFixed(1)}/5</span>
              <span className="text-secondary-300 ml-1">{LEVEL_LABELS[hoveredCell.level]}</span>
              <span className="text-secondary-400 ml-1">
                {new Date(hoveredCell.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-secondary-900" />
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-4 text-[10px] text-secondary-400 dark:text-secondary-500">
        <span className="mr-1">Less</span>
        {LEVEL_COLORS.map((color, i) => (
          <div
            key={i}
            className={clsx('rounded-sm', color)}
            style={{ width: CELL_SIZE, height: CELL_SIZE }}
            title={LEVEL_LABELS[i]}
          />
        ))}
        <span className="ml-1">More</span>
      </div>
    </div>
  );
}
