import { prisma } from '@pms/database';
import { logger } from '../../utils/logger';
import {
  dataAggregationService,
  PeriodType,
  AggregationType,
} from './data-aggregation.service';
import { trendAnalysisService } from './trend-analysis.service';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
  format,
} from 'date-fns';

export type ReportType =
  | 'WEEKLY_SUMMARY'
  | 'MONTHLY_CARD'
  | 'QUARTERLY_REVIEW'
  | 'YEARLY_INDEX'
  | 'COMPARATIVE_ANALYSIS';

interface ReportGenerationParams {
  tenantId: string;
  reportType: ReportType;
  aggregationType: AggregationType;
  entityId: string;
  periodStart?: Date;
  periodEnd?: Date;
  generatedById?: string;
  customConfig?: any;
}

interface ReportData {
  title: string;
  summary: string;
  data: any;
  trends: any;
  comparisons: any;
  insights: string[];
  recommendations: string[];
}

/**
 * Report Generation Service
 *
 * Generates 5 types of periodic reports:
 * 1. Weekly Performance Summary with Trend Analysis
 * 2. Monthly Performance Card Generation
 * 3. Quarterly Business Review Engine
 * 4. Yearly Performance Index Report
 * 5. Comparative Period-over-Period Analytics
 */
export class ReportGenerationService {
  /**
   * Feature 9: Weekly Performance Summary with Trend Analysis
   */
  async generateWeeklySummary(params: ReportGenerationParams): Promise<ReportData> {
    const { tenantId, aggregationType, entityId, periodStart } = params;

    logger.info('Generating weekly performance summary', { tenantId, aggregationType, entityId });

    // Get week boundaries
    const refDate = periodStart || new Date();
    const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(refDate, { weekStartsOn: 1 });
    const weekLabel = `Week ${format(weekStart, 'w yyyy')}`;

    // Get current week aggregation
    const currentWeekData = await dataAggregationService.getOrComputeAggregation(
      tenantId,
      aggregationType,
      entityId,
      'weekly',
      refDate
    );

    // Get previous week for comparison
    const previousWeekData = await dataAggregationService.getOrComputeAggregation(
      tenantId,
      aggregationType,
      entityId,
      'weekly',
      subWeeks(refDate, 1)
    );

    // Get trend data for the last 12 weeks
    const trendData = await dataAggregationService.batchAggregateForPeriods(
      tenantId,
      aggregationType,
      entityId,
      'weekly',
      12
    );

    // Analyze trends for key metrics
    const keyMetrics = [
      { name: 'goalCompletionRate', category: 'goals' },
      { name: 'avgReviewRating', category: 'reviews' },
      { name: 'avgProductivity', category: 'performance' },
      { name: 'avgWellbeingScore', category: 'wellbeing' },
    ];

    const trends = await trendAnalysisService.batchAnalyzeTrends(
      tenantId,
      aggregationType,
      entityId,
      keyMetrics,
      'weekly',
      12
    );

    // Calculate week-over-week changes
    const comparisons = {
      goalsCompleted: {
        current: currentWeekData.completedGoals,
        previous: previousWeekData.completedGoals,
        change: currentWeekData.completedGoals - previousWeekData.completedGoals,
        changePercent:
          previousWeekData.completedGoals === 0
            ? 0
            : ((currentWeekData.completedGoals - previousWeekData.completedGoals) /
                previousWeekData.completedGoals) *
              100,
      },
      productivity: {
        current: currentWeekData.avgProductivity,
        previous: previousWeekData.avgProductivity,
        change: currentWeekData.avgProductivity - previousWeekData.avgProductivity,
        changePercent:
          previousWeekData.avgProductivity === 0
            ? 0
            : ((currentWeekData.avgProductivity - previousWeekData.avgProductivity) /
                previousWeekData.avgProductivity) *
              100,
      },
      wellbeing: {
        current: currentWeekData.avgWellbeingScore,
        previous: previousWeekData.avgWellbeingScore,
        change: currentWeekData.avgWellbeingScore - previousWeekData.avgWellbeingScore,
        changePercent:
          previousWeekData.avgWellbeingScore === 0
            ? 0
            : ((currentWeekData.avgWellbeingScore - previousWeekData.avgWellbeingScore) /
                previousWeekData.avgWellbeingScore) *
              100,
      },
    };

    // Generate insights
    const insights: string[] = [];

    if (comparisons.goalsCompleted.changePercent > 10) {
      insights.push(
        `Goals completed increased by ${comparisons.goalsCompleted.changePercent.toFixed(1)}% compared to last week.`
      );
    } else if (comparisons.goalsCompleted.changePercent < -10) {
      insights.push(
        `Goals completed decreased by ${Math.abs(comparisons.goalsCompleted.changePercent).toFixed(1)}% compared to last week.`
      );
    }

    if (currentWeekData.atRiskGoals > 0) {
      insights.push(`${currentWeekData.atRiskGoals} goals are at risk and may need attention.`);
    }

    if (comparisons.productivity.changePercent < -5) {
      insights.push(
        `Productivity decreased by ${Math.abs(comparisons.productivity.changePercent).toFixed(1)}%. Consider workload review.`
      );
    }

    if (comparisons.wellbeing.current < 6) {
      insights.push(
        `Wellbeing score is ${comparisons.wellbeing.current.toFixed(1)}, below optimal levels. Prioritize support.`
      );
    }

    // Generate recommendations
    const recommendations: string[] = [];

    const productivityTrend = trends.find(t => t.metricName === 'avgProductivity');
    if (productivityTrend && productivityTrend.trendDirection === 'decreasing') {
      recommendations.push(...productivityTrend.recommendations);
    }

    const wellbeingTrend = trends.find(t => t.metricName === 'avgWellbeingScore');
    if (wellbeingTrend && wellbeingTrend.trendDirection === 'decreasing') {
      recommendations.push(...wellbeingTrend.recommendations);
    }

    if (currentWeekData.overdueGoals > 0) {
      recommendations.push(
        `${currentWeekData.overdueGoals} goals are overdue. Review priorities and adjust timelines as needed.`
      );
    }

    // Generate summary
    const summary = `Weekly Performance Summary for ${weekLabel}. Completed ${currentWeekData.completedGoals} goals with an average progress of ${currentWeekData.avgGoalProgress.toFixed(1)}%. Productivity at ${currentWeekData.avgProductivity.toFixed(1)}, wellbeing score at ${currentWeekData.avgWellbeingScore.toFixed(1)}.`;

    return {
      title: `Weekly Performance Summary - ${weekLabel}`,
      summary,
      data: {
        currentWeek: currentWeekData,
        previousWeek: previousWeekData,
        trendData,
      },
      trends: trends.reduce((acc, trend) => {
        acc[trend.metricName] = trend;
        return acc;
      }, {} as any),
      comparisons,
      insights,
      recommendations,
    };
  }

