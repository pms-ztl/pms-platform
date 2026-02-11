import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * Get the optimized avatar URL for a given size.
 * For local uploads (/uploads/avatars/{uuid}.webp), appends size suffix.
 * For external URLs (dicebear, etc.), returns as-is.
 *
 * @param avatarUrl - The base avatar URL from the user object
 * @param size - 'sm' (64px), 'md' (160px), 'lg' (320px), or 'original' (800px)
 */
export function getAvatarUrl(avatarUrl: string | undefined | null, size: 'sm' | 'md' | 'lg' | 'original' = 'md'): string | null {
  if (!avatarUrl) return null;

  // External URLs (dicebear, robohash, etc.) — pass through
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }

  // Local uploads: /uploads/avatars/{uuid}.webp → /uploads/avatars/{uuid}-{size}.webp
  if (avatarUrl.startsWith('/uploads/avatars/') && size !== 'original') {
    const ext = avatarUrl.lastIndexOf('.');
    if (ext > 0) {
      return `${avatarUrl.substring(0, ext)}-${size}${avatarUrl.substring(ext)}`;
    }
  }

  return avatarUrl;
}

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().accessToken;
        console.log('[API Client] Request to:', config.url, 'Token exists:', !!token);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('[API Client] Added Authorization header');
        } else {
          console.warn('[API Client] No token available for request');
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiResponse<unknown>>) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 - try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = useAuthStore.getState().refreshToken;
            if (refreshToken) {
              const response = await this.client.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', {
                refreshToken,
              });

              if (response.data.success && response.data.data) {
                useAuthStore.getState().setTokens(
                  response.data.data.accessToken,
                  response.data.data.refreshToken
                );

                // Retry original request
                return this.client(originalRequest);
              }
            }
          } catch {
            // Refresh failed - logout
            useAuthStore.getState().logout();
            window.location.href = '/login';
          }
        }

        // Extract error message
        const errorMessage = error.response?.data?.error?.message || error.message || 'An error occurred';

        return Promise.reject(new Error(errorMessage));
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed');
    }
    return response.data.data as T;
  }

  async getRaw(url: string, config?: AxiosRequestConfig): Promise<string> {
    const response = await this.client.get(url, { ...config, responseType: 'text' });
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed');
    }
    return response.data.data as T;
  }

  async postFormData<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    });
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed');
    }
    return response.data.data as T;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed');
    }
    return response.data.data as T;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed');
    }
    return response.data.data as T;
  }

  async getBlob(url: string, config?: AxiosRequestConfig): Promise<Blob> {
    const response = await this.client.get(url, { ...config, responseType: 'blob' });
    return response.data;
  }

  async getPaginated<T>(
    url: string,
    params?: Record<string, unknown>
  ): Promise<{ data: T[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const response = await this.client.get<ApiResponse<T[]>>(url, { params });
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed');
    }
    return {
      data: response.data.data || [],
      meta: response.data.meta as { total: number; page: number; limit: number; totalPages: number },
    };
  }
}

export const api = new ApiClient();

