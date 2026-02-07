import * as cron from 'node-cron';
import { prisma } from '@pms/database';
import { logger } from '../../utils/logger';
import { jobQueueService, ReportJobData } from './job-queue.service';
import { ReportType } from './report-generation.service';
import { AggregationType } from './data-aggregation.service';

interface ScheduledTask {
  scheduleId: string;
  task: cron.ScheduledTask;
}

/**
 * Report Scheduler Service
 *
 * Manages automated report generation using cron expressions.
 * Schedules and executes:
 * - Weekly performance summaries
 * - Monthly performance cards
 * - Quarterly business reviews
 * - Yearly performance indexes
 * - Custom scheduled reports
 */
export class ReportSchedulerService {
  private scheduledTasks: Map<string, ScheduledTask>;
  private isRunning: boolean;

  constructor() {
    this.scheduledTasks = new Map();
    this.isRunning = false;
  }

  /**
   * Initialize and start all scheduled reports
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Report scheduler already running');
      return;
    }

    logger.info('Starting report scheduler service');

    try {
      // Load all active schedules from database
      const schedules = await prisma.reportSchedule.findMany({
        where: {
          isActive: true,
          deletedAt: null,
        },
        include: {
          reportDefinition: true,
        },
      });

      logger.info(`Found ${schedules.length} active report schedules`);

      // Create cron tasks for each schedule
      for (const schedule of schedules) {
        await this.scheduleReport(schedule);
      }

      this.isRunning = true;

      logger.info('Report scheduler started successfully');
    } catch (error) {
      logger.error('Failed to start report scheduler', { error });
      throw error;
    }
  }

  /**
   * Schedule a report for automated generation
   */
  async scheduleReport(schedule: any): Promise<void> {
    const { id, cronExpression, reportDefinition, timezone } = schedule;

    logger.info('Scheduling report', {
      scheduleId: id,
      reportType: reportDefinition.reportType,
      cronExpression,
      timezone,
    });

    try {
      // Validate cron expression
      if (!cron.validate(cronExpression)) {
        logger.error('Invalid cron expression', { scheduleId: id, cronExpression });
        await prisma.reportSchedule.update({
          where: { id },
          data: {
            isActive: false,
            lastRunStatus: 'failed',
            lastRunError: 'Invalid cron expression',
          },
        });
        return;
      }

      // Create cron task
      const task = cron.schedule(
        cronExpression,
        async () => {
          await this.executeScheduledReport(schedule);
        },
        {
          timezone: timezone || 'UTC',
        }
      );

      // Store the task
      this.scheduledTasks.set(id, { scheduleId: id, task });

      // Update next run time
      await this.updateNextRunTime(id, cronExpression, timezone);

      logger.info('Report scheduled successfully', { scheduleId: id });
    } catch (error: any) {
      logger.error('Failed to schedule report', { scheduleId: id, error: error.message });

      await prisma.reportSchedule.update({
        where: { id },
        data: {
          isActive: false,
          lastRunStatus: 'failed',
          lastRunError: error.message,
        },
      });
    }
  }

