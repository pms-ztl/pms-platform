import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldExclamationIcon,
  GlobeAltIcon,
  ComputerDesktopIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import { superAdminSecurityApi } from '@/lib/api';
import { StatCard, Badge } from '@/components/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SecurityTab = 'threats' | 'blocked' | 'sessions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function truncateUA(ua: string, max = 60): string {
  if (!ua) return '--';
  return ua.length > max ? ua.slice(0, max) + '...' : ua;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SASecurityPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SecurityTab>('threats');

  // Queries
  const { data: threats, isLoading: threatsLoading } = useQuery({
    queryKey: ['sa-security-threats'],
    queryFn: () => superAdminSecurityApi.getThreats(),
  });

  const { data: blockedIps, isLoading: blockedLoading } = useQuery({
    queryKey: ['sa-security-blocked'],
    queryFn: () => superAdminSecurityApi.getBlockedIps(),
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sa-security-sessions'],
    queryFn: () => superAdminSecurityApi.getActiveSessions(),
  });

  // Mutations
  const blockIpMutation = useMutation({
    mutationFn: ({ ip, reason }: { ip: string; reason: string }) =>
      superAdminSecurityApi.blockIp(ip, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sa-security-threats'] });
      queryClient.invalidateQueries({ queryKey: ['sa-security-blocked'] });
      toast.success('IP address blocked');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to block IP');
    },
  });

  const unblockIpMutation = useMutation({
    mutationFn: (ip: string) => superAdminSecurityApi.unblockIp(ip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sa-security-blocked'] });
      toast.success('IP address unblocked');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to unblock IP');
    },
  });

  const terminateSessionMutation = useMutation({
    mutationFn: (sessionId: string) => superAdminSecurityApi.terminateSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sa-security-sessions'] });
      toast.success('Session terminated');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to terminate session');
    },
  });

  // Stats
  const blockedAttempts = threats?.blocked ?? 0;
  const suspiciousIps = threats?.suspicious ?? 0;
  const activeSessionCount = sessions?.length ?? 0;

  const tabs: { key: SecurityTab; label: string; count?: number }[] = [
    { key: 'threats', label: 'Recent Threats', count: threats?.recentAttempts?.length },
    { key: 'blocked', label: 'Blocked IPs', count: blockedIps?.length },
    { key: 'sessions', label: 'Active Sessions', count: activeSessionCount },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Security</h1>
        <p className="mt-1 text-secondary-600 dark:text-secondary-400">
          Monitor threats, manage blocked IPs, and view active sessions
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Blocked Attempts"
          value={threatsLoading ? '--' : blockedAttempts.toLocaleString()}
          icon={<ShieldExclamationIcon className="h-6 w-6" />}
        />
        <StatCard
          label="Suspicious IPs"
          value={threatsLoading ? '--' : suspiciousIps.toLocaleString()}
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
        />
        <StatCard
          label="Active Sessions"
          value={sessionsLoading ? '--' : activeSessionCount.toLocaleString()}
          icon={<ComputerDesktopIcon className="h-6 w-6" />}
        />
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        <div className="border-b border-secondary-200 dark:border-secondary-700">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  'px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab.key
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                    : 'border-transparent text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 hover:border-secondary-300 dark:hover:text-secondary-300'
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={clsx(
                      'ml-2 px-1.5 py-0.5 rounded-full text-xs font-medium',
                      activeTab === tab.key
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-0">
          {/* Threats Tab */}
          {activeTab === 'threats' && (
            <div>
              {threatsLoading ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
                </div>
              ) : !threats?.recentAttempts?.length ? (
                <div className="text-center py-16">
                  <CheckCircleIcon className="mx-auto h-12 w-12 text-green-300 dark:text-green-600" />
                  <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">No recent threats</h3>
                  <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                    No suspicious activity detected.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
                    <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                          IP Address
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                          Attempt Count
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                          Last Attempt
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                      {threats.recentAttempts.map((attempt, idx) => (
                        <tr key={idx} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="text-sm font-mono text-secondary-900 dark:text-white flex items-center gap-1.5">
                              <GlobeAltIcon className="h-4 w-4 text-secondary-400" />
                              {attempt.ip}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <Badge variant={attempt.count >= 10 ? 'danger' : attempt.count >= 5 ? 'warning' : 'default'}>
                              {attempt.count} attempts
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="text-sm text-secondary-500 dark:text-secondary-400 flex items-center gap-1">
                              <ClockIcon className="h-3.5 w-3.5" />
                              {formatDate(attempt.lastAttempt)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => {
                                if (confirm(`Block IP ${attempt.ip}?`)) {
                                  blockIpMutation.mutate({
                                    ip: attempt.ip,
                                    reason: 'Blocked due to suspicious login attempts',
                                  });
                                }
                              }}
                              disabled={blockIpMutation.isPending}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                            >
                              <NoSymbolIcon className="h-3.5 w-3.5" />
                              Block
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Blocked IPs Tab */}
          {activeTab === 'blocked' && (
            <div>
              {blockedLoading ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
                </div>
              ) : !blockedIps?.length ? (
                <div className="text-center py-16">
                  <GlobeAltIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
                  <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">No blocked IPs</h3>
                  <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                    No IP addresses are currently blocked.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
                    <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                          IP Address
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                          Reason
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                          Blocked Date
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                      {blockedIps.map((blocked, idx) => (
                        <tr key={idx} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="text-sm font-mono text-secondary-900 dark:text-white flex items-center gap-1.5">
                              <NoSymbolIcon className="h-4 w-4 text-red-400" />
                              {blocked.ip}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-secondary-700 dark:text-secondary-300">
                              {blocked.reason}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="text-sm text-secondary-500 dark:text-secondary-400">
                              {formatDate(blocked.blockedAt)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => {
                                if (confirm(`Unblock IP ${blocked.ip}?`)) {
                                  unblockIpMutation.mutate(blocked.ip);
                                }
                              }}
                              disabled={unblockIpMutation.isPending}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors"
                            >
                              <CheckCircleIcon className="h-3.5 w-3.5" />
                              Unblock
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Active Sessions Tab */}
          {activeTab === 'sessions' && (
            <div>
              {sessionsLoading ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
                </div>
              ) : !sessions?.length ? (
                <div className="text-center py-16">
                  <ComputerDesktopIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
                  <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">No active sessions</h3>
                  <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                    No sessions are currently active.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
                    <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                          IP Address
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                          User Agent
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                          Created At
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                      {sessions.map((session) => (
                        <tr key={session.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="text-sm font-mono text-secondary-700 dark:text-secondary-300">
                              {session.userId.slice(0, 8)}...
                            </span>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="text-sm text-secondary-700 dark:text-secondary-300 flex items-center gap-1.5">
                              <GlobeAltIcon className="h-3.5 w-3.5 text-secondary-400" />
                              {session.ip}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-secondary-500 dark:text-secondary-400" title={session.userAgent}>
                              {truncateUA(session.userAgent)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="text-sm text-secondary-500 dark:text-secondary-400">
                              {formatDate(session.createdAt)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => {
                                if (confirm('Terminate this session? The user will be logged out.')) {
                                  terminateSessionMutation.mutate(session.id);
                                }
                              }}
                              disabled={terminateSessionMutation.isPending}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                            >
                              <XCircleIcon className="h-3.5 w-3.5" />
                              Terminate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
