// @ts-nocheck
/**
 * Evidence Service
 *
 * Enterprise-grade evidence management for defensible HR decisions.
 * Evidence is a first-class entity linked to reviews, compensation, and promotions.
 */

import {
  prisma,
  type Evidence,
  type ReviewEvidence,
  EvidenceType,
  EvidenceSource,
  EvidenceStatus,
} from '@pms/database';

import { auditLogger } from '../../utils/logger';
import { NotFoundError, ValidationError, AuthorizationError } from '../../utils/errors';

// ============================================================================
// TYPES
// ============================================================================

interface CreateEvidenceInput {
  employeeId: string;
  type: EvidenceType;
  source: EvidenceSource;
  title: string;
  description?: string;
  content?: Record<string, unknown>;
  externalId?: string;
  externalUrl?: string;
  occurredAt: Date;
  impactScore?: number;
  effortScore?: number;
  qualityScore?: number;
  tags?: string[];
  skillTags?: string[];
  valueTags?: string[];
}

interface UpdateEvidenceInput {
  title?: string;
  description?: string;
  content?: Record<string, unknown>;
  impactScore?: number;
  effortScore?: number;
  qualityScore?: number;
  tags?: string[];
  skillTags?: string[];
  valueTags?: string[];
}

interface VerifyEvidenceInput {
  status: EvidenceStatus;
  notes?: string;
  adjustedImpactScore?: number;
  adjustedEffortScore?: number;
  adjustedQualityScore?: number;
}

interface LinkEvidenceToReviewInput {
  evidenceId: string;
  reviewId: string;
  category?: string;
  weight?: number;
  relevanceScore?: number;
  notes?: string;
}

interface EvidenceFilters {
  employeeId?: string;
  type?: EvidenceType;
  source?: EvidenceSource;
  status?: EvidenceStatus;
  fromDate?: Date;
  toDate?: Date;
  tags?: string[];
  minImpactScore?: number;
}

// ============================================================================
// SERVICE
// ============================================================================

export class EvidenceService {
  // ==================== Core CRUD ====================

  async createEvidence(
    tenantId: string,
    userId: string,
    input: CreateEvidenceInput
  ): Promise<Evidence> {
    // Validate employee exists
    const employee = await prisma.user.findFirst({
      where: {
        id: input.employeeId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!employee) {
      throw new NotFoundError('Employee', input.employeeId);
    }

    // Validate scores are in range
    if (input.impactScore !== undefined && (input.impactScore < 0 || input.impactScore > 10)) {
      throw new ValidationError('Impact score must be between 0 and 10');
    }
    if (input.effortScore !== undefined && (input.effortScore < 0 || input.effortScore > 10)) {
      throw new ValidationError('Effort score must be between 0 and 10');
    }
    if (input.qualityScore !== undefined && (input.qualityScore < 0 || input.qualityScore > 10)) {
      throw new ValidationError('Quality score must be between 0 and 10');
    }

    const evidence = await prisma.evidence.create({
      data: {
        tenantId,
        employeeId: input.employeeId,
        type: input.type,
        source: input.source,
        title: input.title,
        description: input.description,
        content: input.content ?? {},
        externalId: input.externalId,
        externalUrl: input.externalUrl,
        occurredAt: input.occurredAt,
        impactScore: input.impactScore,
        effortScore: input.effortScore,
        qualityScore: input.qualityScore,
        tags: input.tags ?? [],
        skillTags: input.skillTags ?? [],
        valueTags: input.valueTags ?? [],
        status: EvidenceStatus.PENDING,
        createdById: userId,
      },
    });

    auditLogger('EVIDENCE_CREATED', userId, tenantId, 'evidence', evidence.id, {
      employeeId: input.employeeId,
      type: input.type,
      source: input.source,
      title: input.title,
    });

    return evidence;
  }

  async updateEvidence(
    tenantId: string,
    userId: string,
    evidenceId: string,
    input: UpdateEvidenceInput
  ): Promise<Evidence> {
    const existing = await prisma.evidence.findFirst({
      where: {
        id: evidenceId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundError('Evidence', evidenceId);
    }

    // Cannot update verified evidence
    if (existing.status === EvidenceStatus.VERIFIED) {
      throw new ValidationError('Cannot modify verified evidence');
    }

    // Capture previous state for audit
    const previousState = {
      title: existing.title,
      description: existing.description,
      impactScore: existing.impactScore,
      effortScore: existing.effortScore,
      qualityScore: existing.qualityScore,
    };

    const evidence = await prisma.evidence.update({
      where: { id: evidenceId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.content !== undefined && { content: input.content }),
        ...(input.impactScore !== undefined && { impactScore: input.impactScore }),
        ...(input.effortScore !== undefined && { effortScore: input.effortScore }),
        ...(input.qualityScore !== undefined && { qualityScore: input.qualityScore }),
        ...(input.tags !== undefined && { tags: input.tags }),
        ...(input.skillTags !== undefined && { skillTags: input.skillTags }),
        ...(input.valueTags !== undefined && { valueTags: input.valueTags }),
      },
    });

    auditLogger('EVIDENCE_UPDATED', userId, tenantId, 'evidence', evidenceId, {
      previousState,
      newState: input,
    });

    return evidence;
  }

  async getEvidence(
    tenantId: string,
    userId: string,
    evidenceId: string
  ): Promise<Evidence & { employee: { id: string; firstName: string; lastName: string } }> {
    const evidence = await prisma.evidence.findFirst({
      where: {
        id: evidenceId,
        tenantId,
        deletedAt: null,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        verifiedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        reviewLinks: {
          include: {
            review: {
              select: { id: true, cycleId: true, status: true },
            },
          },
        },
        decisionLinks: true,
      },
    });

    if (!evidence) {
      throw new NotFoundError('Evidence', evidenceId);
    }

    // Access control: user must be employee, their manager, or HR
    // TODO: Add proper permission check
    const canAccess =
      evidence.employeeId === userId ||
      evidence.createdById === userId;

    if (!canAccess) {
      throw new AuthorizationError('You do not have access to this evidence');
    }

    return evidence as Evidence & { employee: { id: string; firstName: string; lastName: string } };
  }

  async listEvidence(
    tenantId: string,
    userId: string,
    filters: EvidenceFilters
  ): Promise<Evidence[]> {
    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }
    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.source) {
      where.source = filters.source;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.fromDate || filters.toDate) {
      where.occurredAt = {
        ...(filters.fromDate && { gte: filters.fromDate }),
        ...(filters.toDate && { lte: filters.toDate }),
      };
    }
    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }
    if (filters.minImpactScore !== undefined) {
      where.impactScore = { gte: filters.minImpactScore };
    }

    const evidence = await prisma.evidence.findMany({
      where,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { occurredAt: 'desc' },
    });

    return evidence;
  }

