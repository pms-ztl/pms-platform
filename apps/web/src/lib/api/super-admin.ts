// ============================================================================
// Super Admin API — separate client for /api/admin endpoints
// ============================================================================

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth';

class SuperAdminApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api/admin',
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.request.use((config) => {
      const token = useAuthStore.getState().accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
        const msg = (error.response?.data as any)?.error?.message || error.message || 'Request failed';
        return Promise.reject(new Error(msg));
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.get(url, config);
    return this.unwrap<T>(res.data);
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.post(url, data, config);
    return this.unwrap<T>(res.data);
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.put(url, data, config);
    return this.unwrap<T>(res.data);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.delete(url, config);
    return this.unwrap<T>(res.data);
  }

  /** Unwrap API response: { success, data } or { data } → data */
  private unwrap<T>(body: any): T {
    if (body && typeof body === 'object') {
      if ('success' in body) {
        if (!body.success) throw new Error(body.error?.message || 'Request failed');
        return body.data as T;
      }
      if ('data' in body && Object.keys(body).length === 1) {
        return body.data as T;
      }
    }
    return body as T;
  }
}

const superAdminApi = new SuperAdminApiClient();

// ── Super Admin Auth ──

export const superAdminAuthApi = {
  login: async (email: string, password: string): Promise<{
    user: { id: string; email: string; firstName: string; lastName: string; role: string };
    token: string;
    mfaRequired?: boolean;
    tempToken?: string;
  }> => {
    const res = await axios.post('/api/admin/auth/login', { email, password });
    const body = res.data;
    // MFA required response
    if (body.mfaRequired) {
      return { user: {} as any, token: '', mfaRequired: true, tempToken: body.tempToken };
    }
    return body.data;
  },

  verifyMfa: async (tempToken: string, code: string): Promise<{ token: string; verified: boolean }> => {
    const res = await axios.post('/api/admin/auth/mfa/verify', { tempToken, code });
    return res.data.data;
  },

  logout: async (token: string, refreshToken?: string): Promise<void> => {
    await axios.post('/api/admin/auth/logout', { refreshToken }, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

// ── Super Admin Types ──

export interface SADashboardStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  activeUsers: number;
  monthlyActiveUsers: number;
  apiRequestsToday: number;
  errorRate: number;
  uptime: number;
  planDistribution: Array<{ name: string; value: number }>;
  health: Record<string, string>;
  healthStatus: string;
}

export interface SATenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELLED' | 'EXPIRED';
  plan: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  settings: SATenantSettings;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  storageUsed: number;
  monthlyActiveUsers: number;
  maxLevel: number;
  licenseCount: number;
  maxUsers: number;
  isActive: boolean;
  subscriptionExpiresAt?: string;
  ceoEmail?: string;
  superAdminCanView: boolean;
  designatedManager?: {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
  };
}

export interface SATenantSettings {
  features: {
    goals: boolean;
    reviews: boolean;
    feedback: boolean;
    calibration: boolean;
    analytics: boolean;
    agenticAI: boolean;
  };
  ai?: {
    enabled: boolean;
    delegateToManagers: boolean;
  };
  limits: {
    maxUsers: number;
    maxStorageGb: number;
  };
  branding: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  security: {
    mfaRequired: boolean;
    ssoEnabled: boolean;
    passwordPolicy: 'STANDARD' | 'STRONG' | 'CUSTOM';
    sessionTimeout: number;
  };
}

export interface SAUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  tenantId?: string;
  tenantName?: string;
  lastLogin?: string;
  createdAt: string;
  mfaEnabled: boolean;
}

export interface SAAuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  tenantId?: string;
}

export interface SABillingInfo {
  tenantId: string;
  tenantName: string;
  plan: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  amount: number;
  currency: string;
  paymentMethod?: { type: string; last4?: string; brand?: string };
  invoices: SAInvoice[];
}

export interface SAInvoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
  dueDate: string;
  paidAt?: string;
  downloadUrl?: string;
}

export interface SASystemConfig {
  maintenance: { enabled: boolean; message?: string };
  features: { signupsEnabled: boolean; trialDays: number; defaultPlan: string; requireEmailVerification: boolean };
  email: { provider: string; fromAddress: string; fromName: string };
  security: { maxLoginAttempts: number; lockoutDuration: number; passwordMinLength: number; requireMfaForAdmins: boolean };
  limits: { maxTenantsPerAccount: number; maxApiRequestsPerMinute: number; maxFileUploadSizeMb: number };
}

