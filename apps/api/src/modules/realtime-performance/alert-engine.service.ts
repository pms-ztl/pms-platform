/**
 * Alert Engine Sub-Service
 *
 * Handles deadline proximity alerts, deadline alert lifecycle (acknowledge/snooze),
 * and performance anomaly detection using z-score based statistical analysis.
 *
 * Covers:
 *  - Feature 4: Deadline Proximity Alert System
 *  - Feature 6: Instant Performance Anomaly Detector
 */

import { prisma } from '@pms/database';
import { MS_PER_HOUR, MS_PER_DAY } from '../../utils/constants';
import type { DeadlineAlertData, AnomalyDetectionResult } from './realtime-performance.service';

// ============================================================================
// Alert Engine Service
// ============================================================================

export class AlertEngineService {
  private anomalyThresholds = {
    productivity: { low: 1.5, medium: 2.0, high: 2.5, critical: 3.0 },
    engagement: { low: 1.5, medium: 2.0, high: 2.5, critical: 3.0 },
    activity: { low: 1.5, medium: 2.0, high: 2.5, critical: 3.0 },
  };

  // ==========================================================================
  // Feature 4: Deadline Proximity Alert System
  // ==========================================================================

  /**
   * Check and generate deadline alerts
   */
  async checkDeadlineAlerts(tenantId: string, userId: string): Promise<DeadlineAlertData[]> {
    const now = new Date();
    const alerts: DeadlineAlertData[] = [];

    // Check goals with deadlines
    const goals = await prisma.goal.findMany({
      where: {
        tenantId,
        ownerId: userId,
        deletedAt: null,
        status: 'ACTIVE',
        dueDate: { not: null },
      },
    });

    for (const goal of goals) {
      if (!goal.dueDate) continue;

      const daysUntil = Math.ceil(
        (goal.dueDate.getTime() - now.getTime()) / MS_PER_DAY
      );
      const hoursUntil = Math.ceil(
        (goal.dueDate.getTime() - now.getTime()) / MS_PER_HOUR
      );

      // Calculate completion probability
      const completionProbability = this.calculateCompletionProbability(
        goal.progress,
        daysUntil,
        goal.startDate ? (now.getTime() - goal.startDate.getTime()) / MS_PER_DAY : 0
      );

      // Determine alert level
      let alertLevel: 'info' | 'warning' | 'urgent' | 'overdue';
      if (daysUntil < 0) {
        alertLevel = 'overdue';
      } else if (daysUntil <= 1 || completionProbability < 30) {
        alertLevel = 'urgent';
      } else if (daysUntil <= 7 || completionProbability < 60) {
        alertLevel = 'warning';
      } else {
        alertLevel = 'info';
      }

      // Only alert for warning level and above
      if (alertLevel !== 'info') {
        alerts.push({
          entityType: 'goal',
          entityId: goal.id,
          entityTitle: goal.title,
          deadline: goal.dueDate,
          currentProgress: goal.progress,
          completionProbability,
          alertLevel,
        });

        // Create or update deadline alert in database
        await this.upsertDeadlineAlert(tenantId, userId, {
          entityType: 'goal',
          entityId: goal.id,
          entityTitle: goal.title,
          deadline: goal.dueDate,
          daysUntilDeadline: daysUntil,
          hoursUntilDeadline: hoursUntil,
          currentProgress: goal.progress,
          completionProbability,
          alertLevel,
        });
      }
    }

    // Check pending reviews
    const reviews = await prisma.review.findMany({
      where: {
        tenantId,
        reviewerId: userId,
        status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
      },
      include: {
        cycle: true,
      },
    });

    for (const review of reviews) {
      if (!review.cycle.managerReviewEnd) continue;

      const daysUntil = Math.ceil(
        (review.cycle.managerReviewEnd.getTime() - now.getTime()) / MS_PER_DAY
      );

      if (daysUntil <= 7) {
        let alertLevel: 'info' | 'warning' | 'urgent' | 'overdue';
        if (daysUntil < 0) alertLevel = 'overdue';
        else if (daysUntil <= 2) alertLevel = 'urgent';
        else alertLevel = 'warning';

        alerts.push({
          entityType: 'review',
          entityId: review.id,
          entityTitle: `Review for ${review.cycle.name}`,
          deadline: review.cycle.managerReviewEnd,
          currentProgress: review.status === 'IN_PROGRESS' ? 50 : 0,
          completionProbability: daysUntil <= 0 ? 0 : Math.max(0, 100 - (7 - daysUntil) * 15),
          alertLevel,
        });
      }
    }

    return alerts;
  }

