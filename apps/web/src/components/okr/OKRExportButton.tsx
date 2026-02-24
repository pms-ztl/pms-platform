import { useState, useRef, useEffect } from 'react';
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { goalsApi } from '@/lib/api';

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface OKRExportButtonProps {
  filterType?: string;
  filterStatus?: string;
}

export function OKRExportButton({ filterType, filterStatus }: OKRExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleExport = async (scope: 'all' | 'filtered') => {
    setExporting(true);
    try {
      const params: { type?: string; status?: string } = {};
      if (scope === 'filtered') {
        if (filterType && filterType !== 'all') params.type = filterType;
        if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
      }

      const csvData = await goalsApi.exportGoals(params);

      // Create downloadable file
      const blob = new Blob([csvData as unknown as string], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `goals-export-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Goals exported successfully');
      setOpen(false);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-200 hover:bg-primary-50/30 dark:hover:bg-white/[0.03] transition-colors shadow-sm"
      >
        <ArrowDownTrayIcon className="h-3.5 w-3.5" />
        Export
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-lg shadow-xl border border-secondary-200 dark:border-secondary-600 py-1 min-w-[180px] z-50">
          <button
            onClick={() => handleExport('all')}
            disabled={exporting}
            className="w-full px-3 py-2 text-left text-xs text-secondary-900 dark:text-white hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2 transition-colors"
          >
            <DocumentTextIcon className="h-4 w-4 text-secondary-400" />
            Export All (CSV)
          </button>
          <button
            onClick={() => handleExport('filtered')}
            disabled={exporting}
            className="w-full px-3 py-2 text-left text-xs text-secondary-900 dark:text-white hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2 transition-colors"
          >
            <DocumentTextIcon className="h-4 w-4 text-secondary-400" />
            Export Filtered (CSV)
          </button>
        </div>
      )}
    </div>
  );
}
