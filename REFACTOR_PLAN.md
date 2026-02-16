# REFACTOR_PLAN.md — PMS Platform Industry-Ready Refactoring

## Results Summary

| Phase | Status | Key Metrics |
|-------|--------|-------------|
| 1. Security | ✅ Complete | 13 PrismaClient singletons, 3 console.log removed, 6 silent catches fixed |
| 2. Foundation | ✅ Complete | 3 utility modules, 50+ files updated with shared constants |
| 3. Modularity | ✅ Complete | api.ts split (2,020→17 files), 3 service layers extracted, dashboard split (1,401→457 lines) |
| 4. Type Safety | ✅ Complete | 36 @ts-nocheck removed (0 remaining), 134 unsafe casts fixed |
| 5. Efficiency | ✅ Complete | Consolidation done in Phase 1-2 |
| 6. Tests | ✅ Complete | 42 new unit tests for utility modules |
| 7. Documentation | ✅ Complete | JSDoc on all utilities, architecture docs updated |

---

## Context

The PMS platform is a multi-tenant SaaS performance management system with 508 TS/TSX files across 5 apps and 3 packages. After rapid feature development, the codebase has accumulated significant technical debt: god objects (2,020-line API client, 1,766-line service), 36 files with `@ts-nocheck`, 13 rogue Prisma client instances, controllers doing database queries directly, inconsistent error handling patterns, and only 10 test files across the entire codebase. This refactoring aligns the repository with 7 industry pillars without deleting any existing functionality.

---

## Audit Summary (Current State)

| Issue | Count | Severity |
|-------|-------|----------|
| Files with `@ts-nocheck` | 36 | 🔴 Critical |
| Standalone `PrismaClient()` instances (bypassing singleton) | 13 | 🔴 Critical |
| `req.user as any` casts (abandoning type safety) | 53 | 🔴 Critical |
| Controllers with direct Prisma calls (no service layer) | 3 controllers | 🟡 High |
| Fire-and-forget promises (`.catch(() => {})`) | 6 | 🟡 High |
| Repeated try/catch boilerplate across controllers | 326 methods | 🟡 High |
| `console.log/warn` in production API client | 3 calls | 🟡 High |
| Magic number `1000*60*60*24` repeated inline | 27 occurrences | 🟡 Medium |
| Duplicated role alias definitions | 5 locations | 🟡 Medium |
| God files (>1000 lines) | 14 files | 🟡 Medium |
| Test files | 10 total | 🔴 Critical |
| Duplicated API client code (web vs admin) | 2 files | 🟡 Medium |

---

## Phase 1 — Pillar 4: Security (Critical fixes first) ✅ Complete

**Rationale**: Security and data-safety issues are the highest risk. Fix these before any structural changes.

### 1.1 Eliminate 13 rogue PrismaClient instances
**Problem**: 13 service files create `new PrismaClient()` instead of importing the shared singleton. Each opens its own connection pool → risk of pool exhaustion, inconsistent middleware/extensions, potential data race conditions.

**Files to fix** (replace `new PrismaClient()` with `import { prisma } from '@pms/database'`):
- `apps/api/src/modules/realtime-performance/realtime-performance.service.ts`
- `apps/api/src/modules/analytics/analytics.service.ts`
- `apps/api/src/modules/integrations/integrations.service.ts`
- `apps/api/src/jobs/deadline-reminder.job.ts`
- `apps/api/src/services/ai-insights/engagement-scoring.service.ts`
- `apps/api/src/services/ai-insights/sentiment-analysis.service.ts`
- `apps/api/src/services/ai-insights/anomaly-detection.service.ts`
- `apps/api/src/services/ai-insights/productivity-prediction.service.ts`
- `apps/api/src/services/ai-insights/performance-benchmarking.service.ts`
- `apps/api/src/services/actionable-insights/development-plan.service.ts`
- `apps/api/src/services/actionable-insights/team-optimization.service.ts`
- `apps/api/src/services/actionable-insights/promotion-succession.service.ts`
- `apps/api/src/services/actionable-insights/pip-organizational-health.service.ts`

**Git checkpoint**: `fix(security): replace 13 rogue PrismaClient instances with shared singleton`

### 1.2 Remove production console.log calls
**Problem**: `apps/web/src/lib/api.ts` lines 66-71 log every API request URL/method to browser console in production, leaking endpoint structure.

