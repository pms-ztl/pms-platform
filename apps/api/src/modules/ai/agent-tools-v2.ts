/**
 * Agent Tools V2 — advanced data-access & analytics functions for agentic AI features.
 *
 * Every tool enforces tenant isolation, handles errors gracefully,
 * and selects only the fields it needs from Prisma.
 */

import { prisma } from '@pms/database';
import { logger, auditLogger } from '../../utils/logger';

// ── Shared Types ──────────────────────────────────────────

export interface ToolResult {
  success: boolean;
  data: unknown;
  error?: string;
}

// ── Bias-detection word maps (used by detectBiasInText) ──

const GENDERED_LANGUAGE_MAP: Record<string, { suggested: string; biasType: string }> = {
  aggressive: { suggested: 'assertive', biasType: 'gendered' },
  abrasive: { suggested: 'direct', biasType: 'gendered' },
  bossy: { suggested: 'confident', biasType: 'gendered' },
  emotional: { suggested: 'passionate', biasType: 'gendered' },
  hysterical: { suggested: 'enthusiastic', biasType: 'gendered' },
  shrill: { suggested: 'vocal', biasType: 'gendered' },
  nurturing: { suggested: 'supportive', biasType: 'gendered' },
  sassy: { suggested: 'candid', biasType: 'gendered' },
  feisty: { suggested: 'tenacious', biasType: 'gendered' },
  bubbly: { suggested: 'enthusiastic', biasType: 'gendered' },
  catty: { suggested: 'critical', biasType: 'gendered' },
  moody: { suggested: 'reflective', biasType: 'gendered' },
  pushy: { suggested: 'persistent', biasType: 'gendered' },
  dramatic: { suggested: 'expressive', biasType: 'gendered' },
};

const VAGUE_PHRASES: string[] = [
  'needs improvement',
  'could do better',
  'not a good fit',
  'lacks potential',
  'not a team player',
  'has attitude problems',
  'needs to step up',
  'not meeting expectations',
];

// ── Helper: compute days between two dates ───────────────

