import { prisma } from '@pms/database';
import { auditLogger } from '../../utils/logger';
import { NotFoundError, ValidationError, AuthorizationError } from '../../utils/errors';

const userSelect = { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, jobTitle: true };

interface CreatePlanInput {
  planName: string;
  planType: string;
  careerGoal: string;
  targetRole?: string;
  targetLevel?: string;
  currentLevel: string;
  duration: number;
  startDate: string;
  targetCompletionDate: string;
  strengthsAssessed?: string[];
  developmentAreas?: string[];
  notes?: string;
}

interface CreateActivityInput {
  activityType: string;
  title: string;
  description: string;
  provider?: string;
  learningObjectives?: string[];
  targetSkills?: string[];
  estimatedHours?: number;
  dueDate?: string;
  startDate?: string;
  resourceUrl?: string;
  cost?: number;
  priority?: string;
  isRequired?: boolean;
}

interface CreateCheckpointInput {
  checkpointName: string;
  checkpointDate: string;
  checkpointType: string;
  progressReview?: string;
  managerFeedback?: string;
  nextSteps?: string[];
}

export class DevelopmentService {
  // ── Plans ──────────────────────────────────────────────────────────────

  async createPlan(tenantId: string, userId: string, input: CreatePlanInput) {
    const plan = await prisma.developmentPlan.create({
      data: {
        tenantId,
        userId,
        planName: input.planName,
        planType: input.planType,
        careerGoal: input.careerGoal,
        targetRole: input.targetRole,
        targetLevel: input.targetLevel,
        currentLevel: input.currentLevel,
        duration: input.duration,
        startDate: new Date(input.startDate),
        targetCompletionDate: new Date(input.targetCompletionDate),
        strengthsAssessed: input.strengthsAssessed ?? [],
        developmentAreas: input.developmentAreas ?? [],
        notes: input.notes,
        status: 'DRAFT',
        generatedBy: 'MANUAL',
      },
      include: { user: { select: userSelect } },
    });

    auditLogger('DEVELOPMENT_PLAN_CREATED', userId, tenantId, 'development_plan', plan.id, { planName: input.planName });
    return plan;
  }

