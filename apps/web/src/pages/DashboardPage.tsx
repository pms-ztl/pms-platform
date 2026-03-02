import { useQuery } from '@tanstack/react-query';
import {
  FlagIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  RocketLaunchIcon,
  CalendarDaysIcon,
  TrophyIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { StarIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

import { useState, useEffect } from 'react';
import { goalsApi, reviewsApi, feedbackApi, performanceMathApi, type Goal } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useAIWorkspaceStore } from '@/store/ai-workspace';
import { CalendarPlanner } from '@/components/calendar';
import { AIWorkspacePage } from '@/pages/AIWorkspacePage';
import { OnboardingWizard } from '@/components/onboarding';
import { QuickCheckinWidget } from '@/components/checkins/QuickCheckinWidget';

import {
  AnimatedWaves,
  CPISScoreDisplay,
  UpcomingOneOnOnes,
  StatsGrid,
  CPISDimensionBreakdown,
  LegacyPerformanceBreakdown,
  GoalsWithRisk,
  QuickActions,
  ManagerGoalCascade,
  RecentActivity,
  PerformanceTrendChart,
  SkillGapRadar,
  PeerComparison,
  LearningProgress,
  RecognitionFeed,
  GoalVelocity,
  MANAGER_ROLES,
} from '@/components/dashboard';
import MetricTooltip from '@/components/dashboard/MetricTooltip';
import type { StatItem, ActivityItem } from '@/components/dashboard';
import { usePageTitle } from '@/hooks/usePageTitle';

// ─── Main Dashboard ─────────────────────────────────────────────────────────

/**
 * DashboardPage — top-level route component.
 *
 * Keeps the AI-mode conditional return BEFORE any hooks by delegating
 * the real dashboard UI to DashboardContent. This avoids the React
 * "hooks called in different order" error that occurs when an early
 * return sits between hook calls.
 */
export function DashboardPage() {
  usePageTitle('Dashboard');
  const { isAiMode } = useAIWorkspaceStore();

  if (isAiMode) {
    return <AIWorkspacePage />;
  }

  return <DashboardContent />;
}

// ─── Dashboard Content (non-AI mode) ────────────────────────────────────────
function DashboardContent() {
  const { user } = useAuthStore();

  // ── Onboarding Wizard ──────────────────────────────────────────────────
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;
    try {
      const done = localStorage.getItem(`pms-onboarding-done-${user.id}`);
      if (!done && (!user.jobTitle || !user.displayName)) {
        setShowOnboarding(true);
      }
    } catch { /* localStorage unavailable */ }
  }, [user]);

  const isManager = (user?.roles ?? []).some((r) => MANAGER_ROLES.includes(r));

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

  // ── CPIS query: Comprehensive Performance Intelligence Score ──────────
  const { data: cpisData } = useQuery({
    queryKey: ['cpis-score', user?.id],
    queryFn: () => performanceMathApi.getCPIS(user!.id),
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
        .map(r => r.value)
        .filter(Boolean); // skip null (goals with no sub-goals return null from API)
    },
    enabled: goalIds.length > 0,
    staleTime: 60_000,
    retry: 1,
  });

  // ── Team goal tree for manager cascade overview ──────────────────────
  const { data: teamTreeData } = useQuery({
    queryKey: ['goals-team-tree-dashboard'],
    queryFn: () => goalsApi.getTeamTree(),
    enabled: isManager,
    staleTime: 60_000,
  });

  // ── Derived values ─────────────────────────────────────────────────────
  const overallScore = cpisData?.score ?? perfScore?.overallScore ?? 0;
  const derivedRating = cpisData?.starRating ?? perfScore?.derivedRating ?? 0;
  const confidence = cpisData?.confidence?.level ?? perfScore?.confidence ?? 0;
  const goalAttainment = perfScore?.goalAttainment ?? 0;
  const reviewScoreVal = perfScore?.reviewScore ?? 0;
  const feedbackScoreVal = perfScore?.feedbackScore ?? 0;
  const percentile = perfScore?.percentile;
  const cpisGrade = cpisData?.grade ?? '';
  const cpisRankLabel = cpisData?.rankLabel ?? '';
  const cpisDimensions: Array<{ code: string; rawScore: number; weight: number; name: string }> = cpisData?.dimensions ?? [];
  const cpisTrajectory = cpisData?.trajectory ?? { direction: 'stable', slope: 0 };
  const cpisConfidence = cpisData?.confidence ?? { level: 0, lowerBound: 0, upperBound: 100, dataPoints: 0 };

  const avgProgress = goalsData?.data?.length > 0
    ? Math.round(goalsData.data.reduce((sum: number, g: any) => sum + g.progress, 0) / goalsData.data.length)
    : 0;

  const atRiskGoals = goalRisks?.filter((r: any) => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL') || [];
  const pendingReviews = reviewsData?.filter((r: any) => r.status === 'NOT_STARTED' || r.status === 'IN_PROGRESS') || [];

  // ── Build real activity from actual DB data ────────────────────────────
  const recentActivity: ActivityItem[] = [];

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
  const stats: StatItem[] = [
    {
      name: 'Active Goals',
      value: goalsData?.data?.length ?? 0,
      icon: FlagIcon,
      change: atRiskGoals.length > 0
        ? `${atRiskGoals.length} at risk`
        : goalsData?.data?.length ? `${avgProgress}% Average Progress` : 'No goals yet',
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
      name: 'CPIS Score',
      value: perfLoading ? '...' : Math.round(overallScore),
      suffix: '/100',
      icon: TrophyIcon,
      change: cpisData
        ? `${cpisGrade} · ${cpisRankLabel}`
        : perfScore
        ? `${confidence >= 0.7 ? 'High' : confidence >= 0.4 ? 'Medium' : 'Low'} confidence (${Math.round(confidence * 100)}%)`
        : 'Computing...',
      changeType: overallScore >= 70 ? 'positive' : overallScore >= 50 ? 'neutral' : 'negative',
      gradient: 'from-amber-500 to-orange-400',
      bgGradient: 'from-amber-500/10 to-orange-400/10',
      iconBg: 'bg-amber-500',
    },
    {
      name: 'Goal Attainment',
      value: perfLoading ? '...' : `${Math.round(goalAttainment)}`,
      suffix: '%',
      icon: ChartBarIcon,
      change: goalAttainment >= 90 ? 'Excellent progress' : goalAttainment >= 70 ? 'Good progress' : goalAttainment > 0 ? 'Needs improvement' : 'No data yet',
      changeType: goalAttainment >= 70 ? 'positive' : goalAttainment >= 50 ? 'neutral' : goalAttainment > 0 ? 'negative' : 'neutral',
      gradient: 'from-teal-500 to-emerald-400',
      bgGradient: 'from-teal-500/10 to-emerald-400/10',
      iconBg: 'bg-teal-500',
    },
    {
      name: 'Review Score',
      value: perfLoading ? '...' : Math.round(reviewScoreVal),
      suffix: '/100',
      icon: AcademicCapIcon,
      change: reviewScoreVal >= 80 ? 'Outstanding' : reviewScoreVal >= 60 ? 'Meets expectations' : reviewScoreVal > 0 ? 'Below expectations' : 'No reviews yet',
      changeType: reviewScoreVal >= 70 ? 'positive' : reviewScoreVal >= 50 ? 'neutral' : reviewScoreVal > 0 ? 'negative' : 'neutral',
      gradient: 'from-pink-500 to-rose-400',
      bgGradient: 'from-pink-500/10 to-rose-400/10',
      iconBg: 'bg-pink-500',
    },
    {
      name: 'Star Rating',
      value: perfLoading ? '...' : derivedRating.toFixed(1),
      suffix: '/5',
      icon: StarIcon,
      change: derivedRating >= 4 ? 'Top performer' : derivedRating >= 3 ? 'Solid performer' : derivedRating > 0 ? 'Room to grow' : 'Not rated yet',
      changeType: derivedRating >= 4 ? 'positive' : derivedRating >= 3 ? 'neutral' : derivedRating > 0 ? 'negative' : 'neutral',
      gradient: 'from-yellow-500 to-amber-400',
      bgGradient: 'from-yellow-500/10 to-amber-400/10',
      iconBg: 'bg-yellow-500',
    },
    {
      name: 'At-Risk Goals',
      value: atRiskGoals.length,
      icon: ExclamationTriangleIcon,
      change: atRiskGoals.length === 0
        ? (goalsData?.data?.length ? 'All goals healthy' : 'No goals yet')
        : `${atRiskGoals.filter((r: any) => r.riskLevel === 'CRITICAL').length} critical`,
      changeType: atRiskGoals.length === 0 ? 'positive' : 'negative',
      gradient: 'from-red-500 to-orange-400',
      bgGradient: 'from-red-500/10 to-orange-400/10',
      iconBg: 'bg-red-500',
    },
  ];

  // ── Build real achievement badges from computed data ────────────────────
  const achievements: Array<{ icon: any; label: string; color: string; bg: string }> = [];
  if (cpisGrade === 'A+' || cpisGrade === 'A') achievements.push({ icon: TrophyIcon, label: cpisGrade === 'A+' ? 'Elite Grade A+' : 'Grade A', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' });
  else if (overallScore >= 80) achievements.push({ icon: TrophyIcon, label: 'Top Performer', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' });
  if (cpisDimensions.find((d: any) => d.code === 'GAI' && d.rawScore >= 85)) achievements.push({ icon: FlagIcon, label: 'Goal Crusher', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' });
  else if (goalAttainment >= 90) achievements.push({ icon: FlagIcon, label: 'Goal Crusher', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' });
  if (cpisDimensions.find((d: any) => d.code === 'CIS' && d.rawScore >= 70)) achievements.push({ icon: UserGroupIcon, label: 'Team Player', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' });
  else if (feedbackScoreVal >= 70) achievements.push({ icon: ChatBubbleLeftRightIcon, label: 'Well Regarded', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' });
  if (cpisDimensions.find((d: any) => d.code === 'GTS' && d.rawScore >= 70)) achievements.push({ icon: ArrowTrendingUpIcon, label: 'Growth Mindset', color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-900/30' });
  else if (reviewScoreVal >= 80) achievements.push({ icon: StarIcon, label: 'Review Star', color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-900/30' });
  if (cpisTrajectory.direction === 'improving') achievements.push({ icon: RocketLaunchIcon, label: 'Trending Up', color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-900/30' });
  if (atRiskGoals.length === 0 && (goalsData?.data?.length ?? 0) > 0) achievements.push({ icon: ShieldCheckIcon, label: 'On Track', color: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-900/30' });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Onboarding Wizard */}
      {showOnboarding && user && (
        <OnboardingWizard
          user={{ id: user.id, firstName: user.firstName }}
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      {/* ═══════════════════ Hero Section ═══════════════════ */}
      <div className="relative overflow-hidden rounded-2xl border px-7 py-4 text-white shine-sweep"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.78) 0%, rgba(139,92,246,0.62) 38%, rgba(109,40,217,0.72) 72%, rgba(91,33,182,0.82) 100%)',
          backdropFilter: 'blur(56px) saturate(210%) brightness(1.1)',
          WebkitBackdropFilter: 'blur(56px) saturate(210%) brightness(1.1)',
          borderColor: 'rgba(255,255,255,0.12)',
          boxShadow: [
            '0 16px 48px -12px rgba(109,40,217,0.35)',
            '0 4px 16px -4px rgba(91,33,182,0.25)',
            '0 0 0 1px rgba(255,255,255,0.12)',
            'inset 0 1px 0 rgba(255,255,255,0.25)',
            'inset 0 -1px 0 rgba(0,0,0,0.15)',
          ].join(', '),
        }}>
        <AnimatedWaves />

        {/* ── Premium frosted glass layers ── */}
        {/* 1. Film-grain noise texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: 'cover' }} />
        {/* 2. Top-edge bright reflection strip */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/75 to-transparent pointer-events-none" />
        {/* 3. Left-edge glint */}
        <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-white/55 via-white/15 to-transparent pointer-events-none" />
        {/* 4. Inner radial glow — top-left light source */}
        <div className="absolute -top-16 -left-16 w-[260px] h-[260px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(196,181,253,0.12) 40%, transparent 68%)' }} />
        {/* 5. Diagonal specular streak */}
        <div className="absolute -top-full left-[38%] w-1/4 h-[300%] -rotate-12 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
        {/* 6. Bottom depth vignette */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.22), transparent)' }} />

        <div className="absolute top-3 right-4 opacity-20">
          <div className="relative animate-float-3d">
            <RocketLaunchIcon className="w-10 h-10" />
          </div>
        </div>
        <div className="absolute bottom-6 right-24 opacity-15">
          <SparklesIcon className="w-7 h-7 animate-spin-slow" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-white/70 text-xs font-medium mb-1">
              <CalendarDaysIcon className="w-3 h-3" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-1.5 tracking-tight flex items-center flex-wrap gap-x-3" style={{
                fontFamily: "'Libre Baskerville', Georgia, serif",
                color: 'rgba(255,255,255,0.97)',
                textShadow: [
                  '0 1px 2px rgba(0,0,0,0.4)',
                  '0 0 16px rgba(255,255,255,0.6)',
                  '0 0 40px rgba(196,181,253,0.55)',
                  '0 0 80px rgba(139,92,246,0.35)',
                  '0 0 140px rgba(124,58,237,0.2)',
                ].join(', '),
              }}>
              {getGreeting().replace(/\b\w/g, (c) => c.toUpperCase())}, {user?.firstName}!
              {/* Animated SVG icon — replaces emoji */}
              {overallScore >= 80 ? (
                /* Rocket — high performer */
                <svg className="inline-block w-10 h-10 lg:w-12 lg:h-12 flex-shrink-0" style={{ animation: 'rocketLaunch 3s ease-in-out infinite' }} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <style>{`
                    @keyframes rocketLaunch {
                      0%,100% { transform: translateY(0) rotate(-45deg); }
                      50%      { transform: translateY(-8px) rotate(-45deg); }
                    }
                    @keyframes flamePulse {
                      0%,100% { opacity: 1; transform: scaleY(1); }
                      50%      { opacity: 0.6; transform: scaleY(0.7); }
                    }
                  `}</style>
                  {/* Body */}
                  <path d="M32 4C20 4 12 20 12 32l20 20c12 0 28-8 28-20C60 20 44 4 32 4Z" fill="rgba(255,255,255,0.9)" />
                  {/* Window */}
                  <circle cx="34" cy="24" r="6" fill="rgba(139,92,246,0.8)" />
                  <circle cx="34" cy="24" r="4" fill="rgba(196,181,253,0.9)" />
                  {/* Fins */}
                  <path d="M12 32 L4 44 L16 40Z" fill="rgba(255,255,255,0.6)" />
                  <path d="M32 52 L24 60 L28 48Z" fill="rgba(255,255,255,0.6)" />
                  {/* Flame */}
                  <path d="M16 40 Q20 50 26 48 Q22 56 18 58 Q14 54 16 40Z" fill="rgba(251,146,60,0.9)" style={{ animation: 'flamePulse 0.5s ease-in-out infinite', transformOrigin: '20px 48px' }} />
                  <path d="M18 42 Q21 50 24 49" stroke="rgba(253,224,71,0.9)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ) : overallScore >= 50 ? (
                /* Upward arrow / trending — mid performer */
                <svg className="inline-block w-10 h-10 lg:w-12 lg:h-12 flex-shrink-0" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <style>{`
                    @keyframes arrowPulse {
                      0%,100% { transform: translateY(0); }
                      50%      { transform: translateY(-6px); }
                    }
                  `}</style>
                  <g style={{ animation: 'arrowPulse 2s ease-in-out infinite' }}>
                    {/* Chart line */}
                    <polyline points="8,48 20,36 32,40 44,22 56,12" stroke="rgba(255,255,255,0.9)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    {/* Arrow head */}
                    <polyline points="44,12 56,12 56,24" stroke="rgba(255,255,255,0.9)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    {/* Dots */}
                    <circle cx="8"  cy="48" r="3.5" fill="rgba(255,255,255,0.7)" />
                    <circle cx="20" cy="36" r="3.5" fill="rgba(255,255,255,0.7)" />
                    <circle cx="32" cy="40" r="3.5" fill="rgba(255,255,255,0.7)" />
                    <circle cx="44" cy="22" r="3.5" fill="rgba(255,255,255,0.7)" />
                    <circle cx="56" cy="12" r="4.5" fill="rgba(167,139,250,1)" />
                  </g>
                </svg>
              ) : (
                /* Spark / ignite — building performer */
                <svg className="inline-block w-10 h-10 lg:w-12 lg:h-12 flex-shrink-0" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <style>{`
                    @keyframes sparkRotate {
                      0%   { transform: rotate(0deg) scale(1); }
                      25%  { transform: rotate(15deg) scale(1.1); }
                      75%  { transform: rotate(-15deg) scale(0.95); }
                      100% { transform: rotate(0deg) scale(1); }
                    }
                    @keyframes rayPulse {
                      0%,100% { opacity: 0.5; transform: scaleX(1); }
                      50%      { opacity: 1; transform: scaleX(1.3); }
                    }
                  `}</style>
                  <g style={{ animation: 'sparkRotate 2.5s ease-in-out infinite', transformOrigin: '32px 32px' }}>
                    {/* Star / spark core */}
                    <path d="M32 8 L36 28 L56 32 L36 36 L32 56 L28 36 L8 32 L28 28Z" fill="rgba(255,255,255,0.95)" />
                  </g>
                  {/* Rays */}
                  <line x1="32" y1="2"  x2="32" y2="10" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'rayPulse 1.5s ease-in-out infinite 0.1s', transformOrigin: '32px 6px' }} />
                  <line x1="58" y1="32" x2="50" y2="32" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'rayPulse 1.5s ease-in-out infinite 0.3s', transformOrigin: '54px 32px' }} />
                  <line x1="32" y1="62" x2="32" y2="54" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'rayPulse 1.5s ease-in-out infinite 0.5s', transformOrigin: '32px 58px' }} />
                  <line x1="6"  y1="32" x2="14" y2="32" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'rayPulse 1.5s ease-in-out infinite 0.7s', transformOrigin: '10px 32px' }} />
                </svg>
              )}
            </h1>
            <p className="text-white/80 text-xs max-w-xl leading-relaxed">
              {cpisData
                ? overallScore >= 90
                  ? `Exceptional performance! You're ranked as "${cpisRankLabel}" with a ${cpisGrade} grade. Top-tier across all 8 dimensions.`
                  : overallScore >= 80
                  ? `Outstanding work! "${cpisRankLabel}" with a ${cpisGrade} grade across 8 performance dimensions.`
                  : overallScore >= 70
                  ? `Strong performance! You're on a great trajectory. ${atRiskGoals.length > 0 ? `${atRiskGoals.length} goal(s) need attention.` : 'Keep building momentum!'}`
                  : overallScore >= 60
                  ? `Good progress across your performance dimensions. ${atRiskGoals.length > 0 ? `${atRiskGoals.length} goal(s) need a closer look.` : 'Stay consistent and keep pushing!'}`
                  : overallScore >= 50
                  ? `You're building a solid foundation. ${atRiskGoals.length > 0 ? `Focus on your ${atRiskGoals.length} active goal(s) to accelerate growth.` : 'Explore your growth areas below.'}`
                  : overallScore >= 35
                  ? `Room to grow! Check your performance dimensions below for targeted improvements. ${atRiskGoals.length > 0 ? `${atRiskGoals.length} goal(s) need attention.` : ''}`
                  : `Every journey starts somewhere. Focus on quick wins in your strongest dimensions to build momentum.`
                : perfScore
                ? `Your performance is being tracked across multiple dimensions. ${atRiskGoals.length > 0 ? `${atRiskGoals.length} goal(s) need attention.` : 'Keep it up!'}`
                : 'Your Comprehensive Performance Intelligence Score is being computed...'}
            </p>

            {/* Real Achievement Badges (earned from math engine) */}
            {achievements.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {achievements.map((achievement, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-3.5 py-1.5 hover:bg-white/20 transition-all duration-300 cursor-pointer group border border-white/10 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] elastic-scale"
                  >
                    <achievement.icon className="w-4 h-4 text-white group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                    <span className="text-xs font-semibold">{achievement.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Snapshot — 8 mini stat cards */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/10 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <FlagIcon className="w-4 h-4 text-cyan-300" />
                  <span className="text-xs font-medium text-white/60 tracking-wide">Goals</span>
                </div>
                <p className="text-base font-bold text-white">{goalsData?.data?.length ?? 0}</p>
                <p className="text-2xs text-white/50 mt-0">{avgProgress}% Average Progress</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/10 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <ChatBubbleLeftRightIcon className="w-4 h-4 text-emerald-300" />
                  <span className="text-xs font-medium text-white/60 tracking-wide">Feedback</span>
                </div>
                <p className="text-base font-bold text-white">{feedbackData?.meta?.total ?? 0}</p>
                <p className="text-2xs text-white/50 mt-0">{feedbackScoreVal > 0 ? `${Math.round(feedbackScoreVal)}/100 Sentiment` : 'No Data Yet'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/10 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <ClipboardDocumentCheckIcon className="w-4 h-4 text-violet-300" />
                  <span className="text-xs font-medium text-white/60 tracking-wide">Reviews</span>
                </div>
                <p className="text-base font-bold text-white">{reviewsData?.length ?? 0}</p>
                <p className="text-2xs text-white/50 mt-0">{pendingReviews.length > 0 ? `${pendingReviews.length} Pending` : 'All Complete'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/10 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <TrophyIcon className="w-4 h-4 text-amber-300" />
                  <MetricTooltip code="CPIS" className="text-xs font-medium text-white/60 tracking-wide">CPIS</MetricTooltip>
                </div>
                <p className="text-base font-bold text-white">{Math.round(overallScore)}</p>
                <p className="text-2xs text-white/50 mt-0">Grade {cpisGrade ?? '—'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/10 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <ChartBarIcon className="w-4 h-4 text-teal-300" />
                  <span className="text-xs font-medium text-white/60 tracking-wide">Attainment</span>
                </div>
                <p className="text-base font-bold text-white">{Math.round(goalAttainment)}%</p>
                <p className="text-2xs text-white/50 mt-0">{goalAttainment >= 90 ? 'Excellent' : goalAttainment >= 70 ? 'Good' : goalAttainment > 0 ? 'Needs Work' : 'No Data'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/10 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <AcademicCapIcon className="w-4 h-4 text-pink-300" />
                  <span className="text-xs font-medium text-white/60 tracking-wide">Review Score</span>
                </div>
                <p className="text-base font-bold text-white">{Math.round(reviewScoreVal)}</p>
                <p className="text-2xs text-white/50 mt-0">{reviewScoreVal >= 80 ? 'Outstanding' : reviewScoreVal >= 60 ? 'Meets Exp.' : reviewScoreVal > 0 ? 'Below Exp.' : 'No Reviews'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/10 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <StarIcon className="w-4 h-4 text-yellow-300" />
                  <span className="text-xs font-medium text-white/60 tracking-wide">Star Rating</span>
                </div>
                <p className="text-base font-bold text-white">{derivedRating.toFixed(1)}<span className="text-xs text-white/40">/5</span></p>
                <p className="text-2xs text-white/50 mt-0">{derivedRating >= 4 ? 'Top Performer' : derivedRating >= 3 ? 'Solid' : derivedRating > 0 ? 'Growing' : 'Not Rated'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/10 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-300" />
                  <span className="text-xs font-medium text-white/60 tracking-wide">At Risk</span>
                </div>
                <p className="text-base font-bold text-white">{atRiskGoals.length}</p>
                <p className="text-2xs text-white/50 mt-0">{atRiskGoals.length === 0 ? 'All Healthy' : `${atRiskGoals.filter((r: any) => r.riskLevel === 'CRITICAL').length} Critical`}</p>
              </div>
            </div>

            {/* CPIS Dimensions — neon gradient pillars with reflection */}
            {cpisDimensions.length > 0 && (() => {
              const dimColorMap: Record<string, { dark: string; mid: string; light: string; rgb: string }> = {
                GAI: { dark: '#1d4ed8', mid: '#3b82f6', light: '#93c5fd', rgb: '59,130,246' },    // blue (matches tooltip)
                RQS: { dark: '#6d28d9', mid: '#a78bfa', light: '#ddd6fe', rgb: '167,139,250' },   // violet
                FSI: { dark: '#047857', mid: '#34d399', light: '#a7f3d0', rgb: '52,211,153' },    // emerald
                CIS: { dark: '#b45309', mid: '#fbbf24', light: '#fef08a', rgb: '251,191,36' },    // amber
                CRI: { dark: '#be123c', mid: '#fb7185', light: '#fecdd3', rgb: '251,113,133' },   // rose (matches tooltip)
                GTS: { dark: '#4338ca', mid: '#818cf8', light: '#c7d2fe', rgb: '129,140,248' },   // indigo (matches tooltip)
                EQS: { dark: '#0f766e', mid: '#2dd4bf', light: '#99f6e4', rgb: '45,212,191' },    // teal (matches tooltip)
                III: { dark: '#a21caf', mid: '#e879f9', light: '#f5d0fe', rgb: '232,121,249' },   // fuchsia (matches tooltip)
              };
              const fallback = { dark: '#475569', mid: '#94a3b8', light: '#cbd5e1', rgb: '148,163,184' };
              const sorted = [...cpisDimensions].sort((a: any, b: any) => b.rawScore - a.rawScore);
              const BAR_MAX = 64;
              return (
                <div className="mt-3">
                  <style>{`
                    @keyframes pillarGrow { 0% { height:0; opacity:0; } 60% { opacity:1; } 85% { height:calc(var(--ph) * 1.06); } 100% { height:var(--ph); } }
                    @keyframes scoreIn { 0% { opacity:0; transform:translateY(6px) scale(0.8); } 100% { opacity:1; transform:translateY(0) scale(1); } }
                    @keyframes capPulse { 0%,100% { opacity:0.6; transform:scaleX(1); } 50% { opacity:1; transform:scaleX(1.15); } }
                    @keyframes shineSlide { 0% { transform:translateX(-100%) skewX(-15deg); } 100% { transform:translateX(250%) skewX(-15deg); } }
                  `}</style>
                  <p className="text-2xs font-semibold text-white/50 tracking-wider mb-2">Performance Dimensions</p>
                  <div className="relative">
                    {/* Glass shelf line */}
                    <div className="absolute bottom-[18px] left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <div className="grid grid-cols-8 gap-[6px] px-0 items-end">
                      {sorted.map((dim: any, i: number) => {
                        const { dark, mid, light, rgb } = dimColorMap[dim.code] || fallback;
                        const score = Math.round(dim.rawScore);
                        const h = Math.max(8, Math.round((score / 100) * BAR_MAX));
                        return (
                          <MetricTooltip key={dim.code} code={dim.code} clickToReveal className="group flex flex-col items-center cursor-pointer w-full [&>span]:border-transparent [&>span]:w-full">
                            <div className="flex flex-col items-center w-full">
                            {/* Score */}
                            <span
                              className="text-sm font-black tabular-nums mb-1"
                              style={{
                                fontFamily: "'Times New Roman', Times, serif",
                                color: light,
                                textShadow: `0 0 10px rgba(${rgb},0.7), 0 0 20px rgba(${rgb},0.3)`,
                                animation: `scoreIn 0.5s ease-out ${0.8 + i * 0.07}s both`,
                              } as any}
                            >{score}</span>
                            {/* Pillar + reflection container — fixed height so all bars share same baseline */}
                            <div className="flex flex-col items-center justify-end w-full" style={{ height: `${BAR_MAX + 14}px` }}>
                              {/* Main pillar — GPU-only transitions for smooth hover */}
                              <div
                                className="relative w-full rounded-t-lg overflow-hidden will-change-transform group-hover:-translate-y-1.5 transition-transform duration-500 ease-out"
                                style={{
                                  '--ph': `${h}px`,
                                  animation: `pillarGrow 0.9s cubic-bezier(0.34,1.56,0.64,1) ${0.2 + i * 0.08}s both`,
                                } as any}
                              >
                                {/* Frosted glass gradient fill */}
                                <div className="absolute inset-0" style={{
                                  background: `linear-gradient(to top, ${dark}99 0%, ${mid}77 50%, ${light}55 100%)`,
                                  backdropFilter: 'blur(12px) saturate(1.5)',
                                  WebkitBackdropFilter: 'blur(12px) saturate(1.5)',
                                }} />
                                {/* Hover brighten overlay — opacity-only transition */}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out" style={{
                                  background: `linear-gradient(to top, ${dark}33 0%, ${mid}22 50%, rgba(255,255,255,0.12) 100%)`,
                                }} />
                                {/* Inner glass border */}
                                <div className="absolute inset-0 rounded-t-lg" style={{
                                  border: '1px solid rgba(255,255,255,0.15)',
                                  borderBottom: 'none',
                                }} />
                                {/* Hover border glow — opacity only */}
                                <div className="absolute inset-0 rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out" style={{
                                  border: `1px solid rgba(${rgb},0.3)`,
                                  borderBottom: 'none',
                                }} />
                                {/* Glass shine left edge */}
                                <div className="absolute inset-y-0 left-0 w-[40%]" style={{
                                  background: 'linear-gradient(to right, rgba(255,255,255,0.2), transparent)',
                                }} />
                                {/* Shine sweep — opacity only */}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out overflow-hidden">
                                  <div className="absolute inset-y-0 w-[40%]" style={{
                                    background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent)',
                                    animation: 'shineSlide 2s ease-in-out infinite',
                                  }} />
                                </div>
                                {/* Glowing cap */}
                                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-lg" style={{
                                  background: light,
                                  boxShadow: `0 0 8px ${mid}, 0 0 16px rgba(${rgb},0.5)`,
                                  animation: `capPulse 2.5s ease-in-out ${i * 0.3}s infinite`,
                                }} />
                                {/* Neon bloom — opacity only */}
                                <div className="absolute -inset-1 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out pointer-events-none" style={{
                                  boxShadow: `0 0 20px rgba(${rgb},0.4), 0 0 40px rgba(${rgb},0.15)`,
                                }} />
                                {/* Frosted base */}
                                <div className="absolute bottom-0 left-0 right-0 h-[40%]" style={{
                                  background: 'linear-gradient(to top, rgba(255,255,255,0.1), transparent)',
                                  borderTop: '1px solid rgba(255,255,255,0.08)',
                                }} />
                              </div>
                              {/* Reflection (mirrored, faded) — fixed height for uniform baseline */}
                              <div
                                className="w-full rounded-b-lg opacity-[0.15] group-hover:opacity-[0.25] transition-opacity"
                                style={{
                                  height: '12px',
                                  background: `linear-gradient(to bottom, ${mid}, transparent)`,
                                  transform: 'scaleY(-1)',
                                  filter: 'blur(1px)',
                                  maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
                                  WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
                                }}
                              />
                            </div>
                            {/* Label */}
                            <span
                              className="text-3xs font-bold text-white/45 mt-1 tracking-wider group-hover:text-white/90 transition-colors"
                              style={{ animation: `scoreIn 0.4s ease-out ${0.9 + i * 0.06}s both` } as any}
                            >{dim.code}</span>
                            </div>
                          </MetricTooltip>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* CPIS Score Visualization — 8-dimension radar chart */}
          <div className="flex-shrink-0 flex flex-col items-center bg-black/20 backdrop-blur-xl rounded-2xl p-3 border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_24px_60px_-10px_rgba(0,0,0,0.5)] hover:bg-black/25 transition-all duration-500 lg:max-w-[320px]">
            {cpisData ? (
              <CPISScoreDisplay
                score={overallScore}
                grade={cpisGrade}
                starRating={derivedRating}
                rankLabel={cpisRankLabel}
                dimensions={cpisDimensions}
                confidence={cpisConfidence}
                trajectory={cpisTrajectory}
              />
            ) : perfLoading ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-16 h-16 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                <p className="text-white/60 text-sm">Computing CPIS...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6">
                <div className="text-2xl font-bold text-white">{Math.round(overallScore)}</div>
                <p className="text-white/60 text-sm">Performance Score</p>
                {percentile !== null && percentile > 0 && (
                  <p className="text-white/50 text-xs">Top {Math.max(1, 100 - percentile)}%</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════ CPIS Dimension Breakdown ═══════════════════ */}
      <CPISDimensionBreakdown dimensions={cpisDimensions} cpisData={cpisData} />

      {/* ═══════════════════ Legacy Performance Breakdown (when CPIS not available) ═══════════════════ */}
      {!cpisDimensions.length && perfScore && (
        <LegacyPerformanceBreakdown
          perfScore={perfScore}
          goalAttainment={goalAttainment}
          reviewScoreVal={reviewScoreVal}
          feedbackScoreVal={feedbackScoreVal}
        />
      )}

      {/* ═══════════════════ Performance Trend & Skill Gap ═══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceTrendChart currentScore={overallScore} />
        <SkillGapRadar userId={user?.id ?? ''} />
      </div>

      {/* ═══════════════════ Stats Grid ═══════════════════ */}
      <StatsGrid stats={stats} />

      {/* ═══════════════════ Quick Check-in ═══════════════════ */}
      <QuickCheckinWidget />

      {/* ═══════════════════ Peer Comparison ═══════════════════ */}
      <PeerComparison percentile={percentile} score={overallScore} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ═══════════════════ Goals with Risk Indicators ═══════════════════ */}
        <GoalsWithRisk goalsData={goalsData} goalRisks={goalRisks} goalMappings={goalMappings} />

        {/* ═══════════════════ Quick Actions ═══════════════════ */}
        <QuickActions pendingReviews={pendingReviews} atRiskGoals={atRiskGoals} goalsData={goalsData} />
      </div>

      {/* ═══════════════════ Goal Velocity ═══════════════════ */}
      <GoalVelocity goals={goalsData?.data} goalRisks={goalRisks} />

      {/* ═══════════════════ Learning & Recognition ═══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LearningProgress />
        <RecognitionFeed />
      </div>

      {/* ═══════════════════ Upcoming 1-on-1 Meetings ═══════════════════ */}
      <UpcomingOneOnOnes />

      {/* Calendar Planner */}
      <CalendarPlanner />

      {/* ═══════════════════ Manager Goal Cascade Overview ═══════════════════ */}
      {isManager && teamTreeData && teamTreeData.length > 0 && (
        <ManagerGoalCascade teamTreeData={teamTreeData} userId={user?.id} />
      )}

      {/* ═══════════════════ Real Activity Timeline ═══════════════════ */}
      <RecentActivity recentActivity={recentActivity} />
    </div>
  );
}
