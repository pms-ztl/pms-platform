import { useState, useRef, useEffect } from 'react';
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/solid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { NotificationGroup } from '@/components/notifications';
import clsx from 'clsx';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  readAt: string | null;
  createdAt: string;
  data?: any;
}

const SOUND_KEY = 'pms-notification-sound';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem(SOUND_KEY) !== 'false'; } catch { return true; }
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef<number>(0);
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list({ limit: 20 }),
    // Real-time updates via Socket.io invalidate this query automatically
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = Array.isArray(notifications)
    ? notifications.filter((n: Notification) => !n.readAt).length
    : 0;

  // Play sound when new unread notifications arrive
  useEffect(() => {
    if (soundEnabled && unreadCount > prevUnreadRef.current && prevUnreadRef.current >= 0) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } catch { /* audio not available */ }
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount, soundEnabled]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try { localStorage.setItem(SOUND_KEY, String(next)); } catch { /* noop */ }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-white hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-secondary-800">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[480px] overflow-hidden rounded-xl bg-white dark:bg-secondary-800 shadow-lg ring-1 ring-secondary-200 dark:ring-secondary-700 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-200 dark:border-secondary-700">
            <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSound}
                className="p-1 rounded text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
                title={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
              >
                {soundEnabled ? (
                  <SpeakerWaveIcon className="h-4 w-4" />
                ) : (
                  <SpeakerXMarkIcon className="h-4 w-4" />
                )}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium flex items-center gap-1"
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Grouped Notification List */}
          <div className="overflow-y-auto max-h-[380px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <NotificationGroup
                notifications={Array.isArray(notifications) ? notifications : []}
                onMarkRead={(id) => markReadMutation.mutate(id)}
                compact
              />
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800/50 flex items-center justify-between">
            <a
              href="/notifications"
              className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
              onClick={() => setIsOpen(false)}
            >
              View all notifications →
            </a>
            <a
              href="/settings"
              className="text-xs text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-300"
            >
              Settings
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
