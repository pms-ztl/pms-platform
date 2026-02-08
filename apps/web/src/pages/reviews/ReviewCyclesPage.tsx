import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  PencilSquareIcon,
  XMarkIcon,
  BellAlertIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format, differenceInDays } from 'date-fns';

import {
  reviewsApi,
  adminConfigApi,
  type ReviewCycle,
  type ReviewCycleStats,
  type CreateReviewCycleInput,
} from '@/lib/api';
import { useAuthStore, hasRole } from '@/store/auth';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CYCLE_TYPES = [
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'SEMI_ANNUAL', label: 'Semi-Annual' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'PROBATION', label: 'Probation' },
  { value: 'PROJECT', label: 'Project' },
] as const;

const STATUS_OPTIONS = ['DRAFT', 'ACTIVE', 'CALIBRATION', 'FINALIZED', 'CLOSED'] as const;

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-200',
  ACTIVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  CALIBRATION: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  FINALIZED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
  CLOSED: 'bg-secondary-200 text-secondary-700 dark:bg-secondary-600 dark:text-secondary-300',
};

const TYPE_COLORS: Record<string, string> = {
  ANNUAL: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  SEMI_ANNUAL: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
  QUARTERLY: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  MONTHLY: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
  PROBATION: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  PROJECT: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300',
};

const WORKFLOW_STAGES = ['Draft', 'Active', 'Calibration', 'Finalized', 'Closed'] as const;

