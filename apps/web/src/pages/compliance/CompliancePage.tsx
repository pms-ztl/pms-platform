import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  EyeIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format, isPast, differenceInDays } from 'date-fns';

import { api, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComplianceReview {
  id: string;
  employeeId: string;
  employee?: { id: string; firstName: string; lastName: string; jobTitle?: string };
  type: string;
  status: string;
  deadline: string;
  reviewer?: { id: string; firstName: string; lastName: string };
  reviewerId?: string;
  notes?: string;
  priority: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ComplianceDashboard {
  totalReviews: number;
  pending: number;
  completed: number;
  overdue: number;
  complianceRate: number;
  inProgress: number;
}

interface ComplianceDeadline {
  id: string;
  title: string;
  type: string;
  deadline: string;
  employee?: { id: string; firstName: string; lastName: string };
  status: string;
  daysRemaining: number;
}

interface CreateComplianceReviewInput {
  employeeId: string;
  type: string;
  deadline: string;
  notes?: string;
  priority: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'] as const;
const TYPE_OPTIONS = ['ALL', 'REVIEW_COMPLETION', 'GOAL_SETTING', 'FEEDBACK_FREQUENCY', 'CALIBRATION', 'TRAINING'] as const;
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const PAGE_SIZE = 10;

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const typeLabels: Record<string, string> = {
  REVIEW_COMPLETION: 'Review Completion',
  GOAL_SETTING: 'Goal Setting',
  FEEDBACK_FREQUENCY: 'Feedback Frequency',
  CALIBRATION: 'Calibration',
  TRAINING: 'Training',
};

const typeBadgeColors: Record<string, string> = {
  REVIEW_COMPLETION: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  GOAL_SETTING: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  FEEDBACK_FREQUENCY: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  CALIBRATION: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  TRAINING: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

const priorityColors: Record<string, string> = {
  LOW: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300',
  MEDIUM: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CompliancePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isHRAdmin = user?.roles?.includes('HR_ADMIN') || user?.roles?.includes('ADMIN') || user?.roles?.includes('SUPER_ADMIN');
  const isManager = isHRAdmin || user?.roles?.includes('MANAGER');

  // Filters & pagination
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showDeadlines, setShowDeadlines] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReview, setEditingReview] = useState<ComplianceReview | null>(null);
  const [viewingReview, setViewingReview] = useState<ComplianceReview | null>(null);

  // ---- Queries ----
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['compliance-dashboard'],
    queryFn: () => api.get<ComplianceDashboard>('/compliance/dashboard'),
  });

  const { data: listResult, isLoading } = useQuery({
    queryKey: ['compliance-reviews', { page, status: statusFilter, type: typeFilter }],
    queryFn: () =>
      api.getPaginated<ComplianceReview>('/compliance/reviews', {
        page,
        limit: PAGE_SIZE,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      }),
  });

  const { data: deadlinesData } = useQuery({
    queryKey: ['compliance-deadlines'],
    queryFn: () => api.get<ComplianceDeadline[]>('/compliance/deadlines'),
  });

  const { data: usersResult } = useQuery({
    queryKey: ['users-list-for-compliance'],
    queryFn: () => usersApi.list({ limit: 200, isActive: true }),
    enabled: showCreateModal,
  });

  // ---- Mutations ----
  const createMutation = useMutation({
    mutationFn: (data: CreateComplianceReviewInput) =>
      api.post<ComplianceReview>('/compliance/reviews', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-deadlines'] });
      setShowCreateModal(false);
      setEditingReview(null);
      toast.success('Compliance review created');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateComplianceReviewInput> }) =>
      api.put<ComplianceReview>(`/compliance/reviews/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-deadlines'] });
      setShowCreateModal(false);
      setEditingReview(null);
      toast.success('Compliance review updated');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update'),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      api.post<ComplianceReview>(`/compliance/reviews/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-deadlines'] });
      toast.success('Review marked as complete');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to complete'),
  });

  // ---- Derived data ----
  const reviews = listResult?.data ?? [];
  const meta = listResult?.meta ?? { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 };
  const deadlines = (deadlinesData ?? []) as ComplianceDeadline[];

  const dashboard: ComplianceDashboard = dashboardData ?? {
    totalReviews: meta.total,
    pending: 0,
    completed: 0,
    overdue: 0,
    complianceRate: 0,
    inProgress: 0,
  };

  const filteredReviews = useMemo(() => {
    let result = reviews;
    if (typeFilter !== 'ALL') {
      result = result.filter((r) => r.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => {
        const name = `${r.employee?.firstName ?? ''} ${r.employee?.lastName ?? ''}`.toLowerCase();
        const reviewerName = `${r.reviewer?.firstName ?? ''} ${r.reviewer?.lastName ?? ''}`.toLowerCase();
        return name.includes(q) || reviewerName.includes(q);
      });
    }
    return result;
  }, [reviews, typeFilter, search]);

  // ---- Modal form state ----
  const [formState, setFormState] = useState<{
    employeeId: string;
    type: string;
    deadline: string;
    notes: string;
    priority: string;
  }>({
    employeeId: '',
    type: 'REVIEW_COMPLETION',
    deadline: '',
    notes: '',
    priority: 'MEDIUM',
  });

  const [employeeSearch, setEmployeeSearch] = useState('');

  const filteredUsers = useMemo(() => {
    const users = usersResult?.data ?? [];
    if (!employeeSearch.trim()) return users.slice(0, 20);
    const q = employeeSearch.toLowerCase();
    return users.filter((u) => `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)).slice(0, 20);
  }, [usersResult, employeeSearch]);

  const selectedEmployee = useMemo(
    () => (usersResult?.data ?? []).find((u) => u.id === formState.employeeId),
    [usersResult, formState.employeeId],
  );

  function openCreateModal() {
    setEditingReview(null);
    setFormState({
      employeeId: '',
      type: 'REVIEW_COMPLETION',
      deadline: '',
      notes: '',
      priority: 'MEDIUM',
    });
    setEmployeeSearch('');
    setShowCreateModal(true);
  }

  function openEditModal(r: ComplianceReview) {
    setEditingReview(r);
    setFormState({
      employeeId: r.employeeId,
      type: r.type,
      deadline: r.deadline ? format(new Date(r.deadline), 'yyyy-MM-dd') : '',
      notes: r.notes ?? '',
      priority: r.priority ?? 'MEDIUM',
    });
    setEmployeeSearch(
      r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '',
    );
    setShowCreateModal(true);
  }

  function handleSave() {
    if (!formState.employeeId || !formState.deadline) {
      toast.error('Please fill all required fields');
      return;
    }
    const payload: CreateComplianceReviewInput = {
      employeeId: formState.employeeId,
      type: formState.type,
      deadline: formState.deadline,
      notes: formState.notes || undefined,
      priority: formState.priority,
    };
    if (editingReview) {
      updateMutation.mutate({ id: editingReview.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function getDeadlineUrgency(deadline: string): 'overdue' | 'urgent' | 'upcoming' | 'normal' {
    const deadlineDate = new Date(deadline);
    if (isPast(deadlineDate)) return 'overdue';
    const days = differenceInDays(deadlineDate, new Date());
    if (days <= 3) return 'urgent';
    if (days <= 7) return 'upcoming';
    return 'normal';
  }

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
            Compliance Dashboard
          </h1>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Track and manage compliance reviews, deadlines, and organizational adherence
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Compliance rate indicator */}
          <div className="hidden md:flex items-center gap-3 min-w-[200px]">
            <span className="text-xs font-medium text-secondary-600 dark:text-secondary-300 whitespace-nowrap">
              Compliance
            </span>
            <div className="flex-1 h-2.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-500',
                  dashboard.complianceRate >= 90
                    ? 'bg-green-500'
                    : dashboard.complianceRate >= 70
                      ? 'bg-amber-500'
                      : 'bg-red-500',
                )}
                style={{ width: `${Math.min(dashboard.complianceRate, 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-secondary-700 dark:text-secondary-200">
              {(dashboard.complianceRate ?? 0).toFixed(0)}%
            </span>
          </div>
          {isManager && (
            <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
              <PlusIcon className="h-5 w-5" />
              New Review
            </button>
          )}
        </div>
      </div>

      {/* ---- Summary Cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard
          icon={<ClipboardDocumentCheckIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
          label="Total Reviews"
          value={dashboard.totalReviews}
          bgClass="bg-primary-50 dark:bg-primary-900/20"
        />
        <SummaryCard
          icon={<ClockIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />}
          label="Pending"
          value={dashboard.pending}
          bgClass="bg-yellow-50 dark:bg-yellow-900/20"
        />
        <SummaryCard
          icon={<CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />}
          label="Completed"
          value={dashboard.completed}
          bgClass="bg-green-50 dark:bg-green-900/20"
        />
        <SummaryCard
          icon={<ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />}
          label="Overdue"
          value={dashboard.overdue}
          bgClass="bg-red-50 dark:bg-red-900/20"
        />
        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700 flex items-center gap-4">
          {/* Compliance rate ring */}
          <div className="relative h-14 w-14 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor"
                className="text-secondary-200 dark:text-secondary-700" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none"
                className={clsx(
                  dashboard.complianceRate >= 90
                    ? 'text-green-500'
                    : dashboard.complianceRate >= 70
                      ? 'text-amber-500'
                      : 'text-red-500',
                )}
                strokeWidth="3"
                strokeDasharray={`${dashboard.complianceRate} ${100 - dashboard.complianceRate}`}
                strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-secondary-900 dark:text-white">
              {(dashboard.complianceRate ?? 0).toFixed(0)}%
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Compliance Rate</p>
            <p className="text-xl font-bold text-secondary-900 dark:text-white">{(dashboard.complianceRate ?? 0).toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* ---- Main content area: table + deadlines sidebar ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ---- Left: Filters + Table (3 cols) ---- */}
        <div className="lg:col-span-3 space-y-4">
          {/* Status filter tabs */}
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <div className="flex flex-col gap-3">
              {/* Status tabs */}
              <div className="flex flex-wrap gap-1">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setPage(1); }}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      statusFilter === s
                        ? 'bg-primary-600 text-white dark:bg-primary-500'
                        : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200 dark:bg-secondary-700 dark:text-secondary-300 dark:hover:bg-secondary-600',
                    )}
                  >
                    {s === 'ALL' ? 'All' : s.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Type filter + search */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-5 w-5 text-secondary-400" />
                  <select
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                    className="input-field text-sm py-1.5"
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t === 'ALL' ? 'All Types' : typeLabels[t] ?? t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative flex-1 min-w-[200px]">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                  <input
                    type="text"
                    placeholder="Search by employee or reviewer name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-field text-sm py-1.5 pl-9 w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ---- Reviews Table ---- */}
          <div className="card dark:bg-secondary-800 dark:border-secondary-700 overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="text-center py-16">
                <ShieldCheckIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
                <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">
                  No compliance reviews found
                </h3>
                <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                  {statusFilter !== 'ALL' || typeFilter !== 'ALL'
                    ? 'Try adjusting your filters to see more results.'
                    : 'Get started by creating a new compliance review.'}
                </p>
                {isManager && statusFilter === 'ALL' && typeFilter === 'ALL' && (
                  <button onClick={openCreateModal} className="btn-primary mt-4">
                    <PlusIcon className="h-5 w-5 mr-2 inline" />
                    New Review
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
                    <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                      <tr>
                        {['Employee', 'Type', 'Status', 'Deadline', 'Priority', 'Reviewer', 'Last Updated', 'Actions'].map(
                          (h) => (
                            <th
                              key={h}
                              className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider"
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700">
                      {filteredReviews.map((r) => {
                        const deadlineUrgency = r.deadline ? getDeadlineUrgency(r.deadline) : 'normal';
                        return (
                          <tr
                            key={r.id}
                            className="hover:bg-secondary-50 dark:hover:bg-secondary-700/40 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-secondary-900 dark:text-white">
                                {r.employee
                                  ? `${r.employee.firstName} ${r.employee.lastName}`
                                  : '--'}
                              </div>
                              <div className="text-xs text-secondary-500 dark:text-secondary-400">
                                {r.employee?.jobTitle ?? ''}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={clsx(
                                  'px-2 py-0.5 rounded-full text-xs font-medium',
                                  typeBadgeColors[r.type] ?? 'bg-secondary-100 text-secondary-700',
                                )}
                              >
                                {typeLabels[r.type] ?? r.type}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={clsx(
                                  'px-2.5 py-0.5 rounded-full text-xs font-medium',
                                  statusColors[r.status] ?? '',
                                )}
                              >
                                {r.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div
                                className={clsx(
                                  'text-sm font-medium',
                                  deadlineUrgency === 'overdue'
                                    ? 'text-red-600 dark:text-red-400'
                                    : deadlineUrgency === 'urgent'
                                      ? 'text-orange-600 dark:text-orange-400'
                                      : 'text-secondary-700 dark:text-secondary-300',
                                )}
                              >
                                {r.deadline
                                  ? format(new Date(r.deadline), 'MMM d, yyyy')
                                  : '--'}
                              </div>
                              {r.deadline && deadlineUrgency === 'overdue' && (
                                <div className="text-xs text-red-500 dark:text-red-400">
                                  {Math.abs(differenceInDays(new Date(r.deadline), new Date()))}d overdue
                                </div>
                              )}
                              {r.deadline && deadlineUrgency === 'urgent' && (
                                <div className="text-xs text-orange-500 dark:text-orange-400">
                                  {differenceInDays(new Date(r.deadline), new Date())}d remaining
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={clsx(
                                  'px-2 py-0.5 rounded-full text-xs font-medium',
                                  priorityColors[r.priority] ?? 'bg-secondary-100 text-secondary-700',
                                )}
                              >
                                {r.priority}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">
                              {r.reviewer
                                ? `${r.reviewer.firstName} ${r.reviewer.lastName}`
                                : '--'}
                            </td>
                            <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">
                              {r.updatedAt
                                ? format(new Date(r.updatedAt), 'MMM d, yyyy')
                                : r.createdAt
                                  ? format(new Date(r.createdAt), 'MMM d, yyyy')
                                  : '--'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <ActionBtn
                                  icon={<EyeIcon className="h-4 w-4" />}
                                  title="View Details"
                                  onClick={() => setViewingReview(r)}
                                />
                                {r.status !== 'COMPLETED' && isManager && (
                                  <ActionBtn
                                    icon={<CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />}
                                    title="Mark Complete"
                                    onClick={() => completeMutation.mutate(r.id)}
                                  />
                                )}
                                {r.status !== 'COMPLETED' && isManager && (
                                  <ActionBtn
                                    icon={<PencilSquareIcon className="h-4 w-4" />}
                                    title="Edit"
                                    onClick={() => openEditModal(r)}
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-secondary-200 dark:border-secondary-700">
                  <p className="text-sm text-secondary-500 dark:text-secondary-400">
                    Showing {(meta.page - 1) * meta.limit + 1}
                    {' '}-{' '}
                    {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
                  </p>
                  <div className="flex gap-1">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-40"
                    >
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => {
                      const startPage = Math.max(1, Math.min(page - 2, meta.totalPages - 4));
                      const pageNum = startPage + i;
                      if (pageNum > meta.totalPages) return null;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={clsx(
                            'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                            pageNum === page
                              ? 'bg-primary-600 text-white dark:bg-primary-500'
                              : 'hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-700 dark:text-secondary-300',
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      disabled={page >= meta.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="p-1.5 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-40"
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ---- Right: Upcoming Deadlines Sidebar (1 col) ---- */}
        <div className="lg:col-span-1">
          <div className="card dark:bg-secondary-800 dark:border-secondary-700">
            <button
              onClick={() => setShowDeadlines(!showDeadlines)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                <h2 className="text-sm font-semibold text-secondary-900 dark:text-white">
                  Upcoming Deadlines
                </h2>
              </div>
              {showDeadlines
                ? <ChevronUpIcon className="h-4 w-4 text-secondary-400" />
                : <ChevronDownIcon className="h-4 w-4 text-secondary-400" />}
            </button>
            {showDeadlines && (
              <div className="px-4 pb-4 space-y-3">
                {deadlines.length === 0 ? (
                  <p className="text-sm text-secondary-500 dark:text-secondary-400 text-center py-4">
                    No upcoming deadlines.
                  </p>
                ) : (
                  deadlines.slice(0, 10).map((d) => {
                    const urgency = getDeadlineUrgency(d.deadline);
                    return (
                      <div
                        key={d.id}
                        className={clsx(
                          'p-3 rounded-lg border transition-colors',
                          urgency === 'overdue'
                            ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                            : urgency === 'urgent'
                              ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20'
                              : urgency === 'upcoming'
                                ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
                                : 'border-secondary-200 bg-secondary-50 dark:border-secondary-700 dark:bg-secondary-800/50',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">
                              {d.title}
                            </p>
                            {d.employee && (
                              <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
                                {d.employee.firstName} {d.employee.lastName}
                              </p>
                            )}
                          </div>
                          <span
                            className={clsx(
                              'px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0',
                              typeBadgeColors[d.type] ?? 'bg-secondary-100 text-secondary-700',
                            )}
                          >
                            {typeLabels[d.type] ?? d.type}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span
                            className={clsx(
                              'text-xs font-medium',
                              urgency === 'overdue'
                                ? 'text-red-600 dark:text-red-400'
                                : urgency === 'urgent'
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-secondary-500 dark:text-secondary-400',
                            )}
                          >
                            {format(new Date(d.deadline), 'MMM d, yyyy')}
                          </span>
                          {urgency === 'overdue' && (
                            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                              Overdue
                            </span>
                          )}
                          {urgency === 'urgent' && (
                            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                              {d.daysRemaining}d left
                            </span>
                          )}
                          {urgency === 'upcoming' && (
                            <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                              {d.daysRemaining}d left
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- View Details Modal ---- */}
      {viewingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Review Details
              </h2>
              <button
                onClick={() => setViewingReview(null)}
                className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700"
              >
                <XMarkIcon className="h-5 w-5 text-secondary-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Employee info */}
              <div>
                <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-1">
                  Employee
                </p>
                <p className="text-sm font-medium text-secondary-900 dark:text-white">
                  {viewingReview.employee
                    ? `${viewingReview.employee.firstName} ${viewingReview.employee.lastName}`
                    : '--'}
                </p>
                {viewingReview.employee?.jobTitle && (
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                    {viewingReview.employee.jobTitle}
                  </p>
                )}
              </div>

              {/* Type and Status row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-1">
                    Type
                  </p>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      typeBadgeColors[viewingReview.type] ?? 'bg-secondary-100 text-secondary-700',
                    )}
                  >
                    {typeLabels[viewingReview.type] ?? viewingReview.type}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-1">
                    Status
                  </p>
                  <span
                    className={clsx(
                      'px-2.5 py-0.5 rounded-full text-xs font-medium',
                      statusColors[viewingReview.status] ?? '',
                    )}
                  >
                    {viewingReview.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Priority and Deadline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-1">
                    Priority
                  </p>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      priorityColors[viewingReview.priority] ?? 'bg-secondary-100 text-secondary-700',
                    )}
                  >
                    {viewingReview.priority}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-1">
                    Deadline
                  </p>
                  <p className="text-sm text-secondary-700 dark:text-secondary-300">
                    {viewingReview.deadline
                      ? format(new Date(viewingReview.deadline), 'MMM d, yyyy')
                      : '--'}
                  </p>
                </div>
              </div>

              {/* Reviewer */}
              <div>
                <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-1">
                  Reviewer
                </p>
                <p className="text-sm text-secondary-700 dark:text-secondary-300">
                  {viewingReview.reviewer
                    ? `${viewingReview.reviewer.firstName} ${viewingReview.reviewer.lastName}`
                    : 'Not assigned'}
                </p>
              </div>

              {/* Notes */}
              <div>
                <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-1">
                  Notes
                </p>
                <p className="text-sm text-secondary-700 dark:text-secondary-400">
                  {viewingReview.notes || 'No notes provided'}
                </p>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-secondary-200 dark:border-secondary-700">
                <div>
                  <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-1">
                    Created
                  </p>
                  <p className="text-sm text-secondary-700 dark:text-secondary-300">
                    {viewingReview.createdAt
                      ? format(new Date(viewingReview.createdAt), 'MMM d, yyyy h:mm a')
                      : '--'}
                  </p>
                </div>
                {viewingReview.completedAt && (
                  <div>
                    <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-1">
                      Completed
                    </p>
                    <p className="text-sm text-secondary-700 dark:text-secondary-300">
                      {format(new Date(viewingReview.completedAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-secondary-200 dark:border-secondary-700">
              {viewingReview.status !== 'COMPLETED' && isManager && (
                <button
                  onClick={() => {
                    completeMutation.mutate(viewingReview.id);
                    setViewingReview(null);
                  }}
                  className="btn-primary text-sm flex items-center gap-1"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  Mark Complete
                </button>
              )}
              <button
                onClick={() => setViewingReview(null)}
                className="btn-secondary text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Create / Edit Modal ---- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                {editingReview ? 'Edit Compliance Review' : 'New Compliance Review'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingReview(null);
                }}
                className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700"
              >
                <XMarkIcon className="h-5 w-5 text-secondary-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Employee selector */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Employee <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="input-field text-sm w-full mb-1"
                />
                {employeeSearch && !formState.employeeId && (
                  <div className="border border-secondary-200 dark:border-secondary-600 rounded-lg max-h-32 overflow-y-auto bg-white dark:bg-secondary-900">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setFormState((s) => ({ ...s, employeeId: u.id }));
                          setEmployeeSearch(`${u.firstName} ${u.lastName}`);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-secondary-50 dark:hover:bg-secondary-800 text-sm text-secondary-900 dark:text-white"
                      >
                        {u.firstName} {u.lastName}
                        {u.jobTitle ? ` - ${u.jobTitle}` : ''}
                      </button>
                    ))}
                  </div>
                )}
                {selectedEmployee && (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-secondary-500 dark:text-secondary-400">
                      Selected: {selectedEmployee.firstName} {selectedEmployee.lastName}
                    </p>
                    <button
                      onClick={() => {
                        setFormState((s) => ({ ...s, employeeId: '' }));
                        setEmployeeSearch('');
                      }}
                      className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Review Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formState.type}
                  onChange={(e) => setFormState((s) => ({ ...s, type: e.target.value }))}
                  className="input-field text-sm w-full"
                >
                  {TYPE_OPTIONS.filter((t) => t !== 'ALL').map((t) => (
                    <option key={t} value={t}>
                      {typeLabels[t]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Deadline <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formState.deadline}
                  onChange={(e) => setFormState((s) => ({ ...s, deadline: e.target.value }))}
                  className="input-field text-sm w-full"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Priority
                </label>
                <div className="flex gap-2">
                  {PRIORITY_OPTIONS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setFormState((s) => ({ ...s, priority: p }))}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                        formState.priority === p
                          ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-600'
                          : 'border-secondary-200 text-secondary-600 hover:bg-secondary-50 dark:border-secondary-600 dark:text-secondary-400 dark:hover:bg-secondary-700',
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={formState.notes}
                  onChange={(e) => setFormState((s) => ({ ...s, notes: e.target.value }))}
                  placeholder="Add any additional notes or context for this review..."
                  className="input-field text-sm w-full resize-none"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-secondary-200 dark:border-secondary-700">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingReview(null);
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-primary text-sm flex items-center gap-2"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                )}
                {editingReview ? 'Update Review' : 'Create Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  icon,
  label,
  value,
  bgClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bgClass: string;
}) {
  return (
    <div
      className={clsx(
        'card card-body dark:bg-secondary-800 dark:border-secondary-700 flex items-center gap-4',
        bgClass,
      )}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
          {label}
        </p>
        <p className="text-2xl font-bold text-secondary-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function ActionBtn({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
    >
      {icon}
    </button>
  );
}
