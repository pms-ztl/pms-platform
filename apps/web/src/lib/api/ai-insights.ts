// ============================================================================
// AI Insights API — Sentiment, Anomaly Detection, Benchmarking, Productivity
// ============================================================================

import { api } from './client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SentimentResult {
  score: number;
  label: string;
  emotions: Record<string, number>;
  confidence: number;
}

export interface SentimentTrendPoint {
  date: string;
  avgScore: number;
  count: number;
}

export interface AnomalyItem {
  id: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  type: string;
  severity: string;
  description: string;
  status: string;
  detectedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface AnomalyStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  bySeverity: Record<string, number>;
}

export interface BenchmarkComparison {
  userId: string;
  userName?: string;
  department?: string;
  score: number;
  benchmarkScore: number;
  delta: number;
  percentile: number;
}

export interface TeamBenchmarkSummary {
  benchmarkId: string;
  benchmarkName: string;
  teamAvg: number;
  orgAvg: number;
  dimensions: Array<{ name: string; teamAvg: number; orgAvg: number }>;
  comparisons: BenchmarkComparison[];
}

export interface ProductivityPrediction {
  entityId: string;
  entityName?: string;
  predicted: number;
  actual?: number;
  confidence: number;
  features?: Record<string, number>;
}

export interface AtRiskUser {
  userId: string;
  userName?: string;
  department?: string;
  engagementScore: number;
  riskLevel: string;
  factors: string[];
  recommendedActions: string[];
}

// ── API ──────────────────────────────────────────────────────────────────────

export const aiInsightsApi = {
  // Sentiment
  analyzeSentiment: (data: { text: string; sourceType?: string }) =>
    api.post<SentimentResult>('/ai-insights/sentiment/analyze', data),
  getSentimentTrend: (params: { userId?: string; periodType?: string; periodStart: string; periodEnd: string }) =>
    api.get<SentimentTrendPoint[]>('/ai-insights/sentiment/trend', { params }),
  getSentimentHistory: (params?: { userId?: string; limit?: number }) =>
    api.get<SentimentResult[]>('/ai-insights/sentiment/history', { params }),

  // Anomaly Detection
  detectAnomalies: (data: { entityType: string; entityId: string }) =>
    api.post<AnomalyItem[]>('/ai-insights/anomaly/detect', data),
  getActiveAnomalies: () =>
    api.get<AnomalyItem[]>('/ai-insights/anomaly/active'),
  getAnomalyStatistics: () =>
    api.get<AnomalyStats>('/ai-insights/anomaly/statistics'),
  acknowledgeAnomaly: (id: string) =>
    api.post<AnomalyItem>(`/ai-insights/anomaly/${id}/acknowledge`),
  resolveAnomaly: (id: string, data?: { resolution?: string }) =>
    api.post<AnomalyItem>(`/ai-insights/anomaly/${id}/resolve`, data),

  // Benchmarking
  createBenchmark: (data: { benchmarkName: string; department?: string; level?: number }) =>
    api.post<any>('/ai-insights/benchmark/create', data),
  compareToBenchmark: (data: { userId: string; benchmarkId: string }) =>
    api.post<BenchmarkComparison>('/ai-insights/benchmark/compare', data),
  getUserComparisons: (params?: { userId?: string }) =>
    api.get<BenchmarkComparison[]>('/ai-insights/benchmark/comparisons', { params }),
  getTeamBenchmarkSummary: () =>
    api.get<TeamBenchmarkSummary>('/ai-insights/benchmark/team-summary'),

  // Productivity
  predictProductivity: (data: { entityType: string; entityId: string }) =>
    api.post<ProductivityPrediction>('/ai-insights/productivity/predict', data),
  getProductivityPredictions: () =>
    api.get<ProductivityPrediction[]>('/ai-insights/productivity/predictions'),

  // Engagement
  getEngagementHistory: () => api.get<any[]>('/ai-insights/engagement/history'),
  getAtRiskUsers: () => api.get<AtRiskUser[]>('/ai-insights/engagement/at-risk'),
};
