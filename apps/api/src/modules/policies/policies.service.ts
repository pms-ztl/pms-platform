import { prisma } from '../../lib/prisma';
import { auditLogger, logger } from '../../utils/logger';
import { NotFoundError, ValidationError } from '../../utils/errors';

interface CreatePolicyInput {
  name: string;
  description?: string;
  type: string;
  priority?: number;
  conditions?: Record<string, unknown>;
  actions?: Record<string, unknown>;
  effect?: string;
  targetRoles?: string[];
  targetDepartments?: string[];
  targetTeams?: string[];
  targetLevels?: number[];
  unionCode?: string;
  contractType?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}

interface UpdatePolicyInput {
  name?: string;
  description?: string;
  type?: string;
  priority?: number;
  conditions?: Record<string, unknown>;
  actions?: Record<string, unknown>;
  effect?: string;
  targetRoles?: string[];
  targetDepartments?: string[];
  targetTeams?: string[];
  targetLevels?: number[];
  unionCode?: string;
  contractType?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}

interface SimulateInput {
  userId: string;
  resource: string;
  action: string;
}

export class PoliciesService {
  /**
   * List policies for a tenant with optional type/status filters.
   */
  async listPolicies(
    tenantId: string,
    filters: { type?: string; status?: string }
  ) {
    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    const policies = await (prisma as any).accessPolicy.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return policies;
  }

