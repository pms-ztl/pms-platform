import { useMemo } from 'react';
import { isToday, isYesterday, differenceInDays, format } from 'date-fns';
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

interface NotificationGroupProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  compact?: boolean;
  className?: string;
}

const typeIcon: Record<string, string> = {
  FEEDBACK_RECEIVED: '💬',
  REVIEW_ASSIGNED: '📋',
  REVIEW_COMPLETED: '✅',
  REVIEW_REMINDER: '⏰',
  GOAL_PROGRESS: '🎯',
  GOAL_UPDATED: '🎯',
  GOAL_CREATED: '🎯',
  GOAL_COMPLETED: '🎯',
  CALIBRATION_SCHEDULED: '⚖️',
  CALIBRATION_INVITE: '⚖️',
  ONE_ON_ONE_SCHEDULED: '📅',
  ONE_ON_ONE_REMINDER: '📅',
  PIP_CREATED: '⚠️',
  LICENSE_90_PERCENT: '📊',
  LICENSE_95_PERCENT: '📊',
  LICENSE_LIMIT_REACHED: '📊',
  SUBSCRIPTION_EXPIRING: '⏳',
  SUBSCRIPTION_EXPIRED: '❌',
  BRUTE_FORCE_DETECTED: '🔒',
  CROSS_TENANT_ACCESS_ALERT: '🛡️',
  SUSPICIOUS_BULK_DEACTIVATION: '⚠️',
  ALERT_SENT: '🔔',
  SYSTEM: '🔔',
};

function formatTime(dateStr: string) {
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
  return format(date, 'MMM d, yyyy');
}

function groupByDate(notifications: Notification[]) {
  const groups: { label: string; items: Notification[] }[] = [];
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const thisWeek: Notification[] = [];
  const earlier: Notification[] = [];

  notifications.forEach((n) => {
    const date = new Date(n.createdAt);
    if (isToday(date)) today.push(n);
    else if (isYesterday(date)) yesterday.push(n);
    else if (differenceInDays(new Date(), date) < 7) thisWeek.push(n);
    else earlier.push(n);
  });

  if (today.length > 0) groups.push({ label: 'Today', items: today });
  if (yesterday.length > 0) groups.push({ label: 'Yesterday', items: yesterday });
  if (thisWeek.length > 0) groups.push({ label: 'This Week', items: thisWeek });
  if (earlier.length > 0) groups.push({ label: 'Earlier', items: earlier });

  return groups;
}

export function NotificationGroup({ notifications, onMarkRead, compact = false, className }: NotificationGroupProps) {
  const groups = useMemo(() => groupByDate(notifications), [notifications]);

  if (!notifications || notifications.length === 0) {
    return (
      <div className={clsx('flex flex-col items-center justify-center py-8 text-secondary-400', className)}>
        <span className="text-3xl mb-2">🔔</span>
        <p className="text-sm">No notifications yet</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {groups.map((group) => (
        <div key={group.label}>
          {/* Group header */}
          <div className="px-4 py-2 bg-secondary-50 dark:bg-secondary-900/50 sticky top-0 z-10">
            <p className="text-[10px] font-semibold text-secondary-400 dark:text-secondary-500 uppercase tracking-wider">
              {group.label}
            </p>
          </div>

          {/* Items */}
          <div className="divide-y divide-secondary-100 dark:divide-secondary-700">
            {group.items.map((notification) => (
              <div
                key={notification.id}
                className={clsx(
                  'cursor-pointer transition-colors',
                  compact ? 'px-4 py-2.5' : 'px-4 py-3',
                  'hover:bg-secondary-50 dark:hover:bg-secondary-700/50',
                  !notification.readAt && 'bg-primary-50/50 dark:bg-primary-900/10'
                )}
                onClick={() => {
                  if (!notification.readAt) onMarkRead(notification.id);
                }}
              >
                <div className="flex gap-3">
                  <span className={clsx('flex-shrink-0', compact ? 'text-base mt-0.5' : 'text-lg mt-0.5')}>
                    {typeIcon[notification.type] || '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={clsx(
                        compact ? 'text-xs' : 'text-sm',
                        compact ? 'line-clamp-1' : 'line-clamp-2',
                        notification.readAt
                          ? 'text-secondary-700 dark:text-secondary-300'
                          : 'text-secondary-900 dark:text-white font-medium'
                      )}>
                        {notification.title}
                      </p>
                      {!notification.readAt && (
                        <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary-500 mt-1.5" />
                      )}
                    </div>
                    {!compact && (
                      <p className="text-xs text-secondary-500 dark:text-secondary-400 line-clamp-2 mt-0.5">
                        {notification.body}
                      </p>
                    )}
                    <p className={clsx('text-secondary-400 dark:text-secondary-500 mt-0.5', compact ? 'text-[9px]' : 'text-[10px]')}>
                      {compact ? formatTime(notification.createdAt) : format(new Date(notification.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
