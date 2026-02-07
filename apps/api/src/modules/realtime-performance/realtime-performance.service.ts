/**
 * Real-Time Performance Tracking Service
 *
 * Implements Features 1-8:
 * 1. Hourly Performance Tracker
 * 2. 24/7 Activity Monitor with AI Detection
 * 3. Real-Time Goal Progress Dashboard
 * 4. Deadline Proximity Alert System
 * 5. Live Workload Distribution Analyzer
 * 6. Instant Performance Anomaly Detector
 * 7. Real-Time Communication Sentiment Gauge
 * 8. Live Project Milestone Tracker
 */

import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface HourlyMetrics {
  userId: string;
  tenantId: string;
  metricHour: Date;
  tasksCompleted: number;
  tasksCreated: number;
  activeMinutes: number;
  focusMinutes: number;
  meetingMinutes: number;
  goalUpdates: number;
  goalProgressDelta: number;
  interactionsCount: number;
  feedbackGiven: number;
  feedbackReceived: number;
  messagesSent: number;
  collaborationScore: number;
  productivityScore: number;
  engagementScore: number;
  performanceScore: number;
}

export interface ActivityEventInput {
  tenantId: string;
  userId: string;
  eventType: string;
  eventSubtype?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  durationSeconds?: number;
  isProductive?: boolean;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyType?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metricName: string;
  expectedValue: number;
  actualValue: number;
  deviationPercentage: number;
  zScore: number;
}

export interface WorkloadAnalysis {
  userId: string;
  workloadScore: number;
  balanceStatus: 'underloaded' | 'optimal' | 'heavy' | 'overloaded';
  activeGoals: number;
  activeTasks: number;
  pendingReviews: number;
  estimatedHoursRequired: number;
  availableHours: number;
  capacityUtilization: number;
  redistributionRecommended: boolean;
  recommendedActions: string[];
}

export interface SentimentAnalysis {
  overallScore: number;
  positivityRatio: number;
  collaborationSentiment: number;
  stressIndicators: number;
  moraleAlert: boolean;
  moraleAlertReason?: string;
}

export interface MilestoneUpdate {
  milestoneId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'at_risk';
  progressPercentage: number;
  velocityBasedEta?: Date;
  delayDays: number;
}

export interface GoalProgressDashboard {
  totalGoals: number;
  onTrack: number;
  atRisk: number;
  offTrack: number;
  goals: Array<{
    id: string;
    title: string;
    progress: number;
    status: 'on_track' | 'at_risk' | 'off_track';
    dueDate: Date | null;
    daysRemaining: number | null;
    trend: 'improving' | 'stable' | 'declining';
  }>;
}

export interface DeadlineAlertData {
  entityType: string;
  entityId: string;
  entityTitle: string;
  deadline: Date;
  currentProgress: number;
  completionProbability: number;
  alertLevel: 'info' | 'warning' | 'urgent' | 'overdue';
}

// ============================================================================
// Real-Time Performance Service
// ============================================================================

export class RealtimePerformanceService extends EventEmitter {
  private anomalyThresholds = {
    productivity: { low: 1.5, medium: 2.0, high: 2.5, critical: 3.0 },
    engagement: { low: 1.5, medium: 2.0, high: 2.5, critical: 3.0 },
    activity: { low: 1.5, medium: 2.0, high: 2.5, critical: 3.0 },
  };

  constructor() {
    super();
  }

  // ==========================================================================
  // Feature 1: Hourly Performance Tracker
  // ==========================================================================

  /**
   * Record hourly performance metrics
   */
  async recordHourlyMetrics(metrics: HourlyMetrics): Promise<void> {
    const hourStart = new Date(metrics.metricHour);
    hourStart.setMinutes(0, 0, 0);

    await prisma.hourlyPerformanceMetric.upsert({
      where: {
        tenantId_userId_metricHour: {
          tenantId: metrics.tenantId,
          userId: metrics.userId,
          metricHour: hourStart,
        },
      },
      create: {
        tenantId: metrics.tenantId,
        userId: metrics.userId,
        metricHour: hourStart,
        tasksCompleted: metrics.tasksCompleted,
        tasksCreated: metrics.tasksCreated,
        taskCompletionRate: metrics.tasksCreated > 0
          ? (metrics.tasksCompleted / metrics.tasksCreated) * 100
          : 0,
        activeMinutes: metrics.activeMinutes,
        focusMinutes: metrics.focusMinutes,
        meetingMinutes: metrics.meetingMinutes,
        goalUpdates: metrics.goalUpdates,
        goalProgressDelta: metrics.goalProgressDelta,
        interactionsCount: metrics.interactionsCount,
        feedbackGiven: metrics.feedbackGiven,
        feedbackReceived: metrics.feedbackReceived,
        messagesSent: metrics.messagesSent,
        collaborationScore: metrics.collaborationScore,
        productivityScore: metrics.productivityScore,
        engagementScore: metrics.engagementScore,
        performanceScore: metrics.performanceScore,
      },
      update: {
        tasksCompleted: { increment: metrics.tasksCompleted },
        tasksCreated: { increment: metrics.tasksCreated },
        activeMinutes: { increment: metrics.activeMinutes },
        focusMinutes: { increment: metrics.focusMinutes },
        meetingMinutes: { increment: metrics.meetingMinutes },
        goalUpdates: { increment: metrics.goalUpdates },
        goalProgressDelta: { increment: metrics.goalProgressDelta },
        interactionsCount: { increment: metrics.interactionsCount },
        feedbackGiven: { increment: metrics.feedbackGiven },
        feedbackReceived: { increment: metrics.feedbackReceived },
        messagesSent: { increment: metrics.messagesSent },
      },
    });

    // Emit event for real-time dashboard updates
    this.emit('hourlyMetricsUpdated', { userId: metrics.userId, hour: hourStart });
  }

