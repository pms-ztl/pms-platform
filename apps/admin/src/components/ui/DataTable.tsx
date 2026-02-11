import { useState } from 'react';
import { ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { SkeletonTableRows } from './Skeleton';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render: (item: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: { label: string; onClick: () => void };
  keyExtractor: (item: T) => string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  className?: string;
}

export function DataTable<T>({
  columns, data, isLoading, emptyTitle = 'No data found', emptyDescription, emptyIcon, emptyAction,
  keyExtractor, pagination, onSort, className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDir(newDir);
    onSort?.(key, newDir);
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 0;

  return (
    <div className={clsx('rounded-xl border border-gray-200 bg-white overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500',
                    col.sortable && 'cursor-pointer select-none hover:text-gray-700 transition-colors',
                    col.className
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <SkeletonTableRows rows={5} cols={columns.length} />
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={keyExtractor(item)} className="hover:bg-gray-50 transition-colors duration-150">
                  {columns.map((col) => (
                    <td key={col.key} className={clsx('px-4 py-3 text-sm text-gray-700', col.className)}>
                      {col.render(item, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <p className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (pagination.page <= 3) pageNum = i + 1;
              else if (pagination.page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = pagination.page - 2 + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => pagination.onPageChange(pageNum)}
                  className={clsx(
                    'h-8 w-8 rounded-lg text-sm font-medium transition-colors',
                    pageNum === pagination.page ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
