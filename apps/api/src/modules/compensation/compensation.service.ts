// @ts-nocheck
/**
 * Compensation Service
 *
 * Enterprise-grade compensation decision management with full audit trail.
 * All decisions must be linked to evidence for defensibility.
 */

import {
  prisma,
  type CompensationDecision,
  type DecisionEvidence,
  CompensationType,
  CompensationDecisionStatus,
} from '@pms/database';

import { auditLogger } from '../../utils/logger';
import { NotFoundError, ValidationError, AuthorizationError } from '../../utils/errors';

// ============================================================================
// TYPES
// ============================================================================

interface CreateCompensationDecisionInput {
  employeeId: string;
  reviewCycleId?: string;
  type: CompensationType;
  previousAmount: number;
  newAmount: number;
  currency: string;
  effectiveDate: Date;
  reason: string;
  justification?: string;
  performanceRating?: number;
  marketData?: Record<string, unknown>;
  equityAnalysis?: Record<string, unknown>;
}

interface UpdateCompensationDecisionInput {
  newAmount?: number;
  reason?: string;
  effectiveDate?: Date;
  marketData?: Record<string, unknown>;
}

interface ApprovalInput {
  notes?: string;
  adjustedAmount?: number;
}

interface LinkEvidenceInput {
  decisionId: string;
  evidenceId: string;
  weight?: number;
  relevanceScore?: number;
  notes?: string;
}

interface CompensationFilters {
  employeeId?: string;
  reviewCycleId?: string;
  type?: CompensationType;
  status?: CompensationDecisionStatus;
  minAmount?: number;
  maxAmount?: number;
  effectiveDateFrom?: Date;
  effectiveDateTo?: Date;
}

// ============================================================================
// SERVICE
// ============================================================================

export class CompensationService {
  // ==================== Core CRUD ====================