  /**
   * Get hourly metrics for a user
   */
  async getHourlyMetrics(
    tenantId: string,
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    return prisma.hourlyPerformanceMetric.findMany({
      where: {
        tenantId,
        userId,
        metricHour: {
          gte: startTime,
          lte: endTime,
        },
      },
      orderBy: { metricHour: 'asc' },
    });
  }

  /**
   * Get real-time performance snapshot for a user
   */
  async getCurrentPerformanceSnapshot(tenantId: string, userId: string): Promise<any> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Get today's hourly metrics
    const hourlyMetrics = await prisma.hourlyPerformanceMetric.findMany({
      where: {
        tenantId,
        userId,
        metricHour: { gte: todayStart },
      },
      orderBy: { metricHour: 'desc' },
    });

    // Calculate today's aggregates
    const todayStats = {
      tasksCompleted: 0,
      tasksCreated: 0,
      activeMinutes: 0,
      focusMinutes: 0,
      meetingMinutes: 0,
      avgProductivityScore: 0,
      avgEngagementScore: 0,
    };

    if (hourlyMetrics.length > 0) {
      hourlyMetrics.forEach(m => {
        todayStats.tasksCompleted += m.tasksCompleted;
        todayStats.tasksCreated += m.tasksCreated;
        todayStats.activeMinutes += m.activeMinutes;
        todayStats.focusMinutes += m.focusMinutes;
        todayStats.meetingMinutes += m.meetingMinutes;
      });

      const validProductivity = hourlyMetrics.filter(m => m.productivityScore !== null);
      const validEngagement = hourlyMetrics.filter(m => m.engagementScore !== null);

      todayStats.avgProductivityScore = validProductivity.length > 0
        ? validProductivity.reduce((sum, m) => sum + Number(m.productivityScore), 0) / validProductivity.length
        : 0;

      todayStats.avgEngagementScore = validEngagement.length > 0
        ? validEngagement.reduce((sum, m) => sum + Number(m.engagementScore), 0) / validEngagement.length
        : 0;
    }

    // Get current hour metrics
    const currentHour = new Date(now);
    currentHour.setMinutes(0, 0, 0);

    const currentHourMetric = hourlyMetrics.find(
      m => m.metricHour.getTime() === currentHour.getTime()
    );

