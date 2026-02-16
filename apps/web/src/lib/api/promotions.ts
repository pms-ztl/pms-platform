// ============================================================================
// Promotions API
// ============================================================================

import { api } from './client';

export interface PromotionDecision {
  id: string;
  employeeId: string;
  employee?: { id: string; firstName: string; lastName: string; jobTitle?: string };
  promotionType: string;
  currentRole?: string;
  proposedRole?: string;
  currentLevel?: number;
  proposedLevel?: number;
  status: string;
  justification?: string;
  effectiveDate?: string;
  nominatedBy?: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface CreatePromotionInput {
  employeeId: string;
  promotionType: string;
  proposedRole?: string;
  proposedLevel?: number;
  justification: string;
  effectiveDate?: string;
}

export const promotionsApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.getPaginated<PromotionDecision>('/promotions', params),
  getById: (id: string) => api.get<PromotionDecision>(`/promotions/${id}`),
  create: (data: CreatePromotionInput) => api.post<PromotionDecision>('/promotions', data),
  update: (id: string, data: Partial<CreatePromotionInput>) =>
    api.put<PromotionDecision>(`/promotions/${id}`, data),
  startReview: (id: string) => api.post<PromotionDecision>(`/promotions/${id}/start-review`),
  approve: (id: string, data?: { notes?: string }) =>
    api.post<PromotionDecision>(`/promotions/${id}/approve`, data),
  reject: (id: string, data?: { reason?: string }) =>
    api.post<PromotionDecision>(`/promotions/${id}/reject`, data),
  defer: (id: string, data?: { reason?: string; deferUntil?: string }) =>
    api.post<PromotionDecision>(`/promotions/${id}/defer`, data),
  implement: (id: string) => api.post<PromotionDecision>(`/promotions/${id}/implement`),
  getSummary: () => api.get<any>('/promotions/summary'),
  linkEvidence: (decisionId: string, evidenceId: string) =>
    api.post('/promotions/link-evidence', { decisionId, evidenceId }),
};
