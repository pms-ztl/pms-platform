import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  CloudArrowUpIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CpuChipIcon,
  UserPlusIcon,
  EnvelopeIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

import {
  excelUploadApi,
  type AnalyzeResult,
  type ConfirmResult,
  type UploadHistoryItem,
  type AIAutoFix,
} from '@/lib/api/excel-upload';

// ============================================================================
// Types & Constants
// ============================================================================

type UploadStage = 'idle' | 'uploading' | 'analyzing' | 'preview' | 'confirming' | 'done';

const STAGE_STEPS = [
  { key: 'idle', label: 'Upload', icon: CloudArrowUpIcon },
  { key: 'analyzing', label: 'Analyze', icon: CpuChipIcon },
  { key: 'preview', label: 'Review', icon: ShieldCheckIcon },
  { key: 'confirming', label: 'Confirm', icon: UserPlusIcon },
  { key: 'done', label: 'Done', icon: CheckCircleIcon },
] as const;

const STAGE_ORDER: Record<string, number> = {
  idle: 0,
  uploading: 0,
  analyzing: 1,
  preview: 2,
  confirming: 3,
  done: 4,
};

const CATEGORY_LABELS: Record<string, string> = {
  name_casing: 'Name Casing',
  email_completion: 'Email Fix',
  department_match: 'Department',
  level_adjustment: 'Level',
  date_format: 'Date Format',
  role_match: 'Role',
  data_cleanup: 'Data Cleanup',
};

const CATEGORY_COLORS: Record<string, string> = {
  name_casing: '#8b5cf6',
  email_completion: '#3b82f6',
  department_match: '#10b981',
  level_adjustment: '#f59e0b',
  date_format: '#ec4899',
  role_match: '#06b6d4',
  data_cleanup: '#6366f1',
};

const QUALITY_CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

// ============================================================================
// Utility Functions
// ============================================================================

function getScoreColor(score: number): string {
  if (score < 0) return 'text-secondary-400';
  if (score >= 90) return 'text-green-500';
  if (score >= 70) return 'text-blue-500';
  if (score >= 50) return 'text-yellow-500';
  return 'text-red-500';
}

