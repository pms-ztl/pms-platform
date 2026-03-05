import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { performanceMathApi, goalsApi } from '@/lib/api';
import { healthApi } from '@/lib/api/health';
import { useLiveDashboard } from '@/hooks/useLiveDashboard';

import AnimatedSection from '@/components/dashboard/AnimatedSection';
import { ManagerGoalCascade } from '@/components/dashboard';

import { TeamHealthGauge } from '@/components/team-insights/TeamHealthGauge';
import { PerformanceDistribution } from '@/components/team-insights/PerformanceDistribution';
import GoalCompletionTrends from '@/components/analytics/GoalCompletionTrends';
import TeamFeedbackActivity from '@/components/dashboard/TeamFeedbackActivity';
import OneOnOneMeetingTracker from '@/components/dashboard/OneOnOneMeetingTracker';
import ReviewCycleProgress from '@/components/dashboard/ReviewCycleProgress';
import { WorkloadDistributionAnalyzer } from '@/components/realtime-performance/WorkloadDistributionAnalyzer';

export default function TeamOverviewTab() {
  const { user } = useAuthStore();
  const { pollingInterval } = useLiveDashboard();

  // Team analytics from math engine
  const { data: teamAnalytics } = useQuery({
    queryKey: ['team-analytics', user?.id],
    queryFn: () => performanceMathApi.getTeamAnalytics(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
    refetchInterval: pollingInterval || undefined,
  });

  // Health data for TeamHealthGauge
  const { data: health } = useQuery({
    queryKey: ['health-latest'],
    queryFn: () => healthApi.getLatest(),
    staleTime: 120_000,
    refetchInterval: pollingInterval || undefined,
  });

  // Team goal tree for cascade
  const { data: teamTreeData } = useQuery({
    queryKey: ['goals-team-tree-dashboard'],
    queryFn: () => goalsApi.getTeamTree(),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-4">
      {/* Team Health + Performance Distribution */}
      <AnimatedSection stagger={1}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TeamHealthGauge
            score={health?.overallHealthScore ?? 0}
            flightRiskCount={health?.flightRiskCount ?? 0}
            turnoverRate={health?.turnoverRate ?? 0}
            retentionRate={health?.retentionRate ?? 0}
          />
          {teamAnalytics?.memberZScores && (
            <PerformanceDistribution members={teamAnalytics.memberZScores} />
          )}
        </div>
      </AnimatedSection>

      {/* Goal Completion Trends */}
      <AnimatedSection stagger={2}>
        <GoalCompletionTrends months={6} />
      </AnimatedSection>

      {/* Feedback Activity + 1-on-1 Meetings */}
      <AnimatedSection stagger={3}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TeamFeedbackActivity months={6} />
          <OneOnOneMeetingTracker />
        </div>
      </AnimatedSection>

      {/* Review Cycle Progress */}
      <AnimatedSection stagger={4}>
        <ReviewCycleProgress />
      </AnimatedSection>

      {/* Manager Goal Cascade */}
      {teamTreeData && teamTreeData.length > 0 && (
        <AnimatedSection stagger={5}>
          <ManagerGoalCascade teamTreeData={teamTreeData} userId={user?.id} />
        </AnimatedSection>
      )}

      {/* Workload Distribution */}
      <AnimatedSection stagger={6}>
        <WorkloadDistributionAnalyzer />
      </AnimatedSection>
    </div>
  );
}
