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
}

export const analyticsService = new AnalyticsService();
