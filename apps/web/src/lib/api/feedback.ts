// ============================================================================
// Feedback API
// ============================================================================

import { api } from './client';

export interface Feedback {
  id: string;
  fromUser?: { id: string; firstName: string; lastName: string };
  toUser: { id: string; firstName: string; lastName: string };
  type: string;
  visibility: string;
  content: string;
  isAnonymous: boolean;
  tags?: string[];
  sentiment?: string;
  createdAt: string;
  isAcknowledged: boolean;
}

export interface CreateFeedbackInput {
  toUserId: string;
  type: string;
  visibility: string;
  content: string;
  isAnonymous?: boolean;
  tags?: string[];
}

export interface TimelineEvent {
  type: 'feedback' | 'goal_update' | 'recognition';
  date: string;
  data: unknown;
}

export const feedbackApi = {
  create: (data: CreateFeedbackInput) => api.post<Feedback>('/feedback', data),
  listReceived: (params?: { type?: string; page?: number; limit?: number }) =>
    api.getPaginated<Feedback>('/feedback/received', params),
  listGiven: (params?: { page?: number; limit?: number }) => api.getPaginated<Feedback>('/feedback/given', params),
  listTeam: (params?: { teamMemberId?: string; page?: number; limit?: number }) =>
    api.getPaginated<Feedback>('/feedback/team', params),
  getTimeline: (userId?: string) => api.get<TimelineEvent[]>(userId ? `/feedback/timeline/${userId}` : '/feedback/timeline'),
  acknowledge: (id: string) => api.post<Feedback>(`/feedback/${id}/acknowledge`),
  requestFeedback: (fromUserId: string, aboutUserId?: string, message?: string) =>
    api.post('/feedback/request', { fromUserId, aboutUserId, message }),
  getRecognitionWall: (params?: { page?: number; limit?: number }) =>
    api.getPaginated<Feedback>('/feedback/recognition-wall', params),
  getTopRecognized: (period?: string) =>
    api.get<Array<{ user: { id: string; firstName: string; lastName: string; avatarUrl?: string; jobTitle?: string }; count: number }>>('/feedback/top-recognized', { params: { period } }),
  update: (id: string, data: { content?: string; type?: string; tags?: string[] }) =>
    api.put<Feedback>(`/feedback/${id}`, data),
  delete: (id: string) => api.delete<void>(`/feedback/${id}`),
};
