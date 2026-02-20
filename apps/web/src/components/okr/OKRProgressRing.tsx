import clsx from 'clsx';

interface OKRProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

export function OKRProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
  label,
  className,
}: OKRProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, progress));
  const offset = circumference - (clamped / 100) * circumference;

  const color =
    clamped >= 70
      ? 'stroke-green-500'
      : clamped >= 40
        ? 'stroke-amber-500'
        : 'stroke-red-500';

  const textColor =
    clamped >= 70
      ? 'text-green-600 dark:text-green-400'
      : clamped >= 40
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-secondary-200 dark:stroke-secondary-700"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={clsx(color, 'transition-[stroke-dashoffset] duration-500 ease-in-out')}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={clsx('font-bold', textColor, size >= 80 ? 'text-lg' : 'text-xs')}>
          {Math.round(clamped)}%
        </span>
        {label && size >= 80 && (
          <span className="text-[10px] text-secondary-500 dark:text-secondary-400 mt-0.5">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