const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReviewCyclesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isHR = hasRole(user?.roles ?? [], ['HR_ADMIN', 'ADMIN', 'SUPER_ADMIN']);

  // -- Local UI state -------------------------------------------------------
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailCycleId, setDetailCycleId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  // -- Queries --------------------------------------------------------------
  const { data: allCycles = [], isLoading: loadingCycles } = useQuery({
    queryKey: ['review-cycles-all'],
    queryFn: () => reviewsApi.listCycles({}),
  });

  const { data: templates } = useQuery({
    queryKey: ['review-templates'],
    queryFn: () => adminConfigApi.listTemplates(),
    enabled: showCreateModal,
  });

  const activeCycle = useMemo(
    () => allCycles.find((c: ReviewCycle) => c.status === 'ACTIVE'),
    [allCycles],
  );

  const { data: activeCycleStats } = useQuery({
    queryKey: ['cycle-stats', activeCycle?.id],
    queryFn: () => reviewsApi.getCycleStats(activeCycle!.id),
    enabled: !!activeCycle,
  });

  const { data: detailCycle } = useQuery({
    queryKey: ['cycle-detail', detailCycleId],
    queryFn: () => reviewsApi.getCycle(detailCycleId!),
    enabled: !!detailCycleId,
  });

  const { data: detailStats } = useQuery({
    queryKey: ['cycle-stats', detailCycleId],
    queryFn: () => reviewsApi.getCycleStats(detailCycleId!),
    enabled: !!detailCycleId,
  });

  // -- Mutations ------------------------------------------------------------
  const createMutation = useMutation({
    mutationFn: (data: CreateReviewCycleInput) => reviewsApi.createCycle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-cycles-all'] });
      setShowCreateModal(false);
      toast.success('Review cycle created successfully');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create cycle'),
  });

  const launchMutation = useMutation({
    mutationFn: (id: string) => reviewsApi.launchCycle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-cycles-all'] });
      toast.success('Review cycle launched');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to launch cycle'),
  });

  // -- Derived / filtered data ----------------------------------------------
  const filtered = useMemo(() => {
    let list = [...allCycles];
    if (statusFilter !== 'ALL') list = list.filter((c) => c.status === statusFilter);
    if (typeFilter !== 'ALL') list = list.filter((c) => c.type === typeFilter);
    list.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    return list;
  }, [allCycles, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const cycleStats = useMemo(() => {
    const total = allCycles.length;
    const active = allCycles.filter((c: ReviewCycle) => c.status === 'ACTIVE').length;
    const totalReviews = allCycles.reduce((s: number, c: ReviewCycle) => s + (c.reviewCount ?? 0), 0);
    const completedCycles = allCycles.filter(
      (c: ReviewCycle) => c.status === 'FINALIZED' || c.status === 'CLOSED',
    );
    const avgCompletion =
      completedCycles.length > 0
        ? Math.round(completedCycles.reduce((s: number) => s + 100, 0) / completedCycles.length)
        : activeCycleStats
          ? Math.round(activeCycleStats.completionRate)
          : 0;
    return { total, active, avgCompletion, pending: totalReviews };
  }, [allCycles, activeCycleStats]);

  // -- Active cycle helpers -------------------------------------------------
  const activeDaysRemaining = activeCycle
    ? Math.max(0, differenceInDays(new Date(activeCycle.endDate), new Date()))
    : 0;
  const activeCompletionPct = activeCycleStats?.completionRate ?? 0;
  const activeCompleted = activeCycleStats
    ? activeCycleStats.submitted + activeCycleStats.calibrated + activeCycleStats.finalized + activeCycleStats.acknowledged
    : 0;
  const activeTotal = activeCycleStats?.total ?? 0;

  // -- Workflow stage index -------------------------------------------------
  const stageIndex = (status: string): number => {
    const map: Record<string, number> = { DRAFT: 0, ACTIVE: 1, CALIBRATION: 2, FINALIZED: 3, CLOSED: 4 };
    return map[status] ?? 0;
  };

  // =========================================================================
  // Render helpers
  // =========================================================================

  const renderWorkflowIndicator = (status: string) => {
    const idx = stageIndex(status);
    return (
      <div className="flex items-center gap-1 mt-3">
        {WORKFLOW_STAGES.map((stage, i) => (
          <div key={stage} className="flex items-center">
            <div
              className={clsx(
                'flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold transition-colors',
                i < idx
                  ? 'bg-emerald-500 text-white'
                  : i === idx
                    ? 'bg-primary-600 text-white ring-2 ring-primary-300 dark:ring-primary-700'
                    : 'bg-secondary-200 text-secondary-500 dark:bg-secondary-700 dark:text-secondary-400',
              )}
            >
              {i < idx ? <CheckCircleIcon className="w-4 h-4" /> : i + 1}
            </div>
            {i < WORKFLOW_STAGES.length - 1 && (
              <div
                className={clsx(
                  'w-6 h-0.5 mx-0.5',
                  i < idx ? 'bg-emerald-500' : 'bg-secondary-300 dark:bg-secondary-600',
                )}
              />
            )}
          </div>
        ))}
        <span className="ml-2 text-xs text-secondary-500 dark:text-secondary-400">
          {WORKFLOW_STAGES[idx]}
        </span>
      </div>
    );
  };

  // -- Stacked progress bar for detail slide-over ---------------------------
  const renderStackedBar = (stats: ReviewCycleStats) => {
    const segments = [
      { label: 'Not Started', count: stats.notStarted, color: 'bg-secondary-400' },
      { label: 'In Progress', count: stats.inProgress, color: 'bg-blue-500' },
      { label: 'Submitted', count: stats.submitted, color: 'bg-amber-500' },
      { label: 'Calibrated', count: stats.calibrated, color: 'bg-indigo-500' },
      { label: 'Finalized', count: stats.finalized, color: 'bg-emerald-500' },
      { label: 'Acknowledged', count: stats.acknowledged, color: 'bg-teal-500' },
    ];
    const total = stats.total || 1;
    return (
      <div>
        <div className="flex h-4 rounded-full overflow-hidden bg-secondary-200 dark:bg-secondary-700">
          {segments.map((seg) =>
            seg.count > 0 ? (
              <div
                key={seg.label}
                className={clsx(seg.color, 'transition-all duration-500')}
                style={{ width: `${(seg.count / total) * 100}%` }}
                title={`${seg.label}: ${seg.count}`}
              />
            ) : null,
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-1.5 text-xs text-secondary-600 dark:text-secondary-400">
              <span className={clsx('w-2.5 h-2.5 rounded-full', seg.color)} />
              {seg.label}: {seg.count}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // =========================================================================
  // Main render
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Review Cycles</h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">
            Create and manage performance review cycles
          </p>
        </div>
        {isHR && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Create New Cycle
          </button>
        )}
      </div>

      {/* ── Active Cycle Banner ──────────────────────────────────────────── */}
      {activeCycle && (
        <div className="relative overflow-hidden rounded-2xl border border-primary-200 dark:border-primary-800 bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-primary-900/30 dark:via-secondary-800 dark:to-blue-900/20 p-6 shadow-lg">
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-primary-200/30 dark:bg-primary-700/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-semibold', STATUS_COLORS.ACTIVE)}>
                    ACTIVE
                  </span>
                  <span className="text-xs text-secondary-500 dark:text-secondary-400">
                    {activeDaysRemaining} day{activeDaysRemaining !== 1 ? 's' : ''} remaining
                  </span>
                </div>
                <h2 className="text-xl font-bold text-secondary-900 dark:text-white truncate">
                  {activeCycle.name}
                </h2>
                <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
                  {format(new Date(activeCycle.startDate), 'MMM d, yyyy')} &ndash;{' '}
                  {format(new Date(activeCycle.endDate), 'MMM d, yyyy')}
                </p>

                {/* Progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-secondary-700 dark:text-secondary-300">
                      {activeCompleted}/{activeTotal} reviews completed
                    </span>
                    <span className="font-bold text-primary-600 dark:text-primary-400">
                      {Math.round(activeCompletionPct)}%
                    </span>
                  </div>
                  <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-500 to-blue-400 transition-all duration-700"
                      style={{ width: `${Math.min(activeCompletionPct, 100)}%` }}
                    />
                  </div>
                </div>

                {renderWorkflowIndicator(activeCycle.status)}
              </div>

              {/* Quick actions */}
              {isHR && (
                <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end">
                  <button
                    onClick={() => setDetailCycleId(activeCycle.id)}
                    className="btn-secondary text-sm"
                  >
                    <ChartBarIcon className="h-4 w-4 mr-1.5" />
                    View Details
                  </button>
                  <button
                    onClick={() => toast.success('Reminders sent to pending reviewers')}
                    className="btn-secondary text-sm"
                  >
                    <BellAlertIcon className="h-4 w-4 mr-1.5" />
                    Send Reminders
                  </button>
                  <button
                    onClick={() => toast('Cycle closure initiated', { icon: '🔒' })}
                    className="btn-secondary text-sm text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    <XMarkIcon className="h-4 w-4 mr-1.5" />
                    Close Cycle
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Stats Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Cycles',
            value: cycleStats.total,
            icon: DocumentTextIcon,
            color: 'from-violet-500 to-purple-400',
            bg: 'bg-violet-500',
          },
          {
            label: 'Active Cycles',
            value: cycleStats.active,
            icon: PlayIcon,
            color: 'from-blue-500 to-cyan-400',
            bg: 'bg-blue-500',
          },
          {
            label: 'Avg Completion Rate',
            value: `${cycleStats.avgCompletion}%`,
            icon: ChartBarIcon,
            color: 'from-emerald-500 to-teal-400',
            bg: 'bg-emerald-500',
          },
          {
            label: 'Reviews Pending',
            value: cycleStats.pending,
            icon: ClockIcon,
            color: 'from-amber-500 to-orange-400',
            bg: 'bg-amber-500',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-xl bg-white dark:bg-secondary-800 p-5 border border-secondary-100 dark:border-secondary-700 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={clsx('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r', card.color)} />
            <div className="flex items-center gap-4">
              <div className={clsx('p-2.5 rounded-xl text-white', card.bg)}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">{card.label}</p>
                <p className="text-2xl font-bold text-secondary-900 dark:text-white">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <FunnelIcon className="h-5 w-5 text-secondary-400" />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input w-40 text-sm"
        >
          <option value="ALL">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="input w-40 text-sm"
        >
          <option value="ALL">All Types</option>
          {CYCLE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        {(statusFilter !== 'ALL' || typeFilter !== 'ALL') && (
          <button
            onClick={() => { setStatusFilter('ALL'); setTypeFilter('ALL'); setPage(1); }}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Cycles Table ─────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {loadingCycles ? (
          <div className="flex justify-center py-16">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
            <h3 className="mt-3 text-sm font-medium text-secondary-900 dark:text-white">No cycles found</h3>
            <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
              {statusFilter !== 'ALL' || typeFilter !== 'ALL'
                ? 'Try adjusting your filters.'
                : 'Get started by creating a new review cycle.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
              <thead className="bg-secondary-50 dark:bg-secondary-800/50">
                <tr>
                  {['Cycle Name', 'Type', 'Status', 'Start Date', 'End Date', 'Reviews', 'Completion', 'Actions'].map(
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
              <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
                {paginated.map((cycle: ReviewCycle) => {
                  const completionPct = cycle.reviewCount && cycle.reviewCount > 0 ? 0 : 0; // placeholder; real data from stats
                  return (
                    <tr
                      key={cycle.id}
                      className="hover:bg-secondary-50 dark:hover:bg-secondary-800/40 transition-colors cursor-pointer"
                      onClick={() => setDetailCycleId(cycle.id)}
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-secondary-900 dark:text-white">
                          {cycle.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('px-2 py-0.5 rounded-full text-[11px] font-semibold', TYPE_COLORS[cycle.type] || TYPE_COLORS.ANNUAL)}>
                          {cycle.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-semibold', STATUS_COLORS[cycle.status] || STATUS_COLORS.DRAFT)}>
                          {cycle.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-600 dark:text-secondary-400">
                        {format(new Date(cycle.startDate), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-600 dark:text-secondary-400">
                        {format(new Date(cycle.endDate), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-secondary-900 dark:text-white">
                        {cycle.reviewCount ?? '--'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary-500 transition-all"
                              style={{ width: `${completionPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-secondary-500 dark:text-secondary-400">
                            {completionPct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {isHR && cycle.status === 'DRAFT' && (
                            <button
                              onClick={() => launchMutation.mutate(cycle.id)}
                              disabled={launchMutation.isPending}
                              className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              title="Launch Cycle"
                            >
                              <PlayIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDetailCycleId(cycle.id)}
                            className="p-1.5 rounded-lg text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                            title="View Stats"
                          >
                            <ChartBarIcon className="h-4 w-4" />
                          </button>
                          {isHR && cycle.status === 'DRAFT' && (
                            <button
                              className="p-1.5 rounded-lg text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                              title="Edit Cycle"
                              onClick={() => toast('Edit functionality coming soon')}
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                          )}
                          {isHR && (cycle.status === 'ACTIVE' || cycle.status === 'FINALIZED') && (
                            <button
                              className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                              title="Close Cycle"
                              onClick={() => toast('Close cycle functionality coming soon')}
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-secondary-200 dark:border-secondary-700">
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              Showing {(page - 1) * PAGE_SIZE + 1}--{Math.min(page * PAGE_SIZE, filtered.length)} of{' '}
              {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-40 transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={clsx(
                    'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                    p === page
                      ? 'bg-primary-600 text-white'
                      : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700',
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-40 transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create Cycle Modal ───────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowCreateModal(false)}
            />
            <div className="relative bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-secondary-200/50 dark:border-secondary-700/50 animate-scale-in">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                  Create Review Cycle
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-secondary-500" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const startDate = fd.get('startDate') as string;
                  const endDate = fd.get('endDate') as string;
                  createMutation.mutate({
                    name: fd.get('name') as string,
                    description: fd.get('description') as string,
                    type: fd.get('type') as string,
                    startDate: startDate ? new Date(startDate).toISOString() : '',
                    endDate: endDate ? new Date(endDate).toISOString() : '',
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="label">Cycle Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="input"
                    placeholder="e.g., Q2 2026 Annual Review"
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    name="description"
                    rows={2}
                    className="input"
                    placeholder="Brief description of this review cycle"
                  />
                </div>
                <div>
                  <label className="label">Cycle Type</label>
                  <select name="type" className="input" defaultValue="ANNUAL">
                    {CYCLE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Start Date</label>
                    <input name="startDate" type="date" required className="input" />
                  </div>
                  <div>
                    <label className="label">End Date</label>
                    <input name="endDate" type="date" required className="input" />
                  </div>
                </div>
                <div>
                  <label className="label">Review Template</label>
                  <select name="templateId" className="input">
                    <option value="">-- Select template (optional) --</option>
                    {(templates ?? []).map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name || t.title}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300">
                    <input type="checkbox" name="autoAssign" className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500" />
                    Auto-assign reviewers
                  </label>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300">
                    <input type="checkbox" name="selfAssessment" defaultChecked className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500" />
                    Include self-assessment
                  </label>
                  <label className="flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300">
                    <input type="checkbox" name="peerFeedback" className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500" />
                    Include peer feedback
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                    {createMutation.isPending ? 'Creating...' : 'Create Cycle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Cycle Detail Slide-over ──────────────────────────────────────── */}
      {detailCycleId && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDetailCycleId(null)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-secondary-800 shadow-2xl border-l border-secondary-200 dark:border-secondary-700 flex flex-col animate-slide-in-right">
            {/* Slide-over header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Cycle Details
              </h2>
              <button
                onClick={() => setDetailCycleId(null)}
                className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-secondary-500" />
              </button>
            </div>

            {/* Slide-over body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {detailCycle ? (
                <>
                  {/* Cycle info */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-semibold', STATUS_COLORS[detailCycle.status])}>
                        {detailCycle.status}
                      </span>
                      <span className={clsx('px-2 py-0.5 rounded-full text-[11px] font-semibold', TYPE_COLORS[detailCycle.type] || TYPE_COLORS.ANNUAL)}>
                        {detailCycle.type.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-secondary-900 dark:text-white">
                      {detailCycle.name}
                    </h3>
                    {detailCycle.description && (
                      <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
                        {detailCycle.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3 text-sm text-secondary-600 dark:text-secondary-400">
                      <CalendarDaysIcon className="h-4 w-4" />
                      {format(new Date(detailCycle.startDate), 'MMM d, yyyy')} &ndash;{' '}
                      {format(new Date(detailCycle.endDate), 'MMM d, yyyy')}
                    </div>
                    {renderWorkflowIndicator(detailCycle.status)}
                  </div>

                  {/* Stats grid */}
                  {detailStats && (
                    <div>
                      <h4 className="text-sm font-semibold text-secondary-900 dark:text-white mb-3">
                        Review Statistics
                      </h4>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {[
                          { label: 'Total', value: detailStats.total, color: 'text-secondary-900 dark:text-white' },
                          { label: 'Not Started', value: detailStats.notStarted, color: 'text-secondary-500' },
                          { label: 'In Progress', value: detailStats.inProgress, color: 'text-blue-600 dark:text-blue-400' },
                          { label: 'Submitted', value: detailStats.submitted, color: 'text-amber-600 dark:text-amber-400' },
                          { label: 'Calibrated', value: detailStats.calibrated, color: 'text-indigo-600 dark:text-indigo-400' },
                          { label: 'Finalized', value: detailStats.finalized, color: 'text-emerald-600 dark:text-emerald-400' },
                          { label: 'Acknowledged', value: detailStats.acknowledged, color: 'text-teal-600 dark:text-teal-400' },
                          { label: 'Completion', value: `${Math.round(detailStats.completionRate)}%`, color: 'text-primary-600 dark:text-primary-400' },
                        ].map((s) => (
                          <div
                            key={s.label}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-secondary-50 dark:bg-secondary-800/50"
                          >
                            <span className="text-xs text-secondary-500 dark:text-secondary-400">{s.label}</span>
                            <span className={clsx('text-sm font-bold', s.color)}>{s.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Stacked bar */}
                      <h4 className="text-sm font-semibold text-secondary-900 dark:text-white mb-2">
                        Progress Breakdown
                      </h4>
                      {renderStackedBar(detailStats)}
                    </div>
                  )}

                  {/* Bulk actions */}
                  {isHR && (
                    <div>
                      <h4 className="text-sm font-semibold text-secondary-900 dark:text-white mb-3">
                        Bulk Actions
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => toast.success('Reminders sent to all pending reviewers')}
                          className="btn-secondary text-sm"
                        >
                          <BellAlertIcon className="h-4 w-4 mr-1.5" />
                          Send Reminders
                        </button>
                        <button
                          onClick={() => toast.success('Bulk reviewer assignment started')}
                          className="btn-secondary text-sm"
                        >
                          <UserGroupIcon className="h-4 w-4 mr-1.5" />
                          Bulk Assign Reviewers
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Reviews in cycle placeholder */}
                  <div>
                    <h4 className="text-sm font-semibold text-secondary-900 dark:text-white mb-3">
                      Reviews in This Cycle
                    </h4>
                    {detailStats && detailStats.total > 0 ? (
                      <div className="space-y-2">
                        {[
                          { label: 'Not Started', count: detailStats.notStarted, icon: ClockIcon, badgeColor: 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-300' },
                          { label: 'In Progress', count: detailStats.inProgress, icon: ArrowPathIcon, badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
                          { label: 'Submitted', count: detailStats.submitted, icon: DocumentTextIcon, badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
                          { label: 'Finalized', count: detailStats.finalized, icon: CheckCircleIcon, badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
                          { label: 'Acknowledged', count: detailStats.acknowledged, icon: CheckCircleIcon, badgeColor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
                        ]
                          .filter((item) => item.count > 0)
                          .map((item) => (
                            <div
                              key={item.label}
                              className="flex items-center justify-between p-3 rounded-lg bg-secondary-50 dark:bg-secondary-800/50"
                            >
                              <div className="flex items-center gap-2">
                                <item.icon className="h-4 w-4 text-secondary-400" />
                                <span className="text-sm text-secondary-700 dark:text-secondary-300">{item.label}</span>
                              </div>
                              <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold', item.badgeColor)}>
                                {item.count}
                              </span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <ExclamationTriangleIcon className="mx-auto h-8 w-8 text-secondary-300 dark:text-secondary-600" />
                        <p className="mt-2 text-sm text-secondary-500 dark:text-secondary-400">
                          No reviews assigned to this cycle yet.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex justify-center py-16">
                  <ArrowPathIcon className="h-8 w-8 animate-spin text-primary-500" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
