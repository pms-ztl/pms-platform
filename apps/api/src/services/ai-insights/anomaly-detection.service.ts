/**
 * Anomaly Detection Service
 * Pattern recognition for burnout, disengagement, and performance decline
 */

import axios from 'axios';
import { PrismaClient } from '@pms/database';

const prisma = new PrismaClient();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

export interface AnomalyDetectionResult {
  is_anomaly: boolean;
  anomaly_score: number;
  confidence_score: number;
  anomaly_types: string[];
  severity: string;
  detection_method: string;
  current_metrics: Record<string, number>;
  deviations: Record<string, any>;
  contributing_factors: string[];
  risk_level: string;
  urgency: string;
  recommendations: string[];
  suggested_actions: Array<{
    action: string;
    priority: string;
    timeframe: string;
  }>;
}

export class AnomalyDetectionService {
  /**
   * Detect anomalies for entity
   */
  async detectAnomalies(params: {
    tenantId: string;
    entityType: 'USER' | 'TEAM';
    entityId: string;
  }): Promise<any> {
    try {
      // Collect metrics
      const metrics = await this.collectMetrics(params);

      // Call ML service
      const response = await axios.post<AnomalyDetectionResult>(
        `${ML_SERVICE_URL}/api/ml/anomaly/detect`,
        {
          metrics,
          entity_type: params.entityType
        },
        { timeout: 30000 }
      );

      const result = response.data;

      // Only store if anomaly detected
      if (result.is_anomaly) {
        const anomaly = await prisma.anomalyDetection.create({
          data: {
            tenantId: params.tenantId,
            entityType: params.entityType,
            entityId: params.entityId,
            anomalyType: result.anomaly_types[0] || 'GENERAL_ANOMALY',
            anomalyCategory: this.categorizeAnomaly(result.anomaly_types),
            severity: result.severity,
            anomalyScore: result.anomaly_score,
            confidenceScore: result.confidence_score,
            detectionMethod: result.detection_method,
            currentValue: result.current_metrics.productivity_score,
            expectedValue: 50, // Would come from baseline
            deviation: result.current_metrics.productivity_score - 50,
            deviationPercentage: ((result.current_metrics.productivity_score - 50) / 50) * 100,
            indicators: result.current_metrics,
            contributingFactors: result.contributing_factors,
            riskLevel: result.risk_level,
            urgency: result.urgency,
            recommendations: result.recommendations,
            suggestedActions: result.suggested_actions,
            modelVersion: '1.0.0',
            detectedAt: new Date()
          }
        });

        return anomaly;
      }

      return null;
    } catch (error) {
      console.error('Anomaly detection error:', error);
      throw error;
    }
  }

  /**
   * Collect metrics for anomaly detection
   */
  private async collectMetrics(params: {
    tenantId: string;
    entityType: string;
    entityId: string;
  }): Promise<Record<string, any>> {
    const { tenantId, entityType, entityId } = params;
    const metrics: Record<string, any> = {};

    if (entityType === 'USER') {
      // Get latest productivity prediction
      const latestProductivity = await prisma.productivityPrediction.findFirst({
        where: { entityType: 'USER', entityId, tenantId },
        orderBy: { predictionDate: 'desc' }
      });

      // Get latest engagement score
      const latestEngagement = await prisma.engagementScore.findFirst({
        where: { userId: entityId, tenantId },
        orderBy: { scoreDate: 'desc' }
      });

      // Get recent sentiment
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const recentSentiment = await prisma.sentimentAnalysis.findMany({
        where: {
          userId: entityId,
          tenantId,
          analyzedAt: { gte: weekAgo }
        },
        select: { sentimentScore: true }
      });

      const avgSentiment = recentSentiment.length > 0
        ? recentSentiment.reduce((sum, s) => sum + Number(s.sentimentScore), 0) / recentSentiment.length
        : 0;

      // Get goal completion rate
      const goals = await prisma.goal.findMany({
        where: { ownerId: entityId, tenantId },
        select: { progress: true, status: true }
      });

      const completedGoals = goals.filter(g => g.status === 'COMPLETED').length;
      const totalGoals = goals.length || 1;

      metrics.productivity_score = latestProductivity ? Number(latestProductivity.predictedScore) : 50;
      metrics.engagement_score = latestEngagement ? Number(latestEngagement.overallScore) : 50;
      metrics.sentiment_score = avgSentiment;
      metrics.hours_worked = 40; // Would come from time tracking
      metrics.tasks_completed = completedGoals;
      metrics.meeting_hours = 10; // Would come from calendar
      metrics.avg_response_time_hours = 4;
      metrics.collaboration_score = latestEngagement ? Number(latestEngagement.collaborationScore) : 50;
      metrics.code_quality_score = 70;
      metrics.bug_rate = 0.05;

      // Get trends
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);

      const historicalProductivity = await prisma.productivityPrediction.findMany({
        where: {
          entityType: 'USER',
          entityId,
          tenantId,
          predictionDate: { gte: monthAgo }
        },
        orderBy: { predictionDate: 'asc' }
      });

      if (historicalProductivity.length >= 2) {
        const recent = Number(historicalProductivity[historicalProductivity.length - 1].predictedScore);
        const older = Number(historicalProductivity[0].predictedScore);
        metrics.productivity_trend_30d = recent - older;
      }

      const historicalSentiment = await prisma.sentimentTrend.findMany({
        where: {
          userId: entityId,
          tenantId,
          periodStart: { gte: monthAgo }
        },
        orderBy: { periodStart: 'asc' }
      });

      if (historicalSentiment.length >= 2) {
        const recent = Number(historicalSentiment[historicalSentiment.length - 1].avgSentimentScore);
        const older = Number(historicalSentiment[0].avgSentimentScore);
        metrics.sentiment_trend_30d = recent - older;
      }

      // Meeting attendance
      metrics.meeting_attendance_rate = 0.8;

      // Communication frequency
      metrics.communication_frequency = recentSentiment.length;
    }

