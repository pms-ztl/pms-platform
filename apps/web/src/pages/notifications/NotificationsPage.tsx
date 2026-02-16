import { useState } from 'react';
import { BellIcon, CheckIcon, FunnelIcon } from '@heroicons/react/24/outline';
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
  data?: Record<string, unknown>;
}

const typeIcon: Record<string, string> = {
  FEEDBACK_RECEIVED: '💬',
  REVIEW_ASSIGNED: '📋',
  REVIEW_COMPLETED: '✅',
  REVIEW_REMINDER: '⏰',
  GOAL_PROGRESS: '🎯',
  GOAL_UPDATED: '🎯',
  CALIBRATION_SCHEDULED: '⚖️',
  CALIBRATION_INVITE: '⚖️',
  ONE_ON_ONE_SCHEDULED: '📅',
  PIP_CREATED: '⚠️',
  LICENSE_90_PERCENT: '📊',
  LICENSE_95_PERCENT: '📊',
  LICENSE_LIMIT_REACHED: '🚫',
  SUBSCRIPTION_EXPIRING: '⏳',
  SUBSCRIPTION_EXPIRED: '❌',
  BRUTE_FORCE_DETECTED: '🔒',
  CROSS_TENANT_ACCESS_ALERT: '🛡️',
  SUSPICIOUS_BULK_DEACTIVATION: '⚠️',
  ALERT_SENT: '🔔',
};

const typeLabel: Record<string, string> = {
  FEEDBACK_RECEIVED: 'Feedback',
  REVIEW_ASSIGNED: 'Review',
  REVIEW_COMPLETED: 'Review',
  REVIEW_REMINDER: 'Reminder',
  GOAL_PROGRESS: 'Goal',
  GOAL_UPDATED: 'Goal',
  CALIBRATION_SCHEDULED: 'Calibration',
  CALIBRATION_INVITE: 'Calibration',
  ONE_ON_ONE_SCHEDULED: '1:1 Meeting',
  PIP_CREATED: 'PIP',
  LICENSE_90_PERCENT: 'License',
  LICENSE_95_PERCENT: 'License',
  LICENSE_LIMIT_REACHED: 'License',
  SUBSCRIPTION_EXPIRING: 'Subscription',
  SUBSCRIPTION_EXPIRED: 'Subscription',
  BRUTE_FORCE_DETECTED: 'Security',
  CROSS_TENANT_ACCESS_ALERT: 'Security',
  SUSPICIOUS_BULK_DEACTIVATION: 'Security',
};

type FilterType = 'all' | 'unread' | 'read';

export function NotificationsPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const limit = 20;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-page', page, filter],
    queryFn: () =>
      notificationsApi.list({
        page,
        limit,
        ...(filter === 'unread' ? { status: 'unread' } : filter === 'read' ? { status: 'read' } : {}),
      }),
  });

  const notifications: Notification[] = (data as any)?.data ?? [];
  const meta = (data as any)?.meta ?? { total: 0, page: 1, totalPages: 1 };

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatFullDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Notifications</h1>
          <p className="text-secondary-500 dark:text-secondary-400 text-sm mt-1">
            Stay updated with alerts, reviews, and team activity
          </p>
        </div>
        <button
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors disabled:opacity-50"
        >
          <CheckIcon className="h-4 w-4" />
          Mark all as read
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 bg-secondary-100 dark:bg-secondary-800 rounded-lg w-fit">
        {(['all', 'unread', 'read'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={clsx(
              'px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize',
              filter === f
                ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
                : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm ring-1 ring-secondary-200 dark:ring-secondary-700 divide-y divide-secondary-100 dark:divide-secondary-700">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-secondary-400">
            <BellIcon className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">No notifications</p>
            <p className="text-sm mt-1">
              {filter === 'unread' ? 'All caught up!' : 'Nothing here yet'}
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={clsx(
                'px-6 py-4 hover:bg-secondary-50 dark:hover:bg-secondary-700/30 cursor-pointer transition-colors',
                !notification.readAt && 'bg-primary-50/40 dark:bg-primary-900/10'
              )}
              onClick={() => {
                if (!notification.readAt) markReadMutation.mutate(notification.id);
              }}
            >
              <div className="flex gap-4">
                <span className="text-2xl flex-shrink-0 mt-0.5">
                  {typeIcon[notification.type] || '🔔'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={clsx(
                            'text-sm',
                            notification.readAt
                              ? 'text-secondary-700 dark:text-secondary-300'
                              : 'text-secondary-900 dark:text-white font-semibold'
                          )}
                        >
                          {notification.title}
                        </p>
                        {!notification.readAt && (
                          <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary-500"></span>
                        )}
                      </div>
                      <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
                        {notification.body}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs text-secondary-400 dark:text-secondary-500 whitespace-nowrap">
                        {formatTime(notification.createdAt)}
                      </span>
                      <span className={clsx(
                        'text-[10px] px-2 py-0.5 rounded-full font-medium',
                        notification.type.includes('SECURITY') || notification.type.includes('BRUTE') || notification.type.includes('CROSS_TENANT')
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : notification.type.includes('LICENSE') || notification.type.includes('SUBSCRIPTION')
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400'
                      )}>
                        {typeLabel[notification.type] || notification.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-secondary-400 dark:text-secondary-500 mt-2">
                    {formatFullDate(notification.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-secondary-500 dark:text-secondary-400">
            Showing {(page - 1) * limit + 1}-{Math.min(page * limit, meta.total)} of {meta.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= meta.totalPages}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
