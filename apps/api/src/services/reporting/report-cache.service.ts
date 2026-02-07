import { getRedisClient } from '../../utils/redis';
import { logger } from '../../utils/logger';
import { ReportType } from './report-generation.service';
import { PeriodType } from './data-aggregation.service';

const redis = getRedisClient();

/**
 * Report Cache Service
 *
 * Provides caching layer for:
 * - Generated reports
 * - Aggregated data
 * - Trend analysis results
 * - Report exports
 */
export class ReportCacheService {
  private readonly DEFAULT_TTL = 3600; // 1 hour
  private readonly AGGREGATION_TTL = 1800; // 30 minutes
  private readonly REPORT_TTL = 7200; // 2 hours
  private readonly TREND_TTL = 3600; // 1 hour

  /**
   * Generate cache key for report
   */
  private getReportCacheKey(
    tenantId: string,
    reportType: ReportType,
    periodLabel: string,
    entityId?: string
  ): string {
    return `report:${tenantId}:${reportType}:${periodLabel}${entityId ? `:${entityId}` : ''}`;
  }

  /**
   * Generate cache key for aggregation
   */
  private getAggregationCacheKey(
    tenantId: string,
    aggregationType: string,
    entityId: string,
    periodType: PeriodType,
    periodLabel: string
  ): string {
    return `aggregation:${tenantId}:${aggregationType}:${entityId}:${periodType}:${periodLabel}`;
  }

  /**
   * Generate cache key for trend analysis
   */
  private getTrendCacheKey(
    tenantId: string,
    entityId: string,
    metricName: string,
    periodType: PeriodType
  ): string {
    return `trend:${tenantId}:${entityId}:${metricName}:${periodType}`;
  }

  /**
   * Cache a generated report
   */
  async cacheReport(
    tenantId: string,
    reportType: ReportType,
    periodLabel: string,
    reportData: any,
    entityId?: string,
    ttl: number = this.REPORT_TTL
  ): Promise<void> {
    const cacheKey = this.getReportCacheKey(tenantId, reportType, periodLabel, entityId);

    try {
      await redis.set(cacheKey, JSON.stringify(reportData), ttl);
      logger.debug('Report cached', { cacheKey, ttl });
    } catch (error) {
      logger.error('Failed to cache report', { cacheKey, error });
    }
  }

  /**
   * Get cached report
   */
  async getCachedReport(
    tenantId: string,
    reportType: ReportType,
    periodLabel: string,
    entityId?: string
  ): Promise<any | null> {
    const cacheKey = this.getReportCacheKey(tenantId, reportType, periodLabel, entityId);

    try {
      const cached = await redis.get(cacheKey);

      if (cached) {
        logger.debug('Report cache hit', { cacheKey });
        return JSON.parse(cached);
      }

      logger.debug('Report cache miss', { cacheKey });
      return null;
    } catch (error) {
      logger.error('Failed to get cached report', { cacheKey, error });
      return null;
    }
  }

  /**
   * Cache aggregated data
   */
  async cacheAggregation(
    tenantId: string,
    aggregationType: string,
    entityId: string,
    periodType: PeriodType,
    periodLabel: string,
    data: any,
    ttl: number = this.AGGREGATION_TTL
  ): Promise<void> {
    const cacheKey = this.getAggregationCacheKey(
      tenantId,
      aggregationType,
      entityId,
      periodType,
      periodLabel
    );

    try {
      await redis.set(cacheKey, JSON.stringify(data), ttl);
      logger.debug('Aggregation cached', { cacheKey, ttl });
    } catch (error) {
      logger.error('Failed to cache aggregation', { cacheKey, error });
    }
  }

  /**
   * Get cached aggregation
   */
  async getCachedAggregation(
    tenantId: string,
    aggregationType: string,
    entityId: string,
    periodType: PeriodType,
    periodLabel: string
  ): Promise<any | null> {
    const cacheKey = this.getAggregationCacheKey(
      tenantId,
      aggregationType,
      entityId,
      periodType,
      periodLabel
    );

    try {
      const cached = await redis.get(cacheKey);

      if (cached) {
        logger.debug('Aggregation cache hit', { cacheKey });
        return JSON.parse(cached);
      }

      logger.debug('Aggregation cache miss', { cacheKey });
      return null;
    } catch (error) {
      logger.error('Failed to get cached aggregation', { cacheKey, error });
      return null;
    }
  }

  /**
   * Cache trend analysis
   */
  async cacheTrend(
    tenantId: string,
    entityId: string,
    metricName: string,
    periodType: PeriodType,
    trendData: any,
    ttl: number = this.TREND_TTL
  ): Promise<void> {
    const cacheKey = this.getTrendCacheKey(tenantId, entityId, metricName, periodType);

    try {
      await redis.set(cacheKey, JSON.stringify(trendData), ttl);
      logger.debug('Trend analysis cached', { cacheKey, ttl });
    } catch (error) {
      logger.error('Failed to cache trend analysis', { cacheKey, error });
    }
  }

