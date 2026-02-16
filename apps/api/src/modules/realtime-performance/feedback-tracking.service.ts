/**
 * Feedback Tracking Sub-Service
 *
 * Handles communication sentiment analysis, feedback sentiment scoring,
 * and team morale snapshots.
 *
 * Covers:
 *  - Feature 7: Real-Time Communication Sentiment Gauge
 */

import { prisma } from '@pms/database';
import type { SentimentAnalysis } from './realtime-performance.service';

// ============================================================================
// Feedback Tracking Service
// ============================================================================

export class FeedbackTrackingService {
  // ==========================================================================
  // Feature 7: Real-Time Communication Sentiment Gauge
  // ==========================================================================

  /**
   * Analyze communication sentiment for a user
   */
  async analyzeSentiment(
    tenantId: string,
    userId: string,
    periodDays: number = 7
  ): Promise<SentimentAnalysis> {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - periodDays);

    // Get feedback given and received
    const feedbackGiven = await prisma.feedback.findMany({
      where: {
        tenantId,
        fromUserId: userId,
        createdAt: { gte: periodStart },
      },
      select: { type: true, sentimentScore: true },
    });

    const feedbackReceived = await prisma.feedback.findMany({
      where: {
        tenantId,
        toUserId: userId,
        createdAt: { gte: periodStart },
      },
      select: { type: true, sentimentScore: true },
    });

    // Get goal comments
    const goalComments = await prisma.goalComment.findMany({
      where: {
        authorId: userId,
        createdAt: { gte: periodStart },
      },
    });

    // Calculate sentiment scores
    const feedbackSentiment = this.calculateFeedbackSentiment([...feedbackGiven, ...feedbackReceived]);

    // Simple sentiment analysis based on feedback types
    const positiveCount = feedbackGiven.filter(f =>
      f.type === 'PRAISE' || f.type === 'RECOGNITION'
    ).length;
    const constructiveCount = feedbackGiven.filter(f => f.type === 'CONSTRUCTIVE').length;
    const totalFeedback = feedbackGiven.length;

    const positivityRatio = totalFeedback > 0 ? positiveCount / totalFeedback : 0.5;

    // Collaboration sentiment based on interaction frequency
    const collaborationSentiment = Math.min(1, (feedbackGiven.length + feedbackReceived.length) / 10);

    // Stress indicators (negative if lots of missed deadlines or declining metrics)
    const deadlineAlerts = await prisma.deadlineAlert.count({
      where: {
        tenantId,
        userId,
        alertLevel: { in: ['urgent', 'overdue'] },
        createdAt: { gte: periodStart },
      },
    });
    const stressIndicators = Math.min(1, deadlineAlerts / 5);

    // Overall sentiment score (-1 to 1)
    const overallScore = (positivityRatio * 2 - 1) * 0.4 +
      (collaborationSentiment * 2 - 1) * 0.3 +
      (1 - stressIndicators * 2) * 0.3;

    // Morale alert if sentiment is consistently negative
    const moraleAlert = overallScore < -0.3 || stressIndicators > 0.6;
    const moraleAlertReason = moraleAlert
      ? stressIndicators > 0.6
        ? 'High number of deadline alerts indicating potential burnout'
        : 'Low overall sentiment score in recent communications'
      : undefined;

    // Save analysis
    await prisma.communicationSentiment.create({
      data: {
        tenantId,
        userId,
        analysisPeriodStart: periodStart,
        analysisPeriodEnd: now,
        overallSentimentScore: overallScore,
        positivityRatio,
        collaborationSentiment,
        stressIndicators,
        feedbackSentiment,
        moraleAlert,
        moraleAlertReason,
        communicationFrequency: totalFeedback > 5 ? 'high' : totalFeedback > 2 ? 'normal' : 'low',
        engagementLevel: collaborationSentiment > 0.7 ? 'highly_engaged' :
          collaborationSentiment > 0.3 ? 'normal' : 'disengaged',
      },
    });

    return {
      overallScore,
      positivityRatio,
      collaborationSentiment,
      stressIndicators,
      moraleAlert,
      moraleAlertReason,
    };
  }

  private calculateFeedbackSentiment(feedback: any[]): number {
    if (feedback.length === 0) return 0;

    const scores = feedback.map(f => {
      if (f.sentimentScore) return Number(f.sentimentScore);
      if (f.type === 'PRAISE' || f.type === 'RECOGNITION') return 1;
      if (f.type === 'CONSTRUCTIVE') return 0;
      return 0;
    });

    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  /**
   * Get team morale snapshot
   */
  async getTeamMorale(tenantId: string, managerId: string): Promise<any> {
    // Get team members
    const teamMembers = await prisma.user.findMany({
      where: {
        tenantId,
        managerId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, firstName: true, lastName: true },
    });

    const sentiments = await Promise.all(
      teamMembers.map(async member => {
        const analysis = await this.analyzeSentiment(tenantId, member.id);
        return {
          userId: member.id,
          name: `${member.firstName} ${member.lastName}`,
          ...analysis,
        };
      })
    );

    const avgSentiment = sentiments.length > 0
      ? sentiments.reduce((sum, s) => sum + s.overallScore, 0) / sentiments.length
      : 0;
    const moraleIndex = ((avgSentiment + 1) / 2) * 100; // Convert -1 to 1 scale to 0-100

    return {
      teamMembers: sentiments,
      teamMetrics: {
        avgSentimentScore: avgSentiment,
        moraleIndex,
        highMoraleCount: sentiments.filter(s => s.overallScore > 0.3).length,
        neutralMoraleCount: sentiments.filter(s => s.overallScore >= -0.3 && s.overallScore <= 0.3).length,
        lowMoraleCount: sentiments.filter(s => s.overallScore < -0.3).length,
        membersWithAlerts: sentiments.filter(s => s.moraleAlert).length,
      },
    };
  }
}

export const feedbackTrackingService = new FeedbackTrackingService();
