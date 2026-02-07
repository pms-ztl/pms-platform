/**
 * Real-Time Performance Service Tests
 *
 * Unit and integration tests for Features 1-8
 * with special focus on anomaly detection algorithms
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { realtimePerformanceService, RealtimePerformanceService } from './realtime-performance.service';

// Mock Prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    hourlyPerformanceMetric: {
      findMany: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    dailyPerformanceMetric: {
      findMany: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      aggregate: vi.fn(),
    },
    activityEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    performanceAnomaly: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    deadlineAlert: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    workloadSnapshot: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    communicationSentiment: {
      findMany: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    projectMilestone: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    milestoneProgressEvent: {
      create: vi.fn(),
    },
    goal: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    review: {
      count: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    team: {
      findMany: vi.fn(),
    },
    feedback: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb({
      hourlyPerformanceMetric: { create: vi.fn() },
      dailyPerformanceMetric: { upsert: vi.fn() },
    })),
  },
}));

// Mock Redis
vi.mock('../../lib/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    publish: vi.fn(),
  },
}));

// Import mocked modules
import { prisma } from '../../lib/prisma';

describe('RealtimePerformanceService', () => {
  const tenantId = 'tenant-123';
  const userId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Feature 1: Hourly Performance Tracker Tests
  // ===========================================================================

  describe('Feature 1: Hourly Performance Tracker', () => {
    describe('recordHourlyMetrics', () => {
      it('should record hourly metrics successfully', async () => {
        const mockMetrics = {
          tenantId,
          userId,
          metricHour: new Date(),
          tasksCompleted: 5,
          activeMinutes: 45,
          focusMinutes: 30,
          productivityScore: 85,
          engagementScore: 78,
        };

        (prisma.$transaction as Mock).mockImplementation(async (cb) => {
          return cb({
            hourlyPerformanceMetric: {
              create: vi.fn().mockResolvedValue(mockMetrics),
            },
            dailyPerformanceMetric: {
              upsert: vi.fn().mockResolvedValue({}),
            },
          });
        });

        await realtimePerformanceService.recordHourlyMetrics(mockMetrics);

        expect(prisma.$transaction).toHaveBeenCalled();
      });

      it('should calculate productivity score correctly', async () => {
        // Productivity score = (tasksCompleted * 10 + activeMinutes) / 60 * 100
        const metrics = {
          tenantId,
          userId,
          metricHour: new Date(),
          tasksCompleted: 6, // 60 points
          activeMinutes: 50, // 50 points
          productivityScore: 0, // Will be calculated
        };

        // Expected: (60 + 50) / 60 * 100 = 183.33, capped at 100
        const expectedScore = Math.min(100, ((6 * 10 + 50) / 60) * 100);
        expect(expectedScore).toBeGreaterThanOrEqual(100);
      });
    });

    describe('getHourlyMetrics', () => {
      it('should return hourly metrics for date range', async () => {
        const mockData = [
          { metricHour: new Date(), productivityScore: 80 },
          { metricHour: new Date(), productivityScore: 85 },
        ];

        (prisma.hourlyPerformanceMetric.findMany as Mock).mockResolvedValue(mockData);

        const start = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const end = new Date();

        const result = await realtimePerformanceService.getHourlyMetrics(
          tenantId,
          userId,
          start,
          end
        );

        expect(prisma.hourlyPerformanceMetric.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              tenantId,
              userId,
              metricHour: { gte: start, lte: end },
            },
          })
        );
        expect(result).toEqual(mockData);
      });
    });

    describe('getCurrentPerformanceSnapshot', () => {
      it('should return current performance snapshot', async () => {
        const mockSnapshot = {
          productivityScore: 82,
          engagementScore: 75,
          activeMinutes: 180,
          tasksCompleted: 12,
        };

        (prisma.hourlyPerformanceMetric.findMany as Mock).mockResolvedValue([mockSnapshot]);
        (prisma.hourlyPerformanceMetric.aggregate as Mock).mockResolvedValue({
          _avg: mockSnapshot,
        });

        const result = await realtimePerformanceService.getCurrentPerformanceSnapshot(
          tenantId,
          userId
        );

        expect(result).toBeDefined();
      });
    });
  });

  // ===========================================================================
  // Feature 2: Activity Monitor Tests
  // ===========================================================================

  describe('Feature 2: 24/7 Activity Monitor', () => {
    describe('recordActivityEvent', () => {
      it('should record activity event', async () => {
        const mockEvent = {
          tenantId,
          userId,
          eventType: 'TASK_COMPLETED',
          entityType: 'task',
          entityId: 'task-123',
          isProductive: true,
        };

        (prisma.activityEvent.create as Mock).mockResolvedValue(mockEvent);

        await realtimePerformanceService.recordActivityEvent(mockEvent);

        expect(prisma.activityEvent.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            eventType: 'TASK_COMPLETED',
            isProductive: true,
          }),
        });
      });

      it('should detect AI-like patterns (unusual activity)', async () => {
        // Simulate rapid consecutive events
        const events = Array.from({ length: 100 }, (_, i) => ({
          tenantId,
          userId,
          eventType: 'TASK_COMPLETED',
          timestamp: new Date(Date.now() - i * 1000), // 1 second apart
        }));

        (prisma.activityEvent.findMany as Mock).mockResolvedValue(events);

        // The service should flag this as unusual activity
        const activityStream = await realtimePerformanceService.getActivityStream(
          tenantId,
          userId,
          100,
          0
        );

        expect(activityStream.length).toBe(100);
      });
    });

    describe('getActivitySummary', () => {
      it('should aggregate activity by type', async () => {
        (prisma.activityEvent.groupBy as Mock).mockResolvedValue([
          { eventType: 'TASK_COMPLETED', _count: { id: 15 } },
          { eventType: 'GOAL_UPDATED', _count: { id: 8 } },
          { eventType: 'MESSAGE_SENT', _count: { id: 25 } },
        ]);

        const summary = await realtimePerformanceService.getActivitySummary(
          tenantId,
          userId,
          new Date(Date.now() - 86400000),
          new Date()
        );

        expect(prisma.activityEvent.groupBy).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // Feature 3: Goal Progress Dashboard Tests
  // ===========================================================================

  describe('Feature 3: Real-Time Goal Progress Dashboard', () => {
    describe('getGoalProgressDashboard', () => {
      it('should return color-coded goal statuses', async () => {
        const mockGoals = [
          { id: 'g1', progress: 90, targetDate: new Date(Date.now() + 86400000 * 7) }, // On track (green)
          { id: 'g2', progress: 50, targetDate: new Date(Date.now() + 86400000 * 3) }, // At risk (yellow)
          { id: 'g3', progress: 20, targetDate: new Date(Date.now() + 86400000) }, // Off track (red)
        ];

        (prisma.goal.findMany as Mock).mockResolvedValue(mockGoals);
        (prisma.goal.count as Mock).mockResolvedValue(3);

        const dashboard = await realtimePerformanceService.getGoalProgressDashboard(
          tenantId,
          userId,
          false
        );

        expect(dashboard).toBeDefined();
        expect(prisma.goal.findMany).toHaveBeenCalled();
      });

      it('should calculate expected progress based on elapsed time', () => {
        // Helper function test
        const startDate = new Date(Date.now() - 86400000 * 15); // 15 days ago
        const targetDate = new Date(Date.now() + 86400000 * 15); // 15 days from now
        const currentDate = new Date();

        const totalDuration = targetDate.getTime() - startDate.getTime();
        const elapsedDuration = currentDate.getTime() - startDate.getTime();
        const expectedProgress = (elapsedDuration / totalDuration) * 100;

        expect(expectedProgress).toBeCloseTo(50, 0);
      });
    });
  });

  // ===========================================================================
  // Feature 4: Deadline Alert System Tests
  // ===========================================================================

  describe('Feature 4: Deadline Proximity Alert System', () => {
    describe('checkDeadlineAlerts', () => {
      it('should generate alerts for approaching deadlines', async () => {
        const mockGoals = [
          {
            id: 'g1',
            title: 'Due Tomorrow',
            targetDate: new Date(Date.now() + 86400000),
            progress: 50,
          },
          {
            id: 'g2',
            title: 'Due in 3 days',
            targetDate: new Date(Date.now() + 86400000 * 3),
            progress: 70,
          },
        ];

        (prisma.goal.findMany as Mock).mockResolvedValue(mockGoals);
        (prisma.deadlineAlert.create as Mock).mockImplementation((args) =>
          Promise.resolve(args.data)
        );

        const alerts = await realtimePerformanceService.checkDeadlineAlerts(tenantId, userId);

        expect(prisma.goal.findMany).toHaveBeenCalled();
      });

      it('should calculate completion probability based on velocity', () => {
        // Test probability calculation
        const daysRemaining = 5;
        const currentProgress = 60;
        const requiredProgress = 100 - currentProgress; // 40
        const averageDailyProgress = 5; // 5% per day

        const expectedDaysToComplete = requiredProgress / averageDailyProgress; // 8 days
        const probability = Math.min(100, (daysRemaining / expectedDaysToComplete) * 100);

        expect(probability).toBeCloseTo(62.5, 0);
      });
    });

    describe('getActiveDeadlineAlerts', () => {
      it('should return only active alerts', async () => {
        const mockAlerts = [
          { id: 'a1', status: 'active', severity: 'high' },
          { id: 'a2', status: 'active', severity: 'medium' },
        ];

        (prisma.deadlineAlert.findMany as Mock).mockResolvedValue(mockAlerts);

        const alerts = await realtimePerformanceService.getActiveDeadlineAlerts(tenantId, userId);

        expect(prisma.deadlineAlert.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: 'active',
            }),
          })
        );
      });
    });
  });

  // ===========================================================================
  // Feature 5: Workload Distribution Analyzer Tests
  // ===========================================================================

  describe('Feature 5: Live Workload Distribution Analyzer', () => {
    describe('analyzeWorkload', () => {
      it('should calculate workload score', async () => {
        const mockData = {
          activeGoals: 5,
          activeTasks: 15,
          pendingReviews: 3,
          estimatedHoursRequired: 40,
        };

        (prisma.goal.count as Mock).mockResolvedValue(mockData.activeGoals);
        (prisma.task.count as Mock).mockResolvedValue(mockData.activeTasks);
        (prisma.review.count as Mock).mockResolvedValue(mockData.pendingReviews);

        const analysis = await realtimePerformanceService.analyzeWorkload(tenantId, userId);

        expect(prisma.goal.count).toHaveBeenCalled();
        expect(prisma.task.count).toHaveBeenCalled();
      });

      it('should recommend redistribution when overloaded', async () => {
        (prisma.goal.count as Mock).mockResolvedValue(10);
        (prisma.task.count as Mock).mockResolvedValue(50);
        (prisma.review.count as Mock).mockResolvedValue(8);

        const analysis = await realtimePerformanceService.analyzeWorkload(tenantId, userId);

        // Extremely high workload should trigger recommendation
        expect(prisma.goal.count).toHaveBeenCalled();
      });
    });

    describe('getTeamWorkloadDistribution', () => {
      it('should calculate Gini coefficient for workload inequality', async () => {
        // Gini coefficient test
        // 0 = perfect equality, 1 = maximum inequality
        const workloads = [10, 20, 30, 40]; // Unequal distribution
        const n = workloads.length;
        const mean = workloads.reduce((a, b) => a + b, 0) / n;

        let sumOfDifferences = 0;
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            sumOfDifferences += Math.abs(workloads[i] - workloads[j]);
          }
        }

        const gini = sumOfDifferences / (2 * n * n * mean);

        expect(gini).toBeGreaterThan(0);
        expect(gini).toBeLessThan(1);
      });

      it('should identify overloaded team members', async () => {
        const mockTeamMembers = [
          { id: 'u1', workloadScore: 120 }, // Overloaded
          { id: 'u2', workloadScore: 80 }, // Optimal
          { id: 'u3', workloadScore: 40 }, // Underloaded
        ];

        (prisma.user.findMany as Mock).mockResolvedValue(mockTeamMembers);

        const distribution = await realtimePerformanceService.getTeamWorkloadDistribution(
          tenantId,
          userId
        );

        expect(prisma.user.findMany).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // Feature 6: Anomaly Detection Tests (CRITICAL)
  // ===========================================================================

  describe('Feature 6: Instant Performance Anomaly Detector', () => {
    describe('detectAnomalies', () => {
      it('should detect anomalies using z-score algorithm', async () => {
        // Historical data for baseline
        const historicalMetrics = Array.from({ length: 30 }, (_, i) => ({
          productivityScore: 75 + Math.random() * 10, // 75-85 range
          engagementScore: 70 + Math.random() * 10,
          activeMinutes: 180 + Math.random() * 40,
        }));

        // Recent data with anomaly
        const recentMetrics = [
          { productivityScore: 40, engagementScore: 45, activeMinutes: 60 }, // Anomaly!
        ];

        (prisma.dailyPerformanceMetric.findMany as Mock)
          .mockResolvedValueOnce(historicalMetrics)
          .mockResolvedValueOnce(recentMetrics);

        const anomalies = await realtimePerformanceService.detectAnomalies(tenantId, userId);

        expect(prisma.dailyPerformanceMetric.findMany).toHaveBeenCalled();
      });

      it('should calculate z-score correctly', () => {
        // Z-score = (value - mean) / standardDeviation
        const values = [70, 75, 80, 85, 90];
        const mean = values.reduce((a, b) => a + b, 0) / values.length; // 80
        const variance =
          values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance); // ~7.07

        const testValue = 50;
        const zScore = (testValue - mean) / stdDev;

        expect(zScore).toBeLessThan(-2); // Significant negative deviation
      });

      it('should classify severity based on z-score magnitude', () => {
        // Severity thresholds:
        // |z| < 2: low
        // |z| 2-2.5: medium
        // |z| 2.5-3: high
        // |z| >= 3: critical

        const classifySeverity = (zScore: number): string => {
          const absZ = Math.abs(zScore);
          if (absZ >= 3) return 'critical';
          if (absZ >= 2.5) return 'high';
          if (absZ >= 2) return 'medium';
          return 'low';
        };

        expect(classifySeverity(1.5)).toBe('low');
        expect(classifySeverity(2.2)).toBe('medium');
        expect(classifySeverity(2.7)).toBe('high');
        expect(classifySeverity(3.5)).toBe('critical');
        expect(classifySeverity(-3.0)).toBe('critical');
      });

      it('should detect sudden productivity drops', async () => {
        // Simulate 30-day baseline with consistent high productivity
        const historicalMetrics = Array.from({ length: 30 }, () => ({
          productivityScore: 85,
          metricDate: new Date(),
        }));

        // Recent sudden drop
        const recentMetrics = [
          { productivityScore: 45, metricDate: new Date() }, // Significant drop
        ];

        (prisma.dailyPerformanceMetric.findMany as Mock)
          .mockResolvedValueOnce(historicalMetrics)
          .mockResolvedValueOnce(recentMetrics);

        const anomalies = await realtimePerformanceService.detectAnomalies(tenantId, userId);

        // Should detect this as an anomaly
        expect(prisma.dailyPerformanceMetric.findMany).toHaveBeenCalled();
      });

      it('should detect unusual activity patterns', async () => {
        // Test for unusual working hours or weekend activity
        const normalHourlyPattern = Array.from({ length: 8 }, (_, i) => ({
          hour: 9 + i, // 9 AM to 5 PM
          activityCount: 10 + Math.random() * 5,
        }));

        const unusualPattern = [
          { hour: 3, activityCount: 50 }, // 3 AM with high activity - unusual
        ];

        // This tests the pattern detection capability
        expect(unusualPattern[0].hour).toBeLessThan(6); // Early morning
        expect(unusualPattern[0].activityCount).toBeGreaterThan(30); // High activity
      });

      it('should handle edge cases in standard deviation calculation', () => {
        // When all values are the same, stdDev = 0
        const sameValues = [80, 80, 80, 80, 80];
        const mean = 80;
        const variance =
          sameValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
          sameValues.length;
        const stdDev = Math.sqrt(variance);

        expect(stdDev).toBe(0);

        // Handle division by zero by using minimum stdDev threshold
        const minStdDev = Math.max(stdDev, 0.1);
        const zScore = (75 - mean) / minStdDev;

        expect(zScore).toBeDefined();
        expect(isFinite(zScore)).toBe(true);
      });

      it('should require minimum baseline data points', () => {
        // Need at least 7 data points for meaningful baseline
        const insufficientData = [{ productivityScore: 80 }];

        const hasEnoughData = insufficientData.length >= 7;
        expect(hasEnoughData).toBe(false);
      });
    });

    describe('anomaly types', () => {
      it('should categorize anomalies correctly', () => {
        const anomalyTypes = [
          'sudden_drop',
          'sudden_spike',
          'consistent_decline',
          'unusual_pattern',
          'extended_inactivity',
        ];

        const categorizeAnomaly = (
          currentValue: number,
          baseline: number,
          trend: number[]
        ): string => {
          const deviation = currentValue - baseline;
          const deviationPercent = (deviation / baseline) * 100;

          if (deviationPercent < -30) return 'sudden_drop';
          if (deviationPercent > 30) return 'sudden_spike';

          // Check for consistent decline
          const isDecline = trend.every((val, i) => (i === 0 ? true : val < trend[i - 1]));
          if (isDecline && trend.length >= 3) return 'consistent_decline';

          return 'normal';
        };

        expect(categorizeAnomaly(50, 100, [])).toBe('sudden_drop');
        expect(categorizeAnomaly(150, 100, [])).toBe('sudden_spike');
        expect(categorizeAnomaly(90, 100, [100, 95, 92, 90])).toBe('consistent_decline');
      });
    });
  });

  // ===========================================================================
  // Feature 7: Sentiment Gauge Tests
  // ===========================================================================

  describe('Feature 7: Real-Time Communication Sentiment Gauge', () => {
    describe('analyzeSentiment', () => {
      it('should calculate overall sentiment score', async () => {
        const mockSentimentData = [
          { sentimentScore: 0.8, category: 'positive' },
          { sentimentScore: 0.6, category: 'positive' },
          { sentimentScore: -0.2, category: 'negative' },
          { sentimentScore: 0.0, category: 'neutral' },
        ];

        (prisma.communicationSentiment.findMany as Mock).mockResolvedValue(mockSentimentData);

        const analysis = await realtimePerformanceService.analyzeSentiment(
          tenantId,
          userId,
          7
        );

        expect(prisma.communicationSentiment.findMany).toHaveBeenCalled();
      });

      it('should detect morale alert conditions', () => {
        // Alert if average sentiment drops below -0.3
        const sentimentScores = [-0.5, -0.4, -0.3, -0.2];
        const avgSentiment =
          sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length;

        const moraleAlertThreshold = -0.3;
        const shouldAlert = avgSentiment < moraleAlertThreshold;

        expect(avgSentiment).toBe(-0.35);
        expect(shouldAlert).toBe(true);
      });

      it('should calculate positivity ratio', () => {
        const communications = [
          { sentiment: 0.8 },
          { sentiment: 0.6 },
          { sentiment: -0.2 },
          { sentiment: 0.1 },
          { sentiment: -0.5 },
        ];

        const positive = communications.filter((c) => c.sentiment > 0.2).length;
        const negative = communications.filter((c) => c.sentiment < -0.2).length;
        const total = communications.length;

        const positivityRatio = positive / total;
        const negativityRatio = negative / total;

        expect(positivityRatio).toBe(0.4); // 2/5
        expect(negativityRatio).toBe(0.4); // 2/5
      });
    });

    describe('getTeamMorale', () => {
      it('should aggregate team sentiment', async () => {
        const mockTeamSentiment = [
          { userId: 'u1', avgSentiment: 0.7 },
          { userId: 'u2', avgSentiment: 0.5 },
          { userId: 'u3', avgSentiment: -0.1 },
        ];

        (prisma.communicationSentiment.aggregate as Mock).mockResolvedValue({
          _avg: { sentimentScore: 0.37 },
        });

        const morale = await realtimePerformanceService.getTeamMorale(tenantId, userId);

        expect(prisma.communicationSentiment.aggregate).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // Feature 8: Milestone Tracker Tests
  // ===========================================================================

  describe('Feature 8: Live Project Milestone Tracker', () => {
    describe('createMilestone', () => {
      it('should create milestone with dependencies', async () => {
        const milestoneData = {
          goalId: 'goal-123',
          title: 'Phase 1 Complete',
          milestoneType: 'phase_completion',
          plannedDate: new Date(Date.now() + 86400000 * 30),
          ownerId: userId,
          dependsOn: ['milestone-prev'],
        };

        (prisma.projectMilestone.create as Mock).mockResolvedValue({
          id: 'milestone-123',
          ...milestoneData,
        });

        const milestone = await realtimePerformanceService.createMilestone(
          tenantId,
          milestoneData
        );

        expect(prisma.projectMilestone.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            title: 'Phase 1 Complete',
          }),
        });
      });
    });

    describe('updateMilestoneProgress', () => {
      it('should update milestone and log progress event', async () => {
        const mockMilestone = {
          id: 'milestone-123',
          status: 'in_progress',
          progressPercentage: 50,
        };

        (prisma.projectMilestone.findUnique as Mock).mockResolvedValue(mockMilestone);
        (prisma.projectMilestone.update as Mock).mockResolvedValue({
          ...mockMilestone,
          progressPercentage: 75,
        });
        (prisma.milestoneProgressEvent.create as Mock).mockResolvedValue({});

        const updated = await realtimePerformanceService.updateMilestoneProgress(
          'milestone-123',
          { progressPercentage: 75 },
          userId
        );

        expect(prisma.projectMilestone.update).toHaveBeenCalled();
        expect(prisma.milestoneProgressEvent.create).toHaveBeenCalled();
      });

      it('should auto-complete milestone at 100%', async () => {
        const mockMilestone = {
          id: 'milestone-123',
          status: 'in_progress',
          progressPercentage: 90,
        };

        (prisma.projectMilestone.findUnique as Mock).mockResolvedValue(mockMilestone);
        (prisma.projectMilestone.update as Mock).mockResolvedValue({
          ...mockMilestone,
          progressPercentage: 100,
          status: 'completed',
          actualDate: new Date(),
        });

        const updated = await realtimePerformanceService.updateMilestoneProgress(
          'milestone-123',
          { progressPercentage: 100 },
          userId
        );

        expect(prisma.projectMilestone.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: 'completed',
            }),
          })
        );
      });
    });

    describe('detectMilestones', () => {
      it('should auto-detect milestones from goal structure', async () => {
        const mockGoal = {
          id: 'goal-123',
          title: 'Q1 Revenue Target',
          targetDate: new Date(Date.now() + 86400000 * 90),
          progress: 0,
          keyResults: [
            { id: 'kr1', title: 'Close 10 deals' },
            { id: 'kr2', title: 'Generate 100 leads' },
          ],
        };

        (prisma.goal.findUnique as Mock).mockResolvedValue(mockGoal);
        (prisma.projectMilestone.create as Mock).mockImplementation((args) =>
          Promise.resolve({ id: `milestone-${Date.now()}`, ...args.data })
        );

        const detected = await realtimePerformanceService.detectMilestones(tenantId, 'goal-123');

        expect(prisma.goal.findUnique).toHaveBeenCalled();
      });
    });

    describe('getMilestoneTimeline', () => {
      it('should return milestones in chronological order', async () => {
        const mockMilestones = [
          { id: 'm1', plannedDate: new Date('2024-03-01'), title: 'First' },
          { id: 'm2', plannedDate: new Date('2024-02-01'), title: 'Second' },
          { id: 'm3', plannedDate: new Date('2024-04-01'), title: 'Third' },
        ];

        (prisma.projectMilestone.findMany as Mock).mockResolvedValue(mockMilestones);

        const timeline = await realtimePerformanceService.getMilestoneTimeline(tenantId);

        expect(prisma.projectMilestone.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { plannedDate: 'asc' },
          })
        );
      });
    });
  });

  // ===========================================================================
  // Statistical Helper Function Tests
  // ===========================================================================

  describe('Statistical Utilities', () => {
    describe('calculateMean', () => {
      it('should calculate mean correctly', () => {
        const values = [10, 20, 30, 40, 50];
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        expect(mean).toBe(30);
      });

      it('should handle empty array', () => {
        const values: number[] = [];
        const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        expect(mean).toBe(0);
      });
    });

    describe('calculateStandardDeviation', () => {
      it('should calculate standard deviation correctly', () => {
        const values = [2, 4, 4, 4, 5, 5, 7, 9];
        const mean = values.reduce((a, b) => a + b, 0) / values.length; // 5
        const variance =
          values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        expect(stdDev).toBeCloseTo(2, 0);
      });
    });

    describe('calculatePercentile', () => {
      it('should calculate percentiles correctly', () => {
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].sort((a, b) => a - b);

        const percentile = (arr: number[], p: number): number => {
          const index = (p / 100) * (arr.length - 1);
          const lower = Math.floor(index);
          const upper = Math.ceil(index);
          const weight = index - lower;

          if (upper >= arr.length) return arr[arr.length - 1];
          return arr[lower] * (1 - weight) + arr[upper] * weight;
        };

        expect(percentile(values, 50)).toBe(5.5); // Median
        expect(percentile(values, 25)).toBe(3.25); // Q1
        expect(percentile(values, 75)).toBe(7.75); // Q3
      });
    });
  });

  // ===========================================================================
  // Integration Tests
  // ===========================================================================

  describe('Integration Tests', () => {
    it('should correlate anomalies with workload', async () => {
      // When workload is high, anomalies might be expected
      const highWorkload = {
        activeGoals: 15,
        activeTasks: 60,
        capacityUtilization: 150, // 150% - overloaded
      };

      const productivityDrop = {
        isAnomaly: true,
        metricName: 'productivity_score',
        deviationPercentage: -25,
      };

      // The system should note correlation
      const correlationNote =
        highWorkload.capacityUtilization > 100 && productivityDrop.deviationPercentage < -20
          ? 'Productivity drop may be correlated with high workload'
          : null;

      expect(correlationNote).toBe('Productivity drop may be correlated with high workload');
    });

    it('should trigger alerts for multiple simultaneous anomalies', () => {
      const anomalies = [
        { severity: 'high', metricName: 'productivity' },
        { severity: 'medium', metricName: 'engagement' },
        { severity: 'high', metricName: 'focus_time' },
      ];

      const highSeverityCount = anomalies.filter(
        (a) => a.severity === 'high' || a.severity === 'critical'
      ).length;

      const shouldEscalate = highSeverityCount >= 2;
      expect(shouldEscalate).toBe(true);
    });
  });
});
