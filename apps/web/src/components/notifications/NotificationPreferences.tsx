import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import { notificationsApi } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';

interface ToggleProps {
  label: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, enabled, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-secondary-700 dark:text-secondary-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={clsx(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
          enabled ? 'bg-primary-600' : 'bg-secondary-300 dark:bg-secondary-600'
        )}
      >
        <span
          className={clsx(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200',
            enabled ? 'translate-x-[22px]' : 'translate-x-[2px]',
            'mt-[2px]'
          )}
        />
      </button>
    </div>
  );
}

export function NotificationPreferences({ className }: { className?: string }) {
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationsApi.getPreferences(),
    staleTime: 120_000,
  });

  const [local, setLocal] = useState({
    emailEnabled: true,
    pushEnabled: false,
    inAppEnabled: true,
    feedbackNotifications: true,
    reviewNotifications: true,
    goalNotifications: true,
    systemNotifications: true,
  });

  useEffect(() => {
    if (prefs) {
      setLocal({
        emailEnabled: prefs.emailEnabled ?? true,
        pushEnabled: prefs.pushEnabled ?? false,
        inAppEnabled: prefs.inAppEnabled ?? true,
        feedbackNotifications: prefs.feedbackNotifications ?? true,
        reviewNotifications: prefs.reviewNotifications ?? true,
        goalNotifications: prefs.goalNotifications ?? true,
        systemNotifications: prefs.systemNotifications ?? true,
      });
    }
  }, [prefs]);

  const mutation = useMutation({
    mutationFn: (data: typeof local) => notificationsApi.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast.success('Preferences updated');
    },
    onError: () => toast.error('Failed to update preferences'),
  });

  const debouncedLocal = useDebounce(local, 600);

  useEffect(() => {
    if (prefs && JSON.stringify(debouncedLocal) !== JSON.stringify({
      emailEnabled: prefs.emailEnabled ?? true,
      pushEnabled: prefs.pushEnabled ?? false,
      inAppEnabled: prefs.inAppEnabled ?? true,
      feedbackNotifications: prefs.feedbackNotifications ?? true,
      reviewNotifications: prefs.reviewNotifications ?? true,
      goalNotifications: prefs.goalNotifications ?? true,
      systemNotifications: prefs.systemNotifications ?? true,
    })) {
      mutation.mutate(debouncedLocal);
    }
  }, [debouncedLocal]);

  const update = useCallback((key: keyof typeof local, val: boolean) => {
    setLocal((prev) => ({ ...prev, [key]: val }));
  }, []);

  if (isLoading) {
    return (
      <div className={clsx('bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl border border-secondary-200/60 dark:border-white/[0.06] p-6 animate-pulse', className)}>
        <div className="h-4 w-40 bg-secondary-200 dark:bg-secondary-700 rounded mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 bg-secondary-100 dark:bg-secondary-900/50 rounded mb-2" />
        ))}
      </div>
    );
  }

  return (
    <div className={clsx('bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl border border-secondary-200/60 dark:border-white/[0.06] p-6', className)}>
      <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">
        Notification Preferences
      </h3>

      {/* Channels */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-2">Channels</p>
        <div className="divide-y divide-secondary-100 dark:divide-secondary-700">
          <Toggle label="Email" enabled={local.emailEnabled} onChange={(v) => update('emailEnabled', v)} />
          <Toggle label="Push" enabled={local.pushEnabled} onChange={(v) => update('pushEnabled', v)} />
          <Toggle label="In-App" enabled={local.inAppEnabled} onChange={(v) => update('inAppEnabled', v)} />
        </div>
      </div>

      {/* Notification Types */}
      <div>
        <p className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-2">Notification Types</p>
        <div className="divide-y divide-secondary-100 dark:divide-secondary-700">
          <Toggle label="Feedback" enabled={local.feedbackNotifications} onChange={(v) => update('feedbackNotifications', v)} />
          <Toggle label="Reviews" enabled={local.reviewNotifications} onChange={(v) => update('reviewNotifications', v)} />
          <Toggle label="Goals" enabled={local.goalNotifications} onChange={(v) => update('goalNotifications', v)} />
          <Toggle label="System" enabled={local.systemNotifications} onChange={(v) => update('systemNotifications', v)} />
        </div>
      </div>
    </div>
  );
}
