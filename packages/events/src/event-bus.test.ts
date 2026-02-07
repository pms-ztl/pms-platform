import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  InMemoryEventBus,
  createEventMetadata,
  createEvent,
} from './event-bus';
import type { BaseEvent } from './types';

describe('InMemoryEventBus', () => {
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    eventBus = new InMemoryEventBus();
  });

  describe('subscribe', () => {
    it('should register a handler for an event type', async () => {
      const handler = vi.fn();
      await eventBus.subscribe('test.event', handler);

      // Verify subscription by publishing an event
      const metadata = createEventMetadata('test-tenant');
      const event = createEvent('test.event', { data: 'test' }, metadata);
      await eventBus.publish(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should allow multiple handlers for same event type', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      await eventBus.subscribe('test.event', handler1);
      await eventBus.subscribe('test.event', handler2);

      const metadata = createEventMetadata('test-tenant');
      const event = createEvent('test.event', { data: 'test' }, metadata);
      await eventBus.publish(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });

    it('should unsubscribe all handlers for event type', async () => {
      const handler = vi.fn();
      await eventBus.subscribe('test.event', handler);

      await eventBus.unsubscribe('test.event');

      const metadata = createEventMetadata('test-tenant');
      const event = createEvent('test.event', { data: 'test' }, metadata);
      await eventBus.publish(event);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('should publish event to all subscribers', async () => {
      const handler = vi.fn();
      await eventBus.subscribe('test.event', handler);

      const metadata = createEventMetadata('tenant-1');
      const event = createEvent('test.event', { message: 'hello' }, metadata);
      await eventBus.publish(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should not call handlers for different event types', async () => {
      const handler = vi.fn();
      await eventBus.subscribe('event.a', handler);

      const metadata = createEventMetadata('tenant-1');
      const event = createEvent('event.b', { data: 'test' }, metadata);
      await eventBus.publish(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle async handlers', async () => {
      const results: number[] = [];
      const asyncHandler = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(1);
      });

      await eventBus.subscribe('async.event', asyncHandler);

      const metadata = createEventMetadata('tenant-1');
      const event = createEvent('async.event', {}, metadata);
      await eventBus.publish(event);

      expect(results).toEqual([1]);
    });

    it('should continue processing if one handler fails', async () => {
      const handler1 = vi.fn().mockRejectedValue(new Error('Handler 1 failed'));
      const handler2 = vi.fn();

      await eventBus.subscribe('test.event', handler1);
      await eventBus.subscribe('test.event', handler2);

      const metadata = createEventMetadata('tenant-1');
      const event = createEvent('test.event', {}, metadata);

      // Should not throw
      await expect(eventBus.publish(event)).resolves.not.toThrow();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('publishBatch', () => {
    it('should publish multiple events', async () => {
      const handler = vi.fn();
      await eventBus.subscribe('batch.event', handler);

      const metadata = createEventMetadata('tenant-1');
      const events = [
        createEvent('batch.event', { id: 1 }, metadata),
        createEvent('batch.event', { id: 2 }, metadata),
        createEvent('batch.event', { id: 3 }, metadata),
      ];

      await eventBus.publishBatch(events);

      expect(handler).toHaveBeenCalledTimes(3);
    });
  });
});

describe('createEventMetadata', () => {
  it('should create metadata with required fields', () => {
    const metadata = createEventMetadata('tenant-123');

    expect(metadata).toHaveProperty('eventId');
    expect(metadata).toHaveProperty('timestamp');
    expect(metadata).toHaveProperty('tenantId', 'tenant-123');
    expect(metadata).toHaveProperty('version', '1.0');
  });

  it('should generate unique IDs', () => {
    const metadata1 = createEventMetadata('tenant-1');
    const metadata2 = createEventMetadata('tenant-1');

    expect(metadata1.eventId).not.toBe(metadata2.eventId);
  });

  it('should allow optional userId', () => {
    const metadata = createEventMetadata('tenant-123', 'user-456');

    expect(metadata.userId).toBe('user-456');
  });

  it('should allow optional correlationId', () => {
    const metadata = createEventMetadata('tenant-123', 'user-456', 'correlation-789');

    expect(metadata.correlationId).toBe('correlation-789');
  });
});

describe('createEvent', () => {
  it('should create event with type and payload', () => {
    const metadata = createEventMetadata('tenant-123');
    const event = createEvent(
      'goal.created',
      { goalId: 'goal-123', title: 'New Goal' },
      metadata
    );

    expect(event.type).toBe('goal.created');
    expect(event.payload).toEqual({ goalId: 'goal-123', title: 'New Goal' });
    expect(event.metadata.tenantId).toBe('tenant-123');
  });

  it('should allow custom metadata fields', () => {
    const metadata = createEventMetadata('tenant-123', 'user-456');
    const event = createEvent(
      'review.submitted',
      { reviewId: 'review-123' },
      metadata
    );

    expect(event.metadata.userId).toBe('user-456');
  });
});

describe('Event Types', () => {
  describe('Goal Events', () => {
    it('should create goal created event', () => {
      const metadata = createEventMetadata('tenant-1');
      const event = createEvent(
        'goal.created',
        {
          goalId: 'goal-123',
          title: 'Increase revenue',
          type: 'INDIVIDUAL',
          ownerId: 'user-123',
        },
        metadata
      );

      expect(event.type).toBe('goal.created');
      expect(event.payload.goalId).toBe('goal-123');
    });

    it('should create goal progress updated event', () => {
      const metadata = createEventMetadata('tenant-1');
      const event = createEvent(
        'goal.progress_updated',
        {
          goalId: 'goal-123',
          previousProgress: 30,
          newProgress: 50,
        },
        metadata
      );

      expect(event.type).toBe('goal.progress_updated');
      expect(event.payload.previousProgress).toBe(30);
      expect(event.payload.newProgress).toBe(50);
    });
  });

  describe('Review Events', () => {
    it('should create review cycle started event', () => {
      const metadata = createEventMetadata('tenant-1');
      const event = createEvent(
        'review.cycle_started',
        {
          cycleId: 'cycle-123',
          name: 'Q1 2024 Review',
          type: 'QUARTERLY',
          participantCount: 50,
        },
        metadata
      );

      expect(event.type).toBe('review.cycle_started');
      expect(event.payload.cycleId).toBe('cycle-123');
    });

    it('should create review submitted event', () => {
      const metadata = createEventMetadata('tenant-1');
      const event = createEvent(
        'review.submitted',
        {
          reviewId: 'review-123',
          cycleId: 'cycle-123',
          reviewerId: 'user-123',
          revieweeId: 'user-456',
          overallRating: 4,
        },
        metadata
      );

      expect(event.type).toBe('review.submitted');
      expect(event.payload.overallRating).toBe(4);
    });
  });

  describe('Feedback Events', () => {
    it('should create feedback given event', () => {
      const metadata = createEventMetadata('tenant-1');
      const event = createEvent(
        'feedback.given',
        {
          feedbackId: 'feedback-123',
          fromUserId: 'user-123',
          toUserId: 'user-456',
          type: 'CONTINUOUS',
          isAnonymous: false,
        },
        metadata
      );

      expect(event.type).toBe('feedback.given');
      expect(event.payload.isAnonymous).toBe(false);
    });

    it('should create recognition given event', () => {
      const metadata = createEventMetadata('tenant-1');
      const event = createEvent(
        'feedback.recognition_given',
        {
          recognitionId: 'recognition-123',
          fromUserId: 'user-123',
          toUserId: 'user-456',
          badge: 'TEAM_PLAYER',
          points: 50,
        },
        metadata
      );

      expect(event.type).toBe('feedback.recognition_given');
      expect(event.payload.badge).toBe('TEAM_PLAYER');
    });
  });

  describe('Calibration Events', () => {
    it('should create calibration session started event', () => {
      const metadata = createEventMetadata('tenant-1');
      const event = createEvent(
        'calibration.session_started',
        {
          sessionId: 'session-123',
          cycleId: 'cycle-123',
          facilitatorId: 'user-123',
          reviewCount: 25,
        },
        metadata
      );

      expect(event.type).toBe('calibration.session_started');
      expect(event.payload.reviewCount).toBe(25);
    });

    it('should create rating adjusted event', () => {
      const metadata = createEventMetadata('tenant-1');
      const event = createEvent(
        'calibration.rating_adjusted',
        {
          sessionId: 'session-123',
          reviewId: 'review-123',
          originalRating: 3,
          adjustedRating: 4,
          reason: 'Consistent with peer performance',
        },
        metadata
      );

      expect(event.type).toBe('calibration.rating_adjusted');
      expect(event.payload.originalRating).toBe(3);
      expect(event.payload.adjustedRating).toBe(4);
    });
  });

  describe('User Events', () => {
    it('should create user created event', () => {
      const metadata = createEventMetadata('tenant-1');
      const event = createEvent(
        'user.created',
        {
          userId: 'user-123',
          email: 'new@example.com',
          role: 'EMPLOYEE',
          departmentId: 'dept-123',
        },
        metadata
      );

      expect(event.type).toBe('user.created');
      expect(event.payload.role).toBe('EMPLOYEE');
    });

    it('should create user login event', () => {
      const metadata = createEventMetadata('tenant-1');
      const event = createEvent(
        'user.logged_in',
        {
          userId: 'user-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          method: 'password',
        },
        metadata
      );

      expect(event.type).toBe('user.logged_in');
      expect(event.payload.method).toBe('password');
    });
  });

  describe('Integration Events', () => {
    it('should create sync started event', () => {
      const metadata = createEventMetadata('tenant-1');
      const event = createEvent(
        'integration.sync_started',
        {
          integrationId: 'integration-123',
          provider: 'workday',
          syncType: 'full',
        },
        metadata
      );

      expect(event.type).toBe('integration.sync_started');
      expect(event.payload.provider).toBe('workday');
    });

    it('should create sync completed event', () => {
      const metadata = createEventMetadata('tenant-1');
      const event = createEvent(
        'integration.sync_completed',
        {
          integrationId: 'integration-123',
          provider: 'workday',
          recordsProcessed: 150,
          recordsFailed: 2,
          duration: 45000,
        },
        metadata
      );

      expect(event.type).toBe('integration.sync_completed');
      expect(event.payload.recordsProcessed).toBe(150);
    });
  });
});
