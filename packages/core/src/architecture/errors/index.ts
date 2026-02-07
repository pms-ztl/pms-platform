/**
 * Explicit Error Domain Architecture
 *
 * Type-safe, structured error handling across the application.
 */

// ============================================================================
// BASE ERROR TYPES
// ============================================================================

export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  BUSINESS_RULE = 'BUSINESS_RULE',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  UNKNOWN = 'UNKNOWN',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ErrorContext {
  tenantId?: string;
  userId?: string;
  correlationId?: string;
  requestId?: string;
  aggregateId?: string;
  aggregateType?: string;
  operation?: string;
  timestamp: Date;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
}

export interface DomainErrorProps {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context?: Partial<ErrorContext>;
  cause?: Error;
  recoverable: boolean;
  retryable: boolean;
  details?: Record<string, unknown>;
}

// ============================================================================
// DOMAIN ERROR BASE CLASS
// ============================================================================

export class DomainError extends Error {
  readonly code: string;
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly context: ErrorContext;
  readonly cause?: Error;
  readonly recoverable: boolean;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(props: DomainErrorProps) {
    super(props.message);
    this.name = 'DomainError';
    this.code = props.code;
    this.category = props.category;
    this.severity = props.severity;
    this.context = {
      ...props.context,
      timestamp: props.context?.timestamp || new Date(),
      stackTrace: this.stack,
    };
    this.cause = props.cause;
    this.recoverable = props.recoverable;
    this.retryable = props.retryable;
    this.details = props.details;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainError);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      context: {
        ...this.context,
        stackTrace: undefined, // Don't expose in JSON by default
      },
      recoverable: this.recoverable,
      retryable: this.retryable,
      details: this.details,
    };
  }

  static fromJSON(json: Record<string, unknown>): DomainError {
    return new DomainError({
      code: json.code as string,
      message: json.message as string,
      category: json.category as ErrorCategory,
      severity: json.severity as ErrorSeverity,
      context: json.context as Partial<ErrorContext>,
      recoverable: json.recoverable as boolean,
      retryable: json.retryable as boolean,
      details: json.details as Record<string, unknown>,
    });
  }
}

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

export interface ValidationErrorField {
  field: string;
  message: string;
  code: string;
  value?: unknown;
  constraints?: Record<string, string>;
}

export class ValidationError extends DomainError {
  readonly fields: ValidationErrorField[];

  constructor(
    message: string,
    fields: ValidationErrorField[],
    context?: Partial<ErrorContext>
  ) {
    super({
      code: 'VALIDATION_ERROR',
      message,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      context,
      recoverable: true,
      retryable: false,
      details: { fields },
    });
    this.name = 'ValidationError';
    this.fields = fields;
  }

  static field(field: string, message: string, code: string = 'INVALID_FIELD'): ValidationError {
    return new ValidationError(`Validation failed for field: ${field}`, [
      { field, message, code },
    ]);
  }

  static required(field: string): ValidationError {
    return new ValidationError(`Required field missing: ${field}`, [
      { field, message: `${field} is required`, code: 'REQUIRED' },
    ]);
  }

  static invalidFormat(field: string, expectedFormat: string): ValidationError {
    return new ValidationError(`Invalid format for field: ${field}`, [
      {
        field,
        message: `${field} must be in format: ${expectedFormat}`,
        code: 'INVALID_FORMAT',
        constraints: { format: expectedFormat },
      },
    ]);
  }

  static outOfRange(field: string, min: number, max: number, actual: number): ValidationError {
    return new ValidationError(`Value out of range for field: ${field}`, [
      {
        field,
        message: `${field} must be between ${min} and ${max}`,
        code: 'OUT_OF_RANGE',
        value: actual,
        constraints: { min: String(min), max: String(max) },
      },
    ]);
  }
}

// ============================================================================
// BUSINESS RULE ERRORS
// ============================================================================

export class BusinessRuleError extends DomainError {
  readonly ruleName: string;

  constructor(
    ruleName: string,
    message: string,
    context?: Partial<ErrorContext>,
    details?: Record<string, unknown>
  ) {
    super({
      code: `BUSINESS_RULE_${ruleName.toUpperCase()}`,
      message,
      category: ErrorCategory.BUSINESS_RULE,
      severity: ErrorSeverity.MEDIUM,
      context,
      recoverable: true,
      retryable: false,
      details,
    });
    this.name = 'BusinessRuleError';
    this.ruleName = ruleName;
  }
}

// Performance Management Specific Business Rule Errors
export class ReviewCycleError extends BusinessRuleError {
  static notActive(cycleId: string): ReviewCycleError {
    return new ReviewCycleError(
      'REVIEW_CYCLE_NOT_ACTIVE',
      `Review cycle ${cycleId} is not active`,
      { aggregateId: cycleId, aggregateType: 'ReviewCycle' }
    );
  }

