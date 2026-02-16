import { prisma, type User } from '@pms/database';
import bcrypt from 'bcryptjs';
import type { PaginatedResult, PaginationParams } from '@pms/database';

import { auditLogger, logger } from '../../utils/logger';
import { MS_PER_HOUR } from '../../utils/constants';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';
import { deleteSession } from '../../utils/redis';
import { licenseService } from '../super-admin/license.service';
import { emailService } from '../../services/email';
import { managerAssignmentTemplate } from '../../services/email/email-templates';

interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  jobTitle?: string;
  employeeNumber?: string;
  departmentId?: string;
  managerId?: string;
  level?: number;
  hireDate?: Date;
  roleIds?: string[];
}

interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  jobTitle?: string;
  departmentId?: string;
  managerId?: string;
  level?: number;
  timezone?: string;
  locale?: string;
}

interface UserWithRelations extends User {
  department?: { id: string; name: string } | null;
  manager?: { id: string; firstName: string; lastName: string } | null;
  directReports?: Array<{ id: string; firstName: string; lastName: string }>;
  userRoles?: Array<{ role: { id: string; name: string } }>;
}

const SALT_ROUNDS = 12;

export class UsersService {
  async create(
    tenantId: string,
    creatorId: string,
    input: CreateUserInput
  ): Promise<User> {
    // License enforcement - check seat availability
    await licenseService.enforceSeatLimit(tenantId);

    // Level enforcement - validate against tenant max level
    if (input.level !== undefined) {
      await licenseService.validateLevelForTenant(tenantId, input.level);
    }

    // Check for duplicate email
    const existingUser = await prisma.user.findFirst({
      where: {
        tenantId,
        email: input.email.toLowerCase(),
        deletedAt: null,
      },
    });

    if (existingUser !== null) {
      throw new ConflictError('A user with this email already exists');
    }

    // Check employee number uniqueness if provided
    if (input.employeeNumber !== undefined) {
      const existingByNumber = await prisma.user.findFirst({
        where: {
          tenantId,
          employeeNumber: input.employeeNumber,
          deletedAt: null,
        },
      });

      if (existingByNumber !== null) {
        throw new ConflictError('A user with this employee number already exists');
      }
    }

    // Validate manager if provided
    if (input.managerId !== undefined) {
      const manager = await prisma.user.findFirst({
        where: {
          id: input.managerId,
          tenantId,
          isActive: true,
          deletedAt: null,
        },
      });

      if (manager === null) {
        throw new NotFoundError('Manager', input.managerId);
      }
    }

    // Validate department if provided
    if (input.departmentId !== undefined) {
      const department = await prisma.department.findFirst({
        where: {
          id: input.departmentId,
          tenantId,
          deletedAt: null,
        },
      });

      if (department === null) {
        throw new NotFoundError('Department', input.departmentId);
      }
    }

    // Hash password if provided
    const passwordHash = input.password !== undefined
      ? await bcrypt.hash(input.password, SALT_ROUNDS)
      : null;

    const user = await prisma.user.create({
      data: {
        tenantId,
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        jobTitle: input.jobTitle,
        employeeNumber: input.employeeNumber,
        departmentId: input.departmentId,
        managerId: input.managerId,
        level: input.level ?? 1,
        hireDate: input.hireDate,
        isActive: true,
        emailVerified: false,
      },
    });

    // Assign roles if provided
    if (input.roleIds !== undefined && input.roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: input.roleIds.map((roleId) => ({
          userId: user.id,
          roleId,
          grantedBy: creatorId,
        })),
      });
    } else {
      // Assign default Employee role
      const employeeRole = await prisma.role.findFirst({
        where: {
          tenantId,
          name: 'Employee',
        },
      });

      if (employeeRole !== null) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: employeeRole.id,
            grantedBy: creatorId,
          },
        });
      }
    }

    auditLogger('USER_CREATED', creatorId, tenantId, 'user', user.id, {
      email: user.email,
    });

    return user;
  }

  async update(
    tenantId: string,
    updaterId: string,
    userId: string,
    input: UpdateUserInput
  ): Promise<User> {
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        deletedAt: null,
      },
    });

    if (existingUser === null) {
      throw new NotFoundError('User', userId);
    }

    // Validate manager if changing
    if (input.managerId !== undefined && input.managerId !== existingUser.managerId) {
      if (input.managerId === userId) {
        throw new ValidationError('User cannot be their own manager');
      }

      const manager = await prisma.user.findFirst({
        where: {
          id: input.managerId,
          tenantId,
          isActive: true,
          deletedAt: null,
        },
      });

      if (manager === null) {
        throw new NotFoundError('Manager', input.managerId);
      }

      // Check for circular reference
      const isCircular = await this.checkCircularManager(userId, input.managerId, tenantId);
      if (isCircular) {
        throw new ValidationError('This would create a circular management hierarchy');
      }
    }

    // Validate level if changing
    if (input.level !== undefined && input.level !== existingUser.level) {
      await licenseService.validateLevelForTenant(tenantId, input.level);
    }

    // Validate department if changing
    if (input.departmentId !== undefined && input.departmentId !== existingUser.departmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: input.departmentId,
          tenantId,
          deletedAt: null,
        },
      });

      if (department === null) {
        throw new NotFoundError('Department', input.departmentId);
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.firstName !== undefined && { firstName: input.firstName }),
        ...(input.lastName !== undefined && { lastName: input.lastName }),
        ...(input.displayName !== undefined && { displayName: input.displayName }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
        ...(input.jobTitle !== undefined && { jobTitle: input.jobTitle }),
        ...(input.departmentId !== undefined && { departmentId: input.departmentId }),
        ...(input.managerId !== undefined && { managerId: input.managerId }),
        ...(input.level !== undefined && { level: input.level }),
        ...(input.timezone !== undefined && { timezone: input.timezone }),
        ...(input.locale !== undefined && { locale: input.locale }),
      },
    });

    auditLogger('USER_UPDATED', updaterId, tenantId, 'user', userId, {
      changes: Object.keys(input),
    });

    return user;
  }

  async deactivate(tenantId: string, adminId: string, userId: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        deletedAt: null,
      },
    });

    if (user === null) {
      throw new NotFoundError('User', userId);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    auditLogger('USER_DEACTIVATED', adminId, tenantId, 'user', userId);
  }

  async reactivate(tenantId: string, adminId: string, userId: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        deletedAt: null,
      },
    });

    if (user === null) {
      throw new NotFoundError('User', userId);
    }

    // License enforcement - check seat availability before reactivating
    await licenseService.enforceSeatLimit(tenantId);

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true, archivedAt: null, archivedReason: null },
    });

    auditLogger('USER_REACTIVATED', adminId, tenantId, 'user', userId);
  }

  /**
   * Archive a user - preserves all performance data but frees up a license seat.
   * Different from delete: data stays intact, user just becomes inactive.
   */
  async archive(tenantId: string, adminId: string, userId: string, reason?: string): Promise<void> {
    if (userId === adminId) {
      throw new ValidationError('You cannot archive your own account');
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        deletedAt: null,
      },
    });

    if (user === null) {
      throw new NotFoundError('User', userId);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        archivedAt: new Date(),
        archivedReason: reason ?? 'Employee left organization',
      },
    });

    // Clear sessions
    try {
      await deleteSession(userId);
    } catch { /* ignore */ }

    auditLogger('USER_ARCHIVED', adminId, tenantId, 'user', userId, {
      reason: reason ?? 'Employee left organization',
    });
  }

  /**
   * Hard delete a user (soft delete with deletedAt timestamp)
   * This removes the user from active listings and anonymizes their data
   */
  async deleteUser(tenantId: string, adminId: string, userId: string): Promise<void> {
    // Cannot delete yourself
    if (userId === adminId) {
      throw new ValidationError('You cannot delete your own account');
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        deletedAt: null,
      },
    });

    if (user === null) {
      throw new NotFoundError('User', userId);
    }

    // Soft delete - set deletedAt timestamp and anonymize sensitive data
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false,
        email: `deleted_${userId}@deleted.local`,
        passwordHash: null,
      },
    });

    // Remove all role assignments
    await prisma.userRole.deleteMany({
      where: { userId },
    });

    auditLogger('USER_DELETED', adminId, tenantId, 'user', userId, {
      deletedEmail: user.email,
    });
  }

  /**
   * Update user's avatar URL
   */
  async updateAvatar(tenantId: string, userId: string, avatarUrl: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        deletedAt: null,
      },
    });

    if (user === null) {
      throw new NotFoundError('User', userId);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    // Invalidate session cache so next /auth/me returns updated avatarUrl
    await deleteSession(userId);

    auditLogger('USER_AVATAR_UPDATED', userId, tenantId, 'user', userId, {
      avatarUrl,
    });
  }

  async getById(tenantId: string, userId: string): Promise<UserWithRelations> {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        deletedAt: null,
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
        directReports: {
          where: { isActive: true, deletedAt: null },
          select: { id: true, firstName: true, lastName: true },
        },
        userRoles: {
          include: {
            role: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (user === null) {
      throw new NotFoundError('User', userId);
    }

    return user;
  }

  async list(
    tenantId: string,
    filters: {
      departmentId?: string;
      managerId?: string;
      isActive?: boolean;
      search?: string;
      roleId?: string;
    },
    pagination: PaginationParams
  ): Promise<PaginatedResult<UserWithRelations>> {
    const { page = 1, limit = 20, sortBy = 'lastName', sortOrder = 'asc' } = pagination;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (filters.departmentId !== undefined) {
      where.departmentId = filters.departmentId;
    }

    if (filters.managerId !== undefined) {
      where.managerId = filters.managerId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.search !== undefined) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { employeeNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.roleId !== undefined) {
      where.userRoles = {
        some: {
          roleId: filters.roleId,
        },
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          department: {
            select: { id: true, name: true },
          },
          manager: {
            select: { id: true, firstName: true, lastName: true },
          },
          userRoles: {
            include: {
              role: {
                select: { id: true, name: true },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    };
  }

  async getDirectReports(tenantId: string, managerId: string): Promise<User[]> {
    const users = await prisma.user.findMany({
      where: {
        tenantId,
        managerId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return users;
  }

  async getOrgChart(
    tenantId: string,
    rootUserId?: string,
    depth: number = 3
  ): Promise<Array<User & { children?: User[] }>> {
    const where: Record<string, unknown> = {
      tenantId,
      isActive: true,
      deletedAt: null,
    };

    if (rootUserId !== undefined) {
      where.id = rootUserId;
    } else {
      where.managerId = null; // Start from top-level managers
    }

    const buildTree = async (userId: string, currentDepth: number): Promise<User & { children?: User[] }> => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          department: {
            select: { id: true, name: true },
          },
        },
      });

      if (user === null) {
        throw new NotFoundError('User', userId);
      }

      if (currentDepth >= depth) {
        return user;
      }

      const reports = await prisma.user.findMany({
        where: {
          tenantId,
          managerId: userId,
          isActive: true,
          deletedAt: null,
        },
      });

      const children = await Promise.all(
        reports.map((r) => buildTree(r.id, currentDepth + 1))
      );

      return {
        ...user,
        children,
      };
    };

    const topLevel = await prisma.user.findMany({
      where,
    });

    const tree = await Promise.all(
      topLevel.map((u) => buildTree(u.id, 0))
    );

    return tree;
  }

  async assignRole(
    tenantId: string,
    adminId: string,
    userId: string,
    roleId: string
  ): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
    });

    if (user === null) {
      throw new NotFoundError('User', userId);
    }

    const role = await prisma.role.findFirst({
      where: { id: roleId, tenantId, deletedAt: null },
    });

    if (role === null) {
      throw new NotFoundError('Role', roleId);
    }

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      create: {
        userId,
        roleId,
        grantedBy: adminId,
      },
      update: {},
    });

    auditLogger('ROLE_ASSIGNED', adminId, tenantId, 'user', userId, {
      roleId,
      roleName: role.name,
    });
  }

  async removeRole(
    tenantId: string,
    adminId: string,
    userId: string,
    roleId: string
  ): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
    });

    if (user === null) {
      throw new NotFoundError('User', userId);
    }

    await prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    auditLogger('ROLE_REMOVED', adminId, tenantId, 'user', userId, {
      roleId,
    });
  }

  private async checkCircularManager(
    userId: string,
    newManagerId: string,
    tenantId: string
  ): Promise<boolean> {
    let currentId: string | null = newManagerId;
    const visited = new Set<string>();

    while (currentId !== null) {
      if (currentId === userId) {
        return true;
      }

      if (visited.has(currentId)) {
        return true;
      }

      visited.add(currentId);

      const user = await prisma.user.findFirst({
        where: { id: currentId, tenantId },
        select: { managerId: true },
      });

      currentId = user?.managerId ?? null;
    }

    return false;
  }

  async listRoles(tenantId: string): Promise<Array<{ id: string; name: string; description: string | null }>> {
    const roles = await prisma.role.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    });

    return roles;
  }

  async listDepartments(tenantId: string): Promise<Array<{ id: string; name: string; code: string | null }>> {
    const departments = await prisma.department.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: { name: 'asc' },
    });

    return departments;
  }

  /**
   * Get team members for feedback/collaboration
   * Returns basic user info without permission checks
   */
  async getTeamMembers(
    tenantId: string,
    currentUserId: string
  ): Promise<Array<{ id: string; firstName: string; lastName: string; email: string; jobTitle: string | null }>> {
    const users = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        NOT: {
          id: currentUserId, // Exclude current user
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
      take: 100, // Limit to 100 users for performance
    });

    return users;
  }

  /**
   * Assign a designated manager for the tenant (who can upload Excel sheets).
   * Only callable by Tenant Admin / HR Admin.
   */
  async assignDesignatedManager(
    tenantId: string,
    adminUserId: string,
    managerUserId: string
  ): Promise<{ managerId: string; managerName: string; managerEmail: string }> {
    // Verify the manager exists in this tenant and is active
    const manager = await prisma.user.findFirst({
      where: {
        id: managerUserId,
        tenantId,
        isActive: true,
        deletedAt: null,
        archivedAt: null,
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!manager) {
      throw new NotFoundError('User not found or not active in this organization');
    }

    // Update the tenant's designated manager
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { designatedManagerId: managerUserId },
    });

    auditLogger('DESIGNATED_MANAGER_ASSIGNED', adminUserId, tenantId, 'tenant', tenantId, {
      designatedManagerId: managerUserId,
      managerEmail: manager.email,
    });

    // Send manager assignment email (non-blocking)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    const admin = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { firstName: true, lastName: true },
    });
    const adminName = admin ? `${admin.firstName} ${admin.lastName}` : 'your admin';
    const companyName = tenant?.name ?? 'your organization';

    emailService.sendMail(
      manager.email,
      `You have been assigned as Designated Manager - ${companyName}`,
      managerAssignmentTemplate(`${manager.firstName} ${manager.lastName}`, companyName, adminName)
    ).catch((err: Error) => {
      logger.warn('Failed to send manager assignment email', { error: err.message });
    });

    return {
      managerId: manager.id,
      managerName: `${manager.firstName} ${manager.lastName}`,
      managerEmail: manager.email,
    };
  }

  /**
   * Get subscription info for the current tenant.
   */
  async getSubscriptionInfo(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        licenseCount: true,
        maxUsers: true,
        maxLevel: true,
        designatedManagerId: true,
        superAdminCanView: true,
        createdAt: true,
      },
    });

    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    const [activeCount, archivedCount] = await Promise.all([
      prisma.user.count({ where: { tenantId, isActive: true, deletedAt: null, archivedAt: null } }),
      prisma.user.count({ where: { tenantId, archivedAt: { not: null }, deletedAt: null } }),
    ]);

    const effectiveLimit = Math.max(tenant.licenseCount, tenant.maxUsers);

    // Get designated manager info if assigned
    let designatedManager = null;
    if (tenant.designatedManagerId) {
      const mgr = await prisma.user.findUnique({
        where: { id: tenant.designatedManagerId },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      if (mgr) {
        designatedManager = {
          id: mgr.id,
          name: `${mgr.firstName} ${mgr.lastName}`,
          email: mgr.email,
        };
      }
    }

    return {
      tenantId: tenant.id,
      companyName: tenant.name,
      plan: tenant.subscriptionPlan,
      status: tenant.subscriptionStatus,
      tier: tenant.subscriptionTier,
      expiresAt: tenant.subscriptionExpiresAt?.toISOString() ?? null,
      license: {
        total: effectiveLimit,
        active: activeCount,
        archived: archivedCount,
        remaining: effectiveLimit - activeCount,
        usagePercent: effectiveLimit > 0 ? Math.round((activeCount / effectiveLimit) * 100) : 0,
      },
      maxLevel: tenant.maxLevel,
      superAdminCanView: tenant.superAdminCanView,
      designatedManager,
      memberSince: tenant.createdAt.toISOString(),
    };
  }

  /**
   * Toggle whether Super Admin (platform owner) can view this tenant's employee details.
   */
  async toggleSuperAdminAccess(tenantId: string, adminUserId: string, canView: boolean): Promise<{ superAdminCanView: boolean }> {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { superAdminCanView: canView },
    });

    auditLogger('SUPER_ADMIN_ACCESS_TOGGLED', adminUserId, tenantId, 'tenant', tenantId, {
      superAdminCanView: canView,
    });

    return { superAdminCanView: canView };
  }

  /**
   * Get employee breakdown by level and department for the license dashboard.
   */
  async getEmployeeBreakdown(tenantId: string) {
    const users = await prisma.user.findMany({
      where: { tenantId, isActive: true, deletedAt: null, archivedAt: null },
      select: { level: true, department: { select: { name: true } } },
    });

    // Group by level
    const levelMap: Record<number, number> = {};
    for (const u of users) {
      levelMap[u.level] = (levelMap[u.level] || 0) + 1;
    }

    // Group by department
    const deptMap: Record<string, number> = {};
    for (const u of users) {
      const deptName = u.department?.name || 'Unassigned';
      deptMap[deptName] = (deptMap[deptName] || 0) + 1;
    }

    return {
      byLevel: Object.entries(levelMap)
        .map(([level, count]) => ({ level: Number(level), count }))
        .sort((a, b) => a.level - b.level),
      byDepartment: Object.entries(deptMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    };
  }
  /**
   * Resend set-password credentials to an employee.
   * Creates a new PasswordSetToken and sends the email.
   */
  async resendCredentials(tenantId: string, adminId: string, userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });

    if (!user) throw new NotFoundError('User', userId);
    if (!user.isActive) throw new ValidationError('Cannot resend credentials to an inactive user');

    // Invalidate any existing tokens
    await prisma.passwordSetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Create a new set-password token
    const crypto = await import('crypto');
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 48 * MS_PER_HOUR); // 48 hours

    await prisma.passwordSetToken.create({
      data: { userId, token, expiresAt },
    });

    // Send the email
    const appUrl = process.env.APP_URL || process.env.CORS_ORIGINS?.split(',')[0] || 'http://localhost:5173';
    const setPasswordUrl = `${appUrl}/set-password?token=${token}`;

    emailService.sendMail(
      user.email,
      'PMS Platform - Set Your Password',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Set Your Password</h2>
          <p>Hello ${user.firstName},</p>
          <p>Your login credentials have been resent. Please set your password using the link below.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${setPasswordUrl}" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Set Your Password
            </a>
          </div>
          <p style="color: #6B7280; font-size: 14px;">This link expires in 48 hours.</p>
          <p style="color: #6B7280; font-size: 14px;">If the button doesn't work, copy this URL: ${setPasswordUrl}</p>
        </div>
      `,
    ).catch((err: Error) => {
      logger.warn('Failed to send credential resend email', { email: user.email, error: err.message });
    });

    auditLogger('CREDENTIALS_RESENT', adminId, tenantId, 'user', userId, { email: user.email });

    return { email: user.email, expiresAt: expiresAt.toISOString() };
  }

  // ============================================================================
  // AI ACCESS MANAGEMENT
  // ============================================================================

  /**
   * Toggle AI access for a single user.
   * Requires tenant to have agenticAI feature enabled.
   */
  async toggleAiAccess(
    tenantId: string,
    adminId: string,
    userId: string,
    enabled: boolean,
  ): Promise<{ userId: string; aiAccessEnabled: boolean }> {
    // Verify tenant has AI feature
    await this.verifyTenantAiFeature(tenantId);

    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true, aiAccessEnabled: true },
    });

    if (!user) throw new NotFoundError('User', userId);

    if (user.aiAccessEnabled === enabled) {
      return { userId: user.id, aiAccessEnabled: enabled };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { aiAccessEnabled: enabled },
    });

    auditLogger('AI_ACCESS_TOGGLED', adminId, tenantId, 'user', userId, {
      enabled,
      userEmail: user.email,
    });

    // Invalidate session cache so the change takes effect immediately
    await deleteSession(userId);

    return { userId: user.id, aiAccessEnabled: enabled };
  }

  /**
   * Bulk toggle AI access for multiple users.
   */
  async bulkToggleAiAccess(
    tenantId: string,
    adminId: string,
    userIds: string[],
    enabled: boolean,
  ): Promise<{ updated: number }> {
    await this.verifyTenantAiFeature(tenantId);

    const result = await prisma.user.updateMany({
      where: {
        id: { in: userIds },
        tenantId,
        deletedAt: null,
      },
      data: { aiAccessEnabled: enabled },
    });

    // Invalidate session cache for all affected users
    await Promise.all(userIds.map((id) => deleteSession(id)));

    auditLogger('AI_ACCESS_BULK_TOGGLED', adminId, tenantId, 'user', adminId, {
      enabled,
      userCount: result.count,
      userIds,
    });

    return { updated: result.count };
  }

  /**
   * Get AI access statistics for the tenant.
   */
  async getAiAccessStats(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true, subscriptionPlan: true },
    });

    if (!tenant) throw new NotFoundError('Tenant not found');

    const settings = (tenant.settings as Record<string, unknown>) ?? {};
    const features = (settings.features as Record<string, unknown>) ?? {};
    const aiSettings = (settings.ai as Record<string, unknown>) ?? {};

    const [totalUsers, aiEnabledCount, aiEnabledUsers] = await Promise.all([
      prisma.user.count({ where: { tenantId, isActive: true, deletedAt: null } }),
      prisma.user.count({ where: { tenantId, isActive: true, deletedAt: null, aiAccessEnabled: true } }),
      prisma.user.findMany({
        where: { tenantId, isActive: true, deletedAt: null, aiAccessEnabled: true },
        select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true },
        orderBy: { firstName: 'asc' },
      }),
    ]);

    return {
      plan: tenant.subscriptionPlan,
      aiFeatureEnabled: !!features.agenticAI,
      delegateToManagers: !!aiSettings.delegateToManagers,
      totalUsers,
      aiEnabledCount,
      aiEnabledUsers,
    };
  }

  /**
   * Update tenant-level AI delegation setting.
   * Controls whether managers can grant AI access to their reports.
   */
  async updateAiDelegation(
    tenantId: string,
    adminId: string,
    delegateToManagers: boolean,
  ): Promise<{ delegateToManagers: boolean }> {
    await this.verifyTenantAiFeature(tenantId);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    if (!tenant) throw new NotFoundError('Tenant not found');

    const currentSettings = (tenant.settings as Record<string, unknown>) ?? {};
    const updatedSettings = {
      ...currentSettings,
      ai: {
        ...((currentSettings.ai as Record<string, unknown>) ?? {}),
        enabled: true,
        delegateToManagers,
      },
    };

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: updatedSettings as any },
    });

    auditLogger('AI_DELEGATION_UPDATED', adminId, tenantId, 'tenant', tenantId, {
      delegateToManagers,
    });

    return { delegateToManagers };
  }

  /**
   * Verify that the tenant has the agenticAI feature enabled.
   */
  private async verifyTenantAiFeature(tenantId: string): Promise<void> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant) throw new NotFoundError('Tenant not found');

    const settings = (tenant.settings as Record<string, unknown>) ?? {};
    const features = (settings.features as Record<string, unknown>) ?? {};

    if (!features.agenticAI) {
      throw new ValidationError(
        'Agentic AI feature is not enabled for this organization. Upgrade to Professional or Enterprise plan.',
      );
    }
  }
}

export const usersService = new UsersService();