// API endpoints
export const authApi = {
  login: (email: string, password: string, tenantSlug?: string) =>
    api.post<{ accessToken: string; refreshToken: string; expiresIn: number }>('/auth/login', {
      email,
      password,
      tenantSlug,
    }),
  verifyMfa: (tempToken: string, mfaCode: string) =>
    api.post<{ accessToken: string; refreshToken: string }>('/auth/mfa/verify', {
      tempToken,
      mfaCode,
    }),
  logout: (refreshToken?: string) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get<User>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/password/change', { currentPassword, newPassword }),
  setupMfa: () => api.post<{ secret: string; otpauthUrl: string }>('/auth/mfa/setup'),
  verifyMfaSetup: (code: string) => api.post('/auth/mfa/setup/verify', { code }),
  forgotPassword: (email: string) => api.post('/auth/password/forgot', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/password/reset', { token, password }),
};

export const goalsApi = {
  list: (params?: { page?: number; limit?: number; status?: string; type?: string; ownerId?: string }) =>
    api.getPaginated<Goal>('/goals', params),
  getMyGoals: (params?: { status?: string }) => api.getPaginated<Goal>('/goals/my', params),
  getById: (id: string) => api.get<Goal>(`/goals/${id}`),
  create: (data: CreateGoalInput) => api.post<Goal>('/goals', data),
  update: (id: string, data: UpdateGoalInput) => api.put<Goal>(`/goals/${id}`, data),
  delete: (id: string) => api.delete(`/goals/${id}`),
  updateProgress: (id: string, progress: number, note?: string) =>
    api.post<Goal>(`/goals/${id}/progress`, { progress, note }),
  getProgressHistory: (id: string) => api.get<any[]>(`/goals/${id}/progress/history`),
  getTree: (rootGoalId?: string) => api.get<Goal[]>('/goals/tree', { params: { rootGoalId } }),
  getTeamTree: () => api.get<Goal[]>('/goals/team-tree'),
  addComment: (id: string, content: string) => api.post<any>(`/goals/${id}/comments`, { content }),
  getComments: (id: string) => api.get<any[]>(`/goals/${id}/comments`),
};

export const reviewsApi = {
  listCycles: (params?: { status?: string }) => api.get<ReviewCycle[]>('/reviews/cycles', { params }),
  getCycle: (id: string) => api.get<ReviewCycle>(`/reviews/cycles/${id}`),
  getCycleStats: (id: string) => api.get<ReviewCycleStats>(`/reviews/cycles/${id}/stats`),
  createCycle: (data: CreateReviewCycleInput) => api.post<ReviewCycle>('/reviews/cycles', data),
  launchCycle: (id: string) => api.post<ReviewCycle>(`/reviews/cycles/${id}/launch`),
  listMyReviews: (params?: { asReviewer?: boolean; asReviewee?: boolean; cycleId?: string }) =>
    api.get<Review[]>('/reviews/my', { params }),
  getReview: (id: string) => api.get<Review>(`/reviews/${id}`),
  startReview: (id: string) => api.post<Review>(`/reviews/${id}/start`),
  saveDraft: (id: string, data: Partial<SubmitReviewInput>) =>
    api.put<Review>(`/reviews/${id}/draft`, data),
  submitReview: (id: string, data: SubmitReviewInput) =>
    api.post<Review>(`/reviews/${id}/submit`, data),
  acknowledgeReview: (id: string) => api.post<Review>(`/reviews/${id}/acknowledge`),
};

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
};

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  jobTitle?: string;
  employeeNumber?: string;
  departmentId?: string;
  managerId?: string;
  level?: number;
  hireDate?: string;
  roleIds?: string[];
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  jobTitle?: string;
  departmentId?: string | null;
  managerId?: string | null;
  level?: number;
  timezone?: string;
  locale?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
}

export interface Department {
  id: string;
  name: string;
  code: string | null;
}

export const usersApi = {
  list: (params?: { page?: number; limit?: number; search?: string; departmentId?: string; isActive?: boolean }) =>
    api.getPaginated<User>('/users', params),
  getById: (id: string) => api.get<User>(`/users/${id}`),
  getMyReports: () => api.get<User[]>('/users/my-reports'),
  getTeamMembers: () => api.getPaginated<User>('/users/team-members'),  // NEW: For feedback dropdowns
  getOrgChart: (rootUserId?: string) =>
    api.get<User[]>('/users/org-chart', { params: { rootUserId } }),
  create: (data: CreateUserInput) => api.post<User>('/users', data),
  update: (id: string, data: UpdateUserInput) => api.put<User>(`/users/${id}`, data),
  deactivate: (id: string) => api.post(`/users/${id}/deactivate`),
  reactivate: (id: string) => api.post(`/users/${id}/reactivate`),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  assignRole: (id: string, roleId: string) => api.post(`/users/${id}/roles`, { roleId }),
  removeRole: (id: string, roleId: string) => api.delete(`/users/${id}/roles/${roleId}`),
  listRoles: () => api.get<Role[]>('/users/roles'),
  listDepartments: () => api.get<Department[]>('/users/departments'),
  // Avatar management
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.postFormData<{ avatarUrl: string }>('/users/me/avatar', formData);
  },
  setAiAvatar: (avatarUrl: string) => api.post<{ avatarUrl: string }>('/users/me/ai-avatar', { avatarUrl }),
};