  // ==================== Verification ====================

  async verifyEvidence(
    tenantId: string,
    userId: string,
    evidenceId: string,
    input: VerifyEvidenceInput
  ): Promise<Evidence> {
    const existing = await prisma.evidence.findFirst({
      where: {
        id: evidenceId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundError('Evidence', evidenceId);
    }

    // Cannot verify own evidence
    if (existing.employeeId === userId) {
      throw new ValidationError('Cannot verify your own evidence');
    }

    const evidence = await prisma.evidence.update({
      where: { id: evidenceId },
      data: {
        status: input.status,
        verificationNotes: input.notes,
        verifiedById: userId,
        verifiedAt: new Date(),
        ...(input.adjustedImpactScore !== undefined && { impactScore: input.adjustedImpactScore }),
        ...(input.adjustedEffortScore !== undefined && { effortScore: input.adjustedEffortScore }),
        ...(input.adjustedQualityScore !== undefined && { qualityScore: input.adjustedQualityScore }),
      },
    });

    auditLogger('EVIDENCE_VERIFIED', userId, tenantId, 'evidence', evidenceId, {
      status: input.status,
      previousScores: {
        impact: existing.impactScore,
        effort: existing.effortScore,
        quality: existing.qualityScore,
      },
      adjustedScores: {
        impact: input.adjustedImpactScore,
        effort: input.adjustedEffortScore,
        quality: input.adjustedQualityScore,
      },
    });

    return evidence;
  }

  // ==================== Linking ====================

  async linkToReview(
    tenantId: string,
    userId: string,
    input: LinkEvidenceToReviewInput
  ): Promise<ReviewEvidence> {
    // Validate evidence exists
    const evidence = await prisma.evidence.findFirst({
      where: {
        id: input.evidenceId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!evidence) {
      throw new NotFoundError('Evidence', input.evidenceId);
    }

    // Validate review exists
    const review = await prisma.review.findFirst({
      where: {
        id: input.reviewId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!review) {
      throw new NotFoundError('Review', input.reviewId);
    }

    // Evidence must belong to the reviewee
    if (evidence.employeeId !== review.revieweeId) {
      throw new ValidationError('Evidence must belong to the review subject');
    }

    // Check if already linked
    const existingLink = await prisma.reviewEvidence.findFirst({
      where: {
        evidenceId: input.evidenceId,
        reviewId: input.reviewId,
      },
    });

    if (existingLink) {
      throw new ValidationError('Evidence is already linked to this review');
    }

    const link = await prisma.reviewEvidence.create({
      data: {
        evidenceId: input.evidenceId,
        reviewId: input.reviewId,
        category: input.category,
        weight: input.weight ?? 1.0,
        relevanceScore: input.relevanceScore,
        linkedById: userId,
        notes: input.notes,
      },
    });

    auditLogger('EVIDENCE_LINKED_TO_REVIEW', userId, tenantId, 'review_evidence', link.id, {
      evidenceId: input.evidenceId,
      reviewId: input.reviewId,
      category: input.category,
    });

    return link;
  }

  async unlinkFromReview(
    tenantId: string,
    userId: string,
    evidenceId: string,
    reviewId: string,
    reason?: string
  ): Promise<void> {
    const link = await prisma.reviewEvidence.findFirst({
      where: {
        evidenceId,
        reviewId,
      },
      include: {
        evidence: true,
        review: true,
      },
    });

    if (!link) {
      throw new NotFoundError('Evidence link', `${evidenceId}-${reviewId}`);
    }

    await prisma.reviewEvidence.delete({
      where: { id: link.id },
    });

    auditLogger('EVIDENCE_UNLINKED_FROM_REVIEW', userId, tenantId, 'review_evidence', link.id, {
      evidenceId,
      reviewId,
      reason,
    });
  }

  // ==================== Bulk Operations ====================

  async importEvidence(
    tenantId: string,
    userId: string,
    source: EvidenceSource,
    items: Array<Omit<CreateEvidenceInput, 'source'>>,
    integrationId?: string
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;
    let failed = 0;

    for (const item of items) {
      try {
        await this.createEvidence(tenantId, userId, {
          ...item,
          source,
        });
        imported++;
      } catch (error) {
        failed++;
        errors.push(`Failed to import evidence for employee ${item.employeeId}: ${(error as Error).message}`);
      }
    }

    auditLogger('EVIDENCE_BULK_IMPORT', userId, tenantId, 'evidence', 'bulk', {
      source,
      integrationId,
      imported,
      failed,
    });

    return { imported, failed, errors };
  }

  async archiveEvidence(
    tenantId: string,
    userId: string,
    evidenceId: string,
    reason?: string
  ): Promise<Evidence> {
    const existing = await prisma.evidence.findFirst({
      where: {
        id: evidenceId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundError('Evidence', evidenceId);
    }

    const evidence = await prisma.evidence.update({
      where: { id: evidenceId },
      data: {
        status: EvidenceStatus.ARCHIVED,
        archivedAt: new Date(),
        archivedById: userId,
        archiveReason: reason,
      },
    });

    auditLogger('EVIDENCE_ARCHIVED', userId, tenantId, 'evidence', evidenceId, {
      reason,
    });

    return evidence;
  }

  // ==================== Analytics ====================

  async getEvidenceSummary(
    tenantId: string,
    employeeId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<{
    total: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    byStatus: Record<string, number>;
    averageScores: {
      impact: number | null;
      effort: number | null;
      quality: number | null;
    };
    linkedToReviews: number;
    linkedToDecisions: number;
  }> {
    const where: Record<string, unknown> = {
      tenantId,
      employeeId,
      deletedAt: null,
    };

    if (fromDate || toDate) {
      where.occurredAt = {
        ...(fromDate && { gte: fromDate }),
        ...(toDate && { lte: toDate }),
      };
    }

    const evidence = await prisma.evidence.findMany({
      where,
      include: {
        _count: {
          select: {
            reviewLinks: true,
            decisionLinks: true,
          },
        },
      },
    });

    const byType: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let impactSum = 0, impactCount = 0;
    let effortSum = 0, effortCount = 0;
    let qualitySum = 0, qualityCount = 0;
    let linkedToReviews = 0;
    let linkedToDecisions = 0;

    for (const e of evidence) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      bySource[e.source] = (bySource[e.source] || 0) + 1;
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;

      if (e.impactScore !== null) {
        impactSum += e.impactScore;
        impactCount++;
      }
      if (e.effortScore !== null) {
        effortSum += e.effortScore;
        effortCount++;
      }
      if (e.qualityScore !== null) {
        qualitySum += e.qualityScore;
        qualityCount++;
      }

      if (e._count.reviewLinks > 0) linkedToReviews++;
      if (e._count.decisionLinks > 0) linkedToDecisions++;
    }

    return {
      total: evidence.length,
      byType,
      bySource,
      byStatus,
      averageScores: {
        impact: impactCount > 0 ? impactSum / impactCount : null,
        effort: effortCount > 0 ? effortSum / effortCount : null,
        quality: qualityCount > 0 ? qualitySum / qualityCount : null,
      },
      linkedToReviews,
      linkedToDecisions,
    };
  }
}

export const evidenceService = new EvidenceService();
