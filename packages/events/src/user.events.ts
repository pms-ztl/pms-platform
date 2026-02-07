import { z } from 'zod';
import type { BaseEvent } from './types';

// User event payload schemas
export const UserCreatedPayloadSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  departmentId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  createdById: z.string().uuid().optional(),
});

export const UserUpdatedPayloadSchema = z.object({
  userId: z.string().uuid(),
  changes: z.record(z.unknown()),
  updatedById: z.string().uuid(),
});

export const UserDeactivatedPayloadSchema = z.object({
  userId: z.string().uuid(),
  deactivatedById: z.string().uuid(),
  reason: z.string().optional(),
});

export const UserReactivatedPayloadSchema = z.object({
  userId: z.string().uuid(),
  reactivatedById: z.string().uuid(),
});

export const UserRoleAssignedPayloadSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  roleName: z.string(),
  assignedById: z.string().uuid(),
});

export const UserRoleRevokedPayloadSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  roleName: z.string(),
  revokedById: z.string().uuid(),
});

export const UserManagerChangedPayloadSchema = z.object({
  userId: z.string().uuid(),
  previousManagerId: z.string().uuid().optional(),
  newManagerId: z.string().uuid().optional(),
  changedById: z.string().uuid(),
});

export const UserDepartmentChangedPayloadSchema = z.object({
  userId: z.string().uuid(),
  previousDepartmentId: z.string().uuid().optional(),
  newDepartmentId: z.string().uuid().optional(),
  changedById: z.string().uuid(),
});

// Auth event payload schemas
export const UserLoggedInPayloadSchema = z.object({
  userId: z.string().uuid(),
  method: z.enum(['password', 'sso', 'mfa']),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export const UserLoggedOutPayloadSchema = z.object({
  userId: z.string().uuid(),
});

export const UserPasswordChangedPayloadSchema = z.object({
  userId: z.string().uuid(),
  method: z.enum(['self', 'reset', 'admin']),
});

export const UserMfaEnabledPayloadSchema = z.object({
  userId: z.string().uuid(),
});

export const UserMfaDisabledPayloadSchema = z.object({
  userId: z.string().uuid(),
  disabledById: z.string().uuid(),
});

// Event types
export type UserCreatedEvent = BaseEvent<'user.created', z.infer<typeof UserCreatedPayloadSchema>>;
export type UserUpdatedEvent = BaseEvent<'user.updated', z.infer<typeof UserUpdatedPayloadSchema>>;
export type UserDeactivatedEvent = BaseEvent<'user.deactivated', z.infer<typeof UserDeactivatedPayloadSchema>>;
export type UserReactivatedEvent = BaseEvent<'user.reactivated', z.infer<typeof UserReactivatedPayloadSchema>>;
export type UserRoleAssignedEvent = BaseEvent<'user.role_assigned', z.infer<typeof UserRoleAssignedPayloadSchema>>;
export type UserRoleRevokedEvent = BaseEvent<'user.role_revoked', z.infer<typeof UserRoleRevokedPayloadSchema>>;
export type UserManagerChangedEvent = BaseEvent<'user.manager_changed', z.infer<typeof UserManagerChangedPayloadSchema>>;
export type UserDepartmentChangedEvent = BaseEvent<'user.department_changed', z.infer<typeof UserDepartmentChangedPayloadSchema>>;
export type UserLoggedInEvent = BaseEvent<'user.logged_in', z.infer<typeof UserLoggedInPayloadSchema>>;
export type UserLoggedOutEvent = BaseEvent<'user.logged_out', z.infer<typeof UserLoggedOutPayloadSchema>>;
export type UserPasswordChangedEvent = BaseEvent<'user.password_changed', z.infer<typeof UserPasswordChangedPayloadSchema>>;
export type UserMfaEnabledEvent = BaseEvent<'user.mfa_enabled', z.infer<typeof UserMfaEnabledPayloadSchema>>;
export type UserMfaDisabledEvent = BaseEvent<'user.mfa_disabled', z.infer<typeof UserMfaDisabledPayloadSchema>>;

export type UserEvent =
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserDeactivatedEvent
  | UserReactivatedEvent
  | UserRoleAssignedEvent
  | UserRoleRevokedEvent
  | UserManagerChangedEvent
  | UserDepartmentChangedEvent
  | UserLoggedInEvent
  | UserLoggedOutEvent
  | UserPasswordChangedEvent
  | UserMfaEnabledEvent
  | UserMfaDisabledEvent;

// Event type constants
export const USER_EVENTS = {
  CREATED: 'user.created',
  UPDATED: 'user.updated',
  DEACTIVATED: 'user.deactivated',
  REACTIVATED: 'user.reactivated',
  ROLE_ASSIGNED: 'user.role_assigned',
  ROLE_REVOKED: 'user.role_revoked',
  MANAGER_CHANGED: 'user.manager_changed',
  DEPARTMENT_CHANGED: 'user.department_changed',
  LOGGED_IN: 'user.logged_in',
  LOGGED_OUT: 'user.logged_out',
  PASSWORD_CHANGED: 'user.password_changed',
  MFA_ENABLED: 'user.mfa_enabled',
  MFA_DISABLED: 'user.mfa_disabled',
} as const;
