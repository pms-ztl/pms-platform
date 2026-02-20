import { StarIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

// Risk badge helper
export function riskBadge(level: string) {
  const map: Record<string, { color: string; bg: string }> = {
    LOW: { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
    MEDIUM: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40' },
    HIGH: { color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/40' },
    CRITICAL: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40' },
  };
  const s = map[level] || map.MEDIUM;
  return (
    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', s.color, s.bg)}>
      {level}
    </span>
  );
}

export function ratingStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <StarIcon
          key={i}
          className={clsx('w-4 h-4', i <= Math.round(rating) ? 'text-amber-400' : 'text-secondary-300 dark:text-secondary-600')}
        />
      ))}
      <span className="ml-1 text-sm font-medium text-secondary-700 dark:text-secondary-300">{(rating ?? 0).toFixed(1)}</span>
    </div>
  );
}

export const MANAGER_ROLES = ['Super Admin', 'SUPER_ADMIN', 'HR_ADMIN', 'HR Admin', 'MANAGER', 'Manager', 'ADMIN', 'Tenant Admin', 'TENANT_ADMIN'];
