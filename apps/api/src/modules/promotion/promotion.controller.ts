/**
 * Promotion Controller
 *
 * HTTP handlers for promotion decision endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { promotionService } from './promotion.service';
import { PromotionType, PromotionDecisionStatus } from '@pms/database';

export class PromotionController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const decision = await promotionService.createDecision(tenantId, userId, {
        employeeId: req.body.employeeId,
        cycleId: req.body.cycleId,
        calibrationSessionId: req.body.calibrationSessionId,
        type: req.body.type as PromotionType,
        currentRoleId: req.body.currentRoleId,
        proposedRoleId: req.body.proposedRoleId,
        effectiveDate: new Date(req.body.effectiveDate),
        rationale: req.body.rationale,
        performanceRating: req.body.performanceRating,
        readinessScore: req.body.readinessScore,
        criteria: req.body.criteria,
      });

      res.status(201).json({ data: decision });
    } catch (error) {
      next(error);
    }
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const { decisionId } = req.params;

      const decision = await promotionService.getDecision(tenantId, userId, decisionId);
      res.json({ data: decision });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
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

      const decisions = await promotionService.listDecisions(tenantId, userId, filters);
      res.json({ data: decisions });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const { decisionId } = req.params;

      const decision = await promotionService.updateDecision(tenantId, userId, decisionId, {
        proposedRoleId: req.body.proposedRoleId,
        rationale: req.body.rationale,
        effectiveDate: req.body.effectiveDate ? new Date(req.body.effectiveDate) : undefined,
        readinessScore: req.body.readinessScore,
        criteria: req.body.criteria,
      });

      res.json({ data: decision });
    } catch (error) {
      next(error);
    }
  }

  async startReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const { decisionId } = req.params;

      const decision = await promotionService.startReview(tenantId, userId, decisionId);
      res.json({ data: decision });
    } catch (error) {
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const { decisionId } = req.params;

      const decision = await promotionService.approve(tenantId, userId, decisionId, {
        notes: req.body.notes,
        adjustedRoleId: req.body.adjustedRoleId,
      });

      res.json({ data: decision });
    } catch (error) {
      next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const { decisionId } = req.params;

      const decision = await promotionService.reject(tenantId, userId, decisionId, req.body.reason);
      res.json({ data: decision });
    } catch (error) {
      next(error);
    }
  }

  async defer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const { decisionId } = req.params;

      const decision = await promotionService.defer(
        tenantId,
        userId,
        decisionId,
        req.body.reason,
        req.body.deferUntil ? new Date(req.body.deferUntil) : undefined
      );

      res.json({ data: decision });
    } catch (error) {
      next(error);
    }
  }

  async implement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const { decisionId } = req.params;

      const decision = await promotionService.implement(tenantId, userId, decisionId);
      res.json({ data: decision });
    } catch (error) {
      next(error);
    }
  }

  async linkEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;

      const link = await promotionService.linkEvidence(tenantId, userId, {
        decisionId: req.body.decisionId,
        evidenceId: req.body.evidenceId,
        criterionId: req.body.criterionId,
        weight: req.body.weight,
        relevanceScore: req.body.relevanceScore,
        notes: req.body.notes,
      });

      res.status(201).json({ data: link });
    } catch (error) {
      next(error);
    }
  }

  async unlinkEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const { decisionId, evidenceId } = req.params;

      await promotionService.unlinkEvidence(tenantId, userId, decisionId, evidenceId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.context;
      const cycleId = req.query.cycleId as string | undefined;

      const summary = await promotionService.getPromotionSummary(tenantId, cycleId);
      res.json({ data: summary });
    } catch (error) {
      next(error);
    }
  }
}

export const promotionController = new PromotionController();
