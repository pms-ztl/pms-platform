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

interface LeaderboardEntry {
  id: string;
  rank: number;
  rankChange: number | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    jobTitle?: string;
    department?: string;
  };
  score: number;
  goalsCompleted?: number;
  goalsTotal?: number;
  reviewRating?: number;
  trendUp?: boolean;
  completionRate?: number;
  onTimeRate?: number;
  streak?: number;
  kudosReceived?: number;
  badges?: string[];
  pointsTotal?: number;
  topCategory?: string;
  coursesCompleted?: number;
  hoursInvested?: number;
  skillsAcquired?: number;
  certifications?: number;
}

interface DepartmentScore {
  id: string;
  name: string;
  memberCount: number;
  avgScore: number;
}

interface Achievement {
  id: string;
  title: string;
  icon: string;
  unlockedAt: string;
}

interface MyStats {
  performanceRank: number;
  goalsRank: number;
  recognitionRank: number;
  learningRank: number;
  totalPoints: number;
  badges: string[];
  currentStreak: number;
  progressHistory: number[];
  achievements: Achievement[];
}

// ─── Mock Data Generators ───────────────────────────────────────────────────

const DEPARTMENTS = ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'];
const TITLES = ['Software Engineer', 'Product Manager', 'Designer', 'Data Analyst', 'Team Lead', 'Director', 'Specialist', 'Coordinator'];
const BADGE_TYPES = ['Leadership', 'Teamwork', 'Innovation', 'Performance', 'Collaboration'];

function generateMockEntries(tab: LeaderboardTab, count = 25): LeaderboardEntry[] {
  const names = [
    ['Sarah', 'Chen'], ['James', 'Wilson'], ['Maria', 'Garcia'], ['David', 'Kim'],
    ['Emma', 'Patel'], ['Michael', 'Brown'], ['Aisha', 'Rahman'], ['Lucas', 'Martinez'],
    ['Priya', 'Sharma'], ['Oliver', 'Taylor'], ['Sofia', 'Andersen'], ['Noah', 'Williams'],
    ['Isabella', 'Lee'], ['Ethan', 'Johnson'], ['Ava', 'Thompson'], ['Liam', 'Davis'],
    ['Mia', 'Clark'], ['Benjamin', 'Rodriguez'], ['Charlotte', 'Lopez'], ['William', 'Hall'],
    ['Amelia', 'Young'], ['Mason', 'Allen'], ['Harper', 'King'], ['Elijah', 'Wright'],
    ['Evelyn', 'Scott'],
  ];

  return names.slice(0, count).map((name, i) => {
    const baseScore = Math.max(1.5, 5.0 - i * 0.12 + (Math.random() * 0.3 - 0.15));
    const changes = [3, -1, 2, null, -2, 1, 0, -3, 5, 0, 1, -1, 2, null, 0, -2, 3, 1, -1, 0, 2, -1, 0, 1, -2];
    return {
      id: `user-${i + 1}`,
      rank: i + 1,
      rankChange: changes[i] ?? null,
      user: {
        id: `user-${i + 1}`,
        firstName: name[0],
        lastName: name[1],
        jobTitle: TITLES[i % TITLES.length],
        department: DEPARTMENTS[i % DEPARTMENTS.length],
      },
      score: Math.round(baseScore * 100) / 100,
      goalsCompleted: Math.floor(Math.random() * 12) + 3,
      goalsTotal: Math.floor(Math.random() * 5) + 12,
      reviewRating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      trendUp: Math.random() > 0.35,
      completionRate: Math.round(65 + Math.random() * 35),
      onTimeRate: Math.round(70 + Math.random() * 30),
      streak: Math.floor(Math.random() * 8) + 1,
      kudosReceived: Math.floor(Math.random() * 50) + 5,
      badges: BADGE_TYPES.slice(0, Math.floor(Math.random() * 4) + 1),
      pointsTotal: Math.floor(Math.random() * 2000) + 500,
      topCategory: BADGE_TYPES[Math.floor(Math.random() * BADGE_TYPES.length)],
      coursesCompleted: Math.floor(Math.random() * 15) + 1,
      hoursInvested: Math.floor(Math.random() * 120) + 10,
      skillsAcquired: Math.floor(Math.random() * 8) + 1,
      certifications: Math.floor(Math.random() * 5),
    };
  });
}

