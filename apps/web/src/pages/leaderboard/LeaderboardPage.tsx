import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrophyIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  AcademicCapIcon,
  HeartIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  HandRaisedIcon,
  SparklesIcon,
  FireIcon,
  BoltIcon,
} from '@heroicons/react/24/solid';
import {
  ChartBarIcon,
  FlagIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

// ─── Types ──────────────────────────────────────────────────────────────────

type Period = 'week' | 'month' | 'quarter' | 'year';
type LeaderboardTab = 'performance' | 'goals' | 'recognition' | 'learning';

interface LeaderboardUser {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  department: string | null;
}

interface PerformanceEntry {
  rank: number;
  user: LeaderboardUser;
  score: number;
  goalsCompleted: number;
  goalsTotal: number;
  reviewRating: number | null;
  trendUp: boolean | null;
}

interface GoalsEntry {
  rank: number;
  user: LeaderboardUser;
  score: number;
  goalsCompleted: number;
  goalsTotal: number;
  completionRate: number;
  avgProgress: number;
  onTimeRate: number;
}

interface RecognitionEntry {
  rank: number;
  user: LeaderboardUser;
  score: number;
  totalReceived: number;
  avgSentiment: number | null;
  praiseCount: number;
}

interface LearningEntry {
  rank: number;
  user: LeaderboardUser;
  score: number;
  plansTotal: number;
  plansCompleted: number;
  avgProgress: number;
  activitiesCompleted: number;
  activitiesTotal: number;
}

interface DepartmentScore {
  id: string;
  name: string;
  memberCount: number;
  avgScore: number;
}

interface MyStats {
  totalUsers: number;
  performance: { rank: number; score: number; percentile: number };
  goals: { rank: number; score: number; percentile: number };
  recognition: { rank: number; score: number; percentile: number };
  learning: { rank: number; score: number; percentile: number };
}

// Union type for any leaderboard entry (used in shared rendering logic)
type AnyEntry = PerformanceEntry | GoalsEntry | RecognitionEntry | LearningEntry;

// ─── Sub-Components ─────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-primary-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-violet-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ user, size = 'md' }: {
  user: { firstName: string; lastName: string; avatarUrl?: string };
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizeClasses = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg', xl: 'h-20 w-20 text-2xl' };
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white dark:ring-secondary-700`} />;
  }

  return (
    <div className={`${sizeClasses[size]} ${getAvatarColor(user.firstName + user.lastName)} rounded-full flex items-center justify-center text-white font-bold ring-2 ring-white dark:ring-secondary-700`}>
      {initials}
    </div>
  );
}

function RankChange({ change }: { change: number | null }) {
  if (change === null) {
    return <span className="inline-flex items-center gap-0.5 text-xs font-medium text-primary-500 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400 px-1.5 py-0.5 rounded-full">NEW</span>;
  }
  if (change === 0) {
    return <span className="text-xs text-secondary-400 dark:text-secondary-500 font-medium px-1.5">--</span>;
  }
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-success-600 dark:text-success-400">
        <ArrowTrendingUpIcon className="h-3.5 w-3.5" />+{change}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-danger-500 dark:text-danger-400">
      <ArrowTrendingDownIcon className="h-3.5 w-3.5" />{change}
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-white text-xs font-bold shadow-md">1</span>;
  if (rank === 2) return <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 text-white text-xs font-bold shadow-md">2</span>;
  if (rank === 3) return <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 text-white text-xs font-bold shadow-md">3</span>;
  return <span className="inline-flex items-center justify-center h-7 w-7 text-sm font-semibold text-secondary-500 dark:text-secondary-400">{rank}</span>;
}

function BadgeIcon({ badge, className = 'h-5 w-5' }: { badge: string; className?: string }) {
  const map: Record<string, typeof StarIcon> = {
    Leadership: StarIcon,
    Teamwork: HeartIcon,
    Innovation: LightBulbIcon,
    Performance: RocketLaunchIcon,
    Collaboration: HandRaisedIcon,
  };
  const colorMap: Record<string, string> = {
    Leadership: 'text-amber-500',
    Teamwork: 'text-rose-500',
    Innovation: 'text-violet-500',
    Performance: 'text-primary-500',
    Collaboration: 'text-emerald-500',
  };
  const Icon = map[badge] || SparklesIcon;
  return <Icon className={clsx(className, colorMap[badge] || 'text-secondary-400')} title={badge} />;
}

function AchievementIcon({ icon, className = 'h-5 w-5' }: { icon: string; className?: string }) {
  const map: Record<string, typeof StarIcon> = {
    star: StarIcon,
    flag: FlagIcon,
    heart: HeartIcon,
    fire: FireIcon,
    academic: AcademicCapIcon,
  };
  const Icon = map[icon] || SparklesIcon;
  return <Icon className={className} />;
}

// ─── Sparkline ──────────────────────────────────────────────────────────────

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 40;
  const width = 120;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={clsx('overflow-visible', className)} preserveAspectRatio="none">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} className="text-primary-500" />
      {data.map((v, i) => (
        <circle key={i} cx={i * step} cy={height - ((v - min) / range) * (height - 4)} r="2.5" className="fill-primary-500" />
      ))}
    </svg>
  );
}

// ─── Podium ─────────────────────────────────────────────────────────────────

function Podium({ entries }: { entries: AnyEntry[] }) {
  const top3 = entries.slice(0, 3);
  if (top3.length < 3) {
    if (top3.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-secondary-400 dark:text-secondary-500">
          <TrophyIcon className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm font-medium">No data available for this period</p>
          <p className="text-xs mt-1">Check back later or select a different time range</p>
        </div>
      );
    }
    return null;
  }

  const podiumOrder = [top3[1], top3[0], top3[2]];
  const heights = ['h-28', 'h-36', 'h-24'];
  const gradients = [
    'from-slate-200 via-slate-100 to-white dark:from-slate-600 dark:via-slate-700 dark:to-slate-800',
    'from-amber-200 via-amber-100 to-yellow-50 dark:from-amber-700 dark:via-amber-800 dark:to-amber-900',
    'from-orange-200 via-orange-100 to-orange-50 dark:from-orange-700 dark:via-orange-800 dark:to-orange-900',
  ];
  const ringColors = ['ring-slate-300 dark:ring-slate-500', 'ring-amber-400 dark:ring-amber-500', 'ring-orange-400 dark:ring-orange-500'];
  const labels = ['Silver', 'Gold', 'Bronze'];

  return (
    <div className="flex items-end justify-center gap-4 sm:gap-6 py-6">
      {podiumOrder.map((entry, idx) => (
        <div key={entry.user.id} className={clsx('flex flex-col items-center transition-all duration-500 animate-slide-up', idx === 1 && 'order-2', idx === 0 && 'order-1', idx === 2 && 'order-3')} style={{ animationDelay: `${idx * 150}ms` }}>
          <div className="relative mb-3">
            {idx === 1 && (
              <TrophyIcon className="absolute -top-5 left-1/2 -translate-x-1/2 h-8 w-8 text-amber-400 drop-shadow-lg animate-bounce-soft" />
            )}
            <div className={clsx('rounded-full p-1 ring-4', ringColors[idx])}>
              <Avatar user={entry.user} size={idx === 1 ? 'xl' : 'lg'} />
            </div>
            <span className={clsx(
              'absolute -bottom-1 -right-1 inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold text-white shadow-lg',
              idx === 0 && 'bg-gradient-to-br from-slate-400 to-slate-500',
              idx === 1 && 'bg-gradient-to-br from-amber-400 to-amber-600',
              idx === 2 && 'bg-gradient-to-br from-orange-400 to-orange-600',
            )}>{entry.rank}</span>
          </div>
          <p className="text-sm font-semibold text-secondary-900 dark:text-white text-center">{entry.user.firstName} {entry.user.lastName}</p>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 text-center">{entry.user.jobTitle}</p>
          <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-1">{entry.score.toFixed(1)}</p>
          <p className="text-[10px] text-secondary-400 dark:text-secondary-500 uppercase tracking-wider">{entry.user.department}</p>
          <div className={clsx('mt-2 w-24 sm:w-28 rounded-t-xl bg-gradient-to-b flex items-end justify-center', heights[idx], gradients[idx])}>
            <span className="text-xs font-bold text-secondary-500 dark:text-secondary-300 pb-2 uppercase tracking-wider">{labels[idx]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Department Bar Chart ───────────────────────────────────────────────────

function DepartmentChart({ departments }: { departments: DepartmentScore[] }) {
  if (departments.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-secondary-400 dark:text-secondary-500">
        <p className="text-sm">No department data available</p>
      </div>
    );
  }

  const maxScore = Math.max(...departments.map(d => d.avgScore));

  return (
    <div className="space-y-3">
      {departments.map((dept, i) => (
        <div key={dept.id} className="group flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
          <span className="w-24 sm:w-28 text-xs font-medium text-secondary-600 dark:text-secondary-400 text-right truncate">{dept.name}</span>
          <div className="flex-1 h-7 bg-secondary-100 dark:bg-secondary-800 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-400 dark:from-primary-600 dark:to-primary-400 rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2"
              style={{ width: `${maxScore > 0 ? (dept.avgScore / maxScore) * 100 : 0}%` }}
            >
              <span className="text-[10px] font-bold text-white">{dept.avgScore.toFixed(1)}</span>
            </div>
          </div>
          <span className="w-14 text-xs text-secondary-500 dark:text-secondary-400 text-right">{dept.memberCount} ppl</span>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ message = 'No data available' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-secondary-400 dark:text-secondary-500">
      <ChartBarIcon className="h-10 w-10 mb-3 opacity-40" />
      <p className="text-sm font-medium">{message}</p>
      <p className="text-xs mt-1">Try selecting a different time period</p>
    </div>
  );
}

// ─── Error State ────────────────────────────────────────────────────────────

function ErrorState({ message = 'Failed to load data' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-danger-400 dark:text-danger-500">
      <ChartBarIcon className="h-10 w-10 mb-3 opacity-40" />
      <p className="text-sm font-medium">{message}</p>
      <p className="text-xs mt-1 text-secondary-400">Please try again later</p>
    </div>
  );
}

// ─── Score Display Helper ───────────────────────────────────────────────────

function ScoreDisplay({ score }: { score: number }) {
  return (
    <>
      <span className={clsx(
        'text-sm font-bold',
        score >= 75 ? 'text-success-600 dark:text-success-400' : score >= 50 ? 'text-primary-600 dark:text-primary-400' : 'text-warning-600 dark:text-warning-400',
      )}>
        {score.toFixed(1)}
      </span>
      <span className="text-xs text-secondary-400"> / 100</span>
    </>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function LeaderboardPage() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<Period>('month');
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('performance');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ─── Data Queries ───────────────────────────────────────────────────────

  const { data: performanceEntries, isLoading: loadingPerformance, isError: errorPerformance } = useQuery({
    queryKey: ['leaderboard', 'performance', period],
    queryFn: () => api.get<PerformanceEntry[]>(`/leaderboard/performance?period=${period}`),
    staleTime: 60_000,
  });

  const { data: goalsEntries, isLoading: loadingGoals, isError: errorGoals } = useQuery({
    queryKey: ['leaderboard', 'goals', period],
    queryFn: () => api.get<GoalsEntry[]>(`/leaderboard/goals?period=${period}`),
    staleTime: 60_000,
  });

  const { data: recognitionEntries, isLoading: loadingRecognition, isError: errorRecognition } = useQuery({
    queryKey: ['leaderboard', 'recognition', period],
    queryFn: () => api.get<RecognitionEntry[]>(`/leaderboard/recognition?period=${period}`),
    staleTime: 60_000,
  });

  const { data: learningEntries, isLoading: loadingLearning, isError: errorLearning } = useQuery({
    queryKey: ['leaderboard', 'learning', period],
    queryFn: () => api.get<LearningEntry[]>(`/leaderboard/learning?period=${period}`),
    staleTime: 60_000,
  });

  const { data: departmentScores } = useQuery({
    queryKey: ['leaderboard', 'departments', period],
    queryFn: () => api.get<DepartmentScore[]>(`/leaderboard/departments?period=${period}`),
    staleTime: 60_000,
  });

  const { data: myStats } = useQuery({
    queryKey: ['leaderboard', 'my-stats', period],
    queryFn: () => api.get<MyStats>(`/leaderboard/my-stats?period=${period}`),
    staleTime: 60_000,
  });

  // ─── Active Tab Data ──────────────────────────────────────────────────

  const entriesMap: Record<LeaderboardTab, AnyEntry[] | undefined> = {
    performance: performanceEntries,
    goals: goalsEntries,
    recognition: recognitionEntries,
    learning: learningEntries,
  };

  const loadingMap: Record<LeaderboardTab, boolean> = {
    performance: loadingPerformance,
    goals: loadingGoals,
    recognition: loadingRecognition,
    learning: loadingLearning,
  };

  const errorMap: Record<LeaderboardTab, boolean> = {
    performance: errorPerformance,
    goals: errorGoals,
    recognition: errorRecognition,
    learning: errorLearning,
  };

  const entries = entriesMap[activeTab] || [];
  const isLoading = loadingMap[activeTab];
  const isError = errorMap[activeTab];

  const currentUserEntry = useMemo(
    () => entries.find(e => e.user.id === user?.id),
    [entries, user?.id],
  );

  const periods: { key: Period; label: string }[] = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'year', label: 'This Year' },
  ];

  const tabs: { key: LeaderboardTab; label: string; icon: typeof TrophyIcon }[] = [
    { key: 'performance', label: 'Performance', icon: ChartBarIcon },
    { key: 'goals', label: 'Goals', icon: FlagIcon },
    { key: 'recognition', label: 'Recognition', icon: SparklesIcon },
    { key: 'learning', label: 'Learning', icon: AcademicCapIcon },
  ];

  // ─── Row Renderers per Tab ────────────────────────────────────────────

  function renderPerformanceRow(entry: AnyEntry) {
    const e = entry as PerformanceEntry;
    return (
      <>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <RankBadge rank={e.rank} />
            <RankChange change={null} />
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <Avatar user={e.user} size="sm" />
            <div>
              <p className="text-sm font-medium text-secondary-900 dark:text-white">{e.user.firstName} {e.user.lastName}</p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">{e.user.jobTitle}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-secondary-600 dark:text-secondary-400">{e.user.department}</td>
        <td className="px-4 py-3">
          <ScoreDisplay score={e.score} />
        </td>
        <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">{e.goalsCompleted} / {e.goalsTotal}</td>
        <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">{e.reviewRating != null ? e.reviewRating.toFixed(1) : '--'}</td>
        <td className="px-4 py-3">
          {e.trendUp === true && <ArrowTrendingUpIcon className="h-5 w-5 text-success-500" />}
          {e.trendUp === false && <ArrowTrendingDownIcon className="h-5 w-5 text-danger-500" />}
          {e.trendUp === null && <span className="text-xs text-secondary-400">--</span>}
        </td>
      </>
    );
  }

  function renderGoalsRow(entry: AnyEntry) {
    const e = entry as GoalsEntry;
    return (
      <>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2"><RankBadge rank={e.rank} /><RankChange change={null} /></div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <Avatar user={e.user} size="sm" />
            <p className="text-sm font-medium text-secondary-900 dark:text-white">{e.user.firstName} {e.user.lastName}</p>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">{e.goalsCompleted} / {e.goalsTotal}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 max-w-[80px] h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${e.completionRate}%` }} />
            </div>
            <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">{e.completionRate.toFixed(0)}%</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 max-w-[60px] h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${e.avgProgress}%` }} />
            </div>
            <span className="text-sm text-secondary-700 dark:text-secondary-300">{e.avgProgress.toFixed(0)}%</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">{e.onTimeRate.toFixed(0)}%</td>
      </>
    );
  }

  function renderRecognitionRow(entry: AnyEntry) {
    const e = entry as RecognitionEntry;
    return (
      <>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2"><RankBadge rank={e.rank} /><RankChange change={null} /></div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <Avatar user={e.user} size="sm" />
            <p className="text-sm font-medium text-secondary-900 dark:text-white">{e.user.firstName} {e.user.lastName}</p>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{e.score.toFixed(1)}</span>
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-secondary-700 dark:text-secondary-300">{e.totalReceived}</td>
        <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">{e.praiseCount}</td>
        <td className="px-4 py-3 text-sm text-secondary-600 dark:text-secondary-400">
          {e.avgSentiment != null ? e.avgSentiment.toFixed(2) : '--'}
        </td>
      </>
    );
  }

  function renderLearningRow(entry: AnyEntry) {
    const e = entry as LearningEntry;
    return (
      <>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2"><RankBadge rank={e.rank} /><RankChange change={null} /></div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <Avatar user={e.user} size="sm" />
            <p className="text-sm font-medium text-secondary-900 dark:text-white">{e.user.firstName} {e.user.lastName}</p>
          </div>
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-secondary-700 dark:text-secondary-300">{e.plansCompleted} / {e.plansTotal}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 max-w-[60px] h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${e.avgProgress}%` }} />
            </div>
            <span className="text-sm text-secondary-700 dark:text-secondary-300">{e.avgProgress.toFixed(0)}%</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">{e.activitiesCompleted} / {e.activitiesTotal}</td>
        <td className="px-4 py-3">
          <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{e.score.toFixed(1)}</span>
        </td>
      </>
    );
  }

  const columnHeaders: Record<LeaderboardTab, string[]> = {
    performance: ['Rank', 'Employee', 'Department', 'Score', 'Goals', 'Review', 'Trend'],
    goals: ['Rank', 'Employee', 'Completed / Total', 'Completion Rate', 'Avg Progress', 'On-Time'],
    recognition: ['Rank', 'Employee', 'Score', 'Received', 'Praise', 'Avg Sentiment'],
    learning: ['Rank', 'Employee', 'Plans', 'Avg Progress', 'Activities', 'Score'],
  };

  const rowRenderers: Record<LeaderboardTab, (e: AnyEntry) => JSX.Element> = {
    performance: renderPerformanceRow,
    goals: renderGoalsRow,
    recognition: renderRecognitionRow,
    learning: renderLearningRow,
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-950 transition-colors duration-300">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-secondary-900 dark:text-white flex items-center gap-3">
              <TrophyIcon className="h-8 w-8 text-amber-500" />
              Leaderboards
            </h1>
            <p className="mt-1 text-secondary-500 dark:text-secondary-400">Celebrate top performers and track achievements</p>
          </div>
          <div className="flex rounded-lg bg-white dark:bg-secondary-800 shadow-sm border border-secondary-200 dark:border-secondary-700 p-1">
            {periods.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
                  period === p.key
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Podium */}
        <div className="bg-white dark:bg-secondary-900 rounded-2xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6 mb-8 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 via-transparent to-primary-50/50 dark:from-amber-900/10 dark:to-primary-900/10 pointer-events-none" />
          <Podium entries={entries} />
        </div>

        <div className="flex gap-6">
          {/* Main content */}
          <div className={clsx('transition-all duration-300', sidebarOpen ? 'flex-1 min-w-0' : 'w-full')}>

            {/* Tab navigation */}
            <div className="flex items-center gap-1 mb-4 bg-white dark:bg-secondary-900 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-1.5">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={clsx(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex-1 justify-center',
                      activeTab === tab.key
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-secondary-900 rounded-2xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-500 border-t-transparent" />
                </div>
              ) : isError ? (
                <ErrorState />
              ) : entries.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800/50">
                        {columnHeaders[activeTab].map(header => (
                          <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
                      {entries.map((entry, idx) => (
                        <tr
                          key={entry.user.id}
                          className={clsx(
                            'transition-all duration-300 hover:bg-secondary-50 dark:hover:bg-secondary-800/50',
                            entry.user.id === user?.id && 'bg-primary-50/60 dark:bg-primary-900/20 ring-1 ring-inset ring-primary-200 dark:ring-primary-800',
                          )}
                          style={{ animationDelay: `${idx * 30}ms` }}
                        >
                          {rowRenderers[activeTab](entry)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Department Comparison */}
            <div className="mt-8 bg-white dark:bg-secondary-900 rounded-2xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
              <div className="flex items-center gap-2 mb-5">
                <UserGroupIcon className="h-5 w-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Department Comparison</h2>
              </div>
              {departmentScores ? <DepartmentChart departments={departmentScores} /> : (
                <div className="flex items-center justify-center py-8 text-secondary-400">
                  <p className="text-sm">Loading department data...</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="hidden lg:flex items-center justify-center w-6 h-12 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg shadow-sm self-start mt-16 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <ChevronRightIcon className="h-4 w-4 text-secondary-500" /> : <ChevronLeftIcon className="h-4 w-4 text-secondary-500" />}
          </button>

          {/* My Stats Sidebar */}
          {sidebarOpen && (
            <aside className="hidden lg:block w-80 shrink-0 space-y-6 animate-slide-in">

              {/* Rank Card */}
              <div className="bg-white dark:bg-secondary-900 rounded-2xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-5">
                <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-4 flex items-center gap-2">
                  <BoltIcon className="h-4 w-4 text-primary-500" /> My Rankings
                </h3>
                {myStats ? (
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { label: 'Performance', rank: myStats.performance.rank, color: 'text-primary-500' },
                      { label: 'Goals', rank: myStats.goals.rank, color: 'text-success-500' },
                      { label: 'Recognition', rank: myStats.recognition.rank, color: 'text-amber-500' },
                      { label: 'Learning', rank: myStats.learning.rank, color: 'text-violet-500' },
                    ]).map(item => (
                      <div key={item.label} className="bg-secondary-50 dark:bg-secondary-800 rounded-xl p-3 text-center">
                        <p className={clsx('text-2xl font-bold', item.color)}>#{item.rank}</p>
                        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{item.label}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-4 text-secondary-400">
                    <p className="text-sm">Loading...</p>
                  </div>
                )}
              </div>

              {/* Scores & Percentiles */}
              <div className="bg-white dark:bg-secondary-900 rounded-2xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-5">
                <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-4">Scores & Percentiles</h3>
                {myStats ? (
                  <div className="space-y-4">
                    {([
                      { label: 'Performance', score: myStats.performance.score, percentile: myStats.performance.percentile, color: 'bg-primary-500' },
                      { label: 'Goals', score: myStats.goals.score, percentile: myStats.goals.percentile, color: 'bg-success-500' },
                      { label: 'Recognition', score: myStats.recognition.score, percentile: myStats.recognition.percentile, color: 'bg-amber-500' },
                      { label: 'Learning', score: myStats.learning.score, percentile: myStats.learning.percentile, color: 'bg-violet-500' },
                    ]).map(item => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-secondary-600 dark:text-secondary-400">{item.label}</span>
                          <span className="text-sm font-bold text-secondary-900 dark:text-white">{item.score.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                            <div className={clsx('h-full rounded-full transition-all duration-500', item.color)} style={{ width: `${item.percentile}%` }} />
                          </div>
                          <span className="text-xs font-medium text-secondary-500 dark:text-secondary-400 w-14 text-right">Top {(100 - item.percentile).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-secondary-200 dark:border-secondary-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-secondary-600 dark:text-secondary-400">Total Users</span>
                        <span className="text-lg font-bold text-primary-600 dark:text-primary-400">{myStats.totalUsers}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-4 text-secondary-400">
                    <p className="text-sm">Loading...</p>
                  </div>
                )}
              </div>

              {/* Current User Highlight */}
              {currentUserEntry && (
                <div className="bg-white dark:bg-secondary-900 rounded-2xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-5">
                  <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrophyIcon className="h-4 w-4 text-amber-500" /> Your Position
                  </h3>
                  <div className="flex items-center gap-3">
                    <Avatar user={currentUserEntry.user} size="lg" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-secondary-900 dark:text-white">{currentUserEntry.user.firstName} {currentUserEntry.user.lastName}</p>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400">{currentUserEntry.user.jobTitle}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-medium text-secondary-600 dark:text-secondary-400">
                          Rank <span className="text-lg font-bold text-primary-600 dark:text-primary-400">#{currentUserEntry.rank}</span>
                        </span>
                        <span className="text-xs font-medium text-secondary-600 dark:text-secondary-400">
                          Score <span className="text-lg font-bold text-primary-600 dark:text-primary-400">{currentUserEntry.score.toFixed(1)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
