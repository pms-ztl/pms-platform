import { useState, useEffect } from 'react';
import {
  UsersIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface LicenseUsage {
  activeUsers: number;
  licenseCount: number;
  availableSeats: number;
  usagePercentage: number;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
}

export function LicenseDashboard() {
  const [usage, setUsage] = useState<LicenseUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsage = async () => {
    setLoading(true);
    setError('');
    try {
      const { useAuthStore } = await import('@/store/auth');
      const token = useAuthStore.getState().accessToken;
      const response = await fetch(`${API_BASE_URL}/users/license/usage`, {
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await response.json();
      if (data.success) {
        setUsage(data.data);
      } else {
        setError(data.message || 'Failed to load license data');
      }
    } catch {
      setError('Failed to load license data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsage(); }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3" />
          <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-1/2" />
          <div className="h-2 bg-secondary-200 dark:bg-secondary-700 rounded" />
        </div>
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
        <p className="text-sm text-secondary-500">{error || 'No license data available'}</p>
      </div>
    );
  }

  const isNearLimit = usage.usagePercentage >= 80;
  const isAtLimit = usage.usagePercentage >= 100;
  const barColor = isAtLimit
    ? 'bg-red-500'
    : isNearLimit
    ? 'bg-yellow-500'
    : 'bg-primary-500';

  const daysUntilExpiry = usage.subscriptionExpiresAt
    ? Math.ceil((new Date(usage.subscriptionExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-5 w-5 text-primary-500" />
          <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">License Usage</h3>
        </div>
        <button onClick={loadUsage} className="text-secondary-400 hover:text-secondary-600">
          <ArrowPathIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-end gap-1 mb-1">
        <span className="text-3xl font-bold text-secondary-900 dark:text-white">{usage.activeUsers}</span>
        <span className="text-lg text-secondary-500 dark:text-secondary-400 pb-0.5">/ {usage.licenseCount}</span>
      </div>
      <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-3">
        {usage.availableSeats} seat{usage.availableSeats !== 1 ? 's' : ''} available
      </p>

      {/* Progress bar */}
      <div className="w-full h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(usage.usagePercentage, 100)}%` }}
        />
      </div>

      {/* Alerts */}
      {isAtLimit && (
        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-xs mb-3">
          <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
          License limit reached. Contact your administrator to add more seats.
        </div>
      )}
      {isNearLimit && !isAtLimit && (
        <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg text-xs mb-3">
          <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
          {usage.usagePercentage.toFixed(0)}% of license seats used.
        </div>
      )}

      {/* Plan info */}
      <div className="flex items-center justify-between text-xs pt-3 border-t border-secondary-200 dark:border-secondary-700">
        <div className="flex items-center gap-1.5">
          <span className="text-secondary-500">Plan:</span>
          <span className="font-medium text-secondary-700 dark:text-secondary-300">{usage.subscriptionPlan}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {usage.subscriptionStatus === 'ACTIVE' ? (
            <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <ExclamationTriangleIcon className="h-3.5 w-3.5 text-yellow-500" />
          )}
          <span className="text-secondary-500">{usage.subscriptionStatus}</span>
        </div>
      </div>

      {daysUntilExpiry !== null && daysUntilExpiry <= 30 && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
          Subscription expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
