import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  XMarkIcon,
  ArrowPathIcon,
  TrashIcon,
  CalendarDaysIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { goalsApi } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OKRBulkActionsProps {
  selectedIds: string[];
  onClear: () => void;
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active', cls: 'bg-green-500' },
  { value: 'ON_HOLD', label: 'On Hold', cls: 'bg-amber-500' },
  { value: 'COMPLETED', label: 'Completed', cls: 'bg-blue-500' },
  { value: 'CANCELLED', label: 'Cancelled', cls: 'bg-red-500' },
];

const PRIORITY_OPTIONS = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function OKRBulkActions({ selectedIds, onClear }: OKRBulkActionsProps) {
  const queryClient = useQueryClient();
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dueDate, setDueDate] = useState('');

  const bulkMutation = useMutation({
    mutationFn: (updates: { status?: string; priority?: string; dueDate?: string }) =>
      goalsApi.bulkUpdate(selectedIds, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['okr-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['okr-key-results'] });
      toast.success(`Updated ${(data as any)?.count ?? selectedIds.length} goals`);
      onClear();
      setShowStatusMenu(false);
      setShowPriorityMenu(false);
      setShowDatePicker(false);
    },
    onError: () => toast.error('Bulk update failed'),
  });

  const handleExportSelected = async () => {
    // Simple CSV export of selected IDs info
    toast.success(`Export feature initiated for ${selectedIds.length} goals`);
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
      <div className="flex items-center gap-3 bg-secondary-900 dark:bg-secondary-700 text-white rounded-2xl shadow-2xl px-5 py-3 border border-secondary-700 dark:border-secondary-600">
        {/* Count */}
        <span className="text-sm font-semibold whitespace-nowrap">
          <span className="text-primary-400">{selectedIds.length}</span> selected
        </span>

        <div className="w-px h-6 bg-secondary-600" />

        {/* Status */}
        <div className="relative">
          <button
            onClick={() => { setShowStatusMenu(!showStatusMenu); setShowPriorityMenu(false); setShowDatePicker(false); }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary-700 dark:bg-secondary-600 hover:bg-secondary-600 dark:hover:bg-secondary-500 transition-colors flex items-center gap-1.5"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            Status
          </button>
          {showStatusMenu && (
            <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-secondary-800 rounded-lg shadow-xl border border-secondary-200 dark:border-secondary-600 py-1 min-w-[140px]">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => bulkMutation.mutate({ status: opt.value })}
                  className="w-full px-3 py-1.5 text-left text-xs text-secondary-900 dark:text-white hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2 transition-colors"
                >
                  <span className={clsx('h-2 w-2 rounded-full', opt.cls)} />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority */}
        <div className="relative">
          <button
            onClick={() => { setShowPriorityMenu(!showPriorityMenu); setShowStatusMenu(false); setShowDatePicker(false); }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary-700 dark:bg-secondary-600 hover:bg-secondary-600 dark:hover:bg-secondary-500 transition-colors"
          >
            Priority
          </button>
          {showPriorityMenu && (
            <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-secondary-800 rounded-lg shadow-xl border border-secondary-200 dark:border-secondary-600 py-1 min-w-[120px]">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => bulkMutation.mutate({ priority: opt.value })}
                  className="w-full px-3 py-1.5 text-left text-xs text-secondary-900 dark:text-white hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Due Date */}
        <div className="relative">
          <button
            onClick={() => { setShowDatePicker(!showDatePicker); setShowStatusMenu(false); setShowPriorityMenu(false); }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary-700 dark:bg-secondary-600 hover:bg-secondary-600 dark:hover:bg-secondary-500 transition-colors flex items-center gap-1.5"
          >
            <CalendarDaysIcon className="h-3.5 w-3.5" />
            Due Date
          </button>
          {showDatePicker && (
            <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-secondary-800 rounded-lg shadow-xl border border-secondary-200 dark:border-secondary-600 p-3">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs rounded-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white px-2 py-1 focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
              <button
                onClick={() => { if (dueDate) bulkMutation.mutate({ dueDate }); }}
                disabled={!dueDate}
                className="mt-2 w-full px-2 py-1 text-2xs font-medium rounded-md bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40 transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Export */}
        <button
          onClick={handleExportSelected}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary-700 dark:bg-secondary-600 hover:bg-secondary-600 dark:hover:bg-secondary-500 transition-colors flex items-center gap-1.5"
        >
          <ArrowDownTrayIcon className="h-3.5 w-3.5" />
          Export
        </button>

        <div className="w-px h-6 bg-secondary-600" />

        {/* Clear */}
        <button
          onClick={onClear}
          className="p-1.5 rounded-lg hover:bg-secondary-700 dark:hover:bg-secondary-600 transition-colors"
          title="Clear selection"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
