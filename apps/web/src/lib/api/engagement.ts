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
  getTrends: async (params?: { months?: number }): Promise<EngagementTrendPoint[]> => {
    const raw = await api.get<any>('/engagement/trends', { params });
    // API returns { months, trends: [...] } — extract the array & normalize field names
    const trendArr: any[] = Array.isArray(raw) ? raw : (raw?.trends || []);
    return trendArr.map((t: any) => ({
      month: t.month,
      averageScore: t.avgOverallScore ?? t.averageScore ?? 0,
      atRiskCount: t.atRiskCount ?? 0,
      totalEmployees: t.totalScores ?? t.totalEmployees ?? 0,
    }));
  },

  /** Get department-level engagement breakdown */
  getDepartments: async (): Promise<DepartmentEngagement[]> => {
    const raw = await api.get<any[]>('/engagement/departments');
    const arr = Array.isArray(raw) ? raw : [];
    return arr.map((d: any) => ({
      departmentId: d.departmentId,
      departmentName: d.departmentName,
      averageScore: d.avgEngagementScore ?? d.averageScore ?? 0,
      employeeCount: d.employeeCount ?? 0,
      atRiskCount: d.atRiskCount ?? 0,
      topLevel: d.topLevel ?? d.distribution ? Object.entries(d.distribution || {}).sort(([,a]: any, [,b]: any) => b - a)[0]?.[0] ?? 'Unknown' : 'Unknown',
      componentScores: d.componentScores ?? d.avgComponentScores ?? { participation: 0, communication: 0, collaboration: 0, initiative: 0, responsiveness: 0 },
    }));
  },

  /** Get at-risk employees list (returns { employees, meta }) */
  getAtRisk: (params?: { page?: number; limit?: number }) =>
    api.get<{ employees: AtRiskEmployee[]; meta: { total: number; page: number; limit: number; totalPages: number } }>('/engagement/at-risk', { params }),

  /** Get recent engagement events */
  getEvents: (params?: { limit?: number; category?: string }) =>
    api.get<EngagementEvent[]>('/engagement/events', { params }),
};
