import { prisma } from '@pms/database';

/**
 * EngagementService
 *
 * Queries real PostgreSQL data via Prisma for the Engagement & eNPS Dashboard.
 * All queries are tenant-isolated and use the EngagementScore and EngagementEvent models.
 */
export class EngagementService {
  // ---------------------------------------------------------------------------
  // GET /engagement/overview
  // Overall engagement stats: avg score, distribution by level, at-risk count
  // ---------------------------------------------------------------------------

  async getOverview(tenantId: string) {
    // Get the most recent score per user (latest scoreDate)
    const latestScores = await prisma.engagementScore.findMany({
      where: { tenantId },
      orderBy: [{ userId: 'asc' }, { scoreDate: 'desc' }],
      distinct: ['userId'],
      select: {
        userId: true,
        overallScore: true,
        scoreLevel: true,
        participationScore: true,
        communicationScore: true,
        collaborationScore: true,
        initiativeScore: true,
        responsivenessScore: true,
        trendDirection: true,
        atRisk: true,
        riskLevel: true,
        scoreDate: true,
      },
    });

    if (latestScores.length === 0) {
      return {
        totalEmployees: 0,
        avgOverallScore: 0,
        avgComponentScores: {
          participation: 0,
          communication: 0,
          collaboration: 0,
          initiative: 0,
          responsiveness: 0,
        },
        distribution: {
          VERY_LOW: 0,
          LOW: 0,
          MODERATE: 0,
          HIGH: 0,
          VERY_HIGH: 0,
        },
        atRiskCount: 0,
        trendSummary: {
          improving: 0,
          stable: 0,
          declining: 0,
        },
      };
    }

    const totalEmployees = latestScores.length;

    // Average overall score
    const avgOverallScore =
      Math.round(
        (latestScores.reduce((sum, s) => sum + Number(s.overallScore), 0) / totalEmployees) * 100
      ) / 100;

    // Average component scores
    const avgComponentScores = {
      participation:
        Math.round(
          (latestScores.reduce((sum, s) => sum + Number(s.participationScore), 0) / totalEmployees) *
            100
        ) / 100,
      communication:
        Math.round(
          (latestScores.reduce((sum, s) => sum + Number(s.communicationScore), 0) / totalEmployees) *
            100
        ) / 100,
      collaboration:
        Math.round(
          (latestScores.reduce((sum, s) => sum + Number(s.collaborationScore), 0) / totalEmployees) *
            100
        ) / 100,
      initiative:
        Math.round(
          (latestScores.reduce((sum, s) => sum + Number(s.initiativeScore), 0) / totalEmployees) *
            100
        ) / 100,
      responsiveness:
        Math.round(
          (latestScores.reduce((sum, s) => sum + Number(s.responsivenessScore), 0) /
            totalEmployees) *
            100
        ) / 100,
    };

    // Distribution by scoreLevel
    const distribution = {
      VERY_LOW: 0,
      LOW: 0,
      MODERATE: 0,
      HIGH: 0,
      VERY_HIGH: 0,
    };
    for (const score of latestScores) {
      const level = score.scoreLevel as keyof typeof distribution;
      if (level in distribution) {
        distribution[level]++;
      }
    }

    // At-risk count
    const atRiskCount = latestScores.filter((s) => s.atRisk).length;

    // Trend summary
    const trendSummary = {
      improving: latestScores.filter((s) => s.trendDirection === 'UP').length,
      stable: latestScores.filter(
        (s) => s.trendDirection === 'STABLE' || s.trendDirection === null
      ).length,
      declining: latestScores.filter((s) => s.trendDirection === 'DOWN').length,
    };

    return {
      totalEmployees,
      avgOverallScore,
      avgComponentScores,
      distribution,
      atRiskCount,
      trendSummary,
    };
  }

  // ---------------------------------------------------------------------------
  // GET /engagement/trends?months=6
  // Historical engagement trend: group scores by month, compute monthly averages
  // ---------------------------------------------------------------------------

  async getTrends(tenantId: string, months: number) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const scores = await prisma.engagementScore.findMany({
      where: {
        tenantId,
        scoreDate: { gte: since },
      },
      select: {
        overallScore: true,
        participationScore: true,
        communicationScore: true,
        collaborationScore: true,
        initiativeScore: true,
        responsivenessScore: true,
        atRisk: true,
        scoreDate: true,
      },
      orderBy: { scoreDate: 'asc' },
    });

    // Group by year-month
    const monthlyBuckets = new Map<
      string,
      {
        overall: number[];
        participation: number[];
        communication: number[];
        collaboration: number[];
        initiative: number[];
        responsiveness: number[];
        atRiskCount: number;
        totalCount: number;
      }
    >();

    for (const score of scores) {
      const date = new Date(score.scoreDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyBuckets.has(key)) {
        monthlyBuckets.set(key, {
          overall: [],
          participation: [],
          communication: [],
          collaboration: [],
          initiative: [],
          responsiveness: [],
          atRiskCount: 0,
          totalCount: 0,
        });
      }

      const bucket = monthlyBuckets.get(key)!;
      bucket.overall.push(Number(score.overallScore));
      bucket.participation.push(Number(score.participationScore));
      bucket.communication.push(Number(score.communicationScore));
      bucket.collaboration.push(Number(score.collaborationScore));
      bucket.initiative.push(Number(score.initiativeScore));
      bucket.responsiveness.push(Number(score.responsivenessScore));
      if (score.atRisk) bucket.atRiskCount++;
      bucket.totalCount++;
    }

    const avg = (arr: number[]) =>
      arr.length > 0 ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100 : 0;

