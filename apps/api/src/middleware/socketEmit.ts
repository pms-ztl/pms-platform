import type { Request, Response, NextFunction } from 'express';

import type { AuthenticatedRequest } from '../types';
import { emitToTenant, emitToUser, emitToAdmins } from '../utils/socket';

/**
 * Resource mapping from route path prefix to resource name for socket events.
 */
const RESOURCE_MAP: Record<string, string> = {
  '/api/v1/goals': 'goals',
  '/api/v1/reviews': 'reviews',
  '/api/v1/feedback': 'feedback',
  '/api/v1/calibration': 'calibration',
  '/api/v1/notifications': 'notifications',
  '/api/v1/users': 'users',
  '/api/v1/one-on-ones': 'one-on-ones',
  '/api/v1/pip': 'pip',
  '/api/v1/development': 'development',
  '/api/v1/compensation': 'compensation',
  '/api/v1/promotions': 'promotions',
  '/api/v1/evidence': 'evidence',
  '/api/v1/succession': 'succession',
  '/api/v1/skills': 'skills',
  '/api/v1/compliance': 'compliance',
  '/api/v1/announcements': 'announcements',
  '/api/v1/calendar/events': 'calendar',
  '/api/v1/admin-config': 'admin-config',
  '/api/v1/leaderboard': 'leaderboard',
};

/** HTTP methods that mutate data */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Middleware that emits Socket.io events after successful mutations.
 * Intercepts res.json() to fire events only after a 2xx response.
 */
export function socketEmitMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATING_METHODS.has(req.method)) {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    // Only emit on successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId;

      if (tenantId) {
        const resource = getResourceFromPath(req.originalUrl || req.path);
        if (resource) {
          // Emit data:changed to all tenant users
          emitToTenant(tenantId, 'data:changed', {
            resource,
            action: methodToAction(req.method),
            timestamp: new Date().toISOString(),
          });

          // For admin-config changes, also notify admin clients
          if (resource === 'admin-config') {
            emitToAdmins('data:changed', {
              resource,
              action: methodToAction(req.method),
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    }

    return originalJson(body);
  } as any;

  next();
}

function getResourceFromPath(path: string): string | null {
  for (const [prefix, resource] of Object.entries(RESOURCE_MAP)) {
    if (path.startsWith(prefix)) {
      return resource;
    }
  }
  return null;
}

function methodToAction(method: string): string {
  switch (method) {
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return 'update';
  }
}
