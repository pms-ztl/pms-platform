/**
 * Security Hardening Utilities
 *
 * Enterprise-grade security controls for:
 * - Input validation and sanitization
 * - Rate limiting and throttling
 * - CSRF protection
 * - Security headers
 * - Request validation
 * - Data encryption
 */

import { Request, Response, NextFunction } from 'express';
import { createHash, createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// ============================================================================
// TYPES
// ============================================================================

export interface SecurityConfig {
  csrf: {
    enabled: boolean;
    cookieName: string;
    headerName: string;
    excludePaths: string[];
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    keyGenerator: (req: Request) => string;
    skipFailedRequests: boolean;
  };
  headers: {
    hsts: boolean;
    hstsMaxAge: number;
    noSniff: boolean;
    frameGuard: 'deny' | 'sameorigin' | false;
    xssFilter: boolean;
    contentSecurityPolicy: string | false;
    referrerPolicy: string;
  };
  validation: {
    maxBodySize: string;
    maxUrlLength: number;
    maxHeaderSize: number;
    allowedContentTypes: string[];
  };
}

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  csrf: {
    enabled: true,
    cookieName: 'csrf_token',
    headerName: 'x-csrf-token',
    excludePaths: ['/api/v1/auth/login', '/api/v1/auth/refresh', '/health', '/ready'],
  },
  rateLimit: {
    enabled: true,
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    keyGenerator: (req) => getClientIP(req),
    skipFailedRequests: false,
  },
  headers: {
    hsts: true,
    hstsMaxAge: 31536000, // 1 year
    noSniff: true,
    frameGuard: 'deny',
    xssFilter: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
    referrerPolicy: 'strict-origin-when-cross-origin',
  },
  validation: {
    maxBodySize: '10mb',
    maxUrlLength: 2048,
    maxHeaderSize: 8192,
    allowedContentTypes: ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data'],
  },
};

// ============================================================================
// SECURITY HEADERS MIDDLEWARE
// ============================================================================

export function createSecurityHeadersMiddleware(
  config: Partial<SecurityConfig['headers']> = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const headers = { ...DEFAULT_SECURITY_CONFIG.headers, ...config };

  return (_req: Request, res: Response, next: NextFunction) => {
    // HSTS
    if (headers.hsts) {
      res.setHeader(
        'Strict-Transport-Security',
        `max-age=${headers.hstsMaxAge}; includeSubDomains; preload`
      );
    }

    // X-Content-Type-Options
    if (headers.noSniff) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // X-Frame-Options
    if (headers.frameGuard) {
      res.setHeader('X-Frame-Options', headers.frameGuard.toUpperCase());
    }

    // X-XSS-Protection
    if (headers.xssFilter) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // Content-Security-Policy
    if (headers.contentSecurityPolicy) {
      res.setHeader('Content-Security-Policy', headers.contentSecurityPolicy);
    }

    // Referrer-Policy
    if (headers.referrerPolicy) {
      res.setHeader('Referrer-Policy', headers.referrerPolicy);
    }

    // Additional security headers
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    next();
  };
}

// ============================================================================
// CSRF PROTECTION
// ============================================================================

export function createCSRFMiddleware(
  config: Partial<SecurityConfig['csrf']> = {}
): {
  tokenGenerator: (req: Request, res: Response, next: NextFunction) => void;
  validator: (req: Request, res: Response, next: NextFunction) => void;
} {
  const csrf = { ...DEFAULT_SECURITY_CONFIG.csrf, ...config };

  const generateToken = (): string => {
    return randomBytes(32).toString('hex');
  };

  const tokenGenerator = (req: Request, res: Response, next: NextFunction) => {
    if (!csrf.enabled) return next();

    // Generate token if not exists
    let token = req.cookies?.[csrf.cookieName];
    if (!token) {
      token = generateToken();
      res.cookie(csrf.cookieName, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000, // 1 hour
      });
    }

    // Make token available to views/API
    (req as unknown as { csrfToken: string }).csrfToken = token;
    res.locals.csrfToken = token;

    next();
  };

  const validator = (req: Request, res: Response, next: NextFunction) => {
    if (!csrf.enabled) return next();

    // Skip for excluded paths
    if (csrf.excludePaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const cookieToken = req.cookies?.[csrf.cookieName];
    const headerToken = req.headers[csrf.headerName.toLowerCase()] as string;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return res.status(403).json({
        error: 'CSRF validation failed',
        code: 'CSRF_INVALID',
      });
    }

    next();
  };

  return { tokenGenerator, validator };
}

// ============================================================================
// RATE LIMITER
// ============================================================================

interface RateLimitStore {
  get(key: string): Promise<{ count: number; resetTime: number } | null>;
  set(key: string, value: { count: number; resetTime: number }, ttl: number): Promise<void>;
  increment(key: string): Promise<number>;
}

