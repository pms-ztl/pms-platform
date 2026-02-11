/**
 * Compensation Controller
 *
 * HTTP handlers for compensation decision endpoints.
 */

import { Response, NextFunction } from 'express';
import { compensationService } from './compensation.service';
import { CompensationType, CompensationDecisionStatus } from '@pms/database';
import type { AuthenticatedRequest } from '../../types';

export class CompensationController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; const userId = req.user!.id;
      const decision = await compensationService.createDecision(tenantId, userId, {
        employeeId: req.body.employeeId,
        reviewCycleId: req.body.cycleId || req.body.reviewCycleId,
        type: req.body.type as CompensationType,
        previousAmount: req.body.currentAmount || req.body.previousAmount,
        newAmount: req.body.proposedAmount || req.body.newAmount,
        currency: req.body.currency,
        effectiveDate: new Date(req.body.effectiveDate),
        reason: req.body.rationale || req.body.reason,
        justification: req.body.justification,
        performanceRating: req.body.performanceRating,
        marketData: req.body.marketData,
        equityAnalysis: req.body.equityAnalysis,
      });

      res.status(201).json({ success: true, data: decision });
    } catch (error) {
      next(error);
    }
  }

  async get(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; const userId = req.user!.id;
      const { decisionId } = req.params;

      const decision = await compensationService.getDecision(tenantId, userId, decisionId);
      res.json({ success: true, data: decision });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; const userId = req.user!.id;
      const filters = {
        employeeId: req.query.employeeId as string | undefined,
        reviewCycleId: (req.query.cycleId || req.query.reviewCycleId) as string | undefined,
        type: req.query.type as CompensationType | undefined,
        status: req.query.status as CompensationDecisionStatus | undefined,
        minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
        maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
        effectiveDateFrom: req.query.effectiveDateFrom ? new Date(req.query.effectiveDateFrom as string) : undefined,
        effectiveDateTo: req.query.effectiveDateTo ? new Date(req.query.effectiveDateTo as string) : undefined,
      };

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string, 10), 100) : 20;

      const allDecisions = await compensationService.listDecisions(tenantId, userId, filters);
      const total = allDecisions.length;
      const totalPages = Math.ceil(total / limit);
      const paged = allDecisions.slice((page - 1) * limit, page * limit);

      res.json({
        success: true,
        data: paged,
        meta: { total, page, limit, totalPages },
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; const userId = req.user!.id;
      const { decisionId } = req.params;

      const decision = await compensationService.updateDecision(tenantId, userId, decisionId, {
        newAmount: req.body.proposedAmount || req.body.newAmount,
        reason: req.body.rationale || req.body.reason,
        effectiveDate: req.body.effectiveDate ? new Date(req.body.effectiveDate) : undefined,
        marketData: req.body.marketData,
      });

      res.json({ success: true, data: decision });
    } catch (error) {
      next(error);
    }
  }

  async submit(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; const userId = req.user!.id;
      const { decisionId } = req.params;

      const decision = await compensationService.submitForApproval(tenantId, userId, decisionId);
      res.json({ success: true, data: decision });
    } catch (error) {
      next(error);
    }
  }

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; const userId = req.user!.id;
      const { decisionId } = req.params;

      const decision = await compensationService.approve(tenantId, userId, decisionId, {
        notes: req.body.notes,
        adjustedAmount: req.body.adjustedAmount,
      });

      res.json({ success: true, data: decision });
    } catch (error) {
      next(error);
    }
  }

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; const userId = req.user!.id;
      const { decisionId } = req.params;

      const decision = await compensationService.reject(tenantId, userId, decisionId, req.body.reason);
      res.json({ success: true, data: decision });
    } catch (error) {
      next(error);
    }
  }

  async implement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; const userId = req.user!.id;
      const { decisionId } = req.params;

      const decision = await compensationService.implement(tenantId, userId, decisionId);
      res.json({ success: true, data: decision });
    } catch (error) {
      next(error);
    }
  }

  async linkEvidence(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; const userId = req.user!.id;

      const link = await compensationService.linkEvidence(tenantId, userId, {
        decisionId: req.body.decisionId,
        evidenceId: req.body.evidenceId,
        weight: req.body.weight,
        relevanceScore: req.body.relevanceScore,
        notes: req.body.notes,
      });

      res.status(201).json({ success: true, data: link });
    } catch (error) {
      next(error);
    }
  }

  async unlinkEvidence(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; const userId = req.user!.id;
      const { decisionId, evidenceId } = req.params;

      await compensationService.unlinkEvidence(tenantId, userId, decisionId, evidenceId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async getBudgetSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const cycleId = req.query.cycleId as string | undefined;

      const summary = await compensationService.getBudgetSummary(tenantId, cycleId);
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }
}

export const compensationController = new CompensationController();
