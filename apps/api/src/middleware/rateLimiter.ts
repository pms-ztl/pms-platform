import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

import { config } from '../config';
import { RateLimitError } from '../utils/errors';
import { MS_PER_HOUR } from '../utils/constants';

// Standard rate limiter for authenticated endpoints
export const standardRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // Use user ID if authenticated, otherwise IP
    const userId = (req as { user?: { id: string } }).user?.id;
    return userId ?? req.ip ?? 'unknown';
  },
  handler: (_req: Request, _res: Response): void => {
    throw new RateLimitError('Too many requests, please try again later');
  },
});

// Stricter rate limiter for auth endpoints to prevent brute force
export const authRateLimiter = rateLimit({
  windowMs: config.NODE_ENV === 'development' ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min in dev, 15 min in prod
  max: config.NODE_ENV === 'development' ? 500 : 10, // Very relaxed in dev mode
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many login attempts' } },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // Key by email + IP for login attempts
    const email = (req.body as { email?: string }).email?.toLowerCase() ?? '';
    return `${req.ip ?? 'unknown'}:${email}`;
  },
  skipSuccessfulRequests: true, // Only count failed attempts
  handler: (_req: Request, _res: Response): void => {
    throw new RateLimitError('Too many login attempts, please try again in 15 minutes');
  },
});

// Rate limiter for password reset to prevent abuse
export const passwordResetRateLimiter = rateLimit({
  windowMs: MS_PER_HOUR, // 1 hour
  max: 3, // 3 attempts per hour
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many password reset requests' } },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const email = (req.body as { email?: string }).email?.toLowerCase() ?? '';
    return `password-reset:${req.ip ?? 'unknown'}:${email}`;
  },
  handler: (_req: Request, _res: Response): void => {
    throw new RateLimitError('Too many password reset requests, please try again later');
  },
});

// Rate limiter for MFA verification
export const mfaRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 attempts per 5 minutes
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many MFA attempts' } },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const tempToken = (req.body as { tempToken?: string }).tempToken ?? '';
    return `mfa:${req.ip ?? 'unknown'}:${tempToken}`;
  },
  handler: (_req: Request, _res: Response): void => {
    throw new RateLimitError('Too many MFA attempts, please try again later');
  },
});

// Strict rate limiter for Excel upload to prevent abuse
export const uploadRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 uploads per 5 minutes per user
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many upload attempts' } },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const userId = (req as { user?: { id: string } }).user?.id;
    return `upload:${userId ?? req.ip ?? 'unknown'}`;
  },
  handler: (_req: Request, _res: Response): void => {
    throw new RateLimitError('Too many upload attempts, please wait a few minutes before trying again');
  },
});

// Higher limit for API integrations
export const integrationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'API rate limit exceeded' } },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // Key by API key or tenant
    const tenantId = (req as { tenantId?: string }).tenantId ?? '';
    return `integration:${tenantId}`;
  },
  handler: (_req: Request, _res: Response): void => {
    throw new RateLimitError('API rate limit exceeded');
  },
});
