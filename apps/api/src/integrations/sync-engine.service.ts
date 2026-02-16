import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { MS_PER_DAY } from '../utils/constants';

interface SyncConfig {
  provider: string;
  tenantId: string;
  strategy: 'full' | 'incremental' | 'realtime';
  schedule: string; // Cron expression
  enabled: boolean;
  lastSyncAt?: Date;
  conflictResolution: 'source_wins' | 'target_wins' | 'newest_wins' | 'manual';
  fieldMappings: FieldMapping[];
  filters?: SyncFilter[];
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'date' | 'custom';
  customTransform?: (value: any) => any;
}

interface SyncFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'greaterThan' | 'lessThan';
  value: any;
}

interface SyncJob {
  id: string;
  tenantId: string;
  provider: string;
  strategy: 'full' | 'incremental' | 'realtime';
  entityType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: string[];
}

interface ConflictResolution {
  entity: string;
  sourceData: any;
  targetData: any;
  strategy: 'source_wins' | 'target_wins' | 'newest_wins' | 'manual';
  resolution?: 'use_source' | 'use_target' | 'merge' | 'manual_required';
  mergedData?: any;
}

@Injectable()
export class SyncEngineService {
  private readonly logger = new Logger(SyncEngineService.name);

  constructor(
    @InjectQueue('sync') private readonly syncQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Schedule sync job
   */
  async scheduleSyncJob(config: SyncConfig): Promise<SyncJob> {
    const job: SyncJob = {
      id: this.generateJobId(),
      tenantId: config.tenantId,
      provider: config.provider,
      strategy: config.strategy,
      entityType: 'all',
      status: 'pending',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
    };

    // Add to queue
    await this.syncQueue.add(
      'execute-sync',
      {
        job,
        config,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        timeout: 3600000, // 1 hour
      },
    );

    this.logger.log(`Scheduled sync job ${job.id} for ${config.provider}`);
    return job;
  }

  /**
   * Execute sync job (called by queue processor)
   */
  async executeSyncJob(job: SyncJob, config: SyncConfig): Promise<SyncJob> {
    try {
      job.status = 'running';
      job.startedAt = new Date();

      this.logger.log(
        `Executing ${config.strategy} sync for ${config.provider} (job: ${job.id})`,
      );

      // Determine sync strategy
      switch (config.strategy) {
        case 'full':
          await this.executeFullSync(job, config);
          break;
        case 'incremental':
          await this.executeIncrementalSync(job, config);
          break;
        case 'realtime':
          await this.executeRealtimeSync(job, config);
          break;
      }

      job.status = 'completed';
      job.completedAt = new Date();

      this.logger.log(
        `Sync job ${job.id} completed: ${job.recordsCreated} created, ${job.recordsUpdated} updated, ${job.recordsSkipped} skipped`,
      );

      return job;
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.errors.push(`Sync failed: ${error.message}`);

      this.logger.error(`Sync job ${job.id} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute full sync (complete data refresh)
   */
  private async executeFullSync(job: SyncJob, config: SyncConfig): Promise<void> {
    this.logger.log('Starting full sync...');

    // Fetch all records from source
    const sourceRecords = await this.fetchSourceRecords(config, {
      fullRefresh: true,
    });

    job.recordsProcessed = sourceRecords.length;

    // Process each record
    for (const sourceRecord of sourceRecords) {
      try {
        // Apply field mappings
        const transformedRecord = this.applyFieldMappings(sourceRecord, config.fieldMappings);

        // Apply filters
        if (!this.passesFilters(transformedRecord, config.filters || [])) {
          job.recordsSkipped++;
          continue;
        }

        // Check if record exists
        const existingRecord = await this.findExistingRecord(
          config.tenantId,
          config.provider,
          transformedRecord,
        );

        if (existingRecord) {
          // Handle conflict
          const resolution = await this.resolveConflict(
            transformedRecord,
            existingRecord,
            config.conflictResolution,
          );

          if (resolution.resolution === 'use_source' || resolution.resolution === 'merge') {
            await this.updateRecord(config.tenantId, existingRecord.id, resolution.mergedData || transformedRecord);
            job.recordsUpdated++;
          } else if (resolution.resolution === 'use_target') {
            job.recordsSkipped++;
          } else {
            // Manual resolution required
            await this.createConflictResolutionTask(resolution);
            job.recordsSkipped++;
          }
        } else {
          // Create new record
          await this.createRecord(config.tenantId, transformedRecord);
          job.recordsCreated++;
        }
      } catch (error) {
        job.errors.push(`Failed to process record: ${error.message}`);
        job.recordsSkipped++;
      }
    }
  }

  /**
   * Execute incremental sync (only changed records)
   */
  private async executeIncrementalSync(job: SyncJob, config: SyncConfig): Promise<void> {
    this.logger.log('Starting incremental sync...');

    const lastSyncAt = config.lastSyncAt || new Date(Date.now() - MS_PER_DAY); // Default: 24h ago

    // Fetch only changed records since last sync
    const sourceRecords = await this.fetchSourceRecords(config, {
      changedSince: lastSyncAt,
    });

    job.recordsProcessed = sourceRecords.length;

    // Process similar to full sync
    for (const sourceRecord of sourceRecords) {
      try {
        const transformedRecord = this.applyFieldMappings(sourceRecord, config.fieldMappings);

        if (!this.passesFilters(transformedRecord, config.filters || [])) {
          job.recordsSkipped++;
          continue;
        }

        const existingRecord = await this.findExistingRecord(
          config.tenantId,
          config.provider,
          transformedRecord,
        );

        if (existingRecord) {
          const resolution = await this.resolveConflict(
            transformedRecord,
            existingRecord,
            config.conflictResolution,
          );

          if (resolution.resolution === 'use_source' || resolution.resolution === 'merge') {
            await this.updateRecord(config.tenantId, existingRecord.id, resolution.mergedData || transformedRecord);
            job.recordsUpdated++;
          } else {
            job.recordsSkipped++;
          }
        } else {
          await this.createRecord(config.tenantId, transformedRecord);
          job.recordsCreated++;
        }
      } catch (error) {
        job.errors.push(`Failed to process record: ${error.message}`);
        job.recordsSkipped++;
      }
    }
  }

  /**
   * Execute realtime sync (webhook-triggered)
   */
  private async executeRealtimeSync(job: SyncJob, config: SyncConfig): Promise<void> {
    this.logger.log('Realtime sync triggered');

    // Realtime sync typically processes single records
    // Implementation would be event-driven
    throw new Error('Realtime sync must be triggered by webhook events');
  }

  /**
   * Apply field mappings to record
   */
  private applyFieldMappings(record: any, mappings: FieldMapping[]): any {
    const transformed: any = {};

    for (const mapping of mappings) {
      let value = this.getNestedValue(record, mapping.sourceField);

      // Apply transformation
      if (mapping.transform && value !== undefined && value !== null) {
        value = this.transformValue(value, mapping.transform, mapping.customTransform);
      }

      this.setNestedValue(transformed, mapping.targetField, value);
    }

    return transformed;
  }

  /**
   * Transform value based on transform type
   */
  private transformValue(
    value: any,
    transform: string,
    customTransform?: (value: any) => any,
  ): any {
    switch (transform) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      case 'date':
        return new Date(value);
      case 'custom':
        return customTransform ? customTransform(value) : value;
      default:
        return value;
    }
  }

  /**
   * Check if record passes all filters
   */
  private passesFilters(record: any, filters: SyncFilter[]): boolean {
    for (const filter of filters) {
      const value = this.getNestedValue(record, filter.field);

      switch (filter.operator) {
        case 'equals':
          if (value !== filter.value) return false;
          break;
        case 'contains':
          if (typeof value === 'string' && !value.includes(filter.value)) return false;
          break;
        case 'startsWith':
          if (typeof value === 'string' && !value.startsWith(filter.value)) return false;
          break;
        case 'greaterThan':
          if (value <= filter.value) return false;
          break;
        case 'lessThan':
          if (value >= filter.value) return false;
          break;
      }
    }

    return true;
  }

  /**
   * Resolve data conflict
   */
  private async resolveConflict(
    sourceData: any,
    targetData: any,
    strategy: string,
  ): Promise<ConflictResolution> {
    const resolution: ConflictResolution = {
      entity: 'unknown',
      sourceData,
      targetData,
      strategy: strategy as any,
    };

    switch (strategy) {
      case 'source_wins':
        resolution.resolution = 'use_source';
        resolution.mergedData = sourceData;
        break;

      case 'target_wins':
        resolution.resolution = 'use_target';
        resolution.mergedData = targetData;
        break;

      case 'newest_wins':
        const sourceUpdatedAt = new Date(sourceData.updatedAt || 0);
        const targetUpdatedAt = new Date(targetData.updatedAt || 0);

        if (sourceUpdatedAt > targetUpdatedAt) {
          resolution.resolution = 'use_source';
          resolution.mergedData = sourceData;
        } else {
          resolution.resolution = 'use_target';
          resolution.mergedData = targetData;
        }
        break;

      case 'manual':
        resolution.resolution = 'manual_required';
        break;

      default:
        // Smart merge: prefer non-null values
        resolution.resolution = 'merge';
        resolution.mergedData = this.smartMerge(sourceData, targetData);
        break;
    }

    return resolution;
  }

  /**
   * Smart merge two objects (prefer non-null values from source)
   */
  private smartMerge(source: any, target: any): any {
    const merged = { ...target };

    for (const key in source) {
      if (source[key] !== null && source[key] !== undefined) {
        merged[key] = source[key];
      }
    }

    return merged;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);

    target[lastKey] = value;
  }

  /**
   * Placeholder methods for actual implementation
   */
  private async fetchSourceRecords(config: SyncConfig, options: any): Promise<any[]> {
    // In production, call appropriate adapter based on config.provider
    return [];
  }

  private async findExistingRecord(
    tenantId: string,
    provider: string,
    record: any,
  ): Promise<any | null> {
    // In production, query database
    return null;
  }

  private async createRecord(tenantId: string, record: any): Promise<any> {
    // In production, create in database
    this.logger.debug(`Would create record: ${JSON.stringify(record).substring(0, 100)}`);
    return record;
  }

  private async updateRecord(tenantId: string, id: string, record: any): Promise<any> {
    // In production, update in database
    this.logger.debug(`Would update record ${id}`);
    return record;
  }

  private async createConflictResolutionTask(resolution: ConflictResolution): Promise<void> {
    // In production, create task for manual resolution
    this.logger.warn('Manual conflict resolution required');
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Scheduled sync jobs (cron)
   */

  @Cron(CronExpression.EVERY_4_HOURS)
  async runScheduledSyncs(): Promise<void> {
    this.logger.log('Running scheduled syncs...');

    // In production, fetch all active sync configurations
    // and schedule sync jobs for each
  }
}
