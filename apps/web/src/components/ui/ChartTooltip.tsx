import type { TooltipProps } from 'recharts';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// ChartTooltip — Premium theme-adaptive Recharts tooltip
// ---------------------------------------------------------------------------
// Ultra-smooth, GPU-accelerated tooltip with glassmorphism styling.
// Works seamlessly in light, dark, and deep-dark themes.
// Usage: <Tooltip content={<ChartTooltip />} isAnimationActive={false} />
// ---------------------------------------------------------------------------

interface ChartTooltipProps extends TooltipProps<number | string, string> {
  /** Optional unit suffix (e.g., "%", " pts") */
  unit?: string;
  className?: string;
  /** Color the label text to match its chart series (default: true) */
  colorLabels?: boolean;
}

export function ChartTooltip({ active, payload, label, unit = '', className, colorLabels = true }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className={clsx(
        'rounded-lg px-3 py-2 text-xs',
        'bg-white/95 dark:bg-secondary-800/95',
        'border border-secondary-200/80 dark:border-secondary-600/60',
        'shadow-lg ring-1 ring-black/[0.04] dark:ring-white/[0.06]',
        className,
      )}
    >
      {label != null && (
        <p className="font-semibold text-secondary-800 dark:text-secondary-100 mb-1">
          {label}
        </p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 leading-relaxed">
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-white/30"
            style={{ backgroundColor: entry.color ?? '#6366f1' }}
          />
          <span
            className={clsx(!colorLabels && 'text-secondary-500 dark:text-secondary-400')}
            style={colorLabels ? { color: entry.color ?? undefined } : undefined}
          >
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
