import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cog6ToothIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  AdjustmentsHorizontalIcon,
  WrenchScrewdriverIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import { superAdminSystemApi, type SASystemConfig } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SystemTab = 'general' | 'email' | 'security' | 'limits' | 'maintenance';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS: { key: SystemTab; label: string; icon: React.ElementType }[] = [
  { key: 'general', label: 'General', icon: Cog6ToothIcon },
  { key: 'email', label: 'Email', icon: EnvelopeIcon },
  { key: 'security', label: 'Security', icon: ShieldCheckIcon },
  { key: 'limits', label: 'Limits', icon: AdjustmentsHorizontalIcon },
  { key: 'maintenance', label: 'Maintenance', icon: WrenchScrewdriverIcon },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SASystemPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SystemTab>('general');

  // Fetch current config
  const { data: config, isLoading } = useQuery({
    queryKey: ['sa-system-config'],
    queryFn: () => superAdminSystemApi.getConfig(),
  });

  // Local form state for each tab
  const [generalForm, setGeneralForm] = useState({
    signupsEnabled: true,
    requireEmailVerification: true,
    trialDays: 14,
    defaultPlan: 'FREE',
  });

  const [emailForm, setEmailForm] = useState({
    provider: '',
    fromAddress: '',
    fromName: '',
  });

  const [securityForm, setSecurityForm] = useState({
    requireMfaForAdmins: false,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    passwordMinLength: 8,
  });

  const [limitsForm, setLimitsForm] = useState({
    maxTenantsPerAccount: 10,
    maxApiRequestsPerMinute: 100,
    maxFileUploadSizeMb: 10,
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    enabled: false,
    message: '',
  });

  // Populate forms when config loads
  useEffect(() => {
    if (!config) return;
    setGeneralForm({
      signupsEnabled: config.features?.signupsEnabled ?? true,
      requireEmailVerification: config.features?.requireEmailVerification ?? true,
      trialDays: config.features?.trialDays ?? 14,
      defaultPlan: config.features?.defaultPlan ?? 'FREE',
    });
    setEmailForm({
      provider: config.email?.provider ?? '',
      fromAddress: config.email?.fromAddress ?? '',
      fromName: config.email?.fromName ?? '',
    });
    setSecurityForm({
      requireMfaForAdmins: config.security?.requireMfaForAdmins ?? false,
      maxLoginAttempts: config.security?.maxLoginAttempts ?? 5,
      lockoutDuration: config.security?.lockoutDuration ?? 30,
      passwordMinLength: config.security?.passwordMinLength ?? 8,
    });
    setLimitsForm({
      maxTenantsPerAccount: config.limits?.maxTenantsPerAccount ?? 10,
      maxApiRequestsPerMinute: config.limits?.maxApiRequestsPerMinute ?? 100,
      maxFileUploadSizeMb: config.limits?.maxFileUploadSizeMb ?? 10,
    });
    setMaintenanceForm({
      enabled: config.maintenance?.enabled ?? false,
      message: config.maintenance?.message ?? '',
    });
  }, [config]);

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: (partial: Partial<SASystemConfig>) =>
      superAdminSystemApi.updateConfig(partial),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sa-system-config'] });
      toast.success('Configuration saved');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save configuration');
    },
  });

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: (type?: string) => superAdminSystemApi.clearCache(type),
    onSuccess: (_, type) => {
      toast.success(type ? `${type} cache cleared` : 'All caches cleared');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to clear cache');
    },
  });

  // Save handlers per tab
  const handleSaveGeneral = () => {
    updateConfigMutation.mutate({
      features: {
        signupsEnabled: generalForm.signupsEnabled,
        requireEmailVerification: generalForm.requireEmailVerification,
        trialDays: generalForm.trialDays,
        defaultPlan: generalForm.defaultPlan,
      },
    });
  };

  const handleSaveEmail = () => {
    updateConfigMutation.mutate({
      email: {
        provider: emailForm.provider,
        fromAddress: emailForm.fromAddress,
        fromName: emailForm.fromName,
      },
    });
  };

  const handleSaveSecurity = () => {
    updateConfigMutation.mutate({
      security: {
        requireMfaForAdmins: securityForm.requireMfaForAdmins,
        maxLoginAttempts: securityForm.maxLoginAttempts,
        lockoutDuration: securityForm.lockoutDuration,
        passwordMinLength: securityForm.passwordMinLength,
      },
    });
  };

  const handleSaveLimits = () => {
    updateConfigMutation.mutate({
      limits: {
        maxTenantsPerAccount: limitsForm.maxTenantsPerAccount,
        maxApiRequestsPerMinute: limitsForm.maxApiRequestsPerMinute,
        maxFileUploadSizeMb: limitsForm.maxFileUploadSizeMb,
      },
    });
  };

  const handleSaveMaintenance = () => {
    updateConfigMutation.mutate({
      maintenance: {
        enabled: maintenanceForm.enabled,
        message: maintenanceForm.message || undefined,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">System Configuration</h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">Loading configuration...</p>
        </div>
        <div className="flex justify-center py-16">
          <div className="glass-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">System Configuration</h1>
        <p className="mt-1 text-secondary-600 dark:text-secondary-400">
          Manage platform-wide settings, email, security, and maintenance
        </p>
      </div>

      {/* Tabs + Content */}
      <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-secondary-200/60 dark:border-white/[0.06] overflow-x-auto">
          <nav className="flex -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={clsx(
                    'flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                    activeTab === tab.key
                      ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                      : 'border-transparent text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 hover:border-secondary-300 dark:hover:text-secondary-300'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">General Settings</h2>
              </div>

              {/* Signups Enabled */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-900 dark:text-white">Signups Enabled</p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">Allow new tenants to register</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={generalForm.signupsEnabled}
                  onClick={() => setGeneralForm((f) => ({ ...f, signupsEnabled: !f.signupsEnabled }))}
                  className={clsx(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    generalForm.signupsEnabled ? 'bg-primary-600' : 'bg-secondary-300 dark:bg-secondary-600'
                  )}
                >
                  <span
                    className={clsx(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      generalForm.signupsEnabled ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {/* Email Verification */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-900 dark:text-white">Email Verification</p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">Require email verification for new users</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={generalForm.requireEmailVerification}
                  onClick={() => setGeneralForm((f) => ({ ...f, requireEmailVerification: !f.requireEmailVerification }))}
                  className={clsx(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    generalForm.requireEmailVerification ? 'bg-primary-600' : 'bg-secondary-300 dark:bg-secondary-600'
                  )}
                >
                  <span
                    className={clsx(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      generalForm.requireEmailVerification ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {/* Trial Days */}
              <div>
                <label className="block text-sm font-medium text-secondary-900 dark:text-white mb-1">
                  Trial Duration (days)
                </label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={generalForm.trialDays}
                  onChange={(e) => setGeneralForm((f) => ({ ...f, trialDays: parseInt(e.target.value) || 0 }))}
                  className="w-full max-w-xs rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Default Plan */}
              <div>
                <label className="block text-sm font-medium text-secondary-900 dark:text-white mb-1">
                  Default Plan
                </label>
                <select
                  value={generalForm.defaultPlan}
                  onChange={(e) => setGeneralForm((f) => ({ ...f, defaultPlan: e.target.value }))}
                  className="w-full max-w-xs rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="FREE">Free</option>
                  <option value="STARTER">Starter</option>
                  <option value="PROFESSIONAL">Professional</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSaveGeneral}
                  disabled={updateConfigMutation.isPending}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  {updateConfigMutation.isPending ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircleIcon className="h-4 w-4" />
                  )}
                  Save General Settings
                </button>
              </div>
            </div>
          )}

          {/* Email Tab */}
          {activeTab === 'email' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Email Settings</h2>
              </div>

              {/* Provider (read-only) */}
              <div>
                <label className="block text-sm font-medium text-secondary-900 dark:text-white mb-1">
                  Email Provider
                </label>
                <input
                  type="text"
                  value={emailForm.provider}
                  disabled
                  className="w-full max-w-xs rounded-lg border border-secondary-300 dark:border-secondary-600 bg-secondary-100 dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-500 dark:text-secondary-400 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-secondary-400 dark:text-secondary-500">Provider cannot be changed here</p>
              </div>

              {/* From Address */}
              <div>
                <label className="block text-sm font-medium text-secondary-900 dark:text-white mb-1">
                  From Address
                </label>
                <input
                  type="email"
                  value={emailForm.fromAddress}
                  onChange={(e) => setEmailForm((f) => ({ ...f, fromAddress: e.target.value }))}
                  className="w-full max-w-md rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="noreply@yourplatform.com"
                />
              </div>

              {/* From Name */}
              <div>
                <label className="block text-sm font-medium text-secondary-900 dark:text-white mb-1">
                  From Name
                </label>
                <input
                  type="text"
                  value={emailForm.fromName}
                  onChange={(e) => setEmailForm((f) => ({ ...f, fromName: e.target.value }))}
                  className="w-full max-w-md rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="PMS Platform"
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSaveEmail}
                  disabled={updateConfigMutation.isPending}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  {updateConfigMutation.isPending ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircleIcon className="h-4 w-4" />
                  )}
                  Save Email Settings
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Security Settings</h2>
              </div>

              {/* MFA for Admins */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-900 dark:text-white">Require MFA for Admins</p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">Force all admin users to enable MFA</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={securityForm.requireMfaForAdmins}
                  onClick={() => setSecurityForm((f) => ({ ...f, requireMfaForAdmins: !f.requireMfaForAdmins }))}
                  className={clsx(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    securityForm.requireMfaForAdmins ? 'bg-primary-600' : 'bg-secondary-300 dark:bg-secondary-600'
                  )}
                >
                  <span
                    className={clsx(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      securityForm.requireMfaForAdmins ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {/* Max Login Attempts */}
              <div>
                <label className="block text-sm font-medium text-secondary-900 dark:text-white mb-1">
                  Max Login Attempts
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={securityForm.maxLoginAttempts}
                  onChange={(e) => setSecurityForm((f) => ({ ...f, maxLoginAttempts: parseInt(e.target.value) || 5 }))}
                  className="w-full max-w-xs rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="mt-1 text-xs text-secondary-400 dark:text-secondary-500">Number of attempts before lockout</p>
              </div>

              {/* Lockout Duration */}
              <div>
                <label className="block text-sm font-medium text-secondary-900 dark:text-white mb-1">
                  Lockout Duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={securityForm.lockoutDuration}
                  onChange={(e) => setSecurityForm((f) => ({ ...f, lockoutDuration: parseInt(e.target.value) || 30 }))}
                  className="w-full max-w-xs rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Password Min Length */}
              <div>
                <label className="block text-sm font-medium text-secondary-900 dark:text-white mb-1">
                  Minimum Password Length
                </label>
                <input
                  type="number"
                  min={6}
                  max={128}
                  value={securityForm.passwordMinLength}
                  onChange={(e) => setSecurityForm((f) => ({ ...f, passwordMinLength: parseInt(e.target.value) || 8 }))}
                  className="w-full max-w-xs rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSaveSecurity}
                  disabled={updateConfigMutation.isPending}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  {updateConfigMutation.isPending ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircleIcon className="h-4 w-4" />
                  )}
                  Save Security Settings
                </button>
              </div>
            </div>
          )}

          {/* Limits Tab */}
          {activeTab === 'limits' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Platform Limits</h2>
              </div>

              {/* Max Tenants */}
              <div>
                <label className="block text-sm font-medium text-secondary-900 dark:text-white mb-1">
                  Max Tenants per Account
                </label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={limitsForm.maxTenantsPerAccount}
                  onChange={(e) => setLimitsForm((f) => ({ ...f, maxTenantsPerAccount: parseInt(e.target.value) || 10 }))}
                  className="w-full max-w-xs rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Max API Requests */}
              <div>
                <label className="block text-sm font-medium text-secondary-900 dark:text-white mb-1">
                  Max API Requests per Minute
                </label>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={limitsForm.maxApiRequestsPerMinute}
                  onChange={(e) => setLimitsForm((f) => ({ ...f, maxApiRequestsPerMinute: parseInt(e.target.value) || 100 }))}
                  className="w-full max-w-xs rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Max File Upload Size */}
              <div>
                <label className="block text-sm font-medium text-secondary-900 dark:text-white mb-1">
                  Max File Upload Size (MB)
                </label>
                <input
                  type="number"
                  min={1}
                  max={1024}
                  value={limitsForm.maxFileUploadSizeMb}
                  onChange={(e) => setLimitsForm((f) => ({ ...f, maxFileUploadSizeMb: parseInt(e.target.value) || 10 }))}
                  className="w-full max-w-xs rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSaveLimits}
                  disabled={updateConfigMutation.isPending}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  {updateConfigMutation.isPending ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircleIcon className="h-4 w-4" />
                  )}
                  Save Limits
                </button>
              </div>
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Maintenance Mode</h2>
              </div>

              {/* Maintenance Mode Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-secondary-200/60 dark:border-white/[0.06] bg-secondary-50 dark:bg-secondary-900/30">
                <div className="flex items-center gap-3">
                  {maintenanceForm.enabled ? (
                    <ExclamationTriangleIcon className="h-6 w-6 text-amber-500" />
                  ) : (
                    <CheckCircleIcon className="h-6 w-6 text-green-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-secondary-900 dark:text-white">
                      Maintenance Mode
                    </p>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400">
                      {maintenanceForm.enabled
                        ? 'Platform is in maintenance mode. Users cannot access the application.'
                        : 'Platform is operating normally.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={maintenanceForm.enabled}
                  onClick={() => setMaintenanceForm((f) => ({ ...f, enabled: !f.enabled }))}
                  className={clsx(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    maintenanceForm.enabled ? 'bg-amber-500' : 'bg-secondary-300 dark:bg-secondary-600'
                  )}
                >
                  <span
                    className={clsx(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      maintenanceForm.enabled ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {/* Maintenance Message */}
              <div>
                <label className="block text-sm font-medium text-secondary-900 dark:text-white mb-1">
                  Maintenance Message
                </label>
                <textarea
                  value={maintenanceForm.message}
                  onChange={(e) => setMaintenanceForm((f) => ({ ...f, message: e.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  placeholder="We are performing scheduled maintenance. Please check back shortly."
                />
                <p className="mt-1 text-xs text-secondary-400 dark:text-secondary-500">
                  This message will be shown to users when maintenance mode is active
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSaveMaintenance}
                  disabled={updateConfigMutation.isPending}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  {updateConfigMutation.isPending ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircleIcon className="h-4 w-4" />
                  )}
                  Save Maintenance Settings
                </button>
              </div>

              {/* Cache Management */}
              <div className="border-t border-secondary-200/60 dark:border-white/[0.06] pt-6 mt-6">
                <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">Cache Management</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => clearCacheMutation.mutate(undefined)}
                    disabled={clearCacheMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-primary-50/30 dark:hover:bg-white/[0.03] transition-colors disabled:opacity-50"
                  >
                    <ArrowPathIcon className={clsx('h-4 w-4', clearCacheMutation.isPending && 'animate-spin')} />
                    Clear All Caches
                  </button>
                  <button
                    onClick={() => clearCacheMutation.mutate('redis')}
                    disabled={clearCacheMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-primary-50/30 dark:hover:bg-white/[0.03] transition-colors disabled:opacity-50"
                  >
                    <ArrowPathIcon className={clsx('h-4 w-4', clearCacheMutation.isPending && 'animate-spin')} />
                    Clear Redis Cache
                  </button>
                  <button
                    onClick={() => clearCacheMutation.mutate('api')}
                    disabled={clearCacheMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-primary-50/30 dark:hover:bg-white/[0.03] transition-colors disabled:opacity-50"
                  >
                    <ArrowPathIcon className={clsx('h-4 w-4', clearCacheMutation.isPending && 'animate-spin')} />
                    Clear API Cache
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
