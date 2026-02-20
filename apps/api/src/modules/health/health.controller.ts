import { type Response, type NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../types';
import { ValidationError } from '../../utils/errors';
import { healthService } from './health.service';

const historyQuerySchema = z.object({
  period: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(12),
});

class HealthController {
  async getLatest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const data = await healthService.getLatest(tenantId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const parsed = historyQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Invalid query parameters', { errors: parsed.error.format() });
      }
      const { period, limit } = parsed.data;
      const result = await healthService.getHistory(tenantId, { period, limit });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getDepartments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const result = await healthService.getDepartments(tenantId);
      // Return departments array directly so frontend api.get<DepartmentHealth[]> works
      res.json({ success: true, data: result.departments });
    } catch (error) {
      next(error);
    }
  }
}

export const healthController = new HealthController();
