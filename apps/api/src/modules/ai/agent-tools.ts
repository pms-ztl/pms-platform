/**
 * Agent Tools — reusable data-access functions that agents can invoke.
 *
 * Every tool enforces tenant isolation and is logged via auditLogger.
 */

import { prisma } from '@pms/database';

import { logger, auditLogger } from '../../utils/logger';

// ── Tool Types ─────────────────────────────────────────────

export interface ToolResult {
  success: boolean;
  data: unknown;
  error?: string;
}

// ── Tools ──────────────────────────────────────────────────

/**
 * Query users within a tenant.
 */
export async function queryUsers(
  tenantId: string,
  filters: {
    isActive?: boolean;
    departmentId?: string;
    level?: number;
    roles?: string[];
    search?: string;
    limit?: number;
  } = {},
): Promise<ToolResult> {
  try {
    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.level) where.level = filters.level;
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      take: Math.min(filters.limit ?? 50, 100),
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        level: true,
        jobTitle: true,
        isActive: true,
        departmentId: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { firstName: 'asc' },
    });

    return { success: true, data: users };
  } catch (err) {
    logger.error('queryUsers tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

/**
 * Query goals within a tenant, optionally filtered by user.
 */
export async function queryGoals(
  tenantId: string,
  filters: {
    userId?: string;
    status?: string;
    limit?: number;
  } = {},
): Promise<ToolResult> {
  try {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (filters.userId) where.ownerId = filters.userId;
    if (filters.status) where.status = filters.status;

    const goals = await prisma.goal.findMany({
      where,
      take: Math.min(filters.limit ?? 50, 100),
      select: {
        id: true,
        title: true,
        status: true,
        progress: true,
        dueDate: true,
        priority: true,
        ownerId: true,
        createdAt: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    return { success: true, data: goals };
  } catch (err) {
    logger.error('queryGoals tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

/**
 * Query reviews within a tenant, optionally filtered by user.
 */
export async function queryReviews(
  tenantId: string,
  filters: {
    userId?: string;
    cycleId?: string;
    status?: string;
    limit?: number;
  } = {},
): Promise<ToolResult> {
  try {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (filters.userId) {
      where.OR = [{ revieweeId: filters.userId }, { reviewerId: filters.userId }];
    }
    if (filters.cycleId) where.cycleId = filters.cycleId;
    if (filters.status) where.status = filters.status;

    const reviews = await prisma.review.findMany({
      where,
      take: Math.min(filters.limit ?? 50, 100),
      select: {
        id: true,
        status: true,
        overallRating: true,
        revieweeId: true,
        reviewerId: true,
        cycleId: true,
        submittedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: reviews };
  } catch (err) {
    logger.error('queryReviews tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

/**
 * Query feedback within a tenant, optionally filtered by user.
 */
export async function queryFeedback(
  tenantId: string,
  filters: {
    userId?: string;
    type?: string;
    limit?: number;
  } = {},
): Promise<ToolResult> {
  try {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (filters.userId) {
      where.OR = [{ fromUserId: filters.userId }, { toUserId: filters.userId }];
    }
    if (filters.type) where.type = filters.type;

    const feedback = await prisma.feedback.findMany({
      where,
      take: Math.min(filters.limit ?? 50, 100),
      select: {
        id: true,
        type: true,
        content: true,
        sentiment: true,
        sentimentScore: true,
        isAnonymous: true,
        fromUserId: true,
        toUserId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: feedback };
  } catch (err) {
    logger.error('queryFeedback tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

/**
 * Get license usage for a tenant.
 */
export async function queryLicenseUsage(tenantId: string): Promise<ToolResult> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        licenseCount: true,
        maxLevel: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
      },
    });

    if (!tenant) return { success: false, data: null, error: 'Tenant not found' };

    const [activeUsers, archivedUsers, totalUsers] = await Promise.all([
      prisma.user.count({ where: { tenantId, isActive: true, deletedAt: null } }),
      prisma.user.count({ where: { tenantId, isActive: false, deletedAt: null } }),
      prisma.user.count({ where: { tenantId, deletedAt: null } }),
    ]);

    return {
      success: true,
      data: {
        tenant: tenant.name,
        licenseCount: tenant.licenseCount,
        activeUsers,
        archivedUsers,
        totalUsers,
        usagePercent: tenant.licenseCount > 0
          ? Math.round((activeUsers / tenant.licenseCount) * 100)
          : 0,
        maxLevel: tenant.maxLevel,
        subscriptionPlan: tenant.subscriptionPlan,
        subscriptionStatus: tenant.subscriptionStatus,
        subscriptionExpiresAt: tenant.subscriptionExpiresAt,
      },
    };
  } catch (err) {
    logger.error('queryLicenseUsage tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

/**
 * Query audit events within a tenant.
 */
export async function queryAuditEvents(
  tenantId: string,
  filters: {
    action?: string;
    userId?: string;
    entityType?: string;
    since?: Date;
    limit?: number;
  } = {},
): Promise<ToolResult> {
  try {
    const where: Record<string, unknown> = { tenantId };
    if (filters.action) where.action = filters.action;
    if (filters.userId) where.userId = filters.userId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.since) where.createdAt = { gte: filters.since };

    const events = await prisma.auditEvent.findMany({
      where,
      take: Math.min(filters.limit ?? 50, 200),
      select: {
        id: true,
        action: true,
        userId: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: events };
  } catch (err) {
    logger.error('queryAuditEvents tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

/**
 * Query analytics / performance data.
 */
export async function queryAnalytics(
  tenantId: string,
  filters: {
    userId?: string;
    metric?: string;
    since?: Date;
    limit?: number;
  } = {},
): Promise<ToolResult> {
  try {
    const where: Record<string, unknown> = { tenantId };
    if (filters.userId) where.userId = filters.userId;
    if (filters.since) where.metricDate = { gte: filters.since };

    const metrics = await prisma.dailyPerformanceMetric.findMany({
      where,
      take: Math.min(filters.limit ?? 30, 100),
      select: {
        id: true,
        userId: true,
        metricDate: true,
        totalTasksCompleted: true,
        totalTasksCreated: true,
        totalActiveMinutes: true,
        avgProductivityScore: true,
        avgEngagementScore: true,
        overallPerformanceScore: true,
      },
      orderBy: { metricDate: 'desc' },
    });

    return { success: true, data: metrics };
  } catch (err) {
    logger.error('queryAnalytics tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

/**
 * Create a notification for a user.
 */
export async function sendNotification(
  tenantId: string,
  userId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
  },
): Promise<ToolResult> {
  try {
    const notif = await prisma.notification.create({
      data: {
        tenantId,
        userId,
        type: notification.type,
        title: notification.title,
        body: notification.message,
        data: (notification.actionUrl ? { actionUrl: notification.actionUrl } : {}) as import('@prisma/client').Prisma.InputJsonValue,
      },
    });

    auditLogger(
      'AI_NOTIFICATION_SENT',
      userId,
      tenantId,
      'notification',
      notif.id,
      { type: notification.type, targetUserId: userId },
    );

    return { success: true, data: { id: notif.id } };
  } catch (err) {
    logger.error('sendNotification tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

/**
 * Create or retrieve an AI insight card.
 */
export async function createInsightCard(
  tenantId: string,
  card: {
    userId?: string;
    agentType: string;
    insightType: string;
    title: string;
    description: string;
    priority?: string;
    data?: Record<string, unknown>;
    actionUrl?: string;
    actionLabel?: string;
    expiresAt?: Date;
  },
): Promise<ToolResult> {
  try {
    const insight = await prisma.aIInsightCard.create({
      data: {
        tenantId,
        userId: card.userId ?? null,
        agentType: card.agentType,
        insightType: card.insightType,
        title: card.title,
        description: card.description,
        priority: card.priority ?? 'medium',
        data: (card.data ?? undefined) as import('@prisma/client').Prisma.InputJsonValue | undefined,
        actionUrl: card.actionUrl,
        actionLabel: card.actionLabel,
        expiresAt: card.expiresAt,
      },
    });

    return { success: true, data: { id: insight.id } };
  } catch (err) {
    logger.error('createInsightCard tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}
