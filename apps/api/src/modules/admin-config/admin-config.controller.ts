import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../types';
import { ValidationError } from '../../utils/errors';
import { adminConfigService } from './admin-config.service';

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  sections: z.array(z.any()).optional(),
});

const createFrameworkSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
});

const createCompetencySchema = z.object({
  parentId: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  levelDescriptions: z.any().optional(),
  sortOrder: z.number().int().optional(),
});

const createQuestionnaireSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  questionnaireType: z.string().optional(),
  isTemplate: z.boolean().optional(),
  useAIAdaptation: z.boolean().optional(),
  adaptationCriteria: z.any().optional(),
  questions: z.array(z.any()).optional(),
  competencyIds: z.array(z.string()).optional(),
});

class AdminConfigController {
  // ── Templates ──
  async listTemplates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await adminConfigService.listTemplates(req.tenantId!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await adminConfigService.getTemplate(req.tenantId!, req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async createTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = createTemplateSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });
      const data = await adminConfigService.createTemplate(req.tenantId!, parsed.data as any);
      res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  }

  async updateTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await adminConfigService.updateTemplate(req.tenantId!, req.params.id, req.body);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async deleteTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await adminConfigService.deleteTemplate(req.tenantId!, req.params.id);
      res.json({ success: true, message: 'Deleted' });
    } catch (error) { next(error); }
  }

  // ── Frameworks ──
  async listFrameworks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await adminConfigService.listFrameworks(req.tenantId!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getFramework(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await adminConfigService.getFramework(req.tenantId!, req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async createFramework(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = createFrameworkSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });
      const data = await adminConfigService.createFramework(req.tenantId!, parsed.data as any);
      res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  }

  async updateFramework(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await adminConfigService.updateFramework(req.tenantId!, req.params.id, req.body);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async deleteFramework(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await adminConfigService.deleteFramework(req.tenantId!, req.params.id);
      res.json({ success: true, message: 'Deleted' });
    } catch (error) { next(error); }
  }

  // ── Competencies ──
  async listCompetencies(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await adminConfigService.listCompetencies(req.params.frameworkId);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async createCompetency(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = createCompetencySchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });
      const data = await adminConfigService.createCompetency(req.params.frameworkId, parsed.data as any);
      res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  }

  async updateCompetency(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await adminConfigService.updateCompetency(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async deleteCompetency(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await adminConfigService.deleteCompetency(req.params.id);
      res.json({ success: true, message: 'Deleted' });
    } catch (error) { next(error); }
  }

  // ── Questionnaires ──
  async listQuestionnaires(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await adminConfigService.listQuestionnaires(req.tenantId!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async createQuestionnaire(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = createQuestionnaireSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });
      const data = await adminConfigService.createQuestionnaire(req.tenantId!, req.user!.id, parsed.data as any);
      res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  }

  async updateQuestionnaire(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await adminConfigService.updateQuestionnaire(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async deleteQuestionnaire(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await adminConfigService.deleteQuestionnaire(req.params.id);
      res.json({ success: true, message: 'Deleted' });
    } catch (error) { next(error); }
  }

  // ── Rating Scales ──
  async getRatingScales(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await adminConfigService.getRatingScales(req.tenantId!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
}

export const adminConfigController = new AdminConfigController();
