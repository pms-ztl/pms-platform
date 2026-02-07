import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { FeedbackService } from './feedback.service';
import { prisma } from '../../lib/prisma';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    feedback: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    recognition: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('FeedbackService', () => {
  let feedbackService: FeedbackService;

  const mockUser = {
    id: 'user-123',
    tenantId: 'tenant-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'EMPLOYEE',
  };

  const mockFeedback = {
    id: 'feedback-123',
    type: 'CONTINUOUS',
    fromUserId: 'user-123',
    toUserId: 'user-456',
    content: 'Great work on the project!',
    category: 'COLLABORATION',
    visibility: 'PRIVATE',
    isAnonymous: false,
    tenantId: 'tenant-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    fromUser: {
      id: 'user-123',
      firstName: 'Test',
      lastName: 'User',
    },
    toUser: {
      id: 'user-456',
      firstName: 'John',
      lastName: 'Doe',
    },
  };

  const mockRecognition = {
    id: 'recognition-123',
    fromUserId: 'user-123',
    toUserId: 'user-456',
    message: 'Amazing job!',
    badge: 'TEAM_PLAYER',
    points: 50,
    tenantId: 'tenant-123',
    createdAt: new Date(),
  };

  beforeEach(() => {
    feedbackService = new FeedbackService();
    vi.clearAllMocks();
  });

  describe('listFeedback', () => {
    it('should return paginated feedback list', async () => {
      (prisma.feedback.findMany as Mock).mockResolvedValue([mockFeedback]);
      (prisma.feedback.count as Mock).mockResolvedValue(1);

      const result = await feedbackService.listFeedback('tenant-123', {
        page: 1,
        limit: 10,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
      expect(result.data).toHaveLength(1);
    });

    it('should filter by recipient', async () => {
      (prisma.feedback.findMany as Mock).mockResolvedValue([mockFeedback]);
      (prisma.feedback.count as Mock).mockResolvedValue(1);

      await feedbackService.listFeedback('tenant-123', {
        toUserId: 'user-456',
      });

      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            toUserId: 'user-456',
          }),
        })
      );
    });

    it('should filter by type', async () => {
      (prisma.feedback.findMany as Mock).mockResolvedValue([mockFeedback]);
      (prisma.feedback.count as Mock).mockResolvedValue(1);

      await feedbackService.listFeedback('tenant-123', {
        type: 'CONTINUOUS',
      });

      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'CONTINUOUS',
          }),
        })
      );
    });

    it('should respect visibility constraints', async () => {
      (prisma.feedback.findMany as Mock).mockResolvedValue([]);
      (prisma.feedback.count as Mock).mockResolvedValue(0);

      await feedbackService.listFeedback('tenant-123', {
        userId: 'user-789', // Viewing as different user
      });

      expect(prisma.feedback.findMany).toHaveBeenCalled();
    });
  });

  describe('getFeedback', () => {
    it('should return feedback by id', async () => {
      (prisma.feedback.findFirst as Mock).mockResolvedValue(mockFeedback);

      const result = await feedbackService.getFeedback(
        'feedback-123',
        'tenant-123'
      );

      expect(result).toEqual(mockFeedback);
    });

    it('should throw error for non-existent feedback', async () => {
      (prisma.feedback.findFirst as Mock).mockResolvedValue(null);

      await expect(
        feedbackService.getFeedback('non-existent', 'tenant-123')
      ).rejects.toThrow('Feedback not found');
    });

    it('should hide sender for anonymous feedback', async () => {
      (prisma.feedback.findFirst as Mock).mockResolvedValue({
        ...mockFeedback,
        isAnonymous: true,
      });

      const result = await feedbackService.getFeedback(
        'feedback-123',
        'tenant-123',
        'user-456' // Recipient viewing
      );

      expect(result.fromUser).toBeUndefined();
    });
  });

  describe('createFeedback', () => {
    it('should create new feedback', async () => {
      (prisma.user.findUnique as Mock).mockResolvedValue(mockUser);
      (prisma.feedback.create as Mock).mockResolvedValue(mockFeedback);

      const result = await feedbackService.createFeedback(
        'tenant-123',
        'user-123',
        {
          toUserId: 'user-456',
          content: 'Great work!',
          type: 'CONTINUOUS',
          category: 'COLLABORATION',
        }
      );

      expect(result).toHaveProperty('id');
      expect(prisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          content: 'Great work!',
          fromUserId: 'user-123',
          toUserId: 'user-456',
        }),
        include: expect.any(Object),
      });
    });

    it('should allow anonymous feedback', async () => {
      (prisma.user.findUnique as Mock).mockResolvedValue(mockUser);
      (prisma.feedback.create as Mock).mockResolvedValue({
        ...mockFeedback,
        isAnonymous: true,
      });

      await feedbackService.createFeedback('tenant-123', 'user-123', {
        toUserId: 'user-456',
        content: 'Anonymous feedback',
        type: 'CONTINUOUS',
        isAnonymous: true,
      });

      expect(prisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isAnonymous: true,
        }),
        include: expect.any(Object),
      });
    });

    it('should not allow self-feedback', async () => {
      await expect(
        feedbackService.createFeedback('tenant-123', 'user-123', {
          toUserId: 'user-123',
          content: 'Self feedback',
          type: 'CONTINUOUS',
        })
      ).rejects.toThrow('Cannot send feedback to yourself');
    });

    it('should validate recipient exists', async () => {
      (prisma.user.findUnique as Mock).mockResolvedValue(null);

      await expect(
        feedbackService.createFeedback('tenant-123', 'user-123', {
          toUserId: 'non-existent',
          content: 'Feedback',
          type: 'CONTINUOUS',
        })
      ).rejects.toThrow('Recipient not found');
    });
  });

  describe('updateFeedback', () => {
    it('should update feedback content', async () => {
      (prisma.feedback.findFirst as Mock).mockResolvedValue(mockFeedback);
      (prisma.feedback.update as Mock).mockResolvedValue({
        ...mockFeedback,
        content: 'Updated content',
      });

      const result = await feedbackService.updateFeedback(
        'feedback-123',
        'tenant-123',
        'user-123',
        { content: 'Updated content' }
      );

      expect(result.content).toBe('Updated content');
    });

    it('should not allow updating others feedback', async () => {
      (prisma.feedback.findFirst as Mock).mockResolvedValue(mockFeedback);

      await expect(
        feedbackService.updateFeedback(
          'feedback-123',
          'tenant-123',
          'user-789', // Different user
          { content: 'Hacked content' }
        )
      ).rejects.toThrow('Not authorized');
    });

    it('should not allow updating acknowledged feedback', async () => {
      (prisma.feedback.findFirst as Mock).mockResolvedValue({
        ...mockFeedback,
        acknowledgedAt: new Date(),
      });

      await expect(
        feedbackService.updateFeedback(
          'feedback-123',
          'tenant-123',
          'user-123',
          { content: 'Updated' }
        )
      ).rejects.toThrow('Cannot update acknowledged feedback');
    });
  });

  describe('deleteFeedback', () => {
    it('should delete feedback', async () => {
      (prisma.feedback.findFirst as Mock).mockResolvedValue(mockFeedback);
      (prisma.feedback.delete as Mock).mockResolvedValue(mockFeedback);

      await feedbackService.deleteFeedback(
        'feedback-123',
        'tenant-123',
        'user-123'
      );

      expect(prisma.feedback.delete).toHaveBeenCalledWith({
        where: { id: 'feedback-123' },
      });
    });

    it('should not allow deleting others feedback', async () => {
      (prisma.feedback.findFirst as Mock).mockResolvedValue(mockFeedback);

      await expect(
        feedbackService.deleteFeedback('feedback-123', 'tenant-123', 'user-789')
      ).rejects.toThrow('Not authorized');
    });
  });

  describe('acknowledgeFeedback', () => {
    it('should acknowledge feedback', async () => {
      (prisma.feedback.findFirst as Mock).mockResolvedValue(mockFeedback);
      (prisma.feedback.update as Mock).mockResolvedValue({
        ...mockFeedback,
        acknowledgedAt: new Date(),
      });

      const result = await feedbackService.acknowledgeFeedback(
        'feedback-123',
        'tenant-123',
        'user-456' // Recipient
      );

      expect(result.acknowledgedAt).toBeDefined();
    });

    it('should only allow recipient to acknowledge', async () => {
      (prisma.feedback.findFirst as Mock).mockResolvedValue(mockFeedback);

      await expect(
        feedbackService.acknowledgeFeedback(
          'feedback-123',
          'tenant-123',
          'user-789' // Not the recipient
        )
      ).rejects.toThrow('Not authorized');
    });

    it('should not allow double acknowledgment', async () => {
      (prisma.feedback.findFirst as Mock).mockResolvedValue({
        ...mockFeedback,
        acknowledgedAt: new Date(),
      });

      await expect(
        feedbackService.acknowledgeFeedback(
          'feedback-123',
          'tenant-123',
          'user-456'
        )
      ).rejects.toThrow('Already acknowledged');
    });
  });

  describe('Recognition', () => {
    describe('listRecognitions', () => {
      it('should return recognitions for user', async () => {
        (prisma.recognition.findMany as Mock).mockResolvedValue([mockRecognition]);

        const result = await feedbackService.listRecognitions('tenant-123', {
          toUserId: 'user-456',
        });

        expect(Array.isArray(result)).toBe(true);
        expect(prisma.recognition.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              toUserId: 'user-456',
            }),
          })
        );
      });

      it('should filter by badge type', async () => {
        (prisma.recognition.findMany as Mock).mockResolvedValue([mockRecognition]);

        await feedbackService.listRecognitions('tenant-123', {
          badge: 'TEAM_PLAYER',
        });

        expect(prisma.recognition.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              badge: 'TEAM_PLAYER',
            }),
          })
        );
      });
    });

    describe('giveRecognition', () => {
      it('should create recognition', async () => {
        (prisma.user.findUnique as Mock).mockResolvedValue(mockUser);
        (prisma.recognition.create as Mock).mockResolvedValue(mockRecognition);

        const result = await feedbackService.giveRecognition(
          'tenant-123',
          'user-123',
          {
            toUserId: 'user-456',
            message: 'Amazing job!',
            badge: 'TEAM_PLAYER',
          }
        );

        expect(result).toHaveProperty('id');
        expect(result.badge).toBe('TEAM_PLAYER');
      });

      it('should assign points based on badge', async () => {
        (prisma.user.findUnique as Mock).mockResolvedValue(mockUser);
        (prisma.recognition.create as Mock).mockResolvedValue(mockRecognition);

        await feedbackService.giveRecognition('tenant-123', 'user-123', {
          toUserId: 'user-456',
          message: 'Great!',
          badge: 'STAR_PERFORMER',
        });

        expect(prisma.recognition.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            points: expect.any(Number),
          }),
          include: expect.any(Object),
        });
      });

      it('should not allow self-recognition', async () => {
        await expect(
          feedbackService.giveRecognition('tenant-123', 'user-123', {
            toUserId: 'user-123',
            message: 'I am amazing!',
            badge: 'TEAM_PLAYER',
          })
        ).rejects.toThrow('Cannot give recognition to yourself');
      });
    });
  });

  describe('getFeedbackStats', () => {
    it('should return feedback statistics for user', async () => {
      (prisma.feedback.count as Mock)
        .mockResolvedValueOnce(10) // received
        .mockResolvedValueOnce(5); // given
      (prisma.recognition.findMany as Mock).mockResolvedValue([
        mockRecognition,
        mockRecognition,
      ]);

      const result = await feedbackService.getFeedbackStats(
        'tenant-123',
        'user-456'
      );

      expect(result).toHaveProperty('received', 10);
      expect(result).toHaveProperty('given', 5);
      expect(result).toHaveProperty('recognitionsReceived', 2);
    });
  });
});
