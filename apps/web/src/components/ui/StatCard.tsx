import clsx from 'clsx';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: 'default' | 'gradient' | 'glass';
  className?: string;
}

export function StatCard({ label, value, icon, trend, variant = 'default', className }: StatCardProps) {
  const isPositive = trend && trend.value >= 0;

  const variantClasses = {
    default:
      'bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl border border-secondary-200/60 dark:border-white/[0.06]',
    gradient:
      'bg-gradient-to-br from-primary-600 to-primary-800 text-white border-0',
    glass:
      'bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10',
  };

  return (
    <div
      className={clsx(
        'group relative rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden',
        variantClasses[variant],
        className
      )}
    >
      {/* Gradient top-edge on hover */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary-500/60 to-cyan-400/40 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p
            className={clsx(
              'text-sm font-medium',
              variant === 'gradient'
                ? 'text-white/80'
                : 'text-secondary-500 dark:text-secondary-400'
            )}
          >
            {label}
          </p>
          <p
            className={clsx(
              'mt-1.5 text-2xl font-bold tracking-tight',
              variant === 'gradient' ? 'text-white' : 'text-secondary-900 dark:text-white'
            )}
          >
            {value}
          </p>
          {trend && (
            <div className="mt-2 flex items-center gap-1.5">
              {isPositive ? (
                <ArrowTrendingUpIcon className={clsx('h-4 w-4', variant === 'gradient' ? 'text-green-300' : 'text-green-500')} />
              ) : (
                <ArrowTrendingDownIcon className={clsx('h-4 w-4', variant === 'gradient' ? 'text-red-300' : 'text-red-500')} />
              )}
              <span
                className={clsx(
                  'text-xs font-medium',
                  variant === 'gradient'
                    ? isPositive ? 'text-green-300' : 'text-red-300'
                    : isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                )}
              >
                {isPositive ? '+' : ''}{trend.value}%
              </span>
              {trend.label && (
                <span
                  className={clsx(
                    'text-xs',
                    variant === 'gradient' ? 'text-white/60' : 'text-secondary-400'
                  )}
                >
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div
            className={clsx(
              'flex-shrink-0 rounded-xl p-2.5',
              variant === 'gradient'
                ? 'bg-white/20'
                : 'bg-primary-50 dark:bg-primary-900/30'
            )}
          >
            <div
              className={clsx(
                'h-6 w-6',
                variant === 'gradient' ? 'text-white' : 'text-primary-600 dark:text-primary-400'
              )}
            >
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
