// ============================================================================
// Actionable Insights API — Promotion/Succession, Dev Plans, Team Optimization, Org Health
// ============================================================================

import { api } from './client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PromotionRecommendation {
  id: string;
  userId: string;
  targetRole: string;
  targetLevel?: string;
  targetDepartment?: string;
  overallScore: number;
  readinessLevel: string;
  confidenceScore: number;
  performanceScore: number;
  potentialScore: number;
  skillsMatchScore: number;
  leadershipScore: number;
  tenureScore: number;
  engagementScore: number;
  strengths: string[];
  developmentNeeds: string[];
  skillGaps: Record<string, any>;
  riskFactors: string[];
  developmentActions: any[];
  estimatedTimeToReady: number;
  successProbability: number;
  status?: string;
  generatedAt?: string;
}

export interface SuccessionPlan {
  id: string;
  positionId: string;
  positionTitle: string;
  currentIncumbent?: string;
  criticality: string;
  turnoverRisk: string;
  vacancyImpact: string;
  successors: any[];
  emergencyBackup?: string;
  benchStrength: number;
  nextReviewDate?: string;
}

export interface TeamOptimizationResult {
  id: string;
  optimizationType: string;
  teamName: string;
  department?: string;
  teamSize: number;
  recommendedMembers: any[];
  alternativeOptions: any[];
  overallScore: number;
  skillCoverageScore: number;
  diversityScore: number;
  collaborationScore: number;
  performanceScore: number;
  chemistryScore: number;
  strengthsAnalysis: string[];
  risks: string[];
  skillGaps: Record<string, any>;
  redundancies: string[];
  recommendations: any[];
  implementationSteps: any[];
  confidence: number;
}

export interface TeamCompositionAnalysis {
  id: string;
  teamId: string;
  teamSize: number;
  avgTenure: number;
  avgPerformanceScore: number;
  diversityMetrics: any;
  skillDistribution: Record<string, number>;
  seniorityMix: Record<string, number>;
  productivityScore: number;
  collaborationScore: number;
  innovationScore: number;
  turnoverRisk: string;
  burnoutRisk: string;
  engagementLevel: string;
  keyStrengths: string[];
  vulnerabilities: string[];
  recommendations: any[];
  priorityActions: string[];
}

export interface OrgHealthMetrics {
  id: string;
  overallHealthScore: number;
  healthLevel: string;
  engagementScore: number;
  performanceScore: number;
  cultureScore: number;
  leadershipScore: number;
  collaborationScore: number;
  innovationScore: number;
  wellbeingScore: number;
  headcount: number;
  turnoverRate: number;
  retentionRate: number;
  eNPS: number;
  atRiskEmployees: number;
  burnoutRiskCount: number;
  flightRiskCount: number;
  avgSentimentScore: number;
  strengths: string[];
  concerns: string[];
  recommendations: any[];
}

export interface CultureDiagnostic {
  id: string;
  clanCulture: number;
  adhocracyCulture: number;
  marketCulture: number;
  hierarchyCulture: number;
  psychologicalSafety: number;
  trustLevel: number;
  transparency: number;
  accountability: number;
  innovation: number;
  culturalStrengths: string[];
  culturalWeaknesses: string[];
}

export interface GeneratedDevPlan {
  id: string;
  userId: string;
  planName: string;
  planType: string;
  duration: number;
  careerGoal: string;
  targetRole?: string;
  currentLevel: string;
  strengthsAssessed: string[];
  developmentAreas: string[];
  skillGapAnalysis: Record<string, any>;
  competencyGaps: Record<string, any>;
  activities: any[];
  totalActivities: number;
  milestones: any[];
  successMetrics: any[];
  budget: number;
  progressPercentage?: number;
  status?: string;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const actionableInsightsApi = {
  // Promotion & Succession
  generatePromotionRecommendation: (data: { userId: string; targetRole: string; targetLevel?: string; targetDepartment?: string }) =>
    api.post<PromotionRecommendation>('/actionable-insights/promotion/recommend', data),
  getUserPromotionRecommendations: (userId: string) =>
    api.get<PromotionRecommendation[]>(`/actionable-insights/promotion/user/${userId}`),
  approveRecommendation: (id: string) =>
    api.post<PromotionRecommendation>(`/actionable-insights/promotion/${id}/approve`),
  rejectRecommendation: (id: string, data?: { rejectionReason?: string }) =>
    api.post<PromotionRecommendation>(`/actionable-insights/promotion/${id}/reject`, data),
  createSuccessionPlan: (data: { positionId: string; positionTitle: string; currentIncumbent?: string; criticality: string }) =>
    api.post<SuccessionPlan>('/actionable-insights/succession/create', data),
  getSuccessionPlans: (params?: { criticality?: string }) =>
    api.get<SuccessionPlan[]>('/actionable-insights/succession/plans', { params }),

  // Development Plan Generator
  generateDevelopmentPlan: (data: { userId: string; planType: string; careerGoal: string; targetRole?: string; targetLevel?: string; duration?: number }) =>
    api.post<GeneratedDevPlan>('/actionable-insights/development/generate', data),
  getUserDevelopmentPlans: (userId: string) =>
    api.get<GeneratedDevPlan[]>(`/actionable-insights/development/user/${userId}`),
  updatePlanProgress: (planId: string) =>
    api.put<GeneratedDevPlan>(`/actionable-insights/development/${planId}/progress`),
  completePlan: (planId: string) =>
    api.post<GeneratedDevPlan>(`/actionable-insights/development/${planId}/complete`),

  // Team Optimization
  optimizeTeamComposition: (data: { optimizationType: string; teamName: string; department?: string; teamSize: number; requiredSkills: any[]; requiredCompetencies: any[]; objectives?: any[]; constraints?: any; targetTeamId?: string }) =>
    api.post<TeamOptimizationResult>('/actionable-insights/team/optimize', data),
  analyzeTeamComposition: (teamId: string) =>
    api.get<TeamCompositionAnalysis>(`/actionable-insights/team/${teamId}/analyze`),

  // Organizational Health
  calculateOrganizationalHealth: (params?: { period?: string }) =>
    api.get<OrgHealthMetrics>('/actionable-insights/health/calculate', { params }),
  conductCultureDiagnostic: () =>
    api.post<CultureDiagnostic>('/actionable-insights/health/culture-diagnostic'),
};
