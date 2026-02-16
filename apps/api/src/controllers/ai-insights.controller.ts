/**
 * AI Insights Controller
 * REST API endpoints for AI/ML features
 */

import { Response } from 'express';
import type { AuthenticatedRequest } from '../types';
import {
  SentimentAnalysisService,
  ProductivityPredictionService,
  EngagementScoringService,
  AnomalyDetectionService,
  PerformanceBenchmarkingService
} from '../services/ai-insights';

const sentimentService = new SentimentAnalysisService();
const productivityService = new ProductivityPredictionService();
const engagementService = new EngagementScoringService();
const anomalyService = new AnomalyDetectionService();
const benchmarkService = new PerformanceBenchmarkingService();

export class AIInsightsController {
  // ============================================================================
  // SENTIMENT ANALYSIS
  // ============================================================================

  async analyzeSentiment(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId, id: userId } = req.user!; // From auth middleware
      const { text, sourceType, sourceId, sourceReference } = req.body;

      const result = await sentimentService.analyzeSentiment({
        tenantId,
        userId,
        text,
        sourceType,
        sourceId,
        sourceReference
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getSentimentTrend(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.user!;
      const { userId, periodType, periodStart, periodEnd } = req.query;

      const result = await sentimentService.getSentimentTrend({
        tenantId,
        userId: userId as string,
        periodType: periodType as any,
        periodStart: new Date(periodStart as string),
        periodEnd: new Date(periodEnd as string)
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getSentimentHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.user!;
      const { userId, limit, sourceType } = req.query;

      const result = await sentimentService.getUserSentimentHistory({
        tenantId,
        userId: userId as string,
        limit: limit ? parseInt(limit as string) : undefined,
        sourceType: sourceType as string
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============================================================================
  // PRODUCTIVITY PREDICTION
  // ============================================================================

  async predictProductivity(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.user!;
      const { entityType, entityId, predictionType, predictionDate, features } = req.body;

      const result = await productivityService.predictProductivity({
        tenantId,
        entityType,
        entityId,
        predictionType,
        predictionDate: new Date(predictionDate),
        features
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async extractProductivityFeatures(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.user!;
      const { entityType, entityId, featureDate } = req.body;

      const features = await productivityService.extractFeatures({
        tenantId,
        entityType,
        entityId,
        featureDate: new Date(featureDate)
      });

      res.json({ features });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getProductivityPredictions(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.user!;
      const { entityType, entityId, limit } = req.query;

      const result = await productivityService.getPredictions({
        tenantId,
        entityType: entityType as string,
        entityId: entityId as string,
        limit: limit ? parseInt(limit as string) : undefined
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async validateProductivityPrediction(req: AuthenticatedRequest, res: Response) {
    try {
      const { predictionId, actualScore } = req.body;

      const result = await productivityService.validatePrediction({
        predictionId,
        actualScore
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============================================================================
  // ENGAGEMENT SCORING
  // ============================================================================

  async calculateEngagement(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.user!;
      const { userId, scoreDate, calculationPeriod } = req.body;

      const result = await engagementService.calculateEngagementScore({
        tenantId,
        userId,
        scoreDate: scoreDate ? new Date(scoreDate) : undefined,
        calculationPeriod
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async trackEngagementEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId, id: userId } = req.user!;
      const { eventType, eventCategory, eventData, engagementImpact, positiveIndicator, sourceSystem } = req.body;

      const result = await engagementService.trackEngagementEvent({
        tenantId,
        userId,
        eventType,
        eventCategory,
        eventData,
        engagementImpact,
        positiveIndicator,
        sourceSystem
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getEngagementHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.user!;
      const { userId, days } = req.query;

      const result = await engagementService.getEngagementHistory({
        tenantId,
        userId: userId as string,
        days: days ? parseInt(days as string) : undefined
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAtRiskUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.user!;
      const { riskLevel } = req.query;

      const result = await engagementService.getAtRiskUsers({
        tenantId,
        riskLevel: riskLevel as string
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============================================================================
  // ANOMALY DETECTION
  // ============================================================================

  async detectAnomalies(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.user!;
      const { entityType, entityId } = req.body;

      const result = await anomalyService.detectAnomalies({
        tenantId,
        entityType,
        entityId
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async acknowledgeAnomaly(req: AuthenticatedRequest, res: Response) {
    try {
      const { id: userId } = req.user!;
      const { anomalyId } = req.params;

      const result = await anomalyService.acknowledgeAnomaly({
        anomalyId,
        acknowledgedBy: userId
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async resolveAnomaly(req: AuthenticatedRequest, res: Response) {
    try {
      const { anomalyId } = req.params;
      const { resolution } = req.body;

      const result = await anomalyService.resolveAnomaly({
        anomalyId,
        resolution
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getActiveAnomalies(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.user!;
      const { severity, entityType } = req.query;

      const result = await anomalyService.getActiveAnomalies({
        tenantId,
        severity: severity as string,
        entityType: entityType as string
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAnomalyStatistics(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.user!;
      const { days } = req.query;

      const result = await anomalyService.getAnomalyStatistics({
        tenantId,
        days: days ? parseInt(days as string) : undefined
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============================================================================
  // PERFORMANCE BENCHMARKING
  // ============================================================================

  async createBenchmark(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.user!;
      const {
        benchmarkName,
        benchmarkType,
        metricName,
        metricCategory,
        targetRole,
        targetDepartment,
        targetLevel,
        validFrom,
        validUntil
      } = req.body;

      const result = await benchmarkService.createBenchmark({
        tenantId,
        benchmarkName,
        benchmarkType,
        metricName,
        metricCategory,
        targetRole,
        targetDepartment,
        targetLevel,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil)
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async compareToBenchmark(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.user!;
      const {
        userId,
        metricName,
        metricValue,
        benchmarkType,
        targetRole,
        targetDepartment,
        targetLevel
      } = req.body;

      const result = await benchmarkService.compareToBenchmark({
        tenantId,
        userId,
        metricName,
        metricValue,
        benchmarkType,
        targetRole,
        targetDepartment,
        targetLevel
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getUserComparisons(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.user!;
      const { userId, metricName } = req.query;

      const result = await benchmarkService.getUserComparisons({
        tenantId,
        userId: userId as string,
        metricName: metricName as string
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTeamBenchmarkSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.user!;
      const { teamId, metricName } = req.query;

      const result = await benchmarkService.getTeamBenchmarkSummary({
        tenantId,
        teamId: teamId as string,
        metricName: metricName as string
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