  async listPlans(tenantId: string, userId: string, filters?: { status?: string; page?: number; limit?: number }) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const where: any = { tenantId, userId };
    if (filters?.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      prisma.developmentPlan.findMany({
        where,
        include: {
          user: { select: userSelect },
          activities_rel: { orderBy: { dueDate: 'asc' as const }, take: 5 },
          checkpoints: { orderBy: { checkpointDate: 'asc' as const }, take: 5 },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.developmentPlan.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getTeamPlans(tenantId: string, managerId: string) {
    const reports = await prisma.user.findMany({
      where: { tenantId, managerId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    const reportIds = reports.map(r => r.id);
    if (reportIds.length === 0) return [];

    return prisma.developmentPlan.findMany({
      where: { tenantId, userId: { in: reportIds } },
      include: {
        user: { select: userSelect },
        activities_rel: { select: { id: true, status: true, activityType: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPlanById(tenantId: string, id: string) {
    const plan = await prisma.developmentPlan.findFirst({
      where: { id, tenantId },
      include: {
        user: { select: userSelect },
        activities_rel: { orderBy: { createdAt: 'asc' } },
        checkpoints: { orderBy: { checkpointDate: 'asc' } },
      },
    });
    if (!plan) throw new NotFoundError('DevelopmentPlan', id);
    return plan;
  }

  async updatePlan(tenantId: string, id: string, userId: string, input: Partial<CreatePlanInput>) {
    const plan = await this.getPlanById(tenantId, id);
    if (plan.userId !== userId) throw new AuthorizationError('You can only update your own plan');

    const data: any = {};
    if (input.planName) data.planName = input.planName;
    if (input.careerGoal) data.careerGoal = input.careerGoal;
    if (input.targetRole !== undefined) data.targetRole = input.targetRole;
    if (input.targetLevel !== undefined) data.targetLevel = input.targetLevel;
    if (input.strengthsAssessed) data.strengthsAssessed = input.strengthsAssessed;
    if (input.developmentAreas) data.developmentAreas = input.developmentAreas;
    if (input.notes !== undefined) data.notes = input.notes;

    const updated = await prisma.developmentPlan.update({
      where: { id },
      data,
      include: { user: { select: userSelect }, activities_rel: true, checkpoints: true },
    });

    auditLogger('DEVELOPMENT_PLAN_UPDATED', userId, tenantId, 'development_plan', id, data);
    return updated;
  }

  async approvePlan(tenantId: string, planId: string, approverId: string) {
    const plan = await this.getPlanById(tenantId, planId);
    if (plan.status !== 'DRAFT') throw new ValidationError('Only DRAFT plans can be approved');

    const updated = await prisma.developmentPlan.update({
      where: { id: planId },
      data: { status: 'ACTIVE', approvedBy: approverId, approvedAt: new Date() },
      include: { user: { select: userSelect }, activities_rel: true, checkpoints: true },
    });

    auditLogger('DEVELOPMENT_PLAN_APPROVED', approverId, tenantId, 'development_plan', planId, {});
    return updated;
  }

  // ── Activities ─────────────────────────────────────────────────────────

  async addActivity(tenantId: string, planId: string, userId: string, input: CreateActivityInput) {
    const plan = await this.getPlanById(tenantId, planId);

    const activity = await prisma.developmentActivity.create({
      data: {
        tenantId,
        developmentPlanId: planId,
        userId: plan.userId,
        activityType: input.activityType,
        title: input.title,
        description: input.description,
        provider: input.provider,
        learningObjectives: input.learningObjectives ?? [],
        targetSkills: input.targetSkills ?? [],
        estimatedHours: input.estimatedHours,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        resourceUrl: input.resourceUrl,
        cost: input.cost,
        priority: input.priority ?? 'MEDIUM',
        isRequired: input.isRequired ?? false,
        status: 'NOT_STARTED',
      },
    });

    // Update count
    await prisma.developmentPlan.update({
      where: { id: planId },
      data: { totalActivities: { increment: 1 } },
    });

    auditLogger('DEVELOPMENT_ACTIVITY_ADDED', userId, tenantId, 'development_activity', activity.id, { title: input.title });
    return activity;
  }

  async updateActivity(tenantId: string, activityId: string, userId: string, input: {
    status?: string; progressPercentage?: number; rating?: number; feedback?: string;
    completionEvidence?: string; certificateUrl?: string; actualHours?: number;
  }) {
    const activity = await prisma.developmentActivity.findFirst({ where: { id: activityId, tenantId } });
    if (!activity) throw new NotFoundError('DevelopmentActivity', activityId);

    const data: any = {};
    if (input.status) data.status = input.status;
    if (input.progressPercentage !== undefined) data.progressPercentage = input.progressPercentage;
    if (input.rating !== undefined) data.rating = input.rating;
    if (input.feedback !== undefined) data.feedback = input.feedback;
    if (input.completionEvidence !== undefined) data.completionEvidence = input.completionEvidence;
    if (input.certificateUrl !== undefined) data.certificateUrl = input.certificateUrl;
    if (input.actualHours !== undefined) data.actualHours = input.actualHours;

    if (input.status === 'COMPLETED') {
      data.completionDate = new Date();
      // Increment completed count on the plan
      await prisma.developmentPlan.update({
        where: { id: activity.developmentPlanId },
        data: { completedActivities: { increment: 1 } },
      });
    }

    const updated = await prisma.developmentActivity.update({ where: { id: activityId }, data });

    // Recalculate plan progress
    await this.recalculatePlanProgress(activity.developmentPlanId);

    auditLogger('DEVELOPMENT_ACTIVITY_UPDATED', userId, tenantId, 'development_activity', activityId, data);
    return updated;
  }

  // ── Checkpoints ────────────────────────────────────────────────────────

  async addCheckpoint(tenantId: string, planId: string, userId: string, input: CreateCheckpointInput) {
    const plan = await this.getPlanById(tenantId, planId);

    const checkpoint = await prisma.developmentCheckpoint.create({
      data: {
        tenantId,
        developmentPlanId: planId,
        userId: plan.userId,
        checkpointName: input.checkpointName,
        checkpointDate: new Date(input.checkpointDate),
        checkpointType: input.checkpointType,
        status: 'SCHEDULED',
      },
    });

    auditLogger('DEVELOPMENT_CHECKPOINT_ADDED', userId, tenantId, 'development_checkpoint', checkpoint.id, {});
    return checkpoint;
  }

  async completeCheckpoint(tenantId: string, checkpointId: string, userId: string, input: {
    progressReview?: string; skillsAcquired?: string[]; managerFeedback?: string;
    selfAssessment?: string; nextSteps?: string[];
  }) {
    const checkpoint = await prisma.developmentCheckpoint.findFirst({ where: { id: checkpointId, tenantId } });
    if (!checkpoint) throw new NotFoundError('DevelopmentCheckpoint', checkpointId);

    const updated = await prisma.developmentCheckpoint.update({
      where: { id: checkpointId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        conductedBy: userId,
        progressReview: input.progressReview,
        skillsAcquired: input.skillsAcquired ?? [],
        managerFeedback: input.managerFeedback,
        selfAssessment: input.selfAssessment,
        nextSteps: input.nextSteps ?? [],
      },
    });

    auditLogger('DEVELOPMENT_CHECKPOINT_COMPLETED', userId, tenantId, 'development_checkpoint', checkpointId, {});
    return updated;
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private async recalculatePlanProgress(planId: string) {
    const activities = await prisma.developmentActivity.findMany({
      where: { developmentPlanId: planId },
      select: { progressPercentage: true },
    });

    if (activities.length === 0) return;

    const avgProgress = activities.reduce(
      (sum, a) => sum + Number(a.progressPercentage), 0
    ) / activities.length;

    await prisma.developmentPlan.update({
      where: { id: planId },
      data: { progressPercentage: Math.round(avgProgress * 100) / 100 },
    });
  }
}

export const developmentService = new DevelopmentService();