  /**
   * Execute a scheduled report
   */
  private async executeScheduledReport(schedule: any): Promise<void> {
    const { id, reportDefinition, tenantId } = schedule;

    logger.info('Executing scheduled report', {
      scheduleId: id,
      reportDefinitionId: reportDefinition.id,
      reportType: reportDefinition.reportType,
    });

    const startTime = Date.now();

    try {
      // Update schedule status
      await prisma.reportSchedule.update({
        where: { id },
        data: { lastRunAt: new Date() },
      });

      // Parse report definition configuration
      const config = reportDefinition.templateConfig || {};

      // Prepare job data
      const jobData: ReportJobData = {
        tenantId,
        reportType: reportDefinition.reportType as ReportType,
        aggregationType: config.aggregationType || 'tenant',
        entityId: config.entityId || tenantId,
        exportFormats: reportDefinition.exportFormats || ['pdf'],
        recipients: reportDefinition.recipients || [],
        reportDefinitionId: reportDefinition.id,
      };

      // Add job to queue
      const job = await jobQueueService.addReportJob(jobData, {
        priority: 7, // Higher priority for scheduled reports
      });

      const executionTime = Date.now() - startTime;

      // Update schedule with success
      await prisma.reportSchedule.update({
        where: { id },
        data: {
          lastRunStatus: 'success',
          lastRunDuration: executionTime,
          lastRunError: null,
          totalRuns: { increment: 1 },
          successfulRuns: { increment: 1 },
          avgExecutionTime:
            schedule.totalRuns === 0
              ? executionTime
              : Math.round((schedule.avgExecutionTime * schedule.totalRuns + executionTime) / (schedule.totalRuns + 1)),
          retryCount: 0,
        },
      });

      // Update next run time
      await this.updateNextRunTime(id, schedule.cronExpression, schedule.timezone);

      logger.info('Scheduled report executed successfully', {
        scheduleId: id,
        jobId: job.id,
        executionTime,
      });
    } catch (error: any) {
      logger.error('Scheduled report execution failed', {
        scheduleId: id,
        error: error.message,
      });

      const executionTime = Date.now() - startTime;

      // Update schedule with failure
      const updatedSchedule = await prisma.reportSchedule.update({
        where: { id },
        data: {
          lastRunStatus: 'failed',
          lastRunDuration: executionTime,
          lastRunError: error.message,
          totalRuns: { increment: 1 },
          failedRuns: { increment: 1 },
          retryCount: { increment: 1 },
        },
      });

      // Retry if configured
      if (schedule.retryOnFailure && updatedSchedule.retryCount < schedule.maxRetries) {
        logger.info('Scheduling retry for failed report', {
          scheduleId: id,
          retryCount: updatedSchedule.retryCount,
          maxRetries: schedule.maxRetries,
        });

        // Retry after 5 minutes
        setTimeout(() => {
          this.executeScheduledReport(schedule);
        }, 5 * 60 * 1000);
      }
    }
  }

  /**
   * Calculate and update next run time
   */
  private async updateNextRunTime(
    scheduleId: string,
    cronExpression: string,
    timezone: string = 'UTC'
  ): Promise<void> {
    try {
      // Parse cron expression to get next run time
      // This is a simplified version - in production, use a library like 'cron-parser'
      const now = new Date();
      const nextRun = new Date(now.getTime() + 60 * 60 * 1000); // Placeholder: 1 hour from now

      await prisma.reportSchedule.update({
        where: { id: scheduleId },
        data: { nextRunAt: nextRun },
      });
    } catch (error) {
      logger.error('Failed to update next run time', { scheduleId, error });
    }
  }

  /**
   * Add a new report schedule
   */
  async addSchedule(params: {
    tenantId: string;
    reportDefinitionId: string;
    cronExpression: string;
    timezone?: string;
    startDate: Date;
    endDate?: Date;
  }): Promise<any> {
    logger.info('Adding new report schedule', {
      tenantId: params.tenantId,
      reportDefinitionId: params.reportDefinitionId,
      cronExpression: params.cronExpression,
    });

    // Validate cron expression
    if (!cron.validate(params.cronExpression)) {
      throw new Error('Invalid cron expression');
    }

    // Get report definition
    const reportDefinition = await prisma.reportDefinition.findUnique({
      where: { id: params.reportDefinitionId },
    });

    if (!reportDefinition) {
      throw new Error('Report definition not found');
    }

    // Determine schedule type from cron expression
    const scheduleType = this.determineScheduleType(params.cronExpression);

    // Create schedule in database
    const schedule = await prisma.reportSchedule.create({
      data: {
        tenantId: params.tenantId,
        reportDefinitionId: params.reportDefinitionId,
        scheduleType,
        cronExpression: params.cronExpression,
        timezone: params.timezone || 'UTC',
        isActive: true,
        startDate: params.startDate,
        endDate: params.endDate,
      },
      include: {
        reportDefinition: true,
      },
    });

    // Schedule the task if scheduler is running
    if (this.isRunning) {
      await this.scheduleReport(schedule);
    }

    logger.info('Report schedule added successfully', { scheduleId: schedule.id });

    return schedule;
  }

