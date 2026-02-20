import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  PencilSquareIcon,
  PaperAirplaneIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  ClockIcon,
  DocumentCheckIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

import {
  compensationApi,
  usersApi,
  evidenceApi,
  type CompensationDecision,
  type CreateCompensationInput,
} from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { usePageTitle } from '@/hooks/usePageTitle';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = ['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'IMPLEMENTED'] as const;
const TYPE_OPTIONS = ['ALL', 'MERIT_INCREASE', 'PROMOTION_RAISE', 'BONUS', 'EQUITY', 'ADJUSTMENT'] as const;
const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED'] as const;
const PAGE_SIZE = 10;

const statusColors: Record<string, string> = {
  DRAFT: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-200',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  IMPLEMENTED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

const typeLabels: Record<string, string> = {
  MERIT_INCREASE: 'Merit Increase',
  PROMOTION_RAISE: 'Promotion Raise',
  BONUS: 'Bonus',
  EQUITY: 'Equity',
  ADJUSTMENT: 'Adjustment',
};

const typeBadgeColors: Record<string, string> = {
  MERIT_INCREASE: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  PROMOTION_RAISE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  BONUS: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  EQUITY: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  ADJUSTMENT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
};

const currencySymbols: Record<string, string> = {
  USD: '$', EUR: '\u20AC', GBP: '\u00A3', INR: '\u20B9', AED: 'AED ',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtAmount(amount: number | undefined, currency = 'USD') {
  if (amount == null) return '--';
  const sym = currencySymbols[currency] ?? '';
  return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function changePct(current?: number, proposed?: number) {
  if (!current || !proposed) return null;
  return ((proposed - current) / current) * 100;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CompensationPage() {
  usePageTitle('Compensation');
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isHRAdmin = user?.roles?.includes('HR_ADMIN') || user?.roles?.includes('ADMIN') || user?.roles?.includes('SUPER_ADMIN');
  const isManager = isHRAdmin || user?.roles?.includes('MANAGER');

  // Filters & pagination
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showBudgetSection, setShowBudgetSection] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDecision, setEditingDecision] = useState<CompensationDecision | null>(null);

  // ---- Queries ----
  const { data: listResult, isLoading } = useQuery({
    queryKey: ['compensation-decisions', { page, status: statusFilter, type: typeFilter }],
    queryFn: () =>
      compensationApi.list({
        page,
        limit: PAGE_SIZE,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      }),
  });

  const { data: budgetSummary } = useQuery({
    queryKey: ['compensation-budget-summary'],
    queryFn: () => compensationApi.getBudgetSummary(),
  });

  const { data: usersResult } = useQuery({
    queryKey: ['users-list-for-comp'],
    queryFn: () => usersApi.list({ limit: 200, isActive: true }),
    enabled: showCreateModal,
  });

  const { data: evidenceResult } = useQuery({
    queryKey: ['evidence-list-for-comp'],
    queryFn: () => evidenceApi.list({ limit: 100 }),
    enabled: showCreateModal,
  });

  // ---- Mutations ----
  const createMutation = useMutation({
    mutationFn: (data: CreateCompensationInput) => compensationApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation-decisions'] });
      queryClient.invalidateQueries({ queryKey: ['compensation-budget-summary'] });
      setShowCreateModal(false);
      setEditingDecision(null);
      toast.success('Compensation decision created');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCompensationInput> }) =>
      compensationApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation-decisions'] });
      queryClient.invalidateQueries({ queryKey: ['compensation-budget-summary'] });
      setShowCreateModal(false);
      setEditingDecision(null);
      toast.success('Compensation decision updated');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update'),
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => compensationApi.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation-decisions'] });
      toast.success('Decision submitted for approval');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to submit'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => compensationApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation-decisions'] });
      toast.success('Decision approved');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => compensationApi.reject(id, { reason: 'Rejected via dashboard' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation-decisions'] });
      toast.success('Decision rejected');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to reject'),
  });

  const implementMutation = useMutation({
    mutationFn: (id: string) => compensationApi.implement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation-decisions'] });
      queryClient.invalidateQueries({ queryKey: ['compensation-budget-summary'] });
      toast.success('Decision implemented');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to implement'),
  });

  // ---- Derived data ----
  const decisions = listResult?.data ?? [];
  const meta = listResult?.meta ?? { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 };

  const filteredDecisions = useMemo(() => {
    let result = decisions;
    if (typeFilter !== 'ALL') {
      result = result.filter((d) => d.compensationType === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((d) => {
        const name = `${d.employee?.firstName ?? ''} ${d.employee?.lastName ?? ''}`.toLowerCase();
        return name.includes(q);
      });
    }
    return result;
  }, [decisions, typeFilter, search]);

  // Summary counts
  const totalCount = budgetSummary?.totalProposals ?? meta.total;
  const pendingCount = budgetSummary?.pendingApproval ?? 0;
  const approvedCount = budgetSummary?.approved ?? 0;
  const budgetUtilized = budgetSummary?.budgetUtilizedPct ?? 0;
  const departmentBudgets: Array<{
    department: string;
    allocated: number;
    used: number;
  }> = budgetSummary?.departments ?? [];

  // ---- Modal form state ----
  const [formState, setFormState] = useState<{
    employeeId: string;
    compensationType: string;
    proposedAmount: string;
    currency: string;
    justification: string;
    effectiveDate: string;
    evidenceId: string;
  }>({
    employeeId: '',
    compensationType: 'MERIT_INCREASE',
    proposedAmount: '',
    currency: 'USD',
    justification: '',
    effectiveDate: '',
    evidenceId: '',
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
    setEditingDecision(null);
    setFormState({
      employeeId: '',
      compensationType: 'MERIT_INCREASE',
      proposedAmount: '',
      currency: 'USD',
      justification: '',
      effectiveDate: '',
      evidenceId: '',
    });
    setEmployeeSearch('');
    setShowCreateModal(true);
  }

  function openEditModal(d: CompensationDecision) {
    setEditingDecision(d);
    setFormState({
      employeeId: d.employeeId,
      compensationType: d.compensationType,
      proposedAmount: d.proposedAmount?.toString() ?? '',
      currency: d.currency ?? 'USD',
      justification: d.justification ?? '',
      effectiveDate: d.effectiveDate ? format(new Date(d.effectiveDate), 'yyyy-MM-dd') : '',
      evidenceId: '',
    });
    setEmployeeSearch('');
    setShowCreateModal(true);
  }

  function handleSave(submitForApproval: boolean) {
    if (!formState.employeeId || !formState.justification.trim() || !formState.proposedAmount) {
      toast.error('Please fill all required fields');
      return;
    }
    const payload: CreateCompensationInput = {
      employeeId: formState.employeeId,
      compensationType: formState.compensationType,
      proposedAmount: parseFloat(formState.proposedAmount),
      currency: formState.currency,
      justification: formState.justification,
      effectiveDate: formState.effectiveDate || undefined,
    };
    if (editingDecision) {
      updateMutation.mutate(
        { id: editingDecision.id, data: payload },
        {
          onSuccess: () => {
            if (submitForApproval) submitMutation.mutate(editingDecision.id);
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: (created) => {
          if (submitForApproval && created?.id) submitMutation.mutate(created.id);
          if (formState.evidenceId && created?.id) {
            compensationApi.linkEvidence(created.id, formState.evidenceId).catch(() => {});
          }
        },
      });
    }
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
            Compensation Management
          </h1>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Manage compensation decisions, approvals, and budget allocation
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Budget utilization bar */}
          <div className="hidden md:flex items-center gap-3 min-w-[200px]">
            <span className="text-xs font-medium text-secondary-600 dark:text-secondary-300 whitespace-nowrap">
              Budget
            </span>
            <div className="flex-1 h-2.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-500',
                  budgetUtilized > 90 ? 'bg-red-500' : budgetUtilized > 70 ? 'bg-amber-500' : 'bg-green-500',
                )}
                style={{ width: `${Math.min(budgetUtilized, 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-secondary-700 dark:text-secondary-200">
              {(budgetUtilized ?? 0).toFixed(0)}%
            </span>
          </div>
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            New Compensation Decision
          </button>
        </div>
      </div>

      {/* ---- Summary Cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<BanknotesIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
          label="Total Proposals"
          value={totalCount}
          bgClass="bg-primary-50 dark:bg-primary-900/20"
        />
        <SummaryCard
          icon={<ClockIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />}
          label="Pending Approval"
          value={pendingCount}
          bgClass="bg-yellow-50 dark:bg-yellow-900/20"
        />
        <SummaryCard
          icon={<CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />}
          label="Approved"
          value={approvedCount}
          bgClass="bg-green-50 dark:bg-green-900/20"
        />
        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700 flex items-center gap-4">
          {/* Budget progress ring */}
          <div className="relative h-14 w-14 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor"
                className="text-secondary-200 dark:text-secondary-700" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none"
                className={clsx(
                  budgetUtilized > 90 ? 'text-red-500' : budgetUtilized > 70 ? 'text-amber-500' : 'text-green-500',
                )}
                strokeWidth="3" strokeDasharray={`${budgetUtilized} ${100 - budgetUtilized}`}
                strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-secondary-900 dark:text-white">
              {(budgetUtilized ?? 0).toFixed(0)}%
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Budget Utilized</p>
            <p className="text-xl font-bold text-secondary-900 dark:text-white">{(budgetUtilized ?? 0).toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* ---- Filters Bar ---- */}
      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-secondary-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="input-field text-sm py-1.5"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="input-field text-sm py-1.5"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t === 'ALL' ? 'All Types' : typeLabels[t] ?? t}</option>
            ))}
          </select>
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search by employee name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field text-sm py-1.5 pl-9 w-full"
            />
          </div>
        </div>
      </div>

      {/* ---- Decisions Table ---- */}
      <div className="card dark:bg-secondary-800 dark:border-secondary-700 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
          </div>
        ) : filteredDecisions.length === 0 ? (
          <div className="text-center py-16">
            <CurrencyDollarIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
            <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">No compensation decisions</h3>
            <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
              Get started by creating a new compensation decision.
            </p>
            <button onClick={openCreateModal} className="btn-primary mt-4">
              <PlusIcon className="h-5 w-5 mr-2 inline" />
              New Decision
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
                <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                  <tr>
                    {['Employee', 'Type', 'Current', 'Proposed', 'Change %', 'Status', 'Effective Date', 'Actions'].map(
                      (h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700">
                  {filteredDecisions.map((d) => {
                    const pct = changePct(d.currentAmount, d.proposedAmount);
                    const isExpanded = expandedRow === d.id;
                    return (
                      <TableRowGroup key={d.id}>
                        <tr
                          onClick={() => setExpandedRow(isExpanded ? null : d.id)}
                          className="cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-700/40 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-secondary-900 dark:text-white">
                              {d.employee ? `${d.employee.firstName} ${d.employee.lastName}` : '--'}
                            </div>
                            <div className="text-xs text-secondary-500 dark:text-secondary-400">
                              {d.employee?.jobTitle ?? ''}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', typeBadgeColors[d.compensationType] ?? 'bg-secondary-100 text-secondary-700')}>
                              {typeLabels[d.compensationType] ?? d.compensationType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">
                            {fmtAmount(d.currentAmount, d.currency)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-secondary-900 dark:text-white">
                            {fmtAmount(d.proposedAmount, d.currency)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {pct != null ? (
                              <span className={pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                {(pct ?? 0) >= 0 ? '+' : ''}{(pct ?? 0).toFixed(1)}%
                              </span>
                            ) : '--'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium', statusColors[d.status] ?? '')}>
                              {d.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">
                            {d.effectiveDate ? format(new Date(d.effectiveDate), 'MMM d, yyyy') : '--'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {d.status === 'DRAFT' && (
                                <>
                                  <ActionBtn icon={<PencilSquareIcon className="h-4 w-4" />} title="Edit" onClick={() => openEditModal(d)} />
                                  <ActionBtn icon={<PaperAirplaneIcon className="h-4 w-4" />} title="Submit" onClick={() => submitMutation.mutate(d.id)} />
                                  <ActionBtn icon={<TrashIcon className="h-4 w-4 text-red-500" />} title="Delete" onClick={() => {}} />
                                </>
                              )}
                              {d.status === 'SUBMITTED' && isManager && (
                                <>
                                  <ActionBtn icon={<CheckCircleIcon className="h-4 w-4 text-green-600" />} title="Approve" onClick={() => approveMutation.mutate(d.id)} />
                                  <ActionBtn icon={<XCircleIcon className="h-4 w-4 text-red-500" />} title="Reject" onClick={() => rejectMutation.mutate(d.id)} />
                                </>
                              )}
                              {d.status === 'APPROVED' && isHRAdmin && (
                                <ActionBtn icon={<DocumentCheckIcon className="h-4 w-4 text-purple-600" />} title="Implement" onClick={() => implementMutation.mutate(d.id)} />
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-secondary-50/50 dark:bg-secondary-900/30">
                            <td colSpan={8} className="px-6 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="font-medium text-secondary-600 dark:text-secondary-300 mb-1">Justification</p>
                                  <p className="text-secondary-700 dark:text-secondary-400">{d.justification || 'No justification provided'}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-secondary-600 dark:text-secondary-300 mb-1">Approval History</p>
                                  {d.approvedBy ? (
                                    <p className="text-secondary-700 dark:text-secondary-400">
                                      Approved by {d.approvedBy.firstName} {d.approvedBy.lastName}
                                    </p>
                                  ) : (
                                    <p className="text-secondary-400 dark:text-secondary-500 italic">No approval record yet</p>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-secondary-600 dark:text-secondary-300 mb-1">Linked Evidence</p>
                                  <p className="text-secondary-400 dark:text-secondary-500 italic">Evidence linked at creation (if any)</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </TableRowGroup>
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

      {/* ---- Budget Overview (Collapsible) ---- */}
      <div className="card dark:bg-secondary-800 dark:border-secondary-700">
        <button
          onClick={() => setShowBudgetSection(!showBudgetSection)}
          className="w-full flex items-center justify-between px-6 py-4"
        >
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Budget Overview</h2>
          {showBudgetSection
            ? <ChevronUpIcon className="h-5 w-5 text-secondary-400" />
            : <ChevronDownIcon className="h-5 w-5 text-secondary-400" />}
        </button>
        {showBudgetSection && (
          <div className="px-6 pb-6 space-y-4">
            {departmentBudgets.length === 0 ? (
              <p className="text-sm text-secondary-500 dark:text-secondary-400 text-center py-4">
                No department budget data available.
              </p>
            ) : (
              <>
                {/* Budget bar chart */}
                <div className="space-y-3">
                  {departmentBudgets.map((dept) => {
                    const pct = dept.allocated > 0 ? (dept.used / dept.allocated) * 100 : 0;
                    return (
                      <div key={dept.department}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">{dept.department}</span>
                          <span className="text-xs text-secondary-500 dark:text-secondary-400">
                            {fmtAmount(dept.used)} / {fmtAmount(dept.allocated)} ({(pct ?? 0).toFixed(0)}%)
                          </span>
                        </div>
                        <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                          <div
                            className={clsx(
                              'h-full rounded-full transition-all duration-500',
                              pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-primary-500',
                            )}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Department allocation table */}
                <div className="overflow-x-auto mt-4">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-secondary-200 dark:border-secondary-700">
                        <th className="text-left py-2 text-secondary-500 dark:text-secondary-400 font-medium">Department</th>
                        <th className="text-right py-2 text-secondary-500 dark:text-secondary-400 font-medium">Allocated</th>
                        <th className="text-right py-2 text-secondary-500 dark:text-secondary-400 font-medium">Used</th>
                        <th className="text-right py-2 text-secondary-500 dark:text-secondary-400 font-medium">Remaining</th>
                        <th className="text-right py-2 text-secondary-500 dark:text-secondary-400 font-medium">Utilization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700">
                      {departmentBudgets.map((dept) => {
                        const remaining = dept.allocated - dept.used;
                        const pct = dept.allocated > 0 ? (dept.used / dept.allocated) * 100 : 0;
                        return (
                          <tr key={dept.department}>
                            <td className="py-2 text-secondary-900 dark:text-white font-medium">{dept.department}</td>
                            <td className="py-2 text-right text-secondary-700 dark:text-secondary-300">{fmtAmount(dept.allocated)}</td>
                            <td className="py-2 text-right text-secondary-700 dark:text-secondary-300">{fmtAmount(dept.used)}</td>
                            <td className={clsx('py-2 text-right font-medium', remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                              {fmtAmount(Math.abs(remaining))}
                              {remaining < 0 && ' over'}
                            </td>
                            <td className="py-2 text-right">
                              <span className={clsx(
                                'px-2 py-0.5 rounded-full text-xs font-medium',
                                pct > 90 ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                  : pct > 70 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
                              )}>
                                {(pct ?? 0).toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ---- Create / Edit Modal ---- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                {editingDecision ? 'Edit Compensation Decision' : 'New Compensation Decision'}
              </h2>
              <button onClick={() => { setShowCreateModal(false); setEditingDecision(null); }} className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700">
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
                        onClick={() => { setFormState((s) => ({ ...s, employeeId: u.id })); setEmployeeSearch(`${u.firstName} ${u.lastName}`); }}
                        className="w-full text-left px-3 py-2 hover:bg-secondary-50 dark:hover:bg-secondary-800 text-sm text-secondary-900 dark:text-white"
                      >
                        {u.firstName} {u.lastName} {u.jobTitle ? `- ${u.jobTitle}` : ''}
                      </button>
                    ))}
                  </div>
                )}
                {selectedEmployee && (
                  <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                    Selected: {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Compensation Type</label>
                <select
                  value={formState.compensationType}
                  onChange={(e) => setFormState((s) => ({ ...s, compensationType: e.target.value }))}
                  className="input-field text-sm w-full"
                >
                  {TYPE_OPTIONS.filter((t) => t !== 'ALL').map((t) => (
                    <option key={t} value={t}>{typeLabels[t]}</option>
                  ))}
                </select>
              </div>

              {/* Amounts + Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Proposed Amount <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formState.proposedAmount}
                    onChange={(e) => setFormState((s) => ({ ...s, proposedAmount: e.target.value }))}
                    placeholder="e.g. 85000"
                    className="input-field text-sm w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Currency</label>
                  <select
                    value={formState.currency}
                    onChange={(e) => setFormState((s) => ({ ...s, currency: e.target.value }))}
                    className="input-field text-sm w-full"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Justification */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formState.justification}
                  onChange={(e) => setFormState((s) => ({ ...s, justification: e.target.value }))}
                  placeholder="Provide a business justification for this decision..."
                  className="input-field text-sm w-full resize-none"
                />
              </div>

              {/* Effective date */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={formState.effectiveDate}
                  onChange={(e) => setFormState((s) => ({ ...s, effectiveDate: e.target.value }))}
                  className="input-field text-sm w-full"
                />
              </div>

              {/* Link evidence */}
              {!editingDecision && (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    <LinkIcon className="h-4 w-4 inline mr-1" />
                    Link Evidence (optional)
                  </label>
                  <select
                    value={formState.evidenceId}
                    onChange={(e) => setFormState((s) => ({ ...s, evidenceId: e.target.value }))}
                    className="input-field text-sm w-full"
                  >
                    <option value="">None</option>
                    {(evidenceResult?.data ?? []).map((ev: any) => (
                      <option key={ev.id} value={ev.id}>{ev.title ?? ev.id}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-secondary-200 dark:border-secondary-700">
              <button
                onClick={() => { setShowCreateModal(false); setEditingDecision(null); }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-secondary text-sm"
              >
                Save as Draft
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-primary text-sm"
              >
                Submit for Approval
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

function SummaryCard({ icon, label, value, bgClass }: { icon: React.ReactNode; label: string; value: number; bgClass: string }) {
  return (
    <div className={clsx('card card-body dark:bg-secondary-800 dark:border-secondary-700 flex items-center gap-4', bgClass)}>
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">{label}</p>
        <p className="text-2xl font-bold text-secondary-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function ActionBtn({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
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

function TableRowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
