import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, FunnelIcon, ListBulletIcon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import { goalsApi, usersApi, type Goal, type CreateGoalInput, type User } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { DataTable, type Column, PageHeader } from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';

const statusColors: Record<string, string> = {
  DRAFT: 'badge-secondary',
  ACTIVE: 'badge-primary',
  COMPLETED: 'badge-success',
  CANCELLED: 'badge-danger',
  ON_HOLD: 'badge-warning',
};

const priorityColors: Record<string, string> = {
  LOW: 'text-secondary-500',
  MEDIUM: 'text-warning-600',
  HIGH: 'text-danger-600',
  CRITICAL: 'text-danger-700 font-bold',
};

const typeColors: Record<string, string> = {
  COMPANY: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  DEPARTMENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  TEAM: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  INDIVIDUAL: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-300',
  OKR_OBJECTIVE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  OKR_KEY_RESULT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

const MANAGER_ROLES = ['Super Admin', 'SUPER_ADMIN', 'HR_ADMIN', 'HR Admin', 'MANAGER', 'Manager', 'ADMIN', 'Tenant Admin', 'TENANT_ADMIN'];

function isManagerRole(roles: string[]): boolean {
  return roles.some((r) => MANAGER_ROLES.includes(r));
}

// ── Tree Node Component ─────────────────────────────────────────────────────
function GoalTreeNode({ goal, depth = 0 }: { goal: Goal; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = goal.childGoals && goal.childGoals.length > 0;

  return (
    <div>
      <div
        className={clsx(
          'flex items-center gap-3 px-4 py-3 hover:bg-secondary-50 dark:hover:bg-secondary-700/50 border-b border-secondary-100 dark:border-secondary-700/50',
          depth > 0 && 'border-l-2 border-l-primary-200 dark:border-l-primary-800'
        )}
        style={{ paddingLeft: `${depth * 24 + 16}px` }}
      >
        {/* Expand/collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={clsx('p-0.5 rounded', hasChildren ? 'hover:bg-secondary-200 dark:hover:bg-secondary-600' : 'invisible')}
        >
          {expanded ? (
            <ChevronDownIcon className="h-4 w-4 text-secondary-400" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-secondary-400" />
          )}
        </button>

        {/* Type badge */}
        <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded', typeColors[goal.type] || typeColors.INDIVIDUAL)}>
          {goal.type?.replace('_', ' ')}
        </span>

        {/* Title */}
        <a
          href={`/goals/${goal.id}`}
          className="flex-1 text-sm font-medium text-secondary-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 break-words"
        >
          {goal.title}
        </a>

        {/* Owner */}
        <div className="flex items-center gap-1.5 min-w-[120px]">
          <div className="h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-[10px] font-bold text-primary-700 dark:text-primary-300">
            {goal.owner?.firstName?.[0]}{goal.owner?.lastName?.[0]}
          </div>
          <span className="text-xs text-secondary-500 dark:text-secondary-400 break-words">
            {goal.owner?.firstName} {goal.owner?.lastName}
          </span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="w-16 bg-secondary-200 dark:bg-secondary-700 rounded-full h-1.5">
            <div
              className={clsx('h-1.5 rounded-full', goal.progress >= 100 ? 'bg-success-500' : 'bg-primary-600')}
              style={{ width: `${Math.min(goal.progress, 100)}%` }}
            />
          </div>
          <span className="text-xs text-secondary-600 dark:text-secondary-400 w-8 text-right">{goal.progress}%</span>
        </div>

        {/* Weight */}
        {goal.weight !== undefined && goal.weight !== null && (
          <span className="text-[10px] text-secondary-400 dark:text-secondary-500 min-w-[40px] text-right">
            w:{goal.weight}
          </span>
        )}

        {/* Status */}
        <span className={clsx('text-xs px-2 py-0.5 rounded-full', statusColors[goal.status] || 'badge-secondary')}>
          {goal.status}
        </span>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {goal.childGoals!.map((child) => (
            <GoalTreeNode key={child.id} goal={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Goal Table Columns ──────────────────────────────────────────────────────
const goalColumns: Column<Goal>[] = [
  {
    key: 'title',
    header: 'Goal',
    sortable: true,
    render: (goal) => (
      <div className="flex items-center gap-2">
        <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded', typeColors[goal.type] || typeColors.INDIVIDUAL)}>
          {goal.type?.replace('_', ' ')}
        </span>
        <div>
          <a href={`/goals/${goal.id}`} className="text-sm font-medium text-secondary-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400">
            {goal.title}
          </a>
          {goal.parentGoal && (
            <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-0.5">↳ {goal.parentGoal.title}</p>
          )}
        </div>
      </div>
    ),
  },
  {
    key: 'owner',
    header: 'Owner',
    render: (goal) => (
      <div className="flex items-center gap-1.5">
        <div className="h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-[10px] font-bold text-primary-700 dark:text-primary-300">
          {goal.owner?.firstName?.[0]}{goal.owner?.lastName?.[0]}
        </div>
        <span className="text-xs text-secondary-600 dark:text-secondary-400">
          {goal.owner?.firstName} {goal.owner?.lastName}
        </span>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: (goal) => (
      <span className={statusColors[goal.status] || 'badge-secondary'}>{goal.status}</span>
    ),
  },
  {
    key: 'priority',
    header: 'Priority',
    sortable: true,
    render: (goal) => (
      <span className={clsx('text-sm', priorityColors[goal.priority])}>{goal.priority}</span>
    ),
  },
  {
    key: 'progress',
    header: 'Progress',
    sortable: true,
    render: (goal) => (
      <div className="flex items-center">
        <div className="w-24 bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
          <div
            className={clsx('h-2 rounded-full', goal.progress >= 100 ? 'bg-success-500' : 'bg-primary-600')}
            style={{ width: `${Math.min(goal.progress, 100)}%` }}
          />
        </div>
        <span className="ml-2 text-sm text-secondary-600 dark:text-secondary-400">{goal.progress}%</span>
      </div>
    ),
  },
  {
    key: 'dueDate',
    header: 'Due Date',
    sortable: true,
    render: (goal) => (
      <span className="text-sm text-secondary-500 dark:text-secondary-400">
        {goal.dueDate ? new Date(goal.dueDate).toLocaleDateString() : '-'}
      </span>
    ),
  },
  {
    key: 'actions',
    header: '',
    className: 'text-right',
    render: (goal) => (
      <a href={`/goals/${goal.id}`} className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium">
        View
      </a>
    ),
  },
];

// ── Main GoalsPage ──────────────────────────────────────────────────────────
export function GoalsPage() {
  usePageTitle('Goals');
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const userRoles = user?.roles ?? [];
  const isManager = isManagerRole(userRoles);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');

  // List view query
  const { data, isLoading } = useQuery({
    queryKey: ['goals', { page, status: statusFilter }],
    queryFn: () => goalsApi.list({ page, limit: 10, status: statusFilter || undefined }),
    enabled: viewMode === 'list',
  });

  // Tree view query
  const { data: treeData, isLoading: treeLoading } = useQuery({
    queryKey: ['goals-tree', isManager ? 'team' : 'all'],
    queryFn: () => (isManager ? goalsApi.getTeamTree() : goalsApi.getTree()),
    enabled: viewMode === 'tree',
  });

  // Parent goals for selector (all goals user can see)
  const { data: parentGoals } = useQuery({
    queryKey: ['goals-for-parent-selector'],
    queryFn: () => goalsApi.list({ limit: 100 }),
    enabled: showCreateModal,
    select: (d) => d.data,
  });

  // Direct reports for assignee selector
  const { data: myReports } = useQuery({
    queryKey: ['my-reports'],
    queryFn: () => usersApi.getMyReports(),
    enabled: showCreateModal && isManager,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateGoalInput) => goalsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-tree'] });
      setShowCreateModal(false);
      toast.success('Goal created successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create goal');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Goals" subtitle="Track and manage your goals and OKRs">
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Goal
        </button>
      </PageHeader>

      {/* Filters + View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-secondary-400 dark:text-secondary-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input py-1.5 w-40"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={clsx(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              viewMode === 'list'
                ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
                : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300'
            )}
          >
            <ListBulletIcon className="h-4 w-4 inline mr-1" />
            List
          </button>
          <button
            onClick={() => setViewMode('tree')}
            className={clsx(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              viewMode === 'tree'
                ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
                : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300'
            )}
          >
            <svg className="h-4 w-4 inline mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 4h4v2H3V4zm6 0h8v2H9V4zM5 9h4v2H5V9zm6 0h6v2h-6V9zM7 14h4v2H7v-2zm6 0h4v2h-4v-2z" />
            </svg>
            Tree
          </button>
        </div>
      </div>

      {/* ── List View ── */}
      {viewMode === 'list' && (
        <DataTable<Goal>
          columns={goalColumns}
          data={data?.data ?? []}
          isLoading={isLoading}
          keyExtractor={(goal) => goal.id}
          emptyTitle="No goals found"
          emptyDescription="Get started by creating a new goal."
          emptyIcon={<FunnelIcon className="h-12 w-12" />}
          emptyAction={{ label: 'Create Goal', onClick: () => setShowCreateModal(true) }}
          pagination={data?.meta ? {
            page,
            pageSize: data.meta.limit,
            total: data.meta.total,
            onPageChange: setPage,
          } : undefined}
        />
      )}

      {/* ── Tree View ── */}
      {viewMode === 'tree' && (
        <>
          {treeLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
            </div>
          ) : !treeData || treeData.length === 0 ? (
            <div className="text-center py-12 card card-body dark:bg-secondary-800">
              <svg className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM7 14h7v7H7v-7z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">No goal hierarchy found</h3>
              <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                Create goals with parent-child relationships to see the tree view.
              </p>
            </div>
          ) : (
            <div className="card overflow-hidden dark:bg-secondary-800 dark:border-secondary-700">
              <div className="px-4 py-3 bg-secondary-50 dark:bg-secondary-900 border-b border-secondary-200 dark:border-secondary-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                    {isManager ? 'Team Goal Hierarchy' : 'Goal Hierarchy'}
                  </h3>
                  <span className="text-xs text-secondary-400 dark:text-secondary-500">
                    {treeData.length} top-level goal{treeData.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div>
                {treeData.map((goal) => (
                  <GoalTreeNode key={goal.id} goal={goal} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Enhanced Create Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30 dark:bg-black/50" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-white dark:bg-secondary-800 rounded-xl shadow-xl max-w-lg w-full p-6 border border-transparent dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Create New Goal</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const input: CreateGoalInput = {
                    title: formData.get('title') as string,
                    description: (formData.get('description') as string) || undefined,
                    type: formData.get('type') as string,
                    priority: formData.get('priority') as string,
                    dueDate: (formData.get('dueDate') as string) || undefined,
                    weight: Number(formData.get('weight')) || undefined,
                  };
                  // Parent goal
                  const parentGoalId = formData.get('parentGoalId') as string;
                  if (parentGoalId) input.parentGoalId = parentGoalId;
                  // Assignee
                  const ownerId = formData.get('ownerId') as string;
                  if (ownerId) input.ownerId = ownerId;

                  createMutation.mutate(input);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="label dark:text-secondary-300">Title</label>
                  <input name="title" type="text" required className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white dark:placeholder-secondary-400" placeholder="Enter goal title" />
                </div>
                <div>
                  <label className="label dark:text-secondary-300">Description</label>
                  <textarea name="description" rows={3} className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white dark:placeholder-secondary-400" placeholder="Describe your goal" />
                </div>

                {/* Parent Goal Selector */}
                <div>
                  <label className="label dark:text-secondary-300">Parent Goal (optional)</label>
                  <select name="parentGoalId" className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white">
                    <option value="">None (top-level goal)</option>
                    {parentGoals?.map((g) => (
                      <option key={g.id} value={g.id}>
                        [{g.type?.replace('_', ' ')}] {g.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                    Link this goal as a child of an existing goal to create a cascade
                  </p>
                </div>

                {/* Assign To (Manager/Admin only) */}
                {isManager && (
                  <div>
                    <label className="label dark:text-secondary-300">Assign To</label>
                    <select name="ownerId" className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white">
                      <option value="">Myself</option>
                      {myReports?.map((report: User) => (
                        <option key={report.id} value={report.id}>
                          {report.firstName} {report.lastName} {report.jobTitle ? `— ${report.jobTitle}` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                      Assign this goal to a direct report (cascading)
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label dark:text-secondary-300">Goal Type</label>
                    <select name="type" className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white">
                      <option value="INDIVIDUAL">Individual</option>
                      <option value="TEAM">Team</option>
                      <option value="DEPARTMENT">Department</option>
                      <option value="COMPANY">Company</option>
                      <option value="OKR_OBJECTIVE">OKR Objective</option>
                      <option value="OKR_KEY_RESULT">Key Result</option>
                    </select>
                  </div>
                  <div>
                    <label className="label dark:text-secondary-300">Priority</label>
                    <select name="priority" className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white">
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label dark:text-secondary-300">Due Date</label>
                    <input name="dueDate" type="date" className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white" />
                  </div>
                  <div>
                    <label className="label dark:text-secondary-300">Weight (0-10)</label>
                    <input
                      name="weight"
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      defaultValue="5"
                      className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                      placeholder="e.g., 5"
                    />
                    <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                      Weight for contribution to parent goal (0-10)
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                    {createMutation.isPending ? 'Creating...' : 'Create Goal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
