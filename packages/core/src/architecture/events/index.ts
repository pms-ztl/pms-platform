/**
 * Event-Driven Architecture
 *
 * Comprehensive event system for async communication,
 * audit trails, and eventual consistency.
 */

import { DomainEvent, EventMetadata, UniqueEntityId } from '../domain';
import { Result } from '../domain';

// ============================================================================
// EVENT TYPES - Performance Management Domain Events
// ============================================================================

// Goal Events
export class GoalCreatedEvent implements DomainEvent {
  readonly eventType = 'GOAL_CREATED';
  readonly eventId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      title: string;
      description: string;
      ownerId: string;
      parentGoalId?: string;
      type: 'OKR' | 'SMART' | 'KPI';
      targetDate: Date;
      weight: number;
    },
    public readonly metadata: EventMetadata
  ) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredOn = new Date();
  }
}

export class GoalProgressUpdatedEvent implements DomainEvent {
  readonly eventType = 'GOAL_PROGRESS_UPDATED';
  readonly eventId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      previousProgress: number;
      newProgress: number;
      updateSource: 'MANUAL' | 'INTEGRATION' | 'CALCULATED';
      notes?: string;
    },
    public readonly metadata: EventMetadata
  ) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredOn = new Date();
  }
}

export class GoalCompletedEvent implements DomainEvent {
  readonly eventType = 'GOAL_COMPLETED';
  readonly eventId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      completedAt: Date;
      finalProgress: number;
      outcome: 'ACHIEVED' | 'PARTIALLY_ACHIEVED' | 'NOT_ACHIEVED';
    },
    public readonly metadata: EventMetadata
  ) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredOn = new Date();
  }
}

// Review Events
export class ReviewCycleCreatedEvent implements DomainEvent {
  readonly eventType = 'REVIEW_CYCLE_CREATED';
  readonly eventId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      name: string;
      type: 'ANNUAL' | 'QUARTERLY' | 'PROJECT' | 'PROBATION';
      startDate: Date;
      endDate: Date;
      participantCount: number;
    },
    public readonly metadata: EventMetadata
  ) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredOn = new Date();
  }
}

export class ReviewCycleLaunchedEvent implements DomainEvent {
  readonly eventType = 'REVIEW_CYCLE_LAUNCHED';
  readonly eventId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      launchedAt: Date;
      reviewCount: number;
      deadlines: {
        selfReview: Date;
        managerReview: Date;
        calibration: Date;
        sharing: Date;
      };
    },
    public readonly metadata: EventMetadata
  ) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredOn = new Date();
  }
}

export class ReviewSubmittedEvent implements DomainEvent {
  readonly eventType = 'REVIEW_SUBMITTED';
  readonly eventId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      cycleId: string;
      revieweeId: string;
      reviewerId: string;
      reviewType: 'SELF' | 'MANAGER' | 'PEER' | 'UPWARD';
      rating?: number;
    },
    public readonly metadata: EventMetadata
  ) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredOn = new Date();
  }
}

export class ReviewRatingCalibratedEvent implements DomainEvent {
  readonly eventType = 'REVIEW_RATING_CALIBRATED';
  readonly eventId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      sessionId: string;
      previousRating: number;
      newRating: number;
      justification: string;
      calibratorId: string;
    },
    public readonly metadata: EventMetadata
  ) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredOn = new Date();
  }
}

export class ReviewSharedEvent implements DomainEvent {
  readonly eventType = 'REVIEW_SHARED';
  readonly eventId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      sharedAt: Date;
      sharedBy: string;
      revieweeId: string;
      acknowledgedAt?: Date;
    },
    public readonly metadata: EventMetadata
  ) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredOn = new Date();
  }
}

