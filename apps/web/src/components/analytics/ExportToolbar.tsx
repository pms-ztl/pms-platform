import { useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { analyticsApi } from '@/lib/api';

type ExportDataType = 'goals' | 'reviews' | 'feedback';

interface ExportToolbarProps {
  className?: string;
}

function ExportToolbar({ className = '' }: ExportToolbarProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (dataType: ExportDataType) => {
    setIsExporting(true);
    try {
      const response = await analyticsApi.exportData(dataType);
      // Create blob and trigger download
      const blob = new Blob([response as any], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataType}-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Data Exported Successfully`);
    } catch (err) {
      toast.error(`Failed to Export ${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Data`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-secondary-500 dark:text-secondary-400 font-medium">Export:</span>
      {(['goals', 'reviews', 'feedback'] as ExportDataType[]).map((type) => (
        <button
          key={type}
          onClick={() => handleExport(type)}
          disabled={isExporting}
          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-secondary-200/60 dark:border-white/[0.06] text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800 transition-colors disabled:opacity-50"
        >
          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </button>
      ))}
    </div>
  );
}

export default ExportToolbar;
