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
  userId: z.string().uuid().optional(),
  skillCategoryId: z.string().uuid().optional(),
  skillCategory: z.string().optional(),
  skillName: z.string().min(1),
  currentLevel: z.union([
    z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
    z.number().min(1).max(5),
  ]).optional(),
  targetLevel: z.union([
    z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
    z.number().min(1).max(5),
  ]).optional(),
  selfRating: z.number().min(0).max(5).optional(),
  managerRating: z.number().min(0).max(5).optional(),
  evidenceNotes: z.string().optional(),
  assessmentDate: z.string().optional(),
  assessmentCycleId: z.string().uuid().optional(),
});

const updateAssessmentSchema = z.object({
  skillName: z.string().min(1).optional(),
  skillCategory: z.string().optional(),
  currentLevel: z.union([
    z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
    z.number().min(1).max(5),
  ]).optional(),
  targetLevel: z.union([
    z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
    z.number().min(1).max(5),
  ]).optional(),
  selfRating: z.number().min(0).max(5).optional(),
  managerRating: z.number().min(0).max(5).optional(),
  evidenceNotes: z.string().optional(),
  assessmentDate: z.string().optional(),
});

const addProgressSchema = z.object({
  previousScore: z.number().min(0).max(5),
  newScore: z.number().min(0).max(5),
  changeReason: z.string().optional(),
  notes: z.string().optional(),
});

const requestAssessmentSchema = z.object({
  skillAssessmentId: z.string().uuid(),
});

// ─── Helpers ──────────────────────────────────────────────────────────

const LEVEL_TO_NUMBER: Record<string, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

