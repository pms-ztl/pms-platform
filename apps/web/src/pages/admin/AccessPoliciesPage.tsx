import { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  ShieldCheckIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BoltIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui';
import toast from 'react-hot-toast';
import { api } from '@/lib/api/client';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  policiesApi,
  type AccessPolicy,
  type PolicyType,
  type PolicyStatus,
  type PolicyEffect,
  type CreatePolicyInput,
  type SimulatePolicyResult,
} from '@/lib/api/policies';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLICY_TYPES: PolicyType[] = [
  'VISIBILITY',
  'ACCESS',
  'APPROVAL',
  'NOTIFICATION',
  'DATA_RETENTION',
  'UNION_CONTRACT',
];

const TYPE_COLORS: Record<PolicyType, { bg: string; text: string; ring: string }> = {
  VISIBILITY: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-700 dark:text-blue-400',
    ring: 'ring-blue-500/30',
  },
  ACCESS: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    text: 'text-purple-700 dark:text-purple-400',
    ring: 'ring-purple-500/30',
  },
  APPROVAL: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-700 dark:text-amber-400',
    ring: 'ring-amber-500/30',
  },
  NOTIFICATION: {
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    text: 'text-cyan-700 dark:text-cyan-400',
    ring: 'ring-cyan-500/30',
  },
  DATA_RETENTION: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-700 dark:text-rose-400',
    ring: 'ring-rose-500/30',
  },
  UNION_CONTRACT: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    ring: 'ring-emerald-500/30',
  },
};

const STATUS_COLORS: Record<PolicyStatus, { bg: string; text: string; ring: string }> = {
  DRAFT: {
    bg: 'bg-secondary-500/10 dark:bg-secondary-500/20',
    text: 'text-secondary-700 dark:text-secondary-400',
    ring: 'ring-secondary-500/30',
  },
  ACTIVE: {
    bg: 'bg-green-500/10 dark:bg-green-500/20',
    text: 'text-green-700 dark:text-green-400',
    ring: 'ring-green-500/30',
  },
  INACTIVE: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-700 dark:text-amber-400',
    ring: 'ring-amber-500/30',
  },
  ARCHIVED: {
    bg: 'bg-red-500/10 dark:bg-red-500/20',
    text: 'text-red-700 dark:text-red-400',
    ring: 'ring-red-500/30',
  },
};

type TabFilter = 'ALL' | 'DRAFT' | 'ACTIVE' | 'INACTIVE';

const TABS: { label: string; value: TabFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
];

