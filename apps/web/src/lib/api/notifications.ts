// ============================================================================
// Notifications API
// ============================================================================

import { api } from './client';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  status: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  feedbackNotifications: boolean;
  reviewNotifications: boolean;
  goalNotifications: boolean;
  systemNotifications: boolean;
}

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.getPaginated<Notification>('/notifications', params),
  getUnreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  getPreferences: () => api.get<NotificationPreferences>('/notifications/preferences'),
  updatePreferences: (prefs: Partial<NotificationPreferences>) =>
    api.put<NotificationPreferences>('/notifications/preferences', prefs),
};