  /**
   * Feature 10: Monthly Performance Card Generation
   */
  async generateMonthlyCard(params: ReportGenerationParams): Promise<ReportData> {
    const { tenantId, aggregationType, entityId, periodStart } = params;

    logger.info('Generating monthly performance card', { tenantId, aggregationType, entityId });

    const refDate = periodStart || new Date();
    const monthStart = startOfMonth(refDate);
    const monthEnd = endOfMonth(refDate);
    const monthLabel = format(monthStart, 'MMMM yyyy');

    // Get monthly aggregation
    const monthlyData = await dataAggregationService.getOrComputeAggregation(
      tenantId,
      aggregationType,
      entityId,
      'monthly',
      refDate
    );

    // Get previous month
    const previousMonthData = await dataAggregationService.getOrComputeAggregation(
      tenantId,
      aggregationType,
      entityId,
      'monthly',
      subMonths(refDate, 1)
    );

    // Get trend over 12 months
    const monthlyTrends = await dataAggregationService.batchAggregateForPeriods(
      tenantId,
      aggregationType,
      entityId,
      'monthly',
      12
    );

    // Comprehensive metric analysis
    const allMetrics = [
      { name: 'goalCompletionRate', category: 'goals' },
      { name: 'avgGoalProgress', category: 'goals' },
      { name: 'avgReviewRating', category: 'reviews' },
      { name: 'avgProductivity', category: 'performance' },
      { name: 'avgQuality', category: 'performance' },
      { name: 'avgCollaboration', category: 'performance' },
      { name: 'avgWellbeingScore', category: 'wellbeing' },
      { name: 'avgWorkloadHours', category: 'workload' },
    ];

    const trends = await trendAnalysisService.batchAnalyzeTrends(
      tenantId,
      aggregationType,
      entityId,
      allMetrics,
      'monthly',
      12
    );

    // Calculate KPI scores
    const kpiScores = {
      goals: this.calculateKPIScore([
        monthlyData.goalCompletionRate,
        monthlyData.avgGoalProgress,
        100 - (monthlyData.atRiskGoals / Math.max(monthlyData.totalGoals, 1)) * 100,
      ]),
      performance: this.calculateKPIScore([
        monthlyData.avgProductivity,
        monthlyData.avgQuality,
        monthlyData.avgCollaboration,
      ]),
      wellbeing: this.calculateKPIScore([
        monthlyData.avgWellbeingScore * 10, // Scale to 100
        100 - monthlyData.avgStressLevel * 10, // Invert stress
      ]),
      overall: 0,
    };

    kpiScores.overall = this.calculateKPIScore([
      kpiScores.goals,
      kpiScores.performance,
      kpiScores.wellbeing,
    ]);

    // Month-over-month comparisons
    const comparisons = {
      goalsCompleted: this.calculateComparison(
        monthlyData.completedGoals,
        previousMonthData.completedGoals
      ),
      productivity: this.calculateComparison(
        monthlyData.avgProductivity,
        previousMonthData.avgProductivity
      ),
      quality: this.calculateComparison(monthlyData.avgQuality, previousMonthData.avgQuality),
      wellbeing: this.calculateComparison(
        monthlyData.avgWellbeingScore,
        previousMonthData.avgWellbeingScore
      ),
      overallScore: this.calculateComparison(kpiScores.overall, 0), // Previous overall would need calculation
    };

    // Achievements (positive highlights)
    const achievements: string[] = [];

    if (monthlyData.completedGoals > 0) {
      achievements.push(`Completed ${monthlyData.completedGoals} goals in ${monthLabel}`);
    }

    if (kpiScores.performance >= 80) {
      achievements.push(`Maintained excellent performance score of ${kpiScores.performance.toFixed(0)}/100`);
    }

    if (monthlyData.positiveFeedback > monthlyData.constructiveFeedback) {
      achievements.push(`Received ${monthlyData.positiveFeedback} positive feedback items`);
    }

    trends.forEach(trend => {
      if (trend.trendDirection === 'increasing' && trend.metricCategory === 'performance') {
        achievements.push(`${trend.metricName} improved by ${trend.changePercentage.toFixed(1)}%`);
      }
    });

    // Areas for improvement
    const improvements: string[] = [];

    if (monthlyData.atRiskGoals > 0) {
      improvements.push(`${monthlyData.atRiskGoals} goals need attention`);
    }

    if (kpiScores.wellbeing < 60) {
      improvements.push(`Wellbeing score below target at ${kpiScores.wellbeing.toFixed(0)}/100`);
    }

    trends.forEach(trend => {
      if (trend.trendDirection === 'decreasing' && trend.trendStrength > 50) {
        improvements.push(`${trend.metricName} declining trend detected`);
      }
    });

    // AI-generated recommendations
    const recommendations: string[] = [];

    if (improvements.length > 0) {
      recommendations.push('Priority Areas:', ...improvements);
    }

    trends.forEach(trend => {
      if (trend.trendStrength > 60) {
        recommendations.push(...trend.recommendations.slice(0, 1)); // Top recommendation only
      }
    });

    const insights = [
      `Overall Performance Score: ${kpiScores.overall.toFixed(0)}/100`,
      `Goals KPI: ${kpiScores.goals.toFixed(0)}/100`,
      `Performance KPI: ${kpiScores.performance.toFixed(0)}/100`,
      `Wellbeing KPI: ${kpiScores.wellbeing.toFixed(0)}/100`,
      ...achievements.slice(0, 3),
    ];

    const summary = `Monthly Performance Card for ${monthLabel}. Overall score: ${kpiScores.overall.toFixed(0)}/100. ${achievements.length} achievements, ${improvements.length} areas for improvement.`;

    return {
      title: `Monthly Performance Card - ${monthLabel}`,
      summary,
      data: {
        currentMonth: monthlyData,
        previousMonth: previousMonthData,
        kpiScores,
        achievements,
        improvements,
        monthlyTrends,
      },
      trends: trends.reduce((acc, trend) => {
        acc[trend.metricName] = trend;
        return acc;
      }, {} as any),
      comparisons,
      insights,
      recommendations,
    };
  }

