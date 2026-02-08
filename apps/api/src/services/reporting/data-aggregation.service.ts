// @ts-nocheck
import { prisma } from '@pms/database';
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
  parseISO
} from 'date-fns';
import { logger } from '../../utils/logger';

export type PeriodType = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type AggregationType = 'user' | 'team' | 'department' | 'business_unit' | 'tenant';

interface AggregationParams {
  tenantId: string;
  aggregationType: AggregationType;
  entityId: string;
  periodType: PeriodType;
  periodStart: Date;
  periodEnd: Date;
}

interface PerformanceMetrics {
  totalGoals: number;
  completedGoals: number;
  inProgressGoals: number;
  notStartedGoals: number;
  onTrackGoals: number;
  atRiskGoals: number;
  overdueGoals: number;
  avgGoalProgress: number;
  goalCompletionRate: number;
  totalReviews: number;
  completedReviews: number;
  pendingReviews: number;
  avgReviewRating: number;
  reviewCompletionRate: number;
  totalFeedback: number;
  positiveFeedback: number;
  constructiveFeedback: number;
  avgSentimentScore: number;
  avgProductivity: number;
  avgQuality: number;
  avgCollaboration: number;
  performanceScore: number;
  avgWorkloadHours: number;
  avgStressLevel: number;
  avgWellbeingScore: number;
  totalActivities: number;
  activeUsers: number;
}

/**
 * Data Aggregation Service
 *
 * Provides comprehensive data aggregation for performance metrics across different
 * time periods (weekly, monthly, quarterly, yearly) and organizational scopes
 * (user, team, department, business unit, tenant).
 */
export class DataAggregationService {
  /**
   * Calculate period boundaries based on period type
   */
  getPeriodBoundaries(periodType: PeriodType, referenceDate: Date = new Date()): {
    start: Date;
    end: Date;
    label: string;
  } {
    let start: Date;
    let end: Date;
    let label: string;

    switch (periodType) {
      case 'weekly':
        start = startOfWeek(referenceDate, { weekStartsOn: 1 }); // Monday
        end = endOfWeek(referenceDate, { weekStartsOn: 1 });
        label = `Week ${format(start, 'w yyyy')}`;
        break;

      case 'monthly':
        start = startOfMonth(referenceDate);
        end = endOfMonth(referenceDate);
        label = format(start, 'MMMM yyyy');
        break;

      case 'quarterly':
        start = startOfQuarter(referenceDate);
        end = endOfQuarter(referenceDate);
        label = `Q${format(start, 'Q yyyy')}`;
        break;

      case 'yearly':
        start = startOfYear(referenceDate);
        end = endOfYear(referenceDate);
        label = format(start, 'yyyy');
        break;

      default:
        throw new Error(`Invalid period type: ${periodType}`);
    }

    return { start, end, label };
  }

  /**
   * Get previous period boundaries for comparison
   */
  getPreviousPeriod(periodType: PeriodType, currentStart: Date): {
    start: Date;
    end: Date;
    label: string;
  } {
    let previousDate: Date;

    switch (periodType) {
      case 'weekly':
        previousDate = subWeeks(currentStart, 1);
        break;
      case 'monthly':
        previousDate = subMonths(currentStart, 1);
        break;
      case 'quarterly':
        previousDate = subQuarters(currentStart, 1);
        break;
      case 'yearly':
        previousDate = subYears(currentStart, 1);
        break;
    }

    return this.getPeriodBoundaries(periodType, previousDate);
  }

  /**
   * Build where clause based on aggregation type and entity
   */
  private buildWhereClause(
    tenantId: string,
    aggregationType: AggregationType,
    entityId: string,
    periodStart: Date,
    periodEnd: Date
  ): any {
    const baseWhere: any = {
      tenantId,
      deletedAt: null,
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    };

    switch (aggregationType) {
      case 'user':
        return { ...baseWhere, userId: entityId };

      case 'team':
        // Goals and reviews linked to team members
        return {
          ...baseWhere,
          OR: [
            { userId: { in: [] } }, // Will be populated with team member IDs
            { teamId: entityId },
          ],
        };

      case 'department':
        return {
          ...baseWhere,
          user: {
            departmentId: entityId,
          },
        };

      case 'business_unit':
        return {
          ...baseWhere,
          user: {
            businessUnitId: entityId,
          },
        };

      case 'tenant':
        return baseWhere;

      default:
        throw new Error(`Invalid aggregation type: ${aggregationType}`);
    }
  }

  /**
   * Get team member IDs for team aggregation
   */
  private async getTeamMemberIds(teamId: string): Promise<string[]> {
    const members = await prisma.teamMember.findMany({
      where: { teamId, isActive: true },
      select: { userId: true },
    });
    return members.map(m => m.userId);
  }

