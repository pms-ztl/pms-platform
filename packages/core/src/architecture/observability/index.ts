/**
 * Observability Architecture
 *
 * Comprehensive logging, metrics, tracing, and monitoring infrastructure.
 */

// ============================================================================
// LOGGING
// ============================================================================

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context: LogContext;
  metadata?: Record<string, unknown>;
  error?: ErrorInfo;
}

export interface LogContext {
  tenantId?: string;
  userId?: string;
  correlationId: string;
  requestId?: string;
  service: string;
  component: string;
  operation?: string;
  environment: string;
  version: string;
}

export interface ErrorInfo {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  cause?: ErrorInfo;
}

export interface Logger {
  trace(message: string, metadata?: Record<string, unknown>): void;
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, error?: Error, metadata?: Record<string, unknown>): void;
  fatal(message: string, error?: Error, metadata?: Record<string, unknown>): void;
  child(context: Partial<LogContext>): Logger;
}

export interface LogTransport {
  name: string;
  minLevel: LogLevel;
  write(entry: LogEntry): void;
}

// Structured Logger Implementation
export class StructuredLogger implements Logger {
  private transports: LogTransport[] = [];

  constructor(
    private context: LogContext,
    private minLevel: LogLevel = LogLevel.INFO
  ) {}

  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  trace(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.TRACE, message, metadata);
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, metadata, error);
  }

  fatal(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, metadata, error);
  }

  child(context: Partial<LogContext>): Logger {
    return new StructuredLogger(
      { ...this.context, ...context },
      this.minLevel
    );
  }

  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error
  ): void {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: this.context,
      metadata,
      error: error ? this.serializeError(error) : undefined,
    };

    for (const transport of this.transports) {
      if (level >= transport.minLevel) {
        transport.write(entry);
      }
    }
  }

  private serializeError(error: Error): ErrorInfo {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
      cause: error.cause ? this.serializeError(error.cause as Error) : undefined,
    };
  }
}

// Console Transport
export class ConsoleTransport implements LogTransport {
  name = 'console';

  constructor(public minLevel: LogLevel = LogLevel.DEBUG) {}

  write(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp.toISOString();
    const output = {
      timestamp,
      level: levelName,
      message: entry.message,
      ...entry.context,
      ...entry.metadata,
      error: entry.error,
    };

    const logFn = entry.level >= LogLevel.ERROR ? console.error :
                  entry.level >= LogLevel.WARN ? console.warn :
                  entry.level >= LogLevel.DEBUG ? console.debug :
                  console.log;

    logFn(JSON.stringify(output));
  }
}

// ============================================================================
// METRICS
// ============================================================================

export enum MetricType {
  COUNTER = 'COUNTER',
  GAUGE = 'GAUGE',
  HISTOGRAM = 'HISTOGRAM',
  SUMMARY = 'SUMMARY',
}

export interface MetricLabels {
  [key: string]: string;
}

export interface Metric {
  name: string;
  type: MetricType;
  description: string;
  labels: string[];
}

export interface MetricValue {
  metric: Metric;
  labels: MetricLabels;
  value: number;
  timestamp: Date;
}

export interface Counter {
  inc(labels?: MetricLabels, value?: number): void;
}

export interface Gauge {
  set(value: number, labels?: MetricLabels): void;
  inc(labels?: MetricLabels, value?: number): void;
  dec(labels?: MetricLabels, value?: number): void;
}

export interface Histogram {
  observe(value: number, labels?: MetricLabels): void;
}

export interface MetricsRegistry {
  createCounter(name: string, description: string, labels?: string[]): Counter;
  createGauge(name: string, description: string, labels?: string[]): Gauge;
  createHistogram(name: string, description: string, buckets: number[], labels?: string[]): Histogram;
  getMetrics(): MetricValue[];
}

// In-Memory Metrics Registry
export class InMemoryMetricsRegistry implements MetricsRegistry {
  private counters: Map<string, Map<string, number>> = new Map();
  private gauges: Map<string, Map<string, number>> = new Map();
  private histograms: Map<string, Map<string, number[]>> = new Map();
  private metrics: Map<string, Metric> = new Map();

  createCounter(name: string, description: string, labels: string[] = []): Counter {
    const metric: Metric = { name, type: MetricType.COUNTER, description, labels };
    this.metrics.set(name, metric);
    this.counters.set(name, new Map());

    return {
      inc: (labelValues?: MetricLabels, value: number = 1) => {
        const key = this.labelsToKey(labelValues);
        const current = this.counters.get(name)!.get(key) || 0;
        this.counters.get(name)!.set(key, current + value);
      },
    };
  }

