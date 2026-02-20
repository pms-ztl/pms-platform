// ============================================================================
// Engagement & eNPS Dashboard API
// ============================================================================

import { api } from './client';

// ── Types ──

export interface EngagementOverview {
  averageScore: number;
  totalEmployees: number;
  atRiskCount: number;
  participationRate: number;
  distribution: {
    VERY_HIGH: number;
    HIGH: number;
    MODERATE: number;
    LOW: number;
    VERY_LOW: number;
  };
  trendDirection: string | null;
  changeFromPrevious: number | null;
}

export interface EngagementTrendPoint {
  month: string;
  averageScore: number;
  atRiskCount: number;
  totalEmployees: number;
}

export interface DepartmentEngagement {
  departmentId: string;
  departmentName: string;
  averageScore: number;
  employeeCount: number;
  atRiskCount: number;
  topLevel: string;
  componentScores: {
    participation: number;
    communication: number;
    collaboration: number;
    initiative: number;
    responsiveness: number;
  };
}

export interface AtRiskEmployee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string | null;
  department: string | null;
  overallScore: number;
  scoreLevel: string;
  riskLevel: string | null;
  riskFactors: unknown[];
  trendDirection: string | null;
  changeFromPrevious: number | null;
}

export interface EngagementEvent {
  id: string;
  userId: string;
  eventType: string;
  eventCategory: string;
  engagementImpact: number;
  positiveIndicator: boolean;
  eventTimestamp: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

// ── API Client ──

export const engagementApi = {
  /** Get overall engagement overview with distribution */
  getOverview: () =>
    api.get<EngagementOverview>('/engagement/overview'),

  /** Get historical engagement trends */
  getTrends: (params?: { months?: number }) =>
    api.get<EngagementTrendPoint[]>('/engagement/trends', { params }),

  /** Get department-level engagement breakdown */
  getDepartments: () =>
    api.get<DepartmentEngagement[]>('/engagement/departments'),

  /** Get at-risk employees list (returns { employees, meta }) */
  getAtRisk: (params?: { page?: number; limit?: number }) =>
    api.get<{ employees: AtRiskEmployee[]; meta: { total: number; page: number; limit: number; totalPages: number } }>('/engagement/at-risk', { params }),

  /** Get recent engagement events */
  getEvents: (params?: { limit?: number; category?: string }) =>
    api.get<EngagementEvent[]>('/engagement/events', { params }),
};
