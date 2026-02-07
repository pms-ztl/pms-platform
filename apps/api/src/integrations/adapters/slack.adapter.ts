import { Injectable, Logger } from '@nestjs/common';
import { WebClient } from '@slack/web-api';
import { BaseAdapter, SyncResult } from './base.adapter';

interface SlackConfig {
  botToken: string;
  signingSecret: string;
  workspaceId: string;
}

interface SlackMessage {
  channel: string;
  text?: string;
  blocks?: any[];
  attachments?: any[];
  thread_ts?: string;
}

interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  members?: string[];
}

@Injectable()
export class SlackAdapter extends BaseAdapter {
  private client: WebClient;

  constructor(private readonly config: SlackConfig) {
    super();
    this.initializeClient();
  }

  /**
   * Initialize Slack client
   */
  private initializeClient(): void {
    this.client = new WebClient(this.config.botToken, {
      logger: {
        debug: (msg) => this.logger.debug(msg),
        info: (msg) => this.logger.log(msg),
        warn: (msg) => this.logger.warn(msg),
        error: (msg) => this.logger.error(msg),
        setLevel: () => {},
        getLevel: () => 'info' as any,
        setName: () => {},
      },
    });

    this.logger.log(`Initialized Slack adapter for workspace: ${this.config.workspaceId}`);
  }

  /**
   * Test Slack connection
   */
  protected async ping(): Promise<void> {
    await this.client.auth.test();
  }