  /**
   * Feature 11: Quarterly Business Review Engine
   */
  async generateQuarterlyReview(params: ReportGenerationParams): Promise<ReportData> {
    const { tenantId, aggregationType, entityId, periodStart } = params;

    logger.info('Generating quarterly business review', { tenantId, aggregationType, entityId });

    const refDate = periodStart || new Date();
    const quarterStart = startOfQuarter(refDate);
    const quarterEnd = endOfQuarter(refDate);
    const quarterLabel = `Q${format(quarterStart, 'Q yyyy')}`;

    // Get quarterly aggregation
    const quarterData = await dataAggregationService.getOrComputeAggregation(
      tenantId,
      aggregationType,
      entityId,
      'quarterly',
      refDate
    );

    // Get previous quarter
    const previousQuarterData = await dataAggregationService.getOrComputeAggregation(
      tenantId,
      aggregationType,
      entityId,
      'quarterly',
      subQuarters(refDate, 1)
    );

    // Get year-over-year comparison
    const yearAgoQuarterData = await dataAggregationService.getOrComputeAggregation(
      tenantId,
      aggregationType,
      entityId,
      'quarterly',
      subYears(refDate, 1)
    );

    // Get monthly breakdown within quarter
    const monthlyBreakdown = await dataAggregationService.batchAggregateForPeriods(
      tenantId,
      aggregationType,
      entityId,
      'monthly',
      3
    );

    // Comprehensive trend analysis
    const strategicMetrics = [
      { name: 'goalCompletionRate', category: 'goals' },
      { name: 'avgReviewRating', category: 'reviews' },
      { name: 'avgProductivity', category: 'performance' },
      { name: 'avgQuality', category: 'performance' },
      { name: 'avgCollaboration', category: 'performance' },
      { name: 'performanceScore', category: 'performance' },
      { name: 'avgWellbeingScore', category: 'wellbeing' },
      { name: 'totalFeedback', category: 'engagement' },
    ];

    const trends = await trendAnalysisService.batchAnalyzeTrends(
      tenantId,
      aggregationType,
      entityId,
      strategicMetrics,
      'quarterly',
      8
    );

    // Quarter-over-quarter and year-over-year comparisons
    const comparisons = {
      qoq: {
        goals: this.calculateComparison(quarterData.completedGoals, previousQuarterData.completedGoals),
        productivity: this.calculateComparison(
          quarterData.avgProductivity,
          previousQuarterData.avgProductivity
        ),
        quality: this.calculateComparison(quarterData.avgQuality, previousQuarterData.avgQuality),
        wellbeing: this.calculateComparison(
          quarterData.avgWellbeingScore,
          previousQuarterData.avgWellbeingScore
        ),
      },
      yoy: {
        goals: this.calculateComparison(quarterData.completedGoals, yearAgoQuarterData.completedGoals),
        productivity: this.calculateComparison(
          quarterData.avgProductivity,
          yearAgoQuarterData.avgProductivity
        ),
        quality: this.calculateComparison(quarterData.avgQuality, yearAgoQuarterData.avgQuality),
        wellbeing: this.calculateComparison(
          quarterData.avgWellbeingScore,
          yearAgoQuarterData.avgWellbeingScore
        ),
      },
    };

    // Strategic insights
    const insights: string[] = [];

    insights.push(`Quarter ${quarterLabel} Summary`);
    insights.push(
      `Completed ${quarterData.completedGoals} of ${quarterData.totalGoals} goals (${quarterData.goalCompletionRate.toFixed(1)}% completion rate)`
    );

    if (comparisons.qoq.productivity.changePercent > 5) {
      insights.push(
        `Productivity improved ${comparisons.qoq.productivity.changePercent.toFixed(1)}% quarter-over-quarter`
      );
    }

    if (comparisons.yoy.goals.changePercent > 10) {
      insights.push(
        `Goals completed increased ${comparisons.yoy.goals.changePercent.toFixed(1)}% year-over-year`
      );
    }

    // Strategic recommendations
    const recommendations: string[] = [];

    trends.forEach(trend => {
      if (trend.trendStrength > 70) {
        recommendations.push(`${trend.interpretation}`);
        if (trend.recommendations.length > 0) {
          recommendations.push(trend.recommendations[0]);
        }
      }
    });

    // Forecasts for next quarter
    const forecasts: any = {};
    trends.forEach(trend => {
      forecasts[trend.metricName] = {
        value: trend.forecastedValue,
        confidence: trend.forecastConfidence,
      };
    });

    const summary = `Quarterly Business Review for ${quarterLabel}. Completed ${quarterData.completedGoals} goals. Performance trending ${trends.find(t => t.metricName === 'performanceScore')?.trendDirection || 'stable'}. QoQ productivity ${comparisons.qoq.productivity.changePercent >= 0 ? 'increased' : 'decreased'} by ${Math.abs(comparisons.qoq.productivity.changePercent).toFixed(1)}%.`;

    return {
      title: `Quarterly Business Review - ${quarterLabel}`,
      summary,
      data: {
        currentQuarter: quarterData,
        previousQuarter: previousQuarterData,
        yearAgoQuarter: yearAgoQuarterData,
        monthlyBreakdown,
        forecasts,
      },
      trends: trends.reduce((acc, trend) => {
        acc[trend.metricName] = trend;
        return acc;
      }, {} as any),
      comparisons,
      insights,
      recommendations,
    };
  }

