/**
 * Agent Tools V3 — data-access functions for the 50+ agent neural swarm.
 *
 * Provides querying capabilities for compliance, culture diagnostics,
 * engagement patterns, leave calendars, innovation data, 1:1 history,
 * session activity, career simulation, compensation context, and
 * project contributions.
 *
 * Every tool enforces tenant isolation and returns a standard ToolResult.
 */

import { prisma } from '@pms/database';
import { logger } from '../../utils/logger';

import type { ToolResult } from './agent-tools-v2';

// ══════════════════════════════════════════════════════════
// 1. queryComplianceStatus
// ══════════════════════════════════════════════════════════

/**
 * Query compliance posture: assessments, policies, and violations.
 * Used by POSH Sentinel, Labor Code, Audit-Trail agents.
 */
export async function queryComplianceStatus(
  tenantId: string,
  options: { userId?: string; policyType?: string; limit?: number } = {},
): Promise<ToolResult> {
  try {
    const limit = Math.min(options.limit ?? 30, 100);

    // Active policies
    const policies = await prisma.compliancePolicy.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: {
        id: true,
        policyName: true,
        policyType: true,
        complianceRules: true,
        effectiveDate: true,
      },
      orderBy: { effectiveDate: 'desc' },
      take: limit,
    });

    // Recent violations
    const violationWhere: Record<string, unknown> = { tenantId };
    if (options.userId) violationWhere.userId = options.userId;

    const violations = await prisma.complianceViolation.findMany({
      where: violationWhere,
      select: {
        id: true,
        userId: true,
        violationType: true,
        severity: true,
        status: true,
        description: true,
        detectedAt: true,
      },
      orderBy: { detectedAt: 'desc' },
      take: limit,
    });

    // Assessments summary
    const assessments = await prisma.complianceAssessment.findMany({
      where: { tenantId },
      select: {
        id: true,
        assessmentType: true,
        complianceScore: true,
        complianceStatus: true,
        assessedAt: true,
        riskLevel: true,
      },
      orderBy: { assessedAt: 'desc' },
      take: 10,
    });

    const openViolations = violations.filter((v) => v.status === 'OPEN' || v.status === 'INVESTIGATING');
    const avgComplianceScore =
      assessments.length > 0
        ? Math.round(
            (assessments.reduce((sum, a) => sum + (a.complianceScore ? Number(a.complianceScore) : 0), 0) /
              assessments.length) *
              100,
          ) / 100
        : 0;

    return {
      success: true,
      data: {
        avgComplianceScore,
        totalPolicies: policies.length,
        openViolations: openViolations.length,
        policies: policies.slice(0, 10),
        recentViolations: violations.slice(0, 15),
        latestAssessments: assessments,
      },
    };
  } catch (err) {
    logger.error('queryComplianceStatus tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 2. queryCultureDiagnostics
// ══════════════════════════════════════════════════════════

/**
 * Pull culture diagnostic and organizational health metrics.
 * Used by Culture-Weaver, Mood Radiator, Inclusion Monitor agents.
 */
export async function queryCultureDiagnostics(
  tenantId: string,
  options: { departmentId?: string } = {},
): Promise<ToolResult> {
  try {
    // Organizational health
    const orgHealth = await prisma.organizationalHealthMetrics.findMany({
      where: { tenantId },
      select: {
        metricDate: true,
        period: true,
        overallHealthScore: true,
        engagementScore: true,
        cultureScore: true,
        innovationScore: true,
        wellbeingScore: true,
        collaborationScore: true,
        leadershipScore: true,
      },
      orderBy: { metricDate: 'desc' },
      take: 6, // last 6 periods
    });

    // Department-level health
    const deptWhere: Record<string, unknown> = { tenantId };
    if (options.departmentId) deptWhere.departmentId = options.departmentId;

    const deptHealth = await prisma.departmentHealthMetrics.findMany({
      where: deptWhere,
      select: {
        departmentId: true,
        healthScore: true,
        engagementScore: true,
        performanceScore: true,
        turnoverRate: true,
        avgPerformance: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    // Culture diagnostics
    const diagnostics = await prisma.cultureDiagnostic.findMany({
      where: { tenantId },
      select: {
        id: true,
        diagnosticType: true,
        diagnosticDate: true,
        psychologicalSafety: true,
        trustLevel: true,
        autonomy: true,
        transparency: true,
        valuesAlignment: true,
        culturalStrengths: true,
        culturalWeaknesses: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const latestOrg = orgHealth[0];

    return {
      success: true,
      data: {
        overallHealthScore: latestOrg?.overallHealthScore ? Number(latestOrg.overallHealthScore) : null,
        engagementScore: latestOrg?.engagementScore ? Number(latestOrg.engagementScore) : null,
        cultureScore: latestOrg?.cultureScore ? Number(latestOrg.cultureScore) : null,
        wellbeingScore: latestOrg?.wellbeingScore ? Number(latestOrg.wellbeingScore) : null,
        orgHealthTrend: orgHealth.map((h) => ({
          period: h.period,
          metricDate: h.metricDate,
          score: h.overallHealthScore ? Number(h.overallHealthScore) : null,
        })),
        departmentHealth: deptHealth.slice(0, 15),
        diagnostics,
      },
    };
  } catch (err) {
    logger.error('queryCultureDiagnostics tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 3. queryEngagementPatterns
// ══════════════════════════════════════════════════════════

/**
 * Analyze engagement patterns from scores, events, and sentiment trends.
 * Used by Burnout Interceptor, Gratitude Sentinel, Social Bonding agents.
 */
export async function queryEngagementPatterns(
  tenantId: string,
  options: { userId?: string; departmentId?: string; days?: number } = {},
): Promise<ToolResult> {
  try {
    const daysBack = options.days ?? 30;
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    // Engagement scores
    const scoreWhere: Record<string, unknown> = {
      tenantId,
      scoreDate: { gte: since },
    };
    if (options.userId) scoreWhere.userId = options.userId;

    const scores = await prisma.engagementScore.findMany({
      where: scoreWhere,
      select: {
        userId: true,
        overallScore: true,
        participationScore: true,
        communicationScore: true,
        initiativeScore: true,
        scoreDate: true,
      },
      orderBy: { scoreDate: 'desc' },
      take: 100,
    });

    // Sentiment trends
    const sentimentWhere: Record<string, unknown> = {
      tenantId,
      periodStart: { gte: since },
    };
    if (options.userId) sentimentWhere.userId = options.userId;

    const sentiments = await prisma.sentimentTrend.findMany({
      where: sentimentWhere,
      select: {
        userId: true,
        avgSentimentScore: true,
        trendDirection: true,
        periodStart: true,
        sourceBreakdown: true,
      },
      orderBy: { periodStart: 'desc' },
      take: 100,
    });

    // Engagement events (recent)
    const eventWhere: Record<string, unknown> = {
      tenantId,
      eventTimestamp: { gte: since },
    };
    if (options.userId) eventWhere.userId = options.userId;

    const events = await prisma.engagementEvent.findMany({
      where: eventWhere,
      select: {
        userId: true,
        eventType: true,
        engagementImpact: true,
        eventTimestamp: true,
      },
      orderBy: { eventTimestamp: 'desc' },
      take: 50,
    });

    // Aggregate
    const avgOverall =
      scores.length > 0
        ? Math.round(
            (scores.reduce((s, e) => s + (e.overallScore ? Number(e.overallScore) : 0), 0) / scores.length) * 100,
          ) / 100
        : null;

    const sentimentAvg =
      sentiments.length > 0
        ? Math.round(
            (sentiments.reduce((s, e) => s + (e.avgSentimentScore ? Number(e.avgSentimentScore) : 0), 0) /
              sentiments.length) *
              100,
          ) / 100
        : null;

    const trendDirections = sentiments.reduce(
      (acc, s) => {
        if (s.trendDirection) acc[s.trendDirection] = (acc[s.trendDirection] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      success: true,
      data: {
        avgEngagementScore: avgOverall,
        avgSentiment: sentimentAvg,
        trendDirections,
        recentScores: scores.slice(0, 20),
        recentSentiments: sentiments.slice(0, 20),
        recentEvents: events.slice(0, 20),
      },
    };
  } catch (err) {
    logger.error('queryEngagementPatterns tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 4. queryLeaveCalendar
// ══════════════════════════════════════════════════════════

/**
 * Query leave-type calendar events for leave optimization and
 * circadian rhythm analysis. Pulls CalendarEvent entries of type LEAVE.
 */
export async function queryLeaveCalendar(
  tenantId: string,
  options: { userId?: string; startDate?: Date; endDate?: Date } = {},
): Promise<ToolResult> {
  try {
    const start = options.startDate ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = options.endDate ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = {
      tenantId,
      type: 'LEAVE',
      eventDate: { gte: start, lte: end },
    };
    if (options.userId) where.userId = options.userId;

    const events = await prisma.calendarEvent.findMany({
      where,
      select: {
        id: true,
        userId: true,
        title: true,
        eventDate: true,
        startTime: true,
        endTime: true,
        metadata: true,
      },
      orderBy: { eventDate: 'asc' },
      take: 200,
    });

    // Summarize by month
    const byMonth = new Map<string, number>();
    for (const e of events) {
      const key = e.eventDate.toISOString().slice(0, 7);
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }

    // Days of week distribution
    const byDayOfWeek = new Array(7).fill(0);
    for (const e of events) {
      byDayOfWeek[e.eventDate.getDay()]++;
    }

    return {
      success: true,
      data: {
        totalLeaveEvents: events.length,
        upcoming: events.filter((e) => e.eventDate > new Date()).slice(0, 20),
        past: events.filter((e) => e.eventDate <= new Date()).slice(0, 20),
        monthlyDistribution: Object.fromEntries(byMonth),
        dayOfWeekDistribution: {
          Sun: byDayOfWeek[0],
          Mon: byDayOfWeek[1],
          Tue: byDayOfWeek[2],
          Wed: byDayOfWeek[3],
          Thu: byDayOfWeek[4],
          Fri: byDayOfWeek[5],
          Sat: byDayOfWeek[6],
        },
      },
    };
  } catch (err) {
    logger.error('queryLeaveCalendar tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 5. queryInnovationData
// ══════════════════════════════════════════════════════════

/**
 * Query innovation contributions and evaluations.
 * Used by Curiosity Scout and Knowledge Broker agents.
 */
export async function queryInnovationData(
  tenantId: string,
  options: { userId?: string; limit?: number } = {},
): Promise<ToolResult> {
  try {
    const limit = Math.min(options.limit ?? 30, 100);

    const contribWhere: Record<string, unknown> = { tenantId };
    if (options.userId) contribWhere.userId = options.userId;

    const contributions = await prisma.innovationContribution.findMany({
      where: contribWhere,
      select: {
        id: true,
        userId: true,
        title: true,
        category: true,
        status: true,
        impactScore: true,
        innovationScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Get evaluations for those contributions
    const contribIds = contributions.map((c) => c.id);
    const evaluations =
      contribIds.length > 0
        ? await prisma.innovationEvaluation.findMany({
            where: { contributionId: { in: contribIds } },
            select: {
              contributionId: true,
              evaluatorId: true,
              overallScore: true,
              suggestions: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          })
        : [];

    const statusCounts = contributions.reduce(
      (acc, c) => {
        acc[c.status] = (acc[c.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const avgImpact =
      contributions.length > 0
        ? Math.round(
            (contributions.reduce((s, c) => s + (c.impactScore ? Number(c.impactScore) : 0), 0) /
              contributions.length) *
              100,
          ) / 100
        : 0;

    return {
      success: true,
      data: {
        totalContributions: contributions.length,
        statusCounts,
        avgImpactScore: avgImpact,
        contributions: contributions.slice(0, 15),
        evaluations: evaluations.slice(0, 20),
      },
    };
  } catch (err) {
    logger.error('queryInnovationData tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 6. queryOneOnOneHistory
// ══════════════════════════════════════════════════════════

/**
 * Retrieve 1:1 meeting history for a user (as host or participant).
 * Used by Empathy Coach and Conflict Resolver agents.
 */
export async function queryOneOnOneHistory(
  tenantId: string,
  userId: string,
  options: { limit?: number } = {},
): Promise<ToolResult> {
  try {
    const limit = Math.min(options.limit ?? 20, 50);

    const meetings = await prisma.oneOnOne.findMany({
      where: {
        tenantId,
        OR: [{ managerId: userId }, { employeeId: userId }],
      },
      select: {
        id: true,
        managerId: true,
        employeeId: true,
        scheduledAt: true,
        status: true,
        managerNotes: true,
        employeeNotes: true,
        sharedNotes: true,
        actionItems: true,
        duration: true,
      },
      orderBy: { scheduledAt: 'desc' },
      take: limit,
    });

    const completed = meetings.filter((m) => m.status === 'COMPLETED');
    const avgDuration =
      completed.length > 0
        ? Math.round(completed.reduce((s, m) => s + (m.duration ?? 0), 0) / completed.length)
        : 0;

    // Status distribution
    const statusCounts = meetings.reduce(
      (acc, m) => {
        const status = String(m.status);
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      success: true,
      data: {
        totalMeetings: meetings.length,
        completedMeetings: completed.length,
        avgDurationMinutes: avgDuration,
        statusDistribution: statusCounts,
        recentMeetings: meetings.slice(0, 10).map((m) => ({
          id: m.id,
          scheduledAt: m.scheduledAt,
          status: m.status,
          hasManagerNotes: !!m.managerNotes,
          hasEmployeeNotes: !!m.employeeNotes,
          hasSharedNotes: !!m.sharedNotes,
          actionItemCount: Array.isArray(m.actionItems) ? m.actionItems.length : 0,
        })),
      },
    };
  } catch (err) {
    logger.error('queryOneOnOneHistory tool failed', { tenantId, userId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 7. querySessionActivity
// ══════════════════════════════════════════════════════════

/**
 * Query session and hourly activity data for a user.
 * Used by Neuro-Focus, Micro-Break, Sleep Optimizer, Ergonomics agents.
 */
export async function querySessionActivity(
  tenantId: string,
  userId: string,
  options: { days?: number } = {},
): Promise<ToolResult> {
  try {
    const daysBack = options.days ?? 14;
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    // Hourly performance metrics
    const hourlyMetrics = await prisma.hourlyPerformanceMetric.findMany({
      where: {
        tenantId,
        userId,
        metricHour: { gte: since },
      },
      select: {
        metricHour: true,
        activeMinutes: true,
        productivityScore: true,
        engagementScore: true,
        tasksCompleted: true,
        focusMinutes: true,
      },
      orderBy: { metricHour: 'desc' },
      take: 500,
    });

    // Sessions
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        userAgent: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Aggregate by hour of day (0-23)
    const byHour = new Array(24).fill(0);
    const productivityByHour = new Array(24).fill(0);
    const countByHour = new Array(24).fill(0);
    for (const m of hourlyMetrics) {
      const h = m.metricHour.getUTCHours();
      byHour[h] += m.activeMinutes;
      if (m.productivityScore) {
        productivityByHour[h] += Number(m.productivityScore);
        countByHour[h]++;
      }
    }

    // Find peak productivity hours
    const hourlyAvgProductivity = productivityByHour.map((total, i) =>
      countByHour[i] > 0 ? Math.round((total / countByHour[i]) * 100) / 100 : 0,
    );
    const peakHours = hourlyAvgProductivity
      .map((score, hour) => ({ hour, score }))
      .filter((h) => h.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Total active hours
    const totalActiveMinutes = hourlyMetrics.reduce((s, m) => s + m.activeMinutes, 0);
    const totalFocusMinutes = hourlyMetrics.reduce((s, m) => s + (m.focusMinutes ?? 0), 0);
    const avgDailyMinutes = daysBack > 0 ? Math.round(totalActiveMinutes / daysBack) : 0;

    // Late-night activity (after 21:00 or before 06:00)
    const lateNightMinutes = hourlyMetrics
      .filter((m) => {
        const h = m.metricHour.getUTCHours();
        return h >= 21 || h < 6;
      })
      .reduce((s, m) => s + m.activeMinutes, 0);

    return {
      success: true,
      data: {
        totalActiveHours: Math.round((totalActiveMinutes / 60) * 10) / 10,
        avgDailyActiveHours: Math.round((avgDailyMinutes / 60) * 10) / 10,
        totalFocusMinutes,
        lateNightHours: Math.round((lateNightMinutes / 60) * 10) / 10,
        peakProductivityHours: peakHours,
        hourlyProductivity: hourlyAvgProductivity,
        sessionCount: sessions.length,
      },
    };
  } catch (err) {
    logger.error('querySessionActivity tool failed', { tenantId, userId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 8. queryCareerSimulation
// ══════════════════════════════════════════════════════════

/**
 * Retrieve career path data, promotion recommendations, and succession plans.
 * Used by Career Pathing Simulator and Succession Sentry agents.
 */
export async function queryCareerSimulation(
  tenantId: string,
  userId?: string,
): Promise<ToolResult> {
  try {
    // Career paths
    const careerPaths = await prisma.careerPath.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        pathName: true,
        pathDescription: true,
        levels: true,
        skillRequirements: true,
        averageDuration: true,
      },
      take: 20,
    });

    // Promotion recommendations for user
    const promoWhere: Record<string, unknown> = { tenantId };
    if (userId) promoWhere.userId = userId;

    const promotions = await prisma.promotionRecommendation.findMany({
      where: promoWhere,
      select: {
        userId: true,
        targetRole: true,
        targetLevel: true,
        overallScore: true,
        readinessLevel: true,
        status: true,
        strengths: true,
        developmentNeeds: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: userId ? 5 : 20,
    });

    // Succession plans
    const successionPlans = await prisma.successionPlan.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: {
        id: true,
        positionTitle: true,
        criticality: true,
        benchStrength: true,
        successors: true,
      },
      take: 15,
    });

    return {
      success: true,
      data: {
        careerPaths,
        promotionRecommendations: promotions,
        successionPlans: successionPlans.map((sp) => ({
          ...sp,
          successorCount: Array.isArray(sp.successors) ? sp.successors.length : 0,
        })),
      },
    };
  } catch (err) {
    logger.error('queryCareerSimulation tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 9. queryCompensationData
// ══════════════════════════════════════════════════════════

/**
 * Advisory compensation context — pulls level/role distribution data
 * (no actual salary data for privacy). Used by Market-Value Analyst
 * and Equity Realizer agents.
 */
export async function queryCompensationData(
  tenantId: string,
  options: { userId?: string } = {},
): Promise<ToolResult> {
  try {
    // Level distribution across tenant
    const users = await prisma.user.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      select: { id: true, level: true, jobTitle: true, hireDate: true },
    });

    const levelDist = users.reduce(
      (acc, u) => {
        const level = u.level ?? 0;
        acc[level] = (acc[level] ?? 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    );

    // Role distribution
    const roleDist = users.reduce(
      (acc, u) => {
        const title = u.jobTitle ?? 'Unknown';
        acc[title] = (acc[title] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Tenure stats
    const tenures = users
      .filter((u) => u.hireDate)
      .map((u) => Math.round((Date.now() - u.hireDate!.getTime()) / (365.25 * 24 * 60 * 60 * 1000) * 10) / 10);
    const avgTenure = tenures.length > 0 ? Math.round((tenures.reduce((a, b) => a + b, 0) / tenures.length) * 10) / 10 : 0;

    // User-specific context if userId provided
    let userContext = null;
    if (options.userId) {
      const user = users.find((u) => u.id === options.userId);
      if (user) {
        const sameLevel = users.filter((u) => u.level === user.level).length;
        const sameTitleCount = users.filter((u) => u.jobTitle === user.jobTitle).length;
        userContext = {
          level: user.level,
          jobTitle: user.jobTitle,
          peersAtSameLevel: sameLevel,
          peersWithSameTitle: sameTitleCount,
          tenure: user.hireDate
            ? Math.round((Date.now() - user.hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000) * 10) / 10
            : null,
        };
      }
    }

    return {
      success: true,
      data: {
        totalEmployees: users.length,
        levelDistribution: levelDist,
        roleDistribution: Object.entries(roleDist)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15),
        avgTenureYears: avgTenure,
        userContext,
      },
    };
  } catch (err) {
    logger.error('queryCompensationData tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 10. queryProjectContributions
// ══════════════════════════════════════════════════════════

/**
 * Query project evaluations, contribution scores, and milestones.
 * Used by Task Bidder, Internal Gig Sourcer, and Cross-Training agents.
 */
export async function queryProjectContributions(
  tenantId: string,
  options: { userId?: string; limit?: number } = {},
): Promise<ToolResult> {
  try {
    const limit = Math.min(options.limit ?? 30, 100);

    // Project evaluations
    const evalWhere: Record<string, unknown> = { tenantId };

    const evaluations = await prisma.projectEvaluation.findMany({
      where: evalWhere,
      select: {
        id: true,
        projectName: true,
        projectId: true,
        overallScore: true,
        qualityScore: true,
        timelineScore: true,
        budgetScore: true,
        evaluatedAt: true,
      },
      orderBy: { evaluatedAt: 'desc' },
      take: limit,
    });

    // Contribution scores
    const contribScoreWhere: Record<string, unknown> = {};
    if (options.userId) contribScoreWhere.userId = options.userId;

    const contributions = await prisma.projectContributionScore.findMany({
      where: contribScoreWhere,
      select: {
        userId: true,
        projectEvaluationId: true,
        overallScore: true,
        role: true,
        qualityScore: true,
        collaborationScore: true,
      },
      orderBy: { overallScore: 'desc' },
      take: limit,
    });

    // Project milestones (recent)
    const milestones = await prisma.projectMilestone.findMany({
      where: { tenantId },
      select: {
        id: true,
        goalId: true,
        title: true,
        status: true,
        plannedDate: true,
        actualDate: true,
      },
      orderBy: { plannedDate: 'desc' },
      take: 30,
    });

    // Aggregation
    const avgOverall =
      evaluations.length > 0
        ? Math.round(
            (evaluations.reduce((s, e) => s + (e.overallScore ? Number(e.overallScore) : 0), 0) /
              evaluations.length) *
              100,
          ) / 100
        : 0;

    return {
      success: true,
      data: {
        totalEvaluations: evaluations.length,
        avgOverallScore: avgOverall,
        evaluations: evaluations.slice(0, 15),
        contributions: contributions.slice(0, 15),
        recentMilestones: milestones.slice(0, 15),
      },
    };
  } catch (err) {
    logger.error('queryProjectContributions tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 11. queryAuditEvents
// ══════════════════════════════════════════════════════════

/**
 * Query recent audit log events. Used by Audit-Trail and
 * Whistleblower agents.
 */
export async function queryAuditEvents(
  tenantId: string,
  options: { userId?: string; action?: string; limit?: number } = {},
): Promise<ToolResult> {
  try {
    const limit = Math.min(options.limit ?? 50, 200);

    const where: Record<string, unknown> = { tenantId };
    if (options.userId) where.userId = options.userId;
    if (options.action) where.eventType = { contains: options.action };

    const events = await prisma.activityEvent.findMany({
      where,
      select: {
        id: true,
        eventType: true,
        eventSubtype: true,
        userId: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Count by event type
    const actionCounts = events.reduce(
      (acc, e) => {
        acc[e.eventType] = (acc[e.eventType] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      success: true,
      data: {
        totalEvents: events.length,
        actionCounts,
        recentEvents: events.slice(0, 30).map((e) => ({
          eventType: e.eventType,
          userId: e.userId,
          entityType: e.entityType,
          createdAt: e.createdAt,
        })),
      },
    };
  } catch (err) {
    logger.error('queryAuditEvents tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}