  static alreadySubmitted(reviewId: string): ReviewCycleError {
    return new ReviewCycleError(
      'REVIEW_ALREADY_SUBMITTED',
      `Review ${reviewId} has already been submitted`,
      { aggregateId: reviewId, aggregateType: 'Review' }
    );
  }

  static deadlinePassed(cycleId: string, deadline: Date): ReviewCycleError {
    return new ReviewCycleError(
      'DEADLINE_PASSED',
      `Deadline for cycle ${cycleId} has passed`,
      { aggregateId: cycleId, aggregateType: 'ReviewCycle' },
      { deadline: deadline.toISOString() }
    );
  }

  static calibrationRequired(cycleId: string): ReviewCycleError {
    return new ReviewCycleError(
      'CALIBRATION_REQUIRED',
      `Reviews in cycle ${cycleId} must be calibrated before sharing`,
      { aggregateId: cycleId, aggregateType: 'ReviewCycle' }
    );
  }
}

export class GoalError extends BusinessRuleError {
  static invalidProgress(goalId: string, progress: number): GoalError {
    return new GoalError(
      'INVALID_GOAL_PROGRESS',
      `Goal progress must be between 0 and 100, got ${progress}`,
      { aggregateId: goalId, aggregateType: 'Goal' },
      { progress }
    );
  }

  static cyclicalDependency(goalId: string, parentId: string): GoalError {
    return new GoalError(
      'CYCLICAL_GOAL_DEPENDENCY',
      `Goal ${goalId} cannot have ${parentId} as parent (would create cycle)`,
      { aggregateId: goalId, aggregateType: 'Goal' },
      { parentId }
    );
  }

  static maxDepthExceeded(goalId: string, maxDepth: number): GoalError {
    return new GoalError(
      'MAX_GOAL_DEPTH_EXCEEDED',
      `Goal hierarchy cannot exceed ${maxDepth} levels`,
      { aggregateId: goalId, aggregateType: 'Goal' },
      { maxDepth }
    );
  }
}

export class CalibrationError extends BusinessRuleError {
  static sessionClosed(sessionId: string): CalibrationError {
    return new CalibrationError(
      'CALIBRATION_SESSION_CLOSED',
      `Calibration session ${sessionId} is closed`,
      { aggregateId: sessionId, aggregateType: 'CalibrationSession' }
    );
  }

  static ratingChangeNotAllowed(
    reviewId: string,
    reason: string
  ): CalibrationError {
    return new CalibrationError(
      'RATING_CHANGE_NOT_ALLOWED',
      `Rating change not allowed for review ${reviewId}: ${reason}`,
      { aggregateId: reviewId, aggregateType: 'Review' },
      { reason }
    );
  }

  static justificationRequired(): CalibrationError {
    return new CalibrationError(
      'JUSTIFICATION_REQUIRED',
      'Calibration rating changes require justification'
    );
  }
}

export class FeedbackError extends BusinessRuleError {
  static anonymousNotAllowed(context: string): FeedbackError {
    return new FeedbackError(
      'ANONYMOUS_FEEDBACK_NOT_ALLOWED',
      `Anonymous feedback is not allowed in this context: ${context}`
    );
  }

  static selfFeedbackNotAllowed(): FeedbackError {
    return new FeedbackError(
      'SELF_FEEDBACK_NOT_ALLOWED',
      'Cannot give feedback to yourself'
    );
  }

  static feedbackLocked(feedbackId: string): FeedbackError {
    return new FeedbackError(
      'FEEDBACK_LOCKED',
      `Feedback ${feedbackId} is locked and cannot be modified`,
      { aggregateId: feedbackId, aggregateType: 'Feedback' }
    );
  }
}

// ============================================================================
// NOT FOUND ERRORS
// ============================================================================

export class NotFoundError extends DomainError {
  readonly entityType: string;
  readonly entityId: string;

  constructor(entityType: string, entityId: string, context?: Partial<ErrorContext>) {
    super({
      code: `${entityType.toUpperCase()}_NOT_FOUND`,
      message: `${entityType} with id ${entityId} not found`,
      category: ErrorCategory.NOT_FOUND,
      severity: ErrorSeverity.LOW,
      context: {
        ...context,
        aggregateId: entityId,
        aggregateType: entityType,
      },
      recoverable: false,
      retryable: false,
      details: { entityType, entityId },
    });
    this.name = 'NotFoundError';
    this.entityType = entityType;
    this.entityId = entityId;
  }

  static employee(id: string): NotFoundError {
    return new NotFoundError('Employee', id);
  }

  static review(id: string): NotFoundError {
    return new NotFoundError('Review', id);
  }

  static goal(id: string): NotFoundError {
    return new NotFoundError('Goal', id);
  }

