import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  GlobeAltIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import {
  superAdminAuditApi,
  type SAAuditLog,
  type SAPaginatedResponse,
} from '@/lib/api';
import { Badge } from '@/components/ui';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const ACTION_COLORS: Record<string, { variant: 'success' | 'danger' | 'info' | 'primary' | 'warning' | 'default'; label: string }> = {
  CREATE: { variant: 'success', label: 'CREATE' },
  DELETE: { variant: 'danger', label: 'DELETE' },
  UPDATE: { variant: 'info', label: 'UPDATE' },
  LOGIN: { variant: 'primary', label: 'LOGIN' },
  LOGOUT: { variant: 'default', label: 'LOGOUT' },
  EXPORT: { variant: 'warning', label: 'EXPORT' },
  APPROVE: { variant: 'success', label: 'APPROVE' },
  REJECT: { variant: 'danger', label: 'REJECT' },
  SUBMIT: { variant: 'warning', label: 'SUBMIT' },
  SUSPEND: { variant: 'danger', label: 'SUSPEND' },
  ACTIVATE: { variant: 'success', label: 'ACTIVATE' },
};

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'EXPORT', label: 'Export' },
  { value: 'APPROVE', label: 'Approve' },
  { value: 'REJECT', label: 'Reject' },
  { value: 'SUBMIT', label: 'Submit' },
  { value: 'SUSPEND', label: 'Suspend' },
  { value: 'ACTIVATE', label: 'Activate' },
];

const RESOURCE_OPTIONS = [
  { value: '', label: 'All Resources' },
  { value: 'USER', label: 'User' },
  { value: 'TENANT', label: 'Tenant' },
  { value: 'SYSTEM', label: 'System' },
  { value: 'BILLING', label: 'Billing' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'GOAL', label: 'Goal' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'FEEDBACK', label: 'Feedback' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso));
}

function truncateString(str: string, _max = 40): string {
  if (!str) return '--';
  return str;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SAAuditPage() {
  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Applied filters (apply on button click for performance)
  const [appliedFilters, setAppliedFilters] = useState({
    action: '',
    resource: '',
    userId: '',
    startDate: '',
    endDate: '',
  });

  // Query
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['sa-audit', page, appliedFilters],
    queryFn: () =>
      superAdminAuditApi.list({
        page,
        limit: PAGE_SIZE,
        action: appliedFilters.action || undefined,
        resource: appliedFilters.resource || undefined,
        userId: appliedFilters.userId || undefined,
        startDate: appliedFilters.startDate || undefined,
        endDate: appliedFilters.endDate || undefined,
      }),
  });

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  // Handlers
  const handleApplyFilters = () => {
    setAppliedFilters({
      action: actionFilter,
      resource: resourceFilter,
      userId: userIdFilter,
      startDate,
      endDate,
    });
    setPage(1);
  };

  const handleResetFilters = () => {
    setActionFilter('');
    setResourceFilter('');
    setUserIdFilter('');
    setStartDate('');
    setEndDate('');
    setAppliedFilters({ action: '', resource: '', userId: '', startDate: '', endDate: '' });
    setPage(1);
  };

  // Page numbers
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Audit Logs</h1>
        <p className="mt-1 text-secondary-600 dark:text-secondary-400">
          Platform-wide audit trail for all administrative actions
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FunnelIcon className="h-4 w-4 text-secondary-400" />
          <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Action filter */}
          <div>
            <label className="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Resource filter */}
          <div>
            <label className="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1">
              Resource
            </label>
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {RESOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* User ID filter */}
          <div>
            <label className="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1">
              User ID
            </label>
            <input
              type="text"
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              placeholder="Filter by user ID..."
              className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Start date */}
          <div>
            <label className="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* End date */}
          <div>
            <label className="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleApplyFilters}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <FunnelIcon className="h-4 w-4" />
            Apply Filters
          </button>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        {/* Table Header */}
        <div className="px-5 py-4 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-secondary-900 dark:text-white">
              Audit Events
            </h2>
            {isFetching && (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-600" />
            )}
            <span className="text-xs text-secondary-400 dark:text-secondary-500">
              {total.toLocaleString()} total
            </span>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
            <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">
              No audit logs found
            </h3>
            <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
              Try adjusting your filters or date range.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
              <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider">
                    Resource
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider">
                    Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700 bg-white dark:bg-secondary-800">
                {logs.map((log) => {
                  const actionConfig = ACTION_COLORS[log.action?.toUpperCase()] ?? { variant: 'default' as const, label: log.action };

                  return (
                    <tr key={log.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors">
                      {/* Timestamp */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <ClockIcon className="h-3.5 w-3.5 text-secondary-400 flex-shrink-0" />
                          <span className="text-sm text-secondary-700 dark:text-secondary-300">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                      </td>

                      {/* User */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-secondary-700 dark:text-secondary-300">
                          {log.userEmail}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={actionConfig.variant}>
                          {actionConfig.label}
                        </Badge>
                      </td>

                      {/* Resource */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-secondary-700 dark:text-secondary-300">
                          {log.resource?.replace(/_/g, ' ') ?? '--'}
                        </span>
                        {log.resourceId && (
                          <p className="text-xs text-secondary-400 dark:text-secondary-500 font-mono">
                            {log.resourceId}
                          </p>
                        )}
                      </td>

                      {/* Details */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-secondary-500 dark:text-secondary-400">
                          {log.details ? truncateString(JSON.stringify(log.details)) : '--'}
                        </span>
                      </td>

                      {/* IP Address */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-secondary-500 dark:text-secondary-400 flex items-center gap-1">
                          <GlobeAltIcon className="h-3.5 w-3.5 text-secondary-400 flex-shrink-0" />
                          {log.ipAddress ?? '--'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-secondary-200 dark:border-secondary-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              Showing {(page - 1) * PAGE_SIZE + 1} to{' '}
              {Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()} logs
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              {pageNumbers.map((pn) => (
                <button
                  key={pn}
                  onClick={() => setPage(pn)}
                  className={clsx(
                    'min-w-[2rem] h-8 rounded-lg text-sm font-medium transition-colors',
                    pn === page
                      ? 'bg-primary-600 text-white'
                      : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                  )}
                >
                  {pn}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
