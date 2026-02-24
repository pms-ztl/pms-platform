import { useState } from 'react';
import clsx from 'clsx';

// ── Types ────────────────────────────────────────────────────────────────────

interface DescriptiveRatingProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

// ── Level definitions ────────────────────────────────────────────────────────

const levels = [
  {
    value: 1,
    label: 'Needs Improvement',
    shortLabel: 'NI',
    gradient: 'from-red-500 to-red-600',
    bg: 'bg-red-500',
    lightBg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    ring: 'ring-red-500/30',
    description: 'Performance falls significantly below expectations in this competency.',
  },
  {
    value: 2,
    label: 'Developing',
    shortLabel: 'DEV',
    gradient: 'from-orange-500 to-amber-500',
    bg: 'bg-orange-500',
    lightBg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-700 dark:text-orange-300',
    ring: 'ring-orange-500/30',
    description: 'Beginning to demonstrate this competency but not yet consistent.',
  },
  {
    value: 3,
    label: 'Meets Expectations',
    shortLabel: 'ME',
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-500',
    lightBg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    ring: 'ring-blue-500/30',
    description: 'Consistently demonstrates this competency at the expected level.',
  },
  {
    value: 4,
    label: 'Exceeds',
    shortLabel: 'EX',
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-500',
    lightBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    ring: 'ring-emerald-500/30',
    description: 'Goes above and beyond in this area. Leads by example.',
  },
  {
    value: 5,
    label: 'Exceptional',
    shortLabel: 'EXC',
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-500',
    lightBg: 'bg-violet-50 dark:bg-violet-900/20',
    text: 'text-violet-700 dark:text-violet-300',
    ring: 'ring-violet-500/30',
    description: 'World-class performance. Sets the standard for the organization.',
  },
];

// ── Main component ───────────────────────────────────────────────────────────

export function DescriptiveRating({ value, onChange, disabled = false }: DescriptiveRatingProps) {
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);
  const activeLevel = levels.find((l) => l.value === value);
  const hoverLevel = hoveredLevel !== null ? levels.find((l) => l.value === hoveredLevel) : null;
  const displayLevel = hoverLevel || activeLevel;

  return (
    <div className="space-y-3">
      {/* Pill selector */}
      <div className="flex gap-1.5">
        {levels.map((level) => {
          const isSelected = value === level.value;
          return (
            <button
              key={level.value}
              type="button"
              onClick={() => !disabled && onChange(level.value)}
              onMouseEnter={() => !disabled && setHoveredLevel(level.value)}
              onMouseLeave={() => setHoveredLevel(null)}
              disabled={disabled}
              className={clsx(
                'relative flex-1 py-2 rounded-lg text-center transition-all duration-200',
                disabled ? 'cursor-default' : 'cursor-pointer',
                isSelected
                  ? `${level.lightBg} ${level.text} ring-2 ${level.ring} font-semibold shadow-sm`
                  : 'bg-secondary-50 dark:bg-secondary-800 text-secondary-500 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700'
              )}
            >
              {/* Gradient top bar */}
              <div className={clsx(
                'absolute top-0 left-1 right-1 h-0.5 rounded-full bg-gradient-to-r transition-opacity',
                level.gradient,
                isSelected ? 'opacity-100' : 'opacity-0'
              )} />

              <span className="text-2xs block">{level.shortLabel}</span>
              <span className="text-3xs block mt-0.5 opacity-70">{level.label}</span>
            </button>
          );
        })}
      </div>

      {/* Description tooltip */}
      {displayLevel && (
        <div className={clsx(
          'px-3 py-2 rounded-lg text-xs transition-all',
          displayLevel.lightBg,
          displayLevel.text,
        )}>
          <span className="font-semibold">{displayLevel.label}:</span>{' '}
          <span className="opacity-80">{displayLevel.description}</span>
        </div>
      )}
    </div>
  );
}
