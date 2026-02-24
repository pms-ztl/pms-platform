import { useState, useMemo } from 'react';
import {
  FlagIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { format } from 'date-fns';

import type { Goal, Feedback, DevelopmentPlan } from '@/lib/api';

interface ActivityStreamProps {
  userId: string;
  goals: Goal[];
  feedbackItems: Feedback[];
  reviews: any[];
  devPlans: DevelopmentPlan[];
  className?: string;
}

interface ActivityItem {
  id: string;
  type: 'goal' | 'feedback' | 'review' | 'development';
  title: string;
  description: string;
  date: Date;
}

const typeConfig = {
  goal: {
    icon: FlagIcon,
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    dotColor: 'bg-blue-500',
    label: 'Goal',
  },
  feedback: {
    icon: ChatBubbleLeftRightIcon,
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    dotColor: 'bg-green-500',
    label: 'Feedback',
  },
  review: {
    icon: ClipboardDocumentCheckIcon,
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    dotColor: 'bg-purple-500',
    label: 'Review',
  },
  development: {
    icon: AcademicCapIcon,
    color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    dotColor: 'bg-amber-500',
    label: 'Development',
  },
};

export function ActivityStream({
  goals,
  feedbackItems,
  reviews,
  devPlans,
  className,
}: ActivityStreamProps) {
  const [showCount, setShowCount] = useState(20);

  const activities = useMemo(() => {
    const items: ActivityItem[] = [];

    goals.forEach((g) => {
      items.push({
        id: `goal-${g.id}`,
        type: 'goal',
        title: g.title,
        description: `${g.status.replace(/_/g, ' ')} — ${Math.round(g.progress)}% progress`,
        date: new Date(g.dueDate || g.startDate || Date.now()),
      });
    });

    feedbackItems.forEach((fb: any) => {
      items.push({
        id: `fb-${fb.id}`,
        type: 'feedback',
        title: `${fb.type} feedback${fb.isAnonymous ? ' (anonymous)' : fb.fromUser ? ` from ${fb.fromUser.firstName}` : ''}`,
        description: fb.content?.slice(0, 100) || '',
        date: new Date(fb.createdAt),
      });
    });

    (Array.isArray(reviews) ? reviews : []).forEach((r: any) => {
      items.push({
        id: `rev-${r.id}`,
        type: 'review',
        title: r.cycleName || 'Performance Review',
        description: `Status: ${r.status?.replace(/_/g, ' ') || 'N/A'}${r.overallRating ? ` — Rating: ${r.overallRating}/5` : ''}`,
        date: new Date(r.createdAt || r.updatedAt || Date.now()),
      });
    });

    devPlans.forEach((dp) => {
      items.push({
        id: `dev-${dp.id}`,
        type: 'development',
        title: dp.planName,
        description: `${dp.status.replace(/_/g, ' ')} — ${dp.overallProgress}% complete`,
        date: new Date(dp.createdAt || Date.now()),
      });
    });

    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [goals, feedbackItems, reviews, devPlans]);

  const visible = activities.slice(0, showCount);

  if (activities.length === 0) {
    return (
      <div className={clsx('text-center py-16', className)}>
        <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
        <h3 className="mt-3 text-sm font-medium text-secondary-900 dark:text-white">No recent activity</h3>
        <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
          Goals, feedback, reviews, and development activities will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-0', className)}>
      {visible.map((item, idx) => {
        const cfg = typeConfig[item.type];
        const Icon = cfg.icon;
        const isLast = idx === visible.length - 1;

        return (
          <div key={item.id} className="flex gap-4">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div className={clsx('h-3 w-3 rounded-full mt-1.5 shrink-0', cfg.dotColor)} />
              {!isLast && <div className="w-px flex-1 bg-secondary-200 dark:bg-secondary-700" />}
            </div>

            {/* Content */}
            <div className="pb-6 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold', cfg.color)}>
                  <Icon className="h-3 w-3" />
                  {cfg.label}
                </span>
                <span className="text-2xs text-secondary-400 dark:text-secondary-500">
                  {format(item.date, 'MMM d, yyyy')}
                </span>
              </div>
              <p className="text-sm font-medium text-secondary-900 dark:text-white mt-1 break-words">
                {item.title}
              </p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
                {item.description}
              </p>
            </div>
          </div>
        );
      })}

      {activities.length > showCount && (
        <div className="text-center pt-2">
          <button
            onClick={() => setShowCount((c) => c + 20)}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
          >
            Show more ({activities.length - showCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
