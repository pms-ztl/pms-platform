import { useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from 'react-beautiful-dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FlagIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { goalsApi, type Goal } from '@/lib/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface KanbanColumn {
  id: string;
  label: string;
  color: string;
  borderColor: string;
  bgColor: string;
  headerBg: string;
}

const COLUMNS: KanbanColumn[] = [
  { id: 'DRAFT', label: 'Drafts', color: 'text-secondary-600 dark:text-secondary-300', borderColor: 'border-secondary-300 dark:border-secondary-600', bgColor: 'bg-secondary-50 dark:bg-secondary-900/30', headerBg: 'bg-secondary-200 dark:bg-secondary-700' },
  { id: 'ACTIVE', label: 'In Progress', color: 'text-blue-700 dark:text-blue-300', borderColor: 'border-blue-300 dark:border-blue-700', bgColor: 'bg-blue-50 dark:bg-blue-900/10', headerBg: 'bg-blue-500' },
  { id: 'ON_HOLD', label: 'On Hold', color: 'text-amber-700 dark:text-amber-300', borderColor: 'border-amber-300 dark:border-amber-700', bgColor: 'bg-amber-50 dark:bg-amber-900/10', headerBg: 'bg-amber-500' },
  { id: 'COMPLETED', label: 'Done', color: 'text-green-700 dark:text-green-300', borderColor: 'border-green-300 dark:border-green-700', bgColor: 'bg-green-50 dark:bg-green-900/10', headerBg: 'bg-green-500' },
  { id: 'CANCELLED', label: 'Cancelled', color: 'text-red-700 dark:text-red-300', borderColor: 'border-red-300 dark:border-red-700', bgColor: 'bg-red-50 dark:bg-red-900/10', headerBg: 'bg-red-500' },
];

function progressColor(p: number) {
  if (p >= 70) return 'bg-green-500';
  if (p >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

const priorityDot: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-amber-400',
  LOW: 'bg-green-400',
};

function fmtShortDate(d: string | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Kanban Card
// ---------------------------------------------------------------------------

function KanbanCard({ goal, index }: { goal: Goal; index: number }) {
  const initials = goal.owner
    ? `${goal.owner.firstName?.[0] || ''}${goal.owner.lastName?.[0] || ''}`
    : '?';
  const isObj = goal.type === 'OKR_OBJECTIVE';

  return (
    <Draggable draggableId={goal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={clsx(
            'bg-white dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 p-3 mb-2.5 cursor-grab transition-shadow',
            snapshot.isDragging && 'shadow-lg ring-2 ring-primary-400/40 rotate-1'
          )}
        >
          {/* Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={clsx(
              'px-1.5 py-0.5 rounded text-[8px] font-bold',
              isObj
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
            )}>
              {isObj ? 'OBJ' : 'KR'}
            </span>
            {goal.priority && (
              <span className={clsx('h-2 w-2 rounded-full', priorityDot[goal.priority] || 'bg-secondary-400')} title={goal.priority} />
            )}
            {goal.dueDate && (
              <span className="ml-auto flex items-center gap-0.5 text-[9px] text-secondary-400 dark:text-secondary-500">
                <ClockIcon className="h-3 w-3" />
                {fmtShortDate(goal.dueDate)}
              </span>
            )}
          </div>

          {/* Title */}
          <p className="text-xs font-medium text-secondary-900 dark:text-white mt-1.5 line-clamp-2">
            {goal.title}
          </p>

          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all', progressColor(goal.progress))}
                style={{ width: `${Math.min(goal.progress, 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-secondary-500 dark:text-secondary-400">
              {Math.round(goal.progress)}%
            </span>
          </div>

          {/* Owner + tags */}
          <div className="mt-2 flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-[8px] font-bold shrink-0">
              {initials}
            </span>
            <span className="text-[10px] text-secondary-500 dark:text-secondary-400 truncate">
              {goal.owner?.firstName} {goal.owner?.lastName}
            </span>
            {(goal.tags || []).length > 0 && (
              <span className="ml-auto px-1.5 py-0.5 rounded bg-secondary-100 dark:bg-secondary-700 text-[8px] text-secondary-500 dark:text-secondary-400">
                {(goal.tags || []).length} tags
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ---------------------------------------------------------------------------
// Main Kanban View
// ---------------------------------------------------------------------------

interface OKRKanbanViewProps {
  objectives: Goal[];
  krByParent: Map<string, Goal[]>;
  onCheckin: (krId: string) => void;
}

export function OKRKanbanView({ objectives, krByParent }: OKRKanbanViewProps) {
  const queryClient = useQueryClient();

  // Merge all goals for board display
  const allGoals: Goal[] = [];
  objectives.forEach((obj) => {
    allGoals.push(obj);
    (krByParent.get(obj.id) || []).forEach((kr) => allGoals.push(kr));
  });

  // Group by status
  const goalsByStatus = new Map<string, Goal[]>();
  COLUMNS.forEach((col) => goalsByStatus.set(col.id, []));
  allGoals.forEach((g) => {
    const list = goalsByStatus.get(g.status);
    if (list) list.push(g);
    else {
      const existing = goalsByStatus.get('DRAFT') || [];
      existing.push(g);
      goalsByStatus.set('DRAFT', existing);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      goalsApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['okr-key-results'] });
    },
  });

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    const goal = allGoals.find((g) => g.id === draggableId);
    if (!goal || goal.status === newStatus) return;

    toast.promise(
      updateMutation.mutateAsync({ id: draggableId, status: newStatus }),
      {
        loading: 'Moving...',
        success: `Moved to ${COLUMNS.find((c) => c.id === newStatus)?.label || newStatus}`,
        error: 'Failed to update status',
      }
    );
  }, [allGoals, updateMutation]);

  if (allGoals.length === 0) {
    return (
      <div className="text-center py-16">
        <FlagIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
        <h3 className="mt-3 text-sm font-medium text-secondary-900 dark:text-white">No OKRs found</h3>
        <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
          Create objectives to see them on the Kanban board.
        </p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
        {COLUMNS.map((col) => {
          const items = goalsByStatus.get(col.id) || [];
          return (
            <div key={col.id} className={clsx('w-64 shrink-0 rounded-xl border', col.borderColor, col.bgColor)}>
              {/* Column header */}
              <div className="p-3 flex items-center gap-2">
                <div className={clsx('h-2.5 w-2.5 rounded-full', col.headerBg)} />
                <h3 className={clsx('text-xs font-bold uppercase tracking-wider', col.color)}>{col.label}</h3>
                <span className="ml-auto px-1.5 py-0.5 rounded-full bg-white/60 dark:bg-secondary-700/60 text-[10px] font-semibold text-secondary-600 dark:text-secondary-300">
                  {items.length}
                </span>
              </div>

              {/* Droppable area */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={clsx(
                      'px-2.5 pb-2.5 min-h-[100px] transition-colors rounded-b-xl',
                      snapshot.isDraggingOver && 'bg-primary-50/40 dark:bg-primary-900/10'
                    )}
                  >
                    {items.map((goal, i) => (
                      <KanbanCard key={goal.id} goal={goal} index={i} />
                    ))}
                    {provided.placeholder}

                    {items.length === 0 && !snapshot.isDraggingOver && (
                      <p className="text-[10px] text-secondary-400 text-center py-6 italic">
                        Drop items here
                      </p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
