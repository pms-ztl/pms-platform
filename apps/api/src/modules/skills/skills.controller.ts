// @ts-nocheck
import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../types';
import { ValidationError } from '../../utils/errors';
import { skillsService } from './skills.service';

// ─── Validation Schemas ───────────────────────────────────────────────

const createCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  parentCategoryId: z.string().uuid().optional(),
  categoryType: z.enum(['TECHNICAL', 'BEHAVIORAL', 'LEADERSHIP']).optional(),
});

const updateCategorySchema = createCategorySchema.partial();

const createAssessmentSchema = z.object({
  userId: z.string().uuid(),
  skillCategoryId: z.string().uuid(),
  skillName: z.string().min(1),
  currentLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
  targetLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
  selfRating: z.number().min(0).max(5).optional(),
  managerRating: z.number().min(0).max(5).optional(),
  evidenceNotes: z.string().optional(),
  assessmentDate: z.string().datetime().optional(),
  assessmentCycleId: z.string().uuid().optional(),
});

const updateAssessmentSchema = z.object({
  skillName: z.string().min(1).optional(),
  currentLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
  targetLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
  selfRating: z.number().min(0).max(5).optional(),
  managerRating: z.number().min(0).max(5).optional(),
  evidenceNotes: z.string().optional(),
  assessmentDate: z.string().datetime().optional(),
});

const addProgressSchema = z.object({
  previousScore: z.number().min(0).max(5),
  newScore: z.number().min(0).max(5),
  changeReason: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Controller ───────────────────────────────────────────────────────

class SkillsController {
  // ─── Categories ───────────────────────────────────────────────

  async listCategories(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const categories = await skillsService.listCategories(req.tenantId!);
      res.json({ success: true, data: categories });
    } catch (error) { next(error); }
  }

  async createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = createCategorySchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });
      const category = await skillsService.createCategory(req.tenantId!, parsed.data);
      res.status(201).json({ success: true, data: category });
    } catch (error) { next(error); }
  }

  async updateCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = updateCategorySchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });
      const category = await skillsService.updateCategory(req.tenantId!, req.params.id, parsed.data);
      res.json({ success: true, data: category });
    } catch (error) { next(error); }
  }

  async deleteCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await skillsService.deleteCategory(req.tenantId!, req.params.id);
      res.json({ success: true, message: 'Category deleted' });
    } catch (error) { next(error); }
  }

  // ─── Assessments ──────────────────────────────────────────────

  async listAssessments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const params = {
        userId: req.query.userId as string | undefined,
        skillCategoryId: req.query.skillCategoryId as string | undefined,
        status: req.query.status as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };
      const result = await skillsService.listAssessments(req.tenantId!, params);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  async createAssessment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = createAssessmentSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });
      const assessment = await skillsService.createAssessment(req.tenantId!, parsed.data);
      res.status(201).json({ success: true, data: assessment });
    } catch (error) { next(error); }
  }

  async updateAssessment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = updateAssessmentSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });
      const assessment = await skillsService.updateAssessment(req.tenantId!, req.params.id, parsed.data);
      res.json({ success: true, data: assessment });
    } catch (error) { next(error); }
  }

  // ─── Matrix Views ─────────────────────────────────────────────

  async getUserSkillMatrix(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await skillsService.getUserSkillMatrix(req.tenantId!, req.params.userId);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getTeamSkillMatrix(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const managerId = req.user!.id;
      const data = await skillsService.getTeamSkillMatrix(req.tenantId!, managerId);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  // ─── Progress ─────────────────────────────────────────────────

  async addProgressEntry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = addProgressSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });
      const entry = await skillsService.addProgressEntry(req.tenantId!, req.params.id, {
        ...parsed.data,
        assessedBy: req.user!.id,
      });
      res.status(201).json({ success: true, data: entry });
    } catch (error) { next(error); }
  }

  // ─── Analytics ────────────────────────────────────────────────

  async getSkillGaps(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const params = {
        departmentId: req.query.departmentId as string | undefined,
        jobTitle: req.query.jobTitle as string | undefined,
        skillCategoryId: req.query.skillCategoryId as string | undefined,
      };
      const data = await skillsService.getSkillGaps(req.tenantId!, params);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getOrgSkillHeatmap(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await skillsService.getOrgSkillHeatmap(req.tenantId!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
}

export const skillsController = new SkillsController();
