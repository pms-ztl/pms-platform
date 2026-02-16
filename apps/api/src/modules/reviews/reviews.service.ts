// TODO: Fix type mismatches with Prisma schema
import {
  prisma,
  Prisma,
  type ReviewCycle,
  type Review,
  ReviewCycleStatus,
  ReviewCycleType,
  ReviewStatus,
  ReviewType,
} from '@pms/database';

import { auditLogger } from '../../utils/logger';
import { NotFoundError, ValidationError, AuthorizationError } from '../../utils/errors';

interface CreateCycleInput {
  name: string;
  description?: string;
  type: ReviewCycleType;
  startDate: Date;
  endDate: Date;
  selfAssessmentStart?: Date;
  selfAssessmentEnd?: Date;
  managerReviewStart?: Date;
  managerReviewEnd?: Date;
  calibrationStart?: Date;
  calibrationEnd?: Date;
  includeGoals?: boolean;
  includeFeedback?: boolean;
  include360?: boolean;
  templateId?: string;
  settings?: Record<string, unknown>;
}

interface SubmitReviewInput {
  overallRating: number;
  content: Record<string, unknown>;
  strengths?: string[];
  areasForGrowth?: string[];
  summary?: string;
  privateNotes?: string;
}

export class ReviewsService {
  // ==================== Review Cycles ====================

