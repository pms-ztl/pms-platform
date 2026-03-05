import { useQuery } from '@tanstack/react-query';
import { engagementApi } from '@/lib/api/engagement';
import { useLiveDashboard } from '@/hooks/useLiveDashboard';
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlan';

import AnimatedSection from '@/components/dashboard/AnimatedSection';
import GatedChart from '@/components/dashboard/GatedChart';
import AttritionRiskIndicators from '@/components/dashboard/AttritionRiskIndicators';
import BiasDetectionMetrics from '@/components/dashboard/BiasDetectionMetrics';

import PerformanceDistributionChart from '@/components/analytics/PerformanceDistributionChart';
import FeedbackAnalysisChart from '@/components/analytics/FeedbackAnalysisChart';
import { DepartmentRadar } from '@/components/engagement/DepartmentRadar';
import { EngagementHeatmap } from '@/components/engagement/EngagementHeatmap';

export default function HRAnalyticsTab() {
  const { pollingInterval } = useLiveDashboard();

  // Engagement department data for DepartmentRadar (receives via props)
  const { data: departments } = useQuery({
    queryKey: ['engagement-departments'],
    queryFn: () => engagementApi.getDepartments(),
    staleTime: 120_000,
    refetchInterval: pollingInterval || undefined,
  });

  // Engagement trends for heatmap (receives via props)
  const { data: trends } = useQuery({
    queryKey: ['engagement-trends'],
    queryFn: () => engagementApi.getTrends({ months: 3 }),
    staleTime: 120_000,
    refetchInterval: pollingInterval || undefined,
  });

  // Convert trends to heatmap format
  const heatmapData = (trends ?? []).map((t) => ({
    date: t.month,
    score: t.averageScore ?? 0,
  }));

  return (
    <div className="space-y-4">
      {/* Org Performance Distribution + Feedback Analysis */}
      <AnimatedSection stagger={1}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PerformanceDistributionChart />
          <FeedbackAnalysisChart />
        </div>
      </AnimatedSection>

      {/* Department Engagement Radar + Heatmap */}
      <AnimatedSection stagger={2}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {departments && departments.length > 0 && (
            <DepartmentRadar departments={departments} />
          )}
          {heatmapData.length > 0 && (
            <EngagementHeatmap trends={heatmapData} />
          )}
        </div>
      </AnimatedSection>

      {/* Attrition Risk (PROFESSIONAL plan) */}
      <AnimatedSection stagger={3}>
        <GatedChart minPlan="PROFESSIONAL">
          <AttritionRiskIndicators />
        </GatedChart>
      </AnimatedSection>

      {/* Bias Detection (PROFESSIONAL plan) */}
      <AnimatedSection stagger={4}>
        <GatedChart minPlan="PROFESSIONAL">
          <BiasDetectionMetrics />
        </GatedChart>
      </AnimatedSection>
    </div>
  );
}
