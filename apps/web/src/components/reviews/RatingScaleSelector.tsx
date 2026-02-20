import { useState } from 'react';
import { StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

// ── Types ────────────────────────────────────────────────────────────────────

export type RatingScaleType = 'stars' | 'descriptive' | 'numeric';

interface RatingScaleSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  scaleType?: RatingScaleType;
  compact?: boolean;
}

// ── Descriptive scale options ────────────────────────────────────────────────

const descriptiveOptions = [
  { value: 1, label: 'Needs Improvement', color: 'from-red-500 to-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300', desc: 'Performance significantly below expectations. Immediate action needed.' },
  { value: 2, label: 'Below Expectations', color: 'from-orange-500 to-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300', desc: 'Performance below expectations in some areas. Development plan recommended.' },
  { value: 3, label: 'Meets Expectations', color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', desc: 'Consistently meets performance expectations. Solid contributor.' },
  { value: 4, label: 'Exceeds Expectations', color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', desc: 'Frequently exceeds expectations. Strong performer with growth potential.' },
  { value: 5, label: 'Exceptional', color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800', text: 'text-violet-700 dark:text-violet-300', desc: 'Outstanding performance across all areas. Role model for the team.' },
];

// ── Stars scale ──────────────────────────────────────────────────────────────

function StarsScale({ value, onChange, disabled, compact }: { value: number; onChange: (v: number) => void; disabled?: boolean; compact?: boolean }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className={clsx('flex', compact ? 'gap-0.5' : 'gap-1')}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => !disabled && onChange(rating)}
          onMouseEnter={() => !disabled && setHovered(rating)}
          onMouseLeave={() => setHovered(0)}
          disabled={disabled}
          className={clsx('transition-all', disabled ? 'cursor-default' : 'hover:scale-110 cursor-pointer')}
        >
          {rating <= (hovered || value) ? (
            <StarSolidIcon className={clsx(compact ? 'h-5 w-5' : 'h-6 w-6', 'text-warning-400')} />
          ) : (
            <StarIcon className={clsx(compact ? 'h-5 w-5' : 'h-6 w-6', 'text-secondary-300 dark:text-secondary-600')} />
          )}
        </button>
      ))}
      {!compact && value > 0 && (
        <span className="ml-2 text-xs text-secondary-500 self-center">
          {descriptiveOptions[value - 1]?.label || ''}
        </span>
      )}
    </div>
  );
}

// ── Descriptive scale ────────────────────────────────────────────────────────

function DescriptiveScale({ value, onChange, disabled, compact }: { value: number; onChange: (v: number) => void; disabled?: boolean; compact?: boolean }) {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const showTooltip = hoveredValue !== null;

  return (
    <div className="space-y-2">
      <div className={clsx('flex flex-wrap', compact ? 'gap-1.5' : 'gap-2')}>
        {descriptiveOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => !disabled && onChange(opt.value)}
            onMouseEnter={() => !disabled && setHoveredValue(opt.value)}
            onMouseLeave={() => setHoveredValue(null)}
            disabled={disabled}
            className={clsx(
              'relative rounded-lg font-medium transition-all',
              compact ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-2 text-xs',
              disabled ? 'cursor-default' : 'cursor-pointer',
              value === opt.value
                ? `${opt.bg} ${opt.border} border-2 ${opt.text} shadow-sm`
                : 'border border-secondary-200 dark:border-secondary-600 text-secondary-600 dark:text-secondary-400 hover:border-secondary-300 dark:hover:border-secondary-500'
            )}
          >
            <span className={clsx(value === opt.value && 'font-semibold')}>{opt.label}</span>
            {/* Color indicator dot */}
            <div className={clsx(
              'absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-gradient-to-r transition-opacity',
              opt.color,
              value === opt.value ? 'opacity-100' : 'opacity-0'
            )} />
          </button>
        ))}
      </div>

      {/* Tooltip description */}
      {showTooltip && !compact && (
        <div className={clsx(
          'px-3 py-2 rounded-lg text-xs italic transition-all',
          descriptiveOptions[(hoveredValue ?? 1) - 1]?.bg,
          descriptiveOptions[(hoveredValue ?? 1) - 1]?.text,
        )}>
          {descriptiveOptions[(hoveredValue ?? 1) - 1]?.desc}
        </div>
      )}
    </div>
  );
}

// ── Numeric scale (1-10 slider) ──────────────────────────────────────────────

function NumericScale({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const displayValue = Math.min(10, Math.max(0, Math.round(value * 2)));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={displayValue}
          onChange={(e) => !disabled && onChange(+e.target.value / 2)}
          disabled={disabled}
          className="flex-1 accent-primary-500 h-2"
        />
        <div className="w-12 text-center">
          <span className="text-lg font-bold text-secondary-900 dark:text-white">{displayValue}</span>
          <span className="text-xs text-secondary-400">/10</span>
        </div>
      </div>
      <div className="flex justify-between px-1">
        {Array.from({ length: 11 }, (_, i) => (
          <span
            key={i}
            className={clsx(
              'text-[8px]',
              i === displayValue ? 'text-primary-600 font-bold' : 'text-secondary-300 dark:text-secondary-600'
            )}
          >
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function RatingScaleSelector({ value, onChange, disabled, scaleType = 'stars', compact = false }: RatingScaleSelectorProps) {
  switch (scaleType) {
    case 'descriptive':
      return <DescriptiveScale value={value} onChange={onChange} disabled={disabled} compact={compact} />;
    case 'numeric':
      return <NumericScale value={value} onChange={onChange} disabled={disabled} />;
    case 'stars':
    default:
      return <StarsScale value={value} onChange={onChange} disabled={disabled} compact={compact} />;
  }
}
