/**
 * Comprehensive Health Check System
 *
 * Enterprise-grade health checks for:
 * - Liveness (is the service running?)
 * - Readiness (can the service accept traffic?)
 * - Component-level health (database, redis, external services)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: ComponentHealth[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
  lastChecked: string;
  details?: Record<string, unknown>;
}

export interface HealthCheckConfig {
  name: string;
  check: () => Promise<HealthCheckResult>;
  critical?: boolean;
  timeout?: number;
  interval?: number;
}

export interface HealthCheckResult {
  healthy: boolean;
  degraded?: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// HEALTH CHECK REGISTRY
// ============================================================================

export class HealthCheckRegistry {
  private checks: Map<string, HealthCheckConfig> = new Map();
  private startTime: number = Date.now();
  private version: string;
  private cachedResults: Map<string, { result: ComponentHealth; expires: number }> = new Map();
  private cacheTTL: number = 5000; // 5 seconds default cache

  constructor(version: string = '1.0.0') {
    this.version = version;
  }

  register(config: HealthCheckConfig): void {
    this.checks.set(config.name, config);
  }

  unregister(name: string): void {
    this.checks.delete(name);
    this.cachedResults.delete(name);
  }

  setCacheTTL(ttlMs: number): void {
    this.cacheTTL = ttlMs;
  }

  async checkLiveness(): Promise<{ status: 'ok' | 'error'; uptime: number }> {
    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  async checkReadiness(): Promise<HealthStatus> {
    const checks: ComponentHealth[] = [];
    const now = Date.now();

    for (const [name, config] of this.checks) {
      // Check cache first
      const cached = this.cachedResults.get(name);
      if (cached && cached.expires > now) {
        checks.push(cached.result);
        continue;
      }

      const timeout = config.timeout || 5000;
      const startTime = Date.now();

      try {
        const result = await Promise.race([
          config.check(),
          new Promise<HealthCheckResult>((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), timeout)
          ),
        ]);

        const latency = Date.now() - startTime;
        const componentHealth: ComponentHealth = {
          name,
          status: result.healthy ? (result.degraded ? 'degraded' : 'healthy') : 'unhealthy',
          latency,
          message: result.message,
          lastChecked: new Date().toISOString(),
          details: result.details,
        };

        checks.push(componentHealth);
        this.cachedResults.set(name, {
          result: componentHealth,
          expires: now + this.cacheTTL,
        });
      } catch (error) {
        const componentHealth: ComponentHealth = {
          name,
          status: 'unhealthy',
          latency: Date.now() - startTime,
          message: error instanceof Error ? error.message : 'Unknown error',
          lastChecked: new Date().toISOString(),
        };

        checks.push(componentHealth);
        this.cachedResults.set(name, {
          result: componentHealth,
          expires: now + this.cacheTTL,
        });
      }
    }

    const summary = {
      total: checks.length,
      healthy: checks.filter(c => c.status === 'healthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
      unhealthy: checks.filter(c => c.status === 'unhealthy').length,
    };

    // Critical checks determine overall status
    const criticalChecks = Array.from(this.checks.entries())
      .filter(([_, config]) => config.critical)
      .map(([name]) => name);

    const criticalUnhealthy = checks.some(
      c => criticalChecks.includes(c.name) && c.status === 'unhealthy'
    );

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (criticalUnhealthy || summary.unhealthy > summary.total / 2) {
      overallStatus = 'unhealthy';
    } else if (summary.degraded > 0 || summary.unhealthy > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: this.version,
      checks,
      summary,
    };
  }

  async checkComponent(name: string): Promise<ComponentHealth | null> {
    const config = this.checks.get(name);
    if (!config) return null;

    const startTime = Date.now();
    try {
      const result = await config.check();
      return {
        name,
        status: result.healthy ? (result.degraded ? 'degraded' : 'healthy') : 'unhealthy',
        latency: Date.now() - startTime,
        message: result.message,
        lastChecked: new Date().toISOString(),
        details: result.details,
      };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        latency: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString(),
      };
    }
  }
}

// ============================================================================
// STANDARD HEALTH CHECKS
// ============================================================================

/**
 * Database health check using Prisma
 */
export function createDatabaseHealthCheck(prisma: unknown): HealthCheckConfig {
  return {
    name: 'database',
    critical: true,
    timeout: 5000,
    check: async () => {
      const startTime = Date.now();
      try {
        // @ts-expect-error - Prisma client type varies
        await prisma.$queryRaw`SELECT 1`;
        const latency = Date.now() - startTime;

        // Degraded if latency > 100ms
        const degraded = latency > 100;

        return {
          healthy: true,
          degraded,
          message: `Database responding (${latency}ms)`,
          details: { latency },
        };
      } catch (error) {
        return {
          healthy: false,
          message: `Database error: ${error}`,
        };
      }
    },
  };
}

/**
 * Redis health check
 */
