import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, formatDistanceToNow, isThisMonth } from 'date-fns';
import {
  ClockIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { usePageTitle } from '@/hooks/usePageTitle';
import { reportsApi } from '@/lib/api';
import type { GeneratedReport } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface ReportSchedule {
  id: string;
  reportDefinitionId?: string;
  reportType?: string;
  cronExpression: string;
  nextRunAt: string | null;
  lastRunAt: string | null;
  startDate?: string;
  endDate?: string | null;
  isActive: boolean;
  createdAt?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const CRON_PRESETS: Record<string, { cron: string; label: string }> = {
  daily: { cron: '0 9 * * *', label: 'Daily at 9:00 AM' },
  weekly: { cron: '0 9 * * 1', label: 'Weekly on Monday at 9:00 AM' },
  monthly: { cron: '0 9 1 * *', label: 'Monthly on the 1st at 9:00 AM' },
  quarterly: { cron: '0 9 1 1,4,7,10 *', label: 'Quarterly on the 1st at 9:00 AM' },
};

const REPORT_TYPES = [
  { value: 'PERFORMANCE_SUMMARY', label: 'Performance Summary' },
  { value: '360_FEEDBACK', label: '360-Degree Feedback' },
  { value: 'TEAM_ANALYTICS', label: 'Team Analytics' },
  { value: 'GOAL_ACHIEVEMENT', label: 'Goal Achievement' },
  { value: 'DEVELOPMENT_PROGRESS', label: 'Development Progress' },
  { value: 'PIP_STATUS', label: 'PIP Status' },
  { value: 'COMPENSATION_ANALYSIS', label: 'Compensation Analysis' },
];

function cronToHuman(expr: string): string {
  const map: Record<string, string> = {
    '0 9 * * *': 'Daily at 9:00 AM',
    '0 9 * * 1': 'Weekly on Monday at 9:00 AM',
    '0 9 * * 5': 'Weekly on Friday at 9:00 AM',
    '0 9 1 * *': 'Monthly on the 1st at 9:00 AM',
    '0 9 15 * *': 'Monthly on the 15th at 9:00 AM',
    '0 9 1 1,4,7,10 *': 'Quarterly on the 1st at 9:00 AM',
  };
  return map[expr] || expr;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return 'Never';
  try {
    return format(parseISO(d), 'MMM d, yyyy h:mm a');
  } catch {
    return d;
  }
}

function formatRelative(d: string | null | undefined): string {
  if (!d) return '-';
  try {
    return formatDistanceToNow(parseISO(d), { addSuffix: true });
  } catch {
    return d;
  }
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5 h-24">
            <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-20 mb-3" />
            <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-14" />
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6 h-72">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-secondary-100 dark:bg-secondary-700/50 rounded mb-2" />
        ))}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function ScheduledReportsPage() {
  usePageTitle('Report Schedules');
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [presetKey, setPresetKey] = useState<string>('weekly');
  const [customCron, setCustomCron] = useState('');
  const [reportType, setReportType] = useState(REPORT_TYPES[0].value);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: schedules = [], isLoading: loadingSchedules } = useQuery<ReportSchedule[]>({
    queryKey: ['report-schedules'],
    queryFn: () => reportsApi.listSchedules(),
    staleTime: 30_000,
  });

  const { data: recentReportsData, isLoading: loadingReports } = useQuery({
    queryKey: ['report-schedules', 'history'],
    queryFn: () => reportsApi.list({ limit: 15 }),
    staleTime: 30_000,
  });

  const recentReports: GeneratedReport[] = recentReportsData?.data ?? [];
  const isLoading = loadingSchedules || loadingReports;

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: { reportDefinitionId: string; cronExpression: string; startDate: string; endDate?: string }) =>
      reportsApi.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      toast.success('Schedule created');
      setShowCreateModal(false);
    },
    onError: () => toast.error('Failed to create schedule'),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => reportsApi.pauseSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      toast.success('Schedule paused');
    },
    onError: () => toast.error('Failed to pause schedule'),
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => reportsApi.resumeSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      toast.success('Schedule resumed');
    },
    onError: () => toast.error('Failed to resume schedule'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportsApi.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      toast.success('Schedule deleted');
    },
    onError: () => toast.error('Failed to delete schedule'),
  });

  // ── Computed ───────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const active = schedules.filter((s) => s.isActive).length;
    const paused = schedules.filter((s) => !s.isActive).length;
    const runsThisMonth = recentReports.filter((r) => {
      try { return isThisMonth(parseISO(r.createdAt)); } catch { return false; }
    }).length;
    const activeSchedules = schedules.filter((s) => s.isActive && s.nextRunAt);
    const nextExecution = activeSchedules.length > 0
      ? activeSchedules
          .map((s) => s.nextRunAt!)
          .sort()[0]
      : null;
    return { active, paused, runsThisMonth, nextExecution };
  }, [schedules, recentReports]);

  const selectedCron = presetKey === 'custom' ? customCron : (CRON_PRESETS[presetKey]?.cron ?? '');

  function handleCreate() {
    if (!selectedCron) return toast.error('Select a schedule frequency');
    createMutation.mutate({
      reportDefinitionId: reportType,
      cronExpression: selectedCron,
      startDate,
      endDate: endDate || undefined,
    });
  }

  function handleDelete(id: string) {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      deleteMutation.mutate(id);
    }
  }

  const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
    COMPLETED: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
    PROCESSING: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
    PENDING: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
    FAILED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Report Schedules</h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">Loading schedules...</p>
        </div>
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Report Schedules</h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
            Manage automated report generation schedules
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Create Schedule
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Active</p>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <PauseIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Paused</p>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">{stats.paused}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <ArrowPathIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Runs This Month</p>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">{stats.runsThisMonth}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30">
              <CalendarDaysIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Next Execution</p>
              <p className="text-sm font-bold text-secondary-900 dark:text-white truncate max-w-[140px]">
                {stats.nextExecution ? formatRelative(stats.nextExecution) : 'None'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Schedules Table */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700">
        <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Schedules</h3>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{schedules.length} total</p>
          </div>
          {schedules.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => schedules.filter((s) => s.isActive).forEach((s) => pauseMutation.mutate(s.id))}
                className="text-xs px-3 py-1 rounded-md border border-secondary-300 dark:border-secondary-600 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
              >
                Pause All
              </button>
              <button
                onClick={() => schedules.filter((s) => !s.isActive).forEach((s) => resumeMutation.mutate(s.id))}
                className="text-xs px-3 py-1 rounded-md border border-secondary-300 dark:border-secondary-600 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
              >
                Resume All
              </button>
            </div>
          )}
        </div>

        {schedules.length === 0 ? (
          <div className="p-12 text-center">
            <ClockIcon className="h-10 w-10 text-secondary-300 dark:text-secondary-600 mx-auto mb-3" />
            <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-3">No report schedules yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              Create your first schedule
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
              <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase">Report Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase">Frequency</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase">Next Run</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase">Last Run</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700">
                {schedules.map((sched) => (
                  <tr key={sched.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/30 transition-colors">
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-secondary-900 dark:text-white">
                        {REPORT_TYPES.find((t) => t.value === (sched.reportType || sched.reportDefinitionId))?.label
                          || sched.reportType || sched.reportDefinitionId || 'Unknown'}
                      </p>
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-sm text-secondary-700 dark:text-secondary-300">{cronToHuman(sched.cronExpression)}</p>
                      <p className="text-[10px] text-secondary-400 font-mono">{sched.cronExpression}</p>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <p className="text-xs text-secondary-600 dark:text-secondary-400">{formatDate(sched.nextRunAt)}</p>
                      {sched.nextRunAt && (
                        <p className="text-[10px] text-secondary-400">{formatRelative(sched.nextRunAt)}</p>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <p className="text-xs text-secondary-600 dark:text-secondary-400">{formatDate(sched.lastRunAt)}</p>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={clsx(
                        'inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full',
                        sched.isActive
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-500 dark:text-secondary-400'
                      )}>
                        {sched.isActive ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {sched.isActive ? (
                          <button
                            onClick={() => pauseMutation.mutate(sched.id)}
                            className="p-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 transition-colors"
                            title="Pause"
                          >
                            <PauseIcon className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => resumeMutation.mutate(sched.id)}
                            className="p-1.5 rounded-md hover:bg-green-50 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors"
                            title="Resume"
                          >
                            <PlayIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(sched.id)}
                          className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Execution History */}
      {recentReports.length > 0 && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700">
          <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
            <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Recent Executions</h3>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">Last {recentReports.length} generated reports</p>
          </div>
          <div className="divide-y divide-secondary-100 dark:divide-secondary-700">
            {recentReports.slice(0, 10).map((report) => {
              const badge = STATUS_BADGE[report.generationStatus] || STATUS_BADGE.PENDING;
              return (
                <div key={report.id} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                      <ClockIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{report.title || report.reportType}</p>
                      <p className="text-[10px] text-secondary-400">{formatDate(report.createdAt)}</p>
                    </div>
                  </div>
                  <span className={clsx('inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0', badge.bg, badge.text)}>
                    {report.generationStatus}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl border border-secondary-200 dark:border-secondary-700 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Create Report Schedule</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
                <XMarkIcon className="h-5 w-5 text-secondary-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-5">
              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full border border-secondary-300 dark:border-secondary-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  {REPORT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">Frequency</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CRON_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => setPresetKey(key)}
                      className={clsx(
                        'px-3 py-2 text-xs font-medium rounded-lg border transition-colors text-left',
                        presetKey === key
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                          : 'border-secondary-200 dark:border-secondary-600 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-700'
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setPresetKey('custom')}
                    className={clsx(
                      'px-3 py-2 text-xs font-medium rounded-lg border transition-colors text-left col-span-2',
                      presetKey === 'custom'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                        : 'border-secondary-200 dark:border-secondary-600 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-700'
                    )}
                  >
                    Custom cron expression
                  </button>
                </div>
                {presetKey === 'custom' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={customCron}
                      onChange={(e) => setCustomCron(e.target.value)}
                      placeholder="e.g., 0 9 * * 1-5"
                      className="w-full border border-secondary-300 dark:border-secondary-600 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-[10px] text-secondary-400 mt-1">Format: minute hour day-of-month month day-of-week</p>
                  </div>
                )}
                {selectedCron && (
                  <p className="text-xs text-primary-600 dark:text-primary-400 mt-2">
                    Schedule: {cronToHuman(selectedCron)}
                  </p>
                )}
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-secondary-300 dark:border-secondary-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">End Date (optional)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-secondary-300 dark:border-secondary-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-secondary-200 dark:border-secondary-700 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