  /**
   * Get cached trend analysis
   */
  async getCachedTrend(
    tenantId: string,
    entityId: string,
    metricName: string,
    periodType: PeriodType
  ): Promise<any | null> {
    const cacheKey = this.getTrendCacheKey(tenantId, entityId, metricName, periodType);

    try {
      const cached = await redis.get(cacheKey);

      if (cached) {
        logger.debug('Trend analysis cache hit', { cacheKey });
        return JSON.parse(cached);
      }

      logger.debug('Trend analysis cache miss', { cacheKey });
      return null;
    } catch (error) {
      logger.error('Failed to get cached trend analysis', { cacheKey, error });
      return null;
    }
  }

  /**
   * Invalidate all caches for a tenant
   */
  async invalidateTenantCache(tenantId: string): Promise<void> {
    logger.info('Invalidating tenant cache', { tenantId });

    try {
      const patterns = [
        `report:${tenantId}:*`,
        `aggregation:${tenantId}:*`,
        `trend:${tenantId}:*`,
      ];

      for (const pattern of patterns) {
        await redis.deletePattern(pattern);
      }

      logger.info('Tenant cache invalidated', { tenantId });
    } catch (error) {
      logger.error('Failed to invalidate tenant cache', { tenantId, error });
    }
  }

  /**
   * Invalidate caches for specific entity
   */
  async invalidateEntityCache(tenantId: string, entityId: string): Promise<void> {
    logger.info('Invalidating entity cache', { tenantId, entityId });

    try {
      const patterns = [
        `report:${tenantId}:*:*:${entityId}`,
        `aggregation:${tenantId}:*:${entityId}:*`,
        `trend:${tenantId}:${entityId}:*`,
      ];

      for (const pattern of patterns) {
        await redis.deletePattern(pattern);
      }

      logger.info('Entity cache invalidated', { tenantId, entityId });
    } catch (error) {
      logger.error('Failed to invalidate entity cache', { tenantId, entityId, error });
    }
  }

  /**
   * Invalidate report cache by type
   */
  async invalidateReportTypeCache(tenantId: string, reportType: ReportType): Promise<void> {
    logger.info('Invalidating report type cache', { tenantId, reportType });

    try {
      await redis.deletePattern(`report:${tenantId}:${reportType}:*`);
      logger.info('Report type cache invalidated', { tenantId, reportType });
    } catch (error) {
      logger.error('Failed to invalidate report type cache', { tenantId, reportType, error });
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    reportKeys: number;
    aggregationKeys: number;
    trendKeys: number;
    memoryUsed: string;
  }> {
    try {
      const [reportKeys, aggregationKeys, trendKeys] = await Promise.all([
        redis.deletePattern('report:*', true), // dry run to count
        redis.deletePattern('aggregation:*', true),
        redis.deletePattern('trend:*', true),
      ]);

      // Get memory info from Redis
      const memoryInfo = await redis.info('memory');

      return {
        totalKeys: (reportKeys || 0) + (aggregationKeys || 0) + (trendKeys || 0),
        reportKeys: reportKeys || 0,
        aggregationKeys: aggregationKeys || 0,
        trendKeys: trendKeys || 0,
        memoryUsed: this.parseMemoryUsed(memoryInfo || ''),
      };
    } catch (error) {
      logger.error('Failed to get cache stats', { error });
      return {
        totalKeys: 0,
        reportKeys: 0,
        aggregationKeys: 0,
        trendKeys: 0,
        memoryUsed: 'unknown',
      };
    }
  }

  /**
   * Parse memory used from Redis info
   */
  private parseMemoryUsed(info: string): string {
    const match = info.match(/used_memory_human:(.*)/);
    return match ? match[1].trim() : 'unknown';
  }

  /**
   * Warm up cache for common reports
   */
  async warmupCache(tenantId: string, entityIds: string[]): Promise<void> {
    logger.info('Warming up cache', { tenantId, entityCount: entityIds.length });

    // This method would pre-generate and cache common reports
    // Implementation depends on business logic for which reports to pre-generate

    logger.info('Cache warmup completed', { tenantId });
  }

  /**
   * Clear all cached data (use with caution)
   */
  async clearAllCache(): Promise<void> {
    logger.warn('Clearing all report cache');

    try {
      await Promise.all([
        redis.deletePattern('report:*'),
        redis.deletePattern('aggregation:*'),
        redis.deletePattern('trend:*'),
      ]);

      logger.warn('All report cache cleared');
    } catch (error) {
      logger.error('Failed to clear all cache', { error });
    }
  }
}

export const reportCacheService = new ReportCacheService();
