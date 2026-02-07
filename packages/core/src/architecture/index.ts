/**
 * Architecture Module Exports
 *
 * Clean Architecture, DDD, CQRS, Event-Driven, and Observability
 */

// Domain-Driven Design
export * from './domain';

// CQRS (Command Query Responsibility Segregation)
export * from './cqrs';

// Explicit Error Domains
export * from './errors';

// Event-Driven Architecture
export * from './events';

// Typed API Architecture
export * from './api';

// Observability (Logging, Metrics, Tracing, Health)
export * from './observability';

// Re-export key types for convenience
export type {
  // Domain types
  ValueObject,
  Entity,
  AggregateRoot,
  DomainEvent,
  Result,
  Specification,
  Repository,
  UnitOfWork,
} from './domain';

export type {
  // CQRS types
  Command,
  CommandHandler,
  CommandBus,
  Query,
  QueryHandler,
  QueryBus,
  EventStore,
  Projection,
  Saga,
  Mediator,
} from './cqrs';

export type {
  // Error types
  DomainError,
  ValidationError,
  BusinessRuleError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from './errors';

export type {
  // Event types
  EventBus,
  EventSubscriber,
  EventOutbox,
} from './events';

export type {
  // API types
  APIRequest,
  APIResponse,
  APIEndpoint,
  APIMiddleware,
} from './api';

export type {
  // Observability types
  Logger,
  MetricsRegistry,
  Tracer,
  Span,
  HealthCheck,
  HealthReport,
} from './observability';