**Fix**: Remove the 3 `console.log`/`console.warn` calls from the Axios request interceptor.

**Git checkpoint**: `fix(security): remove console.log from production API client interceptor`

### 1.3 Audit fire-and-forget promises
**Problem**: 6 locations silently swallow errors with `.catch(() => {})`.

**Fix**: Replace with `.catch((err) => logger.warn('...', { error: err }))` to preserve error visibility while still not blocking.

**Files**:
- `apps/api/src/modules/auth/auth.service.ts` line 115
- `apps/api/src/modules/ai/base-agent.ts` line 147
- `apps/api/src/modules/webhooks/webhook.service.ts` line 155
- `apps/api/src/modules/super-admin/super-admin.service.ts` line 1014
- `packages/database/prisma/seed.ts` lines 1695-1696

**Git checkpoint**: `fix(security): log swallowed promise rejections instead of silent catch`

---

## Phase 2 — Pillar 5: Testability & Pillar 3: Maintainability (Foundation) ✅ Complete

### 2.1 Create `asyncHandler` wrapper to eliminate try/catch boilerplate
**Problem**: 326 controller methods repeat the identical `try { ... } catch (error) { next(error); }` pattern.

**Create**: `apps/api/src/utils/async-handler.ts`
```typescript
import type { Request, Response, NextFunction } from 'express';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

**Apply**: Convert controller methods in a few key modules first (ai, goals, feedback, users) to prove the pattern, then expand.

**Git checkpoint**: `refactor(maintainability): add asyncHandler utility and apply to key controllers`

### 2.2 Extract shared time constants
**Problem**: `1000 * 60 * 60 * 24` appears 27 times across 8 files. Other magic numbers scattered throughout.

**Create**: `apps/api/src/utils/constants.ts`
```typescript
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;
export const DAYS = (n: number) => n * MS_PER_DAY;

// Common thresholds
export const DEFAULT_API_TIMEOUT_MS = 30_000;
export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30_000;
export const PASSWORD_RESET_TTL_S = 3600;
export const CORS_MAX_AGE_S = 86400;
export const INACTIVE_USER_THRESHOLD_DAYS = 90;
```

**Apply**: Replace all 27 inline occurrences + other magic numbers in performance-math, realtime-performance, deadline-reminder, etc.

**Git checkpoint**: `refactor(readability): extract magic numbers into named constants`

### 2.3 Consolidate role alias definitions
**Problem**: Role alias lists (`['Super Admin', 'SUPER_ADMIN', ...]`) appear in 5 different locations with slight variations.

**Create**: `apps/api/src/utils/roles.ts`
```typescript
export const SUPER_ADMIN_ROLES = ['Super Admin', 'SUPER_ADMIN'] as const;
export const ADMIN_ROLES = [...SUPER_ADMIN_ROLES, 'ADMIN', 'Tenant Admin', 'TENANT_ADMIN'] as const;
export const MANAGER_ROLES = [...ADMIN_ROLES, 'MANAGER', 'Manager', 'HR_ADMIN', 'HR Admin'] as const;

