/**
 * Typed API Architecture with Versioning
 *
 * Provides strongly-typed API contracts, versioning, and middleware.
 */

import { Result } from '../domain';
import { DomainError, toHttpStatus, ValidationError, ValidationErrorField } from '../errors';

// ============================================================================
// API VERSION MANAGEMENT
// ============================================================================

export interface APIVersion {
  major: number;
  minor: number;
  patch: number;
  status: 'STABLE' | 'BETA' | 'DEPRECATED' | 'SUNSET';
  sunsetDate?: Date;
}

export const API_VERSIONS = {
  V1: { major: 1, minor: 0, patch: 0, status: 'STABLE' as const },
  V2: { major: 2, minor: 0, patch: 0, status: 'BETA' as const },
} as const;

export type APIVersionKey = keyof typeof API_VERSIONS;

export function parseAPIVersion(versionString: string): Result<APIVersion> {
  const match = versionString.match(/^v?(\d+)\.?(\d+)?\.?(\d+)?$/i);
  if (!match) {
    return Result.fail('Invalid version format. Expected: v1, v1.0, or v1.0.0');
  }

  return Result.ok({
    major: parseInt(match[1], 10),
    minor: parseInt(match[2] || '0', 10),
    patch: parseInt(match[3] || '0', 10),
    status: 'STABLE',
  });
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface APIRequest<TBody = unknown, TParams = unknown, TQuery = unknown> {
  // Request identification
  requestId: string;
  correlationId: string;
  timestamp: Date;

  // Authentication context
  auth: AuthContext;

  // Request data
  body: TBody;
  params: TParams;
  query: TQuery;
  headers: Record<string, string>;

  // API version
  version: APIVersion;

  // Idempotency
  idempotencyKey?: string;
}

export interface AuthContext {
  tenantId: string;
  userId: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  isAuthenticated: boolean;
  tokenExpiresAt?: Date;
}

export interface APIResponse<TData = unknown> {
  // Response identification
  requestId: string;
  timestamp: Date;

  // Response status
  success: boolean;
  statusCode: number;

  // Response data
  data?: TData;
  error?: APIErrorResponse;

  // Pagination (if applicable)
  pagination?: PaginationMeta;

  // Metadata
  meta?: ResponseMeta;
}

export interface APIErrorResponse {
  code: string;
  message: string;
  category: string;
  details?: Record<string, unknown>;
  validationErrors?: ValidationErrorField[];
  traceId?: string;
  helpUrl?: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
  previousCursor?: string;
}

export interface ResponseMeta {
  version: string;
  deprecationWarning?: string;
  rateLimit?: RateLimitInfo;
  cacheControl?: CacheControl;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}

export interface CacheControl {
  maxAge: number;
  public: boolean;
  noCache: boolean;
  noStore: boolean;
}

// ============================================================================
// API RESPONSE BUILDERS
// ============================================================================

export class APIResponseBuilder<TData> {
  private response: Partial<APIResponse<TData>> = {
    timestamp: new Date(),
    success: true,
    statusCode: 200,
  };

  static success<T>(data: T): APIResponse<T> {
    return new APIResponseBuilder<T>().withData(data).build();
  }

  static created<T>(data: T): APIResponse<T> {
    return new APIResponseBuilder<T>()
      .withData(data)
      .withStatusCode(201)
      .build();
  }

  static noContent(): APIResponse<void> {
    return new APIResponseBuilder<void>()
      .withStatusCode(204)
      .build();
  }

  static error(error: DomainError, requestId: string): APIResponse<never> {
    return new APIResponseBuilder<never>()
      .withRequestId(requestId)
      .withError(error)
      .build();
  }

  withRequestId(requestId: string): this {
    this.response.requestId = requestId;
    return this;
  }

  withData(data: TData): this {
    this.response.data = data;
    return this;
  }

  withStatusCode(statusCode: number): this {
    this.response.statusCode = statusCode;
    return this;
  }

  withPagination(pagination: PaginationMeta): this {
    this.response.pagination = pagination;
    return this;
  }

  withMeta(meta: ResponseMeta): this {
    this.response.meta = meta;
    return this;
  }

  withError(error: DomainError): this {
    this.response.success = false;
    this.response.statusCode = toHttpStatus(error);
    this.response.error = {
      code: error.code,
      message: error.message,
      category: error.category,
      details: error.details,
      validationErrors: error instanceof ValidationError ? error.fields : undefined,
      traceId: error.context.correlationId,
    };
    return this;
  }

  build(): APIResponse<TData> {
    return {
      requestId: this.response.requestId || '',
      timestamp: this.response.timestamp!,
      success: this.response.success!,
      statusCode: this.response.statusCode!,
      data: this.response.data,
      error: this.response.error,
      pagination: this.response.pagination,
      meta: this.response.meta,
    };
  }
}

// ============================================================================
// API ENDPOINT DEFINITION
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface APIEndpoint<
  TRequest extends APIRequest = APIRequest,
  TResponse = unknown
> {
  // Endpoint identification
  path: string;
  method: HttpMethod;
  version: APIVersionKey;

  // Description
  summary: string;
  description?: string;
  tags: string[];

  // Request/Response schemas
  requestSchema?: object;
  responseSchema?: object;

  // Security
  requiresAuth: boolean;
  permissions?: string[];

  // Rate limiting
  rateLimit?: {
    requests: number;
    windowMs: number;
  };

  // Caching
  cache?: {
    enabled: boolean;
    ttlSeconds: number;
    varyBy?: string[];
  };

  // Idempotency
  idempotent: boolean;

  // Handler
  handler: (request: TRequest) => Promise<APIResponse<TResponse>>;
}

// ============================================================================
// API ROUTER
// ============================================================================

export interface Route {
  path: string;
  method: HttpMethod;
  handler: (request: APIRequest) => Promise<APIResponse>;
  middleware: APIMiddleware[];
  metadata: {
    version: APIVersion;
    requiresAuth: boolean;
    permissions?: string[];
    rateLimit?: { requests: number; windowMs: number };
  };
}

export class APIRouter {
  private routes: Route[] = [];
  private globalMiddleware: APIMiddleware[] = [];

  use(middleware: APIMiddleware): void {
    this.globalMiddleware.push(middleware);
  }

  register<TReq extends APIRequest, TRes>(endpoint: APIEndpoint<TReq, TRes>): void {
    const versionPrefix = `/api/v${API_VERSIONS[endpoint.version].major}`;
    const fullPath = `${versionPrefix}${endpoint.path}`;

    this.routes.push({
      path: fullPath,
      method: endpoint.method,
      handler: endpoint.handler as (request: APIRequest) => Promise<APIResponse>,
      middleware: [],
      metadata: {
        version: API_VERSIONS[endpoint.version],
        requiresAuth: endpoint.requiresAuth,
        permissions: endpoint.permissions,
        rateLimit: endpoint.rateLimit,
      },
    });
  }

  async handle(request: APIRequest): Promise<APIResponse> {
    const route = this.findRoute(request);
    if (!route) {
      return APIResponseBuilder.error(
        new DomainError({
          code: 'ROUTE_NOT_FOUND',
          message: `No route found for ${request.params}`,
          category: 'NOT_FOUND' as any,
          severity: 'LOW' as any,
          recoverable: false,
          retryable: false,
        }),
        request.requestId
      );
    }

    // Execute middleware chain
    const middlewareChain = [...this.globalMiddleware, ...route.middleware];
    let currentRequest = request;

    for (const middleware of middlewareChain) {
      const result = await middleware.before(currentRequest);
      if (result.isFailure) {
        return APIResponseBuilder.error(
          result.getError() as unknown as DomainError,
          request.requestId
        );
      }
      currentRequest = result.getValue();
    }

    // Execute handler
    const response = await route.handler(currentRequest);

    // Execute after middleware in reverse order
    let currentResponse = response;
    for (const middleware of middlewareChain.reverse()) {
      if (middleware.after) {
        currentResponse = await middleware.after(currentRequest, currentResponse);
      }
    }

    return currentResponse;
  }

  private findRoute(request: APIRequest): Route | undefined {
    // Simplified route matching - production would use proper path matching
    return this.routes.find(
      r => r.method === (request.headers['method'] || 'GET')
    );
  }

  getRoutes(): Route[] {
    return [...this.routes];
  }
}

// ============================================================================
// API MIDDLEWARE
// ============================================================================

export interface APIMiddleware {
  name: string;
  before(request: APIRequest): Promise<Result<APIRequest>>;
  after?(request: APIRequest, response: APIResponse): Promise<APIResponse>;
}

// Authentication Middleware
export class AuthenticationMiddleware implements APIMiddleware {
  name = 'authentication';

  async before(request: APIRequest): Promise<Result<APIRequest>> {
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      return Result.ok({
        ...request,
        auth: {
          ...request.auth,
          isAuthenticated: false,
        },
      });
    }

    // Validate token (simplified - would use JWT validation in production)
    const token = authHeader.replace('Bearer ', '');
    if (!token || token.length < 10) {
      return Result.fail('Invalid authentication token');
    }

    return Result.ok({
      ...request,
      auth: {
        ...request.auth,
        isAuthenticated: true,
      },
    });
  }
}

