/**
 * Sentiment Analysis Service
 * Integrates with ML service for NLP-based sentiment analysis
 */

import axios from 'axios';
import { prisma } from '@pms/database';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

export interface SentimentAnalysisResult {
  sentiment_score: number;
  sentiment_label: string;
  confidence: number;
  emotions: Record<string, number>;
  dominant_emotion?: string;
  topics: string[];
  intent?: string;
}

export class SentimentAnalysisService {
  /**
   * Analyze sentiment of text communication
   */
  async analyzeSentiment(params: {
    tenantId: string;
    userId: string;
    text: string;
    sourceType: string;
    sourceId?: string;
    sourceReference?: string;
  }): Promise<any> {
    try {
      // Call ML service
      const response = await axios.post<SentimentAnalysisResult>(
        `${ML_SERVICE_URL}/api/ml/sentiment/analyze`,
        {
          text: params.text,
          source_type: params.sourceType
        },
        {
          timeout: 30000
        }
      );

      const result = response.data;

      // Store in database
      const sentimentAnalysis = await prisma.sentimentAnalysis.create({
        data: {
          tenantId: params.tenantId,
          userId: params.userId,
          sourceType: params.sourceType,
          sourceId: params.sourceId,
          sourceReference: params.sourceReference,
          contentSample: params.text.substring(0, 200),
          sentimentScore: result.sentiment_score,
          sentimentLabel: result.sentiment_label,
          confidence: result.confidence,
          emotions: result.emotions,
          dominantEmotion: result.dominant_emotion,
          topics: result.topics,
          intent: result.intent,
          modelVersion: '1.0.0',
          modelType: 'TRANSFORMER',
          analyzedAt: new Date()
        }
      });

      return sentimentAnalysis;
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      throw error;
    }
  }

  /**
   * Analyze batch of texts
   */
  async analyzeBatch(params: {
    tenantId: string;
    userId: string;
    texts: Array<{
      text: string;
      sourceType: string;
      sourceId?: string;
    }>;
  }): Promise<any[]> {
    const results = [];

    for (const item of params.texts) {
      const result = await this.analyzeSentiment({
        tenantId: params.tenantId,
        userId: params.userId,
        text: item.text,
        sourceType: item.sourceType,
        sourceId: item.sourceId
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Get sentiment trend for user
   */
  async getSentimentTrend(params: {
    tenantId: string;
    userId: string;
    periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    periodStart: Date;
    periodEnd: Date;
  }): Promise<any> {
    // Get all analyses for period
    const analyses = await prisma.sentimentAnalysis.findMany({
      where: {
        tenantId: params.tenantId,
        userId: params.userId,
        analyzedAt: {
          gte: params.periodStart,
          lte: params.periodEnd
        }
      }
    });

    if (analyses.length === 0) {
      return null;
    }

    // Calculate aggregates
    const scores = analyses.map(a => Number(a.sentimentScore));
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    // Calculate volatility (standard deviation)
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
    const volatility = Math.sqrt(variance);

    // Sentiment distribution
    const distribution = analyses.reduce((acc, a) => {
      acc[a.sentimentLabel] = (acc[a.sentimentLabel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Emotion distribution
    const emotionDistribution: Record<string, number> = {};
    analyses.forEach(a => {
      const emotions = a.emotions as Record<string, number>;
      Object.entries(emotions).forEach(([emotion, score]) => {
        emotionDistribution[emotion] = (emotionDistribution[emotion] || 0) + score;
      });
    });

    // Source breakdown
    const sourceBreakdown = analyses.reduce((acc, a) => {
      acc[a.sourceType] = (acc[a.sourceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get previous period for trend
    const periodLength = params.periodEnd.getTime() - params.periodStart.getTime();
    const prevPeriodEnd = new Date(params.periodStart.getTime());
    const prevPeriodStart = new Date(params.periodStart.getTime() - periodLength);

    const prevTrend = await prisma.sentimentTrend.findUnique({
      where: {
        tenantId_userId_periodType_periodStart: {
          tenantId: params.tenantId,
          userId: params.userId,
          periodType: params.periodType,
          periodStart: prevPeriodStart
        }
      }
    });

    const changeFromPrevious = prevTrend ? avgScore - Number(prevTrend.avgSentimentScore) : null;

    let trendDirection: string | null = null;
    if (changeFromPrevious !== null) {
      if (changeFromPrevious > 0.1) trendDirection = 'IMPROVING';
      else if (changeFromPrevious < -0.1) trendDirection = 'DECLINING';
      else trendDirection = 'STABLE';
    }

    // Store trend
    const trend = await prisma.sentimentTrend.upsert({
      where: {
        tenantId_userId_periodType_periodStart: {
          tenantId: params.tenantId,
          userId: params.userId,
          periodType: params.periodType,
          periodStart: params.periodStart
        }
      },
      create: {
        tenantId: params.tenantId,
        userId: params.userId,
        periodType: params.periodType,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        avgSentimentScore: avgScore,
        minSentimentScore: minScore,
        maxSentimentScore: maxScore,
        sentimentVolatility: volatility,
        sentimentDistribution: distribution,
        emotionDistribution: emotionDistribution,
        trendDirection,
        changeFromPrevious,
        analysisCount: analyses.length,
        sourceBreakdown,
        computedAt: new Date()
      },
      update: {
        avgSentimentScore: avgScore,
        minSentimentScore: minScore,
        maxSentimentScore: maxScore,
        sentimentVolatility: volatility,
        sentimentDistribution: distribution,
        emotionDistribution: emotionDistribution,
        trendDirection,
        changeFromPrevious,
        analysisCount: analyses.length,
        sourceBreakdown,
        computedAt: new Date()
      }
    });

    return trend;
  }

  /**
   * Get user's recent sentiment analyses
   */
  async getUserSentimentHistory(params: {
    tenantId: string;
    userId: string;
    limit?: number;
    sourceType?: string;
  }): Promise<any[]> {
    return prisma.sentimentAnalysis.findMany({
      where: {
        tenantId: params.tenantId,
        userId: params.userId,
        ...(params.sourceType && { sourceType: params.sourceType })
      },
      orderBy: { analyzedAt: 'desc' },
      take: params.limit || 50
    });
  }

  /**
   * Get sentiment summary for user
   */
  async getSentimentSummary(params: {
    tenantId: string;
    userId: string;
    days?: number;
  }): Promise<any> {
    const days = params.days || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const analyses = await prisma.sentimentAnalysis.findMany({
      where: {
        tenantId: params.tenantId,
        userId: params.userId,
        analyzedAt: { gte: since }
      }
    });

    if (analyses.length === 0) {
      return {
        avgSentiment: 0,
        dominantLabel: 'NEUTRAL',
        totalAnalyses: 0
      };
    }

    const avgSentiment = analyses.reduce((sum, a) => sum + Number(a.sentimentScore), 0) / analyses.length;

    const labelCounts = analyses.reduce((acc, a) => {
      acc[a.sentimentLabel] = (acc[a.sentimentLabel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantLabel = Object.entries(labelCounts)
      .sort(([, a], [, b]) => b - a)[0][0];

    return {
      avgSentiment: Number(avgSentiment.toFixed(3)),
      dominantLabel,
      totalAnalyses: analyses.length,
      distribution: labelCounts
    };
  }
}
