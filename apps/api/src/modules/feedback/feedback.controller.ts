// TODO: Fix validation schema types
import type { Response, NextFunction } from 'express';
import { z } from 'zod';

import { FeedbackType, FeedbackVisibility } from '@pms/database';

import type { AuthenticatedRequest, PaginationQuery } from '../../types';
import { ValidationError } from '../../utils/errors';
import { feedbackService } from './feedback.service';
import { notificationsService } from '../notifications';
import { logger } from '../../utils/logger';

// Validation schemas
const createFeedbackSchema = z.object({
  toUserId: z.string().uuid(),
  type: z.nativeEnum(FeedbackType),
  visibility: z.nativeEnum(FeedbackVisibility),
  content: z.string().min(3, 'Feedback must be at least 3 characters').max(5000),
  isAnonymous: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  valueTags: z.array(z.string()).optional(),
  skillTags: z.array(z.string()).optional(),
});

const requestFeedbackSchema = z.object({
  fromUserId: z.string().uuid(),
  aboutUserId: z.string().uuid().optional(),
  message: z.string().max(500).optional(),
});

export class FeedbackController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = createFeedbackSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid feedback data', {
          errors: parseResult.error.format(),
        });
      }

      const validatedData = parseResult.data as {
        toUserId: string;
        type: FeedbackType;
        visibility: FeedbackVisibility;
        content: string;
        isAnonymous?: boolean;
        tags?: string[];
        valueTags?: string[];
        skillTags?: string[];
      };

      const feedback = await feedbackService.create(
        req.tenantId!,
        req.user!.id,
        validatedData
      );

      // Notify the recipient asynchronously
      try {
        const senderName = `${req.user!.firstName} ${req.user!.lastName}`;
        await notificationsService.notifyFeedbackReceived(
          validatedData.toUserId,
          req.tenantId!,
          validatedData.type,
          validatedData.isAnonymous || false,
          senderName
        );
      } catch (notifErr) {
        logger.warn('Failed to send feedback notification', { error: notifErr });
      }

      res.status(201).json({
        success: true,
        data: feedback,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const feedbackId = req.params.id;

      if (feedbackId === undefined) {
        throw new ValidationError('Feedback ID is required');
      }

      const feedback = await feedbackService.getById(req.tenantId!, req.user!.id, feedbackId);

      res.status(200).json({
        success: true,
        data: feedback,
      });
    } catch (error) {
      next(error);
    }
  }

  async listReceived(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as PaginationQuery & {
        type?: string;
        fromDate?: string;
        toDate?: string;
      };

      const filters = {
        type: query.type !== undefined ? (query.type as FeedbackType) : undefined,
        fromDate: query.fromDate !== undefined ? new Date(query.fromDate) : undefined,
        toDate: query.toDate !== undefined ? new Date(query.toDate) : undefined,
      };

      const pagination = {
        page: query.page !== undefined ? parseInt(query.page, 10) : 1,
        limit: query.limit !== undefined ? Math.min(parseInt(query.limit, 10), 100) : 20,
        sortBy: query.sortBy ?? 'createdAt',
        sortOrder: (query.sortOrder ?? 'desc') as 'asc' | 'desc',
      };

      const result = await feedbackService.listReceived(
        req.tenantId!,
        req.user!.id,
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

  async listGiven(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as PaginationQuery & {
        type?: string;
        fromDate?: string;
        toDate?: string;
      };

      const filters = {
        type: query.type !== undefined ? (query.type as FeedbackType) : undefined,
        fromDate: query.fromDate !== undefined ? new Date(query.fromDate) : undefined,
        toDate: query.toDate !== undefined ? new Date(query.toDate) : undefined,
      };

      const pagination = {
        page: query.page !== undefined ? parseInt(query.page, 10) : 1,
        limit: query.limit !== undefined ? Math.min(parseInt(query.limit, 10), 100) : 20,
        sortBy: query.sortBy ?? 'createdAt',
        sortOrder: (query.sortOrder ?? 'desc') as 'asc' | 'desc',
      };

      const result = await feedbackService.listGiven(
        req.tenantId!,
        req.user!.id,
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

  async listTeamFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as PaginationQuery & {
        teamMemberId?: string;
        type?: string;
        fromDate?: string;
        toDate?: string;
      };

      const filters = {
        teamMemberId: query.teamMemberId,
        type: query.type !== undefined ? (query.type as FeedbackType) : undefined,
        fromDate: query.fromDate !== undefined ? new Date(query.fromDate) : undefined,
        toDate: query.toDate !== undefined ? new Date(query.toDate) : undefined,
      };

      const pagination = {
        page: query.page !== undefined ? parseInt(query.page, 10) : 1,
        limit: query.limit !== undefined ? Math.min(parseInt(query.limit, 10), 100) : 20,
        sortBy: query.sortBy ?? 'createdAt',
        sortOrder: (query.sortOrder ?? 'desc') as 'asc' | 'desc',
      };

      const result = await feedbackService.listTeamFeedback(
        req.tenantId!,
        req.user!.id,
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

  async getTimeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUserId = req.params.userId ?? req.user!.id;
      const query = req.query as {
        fromDate?: string;
        toDate?: string;
      };

      const filters = {
        fromDate: query.fromDate !== undefined ? new Date(query.fromDate) : undefined,
        toDate: query.toDate !== undefined ? new Date(query.toDate) : undefined,
      };

      const timeline = await feedbackService.getUnifiedTimeline(
        req.tenantId!,
        req.user!.id,
        targetUserId,
        filters
      );

      res.status(200).json({
        success: true,
        data: timeline,
      });
    } catch (error) {
      next(error);
    }
  }

  async acknowledge(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const feedbackId = req.params.id;

      if (feedbackId === undefined) {
        throw new ValidationError('Feedback ID is required');
      }

      const feedback = await feedbackService.acknowledge(req.tenantId!, req.user!.id, feedbackId);

      res.status(200).json({
        success: true,
        data: feedback,
      });
    } catch (error) {
      next(error);
    }
  }

  async requestFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = requestFeedbackSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid request data', {
          errors: parseResult.error.format(),
        });
      }

      const requestData = parseResult.data as {
        fromUserId: string;
        aboutUserId?: string;
        message?: string;
      };

      await feedbackService.requestFeedback(req.tenantId!, req.user!.id, requestData);

      // Also send email notification via proper notification service
      try {
        const senderName = `${req.user!.firstName} ${req.user!.lastName}`;
        await notificationsService.send({
          userId: requestData.fromUserId,
          tenantId: req.tenantId!,
          type: 'FEEDBACK_RECEIVED',
          channel: 'email',
          title: 'Feedback Requested',
          body: requestData.message || `${senderName} has requested your feedback.`,
          data: { requestedBy: req.user!.id },
        });
      } catch (notifErr) {
        logger.warn('Failed to send feedback request email notification', { error: notifErr });
      }

      res.status(200).json({
        success: true,
        message: 'Feedback request sent',
      });
    } catch (error) {
      next(error);
    }
  }

  async getRecognitionWall(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const result = await feedbackService.getRecognitionWall(req.tenantId!, page, limit);
      res.json({
        success: true,
        data: result.data,
        meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
      });
    } catch (error) { next(error); }
  }

  async getTopRecognized(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = (req.query.period as string) || 'month';
      const data = await feedbackService.getTopRecognized(req.tenantId!, period as any);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const feedbackId = req.params.id;
      if (!feedbackId) throw new ValidationError('Feedback ID is required');

      const { content, type, tags } = req.body;
      if (!content && !type && !tags) {
        throw new ValidationError('At least one field (content, type, tags) is required');
      }

      const updated = await feedbackService.update(req.tenantId!, req.user!.id, feedbackId, {
        content, type, tags,
      });

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const feedbackId = req.params.id;

      if (feedbackId === undefined) {
        throw new ValidationError('Feedback ID is required');
      }

      await feedbackService.delete(req.tenantId!, req.user!.id, feedbackId);

      res.status(200).json({
        success: true,
        message: 'Feedback deleted',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const feedbackController = new FeedbackController();
