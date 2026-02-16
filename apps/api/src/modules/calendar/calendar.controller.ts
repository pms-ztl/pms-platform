// TODO: Fix validation schema types
import type { Response, NextFunction } from 'express';
import { z } from 'zod';

import { CalendarEventType } from '@pms/database';

import type { AuthenticatedRequest, PaginationQuery } from '../../types';
import { ValidationError } from '../../utils/errors';
import { calendarService } from './calendar.service';

// Validation schemas
const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(5000).optional().nullable(),
  eventDate: z.string().transform((val) => new Date(val)),
  startTime: z.string().optional().nullable().transform((val) => (val ? new Date(val) : undefined)),
  endTime: z.string().optional().nullable().transform((val) => (val ? new Date(val) : undefined)),
  allDay: z.boolean().optional(),
  type: z.nativeEnum(CalendarEventType),
  color: z.string().max(30).optional().nullable(),
  recurrenceRule: z.string().max(500).optional().nullable(),
  recurrenceEndDate: z.string().optional().nullable().transform((val) => (val ? new Date(val) : undefined)),
  parentEventId: z.string().uuid().optional(),
  reminderMinutes: z.array(z.number().int().min(0).max(10080)).optional(),
  goalId: z.string().uuid().optional().nullable(),
  reviewCycleId: z.string().uuid().optional().nullable(),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional().nullable(),
  eventDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  startTime: z.string().optional().nullable().transform((val) => (val ? new Date(val) : undefined)),
  endTime: z.string().optional().nullable().transform((val) => (val ? new Date(val) : undefined)),
  allDay: z.boolean().optional(),
  type: z.nativeEnum(CalendarEventType).optional(),
  color: z.string().max(30).optional().nullable(),
  recurrenceRule: z.string().max(500).optional().nullable(),
  recurrenceEndDate: z.string().optional().nullable().transform((val) => (val ? new Date(val) : undefined)),
  reminderMinutes: z.array(z.number().int().min(0).max(10080)).optional(),
  goalId: z.string().uuid().optional().nullable(),
  reviewCycleId: z.string().uuid().optional().nullable(),
});

export class CalendarController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = createEventSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid calendar event data', {
          errors: parseResult.error.format(),
        });
      }

      const event = await calendarService.create(
        req.tenantId!,
        req.user!.id,
        parseResult.data as any
      );

      res.status(201).json({
        success: true,
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = req.params.id;

      const parseResult = updateEventSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid calendar event data', {
          errors: parseResult.error.format(),
        });
      }

      const event = await calendarService.update(
        req.tenantId!,
        req.user!.id,
        eventId,
        parseResult.data as any
      );

      res.status(200).json({
        success: true,
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = req.params.id;

      await calendarService.delete(req.tenantId!, req.user!.id, eventId);

      res.status(200).json({
        success: true,
        message: 'Calendar event deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = req.params.id;

      const event = await calendarService.getById(req.tenantId!, req.user!.id, eventId);

      res.status(200).json({
        success: true,
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as PaginationQuery & {
        startDate?: string;
        endDate?: string;
        type?: string;
        goalId?: string;
        reviewCycleId?: string;
      };

      const filters = {
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        type: query.type !== undefined ? (query.type as CalendarEventType) : undefined,
        goalId: query.goalId,
        reviewCycleId: query.reviewCycleId,
      };

      const pagination = {
        page: query.page !== undefined ? parseInt(query.page, 10) : 1,
        limit: query.limit !== undefined ? Math.min(parseInt(query.limit, 10), 200) : 50,
        sortBy: query.sortBy ?? 'eventDate',
        sortOrder: (query.sortOrder ?? 'asc') as 'asc' | 'desc',
      };

      const result = await calendarService.list(
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
}

export const calendarController = new CalendarController();