  createGauge(name: string, description: string, labels: string[] = []): Gauge {
    const metric: Metric = { name, type: MetricType.GAUGE, description, labels };
    this.metrics.set(name, metric);
    this.gauges.set(name, new Map());

    return {
      set: (value: number, labelValues?: MetricLabels) => {
        const key = this.labelsToKey(labelValues);
        this.gauges.get(name)!.set(key, value);
      },
      inc: (labelValues?: MetricLabels, value: number = 1) => {
        const key = this.labelsToKey(labelValues);
        const current = this.gauges.get(name)!.get(key) || 0;
        this.gauges.get(name)!.set(key, current + value);
      },
      dec: (labelValues?: MetricLabels, value: number = 1) => {
        const key = this.labelsToKey(labelValues);
        const current = this.gauges.get(name)!.get(key) || 0;
        this.gauges.get(name)!.set(key, current - value);
      },
    };
  }

  createHistogram(
    name: string,
    description: string,
    buckets: number[],
    labels: string[] = []
  ): Histogram {
    const metric: Metric = { name, type: MetricType.HISTOGRAM, description, labels };
    this.metrics.set(name, metric);
    this.histograms.set(name, new Map());

    return {
      observe: (value: number, labelValues?: MetricLabels) => {
        const key = this.labelsToKey(labelValues);
        const values = this.histograms.get(name)!.get(key) || [];
        values.push(value);
        this.histograms.get(name)!.set(key, values);
      },
    };
  }

  getMetrics(): MetricValue[] {
    const result: MetricValue[] = [];
    const now = new Date();

    for (const [name, values] of this.counters) {
      const metric = this.metrics.get(name)!;
      for (const [key, value] of values) {
        result.push({
          metric,
          labels: this.keyToLabels(key),
          value,
          timestamp: now,
        });
      }
    }

    for (const [name, values] of this.gauges) {
      const metric = this.metrics.get(name)!;
      for (const [key, value] of values) {
        result.push({
          metric,
          labels: this.keyToLabels(key),
          value,
          timestamp: now,
        });
      }
    }

    return result;
  }

  private labelsToKey(labels?: MetricLabels): string {
    if (!labels) return '';
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
  }

  private keyToLabels(key: string): MetricLabels {
    if (!key) return {};
    const labels: MetricLabels = {};
    for (const pair of key.split(',')) {
      const [k, v] = pair.split('=');
      labels[k] = v;
    }
    return labels;
  }
}

// ============================================================================
// DISTRIBUTED TRACING
// ============================================================================

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
  baggage: Map<string, string>;
}

export interface Span {
  context: TraceContext;
  operationName: string;
  startTime: Date;
  endTime?: Date;
  tags: Map<string, string | number | boolean>;
  logs: Array<{ timestamp: Date; fields: Record<string, unknown> }>;
  status: SpanStatus;

  setTag(key: string, value: string | number | boolean): Span;
  log(fields: Record<string, unknown>): Span;
  setStatus(status: SpanStatus): Span;
  finish(): void;
}

export enum SpanStatus {
  OK = 'OK',
  ERROR = 'ERROR',
  UNSET = 'UNSET',
}

export interface Tracer {
  startSpan(operationName: string, options?: StartSpanOptions): Span;
  inject(context: TraceContext, carrier: Record<string, string>): void;
  extract(carrier: Record<string, string>): TraceContext | null;
}

export interface StartSpanOptions {
  childOf?: TraceContext;
  tags?: Record<string, string | number | boolean>;
}

// In-Memory Tracer Implementation
export class InMemoryTracer implements Tracer {
  private spans: Span[] = [];

  startSpan(operationName: string, options?: StartSpanOptions): Span {
    const parentContext = options?.childOf;

    const context: TraceContext = {
      traceId: parentContext?.traceId || this.generateId(),
      spanId: this.generateId(),
      parentSpanId: parentContext?.spanId,
      sampled: true,
      baggage: new Map(parentContext?.baggage),
    };

    const span: Span = {
      context,
      operationName,
      startTime: new Date(),
      tags: new Map(Object.entries(options?.tags || {})),
      logs: [],
      status: SpanStatus.UNSET,

      setTag(key: string, value: string | number | boolean): Span {
        this.tags.set(key, value);
        return this;
      },

      log(fields: Record<string, unknown>): Span {
        this.logs.push({ timestamp: new Date(), fields });
        return this;
      },

      setStatus(status: SpanStatus): Span {
        this.status = status;
        return this;
      },

      finish: () => {
        span.endTime = new Date();
        this.spans.push(span);
      },
    };

    return span;
  }