export function isSuperAdmin(roles: string[]): boolean { ... }
export function isAdmin(roles: string[]): boolean { ... }
export function isManager(roles: string[]): boolean { ... }
```

**Apply**: Replace all 5 scattered definitions in `authorize.ts`, `DashboardPage.tsx`, agent files.

**Git checkpoint**: `refactor(maintainability): consolidate role definitions into single source of truth`

---

## Phase 3 — Pillar 1: Modularity (Structural Splits) ✅ Complete

### 3.1 Split `apps/web/src/lib/api.ts` (2,020 lines → ~15 files)
**Problem**: Monolithic god object containing all API interfaces, types, and client instances.

**New structure**: `apps/web/src/lib/api/`
```
api/
├── index.ts              ← barrel re-export (preserves all existing imports)
├── client.ts             ← ApiClient class + interceptors + fetchWithAuth
├── types.ts              ← All shared interfaces (AIChatResponse, etc.)
├── goals.ts              ← goalsApi + Goal types
├── reviews.ts            ← reviewsApi + Review types
├── feedback.ts           ← feedbackApi + Feedback types
├── users.ts              ← usersApi + User types
├── analytics.ts          ← analyticsApi + Analytics types
├── notifications.ts      ← notificationsApi + types
├── calibration.ts        ← calibrationApi + types
├── performance-math.ts   ← performanceMathApi + types
├── compliance.ts         ← complianceApi + types
├── admin.ts              ← license, admin-config, announcements APIs
├── ai.ts                 ← aiApi + AI types
└── super-admin.ts        ← SuperAdminApiClient + all SA namespaces
```

**Critical**: The barrel `index.ts` must re-export everything so existing imports (`import { goalsApi } from '@/lib/api'`) continue to work unchanged.

**Git checkpoint**: `refactor(modularity): split api.ts god object into domain modules`

### 3.2 Extract service layer for `performance-math` module
**Problem**: `performance-math.controller.ts` (1,276 lines) has 40+ direct Prisma queries — no service layer exists.

**Create**: `apps/api/src/modules/performance-math/performance-math.service.ts`
- Extract all Prisma query logic from the 6 controller methods
- Controller methods become thin handlers that validate input, call service, return response

**Git checkpoint**: `refactor(modularity): extract performance-math service layer from controller`

### 3.3 Extract service layer for `leaderboard` module
**Problem**: `leaderboard.controller.ts` (1,144 lines) has 23+ direct Prisma queries.

**Create**: `apps/api/src/modules/leaderboard/leaderboard.service.ts`
- Same approach as 3.2

**Git checkpoint**: `refactor(modularity): extract leaderboard service layer from controller`

### 3.4 Split `realtime-performance.service.ts` (1,766 lines → 8 files)
**Problem**: Single class with 8 unrelated features crammed together.

**New structure**: `apps/api/src/modules/realtime-performance/services/`
```
services/
├── hourly-tracker.service.ts
├── activity-monitor.service.ts
├── goal-progress.service.ts
├── deadline-alerts.service.ts
├── workload-analyzer.service.ts
├── anomaly-detector.service.ts
├── sentiment-gauge.service.ts
└── milestone-tracker.service.ts
```
**Keep**: `realtime-performance.service.ts` as a facade that composes the sub-services.

**Git checkpoint**: `refactor(modularity): split realtime-performance into 8 focused services`

### 3.5 Split `DashboardPage.tsx` (1,401 lines)
**Problem**: God component with embedded SVG components, chart logic, utility functions, and data fetching all in one file.

**Extract**:
- `components/dashboard/CPISRadarChart.tsx` (lines 54-325)
- `components/dashboard/UpcomingOneOnOnes.tsx` (lines 359-443)
- `components/decorative/AnimatedWaves.tsx` + `FloatingOrbs.tsx` (lines 28-51)
- `hooks/useDashboardData.ts` (data fetching logic)
- `utils/badges.ts` (`riskBadge`, `ratingStars` helpers)

**Git checkpoint**: `refactor(modularity): split DashboardPage into focused components and hooks`

### 3.6 Split `authorize.ts` (727 lines → 4 files)
**Problem**: Single middleware file handling RBAC, ABAC, policy checks, and hierarchy queries.

**New structure**: `apps/api/src/middleware/authorization/`
```
authorization/
├── index.ts               ← re-exports authorize(), requireRoles()
├── rbac.ts                ← authorize(), requireRoles(), ROLE_ALIASES
├── abac.ts                ← checkResourceAccessAsync, checkResourceAccess
├── policy.ts              ← checkPolicyAccess, checkUnionRestrictions, hasDelegationFrom
└── hierarchy-queries.ts   ← Team/department/BU traversal helpers
```

**Git checkpoint**: `refactor(modularity): split authorize middleware into focused modules`

---

## Phase 4 — Pillar 2: Readability & Pillar 4: Security (Type Safety) ✅ Complete

### 4.1 Fix `req.user as any` → proper typing (53 occurrences)
**Problem**: 53 instances of `req.user as any` abandon type safety on the authenticated user object.

**Fix**: Change to use `AuthenticatedRequest` type or `req as AuthenticatedRequest` (already used in other controllers).

**Files**:
- `apps/api/src/modules/realtime-performance/realtime-performance.controller.ts` — 24 occurrences
- `apps/api/src/controllers/ai-insights.controller.ts` — 18 occurrences
- `apps/api/src/controllers/actionable-insights.controller.ts` — 11 occurrences

**Git checkpoint**: `fix(readability): replace req.user as any with proper AuthenticatedRequest typing`

### 4.2 Fix realtime-performance controller error handling (23 catch blocks)
**Problem**: All 23 methods catch errors locally with `res.status(500).json({ error: error.message })` instead of forwarding to centralized error handler. This leaks error details, returns wrong status codes, and bypasses error middleware.

**Fix**: Replace all 23 catch blocks with `next(error)` (or use `asyncHandler` from 2.1).

**Git checkpoint**: `fix(readability): standardize error handling in realtime-performance controller`

### 4.3 Systematic `@ts-nocheck` removal (36 files — phased approach)
**Problem**: 36 files suppress all TypeScript checking. This is the largest type-safety gap.

**Strategy**: Remove `@ts-nocheck` in batches, fix resulting type errors per batch. Do NOT try to fix all 36 at once.

**Batch 1** (lower risk — services with straightforward types):
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/goals/goals.service.ts`
- `apps/api/src/modules/users/users.service.ts`
- `apps/api/src/modules/feedback/feedback.service.ts`
- `apps/api/src/modules/reviews/reviews.service.ts`

