interface LiveIndicatorProps {
  status: 'connected' | 'connecting' | 'disconnected';
  lastUpdated?: string | null;
  className?: string;
}

const STATUS_CONFIG = {
  connected: {
    label: 'Live',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    pulse: true,
  },
  connecting: {
    label: 'Connecting',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600 dark:text-amber-400',
    pulse: false,
  },
  disconnected: {
    label: 'Offline',
    dotClass: 'bg-slate-400',
    textClass: 'text-slate-500 dark:text-slate-400',
    pulse: false,
  },
} as const;

/**
 * Live connection status badge with pulsing green dot when connected.
 */
export default function LiveIndicator({ status, lastUpdated, className = '' }: LiveIndicatorProps) {
  const config = STATUS_CONFIG[status];

  const timeAgo = lastUpdated ? getTimeAgo(lastUpdated) : null;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span
            className={`absolute inset-0 rounded-full ${config.dotClass} opacity-75`}
            style={{ animation: 'livePulse 2s ease-in-out infinite' }}
          />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${config.dotClass}`} />
      </span>
      <span className={`text-2xs font-semibold ${config.textClass}`}>
        {config.label}
      </span>
      {timeAgo && status === 'connected' && (
        <span className="text-2xs text-slate-400 dark:text-slate-500">
          {timeAgo}
        </span>
      )}
    </div>
  );
}

function getTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return '';
}