    return metrics;
  }

  /**
   * Categorize anomaly type
   */
  private categorizeAnomaly(anomalyTypes: string[]): string {
    if (anomalyTypes.some(t => t.includes('PRODUCTIVITY') || t.includes('PERFORMANCE'))) {
      return 'PRODUCTIVITY';
    }
    if (anomalyTypes.some(t => t.includes('ENGAGEMENT') || t.includes('DISENGAGEMENT'))) {
      return 'ENGAGEMENT';
    }
    if (anomalyTypes.some(t => t.includes('SENTIMENT'))) {
      return 'SENTIMENT';
    }
    if (anomalyTypes.some(t => t.includes('BURNOUT') || t.includes('OVERWORK'))) {
      return 'BEHAVIOR';
    }
    return 'GENERAL';
  }

  /**
   * Acknowledge anomaly
   */
  async acknowledgeAnomaly(params: {
    anomalyId: string;
    acknowledgedBy: string;
  }): Promise<any> {
    return prisma.anomalyDetection.update({
      where: { id: params.anomalyId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedBy: params.acknowledgedBy,
        acknowledgedAt: new Date()
      }
    });
  }

  /**
   * Resolve anomaly
   */
  async resolveAnomaly(params: {
    anomalyId: string;
    resolution: string;
  }): Promise<any> {
    return prisma.anomalyDetection.update({
      where: { id: params.anomalyId },
      data: {
        status: 'RESOLVED',
        resolution: params.resolution,
        resolvedAt: new Date()
      }
    });
  }

  /**
   * Get active anomalies
   */
  async getActiveAnomalies(params: {
    tenantId: string;
    severity?: string;
    entityType?: string;
  }): Promise<any[]> {
    return prisma.anomalyDetection.findMany({
      where: {
        tenantId: params.tenantId,
        status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
        ...(params.severity && { severity: params.severity }),
        ...(params.entityType && { entityType: params.entityType })
      },
      orderBy: [
        { severity: 'desc' },
        { detectedAt: 'desc' }
      ],
      include: {
        acknowledger: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
  }

  /**
   * Get anomaly statistics
   */
  async getAnomalyStatistics(params: {
    tenantId: string;
    days?: number;
  }): Promise<any> {
    const days = params.days || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const anomalies = await prisma.anomalyDetection.findMany({
      where: {
        tenantId: params.tenantId,
        detectedAt: { gte: since }
      }
    });

    const bySeverity = anomalies.reduce((acc, a) => {
      acc[a.severity] = (acc[a.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = anomalies.reduce((acc, a) => {
      acc[a.anomalyType] = (acc[a.anomalyType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = anomalies.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: anomalies.length,
      bySeverity,
      byType,
      byStatus,
      avgResolutionTime: this.calculateAvgResolutionTime(anomalies)
    };
  }

  /**
   * Calculate average resolution time
   */
  private calculateAvgResolutionTime(anomalies: any[]): number | null {
    const resolved = anomalies.filter(a => a.resolvedAt);

    if (resolved.length === 0) return null;

    const totalMs = resolved.reduce((sum, a) => {
      const detectedTime = new Date(a.detectedAt).getTime();
      const resolvedTime = new Date(a.resolvedAt).getTime();
      return sum + (resolvedTime - detectedTime);
    }, 0);

    const avgMs = totalMs / resolved.length;
    return Math.round(avgMs / (1000 * 60 * 60)); // Convert to hours
  }

  /**
   * Create anomaly pattern
   */
  async createAnomalyPattern(params: {
    tenantId: string;
    patternName: string;
    patternType: string;
    description?: string;
    indicators: Record<string, any>;
    detectionRules: Record<string, any>;
    thresholds: Record<string, any>;
    severity: string;
    sensitivity?: number;
  }): Promise<any> {
    return prisma.anomalyPattern.create({
      data: {
        tenantId: params.tenantId,
        patternName: params.patternName,
        patternType: params.patternType,
        description: params.description,
        indicators: params.indicators,
        detectionRules: params.detectionRules,
        thresholds: params.thresholds,
        severity: params.severity,
        sensitivity: params.sensitivity || 0.7
      }
    });
  }
}
