import { prisma } from '@pms/database';
import { ConflictError } from '../../utils/errors';

interface PulseSubmitInput {
  moodScore: number;
  energyScore?: number;
  stressScore?: number;
  comment?: string;
  isAnonymous?: boolean;
}

class PulseService {
  /**
   * Submit a daily/weekly pulse check-in.
   */
  async submit(tenantId: string, userId: string, input: PulseSubmitInput) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already submitted today
    const existing = await prisma.pulseSurveyResponse.findUnique({
      where: {
        tenantId_userId_surveyDate_surveyType: {
          tenantId,
          userId,
          surveyDate: today,
          surveyType: 'DAILY',
        },
      },
    });

    if (existing) {
      throw new ConflictError('You have already submitted a pulse check-in today.');
    }

    return prisma.pulseSurveyResponse.create({
      data: {
        tenantId,
        userId,
        moodScore: input.moodScore,
        energyScore: input.energyScore ?? null,
        stressScore: input.stressScore ?? null,
        comment: input.comment ?? null,
        isAnonymous: input.isAnonymous ?? false,
        surveyDate: today,
        surveyType: 'DAILY',
      },
    });
  }

  /**
   * Check if user can submit today.
   */
  async canSubmit(tenantId: string, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.pulseSurveyResponse.findUnique({
      where: {
        tenantId_userId_surveyDate_surveyType: {
          tenantId,
          userId,
          surveyDate: today,
          surveyType: 'DAILY',
        },
      },
    });

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      canSubmit: !existing,
      lastSubmission: existing?.createdAt?.toISOString() ?? null,
      nextAvailable: existing ? tomorrow.toISOString() : null,
      surveyType: 'DAILY',
    };
  }

  /**
   * Get user's own pulse history.
   */
  async getMyHistory(tenantId: string, userId: string, limit: number = 30) {
    return prisma.pulseSurveyResponse.findMany({
      where: { tenantId, userId },
      orderBy: { surveyDate: 'desc' },
      take: limit,
    });
  }

  /**
   * Analytics: Overview stats for managers.
   */
  async getAnalyticsOverview(tenantId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const responses = await prisma.pulseSurveyResponse.findMany({
      where: {
        tenantId,
        surveyDate: { gte: since },
      },
      select: {
        moodScore: true,
        energyScore: true,
        stressScore: true,
      },
    });

    const totalUsers = await prisma.user.count({
      where: { tenantId, isActive: true },
    });

    const uniqueRespondents = await prisma.pulseSurveyResponse.groupBy({
      by: ['userId'],
      where: {
        tenantId,
        surveyDate: { gte: since },
      },
    });

    if (responses.length === 0) {
      return {
        averageMood: 0,
        averageEnergy: null,
        averageStress: null,
        totalResponses: 0,
        participationRate: 0,
        moodDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
        trendDirection: null,
      };
    }

    const avgMood = responses.reduce((sum, r) => sum + r.moodScore, 0) / responses.length;
    const energyResponses = responses.filter((r) => r.energyScore !== null);
    const stressResponses = responses.filter((r) => r.stressScore !== null);

    const avgEnergy =
      energyResponses.length > 0
        ? energyResponses.reduce((sum, r) => sum + (r.energyScore ?? 0), 0) / energyResponses.length
        : null;

    const avgStress =
      stressResponses.length > 0
        ? stressResponses.reduce((sum, r) => sum + (r.stressScore ?? 0), 0) / stressResponses.length
        : null;

    const moodDistribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const r of responses) {
      moodDistribution[String(r.moodScore)] = (moodDistribution[String(r.moodScore)] || 0) + 1;
    }

    // Compute trend: compare last 7 days vs previous 7 days
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const prevWeek = new Date();
    prevWeek.setDate(prevWeek.getDate() - 14);

    const recentAvg = await this.getAverageMoodForPeriod(tenantId, lastWeek, new Date());
    const prevAvg = await this.getAverageMoodForPeriod(tenantId, prevWeek, lastWeek);

    let trendDirection: string | null = null;
    if (recentAvg !== null && prevAvg !== null) {
      const diff = recentAvg - prevAvg;
      trendDirection = diff > 0.2 ? 'IMPROVING' : diff < -0.2 ? 'DECLINING' : 'STABLE';
    }

    return {
      averageMood: Math.round(avgMood * 100) / 100,
      averageEnergy: avgEnergy !== null ? Math.round(avgEnergy * 100) / 100 : null,
      averageStress: avgStress !== null ? Math.round(avgStress * 100) / 100 : null,
      totalResponses: responses.length,
      participationRate:
        totalUsers > 0
          ? Math.round((uniqueRespondents.length / totalUsers) * 100)
          : 0,
      moodDistribution,
      trendDirection,
    };
  }

  /**
   * Analytics: Daily trend data for charts.
   */
  async getAnalyticsTrends(tenantId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const responses = await prisma.pulseSurveyResponse.findMany({
      where: {
        tenantId,
        surveyDate: { gte: since },
      },
      orderBy: { surveyDate: 'asc' },
      select: {
        moodScore: true,
        energyScore: true,
        stressScore: true,
        surveyDate: true,
      },
    });

    // Group by date
    const byDate = new Map<
      string,
      { moods: number[]; energies: number[]; stresses: number[] }
    >();

    for (const r of responses) {
      const dateKey = r.surveyDate.toISOString().split('T')[0];
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, { moods: [], energies: [], stresses: [] });
      }
      const bucket = byDate.get(dateKey)!;
      bucket.moods.push(r.moodScore);
      if (r.energyScore !== null) bucket.energies.push(r.energyScore);
      if (r.stressScore !== null) bucket.stresses.push(r.stressScore);
    }

    const trends = Array.from(byDate.entries()).map(([date, bucket]) => ({
      date,
      averageMood: Math.round((bucket.moods.reduce((a, b) => a + b, 0) / bucket.moods.length) * 100) / 100,
      averageEnergy:
        bucket.energies.length > 0
          ? Math.round((bucket.energies.reduce((a, b) => a + b, 0) / bucket.energies.length) * 100) / 100
          : null,
      averageStress:
        bucket.stresses.length > 0
          ? Math.round((bucket.stresses.reduce((a, b) => a + b, 0) / bucket.stresses.length) * 100) / 100
          : null,
      responseCount: bucket.moods.length,
    }));

    return trends;
  }

  /**
   * Analytics: Department breakdown.
   */
  async getAnalyticsDepartments(tenantId: string) {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const responses = await prisma.pulseSurveyResponse.findMany({
      where: {
        tenantId,
        surveyDate: { gte: since },
      },
      select: {
        moodScore: true,
        user: {
          select: {
            departmentId: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Count total active users per department for participation rate
    const deptCounts = await prisma.user.groupBy({
      by: ['departmentId'],
      where: { tenantId, isActive: true, departmentId: { not: null } },
      _count: true,
    });

    const deptTotals = new Map<string, number>();
    for (const dc of deptCounts) {
      if (dc.departmentId) deptTotals.set(dc.departmentId, dc._count);
    }

    // Group responses by department
    const byDept = new Map<
      string,
      { name: string; moods: number[]; userIds: Set<string> }
    >();

    for (const r of responses) {
      const dept = r.user?.department;
      if (!dept) continue;
      if (!byDept.has(dept.id)) {
        byDept.set(dept.id, { name: dept.name, moods: [], userIds: new Set() });
      }
      const bucket = byDept.get(dept.id)!;
      bucket.moods.push(r.moodScore);
    }

    return Array.from(byDept.entries()).map(([deptId, bucket]) => {
      const total = deptTotals.get(deptId) || 1;
      return {
        departmentId: deptId,
        departmentName: bucket.name,
        averageMood: Math.round((bucket.moods.reduce((a, b) => a + b, 0) / bucket.moods.length) * 100) / 100,
        responseCount: bucket.moods.length,
        participationRate: Math.round((bucket.userIds.size / total) * 100),
      };
    });
  }

  /**
   * Analytics: Mood distribution for pie chart.
   */
  async getAnalyticsDistribution(tenantId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const groups = await prisma.pulseSurveyResponse.groupBy({
      by: ['moodScore'],
      where: {
        tenantId,
        surveyDate: { gte: since },
      },
      _count: true,
    });

    const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const g of groups) {
      distribution[String(g.moodScore)] = g._count;
    }

    return distribution;
  }

  // ── Private Helpers ──

  private async getAverageMoodForPeriod(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<number | null> {
    const result = await prisma.pulseSurveyResponse.aggregate({
      where: {
        tenantId,
        surveyDate: { gte: from, lt: to },
      },
      _avg: { moodScore: true },
    });

    return result._avg.moodScore ?? null;
  }
}

export const pulseService = new PulseService();