  private calculateCompletionProbability(
    currentProgress: number,
    daysRemaining: number,
    daysElapsed: number
  ): number {
    if (daysRemaining <= 0) return currentProgress >= 100 ? 100 : 0;
    if (currentProgress >= 100) return 100;

    const totalDays = daysElapsed + daysRemaining;
    const expectedProgress = (daysElapsed / totalDays) * 100;
    const progressRatio = currentProgress / Math.max(1, expectedProgress);

    // Probability based on progress ratio and time remaining
    const baseProb = Math.min(100, progressRatio * 100);
    const timePenalty = daysRemaining < 7 ? (7 - daysRemaining) * 5 : 0;

    return Math.max(0, Math.min(100, baseProb - timePenalty));
  }

  private async upsertDeadlineAlert(
    tenantId: string,
    userId: string,
    data: any
  ): Promise<void> {
    const existing = await prisma.deadlineAlert.findFirst({
      where: {
        tenantId,
        userId,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    });

    if (existing) {
      await prisma.deadlineAlert.update({
        where: { id: existing.id },
        data: {
          daysUntilDeadline: data.daysUntilDeadline,
          hoursUntilDeadline: data.hoursUntilDeadline,
          currentProgress: data.currentProgress,
          completionProbability: data.completionProbability,
          alertLevel: data.alertLevel,
          requiredDailyProgress: data.daysUntilDeadline > 0
            ? (100 - data.currentProgress) / data.daysUntilDeadline
            : null,
        },
      });
    } else {
      await prisma.deadlineAlert.create({
        data: {
          tenantId,
          userId,
          entityType: data.entityType,
          entityId: data.entityId,
          entityTitle: data.entityTitle,
          deadline: data.deadline,
          daysUntilDeadline: data.daysUntilDeadline,
          hoursUntilDeadline: data.hoursUntilDeadline,
          currentProgress: data.currentProgress,
          completionProbability: data.completionProbability,
          alertLevel: data.alertLevel,
          requiredDailyProgress: data.daysUntilDeadline > 0
            ? (100 - data.currentProgress) / data.daysUntilDeadline
            : null,
        },
      });
    }
  }

  /**
   * Get active deadline alerts for a user
   */
  async getActiveDeadlineAlerts(tenantId: string, userId: string): Promise<any[]> {
    return prisma.deadlineAlert.findMany({
      where: {
        tenantId,
        userId,
        isAcknowledged: false,
        OR: [
          { isSnoozed: false },
          { snoozedUntil: { lt: new Date() } },
        ],
      },
      orderBy: [
        { alertLevel: 'desc' },
        { deadline: 'asc' },
      ],
    });
  }

  /**
   * Acknowledge a deadline alert
   */
  async acknowledgeDeadlineAlert(tenantId: string, userId: string, alertId: string): Promise<void> {
    await prisma.deadlineAlert.updateMany({
      where: {
        id: alertId,
        tenantId,
        userId,
      },
      data: {
        isAcknowledged: true,
      },
    });
  }

  /**
   * Snooze a deadline alert
   */
  async snoozeDeadlineAlert(tenantId: string, userId: string, alertId: string, hours: number): Promise<void> {
    const snoozedUntil = new Date();
    snoozedUntil.setHours(snoozedUntil.getHours() + hours);

    await prisma.deadlineAlert.updateMany({
      where: {
        id: alertId,
        tenantId,
        userId,
      },
      data: {
        isSnoozed: true,
        snoozedUntil,
      },
    });
  }

  // ==========================================================================
  // Feature 6: Instant Performance Anomaly Detector
  // ==========================================================================

  /**
   * Detect performance anomalies for a user
   */
  async detectAnomalies(tenantId: string, userId: string): Promise<AnomalyDetectionResult[]> {
    const anomalies: AnomalyDetectionResult[] = [];
    const now = new Date();

    // Get baseline data (last 30 days)
    const baselineStart = new Date(now);
    baselineStart.setDate(baselineStart.getDate() - 30);

    const baselineMetrics = await prisma.dailyPerformanceMetric.findMany({
      where: {
        tenantId,
        userId,
        metricDate: { gte: baselineStart, lt: now },
      },
    });

    if (baselineMetrics.length < 7) {
      // Not enough data for baseline
      return [];
    }

    // Get recent data (last 7 days)
    const recentStart = new Date(now);
    recentStart.setDate(recentStart.getDate() - 7);

    const recentMetrics = await prisma.dailyPerformanceMetric.findMany({
      where: {
        tenantId,
        userId,
        metricDate: { gte: recentStart },
      },
    });

    // Calculate baseline statistics
    const productivityBaseline = this.calculateStats(
      baselineMetrics.map(m => Number(m.avgProductivityScore || 0)).filter(v => v > 0)
    );

    const engagementBaseline = this.calculateStats(
      baselineMetrics.map(m => Number(m.avgEngagementScore || 0)).filter(v => v > 0)
    );

    const activityBaseline = this.calculateStats(
      baselineMetrics.map(m => m.totalActiveMinutes).filter(v => v > 0)
    );

    // Check recent values for anomalies
    for (const metric of recentMetrics) {
      // Productivity anomaly
      if (metric.avgProductivityScore && productivityBaseline.stdDev > 0) {
        const zScore = (Number(metric.avgProductivityScore) - productivityBaseline.mean) / productivityBaseline.stdDev;
        if (Math.abs(zScore) >= this.anomalyThresholds.productivity.low) {
          anomalies.push(this.createAnomaly(
            'productivity',
            'productivity_score',
            productivityBaseline.mean,
            Number(metric.avgProductivityScore),
            zScore
          ));
        }
      }

      // Engagement anomaly
      if (metric.avgEngagementScore && engagementBaseline.stdDev > 0) {
        const zScore = (Number(metric.avgEngagementScore) - engagementBaseline.mean) / engagementBaseline.stdDev;
        if (Math.abs(zScore) >= this.anomalyThresholds.engagement.low) {
          anomalies.push(this.createAnomaly(
            'engagement',
            'engagement_score',
            engagementBaseline.mean,
            Number(metric.avgEngagementScore),
            zScore
          ));
        }
      }

      // Activity anomaly
      if (activityBaseline.stdDev > 0) {
        const zScore = (metric.totalActiveMinutes - activityBaseline.mean) / activityBaseline.stdDev;
        if (Math.abs(zScore) >= this.anomalyThresholds.activity.low) {
          anomalies.push(this.createAnomaly(
            'activity',
            'active_minutes',
            activityBaseline.mean,
            metric.totalActiveMinutes,
            zScore
          ));
        }
      }
    }

    // Store detected anomalies
    for (const anomaly of anomalies.filter(a => a.isAnomaly)) {
      await prisma.performanceAnomaly.create({
        data: {
          tenantId,
          userId,
          anomalyType: anomaly.anomalyType!,
          severity: anomaly.severity!,
          metricName: anomaly.metricName,
          expectedValue: anomaly.expectedValue,
          actualValue: anomaly.actualValue,
          deviationPercentage: anomaly.deviationPercentage,
          zScore: anomaly.zScore,
          detectionWindowStart: recentStart,
          detectionWindowEnd: now,
          baselinePeriodDays: 30,
        },
      });
    }

    return anomalies;
  }

  private calculateStats(values: number[]): { mean: number; stdDev: number } {
    if (values.length === 0) return { mean: 0, stdDev: 0 };

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
  }

  private createAnomaly(
    type: string,
    metricName: string,
    expected: number,
    actual: number,
    zScore: number
  ): AnomalyDetectionResult {
    const absZScore = Math.abs(zScore);
    let severity: 'low' | 'medium' | 'high' | 'critical' | undefined;

    if (absZScore >= 3.0) severity = 'critical';
    else if (absZScore >= 2.5) severity = 'high';
    else if (absZScore >= 2.0) severity = 'medium';
    else if (absZScore >= 1.5) severity = 'low';

    return {
      isAnomaly: severity !== undefined,
      anomalyType: type,
      severity,
      metricName,
      expectedValue: Math.round(expected * 100) / 100,
      actualValue: Math.round(actual * 100) / 100,
      deviationPercentage: Math.round(((actual - expected) / expected) * 100 * 100) / 100,
      zScore: Math.round(zScore * 100) / 100,
    };
  }
}

export const alertEngineService = new AlertEngineService();
