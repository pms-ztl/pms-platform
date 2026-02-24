import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/solid';
import { EllipsisHorizontalCircleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

// Review cycle workflow stages in order
const REVIEW_STAGES = [
  { key: 'DRAFT', label: 'Draft', description: 'Cycle being configured' },
  { key: 'SCHEDULED', label: 'Scheduled', description: 'Awaiting start date' },
  { key: 'SELF_ASSESSMENT', label: 'Self-Assessment', description: 'Employees completing self-reviews' },
  { key: 'MANAGER_REVIEW', label: 'Manager Review', description: 'Managers evaluating reports' },
  { key: 'CALIBRATION', label: 'Calibration', description: 'Rating alignment sessions' },
  { key: 'FINALIZATION', label: 'Finalization', description: 'Final ratings confirmed' },
  { key: 'SHARING', label: 'Sharing', description: 'Results shared with employees' },
  { key: 'COMPLETED', label: 'Completed', description: 'Cycle archived' },
];

const CANCELLED_KEY = 'CANCELLED';

interface WorkflowTimelineProps {
  currentStage: string;
  className?: string;
  compact?: boolean;
}

export function WorkflowTimeline({ currentStage, className, compact = false }: WorkflowTimelineProps) {
  if (currentStage === CANCELLED_KEY) {
    return (
      <div className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800', className)}>
        <span className="h-3 w-3 rounded-full bg-red-500" />
        <span className="text-sm font-medium text-red-700 dark:text-red-400">Cancelled</span>
      </div>
    );
  }

  const currentIndex = REVIEW_STAGES.findIndex(s => s.key === currentStage);

  if (compact) {
    return (
      <div className={clsx('flex items-center gap-1', className)}>
        {REVIEW_STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={stage.key} className="flex items-center">
              <div
                className={clsx(
                  'h-2.5 w-2.5 rounded-full transition-colors',
                  isCompleted && 'bg-green-500',
                  isCurrent && 'bg-primary-500 ring-2 ring-primary-200 dark:ring-primary-800',
                  !isCompleted && !isCurrent && 'bg-secondary-300 dark:bg-secondary-600'
                )}
                title={`${stage.label}${isCurrent ? ' (Current)' : isCompleted ? ' (Done)' : ''}`}
              />
              {idx < REVIEW_STAGES.length - 1 && (
                <div className={clsx(
                  'h-0.5 w-3',
                  idx < currentIndex ? 'bg-green-500' : 'bg-secondary-300 dark:bg-secondary-600'
                )} />
              )}
            </div>
          );
        })}
        <span className="ml-2 text-xs font-medium text-secondary-600 dark:text-secondary-400">
          {REVIEW_STAGES[currentIndex]?.label || currentStage}
        </span>
      </div>
    );
  }

  return (
    <div className={clsx('', className)}>
      <div className="flex items-center justify-between">
        {REVIEW_STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isFuture = idx > currentIndex;

          return (
            <div key={stage.key} className="flex items-center flex-1 last:flex-none">
              {/* Stage node */}
              <div className="flex flex-col items-center relative group">
                <div
                  className={clsx(
                    'flex items-center justify-center rounded-full transition-all',
                    isCompleted && 'h-8 w-8 bg-green-500 text-white',
                    isCurrent && 'h-9 w-9 bg-primary-600 text-white ring-4 ring-primary-100 dark:ring-primary-900',
                    isFuture && 'h-8 w-8 bg-secondary-200 dark:bg-secondary-600 text-secondary-400 dark:text-secondary-500'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : isCurrent ? (
                    <ClockIcon className="h-5 w-5" />
                  ) : (
                    <EllipsisHorizontalCircleIcon className="h-5 w-5" />
                  )}
                </div>
                <span className={clsx(
                  'mt-2 text-xs font-medium text-center whitespace-nowrap',
                  isCompleted && 'text-green-600 dark:text-green-400',
                  isCurrent && 'text-primary-600 dark:text-primary-400',
                  isFuture && 'text-secondary-400 dark:text-secondary-500'
                )}>
                  {stage.label}
                </span>
                {/* Tooltip */}
                <div className="absolute -bottom-12 hidden group-hover:block z-10">
                  <div className="bg-secondary-900 dark:bg-secondary-700 text-white text-2xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                    {stage.description}
                  </div>
                </div>
              </div>

              {/* Connector line */}
              {idx < REVIEW_STAGES.length - 1 && (
                <div className={clsx(
                  'flex-1 h-0.5 mx-1',
                  idx < currentIndex ? 'bg-green-500' : 'bg-secondary-200 dark:bg-secondary-600'
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