  /**
   * Aggregate goal metrics for a period
   */
  private async aggregateGoalMetrics(
    whereClause: any,
    teamMemberIds?: string[]
  ): Promise<Partial<PerformanceMetrics>> {
    // Update where clause for team aggregation
    if (teamMemberIds && teamMemberIds.length > 0) {
      whereClause.userId = { in: teamMemberIds };
    }

    const goals = await prisma.goal.findMany({
      where: whereClause,
      select: {
        status: true,
        progress: true,
        targetDate: true,
      },
    });

    const now = new Date();
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.status === 'COMPLETED').length;
    const inProgressGoals = goals.filter(g => g.status === 'IN_PROGRESS').length;
    const notStartedGoals = goals.filter(g => g.status === 'NOT_STARTED').length;

    // Determine on-track, at-risk, overdue goals
    let onTrackGoals = 0;
    let atRiskGoals = 0;
    let overdueGoals = 0;
    let totalProgress = 0;

    goals.forEach(goal => {
      totalProgress += Number(goal.progress || 0);

      if (goal.status === 'COMPLETED') {
        onTrackGoals++;
      } else if (goal.targetDate && new Date(goal.targetDate) < now) {
        overdueGoals++;
      } else if (Number(goal.progress || 0) < 50) {
        atRiskGoals++;
      } else {
        onTrackGoals++;
      }
    });

