// TODO: Fix validation schema types
import type { Response, NextFunction } from 'express';
import { z } from 'zod';

import type { AuthenticatedRequest, PaginationQuery } from '../../types';
import { ValidationError } from '../../utils/errors';
import { usersService } from './users.service';
import { processAvatarUpload } from '../../middleware/upload';

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
        req.tenantId!,
        req.user!.id,
        parseResult.data as { email: string; firstName: string; lastName: string; password?: string; jobTitle?: string; employeeNumber?: string; departmentId?: string; managerId?: string; level?: number; hireDate?: Date; roleIds?: string[] }
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
        req.tenantId!,
        req.user!.id,
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

      const user = await usersService.getById(req.tenantId!, userId);

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

      const result = await usersService.list(req.tenantId!, filters, pagination);

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

      await usersService.deactivate(req.tenantId!, req.user!.id, userId);

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

      await usersService.reactivate(req.tenantId!, req.user!.id, userId);

      res.status(200).json({
        success: true,
        message: 'User reactivated',
      });
    } catch (error) {
      next(error);
    }
  }

  async archive(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.id;
      if (!userId) throw new ValidationError('User ID is required');

      const { reason } = req.body;
      await usersService.archive(req.tenantId!, req.user!.id, userId, reason);

      res.status(200).json({
        success: true,
        message: 'User archived. License seat freed.',
      });
    } catch (error) {
      next(error);
    }
  }

  async getLicenseUsage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { licenseService } = await import('../super-admin/license.service');
      const usage = await licenseService.getLicenseUsage(req.tenantId!);
      res.json({ success: true, data: usage });
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

      await usersService.deleteUser(req.tenantId!, req.user!.id, userId);

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
      const managerId = req.params.id ?? req.user!.id;

      const reports = await usersService.getDirectReports(req.tenantId!, managerId);

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

      const orgChart = await usersService.getOrgChart(req.tenantId!, rootUserId, depth);

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
      const roles = await usersService.listRoles(req.tenantId!);

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
      const departments = await usersService.listDepartments(req.tenantId!);

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
        req.tenantId!,
        req.user!.id,
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

      await usersService.removeRole(req.tenantId!, req.user!.id, userId, roleId);

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
      const users = await usersService.getTeamMembers(req.tenantId!, req.user!.id);

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
   * Generates optimized thumbnails (sm/md/lg/original) using sharp
   */
  async uploadAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file;
      const userId = req.params.id || req.user!.id;

      if (!file || !file.buffer) {
        throw new ValidationError('No file uploaded');
      }

      // Process the upload: generates sm (64px), md (160px), lg (320px), original (800px) webp variants
      const { baseFilename, files } = await processAvatarUpload(file.buffer, file.originalname);

      // Store the base path — frontend appends size suffix as needed
      // Default URL points to the md (160px) variant for general use
      const avatarUrl = `/uploads/avatars/${baseFilename}.webp`;

      // Update user with new avatar URL (stores the original/base path)
      await usersService.updateAvatar(req.tenantId!, userId, avatarUrl);

      res.status(200).json({
        success: true,
        data: {
          avatarUrl,
          variants: {
            sm: `/uploads/avatars/${files.sm}`,
            md: `/uploads/avatars/${files.md}`,
            lg: `/uploads/avatars/${files.lg}`,
            original: `/uploads/avatars/${files.original}`,
          },
        },
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
      const userId = req.params.id || req.user!.id;
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

      await usersService.updateAvatar(req.tenantId!, userId, avatarUrl);

      res.status(200).json({
        success: true,
        data: { avatarUrl },
        message: 'AI avatar set successfully',
      });
    } catch (error) {
      next(error);
    }
  }
  async getSubscriptionInfo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const info = await usersService.getSubscriptionInfo(req.tenantId!);
      res.json({ success: true, data: info });
    } catch (error) {
      next(error);
    }
  }

  async assignDesignatedManager(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { managerUserId } = req.body;
      if (!managerUserId) {
        throw new ValidationError('managerUserId is required');
      }

      const result = await usersService.assignDesignatedManager(
        req.tenantId!,
        req.user!.id,
        managerUserId
      );

      res.json({
        success: true,
        data: result,
        message: `${result.managerName} has been assigned as the designated manager for Excel uploads`,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeBreakdown(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const breakdown = await usersService.getEmployeeBreakdown(req.tenantId!);
      res.json({ success: true, data: breakdown });
    } catch (error) {
      next(error);
    }
  }

  async toggleSuperAdminAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { canView } = req.body;
      if (typeof canView !== 'boolean') {
        throw new ValidationError('canView must be a boolean');
      }

      const result = await usersService.toggleSuperAdminAccess(req.tenantId!, req.user!.id, canView);
      res.json({
        success: true,
        data: result,
        message: canView
          ? 'Platform admin access to employee details has been enabled'
          : 'Platform admin access to employee details has been disabled',
      });
    } catch (error) {
      next(error);
    }
  }
  async resendCredentials(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.resendCredentials(req.tenantId!, req.user!.id, req.params.id);
      res.json({
        success: true,
        data: result,
        message: `Password setup email sent to ${result.email}`,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── AI Access Management ──

  async toggleAiAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        throw new ValidationError('enabled must be a boolean');
      }

      const result = await usersService.toggleAiAccess(
        req.tenantId!,
        req.user!.id,
        req.params.id,
        enabled,
      );

      res.json({
        success: true,
        data: result,
        message: enabled ? 'AI access enabled for user' : 'AI access disabled for user',
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkToggleAiAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userIds, enabled } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new ValidationError('userIds must be a non-empty array');
      }
      if (typeof enabled !== 'boolean') {
        throw new ValidationError('enabled must be a boolean');
      }

      const result = await usersService.bulkToggleAiAccess(
        req.tenantId!,
        req.user!.id,
        userIds,
        enabled,
      );

      res.json({
        success: true,
        data: result,
        message: `AI access ${enabled ? 'enabled' : 'disabled'} for ${result.updated} users`,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAiAccessStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await usersService.getAiAccessStats(req.tenantId!);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async updateAiDelegation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { delegateToManagers } = req.body;
      if (typeof delegateToManagers !== 'boolean') {
        throw new ValidationError('delegateToManagers must be a boolean');
      }

      const result = await usersService.updateAiDelegation(
        req.tenantId!,
        req.user!.id,
        delegateToManagers,
      );

      res.json({
        success: true,
        data: result,
        message: delegateToManagers
          ? 'Managers can now grant AI access to their reports'
          : 'Only admins can grant AI access',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();
