// ============================================================================
// Reports API
// ============================================================================

import { api } from './client';

export interface GeneratedReport {
  id: string;
  reportType: string;
  periodType?: string;
  periodLabel?: string;
  title: string;
  summary?: string;
  generationStatus: string;
  pdfUrl?: string;
  excelUrl?: string;
  csvUrl?: string;
  createdAt: string;
  accessCount: number;
}

export interface GenerateReportInput {
  reportType: string;
  aggregationType?: string;
  entityId?: string;
  periodStart?: string;
  periodEnd?: string;
  exportFormats?: string[];
  async?: boolean;
}

export const reportsApi = {
  list: (params?: { page?: number; limit?: number; reportType?: string }) =>
    api.getPaginated<GeneratedReport>('/reports', params),
  getById: (id: string) => api.get<GeneratedReport>(`/reports/${id}`),
  generate: (data: GenerateReportInput) => api.post<any>('/reports/generate', data),
  download: (reportId: string, format: string) =>
    api.getBlob(`/reports/${reportId}/download?format=${format}`),
  getJobStatus: (jobId: string) => api.get<any>(`/reports/jobs/${jobId}`),
  listSchedules: () => api.get<any[]>('/reports/schedules'),
  createSchedule: (data: { reportDefinitionId: string; cronExpression: string; startDate: string; endDate?: string }) =>
    api.post<any>('/reports/schedules', data),
  pauseSchedule: (id: string) => api.post(`/reports/schedules/${id}/pause`),
  resumeSchedule: (id: string) => api.post(`/reports/schedules/${id}/resume`),
  deleteSchedule: (id: string) => api.delete(`/reports/schedules/${id}`),
};