export const calibrationApi = {
  listSessions: (params?: { cycleId?: string; status?: string }) =>
    api.get<CalibrationSession[]>('/calibration/sessions', { params }),
  getSession: (id: string) => api.get<CalibrationSession>(`/calibration/sessions/${id}`),
  createSession: (data: CreateCalibrationSessionInput) =>
    api.post<CalibrationSession>('/calibration/sessions', data),
  startSession: (id: string) => api.post<CalibrationSession>(`/calibration/sessions/${id}/start`),
  getReviewsForCalibration: (sessionId: string) =>
    api.get<CalibrationReview[]>(`/calibration/sessions/${sessionId}/reviews`),
  adjustRating: (sessionId: string, data: AdjustRatingInput) =>
    api.post<CalibrationRating>(`/calibration/sessions/${sessionId}/ratings`, data),
};

// Type definitions
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  permissions: string[];
  displayName?: string;
  avatarUrl?: string;
  jobTitle?: string;
  department?: { id: string; name: string };
  manager?: { id: string; firstName: string; lastName: string };
  roles: string[];
  isActive: boolean;
  mfaEnabled?: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  progress: number;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  weight?: number;
  startDate?: string;
  dueDate?: string;
  createdById?: string;
  owner: { id: string; firstName: string; lastName: string; avatarUrl?: string };
  createdBy?: { id: string; firstName: string; lastName: string };
  parentGoal?: { id: string; title: string };
  childGoals?: Goal[];
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  type: string;
  priority?: string;
  parentGoalId?: string;
  ownerId?: string;
  startDate?: string;
  dueDate?: string;
  targetValue?: number;
  unit?: string;
  weight?: number;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  progress?: number;
}

export interface ReviewCycle {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  reviewCount?: number;
}

export interface ReviewCycleStats {
  total: number;
  notStarted: number;
  inProgress: number;
  submitted: number;
  calibrated: number;
  finalized: number;
  acknowledged: number;
  completionRate: number;
}

export interface CreateReviewCycleInput {
  name: string;
  description?: string;
  type: string;
  startDate: string;
  endDate: string;
}

export interface Review {
  id: string;
  cycleId: string;
  reviewee: { id: string; firstName: string; lastName: string; jobTitle?: string };
  reviewer: { id: string; firstName: string; lastName: string };
  type: string;
  status: string;
  overallRating?: number;
  content?: Record<string, unknown>;
  strengths?: string[];
  areasForGrowth?: string[];
  summary?: string;
  submittedAt?: string;
  acknowledgedAt?: string;
  cycle?: { id: string; name: string; status: string };
}

export interface SubmitReviewInput {
  overallRating: number;
  content: Record<string, unknown>;
  strengths?: string[];
  areasForGrowth?: string[];
  summary?: string;
}

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

export interface CalibrationSession {
  id: string;
  name: string;
  description?: string;
  status: string;
  scheduledStart: string;
  facilitator: { id: string; firstName: string; lastName: string };
  preAnalysis?: {
    totalReviews: number;
    outliers: unknown[];
    biasIndicators: unknown[];
  };
}

export interface CreateCalibrationSessionInput {
  cycleId: string;
  name: string;
  scheduledStart: string;
}

export interface CalibrationReview {
  id: string;
  reviewee: { id: string; firstName: string; lastName: string; jobTitle?: string; level: number };
  reviewer: { id: string; firstName: string; lastName: string };
  overallRating?: number;
  calibratedRating?: number;
  status: string;
}

export interface AdjustRatingInput {
  reviewId: string;
  adjustedRating: number;
  rationale: string;
}

export interface CalibrationRating {
  id: string;
  originalRating: number;
  adjustedRating: number;
  rationale: string;
}

export interface DashboardMetrics {
  goals: {
    total: number;
    completed: number;
    inProgress: number;
    avgProgress: number;
    onTrack: number;
    atRisk: number;
    overdue: number;
  };
  reviews: {
    activeCycles: number;
    completionRate: number;
    avgRating: number;
    pendingReviews: number;
    submittedReviews: number;
  };
  feedback: {
    total: number;
    praiseCount: number;
    constructiveCount: number;
    avgSentiment: number;
  };
  team: {
    totalEmployees: number;
    activeEmployees: number;
    avgGoalsPerEmployee: number;
  };
}