    return {
      timestamp: now,
      today: todayStats,
      currentHour: currentHourMetric || null,
      hourlyTrend: hourlyMetrics.slice(0, 8), // Last 8 hours
    };
  }

  // ==========================================================================
  // Feature 2: 24/7 Activity Monitor with AI Detection
  // ==========================================================================

  /**
   * Record an activity event
   */
  async recordActivityEvent(event: ActivityEventInput): Promise<void> {
    await prisma.activityEvent.create({
      data: {
        tenantId: event.tenantId,
        userId: event.userId,
        eventType: event.eventType,
        eventSubtype: event.eventSubtype,
        entityType: event.entityType,
        entityId: event.entityId,
        metadata: event.metadata || {},
        durationSeconds: event.durationSeconds,
        isProductive: event.isProductive ?? true,
      },
    });

    // Emit event for real-time monitoring
    this.emit('activityRecorded', event);

    // Check for anomalies in activity patterns
    await this.checkActivityAnomalies(event.tenantId, event.userId);
  }

  /**
   * Get activity stream for a user
   */
  async getActivityStream(
    tenantId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    return prisma.activityEvent.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get activity summary for a time range
   */
  async getActivitySummary(
    tenantId: string,
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<any> {
    const events = await prisma.activityEvent.findMany({
      where: {
        tenantId,
        userId,
        createdAt: { gte: startTime, lte: endTime },
      },
    });

    // Group by event type
    const byType: Record<string, number> = {};
    let totalDuration = 0;
    let productiveTime = 0;

    events.forEach(event => {
      byType[event.eventType] = (byType[event.eventType] || 0) + 1;
      if (event.durationSeconds) {
        totalDuration += event.durationSeconds;
        if (event.isProductive) {
          productiveTime += event.durationSeconds;
        }
      }
    });

    return {
      totalEvents: events.length,
      byType,
      totalDurationMinutes: Math.round(totalDuration / 60),
      productiveMinutes: Math.round(productiveTime / 60),
      productivityRatio: totalDuration > 0 ? productiveTime / totalDuration : 0,
    };
  }

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
        ? Math.ceil((goal.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Calculate expected progress based on time elapsed
      let expectedProgress = 0;
      if (goal.startDate && goal.dueDate) {
        const totalDays = (goal.dueDate.getTime() - goal.startDate.getTime()) / (1000 * 60 * 60 * 24);
        const elapsedDays = (now.getTime() - goal.startDate.getTime()) / (1000 * 60 * 60 * 24);
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
  // Feature 4: Deadline Proximity Alert System
  // ==========================================================================

  /**
   * Check and generate deadline alerts
   */
  async checkDeadlineAlerts(tenantId: string, userId: string): Promise<DeadlineAlertData[]> {
    const now = new Date();
    const alerts: DeadlineAlertData[] = [];

    // Check goals with deadlines
    const goals = await prisma.goal.findMany({
      where: {
        tenantId,
        ownerId: userId,
        deletedAt: null,
        status: 'ACTIVE',
        dueDate: { not: null },
      },
    });

    for (const goal of goals) {
      if (!goal.dueDate) continue;

      const daysUntil = Math.ceil(
        (goal.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const hoursUntil = Math.ceil(
        (goal.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      );

      // Calculate completion probability
      const completionProbability = this.calculateCompletionProbability(
        goal.progress,
        daysUntil,
        goal.startDate ? (now.getTime() - goal.startDate.getTime()) / (1000 * 60 * 60 * 24) : 0
      );

      // Determine alert level
      let alertLevel: 'info' | 'warning' | 'urgent' | 'overdue';
      if (daysUntil < 0) {
        alertLevel = 'overdue';
      } else if (daysUntil <= 1 || completionProbability < 30) {
        alertLevel = 'urgent';
      } else if (daysUntil <= 7 || completionProbability < 60) {
        alertLevel = 'warning';
      } else {
        alertLevel = 'info';
      }

      // Only alert for warning level and above
      if (alertLevel !== 'info') {
        alerts.push({
          entityType: 'goal',
          entityId: goal.id,
          entityTitle: goal.title,
          deadline: goal.dueDate,
          currentProgress: goal.progress,
          completionProbability,
          alertLevel,
        });

        // Create or update deadline alert in database
        await this.upsertDeadlineAlert(tenantId, userId, {
          entityType: 'goal',
          entityId: goal.id,
          entityTitle: goal.title,
          deadline: goal.dueDate,
          daysUntilDeadline: daysUntil,
          hoursUntilDeadline: hoursUntil,
          currentProgress: goal.progress,
          completionProbability,
          alertLevel,
        });
      }
    }

    // Check pending reviews
    const reviews = await prisma.review.findMany({
      where: {
        tenantId,
        reviewerId: userId,
        status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
      },
      include: {
        cycle: true,
      },
    });

    for (const review of reviews) {
      if (!review.cycle.managerReviewEnd) continue;

      const daysUntil = Math.ceil(
        (review.cycle.managerReviewEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntil <= 7) {
        let alertLevel: 'info' | 'warning' | 'urgent' | 'overdue';
        if (daysUntil < 0) alertLevel = 'overdue';
        else if (daysUntil <= 2) alertLevel = 'urgent';
        else alertLevel = 'warning';

        alerts.push({
          entityType: 'review',
          entityId: review.id,
          entityTitle: `Review for ${review.cycle.name}`,
          deadline: review.cycle.managerReviewEnd,
          currentProgress: review.status === 'IN_PROGRESS' ? 50 : 0,
          completionProbability: daysUntil <= 0 ? 0 : Math.max(0, 100 - (7 - daysUntil) * 15),
          alertLevel,
        });
      }
    }

    // Emit event for real-time alerts
    if (alerts.length > 0) {
      this.emit('deadlineAlerts', { userId, alerts });
    }

    return alerts;
  }

  private calculateCompletionProbability(
    currentProgress: number,
    daysRemaining: number,
    daysElapsed: number
  ): number {
    if (daysRemaining <= 0) return currentProgress >= 100 ? 100 : 0;
    if (currentProgress >= 100) return 100;

    const totalDays = daysElapsed + daysRemaining;
    const expectedProgress = (daysElapsed / totalDays) * 100;
    const progressRatio = currentProgress / Math.max(1, expectedProgress);

    // Probability based on progress ratio and time remaining
    const baseProb = Math.min(100, progressRatio * 100);
    const timePenalty = daysRemaining < 7 ? (7 - daysRemaining) * 5 : 0;

    return Math.max(0, Math.min(100, baseProb - timePenalty));
  }

  private async upsertDeadlineAlert(
    tenantId: string,
    userId: string,
    data: any
  ): Promise<void> {
    const existing = await prisma.deadlineAlert.findFirst({
      where: {
        tenantId,
        userId,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    });

    if (existing) {
      await prisma.deadlineAlert.update({
        where: { id: existing.id },
        data: {
          daysUntilDeadline: data.daysUntilDeadline,
          hoursUntilDeadline: data.hoursUntilDeadline,
          currentProgress: data.currentProgress,
          completionProbability: data.completionProbability,
          alertLevel: data.alertLevel,
          requiredDailyProgress: data.daysUntilDeadline > 0
            ? (100 - data.currentProgress) / data.daysUntilDeadline
            : null,
        },
      });
    } else {
      await prisma.deadlineAlert.create({
        data: {
          tenantId,
          userId,
          entityType: data.entityType,
          entityId: data.entityId,
          entityTitle: data.entityTitle,
          deadline: data.deadline,
          daysUntilDeadline: data.daysUntilDeadline,
          hoursUntilDeadline: data.hoursUntilDeadline,
          currentProgress: data.currentProgress,
          completionProbability: data.completionProbability,
          alertLevel: data.alertLevel,
          requiredDailyProgress: data.daysUntilDeadline > 0
            ? (100 - data.currentProgress) / data.daysUntilDeadline
            : null,
        },
      });
    }
  }

  /**
   * Get active deadline alerts for a user
   */
  async getActiveDeadlineAlerts(tenantId: string, userId: string): Promise<any[]> {
    return prisma.deadlineAlert.findMany({
      where: {
        tenantId,
        userId,
        isAcknowledged: false,
        OR: [
          { isSnoozed: false },
          { snoozedUntil: { lt: new Date() } },
        ],
      },
      orderBy: [
        { alertLevel: 'desc' },
        { deadline: 'asc' },
      ],
    });
  }

  /**
   * Acknowledge a deadline alert
   */
  async acknowledgeDeadlineAlert(tenantId: string, userId: string, alertId: string): Promise<void> {
    await prisma.deadlineAlert.updateMany({
      where: {
        id: alertId,
        tenantId,
        userId,
      },
      data: {
        isAcknowledged: true,
      },
    });
  }

  /**
   * Snooze a deadline alert
   */
  async snoozeDeadlineAlert(tenantId: string, userId: string, alertId: string, hours: number): Promise<void> {
    const snoozedUntil = new Date();
    snoozedUntil.setHours(snoozedUntil.getHours() + hours);

    await prisma.deadlineAlert.updateMany({
      where: {
        id: alertId,
        tenantId,
        userId,
      },
      data: {
        isSnoozed: true,
        snoozedUntil,
      },
    });
  }

  // ==========================================================================
  // Feature 5: Live Workload Distribution Analyzer
  // ==========================================================================

  /**
   * Analyze workload for a user
   */
  async analyzeWorkload(tenantId: string, userId: string): Promise<WorkloadAnalysis> {
    // Count active goals
    const activeGoals = await prisma.goal.count({
      where: {
        tenantId,
        ownerId: userId,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    // Count pending reviews
    const pendingReviews = await prisma.review.count({
      where: {
        tenantId,
        reviewerId: userId,
        status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
      },
    });

    // Get today's meetings (from activity events)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const meetingEvents = await prisma.activityEvent.count({
      where: {
        tenantId,
        userId,
        eventType: 'meeting',
        createdAt: { gte: todayStart },
      },
    });

    // Calculate estimated hours required
    const goalHoursPerWeek = activeGoals * 2; // Estimate 2 hours per active goal per week
    const reviewHours = pendingReviews * 1.5; // Estimate 1.5 hours per review
    const meetingHours = meetingEvents * 0.5; // Average 30 min per meeting

    const estimatedHoursRequired = goalHoursPerWeek + reviewHours + meetingHours;
    const availableHours = 40; // Standard work week
    const capacityUtilization = (estimatedHoursRequired / availableHours) * 100;

    // Calculate workload score (0-100, higher = more loaded)
    const workloadScore = Math.min(100, capacityUtilization);

    // Determine balance status
    let balanceStatus: 'underloaded' | 'optimal' | 'heavy' | 'overloaded';
    if (workloadScore < 40) {
      balanceStatus = 'underloaded';
    } else if (workloadScore < 70) {
      balanceStatus = 'optimal';
    } else if (workloadScore < 90) {
      balanceStatus = 'heavy';
    } else {
      balanceStatus = 'overloaded';
    }

    // Generate recommendations
    const recommendedActions: string[] = [];
    if (balanceStatus === 'overloaded') {
      recommendedActions.push('Consider delegating some goals to team members');
      recommendedActions.push('Prioritize and defer lower-priority tasks');
      recommendedActions.push('Block focus time on calendar');
    } else if (balanceStatus === 'underloaded') {
      recommendedActions.push('Take on stretch assignments');
      recommendedActions.push('Offer to help team members with their goals');
      recommendedActions.push('Focus on skill development activities');
    }

    const redistributionRecommended = balanceStatus === 'overloaded' || balanceStatus === 'underloaded';

    // Save snapshot
    await prisma.workloadSnapshot.create({
      data: {
        tenantId,
        userId,
        activeGoals,
        activeTasks: 0, // Would come from task management system
        pendingReviews,
        scheduledMeetingsToday: meetingEvents,
        estimatedHoursRequired,
        availableHours,
        capacityUtilization,
        workloadScore,
        balanceStatus,
        redistributionRecommended,
        recommendedActions,
      },
    });

    // Emit event
    this.emit('workloadAnalyzed', { userId, workloadScore, balanceStatus });

    return {
      userId,
      workloadScore,
      balanceStatus,
      activeGoals,
      activeTasks: 0,
      pendingReviews,
      estimatedHoursRequired,
      availableHours,
      capacityUtilization,
      redistributionRecommended,
      recommendedActions,
    };
  }

  /**
   * Get team workload distribution
   */
  async getTeamWorkloadDistribution(tenantId: string, managerId: string): Promise<any> {
    // Check if user is an admin — if so, show all users in the tenant
    const requestingUser = await prisma.user.findUnique({
      where: { id: managerId },
      include: {
        userRoles: {
          include: { role: { select: { name: true } } },
        },
      },
    });

    const isAdmin = requestingUser?.userRoles?.some(
      (ur: any) => ur.role.name === 'Tenant Admin' || ur.role.name === 'HR Admin' || ur.role.name === 'ADMIN'
    );

    // Get team members — for admin, get all active users; for manager, get direct reports
    const teamMembers = await prisma.user.findMany({
      where: {
        tenantId,
        ...(isAdmin ? {} : { managerId }),
        isActive: true,
        deletedAt: null,
        ...(isAdmin ? { NOT: { id: managerId } } : {}),
      },
      select: { id: true, firstName: true, lastName: true },
    });

    const distributions = await Promise.all(
      teamMembers.map(async member => {
        const analysis = await this.analyzeWorkload(tenantId, member.id);
        return {
          userId: member.id,
          name: `${member.firstName} ${member.lastName}`,
          ...analysis,
        };
      })
    );

    // Calculate team metrics
    const avgWorkload = distributions.length > 0
      ? distributions.reduce((sum, d) => sum + d.workloadScore, 0) / distributions.length
      : 0;
    const workloadVariance = distributions.length > 0
      ? this.calculateVariance(distributions.map(d => d.workloadScore))
      : 0;

    // Calculate Gini coefficient for workload inequality
    const giniCoefficient = distributions.length > 0
      ? this.calculateGiniCoefficient(distributions.map(d => d.workloadScore))
      : 0;

    return {
      teamMembers: distributions,
      teamMetrics: {
        avgWorkloadScore: avgWorkload,
        workloadVariance,
        giniCoefficient,
        overloadedCount: distributions.filter(d => d.balanceStatus === 'overloaded').length,
        optimalCount: distributions.filter(d => d.balanceStatus === 'optimal').length,
        underloadedCount: distributions.filter(d => d.balanceStatus === 'underloaded').length,
      },
      redistributionOpportunities: this.findRedistributionOpportunities(distributions),
    };
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private calculateGiniCoefficient(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    let sumOfDifferences = 0;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sumOfDifferences += Math.abs(sorted[i] - sorted[j]);
      }
    }

    const mean = sorted.reduce((a, b) => a + b, 0) / n;
    return sumOfDifferences / (2 * n * n * mean);
  }

  private findRedistributionOpportunities(distributions: any[]): any[] {
    const overloaded = distributions.filter(d => d.balanceStatus === 'overloaded');
    const underloaded = distributions.filter(d => d.balanceStatus === 'underloaded');

    const opportunities: any[] = [];

    for (const over of overloaded) {
      for (const under of underloaded) {
        opportunities.push({
          from: { userId: over.userId, name: over.name },
          to: { userId: under.userId, name: under.name },
          potentialTransfer: Math.min(over.activeGoals, 2),
          impact: `Could reduce ${over.name}'s workload by ~${Math.round((2 / over.activeGoals) * over.workloadScore)}%`,
        });
      }
    }

    return opportunities;
  }

  // ==========================================================================
  // Feature 6: Instant Performance Anomaly Detector
  // ==========================================================================

  /**
   * Detect performance anomalies for a user
   */
  async detectAnomalies(tenantId: string, userId: string): Promise<AnomalyDetectionResult[]> {
    const anomalies: AnomalyDetectionResult[] = [];
    const now = new Date();

    // Get baseline data (last 30 days)
    const baselineStart = new Date(now);
    baselineStart.setDate(baselineStart.getDate() - 30);

    const baselineMetrics = await prisma.dailyPerformanceMetric.findMany({
      where: {
        tenantId,
        userId,
        metricDate: { gte: baselineStart, lt: now },
      },
    });

    if (baselineMetrics.length < 7) {
      // Not enough data for baseline
      return [];
    }

    // Get recent data (last 7 days)
    const recentStart = new Date(now);
    recentStart.setDate(recentStart.getDate() - 7);

    const recentMetrics = await prisma.dailyPerformanceMetric.findMany({
      where: {
        tenantId,
        userId,
        metricDate: { gte: recentStart },
      },
    });

    // Calculate baseline statistics
    const productivityBaseline = this.calculateStats(
      baselineMetrics.map(m => Number(m.avgProductivityScore || 0)).filter(v => v > 0)
    );

    const engagementBaseline = this.calculateStats(
      baselineMetrics.map(m => Number(m.avgEngagementScore || 0)).filter(v => v > 0)
    );

    const activityBaseline = this.calculateStats(
      baselineMetrics.map(m => m.totalActiveMinutes).filter(v => v > 0)
    );

    // Check recent values for anomalies
    for (const metric of recentMetrics) {
      // Productivity anomaly
      if (metric.avgProductivityScore && productivityBaseline.stdDev > 0) {
        const zScore = (Number(metric.avgProductivityScore) - productivityBaseline.mean) / productivityBaseline.stdDev;
        if (Math.abs(zScore) >= this.anomalyThresholds.productivity.low) {
          anomalies.push(this.createAnomaly(
            'productivity',
            'productivity_score',
            productivityBaseline.mean,
            Number(metric.avgProductivityScore),
            zScore
          ));
        }
      }

      // Engagement anomaly
      if (metric.avgEngagementScore && engagementBaseline.stdDev > 0) {
        const zScore = (Number(metric.avgEngagementScore) - engagementBaseline.mean) / engagementBaseline.stdDev;
        if (Math.abs(zScore) >= this.anomalyThresholds.engagement.low) {
          anomalies.push(this.createAnomaly(
            'engagement',
            'engagement_score',
            engagementBaseline.mean,
            Number(metric.avgEngagementScore),
            zScore
          ));
        }
      }

      // Activity anomaly
      if (activityBaseline.stdDev > 0) {
        const zScore = (metric.totalActiveMinutes - activityBaseline.mean) / activityBaseline.stdDev;
        if (Math.abs(zScore) >= this.anomalyThresholds.activity.low) {
          anomalies.push(this.createAnomaly(
            'activity',
            'active_minutes',
            activityBaseline.mean,
            metric.totalActiveMinutes,
            zScore
          ));
        }
      }
    }

    // Store detected anomalies
    for (const anomaly of anomalies.filter(a => a.isAnomaly)) {
      await prisma.performanceAnomaly.create({
        data: {
          tenantId,
          userId,
          anomalyType: anomaly.anomalyType!,
          severity: anomaly.severity!,
          metricName: anomaly.metricName,
          expectedValue: anomaly.expectedValue,
          actualValue: anomaly.actualValue,
          deviationPercentage: anomaly.deviationPercentage,
          zScore: anomaly.zScore,
          detectionWindowStart: recentStart,
          detectionWindowEnd: now,
          baselinePeriodDays: 30,
        },
      });

      // Emit alert
      this.emit('anomalyDetected', { userId, anomaly });
    }

    return anomalies;
  }

  private calculateStats(values: number[]): { mean: number; stdDev: number } {
    if (values.length === 0) return { mean: 0, stdDev: 0 };

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
  }

  private createAnomaly(
    type: string,
    metricName: string,
    expected: number,
    actual: number,
    zScore: number
  ): AnomalyDetectionResult {
    const absZScore = Math.abs(zScore);
    let severity: 'low' | 'medium' | 'high' | 'critical' | undefined;

    if (absZScore >= 3.0) severity = 'critical';
    else if (absZScore >= 2.5) severity = 'high';
    else if (absZScore >= 2.0) severity = 'medium';
    else if (absZScore >= 1.5) severity = 'low';

    return {
      isAnomaly: severity !== undefined,
      anomalyType: type,
      severity,
      metricName,
      expectedValue: Math.round(expected * 100) / 100,
      actualValue: Math.round(actual * 100) / 100,
      deviationPercentage: Math.round(((actual - expected) / expected) * 100 * 100) / 100,
      zScore: Math.round(zScore * 100) / 100,
    };
  }

  private async checkActivityAnomalies(tenantId: string, userId: string): Promise<void> {
    // This is called after each activity event to check for real-time anomalies
    // For now, we'll check if there's unusual inactivity during work hours

    const now = new Date();
    const hourOfDay = now.getHours();

    // Only check during typical work hours (9 AM - 6 PM)
    if (hourOfDay < 9 || hourOfDay > 18) return;

    // Check activity in the last hour
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentActivity = await prisma.activityEvent.count({
      where: {
        tenantId,
        userId,
        createdAt: { gte: oneHourAgo },
      },
    });

    // If no activity in the last hour during work hours, flag as potential anomaly
    if (recentActivity === 0) {
      this.emit('inactivityAlert', {
        userId,
        duration: 60,
        message: 'No activity detected in the past hour during work hours',
      });
    }
  }

  // ==========================================================================
  // Feature 7: Real-Time Communication Sentiment Gauge
  // ==========================================================================

  /**
   * Analyze communication sentiment for a user
   */
  async analyzeSentiment(
    tenantId: string,
    userId: string,
    periodDays: number = 7
  ): Promise<SentimentAnalysis> {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - periodDays);

    // Get feedback given and received
    const feedbackGiven = await prisma.feedback.findMany({
      where: {
        tenantId,
        fromUserId: userId,
        createdAt: { gte: periodStart },
      },
      select: { type: true, sentimentScore: true },
    });

    const feedbackReceived = await prisma.feedback.findMany({
      where: {
        tenantId,
        toUserId: userId,
        createdAt: { gte: periodStart },
      },
      select: { type: true, sentimentScore: true },
    });

    // Get goal comments
    const goalComments = await prisma.goalComment.findMany({
      where: {
        authorId: userId,
        createdAt: { gte: periodStart },
      },
    });

    // Calculate sentiment scores
    const feedbackSentiment = this.calculateFeedbackSentiment([...feedbackGiven, ...feedbackReceived]);

    // Simple sentiment analysis based on feedback types
    const positiveCount = feedbackGiven.filter(f =>
      f.type === 'PRAISE' || f.type === 'RECOGNITION'
    ).length;
    const constructiveCount = feedbackGiven.filter(f => f.type === 'CONSTRUCTIVE').length;
    const totalFeedback = feedbackGiven.length;

    const positivityRatio = totalFeedback > 0 ? positiveCount / totalFeedback : 0.5;

    // Collaboration sentiment based on interaction frequency
    const collaborationSentiment = Math.min(1, (feedbackGiven.length + feedbackReceived.length) / 10);

    // Stress indicators (negative if lots of missed deadlines or declining metrics)
    const deadlineAlerts = await prisma.deadlineAlert.count({
      where: {
        tenantId,
        userId,
        alertLevel: { in: ['urgent', 'overdue'] },
        createdAt: { gte: periodStart },
      },
    });
    const stressIndicators = Math.min(1, deadlineAlerts / 5);

    // Overall sentiment score (-1 to 1)
    const overallScore = (positivityRatio * 2 - 1) * 0.4 +
      (collaborationSentiment * 2 - 1) * 0.3 +
      (1 - stressIndicators * 2) * 0.3;

    // Morale alert if sentiment is consistently negative
    const moraleAlert = overallScore < -0.3 || stressIndicators > 0.6;
    const moraleAlertReason = moraleAlert
      ? stressIndicators > 0.6
        ? 'High number of deadline alerts indicating potential burnout'
        : 'Low overall sentiment score in recent communications'
      : undefined;

    // Save analysis
    await prisma.communicationSentiment.create({
      data: {
        tenantId,
        userId,
        analysisPeriodStart: periodStart,
        analysisPeriodEnd: now,
        overallSentimentScore: overallScore,
        positivityRatio,
        collaborationSentiment,
        stressIndicators,
        feedbackSentiment,
        moraleAlert,
        moraleAlertReason,
        communicationFrequency: totalFeedback > 5 ? 'high' : totalFeedback > 2 ? 'normal' : 'low',
        engagementLevel: collaborationSentiment > 0.7 ? 'highly_engaged' :
          collaborationSentiment > 0.3 ? 'normal' : 'disengaged',
      },
    });

    // Emit alert if morale is low
    if (moraleAlert) {
      this.emit('moraleAlert', { userId, overallScore, reason: moraleAlertReason });
    }

    return {
      overallScore,
      positivityRatio,
      collaborationSentiment,
      stressIndicators,
      moraleAlert,
      moraleAlertReason,
    };
  }

  private calculateFeedbackSentiment(feedback: any[]): number {
    if (feedback.length === 0) return 0;

    const scores = feedback.map(f => {
      if (f.sentimentScore) return Number(f.sentimentScore);
      if (f.type === 'PRAISE' || f.type === 'RECOGNITION') return 1;
      if (f.type === 'CONSTRUCTIVE') return 0;
      return 0;
    });

    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  /**
   * Get team morale snapshot
   */
  async getTeamMorale(tenantId: string, managerId: string): Promise<any> {
    // Get team members
    const teamMembers = await prisma.user.findMany({
      where: {
        tenantId,
        managerId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, firstName: true, lastName: true },
    });

    const sentiments = await Promise.all(
      teamMembers.map(async member => {
        const analysis = await this.analyzeSentiment(tenantId, member.id);
        return {
          userId: member.id,
          name: `${member.firstName} ${member.lastName}`,
          ...analysis,
        };
      })
    );

    const avgSentiment = sentiments.length > 0
      ? sentiments.reduce((sum, s) => sum + s.overallScore, 0) / sentiments.length
      : 0;
    const moraleIndex = ((avgSentiment + 1) / 2) * 100; // Convert -1 to 1 scale to 0-100

    return {
      teamMembers: sentiments,
      teamMetrics: {
        avgSentimentScore: avgSentiment,
        moraleIndex,
        highMoraleCount: sentiments.filter(s => s.overallScore > 0.3).length,
        neutralMoraleCount: sentiments.filter(s => s.overallScore >= -0.3 && s.overallScore <= 0.3).length,
        lowMoraleCount: sentiments.filter(s => s.overallScore < -0.3).length,
        membersWithAlerts: sentiments.filter(s => s.moraleAlert).length,
      },
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
      delayDays = Math.ceil((now.getTime() - milestone.plannedDate.getTime()) / (1000 * 60 * 60 * 24));
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

    // Emit event for real-time updates
    this.emit('milestoneUpdated', {
      milestoneId,
      status: newStatus,
      progressPercentage: newProgress,
      delayDays,
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
    const daysSinceStart = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

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

  // ==========================================================================
  // Feature 9: Activity Heatmap
  // ==========================================================================

  /**
   * Get activity heatmap data for a user (GitHub-style contribution grid)
   * Aggregates goals completed, feedback given/received, reviews, and daily metrics
   */
  async getActivityHeatmap(
    tenantId: string,
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; count: number; level: number }>> {
    // Get daily performance metrics
    const dailyMetrics = await prisma.dailyPerformanceMetric.findMany({
      where: {
        tenantId,
        userId,
        metricDate: { gte: startDate, lte: endDate },
      },
      select: {
        metricDate: true,
        totalActiveMinutes: true,
        totalGoalUpdates: true,
        totalTasksCompleted: true,
        totalFeedbackGiven: true,
        totalFeedbackReceived: true,
        totalInteractions: true,
      },
    });

    // Get goal progress updates by date
    const goalUpdates = await prisma.goalProgressUpdate.findMany({
      where: {
        goal: { tenantId, ownerId: userId },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true },
    });

    // Get feedback given by date
    const feedbackGiven = await prisma.feedback.findMany({
      where: {
        tenantId,
        fromUserId: userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true },
    });

    // Get feedback received by date
    const feedbackReceived = await prisma.feedback.findMany({
      where: {
        tenantId,
        toUserId: userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true },
    });

    // Get goal completions by date
    const goalCompletions = await prisma.goal.findMany({
      where: {
        tenantId,
        ownerId: userId,
        completedAt: { gte: startDate, lte: endDate },
      },
      select: { completedAt: true },
    });

    // Build daily activity map
    const activityMap = new Map<string, number>();

    // Helper to add to map
    const addToDate = (date: Date, count: number = 1) => {
      const key = date.toISOString().split('T')[0];
      activityMap.set(key, (activityMap.get(key) || 0) + count);
    };

    // Aggregate daily metrics
    for (const m of dailyMetrics) {
      const key = m.metricDate.toISOString().split('T')[0];
      const activity = m.totalGoalUpdates + m.totalTasksCompleted + m.totalFeedbackGiven + m.totalFeedbackReceived + m.totalInteractions;
      if (activity > 0) {
        activityMap.set(key, (activityMap.get(key) || 0) + activity);
      }
    }

    // Add individual events
    goalUpdates.forEach(u => addToDate(u.createdAt));
    feedbackGiven.forEach(f => addToDate(f.createdAt));
    feedbackReceived.forEach(f => addToDate(f.createdAt));
    goalCompletions.forEach(g => { if (g.completedAt) addToDate(g.completedAt, 2); }); // Completion counts double

    // Build result array covering all dates in range
    const result: Array<{ date: string; count: number; level: number }> = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    // Find max for level calculation
    const maxCount = Math.max(...Array.from(activityMap.values()), 1);

    while (current <= endDate) {
      const key = current.toISOString().split('T')[0];
      const count = activityMap.get(key) || 0;

      // Calculate level (0-4) based on relative activity
      let level = 0;
      if (count > 0) {
        const ratio = count / maxCount;
        if (ratio > 0.75) level = 4;
        else if (ratio > 0.5) level = 3;
        else if (ratio > 0.25) level = 2;
        else level = 1;
      }

      result.push({ date: key, count, level });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  /**
   * Get team activity heatmap (aggregate + per-member)
   */
  async getTeamActivityHeatmap(
    tenantId: string,
    managerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    teamAggregate: Array<{ date: string; count: number; level: number }>;
    members: Array<{
      userId: string;
      name: string;
      heatmap: Array<{ date: string; count: number; level: number }>;
    }>;
  }> {
    // Check if user is admin
    const requestingUser = await prisma.user.findUnique({
      where: { id: managerId },
      include: {
        userRoles: {
          include: { role: { select: { name: true } } },
        },
      },
    });

    const isAdmin = requestingUser?.userRoles?.some(
      (ur: any) => ur.role.name === 'Tenant Admin' || ur.role.name === 'HR Admin' || ur.role.name === 'ADMIN'
    );

    // Get team members
    const teamMembers = await prisma.user.findMany({
      where: {
        tenantId,
        ...(isAdmin ? {} : { managerId }),
        isActive: true,
        deletedAt: null,
        ...(isAdmin ? { NOT: { id: managerId } } : {}),
      },
      select: { id: true, firstName: true, lastName: true },
    });

    // Get heatmap for each member
    const memberHeatmaps = await Promise.all(
      teamMembers.map(async (member) => {
        const heatmap = await this.getActivityHeatmap(tenantId, member.id, startDate, endDate);
        return {
          userId: member.id,
          name: `${member.firstName} ${member.lastName}`,
          heatmap,
        };
      })
    );

    // Build team aggregate
    const aggregateMap = new Map<string, number>();
    for (const member of memberHeatmaps) {
      for (const day of member.heatmap) {
        aggregateMap.set(day.date, (aggregateMap.get(day.date) || 0) + day.count);
      }
    }

    const maxCount = Math.max(...Array.from(aggregateMap.values()), 1);
    const teamAggregate: Array<{ date: string; count: number; level: number }> = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    while (current <= endDate) {
      const key = current.toISOString().split('T')[0];
      const count = aggregateMap.get(key) || 0;
      let level = 0;
      if (count > 0) {
        const ratio = count / maxCount;
        if (ratio > 0.75) level = 4;
        else if (ratio > 0.5) level = 3;
        else if (ratio > 0.25) level = 2;
        else level = 1;
      }
      teamAggregate.push({ date: key, count, level });
      current.setDate(current.getDate() + 1);
    }

    return { teamAggregate, members: memberHeatmaps };
  }
}

// Export singleton instance
export const realtimePerformanceService = new RealtimePerformanceService();
