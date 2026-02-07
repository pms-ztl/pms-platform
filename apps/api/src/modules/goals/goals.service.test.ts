import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { GoalsService } from './goals.service';
import { prisma } from '../../lib/prisma';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    goal: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    goalProgress: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('GoalsService', () => {
  let goalsService: GoalsService;

  const mockUser = {
    id: 'user-123',
    tenantId: 'tenant-123',
    role: 'EMPLOYEE',
  };

  const mockGoal = {
    id: 'goal-123',
    title: 'Complete Q1 targets',
    description: 'Achieve all quarterly targets',
    type: 'INDIVIDUAL',
    status: 'IN_PROGRESS',
    progress: 50,
    ownerId: 'user-123',
    tenantId: 'tenant-123',
    targetDate: new Date('2024-03-31'),
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: {
      id: 'user-123',
      firstName: 'Test',
      lastName: 'User',
    },
  };

  beforeEach(() => {
    goalsService = new GoalsService();
    vi.clearAllMocks();
  });

  describe('listGoals', () => {
    it('should return paginated list of goals', async () => {
      (prisma.goal.findMany as Mock).mockResolvedValue([mockGoal]);
      (prisma.goal.count as Mock).mockResolvedValue(1);

      const result = await goalsService.listGoals(mockUser.tenantId, {
        page: 1,
        limit: 10,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Complete Q1 targets');
    });

    it('should filter goals by status', async () => {
      (prisma.goal.findMany as Mock).mockResolvedValue([mockGoal]);
      (prisma.goal.count as Mock).mockResolvedValue(1);

      await goalsService.listGoals(mockUser.tenantId, {
        status: 'IN_PROGRESS',
      });

      expect(prisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'IN_PROGRESS',
          }),
        })
      );
    });

    it('should filter goals by owner', async () => {
      (prisma.goal.findMany as Mock).mockResolvedValue([mockGoal]);
      (prisma.goal.count as Mock).mockResolvedValue(1);

      await goalsService.listGoals(mockUser.tenantId, {
        ownerId: 'user-123',
      });

      expect(prisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: 'user-123',
          }),
        })
      );
    });
  });

  describe('getGoal', () => {
    it('should return goal by id', async () => {
      (prisma.goal.findFirst as Mock).mockResolvedValue(mockGoal);

      const result = await goalsService.getGoal(
        'goal-123',
        mockUser.tenantId
      );

      expect(result).toEqual(mockGoal);
      expect(prisma.goal.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'goal-123',
          tenantId: mockUser.tenantId,
        },
        include: expect.any(Object),
      });
    });

    it('should throw error for non-existent goal', async () => {
      (prisma.goal.findFirst as Mock).mockResolvedValue(null);

      await expect(
        goalsService.getGoal('non-existent', mockUser.tenantId)
      ).rejects.toThrow('Goal not found');
    });
  });

  describe('createGoal', () => {
    it('should create a new goal', async () => {
      const createData = {
        title: 'New Goal',
        description: 'A new goal description',
        type: 'INDIVIDUAL' as const,
        targetDate: new Date('2024-06-30'),
      };

      (prisma.goal.create as Mock).mockResolvedValue({
        ...mockGoal,
        ...createData,
        id: 'new-goal-123',
      });

      const result = await goalsService.createGoal(
        mockUser.tenantId,
        mockUser.id,
        createData
      );

      expect(result.title).toBe('New Goal');
      expect(prisma.goal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'New Goal',
          ownerId: mockUser.id,
          tenantId: mockUser.tenantId,
        }),
        include: expect.any(Object),
      });
    });

    it('should create a child goal with parent reference', async () => {
      const parentGoal = { ...mockGoal, id: 'parent-goal-123' };
      (prisma.goal.findFirst as Mock).mockResolvedValue(parentGoal);
      (prisma.goal.create as Mock).mockResolvedValue({
        ...mockGoal,
        parentId: 'parent-goal-123',
      });

      const result = await goalsService.createGoal(
        mockUser.tenantId,
        mockUser.id,
        {
          title: 'Child Goal',
          type: 'INDIVIDUAL',
          parentId: 'parent-goal-123',
        }
      );

      expect(prisma.goal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentId: 'parent-goal-123',
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('updateGoal', () => {
    it('should update goal details', async () => {
      (prisma.goal.findFirst as Mock).mockResolvedValue(mockGoal);
      (prisma.goal.update as Mock).mockResolvedValue({
        ...mockGoal,
        title: 'Updated Title',
      });

      const result = await goalsService.updateGoal(
        'goal-123',
        mockUser.tenantId,
        mockUser.id,
        { title: 'Updated Title' }
      );

      expect(result.title).toBe('Updated Title');
    });

    it('should throw error when updating non-existent goal', async () => {
      (prisma.goal.findFirst as Mock).mockResolvedValue(null);

      await expect(
        goalsService.updateGoal('non-existent', mockUser.tenantId, mockUser.id, {
          title: 'Updated',
        })
      ).rejects.toThrow('Goal not found');
    });
  });

  describe('updateProgress', () => {
    it('should update goal progress', async () => {
      (prisma.goal.findFirst as Mock).mockResolvedValue(mockGoal);
      (prisma.goal.update as Mock).mockResolvedValue({
        ...mockGoal,
        progress: 75,
      });
      (prisma.goalProgress.create as Mock).mockResolvedValue({
        id: 'progress-123',
        goalId: 'goal-123',
        progress: 75,
        note: 'Good progress',
      });

      const result = await goalsService.updateProgress(
        'goal-123',
        mockUser.tenantId,
        mockUser.id,
        75,
        'Good progress'
      );

      expect(result.progress).toBe(75);
      expect(prisma.goalProgress.create).toHaveBeenCalled();
    });

    it('should auto-complete goal when progress reaches 100', async () => {
      (prisma.goal.findFirst as Mock).mockResolvedValue(mockGoal);
      (prisma.goal.update as Mock).mockResolvedValue({
        ...mockGoal,
        progress: 100,
        status: 'COMPLETED',
      });
      (prisma.goalProgress.create as Mock).mockResolvedValue({});

      const result = await goalsService.updateProgress(
        'goal-123',
        mockUser.tenantId,
        mockUser.id,
        100
      );

      expect(result.status).toBe('COMPLETED');
    });

    it('should validate progress is between 0 and 100', async () => {
      await expect(
        goalsService.updateProgress(
          'goal-123',
          mockUser.tenantId,
          mockUser.id,
          150
        )
      ).rejects.toThrow('Progress must be between 0 and 100');

      await expect(
        goalsService.updateProgress(
          'goal-123',
          mockUser.tenantId,
          mockUser.id,
          -10
        )
      ).rejects.toThrow('Progress must be between 0 and 100');
    });
  });

  describe('deleteGoal', () => {
    it('should delete goal', async () => {
      (prisma.goal.findFirst as Mock).mockResolvedValue(mockGoal);
      (prisma.goal.delete as Mock).mockResolvedValue(mockGoal);

      await goalsService.deleteGoal('goal-123', mockUser.tenantId, mockUser.id);

      expect(prisma.goal.delete).toHaveBeenCalledWith({
        where: { id: 'goal-123' },
      });
    });

    it('should throw error when deleting non-existent goal', async () => {
      (prisma.goal.findFirst as Mock).mockResolvedValue(null);

      await expect(
        goalsService.deleteGoal('non-existent', mockUser.tenantId, mockUser.id)
      ).rejects.toThrow('Goal not found');
    });
  });
});
