// ============================================================================
// Admin: License, Admin Config, Announcements, Excel Upload, Succession APIs
// ============================================================================

import { api } from './client';

// ── License & Subscription ──

export interface LicenseUsageData {
  activeUsers: number;
  archivedUsers: number;
  totalUsers: number;
  licenseCount: number;
  remaining: number;
  usagePercent: number;
  maxLevel: number;
  plan: string;
  status: string;
  expiresAt: string | null;
}

export interface SubscriptionInfo {
  tenantId: string;
  companyName: string;
  plan: string;
  status: string;
  tier: string;
  expiresAt: string | null;
  license: {
    total: number;
    active: number;
    archived: number;
    remaining: number;
    usagePercent: number;
  };
  maxLevel: number;
  designatedManager: { id: string; name: string; email: string } | null;
  memberSince: string;
}

export const licenseApi = {
  getUsage: () => api.get<LicenseUsageData>('/users/license/usage'),
  getSubscription: () => api.get<SubscriptionInfo>('/users/subscription'),
  getBreakdown: () => api.get<{
    byLevel: Array<{ level: number; count: number }>;
    byDepartment: Array<{ name: string; count: number }>;
  }>('/users/breakdown'),
  assignDesignatedManager: (managerUserId: string) =>
    api.put<{ managerId: string; managerName: string; managerEmail: string }>(
      '/users/designated-manager',
      { managerUserId }
    ),
};

// ── Admin Configuration ──

export const adminConfigApi = {
  listTemplates: () => api.get<any[]>('/admin-config/templates'),
  getTemplate: (id: string) => api.get<any>(`/admin-config/templates/${id}`),
  createTemplate: (data: any) => api.post<any>('/admin-config/templates', data),
  updateTemplate: (id: string, data: any) => api.put<any>(`/admin-config/templates/${id}`, data),
  deleteTemplate: (id: string) => api.delete(`/admin-config/templates/${id}`),
  listFrameworks: () => api.get<any[]>('/admin-config/frameworks'),
  getFramework: (id: string) => api.get<any>(`/admin-config/frameworks/${id}`),
  createFramework: (data: any) => api.post<any>('/admin-config/frameworks', data),
  updateFramework: (id: string, data: any) => api.put<any>(`/admin-config/frameworks/${id}`, data),
  deleteFramework: (id: string) => api.delete(`/admin-config/frameworks/${id}`),
  listCompetencies: (frameworkId: string) => api.get<any[]>(`/admin-config/frameworks/${frameworkId}/competencies`),
  createCompetency: (frameworkId: string, data: any) => api.post<any>(`/admin-config/frameworks/${frameworkId}/competencies`, data),
  updateCompetency: (id: string, data: any) => api.put<any>(`/admin-config/competencies/${id}`, data),
  deleteCompetency: (id: string) => api.delete(`/admin-config/competencies/${id}`),
  listQuestionnaires: () => api.get<any[]>('/admin-config/questionnaires'),
  createQuestionnaire: (data: any) => api.post<any>('/admin-config/questionnaires', data),
  getRatingScales: () => api.get<any[]>('/admin-config/rating-scales'),
};

// ── Succession ──

export const successionApi = {
  list: (params?: any) => api.get<any[]>('/succession', params),
  getById: (id: string) => api.get<any>(`/succession/${id}`),
  create: (data: any) => api.post<any>('/succession', data),
  update: (id: string, data: any) => api.put<any>(`/succession/${id}`, data),
  delete: (id: string) => api.delete(`/succession/${id}`),
  getNineBoxGrid: () => api.get<any>('/succession/nine-box'),
  getReadiness: (id: string) => api.get<any[]>(`/succession/${id}/readiness`),
};

// ── Announcements ──

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  category: string;
  status: string;
  targetAudience: string[];
  isPinned: boolean;
  scheduledAt?: string;
  expiresAt?: string;
  publishedAt?: string;
  author?: { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  priority: string;
  category: string;
  targetAudience: string[];
  scheduledAt?: string;
  expiresAt?: string;
}

export const announcementsApi = {
  list: (params?: { page?: number; limit?: number; status?: string; priority?: string; category?: string }) =>
    api.getPaginated<Announcement>('/announcements', params),
  getActive: () => api.get<Announcement[]>('/announcements/active'),
  getStats: () => api.get<any>('/announcements/stats'),
  getById: (id: string) => api.get<Announcement>(`/announcements/${id}`),
  create: (data: CreateAnnouncementInput) => api.post<Announcement>('/announcements', data),
  update: (id: string, data: Partial<CreateAnnouncementInput & { status: string }>) =>
    api.put<Announcement>(`/announcements/${id}`, data),
  delete: (id: string) => api.delete(`/announcements/${id}`),
  pin: (id: string) => api.post<Announcement>(`/announcements/${id}/pin`),
};

// ── Excel Upload ──

export const excelUploadApi = {
  downloadTemplate: () => api.getBlob('/excel-upload/template'),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.postFormData<{
      uploadId: string;
      totalRows: number;
      successCount: number;
      errorCount: number;
      errors: Array<{ row: number; field: string; message: string }>;
      status: string;
    }>('/excel-upload/upload', formData);
  },
  getHistory: (params?: { page?: number; limit?: number }) =>
    api.getPaginated<{
      id: string;
      fileName: string;
      totalRows: number;
      successCount: number;
      errorCount: number;
      status: string;
      uploadedBy: { id: string; firstName: string; lastName: string };
      createdAt: string;
    }>('/excel-upload/history', params),
  getErrors: (id: string) =>
    api.get<Array<{ row: number; field: string; message: string }>>(`/excel-upload/${id}/errors`),
};
