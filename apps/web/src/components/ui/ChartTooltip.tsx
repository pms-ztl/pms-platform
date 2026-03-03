import type { TooltipProps } from 'recharts';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// ChartTooltip — Standard light-themed Recharts tooltip
// ---------------------------------------------------------------------------
// Replaces the dark default Recharts tooltip with a clean, accessible design.
// Usage: <Tooltip content={<ChartTooltip />} />
// ---------------------------------------------------------------------------

interface ChartTooltipProps extends TooltipProps<number | string, string> {
  /** Optional unit suffix (e.g., "%", " pts") */
  unit?: string;
  className?: string;
}

export function ChartTooltip({ active, payload, label, unit = '', className }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className={clsx(
        'rounded-lg bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-600 shadow-lg px-3 py-2 text-sm',
        className,
      )}
    >
      {label != null && (
        <p className="font-medium text-secondary-700 dark:text-secondary-200 mb-1 text-xs">
          {label}
        </p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color ?? '#6366f1' }}
          />
          <span className="text-secondary-500 dark:text-secondary-400">
            {entry.name}:
          </span>
          <span className="font-semibold text-secondary-900 dark:text-white">
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}
