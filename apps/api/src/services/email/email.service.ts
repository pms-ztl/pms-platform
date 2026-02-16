/**
 * Email Service - Nodemailer SMTP integration for PMS Platform
 * Uses Gmail SMTP with aerofyta@gmail.com
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import {
  loginAlertTemplate,
  passwordResetTemplate,
  goalReminderTemplate,
  taskCompletionTemplate,
  reviewAssignmentTemplate,
} from './email-templates';

export class EmailService {
  private transporter: Transporter | null = null;
  private readonly smtpConfig: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
  };

  constructor() {
    this.smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || 'PMS Platform <aerofyta@gmail.com>',
    };
  }

  /**
   * Create nodemailer transporter
   */
  private createTransporter(): Transporter {
    return nodemailer.createTransport({
      host: this.smtpConfig.host,
      port: this.smtpConfig.port,
      secure: this.smtpConfig.secure,
      auth: {
        user: this.smtpConfig.user,
        pass: this.smtpConfig.pass,
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certs in development
      },
    });
  }

  /**
   * Verify SMTP connection on startup
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.smtpConfig.user || !this.smtpConfig.pass) {
      logger.warn('SMTP credentials not configured - email sending disabled');
      return false;
    }

    try {
      this.transporter = this.createTransporter();
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully', {
        host: this.smtpConfig.host,
        port: this.smtpConfig.port,
        user: this.smtpConfig.user,
      });
      return true;
    } catch (error) {
      logger.error('SMTP connection verification failed', { error });
      this.transporter = null;
      return false;
    }
  }

  /**
   * Core send method with retry logic
   */
  async sendMail(
    to: string,
    subject: string,
    html: string,
    text?: string,
    options?: { replyTo?: string }
  ): Promise<boolean> {
    if (!this.transporter) {
      // Try to create transporter if not yet initialized
      if (this.smtpConfig.user && this.smtpConfig.pass) {
        this.transporter = this.createTransporter();
      } else {
        logger.warn('Email not sent - SMTP not configured', { to, subject });
        return false;
      }
    }

    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const info = await this.transporter.sendMail({
          from: this.smtpConfig.from,
          to,
          subject: `[PMS] ${subject}`,
          html,
          text: text || subject,
          ...(options?.replyTo && { replyTo: options.replyTo }),
        });

        logger.info('Email sent successfully', {
          messageId: info.messageId,
          to,
          subject,
          attempt,
        });
        return true;
      } catch (error) {
        logger.error(`Email send failed (attempt ${attempt}/${maxRetries})`, {
          to,
          subject,
          error,
        });

        if (attempt === maxRetries) {
          return false;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    return false;
  }

  // ========================================================================
  // High-level email methods
  // ========================================================================

  /**
   * Send login alert to the user who just logged in
   */
  async sendLoginAlert(
    user: { firstName: string; lastName: string; email: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    if (!user.email) return;

    const html = loginAlertTemplate(
      `${user.firstName} ${user.lastName}`,
      user.email,
      new Date().toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'medium',
      }),
      ipAddress,
      userAgent
    );

    // Send to the user's own email (from aerofyta@gmail.com)
    this.sendMail(user.email, `Login Alert: New sign-in to your PMS account`, html).catch(
      (err) => logger.error('Failed to send login alert email', { err })
    );
  }

  /**
   * Send password reset code to user
   */
  async sendPasswordResetCode(
    user: { firstName: string; email: string },
    resetToken: string
  ): Promise<void> {
    const html = passwordResetTemplate(user.firstName, resetToken);
    await this.sendMail(user.email, 'Password Reset Code', html);
  }

  /**
   * Send goal deadline reminder
   */
  async sendGoalDeadlineReminder(
    user: { firstName: string; email: string },
    goal: { title: string; progress: number; dueDate: Date },
    daysRemaining: number
  ): Promise<void> {
    const html = goalReminderTemplate(
      user.firstName,
      goal.title,
      daysRemaining,
      goal.progress,
      goal.dueDate.toLocaleDateString('en-US', { dateStyle: 'medium' })
    );

    await this.sendMail(
      user.email,
      `Goal Deadline: "${goal.title}" due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
      html
    );
  }

  /**
   * Send task/goal completion notification
   */
  async sendTaskCompletionNotification(
    user: { firstName: string; email: string },
    goal: { title: string }
  ): Promise<void> {
    const html = taskCompletionTemplate(
      user.firstName,
      goal.title,
      new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })
    );

    await this.sendMail(user.email, `Goal Completed: "${goal.title}"`, html);
  }

  /**
   * Send review assignment notification
   */
  async sendReviewAssignment(
    reviewer: { firstName: string; email: string },
    revieweeName: string,
    cycleName: string,
    dueDate: string
  ): Promise<void> {
    const html = reviewAssignmentTemplate(
      reviewer.firstName,
      revieweeName,
      cycleName,
      dueDate
    );

    await this.sendMail(
      reviewer.email,
      `New Review Assignment: ${revieweeName}`,
      html
    );
  }
}

// Export singleton
export const emailService = new EmailService();
