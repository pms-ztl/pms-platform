import {
  prisma,
  type Feedback,
  FeedbackType,
  FeedbackVisibility,
} from '@pms/database';
import type { PaginatedResult, PaginationParams } from '@pms/database';

import { auditLogger } from '../../utils/logger';
import { NotFoundError, ValidationError, AuthorizationError } from '../../utils/errors';

interface CreateFeedbackInput {
  toUserId: string;
  type: FeedbackType;
  visibility: FeedbackVisibility;
  content: string;
  isAnonymous?: boolean;
  tags?: string[];
  valueTags?: string[];
  skillTags?: string[];
}

interface FeedbackWithUsers extends Feedback {
  fromUser?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
  toUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export class FeedbackService {
  async create(
    tenantId: string,
    userId: string,
    input: CreateFeedbackInput
  ): Promise<Feedback> {
    // Validate recipient exists
    const recipient = await prisma.user.findFirst({
      where: {
        id: input.toUserId,
        tenantId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (recipient === null) {
      throw new NotFoundError('User', input.toUserId);
    }

    // Can't give feedback to yourself (unless it's self-reflection)
    if (input.toUserId === userId && input.type !== FeedbackType.SUGGESTION) {
      throw new ValidationError('Cannot give feedback to yourself');
    }

    // Analyze sentiment (basic implementation - in production use NLP service)
    const sentiment = this.analyzeSentiment(input.content);
    const aiCategory = this.categorizeContent(input.content, input.type);

    const feedback = await prisma.feedback.create({
      data: {
        tenantId,
        fromUserId: userId,
        toUserId: input.toUserId,
        type: input.type,
        visibility: input.visibility,
        content: input.content,
        isAnonymous: input.isAnonymous ?? false,
        tags: input.tags ?? [],
        valueTags: input.valueTags ?? [],
        skillTags: input.skillTags ?? [],
        sentiment,
        sentimentScore: this.getSentimentScore(sentiment),
        aiCategory,
      },
    });

    auditLogger('FEEDBACK_CREATED', userId, tenantId, 'feedback', feedback.id, {
      type: feedback.type,
      visibility: feedback.visibility,
      isAnonymous: feedback.isAnonymous,
      recipientId: input.toUserId,
    });

    return feedback;
  }

  async getById(
    tenantId: string,
    userId: string,
    feedbackId: string
  ): Promise<FeedbackWithUsers> {
    const feedback = await prisma.feedback.findFirst({
      where: {
        id: feedbackId,
        tenantId,
        deletedAt: null,
      },
      include: {
        fromUser: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        toUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (feedback === null) {
      throw new NotFoundError('Feedback', feedbackId);
    }

    // Check access
    const canAccess = this.canAccessFeedback(feedback, userId);

    if (!canAccess) {
      throw new AuthorizationError('You do not have access to this feedback');
    }

    // Hide sender info if anonymous (unless viewer is HR admin)
    if (feedback.isAnonymous && feedback.toUserId === userId) {
      return {
        ...feedback,
        fromUser: null,
        fromUserId: 'anonymous',
      } as FeedbackWithUsers;
    }

    return feedback;
  }

  async listReceived(
    tenantId: string,
    userId: string,
    filters: {
      type?: FeedbackType;
      fromDate?: Date;
      toDate?: Date;
    },
    pagination: PaginationParams
  ): Promise<PaginatedResult<FeedbackWithUsers>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      toUserId: userId,
      deletedAt: null,
      ...(filters.type !== undefined && { type: filters.type }),
      ...(filters.fromDate !== undefined && {
        createdAt: { gte: filters.fromDate },
      }),
      ...(filters.toDate !== undefined && {
        createdAt: { lte: filters.toDate },
      }),
    };

    const [feedbackList, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          fromUser: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          toUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.feedback.count({ where }),
    ]);

    // Hide anonymous senders
    const processedFeedback = feedbackList.map((f) => {
      if (f.isAnonymous) {
        return {
          ...f,
          fromUser: null,
          fromUserId: 'anonymous',
        } as FeedbackWithUsers;
      }
      return f as FeedbackWithUsers;
    });

    return {
      data: processedFeedback,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    };
  }

  async listGiven(
    tenantId: string,
    userId: string,
    filters: {
      type?: FeedbackType;
      fromDate?: Date;
      toDate?: Date;
    },
    pagination: PaginationParams
  ): Promise<PaginatedResult<FeedbackWithUsers>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      fromUserId: userId,
      deletedAt: null,
      ...(filters.type !== undefined && { type: filters.type }),
      ...(filters.fromDate !== undefined && {
        createdAt: { gte: filters.fromDate },
      }),
      ...(filters.toDate !== undefined && {
        createdAt: { lte: filters.toDate },
      }),
    };

    const [feedbackList, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          fromUser: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          toUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.feedback.count({ where }),
    ]);

    return {
      data: feedbackList as FeedbackWithUsers[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    };
  }

  async listTeamFeedback(
    tenantId: string,
    managerId: string,
    filters: {
      teamMemberId?: string;
      type?: FeedbackType;
      visibility?: FeedbackVisibility;
      fromDate?: Date;
      toDate?: Date;
    },
    pagination: PaginationParams
  ): Promise<PaginatedResult<FeedbackWithUsers>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    // Get direct reports
    const directReports = await prisma.user.findMany({
      where: {
        tenantId,
        managerId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    const teamMemberIds = directReports.map((u) => u.id);

    if (teamMemberIds.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      };
    }

    const where = {
      tenantId,
      toUserId: filters.teamMemberId !== undefined
        ? filters.teamMemberId
        : { in: teamMemberIds },
      deletedAt: null,
      visibility: { in: [FeedbackVisibility.MANAGER_VISIBLE, FeedbackVisibility.PUBLIC] },
      ...(filters.type !== undefined && { type: filters.type }),
      ...(filters.fromDate !== undefined && {
        createdAt: { gte: filters.fromDate },
      }),
      ...(filters.toDate !== undefined && {
        createdAt: { lte: filters.toDate },
      }),
    };

    const [feedbackList, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          fromUser: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          toUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.feedback.count({ where }),
    ]);

    // Hide anonymous senders
    const processedFeedback = feedbackList.map((f) => {
      if (f.isAnonymous) {
        return {
          ...f,
          fromUser: null,
          fromUserId: 'anonymous',
        } as FeedbackWithUsers;
      }
      return f as FeedbackWithUsers;
    });

    return {
      data: processedFeedback,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    };
  }

  async getUnifiedTimeline(
    tenantId: string,
    userId: string,
    targetUserId: string,
    filters: {
      fromDate?: Date;
      toDate?: Date;
    }
  ): Promise<Array<{
    type: 'feedback' | 'goal_update' | 'recognition';
    date: Date;
    data: unknown;
  }>> {
    // Check access - can view own timeline or team member's timeline
    if (targetUserId !== userId) {
      const targetUser = await prisma.user.findFirst({
        where: {
          id: targetUserId,
          tenantId,
          managerId: userId, // Must be direct report
        },
      });

      if (targetUser === null) {
        throw new AuthorizationError('You can only view timeline for yourself or your direct reports');
      }
    }

    const dateFilter = {
      ...(filters.fromDate !== undefined && { gte: filters.fromDate }),
      ...(filters.toDate !== undefined && { lte: filters.toDate }),
    };

    // Get feedback (visible to the viewer)
    const feedback = await prisma.feedback.findMany({
      where: {
        tenantId,
        toUserId: targetUserId,
        deletedAt: null,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        OR: [
          { visibility: FeedbackVisibility.PUBLIC },
          { visibility: FeedbackVisibility.MANAGER_VISIBLE, toUser: { managerId: userId } },
          { toUserId: userId }, // Own feedback
        ],
      },
      include: {
        fromUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Get goal progress updates
    const goalUpdates = await prisma.goalProgressUpdate.findMany({
      where: {
        goal: {
          tenantId,
          ownerId: targetUserId,
          deletedAt: null,
        },
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      include: {
        goal: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Combine and sort
    const timeline: Array<{
      type: 'feedback' | 'goal_update' | 'recognition';
      date: Date;
      data: unknown;
    }> = [
      ...feedback.map((f) => ({
        type: 'feedback' as const,
        date: f.createdAt,
        data: f.isAnonymous
          ? { ...f, fromUser: null, fromUserId: 'anonymous' }
          : f,
      })),
      ...goalUpdates.map((g) => ({
        type: 'goal_update' as const,
        date: g.createdAt,
        data: g,
      })),
    ];

    // Sort by date descending
    timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

    return timeline.slice(0, 100);
  }

  async acknowledge(tenantId: string, userId: string, feedbackId: string): Promise<Feedback> {
    const feedback = await prisma.feedback.findFirst({
      where: {
        id: feedbackId,
        tenantId,
        toUserId: userId,
        deletedAt: null,
      },
    });

    if (feedback === null) {
      throw new NotFoundError('Feedback', feedbackId);
    }

    if (feedback.isAcknowledged) {
      throw new ValidationError('Feedback has already been acknowledged');
    }

    const updated = await prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        isAcknowledged: true,
        acknowledgedAt: new Date(),
      },
    });

    auditLogger('FEEDBACK_ACKNOWLEDGED', userId, tenantId, 'feedback', feedbackId);

    return updated;
  }

  async requestFeedback(
    tenantId: string,
    userId: string,
    input: {
      fromUserId: string;
      aboutUserId?: string;
      message?: string;
    }
  ): Promise<void> {
    // Validate users exist
    const [fromUser, aboutUser] = await Promise.all([
      prisma.user.findFirst({
        where: { id: input.fromUserId, tenantId, isActive: true },
      }),
      input.aboutUserId !== undefined
        ? prisma.user.findFirst({
            where: { id: input.aboutUserId, tenantId, isActive: true },
          })
        : Promise.resolve(null),
    ]);

    if (fromUser === null) {
      throw new NotFoundError('User', input.fromUserId);
    }

    if (input.aboutUserId !== undefined && aboutUser === null) {
      throw new NotFoundError('User', input.aboutUserId);
    }

    // Create a feedback request notification
    await prisma.notification.create({
      data: {
        userId: input.fromUserId,
        tenantId,
        type: 'FEEDBACK_REQUEST',
        title: 'Feedback Requested',
        body: input.message ?? 'Someone has requested your feedback',
        data: {
          requestedBy: userId,
          aboutUserId: input.aboutUserId ?? userId,
        },
        channel: 'in_app',
      },
    });

    auditLogger('FEEDBACK_REQUESTED', userId, tenantId, 'user', input.fromUserId, {
      aboutUserId: input.aboutUserId,
    });
  }

  async getRecognitionWall(
    tenantId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;
    const where = {
      tenantId,
      type: { in: [FeedbackType.RECOGNITION, FeedbackType.PRAISE] },
      visibility: FeedbackVisibility.PUBLIC,
      deletedAt: null,
    };

    const [data, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          fromUser: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true },
          },
          toUser: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.feedback.count({ where }),
    ]);

    // Handle anonymous
    const processed = data.map((f) => {
      if (f.isAnonymous) {
        return { ...f, fromUser: null, fromUserId: 'anonymous' };
      }
      return f;
    });

    return {
      data: processed,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTopRecognized(tenantId: string, period: 'month' | 'quarter' | 'year' = 'month') {
    const now = new Date();
    let since: Date;

    if (period === 'month') {
      since = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'quarter') {
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      since = new Date(now.getFullYear(), quarterStart, 1);
    } else {
      since = new Date(now.getFullYear(), 0, 1);
    }

    const recognitions = await prisma.feedback.groupBy({
      by: ['toUserId'],
      where: {
        tenantId,
        type: { in: [FeedbackType.RECOGNITION, FeedbackType.PRAISE] },
        visibility: FeedbackVisibility.PUBLIC,
        deletedAt: null,
        createdAt: { gte: since },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Fetch user details for the top recognized
    const userIds = recognitions.map(r => r.toUserId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    return recognitions.map(r => ({
      user: userMap.get(r.toUserId) ?? { id: r.toUserId, firstName: 'Unknown', lastName: '', avatarUrl: null, jobTitle: null },
      count: r._count.id,
    }));
  }

  async delete(tenantId: string, userId: string, feedbackId: string): Promise<void> {
    const feedback = await prisma.feedback.findFirst({
      where: {
        id: feedbackId,
        tenantId,
        fromUserId: userId, // Can only delete own feedback
        deletedAt: null,
      },
    });

    if (feedback === null) {
      throw new NotFoundError('Feedback', feedbackId);
    }

    await prisma.feedback.update({
      where: { id: feedbackId },
      data: { deletedAt: new Date() },
    });

    auditLogger('FEEDBACK_DELETED', userId, tenantId, 'feedback', feedbackId);
  }

  private canAccessFeedback(feedback: Feedback, userId: string): boolean {
    // Sender can always see
    if (feedback.fromUserId === userId) {
      return true;
    }

    // Recipient can always see (their own feedback)
    if (feedback.toUserId === userId) {
      return true;
    }

    // Public feedback is visible to all
    if (feedback.visibility === FeedbackVisibility.PUBLIC) {
      return true;
    }

    // Manager-visible requires checking manager relationship
    // TODO: Implement manager check

    return false;
  }

  private analyzeSentiment(content: string): string {
    // Basic sentiment analysis - in production use NLP service
    const positiveWords = ['great', 'excellent', 'amazing', 'good', 'fantastic', 'wonderful', 'helpful', 'appreciate', 'thank'];
    const negativeWords = ['bad', 'poor', 'terrible', 'awful', 'disappointing', 'frustrating', 'difficult', 'problem', 'issue'];

    const lowerContent = content.toLowerCase();
    const positiveCount = positiveWords.filter((w) => lowerContent.includes(w)).length;
    const negativeCount = negativeWords.filter((w) => lowerContent.includes(w)).length;

    if (positiveCount > negativeCount) {
      return 'positive';
    }
    if (negativeCount > positiveCount) {
      return 'negative';
    }
    return 'neutral';
  }

  private getSentimentScore(sentiment: string): number {
    switch (sentiment) {
      case 'positive':
        return 0.7;
      case 'negative':
        return 0.3;
      default:
        return 0.5;
    }
  }

  private categorizeContent(content: string, type: FeedbackType): string {
    // Basic categorization - in production use ML model
    const lowerContent = content.toLowerCase();

    if (type === FeedbackType.PRAISE || type === FeedbackType.RECOGNITION) {
      if (lowerContent.includes('team') || lowerContent.includes('collaborat')) {
        return 'teamwork';
      }
      if (lowerContent.includes('lead') || lowerContent.includes('initiative')) {
        return 'leadership';
      }
      if (lowerContent.includes('technical') || lowerContent.includes('skill')) {
        return 'technical_skills';
      }
      return 'general_praise';
    }

    if (type === FeedbackType.CONSTRUCTIVE) {
      if (lowerContent.includes('communicat')) {
        return 'communication';
      }
      if (lowerContent.includes('time') || lowerContent.includes('deadline')) {
        return 'time_management';
      }
      return 'general_improvement';
    }

    return 'uncategorized';
  }
}

export const feedbackService = new FeedbackService();
