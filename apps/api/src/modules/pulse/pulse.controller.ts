import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../types';
import { ValidationError } from '../../utils/errors';
import { pulseService } from './pulse.service';

// ── Validation Schemas ──

const submitSchema = z.object({
  moodScore: z.number().int().min(1).max(5),
  energyScore: z.number().int().min(1).max(5).optional(),
  stressScore: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
  isAnonymous: z.boolean().optional(),
});

// ── Controller ──

class PulseController {
  async submit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = submitSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid pulse data', { errors: parsed.error.format() });
      }

      const response = await pulseService.submit(
        req.tenantId!,
        req.user!.id,
        parsed.data as { moodScore: number; energyScore?: number; stressScore?: number; comment?: string; isAnonymous?: boolean },
      );

      res.status(201).json({ success: true, data: response });
    } catch (error) {
      next(error);
    }
  }

  async canSubmit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await pulseService.canSubmit(req.tenantId!, req.user!.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMyHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 30;
      const history = await pulseService.getMyHistory(req.tenantId!, req.user!.id, limit);
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }

  async getAnalyticsOverview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const overview = await pulseService.getAnalyticsOverview(req.tenantId!, days);
      res.json({ success: true, data: overview });
    } catch (error) {
      next(error);
    }
  }

  async getAnalyticsTrends(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const trends = await pulseService.getAnalyticsTrends(req.tenantId!, days);
      res.json({ success: true, data: trends });
    } catch (error) {
      next(error);
    }
  }

  async getAnalyticsDepartments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const departments = await pulseService.getAnalyticsDepartments(req.tenantId!);
      res.json({ success: true, data: departments });
    } catch (error) {
      next(error);
    }
  }

  async getAnalyticsDistribution(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const distribution = await pulseService.getAnalyticsDistribution(req.tenantId!, days);
      res.json({ success: true, data: distribution });
    } catch (error) {
      next(error);
    }
  }
}

export const pulseController = new PulseController();
