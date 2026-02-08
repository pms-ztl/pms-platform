import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';
import {
  promotionsApi,
  evidenceApi,
  usersApi,
  type PromotionDecision,
  type CreatePromotionInput,
  type Evidence,
} from '@/lib/api';
import { useAuthStore } from '@/store/auth';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROMOTION_STATUSES = [
  'ALL', 'DRAFT', 'NOMINATED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DEFERRED', 'IMPLEMENTED',
] as const;

const PROMOTION_TYPES = [
  'ALL', 'TITLE_CHANGE', 'LEVEL_PROMOTION', 'ROLE_CHANGE', 'LATERAL_MOVE',
] as const;

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300',
  NOMINATED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  DEFERRED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  IMPLEMENTED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

const typeLabels: Record<string, string> = {
  TITLE_CHANGE: 'Title Change',
  LEVEL_PROMOTION: 'Level Promotion',
  ROLE_CHANGE: 'Role Change',
  LATERAL_MOVE: 'Lateral Move',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  NOMINATED: 'Nominated',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  DEFERRED: 'Deferred',
  IMPLEMENTED: 'Implemented',
};

const AVATAR_COLORS = [
  'bg-primary-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-violet-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(firstName?: string, lastName?: string): string {
  return `${(firstName || '?')[0]}${(lastName || '?')[0]}`.toUpperCase();
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PromotionsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Filters & pagination
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // UI state
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeferModal, setShowDeferModal] = useState<string | null>(null);

  // Create form state
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formType, setFormType] = useState('LEVEL_PROMOTION');
  const [formProposedRole, setFormProposedRole] = useState('');
  const [formProposedLevel, setFormProposedLevel] = useState('');
  const [formJustification, setFormJustification] = useState('');
  const [formEffectiveDate, setFormEffectiveDate] = useState('');
  const [formEvidenceSearch, setFormEvidenceSearch] = useState('');
  const [formLinkedEvidence, setFormLinkedEvidence] = useState<Evidence[]>([]);

  // Defer form state
  const [deferReason, setDeferReason] = useState('');
  const [deferUntil, setDeferUntil] = useState('');

  // ----- Data Fetching -----

  const queryParams = useMemo(() => ({
    page,
    limit,
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
  }), [page, limit, statusFilter]);

  const { data: promotionsData, isLoading } = useQuery({
    queryKey: ['promotions', queryParams],
    queryFn: () => promotionsApi.list(queryParams),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['promotions-summary'],
    queryFn: () => promotionsApi.getSummary(),
  });

  const { data: reports } = useQuery({
    queryKey: ['my-reports'],
    queryFn: () => usersApi.getMyReports(),
    enabled: showCreateModal,
  });

  const { data: evidenceResults } = useQuery({
    queryKey: ['evidence-search', formEvidenceSearch],
    queryFn: () => evidenceApi.list({ limit: 10 }),
    enabled: showCreateModal && formEvidenceSearch.length > 0,
  });

  // ----- Filtering -----

  const promotions = promotionsData?.data || [];
  const meta = promotionsData?.meta || { total: 0, page: 1, limit, totalPages: 1 };

  const filteredPromotions = useMemo(() => {
    let result = promotions;
    if (typeFilter !== 'ALL') {
      result = result.filter((p: PromotionDecision) => p.promotionType === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p: PromotionDecision) => {
        const name = `${p.employee?.firstName || ''} ${p.employee?.lastName || ''}`.toLowerCase();
        return name.includes(q);
      });
    }
    return result;
  }, [promotions, typeFilter, search]);

  // ----- Mutations -----

  const createMutation = useMutation({
    mutationFn: (data: CreatePromotionInput) => promotionsApi.create(data),
    onSuccess: async (created) => {
      for (const ev of formLinkedEvidence) {
        try {
          await promotionsApi.linkEvidence(created.id, ev.id);
        } catch { /* ignore individual link failures */ }
      }
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['promotions-summary'] });
      resetCreateForm();
      toast.success('Promotion nomination created successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create nomination');
    },
  });

  const startReviewMutation = useMutation({
    mutationFn: (id: string) => promotionsApi.startReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['promotions-summary'] });
      toast.success('Review started');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to start review'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => promotionsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['promotions-summary'] });
      toast.success('Promotion approved');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => promotionsApi.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['promotions-summary'] });
      toast.success('Promotion rejected');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to reject'),
  });

  const deferMutation = useMutation({
    mutationFn: ({ id, reason, until }: { id: string; reason: string; until?: string }) =>
      promotionsApi.defer(id, { reason, deferUntil: until }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['promotions-summary'] });
      setShowDeferModal(null);
      setDeferReason('');
      setDeferUntil('');
      toast.success('Promotion deferred');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to defer'),
  });

  const implementMutation = useMutation({
    mutationFn: (id: string) => promotionsApi.implement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['promotions-summary'] });
      toast.success('Promotion implemented');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to implement'),
  });

  // ----- Helpers -----

  const resetCreateForm = () => {
    setShowCreateModal(false);
    setFormEmployeeId('');
    setFormType('LEVEL_PROMOTION');
    setFormProposedRole('');
    setFormProposedLevel('');
    setFormJustification('');
    setFormEffectiveDate('');
    setFormEvidenceSearch('');
    setFormLinkedEvidence([]);
  };

  const selectedEmployee = useMemo(() => {
    if (!formEmployeeId || !reports) return null;
    return reports.find((r: any) => r.id === formEmployeeId) || null;
  }, [formEmployeeId, reports]);

  const isManager = user?.roles?.some((r: string) =>
    ['ADMIN', 'HR_MANAGER', 'MANAGER', 'DEPARTMENT_HEAD'].includes(r)
  );

  const canPerformAction = (status: string, action: string): boolean => {
    if (!isManager) return false;
    switch (action) {
      case 'startReview': return status === 'NOMINATED';
      case 'approve': return status === 'UNDER_REVIEW';
      case 'reject': return status === 'UNDER_REVIEW';
      case 'defer': return status === 'UNDER_REVIEW' || status === 'NOMINATED';
      case 'implement': return status === 'APPROVED';
      default: return false;
    }
  };

  // =========================================================================
  // Render: Summary Cards
  // =========================================================================

  const summaryCards = [
    { label: 'Total Nominations', value: summaryData?.total ?? 0, color: 'primary' as const },
    { label: 'Under Review', value: summaryData?.underReview ?? 0, color: 'blue' as const },
    { label: 'Approved', value: summaryData?.approved ?? 0, color: 'green' as const },
    { label: 'Implemented', value: summaryData?.implemented ?? 0, color: 'purple' as const },
  ];

  const cardColorMap: Record<string, { iconBg: string; iconText: string }> = {
    primary: { iconBg: 'bg-primary-100 dark:bg-primary-900/40', iconText: 'text-primary-600 dark:text-primary-400' },
    blue: { iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconText: 'text-blue-600 dark:text-blue-400' },
    green: { iconBg: 'bg-green-100 dark:bg-green-900/40', iconText: 'text-green-600 dark:text-green-400' },
    purple: { iconBg: 'bg-purple-100 dark:bg-purple-900/40', iconText: 'text-purple-600 dark:text-purple-400' },
  };

  const cardIcons = [DocumentTextIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon];

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Promotion Management</h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">
            Manage promotion nominations and approvals
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nominate for Promotion
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryCards.map((card, idx) => {
          const Icon = cardIcons[idx];
          const c = cardColorMap[card.color];
          return (
            <div key={card.label} className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-4">
              <div className="flex items-center gap-3">
                <div className={clsx('p-2 rounded-lg', c.iconBg)}>
                  <Icon className={clsx('h-5 w-5', c.iconText)} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">{card.label}</p>
                  <p className="text-lg font-bold text-secondary-900 dark:text-white">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-sm px-3 py-1.5 text-secondary-700 dark:text-secondary-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          {PROMOTION_STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : statusLabels[s] || s}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-sm px-3 py-1.5 text-secondary-700 dark:text-secondary-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          {PROMOTION_TYPES.map((t) => (
            <option key={t} value={t}>{t === 'ALL' ? 'All Types' : typeLabels[t] || t}</option>
          ))}
        </select>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee name..."
            className="pl-9 pr-3 py-1.5 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-sm text-secondary-700 dark:text-secondary-300 placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-64"
          />
        </div>
        {(statusFilter !== 'ALL' || typeFilter !== 'ALL' || search) && (
          <button
            onClick={() => { setStatusFilter('ALL'); setTypeFilter('ALL'); setSearch(''); setPage(1); }}
            className="text-xs text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-200 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
        </div>
      ) : filteredPromotions.length === 0 ? (
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 text-center py-16">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
          <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">No promotions found</h3>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            {statusFilter !== 'ALL' || typeFilter !== 'ALL' || search
              ? 'Try adjusting your filters to see more results.'
              : 'Get started by creating a new promotion nomination.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
              <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">Role Change</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">Level</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">Nominated By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                {filteredPromotions.map((promo: PromotionDecision) => {
                  const isExpanded = expandedRowId === promo.id;
                  const empName = `${promo.employee?.firstName || ''} ${promo.employee?.lastName || ''}`.trim();
                  return (
                    <PromotionRow
                      key={promo.id}
                      promo={promo}
                      empName={empName}
                      isExpanded={isExpanded}
                      onToggleExpand={() => setExpandedRowId(isExpanded ? null : promo.id)}
                      canPerformAction={canPerformAction}
                      onStartReview={() => startReviewMutation.mutate(promo.id)}
                      onApprove={() => approveMutation.mutate(promo.id)}
                      onReject={() => rejectMutation.mutate(promo.id)}
                      onDefer={() => setShowDeferModal(promo.id)}
                      onImplement={() => implementMutation.mutate(promo.id)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-secondary-200 dark:border-secondary-700">
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                Showing {(meta.page - 1) * meta.limit + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeftIcon className="h-4 w-4" /> Previous
                </button>
                <span className="text-sm text-secondary-600 dark:text-secondary-400">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Nomination Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={resetCreateForm} />
            <div className="relative bg-white dark:bg-secondary-800 rounded-xl shadow-xl max-w-lg w-full p-6 border border-secondary-200 dark:border-secondary-700 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Nominate for Promotion</h2>
                <button onClick={resetCreateForm} className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
                  <XMarkIcon className="h-5 w-5 text-secondary-500 dark:text-secondary-400" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!formEmployeeId) { toast.error('Please select an employee'); return; }
                  if (formJustification.trim().length < 50) { toast.error('Justification must be at least 50 characters'); return; }
                  createMutation.mutate({
                    employeeId: formEmployeeId,
                    promotionType: formType,
                    proposedRole: formProposedRole || undefined,
                    proposedLevel: formProposedLevel ? parseInt(formProposedLevel, 10) : undefined,
                    justification: formJustification.trim(),
                    effectiveDate: formEffectiveDate ? new Date(formEffectiveDate).toISOString() : undefined,
                  });
                }}
                className="space-y-4"
              >
                {/* Employee Selector */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Employee <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formEmployeeId}
                    onChange={(e) => setFormEmployeeId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                  >
                    <option value="">Select an employee...</option>
                    {(reports || []).map((r: any) => (
                      <option key={r.id} value={r.id}>
                        {r.firstName} {r.lastName}{r.jobTitle ? ` - ${r.jobTitle}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Promotion Type */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Promotion Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                  >
                    {PROMOTION_TYPES.filter((t) => t !== 'ALL').map((t) => (
                      <option key={t} value={t}>{typeLabels[t]}</option>
                    ))}
                  </select>
                </div>

                {/* Current Role (read-only) + Proposed Role */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Current Role</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedEmployee?.jobTitle || ''}
                      placeholder="Select employee first"
                      className="w-full rounded-lg border border-secondary-200 dark:border-secondary-600 bg-secondary-50 dark:bg-secondary-900 px-3 py-2 text-sm text-secondary-500 dark:text-secondary-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                      Proposed Role <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formProposedRole}
                      onChange={(e) => setFormProposedRole(e.target.value)}
                      placeholder="e.g., Senior Engineer"
                      className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Current Level (read-only) + Proposed Level */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Current Level</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedEmployee?.level ?? ''}
                      placeholder="Auto-filled"
                      className="w-full rounded-lg border border-secondary-200 dark:border-secondary-600 bg-secondary-50 dark:bg-secondary-900 px-3 py-2 text-sm text-secondary-500 dark:text-secondary-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Proposed Level</label>
                    <input
                      type="number"
                      min="1"
                      value={formProposedLevel}
                      onChange={(e) => setFormProposedLevel(e.target.value)}
                      placeholder="e.g., 5"
                      className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Justification */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Justification <span className="text-red-500">*</span>
                    <span className="ml-2 text-xs font-normal text-secondary-400">(min 50 characters)</span>
                  </label>
                  <textarea
                    value={formJustification}
                    onChange={(e) => setFormJustification(e.target.value)}
                    rows={4}
                    required
                    minLength={50}
                    placeholder="Provide a detailed justification for this promotion nomination..."
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors resize-none"
                  />
                  <p className={clsx('text-xs mt-1', formJustification.length >= 50 ? 'text-green-600 dark:text-green-400' : 'text-secondary-400')}>
                    {formJustification.length}/50 characters minimum
                  </p>
                </div>

                {/* Effective Date */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Effective Date</label>
                  <input
                    type="date"
                    value={formEffectiveDate}
                    onChange={(e) => setFormEffectiveDate(e.target.value)}
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                  />
                </div>

                {/* Link Evidence */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Link Evidence
                  </label>
                  {formLinkedEvidence.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formLinkedEvidence.map((ev) => (
                        <span key={ev.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300">
                          <LinkIcon className="h-3 w-3" />
                          {ev.title}
                          <button type="button" onClick={() => setFormLinkedEvidence((prev) => prev.filter((e) => e.id !== ev.id))} className="ml-1 text-primary-600 hover:text-primary-800 dark:text-primary-400">
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                    <input
                      type="text"
                      value={formEvidenceSearch}
                      onChange={(e) => setFormEvidenceSearch(e.target.value)}
                      placeholder="Search evidence to attach..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                    />
                  </div>
                  {formEvidenceSearch && evidenceResults?.data && evidenceResults.data.length > 0 && (
                    <div className="mt-1 border border-secondary-200 dark:border-secondary-600 rounded-lg max-h-32 overflow-y-auto divide-y divide-secondary-100 dark:divide-secondary-700">
                      {evidenceResults.data
                        .filter((ev: Evidence) => !formLinkedEvidence.find((l) => l.id === ev.id))
                        .map((ev: Evidence) => (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => { setFormLinkedEvidence((prev) => [...prev, ev]); setFormEvidenceSearch(''); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-50 dark:hover:bg-secondary-700 text-secondary-700 dark:text-secondary-300 transition-colors"
                          >
                            <span className="font-medium">{ev.title}</span>
                            <span className="ml-2 text-xs text-secondary-400">{ev.type}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetCreateForm}
                    className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-700 hover:bg-secondary-200 dark:hover:bg-secondary-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    {createMutation.isPending ? 'Submitting...' : 'Submit Nomination'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Defer Modal */}
      {showDeferModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowDeferModal(null); setDeferReason(''); setDeferUntil(''); }} />
            <div className="relative bg-white dark:bg-secondary-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-secondary-200 dark:border-secondary-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Defer Promotion</h2>
                <button onClick={() => { setShowDeferModal(null); setDeferReason(''); setDeferUntil(''); }} className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
                  <XMarkIcon className="h-5 w-5 text-secondary-500 dark:text-secondary-400" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!deferReason.trim()) { toast.error('Please provide a reason'); return; }
                  deferMutation.mutate({
                    id: showDeferModal,
                    reason: deferReason.trim(),
                    until: deferUntil ? new Date(deferUntil).toISOString() : undefined,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={deferReason}
                    onChange={(e) => setDeferReason(e.target.value)}
                    rows={3}
                    required
                    placeholder="Explain why this promotion is being deferred..."
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Defer Until</label>
                  <input
                    type="date"
                    value={deferUntil}
                    onChange={(e) => setDeferUntil(e.target.value)}
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowDeferModal(null); setDeferReason(''); setDeferUntil(''); }}
                    className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-700 hover:bg-secondary-200 dark:hover:bg-secondary-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deferMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    {deferMutation.isPending ? 'Deferring...' : 'Defer Promotion'}
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

// ---------------------------------------------------------------------------
// Promotion Row Sub-component
// ---------------------------------------------------------------------------

function PromotionRow({
  promo,
  empName,
  isExpanded,
  onToggleExpand,
  canPerformAction,
  onStartReview,
  onApprove,
  onReject,
  onDefer,
  onImplement,
}: {
  promo: PromotionDecision;
  empName: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  canPerformAction: (status: string, action: string) => boolean;
  onStartReview: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDefer: () => void;
  onImplement: () => void;
}) {
  const initials = getInitials(promo.employee?.firstName, promo.employee?.lastName);
  const avatarColor = getAvatarColor(empName || 'U');

  return (
    <>
      <tr className="hover:bg-secondary-50 dark:hover:bg-secondary-900/30 transition-colors">
        {/* Employee */}
        <td className="px-4 py-3">
          <button onClick={onToggleExpand} className="flex items-center gap-3 text-left group">
            <div className={clsx('h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white ring-2 ring-white dark:ring-secondary-800', avatarColor)}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-secondary-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {empName || 'Unknown'}
              </p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">
                {promo.employee?.jobTitle || 'No title'}
              </p>
            </div>
            {isExpanded ? (
              <ChevronUpIcon className="h-4 w-4 text-secondary-400 shrink-0" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-secondary-400 shrink-0" />
            )}
          </button>
        </td>
        {/* Type */}
        <td className="px-4 py-3">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300">
            {typeLabels[promo.promotionType] || promo.promotionType}
          </span>
        </td>
        {/* Role Change */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-sm text-secondary-700 dark:text-secondary-300">
            <span className="truncate max-w-[100px]">{promo.currentRole || 'N/A'}</span>
            <ArrowRightIcon className="h-3.5 w-3.5 text-secondary-400 shrink-0" />
            <span className="truncate max-w-[100px] font-medium">{promo.proposedRole || 'N/A'}</span>
          </div>
        </td>
        {/* Level */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-sm text-secondary-700 dark:text-secondary-300">
            <span>{promo.currentLevel ?? '-'}</span>
            <ArrowRightIcon className="h-3.5 w-3.5 text-secondary-400 shrink-0" />
            <span className="font-medium">{promo.proposedLevel ?? '-'}</span>
          </div>
        </td>
        {/* Status */}
        <td className="px-4 py-3">
          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', statusColors[promo.status] || 'bg-secondary-100 text-secondary-800')}>
            {statusLabels[promo.status] || promo.status}
          </span>
        </td>
        {/* Nominated By */}
        <td className="px-4 py-3 text-sm text-secondary-600 dark:text-secondary-400">
          {promo.nominatedBy ? `${promo.nominatedBy.firstName} ${promo.nominatedBy.lastName}` : '-'}
        </td>
        {/* Date */}
        <td className="px-4 py-3 text-sm text-secondary-600 dark:text-secondary-400">
          {format(new Date(promo.createdAt), 'MMM d, yyyy')}
        </td>
        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            {canPerformAction(promo.status, 'startReview') && (
              <button onClick={onStartReview} className="px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition-colors">
                Review
              </button>
            )}
            {canPerformAction(promo.status, 'approve') && (
              <button onClick={onApprove} className="px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 rounded transition-colors">
                Approve
              </button>
            )}
            {canPerformAction(promo.status, 'reject') && (
              <button onClick={onReject} className="px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors">
                Reject
              </button>
            )}
            {canPerformAction(promo.status, 'defer') && (
              <button onClick={onDefer} className="px-2 py-1 text-xs font-medium text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 rounded transition-colors">
                Defer
              </button>
            )}
            {canPerformAction(promo.status, 'implement') && (
              <button onClick={onImplement} className="px-2 py-1 text-xs font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded transition-colors">
                Implement
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded Detail Row */}
      {isExpanded && (
        <tr>
          <td colSpan={8} className="px-4 py-0">
            <div className="py-4 pl-11 space-y-3 border-l-2 border-primary-200 dark:border-primary-800 ml-4 mb-2">
              {/* Justification */}
              {promo.justification && (
                <div>
                  <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-1">Justification</p>
                  <p className="text-sm text-secondary-700 dark:text-secondary-300 whitespace-pre-wrap">{promo.justification}</p>
                </div>
              )}
              {/* Effective Date */}
              {promo.effectiveDate && (
                <div>
                  <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-1">Effective Date</p>
                  <p className="text-sm text-secondary-700 dark:text-secondary-300">{format(new Date(promo.effectiveDate), 'MMMM d, yyyy')}</p>
                </div>
              )}
              {/* Approval Timeline placeholder */}
              <div>
                <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-1">Timeline</p>
                <div className="flex items-center gap-2 text-xs text-secondary-500 dark:text-secondary-400">
                  <span>Created {format(new Date(promo.createdAt), 'MMM d, yyyy')}</span>
                  {promo.status !== 'DRAFT' && promo.status !== 'NOMINATED' && (
                    <>
                      <span className="text-secondary-300 dark:text-secondary-600">&bull;</span>
                      <span className={clsx(
                        promo.status === 'APPROVED' || promo.status === 'IMPLEMENTED' ? 'text-green-600 dark:text-green-400' :
                        promo.status === 'REJECTED' ? 'text-red-600 dark:text-red-400' :
                        promo.status === 'DEFERRED' ? 'text-orange-600 dark:text-orange-400' :
                        ''
                      )}>
                        {statusLabels[promo.status] || promo.status}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
