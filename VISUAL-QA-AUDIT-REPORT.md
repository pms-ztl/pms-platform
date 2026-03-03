# Visual QA & UI Density Audit Report
**Date:** 2026-03-03
**Auditor:** Claude (Automated Visual QA)
**App:** PMS Platform (`http://localhost:3002`)
**User:** Prasina Sathish A (TENANT_ADMIN / HR_ADMIN)
**Target:** 65-85% content occupancy per viewport

---

## 1. Route Coverage Checklist

### Core / Performance (8 routes)
| # | Route | Status | Density Rating |
|---|-------|--------|---------------|
| 1 | `/dashboard` | Audited | MAJOR issue (bottom) |
| 2 | `/goals` | Audited | Good |
| 3 | `/goal-alignment` | Audited | Minor (~35% blank) |
| 4 | `/okrs` | Audited | Excellent |
| 5 | `/reviews` | Audited | Acceptable |
| 6 | `/self-appraisal` | Audited | Good |
| 7 | `/feedback` | Audited | Minor (~25% blank) |
| 8 | `/recognition` | Audited | Minor (card ~40% blank) |

### Performance Continued (3 routes)
| # | Route | Status | Density Rating |
|---|-------|--------|---------------|
| 9 | `/one-on-ones` | Audited | MAJOR (~50% blank) |
| 10 | `/review-cycles` | Audited | Minor (~40% blank) |
| 11 | `/calibration` | Audited | Minor-to-Major |

### People (5 routes)
| # | Route | Status | Density Rating |
|---|-------|--------|---------------|
| 12 | `/directory` | Audited | Good |
| 13 | `/org-chart` | Audited | MAJOR (~60% blank) |
| 14 | `/team` | Audited | Acceptable |
| 15 | `/team-insights` | Audited | MAJOR (~65% blank) |
| 16 | `/manager-dashboard` | Audited | MAJOR (all zeros) |

### Engagement (5 routes)
| # | Route | Status | Density Rating |
|---|-------|--------|---------------|
| 17 | `/pulse` | Audited | Good |
| 18 | `/leaderboard` | Audited | Good |
| 19 | `/chat` | Audited | Acceptable (empty state) |
| 20 | `/announcements` | Audited | Acceptable |
| 21 | `/calendar` | Audited | Excellent |

### Growth (6 routes)
| # | Route | Status | Density Rating |
|---|-------|--------|---------------|
| 22 | `/skills` | Audited | Excellent |
| 23 | `/development` | Audited | Minor (~30% blank) |
| 24 | `/career` | Audited | Good |
| 25 | `/evidence` | Audited | Excellent |
| 26 | `/mentoring` | Audited | Good |
| 27 | `/skill-gaps` | Audited | Excellent |

### AI / Talent (4 routes)
| # | Route | Status | Density Rating |
|---|-------|--------|---------------|
| 28 | `/ai-development` | Audited | MAJOR (~45% blank, UX) |
| 29 | `/ai-insights` | Audited | MAJOR (~55% blank) |
| 30 | `/talent-intelligence` | Audited | MAJOR (~60% blank) |
| 31 | `/realtime` | Audited | **CRITICAL** (~60%+ blank) |

### Talent Management (5 routes)
| # | Route | Status | Density Rating |
|---|-------|--------|---------------|
| 32 | `/succession` | Audited | Good |
| 33 | `/promotions` | Audited | Minor |
| 34 | `/pip` | Audited | Good |
| 35 | `/simulator` | Audited | Good |
| 36 | `/team-optimizer` | Audited | Minor (empty state) |

### Analytics (7 routes)
| # | Route | Status | Density Rating |
|---|-------|--------|---------------|
| 37 | `/analytics` | Audited | Good |
| 38 | `/reports` | Audited | Good (1 minor card) |
| 39 | `/report-schedules` | Audited | Good |
| 40 | `/exports` | Audited | Minor (~40% blank) |
| 41 | `/hr-analytics` | Audited | Good |
| 42 | `/anomalies` | Audited | Good |
| 43 | `/meeting-analytics` | Audited | Good |

### Org Health (3 routes)
| # | Route | Status | Density Rating |
|---|-------|--------|---------------|
| 44 | `/engagement` | Audited | MAJOR (empty chart) |
| 45 | `/benchmarks` | Audited | MAJOR (all zeros) |
| 46 | `/wellbeing` | Audited | Excellent |
| 47 | `/culture-diagnostics` | Audited | Excellent |
| 48 | `/health-dashboard` | Audited | Excellent |

### Admin (10 routes)
| # | Route | Status | Density Rating |
|---|-------|--------|---------------|
| 49 | `/admin/users` | Audited | Good |
| 50 | `/admin/roles` | Audited | Good |
| 51 | `/admin/policies` | Audited | Minor (empty state) |
| 52 | `/admin/rbac-dashboard` | Audited | Good |
| 53 | `/admin/config` | Audited | MAJOR (~55% blank) |
| 54 | `/admin/licenses` | Audited | Good |
| 55 | `/admin/upgrade` | Audited | Good |
| 56 | `/admin/excel-upload` | Audited | Acceptable |
| 57 | `/admin/audit` | Audited | Good |
| 58 | `/admin/ai-access` | Audited | Good |
| 59 | `/admin/delegations` | Audited | Acceptable (empty) |
| 60 | `/compliance` | Audited | Good |