// Authorization Middleware
export class AuthorizationMiddleware implements APIMiddleware {
  name = 'authorization';

  constructor(private requiredPermissions: string[] = []) {}

  async before(request: APIRequest): Promise<Result<APIRequest>> {
    if (!request.auth.isAuthenticated) {
      return Result.fail('Authentication required');
    }

    for (const permission of this.requiredPermissions) {
      if (!request.auth.permissions.includes(permission)) {
        return Result.fail(`Missing required permission: ${permission}`);
      }
    }

    return Result.ok(request);
  }
}

// Rate Limiting Middleware
export class RateLimitMiddleware implements APIMiddleware {
  name = 'rateLimit';
  private requestCounts: Map<string, { count: number; resetAt: Date }> = new Map();

  constructor(
    private requests: number = 100,
    private windowMs: number = 60000
  ) {}

  async before(request: APIRequest): Promise<Result<APIRequest>> {
    const key = `${request.auth.tenantId}:${request.auth.userId}`;
    const now = new Date();

    let entry = this.requestCounts.get(key);
    if (!entry || entry.resetAt < now) {
      entry = {
        count: 0,
        resetAt: new Date(now.getTime() + this.windowMs),
      };
    }

    entry.count++;
    this.requestCounts.set(key, entry);

    if (entry.count > this.requests) {
      return Result.fail('Rate limit exceeded');
    }

    return Result.ok(request);
  }

