import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownTrayIcon,
  FlagIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftRightIcon,
  DocumentChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { analyticsApi, reportsApi, type GeneratedReport } from '@/lib/api';
import { ExportCard } from '@/components/exports';
import { usePageTitle } from '@/hooks/usePageTitle';

// ── Types ──

type TabKey = 'quick' | 'reports' | 'history';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'quick', label: 'Quick Export' },
  { key: 'reports', label: 'Generate Reports' },
  { key: 'history', label: 'Export History' },
];

const REPORT_TYPES = [
  'Performance Summary',
  '360-Degree Feedback',
  'Team Analytics',
  'Goal Achievement',
  'Development Progress',
  'PIP Status',
  'Compensation Analysis',
];

const REPORT_SCOPES = ['Individual', 'Team', 'Department', 'Organization'];
const REPORT_FORMATS = ['PDF', 'Excel', 'CSV'];

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircleIcon; color: string; label: string }> = {
  COMPLETED: { icon: CheckCircleIcon, color: 'text-green-600 dark:text-green-400', label: 'Completed' },
  PENDING: { icon: ClockIcon, color: 'text-amber-600 dark:text-amber-400', label: 'Pending' },
  PROCESSING: { icon: ArrowPathIcon, color: 'text-blue-600 dark:text-blue-400', label: 'Processing' },
  FAILED: { icon: ExclamationCircleIcon, color: 'text-red-600 dark:text-red-400', label: 'Failed' },
};

// ── Download helper ──

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Main Component ──

