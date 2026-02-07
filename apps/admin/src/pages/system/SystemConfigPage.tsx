import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemApi, SystemConfig } from '../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  WrenchIcon,
  CogIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

type TabType = 'general' | 'email' | 'security' | 'limits' | 'maintenance';

export default function SystemConfigPage() {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['system-config'],
    queryFn: () => systemApi.getConfig(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<SystemConfig>) => systemApi.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Configuration updated');
    },
  });

  const clearCacheMutation = useMutation({
    mutationFn: (type?: string) => systemApi.clearCache(type),
    onSuccess: () => {
      toast.success('Cache cleared');
    },
  });

  const tabs = [
    { id: 'general', name: 'General', icon: CogIcon },
    { id: 'email', name: 'Email', icon: EnvelopeIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'limits', name: 'Limits', icon: ChartBarIcon },
    { id: 'maintenance', name: 'Maintenance', icon: WrenchIcon },
  ];

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  const c = config?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage global system settings and configuration
        </p>
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
        {activeTab === 'general' && c && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">General Settings</h3>

            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Enable Signups</p>
                <p className="text-sm text-gray-500">
                  Allow new organizations to sign up
                </p>
              </div>
              <button
                onClick={() =>
                  updateMutation.mutate({
                    features: {
                      ...c.features,
                      signupsEnabled: !c.features.signupsEnabled,
                    },
                  })
                }
                className={clsx(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  c.features.signupsEnabled ? 'bg-primary-600' : 'bg-gray-200'
                )}
              >
                <span
                  className={clsx(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    c.features.signupsEnabled ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Require Email Verification</p>
                <p className="text-sm text-gray-500">
                  Users must verify email before accessing the system
                </p>
              </div>
              <button
                onClick={() =>
                  updateMutation.mutate({
                    features: {
                      ...c.features,
                      requireEmailVerification: !c.features.requireEmailVerification,
                    },
                  })
                }
                className={clsx(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  c.features.requireEmailVerification ? 'bg-primary-600' : 'bg-gray-200'
                )}
              >
                <span
                  className={clsx(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    c.features.requireEmailVerification ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            <div className="py-4 border-b border-gray-100">
              <label className="block font-medium text-gray-900 mb-1">
                Trial Period (days)
              </label>
              <input
                type="number"
                defaultValue={c.features.trialDays}
                onBlur={(e) =>
                  updateMutation.mutate({
                    features: {
                      ...c.features,
                      trialDays: parseInt(e.target.value),
                    },
                  })
                }
                className="input w-full max-w-xs"
                min={0}
                max={90}
              />
            </div>

            <div className="py-4">
              <label className="block font-medium text-gray-900 mb-1">
                Default Plan
              </label>
              <select
                defaultValue={c.features.defaultPlan}
                onChange={(e) =>
                  updateMutation.mutate({
                    features: {
                      ...c.features,
                      defaultPlan: e.target.value,
                    },
                  })
                }
                className="input w-full max-w-xs"
              >
                <option value="FREE">Free</option>
                <option value="STARTER">Starter</option>
                <option value="PROFESSIONAL">Professional</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'email' && c && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Email Configuration</h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block font-medium text-gray-900 mb-1">
                  Email Provider
                </label>
                <select
                  defaultValue={c.email.provider}
                  className="input w-full"
                  disabled
                >
                  <option value="sendgrid">SendGrid</option>
                  <option value="ses">Amazon SES</option>
                  <option value="smtp">Custom SMTP</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-gray-900 mb-1">
                  From Address
                </label>
                <input
                  type="email"
                  defaultValue={c.email.fromAddress}
                  className="input w-full"
                />
              </div>
              <div className="col-span-2">
                <label className="block font-medium text-gray-900 mb-1">
                  From Name
                </label>
                <input
                  type="text"
                  defaultValue={c.email.fromName}
                  className="input w-full max-w-md"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button className="btn btn-primary">Save Email Settings</button>
            </div>
          </div>
        )}

        {activeTab === 'security' && c && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>

            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Require MFA for Admins</p>
                <p className="text-sm text-gray-500">
                  Force all admin users to enable MFA
                </p>
              </div>
              <button
                onClick={() =>
                  updateMutation.mutate({
                    security: {
                      ...c.security,
                      requireMfaForAdmins: !c.security.requireMfaForAdmins,
                    },
                  })
                }
                className={clsx(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  c.security.requireMfaForAdmins ? 'bg-primary-600' : 'bg-gray-200'
                )}
              >
                <span
                  className={clsx(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    c.security.requireMfaForAdmins ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            <div className="py-4 border-b border-gray-100">
              <label className="block font-medium text-gray-900 mb-1">
                Max Login Attempts
              </label>
              <input
                type="number"
                defaultValue={c.security.maxLoginAttempts}
                onBlur={(e) =>
                  updateMutation.mutate({
                    security: {
                      ...c.security,
                      maxLoginAttempts: parseInt(e.target.value),
                    },
                  })
                }
                className="input w-full max-w-xs"
                min={3}
                max={10}
              />
              <p className="text-sm text-gray-500 mt-1">
                Account locks after this many failed attempts
              </p>
            </div>

            <div className="py-4 border-b border-gray-100">
              <label className="block font-medium text-gray-900 mb-1">
                Lockout Duration (minutes)
              </label>
              <input
                type="number"
                defaultValue={c.security.lockoutDuration}
                onBlur={(e) =>
                  updateMutation.mutate({
                    security: {
                      ...c.security,
                      lockoutDuration: parseInt(e.target.value),
                    },
                  })
                }
                className="input w-full max-w-xs"
                min={5}
                max={60}
              />
            </div>

            <div className="py-4">
              <label className="block font-medium text-gray-900 mb-1">
                Minimum Password Length
              </label>
              <input
                type="number"
                defaultValue={c.security.passwordMinLength}
                onBlur={(e) =>
                  updateMutation.mutate({
                    security: {
                      ...c.security,
                      passwordMinLength: parseInt(e.target.value),
                    },
                  })
                }
                className="input w-full max-w-xs"
                min={8}
                max={32}
              />
            </div>
          </div>
        )}

        {activeTab === 'limits' && c && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">System Limits</h3>

            <div className="py-4 border-b border-gray-100">
              <label className="block font-medium text-gray-900 mb-1">
                Max Tenants Per Account
              </label>
              <input
                type="number"
                defaultValue={c.limits.maxTenantsPerAccount}
                onBlur={(e) =>
                  updateMutation.mutate({
                    limits: {
                      ...c.limits,
                      maxTenantsPerAccount: parseInt(e.target.value),
                    },
                  })
                }
                className="input w-full max-w-xs"
                min={1}
                max={100}
              />
            </div>

            <div className="py-4 border-b border-gray-100">
              <label className="block font-medium text-gray-900 mb-1">
                Max API Requests Per Minute
              </label>
              <input
                type="number"
                defaultValue={c.limits.maxApiRequestsPerMinute}
                onBlur={(e) =>
                  updateMutation.mutate({
                    limits: {
                      ...c.limits,
                      maxApiRequestsPerMinute: parseInt(e.target.value),
                    },
                  })
                }
                className="input w-full max-w-xs"
                min={60}
                max={10000}
              />
            </div>

            <div className="py-4">
              <label className="block font-medium text-gray-900 mb-1">
                Max File Upload Size (MB)
              </label>
              <input
                type="number"
                defaultValue={c.limits.maxFileUploadSizeMb}
                onBlur={(e) =>
                  updateMutation.mutate({
                    limits: {
                      ...c.limits,
                      maxFileUploadSizeMb: parseInt(e.target.value),
                    },
                  })
                }
                className="input w-full max-w-xs"
                min={1}
                max={100}
              />
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && c && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Maintenance Mode</h3>

            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Enable Maintenance Mode</p>
                <p className="text-sm text-gray-500">
                  Show maintenance page to all non-admin users
                </p>
              </div>
              <button
                onClick={() =>
                  updateMutation.mutate({
                    maintenance: {
                      ...c.maintenance,
                      enabled: !c.maintenance.enabled,
                    },
                  })
                }
                className={clsx(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  c.maintenance.enabled ? 'bg-danger-600' : 'bg-gray-200'
                )}
              >
                <span
                  className={clsx(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    c.maintenance.enabled ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {c.maintenance.enabled && (
              <div className="p-4 bg-warning-50 rounded-lg flex items-start gap-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-warning-600 mt-0.5" />
                <div>
                  <p className="font-medium text-warning-800">
                    Maintenance mode is active
                  </p>
                  <p className="text-sm text-warning-700">
                    All non-admin users will see the maintenance page
                  </p>
                </div>
              </div>
            )}

            <div className="py-4">
              <label className="block font-medium text-gray-900 mb-1">
                Maintenance Message
              </label>
              <textarea
                defaultValue={c.maintenance.message || ''}
                rows={3}
                className="input w-full"
                placeholder="We're currently performing scheduled maintenance..."
              />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="font-medium text-gray-900 mb-4">Cache Management</h4>
              <div className="flex gap-3">
                <button
                  onClick={() => clearCacheMutation.mutate('all')}
                  className="btn btn-secondary"
                >
                  Clear All Caches
                </button>
                <button
                  onClick={() => clearCacheMutation.mutate('sessions')}
                  className="btn btn-secondary"
                >
                  Clear Session Cache
                </button>
                <button
                  onClick={() => clearCacheMutation.mutate('api')}
                  className="btn btn-secondary"
                >
                  Clear API Cache
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
