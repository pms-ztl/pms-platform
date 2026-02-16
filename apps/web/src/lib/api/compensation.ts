// ============================================================================
// Compensation API
// ============================================================================

import { api } from './client';

export interface CompensationDecision {
  id: string;
  employeeId: string;
  employee?: { id: string; firstName: string; lastName: string; jobTitle?: string };
  compensationType: string;
  currentAmount?: number;
  proposedAmount?: number;
  currency?: string;
  status: string;
  justification?: string;
  effectiveDate?: string;
  approvedBy?: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface CreateCompensationInput {
  employeeId: string;
  compensationType: string;
  proposedAmount: number;
  currency?: string;
  justification: string;
  effectiveDate?: string;
}

export const compensationApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.getPaginated<CompensationDecision>('/compensation', params),
  getById: (id: string) => api.get<CompensationDecision>(`/compensation/${id}`),
  create: (data: CreateCompensationInput) => api.post<CompensationDecision>('/compensation', data),
  update: (id: string, data: Partial<CreateCompensationInput>) =>
    api.put<CompensationDecision>(`/compensation/${id}`, data),
  submit: (id: string) => api.post<CompensationDecision>(`/compensation/${id}/submit`),
  approve: (id: string, data?: { notes?: string }) =>
    api.post<CompensationDecision>(`/compensation/${id}/approve`, data),
  reject: (id: string, data?: { reason?: string }) =>
    api.post<CompensationDecision>(`/compensation/${id}/reject`, data),
  implement: (id: string) => api.post<CompensationDecision>(`/compensation/${id}/implement`),
  getBudgetSummary: () => api.get<any>('/compensation/budget-summary'),
  linkEvidence: (decisionId: string, evidenceId: string) =>
    api.post('/compensation/link-evidence', { decisionId, evidenceId }),
};
