import { useState, useRef, useEffect } from 'react';
import { BellIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import clsx from 'clsx';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  readAt: string | null;
  createdAt: string;
  data?: any;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list({ limit: 20 }),
    // Real-time updates via Socket.io invalidate this query automatically
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = Array.isArray(notifications)
    ? notifications.filter((n: Notification) => !n.readAt).length
    : 0;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const typeIcon: Record<string, string> = {
    FEEDBACK_RECEIVED: '💬',
    REVIEW_ASSIGNED: '📋',
    REVIEW_COMPLETED: '✅',
    REVIEW_REMINDER: '⏰',
    GOAL_PROGRESS: '🎯',
    CALIBRATION_SCHEDULED: '⚖️',
    ONE_ON_ONE_SCHEDULED: '📅',
    PIP_CREATED: '⚠️',
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-white hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-secondary-800">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[480px] overflow-hidden rounded-xl bg-white dark:bg-secondary-800 shadow-lg ring-1 ring-secondary-200 dark:ring-secondary-700 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-200 dark:border-secondary-700">
            <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium flex items-center gap-1"
              >
                <CheckIcon className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-[380px] divide-y divide-secondary-100 dark:divide-secondary-700">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            ) : !Array.isArray(notifications) || notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-secondary-400">
                <BellIcon className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={clsx(
                    'px-4 py-3 hover:bg-secondary-50 dark:hover:bg-secondary-700/50 cursor-pointer transition-colors',
                    !notification.readAt && 'bg-primary-50/50 dark:bg-primary-900/10'
                  )}
                  onClick={() => {
                    if (!notification.readAt) markReadMutation.mutate(notification.id);
                  }}
                >
                  <div className="flex gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {typeIcon[notification.type] || '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={clsx(
                          'text-sm line-clamp-1',
                          notification.readAt
                            ? 'text-secondary-700 dark:text-secondary-300'
                            : 'text-secondary-900 dark:text-white font-medium'
                        )}>
                          {notification.title}
                        </p>
                        {!notification.readAt && (
                          <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary-500 mt-1.5"></span>
                        )}
                      </div>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400 line-clamp-2 mt-0.5">
                        {notification.body}
                      </p>
                      <p className="text-[10px] text-secondary-400 dark:text-secondary-500 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800/50">
            <a
              href="/settings"
              className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
            >
              Notification Settings →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
