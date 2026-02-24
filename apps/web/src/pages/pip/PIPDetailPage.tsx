import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { pipApi, usersApi, type PIP, type PIPCheckIn, type PIPMilestone, type User } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import {
  ArrowLeftIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  StarIcon,
  CalendarIcon,
  FlagIcon,
  UserIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  HandRaisedIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format, parseISO, differenceInDays } from 'date-fns';

const severityColors: Record<string, string> = {
  STANDARD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  SERIOUS: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  FINAL_WARNING: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  ON_TRACK: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  AT_RISK: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  SUCCESSFUL: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  UNSUCCESSFUL: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const milestoneStatusColors: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const milestoneDotColors: Record<string, string> = {
  NOT_STARTED: 'bg-gray-400 dark:bg-gray-500',
  IN_PROGRESS: 'bg-blue-500 dark:bg-blue-400',
  COMPLETED: 'bg-green-500 dark:bg-green-400',
  FAILED: 'bg-red-500 dark:bg-red-400',
};

const pipTypeColors: Record<string, string> = {
  PERFORMANCE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  BEHAVIOR: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  ATTENDANCE: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  SKILLS: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
};

const reviewFrequencyLabels: Record<string, string> = {
  WEEKLY: 'Weekly',
  BI_WEEKLY: 'Bi-Weekly',
  MONTHLY: 'Monthly',
};

interface AddMilestoneForm {
  milestoneName: string;
  description: string;
  dueDate: string;
  successCriteria: Array<{ criterion: string }>;
}

interface UpdateMilestoneForm {
  status: string;
  achievementLevel: string;
  evaluationNotes: string;
}

interface AddCheckInForm {
  checkInDate: string;
  checkInType: string;
  progressSummary: string;
  performanceRating: number;
  onTrack: boolean;
  positiveObservations: string[];
  concernsRaised: string[];
  managerFeedback: string;
  employeeFeedback: string;
  actionItems: Array<{ item: string; assignee: string; dueDate: string }>;
  nextSteps: string[];
}

interface ClosePIPForm {
  outcome: string;
  notes: string;
}

interface AcknowledgeForm {
  comments: string;
}

function RatingStars({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange?: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => !disabled && onChange?.(rating)}
          disabled={disabled}
          className={clsx('p-0.5 transition-colors', disabled ? 'cursor-default' : 'hover:scale-110')}
        >
          {rating <= value ? (
            <StarSolidIcon className="h-5 w-5 text-yellow-400" />
          ) : (
            <StarIcon className="h-5 w-5 text-secondary-300 dark:text-secondary-600" />
          )}
        </button>
      ))}
    </div>
  );
}