  inject(context: TraceContext, carrier: Record<string, string>): void {
    carrier['x-trace-id'] = context.traceId;
    carrier['x-span-id'] = context.spanId;
    carrier['x-sampled'] = context.sampled ? '1' : '0';
  }

  extract(carrier: Record<string, string>): TraceContext | null {
    const traceId = carrier['x-trace-id'];
    const spanId = carrier['x-span-id'];

    if (!traceId || !spanId) return null;

    return {
      traceId,
      spanId,
      sampled: carrier['x-sampled'] === '1',
      baggage: new Map(),
    };
  }

  getSpans(): Span[] {
    return [...this.spans];
  }

  private generateId(): string {
    return `${Date.now().toString(16)}-${Math.random().toString(16).substr(2, 8)}`;
  }
}

// ============================================================================
// HEALTH CHECKS
// ============================================================================

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
}

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message?: string;
  duration: number; // milliseconds
  details?: Record<string, unknown>;
  timestamp: Date;
}

export interface HealthCheck {
  name: string;
  check(): Promise<HealthCheckResult>;
}

export interface HealthCheckRegistry {
  register(check: HealthCheck): void;
  runAll(): Promise<HealthReport>;
  runCheck(name: string): Promise<HealthCheckResult>;
}

export interface HealthReport {
  status: HealthStatus;
  checks: HealthCheckResult[];
  timestamp: Date;
  version: string;
  uptime: number;
}

export class DefaultHealthCheckRegistry implements HealthCheckRegistry {
  private checks: Map<string, HealthCheck> = new Map();
  private startTime: Date = new Date();

  constructor(private version: string = '1.0.0') {}

  register(check: HealthCheck): void {
    this.checks.set(check.name, check);
  }

  async runAll(): Promise<HealthReport> {
    const results: HealthCheckResult[] = [];

    for (const check of this.checks.values()) {
      try {
        const result = await check.check();
        results.push(result);
      } catch (error) {
        results.push({
          name: check.name,
          status: HealthStatus.UNHEALTHY,
          message: (error as Error).message,
          duration: 0,
          timestamp: new Date(),
        });
      }
    }

    const overallStatus = this.determineOverallStatus(results);

    return {
      status: overallStatus,
      checks: results,
      timestamp: new Date(),
      version: this.version,
      uptime: Date.now() - this.startTime.getTime(),
    };
  }

  async runCheck(name: string): Promise<HealthCheckResult> {
    const check = this.checks.get(name);
    if (!check) {
      throw new Error(`Health check not found: ${name}`);
    }
    return check.check();
  }

  private determineOverallStatus(results: HealthCheckResult[]): HealthStatus {
    const hasUnhealthy = results.some(r => r.status === HealthStatus.UNHEALTHY);
    const hasDegraded = results.some(r => r.status === HealthStatus.DEGRADED);

    if (hasUnhealthy) return HealthStatus.UNHEALTHY;
    if (hasDegraded) return HealthStatus.DEGRADED;
    return HealthStatus.HEALTHY;
  }
}

// Common Health Checks
export class DatabaseHealthCheck implements HealthCheck {
  name = 'database';

  constructor(private checkConnection: () => Promise<boolean>) {}

  async check(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const isConnected = await this.checkConnection();
      return {
        name: this.name,
        status: isConnected ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        message: isConnected ? 'Database connection OK' : 'Database connection failed',
        duration: Date.now() - start,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        name: this.name,
        status: HealthStatus.UNHEALTHY,
        message: (error as Error).message,
        duration: Date.now() - start,
        timestamp: new Date(),
      };
    }
  }
}

export class MemoryHealthCheck implements HealthCheck {
  name = 'memory';

  constructor(private maxHeapUsagePercent: number = 90) {}

  async check(): Promise<HealthCheckResult> {
    const start = Date.now();
    const used = process.memoryUsage?.() || { heapUsed: 0, heapTotal: 1 };
    const heapUsagePercent = (used.heapUsed / used.heapTotal) * 100;

    const status = heapUsagePercent > this.maxHeapUsagePercent
      ? HealthStatus.DEGRADED
      : HealthStatus.HEALTHY;

    return {
      name: this.name,
      status,
      message: `Heap usage: ${heapUsagePercent.toFixed(1)}%`,
      duration: Date.now() - start,
      details: {
        heapUsed: used.heapUsed,
        heapTotal: used.heapTotal,
        heapUsagePercent,
      },
      timestamp: new Date(),
    };
  }
}

