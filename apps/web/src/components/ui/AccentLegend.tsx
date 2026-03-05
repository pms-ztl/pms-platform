import clsx from 'clsx';

// ---------------------------------------------------------------------------
// AccentLegend — Chart legend with colored label text
// ---------------------------------------------------------------------------
// Unlike Recharts' built-in <Legend> which renders gray text, AccentLegend
// colors each label to match its corresponding chart element.
// ---------------------------------------------------------------------------

export interface LegendItem {
  label: string;
  color: string;
  /** Shape of the swatch: circle (default), square, or line */
  shape?: 'circle' | 'square' | 'line';
  /** Optional value to display after the label */
  value?: string | number;
}

interface AccentLegendProps {
  items: LegendItem[];
  className?: string;
  /** Layout direction */
  direction?: 'horizontal' | 'vertical';
  /** Size of the swatch */
  size?: 'sm' | 'md';
}

export function AccentLegend({
  items,
  className,
  direction = 'horizontal',
  size = 'sm',
}: AccentLegendProps) {
  const swatchSize = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';
  const fontSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <div
      className={clsx(
        'flex flex-wrap gap-x-4 gap-y-1',
        direction === 'vertical' && 'flex-col',
        className,
      )}
    >
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {/* Swatch */}
          {item.shape === 'line' ? (
            <span
              className="inline-block w-3.5 h-[2px] rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
          ) : (
            <span
              className={clsx(
                'inline-block flex-shrink-0',
                swatchSize,
                item.shape === 'square' ? 'rounded-[2px]' : 'rounded-full',
              )}
              style={{ backgroundColor: item.color }}
            />
          )}

          {/* Colored label */}
          <span
            className={clsx(fontSize, 'font-medium whitespace-nowrap')}
            style={{ color: item.color }}
          >
            {item.label}
          </span>

          {/* Optional value */}
          {item.value != null && (
            <span
              className={clsx(fontSize, 'font-semibold')}
              style={{ color: item.color }}
            >
              {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