    const trends = Array.from(monthlyBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, bucket]) => ({
        month,
        avgOverallScore: avg(bucket.overall),
        avgComponentScores: {
          participation: avg(bucket.participation),
          communication: avg(bucket.communication),
          collaboration: avg(bucket.collaboration),
          initiative: avg(bucket.initiative),
          responsiveness: avg(bucket.responsiveness),
        },
        atRiskCount: bucket.atRiskCount,
        totalScores: bucket.totalCount,
      }));

    return { months, trends };
  }

  // ---------------------------------------------------------------------------
  // GET /engagement/departments
  // Department-level engagement breakdown
  // ---------------------------------------------------------------------------

  async getDepartments(tenantId: string) {
    // Get the latest score per user, joined through user -> department
    const latestScores = await prisma.engagementScore.findMany({
      where: { tenantId },
      orderBy: [{ userId: 'asc' }, { scoreDate: 'desc' }],
      distinct: ['userId'],
      select: {
        userId: true,
        overallScore: true,
        scoreLevel: true,
        atRisk: true,
        user: {
          select: {
            departmentId: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Group by department
    const deptMap = new Map<
      string,
      {
        id: string;
        name: string;
        scores: number[];
        atRiskCount: number;
        distribution: Record<string, number>;
      }
    >();

    for (const score of latestScores) {
      const dept = score.user.department;
      if (!dept) continue;

      if (!deptMap.has(dept.id)) {
        deptMap.set(dept.id, {
          id: dept.id,
          name: dept.name,
          scores: [],
          atRiskCount: 0,
          distribution: { VERY_LOW: 0, LOW: 0, MODERATE: 0, HIGH: 0, VERY_HIGH: 0 },
        });
      }

      const bucket = deptMap.get(dept.id)!;
      bucket.scores.push(Number(score.overallScore));
      if (score.atRisk) bucket.atRiskCount++;
      const level = score.scoreLevel;
      if (level in bucket.distribution) {
        bucket.distribution[level]++;
      }
    }

    const departments = Array.from(deptMap.values())
      .map((dept) => {
        const employeeCount = dept.scores.length;
        const avgScore =
          employeeCount > 0
            ? Math.round(
                (dept.scores.reduce((s, v) => s + v, 0) / employeeCount) * 100
              ) / 100
            : 0;

        return {
          departmentId: dept.id,
          departmentName: dept.name,
          employeeCount,
          avgEngagementScore: avgScore,
          atRiskCount: dept.atRiskCount,
          distribution: dept.distribution,
        };
      })
      .sort((a, b) => b.avgEngagementScore - a.avgEngagementScore);

    return departments;
  }

  // ---------------------------------------------------------------------------
  // GET /engagement/at-risk?page=1&limit=20
  // List of at-risk employees with user details, paginated
  // ---------------------------------------------------------------------------

  async getAtRisk(tenantId: string, params: { page: number; limit: number }) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    // Count total at-risk (latest score per user where atRisk=true)
    // We need to first get the latest scores, then filter
    const allLatestScores = await prisma.engagementScore.findMany({
      where: { tenantId, atRisk: true },
      orderBy: [{ userId: 'asc' }, { scoreDate: 'desc' }],
      distinct: ['userId'],
      select: { userId: true },
    });

    const total = allLatestScores.length;

    // Get paginated at-risk scores with user details
    const atRiskScores = await prisma.engagementScore.findMany({
      where: { tenantId, atRisk: true },
      orderBy: [{ userId: 'asc' }, { scoreDate: 'desc' }],
      distinct: ['userId'],
      skip,
      take: limit,
      select: {
        userId: true,
        overallScore: true,
        scoreLevel: true,
        riskLevel: true,
        riskFactors: true,
        trendDirection: true,
        changeFromPrevious: true,
        scoreDate: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const employees = atRiskScores.map((score) => ({
      user: {
        id: score.user.id,
        firstName: score.user.firstName,
        lastName: score.user.lastName,
        email: score.user.email,
        jobTitle: score.user.jobTitle,
        department: score.user.department?.name ?? null,
      },
      overallScore: Number(score.overallScore),
      scoreLevel: score.scoreLevel,
      riskLevel: score.riskLevel,
      riskFactors: score.riskFactors,
      trendDirection: score.trendDirection,
      changeFromPrevious: score.changeFromPrevious ? Number(score.changeFromPrevious) : null,
      scoreDate: score.scoreDate,
    }));

    return {
      employees,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // GET /engagement/events?limit=50&category=PARTICIPATION
  // Recent engagement events with optional category filtering
  // ---------------------------------------------------------------------------

  async getEvents(tenantId: string, params: { limit: number; category?: string }) {
    const { limit, category } = params;

    const where: Record<string, unknown> = { tenantId };
    if (category) {
      where.eventCategory = category;
    }

    const events = await prisma.engagementEvent.findMany({
      where,
      orderBy: { eventTimestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        userId: true,
        eventType: true,
        eventCategory: true,
        eventData: true,
        engagementImpact: true,
        positiveIndicator: true,
        sourceSystem: true,
        eventTimestamp: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return events.map((event) => ({
      id: event.id,
      user: {
        id: event.user.id,
        firstName: event.user.firstName,
        lastName: event.user.lastName,
        jobTitle: event.user.jobTitle,
        department: event.user.department?.name ?? null,
      },
      eventType: event.eventType,
      eventCategory: event.eventCategory,
      eventData: event.eventData,
      engagementImpact: Number(event.engagementImpact),
      positiveIndicator: event.positiveIndicator,
      sourceSystem: event.sourceSystem,
      eventTimestamp: event.eventTimestamp,
    }));
  }
}

export const engagementService = new EngagementService();
