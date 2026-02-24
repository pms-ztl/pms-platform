import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { prisma } from '@pms/database';
import { logger } from '../../utils/logger';
import { DAYS } from '../../utils/constants';
import { reportGenerationService, ReportType } from './report-generation.service';
import { reportExportService, ExportFormat } from './report-export.service';
import { dataAggregationService, PeriodType, AggregationType } from './data-aggregation.service';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
  tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
});

export interface ReportJobData {
  tenantId: string;
  reportType: ReportType;
  aggregationType: AggregationType;
  entityId: string;
  periodStart?: Date;
  periodEnd?: Date;
  exportFormats?: ExportFormat[];
  recipients?: string[];
  generatedById?: string;
  reportDefinitionId?: string;
}

export interface AggregationJobData {
  tenantId: string;
  aggregationType: AggregationType;
  entityId: string;
  periodType: PeriodType;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Job Queue Service
 *
 * Manages background jobs for:
 * - Report generation
 * - Data aggregation
 * - Export processing
 * - Email notifications
 */
export class JobQueueService {
  private reportQueue: Queue;
  private aggregationQueue: Queue;
  private exportQueue: Queue;
  private notificationQueue: Queue;

  private reportWorker: Worker;
  private aggregationWorker: Worker;
  private exportWorker: Worker;
  private notificationWorker: Worker;

  private queueEvents: Map<string, QueueEvents>;

  constructor() {
    // Initialize queues
    this.reportQueue = new Queue('report-generation', { connection: redisConnection });
    this.aggregationQueue = new Queue('data-aggregation', { connection: redisConnection });
    this.exportQueue = new Queue('report-export', { connection: redisConnection });
    this.notificationQueue = new Queue('report-notifications', { connection: redisConnection });

    // Initialize queue events
    this.queueEvents = new Map();
    this.setupQueueEvents('report-generation', this.reportQueue);
    this.setupQueueEvents('data-aggregation', this.aggregationQueue);
    this.setupQueueEvents('report-export', this.exportQueue);
    this.setupQueueEvents('report-notifications', this.notificationQueue);

    // Initialize workers (will be started separately)
    this.reportWorker = new Worker(
      'report-generation',
      async (job) => this.processReportJob(job),
      {
        connection: redisConnection,
        concurrency: parseInt(process.env.REPORT_WORKER_CONCURRENCY || '5'),
      }
    );

    this.aggregationWorker = new Worker(
      'data-aggregation',
      async (job) => this.processAggregationJob(job),
      {
        connection: redisConnection,
        concurrency: parseInt(process.env.AGGREGATION_WORKER_CONCURRENCY || '10'),
      }
    );

    this.exportWorker = new Worker(
      'report-export',
      async (job) => this.processExportJob(job),
      {
        connection: redisConnection,
        concurrency: parseInt(process.env.EXPORT_WORKER_CONCURRENCY || '5'),
      }
    );

    this.notificationWorker = new Worker(
      'report-notifications',
      async (job) => this.processNotificationJob(job),
      {
        connection: redisConnection,
        concurrency: parseInt(process.env.NOTIFICATION_WORKER_CONCURRENCY || '10'),
      }
    );

    this.setupWorkerEventHandlers();
  }

  /**
   * Setup queue events for monitoring
   */
  private setupQueueEvents(queueName: string, queue: Queue): void {
    const events = new QueueEvents(queueName, { connection: redisConnection });

    events.on('completed', ({ jobId }) => {
      logger.info('Job completed', { queue: queueName, jobId });
    });

    events.on('failed', ({ jobId, failedReason }) => {
      logger.error('Job failed', { queue: queueName, jobId, failedReason });
    });

    events.on('progress', ({ jobId, data }) => {
      logger.debug('Job progress', { queue: queueName, jobId, progress: data });
    });

    this.queueEvents.set(queueName, events);
  }

  /**
   * Setup worker event handlers
   */
  private setupWorkerEventHandlers(): void {
    const workers = [
      this.reportWorker,
      this.aggregationWorker,
      this.exportWorker,
      this.notificationWorker,
    ];

    workers.forEach((worker) => {
      worker.on('completed', (job) => {
        logger.info('Worker completed job', { queue: worker.name, jobId: job.id });
      });

      worker.on('failed', (job, err) => {
        logger.error('Worker failed job', { queue: worker.name, jobId: job?.id, error: err.message });
      });

      worker.on('error', (err) => {
        logger.error('Worker error', { queue: worker.name, error: err.message });
      });
    });
  }