function getScoreStroke(score: number): string {
  if (score < 0) return '#94a3b8';
  if (score >= 90) return '#10b981';
  if (score >= 70) return '#3b82f6';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function getScoreLabel(score: number): string {
  if (score < 0) return 'N/A';
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
}

// ============================================================================
// Sub-Components
// ============================================================================

/** Reusable frosted-glass card matching SA dashboard pattern */
function GlassCard({
  children,
  className,
  delay,
  noPadding,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  noPadding?: boolean;
}) {
  return (
    <div
      className={clsx(
        'sa-glass-card bg-white/70 dark:bg-white/[0.03] rounded-2xl border border-gray-200/60 dark:border-white/[0.06] animate-fade-in-up',
        !noPadding && 'p-6',
        className,
      )}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}

/** Section header with icon and optional right-side action */
function SectionHeader({
  icon: Icon,
  title,
  iconColor,
  badge,
  action,
}: {
  icon: React.ComponentType<any>;
  title: string;
  iconColor?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white/90 flex items-center gap-2.5">
        <div className={clsx('p-1.5 rounded-lg', iconColor || 'bg-primary-100/60 dark:bg-primary-500/10')}>
          <Icon className="h-4.5 w-4.5 text-primary-600 dark:text-primary-400" />
        </div>
        {title}
        {badge}
      </h3>
      {action}
    </div>
  );
}

/** Horizontal stage stepper */
function StageIndicator({ currentStage }: { currentStage: UploadStage }) {
  const currentIndex = STAGE_ORDER[currentStage] ?? 0;
  return (
    <div className="flex items-center gap-1.5">
      {STAGE_STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isActive = i === currentIndex;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-center gap-1.5">
            {i > 0 && (
              <div
                className={clsx(
                  'w-6 h-0.5 rounded-full transition-colors duration-500',
                  isCompleted ? 'bg-green-500' : isActive ? 'bg-primary-400' : 'bg-gray-300 dark:bg-white/10',
                )}
              />
            )}
            <div
              className={clsx(
                'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300',
                isCompleted && 'bg-green-100/80 dark:bg-green-500/15 text-green-700 dark:text-green-400',
                isActive && 'bg-primary-100/80 dark:bg-primary-500/15 text-primary-700 dark:text-primary-400 stage-dot-active',
                !isCompleted && !isActive && 'text-gray-400 dark:text-white/30',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Animated circular quality gauge */
function QualityScoreGauge({ score }: { score: number }) {
  const displayScore = score < 0 ? 0 : score;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayScore / 100) * circumference;
  const strokeColor = getScoreStroke(score);

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        {/* Background ring */}
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="6"
          className="text-gray-200/60 dark:text-white/[0.06]" />
        {/* Score ring */}
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={strokeColor} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          className="gauge-ring"
          style={{ '--gauge-target': offset } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={clsx('text-2xl font-bold', getScoreColor(score))}>
          {score < 0 ? '\u2014' : score}
        </span>
        <span className={clsx('text-2xs font-medium', getScoreColor(score))}>
          {getScoreLabel(score)}
        </span>
      </div>
    </div>
  );
}

/** Compact stat pill */
function StatPill({
  value,
  label,
  color,
}: {
  value: string | number;
  label: string;
  color: 'green' | 'red' | 'yellow' | 'blue' | 'gray';
}) {
  const colorMap = {
    green: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400',
    red: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
    gray: 'bg-gray-100 dark:bg-white/[0.04] text-gray-700 dark:text-gray-300',
  };
  return (
    <div className={clsx('text-center p-3 rounded-xl', colorMap[color])}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs font-medium opacity-70 mt-0.5">{label}</p>
    </div>
  );
}

/** Glass-styled recharts tooltip */
function GlassTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="sa-glass-card bg-white/80 dark:bg-white/[0.06] rounded-lg border border-gray-200/60 dark:border-white/[0.08] px-3 py-2 text-xs shadow-lg">
      {label && <p className="font-medium text-gray-900 dark:text-white/90 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  // ── File Handling ──────────────────────────────────────────

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

  // ── Phase A: Analyze ──────────────────────────────────────

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

  // ── Phase B: Confirm ──────────────────────────────────────

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

  // ── Fix Management ────────────────────────────────────────

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

  // ── Category expand/collapse ──────────────────────────────

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // ── Grouped Fixes ─────────────────────────────────────────

  const groupedFixes = useMemo(() => {
    if (!analyzeResult) return {};
    const groups: Record<string, AIAutoFix[]> = {};
    for (const fix of analyzeResult.aiAnalysis.autoFixable) {
      const cat = fix.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(fix);
    }
    return groups;
  }, [analyzeResult]);

  // ── Fix Category Chart Data ───────────────────────────────

  const fixCategoryChartData = useMemo(() => {
    return Object.entries(groupedFixes).map(([cat, fixes]) => ({
      name: CATEGORY_LABELS[cat] || cat,
      count: fixes.length,
      fill: CATEGORY_COLORS[cat] || '#8b5cf6',
    }));
  }, [groupedFixes]);

  // ── Reset ─────────────────────────────────────────────────

  const handleReset = () => {
    setFile(null);
    setStage('idle');
    setError('');
    setAnalyzeResult(null);
    setConfirmResult(null);
    setAcceptedFixes(new Set());
    setExpandedCategories(new Set());
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── History ───────────────────────────────────────────────

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

  // ── Status Badge ──────────────────────────────────────────

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; dot: string }> = {
      COMPLETED: { bg: 'bg-green-100/80 dark:bg-green-500/15 text-green-700 dark:text-green-400', dot: 'bg-green-500' },
      PARTIAL: { bg: 'bg-yellow-100/80 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
      FAILED: { bg: 'bg-red-100/80 dark:bg-red-500/15 text-red-700 dark:text-red-400', dot: 'bg-red-500' },
      PROCESSING: { bg: 'bg-blue-100/80 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
      PREVIEW: { bg: 'bg-purple-100/80 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
    };
    const cfg = map[status] || map.PROCESSING;
    return (
      <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', cfg.bg)}>
        <span className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
        {status}
      </span>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* ─── Hero Banner ─────────────────────────────────────── */}
      <div className="sa-hero-banner rounded-2xl p-6 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10">
              <SparklesIcon className="h-6 w-6 text-primary-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Employee Upload</h1>
              <p className="text-sm text-gray-500 dark:text-white/50">
                AI-enhanced bulk onboarding with smart validation &amp; auto-corrections
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StageIndicator currentStage={stage} />
            <div className="flex gap-2 ml-2">
              {stage !== 'idle' && stage !== 'done' && (
                <button onClick={handleReset} className="btn btn-secondary btn-sm inline-flex items-center gap-1.5 text-xs">
                  <ArrowPathIcon className="h-3.5 w-3.5" />
                  Reset
                </button>
              )}
              <button onClick={() => excelUploadApi.downloadTemplate()} className="btn btn-secondary btn-sm inline-flex items-center gap-1.5 text-xs">
                <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                Template
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Error Banner ────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 sa-glass-card bg-red-50/70 dark:bg-red-500/[0.06] rounded-xl border border-red-200/60 dark:border-red-500/10 animate-fade-in-up">
          <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-500/15">
            <ExclamationTriangleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <span className="text-sm font-medium text-red-700 dark:text-red-400">{error}</span>
        </div>
      )}

      {/* ─── Upload Dropzone ─────────────────────────────────── */}
      {(stage === 'idle' || stage === 'done') && (
        <GlassCard delay={0.1}>
          <div
            className={clsx(
              'upload-dropzone relative p-10 text-center transition-all duration-300',
              dragActive && 'drag-active scale-[1.01]',
            )}
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

            {/* AI badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-5 rounded-full bg-primary-100/60 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 text-xs font-semibold">
              <CpuChipIcon className="h-3.5 w-3.5" />
              AI-Powered Upload
            </div>

            <div className="animate-float">
              <CloudArrowUpIcon className="mx-auto h-16 w-16 text-primary-400/60 dark:text-primary-500/40" />
            </div>

            <div className="mt-5">
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-primary-600 hover:text-primary-500 dark:text-primary-400 font-semibold text-base"
              >
                Choose a file
              </label>
              <span className="text-gray-500 dark:text-white/40"> or drag and drop</span>
            </div>

            <div className="mt-2 flex items-center justify-center gap-3 text-xs text-gray-400 dark:text-white/30">
              <span className="inline-flex items-center gap-1">
                <DocumentTextIcon className="h-3.5 w-3.5" />
                .xlsx
              </span>
              <span className="inline-flex items-center gap-1">
                <DocumentTextIcon className="h-3.5 w-3.5" />
                .xls
              </span>
              <span className="inline-flex items-center gap-1">
                <TableCellsIcon className="h-3.5 w-3.5" />
                .csv
              </span>
              <span className="text-gray-300 dark:text-white/20">|</span>
              <span>Max 10MB</span>
            </div>

            {/* File selected pill */}
            {file && (
              <div className="mt-5 inline-flex items-center gap-2.5 px-4 py-2.5 sa-glass-card bg-white/80 dark:bg-white/[0.04] rounded-xl border border-gray-200/60 dark:border-white/[0.08]">
                <TableCellsIcon className="h-5 w-5 text-primary-500" />
                <span className="text-sm font-medium text-gray-800 dark:text-white/80">{file.name}</span>
                <span className="text-xs text-gray-400 dark:text-white/30">({(file.size / 1024).toFixed(1)} KB)</span>
                <button
                  onClick={(e) => { e.preventDefault(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="ml-1 p-0.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <XCircleIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {file && (
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-200/40 dark:border-white/[0.04]">
              <button onClick={handleAnalyze} className="btn btn-primary inline-flex items-center gap-2">
                <SparklesIcon className="h-5 w-5" />
                Analyze with AI
              </button>
            </div>
          )}
        </GlassCard>
      )}

      {/* ─── Analyzing Progress ──────────────────────────────── */}
      {stage === 'analyzing' && (
        <GlassCard delay={0.1}>
          <div className="flex flex-col items-center gap-5 py-6">
            {/* Animated progress ring */}
            <div className="relative w-20 h-20">
              <svg className="w-full h-full animate-spin-slow" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="4"
                  className="text-gray-200/40 dark:text-white/[0.05]" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="4"
                  strokeLinecap="round" strokeDasharray="100 180"
                  className="text-primary-500" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <SparklesIcon className="h-7 w-7 text-primary-500 animate-pulse" />
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Analyzing Your Data</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-white/40">{progressMsg}</p>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-white/50">
              <div className="flex items-center gap-1.5">
                <CheckCircleIcon className="h-4.5 w-4.5 text-green-500" />
                <span>Parsing</span>
              </div>
              <div className="w-6 h-0.5 rounded-full bg-green-400/60" />
              <div className="flex items-center gap-1.5">
                <div className="animate-pulse h-4 w-4 rounded-full bg-primary-500" />
                <span>Validating</span>
              </div>
              <div className="w-6 h-0.5 rounded-full bg-gray-300 dark:bg-white/10" />
              <div className="flex items-center gap-1.5 text-gray-400 dark:text-white/25">
                <SparklesIcon className="h-4 w-4" />
                <span>AI Analysis</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 dark:text-white/25">
              Powered by 70-agent AI system
            </p>
          </div>
        </GlassCard>
      )}

      {/* ─── Preview Stage ───────────────────────────────────── */}
      {stage === 'preview' && analyzeResult && (
        <>
          {/* ── AI Analysis Panel ──────────────────────────── */}
          <GlassCard noPadding delay={0.1}>
            <div className="px-6 py-4 border-b border-gray-200/40 dark:border-white/[0.04]">
              <SectionHeader
                icon={SparklesIcon}
                title="AI Analysis"
                iconColor="bg-primary-100/60 dark:bg-primary-500/10"
                badge={
                  <span className="text-xs font-medium text-gray-400 dark:text-white/30 ml-2">
                    Upload #{analyzeResult.uploadId.substring(0, 8)}
                  </span>
                }
              />
            </div>

            <div className="p-6">
              {/* Score + Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 mb-6">
                {/* Quality Gauge */}
                <div className="flex flex-col items-center justify-center">
                  <QualityScoreGauge score={analyzeResult.aiAnalysis.qualityScore} />
                  <p className="text-xs font-medium text-gray-500 dark:text-white/40 mt-1">Quality Score</p>
                </div>

                {/* Stats + Mini Charts */}
                <div className="space-y-4">
                  {/* Stat pills */}
                  <div className="grid grid-cols-4 gap-3">
                    <StatPill value={analyzeResult.totalRows} label="Total Rows" color="gray" />
                    <StatPill value={analyzeResult.validation.validRowCount} label="Valid" color="green" />
                    <StatPill value={analyzeResult.validation.errors.length} label="Errors" color="red" />
                    <StatPill value={analyzeResult.validation.warnings.length} label="Warnings" color="yellow" />
                  </div>

                  {/* Category distribution chart */}
                  {fixCategoryChartData.length > 0 && (
                    <div className="p-3 rounded-xl bg-gray-50/50 dark:bg-white/[0.02]">
                      <p className="text-xs font-medium text-gray-500 dark:text-white/40 mb-2">Fix Categories</p>
                      <ResponsiveContainer width="100%" height={80}>
                        <BarChart data={fixCategoryChartData} layout="vertical" margin={{ left: 0, right: 10 }}>
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }}
                            className="fill-gray-500 dark:fill-white/40" />
                          <Tooltip content={<GlassTooltip />} />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={12}>
                            {fixCategoryChartData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} opacity={0.8} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Notes */}
              {analyzeResult.aiAnalysis.analysis.overallNotes && (
                <div className="mb-4 p-4 rounded-xl bg-primary-50/50 dark:bg-primary-500/[0.06] border-l-3 border-primary-500 flex items-start gap-3">
                  <InformationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5 text-primary-500" />
                  <span className="text-sm text-primary-800 dark:text-primary-300">{analyzeResult.aiAnalysis.analysis.overallNotes}</span>
                </div>
              )}

              {/* Risk Flags */}
              {analyzeResult.aiAnalysis.analysis.riskFlags.length > 0 && (
                <div className="mb-4 p-4 rounded-xl bg-red-50/50 dark:bg-red-500/[0.06] border-l-3 border-red-500">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Risk Flags</p>
                  <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                    {analyzeResult.aiAnalysis.analysis.riskFlags.map((flag, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Duplicate Clusters */}
              {analyzeResult.aiAnalysis.duplicateClusters.length > 0 && (
                <div className="p-4 rounded-xl bg-yellow-50/50 dark:bg-yellow-500/[0.06] border-l-3 border-yellow-500">
                  <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 mb-2">Potential Duplicates Found</p>
                  {analyzeResult.aiAnalysis.duplicateClusters.map((cluster, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400 mt-1.5">
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-500/15">
                        Rows {cluster.rows.join(', ')}
                      </span>
                      <span>{cluster.reason}</span>
                      <span className="text-xs opacity-60">({Math.round(cluster.confidence * 100)}%)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>

          {/* ── Fix Suggestions ─────────────────────────────── */}
          {(analyzeResult.aiAnalysis.autoFixable.length > 0 || analyzeResult.validation.suggestions.length > 0) && (
            <GlassCard noPadding delay={0.2}>
              <div className="px-6 py-4 border-b border-gray-200/40 dark:border-white/[0.04] flex items-center justify-between">
                <SectionHeader
                  icon={ShieldCheckIcon}
                  title={`Suggested Fixes (${analyzeResult.aiAnalysis.autoFixable.length + analyzeResult.validation.suggestions.length})`}
                  iconColor="bg-green-100/60 dark:bg-green-500/10"
                />
                <div className="flex items-center gap-3">
                  {analyzeResult.aiAnalysis.autoFixable.length > 0 && (
                    <>
                      <span className="text-xs text-gray-400 dark:text-white/30">
                        {acceptedFixes.size} / {analyzeResult.aiAnalysis.autoFixable.length} accepted
                      </span>
                      <button onClick={acceptAllHighConfidence} className="btn btn-secondary btn-sm text-xs inline-flex items-center gap-1.5">
                        <SparklesIcon className="h-3.5 w-3.5" />
                        Accept High Confidence
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {/* AI fixes grouped by category */}
                {Object.entries(groupedFixes).map(([cat, fixes]) => {
                  const isExpanded = expandedCategories.has(cat) || Object.keys(groupedFixes).length <= 2;
                  const acceptedInCategory = fixes.filter((f) => acceptedFixes.has(f.id)).length;
                  return (
                    <div key={cat}>
                      <button
                        onClick={() => toggleCategory(cat)}
                        className="w-full px-6 py-3 flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-white/70 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors border-b border-gray-100/40 dark:border-white/[0.03]"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[cat] || '#8b5cf6' }}
                        />
                        <span>{CATEGORY_LABELS[cat] || cat}</span>
                        <span className="text-xs text-gray-400 dark:text-white/30">
                          {acceptedInCategory}/{fixes.length}
                        </span>
                        <span className="ml-auto">
                          {isExpanded ? (
                            <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </span>
                      </button>
                      {isExpanded && fixes.map((fix) => (
                        <FixSuggestionRow key={fix.id} fix={fix} accepted={acceptedFixes.has(fix.id)} onToggle={() => toggleFix(fix.id)} />
                      ))}
                    </div>
                  );
                })}

                {/* Rule-based suggestions */}
                {analyzeResult.validation.suggestions.length > 0 && (
                  <>
                    <div className="px-6 py-3 flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-white/70 border-b border-gray-100/40 dark:border-white/[0.03]">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span>Auto-corrections</span>
                      <span className="text-xs text-gray-400 dark:text-white/30">{analyzeResult.validation.suggestions.length}</span>
                    </div>
                    {analyzeResult.validation.suggestions.map((sug, i) => (
                      <div key={`sug-${i}`} className="px-6 py-3 flex items-center gap-4 text-sm bg-green-50/30 dark:bg-green-500/[0.03] border-b border-gray-100/20 dark:border-white/[0.02]">
                        <CheckCircleIcon className="h-4.5 w-4.5 text-green-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-500 dark:text-white/40">Row {sug.row}, {sug.field}: </span>
                          <span className="line-through text-red-400">{sug.currentValue}</span>
                          <span className="mx-1.5 text-gray-400">{'\u2192'}</span>
                          <span className="font-medium text-green-600 dark:text-green-400">{sug.suggestedValue}</span>
                          <span className="ml-2 text-xs text-gray-400 dark:text-white/30">{sug.reason}</span>
                        </div>
                        <span className="text-2xs px-2 py-0.5 rounded-full bg-green-100/80 dark:bg-green-500/15 text-green-700 dark:text-green-400 font-semibold">
                          Auto
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Progress footer */}
              {analyzeResult.aiAnalysis.autoFixable.length > 0 && (
                <div className="px-6 py-3 border-t border-gray-200/40 dark:border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200/60 dark:bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-green-500 transition-all duration-500"
                        style={{ width: `${(acceptedFixes.size / analyzeResult.aiAnalysis.autoFixable.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-white/40 whitespace-nowrap">
                      {acceptedFixes.size} of {analyzeResult.aiAnalysis.autoFixable.length} fixes accepted
                    </span>
                  </div>
                </div>
              )}
            </GlassCard>
          )}

          {/* ── Errors Table ───────────────────────────────── */}
          {analyzeResult.validation.errors.length > 0 && (
            <GlassCard noPadding delay={0.3}>
              <div className="px-6 py-4 border-b border-gray-200/40 dark:border-white/[0.04]">
                <SectionHeader
                  icon={XCircleIcon}
                  title={`Validation Errors (${analyzeResult.validation.errors.length})`}
                  iconColor="bg-red-100/60 dark:bg-red-500/10"
                />
                <p className="text-xs text-gray-500 dark:text-white/40 -mt-4 ml-9">
                  These must be fixed in the source file before creating accounts
                </p>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50/50 dark:bg-white/[0.02] sticky top-0">
                    <tr>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider">Row</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider">Field</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyzeResult.validation.errors.map((err, i) => (
                      <tr
                        key={i}
                        className={clsx(
                          'text-gray-700 dark:text-white/70 border-b border-gray-100/40 dark:border-white/[0.03]',
                          i % 2 === 0 ? 'bg-white/40 dark:bg-white/[0.01]' : '',
                        )}
                      >
                        <td className="px-5 py-2.5 font-mono text-xs">{err.row || '\u2014'}</td>
                        <td className="px-5 py-2.5 font-medium">{err.field}</td>
                        <td className="px-5 py-2.5 text-red-600 dark:text-red-400">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {/* ── Warnings Table ─────────────────────────────── */}
          {analyzeResult.validation.warnings.length > 0 && (
            <GlassCard noPadding delay={0.35}>
              <div className="px-6 py-4 border-b border-gray-200/40 dark:border-white/[0.04]">
                <SectionHeader
                  icon={ExclamationTriangleIcon}
                  title={`Warnings (${analyzeResult.validation.warnings.length})`}
                  iconColor="bg-yellow-100/60 dark:bg-yellow-500/10"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50/50 dark:bg-white/[0.02] sticky top-0">
                    <tr>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider">Row</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider">Field</th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider">Warning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyzeResult.validation.warnings.map((w, i) => (
                      <tr
                        key={i}
                        className={clsx(
                          'text-gray-700 dark:text-white/70 border-b border-gray-100/40 dark:border-white/[0.03]',
                          i % 2 === 0 ? 'bg-white/40 dark:bg-white/[0.01]' : '',
                        )}
                      >
                        <td className="px-5 py-2.5 font-mono text-xs">{w.row}</td>
                        <td className="px-5 py-2.5 font-medium">{w.field}</td>
                        <td className="px-5 py-2.5 text-yellow-600 dark:text-yellow-400">{w.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {/* ── Data Preview Table ─────────────────────────── */}
          <GlassCard noPadding delay={0.4}>
            <div className="px-6 py-4 border-b border-gray-200/40 dark:border-white/[0.04]">
              <SectionHeader
                icon={TableCellsIcon}
                title={`Data Preview (${analyzeResult.totalRows} rows)`}
                iconColor="bg-blue-100/60 dark:bg-blue-500/10"
              />
            </div>
            <div className="overflow-x-auto max-h-80">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50/50 dark:bg-white/[0.02] sticky top-0">
                  <tr>
                    {['Row', 'First Name', 'Last Name', 'Email', 'Department', 'Level', 'Job Title', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analyzeResult.rows.map((row, i) => {
                    const rowNum = i + 3;
                    const hasError = analyzeResult.validation.errors.some((e) => e.row === rowNum);
                    const hasWarning = analyzeResult.validation.warnings.some((w) => w.row === rowNum);
                    return (
                      <tr
                        key={i}
                        className={clsx(
                          'text-gray-700 dark:text-white/70 border-b border-gray-100/40 dark:border-white/[0.03] transition-colors',
                          hasError
                            ? 'border-l-2 border-l-red-500 bg-red-50/30 dark:bg-red-500/[0.03]'
                            : hasWarning
                              ? 'border-l-2 border-l-yellow-500 bg-yellow-50/30 dark:bg-yellow-500/[0.03]'
                              : i % 2 === 0 ? 'bg-white/40 dark:bg-white/[0.01]' : '',
                        )}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{rowNum}</td>
                        <td className="px-4 py-2.5">{row.firstName}</td>
                        <td className="px-4 py-2.5">{row.lastName}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{row.email}</td>
                        <td className="px-4 py-2.5">{row.department || '\u2014'}</td>
                        <td className="px-4 py-2.5">{row.level ?? '\u2014'}</td>
                        <td className="px-4 py-2.5">{row.jobTitle || '\u2014'}</td>
                        <td className="px-4 py-2.5">
                          {hasError ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                          ) : hasWarning ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* ── Confirm Bar ────────────────────────────────── */}
          <GlassCard delay={0.45}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100/60 dark:bg-green-500/10">
                  <UserPlusIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-white/70">
                    {analyzeResult.validation.validRowCount} of {analyzeResult.totalRows} rows ready to create
                  </p>
                  {acceptedFixes.size > 0 && (
                    <p className="text-xs text-gray-400 dark:text-white/30">
                      {acceptedFixes.size} AI fix(es) will be applied
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleReset} className="btn btn-ghost text-sm">Cancel</button>
                <button
                  onClick={handleConfirm}
                  disabled={analyzeResult.validation.validRowCount === 0 || stage === 'confirming'}
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  <RocketLaunchIcon className="h-5 w-5" />
                  Create {analyzeResult.validation.validRowCount} Accounts
                </button>
              </div>
            </div>
          </GlassCard>
        </>
      )}

      {/* ─── Confirming State ────────────────────────────────── */}
      {stage === 'confirming' && (
        <GlassCard delay={0.1}>
          <div className="flex flex-col items-center gap-5 py-8">
            {/* Progress ring */}
            <div className="relative w-20 h-20">
              <svg className="w-full h-full animate-spin-slow" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="4"
                  className="text-gray-200/40 dark:text-white/[0.05]" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="4"
                  strokeLinecap="round" strokeDasharray="66 200"
                  className="text-green-500" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <UserPlusIcon className="h-7 w-7 text-green-500 animate-pulse" />
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Creating Accounts</h3>
              <p className="mt-1.5 text-sm text-gray-500 dark:text-white/40">
                Applying fixes and creating user accounts...
              </p>
            </div>

            {/* Status steps */}
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-white/50">
              <div className="flex items-center gap-1.5">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span>Applying fixes</span>
              </div>
              <div className="w-6 h-0.5 rounded-full bg-green-400/60" />
              <div className="flex items-center gap-1.5">
                <div className="animate-pulse h-3.5 w-3.5 rounded-full bg-primary-500" />
                <span>Creating accounts</span>
              </div>
              <div className="w-6 h-0.5 rounded-full bg-gray-300 dark:bg-white/10" />
              <div className="flex items-center gap-1.5 text-gray-400 dark:text-white/25">
                <EnvelopeIcon className="h-4 w-4" />
                <span>Welcome emails</span>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ─── Done / Results ──────────────────────────────────── */}
      {stage === 'done' && confirmResult && (
        <GlassCard noPadding delay={0.1}>
          {/* Success header bar */}
          <div className="px-6 py-4 border-b border-gray-200/40 dark:border-white/[0.04] bg-gradient-to-r from-green-50/60 to-transparent dark:from-green-500/[0.06] dark:to-transparent">
            <div className="flex items-center gap-3">
              <div className="animate-bounce-in">
                <div className="p-2 rounded-xl bg-green-100/80 dark:bg-green-500/15">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Complete</h3>
                <p className="text-xs text-gray-500 dark:text-white/40">
                  {confirmResult.status === 'COMPLETED' && confirmResult.errorCount === 0
                    ? 'All employees created successfully! Welcome emails sent.'
                    : `${confirmResult.successCount} accounts created with ${confirmResult.errorCount} error(s)`
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <StatPill value={confirmResult.totalRows} label="Total Rows" color="gray" />
              <StatPill value={confirmResult.successCount} label="Created" color="green" />
              <StatPill value={confirmResult.errorCount} label="Errors" color={confirmResult.errorCount > 0 ? 'red' : 'gray'} />
            </div>

            {/* Success message */}
            {confirmResult.status === 'COMPLETED' && confirmResult.errorCount === 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50/50 dark:bg-green-500/[0.06] text-green-700 dark:text-green-400 text-sm mb-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <EnvelopeIcon className="h-5 w-5 flex-shrink-0" />
                Welcome emails have been dispatched to all new employees.
              </div>
            )}

            {/* Errors if any */}
            {confirmResult.errors.length > 0 && (
              <div className="mt-4 max-h-40 overflow-y-auto rounded-xl border border-gray-200/40 dark:border-white/[0.06]">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50/50 dark:bg-white/[0.02] sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-white/40 uppercase">Row</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-white/40 uppercase">Field</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-white/40 uppercase">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {confirmResult.errors.map((err, i) => (
                      <tr key={i} className="text-gray-700 dark:text-white/70 border-b border-gray-100/40 dark:border-white/[0.03]">
                        <td className="px-4 py-2 font-mono text-xs">{err.row}</td>
                        <td className="px-4 py-2">{err.field}</td>
                        <td className="px-4 py-2 text-red-600 dark:text-red-400">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button onClick={handleReset} className="btn btn-primary inline-flex items-center gap-2">
                <ArrowUpTrayIcon className="h-5 w-5" />
                Upload Another File
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ─── Upload History ──────────────────────────────────── */}
      <GlassCard noPadding delay={stage === 'idle' ? 0.2 : 0.15}>
        <div className="px-6 py-4 border-b border-gray-200/40 dark:border-white/[0.04] flex items-center justify-between">
          <SectionHeader
            icon={ClockIcon}
            title="Upload History"
            iconColor="bg-blue-100/60 dark:bg-blue-500/10"
          />
          <button
            onClick={loadHistory}
            disabled={historyLoading}
            className="btn btn-secondary btn-sm inline-flex items-center gap-1.5 text-xs"
          >
            <ArrowPathIcon className={clsx('h-3.5 w-3.5', historyLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {!historyLoaded ? (
          <div className="p-8 flex flex-col items-center gap-3 text-gray-400 dark:text-white/30">
            <ArrowPathIcon className="h-6 w-6 animate-spin" />
            <span className="text-sm">Loading history...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="p-10 flex flex-col items-center gap-3 text-gray-400 dark:text-white/25">
            <ArrowUpTrayIcon className="h-10 w-10" />
            <p className="text-sm font-medium">No uploads yet</p>
            <p className="text-xs">Upload your first employee file to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50/50 dark:bg-white/[0.02]">
                <tr>
                  {['File', 'Status', 'Rows', 'Created', 'Errors', 'Uploaded By', 'Date'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((item, i) => (
                  <tr
                    key={item.id}
                    className={clsx(
                      'text-gray-700 dark:text-white/70 border-b border-gray-100/40 dark:border-white/[0.03] hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors',
                      i % 2 === 0 ? 'bg-white/30 dark:bg-white/[0.01]' : '',
                    )}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <TableCellsIcon className="h-4 w-4 text-gray-400 dark:text-white/30 flex-shrink-0" />
                        <span className="font-medium truncate max-w-[200px]">{item.fileName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">{statusBadge(item.status)}</td>
                    <td className="px-5 py-3 font-mono text-xs">{item.totalRows}</td>
                    <td className="px-5 py-3 text-green-600 dark:text-green-400 font-medium">{item.successCount}</td>
                    <td className="px-5 py-3 text-red-600 dark:text-red-400 font-medium">{item.errorCount}</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-white/40">{item.uploadedBy || '\u2014'}</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-white/40 text-xs">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ============================================================================
// Fix Suggestion Row Component
// ============================================================================

function FixSuggestionRow({ fix, accepted, onToggle }: { fix: AIAutoFix; accepted: boolean; onToggle: () => void }) {
  return (
    <div
      className={clsx(
        'px-6 py-3 flex items-center gap-4 text-sm border-b border-gray-100/30 dark:border-white/[0.02] transition-colors',
        accepted
          ? 'bg-green-50/40 dark:bg-green-500/[0.04] border-l-2 border-l-green-500'
          : 'hover:bg-gray-50/30 dark:hover:bg-white/[0.01] border-l-2 border-l-transparent',
      )}
    >
      <button
        onClick={onToggle}
        className={clsx(
          'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200',
          accepted
            ? 'bg-green-500 border-green-500 text-white scale-105'
            : 'border-gray-300 dark:border-white/20 hover:border-primary-500 hover:scale-105',
        )}
      >
        {accepted && <CheckCircleIcon className="h-3 w-3" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-500 dark:text-white/40">Row {fix.row}, {fix.field}: </span>
          <span className="line-through text-red-400">{fix.currentValue}</span>
          <span className="mx-1 text-gray-300 dark:text-white/20">{'\u2192'}</span>
          <span className="font-medium text-green-600 dark:text-green-400">{fix.suggestedValue}</span>
        </div>
        <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">{fix.issue}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={clsx(
            'text-2xs font-semibold px-2 py-0.5 rounded-full',
            fix.confidence >= 0.9
              ? 'bg-green-100/80 dark:bg-green-500/15 text-green-700 dark:text-green-400'
              : fix.confidence >= 0.7
                ? 'bg-yellow-100/80 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400'
                : 'bg-red-100/80 dark:bg-red-500/15 text-red-700 dark:text-red-400',
          )}
        >
          {Math.round(fix.confidence * 100)}%
        </span>
        <span className="text-2xs font-medium px-2 py-0.5 rounded-full bg-gray-100/80 dark:bg-white/[0.04] text-gray-500 dark:text-white/40">
          {CATEGORY_LABELS[fix.category] || fix.category}
        </span>
      </div>
    </div>
  );
}
