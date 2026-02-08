// @ts-nocheck
import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../types';
import { ValidationError } from '../../utils/errors';
import { successionService } from './succession.service';

const createPlanSchema = z.object({
  positionId: z.string().uuid().optional(),
  positionTitle: z.string().min(1),
  currentIncumbent: z.string().uuid().optional(),
  criticality: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  retirementRisk: z.boolean().optional(),
  turnoverRisk: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  vacancyImpact: z.enum(['SEVERE', 'SIGNIFICANT', 'MODERATE', 'MINIMAL']),
  timeToFill: z.number().int().optional(),
  successors: z.array(z.any()).optional(),
  emergencyBackup: z.string().uuid().optional(),
  interimOptions: z.array(z.string()).optional(),
  developmentPipeline: z.any().optional(),
  benchStrength: z.number().int().optional(),
  reviewFrequency: z.string().optional(),
  notes: z.string().optional(),
});

const updatePlanSchema = createPlanSchema.partial();

class SuccessionController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = createPlanSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });
      const plan = await successionService.create(req.tenantId!, parsed.data as any);
      res.status(201).json({ success: true, data: plan });
    } catch (error) { next(error); }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        criticality: req.query.criticality as string | undefined,
        status: req.query.status as string | undefined,
      };
      const plans = await successionService.list(req.tenantId!, filters);
      res.json({ success: true, data: plans });
    } catch (error) { next(error); }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const plan = await successionService.getById(req.tenantId!, req.params.id);
      if (!plan) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, data: plan });
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = updatePlanSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });
      const plan = await successionService.update(req.tenantId!, req.params.id, parsed.data as any);
      res.json({ success: true, data: plan });
    } catch (error) { next(error); }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await successionService.delete(req.tenantId!, req.params.id);
      res.json({ success: true, message: 'Deleted' });
    } catch (error) { next(error); }
  }

  async getNineBoxGrid(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await successionService.getNineBoxGrid(req.tenantId!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getSuccessorReadiness(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await successionService.getSuccessorReadiness(req.tenantId!, req.params.id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
}

export const successionController = new SuccessionController();
