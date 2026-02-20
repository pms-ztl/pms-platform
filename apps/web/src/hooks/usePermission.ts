import { useAuthStore } from '@/store/auth';
import { hasPermission } from '@/store/auth';

/**
 * Hook to check if the current user has a specific permission.
 *
 * Usage:
 *   const canCreate = usePermission('goals', 'create');
 *   const canManage = usePermission('roles', 'manage');
 */
export function usePermission(resource: string, action: string): boolean {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  return hasPermission(permissions, resource, action);
}

/**
 * Hook to check if the current user has any of the specified roles.
 *
 * Usage:
 *   const isAdmin = useHasRole(['ADMIN', 'HR_ADMIN', 'SUPER_ADMIN']);
 */
export function useHasRole(requiredRoles: string[]): boolean {
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const normalized = roles.map((r) => r.trim().toUpperCase().replace(/\s+/g, '_'));
  return requiredRoles.some((r) => normalized.includes(r.toUpperCase().replace(/\s+/g, '_')));
}
