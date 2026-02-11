// @ts-nocheck
// TODO: Fix type mismatches with Prisma schema
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export interface DashboardMetrics {
  goals: {
    total: number;
    completed: number;
    inProgress: number;
    avgProgress: number;
    onTrack: number;
    atRisk: number;
    overdue: number;
  };
  reviews: {
    activeCycles: number;
    completionRate: number;
    avgRating: number;
    pendingReviews: number;
    submittedReviews: number;
  };
  feedback: {
    total: number;
    praiseCount: number;
    constructiveCount: number;
    avgSentiment: number;
  };
  team: {
    totalEmployees: number;
    activeEmployees: number;
    avgGoalsPerEmployee: number;
  };
}

export interface PerformanceDistribution {
  rating: number;
  count: number;
  percentage: number;
}

export interface GoalCompletionTrend {
  month: string;
  completed: number;
  created: number;
  completionRate: number;
}

export interface FeedbackTrend {
  month: string;
  praise: number;
  constructive: number;
  total: number;
}

export interface TeamPerformance {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  avgGoalProgress: number;
  avgRating: number;
  feedbackCount: number;
}

export interface BiasMetrics {
  dimension: string;
  category: string;
  avgRating: number;
  count: number;
  variance: number;
}

export class AnalyticsService {
  /**
   * Get dashboard metrics for the authenticated user
   */
  async getDashboardMetrics(tenantId: string, userId: string, userRoles: string[]): Promise<DashboardMetrics> {
    const isManager = userRoles.includes('MANAGER') || userRoles.includes('ADMIN') || userRoles.includes('HR_ADMIN');
    const isHRAdmin = userRoles.includes('HR_ADMIN') || userRoles.includes('ADMIN');

    // Goal metrics
    const goalWhereClause = isHRAdmin
      ? { tenantId, deletedAt: null }
      : isManager
      ? {
          tenantId,
          deletedAt: null,
          OR: [
            { ownerId: userId },
            { owner: { managerId: userId } },
          ],
        }
      : { tenantId, ownerId: userId, deletedAt: null };

    const goals = await prisma.goal.findMany({
      where: goalWhereClause,
      select: {
        id: true,
        status: true,
        progress: true,
        dueDate: true,
      },
    });

    const now = new Date();
    const goalMetrics = {
      total: goals.length,
      completed: goals.filter((g) => g.status === 'COMPLETED').length,
      inProgress: goals.filter((g) => g.status === 'ACTIVE').length,
      avgProgress: goals.length > 0 ? Math.round(goals.reduce((acc, g) => acc + g.progress, 0) / goals.length) : 0,
      onTrack: goals.filter((g) => g.status === 'ACTIVE' && g.progress >= 50).length,
      atRisk: goals.filter((g) => g.status === 'ACTIVE' && g.progress < 30 && g.dueDate && new Date(g.dueDate) > now).length,
      overdue: goals.filter((g) => g.status === 'ACTIVE' && g.dueDate && new Date(g.dueDate) < now).length,
    };

    // Review metrics
    const activeCycles = await prisma.reviewCycle.count({
      where: {
        tenantId,
        status: { in: ['SELF_ASSESSMENT', 'MANAGER_REVIEW', 'CALIBRATION'] },  // FIXED: Using correct enum values
        deletedAt: null
      },
    });

    const reviewWhereClause = isHRAdmin
      ? { tenantId }
      : isManager
      ? {
          tenantId,
          OR: [
            { revieweeId: userId },
            { reviewerId: userId },
            { reviewee: { managerId: userId } },
          ],
        }
      : { tenantId, OR: [{ revieweeId: userId }, { reviewerId: userId }] };

    const reviews = await prisma.review.findMany({
      where: reviewWhereClause,
      select: {
        status: true,
        overallRating: true,
      },
    });

    const submittedReviews = reviews.filter((r) => ['SUBMITTED', 'CALIBRATED', 'FINALIZED', 'ACKNOWLEDGED'].includes(r.status));
    const reviewMetrics = {
      activeCycles,
      completionRate: reviews.length > 0 ? Math.round((submittedReviews.length / reviews.length) * 100) : 0,
      avgRating: submittedReviews.length > 0
        ? Number((submittedReviews.reduce((acc, r) => acc + (r.overallRating || 0), 0) / submittedReviews.length).toFixed(1))
        : 0,
      pendingReviews: reviews.filter((r) => ['NOT_STARTED', 'IN_PROGRESS'].includes(r.status)).length,
      submittedReviews: submittedReviews.length,
    };

    // Feedback metrics
    const feedbackWhereClause = isHRAdmin
      ? { tenantId }
      : { tenantId, OR: [{ fromUserId: userId }, { toUserId: userId }] };

    const feedback = await prisma.feedback.findMany({
      where: feedbackWhereClause,
      select: {
        type: true,
        sentiment: true,
      },
    });

    const feedbackMetrics = {
      total: feedback.length,
      praiseCount: feedback.filter((f) => f.type === 'PRAISE' || f.type === 'RECOGNITION').length,
      constructiveCount: feedback.filter((f) => f.type === 'CONSTRUCTIVE').length,
      avgSentiment: feedback.length > 0
        ? Number((feedback.filter((f) => f.sentiment).reduce((acc, f) => acc + (f.sentiment === 'POSITIVE' ? 1 : f.sentiment === 'NEGATIVE' ? -1 : 0), 0) / feedback.length).toFixed(2))
        : 0,
    };

    // Team metrics (for managers/admins)
    let teamMetrics = {
      totalEmployees: 0,
      activeEmployees: 0,
      avgGoalsPerEmployee: 0,
    };

    if (isManager || isHRAdmin) {
      const employeeWhereClause = isHRAdmin
        ? { tenantId, deletedAt: null }
        : { tenantId, managerId: userId, deletedAt: null };

      const employees = await prisma.user.count({ where: employeeWhereClause });
      const activeEmployees = await prisma.user.count({ where: { ...employeeWhereClause, isActive: true } });

      teamMetrics = {
        totalEmployees: employees,
        activeEmployees,
        avgGoalsPerEmployee: employees > 0 ? Number((goalMetrics.total / employees).toFixed(1)) : 0,
      };
    }

    return {
      goals: goalMetrics,
      reviews: reviewMetrics,
      feedback: feedbackMetrics,
      team: teamMetrics,
    };
  }

