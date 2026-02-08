import { type Response, type NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../types';
import { ValidationError } from '../../utils/errors';
import { oneOnOnesService } from './one-on-ones.service';

const createSchema = z.object({
  employeeId: z.string().uuid(),
  scheduledAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
  duration: z.number().int().min(5).max(480).optional(),
  location: z.string().max(500).optional(),
  meetingLink: z.string().url().optional().or(z.literal('')),
  agenda: z.array(z.object({ topic: z.string().min(1), notes: z.string().optional() })).optional(),
});

const updateSchema = z.object({
  managerNotes: z.string().max(10000).optional(),
  employeeNotes: z.string().max(10000).optional(),
  sharedNotes: z.string().max(10000).optional(),
  actionItems: z.array(z.object({
    title: z.string().min(1),
    done: z.boolean(),
    assignee: z.string().optional(),
  })).optional(),
  agenda: z.array(z.object({ topic: z.string().min(1), notes: z.string().optional() })).optional(),
  location: z.string().max(500).optional(),
  meetingLink: z.string().url().optional().or(z.literal('')),
  scheduledAt: z.string().optional(),
  duration: z.number().int().min(5).max(480).optional(),
});

const completeSchema = z.object({
  sharedNotes: z.string().max(10000).optional(),
  actionItems: z.array(z.object({
    title: z.string().min(1),
    done: z.boolean(),
    assignee: z.string().optional(),
  })).optional(),
}).optional();

class OneOnOnesController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid input', { errors: parsed.error.format() });
      }
      const meeting = await oneOnOnesService.create(req.tenantId, req.user.id, parsed.data as any);
      res.status(201).json({ success: true, data: meeting });
    } catch (error) { next(error); }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await oneOnOnesService.list(req.tenantId, req.user.id, { status, page, limit });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async getUpcoming(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await oneOnOnesService.getUpcoming(req.tenantId, req.user.id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const meeting = await oneOnOnesService.getById(req.tenantId, req.params.id, req.user.id);
      res.json({ success: true, data: meeting });
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid input', { errors: parsed.error.format() });
      }
      const meeting = await oneOnOnesService.update(req.tenantId, req.params.id, req.user.id, parsed.data as any);
      res.json({ success: true, data: meeting });
    } catch (error) { next(error); }
  }

  async start(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const meeting = await oneOnOnesService.start(req.tenantId, req.params.id, req.user.id);
      res.json({ success: true, data: meeting });
    } catch (error) { next(error); }
  }

  async complete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = completeSchema.safeParse(req.body);
      const meeting = await oneOnOnesService.complete(
        req.tenantId, req.params.id, req.user.id,
        parsed.success ? parsed.data : undefined
      );
      res.json({ success: true, data: meeting });
    } catch (error) { next(error); }
  }

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const meeting = await oneOnOnesService.cancel(req.tenantId, req.params.id, req.user.id);
      res.json({ success: true, data: meeting });
    } catch (error) { next(error); }
  }
}

export const oneOnOnesController = new OneOnOnesController();
