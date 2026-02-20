import { prisma } from '../../lib/prisma';
import { auditLogger } from '../../utils/logger';

// Types
export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions: string[];
  category?: 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissions?: string[];
  category?: 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';
}

export interface PermissionDef {
  resource: string;
  actions: string[];
  scopes: string[];
}

const PERMISSIONS_CATALOG: PermissionDef[] = [
  { resource: 'users', actions: ['create', 'read', 'update', 'delete', 'manage'], scopes: ['own', 'team', 'department', 'all'] },
  { resource: 'roles', actions: ['create', 'read', 'update', 'delete', 'manage'], scopes: ['all'] },
  { resource: 'settings', actions: ['read', 'update', 'manage'], scopes: ['all'] },
  { resource: 'integrations', actions: ['create', 'read', 'update', 'delete', 'manage'], scopes: ['all'] },
  { resource: 'goals', actions: ['create', 'read', 'update', 'delete', 'manage'], scopes: ['own', 'team', 'department', 'all'] },
  { resource: 'reviews', actions: ['create', 'read', 'update', 'delete', 'manage'], scopes: ['own', 'team', 'department', 'all'] },
  { resource: 'feedback', actions: ['create', 'read', 'update', 'delete', 'manage'], scopes: ['own', 'team', 'all'] },
  { resource: 'calibration', actions: ['create', 'read', 'update', 'manage'], scopes: ['team', 'department', 'all'] },
  { resource: 'analytics', actions: ['read', 'manage'], scopes: ['own', 'team', 'department', 'all'] },
  { resource: 'notifications', actions: ['read', 'manage'], scopes: ['own', 'all'] },
  { resource: 'compensation', actions: ['read', 'update', 'manage'], scopes: ['own', 'team', 'department', 'all'] },
  { resource: 'evidence', actions: ['create', 'read', 'update', 'delete'], scopes: ['own', 'team', 'all'] },
  { resource: 'promotions', actions: ['create', 'read', 'update', 'manage'], scopes: ['own', 'team', 'department', 'all'] },
  { resource: 'reports', actions: ['read', 'create', 'manage'], scopes: ['own', 'team', 'department', 'all'] },
  { resource: 'one-on-ones', actions: ['create', 'read', 'update', 'delete', 'manage'], scopes: ['own', 'team', 'all'] },
  { resource: 'development', actions: ['create', 'read', 'update', 'manage'], scopes: ['own', 'team', 'all'] },
  { resource: 'pip', actions: ['create', 'read', 'update', 'manage'], scopes: ['team', 'department', 'all'] },
  { resource: 'succession', actions: ['read', 'manage'], scopes: ['department', 'all'] },
  { resource: 'skills', actions: ['create', 'read', 'update', 'manage'], scopes: ['own', 'team', 'all'] },
  { resource: 'compliance', actions: ['read', 'manage'], scopes: ['all'] },
  { resource: 'announcements', actions: ['create', 'read', 'update', 'delete', 'manage'], scopes: ['all'] },
  { resource: 'audit', actions: ['read', 'manage'], scopes: ['all'] },
  { resource: 'career', actions: ['create', 'read', 'update'], scopes: ['own', 'team', 'all'] },
  { resource: 'excel-upload', actions: ['create', 'read', 'manage'], scopes: ['all'] },
];

class RolesService {
  async listRoles(tenantId: string) {
    const roles = await prisma.role.findMany({
      where: { tenantId },
      include: { _count: { select: { userRoles: true } } },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    return roles.map((role) => ({
      id: role.id, name: role.name, description: role.description,
      permissions: role.permissions as string[], isSystem: role.isSystem,
      category: (role as any).category as string | null,
      userCount: role._count.userRoles,
      createdAt: role.createdAt, updatedAt: role.updatedAt,
    }));
  }

  async getRole(tenantId: string, roleId: string) {
    const role = await prisma.role.findFirst({
      where: { id: roleId, tenantId },
      include: {
        _count: { select: { userRoles: true } },
        userRoles: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
          take: 50,
        },
      },
    });
    if (!role) throw new Error('Role not found');
    return {
      id: role.id, name: role.name, description: role.description,
      permissions: role.permissions as string[], isSystem: role.isSystem,
      category: (role as any).category as string | null,
      userCount: role._count.userRoles,
      users: role.userRoles.map((ur) => ur.user),
      createdAt: role.createdAt, updatedAt: role.updatedAt,
    };
  }

  async createRole(tenantId: string, creatorId: string, input: CreateRoleInput) {
    const existing = await prisma.role.findFirst({ where: { tenantId, name: input.name } });
    if (existing) throw new Error(`A role with name "${input.name}" already exists`);

    const role = await prisma.role.create({
      data: {
        name: input.name, description: input.description ?? '',
        permissions: input.permissions, isSystem: false,
        category: input.category ?? null,
        tenant: { connect: { id: tenantId } },
      } as any,
    });

    auditLogger('ROLE_CREATED', creatorId, tenantId, 'role', role.id,
      { roleName: input.name, category: input.category });

    return {
      id: role.id, name: role.name, description: role.description,
      permissions: role.permissions as string[], isSystem: role.isSystem,
      category: (role as any).category as string | null, userCount: 0,
      createdAt: role.createdAt, updatedAt: role.updatedAt,
    };
  }

  async updateRole(tenantId: string, updaterId: string, roleId: string, input: UpdateRoleInput) {
    const role = await prisma.role.findFirst({ where: { id: roleId, tenantId } });
    if (!role) throw new Error('Role not found');

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.permissions !== undefined) updateData.permissions = input.permissions;
    if (input.category !== undefined) updateData.category = input.category;

    if (input.name && input.name !== role.name) {
      const dup = await prisma.role.findFirst({ where: { tenantId, name: input.name, NOT: { id: roleId } } });
      if (dup) throw new Error(`A role with name "${input.name}" already exists`);
    }

    const updated = await prisma.role.update({
      where: { id: roleId }, data: updateData,
      include: { _count: { select: { userRoles: true } } },
    });

    auditLogger('ROLE_UPDATED', updaterId, tenantId, 'role', roleId,
      { changes: input, previousName: role.name });

    return {
      id: updated.id, name: updated.name, description: updated.description,
      permissions: updated.permissions as string[], isSystem: updated.isSystem,
      category: (updated as any).category as string | null,
      userCount: updated._count.userRoles,
      createdAt: updated.createdAt, updatedAt: updated.updatedAt,
    };
  }

