/**
 * License & Subscription Monitoring Job
 *
 * Runs periodically to:
 * 1. Check license usage and alert when nearing limits
 * 2. Check for expiring subscriptions and send warnings
 * 3. Auto-expire subscriptions past their end date
 * 4. Detect suspicious activity patterns
 *
 * Designed to be called from a cron scheduler or on API startup interval.
 */

import { logger } from '../utils/logger';
import { alertsService } from '../modules/alerts/alerts.service';
import { MS_PER_HOUR } from '../utils/constants';

let intervalHandle: ReturnType<typeof setInterval> | null = null;

/**
 * Run all monitoring checks once
 */
export async function runMonitoringChecks(): Promise<void> {
  logger.info('Running monitoring checks...');

  try {
    await alertsService.checkLicenseUsage();
    logger.info('License usage check completed');
  } catch (err) {
    logger.error('License usage check failed', { error: err });
  }

  try {
    await alertsService.checkSubscriptionExpiry();
    logger.info('Subscription expiry check completed');
  } catch (err) {
    logger.error('Subscription expiry check failed', { error: err });
  }

  try {
    await alertsService.checkSuspiciousActivity();
    logger.info('Suspicious activity check completed');
  } catch (err) {
    logger.error('Suspicious activity check failed', { error: err });
  }

  try {
    await alertsService.processAutoRenewals();
    logger.info('Auto-renewal processing completed');
  } catch (err) {
    logger.error('Auto-renewal processing failed', { error: err });
  }

  logger.info('Monitoring checks completed');
}

/**
 * Start the monitoring job on a recurring interval
 * Default: every 6 hours (21600000 ms)
 */
export function startMonitoringJob(intervalMs: number = 6 * MS_PER_HOUR): void {
  if (intervalHandle) {
    logger.warn('Monitoring job already running');
    return;
  }

  // Run initial check after a 30-second delay (let the app fully start)
  setTimeout(() => {
    runMonitoringChecks().catch((err) => {
      logger.error('Initial monitoring check failed', { error: err });
    });
  }, 30_000);

  // Then run on interval
  intervalHandle = setInterval(() => {
    runMonitoringChecks().catch((err) => {
      logger.error('Scheduled monitoring check failed', { error: err });
    });
  }, intervalMs);

  logger.info(`Monitoring job started, interval: ${intervalMs / 1000}s`);
}

/**
 * Stop the monitoring job
 */
export function stopMonitoringJob(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info('Monitoring job stopped');
  }
}