  /**
   * Feature 12: Yearly Performance Index Report
   */
  async generateYearlyIndex(params: ReportGenerationParams): Promise<ReportData> {
    const { tenantId, aggregationType, entityId, periodStart } = params;

    logger.info('Generating yearly performance index', { tenantId, aggregationType, entityId });

    const refDate = periodStart || new Date();
    const yearStart = startOfYear(refDate);
    const yearEnd = endOfYear(refDate);
    const yearLabel = format(yearStart, 'yyyy');

    // Get yearly aggregation
    const yearData = await dataAggregationService.getOrComputeAggregation(
      tenantId,
      aggregationType,
      entityId,
      'yearly',
      refDate
    );

    // Get previous year
    const previousYearData = await dataAggregationService.getOrComputeAggregation(
      tenantId,
      aggregationType,
      entityId,
      'yearly',
      subYears(refDate, 1)
    );

    // Get quarterly breakdown
    const quarterlyBreakdown = await dataAggregationService.batchAggregateForPeriods(
      tenantId,
      aggregationType,
      entityId,
      'quarterly',
      4
    );

    // Get monthly trend for the year
    const monthlyTrend = await dataAggregationService.batchAggregateForPeriods(
      tenantId,
      aggregationType,
      entityId,
      'monthly',
      12
    );

    // All key metrics for annual review
    const annualMetrics = [
      { name: 'goalCompletionRate', category: 'goals' },
      { name: 'avgGoalProgress', category: 'goals' },
      { name: 'avgReviewRating', category: 'reviews' },
      { name: 'avgProductivity', category: 'performance' },
      { name: 'avgQuality', category: 'performance' },
      { name: 'avgCollaboration', category: 'performance' },
      { name: 'performanceScore', category: 'performance' },
      { name: 'avgWellbeingScore', category: 'wellbeing' },
      { name: 'avgWorkloadHours', category: 'workload' },
      { name: 'totalFeedback', category: 'engagement' },
    ];

    const trends = await trendAnalysisService.batchAnalyzeTrends(
      tenantId,
      aggregationType,
      entityId,
      annualMetrics,
      'yearly',
      3
    );

    // Calculate annual performance index (composite score)
    const performanceIndex = this.calculatePerformanceIndex(yearData);
    const previousIndex = this.calculatePerformanceIndex(previousYearData);

    // Year-over-year comparison
    const yoyComparison = this.calculateComparison(performanceIndex, previousIndex);

    // Progression tracking
    const progression = {
      goals: {
        total: yearData.totalGoals,
        completed: yearData.completedGoals,
        completionRate: yearData.goalCompletionRate,
        yoyChange: this.calculateComparison(
          yearData.goalCompletionRate,
          previousYearData.goalCompletionRate
        ),
      },
      performance: {
        current: yearData.performanceScore,
        previous: previousYearData.performanceScore,
        change: this.calculateComparison(yearData.performanceScore, previousYearData.performanceScore),
      },
      wellbeing: {
        current: yearData.avgWellbeingScore,
        previous: previousYearData.avgWellbeingScore,
        change: this.calculateComparison(yearData.avgWellbeingScore, previousYearData.avgWellbeingScore),
      },
    };

    // Annual achievements
    const achievements: string[] = [];

    if (yearData.completedGoals > 0) {
      achievements.push(`Completed ${yearData.completedGoals} goals in ${yearLabel}`);
    }

    if (performanceIndex >= 80) {
      achievements.push(`Achieved excellent annual performance index of ${performanceIndex.toFixed(0)}/100`);
    }

    if (yoyComparison.changePercent > 10) {
      achievements.push(`Performance index improved ${yoyComparison.changePercent.toFixed(1)}% year-over-year`);
    }

    trends.forEach(trend => {
      if (trend.trendDirection === 'increasing' && trend.changePercentage > 15) {
        achievements.push(`${trend.metricName} improved significantly by ${trend.changePercentage.toFixed(1)}%`);
      }
    });

    // Development areas
    const developmentAreas: string[] = [];

    if (yearData.atRiskGoals > yearData.completedGoals * 0.2) {
      developmentAreas.push('Goal planning and execution');
    }

    if (yearData.avgWellbeingScore < 7) {
      developmentAreas.push('Work-life balance and wellbeing');
    }

    trends.forEach(trend => {
      if (trend.trendDirection === 'decreasing' && trend.changePercentage < -10) {
        developmentAreas.push(trend.metricName);
      }
    });

    // Succession planning insights (if applicable)
    const successionInsights: string[] = [];

    if (performanceIndex >= 85 && yearData.avgCollaboration >= 8) {
      successionInsights.push('Strong candidate for leadership development programs');
    }

    if (yearData.avgQuality >= 8 && yearData.totalGoals > 20) {
      successionInsights.push('Demonstrates high output with quality delivery');
    }

    const insights = [
      `Annual Performance Index: ${performanceIndex.toFixed(0)}/100 (${yoyComparison.changePercent >= 0 ? '+' : ''}${yoyComparison.changePercent.toFixed(1)}% YoY)`,
      `Goals: ${yearData.completedGoals}/${yearData.totalGoals} completed (${yearData.goalCompletionRate.toFixed(1)}%)`,
      `Performance Score: ${yearData.performanceScore.toFixed(1)}/10`,
      `Key Achievements: ${achievements.length}`,
      `Development Areas: ${developmentAreas.length}`,
    ];

    const recommendations = [
      ...achievements.slice(0, 3).map(a => `✓ ${a}`),
      ...developmentAreas.slice(0, 3).map(d => `→ Focus on: ${d}`),
      ...successionInsights,
    ];

    const summary = `Annual Performance Index Report for ${yearLabel}. Overall index: ${performanceIndex.toFixed(0)}/100. Completed ${yearData.completedGoals} goals with ${achievements.length} notable achievements.`;

    return {
      title: `Yearly Performance Index - ${yearLabel}`,
      summary,
      data: {
        currentYear: yearData,
        previousYear: previousYearData,
        performanceIndex,
        previousIndex,
        quarterlyBreakdown,
        monthlyTrend,
        progression,
        achievements,
        developmentAreas,
        successionInsights,
      },
      trends: trends.reduce((acc, trend) => {
        acc[trend.metricName] = trend;
        return acc;
      }, {} as any),
      comparisons: { yoy: yoyComparison },
      insights,
      recommendations,
    };
  }

