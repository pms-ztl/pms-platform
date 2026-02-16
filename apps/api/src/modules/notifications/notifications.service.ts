import { prisma } from '@pms/database';
import { NotificationStatus } from '@prisma/client';
import { logger } from '../../utils/logger';
import { cacheGet, cacheSet, getRedisClient, isRedisAvailable } from '../../utils/redis';
import { emailService } from '../../services/email';

type NotificationType = 'GOAL_CREATED' | 'GOAL_UPDATED' | 'GOAL_COMPLETED' | 'REVIEW_ASSIGNED' | 'REVIEW_COMPLETED' | 'FEEDBACK_RECEIVED' | 'CALIBRATION_INVITE' | 'ONE_ON_ONE_REMINDER' | 'SYSTEM';
type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms' | 'slack' | 'teams';

export interface SendNotificationInput {
  userId: string;
  tenantId: string;
  type: NotificationType | string;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, any>;
  templateId?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  scheduledFor?: Date;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  slackEnabled: boolean;
  teamsEnabled: boolean;
  emailReviewReminders: boolean;
  emailFeedbackReceived: boolean;
  emailGoalUpdates: boolean;
  emailWeeklySummary: boolean;
  pushReviewReminders: boolean;
  pushFeedbackReceived: boolean;
  pushMentions: boolean;
}