  async after(request: APIRequest, response: APIResponse): Promise<APIResponse> {
    const key = `${request.auth.tenantId}:${request.auth.userId}`;
    const entry = this.requestCounts.get(key);

    return {
      ...response,
      meta: {
        ...response.meta,
        version: response.meta?.version || '1.0.0',
        rateLimit: entry ? {
          limit: this.requests,
          remaining: Math.max(0, this.requests - entry.count),
          resetAt: entry.resetAt,
        } : undefined,
      },
    };
  }
}

// Request Validation Middleware
export class ValidationMiddleware implements APIMiddleware {
  name = 'validation';

  constructor(private validator: RequestValidator) {}

  async before(request: APIRequest): Promise<Result<APIRequest>> {
    const errors = this.validator.validate(request);
    if (errors.length > 0) {
      return Result.fail(JSON.stringify(errors));
    }
    return Result.ok(request);
  }
}

export interface RequestValidator {
  validate(request: APIRequest): ValidationErrorField[];
}

// Logging Middleware
export class LoggingMiddleware implements APIMiddleware {
  name = 'logging';

  constructor(private logger: Logger) {}

  async before(request: APIRequest): Promise<Result<APIRequest>> {
    this.logger.info('API Request', {
      requestId: request.requestId,
      correlationId: request.correlationId,
      userId: request.auth.userId,
      tenantId: request.auth.tenantId,
      timestamp: request.timestamp.toISOString(),
    });
    return Result.ok(request);
  }

