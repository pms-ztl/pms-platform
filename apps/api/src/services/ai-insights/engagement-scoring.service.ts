/**
 * Engagement Scoring Service
 * Real-time engagement calculation and tracking
 */

import axios from 'axios';
import { prisma } from '@pms/database';
import { DAYS } from '../../utils/constants';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

export interface EngagementScoreResult {
  overall_score: number;
  score_level: string;
  component_scores: {
    participation: number;
    communication: number;
    collaboration: number;
    initiative: number;
    responsiveness: number;
  };
  activity_metrics: Record<string, any>;
  engagement_patterns: Record<string, any>;
  trend_direction?: string;
  change_from_previous?: number;
  week_over_week_change?: number;
  risk_factors: string[];
  at_risk: boolean;
  risk_level?: string;
}

export class EngagementScoringService {
  /**
   * Calculate engagement score for user
   */
  async calculateEngagementScore(params: {
    tenantId: string;
    userId: string;
    scoreDate?: Date;
    calculationPeriod?: 'REAL_TIME' | 'DAILY' | 'WEEKLY';
  }): Promise<any> {
    const scoreDate = params.scoreDate || new Date();
    const calculationPeriod = params.calculationPeriod || 'DAILY';

    try {
      // Collect metrics
      const metrics = await this.collectEngagementMetrics({
        tenantId: params.tenantId,
        userId: params.userId,
        scoreDate
      });

      // Call ML service
      const response = await axios.post<EngagementScoreResult>(
        `${ML_SERVICE_URL}/api/ml/engagement/score`,
        { metrics },
        { timeout: 30000 }
      );

      const result = response.data;

      // Get previous score for trend
      const previousScore = await prisma.engagementScore.findFirst({
        where: {
          tenantId: params.tenantId,
          userId: params.userId,
          scoreDate: { lt: scoreDate }
        },
        orderBy: { scoreDate: 'desc' }
      });

      const weekAgoScore = await prisma.engagementScore.findFirst({
        where: {
          tenantId: params.tenantId,
          userId: params.userId,
          scoreDate: {
            lte: new Date(scoreDate.getTime() - DAYS(7))
          }
        },
        orderBy: { scoreDate: 'desc' }
      });

      const changeFromPrevious = previousScore
        ? result.overall_score - Number(previousScore.overallScore)
        : null;

      const weekOverWeekChange = weekAgoScore
        ? result.overall_score - Number(weekAgoScore.overallScore)
        : null;

      // Determine trend
      let trendDirection: string | null = null;
      if (changeFromPrevious !== null) {
        if (changeFromPrevious > 5) trendDirection = 'IMPROVING';
        else if (changeFromPrevious < -5) trendDirection = 'DECLINING';
        else trendDirection = 'STABLE';
      }

      // Store engagement score
      const engagementScore = await prisma.engagementScore.upsert({
        where: {
          tenantId_userId_scoreDate_calculationPeriod: {
            tenantId: params.tenantId,
            userId: params.userId,
            scoreDate,
            calculationPeriod
          }
        },
        create: {
          tenantId: params.tenantId,
          userId: params.userId,
          scoreDate,
          calculationPeriod,
          overallScore: result.overall_score,
          scoreLevel: result.score_level,
          participationScore: result.component_scores.participation,
          communicationScore: result.component_scores.communication,
          collaborationScore: result.component_scores.collaboration,
          initiativeScore: result.component_scores.initiative,
          responsivenessScore: result.component_scores.responsiveness,
          activityMetrics: result.activity_metrics,
          engagementPatterns: result.engagement_patterns,
          trendDirection,
          changeFromPrevious,
          weekOverWeekChange,
          riskFactors: result.risk_factors,
          atRisk: result.at_risk,
          riskLevel: result.risk_level,
          calculatedAt: new Date()
        },
        update: {
          overallScore: result.overall_score,
          scoreLevel: result.score_level,
          participationScore: result.component_scores.participation,
          communicationScore: result.component_scores.communication,
          collaborationScore: result.component_scores.collaboration,
          initiativeScore: result.component_scores.initiative,
          responsivenessScore: result.component_scores.responsiveness,
          activityMetrics: result.activity_metrics,
          engagementPatterns: result.engagement_patterns,
          trendDirection,
          changeFromPrevious,
          weekOverWeekChange,
          riskFactors: result.risk_factors,
          atRisk: result.at_risk,
          riskLevel: result.risk_level,
          calculatedAt: new Date()
        }
      });

      return engagementScore;
    } catch (error) {
      console.error('Engagement scoring error:', error);
      throw error;
    }
  }

