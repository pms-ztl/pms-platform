// @ts-nocheck
// TODO: Fix validation schema types
import type { Response, NextFunction } from 'express';
import { z } from 'zod';

import type { AuthenticatedRequest, PaginationQuery } from '../../types';
import { ValidationError } from '../../utils/errors';
import { usersService } from './users.service';

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  password: z.string().min(8).optional(),
  jobTitle: z.string().max(200).optional(),
  employeeNumber: z.string().max(50).optional(),
  departmentId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  level: z.number().int().min(1).max(20).optional(),
  hireDate: z.string().datetime().optional().transform((val) => (val !== undefined ? new Date(val) : undefined)),
  roleIds: z.array(z.string().uuid()).optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  displayName: z.string().max(200).optional(),
  avatarUrl: z.string().url().optional(),
  jobTitle: z.string().max(200).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  level: z.number().int().min(1).max(20).optional(),
  timezone: z.string().max(50).optional(),
  locale: z.string().max(10).optional(),
});

const assignRoleSchema = z.object({
  roleId: z.string().uuid(),
});

export class UsersController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = createUserSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid user data', {
          errors: parseResult.error.format(),
        });
      }

      const user = await usersService.create(
        req.tenantId,
        req.user.id,
        parseResult.data
      );

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.id;

      if (userId === undefined) {
        throw new ValidationError('User ID is required');
      }

      const parseResult = updateUserSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid user data', {
          errors: parseResult.error.format(),
        });
      }

      const user = await usersService.update(
        req.tenantId,
        req.user.id,
        userId,
        parseResult.data
      );

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.id;

      if (userId === undefined) {
        throw new ValidationError('User ID is required');
      }

      const user = await usersService.getById(req.tenantId, userId);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as PaginationQuery & {
        departmentId?: string;
        managerId?: string;
        isActive?: string;
        search?: string;
        roleId?: string;
      };

      const filters = {
        departmentId: query.departmentId,
        managerId: query.managerId,
        isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
        search: query.search,
        roleId: query.roleId,
      };

      const pagination = {
        page: query.page !== undefined ? parseInt(query.page, 10) : 1,
        limit: query.limit !== undefined ? Math.min(parseInt(query.limit, 10), 100) : 20,
        sortBy: query.sortBy ?? 'lastName',
        sortOrder: (query.sortOrder ?? 'asc') as 'asc' | 'desc',
      };

      const result = await usersService.list(req.tenantId, filters, pagination);

      res.status(200).json({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          hasNextPage: result.hasNextPage,
          hasPreviousPage: result.hasPreviousPage,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.id;

      if (userId === undefined) {
        throw new ValidationError('User ID is required');
      }

      await usersService.deactivate(req.tenantId, req.user.id, userId);

      res.status(200).json({
        success: true,
        message: 'User deactivated',
      });
    } catch (error) {
      next(error);
    }
  }

  async reactivate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.id;

      if (userId === undefined) {
        throw new ValidationError('User ID is required');
      }

      await usersService.reactivate(req.tenantId, req.user.id, userId);

      res.status(200).json({
        success: true,
        message: 'User reactivated',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.id;

      if (userId === undefined) {
        throw new ValidationError('User ID is required');
      }

      await usersService.deleteUser(req.tenantId, req.user.id, userId);

      res.status(200).json({
        success: true,
        message: 'User deleted permanently',
      });
    } catch (error) {
      next(error);
    }
  }

  async getDirectReports(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const managerId = req.params.id ?? req.user.id;

      const reports = await usersService.getDirectReports(req.tenantId, managerId);

      res.status(200).json({
        success: true,
        data: reports,
      });
    } catch (error) {
      next(error);
    }
  }

  async getOrgChart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rootUserId = req.query.rootUserId as string | undefined;
      const depth = req.query.depth !== undefined ? parseInt(req.query.depth as string, 10) : 3;

      const orgChart = await usersService.getOrgChart(req.tenantId, rootUserId, depth);

      res.status(200).json({
        success: true,
        data: orgChart,
      });
    } catch (error) {
      next(error);
    }
  }

  async listRoles(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await usersService.listRoles(req.tenantId);

      res.status(200).json({
        success: true,
        data: roles,
      });
    } catch (error) {
      next(error);
    }
  }

  async listDepartments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const departments = await usersService.listDepartments(req.tenantId);

      res.status(200).json({
        success: true,
        data: departments,
      });
    } catch (error) {
      next(error);
    }
  }

  async assignRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.id;

      if (userId === undefined) {
        throw new ValidationError('User ID is required');
      }

      const parseResult = assignRoleSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid role data', {
          errors: parseResult.error.format(),
        });
      }

      await usersService.assignRole(
        req.tenantId,
        req.user.id,
        userId,
        parseResult.data.roleId
      );

      res.status(200).json({
        success: true,
        message: 'Role assigned',
      });
    } catch (error) {
      next(error);
    }
  }

  async removeRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.id;
      const roleId = req.params.roleId;

      if (userId === undefined || roleId === undefined) {
        throw new ValidationError('User ID and Role ID are required');
      }

      await usersService.removeRole(req.tenantId, req.user.id, userId, roleId);

      res.status(200).json({
        success: true,
        message: 'Role removed',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get team members for feedback/collaboration (no permissions required)
   * Returns basic user info for dropdowns
   */
  async getTeamMembers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await usersService.getTeamMembers(req.tenantId, req.user.id);

      res.status(200).json({
        success: true,
        data: users,
        meta: {
          total: users.length,
          page: 1,
          limit: users.length,
          totalPages: 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload avatar for current user or specified user (admin)
   */
  async uploadAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file;
      const userId = req.params.id || req.user.id;

      if (!file) {
        throw new ValidationError('No file uploaded');
      }

      // Construct the avatar URL (relative path served from /uploads)
      const avatarUrl = `/uploads/avatars/${file.filename}`;

      // Update user with new avatar URL
      await usersService.updateAvatar(req.tenantId, userId, avatarUrl);

      res.status(200).json({
        success: true,
        data: { avatarUrl },
        message: 'Avatar uploaded successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update avatar with a pre-defined AI avatar URL
   */
  async setAiAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.id || req.user.id;
      const { avatarUrl } = req.body;

      if (!avatarUrl || typeof avatarUrl !== 'string') {
        throw new ValidationError('Avatar URL is required');
      }

      // Only allow specific AI avatar domains/patterns
      const isValidAiAvatar = avatarUrl.startsWith('/ai-avatars/') ||
        avatarUrl.includes('dicebear.com') ||
        avatarUrl.includes('ui-avatars.com') ||
        avatarUrl.includes('robohash.org');

      if (!isValidAiAvatar) {
        throw new ValidationError('Invalid AI avatar URL');
      }

      await usersService.updateAvatar(req.tenantId, userId, avatarUrl);

      res.status(200).json({
        success: true,
        data: { avatarUrl },
        message: 'AI avatar set successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();
