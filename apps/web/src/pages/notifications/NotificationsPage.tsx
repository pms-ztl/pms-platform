import { useState } from 'react';
import { BellIcon, CheckIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { NotificationGroup, NotificationPreferences } from '@/components/notifications';
import clsx from 'clsx';
import { usePageTitle } from '@/hooks/usePageTitle';

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

type FilterType = 'all' | 'unread' | 'read';

export function NotificationsPage() {
  usePageTitle('Notifications');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showPrefs, setShowPrefs] = useState(false);
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPrefs(!showPrefs)}
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              showPrefs
                ? 'text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/30'
                : 'text-secondary-600 dark:text-secondary-400 bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700'
            )}
          >
            <Cog6ToothIcon className="h-4 w-4" />
            Preferences
          </button>
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors disabled:opacity-50"
          >
            <CheckIcon className="h-4 w-4" />
            Mark all as read
          </button>
        </div>
      </div>

      {/* Preferences Panel (collapsible) */}
      {showPrefs && (
        <NotificationPreferences className="mb-6" />
      )}

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

      {/* Grouped Notification List */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm ring-1 ring-secondary-200 dark:ring-secondary-700 overflow-hidden">
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
          <NotificationGroup
            notifications={notifications}
            onMarkRead={(id) => markReadMutation.mutate(id)}
          />
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