  async createDecision(
    tenantId: string,
    userId: string,
    input: CreateCompensationDecisionInput
  ): Promise<CompensationDecision> {
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

    // Validate cycle if provided
    if (input.reviewCycleId) {
      const cycle = await prisma.reviewCycle.findFirst({
        where: {
          id: input.reviewCycleId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!cycle) {
        throw new NotFoundError('Review cycle', input.reviewCycleId);
      }
    }

    // Calculate change amount and percentage
    const changeAmount = input.newAmount - input.previousAmount;
    const changePercent = input.previousAmount > 0
      ? ((input.newAmount - input.previousAmount) / input.previousAmount) * 100
      : 0;

    const decision = await prisma.compensationDecision.create({
      data: {
        tenantId,
        employeeId: input.employeeId,
        reviewCycleId: input.reviewCycleId,
        type: input.type,
        previousAmount: input.previousAmount,
        newAmount: input.newAmount,
        changeAmount,
        changePercent,
        currency: input.currency,
        effectiveDate: input.effectiveDate,
        reason: input.reason,
        justification: input.justification,
        performanceRating: input.performanceRating,
        marketData: input.marketData ?? {},
        equityAnalysis: input.equityAnalysis,
        status: CompensationDecisionStatus.DRAFT,
        proposedById: userId,
      },
    });

    auditLogger('COMPENSATION_DECISION_CREATED', userId, tenantId, 'compensation_decision', decision.id, {
      employeeId: input.employeeId,
      type: input.type,
      previousAmount: input.previousAmount,
      newAmount: input.newAmount,
      changePercent,
    });

    return decision;
  }

  async updateDecision(
    tenantId: string,
    userId: string,
    decisionId: string,
    input: UpdateCompensationDecisionInput
  ): Promise<CompensationDecision> {
    const existing = await prisma.compensationDecision.findFirst({
      where: {
        id: decisionId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Compensation decision', decisionId);
    }

    // Cannot update after approval
    if (existing.status === CompensationDecisionStatus.APPROVED ||
        existing.status === CompensationDecisionStatus.IMPLEMENTED) {
      throw new ValidationError('Cannot modify approved or implemented decisions');
    }

    // Capture previous state
    const previousState = {
      newAmount: existing.newAmount,
      reason: existing.reason,
      effectiveDate: existing.effectiveDate,
    };

    // Recalculate change values if amount changed
    let changeAmount = existing.changeAmount;
    let changePercent = existing.changePercent;
    if (input.newAmount !== undefined && existing.previousAmount > 0) {
      changeAmount = input.newAmount - existing.previousAmount;
      changePercent = ((input.newAmount - existing.previousAmount) / existing.previousAmount) * 100;
    }

    const decision = await prisma.compensationDecision.update({
      where: { id: decisionId },
      data: {
        ...(input.newAmount !== undefined && { newAmount: input.newAmount, changeAmount, changePercent }),
        ...(input.reason !== undefined && { reason: input.reason }),
        ...(input.effectiveDate !== undefined && { effectiveDate: input.effectiveDate }),
        ...(input.marketData !== undefined && { marketData: input.marketData }),
      },
    });

    auditLogger('COMPENSATION_DECISION_UPDATED', userId, tenantId, 'compensation_decision', decisionId, {
      previousState,
      newState: input,
    });

    return decision;
  }

  async getDecision(
    tenantId: string,
    userId: string,
    decisionId: string
  ): Promise<CompensationDecision> {
    const decision = await prisma.compensationDecision.findFirst({
      where: {
        id: decisionId,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true },
        },
        reviewCycle: {
          select: { id: true, name: true },
        },
        proposedBy: {
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
      throw new NotFoundError('Compensation decision', decisionId);
    }

    return decision;
  }

  async listDecisions(
    tenantId: string,
    userId: string,
    filters: CompensationFilters
  ): Promise<CompensationDecision[]> {
    const where: Record<string, unknown> = { tenantId };

    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.reviewCycleId) where.reviewCycleId = filters.reviewCycleId;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      where.newAmount = {
        ...(filters.minAmount !== undefined && { gte: filters.minAmount }),
        ...(filters.maxAmount !== undefined && { lte: filters.maxAmount }),
      };
    }
    if (filters.effectiveDateFrom || filters.effectiveDateTo) {
      where.effectiveDate = {
        ...(filters.effectiveDateFrom && { gte: filters.effectiveDateFrom }),
        ...(filters.effectiveDateTo && { lte: filters.effectiveDateTo }),
      };
    }

    const decisions = await prisma.compensationDecision.findMany({
      where,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, jobTitle: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return decisions;
  }

  // ==================== Workflow ====================

  async submitForApproval(
    tenantId: string,
    userId: string,
    decisionId: string
  ): Promise<CompensationDecision> {
    const existing = await prisma.compensationDecision.findFirst({
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
      throw new NotFoundError('Compensation decision', decisionId);
    }

    if (existing.status !== CompensationDecisionStatus.DRAFT) {
      throw new ValidationError('Decision has already been submitted');
    }

    // Require at least one evidence link
    if (existing._count.evidenceLinks === 0) {
      throw new ValidationError('Compensation decisions require at least one piece of supporting evidence');
    }

    const decision = await prisma.compensationDecision.update({
      where: { id: decisionId },
      data: {
        status: CompensationDecisionStatus.PENDING_APPROVAL,
      },
    });

    auditLogger('COMPENSATION_DECISION_SUBMITTED', userId, tenantId, 'compensation_decision', decisionId, {
      newAmount: decision.newAmount,
      changePercent: decision.changePercent,
    });

    return decision;
  }

  async approve(
    tenantId: string,
    userId: string,
    decisionId: string,
    input: ApprovalInput
  ): Promise<CompensationDecision> {
    const existing = await prisma.compensationDecision.findFirst({
      where: {
        id: decisionId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Compensation decision', decisionId);
    }

    if (existing.status !== CompensationDecisionStatus.PENDING_APPROVAL) {
      throw new ValidationError('Decision is not pending approval');
    }

    // Cannot approve own decision
    if (existing.proposedById === userId) {
      throw new ValidationError('Cannot approve your own compensation decision');
    }

    // If amount was adjusted, recalculate change values
    const finalAmount = input.adjustedAmount ?? existing.newAmount;
    const changeAmount = finalAmount - existing.previousAmount;
    const changePercent = existing.previousAmount > 0
      ? ((finalAmount - existing.previousAmount) / existing.previousAmount) * 100
      : 0;

    const decision = await prisma.compensationDecision.update({
      where: { id: decisionId },
      data: {
        status: CompensationDecisionStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: userId,
        newAmount: finalAmount,
        changeAmount,
        changePercent,
      },
    });

    auditLogger('COMPENSATION_DECISION_APPROVED', userId, tenantId, 'compensation_decision', decisionId, {
      originalNewAmount: existing.newAmount,
      finalAmount,
      adjustedBy: input.adjustedAmount ? finalAmount - existing.newAmount : 0,
    });

    return decision;
  }

  async reject(
    tenantId: string,
    userId: string,
    decisionId: string,
    reason: string
  ): Promise<CompensationDecision> {
    const existing = await prisma.compensationDecision.findFirst({
      where: {
        id: decisionId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Compensation decision', decisionId);
    }

    if (existing.status !== CompensationDecisionStatus.PENDING_APPROVAL) {
      throw new ValidationError('Decision is not pending approval');
    }

    const decision = await prisma.compensationDecision.update({
      where: { id: decisionId },
      data: {
        status: CompensationDecisionStatus.REJECTED,
        rejectedAt: new Date(),
        rejectedById: userId,
        rejectionReason: reason,
      },
    });

    auditLogger('COMPENSATION_DECISION_REJECTED', userId, tenantId, 'compensation_decision', decisionId, {
      reason,
    });

    return decision;
  }

  async implement(
    tenantId: string,
    userId: string,
    decisionId: string
  ): Promise<CompensationDecision> {
    const existing = await prisma.compensationDecision.findFirst({
      where: {
        id: decisionId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Compensation decision', decisionId);
    }

    if (existing.status !== CompensationDecisionStatus.APPROVED) {
      throw new ValidationError('Only approved decisions can be implemented');
    }

    const decision = await prisma.compensationDecision.update({
      where: { id: decisionId },
      data: {
        status: CompensationDecisionStatus.IMPLEMENTED,
        implementedAt: new Date(),
        implementedById: userId,
      },
    });

    auditLogger('COMPENSATION_DECISION_IMPLEMENTED', userId, tenantId, 'compensation_decision', decisionId, {
      employeeId: existing.employeeId,
      newAmount: existing.newAmount,
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
    const decision = await prisma.compensationDecision.findFirst({
      where: {
        id: input.decisionId,
      },
    });

    if (!decision) {
      throw new NotFoundError('Compensation decision', input.decisionId);
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
        compensationDecisionId: input.decisionId,
      },
    });

    if (existingLink) {
      throw new ValidationError('Evidence is already linked to this decision');
    }

    const link = await prisma.decisionEvidence.create({
      data: {
        evidenceId: input.evidenceId,
        compensationDecisionId: input.decisionId,
        weight: input.weight ?? 1.0,
        relevanceScore: input.relevanceScore,
        linkedById: userId,
        notes: input.notes,
      },
    });

    auditLogger('COMPENSATION_EVIDENCE_LINKED', userId, tenantId, 'decision_evidence', link.id, {
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
        compensationDecisionId: decisionId,
      },
    });

    if (!link) {
      throw new NotFoundError('Evidence link', `${decisionId}-${evidenceId}`);
    }

    await prisma.decisionEvidence.delete({
      where: { id: link.id },
    });

    auditLogger('COMPENSATION_EVIDENCE_UNLINKED', userId, tenantId, 'decision_evidence', link.id, {
      decisionId,
      evidenceId,
    });
  }

  // ==================== Analytics ====================

  async getBudgetSummary(
    tenantId: string,
    reviewCycleId?: string
  ): Promise<{
    totalPreviousCost: number;
    totalNewCost: number;
    averageIncrease: number;
    byType: Record<string, { count: number; totalAmount: number }>;
    byStatus: Record<string, number>;
  }> {
    const where: Record<string, unknown> = { tenantId };

    if (reviewCycleId) {
      where.reviewCycleId = reviewCycleId;
    }

    const decisions = await prisma.compensationDecision.findMany({
      where,
    });

    let totalPreviousCost = 0;
    let totalNewCost = 0;
    let increaseSum = 0;
    let increaseCount = 0;
    const byType: Record<string, { count: number; totalAmount: number }> = {};
    const byStatus: Record<string, number> = {};

    for (const d of decisions) {
      totalPreviousCost += d.previousAmount;
      totalNewCost += d.newAmount;

      if (d.changePercent) {
        increaseSum += d.changePercent;
        increaseCount++;
      }

      byType[d.type] = byType[d.type] || { count: 0, totalAmount: 0 };
      byType[d.type].count++;
      byType[d.type].totalAmount += d.newAmount;

      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
    }

    return {
      totalPreviousCost,
      totalNewCost,
      averageIncrease: increaseCount > 0 ? increaseSum / increaseCount : 0,
      byType,
      byStatus,
    };
  }
}

export const compensationService = new CompensationService();
