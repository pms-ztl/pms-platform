// ============================================================================
// One-on-One Meetings API
// ============================================================================

import { api } from './client';

export interface OneOnOne {
  id: string;
  managerId: string;
  employeeId: string;
  scheduledAt: string;
  duration: number;
  status: string;
  location?: string;
  meetingLink?: string;
  agenda: Array<{ topic: string; notes?: string }>;
  managerNotes?: string;
  employeeNotes?: string;
  sharedNotes?: string;
  actionItems: Array<{ title: string; done: boolean; assignee?: string }>;
  completedAt?: string;
  manager: { id: string; firstName: string; lastName: string; email: string; avatarUrl?: string; jobTitle?: string };
  employee: { id: string; firstName: string; lastName: string; email: string; avatarUrl?: string; jobTitle?: string };
  createdAt: string;
}

export interface CreateOneOnOneInput {
  employeeId: string;
  scheduledAt: string;
  duration?: number;
  location?: string;
  meetingLink?: string;
  agenda?: Array<{ topic: string; notes?: string }>;
}

export interface UpdateOneOnOneInput {
  managerNotes?: string;
  employeeNotes?: string;
  sharedNotes?: string;
  actionItems?: Array<{ title: string; done: boolean; assignee?: string }>;
  agenda?: Array<{ topic: string; notes?: string }>;
  location?: string;
  meetingLink?: string;
  scheduledAt?: string;
  duration?: number;
}

export const oneOnOnesApi = {
  create: (data: CreateOneOnOneInput) => api.post<OneOnOne>('/one-on-ones', data),
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    api.getPaginated<OneOnOne>('/one-on-ones', params),
  getUpcoming: () => api.get<OneOnOne[]>('/one-on-ones/upcoming'),
  getById: (id: string) => api.get<OneOnOne>(`/one-on-ones/${id}`),
  update: (id: string, data: UpdateOneOnOneInput) => api.put<OneOnOne>(`/one-on-ones/${id}`, data),
  start: (id: string) => api.post<OneOnOne>(`/one-on-ones/${id}/start`),
  complete: (id: string, data?: { sharedNotes?: string; actionItems?: any }) =>
    api.post<OneOnOne>(`/one-on-ones/${id}/complete`, data),
  cancel: (id: string) => api.post<OneOnOne>(`/one-on-ones/${id}/cancel`),
};
