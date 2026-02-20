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
import type { StatItem, ActivityItem } from '@/components/dashboard';
import { usePageTitle } from '@/hooks/usePageTitle';

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export function DashboardPage() {
  usePageTitle('Dashboard');
  const { user } = useAuthStore();
  const { isAiMode } = useAIWorkspaceStore();
  const hasAiAccess = user?.aiAccessEnabled === true;

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

  // If AI workspace mode is active and user has access, render the immersive AI workspace
  if (isAiMode && hasAiAccess) {
    return <AIWorkspacePage />;
  }

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
        .map(r => r.value);
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-accent-600 p-8 text-white shadow-2xl shine-sweep">
        <AnimatedWaves />

        {/* Glassmorphism overlay layer */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />

        <div className="absolute top-6 right-6 opacity-20">
          <div className="relative animate-float-3d">
            <RocketLaunchIcon className="w-20 h-20" />
          </div>
        </div>
        <div className="absolute bottom-20 right-40 opacity-15">
          <SparklesIcon className="w-14 h-14 animate-spin-slow" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-white/80 text-sm font-medium mb-2">
              <CalendarDaysIcon className="w-4 h-4" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <h1 className="text-5xl lg:text-7xl font-black mb-4 text-shimmer tracking-tight">
              {getGreeting()}, {user?.firstName}!
              <span className="inline-block ml-3 animate-bounce" style={{ animationDuration: '2s' }}>
                {overallScore >= 80 ? '\uD83D\uDE80' : overallScore >= 50 ? '\uD83D\uDC4B' : '\uD83D\uDCAA'}
              </span>
            </h1>
            <p className="text-white/90 text-lg max-w-xl leading-relaxed">
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
              <div className="flex flex-wrap gap-2.5 mt-5">
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

            {/* Quick Snapshot — 3 mini stat cards to fill the left side */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-1.5">
                  <FlagIcon className="w-4 h-4 text-cyan-300" />
                  <span className="text-[11px] font-medium text-white/60 uppercase tracking-wide">Goals</span>
                </div>
                <p className="text-2xl font-bold text-white">{goalsData?.data?.length ?? 0}</p>
                <p className="text-xs text-white/50 mt-0.5">{avgProgress}% avg progress</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-1.5">
                  <ChatBubbleLeftRightIcon className="w-4 h-4 text-emerald-300" />
                  <span className="text-[11px] font-medium text-white/60 uppercase tracking-wide">Feedback</span>
                </div>
                <p className="text-2xl font-bold text-white">{feedbackData?.meta?.total ?? 0}</p>
                <p className="text-xs text-white/50 mt-0.5">{feedbackScoreVal > 0 ? `${Math.round(feedbackScoreVal)}/100 sentiment` : 'No data yet'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-1.5">
                  <ClipboardDocumentCheckIcon className="w-4 h-4 text-violet-300" />
                  <span className="text-[11px] font-medium text-white/60 uppercase tracking-wide">Reviews</span>
                </div>
                <p className="text-2xl font-bold text-white">{reviewsData?.length ?? 0}</p>
                <p className="text-xs text-white/50 mt-0.5">{pendingReviews.length > 0 ? `${pendingReviews.length} pending` : 'All complete'}</p>
              </div>
            </div>

            {/* CPIS Top Dimensions — horizontal mini-bars */}
            {cpisDimensions.length > 0 && (
              <div className="mt-5 space-y-2.5">
                <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Performance Dimensions</p>
                {cpisDimensions.slice(0, 4).map((dim: any, i: number) => {
                  const barColors = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24'];
                  return (
                    <div key={dim.code} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-white/70 w-8 text-right">{dim.code}</span>
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${Math.min(100, dim.rawScore)}%`,
                            backgroundColor: barColors[i],
                            boxShadow: `0 0 6px ${barColors[i]}60`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-white/80 w-8">{Math.round(dim.rawScore)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CPIS Score Visualization — 8-dimension radar chart */}
          <div className="flex-shrink-0 flex flex-col items-center bg-black/20 backdrop-blur-xl rounded-3xl p-5 border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_24px_60px_-10px_rgba(0,0,0,0.5)] hover:bg-black/25 transition-all duration-500 lg:max-w-[400px]">
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
                <div className="text-4xl font-bold text-white">{Math.round(overallScore)}</div>
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
