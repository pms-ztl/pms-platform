/**
 * Proactive Agent Scheduler — autonomous behaviors that run WITHOUT user prompting.
 *
 * The system autonomously detects issues and takes corrective actions:
 * - Daily burnout risk scan → notify managers of critical cases
 * - Daily deadline alerts → remind users of approaching deadlines
 * - Weekly goal alignment audit → flag orphan/misaligned goals
 * - Weekly performance trend detection → coaching recommendations
 *
 * Each proactive action creates an AgentTask (isProactive: true) so it's
 * fully tracked and auditable, just like user-initiated agentic tasks.
 */

import { prisma } from '@pms/database';

import { logger, auditLogger } from '../../utils/logger';
import { queryBurnoutRisk, queryGoalAlignment } from './agent-tools-v2';
import { sendNotification, createInsightCard } from './agent-tools';

// ── Constants ──────────────────────────────────────────────

const BURNOUT_CRITICAL_THRESHOLD = 70;
const GOAL_DEADLINE_DAYS = 3;
const GOAL_LOW_PROGRESS_THRESHOLD = 30;

// ── Proactive Scheduler ────────────────────────────────────

class ProactiveScheduler {
  /**
   * Run all daily proactive checks for a tenant.
   * Called from the existing ai-insights cron job.
   */
  async runDailyProactive(tenantId: string): Promise<void> {
    logger.info('Running daily proactive checks', { tenantId });

    const results = await Promise.allSettled([
      this.burnoutRiskScan(tenantId),
      this.deadlineAlerts(tenantId),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        logger.error('Proactive daily check failed', {
          tenantId,
          error: (result as PromiseRejectedResult).reason?.message,
        });
      }
    }
  }

  /**
   * Run all weekly proactive checks for a tenant.
   */
  async runWeeklyProactive(tenantId: string): Promise<void> {
    logger.info('Running weekly proactive checks', { tenantId });

    const results = await Promise.allSettled([
      this.goalAlignmentAudit(tenantId),
      this.performanceTrendDetection(tenantId),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        logger.error('Proactive weekly check failed', {
          tenantId,
          error: (result as PromiseRejectedResult).reason?.message,
        });
      }
    }
  }

  // ── Daily: Burnout Risk Scan ─────────────────────────────