  /**
   * Collect engagement metrics from various sources
   */
  private async collectEngagementMetrics(params: {
    tenantId: string;
    userId: string;
    scoreDate: Date;
  }): Promise<Record<string, any>> {
    const { tenantId, userId, scoreDate } = params;

    // Calculate lookback period (last 7 days)
    const weekAgo = new Date(scoreDate);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const metrics: Record<string, any> = {};

    // Get engagement events
    const events = await prisma.engagementEvent.findMany({
      where: {
        tenantId,
        userId,
        eventTimestamp: { gte: weekAgo, lte: scoreDate }
      }
    });

    // Count by category
    const eventsByCategory = events.reduce((acc, event) => {
      acc[event.eventCategory] = (acc[event.eventCategory] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Participation metrics
    metrics.meetings_attended = eventsByCategory.PARTICIPATION || 0;
    metrics.total_meetings = 10; // Would come from calendar integration
    metrics.meeting_participation_rate = 0.7;
    metrics.forum_posts = 0;
    metrics.events_attended = 0;
    metrics.surveys_completed = 0;
    metrics.total_surveys = 1;

    // Communication metrics
    metrics.messages_sent = eventsByCategory.COMMUNICATION || 0;
    metrics.expected_messages_per_week = 50;
    metrics.responses_to_mentions = 0;
    metrics.total_mentions = 1;
    metrics.communication_clarity = 0.7;
    metrics.reactions_given = 0;

    // Collaboration metrics
    metrics.code_reviews_given = eventsByCategory.COLLABORATION || 0;
    metrics.pair_programming_sessions = 0;
    metrics.knowledge_contributions = 0;
    metrics.cross_team_collaborations = 0;
    metrics.mentoring_sessions = 0;

    // Initiative metrics
    metrics.self_initiated_tasks = 0;
    metrics.improvements_suggested = 0;
    metrics.voluntary_contributions = 0;
    metrics.proactive_problem_solving = 0;
    metrics.learning_activities = 0;

    // Responsiveness metrics
    metrics.avg_response_time_hours = 4;
    metrics.response_rate = 0.8;
    metrics.availability_percentage = 0.85;
    metrics.acknowledgment_rate = 0.75;

    // Pattern data
    metrics.hourly_activity_distribution = {};
    metrics.daily_activity_distribution = {};
    metrics.activity_variance = 20;
    metrics.synchronous_engagement_pct = 40;
    metrics.asynchronous_engagement_pct = 60;

    // Trend data
    const previousScore = await prisma.engagementScore.findFirst({
      where: { tenantId, userId, scoreDate: { lt: scoreDate } },
      orderBy: { scoreDate: 'desc' }
    });

    const weekAgoScore = await prisma.engagementScore.findFirst({
      where: {
        tenantId,
        userId,
        scoreDate: { lte: weekAgo }
      },
      orderBy: { scoreDate: 'desc' }
    });

    metrics.current_engagement_score = 50;
    metrics.previous_engagement_score = previousScore ? Number(previousScore.overallScore) : 50;
    metrics.week_ago_engagement_score = weekAgoScore ? Number(weekAgoScore.overallScore) : 50;
    metrics.engagement_trend = metrics.current_engagement_score - metrics.previous_engagement_score;

    // Activity summary
    metrics.total_activities = events.length;
    metrics.active_days = new Set(events.map(e => e.eventTimestamp.toDateString())).size;
    metrics.avg_daily_activities = events.length / 7;
    metrics.consistency_score = 50;

    return metrics;
  }

  /**
   * Track engagement event
   */
  async trackEngagementEvent(params: {
    tenantId: string;
    userId: string;
    eventType: string;
    eventCategory: string;
    eventData?: Record<string, any>;
    engagementImpact?: number;
    positiveIndicator?: boolean;
    sourceSystem?: string;
    sourceReference?: string;
  }): Promise<any> {
    return prisma.engagementEvent.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        eventType: params.eventType,
        eventCategory: params.eventCategory,
        eventData: params.eventData || {},
        engagementImpact: params.engagementImpact || 1.0,
        positiveIndicator: params.positiveIndicator ?? true,
        sourceSystem: params.sourceSystem,
        sourceReference: params.sourceReference,
        eventTimestamp: new Date()
      }
    });
  }

  /**
   * Get engagement history
   */
  async getEngagementHistory(params: {
    tenantId: string;
    userId: string;
    days?: number;
  }): Promise<any[]> {
    const days = params.days || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    return prisma.engagementScore.findMany({
      where: {
        tenantId: params.tenantId,
        userId: params.userId,
        scoreDate: { gte: since }
      },
      orderBy: { scoreDate: 'asc' }
    });
  }

  /**
   * Get at-risk users
   */
  async getAtRiskUsers(params: {
    tenantId: string;
    riskLevel?: string;
  }): Promise<any[]> {
    const latestScores = await prisma.$queryRaw`
      SELECT DISTINCT ON (user_id) *
      FROM engagement_scores
      WHERE tenant_id = ${params.tenantId}
        AND at_risk = true
        ${params.riskLevel ? prisma.$queryRaw`AND risk_level = ${params.riskLevel}` : prisma.$queryRaw``}
      ORDER BY user_id, score_date DESC
    `;

    return latestScores as any[];
  }

  /**
   * Get engagement summary for team
   */
  async getTeamEngagementSummary(params: {
    tenantId: string;
    teamId: string;
  }): Promise<any> {
    // Get team members
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: params.teamId },
      select: { userId: true }
    });

    const userIds = teamMembers.map(m => m.userId);

    // Get latest scores for all members
    const scores = await prisma.engagementScore.findMany({
      where: {
        tenantId: params.tenantId,
        userId: { in: userIds }
      },
      orderBy: { scoreDate: 'desc' },
      distinct: ['userId']
    });

    if (scores.length === 0) {
      return {
        avgScore: 0,
        atRiskCount: 0,
        distribution: {}
      };
    }

    const avgScore = scores.reduce((sum, s) => sum + Number(s.overallScore), 0) / scores.length;
    const atRiskCount = scores.filter(s => s.atRisk).length;

    const distribution = scores.reduce((acc, s) => {
      acc[s.scoreLevel] = (acc[s.scoreLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      teamSize: userIds.length,
      scoresAvailable: scores.length,
      avgScore: Number(avgScore.toFixed(2)),
      atRiskCount,
      atRiskPercentage: Number(((atRiskCount / scores.length) * 100).toFixed(1)),
      distribution
    };
  }
}
