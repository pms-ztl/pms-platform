/**
 * Productivity Prediction Service
 * Integrates with ML service for productivity forecasting
 */

import axios from 'axios';
import { prisma } from '@pms/database';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

export interface ProductivityPredictionResult {
  predicted_score: number;
  confidence: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  feature_importance?: Record<string, number>;
  positive_factors: string[];
  negative_factors: string[];
  recommendations: string[];
}

export class ProductivityPredictionService {
  /**
   * Predict productivity for entity (user, team, department)
   */
  async predictProductivity(params: {
    tenantId: string;
    entityType: 'USER' | 'TEAM' | 'DEPARTMENT';
    entityId: string;
    predictionType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
    predictionDate: Date;
    features: Record<string, any>;
  }): Promise<any> {
    try {
      // Call ML service
      const response = await axios.post<ProductivityPredictionResult>(
        `${ML_SERVICE_URL}/api/ml/productivity/predict`,
        { features: params.features },
        { timeout: 30000 }
      );

      const result = response.data;

      // Store prediction in database
      const prediction = await prisma.productivityPrediction.create({
        data: {
          tenantId: params.tenantId,
          entityType: params.entityType,
          entityId: params.entityId,
          predictionType: params.predictionType,
          predictionDate: params.predictionDate,
          predictedScore: result.predicted_score,
          confidence: result.confidence,
          confidenceInterval: result.confidence_interval,
          features: params.features,
          featureImportance: result.feature_importance || {},
          positiveFactors: result.positive_factors,
          negativeFactors: result.negative_factors,
          recommendations: result.recommendations,
          modelVersion: '1.0.0',
          modelType: 'RANDOM_FOREST',
          predictedAt: new Date()
        }
      });

      return prediction;
    } catch (error) {
      console.error('Productivity prediction error:', error);
      throw error;
    }
  }

  /**
   * Extract features for productivity prediction
   */
  async extractFeatures(params: {
    tenantId: string;
    entityType: string;
    entityId: string;
    featureDate: Date;
  }): Promise<Record<string, any>> {
    const { tenantId, entityType, entityId, featureDate } = params;

    // Calculate date ranges
    const startDate = new Date(featureDate);
    startDate.setDate(startDate.getDate() - 7); // Last 7 days

    const monthAgoDate = new Date(featureDate);
    monthAgoDate.setDate(monthAgoDate.getDate() - 30);

    const features: Record<string, any> = {};

    if (entityType === 'USER') {
      // Activity features (from existing tracking)
      const activityEvents = await prisma.activityEvent.count({
        where: {
          userId: entityId,
          eventTimestamp: { gte: startDate, lte: featureDate }
        }
      });

      const goalProgress = await prisma.goal.findMany({
        where: {
          ownerId: entityId,
          tenantId,
          status: { in: ['IN_PROGRESS', 'COMPLETED'] }
        },
        select: { progress: true }
      });

      const avgProgress = goalProgress.length > 0
        ? goalProgress.reduce((sum, g) => sum + g.progress, 0) / goalProgress.length
        : 0;

      // Engagement data
      const latestEngagement = await prisma.engagementScore.findFirst({
        where: {
          userId: entityId,
          tenantId
        },
        orderBy: { scoreDate: 'desc' }
      });

      // Sentiment data
      const recentSentiment = await prisma.sentimentAnalysis.findMany({
        where: {
          userId: entityId,
          tenantId,
          analyzedAt: { gte: startDate }
        },
        select: { sentimentScore: true }
      });

      const avgSentiment = recentSentiment.length > 0
        ? recentSentiment.reduce((sum, s) => sum + Number(s.sentimentScore), 0) / recentSentiment.length
        : 0;

      // Get historical productivity for trends
      const historicalPredictions = await prisma.productivityPrediction.findMany({
        where: {
          entityType: 'USER',
          entityId,
          tenantId,
          predictionDate: { gte: monthAgoDate }
        },
        orderBy: { predictionDate: 'asc' }
      });

      const avg7d = historicalPredictions
        .slice(-7)
        .reduce((sum, p) => sum + Number(p.actualScore || p.predictedScore), 0) / Math.min(7, historicalPredictions.length) || 50;

      const avg30d = historicalPredictions
        .reduce((sum, p) => sum + Number(p.actualScore || p.predictedScore), 0) / historicalPredictions.length || 50;

      // Calculate trend
      let trend = 0;
      if (historicalPredictions.length >= 2) {
        const recent = Number(historicalPredictions[historicalPredictions.length - 1]?.predictedScore || 50);
        const older = Number(historicalPredictions[0]?.predictedScore || 50);
        trend = (recent - older) / historicalPredictions.length;
      }

      features.commits_count = 0; // Would come from Git integration
      features.pr_count = 0;
      features.code_reviews_given = 0;
      features.tasks_completed = activityEvents;
      features.meetings_attended = 0; // Would come from calendar integration
      features.active_tasks = goalProgress.filter(g => g.progress < 100).length;
      features.pending_reviews = 0;
      features.hours_worked = 40; // Would come from time tracking
      features.messages_sent = 0; // Would come from Slack/Teams integration
      features.collaboration_score = Number(latestEngagement?.collaborationScore || 50);
      features.day_of_week = featureDate.getDay() + 1;
      features.avg_productivity_7d = avg7d;
      features.avg_productivity_30d = avg30d;
      features.productivity_trend = trend;
      features.engagement_score = Number(latestEngagement?.overallScore || 50);
      features.sentiment_score = avgSentiment;
      features.velocity = avgProgress;
      features.burndown_rate = 0;
      features.code_quality_score = 70;
      features.bug_rate = 0;
    }

    // Store extracted features
    await prisma.productivityFeature.create({
      data: {
        tenantId,
        entityType,
        entityId,
        featureDate,
        featureType: 'ACTIVITY',
        features,
        extractedAt: new Date()
      }
    });

    return features;
  }