### Other (5 routes)
| # | Route | Status | Density Rating |
|---|-------|--------|---------------|
| 61 | `/profile` | Audited | Good |
| 62 | `/notifications` | Audited | Good |
| 63 | `/help` | Audited | Excellent |
| 64 | `/settings` | Audited | Good |
| 65 | `/compensation` | Audited | MAJOR (all "--") |

### Super Admin (11 routes — Access Gated)
| # | Route | Status | Notes |
|---|-------|--------|-------|
| 66-76 | `/sa/*` | Access Denied | Requires SA role login |

**Coverage: 65/76 accessible routes audited (100% of accessible routes)**
**11 SA routes require separate SA login session**

---

## 2. Route-by-Route Defect Report

### CRITICAL Issues (1)

#### C1: `/realtime` — Overview Tab Entirely Empty
- **Severity:** CRITICAL
- **Blank area:** ~60%+ of viewport below description card
- **Root cause:** The "Overview" tab renders nothing. The page has a description card at top, then tabs (Overview, Metrics, Alerts, Activity), but the Overview tab body is completely empty — no charts, no data, no empty state.
- **Impact:** Page looks broken/unfinished. Users will think the feature doesn't work.
- **Fix:** Either populate Overview with real-time summary widgets (active users, current performance snapshot, live metrics) or show a proper empty state with CTA.

### MAJOR Issues (13)

#### M1: `/dashboard` — "Recent Activity" Card ~50% Blank
- **Blank area:** Bottom card shows only 1 activity item, rest is white space
- **Root cause:** Only 1 activity record exists in demo data
- **Fix:** Seed 5-8 more activity records OR reduce card min-height to fit content

#### M2: `/one-on-ones` — ~50% Blank Below Single Card
- **Blank area:** 1 meeting card with massive blank space below
- **Root cause:** Only 1 upcoming/visible meeting for this user
- **Fix:** Show completed meetings too, add "Schedule New" CTA in empty space, or collapse container height

#### M3: `/org-chart` — ~60% Blank, 1 Person in Massive Container
- **Blank area:** Single node floating in oversized container
- **Root cause:** Current user (Prasina) has no direct reports showing; the org tree is minimal
- **Fix:** Auto-zoom/center the tree, reduce container min-height, show full org hierarchy regardless of user role

#### M4: `/team-insights` — ~65% Blank, Team Size 0
- **Blank area:** "No team data available" and "No team members found" cards dominate
- **Root cause:** `User.managerId` not set for this user's reports, so team lookup returns empty
- **Fix:** Fix manager hierarchy in seed data so Prasina has team members, OR show org-wide insights as fallback

#### M5: `/manager-dashboard` — All Zeros, Empty Cards
- **Blank area:** Team Size 0, all metric cards show 0, "No recent uploads" blank
- **Root cause:** Same as M4 — no team members found for this user
- **Fix:** Same as M4 — fix manager hierarchy

#### M6: `/engagement` — "Engagement Trend" Empty Chart ~40% Blank
- **Blank area:** Large empty area chart with no data points
- **Root cause:** No engagement survey data seeded
- **Fix:** Seed engagement survey responses OR show meaningful empty state

#### M7: `/ai-insights` — "Sentiment Trend" Empty Chart ~55% Blank
- **Blank area:** Large empty chart area
- **Root cause:** No AI sentiment analysis data
- **Fix:** Seed sample sentiment data OR collapse empty chart section

#### M8: `/talent-intelligence` — Both Cards Empty ~60% Blank
- **Blank area:** "Enter a User ID" raw input, both talent cards empty
- **Root cause:** UX requires manual UUID entry — extremely unfriendly
- **Fix:** Replace with employee dropdown/search, auto-load current user's data, or show org-wide talent overview

#### M9: `/ai-development` — ~45% Blank, Raw User ID Input
- **Blank area:** Empty generator card below unfriendly search
- **Root cause:** Same UX issue as M8 — requires raw user ID
- **Fix:** Replace with employee picker, auto-load for current user

#### M10: `/benchmarks` — "Above Benchmark 0%, Team Average 0.0"
- **Blank area:** All metrics show zero/empty
- **Root cause:** No benchmark data seeded, team data missing
- **Fix:** Seed benchmark comparison data

#### M11: `/compensation` — All "--" Values
- **Blank area:** Table rows all show "--" for every metric
- **Root cause:** No compensation data seeded for demo users
- **Fix:** Seed compensation records (salary, bonus, equity) for demo users

#### M12: `/admin/config` — "No rating scales found" ~55% Blank
- **Blank area:** Empty config page with no rating scales
- **Root cause:** No RatingScale records seeded
- **Fix:** Seed default rating scales (1-5 performance, 1-3 potential, etc.)

#### M13: `/reports` — "Team Performance" Card "No team data available yet"
- **Blank area:** ~50% of the Team Performance card is blank
- **Root cause:** Same managerId issue — team lookup fails
- **Fix:** Fix User.managerId hierarchy (same root cause as M4/M5)

