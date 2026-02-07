import { z } from 'zod';

/**
 * Base event metadata schema
 */
export const EventMetadataSchema = z.object({
  eventId: z.string().uuid(),
  timestamp: z.string().datetime(),
  version: z.string().default('1.0'),
  source: z.string(),
  correlationId: z.string().uuid().optional(),
  causationId: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid().optional(),
});

export type EventMetadata = z.infer<typeof EventMetadataSchema>;

/**
 * Base event interface
 */
export interface BaseEvent<T extends string, P> {
  metadata: EventMetadata;
  type: T;
  payload: P;
}

/**
 * Event handler type
 */
export type EventHandler<E extends BaseEvent<string, unknown>> = (event: E) => Promise<void>;

/**
 * Event subscription options
 */
export interface SubscriptionOptions {
  groupId?: string;
  startFromBeginning?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
}

/**
 * Event publisher interface
 */
export interface EventPublisher {
  publish<E extends BaseEvent<string, unknown>>(event: E): Promise<void>;
  publishBatch<E extends BaseEvent<string, unknown>>(events: E[]): Promise<void>;
}

/**
 * Event subscriber interface
 */
export interface EventSubscriber {
  subscribe<E extends BaseEvent<string, unknown>>(
    eventType: string,
    handler: EventHandler<E>,
    options?: SubscriptionOptions
  ): Promise<void>;
  unsubscribe(eventType: string): Promise<void>;
}

/**
 * Event store interface for event sourcing
 */
export interface EventStore {
  append<E extends BaseEvent<string, unknown>>(
    streamId: string,
    events: E[],
    expectedVersion?: number
  ): Promise<void>;
  read(streamId: string, fromVersion?: number): Promise<BaseEvent<string, unknown>[]>;
  readAll(fromPosition?: number, limit?: number): Promise<BaseEvent<string, unknown>[]>;
}