function levelToNumber(level: string | number | undefined | null): number {
  if (typeof level === 'number') return level;
  if (typeof level === 'string') return LEVEL_TO_NUMBER[level] || 1;
  return 1;
}

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
      const category = await skillsService.createCategory(req.tenantId!, parsed.data as {
        name: string;
        description?: string;
        parentCategoryId?: string;
        categoryType?: string;
      });
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

      const data = parsed.data;

      // Resolve skillCategoryId from skillCategory name if not provided
      let skillCategoryId = data.skillCategoryId;
      if (!skillCategoryId && data.skillCategory) {
        skillCategoryId = await skillsService.findCategoryIdByName(req.tenantId!, data.skillCategory);
      }
      if (!skillCategoryId) throw new ValidationError('Skill category is required');

      // Convert numeric levels to string levels for the service
      const currentLevel = typeof data.currentLevel === 'number'
        ? ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'][Math.min(data.currentLevel - 1, 3)] || 'BEGINNER'
        : data.currentLevel;

      const assessment = await skillsService.createAssessment(req.tenantId!, {
        userId: data.userId || req.user!.id,
        skillCategoryId,
        skillName: data.skillName,
        currentLevel,
        targetLevel: typeof data.targetLevel === 'number' ? String(data.targetLevel) : data.targetLevel,
        selfRating: data.selfRating,
        managerRating: data.managerRating,
        evidenceNotes: data.evidenceNotes,
        assessmentDate: data.assessmentDate,
        assessmentCycleId: data.assessmentCycleId,
      });
      res.status(201).json({ success: true, data: assessment });
    } catch (error) { next(error); }
  }

  async updateAssessment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = updateAssessmentSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });

      const data = parsed.data;
      const currentLevel = typeof data.currentLevel === 'number'
        ? ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'][Math.min(data.currentLevel - 1, 3)] || 'BEGINNER'
        : data.currentLevel;

      const assessment = await skillsService.updateAssessment(req.tenantId!, req.params.id, {
        ...data,
        currentLevel,
        targetLevel: typeof data.targetLevel === 'number' ? String(data.targetLevel) : data.targetLevel,
      });
      res.json({ success: true, data: assessment });
    } catch (error) { next(error); }
  }

  // ─── Matrix Views ─────────────────────────────────────────────

  /**
   * GET /skills/matrix/user/:userId
   * Frontend expects: SkillAssessment[] (flat array)
   * Service returns: { userId, totalSkills, averageScore, categories: [{ category, skills }] }
   * Transform: flatten into SkillAssessment[] shape
   */
  async getUserSkillMatrix(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const raw = await skillsService.getUserSkillMatrix(req.tenantId!, req.params.userId);

      // Flatten categories into a flat SkillAssessment[] array
      const flatSkills = raw.categories.flatMap((cat: any) =>
        cat.skills.map((skill: any) => ({
          id: skill.id,
          skillCategory: cat.category?.name || 'Uncategorized',
          skillName: skill.skillName,
          selfRating: skill.selfAssessment ?? 0,
          managerRating: skill.managerAssessment ?? 0,
          currentLevel: levelToNumber(skill.skillLevel),
          targetLevel: 3, // default target since DB doesn't store it separately
          evidenceNotes: skill.improvementPlan || '',
          assessmentDate: skill.lastAssessedAt || new Date().toISOString(),
          progressHistory: (skill.progressHistory || []).map((p: any) => ({
            date: p.createdAt || p.date || new Date().toISOString(),
            rating: p.newScore ?? p.rating ?? 0,
            assessedBy: p.assessedBy,
          })),
        }))
      );

      res.json({ success: true, data: flatSkills });
    } catch (error) { next(error); }
  }

  /**
   * GET /skills/matrix/team
   * Frontend expects: TeamMemberSkills[] (flat array)
   * Service returns: { managerId, teamSize, members: [{ user, totalSkills, averageScore, categories }] }
   * Transform: flatten into TeamMemberSkills[] shape
   */
  async getTeamSkillMatrix(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const managerId = req.user!.id;
      const raw = await skillsService.getTeamSkillMatrix(req.tenantId!, managerId);

      // Transform members into TeamMemberSkills[] shape
      const teamMembers = raw.members.map((member: any) => {
        // Build categories as Record<string, number> (category name -> average score)
        const categories: Record<string, number> = {};
        for (const cat of member.categories || []) {
          categories[cat.name] = cat.averageScore;
        }

        return {
          userId: member.user.id,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          jobTitle: member.user.jobTitle || '',
          categories,
        };
      });

      res.json({ success: true, data: teamMembers });
    } catch (error) { next(error); }
  }

  // ─── Progress ─────────────────────────────────────────────────

  async addProgressEntry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = addProgressSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });
      const progressData = parsed.data as {
        previousScore: number;
        newScore: number;
        changeReason?: string;
        notes?: string;
      };
      const entry = await skillsService.addProgressEntry(req.tenantId!, req.params.id, {
        ...progressData,
        assessedBy: req.user!.id,
      });
      res.status(201).json({ success: true, data: entry });
    } catch (error) { next(error); }
  }

  // ─── Analytics ────────────────────────────────────────────────

  /**
   * GET /skills/gaps
   * Frontend expects: SkillGap[] (array with skillName, category, avgRating, targetLevel, gap, employeesAffected)
   * Service returns: { totalGaps, gaps: [{ assessmentId, user, skillName, category, currentLevel, finalScore, gapSeverity }], categorySummary }
   * Transform: aggregate by skill to produce SkillGap[] shape
   */
  async getSkillGaps(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const params = {
        departmentId: req.query.departmentId as string | undefined,
        jobTitle: req.query.jobTitle as string | undefined,
        skillCategoryId: req.query.skillCategoryId as string | undefined,
      };
      const raw = await skillsService.getSkillGaps(req.tenantId!, params);

      // Aggregate gaps by skillName+category
      const skillAgg = new Map<string, {
        skillName: string;
        category: string;
        totalRating: number;
        count: number;
        targetLevel: number;
      }>();

      for (const gap of raw.gaps) {
        const key = `${gap.skillName}|${gap.category}`;
        const existing = skillAgg.get(key);
        if (existing) {
          existing.totalRating += gap.finalScore;
          existing.count++;
        } else {
          skillAgg.set(key, {
            skillName: gap.skillName,
            category: gap.category,
            totalRating: gap.finalScore,
            count: 1,
            targetLevel: levelToNumber(gap.currentLevel) + 1, // target is one level above current gap
          });
        }
      }

      const skillGaps = Array.from(skillAgg.values()).map((agg) => {
        const avgRating = Math.round((agg.totalRating / agg.count) * 100) / 100;
        const targetLevel = Math.max(agg.targetLevel, 3); // minimum target of 3
        return {
          skillName: agg.skillName,
          category: agg.category,
          avgRating,
          targetLevel,
          gap: Math.round((targetLevel - avgRating) * 100) / 100,
          employeesAffected: agg.count,
        };
      }).sort((a, b) => b.gap - a.gap);

      res.json({ success: true, data: skillGaps });
    } catch (error) { next(error); }
  }

  /**
   * GET /skills/heatmap
   * Frontend expects: HeatmapCell[] (array with departmentName, category, avgRating, count)
   * Service returns: { departments, categories, heatmap: [{ departmentName, categoryName, averageScore, assessmentCount }] }
   * Transform: flatten heatmap into HeatmapCell[] shape
   */
  async getOrgSkillHeatmap(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const raw = await skillsService.getOrgSkillHeatmap(req.tenantId!);

      // Transform to HeatmapCell[] shape expected by frontend
      const heatmapCells = raw.heatmap
        .filter((cell: any) => cell.assessmentCount > 0)
        .map((cell: any) => ({
          departmentName: cell.departmentName,
          category: cell.categoryName,
          avgRating: cell.averageScore,
          count: cell.assessmentCount,
        }));

      res.json({ success: true, data: heatmapCells });
    } catch (error) { next(error); }
  }

  // ─── Assessment Request ─────────────────────────────────────────

  /**
   * POST /skills/assessments/request
   * Frontend sends: { skillAssessmentId }
   * Creates a notification/request for manager assessment
   */
  async requestAssessment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = requestAssessmentSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });

      await skillsService.requestManagerAssessment(
        req.tenantId!,
        req.user!.id,
        parsed.data.skillAssessmentId
      );

      res.json({ success: true, data: { message: 'Assessment request sent to your manager' } });
    } catch (error) { next(error); }
  }
}

export const skillsController = new SkillsController();
