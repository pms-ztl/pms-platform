import { prisma, type Goal, GoalStatus, GoalType, GoalPriority } from '@pms/database';
import type {
  CreateGoalInput,
  UpdateGoalInput,
  PaginatedResult,
  PaginationParams,
} from '@pms/database';

import { auditLogger, logger } from '../../utils/logger';
import { NotFoundError, ValidationError, AuthorizationError } from '../../utils/errors';
import { emailService } from '../../services/email';

interface GoalWithRelations extends Goal {
  owner?: { id: string; firstName: string; lastName: string; email: string };
  parentGoal?: { id: string; title: string } | null;
  childGoals?: Array<{ id: string; title: string; progress: number; status: GoalStatus }>;
  alignments?: Array<{ toGoal: { id: string; title: string } }>;
}

export class GoalsService {
  async create(
    tenantId: string,
    userId: string,
    input: CreateGoalInput
  ): Promise<Goal> {
    // Validate parent goal if provided
    if (input.parentGoalId !== undefined) {
      const parentGoal = await prisma.goal.findFirst({
        where: {
          id: input.parentGoalId,
          tenantId,
          deletedAt: null,
        },
      });

      if (parentGoal === null) {
        throw new ValidationError('Parent goal not found');
      }
    }

    const goal = await prisma.goal.create({
      data: {
        tenantId,
        ownerId: userId,
        createdById: userId,
        title: input.title,
        description: input.description,
        type: input.type,
        priority: input.priority ?? GoalPriority.MEDIUM,
        parentGoalId: input.parentGoalId,
        startDate: input.startDate,
        dueDate: input.dueDate,
        targetValue: input.targetValue,
        unit: input.unit,
        weight: input.weight ?? 1,
        isPrivate: input.isPrivate ?? false,
        tags: input.tags ?? [],
        status: GoalStatus.DRAFT,
        progress: 0,
      },
    });

    auditLogger('GOAL_CREATED', userId, tenantId, 'goal', goal.id, {
      title: goal.title,
      type: goal.type,
    });

    return goal;
  }