// Feedback Events
export class FeedbackGivenEvent implements DomainEvent {
  readonly eventType = 'FEEDBACK_GIVEN';
  readonly eventId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      fromId: string;
      toId: string;
      type: 'PRAISE' | 'CONSTRUCTIVE' | 'REQUEST';
      visibility: 'PRIVATE' | 'MANAGER_VISIBLE' | 'PUBLIC';
      isAnonymous: boolean;
      skillTags: string[];
      valueTags: string[];
    },
    public readonly metadata: EventMetadata
  ) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredOn = new Date();
  }
}

// Calibration Events
export class CalibrationSessionStartedEvent implements DomainEvent {
  readonly eventType = 'CALIBRATION_SESSION_STARTED';
  readonly eventId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      cycleId: string;
      facilitatorId: string;
      participantIds: string[];
      reviewsInScope: number;
    },
    public readonly metadata: EventMetadata
  ) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredOn = new Date();
  }
}

export class CalibrationSessionCompletedEvent implements DomainEvent {
  readonly eventType = 'CALIBRATION_SESSION_COMPLETED';
  readonly eventId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      completedAt: Date;
      ratingsChanged: number;
      averageRatingChange: number;
      duration: number; // minutes
    },
    public readonly metadata: EventMetadata
  ) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredOn = new Date();
  }
}

// Bias Detection Events
export class BiasAlertTriggeredEvent implements DomainEvent {
  readonly eventType = 'BIAS_ALERT_TRIGGERED';
  readonly eventId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      biasType: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      sourceType: 'REVIEW' | 'FEEDBACK' | 'CALIBRATION' | 'GOAL';
      sourceId: string;
      details: Record<string, unknown>;
    },
    public readonly metadata: EventMetadata
  ) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredOn = new Date();
  }
}

// Employee Events
export class EmployeePromotedEvent implements DomainEvent {
  readonly eventType = 'EMPLOYEE_PROMOTED';
  readonly eventId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      previousLevel: number;
      newLevel: number;
      previousRole: string;
      newRole: string;
      effectiveDate: Date;
      justification: string;
    },
    public readonly metadata: EventMetadata
  ) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredOn = new Date();
  }
}

// ============================================================================
// EVENT BUS - Async event distribution
// ============================================================================

export interface EventSubscriber<T extends DomainEvent = DomainEvent> {
  readonly subscriberName: string;
  readonly eventTypes: string[];
  handle(event: T): Promise<void>;
}

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
  subscribe(subscriber: EventSubscriber): void;
  unsubscribe(subscriberName: string): void;
}

export class InMemoryEventBus implements EventBus {
  private subscribers: Map<string, EventSubscriber[]> = new Map();
  private allSubscribers: EventSubscriber[] = [];
  private deadLetterQueue: Array<{ event: DomainEvent; error: Error; timestamp: Date }> = [];

  subscribe(subscriber: EventSubscriber): void {
    if (subscriber.eventTypes.includes('*')) {
      this.allSubscribers.push(subscriber);
    } else {
      for (const eventType of subscriber.eventTypes) {
        if (!this.subscribers.has(eventType)) {
          this.subscribers.set(eventType, []);
        }
        this.subscribers.get(eventType)!.push(subscriber);
      }
    }
  }

  unsubscribe(subscriberName: string): void {
    for (const [eventType, subs] of this.subscribers) {
      this.subscribers.set(
        eventType,
        subs.filter(s => s.subscriberName !== subscriberName)
      );
    }
    this.allSubscribers = this.allSubscribers.filter(s => s.subscriberName !== subscriberName);
  }

  async publish(event: DomainEvent): Promise<void> {
    const specificSubscribers = this.subscribers.get(event.eventType) || [];
    const allHandlers = [...specificSubscribers, ...this.allSubscribers];

    await Promise.all(
      allHandlers.map(async subscriber => {
        try {
          await subscriber.handle(event);
        } catch (error) {
          this.deadLetterQueue.push({
            event,
            error: error as Error,
            timestamp: new Date(),
          });
          console.error(`Event handler ${subscriber.subscriberName} failed:`, error);
        }
      })
    );
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    await Promise.all(events.map(event => this.publish(event)));
  }

