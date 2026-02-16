// ============================================================================
// Calibration API
// ============================================================================

import { api } from './client';

export interface CalibrationSession {
  id: string;
  name: string;
  description?: string;
  status: string;
  scheduledStart: string;
  facilitator: { id: string; firstName: string; lastName: string };
  preAnalysis?: {
    totalReviews: number;
    outliers: unknown[];
    biasIndicators: unknown[];
  };
}

export interface CreateCalibrationSessionInput {
  cycleId: string;
  name: string;
  scheduledStart: string;
}

export interface CalibrationReview {
  id: string;
  reviewee: { id: string; firstName: string; lastName: string; jobTitle?: string; level: number };
  reviewer: { id: string; firstName: string; lastName: string };
  overallRating?: number;
  calibratedRating?: number;
  status: string;
}

export interface AdjustRatingInput {
  reviewId: string;
  adjustedRating: number;
  rationale: string;
}

export interface CalibrationRating {
  id: string;
  originalRating: number;
  adjustedRating: number;
  rationale: string;
}

export const calibrationApi = {
  listSessions: (params?: { cycleId?: string; status?: string }) =>
    api.get<CalibrationSession[]>('/calibration/sessions', { params }),
  getSession: (id: string) => api.get<CalibrationSession>(`/calibration/sessions/${id}`),
  createSession: (data: CreateCalibrationSessionInput) =>
    api.post<CalibrationSession>('/calibration/sessions', data),
  startSession: (id: string) => api.post<CalibrationSession>(`/calibration/sessions/${id}/start`),
  getReviewsForCalibration: (sessionId: string) =>
    api.get<CalibrationReview[]>(`/calibration/sessions/${sessionId}/reviews`),
  adjustRating: (sessionId: string, data: AdjustRatingInput) =>
    api.post<CalibrationRating>(`/calibration/sessions/${sessionId}/ratings`, data),
};
