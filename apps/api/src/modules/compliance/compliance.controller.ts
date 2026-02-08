// @ts-nocheck
import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../types';
import { ValidationError } from '../../utils/errors';
import { complianceService } from './compliance.service';

// ─── Zod Schemas ────────────────────────────────────────────

const createPolicySchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  version: z.string().optional(),
  effectiveDate: z.string().optional(),
  expiryDate: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  enforcementLevel: z.enum(['ADVISORY', 'MANDATORY', 'CRITICAL']).optional(),
  requirements: z.any().optional(),
  applicableScope: z.enum(['ALL', 'DEPARTMENT', 'TEAM', 'ROLE']).optional(),
  applicableEntities: z.array(z.any()).optional(),
  violationDefinitions: z.any().optional(),
  automatedChecks: z.any().optional(),
  gracePeriodDays: z.number().int().optional(),
  escalationRules: z.any().optional(),
});

const updatePolicySchema = createPolicySchema.partial();

const createAssessmentSchema = z.object({
  userId: z.string().uuid(),
  policyId: z.string().uuid().optional(),
  assessorId: z.string().uuid().optional(),
  assessmentType: z.string().optional(),
  assessmentScope: z.enum(['USER', 'TEAM', 'DEPARTMENT', 'ORGANIZATION']).optional(),
  status: z.enum(['COMPLIANT', 'NON_COMPLIANT', 'PARTIAL', 'PENDING']).optional(),
  score: z.number().min(0).max(100).optional(),
  findings: z.any().optional(),
  recommendations: z.any().optional(),
  dueDate: z.string().optional(),
  completedDate: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});

const updateAssessmentSchema = z.object({
  status: z.enum(['COMPLIANT', 'NON_COMPLIANT', 'PARTIAL', 'PENDING']).optional(),
  score: z.number().min(0).max(100).optional(),
  findings: z.any().optional(),
  recommendations: z.any().optional(),
  dueDate: z.string().optional(),
  completedDate: z.string().optional(),
  remediationPlan: z.string().optional(),
  remediationRequired: z.boolean().optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

const createViolationSchema = z.object({
  assessmentId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  violationType: z.string().optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  ruleViolated: z.string().optional(),
  description: z.string().min(1),
  detectionMethod: z.enum(['AUTOMATED', 'MANUAL', 'REPORTED']).optional(),
  status: z.enum(['OPEN', 'ACKNOWLEDGED', 'IN_REMEDIATION', 'RESOLVED', 'DISMISSED']).optional(),
  evidenceData: z.any().optional(),
  evidenceLinks: z.array(z.string()).optional(),
});

const updateViolationSchema = z.object({
  status: z.enum(['OPEN', 'ACKNOWLEDGED', 'IN_REMEDIATION', 'RESOLVED', 'DISMISSED']).optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  description: z.string().optional(),
  resolutionNotes: z.string().optional(),
  resolvedById: z.string().uuid().optional(),
  acknowledgedById: z.string().uuid().optional(),
});

// ─── Controller ─────────────────────────────────────────────

class ComplianceController {
  // Dashboard
  async getDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await complianceService.getDashboard(req.tenantId!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  // Policies
  async listPolicies(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const params = {
        status: req.query.status as string | undefined,
        category: req.query.category as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };
      const data = await complianceService.listPolicies(req.tenantId!, params);
      res.json({ success: true, data: data.data, meta: data.meta });
    } catch (error) { next(error); }
  }

  async createPolicy(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = createPolicySchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });
      const policy = await complianceService.createPolicy(req.tenantId!, req.user!.id, parsed.data as any);
      res.status(201).json({ success: true, data: policy });
    } catch (error) { next(error); }
  }

  async updatePolicy(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = updatePolicySchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });
      const policy = await complianceService.updatePolicy(req.tenantId!, req.params.id, parsed.data as any);
      res.json({ success: true, data: policy });
    } catch (error) { next(error); }
  }

  async deletePolicy(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await complianceService.deletePolicy(req.tenantId!, req.params.id);
      res.json({ success: true, message: 'Policy deleted' });
    } catch (error) { next(error); }
  }

  // Assessments
  async listAssessments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const params = {
        userId: req.query.userId as string | undefined,
        policyId: req.query.policyId as string | undefined,
        status: req.query.status as string | undefined,
        dueDateFrom: req.query.dueDateFrom as string | undefined,
        dueDateTo: req.query.dueDateTo as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };
      const data = await complianceService.listAssessments(req.tenantId!, params);
      res.json({ success: true, data: data.data, meta: data.meta });
    } catch (error) { next(error); }
  }

  async createAssessment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = createAssessmentSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });
      const assessment = await complianceService.createAssessment(req.tenantId!, parsed.data as any);
      res.status(201).json({ success: true, data: assessment });
    } catch (error) { next(error); }
  }

  async updateAssessment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = updateAssessmentSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });
      const assessment = await complianceService.updateAssessment(req.tenantId!, req.params.id, parsed.data as any);
      res.json({ success: true, data: assessment });
    } catch (error) { next(error); }
  }

  // Violations
  async listViolations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const params = {
        severity: req.query.severity as string | undefined,
        status: req.query.status as string | undefined,
        userId: req.query.userId as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };
      const data = await complianceService.listViolations(req.tenantId!, params);
      res.json({ success: true, data: data.data, meta: data.meta });
    } catch (error) { next(error); }
  }

  async createViolation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = createViolationSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });
      const violation = await complianceService.createViolation(req.tenantId!, parsed.data as any);
      res.status(201).json({ success: true, data: violation });
    } catch (error) { next(error); }
  }

  async updateViolation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = updateViolationSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid data', { errors: parsed.error.format() });
      const violation = await complianceService.updateViolation(req.tenantId!, req.params.id, parsed.data as any);
      res.json({ success: true, data: violation });
    } catch (error) { next(error); }
  }

  // User Compliance
  async getUserCompliance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await complianceService.getUserCompliance(req.tenantId!, req.params.userId);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
}

export const complianceController = new ComplianceController();
