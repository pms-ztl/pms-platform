import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { goalsApi, type Goal } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getMilestones(goal: Goal): Milestone[] {
  const meta = goal.metadata as Record<string, any> | null;
  if (!meta || !Array.isArray(meta.milestones)) return [];
  return meta.milestones;
}

function fmtShortDate(d: string | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Milestone Item
// ---------------------------------------------------------------------------

function MilestoneItem({
  milestone,
  onToggle,
  onDelete,
}: {
  milestone: Milestone;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isOverdue =
    milestone.dueDate && !milestone.completed && new Date(milestone.dueDate) < new Date();

  return (
    <div className="group flex items-center gap-2.5 py-1.5">
      <button onClick={onToggle} className="shrink-0">
        {milestone.completed ? (
          <CheckCircleSolidIcon className="h-5 w-5 text-green-500" />
        ) : (
          <CheckCircleIcon className="h-5 w-5 text-secondary-300 dark:text-secondary-600 hover:text-green-400 transition-colors" />
        )}
      </button>
      <span
        className={clsx(
          'text-xs flex-1',
          milestone.completed
            ? 'text-secondary-400 line-through'
            : 'text-secondary-900 dark:text-white'
        )}
      >
        {milestone.title}
      </span>
      {milestone.dueDate && (
        <span
          className={clsx(
            'flex items-center gap-0.5 text-3xs shrink-0',
            isOverdue
              ? 'text-red-500 font-semibold'
              : 'text-secondary-400 dark:text-secondary-500'
          )}
        >
          <CalendarDaysIcon className="h-3 w-3" />
          {fmtShortDate(milestone.dueDate)}
        </span>
      )}
      <button
        onClick={onDelete}
        className="shrink-0 p-0.5 rounded text-secondary-300 dark:text-secondary-600 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
      >
        <TrashIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Milestone Inline
// ---------------------------------------------------------------------------

function AddMilestone({ onAdd }: { onAdd: (title: string, dueDate?: string) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');

  const submit = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), dueDate || undefined);
    setTitle('');
    setDueDate('');
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors mt-1"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Add milestone
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Milestone title..."
        className="flex-1 text-xs rounded-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white px-2 py-1 focus:ring-1 focus:ring-primary-500 focus:outline-none"
      />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="text-2xs rounded-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white px-2 py-1 focus:ring-1 focus:ring-primary-500 focus:outline-none w-28"
      />
      <button
        onClick={submit}
        className="px-2 py-1 text-2xs font-medium rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors"
      >
        Add
      </button>
      <button
        onClick={() => { setIsAdding(false); setTitle(''); setDueDate(''); }}
        className="text-2xs text-secondary-400 hover:text-secondary-600 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface OKRMilestonesProps {
  goal: Goal;
}

export function OKRMilestones({ goal }: OKRMilestonesProps) {
  const queryClient = useQueryClient();
  const milestones = getMilestones(goal);

  const completed = milestones.filter((m) => m.completed).length;
  const total = milestones.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const updateMutation = useMutation({
    mutationFn: (newMilestones: Milestone[]) => {
      const meta = (goal.metadata as Record<string, any>) || {};
      return goalsApi.update(goal.id, {
        metadata: { ...meta, milestones: newMilestones },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['okr-key-results'] });
    },
    onError: () => toast.error('Failed to update milestones'),
  });

  const handleToggle = useCallback(
    (id: string) => {
      const updated = milestones.map((m) =>
        m.id === id ? { ...m, completed: !m.completed } : m
      );
      updateMutation.mutate(updated);
    },
    [milestones, updateMutation]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const updated = milestones.filter((m) => m.id !== id);
      updateMutation.mutate(updated);
    },
    [milestones, updateMutation]
  );

  const handleAdd = useCallback(
    (title: string, dueDate?: string) => {
      const newMilestone: Milestone = {
        id: generateId(),
        title,
        completed: false,
        dueDate,
      };
      updateMutation.mutate([...milestones, newMilestone]);
      toast.success('Milestone added');
    },
    [milestones, updateMutation]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-2xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider">
          Milestones
        </h4>
        {total > 0 && (
          <span className="text-2xs font-semibold text-secondary-500 dark:text-secondary-400">
            {completed}/{total} ({pct}%)
          </span>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden mb-2.5">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-300',
              pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-blue-500'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Milestone list */}
      <div>
        {milestones.map((m) => (
          <MilestoneItem
            key={m.id}
            milestone={m}
            onToggle={() => handleToggle(m.id)}
            onDelete={() => handleDelete(m.id)}
          />
        ))}
      </div>

      <AddMilestone onAdd={handleAdd} />
    </div>
  );
}
