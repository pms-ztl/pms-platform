// @ts-nocheck
import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../types';
import { ValidationError } from '../../utils/errors';
import { auditService } from './audit.service';

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(25),
  userId: z.string().uuid().optional(),
  entityType: z.string().optional(),
  action: z.string().optional(),
  dateFrom: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  dateTo: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  search: z.string().optional(),
  userSearch: z.string().optional(),
}).transform((data) => ({
  ...data,
  search: data.search || data.userSearch,
}));

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(25),
});

const statsQuerySchema = z.object({
  dateFrom: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  dateTo: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
});

const purgeSchema = z.object({
  retentionDays: z.coerce.number().int().positive().min(1),
});

class AuditController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError('Invalid query parameters', { errors: parsed.error.format() });

      const result = await auditService.list(req.tenantId!, parsed.data);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const event = await auditService.getById(req.tenantId!, req.params.id);
      if (!event) return res.status(404).json({ success: false, message: 'Audit event not found' });
      res.json({ success: true, data: event });
    } catch (error) {
      next(error);
    }
  }

  async getEntityHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { entityType, entityId } = req.params;
      const data = await auditService.getEntityHistory(req.tenantId!, entityType, entityId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getUserActivity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = paginationSchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError('Invalid query parameters', { errors: parsed.error.format() });

      const { userId } = req.params;
      const result = await auditService.getUserActivity(req.tenantId!, userId, parsed.data);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = statsQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError('Invalid query parameters', { errors: parsed.error.format() });

      const data = await auditService.getStats(req.tenantId!, parsed.data);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async purge(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = purgeSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid purge parameters', { errors: parsed.error.format() });

      const result = await auditService.purge(req.tenantId!, parsed.data.retentionDays);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const auditController = new AuditController();
