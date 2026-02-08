// @ts-nocheck
import { prisma } from '@pms/database';

class AuditService {
  async logEvent(
    tenantId: string,
    data: {
      userId?: string;
      action: string;
      entityType: string;
      entityId: string;
      previousState?: any;
      newState?: any;
      ipAddress?: string;
      userAgent?: string;
      metadata?: any;
    }
  ) {
    return prisma.auditEvent.create({
      data: {
        tenantId,
        userId: data.userId || null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        previousState: data.previousState || undefined,
        newState: data.newState || undefined,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        metadata: data.metadata || {},
      },
    });
  }

  async list(
    tenantId: string,
    params: {
      page?: number;
      limit?: number;
      userId?: string;
      entityType?: string;
      action?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    } = {}
  ) {
    const page = params.page || 1;
    const limit = params.limit || 25;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (params.userId) {
      where.userId = params.userId;
    }
    if (params.entityType) {
      where.entityType = params.entityType;
    }
    if (params.action) {
      where.action = params.action;
    }
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) {
        where.createdAt.gte = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        where.createdAt.lte = new Date(params.dateTo);
      }
    }
    if (params.search) {
      where.OR = [
        { action: { contains: params.search, mode: 'insensitive' } },
        { entityType: { contains: params.search, mode: 'insensitive' } },
        { entityId: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditEvent.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getById(tenantId: string, id: string) {
    return prisma.auditEvent.findFirst({
      where: { id, tenantId },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async getEntityHistory(tenantId: string, entityType: string, entityId: string) {
    return prisma.auditEvent.findMany({
      where: { tenantId, entityType, entityId },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserActivity(
    tenantId: string,
    userId: string,
    params: { page?: number; limit?: number } = {}
  ) {
    const page = params.page || 1;
    const limit = params.limit || 25;
    const skip = (page - 1) * limit;

    const where = { tenantId, userId };

    const [data, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditEvent.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getStats(
    tenantId: string,
    params: { dateFrom?: string; dateTo?: string } = {}
  ) {
    const where: any = { tenantId };

    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) {
        where.createdAt.gte = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        where.createdAt.lte = new Date(params.dateTo);
      }
    }

    // Total events
    const total = await prisma.auditEvent.count({ where });

    // Events by action type
    const byAction = await prisma.auditEvent.groupBy({
      by: ['action'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Events by entity type
    const byEntityType = await prisma.auditEvent.groupBy({
      by: ['entityType'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Most active users
    const byUser = await prisma.auditEvent.groupBy({
      by: ['userId'],
      where: { ...where, userId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Fetch user details for the most active users
    const userIds = byUser.map((u) => u.userId).filter(Boolean) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const mostActiveUsers = byUser.map((u) => ({
      userId: u.userId,
      user: u.userId ? userMap.get(u.userId) || null : null,
      count: u._count.id,
    }));

    // Recent activity timeline (last 30 days, grouped by day)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const timelineWhere = {
      ...where,
      createdAt: { gte: thirtyDaysAgo, ...(where.createdAt || {}) },
    };

    const recentEvents = await prisma.auditEvent.findMany({
      where: timelineWhere,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const timeline: Record<string, number> = {};
    for (const event of recentEvents) {
      const dateKey = event.createdAt.toISOString().split('T')[0];
      timeline[dateKey] = (timeline[dateKey] || 0) + 1;
    }

    const recentActivityTimeline = Object.entries(timeline).map(([date, count]) => ({
      date,
      count,
    }));

    return {
      total,
      byAction: byAction.map((a) => ({ action: a.action, count: a._count.id })),
      byEntityType: byEntityType.map((e) => ({ entityType: e.entityType, count: e._count.id })),
      mostActiveUsers,
      recentActivityTimeline,
    };
  }

  async purge(tenantId: string, retentionDays: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.auditEvent.deleteMany({
      where: {
        tenantId,
        createdAt: { lt: cutoffDate },
      },
    });

    return { deletedCount: result.count, cutoffDate };
  }
}

export const auditService = new AuditService();
