import { FlagIcon, PencilSquareIcon, EllipsisHorizontalIcon, LinkIcon, ScaleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { Goal } from '@/lib/api';
import { OKRProgressRing } from './OKRProgressRing';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  DRAFT: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300',
  ON_HOLD: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const priorityColors: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

function progressColor(p: number) {
  if (p >= 70) return 'bg-green-500';
  if (p >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function getInitials(owner?: { firstName: string; lastName: string }) {
  if (!owner) return '?';
  return `${owner.firstName?.[0] || ''}${owner.lastName?.[0] || ''}`;
}

// ---------------------------------------------------------------------------
// Detail Card Component
// ---------------------------------------------------------------------------

function DetailCard({
  objective,
  keyResults,
  onCheckin,
}: {
  objective: Goal;
  keyResults: Goal[];
  onCheckin: (krId: string) => void;
}) {
  const avgProgress =
    keyResults.length > 0
      ? Math.round(keyResults.reduce((sum, kr) => sum + kr.progress, 0) / keyResults.length)
      : objective.progress;

  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
      {/* Colored top accent */}
      <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />

      <div className="p-5">
        {/* Header badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            OBJECTIVE
          </span>
          <span className={clsx('px-2 py-0.5 rounded-full text-2xs font-medium', statusColors[objective.status] || statusColors.DRAFT)}>
            {objective.status}
          </span>
          {objective.priority && (
            <span className={clsx('px-2 py-0.5 rounded-full text-2xs font-medium', priorityColors[objective.priority] || priorityColors.MEDIUM)}>
              {objective.priority}
            </span>
          )}
        </div>

        {/* Title & description */}
        <h3 className="text-base font-semibold text-secondary-900 dark:text-white mt-2.5">
          {objective.title}
        </h3>
        {objective.description && (
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
            {objective.description}
          </p>
        )}

        {/* Progress section */}
        <div className="mt-4 flex items-center gap-4">
          <OKRProgressRing progress={avgProgress} size={80} strokeWidth={5} />
          <div className="flex-1 space-y-1.5">
            {objective.targetValue !== undefined && objective.targetValue !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary-500 dark:text-secondary-400">Target</span>
                <span className="font-semibold text-secondary-900 dark:text-white">
                  {objective.targetValue} {objective.unit || ''}
                </span>
              </div>
            )}
            {objective.currentValue !== undefined && objective.currentValue !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary-500 dark:text-secondary-400">Achieved</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {objective.currentValue} {objective.unit || ''}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-secondary-500 dark:text-secondary-400">Due</span>
              <span className="font-medium text-secondary-700 dark:text-secondary-300">
                {objective.dueDate
                  ? new Date(objective.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '---'}
              </span>
            </div>
          </div>
        </div>

        {/* Aligned To */}
        {objective.parentGoal && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-secondary-50 dark:bg-secondary-700/30 rounded-lg">
            <LinkIcon className="h-3.5 w-3.5 text-secondary-400 shrink-0" />
            <span className="text-2xs font-medium text-secondary-500 dark:text-secondary-400">Aligned to:</span>
            <span className="text-xs font-medium text-primary-600 dark:text-primary-400 break-words">
              {objective.parentGoal.title}
            </span>
          </div>
        )}

        {/* Owner / Contributors */}
        <div className="mt-3 flex items-center gap-2">
          <span className="h-7 w-7 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-bold shrink-0">
            {getInitials(objective.owner)}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-secondary-900 dark:text-white break-words">
              {objective.owner?.firstName} {objective.owner?.lastName}
            </p>
            <p className="text-2xs text-secondary-400">Owner</p>
          </div>
        </div>

        {/* Key Results */}
        {keyResults.length > 0 && (
          <div className="mt-4 border-t border-secondary-100 dark:border-secondary-700 pt-3">
            <h4 className="text-2xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-2.5">
              Key Results ({keyResults.length})
            </h4>
            <div className="space-y-2.5">
              {keyResults.map((kr) => (
                <div key={kr.id} className="group/kr">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1 py-0.5 rounded text-3xs font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                          KR
                        </span>
                        <span className="text-xs text-secondary-800 dark:text-secondary-200 break-words">
                          {kr.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                          <div
                            className={clsx('h-full rounded-full transition-all duration-300', progressColor(kr.progress))}
                            style={{ width: `${Math.min(kr.progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-2xs font-semibold text-secondary-600 dark:text-secondary-400 w-8 text-right">
                          {Math.round(kr.progress)}%
                        </span>
                      </div>
                    </div>
                    {kr.weight && kr.weight !== 1 && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-secondary-100 dark:bg-secondary-700 text-3xs font-medium text-secondary-500 dark:text-secondary-400 shrink-0">
                        <ScaleIcon className="h-2.5 w-2.5" />
                        {kr.weight}x
                      </span>
                    )}
                    {onCheckin && kr.status === 'ACTIVE' && (
                      <button
                        onClick={() => onCheckin(kr.id)}
                        className="shrink-0 px-2 py-0.5 text-3xs font-medium rounded-md border border-primary-300 dark:border-primary-600 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors opacity-0 group-hover/kr:opacity-100"
                      >
                        Check-in
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {keyResults.length === 0 && (
          <div className="mt-4 text-center py-3 border-t border-secondary-100 dark:border-secondary-700">
            <FlagIcon className="mx-auto h-6 w-6 text-secondary-300 dark:text-secondary-600" />
            <p className="text-2xs text-secondary-400 mt-1">No key results yet</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-3 pt-3 border-t border-secondary-100 dark:border-secondary-700 flex items-center gap-2">
          <a
            href={`/goals/${objective.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors"
          >
            <PencilSquareIcon className="h-3 w-3" />
            Edit
          </a>
          <button className="ml-auto p-1.5 rounded-lg text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
            <EllipsisHorizontalIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main View
// ---------------------------------------------------------------------------

interface OKRDetailCardsViewProps {
  objectives: Goal[];
  krByParent: Map<string, Goal[]>;
  onCheckin: (krId: string) => void;
}

export function OKRDetailCardsView({ objectives, krByParent, onCheckin }: OKRDetailCardsViewProps) {
  if (objectives.length === 0) {
    return (
      <div className="text-center py-16">
        <FlagIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
        <h3 className="mt-3 text-sm font-medium text-secondary-900 dark:text-white">No OKRs found</h3>
        <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
          Create objectives with type &quot;OKR Objective&quot; from the Goals page.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {objectives.map((obj) => (
        <DetailCard
          key={obj.id}
          objective={obj}
          keyResults={krByParent.get(obj.id) || []}
          onCheckin={onCheckin}
        />
      ))}
    </div>
  );
}
