import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UsersIcon,
  KeyIcon,
  ArrowPathIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserPlusIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { licenseApi, type LicenseUsageData, type SubscriptionInfo } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHeader } from '@/components/ui';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export function LicenseDashboardPage() {
  usePageTitle('License & Seats');
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [managerEmail, setManagerEmail] = useState('');

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['license-usage'],
    queryFn: () => licenseApi.getUsage(),
  });

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['subscription-info'],
    queryFn: () => licenseApi.getSubscription(),
  });

  const { data: breakdown } = useQuery({
    queryKey: ['employee-breakdown'],
    queryFn: () => licenseApi.getBreakdown(),
  });

  const { data: uploadHistory } = useQuery({
    queryKey: ['upload-history'],
    queryFn: async () => {
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(`${API_BASE_URL}/excel-upload/history?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.data?.uploads ?? data.data ?? [];
    },
  });

  const isLoading = usageLoading || subLoading;

  const isAdmin = user?.roles?.includes('HR_ADMIN') || user?.roles?.includes('ADMIN') || user?.roles?.includes('SUPER_ADMIN');

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldCheckIcon className="h-12 w-12 text-secondary-400 mb-4" />
        <h2 className="text-xl font-semibold text-secondary-900 dark:text-white">Access Denied</h2>
        <p className="text-secondary-500 dark:text-secondary-400 mt-2">You need admin permissions to view this page.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="License Dashboard" subtitle="Loading license information..." />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3" />
                <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const barColor =
    (usage?.usagePercent ?? 0) >= 100
      ? 'bg-red-500'
      : (usage?.usagePercent ?? 0) >= 90
        ? 'bg-yellow-500'
        : 'bg-primary-500';

  const statusColor =
    subscription?.status === 'ACTIVE'
      ? 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400'
      : subscription?.status === 'TRIAL'
        ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
        : 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';

  const daysUntilExpiry = subscription?.expiresAt
    ? Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="License Dashboard"
        subtitle={`Manage licenses, seats, and subscription for ${subscription?.companyName || 'your organization'}`}
      >
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['license-usage', 'subscription-info'] })}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </PageHeader>

      {/* Alerts */}
      {usage && usage.usagePercent >= 90 && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          usage.usagePercent >= 100
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300'
        }`}>
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">
              {usage.usagePercent >= 100 ? 'License Limit Reached' : 'Approaching License Limit'}
            </p>
            <p className="text-sm opacity-80">
              {usage.usagePercent >= 100
                ? `All ${usage.licenseCount} seats are in use. Archive inactive employees or purchase additional licenses to add new employees.`
                : `${usage.usagePercent}% of your seats are in use (${usage.activeUsers}/${usage.licenseCount}). Consider purchasing additional licenses.`
              }
            </p>
          </div>
        </div>
      )}

      {daysUntilExpiry !== null && daysUntilExpiry <= 30 && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          daysUntilExpiry <= 7
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300'
        }`}>
          <ClockIcon className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Subscription {daysUntilExpiry <= 0 ? 'Expired' : 'Expiring Soon'}</p>
            <p className="text-sm opacity-80">
              {daysUntilExpiry <= 0
                ? 'Your subscription has expired. New employee creation is disabled.'
                : `Your subscription expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. Please renew to avoid service interruption.`
              }
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Users */}
        <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
              <UsersIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Active Employees</span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-bold text-secondary-900 dark:text-white">{usage?.activeUsers ?? 0}</span>
            <span className="text-lg text-secondary-500 pb-0.5">/ {usage?.licenseCount ?? 0}</span>
          </div>
          <div className="mt-3">
            <div className="w-full h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${Math.min(usage?.usagePercent ?? 0, 100)}%` }}
              />
            </div>
            <p className="text-xs text-secondary-500 mt-1">{usage?.remaining ?? 0} seats available</p>
          </div>
        </div>

        {/* Archived Users */}
        <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-secondary-50 dark:bg-secondary-800">
              <ArrowTrendingUpIcon className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
            </div>
            <span className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Archived Employees</span>
          </div>
          <span className="text-3xl font-bold text-secondary-900 dark:text-white">{usage?.archivedUsers ?? 0}</span>
          <p className="text-xs text-secondary-500 mt-3">Historical records preserved</p>
        </div>

        {/* Max Org Level */}
        <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
              <ChartBarIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Organization Levels</span>
          </div>
          <span className="text-3xl font-bold text-secondary-900 dark:text-white">L1 - L{usage?.maxLevel ?? 16}</span>
          <p className="text-xs text-secondary-500 mt-3">Configured hierarchy depth</p>
        </div>

        {/* Subscription Status */}
        <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
              <KeyIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Subscription</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-secondary-900 dark:text-white">{subscription?.plan ?? 'N/A'}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
              {subscription?.status ?? 'N/A'}
            </span>
          </div>
          {subscription?.expiresAt && (
            <p className="text-xs text-secondary-500 mt-3">
              Expires: {new Date(subscription.expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Details */}
        <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700">
          <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center gap-2">
              <BuildingOffice2Icon className="h-5 w-5 text-secondary-500" />
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Subscription Details</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <DetailRow label="Organization" value={subscription?.companyName ?? '-'} />
            <DetailRow label="Plan" value={subscription?.plan ?? '-'} />
            <DetailRow label="Tier" value={subscription?.tier ?? '-'} />
            <DetailRow
              label="Status"
              value={
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
                  {subscription?.status ?? '-'}
                </span>
              }
            />
            <DetailRow
              label="Expiry Date"
              value={subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : 'No expiry set'}
            />
            <DetailRow label="Member Since" value={subscription?.memberSince ? new Date(subscription.memberSince).toLocaleDateString() : '-'} />
          </div>
        </div>

        {/* Designated Manager */}
        <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700">
          <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlusIcon className="h-5 w-5 text-secondary-500" />
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Designated Manager</h2>
              </div>
              <button
                onClick={() => setShowAssignModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30"
              >
                {subscription?.designatedManager ? 'Change' : 'Assign'}
              </button>
            </div>
          </div>
          <div className="p-6">
            {subscription?.designatedManager ? (
              <div className="space-y-4">
                <DetailRow label="Name" value={subscription.designatedManager.name} />
                <DetailRow label="Email" value={subscription.designatedManager.email} />
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    This person is authorized to upload Excel sheets and manage employee data for your organization.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <UserPlusIcon className="h-10 w-10 text-secondary-300 dark:text-secondary-600 mx-auto mb-3" />
                <p className="text-sm text-secondary-500 dark:text-secondary-400">No designated manager assigned</p>
                <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                  Assign a manager who can upload employee data via Excel
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* License Usage Breakdown */}
      <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700">
        <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5 text-secondary-500" />
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">License Usage Summary</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <UsageStat label="Total Licensed" value={usage?.licenseCount ?? 0} color="text-secondary-900 dark:text-white" />
            <UsageStat label="Active" value={usage?.activeUsers ?? 0} color="text-green-600 dark:text-green-400" />
            <UsageStat label="Archived" value={usage?.archivedUsers ?? 0} color="text-secondary-500" />
            <UsageStat label="Available" value={usage?.remaining ?? 0} color="text-primary-600 dark:text-primary-400" />
            <UsageStat label="Usage %" value={`${usage?.usagePercent ?? 0}%`} color={
              (usage?.usagePercent ?? 0) >= 100 ? 'text-red-600 dark:text-red-400' :
              (usage?.usagePercent ?? 0) >= 90 ? 'text-yellow-600 dark:text-yellow-400' :
              'text-green-600 dark:text-green-400'
            } />
          </div>

          {/* Visual bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-secondary-500 mb-2">
              <span>0</span>
              <span>{usage?.licenseCount ?? 0} seats</span>
            </div>
            <div className="w-full h-4 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${Math.min(usage?.usagePercent ?? 0, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs mt-2">
              <span className="text-green-600 dark:text-green-400">{usage?.activeUsers ?? 0} active</span>
              <span className="text-secondary-400">{usage?.remaining ?? 0} remaining</span>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Breakdown */}
      {breakdown && (breakdown.byLevel.length > 0 || breakdown.byDepartment.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Level */}
          {breakdown.byLevel.length > 0 && (
            <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700">
              <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
                <div className="flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5 text-secondary-500" />
                  <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Employees by Level</h2>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {breakdown.byLevel.map((item) => {
                  const maxCount = Math.max(...breakdown.byLevel.map((i) => i.count));
                  const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  return (
                    <div key={item.level} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-secondary-500 w-6 text-right">L{item.level}</span>
                      <div className="flex-1 h-5 bg-secondary-100 dark:bg-secondary-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-secondary-700 dark:text-secondary-300 w-8 text-right">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* By Department */}
          {breakdown.byDepartment.length > 0 && (
            <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700">
              <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
                <div className="flex items-center gap-2">
                  <BuildingOffice2Icon className="h-5 w-5 text-secondary-500" />
                  <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Employees by Department</h2>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {breakdown.byDepartment.slice(0, 10).map((item) => {
                  const maxCount = Math.max(...breakdown.byDepartment.map((i) => i.count));
                  const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="text-xs text-secondary-500 w-24 break-words text-right" title={item.name}>{item.name}</span>
                      <div className="flex-1 h-5 bg-secondary-100 dark:bg-secondary-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-secondary-700 dark:text-secondary-300 w-8 text-right">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload History */}
      {Array.isArray(uploadHistory) && uploadHistory.length > 0 && (
        <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700">
          <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center gap-2">
              <ArrowTrendingUpIcon className="h-5 w-5 text-secondary-500" />
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Recent Excel Uploads</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-200 dark:border-secondary-700">
                  <th className="text-left px-6 py-3 text-xs font-medium text-secondary-500">File</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-secondary-500">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-secondary-500">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-secondary-500">Rows</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-secondary-500">Success</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-secondary-500">Errors</th>
                </tr>
              </thead>
              <tbody>
                {uploadHistory.map((upload: any) => (
                  <tr key={upload.id} className="border-b border-secondary-100 dark:border-secondary-800 last:border-0">
                    <td className="px-6 py-3 text-secondary-900 dark:text-white font-medium break-words max-w-[200px]" title={upload.fileName}>
                      {upload.fileName}
                    </td>
                    <td className="px-6 py-3 text-secondary-500">
                      {new Date(upload.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        upload.status === 'COMPLETED' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                        upload.status === 'FAILED' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                        upload.status === 'PARTIAL' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      }`}>
                        {upload.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-secondary-900 dark:text-white">{upload.totalRows ?? '-'}</td>
                    <td className="px-6 py-3 text-right text-green-600 dark:text-green-400">{upload.successCount ?? '-'}</td>
                    <td className="px-6 py-3 text-right text-red-600 dark:text-red-400">{upload.errorCount ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Manager Modal */}
      {showAssignModal && (
        <AssignManagerModal
          onClose={() => { setShowAssignModal(false); setManagerEmail(''); }}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['subscription-info'] })}
        />
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-secondary-100 dark:border-secondary-800 last:border-0">
      <span className="text-sm text-secondary-500 dark:text-secondary-400">{label}</span>
      <span className="text-sm font-medium text-secondary-900 dark:text-white">{typeof value === 'string' ? value : value}</span>
    </div>
  );
}

function UsageStat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-secondary-50 dark:bg-secondary-800">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">{label}</p>
    </div>
  );
}

function AssignManagerModal({
  onClose,
  onRefresh,
}: {
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);
  const [searching, setSearching] = useState(false);

  const assignMutation = useMutation({
    mutationFn: (managerUserId: string) => licenseApi.assignDesignatedManager(managerUserId),
    onSuccess: (data) => {
      toast.success(`${data.managerName} assigned as designated manager`);
      onRefresh();
      onClose();
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to assign manager'),
  });

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    try {
      const token = useAuthStore.getState().accessToken;
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
      const res = await fetch(`${API_BASE_URL}/users?search=${encodeURIComponent(searchEmail)}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data || []);
      }
    } catch {
      toast.error('Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-secondary-900 rounded-xl shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Assign Designated Manager</h3>
          <p className="text-sm text-secondary-500 mt-1">Search for a user to assign as manager for Excel uploads.</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name or email..."
              className="flex-1 px-3 py-2 text-sm border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white placeholder-secondary-400"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {searching ? '...' : 'Search'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedUserId === u.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-300 dark:border-primary-700'
                      : 'hover:bg-secondary-50 dark:hover:bg-secondary-800'
                  }`}
                >
                  <p className="font-medium text-secondary-900 dark:text-white">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-secondary-500">{u.email}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-secondary-200 dark:border-secondary-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-50"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedUserId && assignMutation.mutate(selectedUserId)}
            disabled={!selectedUserId || assignMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {assignMutation.isPending ? 'Assigning...' : 'Assign Manager'}
          </button>
        </div>
      </div>
    </div>
  );
}
