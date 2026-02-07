/**
 * Deadline Reminder Cron Job
 * Runs daily at 9:00 AM to send email reminders for approaching goal deadlines
 */

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { emailService } from '../services/email';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Check for goals with approaching deadlines and send reminder emails
 */
async function checkDeadlineReminders(): Promise<void> {
  logger.info('[CRON] Running deadline reminder check...');

  const now = new Date();
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  try {
    // Find active goals with deadlines within 3 days that are NOT completed
    const upcomingGoals = await prisma.goal.findMany({
      where: {
        status: { in: ['ACTIVE', 'DRAFT'] },
        deletedAt: null,
        dueDate: {
          gte: now,
          lte: threeDaysFromNow,
        },
        progress: { lt: 100 },
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    logger.info(`[CRON] Found ${upcomingGoals.length} goals with approaching deadlines`);

    for (const goal of upcomingGoals) {
      if (!goal.owner?.email || !goal.dueDate) continue;

      const daysRemaining = Math.ceil(
        (goal.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      try {
        await emailService.sendGoalDeadlineReminder(
          { firstName: goal.owner.firstName, email: goal.owner.email },
          { title: goal.title, progress: goal.progress, dueDate: goal.dueDate },
          daysRemaining
        );
        logger.info(`[CRON] Sent deadline reminder for goal "${goal.title}" to ${goal.owner.email}`);
      } catch (error) {
        logger.error(`[CRON] Failed to send reminder for goal "${goal.title}"`, { error });
      }
    }

    // Also check overdue goals (passed deadline, not completed)
    const overdueGoals = await prisma.goal.findMany({
      where: {
        status: { in: ['ACTIVE', 'DRAFT'] },
        deletedAt: null,
        dueDate: {
          lt: now,
        },
        progress: { lt: 100 },
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    logger.info(`[CRON] Found ${overdueGoals.length} overdue goals`);

    for (const goal of overdueGoals) {
      if (!goal.owner?.email || !goal.dueDate) continue;

      const daysOverdue = Math.ceil(
        (now.getTime() - goal.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      try {
        await emailService.sendGoalDeadlineReminder(
          { firstName: goal.owner.firstName, email: goal.owner.email },
          { title: goal.title, progress: goal.progress, dueDate: goal.dueDate },
          -daysOverdue // negative = overdue
        );
        logger.info(`[CRON] Sent overdue reminder for goal "${goal.title}" to ${goal.owner.email}`);
      } catch (error) {
        logger.error(`[CRON] Failed to send overdue reminder for goal "${goal.title}"`, { error });
      }
    }

    logger.info('[CRON] Deadline reminder check completed');
  } catch (error) {
    logger.error('[CRON] Deadline reminder check failed', { error });
  }
}

/**
 * Initialize the deadline reminder cron job
 * Runs every day at 9:00 AM
 */
export function initDeadlineReminderJob(): void {
  const task = cron.schedule('0 9 * * *', () => {
    checkDeadlineReminders().catch((err) => {
      logger.error('[CRON] Unhandled error in deadline reminder job', { error: err });
    });
  });

  logger.info('[CRON] Deadline reminder job initialized (runs daily at 9:00 AM)');

  // Also run once on startup (after a brief delay to let services initialize)
  setTimeout(() => {
    logger.info('[CRON] Running initial deadline check...');
    checkDeadlineReminders().catch((err) => {
      logger.error('[CRON] Error in initial deadline check', { error: err });
    });
  }, 10000); // 10 second delay
}
