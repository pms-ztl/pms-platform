import type { Request } from 'express';

export interface JWTPayload {
  sub: string; // User ID
  tid: string; // Tenant ID
  email: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  tid: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  // Profile fields
  displayName?: string;
  avatarUrl?: string;
  jobTitle?: string;
  isActive: boolean;
  // Organizational structure fields
  departmentId?: string;
  businessUnitId?: string;
  costCenterId?: string;
  managerId?: string;
  level?: number;
  contractType?: string;
  // Security fields
  mfaEnabled?: boolean;
  // AI access
  aiAccessEnabled?: boolean;
  // Populated relations (for /auth/me response)
  department?: { id: string; name: string };
  manager?: { id: string; firstName: string; lastName: string };
}

// AuthenticatedRequest - use Request directly since we augment Express.Request
// Controllers should check if user exists before using
export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
  tenantId?: string;
};

export interface TenantContext {
  tenantId: string;
  userId: string;
  roles: string[];
  permissions: string[];
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: Record<string, unknown>;
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantSlug?: string;
  mfaCode?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SSOProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  provider: string;
  raw: Record<string, unknown>;
}

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
  scope: 'own' | 'team' | 'department' | 'businessUnit' | 'all';
  conditions?: Record<string, unknown>;
}

export interface RoleDefinition {
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
}

export const SystemRoles: Record<string, RoleDefinition> = {
  SUPER_ADMIN: {
    name: 'Super Admin',
    description: 'Full system access',
    permissions: [{ resource: '*', action: 'manage', scope: 'all' }],
    isSystem: true,
  },
  TENANT_ADMIN: {
    name: 'Tenant Admin',
    description: 'Full tenant administration',
    permissions: [
      { resource: 'users', action: 'manage', scope: 'all' },
      { resource: 'roles', action: 'manage', scope: 'all' },
      { resource: 'settings', action: 'manage', scope: 'all' },
      { resource: 'integrations', action: 'manage', scope: 'all' },
    ],
    isSystem: true,
  },
  HR_ADMIN: {
    name: 'HR Admin',
    description: 'HR administration',
    permissions: [
      { resource: 'users', action: 'read', scope: 'all' },
      { resource: 'goals', action: 'read', scope: 'all' },
      { resource: 'reviews', action: 'manage', scope: 'all' },
      { resource: 'feedback', action: 'read', scope: 'all' },
      { resource: 'calibration', action: 'manage', scope: 'all' },
      { resource: 'analytics', action: 'read', scope: 'all' },
    ],
    isSystem: true,
  },
  HR_BP: {
    name: 'HR Business Partner',
    description: 'HR business partner',
    permissions: [
      { resource: 'users', action: 'read', scope: 'department' },
      { resource: 'goals', action: 'read', scope: 'department' },
      { resource: 'reviews', action: 'read', scope: 'department' },
      { resource: 'feedback', action: 'read', scope: 'department' },
      { resource: 'calibration', action: 'read', scope: 'department' },
      { resource: 'analytics', action: 'read', scope: 'department' },
    ],
    isSystem: true,
  },
  MANAGER: {
    name: 'Manager',
    description: 'People manager',
    permissions: [
      { resource: 'users', action: 'read', scope: 'team' },
      { resource: 'goals', action: 'read', scope: 'team' },
      { resource: 'goals', action: 'update', scope: 'team' },
      { resource: 'reviews', action: 'create', scope: 'team' },
      { resource: 'reviews', action: 'read', scope: 'team' },
      { resource: 'reviews', action: 'update', scope: 'team' },
      { resource: 'feedback', action: 'create', scope: 'all' },
      { resource: 'feedback', action: 'read', scope: 'team' },
      { resource: 'calibration', action: 'read', scope: 'team' },
      { resource: 'one-on-ones', action: 'manage', scope: 'team' },
    ],
    isSystem: true,
  },
  EMPLOYEE: {
    name: 'Employee',
    description: 'Standard employee',
    permissions: [
      { resource: 'goals', action: 'create', scope: 'own' },
      { resource: 'goals', action: 'read', scope: 'own' },
      { resource: 'goals', action: 'update', scope: 'own' },
      { resource: 'reviews', action: 'read', scope: 'own' },
      { resource: 'reviews', action: 'update', scope: 'own' },
      { resource: 'feedback', action: 'create', scope: 'all' },
      { resource: 'feedback', action: 'read', scope: 'own' },
      { resource: 'one-on-ones', action: 'read', scope: 'own' },
    ],
    isSystem: true,
  },
};
