import clsx from 'clsx';
import type { Size, ColorScheme } from '../types';

export interface ProgressProps {
  value: number;
  max?: number;
  size?: Size;
  colorScheme?: ColorScheme;
  showValue?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeStyles: Record<Size, string> = {
  xs: 'h-1',
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
  xl: 'h-5',
};

const colorStyles: Record<ColorScheme, string> = {
  primary: 'bg-primary-600',
  secondary: 'bg-secondary-600',
  success: 'bg-success-600',
  warning: 'bg-warning-600',
  danger: 'bg-danger-600',
  gray: 'bg-gray-600',
};

export function Progress({
  value,
  max = 100,
  size = 'md',
  colorScheme = 'primary',
  showValue = false,
  animated = false,
  className,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={clsx('w-full', className)}>
      {showValue && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        className={clsx(
          'w-full bg-gray-200 rounded-full overflow-hidden',
          sizeStyles[size]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-300',
            colorStyles[colorScheme],
            animated && 'animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

Progress.displayName = 'Progress';
