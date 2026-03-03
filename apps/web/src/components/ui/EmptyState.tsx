import type { ReactNode } from 'react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// EmptyState — Compact empty state with strict height rules
// ---------------------------------------------------------------------------
// HARD RULES:
//   • NEVER uses min-h-screen, h-screen, or viewport-based heights
//   • Default size is compact — fits content, no giant blank regions
//   • "sm" variant even tighter for inline / card-level usage
//   • "full" variant for truly empty pages, but still capped
//   • data-testid for automated layout audit
// ---------------------------------------------------------------------------

type EmptyStateSize = 'sm' | 'md' | 'full';

const sizePadding: Record<EmptyStateSize, string> = {
  sm: 'py-4 px-3',
  md: 'py-6 px-4',
  full: 'py-10 px-4',
};

const sizeTitle: Record<EmptyStateSize, string> = {
  sm: 'text-sm font-semibold',
  md: 'text-lg font-semibold',
  full: 'text-xl font-bold',
};

const sizeDesc: Record<EmptyStateSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  full: 'text-sm',
};

const sizeIcon: Record<EmptyStateSize, string> = {
  sm: 'h-7 w-7',
  md: 'h-10 w-10',
  full: 'h-12 w-12',
};

const sizeIconPad: Record<EmptyStateSize, string> = {
  sm: 'p-2.5',
  md: 'p-4',
  full: 'p-5',
};

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Single action or array of actions */
  action?: EmptyStateAction;
  actions?: EmptyStateAction[];
  /** Size variant (default "md") */
  size?: EmptyStateSize;
  /** Additional content below description (steps, guidance, etc.) */
  children?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  actions,
  size = 'md',
  children,
  className,
}: EmptyStateProps) {
  const allActions = actions ?? (action ? [action] : []);

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        sizePadding[size],
        className,
      )}
      data-testid="ui-empty-state"
    >
      {icon && (
        <div className={clsx('relative', size === 'sm' ? 'mb-2' : 'mb-4')}>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-400/20 to-cyan-400/20 blur-xl animate-pulse" />
          <div
            className={clsx(
              'relative rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-primary-800/30 border border-primary-200/50 dark:border-primary-500/10',
              sizeIconPad[size],
            )}
          >
            <div className={clsx(sizeIcon[size], 'text-primary-500 dark:text-primary-400')}>
              {icon}
            </div>
          </div>
        </div>
      )}
      <h3
        className={clsx(
          sizeTitle[size],
          'text-secondary-900 dark:text-white',
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={clsx(
            'mt-1.5 text-secondary-500 dark:text-secondary-400 max-w-sm',
            sizeDesc[size],
          )}
        >
          {description}
        </p>
      )}
      {children && <div className="mt-3 w-full max-w-md">{children}</div>}
      {allActions.length > 0 && (
        <div className={clsx('flex items-center gap-2 flex-wrap', size === 'sm' ? 'mt-2' : 'mt-4')}>
          {allActions.map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              className={clsx(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                a.variant === 'secondary'
                  ? 'bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-200 dark:hover:bg-secondary-600'
                  : 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98]',
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
