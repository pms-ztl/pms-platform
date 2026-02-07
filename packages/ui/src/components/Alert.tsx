import clsx from 'clsx';
import type { BaseProps, Intent } from '../types';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export interface AlertProps extends BaseProps {
  intent?: Intent;
  title?: string;
  onClose?: () => void;
  icon?: React.ReactNode;
}

const intentStyles: Record<Intent, { bg: string; border: string; icon: string; title: string }> = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-500',
    title: 'text-blue-800',
  },
  success: {
    bg: 'bg-success-50',
    border: 'border-success-200',
    icon: 'text-success-500',
    title: 'text-success-800',
  },
  warning: {
    bg: 'bg-warning-50',
    border: 'border-warning-200',
    icon: 'text-warning-500',
    title: 'text-warning-800',
  },
  danger: {
    bg: 'bg-danger-50',
    border: 'border-danger-200',
    icon: 'text-danger-500',
    title: 'text-danger-800',
  },
};

const defaultIcons: Record<Intent, React.ComponentType<{ className?: string }>> = {
  info: InformationCircleIcon,
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  danger: XCircleIcon,
};

export function Alert({
  intent = 'info',
  title,
  onClose,
  icon,
  className,
  children,
}: AlertProps) {
  const styles = intentStyles[intent];
  const IconComponent = defaultIcons[intent];

  return (
    <div
      role="alert"
      className={clsx(
        'rounded-lg border p-4',
        styles.bg,
        styles.border,
        className
      )}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          {icon || <IconComponent className={clsx('h-5 w-5', styles.icon)} />}
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={clsx('text-sm font-medium', styles.title)}>{title}</h3>
          )}
          {children && (
            <div className={clsx('text-sm', title && 'mt-1', styles.title, 'opacity-90')}>
              {children}
            </div>
          )}
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              onClick={onClose}
              className={clsx(
                'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                styles.icon,
                'hover:bg-black/5'
              )}
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

Alert.displayName = 'Alert';
