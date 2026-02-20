import { useQuery } from '@tanstack/react-query';
import { BookOpenIcon, CheckCircleIcon, ClockIcon, PlayIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import { developmentApi, type DevelopmentPlan, type DevelopmentActivity } from '@/lib/api';
import { SkeletonCard } from '@/components/ui';

const STATUS_ICONS: Record<string, { icon: typeof CheckCircleIcon; color: string }> = {
  COMPLETED: { icon: CheckCircleIcon, color: 'text-emerald-500' },
  IN_PROGRESS: { icon: PlayIcon, color: 'text-blue-500' },
  NOT_STARTED: { icon: ClockIcon, color: 'text-secondary-400' },
};

function LearningProgress() {
  const { data, isLoading } = useQuery({
    queryKey: ['dev-plans-active'],
    queryFn: () => developmentApi.listPlans({ status: 'ACTIVE', limit: 3 }),
    staleTime: 120_000,
  });

  if (isLoading) return <SkeletonCard />;

  const plans: DevelopmentPlan[] = data?.data ?? [];

  if (!plans.length) {
    return (
      <div className="glass-deep rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpenIcon className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Learning & Development</h3>
        </div>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-3">No active development plans.</p>
        <Link
          to="/development"
          className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
        >
          Browse development options &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-deep rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpenIcon className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Learning & Development</h3>
        </div>
        <Link
          to="/development"
          className="text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline"
        >
          View All
        </Link>
      </div>

      <div className="space-y-4">
        {plans.slice(0, 2).map((plan) => (
          <div key={plan.id}>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-sm font-medium text-secondary-800 dark:text-secondary-200 truncate max-w-[70%]">
                {plan.planName}
              </h4>
              <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                {plan.overallProgress}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-secondary-100 dark:bg-secondary-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                style={{ width: `${plan.overallProgress}%` }}
              />
            </div>

            {/* Activities preview */}
            <div className="space-y-1">
              {(plan.activities ?? []).slice(0, 3).map((activity: DevelopmentActivity) => {
                const statusInfo = STATUS_ICONS[activity.status] ?? STATUS_ICONS.NOT_STARTED;
                const StatusIcon = statusInfo.icon;
                return (
                  <div key={activity.id} className="flex items-center gap-2 text-xs">
                    <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${statusInfo.color}`} />
                    <span className="text-secondary-600 dark:text-secondary-400 truncate">{activity.title}</span>
                    {activity.progressPercentage > 0 && activity.progressPercentage < 100 && (
                      <span className="text-secondary-400 dark:text-secondary-500 shrink-0 ml-auto">
                        {activity.progressPercentage}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LearningProgress;
