import {
  prisma,
  type CalibrationSession,
  type CalibrationRating,
  CalibrationStatus,
  ReviewStatus,
} from '@pms/database';

import { auditLogger } from '../../utils/logger';
import { NotFoundError, ValidationError, AuthorizationError } from '../../utils/errors';

interface CreateSessionInput {
  cycleId: string;
  name: string;
  description?: string;
  scheduledStart: Date;
  scheduledEnd?: Date;
  departmentScope?: string[];
  levelScope?: number[];
}

interface SessionWithDetails extends CalibrationSession {
  facilitator?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  participants?: Array<{
    user: {
      id: string;
      firstName: string;
      lastName: string;
    };
    role: string;
  }>;
  _count?: {
    ratings: number;
  };
}

interface PreAnalysisResult {
  totalReviews: number;
  ratingDistribution: Record<string, number>;
  outliers: Array<{
    reviewId: string;
    revieweeName: string;
    managerRating: number;
    teamAverage: number;
    deviation: number;
    reason: string;
  }>;
  biasIndicators: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    affectedReviews: string[];
  }>;
  discussionSuggestions: Array<{
    topic: string;
    reason: string;
    relatedReviews: string[];
  }>;
}

export class CalibrationService {
  async createSession(
    tenantId: string,
    userId: string,
    input: CreateSessionInput
  ): Promise<CalibrationSession> {
    // Validate cycle exists and is in calibration phase
    const cycle = await prisma.reviewCycle.findFirst({
      where: {
        id: input.cycleId,
        tenantId,
        deletedAt: null,
      },
    });

    if (cycle === null) {
      throw new NotFoundError('Review cycle', input.cycleId);
    }

    const session = await prisma.calibrationSession.create({
      data: {
        tenantId,
        cycleId: input.cycleId,
        name: input.name,
        description: input.description,
        facilitatorId: userId,
        scheduledStart: input.scheduledStart,
        scheduledEnd: input.scheduledEnd,
        departmentScope: input.departmentScope ?? [],
        levelScope: input.levelScope ?? [],
        status: CalibrationStatus.SCHEDULED,
      },
    });

    auditLogger('CALIBRATION_SESSION_CREATED', userId, tenantId, 'calibration_session', session.id, {
      cycleId: input.cycleId,
      name: input.name,
    });

    return session;
  }

