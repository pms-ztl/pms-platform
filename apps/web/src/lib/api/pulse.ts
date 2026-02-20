// ============================================================================
// Pulse Survey & Mood Tracker API
// ============================================================================

import { api } from './client';

// ── Types ──

export interface PulseSubmission {
  moodScore: number; // 1-5
  energyScore?: number; // 1-5
  stressScore?: number; // 1-5
  comment?: string;
  isAnonymous?: boolean;
}

export interface PulseResponse {
  id: string;
  moodScore: number;
  energyScore: number | null;
  stressScore: number | null;
  comment: string | null;
  isAnonymous: boolean;
  surveyDate: string;
  surveyType: 'DAILY' | 'WEEKLY';
  createdAt: string;
}

export interface PulseCanSubmit {
  canSubmit: boolean;
  lastSubmission: string | null;
  nextAvailable: string | null;
  surveyType: 'DAILY' | 'WEEKLY';
}

export interface PulseAnalyticsOverview {
  averageMood: number;
  averageEnergy: number | null;
  averageStress: number | null;
  totalResponses: number;
  participationRate: number;
  moodDistribution: Record<string, number>;
  trendDirection: string | null;
}

export interface PulseTrendPoint {
  date: string;
  averageMood: number;
  averageEnergy: number | null;
  averageStress: number | null;
  responseCount: number;
}

export interface PulseDepartmentData {
  departmentId: string;
  departmentName: string;
  averageMood: number;
  responseCount: number;
  participationRate: number;
}

// ── API Client ──

export const pulseApi = {
  /** Submit a pulse check-in */
  submit: (data: PulseSubmission) =>
    api.post<PulseResponse>('/pulse/submit', data),

  /** Check if user can submit today */
  canSubmit: () =>
    api.get<PulseCanSubmit>('/pulse/can-submit'),

  /** Get user's own pulse history */
  getMyHistory: (params?: { limit?: number }) =>
    api.get<PulseResponse[]>('/pulse/my-history', { params }),

  // ── Manager Analytics ──

  /** Get pulse analytics overview */
  getAnalyticsOverview: (params?: { days?: number }) =>
    api.get<PulseAnalyticsOverview>('/pulse/analytics/overview', { params }),

  /** Get pulse trends over time */
  getAnalyticsTrends: (params?: { days?: number }) =>
    api.get<PulseTrendPoint[]>('/pulse/analytics/trends', { params }),

  /** Get department breakdown */
  getAnalyticsDepartments: () =>
    api.get<PulseDepartmentData[]>('/pulse/analytics/departments'),

  /** Get mood distribution */
  getAnalyticsDistribution: (params?: { days?: number }) =>
    api.get<Record<string, number>>('/pulse/analytics/distribution', { params }),
};
