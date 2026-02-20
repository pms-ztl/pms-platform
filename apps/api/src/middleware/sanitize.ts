import { Request, Response, NextFunction } from 'express';

/**
 * Recursively sanitize strings in an object to prevent XSS and injection attacks.
 * Strips dangerous HTML tags and script content from string values.
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove event handlers (onclick, onerror, etc.)
      .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      // Remove javascript: protocol
      .replace(/javascript\s*:/gi, '')
      // Remove data: URIs with script content
      .replace(/data\s*:\s*text\/html/gi, '')
      // Remove vbscript: protocol
      .replace(/vbscript\s*:/gi, '')
      // Trim whitespace
      .trim();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }

  return value;
}

/**
 * Express middleware that sanitizes request body, query, and params
 * to prevent XSS and basic injection attacks.
 *
 * Applied to all API routes. Does not affect file uploads or binary data.
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    for (const [key, val] of Object.entries(req.query)) {
      if (typeof val === 'string') {
        req.query[key] = sanitizeValue(val) as string;
      }
    }
  }

  if (req.params && typeof req.params === 'object') {
    for (const [key, val] of Object.entries(req.params)) {
      if (typeof val === 'string') {
        req.params[key] = sanitizeValue(val) as string;
      }
    }
  }

  next();
}
