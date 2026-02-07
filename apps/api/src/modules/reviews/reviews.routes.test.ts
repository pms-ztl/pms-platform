import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import request from 'supertest';
import express from 'express';
import { reviewsRoutes } from './reviews.routes';

// Mock dependencies
vi.mock('../../lib/prisma', () => ({
  prisma: {
    review: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    reviewCycle: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../middleware', () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = {
      id: 'user-123',
      tenantId: 'tenant-123',
      email: 'test@example.com',
      role: 'MANAGER',
    };
    next();
  }),
  authorize: vi.fn(
    () => (_req: any, _res: any, next: any) => next()
  ),
}));

import { prisma } from '../../lib/prisma';

describe('Reviews API Routes', () => {
  let app: express.Express;

  const mockReview = {
    id: 'review-123',
    cycleId: 'cycle-123',
    revieweeId: 'user-456',
    reviewerId: 'user-123',
    status: 'IN_PROGRESS',
    overallRating: null,
    content: {
      strengths: ['Great communication'],
      areasForGrowth: ['Time management'],
    },
    tenantId: 'tenant-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    reviewee: {
      id: 'user-456',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
    reviewer: {
      id: 'user-123',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
    },
    cycle: {
      id: 'cycle-123',
      name: 'Q1 2024 Review',
      type: 'QUARTERLY',
    },
  };

  const mockCycle = {
    id: 'cycle-123',
    name: 'Q1 2024 Review',
    type: 'QUARTERLY',
    status: 'ACTIVE',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-31'),
    tenantId: 'tenant-123',
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/reviews', reviewsRoutes);
    vi.clearAllMocks();
  });

  describe('GET /reviews', () => {
    it('should return paginated list of reviews', async () => {
      (prisma.review.findMany as Mock).mockResolvedValue([mockReview]);
      (prisma.review.count as Mock).mockResolvedValue(1);

      const response = await request(app).get('/reviews');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
    });

    it('should filter reviews by cycle', async () => {
      (prisma.review.findMany as Mock).mockResolvedValue([mockReview]);
      (prisma.review.count as Mock).mockResolvedValue(1);

      await request(app).get('/reviews?cycleId=cycle-123');

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cycleId: 'cycle-123',
          }),
        })
      );
    });

    it('should filter reviews by status', async () => {
      (prisma.review.findMany as Mock).mockResolvedValue([mockReview]);
      (prisma.review.count as Mock).mockResolvedValue(1);

      await request(app).get('/reviews?status=IN_PROGRESS');

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'IN_PROGRESS',
          }),
        })
      );
    });

    it('should support pagination', async () => {
      (prisma.review.findMany as Mock).mockResolvedValue([]);
      (prisma.review.count as Mock).mockResolvedValue(100);

      await request(app).get('/reviews?page=2&limit=10');

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });
  });

  describe('GET /reviews/:id', () => {
    it('should return review by id', async () => {
      (prisma.review.findFirst as Mock).mockResolvedValue(mockReview);

      const response = await request(app).get('/reviews/review-123');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('review-123');
    });

    it('should return 404 for non-existent review', async () => {
      (prisma.review.findFirst as Mock).mockResolvedValue(null);

      const response = await request(app).get('/reviews/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /reviews', () => {
    it('should create a new review', async () => {
      (prisma.reviewCycle.findFirst as Mock).mockResolvedValue(mockCycle);
      (prisma.review.create as Mock).mockResolvedValue(mockReview);

      const response = await request(app).post('/reviews').send({
        cycleId: 'cycle-123',
        revieweeId: 'user-456',
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app).post('/reviews').send({});

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent cycle', async () => {
      (prisma.reviewCycle.findFirst as Mock).mockResolvedValue(null);

      const response = await request(app).post('/reviews').send({
        cycleId: 'non-existent',
        revieweeId: 'user-456',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /reviews/:id', () => {
    it('should update review content', async () => {
      (prisma.review.findFirst as Mock).mockResolvedValue(mockReview);
      (prisma.review.update as Mock).mockResolvedValue({
        ...mockReview,
        content: { strengths: ['Updated'], areasForGrowth: [] },
      });

      const response = await request(app).patch('/reviews/review-123').send({
        content: { strengths: ['Updated'], areasForGrowth: [] },
      });

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent review', async () => {
      (prisma.review.findFirst as Mock).mockResolvedValue(null);

      const response = await request(app).patch('/reviews/non-existent').send({
        content: { strengths: ['Updated'] },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /reviews/:id/submit', () => {
    it('should submit review', async () => {
      (prisma.review.findFirst as Mock).mockResolvedValue({
        ...mockReview,
        status: 'IN_PROGRESS',
      });
      (prisma.review.update as Mock).mockResolvedValue({
        ...mockReview,
        status: 'SUBMITTED',
      });

      const response = await request(app).post('/reviews/review-123/submit').send({
        overallRating: 4,
      });

      expect(response.status).toBe(200);
      expect(prisma.review.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SUBMITTED',
          }),
        })
      );
    });

    it('should require overall rating to submit', async () => {
      (prisma.review.findFirst as Mock).mockResolvedValue(mockReview);

      const response = await request(app).post('/reviews/review-123/submit').send({});

      expect(response.status).toBe(400);
    });

    it('should not allow submitting already submitted review', async () => {
      (prisma.review.findFirst as Mock).mockResolvedValue({
        ...mockReview,
        status: 'SUBMITTED',
      });

      const response = await request(app).post('/reviews/review-123/submit').send({
        overallRating: 4,
      });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /reviews/:id', () => {
    it('should delete review', async () => {
      (prisma.review.findFirst as Mock).mockResolvedValue({
        ...mockReview,
        status: 'DRAFT',
      });
      (prisma.review.delete as Mock).mockResolvedValue(mockReview);

      const response = await request(app).delete('/reviews/review-123');

      expect(response.status).toBe(204);
    });

    it('should not allow deleting submitted review', async () => {
      (prisma.review.findFirst as Mock).mockResolvedValue({
        ...mockReview,
        status: 'SUBMITTED',
      });

      const response = await request(app).delete('/reviews/review-123');

      expect(response.status).toBe(400);
    });
  });

  describe('Review Cycles', () => {
    describe('GET /reviews/cycles', () => {
      it('should return list of review cycles', async () => {
        (prisma.reviewCycle.findMany as Mock).mockResolvedValue([mockCycle]);

        const response = await request(app).get('/reviews/cycles');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should filter cycles by status', async () => {
        (prisma.reviewCycle.findMany as Mock).mockResolvedValue([mockCycle]);

        await request(app).get('/reviews/cycles?status=ACTIVE');

        expect(prisma.reviewCycle.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: 'ACTIVE',
            }),
          })
        );
      });
    });

    describe('POST /reviews/cycles', () => {
      it('should create a new review cycle', async () => {
        (prisma.reviewCycle.create as Mock).mockResolvedValue(mockCycle);

        const response = await request(app).post('/reviews/cycles').send({
          name: 'Q1 2024 Review',
          type: 'QUARTERLY',
          startDate: '2024-01-01',
          endDate: '2024-03-31',
        });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
      });

      it('should validate date range', async () => {
        const response = await request(app).post('/reviews/cycles').send({
          name: 'Invalid Cycle',
          type: 'QUARTERLY',
          startDate: '2024-03-31',
          endDate: '2024-01-01', // End before start
        });

        expect(response.status).toBe(400);
      });
    });
  });
});
