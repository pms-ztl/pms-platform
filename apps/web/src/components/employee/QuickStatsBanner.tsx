import {
  CalendarDaysIcon,
  FlagIcon,
  StarIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { User } from '@/lib/api';

interface QuickStatsBannerProps {
  employee: User;
  goalStats: { total: number; completed: number };
  feedbackCount: number;
  avgRating: number | null;
  activePlans: number;
  className?: string;
}

function computeTenure(hireDate?: string | null): string {
  if (!hireDate) return 'N/A';
  const hire = new Date(hireDate);
  const now = new Date();
  const diffMs = now.getTime() - hire.getTime();
  const years = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
  const months = Math.floor((diffMs % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
  if (years > 0) return `${years}y ${months}m`;
  if (months > 0) return `${months}m`;
  return '<1m';
}

const stats = [
  { key: 'tenure', label: 'Tenure', icon: CalendarDaysIcon, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  { key: 'goals', label: 'Goals Done', icon: FlagIcon, color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
  { key: 'rating', label: 'Avg Rating', icon: StarIcon, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
  { key: 'feedback', label: 'Feedback', icon: ChatBubbleLeftRightIcon, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
  { key: 'plans', label: 'Dev Plans', icon: AcademicCapIcon, color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' },
] as const;

export function QuickStatsBanner({
  employee,
  goalStats,
  feedbackCount,
  avgRating,
  activePlans,
  className,
}: QuickStatsBannerProps) {
  const values: Record<string, string> = {
    tenure: computeTenure((employee as any).hireDate),
    goals: `${goalStats.completed}/${goalStats.total}`,
    rating: avgRating != null ? avgRating.toFixed(1) : 'N/A',
    feedback: String(feedbackCount),
    plans: String(activePlans),
  };

  return (
    <div className={clsx('bg-secondary-50 dark:bg-secondary-900/50 rounded-xl p-4', className)}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex items-center gap-2.5">
              <div className={clsx('p-1.5 rounded-lg shrink-0', s.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-secondary-900 dark:text-white leading-none">
                  {values[s.key]}
                </p>
                <p className="text-[10px] text-secondary-500 dark:text-secondary-400 mt-0.5">
                  {s.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