  /**
   * Feature 13: Comparative Period-over-Period Analytics
   */
  async generateComparativeAnalysis(params: ReportGenerationParams): Promise<ReportData> {
    const { tenantId, aggregationType, entityId, customConfig } = params;

    logger.info('Generating comparative period analysis', { tenantId, aggregationType, entityId });

    const periodType: PeriodType = customConfig?.periodType || 'monthly';
    const numberOfPeriods: number = customConfig?.numberOfPeriods || 12;
    const comparisonTypes: string[] = customConfig?.comparisonTypes || ['wow', 'mom', 'qoq', 'yoy'];

    // Get data for multiple periods
    const periodsData = await dataAggregationService.batchAggregateForPeriods(
      tenantId,
      aggregationType,
      entityId,
      periodType,
      numberOfPeriods
    );

    // Calculate all period-over-period comparisons
    const comparisons: any = {
      periods: periodsData.map(p => p.period),
      metrics: {},
    };

    // Define metrics to compare
    const metricsToCompare = [
      'goalCompletionRate',
      'avgProductivity',
      'avgQuality',
      'avgCollaboration',
      'avgWellbeingScore',
      'completedGoals',
      'totalFeedback',
    ];

    metricsToCompare.forEach(metric => {
      const values = periodsData.map(p => (p.metrics as any)[metric] || 0);

      comparisons.metrics[metric] = {
        values,
        current: values[values.length - 1],
        previous: values[values.length - 2],
        wow: this.calculatePeriodChange(values, 1),
        mom: this.calculatePeriodChange(values, periodType === 'weekly' ? 4 : 1),
        qoq: this.calculatePeriodChange(values, periodType === 'monthly' ? 3 : periodType === 'weekly' ? 12 : 1),
        yoy: this.calculatePeriodChange(values, periodType === 'monthly' ? 12 : periodType === 'weekly' ? 52 : 4),
        min: Math.min(...values),
        max: Math.max(...values),
        average: values.reduce((a, b) => a + b, 0) / values.length,
        trend: this.calculateSimpleTrend(values),
      };
    });

    // Pattern detection across all metrics
    const patterns: string[] = [];

    Object.entries(comparisons.metrics).forEach(([metric, data]: [string, any]) => {
      if (data.trend.direction === 'increasing' && data.trend.strength > 70) {
        patterns.push(`${metric} shows strong upward trend (${data.trend.strength}% strength)`);
      } else if (data.trend.direction === 'decreasing' && data.trend.strength > 70) {
        patterns.push(`${metric} shows strong downward trend (${data.trend.strength}% strength)`);
      }

      if (data.yoy.changePercent > 20) {
        patterns.push(`${metric} up ${data.yoy.changePercent.toFixed(1)}% year-over-year`);
      } else if (data.yoy.changePercent < -20) {
        patterns.push(`${metric} down ${Math.abs(data.yoy.changePercent).toFixed(1)}% year-over-year`);
      }
    });

    // Insights
    const insights: string[] = [];

    const bestPerforming = Object.entries(comparisons.metrics)
      .filter(([_, data]: [string, any]) => data.yoy.changePercent > 0)
      .sort((a: any, b: any) => b[1].yoy.changePercent - a[1].yoy.changePercent)
      .slice(0, 3);

    const needsAttention = Object.entries(comparisons.metrics)
      .filter(([_, data]: [string, any]) => data.yoy.changePercent < -5)
      .sort((a: any, b: any) => a[1].yoy.changePercent - b[1].yoy.changePercent)
      .slice(0, 3);

    if (bestPerforming.length > 0) {
      insights.push('Top Improving Metrics:');
      bestPerforming.forEach(([metric, data]: [string, any]) => {
        insights.push(`  • ${metric}: +${data.yoy.changePercent.toFixed(1)}% YoY`);
      });
    }

    if (needsAttention.length > 0) {
      insights.push('Metrics Needing Attention:');
      needsAttention.forEach(([metric, data]: [string, any]) => {
        insights.push(`  • ${metric}: ${data.yoy.changePercent.toFixed(1)}% YoY`);
      });
    }

    // Recommendations
    const recommendations: string[] = [];

    needsAttention.forEach(([metric, data]: [string, any]) => {
      recommendations.push(
        `Address declining trend in ${metric}. Consider root cause analysis and intervention strategy.`
      );
    });

    bestPerforming.forEach(([metric, data]: [string, any]) => {
      recommendations.push(`Document and replicate success factors contributing to ${metric} improvement.`);
    });

    if (patterns.some(p => p.includes('downward trend'))) {
      recommendations.push('Multiple metrics showing downward trends. Comprehensive review recommended.');
    }

    const summary = `Comparative Period-over-Period Analysis across ${numberOfPeriods} ${periodType} periods. ${bestPerforming.length} metrics improving, ${needsAttention.length} needing attention. ${patterns.length} patterns detected.`;

    return {
      title: `Comparative Period Analysis - ${periodType}`,
      summary,
      data: {
        periodType,
        numberOfPeriods,
        periodsData,
        bestPerforming: bestPerforming.map(([metric, data]) => ({ metric, data })),
        needsAttention: needsAttention.map(([metric, data]) => ({ metric, data })),
      },
      trends: comparisons.metrics,
      comparisons,
      insights,
      recommendations,
    };
  }