  /**
   * Get a single policy by ID.
   */
  async getPolicy(tenantId: string, policyId: string) {
    const policy = await (prisma as any).accessPolicy.findFirst({
      where: {
        id: policyId,
        tenantId,
        deletedAt: null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!policy) {
      throw new NotFoundError('AccessPolicy', policyId);
    }

    return policy;
  }

  /**
   * Create a new policy in DRAFT status.
   */
  async createPolicy(
    tenantId: string,
    creatorId: string,
    input: CreatePolicyInput
  ) {
    const policy = await (prisma as any).accessPolicy.create({
      data: {
        tenantId,
        createdById: creatorId,
        name: input.name,
        description: input.description,
        type: input.type,
        status: 'DRAFT',
        priority: input.priority ?? 0,
        conditions: input.conditions ?? {},
        actions: input.actions ?? {},
        effect: input.effect ?? 'ALLOW',
        targetRoles: input.targetRoles ?? [],
        targetDepartments: input.targetDepartments ?? [],
        targetTeams: input.targetTeams ?? [],
        targetLevels: input.targetLevels ?? [],
        unionCode: input.unionCode,
        contractType: input.contractType,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    auditLogger(
      'POLICY_CREATED',
      creatorId,
      tenantId,
      'AccessPolicy',
      policy.id,
      { name: input.name, type: input.type }
    );

    return policy;
  }

  /**
   * Update an existing non-deleted policy.
   */
  async updatePolicy(
    tenantId: string,
    updaterId: string,
    policyId: string,
    input: UpdatePolicyInput
  ) {
    // Verify it exists and belongs to tenant
    const existing = await (prisma as any).accessPolicy.findFirst({
      where: { id: policyId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('AccessPolicy', policyId);
    }

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.type !== undefined) data.type = input.type;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.conditions !== undefined) data.conditions = input.conditions;
    if (input.actions !== undefined) data.actions = input.actions;
    if (input.effect !== undefined) data.effect = input.effect;
    if (input.targetRoles !== undefined) data.targetRoles = input.targetRoles;
    if (input.targetDepartments !== undefined) data.targetDepartments = input.targetDepartments;
    if (input.targetTeams !== undefined) data.targetTeams = input.targetTeams;
    if (input.targetLevels !== undefined) data.targetLevels = input.targetLevels;
    if (input.unionCode !== undefined) data.unionCode = input.unionCode;
    if (input.contractType !== undefined) data.contractType = input.contractType;
    if (input.effectiveFrom !== undefined) data.effectiveFrom = input.effectiveFrom;
    if (input.effectiveTo !== undefined) data.effectiveTo = input.effectiveTo;

    const policy = await (prisma as any).accessPolicy.update({
      where: { id: policyId },
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    auditLogger(
      'POLICY_UPDATED',
      updaterId,
      tenantId,
      'AccessPolicy',
      policyId,
      { updatedFields: Object.keys(data) }
    );

    return policy;
  }

  /**
   * Activate a DRAFT policy (DRAFT -> ACTIVE).
   * Sets approvedById and approvedAt.
   */
  async activatePolicy(tenantId: string, adminId: string, policyId: string) {
    const existing = await (prisma as any).accessPolicy.findFirst({
      where: { id: policyId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('AccessPolicy', policyId);
    }

    if (existing.status !== 'DRAFT') {
      throw new ValidationError(
        `Cannot activate policy with status "${existing.status}". Only DRAFT policies can be activated.`
      );
    }

    const policy = await (prisma as any).accessPolicy.update({
      where: { id: policyId },
      data: {
        status: 'ACTIVE',
        approvedById: adminId,
        approvedAt: new Date(),
      },
    });

    auditLogger(
      'POLICY_ACTIVATED',
      adminId,
      tenantId,
      'AccessPolicy',
      policyId,
      { name: existing.name }
    );

    return policy;
  }

  /**
   * Deactivate an ACTIVE policy (ACTIVE -> INACTIVE).
   */
  async deactivatePolicy(tenantId: string, adminId: string, policyId: string) {
    const existing = await (prisma as any).accessPolicy.findFirst({
      where: { id: policyId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('AccessPolicy', policyId);
    }

    if (existing.status !== 'ACTIVE') {
      throw new ValidationError(
        `Cannot deactivate policy with status "${existing.status}". Only ACTIVE policies can be deactivated.`
      );
    }

    const policy = await (prisma as any).accessPolicy.update({
      where: { id: policyId },
      data: { status: 'INACTIVE' },
    });

    auditLogger(
      'POLICY_DEACTIVATED',
      adminId,
      tenantId,
      'AccessPolicy',
      policyId,
      { name: existing.name }
    );

    return policy;
  }

  /**
   * Soft-delete a policy by setting deletedAt.
   */
  async deletePolicy(tenantId: string, adminId: string, policyId: string) {
    const existing = await (prisma as any).accessPolicy.findFirst({
      where: { id: policyId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('AccessPolicy', policyId);
    }

    const policy = await (prisma as any).accessPolicy.update({
      where: { id: policyId },
      data: { deletedAt: new Date() },
    });

    auditLogger(
      'POLICY_DELETED',
      adminId,
      tenantId,
      'AccessPolicy',
      policyId,
      { name: existing.name }
    );

    return policy;
  }

  /**
   * Simulate policy evaluation for a given user, resource, and action.
   * Finds all ACTIVE policies matching the user's attributes, then determines
   * whether the result is ALLOW or DENY based on matched policies.
   */
  async simulatePolicy(
    tenantId: string,
    input: SimulateInput
  ) {
    const now = new Date();

    // Fetch the target user to get their attributes
    const user = await prisma.user.findFirst({
      where: {
        id: input.userId,
        tenantId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        userRoles: {
          include: { role: { select: { name: true } } },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User', input.userId);
    }

    const userRoleNames = (user as any).userRoles?.map(
      (ur: any) => ur.role.name
    ) ?? [];
    const userDepartmentId = user.departmentId;
    const userLevel = user.level ?? 1;

    // Get all ACTIVE policies for this tenant that are within their effective date range
    const policies = await (prisma as any).accessPolicy.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        deletedAt: null,
        OR: [
          { effectiveFrom: null },
          { effectiveFrom: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gt: now } },
            ],
          },
        ],
      },
      orderBy: { priority: 'desc' },
    });

    const matchedPolicies: Array<{
      id: string;
      name: string;
      type: string;
      effect: string;
      priority: number;
    }> = [];

    for (const policy of policies) {
      // Check resource/action match via the policy's actions JSON
      const policyActions = policy.actions as {
        resources?: string[];
        actions?: string[];
      };
      if (
        policyActions.resources &&
        policyActions.resources.length > 0 &&
        !policyActions.resources.includes(input.resource)
      ) {
        continue;
      }
      if (
        policyActions.actions &&
        policyActions.actions.length > 0 &&
        !policyActions.actions.includes(input.action)
      ) {
        continue;
      }

      // Check targetRoles
      if (policy.targetRoles.length > 0) {
        const matchesRole = policy.targetRoles.some((role: string) =>
          userRoleNames.includes(role)
        );
        if (!matchesRole) continue;
      }

      // Check targetDepartments
      if (policy.targetDepartments.length > 0) {
        if (
          !userDepartmentId ||
          !policy.targetDepartments.includes(userDepartmentId)
        ) {
          continue;
        }
      }

      // Check targetLevels
      if (policy.targetLevels.length > 0) {
        if (!policy.targetLevels.includes(userLevel)) continue;
      }

      matchedPolicies.push({
        id: policy.id,
        name: policy.name,
        type: policy.type,
        effect: policy.effect,
        priority: policy.priority,
      });
    }

    // Determine outcome: highest-priority DENY wins, otherwise ALLOW
    const hasDeny = matchedPolicies.some((p) => p.effect === 'DENY');
    const allowed = matchedPolicies.length === 0 ? true : !hasDeny;

    return {
      allowed,
      matchedPolicies,
    };
  }
}

export const policiesService = new PoliciesService();
