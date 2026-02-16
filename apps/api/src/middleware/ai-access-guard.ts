/**
 * AI Access Guard Middleware
 *
 * Two-layer gate that protects all AI endpoints:
 * 1. Tenant level — the tenant's plan must include agenticAI feature
 * 2. User level  — the individual user must have aiAccessEnabled = true
 *
 * Super Admins bypass both checks (platform operators).
 */

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@pms/database';
import type { AuthenticatedRequest } from '../types';
import { SUPER_ADMIN_ROLES } from '../utils/roles';

export async function aiAccessGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;

  if (!user) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  // Super Admins always have access (platform operators)
  const isSuperAdmin = user.roles.some((r) =>
    (SUPER_ADMIN_ROLES as readonly string[]).includes(r),
  );
  if (isSuperAdmin) {
    next();
    return;
  }

  // 1. Check tenant has agenticAI feature enabled
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { settings: true, subscriptionPlan: true, subscriptionStatus: true },
  });

  if (!tenant) {
    res.status(403).json({
      success: false,
      error: { code: 'AI_ACCESS_DENIED', message: 'Tenant not found' },
    });
    return;
  }

  // Tenant must have active subscription
  if (tenant.subscriptionStatus !== 'ACTIVE') {
    res.status(403).json({
      success: false,
      error: {
        code: 'AI_ACCESS_DENIED',
        message: 'Your organization\'s subscription is not active',
      },
    });
    return;
  }

  // Check agenticAI feature flag in tenant settings
  const settings = tenant.settings as Record<string, unknown> | null;
  const features = (settings?.features ?? {}) as Record<string, unknown>;

  if (!features.agenticAI) {
    res.status(403).json({
      success: false,
      error: {
        code: 'AI_FEATURE_NOT_AVAILABLE',
        message: 'Agentic AI is not included in your organization\'s current plan. Please upgrade to Professional or Enterprise.',
      },
    });
    return;
  }

  // 2. Check user-level AI access
  if (!user.aiAccessEnabled) {
    res.status(403).json({
      success: false,
      error: {
        code: 'AI_ACCESS_NOT_GRANTED',
        message: 'You do not have AI access. Please contact your administrator to enable it.',
      },
    });
    return;
  }

  next();
}
