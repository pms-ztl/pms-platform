import { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  EyeIcon,
  ArrowPathIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '@/lib/api/client';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  delegationsApi,
  type Delegation,
  type DelegationType,
  type DelegationStatus,
  type DelegationAuditEvent,
  type CreateDelegationInput,
} from '@/lib/api/delegations';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_TABS: Array<{ label: string; value: DelegationStatus | 'ALL' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Revoked', value: 'REVOKED' },
];

const STATUS_COLORS: Record<DelegationStatus, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400' },
  ACTIVE: { bg: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-700 dark:text-green-400' },
  EXPIRED: { bg: 'bg-secondary-100 dark:bg-secondary-700', text: 'text-secondary-600 dark:text-secondary-400' },
  REVOKED: { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400' },
};

const TYPE_COLORS: Record<DelegationType, { bg: string; text: string }> = {
  ACTING_MANAGER: { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-400' },
  PROXY_APPROVER: { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-400' },
  REVIEW_DELEGATE: { bg: 'bg-indigo-100 dark:bg-indigo-500/20', text: 'text-indigo-700 dark:text-indigo-400' },
  FULL_DELEGATION: { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400' },
};

const TYPE_OPTIONS: DelegationType[] = [
  'ACTING_MANAGER',
  'PROXY_APPROVER',
  'REVIEW_DELEGATE',
  'FULL_DELEGATION',
];

const TYPE_LABELS: Record<DelegationType, string> = {
  ACTING_MANAGER: 'Acting Manager',
  PROXY_APPROVER: 'Proxy Approver',
  REVIEW_DELEGATE: 'Review Delegate',
  FULL_DELEGATION: 'Full Delegation',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: DelegationStatus }) {
  const c = STATUS_COLORS[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}>
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: DelegationType }) {
  const c = TYPE_COLORS[type];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}>
      {TYPE_LABELS[type]}
    </span>
  );
}

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '--';
  return new Date(d).toLocaleDateString();
}