export interface PerformanceDistribution {
  rating: number;
  count: number;
  percentage: number;
}

export interface GoalTrend {
  month: string;
  completed: number;
  created: number;
  completionRate: number;
}

export interface FeedbackTrend {
  month: string;
  praise: number;
  constructive: number;
  total: number;
}

export interface TeamPerformance {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  avgGoalProgress: number;
  avgRating: number;
  feedbackCount: number;
}

export interface BiasMetric {
  dimension: string;
  category: string;
  avgRating: number;
  count: number;
  variance: number;
}

export const analyticsApi = {
  getDashboard: () => api.get<DashboardMetrics>('/analytics/dashboard'),
  getPerformanceDistribution: (cycleId?: string) =>
    api.get<PerformanceDistribution[]>('/analytics/performance-distribution', {
      params: cycleId ? { cycleId } : undefined,
    }),
  getGoalTrends: (months?: number) =>
    api.get<GoalTrend[]>('/analytics/goal-trends', { params: { months } }),
  getFeedbackTrends: (months?: number) =>
    api.get<FeedbackTrend[]>('/analytics/feedback-trends', { params: { months } }),
  getTeamPerformance: () => api.get<TeamPerformance[]>('/analytics/team-performance'),
  getBiasMetrics: (cycleId?: string) =>
    api.get<BiasMetric[]>('/analytics/bias-metrics', { params: cycleId ? { cycleId } : undefined }),
  getCycleStats: (cycleId: string) => api.get<any>(`/analytics/cycle/${cycleId}/stats`),
  exportData: (dataType: 'goals' | 'reviews' | 'feedback') =>
    api.getRaw(`/analytics/export/${dataType}`),
};

// ============================================================================
// Notifications API
// ============================================================================

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

// ============================================================================
// Evidence API
// ============================================================================

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

// ============================================================================
// Promotions API
// ============================================================================

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

// ============================================================================
// Compensation API
// ============================================================================

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

// ============================================================================
// Reports API
// ============================================================================

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

// ============================================================================
// Calendar Events API
// ============================================================================

export interface CalendarEventData {
  id: string;
  title: string;
  description?: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  type: 'MEETING' | 'DEADLINE' | 'REMINDER' | 'PERSONAL' | 'GOAL_RELATED' | 'REVIEW_RELATED';
  color?: string;
  recurrenceRule?: string;
  recurrenceEndDate?: string;
  parentEventId?: string;
  reminderMinutes: number[];
  goalId?: string;
  reviewCycleId?: string;
  goal?: { id: string; title: string };
  reviewCycle?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarEventInput {
  title: string;
  description?: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  type: string;
  color?: string;
  recurrenceRule?: string;
  recurrenceEndDate?: string;
  reminderMinutes?: number[];
  goalId?: string;
  reviewCycleId?: string;
}

export interface UpdateCalendarEventInput {
  title?: string;
  description?: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  type?: string;
  color?: string;
  recurrenceRule?: string;
  recurrenceEndDate?: string;
  reminderMinutes?: number[];
  goalId?: string | null;
  reviewCycleId?: string | null;
}

export const calendarEventsApi = {
  list: (params?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    goalId?: string;
    reviewCycleId?: string;
    page?: number;
    limit?: number;
  }) => api.getPaginated<CalendarEventData>('/calendar/events', params),
  getById: (id: string) => api.get<CalendarEventData>(`/calendar/events/${id}`),
  create: (data: CreateCalendarEventInput) =>
    api.post<CalendarEventData>('/calendar/events', data),
  update: (id: string, data: UpdateCalendarEventInput) =>
    api.put<CalendarEventData>(`/calendar/events/${id}`, data),
  delete: (id: string) => api.delete(`/calendar/events/${id}`),
};

// ============================================================================
// Performance Math API (Mathematical Engine)
// ============================================================================

