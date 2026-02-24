import { useQuery } from '@tanstack/react-query';
import { HandThumbUpIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';

import { feedbackApi, type Feedback } from '@/lib/api';
import { SkeletonCard, Badge } from '@/components/ui';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(first?: string, last?: string): string {
  return `${(first ?? '?')[0]}${(last ?? '?')[0]}`.toUpperCase();
}

const INITIALS_COLORS = [
  'bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-cyan-500',
];

function RecognitionFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ['recognition-feed'],
    queryFn: () => feedbackApi.listReceived({ type: 'PRAISE', limit: 5 }),
    staleTime: 60_000,
  });

  if (isLoading) return <SkeletonCard />;

  const items: Feedback[] = data?.data ?? [];

  if (!items.length) {
    return (
      <div className="glass-deep rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <HandThumbUpIcon className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Recognition</h3>
        </div>
        <div className="flex flex-col items-center py-4">
          <StarIcon className="w-10 h-10 text-secondary-200 dark:text-secondary-700 mb-2" />
          <p className="text-sm text-secondary-500 dark:text-secondary-400">No recognition yet.</p>
          <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">Kudos from colleagues will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-deep rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HandThumbUpIcon className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Recognition</h3>
        </div>
        <Link
          to="/recognition"
          className="text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline"
        >
          View All
        </Link>
      </div>

      <div className="space-y-3">
        {items.slice(0, 4).map((item, i) => {
          const sender = item.isAnonymous ? null : item.fromUser;
          const colorClass = INITIALS_COLORS[i % INITIALS_COLORS.length];
          return (
            <div key={item.id} className="flex gap-3">
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center shrink-0`}>
                <span className="text-[10px] font-bold text-white">
                  {sender ? getInitials(sender.firstName, sender.lastName) : '?'}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-secondary-800 dark:text-secondary-200">
                    {sender ? `${sender.firstName} ${sender.lastName}` : 'Anonymous'}
                  </span>
                  <span className="text-[10px] text-secondary-400">{timeAgo(item.createdAt)}</span>
                </div>
                <p className="text-xs text-secondary-600 dark:text-secondary-400 mt-0.5">
                  {item.content}
                </p>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {item.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="primary" size="sm">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RecognitionFeed;