  async after(request: APIRequest, response: APIResponse): Promise<APIResponse> {
    this.logger.info('API Response', {
      requestId: response.requestId,
      statusCode: response.statusCode,
      success: response.success,
      duration: Date.now() - request.timestamp.getTime(),
    });
    return response;
  }
}

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

// ============================================================================
// DTO TYPES - Data Transfer Objects
// ============================================================================

// Goal DTOs
export interface CreateGoalDTO {
  title: string;
  description?: string;
  type: 'OKR' | 'SMART' | 'KPI';
  parentGoalId?: string;
  targetDate: string; // ISO date string
  weight?: number;
  keyResults?: Array<{
    title: string;
    targetValue: number;
    unit: string;
  }>;
}

export interface UpdateGoalDTO {
  title?: string;
  description?: string;
  targetDate?: string;
  weight?: number;
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
}

export interface GoalProgressDTO {
  progress: number;
  notes?: string;
}

export interface GoalResponseDTO {
  id: string;
  title: string;
  description?: string;
  type: 'OKR' | 'SMART' | 'KPI';
  status: string;
  progress: number;
  ownerId: string;
  ownerName: string;
  parentGoalId?: string;
  targetDate: string;
  weight: number;
  keyResults?: Array<{
    id: string;
    title: string;
    currentValue: number;
    targetValue: number;
    unit: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Review DTOs
export interface CreateReviewCycleDTO {
  name: string;
  type: 'ANNUAL' | 'QUARTERLY' | 'PROJECT' | 'PROBATION';
  startDate: string;
  endDate: string;
  config: {
    selfReviewEnabled: boolean;
    peerReviewEnabled: boolean;
    upwardReviewEnabled: boolean;
    reviewTemplateId: string;
    calibrationRequired: boolean;
  };
  participantCriteria?: {
    departments?: string[];
    levels?: number[];
    locations?: string[];
    excludeEmployeeIds?: string[];
  };
}

export interface SubmitReviewDTO {
  responses: Array<{
    questionId: string;
    rating?: number;
    textResponse?: string;
  }>;
  overallRating?: number;
  strengths?: string;
  growthAreas?: string;
  comments?: string;
}

export interface ReviewResponseDTO {
  id: string;
  cycleId: string;
  cycleName: string;
  revieweeId: string;
  revieweeName: string;
  reviewerId: string;
  reviewerName: string;
  type: 'SELF' | 'MANAGER' | 'PEER' | 'UPWARD';
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'CALIBRATED' | 'SHARED';
  rating?: number;
  responses: Array<{
    questionId: string;
    questionText: string;
    rating?: number;
    textResponse?: string;
  }>;
  strengths?: string;
  growthAreas?: string;
  submittedAt?: string;
  sharedAt?: string;
}

// Feedback DTOs
export interface CreateFeedbackDTO {
  toEmployeeId: string;
  type: 'PRAISE' | 'CONSTRUCTIVE' | 'REQUEST';
  content: string;
  visibility: 'PRIVATE' | 'MANAGER_VISIBLE' | 'PUBLIC';
  isAnonymous?: boolean;
  skillTags?: string[];
  valueTags?: string[];
  linkedGoalId?: string;
}

export interface FeedbackResponseDTO {
  id: string;
  fromEmployeeId?: string;
  fromEmployeeName?: string;
  toEmployeeId: string;
  toEmployeeName: string;
  type: 'PRAISE' | 'CONSTRUCTIVE' | 'REQUEST';
  content: string;
  visibility: 'PRIVATE' | 'MANAGER_VISIBLE' | 'PUBLIC';
  isAnonymous: boolean;
  skillTags: string[];
  valueTags: string[];
  createdAt: string;
}

// Pagination DTOs
export interface PaginationQueryDTO {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  cursor?: string;
}

export interface ListResponseDTO<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ============================================================================
// API CONTRACT DEFINITIONS
// ============================================================================

// Goals API Contract
export const GoalsAPI = {
  create: {
    path: '/goals',
    method: 'POST' as HttpMethod,
    version: 'V1' as APIVersionKey,
    summary: 'Create a new goal',
    tags: ['Goals'],
    requiresAuth: true,
    permissions: ['goals:create'],
    idempotent: true,
  },
  get: {
    path: '/goals/:id',
    method: 'GET' as HttpMethod,
    version: 'V1' as APIVersionKey,
    summary: 'Get goal by ID',
    tags: ['Goals'],
    requiresAuth: true,
    permissions: ['goals:read'],
    idempotent: true,
    cache: { enabled: true, ttlSeconds: 60 },
  },
  list: {
    path: '/goals',
    method: 'GET' as HttpMethod,
    version: 'V1' as APIVersionKey,
    summary: 'List goals',
    tags: ['Goals'],
    requiresAuth: true,
    permissions: ['goals:read'],
    idempotent: true,
    cache: { enabled: true, ttlSeconds: 30 },
  },
  update: {
    path: '/goals/:id',
    method: 'PATCH' as HttpMethod,
    version: 'V1' as APIVersionKey,
    summary: 'Update goal',
    tags: ['Goals'],
    requiresAuth: true,
    permissions: ['goals:update'],
    idempotent: false,
  },
  updateProgress: {
    path: '/goals/:id/progress',
    method: 'POST' as HttpMethod,
    version: 'V1' as APIVersionKey,
    summary: 'Update goal progress',
    tags: ['Goals'],
    requiresAuth: true,
    permissions: ['goals:update'],
    idempotent: true,
  },
  delete: {
    path: '/goals/:id',
    method: 'DELETE' as HttpMethod,
    version: 'V1' as APIVersionKey,
    summary: 'Delete goal',
    tags: ['Goals'],
    requiresAuth: true,
    permissions: ['goals:delete'],
    idempotent: true,
  },
};

// Reviews API Contract
export const ReviewsAPI = {
  createCycle: {
    path: '/review-cycles',
    method: 'POST' as HttpMethod,
    version: 'V1' as APIVersionKey,
    summary: 'Create review cycle',
    tags: ['Reviews'],
    requiresAuth: true,
    permissions: ['review-cycles:create'],
    idempotent: true,
  },
  launchCycle: {
    path: '/review-cycles/:id/launch',
    method: 'POST' as HttpMethod,
    version: 'V1' as APIVersionKey,
    summary: 'Launch review cycle',
    tags: ['Reviews'],
    requiresAuth: true,
    permissions: ['review-cycles:launch'],
    idempotent: true,
  },
  submitReview: {
    path: '/reviews/:id/submit',
    method: 'POST' as HttpMethod,
    version: 'V1' as APIVersionKey,
    summary: 'Submit review',
    tags: ['Reviews'],
    requiresAuth: true,
    permissions: ['reviews:submit'],
    idempotent: true,
  },
  getReview: {
    path: '/reviews/:id',
    method: 'GET' as HttpMethod,
    version: 'V1' as APIVersionKey,
    summary: 'Get review by ID',
    tags: ['Reviews'],
    requiresAuth: true,
    permissions: ['reviews:read'],
    idempotent: true,
    cache: { enabled: true, ttlSeconds: 60 },
  },
};

// Feedback API Contract
export const FeedbackAPI = {
  create: {
    path: '/feedback',
    method: 'POST' as HttpMethod,
    version: 'V1' as APIVersionKey,
    summary: 'Give feedback',
    tags: ['Feedback'],
    requiresAuth: true,
    permissions: ['feedback:create'],
    idempotent: true,
  },
  list: {
    path: '/feedback',
    method: 'GET' as HttpMethod,
    version: 'V1' as APIVersionKey,
    summary: 'List feedback',
    tags: ['Feedback'],
    requiresAuth: true,
    permissions: ['feedback:read'],
    idempotent: true,
    cache: { enabled: true, ttlSeconds: 30 },
  },
};

export {
  APIVersion,
  APIVersionKey,
  APIRequest,
  APIResponse,
  APIEndpoint,
  APIMiddleware,
};