  /**
   * Get performance rating distribution
   */
  async getPerformanceDistribution(tenantId: string, cycleId?: string): Promise<PerformanceDistribution[]> {
    const whereClause: any = {
      tenantId,
      overallRating: { not: null },
      status: { in: ['FINALIZED', 'ACKNOWLEDGED'] },
    };

    if (cycleId) {
      whereClause.cycleId = cycleId;
    }

    const reviews = await prisma.review.findMany({
      where: whereClause,
      select: { overallRating: true },
    });

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      if (r.overallRating && r.overallRating >= 1 && r.overallRating <= 5) {
        distribution[Math.round(r.overallRating)]++;
      }
    });

    const total = reviews.length || 1;
    return Object.entries(distribution).map(([rating, count]) => ({
      rating: parseInt(rating),
      count,
      percentage: Math.round((count / total) * 100),
    }));
  }

  /**
   * Get goal completion trends over time
   */
  async getGoalCompletionTrends(tenantId: string, months = 6): Promise<GoalCompletionTrend[]> {
    const trends: GoalCompletionTrend[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const created = await prisma.goal.count({
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
      });

      const completed = await prisma.goal.count({
        where: {
          tenantId,
          status: 'COMPLETED',
          updatedAt: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
      });

      trends.push({
        month: startDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        completed,
        created,
        completionRate: created > 0 ? Math.round((completed / created) * 100) : 0,
      });
    }

    return trends;
  }

  /**
   * Get feedback trends over time
   */
  async getFeedbackTrends(tenantId: string, months = 6): Promise<FeedbackTrend[]> {
    const trends: FeedbackTrend[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const feedback = await prisma.feedback.findMany({
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { type: true },
      });

      trends.push({
        month: startDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        praise: feedback.filter((f) => f.type === 'PRAISE' || f.type === 'RECOGNITION').length,
        constructive: feedback.filter((f) => f.type === 'CONSTRUCTIVE').length,
        total: feedback.length,
      });
    }

    return trends;
  }

  /**
   * Get team/department performance comparison
   */
  async getTeamPerformance(tenantId: string): Promise<TeamPerformance[]> {
    const departments = await prisma.department.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        users: {
          where: { deletedAt: null, isActive: true },
          select: { id: true },
        },
      },
    });

    const results: TeamPerformance[] = [];

    for (const dept of departments) {
      const userIds = dept.users.map((u) => u.id);

      if (userIds.length === 0) continue;

      // Get avg goal progress
      const goals = await prisma.goal.findMany({
        where: { tenantId, ownerId: { in: userIds }, deletedAt: null, status: 'ACTIVE' },
        select: { progress: true },
      });

      // Get avg rating
      const reviews = await prisma.review.findMany({
        where: {
          tenantId,
          revieweeId: { in: userIds },
          overallRating: { not: null },
          status: { in: ['FINALIZED', 'ACKNOWLEDGED'] },
        },
        select: { overallRating: true },
      });

      // Get feedback count
      const feedbackCount = await prisma.feedback.count({
        where: { tenantId, toUserId: { in: userIds } },
      });

      results.push({
        departmentId: dept.id,
        departmentName: dept.name,
        employeeCount: userIds.length,
        avgGoalProgress: goals.length > 0
          ? Math.round(goals.reduce((acc, g) => acc + g.progress, 0) / goals.length)
          : 0,
        avgRating: reviews.length > 0
          ? Number((reviews.reduce((acc, r) => acc + (r.overallRating || 0), 0) / reviews.length).toFixed(1))
          : 0,
        feedbackCount,
      });
    }

    return results.sort((a, b) => b.avgRating - a.avgRating);
  }

  /**
   * Get bias/fairness metrics for HR admins
   */
  async getBiasMetrics(tenantId: string, cycleId?: string): Promise<BiasMetrics[]> {
    // This would analyze ratings by demographic dimensions
    // For privacy, we only show aggregate statistics with minimum thresholds

    const whereClause: any = {
      tenantId,
      overallRating: { not: null },
      status: { in: ['FINALIZED', 'ACKNOWLEDGED'] },
    };

    if (cycleId) {
      whereClause.cycleId = cycleId;
    }

    const reviews = await prisma.review.findMany({
      where: whereClause,
      include: {
        reviewee: {
          select: {
            department: { select: { name: true } },
            level: true,
          },
        },
      },
    });

    const metrics: BiasMetrics[] = [];

    // Analyze by department (only if enough data points)
    const byDepartment: Record<string, number[]> = {};
    reviews.forEach((r) => {
      const dept = r.reviewee.department?.name || 'Unknown';
      if (!byDepartment[dept]) byDepartment[dept] = [];
      if (r.overallRating) byDepartment[dept].push(r.overallRating);
    });

    for (const [dept, ratings] of Object.entries(byDepartment)) {
      if (ratings.length >= 5) { // Minimum threshold for privacy
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        const variance = ratings.reduce((acc, r) => acc + Math.pow(r - avg, 2), 0) / ratings.length;
        metrics.push({
          dimension: 'Department',
          category: dept,
          avgRating: Number(avg.toFixed(2)),
          count: ratings.length,
          variance: Number(variance.toFixed(2)),
        });
      }
    }

    // Analyze by level
    const byLevel: Record<string, number[]> = {};
    reviews.forEach((r) => {
      const level = (r.reviewee as any).level?.toString() || 'Unknown';
      if (!byLevel[level]) byLevel[level] = [];
      if (r.overallRating) byLevel[level].push(r.overallRating);
    });

    for (const [level, ratings] of Object.entries(byLevel)) {
      if (ratings.length >= 5) {
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        const variance = ratings.reduce((acc, r) => acc + Math.pow(r - avg, 2), 0) / ratings.length;
        metrics.push({
          dimension: 'Level',
          category: `Level ${level}`,
          avgRating: Number(avg.toFixed(2)),
          count: ratings.length,
          variance: Number(variance.toFixed(2)),
        });
      }
    }

    return metrics;
  }

  /**
   * Get review cycle statistics
   */
  async getCycleStats(tenantId: string, cycleId: string) {
    const reviews = await prisma.review.findMany({
      where: { tenantId, cycleId },
      select: {
        status: true,
        type: true,
        overallRating: true,
        submittedAt: true,
      },
    });

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const ratings: number[] = [];

    reviews.forEach((r) => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byType[r.type] = (byType[r.type] || 0) + 1;
      if (r.overallRating) ratings.push(r.overallRating);
    });

    return {
      total: reviews.length,
      byStatus,
      byType,
      avgRating: ratings.length > 0
        ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2))
        : null,
      completionRate: reviews.length > 0
        ? Math.round((reviews.filter((r) => ['SUBMITTED', 'CALIBRATED', 'FINALIZED', 'ACKNOWLEDGED'].includes(r.status)).length / reviews.length) * 100)
        : 0,
    };
  }

  /**
   * Export analytics data as CSV
   */
  async exportData(
    tenantId: string,
    dataType: 'goals' | 'reviews' | 'feedback',
    filters?: Record<string, any>
  ): Promise<string> {
    let data: any[] = [];
    let headers: string[] = [];

    switch (dataType) {
      case 'goals':
        headers = ['Title', 'Owner', 'Type', 'Status', 'Progress', 'Due Date', 'Created'];
        data = await prisma.goal.findMany({
          where: { tenantId, deletedAt: null, ...filters },
          include: { owner: { select: { firstName: true, lastName: true } } },
        });
        data = data.map((g) => [
          g.title,
          `${g.owner.firstName} ${g.owner.lastName}`,
          g.type,
          g.status,
          g.progress,
          g.dueDate?.toISOString().split('T')[0] || '',
          g.createdAt.toISOString().split('T')[0],
        ]);
        break;

      case 'reviews':
        headers = ['Cycle', 'Reviewee', 'Reviewer', 'Type', 'Status', 'Rating', 'Submitted'];
        data = await prisma.review.findMany({
          where: { tenantId, ...filters },
          include: {
            cycle: { select: { name: true } },
            reviewee: { select: { firstName: true, lastName: true } },
            reviewer: { select: { firstName: true, lastName: true } },
          },
        });
        data = data.map((r) => [
          r.cycle.name,
          `${r.reviewee.firstName} ${r.reviewee.lastName}`,
          `${r.reviewer.firstName} ${r.reviewer.lastName}`,
          r.type,
          r.status,
          r.overallRating || '',
          r.submittedAt?.toISOString().split('T')[0] || '',
        ]);
        break;

      case 'feedback':
        headers = ['From', 'To', 'Type', 'Visibility', 'Sentiment', 'Created'];
        data = await prisma.feedback.findMany({
          where: { tenantId, ...filters },
          include: {
            fromUser: { select: { firstName: true, lastName: true } },
            toUser: { select: { firstName: true, lastName: true } },
          },
        });
        data = data.map((f) => [
          f.isAnonymous ? 'Anonymous' : `${f.fromUser?.firstName} ${f.fromUser?.lastName}`,
          `${f.toUser.firstName} ${f.toUser.lastName}`,
          f.type,
          f.visibility,
          f.sentiment || '',
          f.createdAt.toISOString().split('T')[0],
        ]);
        break;
    }

    // Generate CSV
    const csv = [headers.join(','), ...data.map((row) => row.map((cell: any) => `"${cell}"`).join(','))].join('\n');

    return csv;
  }

  // ============================================================================
  // HR Analytics Endpoints
  // ============================================================================

  /**
   * GET /analytics/compensation
   * Compensation vs Performance analysis with linear regression
   */
  async getCompensationAnalysis(tenantId: string) {
    // Fetch active users with department info
    const users = await prisma.user.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: { select: { name: true } },
      },
    });

    if (users.length === 0) {
      return {
        employees: [],
        medianComp: 0,
        trendLine: { slope: 0, intercept: 0 },
        tiers: [],
        deptRatios: [],
      };
    }

    const userIds = users.map((u) => u.id);

    // Fetch latest completed reviews per user (for ratings)
    const reviews = await prisma.review.findMany({
      where: {
        tenantId,
        revieweeId: { in: userIds },
        overallRating: { not: null },
        status: { in: ['SUBMITTED', 'CALIBRATED', 'FINALIZED', 'ACKNOWLEDGED'] },
      },
      select: {
        revieweeId: true,
        overallRating: true,
        submittedAt: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    // Build a map of userId -> latest overallRating
    const ratingMap: Record<string, number> = {};
    for (const r of reviews) {
      if (!ratingMap[r.revieweeId] && r.overallRating != null) {
        ratingMap[r.revieweeId] = r.overallRating;
      }
    }

    // Fetch latest compensation decisions (BASE_SALARY preferred) per employee
    const compDecisions = await prisma.compensationDecision.findMany({
      where: {
        tenantId,
        employeeId: { in: userIds },
        status: { in: ['APPROVED', 'IMPLEMENTED'] },
        type: 'BASE_SALARY',
      },
      select: {
        employeeId: true,
        newAmount: true,
        effectiveDate: true,
      },
      orderBy: { effectiveDate: 'desc' },
    });

    const compMap: Record<string, number> = {};
    for (const c of compDecisions) {
      if (!compMap[c.employeeId]) {
        compMap[c.employeeId] = c.newAmount;
      }
    }

    // Build employee list (only those with both rating and compensation)
    const employees: any[] = [];
    for (const u of users) {
      const rating = ratingMap[u.id];
      const compensation = compMap[u.id];
      if (rating != null && compensation != null) {
        employees.push({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          department: u.department?.name || 'Unknown',
          rating,
          compensation,
        });
      }
    }

    // Linear regression: compensation = slope * rating + intercept
    let slope = 0;
    let intercept = 0;
    if (employees.length >= 2) {
      const n = employees.length;
      const sumX = employees.reduce((acc, e) => acc + e.rating, 0);
      const sumY = employees.reduce((acc, e) => acc + e.compensation, 0);
      const sumXY = employees.reduce((acc, e) => acc + e.rating * e.compensation, 0);
      const sumX2 = employees.reduce((acc, e) => acc + e.rating * e.rating, 0);

      const denom = n * sumX2 - sumX * sumX;
      if (denom !== 0) {
        slope = Math.round((n * sumXY - sumX * sumY) / denom);
        intercept = Math.round((sumY - slope * sumX) / n);
      }
    }

    // Add expectedComp from trend line
    for (const emp of employees) {
      emp.expectedComp = Math.round(slope * emp.rating + intercept);
    }

    // Median compensation
    const sortedComps = employees.map((e) => e.compensation).sort((a, b) => a - b);
    const medianComp =
      sortedComps.length > 0
        ? sortedComps.length % 2 === 0
          ? Math.round((sortedComps[sortedComps.length / 2 - 1] + sortedComps[sortedComps.length / 2]) / 2)
          : sortedComps[Math.floor(sortedComps.length / 2)]
        : 0;

    // Rating tiers
    const tierDefs = [
      { label: 'Low (1-2.5)', min: 1, max: 2.5 },
      { label: 'Mid (2.6-3.5)', min: 2.6, max: 3.5 },
      { label: 'High (3.6-4.5)', min: 3.6, max: 4.5 },
      { label: 'Top (4.6-5)', min: 4.6, max: 5 },
    ];
    const tiers = tierDefs.map((t) => {
      const inTier = employees.filter((e) => e.rating >= t.min && e.rating <= t.max);
      const avgComp = inTier.length > 0 ? Math.round(inTier.reduce((acc, e) => acc + e.compensation, 0) / inTier.length) : 0;
      return { label: t.label, avgComp, count: inTier.length };
    });

    // Department ratios
    const deptGroups: Record<string, { total: number; count: number }> = {};
    for (const emp of employees) {
      if (!deptGroups[emp.department]) {
        deptGroups[emp.department] = { total: 0, count: 0 };
      }
      deptGroups[emp.department].total += emp.compensation;
      deptGroups[emp.department].count++;
    }

    const overallAvgComp = employees.length > 0 ? employees.reduce((acc, e) => acc + e.compensation, 0) / employees.length : 1;
    const deptRatios = Object.entries(deptGroups).map(([department, { total, count }]) => {
      const avgComp = Math.round(total / count);
      return {
        department,
        avgComp,
        ratio: (avgComp / overallAvgComp).toFixed(2),
        count,
      };
    });

    return {
      employees,
      medianComp,
      trendLine: { slope, intercept },
      tiers,
      deptRatios,
    };
  }

  /**
   * GET /analytics/bias
   * Bias detection: department distributions, manager leniency, demographic groupings
   */
  async getBiasAnalysis(tenantId: string) {
    // Fetch all finalized/acknowledged reviews with reviewee and reviewer info
    const reviews = await prisma.review.findMany({
      where: {
        tenantId,
        overallRating: { not: null },
        status: { in: ['SUBMITTED', 'CALIBRATED', 'FINALIZED', 'ACKNOWLEDGED'] },
      },
      select: {
        overallRating: true,
        revieweeId: true,
        reviewerId: true,
        reviewee: {
          select: {
            firstName: true,
            lastName: true,
            hireDate: true,
            level: true,
            department: { select: { name: true } },
          },
        },
        reviewer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (reviews.length === 0) {
      return {
        deptDistribution: [],
        managerRatings: [],
        demographic: [],
        overallMean: 0,
      };
    }

    const allRatings = reviews.map((r) => r.overallRating!);
    const overallMean = Number((allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(2));

    // --- Department distribution ---
    const deptBuckets: Record<string, number[]> = {};
    for (const r of reviews) {
      const dept = r.reviewee.department?.name || 'Unknown';
      if (!deptBuckets[dept]) deptBuckets[dept] = [];
      deptBuckets[dept].push(r.overallRating!);
    }

    const deptDistribution = Object.entries(deptBuckets).map(([department, ratings]) => {
      const buckets: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
      for (const rating of ratings) {
        const rounded = Math.min(5, Math.max(1, Math.round(rating)));
        buckets[String(rounded)]++;
      }
      const mean = Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2));
      const variance = ratings.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / ratings.length;
      const stdDev = Number(Math.sqrt(variance).toFixed(2));

      return {
        department,
        '1': buckets['1'],
        '2': buckets['2'],
        '3': buckets['3'],
        '4': buckets['4'],
        '5': buckets['5'],
        mean,
        stdDev,
      };
    });

    // --- Manager ratings (reviewer-level aggregation) ---
    const managerBuckets: Record<string, { name: string; ratings: number[] }> = {};
    for (const r of reviews) {
      const mgrId = r.reviewerId;
      if (!managerBuckets[mgrId]) {
        managerBuckets[mgrId] = {
          name: `${r.reviewer.firstName} ${r.reviewer.lastName}`,
          ratings: [],
        };
      }
      managerBuckets[mgrId].ratings.push(r.overallRating!);
    }

    const managerRatings = Object.values(managerBuckets)
      .filter((m) => m.ratings.length >= 2) // need at least 2 reviews to be meaningful
      .map((m) => {
        const avgRating = Number((m.ratings.reduce((a, b) => a + b, 0) / m.ratings.length).toFixed(2));
        let label: string;
        if (avgRating > overallMean + 0.5) {
          label = 'lenient';
        } else if (avgRating < overallMean - 0.5) {
          label = 'severe';
        } else {
          label = 'neutral';
        }
        return {
          manager: m.name,
          avgRating,
          reviewCount: m.ratings.length,
          label,
        };
      })
      .sort((a, b) => b.avgRating - a.avgRating);

    // --- Demographic groupings ---
    const demographic: any[] = [];

    // By tenure
    const now = new Date();
    const tenureBuckets: Record<string, number[]> = {
      '< 1 year': [],
      '1-2 years': [],
      '3-5 years': [],
      '5+ years': [],
    };
    for (const r of reviews) {
      if (r.reviewee.hireDate) {
        const yearsOfService = (now.getTime() - new Date(r.reviewee.hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        let bucket: string;
        if (yearsOfService < 1) bucket = '< 1 year';
        else if (yearsOfService < 3) bucket = '1-2 years';
        else if (yearsOfService < 6) bucket = '3-5 years';
        else bucket = '5+ years';
        tenureBuckets[bucket].push(r.overallRating!);
      }
    }
    for (const [category, ratings] of Object.entries(tenureBuckets)) {
      if (ratings.length > 0) {
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        const variance = ratings.reduce((acc, r) => acc + Math.pow(r - avg, 2), 0) / ratings.length;
        demographic.push({
          grouping: 'Tenure',
          category,
          count: ratings.length,
          avgRating: Number(avg.toFixed(2)),
          stdDev: Number(Math.sqrt(variance).toFixed(2)),
        });
      }
    }

    // By level
    const levelBuckets: Record<string, number[]> = {};
    for (const r of reviews) {
      const level = `Level ${r.reviewee.level}`;
      if (!levelBuckets[level]) levelBuckets[level] = [];
      levelBuckets[level].push(r.overallRating!);
    }
    for (const [category, ratings] of Object.entries(levelBuckets)) {
      if (ratings.length > 0) {
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        const variance = ratings.reduce((acc, r) => acc + Math.pow(r - avg, 2), 0) / ratings.length;
        demographic.push({
          grouping: 'Level',
          category,
          count: ratings.length,
          avgRating: Number(avg.toFixed(2)),
          stdDev: Number(Math.sqrt(variance).toFixed(2)),
        });
      }
    }

    return {
      deptDistribution,
      managerRatings,
      demographic,
      overallMean,
    };
  }

  /**
   * GET /analytics/normalization
   * Z-score normalization of ratings per department
   */
  async getNormalizationAnalysis(tenantId: string) {
    // Fetch all completed reviews with reviewee info
    const reviews = await prisma.review.findMany({
      where: {
        tenantId,
        overallRating: { not: null },
        status: { in: ['SUBMITTED', 'CALIBRATED', 'FINALIZED', 'ACKNOWLEDGED'] },
      },
      select: {
        revieweeId: true,
        overallRating: true,
        reviewee: {
          select: {
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    if (reviews.length === 0) {
      return {
        employees: [],
        distribution: [],
        bellCurveMetrics: { rSquared: 0, skewness: 0, kurtosis: 0 },
      };
    }

    // Deduplicate: take first (most recent) review per reviewee
    const seen = new Set<string>();
    const uniqueReviews: typeof reviews = [];
    for (const r of reviews) {
      if (!seen.has(r.revieweeId)) {
        seen.add(r.revieweeId);
        uniqueReviews.push(r);
      }
    }

    // Global mean and stdDev
    const allRatings = uniqueReviews.map((r) => r.overallRating!);
    const globalMean = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
    const globalVariance = allRatings.reduce((acc, r) => acc + Math.pow(r - globalMean, 2), 0) / allRatings.length;
    const globalStdDev = Math.sqrt(globalVariance);

    // Department-level stats
    const deptStats: Record<string, { mean: number; stdDev: number }> = {};
    const deptRatings: Record<string, number[]> = {};
    for (const r of uniqueReviews) {
      const dept = r.reviewee.department?.name || 'Unknown';
      if (!deptRatings[dept]) deptRatings[dept] = [];
      deptRatings[dept].push(r.overallRating!);
    }
    for (const [dept, ratings] of Object.entries(deptRatings)) {
      const mean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const variance = ratings.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / ratings.length;
      deptStats[dept] = { mean, stdDev: Math.sqrt(variance) };
    }

    // Normalize each employee
    const employees = uniqueReviews.map((r) => {
      const dept = r.reviewee.department?.name || 'Unknown';
      const { mean: deptMean, stdDev: deptStd } = deptStats[dept];
      const originalRating = r.overallRating!;

      // Z-score within department (avoid division by zero)
      const zScore = deptStd > 0 ? (originalRating - deptMean) / deptStd : 0;

      // Normalized rating: map z-score onto global distribution
      const normalizedRating = Math.min(5, Math.max(1, globalMean + zScore * (globalStdDev > 0 ? globalStdDev : 1)));
      const adjustment = normalizedRating - originalRating;

      return {
        id: r.revieweeId,
        name: `${r.reviewee.firstName} ${r.reviewee.lastName}`,
        department: dept,
        originalRating: Number(originalRating.toFixed(2)),
        zScore: Number(zScore.toFixed(2)),
        normalizedRating: Number(normalizedRating.toFixed(2)),
        adjustment: Number(adjustment.toFixed(2)),
      };
    });

    // Distribution histogram: count original and normalized ratings in 0.5 buckets from 1.0 to 5.0
    const bucketLabels: string[] = [];
    for (let r = 1.0; r <= 5.0; r += 0.5) {
      bucketLabels.push(r.toFixed(1));
    }
    const distribution = bucketLabels.map((label) => {
      const val = parseFloat(label);
      const lo = val - 0.25;
      const hi = val + 0.25;
      const original = employees.filter((e) => e.originalRating >= lo && e.originalRating < hi).length;
      const normalized = employees.filter((e) => e.normalizedRating >= lo && e.normalizedRating < hi).length;
      return { rating: label, original, normalized };
    });

    // Bell curve fitness metrics
    const n = allRatings.length;
    const m3 = allRatings.reduce((acc, r) => acc + Math.pow(r - globalMean, 3), 0) / n;
    const m4 = allRatings.reduce((acc, r) => acc + Math.pow(r - globalMean, 4), 0) / n;
    const skewness = globalStdDev > 0 ? Number((m3 / Math.pow(globalStdDev, 3)).toFixed(2)) : 0;
    const kurtosis = globalStdDev > 0 ? Number((m4 / Math.pow(globalStdDev, 4)).toFixed(2)) : 0;

    // R-squared: how well the distribution fits a normal curve
    // Compare observed frequencies to expected normal frequencies
    const expectedFreqs = bucketLabels.map((label) => {
      const val = parseFloat(label);
      // Use probability density function approximation
      const z = globalStdDev > 0 ? (val - globalMean) / globalStdDev : 0;
      const pdf = Math.exp(-0.5 * z * z) / (globalStdDev * Math.sqrt(2 * Math.PI));
      return pdf * n * 0.5; // 0.5 = bucket width
    });
    const observedFreqs = distribution.map((d) => d.normalized);
    const meanObserved = observedFreqs.reduce((a, b) => a + b, 0) / observedFreqs.length;
    const ssTot = observedFreqs.reduce((acc, o) => acc + Math.pow(o - meanObserved, 2), 0);
    const ssRes = observedFreqs.reduce((acc, o, i) => acc + Math.pow(o - expectedFreqs[i], 2), 0);
    const rSquared = ssTot > 0 ? Number(Math.max(0, 1 - ssRes / ssTot).toFixed(3)) : 0;

    return {
      employees,
      distribution,
      bellCurveMetrics: {
        rSquared,
        skewness,
        kurtosis,
      },
    };
  }
}

export const analyticsService = new AnalyticsService();