    return {
      totalGoals,
      completedGoals,
      inProgressGoals,
      notStartedGoals,
      onTrackGoals,
      atRiskGoals,
      overdueGoals,
      avgGoalProgress: totalGoals > 0 ? totalProgress / totalGoals : 0,
      goalCompletionRate: totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0,
    };
  }

  /**
   * Aggregate review metrics for a period
   */
  private async aggregateReviewMetrics(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    teamMemberIds?: string[]
  ): Promise<Partial<PerformanceMetrics>> {
    const whereClause: any = {
      tenantId,
      deletedAt: null,
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    };

    if (teamMemberIds && teamMemberIds.length > 0) {
      whereClause.revieweeId = { in: teamMemberIds };
    }

    const reviews = await prisma.review.findMany({
      where: whereClause,
      select: {
        status: true,
        overallRating: true,
      },
    });

    const totalReviews = reviews.length;
    const completedReviews = reviews.filter(r => r.status === 'COMPLETED').length;
    const pendingReviews = totalReviews - completedReviews;

    const ratingsSum = reviews
      .filter(r => r.overallRating !== null)
      .reduce((sum, r) => sum + Number(r.overallRating), 0);

    const reviewsWithRatings = reviews.filter(r => r.overallRating !== null).length;

    return {
      totalReviews,
      completedReviews,
      pendingReviews,
      avgReviewRating: reviewsWithRatings > 0 ? ratingsSum / reviewsWithRatings : 0,
      reviewCompletionRate: totalReviews > 0 ? (completedReviews / totalReviews) * 100 : 0,
    };
  }

  /**
   * Aggregate feedback metrics for a period
   */
  private async aggregateFeedbackMetrics(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    teamMemberIds?: string[]
  ): Promise<Partial<PerformanceMetrics>> {
    const whereClause: any = {
      tenantId,
      deletedAt: null,
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    };

    if (teamMemberIds && teamMemberIds.length > 0) {
      whereClause.toUserId = { in: teamMemberIds };
    }

    const feedback = await prisma.feedback.findMany({
      where: whereClause,
      select: {
        type: true,
        sentiment: true,
      },
    });

    const totalFeedback = feedback.length;
    const positiveFeedback = feedback.filter(f => f.type === 'PRAISE').length;
    const constructiveFeedback = feedback.filter(f => f.type === 'CONSTRUCTIVE').length;

    // Calculate average sentiment (assuming sentiment is a number 0-1)
    const sentimentSum = feedback
      .filter(f => f.sentiment !== null)
      .reduce((sum, f) => sum + Number(f.sentiment), 0);

    const feedbackWithSentiment = feedback.filter(f => f.sentiment !== null).length;

    return {
      totalFeedback,
      positiveFeedback,
      constructiveFeedback,
      avgSentimentScore: feedbackWithSentiment > 0 ? sentimentSum / feedbackWithSentiment : 0,
    };
  }

  /**
   * Aggregate performance metrics from hourly and daily data
   */
  private async aggregatePerformanceMetrics(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    teamMemberIds?: string[]
  ): Promise<Partial<PerformanceMetrics>> {
    const whereClause: any = {
      tenantId,
      recordedAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    };

    if (teamMemberIds && teamMemberIds.length > 0) {
      whereClause.userId = { in: teamMemberIds };
    }

    // Get daily metrics for better aggregation
    const dailyMetrics = await prisma.dailyPerformanceMetric.findMany({
      where: whereClause,
      select: {
        productivity: true,
        quality: true,
        collaboration: true,
        performanceScore: true,
        workloadHours: true,
        stressLevel: true,
        wellbeingScore: true,
      },
    });

    const count = dailyMetrics.length;

    if (count === 0) {
      return {
        avgProductivity: 0,
        avgQuality: 0,
        avgCollaboration: 0,
        performanceScore: 0,
        avgWorkloadHours: 0,
        avgStressLevel: 0,
        avgWellbeingScore: 0,
      };
    }

    const sums = dailyMetrics.reduce((acc, metric: any) => ({
      productivity: acc.productivity + Number(metric.productivity || 0),
      quality: acc.quality + Number(metric.quality || 0),
      collaboration: acc.collaboration + Number(metric.collaboration || 0),
      performanceScore: acc.performanceScore + Number(metric.performanceScore || 0),
      workloadHours: acc.workloadHours + Number(metric.workloadHours || 0),
      stressLevel: acc.stressLevel + Number(metric.stressLevel || 0),
      wellbeingScore: acc.wellbeingScore + Number(metric.wellbeingScore || 0),
    }), {
      productivity: 0,
      quality: 0,
      collaboration: 0,
      performanceScore: 0,
      workloadHours: 0,
      stressLevel: 0,
      wellbeingScore: 0,
    });

    return {
      avgProductivity: sums.productivity / count,
      avgQuality: sums.quality / count,
      avgCollaboration: sums.collaboration / count,
      performanceScore: sums.performanceScore / count,
      avgWorkloadHours: sums.workloadHours / count,
      avgStressLevel: sums.stressLevel / count,
      avgWellbeingScore: sums.wellbeingScore / count,
    };
  }

  /**
   * Aggregate activity metrics
   */
  private async aggregateActivityMetrics(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    teamMemberIds?: string[]
  ): Promise<Partial<PerformanceMetrics>> {
    const whereClause: any = {
      tenantId,
      timestamp: {
        gte: periodStart,
        lte: periodEnd,
      },
    };

    if (teamMemberIds && teamMemberIds.length > 0) {
      whereClause.userId = { in: teamMemberIds };
    }

    const totalActivities = await prisma.activityEvent.count({
      where: whereClause,
    });

    const activeUsersResult = await prisma.activityEvent.findMany({
      where: whereClause,
      select: { userId: true },
      distinct: ['userId'],
    });

    return {
      totalActivities,
      activeUsers: activeUsersResult.length,
    };
  }

  /**
   * Aggregate all metrics for a specific period
   */
  async aggregateForPeriod(params: AggregationParams): Promise<PerformanceMetrics> {
    const { tenantId, aggregationType, entityId, periodType, periodStart, periodEnd } = params;

    logger.info('Starting data aggregation', {
      tenantId,
      aggregationType,
      entityId,
      periodType,
      periodStart,
      periodEnd,
    });

    // Get team member IDs if aggregating for a team
    let teamMemberIds: string[] | undefined;
    if (aggregationType === 'team') {
      teamMemberIds = await this.getTeamMemberIds(entityId);
    }

    // Build base where clause
    const baseWhere = this.buildWhereClause(tenantId, aggregationType, entityId, periodStart, periodEnd);

    // Aggregate all metrics in parallel for performance
    const [goalMetrics, reviewMetrics, feedbackMetrics, performanceMetrics, activityMetrics] = await Promise.all([
      this.aggregateGoalMetrics(baseWhere, teamMemberIds),
      this.aggregateReviewMetrics(tenantId, periodStart, periodEnd, teamMemberIds),
      this.aggregateFeedbackMetrics(tenantId, periodStart, periodEnd, teamMemberIds),
      this.aggregatePerformanceMetrics(tenantId, periodStart, periodEnd, teamMemberIds),
      this.aggregateActivityMetrics(tenantId, periodStart, periodEnd, teamMemberIds),
    ]);

    // Combine all metrics
    const aggregatedMetrics: PerformanceMetrics = {
      ...goalMetrics,
      ...reviewMetrics,
      ...feedbackMetrics,
      ...performanceMetrics,
      ...activityMetrics,
    } as PerformanceMetrics;

    logger.info('Data aggregation completed', {
      tenantId,
      aggregationType,
      entityId,
      metricsCount: Object.keys(aggregatedMetrics).length,
    });

    return aggregatedMetrics;
  }

  /**
   * Save aggregated data to database for caching
   */
  async saveAggregation(
    params: AggregationParams,
    metrics: PerformanceMetrics,
    label: string
  ): Promise<void> {
    const { tenantId, aggregationType, entityId, periodType, periodStart, periodEnd } = params;

    await prisma.performanceAggregation.upsert({
      where: {
        tenantId_aggregationType_entityId_periodType_periodStart: {
          tenantId,
          aggregationType,
          entityId,
          periodType,
          periodStart,
        },
      },
      create: {
        tenantId,
        aggregationType,
        entityId,
        entityType: aggregationType,
        periodType,
        periodStart,
        periodEnd,
        periodLabel: label,
        ...metrics,
      },
      update: {
        ...metrics,
        updatedAt: new Date(),
      },
    });

    logger.info('Aggregation saved to database', {
      tenantId,
      aggregationType,
      entityId,
      periodType,
      label,
    });
  }

  /**
   * Get or compute aggregation for a period (with caching)
   */
  async getOrComputeAggregation(
    tenantId: string,
    aggregationType: AggregationType,
    entityId: string,
    periodType: PeriodType,
    referenceDate: Date = new Date()
  ): Promise<PerformanceMetrics> {
    const { start, end, label } = this.getPeriodBoundaries(periodType, referenceDate);

    // Try to get cached aggregation
    const cached = await prisma.performanceAggregation.findUnique({
      where: {
        tenantId_aggregationType_entityId_periodType_periodStart: {
          tenantId,
          aggregationType,
          entityId,
          periodType,
          periodStart: start,
        },
      },
    });

    if (cached) {
      logger.info('Using cached aggregation', { tenantId, aggregationType, entityId, periodType, label });

      // Convert Prisma Decimal types to numbers
      return {
        totalGoals: cached.totalGoals,
        completedGoals: cached.completedGoals,
        inProgressGoals: cached.inProgressGoals,
        notStartedGoals: cached.notStartedGoals,
        onTrackGoals: cached.onTrackGoals,
        atRiskGoals: cached.atRiskGoals,
        overdueGoals: cached.overdueGoals,
        avgGoalProgress: Number(cached.avgGoalProgress || 0),
        goalCompletionRate: Number(cached.goalCompletionRate || 0),
        totalReviews: cached.totalReviews,
        completedReviews: cached.completedReviews,
        pendingReviews: cached.pendingReviews,
        avgReviewRating: Number(cached.avgReviewRating || 0),
        reviewCompletionRate: Number(cached.reviewCompletionRate || 0),
        totalFeedback: cached.totalFeedback,
        positiveFeedback: cached.positiveFeedback,
        constructiveFeedback: cached.constructiveFeedback,
        avgSentimentScore: Number(cached.avgSentimentScore || 0),
        avgProductivity: Number(cached.avgProductivity || 0),
        avgQuality: Number(cached.avgQuality || 0),
        avgCollaboration: Number(cached.avgCollaboration || 0),
        performanceScore: Number(cached.performanceScore || 0),
        avgWorkloadHours: Number(cached.avgWorkloadHours || 0),
        avgStressLevel: Number(cached.avgStressLevel || 0),
        avgWellbeingScore: Number(cached.avgWellbeingScore || 0),
        totalActivities: cached.totalActivities,
        activeUsers: cached.activeUsers,
      };
    }

    // Compute fresh aggregation
    const metrics = await this.aggregateForPeriod({
      tenantId,
      aggregationType,
      entityId,
      periodType,
      periodStart: start,
      periodEnd: end,
    });

    // Cache it
    await this.saveAggregation(
      { tenantId, aggregationType, entityId, periodType, periodStart: start, periodEnd: end },
      metrics,
      label
    );

    return metrics;
  }

  /**
   * Batch aggregate for multiple periods (for trend analysis)
   */
  async batchAggregateForPeriods(
    tenantId: string,
    aggregationType: AggregationType,
    entityId: string,
    periodType: PeriodType,
    numberOfPeriods: number = 12
  ): Promise<Array<{ period: string; metrics: PerformanceMetrics }>> {
    const results: Array<{ period: string; metrics: PerformanceMetrics }> = [];
    let currentDate = new Date();

    for (let i = 0; i < numberOfPeriods; i++) {
      const { start, label } = this.getPeriodBoundaries(periodType, currentDate);
      const metrics = await this.getOrComputeAggregation(
        tenantId,
        aggregationType,
        entityId,
        periodType,
        currentDate
      );

      results.unshift({ period: label, metrics });

      // Move to previous period
      switch (periodType) {
        case 'weekly':
          currentDate = subWeeks(currentDate, 1);
          break;
        case 'monthly':
          currentDate = subMonths(currentDate, 1);
          break;
        case 'quarterly':
          currentDate = subQuarters(currentDate, 1);
          break;
        case 'yearly':
          currentDate = subYears(currentDate, 1);
          break;
      }
    }

    return results;
  }
}

export const dataAggregationService = new DataAggregationService();