export interface SAPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Super Admin API Modules ──

export const superAdminTenantsApi = {
  list: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    superAdminApi.get<SAPaginatedResponse<SATenant>>('/tenants', { params }),
  get: (id: string) => superAdminApi.get<SATenant>(`/tenants/${id}`),
  create: (data: Record<string, unknown>) => superAdminApi.post<SATenant>('/tenants', data),
  update: (id: string, data: Record<string, unknown>) => superAdminApi.put<SATenant>(`/tenants/${id}`, data),
  suspend: (id: string, reason: string) => superAdminApi.post(`/tenants/${id}/suspend`, { reason }),
  activate: (id: string) => superAdminApi.post(`/tenants/${id}/activate`),
  getMetrics: (id: string) =>
    superAdminApi.get<{ users: number; goals: number; reviews: number; storage: number }>(`/tenants/${id}/metrics`),
  updateSettings: (id: string, settings: Partial<SATenantSettings>) =>
    superAdminApi.put<SATenant>(`/tenants/${id}/settings`, settings),
  getDesignatedManager: (id: string) =>
    superAdminApi.get<{ id: string; email: string; firstName: string; lastName: string; isActive: boolean } | null>(`/tenants/${id}/designated-manager`),
  assignDesignatedManager: (id: string, managerUserId: string) =>
    superAdminApi.post(`/tenants/${id}/designated-manager`, { managerUserId }),
};

export const superAdminUsersApi = {
  list: (params?: { page?: number; limit?: number; tenantId?: string; role?: string; search?: string }) =>
    superAdminApi.get<SAPaginatedResponse<SAUser>>('/users', { params }),
  get: (id: string) => superAdminApi.get<SAUser>(`/users/${id}`),
  create: (data: Record<string, unknown>) => superAdminApi.post<SAUser>('/users', data),
  suspend: (id: string, reason: string) => superAdminApi.post(`/users/${id}/suspend`, { reason }),
  activate: (id: string) => superAdminApi.post(`/users/${id}/activate`),
  resetPassword: (id: string) => superAdminApi.post(`/users/${id}/reset-password`),
  disableMfa: (id: string) => superAdminApi.post(`/users/${id}/disable-mfa`),
};

export const superAdminSystemApi = {
  getDashboardStats: () => superAdminApi.get<SADashboardStats>('/system/dashboard'),
  getConfig: () => superAdminApi.get<SASystemConfig>('/system/config'),
  updateConfig: (config: Partial<SASystemConfig>) => superAdminApi.put<SASystemConfig>('/system/config', config),
  getHealth: () => superAdminApi.get<{ status: string; services: Record<string, string> }>('/system/health'),
  clearCache: (type?: string) => superAdminApi.post('/system/cache/clear', { type }),
};

export const superAdminAuditApi = {
  list: (params?: { page?: number; limit?: number; userId?: string; action?: string; resource?: string; startDate?: string; endDate?: string }) =>
    superAdminApi.get<SAPaginatedResponse<SAAuditLog>>('/audit', { params }),
};

export const superAdminBillingApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    superAdminApi.get<SAPaginatedResponse<SABillingInfo>>('/billing', { params }),
  getTenant: (tenantId: string) => superAdminApi.get<SABillingInfo>(`/billing/tenants/${tenantId}`),
  updatePlan: (tenantId: string, plan: string) => superAdminApi.put(`/billing/tenants/${tenantId}/plan`, { plan }),
  getRevenue: (params?: { period?: string }) =>
    superAdminApi.get<{ total: number; byPlan: Record<string, number>; trend: number[] }>('/billing/revenue', { params }),
};

export const superAdminSecurityApi = {
  getThreats: () =>
    superAdminApi.get<{ blocked: number; suspicious: number; recentAttempts: Array<{ ip: string; count: number; lastAttempt: string }> }>('/security/threats'),
  blockIp: (ip: string, reason: string) => superAdminApi.post('/security/ip/block', { ip, reason }),
  unblockIp: (ip: string) => superAdminApi.post('/security/ip/unblock', { ip }),
  getBlockedIps: () => superAdminApi.get<Array<{ ip: string; reason: string; blockedAt: string }>>('/security/ip/blocked'),
  getActiveSessions: (userId?: string) =>
    superAdminApi.get<Array<{ id: string; userId: string; ip: string; userAgent: string; createdAt: string }>>(
      '/security/sessions', { params: { userId } }
    ),
  terminateSession: (sessionId: string) => superAdminApi.delete(`/security/sessions/${sessionId}`),
};