function userName(user?: { firstName: string; lastName: string; email: string }): string {
  if (!user) return 'Unknown';
  return `${user.firstName} ${user.lastName}`;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function DelegationManagementPage() {
  usePageTitle('Delegation Management');

  // ---- data state ----
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DelegationStatus | 'ALL'>('ALL');

  // ---- create modal state ----
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formDelegatorId, setFormDelegatorId] = useState('');
  const [formDelegateId, setFormDelegateId] = useState('');
  const [formType, setFormType] = useState<DelegationType>('ACTING_MANAGER');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formReason, setFormReason] = useState('');

  // ---- audit modal state ----
  const [auditDelegationId, setAuditDelegationId] = useState<string | null>(null);
  const [auditEvents, setAuditEvents] = useState<DelegationAuditEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // ---- action state ----
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState('');

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const loadDelegations = useCallback(async () => {
    try {
      const data = await delegationsApi.list();
      setDelegations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load delegations');
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/users?limit=100');
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      // Users list may fail silently
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      await Promise.all([loadDelegations(), loadUsers()]);
      if (!cancelled) setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [loadDelegations, loadUsers]);

  // -----------------------------------------------------------------------
  // Filtered list
  // -----------------------------------------------------------------------

  const filteredDelegations = activeTab === 'ALL'
    ? delegations
    : delegations.filter((d) => d.status === activeTab);

  // -----------------------------------------------------------------------
  // Create modal helpers
  // -----------------------------------------------------------------------

  function openCreateModal() {
    setFormDelegatorId('');
    setFormDelegateId('');
    setFormType('ACTING_MANAGER');
    setFormStartDate('');
    setFormEndDate('');
    setFormReason('');
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    setShowCreateModal(false);
  }

  async function handleCreate() {
    if (!formDelegatorId) { toast.error('Please select a delegator'); return; }
    if (!formDelegateId) { toast.error('Please select a delegate'); return; }
    if (formDelegatorId === formDelegateId) { toast.error('Delegator and delegate must be different users'); return; }
    if (!formStartDate) { toast.error('Start date is required'); return; }

    const input: CreateDelegationInput = {
      delegatorId: formDelegatorId,
      delegateId: formDelegateId,
      type: formType,
      startDate: new Date(formStartDate).toISOString(),
      ...(formEndDate ? { endDate: new Date(formEndDate).toISOString() } : {}),
      ...(formReason.trim() ? { reason: formReason.trim() } : {}),
    };

    setSaving(true);
    try {
      await delegationsApi.create(input);
      toast.success('Delegation created successfully');
      closeCreateModal();
      await loadDelegations();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create delegation');
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------------------------------------------
  // Action handlers
  // -----------------------------------------------------------------------

  async function handleApprove(id: string) {
    setActionLoading(id);
    try {
      await delegationsApi.approve(id);
      toast.success('Delegation approved');
      await loadDelegations();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve delegation');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject() {
    if (!rejectId) return;
    setActionLoading(rejectId);
    try {
      await delegationsApi.reject(rejectId, actionReason.trim() || undefined);
      toast.success('Delegation rejected');
      setRejectId(null);
      setActionReason('');
      await loadDelegations();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reject delegation');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRevoke() {
    if (!revokeId) return;
    setActionLoading(revokeId);
    try {
      await delegationsApi.revoke(revokeId, actionReason.trim() || undefined);
      toast.success('Delegation revoked');
      setRevokeId(null);
      setActionReason('');
      await loadDelegations();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to revoke delegation');
    } finally {
      setActionLoading(null);
    }
  }

  // -----------------------------------------------------------------------
  // Audit modal
  // -----------------------------------------------------------------------

  async function openAuditModal(id: string) {
    setAuditDelegationId(id);
    setAuditEvents([]);
    setAuditLoading(true);
    try {
      const events = await delegationsApi.getAudit(id);
      setAuditEvents(Array.isArray(events) ? events : []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load audit trail');
    } finally {
      setAuditLoading(false);
    }
  }

  function closeAuditModal() {
    setAuditDelegationId(null);
    setAuditEvents([]);
  }

  // -----------------------------------------------------------------------
  // Render: Loading skeleton
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Delegation Management</h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">Loading delegations...</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6 animate-pulse h-16" />
          ))}
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render: Page
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ---- Page header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Delegation Management</h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">
            Create and manage delegation assignments across your organization.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Create Delegation
        </button>
      </div>

      {/* ---- Tab bar ---- */}
      <div className="border-b border-secondary-200 dark:border-secondary-700">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            const count = tab.value === 'ALL'
              ? delegations.length
              : delegations.filter((d) => d.status === tab.value).length;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-secondary-500 hover:border-secondary-300 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-300'
                }`}
              >
                {tab.label}
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                  isActive
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
                    : 'bg-secondary-100 text-secondary-500 dark:bg-secondary-800 dark:text-secondary-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ---- Data table ---- */}
      {filteredDelegations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-secondary-300 dark:border-secondary-700 py-16">
          <UserGroupIcon className="h-12 w-12 text-secondary-400 dark:text-secondary-500 mb-4" />
          <p className="text-lg font-medium text-secondary-900 dark:text-white">No delegations found</p>
          <p className="text-secondary-500 dark:text-secondary-400 mt-1">
            {activeTab === 'ALL' ? 'Get started by creating your first delegation.' : `No ${activeTab.toLowerCase()} delegations.`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-900">
          <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
            <thead className="bg-secondary-50 dark:bg-secondary-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 dark:text-secondary-400 uppercase tracking-wider">Delegator</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 dark:text-secondary-400 uppercase tracking-wider">Delegate</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 dark:text-secondary-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 dark:text-secondary-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 dark:text-secondary-400 uppercase tracking-wider">Start Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 dark:text-secondary-400 uppercase tracking-wider">End Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 dark:text-secondary-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
              {filteredDelegations.map((d) => (
                <tr key={d.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-secondary-900 dark:text-white whitespace-nowrap">
                    <div>{userName(d.delegator)}</div>
                    <div className="text-xs text-secondary-500 dark:text-secondary-400">{d.delegator?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary-900 dark:text-white whitespace-nowrap">
                    <div>{userName(d.delegate)}</div>
                    <div className="text-xs text-secondary-500 dark:text-secondary-400">{d.delegate?.email}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap"><TypeBadge type={d.type} /></td>
                  <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300 whitespace-nowrap">{formatDate(d.startDate)}</td>
                  <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300 whitespace-nowrap">{formatDate(d.endDate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {d.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(d.id)}
                            disabled={actionLoading === d.id}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            {actionLoading === d.id ? <Spinner /> : <CheckCircleIcon className="h-3.5 w-3.5" />}
                            Approve
                          </button>
                          <button
                            onClick={() => { setRejectId(d.id); setActionReason(''); }}
                            disabled={actionLoading === d.id}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
                            title="Reject"
                          >
                            <NoSymbolIcon className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </>
                      )}
                      {d.status === 'ACTIVE' && (
                        <button
                          onClick={() => { setRevokeId(d.id); setActionReason(''); }}
                          disabled={actionLoading === d.id}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                          title="Revoke"
                        >
                          <ArrowPathIcon className="h-3.5 w-3.5" />
                          Revoke
                        </button>
                      )}
                      <button
                        onClick={() => openAuditModal(d.id)}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-secondary-700 dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                        title="View Audit"
                      >
                        <EyeIcon className="h-3.5 w-3.5" />
                        Audit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================================================================= */}
      {/* Create Delegation Modal                                           */}
      {/* ================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 sm:p-8">
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-secondary-200 dark:border-secondary-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Create Delegation</h2>
              <button onClick={closeCreateModal} className="rounded-lg p-1.5 text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 px-6 py-5 max-h-[70vh] overflow-y-auto">
              {/* Delegator */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Delegator <span className="text-red-500">*</span>
                </label>
                <select
                  value={formDelegatorId}
                  onChange={(e) => setFormDelegatorId(e.target.value)}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                >
                  <option value="">-- Select delegator --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                  ))}
                </select>
              </div>

              {/* Delegate */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Delegate <span className="text-red-500">*</span>
                </label>
                <select
                  value={formDelegateId}
                  onChange={(e) => setFormDelegateId(e.target.value)}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                >
                  <option value="">-- Select delegate --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Delegation Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as DelegationType)}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  End Date <span className="text-secondary-400">(optional)</span>
                </label>
                <input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Reason <span className="text-secondary-400">(optional)</span>
                </label>
                <textarea
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="Reason for this delegation..."
                  rows={3}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-secondary-200 dark:border-secondary-700 px-6 py-4">
              <button
                onClick={closeCreateModal}
                className="rounded-lg px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving && <Spinner />}
                {saving ? 'Creating...' : 'Create Delegation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Reject Reason Modal                                               */}
      {/* ================================================================= */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-secondary-200 dark:border-secondary-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Reject Delegation</h2>
              <button onClick={() => setRejectId(null)} className="rounded-lg p-1.5 text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Reason <span className="text-secondary-400">(optional)</span>
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={3}
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-secondary-200 dark:border-secondary-700 px-6 py-4">
              <button onClick={() => setRejectId(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === rejectId}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === rejectId && <Spinner />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Revoke Reason Modal                                               */}
      {/* ================================================================= */}
      {revokeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-secondary-200 dark:border-secondary-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Revoke Delegation</h2>
              <button onClick={() => setRevokeId(null)} className="rounded-lg p-1.5 text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Reason <span className="text-secondary-400">(optional)</span>
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Reason for revocation..."
                rows={3}
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-secondary-200 dark:border-secondary-700 px-6 py-4">
              <button onClick={() => setRevokeId(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={actionLoading === revokeId}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === revokeId && <Spinner />}
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Audit Trail Modal                                                 */}
      {/* ================================================================= */}
      {auditDelegationId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 sm:p-8">
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-secondary-200 dark:border-secondary-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Audit Trail</h2>
              <button onClick={closeAuditModal} className="rounded-lg p-1.5 text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
              {auditLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="h-6 w-6 text-primary-600" />
                  <span className="ml-2 text-sm text-secondary-600 dark:text-secondary-400">Loading audit events...</span>
                </div>
              ) : auditEvents.length === 0 ? (
                <p className="text-center text-sm text-secondary-500 dark:text-secondary-400 py-8">No audit events found.</p>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-secondary-200 dark:bg-secondary-700" />

                  <div className="space-y-6">
                    {auditEvents.map((event) => (
                      <div key={event.id} className="relative pl-10">
                        {/* Timeline dot */}
                        <div className="absolute left-2.5 top-1 h-3 w-3 rounded-full border-2 border-primary-500 bg-white dark:bg-gray-800" />

                        <div>
                          <p className="text-sm font-medium text-secondary-900 dark:text-white">{event.action}</p>
                          <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
                            {event.performedBy ? event.performedBy.name : 'System'}
                            {' \u2022 '}
                            {new Date(event.createdAt).toLocaleString()}
                          </p>
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <div className="mt-1.5 rounded-md bg-secondary-50 dark:bg-secondary-800/50 px-3 py-2 text-xs text-secondary-600 dark:text-secondary-400">
                              {Object.entries(event.metadata).map(([key, value]) => (
                                <div key={key}>
                                  <span className="font-medium">{key}:</span> {String(value)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-secondary-200 dark:border-secondary-700 px-6 py-4">
              <button
                onClick={closeAuditModal}
                className="rounded-lg px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
