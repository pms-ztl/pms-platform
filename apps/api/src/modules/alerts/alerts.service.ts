import { prisma } from '@pms/database';
import { logger } from '../../utils/logger';
import { MS_PER_HOUR } from '../../utils/constants';
import { EmailService } from '../../services/email/email.service';
import {
  licenseCapacityWarningTemplate,
  licenseLimitReachedTemplate,
  subscriptionExpiryWarningTemplate,
  subscriptionExpiredTemplate,
  securityAlertTemplate,
} from '../../services/email/email-templates';

const emailService = new EmailService();

class AlertsService {
  /**
   * Check license usage for all tenants and send alerts when nearing limits
   */
  async checkLicenseUsage(): Promise<void> {
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true, slug: { not: 'platform' } },
      select: {
        id: true,
        name: true,
        licenseCount: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        ceoEmail: true,
        users: {
          where: { isActive: true, archivedAt: null, deletedAt: null },
          select: { id: true },
        },
      },
    });

    for (const tenant of tenants) {
      const activeCount = tenant.users.length;
      const licenseCount = tenant.licenseCount || 0;
      if (licenseCount === 0) continue;

      const usagePercent = (activeCount / licenseCount) * 100;

      // Get tenant admin emails + CEO
      const admins = await this.getTenantAdmins(tenant.id);
      const ceoRecipients = tenant.ceoEmail ? [tenant.ceoEmail] : [];
      const allRecipients = [...new Set([...admins, ...ceoRecipients])];
      if (allRecipients.length === 0) continue;

      if (usagePercent >= 100) {
        await this.sendAlert(
          tenant.id,
          allRecipients,
          'LICENSE_LIMIT_REACHED',
          `License Limit Reached - ${tenant.name}`,
          `Your organization "${tenant.name}" has reached the maximum license limit of ${licenseCount} seats. ` +
          `All ${licenseCount} seats are currently in use. To add more employees, please purchase additional licenses or archive inactive employees.`,
          licenseLimitReachedTemplate(tenant.name, activeCount, licenseCount)
        );
      } else if (usagePercent >= 95) {
        await this.sendAlert(
          tenant.id,
          allRecipients,
          'LICENSE_95_PERCENT',
          `License Usage Critical - ${tenant.name}`,
          `Your organization "${tenant.name}" is using ${activeCount} of ${licenseCount} licensed seats (${usagePercent.toFixed(0)}%). ` +
          `You are almost at capacity. Consider purchasing additional licenses or archiving inactive employees.`,
          licenseCapacityWarningTemplate(tenant.name, activeCount, licenseCount, Math.round(usagePercent))
        );
      } else if (usagePercent >= 90) {
        await this.sendAlert(
          tenant.id,
          allRecipients,
          'LICENSE_90_PERCENT',
          `License Usage Alert - ${tenant.name}`,
          `Your organization "${tenant.name}" is using ${activeCount} of ${licenseCount} licensed seats (${usagePercent.toFixed(0)}%). ` +
          `Consider purchasing additional licenses to accommodate growth.`,
          licenseCapacityWarningTemplate(tenant.name, activeCount, licenseCount, Math.round(usagePercent))
        );
      }
    }
  }

  /**
   * Check for expiring subscriptions and send alerts
   */
  async checkSubscriptionExpiry(): Promise<void> {
    const now = new Date();
    const alertThresholds = [30, 15, 7, 3, 1]; // days before expiry

    for (const days of alertThresholds) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const expiringTenants = await prisma.tenant.findMany({
        where: {
          isActive: true,
          slug: { not: 'platform' },
          subscriptionExpiresAt: {
            gte: targetDate,
            lt: nextDay,
          },
          subscriptionStatus: { in: ['ACTIVE', 'TRIAL'] },
        },
        select: { id: true, name: true, subscriptionExpiresAt: true, subscriptionPlan: true, ceoEmail: true },
      });

      for (const tenant of expiringTenants) {
        const admins = await this.getTenantAdmins(tenant.id);
        const ceoRecipients = tenant.ceoEmail ? [tenant.ceoEmail] : [];
        const recipients = [...new Set([...admins, ...ceoRecipients])];
        if (recipients.length === 0) continue;

        const expiresAt = tenant.subscriptionExpiresAt?.toLocaleDateString() ?? 'Unknown';

        await this.sendAlert(
          tenant.id,
          recipients,
          'SUBSCRIPTION_EXPIRING',
          `Subscription Expiring in ${days} Day${days > 1 ? 's' : ''} - ${tenant.name}`,
          `Your ${tenant.subscriptionPlan} subscription for "${tenant.name}" will expire on ` +
          `${expiresAt}. Please renew your subscription to avoid service interruption.`,
          subscriptionExpiryWarningTemplate(tenant.name, days, expiresAt)
        );
      }
    }

    // Handle already expired subscriptions
    const expiredTenants = await prisma.tenant.findMany({
      where: {
        isActive: true,
        slug: { not: 'platform' },
        subscriptionExpiresAt: { lt: now },
        subscriptionStatus: { in: ['ACTIVE', 'TRIAL'] },
      },
    });

    for (const tenant of expiredTenants) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { subscriptionStatus: 'EXPIRED' },
      });

      const admins = await this.getTenantAdmins(tenant.id);
      const ceoRecipients = tenant.ceoEmail ? [tenant.ceoEmail] : [];
      const recipients = [...new Set([...admins, ...ceoRecipients])];
      if (recipients.length > 0) {
        const expiredAt = tenant.subscriptionExpiresAt?.toLocaleDateString() ?? 'Unknown';

        await this.sendAlert(
          tenant.id,
          recipients,
          'SUBSCRIPTION_EXPIRED',
          `Subscription Expired - ${tenant.name}`,
          `Your subscription for "${tenant.name}" has expired. ` +
          `Some features may be restricted until you renew your subscription. ` +
          `Please contact the platform administrator to renew.`,
          subscriptionExpiredTemplate(tenant.name, expiredAt)
        );
      }

      logger.warn('Tenant subscription expired', { tenantId: tenant.id, name: tenant.name });
    }
  }

  /**
   * Send alert for suspicious activity (bulk deletions, failed logins, cross-tenant access)
   */
  async checkSuspiciousActivity(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - MS_PER_HOUR);
    const now = new Date();
    const timestamp = now.toISOString();

    const tenants = await prisma.tenant.findMany({
      where: { isActive: true, slug: { not: 'platform' } },
      select: { id: true, name: true, ceoEmail: true },
    });

    for (const tenant of tenants) {
      const admins = await this.getTenantAdmins(tenant.id);
      if (admins.length === 0) continue;

      const platformAdmins = await this.getPlatformAdmins();
      // Include CEO email if configured (p2.txt requirement: notify admin AND CEO)
      const ceoRecipients = tenant.ceoEmail ? [tenant.ceoEmail] : [];
      const allRecipients = [...new Set([...admins, ...ceoRecipients, ...platformAdmins])];

      // 1. Bulk user deactivations/deletions
      const recentDeactivations = await prisma.auditEvent.count({
        where: {
          tenantId: tenant.id,
          action: { in: ['USER_DEACTIVATED', 'USER_ARCHIVED', 'USER_DELETED'] },
          createdAt: { gte: oneHourAgo },
        },
      });

      if (recentDeactivations >= 5) {
        const htmlEmail = securityAlertTemplate(
          'Admin', 'Bulk Deactivation Detected',
          `${recentDeactivations} user accounts were deactivated/archived/deleted within the last hour.`,
          `Organization: ${tenant.name}\nAffected accounts: ${recentDeactivations}\nTime window: Last 1 hour`,
          timestamp
        );
        await this.sendAlert(
          tenant.id, allRecipients,
          'SUSPICIOUS_BULK_DEACTIVATION',
          `Security Alert: Unusual Activity - ${tenant.name}`,
          `${recentDeactivations} user accounts were deactivated/archived/deleted in "${tenant.name}" within the last hour. ` +
          `This may indicate unauthorized activity. Please review the audit log immediately.`,
          htmlEmail
        );
      }

      // 2. Brute force login detection (5+ failed logins for any user in last hour)
      const failedLoginUsers = await prisma.auditEvent.groupBy({
        by: ['userId'],
        where: {
          tenantId: tenant.id,
          action: 'LOGIN_FAILED',
          createdAt: { gte: oneHourAgo },
        },
        _count: { id: true },
      });

      for (const entry of failedLoginUsers) {
        if (entry._count.id >= 5 && entry.userId) {
          const targetUser = await prisma.user.findUnique({
            where: { id: entry.userId },
            select: { email: true, firstName: true, lastName: true },
          });

          const htmlEmail = securityAlertTemplate(
            'Admin', 'Brute Force Login Attempt',
            `${entry._count.id} failed login attempts detected for user ${targetUser?.email ?? 'unknown'}.`,
            `Organization: ${tenant.name}\nTarget user: ${targetUser?.firstName ?? ''} ${targetUser?.lastName ?? ''} (${targetUser?.email ?? 'unknown'})\nFailed attempts: ${entry._count.id}\nTime window: Last 1 hour`,
            timestamp
          );
          await this.sendAlert(
            tenant.id, allRecipients,
            'BRUTE_FORCE_DETECTED',
            `Security Alert: Failed Login Attempts - ${tenant.name}`,
            `${entry._count.id} failed login attempts detected for user "${targetUser?.email ?? 'unknown'}" in "${tenant.name}". ` +
            `This may indicate a brute force attack. Please review and consider locking the account.`,
            htmlEmail
          );
        }
      }

      // 3. Cross-tenant access attempts
      const crossTenantAttempts = await prisma.auditEvent.count({
        where: {
          tenantId: tenant.id,
          action: 'CROSS_TENANT_ACCESS_BLOCKED',
          createdAt: { gte: oneHourAgo },
        },
      });

      if (crossTenantAttempts >= 3) {
        const htmlEmail = securityAlertTemplate(
          'Admin', 'Cross-Tenant Access Attempts',
          `${crossTenantAttempts} cross-tenant data access attempts were blocked in the last hour.`,
          `Organization: ${tenant.name}\nBlocked attempts: ${crossTenantAttempts}\nTime window: Last 1 hour`,
          timestamp
        );
        await this.sendAlert(
          tenant.id, allRecipients,
          'CROSS_TENANT_ACCESS_ALERT',
          `Security Alert: Cross-Tenant Access Attempts - ${tenant.name}`,
          `${crossTenantAttempts} cross-tenant data access attempts were blocked for "${tenant.name}" in the last hour. ` +
          `This may indicate unauthorized access attempts. Please review the security audit log.`,
          htmlEmail
        );
      }
    }
  }

  /**
   * Get tenant admin users' emails
   */
  private async getTenantAdmins(tenantId: string): Promise<string[]> {
    const adminUsers = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        userRoles: {
          some: {
            role: {
              name: { in: ['Tenant Admin', 'HR Admin'] },
            },
          },
        },
      },
      select: { email: true },
    });
    return adminUsers.map((u) => u.email);
  }

  /**
   * Get platform super admin emails
   */
  private async getPlatformAdmins(): Promise<string[]> {
    const platformTenant = await prisma.tenant.findFirst({
      where: { slug: 'platform' },
    });
    if (!platformTenant) return [];

    const superAdmins = await prisma.user.findMany({
      where: {
        tenantId: platformTenant.id,
        isActive: true,
        deletedAt: null,
        userRoles: {
          some: {
            role: {
              name: { in: ['Super Admin', 'System Admin'] },
            },
          },
        },
      },
      select: { email: true },
    });
    return superAdmins.map((u) => u.email);
  }

  /**
   * Send alert email and create in-app notification
   */
  private async sendAlert(
    tenantId: string,
    recipientEmails: string[],
    alertType: string,
    subject: string,
    message: string,
    htmlTemplate?: string
  ): Promise<void> {
    // Send email to all recipients
    for (const email of recipientEmails) {
      try {
        const html = htmlTemplate || `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; border-radius: 12px 12px 0 0;">
              <h2 style="color: white; margin: 0; font-size: 18px;">${subject}</h2>
            </div>
            <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="color: #374151; line-height: 1.6;">${message}</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
              <p style="color: #9ca3af; font-size: 12px;">This is an automated alert from PMS Platform. Do not reply to this email.</p>
            </div>
          </div>
        `;
        await emailService.sendMail(email, subject, html);
      } catch (err) {
        logger.error('Failed to send alert email', { email, alertType, error: err });
      }
    }

    // Create in-app notification for tenant admins
    try {
      const adminUsers = await prisma.user.findMany({
        where: {
          tenantId,
          isActive: true,
          email: { in: recipientEmails },
        },
        select: { id: true },
      });

      for (const user of adminUsers) {
        await prisma.notification.create({
          data: {
            tenantId,
            userId: user.id,
            type: alertType,
            title: subject,
            body: message,
          },
        });
      }
    } catch (err) {
      logger.error('Failed to create in-app notification', { tenantId, alertType, error: err });
    }

    // Log the alert as an audit event
    try {
      await prisma.auditEvent.create({
        data: {
          tenantId,
          action: 'ALERT_SENT',
          entityType: 'ALERT',
          entityId: alertType,
          metadata: { alertType, subject, recipientCount: recipientEmails.length },
        },
      });
    } catch (err) {
      logger.error('Failed to log alert audit event', { error: err });
    }
  }
}

export const alertsService = new AlertsService();
