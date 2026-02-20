import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChartBarIcon,
  ChatBubbleLeftEllipsisIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { goalsApi, type ActivityItem } from '@/lib/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(user?: { firstName: string; lastName: string } | null) {
  if (!user) return '?';
  return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
}

const typeConfig: Record<string, { icon: typeof ChartBarIcon; bg: string; iconColor: string }> = {
  progress: { icon: ChartBarIcon, bg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  comment: { icon: ChatBubbleLeftEllipsisIcon, bg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
  status_change: { icon: ArrowPathIcon, bg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
};

// ---------------------------------------------------------------------------
// Activity Item Component
// ---------------------------------------------------------------------------

function ActivityEntry({ item }: { item: ActivityItem }) {
  const config = typeConfig[item.type] || typeConfig.comment;
  const Icon = config.icon;

  return (
    <div className="flex gap-3 py-3">
      {/* Icon */}
      <div className={clsx('h-8 w-8 rounded-full flex items-center justify-center shrink-0', config.bg)}>
        <Icon className={clsx('h-4 w-4', config.iconColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {item.user && (
            <span className="text-xs font-semibold text-secondary-900 dark:text-white">
              {item.user.firstName} {item.user.lastName}
            </span>
          )}
          <span className="text-[10px] text-secondary-400 dark:text-secondary-500 flex items-center gap-0.5">
            <ClockIcon className="h-3 w-3" />
            {relativeTime(item.createdAt)}
          </span>
        </div>

        {item.type === 'progress' && item.meta && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-secondary-500 dark:text-secondary-400">
              Progress: {String(item.meta.previousProgress)}%
            </span>
            <span className="text-xs text-secondary-400">→</span>
            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
              {String(item.meta.newProgress)}%
            </span>
          </div>
        )}

        {item.content && (
          <p className="mt-1 text-xs text-secondary-700 dark:text-secondary-300 whitespace-pre-wrap line-clamp-3">
            {item.content}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface OKRActivityFeedProps {
  goalId: string;
  compact?: boolean;
}

export function OKRActivityFeed({ goalId, compact = false }: OKRActivityFeedProps) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');

  const { data: activityData, isLoading } = useQuery({
    queryKey: ['goal-activity', goalId],
    queryFn: () => goalsApi.getActivity(goalId),
    staleTime: 15_000,
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => goalsApi.addComment(goalId, content),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['goal-activity', goalId] });
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  const activity: ActivityItem[] = activityData || [];
  const displayItems = compact ? activity.slice(0, 5) : activity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    addCommentMutation.mutate(comment.trim());
  };

  return (
    <div>
      <h4 className="text-[10px] font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">
        Activity
      </h4>

      {/* Comment input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-3">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 text-xs rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white px-3 py-1.5 focus:ring-2 focus:ring-primary-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!comment.trim() || addCommentMutation.isPending}
          className="p-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <PaperAirplaneIcon className="h-3.5 w-3.5" />
        </button>
      </form>

      {/* Activity list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-secondary-200 dark:bg-secondary-700 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 bg-secondary-200 dark:bg-secondary-700 rounded" />
                <div className="h-3 w-2/3 bg-secondary-200 dark:bg-secondary-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <p className="text-xs text-secondary-400 italic py-4 text-center">No activity yet</p>
      ) : (
        <div className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
          {displayItems.map((item) => (
            <ActivityEntry key={item.id} item={item} />
          ))}
        </div>
      )}

      {compact && activity.length > 5 && (
        <button className="mt-2 text-[10px] font-medium text-primary-600 dark:text-primary-400 hover:underline">
          View all {activity.length} activities
        </button>
      )}
    </div>
  );
}