export function DataExportPage() {
  usePageTitle('Data Export Center');
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('quick');
  const [exportingType, setExportingType] = useState<string | null>(null);

  // Report generation form state
  const [reportType, setReportType] = useState(REPORT_TYPES[0]);
  const [reportScope, setReportScope] = useState(REPORT_SCOPES[3]);
  const [reportFormat, setReportFormat] = useState(REPORT_FORMATS[0]);
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().split('T')[0]);

  // ── Queries ──

  const { data: reportsData, isLoading: loadingReports } = useQuery({
    queryKey: ['reports-list'],
    queryFn: () => reportsApi.list({ limit: 50 }),
    staleTime: 15_000,
  });

  const reports: GeneratedReport[] = (reportsData as any)?.data ?? [];

  // ── Quick Export handler ──

  const handleQuickExport = useCallback(async (dataType: 'goals' | 'reviews' | 'feedback') => {
    setExportingType(dataType);
    try {
      const response = await analyticsApi.exportData(dataType);
      const blob = new Blob([response as any], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `${dataType}-export-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(`${dataType.charAt(0).toUpperCase() + dataType.slice(1)} data exported successfully`);
    } catch {
      toast.error(`Failed to export ${dataType} data`);
    } finally {
      setExportingType(null);
    }
  }, []);

  // ── Report Generation ──

  const generateMutation = useMutation({
    mutationFn: () =>
      reportsApi.generate({
        reportType: reportType.toUpperCase().replace(/[\s-]+/g, '_'),
        aggregationType: reportScope.toUpperCase(),
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
        exportFormats: [reportFormat.toLowerCase()],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports-list'] });
      toast.success('Report generation started');
    },
    onError: () => toast.error('Failed to generate report'),
  });

  // ── Report Download ──

  const handleDownloadReport = async (report: GeneratedReport, fmt: string) => {
    try {
      const fmtLower = fmt.toLowerCase();
      const blob = await reportsApi.download(report.id, fmtLower);
      const ext = fmtLower === 'excel' ? 'xlsx' : fmtLower;
      downloadBlob(blob, `${report.title}.${ext}`);
      toast.success('Download started');
    } catch {
      toast.error('Download failed');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
            <ArrowDownTrayIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          Data Export Center
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400 text-sm mt-1 ml-14">
          Export your data as CSV, PDF, or Excel. Generate custom reports with flexible filters.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary-100 dark:bg-secondary-800 rounded-lg w-fit mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
              activeTab === tab.key
                ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
                : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Quick Export Tab ── */}
      {activeTab === 'quick' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ExportCard
            title="Goals Data"
            description="Export all goals with progress, status, dates, and owner information."
            icon={FlagIcon}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            onExport={() => handleQuickExport('goals')}
            isExporting={exportingType === 'goals'}
          />
          <ExportCard
            title="Reviews Data"
            description="Export review cycles, ratings, comments, and completion status."
            icon={ClipboardDocumentCheckIcon}
            iconColor="text-purple-600 dark:text-purple-400"
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            onExport={() => handleQuickExport('reviews')}
            isExporting={exportingType === 'reviews'}
          />
          <ExportCard
            title="Feedback Data"
            description="Export feedback records including praise, constructive, and 360-degree feedback."
            icon={ChatBubbleLeftRightIcon}
            iconColor="text-green-600 dark:text-green-400"
            iconBg="bg-green-100 dark:bg-green-900/30"
            onExport={() => handleQuickExport('feedback')}
            isExporting={exportingType === 'feedback'}
          />
        </div>
      )}

      {/* ── Reports Tab ── */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Report Generator */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Generate Report</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1">Report Type</label>
                <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-2 text-sm text-secondary-900 dark:text-white">
                  {REPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1">Scope</label>
                <select value={reportScope} onChange={(e) => setReportScope(e.target.value)} className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-2 text-sm text-secondary-900 dark:text-white">
                  {REPORT_SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1">Format</label>
                <select value={reportFormat} onChange={(e) => setReportFormat(e.target.value)} className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-2 text-sm text-secondary-900 dark:text-white">
                  {REPORT_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1">Period Start</label>
                <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-2 text-sm text-secondary-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1">Period End</label>
                <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-2 text-sm text-secondary-900 dark:text-white" />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {generateMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <DocumentChartBarIcon className="h-4 w-4" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Recent Reports */}
          <ReportsList reports={reports} loading={loadingReports} onDownload={handleDownloadReport} />
        </div>
      )}

      {/* ── History Tab ── */}
      {activeTab === 'history' && (
        <ReportsList reports={reports} loading={loadingReports} onDownload={handleDownloadReport} />
      )}
    </div>
  );
}

// ── Reports List Sub-component ──

function ReportsList({
  reports,
  loading,
  onDownload,
}: {
  reports: GeneratedReport[];
  loading: boolean;
  onDownload: (report: GeneratedReport, fmt: string) => void;
}) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6 text-center py-16">
        <DocumentChartBarIcon className="h-12 w-12 mx-auto text-secondary-300 dark:text-secondary-600 mb-3" />
        <p className="text-lg font-medium text-secondary-500 dark:text-secondary-400">No reports yet</p>
        <p className="text-sm text-secondary-400 dark:text-secondary-500 mt-1">Generate your first report to see it here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
        <h2 className="text-base font-semibold text-secondary-900 dark:text-white">Generated Reports</h2>
      </div>
      <div className="divide-y divide-secondary-100 dark:divide-secondary-700">
        {reports.map((report) => {
          const statusCfg = STATUS_CONFIG[report.generationStatus] || STATUS_CONFIG.PENDING;
          const StatusIcon = statusCfg.icon;
          const availableFormats = [
            report.pdfUrl && 'PDF',
            report.excelUrl && 'Excel',
            report.csvUrl && 'CSV',
          ].filter(Boolean) as string[];

          return (
            <div key={report.id} className="px-6 py-4 hover:bg-secondary-50 dark:hover:bg-secondary-700/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{report.title}</p>
                    <span className={clsx('inline-flex items-center gap-1 text-[10px] font-medium', statusCfg.color)}>
                      <StatusIcon className={clsx('h-3.5 w-3.5', report.generationStatus === 'PROCESSING' && 'animate-spin')} />
                      {statusCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-secondary-400 dark:text-secondary-500">
                    {report.reportType && <span>{report.reportType.replace(/_/g, ' ')}</span>}
                    {report.periodLabel && <span>&middot; {report.periodLabel}</span>}
                    <span>&middot; {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {report.generationStatus === 'COMPLETED' && availableFormats.length > 0 ? (
                    availableFormats.map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => onDownload(report, fmt)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                      >
                        <ArrowDownTrayIcon className="h-3 w-3" />
                        {fmt}
                      </button>
                    ))
                  ) : report.generationStatus === 'COMPLETED' ? (
                    <button
                      onClick={() => onDownload(report, 'pdf')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                    >
                      <ArrowDownTrayIcon className="h-3 w-3" />
                      Download
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