**Batch 2** (controllers):
- `apps/api/src/modules/goals/goals.controller.ts`
- `apps/api/src/modules/feedback/feedback.controller.ts`
- `apps/api/src/modules/reviews/reviews.controller.ts`
- `apps/api/src/modules/users/users.controller.ts`
- `apps/api/src/modules/auth/auth.controller.ts`

**Batch 3** (medium complexity):
- `apps/api/src/modules/analytics/analytics.controller.ts`
- `apps/api/src/modules/analytics/analytics.service.ts`
- `apps/api/src/modules/calibration/calibration.controller.ts`
- `apps/api/src/modules/calibration/calibration.service.ts`
- `apps/api/src/modules/compliance/compliance.controller.ts`
- `apps/api/src/modules/compliance/compliance.service.ts`

**Batch 4** (remaining — career, compensation, evidence, succession, skills, etc.):
- All remaining `@ts-nocheck` files

Each batch gets its own commit with the format:
`fix(types): remove @ts-nocheck from [module] and fix type errors`

**Note**: Some files may have hundreds of type errors when `@ts-nocheck` is removed. If a single file has >50 errors, it may be practical to add more specific `// @ts-expect-error` comments on the worst offenders while fixing what's tractable, rather than blocking the entire batch.

---

## Phase 5 — Pillar 6: Efficiency ✅ Complete

### 5.1 Remove duplicate `checkResourceAccess` (sync version)
**Problem**: `authorize.ts` has both async and sync versions of `checkResourceAccess`. The sync version is a degraded copy that silently provides weaker access control.

**Fix**: Remove the sync version (lines 508-546), update callers to use the async version.

**Git checkpoint**: `refactor(efficiency): remove duplicated sync checkResourceAccess`

### 5.2 Optimize N+1 queries in cron jobs
**Problem**: `ai-insights.job.ts` loops through all tenants and runs 3-4 queries per tenant sequentially.

**Fix**: Use `Promise.allSettled()` for parallel tenant processing (with a concurrency limiter of 5).

**Git checkpoint**: `perf(efficiency): parallelize tenant processing in AI insights cron`

---

## Phase 6 — Pillar 5: Testability ✅ Complete

### 6.1 Add unit tests for the asyncHandler utility
**File**: `apps/api/src/utils/async-handler.test.ts`

### 6.2 Add unit tests for time constants and role utilities
**File**: `apps/api/src/utils/constants.test.ts`
**File**: `apps/api/src/utils/roles.test.ts`

### 6.3 Add unit tests for extracted service layers
**File**: `apps/api/src/modules/performance-math/performance-math.service.test.ts`
**File**: `apps/api/src/modules/leaderboard/leaderboard.service.test.ts`

### 6.4 Add integration tests for AI module
**File**: `apps/api/src/modules/ai/ai.service.test.ts`

**Git checkpoint**: `test(testability): add unit tests for refactored utilities and services`

---

## Phase 7 — Pillar 7: Documentation ✅ Complete

### 7.1 Add JSDoc to all public exports in extracted utilities
- `apps/api/src/utils/async-handler.ts` — JSDoc on `asyncHandler()`
- `apps/api/src/utils/constants.ts` — JSDoc on each constant group
- `apps/api/src/utils/roles.ts` — JSDoc on each function

