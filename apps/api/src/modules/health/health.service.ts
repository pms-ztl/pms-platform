import { prisma } from '@pms/database';
import { NotFoundError } from '../../utils/errors';

class HealthService {
  // ── Latest Org Health ───────────────────────────────────────────────────

  async getLatest(tenantId: string) {
    const latest = await prisma.organizationalHealthMetrics.findFirst({
      where: { tenantId },
      orderBy: { metricDate: 'desc' },
      include: {
        departmentMetrics: {
          include: {
            department: { select: { id: true, name: true } },
          },
          orderBy: { ranking: 'asc' },
        },
      },
    });

    if (!latest) {
      // Return sensible defaults instead of throwing — page should render empty state
      return {
        id: '',
        tenantId,
        metricDate: new Date(),
        period: 'MONTHLY',
        periodStart: new Date(),
        periodEnd: new Date(),
        overallHealthScore: 0,
        healthLevel: 'FAIR' as const,
        trendDirection: 'STABLE' as const,
        engagementScore: 0,
        performanceScore: 0,
        cultureScore: 0,
        leadershipScore: 0,
        collaborationScore: 0,
        innovationScore: 0,
        wellbeingScore: 0,
        headcount: 0,
        responseRate: 0,
        activeEmployees: 0,
        newHires: 0,
        terminations: 0,
        turnoverRate: 0,
        retentionRate: 0,
        flightRiskCount: 0,
        disengagedEmployees: 0,
        atRiskEmployees: 0,
        burnoutRiskCount: 0,
        engagementLevel: 'MODERATE',
        avgEngagementScore: 0,
        avgSentimentScore: null,
        positiveSentiment: null,
        negativeSentiment: null,
        diversityMetrics: {},
        inclusionScore: null,
        strengths: [],
        concerns: [],
        recommendations: [],
        departmentMetrics: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return latest;
  }

  // ── Historical Trend ──────────────────────────────────────────────────

  async getHistory(
    tenantId: string,
    filters: { period?: string; limit: number },
  ) {
    const where: any = { tenantId };
    if (filters.period) {
      where.period = filters.period;
    }

    const [data, total] = await Promise.all([
      prisma.organizationalHealthMetrics.findMany({
        where,
        orderBy: { metricDate: 'desc' },
        take: filters.limit,
        select: {
          id: true,
          metricDate: true,
          period: true,
          periodStart: true,
          periodEnd: true,
          overallHealthScore: true,
          healthLevel: true,
          trendDirection: true,
          engagementScore: true,
          performanceScore: true,
          cultureScore: true,
          leadershipScore: true,
          collaborationScore: true,
          innovationScore: true,
          wellbeingScore: true,
          headcount: true,
          activeEmployees: true,
          newHires: true,
          terminations: true,
          turnoverRate: true,
          retentionRate: true,
          avgEngagementScore: true,
          atRiskEmployees: true,
          burnoutRiskCount: true,
          flightRiskCount: true,
          avgSentimentScore: true,
          positiveSentiment: true,
          negativeSentiment: true,
          strengths: true,
          concerns: true,
          recommendations: true,
          createdAt: true,
        },
      }),
      prisma.organizationalHealthMetrics.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        limit: filters.limit,
        period: filters.period ?? null,
      },
    };
  }

  // ── Department Breakdown ──────────────────────────────────────────────

  async getDepartments(tenantId: string) {
    // Find the most recent org health metrics record
    const latest = await prisma.organizationalHealthMetrics.findFirst({
      where: { tenantId },
      orderBy: { metricDate: 'desc' },
      select: { id: true, metricDate: true, period: true, overallHealthScore: true },
    });

    if (!latest) {
      // Return empty departments instead of throwing — page renders empty state
      return {
        orgMetricsId: '',
        metricDate: new Date(),
        period: 'MONTHLY',
        overallHealthScore: 0,
        departments: [],
      };
    }

    // Fetch department metrics linked to the latest org metrics
    const departments = await prisma.departmentHealthMetrics.findMany({
      where: {
        tenantId,
        orgHealthMetricsId: latest.id,
      },
      include: {
        department: { select: { id: true, name: true } },
      },
      orderBy: { ranking: 'asc' },
    });

    return {
      orgMetricsId: latest.id,
      metricDate: latest.metricDate,
      period: latest.period,
      overallHealthScore: latest.overallHealthScore,
      departments,
    };
  }
}

export const healthService = new HealthService();
