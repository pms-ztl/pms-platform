/**
 * Compensation Controller
 *
 * HTTP handlers for compensation decision endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { compensationService } from './compensation.service';
import { CompensationType, CompensationDecisionStatus } from '@pms/database';

export class CompensationController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const decision = await compensationService.createDecision(tenantId, userId, {
        employeeId: req.body.employeeId,
        cycleId: req.body.cycleId,
        type: req.body.type as CompensationType,
        currentAmount: req.body.currentAmount,
        proposedAmount: req.body.proposedAmount,
        currency: req.body.currency,
        effectiveDate: new Date(req.body.effectiveDate),
        rationale: req.body.rationale,
        performanceRating: req.body.performanceRating,
        marketData: req.body.marketData,
        budgetPoolId: req.body.budgetPoolId,
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

      const decision = await compensationService.getDecision(tenantId, userId, decisionId);
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
        type: req.query.type as CompensationType | undefined,
        status: req.query.status as CompensationDecisionStatus | undefined,
        minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
        maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
        effectiveDateFrom: req.query.effectiveDateFrom ? new Date(req.query.effectiveDateFrom as string) : undefined,
        effectiveDateTo: req.query.effectiveDateTo ? new Date(req.query.effectiveDateTo as string) : undefined,
      };

      const decisions = await compensationService.listDecisions(tenantId, userId, filters);
      res.json({ data: decisions });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const { decisionId } = req.params;

      const decision = await compensationService.updateDecision(tenantId, userId, decisionId, {
        proposedAmount: req.body.proposedAmount,
        rationale: req.body.rationale,
        effectiveDate: req.body.effectiveDate ? new Date(req.body.effectiveDate) : undefined,
        marketData: req.body.marketData,
      });

      res.json({ data: decision });
    } catch (error) {
      next(error);
    }
  }

  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const { decisionId } = req.params;

      const decision = await compensationService.submitForApproval(tenantId, userId, decisionId);
      res.json({ data: decision });
    } catch (error) {
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const { decisionId } = req.params;

      const decision = await compensationService.approve(tenantId, userId, decisionId, {
        notes: req.body.notes,
        adjustedAmount: req.body.adjustedAmount,
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

      const decision = await compensationService.reject(tenantId, userId, decisionId, req.body.reason);
      res.json({ data: decision });
    } catch (error) {
      next(error);
    }
  }

  async implement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const { decisionId } = req.params;

      const decision = await compensationService.implement(tenantId, userId, decisionId);
      res.json({ data: decision });
    } catch (error) {
      next(error);
    }
  }

  async linkEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;

      const link = await compensationService.linkEvidence(tenantId, userId, {
        decisionId: req.body.decisionId,
        evidenceId: req.body.evidenceId,
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

      await compensationService.unlinkEvidence(tenantId, userId, decisionId, evidenceId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async getBudgetSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.context;
      const cycleId = req.query.cycleId as string | undefined;

      const summary = await compensationService.getBudgetSummary(tenantId, cycleId);
      res.json({ data: summary });
    } catch (error) {
      next(error);
    }
  }
}

export const compensationController = new CompensationController();