  /**
   * Main report generation entry point
   */
  async generateReport(params: ReportGenerationParams): Promise<any> {
    const { tenantId, reportType, generatedById } = params;

    logger.info('Starting report generation', { tenantId, reportType });

    // Generate report data based on type
    let reportData: ReportData;

    switch (reportType) {
      case 'WEEKLY_SUMMARY':
        reportData = await this.generateWeeklySummary(params);
        break;

      case 'MONTHLY_CARD':
        reportData = await this.generateMonthlyCard(params);
        break;

      case 'QUARTERLY_REVIEW':
        reportData = await this.generateQuarterlyReview(params);
        break;

      case 'YEARLY_INDEX':
        reportData = await this.generateYearlyIndex(params);
        break;

      case 'COMPARATIVE_ANALYSIS':
        reportData = await this.generateComparativeAnalysis(params);
        break;

      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }

    // Determine period information
    const periodType = this.getPeriodType(reportType);
    const { start, end, label } = dataAggregationService.getPeriodBoundaries(
      periodType,
      params.periodStart || new Date()
    );

    // Save generated report to database (upsert to handle duplicate cache keys)
    const cacheKey = `report:${tenantId}:${reportType}:${label}`;
    const reportPayload = {
      tenantId,
      reportDefinitionId: params.customConfig?.reportDefinitionId || undefined,
      reportType,
      periodType,
      periodStart: start,
      periodEnd: end,
      periodLabel: label,
      title: reportData.title,
      summary: reportData.summary,
      data: reportData.data,
      trends: reportData.trends,
      comparisons: reportData.comparisons,
      insights: reportData.insights,
      recommendations: reportData.recommendations,
      generationType: generatedById ? 'on_demand' : 'scheduled',
      generatedById,
      generationStatus: 'completed',
      generationStartedAt: new Date(),
      generationCompletedAt: new Date(),
      cacheKey,
    };
    const savedReport = await prisma.generatedReport.upsert({
      where: { cacheKey },
      create: reportPayload,
      update: {
        title: reportData.title,
        summary: reportData.summary,
        data: reportData.data,
        trends: reportData.trends,
        comparisons: reportData.comparisons,
        insights: reportData.insights,
        recommendations: reportData.recommendations,
        generationType: generatedById ? 'on_demand' : 'scheduled',
        generatedById,
        generationStatus: 'completed',
        generationStartedAt: new Date(),
        generationCompletedAt: new Date(),
        accessCount: { increment: 1 },
      },
    });

    logger.info('Report generation completed', { reportId: savedReport.id, reportType });

    return savedReport;
  }

