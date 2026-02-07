/**
 * CQRS (Command Query Responsibility Segregation) Architecture
 *
 * Separates read and write operations for optimal scalability and clarity.
 */

import { Result, DomainEvent, EventMetadata, UniqueEntityId } from '../domain';

// ============================================================================
// COMMAND HANDLING - Write operations
// ============================================================================

export interface Command {
  readonly commandId: string;
  readonly commandType: string;
  readonly timestamp: Date;
  readonly metadata: CommandMetadata;
}

export interface CommandMetadata {
  tenantId: string;
  userId: string;
  correlationId: string;
  causationId?: string;
  idempotencyKey: string;
}

export abstract class BaseCommand implements Command {
  readonly commandId: string;
  readonly timestamp: Date;
  abstract readonly commandType: string;

  constructor(public readonly metadata: CommandMetadata) {
    this.commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
  }
}

export interface CommandHandler<TCommand extends Command, TResult = void> {
  readonly handlerName: string;
  handle(command: TCommand): Promise<Result<TResult>>;
}

export interface CommandBus {
  dispatch<TResult>(command: Command): Promise<Result<TResult>>;
  register<TCommand extends Command>(
    commandType: string,
    handler: CommandHandler<TCommand, unknown>
  ): void;
}

// Command Bus Implementation
export class InMemoryCommandBus implements CommandBus {
  private handlers: Map<string, CommandHandler<Command, unknown>> = new Map();
  private middlewares: CommandMiddleware[] = [];
  private idempotencyStore: Map<string, unknown> = new Map();

  addMiddleware(middleware: CommandMiddleware): void {
    this.middlewares.push(middleware);
  }

  register<TCommand extends Command>(
    commandType: string,
    handler: CommandHandler<TCommand, unknown>
  ): void {
    this.handlers.set(commandType, handler as CommandHandler<Command, unknown>);
  }

  async dispatch<TResult>(command: Command): Promise<Result<TResult>> {
    // Idempotency check
    const idempotencyKey = command.metadata.idempotencyKey;
    if (this.idempotencyStore.has(idempotencyKey)) {
      return Result.ok(this.idempotencyStore.get(idempotencyKey) as TResult);
    }

    const handler = this.handlers.get(command.commandType);
    if (!handler) {
      return Result.fail(`No handler registered for command: ${command.commandType}`);
    }

    // Execute middleware pipeline
    let context: CommandContext = { command, metadata: {} };
    for (const middleware of this.middlewares) {
      const middlewareResult = await middleware.before(context);
      if (middlewareResult.isFailure) {
        return Result.fail(middlewareResult.getError()) as Result<TResult>;
      }
      context = middlewareResult.getValue();
    }

    // Execute handler
    const result = await handler.handle(command) as Result<TResult>;

    // Store result for idempotency
    if (result.isSuccess) {
      this.idempotencyStore.set(idempotencyKey, result.getValue());

      // Execute after middleware
      for (const middleware of this.middlewares.reverse()) {
        await middleware.after(context, result);
      }
    }

    return result;
  }

  // Clear idempotency cache (for testing or periodic cleanup)
  clearIdempotencyCache(): void {
    this.idempotencyStore.clear();
  }
}

export interface CommandContext {
  command: Command;
  metadata: Record<string, unknown>;
}

export interface CommandMiddleware {
  before(context: CommandContext): Promise<Result<CommandContext>>;
  after(context: CommandContext, result: Result<unknown>): Promise<void>;
}

// ============================================================================
// QUERY HANDLING - Read operations
// ============================================================================

export interface Query {
  readonly queryId: string;
  readonly queryType: string;
  readonly timestamp: Date;
  readonly metadata: QueryMetadata;
}

export interface QueryMetadata {
  tenantId: string;
  userId: string;
  correlationId: string;
  cacheKey?: string;
  cacheTTL?: number;
}

export abstract class BaseQuery implements Query {
  readonly queryId: string;
  readonly timestamp: Date;
  abstract readonly queryType: string;

