import axios, { AxiosError, AxiosResponse } from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: '/api/admin',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELLED' | 'EXPIRED';
  plan: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  settings: TenantSettings;
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

export interface TenantSettings {
  features: {
    goals: boolean;
    reviews: boolean;
    feedback: boolean;
    calibration: boolean;
    analytics: boolean;
    integrations: boolean;
  };
  limits: {
    maxUsers: number;
    maxStorageGb: number;
    maxIntegrations: number;
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

export interface SystemUser {
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

export interface AuditLog {
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

export interface SystemMetrics {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  activeUsers: number;
  monthlyActiveUsers: number;
  storageUsedGb: number;
  apiRequestsToday: number;
  errorRate: number;
  avgResponseTime: number;
  uptime: number;
}

export interface DashboardStats extends SystemMetrics {
  planDistribution: Array<{ name: string; value: number }>;
  health: Record<string, string>;
  healthStatus: string;
}

export interface BillingInfo {
  tenantId: string;
  tenantName: string;
  plan: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  amount: number;
  currency: string;
  paymentMethod?: {
    type: string;
    last4?: string;
    brand?: string;
  };
  invoices: Invoice[];
}

export interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
  dueDate: string;
  paidAt?: string;
  downloadUrl?: string;
}

export interface SystemConfig {
  maintenance: {
    enabled: boolean;
    message?: string;
    scheduledStart?: string;
    scheduledEnd?: string;
  };
  features: {
    signupsEnabled: boolean;
    trialDays: number;
    defaultPlan: string;
    requireEmailVerification: boolean;
  };
  email: {
    provider: string;
    fromAddress: string;
    fromName: string;
  };
  security: {
    maxLoginAttempts: number;
    lockoutDuration: number;
    passwordMinLength: number;
    requireMfaForAdmins: boolean;
  };
  limits: {
    maxTenantsPerAccount: number;
    maxApiRequestsPerMinute: number;
    maxFileUploadSizeMb: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ user: SystemUser; token: string }>('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post<{ token: string }>('/auth/refresh'),
  verifyMfa: (code: string) => api.post<{ verified: boolean }>('/auth/mfa/verify', { code }),
};

// Tenants API
export const tenantsApi = {
  list: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    api.get<PaginatedResponse<Tenant>>('/tenants', { params }),
  get: (id: string) => api.get<Tenant>(`/tenants/${id}`),
  create: (data: Partial<Tenant>) => api.post<Tenant>('/tenants', data),
  update: (id: string, data: Partial<Tenant>) => api.put<Tenant>(`/tenants/${id}`, data),
  delete: (id: string) => api.delete(`/tenants/${id}`),
  suspend: (id: string, reason: string) => api.post(`/tenants/${id}/suspend`, { reason }),
  activate: (id: string) => api.post(`/tenants/${id}/activate`),
  getMetrics: (id: string) =>
    api.get<{ users: number; goals: number; reviews: number; storage: number }>(`/tenants/${id}/metrics`),
  updateSettings: (id: string, settings: Partial<TenantSettings>) =>
    api.put<Tenant>(`/tenants/${id}/settings`, settings),
  exportData: (id: string) => api.post<{ downloadUrl: string }>(`/tenants/${id}/export`),
  getDesignatedManager: (id: string) =>
    api.get<{ id: string; email: string; firstName: string; lastName: string; isActive: boolean } | null>(`/tenants/${id}/designated-manager`),
  assignDesignatedManager: (id: string, managerUserId: string) =>
    api.post(`/tenants/${id}/designated-manager`, { managerUserId }),
};

// Users API
export const usersApi = {
  list: (params?: { page?: number; limit?: number; tenantId?: string; role?: string; search?: string }) =>
    api.get<PaginatedResponse<SystemUser>>('/users', { params }),
  get: (id: string) => api.get<SystemUser>(`/users/${id}`),
  create: (data: Partial<SystemUser>) => api.post<SystemUser>('/users', data),
  update: (id: string, data: Partial<SystemUser>) => api.put<SystemUser>(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  suspend: (id: string, reason: string) => api.post(`/users/${id}/suspend`, { reason }),
  activate: (id: string) => api.post(`/users/${id}/activate`),
  resetPassword: (id: string) => api.post(`/users/${id}/reset-password`),
  disableMfa: (id: string) => api.post(`/users/${id}/disable-mfa`),
  impersonate: (id: string) => api.post<{ token: string }>(`/users/${id}/impersonate`),
};

// System API
export const systemApi = {
  getDashboardStats: () => api.get<DashboardStats>('/system/dashboard'),
  getMetrics: () => api.get<SystemMetrics>('/system/metrics'),
  getConfig: () => api.get<SystemConfig>('/system/config'),
  updateConfig: (config: Partial<SystemConfig>) => api.put<SystemConfig>('/system/config', config),
  getHealth: () => api.get<{ status: string; services: Record<string, string> }>('/system/health'),
  runMaintenance: (task: string) => api.post('/system/maintenance', { task }),
  clearCache: (type?: string) => api.post('/system/cache/clear', { type }),
};

// Audit API
export const auditApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get<PaginatedResponse<AuditLog>>('/audit', { params }),
  export: (params?: { startDate?: string; endDate?: string; format?: 'csv' | 'json' }) =>
    api.post<{ downloadUrl: string }>('/audit/export', params),
};

// Billing API
export const billingApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<PaginatedResponse<BillingInfo>>('/billing', { params }),
  getTenant: (tenantId: string) => api.get<BillingInfo>(`/billing/tenants/${tenantId}`),
  updatePlan: (tenantId: string, plan: string) => api.put(`/billing/tenants/${tenantId}/plan`, { plan }),
  createInvoice: (tenantId: string, data: Partial<Invoice>) =>
    api.post<Invoice>(`/billing/tenants/${tenantId}/invoices`, data),
  getRevenue: (params?: { period?: string }) =>
    api.get<{ total: number; byPlan: Record<string, number>; trend: number[] }>('/billing/revenue', { params }),
};

// Security API
export const securityApi = {
  getThreats: () =>
    api.get<{ blocked: number; suspicious: number; recentAttempts: Array<{ ip: string; count: number; lastAttempt: string }> }>(
      '/security/threats'
    ),
  blockIp: (ip: string, reason: string) => api.post('/security/ip/block', { ip, reason }),
  unblockIp: (ip: string) => api.post('/security/ip/unblock', { ip }),
  getBlockedIps: () => api.get<Array<{ ip: string; reason: string; blockedAt: string }>>('/security/ip/blocked'),
  getActiveSessions: (userId?: string) =>
    api.get<Array<{ id: string; userId: string; ip: string; userAgent: string; createdAt: string }>>(
      '/security/sessions',
      { params: { userId } }
    ),
  terminateSession: (sessionId: string) => api.delete(`/security/sessions/${sessionId}`),
  terminateAllSessions: (userId: string) => api.delete(`/security/sessions/user/${userId}`),
};

// Integrations API
export const integrationsApi = {
  list: () =>
    api.get<Array<{ id: string; name: string; type: string; status: string; connectedTenants: number }>>('/integrations'),
  getConfig: (id: string) => api.get<Record<string, unknown>>(`/integrations/${id}/config`),
  updateConfig: (id: string, config: Record<string, unknown>) => api.put(`/integrations/${id}/config`, config),
  enable: (id: string) => api.post(`/integrations/${id}/enable`),
  disable: (id: string) => api.post(`/integrations/${id}/disable`),
};

export default api;
