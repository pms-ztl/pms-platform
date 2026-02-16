import type { Request, Response, NextFunction } from 'express';

import type { AuthenticatedRequest } from '../../types';
import { superAdminService } from './super-admin.service';
import { authService } from '../auth/auth.service';
import { ValidationError, AuthenticationError } from '../../utils/errors';

// ============================================================================
// AUTH
// ============================================================================

export async function adminLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, mfaCode } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Login without restricting to a specific tenant — SA users can exist in any tenant
    const result = await authService.login({
      email,
      password,
      tenantSlug: undefined,
      mfaCode,
    });

    if ('mfaRequired' in result) {
      res.json({ mfaRequired: true, tempToken: result.tempToken });
      return;
    }

    // Decode token and verify user has SUPER_ADMIN role
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.decode(result.accessToken) as Record<string, unknown>;

    // Fetch user with roles to verify SUPER_ADMIN
    const { prisma } = await import('@pms/database');
    const userRecord = await prisma.user.findFirst({
      where: { id: decoded.sub as string },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        userRoles: { include: { role: { select: { name: true } } } },
      },
    });

    if (!userRecord) {
      throw new AuthenticationError('User not found');
    }

    const isSuperAdmin = userRecord.userRoles.some(
      (ur) => ur.role.name === 'SUPER_ADMIN'
    );

    if (!isSuperAdmin) {
      throw new AuthenticationError('Access denied. Super Admin role required.');
    }

    res.json({
      data: {
        user: {
          id: decoded.sub,
          email: userRecord.email || email,
          firstName: userRecord.firstName,
          lastName: userRecord.lastName,
          role: 'SUPER_ADMIN',
        },
        token: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function adminLogout(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const token = req.headers.authorization?.split(' ')[1] ?? '';
    const { refreshToken } = req.body;

    await authService.logout(user.id, token, refreshToken);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function adminRefreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new ValidationError('Refresh token is required');

    const tokens = await authService.refreshToken(refreshToken);
    res.json({ data: { token: tokens.accessToken, refreshToken: tokens.refreshToken } });
  } catch (error) {
    next(error);
  }
}

export async function adminVerifyMfa(req: Request, res: Response, next: NextFunction) {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) throw new ValidationError('Temp token and MFA code required');

    const tokens = await authService.verifyMfa(tempToken, code);
    res.json({ data: { verified: true, token: tokens.accessToken } });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// TENANTS
// ============================================================================

export async function listTenants(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, search, status } = req.query;
    const result = await superAdminService.listTenants({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string,
      status: status as string,
    });
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function getTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = await superAdminService.getTenant(id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function createTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { name, slug, plan, adminEmail, adminFirstName, adminLastName, maxLevel, licenseCount } = req.body;

    if (!name || !slug || !adminEmail || !adminFirstName || !adminLastName) {
      throw new ValidationError('Name, slug, adminEmail, adminFirstName, adminLastName are required');
    }

    const tenant = await superAdminService.createTenant(
      { name, slug, plan, adminEmail, adminFirstName, adminLastName, maxLevel, licenseCount },
      user.id,
    );

    res.status(201).json({ data: tenant });
  } catch (error) {
    next(error);
  }
}

export async function updateTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { id } = req.params;
    const data = req.body;
    const updated = await superAdminService.updateTenant(id, data, user.id);
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    await superAdminService.deleteTenant(req.params.id, user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function suspendTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { reason } = req.body;
    await superAdminService.suspendTenant(req.params.id, reason ?? 'Admin action', user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function activateTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    await superAdminService.activateTenant(req.params.id, user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function getTenantMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await superAdminService.getTenantMetrics(req.params.id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function updateTenantSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const updated = await superAdminService.updateTenantSettings(req.params.id, req.body, user.id);
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
}

export async function exportTenantData(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { id } = req.params;

    // Get tenant data for export
    const tenantData = await superAdminService.getTenant(id);
    const metrics = await superAdminService.getTenantMetrics(id);

    const { auditLogger: audit } = await import('../../utils/logger');
    audit('TENANT_DATA_EXPORTED', user.id, id, 'tenant', id);

    res.json({
      data: {
        tenant: tenantData,
        metrics,
        exportedAt: new Date().toISOString(),
        exportedBy: user.id,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// DESIGNATED MANAGER
// ============================================================================

export async function assignDesignatedManager(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { managerUserId } = req.body;

    if (!managerUserId) {
      throw new ValidationError('managerUserId is required');
    }

    const result = await superAdminService.assignDesignatedManager(
      req.params.id,
      managerUserId,
      user.id,
    );

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function getDesignatedManager(req: Request, res: Response, next: NextFunction) {
  try {
    const manager = await superAdminService.getDesignatedManager(req.params.id);
    res.json({ data: manager });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// USERS (Cross-tenant)
// ============================================================================

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, search, tenantId, role } = req.query;
    const result = await superAdminService.listUsers({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string,
      tenantId: tenantId as string,
      role: role as string,
    });
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await superAdminService.getUser(req.params.id, { checkViewPermission: true });
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function suspendUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { reason } = req.body;
    await superAdminService.suspendUser(req.params.id, reason ?? 'Admin action', user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function activateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    await superAdminService.activateUser(req.params.id, user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function resetUserPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    await superAdminService.resetUserPassword(req.params.id, user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function disableUserMfa(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    await superAdminService.disableUserMfa(req.params.id, user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// SYSTEM
// ============================================================================

export async function getSystemMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await superAdminService.getSystemMetrics();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await superAdminService.getDashboardStats();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getSystemHealth(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await superAdminService.getSystemHealth();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

const SYSTEM_CONFIG_KEY = 'system:config';
const DEFAULT_SYSTEM_CONFIG = {
  maintenance: { enabled: false, message: '' },
  features: { signupsEnabled: true, trialDays: 14, defaultPlan: 'STARTER', requireEmailVerification: false },
  email: { provider: 'smtp', fromAddress: process.env.SMTP_FROM ?? '', fromName: 'PMS Platform' },
  security: { maxLoginAttempts: 5, lockoutDuration: 15, passwordMinLength: 8, requireMfaForAdmins: false },
  limits: { maxTenantsPerAccount: 1, maxApiRequestsPerMinute: 100, maxFileUploadSizeMb: 10 },
};

export async function getSystemConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const redis = (await import('../../utils/redis')).getRedisClient();
    const cached = await redis.get(SYSTEM_CONFIG_KEY);
    if (cached) {
      res.json({ data: JSON.parse(cached) });
    } else {
      // Store default config and return
      await redis.set(SYSTEM_CONFIG_KEY, JSON.stringify(DEFAULT_SYSTEM_CONFIG));
      res.json({ data: DEFAULT_SYSTEM_CONFIG });
    }
  } catch (error) {
    next(error);
  }
}

export async function updateSystemConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const redis = (await import('../../utils/redis')).getRedisClient();
    const cachedRaw = await redis.get(SYSTEM_CONFIG_KEY);
    const current = cachedRaw ? JSON.parse(cachedRaw) : { ...DEFAULT_SYSTEM_CONFIG };

    // Deep merge: update only provided sections
    const updated = { ...current };
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        updated[key] = { ...(updated[key] ?? {}), ...(value as Record<string, unknown>) };
      } else {
        updated[key] = value;
      }
    }

    await redis.set(SYSTEM_CONFIG_KEY, JSON.stringify(updated));

    const user = (req as AuthenticatedRequest).user!;
    const { auditLogger: audit } = await import('../../utils/logger');
    audit('SYSTEM_CONFIG_UPDATED', user.id, 'platform', 'system', 'config', { changes: Object.keys(req.body) });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
}

export async function clearCache(req: Request, res: Response, next: NextFunction) {
  try {
    const redis = (await import('../../utils/redis')).getRedisClient();
    const { type } = req.body;
    if (type) {
      // Clear specific cache type
      const keys = await redis.keys(`${type}:*`);
      if (keys.length > 0) await redis.del(...keys);
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// BILLING
// ============================================================================

export async function listBilling(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, status } = req.query;
    const result = await superAdminService.listBilling({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as string,
    });
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function getRevenue(req: Request, res: Response, next: NextFunction) {
  try {
    const { period } = req.query;
    const data = await superAdminService.getRevenue({ period: period as string });
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function updateTenantPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { plan } = req.body;
    if (!plan) throw new ValidationError('Plan is required');
    await superAdminService.updateTenantPlan(req.params.id, plan, user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function createInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { amount, currency, dueDate } = req.body;
    if (!amount || !dueDate) throw new ValidationError('Amount and dueDate are required');
    const invoice = await superAdminService.createInvoice(req.params.id, { amount, currency, dueDate }, user.id);
    res.status(201).json({ data: invoice });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// AUDIT
// ============================================================================

export async function listAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, userId, action, resource, startDate, endDate } = req.query;
    const result = await superAdminService.listAuditLogs({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      userId: userId as string,
      action: action as string,
      resource: resource as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function exportAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { startDate, endDate, action, resource } = req.body;

    // Fetch all matching audit logs (up to 10000)
    const logs = await superAdminService.listAuditLogs({
      page: 1,
      limit: 10000,
      startDate,
      endDate,
      action,
      resource,
    });

    const { auditLogger: audit } = await import('../../utils/logger');
    audit('AUDIT_LOGS_EXPORTED', user.id, 'platform', 'audit', 'export', {
      totalRecords: logs.total,
      filters: { startDate, endDate, action, resource },
    });

    res.json({
      data: {
        records: logs.data,
        total: logs.total,
        exportedAt: new Date().toISOString(),
        exportedBy: user.id,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// SECURITY
// ============================================================================

export async function getSecurityThreats(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await superAdminService.getSecurityThreats();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function blockIp(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { ip, reason } = req.body;
    if (!ip) throw new ValidationError('IP address is required');
    const data = await superAdminService.blockIp(ip, reason ?? 'Blocked by admin', user.id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function unblockIp(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { ip } = req.body;
    if (!ip) throw new ValidationError('IP address is required');
    const data = await superAdminService.unblockIp(ip, user.id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getBlockedIps(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await superAdminService.getBlockedIps();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getActiveSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.query;
    const data = await superAdminService.getActiveSessions(userId as string);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function terminateSession(req: Request, res: Response, next: NextFunction) {
  try {
    await superAdminService.terminateSession(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function terminateAllUserSessions(req: Request, res: Response, next: NextFunction) {
  try {
    await superAdminService.terminateAllUserSessions(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// SA USER CREATE
// ============================================================================

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { firstName, lastName, email, role, tenantId } = req.body;

    if (!firstName || !lastName || !email) {
      throw new ValidationError('firstName, lastName, and email are required');
    }

    const created = await superAdminService.createUser(
      { firstName, lastName, email, role, tenantId },
      user.id,
    );

    res.status(201).json({ data: created });
  } catch (error) {
    next(error);
  }
}
