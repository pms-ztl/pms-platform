import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  XMarkIcon,
  BuildingOffice2Icon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import {
  superAdminTenantsApi,
  type SATenant,
  type SAPaginatedResponse,
} from '@/lib/api';
import { DataTable, type Column } from '@/components/ui';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

const STATUS_OPTIONS = ['All', 'ACTIVE', 'SUSPENDED', 'TRIAL', 'EXPIRED'] as const;

const PLAN_OPTIONS = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as const;

const LEVEL_OPTIONS = Array.from({ length: 16 }, (_, i) => i + 1);

const STATUS_BADGE_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  SUSPENDED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  TRIAL: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  EXPIRED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getUsageColor(userCount: number, licenseCount: number): string {
  if (licenseCount <= 0) return 'bg-gray-400';
  const pct = (userCount / licenseCount) * 100;
  if (pct >= 95) return 'bg-red-500';
  if (pct >= 80) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getUsageTextColor(userCount: number, licenseCount: number): string {
  if (licenseCount <= 0) return 'text-gray-500';
  const pct = (userCount / licenseCount) * 100;
  if (pct >= 95) return 'text-red-600 dark:text-red-400';
  if (pct >= 80) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SATenantsPage() {
  const queryClient = useQueryClient();

  // State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // Fetch tenants
  const { data: tenantsResponse, isLoading } = useQuery({
    queryKey: ['sa-tenants', page, debouncedSearch, statusFilter],
    queryFn: () =>
      superAdminTenantsApi.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
      }),
  });

  const tenants = tenantsResponse?.data ?? [];
  const total = tenantsResponse?.total ?? 0;

  // Mutations
  const suspendMutation = useMutation({
    mutationFn: (id: string) => superAdminTenantsApi.suspend(id, 'Suspended by super admin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sa-tenants'] });
      toast.success('Tenant suspended successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to suspend tenant');
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => superAdminTenantsApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sa-tenants'] });
      toast.success('Tenant activated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to activate tenant');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => superAdminTenantsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sa-tenants'] });
      setShowCreateModal(false);
      toast.success('Tenant created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create tenant');
    },
  });

  // Table columns
  const columns: Column<SATenant>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Organization',
        render: (tenant) => (
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{tenant.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{tenant.slug}</p>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (tenant) => (
          <span
            className={clsx(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
              STATUS_BADGE_STYLES[tenant.status] ?? STATUS_BADGE_STYLES.EXPIRED
            )}
          >
            {tenant.status}
          </span>
        ),
      },
      {
        key: 'plan',
        header: 'Plan',
        render: (tenant) => (
          <span
            className={clsx(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
              PLAN_BADGE_STYLES[tenant.plan] ?? PLAN_BADGE_STYLES.FREE
            )}
          >
            {tenant.plan}
          </span>
        ),
      },
      {
        key: 'usage',
        header: 'Users / Licenses',
        render: (tenant) => {
          const used = tenant.userCount ?? 0;
          const total = tenant.licenseCount ?? 0;
          const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
          return (
            <div className="min-w-[120px]">
              <div className="flex items-center justify-between mb-1">
                <span className={clsx('text-xs font-semibold', getUsageTextColor(used, total))}>
                  {used}/{total}
                </span>
                <span className="text-xs text-gray-400">{Math.round(pct)}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={clsx('h-full rounded-full transition-all duration-300', getUsageColor(used, total))}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        key: 'maxLevel',
        header: 'Max Levels',
        render: (tenant) => (
          <span className="text-sm text-gray-700 dark:text-gray-300">{tenant.maxLevel ?? '-'}</span>
        ),
      },
      {
        key: 'createdAt',
        header: 'Created',
        render: (tenant) => (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(tenant.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        className: 'text-right',
        render: (tenant) => (
          <div className="flex items-center justify-end gap-1">
            <Link
              to={`/sa/tenants/${tenant.id}`}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 rounded-lg transition-colors"
              title="View details"
            >
              <EyeIcon className="h-5 w-5" />
            </Link>
            {tenant.status === 'ACTIVE' || tenant.status === 'TRIAL' ? (
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to suspend "${tenant.name}"?`)) {
                    suspendMutation.mutate(tenant.id);
                  }
                }}
                disabled={suspendMutation.isPending}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded-lg transition-colors"
                title="Suspend tenant"
              >
                <NoSymbolIcon className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={() => activateMutation.mutate(tenant.id)}
                disabled={activateMutation.isPending}
                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 dark:hover:text-green-400 rounded-lg transition-colors"
                title="Activate tenant"
              >
                <CheckCircleIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [suspendMutation, activateMutation]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenants</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage organizations and their subscriptions
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">
          <PlusIcon className="h-5 w-5" />
          Create Tenant
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenants by name or slug..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === 'All' ? 'All Statuses' : status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable<SATenant>
        columns={columns}
        data={tenants}
        isLoading={isLoading}
        keyExtractor={(tenant) => tenant.id}
        emptyTitle="No tenants found"
        emptyDescription={
          debouncedSearch || statusFilter !== 'All'
            ? 'Try adjusting your search or filter.'
            : 'Create your first tenant to get started.'
        }
        emptyIcon={<BuildingOffice2Icon className="h-12 w-12" />}
        emptyAction={{ label: 'Create Tenant', onClick: () => setShowCreateModal(true) }}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total,
          onPageChange: setPage,
        }}
      />

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <CreateTenantModal
          isPending={createMutation.isPending}
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Tenant Modal
// ---------------------------------------------------------------------------

interface CreateTenantModalProps {
  isPending: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
}

function CreateTenantModal({ isPending, onClose, onSubmit }: CreateTenantModalProps) {
  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [plan, setPlan] = useState<string>('STARTER');
  const [licenseCount, setLicenseCount] = useState<number>(25);
  const [maxLevel, setMaxLevel] = useState<number>(8);
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [ceoEmail, setCeoEmail] = useState('');
  const [superAdminCanView, setSuperAdminCanView] = useState(true);
  const [useDefaultRoles, setUseDefaultRoles] = useState(true);
  const [customRoles, setCustomRoles] = useState<Array<{ name: string; category: string }>>([
    { name: 'Tenant Admin', category: 'ADMIN' },
    { name: 'HR Admin', category: 'HR' },
    { name: 'HR Business Partner', category: 'HR' },
    { name: 'Manager', category: 'MANAGER' },
    { name: 'Employee', category: 'EMPLOYEE' },
  ]);

  // Auto-generate slug from org name
  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(orgName));
    }
  }, [orgName, slugManuallyEdited]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: orgName.trim(),
      slug: slug.trim(),
      plan,
      licenseCount,
      maxLevel,
      adminFirstName: adminFirstName.trim(),
      adminLastName: adminLastName.trim(),
      adminEmail: adminEmail.trim(),
      ceoEmail: ceoEmail.trim() || undefined,
      superAdminCanView,
      ...(useDefaultRoles ? {} : {
        roles: customRoles.filter((r) => r.name.trim()).map((r) => ({
          name: r.name.trim(),
          category: r.category,
          permissions: [],
        })),
      }),
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-200/50 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Tenant</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Set up a new organization</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Organization Info */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Organization
              </legend>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Corporation"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugManuallyEdited(true);
                  }}
                  placeholder="acme-corporation"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">Auto-generated from name. Used in URLs and login.</p>
              </div>
            </fieldset>

            {/* Subscription Settings */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Subscription
              </legend>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Plan
                  </label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {PLAN_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    License Count <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={licenseCount}
                    onChange={(e) => setLicenseCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Org Levels
                </label>
                <select
                  value={maxLevel}
                  onChange={(e) => setMaxLevel(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {LEVEL_OPTIONS.map((l) => (
                    <option key={l} value={l}>
                      {l} {l === 1 ? 'level' : 'levels'}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>

            {/* Initial Admin Account */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Initial Admin Account
              </legend>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={adminFirstName}
                    onChange={(e) => setAdminFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={adminLastName}
                    onChange={(e) => setAdminLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Admin Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@acme.com"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </fieldset>

            {/* Optional Settings */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Optional Settings
              </legend>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CEO Email
                </label>
                <input
                  type="email"
                  value={ceoEmail}
                  onChange={(e) => setCeoEmail(e.target.value)}
                  placeholder="ceo@acme.com"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Super Admin Can View
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Allow super admin to view tenant data
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={superAdminCanView}
                  onClick={() => setSuperAdminCanView(!superAdminCanView)}
                  className={clsx(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                    superAdminCanView ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                  )}
                >
                  <span
                    className={clsx(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      superAdminCanView ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </fieldset>

            {/* Roles Configuration */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Roles Configuration
              </legend>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Use Default System Roles
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Tenant Admin, HR Admin, HR BP, Manager, Employee
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={useDefaultRoles}
                  onClick={() => setUseDefaultRoles(!useDefaultRoles)}
                  className={clsx(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                    useDefaultRoles ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                  )}
                >
                  <span
                    className={clsx(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      useDefaultRoles ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              {!useDefaultRoles && (
                <div className="space-y-2">
                  {customRoles.map((role, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={role.name}
                        onChange={(e) => {
                          const updated = [...customRoles];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setCustomRoles(updated);
                        }}
                        placeholder="Role name"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <select
                        value={role.category}
                        onChange={(e) => {
                          const updated = [...customRoles];
                          updated[idx] = { ...updated[idx], category: e.target.value };
                          setCustomRoles(updated);
                        }}
                        className="w-28 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="HR">HR</option>
                        <option value="MANAGER">Manager</option>
                        <option value="EMPLOYEE">Employee</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setCustomRoles(customRoles.filter((_, i) => i !== idx))}
                        className="p-1 text-red-400 hover:text-red-500 transition-colors"
                        title="Remove role"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCustomRoles([...customRoles, { name: '', category: 'EMPLOYEE' }])}
                    className="text-sm text-indigo-500 hover:text-indigo-400 font-medium"
                  >
                    + Add Role
                  </button>
                  <p className="text-xs text-amber-400 mt-1">
                    At least one role with ADMIN category is required.
                  </p>
                </div>
              )}
            </fieldset>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                {isPending ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Tenant'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
