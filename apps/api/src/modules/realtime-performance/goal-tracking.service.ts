/**
 * Goal Tracking Sub-Service
 *
 * Handles goal progress dashboard, milestone CRUD, velocity-based ETAs,
 * milestone timeline, and auto-detection of milestones from progress patterns.
 *
 * Covers:
 *  - Feature 3: Real-Time Goal Progress Dashboard
 *  - Feature 8: Live Project Milestone Tracker
 */

import { prisma } from '@pms/database';
import { MS_PER_DAY } from '../../utils/constants';
import type { GoalProgressDashboard, MilestoneUpdate } from './realtime-performance.service';

// ============================================================================
// Goal Tracking Service
// ============================================================================

export class GoalTrackingService {
  // ==========================================================================
  // Feature 3: Real-Time Goal Progress Dashboard
  // ==========================================================================

  /**
   * Get real-time goal progress dashboard
   */
  async getGoalProgressDashboard(
    tenantId: string,
    userId: string,
    includeTeamGoals: boolean = false
  ): Promise<GoalProgressDashboard> {
    const now = new Date();

    // Build where clause based on role
    const whereClause: any = {
      tenantId,
      deletedAt: null,
      status: { in: ['DRAFT', 'ACTIVE'] },
    };

    if (!includeTeamGoals) {
      whereClause.ownerId = userId;
    } else {
      whereClause.OR = [
        { ownerId: userId },
        { owner: { managerId: userId } },
      ];
    }

    const goals = await prisma.goal.findMany({
      where: whereClause,
      include: {
        progressUpdates: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    const processedGoals = goals.map(goal => {
      const daysRemaining = goal.dueDate
        ? Math.ceil((goal.dueDate.getTime() - now.getTime()) / MS_PER_DAY)
        : null;

      // Calculate expected progress based on time elapsed
      let expectedProgress = 0;
      if (goal.startDate && goal.dueDate) {
        const totalDays = (goal.dueDate.getTime() - goal.startDate.getTime()) / MS_PER_DAY;
        const elapsedDays = (now.getTime() - goal.startDate.getTime()) / MS_PER_DAY;
        expectedProgress = Math.min(100, (elapsedDays / totalDays) * 100);
      }

      // Determine status
      let status: 'on_track' | 'at_risk' | 'off_track';
      if (daysRemaining !== null && daysRemaining < 0) {
        status = 'off_track'; // Overdue
      } else if (goal.progress >= expectedProgress - 10) {
        status = 'on_track';
      } else if (goal.progress >= expectedProgress - 25) {
        status = 'at_risk';
      } else {
        status = 'off_track';
      }

      // Calculate trend from recent updates
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (goal.progressUpdates.length >= 2) {
        const recentDeltas = goal.progressUpdates.slice(0, 3).map(
          u => Number(u.newProgress) - Number(u.previousProgress)
        );
        const avgDelta = recentDeltas.reduce((a, b) => a + b, 0) / recentDeltas.length;
        if (avgDelta > 2) trend = 'improving';
        else if (avgDelta < -2) trend = 'declining';
      }

      return {
        id: goal.id,
        title: goal.title,
        progress: goal.progress,
        status,
        dueDate: goal.dueDate,
        daysRemaining,
        trend,
      };
    });

    return {
      totalGoals: processedGoals.length,
      onTrack: processedGoals.filter(g => g.status === 'on_track').length,
      atRisk: processedGoals.filter(g => g.status === 'at_risk').length,
      offTrack: processedGoals.filter(g => g.status === 'off_track').length,
      goals: processedGoals,
    };
  }

  // ==========================================================================
  // Feature 8: Live Project Milestone Tracker
  // ==========================================================================

  /**
   * Create a milestone
   */
  async createMilestone(
    tenantId: string,
    data: {
      goalId?: string;
      teamId?: string;
      title: string;
      description?: string;
      milestoneType: string;
      plannedDate: Date;
      ownerId?: string;
      dependsOn?: string[];
    }
  ): Promise<any> {
    return prisma.projectMilestone.create({
      data: {
        tenantId,
        goalId: data.goalId,
        teamId: data.teamId,
        title: data.title,
        description: data.description,
        milestoneType: data.milestoneType,
        plannedDate: data.plannedDate,
        originalPlannedDate: data.plannedDate,
        ownerId: data.ownerId,
        dependsOn: data.dependsOn || [],
      },
    });
  }

  /**
   * Update milestone progress
   */
  async updateMilestoneProgress(
    milestoneId: string,
    update: {
      status?: string;
      progressPercentage?: number;
      actualDate?: Date;
      notes?: string;
    },
    triggeredById?: string
  ): Promise<MilestoneUpdate> {
    const milestone = await prisma.projectMilestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    const previousValue = {
      status: milestone.status,
      progressPercentage: milestone.progressPercentage,
    };

    const newStatus = update.status || milestone.status;
    const newProgress = update.progressPercentage ?? Number(milestone.progressPercentage);

    // Calculate delay
    const now = new Date();
    let delayDays = 0;
    if (milestone.plannedDate < now && newStatus !== 'completed') {
      delayDays = Math.ceil((now.getTime() - milestone.plannedDate.getTime()) / MS_PER_DAY);
    }

    // Calculate velocity-based ETA
    const velocityBasedEta = this.calculateVelocityBasedEta(milestone, newProgress);

    // Update milestone
    const updated = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        status: newStatus,
        progressPercentage: newProgress,
        actualDate: update.actualDate,
        delayDays,
        velocityBasedEta,
      },
    });

    // Record progress event
    await prisma.milestoneProgressEvent.create({
      data: {
        milestoneId,
        eventType: update.status ? 'status_change' : 'progress_update',
        previousValue,
        newValue: { status: newStatus, progressPercentage: newProgress },
        triggeredById,
        triggerSource: triggeredById ? 'manual' : 'auto_detection',
        notes: update.notes,
      },
    });

    return {
      milestoneId,
      status: newStatus as any,
      progressPercentage: newProgress,
      velocityBasedEta,
      delayDays,
    };
  }

