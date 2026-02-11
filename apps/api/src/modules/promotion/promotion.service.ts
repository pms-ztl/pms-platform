// @ts-nocheck
/**
 * Promotion Service
 *
 * Enterprise-grade promotion decision management with full audit trail.
 * All decisions must be linked to evidence for defensibility.
 */

import {
  prisma,
  type PromotionDecision,
  type DecisionEvidence,
  PromotionType,
  PromotionDecisionStatus,
} from '@pms/database';

import { auditLogger } from '../../utils/logger';
import { NotFoundError, ValidationError, AuthorizationError } from '../../utils/errors';

// ============================================================================
// TYPES
// ============================================================================

interface CreatePromotionDecisionInput {
  employeeId: string;
  cycleId?: string;
  calibrationSessionId?: string;
  type: PromotionType;
  currentRoleId?: string;
  proposedRoleId?: string;
  previousTitle?: string;
  newTitle?: string;
  previousLevel?: number;
  newLevel?: number;
  effectiveDate?: Date;
  justification: string;
  readinessScore?: number;
  criteriaScores?: Record<string, unknown>;
}

interface UpdatePromotionDecisionInput {
  proposedRoleId?: string;
  justification?: string;
  effectiveDate?: Date;
  readinessScore?: number;
  criteriaScores?: Record<string, unknown>;
}

interface ApprovalInput {
  notes?: string;
  adjustedRoleId?: string;
}

interface LinkEvidenceInput {
  decisionId: string;
  evidenceId: string;
  weight?: number;
  relevanceScore?: number;
  notes?: string;
}

interface PromotionFilters {
  employeeId?: string;
  cycleId?: string;
  calibrationSessionId?: string;
  type?: PromotionType;
  status?: PromotionDecisionStatus;
  currentRoleId?: string;
  proposedRoleId?: string;
  effectiveDateFrom?: Date;
  effectiveDateTo?: Date;
}

// ============================================================================
// SERVICE
// ============================================================================

export class PromotionService {
  // ==================== Core CRUD ====================

  async createDecision(
    tenantId: string,
    userId: string,
    input: CreatePromotionDecisionInput
  ): Promise<PromotionDecision> {
    // Validate employee exists
    const employee = await prisma.user.findFirst({
      where: {
        id: input.employeeId,
      },
    });

    if (!employee) {
      throw new NotFoundError('Employee', input.employeeId);
    }

    // Resolve role info - support both role IDs and direct title/level input
    let previousRoleId = input.currentRoleId || undefined;
    let newRoleId = input.proposedRoleId || undefined;
    let previousTitle = input.previousTitle || employee.jobTitle || undefined;
    let newTitle = input.newTitle || undefined;
    let previousLevel = input.previousLevel ?? employee.level ?? undefined;
    let newLevel = input.newLevel ?? undefined;

    if (input.currentRoleId) {
      const currentRole = await prisma.role.findFirst({ where: { id: input.currentRoleId } });
      if (currentRole) {
        previousTitle = previousTitle || currentRole.name;
        previousLevel = previousLevel ?? currentRole.level ?? undefined;
      }
    }

    if (input.proposedRoleId) {
      const proposedRole = await prisma.role.findFirst({ where: { id: input.proposedRoleId } });
      if (proposedRole) {
        newTitle = newTitle || proposedRole.name;
        newLevel = newLevel ?? proposedRole.level ?? undefined;
      }
    }

    // Validate cycle if provided
    if (input.cycleId) {
      const cycle = await prisma.reviewCycle.findFirst({ where: { id: input.cycleId } });
      if (!cycle) {
        throw new NotFoundError('Review cycle', input.cycleId);
      }
    }

    // Validate calibration session if provided
    if (input.calibrationSessionId) {
      const session = await prisma.calibrationSession.findFirst({ where: { id: input.calibrationSessionId } });
      if (!session) {
        throw new NotFoundError('Calibration session', input.calibrationSessionId);
      }
    }

    const decision = await prisma.promotionDecision.create({
      data: {
        tenantId,
        employeeId: input.employeeId,
        reviewCycleId: input.cycleId,
        calibrationSessionId: input.calibrationSessionId,
        type: input.type,
        previousRoleId,
        newRoleId,
        previousLevel,
        newLevel,
        previousTitle,
        newTitle,
        effectiveDate: input.effectiveDate,
        justification: input.justification,
        readinessScore: input.readinessScore,
        criteriaScores: input.criteriaScores ?? {},
        status: PromotionDecisionStatus.NOMINATED,
        nominatedById: userId,
        nominatedAt: new Date(),
      },
    });

    auditLogger('PROMOTION_DECISION_CREATED', userId, tenantId, 'promotion_decision', decision.id, {
      employeeId: input.employeeId,
      type: input.type,
      previousTitle,
      newTitle,
    });

    return decision;
  }

