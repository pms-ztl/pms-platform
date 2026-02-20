// ============================================================================
// Excel Upload API — Two-phase AI-enhanced upload flow
// ============================================================================

import { useAuthStore } from '@/store/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Types ──────────────────────────────────────────────────

export interface RowError {
  row: number;
  field: string;
  message: string;
}

export interface RowWarning {
  row: number;
  field: string;
  message: string;
  severity: 'info' | 'warning';
}

export interface RowSuggestion {
  row: number;
  field: string;
  currentValue: string;
  suggestedValue: string;
  reason: string;
}

export interface AIAutoFix {
  id: string;
  row: number;
  field: string;
  currentValue: string;
  suggestedValue: string;
  issue: string;
  confidence: number;
  category: string;
}

export interface AIReviewItem {
  row: number;
  field: string;
  issue: string;
  options: string[];
  severity: 'warning' | 'error';
}

export interface AIDuplicateCluster {
  rows: number[];
  reason: string;
  confidence: number;
}

export interface AIAnalysisResult {
  qualityScore: number;
  autoFixable: AIAutoFix[];
  reviewNeeded: AIReviewItem[];
  duplicateClusters: AIDuplicateCluster[];
  analysis: {
    levelDistribution: Array<{ level: number; count: number }>;
    departmentDistribution: Array<{ dept: string; count: number }>;
    overallNotes: string;
    riskFlags: string[];
  };
}

export interface ExcelRowData {
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber?: string;
  department?: string;
  level?: number;
  jobTitle?: string;
  managerEmail?: string;
  hireDate?: string;
  role?: string;
}

export interface AnalyzeResult {
  uploadId: string;
  totalRows: number;
  rows: ExcelRowData[];
  validation: {
    valid: boolean;
    errors: RowError[];
    warnings: RowWarning[];
    suggestions: RowSuggestion[];
    validRowCount: number;
  };
  aiAnalysis: AIAnalysisResult;
}

export interface ConfirmResult {
  uploadId: string;
  status: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: RowError[];
}

export interface UploadProgress {
  stage: 'parsing' | 'validating' | 'ai_analyzing' | 'complete' | 'error';
  progress: number;
  processed?: number;
  total?: number;
  message?: string;
}

export interface UploadHistoryItem {
  id: string;
  fileName: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  status: string;
  uploadedBy: string;
  createdAt: string;
}

// ── API Functions ──────────────────────────────────────────

export const excelUploadApi = {
  /**
   * Phase A: Analyze an uploaded file (parse + validate + AI analysis).
   * Returns preview data for user review.
   */
  async analyzeUpload(file: File): Promise<AnalyzeResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/excel-upload/analyze`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error?.message || json.message || 'Analysis failed');
    }
    return json.data;
  },

  /**
   * Phase B: Confirm an analyzed upload (apply fixes + create users).
   */
  async confirmUpload(uploadId: string, acceptedFixes: string[]): Promise<ConfirmResult> {
    const response = await fetch(`${API_BASE_URL}/excel-upload/${uploadId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ acceptedFixes }),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error?.message || json.message || 'Confirm failed');
    }
    return json.data;
  },

  /**
   * Subscribe to progress updates via SSE.
   * Returns an EventSource that emits UploadProgress events.
   */
  subscribeProgress(uploadId: string, onProgress: (p: UploadProgress) => void): () => void {
    const token = useAuthStore.getState().accessToken;
    const url = `${API_BASE_URL}/excel-upload/${uploadId}/progress`;

    // SSE doesn't support custom headers, so we'll use polling as fallback
    const es = new EventSource(url);
    es.onmessage = (event) => {
      try {
        const progress = JSON.parse(event.data) as UploadProgress;
        onProgress(progress);
        if (progress.stage === 'complete' || progress.stage === 'error') {
          es.close();
        }
      } catch { /* ignore parse errors */ }
    };
    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  },

  /**
   * Download the Excel template.
   */
  async downloadTemplate(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/excel-upload/template`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) throw new Error('Failed to download template');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee-upload-template.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Get upload history.
   */
  async getHistory(page?: number, limit?: number): Promise<{ data: UploadHistoryItem[]; total: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));

    const response = await fetch(`${API_BASE_URL}/excel-upload/history?${params}`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.error?.message || 'Failed to load history');
    return json.data;
  },

  /**
   * Get errors for a specific upload.
   */
  async getErrors(uploadId: string): Promise<{ id: string; fileName: string; status: string; errors: RowError[] }> {
    const response = await fetch(`${API_BASE_URL}/excel-upload/${uploadId}/errors`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.error?.message || 'Failed to load errors');
    return json.data;
  },
};
