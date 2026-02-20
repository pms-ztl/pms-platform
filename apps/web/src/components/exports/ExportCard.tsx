import clsx from 'clsx';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface ExportCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  onExport: () => void;
  isExporting: boolean;
}

export function ExportCard({ title, description, icon: Icon, iconColor = 'text-blue-600 dark:text-blue-400', iconBg = 'bg-blue-100 dark:bg-blue-900/30', onExport, isExporting }: ExportCardProps) {
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-5 flex flex-col">
      <div className="flex items-start gap-4 mb-4">
        <div className={clsx('p-3 rounded-xl flex-shrink-0', iconBg)}>
          <Icon className={clsx('h-6 w-6', iconColor)} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">{title}</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="mt-auto">
        <button
          onClick={onExport}
          disabled={isExporting}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-600" />
              Exporting...
            </>
          ) : (
            <>
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export CSV
            </>
          )}
        </button>
      </div>
    </div>
  );
}
