import clsx from 'clsx';
import type { Goal } from '@/lib/api';
import { OKRProgressRing } from './OKRProgressRing';

interface OKRAlignmentTreeProps {
  objectives: Goal[];
  onSelectObjective?: (obj: Goal) => void;
  className?: string;
}

const typeLabels: Record<string, string> = {
  COMPANY: 'Company',
  DEPARTMENT: 'Dept',
  TEAM: 'Team',
  INDIVIDUAL: 'Individual',
  OKR_OBJECTIVE: 'Objective',
  OKR_KEY_RESULT: 'Key Result',
};

const typeBadgeColors: Record<string, string> = {
  COMPANY: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  DEPARTMENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  TEAM: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  INDIVIDUAL: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300',
  OKR_OBJECTIVE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  OKR_KEY_RESULT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
};

function TreeNode({
  goal,
  depth,
  onSelect,
}: {
  goal: Goal;
  depth: number;
  onSelect?: (g: Goal) => void;
}) {
  const children = goal.childGoals || [];
  const isObjective = goal.type === 'OKR_OBJECTIVE';

  return (
    <div className={clsx(depth > 0 && 'ml-8 lg:ml-12')}>
      {/* Connector line */}
      {depth > 0 && (
        <div className="relative">
          <div className="absolute -left-4 lg:-left-6 top-0 bottom-0 w-px bg-secondary-200 dark:bg-secondary-700" />
          <div className="absolute -left-4 lg:-left-6 top-5 w-4 lg:w-6 h-px bg-secondary-200 dark:bg-secondary-700" />
        </div>
      )}

      {/* Node */}
      <button
        onClick={() => onSelect?.(goal)}
        className={clsx(
          'w-full text-left flex items-center gap-3 p-3 rounded-lg transition-colors',
          'hover:bg-secondary-50 dark:hover:bg-secondary-700/50',
          isObjective
            ? 'bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 shadow-sm'
            : 'bg-secondary-50/50 dark:bg-secondary-800/50'
        )}
      >
        <OKRProgressRing progress={goal.progress} size={40} strokeWidth={3} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                'px-1.5 py-0.5 rounded text-[9px] font-semibold',
                typeBadgeColors[goal.type] || typeBadgeColors.OKR_OBJECTIVE
              )}
            >
              {typeLabels[goal.type] || goal.type}
            </span>
            <span className="text-xs text-secondary-400 dark:text-secondary-500">
              {Math.round(goal.progress)}%
            </span>
          </div>
          <p className="text-sm font-medium text-secondary-900 dark:text-white mt-0.5 truncate">
            {goal.title}
          </p>
          {goal.owner && (
            <p className="text-[10px] text-secondary-400 dark:text-secondary-500">
              {goal.owner.firstName} {goal.owner.lastName}
            </p>
          )}
        </div>
      </button>

      {/* Children */}
      {children.length > 0 && (
        <div className="mt-1 space-y-1">
          {children.map((child) => (
            <TreeNode key={child.id} goal={child} depth={depth + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

export function OKRAlignmentTree({ objectives, onSelectObjective, className }: OKRAlignmentTreeProps) {
  if (!objectives || objectives.length === 0) {
    return (
      <div className={clsx('text-center py-12', className)}>
        <p className="text-secondary-500 dark:text-secondary-400">No OKR alignment data available.</p>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-3', className)}>
      {objectives.map((obj) => (
        <TreeNode key={obj.id} goal={obj} depth={0} onSelect={onSelectObjective} />
      ))}
    </div>
  );
}
