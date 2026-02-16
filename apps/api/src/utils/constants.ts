/**
 * Shared Constants — named constants replacing magic numbers throughout the codebase.
 *
 * Centralizes time durations, thresholds, and limits that were previously
 * scattered as inline numeric literals across multiple files.
 */

// ── Time Durations (milliseconds) ────────────────────────

/** One second in milliseconds */
export const MS_PER_SECOND = 1_000;

/** One minute in milliseconds */
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;

/** One hour in milliseconds */
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** One day in milliseconds (86,400,000) */
export const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Convert a number of days to milliseconds.
 * @param n - Number of days
 * @returns Equivalent milliseconds
 *
 * @example
 * ```ts
 * const ninetyDaysAgo = new Date(Date.now() - DAYS(90));
 * ```
 */
export const DAYS = (n: number): number => n * MS_PER_DAY;

// ── Time Durations (seconds) ────────────────────────────

/** CORS max-age header: 24 hours */
export const CORS_MAX_AGE_S = 86_400;

/** Password reset token TTL: 1 hour */
export const PASSWORD_RESET_TTL_S = 3_600;

// ── Timeouts (milliseconds) ─────────────────────────────

/** Default API request timeout */
export const DEFAULT_API_TIMEOUT_MS = 30_000;

/** Default graceful shutdown timeout */
export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30_000;

/** WebSocket ping timeout */
export const WS_PING_TIMEOUT_MS = 60_000;

/** WebSocket heartbeat interval */
export const WS_HEARTBEAT_INTERVAL_MS = 30_000;

/** Webhook delivery timeout */
export const WEBHOOK_TIMEOUT_MS = 30_000;

/** Maximum webhook retry delay */
export const WEBHOOK_MAX_RETRY_DELAY_MS = 30_000;

// ── Business Thresholds ─────────────────────────────────

/** Users with no login for this many days are considered inactive */
export const INACTIVE_USER_THRESHOLD_DAYS = 90;

/** License usage above this percentage triggers a warning */
export const LICENSE_WARNING_THRESHOLD_PERCENT = 80;

/** License usage above this percentage triggers a critical alert */
export const LICENSE_CRITICAL_THRESHOLD_PERCENT = 95;

/** IP block duration for security threats: 24 hours */
export const IP_BLOCK_DURATION_S = 86_400;

// ── Pagination Defaults ─────────────────────────────────

/** Default page size for list endpoints */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum allowed page size */
export const MAX_PAGE_SIZE = 100;

// ── Date Utilities ──────────────────────────────────────

/**
 * Calculate the number of days between two dates.
 * @param a - Start date
 * @param b - End date
 * @returns Number of days (can be fractional)
 */
export function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_DAY;
}

/**
 * Get a Date object representing N days ago from now.
 * @param n - Number of days ago
 * @returns Date object
 */
export function daysAgo(n: number): Date {
  return new Date(Date.now() - DAYS(n));
}