function daysBetween(a: Date, b: Date): number {
  return Math.abs(Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

// ══════════════════════════════════════════════════════════
// 1. queryBurnoutRisk
// ══════════════════════════════════════════════════════════

/**
 * Analyze burnout risk across a tenant's workforce.
 *
 * Combines WorkloadSnapshot balance statuses with HourlyPerformanceMetric
 * active-minutes data to produce a per-user risk score (0-100).
 */
export async function queryBurnoutRisk(
  tenantId: string,
  options: { departmentId?: string; limit?: number } = {},
): Promise<ToolResult> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const limit = Math.min(options.limit ?? 50, 100);

    // Users with heavy/overloaded workload snapshots (latest per user)
    const workloadSnapshots = await prisma.workloadSnapshot.findMany({
      where: {
        tenantId,
        balanceStatus: { in: ['overloaded', 'heavy'] },
        snapshotTime: { gte: thirtyDaysAgo },
      },
      select: {
        userId: true,
        workloadScore: true,
        balanceStatus: true,
        activeGoals: true,
        pendingReviews: true,
        snapshotTime: true,
      },
      orderBy: { snapshotTime: 'desc' },
      take: 500,
    });

    // Deduplicate: keep latest snapshot per user
    const latestByUser = new Map<string, typeof workloadSnapshots[0]>();
    for (const snap of workloadSnapshots) {
      if (!latestByUser.has(snap.userId)) {
        latestByUser.set(snap.userId, snap);
      }
    }

    const userIds = Array.from(latestByUser.keys());
    if (userIds.length === 0) {
      return { success: true, data: [] };
    }

    // Get hourly metrics for those users to check excessive active minutes
    const hourlyMetrics = await prisma.hourlyPerformanceMetric.findMany({
      where: {
        tenantId,
        userId: { in: userIds },
        metricHour: { gte: thirtyDaysAgo },
      },
      select: {
        userId: true,
        metricHour: true,
        activeMinutes: true,
      },
    });

    // Aggregate daily active minutes per user
    const dailyMinutesByUser = new Map<string, Map<string, number>>();
    for (const m of hourlyMetrics) {
      const dateKey = m.metricHour.toISOString().slice(0, 10);
      if (!dailyMinutesByUser.has(m.userId)) {
        dailyMinutesByUser.set(m.userId, new Map());
      }
      const userMap = dailyMinutesByUser.get(m.userId)!;
      userMap.set(dateKey, (userMap.get(dateKey) ?? 0) + m.activeMinutes);
    }

    // Count overtime hours (hours before 9 or after 17)
    const overtimeMinutesByUser = new Map<string, number>();
    const totalMinutesByUser = new Map<string, number>();
    for (const m of hourlyMetrics) {
      const hour = m.metricHour.getUTCHours();
      const total = (totalMinutesByUser.get(m.userId) ?? 0) + m.activeMinutes;
      totalMinutesByUser.set(m.userId, total);
      if (hour < 9 || hour >= 17) {
        const ot = (overtimeMinutesByUser.get(m.userId) ?? 0) + m.activeMinutes;
        overtimeMinutesByUser.set(m.userId, ot);
      }
    }

    // Fetch user names
    const users = await prisma.user.findMany({
      where: { tenantId, id: { in: userIds }, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, departmentId: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Apply department filter if provided
    const filteredUserIds = options.departmentId
      ? userIds.filter((uid) => userMap.get(uid)?.departmentId === options.departmentId)
      : userIds;

    // Compute risk scores
    const results = filteredUserIds
      .map((userId) => {
        const snap = latestByUser.get(userId)!;
        const user = userMap.get(userId);
        if (!user) return null;

        const dailyMap = dailyMinutesByUser.get(userId);
        const dailyValues = dailyMap ? Array.from(dailyMap.values()) : [];
        const avgDailyMinutes =
          dailyValues.length > 0
            ? dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length
            : 0;
        const avgDailyHours = Math.round((avgDailyMinutes / 60) * 10) / 10;

        const totalMin = totalMinutesByUser.get(userId) ?? 0;
        const overtimeMin = overtimeMinutesByUser.get(userId) ?? 0;
        const overtimePercentage =
          totalMin > 0 ? Math.round((overtimeMin / totalMin) * 100) : 0;

        // Risk score computation (0-100)
        const indicators: string[] = [];
        let riskScore = 0;

        // Workload factor (0-30)
        const workloadVal = snap.workloadScore ? Number(snap.workloadScore) : 0;
        if (snap.balanceStatus === 'overloaded') {
          riskScore += 30;
          indicators.push('Workload status: overloaded');
        } else if (snap.balanceStatus === 'heavy') {
          riskScore += 20;
          indicators.push('Workload status: heavy');
        }

        // Excessive hours factor (0-35)
        if (avgDailyMinutes > 600) {
          riskScore += 35;
          indicators.push(`Excessive daily active time: ${avgDailyHours}h avg`);
        } else if (avgDailyMinutes > 480) {
          riskScore += 20;
          indicators.push(`High daily active time: ${avgDailyHours}h avg`);
        }

        // Overtime factor (0-20)
        if (overtimePercentage > 40) {
          riskScore += 20;
          indicators.push(`${overtimePercentage}% of activity outside core hours`);
        } else if (overtimePercentage > 25) {
          riskScore += 10;
          indicators.push(`${overtimePercentage}% of activity outside core hours`);
        }

        // High pending load (0-15)
        if (snap.activeGoals > 10 || snap.pendingReviews > 5) {
          riskScore += 15;
          indicators.push(`${snap.activeGoals} active goals, ${snap.pendingReviews} pending reviews`);
        }

        riskScore = Math.min(riskScore, 100);

        return {
          userId,
          name: `${user.firstName} ${user.lastName}`,
          riskScore,
          indicators,
          workloadScore: workloadVal,
          avgDailyHours,
          overtimePercentage,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.riskScore - a!.riskScore)
      .slice(0, limit);

    return { success: true, data: results };
  } catch (err) {
    logger.error('queryBurnoutRisk tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 2. queryAttritionRisk
// ══════════════════════════════════════════════════════════

/**
 * Predict flight risk by analyzing engagement trends, feedback sentiment,
 * goal activity, and tenure/progression stagnation.
 */
export async function queryAttritionRisk(
  tenantId: string,
  options: { departmentId?: string; limit?: number } = {},
): Promise<ToolResult> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const limit = Math.min(options.limit ?? 50, 100);

    const userWhere: Record<string, unknown> = {
      tenantId,
      isActive: true,
      deletedAt: null,
    };
    if (options.departmentId) userWhere.departmentId = options.departmentId;

    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        level: true,
        hireDate: true,
        departmentId: true,
      },
      take: 500,
    });

    if (users.length === 0) return { success: true, data: [] };
    const userIds = users.map((u) => u.id);
    const userMap = new Map(users.map((u) => [u.id, u]));

    // 1) Engagement trends — last 30 days daily metrics
    const dailyMetrics = await prisma.dailyPerformanceMetric.findMany({
      where: { tenantId, userId: { in: userIds }, metricDate: { gte: thirtyDaysAgo } },
      select: { userId: true, metricDate: true, avgEngagementScore: true },
      orderBy: { metricDate: 'asc' },
    });

    // Compute engagement trend per user (simple slope: last 15 days avg vs first 15 days avg)
    const engagementByUser = new Map<string, { first: number[]; second: number[] }>();
    const midDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    for (const m of dailyMetrics) {
      if (m.avgEngagementScore == null) continue;
      if (!engagementByUser.has(m.userId)) {
        engagementByUser.set(m.userId, { first: [], second: [] });
      }
      const bucket = engagementByUser.get(m.userId)!;
      if (m.metricDate < midDate) {
        bucket.first.push(Number(m.avgEngagementScore));
      } else {
        bucket.second.push(Number(m.avgEngagementScore));
      }
    }

    // 2) Feedback sentiment trends — negative
    const feedback = await prisma.feedback.findMany({
      where: {
        tenantId,
        toUserId: { in: userIds },
        deletedAt: null,
        createdAt: { gte: ninetyDaysAgo },
      },
      select: { toUserId: true, sentimentScore: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const feedbackByUser = new Map<string, number[]>();
    for (const f of feedback) {
      if (f.sentimentScore == null || !f.toUserId) continue;
      if (!feedbackByUser.has(f.toUserId)) feedbackByUser.set(f.toUserId, []);
      feedbackByUser.get(f.toUserId)!.push(Number(f.sentimentScore));
    }

    // 3) Recent goal activity — users with no goals created/updated in 90 days
    const recentGoals = await prisma.goal.findMany({
      where: {
        tenantId,
        ownerId: { in: userIds },
        deletedAt: null,
        updatedAt: { gte: ninetyDaysAgo },
      },
      select: { ownerId: true },
    });
    const usersWithRecentGoals = new Set(recentGoals.map((g) => g.ownerId));

    // Build risk assessments
    const results = users
      .map((user) => {
        const factors: string[] = [];
        let riskPoints = 0;

        // Engagement trend
        const eng = engagementByUser.get(user.id);
        let engagementTrend = 0;
        if (eng && eng.first.length >= 3 && eng.second.length >= 3) {
          const firstAvg = eng.first.reduce((a, b) => a + b, 0) / eng.first.length;
          const secondAvg = eng.second.reduce((a, b) => a + b, 0) / eng.second.length;
          engagementTrend = Math.round((secondAvg - firstAvg) * 100) / 100;
          if (engagementTrend < -0.1) {
            riskPoints += 30;
            factors.push(`Declining engagement (${engagementTrend.toFixed(2)} trend)`);
          }
        }

        // Feedback sentiment
        const fScores = feedbackByUser.get(user.id) ?? [];
        if (fScores.length >= 2) {
          const avgSentiment = fScores.reduce((a, b) => a + b, 0) / fScores.length;
          if (avgSentiment < -0.2) {
            riskPoints += 20;
            factors.push(`Negative feedback sentiment (${avgSentiment.toFixed(2)} avg)`);
          }
        }

        // Goal activity stagnation
        if (!usersWithRecentGoals.has(user.id)) {
          riskPoints += 15;
          factors.push('No goal activity in 90 days');
        }

        // Tenure without progression
        if (user.hireDate) {
          const tenureDays = daysBetween(user.hireDate, new Date());
          const tenureYears = Math.round((tenureDays / 365) * 10) / 10;
          // Stagnation: 2+ years at level 1-3 suggests growth concern
          if (tenureYears >= 2 && user.level <= 3) {
            riskPoints += 15;
            factors.push(`${tenureYears}yr tenure at level ${user.level} (potential stagnation)`);
          }
          // Long tenure with low level
          if (tenureYears >= 4 && user.level <= 5) {
            riskPoints += 10;
            factors.push(`Extended tenure (${tenureYears}yr) with limited progression`);
          }
        }

        // No engagement data at all
        if (!eng || (eng.first.length === 0 && eng.second.length === 0)) {
          riskPoints += 10;
          factors.push('No engagement data available (possible disengagement)');
        }

        riskPoints = Math.min(riskPoints, 100);

        const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
          riskPoints >= 70
            ? 'critical'
            : riskPoints >= 50
              ? 'high'
              : riskPoints >= 25
                ? 'medium'
                : 'low';

        const tenureDays = user.hireDate ? daysBetween(user.hireDate, new Date()) : null;

        return {
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          riskLevel,
          factors,
          engagementTrend,
          tenure: tenureDays ? `${Math.round((tenureDays / 365) * 10) / 10} years` : 'unknown',
        };
      })
      .filter((r) => r.riskLevel !== 'low')
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return order[a.riskLevel] - order[b.riskLevel];
      })
      .slice(0, limit);

    return { success: true, data: results };
  } catch (err) {
    logger.error('queryAttritionRisk tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 3. querySkillGaps
// ══════════════════════════════════════════════════════════

/**
 * Identify skill gaps by comparing BehavioralCompetencyScore and
 * TechnicalSkillAssessment data against CareerPath requirements.
 */
export async function querySkillGaps(
  tenantId: string,
  userId?: string,
): Promise<ToolResult> {
  try {
    const userWhere: Record<string, unknown> = { tenantId, isActive: true, deletedAt: null };
    if (userId) userWhere.id = userId;

    const users = await prisma.user.findMany({
      where: userWhere,
      select: { id: true, firstName: true, lastName: true, level: true, jobTitle: true },
      take: userId ? 1 : 50,
    });

    if (users.length === 0) return { success: true, data: [] };
    const userIds = users.map((u) => u.id);

    // Technical skill assessments
    const techSkills = await prisma.technicalSkillAssessment.findMany({
      where: { tenantId, userId: { in: userIds }, deletedAt: null },
      select: {
        userId: true,
        skillName: true,
        finalScore: true,
        skillLevel: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Behavioral competency scores
    const behavioralScores = await prisma.behavioralCompetencyScore.findMany({
      where: { tenantId, userId: { in: userIds } },
      select: {
        userId: true,
        competencyName: true,
        overallScore: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Career paths for comparison
    const careerPaths = await prisma.careerPath.findMany({
      where: { tenantId, isActive: true },
      select: {
        pathName: true,
        skillRequirements: true,
        competencyRequirements: true,
        levels: true,
      },
    });

    // Build skill requirement baselines from career paths
    const skillBaselines = new Map<string, number>();
    for (const cp of careerPaths) {
      const reqs = cp.skillRequirements as Record<string, number>;
      if (reqs && typeof reqs === 'object') {
        for (const [skill, score] of Object.entries(reqs)) {
          const current = skillBaselines.get(skill) ?? 0;
          if (typeof score === 'number' && score > current) {
            skillBaselines.set(skill, score);
          }
        }
      }
    }

    // Group skills by user
    const techByUser = new Map<string, typeof techSkills>();
    for (const ts of techSkills) {
      if (!techByUser.has(ts.userId)) techByUser.set(ts.userId, []);
      techByUser.get(ts.userId)!.push(ts);
    }
    const behavByUser = new Map<string, typeof behavioralScores>();
    for (const bs of behavioralScores) {
      if (!behavByUser.has(bs.userId)) behavByUser.set(bs.userId, []);
      behavByUser.get(bs.userId)!.push(bs);
    }

    const results = users.map((user) => {
      const gaps: { skill: string; currentScore: number; requiredScore: number; priority: string }[] = [];

      // Check technical skills against baselines
      const userTech = techByUser.get(user.id) ?? [];
      const userTechMap = new Map<string, number>();
      for (const ts of userTech) {
        const score = Number(ts.finalScore);
        if (!userTechMap.has(ts.skillName) || score > (userTechMap.get(ts.skillName) ?? 0)) {
          userTechMap.set(ts.skillName, score);
        }
      }

      for (const [skill, required] of skillBaselines) {
        const current = userTechMap.get(skill) ?? 0;
        if (current < required) {
          const deficit = required - current;
          gaps.push({
            skill,
            currentScore: Math.round(current * 100) / 100,
            requiredScore: required,
            priority: deficit > 1.5 ? 'high' : deficit > 0.75 ? 'medium' : 'low',
          });
        }
      }

      // Check behavioral competencies (target: 3.0 out of 5.0 minimum)
      const userBehav = behavByUser.get(user.id) ?? [];
      for (const bs of userBehav) {
        const score = Number(bs.overallScore);
        if (score < 3.0) {
          gaps.push({
            skill: bs.competencyName,
            currentScore: Math.round(score * 100) / 100,
            requiredScore: 3.0,
            priority: score < 2.0 ? 'high' : 'medium',
          });
        }
      }

      // Sort gaps by priority
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      gaps.sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));

      return {
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        currentLevel: user.level,
        targetLevel: user.level + 1,
        gaps,
      };
    });

    return { success: true, data: results };
  } catch (err) {
    logger.error('querySkillGaps tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 4. queryTeamHealth
// ══════════════════════════════════════════════════════════

/**
 * Aggregate team-level health metrics: sentiment, workload balance,
 * collaboration score, and feedback frequency.
 */
export async function queryTeamHealth(
  tenantId: string,
  managerId?: string,
): Promise<ToolResult> {
  try {
    const userWhere: Record<string, unknown> = { tenantId, isActive: true, deletedAt: null };
    if (managerId) userWhere.managerId = managerId;

    const members = await prisma.user.findMany({
      where: userWhere,
      select: { id: true, firstName: true, lastName: true },
      take: 200,
    });

    if (members.length === 0) {
      return {
        success: true,
        data: {
          teamSize: 0,
          sentimentScore: 0,
          moraleLevel: 'unknown',
          workloadBalance: 'unknown',
          collaborationScore: 0,
          feedbackFrequency: 0,
          atRiskMembers: 0,
        },
      };
    }

    const memberIds = members.map((m) => m.id);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Communication sentiment
    const sentiments = await prisma.communicationSentiment.findMany({
      where: {
        tenantId,
        userId: { in: memberIds },
        analysisPeriodStart: { gte: thirtyDaysAgo },
      },
      select: {
        userId: true,
        overallSentimentScore: true,
        collaborationSentiment: true,
        stressIndicators: true,
        moraleAlert: true,
      },
      orderBy: { analysisPeriodStart: 'desc' },
    });

    // Workload snapshots
    const workloads = await prisma.workloadSnapshot.findMany({
      where: {
        tenantId,
        userId: { in: memberIds },
        snapshotTime: { gte: thirtyDaysAgo },
      },
      select: {
        userId: true,
        balanceStatus: true,
        workloadScore: true,
      },
      orderBy: { snapshotTime: 'desc' },
    });

    // Feedback frequency
    const feedbackCount = await prisma.feedback.count({
      where: {
        tenantId,
        deletedAt: null,
        createdAt: { gte: thirtyDaysAgo },
        OR: [
          { fromUserId: { in: memberIds } },
          { toUserId: { in: memberIds } },
        ],
      },
    });

    // Aggregate sentiment
    const latestSentiment = new Map<string, typeof sentiments[0]>();
    for (const s of sentiments) {
      if (!latestSentiment.has(s.userId)) latestSentiment.set(s.userId, s);
    }
    const sentimentValues = Array.from(latestSentiment.values())
      .map((s) => (s.overallSentimentScore ? Number(s.overallSentimentScore) : null))
      .filter((v): v is number => v !== null);
    const avgSentiment =
      sentimentValues.length > 0
        ? Math.round((sentimentValues.reduce((a, b) => a + b, 0) / sentimentValues.length) * 100) / 100
        : 0;

    // Collaboration score
    const collabValues = Array.from(latestSentiment.values())
      .map((s) => (s.collaborationSentiment ? Number(s.collaborationSentiment) : null))
      .filter((v): v is number => v !== null);
    const avgCollab =
      collabValues.length > 0
        ? Math.round((collabValues.reduce((a, b) => a + b, 0) / collabValues.length) * 100) / 100
        : 0;

    // Morale alerts
    const moraleAlerts = Array.from(latestSentiment.values()).filter((s) => s.moraleAlert).length;

    // Workload balance
    const latestWorkload = new Map<string, typeof workloads[0]>();
    for (const w of workloads) {
      if (!latestWorkload.has(w.userId)) latestWorkload.set(w.userId, w);
    }
    const statusCounts: Record<string, number> = {};
    for (const w of latestWorkload.values()) {
      const status = w.balanceStatus ?? 'unknown';
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    }
    const overloadedCount = (statusCounts['overloaded'] ?? 0) + (statusCounts['heavy'] ?? 0);

    const moraleLevel: string =
      avgSentiment > 0.6 ? 'high' : avgSentiment > 0.3 ? 'moderate' : avgSentiment > 0 ? 'low' : 'concerning';

    const balanceLabel =
      overloadedCount === 0
        ? 'balanced'
        : overloadedCount <= members.length * 0.2
          ? 'mostly_balanced'
          : overloadedCount <= members.length * 0.5
            ? 'imbalanced'
            : 'critical';

    return {
      success: true,
      data: {
        teamSize: members.length,
        sentimentScore: avgSentiment,
        moraleLevel,
        workloadBalance: balanceLabel,
        collaborationScore: avgCollab,
        feedbackFrequency: Math.round((feedbackCount / members.length) * 100) / 100,
        atRiskMembers: overloadedCount + moraleAlerts,
      },
    };
  } catch (err) {
    logger.error('queryTeamHealth tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 5. queryBiasMetrics
// ══════════════════════════════════════════════════════════

/**
 * Analyze review data for statistical bias across departments and levels.
 * Flags groups whose average ratings deviate >1.5 standard deviations from
 * the overall mean.
 */
export async function queryBiasMetrics(
  tenantId: string,
  options: { cycleId?: string } = {},
): Promise<ToolResult> {
  try {
    const reviewWhere: Record<string, unknown> = { tenantId, deletedAt: null };
    if (options.cycleId) reviewWhere.cycleId = options.cycleId;

    const reviews = await prisma.review.findMany({
      where: { ...reviewWhere, overallRating: { not: null } },
      select: {
        overallRating: true,
        revieweeId: true,
        biasScore: true,
        biasFlags: true,
      },
    });

    if (reviews.length === 0) {
      return {
        success: true,
        data: { biasFlags: [], overallFairnessScore: 100 },
      };
    }

    // Get reviewee info for grouping
    const revieweeIds = [...new Set(reviews.map((r) => r.revieweeId))];
    const users = await prisma.user.findMany({
      where: { tenantId, id: { in: revieweeIds }, deletedAt: null },
      select: { id: true, level: true, departmentId: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Overall stats
    const allRatings = reviews.map((r) => r.overallRating!);
    const overallMean = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
    const variance =
      allRatings.reduce((sum, r) => sum + Math.pow(r - overallMean, 2), 0) / allRatings.length;
    const stdDev = Math.sqrt(variance);

    const biasFlags: { type: string; affectedGroup: string; metric: string; deviation: number }[] = [];

    // Group by department
    const byDept = new Map<string, number[]>();
    for (const r of reviews) {
      const user = userMap.get(r.revieweeId);
      const dept = user?.departmentId ?? 'unknown';
      if (!byDept.has(dept)) byDept.set(dept, []);
      byDept.get(dept)!.push(r.overallRating!);
    }

    for (const [dept, ratings] of byDept) {
      if (ratings.length < 3) continue; // need minimum sample
      const deptMean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const deviation = stdDev > 0 ? (deptMean - overallMean) / stdDev : 0;
      if (Math.abs(deviation) > 1.5) {
        biasFlags.push({
          type: 'department_bias',
          affectedGroup: `department:${dept}`,
          metric: `avg_rating=${deptMean.toFixed(2)} (overall=${overallMean.toFixed(2)})`,
          deviation: Math.round(deviation * 100) / 100,
        });
      }
    }

    // Group by level
    const byLevel = new Map<number, number[]>();
    for (const r of reviews) {
      const user = userMap.get(r.revieweeId);
      const level = user?.level ?? 0;
      if (!byLevel.has(level)) byLevel.set(level, []);
      byLevel.get(level)!.push(r.overallRating!);
    }

    for (const [level, ratings] of byLevel) {
      if (ratings.length < 3) continue;
      const levelMean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const deviation = stdDev > 0 ? (levelMean - overallMean) / stdDev : 0;
      if (Math.abs(deviation) > 1.5) {
        biasFlags.push({
          type: 'level_bias',
          affectedGroup: `level:${level}`,
          metric: `avg_rating=${levelMean.toFixed(2)} (overall=${overallMean.toFixed(2)})`,
          deviation: Math.round(deviation * 100) / 100,
        });
      }
    }

    // Existing bias flags from individual reviews
    let flaggedReviewCount = 0;
    for (const r of reviews) {
      if (r.biasScore != null && r.biasScore > 0.5) flaggedReviewCount++;
    }

    // Fairness score: 100 minus penalties for each flag
    const fairnessScore = Math.max(
      0,
      Math.round(100 - biasFlags.length * 15 - (flaggedReviewCount / reviews.length) * 30),
    );

    return {
      success: true,
      data: {
        biasFlags,
        overallFairnessScore: fairnessScore,
        totalReviews: reviews.length,
        flaggedReviews: flaggedReviewCount,
      },
    };
  } catch (err) {
    logger.error('queryBiasMetrics tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 6. queryGoalAlignment
// ══════════════════════════════════════════════════════════

/**
 * Check organization-wide goal alignment coverage.
 * Identifies orphan goals with no parent alignment.
 */
export async function queryGoalAlignment(tenantId: string): Promise<ToolResult> {
  try {
    const goals = await prisma.goal.findMany({
      where: { tenantId, deletedAt: null, status: { not: 'COMPLETED' } },
      select: {
        id: true,
        title: true,
        status: true,
        type: true,
        ownerId: true,
        parentGoalId: true,
        alignments: { select: { id: true, toGoalId: true } },
        alignedToThis: { select: { id: true, fromGoalId: true } },
      },
    });

    const totalGoals = goals.length;
    const orphanGoals: { goalId: string; title: string; issue: string }[] = [];
    let alignedCount = 0;

    for (const goal of goals) {
      const hasParent = goal.parentGoalId != null;
      const hasAlignmentUp = goal.alignments.length > 0;
      const hasAlignmentDown = goal.alignedToThis.length > 0;

      if (hasParent || hasAlignmentUp || hasAlignmentDown) {
        alignedCount++;
      } else {
        // Orphan goal — no parent, no alignment connections
        orphanGoals.push({
          goalId: goal.id,
          title: goal.title,
          issue: `No alignment or parent linkage (type: ${goal.type}, status: ${goal.status})`,
        });
      }
    }

    const alignmentCoverage =
      totalGoals > 0 ? Math.round((alignedCount / totalGoals) * 100) : 0;

    return {
      success: true,
      data: {
        totalGoals,
        alignedGoals: alignedCount,
        orphanGoals: orphanGoals.length,
        alignmentCoverage,
        misalignments: orphanGoals.slice(0, 50), // cap at 50
      },
    };
  } catch (err) {
    logger.error('queryGoalAlignment tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 7. querySuccessionReadiness
// ══════════════════════════════════════════════════════════

/**
 * Assess succession pipeline health: bench strength, readiness,
 * and gaps per critical role.
 */
export async function querySuccessionReadiness(tenantId: string): Promise<ToolResult> {
  try {
    const plans = await prisma.successionPlan.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: {
        id: true,
        positionTitle: true,
        criticality: true,
        benchStrength: true,
        successors: true,
        turnoverRisk: true,
        vacancyImpact: true,
      },
    });

    if (plans.length === 0) {
      return {
        success: true,
        data: { criticalRoles: 0, filledSuccessions: 0, avgReadiness: 0, gaps: [] },
      };
    }

    const gaps: {
      roleTitle: string;
      criticality: string;
      successorCount: number;
      avgReadiness: number;
    }[] = [];

    let totalReadiness = 0;
    let readinessCount = 0;
    let filledCount = 0;

    for (const plan of plans) {
      const successors = plan.successors as Array<{
        userId?: string;
        readiness?: number;
        probability?: number;
      }>;
      const successorCount = Array.isArray(successors) ? successors.length : 0;

      // Calculate average readiness from successors array
      let avgReadiness = 0;
      if (Array.isArray(successors) && successors.length > 0) {
        const readinessValues = successors
          .map((s) => s.readiness ?? 0)
          .filter((v) => v > 0);
        if (readinessValues.length > 0) {
          avgReadiness =
            Math.round(
              (readinessValues.reduce((a, b) => a + b, 0) / readinessValues.length) * 100,
            ) / 100;
          totalReadiness += avgReadiness;
          readinessCount++;
        }
      }

      if (successorCount > 0) filledCount++;

      // Identify gaps: critical/high roles with insufficient bench
      if (
        (plan.criticality === 'CRITICAL' || plan.criticality === 'HIGH') &&
        (successorCount < 2 || avgReadiness < 0.6)
      ) {
        gaps.push({
          roleTitle: plan.positionTitle,
          criticality: plan.criticality,
          successorCount,
          avgReadiness,
        });
      }
    }

    const overallAvgReadiness =
      readinessCount > 0 ? Math.round((totalReadiness / readinessCount) * 100) / 100 : 0;

    // Sort gaps by criticality
    const critOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    gaps.sort((a, b) => (critOrder[a.criticality] ?? 3) - (critOrder[b.criticality] ?? 3));

    return {
      success: true,
      data: {
        criticalRoles: plans.length,
        filledSuccessions: filledCount,
        avgReadiness: overallAvgReadiness,
        gaps,
      },
    };
  } catch (err) {
    logger.error('querySuccessionReadiness tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 8. queryPerformanceSnapshots
// ══════════════════════════════════════════════════════════

/**
 * Generate a combined performance snapshot for a user — ideal for
 * 1:1 meeting preparation. Includes goals, feedback, reviews,
 * and activity metrics.
 */
export async function queryPerformanceSnapshots(
  tenantId: string,
  userId: string,
): Promise<ToolResult> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel
    const [user, goals, recentFeedback, recentReviews, dailyMetrics] = await Promise.all([
      prisma.user.findFirst({
        where: { id: userId, tenantId, deletedAt: null },
        select: { id: true, firstName: true, lastName: true, level: true, jobTitle: true },
      }),
      prisma.goal.findMany({
        where: { tenantId, ownerId: userId, deletedAt: null },
        select: { id: true, title: true, status: true, progress: true, dueDate: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      prisma.feedback.findMany({
        where: {
          tenantId,
          toUserId: userId,
          deletedAt: null,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          type: true,
          content: true,
          sentiment: true,
          sentimentScore: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.review.findMany({
        where: { tenantId, revieweeId: userId, deletedAt: null },
        select: {
          overallRating: true,
          strengths: true,
          areasForGrowth: true,
          summary: true,
          submittedAt: true,
        },
        orderBy: { submittedAt: 'desc' },
        take: 3,
      }),
      prisma.dailyPerformanceMetric.findMany({
        where: { tenantId, userId, metricDate: { gte: thirtyDaysAgo } },
        select: {
          metricDate: true,
          overallPerformanceScore: true,
          avgProductivityScore: true,
          avgEngagementScore: true,
          totalTasksCompleted: true,
        },
        orderBy: { metricDate: 'desc' },
        take: 30,
      }),
    ]);

    if (!user) {
      return { success: false, data: null, error: 'User not found in tenant' };
    }

    // Derive top wins
    const topWins: string[] = [];
    const completedGoals = goals.filter((g) => g.status === 'COMPLETED');
    if (completedGoals.length > 0) {
      topWins.push(`Completed ${completedGoals.length} goal(s): ${completedGoals.map((g) => g.title).join(', ')}`);
    }
    const positiveFeedback = recentFeedback.filter(
      (f) => f.sentimentScore != null && Number(f.sentimentScore) > 0.3,
    );
    if (positiveFeedback.length > 0) {
      topWins.push(`Received ${positiveFeedback.length} positive feedback item(s)`);
    }
    if (recentReviews.length > 0 && recentReviews[0].overallRating && recentReviews[0].overallRating >= 4) {
      topWins.push(`Latest review rating: ${recentReviews[0].overallRating}/5`);
    }

    // Derive areas to watch
    const areasToWatch: string[] = [];
    const atRiskGoals = goals.filter(
      (g) => g.status === 'ACTIVE' && g.dueDate && g.dueDate < new Date() && g.progress < 80,
    );
    if (atRiskGoals.length > 0) {
      areasToWatch.push(`${atRiskGoals.length} overdue goal(s) below 80% progress`);
    }
    const negativeFeedback = recentFeedback.filter(
      (f) => f.sentimentScore != null && Number(f.sentimentScore) < -0.2,
    );
    if (negativeFeedback.length > 0) {
      areasToWatch.push(`${negativeFeedback.length} recent feedback item(s) with negative sentiment`);
    }
    if (recentReviews.length > 0 && recentReviews[0].areasForGrowth.length > 0) {
      areasToWatch.push(`Growth areas from latest review: ${recentReviews[0].areasForGrowth.join(', ')}`);
    }

    // Goal summary
    const goalSummary = {
      total: goals.length,
      completed: completedGoals.length,
      inProgress: goals.filter((g) => g.status === 'ACTIVE').length,
      atRisk: atRiskGoals.length,
      avgProgress: goals.length > 0
        ? Math.round(goals.reduce((a, g) => a + g.progress, 0) / goals.length)
        : 0,
    };

    // Metrics snapshot
    const perfScores = dailyMetrics
      .map((m) => (m.overallPerformanceScore ? Number(m.overallPerformanceScore) : null))
      .filter((v): v is number => v !== null);
    const avgPerf =
      perfScores.length > 0
        ? Math.round((perfScores.reduce((a, b) => a + b, 0) / perfScores.length) * 100) / 100
        : null;

    const tasksCompleted = dailyMetrics.reduce((a, m) => a + m.totalTasksCompleted, 0);

    return {
      success: true,
      data: {
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        topWins,
        areasToWatch,
        goalSummary,
        feedbackHighlights: {
          totalRecent: recentFeedback.length,
          positive: positiveFeedback.length,
          negative: negativeFeedback.length,
        },
        metricsSnapshot: {
          avgPerformanceScore: avgPerf,
          tasksCompletedLast30Days: tasksCompleted,
          dataPointDays: dailyMetrics.length,
        },
      },
    };
  } catch (err) {
    logger.error('queryPerformanceSnapshots tool failed', { tenantId, userId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 9. queryWorkloadDistribution
// ══════════════════════════════════════════════════════════

/**
 * Analyze workload distribution across a manager's team.
 * Returns per-member workload scores, active goals, and pending reviews.
 */
export async function queryWorkloadDistribution(
  tenantId: string,
  managerId?: string,
): Promise<ToolResult> {
  try {
    const userWhere: Record<string, unknown> = { tenantId, isActive: true, deletedAt: null };
    if (managerId) userWhere.managerId = managerId;

    const members = await prisma.user.findMany({
      where: userWhere,
      select: { id: true, firstName: true, lastName: true },
      take: 200,
    });

    if (members.length === 0) {
      return {
        success: true,
        data: { members: [], avgWorkload: 0, overloadedCount: 0 },
      };
    }

    const memberIds = members.map((m) => m.id);
    const memberMap = new Map(members.map((m) => [m.id, m]));

    // Get latest workload snapshot per user
    const snapshots = await prisma.workloadSnapshot.findMany({
      where: { tenantId, userId: { in: memberIds } },
      select: {
        userId: true,
        workloadScore: true,
        balanceStatus: true,
        activeGoals: true,
        pendingReviews: true,
        snapshotTime: true,
      },
      orderBy: { snapshotTime: 'desc' },
      take: 500,
    });

    const latestByUser = new Map<string, typeof snapshots[0]>();
    for (const snap of snapshots) {
      if (!latestByUser.has(snap.userId)) latestByUser.set(snap.userId, snap);
    }

    let totalWorkload = 0;
    let workloadCount = 0;
    let overloadedCount = 0;

    const memberResults = members.map((member) => {
      const snap = latestByUser.get(member.id);
      const workloadScore = snap?.workloadScore ? Number(snap.workloadScore) : 0;
      const balanceStatus = snap?.balanceStatus ?? 'unknown';

      if (snap?.workloadScore) {
        totalWorkload += workloadScore;
        workloadCount++;
      }
      if (balanceStatus === 'overloaded' || balanceStatus === 'heavy') {
        overloadedCount++;
      }

      return {
        userId: member.id,
        name: `${member.firstName} ${member.lastName}`,
        workloadScore: Math.round(workloadScore * 100) / 100,
        balanceStatus,
        activeGoals: snap?.activeGoals ?? 0,
        pendingReviews: snap?.pendingReviews ?? 0,
      };
    });

    // Sort by workload score descending
    memberResults.sort((a, b) => b.workloadScore - a.workloadScore);

    return {
      success: true,
      data: {
        members: memberResults,
        avgWorkload:
          workloadCount > 0
            ? Math.round((totalWorkload / workloadCount) * 100) / 100
            : 0,
        overloadedCount,
      },
    };
  } catch (err) {
    logger.error('queryWorkloadDistribution tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 10. queryCommunicationPatterns
// ══════════════════════════════════════════════════════════

/**
 * Analyze communication patterns: sentiment trends, interaction
 * frequency, and collaboration index from ActivityEvent and
 * CommunicationSentiment data.
 */
export async function queryCommunicationPatterns(
  tenantId: string,
  userId?: string,
): Promise<ToolResult> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const sentimentWhere: Record<string, unknown> = {
      tenantId,
      analysisPeriodStart: { gte: sixtyDaysAgo },
    };
    if (userId) sentimentWhere.userId = userId;

    // Communication sentiment — last 60 days for trend
    const sentiments = await prisma.communicationSentiment.findMany({
      where: sentimentWhere,
      select: {
        userId: true,
        overallSentimentScore: true,
        collaborationSentiment: true,
        communicationFrequency: true,
        engagementLevel: true,
        analysisPeriodStart: true,
      },
      orderBy: { analysisPeriodStart: 'desc' },
      take: 200,
    });

    // Activity events — communication type
    const activityWhere: Record<string, unknown> = {
      tenantId,
      eventType: { in: ['message', 'communication', 'collaboration', 'meeting', 'feedback'] },
      createdAt: { gte: thirtyDaysAgo },
    };
    if (userId) activityWhere.userId = userId;

    const activityCount = await prisma.activityEvent.count({ where: activityWhere });

    // Compute sentiment trend (first half vs second half of 60-day window)
    const midPoint = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const firstHalf = sentiments
      .filter((s) => s.analysisPeriodStart < midPoint && s.overallSentimentScore != null)
      .map((s) => Number(s.overallSentimentScore));
    const secondHalf = sentiments
      .filter((s) => s.analysisPeriodStart >= midPoint && s.overallSentimentScore != null)
      .map((s) => Number(s.overallSentimentScore));

    const firstAvg =
      firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
    const secondAvg =
      secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;

    const sentimentTrend =
      firstHalf.length > 0 && secondHalf.length > 0
        ? secondAvg > firstAvg + 0.05
          ? 'improving'
          : secondAvg < firstAvg - 0.05
            ? 'declining'
            : 'stable'
        : 'insufficient_data';

    // Collaboration index from latest sentiments
    const collabScores = sentiments
      .filter((s) => s.collaborationSentiment != null)
      .map((s) => Number(s.collaborationSentiment));
    const collaborationIndex =
      collabScores.length > 0
        ? Math.round((collabScores.reduce((a, b) => a + b, 0) / collabScores.length) * 100) / 100
        : 0;

    // Calculate per-day frequency
    const daysInWindow = 30;
    const interactionFrequency =
      Math.round((activityCount / daysInWindow) * 100) / 100;

    return {
      success: true,
      data: {
        sentimentTrend,
        sentimentCurrentAvg: Math.round(secondAvg * 100) / 100,
        interactionFrequency,
        totalInteractions: activityCount,
        collaborationIndex,
        dataPoints: sentiments.length,
      },
    };
  } catch (err) {
    logger.error('queryCommunicationPatterns tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 11. queryCompensationAlignment
// ══════════════════════════════════════════════════════════

/**
 * Analyze whether performance review ratings are equitably distributed
 * across organizational levels. Does NOT access compensation data directly
 * (privacy-safe) — focuses on rating distribution patterns.
 */
export async function queryCompensationAlignment(tenantId: string): Promise<ToolResult> {
  try {
    const reviews = await prisma.review.findMany({
      where: { tenantId, deletedAt: null, overallRating: { not: null } },
      select: { overallRating: true, revieweeId: true },
    });

    if (reviews.length === 0) {
      return { success: true, data: { byLevel: [], inequities: [] } };
    }

    const revieweeIds = [...new Set(reviews.map((r) => r.revieweeId))];
    const users = await prisma.user.findMany({
      where: { tenantId, id: { in: revieweeIds }, deletedAt: null },
      select: { id: true, level: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Group ratings by level
    const byLevel = new Map<number, number[]>();
    for (const r of reviews) {
      const user = userMap.get(r.revieweeId);
      const level = user?.level ?? 0;
      if (!byLevel.has(level)) byLevel.set(level, []);
      byLevel.get(level)!.push(r.overallRating!);
    }

    // Overall average
    const allRatings = reviews.map((r) => r.overallRating!);
    const overallAvg = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;

    const levelData: { level: number; avgRating: number; count: number }[] = [];
    const inequities: { description: string; severity: string }[] = [];

    const sortedLevels = Array.from(byLevel.keys()).sort((a, b) => a - b);
    for (const level of sortedLevels) {
      const ratings = byLevel.get(level)!;
      const avg = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100;
      levelData.push({ level, avgRating: avg, count: ratings.length });

      // Flag if significantly above or below overall average
      const diff = avg - overallAvg;
      if (Math.abs(diff) > 0.5 && ratings.length >= 3) {
        inequities.push({
          description: `Level ${level} avg rating (${avg.toFixed(2)}) deviates ${diff > 0 ? '+' : ''}${diff.toFixed(2)} from overall avg (${overallAvg.toFixed(2)})`,
          severity: Math.abs(diff) > 1.0 ? 'high' : 'medium',
        });
      }
    }

    return {
      success: true,
      data: {
        byLevel: levelData,
        inequities,
        overallAvgRating: Math.round(overallAvg * 100) / 100,
        totalReviews: reviews.length,
      },
    };
  } catch (err) {
    logger.error('queryCompensationAlignment tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 12. queryLearningProgress
// ══════════════════════════════════════════════════════════

/**
 * Track development plan progress and learning activity completion
 * rates for a user or across the tenant.
 */
export async function queryLearningProgress(
  tenantId: string,
  userId?: string,
): Promise<ToolResult> {
  try {
    const planWhere: Record<string, unknown> = { tenantId };
    if (userId) planWhere.userId = userId;

    const plans = await prisma.developmentPlan.findMany({
      where: planWhere,
      select: {
        id: true,
        planName: true,
        userId: true,
        totalActivities: true,
        completedActivities: true,
        startDate: true,
        targetCompletionDate: true,
      },
      orderBy: { startDate: 'desc' },
      take: userId ? 20 : 100,
    });

    // Get activities for these plans
    const planIds = plans.map((p) => p.id);
    const activities = planIds.length > 0
      ? await prisma.developmentActivity.findMany({
          where: { tenantId, developmentPlanId: { in: planIds } },
          select: {
            developmentPlanId: true,
            status: true,
            actualHours: true,
            estimatedHours: true,
          },
        })
      : [];

    // Group activities by plan
    const activitiesByPlan = new Map<string, typeof activities>();
    for (const a of activities) {
      if (!activitiesByPlan.has(a.developmentPlanId)) {
        activitiesByPlan.set(a.developmentPlanId, []);
      }
      activitiesByPlan.get(a.developmentPlanId)!.push(a);
    }

    let totalHoursInvested = 0;
    let overallCompleted = 0;
    let overallTotal = 0;

    const planResults = plans.map((plan) => {
      const planActivities = activitiesByPlan.get(plan.id) ?? [];
      const activitiesCompleted = planActivities.filter((a) => a.status === 'COMPLETED').length;
      const activitiesTotal = planActivities.length || plan.totalActivities;

      // Sum hours invested
      const hoursInvested = planActivities.reduce(
        (sum, a) => sum + (a.actualHours ? Number(a.actualHours) : 0),
        0,
      );
      totalHoursInvested += hoursInvested;

      overallCompleted += activitiesCompleted;
      overallTotal += activitiesTotal;

      const progress =
        activitiesTotal > 0
          ? Math.round((activitiesCompleted / activitiesTotal) * 100)
          : 0;

      return {
        planName: plan.planName,
        progress,
        activitiesTotal,
        activitiesCompleted,
        hoursInvested: Math.round(hoursInvested * 10) / 10,
      };
    });

    const overallCompletion =
      overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;

    return {
      success: true,
      data: {
        plans: planResults,
        overallCompletion,
        hoursInvested: Math.round(totalHoursInvested * 10) / 10,
        totalPlans: plans.length,
      },
    };
  } catch (err) {
    logger.error('queryLearningProgress tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 13. suggestRetentionActions
// ══════════════════════════════════════════════════════════

/**
 * Generate a personalized retention strategy for a specific at-risk user
 * based on their attrition risk factors.
 */
export async function suggestRetentionActions(
  tenantId: string,
  userId: string,
): Promise<ToolResult> {
  try {
    // First assess the user's attrition risk
    const riskResult = await queryAttritionRisk(tenantId, { limit: 500 });
    const riskData = riskResult.data as Array<{
      userId: string;
      riskLevel: string;
      factors: string[];
    }>;

    const userRisk = Array.isArray(riskData)
      ? riskData.find((r) => r.userId === userId)
      : null;

    // Fetch user details
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, level: true, hireDate: true },
    });

    if (!user) {
      return { success: false, data: null, error: 'User not found in tenant' };
    }

    const riskLevel = userRisk?.riskLevel ?? 'low';
    const factors = userRisk?.factors ?? [];

    const suggestions: {
      action: string;
      priority: string;
      description: string;
      estimatedImpact: string;
    }[] = [];

    // Map specific factors to retention actions
    for (const factor of factors) {
      if (factor.includes('engagement')) {
        suggestions.push({
          action: 'Schedule career development conversation',
          priority: 'high',
          description: 'Declining engagement often signals unmet career aspirations. Have a 1:1 focused on career growth, stretch assignments, and learning opportunities.',
          estimatedImpact: 'high',
        });
      }
      if (factor.includes('feedback') && factor.includes('negative')) {
        suggestions.push({
          action: 'Address feedback concerns',
          priority: 'high',
          description: 'Negative feedback sentiment indicates dissatisfaction. Review recent feedback themes and create an action plan to address underlying concerns.',
          estimatedImpact: 'medium',
        });
      }
      if (factor.includes('goal activity')) {
        suggestions.push({
          action: 'Co-create meaningful goals',
          priority: 'medium',
          description: 'Absence of goal activity suggests disengagement from work objectives. Collaborate on setting goals that align personal interests with team needs.',
          estimatedImpact: 'medium',
        });
      }
      if (factor.includes('stagnation') || factor.includes('progression')) {
        suggestions.push({
          action: 'Discuss promotion pathway',
          priority: 'high',
          description: 'Tenure without level progression is a strong attrition indicator. Create a concrete development plan with clear milestones toward the next level.',
          estimatedImpact: 'high',
        });
        suggestions.push({
          action: 'Assign stretch project or cross-functional role',
          priority: 'medium',
          description: 'Provide visible, challenging assignments that build new skills and demonstrate trust in their capabilities.',
          estimatedImpact: 'medium',
        });
      }
    }

    // Universal retention suggestions for medium+ risk
    if (riskLevel === 'medium' || riskLevel === 'high' || riskLevel === 'critical') {
      suggestions.push({
        action: 'Increase recognition frequency',
        priority: 'medium',
        description: 'Ensure contributions are acknowledged publicly and privately. Regular recognition reduces attrition by up to 31%.',
        estimatedImpact: 'medium',
      });
    }
    if (riskLevel === 'high' || riskLevel === 'critical') {
      suggestions.push({
        action: 'Assign mentor or executive sponsor',
        priority: 'high',
        description: 'Connect this employee with a senior leader who can provide guidance, advocacy, and visibility within the organization.',
        estimatedImpact: 'high',
      });
      suggestions.push({
        action: 'Review work-life balance',
        priority: 'medium',
        description: 'Explore flexible work arrangements, workload redistribution, or other accommodations that improve work-life integration.',
        estimatedImpact: 'medium',
      });
    }
    if (riskLevel === 'critical') {
      suggestions.push({
        action: 'Stay interview with skip-level manager',
        priority: 'critical',
        description: 'Conduct a proactive stay interview to understand what would make them want to stay. Address concerns immediately and create a documented retention plan.',
        estimatedImpact: 'high',
      });
    }

    // Deduplicate by action name
    const seen = new Set<string>();
    const deduped = suggestions.filter((s) => {
      if (seen.has(s.action)) return false;
      seen.add(s.action);
      return true;
    });

    // Sort by priority
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    deduped.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));

    return {
      success: true,
      data: {
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        riskLevel,
        factors,
        suggestions: deduped,
      },
    };
  } catch (err) {
    logger.error('suggestRetentionActions tool failed', { tenantId, userId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 14. detectBiasInText
// ══════════════════════════════════════════════════════════

/**
 * Analyze a text string for gendered language and vague/non-actionable
 * feedback patterns. Returns flagged phrases with suggestions.
 *
 * NOTE: This tool does NOT require tenantId — it is a pure text analysis
 * function. However it accepts tenantId for consistency if called by
 * the agent orchestrator.
 */
export async function detectBiasInText(
  text: string,
): Promise<ToolResult> {
  try {
    if (!text || text.trim().length === 0) {
      return { success: true, data: { flags: [], overallScore: 100 } };
    }

    const flags: { original: string; suggested: string; biasType: string }[] = [];
    const lowerText = text.toLowerCase();

    // Check for gendered language
    for (const [word, replacement] of Object.entries(GENDERED_LANGUAGE_MAP)) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      if (regex.test(lowerText)) {
        flags.push({
          original: word,
          suggested: replacement.suggested,
          biasType: replacement.biasType,
        });
      }
    }

    // Check for vague feedback phrases
    for (const phrase of VAGUE_PHRASES) {
      if (lowerText.includes(phrase)) {
        flags.push({
          original: phrase,
          suggested: `Replace with specific, measurable observation (e.g., "In Q4, deliverables were late 3/5 times because...")`,
          biasType: 'vague_feedback',
        });
      }
    }

    // Check for exclusively superlative/dismissive language
    const dismissivePatterns = [
      { pattern: /\balways\b/gi, suggestion: 'Use specific frequency (e.g., "in 4 out of 5 instances")' },
      { pattern: /\bnever\b/gi, suggestion: 'Use specific examples instead of absolutes' },
      { pattern: /\beveryone knows\b/gi, suggestion: 'Provide specific evidence or observations' },
    ];
    for (const dp of dismissivePatterns) {
      if (dp.pattern.test(lowerText)) {
        flags.push({
          original: dp.pattern.source.replace(/\\b/g, ''),
          suggested: dp.suggestion,
          biasType: 'absolutist_language',
        });
      }
    }

    // Score: 100 = no bias detected, lower = more flags
    const overallScore = Math.max(0, Math.round(100 - flags.length * 12));

    return {
      success: true,
      data: { flags, overallScore },
    };
  } catch (err) {
    logger.error('detectBiasInText tool failed', { error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 15. queryMentorMatches
// ══════════════════════════════════════════════════════════

/**
 * Find potential mentors whose strengths complement a user's skill gaps.
 * Matches based on TechnicalSkillAssessment and BehavioralCompetencyScore
 * data.
 */
export async function queryMentorMatches(
  tenantId: string,
  userId: string,
): Promise<ToolResult> {
  try {
    // Get the user's skill gaps first
    const gapsResult = await querySkillGaps(tenantId, userId);
    const gapsData = gapsResult.data as Array<{
      userId: string;
      gaps: { skill: string; currentScore: number; requiredScore: number }[];
    }>;

    const userGaps = Array.isArray(gapsData) ? gapsData[0] : null;
    if (!userGaps || userGaps.gaps.length === 0) {
      return { success: true, data: [] };
    }

    const gapSkillNames = userGaps.gaps.map((g) => g.skill);

    // Get the target user's info
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { id: true, level: true, departmentId: true },
    });

    if (!targetUser) {
      return { success: false, data: null, error: 'User not found in tenant' };
    }

    // Find potential mentors: same tenant, active, higher or equal level
    const potentialMentors = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        id: { not: userId },
        level: { gte: targetUser.level },
      },
      select: { id: true, firstName: true, lastName: true, level: true },
      take: 200,
    });

    if (potentialMentors.length === 0) {
      return { success: true, data: [] };
    }

    const mentorIds = potentialMentors.map((m) => m.id);
    const mentorMap = new Map(potentialMentors.map((m) => [m.id, m]));

    // Get their technical skill scores
    const mentorSkills = await prisma.technicalSkillAssessment.findMany({
      where: {
        tenantId,
        userId: { in: mentorIds },
        skillName: { in: gapSkillNames },
        deletedAt: null,
      },
      select: { userId: true, skillName: true, finalScore: true },
    });

    // Get their behavioral competency scores
    const mentorBehavioral = await prisma.behavioralCompetencyScore.findMany({
      where: {
        tenantId,
        userId: { in: mentorIds },
        competencyName: { in: gapSkillNames },
      },
      select: { userId: true, competencyName: true, overallScore: true },
    });

    // Build mentor strength profiles
    const mentorStrengths = new Map<string, Map<string, number>>();
    for (const ms of mentorSkills) {
      if (!mentorStrengths.has(ms.userId)) mentorStrengths.set(ms.userId, new Map());
      const score = Number(ms.finalScore);
      if (score >= 3.5) {
        mentorStrengths.get(ms.userId)!.set(ms.skillName, score);
      }
    }
    for (const mb of mentorBehavioral) {
      if (!mentorStrengths.has(mb.userId)) mentorStrengths.set(mb.userId, new Map());
      const score = Number(mb.overallScore);
      if (score >= 3.5) {
        mentorStrengths.get(mb.userId)!.set(mb.competencyName, score);
      }
    }

    // Score each mentor
    const matches = Array.from(mentorStrengths.entries())
      .map(([mentorId, strengths]) => {
        const mentor = mentorMap.get(mentorId);
        if (!mentor) return null;

        const complementarySkills: string[] = [];
        let matchPoints = 0;

        for (const gap of userGaps.gaps) {
          const mentorScore = strengths.get(gap.skill);
          if (mentorScore != null && mentorScore > gap.currentScore) {
            complementarySkills.push(gap.skill);
            matchPoints += mentorScore - gap.currentScore;
          }
        }

        if (complementarySkills.length === 0) return null;

        // Normalize match score to 0-100
        const maxPossible = userGaps.gaps.length * 5; // max 5.0 per gap
        const matchScore = Math.min(100, Math.round((matchPoints / maxPossible) * 100));

        return {
          mentorId,
          name: `${mentor.firstName} ${mentor.lastName}`,
          matchScore,
          complementarySkills,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.matchScore - a!.matchScore)
      .slice(0, 10);

    return { success: true, data: matches };
  } catch (err) {
    logger.error('queryMentorMatches tool failed', { tenantId, userId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ══════════════════════════════════════════════════════════
// 16. createAutonomousAction
// ══════════════════════════════════════════════════════════

/**
 * Log an autonomous AI action as an insight card with type
 * 'AUTONOMOUS_ACTION' for human-in-the-loop approval.
 *
 * Low-impact actions can be auto-executed; medium/high require
 * manager approval before the system acts on them.
 */
export async function createAutonomousAction(
  tenantId: string,
  action: {
    type: string;
    description: string;
    targetUserId?: string;
    impact: 'low' | 'medium' | 'high';
    proposedAction: string;
    requiresApproval: boolean;
  },
): Promise<ToolResult> {
  try {
    const status = action.requiresApproval || action.impact !== 'low'
      ? 'pending_approval'
      : 'auto_executed';

    const insight = await prisma.aIInsightCard.create({
      data: {
        tenantId,
        userId: action.targetUserId ?? null,
        agentType: 'autonomous_agent',
        insightType: 'AUTONOMOUS_ACTION',
        title: `[${action.impact.toUpperCase()}] ${action.type}`,
        description: action.description,
        priority: action.impact === 'high' ? 'critical' : action.impact === 'medium' ? 'high' : 'medium',
        data: {
          actionType: action.type,
          proposedAction: action.proposedAction,
          impact: action.impact,
          requiresApproval: action.requiresApproval,
          status,
          createdAt: new Date().toISOString(),
        } as import('@prisma/client').Prisma.InputJsonValue,
        actionUrl: undefined,
        actionLabel: status === 'pending_approval' ? 'Review & Approve' : undefined,
      },
    });

    // Audit log the autonomous action
    auditLogger(
      'AI_AUTONOMOUS_ACTION_CREATED',
      action.targetUserId ?? null,
      tenantId,
      'ai_insight_card',
      insight.id,
      {
        actionType: action.type,
        impact: action.impact,
        status,
        requiresApproval: action.requiresApproval,
      },
    );

    logger.info('Autonomous action created', {
      tenantId,
      actionId: insight.id,
      type: action.type,
      impact: action.impact,
      status,
    });

    return {
      success: true,
      data: {
        actionId: insight.id,
        status,
      },
    };
  } catch (err) {
    logger.error('createAutonomousAction tool failed', { tenantId, error: (err as Error).message });
    return { success: false, data: null, error: (err as Error).message };
  }
}