  getDeadLetterQueue(): Array<{ event: DomainEvent; error: Error; timestamp: Date }> {
    return [...this.deadLetterQueue];
  }

  clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
  }
}

// ============================================================================
// OUTBOX PATTERN - Reliable event publishing
// ============================================================================

export interface OutboxMessage {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: Record<string, unknown>;
  metadata: EventMetadata;
  createdAt: Date;
  processedAt?: Date;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  retryCount: number;
  error?: string;
}

export interface EventOutbox {
  store(event: DomainEvent): Promise<void>;
  storeAll(events: DomainEvent[]): Promise<void>;
  getPending(limit: number): Promise<OutboxMessage[]>;
  markProcessed(id: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  getFailedMessages(): Promise<OutboxMessage[]>;
  retryFailed(id: string): Promise<void>;
}

export class InMemoryEventOutbox implements EventOutbox {
  private messages: Map<string, OutboxMessage> = new Map();

  async store(event: DomainEvent): Promise<void> {
    const message: OutboxMessage = {
      id: event.eventId,
      aggregateId: event.aggregateId,
      aggregateType: event.metadata.tenantId, // Would be actual aggregate type in production
      eventType: event.eventType,
      payload: event.payload,
      metadata: event.metadata,
      createdAt: event.occurredOn,
      status: 'PENDING',
      retryCount: 0,
    };
    this.messages.set(message.id, message);
  }

  async storeAll(events: DomainEvent[]): Promise<void> {
    await Promise.all(events.map(event => this.store(event)));
  }

  async getPending(limit: number): Promise<OutboxMessage[]> {
    const pending: OutboxMessage[] = [];
    for (const message of this.messages.values()) {
      if (message.status === 'PENDING' && pending.length < limit) {
        pending.push(message);
      }
    }
    return pending.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async markProcessed(id: string): Promise<void> {
    const message = this.messages.get(id);
    if (message) {
      message.status = 'PROCESSED';
      message.processedAt = new Date();
    }
  }

  async markFailed(id: string, error: string): Promise<void> {
    const message = this.messages.get(id);
    if (message) {
      message.status = 'FAILED';
      message.error = error;
      message.retryCount++;
    }
  }

  async getFailedMessages(): Promise<OutboxMessage[]> {
    const failed: OutboxMessage[] = [];
    for (const message of this.messages.values()) {
      if (message.status === 'FAILED') {
        failed.push(message);
      }
    }
    return failed;
  }

  async retryFailed(id: string): Promise<void> {
    const message = this.messages.get(id);
    if (message && message.status === 'FAILED') {
      message.status = 'PENDING';
      message.error = undefined;
    }
  }
}

// ============================================================================
// OUTBOX PROCESSOR - Background event publishing
// ============================================================================

export class OutboxProcessor {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  constructor(
    private outbox: EventOutbox,
    private eventBus: EventBus,
    private options: {
      batchSize: number;
      pollIntervalMs: number;
      maxRetries: number;
    } = { batchSize: 100, pollIntervalMs: 1000, maxRetries: 3 }
  ) {}

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.intervalId = setInterval(
      () => this.processOutbox(),
      this.options.pollIntervalMs
    );
  }

  stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private async processOutbox(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const messages = await this.outbox.getPending(this.options.batchSize);

      for (const message of messages) {
        try {
          const event: DomainEvent = {
            eventId: message.id,
            aggregateId: message.aggregateId,
            eventType: message.eventType,
            payload: message.payload,
            metadata: message.metadata,
            occurredOn: message.createdAt,
          };

          await this.eventBus.publish(event);
          await this.outbox.markProcessed(message.id);
        } catch (error) {
          if (message.retryCount < this.options.maxRetries) {
            await this.outbox.markFailed(message.id, (error as Error).message);
          } else {
            console.error(`Message ${message.id} exceeded max retries`);
          }
        }
      }
    } catch (error) {
      console.error('Error processing outbox:', error);
    }
  }
}

