/**
 * Role Utilities — single source of truth for role alias definitions.
 *
 * Consolidates role alias lists that were previously duplicated across
 * authorize.ts, DashboardPage.tsx, and various agent files. The PMS
 * platform uses both display names ('Super Admin') and enum keys
 * ('SUPER_ADMIN') interchangeably; this module normalizes that.
 */

// ── Role Alias Constants ────────────────────────────────

/** Roles that have super-admin (platform-wide) access */
export const SUPER_ADMIN_ROLES = [
  'Super Admin',
  'SUPER_ADMIN',
  'SYSTEM_ADMIN',
  'System Admin',
] as const;

/** Roles that have tenant-admin access (includes super-admins) */
export const ADMIN_ROLES = [
  ...SUPER_ADMIN_ROLES,
  'ADMIN',
  'Tenant Admin',
  'TENANT_ADMIN',
] as const;

/** Roles that have management access (includes HR and admins) */
export const MANAGER_ROLES = [
  ...ADMIN_ROLES,
  'MANAGER',
  'Manager',
  'HR_ADMIN',
  'HR Admin',
] as const;

/** All recognized role aliases (for validation) */
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
 * Check if a user has super-admin privileges.
 * @param roles - Array of role names assigned to the user
 */
export function isSuperAdmin(roles: string[]): boolean {
  return roles.some((r) => (SUPER_ADMIN_ROLES as readonly string[]).includes(r));
}

/**
 * Check if a user has admin (tenant-level or higher) privileges.
 * @param roles - Array of role names assigned to the user
 */
export function isAdmin(roles: string[]): boolean {
  return roles.some((r) => (ADMIN_ROLES as readonly string[]).includes(r));
}

/**
 * Check if a user has manager-level (or higher) privileges.
 * @param roles - Array of role names assigned to the user
 */
export function isManager(roles: string[]): boolean {
  return roles.some((r) => (MANAGER_ROLES as readonly string[]).includes(r));
}

/**
 * Check if a user is employee-only (no elevated roles).
 * @param roles - Array of role names assigned to the user
 */
export function isEmployeeOnly(roles: string[]): boolean {
  return !isManager(roles);
}