export interface PerformanceScoreResult {
  overallScore: number;
  goalAttainment: number;
  reviewScore: number;
  feedbackScore: number;
  percentile: number | null;
  trajectory: number;
  confidence: number;
  weights: { goals: number; reviews: number; feedback: number; attendance: number; collaboration: number };
  derivedRating: number;
  dataPoints: { goals: number; reviews: number; feedbacks: number };
}

export interface GoalRiskResult {
  goalId: string;
  goalTitle: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  components: {
    scheduleRisk: number;
    velocityRisk: number;
    dependencyRisk: number;
    complexityRisk: number;
  };
  projectedCompletion: number;
  requiredVelocity: number;
  currentVelocity: number;
  daysNeededAtCurrentPace: number;
  daysRemaining: number;
}

export interface TeamAnalyticsResult {
  managerId: string;
  teamSize: number;
  avgScore: number;
  scoreSpread: number;
  ratingEntropy: number;
  giniCoefficient: number;
  velocityTrend: number;
  predictedNextAvg: number;
  memberZScores: Array<{
    userId: string;
    name: string;
    score: number;
    zScore: number;
    category: 'high' | 'average' | 'low';
  }>;
}

export interface GoalMappingResult {
  goalId: string;
  goalTitle: string;
  completionScore: number;
  qualityAdjustedScore: number;
  timelinessFactor: number;
  compositeScore: number;
  velocity: number;
  predictedCompletionDate: string | null;
  riskScore: number;
  efficiency: number;
  childGoals: Array<{
    goalId: string;
    title: string;
    progress: number;
    weight: number;
    weightedContribution: number;
  }>;
}

export interface CalibrationResult {
  cycleId: string;
  totalRatings: number;
  calibrations: Array<{
    reviewId: string;
    revieweeName: string;
    reviewerName: string;
    originalRating: number;
    calibratedRating: number;
    adjustment: number;
  }>;
  statistics: {
    avgOriginal: number;
    avgCalibrated: number;
    stdDevOriginal: number;
    stdDevCalibrated: number;
  };
}

// ============================================================================
// One-on-One Meetings API
// ============================================================================

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

// ============================================================================
// Development Plans API
// ============================================================================

export interface DevelopmentPlan {
  id: string;
  userId: string;
  planName: string;
  planType: string;
  status: string;
  careerGoal: string;
  targetRole?: string;
  targetLevel?: string;
  currentLevel: string;
  duration: number;
  startDate: string;
  targetCompletionDate: string;
  overallProgress: number;
  strengthsAssessed: string[];
  developmentAreas: string[];
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  user: { id: string; firstName: string; lastName: string; email: string; avatarUrl?: string; jobTitle?: string };
  activities: DevelopmentActivity[];
  checkpoints: DevelopmentCheckpoint[];
  createdAt: string;
}

export interface DevelopmentActivity {
  id: string;
  activityType: string;
  title: string;
  description: string;
  status: string;
  progressPercentage: number;
  provider?: string;
  learningObjectives: string[];
  targetSkills: string[];
  estimatedHours?: number;
  actualHours?: number;
  dueDate?: string;
  startDate?: string;
  completedDate?: string;
  resourceUrl?: string;
  cost?: number;
  priority?: string;
  isRequired: boolean;
  rating?: number;
  feedback?: string;
  completionEvidence?: string;
  certificateUrl?: string;
}

export interface DevelopmentCheckpoint {
  id: string;
  checkpointName: string;
  checkpointDate: string;
  checkpointType: string;
  status: string;
  progressReview?: string;
  skillsAcquired: string[];
  managerFeedback?: string;
  selfAssessment?: string;
  nextSteps: string[];
  completedAt?: string;
}

export interface CreateDevelopmentPlanInput {
  planName: string;
  planType: string;
  careerGoal: string;
  targetRole?: string;
  targetLevel?: string;
  currentLevel: string;
  duration: number;
  startDate: string;
  targetCompletionDate: string;
  strengthsAssessed?: string[];
  developmentAreas?: string[];
  notes?: string;
}

