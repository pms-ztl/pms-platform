/**
 * PMS Platform — API Health Check Script
 *
 * Tests ALL 513 API endpoints across 44 modules.
 * PASS = any HTTP status except 500.  FAIL = 500 (Internal Server Error).
 *
 * Usage:  npx ts-node --transpile-only scripts/api-health-check.ts
 */

// ============================================================================
// TYPES
// ============================================================================

interface EndpointDef {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  module: string;
  auth: 'tenant' | 'admin' | 'none';
  body?: Record<string, unknown>;
}

interface EndpointResult {
  endpoint: EndpointDef;
  status: number;
  responseTime: number;
  passed: boolean;
  error?: string;
}

interface ModuleSummary {
  module: string;
  total: number;
  passed: number;
  failed: number;
  results: EndpointResult[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = process.env.API_URL || 'http://127.0.0.1:3001';
const FAKE_UUID = '00000000-0000-0000-0000-000000000000';
const FAKE_UUID_2 = '00000000-0000-0000-0000-000000000001';
const REQUEST_DELAY_MS = 50;

const TENANT_CREDS = { email: 'admin@demo.com', password: 'demo123' };
const SA_CREDS = { email: 'admin@pms-platform.com', password: 'admin123' };

// Colors
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';

// ============================================================================
// ENDPOINT REGISTRY — ALL 513 ENDPOINTS
// ============================================================================

const ENDPOINTS: EndpointDef[] = [
  // ── Health (no auth) ─────────────────────────────────────
  { method: 'GET', path: '/health', module: 'health-check', auth: 'none' },
  { method: 'GET', path: '/ready', module: 'health-check', auth: 'none' },

  // ── Auth (mounted at /api/v1/auth) ──────────────────────
  { method: 'POST', path: '/api/v1/auth/login', module: 'auth', auth: 'none', body: { email: 'test@test.com', password: 'wrong' } },
  { method: 'POST', path: '/api/v1/auth/mfa/verify', module: 'auth', auth: 'none', body: { token: '000000' } },
  { method: 'POST', path: '/api/v1/auth/refresh', module: 'auth', auth: 'none', body: { refreshToken: 'invalid' } },
  { method: 'POST', path: '/api/v1/auth/password/forgot', module: 'auth', auth: 'none', body: { email: 'test@test.com' } },
  { method: 'POST', path: '/api/v1/auth/password/reset', module: 'auth', auth: 'none', body: { token: 'x', password: 'x' } },
  { method: 'POST', path: '/api/v1/auth/password/set', module: 'auth', auth: 'none', body: { token: 'x', password: 'x' } },
  { method: 'POST', path: '/api/v1/auth/logout', module: 'auth', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/auth/me', module: 'auth', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/auth/password/change', module: 'auth', auth: 'tenant', body: { currentPassword: 'x', newPassword: 'y' } },
  { method: 'POST', path: '/api/v1/auth/mfa/setup', module: 'auth', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/auth/mfa/setup/verify', module: 'auth', auth: 'tenant', body: { token: '000000' } },
  { method: 'POST', path: '/api/v1/auth/mfa/disable', module: 'auth', auth: 'tenant', body: { token: '000000' } },

  // ── Users (mounted at /api/v1/users) ────────────────────
  { method: 'GET', path: '/api/v1/users/roles', module: 'users', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/users/departments', module: 'users', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/users/org-chart', module: 'users', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/users/my-reports', module: 'users', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/users/team-members', module: 'users', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/users/license/usage', module: 'users', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/users/subscription', module: 'users', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/users/breakdown', module: 'users', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/users/ai-access/stats', module: 'users', auth: 'tenant' },
  { method: 'PUT', path: '/api/v1/users/ai-access/bulk', module: 'users', auth: 'tenant', body: {} },
  { method: 'PUT', path: '/api/v1/users/ai-access/delegation', module: 'users', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/users/me', module: 'users', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/users/me/avatar', module: 'users', auth: 'tenant', body: {} },
  { method: 'POST', path: '/api/v1/users/me/ai-avatar', module: 'users', auth: 'tenant', body: {} },
  { method: 'PUT', path: '/api/v1/users/designated-manager', module: 'users', auth: 'tenant', body: {} },
  { method: 'PUT', path: '/api/v1/users/super-admin-access', module: 'users', auth: 'tenant', body: {} },
  { method: 'POST', path: '/api/v1/users/bulk-assign-role', module: 'users', auth: 'tenant', body: {} },
  { method: 'POST', path: '/api/v1/users/bulk-remove-role', module: 'users', auth: 'tenant', body: {} },
  { method: 'POST', path: '/api/v1/users', module: 'users', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/users', module: 'users', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/users/${FAKE_UUID}`, module: 'users', auth: 'tenant' },
  { method: 'PUT', path: `/api/v1/users/${FAKE_UUID}`, module: 'users', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/users/${FAKE_UUID}/deactivate`, module: 'users', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/users/${FAKE_UUID}/reactivate`, module: 'users', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/users/${FAKE_UUID}/archive`, module: 'users', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/users/${FAKE_UUID}/resend-credentials`, module: 'users', auth: 'tenant' },
  { method: 'DELETE', path: `/api/v1/users/${FAKE_UUID}`, module: 'users', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/users/${FAKE_UUID}/reports`, module: 'users', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/users/${FAKE_UUID}/roles`, module: 'users', auth: 'tenant', body: {} },
  { method: 'DELETE', path: `/api/v1/users/${FAKE_UUID}/roles/${FAKE_UUID_2}`, module: 'users', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/users/${FAKE_UUID}/role-history`, module: 'users', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/users/${FAKE_UUID}/avatar`, module: 'users', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/users/${FAKE_UUID}/ai-avatar`, module: 'users', auth: 'tenant', body: {} },
  { method: 'PUT', path: `/api/v1/users/${FAKE_UUID}/ai-access`, module: 'users', auth: 'tenant', body: {} },

  // ── Goals (mounted at /api/v1/goals) ────────────────────
  { method: 'POST', path: '/api/v1/goals', module: 'goals', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/goals', module: 'goals', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/goals/my', module: 'goals', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/goals/tree', module: 'goals', auth: 'tenant' },
  { method: 'PUT', path: '/api/v1/goals/bulk-update', module: 'goals', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/goals/export', module: 'goals', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/goals/check-reminders', module: 'goals', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/goals/team-tree', module: 'goals', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/goals/${FAKE_UUID}/activity`, module: 'goals', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/goals/${FAKE_UUID}`, module: 'goals', auth: 'tenant' },
  { method: 'PUT', path: `/api/v1/goals/${FAKE_UUID}`, module: 'goals', auth: 'tenant', body: {} },
  { method: 'DELETE', path: `/api/v1/goals/${FAKE_UUID}`, module: 'goals', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/goals/${FAKE_UUID}/progress`, module: 'goals', auth: 'tenant', body: {} },
  { method: 'GET', path: `/api/v1/goals/${FAKE_UUID}/progress/history`, module: 'goals', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/goals/${FAKE_UUID}/align`, module: 'goals', auth: 'tenant', body: {} },
  { method: 'DELETE', path: `/api/v1/goals/${FAKE_UUID}/align/${FAKE_UUID_2}`, module: 'goals', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/goals/${FAKE_UUID}/comments`, module: 'goals', auth: 'tenant', body: {} },
  { method: 'GET', path: `/api/v1/goals/${FAKE_UUID}/comments`, module: 'goals', auth: 'tenant' },

  // ── Reviews (mounted at /api/v1/reviews) ────────────────
  { method: 'POST', path: '/api/v1/reviews/cycles', module: 'reviews', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/reviews/cycles', module: 'reviews', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/reviews/cycles/${FAKE_UUID}`, module: 'reviews', auth: 'tenant' },
  { method: 'PUT', path: `/api/v1/reviews/cycles/${FAKE_UUID}`, module: 'reviews', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/reviews/cycles/${FAKE_UUID}/launch`, module: 'reviews', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/reviews/cycles/${FAKE_UUID}/advance`, module: 'reviews', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/reviews/cycles/${FAKE_UUID}/stats`, module: 'reviews', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/reviews/my', module: 'reviews', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/reviews/${FAKE_UUID}`, module: 'reviews', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/reviews/${FAKE_UUID}/start`, module: 'reviews', auth: 'tenant' },
  { method: 'PUT', path: `/api/v1/reviews/${FAKE_UUID}/draft`, module: 'reviews', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/reviews/${FAKE_UUID}/submit`, module: 'reviews', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/reviews/${FAKE_UUID}/acknowledge`, module: 'reviews', auth: 'tenant' },

  // ── Feedback (mounted at /api/v1/feedback) ──────────────
  { method: 'POST', path: '/api/v1/feedback', module: 'feedback', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/feedback/received', module: 'feedback', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/feedback/given', module: 'feedback', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/feedback/team', module: 'feedback', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/feedback/timeline', module: 'feedback', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/feedback/timeline/${FAKE_UUID}`, module: 'feedback', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/feedback/recognition-wall', module: 'feedback', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/feedback/top-recognized', module: 'feedback', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/feedback/request', module: 'feedback', auth: 'tenant', body: {} },
  { method: 'GET', path: `/api/v1/feedback/${FAKE_UUID}`, module: 'feedback', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/feedback/${FAKE_UUID}/acknowledge`, module: 'feedback', auth: 'tenant' },
  { method: 'DELETE', path: `/api/v1/feedback/${FAKE_UUID}`, module: 'feedback', auth: 'tenant' },

  // ── Calibration (mounted at /api/v1/calibration) ────────
  { method: 'GET', path: '/api/v1/calibration', module: 'calibration', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/calibration/sessions', module: 'calibration', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/calibration/sessions', module: 'calibration', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/calibration/sessions/${FAKE_UUID}`, module: 'calibration', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/calibration/sessions/${FAKE_UUID}/start`, module: 'calibration', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/calibration/sessions/${FAKE_UUID}/complete`, module: 'calibration', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/calibration/sessions/${FAKE_UUID}/participants`, module: 'calibration', auth: 'tenant', body: {} },
  { method: 'GET', path: `/api/v1/calibration/sessions/${FAKE_UUID}/reviews`, module: 'calibration', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/calibration/sessions/${FAKE_UUID}/ratings`, module: 'calibration', auth: 'tenant', body: {} },
  { method: 'GET', path: `/api/v1/calibration/sessions/${FAKE_UUID}/ratings`, module: 'calibration', auth: 'tenant' },

  // ── Analytics (mounted at /api/v1/analytics) ────────────
  { method: 'GET', path: '/api/v1/analytics/dashboard', module: 'analytics', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/analytics/performance-distribution', module: 'analytics', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/analytics/goal-trends', module: 'analytics', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/analytics/feedback-trends', module: 'analytics', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/analytics/team-performance', module: 'analytics', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/analytics/bias-metrics', module: 'analytics', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/analytics/compensation', module: 'analytics', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/analytics/bias', module: 'analytics', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/analytics/normalization', module: 'analytics', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/analytics/ratings', module: 'analytics', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/analytics/departments', module: 'analytics', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/analytics/cycle/${FAKE_UUID}/stats`, module: 'analytics', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/analytics/export/performance', module: 'analytics', auth: 'tenant' },

  // ── Notifications (mounted at /api/v1/notifications) ────
  { method: 'GET', path: '/api/v1/notifications', module: 'notifications', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/notifications/unread-count', module: 'notifications', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/notifications/preferences', module: 'notifications', auth: 'tenant' },
  { method: 'PUT', path: '/api/v1/notifications/preferences', module: 'notifications', auth: 'tenant', body: {} },
  { method: 'POST', path: '/api/v1/notifications/read-all', module: 'notifications', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/notifications/${FAKE_UUID}/read`, module: 'notifications', auth: 'tenant' },

  // ── Integrations (mounted at /api/v1/integrations) ──────
  { method: 'POST', path: `/api/v1/integrations/webhook/webhook/${FAKE_UUID}`, module: 'integrations', auth: 'none', body: {} },
  { method: 'GET', path: '/api/v1/integrations/connectors', module: 'integrations', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/integrations', module: 'integrations', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/integrations/${FAKE_UUID}`, module: 'integrations', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/integrations', module: 'integrations', auth: 'tenant', body: {} },
  { method: 'PUT', path: `/api/v1/integrations/${FAKE_UUID}`, module: 'integrations', auth: 'tenant', body: {} },
  { method: 'DELETE', path: `/api/v1/integrations/${FAKE_UUID}`, module: 'integrations', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/integrations/${FAKE_UUID}/test`, module: 'integrations', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/integrations/${FAKE_UUID}/sync`, module: 'integrations', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/integrations/${FAKE_UUID}/sync-history`, module: 'integrations', auth: 'tenant' },

  // ── Compensation (mounted at /api/v1/compensation) ──────
  { method: 'POST', path: '/api/v1/compensation', module: 'compensation', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/compensation', module: 'compensation', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/compensation/budget-summary', module: 'compensation', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/compensation/${FAKE_UUID}`, module: 'compensation', auth: 'tenant' },
  { method: 'PATCH', path: `/api/v1/compensation/${FAKE_UUID}`, module: 'compensation', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/compensation/${FAKE_UUID}/submit`, module: 'compensation', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/compensation/${FAKE_UUID}/approve`, module: 'compensation', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/compensation/${FAKE_UUID}/reject`, module: 'compensation', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/compensation/${FAKE_UUID}/implement`, module: 'compensation', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/compensation/link-evidence', module: 'compensation', auth: 'tenant', body: {} },
  { method: 'DELETE', path: `/api/v1/compensation/${FAKE_UUID}/evidence/${FAKE_UUID_2}`, module: 'compensation', auth: 'tenant' },

  // ── Evidence (mounted at /api/v1/evidence) ──────────────
  { method: 'POST', path: '/api/v1/evidence', module: 'evidence', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/evidence', module: 'evidence', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/evidence/${FAKE_UUID}`, module: 'evidence', auth: 'tenant' },
  { method: 'PATCH', path: `/api/v1/evidence/${FAKE_UUID}`, module: 'evidence', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/evidence/${FAKE_UUID}/verify`, module: 'evidence', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/evidence/link-to-review', module: 'evidence', auth: 'tenant', body: {} },
  { method: 'DELETE', path: `/api/v1/evidence/${FAKE_UUID}/reviews/${FAKE_UUID_2}`, module: 'evidence', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/evidence/${FAKE_UUID}/archive`, module: 'evidence', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/evidence/import', module: 'evidence', auth: 'tenant', body: {} },
  { method: 'GET', path: `/api/v1/evidence/employees/${FAKE_UUID}/summary`, module: 'evidence', auth: 'tenant' },

  // ── Promotions (mounted at /api/v1/promotions) ──────────
  { method: 'POST', path: '/api/v1/promotions', module: 'promotions', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/promotions', module: 'promotions', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/promotions/summary', module: 'promotions', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/promotions/${FAKE_UUID}`, module: 'promotions', auth: 'tenant' },
  { method: 'PATCH', path: `/api/v1/promotions/${FAKE_UUID}`, module: 'promotions', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/promotions/${FAKE_UUID}/start-review`, module: 'promotions', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/promotions/${FAKE_UUID}/approve`, module: 'promotions', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/promotions/${FAKE_UUID}/reject`, module: 'promotions', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/promotions/${FAKE_UUID}/defer`, module: 'promotions', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/promotions/${FAKE_UUID}/implement`, module: 'promotions', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/promotions/link-evidence', module: 'promotions', auth: 'tenant', body: {} },
  { method: 'DELETE', path: `/api/v1/promotions/${FAKE_UUID}/evidence/${FAKE_UUID_2}`, module: 'promotions', auth: 'tenant' },

  // ── Reports (mounted at /api/v1/reports) ────────────────
  { method: 'POST', path: '/api/v1/reports/generate', module: 'reports', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/reports', module: 'reports', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/reports/schedules', module: 'reports', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/reports/schedules/${FAKE_UUID}/stats`, module: 'reports', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/reports/${FAKE_UUID}/download`, module: 'reports', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/reports/${FAKE_UUID}`, module: 'reports', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/reports/schedules', module: 'reports', auth: 'tenant', body: {} },
  { method: 'PATCH', path: `/api/v1/reports/schedules/${FAKE_UUID}`, module: 'reports', auth: 'tenant', body: {} },
  { method: 'DELETE', path: `/api/v1/reports/schedules/${FAKE_UUID}`, module: 'reports', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/reports/schedules/${FAKE_UUID}/pause`, module: 'reports', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/reports/schedules/${FAKE_UUID}/resume`, module: 'reports', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/reports/jobs/${FAKE_UUID}`, module: 'reports', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/reports/cache/stats', module: 'reports', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/reports/cache/invalidate', module: 'reports', auth: 'tenant' },

  // ── Realtime Performance (mounted at /api/v1/realtime-performance) ──
  { method: 'GET', path: '/api/v1/realtime-performance', module: 'realtime-performance', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/realtime-performance/hourly', module: 'realtime-performance', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/realtime-performance/hourly', module: 'realtime-performance', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/realtime-performance/snapshot', module: 'realtime-performance', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/realtime-performance/activity', module: 'realtime-performance', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/realtime-performance/activity', module: 'realtime-performance', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/realtime-performance/activity/summary', module: 'realtime-performance', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/realtime-performance/goals/dashboard', module: 'realtime-performance', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/realtime-performance/deadlines/check', module: 'realtime-performance', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/realtime-performance/deadlines/alerts', module: 'realtime-performance', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/realtime-performance/deadlines/alerts/${FAKE_UUID}/acknowledge`, module: 'realtime-performance', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/realtime-performance/deadlines/alerts/${FAKE_UUID}/snooze`, module: 'realtime-performance', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/realtime-performance/workload', module: 'realtime-performance', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/realtime-performance/workload/team', module: 'realtime-performance', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/realtime-performance/anomalies/detect', module: 'realtime-performance', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/realtime-performance/sentiment', module: 'realtime-performance', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/realtime-performance/sentiment/team', module: 'realtime-performance', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/realtime-performance/milestones', module: 'realtime-performance', auth: 'tenant', body: {} },
  { method: 'PATCH', path: `/api/v1/realtime-performance/milestones/${FAKE_UUID}`, module: 'realtime-performance', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/realtime-performance/milestones', module: 'realtime-performance', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/realtime-performance/milestones/timeline', module: 'realtime-performance', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/realtime-performance/milestones/detect', module: 'realtime-performance', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/realtime-performance/heatmap/individual', module: 'realtime-performance', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/realtime-performance/heatmap/team', module: 'realtime-performance', auth: 'tenant' },

  // ── Performance Math (mounted at /api/v1/performance-math) ──
  { method: 'GET', path: '/api/v1/performance-math/score/me', module: 'performance-math', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/performance-math/cpis/me', module: 'performance-math', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/performance-math/team/me', module: 'performance-math', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/performance-math/score/${FAKE_UUID}`, module: 'performance-math', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/performance-math/goal-risk/${FAKE_UUID}`, module: 'performance-math', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/performance-math/team/${FAKE_UUID}`, module: 'performance-math', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/performance-math/calibrate', module: 'performance-math', auth: 'tenant', body: {} },
  { method: 'GET', path: `/api/v1/performance-math/goal-mapping/${FAKE_UUID}`, module: 'performance-math', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/performance-math/cpis/${FAKE_UUID}`, module: 'performance-math', auth: 'tenant' },

  // ── Calendar (mounted at /api/v1/calendar/events) ───────
  { method: 'POST', path: '/api/v1/calendar/events', module: 'calendar', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/calendar/events', module: 'calendar', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/calendar/events/${FAKE_UUID}`, module: 'calendar', auth: 'tenant' },
  { method: 'PUT', path: `/api/v1/calendar/events/${FAKE_UUID}`, module: 'calendar', auth: 'tenant', body: {} },
  { method: 'DELETE', path: `/api/v1/calendar/events/${FAKE_UUID}`, module: 'calendar', auth: 'tenant' },

  // ── One-on-Ones (mounted at /api/v1/one-on-ones) ───────
  { method: 'POST', path: '/api/v1/one-on-ones', module: 'one-on-ones', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/one-on-ones', module: 'one-on-ones', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/one-on-ones/upcoming', module: 'one-on-ones', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/one-on-ones/${FAKE_UUID}`, module: 'one-on-ones', auth: 'tenant' },
  { method: 'PUT', path: `/api/v1/one-on-ones/${FAKE_UUID}`, module: 'one-on-ones', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/one-on-ones/${FAKE_UUID}/start`, module: 'one-on-ones', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/one-on-ones/${FAKE_UUID}/complete`, module: 'one-on-ones', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/one-on-ones/${FAKE_UUID}/cancel`, module: 'one-on-ones', auth: 'tenant' },

  // ── Development (mounted at /api/v1/development) ────────
  { method: 'POST', path: '/api/v1/development/plans', module: 'development', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/development/plans', module: 'development', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/development/plans/team', module: 'development', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/development/plans/${FAKE_UUID}`, module: 'development', auth: 'tenant' },
  { method: 'PUT', path: `/api/v1/development/plans/${FAKE_UUID}`, module: 'development', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/development/plans/${FAKE_UUID}/approve`, module: 'development', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/development/recommendations', module: 'development', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/development/recommendations/${FAKE_UUID}`, module: 'development', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/development/plans/${FAKE_UUID}/activities`, module: 'development', auth: 'tenant', body: {} },
  { method: 'PUT', path: `/api/v1/development/activities/${FAKE_UUID}`, module: 'development', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/development/plans/${FAKE_UUID}/checkpoints`, module: 'development', auth: 'tenant', body: {} },
  { method: 'PUT', path: `/api/v1/development/checkpoints/${FAKE_UUID}/complete`, module: 'development', auth: 'tenant', body: {} },

  // ── PIP (mounted at /api/v1/pip) ────────────────────────
  { method: 'POST', path: '/api/v1/pip', module: 'pip', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/pip', module: 'pip', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/pip/${FAKE_UUID}`, module: 'pip', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/pip/${FAKE_UUID}/approve`, module: 'pip', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/pip/${FAKE_UUID}/check-ins`, module: 'pip', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/pip/${FAKE_UUID}/milestones`, module: 'pip', auth: 'tenant', body: {} },
  { method: 'PUT', path: `/api/v1/pip/milestones/${FAKE_UUID}`, module: 'pip', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/pip/${FAKE_UUID}/close`, module: 'pip', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/pip/${FAKE_UUID}/acknowledge`, module: 'pip', auth: 'tenant' },

  // ── Succession (mounted at /api/v1/succession) ──────────
  { method: 'POST', path: '/api/v1/succession', module: 'succession', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/succession', module: 'succession', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/succession/nine-box', module: 'succession', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/succession/${FAKE_UUID}`, module: 'succession', auth: 'tenant' },
  { method: 'PUT', path: `/api/v1/succession/${FAKE_UUID}`, module: 'succession', auth: 'tenant', body: {} },
  { method: 'DELETE', path: `/api/v1/succession/${FAKE_UUID}`, module: 'succession', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/succession/${FAKE_UUID}/readiness`, module: 'succession', auth: 'tenant' },

  // ── Admin Config (mounted at /api/v1/admin-config) ──────
  { method: 'GET', path: '/api/v1/admin-config/templates', module: 'admin-config', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/admin-config/templates/${FAKE_UUID}`, module: 'admin-config', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/admin-config/templates', module: 'admin-config', auth: 'tenant', body: {} },
  { method: 'PUT', path: `/api/v1/admin-config/templates/${FAKE_UUID}`, module: 'admin-config', auth: 'tenant', body: {} },
  { method: 'DELETE', path: `/api/v1/admin-config/templates/${FAKE_UUID}`, module: 'admin-config', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/admin-config/frameworks', module: 'admin-config', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/admin-config/frameworks/${FAKE_UUID}`, module: 'admin-config', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/admin-config/frameworks', module: 'admin-config', auth: 'tenant', body: {} },
  { method: 'PUT', path: `/api/v1/admin-config/frameworks/${FAKE_UUID}`, module: 'admin-config', auth: 'tenant', body: {} },
  { method: 'DELETE', path: `/api/v1/admin-config/frameworks/${FAKE_UUID}`, module: 'admin-config', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/admin-config/frameworks/${FAKE_UUID}/competencies`, module: 'admin-config', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/admin-config/frameworks/${FAKE_UUID}/competencies`, module: 'admin-config', auth: 'tenant', body: {} },
  { method: 'PUT', path: `/api/v1/admin-config/competencies/${FAKE_UUID}`, module: 'admin-config', auth: 'tenant', body: {} },
  { method: 'DELETE', path: `/api/v1/admin-config/competencies/${FAKE_UUID}`, module: 'admin-config', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/admin-config/questionnaires', module: 'admin-config', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/admin-config/questionnaires', module: 'admin-config', auth: 'tenant', body: {} },
  { method: 'PUT', path: `/api/v1/admin-config/questionnaires/${FAKE_UUID}`, module: 'admin-config', auth: 'tenant', body: {} },
  { method: 'DELETE', path: `/api/v1/admin-config/questionnaires/${FAKE_UUID}`, module: 'admin-config', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/admin-config/rating-scales', module: 'admin-config', auth: 'tenant' },

  // ── Audit (mounted at /api/v1/audit) ────────────────────
  { method: 'GET', path: '/api/v1/audit', module: 'audit', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/audit/stats', module: 'audit', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/audit/entity/USER/${FAKE_UUID}`, module: 'audit', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/audit/user/${FAKE_UUID}`, module: 'audit', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/audit/${FAKE_UUID}`, module: 'audit', auth: 'tenant' },
  { method: 'DELETE', path: '/api/v1/audit/purge', module: 'audit', auth: 'tenant' },

  // ── Skills (mounted at /api/v1/skills) ──────────────────
  { method: 'GET', path: '/api/v1/skills/categories', module: 'skills', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/skills/categories', module: 'skills', auth: 'tenant', body: {} },
  { method: 'PUT', path: `/api/v1/skills/categories/${FAKE_UUID}`, module: 'skills', auth: 'tenant', body: {} },
  { method: 'DELETE', path: `/api/v1/skills/categories/${FAKE_UUID}`, module: 'skills', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/skills/assessments', module: 'skills', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/skills/assessments', module: 'skills', auth: 'tenant', body: {} },
  { method: 'POST', path: '/api/v1/skills/assessments/request', module: 'skills', auth: 'tenant', body: {} },
  { method: 'PUT', path: `/api/v1/skills/assessments/${FAKE_UUID}`, module: 'skills', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/skills/assessments/${FAKE_UUID}/progress`, module: 'skills', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/skills/matrix/me', module: 'skills', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/skills/matrix/user/${FAKE_UUID}`, module: 'skills', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/skills/matrix/team', module: 'skills', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/skills/gaps', module: 'skills', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/skills/heatmap', module: 'skills', auth: 'tenant' },

  // ── Compliance (mounted at /api/v1/compliance) ──────────
  { method: 'GET', path: '/api/v1/compliance/dashboard', module: 'compliance', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/compliance/policies', module: 'compliance', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/compliance/policies', module: 'compliance', auth: 'tenant', body: {} },
  { method: 'PUT', path: `/api/v1/compliance/policies/${FAKE_UUID}`, module: 'compliance', auth: 'tenant', body: {} },
  { method: 'DELETE', path: `/api/v1/compliance/policies/${FAKE_UUID}`, module: 'compliance', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/compliance/assessments', module: 'compliance', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/compliance/assessments', module: 'compliance', auth: 'tenant', body: {} },
  { method: 'PUT', path: `/api/v1/compliance/assessments/${FAKE_UUID}`, module: 'compliance', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/compliance/violations', module: 'compliance', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/compliance/violations', module: 'compliance', auth: 'tenant', body: {} },
  { method: 'PUT', path: `/api/v1/compliance/violations/${FAKE_UUID}`, module: 'compliance', auth: 'tenant', body: {} },
  { method: 'GET', path: `/api/v1/compliance/user/${FAKE_UUID}`, module: 'compliance', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/compliance/reviews', module: 'compliance', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/compliance/reviews', module: 'compliance', auth: 'tenant', body: {} },
  { method: 'PUT', path: `/api/v1/compliance/reviews/${FAKE_UUID}`, module: 'compliance', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/compliance/reviews/${FAKE_UUID}/complete`, module: 'compliance', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/compliance/deadlines', module: 'compliance', auth: 'tenant' },

  // ── Announcements (mounted at /api/v1/announcements) ────
  { method: 'GET', path: '/api/v1/announcements/active', module: 'announcements', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/announcements', module: 'announcements', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/announcements/stats', module: 'announcements', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/announcements', module: 'announcements', auth: 'tenant', body: {} },
  { method: 'GET', path: `/api/v1/announcements/${FAKE_UUID}`, module: 'announcements', auth: 'tenant' },
  { method: 'PUT', path: `/api/v1/announcements/${FAKE_UUID}`, module: 'announcements', auth: 'tenant', body: {} },
  { method: 'DELETE', path: `/api/v1/announcements/${FAKE_UUID}`, module: 'announcements', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/announcements/${FAKE_UUID}/pin`, module: 'announcements', auth: 'tenant' },

  // ── Leaderboard (mounted at /api/v1/leaderboard) ────────
  { method: 'GET', path: '/api/v1/leaderboard', module: 'leaderboard', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/leaderboard/performance', module: 'leaderboard', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/leaderboard/goals', module: 'leaderboard', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/leaderboard/recognition', module: 'leaderboard', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/leaderboard/learning', module: 'leaderboard', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/leaderboard/departments', module: 'leaderboard', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/leaderboard/my-stats', module: 'leaderboard', auth: 'tenant' },

  // ── Career (mounted at /api/v1/career) ──────────────────
  { method: 'GET', path: '/api/v1/career/path/me', module: 'career', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/career/goals/me', module: 'career', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/career/path/${FAKE_UUID}`, module: 'career', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/career/growth-requirements/${FAKE_UUID}`, module: 'career', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/career/roles', module: 'career', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/career/goals/${FAKE_UUID}`, module: 'career', auth: 'tenant' },

  // ── Excel Upload (mounted at /api/v1/excel-upload) ──────
  { method: 'GET', path: '/api/v1/excel-upload/template', module: 'excel-upload', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/excel-upload/analyze', module: 'excel-upload', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/excel-upload/${FAKE_UUID}/confirm`, module: 'excel-upload', auth: 'tenant', body: {} },
  { method: 'GET', path: `/api/v1/excel-upload/${FAKE_UUID}/progress`, module: 'excel-upload', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/excel-upload/upload', module: 'excel-upload', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/excel-upload/history', module: 'excel-upload', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/excel-upload/${FAKE_UUID}/errors`, module: 'excel-upload', auth: 'tenant' },

  // ── AI (mounted at /api/v1/ai) ──────────────────────────
  { method: 'POST', path: '/api/v1/ai/chat', module: 'ai', auth: 'tenant', body: { message: 'test' } },
  { method: 'GET', path: '/api/v1/ai/conversations', module: 'ai', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/ai/conversations/${FAKE_UUID}`, module: 'ai', auth: 'tenant' },
  { method: 'DELETE', path: `/api/v1/ai/conversations/${FAKE_UUID}`, module: 'ai', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/ai/excel/analyze', module: 'ai', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/ai/insights/summary', module: 'ai', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/ai/insights', module: 'ai', auth: 'tenant' },
  { method: 'PUT', path: `/api/v1/ai/insights/${FAKE_UUID}/read`, module: 'ai', auth: 'tenant', body: {} },
  { method: 'PUT', path: `/api/v1/ai/insights/${FAKE_UUID}/dismiss`, module: 'ai', auth: 'tenant', body: {} },
  { method: 'POST', path: '/api/v1/ai/reports/generate', module: 'ai', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/ai/usage', module: 'ai', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/ai/tasks', module: 'ai', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/ai/tasks/${FAKE_UUID}`, module: 'ai', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/ai/tasks/${FAKE_UUID}/cancel`, module: 'ai', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/ai/actions/pending', module: 'ai', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/ai/actions/${FAKE_UUID}/approve`, module: 'ai', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/ai/actions/${FAKE_UUID}/reject`, module: 'ai', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/ai/chat/coordinate', module: 'ai', auth: 'tenant', body: { message: 'test' } },
  { method: 'GET', path: '/api/v1/ai/agents/active', module: 'ai', auth: 'tenant' },

  // ── Roles (mounted at /api/v1/roles) ────────────────────
  { method: 'GET', path: '/api/v1/roles', module: 'roles', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/roles/permissions-catalog', module: 'roles', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/roles/compare', module: 'roles', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/roles/${FAKE_UUID}`, module: 'roles', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/roles', module: 'roles', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/roles/${FAKE_UUID}/clone`, module: 'roles', auth: 'tenant' },
  { method: 'PUT', path: `/api/v1/roles/${FAKE_UUID}`, module: 'roles', auth: 'tenant', body: {} },
  { method: 'DELETE', path: `/api/v1/roles/${FAKE_UUID}`, module: 'roles', auth: 'tenant' },

  // ── Upgrade Requests (mounted at /api/v1/upgrade-requests)
  { method: 'GET', path: '/api/v1/upgrade-requests', module: 'upgrade-requests', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/upgrade-requests', module: 'upgrade-requests', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/upgrade-requests/${FAKE_UUID}/cancel`, module: 'upgrade-requests', auth: 'tenant' },

  // ── Chat (mounted at /api/v1/chat) ──────────────────────
  { method: 'GET', path: '/api/v1/chat/conversations', module: 'chat', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/chat/conversations/direct', module: 'chat', auth: 'tenant', body: {} },
  { method: 'POST', path: '/api/v1/chat/conversations/group', module: 'chat', auth: 'tenant', body: {} },
  { method: 'POST', path: '/api/v1/chat/conversations/team-channel', module: 'chat', auth: 'tenant', body: {} },
  { method: 'GET', path: `/api/v1/chat/conversations/${FAKE_UUID}`, module: 'chat', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/chat/conversations/${FAKE_UUID}/participants`, module: 'chat', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/chat/conversations/${FAKE_UUID}/leave`, module: 'chat', auth: 'tenant' },
  { method: 'PUT', path: `/api/v1/chat/conversations/${FAKE_UUID}/name`, module: 'chat', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/chat/conversations/${FAKE_UUID}/mute`, module: 'chat', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/chat/conversations/${FAKE_UUID}/pinned`, module: 'chat', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/chat/messages/search', module: 'chat', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/chat/messages/unread-counts', module: 'chat', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/chat/conversations/${FAKE_UUID}/messages`, module: 'chat', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/chat/conversations/${FAKE_UUID}/messages`, module: 'chat', auth: 'tenant', body: {} },
  { method: 'PUT', path: `/api/v1/chat/conversations/${FAKE_UUID}/messages/${FAKE_UUID_2}`, module: 'chat', auth: 'tenant', body: {} },
  { method: 'DELETE', path: `/api/v1/chat/conversations/${FAKE_UUID}/messages/${FAKE_UUID_2}`, module: 'chat', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/chat/conversations/${FAKE_UUID}/messages/${FAKE_UUID_2}/reactions`, module: 'chat', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/chat/conversations/${FAKE_UUID}/messages/${FAKE_UUID_2}/pin`, module: 'chat', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/chat/conversations/${FAKE_UUID}/messages/${FAKE_UUID_2}/forward`, module: 'chat', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/chat/conversations/${FAKE_UUID}/read`, module: 'chat', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/chat/email/send', module: 'chat', auth: 'tenant', body: {} },
  { method: 'POST', path: '/api/v1/chat/email/ai-draft', module: 'chat', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/chat/users/search', module: 'chat', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/chat/teams', module: 'chat', auth: 'tenant' },

  // ── Health Metrics (mounted at /api/v1/health-metrics) ──
  { method: 'GET', path: '/api/v1/health-metrics', module: 'health-metrics', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/health-metrics/history', module: 'health-metrics', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/health-metrics/departments', module: 'health-metrics', auth: 'tenant' },

  // ── Engagement (mounted at /api/v1/engagement) ──────────
  { method: 'GET', path: '/api/v1/engagement/overview', module: 'engagement', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/engagement/dashboard', module: 'engagement', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/engagement/trends', module: 'engagement', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/engagement/departments', module: 'engagement', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/engagement/at-risk', module: 'engagement', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/engagement/events', module: 'engagement', auth: 'tenant' },

  // ── Pulse (mounted at /api/v1/pulse) ────────────────────
  { method: 'POST', path: '/api/v1/pulse/submit', module: 'pulse', auth: 'tenant', body: { mood: 3, energy: 3 } },
  { method: 'GET', path: '/api/v1/pulse/can-submit', module: 'pulse', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/pulse/my-history', module: 'pulse', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/pulse/analytics/overview', module: 'pulse', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/pulse/analytics/trends', module: 'pulse', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/pulse/analytics/departments', module: 'pulse', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/pulse/analytics/distribution', module: 'pulse', auth: 'tenant' },

  // ── Delegations (mounted at /api/v1/delegations) ────────
  { method: 'GET', path: '/api/v1/delegations', module: 'delegations', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/delegations/${FAKE_UUID}`, module: 'delegations', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/delegations', module: 'delegations', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/delegations/${FAKE_UUID}/approve`, module: 'delegations', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/delegations/${FAKE_UUID}/reject`, module: 'delegations', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/delegations/${FAKE_UUID}/revoke`, module: 'delegations', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/delegations/${FAKE_UUID}/audit`, module: 'delegations', auth: 'tenant' },

  // ── Policies (mounted at /api/v1/policies) ──────────────
  { method: 'GET', path: '/api/v1/policies', module: 'policies', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/policies/simulate', module: 'policies', auth: 'tenant', body: {} },
  { method: 'POST', path: '/api/v1/policies', module: 'policies', auth: 'tenant', body: {} },
  { method: 'GET', path: `/api/v1/policies/${FAKE_UUID}`, module: 'policies', auth: 'tenant' },
  { method: 'PUT', path: `/api/v1/policies/${FAKE_UUID}`, module: 'policies', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/policies/${FAKE_UUID}/activate`, module: 'policies', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/policies/${FAKE_UUID}/deactivate`, module: 'policies', auth: 'tenant' },
  { method: 'DELETE', path: `/api/v1/policies/${FAKE_UUID}`, module: 'policies', auth: 'tenant' },

  // ── Mentoring (mounted at /api/v1/mentoring) ────────────
  { method: 'GET', path: '/api/v1/mentoring/matches', module: 'mentoring', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/mentoring/my-mentorships', module: 'mentoring', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/mentoring/learning-path', module: 'mentoring', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/mentoring/sessions', module: 'mentoring', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/mentoring/request', module: 'mentoring', auth: 'tenant', body: {} },

  // ── Actionable Insights (mounted at /api/v1/actionable-insights) ──
  { method: 'POST', path: '/api/v1/actionable-insights/promotion/recommend', module: 'actionable-insights', auth: 'tenant', body: {} },
  { method: 'GET', path: `/api/v1/actionable-insights/promotion/user/${FAKE_UUID}`, module: 'actionable-insights', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/actionable-insights/promotion/${FAKE_UUID}/approve`, module: 'actionable-insights', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/actionable-insights/promotion/${FAKE_UUID}/reject`, module: 'actionable-insights', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/actionable-insights/succession/create', module: 'actionable-insights', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/actionable-insights/succession/plans', module: 'actionable-insights', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/actionable-insights/development/generate', module: 'actionable-insights', auth: 'tenant', body: {} },
  { method: 'GET', path: `/api/v1/actionable-insights/development/user/${FAKE_UUID}`, module: 'actionable-insights', auth: 'tenant' },
  { method: 'PUT', path: `/api/v1/actionable-insights/development/${FAKE_UUID}/progress`, module: 'actionable-insights', auth: 'tenant', body: {} },
  { method: 'POST', path: `/api/v1/actionable-insights/development/${FAKE_UUID}/complete`, module: 'actionable-insights', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/actionable-insights/team/optimize', module: 'actionable-insights', auth: 'tenant', body: {} },
  { method: 'GET', path: `/api/v1/actionable-insights/team/${FAKE_UUID}/analyze`, module: 'actionable-insights', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/actionable-insights/health/calculate', module: 'actionable-insights', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/actionable-insights/health/culture-diagnostic', module: 'actionable-insights', auth: 'tenant', body: {} },

  // ── AI Insights (mounted at /api/v1/ai-insights) ────────
  { method: 'POST', path: '/api/v1/ai-insights/sentiment/analyze', module: 'ai-insights', auth: 'tenant', body: { text: 'test review' } },
  { method: 'GET', path: '/api/v1/ai-insights/sentiment/trend', module: 'ai-insights', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/ai-insights/sentiment/history', module: 'ai-insights', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/ai-insights/anomaly/detect', module: 'ai-insights', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/ai-insights/anomaly/active', module: 'ai-insights', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/ai-insights/anomaly/statistics', module: 'ai-insights', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/ai-insights/anomaly/${FAKE_UUID}/acknowledge`, module: 'ai-insights', auth: 'tenant' },
  { method: 'POST', path: `/api/v1/ai-insights/anomaly/${FAKE_UUID}/resolve`, module: 'ai-insights', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/ai-insights/benchmark/create', module: 'ai-insights', auth: 'tenant', body: {} },
  { method: 'POST', path: '/api/v1/ai-insights/benchmark/compare', module: 'ai-insights', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/ai-insights/benchmark/comparisons', module: 'ai-insights', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/ai-insights/benchmark/team-summary', module: 'ai-insights', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/ai-insights/productivity/predict', module: 'ai-insights', auth: 'tenant', body: {} },
  { method: 'GET', path: '/api/v1/ai-insights/productivity/predictions', module: 'ai-insights', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/ai-insights/engagement/history', module: 'ai-insights', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/ai-insights/engagement/at-risk', module: 'ai-insights', auth: 'tenant' },

  // ── Checkins (mounted at /api/v1/checkins) ──────────────
  { method: 'GET', path: '/api/v1/checkins/my', module: 'checkins', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/checkins/templates', module: 'checkins', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/checkins/upcoming', module: 'checkins', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/checkins/history', module: 'checkins', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/checkins', module: 'checkins', auth: 'tenant' },
  { method: 'POST', path: '/api/v1/checkins', module: 'checkins', auth: 'tenant', body: {} },

  // ── Teams (mounted at /api/v1/teams) ────────────────────
  { method: 'GET', path: '/api/v1/teams/my', module: 'teams', auth: 'tenant' },
  { method: 'GET', path: '/api/v1/teams', module: 'teams', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/teams/${FAKE_UUID}`, module: 'teams', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/teams/${FAKE_UUID}/members`, module: 'teams', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/teams/${FAKE_UUID}/goals`, module: 'teams', auth: 'tenant' },
  { method: 'GET', path: `/api/v1/teams/${FAKE_UUID}/analytics`, module: 'teams', auth: 'tenant' },

  // ── Simulator (mounted at /api/v1/simulator) ────────────
  { method: 'POST', path: '/api/v1/simulator/run', module: 'simulator', auth: 'tenant', body: { scenario: 'test' } },

  // ── Super Admin (mounted at /api/admin) ─────────────────
  { method: 'POST', path: '/api/admin/auth/login', module: 'super-admin', auth: 'none', body: { email: 'test@test.com', password: 'wrong' } },
  { method: 'POST', path: '/api/admin/auth/refresh', module: 'super-admin', auth: 'none', body: { refreshToken: 'invalid' } },
  { method: 'POST', path: '/api/admin/auth/mfa/verify', module: 'super-admin', auth: 'none', body: { token: '000000' } },
  { method: 'POST', path: '/api/admin/auth/logout', module: 'super-admin', auth: 'admin' },
  { method: 'GET', path: '/api/admin/tenants', module: 'super-admin', auth: 'admin' },
  { method: 'GET', path: `/api/admin/tenants/${FAKE_UUID}`, module: 'super-admin', auth: 'admin' },
  { method: 'POST', path: '/api/admin/tenants', module: 'super-admin', auth: 'admin', body: {} },
  { method: 'PUT', path: `/api/admin/tenants/${FAKE_UUID}`, module: 'super-admin', auth: 'admin', body: {} },
  { method: 'DELETE', path: `/api/admin/tenants/${FAKE_UUID}`, module: 'super-admin', auth: 'admin' },
  { method: 'POST', path: `/api/admin/tenants/${FAKE_UUID}/suspend`, module: 'super-admin', auth: 'admin' },
  { method: 'POST', path: `/api/admin/tenants/${FAKE_UUID}/activate`, module: 'super-admin', auth: 'admin' },
  { method: 'GET', path: `/api/admin/tenants/${FAKE_UUID}/metrics`, module: 'super-admin', auth: 'admin' },
  { method: 'PUT', path: `/api/admin/tenants/${FAKE_UUID}/settings`, module: 'super-admin', auth: 'admin', body: {} },
  { method: 'POST', path: `/api/admin/tenants/${FAKE_UUID}/export`, module: 'super-admin', auth: 'admin' },
  { method: 'GET', path: `/api/admin/tenants/${FAKE_UUID}/designated-manager`, module: 'super-admin', auth: 'admin' },
  { method: 'POST', path: `/api/admin/tenants/${FAKE_UUID}/designated-manager`, module: 'super-admin', auth: 'admin', body: {} },
  { method: 'GET', path: '/api/admin/users', module: 'super-admin', auth: 'admin' },
  { method: 'POST', path: '/api/admin/users', module: 'super-admin', auth: 'admin', body: {} },
  { method: 'GET', path: `/api/admin/users/${FAKE_UUID}`, module: 'super-admin', auth: 'admin' },
  { method: 'POST', path: `/api/admin/users/${FAKE_UUID}/suspend`, module: 'super-admin', auth: 'admin' },
  { method: 'POST', path: `/api/admin/users/${FAKE_UUID}/activate`, module: 'super-admin', auth: 'admin' },
  { method: 'POST', path: `/api/admin/users/${FAKE_UUID}/reset-password`, module: 'super-admin', auth: 'admin' },
  { method: 'POST', path: `/api/admin/users/${FAKE_UUID}/disable-mfa`, module: 'super-admin', auth: 'admin' },
  { method: 'GET', path: '/api/admin/system/dashboard', module: 'super-admin', auth: 'admin' },
  { method: 'GET', path: '/api/admin/system/metrics', module: 'super-admin', auth: 'admin' },
  { method: 'GET', path: '/api/admin/system/config', module: 'super-admin', auth: 'admin' },
  { method: 'PUT', path: '/api/admin/system/config', module: 'super-admin', auth: 'admin', body: {} },
  { method: 'GET', path: '/api/admin/system/health', module: 'super-admin', auth: 'admin' },
  { method: 'POST', path: '/api/admin/system/cache/clear', module: 'super-admin', auth: 'admin' },
  { method: 'GET', path: '/api/admin/audit', module: 'super-admin', auth: 'admin' },
  { method: 'POST', path: '/api/admin/audit/export', module: 'super-admin', auth: 'admin', body: {} },
  { method: 'GET', path: '/api/admin/billing', module: 'super-admin', auth: 'admin' },
  { method: 'GET', path: '/api/admin/billing/revenue', module: 'super-admin', auth: 'admin' },
  { method: 'PUT', path: `/api/admin/billing/tenants/${FAKE_UUID}/plan`, module: 'super-admin', auth: 'admin', body: {} },
  { method: 'POST', path: `/api/admin/billing/tenants/${FAKE_UUID}/invoices`, module: 'super-admin', auth: 'admin', body: {} },
  { method: 'GET', path: '/api/admin/security/threats', module: 'super-admin', auth: 'admin' },
  { method: 'POST', path: '/api/admin/security/ip/block', module: 'super-admin', auth: 'admin', body: {} },
  { method: 'POST', path: '/api/admin/security/ip/unblock', module: 'super-admin', auth: 'admin', body: {} },
  { method: 'GET', path: '/api/admin/security/ip/blocked', module: 'super-admin', auth: 'admin' },
  { method: 'GET', path: '/api/admin/security/sessions', module: 'super-admin', auth: 'admin' },
  { method: 'DELETE', path: `/api/admin/security/sessions/${FAKE_UUID}`, module: 'super-admin', auth: 'admin' },
  { method: 'DELETE', path: `/api/admin/security/sessions/user/${FAKE_UUID}`, module: 'super-admin', auth: 'admin' },
  { method: 'GET', path: '/api/admin/upgrade-requests', module: 'super-admin', auth: 'admin' },
  { method: 'GET', path: '/api/admin/upgrade-requests/pending-count', module: 'super-admin', auth: 'admin' },
  { method: 'POST', path: `/api/admin/upgrade-requests/${FAKE_UUID}/approve`, module: 'super-admin', auth: 'admin', body: {} },
  { method: 'POST', path: `/api/admin/upgrade-requests/${FAKE_UUID}/reject`, module: 'super-admin', auth: 'admin', body: {} },
];

// ============================================================================
// UTILITIES
// ============================================================================

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function login(email: string, password: string, url: string): Promise<string | null> {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      // If rate limited, wait and retry
      if (res.status === 429 && attempt < maxRetries) {
        const waitSec = 15 * attempt;
        process.stdout.write(`\n    ${YELLOW}Rate limited. Waiting ${waitSec}s (retry ${attempt}/${maxRetries})...${RESET} `);
        await delay(waitSec * 1000);
        continue;
      }

      const json = await res.json();
      // Support both token field names
      return json?.data?.accessToken || json?.data?.token || null;
    } catch {
      if (attempt < maxRetries) {
        await delay(2000);
        continue;
      }
      return null;
    }
  }
  return null;
}

async function makeRequest(ep: EndpointDef, tokens: { tenant: string | null; admin: string | null }): Promise<EndpointResult> {
  const url = `${BASE_URL}${ep.path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (ep.auth === 'tenant' && tokens.tenant) {
    headers['Authorization'] = `Bearer ${tokens.tenant}`;
  } else if (ep.auth === 'admin' && tokens.admin) {
    headers['Authorization'] = `Bearer ${tokens.admin}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const start = Date.now();

  try {
    const opts: RequestInit = {
      method: ep.method,
      headers,
      signal: controller.signal,
    };
    if (ep.body && ['POST', 'PUT', 'PATCH'].includes(ep.method)) {
      opts.body = JSON.stringify(ep.body);
    }

    const res = await fetch(url, opts);
    clearTimeout(timeout);
    const responseTime = Date.now() - start;
    const status = res.status;

    // Drain body to avoid resource leak
    try { await res.text(); } catch {}

    return {
      endpoint: ep,
      status,
      responseTime,
      passed: status !== 500,
    };
  } catch (err: any) {
    clearTimeout(timeout);
    return {
      endpoint: ep,
      status: -1,
      responseTime: Date.now() - start,
      passed: false,
      error: err?.message || 'Network error',
    };
  }
}

// ============================================================================
// OUTPUT FORMATTING
// ============================================================================

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return GREEN;
  if (status >= 300 && status < 500) return YELLOW;
  return RED;
}

function printBanner() {
  console.log(`
${BOLD}================================================================${RESET}
${BOLD}  PMS PLATFORM — API HEALTH CHECK${RESET}
${BOLD}================================================================${RESET}
  ${DIM}URL:${RESET}  ${BASE_URL}
  ${DIM}Date:${RESET} ${new Date().toISOString()}
  ${DIM}Endpoints:${RESET} ${ENDPOINTS.length}
${BOLD}================================================================${RESET}
`);
}

function printResult(r: EndpointResult) {
  const icon = r.passed ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  const color = statusColor(r.status);
  const status = r.status === -1 ? 'ERR' : String(r.status);
  const method = r.endpoint.method.padEnd(6);
  const path = r.endpoint.path;
  const time = `${r.responseTime}ms`.padStart(6);
  const err = r.error ? ` ${RED}${r.error}${RESET}` : '';
  console.log(`  ${icon}  ${color}${status}${RESET}  ${DIM}${method}${RESET} ${path}  ${DIM}${time}${RESET}${err}`);
}

function printModuleSummary(mod: ModuleSummary) {
  const color = mod.failed > 0 ? RED : GREEN;
  const icon = mod.failed > 0 ? '✗' : '✓';
  console.log(`  ${color}${icon} ${mod.module}: ${mod.passed}/${mod.total} passed${RESET}${mod.failed > 0 ? ` ${RED}(${mod.failed} FAILED)${RESET}` : ''}\n`);
}

function printFinalSummary(modules: ModuleSummary[]) {
  const total = modules.reduce((s, m) => s + m.total, 0);
  const passed = modules.reduce((s, m) => s + m.passed, 0);
  const failed = modules.reduce((s, m) => s + m.failed, 0);
  const pct = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';

  console.log(`\n${BOLD}================================================================${RESET}`);
  console.log(`${BOLD}                    FINAL SUMMARY${RESET}`);
  console.log(`${BOLD}================================================================${RESET}`);
  console.log(`  Total:  ${BOLD}${total}${RESET}   Passed: ${GREEN}${BOLD}${passed}${RESET} (${pct}%)   Failed: ${failed > 0 ? RED + BOLD + failed + RESET : '0'}`);
  console.log(`${BOLD}────────────────────────────────────────────────────────────────${RESET}`);

  // Two-column module listing
  const lines: string[] = [];
  for (const m of modules) {
    const color = m.failed > 0 ? RED : GREEN;
    const icon = m.failed > 0 ? '✗' : '✓';
    lines.push(`  ${color}${icon}${RESET} ${m.module.padEnd(25)} ${m.passed}/${m.total}`);
  }

  for (let i = 0; i < lines.length; i += 2) {
    const left = lines[i] || '';
    const right = lines[i + 1] || '';
    console.log(`${left}${right ? '    ' + right : ''}`);
  }

  console.log(`${BOLD}================================================================${RESET}`);
  if (failed > 0) {
    const actual500 = modules.reduce((s, m) => s + m.results.filter((r) => r.status === 500).length, 0);
    const skipped = modules.reduce((s, m) => s + m.results.filter((r) => r.status === -1).length, 0);
    console.log(`\n${RED}${BOLD}  RESULT: FAIL — ${failed} endpoint(s) failed${RESET}`);
    if (actual500 > 0) console.log(`  ${RED}  500 errors: ${actual500}${RESET}`);
    if (skipped > 0) console.log(`  ${YELLOW}  Skipped (no token / network error): ${skipped}${RESET}`);
    console.log('');
    console.log(`${BOLD}  Failed endpoints:${RESET}`);
    for (const m of modules) {
      for (const r of m.results) {
        if (!r.passed) {
          const detail = r.status === -1 ? `ERROR: ${r.error}` : `HTTP ${r.status}`;
          console.log(`  ${RED}✗${RESET} ${r.endpoint.method} ${r.endpoint.path} → ${detail}`);
        }
      }
    }
    console.log('');
  } else {
    console.log(`\n${GREEN}${BOLD}  RESULT: ALL PASS — Every endpoint is healthy!${RESET}\n`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  printBanner();

  // ── Login ──────────────────────────────────────────────
  process.stdout.write(`${CYAN}[AUTH]${RESET} Logging in as Tenant Admin (${TENANT_CREDS.email})... `);
  const tenantToken = await login(TENANT_CREDS.email, TENANT_CREDS.password, `${BASE_URL}/api/v1/auth/login`);
  if (tenantToken) {
    console.log(`${GREEN}OK${RESET} ${DIM}(token: ${tenantToken.substring(0, 20)}...)${RESET}`);
  } else {
    console.log(`${RED}FAILED${RESET}`);
  }

  // Brief pause between logins to avoid auth rate limiter
  await delay(2000);

  process.stdout.write(`${CYAN}[AUTH]${RESET} Logging in as Super Admin (${SA_CREDS.email})... `);
  const adminToken = await login(SA_CREDS.email, SA_CREDS.password, `${BASE_URL}/api/admin/auth/login`);
  if (adminToken) {
    console.log(`${GREEN}OK${RESET} ${DIM}(token: ${adminToken.substring(0, 20)}...)${RESET}`);
  } else {
    console.log(`${RED}FAILED${RESET}`);
  }

  console.log('');
  const tokens = { tenant: tenantToken, admin: adminToken };

  // ── Group by module ────────────────────────────────────
  const moduleOrder: string[] = [];
  const moduleMap = new Map<string, EndpointDef[]>();
  for (const ep of ENDPOINTS) {
    if (!moduleMap.has(ep.module)) {
      moduleOrder.push(ep.module);
      moduleMap.set(ep.module, []);
    }
    moduleMap.get(ep.module)!.push(ep);
  }

  // ── Test each module ───────────────────────────────────
  const allModules: ModuleSummary[] = [];

  for (const mod of moduleOrder) {
    const endpoints = moduleMap.get(mod)!;
    console.log(`${BOLD}── ${mod} (${endpoints.length} endpoints) ${'─'.repeat(Math.max(0, 50 - mod.length))}${RESET}`);

    const results: EndpointResult[] = [];
    for (const ep of endpoints) {
      // Skip if we don't have the required token
      if (ep.auth === 'tenant' && !tenantToken) {
        results.push({ endpoint: ep, status: -1, responseTime: 0, passed: false, error: 'No tenant token' });
        printResult(results[results.length - 1]);
        continue;
      }
      if (ep.auth === 'admin' && !adminToken) {
        results.push({ endpoint: ep, status: -1, responseTime: 0, passed: false, error: 'No admin token' });
        printResult(results[results.length - 1]);
        continue;
      }

      const result = await makeRequest(ep, tokens);
      results.push(result);
      printResult(result);
      await delay(REQUEST_DELAY_MS);
    }

    const summary: ModuleSummary = {
      module: mod,
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      results,
    };
    allModules.push(summary);
    printModuleSummary(summary);
  }

  // ── Final Summary ──────────────────────────────────────
  printFinalSummary(allModules);

  // Exit code
  const totalFailed = allModules.reduce((s, m) => s + m.failed, 0);
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`${RED}Fatal error: ${err.message}${RESET}`);
  process.exit(1);
});
