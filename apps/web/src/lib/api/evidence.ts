// ============================================================================
// Evidence API
// ============================================================================

import { api } from './client';

export interface Evidence {
  id: string;
  title: string;
  description?: string;
  type: string;
  source: string;
  status: string;
  url?: string;
  metadata?: Record<string, unknown>;
  userId: string;
  user?: { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateEvidenceInput {
  title: string;
  description?: string;
  type: string;
  source: string;
  url?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
}

export const evidenceApi = {
  list: (params?: { page?: number; limit?: number; type?: string; status?: string }) =>
    api.getPaginated<Evidence>('/evidence', params),
  getById: (id: string) => api.get<Evidence>(`/evidence/${id}`),
  create: (data: CreateEvidenceInput) => api.post<Evidence>('/evidence', data),
  update: (id: string, data: Partial<CreateEvidenceInput>) => api.put<Evidence>(`/evidence/${id}`, data),
  verify: (id: string) => api.post<Evidence>(`/evidence/${id}/verify`),
  archive: (id: string) => api.post<Evidence>(`/evidence/${id}/archive`),
  linkToReview: (evidenceId: string, reviewId: string) =>
    api.post('/evidence/link-to-review', { evidenceId, reviewId }),
  getEmployeeSummary: (employeeId: string) =>
    api.get<{ total: number; byType: Record<string, number>; byStatus: Record<string, number> }>(`/evidence/employees/${employeeId}/summary`),
};
