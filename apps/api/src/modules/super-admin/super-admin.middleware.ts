import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { prisma } from '@pms/database';
import { config } from '../../config';
import type { AuthenticatedRequest, JWTPayload } from '../../types';
import { AuthenticationError, AuthorizationError } from '../../utils/errors';
import { cacheGet, cacheSet } from '../../utils/redis';
import { SUPER_ADMIN_ROLES } from '../../utils/roles';
const SESSION_CACHE_PREFIX = 'session:admin:';
const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';

/**
 * Middleware that authenticates AND authorizes super admin users.
 * Combines JWT validation with role check in one step.
 */
export async function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AuthenticationError('No authorization header provided');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AuthenticationError('Invalid authorization header format');
    }

    const token = parts[1];
    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    // Check blacklist
    const isBlacklisted = await cacheGet<boolean>(`${TOKEN_BLACKLIST_PREFIX}${token}`);
    if (isBlacklisted) {
      throw new AuthenticationError('Token has been revoked');
    }

    // Verify JWT
    let payload: JWTPayload;
    try {
      payload = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    } catch {
      throw new AuthenticationError('Invalid or expired token');
    }

    // Check cache first — cacheGet already JSON-parses the stored value
    const cachedUser = await cacheGet<Record<string, unknown>>(`${SESSION_CACHE_PREFIX}${payload.sub}`);
    if (cachedUser) {
      (req as AuthenticatedRequest).user = cachedUser as AuthenticatedRequest['user'];
      (req as AuthenticatedRequest).tenantId = cachedUser.tenantId as string;
      next();
      return;
    }

    // Fetch user from DB
    const user = await prisma.user.findFirst({
      where: {
        id: payload.sub,
        isActive: true,
        deletedAt: null,
      },
      include: {
        userRoles: {
          include: { role: true },
        },
        tenant: true,
      },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const isSuperAdmin = roles.some((r) => (SUPER_ADMIN_ROLES as readonly string[]).includes(r));

    if (!isSuperAdmin) {
      throw new AuthorizationError('Super admin access required');
    }

    const permissions = user.userRoles.flatMap((ur) => {
      const perms = ur.role.permissions;
      if (Array.isArray(perms)) return perms as string[];
      return [];
    });

    const authenticatedUser = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions,
      displayName: user.displayName ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      jobTitle: user.jobTitle ?? undefined,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
    };

    // Cache for 5 minutes
    await cacheSet(`${SESSION_CACHE_PREFIX}${user.id}`, JSON.stringify(authenticatedUser), 300);

    (req as AuthenticatedRequest).user = authenticatedUser;
    (req as AuthenticatedRequest).tenantId = user.tenantId;

    next();
  } catch (error) {
    next(error);
  }
}
