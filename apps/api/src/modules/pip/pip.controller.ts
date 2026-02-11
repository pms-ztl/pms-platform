import { type Response, type NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../types';
import { ValidationError } from '../../utils/errors';
import { pipService } from './pip.service';

const createPIPSchema = z.object({
  userId: z.string().uuid(),
  pipTitle: z.string().min(1).max(300),
  pipType: z.enum(['PERFORMANCE', 'BEHAVIOR', 'ATTENDANCE', 'SKILLS']),
  severity: z.enum(['STANDARD', 'SERIOUS', 'FINAL_WARNING']),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reviewFrequency: z.enum(['WEEKLY', 'BI_WEEKLY', 'MONTHLY']),
  performanceIssues: z.array(z.object({ issue: z.string(), details: z.string().optional() })).min(1),
  impactStatement: z.string().max(5000).optional().default(''),
  performanceExpectations: z.string().max(5000).optional().default(''),
  specificGoals: z.array(z.object({ goal: z.string(), metric: z.string().optional() })).min(1),
  measurableObjectives: z.array(z.object({ objective: z.string(), target: z.string().optional() })).optional().default([]),
  successCriteria: z.array(z.object({ criterion: z.string() })).min(1),
  supportProvided: z.array(z.object({ support: z.string() })).optional().default([]),
  trainingRequired: z.array(z.string()).optional(),
  consequencesOfNonCompliance: z.string().max(5000).optional().default(''),
});

const addCheckInSchema = z.object({
  checkInDate: z.string().min(1),
  checkInType: z.enum(['SCHEDULED', 'AD_HOC', 'MILESTONE']),
  progressSummary: z.string().min(5).max(5000),
  performanceRating: z.number().int().min(1).max(5).optional(),
  onTrack: z.boolean(),
  positiveObservations: z.array(z.string()).optional(),
  concernsRaised: z.array(z.string()).optional(),
  managerFeedback: z.string().min(5).max(5000),
  employeeFeedback: z.string().max(5000).optional(),
  actionItems: z.array(z.object({ item: z.string(), assignee: z.string().optional(), dueDate: z.string().optional() })).optional(),
  nextSteps: z.array(z.string()).optional(),
});

const addMilestoneSchema = z.object({
  milestoneName: z.string().min(3).max(200),
  description: z.string().min(5).max(5000),
  dueDate: z.string().min(1),
  successCriteria: z.array(z.object({ criterion: z.string() })).min(1),
});

const updateMilestoneSchema = z.object({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED']).optional(),
  achievementLevel: z.enum(['EXCEEDED', 'MET', 'PARTIALLY_MET', 'NOT_MET']).optional(),
  evaluationNotes: z.string().max(5000).optional(),
});

const closePIPSchema = z.object({
  outcome: z.enum(['SUCCESSFUL', 'UNSUCCESSFUL', 'EXTENDED', 'TERMINATED']),
  notes: z.string().max(5000).optional(),
});

class PIPController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createPIPSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid input', { errors: parsed.error.format() });
      const pip = await pipService.createPIP(req.tenantId, req.user.id, parsed.data as any);
      res.status(201).json({ success: true, data: pip });
    } catch (error) { next(error); }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await pipService.listPIPs(req.tenantId, req.user.id, { status, page, limit });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const pip = await pipService.getPIPById(req.tenantId, req.params.id);
      res.json({ success: true, data: pip });
    } catch (error) { next(error); }
  }

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const pip = await pipService.approvePIP(req.tenantId, req.params.id, req.user.id);
      res.json({ success: true, data: pip });
    } catch (error) { next(error); }
  }

  async addCheckIn(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = addCheckInSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid input', { errors: parsed.error.format() });
      const checkIn = await pipService.addCheckIn(req.tenantId, req.params.id, req.user.id, parsed.data as any);
      res.status(201).json({ success: true, data: checkIn });
    } catch (error) { next(error); }
  }

  async addMilestone(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = addMilestoneSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid input', { errors: parsed.error.format() });
      const milestone = await pipService.addMilestone(req.tenantId, req.params.id, req.user.id, parsed.data as any);
      res.status(201).json({ success: true, data: milestone });
    } catch (error) { next(error); }
  }

  async updateMilestone(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateMilestoneSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid input', { errors: parsed.error.format() });
      const milestone = await pipService.updateMilestone(req.tenantId, req.params.id, req.user.id, parsed.data);
      res.json({ success: true, data: milestone });
    } catch (error) { next(error); }
  }

  async close(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = closePIPSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid input', { errors: parsed.error.format() });
      const pip = await pipService.closePIP(req.tenantId, req.params.id, req.user.id, parsed.data.outcome, parsed.data.notes);
      res.json({ success: true, data: pip });
    } catch (error) { next(error); }
  }

  async acknowledge(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const comments = req.body.comments as string | undefined;
      const pip = await pipService.acknowledgeByEmployee(req.tenantId, req.params.id, req.user.id, comments);
      res.json({ success: true, data: pip });
    } catch (error) { next(error); }
  }
}

export const pipController = new PIPController();
