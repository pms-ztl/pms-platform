import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import { Modal } from '@/components/ui';
import { goalsApi, type Goal } from '@/lib/api';

interface OKRCheckinModalProps {
  open: boolean;
  onClose: () => void;
  keyResult: Goal | null;
  onSuccess?: () => void;
}

const CONFIDENCE_OPTIONS = [
  { value: 'on_track', label: 'On Track', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-300 dark:border-green-700' },
  { value: 'at_risk', label: 'At Risk', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700' },
  { value: 'off_track', label: 'Off Track', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300 dark:border-red-700' },
] as const;

export function OKRCheckinModal({ open, onClose, keyResult, onSuccess }: OKRCheckinModalProps) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(keyResult?.progress ?? 0);
  const [confidence, setConfidence] = useState('on_track');
  const [note, setNote] = useState('');

  // Reset form when keyResult changes
  const krId = keyResult?.id;
  useState(() => {
    setProgress(keyResult?.progress ?? 0);
    setConfidence('on_track');
    setNote('');
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!keyResult) throw new Error('No key result selected');
      const fullNote = `[${confidence.replace('_', ' ').toUpperCase()}] ${note}`.trim();
      return goalsApi.updateProgress(keyResult.id, progress, fullNote || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['okr-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['okr-key-results'] });
      queryClient.invalidateQueries({ queryKey: ['okr-tree'] });
      toast.success('Check-in saved');
      onSuccess?.();
      onClose();
    },
    onError: () => {
      toast.error('Failed to save check-in');
    },
  });

  if (!keyResult) return null;

  return (
    <Modal open={open} onClose={onClose} title="OKR Check-in" size="sm">
      <div className="space-y-5">
        {/* Key Result Title */}
        <div>
          <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 tracking-wider">
            Key Result
          </p>
          <p className="text-sm font-semibold text-secondary-900 dark:text-white mt-1">
            {keyResult.title}
          </p>
        </div>

        {/* Progress */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
            Progress
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="flex-1 h-2 bg-secondary-200 dark:bg-secondary-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Math.max(0, Math.min(100, Number(e.target.value))))}
                className="w-16 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white px-2 py-1 text-sm text-center"
              />
              <span className="text-sm text-secondary-500">%</span>
            </div>
          </div>
          <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
            Previous: {Math.round(keyResult.progress)}%
          </p>
        </div>

        {/* Confidence */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
            Confidence
          </label>
          <div className="flex gap-2">
            {CONFIDENCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setConfidence(opt.value)}
                className={clsx(
                  'flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-all',
                  confidence === opt.value
                    ? opt.color
                    : 'border-secondary-200/60 dark:border-white/[0.06] text-secondary-500 dark:text-secondary-400 hover:bg-primary-50/30 dark:hover:bg-white/[0.03]'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Notes <span className="text-secondary-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="What progress have you made? Any blockers?"
            className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-secondary-400"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-primary-50/30 dark:hover:bg-white/[0.03] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? 'Saving...' : 'Save Check-in'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