  async deleteRole(tenantId: string, deleterId: string, roleId: string, fallbackRoleId?: string) {
    const role = await prisma.role.findFirst({
      where: { id: roleId, tenantId },
      include: { _count: { select: { userRoles: true } } },
    });
    if (!role) throw new Error('Role not found');
    if (role.isSystem) throw new Error('System roles cannot be deleted');

    if (role._count.userRoles > 0) {
      if (!fallbackRoleId) {
        throw new Error(`Cannot delete role with ${role._count.userRoles} assigned user(s). Provide a fallbackRoleId to reassign them.`);
      }
      const fallback = await prisma.role.findFirst({ where: { id: fallbackRoleId, tenantId } });
      if (!fallback) throw new Error('Fallback role not found in this tenant');
      await prisma.userRole.updateMany({ where: { roleId }, data: { roleId: fallbackRoleId } });
    }

    await prisma.role.delete({ where: { id: roleId } });
    auditLogger('ROLE_DELETED', deleterId, tenantId, 'role', roleId,
      { roleName: role.name, usersReassigned: role._count.userRoles, fallbackRoleId });
  }

  /**
   * Clone an existing role with all its permissions.
   * The new role gets a "Copy of {name}" name, auto-deduplicated.
   */
  async cloneRole(tenantId: string, clonerId: string, sourceRoleId: string) {
    const source = await prisma.role.findFirst({
      where: { id: sourceRoleId, tenantId },
    });
    if (!source) throw new Error('Source role not found');

    // Generate unique name
    const baseName = `Copy of ${source.name}`;
    let name = baseName;
    let counter = 2;
    while (await prisma.role.findFirst({ where: { tenantId, name } })) {
      name = `${baseName} (${counter++})`;
    }

    const cloned = await prisma.role.create({
      data: {
        name,
        description: source.description ?? '',
        permissions: source.permissions as string[],
        isSystem: false,
        category: (source as any).category ?? null,
        tenant: { connect: { id: tenantId } },
      } as any,
    });

    auditLogger('ROLE_CLONED', clonerId, tenantId, 'role', cloned.id, {
      sourceRoleId,
      sourceRoleName: source.name,
      clonedRoleName: name,
    });

    return {
      id: cloned.id, name: cloned.name, description: cloned.description,
      permissions: cloned.permissions as string[], isSystem: cloned.isSystem,
      category: (cloned as any).category as string | null, userCount: 0,
      createdAt: cloned.createdAt, updatedAt: cloned.updatedAt,
    };
  }

  /**
   * Compare two roles and return a permission diff.
   */
  async compareRoles(tenantId: string, roleId1: string, roleId2: string) {
    const [role1, role2] = await Promise.all([
      prisma.role.findFirst({ where: { id: roleId1, tenantId } }),
      prisma.role.findFirst({ where: { id: roleId2, tenantId } }),
    ]);
    if (!role1) throw new Error('First role not found');
    if (!role2) throw new Error('Second role not found');

    const perms1 = new Set(role1.permissions as string[]);
    const perms2 = new Set(role2.permissions as string[]);

    const shared: string[] = [];
    const onlyInRole1: string[] = [];
    const onlyInRole2: string[] = [];

    for (const p of perms1) {
      if (perms2.has(p)) shared.push(p);
      else onlyInRole1.push(p);
    }
    for (const p of perms2) {
      if (!perms1.has(p)) onlyInRole2.push(p);
    }

    return {
      role1: { id: role1.id, name: role1.name },
      role2: { id: role2.id, name: role2.name },
      shared: shared.sort(),
      onlyInRole1: onlyInRole1.sort(),
      onlyInRole2: onlyInRole2.sort(),
    };
  }

  getPermissionsCatalog(): PermissionDef[] {
    return PERMISSIONS_CATALOG;
  }
}

export const rolesService = new RolesService();
