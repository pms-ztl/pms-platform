import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import { prisma } from '@pms/database';
import { emailService } from '../../services/email';
import { welcomeAdminTemplate } from '../../services/email/email-templates';
import { NotFoundError, ConflictError, ValidationError, AuthorizationError } from '../../utils/errors';
import { auditLogger, logger } from '../../utils/logger';
import { getRedisClient } from '../../utils/redis';
import { DAYS, MS_PER_HOUR } from '../../utils/constants';

const SALT_ROUNDS = 12;

// ============================================================================
// TENANT MANAGEMENT
// ============================================================================

export class SuperAdminService {
  // --- Tenant CRUD ---

  async listTenants(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
      slug: { not: 'platform' }, // Exclude platform tenant from listings
    };

    if (params.status) {
      where.subscriptionStatus = params.status;
    }
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { slug: { contains: params.search, mode: 'insensitive' } },
        { domain: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { users: { where: { isActive: true, deletedAt: null, archivedAt: null } } } },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    const data = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      domain: t.domain,
      status: t.subscriptionStatus,
      plan: t.subscriptionPlan,
      settings: t.settings,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      userCount: t._count.users,
      storageUsed: 0, // Placeholder - implement actual storage tracking
      monthlyActiveUsers: t._count.users,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getTenant(id: string) {
    const tenant = await prisma.tenant.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { users: { where: { isActive: true, deletedAt: null, archivedAt: null } } } },
      },
    });

    if (!tenant) {
      throw new NotFoundError('Tenant', id);
    }

    // Fetch designated manager info if set
    let designatedManager = null;
    if (tenant.designatedManagerId) {
      const mgr = await prisma.user.findFirst({
        where: { id: tenant.designatedManagerId, tenantId: id, deletedAt: null },
        select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
      });
      if (mgr) {
        designatedManager = {
          id: mgr.id,
          email: mgr.email,
          name: `${mgr.firstName} ${mgr.lastName}`,
          isActive: mgr.isActive,
        };
      }
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      status: tenant.subscriptionStatus,
      plan: tenant.subscriptionPlan,
      settings: tenant.settings,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
      userCount: tenant._count.users,
      storageUsed: 0,
      monthlyActiveUsers: tenant._count.users,
      maxLevel: tenant.maxLevel,
      licenseCount: tenant.licenseCount,
      subscriptionExpiresAt: tenant.subscriptionExpiresAt?.toISOString() ?? null,
      maxUsers: tenant.maxUsers,
      isActive: tenant.isActive,
      ceoEmail: tenant.ceoEmail,
      superAdminCanView: tenant.superAdminCanView,
      designatedManager,
    };
  }

  async createTenant(data: {
    name: string;
    slug: string;
    plan?: string;
    adminEmail: string;
    adminFirstName: string;
    adminLastName: string;
    maxLevel?: number;
    licenseCount?: number;
    ceoEmail?: string;
  }, createdBy: string) {
    // Validate slug uniqueness
    const existingSlug = await prisma.tenant.findUnique({ where: { slug: data.slug } });
    if (existingSlug) {
      throw new ConflictError(`Tenant with slug "${data.slug}" already exists`);
    }

    // Validate admin email uniqueness across all tenants
    const existingEmail = await prisma.user.findFirst({
      where: { email: data.adminEmail.toLowerCase(), deletedAt: null },
    });

    const plan = data.plan ?? 'STARTER';
    const licenseCount = data.licenseCount ?? 100;
    const maxLevel = data.maxLevel ?? 16;

    // Create tenant + admin user + roles in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          slug: data.slug,
          subscriptionPlan: plan,
          subscriptionStatus: 'ACTIVE',
          subscriptionTier: plan.toLowerCase(),
          licenseCount,
          maxUsers: licenseCount,
          maxLevel: Math.min(Math.max(maxLevel, 1), 16),
          isActive: true,
          ...(data.ceoEmail && { ceoEmail: data.ceoEmail }),
          settings: {
            features: {
              goals: true,
              reviews: true,
              feedback: true,
              calibration: plan === 'PROFESSIONAL' || plan === 'ENTERPRISE',
              analytics: plan !== 'FREE',
              integrations: plan === 'ENTERPRISE',
            },
            limits: {
              maxUsers: licenseCount,
              maxStorageGb: plan === 'FREE' ? 1 : plan === 'STARTER' ? 10 : plan === 'PROFESSIONAL' ? 50 : 500,
              maxIntegrations: plan === 'ENTERPRISE' ? -1 : plan === 'PROFESSIONAL' ? 5 : plan === 'STARTER' ? 2 : 0,
            },
            branding: {},
            security: {
              mfaRequired: false,
              ssoEnabled: plan === 'ENTERPRISE',
              passwordPolicy: 'STANDARD',
              sessionTimeout: 480,
            },
          },
        },
      });

      // 2. Create system roles for this tenant
      const roleNames = ['Tenant Admin', 'HR Admin', 'HR Business Partner', 'Manager', 'Employee'];
      const roles = await Promise.all(
        roleNames.map((name) =>
          tx.role.create({
            data: {
              tenantId: tenant.id,
              name,
              description: `System role: ${name}`,
              permissions: [],
              isSystem: true,
            },
          })
        )
      );

      const adminRole = roles.find((r) => r.name === 'Tenant Admin')!;

      // 3. Create admin user
      const tempPassword = uuidv4().slice(0, 12);
      const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: data.adminEmail.toLowerCase(),
          firstName: data.adminFirstName,
          lastName: data.adminLastName,
          passwordHash,
          isActive: true,
          level: maxLevel, // Admin gets highest level
          emailVerified: true,
        },
      });

      // 4. Assign admin role
      await tx.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: adminRole.id,
          grantedBy: createdBy,
        },
      });

      // 5. Create initial subscription
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          plan,
          licenseCount,
          status: 'ACTIVE',
          startDate: new Date(),
        },
      });

      return { tenant, adminUser, tempPassword };
    });

    // Send welcome email to admin (non-blocking)
    const appUrl = process.env.APP_URL || 'https://pms.xzashr.com';
    const welcomeHtml = welcomeAdminTemplate(
      result.adminUser.firstName,
      result.tenant.name,
      `${appUrl}/login`,
      licenseCount,
      maxLevel
    );
    emailService.sendMail(
      result.adminUser.email,
      `Welcome to PMS Platform - ${result.tenant.name}`,
      welcomeHtml
    ).catch((err: Error) => {
      logger.warn('Failed to send welcome email to tenant admin', { error: err.message });
    });

    auditLogger('TENANT_CREATED', createdBy, result.tenant.id, 'tenant', result.tenant.id, {
      tenantName: data.name,
      plan,
    });

    return result.tenant;
  }

  async updateTenant(id: string, data: Partial<{
    name: string;
    domain: string;
    maxLevel: number;
    licenseCount: number;
    adminNotes: string;
    ceoEmail: string;
  }>, updatedBy: string) {
    const tenant = await prisma.tenant.findFirst({ where: { id, deletedAt: null } });
    if (!tenant) throw new NotFoundError('Tenant', id);

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.domain !== undefined) updateData.domain = data.domain;
    if (data.adminNotes !== undefined) updateData.adminNotes = data.adminNotes;
    if (data.ceoEmail !== undefined) updateData.ceoEmail = data.ceoEmail;
    if (data.maxLevel !== undefined) {
      updateData.maxLevel = Math.min(Math.max(data.maxLevel, 1), 16);
    }
    if (data.licenseCount !== undefined) {
      updateData.licenseCount = data.licenseCount;
      updateData.maxUsers = data.licenseCount;
    }

    const updated = await prisma.tenant.update({ where: { id }, data: updateData });

    auditLogger('TENANT_UPDATED', updatedBy, id, 'tenant', id, { changes: data });

    return updated;
  }

  async suspendTenant(id: string, reason: string, suspendedBy: string) {
    const tenant = await prisma.tenant.findFirst({ where: { id, deletedAt: null } });
    if (!tenant) throw new NotFoundError('Tenant', id);

    await prisma.tenant.update({
      where: { id },
      data: { subscriptionStatus: 'SUSPENDED', isActive: false, adminNotes: reason },
    });

    auditLogger('TENANT_SUSPENDED', suspendedBy, id, 'tenant', id, { reason });
  }

  async activateTenant(id: string, activatedBy: string) {
    const tenant = await prisma.tenant.findFirst({ where: { id, deletedAt: null } });
    if (!tenant) throw new NotFoundError('Tenant', id);

    await prisma.tenant.update({
      where: { id },
      data: { subscriptionStatus: 'ACTIVE', isActive: true },
    });

    auditLogger('TENANT_ACTIVATED', activatedBy, id, 'tenant', id);
  }

  async deleteTenant(id: string, deletedBy: string) {
    const tenant = await prisma.tenant.findFirst({ where: { id, deletedAt: null } });
    if (!tenant) throw new NotFoundError('Tenant', id);

    await prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    auditLogger('TENANT_DELETED', deletedBy, id, 'tenant', id);
  }

  async getTenantMetrics(id: string) {
    const tenant = await prisma.tenant.findFirst({ where: { id, deletedAt: null } });
    if (!tenant) throw new NotFoundError('Tenant', id);

    const [users, goals, reviews] = await Promise.all([
      prisma.user.count({ where: { tenantId: id, isActive: true, deletedAt: null, archivedAt: null } }),
      prisma.goal.count({ where: { tenantId: id } }),
      prisma.review.count({ where: { tenantId: id } }),
    ]);

    return { users, goals, reviews, storage: 0 };
  }

  async updateTenantSettings(id: string, settings: Record<string, unknown>, updatedBy: string) {
    const tenant = await prisma.tenant.findFirst({ where: { id, deletedAt: null } });
    if (!tenant) throw new NotFoundError('Tenant', id);

    // Merge settings
    const currentSettings = (tenant.settings as Record<string, unknown>) ?? {};
    const mergedSettings = { ...currentSettings, ...settings };

    const updated = await prisma.tenant.update({
      where: { id },
      data: { settings: mergedSettings as any },
    });

    auditLogger('TENANT_SETTINGS_UPDATED', updatedBy, id, 'tenant', id);

    return updated;
  }

  // ============================================================================
  // DESIGNATED MANAGER MANAGEMENT
  // ============================================================================

  async assignDesignatedManager(tenantId: string, managerUserId: string, assignedBy: string) {
    const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, deletedAt: null } });
    if (!tenant) throw new NotFoundError('Tenant', tenantId);

    // Validate the manager user exists in this tenant
    const managerUser = await prisma.user.findFirst({
      where: { id: managerUserId, tenantId, isActive: true, deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!managerUser) {
      throw new ValidationError(
        'Manager user not found in this tenant or is inactive'
      );
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { designatedManagerId: managerUserId },
    });

    // Ensure the user has Manager role
    const managerRole = await prisma.role.findFirst({
      where: { tenantId, name: 'Manager', isSystem: true },
    });

    if (managerRole) {
      const existingRole = await prisma.userRole.findFirst({
        where: { userId: managerUserId, roleId: managerRole.id },
      });
      if (!existingRole) {
        await prisma.userRole.create({
          data: { userId: managerUserId, roleId: managerRole.id, grantedBy: assignedBy },
        });
      }
    }

    // Send notification email to the designated manager
    const appUrl = process.env.APP_URL || 'https://pms.xzashr.com';
    emailService.sendMail(
      managerUser.email,
      `You have been assigned as Designated Manager - ${tenant.name}`,
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Designated Manager Assignment</h2>
        <p>Hello ${managerUser.firstName},</p>
        <p>You have been assigned as the <strong>Designated Manager</strong> for <strong>${tenant.name}</strong> on the PMS Platform.</p>
        <p>As a Designated Manager, you are authorized to:</p>
        <ul>
          <li>Upload Excel sheets to onboard employees</li>
          <li>Create and manage employee accounts</li>
          <li>Resend employee credentials</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/admin/excel-upload" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Go to Upload Portal
          </a>
        </div>
      </div>`,
    ).catch((err: Error) => {
      logger.warn('Failed to send designated manager assignment email', { error: err.message });
    });

    auditLogger('DESIGNATED_MANAGER_ASSIGNED', assignedBy, tenantId, 'tenant', tenantId, {
      managerId: managerUserId,
      managerEmail: managerUser.email,
    });

    return {
      tenantId,
      designatedManagerId: managerUserId,
      managerEmail: managerUser.email,
      managerName: `${managerUser.firstName} ${managerUser.lastName}`,
    };
  }

  async getDesignatedManager(tenantId: string) {
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { designatedManagerId: true },
    });

    if (!tenant) throw new NotFoundError('Tenant', tenantId);
    if (!tenant.designatedManagerId) return null;

    const manager = await prisma.user.findFirst({
      where: { id: tenant.designatedManagerId, tenantId, deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });

    return manager;
  }

  // ============================================================================
  // USER MANAGEMENT (Cross-tenant)
  // ============================================================================

  async listUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    tenantId?: string;
    role?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };

    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.role) {
      where.userRoles = { some: { role: { name: { contains: params.role, mode: 'insensitive' } } } };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
          userRoles: { include: { role: { select: { name: true } } } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const data = users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.userRoles.map((ur) => ur.role.name).join(', '),
      status: u.isActive ? (u.archivedAt ? 'ARCHIVED' : 'ACTIVE') : 'INACTIVE',
      tenantId: u.tenantId,
      tenantName: u.tenant.name,
      lastLogin: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      mfaEnabled: u.mfaEnabled,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUser(id: string, options?: { checkViewPermission?: boolean }) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        tenant: { select: { id: true, name: true, slug: true, superAdminCanView: true } },
        userRoles: { include: { role: true } },
        department: { select: { id: true, name: true } },
      },
    });

    if (!user) throw new NotFoundError('User', id);

    // Check if tenant has granted Super Admin permission to view employee details
    if (options?.checkViewPermission && !user.tenant.superAdminCanView) {
      throw new AuthorizationError(
        'This organization has not granted platform admin access to view employee details'
      );
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      role: user.userRoles.map((ur) => ur.role.name).join(', '),
      roles: user.userRoles.map((ur) => ur.role.name),
      status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      lastLogin: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      mfaEnabled: user.mfaEnabled,
      level: user.level,
      jobTitle: user.jobTitle,
      department: user.department,
      archivedAt: user.archivedAt?.toISOString() ?? null,
    };
  }

  async suspendUser(id: string, reason: string, suspendedBy: string) {
    const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundError('User', id);

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    auditLogger('USER_SUSPENDED', suspendedBy, user.tenantId, 'user', id, { reason });
  }

  async activateUser(id: string, activatedBy: string) {
    const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundError('User', id);

    await prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    auditLogger('USER_ACTIVATED', activatedBy, user.tenantId, 'user', id);
  }

  async resetUserPassword(id: string, resetBy: string) {
    const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundError('User', id);

    const tempPassword = uuidv4().slice(0, 12);
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    // Send password reset email
    emailService.sendMail(
      user.email,
      'PMS Platform - Password Reset by Admin',
      `<p>Hi ${user.firstName},</p>
       <p>Your password has been reset by an administrator.</p>
       <p>Temporary password: <code>${tempPassword}</code></p>
       <p>Please log in and change your password immediately.</p>`
    ).catch((err: Error) => {
      logger.warn('Failed to send password reset email', { error: err.message });
    });

    auditLogger('PASSWORD_RESET_BY_ADMIN', resetBy, user.tenantId, 'user', id);
  }

  async disableUserMfa(id: string, disabledBy: string) {
    const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundError('User', id);

    await prisma.user.update({
      where: { id },
      data: { mfaEnabled: false, mfaSecret: null },
    });

    auditLogger('MFA_DISABLED_BY_ADMIN', disabledBy, user.tenantId, 'user', id);
  }

  // ============================================================================
  // SYSTEM METRICS
  // ============================================================================

  async getSystemMetrics() {
    const [totalTenants, activeTenants, totalUsers, activeUsers] = await Promise.all([
      prisma.tenant.count({ where: { deletedAt: null, slug: { not: 'platform' } } }),
      prisma.tenant.count({ where: { isActive: true, deletedAt: null, slug: { not: 'platform' } } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { isActive: true, deletedAt: null } }),
    ]);

    let redisHealthy = false;
    try {
      const redis = getRedisClient();
      await redis.ping();
      redisHealthy = true;
    } catch { /* ignore */ }

    return {
      totalTenants,
      activeTenants,
      totalUsers,
      activeUsers,
      monthlyActiveUsers: activeUsers,
      storageUsedGb: 0,
      apiRequestsToday: 0,
      errorRate: 0,
      avgResponseTime: 0,
      uptime: process.uptime(),
      redisHealthy,
    };
  }

  /**
   * Get tenant plan distribution for dashboard pie chart.
   */
  async getPlanDistribution() {
    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null, slug: { not: 'platform' } },
      select: { subscriptionPlan: true },
    });

    const counts: Record<string, number> = {};
    for (const t of tenants) {
      const plan = t.subscriptionPlan || 'FREE';
      counts[plan] = (counts[plan] || 0) + 1;
    }

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }

  /**
   * Get aggregated dashboard stats including plan distribution and system health.
   */
  async getDashboardStats() {
    const [metrics, planDistribution, health] = await Promise.all([
      this.getSystemMetrics(),
      this.getPlanDistribution(),
      this.getSystemHealth(),
    ]);

    return {
      ...metrics,
      planDistribution,
      health: health.services,
      healthStatus: health.status,
    };
  }

  async getSystemHealth() {
    const services: Record<string, string> = {};

    try {
      await prisma.$queryRaw`SELECT 1`;
      services.database = 'healthy';
    } catch {
      services.database = 'unhealthy';
    }

    try {
      const redis = getRedisClient();
      await redis.ping();
      services.redis = 'healthy';
    } catch {
      services.redis = 'unhealthy';
    }

    services.api = 'healthy';

    const allHealthy = Object.values(services).every((s) => s === 'healthy');

    return { status: allHealthy ? 'healthy' : 'degraded', services };
  }

  // ============================================================================
  // BILLING
  // ============================================================================

  async listBilling(params: { page?: number; limit?: number; status?: string }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { id: true, name: true } },
          invoices: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    const data = subscriptions.map((s) => ({
      tenantId: s.tenantId,
      tenantName: s.tenant.name,
      plan: s.plan,
      status: s.status,
      currentPeriodStart: s.startDate.toISOString(),
      currentPeriodEnd: s.endDate?.toISOString() ?? new Date(Date.now() + DAYS(30)).toISOString(),
      amount: s.totalAmount,
      currency: s.currency,
      paymentMethod: null, // Placeholder - integrate payment provider
      invoices: s.invoices.map((inv) => ({
        id: inv.id,
        number: inv.invoiceNumber,
        amount: inv.amount,
        currency: inv.currency,
        status: inv.status,
        dueDate: inv.dueDate.toISOString(),
        paidAt: inv.paidAt?.toISOString() ?? null,
      })),
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getRevenue(params: { period?: string }) {
    const subscriptions = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
    });

    const total = subscriptions.reduce((sum, s) => sum + s.totalAmount, 0);

    const byPlan: Record<string, number> = {};
    for (const s of subscriptions) {
      byPlan[s.plan] = (byPlan[s.plan] ?? 0) + s.totalAmount;
    }

    return { total, byPlan, trend: [] };
  }

  async updateTenantPlan(tenantId: string, plan: string, updatedBy: string) {
    const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, deletedAt: null } });
    if (!tenant) throw new NotFoundError('Tenant', tenantId);

    await prisma.$transaction([
      prisma.tenant.update({
        where: { id: tenantId },
        data: { subscriptionPlan: plan, subscriptionTier: plan.toLowerCase() },
      }),
      prisma.subscription.updateMany({
        where: { tenantId, status: 'ACTIVE' },
        data: { plan },
      }),
    ]);

    auditLogger('TENANT_PLAN_UPDATED', updatedBy, tenantId, 'tenant', tenantId, { plan });
  }

  async createInvoice(tenantId: string, data: {
    amount: number;
    currency?: string;
    dueDate: string;
  }, createdBy: string) {
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId, status: 'ACTIVE' },
    });

    if (!subscription) throw new NotFoundError('Active subscription for tenant', tenantId);

    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const invoice = await prisma.tenantInvoice.create({
      data: {
        subscriptionId: subscription.id,
        tenantId,
        invoiceNumber,
        amount: data.amount,
        currency: data.currency ?? 'USD',
        status: 'PENDING',
        dueDate: new Date(data.dueDate),
      },
    });

    auditLogger('INVOICE_CREATED', createdBy, tenantId, 'invoice', invoice.id);

    return invoice;
  }

  // ============================================================================
  // AUDIT
  // ============================================================================

  async listAuditLogs(params: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.userId) where.userId = params.userId;
    if (params.action) where.action = { contains: params.action, mode: 'insensitive' };
    if (params.resource) where.resource = { contains: params.resource, mode: 'insensitive' };
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) (where.createdAt as Record<string, unknown>).gte = new Date(params.startDate);
      if (params.endDate) (where.createdAt as Record<string, unknown>).lte = new Date(params.endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      }),
      prisma.auditEvent.count({ where }),
    ]);

    const data = logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      userEmail: l.user?.email ?? 'system',
      action: l.action,
      resource: l.entityType,
      resourceId: l.entityId,
      details: l.metadata,
      ipAddress: l.ipAddress ?? '',
      userAgent: l.userAgent ?? '',
      timestamp: l.createdAt.toISOString(),
      tenantId: l.tenantId,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ============================================================================
  // SECURITY
  // ============================================================================

  async getSecurityThreats() {
    const oneHourAgo = new Date(Date.now() - MS_PER_HOUR);

    // Get failed login attempts from audit events
    const failedLogins = await prisma.auditEvent.findMany({
      where: {
        action: { in: ['LOGIN_FAILED', 'CROSS_TENANT_ACCESS_BLOCKED'] },
        createdAt: { gte: oneHourAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Aggregate by IP
    const ipMap: Record<string, { count: number; lastAttempt: string }> = {};
    for (const log of failedLogins) {
      const ip = log.ipAddress ?? 'unknown';
      if (!ipMap[ip]) {
        ipMap[ip] = { count: 0, lastAttempt: log.createdAt.toISOString() };
      }
      ipMap[ip].count++;
    }

    const recentAttempts = Object.entries(ipMap)
      .map(([ip, info]) => ({ ip, count: info.count, lastAttempt: info.lastAttempt }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    // Get blocked IPs from Redis
    const redis = getRedisClient();
    const blockedKeys = await redis.keys('blocked_ip:*');
    const blocked = blockedKeys.length;

    const suspicious = recentAttempts.filter((a) => a.count >= 5).length;

    return { blocked, suspicious, recentAttempts };
  }

  async blockIp(ip: string, reason: string, blockedBy: string) {
    const redis = getRedisClient();
    const data = JSON.stringify({
      ip,
      reason,
      blockedAt: new Date().toISOString(),
      blockedBy,
    });
    // Block for 24 hours by default
    await redis.set(`blocked_ip:${ip}`, data, 'EX', 86400);

    auditLogger('IP_BLOCKED', blockedBy, 'platform', 'security', ip, { reason });

    return { success: true };
  }

  async unblockIp(ip: string, unblockedBy: string) {
    const redis = getRedisClient();
    await redis.del(`blocked_ip:${ip}`);

    auditLogger('IP_UNBLOCKED', unblockedBy, 'platform', 'security', ip);

    return { success: true };
  }

  async getBlockedIps() {
    const redis = getRedisClient();
    const keys = await redis.keys('blocked_ip:*');
    const results: Array<{ ip: string; reason: string; blockedAt: string }> = [];

    for (const key of keys) {
      const val = await redis.get(key);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          results.push({
            ip: parsed.ip,
            reason: parsed.reason,
            blockedAt: parsed.blockedAt,
          });
        } catch {
          // Skip malformed entries
        }
      }
    }

    return results;
  }

  async getActiveSessions(userId?: string) {
    const where: Record<string, unknown> = {
      expiresAt: { gt: new Date() },
    };
    if (userId) where.userId = userId;

    const sessions = await prisma.session.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      ip: s.ipAddress ?? '',
      userAgent: s.userAgent ?? '',
      createdAt: s.createdAt.toISOString(),
    }));
  }

  async terminateSession(sessionId: string) {
    await prisma.session.delete({ where: { id: sessionId } }).catch((err) => {
      logger.warn('Session deletion failed', { sessionId, error: (err as Error).message });
    });
    logger.info('Session terminated by super admin', { sessionId });
  }

  async terminateAllUserSessions(userId: string) {
    const deleted = await prisma.session.deleteMany({ where: { userId } });
    logger.info('All user sessions terminated by super admin', { userId, deletedCount: deleted.count });
  }

  // ============================================================================
  // SA USER CREATE (Cross-tenant)
  // ============================================================================

  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    role?: string;
    tenantId?: string;
  }, createdBy: string) {
    // If tenantId provided, create in that tenant. Otherwise create in platform tenant
    let tenantId = data.tenantId;
    if (!tenantId) {
      const platformTenant = await prisma.tenant.findUnique({ where: { slug: 'platform' } });
      if (!platformTenant) throw new NotFoundError('Platform tenant', 'platform');
      tenantId = platformTenant.id;
    }

    // Check tenant exists
    const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, deletedAt: null } });
    if (!tenant) throw new NotFoundError('Tenant', tenantId);

    // Check email uniqueness in tenant
    const existing = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase(), tenantId, deletedAt: null },
    });
    if (existing) throw new ConflictError(`User with email ${data.email} already exists in this tenant`);

    const tempPassword = uuidv4().slice(0, 12);
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        tenantId,
        email: data.email.toLowerCase(),
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash,
        isActive: true,
        level: 1,
        emailVerified: true,
      },
    });

    // Assign role if specified
    if (data.role) {
      const role = await prisma.role.findFirst({
        where: { tenantId, name: { contains: data.role, mode: 'insensitive' } },
      });
      if (role) {
        await prisma.userRole.create({
          data: { userId: user.id, roleId: role.id, grantedBy: createdBy },
        });
      }
    }

    // Send welcome email
    emailService.sendMail(
      user.email,
      'PMS Platform - Account Created',
      `<p>Hi ${user.firstName},</p>
       <p>An account has been created for you on the PMS Platform.</p>
       <p>Your temporary password is: <code>${tempPassword}</code></p>
       <p>Please log in and change your password immediately.</p>`
    ).catch((err: Error) => {
      logger.warn('Failed to send user creation email', { error: err.message });
    });

    auditLogger('USER_CREATED_BY_ADMIN', createdBy, tenantId, 'user', user.id, {
      email: data.email,
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
      isActive: user.isActive,
    };
  }
}

export const superAdminService = new SuperAdminService();