  /**
   * Send notification to channel
   */
  async sendNotification(channel: string, message: string, metadata?: any): Promise<void> {
    try {
      const result = await this.client.chat.postMessage({
        channel,
        text: message,
        metadata: metadata ? { event_type: 'pms_notification', event_payload: metadata } : undefined,
      });

      this.logger.debug(`Sent Slack notification to ${channel}: ${result.ts}`);
    } catch (error) {
      this.logger.error(`Failed to send Slack notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send direct message to user
   */
  async sendDirectMessage(userId: string, message: string): Promise<void> {
    try {
      // Open DM conversation
      const dmChannel = await this.client.conversations.open({
        users: userId,
      });

      if (!dmChannel.channel?.id) {
        throw new Error('Failed to open DM channel');
      }

      // Send message
      await this.client.chat.postMessage({
        channel: dmChannel.channel.id,
        text: message,
      });

      this.logger.debug(`Sent DM to user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send DM: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create channel
   */
  async createChannel(name: string, isPrivate: boolean = false): Promise<SlackChannel> {
    try {
      const result = await this.client.conversations.create({
        name,
        is_private: isPrivate,
      });

      if (!result.channel) {
        throw new Error('Failed to create channel');
      }

      this.logger.log(`Created Slack channel: ${name}`);

      return {
        id: result.channel.id || '',
        name: result.channel.name || '',
        isPrivate: result.channel.is_private || false,
      };
    } catch (error) {
      this.logger.error(`Failed to create channel: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send goal reminder
   */
  async sendGoalReminder(goalId: string, userId: string, goalData: any): Promise<void> {
    const message = {
      channel: userId,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🎯 *Goal Reminder*\n\n*${goalData.title}*\nDue: ${this.formatDate(goalData.dueDate)}\nProgress: ${goalData.progress}%`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Update Progress',
              },
              url: `https://app.pms-platform.com/goals/${goalId}`,
              action_id: 'update_goal',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Details',
              },
              url: `https://app.pms-platform.com/goals/${goalId}`,
              action_id: 'view_goal',
            },
          ],
        },
      ],
    };

    await this.sendBlockMessage(message);
  }

  /**
   * Send review notification
   */
  async sendReviewNotification(reviewId: string, userId: string, reviewData: any): Promise<void> {
    const message = {
      channel: userId,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `📋 *Performance Review*\n\n*${reviewData.type} Review*\nReviewee: ${reviewData.revieweeName}\nDue: ${this.formatDate(reviewData.dueDate)}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Status: *${reviewData.status}*`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Complete Review',
              },
              url: `https://app.pms-platform.com/reviews/${reviewId}`,
              style: 'primary',
              action_id: 'complete_review',
            },
          ],
        },
      ],
    };

    await this.sendBlockMessage(message);
  }

  /**
   * Send feedback received notification
   */
  async sendFeedbackNotification(userId: string, feedbackData: any): Promise<void> {
    const emoji = feedbackData.type === 'POSITIVE' ? '👍' : '💡';

    const message = {
      channel: userId,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *New Feedback Received*\n\nFrom: ${feedbackData.giverName}\nType: ${feedbackData.type}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `_"${feedbackData.content.substring(0, 200)}${feedbackData.content.length > 200 ? '...' : ''}"_`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Feedback',
              },
              url: `https://app.pms-platform.com/feedback/${feedbackData.id}`,
              action_id: 'view_feedback',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Acknowledge',
              },
              action_id: 'acknowledge_feedback',
              value: feedbackData.id,
            },
          ],
        },
      ],
    };

    await this.sendBlockMessage(message);
  }

  /**
   * Send one-on-one reminder
   */
  async sendOneOnOneReminder(userId: string, meetingData: any): Promise<void> {
    const message = {
      channel: userId,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🗓️ *1-on-1 Meeting Reminder*\n\nWith: ${meetingData.participantName}\nScheduled: ${this.formatDateTime(meetingData.scheduledAt)}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: meetingData.agenda ? `Agenda:\n${meetingData.agenda}` : 'No agenda set',
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Add to Calendar',
              },
              url: meetingData.calendarLink,
              action_id: 'add_calendar',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Details',
              },
              url: `https://app.pms-platform.com/one-on-ones/${meetingData.id}`,
              action_id: 'view_meeting',
            },
          ],
        },
      ],
    };

    await this.sendBlockMessage(message);
  }

  /**
   * Send promotion notification
   */
  async sendPromotionNotification(userId: string, promotionData: any): Promise<void> {
    const message = {
      channel: userId,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🎉 *Promotion Recommendation*\n\n*${promotionData.currentRole}* → *${promotionData.targetRole}*\nReadiness Score: ${promotionData.readinessScore}%`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Recommended by: ${promotionData.recommendedBy}\n\n${promotionData.reason}`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Details',
              },
              url: `https://app.pms-platform.com/promotions/${promotionData.id}`,
              style: 'primary',
              action_id: 'view_promotion',
            },
          ],
        },
      ],
    };

    await this.sendBlockMessage(message);
  }

  /**
   * Send PIP notification
   */
  async sendPIPNotification(userId: string, pipData: any): Promise<void> {
    const message = {
      channel: userId,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `📊 *Performance Improvement Plan*\n\nType: ${pipData.pipType}\nDuration: ${pipData.duration} days\nStart Date: ${this.formatDate(pipData.startDate)}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Your manager has created a performance improvement plan to help you succeed. Please review the goals and action items.`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Review PIP',
              },
              url: `https://app.pms-platform.com/pips/${pipData.id}`,
              style: 'primary',
              action_id: 'review_pip',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Schedule Meeting',
              },
              action_id: 'schedule_pip_meeting',
              value: pipData.id,
            },
          ],
        },
      ],
    };

    await this.sendBlockMessage(message);
  }

  /**
   * Send organization health alert
   */
  async sendOrgHealthAlert(channel: string, alertData: any): Promise<void> {
    const severityEmoji = {
      LOW: 'ℹ️',
      MEDIUM: '⚠️',
      HIGH: '🚨',
      CRITICAL: '🔴',
    };

    const message = {
      channel,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${severityEmoji[alertData.severity]} *Organizational Health Alert*\n\n*${alertData.category}*\n${alertData.insight}`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Severity:*\n${alertData.severity}`,
            },
            {
              type: 'mrkdwn',
              text: `*Affected:*\n${alertData.affectedCount} employees`,
            },
          ],
        },
        ...(alertData.recommendedActions?.length > 0
          ? [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Recommended Actions:*\n${alertData.recommendedActions.map((a: string) => `• ${a}`).join('\n')}`,
                },
              },
            ]
          : []),
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Details',
              },
              url: 'https://app.pms-platform.com/org-health',
              action_id: 'view_org_health',
            },
          ],
        },
      ],
    };

    await this.sendBlockMessage(message);
  }

  /**
   * Send block message
   */
  private async sendBlockMessage(message: any): Promise<void> {
    try {
      await this.client.chat.postMessage(message);
    } catch (error) {
      this.logger.error(`Failed to send block message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync users from Slack workspace
   */
  async syncUsers(): Promise<SyncResult> {
    const result = this.createSyncResult();

    try {
      this.logger.log('Starting Slack users sync...');

      const users = await this.client.users.list();

      if (!users.members) {
        return this.finalizeSyncResult(result);
      }

      result.recordsProcessed = users.members.length;

      for (const member of users.members) {
        if (member.deleted || member.is_bot) {
          result.recordsSkipped++;
          continue;
        }

        try {
          // Transform and sync user
          const userData = {
            externalId: member.id,
            email: member.profile?.email,
            firstName: member.profile?.first_name,
            lastName: member.profile?.last_name,
            displayName: member.profile?.display_name,
            avatarUrl: member.profile?.image_192,
            metadata: {
              source: 'slack',
              syncedAt: new Date().toISOString(),
            },
          };

          // In production: upsert user
          result.recordsCreated++;
        } catch (error) {
          result.errors.push(`Failed to sync user ${member.id}: ${error.message}`);
          result.recordsSkipped++;
        }
      }

      return this.finalizeSyncResult(result);
    } catch (error) {
      return this.handleSyncError(result, error);
    }
  }

  /**
   * Format date
   */
  private formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Format date and time
   */
  private formatDateTime(date: string | Date): string {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
