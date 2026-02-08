import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { pipApi, usersApi, type PIP, type PIPCheckIn, type PIPMilestone, type User } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import {
  PlusIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format, differenceInDays, parseISO } from 'date-fns';

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

interface CreatePIPFormState {
  userId: string;
  pipTitle: string;
  pipType: string;
  severity: string;
  startDate: string;
  endDate: string;
  reviewFrequency: string;
  performanceIssues: Array<{ issue: string; details: string }>;
  impactStatement: string;
  performanceExpectations: string;
  specificGoals: Array<{ goal: string; metric: string }>;
  measurableObjectives: Array<{ objective: string; target: string }>;
  successCriteria: Array<{ criterion: string }>;
  supportProvided: Array<{ support: string }>;
  trainingRequired: string[];
  consequencesOfNonCompliance: string;
}

const initialFormState: CreatePIPFormState = {
  userId: '',
  pipTitle: '',
  pipType: 'PERFORMANCE',
  severity: 'STANDARD',
  startDate: '',
  endDate: '',
  reviewFrequency: 'WEEKLY',
  performanceIssues: [{ issue: '', details: '' }],
  impactStatement: '',
  performanceExpectations: '',
  specificGoals: [{ goal: '', metric: '' }],
  measurableObjectives: [{ objective: '', target: '' }],
  successCriteria: [{ criterion: '' }],
  supportProvided: [{ support: '' }],
  trainingRequired: [],
  consequencesOfNonCompliance: '',
};

