import { useMemo } from 'react';
import { isToday, isYesterday, differenceInDays, format } from 'date-fns';
import clsx from 'clsx';
import {
  ChatBubbleLeftIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  FlagIcon,
  ScaleIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ClockIcon as SubscriptionClockIcon,
  XCircleIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

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

type IconComponent = React.FC<React.SVGProps<SVGSVGElement>>;

const typeIconMap: Record<string, { Icon: IconComponent; color: string }> = {
  FEEDBACK_RECEIVED:           { Icon: ChatBubbleLeftIcon,        color: 'text-indigo-500' },
  REVIEW_ASSIGNED:             { Icon: ClipboardDocumentListIcon,  color: 'text-blue-500' },
  REVIEW_COMPLETED:            { Icon: CheckCircleIcon,            color: 'text-emerald-500' },
  REVIEW_REMINDER:             { Icon: ClockIcon,                  color: 'text-amber-500' },
  GOAL_PROGRESS:               { Icon: FlagIcon,                   color: 'text-violet-500' },
  GOAL_UPDATED:                { Icon: FlagIcon,                   color: 'text-violet-500' },
  GOAL_CREATED:                { Icon: FlagIcon,                   color: 'text-violet-500' },
  GOAL_COMPLETED:              { Icon: CheckCircleIcon,            color: 'text-emerald-500' },
  CALIBRATION_SCHEDULED:       { Icon: ScaleIcon,                  color: 'text-blue-500' },
  CALIBRATION_INVITE:          { Icon: ScaleIcon,                  color: 'text-blue-500' },
  ONE_ON_ONE_SCHEDULED:        { Icon: CalendarDaysIcon,           color: 'text-cyan-500' },
  ONE_ON_ONE_REMINDER:         { Icon: CalendarDaysIcon,           color: 'text-cyan-500' },
  PIP_CREATED:                 { Icon: ExclamationTriangleIcon,    color: 'text-amber-600' },
  LICENSE_90_PERCENT:          { Icon: ChartBarIcon,               color: 'text-amber-500' },
  LICENSE_95_PERCENT:          { Icon: ChartBarIcon,               color: 'text-orange-500' },
  LICENSE_LIMIT_REACHED:       { Icon: ChartBarIcon,               color: 'text-red-500' },
  SUBSCRIPTION_EXPIRING:       { Icon: SubscriptionClockIcon,      color: 'text-amber-500' },
  SUBSCRIPTION_EXPIRED:        { Icon: XCircleIcon,                color: 'text-red-500' },
  BRUTE_FORCE_DETECTED:        { Icon: LockClosedIcon,             color: 'text-red-600' },
  CROSS_TENANT_ACCESS_ALERT:   { Icon: ShieldCheckIcon,            color: 'text-red-500' },
  SUSPICIOUS_BULK_DEACTIVATION:{ Icon: ExclamationTriangleIcon,    color: 'text-red-600' },
  ALERT_SENT:                  { Icon: BellIcon,                   color: 'text-secondary-500' },
  SYSTEM:                      { Icon: BellIcon,                   color: 'text-secondary-500' },
};

const DefaultIcon = BellIcon;
const defaultColor = 'text-secondary-400';

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
        <BellIcon className="h-10 w-10 mb-2 opacity-40" />
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
            <p className="text-2xs font-semibold text-secondary-400 dark:text-secondary-500 tracking-wider">
              {group.label}
            </p>
          </div>

          {/* Items */}
          <div className="divide-y divide-secondary-100 dark:divide-secondary-700">
            {group.items.map((notification) => {
              const { Icon, color } = typeIconMap[notification.type] ?? { Icon: DefaultIcon, color: defaultColor };
              return (
                <div
                  key={notification.id}
                  className={clsx(
                    'cursor-pointer transition-colors',
                    compact ? 'px-4 py-2.5' : 'px-4 py-3',
                    'hover:bg-primary-50/30 dark:hover:bg-white/[0.03]/50',
                    !notification.readAt && 'bg-primary-50/50 dark:bg-primary-900/10'
                  )}
                  onClick={() => {
                    if (!notification.readAt) onMarkRead(notification.id);
                  }}
                >
                  <div className="flex gap-3">
                    <Icon className={clsx(
                      'flex-shrink-0',
                      compact ? 'h-4 w-4 mt-0.5' : 'h-5 w-5 mt-0.5',
                      color,
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={clsx(
                          compact ? 'text-xs' : 'text-sm',
                          '',
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
                        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
                          {notification.body}
                        </p>
                      )}
                      <p className={clsx('text-secondary-400 dark:text-secondary-500 mt-0.5', compact ? 'text-3xs' : 'text-2xs')}>
                        {compact ? formatTime(notification.createdAt) : format(new Date(notification.createdAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