  async getSession(
    tenantId: string,
    sessionId: string
  ): Promise<SessionWithDetails> {
    const session = await prisma.calibrationSession.findFirst({
      where: {
        id: sessionId,
        tenantId,
        deletedAt: null,
      },
      include: {
        facilitator: {
          select: { id: true, firstName: true, lastName: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        _count: {
          select: { ratings: true },
        },
      },
    });

    if (session === null) {
      throw new NotFoundError('Calibration session', sessionId);
    }

    return session;
  }

  async listSessions(
    tenantId: string,
    filters: {
      cycleId?: string;
      status?: CalibrationStatus;
      facilitatorId?: string;
    }
  ): Promise<SessionWithDetails[]> {
    const sessions = await prisma.calibrationSession.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filters.cycleId !== undefined && { cycleId: filters.cycleId }),
        ...(filters.status !== undefined && { status: filters.status }),
        ...(filters.facilitatorId !== undefined && { facilitatorId: filters.facilitatorId }),
      },
      include: {
        facilitator: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { ratings: true },
        },
      },
      orderBy: { scheduledStart: 'desc' },
    });

    return sessions;
  }

  async startSession(
    tenantId: string,
    userId: string,
    sessionId: string
  ): Promise<CalibrationSession> {
    const session = await prisma.calibrationSession.findFirst({
      where: {
        id: sessionId,
        tenantId,
        deletedAt: null,
      },
    });

    if (session === null) {
      throw new NotFoundError('Calibration session', sessionId);
    }

    if (session.facilitatorId !== userId) {
      throw new AuthorizationError('Only the facilitator can start the session');
    }

    if (session.status !== CalibrationStatus.SCHEDULED) {
      throw new ValidationError('Session has already been started or completed');
    }

    // Run pre-analysis
    const preAnalysis = await this.runPreAnalysis(tenantId, session.cycleId, session);

    const updated = await prisma.calibrationSession.update({
      where: { id: sessionId },
      data: {
        status: CalibrationStatus.IN_PROGRESS,
        actualStart: new Date(),
        preAnalysis: preAnalysis as any,
        outliers: preAnalysis.outliers as any,
        biasAlerts: preAnalysis.biasIndicators as any,
      },
    });

    auditLogger('CALIBRATION_SESSION_STARTED', userId, tenantId, 'calibration_session', sessionId);

    return updated;
  }

  async completeSession(
    tenantId: string,
    userId: string,
    sessionId: string,
    notes?: string
  ): Promise<CalibrationSession> {
    const session = await prisma.calibrationSession.findFirst({
      where: {
        id: sessionId,
        tenantId,
        deletedAt: null,
      },
    });

    if (session === null) {
      throw new NotFoundError('Calibration session', sessionId);
    }

    if (session.facilitatorId !== userId) {
      throw new AuthorizationError('Only the facilitator can complete the session');
    }

    if (session.status !== CalibrationStatus.IN_PROGRESS) {
      throw new ValidationError('Session must be in progress to complete');
    }

    // Apply all calibration adjustments to reviews
    const ratings = await prisma.calibrationRating.findMany({
      where: { sessionId },
    });

    for (const rating of ratings) {
      await prisma.review.update({
        where: { id: rating.reviewId },
        data: {
          calibratedRating: rating.adjustedRating,
          calibratedAt: new Date(),
          status: ReviewStatus.CALIBRATED,
        },
      });
    }

    const updated = await prisma.calibrationSession.update({
      where: { id: sessionId },
      data: {
        status: CalibrationStatus.COMPLETED,
        actualEnd: new Date(),
        notes,
      },
    });

    auditLogger('CALIBRATION_SESSION_COMPLETED', userId, tenantId, 'calibration_session', sessionId, {
      ratingsApplied: ratings.length,
    });

    return updated;
  }

  async addParticipant(
    tenantId: string,
    userId: string,
    sessionId: string,
    participantId: string,
    role: string = 'participant'
  ): Promise<void> {
    const session = await prisma.calibrationSession.findFirst({
      where: {
        id: sessionId,
        tenantId,
        facilitatorId: userId,
        deletedAt: null,
      },
    });

    if (session === null) {
      throw new NotFoundError('Calibration session', sessionId);
    }

    await prisma.calibrationParticipant.upsert({
      where: {
        sessionId_userId: {
          sessionId,
          userId: participantId,
        },
      },
      create: {
        sessionId,
        userId: participantId,
        role,
      },
      update: {
        role,
      },
    });
  }

  async getReviewsForCalibration(
    tenantId: string,
    sessionId: string
  ): Promise<Array<{
    id: string;
    reviewee: { id: string; firstName: string; lastName: string; jobTitle: string | null; level: number };
    reviewer: { id: string; firstName: string; lastName: string };
    overallRating: number | null;
    calibratedRating: number | null;
    status: ReviewStatus;
    biasFlags: unknown;
  }>> {
    const session = await prisma.calibrationSession.findFirst({
      where: {
        id: sessionId,
        tenantId,
        deletedAt: null,
      },
    });

    if (session === null) {
      throw new NotFoundError('Calibration session', sessionId);
    }

    // Build filters based on session scope
    const revieweeFilter: Record<string, unknown> = {};

    if (session.departmentScope.length > 0) {
      revieweeFilter.departmentId = { in: session.departmentScope };
    }

    if (session.levelScope.length > 0) {
      revieweeFilter.level = { in: session.levelScope };
    }

    const reviews = await prisma.review.findMany({
      where: {
        cycleId: session.cycleId,
        tenantId,
        status: { in: [ReviewStatus.SUBMITTED, ReviewStatus.CALIBRATED] },
        type: 'MANAGER', // Only calibrate manager reviews
        deletedAt: null,
        reviewee: revieweeFilter,
      },
      include: {
        reviewee: {
          select: { id: true, firstName: true, lastName: true, jobTitle: true, level: true },
        },
        reviewer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: [
        { reviewee: { lastName: 'asc' } },
        { reviewee: { firstName: 'asc' } },
      ],
    });

    return reviews;
  }

  async adjustRating(
    tenantId: string,
    userId: string,
    sessionId: string,
    input: {
      reviewId: string;
      adjustedRating: number;
      rationale: string;
      discussionNotes?: string;
    }
  ): Promise<CalibrationRating> {
    const session = await prisma.calibrationSession.findFirst({
      where: {
        id: sessionId,
        tenantId,
        status: CalibrationStatus.IN_PROGRESS,
        deletedAt: null,
      },
    });

    if (session === null) {
      throw new NotFoundError('Calibration session', sessionId);
    }

    // Verify user is participant or facilitator
    const isParticipant = await prisma.calibrationParticipant.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
    });

    if (session.facilitatorId !== userId && isParticipant === null) {
      throw new AuthorizationError('You are not a participant in this session');
    }

    // Get the review
    const review = await prisma.review.findFirst({
      where: {
        id: input.reviewId,
        cycleId: session.cycleId,
        tenantId,
      },
    });

    if (review === null) {
      throw new NotFoundError('Review', input.reviewId);
    }

    if (review.overallRating === null) {
      throw new ValidationError('Review has no rating to calibrate');
    }

    // Validate rating range
    if (input.adjustedRating < 1 || input.adjustedRating > 5) {
      throw new ValidationError('Rating must be between 1 and 5');
    }

    // Check if rationale is meaningful
    if (input.rationale.length < 20) {
      throw new ValidationError('Please provide a more detailed rationale (at least 20 characters)');
    }

    // Create or update calibration rating
    const rating = await prisma.calibrationRating.upsert({
      where: {
        id: `${sessionId}-${input.reviewId}`, // Composite key workaround
      },
      create: {
        sessionId,
        reviewId: input.reviewId,
        adjustedById: userId,
        originalRating: review.overallRating,
        adjustedRating: input.adjustedRating,
        rationale: input.rationale,
        discussionNotes: input.discussionNotes,
      },
      update: {
        adjustedById: userId,
        adjustedRating: input.adjustedRating,
        rationale: input.rationale,
        discussionNotes: input.discussionNotes,
      },
    });

    auditLogger('CALIBRATION_RATING_ADJUSTED', userId, tenantId, 'calibration_rating', rating.id, {
      reviewId: input.reviewId,
      originalRating: review.overallRating,
      adjustedRating: input.adjustedRating,
    });

    return rating;
  }

  async getSessionRatings(
    tenantId: string,
    sessionId: string
  ): Promise<Array<CalibrationRating & { review: { reviewee: { firstName: string; lastName: string } } }>> {
    const session = await prisma.calibrationSession.findFirst({
      where: {
        id: sessionId,
        tenantId,
        deletedAt: null,
      },
    });

    if (session === null) {
      throw new NotFoundError('Calibration session', sessionId);
    }

    const ratings = await prisma.calibrationRating.findMany({
      where: { sessionId },
      include: {
        review: {
          include: {
            reviewee: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ratings;
  }

  private async runPreAnalysis(
    tenantId: string,
    cycleId: string,
    session: CalibrationSession
  ): Promise<PreAnalysisResult> {
    // Get all submitted manager reviews for the cycle
    const reviews = await prisma.review.findMany({
      where: {
        cycleId,
        tenantId,
        type: 'MANAGER',
        status: ReviewStatus.SUBMITTED,
        deletedAt: null,
        ...(session.departmentScope.length > 0 && {
          reviewee: { departmentId: { in: session.departmentScope } },
        }),
        ...(session.levelScope.length > 0 && {
          reviewee: { level: { in: session.levelScope } },
        }),
      },
      include: {
        reviewee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            managerId: true,
            departmentId: true,
            level: true,
          },
        },
        reviewer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Calculate rating distribution
    const ratingDistribution: Record<string, number> = {};
    for (const review of reviews) {
      if (review.overallRating !== null) {
        const ratingKey = review.overallRating.toFixed(1);
        ratingDistribution[ratingKey] = (ratingDistribution[ratingKey] ?? 0) + 1;
      }
    }

    // Find outliers (ratings significantly different from team average)
    const outliers: PreAnalysisResult['outliers'] = [];
    const reviewsByManager = new Map<string, typeof reviews>();

    for (const review of reviews) {
      const managerId = review.reviewer.id;
      const existing = reviewsByManager.get(managerId) ?? [];
      existing.push(review);
      reviewsByManager.set(managerId, existing);
    }

    for (const [managerId, managerReviews] of reviewsByManager) {
      if (managerReviews.length < 2) {
        continue;
      }

      const ratings = managerReviews
        .map((r) => r.overallRating)
        .filter((r): r is number => r !== null);
      const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const stdDev = Math.sqrt(
        ratings.reduce((sum, r) => sum + Math.pow(r - avgRating, 2), 0) / ratings.length
      );

      for (const review of managerReviews) {
        if (review.overallRating === null) {
          continue;
        }

        const deviation = Math.abs(review.overallRating - avgRating);
        if (stdDev > 0 && deviation > stdDev * 1.5) {
          outliers.push({
            reviewId: review.id,
            revieweeName: `${review.reviewee.firstName} ${review.reviewee.lastName}`,
            managerRating: review.overallRating,
            teamAverage: Math.round(avgRating * 10) / 10,
            deviation: Math.round(deviation * 10) / 10,
            reason: review.overallRating > avgRating
              ? 'Rating significantly above team average'
              : 'Rating significantly below team average',
          });
        }
      }
    }

    // Detect potential bias indicators
    const biasIndicators: PreAnalysisResult['biasIndicators'] = [];

    // Check for rating clustering (all ratings same or very similar)
    for (const [managerId, managerReviews] of reviewsByManager) {
      if (managerReviews.length < 3) {
        continue;
      }

      const ratings = managerReviews
        .map((r) => r.overallRating)
        .filter((r): r is number => r !== null);
      const uniqueRatings = new Set(ratings);

      if (uniqueRatings.size === 1) {
        biasIndicators.push({
          type: 'rating_clustering',
          description: `Manager ${managerReviews[0]?.reviewer.firstName} gave identical ratings to all ${ratings.length} direct reports`,
          severity: 'medium',
          affectedReviews: managerReviews.map((r) => r.id),
        });
      }
    }

    // Check for central tendency (all ratings near 3)
    const nearMiddleReviews = reviews.filter(
      (r) => r.overallRating !== null && r.overallRating >= 2.8 && r.overallRating <= 3.2
    );
    if (nearMiddleReviews.length > reviews.length * 0.7) {
      biasIndicators.push({
        type: 'central_tendency',
        description: 'Over 70% of ratings are near the middle (2.8-3.2), suggesting central tendency bias',
        severity: 'high',
        affectedReviews: nearMiddleReviews.map((r) => r.id),
      });
    }

    // Generate discussion suggestions
    const discussionSuggestions: PreAnalysisResult['discussionSuggestions'] = [];

    if (outliers.length > 0) {
      discussionSuggestions.push({
        topic: 'Review rating outliers',
        reason: `${outliers.length} ratings deviate significantly from team averages`,
        relatedReviews: outliers.map((o) => o.reviewId),
      });
    }

    if (biasIndicators.length > 0) {
      discussionSuggestions.push({
        topic: 'Potential bias patterns',
        reason: `${biasIndicators.length} bias indicators detected`,
        relatedReviews: biasIndicators.flatMap((b) => b.affectedReviews),
      });
    }

    return {
      totalReviews: reviews.length,
      ratingDistribution,
      outliers,
      biasIndicators,
      discussionSuggestions,
    };
  }
}

export const calibrationService = new CalibrationService();
