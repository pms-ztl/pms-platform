import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  UsersIcon,
  ChartBarIcon,
  ServerStackIcon,
  CpuChipIcon,
  BuildingOffice2Icon,
  GlobeAltIcon,
  KeyIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  UserPlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import {
  superAdminTenantsApi,
  type SATenant,
  type SATenantSettings,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  SUSPENDED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  TRIAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  EXPIRED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const planColors: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  STARTER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  PROFESSIONAL: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  ENTERPRISE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatStorage(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ---------------------------------------------------------------------------
// Reusable sub-components
// ---------------------------------------------------------------------------

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}>
      {label}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  progress,
  iconBg,
}: {
  icon: React.ForwardRefExoticComponent<any>;
  label: string;
  value: React.ReactNode;
  subtext?: string;
  progress?: { current: number; max: number };
  iconBg: string;
}) {
  const pct = progress ? Math.min(Math.round((progress.current / Math.max(progress.max, 1)) * 100), 100) : null;
  const barColor = pct !== null
    ? pct >= 100 ? 'bg-red-500' : pct >= 90 ? 'bg-yellow-500' : 'bg-indigo-500'
    : '';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      {progress && pct !== null && (
        <div className="mt-3">
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {progress.current} / {progress.max} ({pct}%)
          </p>
        </div>
      )}
      {subtext && !progress && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{subtext}</p>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: React.ForwardRefExoticComponent<any>;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  enabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab content components
// ---------------------------------------------------------------------------

function OverviewTab({ tenant }: { tenant: SATenant }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-1">
        <DetailRow label="Created" value={formatDate(tenant.createdAt)} />
        <DetailRow label="Slug" value={tenant.slug} />
        <DetailRow label="Domain" value={tenant.domain || 'Not configured'} />
        <DetailRow label="Monthly Active Users" value={tenant.monthlyActiveUsers.toLocaleString()} />
      </div>
      <div className="space-y-1">
        <DetailRow label="Total Users" value={tenant.userCount.toLocaleString()} />
        <DetailRow label="Max Users (limit)" value={tenant.maxUsers.toLocaleString()} />
        <DetailRow label="License Count" value={tenant.licenseCount.toLocaleString()} />
        <DetailRow label="Storage Used" value={formatStorage(tenant.storageUsed)} />
      </div>
    </div>
  );
}

function FeaturesTab({
  settings,
  onToggle,
}: {
  settings: SATenantSettings;
  onToggle: (key: keyof SATenantSettings['features'], val: boolean) => void;
}) {
  const featureLabels: Record<keyof SATenantSettings['features'], string> = {
    goals: 'Goals & OKRs',
    reviews: 'Performance Reviews',
    feedback: '360 Feedback',
    calibration: 'Rating Calibration',
    analytics: 'Advanced Analytics',
    integrations: 'Third-party Integrations',
    agenticAI: 'Agentic AI',
  };

  return (
    <div className="max-w-lg">
      {(Object.keys(featureLabels) as Array<keyof SATenantSettings['features']>).map((key) => (
        <ToggleRow
          key={key}
          label={featureLabels[key]}
          enabled={settings.features[key]}
          onChange={(val) => onToggle(key, val)}
        />
      ))}
    </div>
  );
}

function SecurityTab({ settings }: { settings: SATenantSettings }) {
  return (
    <div className="max-w-lg space-y-1">
      <DetailRow
        label="MFA Required"
        value={
          settings.security.mfaRequired ? (
            <Badge label="Yes" colorClass="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" />
          ) : (
            <Badge label="No" colorClass="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400" />
          )
        }
      />
      <DetailRow
        label="SSO Enabled"
        value={
          settings.security.ssoEnabled ? (
            <Badge label="Enabled" colorClass="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" />
          ) : (
            <Badge label="Disabled" colorClass="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400" />
          )
        }
      />
      <DetailRow label="Password Policy" value={settings.security.passwordPolicy} />
      <DetailRow label="Session Timeout" value={`${settings.security.sessionTimeout} minutes`} />
    </div>
  );
}

function SettingsTab({
  tenant,
  onSave,
  isSaving,
}: {
  tenant: SATenant;
  onSave: (data: Record<string, unknown>) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(tenant.name);
  const [slug, setSlug] = useState(tenant.slug);
  const [plan, setPlan] = useState(tenant.plan);
  const [licenseCount, setLicenseCount] = useState(tenant.licenseCount);
  const [maxLevel, setMaxLevel] = useState(tenant.maxLevel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      slug,
      plan,
      licenseCount,
      maxLevel,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Organization Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Slug
        </label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Plan
        </label>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as SATenant['plan'])}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="FREE">Free</option>
          <option value="STARTER">Starter</option>
          <option value="PROFESSIONAL">Professional</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            License Count
          </label>
          <input
            type="number"
            min={1}
            value={licenseCount}
            onChange={(e) => setLicenseCount(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Max Org Levels
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={maxLevel}
            onChange={(e) => setMaxLevel(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

const TABS = ['Overview', 'Features', 'Security', 'Settings'] as const;
type TabName = (typeof TABS)[number];

export function SATenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabName>('Overview');

  // ---- Data fetching ----
  const {
    data: tenant,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['sa-tenant', id],
    queryFn: () => superAdminTenantsApi.get(id!),
    enabled: !!id,
  });

  // ---- Mutations ----
  const suspendMutation = useMutation({
    mutationFn: () => superAdminTenantsApi.suspend(id!, 'Suspended by Super Admin'),
    onSuccess: () => {
      toast.success('Tenant suspended');
      queryClient.invalidateQueries({ queryKey: ['sa-tenant', id] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to suspend tenant'),
  });

  const activateMutation = useMutation({
    mutationFn: () => superAdminTenantsApi.activate(id!),
    onSuccess: () => {
      toast.success('Tenant activated');
      queryClient.invalidateQueries({ queryKey: ['sa-tenant', id] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to activate tenant'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => superAdminTenantsApi.update(id!, data),
    onSuccess: () => {
      toast.success('Tenant updated');
      queryClient.invalidateQueries({ queryKey: ['sa-tenant', id] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update tenant'),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Partial<SATenantSettings>) =>
      superAdminTenantsApi.updateSettings(id!, settings),
    onSuccess: () => {
      toast.success('Settings updated');
      queryClient.invalidateQueries({ queryKey: ['sa-tenant', id] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update settings'),
  });

  const assignManagerMutation = useMutation({
    mutationFn: (managerUserId: string) =>
      superAdminTenantsApi.assignDesignatedManager(id!, managerUserId),
    onSuccess: () => {
      toast.success('Designated manager assigned');
      queryClient.invalidateQueries({ queryKey: ['sa-tenant', id] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to assign manager'),
  });

  const handleAssignManager = () => {
    const userId = prompt('Enter the User ID of the manager to assign:');
    if (userId?.trim()) {
      assignManagerMutation.mutate(userId.trim());
    }
  };

  // ---- Feature toggle handler ----
  const handleFeatureToggle = (key: keyof SATenantSettings['features'], val: boolean) => {
    if (!tenant) return;
    updateSettingsMutation.mutate({
      features: { ...tenant.settings.features, [key]: val },
    });
  };

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link
          to="/sa/tenants"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Tenants
        </Link>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (isError || !tenant) {
    return (
      <div className="space-y-6">
        <Link
          to="/sa/tenants"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Tenants
        </Link>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Failed to load tenant</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {(error as Error)?.message || 'The tenant could not be found or an error occurred.'}
          </p>
        </div>
      </div>
    );
  }

  const isActive = tenant.status === 'ACTIVE' || tenant.status === 'TRIAL';

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/sa/tenants"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Tenants
      </Link>

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <BuildingOffice2Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tenant.name}</h1>
              <Badge label={tenant.status} colorClass={statusColors[tenant.status] || statusColors.ACTIVE} />
              <Badge label={tenant.plan} colorClass={planColors[tenant.plan] || planColors.FREE} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {tenant.slug}{tenant.domain ? ` \u00B7 ${tenant.domain}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isActive ? (
            <button
              onClick={() => suspendMutation.mutate()}
              disabled={suspendMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors"
            >
              <XCircleIcon className="h-4 w-4" />
              {suspendMutation.isPending ? 'Suspending...' : 'Suspend'}
            </button>
          ) : (
            <button
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800 dark:hover:bg-green-900/30 disabled:opacity-50 transition-colors"
            >
              <CheckCircleIcon className="h-4 w-4" />
              {activateMutation.isPending ? 'Activating...' : 'Activate'}
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Stats Cards Row                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={UsersIcon}
          label="Users / Licenses"
          value={`${tenant.userCount} / ${tenant.licenseCount}`}
          iconBg="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
          progress={{ current: tenant.userCount, max: tenant.licenseCount }}
        />
        <StatCard
          icon={ChartBarIcon}
          label="Max Org Levels"
          value={`L1 \u2013 L${tenant.maxLevel}`}
          subtext={`${tenant.maxLevel} levels configured`}
          iconBg="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
        />
        <StatCard
          icon={CpuChipIcon}
          label="Monthly Active Users"
          value={tenant.monthlyActiveUsers.toLocaleString()}
          subtext="Last 30 days"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={ServerStackIcon}
          label="Storage Used"
          value={formatStorage(tenant.storageUsed)}
          subtext={`Limit: ${tenant.settings.limits.maxStorageGb} GB`}
          iconBg="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Subscription Details + Designated Manager                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Details */}
        <SectionCard title="Subscription Details" icon={KeyIcon}>
          <div className="space-y-1">
            <DetailRow label="Plan" value={<Badge label={tenant.plan} colorClass={planColors[tenant.plan] || planColors.FREE} />} />
            <DetailRow label="Expires At" value={formatDate(tenant.subscriptionExpiresAt)} />
            <DetailRow
              label="Super Admin Can View"
              value={
                tenant.superAdminCanView ? (
                  <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                    <EyeIcon className="h-4 w-4" /> Yes
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                    <EyeSlashIcon className="h-4 w-4" /> No
                  </span>
                )
              }
            />
            <DetailRow label="CEO Email" value={tenant.ceoEmail || 'Not set'} />
          </div>
        </SectionCard>

        {/* Designated Manager */}
        <SectionCard
          title="Designated Manager"
          icon={UserPlusIcon}
          action={
            <button
              onClick={handleAssignManager}
              disabled={assignManagerMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-50"
            >
              {assignManagerMutation.isPending ? 'Assigning...' : 'Assign Manager'}
            </button>
          }
        >
          {tenant.designatedManager ? (
            <div className="space-y-1">
              <DetailRow label="Name" value={tenant.designatedManager.name} />
              <DetailRow label="Email" value={tenant.designatedManager.email} />
              <DetailRow
                label="Status"
                value={
                  tenant.designatedManager.isActive ? (
                    <Badge label="Active" colorClass="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" />
                  ) : (
                    <Badge label="Inactive" colorClass="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" />
                  )
                }
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <UserPlusIcon className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No designated manager assigned</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Assign a manager to handle employee data uploads.
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tabs                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {/* Tab bar */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px px-6 gap-6" aria-label="Tabs">
            {TABS.map((tab) => {
              const isSelected = activeTab === tab;
              const tabIcons: Record<TabName, React.ForwardRefExoticComponent<any>> = {
                Overview: GlobeAltIcon,
                Features: Cog6ToothIcon,
                Security: ShieldCheckIcon,
                Settings: BuildingOffice2Icon,
              };
              const TabIcon = tabIcons[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`inline-flex items-center gap-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <TabIcon className="h-4 w-4" />
                  {tab}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'Overview' && <OverviewTab tenant={tenant} />}
          {activeTab === 'Features' && (
            <FeaturesTab settings={tenant.settings} onToggle={handleFeatureToggle} />
          )}
          {activeTab === 'Security' && <SecurityTab settings={tenant.settings} />}
          {activeTab === 'Settings' && (
            <SettingsTab
              tenant={tenant}
              onSave={(data) => updateMutation.mutate(data)}
              isSaving={updateMutation.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}
