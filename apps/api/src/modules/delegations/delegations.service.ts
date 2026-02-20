import { prisma } from '../../lib/prisma';
import { auditLogger } from '../../utils/logger';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';

interface CreateDelegationInput {
  delegatorId: string;
  delegateId: string;
  type: string;
  scope?: Record<string, unknown>;
  reason?: string;
  startDate: string;
  endDate?: string;
}

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
  jobTitle: true,
};

class DelegationsService {
  /**
   * List delegations for a tenant with optional filters.
   * Lazily expires overdue delegations before returning results.
   */
  async listDelegations(
    tenantId: string,
    filters: { status?: string; type?: string; userId?: string }
  ) {
    // Lazily expire overdue delegations first
    await this.expireOverdueDelegations(tenantId);

    const where: Record<string, unknown> = { tenantId };

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.type) {
      where.type = filters.type as any;
    }
    if (filters.userId) {
      where.OR = [
        { delegatorId: filters.userId },
        { delegateId: filters.userId },
      ];
    }

    const delegations = await (prisma.delegation as any).findMany({
      where,
      include: {
        delegator: { select: userSelect },
        delegate: { select: userSelect },
        approvedBy: { select: userSelect },
        revokedBy: { select: userSelect },
      },
      orderBy: { createdAt: 'desc' },
    });