function generateDepartmentScores(): DepartmentScore[] {
  return DEPARTMENTS.map((name, i) => ({
    id: `dept-${i}`,
    name,
    memberCount: Math.floor(Math.random() * 30) + 10,
    avgScore: Math.round((3.2 + Math.random() * 1.6) * 100) / 100,
  })).sort((a, b) => b.avgScore - a.avgScore);
}

function generateMyStats(): MyStats {
  return {
    performanceRank: 7,
    goalsRank: 4,
    recognitionRank: 12,
    learningRank: 3,
    totalPoints: 1850,
    badges: ['Leadership', 'Innovation', 'Collaboration'],
    currentStreak: 5,
    progressHistory: [3.2, 3.5, 3.8, 4.0, 4.1, 4.3],
    achievements: [
      { id: '1', title: 'First Review Completed', icon: 'star', unlockedAt: '2025-01-15' },
      { id: '2', title: '10 Goals Crushed', icon: 'flag', unlockedAt: '2025-03-22' },
      { id: '3', title: 'Team Player Award', icon: 'heart', unlockedAt: '2025-06-10' },
      { id: '4', title: '5-Week Streak', icon: 'fire', unlockedAt: '2025-09-05' },
      { id: '5', title: 'Certified Expert', icon: 'academic', unlockedAt: '2025-11-18' },
    ],
  };
}

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

// ─── Podium ─────────────────────────────────────────────────────────────────

function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const top3 = entries.slice(0, 3);
  if (top3.length < 3) return null;

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
        <div key={entry.id} className={clsx('flex flex-col items-center transition-all duration-500 animate-slide-up', idx === 1 && 'order-2', idx === 0 && 'order-1', idx === 2 && 'order-3')} style={{ animationDelay: `${idx * 150}ms` }}>
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
          <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-1">{entry.score.toFixed(2)}</p>
          <p className="text-[10px] text-secondary-400 dark:text-secondary-500 uppercase tracking-wider">{entry.user.department}</p>
          <div className={clsx('mt-2 w-24 sm:w-28 rounded-t-xl bg-gradient-to-b flex items-end justify-center', heights[idx], gradients[idx])}>
            <span className="text-xs font-bold text-secondary-500 dark:text-secondary-300 pb-2 uppercase tracking-wider">{labels[idx]}</span>
          </div>
        </div>
      ))}
    </div>
  );
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

// ─── Department Bar Chart ───────────────────────────────────────────────────

