import { type Response, type NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../types';
import { ValidationError } from '../../utils/errors';
import { developmentService } from './development.service';

const createPlanSchema = z.object({
  planName: z.string().min(3).max(200),
  planType: z.enum(['CAREER_GROWTH', 'SKILL_DEVELOPMENT', 'LEADERSHIP', 'PERFORMANCE_IMPROVEMENT']),
  careerGoal: z.string().min(10).max(5000),
  targetRole: z.string().max(200).optional(),
  targetLevel: z.string().max(100).optional(),
  currentLevel: z.string().min(1).max(100),
  duration: z.number().int().min(1).max(60),
  startDate: z.string().min(1),
  targetCompletionDate: z.string().min(1),
  strengthsAssessed: z.array(z.string()).optional(),
  developmentAreas: z.array(z.string()).optional(),
  notes: z.string().max(10000).optional(),
});

const createActivitySchema = z.object({
  activityType: z.enum(['TRAINING', 'COURSE', 'CERTIFICATION', 'MENTORING', 'PROJECT', 'SHADOWING', 'READING']),
  title: z.string().min(3).max(300),
  description: z.string().min(5).max(5000),
  provider: z.string().max(200).optional(),
  learningObjectives: z.array(z.string()).optional(),
  targetSkills: z.array(z.string()).optional(),
  estimatedHours: z.number().min(0).max(10000).optional(),
  dueDate: z.string().optional(),
  startDate: z.string().optional(),
  resourceUrl: z.string().url().optional().or(z.literal('')),
  cost: z.number().min(0).optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  isRequired: z.boolean().optional(),
});

const updateActivitySchema = z.object({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  feedback: z.string().max(5000).optional(),
  completionEvidence: z.string().max(5000).optional(),
  certificateUrl: z.string().url().optional().or(z.literal('')),
  actualHours: z.number().min(0).optional(),
});

const createCheckpointSchema = z.object({
  checkpointName: z.string().min(3).max(200),
  checkpointDate: z.string().min(1),
  checkpointType: z.enum(['MILESTONE', 'REVIEW', 'ASSESSMENT', 'COMPLETION']),
});

const completeCheckpointSchema = z.object({
  progressReview: z.string().max(5000).optional(),
  skillsAcquired: z.array(z.string()).optional(),
  managerFeedback: z.string().max(5000).optional(),
  selfAssessment: z.string().max(5000).optional(),
  nextSteps: z.array(z.string()).optional(),
});

class DevelopmentController {
  async createPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createPlanSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid input', { errors: parsed.error.format() });
      const plan = await developmentService.createPlan(req.tenantId, req.user.id, parsed.data as any);
      res.status(201).json({ success: true, data: plan });
    } catch (error) { next(error); }
  }

  async listPlans(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await developmentService.listPlans(req.tenantId, req.user.id, { status, page, limit });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async getTeamPlans(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await developmentService.getTeamPlans(req.tenantId, req.user.id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getPlanById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await developmentService.getPlanById(req.tenantId, req.params.id);
      res.json({ success: true, data: plan });
    } catch (error) { next(error); }
  }

  async updatePlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createPlanSchema.partial().safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid input', { errors: parsed.error.format() });
      const plan = await developmentService.updatePlan(req.tenantId, req.params.id, req.user.id, parsed.data);
      res.json({ success: true, data: plan });
    } catch (error) { next(error); }
  }

  async deletePlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await developmentService.deletePlan(req.tenantId, req.params.id, req.user.id);
      res.json({ success: true, message: 'Plan deleted successfully' });
    } catch (error) { next(error); }
  }

  async approvePlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await developmentService.approvePlan(req.tenantId, req.params.id, req.user.id);
      res.json({ success: true, data: plan });
    } catch (error) { next(error); }
  }

  async addActivity(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createActivitySchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid input', { errors: parsed.error.format() });
      const activity = await developmentService.addActivity(req.tenantId, req.params.id, req.user.id, parsed.data as any);
      res.status(201).json({ success: true, data: activity });
    } catch (error) { next(error); }
  }

  async updateActivity(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateActivitySchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid input', { errors: parsed.error.format() });
      const activity = await developmentService.updateActivity(req.tenantId, req.params.id, req.user.id, parsed.data);
      res.json({ success: true, data: activity });
    } catch (error) { next(error); }
  }

  async addCheckpoint(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createCheckpointSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid input', { errors: parsed.error.format() });
      const checkpoint = await developmentService.addCheckpoint(req.tenantId, req.params.id, req.user.id, parsed.data as any);
      res.status(201).json({ success: true, data: checkpoint });
    } catch (error) { next(error); }
  }

  async completeCheckpoint(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = completeCheckpointSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid input', { errors: parsed.error.format() });
      const checkpoint = await developmentService.completeCheckpoint(req.tenantId, req.params.id, req.user.id, parsed.data);
      res.json({ success: true, data: checkpoint });
    } catch (error) { next(error); }
  }

  async getRecommendations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUserId = req.params.userId ?? req.user.id;
      const data = await developmentService.getRecommendations(req.tenantId, targetUserId);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
}

export const developmentController = new DevelopmentController();
