/**
 * Evidence Controller
 *
 * HTTP handlers for evidence management endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { evidenceService } from './evidence.service';
import { EvidenceType, EvidenceSource, EvidenceStatus } from '@pms/database';

export class EvidenceController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const evidence = await evidenceService.createEvidence(tenantId, userId, {
        employeeId: req.body.employeeId,
        type: req.body.type as EvidenceType,
        source: req.body.source as EvidenceSource,
        title: req.body.title,
        description: req.body.description,
        content: req.body.content,
        externalId: req.body.externalId,
        externalUrl: req.body.externalUrl,
        occurredAt: new Date(req.body.occurredAt),
        impactScore: req.body.impactScore,
        effortScore: req.body.effortScore,
        qualityScore: req.body.qualityScore,
        tags: req.body.tags,
        skillTags: req.body.skillTags,
        valueTags: req.body.valueTags,
      });

      res.status(201).json({ data: evidence });
    } catch (error) {
      next(error);
    }
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const { evidenceId } = req.params;

      const evidence = await evidenceService.getEvidence(tenantId, userId, evidenceId);
      res.json({ data: evidence });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const filters = {
        employeeId: req.query.employeeId as string | undefined,
        type: req.query.type as EvidenceType | undefined,
        source: req.query.source as EvidenceSource | undefined,
        status: req.query.status as EvidenceStatus | undefined,
        fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
        toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        minImpactScore: req.query.minImpactScore ? Number(req.query.minImpactScore) : undefined,
      };

      const evidence = await evidenceService.listEvidence(tenantId, userId, filters);
      res.json({ data: evidence });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const { evidenceId } = req.params;

      const evidence = await evidenceService.updateEvidence(tenantId, userId, evidenceId, {
        title: req.body.title,
        description: req.body.description,
        content: req.body.content,
        impactScore: req.body.impactScore,
        effortScore: req.body.effortScore,
        qualityScore: req.body.qualityScore,
        tags: req.body.tags,
        skillTags: req.body.skillTags,
        valueTags: req.body.valueTags,
      });

      res.json({ data: evidence });
    } catch (error) {
      next(error);
    }
  }

  async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const { evidenceId } = req.params;

      const evidence = await evidenceService.verifyEvidence(tenantId, userId, evidenceId, {
        status: req.body.status as EvidenceStatus,
        notes: req.body.notes,
        adjustedImpactScore: req.body.adjustedImpactScore,
        adjustedEffortScore: req.body.adjustedEffortScore,
        adjustedQualityScore: req.body.adjustedQualityScore,
      });

      res.json({ data: evidence });
    } catch (error) {
      next(error);
    }
  }

  async linkToReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;

      const link = await evidenceService.linkToReview(tenantId, userId, {
        evidenceId: req.body.evidenceId,
        reviewId: req.body.reviewId,
        category: req.body.category,
        weight: req.body.weight,
        relevanceScore: req.body.relevanceScore,
        notes: req.body.notes,
      });

      res.status(201).json({ data: link });
    } catch (error) {
      next(error);
    }
  }

  async unlinkFromReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const { evidenceId, reviewId } = req.params;

      await evidenceService.unlinkFromReview(tenantId, userId, evidenceId, reviewId, req.body.reason);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;
      const { evidenceId } = req.params;

      const evidence = await evidenceService.archiveEvidence(tenantId, userId, evidenceId, req.body.reason);
      res.json({ data: evidence });
    } catch (error) {
      next(error);
    }
  }

  async bulkImport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = req.context;

      const result = await evidenceService.importEvidence(
        tenantId,
        userId,
        req.body.source as EvidenceSource,
        req.body.items,
        req.body.integrationId
      );

      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.context;
      const { employeeId } = req.params;
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : undefined;
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : undefined;

      const summary = await evidenceService.getEvidenceSummary(tenantId, employeeId, fromDate, toDate);
      res.json({ data: summary });
    } catch (error) {
      next(error);
    }
  }
}

export const evidenceController = new EvidenceController();
