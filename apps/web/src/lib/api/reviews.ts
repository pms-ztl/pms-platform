// ============================================================================
// Reviews API
// ============================================================================

import { api } from './client';

export interface ReviewCycle {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  reviewCount?: number;
}

export interface ReviewCycleStats {
  total: number;
  notStarted: number;
  inProgress: number;
  submitted: number;
  calibrated: number;
  finalized: number;
  acknowledged: number;
  completionRate: number;
}

export interface CreateReviewCycleInput {
  name: string;
  description?: string;
  type: string;
  startDate: string;
  endDate: string;
}

export interface Review {
  id: string;
  cycleId: string;
  reviewee: { id: string; firstName: string; lastName: string; jobTitle?: string };
  reviewer: { id: string; firstName: string; lastName: string };
  type: string;
  status: string;
  overallRating?: number;
  content?: Record<string, unknown>;
  strengths?: string[];
  areasForGrowth?: string[];
  summary?: string;
  submittedAt?: string;
  acknowledgedAt?: string;
  cycle?: { id: string; name: string; status: string };
}

export interface SubmitReviewInput {
  overallRating: number;
  content: Record<string, unknown>;
  strengths?: string[];
  areasForGrowth?: string[];
  summary?: string;
}

export const reviewsApi = {
  listCycles: (params?: { status?: string }) => api.get<ReviewCycle[]>('/reviews/cycles', { params }),
  getCycle: (id: string) => api.get<ReviewCycle>(`/reviews/cycles/${id}`),
  getCycleStats: (id: string) => api.get<ReviewCycleStats>(`/reviews/cycles/${id}/stats`),
  createCycle: (data: CreateReviewCycleInput) => api.post<ReviewCycle>('/reviews/cycles', data),
  launchCycle: (id: string) => api.post<ReviewCycle>(`/reviews/cycles/${id}/launch`),
  listMyReviews: (params?: { asReviewer?: boolean; asReviewee?: boolean; cycleId?: string }) =>
    api.get<Review[]>('/reviews/my', { params }),
  getReview: (id: string) => api.get<Review>(`/reviews/${id}`),
  startReview: (id: string) => api.post<Review>(`/reviews/${id}/start`),
  saveDraft: (id: string, data: Partial<SubmitReviewInput>) =>
    api.put<Review>(`/reviews/${id}/draft`, data),
  submitReview: (id: string, data: SubmitReviewInput) =>
    api.post<Review>(`/reviews/${id}/submit`, data),
  acknowledgeReview: (id: string) => api.post<Review>(`/reviews/${id}/acknowledge`),
};
