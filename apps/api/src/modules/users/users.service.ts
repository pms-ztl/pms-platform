import { prisma, type User } from '@pms/database';
import bcrypt from 'bcryptjs';
import type { PaginatedResult, PaginationParams } from '@pms/database';

import { auditLogger } from '../../utils/logger';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';

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

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    auditLogger('USER_REACTIVATED', adminId, tenantId, 'user', userId);
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
}

export const usersService = new UsersService();
