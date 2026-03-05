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

import { useState, useEffect, useMemo } from 'react';
import { goalsApi, reviewsApi, feedbackApi, performanceMathApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { ACCENT_COLORS } from '@/lib/accent-colors';
import { CalendarPlanner } from '@/components/calendar';
import { OnboardingWizard } from '@/components/onboarding';
import { QuickCheckinWidget } from '@/components/checkins/QuickCheckinWidget';

import {
  CPISScoreDisplay,
  UpcomingOneOnOnes,
  CPISDimensionBreakdown,
  LegacyPerformanceBreakdown,
  GoalsWithRisk,
  QuickActions,
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
import type { ActivityItem } from '@/components/dashboard';

import GoalProgressFunnel from '@/components/dashboard/GoalProgressFunnel';
import FeedbackSentimentBreakdown from '@/components/dashboard/FeedbackSentimentBreakdown';
import AnimatedSection from '@/components/dashboard/AnimatedSection';
import { PerformanceTimeline } from '@/components/employee/PerformanceTimeline';
import { ActivityHeatmap } from '@/components/realtime-performance/ActivityHeatmap';

// Helper: convert "R G B" palette string to rgba(R,G,B,alpha)
function pRgba(rgbStr: string, a: number) {
  return `rgba(${rgbStr.replace(/ /g, ',')},${a})`;
}

export default function MyPerformanceTab() {
  const { user } = useAuthStore();
  const accentColor = useThemeStore((s) => s.accentColor);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme !== 'light';
  const p = useMemo(() => ACCENT_COLORS[accentColor].palette, [accentColor]);

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

  const { data: perfScore, isLoading: perfLoading } = useQuery({
    queryKey: ['performance-score', user?.id],
    queryFn: () => performanceMathApi.getScore(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
    retry: 1,
  });

  const { data: cpisData } = useQuery({
    queryKey: ['cpis-score', user?.id],
    queryFn: () => performanceMathApi.getCPIS(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
    retry: 1,
  });

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
        .filter(Boolean);
    },
    enabled: goalIds.length > 0,
    staleTime: 60_000,
    retry: 1,
  });

  // ── Derived values ─────────────────────────────────────────────────────
  const overallScore = cpisData?.score ?? perfScore?.overallScore ?? 0;
  const derivedRating = Number(cpisData?.starRating ?? perfScore?.derivedRating ?? 0) || 0;
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

  goalsData?.data?.filter((g: any) => g.progress >= 100).slice(0, 2).forEach((g: any) => {
    recentActivity.push({
      icon: CheckCircleIcon,
      color: 'emerald',
      title: 'Goal completed',
      desc: g.title,
      time: g.dueDate ? `Due ${new Date(g.dueDate).toLocaleDateString()}` : 'Completed',
    });
  });

  feedbackData?.data?.slice(0, 2).forEach((f: any) => {
    recentActivity.push({
      icon: ChatBubbleLeftRightIcon,
      color: 'primary',
      title: f.type === 'PRAISE' ? 'Praise received' : 'Feedback received',
      desc: f.isAnonymous ? 'Anonymous feedback' : `From ${f.fromUser?.firstName || 'Someone'} ${f.fromUser?.lastName || ''}`,
      time: new Date(f.createdAt).toLocaleDateString(),
    });
  });

  pendingReviews.slice(0, 1).forEach((r: any) => {
    recentActivity.push({
      icon: ClipboardDocumentCheckIcon,
      color: 'violet',
      title: 'Review pending',
      desc: r.cycle?.name || 'Review cycle',
      time: r.type === 'SELF' ? 'Self assessment' : `Review for ${r.reviewee?.firstName || 'team member'}`,
    });
  });

  atRiskGoals.slice(0, 1).forEach((r: any) => {
    recentActivity.push({
      icon: ExclamationTriangleIcon,
      color: 'amber',
      title: `Goal at ${r.riskLevel} risk`,
      desc: r.goalTitle || 'Goal requires attention',
      time: `${r.riskScore}% risk score`,
    });
  });

  if (recentActivity.length === 0) {
    recentActivity.push({
      icon: SparklesIcon,
      color: 'primary',
      title: 'Welcome!',
      desc: 'Start creating goals and requesting feedback to see your activity here.',
      time: 'Just now',
    });
  }

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
    <div className="space-y-3">
      {/* Onboarding Wizard */}
      {showOnboarding && user && (
        <OnboardingWizard
          user={{ id: user.id, firstName: user.firstName }}
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      {/* ═══════════════════ Hero Section ═══════════════════ */}
      <div
        className="relative overflow-visible rounded-2xl glass-banner px-7 py-4"
        style={{
          boxShadow: isDark
            ? `0 4px 32px -6px ${pRgba(p[500], 0.15)}, 0 1px 4px ${pRgba(p[400], 0.06)}`
            : `0 4px 24px -4px ${pRgba(p[500], 0.12)}, 0 1px 6px ${pRgba(p[600], 0.08)}, 0 0 0 1px ${pRgba(p[300], 0.15)}`,
        }}
      >
        {/* ── Accent-adaptive gradient glow system ── */}
        <style>{`
          @keyframes hero-orb-drift-a { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(12px,-8px) scale(1.06); } 66% { transform: translate(-6px,10px) scale(0.95); } }
          @keyframes hero-orb-drift-b { 0%,100% { transform: translate(0,0) scale(1); } 40% { transform: translate(-10px,6px) scale(1.08); } 75% { transform: translate(8px,-12px) scale(0.94); } }
          @keyframes hero-shimmer-sweep { 0% { transform: translateX(-120%) skewX(-18deg); } 100% { transform: translateX(220%) skewX(-18deg); } }
          @keyframes hero-edge-pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
          @keyframes hero-flare-pulse { 0%,100% { opacity: 0.25; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.3); } }
        `}</style>

        {/* ① Primary orb */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: `radial-gradient(circle, ${pRgba(p[400], isDark ? 0.35 : 0.20)} 0%, ${pRgba(p[500], isDark ? 0.18 : 0.10)} 45%, transparent 72%)`, animation: 'hero-orb-drift-a 8s ease-in-out infinite' }} />
        {/* ② Secondary orb */}
        <div className="absolute -bottom-16 -left-20 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: `radial-gradient(circle, ${pRgba(p[300], isDark ? 0.28 : 0.18)} 0%, ${pRgba(p[600], isDark ? 0.12 : 0.07)} 50%, transparent 78%)`, animation: 'hero-orb-drift-b 10s ease-in-out infinite' }} />
        {/* ③ Mid orb */}
        <div className="absolute top-1/4 right-[15%] w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: `radial-gradient(circle, ${pRgba(p[isDark ? 300 : 200], isDark ? 0.18 : 0.12)} 0%, transparent 65%)`, animation: 'hero-orb-drift-a 12s ease-in-out 2s infinite reverse' }} />
        {/* ④ Wide ambient ellipse */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-44 rounded-full blur-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse 100% 80%, ${pRgba(p[isDark ? 400 : 200], isDark ? 0.14 : 0.10)} 0%, transparent 70%)` }} />
        {/* ⑤ Mesh gradient */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, ${pRgba(p[isDark ? 500 : 200], isDark ? 0.07 : 0.09)} 0%, transparent 35%), linear-gradient(225deg, ${pRgba(p[isDark ? 400 : 300], isDark ? 0.05 : 0.07)} 0%, transparent 30%), linear-gradient(45deg, ${pRgba(p[isDark ? 300 : 100], isDark ? 0.04 : 0.06)} 0%, transparent 40%)` }} />

        {/* Edge glows */}
        <div className="absolute top-0 left-0 right-0 h-px pointer-events-none rounded-t-2xl" style={{ background: `linear-gradient(90deg, transparent 8%, ${pRgba(p[isDark ? 400 : 500], isDark ? 0.22 : 0.18)} 30%, ${pRgba(p[isDark ? 300 : 400], isDark ? 0.40 : 0.35)} 50%, ${pRgba(p[isDark ? 400 : 500], isDark ? 0.22 : 0.18)} 70%, transparent 92%)`, animation: 'hero-edge-pulse 4s ease-in-out infinite' }} />
        <div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none rounded-b-2xl" style={{ background: `linear-gradient(90deg, transparent 12%, ${pRgba(p[isDark ? 400 : 500], isDark ? 0.12 : 0.10)} 35%, ${pRgba(p[isDark ? 300 : 400], isDark ? 0.20 : 0.16)} 50%, ${pRgba(p[isDark ? 400 : 500], isDark ? 0.12 : 0.10)} 65%, transparent 88%)`, animation: 'hero-edge-pulse 4s ease-in-out 2s infinite' }} />
        <div className="absolute top-0 bottom-0 left-0 w-px pointer-events-none rounded-l-2xl" style={{ background: `linear-gradient(180deg, transparent 10%, ${pRgba(p[isDark ? 400 : 500], isDark ? 0.10 : 0.08)} 35%, ${pRgba(p[isDark ? 300 : 400], isDark ? 0.16 : 0.12)} 50%, ${pRgba(p[isDark ? 400 : 500], isDark ? 0.10 : 0.08)} 65%, transparent 90%)` }} />
        <div className="absolute top-0 bottom-0 right-0 w-px pointer-events-none rounded-r-2xl" style={{ background: `linear-gradient(180deg, transparent 10%, ${pRgba(p[isDark ? 400 : 500], isDark ? 0.10 : 0.08)} 35%, ${pRgba(p[isDark ? 300 : 400], isDark ? 0.16 : 0.12)} 50%, ${pRgba(p[isDark ? 400 : 500], isDark ? 0.10 : 0.08)} 65%, transparent 90%)` }} />

        {/* ⑩ Shimmer sweep */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-y-0 w-[60%]" style={{ background: `linear-gradient(105deg, transparent 30%, ${pRgba(p[isDark ? 300 : 200], isDark ? 0.08 : 0.06)} 45%, ${pRgba(p[isDark ? 200 : 100], isDark ? 0.12 : 0.09)} 50%, ${pRgba(p[isDark ? 300 : 200], isDark ? 0.08 : 0.06)} 55%, transparent 70%)`, animation: 'hero-shimmer-sweep 6s ease-in-out 1s infinite' }} />
        </div>

        {/* Corner accent flares */}
        <div className="absolute top-3 left-3 w-2.5 h-2.5 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${pRgba(p[isDark ? 400 : 500], isDark ? 0.6 : 0.35)} 0%, transparent 70%)`, boxShadow: `0 0 8px ${pRgba(p[400], isDark ? 0.3 : 0.15)}`, animation: 'hero-flare-pulse 3s ease-in-out infinite' }} />
        <div className="absolute top-3 right-14 w-2 h-2 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${pRgba(p[isDark ? 300 : 400], isDark ? 0.5 : 0.30)} 0%, transparent 70%)`, boxShadow: `0 0 6px ${pRgba(p[300], isDark ? 0.25 : 0.12)}`, animation: 'hero-flare-pulse 3s ease-in-out 1s infinite' }} />
        <div className="absolute bottom-3 left-6 w-1.5 h-1.5 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${pRgba(p[isDark ? 400 : 500], isDark ? 0.5 : 0.25)} 0%, transparent 70%)`, boxShadow: `0 0 5px ${pRgba(p[400], isDark ? 0.2 : 0.10)}`, animation: 'hero-flare-pulse 3s ease-in-out 0.5s infinite' }} />
        <div className="absolute bottom-4 right-[40%] w-1.5 h-1.5 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${pRgba(p[isDark ? 300 : 400], isDark ? 0.45 : 0.22)} 0%, transparent 70%)`, animation: 'hero-flare-pulse 3s ease-in-out 1.5s infinite' }} />

        {/* Decorative floating icons */}
        <div className="absolute top-3 right-4 pointer-events-none" style={{ opacity: isDark ? 0.20 : 0.12 }}>
          <div className="relative animate-float-3d" style={{ color: pRgba(p[isDark ? 400 : 600], 1) }}>
            <ChartBarIcon className="w-10 h-10" />
          </div>
        </div>
        <div className="absolute bottom-6 right-24 pointer-events-none" style={{ opacity: isDark ? 0.15 : 0.08 }}>
          <ArrowTrendingUpIcon className="w-7 h-7" style={{ color: pRgba(p[isDark ? 300 : 500], 1) }} />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-secondary-600 dark:text-secondary-400 text-xs font-medium mb-1">
              <CalendarDaysIcon className="w-3 h-3" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-1.5 tracking-tight flex items-center flex-wrap gap-x-3 text-secondary-900 dark:text-white" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>
              {getGreeting().replace(/\b\w/g, (c) => c.toUpperCase())}, {user?.firstName}!
              {overallScore >= 80 ? (
                <svg className="inline-block w-8 h-8 lg:w-9 lg:h-9 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'greetIconFloat 3s ease-in-out infinite' }}>
                  <style>{`@keyframes greetIconFloat { 0%,100% { transform: translateY(0); opacity: 0.95; } 50% { transform: translateY(-3px); opacity: 1; } }`}</style>
                  <path d="M7 4h10v5a5 5 0 01-10 0V4z" fill={pRgba(p[500],0.2)} stroke={pRgba(p[500],0.8)} strokeWidth="1.5" />
                  <path d="M4 4h3v3a3 3 0 01-3-3z" stroke={pRgba(p[400],0.6)} strokeWidth="1.5" fill="none" />
                  <path d="M20 4h-3v3a3 3 0 003-3z" stroke={pRgba(p[400],0.6)} strokeWidth="1.5" fill="none" />
                  <line x1="12" y1="14" x2="12" y2="17" stroke={pRgba(p[500],0.7)} strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M8 20h8" stroke={pRgba(p[500],0.7)} strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M9 17h6" stroke={pRgba(p[400],0.5)} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ) : overallScore >= 50 ? (
                <svg className="inline-block w-8 h-8 lg:w-9 lg:h-9 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'greetIconFloat 3s ease-in-out infinite' }}>
                  <polyline points="3,17 9,11 13,15 21,7" stroke={pRgba(p[500],0.8)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <polyline points="16,7 21,7 21,12" stroke={pRgba(p[500],0.8)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              ) : (
                <svg className="inline-block w-8 h-8 lg:w-9 lg:h-9 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'greetIconFloat 3s ease-in-out infinite' }}>
                  <circle cx="12" cy="12" r="9" stroke={pRgba(p[400],0.4)} strokeWidth="1.5" fill="none" />
                  <circle cx="12" cy="12" r="5.5" stroke={pRgba(p[500],0.6)} strokeWidth="1.5" fill="none" />
                  <circle cx="12" cy="12" r="2" fill={pRgba(p[500],0.8)} />
                </svg>
              )}
            </h1>
            <p className="text-secondary-600 dark:text-secondary-300 text-xs max-w-xl leading-relaxed">
              {cpisData
                ? overallScore >= 90 ? `Exceptional performance! You're ranked as "${cpisRankLabel}" with a ${cpisGrade} grade. Top-tier across all 8 dimensions.`
                : overallScore >= 80 ? `Outstanding work! "${cpisRankLabel}" with a ${cpisGrade} grade across 8 performance dimensions.`
                : overallScore >= 70 ? `Strong performance! You're on a great trajectory. ${atRiskGoals.length > 0 ? `${atRiskGoals.length} goal(s) need attention.` : 'Keep building momentum!'}`
                : overallScore >= 60 ? `Good progress across your performance dimensions. ${atRiskGoals.length > 0 ? `${atRiskGoals.length} goal(s) need a closer look.` : 'Stay consistent and keep pushing!'}`
                : overallScore >= 50 ? `You're building a solid foundation. ${atRiskGoals.length > 0 ? `Focus on your ${atRiskGoals.length} active goal(s) to accelerate growth.` : 'Explore your growth areas below.'}`
                : overallScore >= 35 ? `Room to grow! Check your performance dimensions below for targeted improvements. ${atRiskGoals.length > 0 ? `${atRiskGoals.length} goal(s) need attention.` : ''}`
                : `Every journey starts somewhere. Focus on quick wins in your strongest dimensions to build momentum.`
                : perfScore
                ? `Your performance is being tracked across multiple dimensions. ${atRiskGoals.length > 0 ? `${atRiskGoals.length} goal(s) need attention.` : 'Keep it up!'}`
                : 'Your Comprehensive Performance Intelligence Score is being computed...'}
            </p>

            {/* Achievement Badges */}
            {achievements.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {achievements.map((achievement, i) => (
                  <div key={i} className="flex items-center gap-2 bg-primary-50/60 dark:bg-white/10 backdrop-blur-md rounded-full px-3.5 py-1.5 hover:bg-primary-100/70 dark:hover:bg-white/20 transition-all duration-300 cursor-pointer group border border-primary-200/50 dark:border-white/10 hover:border-primary-300/60 dark:hover:border-white/20 elastic-scale">
                    <achievement.icon className="w-4 h-4 text-primary-600 dark:text-white group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                    <span className="text-xs font-semibold text-secondary-700 dark:text-white">{achievement.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 8 mini stat cards */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[
                { icon: FlagIcon, iconColor: 'text-cyan-700 dark:text-cyan-300', label: 'Goals', value: goalsData?.data?.length ?? 0, sub: `${avgProgress}% Average Progress` },
                { icon: ChatBubbleLeftRightIcon, iconColor: 'text-emerald-700 dark:text-emerald-300', label: 'Feedback', value: feedbackData?.meta?.total ?? 0, sub: feedbackScoreVal > 0 ? `${Math.round(feedbackScoreVal)}/100 Sentiment` : 'No Data Yet' },
                { icon: ClipboardDocumentCheckIcon, iconColor: 'text-violet-700 dark:text-violet-300', label: 'Reviews', value: reviewsData?.length ?? 0, sub: pendingReviews.length > 0 ? `${pendingReviews.length} Pending` : 'All Complete' },
                { icon: TrophyIcon, iconColor: 'text-amber-700 dark:text-amber-300', label: 'CPIS', value: Math.round(overallScore), sub: `Grade ${cpisGrade ?? 'N/A'}`, tooltip: 'CPIS' },
                { icon: ChartBarIcon, iconColor: 'text-teal-700 dark:text-teal-300', label: 'Attainment', value: `${Math.round(goalAttainment)}%`, sub: goalAttainment >= 90 ? 'Excellent' : goalAttainment >= 70 ? 'Good' : goalAttainment > 0 ? 'Needs Work' : 'No Data' },
                { icon: AcademicCapIcon, iconColor: 'text-pink-700 dark:text-pink-300', label: 'Review Score', value: Math.round(reviewScoreVal), sub: reviewScoreVal >= 80 ? 'Outstanding' : reviewScoreVal >= 60 ? 'Meets Exp.' : reviewScoreVal > 0 ? 'Below Exp.' : 'No Reviews' },
                { icon: StarIcon, iconColor: 'text-yellow-700 dark:text-yellow-300', label: 'Star Rating', value: `${derivedRating.toFixed(1)}/5`, sub: derivedRating >= 4 ? 'Top Performer' : derivedRating >= 3 ? 'Solid' : derivedRating > 0 ? 'Growing' : 'Not Rated' },
                { icon: ExclamationTriangleIcon, iconColor: 'text-red-700 dark:text-red-300', label: 'At Risk', value: atRiskGoals.length, sub: atRiskGoals.length === 0 ? 'All Healthy' : `${atRiskGoals.filter((r: any) => r.riskLevel === 'CRITICAL').length} Critical` },
              ].map((stat, i) => (
                <div key={i} className="bg-white/60 dark:bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-secondary-200/50 dark:border-white/10 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                    {stat.tooltip ? (
                      <MetricTooltip code={stat.tooltip} className="text-xs font-medium text-secondary-600 dark:text-secondary-300 tracking-wide">{stat.label}</MetricTooltip>
                    ) : (
                      <span className="text-xs font-medium text-secondary-600 dark:text-secondary-300 tracking-wide">{stat.label}</span>
                    )}
                  </div>
                  <p className="text-base font-bold text-secondary-900 dark:text-white">{stat.value}</p>
                  <p className="text-2xs text-secondary-600 dark:text-secondary-300 mt-0">{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* CPIS Dimensions — neon gradient pillars */}
            {cpisDimensions.length > 0 && (() => {
              const dimColorMap: Record<string, { dark: string; mid: string; light: string; rgb: string }> = {
                GAI: { dark: '#1d4ed8', mid: '#3b82f6', light: '#93c5fd', rgb: '59,130,246' },
                RQS: { dark: '#6d28d9', mid: '#a78bfa', light: '#ddd6fe', rgb: '167,139,250' },
                FSI: { dark: '#047857', mid: '#34d399', light: '#a7f3d0', rgb: '52,211,153' },
                CIS: { dark: '#b45309', mid: '#fbbf24', light: '#fef08a', rgb: '251,191,36' },
                CRI: { dark: '#be123c', mid: '#fb7185', light: '#fecdd3', rgb: '251,113,133' },
                GTS: { dark: '#4338ca', mid: '#818cf8', light: '#c7d2fe', rgb: '129,140,248' },
                EQS: { dark: '#0f766e', mid: '#2dd4bf', light: '#99f6e4', rgb: '45,212,191' },
                III: { dark: '#a21caf', mid: '#e879f9', light: '#f5d0fe', rgb: '232,121,249' },
              };
              const fallback = { dark: '#475569', mid: '#94a3b8', light: '#cbd5e1', rgb: '148,163,184' };
              const sorted = [...cpisDimensions].sort((a: any, b: any) => b.rawScore - a.rawScore);
              const BAR_MAX = 130;
              return (
                <div className="mt-3">
                  <style>{`
                    @keyframes pillarGrow { 0% { height:0; opacity:0; } 60% { opacity:1; } 85% { height:calc(var(--ph) * 1.06); } 100% { height:var(--ph); } }
                    @keyframes scoreIn { 0% { opacity:0; transform:translateY(6px) scale(0.8); } 100% { opacity:1; transform:translateY(0) scale(1); } }
                    @keyframes capPulse { 0%,100% { opacity:0.6; transform:scaleX(1); } 50% { opacity:1; transform:scaleX(1.15); } }
                    @keyframes shineSlide { 0% { transform:translateX(-100%) skewX(-15deg); } 100% { transform:translateX(250%) skewX(-15deg); } }
                  `}</style>
                  <p className="text-xs font-bold text-secondary-600 dark:text-secondary-400 tracking-wider mb-2">Performance Dimensions</p>
                  <div className="relative">
                    <div className="absolute bottom-[18px] left-0 right-0 h-px bg-gradient-to-r from-transparent via-secondary-300/30 dark:via-white/20 to-transparent" />
                    <div className="grid grid-cols-8 gap-[6px] px-0 items-end">
                      {sorted.map((dim: any, i: number) => {
                        const { dark, mid, light, rgb } = dimColorMap[dim.code] || fallback;
                        const score = Math.round(dim.rawScore);
                        const h = Math.max(8, Math.round((score / 100) * BAR_MAX));
                        return (
                          <MetricTooltip key={dim.code} code={dim.code} clickToReveal className="group flex flex-col items-center cursor-pointer w-full [&>span]:border-transparent [&>span]:w-full">
                            <div className="flex flex-col items-center w-full">
                            <span className="text-lg font-black tabular-nums mb-1" style={{ fontFamily: "'Times New Roman', Times, serif", color: isDark ? light : dark, textShadow: isDark ? `0 0 10px rgba(${rgb},0.7), 0 0 20px rgba(${rgb},0.3)` : `0 1px 2px rgba(0,0,0,0.15)`, animation: `scoreIn 0.5s ease-out ${0.8 + i * 0.07}s both` } as any}>{score}</span>
                            <div className="flex flex-col items-center justify-end w-full" style={{ height: `${BAR_MAX + 14}px` }}>
                              <div className="relative w-full rounded-t-lg overflow-hidden will-change-transform group-hover:-translate-y-1.5 transition-transform duration-500 ease-out" style={{ '--ph': `${h}px`, animation: `pillarGrow 0.9s cubic-bezier(0.34,1.56,0.64,1) ${0.2 + i * 0.08}s both` } as any}>
                                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${dark}99 0%, ${mid}77 50%, ${light}55 100%)`, backdropFilter: 'blur(12px) saturate(1.5)', WebkitBackdropFilter: 'blur(12px) saturate(1.5)' }} />
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out" style={{ background: `linear-gradient(to top, ${dark}33 0%, ${mid}22 50%, rgba(255,255,255,0.12) 100%)` }} />
                                <div className="absolute inset-0 rounded-t-lg" style={{ border: '2.5px solid rgba(255,255,255,0.35)', borderBottom: 'none' }} />
                                <div className="absolute inset-0 rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out" style={{ border: `1px solid rgba(${rgb},0.3)`, borderBottom: 'none' }} />
                                <div className="absolute inset-y-0 left-0 w-[40%]" style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.2), transparent)' }} />
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out overflow-hidden">
                                  <div className="absolute inset-y-0 w-[40%]" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent)', animation: 'shineSlide 2s ease-in-out infinite' }} />
                                </div>
                                <div className="absolute top-0 left-0 right-0 h-[4px] rounded-t-lg" style={{ background: light, boxShadow: `0 0 8px ${mid}, 0 0 16px rgba(${rgb},0.5)`, animation: `capPulse 2.5s ease-in-out ${i * 0.3}s infinite` }} />
                                <div className="absolute -inset-1 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out pointer-events-none" style={{ boxShadow: `0 0 20px rgba(${rgb},0.4), 0 0 40px rgba(${rgb},0.15)` }} />
                                <div className="absolute bottom-0 left-0 right-0 h-[40%]" style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.1), transparent)', borderTop: '1px solid rgba(255,255,255,0.08)' }} />
                              </div>
                              <div className="w-full rounded-b-lg opacity-[0.15] group-hover:opacity-[0.25] transition-opacity" style={{ height: '12px', background: `linear-gradient(to bottom, ${mid}, transparent)`, transform: 'scaleY(-1)', filter: 'blur(1px)', maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)', WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }} />
                            </div>
                            <span className="text-xs font-black text-secondary-700 dark:text-secondary-300 mt-1 tracking-wider group-hover:text-secondary-900 dark:group-hover:text-white transition-colors" style={{ animation: `scoreIn 0.4s ease-out ${0.9 + i * 0.06}s both` } as any}>{dim.code}</span>
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

          {/* CPIS Score Visualization */}
          <div className="relative flex-shrink-0 flex flex-col items-center bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-3 border hover:bg-white/70 dark:hover:bg-white/8 transition-all duration-500 lg:max-w-[320px]" style={{ borderColor: isDark ? pRgba(p[400], 0.12) : pRgba(p[300], 0.25), boxShadow: isDark ? `0 8px 32px -8px ${pRgba(p[500], 0.18)}, inset 0 1px 0 ${pRgba(p[400], 0.06)}` : `0 4px 20px -6px ${pRgba(p[500], 0.10)}, inset 0 1px 0 ${pRgba(p[200], 0.30)}` }}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none" style={{ background: `radial-gradient(circle, ${pRgba(p[isDark ? 400 : 300], isDark ? 0.15 : 0.10)} 0%, transparent 70%)` }} />
            {cpisData ? (
              <CPISScoreDisplay score={overallScore} grade={cpisGrade} starRating={derivedRating} rankLabel={cpisRankLabel} dimensions={cpisDimensions} confidence={cpisConfidence} trajectory={cpisTrajectory} />
            ) : perfLoading ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="w-14 h-14 rounded-full border-2 border-secondary-200 dark:border-white/20 border-t-primary-500 dark:border-t-white/60 animate-spin" />
                <p className="text-secondary-600 dark:text-secondary-400 text-sm">Computing CPIS...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="text-2xl font-bold text-secondary-900 dark:text-white">{Math.round(overallScore)}</div>
                <p className="text-secondary-600 dark:text-secondary-400 text-sm">Performance Score</p>
                {percentile !== null && percentile !== undefined && percentile > 0 && (
                  <p className="text-secondary-600 dark:text-secondary-300 text-xs">Top {Math.max(1, 100 - percentile)}%</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════ CPIS Dimension Breakdown ═══════════════════ */}
      <CPISDimensionBreakdown dimensions={cpisDimensions} cpisData={cpisData} />

      {!cpisDimensions.length && perfScore && (
        <LegacyPerformanceBreakdown perfScore={perfScore} goalAttainment={goalAttainment} reviewScoreVal={reviewScoreVal} feedbackScoreVal={feedbackScoreVal} />
      )}

      {/* ═══════════════════ Goals & Actions ═══════════════════ */}
      <AnimatedSection stagger={1}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <GoalsWithRisk goalsData={goalsData} goalRisks={goalRisks} goalMappings={goalMappings} />
          <QuickActions pendingReviews={pendingReviews} atRiskGoals={atRiskGoals} goalsData={goalsData} />
        </div>
      </AnimatedSection>

      {/* ═══════════════════ Goal Velocity + NEW Goal Funnel ═══════════════════ */}
      <AnimatedSection stagger={2}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GoalVelocity goals={goalsData?.data} goalRisks={goalRisks} />
          <GoalProgressFunnel goals={goalsData?.data ?? []} />
        </div>
      </AnimatedSection>

      {/* ═══════════════════ Analytics — Trend & Skill Gap ═══════════════════ */}
      <AnimatedSection stagger={3}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PerformanceTrendChart currentScore={overallScore} />
          <SkillGapRadar userId={user?.id ?? ''} />
        </div>
      </AnimatedSection>

      {/* ═══════════════════ NEW: Feedback Sentiment + Performance Timeline ═══════════════════ */}
      <AnimatedSection stagger={4}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FeedbackSentimentBreakdown />
          {user?.id && <PerformanceTimeline userId={user.id} />}
        </div>
      </AnimatedSection>

      {/* ═══════════════════ NEW: Activity Heatmap ═══════════════════ */}
      <AnimatedSection stagger={5}>
        <ActivityHeatmap mode="individual" />
      </AnimatedSection>

      {/* ═══════════════════ Engagement — Peer Comparison & Check-in ═══════════════════ */}
      <AnimatedSection stagger={6}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PeerComparison percentile={percentile} score={overallScore} dimensions={cpisDimensions} />
          <QuickCheckinWidget />
        </div>
      </AnimatedSection>

      {/* ═══════════════════ Growth — Learning & Recognition ═══════════════════ */}
      <AnimatedSection stagger={7}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LearningProgress />
          <RecognitionFeed />
        </div>
      </AnimatedSection>

      {/* ═══════════════════ Schedule — Calendar & Deadlines ═══════════════════ */}
      <AnimatedSection stagger={8}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CalendarPlanner />
          <div className="space-y-3">
            <UpcomingOneOnOnes />
            {/* Upcoming Deadlines */}
            <div className="glass-deep rounded-2xl overflow-hidden">
              <div className="card-header bg-gradient-to-r from-orange-50/80 to-amber-50/50 dark:from-orange-500/[0.06] dark:to-amber-500/[0.03]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl shadow-lg">
                    <CalendarDaysIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-secondary-900 dark:text-white">Upcoming Deadlines</h2>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400">Goal milestones this quarter</p>
                  </div>
                </div>
              </div>
              <div className="p-3 space-y-2.5">
                {(() => {
                  const now = new Date();
                  const upcoming = (goalsData?.data ?? [])
                    .filter((g: any) => g.dueDate && new Date(g.dueDate) >= now && g.progress < 100)
                    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .slice(0, 5);
                  if (upcoming.length === 0) {
                    return (
                      <div className="text-center py-3">
                        <CheckCircleIcon className="h-6 w-6 text-emerald-400 mx-auto mb-1.5" />
                        <p className="text-xs text-secondary-500 dark:text-secondary-400">All caught up! No upcoming deadlines.</p>
                      </div>
                    );
                  }
                  return upcoming.map((g: any) => {
                    const due = new Date(g.dueDate);
                    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86400000);
                    const urgency = daysLeft <= 3 ? 'text-red-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-secondary-400 dark:text-secondary-500';
                    const barColor = daysLeft <= 3 ? 'bg-red-500' : daysLeft <= 7 ? 'bg-amber-500' : 'bg-emerald-500';
                    return (
                      <div key={g.id} className="group">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-secondary-800 dark:text-secondary-200 truncate max-w-[70%]">{g.title}</p>
                          <span className={`text-xs font-semibold ${urgency}`}>
                            {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-secondary-100 dark:bg-white/[0.06]">
                            <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(g.progress, 100)}%` }} />
                          </div>
                          <span className="text-xs text-secondary-500 dark:text-secondary-400 w-8 text-right">{g.progress}%</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
            {/* Quick Performance Stats */}
            <div className="glass-deep rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <ChartBarIcon className="w-5 h-5 text-violet-500" />
                <h3 className="text-sm font-bold text-secondary-700 dark:text-secondary-300">Quick Stats</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2.5 rounded-xl bg-secondary-50/80 dark:bg-white/[0.03]">
                  <p className="text-lg font-bold text-secondary-900 dark:text-white">{goalsData?.data?.length ?? 0}</p>
                  <p className="text-2xs text-secondary-500 dark:text-secondary-400">Active Goals</p>
                </div>
                <div className="text-center p-2.5 rounded-xl bg-secondary-50/80 dark:bg-white/[0.03]">
                  <p className="text-lg font-bold text-secondary-900 dark:text-white">{avgProgress}%</p>
                  <p className="text-2xs text-secondary-500 dark:text-secondary-400">Avg Progress</p>
                </div>
                <div className="text-center p-2.5 rounded-xl bg-secondary-50/80 dark:bg-white/[0.03]">
                  <p className="text-lg font-bold text-secondary-900 dark:text-white">{pendingReviews.length}</p>
                  <p className="text-2xs text-secondary-500 dark:text-secondary-400">Pending Reviews</p>
                </div>
                <div className="text-center p-2.5 rounded-xl bg-secondary-50/80 dark:bg-white/[0.03]">
                  <p className="text-lg font-bold text-secondary-900 dark:text-white">{atRiskGoals.length}</p>
                  <p className="text-2xs text-secondary-500 dark:text-secondary-400">At Risk</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ═══════════════════ Activity Timeline ═══════════════════ */}
      <RecentActivity recentActivity={recentActivity} />
    </div>
  );
}
