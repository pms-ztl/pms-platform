/**
 * @module constants
 * @description Centralized time duration constants and date helpers.
 * Replaces scattered inline magic numbers like `24 * 60 * 60 * 1000`.
 *
 * This module is the single source of truth for all numeric constants used
 * throughout the PMS API — time durations, business thresholds, pagination
 * defaults, and date utility functions. Before this module existed, the same
 * values (e.g. `1000 * 60 * 60 * 24`) appeared in 27+ places across 8 files.
 *
 * @example
 * ```ts
 * import { DAYS, daysAgo, MS_PER_HOUR, DEFAULT_PAGE_SIZE } from '@/utils/constants';
 *
 * // Use DAYS() instead of inline arithmetic
 * const tokenExpiry = Date.now() + DAYS(7);
 *
 * // Use daysAgo() for date-range queries
 * const inactiveUsers = await prisma.user.findMany({
 *   where: { lastLoginAt: { lt: daysAgo(90) } },
 * });
 * ```
 */

// ── Time Durations (milliseconds) ────────────────────────

/** One second in milliseconds (1,000) */
export const MS_PER_SECOND = 1_000;

/** One minute in milliseconds (60,000) */
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;

/** One hour in milliseconds (3,600,000) */
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** One day in milliseconds (86,400,000) */
export const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Convert a number of days to milliseconds.
 *
 * Provides a readable alternative to `n * 24 * 60 * 60 * 1000` arithmetic.
 *
 * @param n - Number of days (can be fractional, e.g. 0.5 for 12 hours)
 * @returns Equivalent duration in milliseconds
 *
 * @example
 * ```ts
 * // Token expires in 7 days
 * const expiresAt = new Date(Date.now() + DAYS(7));
 * ```
 *
 * @example
 * ```ts
 * // Check if a record is older than 90 days
 * const cutoff = new Date(Date.now() - DAYS(90));
 * const isStale = record.createdAt < cutoff;
 * ```
 */
export const DAYS = (n: number): number => n * MS_PER_DAY;

// ── Time Durations (seconds) ────────────────────────────

/** CORS max-age header value: 24 hours (86,400 seconds) */
export const CORS_MAX_AGE_S = 86_400;

/** Password reset token time-to-live: 1 hour (3,600 seconds) */
export const PASSWORD_RESET_TTL_S = 3_600;

// ── Timeouts (milliseconds) ─────────────────────────────

/** Default API request timeout: 30 seconds */
export const DEFAULT_API_TIMEOUT_MS = 30_000;

/** Default graceful shutdown timeout: 30 seconds */
export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30_000;

/** WebSocket ping timeout before considering client disconnected: 60 seconds */
export const WS_PING_TIMEOUT_MS = 60_000;

/** WebSocket heartbeat interval: 30 seconds */
export const WS_HEARTBEAT_INTERVAL_MS = 30_000;

/** Webhook delivery timeout per attempt: 30 seconds */
export const WEBHOOK_TIMEOUT_MS = 30_000;

/** Maximum webhook retry delay (exponential backoff cap): 30 seconds */
export const WEBHOOK_MAX_RETRY_DELAY_MS = 30_000;

// ── Business Thresholds ─────────────────────────────────

/**
 * Users with no login for this many days are considered inactive.
 * Used by the license dashboard and inactive-user reports.
 */
export const INACTIVE_USER_THRESHOLD_DAYS = 90;

/**
 * License usage percentage that triggers a warning-level alert.
 * @see LICENSE_CRITICAL_THRESHOLD_PERCENT for the critical level.
 */
export const LICENSE_WARNING_THRESHOLD_PERCENT = 80;

/**
 * License usage percentage that triggers a critical-level alert.
 * @see LICENSE_WARNING_THRESHOLD_PERCENT for the warning level.
 */
export const LICENSE_CRITICAL_THRESHOLD_PERCENT = 95;

/** IP block duration for detected security threats: 24 hours (86,400 seconds) */
export const IP_BLOCK_DURATION_S = 86_400;

// ── Pagination Defaults ─────────────────────────────────

/** Default page size for list endpoints when none is specified */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum allowed page size to prevent excessive query load */
export const MAX_PAGE_SIZE = 100;

// ── Date Utilities ──────────────────────────────────────

/**
 * Calculate the number of days between two dates.
 *
 * Returns a positive value when `b` is after `a`, and a negative value
 * when `b` is before `a`. The result can be fractional (e.g. 1.5 days).
 *
 * @param a - Start date
 * @param b - End date
 * @returns Number of days between the two dates (can be fractional or negative)
 *
 * @example
 * ```ts
 * const start = new Date('2026-01-01');
 * const end = new Date('2026-01-31');
 * const duration = daysBetween(start, end); // 30
 * ```
 *
 * @example
 * ```ts
 * // Check how long ago a review was submitted
 * const ageInDays = daysBetween(review.submittedAt, new Date());
 * if (ageInDays > 365) {
 *   console.log('Review is over a year old');
 * }
 * ```
 */
export function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_DAY;
}

/**
 * Get a Date object representing N days ago from the current moment.
 *
 * Commonly used for building date-range filters in Prisma queries,
 * e.g. "find all users who haven't logged in for 90 days".
 *
 * @param n - Number of days ago (must be non-negative)
 * @returns A Date object set to `Date.now() - DAYS(n)`
 *
 * @example
 * ```ts
 * // Find inactive users (no login in 90 days)
 * const cutoff = daysAgo(90);
 * const inactive = await prisma.user.findMany({
 *   where: { lastLoginAt: { lt: cutoff } },
 * });
 * ```
 *
 * @example
 * ```ts
 * // Get goals created in the last 30 days
 * const recent = await prisma.goal.findMany({
 *   where: { createdAt: { gte: daysAgo(30) } },
 * });
 * ```
 */
export function daysAgo(n: number): Date {
  return new Date(Date.now() - DAYS(n));
}
