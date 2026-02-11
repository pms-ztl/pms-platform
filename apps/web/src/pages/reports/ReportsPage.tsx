import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DocumentArrowDownIcon,
  ClockIcon,
  TableCellsIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  XMarkIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

import {
  reportsApi,
  type GeneratedReport,
  type GenerateReportInput,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPORT_TYPES = [
  'Performance Summary',
  '360-Degree Feedback',
  'Team Analytics',
  'Compensation Analysis',
  'Development Progress',
  'Goal Achievement',
  'PIP Status',
] as const;

const SCOPE_OPTIONS = ['Individual', 'Team', 'Department', 'Organization'] as const;

const FORMAT_OPTIONS = ['PDF', 'Excel', 'CSV'] as const;

const reportTypeColors: Record<string, string> = {
  'Performance Summary': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  '360-Degree Feedback': 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  'Team Analytics': 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  'Compensation Analysis': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'Development Progress': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  'Goal Achievement': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  'PIP Status': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const statusColors: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  PROCESSING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a user-facing report type label to the API enum value */
function toReportTypeEnum(label: string): string {
  return label.toUpperCase().replace(/[- ]/g, '_');
}

/** Map an API enum value back to a human-friendly label */
function toReportTypeLabel(enumVal: string): string {
  const map: Record<string, string> = {};
  REPORT_TYPES.forEach((t) => {
    map[toReportTypeEnum(t)] = t;
  });
  return map[enumVal] || enumVal.replace(/_/g, ' ');
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportsPage() {
  const queryClient = useQueryClient();

  // Generate form state
  const [reportType, setReportType] = useState<string>(REPORT_TYPES[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scope, setScope] = useState<string>(SCOPE_OPTIONS[0]);
  const [exportFormat, setExportFormat] = useState<string>('PDF');

  // Reports list pagination
  const [page, setPage] = useState(1);
  const limit = 10;

  // Scheduled reports section
  const [schedulesExpanded, setSchedulesExpanded] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleCron, setScheduleCron] = useState('0 9 * * 1');
  const [scheduleStartDate, setScheduleStartDate] = useState('');
  const [scheduleEndDate, setScheduleEndDate] = useState('');

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  const {
    data: reportsData,
    isLoading: loadingReports,
    isError: reportsError,
  } = useQuery({
    queryKey: ['reports', { page, limit }],
    queryFn: () => reportsApi.list({ page, limit }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const reports = reportsData?.data || [];
  const meta = reportsData?.meta || { total: 0, page: 1, limit, totalPages: 1 };

  const {
    data: schedules,
    isLoading: loadingSchedules,
  } = useQuery({
    queryKey: ['report-schedules'],
    queryFn: () => reportsApi.listSchedules(),
    enabled: schedulesExpanded,
    staleTime: 30_000,
  });

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const generateMutation = useMutation({
    mutationFn: (data: GenerateReportInput) => reportsApi.generate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report generation started');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: (data: Parameters<typeof reportsApi.createSchedule>[0]) =>
      reportsApi.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      setShowScheduleModal(false);
      setScheduleCron('0 9 * * 1');
      setScheduleStartDate('');
      setScheduleEndDate('');
      toast.success('Report schedule created');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create schedule');
    },
  });

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error('Please select a date range');
      return;
    }

    generateMutation.mutate({
      reportType: toReportTypeEnum(reportType),
      aggregationType: scope.toUpperCase(),
      periodStart: new Date(startDate).toISOString(),
      periodEnd: new Date(endDate).toISOString(),
      exportFormats: [exportFormat.toLowerCase()],
    });
  };

  const handleDownload = async (report: GeneratedReport, fmt: string) => {
    try {
      const fmtLower = fmt.toLowerCase();
      const urlMap: Record<string, string | undefined> = {
        pdf: report.pdfUrl,
        excel: report.excelUrl,
        csv: report.csvUrl,
      };
      if (!urlMap[fmtLower]) {
        toast.error(`No ${fmt} file available for this report`);
        return;
      }

      // Use the axios-based API client which has auth headers + correct base URL
      const blob = await reportsApi.download(report.id, fmtLower);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = fmtLower === 'excel' ? 'xlsx' : fmtLower;
      a.download = `${report.title}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (err) {
      console.error('[Download] Error:', err);
      toast.error('Download failed');
    }
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleCron.trim()) {
      toast.error('Please enter a cron expression');
      return;
    }
    if (!scheduleStartDate) {
      toast.error('Please select a start date');
      return;
    }
    createScheduleMutation.mutate({
      reportDefinitionId: toReportTypeEnum(reportType),
      cronExpression: scheduleCron.trim(),
      startDate: new Date(scheduleStartDate).toISOString(),
      endDate: scheduleEndDate ? new Date(scheduleEndDate).toISOString() : undefined,
    });
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderStatusBadge = (status: string) => {
    const normalized = status.toUpperCase();
    return (
      <span
        className={clsx(
          'px-2 py-0.5 rounded-full text-xs font-medium',
          statusColors[normalized] || 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-300'
        )}
      >
        {normalized}
      </span>
    );
  };

  const renderTypeBadge = (type: string) => {
    const label = toReportTypeLabel(type);
    return (
      <span
        className={clsx(
          'px-2 py-0.5 rounded-full text-xs font-medium',
          reportTypeColors[label] || 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-300'
        )}
      >
        {label}
      </span>
    );
  };

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Reports</h1>
        <p className="mt-1 text-secondary-600 dark:text-secondary-400">
          Generate, download, and schedule performance reports
        </p>
      </div>

      {/* ================================================================= */}
      {/* Generate Report Section                                           */}
      {/* ================================================================= */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
        <div className="flex items-center gap-2 mb-5">
          <ChartBarIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
            Generate Report
          </h2>
        </div>

        <form onSubmit={handleGenerate} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {REPORT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Scope */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Scope
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {SCOPE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Format + Submit row */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            {/* Format radio buttons */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Format
              </label>
              <div className="flex items-center gap-4">
                {FORMAT_OPTIONS.map((fmt) => (
                  <label
                    key={fmt}
                    className="inline-flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="exportFormat"
                      value={fmt}
                      checked={exportFormat === fmt}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="h-4 w-4 text-primary-600 border-secondary-300 dark:border-secondary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-secondary-700 dark:text-secondary-300">
                      {fmt}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              type="submit"
              disabled={generateMutation.isPending}
              className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-6 py-2 inline-flex items-center gap-2 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generateMutation.isPending ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <DocumentTextIcon className="h-4 w-4" />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ================================================================= */}
      {/* Generated Reports List                                            */}
      {/* ================================================================= */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
          <TableCellsIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
            Generated Reports
          </h2>
          <span className="ml-auto text-sm text-secondary-500 dark:text-secondary-400">
            {meta.total} report{meta.total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Loading state */}
        {loadingReports && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
          </div>
        )}

        {/* Error state */}
        {reportsError && (
          <div className="text-center py-12 px-6">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400 dark:text-red-500" />
            <h3 className="mt-3 text-sm font-medium text-secondary-900 dark:text-white">
              Failed to load reports
            </h3>
            <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
              Something went wrong while fetching reports. Please try again.
            </p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['reports'] })}
              className="mt-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loadingReports && !reportsError && reports.length === 0 && (
          <div className="text-center py-16 px-6">
            <DocumentArrowDownIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
            <h3 className="mt-3 text-sm font-medium text-secondary-900 dark:text-white">
              No reports generated yet
            </h3>
            <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
              Use the form above to generate your first report.
            </p>
          </div>
        )}

        {/* Reports table */}
        {!loadingReports && !reportsError && reports.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
                <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Report Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Generated Date
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Format
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
                  {reports.map((report: GeneratedReport) => {
                    const availableFormats: string[] = [];
                    if (report.pdfUrl) availableFormats.push('PDF');
                    if (report.excelUrl) availableFormats.push('Excel');
                    if (report.csvUrl) availableFormats.push('CSV');
                    const statusNorm = report.generationStatus?.toUpperCase() || 'PENDING';

                    return (
                      <tr
                        key={report.id}
                        className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors"
                      >
                        {/* Report Name */}
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-secondary-900 dark:text-white">
                            {report.title}
                          </div>
                          {report.periodLabel && (
                            <div className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
                              {report.periodLabel}
                            </div>
                          )}
                        </td>

                        {/* Type badge */}
                        <td className="px-6 py-4">
                          {renderTypeBadge(report.reportType)}
                        </td>

                        {/* Generated date */}
                        <td className="px-6 py-4 text-sm text-secondary-600 dark:text-secondary-300">
                          {report.createdAt
                            ? format(parseISO(report.createdAt), 'MMM d, yyyy h:mm a')
                            : '--'}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 text-center">
                          {renderStatusBadge(statusNorm)}
                        </td>

                        {/* Format */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {availableFormats.length > 0 ? (
                              availableFormats.map((fmt) => (
                                <span
                                  key={fmt}
                                  className="px-1.5 py-0.5 rounded text-xs font-medium bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300"
                                >
                                  {fmt}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-secondary-400">--</span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          {statusNorm === 'COMPLETED' && availableFormats.length > 0 ? (
                            <div className="flex items-center justify-end gap-1">
                              {availableFormats.map((fmt) => (
                                <button
                                  key={fmt}
                                  onClick={() => handleDownload(report, fmt)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
                                  title={`Download ${fmt}`}
                                >
                                  <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                                  {fmt}
                                </button>
                              ))}
                            </div>
                          ) : statusNorm === 'PENDING' || statusNorm === 'PROCESSING' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                              Processing
                            </span>
                          ) : statusNorm === 'FAILED' ? (
                            <span className="text-xs text-red-600 dark:text-red-400">
                              Generation failed
                            </span>
                          ) : (
                            <span className="text-xs text-secondary-400">--</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-secondary-200 dark:border-secondary-700">
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Showing {(meta.page - 1) * meta.limit + 1} to{' '}
                  {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} reports
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 || p === meta.totalPages || Math.abs(p - page) <= 1
                      )
                      .reduce<(number | string)[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                          acc.push('...');
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        typeof p === 'string' ? (
                          <span
                            key={`ellipsis-${idx}`}
                            className="px-2 text-secondary-400"
                          >
                            ...
                          </span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={clsx(
                              'px-3 py-1.5 text-sm rounded-lg transition-colors',
                              p === page
                                ? 'bg-primary-600 text-white'
                                : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                            )}
                          >
                            {p}
                          </button>
                        )
                      )}
                  </div>
                  <button
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    disabled={page >= meta.totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ================================================================= */}
      {/* Scheduled Reports Section (expandable)                            */}
      {/* ================================================================= */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700">
        <button
          onClick={() => setSchedulesExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Scheduled Reports
            </h2>
          </div>
          {schedulesExpanded ? (
            <ChevronUpIcon className="h-5 w-5 text-secondary-400" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-secondary-400" />
          )}
        </button>

        {schedulesExpanded && (
          <div className="px-6 pb-6 border-t border-secondary-200 dark:border-secondary-700 pt-4">
            {/* Create Schedule button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowScheduleModal(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 inline-flex items-center gap-2 font-medium text-sm transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                Create Schedule
              </button>
            </div>

            {/* Schedules loading */}
            {loadingSchedules && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600" />
              </div>
            )}

            {/* Schedules empty */}
            {!loadingSchedules && (!schedules || schedules.length === 0) && (
              <div className="text-center py-8">
                <ClockIcon className="mx-auto h-10 w-10 text-secondary-300 dark:text-secondary-600" />
                <p className="mt-2 text-sm text-secondary-500 dark:text-secondary-400">
                  No scheduled reports yet. Create one to automate report generation.
                </p>
              </div>
            )}

            {/* Schedules list */}
            {!loadingSchedules && schedules && schedules.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
                  <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Report Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Cron Expression
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Next Run
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Last Run
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
                    {schedules.map((schedule: any) => (
                      <tr
                        key={schedule.id}
                        className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-secondary-900 dark:text-white">
                          {schedule.reportDefinitionId
                            ? toReportTypeLabel(schedule.reportDefinitionId)
                            : '--'}
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-xs bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 px-2 py-1 rounded">
                            {schedule.cronExpression || '--'}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-sm text-secondary-600 dark:text-secondary-300">
                          {schedule.nextRunAt
                            ? format(parseISO(schedule.nextRunAt), 'MMM d, yyyy h:mm a')
                            : '--'}
                        </td>
                        <td className="px-6 py-4 text-sm text-secondary-600 dark:text-secondary-300">
                          {schedule.lastRunAt
                            ? format(parseISO(schedule.lastRunAt), 'MMM d, yyyy h:mm a')
                            : 'Never'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded-full text-xs font-medium',
                              schedule.status === 'ACTIVE' || schedule.isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                : 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-300'
                            )}
                          >
                            {schedule.status || (schedule.isActive ? 'ACTIVE' : 'PAUSED')}
                          </span>
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

      {/* ================================================================= */}
      {/* Create Schedule Modal                                             */}
      {/* ================================================================= */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Create Report Schedule
              </h2>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setScheduleCron('0 9 * * 1');
                  setScheduleStartDate('');
                  setScheduleEndDate('');
                }}
                className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 dark:text-secondary-400"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-5">
              {/* Report type (reuses the state from generate form) */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {REPORT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cron expression */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Cron Expression <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={scheduleCron}
                  onChange={(e) => setScheduleCron(e.target.value)}
                  placeholder="e.g., 0 9 * * 1 (Every Monday at 9 AM)"
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
                  Standard cron format: minute hour day-of-month month day-of-week
                </p>
              </div>

              {/* Start date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={scheduleStartDate}
                    onChange={(e) => setScheduleStartDate(e.target.value)}
                    required
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={scheduleEndDate}
                    onChange={(e) => setScheduleEndDate(e.target.value)}
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
                    Optional. Leave empty for no end date.
                  </p>
                </div>
              </div>

              {/* Form actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200 dark:border-secondary-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setScheduleCron('0 9 * * 1');
                    setScheduleStartDate('');
                    setScheduleEndDate('');
                  }}
                  className="px-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createScheduleMutation.isPending}
                  className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createScheduleMutation.isPending ? 'Creating...' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
