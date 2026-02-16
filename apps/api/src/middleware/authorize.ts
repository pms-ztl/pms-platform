import type { Response, NextFunction, RequestHandler } from 'express';

import type { AuthenticatedRequest } from '../types';
import { AuthorizationError } from '../utils/errors';
import { prisma } from '../lib/prisma';
import { auditLogger } from '../utils/logger';
import { ADMIN_ROLES, ALL_ROLE_ALIASES } from '../utils/roles';

type PermissionCheck = {
  resource?: string;
  action?: 'create' | 'read' | 'update' | 'delete' | 'manage';
  scope?: 'own' | 'team' | 'department' | 'businessUnit' | 'all';
  roles?: string[];
};

export function authorize(...requiredPermissions: PermissionCheck[]): RequestHandler {
  return (req, res: Response, next: NextFunction): void => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;

      if (user === undefined) {
        throw new AuthorizationError('User not authenticated');
      }

      // Super admin bypass
      if (user.roles.includes('Super Admin') || user.roles.includes('SUPER_ADMIN')) {
        next();
        return;
      }

      // Check if user has any of the required permissions or roles
      const hasAccess = requiredPermissions.some((required) => {
        // Check roles if specified
        if (required.roles && required.roles.length > 0) {
          return required.roles.some((role) => user.roles.includes(role));
        }
        // Check permissions if specified
        if (required.resource && required.action) {
          return checkPermission(user.permissions, required as { resource: string; action: string; scope?: string });
        }
        return false;
      });

      if (!hasAccess) {
        const permissionDesc = requiredPermissions
          .map((p) => {
            if (p.roles) return `roles: ${p.roles.join('|')}`;
            return `${p.action}:${p.resource}`;
          })
          .join(' or ');
        throw new AuthorizationError(`Missing required permission: ${permissionDesc}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Role name mapping: display name -> database key and vice versa
const ROLE_ALIASES: Record<string, string[]> = {
  'HR Admin': ['HR_ADMIN', 'HR Admin'],
  'HR_ADMIN': ['HR Admin', 'HR_ADMIN'],
  'Tenant Admin': ['TENANT_ADMIN', 'ADMIN', 'Tenant Admin'],
  'TENANT_ADMIN': ['Tenant Admin', 'TENANT_ADMIN', 'ADMIN'],
  'ADMIN': ['Tenant Admin', 'TENANT_ADMIN', 'ADMIN'],
  'HR Business Partner': ['HR_BP', 'HR Business Partner'],
  'HR_BP': ['HR Business Partner', 'HR_BP'],
  'Manager': ['MANAGER', 'Manager'],
  'MANAGER': ['Manager', 'MANAGER'],
  'Employee': ['EMPLOYEE', 'Employee'],
  'EMPLOYEE': ['Employee', 'EMPLOYEE'],
  'Super Admin': ['SUPER_ADMIN', 'Super Admin'],
  'SUPER_ADMIN': ['Super Admin', 'SUPER_ADMIN'],
};

export function requireRoles(...roles: string[]): RequestHandler {
  return (req, res: Response, next: NextFunction): void => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;

      if (user === undefined) {
        throw new AuthorizationError('User not authenticated');
      }

      // Super admin bypass - check all possible admin role names
      if ((ADMIN_ROLES as readonly string[]).some(alias => user.roles.includes(alias))) {
        next();
        return;
      }

      // Check if user has any of the required roles (considering aliases)
      const hasRole = roles.some((requiredRole) => {
        // Direct match
        if (user.roles.includes(requiredRole)) {
          return true;
        }
        // Check aliases
        const aliases = ROLE_ALIASES[requiredRole] || [];
        return aliases.some(alias => user.roles.includes(alias));
      });

      if (!hasRole) {
        throw new AuthorizationError(`Missing required role: ${roles.join(' or ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

function checkPermission(
  userPermissions: string[],
  required: { resource: string; action: string; scope?: string }
): boolean {
  // Permission format: "resource:action:scope" or "resource:action" or "*:manage:all"
  return userPermissions.some((perm) => {
    const [permResource, permAction, permScope] = perm.split(':');

    // Wildcard resource (super admin)
    if (permResource === '*' && permAction === 'manage') {
      return true;
    }

    // Check resource
    if (permResource !== required.resource && permResource !== '*') {
      return false;
    }

    // Check action (manage includes all actions)
    if (permAction !== required.action && permAction !== 'manage') {
      return false;
    }

    // Check scope if required
    if (required.scope !== undefined && permScope !== undefined) {
      const scopeHierarchy = ['own', 'team', 'department', 'businessUnit', 'all'];
      const userScopeIndex = scopeHierarchy.indexOf(permScope);
      const requiredScopeIndex = scopeHierarchy.indexOf(required.scope);

      if (userScopeIndex < requiredScopeIndex) {
        return false;
      }
    }

    return true;
  });
}

// Extended resource type for ABAC
interface ResourceContext {
  ownerId?: string;
  departmentId?: string;
  businessUnitId?: string;
  teamId?: string;
  tenantId: string;
}

// Cache for team memberships and reporting lines (per-request)
const membershipCache = new Map<string, {
  teamIds: string[];
  reportIds: string[];
  delegatedFromIds: string[];
  timestamp: number;
}>();

const CACHE_TTL = 60000; // 1 minute cache

// Get user's team memberships
async function getUserTeamIds(userId: string, tenantId: string): Promise<string[]> {
  const memberships = await prisma.teamMember.findMany({
    where: {
      userId,
      team: { tenantId },
      OR: [
        { endDate: null },
        { endDate: { gt: new Date() } }
      ]
    },
    select: { teamId: true }
  });
  return memberships.map(m => m.teamId);
}

// Get all users who report to this user (direct and via reporting lines)
async function getReportingUserIds(managerId: string, tenantId: string): Promise<string[]> {
  const reportIds: string[] = [];

  // Direct reports via User.managerId
  const directReports = await prisma.user.findMany({
    where: {
      managerId,
      tenantId,
      isActive: true,
      deletedAt: null
    },
    select: { id: true }
  });
  reportIds.push(...directReports.map(r => r.id));

  // Matrix/dotted line reports via ReportingLine
  const reportingLines = await prisma.reportingLine.findMany({
    where: {
      managerId,
      tenantId,
      deletedAt: null,
      OR: [
        { endDate: null },
        { endDate: { gt: new Date() } }
      ]
    },
    select: { reporterId: true }
  });
  reportIds.push(...reportingLines.map(r => r.reporterId));

  return [...new Set(reportIds)]; // Remove duplicates
}

// Get users who have delegated authority to this user
async function getDelegatedFromUserIds(delegateId: string, tenantId: string): Promise<string[]> {
  const now = new Date();
  const delegations = await prisma.delegation.findMany({
    where: {
      delegateId,
      tenantId,
      status: 'ACTIVE',
      startDate: { lte: now },
      OR: [
        { endDate: null },
        { endDate: { gt: now } }
      ]
    },
    select: { delegatorId: true }
  });
  return delegations.map(d => d.delegatorId);
}

// Get cached or fresh membership data
async function getUserMembershipData(userId: string, tenantId: string): Promise<{
  teamIds: string[];
  reportIds: string[];
  delegatedFromIds: string[];
}> {
  const cacheKey = `${userId}:${tenantId}`;
  const cached = membershipCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return {
      teamIds: cached.teamIds,
      reportIds: cached.reportIds,
      delegatedFromIds: cached.delegatedFromIds
    };
  }

  const [teamIds, reportIds, delegatedFromIds] = await Promise.all([
    getUserTeamIds(userId, tenantId),
    getReportingUserIds(userId, tenantId),
    getDelegatedFromUserIds(userId, tenantId)
  ]);

  membershipCache.set(cacheKey, {
    teamIds,
    reportIds,
    delegatedFromIds,
    timestamp: Date.now()
  });

  return { teamIds, reportIds, delegatedFromIds };
}

// Get all team members for given team IDs
async function getTeamMemberIds(teamIds: string[]): Promise<string[]> {
  if (teamIds.length === 0) return [];

  const members = await prisma.teamMember.findMany({
    where: {
      teamId: { in: teamIds },
      OR: [
        { endDate: null },
        { endDate: { gt: new Date() } }
      ]
    },
    select: { userId: true }
  });
  return [...new Set(members.map(m => m.userId))];
}

// Get all users in a department (including sub-departments)
async function getDepartmentUserIds(departmentId: string, tenantId: string): Promise<string[]> {
  // Get all sub-department IDs recursively
  const allDeptIds = await getAllChildDepartmentIds(departmentId, tenantId);
  allDeptIds.push(departmentId);

  const users = await prisma.user.findMany({
    where: {
      departmentId: { in: allDeptIds },
      tenantId,
      isActive: true,
      deletedAt: null
    },
    select: { id: true }
  });
  return users.map(u => u.id);
}

// Recursively get all child department IDs
async function getAllChildDepartmentIds(parentId: string, tenantId: string): Promise<string[]> {
  const children = await prisma.department.findMany({
    where: {
      parentId,
      tenantId,
      isActive: true,
      deletedAt: null
    },
    select: { id: true }
  });

  const childIds = children.map(c => c.id);
  const grandchildIds = await Promise.all(
    childIds.map(id => getAllChildDepartmentIds(id, tenantId))
  );

  return [...childIds, ...grandchildIds.flat()];
}

// Get all users in a business unit (including sub-units)
async function getBusinessUnitUserIds(businessUnitId: string, tenantId: string): Promise<string[]> {
  // Get all sub-unit IDs recursively
  const allUnitIds = await getAllChildBusinessUnitIds(businessUnitId, tenantId);
  allUnitIds.push(businessUnitId);

  const users = await prisma.user.findMany({
    where: {
      businessUnitId: { in: allUnitIds },
      tenantId,
      isActive: true,
      deletedAt: null
    },
    select: { id: true }
  });
  return users.map(u => u.id);
}

// Recursively get all child business unit IDs
async function getAllChildBusinessUnitIds(parentId: string, tenantId: string): Promise<string[]> {
  const children = await prisma.businessUnit.findMany({
    where: {
      parentId,
      tenantId,
      isActive: true,
      deletedAt: null
    },
    select: { id: true }
  });

  const childIds = children.map(c => c.id);
  const grandchildIds = await Promise.all(
    childIds.map(id => getAllChildBusinessUnitIds(id, tenantId))
  );

  return [...childIds, ...grandchildIds.flat()];
}

// Attribute-based access control helpers - Enhanced version
export async function checkResourceAccessAsync(
  user: NonNullable<AuthenticatedRequest['user']>,
  resource: ResourceContext,
  requiredScope: 'own' | 'team' | 'department' | 'businessUnit' | 'all'
): Promise<boolean> {
  // Tenant isolation
  if (resource.tenantId !== user.tenantId) {
    auditLogger('CROSS_TENANT_ACCESS_BLOCKED', user.id, user.tenantId, 'security', resource.tenantId ?? 'unknown', {
      attemptedTenantId: resource.tenantId,
      userTenantId: user.tenantId,
      requiredScope,
    });
    return false;
  }

  // Super admin bypass - check all possible admin role names
  if ((ADMIN_ROLES as readonly string[]).some(alias => user.roles.includes(alias))) {
    return true;
  }

  // Get user's membership data (cached)
  const { teamIds, reportIds, delegatedFromIds } = await getUserMembershipData(user.id, user.tenantId);

  // Check for delegation - if someone delegated to this user, check if resource belongs to delegator
  const allAccessibleOwnerIds = [user.id, ...delegatedFromIds];

  switch (requiredScope) {
    case 'own':
      // User can access their own resources or resources of users who delegated to them
      return resource.ownerId !== undefined && allAccessibleOwnerIds.includes(resource.ownerId);

    case 'team':
      // User can access if:
      // 1. Resource belongs to themselves
      // 2. Resource belongs to someone who reports to them (direct or matrix)
      // 3. Resource belongs to a team member of one of their teams
      // 4. Resource belongs to someone who delegated to them
      if (resource.ownerId !== undefined) {
        if (allAccessibleOwnerIds.includes(resource.ownerId)) {
          return true;
        }
        if (reportIds.includes(resource.ownerId)) {
          return true;
        }
      }
      // Check if resource is in one of user's teams
      if (resource.teamId !== undefined && teamIds.includes(resource.teamId)) {
        return true;
      }
      // Check if resource owner is in one of user's teams
      if (resource.ownerId !== undefined && teamIds.length > 0) {
        const teamMemberIds = await getTeamMemberIds(teamIds);
        if (teamMemberIds.includes(resource.ownerId)) {
          return true;
        }
      }
      return false;

    case 'department':
      // User can access resources within their department hierarchy
      if (resource.ownerId !== undefined && allAccessibleOwnerIds.includes(resource.ownerId)) {
        return true;
      }
      if (resource.ownerId !== undefined && reportIds.includes(resource.ownerId)) {
        return true;
      }
      // Check if user is department head or resource is in their department
      if (resource.departmentId !== undefined && user.departmentId !== undefined) {
        // Get user's department info
        const userDept = await prisma.department.findUnique({
          where: { id: user.departmentId },
          select: { id: true, headId: true }
        });

        // If user is department head, they can access all resources in department
        if (userDept?.headId === user.id) {
          const deptUserIds = await getDepartmentUserIds(resource.departmentId, user.tenantId);
          if (resource.ownerId !== undefined && deptUserIds.includes(resource.ownerId)) {
            return true;
          }
          // Check if resource's department is same or child of user's department
          const userDeptIds = await getAllChildDepartmentIds(user.departmentId, user.tenantId);
          userDeptIds.push(user.departmentId);
          if (userDeptIds.includes(resource.departmentId)) {
            return true;
          }
        }

        // Regular user can access resources in their own department
        if (resource.departmentId === user.departmentId) {
          return true;
        }
      }
      return false;

    case 'businessUnit':
      // User can access resources within their business unit hierarchy
      if (resource.ownerId !== undefined && allAccessibleOwnerIds.includes(resource.ownerId)) {
        return true;
      }
      if (resource.businessUnitId !== undefined && user.businessUnitId !== undefined) {
        // Get user's business unit info
        const userBU = await prisma.businessUnit.findUnique({
          where: { id: user.businessUnitId },
          select: { id: true, headId: true }
        });

        // If user is BU head, they can access all resources in BU
        if (userBU?.headId === user.id) {
          const buUserIds = await getBusinessUnitUserIds(resource.businessUnitId, user.tenantId);
          if (resource.ownerId !== undefined && buUserIds.includes(resource.ownerId)) {
            return true;
          }
          // Check if resource's BU is same or child of user's BU
          const userBUIds = await getAllChildBusinessUnitIds(user.businessUnitId, user.tenantId);
          userBUIds.push(user.businessUnitId);
          if (userBUIds.includes(resource.businessUnitId)) {
            return true;
          }
        }

        // Regular user can access resources in their own BU
        if (resource.businessUnitId === user.businessUnitId) {
          return true;
        }
      }
      return false;

    case 'all':
      return true;

    default:
      return false;
  }
}

// Synchronous version for backward compatibility (basic checks only)
export function checkResourceAccess(
  user: NonNullable<AuthenticatedRequest['user']>,
  resource: ResourceContext,
  requiredScope: 'own' | 'team' | 'department' | 'businessUnit' | 'all'
): boolean {
  // Tenant isolation
  if (resource.tenantId !== user.tenantId) {
    auditLogger('CROSS_TENANT_ACCESS_BLOCKED', user.id, user.tenantId, 'security', resource.tenantId ?? 'unknown', {
      attemptedTenantId: resource.tenantId,
      userTenantId: user.tenantId,
      requiredScope,
    });
    return false;
  }

  // Super admin bypass - check all possible admin role names
  if ((ADMIN_ROLES as readonly string[]).some(alias => user.roles.includes(alias))) {
    return true;
  }

  switch (requiredScope) {
    case 'own':
      return resource.ownerId === user.id;
    case 'team':
      // For sync version, just check own - use async version for full team check
      return resource.ownerId === user.id;
    case 'department':
      // For sync version, check same department
      return resource.departmentId === user.departmentId || resource.ownerId === user.id;
    case 'businessUnit':
      // For sync version, check same business unit
      return resource.businessUnitId === user.businessUnitId || resource.ownerId === user.id;
    case 'all':
      return true;
    default:
      return false;
  }
}

// Check if user has delegation authority from another user
export async function hasDelegationFrom(
  delegateId: string,
  delegatorId: string,
  tenantId: string,
  delegationType?: string
): Promise<boolean> {
  const now = new Date();
  const delegation = await prisma.delegation.findFirst({
    where: {
      delegateId,
      delegatorId,
      tenantId,
      status: 'ACTIVE',
      startDate: { lte: now },
      OR: [
        { endDate: null },
        { endDate: { gt: now } }
      ],
      ...(delegationType && { type: delegationType as any })
    }
  });
  return delegation !== null;
}

// Check policy-based access
export async function checkPolicyAccess(
  user: NonNullable<AuthenticatedRequest['user']>,
  action: string,
  resourceType: string,
  resourceContext?: Record<string, any>
): Promise<{ allowed: boolean; reason?: string }> {
  const now = new Date();

  // Get applicable policies, ordered by priority (highest first)
  const policies = await prisma.accessPolicy.findMany({
    where: {
      tenantId: user.tenantId,
      status: 'ACTIVE',
      OR: [
        { effectiveFrom: null },
        { effectiveFrom: { lte: now } }
      ],
      AND: [
        {
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gt: now } }
          ]
        }
      ],
      deletedAt: null
    },
    orderBy: { priority: 'desc' }
  });

  // Check each policy
  for (const policy of policies) {
    // Check if policy applies to this user's roles
    if (policy.targetRoles.length > 0) {
      const matchesRole = policy.targetRoles.some(role => user.roles.includes(role));
      if (!matchesRole) continue;
    }

    // Check if policy applies to user's department
    if (policy.targetDepartments.length > 0 && user.departmentId) {
      if (!policy.targetDepartments.includes(user.departmentId)) continue;
    }

    // Check if policy applies to user's level
    if (policy.targetLevels.length > 0) {
      const userLevel = (user as any).level || 1;
      if (!policy.targetLevels.includes(userLevel)) continue;
    }

    // Check union/contract restrictions
    if (policy.unionCode || policy.contractType) {
      const userMembership = await prisma.unionMembership.findFirst({
        where: {
          userId: user.id,
          isActive: true,
          unionContract: {
            OR: [
              policy.unionCode ? { code: policy.unionCode } : {},
              policy.contractType ? { code: policy.contractType } : {}
            ]
          }
        }
      });
      if (!userMembership && (policy.unionCode || policy.contractType)) continue;
    }

    // Check if action matches
    const policyActions = policy.actions as { resources?: string[]; actions?: string[] };
    if (policyActions.resources && !policyActions.resources.includes(resourceType)) continue;
    if (policyActions.actions && !policyActions.actions.includes(action)) continue;

    // Policy applies - check effect
    if (policy.effect === 'DENY') {
      return { allowed: false, reason: `Denied by policy: ${policy.name}` };
    }
    if (policy.effect === 'ALLOW') {
      return { allowed: true };
    }
  }

  // Default: allow if no explicit deny
  return { allowed: true };
}

// Middleware to check union contract restrictions
export function checkUnionRestrictions(action: string): RequestHandler {
  return async (req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;

      if (!user) {
        throw new AuthorizationError('User not authenticated');
      }

      // Check if user is under any union contract
      const memberships = await prisma.unionMembership.findMany({
        where: {
          userId: user.id,
          isActive: true,
          OR: [
            { endDate: null },
            { endDate: { gt: new Date() } }
          ]
        },
        include: {
          unionContract: true
        }
      });

      for (const membership of memberships) {
        const contract = membership.unionContract;
        if (!contract.isActive) continue;

        // Check review restrictions
        const reviewRestrictions = contract.reviewRestrictions as Record<string, any>;
        if (action.startsWith('review') && reviewRestrictions.restricted) {
          throw new AuthorizationError(
            `Action restricted by union contract: ${contract.name}`
          );
        }

        // Check feedback restrictions
        const feedbackRules = contract.feedbackRules as Record<string, any>;
        if (action.startsWith('feedback') && feedbackRules.restricted) {
          throw new AuthorizationError(
            `Action restricted by union contract: ${contract.name}`
          );
        }

        // Check calibration restrictions
        const calibrationRules = contract.calibrationRules as Record<string, any>;
        if (action.startsWith('calibration') && calibrationRules.restricted) {
          throw new AuthorizationError(
            `Action restricted by union contract: ${contract.name}`
          );
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Clear membership cache (call after role/team changes)
export function clearMembershipCache(userId?: string, tenantId?: string): void {
  if (userId && tenantId) {
    membershipCache.delete(`${userId}:${tenantId}`);
  } else {
    membershipCache.clear();
  }
}