  async createCycle(
    tenantId: string,
    userId: string,
    input: CreateCycleInput
  ): Promise<ReviewCycle> {
    // Validate dates
    if (input.endDate <= input.startDate) {
      throw new ValidationError('End date must be after start date');
    }

    const cycle = await prisma.reviewCycle.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description,
        type: input.type,
        startDate: input.startDate,
        endDate: input.endDate,
        selfAssessmentStart: input.selfAssessmentStart,
        selfAssessmentEnd: input.selfAssessmentEnd,
        managerReviewStart: input.managerReviewStart,
        managerReviewEnd: input.managerReviewEnd,
        calibrationStart: input.calibrationStart,
        calibrationEnd: input.calibrationEnd,
        includeGoals: input.includeGoals ?? true,
        includeFeedback: input.includeFeedback ?? true,
        include360: input.include360 ?? false,
        templateId: input.templateId,
        settings: (input.settings ?? {}) as Prisma.InputJsonValue,
        createdById: userId,
        status: ReviewCycleStatus.DRAFT,
      },
    });

    auditLogger('REVIEW_CYCLE_CREATED', userId, tenantId, 'review_cycle', cycle.id, {
      name: cycle.name,
      type: cycle.type,
    });

    return cycle;
  }

  async updateCycle(
    tenantId: string,
    userId: string,
    cycleId: string,
    input: Partial<CreateCycleInput>
  ): Promise<ReviewCycle> {
    const existing = await prisma.reviewCycle.findFirst({
      where: {
        id: cycleId,
        tenantId,
        deletedAt: null,
      },
    });

    if (existing === null) {
      throw new NotFoundError('Review cycle', cycleId);
    }

    // Can't update after launch (except for extending dates)
    if (
      existing.status !== ReviewCycleStatus.DRAFT &&
      existing.status !== ReviewCycleStatus.SCHEDULED
    ) {
      const allowedFields = ['endDate', 'selfAssessmentEnd', 'managerReviewEnd', 'calibrationEnd'];
      const attemptedFields = Object.keys(input);
      const disallowedFields = attemptedFields.filter((f) => !allowedFields.includes(f));

      if (disallowedFields.length > 0) {
        throw new ValidationError(
          `Cannot modify ${disallowedFields.join(', ')} after cycle has started`
        );
      }
    }

    const cycle = await prisma.reviewCycle.update({
      where: { id: cycleId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.startDate !== undefined && { startDate: input.startDate }),
        ...(input.endDate !== undefined && { endDate: input.endDate }),
        ...(input.selfAssessmentStart !== undefined && { selfAssessmentStart: input.selfAssessmentStart }),
        ...(input.selfAssessmentEnd !== undefined && { selfAssessmentEnd: input.selfAssessmentEnd }),
        ...(input.managerReviewStart !== undefined && { managerReviewStart: input.managerReviewStart }),
        ...(input.managerReviewEnd !== undefined && { managerReviewEnd: input.managerReviewEnd }),
        ...(input.calibrationStart !== undefined && { calibrationStart: input.calibrationStart }),
        ...(input.calibrationEnd !== undefined && { calibrationEnd: input.calibrationEnd }),
        ...(input.includeGoals !== undefined && { includeGoals: input.includeGoals }),
        ...(input.includeFeedback !== undefined && { includeFeedback: input.includeFeedback }),
        ...(input.include360 !== undefined && { include360: input.include360 }),
        ...(input.templateId !== undefined && { templateId: input.templateId }),
        ...(input.settings !== undefined && { settings: input.settings as Prisma.InputJsonValue }),
      } as Prisma.ReviewCycleUncheckedUpdateInput,
    });

    auditLogger('REVIEW_CYCLE_UPDATED', userId, tenantId, 'review_cycle', cycleId, {
      changes: Object.keys(input),
    });

    return cycle;
  }

  async launchCycle(tenantId: string, userId: string, cycleId: string): Promise<ReviewCycle> {
    const cycle = await prisma.reviewCycle.findFirst({
      where: {
        id: cycleId,
        tenantId,
        deletedAt: null,
      },
    });

    if (cycle === null) {
      throw new NotFoundError('Review cycle', cycleId);
    }

    if (cycle.status !== ReviewCycleStatus.DRAFT && cycle.status !== ReviewCycleStatus.SCHEDULED) {
      throw new ValidationError('Cycle has already been launched');
    }

    // Get all active employees in tenant
    const employees = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        manager: true,
      },
    });

    // Create reviews for each employee
    const reviewsToCreate: Array<{
      tenantId: string;
      cycleId: string;
      revieweeId: string;
      reviewerId: string;
      type: ReviewType;
      status: ReviewStatus;
    }> = [];

    for (const employee of employees) {
      // Self review
      reviewsToCreate.push({
        tenantId,
        cycleId,
        revieweeId: employee.id,
        reviewerId: employee.id,
        type: ReviewType.SELF,
        status: ReviewStatus.NOT_STARTED,
      });

      // Manager review (if has manager)
      if (employee.managerId !== null) {
        reviewsToCreate.push({
          tenantId,
          cycleId,
          revieweeId: employee.id,
          reviewerId: employee.managerId,
          type: ReviewType.MANAGER,
          status: ReviewStatus.NOT_STARTED,
        });
      }
    }

    // Batch create reviews
    await prisma.review.createMany({
      data: reviewsToCreate,
      skipDuplicates: true,
    });

    // Update cycle status
    const updatedCycle = await prisma.reviewCycle.update({
      where: { id: cycleId },
      data: {
        status: ReviewCycleStatus.SELF_ASSESSMENT,
      },
    });

    auditLogger('REVIEW_CYCLE_LAUNCHED', userId, tenantId, 'review_cycle', cycleId, {
      reviewsCreated: reviewsToCreate.length,
    });

    return updatedCycle;
  }

  async advanceCycleStatus(
    tenantId: string,
    userId: string,
    cycleId: string,
    newStatus: ReviewCycleStatus
  ): Promise<ReviewCycle> {
    const cycle = await prisma.reviewCycle.findFirst({
      where: {
        id: cycleId,
        tenantId,
        deletedAt: null,
      },
    });

    if (cycle === null) {
      throw new NotFoundError('Review cycle', cycleId);
    }

    // Validate status progression
    const statusOrder: ReviewCycleStatus[] = [
      ReviewCycleStatus.DRAFT,
      ReviewCycleStatus.SCHEDULED,
      ReviewCycleStatus.SELF_ASSESSMENT,
      ReviewCycleStatus.MANAGER_REVIEW,
      ReviewCycleStatus.CALIBRATION,
      ReviewCycleStatus.FINALIZATION,
      ReviewCycleStatus.SHARING,
      ReviewCycleStatus.COMPLETED,
    ];

    const currentIndex = statusOrder.indexOf(cycle.status);
    const newIndex = statusOrder.indexOf(newStatus);

    if (newIndex <= currentIndex && newStatus !== ReviewCycleStatus.CANCELLED) {
      throw new ValidationError('Cannot move to a previous status');
    }

    const updatedCycle = await prisma.reviewCycle.update({
      where: { id: cycleId },
      data: { status: newStatus },
    });

    auditLogger('REVIEW_CYCLE_STATUS_CHANGED', userId, tenantId, 'review_cycle', cycleId, {
      previousStatus: cycle.status,
      newStatus,
    });

    return updatedCycle;
  }

  async getCycle(tenantId: string, cycleId: string): Promise<ReviewCycle & { reviewCount: number }> {
    const cycle = await prisma.reviewCycle.findFirst({
      where: {
        id: cycleId,
        tenantId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { reviews: true },
        },
      },
    });

    if (cycle === null) {
      throw new NotFoundError('Review cycle', cycleId);
    }

    return {
      ...cycle,
      reviewCount: cycle._count.reviews,
    };
  }

  async listCycles(
    tenantId: string,
    filters: {
      status?: ReviewCycleStatus;
      type?: ReviewCycleType;
    }
  ): Promise<ReviewCycle[]> {
    const cycles = await prisma.reviewCycle.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filters.status !== undefined && { status: filters.status }),
        ...(filters.type !== undefined && { type: filters.type }),
      },
      orderBy: { startDate: 'desc' },
    });

    return cycles;
  }

  async getCycleStats(tenantId: string, cycleId: string): Promise<{
    total: number;
    notStarted: number;
    inProgress: number;
    submitted: number;
    calibrated: number;
    finalized: number;
    acknowledged: number;
    completionRate: number;
  }> {
    const cycle = await prisma.reviewCycle.findFirst({
      where: {
        id: cycleId,
        tenantId,
        deletedAt: null,
      },
    });

    if (cycle === null) {
      throw new NotFoundError('Review cycle', cycleId);
    }

    const stats = await prisma.review.groupBy({
      by: ['status'],
      where: { cycleId },
      _count: true,
    });

    const statusCounts = stats.reduce(
      (acc, s) => {
        acc[s.status] = s._count;
        return acc;
      },
      {} as Record<ReviewStatus, number>
    );

    const total = stats.reduce((sum, s) => sum + s._count, 0);
    const completed = (statusCounts[ReviewStatus.FINALIZED] ?? 0) + (statusCounts[ReviewStatus.ACKNOWLEDGED] ?? 0);

    return {
      total,
      notStarted: statusCounts[ReviewStatus.NOT_STARTED] ?? 0,
      inProgress: statusCounts[ReviewStatus.IN_PROGRESS] ?? 0,
      submitted: statusCounts[ReviewStatus.SUBMITTED] ?? 0,
      calibrated: statusCounts[ReviewStatus.CALIBRATED] ?? 0,
      finalized: statusCounts[ReviewStatus.FINALIZED] ?? 0,
      acknowledged: statusCounts[ReviewStatus.ACKNOWLEDGED] ?? 0,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  // ==================== Reviews ====================

  async getReview(tenantId: string, userId: string, reviewId: string): Promise<Review> {
    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        tenantId,
        deletedAt: null,
      },
      include: {
        reviewee: {
          select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true },
        },
        reviewer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        cycle: {
          select: { id: true, name: true, status: true },
        },
        reviewGoals: {
          include: {
            goal: {
              select: { id: true, title: true, progress: true, status: true },
            },
          },
        },
      },
    });

    if (review === null) {
      throw new NotFoundError('Review', reviewId);
    }

    // Check access
    const canAccess =
      review.reviewerId === userId ||
      review.revieweeId === userId ||
      // TODO: Check if user is HR admin or has view_all permission
      false;

    if (!canAccess) {
      throw new AuthorizationError('You do not have access to this review');
    }

    return review;
  }

  async listMyReviews(
    tenantId: string,
    userId: string,
    filters: {
      asReviewer?: boolean;
      asReviewee?: boolean;
      cycleId?: string;
      status?: ReviewStatus;
    }
  ): Promise<Review[]> {
    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (filters.asReviewer === true && filters.asReviewee !== true) {
      where.reviewerId = userId;
    } else if (filters.asReviewee === true && filters.asReviewer !== true) {
      where.revieweeId = userId;
    } else {
      where.OR = [{ reviewerId: userId }, { revieweeId: userId }];
    }

    if (filters.cycleId !== undefined) {
      where.cycleId = filters.cycleId;
    }

    if (filters.status !== undefined) {
      where.status = filters.status;
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        reviewee: {
          select: { id: true, firstName: true, lastName: true },
        },
        reviewer: {
          select: { id: true, firstName: true, lastName: true },
        },
        cycle: {
          select: { id: true, name: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews;
  }

  async startReview(tenantId: string, userId: string, reviewId: string): Promise<Review> {
    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        tenantId,
        reviewerId: userId,
        deletedAt: null,
      },
    });

    if (review === null) {
      throw new NotFoundError('Review', reviewId);
    }

    if (review.status !== ReviewStatus.NOT_STARTED) {
      throw new ValidationError('Review has already been started');
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: { status: ReviewStatus.IN_PROGRESS },
    });

    auditLogger('REVIEW_STARTED', userId, tenantId, 'review', reviewId);

    return updatedReview;
  }

  async saveReviewDraft(
    tenantId: string,
    userId: string,
    reviewId: string,
    input: Partial<SubmitReviewInput>
  ): Promise<Review> {
    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        tenantId,
        reviewerId: userId,
        deletedAt: null,
      },
    });

    if (review === null) {
      throw new NotFoundError('Review', reviewId);
    }

    if (review.status === ReviewStatus.SUBMITTED || review.status === ReviewStatus.FINALIZED) {
      throw new ValidationError('Cannot modify a submitted review');
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(input.overallRating !== undefined && { overallRating: input.overallRating }),
        ...(input.content !== undefined && { content: input.content as Prisma.InputJsonValue }),
        ...(input.strengths !== undefined && { strengths: input.strengths }),
        ...(input.areasForGrowth !== undefined && { areasForGrowth: input.areasForGrowth }),
        ...(input.summary !== undefined && { summary: input.summary }),
        ...(input.privateNotes !== undefined && { privateNotes: input.privateNotes }),
        status:
          review.status === ReviewStatus.NOT_STARTED
            ? ReviewStatus.IN_PROGRESS
            : review.status,
      } as Prisma.ReviewUncheckedUpdateInput,
    });

    return updatedReview;
  }

  async submitReview(
    tenantId: string,
    userId: string,
    reviewId: string,
    input: SubmitReviewInput
  ): Promise<Review> {
    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        tenantId,
        reviewerId: userId,
        deletedAt: null,
      },
    });

    if (review === null) {
      throw new NotFoundError('Review', reviewId);
    }

    if (review.status === ReviewStatus.SUBMITTED || review.status === ReviewStatus.FINALIZED) {
      throw new ValidationError('Review has already been submitted');
    }

    // Validate required fields
    if (input.overallRating < 1 || input.overallRating > 5) {
      throw new ValidationError('Overall rating must be between 1 and 5');
    }

    // TODO: Run bias detection on review content
    // const biasResult = await biasDetectionService.analyze(input.content);

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        overallRating: input.overallRating,
        content: input.content as Prisma.InputJsonValue,
        strengths: input.strengths ?? [],
        areasForGrowth: input.areasForGrowth ?? [],
        summary: input.summary,
        privateNotes: input.privateNotes,
        status: ReviewStatus.SUBMITTED,
        submittedAt: new Date(),
        // biasScore: biasResult.score,
        // biasFlags: biasResult.flags,
      },
    });

    auditLogger('REVIEW_SUBMITTED', userId, tenantId, 'review', reviewId, {
      rating: input.overallRating,
    });

    return updatedReview;
  }

  async acknowledgeReview(tenantId: string, userId: string, reviewId: string): Promise<Review> {
    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        tenantId,
        revieweeId: userId,
        deletedAt: null,
      },
    });

    if (review === null) {
      throw new NotFoundError('Review', reviewId);
    }

    if (review.status !== ReviewStatus.FINALIZED) {
      throw new ValidationError('Review must be finalized before acknowledgment');
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: ReviewStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
      },
    });

    auditLogger('REVIEW_ACKNOWLEDGED', userId, tenantId, 'review', reviewId);

    return updatedReview;
  }
}

export const reviewsService = new ReviewsService();
