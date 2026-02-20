import { useState, useCallback, useRef } from 'react';
import {
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  SparklesIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  excelUploadApi,
  type AnalyzeResult,
  type ConfirmResult,
  type UploadHistoryItem,
  type AIAutoFix,
} from '@/lib/api/excel-upload';

// ── State Machine ──────────────────────────────────────────

type UploadStage = 'idle' | 'uploading' | 'analyzing' | 'preview' | 'confirming' | 'done';

// ── Quality Score Colors ───────────────────────────────────

function getScoreColor(score: number): string {
  if (score < 0) return 'text-secondary-400';
  if (score >= 90) return 'text-green-600 dark:text-green-400';
  if (score >= 70) return 'text-blue-600 dark:text-blue-400';
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreLabel(score: number): string {
  if (score < 0) return 'N/A';
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
}

function getScoreBg(score: number): string {
  if (score < 0) return 'bg-secondary-100 dark:bg-secondary-800';
  if (score >= 90) return 'bg-green-50 dark:bg-green-900/20';
  if (score >= 70) return 'bg-blue-50 dark:bg-blue-900/20';
  if (score >= 50) return 'bg-yellow-50 dark:bg-yellow-900/20';
  return 'bg-red-50 dark:bg-red-900/20';
}

// ── Category Labels ────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  name_casing: 'Name Casing',
  email_completion: 'Email Fix',
  department_match: 'Department',
  level_adjustment: 'Level',
  date_format: 'Date Format',
  role_match: 'Role',
  data_cleanup: 'Data Cleanup',
};

// ── Main Component ─────────────────────────────────────────

