import { prisma } from '@pms/database';
import { mean, weightedMean, ewma } from '@pms/core';
import { DAYS } from '../../utils/constants';

/**
 * LeaderboardService
 *
 * Queries real PostgreSQL data via Prisma and computes leaderboard rankings
 * using deterministic math from @pms/core. NO mock data, NO hardcoded users,
 * NO Math.random(). Every number is derived from actual database records.
 */
export class LeaderboardService {
  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Converts a period query parameter to a cutoff Date.
   *   week    = last 7 days
   *   month   = last 30 days
   *   quarter = last 90 days
   *   year    = last 365 days
   */
  periodToDate(period: string | undefined): Date {
    const now = new Date();
    const days =
      period === 'week' ? 7 :
      period === 'month' ? 30 :
      period === 'quarter' ? 90 :
      period === 'year' ? 365 :
      365; // default to year
    return new Date(now.getTime() - DAYS(days));
  }

  /**
   * Returns the number of days corresponding to a period string.
   */
  periodToDays(period: string | undefined): number {
    return period === 'week' ? 7 :
      period === 'month' ? 30 :
      period === 'quarter' ? 90 :
      365;
  }

  /**
   * Compute a simplified performance score for a single user from their
   * goals, reviews, and feedback within the given period.
   *
   * Scoring weights (when all three data sources are available):
   *   - Goal progress component:     50%
   *   - Review rating component:     30%
   *   - Feedback sentiment component: 20%
   *
   * When a data source is missing for a user the remaining sources are
   * re-weighted proportionally so the total always sums to 100%.
   *
   * Returns a score on a 0-100 scale.
   */
  computeUserScore(
    userGoals: Array<{ progress: number; weight: number; status: string; priority: string }>,
    userReviews: Array<{ overallRating: number }>,
    userFeedback: Array<{ sentimentScore: number | null }>,
  ): {
    score: number;
    goalScore: number;
    reviewScore: number;
    feedbackScore: number;
    goalsCompleted: number;
    goalsTotal: number;
    reviewRating: number | null;
  } {
    // --- Goal component ---
    let goalScore = 0;
    const goalsTotal = userGoals.length;
    const goalsCompleted = userGoals.filter(g => g.status === 'COMPLETED').length;

    if (userGoals.length > 0) {
      const priorityMultipliers: Record<string, number> = {
        CRITICAL: 1.3,
        HIGH: 1.15,
        MEDIUM: 1.0,
        LOW: 0.9,
      };

      const progresses = userGoals.map(g => {
        const multiplier = priorityMultipliers[g.priority] ?? 1.0;
        return Math.min(100, g.progress * multiplier);
      });
      const weights = userGoals.map(g => g.weight);
      const totalWeight = weights.reduce((s, w) => s + w, 0);

      goalScore = totalWeight > 0
        ? weightedMean(progresses, weights)
        : mean(progresses);
    }

    // --- Review component (normalized 0-100 from 0-5 scale) ---
    let reviewScore = 0;
    let reviewRating: number | null = null;

    if (userReviews.length > 0) {
      const avgRating = mean(userReviews.map(r => r.overallRating));
      reviewRating = Math.round(avgRating * 100) / 100;
      reviewScore = (avgRating / 5) * 100;
    }

    // --- Feedback sentiment component (normalized 0-100 from 0-1 scale) ---
    let feedbackScore = 0;
    const validFeedback = userFeedback.filter(
      (f): f is { sentimentScore: number } => f.sentimentScore !== null,
    );

    if (validFeedback.length > 0) {
      // Use EWMA if we have enough data points to weight recent sentiment more
      const sentiments = validFeedback.map(f => f.sentimentScore);
      const avgSentiment =
        sentiments.length >= 3 ? ewma(sentiments, 0.4) : mean(sentiments);
      feedbackScore = avgSentiment * 100;
    }

    // --- Combine with proportional re-weighting ---
    const parts: Array<{ score: number; baseWeight: number }> = [];
    if (userGoals.length > 0) parts.push({ score: goalScore, baseWeight: 0.5 });
    if (userReviews.length > 0) parts.push({ score: reviewScore, baseWeight: 0.3 });
    if (validFeedback.length > 0) parts.push({ score: feedbackScore, baseWeight: 0.2 });

    let overallScore = 0;
    if (parts.length > 0) {
      const totalBaseWeight = parts.reduce((s, p) => s + p.baseWeight, 0);
      overallScore = parts.reduce(
        (s, p) => s + p.score * (p.baseWeight / totalBaseWeight),
        0,
      );
    }

    return {
      score: Math.round(overallScore * 100) / 100,
      goalScore: Math.round(goalScore * 100) / 100,
      reviewScore: Math.round(reviewScore * 100) / 100,
      feedbackScore: Math.round(feedbackScore * 100) / 100,
      goalsCompleted,
      goalsTotal,
      reviewRating,
    };
  }

