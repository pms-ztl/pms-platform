/**
 * Redis Caching Service
 * Implements comprehensive caching strategy for PMS
 */

import Redis from 'ioredis';

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
  // Session data
  SESSION: 86400,              // 24 hours

  // User data
  USER_PROFILE: 3600,          // 1 hour
  USER_PERMISSIONS: 3600,       // 1 hour
  USER_PREFERENCES: 7200,       // 2 hours

  // Performance data
  REVIEW: 1800,                // 30 minutes
  GOAL: 900,                   // 15 minutes
  FEEDBACK: 1800,              // 30 minutes

  // Dashboard & Analytics
  DASHBOARD: 300,              // 5 minutes
  LEADERBOARD: 300,            // 5 minutes
  TEAM_METRICS: 900,           // 15 minutes
  REPORT: 3600,                // 1 hour

  // ML & AI
  ML_RECOMMENDATION: 86400,    // 24 hours
  ENGAGEMENT_SCORE: 3600,      // 1 hour
  SENTIMENT_SCORE: 3600,       // 1 hour
  HEALTH_METRICS: 3600,        // 1 hour
  PRODUCTIVITY_PREDICTION: 7200, // 2 hours

  // Aggregations
  DEPARTMENT_STATS: 900,       // 15 minutes
  ORG_STATS: 1800,             // 30 minutes

  // Short-lived
  RATE_LIMIT: 60,              // 1 minute
  VERIFICATION_CODE: 600,      // 10 minutes
  TEMP_DATA: 300               // 5 minutes
} as const;

// Cache key prefixes
export const CACHE_PREFIX = {
  SESSION: 'session:',
  USER_PROFILE: 'user:profile:',
  USER_PERMISSIONS: 'user:permissions:',
  USER_PREFERENCES: 'user:preferences:',
  REVIEW: 'review:',
  GOAL: 'goal:',
  FEEDBACK: 'feedback:',
  DASHBOARD: 'dashboard:',
  LEADERBOARD: 'leaderboard:',
  TEAM_METRICS: 'team:metrics:',
  REPORT: 'report:',
  ML_RECOMMENDATION: 'ml:recommendation:',
  ENGAGEMENT_SCORE: 'engagement:score:',
  SENTIMENT_SCORE: 'sentiment:score:',
  HEALTH_METRICS: 'health:metrics:',
  PRODUCTIVITY_PREDICTION: 'productivity:prediction:',
  DEPARTMENT_STATS: 'dept:stats:',
  ORG_STATS: 'org:stats:',
  RATE_LIMIT: 'ratelimit:',
  VERIFICATION_CODE: 'verification:',
  TEMP_DATA: 'temp:'
} as const;

export class RedisCacheService {
  private redis: Redis;
  private subscriber: Redis;
  private _available = false;
  private _errorLogged = false;

  get available(): boolean {
    return this._available;
  }

  constructor() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'pms:',
      retryStrategy: (times: number) => {
        if (times > 3) {
          // Stop retrying — Redis not available in this environment
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true, // Don't connect until first use
    };

    this.redis = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);

    this.redis.on('error', (err) => {
      this._available = false;
      if (!this._errorLogged) {
        console.warn('[RedisCacheService] Redis unavailable:', (err as Error).message);
        this._errorLogged = true;
      }
    });

    this.redis.on('connect', () => {
      this._available = true;
      this._errorLogged = false;
      console.log('[RedisCacheService] Redis connected');
    });

