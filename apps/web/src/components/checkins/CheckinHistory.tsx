import { useState, useEffect } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useAuthStore } from '@/store/auth';

// ── Types ────────────────────────────────────────────────────────────────────

interface CheckinEntry {
  id: string;
  date: string;
  mood: number;
  blocker: string;
  win: string;
}

// ── Mood emojis ──────────────────────────────────────────────────────────────

const moodEmojis: Record<number, string> = {
  1: '\uD83D\uDE1E',
  2: '\uD83D\uDE15',
  3: '\uD83D\uDE10',
  4: '\uD83D\uDE0A',
  5: '\uD83D\uDE04',
};

const moodLabels: Record<number, string> = {
  1: 'Struggling',
  2: 'Stressed',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadCheckins(userId: string): CheckinEntry[] {
  try {
    const raw = localStorage.getItem(`pms-checkins-${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ── Mood trend chart (simple bar) ────────────────────────────────────────────

function MoodTrend({ entries }: { entries: CheckinEntry[] }) {
  const last7 = entries.slice(0, 7).reverse();
  if (last7.length < 2) return null;

  return (
    <div className="mb-5">
      <h4 className="text-[10px] font-semibold text-secondary-400 uppercase tracking-wider mb-2">Mood Trend (Last 7)</h4>
      <div className="flex items-end gap-1.5 h-16">
        {last7.map((entry) => {
          const pct = (entry.mood / 5) * 100;
          const colors = ['', 'bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-400'];
          return (
            <div key={entry.id} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={clsx('w-full rounded-t-md transition-all', colors[entry.mood])}
                style={{ height: `${pct}%` }}
                title={`${moodLabels[entry.mood]} - ${formatDate(entry.date)}`}
              />
              <span className="text-[8px] text-secondary-400">{moodEmojis[entry.mood]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Timeline entry ───────────────────────────────────────────────────────────

function TimelineEntry({ entry }: { entry: CheckinEntry }) {
  return (
    <div className="flex gap-3 py-3">
      {/* Mood icon */}
      <div className="flex flex-col items-center">
        <span className="text-xl">{moodEmojis[entry.mood] || '\uD83D\uDE10'}</span>
        <div className="flex-1 w-px bg-secondary-200 dark:bg-secondary-700 mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-secondary-900 dark:text-white">
            {moodLabels[entry.mood] || 'Check-in'}
          </span>
          <span className="text-[10px] text-secondary-400 flex items-center gap-0.5">
            <ClockIcon className="h-3 w-3" />
            {formatDate(entry.date)} at {formatTime(entry.date)}
          </span>
        </div>

        {entry.blocker && (
          <div className="mb-1.5">
            <span className="text-[9px] font-semibold text-red-500 uppercase tracking-wider">Blocker: </span>
            <span className="text-xs text-secondary-600 dark:text-secondary-400">{entry.blocker}</span>
          </div>
        )}

        {entry.win && (
          <div>
            <span className="text-[9px] font-semibold text-green-500 uppercase tracking-wider">Win: </span>
            <span className="text-xs text-secondary-600 dark:text-secondary-400">{entry.win}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface CheckinHistoryProps {
  maxItems?: number;
}

export function CheckinHistory({ maxItems = 10 }: CheckinHistoryProps) {
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<CheckinEntry[]>([]);

  useEffect(() => {
    if (user?.id) {
      setEntries(loadCheckins(user.id));
    }
  }, [user?.id]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-xs text-secondary-400 italic">No check-ins yet. Start your first check-in!</p>
      </div>
    );
  }

  const displayItems = entries.slice(0, maxItems);

  return (
    <div>
      <h3 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-3">
        Check-in History
      </h3>

      <MoodTrend entries={entries} />

      <div className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
        {displayItems.map((entry) => (
          <TimelineEntry key={entry.id} entry={entry} />
        ))}
      </div>

      {entries.length > maxItems && (
        <p className="text-[10px] text-secondary-400 text-center mt-2">
          Showing {maxItems} of {entries.length} check-ins
        </p>
      )}
    </div>
  );
}