  /**
   * Helper: Calculate KPI score from array of metrics
   */
  private calculateKPIScore(metrics: number[]): number {
    const validMetrics = metrics.filter(m => m !== null && m !== undefined && !isNaN(m));
    if (validMetrics.length === 0) return 0;
    return validMetrics.reduce((sum, m) => sum + m, 0) / validMetrics.length;
  }

  /**
   * Helper: Calculate comparison between two values
   */
  private calculateComparison(current: number, previous: number): any {
    const change = current - previous;
    const changePercent = previous === 0 ? 0 : (change / previous) * 100;

    return {
      current,
      previous,
      change,
      changePercent,
      direction: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
    };
  }

  /**
   * Helper: Calculate period-over-period change
   */
  private calculatePeriodChange(values: number[], periodsBack: number): any {
    if (values.length < periodsBack + 1) {
      return { change: 0, changePercent: 0, direction: 'stable' };
    }

    const current = values[values.length - 1];
    const previous = values[values.length - 1 - periodsBack];

    return this.calculateComparison(current, previous);
  }

  /**
   * Helper: Calculate simple trend from values
   */
  private calculateSimpleTrend(values: number[]): any {
    if (values.length < 2) {
      return { direction: 'stable', strength: 0 };
    }

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = secondAvg - firstAvg;
    const changePercent = firstAvg === 0 ? 0 : Math.abs((change / firstAvg) * 100);

    return {
      direction: change > 0.5 ? 'increasing' : change < -0.5 ? 'decreasing' : 'stable',
      strength: Math.min(changePercent, 100),
    };
  }

