import type { ReactNode } from 'react';
import { usePermission, useHasRole } from '@/hooks/usePermission';

interface PermissionGateProps {
  /** Resource name from the permissions catalog (e.g. 'goals', 'roles', 'users') */
  permission?: string;
  /** Action to check (e.g. 'create', 'read', 'update', 'delete', 'manage') */
  action?: string;
  /** Alternative: check by role names instead of permission */
  roles?: string[];
  /** Content to render when the user DOES have permission */
  children: ReactNode;
  /** Optional fallback content when the user does NOT have permission */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on the current user's permissions or roles.
 *
 * Usage (permission-based):
 *   <PermissionGate permission="goals" action="create">
 *     <CreateGoalButton />
 *   </PermissionGate>
 *
 * Usage (role-based):
 *   <PermissionGate roles={['ADMIN', 'HR_ADMIN']}>
 *     <AdminPanel />
 *   </PermissionGate>
 *
 * Usage (with fallback):
 *   <PermissionGate permission="roles" action="manage" fallback={<span>Read-only</span>}>
 *     <EditRoleButton />
 *   </PermissionGate>
 */
export function PermissionGate({
  permission,
  action = 'read',
  roles,
  children,
  fallback = null,
}: PermissionGateProps) {
  const hasPermResult = usePermission(permission ?? '', action);
  const hasRoleResult = useHasRole(roles ?? []);

  // If roles are specified, check roles; otherwise check permission
  const isAllowed = roles && roles.length > 0 ? hasRoleResult : hasPermResult;

  return <>{isAllowed ? children : fallback}</>;
}