export function ExcelUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [stage, setStage] = useState<UploadStage>('idle');
  const [error, setError] = useState('');
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);
  const [acceptedFixes, setAcceptedFixes] = useState<Set<string>>(new Set());
  const [progressMsg, setProgressMsg] = useState('');
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File Handling ──────────────────────────────────────

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  }, []);

  const validateAndSetFile = (f: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    const validExts = ['.xlsx', '.xls', '.csv'];
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(f.type) && !validExts.includes(ext)) {
      setError('Please upload an Excel (.xlsx, .xls) or CSV file');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }
    setFile(f);
    setError('');
    setAnalyzeResult(null);
    setConfirmResult(null);
    setAcceptedFixes(new Set());
    setStage('idle');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) validateAndSetFile(selected);
  };

  // ── Phase A: Analyze ──────────────────────────────────

  const handleAnalyze = async () => {
    if (!file) return;
    setStage('analyzing');
    setError('');
    setProgressMsg('Uploading and analyzing...');

    try {
      const result = await excelUploadApi.analyzeUpload(file);
      setAnalyzeResult(result);

      // Auto-accept high-confidence AI fixes
      const autoAccepted = new Set<string>();
      for (const fix of result.aiAnalysis.autoFixable) {
        if (fix.confidence >= 0.9) {
          autoAccepted.add(fix.id);
        }
      }
      setAcceptedFixes(autoAccepted);
      setStage('preview');
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
      setStage('idle');
    }
  };

  // ── Phase B: Confirm ──────────────────────────────────

  const handleConfirm = async () => {
    if (!analyzeResult) return;
    setStage('confirming');
    setError('');

    try {
      const result = await excelUploadApi.confirmUpload(
        analyzeResult.uploadId,
        Array.from(acceptedFixes),
      );
      setConfirmResult(result);
      setStage('done');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to create accounts');
      setStage('preview');
    }
  };

  // ── Fix Management ────────────────────────────────────

  const toggleFix = (fixId: string) => {
    setAcceptedFixes((prev) => {
      const next = new Set(prev);
      if (next.has(fixId)) next.delete(fixId);
      else next.add(fixId);
      return next;
    });
  };

  const acceptAllHighConfidence = () => {
    if (!analyzeResult) return;
    const all = new Set(acceptedFixes);
    for (const fix of analyzeResult.aiAnalysis.autoFixable) {
      if (fix.confidence >= 0.9) all.add(fix.id);
    }
    setAcceptedFixes(all);
  };

  // ── Reset ─────────────────────────────────────────────

  const handleReset = () => {
    setFile(null);
    setStage('idle');
    setError('');
    setAnalyzeResult(null);
    setConfirmResult(null);
    setAcceptedFixes(new Set());
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── History ───────────────────────────────────────────

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const result = await excelUploadApi.getHistory();
      setHistory(Array.isArray(result.data) ? result.data : (result as any).data || []);
    } catch { /* ignore */ }
    finally {
      setHistoryLoading(false);
      setHistoryLoaded(true);
    }
  };

  // ── Status Badge ──────────────────────────────────────

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; icon: any }> = {
      COMPLETED: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircleIcon },
      PARTIAL: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: ExclamationTriangleIcon },
      FAILED: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircleIcon },
      PROCESSING: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: ClockIcon },
      PREVIEW: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: SparklesIcon },
    };
    const cfg = map[status] || map.PROCESSING;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
        <Icon className="h-3.5 w-3.5" />
        {status}
      </span>
    );
  };

  // ── Render ────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Employee Upload</h1>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            AI-enhanced bulk onboarding with smart validation and auto-corrections
          </p>
        </div>
        <div className="flex gap-2">
          {stage !== 'idle' && stage !== 'done' && (
            <button onClick={handleReset} className="btn btn-secondary inline-flex items-center gap-2">
              <ArrowPathIcon className="h-5 w-5" />
              Start Over
            </button>
          )}
          <button onClick={() => excelUploadApi.downloadTemplate()} className="btn btn-secondary inline-flex items-center gap-2">
            <DocumentArrowDownIcon className="h-5 w-5" />
            Download Template
          </button>
        </div>
      </div>

      {/* Upload Dropzone */}
      {(stage === 'idle' || stage === 'done') && (
        <>
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10'
                : 'border-secondary-300 dark:border-secondary-700 hover:border-primary-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-secondary-400 dark:text-secondary-500" />
            <div className="mt-4">
              <label htmlFor="file-upload" className="cursor-pointer text-primary-600 hover:text-primary-500 dark:text-primary-400 font-medium">
                Choose a file
              </label>
              <span className="text-secondary-500 dark:text-secondary-400"> or drag and drop</span>
            </div>
            <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
              Excel (.xlsx, .xls) or CSV up to 10MB
            </p>

            {file && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-secondary-100 dark:bg-secondary-800 rounded-lg">
                <TableCellsIcon className="h-5 w-5 text-secondary-500" />
                <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">{file.name}</span>
                <span className="text-xs text-secondary-500">({(file.size / 1024).toFixed(1)} KB)</span>
                <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="ml-2 text-secondary-400 hover:text-red-500">
                  <XCircleIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {file && (
            <div className="flex justify-end">
              <button onClick={handleAnalyze} className="btn btn-primary inline-flex items-center gap-2">
                <SparklesIcon className="h-5 w-5" />
                Analyze with AI
              </button>
            </div>
          )}
        </>
      )}

      {/* Analyzing Progress */}
      {stage === 'analyzing' && (
        <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Analyzing Your Data</h3>
              <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">{progressMsg}</p>
            </div>
            <div className="w-full max-w-md">
              <div className="flex items-center gap-3 text-sm text-secondary-600 dark:text-secondary-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  <span>Parsing</span>
                </div>
                <div className="h-px flex-1 bg-secondary-200 dark:bg-secondary-700" />
                <div className="flex items-center gap-1.5">
                  <div className="animate-pulse h-4 w-4 rounded-full bg-primary-500" />
                  <span>Validating</span>
                </div>
                <div className="h-px flex-1 bg-secondary-200 dark:bg-secondary-700" />
                <div className="flex items-center gap-1.5 text-secondary-400 dark:text-secondary-600">
                  <SparklesIcon className="h-4 w-4" />
                  <span>AI Analysis</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Preview Stage */}
      {stage === 'preview' && analyzeResult && (
        <>
          {/* AI Insights Panel */}
          <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700 flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-primary-500" />
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">AI Analysis</h3>
            </div>

            <div className="p-6">
              {/* Score + Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className={`text-center p-4 rounded-lg ${getScoreBg(analyzeResult.aiAnalysis.qualityScore)}`}>
                  <p className={`text-3xl font-bold ${getScoreColor(analyzeResult.aiAnalysis.qualityScore)}`}>
                    {analyzeResult.aiAnalysis.qualityScore < 0 ? '\u2014' : analyzeResult.aiAnalysis.qualityScore}
                  </p>
                  <p className="text-xs text-secondary-500 mt-1">Quality Score</p>
                  <p className={`text-xs font-medium ${getScoreColor(analyzeResult.aiAnalysis.qualityScore)}`}>
                    {getScoreLabel(analyzeResult.aiAnalysis.qualityScore)}
                  </p>
                </div>
                <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                  <p className="text-2xl font-bold text-secondary-900 dark:text-white">{analyzeResult.totalRows}</p>
                  <p className="text-xs text-secondary-500 mt-1">Total Rows</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{analyzeResult.validation.validRowCount}</p>
                  <p className="text-xs text-secondary-500 mt-1">Valid</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{analyzeResult.validation.errors.length}</p>
                  <p className="text-xs text-secondary-500 mt-1">Errors</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{analyzeResult.validation.warnings.length}</p>
                  <p className="text-xs text-secondary-500 mt-1">Warnings</p>
                </div>
              </div>

              {/* AI Notes */}
              {analyzeResult.aiAnalysis.analysis.overallNotes && (
                <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-sm text-primary-800 dark:text-primary-300 flex items-start gap-2">
                  <InformationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>{analyzeResult.aiAnalysis.analysis.overallNotes}</span>
                </div>
              )}

              {/* Risk Flags */}
              {analyzeResult.aiAnalysis.analysis.riskFlags.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Risk Flags</p>
                  <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                    {analyzeResult.aiAnalysis.analysis.riskFlags.map((flag, i) => (
                      <li key={i}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Duplicate Clusters */}
              {analyzeResult.aiAnalysis.duplicateClusters.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-1">Potential Duplicates Found</p>
                  {analyzeResult.aiAnalysis.duplicateClusters.map((cluster, i) => (
                    <div key={i} className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                      Rows {cluster.rows.join(', ')}: {cluster.reason} ({Math.round(cluster.confidence * 100)}% confidence)
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Auto-Fix Suggestions */}
          {(analyzeResult.aiAnalysis.autoFixable.length > 0 || analyzeResult.validation.suggestions.length > 0) && (
            <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                    Suggested Fixes ({analyzeResult.aiAnalysis.autoFixable.length + analyzeResult.validation.suggestions.length})
                  </h3>
                </div>
                {analyzeResult.aiAnalysis.autoFixable.length > 0 && (
                  <button onClick={acceptAllHighConfidence} className="btn btn-sm btn-secondary">
                    Accept All High Confidence
                  </button>
                )}
              </div>

              <div className="divide-y divide-secondary-100 dark:divide-secondary-800 max-h-72 overflow-y-auto">
                {/* AI fixes */}
                {analyzeResult.aiAnalysis.autoFixable.map((fix) => (
                  <FixSuggestionRow key={fix.id} fix={fix} accepted={acceptedFixes.has(fix.id)} onToggle={() => toggleFix(fix.id)} />
                ))}

                {/* Rule-based suggestions */}
                {analyzeResult.validation.suggestions.map((sug, i) => (
                  <div key={`sug-${i}`} className="px-6 py-3 flex items-center gap-4 text-sm bg-green-50/30 dark:bg-green-900/5">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-secondary-500">Row {sug.row}, {sug.field}: </span>
                      <span className="line-through text-red-500 dark:text-red-400">{sug.currentValue}</span>
                      <span className="mx-1">{'\u2192'}</span>
                      <span className="font-medium text-green-600 dark:text-green-400">{sug.suggestedValue}</span>
                      <span className="ml-2 text-xs text-secondary-400">{sug.reason}</span>
                    </div>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Auto</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors Table */}
          {analyzeResult.validation.errors.length > 0 && (
            <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                  Validation Errors ({analyzeResult.validation.errors.length})
                </h3>
                <p className="text-xs text-secondary-500 mt-1">These must be fixed in the source file before creating accounts</p>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700 text-sm">
                  <thead className="bg-secondary-50 dark:bg-secondary-800 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Row</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Field</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                    {analyzeResult.validation.errors.map((err, i) => (
                      <tr key={i} className="text-secondary-700 dark:text-secondary-300">
                        <td className="px-4 py-2 font-mono">{err.row || '\u2014'}</td>
                        <td className="px-4 py-2">{err.field}</td>
                        <td className="px-4 py-2 text-red-600 dark:text-red-400">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Warnings Table */}
          {analyzeResult.validation.warnings.length > 0 && (
            <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
                <h3 className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                  Warnings ({analyzeResult.validation.warnings.length})
                </h3>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700 text-sm">
                  <thead className="bg-secondary-50 dark:bg-secondary-800 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Row</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Field</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Warning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                    {analyzeResult.validation.warnings.map((w, i) => (
                      <tr key={i} className="text-secondary-700 dark:text-secondary-300">
                        <td className="px-4 py-2 font-mono">{w.row}</td>
                        <td className="px-4 py-2">{w.field}</td>
                        <td className="px-4 py-2 text-yellow-600 dark:text-yellow-400">{w.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Preview Data Table */}
          <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Data Preview ({analyzeResult.totalRows} rows)
              </h3>
            </div>
            <div className="overflow-x-auto max-h-80">
              <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700 text-sm">
                <thead className="bg-secondary-50 dark:bg-secondary-800 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Row</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase">First Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Last Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Dept</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Level</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Job Title</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                  {analyzeResult.rows.map((row, i) => {
                    const rowNum = i + 3;
                    const hasError = analyzeResult.validation.errors.some((e) => e.row === rowNum);
                    const hasWarning = analyzeResult.validation.warnings.some((w) => w.row === rowNum);
                    return (
                      <tr key={i} className={`text-secondary-700 dark:text-secondary-300 ${hasError ? 'bg-red-50/50 dark:bg-red-900/10' : hasWarning ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}>
                        <td className="px-3 py-2 font-mono text-xs">{rowNum}</td>
                        <td className="px-3 py-2">{row.firstName}</td>
                        <td className="px-3 py-2">{row.lastName}</td>
                        <td className="px-3 py-2 font-mono text-xs">{row.email}</td>
                        <td className="px-3 py-2">{row.department || '\u2014'}</td>
                        <td className="px-3 py-2">{row.level ?? '\u2014'}</td>
                        <td className="px-3 py-2">{row.jobTitle || '\u2014'}</td>
                        <td className="px-3 py-2">
                          {hasError ? (
                            <XCircleIcon className="h-4 w-4 text-red-500" />
                          ) : hasWarning ? (
                            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <CheckCircleIcon className="h-4 w-4 text-green-500" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Confirm Button */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              {analyzeResult.validation.validRowCount} of {analyzeResult.totalRows} rows are valid and ready to create.
              {acceptedFixes.size > 0 && ` ${acceptedFixes.size} AI fix(es) will be applied.`}
            </p>
            <div className="flex gap-2">
              <button onClick={handleReset} className="btn btn-secondary">Cancel</button>
              <button
                onClick={handleConfirm}
                disabled={analyzeResult.validation.validRowCount === 0 || stage === 'confirming'}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <CheckCircleIcon className="h-5 w-5" />
                Create {analyzeResult.validation.validRowCount} Accounts
              </button>
            </div>
          </div>
        </>
      )}

      {/* Confirming state */}
      {stage === 'confirming' && (
        <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Creating Accounts...</h3>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              Applying fixes and creating user accounts. Welcome emails will be sent automatically.
            </p>
          </div>
        </div>
      )}

      {/* Done / Results */}
      {stage === 'done' && confirmResult && (
        <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Upload Complete</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                <p className="text-2xl font-bold text-secondary-900 dark:text-white">{confirmResult.totalRows}</p>
                <p className="text-sm text-secondary-500">Total Rows</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{confirmResult.successCount}</p>
                <p className="text-sm text-secondary-500">Created</p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{confirmResult.errorCount}</p>
                <p className="text-sm text-secondary-500">Errors</p>
              </div>
            </div>

            {confirmResult.status === 'COMPLETED' && confirmResult.errorCount === 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
                <CheckCircleIcon className="h-5 w-5" />
                All employees were created successfully! Welcome emails have been sent.
              </div>
            )}

            {confirmResult.errors.length > 0 && (
              <div className="mt-4 max-h-40 overflow-y-auto border border-secondary-200 dark:border-secondary-700 rounded-lg">
                <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700 text-sm">
                  <thead className="bg-secondary-50 dark:bg-secondary-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Row</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Field</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                    {confirmResult.errors.map((err, i) => (
                      <tr key={i} className="text-secondary-700 dark:text-secondary-300">
                        <td className="px-4 py-2 font-mono">{err.row}</td>
                        <td className="px-4 py-2">{err.field}</td>
                        <td className="px-4 py-2 text-red-600 dark:text-red-400">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button onClick={handleReset} className="btn btn-primary inline-flex items-center gap-2">
                <ArrowUpTrayIcon className="h-5 w-5" />
                Upload Another File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload History */}
      <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Upload History</h3>
          <button onClick={loadHistory} disabled={historyLoading} className="btn btn-secondary btn-sm inline-flex items-center gap-1.5">
            <ArrowPathIcon className={`h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} />
            {historyLoaded ? 'Refresh' : 'Load History'}
          </button>
        </div>

        {historyLoaded && (
          <div className="overflow-x-auto">
            {history.length === 0 ? (
              <div className="p-8 text-center text-secondary-500 dark:text-secondary-400">No uploads yet</div>
            ) : (
              <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700 text-sm">
                <thead className="bg-secondary-50 dark:bg-secondary-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">File</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Rows</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Errors</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Uploaded By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                  {history.map((item) => (
                    <tr key={item.id} className="text-secondary-700 dark:text-secondary-300">
                      <td className="px-4 py-3 font-medium">{item.fileName}</td>
                      <td className="px-4 py-3">{statusBadge(item.status)}</td>
                      <td className="px-4 py-3">{item.totalRows}</td>
                      <td className="px-4 py-3 text-green-600 dark:text-green-400">{item.successCount}</td>
                      <td className="px-4 py-3 text-red-600 dark:text-red-400">{item.errorCount}</td>
                      <td className="px-4 py-3">{item.uploadedBy || '\u2014'}</td>
                      <td className="px-4 py-3 text-secondary-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Fix Suggestion Row Component ───────────────────────────

function FixSuggestionRow({ fix, accepted, onToggle }: { fix: AIAutoFix; accepted: boolean; onToggle: () => void }) {
  return (
    <div className={`px-6 py-3 flex items-center gap-4 text-sm ${accepted ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
      <button
        onClick={onToggle}
        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          accepted
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-secondary-300 dark:border-secondary-600 hover:border-primary-500'
        }`}
      >
        {accepted && <CheckCircleIcon className="h-3.5 w-3.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-secondary-500">Row {fix.row}, {fix.field}: </span>
          <span className="line-through text-red-500 dark:text-red-400">{fix.currentValue}</span>
          <span className="mx-1">{'\u2192'}</span>
          <span className="font-medium text-green-600 dark:text-green-400">{fix.suggestedValue}</span>
        </div>
        <p className="text-xs text-secondary-400 mt-0.5">{fix.issue}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs px-1.5 py-0.5 rounded ${
          fix.confidence >= 0.9
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : fix.confidence >= 0.7
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {Math.round(fix.confidence * 100)}%
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400">
          {CATEGORY_LABELS[fix.category] || fix.category}
        </span>
      </div>
    </div>
  );
}
