import { useState, useEffect } from 'react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import { MoodFaceIcon } from '@/components/ui/MoodFaceIcon';

// ── Types ────────────────────────────────────────────────────────────────────

interface CheckinEntry {
  id: string;
  date: string;
  mood: number;
  blocker: string;
  win: string;
}

// ── Mood options ──────────────────────────────────────────────────────────────

const moods = [
  { label: 'Struggling', value: 1 as const },
  { label: 'Stressed',   value: 2 as const },
  { label: 'Okay',       value: 3 as const },
  { label: 'Good',       value: 4 as const },
  { label: 'Great',      value: 5 as const },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStorageKey(userId: string) {
  return `pms-checkins-${userId}`;
}

function loadCheckins(userId: string): CheckinEntry[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCheckins(userId: string, entries: CheckinEntry[]) {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(entries.slice(0, 30)));
  } catch { /* quota exceeded */ }
}

function getWeekDays(): { label: string; date: string }[] {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label: ['M', 'T', 'W', 'T', 'F'][i],
      date: d.toISOString().split('T')[0],
    };
  });
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Main widget ──────────────────────────────────────────────────────────────

export function QuickCheckinWidget() {
  const { user } = useAuthStore();
  const userId = user?.id || 'anon';

  const [isExpanded, setIsExpanded] = useState(true);
  const [mood, setMood] = useState(0);
  const [blocker, setBlocker] = useState('');
  const [win, setWin] = useState('');
  const [entries, setEntries] = useState<CheckinEntry[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loaded = loadCheckins(userId);
    setEntries(loaded);
    // Check if already checked in today
    const today = new Date().toISOString().split('T')[0];
    if (loaded.some((e) => e.date.startsWith(today))) {
      setSubmitted(true);
    }
  }, [userId]);

  const handleSubmit = () => {
    if (mood === 0) {
      toast.error('Please select your mood');
      return;
    }
    const entry: CheckinEntry = {
      id: `ci-${Date.now()}`,
      date: new Date().toISOString(),
      mood,
      blocker: blocker.trim(),
      win: win.trim(),
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    saveCheckins(userId, updated);
    setMood(0);
    setBlocker('');
    setWin('');
    setSubmitted(true);
    toast.success('Check-in recorded!');
  };

  const weekDays = getWeekDays();
  const checkinDates = new Set(entries.map((e) => e.date.split('T')[0]));
  const lastCheckin = entries[0];

  return (
    <div className="rounded-2xl border border-secondary-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-primary-50/30 dark:hover:bg-white/[0.03]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            {submitted
              ? <CheckCircleIcon className="h-5 w-5 text-white" />
              : <ClipboardDocumentListIcon className="h-5 w-5 text-white" />}
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">Quick Check-in</h3>
            {lastCheckin && (
              <p className="text-2xs text-secondary-400">Last: {relativeTime(lastCheckin.date)}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Weekly streak */}
          <div className="flex items-center gap-1">
            {weekDays.map((day) => (
              <div
                key={day.date}
                className={clsx(
                  'w-5 h-5 rounded-full flex items-center justify-center text-3xs font-bold',
                  checkinDates.has(day.date)
                    ? 'bg-green-500 text-white'
                    : day.date === new Date().toISOString().split('T')[0]
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 ring-1 ring-primary-300'
                    : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-400'
                )}
              >
                {day.label}
              </div>
            ))}
          </div>
          {isExpanded ? <ChevronUpIcon className="h-4 w-4 text-secondary-400" /> : <ChevronDownIcon className="h-4 w-4 text-secondary-400" />}
        </div>
      </button>

      {/* Body */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-secondary-100 dark:border-secondary-700 pt-4">
          {submitted ? (
            <div className="flex flex-col items-center py-4 text-center">
              <CheckCircleIcon className="h-10 w-10 text-green-500 mb-2" />
              <p className="text-sm font-semibold text-secondary-900 dark:text-white">All checked in today!</p>
              <p className="text-xs text-secondary-400 mt-1">
                {lastCheckin && `You felt ${moods.find((m) => m.value === lastCheckin.mood)?.label || 'okay'}`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mood selector */}
              <div>
                <label className="text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-2 block">How are you feeling?</label>
                <div className="flex items-center justify-between gap-2">
                  {moods.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setMood(m.value)}
                      className={clsx(
                        'flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-1',
                        mood === m.value
                          ? 'bg-primary-50 dark:bg-primary-900/30 ring-2 ring-primary-500 scale-110'
                          : 'hover:bg-primary-50/30 dark:hover:bg-white/[0.03]/50'
                      )}
                    >
                      <MoodFaceIcon
                        score={m.value}
                        className="w-8 h-8 transition-transform duration-200 group-hover:scale-110"
                        selected={mood === m.value}
                      />
                      <span className="text-3xs font-medium text-secondary-500">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Blocker */}
              <div>
                <label className="text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1 block">Biggest blocker?</label>
                <input
                  type="text"
                  value={blocker}
                  onChange={(e) => setBlocker(e.target.value)}
                  placeholder="What's slowing you down..."
                  className="w-full text-xs rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              {/* Win */}
              <div>
                <label className="text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1 block">Win to share?</label>
                <input
                  type="text"
                  value={win}
                  onChange={(e) => setWin(e.target.value)}
                  placeholder="Something you're proud of..."
                  className="w-full text-xs rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
                Submit Check-in
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
