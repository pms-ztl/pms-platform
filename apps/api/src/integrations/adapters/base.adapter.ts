import { Logger } from '@nestjs/common';

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
  duration: number;
}

export interface IntegrationConfig {
  enabled: boolean;
  syncSchedule?: string; // Cron expression
  lastSyncAt?: Date;
  syncStrategy?: 'full' | 'incremental' | 'realtime';
}

export abstract class BaseAdapter {
  protected readonly logger = new Logger(this.constructor.name);

  /**
   * Test connection to external system
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.ping();
      return true;
    } catch (error) {
      this.logger.error(`Connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Ping external system
   */
  protected async ping(): Promise<void> {
    throw new Error('ping() must be implemented by subclass');
  }

  /**
   * Create initial sync result
   */
  protected createSyncResult(): SyncResult {
    return {
      success: false,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
    };
  }

  /**
   * Finalize sync result
   */
  protected finalizeSyncResult(result: SyncResult): SyncResult {
    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();
    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Handle sync error
   */
  protected handleSyncError(result: SyncResult, error: Error): SyncResult {
    result.errors.push(`Sync failed: ${error.message}`);
    return this.finalizeSyncResult(result);
  }
}
