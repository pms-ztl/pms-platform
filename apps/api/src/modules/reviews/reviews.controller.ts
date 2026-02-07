// @ts-nocheck
// TODO: Fix validation schema types
import type { Response, NextFunction } from 'express';
import { z } from 'zod';

import { ReviewCycleStatus, ReviewCycleType, ReviewStatus } from '@pms/database';

import type { AuthenticatedRequest } from '../../types';
import { ValidationError } from '../../utils/errors';
import { reviewsService } from './reviews.service';

// Helper for parsing dates in various formats (ISO, date-only, datetime)
const dateString = z.string().transform((val, ctx) => {
  const date = new Date(val);
  if (isNaN(date.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid date format',
    });
    return z.NEVER;
  }
  return date;
});

const optionalDateString = z.string().optional().transform((val, ctx) => {
  if (val === undefined || val === '') return undefined;
  const date = new Date(val);
  if (isNaN(date.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid date format',
    });
    return z.NEVER;
  }
  return date;
});

// Validation schemas
const createCycleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.nativeEnum(ReviewCycleType),
  startDate: dateString,
  endDate: dateString,
  selfAssessmentStart: optionalDateString,
  selfAssessmentEnd: optionalDateString,
  managerReviewStart: optionalDateString,
  managerReviewEnd: optionalDateString,
  calibrationStart: optionalDateString,
  calibrationEnd: optionalDateString,
  includeGoals: z.boolean().optional(),
  includeFeedback: z.boolean().optional(),
  include360: z.boolean().optional(),
  templateId: z.string().uuid().optional(),
  settings: z.record(z.unknown()).optional(),
});

const updateCycleSchema = createCycleSchema.partial();

const advanceStatusSchema = z.object({
  status: z.nativeEnum(ReviewCycleStatus),
});

const submitReviewSchema = z.object({
  overallRating: z.number().min(1).max(5),
  content: z.record(z.unknown()),
  strengths: z.array(z.string()).optional(),
  areasForGrowth: z.array(z.string()).optional(),
  summary: z.string().max(5000).optional(),
  privateNotes: z.string().max(2000).optional(),
});

const saveDraftSchema = submitReviewSchema.partial();

export class ReviewsController {
  // ==================== Review Cycles ====================

  async createCycle(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = createCycleSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid cycle data', {
          errors: parseResult.error.format(),
        });
      }

      const cycle = await reviewsService.createCycle(
        req.tenantId,
        req.user.id,
        parseResult.data
      );

      res.status(201).json({
        success: true,
        data: cycle,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCycle(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cycleId = req.params.id;

      if (cycleId === undefined) {
        throw new ValidationError('Cycle ID is required');
      }

      const parseResult = updateCycleSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid cycle data', {
          errors: parseResult.error.format(),
        });
      }

      const cycle = await reviewsService.updateCycle(
        req.tenantId,
        req.user.id,
        cycleId,
        parseResult.data
      );

      res.status(200).json({
        success: true,
        data: cycle,
      });
    } catch (error) {
      next(error);
    }
  }

  async launchCycle(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cycleId = req.params.id;

      if (cycleId === undefined) {
        throw new ValidationError('Cycle ID is required');
      }

      const cycle = await reviewsService.launchCycle(req.tenantId, req.user.id, cycleId);

      res.status(200).json({
        success: true,
        data: cycle,
        message: 'Review cycle launched successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async advanceCycleStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cycleId = req.params.id;

      if (cycleId === undefined) {
        throw new ValidationError('Cycle ID is required');
      }

      const parseResult = advanceStatusSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid status', {
          errors: parseResult.error.format(),
        });
      }

      const cycle = await reviewsService.advanceCycleStatus(
        req.tenantId,
        req.user.id,
        cycleId,
        parseResult.data.status
      );

      res.status(200).json({
        success: true,
        data: cycle,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCycle(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cycleId = req.params.id;

      if (cycleId === undefined) {
        throw new ValidationError('Cycle ID is required');
      }

      const cycle = await reviewsService.getCycle(req.tenantId, cycleId);

      res.status(200).json({
        success: true,
        data: cycle,
      });
    } catch (error) {
      next(error);
    }
  }

  async listCycles(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as {
        status?: string;
        type?: string;
      };

      const filters = {
        status: query.status !== undefined ? (query.status as ReviewCycleStatus) : undefined,
        type: query.type !== undefined ? (query.type as ReviewCycleType) : undefined,
      };

      const cycles = await reviewsService.listCycles(req.tenantId, filters);

      res.status(200).json({
        success: true,
        data: cycles,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCycleStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cycleId = req.params.id;

      if (cycleId === undefined) {
        throw new ValidationError('Cycle ID is required');
      }

      const stats = await reviewsService.getCycleStats(req.tenantId, cycleId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Reviews ====================

  async getReview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewId = req.params.id;

      if (reviewId === undefined) {
        throw new ValidationError('Review ID is required');
      }

      const review = await reviewsService.getReview(req.tenantId, req.user.id, reviewId);

      res.status(200).json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }

  async listMyReviews(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as {
        asReviewer?: string;
        asReviewee?: string;
        cycleId?: string;
        status?: string;
      };

      const filters = {
        asReviewer: query.asReviewer === 'true',
        asReviewee: query.asReviewee === 'true',
        cycleId: query.cycleId,
        status: query.status !== undefined ? (query.status as ReviewStatus) : undefined,
      };

      const reviews = await reviewsService.listMyReviews(req.tenantId, req.user.id, filters);

      res.status(200).json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      next(error);
    }
  }

  async startReview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewId = req.params.id;

      if (reviewId === undefined) {
        throw new ValidationError('Review ID is required');
      }

      const review = await reviewsService.startReview(req.tenantId, req.user.id, reviewId);

      res.status(200).json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }

  async saveDraft(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewId = req.params.id;

      if (reviewId === undefined) {
        throw new ValidationError('Review ID is required');
      }

      const parseResult = saveDraftSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid review data', {
          errors: parseResult.error.format(),
        });
      }

      const review = await reviewsService.saveReviewDraft(
        req.tenantId,
        req.user.id,
        reviewId,
        parseResult.data
      );

      res.status(200).json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }

  async submitReview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewId = req.params.id;

      if (reviewId === undefined) {
        throw new ValidationError('Review ID is required');
      }

      const parseResult = submitReviewSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid review data', {
          errors: parseResult.error.format(),
        });
      }

      const review = await reviewsService.submitReview(
        req.tenantId,
        req.user.id,
        reviewId,
        parseResult.data
      );

      res.status(200).json({
        success: true,
        data: review,
        message: 'Review submitted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async acknowledgeReview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewId = req.params.id;

      if (reviewId === undefined) {
        throw new ValidationError('Review ID is required');
      }

      const review = await reviewsService.acknowledgeReview(req.tenantId, req.user.id, reviewId);

      res.status(200).json({
        success: true,
        data: review,
        message: 'Review acknowledged',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reviewsController = new ReviewsController();
