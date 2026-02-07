import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  ChatBubbleLeftIcon,
  LinkIcon,
  CalendarIcon,
  UserIcon,
  FlagIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

import { goalsApi, type Goal, type UpdateGoalInput } from '@/lib/api';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-300',
  ACTIVE: 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300',
  COMPLETED: 'bg-success-100 text-success-800 dark:bg-success-900/50 dark:text-success-300',
  CANCELLED: 'bg-danger-100 text-danger-800 dark:bg-danger-900/50 dark:text-danger-300',
  ON_HOLD: 'bg-warning-100 text-warning-800 dark:bg-warning-900/50 dark:text-warning-300',
};

const priorityColors: Record<string, string> = {
  LOW: 'text-secondary-500 dark:text-secondary-400',
  MEDIUM: 'text-warning-600 dark:text-warning-400',
  HIGH: 'text-danger-600 dark:text-danger-400',
  CRITICAL: 'text-danger-700 dark:text-danger-400 font-bold',
};

export function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: goal, isLoading, error } = useQuery({
    queryKey: ['goal', id],
    queryFn: () => goalsApi.getById(id!),
    enabled: !!id,
  });

  const { data: progressHistory } = useQuery({
    queryKey: ['goal', id, 'progress'],
    queryFn: () => goalsApi.getProgressHistory(id!),
    enabled: !!id,
  });

  const { data: comments } = useQuery({
    queryKey: ['goal', id, 'comments'],
    queryFn: () => goalsApi.getComments(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateGoalInput) => goalsApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', id] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setShowEditModal(false);
      toast.success('Goal updated successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update goal');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => goalsApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal deleted successfully');
      navigate('/goals');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete goal');
    },
  });

  const progressMutation = useMutation({
    mutationFn: ({ progress, note }: { progress: number; note?: string }) =>
      goalsApi.updateProgress(id!, progress, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', id] });
      queryClient.invalidateQueries({ queryKey: ['goal', id, 'progress'] });
      setShowProgressModal(false);
      toast.success('Progress updated');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update progress');
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => goalsApi.addComment(id!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', id, 'comments'] });
      setShowCommentModal(false);
      toast.success('Comment added');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add comment');
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white">Goal not found</h3>
        <p className="mt-1 text-secondary-500 dark:text-secondary-400">The goal you're looking for doesn't exist.</p>
        <Link to="/goals" className="btn-primary mt-4 inline-block">
          Back to Goals
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            to="/goals"
            className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 dark:text-secondary-400"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">{goal.title}</h1>
              <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium', statusColors[goal.status])}>
                {goal.status}
              </span>
            </div>
            {goal.description && (
              <p className="mt-2 text-secondary-600 dark:text-secondary-400 max-w-2xl">{goal.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowProgressModal(true)} className="btn-secondary">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Update Progress
          </button>
          <button onClick={() => setShowEditModal(true)} className="btn-secondary">
            <PencilIcon className="h-5 w-5 mr-2" />
            Edit
          </button>
          <button onClick={() => setShowDeleteModal(true)} className="btn-danger">
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress card */}
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Progress</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-4">
                  <div
                    className={clsx(
                      'h-4 rounded-full transition-all duration-300',
                      goal.progress >= 100 ? 'bg-success-500' : 'bg-primary-600'
                    )}
                    style={{ width: `${Math.min(goal.progress, 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-2xl font-bold text-secondary-900 dark:text-white">{goal.progress}%</span>
            </div>
            {goal.targetValue && (
              <div className="mt-4 flex items-center gap-4 text-sm text-secondary-600 dark:text-secondary-400">
                <span>Current: {goal.currentValue || 0} {goal.unit}</span>
                <span>Target: {goal.targetValue} {goal.unit}</span>
              </div>
            )}
          </div>

          {/* Progress history */}
          {progressHistory && progressHistory.length > 0 && (
            <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Progress History</h3>
              <div className="space-y-4">
                {progressHistory.map((entry: any, index: number) => (
                  <div key={index} className="flex items-start gap-4 pb-4 border-b border-secondary-100 dark:border-secondary-700 last:border-0 last:pb-0">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-700 dark:text-primary-300">{entry.progress}%</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-secondary-900 dark:text-white">{entry.note || 'Progress updated'}</p>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                        {format(new Date(entry.createdAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments section */}
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-white">Comments</h3>
              <button onClick={() => setShowCommentModal(true)} className="btn-secondary text-sm">
                <ChatBubbleLeftIcon className="h-4 w-4 mr-2" />
                Add Comment
              </button>
            </div>
            {comments && comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary-200 dark:bg-secondary-700 flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-secondary-600 dark:text-secondary-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-secondary-900 dark:text-white">
                          {comment.user?.firstName} {comment.user?.lastName}
                        </span>
                        <span className="text-xs text-secondary-500 dark:text-secondary-400">
                          {format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-secondary-600 dark:text-secondary-300 mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-secondary-500 dark:text-secondary-400">No comments yet.</p>
            )}
          </div>
        </div>

        {/* Right column - Metadata */}
        <div className="space-y-6">
          {/* Goal details */}
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Details</h3>
            <dl className="space-y-4">
              <div className="flex items-center gap-3">
                <FlagIcon className="h-5 w-5 text-secondary-400 dark:text-secondary-500" />
                <div>
                  <dt className="text-xs text-secondary-500 dark:text-secondary-400">Priority</dt>
                  <dd className={clsx('text-sm font-medium', priorityColors[goal.priority])}>
                    {goal.priority}
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-secondary-400 dark:text-secondary-500" />
                <div>
                  <dt className="text-xs text-secondary-500 dark:text-secondary-400">Due Date</dt>
                  <dd className="text-sm text-secondary-900 dark:text-white">
                    {goal.dueDate ? format(new Date(goal.dueDate), 'MMM d, yyyy') : 'Not set'}
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <UserIcon className="h-5 w-5 text-secondary-400 dark:text-secondary-500" />
                <div>
                  <dt className="text-xs text-secondary-500 dark:text-secondary-400">Owner</dt>
                  <dd className="text-sm text-secondary-900 dark:text-white">
                    {goal.owner?.firstName} {goal.owner?.lastName}
                  </dd>
                </div>
              </div>
              {goal.parentGoal && (
                <div className="flex items-center gap-3">
                  <LinkIcon className="h-5 w-5 text-secondary-400 dark:text-secondary-500" />
                  <div>
                    <dt className="text-xs text-secondary-500 dark:text-secondary-400">Parent Goal</dt>
                    <dd>
                      <Link
                        to={`/goals/${goal.parentGoal.id}`}
                        className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        {goal.parentGoal.title}
                      </Link>
                    </dd>
                  </div>
                </div>
              )}
            </dl>
          </div>

          {/* Aligned goals */}
          {goal.childGoals && goal.childGoals.length > 0 && (
            <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Child Goals</h3>
              <div className="space-y-3">
                {goal.childGoals.map((child) => (
                  <Link
                    key={child.id}
                    to={`/goals/${child.id}`}
                    className="block p-3 rounded-lg border border-secondary-200 dark:border-secondary-600 hover:border-primary-300 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-secondary-900 dark:text-white">{child.title}</span>
                      <span className="text-xs text-secondary-500 dark:text-secondary-400">{child.progress}%</span>
                    </div>
                    <div className="mt-2 w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-primary-500"
                        style={{ width: `${Math.min(child.progress, 100)}%` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30 dark:bg-black/50" onClick={() => setShowEditModal(false)} />
            <div className="relative bg-white dark:bg-secondary-800 rounded-xl shadow-xl max-w-lg w-full p-6 border border-transparent dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Edit Goal</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  updateMutation.mutate({
                    title: formData.get('title') as string,
                    description: formData.get('description') as string,
                    priority: formData.get('priority') as string,
                    status: formData.get('status') as string,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="label dark:text-secondary-300">Title</label>
                  <input
                    name="title"
                    type="text"
                    defaultValue={goal.title}
                    required
                    className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="label dark:text-secondary-300">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={goal.description || ''}
                    className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label dark:text-secondary-300">Status</label>
                    <select name="status" defaultValue={goal.status} className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white">
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Active</option>
                      <option value="ON_HOLD">On Hold</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="label dark:text-secondary-300">Priority</label>
                    <select name="priority" defaultValue={goal.priority} className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white">
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30 dark:bg-black/50" onClick={() => setShowProgressModal(false)} />
            <div className="relative bg-white dark:bg-secondary-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-transparent dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Update Progress</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  progressMutation.mutate({
                    progress: Number(formData.get('progress')),
                    note: formData.get('note') as string,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="label dark:text-secondary-300">Progress (%)</label>
                  <input
                    name="progress"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={goal.progress}
                    required
                    className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="label dark:text-secondary-300">Note (optional)</label>
                  <textarea
                    name="note"
                    rows={2}
                    className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white dark:placeholder-secondary-400"
                    placeholder="What progress did you make?"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowProgressModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={progressMutation.isPending} className="btn-primary">
                    {progressMutation.isPending ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30 dark:bg-black/50" onClick={() => setShowCommentModal(false)} />
            <div className="relative bg-white dark:bg-secondary-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-transparent dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Add Comment</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  addCommentMutation.mutate(formData.get('content') as string);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="label dark:text-secondary-300">Comment</label>
                  <textarea
                    name="content"
                    rows={3}
                    required
                    className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white dark:placeholder-secondary-400"
                    placeholder="Write your comment..."
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowCommentModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={addCommentMutation.isPending} className="btn-primary">
                    {addCommentMutation.isPending ? 'Adding...' : 'Add Comment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30 dark:bg-black/50" onClick={() => setShowDeleteModal(false)} />
            <div className="relative bg-white dark:bg-secondary-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-transparent dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">Delete Goal</h2>
              <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                Are you sure you want to delete "{goal.title}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="btn-danger"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