  /**
   * Add report generation job to queue
   */
  async addReportJob(data: ReportJobData, options?: {
    priority?: number;
    delay?: number;
    jobId?: string;
  }): Promise<Job> {
    logger.info('Adding report generation job', { reportType: data.reportType, tenantId: data.tenantId });

    // Create background job record in database
    const backgroundJob = await prisma.backgroundJob.create({
      data: {
        tenantId: data.tenantId,
        jobType: 'report_generation',
        jobName: `Generate ${data.reportType} Report`,
        jobData: data as any,
        status: 'pending',
        priority: options?.priority || 5,
        createdById: data.generatedById,
      },
    });

    const job = await this.reportQueue.add(
      'generate-report',
      { ...data, backgroundJobId: backgroundJob.id },
      {
        priority: options?.priority || 5,
        delay: options?.delay || 0,
        jobId: options?.jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );

    logger.info('Report job added to queue', { jobId: job.id, backgroundJobId: backgroundJob.id });

    return job;
  }

  /**
   * Process report generation job
   */
  private async processReportJob(job: Job<ReportJobData & { backgroundJobId: string }>): Promise<any> {
    const { backgroundJobId, ...jobData } = job.data;

    logger.info('Processing report generation job', { jobId: job.id, reportType: jobData.reportType });

    try {
      // Update background job status
      await prisma.backgroundJob.update({
        where: { id: backgroundJobId },
        data: { status: 'processing', startedAt: new Date() },
      });

      // Update job progress
      await job.updateProgress(10);

      // Generate the report
      const report = await reportGenerationService.generateReport(jobData);

      await job.updateProgress(60);

      // Export to requested formats
      const exportUrls: Record<string, string> = {};

      if (jobData.exportFormats && jobData.exportFormats.length > 0) {
        for (const format of jobData.exportFormats) {
          const filepath = await reportExportService.exportReport({
            reportId: report.id,
            format,
            reportData: {
              title: report.title,
              summary: report.summary,
              data: report.data,
              trends: report.trends,
              comparisons: report.comparisons,
              insights: report.insights,
              recommendations: report.recommendations,
            },
          });

          const url = await reportExportService.getReportUrl(filepath);
          exportUrls[format] = url;

          // Update report with export URLs
          await prisma.generatedReport.update({
            where: { id: report.id },
            data: {
              [`${format}Url`]: url,
            },
          });
        }
      }

      await job.updateProgress(80);

      // Send notifications if recipients specified
      if (jobData.recipients && jobData.recipients.length > 0) {
        await this.addNotificationJob({
          reportId: report.id,
          recipients: jobData.recipients,
          exportUrls,
        });
      }

      await job.updateProgress(100);

      // Update background job status
      await prisma.backgroundJob.update({
        where: { id: backgroundJobId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          executionTime: Date.now() - new Date(job.timestamp).getTime(),
          result: { reportId: report.id, exportUrls },
        },
      });

      logger.info('Report generation job completed', { jobId: job.id, reportId: report.id });

      return { reportId: report.id, exportUrls };
    } catch (error: any) {
      logger.error('Report generation job failed', { jobId: job.id, error: error.message });

      // Update background job status
      await prisma.backgroundJob.update({
        where: { id: backgroundJobId },
        data: {
          status: 'failed',
          error: error.message,
          errorStack: error.stack,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Add data aggregation job to queue
   */
  async addAggregationJob(data: AggregationJobData, options?: {
    priority?: number;
    delay?: number;
  }): Promise<Job> {
    logger.info('Adding data aggregation job', { tenantId: data.tenantId, periodType: data.periodType });

    const backgroundJob = await prisma.backgroundJob.create({
      data: {
        tenantId: data.tenantId,
        jobType: 'data_aggregation',
        jobName: `Aggregate ${data.periodType} data for ${data.aggregationType}`,
        jobData: data as any,
        status: 'pending',
        priority: options?.priority || 5,
      },
    });

    const job = await this.aggregationQueue.add(
      'aggregate-data',
      { ...data, backgroundJobId: backgroundJob.id },
      {
        priority: options?.priority || 5,
        delay: options?.delay || 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
      }
    );

    return job;
  }

  /**
   * Process data aggregation job
   */
  private async processAggregationJob(job: Job<AggregationJobData & { backgroundJobId: string }>): Promise<any> {
    const { backgroundJobId, ...jobData } = job.data;

    logger.info('Processing data aggregation job', { jobId: job.id });

    try {
      await prisma.backgroundJob.update({
        where: { id: backgroundJobId },
        data: { status: 'processing', startedAt: new Date() },
      });

      await job.updateProgress(20);

      const metrics = await dataAggregationService.aggregateForPeriod({
        tenantId: jobData.tenantId,
        aggregationType: jobData.aggregationType,
        entityId: jobData.entityId,
        periodType: jobData.periodType,
        periodStart: new Date(jobData.periodStart),
        periodEnd: new Date(jobData.periodEnd),
      });

      await job.updateProgress(70);

      const { label } = dataAggregationService.getPeriodBoundaries(
        jobData.periodType,
        new Date(jobData.periodStart)
      );

      await dataAggregationService.saveAggregation(
        {
          tenantId: jobData.tenantId,
          aggregationType: jobData.aggregationType,
          entityId: jobData.entityId,
          periodType: jobData.periodType,
          periodStart: new Date(jobData.periodStart),
          periodEnd: new Date(jobData.periodEnd),
        },
        metrics,
        label
      );

      await job.updateProgress(100);

      await prisma.backgroundJob.update({
        where: { id: backgroundJobId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          executionTime: Date.now() - new Date(job.timestamp).getTime(),
          result: metrics as any,
        },
      });

      logger.info('Data aggregation job completed', { jobId: job.id });

      return metrics;
    } catch (error: any) {
      logger.error('Data aggregation job failed', { jobId: job.id, error: error.message });

      await prisma.backgroundJob.update({
        where: { id: backgroundJobId },
        data: {
          status: 'failed',
          error: error.message,
          errorStack: error.stack,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Add export job to queue
   */
  async addExportJob(data: {
    reportId: string;
    format: ExportFormat;
    reportData: any;
  }): Promise<Job> {
    return this.exportQueue.add('export-report', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  /**
   * Process export job
   */
  private async processExportJob(job: Job): Promise<any> {
    logger.info('Processing export job', { jobId: job.id, format: job.data.format });

    const filepath = await reportExportService.exportReport(job.data);
    const url = await reportExportService.getReportUrl(filepath);

    logger.info('Export job completed', { jobId: job.id, url });

    return { filepath, url };
  }

  /**
   * Add notification job to queue
   */
  async addNotificationJob(data: {
    reportId: string;
    recipients: string[];
    exportUrls?: Record<string, string>;
  }): Promise<Job> {
    return this.notificationQueue.add('send-report-notification', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }

  /**
   * Process notification job
   */
  private async processNotificationJob(job: Job): Promise<any> {
    logger.info('Processing notification job', { jobId: job.id, reportId: job.data.reportId });

    // This would integrate with the notifications service
    // For now, just log
    logger.info('Report notifications sent', {
      reportId: job.data.reportId,
      recipients: job.data.recipients,
    });

    return { sent: true };
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string, queueName: string): Promise<any> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      state,
      progress,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
    };
  }

  /**
   * Get queue by name
   */
  private getQueue(queueName: string): Queue {
    switch (queueName) {
      case 'report-generation':
        return this.reportQueue;
      case 'data-aggregation':
        return this.aggregationQueue;
      case 'report-export':
        return this.exportQueue;
      case 'report-notifications':
        return this.notificationQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }

  /**
   * Get queue stats
   */
  async getQueueStats(queueName: string): Promise<any> {
    const queue = this.getQueue(queueName);

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Cleanup old completed jobs
   */
  async cleanupCompletedJobs(olderThan: number = DAYS(7)): Promise<void> {
    logger.info('Cleaning up completed jobs', { olderThan });

    const queues = [this.reportQueue, this.aggregationQueue, this.exportQueue, this.notificationQueue];

    for (const queue of queues) {
      await queue.clean(olderThan, 100, 'completed');
      await queue.clean(olderThan, 100, 'failed');
    }

    logger.info('Completed jobs cleanup finished');
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down job queue service');

    await Promise.all([
      this.reportWorker.close(),
      this.aggregationWorker.close(),
      this.exportWorker.close(),
      this.notificationWorker.close(),
    ]);

    await Promise.all([
      this.reportQueue.close(),
      this.aggregationQueue.close(),
      this.exportQueue.close(),
      this.notificationQueue.close(),
    ]);

    for (const events of this.queueEvents.values()) {
      await events.close();
    }

    await redisConnection.quit();

    logger.info('Job queue service shutdown complete');
  }
}

export const jobQueueService = new JobQueueService();