  /**
   * Validate prediction against actual performance
   */
  async validatePrediction(params: {
    predictionId: string;
    actualScore: number;
  }): Promise<any> {
    const prediction = await prisma.productivityPrediction.findUnique({
      where: { id: params.predictionId }
    });

    if (!prediction) {
      throw new Error('Prediction not found');
    }

    const predictedScore = Number(prediction.predictedScore);
    const error = Math.abs(params.actualScore - predictedScore);
    const errorPct = (error / params.actualScore) * 100;

    return prisma.productivityPrediction.update({
      where: { id: params.predictionId },
      data: {
        actualScore: params.actualScore,
        predictionError: error,
        errorPercentage: errorPct,
        validatedAt: new Date()
      }
    });
  }

  /**
   * Get predictions for entity
   */
  async getPredictions(params: {
    tenantId: string;
    entityType: string;
    entityId: string;
    limit?: number;
  }): Promise<any[]> {
    return prisma.productivityPrediction.findMany({
      where: {
        tenantId: params.tenantId,
        entityType: params.entityType,
        entityId: params.entityId
      },
      orderBy: { predictionDate: 'desc' },
      take: params.limit || 30
    });
  }

  /**
   * Get model accuracy statistics
   */
  async getModelAccuracy(params: {
    tenantId: string;
    days?: number;
  }): Promise<any> {
    const days = params.days || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const validatedPredictions = await prisma.productivityPrediction.findMany({
      where: {
        tenantId: params.tenantId,
        validatedAt: { not: null },
        predictedAt: { gte: since }
      },
      select: {
        predictedScore: true,
        actualScore: true,
        predictionError: true
      }
    });

    if (validatedPredictions.length === 0) {
      return {
        sampleSize: 0,
        mae: 0,
        rmse: 0,
        accuracy: 0
      };
    }

    const errors = validatedPredictions.map(p => Number(p.predictionError));
    const mae = errors.reduce((sum, e) => sum + e, 0) / errors.length;

    const squaredErrors = validatedPredictions.map(p =>
      Math.pow(Number(p.actualScore) - Number(p.predictedScore), 2)
    );
    const rmse = Math.sqrt(squaredErrors.reduce((sum, e) => sum + e, 0) / squaredErrors.length);

    // Calculate accuracy as percentage within 10% error
    const within10Pct = validatedPredictions.filter(p => {
      const errorPct = Math.abs(Number(p.actualScore) - Number(p.predictedScore)) / Number(p.actualScore) * 100;
      return errorPct <= 10;
    }).length;

    const accuracy = (within10Pct / validatedPredictions.length) * 100;

    return {
      sampleSize: validatedPredictions.length,
      mae: Number(mae.toFixed(2)),
      rmse: Number(rmse.toFixed(2)),
      accuracy: Number(accuracy.toFixed(2))
    };
  }
}
