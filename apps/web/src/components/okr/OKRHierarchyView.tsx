import { useState } from 'react';
import {
  FlagIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  QueueListIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { Goal } from '@/lib/api';
import { OKRProgressRing } from './OKRProgressRing';

// ---------------------------------------------------------------------------
// Shared Helpers
// ---------------------------------------------------------------------------

const typeLabels: Record<string, string> = {
  COMPANY: 'Company',
  DEPARTMENT: 'Department',
  TEAM: 'Team',
  INDIVIDUAL: 'Individual',
  OKR_OBJECTIVE: 'Objective',
  OKR_KEY_RESULT: 'Key Result',
};

const typeBorderColors: Record<string, string> = {
  COMPANY: 'border-l-purple-500',
  DEPARTMENT: 'border-l-blue-500',
  TEAM: 'border-l-teal-500',
  INDIVIDUAL: 'border-l-secondary-400',
  OKR_OBJECTIVE: 'border-l-amber-500',
  OKR_KEY_RESULT: 'border-l-orange-500',
};

const typeBadgeColors: Record<string, string> = {
  COMPANY: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  DEPARTMENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  TEAM: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  INDIVIDUAL: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300',
  OKR_OBJECTIVE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  OKR_KEY_RESULT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
};

function progressColor(p: number) {
  if (p >= 70) return 'bg-green-500';
  if (p >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function getQuarter(date: string | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} ${d.getFullYear()}`;
}

function getInitials(owner?: { firstName: string; lastName: string }) {
  if (!owner) return '?';
  return `${owner.firstName?.[0] || ''}${owner.lastName?.[0] || ''}`;
}

function countChildren(goal: Goal): number {
  const children = goal.childGoals || [];
  return children.length + children.reduce((sum, c) => sum + countChildren(c), 0);
}

// ---------------------------------------------------------------------------
// Tree Sub-mode (Visual card tree with connectors)
// ---------------------------------------------------------------------------

function TreeCard({ goal, onSelect }: { goal: Goal; onSelect?: (g: Goal) => void }) {
  const children = goal.childGoals || [];
  const quarter = getQuarter(goal.dueDate);

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <button
        onClick={() => onSelect?.(goal)}
        className={clsx(
          'w-64 text-left bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 shadow-sm',
          'border-l-4 hover:shadow-md transition-all',
          typeBorderColors[goal.type] || 'border-l-secondary-300'
        )}
      >
        <div className="p-3.5">
          {/* Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={clsx('px-1.5 py-0.5 rounded text-[9px] font-semibold', typeBadgeColors[goal.type] || typeBadgeColors.OKR_OBJECTIVE)}>
              {typeLabels[goal.type] || goal.type}
            </span>
            {quarter && (
              <span className="px-1.5 py-0.5 rounded bg-secondary-100 dark:bg-secondary-700 text-[9px] font-medium text-secondary-500 dark:text-secondary-400">
                {quarter}
              </span>
            )}
          </div>
          {/* Title */}
          <p className="text-sm font-medium text-secondary-900 dark:text-white mt-1.5 line-clamp-2">
            {goal.title}
          </p>
          {/* Progress bar */}
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full', progressColor(goal.progress))}
                style={{ width: `${Math.min(goal.progress, 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-secondary-600 dark:text-secondary-400">
              {Math.round(goal.progress)}%
            </span>
          </div>
          {/* Owner */}
          {goal.owner && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-[9px] font-bold">
                {getInitials(goal.owner)}
              </span>
              <span className="text-[10px] text-secondary-500 dark:text-secondary-400">
                {goal.owner.firstName} {goal.owner.lastName}
              </span>
            </div>
          )}
        </div>
      </button>

      {/* Children with connectors */}
      {children.length > 0 && (
        <>
          {/* Vertical connector from parent */}
          <div className="w-px h-6 bg-secondary-300 dark:bg-secondary-600" />

          {/* Horizontal connector bar */}
          {children.length > 1 && (
            <div
              className="h-px bg-secondary-300 dark:bg-secondary-600"
              style={{ width: `${Math.min(children.length * 272, 900)}px` }}
            />
          )}

          {/* Children row */}
          <div className="flex gap-4 items-start">
            {children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Vertical connector to child */}
                <div className="w-px h-6 bg-secondary-300 dark:bg-secondary-600" />
                <TreeCard goal={child} onSelect={onSelect} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Indented List Sub-mode
// ---------------------------------------------------------------------------

function IndentedRow({
  goal,
  depth,
  onSelect,
}: {
  goal: Goal;
  depth: number;
  onSelect?: (g: Goal) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const children = goal.childGoals || [];
  const quarter = getQuarter(goal.dueDate);
  const childCount = countChildren(goal);

  return (
    <>
      <tr
        className="group hover:bg-secondary-50 dark:hover:bg-secondary-800/50 cursor-pointer transition-colors"
        onClick={() => onSelect?.(goal)}
      >
        {/* Expand */}
        <td className="py-2.5 w-8" style={{ paddingLeft: `${16 + depth * 28}px` }}>
          {children.length > 0 ? (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="p-0.5 rounded hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors"
            >
              {expanded ? (
                <ChevronDownIcon className="h-3.5 w-3.5 text-secondary-500" />
              ) : (
                <ChevronRightIcon className="h-3.5 w-3.5 text-secondary-500" />
              )}
            </button>
          ) : (
            <div className="w-3.5" />
          )}
        </td>

        {/* Type badge + Title */}
        <td className="py-2.5 pr-4">
          <div className="flex items-center gap-2">
            <span className={clsx('px-1.5 py-0.5 rounded text-[9px] font-semibold shrink-0', typeBadgeColors[goal.type] || typeBadgeColors.OKR_OBJECTIVE)}>
              {typeLabels[goal.type] || goal.type}
            </span>
            <span className="text-sm font-medium text-secondary-900 dark:text-white truncate">
              {goal.title}
            </span>
          </div>
        </td>

        {/* Owner */}
        <td className="py-2.5 pr-4">
          {goal.owner && (
            <div className="flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-[9px] font-bold shrink-0">
                {getInitials(goal.owner)}
              </span>
              <span className="text-xs text-secondary-600 dark:text-secondary-300 truncate max-w-[90px]">
                {goal.owner.firstName} {goal.owner.lastName}
              </span>
            </div>
          )}
        </td>

        {/* Quarter */}
        <td className="py-2.5 pr-4">
          {quarter && (
            <span className="px-1.5 py-0.5 rounded bg-secondary-100 dark:bg-secondary-700 text-[9px] font-medium text-secondary-500 dark:text-secondary-400">
              {quarter}
            </span>
          )}
        </td>

        {/* Child count */}
        <td className="py-2.5 pr-4 text-center">
          {childCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-secondary-100 dark:bg-secondary-700 text-[10px] font-medium text-secondary-500 dark:text-secondary-400">
              {childCount}
            </span>
          )}
        </td>

        {/* Progress */}
        <td className="py-2.5 pr-4 w-16">
          <OKRProgressRing progress={goal.progress} size={32} strokeWidth={3} />
        </td>
      </tr>

      {/* Children */}
      {expanded && children.map((child) => (
        <IndentedRow key={child.id} goal={child} depth={depth + 1} onSelect={onSelect} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main View
// ---------------------------------------------------------------------------

interface OKRHierarchyViewProps {
  treeData: Goal[];
  onSelect: (goal: Goal) => void;
}

type SubMode = 'tree' | 'indented';

export function OKRHierarchyView({ treeData, onSelect }: OKRHierarchyViewProps) {
  const [subMode, setSubMode] = useState<SubMode>('tree');

  if (!treeData || treeData.length === 0) {
    return (
      <div className="text-center py-16">
        <FlagIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
        <h3 className="mt-3 text-sm font-medium text-secondary-900 dark:text-white">No hierarchy data</h3>
        <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
          Create parent-child goal relationships to see the hierarchy.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Sub-mode toggle */}
      <div className="flex items-center gap-1 mb-4 bg-secondary-100 dark:bg-secondary-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setSubMode('tree')}
          className={clsx(
            'px-3 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition-all',
            subMode === 'tree'
              ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
              : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-700'
          )}
        >
          <ShareIcon className="h-3.5 w-3.5" />
          Tree
        </button>
        <button
          onClick={() => setSubMode('indented')}
          className={clsx(
            'px-3 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition-all',
            subMode === 'indented'
              ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
              : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-700'
          )}
        >
          <QueueListIcon className="h-3.5 w-3.5" />
          Indented List
        </button>
      </div>

      {subMode === 'tree' ? (
        /* Visual Tree */
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6 overflow-x-auto">
          <div className="flex flex-col items-center gap-0 min-w-fit">
            {treeData.map((root) => (
              <div key={root.id} className="mb-8 last:mb-0">
                <TreeCard goal={root} onSelect={onSelect} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Indented List */
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800/80">
                <th className="w-8 py-2.5 pl-4" />
                <th className="text-left py-2.5 pr-4 text-xs font-semibold text-secondary-500 dark:text-secondary-400">Goal</th>
                <th className="text-left py-2.5 pr-4 text-xs font-semibold text-secondary-500 dark:text-secondary-400">Owner</th>
                <th className="text-left py-2.5 pr-4 text-xs font-semibold text-secondary-500 dark:text-secondary-400">Quarter</th>
                <th className="text-center py-2.5 pr-4 text-xs font-semibold text-secondary-500 dark:text-secondary-400">Items</th>
                <th className="text-left py-2.5 pr-4 text-xs font-semibold text-secondary-500 dark:text-secondary-400 w-16">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
              {treeData.map((root) => (
                <IndentedRow key={root.id} goal={root} depth={0} onSelect={onSelect} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
