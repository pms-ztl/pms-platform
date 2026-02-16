import { prisma } from '@pms/database';
import { auditLogger } from '../../utils/logger';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { MS_PER_DAY } from '../../utils/constants';

const userSelect = { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, jobTitle: true };

interface CreatePIPInput {
  userId: string;
  pipTitle: string;
  pipType: string;
  severity: string;
  startDate: string;
  endDate: string;
  reviewFrequency: string;
  performanceIssues: Array<{ issue: string; details?: string }>;
  impactStatement: string;
  performanceExpectations: string;
  specificGoals: Array<{ goal: string; metric?: string }>;
  measurableObjectives: Array<{ objective: string; target?: string }>;
  successCriteria: Array<{ criterion: string }>;
  supportProvided: Array<{ support: string }>;
  trainingRequired?: string[];
  consequencesOfNonCompliance: string;
}

interface AddCheckInInput {
  checkInDate: string;
  checkInType: string;
  progressSummary: string;
  performanceRating?: number;
  onTrack: boolean;
  positiveObservations?: string[];
  concernsRaised?: string[];
  managerFeedback: string;
  employeeFeedback?: string;
  actionItems?: Array<{ item: string; assignee?: string; dueDate?: string }>;
  nextSteps?: string[];
}

interface AddMilestoneInput {
  milestoneName: string;
  description: string;
  dueDate: string;
  successCriteria: Array<{ criterion: string }>;
}

export class PIPService {
  async createPIP(tenantId: string, creatorId: string, input: CreatePIPInput) {
    const employee = await prisma.user.findFirst({
      where: { id: input.userId, tenantId, isActive: true, deletedAt: null },
    });
    if (!employee) throw new NotFoundError('Employee', input.userId);

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);

    const pip = await prisma.performanceImprovementPlan.create({
      data: {
        tenantId,
        userId: input.userId,
        createdBy: creatorId,
        pipTitle: input.pipTitle,
        pipType: input.pipType,
        severity: input.severity,
        startDate,
        endDate,
        duration,
        reviewFrequency: input.reviewFrequency,
        performanceIssues: input.performanceIssues,
        impactStatement: input.impactStatement,
        performanceExpectations: input.performanceExpectations,
        specificGoals: input.specificGoals,
        measurableObjectives: input.measurableObjectives,
        successCriteria: input.successCriteria,
        supportProvided: input.supportProvided,
        trainingRequired: input.trainingRequired ?? [],
        consequencesOfNonCompliance: input.consequencesOfNonCompliance,
        status: 'ACTIVE',
      },
      include: { user: { select: userSelect } },
    });

