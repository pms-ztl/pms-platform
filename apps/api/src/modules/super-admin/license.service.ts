import { prisma } from '@pms/database';
import { ValidationError } from '../../utils/errors';

/** Maximum org levels allowed per subscription plan */
export const PLAN_MAX_LEVELS: Record<string, number> = {
  FREE: 4,
  STARTER: 8,
  PROFESSIONAL: 12,
  ENTERPRISE: 16,
};

export class LicenseService {
  /**
   * Get the number of active (non-archived, non-deleted) users for a tenant.
   */
  async getActiveUserCount(tenantId: string): Promise<number> {
    return prisma.user.count({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        archivedAt: null,
      },
    });
  }

  /**
   * Check if the tenant has available seats for new users.
   * Returns { available: boolean, activeCount, licenseCount, remaining }
   */
  async checkSeatAvailability(tenantId: string, additionalSeats: number = 1) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { licenseCount: true, maxUsers: true, subscriptionStatus: true, subscriptionExpiresAt: true },
    });

    if (!tenant) {
      throw new ValidationError('Tenant not found');
    }

    // Block user creation if subscription is not active
    const blockedStatuses = ['EXPIRED', 'SUSPENDED', 'CANCELLED'];
    if (tenant.subscriptionStatus && blockedStatuses.includes(tenant.subscriptionStatus)) {
      throw new ValidationError(
        `Subscription is ${tenant.subscriptionStatus.toLowerCase()}. New user creation is disabled until the subscription is renewed.`,
        { subscriptionStatus: tenant.subscriptionStatus }
      );
    }

    // Also check expiration date even if status hasn't been updated yet
    if (tenant.subscriptionExpiresAt && tenant.subscriptionExpiresAt < new Date()) {
      throw new ValidationError(
        'Subscription has expired. New user creation is disabled until the subscription is renewed.',
        { subscriptionExpiresAt: tenant.subscriptionExpiresAt.toISOString() }
      );
    }

    const effectiveLimit = Math.max(tenant.licenseCount, tenant.maxUsers);
    const activeCount = await this.getActiveUserCount(tenantId);
    const remaining = effectiveLimit - activeCount;

    return {
      available: remaining >= additionalSeats,
      activeCount,
      licenseCount: effectiveLimit,
      remaining,
    };
  }

  /**
   * Enforce license limit - throws if adding users would exceed the limit.
   */
  async enforceSeatLimit(tenantId: string, additionalSeats: number = 1): Promise<void> {
    const { available, activeCount, licenseCount } = await this.checkSeatAvailability(tenantId, additionalSeats);

    if (!available) {
      throw new ValidationError(
        `License limit reached. Active users: ${activeCount}/${licenseCount}. ` +
        `Cannot add ${additionalSeats} more user(s). Please purchase additional licenses or archive inactive employees.`,
        { activeCount, licenseCount, requested: additionalSeats }
      );
    }
  }

  /**
   * Validate that a level is within the tenant's max level configuration.
   */
  async validateLevelForTenant(tenantId: string, level: number): Promise<void> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { maxLevel: true, subscriptionPlan: true },
    });

    if (!tenant) {
      throw new ValidationError('Tenant not found');
    }

    if (level < 1 || level > 16) {
      throw new ValidationError(`Level must be between 1 and 16. Got: ${level}`);
    }

    // Apply both the tenant's configured maxLevel AND the plan-based cap
    const planCap = PLAN_MAX_LEVELS[tenant.subscriptionPlan] ?? 16;
    const effectiveMax = Math.min(tenant.maxLevel, planCap);

    if (level > effectiveMax) {
      const msg = level > planCap
        ? `Level ${level} exceeds the ${tenant.subscriptionPlan} plan limit of ${planCap} levels. Upgrade your plan to unlock more levels.`
        : `Level ${level} exceeds this organization's maximum level of ${effectiveMax}. Contact your admin to increase the max level configuration.`;
      throw new ValidationError(msg, { level, maxLevel: effectiveMax, planCap });
    }
  }

  /**
   * Get license usage summary for a tenant.
   */
  async getLicenseUsage(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        licenseCount: true,
        maxUsers: true,
        maxLevel: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        settings: true,
      },
    });

    if (!tenant) {
      throw new ValidationError('Tenant not found');
    }

    const [activeCount, archivedCount, totalCount, aiAccessCount] = await Promise.all([
      prisma.user.count({ where: { tenantId, isActive: true, deletedAt: null, archivedAt: null } }),
      prisma.user.count({ where: { tenantId, archivedAt: { not: null }, deletedAt: null } }),
      prisma.user.count({ where: { tenantId, deletedAt: null } }),
      prisma.user.count({ where: { tenantId, isActive: true, deletedAt: null, aiAccessEnabled: true } }),
    ]);

    const effectiveLimit = Math.max(tenant.licenseCount, tenant.maxUsers);

    // Extract AI feature status from tenant settings
    const settings = (tenant.settings as Record<string, unknown>) ?? {};
    const features = (settings.features as Record<string, unknown>) ?? {};
    const aiEnabled = !!features.agenticAI;

    return {
      activeUsers: activeCount,
      archivedUsers: archivedCount,
      totalUsers: totalCount,
      licenseCount: effectiveLimit,
      remaining: effectiveLimit - activeCount,
      usagePercent: effectiveLimit > 0 ? Math.round((activeCount / effectiveLimit) * 100) : 0,
      maxLevel: tenant.maxLevel,
      plan: tenant.subscriptionPlan,
      status: tenant.subscriptionStatus,
      expiresAt: tenant.subscriptionExpiresAt?.toISOString() ?? null,
      aiEnabled,
      aiAccessCount,
    };
  }
}

export const licenseService = new LicenseService();
