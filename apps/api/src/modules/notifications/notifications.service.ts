// @ts-nocheck
// TODO: Fix type mismatches with Prisma schema
import { PrismaClient, NotificationStatus } from '@prisma/client';
import { logger, auditLogger } from '../../utils/logger';
import { cacheGet, cacheSet, cacheDelete } from '../../utils/redis';
import { emailService } from '../../services/email';

const prisma = new PrismaClient();

// Define local types since they're not in Prisma schema
type NotificationType = 'GOAL_CREATED' | 'GOAL_UPDATED' | 'GOAL_COMPLETED' | 'REVIEW_ASSIGNED' | 'REVIEW_COMPLETED' | 'FEEDBACK_RECEIVED' | 'CALIBRATION_INVITE' | 'ONE_ON_ONE_REMINDER' | 'SYSTEM';
type NotificationChannel = 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS';

export interface SendNotificationInput {
  userId: string;
  tenantId: string;
  type: NotificationType;
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
      templateId,
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
          templateId,
          priority,
          status: scheduledFor ? NotificationStatus.SCHEDULED : NotificationStatus.PENDING,
          scheduledFor,
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
        await prisma.notification.update({
          where: { id: notification.id },
          data: { status: NotificationStatus.SKIPPED },
        });
        return;
      }

      // Send based on channel
      switch (channel) {
        case NotificationChannel.EMAIL:
          await this.sendEmail(notification.id, userId, title, body, data);
          break;
        case NotificationChannel.PUSH:
          await this.sendPush(notification.id, userId, title, body, data);
          break;
        case NotificationChannel.IN_APP:
          await this.sendInApp(notification.id, userId, title, body, data);
          break;
        case NotificationChannel.SLACK:
          await this.sendSlack(notification.id, userId, title, body, data);
          break;
        case NotificationChannel.TEAMS:
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
    type: NotificationType,
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
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
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
  async getUserPreferences(userId: string, tenantId: string): Promise<NotificationPreferences> {
    // Check cache first
    const cacheKey = `notification:preferences:${userId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Get from database (would be stored in a user_settings table)
    // For now, return defaults
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
    await redis.set(cacheKey, JSON.stringify(defaults), 'EX', 300);

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

    // Save to database (would update user_settings table)
    // For now, just cache it
    const cacheKey = `notification:preferences:${userId}`;
    await redis.set(cacheKey, JSON.stringify(updated), 'EX', 300);

    return updated;
  }

  /**
   * Check if notification should be sent based on preferences
   */
  private shouldSend(
    type: NotificationType,
    channel: NotificationChannel,
    preferences: NotificationPreferences
  ): boolean {
    // Check channel is enabled
    switch (channel) {
      case NotificationChannel.EMAIL:
        if (!preferences.emailEnabled) return false;
        break;
      case NotificationChannel.PUSH:
        if (!preferences.pushEnabled) return false;
        break;
      case NotificationChannel.IN_APP:
        if (!preferences.inAppEnabled) return false;
        break;
      case NotificationChannel.SLACK:
        if (!preferences.slackEnabled) return false;
        break;
      case NotificationChannel.TEAMS:
        if (!preferences.teamsEnabled) return false;
        break;
    }

    // Check type-specific preferences
    switch (type) {
      case NotificationType.REVIEW_REMINDER:
        return channel === NotificationChannel.EMAIL
          ? preferences.emailReviewReminders
          : preferences.pushReviewReminders;
      case NotificationType.FEEDBACK_RECEIVED:
        return channel === NotificationChannel.EMAIL
          ? preferences.emailFeedbackReceived
          : preferences.pushFeedbackReceived;
      case NotificationType.GOAL_UPDATE:
        return preferences.emailGoalUpdates;
      // Add more type checks as needed
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
    data?: Record<string, any>
  ): Promise<void> {
    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user?.email) {
      logger.warn('Cannot send email - user has no email', { userId });
      return;
    }

    // Send email via SMTP (nodemailer)
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
   * Send push notification
   */
  private async sendPush(
    notificationId: string,
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    // TODO: Get user's push tokens from device registration
    // TODO: Integrate with FCM or APNS

    logger.info('Push notification', {
      notificationId,
      userId,
      title,
      body,
    });

    // Example FCM integration:
    // const tokens = await this.getUserPushTokens(userId);
    // await firebase.messaging().sendMulticast({
    //   tokens,
    //   notification: { title, body },
    //   data,
    // });
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
    // Publish to Redis for WebSocket servers to pick up
    await redis.publish(`notifications:${userId}`, JSON.stringify({
      id: notificationId,
      title,
      body,
      data,
      timestamp: new Date().toISOString(),
    }));

    logger.info('In-app notification published', { notificationId, userId });
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(
    notificationId: string,
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    // TODO: Get user's Slack user ID from integration settings
    // TODO: Send via Slack Web API

    logger.info('Slack notification', {
      notificationId,
      userId,
      title,
      body,
    });

    // Example Slack integration:
    // const slackUserId = await this.getUserSlackId(userId);
    // await slack.chat.postMessage({
    //   channel: slackUserId,
    //   text: title,
    //   blocks: [{ type: 'section', text: { type: 'mrkdwn', text: body } }],
    // });
  }

  /**
   * Send Microsoft Teams notification
   */
  private async sendTeams(
    notificationId: string,
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    // TODO: Get user's Teams user ID from integration settings
    // TODO: Send via MS Graph API

    logger.info('Teams notification', {
      notificationId,
      userId,
      title,
      body,
    });

    // Example Teams integration:
    // const teamsUserId = await this.getUserTeamsId(userId);
    // await graphClient.api(`/users/${teamsUserId}/chats`)
    //   .post({ message: { body: { content: body } } });
  }

  // ============== Notification Event Helpers ==============

  /**
   * Notify user about new feedback
   */
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

    await this.send({
      userId: recipientId,
      tenantId,
      type: NotificationType.FEEDBACK_RECEIVED,
      channel: NotificationChannel.IN_APP,
      title,
      body,
      data: { feedbackType, isAnonymous },
    });

    // Also send email
    await this.send({
      userId: recipientId,
      tenantId,
      type: NotificationType.FEEDBACK_RECEIVED,
      channel: NotificationChannel.EMAIL,
      title,
      body,
      data: { feedbackType, isAnonymous },
    });
  }

  /**
   * Notify user about review assignment
   */
  async notifyReviewAssigned(
    reviewerId: string,
    tenantId: string,
    revieweeName: string,
    cycleName: string,
    dueDate: Date
  ): Promise<void> {
    const title = 'Review Assigned';
    const body = `You have been assigned to review ${revieweeName} for ${cycleName}. Due: ${dueDate.toLocaleDateString()}`;

    await this.send({
      userId: reviewerId,
      tenantId,
      type: NotificationType.REVIEW_ASSIGNED,
      channel: NotificationChannel.IN_APP,
      title,
      body,
      data: { revieweeName, cycleName, dueDate: dueDate.toISOString() },
    });

    await this.send({
      userId: reviewerId,
      tenantId,
      type: NotificationType.REVIEW_ASSIGNED,
      channel: NotificationChannel.EMAIL,
      title,
      body,
      data: { revieweeName, cycleName, dueDate: dueDate.toISOString() },
    });
  }

  /**
   * Notify user about review completion
   */
  async notifyReviewCompleted(
    revieweeId: string,
    tenantId: string,
    cycleName: string
  ): Promise<void> {
    const title = 'Review Completed';
    const body = `Your performance review for ${cycleName} has been completed and is ready for acknowledgment.`;

    await this.send({
      userId: revieweeId,
      tenantId,
      type: NotificationType.REVIEW_COMPLETED,
      channel: NotificationChannel.IN_APP,
      title,
      body,
      data: { cycleName },
    });

    await this.send({
      userId: revieweeId,
      tenantId,
      type: NotificationType.REVIEW_COMPLETED,
      channel: NotificationChannel.EMAIL,
      title,
      body,
      data: { cycleName },
    });
  }

  /**
   * Send review reminder
   */
  async notifyReviewReminder(
    reviewerId: string,
    tenantId: string,
    revieweeName: string,
    daysRemaining: number
  ): Promise<void> {
    const title = 'Review Reminder';
    const body = `Reminder: Your review of ${revieweeName} is due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`;

    await this.send({
      userId: reviewerId,
      tenantId,
      type: NotificationType.REVIEW_REMINDER,
      channel: NotificationChannel.IN_APP,
      title,
      body,
      data: { revieweeName, daysRemaining },
    });

    if (daysRemaining <= 3) {
      // Send email for urgent reminders
      await this.send({
        userId: reviewerId,
        tenantId,
        type: NotificationType.REVIEW_REMINDER,
        channel: NotificationChannel.EMAIL,
        title,
        body,
        priority: daysRemaining === 1 ? 'URGENT' : 'HIGH',
        data: { revieweeName, daysRemaining },
      });
    }
  }

  /**
   * Notify about goal progress update
   */
  async notifyGoalProgress(
    userId: string,
    tenantId: string,
    goalTitle: string,
    progress: number,
    updatedBy: string
  ): Promise<void> {
    const title = 'Goal Progress Updated';
    const body = `Goal "${goalTitle}" progress updated to ${progress}% by ${updatedBy}.`;

    await this.send({
      userId,
      tenantId,
      type: NotificationType.GOAL_UPDATE,
      channel: NotificationChannel.IN_APP,
      title,
      body,
      data: { goalTitle, progress, updatedBy },
    });
  }

  /**
   * Notify about calibration session
   */
  async notifyCalibrationScheduled(
    participantIds: string[],
    tenantId: string,
    sessionName: string,
    scheduledDate: Date
  ): Promise<void> {
    const title = 'Calibration Session Scheduled';
    const body = `You have been invited to the calibration session "${sessionName}" on ${scheduledDate.toLocaleDateString()}.`;

    await this.sendToUsers(
      participantIds,
      tenantId,
      NotificationType.CALIBRATION_SCHEDULED,
      NotificationChannel.EMAIL,
      title,
      body,
      { sessionName, scheduledDate: scheduledDate.toISOString() }
    );
  }
}

export const notificationsService = new NotificationsService();
