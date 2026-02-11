/**
 * Promotion Controller
 *
 * HTTP handlers for promotion decision endpoints.
 */

import { Response, NextFunction } from 'express';
import { promotionService } from './promotion.service';
import { PromotionType, PromotionDecisionStatus } from '@pms/database';
import type { AuthenticatedRequest } from '../../types';

/** Map DB fields to frontend-expected shape */
function mapPromotion(d: any) {
  return {
    ...d,
    promotionType: d.type,
    currentRole: d.previousTitle || d.previousRole?.name,
    proposedRole: d.newTitle || d.newRole?.name,
    currentLevel: d.previousLevel,
    proposedLevel: d.newLevel,
  };
}

export class PromotionController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; const userId = req.user!.id;
      const decision = await promotionService.createDecision(tenantId, userId, {
        employeeId: req.body.employeeId,
        cycleId: req.body.cycleId,
        calibrationSessionId: req.body.calibrationSessionId,
        type: (req.body.type || req.body.promotionType) as PromotionType,
        currentRoleId: req.body.currentRoleId,
        proposedRoleId: req.body.proposedRoleId,
        previousTitle: req.body.currentRole || req.body.previousTitle,
        newTitle: req.body.proposedRole || req.body.newTitle,
        previousLevel: req.body.currentLevel != null ? Number(req.body.currentLevel) : undefined,
        newLevel: req.body.proposedLevel != null ? Number(req.body.proposedLevel) : undefined,
        effectiveDate: req.body.effectiveDate ? new Date(req.body.effectiveDate) : undefined,
        justification: req.body.justification || req.body.rationale,
        readinessScore: req.body.readinessScore,
        criteriaScores: req.body.criteriaScores || req.body.criteria,
      });

      res.status(201).json({ success: true, data: mapPromotion(decision) });
    } catch (error) {
      next(error);
    }
  }

  async get(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; const userId = req.user!.id;
      const { decisionId } = req.params;

      const decision = await promotionService.getDecision(tenantId, userId, decisionId);
      res.json({ success: true, data: mapPromotion(decision) });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; const userId = req.user!.id;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string, 10), 100) : 20;

      const filters = {
        employeeId: req.query.employeeId as string | undefined,
        cycleId: req.query.cycleId as string | undefined,
        calibrationSessionId: req.query.calibrationSessionId as string | undefined,
        type: req.query.type as PromotionType | undefined,
        status: req.query.status as PromotionDecisionStatus | undefined,
        currentRoleId: req.query.currentRoleId as string | undefined,
        proposedRoleId: req.query.proposedRoleId as string | undefined,
        effectiveDateFrom: req.query.effectiveDateFrom ? new Date(req.query.effectiveDateFrom as string) : undefined,
        effectiveDateTo: req.query.effectiveDateTo ? new Date(req.query.effectiveDateTo as string) : undefined,
      };

      const allDecisions = await promotionService.listDecisions(tenantId, userId, filters);
      const total = allDecisions.length;
      const totalPages = Math.ceil(total / limit);
      const paged = allDecisions.slice((page - 1) * limit, page * limit);

      res.json({
        success: true,
        data: paged.map(mapPromotion),
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

      const decision = await promotionService.updateDecision(tenantId, userId, decisionId, {
        proposedRoleId: req.body.proposedRoleId,
        justification: req.body.justification || req.body.rationale,
        effectiveDate: req.body.effectiveDate ? new Date(req.body.effectiveDate) : undefined,
        readinessScore: req.body.readinessScore,
        criteriaScores: req.body.criteriaScores || req.body.criteria,
      });

      res.json({ success: true, data: mapPromotion(decision) });
    } catch (error) {
      next(error);
    }
  }

  async startReview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; const userId = req.user!.id;
      const { decisionId } = req.params;

      const decision = await promotionService.startReview(tenantId, userId, decisionId);
      res.json({ success: true, data: mapPromotion(decision) });
    } catch (error) {
      next(error);
    }
  }

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; const userId = req.user!.id;
      const { decisionId } = req.params;

      const decision = await promotionService.approve(tenantId, userId, decisionId, {
        notes: req.body.notes,
        adjustedRoleId: req.body.adjustedRoleId,
      });

      res.json({ success: true, data: mapPromotion(decision) });
    } catch (error) {
      next(error);
    }
  }

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; const userId = req.user!.id;
      const { decisionId } = req.params;

      const decision = await promotionService.reject(tenantId, userId, decisionId, req.body.reason);
      res.json({ success: true, data: mapPromotion(decision) });
    } catch (error) {
      next(error);
    }
  }

  async defer(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; const userId = req.user!.id;
      const { decisionId } = req.params;

      const decision = await promotionService.defer(
        tenantId,
        userId,
        decisionId,
        req.body.reason,
        req.body.deferUntil ? new Date(req.body.deferUntil) : undefined
      );

      res.json({ success: true, data: mapPromotion(decision) });
    } catch (error) {
      next(error);
    }
  }

  async implement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; const userId = req.user!.id;
      const { decisionId } = req.params;

      const decision = await promotionService.implement(tenantId, userId, decisionId);
      res.json({ success: true, data: mapPromotion(decision) });
    } catch (error) {
      next(error);
    }
  }

  async linkEvidence(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!; const userId = req.user!.id;

      const link = await promotionService.linkEvidence(tenantId, userId, {
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

      await promotionService.unlinkEvidence(tenantId, userId, decisionId, evidenceId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const cycleId = req.query.cycleId as string | undefined;

      const summary = await promotionService.getPromotionSummary(tenantId, cycleId);
      res.json({
        success: true,
        data: {
          ...summary,
          underReview: summary.byStatus['UNDER_REVIEW'] || 0,
          approved: summary.byStatus['APPROVED'] || 0,
          implemented: summary.byStatus['IMPLEMENTED'] || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const promotionController = new PromotionController();
