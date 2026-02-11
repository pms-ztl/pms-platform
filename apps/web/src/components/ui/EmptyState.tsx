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
        <div className="mb-4 rounded-2xl bg-secondary-100 dark:bg-secondary-700/50 p-4">
          <div className="h-10 w-10 text-secondary-400 dark:text-secondary-500">
            {icon}
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
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
