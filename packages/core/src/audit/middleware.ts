/**
 * Comprehensive Audit Logging Middleware
 *
 * Enterprise-grade audit logging for:
 * - All HTTP requests/responses
 * - Authentication events
 * - Data mutations
 * - Security events
 * - Compliance tracking
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface AuditEvent {
  id: string;
  timestamp: Date;
  tenantId: string | null;
  userId: string | null;
  sessionId: string | null;
  correlationId: string;
  action: string;
  category: AuditCategory;
  severity: AuditSeverity;
  entityType: string | null;
  entityId: string | null;
  method: string;
  path: string;
  statusCode: number;
  requestBody: Record<string, unknown> | null;
  responseBody: Record<string, unknown> | null;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  ipAddress: string;
  userAgent: string;
  duration: number;
  metadata: Record<string, unknown>;
  outcome: 'success' | 'failure' | 'error';
  errorMessage: string | null;
}

export type AuditCategory =
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_mutation'
  | 'configuration'
  | 'security'
  | 'compliance'
  | 'system';

export type AuditSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface AuditConfig {
  enabled: boolean;
  logRequestBody: boolean;
  logResponseBody: boolean;
  sensitiveFields: string[];
  excludePaths: string[];
  includeHeaders: string[];
  maxBodySize: number;
  persistor: AuditPersistor;
}

export interface AuditPersistor {
  persist(event: AuditEvent): Promise<void>;
  persistBatch(events: AuditEvent[]): Promise<void>;
}

// ============================================================================
// AUDIT CONTEXT
// ============================================================================

export interface AuditContext {
  correlationId: string;
  tenantId: string | null;
  userId: string | null;
  sessionId: string | null;
  startTime: number;
  entityType: string | null;
  entityId: string | null;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  action: string | null;
  category: AuditCategory;
  severity: AuditSeverity;
  metadata: Record<string, unknown>;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      audit?: AuditContext;
    }
  }
}

// ============================================================================
// DEFAULT AUDIT PERSISTOR (Console)
// ============================================================================

export class ConsoleAuditPersistor implements AuditPersistor {
  async persist(event: AuditEvent): Promise<void> {
    console.log('[AUDIT]', JSON.stringify(event));
  }

  async persistBatch(events: AuditEvent[]): Promise<void> {
    for (const event of events) {
      await this.persist(event);
    }
  }
}

// ============================================================================
// DATABASE AUDIT PERSISTOR
// ============================================================================

export class DatabaseAuditPersistor implements AuditPersistor {
  private prisma: unknown;

  constructor(prisma: unknown) {
    this.prisma = prisma;
  }

  async persist(event: AuditEvent): Promise<void> {
    // @ts-expect-error - Prisma client type varies
    await this.prisma.auditEvent.create({
      data: {
        id: event.id,
        tenantId: event.tenantId || '__system__',
        userId: event.userId,
        action: event.action,
        entityType: event.entityType || 'system',
        entityId: event.entityId || 'N/A',
        previousState: event.previousState,
        newState: event.newState,
        metadata: {
          ...event.metadata,
          correlationId: event.correlationId,
          sessionId: event.sessionId,
          category: event.category,
          severity: event.severity,
          method: event.method,
          path: event.path,
          statusCode: event.statusCode,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          duration: event.duration,
          outcome: event.outcome,
          errorMessage: event.errorMessage,
          requestBody: event.requestBody,
          responseBody: event.responseBody,
        },
        createdAt: event.timestamp,
      },
    });
  }

  async persistBatch(events: AuditEvent[]): Promise<void> {
    // @ts-expect-error - Prisma client type varies
    await this.prisma.auditEvent.createMany({
      data: events.map((event) => ({
        id: event.id,
        tenantId: event.tenantId || '__system__',
        userId: event.userId,
        action: event.action,
        entityType: event.entityType || 'system',
        entityId: event.entityId || 'N/A',
        previousState: event.previousState,
        newState: event.newState,
        metadata: {
          ...event.metadata,
          correlationId: event.correlationId,
          sessionId: event.sessionId,
          category: event.category,
          severity: event.severity,
          method: event.method,
          path: event.path,
          statusCode: event.statusCode,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          duration: event.duration,
          outcome: event.outcome,
          errorMessage: event.errorMessage,
        },
        createdAt: event.timestamp,
      })),
      skipDuplicates: true,
    });
  }
}

// ============================================================================
// AUDIT MIDDLEWARE
// ============================================================================

const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authorization',
  'credit_card',
  'creditCard',
  'ssn',
  'social_security',
  'pin',
  'cvv',
  'mfa_code',
  'otp',
  'privateKey',
  'private_key',
];

const DEFAULT_EXCLUDE_PATHS = [
  '/health',
  '/ready',
  '/metrics',
  '/favicon.ico',
];

export function createAuditMiddleware(config: Partial<AuditConfig> = {}): (
  req: Request,
  res: Response,
  next: NextFunction
) => void {
  const fullConfig: AuditConfig = {
    enabled: config.enabled ?? true,
    logRequestBody: config.logRequestBody ?? true,
    logResponseBody: config.logResponseBody ?? false,
    sensitiveFields: [...DEFAULT_SENSITIVE_FIELDS, ...(config.sensitiveFields || [])],
    excludePaths: [...DEFAULT_EXCLUDE_PATHS, ...(config.excludePaths || [])],
    includeHeaders: config.includeHeaders || ['x-correlation-id', 'x-tenant-id'],
    maxBodySize: config.maxBodySize ?? 10000,
    persistor: config.persistor || new ConsoleAuditPersistor(),
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (!fullConfig.enabled) {
      return next();
    }

    // Skip excluded paths
    if (fullConfig.excludePaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
    const startTime = Date.now();

    // Initialize audit context
    req.audit = {
      correlationId,
      tenantId: (req.headers['x-tenant-id'] as string) || null,
      userId: (req as unknown as { user?: { id?: string } }).user?.id || null,
      sessionId: (req.headers['x-session-id'] as string) || null,
      startTime,
      entityType: null,
      entityId: null,
      previousState: null,
      newState: null,
      action: null,
      category: determineCategory(req),
      severity: 'info',
      metadata: {},
    };

    // Capture response
    const originalSend = res.send;
    let responseBody: unknown = null;

    res.send = function (body: unknown) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    // Log on response finish
    res.on('finish', async () => {
      const duration = Date.now() - startTime;
      const audit = req.audit!;

      const event: AuditEvent = {
        id: randomUUID(),
        timestamp: new Date(),
        tenantId: audit.tenantId,
        userId: audit.userId,
        sessionId: audit.sessionId,
        correlationId: audit.correlationId,
        action: audit.action || determineAction(req),
        category: audit.category,
        severity: determineSeverity(req, res),
        entityType: audit.entityType || determineEntityType(req),
        entityId: audit.entityId || determineEntityId(req),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        requestBody: fullConfig.logRequestBody
          ? sanitizeBody(req.body, fullConfig.sensitiveFields, fullConfig.maxBodySize)
          : null,
        responseBody: fullConfig.logResponseBody
          ? sanitizeBody(parseResponseBody(responseBody), fullConfig.sensitiveFields, fullConfig.maxBodySize)
          : null,
        previousState: audit.previousState,
        newState: audit.newState,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        duration,
        metadata: {
          ...audit.metadata,
          headers: extractHeaders(req, fullConfig.includeHeaders),
          query: req.query,
        },
        outcome: res.statusCode < 400 ? 'success' : res.statusCode < 500 ? 'failure' : 'error',
        errorMessage: res.statusCode >= 400 ? extractErrorMessage(responseBody) : null,
      };

      try {
        await fullConfig.persistor.persist(event);
      } catch (error) {
        console.error('[AUDIT ERROR] Failed to persist audit event:', error);
      }
    });

    next();
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function determineCategory(req: Request): AuditCategory {
  const path = req.path.toLowerCase();

  if (path.includes('/auth') || path.includes('/login') || path.includes('/logout')) {
    return 'authentication';
  }
  if (path.includes('/permission') || path.includes('/role') || path.includes('/access')) {
    return 'authorization';
  }
  if (req.method === 'GET') {
    return 'data_access';
  }
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return 'data_mutation';
  }
  if (path.includes('/config') || path.includes('/settings')) {
    return 'configuration';
  }

  return 'system';
}

function determineAction(req: Request): string {
  const method = req.method;
  const path = req.path;

  // Extract resource from path
  const pathParts = path.split('/').filter(Boolean);
  const resource = pathParts[pathParts.length - 2] || pathParts[pathParts.length - 1] || 'unknown';

  switch (method) {
    case 'GET':
      return `${resource.toUpperCase()}_READ`;
    case 'POST':
      return `${resource.toUpperCase()}_CREATE`;
    case 'PUT':
    case 'PATCH':
      return `${resource.toUpperCase()}_UPDATE`;
    case 'DELETE':
      return `${resource.toUpperCase()}_DELETE`;
    default:
      return `${resource.toUpperCase()}_${method}`;
  }
}

function determineSeverity(req: Request, res: Response): AuditSeverity {
  // Authentication failures are high severity
  if (req.path.includes('/auth') && res.statusCode === 401) {
    return 'high';
  }

  // Authorization failures are high severity
  if (res.statusCode === 403) {
    return 'high';
  }

  // Server errors are critical
  if (res.statusCode >= 500) {
    return 'critical';
  }

  // DELETE operations are medium severity
  if (req.method === 'DELETE') {
    return 'medium';
  }

  // Mutations are low severity
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return 'low';
  }

  return 'info';
}

function determineEntityType(req: Request): string | null {
  const pathParts = req.path.split('/').filter(Boolean);
  // Skip 'api' and 'v1' type prefixes
  const resourceIndex = pathParts.findIndex((p) => !['api', 'v1', 'v2'].includes(p));
  return pathParts[resourceIndex] || null;
}

function determineEntityId(req: Request): string | null {
  const pathParts = req.path.split('/').filter(Boolean);
  // Look for UUID-like patterns
  for (const part of pathParts) {
    if (/^[a-f0-9-]{36}$/i.test(part) || /^[a-z0-9]{24,}$/i.test(part)) {
      return part;
    }
  }
  return req.params.id || null;
}

function sanitizeBody(
  body: unknown,
  sensitiveFields: string[],
  maxSize: number
): Record<string, unknown> | null {
  if (!body) return null;

  let obj: Record<string, unknown>;
  if (typeof body === 'string') {
    try {
      obj = JSON.parse(body);
    } catch {
      return { _raw: body.substring(0, maxSize) };
    }
  } else if (typeof body === 'object') {
    obj = body as Record<string, unknown>;
  } else {
    return null;
  }

  return sanitizeObject(obj, sensitiveFields, maxSize);
}

function sanitizeObject(
  obj: Record<string, unknown>,
  sensitiveFields: string[],
  maxSize: number,
  currentSize = 0
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check size limit
    if (currentSize > maxSize) {
      result._truncated = true;
      break;
    }

    // Mask sensitive fields
    const isS = sensitiveFields.some(
      (field) => key.toLowerCase().includes(field.toLowerCase())
    );

    if (isS) {
      result[key] = '[REDACTED]';
      currentSize += 10;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeObject(
        value as Record<string, unknown>,
        sensitiveFields,
        maxSize,
        currentSize
      );
    } else if (Array.isArray(value)) {
      result[key] = value.slice(0, 10).map((item) =>
        typeof item === 'object'
          ? sanitizeObject(item as Record<string, unknown>, sensitiveFields, maxSize, currentSize)
          : item
      );
      if (value.length > 10) {
        (result[key] as unknown[]).push(`... and ${value.length - 10} more items`);
      }
    } else {
      const strValue = String(value);
      result[key] = strValue.length > 1000 ? strValue.substring(0, 1000) + '...' : value;
      currentSize += strValue.length;
    }
  }

  return result;
}

function parseResponseBody(body: unknown): unknown {
  if (!body) return null;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return { _raw: body.substring(0, 1000) };
    }
  }
  return body;
}

function extractHeaders(req: Request, includeHeaders: string[]): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const header of includeHeaders) {
    const value = req.headers[header.toLowerCase()];
    if (value) {
      headers[header] = Array.isArray(value) ? value[0] : value;
    }
  }
  return headers;
}

function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function extractErrorMessage(responseBody: unknown): string | null {
  if (!responseBody) return null;

  let body: Record<string, unknown>;
  if (typeof responseBody === 'string') {
    try {
      body = JSON.parse(responseBody);
    } catch {
      return responseBody.substring(0, 500);
    }
  } else if (typeof responseBody === 'object') {
    body = responseBody as Record<string, unknown>;
  } else {
    return null;
  }

  return (
    (body.message as string) ||
    (body.error as string) ||
    (body.errors as string) ||
    null
  );
}

// ============================================================================
// AUDIT HELPERS FOR SERVICES
// ============================================================================

/**
 * Set entity context for audit trail
 */
