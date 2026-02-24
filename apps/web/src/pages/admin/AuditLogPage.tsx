import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  XMarkIcon,
  GlobeAltIcon,
  CalendarDaysIcon,
  BoltIcon,
  UserGroupIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { api } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHeader } from '@/components/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditEvent {
  id: string;
  timestamp: string;
  createdAt?: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  ipAddress?: string;
  userAgent?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface AuditStats {
  totalEvents: number;
  totalEventsTrend: number;
  eventsToday: number;
  activeUsersToday: number;
  mostCommonAction: string;
}

type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'APPROVE'
  | 'REJECT'
  | 'SUBMIT';

type AuditEntityType =
  | 'USER'
  | 'GOAL'
  | 'REVIEW'
  | 'FEEDBACK'
  | 'COMPENSATION'
  | 'PROMOTION'
  | 'PIP'
  | 'DEVELOPMENT_PLAN'
  | 'CALIBRATION'
  | 'SUCCESSION'
  | 'SETTING';

interface AuditFilters {
  dateFrom: string;
  dateTo: string;
  entityType: string;
  action: string;
  userSearch: string;
  page: number;
  limit: number;
}

type ViewTab = 'table' | 'timeline';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENTITY_TYPES: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'All Entities' },
  { value: 'USER', label: 'User' },
  { value: 'GOAL', label: 'Goal' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'FEEDBACK', label: 'Feedback' },
  { value: 'COMPENSATION', label: 'Compensation' },
  { value: 'PROMOTION', label: 'Promotion' },
  { value: 'PIP', label: 'PIP' },
  { value: 'DEVELOPMENT_PLAN', label: 'Development Plan' },
  { value: 'CALIBRATION', label: 'Calibration' },
  { value: 'SUCCESSION', label: 'Succession' },
  { value: 'SETTING', label: 'Setting' },
];

const ACTION_TYPES: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'All Actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'EXPORT', label: 'Export' },
  { value: 'APPROVE', label: 'Approve' },
  { value: 'REJECT', label: 'Reject' },
  { value: 'SUBMIT', label: 'Submit' },
];

const ACTION_BADGE_STYLES: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  LOGIN: 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-300',
  LOGOUT: 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-300',
  EXPORT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  APPROVE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  REJECT: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  SUBMIT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

const ACTION_TIMELINE_ICONS: Record<string, React.ElementType> = {
  CREATE: DocumentTextIcon,
  UPDATE: ArrowPathIcon,
  DELETE: XMarkIcon,
  LOGIN: ShieldCheckIcon,
  LOGOUT: ShieldCheckIcon,
  EXPORT: ArrowDownTrayIcon,
  APPROVE: ShieldCheckIcon,
  REJECT: XMarkIcon,
  SUBMIT: DocumentTextIcon,
};