    this.redis.on('end', () => {
      this._available = false;
    });
  }

  // ============================================================================
  // BASIC CACHE OPERATIONS
  // ============================================================================

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cache value with TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error(`Cache SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete cache entry
   */
  async del(key: string | string[]): Promise<number> {
    try {
      const keys = Array.isArray(key) ? key : [key];
      return await this.redis.del(...keys);
    } catch (error) {
      console.error(`Cache DEL error:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set expiration time
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error(`Cache EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      console.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  // ============================================================================
  // PATTERN-BASED OPERATIONS
  // ============================================================================

  /**
   * Delete keys matching pattern
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;
      return await this.redis.del(...keys);
    } catch (error) {
      console.error(`Cache DEL PATTERN error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      console.error(`Cache KEYS error for pattern ${pattern}:`, error);
      return [];
    }
  }

  // ============================================================================
  // HASH OPERATIONS
  // ============================================================================

  /**
   * Set hash field
   */
  async hset(key: string, field: string, value: any): Promise<number> {
    try {
      const serialized = JSON.stringify(value);
      return await this.redis.hset(key, field, serialized);
    } catch (error) {
      console.error(`Cache HSET error:`, error);
      return 0;
    }
  }

  /**
   * Get hash field
   */
  async hget<T>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.redis.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache HGET error:`, error);
      return null;
    }
  }

  /**
   * Get all hash fields
   */
  async hgetall<T>(key: string): Promise<Record<string, T> | null> {
    try {
      const hash = await this.redis.hgetall(key);
      if (!hash || Object.keys(hash).length === 0) return null;

      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(hash)) {
        result[field] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      console.error(`Cache HGETALL error:`, error);
      return null;
    }
  }

  /**
   * Delete hash field
   */
  async hdel(key: string, field: string | string[]): Promise<number> {
    try {
      const fields = Array.isArray(field) ? field : [field];
      return await this.redis.hdel(key, ...fields);
    } catch (error) {
      console.error(`Cache HDEL error:`, error);
      return 0;
    }
  }

  // ============================================================================
  // LIST OPERATIONS
  // ============================================================================

  /**
   * Push to list (left/right)
   */
  async lpush(key: string, value: any): Promise<number> {
    try {
      const serialized = JSON.stringify(value);
      return await this.redis.lpush(key, serialized);
    } catch (error) {
      console.error(`Cache LPUSH error:`, error);
      return 0;
    }
  }

  async rpush(key: string, value: any): Promise<number> {
    try {
      const serialized = JSON.stringify(value);
      return await this.redis.rpush(key, serialized);
    } catch (error) {
      console.error(`Cache RPUSH error:`, error);
      return 0;
    }
  }

  /**
   * Get list range
   */
  async lrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    try {
      const values = await this.redis.lrange(key, start, stop);
      return values.map(v => JSON.parse(v));
    } catch (error) {
      console.error(`Cache LRANGE error:`, error);
      return [];
    }
  }

  /**
   * Trim list
   */
  async ltrim(key: string, start: number, stop: number): Promise<boolean> {
    try {
      await this.redis.ltrim(key, start, stop);
      return true;
    } catch (error) {
      console.error(`Cache LTRIM error:`, error);
      return false;
    }
  }

  // ============================================================================
  // SORTED SET OPERATIONS (for leaderboards)
  // ============================================================================

  /**
   * Add to sorted set
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    try {
      return await this.redis.zadd(key, score, member);
    } catch (error) {
      console.error(`Cache ZADD error:`, error);
      return 0;
    }
  }

  /**
   * Get sorted set range (ascending)
   */
  async zrange(key: string, start: number, stop: number, withScores = false): Promise<any[]> {
    try {
      if (withScores) {
        return await this.redis.zrange(key, start, stop, 'WITHSCORES');
      }
      return await this.redis.zrange(key, start, stop);
    } catch (error) {
      console.error(`Cache ZRANGE error:`, error);
      return [];
    }
  }

  /**
   * Get sorted set range (descending)
   */
  async zrevrange(key: string, start: number, stop: number, withScores = false): Promise<any[]> {
    try {
      if (withScores) {
        return await this.redis.zrevrange(key, start, stop, 'WITHSCORES');
      }
      return await this.redis.zrevrange(key, start, stop);
    } catch (error) {
      console.error(`Cache ZREVRANGE error:`, error);
      return [];
    }
  }

  /**
   * Get member rank
   */
  async zrank(key: string, member: string): Promise<number | null> {
    try {
      return await this.redis.zrank(key, member);
    } catch (error) {
      console.error(`Cache ZRANK error:`, error);
      return null;
    }
  }

  /**
   * Get member score
   */
  async zscore(key: string, member: string): Promise<number | null> {
    try {
      const score = await this.redis.zscore(key, member);
      return score ? parseFloat(score) : null;
    } catch (error) {
      console.error(`Cache ZSCORE error:`, error);
      return null;
    }
  }

  // ============================================================================
  // CACHE-ASIDE PATTERN HELPERS
  // ============================================================================

  /**
   * Get or set pattern
   */
  async getOrSet<T>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<T>
  ): Promise<T | null> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch from source
    try {
      const data = await fetchFn();
      if (data !== null && data !== undefined) {
        await this.set(key, data, ttl);
      }
      return data;
    } catch (error) {
      console.error(`Get or set error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Memoize function with cache
   */
  memoize<T>(
    keyGenerator: (...args: any[]) => string,
    ttl: number,
    fn: (...args: any[]) => Promise<T>
  ) {
    return async (...args: any[]): Promise<T | null> => {
      const key = keyGenerator(...args);
      return this.getOrSet(key, ttl, () => fn(...args));
    };
  }

  // ============================================================================
  // CACHE INVALIDATION
  // ============================================================================

  /**
   * Invalidate user-related cache
   */
  async invalidateUser(userId: string): Promise<void> {
    await Promise.all([
      this.delPattern(`*:user:*:${userId}*`),
      this.delPattern(`*:${userId}:*`),
      this.delPattern(`*dashboard:${userId}*`),
      this.delPattern(`*team:*:*:${userId}*`)
    ]);
  }

  /**
   * Invalidate team-related cache
   */
  async invalidateTeam(teamId: string): Promise<void> {
    await Promise.all([
      this.delPattern(`*team:*:${teamId}*`),
      this.delPattern(`*leaderboard:team:${teamId}*`)
    ]);
  }

  /**
   * Invalidate department cache
   */
  async invalidateDepartment(deptId: string): Promise<void> {
    await Promise.all([
      this.delPattern(`*dept:*:${deptId}*`),
      this.delPattern(`*department:${deptId}*`)
    ]);
  }

  /**
   * Invalidate organization cache
   */
  async invalidateOrganization(tenantId: string): Promise<void> {
    await Promise.all([
      this.delPattern(`*org:*:${tenantId}*`),
      this.delPattern(`*tenant:${tenantId}*`)
    ]);
  }

  /**
   * Invalidate review cache
   */
  async invalidateReview(reviewId: string, userId: string): Promise<void> {
    await Promise.all([
      this.del(`${CACHE_PREFIX.REVIEW}${reviewId}`),
      this.delPattern(`*dashboard:${userId}*`),
      this.invalidateUser(userId)
    ]);
  }

  /**
   * Invalidate goal cache
   */
  async invalidateGoal(goalId: string, ownerId: string): Promise<void> {
    await Promise.all([
      this.del(`${CACHE_PREFIX.GOAL}${goalId}`),
      this.delPattern(`*dashboard:${ownerId}*`),
      this.delPattern(`*goal:*:${ownerId}*`)
    ]);
  }

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  /**
   * Check rate limit
   */
  async rateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    try {
      const fullKey = `${CACHE_PREFIX.RATE_LIMIT}${key}`;
      const current = await this.redis.incr(fullKey);

      if (current === 1) {
        await this.redis.expire(fullKey, windowSeconds);
      }

      const ttl = await this.redis.ttl(fullKey);
      const resetAt = Date.now() + (ttl * 1000);

      return {
        allowed: current <= maxRequests,
        remaining: Math.max(0, maxRequests - current),
        resetAt
      };
    } catch (error) {
      console.error('Rate limit error:', error);
      return { allowed: true, remaining: maxRequests, resetAt: Date.now() + (windowSeconds * 1000) };
    }
  }

  // ============================================================================
  // PUB/SUB
  // ============================================================================

  /**
   * Publish message
   */
  async publish(channel: string, message: any): Promise<number> {
    try {
      const serialized = JSON.stringify(message);
      return await this.redis.publish(channel, serialized);
    } catch (error) {
      console.error(`Publish error on channel ${channel}:`, error);
      return 0;
    }
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (ch, msg) => {
        if (ch === channel) {
          try {
            const parsed = JSON.parse(msg);
            callback(parsed);
          } catch (error) {
            console.error('Message parse error:', error);
          }
        }
      });
    } catch (error) {
      console.error(`Subscribe error on channel ${channel}:`, error);
    }
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channel: string): Promise<void> {
    try {
      await this.subscriber.unsubscribe(channel);
    } catch (error) {
      console.error(`Unsubscribe error on channel ${channel}:`, error);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Flush all cache (use with caution!)
   */
  async flushAll(): Promise<boolean> {
    try {
      await this.redis.flushdb();
      return true;
    } catch (error) {
      console.error('Flush all error:', error);
      return false;
    }
  }

  /**
   * Get cache info
   */
  async info(): Promise<string> {
    try {
      return await this.redis.info();
    } catch (error) {
      console.error('Info error:', error);
      return '';
    }
  }

  /**
   * Get cache stats
   */
  async stats(): Promise<{
    dbSize: number;
    memoryUsed: string;
    connectedClients: number;
    uptime: number;
  }> {
    try {
      const info = await this.info();
      const dbSize = await this.redis.dbsize();

      // Parse info string
      const lines = info.split('\r\n');
      const stats: any = {};
      for (const line of lines) {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      }

      return {
        dbSize,
        memoryUsed: stats.used_memory_human || '0',
        connectedClients: parseInt(stats.connected_clients) || 0,
        uptime: parseInt(stats.uptime_in_seconds) || 0
      };
    } catch (error) {
      console.error('Stats error:', error);
      return {
        dbSize: 0,
        memoryUsed: '0',
        connectedClients: 0,
        uptime: 0
      };
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
    await this.subscriber.quit();
  }
}

// Export singleton instance
export const cacheService = new RedisCacheService();
