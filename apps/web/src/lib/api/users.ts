// ============================================================================
// Users & Auth API
// ============================================================================

import { api } from './client';
import type { User } from './types';

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
  setInitialPassword: (token: string, password: string) => api.post('/auth/password/set', { token, password }),
};

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
