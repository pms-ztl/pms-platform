/**
 * Feature 4: Deadline Proximity Alert System
 *
 * Identifies approaching deadlines and generates notifications
 * based on completion probability forecasts
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BellAlertIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  CalendarDaysIcon,
  CheckIcon,
  BellSlashIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface DeadlineAlert {
  id: string;
  entityType: string;
  entityId: string;
  entityTitle: string;
  deadline: string;
  daysUntilDeadline: number;
  hoursUntilDeadline: number;
  currentProgress: number;
  requiredDailyProgress: number;
  completionProbability: number;
  alertLevel: 'info' | 'warning' | 'urgent' | 'overdue';
  isAcknowledged: boolean;
  isSnoozed: boolean;
  snoozedUntil: string | null;
}

const api = {
  getAlerts: async (): Promise<DeadlineAlert[]> => {
    const res = await fetchWithAuth('/api/v1/realtime-performance/deadlines/alerts');
    const data = await res.json();
    return data.data;
  },
  checkDeadlines: async (): Promise<DeadlineAlert[]> => {
    const res = await fetchWithAuth('/api/v1/realtime-performance/deadlines/check');
    const data = await res.json();
    return data.data;
  },
  acknowledgeAlert: async (id: string): Promise<void> => {
    await fetchWithAuth(`/api/v1/realtime-performance/deadlines/alerts/${id}/acknowledge`, {
      method: 'POST',
    });
  },
  snoozeAlert: async (id: string, hours: number): Promise<void> => {
    await fetchWithAuth(`/api/v1/realtime-performance/deadlines/alerts/${id}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ hours }),
    });
  },
};

const alertConfig = {
  overdue: {
    icon: XCircleIcon,
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-500',
    title: 'Overdue',
    description: 'Past deadline',
  },
  urgent: {
    icon: ExclamationTriangleIcon,
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
    iconColor: 'text-orange-500',
    title: 'Urgent',
    description: 'Deadline approaching',
  },
  warning: {
    icon: BellAlertIcon,
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    iconColor: 'text-yellow-500',
    title: 'Warning',
    description: 'Needs attention',
  },
  info: {
    icon: InformationCircleIcon,
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-500',
    title: 'Info',
    description: 'On track',
  },
};

const ProbabilityMeter = ({ probability }: { probability: number }) => {
  const getColor = () => {
    if (probability >= 70) return 'text-green-500';
    if (probability >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getBgColor = () => {
    if (probability >= 70) return 'bg-green-500';
    if (probability >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all', getBgColor())}
          style={{ width: `${probability}%` }}
        />
      </div>
      <span className={clsx('text-sm font-medium', getColor())}>{Math.round(probability)}%</span>
    </div>
  );
};

const AlertCard = ({
  alert,
  onAcknowledge,
  onSnooze,
}: {
  alert: DeadlineAlert;
  onAcknowledge: (id: string) => void;
  onSnooze: (id: string, hours: number) => void;
}) => {
  const config = alertConfig[alert.alertLevel];
  const Icon = config.icon;

  // Safely convert numeric fields (API may return Decimal/null)
  const daysUntil = Number(alert.daysUntilDeadline) || 0;
  const hoursUntil = Number(alert.hoursUntilDeadline) || 0;
  const progress = Number(alert.currentProgress) || 0;
  const probability = Number(alert.completionProbability) || 0;
  const dailyProgress = Number(alert.requiredDailyProgress) || 0;

  const formatDeadline = () => {
    if (daysUntil < 0) {
      return `${Math.abs(daysUntil)} days overdue`;
    }
    if (daysUntil === 0) {
      return hoursUntil <= 0
        ? 'Past due'
        : `${hoursUntil} hours left`;
    }
    if (daysUntil === 1) {
      return 'Tomorrow';
    }
    return `${daysUntil} days left`;
  };

  return (
    <div
      className={clsx(
        'rounded-xl border p-4 transition-all hover:shadow-md',
        config.bg,
        config.border
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={clsx('p-2 rounded-lg', config.bg)}>
            <Icon className={clsx('h-5 w-5', config.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', config.iconColor, config.bg)}>
                {alert.entityType.charAt(0).toUpperCase() + alert.entityType.slice(1)}
              </span>
              <span className={clsx('text-xs font-semibold', config.iconColor)}>
                {config.title}
              </span>
            </div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mt-1 truncate">
              {alert.entityTitle}
            </h4>
            <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <CalendarDaysIcon className="h-3.5 w-3.5 mr-1" />
                {new Date(alert.deadline).toLocaleDateString()}
              </div>
              <div className="flex items-center">
                <ClockIcon className="h-3.5 w-3.5 mr-1" />
                {formatDeadline()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress & Probability */}
      <div className="mt-4 space-y-3">
        <div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Current Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Completion Probability</span>
          </div>
          <ProbabilityMeter probability={probability} />
        </div>

        {dailyProgress > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Need <span className="font-semibold text-gray-900 dark:text-white">
              {dailyProgress.toFixed(1)}%
            </span> progress per day to complete on time
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => onAcknowledge(alert.id)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <CheckIcon className="h-3.5 w-3.5 mr-1" />
            Acknowledge
          </button>
          <div className="relative group">
            <button className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              <BellSlashIcon className="h-3.5 w-3.5 mr-1" />
              Snooze
            </button>
            <div className="absolute left-0 bottom-full mb-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 hidden group-hover:block z-50 py-1">
              {[1, 4, 24].map((hours) => (
                <button
                  key={hours}
                  onClick={() => onSnooze(alert.id, hours)}
                  className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {hours === 1 ? '1 hour' : hours === 4 ? '4 hours' : '1 day'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <a
          href={`/${alert.entityType}s/${alert.entityId}`}
          className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
        >
          View →
        </a>
      </div>
    </div>
  );
};

export function DeadlineAlertSystem() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'overdue' | 'urgent' | 'warning'>('all');

  const { data: alerts, isLoading, refetch } = useQuery({
    queryKey: ['deadlineAlerts'],
    queryFn: api.getAlerts,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const checkDeadlinesMutation = useMutation({
    mutationFn: api.checkDeadlines,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deadlineAlerts'] });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => api.acknowledgeAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deadlineAlerts'] });
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: ({ id, hours }: { id: string; hours: number }) => api.snoozeAlert(id, hours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deadlineAlerts'] });
    },
  });

  const handleAcknowledge = (id: string) => {
    acknowledgeMutation.mutate(id);
  };

  const handleSnooze = (id: string, hours: number) => {
    snoozeMutation.mutate({ id, hours });
  };

  const filteredAlerts = alerts?.filter(
    (alert) => filter === 'all' || alert.alertLevel === filter
  ) || [];

  const alertCounts = {
    overdue: alerts?.filter((a) => a.alertLevel === 'overdue').length || 0,
    urgent: alerts?.filter((a) => a.alertLevel === 'urgent').length || 0,
    warning: alerts?.filter((a) => a.alertLevel === 'warning').length || 0,
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
            <BellAlertIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Deadline Alerts
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track approaching deadlines with completion forecasts
            </p>
          </div>
        </div>

        <button
          onClick={() => checkDeadlinesMutation.mutate()}
          disabled={checkDeadlinesMutation.isPending}
          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {checkDeadlinesMutation.isPending ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Checking...
            </>
          ) : (
            <>
              <ClockIcon className="h-4 w-4 mr-2" />
              Check Deadlines
            </>
          )}
        </button>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'overdue', label: 'Overdue', color: 'red' },
          { key: 'urgent', label: 'Urgent', color: 'orange' },
          { key: 'warning', label: 'Warning', color: 'yellow' },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setFilter(filter === key ? 'all' : key as any)}
            className={clsx(
              'rounded-xl p-4 border transition-all',
              filter === key
                ? `bg-${color}-100 dark:bg-${color}-900/30 border-${color}-300 dark:border-${color}-700`
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300'
            )}
          >
            <div className={`text-2xl font-bold text-${color}-600 dark:text-${color}-400`}>
              {alertCounts[key as keyof typeof alertCounts]}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
          </button>
        ))}
      </div>

      {/* Alerts List */}
      {filteredAlerts.length > 0 ? (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={handleAcknowledge}
              onSnooze={handleSnooze}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <CheckIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">All caught up!</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No deadline alerts at the moment
          </p>
        </div>
      )}
    </div>
  );
}

export default DeadlineAlertSystem;
