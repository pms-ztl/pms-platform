/**
 * AI Insights Cron Job
 *
 * Runs scheduled tasks to proactively generate AI insight cards:
 * 1. Daily (7 AM): License usage, inactive users, goal deadlines
 * 2. Weekly (Monday 8 AM): Summary cards for admins/managers
 */

import cron from 'node-cron';
import { prisma } from '@pms/database';

import { logger } from '../utils/logger';
import { DAYS, MS_PER_DAY, INACTIVE_USER_THRESHOLD_DAYS } from '../utils/constants';
import { createInsightCard } from '../modules/ai/agent-tools';
import { proactiveScheduler } from '../modules/ai/proactive-scheduler';

/**
 * Initialize AI insight cron jobs.
 */
export function initAIInsightsJob(): void {
  // Daily at 7:00 AM
  cron.schedule('0 7 * * *', () => {
    runDailyInsights().catch((err) => {
      logger.error('[AI CRON] Daily insights failed', { error: err });
    });
  });

  // Weekly on Monday at 8:00 AM
  cron.schedule('0 8 * * 1', () => {
    runWeeklyInsights().catch((err) => {
      logger.error('[AI CRON] Weekly insights failed', { error: err });
    });
  });

  // Run initial check after 60-second delay
  setTimeout(() => {
    runDailyInsights().catch((err) => {
      logger.error('[AI CRON] Initial daily insights failed', { error: err });
    });
  }, 60_000);

  logger.info('[AI CRON] AI insights jobs initialized (daily 7AM, weekly Mon 8AM)');
}

/**
 * Daily insight checks for all active tenants.
 */
async function runDailyInsights(): Promise<void> {
  logger.info('[AI CRON] Running daily insights...');

  const tenants = await prisma.tenant.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true, licenseCount: true },
  });

  for (const tenant of tenants) {
    try {
      await checkLicenseUsageInsight(tenant.id, tenant.licenseCount);
      await checkInactiveUsersInsight(tenant.id);
      await checkGoalDeadlinesInsight(tenant.id);

      // Proactive agentic AI checks
      await proactiveScheduler.runDailyProactive(tenant.id);
    } catch (err) {
      logger.error('[AI CRON] Tenant insight check failed', {
        tenantId: tenant.id,
        error: (err as Error).message,
      });
    }
  }

  logger.info('[AI CRON] Daily insights completed');
}

/**
 * Weekly insight generation.
 */
async function runWeeklyInsights(): Promise<void> {
  logger.info('[AI CRON] Running weekly insights...');

  const tenants = await prisma.tenant.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true, licenseCount: true },
  });

  for (const tenant of tenants) {
    try {
      await generateWeeklySummary(tenant.id, tenant.name);

      // Proactive agentic AI checks
      await proactiveScheduler.runWeeklyProactive(tenant.id);
    } catch (err) {
      logger.error('[AI CRON] Weekly summary failed', {
        tenantId: tenant.id,
        error: (err as Error).message,
      });
    }
  }

  logger.info('[AI CRON] Weekly insights completed');
}

// ── Individual Checks ──────────────────────────────────────

async function checkLicenseUsageInsight(
  tenantId: string,
  licenseCount: number,
): Promise<void> {
  if (licenseCount <= 0) return;

  const activeUsers = await prisma.user.count({
    where: { tenantId, isActive: true, deletedAt: null },
  });

  const usagePercent = Math.round((activeUsers / licenseCount) * 100);

  // Check for existing recent insight to avoid duplicates
  const recentInsight = await prisma.aIInsightCard.findFirst({
    where: {
      tenantId,
      agentType: 'license',
      insightType: usagePercent > 90 ? 'alert' : 'warning',
      isDismissed: false,
      createdAt: { gte: new Date(Date.now() - MS_PER_DAY) },
    },
  });
  if (recentInsight) return;

  if (usagePercent > 95) {
    await createInsightCard(tenantId, {
      agentType: 'license',
      insightType: 'alert',
      title: 'License Capacity Critical',
      description: `You're using ${activeUsers}/${licenseCount} licenses (${usagePercent}%). Action needed immediately to avoid blocking new users.`,
      priority: 'critical',
      data: { activeUsers, licenseCount, usagePercent },
      actionUrl: '/admin/license',
      actionLabel: 'Manage Licenses',
    });
  } else if (usagePercent > 80) {
    await createInsightCard(tenantId, {
      agentType: 'license',
      insightType: 'warning',
      title: 'License Usage High',
      description: `You're using ${activeUsers}/${licenseCount} licenses (${usagePercent}%). Consider planning for expansion.`,
      priority: 'medium',
      data: { activeUsers, licenseCount, usagePercent },
      actionUrl: '/admin/license',
      actionLabel: 'View License Dashboard',
    });
  } else if (usagePercent < 30 && activeUsers > 0) {
    await createInsightCard(tenantId, {
      agentType: 'license',
      insightType: 'opportunity',
      title: 'Low License Utilization',
      description: `Only ${usagePercent}% of your ${licenseCount} licenses are in use. You may want to consider right-sizing your plan.`,
      priority: 'low',
      data: { activeUsers, licenseCount, usagePercent },
      actionUrl: '/admin/license',
      actionLabel: 'Review Plan',
    });
  }
}

