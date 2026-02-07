import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import clsx from 'clsx';
import type { Intent } from '../types';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface ToastData {
  id: string;
  intent: Intent;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  const toast = useCallback(
    (options: { intent?: Intent; title: string; description?: string; duration?: number }) => {
      context.addToast({
        intent: options.intent || 'info',
        title: options.title,
        description: options.description,
        duration: options.duration || 5000,
      });
    },
    [context]
  );

  return {
    toast,
    success: (title: string, description?: string) =>
      toast({ intent: 'success', title, description }),
    error: (title: string, description?: string) =>
      toast({ intent: 'danger', title, description }),
    warning: (title: string, description?: string) =>
      toast({ intent: 'warning', title, description }),
    info: (title: string, description?: string) =>
      toast({ intent: 'info', title, description }),
  };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);

    if (toast.duration !== Infinity) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, toast.duration || 5000);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastProps {
  intent: Intent;
  title: string;
  description?: string;
  onClose: () => void;
}

const intentStyles: Record<Intent, { bg: string; icon: string }> = {
  info: { bg: 'bg-blue-50 border-blue-200', icon: 'text-blue-500' },
  success: { bg: 'bg-success-50 border-success-200', icon: 'text-success-500' },
  warning: { bg: 'bg-warning-50 border-warning-200', icon: 'text-warning-500' },
  danger: { bg: 'bg-danger-50 border-danger-200', icon: 'text-danger-500' },
};

const icons: Record<Intent, React.ComponentType<{ className?: string }>> = {
  info: InformationCircleIcon,
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  danger: XCircleIcon,
};

export function Toast({ intent, title, description, onClose }: ToastProps) {
  const styles = intentStyles[intent];
  const IconComponent = icons[intent];

  return (
    <div
      className={clsx(
        'flex items-start p-4 rounded-lg border shadow-lg max-w-sm w-full',
        styles.bg
      )}
    >
      <IconComponent className={clsx('h-5 w-5 mt-0.5', styles.icon)} />
      <div className="ml-3 flex-1">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="ml-4 text-gray-400 hover:text-gray-500"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          intent={toast.intent}
          title={toast.title}
          description={toast.description}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}

Toast.displayName = 'Toast';