  static reviewCycle(id: string): NotFoundError {
    return new NotFoundError('ReviewCycle', id);
  }

  static calibrationSession(id: string): NotFoundError {
    return new NotFoundError('CalibrationSession', id);
  }

  static feedback(id: string): NotFoundError {
    return new NotFoundError('Feedback', id);
  }

  static tenant(id: string): NotFoundError {
    return new NotFoundError('Tenant', id);
  }
}

// ============================================================================
// AUTHORIZATION ERRORS
// ============================================================================

export class UnauthorizedError extends DomainError {
  constructor(
    message: string = 'Authentication required',
    context?: Partial<ErrorContext>
  ) {
    super({
      code: 'UNAUTHORIZED',
      message,
      category: ErrorCategory.UNAUTHORIZED,
      severity: ErrorSeverity.MEDIUM,
      context,
      recoverable: true,
      retryable: false,
    });
    this.name = 'UnauthorizedError';
  }

  static invalidToken(): UnauthorizedError {
    return new UnauthorizedError('Invalid or expired authentication token');
  }

  static sessionExpired(): UnauthorizedError {
    return new UnauthorizedError('Session has expired, please log in again');
  }

  static mfaRequired(): UnauthorizedError {
    return new UnauthorizedError('Multi-factor authentication required');
  }
}

export class ForbiddenError extends DomainError {
  readonly requiredPermission?: string;
  readonly requiredRole?: string;

  constructor(
    message: string = 'Access denied',
    options?: {
      requiredPermission?: string;
      requiredRole?: string;
      context?: Partial<ErrorContext>;
    }
  ) {
    super({
      code: 'FORBIDDEN',
      message,
      category: ErrorCategory.FORBIDDEN,
      severity: ErrorSeverity.MEDIUM,
      context: options?.context,
      recoverable: false,
      retryable: false,
      details: {
        requiredPermission: options?.requiredPermission,
        requiredRole: options?.requiredRole,
      },
    });
    this.name = 'ForbiddenError';
    this.requiredPermission = options?.requiredPermission;
    this.requiredRole = options?.requiredRole;
  }

  static insufficientPermission(permission: string): ForbiddenError {
    return new ForbiddenError(
      `Insufficient permission: ${permission} required`,
      { requiredPermission: permission }
    );
  }

  static roleRequired(role: string): ForbiddenError {
    return new ForbiddenError(
      `Role required: ${role}`,
      { requiredRole: role }
    );
  }

  static crossTenantAccess(): ForbiddenError {
    return new ForbiddenError('Cross-tenant access is not allowed');
  }

  static resourceOwnershipRequired(resourceType: string): ForbiddenError {
    return new ForbiddenError(
      `You must be the owner of this ${resourceType} to perform this action`
    );
  }
}

// ============================================================================
// CONFLICT ERRORS
// ============================================================================

export class ConflictError extends DomainError {
  constructor(
    message: string,
    context?: Partial<ErrorContext>,
    details?: Record<string, unknown>
  ) {
    super({
      code: 'CONFLICT',
      message,
      category: ErrorCategory.CONFLICT,
      severity: ErrorSeverity.MEDIUM,
      context,
      recoverable: true,
      retryable: true,
      details,
    });
    this.name = 'ConflictError';
  }

  static optimisticConcurrency(
    entityType: string,
    entityId: string,
    expectedVersion: number,
    actualVersion: number
  ): ConflictError {
    return new ConflictError(
      `Concurrency conflict on ${entityType} ${entityId}: expected version ${expectedVersion}, got ${actualVersion}`,
      { aggregateId: entityId, aggregateType: entityType },
      { expectedVersion, actualVersion }
    );
  }

  static duplicateEntity(entityType: string, key: string, value: string): ConflictError {
    return new ConflictError(
      `${entityType} with ${key} '${value}' already exists`,
      { aggregateType: entityType },
      { key, value }
    );
  }

  static stateConflict(
    entityType: string,
    entityId: string,
    currentState: string,
    requiredState: string
  ): ConflictError {
    return new ConflictError(
      `${entityType} ${entityId} is in state '${currentState}', expected '${requiredState}'`,
      { aggregateId: entityId, aggregateType: entityType },
      { currentState, requiredState }
    );
  }
}

// ============================================================================
// EXTERNAL SERVICE ERRORS
// ============================================================================

export class ExternalServiceError extends DomainError {
  readonly serviceName: string;
  readonly statusCode?: number;
  readonly responseBody?: unknown;

