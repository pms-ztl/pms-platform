/**
 * AI Insights Controller
 * REST API endpoints for AI/ML features
 */

import { Request, Response } from 'express';
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

  async analyzeSentiment(req: Request, res: Response) {
    try {
      const { tenantId, userId } = req.user as any; // From auth middleware
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

  async getSentimentTrend(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
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

  async getSentimentHistory(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
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

  async predictProductivity(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
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

  async extractProductivityFeatures(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
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

  async getProductivityPredictions(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
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

  async validateProductivityPrediction(req: Request, res: Response) {
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

  async calculateEngagement(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
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

  async trackEngagementEvent(req: Request, res: Response) {
    try {
      const { tenantId, userId } = req.user as any;
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

  async getEngagementHistory(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
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

  async getAtRiskUsers(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
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

  async detectAnomalies(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
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

  async acknowledgeAnomaly(req: Request, res: Response) {
    try {
      const { userId } = req.user as any;
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

  async resolveAnomaly(req: Request, res: Response) {
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

  async getActiveAnomalies(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
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

  async getAnomalyStatistics(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
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

  async createBenchmark(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
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

  async compareToBenchmark(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
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

  async getUserComparisons(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
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

  async getTeamBenchmarkSummary(req: Request, res: Response) {
    try {
      const { tenantId } = req.user as any;
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
