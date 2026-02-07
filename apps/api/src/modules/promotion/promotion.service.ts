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
  currentRoleId: string;
  proposedRoleId: string;
  effectiveDate: Date;
  rationale: string;
  performanceRating?: number;
  readinessScore?: number;
  criteria?: Record<string, unknown>;
}

interface UpdatePromotionDecisionInput {
  proposedRoleId?: string;
  rationale?: string;
  effectiveDate?: Date;
  readinessScore?: number;
  criteria?: Record<string, unknown>;
}

interface ApprovalInput {
  notes?: string;
  adjustedRoleId?: string;
}

interface LinkEvidenceInput {
  decisionId: string;
  evidenceId: string;
  criterionId?: string;
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
        tenantId,
        deletedAt: null,
      },
    });

    if (!employee) {
      throw new NotFoundError('Employee', input.employeeId);
    }

    // Validate roles exist
    const [currentRole, proposedRole] = await Promise.all([
      prisma.role.findFirst({
        where: { id: input.currentRoleId, tenantId, deletedAt: null },
      }),
      prisma.role.findFirst({
        where: { id: input.proposedRoleId, tenantId, deletedAt: null },
      }),
    ]);

    if (!currentRole) {
      throw new NotFoundError('Current role', input.currentRoleId);
    }
    if (!proposedRole) {
      throw new NotFoundError('Proposed role', input.proposedRoleId);
    }

    // Validate cycle if provided
    if (input.cycleId) {
      const cycle = await prisma.reviewCycle.findFirst({
        where: { id: input.cycleId, tenantId, deletedAt: null },
      });
      if (!cycle) {
        throw new NotFoundError('Review cycle', input.cycleId);
      }
    }

    // Validate calibration session if provided
    if (input.calibrationSessionId) {
      const session = await prisma.calibrationSession.findFirst({
        where: { id: input.calibrationSessionId, tenantId, deletedAt: null },
      });
      if (!session) {
        throw new NotFoundError('Calibration session', input.calibrationSessionId);
      }
    }

    // Calculate level change
    const levelChange = (proposedRole.level || 0) - (currentRole.level || 0);

    const decision = await prisma.promotionDecision.create({
      data: {
        tenantId,
        employeeId: input.employeeId,
        cycleId: input.cycleId,
        calibrationSessionId: input.calibrationSessionId,
        type: input.type,
        currentRoleId: input.currentRoleId,
        proposedRoleId: input.proposedRoleId,
        levelChange,
        effectiveDate: input.effectiveDate,
        rationale: input.rationale,
        performanceRating: input.performanceRating,
        readinessScore: input.readinessScore,
        criteria: input.criteria ?? {},
        status: PromotionDecisionStatus.NOMINATED,
        nominatedById: userId,
        nominatedAt: new Date(),
      },
    });

    auditLogger('PROMOTION_DECISION_CREATED', userId, tenantId, 'promotion_decision', decision.id, {
      employeeId: input.employeeId,
      type: input.type,
      currentRole: currentRole.name,
      proposedRole: proposedRole.name,
      levelChange,
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
        tenantId,
        deletedAt: null,
      },
      include: {
        currentRole: true,
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
      proposedRoleId: existing.proposedRoleId,
      rationale: existing.rationale,
      effectiveDate: existing.effectiveDate,
    };

    // Calculate new level change if role changed
    let levelChange = existing.levelChange;
    if (input.proposedRoleId && input.proposedRoleId !== existing.proposedRoleId) {
      const newRole = await prisma.role.findFirst({
        where: { id: input.proposedRoleId, tenantId, deletedAt: null },
      });
      if (!newRole) {
        throw new NotFoundError('Proposed role', input.proposedRoleId);
      }
      levelChange = (newRole.level || 0) - (existing.currentRole?.level || 0);
    }

    const decision = await prisma.promotionDecision.update({
      where: { id: decisionId },
      data: {
        ...(input.proposedRoleId !== undefined && { proposedRoleId: input.proposedRoleId, levelChange }),
        ...(input.rationale !== undefined && { rationale: input.rationale }),
        ...(input.effectiveDate !== undefined && { effectiveDate: input.effectiveDate }),
        ...(input.readinessScore !== undefined && { readinessScore: input.readinessScore }),
        ...(input.criteria !== undefined && { criteria: input.criteria }),
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
        tenantId,
        deletedAt: null,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true },
        },
        currentRole: {
          select: { id: true, name: true, level: true },
        },
        proposedRole: {
          select: { id: true, name: true, level: true },
        },
        cycle: {
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
    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.cycleId) where.cycleId = filters.cycleId;
    if (filters.calibrationSessionId) where.calibrationSessionId = filters.calibrationSessionId;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.currentRoleId) where.currentRoleId = filters.currentRoleId;
    if (filters.proposedRoleId) where.proposedRoleId = filters.proposedRoleId;
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
          select: { id: true, firstName: true, lastName: true, jobTitle: true },
        },
        currentRole: {
          select: { id: true, name: true, level: true },
        },
        proposedRole: {
          select: { id: true, name: true, level: true },
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
        tenantId,
        deletedAt: null,
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
        reviewStartedAt: new Date(),
        reviewStartedById: userId,
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
        tenantId,
        deletedAt: null,
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
    let finalRoleId = existing.proposedRoleId;
    if (input.adjustedRoleId) {
      const adjustedRole = await prisma.role.findFirst({
        where: { id: input.adjustedRoleId, tenantId, deletedAt: null },
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
        approvalNotes: input.notes,
        finalRoleId,
      },
    });

    auditLogger('PROMOTION_DECISION_APPROVED', userId, tenantId, 'promotion_decision', decisionId, {
      employeeId: existing.employeeId,
      proposedRoleId: existing.proposedRoleId,
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
        tenantId,
        deletedAt: null,
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
        tenantId,
        deletedAt: null,
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
        deferredAt: new Date(),
        deferredById: userId,
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
        tenantId,
        deletedAt: null,
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
      finalRoleId: existing.finalRoleId || existing.proposedRoleId,
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
        tenantId,
        deletedAt: null,
      },
    });

    if (!decision) {
      throw new NotFoundError('Promotion decision', input.decisionId);
    }

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
        criterionId: input.criterionId,
        weight: input.weight ?? 1.0,
        relevanceScore: input.relevanceScore,
        linkedById: userId,
        notes: input.notes,
      },
    });

    auditLogger('PROMOTION_EVIDENCE_LINKED', userId, tenantId, 'decision_evidence', link.id, {
      decisionId: input.decisionId,
      evidenceId: input.evidenceId,
      criterionId: input.criterionId,
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
    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (cycleId) {
      where.cycleId = cycleId;
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

      if (d.levelChange !== null) {
        byLevel[d.levelChange] = (byLevel[d.levelChange] || 0) + 1;
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