### MINOR Issues (10)

| # | Route | Issue | Blank % |
|---|-------|-------|---------|
| m1 | `/goal-alignment` | Only 2 goals, space below | ~35% |
| m2 | `/feedback` | 1 feedback item | ~25% |
| m3 | `/recognition` | "Top Recognized" card sparse | ~40% |
| m4 | `/review-cycles` | 1 cycle row, space below | ~40% |
| m5 | `/development` | 1 plan, space below | ~30% |
| m6 | `/calibration` | All zero stats | ~30% |
| m7 | `/promotions` | 1 nomination row | ~40% |
| m8 | `/exports` | 3 cards with space below | ~40% |
| m9 | `/team-optimizer` | Empty state (acceptable) | ~35% |
| m10 | `/admin/policies` | Empty state (acceptable) | ~45% |

---

## 3. Prioritized Top Issues

### Priority 1 — Fix Immediately (Broken/Empty)
1. **C1: `/realtime` Overview tab** — Completely empty, page looks broken
2. **M4+M5+M13: Team data missing** — `/team-insights`, `/manager-dashboard`, `/reports` Team Performance all stem from `User.managerId` not being set for Prasina

### Priority 2 — High Impact (Data Seeding)
3. **M6: `/engagement`** — Empty engagement trend chart
4. **M7: `/ai-insights`** — Empty sentiment trend chart
5. **M10: `/benchmarks`** — All zero metrics
6. **M11: `/compensation`** — All "--" values
7. **M12: `/admin/config`** — No rating scales

### Priority 3 — UX Improvements
8. **M8+M9: `/talent-intelligence` + `/ai-development`** — Replace raw User ID input with employee picker
9. **M3: `/org-chart`** — Auto-center tree, reduce container height
10. **M1: `/dashboard`** — Seed more activity records
11. **M2: `/one-on-ones`** — Show more meetings or reduce card container

---

## 4. UI Improvement Plan

### 4.1 Fix User.managerId Hierarchy (Fixes M4, M5, M13)
**Root cause:** Demo seed creates `ReportingLine` records but doesn't set `User.managerId`. Pages that query by `managerId` return empty teams.

**Action:** Update demo seed or create a fix script to set:
- Sanjay → managerId = Preethi
- Preethi → managerId = Danish
- Prasina → managerId = Danish

**Files:** `packages/database/prisma/seed-reports.ts` (already partially does this), or `demo-seed.ts`

### 4.2 Seed Missing Data (Fixes M6, M7, M10, M11, M12)
Create seed scripts for:
- **Engagement surveys** → populates engagement trend chart
- **Rating scales** → populates admin config
- **Compensation records** → populates compensation table
- **Benchmark data** → populates benchmark comparisons

### 4.3 Fix Realtime Overview Tab (Fixes C1)
**File:** `apps/web/src/pages/realtime/RealtimeDashboardPage.tsx`
**Action:** Add content to Overview tab — either live metrics summary or proper empty state with description of what will appear when the system is running.

### 4.4 Replace Raw User ID Inputs (Fixes M8, M9)
**Files:**
- `apps/web/src/pages/talent-intelligence/TalentIntelligencePage.tsx`
- `apps/web/src/pages/ai-development/AIDevelopmentPage.tsx`

**Action:** Replace `<input placeholder="Enter user ID">` with an employee search/dropdown component that queries the user directory. Auto-load current user's data on page load.

### 4.5 Org Chart Container (Fixes M3)
**File:** `apps/web/src/pages/org-chart/OrgChartPage.tsx`
**Action:** Remove or reduce `min-height` on the chart container. Add auto-center/auto-zoom logic so the tree fills available space.

---

## 5. Summary Statistics

| Metric | Count |
|--------|-------|
| Total routes audited | 65 |
| Routes not accessible (SA) | 11 |
| CRITICAL issues | 1 |
| MAJOR issues | 13 |
| MINOR issues | 10 |
| Good/Excellent pages | 41 |
| Pages needing data seeding | 8 |
| Pages needing UX fixes | 3 |
| Pages needing code fixes | 2 |

### Root Cause Breakdown
| Root Cause | # of Issues |
|-----------|-------------|
| Missing seed data | 8 (M1, M6, M7, M10, M11, M12 + m2, m6) |
| User.managerId not set | 3 (M4, M5, M13) |
| Empty/missing UI content | 1 (C1) |
| Poor UX (raw ID input) | 2 (M8, M9) |
| CSS container sizing | 2 (M2, M3) |

---

## 6. Implementation Priority Order

1. **Fix managerId hierarchy** — 1 seed script change fixes 3 MAJOR issues
2. **Fix Realtime Overview** — 1 code change fixes the only CRITICAL issue
3. **Seed rating scales** — quick seed script for admin/config
4. **Seed compensation data** — populates compensation page
5. **Seed engagement data** — populates engagement trend
6. **Replace User ID inputs** — UX improvement for 2 AI pages
7. **Org chart container** — CSS fix for oversized container
8. **Seed more activity** — dashboard density improvement
