/**
 * @module roles
 * @description Centralized role alias definitions and role-checking utilities.
 * Eliminates 5+ scattered inline role arrays across the codebase.
 *
 * The PMS platform uses both display names (e.g. `'Super Admin'`) and enum
 * keys (e.g. `'SUPER_ADMIN'`) interchangeably throughout the database and
 * frontend. This module provides a single source of truth for mapping those
 * aliases and exposes simple predicate functions for authorization checks.
 *
 * Role hierarchy (from highest to lowest privilege):
 * 1. **Super Admin** — platform-wide access across all tenants
 * 2. **Admin** — tenant-level administrative access (includes super-admins)
 * 3. **Manager** — management access including HR roles (includes admins)
 * 4. **Employee** — base-level access with no elevated privileges
 *
 * @example
 * ```ts
 * import { isSuperAdmin, isAdmin, MANAGER_ROLES } from '@/utils/roles';
 *
 * if (isSuperAdmin(user.roles)) {
 *   // Grant platform-wide access
 * }
 *
 * if (isAdmin(user.roles)) {
 *   // Grant tenant-level admin access
 * }
 * ```
 */

// ── Role Alias Constants ────────────────────────────────

/**
 * Roles that have super-admin (platform-wide) access.
 *
 * Includes both display-name and enum-key variants for `Super Admin`
 * and `System Admin`. Any user with at least one of these roles can
 * access cross-tenant functionality and the super-admin dashboard.
 */
export const SUPER_ADMIN_ROLES = [
  'Super Admin',
  'SUPER_ADMIN',
  'SYSTEM_ADMIN',
  'System Admin',
] as const;

/**
 * Roles that have tenant-admin access.
 *
 * This is a superset of {@link SUPER_ADMIN_ROLES} — it includes all
 * super-admin roles plus tenant-level admin aliases. Users with these
 * roles can manage tenant settings, users, and license allocations.
 */
export const ADMIN_ROLES = [
  ...SUPER_ADMIN_ROLES,
  'ADMIN',
  'Tenant Admin',
  'TENANT_ADMIN',
] as const;

/**
 * Roles that have management-level access.
 *
 * This is a superset of {@link ADMIN_ROLES} — it includes all admin
 * roles plus manager and HR aliases. Users with these roles can view
 * team dashboards, approve goals, and conduct reviews.
 */
export const MANAGER_ROLES = [
  ...ADMIN_ROLES,
  'MANAGER',
  'Manager',
  'HR_ADMIN',
  'HR Admin',
] as const;

/**
 * All recognized role aliases across the platform.
 *
 * This is a superset of {@link MANAGER_ROLES} plus HR Business Partner
 * and Employee variants. Used primarily for input validation — ensuring
 * that a role string from an Excel upload or API request is recognized.
 */
export const ALL_ROLE_ALIASES = [
  ...MANAGER_ROLES,
  'HR_BP',
  'HR Business Partner',
  'HR',
  'Employee',
  'EMPLOYEE',
] as const;

// ── Role Check Functions ────────────────────────────────

/**
 * Check if a user has super-admin (platform-wide) privileges.
 *
 * Returns `true` if any of the user's roles match the
 * {@link SUPER_ADMIN_ROLES} list (case-sensitive).
 *
 * @param roles - Array of role name strings assigned to the user
 * @returns `true` if the user holds at least one super-admin role
 *
 * @example
 * ```ts
 * const roles = ['SUPER_ADMIN', 'EMPLOYEE'];
 * isSuperAdmin(roles); // true
 * ```
 *
 * @example
 * ```ts
 * const roles = ['MANAGER'];
 * isSuperAdmin(roles); // false
 * ```
 */
export function isSuperAdmin(roles: string[]): boolean {
  return roles.some((r) => (SUPER_ADMIN_ROLES as readonly string[]).includes(r));
}

/**
 * Check if a user has admin (tenant-level or higher) privileges.
 *
 * Returns `true` if any of the user's roles match the
 * {@link ADMIN_ROLES} list, which includes all super-admin roles.
 *
 * @param roles - Array of role name strings assigned to the user
 * @returns `true` if the user holds at least one admin-level role
 *
 * @example
 * ```ts
 * const roles = ['Tenant Admin'];
 * isAdmin(roles); // true
 * ```
 *
 * @example
 * ```ts
 * const roles = ['EMPLOYEE'];
 * isAdmin(roles); // false
 * ```
 */
export function isAdmin(roles: string[]): boolean {
  return roles.some((r) => (ADMIN_ROLES as readonly string[]).includes(r));
}

/**
 * Check if a user has manager-level (or higher) privileges.
 *
 * Returns `true` if any of the user's roles match the
 * {@link MANAGER_ROLES} list, which includes admin and super-admin roles.
 *
 * @param roles - Array of role name strings assigned to the user
 * @returns `true` if the user holds at least one manager-level role
 *
 * @example
 * ```ts
 * const roles = ['HR Admin'];
 * isManager(roles); // true
 * ```
 *
 * @example
 * ```ts
 * const roles = ['EMPLOYEE'];
 * isManager(roles); // false
 * ```
 */
export function isManager(roles: string[]): boolean {
  return roles.some((r) => (MANAGER_ROLES as readonly string[]).includes(r));
}

/**
 * Check if a user is employee-only (no elevated roles).
 *
 * This is the inverse of {@link isManager} — returns `true` only when
 * the user has no manager, admin, or super-admin roles. Useful for
 * restricting views to self-service employee features.
 *
 * @param roles - Array of role name strings assigned to the user
 * @returns `true` if the user holds no elevated roles
 *
 * @example
 * ```ts
 * const roles = ['EMPLOYEE'];
 * isEmployeeOnly(roles); // true
 * ```
 *
 * @example
 * ```ts
 * const roles = ['MANAGER', 'EMPLOYEE'];
 * isEmployeeOnly(roles); // false
 * ```
 */
export function isEmployeeOnly(roles: string[]): boolean {
  return !isManager(roles);
}
