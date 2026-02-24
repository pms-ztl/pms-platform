import clsx from 'clsx';
import { FlagIcon } from '@heroicons/react/24/outline';
import type { Goal } from '@/lib/api';
import { OKRProgressRing } from './OKRProgressRing';

interface OKRCardProps {
  objective: Goal;
  keyResults: Goal[];
  onCheckin?: (krId: string) => void;
  className?: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  DRAFT: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300',
  ON_HOLD: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

function progressColor(p: number) {
  if (p >= 70) return 'bg-green-500';
  if (p >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

export function OKRCard({ objective, keyResults, onCheckin, className }: OKRCardProps) {
  const avgProgress =
    keyResults.length > 0
      ? Math.round(keyResults.reduce((sum, kr) => sum + kr.progress, 0) / keyResults.length)
      : objective.progress;

  const initials = objective.owner
    ? `${objective.owner.firstName?.[0] || ''}${objective.owner.lastName?.[0] || ''}`
    : '';

  const dueLabel = objective.dueDate
    ? new Date(objective.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <div
      className={clsx(
        'bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <OKRProgressRing progress={avgProgress} size={72} strokeWidth={5} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              OBJECTIVE
            </span>
            <span
              className={clsx(
                'px-2 py-0.5 rounded-full text-2xs font-medium',
                statusColors[objective.status] || statusColors.DRAFT
              )}
            >
              {objective.status}
            </span>
          </div>
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mt-1">
            {objective.title}
          </h3>
          <div className="flex items-center gap-3 mt-2 text-xs text-secondary-500 dark:text-secondary-400">
            {initials && (
              <span className="inline-flex items-center gap-1">
                <span className="h-5 w-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-2xs font-bold">
                  {initials}
                </span>
                {objective.owner.firstName} {objective.owner.lastName}
              </span>
            )}
            {dueLabel && <span>Due {dueLabel}</span>}
          </div>
        </div>
      </div>

      {/* Key Results */}
      {keyResults.length > 0 && (
        <div className="mt-5 space-y-3">
          <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider">
            Key Results ({keyResults.length})
          </h4>
          {keyResults.map((kr) => (
            <div key={kr.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-secondary-800 dark:text-secondary-200 break-words">
                    {kr.title}
                  </p>
                  <span className="text-xs font-medium text-secondary-600 dark:text-secondary-400 shrink-0">
                    {Math.round(kr.progress)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full transition-all duration-300', progressColor(kr.progress))}
                    style={{ width: `${Math.min(kr.progress, 100)}%` }}
                  />
                </div>
              </div>
              {onCheckin && kr.status === 'ACTIVE' && (
                <button
                  onClick={() => onCheckin(kr.id)}
                  className="shrink-0 px-2 py-1 text-2xs font-medium rounded-md border border-secondary-300 dark:border-secondary-600 text-secondary-600 dark:text-secondary-300 hover:bg-primary-50/30 dark:hover:bg-white/[0.03] transition-colors"
                >
                  Check-in
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {keyResults.length === 0 && (
        <div className="mt-4 text-center py-4">
          <FlagIcon className="mx-auto h-8 w-8 text-secondary-300 dark:text-secondary-600" />
          <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">No key results yet</p>
        </div>
      )}
    </div>
  );
}