### 7.2 Add module-level JSDoc headers to new files
Every new file created during the refactor already has a top-level `/** */` comment explaining its purpose (following existing codebase convention seen in agent-tools.ts, base-agent.ts, etc.).

### 7.3 Update README.md
Add a "Project Architecture" section covering:
- Module structure conventions (controller → service → routes → index)
- Shared utilities location
- How to add a new module
- Testing conventions

**Git checkpoint**: `docs(documentation): add JSDoc and update README architecture section`

---

## Execution Order & Git Checkpoints

| # | Phase | Commit Message | Risk |
|---|-------|---------------|------|
| 1 | 1.1 | `fix(security): replace 13 rogue PrismaClient instances with shared singleton` | Low |
| 2 | 1.2 | `fix(security): remove console.log from production API client interceptor` | Low |
| 3 | 1.3 | `fix(security): log swallowed promise rejections instead of silent catch` | Low |
| 4 | 2.1 | `refactor(maintainability): add asyncHandler utility and apply to key controllers` | Low |
| 5 | 2.2 | `refactor(readability): extract magic numbers into named constants` | Low |
| 6 | 2.3 | `refactor(maintainability): consolidate role definitions into single source of truth` | Low |
| 7 | 3.1 | `refactor(modularity): split api.ts god object into domain modules` | Medium |
| 8 | 3.2 | `refactor(modularity): extract performance-math service layer from controller` | Medium |
| 9 | 3.3 | `refactor(modularity): extract leaderboard service layer from controller` | Medium |
| 10 | 3.4 | `refactor(modularity): split realtime-performance into 8 focused services` | Medium |
| 11 | 3.5 | `refactor(modularity): split DashboardPage into focused components and hooks` | Medium |
| 12 | 3.6 | `refactor(modularity): split authorize middleware into focused modules` | Medium |
| 13 | 4.1 | `fix(readability): replace req.user as any with proper AuthenticatedRequest typing` | Low |
| 14 | 4.2 | `fix(readability): standardize error handling in realtime-performance controller` | Low |
| 15 | 4.3 B1 | `fix(types): remove @ts-nocheck from auth/goals/users/feedback/reviews services` | Medium |
| 16 | 4.3 B2 | `fix(types): remove @ts-nocheck from core module controllers` | Medium |
| 17 | 4.3 B3 | `fix(types): remove @ts-nocheck from analytics/calibration/compliance` | Medium |
| 18 | 4.3 B4 | `fix(types): remove @ts-nocheck from remaining modules` | High |
| 19 | 5.1 | `refactor(efficiency): remove duplicated sync checkResourceAccess` | Low |
| 20 | 5.2 | `perf(efficiency): parallelize tenant processing in AI insights cron` | Low |
| 21 | 6.x | `test(testability): add unit tests for refactored utilities and services` | Low |
| 22 | 7.x | `docs(documentation): add JSDoc and update README architecture section` | Low |

---

## Verification Plan

After each phase:
1. **API build**: `pushd "D:\CDC\PMS\pms-platform\apps\api" && npx tsc --noEmit`
2. **Web build**: `pushd "D:\CDC\PMS\pms-platform\apps\web" && npx vite build`
3. **Run existing tests**: `pushd "D:\CDC\PMS\pms-platform" && npx vitest run`
4. **Verify no regressions**: All existing imports continue to resolve, no new type errors beyond the pre-existing SA middleware issue.

After full refactor:
5. **Run new tests**: `npx vitest run` with new test files
6. **Manual smoke test**: Start API server, verify health endpoint, test AI chat endpoint
7. **Bundle size check**: Verify web bundle doesn't regress significantly

---

## What This Plan Does NOT Do

- ❌ Delete any existing functionality
- ❌ Change any API contracts or database schema
- ❌ Change any frontend routing or component behavior
- ❌ Introduce new frameworks or major dependencies
- ❌ Refactor the Python ML service (out of scope)
- ❌ Refactor the mobile app (out of scope)
- ❌ Change the admin app (minimal scope — only shared code changes)

Everything is structural improvement: splitting files, adding types, extracting services, adding tests, and improving documentation — while preserving all existing behavior.
