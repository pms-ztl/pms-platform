import { prisma } from '../../lib/prisma';
import { auditLogger } from '../../utils/logger';
import { PLAN_MAX_LEVELS } from '../super-admin/license.service';

const PLAN_ORDER: Record<string, number> = {
  FREE: 0, STARTER: 1, PROFESSIONAL: 2, ENTERPRISE: 3,
};

class UpgradeRequestsService {
  async createRequest(tenantId: string, userId: string, input: {
    requestedPlan: string;
    requestedLicenseCount?: number;
    requestedMaxLevel?: number;
    reason?: string;
  }) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error('Tenant not found');

    const currentOrder = PLAN_ORDER[tenant.subscriptionPlan] ?? 0;
    const requestedOrder = PLAN_ORDER[input.requestedPlan] ?? 0;
    if (requestedOrder <= currentOrder) {
      throw new Error('Requested plan must be higher than current plan');
    }

    const existing = await prisma.upgradeRequest.findFirst({
      where: { tenantId, status: 'PENDING' },
    });
    if (existing) throw new Error('A pending upgrade request already exists for this tenant');

    const request = await prisma.upgradeRequest.create({
      data: {
        tenantId,
        requestedBy: userId,
        currentPlan: tenant.subscriptionPlan,
        requestedPlan: input.requestedPlan,
        requestedLicenseCount: input.requestedLicenseCount,
        requestedMaxLevel: input.requestedMaxLevel,
        reason: input.reason,
        status: 'PENDING',
      },
    });

    auditLogger('UPGRADE_REQUEST_CREATED', userId, tenantId, 'upgradeRequest', request.id,
      { currentPlan: tenant.subscriptionPlan, requestedPlan: input.requestedPlan });

    return request;
  }

  async listByTenant(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.upgradeRequest.findMany({
        where: { tenantId },
        include: {
          requester: { select: { id: true, firstName: true, lastName: true, email: true } },
          reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.upgradeRequest.count({ where: { tenantId } }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async cancelRequest(tenantId: string, requestId: string, userId: string) {
    const request = await prisma.upgradeRequest.findFirst({
      where: { id: requestId, tenantId },
    });
    if (!request) throw new Error('Upgrade request not found');
    if (request.status !== 'PENDING') throw new Error('Only pending requests can be cancelled');
    if (request.requestedBy !== userId) throw new Error('Only the requester can cancel this request');

    await prisma.upgradeRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });

    auditLogger('UPGRADE_REQUEST_CANCELLED', userId, tenantId, 'upgradeRequest', requestId, {});
  }

  // --- Super Admin methods ---

  async listAll(params: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.upgradeRequest.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true, subscriptionPlan: true } },
          requester: { select: { id: true, firstName: true, lastName: true, email: true } },
          reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.upgradeRequest.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async approveRequest(requestId: string, reviewerId: string, notes?: string) {
    const request = await prisma.upgradeRequest.findUnique({
      where: { id: requestId },
      include: { tenant: true },
    });
    if (!request) throw new Error('Upgrade request not found');
    if (request.status !== 'PENDING') throw new Error('Only pending requests can be approved');

    const newMaxLevel = PLAN_MAX_LEVELS[request.requestedPlan] ?? 16;

    await prisma.$transaction([
      prisma.upgradeRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewNotes: notes,
        },
      }),
      prisma.tenant.update({
        where: { id: request.tenantId },
        data: {
          subscriptionPlan: request.requestedPlan,
          maxLevel: newMaxLevel,
          ...(request.requestedLicenseCount ? { licenseCount: request.requestedLicenseCount } : {}),
        },
      }),
    ]);

    auditLogger('UPGRADE_REQUEST_APPROVED', reviewerId, request.tenantId, 'upgradeRequest', requestId,
      { previousPlan: request.currentPlan, newPlan: request.requestedPlan, newMaxLevel });
  }

  async rejectRequest(requestId: string, reviewerId: string, notes: string) {
    const request = await prisma.upgradeRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error('Upgrade request not found');
    if (request.status !== 'PENDING') throw new Error('Only pending requests can be rejected');

    await prisma.upgradeRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: notes,
      },
    });

    auditLogger('UPGRADE_REQUEST_REJECTED', reviewerId, request.tenantId, 'upgradeRequest', requestId,
      { reason: notes });
  }

  async getPendingCount() {
    return prisma.upgradeRequest.count({ where: { status: 'PENDING' } });
  }
}

export const upgradeRequestsService = new UpgradeRequestsService();
