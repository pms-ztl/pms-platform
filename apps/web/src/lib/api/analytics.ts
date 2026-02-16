// ============================================================================
// Analytics, Performance Math & HR Analytics APIs
// ============================================================================

import { api } from './client';
import type { DashboardMetrics } from './types';

export interface PerformanceDistribution {
  rating: number;
  count: number;
  percentage: number;
}

export interface GoalTrend {
  month: string;
  completed: number;
  created: number;
  completionRate: number;
}

export interface FeedbackTrend {
  month: string;
  praise: number;
  constructive: number;
  total: number;
}

export interface TeamPerformance {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  avgGoalProgress: number;
  avgRating: number;
  feedbackCount: number;
}

export interface BiasMetric {
  dimension: string;
  category: string;
  avgRating: number;
  count: number;
  variance: number;
}

export interface PerformanceScoreResult {
  overallScore: number;
  goalAttainment: number;
  reviewScore: number;
  feedbackScore: number;
  percentile: number | null;
  trajectory: number;
  confidence: number;
  weights: { goals: number; reviews: number; feedback: number; attendance: number; collaboration: number };
  derivedRating: number;
  dataPoints: { goals: number; reviews: number; feedbacks: number };
}

export interface GoalRiskResult {
  goalId: string;
  goalTitle: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  components: {
    scheduleRisk: number;
    velocityRisk: number;
    dependencyRisk: number;
    complexityRisk: number;
  };
  projectedCompletion: number;
  requiredVelocity: number;
  currentVelocity: number;
  daysNeededAtCurrentPace: number;
  daysRemaining: number;
}

export interface TeamAnalyticsResult {
  managerId: string;
  teamSize: number;
  avgScore: number;
  scoreSpread: number;
  ratingEntropy: number;
  giniCoefficient: number;
  velocityTrend: number;
  predictedNextAvg: number;
  memberZScores: Array<{
    userId: string;
    name: string;
    score: number;
    zScore: number;
    category: 'high' | 'average' | 'low';
  }>;
}

export interface GoalMappingResult {
  goalId: string;
  goalTitle: string;
  completionScore: number;
  qualityAdjustedScore: number;
  timelinessFactor: number;
  compositeScore: number;
  velocity: number;
  predictedCompletionDate: string | null;
  riskScore: number;
  efficiency: number;
  childGoals: Array<{
    goalId: string;
    title: string;
    progress: number;
    weight: number;
    weightedContribution: number;
  }>;
}

export interface CalibrationResult {
  cycleId: string;
  totalRatings: number;
  calibrations: Array<{
    reviewId: string;
    revieweeName: string;
    reviewerName: string;
    originalRating: number;
    calibratedRating: number;
    adjustment: number;
  }>;
  statistics: {
    avgOriginal: number;
    avgCalibrated: number;
    stdDevOriginal: number;
    stdDevCalibrated: number;
  };
}

export const analyticsApi = {
  getDashboard: () => api.get<DashboardMetrics>('/analytics/dashboard'),
  getPerformanceDistribution: (cycleId?: string) =>
    api.get<PerformanceDistribution[]>('/analytics/performance-distribution', {
      params: cycleId ? { cycleId } : undefined,
    }),
  getGoalTrends: (months?: number) =>
    api.get<GoalTrend[]>('/analytics/goal-trends', { params: { months } }),
  getFeedbackTrends: (months?: number) =>
    api.get<FeedbackTrend[]>('/analytics/feedback-trends', { params: { months } }),
  getTeamPerformance: () => api.get<TeamPerformance[]>('/analytics/team-performance'),
  getBiasMetrics: (cycleId?: string) =>
    api.get<BiasMetric[]>('/analytics/bias-metrics', { params: cycleId ? { cycleId } : undefined }),
  getCycleStats: (cycleId: string) => api.get<any>(`/analytics/cycle/${cycleId}/stats`),
  exportData: (dataType: 'goals' | 'reviews' | 'feedback') =>
    api.getRaw(`/analytics/export/${dataType}`),
};

export const performanceMathApi = {
  getScore: (userId: string) =>
    api.get<PerformanceScoreResult>(`/performance-math/score/${userId}`),
  getGoalRisk: (goalId: string) =>
    api.get<GoalRiskResult>(`/performance-math/goal-risk/${goalId}`),
  getTeamAnalytics: (managerId: string) =>
    api.get<TeamAnalyticsResult>(`/performance-math/team/${managerId}`),
  calibrateRatings: (cycleId: string) =>
    api.post<CalibrationResult>('/performance-math/calibrate', { cycleId }),
  getGoalMapping: (goalId: string) =>
    api.get<GoalMappingResult>(`/performance-math/goal-mapping/${goalId}`),
  getCPIS: (userId: string) =>
    api.get<any>(`/performance-math/cpis/${userId}`),
};

export const hrAnalyticsApi = {
  getCompensationAnalysis: () => api.get<any>('/analytics/compensation'),
  getBiasAnalysis: () => api.get<any>('/analytics/bias'),
  getNormalization: () => api.get<any>('/analytics/normalization'),
  getRatingDistribution: () => api.get<any>('/analytics/ratings'),
  getDepartmentMetrics: () => api.get<any[]>('/analytics/departments'),
};