export function PIPPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formState, setFormState] = useState<CreatePIPFormState>(initialFormState);
  const [trainingInput, setTrainingInput] = useState('');

  const limit = 12;

  const { data: pipsData, isLoading } = useQuery({
    queryKey: ['pips', { status: statusFilter, page, limit }],
    queryFn: () =>
      pipApi.list({
        status: statusFilter || undefined,
        page,
        limit,
      }),
  });

  const { data: reports } = useQuery({
    queryKey: ['my-reports'],
    queryFn: () => usersApi.getMyReports(),
    enabled: showCreateModal,
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof pipApi.create>[0]) => pipApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pips'] });
      setShowCreateModal(false);
      setFormState(initialFormState);
      toast.success('Performance Improvement Plan created successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create PIP');
    },
  });

  const pips = pipsData?.data || [];
  const meta = pipsData?.meta || { total: 0, page: 1, limit, totalPages: 1 };

  const filteredPips = severityFilter
    ? pips.filter((pip: PIP) => pip.severity === severityFilter)
    : pips;

  const getDaysRemaining = (endDate: string): number => {
    return differenceInDays(parseISO(endDate), new Date());
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formState.userId) {
      toast.error('Please select an employee');
      return;
    }
    if (!formState.pipTitle.trim()) {
      toast.error('Please enter a PIP title');
      return;
    }
    if (!formState.startDate || !formState.endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    const cleanedIssues = formState.performanceIssues
      .filter((i) => i.issue.trim())
      .map((i) => ({ issue: i.issue.trim(), details: i.details.trim() || undefined }));
    const cleanedGoals = formState.specificGoals
      .filter((g) => g.goal.trim())
      .map((g) => ({ goal: g.goal.trim(), metric: g.metric.trim() || undefined }));
    const cleanedObjectives = formState.measurableObjectives
      .filter((o) => o.objective.trim())
      .map((o) => ({ objective: o.objective.trim(), target: o.target.trim() || undefined }));
    const cleanedCriteria = formState.successCriteria.filter((c) => c.criterion.trim());
    const cleanedSupport = formState.supportProvided.filter((s) => s.support.trim());

    if (cleanedIssues.length === 0) {
      toast.error('Please add at least one performance issue');
      return;
    }

    createMutation.mutate({
      userId: formState.userId,
      pipTitle: formState.pipTitle.trim(),
      pipType: formState.pipType,
      severity: formState.severity,
      startDate: new Date(formState.startDate).toISOString(),
      endDate: new Date(formState.endDate).toISOString(),
      reviewFrequency: formState.reviewFrequency,
      performanceIssues: cleanedIssues,
      impactStatement: formState.impactStatement.trim(),
      performanceExpectations: formState.performanceExpectations.trim(),
      specificGoals: cleanedGoals,
      measurableObjectives: cleanedObjectives,
      successCriteria: cleanedCriteria,
      supportProvided: cleanedSupport,
      trainingRequired: formState.trainingRequired,
      consequencesOfNonCompliance: formState.consequencesOfNonCompliance.trim(),
    });
  };

  const addTrainingTag = () => {
    const tag = trainingInput.trim();
    if (tag && !formState.trainingRequired.includes(tag)) {
      setFormState((prev) => ({
        ...prev,
        trainingRequired: [...prev.trainingRequired, tag],
      }));
      setTrainingInput('');
    }
  };

  const removeTrainingTag = (tag: string) => {
    setFormState((prev) => ({
      ...prev,
      trainingRequired: prev.trainingRequired.filter((t) => t !== tag),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
            Performance Improvement Plans
          </h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">
            Manage and monitor employee performance improvement plans
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 inline-flex items-center gap-2 font-medium text-sm transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Create PIP
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-4 w-4 text-secondary-500 dark:text-secondary-400" />
          <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Filters:</span>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-sm px-3 py-1.5 text-secondary-700 dark:text-secondary-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_TRACK">On Track</option>
          <option value="AT_RISK">At Risk</option>
          <option value="SUCCESSFUL">Successful</option>
          <option value="UNSUCCESSFUL">Unsuccessful</option>
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-sm px-3 py-1.5 text-secondary-700 dark:text-secondary-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">All Severities</option>
          <option value="STANDARD">Standard</option>
          <option value="SERIOUS">Serious</option>
          <option value="FINAL_WARNING">Final Warning</option>
        </select>
        {(statusFilter || severityFilter) && (
          <button
            onClick={() => {
              setStatusFilter('');
              setSeverityFilter('');
              setPage(1);
            }}
            className="text-xs text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-200 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* PIP Cards */}
      {filteredPips.length === 0 ? (
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 text-center py-16 px-6">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
          <h3 className="mt-3 text-sm font-medium text-secondary-900 dark:text-white">
            No Performance Improvement Plans found
          </h3>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            {statusFilter || severityFilter
              ? 'Try adjusting your filters to see more results.'
              : 'Get started by creating a new PIP for an employee.'}
          </p>
          {!statusFilter && !severityFilter && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 inline-flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Create PIP
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPips.map((pip: PIP) => {
            const daysRemaining = getDaysRemaining(pip.endDate);
            return (
              <Link
                key={pip.id}
                to={`/pip/${pip.id}`}
                className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-5 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all group"
              >
                {/* Top row: avatar + name + severity */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
                      {pip.user?.avatarUrl ? (
                        <img
                          src={pip.user.avatarUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                          {pip.user?.firstName?.[0]}
                          {pip.user?.lastName?.[0]}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">
                        {pip.user?.firstName} {pip.user?.lastName}
                      </p>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">
                        {pip.user?.jobTitle || 'Employee'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                      severityColors[pip.severity] || 'bg-secondary-100 text-secondary-800'
                    )}
                  >
                    {pip.severity === 'FINAL_WARNING' ? 'Final Warning' : pip.severity}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-2 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {pip.pipTitle}
                </h3>

                {/* Badges row */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      statusColors[pip.status] || 'bg-secondary-100 text-secondary-800'
                    )}
                  >
                    {pip.status.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      pipTypeColors[pip.pipType] || 'bg-secondary-100 text-secondary-800'
                    )}
                  >
                    {pip.pipType}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300">
                    {reviewFrequencyLabels[pip.reviewFrequency] || pip.reviewFrequency}
                  </span>
                </div>

                {/* Date row */}
                <div className="flex items-center gap-2 text-xs text-secondary-500 dark:text-secondary-400 mb-3">
                  <ClockIcon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    {format(parseISO(pip.startDate), 'MMM d, yyyy')} &rarr;{' '}
                    {format(parseISO(pip.endDate), 'MMM d, yyyy')}
                  </span>
                </div>

                {/* Days remaining */}
                <div className="flex items-center justify-between mb-3">
                  {daysRemaining > 0 ? (
                    <span
                      className={clsx(
                        'text-xs font-medium',
                        daysRemaining <= 7
                          ? 'text-red-600 dark:text-red-400'
                          : daysRemaining <= 14
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-secondary-600 dark:text-secondary-400'
                      )}
                    >
                      {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                    </span>
                  ) : pip.status === 'SUCCESSFUL' || pip.status === 'UNSUCCESSFUL' ? (
                    <span className="text-xs font-medium text-secondary-500 dark:text-secondary-400">
                      Completed
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                      Overdue by {Math.abs(daysRemaining)} day{Math.abs(daysRemaining) !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Footer indicators */}
                <div className="flex items-center justify-between pt-3 border-t border-secondary-100 dark:border-secondary-700">
                  <div className="flex items-center gap-1.5">
                    {pip.hrApprovedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        HR Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <ClockIcon className="h-3.5 w-3.5" />
                        Pending HR Approval
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {pip.employeeAcknowledged ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        Acknowledged
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-secondary-500 dark:text-secondary-400">
                        <XCircleIcon className="h-3.5 w-3.5" />
                        Not Acknowledged
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-secondary-600 dark:text-secondary-400">
            Showing {(meta.page - 1) * meta.limit + 1} to{' '}
            {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} plans
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | string)[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                    acc.push('...');
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  typeof p === 'string' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-secondary-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={clsx(
                        'px-3 py-1.5 text-sm rounded-lg transition-colors',
                        p === page
                          ? 'bg-primary-600 text-white'
                          : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                      )}
                    >
                      {p}
                    </button>
                  )
                )}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create PIP Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Create Performance Improvement Plan
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormState(initialFormState);
                }}
                className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 dark:text-secondary-400"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-5">
              {/* Employee selector */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Employee <span className="text-red-500">*</span>
                </label>
                <select
                  value={formState.userId}
                  onChange={(e) => setFormState((prev) => ({ ...prev, userId: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select an employee...</option>
                  {(reports || []).map((r: User) => (
                    <option key={r.id} value={r.id}>
                      {r.firstName} {r.lastName} {r.jobTitle ? `- ${r.jobTitle}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* PIP Title */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  PIP Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formState.pipTitle}
                  onChange={(e) => setFormState((prev) => ({ ...prev, pipTitle: e.target.value }))}
                  required
                  placeholder="e.g., Performance Improvement Plan - Q1 2026"
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Type + Severity row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    PIP Type
                  </label>
                  <select
                    value={formState.pipType}
                    onChange={(e) => setFormState((prev) => ({ ...prev, pipType: e.target.value }))}
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="PERFORMANCE">Performance</option>
                    <option value="BEHAVIOR">Behavior</option>
                    <option value="ATTENDANCE">Attendance</option>
                    <option value="SKILLS">Skills</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Severity
                  </label>
                  <select
                    value={formState.severity}
                    onChange={(e) => setFormState((prev) => ({ ...prev, severity: e.target.value }))}
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="SERIOUS">Serious</option>
                    <option value="FINAL_WARNING">Final Warning</option>
                  </select>
                </div>
              </div>

              {/* Dates row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formState.startDate}
                    onChange={(e) => setFormState((prev) => ({ ...prev, startDate: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formState.endDate}
                    onChange={(e) => setFormState((prev) => ({ ...prev, endDate: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Review Frequency */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Review Frequency
                </label>
                <select
                  value={formState.reviewFrequency}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, reviewFrequency: e.target.value }))
                  }
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="BI_WEEKLY">Bi-Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              {/* Performance Issues (dynamic list) */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Performance Issues <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {formState.performanceIssues.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={item.issue}
                          onChange={(e) => {
                            const updated = [...formState.performanceIssues];
                            updated[idx] = { ...updated[idx], issue: e.target.value };
                            setFormState((prev) => ({ ...prev, performanceIssues: updated }));
                          }}
                          placeholder="Issue description"
                          className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <input
                          type="text"
                          value={item.details}
                          onChange={(e) => {
                            const updated = [...formState.performanceIssues];
                            updated[idx] = { ...updated[idx], details: e.target.value };
                            setFormState((prev) => ({ ...prev, performanceIssues: updated }));
                          }}
                          placeholder="Additional details (optional)"
                          className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      {formState.performanceIssues.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formState.performanceIssues.filter((_, i) => i !== idx);
                            setFormState((prev) => ({ ...prev, performanceIssues: updated }));
                          }}
                          className="self-start p-1.5 text-secondary-400 hover:text-red-500 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setFormState((prev) => ({
                        ...prev,
                        performanceIssues: [...prev.performanceIssues, { issue: '', details: '' }],
                      }))
                    }
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                  >
                    + Add another issue
                  </button>
                </div>
              </div>

              {/* Impact Statement */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Impact Statement
                </label>
                <textarea
                  value={formState.impactStatement}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, impactStatement: e.target.value }))
                  }
                  rows={3}
                  placeholder="Describe how the performance issues impact the team, department, or organization..."
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Performance Expectations */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Performance Expectations
                </label>
                <textarea
                  value={formState.performanceExpectations}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, performanceExpectations: e.target.value }))
                  }
                  rows={3}
                  placeholder="Outline the expected performance standards..."
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Specific Goals (dynamic list) */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Specific Goals
                </label>
                <div className="space-y-3">
                  {formState.specificGoals.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={item.goal}
                          onChange={(e) => {
                            const updated = [...formState.specificGoals];
                            updated[idx] = { ...updated[idx], goal: e.target.value };
                            setFormState((prev) => ({ ...prev, specificGoals: updated }));
                          }}
                          placeholder="Goal description"
                          className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <input
                          type="text"
                          value={item.metric}
                          onChange={(e) => {
                            const updated = [...formState.specificGoals];
                            updated[idx] = { ...updated[idx], metric: e.target.value };
                            setFormState((prev) => ({ ...prev, specificGoals: updated }));
                          }}
                          placeholder="Metric (optional)"
                          className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      {formState.specificGoals.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formState.specificGoals.filter((_, i) => i !== idx);
                            setFormState((prev) => ({ ...prev, specificGoals: updated }));
                          }}
                          className="self-start p-1.5 text-secondary-400 hover:text-red-500 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setFormState((prev) => ({
                        ...prev,
                        specificGoals: [...prev.specificGoals, { goal: '', metric: '' }],
                      }))
                    }
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                  >
                    + Add another goal
                  </button>
                </div>
              </div>

              {/* Measurable Objectives (dynamic list) */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Measurable Objectives
                </label>
                <div className="space-y-3">
                  {formState.measurableObjectives.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={item.objective}
                          onChange={(e) => {
                            const updated = [...formState.measurableObjectives];
                            updated[idx] = { ...updated[idx], objective: e.target.value };
                            setFormState((prev) => ({ ...prev, measurableObjectives: updated }));
                          }}
                          placeholder="Objective description"
                          className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <input
                          type="text"
                          value={item.target}
                          onChange={(e) => {
                            const updated = [...formState.measurableObjectives];
                            updated[idx] = { ...updated[idx], target: e.target.value };
                            setFormState((prev) => ({ ...prev, measurableObjectives: updated }));
                          }}
                          placeholder="Target (optional)"
                          className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      {formState.measurableObjectives.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formState.measurableObjectives.filter(
                              (_, i) => i !== idx
                            );
                            setFormState((prev) => ({ ...prev, measurableObjectives: updated }));
                          }}
                          className="self-start p-1.5 text-secondary-400 hover:text-red-500 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setFormState((prev) => ({
                        ...prev,
                        measurableObjectives: [
                          ...prev.measurableObjectives,
                          { objective: '', target: '' },
                        ],
                      }))
                    }
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                  >
                    + Add another objective
                  </button>
                </div>
              </div>

              {/* Success Criteria (dynamic list) */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Success Criteria
                </label>
                <div className="space-y-2">
                  {formState.successCriteria.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={item.criterion}
                        onChange={(e) => {
                          const updated = [...formState.successCriteria];
                          updated[idx] = { criterion: e.target.value };
                          setFormState((prev) => ({ ...prev, successCriteria: updated }));
                        }}
                        placeholder="Success criterion"
                        className="flex-1 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      {formState.successCriteria.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formState.successCriteria.filter((_, i) => i !== idx);
                            setFormState((prev) => ({ ...prev, successCriteria: updated }));
                          }}
                          className="p-1.5 text-secondary-400 hover:text-red-500 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setFormState((prev) => ({
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

              {/* Support Provided (dynamic list) */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Support Provided
                </label>
                <div className="space-y-2">
                  {formState.supportProvided.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={item.support}
                        onChange={(e) => {
                          const updated = [...formState.supportProvided];
                          updated[idx] = { support: e.target.value };
                          setFormState((prev) => ({ ...prev, supportProvided: updated }));
                        }}
                        placeholder="Support description"
                        className="flex-1 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      {formState.supportProvided.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formState.supportProvided.filter((_, i) => i !== idx);
                            setFormState((prev) => ({ ...prev, supportProvided: updated }));
                          }}
                          className="p-1.5 text-secondary-400 hover:text-red-500 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setFormState((prev) => ({
                        ...prev,
                        supportProvided: [...prev.supportProvided, { support: '' }],
                      }))
                    }
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                  >
                    + Add another support item
                  </button>
                </div>
              </div>

              {/* Training Required (tag input) */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Training Required
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formState.trainingRequired.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTrainingTag(tag)}
                        className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={trainingInput}
                    onChange={(e) => setTrainingInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTrainingTag();
                      }
                    }}
                    placeholder="Type training name and press Enter..."
                    className="flex-1 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={addTrainingTag}
                    className="px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 text-sm transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Consequences of Non-Compliance */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Consequences of Non-Compliance
                </label>
                <textarea
                  value={formState.consequencesOfNonCompliance}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      consequencesOfNonCompliance: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Describe what will happen if the PIP goals are not met..."
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Form actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200 dark:border-secondary-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormState(initialFormState);
                  }}
                  className="px-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create PIP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
