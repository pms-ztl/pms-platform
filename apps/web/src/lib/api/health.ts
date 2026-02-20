// ============================================================================
// Organizational Health Dashboard API
// ============================================================================

import { api } from './client';

// ── Types ──

export interface HealthComponentScores {
  engagementScore: number;
  performanceScore: number;
  cultureScore: number;
  leadershipScore: number;
  collaborationScore: number;
  innovationScore: number;
  wellbeingScore: number;
}

export interface PeopleMetrics {
  headcount: number;
  activeEmployees: number;
  newHires: number;
  terminations: number;
  turnoverRate: number;
  retentionRate: number;
  disengagedEmployees: number;
  flightRiskCount: number;
  attritionRate: number;
}

export interface OrganizationalHealth extends HealthComponentScores, PeopleMetrics {
  id: string;
  metricDate: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  overallHealthScore: number;
  healthLevel: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  trendDirection: 'IMPROVING' | 'STABLE' | 'DECLINING' | null;
  engagementLevel: string;
  avgEngagementScore: number;
  avgSentimentScore: number | null;
  positiveSentiment: number | null;
  negativeSentiment: number | null;
  diversityMetrics: Record<string, unknown>;
  inclusionScore: number | null;
  strengths: string[];
  concerns: string[];
  recommendations: unknown[];
  createdAt: string;
}

export interface DepartmentHealth {
  id: string;
  departmentId: string;
  healthScore: number;
  engagementScore: number;
  performanceScore: number;
  headcount: number;
  turnoverRate: number;
  avgPerformance: number;
  vsOrgAverage: number;
  ranking: number | null;
  department: {
    id: string;
    name: string;
  };
}

// ── API Client ──

export const healthApi = {
  /** Get latest organizational health metrics */
  getLatest: () =>
    api.get<OrganizationalHealth>('/health-metrics'),

  /** Get historical health metrics trend */
  getHistory: (params?: { period?: string; limit?: number }) =>
    api.get<OrganizationalHealth[]>('/health-metrics/history', { params }),

  /** Get department-level health breakdown */
  getDepartments: () =>
    api.get<DepartmentHealth[]>('/health-metrics/departments'),
};
