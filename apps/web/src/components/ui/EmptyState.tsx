import clsx from 'clsx';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {icon && (
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-400/20 to-cyan-400/20 blur-xl animate-pulse" />
          <div className="relative rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-primary-800/30 border border-primary-200/50 dark:border-primary-500/10 p-4">
            <div className="h-10 w-10 text-primary-500 dark:text-primary-400">
              {icon}
            </div>
          </div>
        </div>
      )}
      <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-sm text-secondary-500 dark:text-secondary-400 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
