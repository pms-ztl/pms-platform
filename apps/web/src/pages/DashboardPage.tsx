import { useQuery } from '@tanstack/react-query';
import {
  FlagIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  RocketLaunchIcon,
  ChartBarIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  BoltIcon,
  TrophyIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import { StarIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

import { goalsApi, reviewsApi, feedbackApi, performanceMathApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { CalendarPlanner } from '@/components/calendar';

// ─── Animated SVG Components ────────────────────────────────────────────────
const AnimatedWaves = () => (
  <svg className="absolute bottom-0 left-0 w-full h-24 opacity-20" viewBox="0 0 1440 120" preserveAspectRatio="none">
    <path
      className="animate-pulse"
      fill="currentColor"
      d="M0,64L48,69.3C96,75,192,85,288,90.7C384,96,480,96,576,85.3C672,75,768,53,864,48C960,43,1056,53,1152,58.7C1248,64,1344,64,1392,64L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
    />
  </svg>
);

const FloatingOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 rounded-full blur-3xl animate-pulse" />
    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-violet-400/30 to-purple-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
    <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
    <div className="absolute top-20 left-[10%] w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDuration: '3s' }} />
    <div className="absolute top-40 left-[20%] w-3 h-3 bg-cyan-300/40 rounded-full animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
    <div className="absolute top-32 right-[15%] w-2 h-2 bg-violet-300/40 rounded-full animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }} />
    <div className="absolute bottom-20 right-[25%] w-4 h-4 bg-emerald-300/30 rounded-full animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '0.3s' }} />
  </div>
);

const PerformanceRing = ({ progress, size = 120, strokeWidth = 8, label }: { progress: number; size?: number; strokeWidth?: number; label?: string }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-secondary-200 dark:text-secondary-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-primary-500 transition-all duration-1000 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="url(#gradient)"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <span className="text-2xl font-bold text-secondary-900 dark:text-white">{progress}</span>
          <p className="text-xs text-secondary-500 dark:text-secondary-400">{label || 'Score'}</p>
        </div>
      </div>
    </div>
  );
};

// ─── Risk badge helper ──────────────────────────────────────────────────────
function riskBadge(level: string) {
  const map: Record<string, { color: string; bg: string }> = {
    LOW: { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
    MEDIUM: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40' },
    HIGH: { color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/40' },
    CRITICAL: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40' },
  };
  const s = map[level] || map.MEDIUM;
  return (
    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', s.color, s.bg)}>
      {level}
    </span>
  );
}

function ratingStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <StarIcon
          key={i}
          className={clsx('w-4 h-4', i <= Math.round(rating) ? 'text-amber-400' : 'text-secondary-300 dark:text-secondary-600')}
        />
      ))}
      <span className="ml-1 text-sm font-medium text-secondary-700 dark:text-secondary-300">{rating.toFixed(1)}</span>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export function DashboardPage() {
  const { user } = useAuthStore();

  // ── Real data queries ──────────────────────────────────────────────────
  const { data: goalsData } = useQuery({
    queryKey: ['my-goals'],
    queryFn: () => goalsApi.getMyGoals({ status: 'ACTIVE' }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => reviewsApi.listMyReviews({ asReviewee: true }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: feedbackData } = useQuery({
    queryKey: ['received-feedback'],
    queryFn: () => feedbackApi.listReceived({ page: 1 }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // ── Math engine query: real computed performance score ──────────────────
  const { data: perfScore, isLoading: perfLoading } = useQuery({
    queryKey: ['performance-score', user?.id],
    queryFn: () => performanceMathApi.getScore(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
    retry: 1,
  });

  // ── Goal risk for each goal ────────────────────────────────────────────
  const goalIds = goalsData?.data?.map((g: any) => g.id) || [];
  const { data: goalRisks } = useQuery({
    queryKey: ['goal-risks', goalIds],
    queryFn: async () => {
      if (goalIds.length === 0) return [];
      const results = await Promise.allSettled(
        goalIds.slice(0, 5).map((id: string) => performanceMathApi.getGoalRisk(id))
      );
      return results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value);
    },
    enabled: goalIds.length > 0,
    staleTime: 60_000,
    retry: 1,
  });

  // ── Goal mappings (task-to-goal) ───────────────────────────────────────
  const { data: goalMappings } = useQuery({
    queryKey: ['goal-mappings', goalIds],
    queryFn: async () => {
      if (goalIds.length === 0) return [];
      const results = await Promise.allSettled(
        goalIds.slice(0, 5).map((id: string) => performanceMathApi.getGoalMapping(id))
      );
      return results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value);
    },
    enabled: goalIds.length > 0,
    staleTime: 60_000,
    retry: 1,
  });

  // ── Derived values ─────────────────────────────────────────────────────
  const overallScore = perfScore?.overallScore ?? 0;
  const derivedRating = perfScore?.derivedRating ?? 0;
  const confidence = perfScore?.confidence ?? 0;
  const goalAttainment = perfScore?.goalAttainment ?? 0;
  const reviewScoreVal = perfScore?.reviewScore ?? 0;
  const feedbackScoreVal = perfScore?.feedbackScore ?? 0;
  const percentile = perfScore?.percentile;

  const avgProgress = goalsData?.data?.length > 0
    ? Math.round(goalsData.data.reduce((sum: number, g: any) => sum + g.progress, 0) / goalsData.data.length)
    : 0;

  const atRiskGoals = goalRisks?.filter((r: any) => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL') || [];
  const pendingReviews = reviewsData?.filter((r: any) => r.status === 'NOT_STARTED' || r.status === 'IN_PROGRESS') || [];

  // ── Build real activity from actual DB data ────────────────────────────
  const recentActivity: Array<{ icon: any; color: string; title: string; desc: string; time: string }> = [];

  // Add completed goals
  goalsData?.data?.filter((g: any) => g.progress >= 100).slice(0, 2).forEach((g: any) => {
    recentActivity.push({
      icon: CheckCircleIcon,
      color: 'emerald',
      title: 'Goal completed',
      desc: g.title,
      time: g.dueDate ? `Due ${new Date(g.dueDate).toLocaleDateString()}` : 'Completed',
    });
  });

  // Add recent feedback
  feedbackData?.data?.slice(0, 2).forEach((f: any) => {
    recentActivity.push({
      icon: ChatBubbleLeftRightIcon,
      color: 'primary',
      title: f.type === 'PRAISE' ? 'Praise received' : 'Feedback received',
      desc: f.isAnonymous ? 'Anonymous feedback' : `From ${f.fromUser?.firstName || 'Someone'} ${f.fromUser?.lastName || ''}`,
      time: new Date(f.createdAt).toLocaleDateString(),
    });
  });

  // Add pending reviews
  pendingReviews.slice(0, 1).forEach((r: any) => {
    recentActivity.push({
      icon: ClipboardDocumentCheckIcon,
      color: 'violet',
      title: 'Review pending',
      desc: r.cycle?.name || 'Review cycle',
      time: r.type === 'SELF' ? 'Self assessment' : `Review for ${r.reviewee?.firstName || 'team member'}`,
    });
  });

  // Add at-risk goals
  atRiskGoals.slice(0, 1).forEach((r: any) => {
    recentActivity.push({
      icon: ExclamationTriangleIcon,
      color: 'amber',
      title: `Goal at ${r.riskLevel} risk`,
      desc: r.goalTitle || 'Goal requires attention',
      time: `${r.riskScore}% risk score`,
    });
  });

  // Fallback if no activity
  if (recentActivity.length === 0) {
    recentActivity.push({
      icon: SparklesIcon,
      color: 'primary',
      title: 'Welcome!',
      desc: 'Start creating goals and requesting feedback to see your activity here.',
      time: 'Just now',
    });
  }

  // ── Stats computed from math engine ────────────────────────────────────
  const stats = [
    {
      name: 'Active Goals',
      value: goalsData?.data?.length ?? 0,
      icon: FlagIcon,
      change: atRiskGoals.length > 0
        ? `${atRiskGoals.length} at risk`
        : goalsData?.data?.length ? `${avgProgress}% avg progress` : 'No goals yet',
      changeType: atRiskGoals.length > 0 ? 'negative' : 'positive',
      gradient: 'from-blue-500 to-cyan-400',
      bgGradient: 'from-blue-500/10 to-cyan-400/10',
      iconBg: 'bg-blue-500',
    },
    {
      name: 'Pending Reviews',
      value: pendingReviews.length,
      icon: ClipboardDocumentCheckIcon,
      change: pendingReviews.length > 0 ? 'Action needed' : 'All complete',
      changeType: pendingReviews.length > 0 ? 'neutral' : 'positive',
      gradient: 'from-violet-500 to-purple-400',
      bgGradient: 'from-violet-500/10 to-purple-400/10',
      iconBg: 'bg-violet-500',
    },
    {
      name: 'Feedback Received',
      value: feedbackData?.meta?.total ?? 0,
      icon: ChatBubbleLeftRightIcon,
      change: feedbackScoreVal > 0 ? `Sentiment: ${Math.round(feedbackScoreVal)}/100` : 'No feedback yet',
      changeType: feedbackScoreVal >= 60 ? 'positive' : feedbackScoreVal >= 40 ? 'neutral' : 'negative',
      gradient: 'from-emerald-500 to-teal-400',
      bgGradient: 'from-emerald-500/10 to-teal-400/10',
      iconBg: 'bg-emerald-500',
    },
    {
      name: 'Performance Score',
      value: perfLoading ? '...' : Math.round(overallScore),
      suffix: '/100',
      icon: TrophyIcon,
      change: perfScore
        ? `${confidence >= 0.7 ? 'High' : confidence >= 0.4 ? 'Medium' : 'Low'} confidence (${Math.round(confidence * 100)}%)`
        : 'Computing...',
      changeType: overallScore >= 70 ? 'positive' : overallScore >= 50 ? 'neutral' : 'negative',
      gradient: 'from-amber-500 to-orange-400',
      bgGradient: 'from-amber-500/10 to-orange-400/10',
      iconBg: 'bg-amber-500',
    },
  ];

  // ── Build real achievement badges from computed data ────────────────────
  const achievements: Array<{ icon: any; label: string; color: string; bg: string }> = [];
  if (overallScore >= 80) achievements.push({ icon: TrophyIcon, label: 'Top Performer', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' });
  if (goalAttainment >= 90) achievements.push({ icon: FlagIcon, label: 'Goal Crusher', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' });
  if (feedbackScoreVal >= 70) achievements.push({ icon: ChatBubbleLeftRightIcon, label: 'Well Regarded', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' });
  if (reviewScoreVal >= 80) achievements.push({ icon: StarIcon, label: 'Review Star', color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-900/30' });
  if (percentile !== null && percentile >= 75) achievements.push({ icon: RocketLaunchIcon, label: `Top ${100 - percentile}%`, color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-900/30' });
  if (atRiskGoals.length === 0 && (goalsData?.data?.length ?? 0) > 0) achievements.push({ icon: ShieldCheckIcon, label: 'On Track', color: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-900/30' });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // ── Helper to get risk for a specific goal ─────────────────────────────
  const getRiskForGoal = (goalId: string) => goalRisks?.find((r: any) => r.goalId === goalId);
  const getMappingForGoal = (goalId: string) => goalMappings?.find((m: any) => m.goalId === goalId);

  return (
    <div className="space-y-8 pb-8">
      {/* ═══════════════════ Hero Section ═══════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-500 to-cyan-500 p-8 text-white shadow-2xl">
        <FloatingOrbs />
        <AnimatedWaves />

        <div className="absolute top-6 right-6 opacity-30">
          <div className="relative">
            <RocketLaunchIcon className="w-20 h-20 animate-bounce" style={{ animationDuration: '3s' }} />
          </div>
        </div>
        <div className="absolute bottom-20 right-40 opacity-20">
          <SparklesIcon className="w-14 h-14 animate-spin" style={{ animationDuration: '8s' }} />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-white/80 text-sm font-medium mb-2">
              <CalendarDaysIcon className="w-4 h-4" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-3">
              {getGreeting()}, {user?.firstName}!
              <span className="inline-block ml-3 animate-bounce" style={{ animationDuration: '2s' }}>
                {overallScore >= 80 ? '🚀' : overallScore >= 50 ? '👋' : '💪'}
              </span>
            </h1>
            <p className="text-white/90 text-lg max-w-xl leading-relaxed">
              {perfScore
                ? overallScore >= 80
                  ? `Outstanding performance! You're in the ${percentile ? `top ${100 - percentile}% of` : 'highest bracket among'} your peers.`
                  : overallScore >= 60
                  ? `Solid performance score of ${Math.round(overallScore)}. ${atRiskGoals.length > 0 ? `${atRiskGoals.length} goal(s) need attention.` : 'Keep up the momentum!'}`
                  : `Your score is ${Math.round(overallScore)}/100. Focus on goal completion and gathering feedback to improve.`
                : 'Loading your performance data from the mathematical engine...'}
            </p>

            {/* Real Achievement Badges (earned from math engine) */}
            {achievements.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-6">
                {achievements.map((achievement, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 hover:bg-white/25 transition-all cursor-pointer group"
                  >
                    <achievement.icon className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">{achievement.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Performance Ring - math engine score */}
          <div className="flex flex-col items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <PerformanceRing progress={Math.round(overallScore)} size={140} strokeWidth={10} label="Score" />
            <div className="text-center">
              <p className="text-white/80 text-sm font-medium">
                {perfScore ? ratingStars(derivedRating) : null}
              </p>
              {percentile !== null && (
                <p className="text-white/60 text-xs mt-1">
                  Percentile: {percentile}th
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════ Performance Breakdown (Math Engine) ═══════════════════ */}
      {perfScore && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Goal Attainment', value: Math.round(goalAttainment), weight: perfScore.weights.goals, color: 'from-blue-500 to-cyan-400', icon: FlagIcon },
            { label: 'Review Score', value: Math.round(reviewScoreVal), weight: perfScore.weights.reviews, color: 'from-violet-500 to-purple-400', icon: ClipboardDocumentCheckIcon },
            { label: 'Feedback Sentiment', value: Math.round(feedbackScoreVal), weight: perfScore.weights.feedback, color: 'from-emerald-500 to-teal-400', icon: ChatBubbleLeftRightIcon },
            { label: 'Overall Score', value: Math.round(overallScore), weight: 1.0, color: 'from-amber-500 to-orange-400', icon: BeakerIcon },
          ].map((item) => (
            <div
              key={item.label}
              className="relative overflow-hidden rounded-xl bg-white dark:bg-secondary-800 p-5 border border-secondary-100 dark:border-secondary-700 shadow-sm hover:shadow-lg transition-all"
            >
              <div className={clsx('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r', item.color)} />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <item.icon className="w-4 h-4 text-secondary-400" />
                  <span className="text-xs font-medium text-secondary-500 dark:text-secondary-400">{item.label}</span>
                </div>
                <span className="text-xs text-secondary-400 dark:text-secondary-500">
                  {Math.round(item.weight * 100)}% weight
                </span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold text-secondary-900 dark:text-white">{item.value}</span>
                <span className="text-sm text-secondary-400 mb-0.5">/100</span>
              </div>
              <div className="mt-2 h-1.5 bg-secondary-100 dark:bg-secondary-700 rounded-full overflow-hidden">
                <div
                  className={clsx('h-full rounded-full bg-gradient-to-r transition-all duration-1000', item.color)}
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════ Stats Grid ═══════════════════ */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={stat.name}
            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-secondary-800 p-6 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-secondary-100 dark:border-secondary-700 cursor-pointer"
          >
            <div className={clsx('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500', stat.bgGradient)} />
            <div className={clsx('absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br opacity-10 group-hover:opacity-20 group-hover:scale-125 transition-all duration-500', stat.gradient)} />
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="relative z-10">
              <div className={clsx('inline-flex p-3 rounded-xl shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300', stat.iconBg)}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">{stat.name}</p>
              <p className="text-3xl font-bold text-secondary-900 dark:text-white mt-1 group-hover:scale-105 transition-transform origin-left">
                {stat.value}
                {stat.suffix && <span className="text-lg text-secondary-400">{stat.suffix}</span>}
              </p>
              <div className="mt-4 flex items-center gap-2">
                {stat.changeType === 'positive' && <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-500" />}
                {stat.changeType === 'negative' && <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />}
                <span className={clsx(
                  'text-sm font-medium',
                  stat.changeType === 'positive' && 'text-emerald-600 dark:text-emerald-400',
                  stat.changeType === 'negative' && 'text-red-600 dark:text-red-400',
                  stat.changeType === 'neutral' && 'text-secondary-500 dark:text-secondary-400'
                )}>
                  {stat.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ═══════════════════ Goals with Risk Indicators ═══════════════════ */}
        <div className="lg:col-span-2 card overflow-hidden group">
          <div className="card-header flex items-center justify-between bg-gradient-to-r from-secondary-50 to-secondary-100 dark:from-secondary-800 dark:to-secondary-800/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <FlagIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">My Goals</h2>
                <p className="text-xs text-secondary-500 dark:text-secondary-400">
                  {goalMappings && goalMappings.length > 0
                    ? `Composite scores computed from ${goalMappings.reduce((s: number, m: any) => s + (m.childGoals?.length || 0), 0)} sub-goals`
                    : 'Mathematical risk assessment per goal'}
                </p>
              </div>
            </div>
            <a href="/goals" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1 group/link">
              View all
              <span className="group-hover/link:translate-x-1 transition-transform">→</span>
            </a>
          </div>
          <div className="card-body">
            {goalsData?.data?.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-cyan-100 dark:from-primary-900/30 dark:to-cyan-900/30 rounded-full animate-pulse" />
                  <div className="absolute inset-2 bg-white dark:bg-secondary-800 rounded-full flex items-center justify-center">
                    <FlagIcon className="w-10 h-10 text-secondary-300 dark:text-secondary-600" />
                  </div>
                </div>
                <p className="text-secondary-500 dark:text-secondary-400 mb-2">No active goals yet</p>
                <a href="/goals" className="btn-primary inline-flex gap-2">
                  <SparklesIcon className="w-4 h-4" />
                  Create your first goal
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {goalsData?.data?.slice(0, 5).map((goal: any) => {
                  const risk = getRiskForGoal(goal.id);
                  const mapping = getMappingForGoal(goal.id);
                  return (
                    <div
                      key={goal.id}
                      className="group/item relative p-4 rounded-xl bg-secondary-50 dark:bg-secondary-800/50 hover:bg-white dark:hover:bg-secondary-800 hover:shadow-lg transition-all duration-300 border border-transparent hover:border-secondary-200 dark:hover:border-secondary-700"
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b from-primary-500 to-cyan-500"
                        style={{ opacity: goal.progress / 100 }}
                      />

                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0 pl-3">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-secondary-900 dark:text-white truncate">
                              {goal.title}
                            </h3>
                            {risk && riskBadge(risk.riskLevel)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <CalendarDaysIcon className="w-3 h-3" />
                              Due {goal.dueDate ? new Date(goal.dueDate).toLocaleDateString() : 'No date'}
                            </span>
                            {risk && risk.daysRemaining > 0 && (
                              <span>{risk.daysRemaining}d remaining</span>
                            )}
                            {mapping && mapping.compositeScore > 0 && (
                              <span className="text-primary-600 dark:text-primary-400 font-medium">
                                Composite: {mapping.compositeScore}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {goal.progress >= 100 && (
                            <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                          )}
                          <span className={clsx(
                            'text-lg font-bold',
                            goal.progress >= 100 ? 'text-emerald-500' : 'text-secondary-900 dark:text-white'
                          )}>
                            {goal.progress}%
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden ml-3">
                        <div
                          className={clsx(
                            'h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden',
                            goal.progress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : goal.progress >= 70 ? 'bg-gradient-to-r from-primary-500 to-cyan-400'
                              : goal.progress >= 30 ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                              : 'bg-gradient-to-r from-rose-500 to-pink-400'
                          )}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>

                      {/* Risk detail row */}
                      {risk && risk.riskLevel !== 'LOW' && (
                        <div className="mt-2 ml-3 flex items-center gap-4 text-xs">
                          <span className="text-secondary-400">
                            Schedule: <span className="font-medium text-secondary-600 dark:text-secondary-300">{risk.components.scheduleRisk}%</span>
                          </span>
                          <span className="text-secondary-400">
                            Velocity: <span className="font-medium text-secondary-600 dark:text-secondary-300">{risk.components.velocityRisk}%</span>
                          </span>
                          {risk.projectedCompletion < 100 && (
                            <span className="text-orange-500 font-medium">
                              Projected: {Math.round(risk.projectedCompletion)}% at deadline
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════ Quick Actions ═══════════════════ */}
        <div className="card overflow-hidden">
          <div className="card-header bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg">
                <BoltIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Quick Actions</h2>
                <p className="text-xs text-secondary-500 dark:text-secondary-400">Tasks awaiting you</p>
              </div>
            </div>
          </div>
          <div className="card-body space-y-3">
            {pendingReviews.slice(0, 2).map((review: any) => (
              <div
                key={review.id}
                className="group p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg shadow group-hover:scale-110 transition-transform">
                    <ClipboardDocumentCheckIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary-900 dark:text-white">
                      {review.type === 'SELF' ? 'Complete self-assessment' : `Review for ${review.reviewee?.firstName}`}
                    </p>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{review.cycle?.name}</p>
                  </div>
                </div>
                <a href={`/reviews/${review.id}`} className="btn-primary text-xs mt-3 w-full justify-center group-hover:shadow-lg">
                  Start Review
                </a>
              </div>
            ))}

            {/* At-risk goals as action items */}
            {atRiskGoals.slice(0, 2).map((risk: any) => {
              const goalTitle = goalsData?.data?.find((g: any) => g.id === risk.goalId)?.title || 'Goal needs attention';
              const velocity = risk.requiredVelocity;
              const velocityText = !velocity || !isFinite(velocity) || velocity >= 999
                ? 'Past due — immediate action needed'
                : `Needs ${velocity.toFixed(1)}%/day to finish on time`;
              return (
                <div
                  key={risk.goalId}
                  className="p-4 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200/50 dark:border-red-800/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg shadow">
                      <ExclamationTriangleIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{goalTitle}</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                        Risk: {risk.riskScore}% &bull; {velocityText}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {pendingReviews.length === 0 && atRiskGoals.length === 0 && (
              <div className="text-center py-8">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-full animate-pulse" />
                  <div className="absolute inset-1 bg-white dark:bg-secondary-800 rounded-full flex items-center justify-center">
                    <CheckCircleIcon className="w-8 h-8 text-emerald-500" />
                  </div>
                </div>
                <p className="text-secondary-900 dark:text-white font-medium">All caught up!</p>
                <p className="text-secondary-500 dark:text-secondary-400 text-sm mt-1">No pending tasks</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Planner */}
      <CalendarPlanner />

      {/* ═══════════════════ Real Activity Timeline ═══════════════════ */}
      <div className="card overflow-hidden">
        <div className="card-header bg-gradient-to-r from-secondary-50 to-secondary-100 dark:from-secondary-800 dark:to-secondary-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg">
              <ChartBarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Recent Activity</h2>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Real events from your data</p>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="space-y-1">
            {recentActivity.map((item, index) => (
              <div key={index} className="flex gap-4 group p-3 rounded-xl hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors cursor-pointer">
                <div className="relative">
                  <div className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-lg',
                    item.color === 'emerald' && 'bg-gradient-to-br from-emerald-500 to-teal-500',
                    item.color === 'primary' && 'bg-gradient-to-br from-primary-500 to-cyan-500',
                    item.color === 'violet' && 'bg-gradient-to-br from-violet-500 to-purple-500',
                    item.color === 'amber' && 'bg-gradient-to-br from-amber-500 to-orange-500'
                  )}>
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  {index < recentActivity.length - 1 && (
                    <div className="absolute top-12 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-secondary-300 to-transparent dark:from-secondary-600" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{item.title}</p>
                  <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">{item.desc}</p>
                  <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
