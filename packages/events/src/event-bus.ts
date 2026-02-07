import { v4 as uuidv4 } from 'uuid';
import type { BaseEvent, EventHandler, EventMetadata, EventPublisher, EventSubscriber, SubscriptionOptions } from './types';

/**
 * In-memory event bus for development and testing
 * In production, replace with Kafka or AWS SQS implementation
 */
export class InMemoryEventBus implements EventPublisher, EventSubscriber {
  private handlers: Map<string, Set<EventHandler<BaseEvent<string, unknown>>>> = new Map();
  private eventLog: BaseEvent<string, unknown>[] = [];

  async publish<E extends BaseEvent<string, unknown>>(event: E): Promise<void> {
    this.eventLog.push(event);

    const handlers = this.handlers.get(event.type);
    if (handlers) {
      const promises = Array.from(handlers).map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          console.error(`Error handling event ${event.type}:`, error);
        }
      });
      await Promise.all(promises);
    }
  }

  async publishBatch<E extends BaseEvent<string, unknown>>(events: E[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  async subscribe<E extends BaseEvent<string, unknown>>(
    eventType: string,
    handler: EventHandler<E>,
    _options?: SubscriptionOptions
  ): Promise<void> {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler<BaseEvent<string, unknown>>);
  }

  async unsubscribe(eventType: string): Promise<void> {
    this.handlers.delete(eventType);
  }

  // For testing purposes
  getEventLog(): BaseEvent<string, unknown>[] {
    return [...this.eventLog];
  }

  clearEventLog(): void {
    this.eventLog = [];
  }
}

/**
 * Creates event metadata with defaults
 */
export function createEventMetadata(
  tenantId: string,
  userId?: string,
  correlationId?: string
): EventMetadata {
  return {
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    version: '1.0',
    source: 'pms-api',
    tenantId,
    userId,
    correlationId: correlationId ?? uuidv4(),
  };
}

/**
 * Creates a typed event
 */
export function createEvent<T extends string, P>(
  type: T,
  payload: P,
  metadata: EventMetadata
): BaseEvent<T, P> {
  return {
    type,
    payload,
    metadata,
  };
}

// Singleton instance for the application
let eventBusInstance: InMemoryEventBus | null = null;

export function getEventBus(): InMemoryEventBus {
  if (!eventBusInstance) {
    eventBusInstance = new InMemoryEventBus();
  }
  return eventBusInstance;
}

// Reset for testing
export function resetEventBus(): void {
  eventBusInstance = null;
}