export function setAuditEntity(
  req: Request,
  entityType: string,
  entityId: string
): void {
  if (req.audit) {
    req.audit.entityType = entityType;
    req.audit.entityId = entityId;
  }
}

/**
 * Set previous state for change tracking
 */
export function setAuditPreviousState(
  req: Request,
  state: Record<string, unknown>
): void {
  if (req.audit) {
    req.audit.previousState = state;
  }
}

/**
 * Set new state for change tracking
 */
export function setAuditNewState(
  req: Request,
  state: Record<string, unknown>
): void {
  if (req.audit) {
    req.audit.newState = state;
  }
}

/**
 * Set custom action name
 */
export function setAuditAction(req: Request, action: string): void {
  if (req.audit) {
    req.audit.action = action;
  }
}

/**
 * Set audit severity
 */
export function setAuditSeverity(req: Request, severity: AuditSeverity): void {
  if (req.audit) {
    req.audit.severity = severity;
  }
}

/**
 * Add custom metadata
 */
export function addAuditMetadata(
  req: Request,
  metadata: Record<string, unknown>
): void {
  if (req.audit) {
    req.audit.metadata = { ...req.audit.metadata, ...metadata };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  createAuditMiddleware,
  ConsoleAuditPersistor,
  DatabaseAuditPersistor,
  setAuditEntity,
  setAuditPreviousState,
  setAuditNewState,
  setAuditAction,
  setAuditSeverity,
  addAuditMetadata,
};