    return delegations;
  }

  /**
   * Get a single delegation by ID with user info.
   */
  async getDelegation(tenantId: string, delegationId: string) {
    const delegation = await (prisma.delegation as any).findFirst({
      where: { id: delegationId, tenantId },
      include: {
        delegator: { select: userSelect },
        delegate: { select: userSelect },
        approvedBy: { select: userSelect },
        revokedBy: { select: userSelect },
      },
    });

    if (!delegation) {
      throw new NotFoundError('Delegation', delegationId);
    }

    return delegation;
  }

  /**
   * Create a new delegation with PENDING status.
   */
  async createDelegation(
    tenantId: string,
    creatorId: string,
    input: CreateDelegationInput
  ) {
    // Verify delegator exists in the same tenant
    const delegator = await prisma.user.findFirst({
      where: { id: input.delegatorId, tenantId, isActive: true, deletedAt: null },
    });
    if (!delegator) {
      throw new NotFoundError('Delegator user', input.delegatorId);
    }

    // Verify delegate exists in the same tenant
    const delegate = await prisma.user.findFirst({
      where: { id: input.delegateId, tenantId, isActive: true, deletedAt: null },
    });
    if (!delegate) {
      throw new NotFoundError('Delegate user', input.delegateId);
    }

    // Delegator and delegate must be different users
    if (input.delegatorId === input.delegateId) {
      throw new ValidationError('Delegator and delegate must be different users');
    }

    const delegation = await (prisma.delegation as any).create({
      data: {
        tenantId,
        delegatorId: input.delegatorId,
        delegateId: input.delegateId,
        type: input.type as any,
        status: 'PENDING',
        scope: input.scope ?? {},
        reason: input.reason,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
      },
      include: {
        delegator: { select: userSelect },
        delegate: { select: userSelect },
      },
    });

    auditLogger(
      'DELEGATION_CREATED',
      creatorId,
      tenantId,
      'delegation',
      delegation.id,
      {
        delegatorId: input.delegatorId,
        delegateId: input.delegateId,
        type: (delegation as any).type,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
      }
    );

    return delegation;
  }

  /**
   * Approve a PENDING delegation, transitioning it to ACTIVE.
   */
  async approveDelegation(
    tenantId: string,
    approverId: string,
    delegationId: string
  ) {
    const delegation = await (prisma.delegation as any).findFirst({
      where: { id: delegationId, tenantId },
    });

    if (!delegation) {
      throw new NotFoundError('Delegation', delegationId);
    }

    if ((delegation as any).status !== 'PENDING') {
      throw new ConflictError(
        `Cannot approve delegation with status "${(delegation as any).status}". Only PENDING delegations can be approved.`
      );
    }

    const updated = await (prisma.delegation as any).update({
      where: { id: delegationId },
      data: {
        status: 'ACTIVE',
        approvedById: approverId,
        approvedAt: new Date(),
      },
      include: {
        delegator: { select: userSelect },
        delegate: { select: userSelect },
        approvedBy: { select: userSelect },
      },
    });

    auditLogger(
      'DELEGATION_APPROVED',
      approverId,
      tenantId,
      'delegation',
      delegationId,
      {
        delegatorId: (delegation as any).delegatorId,
        delegateId: (delegation as any).delegateId,
        type: (delegation as any).type,
      }
    );

    return updated;
  }

  /**
   * Reject a PENDING delegation, transitioning it to REVOKED.
   */
  async rejectDelegation(
    tenantId: string,
    rejecterId: string,
    delegationId: string,
    reason?: string
  ) {
    const delegation = await (prisma.delegation as any).findFirst({
      where: { id: delegationId, tenantId },
    });

    if (!delegation) {
      throw new NotFoundError('Delegation', delegationId);
    }

    if ((delegation as any).status !== 'PENDING') {
      throw new ConflictError(
        `Cannot reject delegation with status "${(delegation as any).status}". Only PENDING delegations can be rejected.`
      );
    }

    const updated = await (prisma.delegation as any).update({
      where: { id: delegationId },
      data: {
        status: 'REVOKED',
        revokedById: rejecterId,
        revokedAt: new Date(),
        revokeReason: reason ?? null,
      },
      include: {
        delegator: { select: userSelect },
        delegate: { select: userSelect },
        revokedBy: { select: userSelect },
      },
    });

    auditLogger(
      'DELEGATION_REJECTED',
      rejecterId,
      tenantId,
      'delegation',
      delegationId,
      {
        delegatorId: (delegation as any).delegatorId,
        delegateId: (delegation as any).delegateId,
        type: (delegation as any).type,
        reason: reason ?? null,
      }
    );

    return updated;
  }

  /**
   * Revoke an ACTIVE delegation.
   */
  async revokeDelegation(
    tenantId: string,
    revokerId: string,
    delegationId: string,
    reason?: string
  ) {
    const delegation = await (prisma.delegation as any).findFirst({
      where: { id: delegationId, tenantId },
    });

    if (!delegation) {
      throw new NotFoundError('Delegation', delegationId);
    }

    if ((delegation as any).status !== 'ACTIVE') {
      throw new ConflictError(
        `Cannot revoke delegation with status "${(delegation as any).status}". Only ACTIVE delegations can be revoked.`
      );
    }

    const updated = await (prisma.delegation as any).update({
      where: { id: delegationId },
      data: {
        status: 'REVOKED',
        revokedById: revokerId,
        revokedAt: new Date(),
        revokeReason: reason ?? null,
      },
      include: {
        delegator: { select: userSelect },
        delegate: { select: userSelect },
        revokedBy: { select: userSelect },
      },
    });

    auditLogger(
      'DELEGATION_REVOKED',
      revokerId,
      tenantId,
      'delegation',
      delegationId,
      {
        delegatorId: (delegation as any).delegatorId,
        delegateId: (delegation as any).delegateId,
        type: (delegation as any).type,
        reason: reason ?? null,
      }
    );

    return updated;
  }

  /**
   * Get audit trail for a specific delegation.
   */
  async getDelegationAudit(tenantId: string, delegationId: string) {
    // Verify delegation exists
    const delegation = await (prisma.delegation as any).findFirst({
      where: { id: delegationId, tenantId },
    });

    if (!delegation) {
      throw new NotFoundError('Delegation', delegationId);
    }

    const auditEvents = await prisma.auditEvent.findMany({
      where: {
        tenantId,
        entityType: 'delegation',
        entityId: delegationId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return auditEvents;
  }

  /**
   * Expire ACTIVE delegations whose endDate has passed.
   * Called lazily before listing delegations.
   */
  private async expireOverdueDelegations(tenantId: string) {
    const now = new Date();

    await (prisma.delegation as any).updateMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        endDate: { lt: now, not: null },
      },
      data: {
        status: 'EXPIRED',
      },
    });
  }
}

export const delegationsService = new DelegationsService();