  async updateDecision(
    tenantId: string,
    userId: string,
    decisionId: string,
    input: UpdatePromotionDecisionInput
  ): Promise<PromotionDecision> {
    const existing = await prisma.promotionDecision.findFirst({
      where: {
        id: decisionId,
      },
      include: {
        previousRole: true,
      },
    });

    if (!existing) {
      throw new NotFoundError('Promotion decision', decisionId);
    }

    // Cannot update after approval
    if (existing.status === PromotionDecisionStatus.APPROVED ||
        existing.status === PromotionDecisionStatus.IMPLEMENTED) {
      throw new ValidationError('Cannot modify approved or implemented decisions');
    }

    // Capture previous state
    const previousState = {
      newRoleId: existing.newRoleId,
      justification: existing.justification,
      effectiveDate: existing.effectiveDate,
    };

    // Calculate new level if role changed
    let newLevel = existing.newLevel;
    let newTitle = existing.newTitle;
    if (input.proposedRoleId && input.proposedRoleId !== existing.newRoleId) {
      const newRole = await prisma.role.findFirst({
        where: { id: input.proposedRoleId },
      });
      if (!newRole) {
        throw new NotFoundError('Proposed role', input.proposedRoleId);
      }
      newLevel = newRole.level;
      newTitle = newRole.name;
    }

    const decision = await prisma.promotionDecision.update({
      where: { id: decisionId },
      data: {
        ...(input.proposedRoleId !== undefined && { newRoleId: input.proposedRoleId, newLevel, newTitle }),
        ...(input.justification !== undefined && { justification: input.justification }),
        ...(input.effectiveDate !== undefined && { effectiveDate: input.effectiveDate }),
        ...(input.readinessScore !== undefined && { readinessScore: input.readinessScore }),
        ...(input.criteriaScores !== undefined && { criteriaScores: input.criteriaScores }),
      },
    });

    auditLogger('PROMOTION_DECISION_UPDATED', userId, tenantId, 'promotion_decision', decisionId, {
      previousState,
      newState: input,
    });

    return decision;
  }

