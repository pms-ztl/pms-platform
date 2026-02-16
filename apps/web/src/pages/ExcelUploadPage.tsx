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
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface UploadError {
  row: number;
  field: string;
  message: string;
}

interface UploadResult {
  id: string;
  fileName: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  status: string;
  errors: UploadError[];
  createdAt: string;
}

interface UploadHistoryItem {
  id: string;
  fileName: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  status: string;
  createdAt: string;
  uploadedBy?: { firstName: string; lastName: string };
}

export function ExcelUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
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
    setResult(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) validateAndSetFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/excel-upload/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      setResult(data.data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      // Refresh history after upload
      loadHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
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
    } catch (err: any) {
      setError(err.message || 'Failed to download template');
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/excel-upload/history`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      });
      const data = await response.json();
      if (data.success) {
        setHistory(data.data || []);
      }
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
      setHistoryLoaded(true);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; icon: any }> = {
      COMPLETED: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircleIcon },
      PARTIAL: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: ExclamationTriangleIcon },
      FAILED: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircleIcon },
      PROCESSING: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: ClockIcon },
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Employee Upload</h1>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Bulk onboard employees using an Excel or CSV file
          </p>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="btn btn-secondary inline-flex items-center gap-2"
        >
          <DocumentArrowDownIcon className="h-5 w-5" />
          Download Template
        </button>
      </div>

      {/* Upload area */}
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
          <label
            htmlFor="file-upload"
            className="cursor-pointer text-primary-600 hover:text-primary-500 dark:text-primary-400 font-medium"
          >
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
            <button
              onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              className="ml-2 text-secondary-400 hover:text-red-500"
            >
              <XCircleIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Upload button */}
      {file && (
        <div className="flex justify-end">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                Processing...
              </>
            ) : (
              <>
                <ArrowUpTrayIcon className="h-5 w-5" />
                Upload & Create Accounts
              </>
            )}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Upload Results</h3>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                <p className="text-2xl font-bold text-secondary-900 dark:text-white">{result.totalRows}</p>
                <p className="text-sm text-secondary-500">Total Rows</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.successCount}</p>
                <p className="text-sm text-secondary-500">Created</p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{result.errorCount}</p>
                <p className="text-sm text-secondary-500">Errors</p>
              </div>
            </div>

            {result.status === 'COMPLETED' && result.errorCount === 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
                <CheckCircleIcon className="h-5 w-5" />
                All employees were created successfully. Welcome emails have been sent.
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-secondary-900 dark:text-white mb-2">Row Errors</h4>
                <div className="max-h-60 overflow-y-auto border border-secondary-200 dark:border-secondary-700 rounded-lg">
                  <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700 text-sm">
                    <thead className="bg-secondary-50 dark:bg-secondary-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Row</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Field</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                      {result.errors.map((err, i) => (
                        <tr key={i} className="text-secondary-700 dark:text-secondary-300">
                          <td className="px-4 py-2 font-mono">{err.row}</td>
                          <td className="px-4 py-2">{err.field}</td>
                          <td className="px-4 py-2 text-red-600 dark:text-red-400">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload History */}
      <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Upload History</h3>
          <button
            onClick={loadHistory}
            disabled={historyLoading}
            className="btn btn-secondary btn-sm inline-flex items-center gap-1.5"
          >
            <ArrowPathIcon className={`h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} />
            {historyLoaded ? 'Refresh' : 'Load History'}
          </button>
        </div>

        {historyLoaded && (
          <div className="overflow-x-auto">
            {history.length === 0 ? (
              <div className="p-8 text-center text-secondary-500 dark:text-secondary-400">
                No uploads yet
              </div>
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
                      <td className="px-4 py-3">
                        {item.uploadedBy ? `${item.uploadedBy.firstName} ${item.uploadedBy.lastName}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-secondary-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
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