  async update(
    tenantId: string,
    userId: string,
    goalId: string,
    input: UpdateGoalInput
  ): Promise<Goal> {
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        tenantId,
        deletedAt: null,
      },
    });

    if (existingGoal === null) {
      throw new NotFoundError('Goal', goalId);
    }

    // Check ownership or manager relationship
    // TODO: Implement proper authorization check

    const previousState = { ...existingGoal };

    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.progress !== undefined && { progress: input.progress }),
        ...(input.currentValue !== undefined && { currentValue: input.currentValue }),
        ...(input.startDate !== undefined && { startDate: input.startDate }),
        ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
        ...(input.weight !== undefined && { weight: input.weight }),
        ...(input.isPrivate !== undefined && { isPrivate: input.isPrivate }),
        ...(input.tags !== undefined && { tags: input.tags }),
        ...(input.status === GoalStatus.COMPLETED && { completedAt: new Date() }),
      },
    });

    // Track progress update if progress changed
    if (input.progress !== undefined && input.progress !== existingGoal.progress) {
      await prisma.goalProgressUpdate.create({
        data: {
          goalId,
          previousProgress: existingGoal.progress,
          newProgress: input.progress,
          previousValue: existingGoal.currentValue,
          newValue: input.currentValue,
          updatedById: userId,
        },
      });

      // Update parent goal progress
      await this.updateParentProgress(goalId);
    }

    auditLogger('GOAL_UPDATED', userId, tenantId, 'goal', goalId, {
      changes: Object.keys(input),
    });

    // Send completion email if status changed to COMPLETED
    if (input.status === GoalStatus.COMPLETED && previousState.status !== GoalStatus.COMPLETED) {
      const goalOwner = await prisma.user.findUnique({
        where: { id: existingGoal.ownerId },
        select: { firstName: true, email: true },
      });
      if (goalOwner?.email) {
        emailService.sendTaskCompletionNotification(
          { firstName: goalOwner.firstName, email: goalOwner.email },
          { title: goal.title }
        ).catch((err) => {
          logger.error('Failed to send goal completion email', { goalId, error: err });
        });
      }
    }

    return goal;
  }

  async delete(tenantId: string, userId: string, goalId: string): Promise<void> {
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        tenantId,
        deletedAt: null,
      },
      include: {
        childGoals: {
          where: { deletedAt: null },
        },
      },
    });

    if (goal === null) {
      throw new NotFoundError('Goal', goalId);
    }

    if (goal.childGoals.length > 0) {
      throw new ValidationError('Cannot delete goal with child goals');
    }

    await prisma.goal.update({
      where: { id: goalId },
      data: { deletedAt: new Date() },
    });

    auditLogger('GOAL_DELETED', userId, tenantId, 'goal', goalId, {
      title: goal.title,
    });
  }

  async getById(
    tenantId: string,
    goalId: string,
    userId: string
  ): Promise<GoalWithRelations> {
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        tenantId,
        deletedAt: null,
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        parentGoal: {
          select: { id: true, title: true },
        },
        childGoals: {
          where: { deletedAt: null },
          select: { id: true, title: true, progress: true, status: true },
        },
        alignments: {
          include: {
            toGoal: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    if (goal === null) {
      throw new NotFoundError('Goal', goalId);
    }

    // Check visibility
    if (goal.isPrivate && goal.ownerId !== userId) {
      // TODO: Check if user is manager of owner
      throw new AuthorizationError('You do not have access to this goal');
    }

    return goal;
  }

  async list(
    tenantId: string,
    userId: string,
    filters: {
      ownerId?: string;
      status?: GoalStatus;
      type?: GoalType;
      parentGoalId?: string | null;
      search?: string;
    },
    pagination: PaginationParams
  ): Promise<PaginatedResult<Goal>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      deletedAt: null,
      ...(filters.ownerId !== undefined && { ownerId: filters.ownerId }),
      ...(filters.status !== undefined && { status: filters.status }),
      ...(filters.type !== undefined && { type: filters.type }),
      ...(filters.parentGoalId !== undefined && { parentGoalId: filters.parentGoalId }),
      ...(filters.search !== undefined && {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' as const } },
          { description: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      }),
      // Filter private goals
      OR: [{ isPrivate: false }, { ownerId: userId }],
    };

    const [goals, total] = await Promise.all([
      prisma.goal.findMany({
        where,
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.goal.count({ where }),
    ]);

    return {
      data: goals,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    };
  }

  async getGoalTree(
    tenantId: string,
    rootGoalId?: string
  ): Promise<Array<Goal & { children?: Goal[] }>> {
    const where = {
      tenantId,
      deletedAt: null,
      parentGoalId: rootGoalId ?? null,
    };

    const goals = await prisma.goal.findMany({
      where,
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
        childGoals: {
          where: { deletedAt: null },
          include: {
            owner: {
              select: { id: true, firstName: true, lastName: true },
            },
            childGoals: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return goals;
  }

  async alignGoals(
    tenantId: string,
    userId: string,
    fromGoalId: string,
    toGoalId: string,
    contributionWeight: number = 1
  ): Promise<void> {
    // Validate both goals exist
    const [fromGoal, toGoal] = await Promise.all([
      prisma.goal.findFirst({
        where: { id: fromGoalId, tenantId, deletedAt: null },
      }),
      prisma.goal.findFirst({
        where: { id: toGoalId, tenantId, deletedAt: null },
      }),
    ]);

    if (fromGoal === null) {
      throw new NotFoundError('Source goal', fromGoalId);
    }

    if (toGoal === null) {
      throw new NotFoundError('Target goal', toGoalId);
    }

    // Prevent self-alignment
    if (fromGoalId === toGoalId) {
      throw new ValidationError('Cannot align a goal to itself');
    }

    // Create alignment
    await prisma.goalAlignment.upsert({
      where: {
        fromGoalId_toGoalId: {
          fromGoalId,
          toGoalId,
        },
      },
      create: {
        fromGoalId,
        toGoalId,
        contributionWeight,
        alignmentType: 'supports',
      },
      update: {
        contributionWeight,
      },
    });

    auditLogger('GOAL_ALIGNED', userId, tenantId, 'goal', fromGoalId, {
      alignedTo: toGoalId,
      weight: contributionWeight,
    });
  }

  async removeAlignment(
    tenantId: string,
    userId: string,
    fromGoalId: string,
    toGoalId: string
  ): Promise<void> {
    const alignment = await prisma.goalAlignment.findUnique({
      where: {
        fromGoalId_toGoalId: {
          fromGoalId,
          toGoalId,
        },
      },
      include: {
        fromGoal: true,
      },
    });

    if (alignment === null || alignment.fromGoal.tenantId !== tenantId) {
      throw new NotFoundError('Goal alignment');
    }

    await prisma.goalAlignment.delete({
      where: {
        fromGoalId_toGoalId: {
          fromGoalId,
          toGoalId,
        },
      },
    });

    auditLogger('GOAL_ALIGNMENT_REMOVED', userId, tenantId, 'goal', fromGoalId, {
      removedFrom: toGoalId,
    });
  }

  async updateProgress(
    tenantId: string,
    userId: string,
    goalId: string,
    progress: number,
    currentValue?: number,
    note?: string
  ): Promise<Goal> {
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        tenantId,
        deletedAt: null,
      },
    });

    if (goal === null) {
      throw new NotFoundError('Goal', goalId);
    }

    // Validate progress range
    if (progress < 0 || progress > 100) {
      throw new ValidationError('Progress must be between 0 and 100');
    }

    // Record progress update
    await prisma.goalProgressUpdate.create({
      data: {
        goalId,
        previousProgress: goal.progress,
        newProgress: progress,
        previousValue: goal.currentValue,
        newValue: currentValue,
        note,
        updatedById: userId,
      },
    });

    // Update goal
    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        progress,
        ...(currentValue !== undefined && { currentValue }),
        ...(progress === 100 && goal.status !== GoalStatus.COMPLETED && {
          status: GoalStatus.COMPLETED,
          completedAt: new Date(),
        }),
      },
    });

    // Update parent goal progress
    await this.updateParentProgress(goalId);

    auditLogger('GOAL_PROGRESS_UPDATED', userId, tenantId, 'goal', goalId, {
      previousProgress: goal.progress,
      newProgress: progress,
    });

    return updatedGoal;
  }

  async getProgressHistory(
    tenantId: string,
    goalId: string
  ): Promise<Array<{ previousProgress: number; newProgress: number; createdAt: Date; note?: string | null }>> {
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        tenantId,
        deletedAt: null,
      },
    });

    if (goal === null) {
      throw new NotFoundError('Goal', goalId);
    }

    const updates = await prisma.goalProgressUpdate.findMany({
      where: { goalId },
      orderBy: { createdAt: 'desc' },
      select: {
        previousProgress: true,
        newProgress: true,
        note: true,
        createdAt: true,
      },
    });

    return updates;
  }

  private async updateParentProgress(childGoalId: string): Promise<void> {
    const childGoal = await prisma.goal.findUnique({
      where: { id: childGoalId },
      select: { parentGoalId: true },
    });

    if (childGoal?.parentGoalId === null || childGoal?.parentGoalId === undefined) {
      return;
    }

    const siblings = await prisma.goal.findMany({
      where: {
        parentGoalId: childGoal.parentGoalId,
        deletedAt: null,
      },
      select: {
        progress: true,
        weight: true,
      },
    });

    // Calculate weighted average progress
    const totalWeight = siblings.reduce((sum, g) => sum + g.weight, 0);
    const weightedProgress =
      siblings.reduce((sum, g) => sum + g.progress * g.weight, 0) / totalWeight;

    await prisma.goal.update({
      where: { id: childGoal.parentGoalId },
      data: { progress: Math.round(weightedProgress * 100) / 100 },
    });

    // Recursively update grandparent
    await this.updateParentProgress(childGoal.parentGoalId);
  }

  async addComment(
    tenantId: string,
    userId: string,
    goalId: string,
    content: string
  ): Promise<void> {
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        tenantId,
        deletedAt: null,
      },
    });

    if (goal === null) {
      throw new NotFoundError('Goal', goalId);
    }

    await prisma.goalComment.create({
      data: {
        goalId,
        authorId: userId,
        content,
      },
    });
  }

  async getComments(
    tenantId: string,
    goalId: string
  ): Promise<Array<{ id: string; content: string; createdAt: Date; author: { firstName: string; lastName: string } }>> {
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        tenantId,
        deletedAt: null,
      },
    });

    if (goal === null) {
      throw new NotFoundError('Goal', goalId);
    }

    const comments = await prisma.goalComment.findMany({
      where: {
        goalId,
        deletedAt: null,
      },
      include: {
        // Note: Need to add author relation to schema or use raw query
      },
      orderBy: { createdAt: 'desc' },
    });

    return comments as unknown as Array<{ id: string; content: string; createdAt: Date; author: { firstName: string; lastName: string } }>;
  }
}

export const goalsService = new GoalsService();
