// @ts-nocheck
// TODO: Fix validation schema types
import type { Response, NextFunction } from 'express';
import { z } from 'zod';

import { CalibrationStatus } from '@pms/database';

import type { AuthenticatedRequest } from '../../types';
import { ValidationError } from '../../utils/errors';
import { calibrationService } from './calibration.service';

// Validation schemas
const createSessionSchema = z.object({
  cycleId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  scheduledStart: z.string().datetime().transform((val) => new Date(val)),
  scheduledEnd: z.string().datetime().optional().transform((val) => (val !== undefined ? new Date(val) : undefined)),
  departmentScope: z.array(z.string().uuid()).optional(),
  levelScope: z.array(z.number().int().positive()).optional(),
});

const adjustRatingSchema = z.object({
  reviewId: z.string().uuid(),
  adjustedRating: z.number().min(1).max(5),
  rationale: z.string().min(20).max(2000),
  discussionNotes: z.string().max(5000).optional(),
});

const addParticipantSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['participant', 'observer']).optional(),
});

const completeSessionSchema = z.object({
  notes: z.string().max(5000).optional(),
});

export class CalibrationController {
  async createSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = createSessionSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid session data', {
          errors: parseResult.error.format(),
        });
      }

      const session = await calibrationService.createSession(
        req.tenantId,
        req.user.id,
        parseResult.data
      );

      res.status(201).json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.id;

      if (sessionId === undefined) {
        throw new ValidationError('Session ID is required');
      }

      const session = await calibrationService.getSession(req.tenantId, sessionId);

      res.status(200).json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async listSessions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as {
        cycleId?: string;
        status?: string;
        facilitatorId?: string;
      };

      const filters = {
        cycleId: query.cycleId,
        status: query.status !== undefined ? (query.status as CalibrationStatus) : undefined,
        facilitatorId: query.facilitatorId,
      };

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string, 10), 100) : 20;

      const allSessions = await calibrationService.listSessions(req.tenantId, filters);
      const total = allSessions.length;
      const totalPages = Math.ceil(total / limit);
      const paged = allSessions.slice((page - 1) * limit, page * limit);

      res.status(200).json({
        success: true,
        data: paged,
        meta: { total, page, limit, totalPages },
      });
    } catch (error) {
      next(error);
    }
  }

  async startSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.id;

      if (sessionId === undefined) {
        throw new ValidationError('Session ID is required');
      }

      const session = await calibrationService.startSession(
        req.tenantId,
        req.user.id,
        sessionId
      );

      res.status(200).json({
        success: true,
        data: session,
        message: 'Calibration session started',
      });
    } catch (error) {
      next(error);
    }
  }

  async completeSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.id;

      if (sessionId === undefined) {
        throw new ValidationError('Session ID is required');
      }

      const parseResult = completeSessionSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid data', {
          errors: parseResult.error.format(),
        });
      }

      const session = await calibrationService.completeSession(
        req.tenantId,
        req.user.id,
        sessionId,
        parseResult.data.notes
      );

      res.status(200).json({
        success: true,
        data: session,
        message: 'Calibration session completed and ratings applied',
      });
    } catch (error) {
      next(error);
    }
  }

  async addParticipant(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.id;

      if (sessionId === undefined) {
        throw new ValidationError('Session ID is required');
      }

      const parseResult = addParticipantSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid participant data', {
          errors: parseResult.error.format(),
        });
      }

      await calibrationService.addParticipant(
        req.tenantId,
        req.user.id,
        sessionId,
        parseResult.data.userId,
        parseResult.data.role
      );

      res.status(200).json({
        success: true,
        message: 'Participant added to session',
      });
    } catch (error) {
      next(error);
    }
  }

  async getReviewsForCalibration(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.id;

      if (sessionId === undefined) {
        throw new ValidationError('Session ID is required');
      }

      const reviews = await calibrationService.getReviewsForCalibration(
        req.tenantId,
        sessionId
      );

      res.status(200).json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      next(error);
    }
  }

  async adjustRating(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.id;

      if (sessionId === undefined) {
        throw new ValidationError('Session ID is required');
      }

      const parseResult = adjustRatingSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid rating data', {
          errors: parseResult.error.format(),
        });
      }

      const rating = await calibrationService.adjustRating(
        req.tenantId,
        req.user.id,
        sessionId,
        parseResult.data
      );

      res.status(200).json({
        success: true,
        data: rating,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSessionRatings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.id;

      if (sessionId === undefined) {
        throw new ValidationError('Session ID is required');
      }

      const ratings = await calibrationService.getSessionRatings(req.tenantId, sessionId);

      res.status(200).json({
        success: true,
        data: ratings,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const calibrationController = new CalibrationController();