const DEFAULT_FILTERS: AuditFilters = {
  dateFrom: '',
  dateTo: '',
  entityType: 'ALL',
  action: 'ALL',
  userSearch: '',
  page: 1,
  limit: 20,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function formatDateGroup(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function truncateId(id: string, _max = 8): string {
  if (!id) return '--';
  return id;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
}

function buildQueryParams(filters: AuditFilters): Record<string, unknown> {
  const params: Record<string, unknown> = {
    page: filters.page,
    limit: filters.limit,
  };
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.entityType && filters.entityType !== 'ALL') params.entityType = filters.entityType;
  if (filters.action && filters.action !== 'ALL') params.action = filters.action;
  if (filters.userSearch) params.userSearch = filters.userSearch;
  return params;
}

// ---------------------------------------------------------------------------
// JSON Diff Viewer
// ---------------------------------------------------------------------------

function JsonDiffViewer({
  previousState,
  newState,
}: {
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
}) {
  if (!previousState && !newState) {
    return (
      <p className="text-sm text-secondary-400 dark:text-secondary-500 italic">
        No state change data available.
      </p>
    );
  }

  const allKeys = Array.from(
    new Set([
      ...Object.keys(previousState ?? {}),
      ...Object.keys(newState ?? {}),
    ]),
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Previous State */}
      <div>
        <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-2">
          Previous State
        </h4>
        <div className="bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-200/50 dark:border-red-800/30 p-3 font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
          {previousState ? (
            allKeys.map((key) => {
              const prev = previousState[key];
              const next = newState?.[key];
              const changed = JSON.stringify(prev) !== JSON.stringify(next);
              return (
                <div
                  key={key}
                  className={clsx(
                    'py-0.5',
                    changed
                      ? 'text-red-700 dark:text-red-300 bg-red-100/60 dark:bg-red-900/20 -mx-1 px-1 rounded'
                      : 'text-secondary-600 dark:text-secondary-400',
                  )}
                >
                  <span className="text-secondary-400 dark:text-secondary-500">{key}:</span>{' '}
                  {JSON.stringify(prev, null, 2)}
                </div>
              );
            })
          ) : (
            <span className="text-secondary-400 dark:text-secondary-500 italic">N/A (new record)</span>
          )}
        </div>
      </div>

      {/* New State */}
      <div>
        <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-2">
          New State
        </h4>
        <div className="bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-200/50 dark:border-green-800/30 p-3 font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
          {newState ? (
            allKeys.map((key) => {
              const prev = previousState?.[key];
              const next = newState[key];
              const changed = JSON.stringify(prev) !== JSON.stringify(next);
              return (
                <div
                  key={key}
                  className={clsx(
                    'py-0.5',
                    changed
                      ? 'text-green-700 dark:text-green-300 bg-green-100/60 dark:bg-green-900/20 -mx-1 px-1 rounded'
                      : 'text-secondary-600 dark:text-secondary-400',
                  )}
                >
                  <span className="text-secondary-400 dark:text-secondary-500">{key}:</span>{' '}
                  {JSON.stringify(next, null, 2)}
                </div>
              );
            })
          ) : (
            <span className="text-secondary-400 dark:text-secondary-500 italic">N/A (deleted)</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats Card
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  color: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const colorMap = {
    primary: {
      bg: 'bg-primary-100 dark:bg-primary-900/30',
      icon: 'text-primary-600 dark:text-primary-400',
    },
    success: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      icon: 'text-green-600 dark:text-green-400',
    },
    warning: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      icon: 'text-amber-600 dark:text-amber-400',
    },
    danger: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      icon: 'text-red-600 dark:text-red-400',
    },
  };

  const { bg, icon: iconColor } = colorMap[color];

  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-5">
      <div className="flex items-center gap-4">
        <div className={clsx('p-3 rounded-xl', bg)}>
          <Icon className={clsx('h-6 w-6', iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-secondary-500 dark:text-secondary-400">{title}</p>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">{value}</p>
        </div>
        {trend !== undefined && (
          <div
            className={clsx(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
              trend >= 0
                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
            )}
          >
            {trend >= 0 ? (
              <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
            ) : (
              <ArrowTrendingDownIcon className="h-3.5 w-3.5" />
            )}
            {Math.abs(trend)}%
            {trendLabel && (
              <span className="text-secondary-400 dark:text-secondary-500 ml-0.5">{trendLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Timeline
// ---------------------------------------------------------------------------

function ActivityTimeline({ events }: { events: AuditEvent[] }) {
  const grouped = useMemo(() => {
    const groups: Map<string, AuditEvent[]> = new Map();
    for (const event of events) {
      const dateKey = new Date(event.timestamp).toDateString();
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(event);
    }
    return groups;
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <ClockIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
        <p className="mt-2 text-sm text-secondary-500 dark:text-secondary-400">
          No recent activity to display.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateKey, dateEvents]) => (
        <div key={dateKey}>
          <h3 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-3 sticky top-0 bg-white dark:bg-secondary-800 py-1 z-10">
            {formatDateGroup(dateEvents[0].timestamp)}
          </h3>
          <div className="relative pl-6 border-l-2 border-secondary-200 dark:border-secondary-700 space-y-4">
            {dateEvents.map((event) => {
              const TimeIcon = ACTION_TIMELINE_ICONS[event.action] ?? BoltIcon;
              const badgeStyle = ACTION_BADGE_STYLES[event.action] ?? ACTION_BADGE_STYLES.LOGIN;

              return (
                <div key={event.id} className="relative">
                  {/* Timeline dot */}
                  <div
                    className={clsx(
                      'absolute -left-[calc(0.75rem+1.5px)] top-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-secondary-800',
                      badgeStyle,
                    )}
                  >
                    <TimeIcon className="h-3 w-3" />
                  </div>

                  <div className="ml-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-secondary-900 dark:text-white">
                        {event.user.firstName} {event.user.lastName}
                      </span>
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          badgeStyle,
                        )}
                      >
                        {event.action}
                      </span>
                      <span className="text-sm text-secondary-600 dark:text-secondary-400">
                        {event.entityType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-secondary-400 dark:text-secondary-500">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                    {event.entityId && (
                      <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-0.5 font-mono">
                        ID: {truncateId(event.entityId, 16)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AuditLogPage() {
  usePageTitle('Audit Log');
  const [filters, setFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('table');
  const [showTimeline, setShowTimeline] = useState(false);

  // ── Data Queries ──────────────────────────────────────────────────────────

  const queryParams = useMemo(() => buildQueryParams(appliedFilters), [appliedFilters]);

  const {
    data: eventsData,
    isLoading: eventsLoading,
    isFetching: eventsFetching,
  } = useQuery({
    queryKey: ['audit-events', queryParams],
    queryFn: () =>
      api.getPaginated<AuditEvent>('/audit', queryParams),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['audit-stats', queryParams],
    queryFn: () =>
      api.get<AuditStats>('/audit/stats', { params: queryParams }),
  });

  // ── Derived data ──────────────────────────────────────────────────────────

  const events = eventsData?.data ?? [];
  const meta = eventsData?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({ ...filters, page: 1 });
  }, [filters]);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  }, []);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setAppliedFilters((prev) => ({ ...prev, page: newPage }));
      setFilters((prev) => ({ ...prev, page: newPage }));
    },
    [],
  );

  const handleExportCsv = useCallback(async () => {
    const headers = ['Timestamp', 'User', 'Email', 'Action', 'Entity Type', 'Entity ID', 'IP Address'];
    const escCsv = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    // Fetch ALL events matching current filters (up to 10000) for full export
    try {
      const exportParams = { ...buildQueryParams(appliedFilters), page: '1', limit: '10000' };
      const allData = await api.getPaginated<AuditEvent>('/audit', exportParams);
      const allEvents = allData?.data ?? events;

      if (allEvents.length === 0) return;

      const rows = allEvents.map((e: AuditEvent) => [
        escCsv(e.timestamp || e.createdAt || ''),
        escCsv(`${e.user?.firstName ?? ''} ${e.user?.lastName ?? ''}`),
        escCsv(e.user?.email ?? ''),
        escCsv(e.action),
        escCsv(e.entityType),
        escCsv(e.entityId),
        escCsv(e.ipAddress ?? ''),
      ].join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback to current page data
      const rows = events.map((e) => [
        escCsv(e.timestamp || e.createdAt || ''),
        escCsv(`${e.user?.firstName ?? ''} ${e.user?.lastName ?? ''}`),
        escCsv(e.user?.email ?? ''),
        escCsv(e.action),
        escCsv(e.entityType),
        escCsv(e.entityId),
        escCsv(e.ipAddress ?? ''),
      ].join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [events, appliedFilters]);

  const toggleRowExpand = useCallback((id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  }, []);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, meta.page - Math.floor(maxVisible / 2));
    const end = Math.min(meta.totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [meta.page, meta.totalPages]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <PageHeader title="Audit Trail" subtitle="Track all system activities and changes">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
              showTimeline
                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-600'
                : 'border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700',
            )}
          >
            <ClockIcon className="h-4 w-4" />
            Timeline
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </PageHeader>

      {/* ── Filters Bar ────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FunnelIcon className="h-4 w-4 text-secondary-400" />
          <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Date From */}
          <div>
            <label className="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Entity Type */}
          <div>
            <label className="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1">
              Entity Type
            </label>
            <select
              value={filters.entityType}
              onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value }))}
              className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {ENTITY_TYPES.map((et) => (
                <option key={et.value} value={et.value}>
                  {et.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1">
              Action
            </label>
            <select
              value={filters.action}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
              className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {ACTION_TYPES.map((at) => (
                <option key={at.value} value={at.value}>
                  {at.label}
                </option>
              ))}
            </select>
          </div>

          {/* User Search */}
          <div>
            <label className="block text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1">
              User
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <input
                type="text"
                value={filters.userSearch}
                onChange={(e) => setFilters((f) => ({ ...f, userSearch: e.target.value }))}
                placeholder="Search by name..."
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 pl-9 pr-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
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

      {/* ── Stats Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Events"
          value={statsLoading ? '--' : (stats?.totalEvents?.toLocaleString() ?? '0')}
          icon={DocumentTextIcon}
          trend={stats?.totalEventsTrend}
          trendLabel="vs last period"
          color="primary"
        />
        <StatCard
          title="Events Today"
          value={statsLoading ? '--' : (stats?.eventsToday?.toLocaleString() ?? '0')}
          icon={CalendarDaysIcon}
          color="success"
        />
        <StatCard
          title="Active Users Today"
          value={statsLoading ? '--' : (stats?.activeUsersToday?.toLocaleString() ?? '0')}
          icon={UserGroupIcon}
          color="warning"
        />
        <StatCard
          title="Most Common Action"
          value={statsLoading ? '--' : (stats?.mostCommonAction ?? 'N/A')}
          icon={FireIcon}
          color="danger"
        />
      </div>

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      <div className={clsx('grid gap-6', showTimeline ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1')}>
        {/* Table */}
        <div className={clsx(showTimeline ? 'xl:col-span-2' : '')}>
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
            {/* Table Header */}
            <div className="px-5 py-4 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-secondary-900 dark:text-white">
                  Audit Events
                </h2>
                {eventsFetching && (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-600" />
                )}
                <span className="text-xs text-secondary-400 dark:text-secondary-500">
                  {meta.total.toLocaleString()} total
                </span>
              </div>
            </div>

            {/* Table Body */}
            {eventsLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-16">
                <ShieldCheckIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
                <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">
                  No audit events found
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
                        Entity Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider">
                        Entity ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider">
                        IP Address
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700 bg-white dark:bg-secondary-800">
                    {events.map((event) => {
                      const isExpanded = expandedRow === event.id;
                      return (
                        <EventTableRow
                          key={event.id}
                          event={event}
                          isExpanded={isExpanded}
                          onToggle={() => toggleRowExpand(event.id)}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="px-5 py-4 border-t border-secondary-200 dark:border-secondary-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-secondary-500 dark:text-secondary-400">
                  Showing {(meta.page - 1) * meta.limit + 1} to{' '}
                  {Math.min(meta.page * meta.limit, meta.total)} of{' '}
                  {meta.total.toLocaleString()} results
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(meta.page - 1)}
                    disabled={meta.page <= 1}
                    className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  {pageNumbers.map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={clsx(
                        'min-w-[2rem] h-8 rounded-lg text-sm font-medium transition-colors',
                        pageNum === meta.page
                          ? 'bg-primary-600 text-white'
                          : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700',
                      )}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(meta.page + 1)}
                    disabled={meta.page >= meta.totalPages}
                    className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Sidebar */}
        {showTimeline && (
          <div className="xl:col-span-1">
            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden sticky top-6">
              <div className="px-5 py-4 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
                <h2 className="text-base font-semibold text-secondary-900 dark:text-white flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-primary-500" />
                  Activity Timeline
                </h2>
                <button
                  onClick={() => setShowTimeline(false)}
                  className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4 text-secondary-400" />
                </button>
              </div>
              <div className="p-5 max-h-[calc(100vh-16rem)] overflow-y-auto">
                {eventsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600" />
                  </div>
                ) : (
                  <ActivityTimeline events={events.slice(0, 50)} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event Table Row (extracted for performance)
// ---------------------------------------------------------------------------

function EventTableRow({
  event,
  isExpanded,
  onToggle,
}: {
  event: AuditEvent;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const badgeStyle = ACTION_BADGE_STYLES[event.action] ?? ACTION_BADGE_STYLES.LOGIN;

  return (
    <>
      <tr className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors">
        {/* Timestamp */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="text-sm text-secondary-700 dark:text-secondary-300">
            {formatTimestamp(event.timestamp)}
          </span>
        </td>

        {/* User */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2.5">
            {event.user.avatarUrl ? (
              <img
                src={event.user.avatarUrl}
                alt={`${event.user.firstName} ${event.user.lastName}`}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                  {getInitials(event.user.firstName, event.user.lastName)}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-secondary-900 dark:text-white break-words">
                {event.user.firstName} {event.user.lastName}
              </p>
              <p className="text-xs text-secondary-400 dark:text-secondary-500 break-words">
                {event.user.email}
              </p>
            </div>
          </div>
        </td>

        {/* Action Badge */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span
            className={clsx(
              'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
              badgeStyle,
            )}
          >
            {event.action}
          </span>
        </td>

        {/* Entity Type */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="text-sm text-secondary-700 dark:text-secondary-300">
            {event.entityType.replace(/_/g, ' ')}
          </span>
        </td>

        {/* Entity ID */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span
            className="text-sm font-mono text-secondary-500 dark:text-secondary-400 cursor-default"
            title={event.entityId}
          >
            {truncateId(event.entityId)}
          </span>
        </td>

        {/* IP Address */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="text-sm text-secondary-500 dark:text-secondary-400 flex items-center gap-1">
            <GlobeAltIcon className="h-3.5 w-3.5 text-secondary-400 flex-shrink-0" />
            {event.ipAddress ?? '--'}
          </span>
        </td>

        {/* Expand Toggle */}
        <td className="px-4 py-3 text-center">
          <button
            onClick={onToggle}
            className={clsx(
              'p-1.5 rounded-lg transition-colors',
              isExpanded
                ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400'
                : 'text-secondary-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 dark:hover:text-primary-400',
            )}
            title={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </button>
        </td>
      </tr>

      {/* Expanded Detail Row */}
      {isExpanded && (
        <tr className="bg-secondary-50/50 dark:bg-secondary-900/30">
          <td colSpan={7} className="px-6 py-4">
            <div className="space-y-3">
              {/* Meta info */}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-secondary-500 dark:text-secondary-400">
                {event.userAgent && (
                  <span>
                    <span className="font-medium text-secondary-600 dark:text-secondary-300">User Agent:</span>{' '}
                    {event.userAgent}
                  </span>
                )}
                <span>
                  <span className="font-medium text-secondary-600 dark:text-secondary-300">Full Entity ID:</span>{' '}
                  <span className="font-mono">{event.entityId}</span>
                </span>
              </div>

              {/* JSON Diff */}
              <JsonDiffViewer
                previousState={event.previousState}
                newState={event.newState}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