export class NotificationsService {
  /**
   * Send a notification to a user
   */
  async send(input: SendNotificationInput): Promise<void> {
    const {
      userId,
      tenantId,
      type,
      channel,
      title,
      body,
      data,
      priority = 'NORMAL',
      scheduledFor,
    } = input;

    try {
      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          tenantId,
          userId,
          type,
          channel,
          title,
          body,
          data: data || {},
          status: NotificationStatus.PENDING,
        },
      });

      // If scheduled for later, don't send now
      if (scheduledFor && scheduledFor > new Date()) {
        logger.info('Notification scheduled', { notificationId: notification.id, scheduledFor });
        return;
      }

      // Get user preferences
      const preferences = await this.getUserPreferences(userId, tenantId);

      // Check if user wants this notification
      if (!this.shouldSend(type, channel, preferences)) {
        return;
      }

      // Send based on channel
      switch (channel) {
        case 'email':
          await this.sendEmail(notification.id, userId, title, body, data);
          break;
        case 'push':
          await this.sendPush(notification.id, userId, title, body, data);
          break;
        case 'in_app':
          await this.sendInApp(notification.id, userId, title, body, data);
          break;
        case 'slack':
          await this.sendSlack(notification.id, userId, title, body, data);
          break;
        case 'teams':
          await this.sendTeams(notification.id, userId, title, body, data);
          break;
      }

      // Update status
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.SENT, sentAt: new Date() },
      });

      logger.info('Notification sent', { notificationId: notification.id, channel, type });
    } catch (error) {
      logger.error('Failed to send notification', { error, input });
      throw error;
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulk(notifications: SendNotificationInput[]): Promise<void> {
    const promises = notifications.map((n) => this.send(n));
    await Promise.allSettled(promises);
  }

  /**
   * Send notification to multiple users (same content)
   */
  async sendToUsers(
    userIds: string[],
    tenantId: string,
    type: NotificationType | string,
    channel: NotificationChannel,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    const notifications = userIds.map((userId) => ({
      userId,
      tenantId,
      type,
      channel,
      title,
      body,
      data,
    }));

    await this.sendBulk(notifications);
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    tenantId: string,
    options?: {
      unreadOnly?: boolean;
      channel?: NotificationChannel;
      limit?: number;
      offset?: number;
    }
  ) {
    const { unreadOnly = false, channel, limit = 50, offset = 0 } = options || {};

    const where: any = { userId, tenantId };

    if (unreadOnly) {
      where.readAt = null;
    }

    if (channel) {
      where.channel = channel;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        unread: await prisma.notification.count({ where: { userId, tenantId, readAt: null } }),
      },
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string, tenantId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId, tenantId },
      data: { readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string, tenantId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, tenantId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string, _tenantId: string): Promise<NotificationPreferences> {
    // Check cache first
    const cacheKey = `notification:preferences:${userId}`;
    const cached = await cacheGet<NotificationPreferences>(cacheKey);

    if (cached) {
      return cached;
    }

    // Return defaults (would be stored in a user_settings table)
    const defaults: NotificationPreferences = {
      emailEnabled: true,
      pushEnabled: true,
      inAppEnabled: true,
      slackEnabled: false,
      teamsEnabled: false,
      emailReviewReminders: true,
      emailFeedbackReceived: true,
      emailGoalUpdates: false,
      emailWeeklySummary: true,
      pushReviewReminders: true,
      pushFeedbackReceived: true,
      pushMentions: true,
    };

    // Cache for 5 minutes
    await cacheSet(cacheKey, defaults, 300);

    return defaults;
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string,
    tenantId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const current = await this.getUserPreferences(userId, tenantId);
    const updated = { ...current, ...preferences };

    const cacheKey = `notification:preferences:${userId}`;
    await cacheSet(cacheKey, updated, 300);

    return updated;
  }

  /**
   * Check if notification should be sent based on preferences
   */
  private shouldSend(
    type: NotificationType | string,
    channel: NotificationChannel,
    preferences: NotificationPreferences
  ): boolean {
    // Check channel is enabled
    switch (channel) {
      case 'email':
        if (!preferences.emailEnabled) return false;
        break;
      case 'push':
        if (!preferences.pushEnabled) return false;
        break;
      case 'in_app':
        if (!preferences.inAppEnabled) return false;
        break;
      case 'slack':
        if (!preferences.slackEnabled) return false;
        break;
      case 'teams':
        if (!preferences.teamsEnabled) return false;
        break;
    }

    // Check type-specific preferences
    switch (type) {
      case 'REVIEW_ASSIGNED':
        return channel === 'email'
          ? preferences.emailReviewReminders
          : preferences.pushReviewReminders;
      case 'FEEDBACK_RECEIVED':
        return channel === 'email'
          ? preferences.emailFeedbackReceived
          : preferences.pushFeedbackReceived;
      case 'GOAL_UPDATED':
        return preferences.emailGoalUpdates;
    }

    return true;
  }

  /**
   * Send email notification
   */
  private async sendEmail(
    notificationId: string,
    userId: string,
    title: string,
    body: string,
    _data?: Record<string, any>
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user?.email) {
      logger.warn('Cannot send email - user has no email', { userId });
      return;
    }

    try {
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2563eb, #06b6d4); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">PMS Platform</h2>
          </div>
          <div style="padding: 24px; background: white; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <h3 style="color: #1e293b;">${title}</h3>
            <p style="color: #475569; line-height: 1.6;">Hello ${user.firstName},</p>
            <p style="color: #475569; line-height: 1.6;">${body}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 12px;">This is an automated notification from PMS Platform.</p>
          </div>
        </div>
      `;
      await emailService.sendMail(user.email, title, htmlBody, body);
      logger.info('Email notification sent', { notificationId, to: user.email, subject: title });
    } catch (error) {
      logger.error('Failed to send email notification', { notificationId, to: user.email, error });
    }
  }

  /**
   * Send push notification (placeholder)
   */
  private async sendPush(
    notificationId: string,
    userId: string,
    title: string,
    body: string,
    _data?: Record<string, any>
  ): Promise<void> {
    logger.info('Push notification (not implemented)', { notificationId, userId, title, body });
  }

  /**
   * Send in-app notification (real-time via WebSocket)
   */
  private async sendInApp(
    notificationId: string,
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    if (isRedisAvailable()) {
      try {
        const redis = getRedisClient();
        await redis.publish(`notifications:${userId}`, JSON.stringify({
          id: notificationId,
          title,
          body,
          data,
          timestamp: new Date().toISOString(),
        }));
      } catch (err) {
        logger.warn('Failed to publish in-app notification to Redis', { notificationId, error: err });
      }
    }

    logger.info('In-app notification published', { notificationId, userId });
  }

  /**
   * Send Slack notification (placeholder)
   */
  private async sendSlack(
    notificationId: string,
    userId: string,
    title: string,
    body: string,
    _data?: Record<string, any>
  ): Promise<void> {
    logger.info('Slack notification (not implemented)', { notificationId, userId, title, body });
  }

  /**
   * Send Microsoft Teams notification (placeholder)
   */
  private async sendTeams(
    notificationId: string,
    userId: string,
    title: string,
    body: string,
    _data?: Record<string, any>
  ): Promise<void> {
    logger.info('Teams notification (not implemented)', { notificationId, userId, title, body });
  }

  // ============== Notification Event Helpers ==============

  async notifyFeedbackReceived(
    recipientId: string,
    tenantId: string,
    feedbackType: string,
    isAnonymous: boolean,
    senderName?: string
  ): Promise<void> {
    const title = 'New Feedback Received';
    const body = isAnonymous
      ? `You received anonymous ${feedbackType.toLowerCase()} feedback.`
      : `${senderName} sent you ${feedbackType.toLowerCase()} feedback.`;

    await this.send({ userId: recipientId, tenantId, type: 'FEEDBACK_RECEIVED', channel: 'in_app', title, body, data: { feedbackType, isAnonymous } });
    await this.send({ userId: recipientId, tenantId, type: 'FEEDBACK_RECEIVED', channel: 'email', title, body, data: { feedbackType, isAnonymous } });
  }

  async notifyReviewAssigned(
    reviewerId: string,
    tenantId: string,
    revieweeName: string,
    cycleName: string,
    dueDate: Date
  ): Promise<void> {
    const title = 'Review Assigned';
    const body = `You have been assigned to review ${revieweeName} for ${cycleName}. Due: ${dueDate.toLocaleDateString()}`;

    await this.send({ userId: reviewerId, tenantId, type: 'REVIEW_ASSIGNED', channel: 'in_app', title, body, data: { revieweeName, cycleName, dueDate: dueDate.toISOString() } });
    await this.send({ userId: reviewerId, tenantId, type: 'REVIEW_ASSIGNED', channel: 'email', title, body, data: { revieweeName, cycleName, dueDate: dueDate.toISOString() } });
  }

  async notifyReviewCompleted(
    revieweeId: string,
    tenantId: string,
    cycleName: string
  ): Promise<void> {
    const title = 'Review Completed';
    const body = `Your performance review for ${cycleName} has been completed and is ready for acknowledgment.`;

    await this.send({ userId: revieweeId, tenantId, type: 'REVIEW_COMPLETED', channel: 'in_app', title, body, data: { cycleName } });
    await this.send({ userId: revieweeId, tenantId, type: 'REVIEW_COMPLETED', channel: 'email', title, body, data: { cycleName } });
  }

  async notifyReviewReminder(
    reviewerId: string,
    tenantId: string,
    revieweeName: string,
    daysRemaining: number
  ): Promise<void> {
    const title = 'Review Reminder';
    const body = `Reminder: Your review of ${revieweeName} is due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`;

    await this.send({ userId: reviewerId, tenantId, type: 'REVIEW_ASSIGNED', channel: 'in_app', title, body, data: { revieweeName, daysRemaining } });

    if (daysRemaining <= 3) {
      await this.send({ userId: reviewerId, tenantId, type: 'REVIEW_ASSIGNED', channel: 'email', title, body, priority: daysRemaining === 1 ? 'URGENT' : 'HIGH', data: { revieweeName, daysRemaining } });
    }
  }

  async notifyGoalProgress(
    userId: string,
    tenantId: string,
    goalTitle: string,
    progress: number,
    updatedBy: string
  ): Promise<void> {
    const title = 'Goal Progress Updated';
    const body = `Goal "${goalTitle}" progress updated to ${progress}% by ${updatedBy}.`;

    await this.send({ userId, tenantId, type: 'GOAL_UPDATED', channel: 'in_app', title, body, data: { goalTitle, progress, updatedBy } });
  }

  async notifyCalibrationScheduled(
    participantIds: string[],
    tenantId: string,
    sessionName: string,
    scheduledDate: Date
  ): Promise<void> {
    const title = 'Calibration Session Scheduled';
    const body = `You have been invited to the calibration session "${sessionName}" on ${scheduledDate.toLocaleDateString()}.`;

    await this.sendToUsers(participantIds, tenantId, 'CALIBRATION_INVITE', 'email', title, body, { sessionName, scheduledDate: scheduledDate.toISOString() });
  }
}

export const notificationsService = new NotificationsService();
