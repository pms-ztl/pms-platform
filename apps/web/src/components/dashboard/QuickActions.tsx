import {
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface QuickActionsProps {
  pendingReviews: any[];
  atRiskGoals: any[];
  goalsData: any;
}

function QuickActions({ pendingReviews, atRiskGoals, goalsData }: QuickActionsProps) {
  return (
    <div className="glass-deep rounded-2xl overflow-hidden depth-shadow">
      <div className="card-header bg-gradient-to-r from-amber-50/80 to-orange-50/50 dark:from-amber-500/[0.06] dark:to-orange-500/[0.03]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg glow-breathe" style={{ animationDuration: '4s' }}>
            <BoltIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Quick Actions</h2>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">Tasks awaiting you</p>
          </div>
        </div>
      </div>
      <div className="card-body space-y-3">
        {pendingReviews.slice(0, 2).map((review: any) => (
          <div
            key={review.id}
            className="group p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg shadow group-hover:scale-110 transition-transform">
                <ClipboardDocumentCheckIcon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary-900 dark:text-white">
                  {review.type === 'SELF' ? 'Complete self-assessment' : `Review for ${review.reviewee?.firstName}`}
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{review.cycle?.name}</p>
              </div>
            </div>
            <a href={`/reviews/${review.id}`} className="btn-primary text-xs mt-3 w-full justify-center group-hover:shadow-lg">
              Start Review
            </a>
          </div>
        ))}

        {/* At-risk goals as action items */}
        {atRiskGoals.slice(0, 2).map((risk: any) => {
          const goalTitle = goalsData?.data?.find((g: any) => g.id === risk.goalId)?.title || 'Goal needs attention';
          const velocity = risk.requiredVelocity;
          const velocityText = !velocity || !isFinite(velocity) || velocity >= 999
            ? 'Past due \u2014 immediate action needed'
            : `Needs ${velocity.toFixed(1)}%/day to finish on time`;
          return (
            <div
              key={risk.goalId}
              className="p-4 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200/50 dark:border-red-800/50"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg shadow">
                  <ExclamationTriangleIcon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{goalTitle}</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                    Risk: {risk.riskScore}% &bull; {velocityText}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {pendingReviews.length === 0 && atRiskGoals.length === 0 && (
          <div className="text-center py-8">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-full animate-pulse" />
              <div className="absolute inset-1 bg-white dark:bg-secondary-800 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="w-8 h-8 text-emerald-500" />
              </div>
            </div>
            <p className="text-secondary-900 dark:text-white font-medium">All caught up!</p>
            <p className="text-secondary-500 dark:text-secondary-400 text-sm mt-1">No pending tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuickActions;
