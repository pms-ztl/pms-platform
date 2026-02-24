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
  PlusIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

import { goalsApi, usersApi, performanceMathApi, type Goal, type UpdateGoalInput, type CreateGoalInput, type User, type GoalMappingResult } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

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

const typeColors: Record<string, string> = {
  COMPANY: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  DEPARTMENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  TEAM: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  INDIVIDUAL: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-300',
  OKR_OBJECTIVE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  OKR_KEY_RESULT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

const MANAGER_ROLES = ['Super Admin', 'SUPER_ADMIN', 'HR_ADMIN', 'HR Admin', 'MANAGER', 'Manager', 'ADMIN', 'Tenant Admin', 'TENANT_ADMIN'];

export function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const userRoles = user?.roles ?? [];
  const isManager = userRoles.some((r) => MANAGER_ROLES.includes(r));

  const [showEditModal, setShowEditModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSubGoalModal, setShowSubGoalModal] = useState(false);

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

  // Contribution mapping (only when goal has child goals)
  const hasChildren = goal?.childGoals && goal.childGoals.length > 0;
  const { data: contributionData } = useQuery({
    queryKey: ['goal-mapping', id],
    queryFn: () => performanceMathApi.getGoalMapping(id!),
    enabled: !!id && !!hasChildren,
  });

  // Direct reports for sub-goal assignee selector
  const { data: myReports } = useQuery({
    queryKey: ['my-reports'],
    queryFn: () => usersApi.getMyReports(),
    enabled: showSubGoalModal && isManager,
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
      queryClient.invalidateQueries({ queryKey: ['goal-mapping', id] });
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

  const createSubGoalMutation = useMutation({
    mutationFn: (data: CreateGoalInput) => goalsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', id] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals-tree'] });
      setShowSubGoalModal(false);
      toast.success('Sub-goal assigned successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create sub-goal');
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
              <span className={clsx('text-2xs font-semibold px-1.5 py-0.5 rounded', typeColors[goal.type] || typeColors.INDIVIDUAL)}>
                {goal.type?.replace('_', ' ')}
              </span>
              <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">{goal.title}</h1>
              <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium', statusColors[goal.status])}>
                {goal.status}
              </span>
            </div>
            {goal.description && (
              <p className="mt-2 text-secondary-600 dark:text-secondary-400 max-w-2xl">{goal.description}</p>
            )}
            {/* Show who created the goal if different from owner */}
            {goal.createdBy && goal.createdBy.id !== goal.owner?.id && (
              <p className="mt-1 text-xs text-secondary-400 dark:text-secondary-500">
                Assigned by {goal.createdBy.firstName} {goal.createdBy.lastName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isManager && (
            <button onClick={() => setShowSubGoalModal(true)} className="btn-primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              Assign Sub-Goal
            </button>
          )}
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

          {/* ── Contribution Breakdown (when goal has children) ── */}
          {hasChildren && (
            <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Contribution Breakdown</h3>

              {/* Summary scores from math engine */}
              {contributionData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <div className="text-center p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                    <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                      {((contributionData.compositeScore ?? 0) * 100).toFixed(0)}%
                    </p>
                    <p className="text-2xs text-primary-600 dark:text-primary-400 font-medium mt-0.5">Composite Score</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-success-50 dark:bg-success-900/20">
                    <p className="text-2xl font-bold text-success-700 dark:text-success-300">
                      {((contributionData.completionScore ?? 0) * 100).toFixed(0)}%
                    </p>
                    <p className="text-2xs text-success-600 dark:text-success-400 font-medium mt-0.5">Completion</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                      {((contributionData.qualityAdjustedScore ?? 0) * 100).toFixed(0)}%
                    </p>
                    <p className="text-2xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">Quality-Adj.</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {((contributionData.efficiency ?? 0) * 100).toFixed(0)}%
                    </p>
                    <p className="text-2xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">Efficiency</p>
                  </div>
                </div>
              )}

              {/* Per-child contribution */}
              <div className="space-y-3">
                {contributionData?.childGoals && contributionData.childGoals.length > 0 ? (
                  contributionData.childGoals.map((child) => (
                    <div key={child.goalId} className="p-3 rounded-lg border border-secondary-200 dark:border-secondary-600">
                      <div className="flex items-center justify-between mb-2">
                        <Link
                          to={`/goals/${child.goalId}`}
                          className="text-sm font-medium text-secondary-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                        >
                          {child.title}
                        </Link>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-secondary-500 dark:text-secondary-400">
                            Weight: {child.weight}
                          </span>
                          <span className={clsx(
                            'font-semibold px-2 py-0.5 rounded-full',
                            child.weightedContribution > 0.2
                              ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300'
                              : child.weightedContribution > 0.1
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400'
                          )}>
                            {((child.weightedContribution ?? 0) * 100).toFixed(1)}% contribution
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                          <div
                            className={clsx('h-2 rounded-full', child.progress >= 100 ? 'bg-success-500' : 'bg-primary-600')}
                            style={{ width: `${Math.min(child.progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-secondary-600 dark:text-secondary-400 w-10 text-right">{child.progress}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  // Fallback to simple child goals list if math data not available
                  goal.childGoals?.map((child) => (
                    <Link
                      key={child.id}
                      to={`/goals/${child.id}`}
                      className="block p-3 rounded-lg border border-secondary-200 dark:border-secondary-600 hover:border-primary-300 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-secondary-900 dark:text-white">{child.title}</span>
                          <span className="text-xs text-secondary-400">
                            {child.owner?.firstName} {child.owner?.lastName}
                          </span>
                        </div>
                        <span className="text-xs text-secondary-500 dark:text-secondary-400">{child.progress}%</span>
                      </div>
                      <div className="mt-2 w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-primary-500"
                          style={{ width: `${Math.min(child.progress, 100)}%` }}
                        />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}

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
                  <dd className="text-sm text-secondary-900 dark:text-white flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-2xs font-bold text-primary-700 dark:text-primary-300">
                      {goal.owner?.firstName?.[0]}{goal.owner?.lastName?.[0]}
                    </div>
                    {goal.owner?.firstName} {goal.owner?.lastName}
                  </dd>
                </div>
              </div>
              {goal.weight !== undefined && goal.weight !== null && (
                <div className="flex items-center gap-3">
                  <ChartBarIcon className="h-5 w-5 text-secondary-400 dark:text-secondary-500" />
                  <div>
                    <dt className="text-xs text-secondary-500 dark:text-secondary-400">Weight</dt>
                    <dd className="text-sm text-secondary-900 dark:text-white">{goal.weight} / 10</dd>
                  </div>
                </div>
              )}
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

          {/* SMART Goal Indicator */}
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-3">SMART Score</h3>
            <div className="space-y-2">
              {(() => {
                const criteria = [
                  { letter: 'S', label: 'Specific', met: !!(goal.description && goal.description.length > 20) },
                  { letter: 'M', label: 'Measurable', met: !!(goal.targetValue && goal.unit) },
                  { letter: 'A', label: 'Achievable', met: !!(goal.weight && goal.weight > 0) },
                  { letter: 'R', label: 'Relevant', met: !!(goal.parentGoal) },
                  { letter: 'T', label: 'Time-bound', met: !!(goal.startDate && goal.dueDate) },
                ];
                const metCount = criteria.filter(c => c.met).length;
                return (
                  <>
                    <div className="flex items-center justify-center gap-1.5 mb-3">
                      {criteria.map(c => (
                        <div
                          key={c.letter}
                          className={clsx(
                            'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                            c.met
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                              : 'bg-secondary-100 text-secondary-400 dark:bg-secondary-700 dark:text-secondary-500'
                          )}
                          title={`${c.label}: ${c.met ? 'Met' : 'Not met'}`}
                        >
                          {c.letter}
                        </div>
                      ))}
                    </div>
                    <p className="text-center text-sm font-medium text-secondary-700 dark:text-secondary-300">
                      {metCount}/5 criteria met
                    </p>
                    <div className="space-y-1.5 mt-3">
                      {criteria.map(c => (
                        <div key={c.letter} className="flex items-center gap-2 text-xs">
                          {c.met ? (
                            <svg className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="h-3.5 w-3.5 text-secondary-300 dark:text-secondary-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className={clsx(
                            c.met ? 'text-secondary-700 dark:text-secondary-300' : 'text-secondary-400 dark:text-secondary-500'
                          )}>
                            <strong>{c.letter}</strong> — {c.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Child Goals (simple list for sidebar, detailed view in main area) */}
          {!hasChildren && (
            <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Sub-Goals</h3>
                {isManager && (
                  <button onClick={() => setShowSubGoalModal(true)} className="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400">
                    + Assign
                  </button>
                )}
              </div>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">No sub-goals yet.</p>
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

      {/* ── Assign Sub-Goal Modal ── */}
      {showSubGoalModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30 dark:bg-black/50" onClick={() => setShowSubGoalModal(false)} />
            <div className="relative bg-white dark:bg-secondary-800 rounded-xl shadow-xl max-w-lg w-full p-6 border border-transparent dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-1">Assign Sub-Goal</h2>
              <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
                Create a cascading sub-goal under "{goal.title}"
              </p>
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
                    parentGoalId: id,  // locked to current goal
                  };
                  const ownerId = formData.get('ownerId') as string;
                  if (ownerId) input.ownerId = ownerId;
                  createSubGoalMutation.mutate(input);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="label dark:text-secondary-300">Sub-Goal Title</label>
                  <input name="title" type="text" required className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white dark:placeholder-secondary-400" placeholder="e.g., Engineering Delivery Target" />
                </div>
                <div>
                  <label className="label dark:text-secondary-300">Description</label>
                  <textarea name="description" rows={2} className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white dark:placeholder-secondary-400" placeholder="Describe this sub-goal" />
                </div>

                {/* Assignee */}
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
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label dark:text-secondary-300">Type</label>
                    <select name="type" className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white text-sm">
                      <option value="INDIVIDUAL">Individual</option>
                      <option value="TEAM">Team</option>
                      <option value="DEPARTMENT">Department</option>
                      <option value="OKR_KEY_RESULT">Key Result</option>
                    </select>
                  </div>
                  <div>
                    <label className="label dark:text-secondary-300">Priority</label>
                    <select name="priority" className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white text-sm">
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="label dark:text-secondary-300">Weight</label>
                    <input name="weight" type="number" min="0" max="10" step="0.5" defaultValue="5" className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white text-sm" />
                  </div>
                </div>

                <div>
                  <label className="label dark:text-secondary-300">Due Date</label>
                  <input
                    name="dueDate"
                    type="date"
                    defaultValue={goal.dueDate ? goal.dueDate.substring(0, 10) : ''}
                    className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                  />
                </div>

                <div className="bg-secondary-50 dark:bg-secondary-900/50 rounded-lg p-3 text-xs text-secondary-600 dark:text-secondary-400">
                  <strong>Parent:</strong> {goal.title} &middot; <strong>Progress cascading:</strong> This sub-goal's progress will automatically roll up to the parent using weighted averages.
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowSubGoalModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={createSubGoalMutation.isPending} className="btn-primary">
                    {createSubGoalMutation.isPending ? 'Assigning...' : 'Assign Sub-Goal'}
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
