// @ts-nocheck
import { prisma } from '@pms/database';

class ComplianceService {
  // ─── Policies ────────────────────────────────────────────────

  async listPolicies(
    tenantId: string,
    params: {
      status?: string;
      category?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { status, category, page = 1, limit = 20 } = params;
    const where: any = { tenantId, deletedAt: null };
    if (status) where.status = status;
    if (category) where.policyType = category;

    const [data, total] = await Promise.all([
      prisma.compliancePolicy.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          policyName: true,
          policyCode: true,
          description: true,
          policyType: true,
          version: true,
          effectiveDate: true,
          expirationDate: true,
          status: true,
          enforcementLevel: true,
          complianceRules: true,
          applicableScope: true,
          applicableEntities: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.compliancePolicy.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createPolicy(tenantId: string, userId: string, data: any) {
    return prisma.compliancePolicy.create({
      data: {
        tenantId,
        policyName: data.name,
        policyCode: data.code,
        description: data.description,
        policyType: data.category,
        version: data.version || '1.0',
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
        expirationDate: data.expiryDate ? new Date(data.expiryDate) : null,
        status: data.status || 'DRAFT',
        enforcementLevel: data.enforcementLevel || 'ADVISORY',
        complianceRules: data.requirements || [],
        applicableScope: data.applicableScope || 'ALL',
        applicableEntities: data.applicableEntities || [],
        violationDefinitions: data.violationDefinitions || [],
        automatedChecks: data.automatedChecks || [],
        gracePeriodDays: data.gracePeriodDays || 0,
        escalationRules: data.escalationRules || [],
        createdBy: userId,
      },
    });
  }

  async updatePolicy(tenantId: string, id: string, data: any) {
    const existing = await prisma.compliancePolicy.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new Error('Policy not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.policyName = data.name;
    if (data.code !== undefined) updateData.policyCode = data.code;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.policyType = data.category;
    if (data.version !== undefined) updateData.version = data.version;
    if (data.effectiveDate !== undefined) updateData.effectiveDate = data.effectiveDate ? new Date(data.effectiveDate) : null;
    if (data.expiryDate !== undefined) updateData.expirationDate = data.expiryDate ? new Date(data.expiryDate) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.enforcementLevel !== undefined) updateData.enforcementLevel = data.enforcementLevel;
    if (data.requirements !== undefined) updateData.complianceRules = data.requirements;
    if (data.applicableScope !== undefined) updateData.applicableScope = data.applicableScope;
    if (data.applicableEntities !== undefined) updateData.applicableEntities = data.applicableEntities;

    return prisma.compliancePolicy.update({
      where: { id },
      data: updateData,
    });
  }

  async deletePolicy(tenantId: string, id: string) {
    const existing = await prisma.compliancePolicy.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new Error('Policy not found');

    return prisma.compliancePolicy.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Assessments ─────────────────────────────────────────────

  async listAssessments(
    tenantId: string,
    params: {
      userId?: string;
      policyId?: string;
      status?: string;
      dueDateFrom?: string;
      dueDateTo?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { userId, policyId, status, dueDateFrom, dueDateTo, page = 1, limit = 20 } = params;
    const where: any = { tenantId, deletedAt: null };
    if (userId) where.userId = userId;
    if (policyId) where.policyId = policyId;
    if (status) where.complianceStatus = status;
    if (dueDateFrom || dueDateTo) {
      where.remediationDeadline = {};
      if (dueDateFrom) where.remediationDeadline.gte = new Date(dueDateFrom);
      if (dueDateTo) where.remediationDeadline.lte = new Date(dueDateTo);
    }

    const [data, total] = await Promise.all([
      prisma.complianceAssessment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          policy: {
            select: { id: true, policyName: true, policyCode: true, version: true },
          },
          assessor: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.complianceAssessment.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createAssessment(tenantId: string, data: any) {
    return prisma.complianceAssessment.create({
      data: {
        tenantId,
        userId: data.userId,
        policyId: data.policyId,
        assessedBy: data.assessorId,
        assessmentType: data.assessmentType || 'MANUAL',
        assessmentScope: data.assessmentScope || 'USER',
        complianceStatus: data.status || 'PENDING',
        complianceScore: data.score,
        violations: data.findings || [],
        riskFactors: data.recommendations || [],
        remediationDeadline: data.dueDate ? new Date(data.dueDate) : null,
        remediatedAt: data.completedDate ? new Date(data.completedDate) : null,
        assessmentPeriodStart: data.periodStart ? new Date(data.periodStart) : new Date(),
        assessmentPeriodEnd: data.periodEnd ? new Date(data.periodEnd) : new Date(),
        assessedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        policy: {
          select: { id: true, policyName: true, policyCode: true },
        },
      },
    });
  }

  async updateAssessment(tenantId: string, id: string, data: any) {
    const existing = await prisma.complianceAssessment.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new Error('Assessment not found');

    const updateData: any = {};
    if (data.status !== undefined) updateData.complianceStatus = data.status;
    if (data.score !== undefined) updateData.complianceScore = data.score;
    if (data.findings !== undefined) updateData.violations = data.findings;
    if (data.recommendations !== undefined) updateData.riskFactors = data.recommendations;
    if (data.dueDate !== undefined) updateData.remediationDeadline = data.dueDate ? new Date(data.dueDate) : null;
    if (data.completedDate !== undefined) updateData.remediatedAt = data.completedDate ? new Date(data.completedDate) : null;
    if (data.remediationPlan !== undefined) updateData.remediationPlan = data.remediationPlan;
    if (data.remediationRequired !== undefined) updateData.remediationRequired = data.remediationRequired;
    if (data.riskLevel !== undefined) updateData.riskLevel = data.riskLevel;

    return prisma.complianceAssessment.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        policy: {
          select: { id: true, policyName: true, policyCode: true },
        },
      },
    });
  }

  // ─── Violations ──────────────────────────────────────────────

  async listViolations(
    tenantId: string,
    params: {
      severity?: string;
      status?: string;
      userId?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { severity, status, userId, page = 1, limit = 20 } = params;
    const where: any = { tenantId };
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [data, total] = await Promise.all([
      prisma.complianceViolation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          assessment: {
            select: { id: true, complianceStatus: true, policyId: true },
          },
          acknowledger: {
            select: { id: true, firstName: true, lastName: true },
          },
          resolver: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.complianceViolation.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createViolation(tenantId: string, data: any) {
    return prisma.complianceViolation.create({
      data: {
        tenantId,
        assessmentId: data.assessmentId,
        userId: data.userId,
        violationType: data.violationType || 'POLICY_BREACH',
        severity: data.severity,
        ruleViolated: data.ruleViolated || data.description,
        description: data.description,
        detectionMethod: data.detectionMethod || 'MANUAL',
        status: data.status || 'OPEN',
        evidenceData: data.evidenceData || {},
        evidenceLinks: data.evidenceLinks || [],
        detectedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assessment: {
          select: { id: true, complianceStatus: true, policyId: true },
        },
      },
    });
  }

  async updateViolation(tenantId: string, id: string, data: any) {
    const existing = await prisma.complianceViolation.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new Error('Violation not found');

    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.severity !== undefined) updateData.severity = data.severity;
    if (data.resolutionNotes !== undefined) updateData.resolutionNotes = data.resolutionNotes;
    if (data.description !== undefined) updateData.description = data.description;

    // Handle resolve
    if (data.status === 'RESOLVED' && !existing.resolvedAt) {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = data.resolvedById;
    }

    // Handle acknowledge
    if (data.status === 'ACKNOWLEDGED' && !existing.acknowledgedAt) {
      updateData.acknowledgedAt = new Date();
      updateData.acknowledgedBy = data.acknowledgedById;
    }

    return prisma.complianceViolation.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assessment: {
          select: { id: true, complianceStatus: true, policyId: true },
        },
      },
    });
  }

  // ─── Dashboard ───────────────────────────────────────────────

  async getDashboard(tenantId: string) {
    const now = new Date();

    const [
      totalPolicies,
      activePolicies,
      totalAssessments,
      overdueAssessments,
      openViolations,
      criticalViolations,
      highViolations,
      mediumViolations,
      lowViolations,
      compliantAssessments,
      upcomingDeadlines,
    ] = await Promise.all([
      prisma.compliancePolicy.count({ where: { tenantId, deletedAt: null } }),
      prisma.compliancePolicy.count({ where: { tenantId, status: 'ACTIVE', deletedAt: null } }),
      prisma.complianceAssessment.count({ where: { tenantId, deletedAt: null } }),
      prisma.complianceAssessment.count({
        where: {
          tenantId,
          deletedAt: null,
          remediationDeadline: { lt: now },
          complianceStatus: { in: ['PENDING', 'NON_COMPLIANT', 'PARTIAL'] },
        },
      }),
      prisma.complianceViolation.count({ where: { tenantId, status: 'OPEN' } }),
      prisma.complianceViolation.count({ where: { tenantId, status: 'OPEN', severity: 'CRITICAL' } }),
      prisma.complianceViolation.count({ where: { tenantId, status: 'OPEN', severity: 'HIGH' } }),
      prisma.complianceViolation.count({ where: { tenantId, status: 'OPEN', severity: 'MEDIUM' } }),
      prisma.complianceViolation.count({ where: { tenantId, status: 'OPEN', severity: 'LOW' } }),
      prisma.complianceAssessment.count({
        where: { tenantId, deletedAt: null, complianceStatus: 'COMPLIANT' },
      }),
      prisma.complianceAssessment.findMany({
        where: {
          tenantId,
          deletedAt: null,
          remediationDeadline: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // next 30 days
          },
          complianceStatus: { in: ['PENDING', 'NON_COMPLIANT', 'PARTIAL'] },
        },
        orderBy: { remediationDeadline: 'asc' },
        take: 10,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          policy: {
            select: { id: true, policyName: true },
          },
        },
      }),
    ]);

    const complianceRate =
      totalAssessments > 0
        ? Math.round((compliantAssessments / totalAssessments) * 100)
        : 0;

    return {
      policies: {
        total: totalPolicies,
        active: activePolicies,
      },
      assessments: {
        total: totalAssessments,
        overdue: overdueAssessments,
      },
      violations: {
        open: openViolations,
        bySeverity: {
          critical: criticalViolations,
          high: highViolations,
          medium: mediumViolations,
          low: lowViolations,
        },
      },
      complianceRate,
      upcomingDeadlines,
    };
  }

  // ─── User Compliance ────────────────────────────────────────

  async getUserCompliance(tenantId: string, userId: string) {
    const [assessments, violations] = await Promise.all([
      prisma.complianceAssessment.findMany({
        where: { tenantId, userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          policy: {
            select: { id: true, policyName: true, policyCode: true, version: true },
          },
          assessor: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.complianceViolation.findMany({
        where: { tenantId, userId },
        orderBy: { createdAt: 'desc' },
        include: {
          assessment: {
            select: { id: true, complianceStatus: true, policyId: true },
          },
        },
      }),
    ]);

    const totalAssessments = assessments.length;
    const compliantCount = assessments.filter(
      (a) => a.complianceStatus === 'COMPLIANT'
    ).length;
    const openViolations = violations.filter((v) => v.status === 'OPEN').length;

    return {
      assessments,
      violations,
      summary: {
        totalAssessments,
        compliantCount,
        complianceRate:
          totalAssessments > 0
            ? Math.round((compliantCount / totalAssessments) * 100)
            : 0,
        openViolations,
        totalViolations: violations.length,
      },
    };
  }
}

export const complianceService = new ComplianceService();