export interface CreateDevelopmentActivityInput {
  activityType: string;
  title: string;
  description: string;
  provider?: string;
  learningObjectives?: string[];
  targetSkills?: string[];
  estimatedHours?: number;
  dueDate?: string;
  startDate?: string;
  resourceUrl?: string;
  cost?: number;
  priority?: string;
  isRequired?: boolean;
}

export const developmentApi = {
  createPlan: (data: CreateDevelopmentPlanInput) => api.post<DevelopmentPlan>('/development/plans', data),
  listPlans: (params?: { status?: string; page?: number; limit?: number }) =>
    api.getPaginated<DevelopmentPlan>('/development/plans', params),
  getTeamPlans: () => api.get<DevelopmentPlan[]>('/development/plans/team'),
  getPlanById: (id: string) => api.get<DevelopmentPlan>(`/development/plans/${id}`),
  updatePlan: (id: string, data: Partial<CreateDevelopmentPlanInput>) =>
    api.put<DevelopmentPlan>(`/development/plans/${id}`, data),
  approvePlan: (id: string) => api.post<DevelopmentPlan>(`/development/plans/${id}/approve`),
  addActivity: (planId: string, data: CreateDevelopmentActivityInput) =>
    api.post<DevelopmentActivity>(`/development/plans/${planId}/activities`, data),
  updateActivity: (activityId: string, data: Partial<{
    status: string; progressPercentage: number; rating: number;
    feedback: string; completionEvidence: string; certificateUrl: string; actualHours: number;
  }>) => api.put<DevelopmentActivity>(`/development/activities/${activityId}`, data),
  addCheckpoint: (planId: string, data: { checkpointName: string; checkpointDate: string; checkpointType: string }) =>
    api.post<DevelopmentCheckpoint>(`/development/plans/${planId}/checkpoints`, data),
  completeCheckpoint: (checkpointId: string, data: {
    progressReview?: string; skillsAcquired?: string[];
    managerFeedback?: string; selfAssessment?: string; nextSteps?: string[];
  }) => api.put<DevelopmentCheckpoint>(`/development/checkpoints/${checkpointId}/complete`, data),
  getRecommendations: (userId?: string) =>
    api.get<any>(userId ? `/development/recommendations/${userId}` : '/development/recommendations'),
};

// ============================================================================
// PIP (Performance Improvement Plans) API
// ============================================================================

export interface PIP {
  id: string;
  userId: string;
  createdBy: string;
  pipTitle: string;
  pipType: string;
  severity: string;
  status: string;
  startDate: string;
  endDate: string;
  duration: number;
  reviewFrequency: string;
  performanceIssues: Array<{ issue: string; details?: string }>;
  impactStatement: string;
  performanceExpectations: string;
  specificGoals: Array<{ goal: string; metric?: string }>;
  measurableObjectives: Array<{ objective: string; target?: string }>;
  successCriteria: Array<{ criterion: string }>;
  supportProvided: Array<{ support: string }>;
  trainingRequired: string[];
  consequencesOfNonCompliance: string;
  outcome?: string;
  outcomeDate?: string;
  outcomeNotes?: string;
  employeeAcknowledged: boolean;
  acknowledgedAt?: string;
  employeeComments?: string;
  hrApprovedBy?: string;
  hrApprovedAt?: string;
  user: { id: string; firstName: string; lastName: string; email: string; avatarUrl?: string; jobTitle?: string };
  checkIns: PIPCheckIn[];
  milestoneProgress: PIPMilestone[];
  createdAt: string;
}

export interface PIPCheckIn {
  id: string;
  checkInDate: string;
  checkInType: string;
  progressSummary: string;
  performanceRating?: number;
  onTrack: boolean;
  positiveObservations: string[];
  concernsRaised: string[];
  managerFeedback: string;
  employeeFeedback?: string;
  actionItems: Array<{ item: string; assignee?: string; dueDate?: string }>;
  nextSteps: string[];
}

export interface PIPMilestone {
  id: string;
  milestoneName: string;
  description: string;
  dueDate: string;
  status: string;
  achievementLevel?: string;
  evaluationNotes?: string;
  completionDate?: string;
  successCriteria: Array<{ criterion: string }>;
}