    auditLogger('PIP_CREATED', creatorId, tenantId, 'pip', pip.id, { userId: input.userId, pipTitle: input.pipTitle });
    return pip;
  }

  async listPIPs(tenantId: string, userId: string, filters?: { status?: string; page?: number; limit?: number }) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;

    // Managers see PIPs they created or for their reports
    const reports = await prisma.user.findMany({
      where: { tenantId, managerId: userId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    const reportIds = reports.map(r => r.id);

    const where: any = {
      tenantId,
      OR: [
        { createdBy: userId },
        { userId: { in: reportIds } },
        { userId }, // Employee can see their own PIPs
      ],
    };
    if (filters?.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      prisma.performanceImprovementPlan.findMany({
        where,
        include: { user: { select: userSelect } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.performanceImprovementPlan.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getPIPById(tenantId: string, id: string) {
    const pip = await prisma.performanceImprovementPlan.findFirst({
      where: { id, tenantId },
      include: {
        user: { select: userSelect },
        checkIns: { orderBy: { checkInDate: 'desc' } },
        milestoneProgress: { orderBy: { dueDate: 'asc' } },
      },
    });
    if (!pip) throw new NotFoundError('PerformanceImprovementPlan', id);
    return pip;
  }

  async approvePIP(tenantId: string, pipId: string, hrUserId: string) {
    const pip = await this.getPIPById(tenantId, pipId);

    const updated = await prisma.performanceImprovementPlan.update({
      where: { id: pipId },
      data: { hrApprovedBy: hrUserId, hrApprovedAt: new Date() },
      include: { user: { select: userSelect }, checkIns: true, milestoneProgress: true },
    });

    auditLogger('PIP_APPROVED', hrUserId, tenantId, 'pip', pipId, {});
    return updated;
  }

  async addCheckIn(tenantId: string, pipId: string, conductedBy: string, input: AddCheckInInput) {
    const pip = await this.getPIPById(tenantId, pipId);

    const checkIn = await prisma.pIPCheckIn.create({
      data: {
        tenantId,
        pipId,
        userId: pip.userId,
        conductedBy,
        checkInDate: new Date(input.checkInDate),
        checkInType: input.checkInType,
        progressSummary: input.progressSummary,
        performanceRating: input.performanceRating,
        onTrack: input.onTrack,
        positiveObservations: input.positiveObservations ?? [],
        concernsRaised: input.concernsRaised ?? [],
        managerFeedback: input.managerFeedback,
        employeeFeedback: input.employeeFeedback,
        actionItems: input.actionItems ?? [],
        nextSteps: input.nextSteps ?? [],
      },
    });

    // Update PIP status based on track
    const newStatus = input.onTrack ? 'ON_TRACK' : 'AT_RISK';
    await prisma.performanceImprovementPlan.update({
      where: { id: pipId },
      data: { status: newStatus },
    });

    auditLogger('PIP_CHECKIN_ADDED', conductedBy, tenantId, 'pip_check_in', checkIn.id, { pipId, onTrack: input.onTrack });
    return checkIn;
  }

  async addMilestone(tenantId: string, pipId: string, userId: string, input: AddMilestoneInput) {
    await this.getPIPById(tenantId, pipId);

    const milestone = await prisma.pIPMilestone.create({
      data: {
        tenantId,
        pipId,
        milestoneName: input.milestoneName,
        description: input.description,
        dueDate: new Date(input.dueDate),
        successCriteria: input.successCriteria,
        status: 'NOT_STARTED',
      },
    });

    auditLogger('PIP_MILESTONE_ADDED', userId, tenantId, 'pip_milestone', milestone.id, { pipId });
    return milestone;
  }

  async updateMilestone(tenantId: string, milestoneId: string, userId: string, input: {
    status?: string; achievementLevel?: string; evaluationNotes?: string;
  }) {
    const milestone = await prisma.pIPMilestone.findFirst({ where: { id: milestoneId, tenantId } });
    if (!milestone) throw new NotFoundError('PIPMilestone', milestoneId);

    const data: any = {};
    if (input.status) data.status = input.status;
    if (input.achievementLevel) data.achievementLevel = input.achievementLevel;
    if (input.evaluationNotes) data.evaluationNotes = input.evaluationNotes;
    if (input.status === 'COMPLETED') data.completionDate = new Date();

    const updated = await prisma.pIPMilestone.update({ where: { id: milestoneId }, data });
    auditLogger('PIP_MILESTONE_UPDATED', userId, tenantId, 'pip_milestone', milestoneId, data);
    return updated;
  }

  async closePIP(tenantId: string, pipId: string, userId: string, outcome: string, notes?: string) {
    const pip = await this.getPIPById(tenantId, pipId);
    if (pip.status === 'SUCCESSFUL' || pip.status === 'UNSUCCESSFUL') {
      throw new ValidationError('PIP already closed');
    }

    const updated = await prisma.performanceImprovementPlan.update({
      where: { id: pipId },
      data: {
        status: outcome,
        outcome,
        outcomeDate: new Date(),
        outcomeNotes: notes,
        finalAssessment: notes,
      },
      include: { user: { select: userSelect }, checkIns: true, milestoneProgress: true },
    });

    auditLogger('PIP_CLOSED', userId, tenantId, 'pip', pipId, { outcome });
    return updated;
  }

  async acknowledgeByEmployee(tenantId: string, pipId: string, userId: string, comments?: string) {
    const pip = await this.getPIPById(tenantId, pipId);
    if (pip.userId !== userId) throw new ValidationError('Only the PIP employee can acknowledge');

    const updated = await prisma.performanceImprovementPlan.update({
      where: { id: pipId },
      data: {
        employeeAcknowledged: true,
        acknowledgedAt: new Date(),
        employeeComments: comments,
      },
      include: { user: { select: userSelect }, checkIns: true, milestoneProgress: true },
    });

    auditLogger('PIP_ACKNOWLEDGED', userId, tenantId, 'pip', pipId, {});
    return updated;
  }
}

export const pipService = new PIPService();
