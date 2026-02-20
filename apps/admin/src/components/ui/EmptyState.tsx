import clsx from 'clsx';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {icon && (
        <div className="mb-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] p-4">
          <div className="h-10 w-10 text-white/40">{icon}</div>
        </div>
      )}
      <h3 className="text-lg font-semibold text-white/80">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-white/40 max-w-sm">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 btn btn-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