async function checkInactiveUsersInsight(tenantId: string): Promise<void> {
  const ninetyDaysAgo = new Date(Date.now() - DAYS(INACTIVE_USER_THRESHOLD_DAYS));

  const inactiveCount = await prisma.user.count({
    where: {
      tenantId,
      isActive: true,
      deletedAt: null,
      OR: [
        { lastLoginAt: { lt: ninetyDaysAgo } },
        { lastLoginAt: null },
      ],
    },
  });

  if (inactiveCount < 3) return;

  // Avoid duplicate insights
  const recent = await prisma.aIInsightCard.findFirst({
    where: {
      tenantId,
      agentType: 'license',
      insightType: 'recommendation',
      title: { contains: 'Inactive' },
      isDismissed: false,
      createdAt: { gte: new Date(Date.now() - DAYS(7)) }, // Weekly
    },
  });
  if (recent) return;

  await createInsightCard(tenantId, {
    agentType: 'license',
    insightType: 'recommendation',
    title: `${inactiveCount} Inactive Users Detected`,
    description: `${inactiveCount} users haven't logged in for 90+ days. Archiving them would free up license seats.`,
    priority: 'medium',
    data: { inactiveCount },
    actionUrl: '/admin/users?filter=inactive',
    actionLabel: 'Review Inactive Users',
  });
}

async function checkGoalDeadlinesInsight(tenantId: string): Promise<void> {
  const now = new Date();
  const threeDays = new Date(now.getTime() + DAYS(3));

  const upcomingGoals = await prisma.goal.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: { in: ['ACTIVE', 'ON_HOLD'] },
      dueDate: { gte: now, lte: threeDays },
      progress: { lt: 80 },
    },
    select: {
      id: true,
      title: true,
      ownerId: true,
      progress: true,
      dueDate: true,
    },
  });

  // Create per-user insight cards for upcoming deadlines
  const userGoals = new Map<string, typeof upcomingGoals>();
  for (const goal of upcomingGoals) {
    const existing = userGoals.get(goal.ownerId) ?? [];
    existing.push(goal);
    userGoals.set(goal.ownerId, existing);
  }

  for (const [userId, goals] of userGoals) {
    // Check for recent similar insight
    const recent = await prisma.aIInsightCard.findFirst({
      where: {
        tenantId,
        userId,
        agentType: 'performance',
        insightType: 'warning',
        isDismissed: false,
        createdAt: { gte: new Date(Date.now() - MS_PER_DAY) },
      },
    });
    if (recent) continue;

    await createInsightCard(tenantId, {
      userId,
      agentType: 'performance',
      insightType: 'warning',
      title: `${goals.length} Goal${goals.length > 1 ? 's' : ''} Due Soon`,
      description: `You have ${goals.length} goal${goals.length > 1 ? 's' : ''} due within 3 days with less than 80% progress.`,
      priority: 'high',
      data: { goals: goals.map((g) => ({ id: g.id, title: g.title, progress: g.progress })) },
      actionUrl: '/goals',
      actionLabel: 'View Goals',
    });
  }
}

async function generateWeeklySummary(tenantId: string, tenantName: string): Promise<void> {
  const oneWeekAgo = new Date(Date.now() - DAYS(7));

  const [newUsers, activeGoals, completedGoals] = await Promise.all([
    prisma.user.count({
      where: { tenantId, createdAt: { gte: oneWeekAgo }, deletedAt: null },
    }),
    prisma.goal.count({
      where: { tenantId, status: { in: ['ACTIVE', 'ON_HOLD'] }, deletedAt: null },
    }),
    prisma.goal.count({
      where: { tenantId, status: 'COMPLETED', updatedAt: { gte: oneWeekAgo }, deletedAt: null },
    }),
  ]);

  // Avoid duplicate
  const recent = await prisma.aIInsightCard.findFirst({
    where: {
      tenantId,
      userId: null,
      agentType: 'report',
      insightType: 'recommendation',
      title: { contains: 'Weekly' },
      createdAt: { gte: new Date(Date.now() - DAYS(5)) },
    },
  });
  if (recent) return;

  await createInsightCard(tenantId, {
    agentType: 'report',
    insightType: 'recommendation',
    title: 'Weekly Platform Summary',
    description: `This week: ${newUsers} new employees, ${completedGoals} goals completed, ${activeGoals} active goals.`,
    priority: 'low',
    data: { newUsers, activeGoals, completedGoals, tenantName },
    actionUrl: '/admin/dashboard',
    actionLabel: 'View Dashboard',
    expiresAt: new Date(Date.now() + DAYS(7)),
  });
}
