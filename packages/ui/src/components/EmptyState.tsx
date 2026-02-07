import { type ReactNode } from 'react';
import clsx from 'clsx';
import { InboxIcon } from '@heroicons/react/24/outline';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={clsx('text-center py-12 px-4', className)}>
      <div className="flex justify-center mb-4">
        {icon || (
          <div className="p-4 bg-gray-100 rounded-full">
            <InboxIcon className="h-12 w-12 text-gray-400" />
          </div>
        )}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 max-w-sm mx-auto mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

EmptyState.displayName = 'EmptyState';