class InMemoryRateLimitStore implements RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.resetTime) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  async set(
    key: string,
    value: { count: number; resetTime: number },
    _ttl: number
  ): Promise<void> {
    this.store.set(key, value);
  }

  async increment(key: string): Promise<number> {
    const entry = await this.get(key);
    if (!entry) {
      return 1;
    }
    entry.count++;
    return entry.count;
  }
}

export function createRateLimiter(
  config: Partial<SecurityConfig['rateLimit']> = {},
  store: RateLimitStore = new InMemoryRateLimitStore()
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const rateLimit = { ...DEFAULT_SECURITY_CONFIG.rateLimit, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!rateLimit.enabled) {
      return next();
    }

    const key = rateLimit.keyGenerator(req);
    const now = Date.now();

    let entry = await store.get(key);

    if (!entry) {
      entry = { count: 0, resetTime: now + rateLimit.windowMs };
      await store.set(key, entry, rateLimit.windowMs);
    }

    const count = await store.increment(key);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimit.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimit.maxRequests - count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    if (count > rateLimit.maxRequests) {
      if (rateLimit.skipFailedRequests && res.statusCode >= 400) {
        return next();
      }

      res.setHeader('Retry-After', Math.ceil((entry.resetTime - now) / 1000));
      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });
    }

    next();
  };
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

export interface ValidationRule {
  field: string;
  rules: Array<{
    type: 'required' | 'type' | 'minLength' | 'maxLength' | 'pattern' | 'enum' | 'custom';
    value?: unknown;
    message?: string;
  }>;
}

