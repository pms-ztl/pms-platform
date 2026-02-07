import type { Request, Response, NextFunction } from 'express';

import { authService } from '../modules/auth/auth.service';
import type { AuthenticatedRequest } from '../types';
import { AuthenticationError } from '../utils/errors';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    console.log(`[BACKEND AUTH] ============ ${req.method} ${req.path} ============`);
    const authHeader = req.headers.authorization;
    console.log('[BACKEND AUTH] Authorization header:', authHeader ? `${authHeader.substring(0, 40)}...` : 'MISSING');

    if (authHeader === undefined || authHeader === null) {
      console.error('[BACKEND AUTH] ERROR: No authorization header');
      throw new AuthenticationError('No authorization header provided');
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.error('[BACKEND AUTH] ERROR: Invalid header format, parts:', parts.length);
      throw new AuthenticationError('Invalid authorization header format');
    }

    const token = parts[1];

    if (token === undefined || token === '') {
      console.error('[BACKEND AUTH] ERROR: No token in header');
      throw new AuthenticationError('No token provided');
    }

    console.log('[BACKEND AUTH] Token extracted, validating...');
    const user = await authService.validateToken(token);
    console.log('[BACKEND AUTH] Token valid! User:', user.email, 'Tenant:', user.tenantId);

    (req as AuthenticatedRequest).user = user;
    (req as AuthenticatedRequest).tenantId = user.tenantId;

    next();
  } catch (error) {
    console.error('[BACKEND AUTH] Authentication failed:', error instanceof Error ? error.message : error);
    next(error);
  }
}

export function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (authHeader === undefined || authHeader === null) {
    next();
    return;
  }

  authenticate(req, res, next).catch(next);
}
