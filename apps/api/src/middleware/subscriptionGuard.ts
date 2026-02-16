import type { Response, NextFunction, RequestHandler } from 'express';

import { prisma } from '@pms/database';
import type { AuthenticatedRequest } from '../types';
import { AuthorizationError } from '../utils/errors';
import { cacheGet, cacheSet } from '../utils/redis';
import { SUPER_ADMIN_ROLES } from '../utils/roles';

const SUBSCRIPTION_CACHE_PREFIX = 'subscription:status:';
const CACHE_TTL = 60; // 1 minute cache

interface SubscriptionStatus {
  status: string;
  expiresAt: string | null;
  isActive: boolean;
}

/**
 * Middleware that blocks write operations when a tenant's subscription is
 * expired, suspended, or cancelled.
 *
 * Read-only requests (GET, HEAD, OPTIONS) are always allowed so users can
 * still view their data. Mutations (POST, PUT, PATCH, DELETE) are blocked
 * with a descriptive error.
 *
 * Super Admin users bypass this check entirely.
 */
export function subscriptionGuard(): RequestHandler {
  return async (req, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;

      if (!user) {
        next();
        return;
      }

      // Super admin bypasses subscription checks
      if ((SUPER_ADMIN_ROLES as readonly string[]).some(role => user.roles.includes(role))) {
        next();
        return;
      }

      // Read-only requests are always allowed
      const readOnlyMethods = ['GET', 'HEAD', 'OPTIONS'];
      if (readOnlyMethods.includes(req.method)) {
        next();
        return;
      }

      // Allow auth-related mutations (logout, password change, etc.)
      if (req.path.startsWith('/auth/')) {
        next();
        return;
      }

      const tenantId = user.tenantId;
      if (!tenantId) {
        next();
        return;
      }

      // Check cached subscription status
      const cacheKey = `${SUBSCRIPTION_CACHE_PREFIX}${tenantId}`;
      let subStatus = await cacheGet<SubscriptionStatus>(cacheKey);

      if (!subStatus) {
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: {
            subscriptionStatus: true,
            subscriptionExpiresAt: true,
            isActive: true,
          },
        });

        if (!tenant) {
          next();
          return;
        }

        // Check if subscription has expired by date even if status not updated
        const now = new Date();
        const isExpiredByDate = tenant.subscriptionExpiresAt && tenant.subscriptionExpiresAt < now;

        subStatus = {
          status: isExpiredByDate ? 'EXPIRED' : tenant.subscriptionStatus,
          expiresAt: tenant.subscriptionExpiresAt?.toISOString() ?? null,
          isActive: tenant.isActive && !isExpiredByDate,
        };

        await cacheSet(cacheKey, subStatus, CACHE_TTL);
      }

      const blockedStatuses = ['EXPIRED', 'SUSPENDED', 'CANCELLED'];
      if (blockedStatuses.includes(subStatus.status)) {
        throw new AuthorizationError(
          `Your organization's subscription is ${subStatus.status.toLowerCase()}. ` +
          `Write operations are disabled. Please contact your administrator to renew the subscription.`
        );
      }

      if (!subStatus.isActive) {
        throw new AuthorizationError(
          'Your organization account is currently inactive. Please contact support.'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