  // ---------------------------------------------------------------------------
  // Performance leaderboard
  // ---------------------------------------------------------------------------

  async getPerformanceLeaderboard(tenantId: string, period: string | undefined) {
    const since = this.periodToDate(period);

    // 1. Fetch all active users in the tenant
    const users = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        departmentId: true,
        department: { select: { name: true } },
      },
    });

    if (users.length === 0) {
      return [];
    }

    const userIds = users.map(u => u.id);

    // 2. Batch-fetch goals, reviews, and feedback for all users in one query each
    const [allGoals, allReviews, allFeedback] = await Promise.all([
      prisma.goal.findMany({
        where: {
          ownerId: { in: userIds },
          tenantId,
          deletedAt: null,
          status: { in: ['ACTIVE', 'COMPLETED'] },
          OR: [
            { dueDate: { gte: since } },
            { createdAt: { gte: since } },
          ],
        },
        select: {
          ownerId: true,
          progress: true,
          weight: true,
          status: true,
          priority: true,
        },
      }),
      prisma.review.findMany({
        where: {
          revieweeId: { in: userIds },
          tenantId,
          deletedAt: null,
          overallRating: { not: null },
          status: { in: ['SUBMITTED', 'CALIBRATED', 'FINALIZED', 'ACKNOWLEDGED'] },
          createdAt: { gte: since },
        },
        select: {
          revieweeId: true,
          overallRating: true,
        },
      }),
      prisma.feedback.findMany({
        where: {
          toUserId: { in: userIds },
          tenantId,
          deletedAt: null,
          createdAt: { gte: since },
        },
        select: {
          toUserId: true,
          sentimentScore: true,
        },
      }),
    ]);

    // 3. Index data by user for O(1) lookup
    const goalsByUser = new Map<string, typeof allGoals>();
    for (const g of allGoals) {
      const arr = goalsByUser.get(g.ownerId) ?? [];
      arr.push(g);
      goalsByUser.set(g.ownerId, arr);
    }

    const reviewsByUser = new Map<string, typeof allReviews>();
    for (const r of allReviews) {
      const arr = reviewsByUser.get(r.revieweeId) ?? [];
      arr.push(r);
      reviewsByUser.set(r.revieweeId, arr);
    }

    const feedbackByUser = new Map<string, typeof allFeedback>();
    for (const f of allFeedback) {
      const arr = feedbackByUser.get(f.toUserId) ?? [];
      arr.push(f);
      feedbackByUser.set(f.toUserId, arr);
    }

    // 4. For trend detection, fetch scores from a preceding period of equal length
    const periodDays = this.periodToDays(period);
    const prevSince = new Date(since.getTime() - DAYS(periodDays));

    const [prevGoals, prevReviews, prevFeedback] = await Promise.all([
      prisma.goal.findMany({
        where: {
          ownerId: { in: userIds },
          tenantId,
          deletedAt: null,
          status: { in: ['ACTIVE', 'COMPLETED'] },
          OR: [
            { dueDate: { gte: prevSince, lt: since } },
            { createdAt: { gte: prevSince, lt: since } },
          ],
        },
        select: { ownerId: true, progress: true, weight: true, status: true, priority: true },
      }),
      prisma.review.findMany({
        where: {
          revieweeId: { in: userIds },
          tenantId,
          deletedAt: null,
          overallRating: { not: null },
          status: { in: ['SUBMITTED', 'CALIBRATED', 'FINALIZED', 'ACKNOWLEDGED'] },
          createdAt: { gte: prevSince, lt: since },
        },
        select: { revieweeId: true, overallRating: true },
      }),
      prisma.feedback.findMany({
        where: {
          toUserId: { in: userIds },
          tenantId,
          deletedAt: null,
          createdAt: { gte: prevSince, lt: since },
        },
        select: { toUserId: true, sentimentScore: true },
      }),
    ]);

    const prevGoalsByUser = new Map<string, typeof prevGoals>();
    for (const g of prevGoals) {
      const arr = prevGoalsByUser.get(g.ownerId) ?? [];
      arr.push(g);
      prevGoalsByUser.set(g.ownerId, arr);
    }
    const prevReviewsByUser = new Map<string, typeof prevReviews>();
    for (const r of prevReviews) {
      const arr = prevReviewsByUser.get(r.revieweeId) ?? [];
      arr.push(r);
      prevReviewsByUser.set(r.revieweeId, arr);
    }
    const prevFeedbackByUser = new Map<string, typeof prevFeedback>();
    for (const f of prevFeedback) {
      const arr = prevFeedbackByUser.get(f.toUserId) ?? [];
      arr.push(f);
      prevFeedbackByUser.set(f.toUserId, arr);
    }

    // 5. Compute current and previous scores, then build leaderboard entries
    const entries = users.map(user => {
      const currentMetrics = this.computeUserScore(
        (goalsByUser.get(user.id) ?? []).map(g => ({
          progress: g.progress,
          weight: g.weight,
          status: g.status,
          priority: g.priority,
        })),
        (reviewsByUser.get(user.id) ?? [])
          .filter((r): r is typeof r & { overallRating: number } => r.overallRating !== null)
          .map(r => ({ overallRating: r.overallRating! })),
        feedbackByUser.get(user.id) ?? [],
      );

      const prevMetrics = this.computeUserScore(
        (prevGoalsByUser.get(user.id) ?? []).map(g => ({
          progress: g.progress,
          weight: g.weight,
          status: g.status,
          priority: g.priority,
        })),
        (prevReviewsByUser.get(user.id) ?? [])
          .filter((r): r is typeof r & { overallRating: number } => r.overallRating !== null)
          .map(r => ({ overallRating: r.overallRating! })),
        prevFeedbackByUser.get(user.id) ?? [],
      );

      // trendUp: true if current score > previous, false if lower, null if no previous data
      let trendUp: boolean | null = null;
      if (prevMetrics.score > 0) {
        trendUp = currentMetrics.score > prevMetrics.score;
      }

      return {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          jobTitle: user.jobTitle,
          department: user.department?.name ?? null,
        },
        score: currentMetrics.score,
        goalsCompleted: currentMetrics.goalsCompleted,
        goalsTotal: currentMetrics.goalsTotal,
        reviewRating: currentMetrics.reviewRating,
        trendUp,
      };
    });

    // 6. Sort by score descending and assign ranks
    entries.sort((a, b) => b.score - a.score);

    const ranked = entries.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    return ranked;
  }

  // ---------------------------------------------------------------------------
  // Goals leaderboard
  // ---------------------------------------------------------------------------

  async getGoalsLeaderboard(tenantId: string, period: string | undefined) {
    const since = this.periodToDate(period);

    // 1. Fetch active users
    const users = await prisma.user.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        departmentId: true,
        department: { select: { name: true } },
      },
    });

    if (users.length === 0) {
      return [];
    }

    const userIds = users.map(u => u.id);

    // 2. Fetch goals within the period
    const goals = await prisma.goal.findMany({
      where: {
        ownerId: { in: userIds },
        tenantId,
        deletedAt: null,
        status: { in: ['ACTIVE', 'COMPLETED'] },
        OR: [
          { dueDate: { gte: since } },
          { createdAt: { gte: since } },
        ],
      },
      select: {
        ownerId: true,
        progress: true,
        weight: true,
        status: true,
        priority: true,
        completedAt: true,
        dueDate: true,
      },
    });

    // 3. Group by user
    const goalsByUser = new Map<string, typeof goals>();
    for (const g of goals) {
      const arr = goalsByUser.get(g.ownerId) ?? [];
      arr.push(g);
      goalsByUser.set(g.ownerId, arr);
    }

    // 4. Score each user by goal metrics
    //    - 60% completion rate (completed / total)
    //    - 30% weighted avg progress across non-completed goals
    //    - 10% on-time bonus (completed before dueDate)
    const entries = users.map(user => {
      const userGoals = goalsByUser.get(user.id) ?? [];
      const total = userGoals.length;
      const completed = userGoals.filter(g => g.status === 'COMPLETED').length;
      const completionRate = total > 0 ? (completed / total) * 100 : 0;

      // Weighted progress of in-progress goals
      const activeGoals = userGoals.filter(g => g.status === 'ACTIVE');
      let avgProgress = 0;
      if (activeGoals.length > 0) {
        const progresses = activeGoals.map(g => g.progress);
        const weights = activeGoals.map(g => g.weight);
        const totalWeight = weights.reduce((s, w) => s + w, 0);
        avgProgress = totalWeight > 0
          ? weightedMean(progresses, weights)
          : mean(progresses);
      }

      // On-time rate among completed goals
      const completedGoals = userGoals.filter(g => g.status === 'COMPLETED');
      let onTimeRate = 0;
      if (completedGoals.length > 0) {
        const onTime = completedGoals.filter(g => {
          if (!g.dueDate || !g.completedAt) return true;
          return g.completedAt <= g.dueDate;
        }).length;
        onTimeRate = (onTime / completedGoals.length) * 100;
      }

      const score = total > 0
        ? Math.round(
            (completionRate * 0.6 + avgProgress * 0.3 + onTimeRate * 0.1) * 100
          ) / 100
        : 0;

      return {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          jobTitle: user.jobTitle,
          department: user.department?.name ?? null,
        },
        score,
        goalsCompleted: completed,
        goalsTotal: total,
        completionRate: Math.round(completionRate * 100) / 100,
        avgProgress: Math.round(avgProgress * 100) / 100,
        onTimeRate: Math.round(onTimeRate * 100) / 100,
      };
    });

    entries.sort((a, b) => b.score - a.score);

    const ranked = entries.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    return ranked;
  }

  // ---------------------------------------------------------------------------
  // Recognition leaderboard
  // ---------------------------------------------------------------------------

  async getRecognitionLeaderboard(tenantId: string, period: string | undefined) {
    const since = this.periodToDate(period);

    // 1. Fetch active users
    const users = await prisma.user.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        departmentId: true,
        department: { select: { name: true } },
      },
    });

    if (users.length === 0) {
      return [];
    }

    const userIds = users.map(u => u.id);

    // 2. Fetch feedback received within the period
    const feedback = await prisma.feedback.findMany({
      where: {
        toUserId: { in: userIds },
        tenantId,
        deletedAt: null,
        createdAt: { gte: since },
      },
      select: {
        toUserId: true,
        type: true,
        sentimentScore: true,
      },
    });

    // 3. Group by user
    const feedbackByUser = new Map<string, typeof feedback>();
    for (const f of feedback) {
      const arr = feedbackByUser.get(f.toUserId) ?? [];
      arr.push(f);
      feedbackByUser.set(f.toUserId, arr);
    }

    // 4. Score each user:
    //    - 40% feedback volume (sigmoid-normalized count)
    //    - 40% average sentiment (0-100 scale)
    //    - 20% recognition/praise ratio (PRAISE + RECOGNITION types)
    const maxFeedbackCount = Math.max(
      1,
      ...Array.from(feedbackByUser.values()).map(arr => arr.length),
    );

    const entries = users.map(user => {
      const userFeedback = feedbackByUser.get(user.id) ?? [];
      const totalReceived = userFeedback.length;

      if (totalReceived === 0) {
        return {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            jobTitle: user.jobTitle,
            department: user.department?.name ?? null,
          },
          score: 0,
          totalReceived: 0,
          avgSentiment: null as number | null,
          praiseCount: 0,
        };
      }

      // Volume component: normalize count relative to highest in the tenant
      const volumeScore = (totalReceived / maxFeedbackCount) * 100;

      // Sentiment component
      const sentiments = userFeedback
        .map(f => f.sentimentScore)
        .filter((s): s is number => s !== null);
      const avgSentiment = sentiments.length > 0 ? mean(sentiments) * 100 : 50;

      // Recognition ratio
      const praiseCount = userFeedback.filter(
        f => f.type === 'PRAISE' || f.type === 'RECOGNITION',
      ).length;
      const recognitionRatio = (praiseCount / totalReceived) * 100;

      const score = Math.round(
        (volumeScore * 0.4 + avgSentiment * 0.4 + recognitionRatio * 0.2) * 100,
      ) / 100;

      return {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          jobTitle: user.jobTitle,
          department: user.department?.name ?? null,
        },
        score,
        totalReceived,
        avgSentiment: sentiments.length > 0
          ? Math.round(mean(sentiments) * 10000) / 100
          : null,
        praiseCount,
      };
    });

    entries.sort((a, b) => b.score - a.score);

    const ranked = entries.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    return ranked;
  }

  // ---------------------------------------------------------------------------
  // Learning leaderboard
  // ---------------------------------------------------------------------------

  async getLearningLeaderboard(tenantId: string, period: string | undefined) {
    const since = this.periodToDate(period);

    // 1. Fetch active users
    const users = await prisma.user.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        departmentId: true,
        department: { select: { name: true } },
      },
    });

    if (users.length === 0) {
      return [];
    }

    const userIds = users.map(u => u.id);

    // 2. Fetch development plans within the period
    const plans = await prisma.developmentPlan.findMany({
      where: {
        userId: { in: userIds },
        tenantId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
        startDate: { lte: new Date() },
        OR: [
          { targetCompletionDate: { gte: since } },
          { completedAt: { gte: since } },
        ],
      },
      select: {
        userId: true,
        status: true,
        progressPercentage: true,
        totalActivities: true,
        completedActivities: true,
        milestonesAchieved: true,
      },
    });

    // 3. Group by user
    const plansByUser = new Map<string, typeof plans>();
    for (const p of plans) {
      const arr = plansByUser.get(p.userId) ?? [];
      arr.push(p);
      plansByUser.set(p.userId, arr);
    }

    // 4. Score each user:
    //    - 50% average progress across plans
    //    - 30% activity completion rate (completedActivities / totalActivities)
    //    - 20% plan completion count bonus
    const entries = users.map(user => {
      const userPlans = plansByUser.get(user.id) ?? [];

      if (userPlans.length === 0) {
        return {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            jobTitle: user.jobTitle,
            department: user.department?.name ?? null,
          },
          score: 0,
          plansTotal: 0,
          plansCompleted: 0,
          avgProgress: 0,
          activitiesCompleted: 0,
          activitiesTotal: 0,
        };
      }

      const plansCompleted = userPlans.filter(p => p.status === 'COMPLETED').length;
      const avgProgress = mean(
        userPlans.map(p => Number(p.progressPercentage)),
      );

      const totalActivities = userPlans.reduce((s, p) => s + p.totalActivities, 0);
      const completedActivities = userPlans.reduce((s, p) => s + p.completedActivities, 0);
      const activityRate = totalActivities > 0
        ? (completedActivities / totalActivities) * 100
        : 0;

      // Plan completion bonus: sigmoid-like scaling so diminishing returns
      const completionBonus = userPlans.length > 0
        ? (plansCompleted / userPlans.length) * 100
        : 0;

      const score = Math.round(
        (avgProgress * 0.5 + activityRate * 0.3 + completionBonus * 0.2) * 100,
      ) / 100;

      return {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          jobTitle: user.jobTitle,
          department: user.department?.name ?? null,
        },
        score,
        plansTotal: userPlans.length,
        plansCompleted,
        avgProgress: Math.round(avgProgress * 100) / 100,
        activitiesCompleted: completedActivities,
        activitiesTotal: totalActivities,
      };
    });

    entries.sort((a, b) => b.score - a.score);

    const ranked = entries.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    return ranked;
  }

  // ---------------------------------------------------------------------------
  // Department scores
  // ---------------------------------------------------------------------------

  async getDepartmentScores(tenantId: string, period: string | undefined) {
    const since = this.periodToDate(period);

    // 1. Fetch active departments with their active users
    const departments = await prisma.department.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        users: {
          where: { isActive: true, deletedAt: null },
          select: { id: true },
        },
      },
    });

    if (departments.length === 0) {
      return [];
    }

    // Collect all user IDs across departments
    const allUserIds = departments.flatMap(d => d.users.map(u => u.id));

    if (allUserIds.length === 0) {
      return departments.map(d => ({
        id: d.id,
        name: d.name,
        memberCount: 0,
        avgScore: 0,
      }));
    }

    // 2. Batch-fetch goals, reviews, feedback for all users
    const [allGoals, allReviews, allFeedback] = await Promise.all([
      prisma.goal.findMany({
        where: {
          ownerId: { in: allUserIds },
          tenantId,
          deletedAt: null,
          status: { in: ['ACTIVE', 'COMPLETED'] },
          OR: [
            { dueDate: { gte: since } },
            { createdAt: { gte: since } },
          ],
        },
        select: { ownerId: true, progress: true, weight: true, status: true, priority: true },
      }),
      prisma.review.findMany({
        where: {
          revieweeId: { in: allUserIds },
          tenantId,
          deletedAt: null,
          overallRating: { not: null },
          status: { in: ['SUBMITTED', 'CALIBRATED', 'FINALIZED', 'ACKNOWLEDGED'] },
          createdAt: { gte: since },
        },
        select: { revieweeId: true, overallRating: true },
      }),
      prisma.feedback.findMany({
        where: {
          toUserId: { in: allUserIds },
          tenantId,
          deletedAt: null,
          createdAt: { gte: since },
        },
        select: { toUserId: true, sentimentScore: true },
      }),
    ]);

    // Index by user
    const goalsByUser = new Map<string, typeof allGoals>();
    for (const g of allGoals) {
      const arr = goalsByUser.get(g.ownerId) ?? [];
      arr.push(g);
      goalsByUser.set(g.ownerId, arr);
    }
    const reviewsByUser = new Map<string, typeof allReviews>();
    for (const r of allReviews) {
      const arr = reviewsByUser.get(r.revieweeId) ?? [];
      arr.push(r);
      reviewsByUser.set(r.revieweeId, arr);
    }
    const feedbackByUser = new Map<string, typeof allFeedback>();
    for (const f of allFeedback) {
      const arr = feedbackByUser.get(f.toUserId) ?? [];
      arr.push(f);
      feedbackByUser.set(f.toUserId, arr);
    }

    // 3. Compute per-department average score
    const deptEntries = departments.map(dept => {
      const memberIds = dept.users.map(u => u.id);
      const memberCount = memberIds.length;

      if (memberCount === 0) {
        return { id: dept.id, name: dept.name, memberCount: 0, avgScore: 0 };
      }

      const memberScores = memberIds.map(uid => {
        const metrics = this.computeUserScore(
          (goalsByUser.get(uid) ?? []).map(g => ({
            progress: g.progress,
            weight: g.weight,
            status: g.status,
            priority: g.priority,
          })),
          (reviewsByUser.get(uid) ?? [])
            .filter((r): r is typeof r & { overallRating: number } => r.overallRating !== null)
            .map(r => ({ overallRating: r.overallRating! })),
          feedbackByUser.get(uid) ?? [],
        );
        return metrics.score;
      });

      const avgScore = Math.round(mean(memberScores) * 100) / 100;

      return {
        id: dept.id,
        name: dept.name,
        memberCount,
        avgScore,
      };
    });

    deptEntries.sort((a, b) => b.avgScore - a.avgScore);

    return deptEntries;
  }

  // ---------------------------------------------------------------------------
  // My stats
  // ---------------------------------------------------------------------------

  async getMyStats(tenantId: string, currentUserId: string, period: string | undefined) {
    const since = this.periodToDate(period);

    // 1. Fetch all active users for ranking context
    const users = await prisma.user.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      select: { id: true },
    });

    const userIds = users.map(u => u.id);
    const totalUsers = userIds.length;

    // 2. Batch-fetch all data
    const [allGoals, allReviews, allFeedback, allPlans] = await Promise.all([
      prisma.goal.findMany({
        where: {
          ownerId: { in: userIds },
          tenantId,
          deletedAt: null,
          status: { in: ['ACTIVE', 'COMPLETED'] },
          OR: [
            { dueDate: { gte: since } },
            { createdAt: { gte: since } },
          ],
        },
        select: {
          ownerId: true,
          progress: true,
          weight: true,
          status: true,
          priority: true,
          completedAt: true,
          dueDate: true,
        },
      }),
      prisma.review.findMany({
        where: {
          revieweeId: { in: userIds },
          tenantId,
          deletedAt: null,
          overallRating: { not: null },
          status: { in: ['SUBMITTED', 'CALIBRATED', 'FINALIZED', 'ACKNOWLEDGED'] },
          createdAt: { gte: since },
        },
        select: { revieweeId: true, overallRating: true },
      }),
      prisma.feedback.findMany({
        where: {
          toUserId: { in: userIds },
          tenantId,
          deletedAt: null,
          createdAt: { gte: since },
        },
        select: { toUserId: true, sentimentScore: true, type: true },
      }),
      prisma.developmentPlan.findMany({
        where: {
          userId: { in: userIds },
          tenantId,
          status: { in: ['ACTIVE', 'COMPLETED'] },
          startDate: { lte: new Date() },
          OR: [
            { targetCompletionDate: { gte: since } },
            { completedAt: { gte: since } },
          ],
        },
        select: {
          userId: true,
          status: true,
          progressPercentage: true,
          totalActivities: true,
          completedActivities: true,
        },
      }),
    ]);

    // -- Helper: build indexed maps --
    const indexBy = <T extends Record<string, unknown>>(
      items: T[],
      keyFn: (item: T) => string,
    ) => {
      const map = new Map<string, T[]>();
      for (const item of items) {
        const key = keyFn(item);
        const arr = map.get(key) ?? [];
        arr.push(item);
        map.set(key, arr);
      }
      return map;
    };

    const goalsByUser = indexBy(allGoals, g => g.ownerId);
    const reviewsByUser = indexBy(allReviews, r => r.revieweeId);
    const feedbackByUser = indexBy(allFeedback, f => f.toUserId);
    const plansByUser = indexBy(allPlans, p => p.userId);

    // -- Compute performance scores for all users --
    const perfScores = userIds.map(uid => ({
      uid,
      score: this.computeUserScore(
        (goalsByUser.get(uid) ?? []).map(g => ({
          progress: g.progress,
          weight: g.weight,
          status: g.status,
          priority: g.priority,
        })),
        (reviewsByUser.get(uid) ?? [])
          .filter((r): r is typeof r & { overallRating: number } => r.overallRating !== null)
          .map(r => ({ overallRating: r.overallRating! })),
        feedbackByUser.get(uid) ?? [],
      ).score,
    }));
    perfScores.sort((a, b) => b.score - a.score);
    const perfRank = perfScores.findIndex(s => s.uid === currentUserId) + 1;

    // -- Compute goal scores for all users --
    const goalScores = userIds.map(uid => {
      const ug = goalsByUser.get(uid) ?? [];
      const total = ug.length;
      const completed = ug.filter(g => g.status === 'COMPLETED').length;
      const completionRate = total > 0 ? (completed / total) * 100 : 0;
      const activeGoals = ug.filter(g => g.status === 'ACTIVE');
      const avgProg = activeGoals.length > 0
        ? weightedMean(
            activeGoals.map(g => g.progress),
            activeGoals.map(g => g.weight),
          )
        : 0;
      const completedGoals = ug.filter(g => g.status === 'COMPLETED');
      let onTimeRate = 0;
      if (completedGoals.length > 0) {
        const onTime = completedGoals.filter(g => {
          if (!g.dueDate || !g.completedAt) return true;
          return g.completedAt <= g.dueDate;
        }).length;
        onTimeRate = (onTime / completedGoals.length) * 100;
      }
      return {
        uid,
        score: total > 0
          ? completionRate * 0.6 + avgProg * 0.3 + onTimeRate * 0.1
          : 0,
      };
    });
    goalScores.sort((a, b) => b.score - a.score);
    const goalRank = goalScores.findIndex(s => s.uid === currentUserId) + 1;

    // -- Compute recognition scores for all users --
    const maxFeedbackCount = Math.max(
      1,
      ...userIds.map(uid => (feedbackByUser.get(uid) ?? []).length),
    );
    const recogScores = userIds.map(uid => {
      const uf = feedbackByUser.get(uid) ?? [];
      if (uf.length === 0) return { uid, score: 0 };
      const volumeScore = (uf.length / maxFeedbackCount) * 100;
      const sentiments = uf
        .map(f => f.sentimentScore)
        .filter((s): s is number => s !== null);
      const avgSentiment = sentiments.length > 0 ? mean(sentiments) * 100 : 50;
      const praiseCount = uf.filter(
        f => f.type === 'PRAISE' || f.type === 'RECOGNITION',
      ).length;
      const recognitionRatio = (praiseCount / uf.length) * 100;
      return {
        uid,
        score: volumeScore * 0.4 + avgSentiment * 0.4 + recognitionRatio * 0.2,
      };
    });
    recogScores.sort((a, b) => b.score - a.score);
    const recogRank = recogScores.findIndex(s => s.uid === currentUserId) + 1;

    // -- Compute learning scores for all users --
    const learnScores = userIds.map(uid => {
      const up = plansByUser.get(uid) ?? [];
      if (up.length === 0) return { uid, score: 0 };
      const avgProgress = mean(up.map(p => Number(p.progressPercentage)));
      const totalAct = up.reduce((s, p) => s + p.totalActivities, 0);
      const completedAct = up.reduce((s, p) => s + p.completedActivities, 0);
      const actRate = totalAct > 0 ? (completedAct / totalAct) * 100 : 0;
      const plansDone = up.filter(p => p.status === 'COMPLETED').length;
      const completionBonus = (plansDone / up.length) * 100;
      return {
        uid,
        score: avgProgress * 0.5 + actRate * 0.3 + completionBonus * 0.2,
      };
    });
    learnScores.sort((a, b) => b.score - a.score);
    const learnRank = learnScores.findIndex(s => s.uid === currentUserId) + 1;

    // -- Build response --
    const myPerf = perfScores.find(s => s.uid === currentUserId);
    const myGoal = goalScores.find(s => s.uid === currentUserId);
    const myRecog = recogScores.find(s => s.uid === currentUserId);
    const myLearn = learnScores.find(s => s.uid === currentUserId);

    return {
      totalUsers,
      performance: {
        rank: perfRank,
        score: Math.round((myPerf?.score ?? 0) * 100) / 100,
        percentile: totalUsers > 1
          ? Math.round(((totalUsers - perfRank) / (totalUsers - 1)) * 10000) / 100
          : 100,
      },
      goals: {
        rank: goalRank,
        score: Math.round((myGoal?.score ?? 0) * 100) / 100,
        percentile: totalUsers > 1
          ? Math.round(((totalUsers - goalRank) / (totalUsers - 1)) * 10000) / 100
          : 100,
      },
      recognition: {
        rank: recogRank,
        score: Math.round((myRecog?.score ?? 0) * 100) / 100,
        percentile: totalUsers > 1
          ? Math.round(((totalUsers - recogRank) / (totalUsers - 1)) * 10000) / 100
          : 100,
      },
      learning: {
        rank: learnRank,
        score: Math.round((myLearn?.score ?? 0) * 100) / 100,
        percentile: totalUsers > 1
          ? Math.round(((totalUsers - learnRank) / (totalUsers - 1)) * 10000) / 100
          : 100,
      },
    };
  }
}

export const leaderboardService = new LeaderboardService();