  async getDecision(
    tenantId: string,
    userId: string,
    decisionId: string
  ): Promise<PromotionDecision> {
    const decision = await prisma.promotionDecision.findFirst({
      where: {
        id: decisionId,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true },
        },
        previousRole: {
          select: { id: true, name: true, description: true },
        },
        newRole: {
          select: { id: true, name: true, description: true },
        },
        reviewCycle: {
          select: { id: true, name: true },
        },
        calibrationSession: {
          select: { id: true, name: true },
        },
        nominatedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        evidenceLinks: {
          include: {
            evidence: {
              select: { id: true, title: true, type: true, impactScore: true },
            },
          },
        },
      },
    });

    if (!decision) {
      throw new NotFoundError('Promotion decision', decisionId);
    }

    return decision;
  }

  async listDecisions(
    tenantId: string,
    userId: string,
    filters: PromotionFilters
  ): Promise<PromotionDecision[]> {
    const where: Record<string, unknown> = { tenantId };

    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.cycleId) where.reviewCycleId = filters.cycleId;
    if (filters.calibrationSessionId) where.calibrationSessionId = filters.calibrationSessionId;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.currentRoleId) where.previousRoleId = filters.currentRoleId;
    if (filters.proposedRoleId) where.newRoleId = filters.proposedRoleId;
    if (filters.effectiveDateFrom || filters.effectiveDateTo) {
      where.effectiveDate = {
        ...(filters.effectiveDateFrom && { gte: filters.effectiveDateFrom }),
        ...(filters.effectiveDateTo && { lte: filters.effectiveDateTo }),
      };
    }

    const decisions = await prisma.promotionDecision.findMany({
      where,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, jobTitle: true, level: true },
        },
        previousRole: {
          select: { id: true, name: true },
        },
        newRole: {
          select: { id: true, name: true },
        },
        nominatedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return decisions;
  }

  // ==================== Workflow ====================

  async startReview(
    tenantId: string,
    userId: string,
    decisionId: string
  ): Promise<PromotionDecision> {
    const existing = await prisma.promotionDecision.findFirst({
      where: {
        id: decisionId,
      },
      include: {
        _count: {
          select: { evidenceLinks: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Promotion decision', decisionId);
    }

    if (existing.status !== PromotionDecisionStatus.NOMINATED) {
      throw new ValidationError('Decision is not in nominated state');
    }

    // Require at least one evidence link
    if (existing._count.evidenceLinks === 0) {
      throw new ValidationError('Promotion decisions require at least one piece of supporting evidence');
    }

    const decision = await prisma.promotionDecision.update({
      where: { id: decisionId },
      data: {
        status: PromotionDecisionStatus.UNDER_REVIEW,
        reviewedAt: new Date(),
        reviewedById: userId,
      },
    });

    auditLogger('PROMOTION_REVIEW_STARTED', userId, tenantId, 'promotion_decision', decisionId, {
      employeeId: existing.employeeId,
    });

    return decision;
  }

  async approve(
    tenantId: string,
    userId: string,
    decisionId: string,
    input: ApprovalInput
  ): Promise<PromotionDecision> {
    const existing = await prisma.promotionDecision.findFirst({
      where: {
        id: decisionId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Promotion decision', decisionId);
    }

    if (existing.status !== PromotionDecisionStatus.UNDER_REVIEW) {
      throw new ValidationError('Decision is not under review');
    }

    // Cannot approve own nomination
    if (existing.nominatedById === userId) {
      throw new ValidationError('Cannot approve your own promotion nomination');
    }

    // Validate adjusted role if provided
    let finalRoleId = existing.newRoleId;
    if (input.adjustedRoleId) {
      const adjustedRole = await prisma.role.findFirst({
        where: { id: input.adjustedRoleId },
      });
      if (!adjustedRole) {
        throw new NotFoundError('Adjusted role', input.adjustedRoleId);
      }
      finalRoleId = input.adjustedRoleId;
    }

    const decision = await prisma.promotionDecision.update({
      where: { id: decisionId },
      data: {
        status: PromotionDecisionStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: userId,
        metadata: { approvalNotes: input.notes },
        newRoleId: finalRoleId,
      },
    });

    auditLogger('PROMOTION_DECISION_APPROVED', userId, tenantId, 'promotion_decision', decisionId, {
      employeeId: existing.employeeId,
      newRoleId: existing.newRoleId,
      finalRoleId,
    });

    return decision;
  }

  async reject(
    tenantId: string,
    userId: string,
    decisionId: string,
    reason: string
  ): Promise<PromotionDecision> {
    const existing = await prisma.promotionDecision.findFirst({
      where: {
        id: decisionId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Promotion decision', decisionId);
    }

    if (existing.status !== PromotionDecisionStatus.UNDER_REVIEW) {
      throw new ValidationError('Decision is not under review');
    }

    const decision = await prisma.promotionDecision.update({
      where: { id: decisionId },
      data: {
        status: PromotionDecisionStatus.REJECTED,
        rejectedAt: new Date(),
        rejectedById: userId,
        rejectionReason: reason,
      },
    });

    auditLogger('PROMOTION_DECISION_REJECTED', userId, tenantId, 'promotion_decision', decisionId, {
      employeeId: existing.employeeId,
      reason,
    });

    return decision;
  }

  async defer(
    tenantId: string,
    userId: string,
    decisionId: string,
    reason: string,
    deferUntil?: Date
  ): Promise<PromotionDecision> {
    const existing = await prisma.promotionDecision.findFirst({
      where: {
        id: decisionId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Promotion decision', decisionId);
    }

    if (existing.status !== PromotionDecisionStatus.UNDER_REVIEW) {
      throw new ValidationError('Decision is not under review');
    }

    const decision = await prisma.promotionDecision.update({
      where: { id: decisionId },
      data: {
        status: PromotionDecisionStatus.DEFERRED,
        deferralReason: reason,
        deferredUntil: deferUntil,
      },
    });

    auditLogger('PROMOTION_DECISION_DEFERRED', userId, tenantId, 'promotion_decision', decisionId, {
      employeeId: existing.employeeId,
      reason,
      deferUntil,
    });

    return decision;
  }

  async implement(
    tenantId: string,
    userId: string,
    decisionId: string
  ): Promise<PromotionDecision> {
    const existing = await prisma.promotionDecision.findFirst({
      where: {
        id: decisionId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Promotion decision', decisionId);
    }

    if (existing.status !== PromotionDecisionStatus.APPROVED) {
      throw new ValidationError('Only approved decisions can be implemented');
    }

    // Update the employee's role
    await prisma.user.update({
      where: { id: existing.employeeId },
      data: {
        // Note: This assumes there's a roleId field on User
        // Adjust based on actual schema
      },
    });

    const decision = await prisma.promotionDecision.update({
      where: { id: decisionId },
      data: {
        status: PromotionDecisionStatus.IMPLEMENTED,
        implementedAt: new Date(),
        implementedById: userId,
      },
    });

    auditLogger('PROMOTION_DECISION_IMPLEMENTED', userId, tenantId, 'promotion_decision', decisionId, {
      employeeId: existing.employeeId,
      newRoleId: existing.newRoleId,
      effectiveDate: existing.effectiveDate,
    });

    return decision;
  }

  // ==================== Evidence Linking ====================

  async linkEvidence(
    tenantId: string,
    userId: string,
    input: LinkEvidenceInput
  ): Promise<DecisionEvidence> {
    // Validate decision exists
    const decision = await prisma.promotionDecision.findFirst({
      where: {
        id: input.decisionId,
      },
    });

    if (!decision) {
      throw new NotFoundError('Promotion decision', input.decisionId);
    }

    // Validate evidence exists
    const evidence = await prisma.evidence.findFirst({
      where: {
        id: input.evidenceId,
      },
    });

    if (!evidence) {
      throw new NotFoundError('Evidence', input.evidenceId);
    }

    // Evidence must belong to the decision's employee
    if (evidence.employeeId !== decision.employeeId) {
      throw new ValidationError('Evidence must belong to the decision subject');
    }

    // Check if already linked
    const existingLink = await prisma.decisionEvidence.findFirst({
      where: {
        evidenceId: input.evidenceId,
        promotionDecisionId: input.decisionId,
      },
    });

    if (existingLink) {
      throw new ValidationError('Evidence is already linked to this decision');
    }

    const link = await prisma.decisionEvidence.create({
      data: {
        evidenceId: input.evidenceId,
        promotionDecisionId: input.decisionId,
        weight: input.weight ?? 1.0,
        relevanceScore: input.relevanceScore,
        linkedById: userId,
        notes: input.notes,
      },
    });

    auditLogger('PROMOTION_EVIDENCE_LINKED', userId, tenantId, 'decision_evidence', link.id, {
      decisionId: input.decisionId,
      evidenceId: input.evidenceId,
    });

    return link;
  }

  async unlinkEvidence(
    tenantId: string,
    userId: string,
    decisionId: string,
    evidenceId: string
  ): Promise<void> {
    const link = await prisma.decisionEvidence.findFirst({
      where: {
        evidenceId,
        promotionDecisionId: decisionId,
      },
    });

    if (!link) {
      throw new NotFoundError('Evidence link', `${decisionId}-${evidenceId}`);
    }

    await prisma.decisionEvidence.delete({
      where: { id: link.id },
    });

    auditLogger('PROMOTION_EVIDENCE_UNLINKED', userId, tenantId, 'decision_evidence', link.id, {
      decisionId,
      evidenceId,
    });
  }

  // ==================== Analytics ====================

  async getPromotionSummary(
    tenantId: string,
    cycleId?: string
  ): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    byLevel: Record<number, number>;
    averageReadinessScore: number | null;
    averageTimeToDecision: number | null;
  }> {
    const where: Record<string, unknown> = { tenantId };

    if (cycleId) {
      where.reviewCycleId = cycleId;
    }

    const decisions = await prisma.promotionDecision.findMany({
      where,
    });

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byLevel: Record<number, number> = {};
    let readinessSum = 0, readinessCount = 0;
    let timeSum = 0, timeCount = 0;

    for (const d of decisions) {
      byType[d.type] = (byType[d.type] || 0) + 1;
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;

      const levelChange = (d.newLevel ?? 0) - (d.previousLevel ?? 0);
      if (d.newLevel !== null && d.previousLevel !== null) {
        byLevel[levelChange] = (byLevel[levelChange] || 0) + 1;
      }

      if (d.readinessScore !== null) {
        readinessSum += d.readinessScore;
        readinessCount++;
      }

      if (d.approvedAt && d.nominatedAt) {
        const timeDiff = d.approvedAt.getTime() - d.nominatedAt.getTime();
        timeSum += timeDiff / (1000 * 60 * 60 * 24); // Convert to days
        timeCount++;
      }
    }

    return {
      total: decisions.length,
      byType,
      byStatus,
      byLevel,
      averageReadinessScore: readinessCount > 0 ? readinessSum / readinessCount : null,
      averageTimeToDecision: timeCount > 0 ? timeSum / timeCount : null,
    };
  }
}

export const promotionService = new PromotionService();
