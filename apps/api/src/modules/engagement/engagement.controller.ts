import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { engagementService } from './engagement.service';

/**
 * EngagementController
 *
 * Thin HTTP handler that delegates all business logic to EngagementService.
 * Responsible only for extracting request parameters and formatting responses.
 */
export class EngagementController {
  // ---------------------------------------------------------------------------
  // GET /engagement/overview
  // ---------------------------------------------------------------------------

  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;

      const data = await engagementService.getOverview(tenantId);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // GET /engagement/trends?months=3|6|12
  // ---------------------------------------------------------------------------

  private static trendsSchema = z.object({
    months: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return 6;
        const parsed = parseInt(val, 10);
        if (isNaN(parsed) || parsed < 1 || parsed > 24) return 6;
        return parsed;
      }),
  });

  async getTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const { months } = EngagementController.trendsSchema.parse(req.query);

      const data = await engagementService.getTrends(tenantId, months);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // GET /engagement/departments
  // ---------------------------------------------------------------------------

  async getDepartments(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;

      const data = await engagementService.getDepartments(tenantId);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // GET /engagement/at-risk?page=1&limit=20
  // ---------------------------------------------------------------------------

  private static atRiskSchema = z.object({
    page: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return 1;
        const parsed = parseInt(val, 10);
        return isNaN(parsed) || parsed < 1 ? 1 : parsed;
      }),
    limit: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return 20;
        const parsed = parseInt(val, 10);
        return isNaN(parsed) || parsed < 1 || parsed > 100 ? 20 : parsed;
      }),
  });

  async getAtRisk(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const { page, limit } = EngagementController.atRiskSchema.parse(req.query);

      const data = await engagementService.getAtRisk(tenantId, { page, limit });

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // GET /engagement/events?limit=50&category=PARTICIPATION
  // ---------------------------------------------------------------------------

  private static eventsSchema = z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return 50;
        const parsed = parseInt(val, 10);
        return isNaN(parsed) || parsed < 1 || parsed > 200 ? 50 : parsed;
      }),
    category: z.string().optional(),
  });

  async getEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const { limit, category } = EngagementController.eventsSchema.parse(req.query);

      const data = await engagementService.getEvents(tenantId, { limit, category });

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