  /**
   * Query all employees for burnout risk. If anyone scores above the critical
   * threshold, create an AgentTask to notify their manager and create insight cards.
   */
  private async burnoutRiskScan(tenantId: string): Promise<void> {
    const result = await queryBurnoutRisk(tenantId, { limit: 200 });
    if (!result.success || !result.data) return;

    const users = result.data as Array<{
      userId: string;
      userName: string;
      riskScore: number;
      factors: string[];
      managerId?: string;
    }>;

    const criticalCases = users.filter((u) => u.riskScore >= BURNOUT_CRITICAL_THRESHOLD);
    if (criticalCases.length === 0) return;

    // Get the system/admin user for proactive tasks
    const systemUser = await this.getSystemUser(tenantId);
    if (!systemUser) return;

    // Create a proactive AgentTask to track this action
    const task = await prisma.agentTask.create({
      data: {
        tenantId,
        userId: systemUser.id,
        agentType: 'burnout_interceptor',
        title: `Burnout Risk Alert: ${criticalCases.length} critical case(s) detected`,
        goal: 'Proactive burnout risk detection and manager notification',
        status: 'executing',
        isProactive: true,
        startedAt: new Date(),
        totalSteps: criticalCases.length,
      },
    });

    let completedSteps = 0;

    for (const user of criticalCases) {
      try {
        // Check for duplicate (don't alert twice within 24h)
        const recentAlert = await prisma.aIInsightCard.findFirst({
          where: {
            tenantId,
            userId: user.managerId || null,
            agentType: 'burnout_interceptor',
            title: { contains: user.userName },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        if (recentAlert) continue;

        // Create insight card for the manager
        await createInsightCard(tenantId, {
          userId: user.managerId || undefined,
          agentType: 'burnout_interceptor',
          insightType: 'alert',
          title: `Burnout Risk: ${user.userName} (${user.riskScore}%)`,
          description: `${user.userName} has a burnout risk score of ${user.riskScore}%. Contributing factors: ${user.factors.join(', ')}. Consider scheduling a check-in.`,
          priority: user.riskScore >= 85 ? 'critical' : 'high',
          actionUrl: `/team/members/${user.userId}`,
          actionLabel: 'View Profile',
        });

        // Notify manager if available
        if (user.managerId) {
          await sendNotification(tenantId, user.managerId, {
            type: 'warning',
            title: 'Burnout Risk Alert',
            message: `${user.userName} has a burnout risk score of ${user.riskScore}%. Review their workload and schedule a check-in.`,
            actionUrl: `/team/members/${user.userId}`,
          });
        }

        // Record action
        await prisma.agentAction.create({
          data: {
            taskId: task.id,
            stepIndex: completedSteps,
            toolName: 'create_insight_card',
            toolInput: { userId: user.userId, riskScore: user.riskScore } as any,
            toolOutput: { success: true, notified: !!user.managerId } as any,
            status: 'completed',
            impactLevel: 'low_write',
            reasoning: `Burnout risk score ${user.riskScore}% exceeds threshold of ${BURNOUT_CRITICAL_THRESHOLD}%`,
          },
        });

        completedSteps++;
      } catch (err) {
        logger.error('Failed to process burnout alert', {
          tenantId,
          userId: user.userId,
          error: (err as Error).message,
        });
      }
    }

    await prisma.agentTask.update({
      where: { id: task.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        currentStep: completedSteps,
        result: {
          summary: `Detected ${criticalCases.length} critical burnout cases. Created ${completedSteps} alerts.`,
        } as any,
      },
    });

    auditLogger(
      'AI_PROACTIVE_BURNOUT_SCAN',
      systemUser.id,
      tenantId,
      'agent_task',
      task.id,
      { criticalCases: criticalCases.length, alertsCreated: completedSteps },
    );
  }

  // ── Daily: Deadline Alerts ───────────────────────────────

  /**
   * Find goals with deadlines approaching within N days and low progress.
   * Send reminder notifications to goal owners.
   */
  private async deadlineAlerts(tenantId: string): Promise<void> {
    const cutoffDate = new Date(Date.now() + GOAL_DEADLINE_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();

    const urgentGoals = await prisma.goal.findMany({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'ACTIVE'] },
        dueDate: { lte: cutoffDate, gte: now },
        progress: { lt: GOAL_LOW_PROGRESS_THRESHOLD },
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
      take: 50,
    });

    if (urgentGoals.length === 0) return;

    const systemUser = await this.getSystemUser(tenantId);
    if (!systemUser) return;

    const task = await prisma.agentTask.create({
      data: {
        tenantId,
        userId: systemUser.id,
        agentType: 'goal_intelligence',
        title: `Deadline Alert: ${urgentGoals.length} goal(s) at risk`,
        goal: 'Proactive deadline reminder for goals with low progress',
        status: 'executing',
        isProactive: true,
        startedAt: new Date(),
        totalSteps: urgentGoals.length,
      },
    });

    let completed = 0;
    for (const goal of urgentGoals) {
      try {
        const daysLeft = Math.ceil(
          (goal.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Check for duplicate (don't remind within 24h)
        const recentReminder = await prisma.aIInsightCard.findFirst({
          where: {
            tenantId,
            userId: goal.ownerId,
            agentType: 'goal_intelligence',
            title: { contains: goal.title.slice(0, 30) },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        if (recentReminder) continue;

        await createInsightCard(tenantId, {
          userId: goal.ownerId,
          agentType: 'goal_intelligence',
          insightType: 'warning',
          title: `Goal Deadline: "${goal.title}" — ${daysLeft} day(s) left`,
          description: `Your goal "${goal.title}" is due in ${daysLeft} day(s) with only ${goal.progress}% progress. Consider updating your progress or requesting a deadline extension.`,
          priority: daysLeft <= 1 ? 'critical' : 'high',
          actionUrl: `/goals/${goal.id}`,
          actionLabel: 'View Goal',
        });

        await sendNotification(tenantId, goal.ownerId, {
          type: 'warning',
          title: `Goal Deadline Approaching`,
          message: `"${goal.title}" is due in ${daysLeft} day(s) with ${goal.progress}% progress.`,
          actionUrl: `/goals/${goal.id}`,
        });

        completed++;
      } catch (err) {
        logger.error('Failed to send deadline alert', {
          goalId: goal.id,
          error: (err as Error).message,
        });
      }
    }

    await prisma.agentTask.update({
      where: { id: task.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        currentStep: completed,
        result: {
          summary: `Sent ${completed} deadline reminders for goals at risk.`,
        } as any,
      },
    });
  }

  // ── Weekly: Goal Alignment Audit ─────────────────────────

  /**
   * Check org-wide goal alignment and flag orphan goals.
   */
  private async goalAlignmentAudit(tenantId: string): Promise<void> {
    const result = await queryGoalAlignment(tenantId);
    if (!result.success || !result.data) return;

    const data = result.data as {
      totalGoals: number;
      alignedGoals: number;
      orphanGoals: Array<{ id: string; title: string; ownerId?: string }>;
    };

    if (!data.orphanGoals || data.orphanGoals.length === 0) return;

    const systemUser = await this.getSystemUser(tenantId);
    if (!systemUser) return;

    // Create tenant-wide insight
    const alignmentRate = data.totalGoals > 0
      ? Math.round((data.alignedGoals / data.totalGoals) * 100)
      : 0;

    await createInsightCard(tenantId, {
      agentType: 'goal_intelligence',
      insightType: alignmentRate < 50 ? 'alert' : 'recommendation',
      title: `Goal Alignment: ${alignmentRate}% aligned (${data.orphanGoals.length} orphan goals)`,
      description: `${data.orphanGoals.length} goals have no parent or alignment link. Consider connecting them to department or company objectives for better strategic alignment.`,
      priority: alignmentRate < 30 ? 'high' : 'medium',
      actionUrl: '/goals',
      actionLabel: 'Review Goals',
    });

    // Create proactive task record
    await prisma.agentTask.create({
      data: {
        tenantId,
        userId: systemUser.id,
        agentType: 'goal_intelligence',
        title: `Goal Alignment Audit: ${alignmentRate}% aligned`,
        goal: 'Weekly goal alignment check',
        status: 'completed',
        isProactive: true,
        startedAt: new Date(),
        completedAt: new Date(),
        totalSteps: 1,
        currentStep: 1,
        result: {
          summary: `Alignment rate: ${alignmentRate}%. Found ${data.orphanGoals.length} orphan goals.`,
          orphanGoalCount: data.orphanGoals.length,
          alignmentRate,
        } as any,
      },
    });

    auditLogger(
      'AI_PROACTIVE_GOAL_AUDIT',
      systemUser.id,
      tenantId,
      'agent_task',
      'proactive',
      { alignmentRate, orphanGoals: data.orphanGoals.length },
    );
  }

  // ── Weekly: Performance Trend Detection ──────────────────

  /**
   * Detect declining performance trends and create coaching recommendations.
   */
  private async performanceTrendDetection(tenantId: string): Promise<void> {
    // Find users with declining performance metrics over the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const metrics = await prisma.dailyPerformanceMetric.groupBy({
      by: ['userId'],
      where: {
        tenantId,
        metricDate: { gte: thirtyDaysAgo },
      },
      _avg: { overallPerformanceScore: true },
      _count: { id: true },
    });

    // Filter to users with at least 10 data points
    const filtered = metrics.filter((m) => (m._count as any).id >= 10);
    if (filtered.length === 0) return;

    const systemUser = await this.getSystemUser(tenantId);
    if (!systemUser) return;

    // For each user with enough data, compare first-half vs second-half average
    let decliningCount = 0;
    for (const metric of filtered) {
      try {
        const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

        const [firstHalf, secondHalf] = await Promise.all([
          prisma.dailyPerformanceMetric.aggregate({
            where: {
              tenantId,
              userId: metric.userId,
              metricDate: { gte: thirtyDaysAgo, lt: fifteenDaysAgo },
            },
            _avg: { overallPerformanceScore: true },
          }),
          prisma.dailyPerformanceMetric.aggregate({
            where: {
              tenantId,
              userId: metric.userId,
              metricDate: { gte: fifteenDaysAgo },
            },
            _avg: { overallPerformanceScore: true },
          }),
        ]);

        const firstAvg = Number(firstHalf._avg.overallPerformanceScore) || 0;
        const secondAvg = Number(secondHalf._avg.overallPerformanceScore) || 0;

        // Flag if performance dropped by more than 15%
        if (firstAvg > 0 && secondAvg < firstAvg * 0.85) {
          const dropPercent = Math.round(((firstAvg - secondAvg) / firstAvg) * 100);

          // Get user info
          const user = await prisma.user.findFirst({
            where: { id: metric.userId, tenantId },
            select: { firstName: true, lastName: true, managerId: true },
          });

          if (user) {
            // Create insight for the user's manager
            await createInsightCard(tenantId, {
              userId: user.managerId || undefined,
              agentType: 'performance_signal',
              insightType: 'recommendation',
              title: `Performance Trend: ${user.firstName} ${user.lastName} (-${dropPercent}%)`,
              description: `${user.firstName}'s performance metrics have declined by ${dropPercent}% over the last 30 days. Consider scheduling a coaching session to understand potential blockers.`,
              priority: dropPercent >= 25 ? 'high' : 'medium',
              actionUrl: `/team/members/${metric.userId}`,
              actionLabel: 'View Performance',
            });

            decliningCount++;
          }
        }
      } catch (err) {
        logger.error('Performance trend analysis failed for user', {
          userId: metric.userId,
          error: (err as Error).message,
        });
      }
    }

    if (decliningCount > 0) {
      await prisma.agentTask.create({
        data: {
          tenantId,
          userId: systemUser.id,
          agentType: 'performance_signal',
          title: `Performance Trend Alert: ${decliningCount} declining trend(s)`,
          goal: 'Weekly performance trend detection',
          status: 'completed',
          isProactive: true,
          startedAt: new Date(),
          completedAt: new Date(),
          totalSteps: 1,
          currentStep: 1,
          result: {
            summary: `Detected ${decliningCount} users with declining performance trends.`,
            decliningCount,
          } as any,
        },
      });
    }
  }

  // ── Helpers ──────────────────────────────────────────────

  /**
   * Get a system/admin user for proactive task attribution.
   */
  private async getSystemUser(tenantId: string): Promise<{ id: string } | null> {
    // Find the tenant's designated manager or first admin
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { designatedManagerId: true },
    });

    if (tenant?.designatedManagerId) {
      return { id: tenant.designatedManagerId };
    }

    // Fallback: find first admin user
    const admin = await prisma.user.findFirst({
      where: {
        tenantId,
        isActive: true,
        userRoles: { some: { role: { name: { in: ['super_admin', 'admin'] } } } },
      },
      select: { id: true },
    });

    return admin;
  }
}

/** Singleton proactive scheduler instance */
export const proactiveScheduler = new ProactiveScheduler();
