import { useState, useEffect, useCallback } from 'react';
import {
  ArrowUpCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  InboxIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/store/auth';

// ---------------------------------------------------------------------------
// API Helper
// ---------------------------------------------------------------------------

const SA_API_URL = '/api/admin';

async function saFetch(url: string, options?: any) {
  const token = useAuthStore.getState().accessToken;
  const res = await axios({
    url: SA_API_URL + url,
    headers: { Authorization: 'Bearer ' + token },
    ...options,
  });
  return res.data;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UpgradeRequest {
  id: string;
  tenantId: string;
  tenantName: string;
  currentPlan: string;
  requestedPlan: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  requestedBy?: string;
}

interface PaginatedResponse {
  items: UpgradeRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
type ModalAction = 'approve' | 'reject' | null;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

const STATUS_BADGE_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const PLAN_BADGE_STYLES: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  STARTER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  PROFESSIONAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  ENTERPRISE: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatPlanLabel(plan: string): string {
  return plan.charAt(0) + plan.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SAUpgradeRequestsPage() {
  // State
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Modal state
  const [modalAction, setModalAction] = useState<ModalAction>(null);
  const [selectedRequest, setSelectedRequest] = useState<UpgradeRequest | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch pending count
  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await saFetch('/upgrade-requests/pending-count');
      if (res.success) {
        setPendingCount(res.data.count);
      }
    } catch {
      // Silently fail - count is supplementary
    }
  }, []);

  // Fetch upgrade requests
  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }
      const res = await saFetch('/upgrade-requests?' + params.toString());
      if (res.success) {
        setData(res.data);
      } else {
        setError('Failed to load upgrade requests.');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load upgrade requests.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => { fetchPendingCount(); }, [fetchPendingCount]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  function openModal(action: 'approve' | 'reject', request: UpgradeRequest) {
    setModalAction(action);
    setSelectedRequest(request);
    setActionNotes('');
  }

  function closeModal() {
    setModalAction(null);
    setSelectedRequest(null);
    setActionNotes('');
    setIsSubmitting(false);
  }

  async function handleSubmitAction() {
    if (!selectedRequest || !modalAction) return;

    if (modalAction === 'reject' && !actionNotes.trim()) {
      toast.error('Please provide a reason for rejection.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saFetch(
        `/upgrade-requests/${selectedRequest.id}/${modalAction}`,
        { method: 'POST', data: { notes: actionNotes.trim() || undefined } }
      );
      toast.success(
        modalAction === 'approve'
          ? 'Upgrade request approved successfully.'
          : 'Upgrade request rejected.'
      );
      closeModal();
      fetchRequests();
      fetchPendingCount();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        `Failed to ${modalAction} request.`;
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-600/20">
            <ArrowUpCircleIcon className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Upgrade Requests
              </h1>
              {pendingCount > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  {pendingCount} pending
                </span>
              )}
            </div>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Review and manage tenant plan upgrade requests
            </p>
          </div>
        </div>
        <button
          onClick={() => { fetchRequests(); fetchPendingCount(); }}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className={clsx('h-4 w-4', isLoading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={clsx(
                  'px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  statusFilter === tab.key
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300'
                )}
              >
                {tab.label}
                {tab.key === 'PENDING' && pendingCount > 0 && (
                  <span
                    className={clsx(
                      'ml-2 px-1.5 py-0.5 rounded-full text-xs font-medium',
                      statusFilter === 'PENDING'
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    )}
                  >
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchRequests} />
          ) : items.length === 0 ? (
            <EmptyState statusFilter={statusFilter} />
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider">Tenant</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider">Current Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider">Requested Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider max-w-[200px]">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{req.tenantName}</p>
                          {req.requestedBy && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">by {req.requestedBy}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', PLAN_BADGE_STYLES[req.currentPlan] ?? PLAN_BADGE_STYLES.FREE)}>
                          {formatPlanLabel(req.currentPlan)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', PLAN_BADGE_STYLES[req.requestedPlan] ?? PLAN_BADGE_STYLES.FREE)}>
                            {formatPlanLabel(req.requestedPlan)}
                          </span>
                          <ArrowUpCircleIcon className="h-4 w-4 text-green-500 dark:text-green-400 shrink-0" />
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-[200px]">
                        <p className="text-sm text-gray-600 dark:text-gray-300 break-words" title={req.reason}>{req.reason || '--'}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', STATUS_BADGE_STYLES[req.status] ?? STATUS_BADGE_STYLES.CANCELLED)}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(req.createdAt)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {req.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openModal('approve', req)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 dark:hover:text-green-400 rounded-lg transition-colors" title="Approve request">
                              <CheckCircleIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => openModal('reject', req)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded-lg transition-colors" title="Reject request">
                              <XCircleIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <StatusLabel status={req.status} notes={req.notes} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Showing{' '}
                    <span className="font-medium text-gray-700 dark:text-gray-300">{(page - 1) * PAGE_SIZE + 1}</span>
                    {' - '}
                    <span className="font-medium text-gray-700 dark:text-gray-300">{Math.min(page * PAGE_SIZE, total)}</span>
                    {' of '}
                    <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span>{' '}
                    results
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!hasPrevPage}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                      Previous
                    </button>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={!hasNextPage}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {modalAction && selectedRequest && (
        <ActionModal
          action={modalAction}
          request={selectedRequest}
          notes={actionNotes}
          onNotesChange={setActionNotes}
          isSubmitting={isSubmitting}
          onClose={closeModal}
          onSubmit={handleSubmitAction}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status Label (for non-pending rows)
// ---------------------------------------------------------------------------

function StatusLabel({ status, notes }: { status: string; notes?: string }) {
  const label =
    status === 'APPROVED'
      ? 'Approved'
      : status === 'REJECTED'
        ? 'Rejected'
        : 'Closed';

  if (notes) {
    return (
      <span
        title={notes}
        className="text-xs text-gray-400 dark:text-gray-500 italic cursor-help underline decoration-dotted"
      >
        {label}
      </span>
    );
  }

  return (
    <span className="text-xs text-gray-400 dark:text-gray-500 italic">{label}</span>
  );
}

// ---------------------------------------------------------------------------
// Loading State
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading upgrade requests...</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error State
// ---------------------------------------------------------------------------

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <XCircleIcon className="h-10 w-10 text-red-400 mb-3" />
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Something went wrong</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md text-center">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <ArrowPathIcon className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ statusFilter }: { statusFilter: StatusFilter }) {
  const messages: Record<StatusFilter, string> = {
    ALL: 'No upgrade requests have been submitted yet.',
    PENDING: 'There are no pending upgrade requests to review.',
    APPROVED: 'No approved upgrade requests found.',
    REJECTED: 'No rejected upgrade requests found.',
    CANCELLED: 'No cancelled upgrade requests found.',
  };

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <InboxIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No requests found</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{messages[statusFilter]}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action Modal (Approve / Reject)
// ---------------------------------------------------------------------------

interface ActionModalProps {
  action: 'approve' | 'reject';
  request: UpgradeRequest;
  notes: string;
  onNotesChange: (val: string) => void;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

function ActionModal({
  action,
  request,
  notes,
  onNotesChange,
  isSubmitting,
  onClose,
  onSubmit,
}: ActionModalProps) {
  const isApprove = action === 'approve';
  const title = isApprove ? 'Approve Upgrade Request' : 'Reject Upgrade Request';
  const confirmLabel = isApprove ? 'Approve' : 'Reject';
  const confirmColor = isApprove
    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
  const iconColor = isApprove ? 'text-green-500' : 'text-red-500';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              {isApprove ? (
                <CheckCircleIcon className={clsx('h-6 w-6', iconColor)} />
              ) : (
                <XCircleIcon className={clsx('h-6 w-6', iconColor)} />
              )}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {/* Request summary */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Tenant</span>
                <span className="font-medium text-gray-900 dark:text-white">{request.tenantName}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500 dark:text-gray-400">Plan Change</span>
                <div className="flex items-center gap-2">
                  <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', PLAN_BADGE_STYLES[request.currentPlan] ?? PLAN_BADGE_STYLES.FREE)}>
                    {formatPlanLabel(request.currentPlan)}
                  </span>
                  <span className="text-gray-400">&rarr;</span>
                  <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', PLAN_BADGE_STYLES[request.requestedPlan] ?? PLAN_BADGE_STYLES.FREE)}>
                    {formatPlanLabel(request.requestedPlan)}
                  </span>
                </div>
              </div>
              {request.reason && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reason</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{request.reason}</p>
                </div>
              )}
            </div>

            {/* Notes textarea */}
            <div>
              <label htmlFor="action-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Notes
                {!isApprove && <span className="text-red-500 ml-1">*</span>}
                {isApprove && <span className="text-gray-400 dark:text-gray-500 ml-1 font-normal">(optional)</span>}
              </label>
              <textarea
                id="action-notes"
                rows={3}
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder={isApprove ? 'Add any notes about the approval...' : 'Provide a reason for rejecting this request...'}
                className={clsx(
                  'w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:outline-none transition-colors resize-none',
                  !isApprove && !notes.trim()
                    ? 'border-gray-300 dark:border-gray-600 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500'
                )}
              />
              {!isApprove && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  A rejection reason is required so the tenant understands why.
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting || (!isApprove && !notes.trim())}
              className={clsx(
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
                confirmColor
              )}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  {isApprove ? (
                    <CheckCircleIcon className="h-4 w-4" />
                  ) : (
                    <XCircleIcon className="h-4 w-4" />
                  )}
                  {confirmLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
