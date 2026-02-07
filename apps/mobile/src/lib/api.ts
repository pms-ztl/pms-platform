import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://api.pms.example.com';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    if (__DEV__) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (__DEV__) {
      console.error('[API Error]', error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

// Goals API
export const goalsApi = {
  list: (params?: { status?: string; page?: number }) =>
    api.get('/goals', { params }),
  get: (id: string) => api.get(`/goals/${id}`),
  create: (data: {
    title: string;
    description?: string;
    type: string;
    targetDate?: string;
    parentId?: string;
  }) => api.post('/goals', data),
  update: (id: string, data: Partial<{
    title: string;
    description: string;
    status: string;
    progress: number;
  }>) => api.put(`/goals/${id}`, data),
  delete: (id: string) => api.delete(`/goals/${id}`),
  updateProgress: (id: string, progress: number, note?: string) =>
    api.post(`/goals/${id}/progress`, { progress, note }),
};

// Reviews API
export const reviewsApi = {
  list: (params?: { status?: string }) => api.get('/reviews', { params }),
  get: (id: string) => api.get(`/reviews/${id}`),
  submit: (id: string, data: { responses: Record<string, unknown>; comments?: string }) =>
    api.post(`/reviews/${id}/submit`, data),
  getPending: () => api.get('/reviews/pending'),
};

// Feedback API
export const feedbackApi = {
  list: (params?: { type?: 'given' | 'received' }) =>
    api.get('/feedback', { params }),
  get: (id: string) => api.get(`/feedback/${id}`),
  create: (data: {
    recipientId: string;
    type: string;
    content: string;
    isAnonymous?: boolean;
  }) => api.post('/feedback', data),
  request: (data: { recipientId: string; context?: string }) =>
    api.post('/feedback/request', data),
};

// Team API
export const teamApi = {
  getDirectReports: () => api.get('/team/direct-reports'),
  getOrgChart: () => api.get('/team/org-chart'),
  getUser: (id: string) => api.get(`/users/${id}`),
};

// Notifications API
export const notificationsApi = {
  list: (params?: { unreadOnly?: boolean }) =>
    api.get('/notifications', { params }),
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  updatePushToken: (token: string) =>
    api.post('/notifications/push-token', { token }),
};

// Profile API
export const profileApi = {
  get: () => api.get('/profile'),
  update: (data: Partial<{
    firstName: string;
    lastName: string;
    avatar: string;
  }>) => api.put('/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/profile/change-password', data),
};

export default api;