export function PIPDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [showUpdateMilestoneModal, setShowUpdateMilestoneModal] = useState<string | null>(null);
  const [showAddCheckInModal, setShowAddCheckInModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showAcknowledgeModal, setShowAcknowledgeModal] = useState(false);
  const [expandedCheckIn, setExpandedCheckIn] = useState<string | null>(null);

  // Milestone form states
  const [milestoneForm, setMilestoneForm] = useState<AddMilestoneForm>({
    milestoneName: '',
    description: '',
    dueDate: '',
    successCriteria: [{ criterion: '' }],
  });

  const [updateMilestoneForm, setUpdateMilestoneForm] = useState<UpdateMilestoneForm>({
    status: 'IN_PROGRESS',
    achievementLevel: '',
    evaluationNotes: '',
  });

  // Check-in form state
  const [checkInForm, setCheckInForm] = useState<AddCheckInForm>({
    checkInDate: new Date().toISOString().split('T')[0],
    checkInType: 'SCHEDULED',
    progressSummary: '',
    performanceRating: 0,
    onTrack: true,
    positiveObservations: [''],
    concernsRaised: [''],
    managerFeedback: '',
    employeeFeedback: '',
    actionItems: [{ item: '', assignee: '', dueDate: '' }],
    nextSteps: [''],
  });

  // Close form state
  const [closeForm, setCloseForm] = useState<ClosePIPForm>({
    outcome: 'SUCCESSFUL',
    notes: '',
  });

  // Acknowledge form state
  const [acknowledgeForm, setAcknowledgeForm] = useState<AcknowledgeForm>({
    comments: '',
  });

  // Queries
  const {
    data: pip,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['pip', id],
    queryFn: () => pipApi.getById(id!),
    enabled: !!id,
  });

  // Mutations
  const addMilestoneMutation = useMutation({
    mutationFn: (data: Parameters<typeof pipApi.addMilestone>[1]) => pipApi.addMilestone(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pip', id] });
      setShowAddMilestoneModal(false);
      setMilestoneForm({
        milestoneName: '',
        description: '',
        dueDate: '',
        successCriteria: [{ criterion: '' }],
      });
      toast.success('Milestone added successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add milestone');
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: ({
      milestoneId,
      data,
    }: {
      milestoneId: string;
      data: Parameters<typeof pipApi.updateMilestone>[1];
    }) => pipApi.updateMilestone(milestoneId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pip', id] });
      setShowUpdateMilestoneModal(null);
      toast.success('Milestone updated successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update milestone');
    },
  });

  const addCheckInMutation = useMutation({
    mutationFn: (data: Parameters<typeof pipApi.addCheckIn>[1]) => pipApi.addCheckIn(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pip', id] });
      setShowAddCheckInModal(false);
      setCheckInForm({
        checkInDate: new Date().toISOString().split('T')[0],
        checkInType: 'SCHEDULED',
        progressSummary: '',
        performanceRating: 0,
        onTrack: true,
        positiveObservations: [''],
        concernsRaised: [''],
        managerFeedback: '',
        employeeFeedback: '',
        actionItems: [{ item: '', assignee: '', dueDate: '' }],
        nextSteps: [''],
      });
      toast.success('Check-in recorded successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add check-in');
    },
  });

  const closeMutation = useMutation({
    mutationFn: (data: { outcome: string; notes?: string }) => pipApi.close(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pip', id] });
      queryClient.invalidateQueries({ queryKey: ['pips'] });
      setShowCloseModal(false);
      toast.success('PIP closed successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to close PIP');
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (data?: { comments?: string }) => pipApi.acknowledge(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pip', id] });
      setShowAcknowledgeModal(false);
      toast.success('PIP acknowledged successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to acknowledge PIP');
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => pipApi.approve(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pip', id] });
      toast.success('PIP approved by HR');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to approve PIP');
    },
  });

  // Handlers
  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneForm.milestoneName.trim()) {
      toast.error('Please enter a milestone name');
      return;
    }
    const cleanedCriteria = milestoneForm.successCriteria.filter((c) => c.criterion.trim());
    addMilestoneMutation.mutate({
      milestoneName: milestoneForm.milestoneName.trim(),
      description: milestoneForm.description.trim(),
      dueDate: new Date(milestoneForm.dueDate).toISOString(),
      successCriteria: cleanedCriteria,
    });
  };

  const handleUpdateMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showUpdateMilestoneModal) return;
    updateMilestoneMutation.mutate({
      milestoneId: showUpdateMilestoneModal,
      data: {
        status: updateMilestoneForm.status || undefined,
        achievementLevel: updateMilestoneForm.achievementLevel || undefined,
        evaluationNotes: updateMilestoneForm.evaluationNotes || undefined,
      },
    });
  };

  const handleAddCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInForm.progressSummary.trim()) {
      toast.error('Please enter a progress summary');
      return;
    }
    if (!checkInForm.managerFeedback.trim()) {
      toast.error('Please enter manager feedback');
      return;
    }

    addCheckInMutation.mutate({
      checkInDate: new Date(checkInForm.checkInDate).toISOString(),
      checkInType: checkInForm.checkInType,
      progressSummary: checkInForm.progressSummary.trim(),
      performanceRating: checkInForm.performanceRating || undefined,
      onTrack: checkInForm.onTrack,
      positiveObservations: checkInForm.positiveObservations.filter((o) => o.trim()),
      concernsRaised: checkInForm.concernsRaised.filter((c) => c.trim()),
      managerFeedback: checkInForm.managerFeedback.trim(),
      employeeFeedback: checkInForm.employeeFeedback.trim() || undefined,
      actionItems: checkInForm.actionItems
        .filter((a) => a.item.trim())
        .map((a) => ({
          item: a.item.trim(),
          assignee: a.assignee.trim() || undefined,
          dueDate: a.dueDate || undefined,
        })),
      nextSteps: checkInForm.nextSteps.filter((s) => s.trim()),
    });
  };

  const handleClose = (e: React.FormEvent) => {
    e.preventDefault();
    closeMutation.mutate({
      outcome: closeForm.outcome,
      notes: closeForm.notes.trim() || undefined,
    });
  };

  const handleAcknowledge = (e: React.FormEvent) => {
    e.preventDefault();
    acknowledgeMutation.mutate({
      comments: acknowledgeForm.comments.trim() || undefined,
    });
  };

  const isEmployee = pip?.userId === user?.id;
  const isCreator = pip?.createdBy === user?.id;
  const isHR =
    user?.roles?.includes('HR_ADMIN') ||
    user?.roles?.includes('ADMIN') ||
    user?.roles?.includes('SUPER_ADMIN');
  const canManage = isCreator || isHR;
  const isPIPActive = pip?.status === 'ACTIVE' || pip?.status === 'ON_TRACK' || pip?.status === 'AT_RISK';
  const canAcknowledge = isEmployee && !pip?.employeeAcknowledged && isPIPActive;
  const canClose = canManage && isPIPActive;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="glass-spinner" />
      </div>
    );
  }

  if (error || !pip) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
        <h3 className="mt-3 text-lg font-medium text-secondary-900 dark:text-white">
          PIP not found
        </h3>
        <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
          The performance improvement plan you are looking for does not exist or you do not have
          access.
        </p>
        <Link
          to="/pip"
          className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to PIPs
        </Link>
      </div>
    );
  }

  const daysRemaining = differenceInDays(parseISO(pip.endDate), new Date());
  const totalDuration = differenceInDays(parseISO(pip.endDate), parseISO(pip.startDate));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            to="/pip"
            className="text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 flex items-center gap-1 text-sm mt-1"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
                {pip.pipTitle}
              </h1>
              <span
                className={clsx(
                  'px-2.5 py-0.5 rounded-full text-xs font-medium',
                  severityColors[pip.severity] || 'bg-secondary-100 text-secondary-800'
                )}
              >
                {pip.severity === 'FINAL_WARNING' ? 'Final Warning' : pip.severity}
              </span>
              <span
                className={clsx(
                  'px-2.5 py-0.5 rounded-full text-xs font-medium',
                  statusColors[pip.status] || 'bg-secondary-100 text-secondary-800'
                )}
              >
                {pip.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
              Created {format(parseISO(pip.createdAt), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isHR && !pip.hrApprovedAt && (
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              <ShieldCheckIcon className="h-4 w-4" />
              {approveMutation.isPending ? 'Approving...' : 'HR Approve'}
            </button>
          )}
          {canAcknowledge && (
            <button
              onClick={() => setShowAcknowledgeModal(true)}
              className="bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors inline-flex items-center gap-2"
            >
              <HandRaisedIcon className="h-4 w-4" />
              Acknowledge PIP
            </button>
          )}
          {canClose && (
            <button
              onClick={() => setShowCloseModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors inline-flex items-center gap-2"
            >
              <XCircleIcon className="h-4 w-4" />
              Close PIP
            </button>
          )}
        </div>
      </div>

      {/* PIP Overview Card */}
      <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
          PIP Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Employee info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
              {pip.user?.avatarUrl ? (
                <img
                  src={pip.user.avatarUrl}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  {pip.user?.firstName?.[0]}
                  {pip.user?.lastName?.[0]}
                </span>
              )}
            </div>
            <div>
              <p className="font-medium text-secondary-900 dark:text-white">
                {pip.user?.firstName} {pip.user?.lastName}
              </p>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                {pip.user?.jobTitle || 'Employee'}
              </p>
              <p className="text-xs text-secondary-400 dark:text-secondary-500">
                {pip.user?.email}
              </p>
            </div>
          </div>

          {/* Dates & duration */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-secondary-400" />
              <span className="text-secondary-600 dark:text-secondary-400">Start:</span>
              <span className="text-secondary-900 dark:text-white font-medium">
                {format(parseISO(pip.startDate), 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-secondary-400" />
              <span className="text-secondary-600 dark:text-secondary-400">End:</span>
              <span className="text-secondary-900 dark:text-white font-medium">
                {format(parseISO(pip.endDate), 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ClockIcon className="h-4 w-4 text-secondary-400" />
              <span className="text-secondary-600 dark:text-secondary-400">Duration:</span>
              <span className="text-secondary-900 dark:text-white font-medium">
                {totalDuration} days
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FlagIcon className="h-4 w-4 text-secondary-400" />
              <span className="text-secondary-600 dark:text-secondary-400">Review Frequency:</span>
              <span className="text-secondary-900 dark:text-white font-medium">
                {reviewFrequencyLabels[pip.reviewFrequency] || pip.reviewFrequency}
              </span>
            </div>
            {daysRemaining > 0 && isPIPActive && (
              <p
                className={clsx(
                  'text-xs font-medium mt-1',
                  daysRemaining <= 7
                    ? 'text-red-600 dark:text-red-400'
                    : daysRemaining <= 14
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-secondary-600 dark:text-secondary-400'
                )}
              >
                {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
              </p>
            )}
          </div>

          {/* Statuses */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={clsx(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  pipTypeColors[pip.pipType] || 'bg-secondary-100 text-secondary-800'
                )}
              >
                {pip.pipType}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {pip.hrApprovedAt ? (
                <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>HR Approved {format(parseISO(pip.hrApprovedAt), 'MMM d, yyyy')}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <ClockIcon className="h-4 w-4" />
                  <span>Pending HR Approval</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              {pip.employeeAcknowledged ? (
                <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>
                    Acknowledged{' '}
                    {pip.acknowledgedAt && format(parseISO(pip.acknowledgedAt), 'MMM d, yyyy')}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-secondary-500 dark:text-secondary-400">
                  <XCircleIcon className="h-4 w-4" />
                  <span>Not yet acknowledged by employee</span>
                </span>
              )}
            </div>
            {pip.employeeComments && (
              <div className="mt-2 p-2 rounded-lg bg-secondary-50 dark:bg-secondary-700/50 text-xs text-secondary-700 dark:text-secondary-300">
                <span className="font-medium">Employee comments:</span> {pip.employeeComments}
              </div>
            )}
            {pip.outcome && (
              <div className="mt-2">
                <span className="text-xs text-secondary-500 dark:text-secondary-400">Outcome:</span>
                <span
                  className={clsx(
                    'ml-2 px-2 py-0.5 rounded-full text-xs font-medium',
                    pip.outcome === 'SUCCESSFUL'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : pip.outcome === 'UNSUCCESSFUL'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                      : pip.outcome === 'EXTENDED'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-300'
                  )}
                >
                  {pip.outcome}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Issues */}
      <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
          Performance Issues
        </h2>
        <div className="space-y-3">
          {pip.performanceIssues.map((issue, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-secondary-50 dark:bg-secondary-700/50 border border-secondary-100 dark:border-secondary-600"
            >
              <p className="text-sm font-medium text-secondary-900 dark:text-white">
                {idx + 1}. {issue.issue}
              </p>
              {issue.details && (
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                  {issue.details}
                </p>
              )}
            </div>
          ))}
        </div>
        {pip.impactStatement && (
          <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
              Impact Statement
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-400">{pip.impactStatement}</p>
          </div>
        )}
      </div>

      {/* Goals & Expectations */}
      <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4 flex items-center gap-2">
          <FlagIcon className="h-5 w-5 text-primary-500" />
          Goals & Expectations
        </h2>

        {pip.performanceExpectations && (
          <div className="mb-4 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/40">
            <h3 className="text-sm font-medium text-primary-800 dark:text-primary-300 mb-1">
              Performance Expectations
            </h3>
            <p className="text-sm text-primary-700 dark:text-primary-400">
              {pip.performanceExpectations}
            </p>
          </div>
        )}

        {/* Specific Goals */}
        {pip.specificGoals.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Specific Goals
            </h3>
            <div className="space-y-2">
              {pip.specificGoals.map((g, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <div className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                      {idx + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-secondary-900 dark:text-white">{g.goal}</p>
                    {g.metric && (
                      <p className="text-xs text-secondary-500 dark:text-secondary-400">
                        Metric: {g.metric}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Measurable Objectives */}
        {pip.measurableObjectives.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Measurable Objectives
            </h3>
            <div className="space-y-2">
              {pip.measurableObjectives.map((o, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircleIcon className="h-4 w-4 text-secondary-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-secondary-900 dark:text-white">{o.objective}</p>
                    {o.target && (
                      <p className="text-xs text-secondary-500 dark:text-secondary-400">
                        Target: {o.target}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Criteria */}
        {pip.successCriteria.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Success Criteria
            </h3>
            <ul className="space-y-1">
              {pip.successCriteria.map((c, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  {c.criterion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Support & Training */}
      <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4 flex items-center gap-2">
          <AcademicCapIcon className="h-5 w-5 text-teal-500" />
          Support & Training
        </h2>

        {pip.supportProvided.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Support Provided
            </h3>
            <ul className="space-y-1.5">
              {pip.supportProvided.map((s, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300">
                  <CheckCircleIcon className="h-4 w-4 text-teal-500 flex-shrink-0" />
                  {s.support}
                </li>
              ))}
            </ul>
          </div>
        )}

        {pip.trainingRequired.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Training Required
            </h3>
            <div className="flex flex-wrap gap-2">
              {pip.trainingRequired.map((t, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Milestones Timeline */}
      <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white flex items-center gap-2">
            <FlagIcon className="h-5 w-5 text-blue-500" />
            Milestones
          </h2>
          {canManage && isPIPActive && (
            <button
              onClick={() => setShowAddMilestoneModal(true)}
              className="bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
            >
              <PlusIcon className="h-4 w-4" />
              Add Milestone
            </button>
          )}
        </div>

        {pip.milestoneProgress.length === 0 ? (
          <div className="text-center py-8">
            <FlagIcon className="mx-auto h-10 w-10 text-secondary-300 dark:text-secondary-600" />
            <p className="mt-2 text-sm text-secondary-500 dark:text-secondary-400">
              No milestones have been set yet.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-secondary-200 dark:bg-secondary-600" />

            <div className="space-y-6">
              {pip.milestoneProgress.map((milestone: PIPMilestone) => (
                <div key={milestone.id} className="relative flex gap-4">
                  {/* Timeline dot */}
                  <div
                    className={clsx(
                      'w-[31px] h-[31px] rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 border-white dark:border-secondary-800',
                      milestoneDotColors[milestone.status] || 'bg-gray-400'
                    )}
                  >
                    {milestone.status === 'COMPLETED' ? (
                      <CheckCircleIcon className="h-4 w-4 text-white" />
                    ) : milestone.status === 'FAILED' ? (
                      <XCircleIcon className="h-4 w-4 text-white" />
                    ) : milestone.status === 'IN_PROGRESS' ? (
                      <ClockIcon className="h-4 w-4 text-white" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>

                  {/* Milestone content */}
                  <div
                    className={clsx(
                      'flex-1 p-4 rounded-lg border transition-colors',
                      canManage && isPIPActive
                        ? 'cursor-pointer hover:border-primary-300 dark:hover:border-primary-600'
                        : '',
                      'bg-secondary-50 dark:bg-secondary-700/50 border-secondary-200 dark:border-secondary-600'
                    )}
                    onClick={() => {
                      if (canManage && isPIPActive) {
                        setUpdateMilestoneForm({
                          status: milestone.status,
                          achievementLevel: milestone.achievementLevel || '',
                          evaluationNotes: milestone.evaluationNotes || '',
                        });
                        setShowUpdateMilestoneModal(milestone.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">
                        {milestone.milestoneName}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={clsx(
                            'px-2 py-0.5 rounded-full text-xs font-medium',
                            milestoneStatusColors[milestone.status] ||
                              'bg-secondary-100 text-secondary-800'
                          )}
                        >
                          {milestone.status.replace(/_/g, ' ')}
                        </span>
                        {milestone.achievementLevel && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                            {milestone.achievementLevel}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-2">
                      {milestone.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-secondary-500 dark:text-secondary-400">
                      <span>
                        Due: {format(parseISO(milestone.dueDate), 'MMM d, yyyy')}
                      </span>
                      {milestone.completionDate && (
                        <span>
                          Completed: {format(parseISO(milestone.completionDate), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                    {milestone.successCriteria.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {milestone.successCriteria.map((c, cidx) => (
                          <p
                            key={cidx}
                            className="text-xs text-secondary-500 dark:text-secondary-400 flex items-center gap-1"
                          >
                            <span className="w-1 h-1 rounded-full bg-secondary-400 flex-shrink-0" />
                            {c.criterion}
                          </p>
                        ))}
                      </div>
                    )}
                    {milestone.evaluationNotes && (
                      <p className="mt-2 text-xs text-secondary-600 dark:text-secondary-300 italic">
                        Notes: {milestone.evaluationNotes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Check-ins Log */}
      <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-green-500" />
            Check-ins ({pip.checkIns.length})
          </h2>
          {canManage && isPIPActive && (
            <button
              onClick={() => setShowAddCheckInModal(true)}
              className="bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
            >
              <PlusIcon className="h-4 w-4" />
              Add Check-In
            </button>
          )}
        </div>

        {pip.checkIns.length === 0 ? (
          <div className="text-center py-8">
            <DocumentTextIcon className="mx-auto h-10 w-10 text-secondary-300 dark:text-secondary-600" />
            <p className="mt-2 text-sm text-secondary-500 dark:text-secondary-400">
              No check-ins recorded yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {[...pip.checkIns]
              .sort(
                (a, b) =>
                  new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime()
              )
              .map((checkIn: PIPCheckIn) => {
                const isExpanded = expandedCheckIn === checkIn.id;
                return (
                  <div
                    key={checkIn.id}
                    className="border border-secondary-200 dark:border-secondary-600 rounded-lg overflow-hidden"
                  >
                    {/* Check-in header (always visible) */}
                    <button
                      onClick={() =>
                        setExpandedCheckIn(isExpanded ? null : checkIn.id)
                      }
                      className="w-full text-left p-4 hover:bg-primary-50/30 dark:hover:bg-white/[0.03]/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-sm">
                            <span className="font-medium text-secondary-900 dark:text-white">
                              {format(parseISO(checkIn.checkInDate), 'MMM d, yyyy')}
                            </span>
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300">
                              {checkIn.checkInType}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {checkIn.performanceRating !== undefined &&
                            checkIn.performanceRating > 0 && (
                              <RatingStars value={checkIn.performanceRating} disabled />
                            )}
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded-full text-xs font-medium',
                              checkIn.onTrack
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                            )}
                          >
                            {checkIn.onTrack ? 'On Track' : 'Off Track'}
                          </span>
                          {isExpanded ? (
                            <ChevronUpIcon className="h-4 w-4 text-secondary-400" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4 text-secondary-400" />
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
                        {checkIn.progressSummary}
                      </p>
                    </button>

                    {/* Expanded check-in details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 border-t border-secondary-100 dark:border-secondary-600 pt-4">
                        {/* Progress Summary */}
                        <div>
                          <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-1">
                            Progress Summary
                          </h4>
                          <p className="text-sm text-secondary-700 dark:text-secondary-300">
                            {checkIn.progressSummary}
                          </p>
                        </div>

                        {/* Positive Observations */}
                        {checkIn.positiveObservations.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-1">
                              Positive Observations
                            </h4>
                            <ul className="space-y-1">
                              {checkIn.positiveObservations.map((obs, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-sm text-secondary-700 dark:text-secondary-300"
                                >
                                  <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                  {obs}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Concerns */}
                        {checkIn.concernsRaised.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-1">
                              Concerns Raised
                            </h4>
                            <ul className="space-y-1">
                              {checkIn.concernsRaised.map((concern, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-sm text-secondary-700 dark:text-secondary-300"
                                >
                                  <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                  {concern}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Feedback */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-1">
                              Manager Feedback
                            </h4>
                            <p className="text-sm text-secondary-700 dark:text-secondary-300">
                              {checkIn.managerFeedback || '-'}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-1">
                              Employee Feedback
                            </h4>
                            <p className="text-sm text-secondary-700 dark:text-secondary-300">
                              {checkIn.employeeFeedback || '-'}
                            </p>
                          </div>
                        </div>

                        {/* Action Items */}
                        {checkIn.actionItems.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-1">
                              Action Items
                            </h4>
                            <div className="space-y-1.5">
                              {checkIn.actionItems.map((action, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2 text-sm text-secondary-700 dark:text-secondary-300"
                                >
                                  <span className="w-4 h-4 rounded border border-secondary-300 dark:border-secondary-500 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p>{action.item}</p>
                                    <div className="flex gap-2 text-xs text-secondary-400">
                                      {action.assignee && <span>Assignee: {action.assignee}</span>}
                                      {action.dueDate && (
                                        <span>
                                          Due: {format(parseISO(action.dueDate), 'MMM d, yyyy')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Next Steps */}
                        {checkIn.nextSteps.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-1">
                              Next Steps
                            </h4>
                            <ul className="space-y-1">
                              {checkIn.nextSteps.map((step, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-sm text-secondary-700 dark:text-secondary-300"
                                >
                                  <span className="text-primary-500 font-bold">&rarr;</span>
                                  {step}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Consequences Section */}
      {pip.consequencesOfNonCompliance && (
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-red-200 dark:border-red-800/40 p-6">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5" />
            Consequences of Non-Compliance
          </h2>
          <p className="text-sm text-red-700 dark:text-red-400">
            {pip.consequencesOfNonCompliance}
          </p>
        </div>
      )}

      {/* ======================== MODALS ======================== */}

      {/* Add Milestone Modal */}
      {showAddMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-2xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Add Milestone
              </h2>
              <button
                onClick={() => setShowAddMilestoneModal(false)}
                className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 dark:text-secondary-400"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddMilestone} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Milestone Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={milestoneForm.milestoneName}
                  onChange={(e) =>
                    setMilestoneForm((prev) => ({ ...prev, milestoneName: e.target.value }))
                  }
                  required
                  placeholder="e.g., Complete customer service training"
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Description
                </label>
                <textarea
                  value={milestoneForm.description}
                  onChange={(e) =>
                    setMilestoneForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                  placeholder="Describe the milestone requirements..."
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={milestoneForm.dueDate}
                  onChange={(e) =>
                    setMilestoneForm((prev) => ({ ...prev, dueDate: e.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Success Criteria
                </label>
                <div className="space-y-2">
                  {milestoneForm.successCriteria.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={item.criterion}
                        onChange={(e) => {
                          const updated = [...milestoneForm.successCriteria];
                          updated[idx] = { criterion: e.target.value };
                          setMilestoneForm((prev) => ({ ...prev, successCriteria: updated }));
                        }}
                        placeholder="Success criterion"
                        className="flex-1 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      {milestoneForm.successCriteria.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = milestoneForm.successCriteria.filter(
                              (_, i) => i !== idx
                            );
                            setMilestoneForm((prev) => ({ ...prev, successCriteria: updated }));
                          }}
                          className="p-1.5 text-secondary-400 hover:text-red-500 transition-colors"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setMilestoneForm((prev) => ({
                        ...prev,
                        successCriteria: [...prev.successCriteria, { criterion: '' }],
                      }))
                    }
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                  >
                    + Add another criterion
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200/60 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowAddMilestoneModal(false)}
                  className="px-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-primary-50/30 dark:hover:bg-white/[0.03] text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMilestoneMutation.isPending}
                  className="bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {addMilestoneMutation.isPending ? 'Adding...' : 'Add Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Milestone Modal */}
      {showUpdateMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-2xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Update Milestone
              </h2>
              <button
                onClick={() => setShowUpdateMilestoneModal(null)}
                className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 dark:text-secondary-400"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateMilestone} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Status
                </label>
                <select
                  value={updateMilestoneForm.status}
                  onChange={(e) =>
                    setUpdateMilestoneForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Achievement Level
                </label>
                <select
                  value={updateMilestoneForm.achievementLevel}
                  onChange={(e) =>
                    setUpdateMilestoneForm((prev) => ({
                      ...prev,
                      achievementLevel: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select level (optional)</option>
                  <option value="EXCEEDS">Exceeds Expectations</option>
                  <option value="MEETS">Meets Expectations</option>
                  <option value="PARTIAL">Partially Met</option>
                  <option value="NOT_MET">Not Met</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Evaluation Notes
                </label>
                <textarea
                  value={updateMilestoneForm.evaluationNotes}
                  onChange={(e) =>
                    setUpdateMilestoneForm((prev) => ({
                      ...prev,
                      evaluationNotes: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Provide evaluation notes for this milestone..."
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200/60 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowUpdateMilestoneModal(null)}
                  className="px-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-primary-50/30 dark:hover:bg-white/[0.03] text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMilestoneMutation.isPending}
                  className="bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {updateMilestoneMutation.isPending ? 'Updating...' : 'Update Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Check-In Modal */}
      {showAddCheckInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-2xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Add Check-In
              </h2>
              <button
                onClick={() => setShowAddCheckInModal(false)}
                className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 dark:text-secondary-400"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddCheckIn} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={checkInForm.checkInDate}
                    onChange={(e) =>
                      setCheckInForm((prev) => ({ ...prev, checkInDate: e.target.value }))
                    }
                    required
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Type
                  </label>
                  <select
                    value={checkInForm.checkInType}
                    onChange={(e) =>
                      setCheckInForm((prev) => ({ ...prev, checkInType: e.target.value }))
                    }
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="AD_HOC">Ad Hoc</option>
                    <option value="EMERGENCY">Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Progress Summary <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={checkInForm.progressSummary}
                  onChange={(e) =>
                    setCheckInForm((prev) => ({ ...prev, progressSummary: e.target.value }))
                  }
                  required
                  rows={3}
                  placeholder="Summarize the employee's progress since the last check-in..."
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Performance Rating
                  </label>
                  <RatingStars
                    value={checkInForm.performanceRating}
                    onChange={(v) =>
                      setCheckInForm((prev) => ({ ...prev, performanceRating: v }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    On Track?
                  </label>
                  <div className="flex items-center gap-4 mt-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={checkInForm.onTrack}
                        onChange={() =>
                          setCheckInForm((prev) => ({ ...prev, onTrack: true }))
                        }
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-secondary-700 dark:text-secondary-300">
                        Yes
                      </span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!checkInForm.onTrack}
                        onChange={() =>
                          setCheckInForm((prev) => ({ ...prev, onTrack: false }))
                        }
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-secondary-700 dark:text-secondary-300">
                        No
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Positive Observations */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Positive Observations
                </label>
                <div className="space-y-2">
                  {checkInForm.positiveObservations.map((obs, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={obs}
                        onChange={(e) => {
                          const updated = [...checkInForm.positiveObservations];
                          updated[idx] = e.target.value;
                          setCheckInForm((prev) => ({
                            ...prev,
                            positiveObservations: updated,
                          }));
                        }}
                        placeholder="Observation"
                        className="flex-1 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      {checkInForm.positiveObservations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = checkInForm.positiveObservations.filter(
                              (_, i) => i !== idx
                            );
                            setCheckInForm((prev) => ({
                              ...prev,
                              positiveObservations: updated,
                            }));
                          }}
                          className="p-1.5 text-secondary-400 hover:text-red-500"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setCheckInForm((prev) => ({
                        ...prev,
                        positiveObservations: [...prev.positiveObservations, ''],
                      }))
                    }
                    className="text-xs text-primary-600 dark:text-primary-400 font-medium"
                  >
                    + Add observation
                  </button>
                </div>
              </div>

              {/* Concerns Raised */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Concerns Raised
                </label>
                <div className="space-y-2">
                  {checkInForm.concernsRaised.map((concern, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={concern}
                        onChange={(e) => {
                          const updated = [...checkInForm.concernsRaised];
                          updated[idx] = e.target.value;
                          setCheckInForm((prev) => ({
                            ...prev,
                            concernsRaised: updated,
                          }));
                        }}
                        placeholder="Concern"
                        className="flex-1 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      {checkInForm.concernsRaised.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = checkInForm.concernsRaised.filter(
                              (_, i) => i !== idx
                            );
                            setCheckInForm((prev) => ({
                              ...prev,
                              concernsRaised: updated,
                            }));
                          }}
                          className="p-1.5 text-secondary-400 hover:text-red-500"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setCheckInForm((prev) => ({
                        ...prev,
                        concernsRaised: [...prev.concernsRaised, ''],
                      }))
                    }
                    className="text-xs text-primary-600 dark:text-primary-400 font-medium"
                  >
                    + Add concern
                  </button>
                </div>
              </div>

              {/* Manager & Employee Feedback */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Manager Feedback <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={checkInForm.managerFeedback}
                  onChange={(e) =>
                    setCheckInForm((prev) => ({ ...prev, managerFeedback: e.target.value }))
                  }
                  required
                  rows={3}
                  placeholder="Provide your feedback..."
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Employee Feedback
                </label>
                <textarea
                  value={checkInForm.employeeFeedback}
                  onChange={(e) =>
                    setCheckInForm((prev) => ({ ...prev, employeeFeedback: e.target.value }))
                  }
                  rows={2}
                  placeholder="Record employee's feedback (optional)..."
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Action Items */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Action Items
                </label>
                <div className="space-y-3">
                  {checkInForm.actionItems.map((action, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={action.item}
                          onChange={(e) => {
                            const updated = [...checkInForm.actionItems];
                            updated[idx] = { ...updated[idx], item: e.target.value };
                            setCheckInForm((prev) => ({ ...prev, actionItems: updated }));
                          }}
                          placeholder="Action item"
                          className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={action.assignee}
                            onChange={(e) => {
                              const updated = [...checkInForm.actionItems];
                              updated[idx] = { ...updated[idx], assignee: e.target.value };
                              setCheckInForm((prev) => ({ ...prev, actionItems: updated }));
                            }}
                            placeholder="Assignee (optional)"
                            className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                          <input
                            type="date"
                            value={action.dueDate}
                            onChange={(e) => {
                              const updated = [...checkInForm.actionItems];
                              updated[idx] = { ...updated[idx], dueDate: e.target.value };
                              setCheckInForm((prev) => ({ ...prev, actionItems: updated }));
                            }}
                            className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                      </div>
                      {checkInForm.actionItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = checkInForm.actionItems.filter((_, i) => i !== idx);
                            setCheckInForm((prev) => ({ ...prev, actionItems: updated }));
                          }}
                          className="self-start p-1.5 text-secondary-400 hover:text-red-500"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setCheckInForm((prev) => ({
                        ...prev,
                        actionItems: [
                          ...prev.actionItems,
                          { item: '', assignee: '', dueDate: '' },
                        ],
                      }))
                    }
                    className="text-xs text-primary-600 dark:text-primary-400 font-medium"
                  >
                    + Add action item
                  </button>
                </div>
              </div>

              {/* Next Steps */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Next Steps
                </label>
                <div className="space-y-2">
                  {checkInForm.nextSteps.map((step, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => {
                          const updated = [...checkInForm.nextSteps];
                          updated[idx] = e.target.value;
                          setCheckInForm((prev) => ({ ...prev, nextSteps: updated }));
                        }}
                        placeholder="Next step"
                        className="flex-1 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      {checkInForm.nextSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = checkInForm.nextSteps.filter((_, i) => i !== idx);
                            setCheckInForm((prev) => ({ ...prev, nextSteps: updated }));
                          }}
                          className="p-1.5 text-secondary-400 hover:text-red-500"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setCheckInForm((prev) => ({
                        ...prev,
                        nextSteps: [...prev.nextSteps, ''],
                      }))
                    }
                    className="text-xs text-primary-600 dark:text-primary-400 font-medium"
                  >
                    + Add next step
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200/60 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowAddCheckInModal(false)}
                  className="px-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-primary-50/30 dark:hover:bg-white/[0.03] text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addCheckInMutation.isPending}
                  className="bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {addCheckInMutation.isPending ? 'Saving...' : 'Save Check-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close PIP Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-2xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Close Performance Improvement Plan
              </h2>
              <button
                onClick={() => setShowCloseModal(false)}
                className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 dark:text-secondary-400"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleClose} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Outcome <span className="text-red-500">*</span>
                </label>
                <select
                  value={closeForm.outcome}
                  onChange={(e) =>
                    setCloseForm((prev) => ({ ...prev, outcome: e.target.value }))
                  }
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="SUCCESSFUL">Successful - Employee met PIP requirements</option>
                  <option value="UNSUCCESSFUL">
                    Unsuccessful - Employee did not meet requirements
                  </option>
                  <option value="EXTENDED">Extended - PIP period extended</option>
                  <option value="TERMINATED">Terminated - PIP terminated early</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={closeForm.notes}
                  onChange={(e) =>
                    setCloseForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={4}
                  placeholder="Provide closing notes and rationale for the outcome..."
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200/60 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-primary-50/30 dark:hover:bg-white/[0.03] text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={closeMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {closeMutation.isPending ? 'Closing...' : 'Close PIP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Acknowledge PIP Modal */}
      {showAcknowledgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-2xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Acknowledge PIP
              </h2>
              <button
                onClick={() => setShowAcknowledgeModal(false)}
                className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 dark:text-secondary-400"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                By acknowledging this PIP, you confirm that you have read and understand the
                performance improvement plan, its requirements, timeline, and consequences. This
                does not mean you agree with all points raised.
              </p>
            </div>

            <form onSubmit={handleAcknowledge} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Comments (Optional)
                </label>
                <textarea
                  value={acknowledgeForm.comments}
                  onChange={(e) =>
                    setAcknowledgeForm((prev) => ({ ...prev, comments: e.target.value }))
                  }
                  rows={4}
                  placeholder="Add any comments or responses you would like to include with your acknowledgment..."
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200/60 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowAcknowledgeModal(false)}
                  className="px-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-primary-50/30 dark:hover:bg-white/[0.03] text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={acknowledgeMutation.isPending}
                  className="bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {acknowledgeMutation.isPending ? 'Acknowledging...' : 'Acknowledge PIP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
