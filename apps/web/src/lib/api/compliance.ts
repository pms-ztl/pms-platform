// ============================================================================
// Compliance, Audit Trail & Skills Assessment APIs
// ============================================================================

import { api } from './client';

// ── Audit Trail ──

export interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  user?: { id: string; firstName: string; lastName: string };
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export const auditApi = {
  list: (params?: { page?: number; limit?: number; action?: string; entityType?: string; userId?: string; startDate?: string; endDate?: string }) =>
    api.getPaginated<AuditEvent>('/audit', params),
  getById: (id: string) => api.get<AuditEvent>(`/audit/${id}`),
  getStats: () => api.get<any>('/audit/stats'),
  getEntityHistory: (entityType: string, entityId: string) =>
    api.get<AuditEvent[]>(`/audit/entity/${entityType}/${entityId}`),
  getUserActivity: (userId: string, params?: { page?: number; limit?: number }) =>
    api.getPaginated<AuditEvent>(`/audit/user/${userId}`, params),
};

// ── Skills Assessment ──

export interface SkillCategory {
  id: string;
  name: string;
  description?: string;
  skills: Array<{ id: string; name: string; description?: string }>;
}

export interface SkillAssessment {
  id: string;
  userId: string;
  skillId: string;
  skillName?: string;
  categoryName?: string;
  currentLevel: number;
  targetLevel: number;
  status: string;
  assessedBy?: string;
  notes?: string;
  user?: { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface SkillMatrixEntry {
  skillId: string;
  skillName: string;
  categoryName: string;
  currentLevel: number;
  targetLevel: number;
  gap: number;
}

export const skillsApi = {
  listCategories: () => api.get<SkillCategory[]>('/skills/categories'),
  createCategory: (data: { name: string; description?: string }) =>
    api.post<SkillCategory>('/skills/categories', data),
  updateCategory: (id: string, data: { name?: string; description?: string }) =>
    api.put<SkillCategory>(`/skills/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/skills/categories/${id}`),
  listAssessments: (params?: { page?: number; limit?: number; userId?: string; status?: string }) =>
    api.getPaginated<SkillAssessment>('/skills/assessments', params),
  createAssessment: (data: { userId: string; skillId: string; currentLevel: number; targetLevel: number; notes?: string }) =>
    api.post<SkillAssessment>('/skills/assessments', data),
  updateAssessment: (id: string, data: { currentLevel?: number; targetLevel?: number; status?: string; notes?: string }) =>
    api.put<SkillAssessment>(`/skills/assessments/${id}`, data),
  addProgressEntry: (id: string, data: { level: number; notes?: string }) =>
    api.post<any>(`/skills/assessments/${id}/progress`, data),
  getUserSkillMatrix: (userId: string) => api.get<SkillMatrixEntry[]>(`/skills/matrix/user/${userId}`),
  getTeamSkillMatrix: () => api.get<any>('/skills/matrix/team'),
  getSkillGaps: () => api.get<any>('/skills/gaps'),
  getOrgSkillHeatmap: () => api.get<any>('/skills/heatmap'),
};

// ── Compliance ──

export interface CompliancePolicy {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  effectiveDate?: string;
  createdAt: string;
}

export interface ComplianceAssessment {
  id: string;
  policyId: string;
  userId: string;
  status: string;
  score?: number;
  notes?: string;
  dueDate?: string;
  completedAt?: string;
  user?: { id: string; firstName: string; lastName: string };
  policy?: { id: string; title: string };
  createdAt: string;
}

export interface ComplianceViolation {
  id: string;
  policyId: string;
  userId: string;
  severity: string;
  description: string;
  status: string;
  resolution?: string;
  user?: { id: string; firstName: string; lastName: string };
  policy?: { id: string; title: string };
  createdAt: string;
}

export const complianceApi = {
  getDashboard: () => api.get<any>('/compliance/dashboard'),
  listPolicies: (params?: { page?: number; limit?: number; status?: string }) =>
    api.getPaginated<CompliancePolicy>('/compliance/policies', params),
  createPolicy: (data: { title: string; description?: string; category: string; effectiveDate?: string }) =>
    api.post<CompliancePolicy>('/compliance/policies', data),
  updatePolicy: (id: string, data: Partial<{ title: string; description: string; category: string; status: string }>) =>
    api.put<CompliancePolicy>(`/compliance/policies/${id}`, data),
  deletePolicy: (id: string) => api.delete(`/compliance/policies/${id}`),
  listAssessments: (params?: { page?: number; limit?: number; status?: string; userId?: string }) =>
    api.getPaginated<ComplianceAssessment>('/compliance/assessments', params),
  createAssessment: (data: { policyId: string; userId: string; dueDate?: string; notes?: string }) =>
    api.post<ComplianceAssessment>('/compliance/assessments', data),
  updateAssessment: (id: string, data: { status?: string; score?: number; notes?: string }) =>
    api.put<ComplianceAssessment>(`/compliance/assessments/${id}`, data),
  listViolations: (params?: { page?: number; limit?: number; severity?: string; status?: string }) =>
    api.getPaginated<ComplianceViolation>('/compliance/violations', params),
  createViolation: (data: { policyId: string; userId: string; severity: string; description: string }) =>
    api.post<ComplianceViolation>('/compliance/violations', data),
  updateViolation: (id: string, data: { status?: string; resolution?: string }) =>
    api.put<ComplianceViolation>(`/compliance/violations/${id}`, data),
  getUserCompliance: (userId: string) => api.get<any>(`/compliance/user/${userId}`),
};