export function validateInput(
  data: Record<string, unknown>,
  rules: ValidationRule[]
): { valid: boolean; errors: Array<{ field: string; message: string }> } {
  const errors: Array<{ field: string; message: string }> = [];

  for (const rule of rules) {
    const value = data[rule.field];

    for (const check of rule.rules) {
      let isValid = true;
      let message = check.message || `Validation failed for ${rule.field}`;

      switch (check.type) {
        case 'required':
          isValid = value !== undefined && value !== null && value !== '';
          message = check.message || `${rule.field} is required`;
          break;

        case 'type':
          if (value !== undefined && value !== null) {
            isValid = typeof value === check.value;
            message = check.message || `${rule.field} must be a ${check.value}`;
          }
          break;

        case 'minLength':
          if (typeof value === 'string' || Array.isArray(value)) {
            isValid = value.length >= (check.value as number);
            message = check.message || `${rule.field} must be at least ${check.value} characters`;
          }
          break;

        case 'maxLength':
          if (typeof value === 'string' || Array.isArray(value)) {
            isValid = value.length <= (check.value as number);
            message = check.message || `${rule.field} must not exceed ${check.value} characters`;
          }
          break;

        case 'pattern':
          if (typeof value === 'string') {
            const regex = check.value instanceof RegExp ? check.value : new RegExp(check.value as string);
            isValid = regex.test(value);
            message = check.message || `${rule.field} format is invalid`;
          }
          break;

        case 'enum':
          if (Array.isArray(check.value)) {
            isValid = check.value.includes(value);
            message = check.message || `${rule.field} must be one of: ${check.value.join(', ')}`;
          }
          break;

        case 'custom':
          if (typeof check.value === 'function') {
            isValid = check.value(value, data);
          }
          break;
      }

      if (!isValid) {
        errors.push({ field: rule.field, message });
        break; // Stop checking this field after first error
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

export function sanitizeHtml(input: string): string {
  const entityMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  return String(input).replace(/[&<>"'`=/]/g, (s) => entityMap[s]);
}

export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: {
    maxDepth?: number;
    maxStringLength?: number;
    removeNullish?: boolean;
  } = {}
): T {
  const { maxDepth = 10, maxStringLength = 10000, removeNullish = false } = options;

  function sanitize(value: unknown, depth: number): unknown {
    if (depth > maxDepth) return '[MAX_DEPTH_EXCEEDED]';

    if (value === null || value === undefined) {
      return removeNullish ? undefined : value;
    }

    if (typeof value === 'string') {
      const sanitized = sanitizeString(value);
      return sanitized.length > maxStringLength
        ? sanitized.substring(0, maxStringLength) + '...'
        : sanitized;
    }

    if (Array.isArray(value)) {
      return value.map((item) => sanitize(item, depth + 1)).filter((v) => v !== undefined);
    }

    if (typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        const sanitizedKey = sanitizeString(key);
        const sanitizedValue = sanitize(val, depth + 1);
        if (sanitizedValue !== undefined) {
          result[sanitizedKey] = sanitizedValue;
        }
      }
      return result;
    }

    return value;
  }

  return sanitize(obj, 0) as T;
}

// ============================================================================
// DATA ENCRYPTION
// ============================================================================

const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  saltLength: 32,
};

export class DataEncryptor {
  private config: EncryptionConfig;
  private masterKey: Buffer;

  constructor(masterKey: string, config: Partial<EncryptionConfig> = {}) {
    this.config = { ...DEFAULT_ENCRYPTION_CONFIG, ...config };

    // Derive key from master key
    this.masterKey = createHash('sha256').update(masterKey).digest();
  }

  async encrypt(plaintext: string): Promise<string> {
    const iv = randomBytes(this.config.ivLength);
    const salt = randomBytes(this.config.saltLength);

    // Derive key using scrypt
    const key = (await scryptAsync(this.masterKey, salt, this.config.keyLength)) as Buffer;

    const cipher = createCipheriv(this.config.algorithm, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = (cipher as unknown as { getAuthTag: () => Buffer }).getAuthTag();

    // Combine: salt + iv + authTag + encrypted
    return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  async decrypt(ciphertext: string): Promise<string> {
    const [saltHex, ivHex, authTagHex, encrypted] = ciphertext.split(':');

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Derive key using scrypt
    const key = (await scryptAsync(this.masterKey, salt, this.config.keyLength)) as Buffer;

    const decipher = createDecipheriv(this.config.algorithm, key, iv);
    (decipher as unknown as { setAuthTag: (tag: Buffer) => void }).setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  hash(data: string, algorithm: string = 'sha256'): string {
    return createHash(algorithm).update(data).digest('hex');
  }

  hashWithSalt(data: string, salt?: string): { hash: string; salt: string } {
    const usedSalt = salt || randomBytes(16).toString('hex');
    const hash = this.hash(`${data}:${usedSalt}`);
    return { hash, salt: usedSalt };
  }
}

// ============================================================================
// REQUEST VALIDATION MIDDLEWARE
// ============================================================================

export function createRequestValidator(
  config: Partial<SecurityConfig['validation']> = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const validation = { ...DEFAULT_SECURITY_CONFIG.validation, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    // Check URL length
    if (req.url.length > validation.maxUrlLength) {
      return res.status(414).json({
        error: 'URI too long',
        code: 'URI_TOO_LONG',
        maxLength: validation.maxUrlLength,
      });
    }

    // Check content type for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.headers['content-type']?.split(';')[0]?.trim();
      if (contentType && !validation.allowedContentTypes.includes(contentType)) {
        return res.status(415).json({
          error: 'Unsupported media type',
          code: 'UNSUPPORTED_MEDIA_TYPE',
          allowedTypes: validation.allowedContentTypes,
        });
      }
    }

    // Check for suspicious patterns in URL
    const suspiciousPatterns = [
      /(\.\.[\/\\])+/g, // Path traversal
      /%00/g, // Null byte
      /<script/gi, // Script tags
      /javascript:/gi, // JavaScript protocol
      /\x00/g, // Null character
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(req.url) || pattern.test(decodeURIComponent(req.url))) {
        return res.status(400).json({
          error: 'Malicious request detected',
          code: 'MALICIOUS_REQUEST',
        });
      }
    }

    next();
  };
}

// ============================================================================
// IP BLOCKING
// ============================================================================

export class IPBlocker {
  private blockedIPs: Set<string> = new Set();
  private allowedIPs: Set<string> = new Set();
  private temporaryBlocks: Map<string, number> = new Map();

  block(ip: string, duration?: number): void {
    if (duration) {
      this.temporaryBlocks.set(ip, Date.now() + duration);
    } else {
      this.blockedIPs.add(ip);
    }
  }

  unblock(ip: string): void {
    this.blockedIPs.delete(ip);
    this.temporaryBlocks.delete(ip);
  }

  allow(ip: string): void {
    this.allowedIPs.add(ip);
  }

  disallow(ip: string): void {
    this.allowedIPs.delete(ip);
  }

  isBlocked(ip: string): boolean {
    // Check allowlist first
    if (this.allowedIPs.has(ip)) {
      return false;
    }

    // Check permanent blocklist
    if (this.blockedIPs.has(ip)) {
      return true;
    }

    // Check temporary blocks
    const blockExpiry = this.temporaryBlocks.get(ip);
    if (blockExpiry) {
      if (Date.now() < blockExpiry) {
        return true;
      }
      this.temporaryBlocks.delete(ip);
    }

    return false;
  }

  middleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = getClientIP(req);

      if (this.isBlocked(ip)) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'IP_BLOCKED',
        });
      }

      next();
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  createSecurityHeadersMiddleware,
  createCSRFMiddleware,
  createRateLimiter,
  createRequestValidator,
  validateInput,
  sanitizeString,
  sanitizeHtml,
  sanitizeObject,
  DataEncryptor,
  IPBlocker,
  InMemoryRateLimitStore,
  DEFAULT_SECURITY_CONFIG,
};
