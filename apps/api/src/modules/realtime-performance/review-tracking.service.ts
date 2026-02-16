/**
 * Review Tracking Sub-Service
 *
 * Handles hourly performance metrics, activity monitoring, workload
 * analysis, team workload distribution, and activity heatmaps.
 *
 * Covers:
 *  - Feature 1: Hourly Performance Tracker
 *  - Feature 2: 24/7 Activity Monitor with AI Detection
 *  - Feature 5: Live Workload Distribution Analyzer
 *  - Feature 9: Activity Heatmap
 */

import { prisma } from '@pms/database';
import { MS_PER_HOUR } from '../../utils/constants';
import type { HourlyMetrics, ActivityEventInput, WorkloadAnalysis } from './realtime-performance.service';

// ============================================================================
// Review Tracking Service
// ============================================================================

export class ReviewTrackingService {
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

    // Get the most recent hour's metrics (first item since ordered desc)
    const currentHourMetric = hourlyMetrics.length > 0 ? hourlyMetrics[0] : null;

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
   * Record an activity event.
   * Returns true if an inactivity anomaly was detected, false otherwise.
   */
  async recordActivityEvent(event: ActivityEventInput): Promise<boolean> {
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

    // Check for anomalies in activity patterns
    return this.checkActivityAnomalies(event.tenantId, event.userId);
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

  /**
   * Check for anomalous inactivity during work hours.
   * Returns true if inactivity detected.
   */
  private async checkActivityAnomalies(tenantId: string, userId: string): Promise<boolean> {
    const now = new Date();
    const hourOfDay = now.getHours();

    // Only check during typical work hours (9 AM - 6 PM)
    if (hourOfDay < 9 || hourOfDay > 18) return false;

    // Check activity in the last hour
    const oneHourAgo = new Date(now.getTime() - MS_PER_HOUR);

    const recentActivity = await prisma.activityEvent.count({
      where: {
        tenantId,
        userId,
        createdAt: { gte: oneHourAgo },
      },
    });

    return recentActivity === 0;
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

export const reviewTrackingService = new ReviewTrackingService();