  /**
   * Helper: Calculate performance index
   */
  private calculatePerformanceIndex(data: any): number {
    const weights = {
      goalCompletionRate: 0.25,
      avgProductivity: 0.2,
      avgQuality: 0.2,
      avgCollaboration: 0.15,
      avgReviewRating: 0.1,
      avgWellbeingScore: 0.1,
    };

    let index = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([metric, weight]) => {
      if (data[metric] !== null && data[metric] !== undefined) {
        // Normalize to 0-100 scale
        let value = data[metric];
        if (metric === 'avgReviewRating' || metric === 'avgWellbeingScore') {
          value = value * 10; // Convert 0-10 to 0-100
        }
        index += value * weight;
        totalWeight += weight;
      }
    });

    return totalWeight === 0 ? 0 : index / totalWeight;
  }

  /**
   * Helper: Get period type from report type
   */
  private getPeriodType(reportType: ReportType): PeriodType {
    switch (reportType) {
      case 'WEEKLY_SUMMARY':
        return 'weekly';
      case 'MONTHLY_CARD':
        return 'monthly';
      case 'QUARTERLY_REVIEW':
        return 'quarterly';
      case 'YEARLY_INDEX':
        return 'yearly';
      case 'COMPARATIVE_ANALYSIS':
        return 'monthly';
      default:
        return 'monthly';
    }
  }
}

export const reportGenerationService = new ReportGenerationService();