// ============================================================================
// PMS-SPECIFIC METRICS
// ============================================================================

export interface PMSMetrics {
  // Review metrics
  reviewsSubmitted: Counter;
  reviewsCalibrated: Counter;
  reviewCycleCompletionTime: Histogram;

  // Goal metrics
  goalsCreated: Counter;
  goalsCompleted: Counter;
  goalProgressUpdates: Counter;
  goalCompletionRate: Gauge;

  // Feedback metrics
  feedbackGiven: Counter;
  feedbackReceived: Counter;

  // Bias detection metrics
  biasAlertsTriggered: Counter;
  biasAlertsBySeverity: Counter;

  // Performance metrics
  apiLatency: Histogram;
  apiErrors: Counter;
  activeUsers: Gauge;
  concurrentSessions: Gauge;
}

export function createPMSMetrics(registry: MetricsRegistry): PMSMetrics {
  return {
    reviewsSubmitted: registry.createCounter(
      'pms_reviews_submitted_total',
      'Total number of reviews submitted',
      ['cycle_id', 'review_type', 'tenant_id']
    ),
    reviewsCalibrated: registry.createCounter(
      'pms_reviews_calibrated_total',
      'Total number of reviews calibrated',
      ['session_id', 'tenant_id']
    ),
    reviewCycleCompletionTime: registry.createHistogram(
      'pms_review_cycle_completion_seconds',
      'Time to complete review cycles',
      [3600, 7200, 14400, 28800, 57600, 86400, 172800, 604800],
      ['cycle_type', 'tenant_id']
    ),

    goalsCreated: registry.createCounter(
      'pms_goals_created_total',
      'Total number of goals created',
      ['goal_type', 'tenant_id']
    ),
    goalsCompleted: registry.createCounter(
      'pms_goals_completed_total',
      'Total number of goals completed',
      ['goal_type', 'outcome', 'tenant_id']
    ),
    goalProgressUpdates: registry.createCounter(
      'pms_goal_progress_updates_total',
      'Total number of goal progress updates',
      ['source', 'tenant_id']
    ),
    goalCompletionRate: registry.createGauge(
      'pms_goal_completion_rate',
      'Goal completion rate as percentage',
      ['period', 'tenant_id']
    ),

    feedbackGiven: registry.createCounter(
      'pms_feedback_given_total',
      'Total feedback items given',
      ['feedback_type', 'visibility', 'tenant_id']
    ),
    feedbackReceived: registry.createCounter(
      'pms_feedback_received_total',
      'Total feedback items received',
      ['feedback_type', 'tenant_id']
    ),

    biasAlertsTriggered: registry.createCounter(
      'pms_bias_alerts_total',
      'Total bias alerts triggered',
      ['bias_type', 'source_type', 'tenant_id']
    ),
    biasAlertsBySeverity: registry.createCounter(
      'pms_bias_alerts_by_severity_total',
      'Bias alerts by severity',
      ['severity', 'tenant_id']
    ),

    apiLatency: registry.createHistogram(
      'pms_api_latency_seconds',
      'API request latency',
      [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      ['method', 'path', 'status_code']
    ),
    apiErrors: registry.createCounter(
      'pms_api_errors_total',
      'Total API errors',
      ['method', 'path', 'error_code']
    ),
    activeUsers: registry.createGauge(
      'pms_active_users',
      'Number of active users',
      ['tenant_id']
    ),
    concurrentSessions: registry.createGauge(
      'pms_concurrent_sessions',
      'Number of concurrent sessions',
      ['tenant_id']
    ),
  };
}

// ============================================================================
// OBSERVABILITY CONTEXT
// ============================================================================

export interface ObservabilityContext {
  logger: Logger;
  tracer: Tracer;
  metrics: PMSMetrics;
  healthChecks: HealthCheckRegistry;
}

export function createObservabilityContext(options: {
  service: string;
  version: string;
  environment: string;
}): ObservabilityContext {
  const metricsRegistry = new InMemoryMetricsRegistry();

  const logger = new StructuredLogger({
    service: options.service,
    component: 'main',
    environment: options.environment,
    version: options.version,
    correlationId: '',
  });
  logger.addTransport(new ConsoleTransport());

  return {
    logger,
    tracer: new InMemoryTracer(),
    metrics: createPMSMetrics(metricsRegistry),
    healthChecks: new DefaultHealthCheckRegistry(options.version),
  };
}