export interface CreatePIPInput {
  userId: string;
  pipTitle: string;
  pipType: string;
  severity: string;
  startDate: string;
  endDate: string;
  reviewFrequency: string;
  performanceIssues: Array<{ issue: string; details?: string }>;
  impactStatement: string;
  performanceExpectations: string;
  specificGoals: Array<{ goal: string; metric?: string }>;
  measurableObjectives: Array<{ objective: string; target?: string }>;
  successCriteria: Array<{ criterion: string }>;
  supportProvided: Array<{ support: string }>;
  trainingRequired?: string[];
  consequencesOfNonCompliance: string;
}

export const pipApi = {
  create: (data: CreatePIPInput) => api.post<PIP>('/pip', data),
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    api.getPaginated<PIP>('/pip', params),
  getById: (id: string) => api.get<PIP>(`/pip/${id}`),
  approve: (id: string) => api.post<PIP>(`/pip/${id}/approve`),
  addCheckIn: (pipId: string, data: {
    checkInDate: string; checkInType: string; progressSummary: string;
    performanceRating?: number; onTrack: boolean; positiveObservations?: string[];
    concernsRaised?: string[]; managerFeedback: string; employeeFeedback?: string;
    actionItems?: Array<{ item: string; assignee?: string; dueDate?: string }>; nextSteps?: string[];
  }) => api.post<PIPCheckIn>(`/pip/${pipId}/check-ins`, data),
  addMilestone: (pipId: string, data: {
    milestoneName: string; description: string; dueDate: string;
    successCriteria: Array<{ criterion: string }>;
  }) => api.post<PIPMilestone>(`/pip/${pipId}/milestones`, data),
  updateMilestone: (milestoneId: string, data: {
    status?: string; achievementLevel?: string; evaluationNotes?: string;
  }) => api.put<PIPMilestone>(`/pip/milestones/${milestoneId}`, data),
  close: (pipId: string, data: { outcome: string; notes?: string }) =>
    api.post<PIP>(`/pip/${pipId}/close`, data),
  acknowledge: (pipId: string, data?: { comments?: string }) =>
    api.post<PIP>(`/pip/${pipId}/acknowledge`, data),
};

export const performanceMathApi = {
  getScore: (userId: string) =>
    api.get<PerformanceScoreResult>(`/performance-math/score/${userId}`),
  getGoalRisk: (goalId: string) =>
    api.get<GoalRiskResult>(`/performance-math/goal-risk/${goalId}`),
  getTeamAnalytics: (managerId: string) =>
    api.get<TeamAnalyticsResult>(`/performance-math/team/${managerId}`),
  calibrateRatings: (cycleId: string) =>
    api.post<CalibrationResult>('/performance-math/calibrate', { cycleId }),
  getGoalMapping: (goalId: string) =>
    api.get<GoalMappingResult>(`/performance-math/goal-mapping/${goalId}`),
  getCPIS: (userId: string) =>
    api.get<any>(`/performance-math/cpis/${userId}`),
};

// ============================================================================
// Admin Configuration API
// ============================================================================

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

export const successionApi = {
  list: (params?: any) => api.get<any[]>('/succession', params),
  getById: (id: string) => api.get<any>(`/succession/${id}`),
  create: (data: any) => api.post<any>('/succession', data),
  update: (id: string, data: any) => api.put<any>(`/succession/${id}`, data),
  delete: (id: string) => api.delete(`/succession/${id}`),
  getNineBoxGrid: () => api.get<any>('/succession/nine-box'),
  getReadiness: (id: string) => api.get<any[]>(`/succession/${id}/readiness`),
};

export const hrAnalyticsApi = {
  getCompensationAnalysis: () => api.get<any>('/analytics/compensation'),
  getBiasAnalysis: () => api.get<any>('/analytics/bias'),
  getNormalization: () => api.get<any>('/analytics/normalization'),
  getRatingDistribution: () => api.get<any>('/analytics/ratings'),
  getDepartmentMetrics: () => api.get<any[]>('/analytics/departments'),
};

// ============================================================================
// Audit Trail API
// ============================================================================

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

// ============================================================================
// Skills Assessment API
// ============================================================================

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

// ============================================================================
// Compliance API
// ============================================================================

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

// ============================================================================
// Announcements API
// ============================================================================

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