  /**
   * Determine schedule type from cron expression
   */
  private determineScheduleType(cronExpression: string): string {
    // Simplified logic - in production, parse cron expression properly
    if (cronExpression.includes('0 0 * * 0')) return 'weekly'; // Every Sunday at midnight
    if (cronExpression.includes('0 0 1 * *')) return 'monthly'; // First day of month
    if (cronExpression.includes('0 0 1 */3 *')) return 'quarterly'; // First day of quarter
    if (cronExpression.includes('0 0 1 1 *')) return 'yearly'; // January 1st

    return 'custom';
  }

  /**
   * Update an existing schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: {
      cronExpression?: string;
      timezone?: string;
      isActive?: boolean;
      endDate?: Date;
    }
  ): Promise<any> {
    logger.info('Updating report schedule', { scheduleId, updates });

    // Validate cron expression if provided
    if (updates.cronExpression && !cron.validate(updates.cronExpression)) {
      throw new Error('Invalid cron expression');
    }

    // Update in database
    const schedule = await prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: updates,
      include: { reportDefinition: true },
    });

    // Remove existing task
    const existingTask = this.scheduledTasks.get(scheduleId);
    if (existingTask) {
      existingTask.task.stop();
      this.scheduledTasks.delete(scheduleId);
    }

    // Reschedule if active
    if (schedule.isActive && this.isRunning) {
      await this.scheduleReport(schedule);
    }

    logger.info('Report schedule updated successfully', { scheduleId });

    return schedule;
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    logger.info('Deleting report schedule', { scheduleId });

    // Stop and remove task
    const task = this.scheduledTasks.get(scheduleId);
    if (task) {
      task.task.stop();
      this.scheduledTasks.delete(scheduleId);
    }

    // Soft delete in database
    await prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    logger.info('Report schedule deleted successfully', { scheduleId });
  }

  /**
   * Pause a schedule
   */
  async pauseSchedule(scheduleId: string): Promise<void> {
    logger.info('Pausing report schedule', { scheduleId });

    const task = this.scheduledTasks.get(scheduleId);
    if (task) {
      task.task.stop();
    }

    await prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: { isActive: false },
    });

    logger.info('Report schedule paused', { scheduleId });
  }

  /**
   * Resume a schedule
   */
  async resumeSchedule(scheduleId: string): Promise<void> {
    logger.info('Resuming report schedule', { scheduleId });

    const schedule = await prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
      include: { reportDefinition: true },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    await prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: { isActive: true },
    });

    if (this.isRunning) {
      await this.scheduleReport(schedule);
    }

    logger.info('Report schedule resumed', { scheduleId });
  }

  /**
   * Get all active schedules
   */
  async getActiveSchedules(tenantId?: string): Promise<any[]> {
    return prisma.reportSchedule.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(tenantId && { tenantId }),
      },
      include: {
        reportDefinition: true,
      },
    });
  }

  /**
   * Get schedule statistics
   */
  async getScheduleStats(scheduleId: string): Promise<any> {
    const schedule = await prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const successRate = schedule.totalRuns === 0
      ? 0
      : (schedule.successfulRuns / schedule.totalRuns) * 100;

    return {
      totalRuns: schedule.totalRuns,
      successfulRuns: schedule.successfulRuns,
      failedRuns: schedule.failedRuns,
      successRate,
      avgExecutionTime: schedule.avgExecutionTime,
      lastRunAt: schedule.lastRunAt,
      lastRunStatus: schedule.lastRunStatus,
      nextRunAt: schedule.nextRunAt,
    };
  }

  /**
   * Stop all scheduled tasks
   */
  async stop(): Promise<void> {
    logger.info('Stopping report scheduler service');

    for (const [scheduleId, task] of this.scheduledTasks.entries()) {
      task.task.stop();
      logger.debug('Stopped scheduled task', { scheduleId });
    }

    this.scheduledTasks.clear();
    this.isRunning = false;

    logger.info('Report scheduler stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    activeSchedules: number;
    scheduledTasks: string[];
  } {
    return {
      isRunning: this.isRunning,
      activeSchedules: this.scheduledTasks.size,
      scheduledTasks: Array.from(this.scheduledTasks.keys()),
    };
  }
}

export const reportSchedulerService = new ReportSchedulerService();