  private calculateVelocityBasedEta(milestone: any, currentProgress: number): Date | undefined {
    if (currentProgress >= 100) return undefined;

    // Get progress history
    // For now, use a simple linear projection
    const now = new Date();
    const startDate = milestone.createdAt || now;
    const daysSinceStart = (now.getTime() - startDate.getTime()) / MS_PER_DAY;

    if (daysSinceStart <= 0 || currentProgress <= 0) return undefined;

    const dailyVelocity = currentProgress / daysSinceStart;
    const remainingProgress = 100 - currentProgress;
    const daysToComplete = remainingProgress / dailyVelocity;

    const eta = new Date(now);
    eta.setDate(eta.getDate() + Math.ceil(daysToComplete));

    return eta;
  }

  /**
   * Get milestones for a goal
   */
  async getGoalMilestones(tenantId: string, goalId: string): Promise<any[]> {
    return prisma.projectMilestone.findMany({
      where: { tenantId, goalId },
      include: {
        progressEvents: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { plannedDate: 'asc' },
    });
  }

  /**
   * Get milestone timeline with dynamic adjustments
   */
  async getMilestoneTimeline(tenantId: string, goalId?: string, teamId?: string): Promise<any> {
    const whereClause: any = { tenantId };
    if (goalId) whereClause.goalId = goalId;
    if (teamId) whereClause.teamId = teamId;

    const milestones = await prisma.projectMilestone.findMany({
      where: whereClause,
      include: {
        goal: { select: { title: true } },
        owner: { select: { firstName: true, lastName: true } },
      },
      orderBy: { plannedDate: 'asc' },
    });

    // Group by status
    const byStatus = {
      pending: milestones.filter(m => m.status === 'pending'),
      inProgress: milestones.filter(m => m.status === 'in_progress'),
      completed: milestones.filter(m => m.status === 'completed'),
      delayed: milestones.filter(m => m.status === 'delayed'),
      atRisk: milestones.filter(m => m.status === 'at_risk'),
    };

    // Calculate overall health
    const totalMilestones = milestones.length;
    const completedCount = byStatus.completed.length;
    const delayedCount = byStatus.delayed.length + byStatus.atRisk.length;

    const healthScore = totalMilestones > 0
      ? ((completedCount / totalMilestones) * 50 + ((totalMilestones - delayedCount) / totalMilestones) * 50)
      : 100;

    return {
      milestones,
      byStatus,
      summary: {
        total: totalMilestones,
        completed: completedCount,
        inProgress: byStatus.inProgress.length,
        pending: byStatus.pending.length,
        delayed: delayedCount,
        healthScore,
      },
    };
  }

  /**
   * Auto-detect milestones from goal progress patterns
   */
  async detectMilestones(tenantId: string, goalId: string): Promise<any[]> {
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        progressUpdates: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!goal || goal.progressUpdates.length < 3) {
      return [];
    }

    const detectedMilestones: any[] = [];

    // Detect significant progress jumps as milestones
    let lastProgress = 0;
    for (const update of goal.progressUpdates) {
      const currentProgress = Number(update.newProgress);
      const jump = currentProgress - lastProgress;

      // If progress jumped by more than 20%, consider it a milestone
      if (jump >= 20) {
        detectedMilestones.push({
          title: `Progress milestone: ${currentProgress}%`,
          description: `Detected significant progress from ${lastProgress}% to ${currentProgress}%`,
          milestoneType: 'checkpoint',
          plannedDate: update.createdAt,
          actualDate: update.createdAt,
          autoDetected: true,
          detectionConfidence: Math.min(100, jump * 2),
          status: 'completed',
          progressPercentage: 100,
        });
      }

      lastProgress = currentProgress;
    }

    return detectedMilestones;
  }
}

export const goalTrackingService = new GoalTrackingService();