export function createRedisHealthCheck(redis: unknown): HealthCheckConfig {
  return {
    name: 'redis',
    critical: true,
    timeout: 3000,
    check: async () => {
      if (!redis) {
        return {
          healthy: false,
          message: 'Redis client not configured',
        };
      }

      const startTime = Date.now();
      try {
        // @ts-expect-error - Redis client type varies
        const pong = await redis.ping();
        const latency = Date.now() - startTime;

        if (pong !== 'PONG') {
          return {
            healthy: false,
            message: `Redis ping failed: ${pong}`,
          };
        }

        return {
          healthy: true,
          degraded: latency > 50,
          message: `Redis responding (${latency}ms)`,
          details: { latency },
        };
      } catch (error) {
        return {
          healthy: false,
          message: `Redis error: ${error}`,
        };
      }
    },
  };
}

/**
 * Memory health check
 */
export function createMemoryHealthCheck(maxHeapMB: number = 1024): HealthCheckConfig {
  return {
    name: 'memory',
    critical: false,
    timeout: 1000,
    check: async () => {
      const used = process.memoryUsage();
      const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
      const rssMB = Math.round(used.rss / 1024 / 1024);

      const usagePercent = (heapUsedMB / maxHeapMB) * 100;

      return {
        healthy: usagePercent < 90,
        degraded: usagePercent > 70,
        message: `Memory usage: ${heapUsedMB}MB / ${maxHeapMB}MB (${usagePercent.toFixed(1)}%)`,
        details: {
          heapUsed: heapUsedMB,
          heapTotal: heapTotalMB,
          rss: rssMB,
          usagePercent,
        },
      };
    },
  };
}

/**
 * Disk space health check (for log directories, etc.)
 */
export function createDiskHealthCheck(
  path: string = '/',
  minFreeGB: number = 1
): HealthCheckConfig {
  return {
    name: `disk:${path}`,
    critical: false,
    timeout: 2000,
    check: async () => {
      // This is a placeholder - in production, use a proper disk check library
      // like `check-disk-space` or system commands
      try {
        // For now, just verify the path exists
        const fs = await import('fs');
        const stats = fs.statSync(path);

        return {
          healthy: true,
          message: `Disk path accessible: ${path}`,
          details: {
            path,
            minFreeGB,
          },
        };
      } catch (error) {
        return {
          healthy: false,
          message: `Disk check failed for ${path}: ${error}`,
        };
      }
    },
  };
}

/**
 * External service health check
 */
export function createExternalServiceHealthCheck(
  name: string,
  url: string,
  expectedStatus: number = 200
): HealthCheckConfig {
  return {
    name: `external:${name}`,
    critical: false,
    timeout: 5000,
    check: async () => {
      const startTime = Date.now();
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(4000),
        });
        const latency = Date.now() - startTime;

        if (response.status === expectedStatus) {
          return {
            healthy: true,
            degraded: latency > 1000,
            message: `${name} responding (${latency}ms)`,
            details: { status: response.status, latency },
          };
        }

        return {
          healthy: false,
          message: `${name} returned status ${response.status}`,
          details: { status: response.status, expected: expectedStatus },
        };
      } catch (error) {
        return {
          healthy: false,
          message: `${name} unreachable: ${error}`,
        };
      }
    },
  };
}

/**
 * Event loop health check
 */
export function createEventLoopHealthCheck(maxLagMs: number = 100): HealthCheckConfig {
  return {
    name: 'event_loop',
    critical: false,
    timeout: 1000,
    check: async () => {
      const start = Date.now();
      return new Promise((resolve) => {
        setImmediate(() => {
          const lag = Date.now() - start;
          resolve({
            healthy: lag < maxLagMs,
            degraded: lag > maxLagMs / 2,
            message: `Event loop lag: ${lag}ms`,
            details: { lag, maxLag: maxLagMs },
          });
        });
      });
    },
  };
}

// ============================================================================
// EXPRESS MIDDLEWARE
// ============================================================================

/**
 * Create Express middleware for health endpoints
 */
export function createHealthMiddleware(registry: HealthCheckRegistry) {
  return {
    liveness: async (_req: unknown, res: { json: (data: unknown) => void; status: (code: number) => { json: (data: unknown) => void } }) => {
      const health = await registry.checkLiveness();
      res.json(health);
    },

    readiness: async (_req: unknown, res: { json: (data: unknown) => void; status: (code: number) => { json: (data: unknown) => void } }) => {
      const health = await registry.checkReadiness();
      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(health);
    },

    component: async (req: { params: { name: string } }, res: { json: (data: unknown) => void; status: (code: number) => { json: (data: unknown) => void } }) => {
      const health = await registry.checkComponent(req.params.name);
      if (!health) {
        res.status(404).json({ error: 'Component not found' });
        return;
      }
      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(health);
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  HealthCheckRegistry,
  createDatabaseHealthCheck,
  createRedisHealthCheck,
  createMemoryHealthCheck,
  createDiskHealthCheck,
  createExternalServiceHealthCheck,
  createEventLoopHealthCheck,
  createHealthMiddleware,
};
