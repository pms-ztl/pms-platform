import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, FunnelIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import { goalsApi, type Goal, type CreateGoalInput } from '@/lib/api';

const statusColors = {
  DRAFT: 'badge-secondary',
  ACTIVE: 'badge-primary',
  COMPLETED: 'badge-success',
  CANCELLED: 'badge-danger',
  ON_HOLD: 'badge-warning',
};

const priorityColors = {
  LOW: 'text-secondary-500',
  MEDIUM: 'text-warning-600',
  HIGH: 'text-danger-600',
  CRITICAL: 'text-danger-700 font-bold',
};

export function GoalsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['goals', { page, status: statusFilter }],
    queryFn: () => goalsApi.list({ page, limit: 10, status: statusFilter || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateGoalInput) => goalsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Goals</h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">
            Track and manage your goals and OKRs
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Goal
        </button>
      </div>

      {/* Filters */}
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

      {/* Goals list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
        </div>
      ) : data?.data.length === 0 ? (
        <div className="text-center py-12 card card-body dark:bg-secondary-800">
          <FunnelIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
          <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">No goals found</h3>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Get started by creating a new goal.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Goal
            </button>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden dark:bg-secondary-800 dark:border-secondary-700">
          <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
            <thead className="bg-secondary-50 dark:bg-secondary-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                  Goal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
              {data?.data.map((goal) => (
                <tr key={goal.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                  <td className="px-6 py-4">
                    <div>
                      <a
                        href={`/goals/${goal.id}`}
                        className="text-sm font-medium text-secondary-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        {goal.title}
                      </a>
                      {goal.description && (
                        <p className="text-sm text-secondary-500 dark:text-secondary-400 truncate max-w-md">
                          {goal.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={statusColors[goal.status as keyof typeof statusColors] || 'badge-secondary'}>
                      {goal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={clsx('text-sm', priorityColors[goal.priority as keyof typeof priorityColors])}>
                      {goal.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-24 bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                        <div
                          className={clsx(
                            'h-2 rounded-full',
                            goal.progress >= 100 ? 'bg-success-500' : 'bg-primary-600'
                          )}
                          style={{ width: `${Math.min(goal.progress, 100)}%` }}
                        />
                      </div>
                      <span className="ml-2 text-sm text-secondary-600 dark:text-secondary-400">
                        {goal.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 dark:text-secondary-400">
                    {goal.dueDate ? new Date(goal.dueDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a
                      href={`/goals/${goal.id}`}
                      className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {data && data.meta.totalPages > 1 && (
            <div className="px-6 py-3 border-t border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
              <div className="text-sm text-secondary-500 dark:text-secondary-400">
                Showing {(page - 1) * data.meta.limit + 1} to{' '}
                {Math.min(page * data.meta.limit, data.meta.total)} of {data.meta.total} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!data.meta.hasPreviousPage}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data.meta.hasNextPage}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal (simplified) */}
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
                  createMutation.mutate({
                    title: formData.get('title') as string,
                    description: formData.get('description') as string,
                    type: formData.get('type') as string,
                    priority: formData.get('priority') as string,
                    dueDate: formData.get('dueDate') as string,
                  });
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
                    <label className="label dark:text-secondary-300">Weightage (%)</label>
                    <input
                      name="weightage"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue="20"
                      className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                      placeholder="e.g., 20"
                    />
                    <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                      Goal weightage for performance calculation
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