// ============================================================================
// EVENT REPLAY - For projections and debugging
// ============================================================================

export interface EventReplayOptions {
  fromDate?: Date;
  toDate?: Date;
  eventTypes?: string[];
  aggregateId?: string;
  limit?: number;
}

export interface EventReplayer {
  replay(options: EventReplayOptions, handler: (event: DomainEvent) => Promise<void>): Promise<number>;
}

export class InMemoryEventReplayer implements EventReplayer {
  private events: DomainEvent[] = [];

  addEvent(event: DomainEvent): void {
    this.events.push(event);
  }

  async replay(
    options: EventReplayOptions,
    handler: (event: DomainEvent) => Promise<void>
  ): Promise<number> {
    let filtered = this.events;

    if (options.fromDate) {
      filtered = filtered.filter(e => e.occurredOn >= options.fromDate!);
    }
    if (options.toDate) {
      filtered = filtered.filter(e => e.occurredOn <= options.toDate!);
    }
    if (options.eventTypes?.length) {
      filtered = filtered.filter(e => options.eventTypes!.includes(e.eventType));
    }
    if (options.aggregateId) {
      filtered = filtered.filter(e => e.aggregateId === options.aggregateId);
    }
    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    let count = 0;
    for (const event of filtered) {
      await handler(event);
      count++;
    }

    return count;
  }
}

// ============================================================================
// EVENT SOURCED AGGREGATE - State from events
// ============================================================================

export abstract class EventSourcedAggregate<TState> {
  protected state: TState;
  private uncommittedEvents: DomainEvent[] = [];
  private version: number = 0;

  constructor(
    public readonly id: string,
    protected readonly initialState: TState
  ) {
    this.state = { ...initialState };
  }

  get currentVersion(): number {
    return this.version;
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  clearUncommittedEvents(): void {
    this.uncommittedEvents = [];
  }

  protected apply(event: DomainEvent): void {
    this.state = this.evolve(this.state, event);
    this.uncommittedEvents.push(event);
    this.version++;
  }

  loadFromHistory(events: DomainEvent[]): void {
    for (const event of events) {
      this.state = this.evolve(this.state, event);
      this.version++;
    }
  }

  protected abstract evolve(state: TState, event: DomainEvent): TState;
}

// ============================================================================
// INTEGRATION EVENT - Cross-bounded context communication
// ============================================================================

export interface IntegrationEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredOn: Date;
  readonly source: string;
  readonly version: string;
  readonly payload: Record<string, unknown>;
}

export class BaseIntegrationEvent implements IntegrationEvent {
  readonly eventId: string;
  readonly occurredOn: Date;

  constructor(
    public readonly eventType: string,
    public readonly source: string,
    public readonly version: string,
    public readonly payload: Record<string, unknown>
  ) {
    this.eventId = `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredOn = new Date();
  }
}

// ============================================================================
// EVENT SERIALIZATION
// ============================================================================

export interface EventSerializer {
  serialize(event: DomainEvent): string;
  deserialize(data: string): DomainEvent;
}

export class JSONEventSerializer implements EventSerializer {
  serialize(event: DomainEvent): string {
    return JSON.stringify({
      ...event,
      occurredOn: event.occurredOn.toISOString(),
    });
  }

  deserialize(data: string): DomainEvent {
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      occurredOn: new Date(parsed.occurredOn),
    };
  }
}

// Export event types
export type EventTypes =
  | GoalCreatedEvent
  | GoalProgressUpdatedEvent
  | GoalCompletedEvent
  | ReviewCycleCreatedEvent
  | ReviewCycleLaunchedEvent
  | ReviewSubmittedEvent
  | ReviewRatingCalibratedEvent
  | ReviewSharedEvent
  | FeedbackGivenEvent
  | CalibrationSessionStartedEvent
  | CalibrationSessionCompletedEvent
  | BiasAlertTriggeredEvent
  | EmployeePromotedEvent;
