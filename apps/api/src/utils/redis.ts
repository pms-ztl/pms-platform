import Redis from 'ioredis';

import { config } from '../config';
import { logger } from './logger';

let redisClient: Redis | null = null;
let redisAvailable = false;
let redisErrorLogged = false;

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export function getRedisClient(): Redis {
  if (redisClient === null) {
    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy(times: number) {
        if (times > 3) {
          // Stop retrying after 3 attempts — Redis is not available
          if (!redisErrorLogged) {
            logger.warn('Redis unavailable after 3 retries — running without cache');
            redisErrorLogged = true;
          }
          return null; // stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      reconnectOnError() {
        return false; // don't auto-reconnect on errors
      },
    });

    redisClient.on('connect', () => {
      redisAvailable = true;
      redisErrorLogged = false;
      logger.info('Redis connected');
    });

    redisClient.on('error', (err) => {
      redisAvailable = false;
      // Only log the first error, not every retry
      if (!redisErrorLogged) {
        logger.warn('Redis error: ' + (err as Error).message);
        redisErrorLogged = true;
      }
    });

    redisClient.on('close', () => {
      redisAvailable = false;
    });

    redisClient.on('end', () => {
      redisAvailable = false;
    });
  }

  return redisClient;
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  await client.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient !== null) {
    try {
      await redisClient.quit();
    } catch {
      // Redis was never connected, just clean up
      redisClient.disconnect();
    }
    redisClient = null;
    redisAvailable = false;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redisAvailable) return null;
  try {
    const client = getRedisClient();
    const value = await client.get(key);

    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<void> {
  if (!redisAvailable) return;
  try {
    const client = getRedisClient();
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    if (ttlSeconds !== undefined) {
      await client.setex(key, ttlSeconds, serialized);
    } else {
      await client.set(key, serialized);
    }
  } catch {
    // silently skip cache write when Redis unavailable
  }
}

export async function cacheDelete(key: string): Promise<void> {
  if (!redisAvailable) return;
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch {
    // skip
  }
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  if (!redisAvailable) return;
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);

    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch {
    // skip
  }
}

// Session management (gracefully no-ops when Redis unavailable)
export async function setSession(
  sessionId: string,
  data: Record<string, unknown>,
  ttlSeconds: number = 28800 // 8 hours
): Promise<void> {
  await cacheSet(`session:${sessionId}`, data, ttlSeconds);
}

export async function getSession<T>(sessionId: string): Promise<T | null> {
  return cacheGet<T>(`session:${sessionId}`);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await cacheDelete(`session:${sessionId}`);
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  await cacheDeletePattern(`session:*:user:${userId}`);
}