interface SimpleUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Badge({ colors, label }: { colors: { bg: string; text: string; ring: string }; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${colors.bg} ${colors.text} ${colors.ring}`}
    >
      {label}
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

function formatDate(iso: string | null): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function targetSummary(policy: AccessPolicy): string {
  const parts: string[] = [];
  if (policy.targetRoles?.length) parts.push(`${policy.targetRoles.length} role(s)`);
  if (policy.targetDepartments?.length) parts.push(`${policy.targetDepartments.length} department(s)`);
  if (policy.targetTeams?.length) parts.push(`${policy.targetTeams.length} team(s)`);
  if (policy.targetLevels?.length) parts.push(`Level ${policy.targetLevels.join(',')}`);
  return parts.length > 0 ? parts.join(', ') : 'No targets';
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AccessPoliciesPage() {
  usePageTitle('Access Policies');

  // ---- Data state ----
  const [policies, setPolicies] = useState<AccessPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL');

  // ---- Modal state ----
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<AccessPolicy | null>(null);
  const [saving, setSaving] = useState(false);

  // ---- Form fields ----
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<PolicyType>('ACCESS');
  const [formEffect, setFormEffect] = useState<PolicyEffect>('ALLOW');
  const [formPriority, setFormPriority] = useState(0);
  const [formTargetRoles, setFormTargetRoles] = useState('');
  const [formTargetDepartments, setFormTargetDepartments] = useState('');
  const [formEffectiveFrom, setFormEffectiveFrom] = useState('');
  const [formEffectiveTo, setFormEffectiveTo] = useState('');

  // ---- Delete state ----
  const [deleteTarget, setDeleteTarget] = useState<AccessPolicy | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ---- Simulator state ----
  const [simOpen, setSimOpen] = useState(false);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [simUserId, setSimUserId] = useState('');
  const [simResource, setSimResource] = useState('');
  const [simAction, setSimAction] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<SimulatePolicyResult | null>(null);

  // ---- Action-loading map ----
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const loadPolicies = useCallback(async () => {
    try {
      const data = await policiesApi.list();
      setPolicies(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load policies');
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const data = await api.get<SimpleUser[]>('/users?limit=100');
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      // users list may fail silently
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      await Promise.all([loadPolicies(), loadUsers()]);
      if (!cancelled) setLoading(false);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [loadPolicies, loadUsers]);

  // -----------------------------------------------------------------------
  // Filtered list
  // -----------------------------------------------------------------------

  const filteredPolicies = activeTab === 'ALL'
    ? policies
    : policies.filter((p) => p.status === activeTab);

  // -----------------------------------------------------------------------
  // Modal helpers
  // -----------------------------------------------------------------------

  function openCreateModal() {
    setEditingPolicy(null);
    setFormName('');
    setFormDescription('');
    setFormType('ACCESS');
    setFormEffect('ALLOW');
    setFormPriority(0);
    setFormTargetRoles('');
    setFormTargetDepartments('');
    setFormEffectiveFrom('');
    setFormEffectiveTo('');
    setShowModal(true);
  }

  function openEditModal(policy: AccessPolicy) {
    setEditingPolicy(policy);
    setFormName(policy.name);
    setFormDescription(policy.description ?? '');
    setFormType(policy.type);
    setFormEffect(policy.effect);
    setFormPriority(policy.priority);
    setFormTargetRoles((policy.targetRoles ?? []).join(', '));
    setFormTargetDepartments((policy.targetDepartments ?? []).join(', '));
    setFormEffectiveFrom(policy.effectiveFrom ? policy.effectiveFrom.slice(0, 10) : '');
    setFormEffectiveTo(policy.effectiveTo ? policy.effectiveTo.slice(0, 10) : '');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingPolicy(null);
  }

  // -----------------------------------------------------------------------
  // CRUD handlers
  // -----------------------------------------------------------------------

  async function handleSave() {
    if (!formName.trim()) {
      toast.error('Policy name is required');
      return;
    }

    const parseList = (v: string): string[] =>
      v.split(',').map((s) => s.trim()).filter(Boolean);

    const payload: CreatePolicyInput = {
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      type: formType,
      effect: formEffect,
      priority: formPriority,
      targetRoles: parseList(formTargetRoles),
      targetDepartments: parseList(formTargetDepartments),
      effectiveFrom: formEffectiveFrom || undefined,
      effectiveTo: formEffectiveTo || undefined,
    };

    setSaving(true);
    try {
      if (editingPolicy) {
        await policiesApi.update(editingPolicy.id, payload);
        toast.success('Policy updated');
      } else {
        await policiesApi.create(payload);
        toast.success('Policy created');
      }
      closeModal();
      await loadPolicies();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(id: string) {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await policiesApi.activate(id);
      toast.success('Policy activated');
      await loadPolicies();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to activate policy');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleDeactivate(id: string) {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await policiesApi.deactivate(id);
      toast.success('Policy deactivated');
      await loadPolicies();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to deactivate policy');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await policiesApi.delete(deleteTarget.id);
      toast.success('Policy deleted');
      setDeleteTarget(null);
      await loadPolicies();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete policy');
    } finally {
      setDeleting(false);
    }
  }

  // -----------------------------------------------------------------------
  // Simulator
  // -----------------------------------------------------------------------

  async function handleSimulate() {
    if (!simUserId) {
      toast.error('Select a user to simulate');
      return;
    }
    if (!simResource.trim()) {
      toast.error('Resource is required');
      return;
    }
    if (!simAction.trim()) {
      toast.error('Action is required');
      return;
    }

    setSimulating(true);
    setSimResult(null);
    try {
      const result = await policiesApi.simulate({
        userId: simUserId,
        resource: simResource.trim(),
        action: simAction.trim(),
      });
      setSimResult(result);
    } catch (err: any) {
      toast.error(err?.message || 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  }

  // -----------------------------------------------------------------------
  // Render: Loading
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Access Policies</h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">Loading policies...</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl rounded-xl border border-secondary-200/60 dark:border-white/[0.06] p-6 animate-pulse h-16"
            />
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
      <PageHeader title="Access Policies" subtitle="Create and manage access control policies for your organization.">
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Create Policy
        </button>
      </PageHeader>

      {/* ---- Status tabs ---- */}
      <div className="border-b border-secondary-200/60 dark:border-white/[0.06]">
        <nav className="-mb-px flex gap-6" aria-label="Policy status tabs">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            const count = tab.value === 'ALL'
              ? policies.length
              : policies.filter((p) => p.status === tab.value).length;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`whitespace-nowrap border-b-2 pb-3 px-1 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 hover:border-secondary-300 dark:hover:border-secondary-600'
                }`}
              >
                {tab.label}
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isActive
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300'
                      : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-800 dark:text-secondary-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ---- Data table ---- */}
      {filteredPolicies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-secondary-300 dark:border-secondary-700 py-16">
          <ShieldCheckIcon className="h-12 w-12 text-secondary-400 dark:text-secondary-500 mb-4" />
          <p className="text-lg font-medium text-secondary-900 dark:text-white">No policies found</p>
          <p className="text-secondary-500 dark:text-secondary-400 mt-1">
            {activeTab === 'ALL'
              ? 'Get started by creating your first policy.'
              : `No ${activeTab.toLowerCase()} policies.`}
          </p>
          {activeTab === 'ALL' && (
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Create Policy
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-secondary-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl">
          <table className="min-w-full divide-y divide-secondary-100/60 dark:divide-white/[0.04]">
            <thead>
              <tr className="bg-secondary-50 dark:bg-secondary-800/50">
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-secondary-500 dark:text-secondary-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-secondary-500 dark:text-secondary-400">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-secondary-500 dark:text-secondary-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-secondary-500 dark:text-secondary-400">
                  Effect
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-secondary-500 dark:text-secondary-400">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-secondary-500 dark:text-secondary-400">
                  Targets
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider text-secondary-500 dark:text-secondary-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
              {filteredPolicies.map((policy) => {
                const isLoading = actionLoading[policy.id] ?? false;
                return (
                  <tr
                    key={policy.id}
                    className="hover:bg-secondary-50 dark:hover:bg-secondary-800/30 transition-colors"
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-secondary-900 dark:text-white break-words max-w-[220px]">
                          {policy.name}
                        </p>
                        {policy.description && (
                          <p className="text-xs text-secondary-500 dark:text-secondary-400 break-words max-w-[220px]">
                            {policy.description}
                          </p>
                        )}
                      </div>
                    </td>
                    {/* Type */}
                    <td className="px-4 py-3">
                      <Badge colors={TYPE_COLORS[policy.type]} label={policy.type.replace('_', ' ')} />
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <Badge colors={STATUS_COLORS[policy.status]} label={policy.status} />
                    </td>
                    {/* Effect */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          policy.effect === 'ALLOW'
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {policy.effect === 'ALLOW' ? (
                          <CheckCircleIcon className="h-4 w-4" />
                        ) : (
                          <XCircleIcon className="h-4 w-4" />
                        )}
                        {policy.effect}
                      </span>
                    </td>
                    {/* Priority */}
                    <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">
                      {policy.priority}
                    </td>
                    {/* Targets */}
                    <td className="px-4 py-3 text-xs text-secondary-600 dark:text-secondary-400 max-w-[180px] break-words">
                      {targetSummary(policy)}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {policy.status === 'DRAFT' && (
                          <button
                            onClick={() => handleActivate(policy.id)}
                            disabled={isLoading}
                            title="Activate"
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors disabled:opacity-50"
                          >
                            {isLoading ? <Spinner /> : <PlayIcon className="h-3.5 w-3.5" />}
                            Activate
                          </button>
                        )}
                        {policy.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleDeactivate(policy.id)}
                            disabled={isLoading}
                            title="Deactivate"
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                          >
                            {isLoading ? <Spinner /> : <NoSymbolIcon className="h-3.5 w-3.5" />}
                            Deactivate
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(policy)}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-secondary-700 dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                        >
                          <PencilSquareIcon className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(policy)}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ================================================================= */}
      {/* Policy Simulator (collapsible)                                    */}
      {/* ================================================================= */}
      <div className="rounded-xl border border-secondary-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setSimOpen((prev) => !prev)}
          className="flex w-full items-center justify-between px-6 py-4 hover:bg-secondary-50 dark:hover:bg-secondary-800/30 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-2">
            <BoltIcon className="h-5 w-5 text-primary-500" />
            <span className="text-sm font-semibold text-secondary-900 dark:text-white">
              Policy Simulator
            </span>
            <span className="text-xs text-secondary-500 dark:text-secondary-400">
              Test policies against a user
            </span>
          </div>
          {simOpen ? (
            <ChevronUpIcon className="h-5 w-5 text-secondary-400" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-secondary-400" />
          )}
        </button>

        {simOpen && (
          <div className="border-t border-secondary-200/60 dark:border-white/[0.06] px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* User select */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  User
                </label>
                <select
                  value={simUserId}
                  onChange={(e) => setSimUserId(e.target.value)}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl px-3 py-2 text-sm text-secondary-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                >
                  <option value="">-- Select user --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Resource */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Resource
                </label>
                <input
                  type="text"
                  value={simResource}
                  onChange={(e) => setSimResource(e.target.value)}
                  placeholder="e.g. reviews, goals, compensation"
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                />
              </div>

              {/* Action */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Action
                </label>
                <input
                  type="text"
                  value={simAction}
                  onChange={(e) => setSimAction(e.target.value)}
                  placeholder="e.g. read, write, delete"
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex items-start gap-4">
              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {simulating ? <Spinner /> : <BoltIcon className="h-4 w-4" />}
                {simulating ? 'Simulating...' : 'Simulate'}
              </button>

              {/* Result */}
              {simResult && (
                <div
                  className={`flex-1 rounded-lg border p-4 ${
                    simResult.allowed
                      ? 'border-green-300 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10'
                      : 'border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {simResult.allowed ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                    <span
                      className={`text-sm font-semibold ${
                        simResult.allowed
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-red-700 dark:text-red-300'
                      }`}
                    >
                      {simResult.allowed ? 'ALLOWED' : 'DENIED'}
                    </span>
                  </div>
                  {simResult.matchedPolicies.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-secondary-600 dark:text-secondary-400">
                        Matched policies:
                      </p>
                      {simResult.matchedPolicies.map((mp) => (
                        <div
                          key={mp.id}
                          className="flex items-center gap-2 text-xs text-secondary-700 dark:text-secondary-300"
                        >
                          <span className="font-medium">{mp.name}</span>
                          <Badge colors={TYPE_COLORS[mp.type]} label={mp.type.replace('_', ' ')} />
                          <span
                            className={
                              mp.effect === 'ALLOW'
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }
                          >
                            {mp.effect}
                          </span>
                          <span className="text-secondary-400">P{mp.priority}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {simResult.matchedPolicies.length === 0 && (
                    <p className="text-xs text-secondary-500 dark:text-secondary-400">
                      No policies matched this combination.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* Create / Edit Modal                                               */}
      {/* ================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 sm:p-8">
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-secondary-200/60 dark:border-white/[0.06] px-6 py-4">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                {editingPolicy ? 'Edit Policy' : 'Create Policy'}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-5 px-6 py-5 max-h-[70vh] overflow-y-auto">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Policy Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Manager Visibility Rule"
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of this policy..."
                  rows={2}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors resize-none"
                />
              </div>

              {/* Type + Effect row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as PolicyType)}
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl px-3 py-2 text-sm text-secondary-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                  >
                    {POLICY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Effect toggle */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Effect
                  </label>
                  <div className="flex rounded-lg border border-secondary-300 dark:border-secondary-600 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setFormEffect('ALLOW')}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                        formEffect === 'ALLOW'
                          ? 'bg-green-600 text-white'
                          : 'bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800'
                      }`}
                    >
                      ALLOW
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormEffect('DENY')}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                        formEffect === 'DENY'
                          ? 'bg-red-600 text-white'
                          : 'bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800'
                      }`}
                    >
                      DENY
                    </button>
                  </div>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Priority
                </label>
                <input
                  type="number"
                  value={formPriority}
                  onChange={(e) => setFormPriority(parseInt(e.target.value, 10) || 0)}
                  min={0}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl px-3 py-2 text-sm text-secondary-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                />
                <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
                  Higher values take precedence. 0 = default.
                </p>
              </div>

              {/* Target roles */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Target Roles
                </label>
                <input
                  type="text"
                  value={formTargetRoles}
                  onChange={(e) => setFormTargetRoles(e.target.value)}
                  placeholder="ADMIN, MANAGER, HR (comma-separated)"
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                />
              </div>

              {/* Target departments */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Target Departments
                </label>
                <input
                  type="text"
                  value={formTargetDepartments}
                  onChange={(e) => setFormTargetDepartments(e.target.value)}
                  placeholder="Engineering, Finance, Sales (comma-separated)"
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                />
              </div>

              {/* Date pickers row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Effective From
                  </label>
                  <input
                    type="date"
                    value={formEffectiveFrom}
                    onChange={(e) => setFormEffectiveFrom(e.target.value)}
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl px-3 py-2 text-sm text-secondary-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Effective To
                  </label>
                  <input
                    type="date"
                    value={formEffectiveTo}
                    onChange={(e) => setFormEffectiveTo(e.target.value)}
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-900/70 backdrop-blur-xl px-3 py-2 text-sm text-secondary-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-secondary-200/60 dark:border-white/[0.06] px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-lg px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving && <Spinner />}
                {saving ? 'Saving...' : editingPolicy ? 'Update Policy' : 'Create Policy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Delete Confirmation Modal                                         */}
      {/* ================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-3 border-b border-secondary-200/60 dark:border-white/[0.06] px-6 py-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
                <TrashIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Delete Policy</h2>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm text-secondary-700 dark:text-secondary-300">
                Are you sure you want to delete the policy{' '}
                <span className="font-semibold text-secondary-900 dark:text-white">
                  &ldquo;{deleteTarget.name}&rdquo;
                </span>
                ?
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-secondary-200/60 dark:border-white/[0.06] px-6 py-4">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting && <Spinner />}
                {deleting ? 'Deleting...' : 'Delete Policy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
