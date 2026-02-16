import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsApi, TenantSettings } from '../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  UsersIcon,
  CircleStackIcon,
  ChartBarIcon,
  CogIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/outline';

type TabType = 'overview' | 'settings' | 'features' | 'security' | 'branding';

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const queryClient = useQueryClient();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantsApi.get(id!),
    enabled: !!id,
  });

  const { data: metrics } = useQuery({
    queryKey: ['tenant-metrics', id],
    queryFn: () => tenantsApi.getMetrics(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<TenantSettings>) =>
      tenantsApi.updateSettings(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
      toast.success('Settings updated');
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (!tenant?.data) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Tenant not found</p>
        <button onClick={() => navigate('/tenants')} className="btn btn-primary mt-4">
          Back to Tenants
        </button>
      </div>
    );
  }

  const t = tenant.data;
  const m = metrics?.data;

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'settings', name: 'Settings', icon: CogIcon },
    { id: 'features', name: 'Features', icon: PaintBrushIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/tenants"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <BuildingOfficeIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t.name}</h1>
              <p className="text-sm text-gray-500">{t.slug}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'badge',
              t.status === 'ACTIVE'
                ? 'bg-success-100 text-success-700'
                : t.status === 'TRIAL'
                ? 'bg-warning-100 text-warning-700'
                : 'bg-danger-100 text-danger-700'
            )}
          >
            {t.status}
          </span>
          <span className="badge bg-primary-100 text-primary-700">{t.plan}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UsersIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">
                {m?.users || t.userCount}
                <span className="text-sm font-normal text-gray-400"> / {t.licenseCount || '~'}</span>
              </p>
              <p className="text-sm text-gray-500">Active Users / Licenses</p>
              {t.licenseCount > 0 && (
                <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1">
                  <div
                    className={clsx('h-1.5 rounded-full',
                      (t.userCount / t.licenseCount) * 100 >= 90 ? 'bg-red-500' :
                      (t.userCount / t.licenseCount) * 100 >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    )}
                    style={{ width: `${Math.min(Math.round((t.userCount / t.licenseCount) * 100), 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">L1-L{t.maxLevel || 16}</p>
              <p className="text-sm text-gray-500">Org Levels</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{m?.goals || 0}</p>
              <p className="text-sm text-gray-500">Goals</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{m?.reviews || 0}</p>
              <p className="text-sm text-gray-500">Reviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription & Manager Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Subscription Details</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Plan</span>
              <span className="text-sm font-medium text-gray-900">{t.plan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Expires</span>
              <span className="text-sm font-medium text-gray-900">
                {t.subscriptionExpiresAt ? format(new Date(t.subscriptionExpiresAt), 'MMM d, yyyy') : 'No expiry set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Super Admin Visibility</span>
              <span className={clsx('text-sm font-medium', t.superAdminCanView ? 'text-emerald-600' : 'text-gray-400')}>
                {t.superAdminCanView ? 'Allowed' : 'Denied'}
              </span>
            </div>
            {t.ceoEmail && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">CEO Email</span>
                <span className="text-sm font-medium text-gray-900">{t.ceoEmail}</span>
              </div>
            )}
          </div>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Designated Manager</h3>
          {t.designatedManager ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Name</span>
                <span className="text-sm font-medium text-gray-900">{t.designatedManager.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Email</span>
                <span className="text-sm font-medium text-gray-900">{t.designatedManager.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={clsx('text-sm font-medium', t.designatedManager.isActive ? 'text-emerald-600' : 'text-red-600')}>
                  {t.designatedManager.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No designated manager assigned yet</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={clsx(
                'flex items-center gap-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon className="h-5 w-5" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="card p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Created</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {format(new Date(t.createdAt), 'MMMM d, yyyy')}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {format(new Date(t.updatedAt), 'MMMM d, yyyy')}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Domain</h3>
                <p className="mt-1 text-sm text-gray-900">{t.domain || 'Not configured'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Monthly Active Users</h3>
                <p className="mt-1 text-sm text-gray-900">{t.monthlyActiveUsers}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">License & Plan Limits</h3>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Licensed Seats</p>
                  <p className="text-lg font-semibold text-gray-900">{t.licenseCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Max Org Levels</p>
                  <p className="text-lg font-semibold text-gray-900">L1-L{t.maxLevel || 16}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Max Users (Legacy)</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {t.settings?.limits?.maxUsers === -1
                      ? 'Unlimited'
                      : t.settings?.limits?.maxUsers ?? t.maxUsers}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Feature Flags</h3>
            {Object.entries(t.settings.features).map(([feature, enabled]) => (
              <div
                key={feature}
                className="flex items-center justify-between py-3 border-b border-gray-100"
              >
                <div>
                  <p className="font-medium text-gray-900 capitalize">{feature}</p>
                  <p className="text-sm text-gray-500">
                    {enabled ? 'Enabled for this tenant' : 'Disabled'}
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateMutation.mutate({
                      features: {
                        ...t.settings.features,
                        [feature]: !enabled,
                      },
                    })
                  }
                  className={clsx(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    enabled ? 'bg-primary-600' : 'bg-gray-200'
                  )}
                >
                  <span
                    className={clsx(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">MFA Required</p>
                <p className="text-sm text-gray-500">
                  Require multi-factor authentication for all users
                </p>
              </div>
              <button
                onClick={() =>
                  updateMutation.mutate({
                    security: {
                      ...t.settings.security,
                      mfaRequired: !t.settings.security.mfaRequired,
                    },
                  })
                }
                className={clsx(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  t.settings.security.mfaRequired ? 'bg-primary-600' : 'bg-gray-200'
                )}
              >
                <span
                  className={clsx(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    t.settings.security.mfaRequired ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">SSO Enabled</p>
                <p className="text-sm text-gray-500">
                  Allow single sign-on authentication
                </p>
              </div>
              <button
                onClick={() =>
                  updateMutation.mutate({
                    security: {
                      ...t.settings.security,
                      ssoEnabled: !t.settings.security.ssoEnabled,
                    },
                  })
                }
                className={clsx(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  t.settings.security.ssoEnabled ? 'bg-primary-600' : 'bg-gray-200'
                )}
              >
                <span
                  className={clsx(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    t.settings.security.ssoEnabled ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            <div className="py-3 border-b border-gray-100">
              <label className="block font-medium text-gray-900 mb-1">
                Password Policy
              </label>
              <select
                value={t.settings.security.passwordPolicy}
                onChange={(e) =>
                  updateMutation.mutate({
                    security: {
                      ...t.settings.security,
                      passwordPolicy: e.target.value as 'STANDARD' | 'STRONG' | 'CUSTOM',
                    },
                  })
                }
                className="input w-full max-w-xs"
              >
                <option value="STANDARD">Standard</option>
                <option value="STRONG">Strong</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>

            <div className="py-3">
              <label className="block font-medium text-gray-900 mb-1">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={t.settings.security.sessionTimeout}
                onChange={(e) =>
                  updateMutation.mutate({
                    security: {
                      ...t.settings.security,
                      sessionTimeout: parseInt(e.target.value),
                    },
                  })
                }
                className="input w-full max-w-xs"
                min={5}
                max={1440}
              />
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tenant Settings</h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  defaultValue={t.name}
                  className="input"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  defaultValue={t.slug}
                  className="input"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Domain
                </label>
                <input
                  type="text"
                  defaultValue={t.domain || ''}
                  placeholder="app.yourcompany.com"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan
                </label>
                <select defaultValue={t.plan} className="input">
                  <option value="FREE">Free</option>
                  <option value="STARTER">Starter</option>
                  <option value="PROFESSIONAL">Professional</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button className="btn btn-primary">Save Changes</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