function DepartmentChart({ departments }: { departments: DepartmentScore[] }) {
  const maxScore = Math.max(...departments.map(d => d.avgScore));

  return (
    <div className="space-y-3">
      {departments.map((dept, i) => (
        <div key={dept.id} className="group flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
          <span className="w-24 sm:w-28 text-xs font-medium text-secondary-600 dark:text-secondary-400 text-right truncate">{dept.name}</span>
          <div className="flex-1 h-7 bg-secondary-100 dark:bg-secondary-800 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-400 dark:from-primary-600 dark:to-primary-400 rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2"
              style={{ width: `${(dept.avgScore / maxScore) * 100}%` }}
            >
              <span className="text-[10px] font-bold text-white">{dept.avgScore.toFixed(2)}</span>
            </div>
          </div>
          <span className="w-14 text-xs text-secondary-500 dark:text-secondary-400 text-right">{dept.memberCount} ppl</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function LeaderboardPage() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<Period>('month');
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('performance');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Data queries -- using mock data wrapped in useQuery for future replacement
  const { data: performanceEntries, isLoading: loadingPerformance } = useQuery({
    queryKey: ['leaderboard', 'performance', period],
    queryFn: async () => {
      try { return await api.get<LeaderboardEntry[]>(`/leaderboard/performance?period=${period}`); }
      catch { return generateMockEntries('performance'); }
    },
    staleTime: 60_000,
  });

  const { data: goalsEntries, isLoading: loadingGoals } = useQuery({
    queryKey: ['leaderboard', 'goals', period],
    queryFn: async () => {
      try { return await api.get<LeaderboardEntry[]>(`/leaderboard/goals?period=${period}`); }
      catch { return generateMockEntries('goals'); }
    },
    staleTime: 60_000,
  });

  const { data: recognitionEntries, isLoading: loadingRecognition } = useQuery({
    queryKey: ['leaderboard', 'recognition', period],
    queryFn: async () => {
      try { return await api.get<LeaderboardEntry[]>(`/leaderboard/recognition?period=${period}`); }
      catch { return generateMockEntries('recognition'); }
    },
    staleTime: 60_000,
  });

  const { data: learningEntries, isLoading: loadingLearning } = useQuery({
    queryKey: ['leaderboard', 'learning', period],
    queryFn: async () => {
      try { return await api.get<LeaderboardEntry[]>(`/leaderboard/learning?period=${period}`); }
      catch { return generateMockEntries('learning'); }
    },
    staleTime: 60_000,
  });

  const { data: departmentScores } = useQuery({
    queryKey: ['leaderboard', 'departments', period],
    queryFn: async () => {
      try { return await api.get<DepartmentScore[]>(`/leaderboard/departments?period=${period}`); }
      catch { return generateDepartmentScores(); }
    },
    staleTime: 60_000,
  });

  const { data: myStats } = useQuery({
    queryKey: ['leaderboard', 'my-stats', period],
    queryFn: async () => {
      try { return await api.get<MyStats>(`/leaderboard/my-stats?period=${period}`); }
      catch { return generateMyStats(); }
    },
    staleTime: 60_000,
  });

  const entriesMap: Record<LeaderboardTab, LeaderboardEntry[] | undefined> = {
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

  const entries = entriesMap[activeTab] || [];
  const isLoading = loadingMap[activeTab];

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

  // ─── Renderers per Tab ──────────────────────────────────────────────────

  function renderPerformanceRow(entry: LeaderboardEntry) {
    return (
      <>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <RankBadge rank={entry.rank} />
            <RankChange change={entry.rankChange} />
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <Avatar user={entry.user} size="sm" />
            <div>
              <p className="text-sm font-medium text-secondary-900 dark:text-white">{entry.user.firstName} {entry.user.lastName}</p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">{entry.user.jobTitle}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-secondary-600 dark:text-secondary-400">{entry.user.department}</td>
        <td className="px-4 py-3">
          <span className={clsx('text-sm font-bold', entry.score >= 4.0 ? 'text-success-600 dark:text-success-400' : entry.score >= 3.0 ? 'text-primary-600 dark:text-primary-400' : 'text-warning-600 dark:text-warning-400')}>
            {entry.score.toFixed(2)}
          </span>
          <span className="text-xs text-secondary-400"> / 5.0</span>
        </td>
        <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">{entry.goalsCompleted}</td>
        <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">{entry.reviewRating?.toFixed(1)}</td>
        <td className="px-4 py-3">
          {entry.trendUp
            ? <ArrowTrendingUpIcon className="h-5 w-5 text-success-500" />
            : <ArrowTrendingDownIcon className="h-5 w-5 text-danger-500" />}
        </td>
      </>
    );
  }

  function renderGoalsRow(entry: LeaderboardEntry) {
    return (
      <>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2"><RankBadge rank={entry.rank} /><RankChange change={entry.rankChange} /></div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <Avatar user={entry.user} size="sm" />
            <p className="text-sm font-medium text-secondary-900 dark:text-white">{entry.user.firstName} {entry.user.lastName}</p>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">{entry.goalsCompleted} / {entry.goalsTotal}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 max-w-[80px] h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${entry.completionRate}%` }} />
            </div>
            <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">{entry.completionRate}%</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">{entry.onTimeRate}%</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <FireIcon className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">{entry.streak}</span>
          </div>
        </td>
      </>
    );
  }

  function renderRecognitionRow(entry: LeaderboardEntry) {
    return (
      <>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2"><RankBadge rank={entry.rank} /><RankChange change={entry.rankChange} /></div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <Avatar user={entry.user} size="sm" />
            <p className="text-sm font-medium text-secondary-900 dark:text-white">{entry.user.firstName} {entry.user.lastName}</p>
          </div>
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-secondary-700 dark:text-secondary-300">{entry.kudosReceived}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {entry.badges?.map(b => <BadgeIcon key={b} badge={b} className="h-5 w-5" />)}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{entry.pointsTotal?.toLocaleString()}</span>
        </td>
        <td className="px-4 py-3 text-sm text-secondary-600 dark:text-secondary-400">{entry.topCategory}</td>
      </>
    );
  }

  function renderLearningRow(entry: LeaderboardEntry) {
    return (
      <>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2"><RankBadge rank={entry.rank} /><RankChange change={entry.rankChange} /></div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <Avatar user={entry.user} size="sm" />
            <p className="text-sm font-medium text-secondary-900 dark:text-white">{entry.user.firstName} {entry.user.lastName}</p>
          </div>
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-secondary-700 dark:text-secondary-300">{entry.coursesCompleted}</td>
        <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">{entry.hoursInvested}h</td>
        <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">{entry.skillsAcquired}</td>
        <td className="px-4 py-3 text-sm text-secondary-700 dark:text-secondary-300">{entry.certifications}</td>
      </>
    );
  }

  const columnHeaders: Record<LeaderboardTab, string[]> = {
    performance: ['Rank', 'Employee', 'Department', 'Score', 'Goals Done', 'Review', 'Trend'],
    goals: ['Rank', 'Employee', 'Completed / Total', 'Completion Rate', 'On-Time', 'Streak'],
    recognition: ['Rank', 'Employee', 'Kudos', 'Badges', 'Points', 'Top Category'],
    learning: ['Rank', 'Employee', 'Courses', 'Hours', 'Skills', 'Certs'],
  };

  const rowRenderers: Record<LeaderboardTab, (e: LeaderboardEntry) => JSX.Element> = {
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
                          key={entry.id}
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
              {departmentScores && <DepartmentChart departments={departmentScores} />}
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
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { label: 'Performance', rank: myStats?.performanceRank, color: 'text-primary-500' },
                    { label: 'Goals', rank: myStats?.goalsRank, color: 'text-success-500' },
                    { label: 'Recognition', rank: myStats?.recognitionRank, color: 'text-amber-500' },
                    { label: 'Learning', rank: myStats?.learningRank, color: 'text-violet-500' },
                  ]).map(item => (
                    <div key={item.label} className="bg-secondary-50 dark:bg-secondary-800 rounded-xl p-3 text-center">
                      <p className={clsx('text-2xl font-bold', item.color)}>#{item.rank}</p>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Personal Stats */}
              <div className="bg-white dark:bg-secondary-900 rounded-2xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-5">
                <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-4">Personal Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary-600 dark:text-secondary-400">Total Points</span>
                    <span className="text-lg font-bold text-primary-600 dark:text-primary-400">{myStats?.totalPoints?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-sm text-secondary-600 dark:text-secondary-400">Badges</span>
                    <div className="flex items-center gap-2 mt-1.5">
                      {myStats?.badges?.map(b => (
                        <div key={b} className="flex items-center gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-full px-2.5 py-1">
                          <BadgeIcon badge={b} className="h-4 w-4" />
                          <span className="text-xs font-medium text-secondary-700 dark:text-secondary-300">{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary-600 dark:text-secondary-400">Current Streak</span>
                    <div className="flex items-center gap-1">
                      <FireIcon className="h-5 w-5 text-orange-500" />
                      <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{myStats?.currentStreak} weeks</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Sparkline */}
              <div className="bg-white dark:bg-secondary-900 rounded-2xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-5">
                <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Your Progress</h3>
                <div className="h-12">
                  {myStats?.progressHistory && <Sparkline data={myStats.progressHistory} className="w-full h-full" />}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-secondary-400">6 periods ago</span>
                  <span className="text-[10px] text-secondary-400">Current</span>
                </div>
              </div>

              {/* Achievements */}
              <div className="bg-white dark:bg-secondary-900 rounded-2xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-5">
                <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrophyIcon className="h-4 w-4 text-amber-500" /> Achievements
                </h3>
                <div className="space-y-3">
                  {myStats?.achievements?.map((ach, i) => (
                    <div key={ach.id} className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-800/40 dark:to-amber-700/40 flex items-center justify-center">
                        <AchievementIcon icon={ach.icon} className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{ach.title}</p>
                        <p className="text-xs text-secondary-400 dark:text-secondary-500">{new Date(ach.unlockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
