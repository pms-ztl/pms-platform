import { useState } from 'react';
import {
  FlagIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { Goal } from '@/lib/api';

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

function progressColor(p: number) {
  if (p >= 70) return 'bg-green-500';
  if (p >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function progressTextColor(p: number) {
  if (p >= 70) return 'text-green-600 dark:text-green-400';
  if (p >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function fmtShortDate(d: string | undefined): string {
  if (!d) return '---';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function healthLabel(p: number): { label: string; cls: string } {
  if (p >= 70) return { label: 'On Track', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
  if (p >= 40) return { label: 'At Risk', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
  return { label: 'Behind', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
}

// Tag color deterministic hash
const tagPalette = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
];
function tagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  return tagPalette[Math.abs(hash) % tagPalette.length];
}

// ---------------------------------------------------------------------------
// Row Component
// ---------------------------------------------------------------------------

function ListRow({
  objective,
  keyResults,
  onCheckin,
}: {
  objective: Goal;
  keyResults: Goal[];
  onCheckin: (krId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const avgProgress =
    keyResults.length > 0
      ? Math.round(keyResults.reduce((s, kr) => s + kr.progress, 0) / keyResults.length)
      : objective.progress;

  const initials = objective.owner
    ? `${objective.owner.firstName?.[0] || ''}${objective.owner.lastName?.[0] || ''}`
    : '?';

  const health = objective.status === 'COMPLETED'
    ? { label: 'Completed', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
    : objective.status === 'DRAFT'
    ? { label: 'Draft', cls: 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400' }
    : healthLabel(avgProgress);

  const tags = objective.tags || [];

  return (
    <>
      {/* Objective row */}
      <tr
        className="group hover:bg-secondary-50 dark:hover:bg-secondary-800/50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Expand */}
        <td className="pl-4 pr-1 py-3.5 w-8">
          {keyResults.length > 0 ? (
            expanded ? (
              <ChevronDownIcon className="h-4 w-4 text-secondary-400" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-secondary-400" />
            )
          ) : (
            <div className="w-4" />
          )}
        </td>

        {/* Title */}
        <td className="py-3.5 pr-4">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 shrink-0">
              OBJ
            </span>
            <span className="text-sm font-medium text-secondary-900 dark:text-white break-words">
              {objective.title}
            </span>
          </div>
        </td>

        {/* Tags */}
        <td className="py-3.5 pr-4">
          <div className="flex items-center gap-1 flex-wrap">
            {tags.slice(0, 3).map((t) => (
              <span key={t} className={clsx('px-1.5 py-0.5 rounded text-[8px] font-semibold', tagColor(t))}>
                {t}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[9px] text-secondary-400">+{tags.length - 3}</span>
            )}
          </div>
        </td>

        {/* Owner */}
        <td className="py-3.5 pr-4">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-[10px] font-bold shrink-0">
              {initials}
            </span>
            <span className="text-xs text-secondary-600 dark:text-secondary-300 break-words">
              {objective.owner?.firstName} {objective.owner?.lastName}
            </span>
          </div>
        </td>

        {/* Progress */}
        <td className="py-3.5 pr-4 w-36">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all', progressColor(avgProgress))}
                style={{ width: `${Math.min(avgProgress, 100)}%` }}
              />
            </div>
            <span className={clsx('text-xs font-semibold w-9 text-right', progressTextColor(avgProgress))}>
              {avgProgress}%
            </span>
          </div>
        </td>

        {/* Status */}
        <td className="py-3.5 pr-4">
          <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap', health.cls)}>
            {health.label}
          </span>
        </td>

        {/* Due */}
        <td className="py-3.5 pr-4">
          <span className="text-xs text-secondary-500 dark:text-secondary-400 whitespace-nowrap">{fmtShortDate(objective.dueDate)}</span>
        </td>

        {/* Actions */}
        <td className="py-3.5 pr-4 w-10">
          <button
            onClick={(e) => { e.stopPropagation(); window.open(`/goals/${objective.id}`, '_self'); }}
            className="p-1 rounded text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
          >
            <EllipsisVerticalIcon className="h-4 w-4" />
          </button>
        </td>
      </tr>

      {/* Expanded KRs */}
      {expanded &&
        keyResults.map((kr) => {
          const krHealth = kr.status === 'COMPLETED'
            ? { label: 'Completed', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
            : healthLabel(kr.progress);

          return (
            <tr
              key={kr.id}
              className="bg-secondary-50/50 dark:bg-secondary-900/20 hover:bg-secondary-100 dark:hover:bg-secondary-800/40 transition-colors"
            >
              <td className="pl-4 pr-1 py-2.5 w-8" />
              <td className="py-2.5 pr-4 pl-8">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 shrink-0">
                    KR
                  </span>
                  <span className="text-sm text-secondary-700 dark:text-secondary-200 break-words">
                    {kr.title}
                  </span>
                </div>
              </td>
              <td className="py-2.5 pr-4">
                {(kr.tags || []).slice(0, 2).map((t) => (
                  <span key={t} className={clsx('px-1.5 py-0.5 rounded text-[8px] font-semibold mr-1', tagColor(t))}>
                    {t}
                  </span>
                ))}
              </td>
              <td className="py-2.5 pr-4">
                {kr.owner && (
                  <span className="text-xs text-secondary-500 dark:text-secondary-400">
                    {kr.owner.firstName} {kr.owner.lastName}
                  </span>
                )}
              </td>
              <td className="py-2.5 pr-4 w-36">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all', progressColor(kr.progress))}
                      style={{ width: `${Math.min(kr.progress, 100)}%` }}
                    />
                  </div>
                  <span className={clsx('text-xs font-medium w-9 text-right', progressTextColor(kr.progress))}>
                    {Math.round(kr.progress)}%
                  </span>
                </div>
              </td>
              <td className="py-2.5 pr-4">
                <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap', krHealth.cls)}>
                  {krHealth.label}
                </span>
              </td>
              <td className="py-2.5 pr-4">
                <span className="text-xs text-secondary-500 dark:text-secondary-400 whitespace-nowrap">{fmtShortDate(kr.dueDate)}</span>
              </td>
              <td className="py-2.5 pr-4 w-10">
                {kr.status === 'ACTIVE' && (
                  <button
                    onClick={() => onCheckin(kr.id)}
                    className="text-[10px] font-medium text-primary-600 dark:text-primary-400 hover:underline whitespace-nowrap"
                  >
                    Check-in
                  </button>
                )}
              </td>
            </tr>
          );
        })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main View
// ---------------------------------------------------------------------------

interface OKRListViewProps {
  objectives: Goal[];
  krByParent: Map<string, Goal[]>;
  onCheckin: (krId: string) => void;
}

type SortField = 'title' | 'progress' | 'dueDate' | 'status';

export function OKRListView({ objectives, krByParent, onCheckin }: OKRListViewProps) {
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortAsc, setSortAsc] = useState(true);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  }

  const sorted = [...objectives].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    if (sortField === 'title') return a.title.localeCompare(b.title) * dir;
    if (sortField === 'progress') {
      const ap = (krByParent.get(a.id) || []).reduce((s, kr) => s + kr.progress, 0) / Math.max(1, (krByParent.get(a.id) || []).length) || a.progress;
      const bp = (krByParent.get(b.id) || []).reduce((s, kr) => s + kr.progress, 0) / Math.max(1, (krByParent.get(b.id) || []).length) || b.progress;
      return (ap - bp) * dir;
    }
    if (sortField === 'dueDate') {
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return (ad - bd) * dir;
    }
    if (sortField === 'status') return a.status.localeCompare(b.status) * dir;
    return 0;
  });

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

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="text-left py-3 pr-4 text-xs font-semibold text-secondary-500 dark:text-secondary-400 cursor-pointer select-none hover:text-secondary-700 dark:hover:text-secondary-200 transition-colors"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowsUpDownIcon className={clsx('h-3 w-3', sortField === field ? 'text-primary-500' : 'opacity-40')} />
      </span>
    </th>
  );

  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800/80">
              <th className="w-8 pl-4 pr-1 py-3" />
              <SortHeader field="title">Title</SortHeader>
              <th className="text-left py-3 pr-4 text-xs font-semibold text-secondary-500 dark:text-secondary-400">Tags</th>
              <th className="text-left py-3 pr-4 text-xs font-semibold text-secondary-500 dark:text-secondary-400">Owner</th>
              <SortHeader field="progress">Progress</SortHeader>
              <SortHeader field="status">Status</SortHeader>
              <SortHeader field="dueDate">Due</SortHeader>
              <th className="w-10 py-3 pr-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
            {sorted.map((obj) => (
              <ListRow
                key={obj.id}
                objective={obj}
                keyResults={krByParent.get(obj.id) || []}
                onCheckin={onCheckin}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