  constructor(public readonly metadata: QueryMetadata) {
    this.queryId = `qry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
  }
}

export interface QueryHandler<TQuery extends Query, TResult> {
  readonly handlerName: string;
  handle(query: TQuery): Promise<Result<TResult>>;
}

export interface QueryBus {
  dispatch<TResult>(query: Query): Promise<Result<TResult>>;
  register<TQuery extends Query, TResult>(
    queryType: string,
    handler: QueryHandler<TQuery, TResult>
  ): void;
}

// Query Bus Implementation with Caching
export class InMemoryQueryBus implements QueryBus {
  private handlers: Map<string, QueryHandler<Query, unknown>> = new Map();
  private cache: QueryCache;

  constructor(cache?: QueryCache) {
    this.cache = cache || new InMemoryQueryCache();
  }

  register<TQuery extends Query, TResult>(
    queryType: string,
    handler: QueryHandler<TQuery, TResult>
  ): void {
    this.handlers.set(queryType, handler as QueryHandler<Query, unknown>);
  }

  async dispatch<TResult>(query: Query): Promise<Result<TResult>> {
    // Check cache
    if (query.metadata.cacheKey) {
      const cached = await this.cache.get<TResult>(query.metadata.cacheKey);
      if (cached !== null) {
        return Result.ok(cached);
      }
    }

    const handler = this.handlers.get(query.queryType);
    if (!handler) {
      return Result.fail(`No handler registered for query: ${query.queryType}`);
    }

    const result = await handler.handle(query) as Result<TResult>;

    // Store in cache
    if (result.isSuccess && query.metadata.cacheKey) {
      await this.cache.set(
        query.metadata.cacheKey,
        result.getValue(),
        query.metadata.cacheTTL || 300000 // 5 minutes default
      );
    }

    return result;
  }
}

export interface QueryCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl: number): Promise<void>;
  invalidate(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}

class InMemoryQueryCache implements QueryCache {
  private cache: Map<string, { value: unknown; expiresAt: number }> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  async invalidate(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

// ============================================================================
// EVENT SOURCING - State reconstruction from events
// ============================================================================

export interface EventStore {
  append(
    streamId: string,
    events: DomainEvent[],
    expectedVersion: number
  ): Promise<Result<void>>;

  getEvents(
    streamId: string,
    fromVersion?: number,
    toVersion?: number
  ): Promise<DomainEvent[]>;

  getSnapshot(streamId: string): Promise<AggregateSnapshot | null>;

  saveSnapshot(snapshot: AggregateSnapshot): Promise<void>;
}

export interface AggregateSnapshot {
  streamId: string;
  version: number;
  state: Record<string, unknown>;
  createdAt: Date;
}

// In-Memory Event Store Implementation
export class InMemoryEventStore implements EventStore {
  private streams: Map<string, DomainEvent[]> = new Map();
  private snapshots: Map<string, AggregateSnapshot> = new Map();

  async append(
    streamId: string,
    events: DomainEvent[],
    expectedVersion: number
  ): Promise<Result<void>> {
    const existingEvents = this.streams.get(streamId) || [];
    const currentVersion = existingEvents.length;

    // Optimistic concurrency check
    if (currentVersion !== expectedVersion) {
      return Result.fail(
        `Concurrency conflict: expected version ${expectedVersion}, got ${currentVersion}`
      );
    }

    this.streams.set(streamId, [...existingEvents, ...events]);
    return Result.ok();
  }

  async getEvents(
    streamId: string,
    fromVersion: number = 0,
    toVersion?: number
  ): Promise<DomainEvent[]> {
    const events = this.streams.get(streamId) || [];
    const endVersion = toVersion ?? events.length;
    return events.slice(fromVersion, endVersion);
  }

  async getSnapshot(streamId: string): Promise<AggregateSnapshot | null> {
    return this.snapshots.get(streamId) || null;
  }

  async saveSnapshot(snapshot: AggregateSnapshot): Promise<void> {
    this.snapshots.set(snapshot.streamId, snapshot);
  }
}

// ============================================================================
// READ MODEL PROJECTIONS - Optimized query models
// ============================================================================

export interface Projection<TState> {
  readonly projectionName: string;
  readonly initialState: TState;
  apply(state: TState, event: DomainEvent): TState;
}

export interface ProjectionManager {
  register<TState>(projection: Projection<TState>): void;
  start(): Promise<void>;
  stop(): Promise<void>;
  rebuild(projectionName: string): Promise<void>;
}

export class InMemoryProjectionManager implements ProjectionManager {
  private projections: Map<string, Projection<unknown>> = new Map();
  private states: Map<string, unknown> = new Map();
  private eventSubscriptions: Map<string, ((event: DomainEvent) => void)[]> = new Map();

  register<TState>(projection: Projection<TState>): void {
    this.projections.set(projection.projectionName, projection);
    this.states.set(projection.projectionName, projection.initialState);
  }

  async start(): Promise<void> {
    // Subscribe to domain events
    for (const [name, projection] of this.projections) {
      const handler = (event: DomainEvent) => {
        const currentState = this.states.get(name);
        const newState = projection.apply(currentState, event);
        this.states.set(name, newState);
      };

      if (!this.eventSubscriptions.has(name)) {
        this.eventSubscriptions.set(name, []);
      }
      this.eventSubscriptions.get(name)!.push(handler);
    }
  }

  async stop(): Promise<void> {
    this.eventSubscriptions.clear();
  }

  async rebuild(projectionName: string): Promise<void> {
    const projection = this.projections.get(projectionName);
    if (!projection) {
      throw new Error(`Projection not found: ${projectionName}`);
    }
    this.states.set(projectionName, projection.initialState);
  }

  getState<TState>(projectionName: string): TState | undefined {
    return this.states.get(projectionName) as TState | undefined;
  }

  handleEvent(event: DomainEvent): void {
    for (const [name, projection] of this.projections) {
      const currentState = this.states.get(name);
      const newState = projection.apply(currentState, event);
      this.states.set(name, newState);
    }
  }
}

// ============================================================================
// SAGA / PROCESS MANAGER - Long-running processes
// ============================================================================

export interface Saga<TState> {
  readonly sagaName: string;
  readonly initialState: TState;
  handle(state: TState, event: DomainEvent): SagaResult<TState>;
}

export interface SagaResult<TState> {
  state: TState;
  commands: Command[];
  isComplete: boolean;
}

export class SagaManager {
  private sagas: Map<string, Saga<unknown>> = new Map();
  private instances: Map<string, { sagaName: string; state: unknown }> = new Map();
  private commandBus: CommandBus;

  constructor(commandBus: CommandBus) {
    this.commandBus = commandBus;
  }

  register<TState>(saga: Saga<TState>): void {
    this.sagas.set(saga.sagaName, saga);
  }

  async handleEvent(correlationId: string, event: DomainEvent): Promise<void> {
    for (const [sagaName, saga] of this.sagas) {
      const instanceKey = `${sagaName}:${correlationId}`;

      let instance = this.instances.get(instanceKey);
      if (!instance) {
        instance = { sagaName, state: saga.initialState };
      }

      const result = saga.handle(instance.state, event);

      if (result.isComplete) {
        this.instances.delete(instanceKey);
      } else {
        this.instances.set(instanceKey, { sagaName, state: result.state });
      }

      // Dispatch commands
      for (const command of result.commands) {
        await this.commandBus.dispatch(command);
      }
    }
  }
}

// ============================================================================
// MEDIATOR PATTERN - Unified request handling
// ============================================================================

export interface Mediator {
  send<TResult>(request: Command | Query): Promise<Result<TResult>>;
  publish(event: DomainEvent): Promise<void>;
}

export class CQRSMediator implements Mediator {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
    private eventPublisher: EventPublisher
  ) {}

  async send<TResult>(request: Command | Query): Promise<Result<TResult>> {
    if ('commandType' in request) {
      return this.commandBus.dispatch<TResult>(request as Command);
    }
    return this.queryBus.dispatch<TResult>(request as Query);
  }

  async publish(event: DomainEvent): Promise<void> {
    await this.eventPublisher.publish(event);
  }
}

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void;
}

export class InMemoryEventPublisher implements EventPublisher {
  private handlers: Map<string, Array<(event: DomainEvent) => Promise<void>>> = new Map();

  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) || [];
    const allHandlers = [...handlers, ...(this.handlers.get('*') || [])];

    await Promise.all(allHandlers.map(handler => handler(event)));
  }
}

// Export types
export type {
  Command,
  CommandMetadata,
  CommandHandler,
  CommandBus,
  CommandMiddleware,
  Query,
  QueryMetadata,
  QueryHandler,
  QueryBus,
  QueryCache,
  EventStore,
  AggregateSnapshot,
  Projection,
  ProjectionManager,
  Saga,
  SagaResult,
  Mediator,
  EventPublisher,
};