  constructor(
    serviceName: string,
    message: string,
    options?: {
      statusCode?: number;
      responseBody?: unknown;
      cause?: Error;
      context?: Partial<ErrorContext>;
    }
  ) {
    super({
      code: `EXTERNAL_SERVICE_${serviceName.toUpperCase()}_ERROR`,
      message,
      category: ErrorCategory.EXTERNAL_SERVICE,
      severity: ErrorSeverity.HIGH,
      context: options?.context,
      cause: options?.cause,
      recoverable: true,
      retryable: true,
      details: {
        serviceName,
        statusCode: options?.statusCode,
      },
    });
    this.name = 'ExternalServiceError';
    this.serviceName = serviceName;
    this.statusCode = options?.statusCode;
    this.responseBody = options?.responseBody;
  }

  static timeout(serviceName: string, timeoutMs: number): ExternalServiceError {
    return new ExternalServiceError(
      serviceName,
      `Request to ${serviceName} timed out after ${timeoutMs}ms`
    );
  }

  static connectionFailed(serviceName: string, cause?: Error): ExternalServiceError {
    return new ExternalServiceError(
      serviceName,
      `Failed to connect to ${serviceName}`,
      { cause }
    );
  }

  static rateLimited(serviceName: string, retryAfter?: number): ExternalServiceError {
    return new ExternalServiceError(
      serviceName,
      `Rate limited by ${serviceName}`,
      { statusCode: 429 }
    );
  }
}

// ============================================================================
// INFRASTRUCTURE ERRORS
// ============================================================================

export class InfrastructureError extends DomainError {
  readonly component: string;

  constructor(
    component: string,
    message: string,
    options?: {
      cause?: Error;
      context?: Partial<ErrorContext>;
    }
  ) {
    super({
      code: `INFRASTRUCTURE_${component.toUpperCase()}_ERROR`,
      message,
      category: ErrorCategory.INFRASTRUCTURE,
      severity: ErrorSeverity.CRITICAL,
      context: options?.context,
      cause: options?.cause,
      recoverable: false,
      retryable: true,
    });
    this.name = 'InfrastructureError';
    this.component = component;
  }

  static database(message: string, cause?: Error): InfrastructureError {
    return new InfrastructureError('DATABASE', message, { cause });
  }

  static cache(message: string, cause?: Error): InfrastructureError {
    return new InfrastructureError('CACHE', message, { cause });
  }

  static messageQueue(message: string, cause?: Error): InfrastructureError {
    return new InfrastructureError('MESSAGE_QUEUE', message, { cause });
  }

  static fileStorage(message: string, cause?: Error): InfrastructureError {
    return new InfrastructureError('FILE_STORAGE', message, { cause });
  }
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

export function isRecoverableError(error: unknown): boolean {
  if (isDomainError(error)) {
    return error.recoverable;
  }
  return false;
}

export function isRetryableError(error: unknown): boolean {
  if (isDomainError(error)) {
    return error.retryable;
  }
  return false;
}

export function toHttpStatus(error: DomainError): number {
  switch (error.category) {
    case ErrorCategory.VALIDATION:
      return 400;
    case ErrorCategory.BUSINESS_RULE:
      return 422;
    case ErrorCategory.NOT_FOUND:
      return 404;
    case ErrorCategory.UNAUTHORIZED:
      return 401;
    case ErrorCategory.FORBIDDEN:
      return 403;
    case ErrorCategory.CONFLICT:
      return 409;
    case ErrorCategory.EXTERNAL_SERVICE:
      return 502;
    case ErrorCategory.INFRASTRUCTURE:
      return 503;
    default:
      return 500;
  }
}

export function wrapError(error: unknown, context?: Partial<ErrorContext>): DomainError {
  if (isDomainError(error)) {
    return error;
  }

  const err = error instanceof Error ? error : new Error(String(error));
  return new DomainError({
    code: 'UNKNOWN_ERROR',
    message: err.message,
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.HIGH,
    context: {
      ...context,
      stackTrace: err.stack,
    },
    cause: err,
    recoverable: false,
    retryable: false,
  });
}

// ============================================================================
// ERROR AGGREGATION
// ============================================================================

export class AggregateError extends DomainError {
  readonly errors: DomainError[];

  constructor(errors: DomainError[], context?: Partial<ErrorContext>) {
    const message = `Multiple errors occurred: ${errors.map(e => e.message).join('; ')}`;
    const highestSeverity = errors.reduce((max, e) => {
      const severities = [ErrorSeverity.LOW, ErrorSeverity.MEDIUM, ErrorSeverity.HIGH, ErrorSeverity.CRITICAL];
      return severities.indexOf(e.severity) > severities.indexOf(max) ? e.severity : max;
    }, ErrorSeverity.LOW);

    super({
      code: 'AGGREGATE_ERROR',
      message,
      category: ErrorCategory.UNKNOWN,
      severity: highestSeverity,
      context,
      recoverable: errors.every(e => e.recoverable),
      retryable: errors.some(e => e.retryable),
      details: { errorCount: errors.length },
    });
    this.name = 'AggregateError';
    this.errors = errors;
  }
}

// Export all error types
export {
  DomainError as default,
};
