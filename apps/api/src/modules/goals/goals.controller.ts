// @ts-nocheck
// TODO: Fix validation schema types
import type { Response, NextFunction } from 'express';
import { z } from 'zod';

import { GoalStatus, GoalType, GoalPriority } from '@pms/database';

import type { AuthenticatedRequest, PaginationQuery } from '../../types';
import { ValidationError } from '../../utils/errors';
import { goalsService } from './goals.service';

// Validation schemas
const createGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(5000).optional().nullable(),
  type: z.nativeEnum(GoalType),
  priority: z.nativeEnum(GoalPriority).optional(),
  parentGoalId: z.string().uuid().optional(),
  startDate: z.string().optional().nullable().transform((val) => (val ? new Date(val) : undefined)),
  dueDate: z.string().optional().nullable().transform((val) => (val ? new Date(val) : undefined)),
  targetValue: z.number().optional(),
  unit: z.string().optional(),
  weight: z.number().min(0).max(10).optional(),
  isPrivate: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const updateGoalSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional().nullable(),
  priority: z.nativeEnum(GoalPriority).optional(),
  status: z.nativeEnum(GoalStatus).optional(),
  progress: z.number().min(0).max(100).optional(),
  currentValue: z.number().optional(),
  startDate: z.string().optional().nullable().transform((val) => (val ? new Date(val) : undefined)),
  dueDate: z.string().optional().nullable().transform((val) => (val ? new Date(val) : undefined)),
  weight: z.number().min(0).max(10).optional(),
  isPrivate: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const updateProgressSchema = z.object({
  progress: z.number().min(0).max(100),
  currentValue: z.number().optional(),
  note: z.string().max(1000).optional(),
});

const alignGoalsSchema = z.object({
  toGoalId: z.string().uuid(),
  contributionWeight: z.number().min(0).max(1).optional(),
});

const addCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export class GoalsController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = createGoalSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid goal data', {
          errors: parseResult.error.format(),
        });
      }

      const goal = await goalsService.create(
        req.tenantId,
        req.user.id,
        parseResult.data
      );

      res.status(201).json({
        success: true,
        data: goal,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const goalId = req.params.id;

      if (goalId === undefined) {
        throw new ValidationError('Goal ID is required');
      }

      const parseResult = updateGoalSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid goal data', {
          errors: parseResult.error.format(),
        });
      }

      const goal = await goalsService.update(
        req.tenantId,
        req.user.id,
        goalId,
        parseResult.data
      );

      res.status(200).json({
        success: true,
        data: goal,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const goalId = req.params.id;

      if (goalId === undefined) {
        throw new ValidationError('Goal ID is required');
      }

      await goalsService.delete(req.tenantId, req.user.id, goalId);

      res.status(200).json({
        success: true,
        message: 'Goal deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const goalId = req.params.id;

      if (goalId === undefined) {
        throw new ValidationError('Goal ID is required');
      }

      const goal = await goalsService.getById(req.tenantId, goalId, req.user.id);

      res.status(200).json({
        success: true,
        data: goal,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as PaginationQuery & {
        ownerId?: string;
        status?: string;
        type?: string;
        parentGoalId?: string;
        search?: string;
      };

      const filters = {
        ownerId: query.ownerId,
        status: query.status !== undefined ? (query.status as GoalStatus) : undefined,
        type: query.type !== undefined ? (query.type as GoalType) : undefined,
        parentGoalId: query.parentGoalId,
        search: query.search,
      };

      const pagination = {
        page: query.page !== undefined ? parseInt(query.page, 10) : 1,
        limit: query.limit !== undefined ? Math.min(parseInt(query.limit, 10), 100) : 20,
        sortBy: query.sortBy ?? 'createdAt',
        sortOrder: (query.sortOrder ?? 'desc') as 'asc' | 'desc',
      };

      const result = await goalsService.list(
        req.tenantId,
        req.user.id,
        filters,
        pagination
      );

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

  async getMyGoals(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as PaginationQuery & {
        status?: string;
        type?: string;
      };

      const filters = {
        ownerId: req.user.id,
        status: query.status !== undefined ? (query.status as GoalStatus) : undefined,
        type: query.type !== undefined ? (query.type as GoalType) : undefined,
      };

      const pagination = {
        page: query.page !== undefined ? parseInt(query.page, 10) : 1,
        limit: query.limit !== undefined ? Math.min(parseInt(query.limit, 10), 100) : 20,
        sortBy: query.sortBy ?? 'createdAt',
        sortOrder: (query.sortOrder ?? 'desc') as 'asc' | 'desc',
      };

      const result = await goalsService.list(
        req.tenantId,
        req.user.id,
        filters,
        pagination
      );

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

  async getGoalTree(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rootGoalId = req.query.rootGoalId as string | undefined;

      const tree = await goalsService.getGoalTree(req.tenantId, rootGoalId);

      res.status(200).json({
        success: true,
        data: tree,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProgress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const goalId = req.params.id;

      if (goalId === undefined) {
        throw new ValidationError('Goal ID is required');
      }

      const parseResult = updateProgressSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid progress data', {
          errors: parseResult.error.format(),
        });
      }

      const goal = await goalsService.updateProgress(
        req.tenantId,
        req.user.id,
        goalId,
        parseResult.data.progress,
        parseResult.data.currentValue,
        parseResult.data.note
      );

      res.status(200).json({
        success: true,
        data: goal,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProgressHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const goalId = req.params.id;

      if (goalId === undefined) {
        throw new ValidationError('Goal ID is required');
      }

      const history = await goalsService.getProgressHistory(req.tenantId, goalId);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  async alignGoals(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const goalId = req.params.id;

      if (goalId === undefined) {
        throw new ValidationError('Goal ID is required');
      }

      const parseResult = alignGoalsSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid alignment data', {
          errors: parseResult.error.format(),
        });
      }

      await goalsService.alignGoals(
        req.tenantId,
        req.user.id,
        goalId,
        parseResult.data.toGoalId,
        parseResult.data.contributionWeight
      );

      res.status(200).json({
        success: true,
        message: 'Goals aligned successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async removeAlignment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const goalId = req.params.id;
      const toGoalId = req.params.toGoalId;

      if (goalId === undefined || toGoalId === undefined) {
        throw new ValidationError('Goal IDs are required');
      }

      await goalsService.removeAlignment(req.tenantId, req.user.id, goalId, toGoalId);

      res.status(200).json({
        success: true,
        message: 'Alignment removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async addComment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const goalId = req.params.id;

      if (goalId === undefined) {
        throw new ValidationError('Goal ID is required');
      }

      const parseResult = addCommentSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid comment data', {
          errors: parseResult.error.format(),
        });
      }

      await goalsService.addComment(
        req.tenantId,
        req.user.id,
        goalId,
        parseResult.data.content
      );

      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getComments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const goalId = req.params.id;

      if (goalId === undefined) {
        throw new ValidationError('Goal ID is required');
      }

      const comments = await goalsService.getComments(req.tenantId, goalId);

      res.status(200).json({
        success: true,
        data: comments,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const goalsController = new GoalsController();
