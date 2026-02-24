import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { developmentApi, type DevelopmentPlan, type DevelopmentActivity, type DevelopmentCheckpoint } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';
import {
  ArrowLeftIcon,
  PlusIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

// ============================================================================
// Constants
// ============================================================================

const MANAGER_ROLES = ['Super Admin', 'SUPER_ADMIN', 'HR_ADMIN', 'HR Admin', 'MANAGER', 'Manager', 'ADMIN', 'Tenant Admin', 'TENANT_ADMIN'];

const planStatusColors: Record<string, string> = {
  DRAFT: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-300',
  ACTIVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  ON_HOLD: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
};

const activityTypeColors: Record<string, string> = {
  TRAINING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  COURSE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  CERTIFICATION: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  MENTORING: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  PROJECT: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  SHADOWING: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  READING: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
};

const activityStatusColors: Record<string, string> = {
  NOT_STARTED: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const priorityColors: Record<string, string> = {
  LOW: 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const checkpointTypeColors: Record<string, string> = {
  MILESTONE: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  REVIEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  ASSESSMENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  COMPLETION: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
};

const ACTIVITY_TYPES = ['TRAINING', 'COURSE', 'CERTIFICATION', 'MENTORING', 'PROJECT', 'SHADOWING', 'READING'] as const;
const ACTIVITY_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
const CHECKPOINT_TYPES = ['MILESTONE', 'REVIEW', 'ASSESSMENT', 'COMPLETION'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

// ============================================================================
// Star Rating Component
// ============================================================================

function StarRating({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !disabled && onChange(star)}
          disabled={disabled}
          className={clsx('p-0.5 transition-transform', disabled ? 'cursor-default' : 'hover:scale-110')}
        >
          {star <= value ? (
            <StarSolidIcon className="h-5 w-5 text-amber-400" />
          ) : (
            <StarIcon className="h-5 w-5 text-secondary-300 dark:text-secondary-600" />
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Tag Input Component
// ============================================================================

function TagInput({
  tags,
  onChange,
  placeholder = 'Add tag...',
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInput('');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
              className="hover:text-primary-600 dark:hover:text-primary-200"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="input text-sm flex-1 dark:bg-secondary-700 dark:border-secondary-600 dark:text-white dark:placeholder-secondary-400"
        />
        <button
          type="button"
          onClick={addTag}
          className="btn-secondary text-sm px-3"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export function DevelopmentPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userRoles = user?.roles ?? [];
  const isManager = userRoles.some((r) => MANAGER_ROLES.includes(r));

  // Modal states
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddCheckpoint, setShowAddCheckpoint] = useState(false);
  const [completeCheckpointId, setCompleteCheckpointId] = useState<string | null>(null);

  // Expanded activity state for inline edit
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);

  // Activity inline edit states
  const [editActivityStatus, setEditActivityStatus] = useState('');
  const [editActivityProgress, setEditActivityProgress] = useState(0);
  const [editActivityRating, setEditActivityRating] = useState(0);
  const [editActivityFeedback, setEditActivityFeedback] = useState('');
  const [editActivityEvidence, setEditActivityEvidence] = useState('');

  // Add Activity form states
  const [newActivityType, setNewActivityType] = useState<string>('TRAINING');
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityDescription, setNewActivityDescription] = useState('');
  const [newActivityProvider, setNewActivityProvider] = useState('');
  const [newActivityHours, setNewActivityHours] = useState('');
  const [newActivityDueDate, setNewActivityDueDate] = useState('');
  const [newActivityPriority, setNewActivityPriority] = useState<string>('MEDIUM');
  const [newActivityTargetSkills, setNewActivityTargetSkills] = useState<string[]>([]);

  // Add Checkpoint form states
  const [newCheckpointName, setNewCheckpointName] = useState('');
  const [newCheckpointDate, setNewCheckpointDate] = useState('');
  const [newCheckpointType, setNewCheckpointType] = useState<string>('MILESTONE');

  // Complete Checkpoint form states
  const [cpProgressReview, setCpProgressReview] = useState('');
  const [cpSkillsAcquired, setCpSkillsAcquired] = useState<string[]>([]);
  const [cpManagerFeedback, setCpManagerFeedback] = useState('');
  const [cpSelfAssessment, setCpSelfAssessment] = useState('');
  const [cpNextSteps, setCpNextSteps] = useState<string[]>([]);

  // ── Queries ──

  const { data: plan, isLoading, error } = useQuery({
    queryKey: ['development-plan', id],
    queryFn: () => developmentApi.getPlanById(id!),
    enabled: !!id,
  });

  // ── Mutations ──

  const approveMutation = useMutation({
    mutationFn: () => developmentApi.approvePlan(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['development-plan', id] });
      queryClient.invalidateQueries({ queryKey: ['development-plans'] });
      toast.success('Plan approved successfully');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to approve plan');
    },
  });

  const addActivityMutation = useMutation({
    mutationFn: (data: Parameters<typeof developmentApi.addActivity>[1]) =>
      developmentApi.addActivity(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['development-plan', id] });
      resetAddActivityForm();
      setShowAddActivity(false);
      toast.success('Activity added successfully');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to add activity');
    },
  });

  const updateActivityMutation = useMutation({
    mutationFn: ({ activityId, data }: { activityId: string; data: Parameters<typeof developmentApi.updateActivity>[1] }) =>
      developmentApi.updateActivity(activityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['development-plan', id] });
      setExpandedActivityId(null);
      toast.success('Activity updated');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update activity');
    },
  });

  const addCheckpointMutation = useMutation({
    mutationFn: (data: Parameters<typeof developmentApi.addCheckpoint>[1]) =>
      developmentApi.addCheckpoint(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['development-plan', id] });
      resetAddCheckpointForm();
      setShowAddCheckpoint(false);
      toast.success('Checkpoint added');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to add checkpoint');
    },
  });

  const completeCheckpointMutation = useMutation({
    mutationFn: ({ checkpointId, data }: { checkpointId: string; data: Parameters<typeof developmentApi.completeCheckpoint>[1] }) =>
      developmentApi.completeCheckpoint(checkpointId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['development-plan', id] });
      resetCompleteCheckpointForm();
      setCompleteCheckpointId(null);
      toast.success('Checkpoint completed');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to complete checkpoint');
    },
  });

  // ── Reset helpers ──

  function resetAddActivityForm() {
    setNewActivityType('TRAINING');
    setNewActivityTitle('');
    setNewActivityDescription('');
    setNewActivityProvider('');
    setNewActivityHours('');
    setNewActivityDueDate('');
    setNewActivityPriority('MEDIUM');
    setNewActivityTargetSkills([]);
  }

  function resetAddCheckpointForm() {
    setNewCheckpointName('');
    setNewCheckpointDate('');
    setNewCheckpointType('MILESTONE');
  }

  function resetCompleteCheckpointForm() {
    setCpProgressReview('');
    setCpSkillsAcquired([]);
    setCpManagerFeedback('');
    setCpSelfAssessment('');
    setCpNextSteps([]);
  }

  // ── Expand activity for editing ──

  function handleExpandActivity(activity: DevelopmentActivity) {
    if (expandedActivityId === activity.id) {
      setExpandedActivityId(null);
      return;
    }
    setExpandedActivityId(activity.id);
    setEditActivityStatus(activity.status);
    setEditActivityProgress(activity.progressPercentage);
    setEditActivityRating(activity.rating ?? 0);
    setEditActivityFeedback(activity.feedback ?? '');
    setEditActivityEvidence(activity.completionEvidence ?? '');
  }

  function handleSaveActivity(activityId: string) {
    updateActivityMutation.mutate({
      activityId,
      data: {
        status: editActivityStatus,
        progressPercentage: editActivityProgress,
        rating: editActivityRating || undefined,
        feedback: editActivityFeedback || undefined,
        completionEvidence: editActivityEvidence || undefined,
      },
    });
  }

  // ── Submit handlers ──

  function handleAddActivity(e: React.FormEvent) {
    e.preventDefault();
    addActivityMutation.mutate({
      activityType: newActivityType,
      title: newActivityTitle,
      description: newActivityDescription,
      provider: newActivityProvider || undefined,
      estimatedHours: newActivityHours ? Number(newActivityHours) : undefined,
      dueDate: newActivityDueDate || undefined,
      priority: newActivityPriority,
      targetSkills: newActivityTargetSkills.length > 0 ? newActivityTargetSkills : undefined,
    });
  }

  function handleAddCheckpoint(e: React.FormEvent) {
    e.preventDefault();
    addCheckpointMutation.mutate({
      checkpointName: newCheckpointName,
      checkpointDate: newCheckpointDate,
      checkpointType: newCheckpointType,
    });
  }

  function handleCompleteCheckpoint(e: React.FormEvent) {
    e.preventDefault();
    if (!completeCheckpointId) return;
    completeCheckpointMutation.mutate({
      checkpointId: completeCheckpointId,
      data: {
        progressReview: cpProgressReview || undefined,
        skillsAcquired: cpSkillsAcquired.length > 0 ? cpSkillsAcquired : undefined,
        managerFeedback: cpManagerFeedback || undefined,
        selfAssessment: cpSelfAssessment || undefined,
        nextSteps: cpNextSteps.length > 0 ? cpNextSteps : undefined,
      },
    });
  }

  // ── Loading / Error States ──

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white">Development plan not found</h3>
        <p className="mt-1 text-secondary-500 dark:text-secondary-400">
          The plan you are looking for does not exist or has been removed.
        </p>
        <Link to="/development" className="btn-primary mt-4 inline-block">
          Back to Development Plans
        </Link>
      </div>
    );
  }

  const activities = plan.activities ?? [];
  const checkpoints = (plan.checkpoints ?? []).slice().sort(
    (a, b) => new Date(a.checkpointDate).getTime() - new Date(b.checkpointDate).getTime()
  );

  return (
    <div className="space-y-6">
      {/* ================================================================ */}
      {/* Header                                                          */}
      {/* ================================================================ */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            to="/development"
            className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 dark:text-secondary-400"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
                {plan.planName}
              </h1>
              <span
                className={clsx(
                  'px-2.5 py-0.5 rounded-full text-xs font-medium',
                  planStatusColors[plan.status] || planStatusColors.DRAFT
                )}
              >
                {plan.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
              {plan.user.firstName} {plan.user.lastName}
              {plan.user.jobTitle ? ` - ${plan.user.jobTitle}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isManager && plan.status === 'DRAFT' && (
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="btn-primary"
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              {approveMutation.isPending ? 'Approving...' : 'Approve Plan'}
            </button>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* Plan Overview Card                                               */}
      {/* ================================================================ */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
        <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Plan Overview</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Career Goal */}
          <div>
            <dt className="text-xs font-medium text-secondary-500 dark:text-secondary-400 tracking-wider">
              Career Goal
            </dt>
            <dd className="mt-1 text-sm text-secondary-900 dark:text-white">{plan.careerGoal}</dd>
          </div>

          {/* Target Role */}
          {plan.targetRole && (
            <div>
              <dt className="text-xs font-medium text-secondary-500 dark:text-secondary-400 tracking-wider">
                Target Role
              </dt>
              <dd className="mt-1 text-sm text-secondary-900 dark:text-white">{plan.targetRole}</dd>
            </div>
          )}

          {/* Level Progression */}
          <div>
            <dt className="text-xs font-medium text-secondary-500 dark:text-secondary-400 tracking-wider">
              Level Progression
            </dt>
            <dd className="mt-1 flex items-center gap-2 text-sm text-secondary-900 dark:text-white">
              <span className="px-2 py-0.5 rounded bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 text-xs font-medium">
                {plan.currentLevel}
              </span>
              <svg className="h-4 w-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              {plan.targetLevel ? (
                <span className="px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-xs font-medium">
                  {plan.targetLevel}
                </span>
              ) : (
                <span className="text-secondary-400 text-xs">Not specified</span>
              )}
            </dd>
          </div>

          {/* Timeline */}
          <div>
            <dt className="text-xs font-medium text-secondary-500 dark:text-secondary-400 tracking-wider">
              Timeline
            </dt>
            <dd className="mt-1 text-sm text-secondary-900 dark:text-white">
              {format(new Date(plan.startDate), 'MMM d, yyyy')}
              {' '}
              <span className="text-secondary-400 mx-1">to</span>
              {' '}
              {format(new Date(plan.targetCompletionDate), 'MMM d, yyyy')}
              <span className="text-xs text-secondary-500 dark:text-secondary-400 ml-2">
                ({plan.duration} months)
              </span>
            </dd>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-secondary-600 dark:text-secondary-400">Overall Progress</span>
            <span className="text-sm font-bold text-secondary-900 dark:text-white">{plan.overallProgress}%</span>
          </div>
          <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-3">
            <div
              className={clsx(
                'h-3 rounded-full transition-all duration-500',
                plan.overallProgress >= 100 ? 'bg-green-500' : 'bg-primary-600'
              )}
              style={{ width: `${Math.min(plan.overallProgress, 100)}%` }}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Development Areas */}
          {plan.developmentAreas && plan.developmentAreas.length > 0 && (
            <div>
              <dt className="text-xs font-medium text-secondary-500 dark:text-secondary-400 tracking-wider mb-2">
                Development Areas
              </dt>
              <div className="flex flex-wrap gap-1.5">
                {plan.developmentAreas.map((area, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {plan.strengthsAssessed && plan.strengthsAssessed.length > 0 && (
            <div>
              <dt className="text-xs font-medium text-secondary-500 dark:text-secondary-400 tracking-wider mb-2">
                Strengths
              </dt>
              <div className="flex flex-wrap gap-1.5">
                {plan.strengthsAssessed.map((strength, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                  >
                    {strength}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* Activities Section                                               */}
      {/* ================================================================ */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Activities</h2>
          <button
            onClick={() => setShowAddActivity(true)}
            className="btn-primary text-sm"
          >
            <PlusIcon className="h-4 w-4 mr-1.5" />
            Add Activity
          </button>
        </div>

        {activities.length === 0 ? (
          <p className="text-sm text-secondary-500 dark:text-secondary-400 text-center py-8">
            No activities yet. Add an activity to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {/* Table header */}
            <div className="hidden md:grid md:grid-cols-12 gap-3 px-3 py-2 text-xs font-medium text-secondary-500 dark:text-secondary-400 tracking-wider border-b border-secondary-200 dark:border-secondary-700">
              <div className="col-span-1">Type</div>
              <div className="col-span-3">Title</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Progress</div>
              <div className="col-span-2">Due Date</div>
              <div className="col-span-1">Priority</div>
              <div className="col-span-1">Hours</div>
              <div className="col-span-1"></div>
            </div>

            {activities.map((activity) => (
              <div key={activity.id}>
                {/* Activity Row */}
                <div
                  className={clsx(
                    'grid grid-cols-1 md:grid-cols-12 gap-3 px-3 py-3 rounded-lg items-center cursor-pointer transition-colors',
                    expandedActivityId === activity.id
                      ? 'bg-primary-50 dark:bg-primary-900/10'
                      : 'hover:bg-secondary-50 dark:hover:bg-secondary-700/50'
                  )}
                  onClick={() => handleExpandActivity(activity)}
                >
                  {/* Type Badge */}
                  <div className="col-span-1">
                    <span
                      className={clsx(
                        'inline-block px-2 py-0.5 rounded text-[10px] font-semibold',
                        activityTypeColors[activity.activityType] || activityTypeColors.TRAINING
                      )}
                    >
                      {activity.activityType}
                    </span>
                  </div>

                  {/* Title */}
                  <div className="col-span-3">
                    <span className="text-sm font-medium text-secondary-900 dark:text-white">
                      {activity.title}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="col-span-1">
                    <span
                      className={clsx(
                        'inline-block px-2 py-0.5 rounded-full text-[10px] font-medium',
                        activityStatusColors[activity.status] || activityStatusColors.NOT_STARTED
                      )}
                    >
                      {activity.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="flex-1 bg-secondary-200 dark:bg-secondary-700 rounded-full h-1.5">
                      <div
                        className={clsx(
                          'h-1.5 rounded-full',
                          activity.progressPercentage >= 100 ? 'bg-green-500' : 'bg-primary-500'
                        )}
                        style={{ width: `${Math.min(activity.progressPercentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-secondary-500 dark:text-secondary-400 w-8 text-right">
                      {activity.progressPercentage}%
                    </span>
                  </div>

                  {/* Due Date */}
                  <div className="col-span-2">
                    <span className="text-xs text-secondary-600 dark:text-secondary-400">
                      {activity.dueDate ? format(new Date(activity.dueDate), 'MMM d, yyyy') : '--'}
                    </span>
                  </div>

                  {/* Priority */}
                  <div className="col-span-1">
                    {activity.priority && (
                      <span
                        className={clsx(
                          'inline-block px-2 py-0.5 rounded text-[10px] font-medium',
                          priorityColors[activity.priority] || priorityColors.MEDIUM
                        )}
                      >
                        {activity.priority}
                      </span>
                    )}
                  </div>

                  {/* Hours */}
                  <div className="col-span-1">
                    <span className="text-xs text-secondary-500 dark:text-secondary-400">
                      {activity.estimatedHours ? `${activity.estimatedHours}h` : '--'}
                    </span>
                  </div>

                  {/* Expand Icon */}
                  <div className="col-span-1 flex justify-end">
                    {expandedActivityId === activity.id ? (
                      <ChevronUpIcon className="h-4 w-4 text-secondary-400" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4 text-secondary-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Inline Edit */}
                {expandedActivityId === activity.id && (
                  <div className="mx-3 mb-2 p-4 rounded-lg border border-secondary-200 dark:border-secondary-600 bg-white dark:bg-secondary-800 space-y-4">
                    {activity.description && (
                      <p className="text-sm text-secondary-600 dark:text-secondary-400">{activity.description}</p>
                    )}
                    {activity.targetSkills && activity.targetSkills.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-secondary-500 dark:text-secondary-400">Target Skills:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {activity.targetSkills.map((skill, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Status */}
                      <div>
                        <label className="text-xs font-medium text-secondary-600 dark:text-secondary-400 block mb-1">
                          Status
                        </label>
                        <select
                          value={editActivityStatus}
                          onChange={(e) => setEditActivityStatus(e.target.value)}
                          className="input text-sm dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                        >
                          {ACTIVITY_STATUSES.map((s) => (
                            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </div>

                      {/* Progress Slider */}
                      <div>
                        <label className="text-xs font-medium text-secondary-600 dark:text-secondary-400 block mb-1">
                          Progress: {editActivityProgress}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={editActivityProgress}
                          onChange={(e) => setEditActivityProgress(Number(e.target.value))}
                          className="w-full accent-primary-600"
                        />
                      </div>
                    </div>

                    {/* Rating */}
                    <div>
                      <label className="text-xs font-medium text-secondary-600 dark:text-secondary-400 block mb-1">
                        Rating
                      </label>
                      <StarRating
                        value={editActivityRating}
                        onChange={setEditActivityRating}
                      />
                    </div>

                    {/* Feedback */}
                    <div>
                      <label className="text-xs font-medium text-secondary-600 dark:text-secondary-400 block mb-1">
                        Feedback
                      </label>
                      <textarea
                        value={editActivityFeedback}
                        onChange={(e) => setEditActivityFeedback(e.target.value)}
                        rows={2}
                        placeholder="Provide feedback on this activity..."
                        className="input text-sm dark:bg-secondary-700 dark:border-secondary-600 dark:text-white dark:placeholder-secondary-400"
                      />
                    </div>

                    {/* Completion Evidence */}
                    <div>
                      <label className="text-xs font-medium text-secondary-600 dark:text-secondary-400 block mb-1">
                        Completion Evidence
                      </label>
                      <textarea
                        value={editActivityEvidence}
                        onChange={(e) => setEditActivityEvidence(e.target.value)}
                        rows={2}
                        placeholder="Describe evidence of completion..."
                        className="input text-sm dark:bg-secondary-700 dark:border-secondary-600 dark:text-white dark:placeholder-secondary-400"
                      />
                    </div>

                    {/* Save / Cancel */}
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedActivityId(null);
                        }}
                        className="btn-secondary text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveActivity(activity.id);
                        }}
                        disabled={updateActivityMutation.isPending}
                        className="btn-primary text-sm"
                      >
                        {updateActivityMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* Checkpoints Timeline                                             */}
      {/* ================================================================ */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Checkpoints</h2>
          {isManager && (
            <button
              onClick={() => setShowAddCheckpoint(true)}
              className="btn-primary text-sm"
            >
              <PlusIcon className="h-4 w-4 mr-1.5" />
              Add Checkpoint
            </button>
          )}
        </div>

        {checkpoints.length === 0 ? (
          <p className="text-sm text-secondary-500 dark:text-secondary-400 text-center py-8">
            No checkpoints scheduled yet.
          </p>
        ) : (
          <div className="relative">
            {/* Vertical Timeline Line */}
            <div className="absolute top-0 bottom-0 border-l-2 border-secondary-300 dark:border-secondary-600 ml-4" />

            <div className="space-y-6">
              {checkpoints.map((checkpoint) => {
                const isCompleted = checkpoint.status === 'COMPLETED';
                const isPending = checkpoint.status === 'PENDING' || checkpoint.status === 'SCHEDULED';
                return (
                  <div key={checkpoint.id} className="relative flex gap-4">
                    {/* Dot */}
                    <div
                      className={clsx(
                        'relative z-10 flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center',
                        isCompleted
                          ? 'bg-green-500 border-green-500'
                          : isPending
                          ? 'bg-white dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600'
                          : 'bg-blue-500 border-blue-500'
                      )}
                    >
                      {isCompleted ? (
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <div
                          className={clsx(
                            'w-2.5 h-2.5 rounded-full',
                            isPending ? 'bg-secondary-400 dark:bg-secondary-500' : 'bg-white'
                          )}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-secondary-900 dark:text-white">
                            {checkpoint.checkpointName}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-secondary-500 dark:text-secondary-400">
                              {format(new Date(checkpoint.checkpointDate), 'MMM d, yyyy')}
                            </span>
                            <span
                              className={clsx(
                                'px-2 py-0.5 rounded-full text-[10px] font-medium',
                                checkpointTypeColors[checkpoint.checkpointType] || checkpointTypeColors.MILESTONE
                              )}
                            >
                              {checkpoint.checkpointType}
                            </span>
                            <span
                              className={clsx(
                                'px-2 py-0.5 rounded-full text-[10px] font-medium',
                                isCompleted
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                  : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400'
                              )}
                            >
                              {checkpoint.status}
                            </span>
                          </div>
                        </div>

                        {!isCompleted && (
                          <button
                            onClick={() => {
                              resetCompleteCheckpointForm();
                              setCompleteCheckpointId(checkpoint.id);
                            }}
                            className="btn-secondary text-xs px-3 py-1"
                          >
                            Complete
                          </button>
                        )}
                      </div>

                      {/* Completed checkpoint details */}
                      {isCompleted && (
                        <div className="mt-2 p-3 rounded-lg bg-secondary-50 dark:bg-secondary-900/50 text-xs space-y-1">
                          {checkpoint.progressReview && (
                            <p><span className="font-medium text-secondary-700 dark:text-secondary-300">Review:</span> <span className="text-secondary-600 dark:text-secondary-400">{checkpoint.progressReview}</span></p>
                          )}
                          {checkpoint.managerFeedback && (
                            <p><span className="font-medium text-secondary-700 dark:text-secondary-300">Manager Feedback:</span> <span className="text-secondary-600 dark:text-secondary-400">{checkpoint.managerFeedback}</span></p>
                          )}
                          {checkpoint.selfAssessment && (
                            <p><span className="font-medium text-secondary-700 dark:text-secondary-300">Self Assessment:</span> <span className="text-secondary-600 dark:text-secondary-400">{checkpoint.selfAssessment}</span></p>
                          )}
                          {checkpoint.skillsAcquired && checkpoint.skillsAcquired.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="font-medium text-secondary-700 dark:text-secondary-300">Skills:</span>
                              {checkpoint.skillsAcquired.map((skill, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                          {checkpoint.nextSteps && checkpoint.nextSteps.length > 0 && (
                            <div>
                              <span className="font-medium text-secondary-700 dark:text-secondary-300">Next Steps:</span>
                              <ul className="list-disc list-inside ml-2 text-secondary-600 dark:text-secondary-400">
                                {checkpoint.nextSteps.map((step, i) => (
                                  <li key={i}>{step}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {checkpoint.completedAt && (
                            <p className="text-secondary-400 dark:text-secondary-500">
                              Completed {format(new Date(checkpoint.completedAt), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* Skill Gap Visualization                                          */}
      {/* ================================================================ */}
      {((plan.strengthsAssessed && plan.strengthsAssessed.length > 0) ||
        (plan.developmentAreas && plan.developmentAreas.length > 0)) && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Skill Gap Analysis</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths column */}
            <div>
              <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-3 tracking-wider">
                Strengths
              </h3>
              <div className="space-y-2.5">
                {(plan.strengthsAssessed ?? []).map((strength, i) => {
                  const barWidth = 70 + Math.random() * 30; // simulated proficiency score
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-secondary-700 dark:text-secondary-300">
                          {strength}
                        </span>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                          Strong
                        </span>
                      </div>
                      <div className="w-full bg-secondary-100 dark:bg-secondary-700 rounded-full h-2.5">
                        <div
                          className="h-2.5 rounded-full bg-green-500 dark:bg-green-400 transition-all duration-700"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {(!plan.strengthsAssessed || plan.strengthsAssessed.length === 0) && (
                  <p className="text-xs text-secondary-400 dark:text-secondary-500">No strengths assessed.</p>
                )}
              </div>
            </div>

            {/* Development Areas column */}
            <div>
              <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-3 tracking-wider">
                Development Areas
              </h3>
              <div className="space-y-2.5">
                {(plan.developmentAreas ?? []).map((area, i) => {
                  const barWidth = 15 + Math.random() * 35; // simulated lower proficiency
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-secondary-700 dark:text-secondary-300">
                          {area}
                        </span>
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                          Developing
                        </span>
                      </div>
                      <div className="w-full bg-secondary-100 dark:bg-secondary-700 rounded-full h-2.5">
                        <div
                          className="h-2.5 rounded-full bg-orange-400 dark:bg-orange-500 transition-all duration-700"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {(!plan.developmentAreas || plan.developmentAreas.length === 0) && (
                  <p className="text-xs text-secondary-400 dark:text-secondary-500">No development areas listed.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Add Activity Modal                                               */}
      {/* ================================================================ */}
      {showAddActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Add Activity</h2>
              <button
                onClick={() => { resetAddActivityForm(); setShowAddActivity(false); }}
                className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-400"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddActivity} className="space-y-4">
              {/* Activity Type */}
              <div>
                <label className="label dark:text-secondary-300">Activity Type</label>
                <select
                  value={newActivityType}
                  onChange={(e) => setNewActivityType(e.target.value)}
                  className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="label dark:text-secondary-300">Title</label>
                <input
                  type="text"
                  value={newActivityTitle}
                  onChange={(e) => setNewActivityTitle(e.target.value)}
                  required
                  placeholder="e.g., AWS Solutions Architect Training"
                  className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white dark:placeholder-secondary-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="label dark:text-secondary-300">Description</label>
                <textarea
                  value={newActivityDescription}
                  onChange={(e) => setNewActivityDescription(e.target.value)}
                  required
                  rows={3}
                  placeholder="Describe the activity and its learning objectives..."
                  className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white dark:placeholder-secondary-400"
                />
              </div>

              {/* Provider */}
              <div>
                <label className="label dark:text-secondary-300">Provider</label>
                <input
                  type="text"
                  value={newActivityProvider}
                  onChange={(e) => setNewActivityProvider(e.target.value)}
                  placeholder="e.g., Coursera, Internal Training, LinkedIn Learning"
                  className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white dark:placeholder-secondary-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Estimated Hours */}
                <div>
                  <label className="label dark:text-secondary-300">Estimated Hours</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={newActivityHours}
                    onChange={(e) => setNewActivityHours(e.target.value)}
                    placeholder="40"
                    className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white dark:placeholder-secondary-400"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="label dark:text-secondary-300">Due Date</label>
                  <input
                    type="date"
                    value={newActivityDueDate}
                    onChange={(e) => setNewActivityDueDate(e.target.value)}
                    className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="label dark:text-secondary-300">Priority</label>
                <select
                  value={newActivityPriority}
                  onChange={(e) => setNewActivityPriority(e.target.value)}
                  className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Target Skills */}
              <div>
                <label className="label dark:text-secondary-300">Target Skills</label>
                <TagInput
                  tags={newActivityTargetSkills}
                  onChange={setNewActivityTargetSkills}
                  placeholder="Add a skill..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { resetAddActivityForm(); setShowAddActivity(false); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addActivityMutation.isPending}
                  className="btn-primary"
                >
                  {addActivityMutation.isPending ? 'Adding...' : 'Add Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Add Checkpoint Modal                                             */}
      {/* ================================================================ */}
      {showAddCheckpoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Add Checkpoint</h2>
              <button
                onClick={() => { resetAddCheckpointForm(); setShowAddCheckpoint(false); }}
                className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-400"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddCheckpoint} className="space-y-4">
              {/* Name */}
              <div>
                <label className="label dark:text-secondary-300">Checkpoint Name</label>
                <input
                  type="text"
                  value={newCheckpointName}
                  onChange={(e) => setNewCheckpointName(e.target.value)}
                  required
                  placeholder="e.g., Q2 Progress Review"
                  className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white dark:placeholder-secondary-400"
                />
              </div>

              {/* Date */}
              <div>
                <label className="label dark:text-secondary-300">Date</label>
                <input
                  type="date"
                  value={newCheckpointDate}
                  onChange={(e) => setNewCheckpointDate(e.target.value)}
                  required
                  className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                />
              </div>

              {/* Type */}
              <div>
                <label className="label dark:text-secondary-300">Type</label>
                <select
                  value={newCheckpointType}
                  onChange={(e) => setNewCheckpointType(e.target.value)}
                  className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                >
                  {CHECKPOINT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { resetAddCheckpointForm(); setShowAddCheckpoint(false); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addCheckpointMutation.isPending}
                  className="btn-primary"
                >
                  {addCheckpointMutation.isPending ? 'Adding...' : 'Add Checkpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Complete Checkpoint Modal                                        */}
      {/* ================================================================ */}
      {completeCheckpointId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Complete Checkpoint</h2>
              <button
                onClick={() => { resetCompleteCheckpointForm(); setCompleteCheckpointId(null); }}
                className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-400"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteCheckpoint} className="space-y-4">
              {/* Progress Review */}
              <div>
                <label className="label dark:text-secondary-300">Progress Review</label>
                <textarea
                  value={cpProgressReview}
                  onChange={(e) => setCpProgressReview(e.target.value)}
                  rows={3}
                  placeholder="Summarize the progress made since the last checkpoint..."
                  className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white dark:placeholder-secondary-400"
                />
              </div>

              {/* Skills Acquired */}
              <div>
                <label className="label dark:text-secondary-300">Skills Acquired</label>
                <TagInput
                  tags={cpSkillsAcquired}
                  onChange={setCpSkillsAcquired}
                  placeholder="Add a skill..."
                />
              </div>

              {/* Manager Feedback */}
              <div>
                <label className="label dark:text-secondary-300">Manager Feedback</label>
                <textarea
                  value={cpManagerFeedback}
                  onChange={(e) => setCpManagerFeedback(e.target.value)}
                  rows={2}
                  placeholder="Provide feedback on the employee's progress..."
                  className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white dark:placeholder-secondary-400"
                />
              </div>

              {/* Self Assessment */}
              <div>
                <label className="label dark:text-secondary-300">Self Assessment</label>
                <textarea
                  value={cpSelfAssessment}
                  onChange={(e) => setCpSelfAssessment(e.target.value)}
                  rows={2}
                  placeholder="Employee's self-assessment of their progress..."
                  className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white dark:placeholder-secondary-400"
                />
              </div>

              {/* Next Steps */}
              <div>
                <label className="label dark:text-secondary-300">Next Steps</label>
                <TagInput
                  tags={cpNextSteps}
                  onChange={setCpNextSteps}
                  placeholder="Add a next step..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { resetCompleteCheckpointForm(); setCompleteCheckpointId(null); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={completeCheckpointMutation.isPending}
                  className="btn-primary"
                >
                  {completeCheckpointMutation.isPending ? 'Completing...' : 'Complete Checkpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
