import { createServer } from 'http';

import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { connectRedis, disconnectRedis } from './utils/redis';
import { initSocketIO, closeSocketIO } from './utils/socket';
import { emailService } from './services/email';
import { initDeadlineReminderJob } from './jobs/deadline-reminder.job';
import { startMonitoringJob, stopMonitoringJob } from './jobs/license-expiry.job';
import { initAIInsightsJob } from './jobs/ai-insights.job';

async function bootstrap(): Promise<void> {
  const app = createApp();

  // Create HTTP server (required for Socket.io)
  const httpServer = createServer(app);

  // Connect to Redis
  try {
    await connectRedis();
    logger.info('Connected to Redis');
  } catch (error) {
    logger.warn('Redis connection failed, continuing without cache', { error });
  }

  // Initialize Socket.io
  initSocketIO(httpServer);

  // Initialize email service
  try {
    const emailReady = await emailService.verifyConnection();
    if (emailReady) {
      logger.info('SMTP email service initialized');
    } else {
      logger.warn('Email service not configured - email notifications disabled');
    }
  } catch (error) {
    logger.warn('Email service initialization failed', { error });
  }

  // Initialize cron jobs
  try {
    initDeadlineReminderJob();
    logger.info('Cron jobs initialized');
  } catch (error) {
    logger.warn('Cron job initialization failed', { error });
  }

  // Start license & subscription monitoring job (runs every 6 hours)
  try {
    startMonitoringJob();
    logger.info('License monitoring job started');
  } catch (error) {
    logger.warn('License monitoring job failed to start', { error });
  }

  // Initialize AI insights cron jobs
  try {
    initAIInsightsJob();
    logger.info('AI insights job initialized');
  } catch (error) {
    logger.warn('AI insights job failed to start', { error });
  }

  // Start server
  httpServer.listen(config.PORT, config.HOST, () => {
    logger.info(`Server started`, {
      host: config.HOST,
      port: config.PORT,
      environment: config.NODE_ENV,
    });
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received, shutting down gracefully`);

    httpServer.close(async () => {
      logger.info('HTTP server closed');

      stopMonitoringJob();

      try {
        await closeSocketIO();
      } catch (error) {
        logger.error('Error closing Socket.io', { error });
      }

      try {
        await disconnectRedis();
        logger.info('Redis connection closed');
      } catch (error) {
        logger.error('Error closing Redis connection', { error });
      }

      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
