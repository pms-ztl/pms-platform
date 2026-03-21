# PMS Platform - Core Architecture & Systems Reference

> **Version:** 1.0 | **Date:** March 2026 | **Classification:** Internal Technical Reference

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Monorepo Architecture](#2-monorepo-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Architecture](#4-database-architecture)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [RBAC System Deep Dive](#6-rbac-system-deep-dive)
7. [Multi-Tenant Architecture](#7-multi-tenant-architecture)
8. [API Architecture](#8-api-architecture)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Mathematical Engine (CPIS)](#10-mathematical-engine-cpis)
11. [Agentic AI System](#11-agentic-ai-system)
12. [Real-Time & Event System](#12-real-time--event-system)
13. [Security Architecture](#13-security-architecture)
14. [Deployment Architecture](#14-deployment-architecture)
15. [Testing Timeline & Segments](#15-testing-timeline--segments)

---

## 1. System Overview

```
+=====================================================================+
|                    PMS PLATFORM - SYSTEM MAP                        |
+=====================================================================+
|                                                                     |
|  [USERS]                                                            |
|    |                                                                |
|    v                                                                |
|  +------------------+    +------------------+    +--------------+   |
|  | Web App (React)  |    | Admin App (React)|    | Mobile App   |   |
|  | Port 5173        |    | (Super Admin)    |    | (React Native|   |
|  +--------+---------+    +--------+---------+    +------+-------+   |
|           |                       |                      |          |
|           +----------+------------+----------------------+          |
|                      |                                              |
|                      v                                              |
|            +-------------------+                                    |
|            |  API Server       |                                    |
|            |  (Express.js)     |                                    |
|            |  Port 3001        |                                    |
|            +---+-------+---+--+                                    |
|                |       |   |                                        |
|      +---------+   +---+   +--------+                               |
|      v             v                v                               |
|  +--------+  +---------+  +-----------------+                       |
|  |PostgreSQL| | Redis   |  | 70 AI Agents    |                      |
|  |Database | | Cache   |  | 5 LLM Providers |                      |
|  |Port 5433| | Port 6379| | 64 Tools        |                      |
|  +--------+  +---------+  +-----------------+                       |
|                                                                     |
+=====================================================================+
```

### What is PMS?

PMS (Performance Management System) is a **multi-tenant SaaS platform** for enterprise performance management. It provides:

- **Goal Management** with cascading OKRs and risk assessment
- **360-Degree Reviews** with bias detection and calibration
- **CPIS Scoring** - 8-dimensional performance intelligence using 17+ statistical formulas
- **70 AI Agents** across 6 clusters for autonomous task execution
- **Real-Time Analytics** with dashboards for every role
- **Multi-Tenant Isolation** with subscription-based licensing

---

## 2. Monorepo Architecture

```
pms-platform/
├── apps/
│   ├── api/               # Express.js REST API server
│   │   ├── src/
│   │   │   ├── modules/   # 43 feature modules (goals, reviews, ai, etc.)
│   │   │   ├── middleware/ # Auth, RBAC, rate-limiting, error handling
│   │   │   ├── services/  # Email, socket, background jobs
│   │   │   └── utils/     # Shared utilities, role constants
│   │   └── tsconfig.json
│   │
│   ├── web/               # React + Vite (Tenant Web App)
│   │   ├── src/
│   │   │   ├── pages/     # 88 pages across all roles
│   │   │   ├── components/# Shared UI components
│   │   │   ├── store/     # Zustand state (auth, RBAC config)
│   │   │   └── config/    # Navigation, routes, feature flags
│   │   └── vite.config.ts
│   │
│   ├── admin/             # React + Vite (Super Admin Portal)
│   │   ├── src/pages/     # Tenant mgmt, billing, security
│   │   └── src/api.ts     # Separate API client (/api/admin)
│   │
│   ├── mobile/            # React Native (In Development)
│   └── ml-service/        # ML microservice (Python)
│
├── packages/
│   ├── core/              # Business logic & math engine
│   │   └── src/
│   │       ├── math-engine.ts      # 17 statistical formulas + CPIS
│   │       ├── trust-score-system.ts # Reviewer trust & manipulation detection
│   │       ├── bias-detection.ts    # 12 bias types detection
│   │       └── goal-early-warning.ts # Risk prediction engine
│   │
│   ├── database/          # Prisma ORM + schema (~5548 lines)
│   │   └── prisma/schema.prisma
│   │
│   ├── events/            # Event definitions
│   ├── ui/                # Shared UI component library
│   └── ui-charts/         # Chart components
│
├── turbo.json             # Turborepo pipeline config
├── package.json           # Root workspace config
└── render.yaml            # Deployment config (Render)
```

### Build Pipeline

```
turbo run build
  ├── packages/core       →  tsc (compiles math-engine, trust-score, bias-detection)
  ├── packages/database   →  prisma generate (generates Prisma client)
  ├── apps/api            →  tsc (strict: false, skipLibCheck: true)
  ├── apps/web            →  vite build (~1.8MB bundle)
  └── apps/admin          →  vite build
```

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | Tenant web app (88 pages) |
| **Frontend Build** | Vite | Fast HMR, optimized production builds |
| **UI Framework** | Tailwind CSS + Custom UI pkg | Consistent styling across apps |
| **State Mgmt** | Zustand (persisted) | Auth state, RBAC config, UI prefs |
| **Routing** | React Router v6 | SPA routing with role guards |
| **Backend** | Express.js + TypeScript | REST API (43 modules) |
| **ORM** | Prisma | Type-safe database access |
| **Database** | PostgreSQL 16 | Primary data store |
| **Cache** | Redis 7 | Session, rate-limit, AI cache (1hr TTL) |
| **Real-Time** | Socket.IO | WebSocket events for live updates |
| **AI/LLM** | 5 Providers (Anthropic, OpenAI, Google, DeepSeek, Groq) | 70 AI agents |
| **Email** | SMTP (Nodemailer) | Transactional emails |
| **Auth** | JWT (access + refresh tokens) | Stateless authentication |
| **Monorepo** | Turborepo + npm workspaces | Build orchestration |
| **Deploy** | Render (render.yaml) | Auto-deploys from `main` branch |
| **Domain** | pms.xzashr.com | Custom domain on Render |

---

## 4. Database Architecture

### Core Models (Prisma Schema: ~5548 lines)

```
┌──────────────────────────────────────────────────────────┐
│                     TENANT (Organization)                │
│  id, name, domain, subscriptionPlan, subscriptionStatus  │
│  licenseCount, maxLevel, designatedManagerId             │
│  subscriptionExpiresAt                                   │
├──────────────────────────────────────────────────────────┤
│         │                                                │
│         ├── USER (Employee)                              │
│         │   id, tenantId, email, level, departmentId     │
│         │   managerId, roles[], aiAccessEnabled          │
│         │   contractType, isActive, deletedAt            │
│         │                                                │
│         ├── DEPARTMENT                                   │
│         │   id, tenantId, name, parentId (hierarchy)     │
│         │                                                │
│         ├── BUSINESS UNIT                                │
│         │   id, tenantId, name                           │
│         │                                                │
│         ├── TEAM                                         │
│         │   id, tenantId, name, managerId                │
│         │   members[] (TeamMember junction)              │
│         │                                                │
│         └── ROLE (Custom per tenant)                     │
│             id, tenantId, name, category, permissions[]  │
└──────────────────────────────────────────────────────────┘
```

### Performance Data Models

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     GOAL        │    │   REVIEW CYCLE   │    │    FEEDBACK     │
│ id, userId      │    │ id, tenantId     │    │ id, giverId     │
│ title, progress │    │ status, type     │    │ receiverId      │
│ priority, weight│    │ startDate/endDate│    │ sentiment       │
│ dueDate, status │    │                  │    │ type, content   │
│ parentGoalId    │    │   ┌──────────┐   │    │ skillTags[]     │
│ alignedToId     │    │   │ REVIEW   │   │    │ valueTags[]     │
│ complexity(1-5) │    │   │ reviewerId│   │    └─────────────────┘
│ progressHistory │    │   │ revieweeId│   │
└─────────────────┘    │   │ rating 1-5│   │    ┌─────────────────┐
                       │   │ biasScore │   │    │  ONE-ON-ONE     │
                       │   │ calibrated│   │    │ managerId       │
                       │   └──────────┘   │    │ employeeId      │
                       └──────────────────┘    │ notes, status   │
                                               └─────────────────┘
```

### AI System Models

```
┌────────────────────┐    ┌────────────────────┐    ┌──────────────────┐
│ AGENT CONVERSATION │    │   AGENT TASK       │    │  AGENT ACTION    │
│ id, userId         │    │ id, conversationId │    │ id, taskId       │
│ agentType          │    │ status             │    │ toolName         │
│ title              │    │ currentStep        │    │ status           │
│ isArchived         │    │ totalSteps         │    │ impactLevel      │
│                    │    │ parentTaskId       │    │ requiresApproval │
│  ┌──────────────┐  │    │ isProactive        │    │ reasoning        │
│  │AGENT MESSAGE │  │    └────────────────────┘    │ result           │
│  │role, content │  │                              └──────────────────┘
│  │tokenCount    │  │    ┌────────────────────┐
│  │costCents     │  │    │  AI INSIGHT CARD   │
│  └──────────────┘  │    │ type, priority     │
└────────────────────┘    │ title, description │
                          │ isRead, isDismissed│
                          └────────────────────┘
```

---

## 5. Authentication & Authorization

### Authentication Flow

```
                                 ┌─────────────┐
    User                         │  Login Page  │
      │                          └──────┬───────┘
      │  email + password               │
      ├────────────────────────────────►│
      │                                 │
      │                          ┌──────▼───────┐
      │                          │ POST /auth   │
      │                          │  /login      │
      │                          └──────┬───────┘
      │                                 │
      │                    ┌────────────▼────────────┐
      │                    │ Validate credentials    │
      │                    │ Check tenant status     │
      │                    │ Check subscription      │
      │                    │ Load roles & permissions│
      │                    └────────────┬────────────┘
      │                                 │
      │  { accessToken, refreshToken }  │
      │◄────────────────────────────────┤
      │                                 │
      │  All subsequent requests:       │
      │  Authorization: Bearer <token>  │
      │────────────────────────────────►│
      │                                 │
      │                    ┌────────────▼────────────┐
      │                    │ authenticate middleware  │
      │                    │ → verify JWT             │
      │                    │ → attach user to request │
      │                    │ → check tenant isolation │
      │                    └────────────┬────────────┘
      │                                 │
      │                    ┌────────────▼────────────┐
      │                    │ authorize middleware     │
      │                    │ → check roles/permissions│
      │                    │ → check scope hierarchy  │
      │                    │ → check delegations      │
      │                    │ → check policies (ABAC)  │
      │                    └─────────────────────────┘
```

### Token Structure

| Field | Description |
|-------|-------------|
| `userId` | UUID |
| `tenantId` | UUID (multi-tenant isolation) |
| `email` | User email |
| `roles` | Array of role names |
| `permissions` | Array of `resource:action:scope` strings |
| `exp` | Expiry timestamp |

---

## 6. RBAC System Deep Dive

### Role Hierarchy

```
                    ┌──────────────┐
                    │ SUPER ADMIN  │  Platform Owner
                    │ (System-wide)│  Manages ALL tenants
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ TENANT ADMIN │  Organization Owner
                    │ (Tenant-wide)│  Full control of 1 tenant
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │                         │
       ┌──────▼───────┐         ┌──────▼───────┐
       │   HR ADMIN   │         │   MANAGER    │
       │ (Tenant-wide)│         │ (Team scope) │
       │ Analytics,   │         │ Direct       │
       │ Compliance,  │         │ reports,     │
       │ Config       │         │ Reviews,     │
       └──────┬───────┘         │ Goals        │
              │                 └──────┬───────┘
              │                        │
              └────────────┬───────────┘
                           │
                    ┌──────▼───────┐
                    │   EMPLOYEE   │
                    │  (Own scope) │
                    │  Goals, Self-│
                    │  review,     │
                    │  Feedback    │
                    └──────────────┘
```

### Permission System Format

```
resource : action : scope

Examples:
  goals:read:own              → Read only your own goals
  goals:create:team           → Create goals for team members
  reviews:update:department   → Update reviews in your department
  admin:manage:all            → Full admin access
  *:manage:all                → Super admin wildcard
```

### Scope Hierarchy (Ascending Access)

```
own          → Self only (userId matches)
  │
  ▼
team         → Direct reports + team members
  │
  ▼
department   → All users in department + sub-departments
  │
  ▼
businessUnit → All users in business unit + sub-units
  │
  ▼
all          → Every user in the tenant
```

### Authorization Decision Flow

```
Request arrives
     │
     ▼
[Is Super Admin?] ──yes──► ALLOW (bypass all checks)
     │no
     ▼
[Has required role?] ──yes──► Check scope
     │no
     ▼
[Has required permission?] ──yes──► Check scope
     │no
     ▼
[Has active delegation?] ──yes──► Check delegation scope
     │no
     ▼
[Check AccessPolicy (ABAC)] ──ALLOW──► ALLOW
     │DENY or no policy
     ▼
DENY (403 Forbidden)
     + Audit log: AUTHORIZATION_DENIED
```

### Advanced Features

| Feature | Description |
|---------|-------------|
| **Delegation** | Temporary authority transfer (ACTING_MANAGER, PROXY_APPROVER, REVIEW_DELEGATE, FULL_DELEGATION) with startDate/endDate |
| **Matrix Reporting** | SOLID (primary), DOTTED (functional), MATRIX (equal), PROJECT (temporary) lines |
| **Custom Roles** | Tenant-scoped roles with category fallback (ADMIN, HR, MANAGER, EMPLOYEE) |
| **Time-Bound Roles** | UserRole has `expiresAt` for temporary role assignments |
| **Policy-Driven (ABAC)** | AccessPolicy with conditions (target roles, departments, levels, union codes) |
| **Union Restrictions** | UnionContract model blocks certain review/feedback/calibration operations |

---

## 7. Multi-Tenant Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   PLATFORM LAYER                        │
│                                                         │
│  Super Admin Portal ──► Manage ALL Tenants              │
│  /api/admin endpoints ──► Cross-tenant operations       │
│  License monitoring ──► Subscription enforcement        │
│  Security alerts ──► Brute force, cross-tenant blocks   │
│                                                         │
├─────────────┬──────────────────┬────────────────────────┤
│  TENANT A   │    TENANT B      │    TENANT C            │
│  Acme Corp  │    Beta Inc      │    Gamma LLC           │
│             │                  │                        │
│  Users: 50  │    Users: 200    │    Users: 1000         │
│  Plan: Pro  │    Plan: Enterprise│  Plan: Enterprise+   │
│  License:50 │    License: 250  │    License: 1200       │
│  MaxLevel:8 │    MaxLevel: 12  │    MaxLevel: 16        │
│             │                  │                        │
│  ┌────────┐ │    ┌────────┐    │    ┌────────┐          │
│  │Own Data│ │    │Own Data│    │    │Own Data│          │
│  │Own Users││    │Own Users│   │    │Own Users│         │
│  │Own Roles││    │Own Roles│   │    │Own Roles│         │
│  └────────┘ │    └────────┘    │    └────────┘          │
│             │                  │                        │
│  ISOLATED   │    ISOLATED      │    ISOLATED            │
│  (tenantId) │    (tenantId)    │    (tenantId)          │
└─────────────┴──────────────────┴────────────────────────┘
```

### Tenant Isolation Mechanisms

| Mechanism | How It Works |
|-----------|-------------|
| **Database-Level** | Every table has `tenantId` column; all queries filter by it |
| **Middleware-Level** | `authenticate` middleware extracts `tenantId` from JWT |
| **Cross-Tenant Block** | `authorize.ts` logs `CROSS_TENANT_ACCESS_BLOCKED` via auditLogger |
| **Security Alerts** | 3+ cross-tenant attempts/hr triggers alert |
| **Subscription Guard** | Blocks write operations for expired/suspended tenants |
| **Seat Enforcement** | `enforceSeatLimit()` checks `licenseCount` + `subscriptionStatus` |

### Subscription Plans

| Feature | Free/Trial | Pro | Enterprise |
|---------|-----------|-----|-----------|
| Users | Up to 10 | Up to 100 | Unlimited |
| AI Agents | Help only | 20 agents | All 70 agents |
| Review Cycles | 1 active | Unlimited | Unlimited |
| Calibration | No | Yes | Yes |
| Analytics | Basic | Advanced | Full + Exports |
| Custom Roles | No | Yes | Yes |
| Delegation | No | Basic | Full (4 types) |
| API Access | No | Read-only | Full |

---

## 8. API Architecture

### Module Map (43 Modules)

```
/api/v1/
├── /auth                 # Login, register, refresh, password reset
├── /users                # User CRUD, roles, org chart, avatar
├── /goals                # Goal CRUD, tree, alignment, progress
├── /reviews              # Review cycles, reviews, calibration
├── /feedback             # Give/receive feedback, recognition wall
├── /one-on-ones          # 1-on-1 meetings, notes
├── /calibration          # Rating calibration sessions
├── /analytics            # Dashboards, trends, bias metrics
├── /reports              # Report generation, scheduling, export
├── /ai                   # Chat, agents, tasks, approvals, insights
├── /ai-insights          # Sentiment, anomaly, benchmark, prediction
├── /performance-math     # CPIS, goal risk, team analytics
├── /pulse                # Pulse surveys, sentiment tracking
├── /development          # Dev plans, activities, checkpoints
├── /skills               # Skill matrix, assessments, heatmap
├── /career               # Career paths, succession readiness
├── /mentoring            # Mentor matching, sessions, progress
├── /pip                  # Performance improvement plans
├── /chat                 # Internal messaging, channels
├── /leaderboard          # Performance/goal/recognition rankings
├── /engagement           # Engagement metrics, at-risk detection
├── /announcements        # Company announcements
├── /notifications        # Push/email notifications
├── /recognition          # Recognition posts, badges
├── /checkins             # Weekly/monthly check-ins
├── /compensation         # Salary, equity, pay analysis
├── /promotions           # Promotion tracking, eligibility
├── /succession           # Succession planning, nine-box
├── /compliance           # Regulatory compliance tracking
├── /policies             # Policy management
├── /delegations          # Authority delegation management
├── /webhooks             # External integrations
├── /calendar             # Calendar events, scheduling
├── /actionable-insights  # Auto-recommendations
├── /health-metrics       # System health monitoring
├── /excel-upload         # Bulk data import
├── /admin-config         # Tenant configuration
├── /audit                # Audit logs
├── /roles                # Role/permission management
├── /realtime-performance # Live dashboards
├── /alerts               # Security & system alerts
└── /super-admin          # Platform-wide operations (separate auth)

/api/admin/               # Super Admin API (separate auth context)
├── /auth                 # Super admin login/logout
├── /tenants              # Tenant CRUD, suspend, metrics
├── /users                # Cross-tenant user operations
├── /billing              # Plans, invoices, revenue
├── /security             # IP blocking, session termination
├── /system               # Global config, health, cache
├── /audit                # Cross-tenant audit trails
└── /upgrade-requests     # Feature upgrade approvals
```

### Middleware Stack (Request Pipeline)

```
Request
  │
  ▼
[Helmet]           → Security headers (XSS, HSTS, etc.)
  │
  ▼
[CORS]             → Configurable origins
  │
  ▼
[Compression]      → gzip response compression
  │
  ▼
[Input Sanitize]   → XSS prevention on all inputs
  │
  ▼
[Body Parser]      → JSON (10MB limit)
  │
  ▼
[Request Logger]   → Log method, path, duration
  │
  ▼
[Rate Limiter]     → Per-IP + per-user limits
  │
  ▼
[Authenticate]     → JWT verification → attach user
  │
  ▼
[Subscription Guard] → Block writes for expired tenants
  │
  ▼
[Authorize]        → RBAC + ABAC permission check
  │
  ▼
[AI Access Guard]  → (AI routes only) Check aiAccessEnabled
  │
  ▼
[Controller]       → Business logic execution
  │
  ▼
[Socket.IO Emit]   → Real-time event broadcast
  │
  ▼
[Error Handler]    → Standardized error responses
```

---

## 9. Frontend Architecture

### Web App Route Structure by Role

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ALL AUTHENTICATED USERS                           │
│                                                                      │
│  /dashboard         Main dashboard (role-adaptive content)           │
│  /goals             Personal goals + progress tracking               │
│  /reviews           Reviews assigned to you                          │
│  /feedback          Give/receive feedback                            │
│  /one-on-ones       Your 1-on-1 meetings                             │
│  /development       Personal development plans                       │
│  /recognition       Recognition wall                                 │
│  /profile           Your profile & settings                          │
│  /notifications     Your notifications                               │
│  /directory         Employee directory                               │
│  /org-chart         Org chart view                                   │
│  /leaderboard       Performance leaderboard                          │
│  /checkins          Weekly/monthly check-ins                         │
│  /skills            Personal skill matrix                            │
│  /career            Career path view                                 │
│  /mentoring         Mentorship (as mentee)                           │
│  /pulse             Submit pulse survey                              │
│  /chat              Internal messaging                               │
│  /calendar          Calendar & events                                │
│  /help              Help center & docs                               │
├──────────────────────────────────────────────────────────────────────┤
│                    MANAGER+ ROLES                                    │
│                                                                      │
│  /manager-dashboard Manager hub (team overview)                      │
│  /team              Team management                                  │
│  /calibration       Calibration sessions                             │
│  /analytics         Performance analytics                            │
│  /realtime          Real-time dashboards                             │
│  /reports           Report generation                                │
│  /pip               Performance improvement plans                    │
│  /compensation      Compensation management                         │
│  /promotions        Promotion tracking                               │
│  /review-cycles     Review cycle management                          │
│  /admin/excel-upload Excel bulk upload                                │
│  /admin/delegations Delegation management                            │
│  /report-schedules  Scheduled reports                                │
│  /wellbeing         Wellbeing dashboard                              │
│  /meeting-analytics Meeting effectiveness                            │
│  /anomalies         Performance anomaly detection                    │
│  /benchmarks        Performance benchmarks                           │
│  /ai-development    AI development plans                             │
│  /engagement        Engagement metrics                               │
│  /health-dashboard  Org health dashboard                             │
│  /reviews/moderate  Review moderation                                │
├──────────────────────────────────────────────────────────────────────┤
│                    HR ADMIN+ ROLES                                   │
│                                                                      │
│  /hr-analytics      HR-specific analytics                            │
│  /succession        Succession planning (nine-box)                   │
│  /compliance        Compliance tracking                              │
│  /skill-gaps        Skill gap analysis                               │
│  /ai-insights       AI-generated insights                            │
│  /talent-intelligence Talent pool analysis                           │
│  /team-optimizer    Team composition optimizer                       │
│  /culture-diagnostics Culture assessment                             │
│  /admin/users       User management                                  │
│  /admin/config      Tenant configuration                             │
│  /admin/audit       Audit logs                                       │
│  /admin/licenses    License management                               │
│  /admin/ai-access   AI access control                                │
│  /admin/roles       Role management                                  │
│  /admin/upgrade     Subscription upgrade                             │
│  /admin/policies    Access policies (ABAC)                           │
│  /admin/rbac-dashboard RBAC overview                                 │
├──────────────────────────────────────────────────────────────────────┤
│                    SUPER ADMIN ONLY                                   │
│                                                                      │
│  /sa/dashboard      Platform overview (all tenants)                  │
│  /sa/tenants        Tenant management (CRUD, suspend)                │
│  /sa/users          Cross-tenant user management                     │
│  /sa/billing        Billing & revenue tracking                       │
│  /sa/audit          Cross-tenant audit logs                          │
│  /sa/security       Security management (IP block, sessions)         │
│  /sa/system         System configuration                             │
│  /sa/settings       Platform settings                                │
│  /sa/upgrade-requests Upgrade request approvals                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Sidebar Navigation (9 Sections)

| # | Section | Items |
|---|---------|-------|
| 1 | **Core** | Dashboard |
| 2 | **Performance** | Goals, OKRs, Reviews, Self-Appraisal, Feedback, Recognition, 1-on-1s |
| 3 | **People** | Directory, Org Chart, Team, Team Insights, Manager Hub |
| 4 | **Engagement** | Pulse, Leaderboard, Chat, Calendar, Announcements |
| 5 | **Growth** | Skills, Skill Gaps, Development, AI Dev Plans, Career Path, Evidence, Mentoring |
| 6 | **Talent** | Talent Intelligence, Team Optimizer, Compensation, Promotions, Calibration, Succession, Review Cycles, PIP, Simulator |
| 7 | **Analytics** | Analytics, Reports, Schedules, Real-time, HR Analytics, Benchmarks, AI Insights, Anomalies, Exports |
| 8 | **Org Health** | Org Health, Engagement, Wellbeing, Meetings, Culture Diagnostics |
| 9 | **Administration** | User Mgmt, Roles, Policies, RBAC Dashboard, Delegations, Licenses, Upgrade, Config, Excel Upload, Audit, Moderator, AI Access, Compliance |

---

## 10. Mathematical Engine (CPIS)

### Formula Ecosystem Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                17 CORE STATISTICAL FORMULAS                       │
│                                                                   │
│  Clamp  Mean  WeightedMean  HarmonicMean  Variance  StdDev      │
│  SampleStdDev  Z-Score  Sigmoid  BoundedSigmoid                 │
│  PearsonCorrelation  LinearRegression  EWMA                     │
│  ShannonEntropy  PercentileRank  BayesianEstimate  Gini         │
└───────────────┬──────────────────────────────────┬───────────────┘
                │                                  │
        ┌───────▼────────┐                ┌────────▼───────┐
        │ 6 COMPOSITE    │                │ 8 CPIS         │
        │ SYSTEMS        │                │ DIMENSIONS     │
        │                │                │                │
        │ Goal Score     │                │ GAI (25%)      │
        │ Performance    │────────────────► RQS (20%)      │
        │ Team Analytics │                │ FSI (12%)      │
        │ Goal Risk      │                │ CIS (10%)      │
        │ Review Calibr. │                │ CRI (10%)      │
        │ Disparate Impact│               │ GTS (8%)       │
        └────────────────┘                │ EQS (8%)       │
                                          │ III (7%)       │
                                          └───────┬────────┘
                                                  │
                                          ┌───────▼────────┐
                                          │ CPIS FINAL     │
                                          │                │
                                          │ Bayesian       │
                                          │ Smoothing      │
                                          │ + Fairness     │
                                          │ Adjustment     │
                                          │ + Tenure Factor│
                                          │ + Confidence   │
                                          │   Interval     │
                                          │                │
                                          │ = Score 0-100  │
                                          │ + Grade A+ - F │
                                          │ + Stars 1-5    │
                                          │ + Rank Label   │
                                          └────────────────┘
```

### The 8 CPIS Dimensions

| # | Dimension | Weight | Key Formula | What It Measures |
|---|-----------|--------|-------------|------------------|
| D1 | **Goal Attainment Index (GAI)** | 25% | `Σ(Gᵢ × Wᵢ × Pᵢ × Tᵢ × Aᵢ) / Σ(Wᵢ)` | Goal completion with priority/timeliness |
| D2 | **Review Quality Score (RQS)** | 20% | `WHM(Rᵢ × (1-Bᵢ), Tᵢ × TypeWᵢ) × 20` | Calibrated reviews adjusted for bias |
| D3 | **Feedback Sentiment Index (FSI)** | 12% | `EWMA(Sᵢ × Qᵢ, α=0.35) × 100` | Feedback quality with recency weighting |
| D4 | **Collaboration Impact Score (CIS)** | 10% | `Σ(sigmoid(channel) × channelWeight)` | Cross-functional work, feedback, 1-on-1s |
| D5 | **Consistency & Reliability (CRI)** | 10% | `0.30×OnTime + 0.25×Velocity + 0.20×Streak + 0.15×Rating + 0.10×Deadline` | Delivery reliability and consistency |
| D6 | **Growth Trajectory Score (GTS)** | 8% | `0.35×Trend + 0.20×Skill + 0.15×Training + 0.15×DevPlan + 0.15×Readiness` | Learning velocity and career growth |
| D7 | **Evidence Quality Score (EQS)** | 8% | `0.25×Verified + 0.30×Impact + 0.25×Quality + 0.20×Diversity` | Work evidence substantiation |
| D8 | **Initiative & Innovation (III)** | 7% | `0.25×Innovation + 0.20×Mentoring + 0.20×Knowledge + 0.15×Process + 0.20×Voluntary` | Proactive contributions beyond duties |

### Master CPIS Formula

```
CPIS = FairnessAdjust(Σ(Dᵢ × Wᵢ)) × TenureFactor × ConfidenceAdjust

Where:
  FairnessAdjust  = Bayesian shrinkage + disparate impact correction
  TenureFactor    = min(1.12, 1 + tenureYears × 0.025)  [+2.5%/year, max +12%]
  ConfidenceAdjust = Based on data volume (wider margins when sparse)
```

### Key Sub-Systems

#### Goal Risk Assessment
```
OverallRisk = 0.40×ScheduleRisk + 0.30×VelocityRisk + 0.15×DependencyRisk + 0.15×ComplexityRisk

Risk Levels: CRITICAL (≥75) | HIGH (50-74) | MEDIUM (25-49) | LOW (<25)
```

#### Review Calibration (Z-Score Normalization)
```
For each reviewer:
  z = (rating - reviewerMean) / reviewerStdDev
  calibrated = z × globalStdDev + globalMean
  clamped to [1, 5]
```

#### Reviewer Trust Score
```
trustScore = (volumeFactor × 0.6 + consistencyFactor × 0.4) × 100

volumeFactor = 1 / (1 + e^(-0.3 × (reviewCount - 5)))
consistencyFactor = 1 - min(1, ((stdDev - 0.75) / 1.5)²)

Tiers: EXCEPTIONAL (≥85) | TRUSTED (70-84) | STANDARD (50-69) | MONITORED (35-49) | RESTRICTED (<35)
```

#### Bias Detection (12 Types)
```
Types: Gendered Language, Recency Bias, Halo Effect, Horns Effect,
       Attribution Bias, Similarity Bias, Stereotyping, Central Tendency,
       Contrast Effect, First Impression, Leniency Bias, Severity Bias

Score = max(0, 100 - normalizedPenalty × 5)
```

---

## 11. Agentic AI System

### 70-Agent Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    AI ORCHESTRATION LAYER                         │
│                                                                   │
│  User Message → [Two-Stage Classification] → Route to Agent       │
│                                                                   │
│  Agent Coordinator → [Decompose Goal] → Parallel/Sequential Tasks │
│                                                                   │
│  Agentic Engine → [Tool Calling Loop] → Self-Correction           │
│                                                                   │
│  Human-in-Loop → [Approval Queue] → Resume/Cancel                 │
└──────────────────────────────────────────────────────────────────┘

┌─────────────┐  ┌─────────────┐  ┌──────────────────┐
│ CORE (20)   │  │BIO-PERF (10)│  │HYPER-LEARN (12)  │
│             │  │             │  │                  │
│ goal_intel  │  │ neuro_focus │  │ shadow_learning  │
│ perf_signal │  │ circadian   │  │ micro_learning   │
│ review_draft│  │ micro_break │  │ sparring_partner │
│ comp_promo  │  │ cortisol    │  │ skill_gap_fore.  │
│ 1on1_advisor│  │ ergonomics  │  │ knowledge_broker │
│ help_assist │  │ sleep_opt   │  │ career_sim       │
│ nlp_query   │  │ hydration   │  │ ...              │
│ coaching    │  │ vocal_tone  │  └──────────────────┘
│ workforce   │  │ environment │
│ governance  │  │ burnout_int │  ┌──────────────────┐
│ ...         │  └─────────────┘  │LIQUID WORK (10)  │
└─────────────┘                   │                  │
                                  │ task_bidder      │
┌─────────────┐                   │ gig_sourcer      │
│CULTURE (10) │                   │ market_value     │
│             │                   │ succession_sent  │
│ culture_wvr │                   │ ...              │
│ bias_neutr  │                   └──────────────────┘
│ gratitude   │
│ empathy     │  ┌──────────────────┐
│ inclusion   │  │GOVERNANCE (8)    │
│ ...         │  │                  │
└─────────────┘  │ posh_sentinel    │
                 │ labor_compliance │
                 │ data_privacy     │
                 │ audit_trail      │
                 │ ...              │
                 └──────────────────┘
```

### LLM Provider Configuration

| Provider | Primary Model | Cost (per 1K tokens) | Best For |
|----------|--------------|---------------------|----------|
| **Anthropic** | Claude Sonnet 4 | $0.003 in / $0.015 out | Production (complex reasoning) |
| **OpenAI** | GPT-4o | $0.0025 in / $0.010 out | Fallback |
| **Google** | Gemini 2.0 Flash | $0.0001 in / $0.0004 out | Economy agents (default) |
| **DeepSeek** | DeepSeek Chat | $0.00014 in / $0.00028 out | Budget tasks |
| **Groq** | Llama 3.3 70B | $0.059 in / $0.079 out | Fast inference |

### Tool System

| Category | Count | Examples |
|----------|-------|---------|
| **Read Tools** | 27+ | query_users, query_goals, query_reviews, query_analytics |
| **Low-Write** | 10+ | create_insight_card, send_notification, log_activity |
| **High-Write** | 27+ | create_goal, create_evidence, create_pip, create_promotion_recommendation |

### Safeguards

| Safeguard | Value |
|-----------|-------|
| Max tokens per task | 50,000 |
| Max cost per task | $0.50 |
| Rate limit per user | 15 calls/min |
| Rate limit per tenant | 60 calls/min |
| Circuit breaker | 3 failures → 5min cooldown |
| Redis cache TTL | 1 hour |
| Fallback chain | Primary → Secondary → Tertiary provider |

---

## 12. Real-Time & Event System

```
┌────────────────┐    ┌─────────────────┐    ┌──────────────┐
│  API Mutation   │───►│  Socket.IO Emit │───►│  Web Client  │
│  (CRUD action)  │    │  (event + data) │    │  (listener)  │
└────────────────┘    └─────────────────┘    └──────────────┘

Events emitted on:
  ● goal:created, goal:updated, goal:deleted
  ● review:submitted, review:acknowledged
  ● feedback:received
  ● notification:new
  ● agent:task:started, agent:task:completed
  ● agent:action:pending (approval needed)
  ● pulse:submitted
  ● recognition:given
```

### Background Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| **Deadline Reminder** | Cron (configurable) | Goal/review deadline alerts |
| **License Monitor** | Every 6 hours | Subscription expiry checks |
| **AI Insights** | Cron (configurable) | Auto-generate proactive insights |
| **Proactive Agents** | Daily/Weekly | Burnout scan, goal alignment audit |

---

## 13. Security Architecture

### Defense Layers

```
Internet
  │
  ▼
[Render CDN]        → DDoS protection, SSL termination
  │
  ▼
[Helmet]            → Security headers (CSP, HSTS, X-Frame)
  │
  ▼
[CORS]              → Allowed origins whitelist
  │
  ▼
[Rate Limiter]      → Auth: stricter / Standard: relaxed
  │
  ▼
[Input Sanitizer]   → XSS prevention on all inputs
  │
  ▼
[JWT Verify]        → Token validation + expiry check
  │
  ▼
[Tenant Isolation]  → tenantId filter on all queries
  │
  ▼
[RBAC/ABAC]         → Role + permission + scope check
  │
  ▼
[Audit Logger]      → Every action logged with user/tenant
```

### Security Alert Detection

| Alert | Threshold | Action |
|-------|-----------|--------|
| Brute Force | 5+ failed logins/hour | Alert + temporary block |
| Cross-Tenant | 3+ attempts/hour | Alert + audit log |
| Bulk Deactivation | 5+ deactivations/hour | Alert + admin notification |
| Suspicious AI Use | Unusual token consumption | Alert + rate limit |

---

## 14. Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     RENDER.COM                           │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Web Service  │  │  API Service  │  │  Admin App   │  │
│  │  (Static)     │  │  (Node.js)   │  │  (Static)    │  │
│  │  apps/web     │  │  apps/api    │  │  apps/admin  │  │
│  │  Port 443     │  │  Port 3001   │  │  Port 443    │  │
│  └──────────────┘  └──────┬───────┘  └──────────────┘  │
│                           │                              │
│                    ┌──────▼───────┐  ┌──────────────┐   │
│                    │  PostgreSQL  │  │    Redis      │   │
│                    │  (Managed)   │  │  (Managed)    │   │
│                    │  Port 5432   │  │  Port 6379    │   │
│                    └──────────────┘  └──────────────┘   │
│                                                          │
│  Domain: pms.xzashr.com                                  │
│  Auto-deploy: main branch                                │
│  Plan: Free tier                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 15. Testing Timeline & Segments

### Testing Phase Plan (Segmented by RBAC Role)

Each segment below is tagged for tracking. See the role-specific workflow documents (02, 03, 04) for detailed test cases per segment.

```
PHASE 1: INFRASTRUCTURE (Week 1)              Tag: [INFRA-01] to [INFRA-05]
├── [INFRA-01] Database connectivity & migrations
├── [INFRA-02] Redis cache connectivity
├── [INFRA-03] API server health endpoints
├── [INFRA-04] Authentication flow (login, JWT, refresh)
└── [INFRA-05] Multi-tenant isolation verification

PHASE 2: SUPER ADMIN WORKFLOWS (Week 2)       Tag: [SA-01] to [SA-12]
├── See 02_SUPER_ADMIN_WORKFLOW.md for full breakdown
└── 12 segments covering all Super Admin features

PHASE 3: TENANT ADMIN WORKFLOWS (Week 2-3)    Tag: [TA-01] to [TA-18]
├── See 03_TENANT_ADMIN_WORKFLOW.md for full breakdown
└── 18 segments covering all Tenant Admin features

PHASE 4: MANAGER WORKFLOWS (Week 3)           Tag: [MGR-01] to [MGR-14]
├── Team management, reviews, calibration, analytics
└── Covered within Tenant Admin doc (Manager is sub-role)

PHASE 5: EMPLOYEE WORKFLOWS (Week 3-4)        Tag: [EMP-01] to [EMP-16]
├── See 04_EMPLOYEE_WORKFLOW.md for full breakdown
└── 16 segments covering all Employee features

PHASE 6: AI AGENT TESTING (Week 4)            Tag: [AI-01] to [AI-08]
├── [AI-01] Chat interface + agent routing
├── [AI-02] Core agents (goal_intel, review_drafter, help_assistant)
├── [AI-03] Multi-agent coordination
├── [AI-04] Human-in-the-loop approvals
├── [AI-05] Proactive scheduling (burnout, deadlines)
├── [AI-06] Cost tracking + rate limiting
├── [AI-07] Provider failover chain
└── [AI-08] RBAC-scoped agent data access

PHASE 7: MATHEMATICAL ENGINE (Week 4)         Tag: [MATH-01] to [MATH-06]
├── [MATH-01] Core formulas (17 statistical functions)
├── [MATH-02] Goal scoring + risk assessment
├── [MATH-03] Performance scoring (individual)
├── [MATH-04] CPIS 8-dimension computation
├── [MATH-05] Review calibration + bias detection
└── [MATH-06] Team analytics + fairness analysis

PHASE 8: INTEGRATION & LOAD (Week 5)          Tag: [INT-01] to [INT-05]
├── [INT-01] Cross-feature workflows (goal → review → CPIS)
├── [INT-02] Real-time events (Socket.IO)
├── [INT-03] Email notifications
├── [INT-04] Concurrent user load simulation
└── [INT-05] Regression test suite
```

### Timeline Gantt Chart

```
Week 1  ████████░░░░░░░░░░░░░░░░░  Infrastructure
Week 2  ░░░░░░░░████████████░░░░░░  Super Admin + Tenant Admin (start)
Week 3  ░░░░░░░░░░░░████████████░░  Tenant Admin (cont) + Manager + Employee (start)
Week 4  ░░░░░░░░░░░░░░░░░░████████  Employee (cont) + AI Agents + Math Engine
Week 5  ░░░░░░░░░░░░░░░░░░░░░░████  Integration + Load + Regression
```

---

> **Next Documents:**
> - `02_SUPER_ADMIN_WORKFLOW.md` - Super Admin feature workflow & test segments
> - `03_TENANT_ADMIN_WORKFLOW.md` - Tenant Admin feature workflow & test segments
> - `04_EMPLOYEE_WORKFLOW.md` - Employee feature workflow & test segments
