# PMS Platform - Super Admin Workflow & Testing Segments

> **Role:** Super Admin (SUPER_ADMIN / SYSTEM_ADMIN)
> **Scope:** Platform-wide (ALL tenants)
> **App:** Admin Portal (`apps/admin/`) + Web App (`/sa/*` routes)
> **API Base:** `/api/admin/` (separate auth context)

---

## Table of Contents

1. [Role Overview](#1-role-overview)
2. [Feature Map & Access Matrix](#2-feature-map--access-matrix)
3. [Workflow Diagrams](#3-workflow-diagrams)
4. [Feature Workflows with Expected Outcomes](#4-feature-workflows-with-expected-outcomes)
5. [Mathematical Equations Used](#5-mathematical-equations-used)
6. [Impact on Other Users](#6-impact-on-other-users)
7. [Testing Segments](#7-testing-segments)

---

## 1. Role Overview

The **Super Admin** is the platform owner/operator who manages the entire PMS platform across all tenants. This role operates from a **separate admin portal** (`apps/admin/`) and has a dedicated API context (`/api/admin/`).

```
┌──────────────────────────────────────────────────────────┐
│                    SUPER ADMIN SCOPE                      │
│                                                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │Tenant A │  │Tenant B │  │Tenant C │  │Tenant D │    │
│  │50 users │  │200 users│  │1000 user│  │Trial    │    │
│  │Pro Plan │  │Enterpr. │  │Enterpr+ │  │Free     │    │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │
│                                                           │
│  Super Admin can:                                         │
│  ● Create/suspend/delete ANY tenant                       │
│  ● View/manage ANY user across ALL tenants                │
│  ● Control billing, subscriptions, licenses               │
│  ● Monitor security threats across platform               │
│  ● Configure system-wide settings                         │
│  ● Review audit logs across all tenants                   │
│  ● Approve/reject feature upgrade requests                │
└──────────────────────────────────────────────────────────┘
```

### Key Characteristics

| Attribute | Value |
|-----------|-------|
| **Auth Context** | Separate login (admin portal), separate session |
| **Bypass** | Bypasses all RBAC checks (wildcard `*:manage:all`) |
| **Tenant Scope** | Cross-tenant access (not bound to any single tenant) |
| **UI** | Admin Portal (apps/admin) + Web App Super Admin pages (/sa/*) |
| **Rate Limiting** | Stricter on auth endpoints, standard elsewhere |

---

## 2. Feature Map & Access Matrix

### Admin Portal Features (apps/admin)

| # | Feature | Route | Description |
|---|---------|-------|-------------|
| 1 | **Dashboard** | `/dashboard` | Platform-wide metrics: total tenants, users, revenue, active subscriptions |
| 2 | **Tenant Management** | `/tenants` | CRUD tenants, view metrics, suspend/activate |
| 3 | **Tenant Detail** | `/tenants/:id` | Deep dive: users, usage, subscription, audit trail |
| 4 | **User Management** | `/users` | Cross-tenant user search, view, manage |
| 5 | **User Detail** | `/users/:id` | User profile, roles, activity across tenant |
| 6 | **Billing** | `/billing` | Subscription plans, invoices, revenue tracking |
| 7 | **System Config** | `/system` | Global settings, health checks, cache management |
| 8 | **Audit Logs** | `/audit` | Cross-tenant audit trail (all actions) |
| 9 | **Security** | `/security` | IP blocking, session termination, threat detection |
| 10 | **Upgrade Requests** | Web: `/sa/upgrade-requests` | Review and approve tenant upgrade requests |

### Web App Super Admin Pages (/sa/*)

| # | Feature | Route | Description |
|---|---------|-------|-------------|
| 1 | **SA Dashboard** | `/sa/dashboard` | Platform overview with charts |
| 2 | **SA Tenants** | `/sa/tenants` | Tenant list with inline metrics |
| 3 | **SA Tenant Detail** | `/sa/tenants/:id` | Tenant deep dive |
| 4 | **SA Users** | `/sa/users` | Cross-tenant user explorer |
| 5 | **SA Billing** | `/sa/billing` | Revenue dashboard |
| 6 | **SA Audit** | `/sa/audit` | Platform audit viewer |
| 7 | **SA Security** | `/sa/security` | Security control center |
| 8 | **SA System** | `/sa/system` | System health & config |
| 9 | **SA Settings** | `/sa/settings` | Platform preferences |
| 10 | **SA Upgrades** | `/sa/upgrade-requests` | Upgrade request queue |

---

## 3. Workflow Diagrams

### 3.1 Tenant Lifecycle Management

```
[SA-01] TENANT CREATION WORKFLOW

Super Admin
     │
     ▼
Create Tenant ────────────► POST /api/admin/tenants
     │                        │
     │                        ├── Create Tenant record
     │                        ├── Set subscription plan
     │                        ├── Set license count
     │                        ├── Set maxLevel (org depth)
     │                        ├── Generate admin credentials
     │                        │
     │                        ▼
     │                   Send Welcome Email ──────────► Tenant Admin
     │                   (welcomeAdminTemplate)          receives email
     │                        │
     │                        ▼
     │                   Assign Designated Manager ───► Manager receives
     │                   (managerAssignmentTemplate)     assignment email
     │
     ▼
Verify Tenant Active ──────► Tenant Admin can log in
                              Employees can be onboarded

     EFFECT ON OTHER USERS:
     ● Tenant Admin: Receives welcome email, can log in
     ● Designated Manager: Receives assignment notification
     ● Future Employees: Can be added under this tenant
```

### 3.2 Tenant Suspension/Activation

```
[SA-02] TENANT SUSPENSION WORKFLOW

Super Admin
     │
     ├── Suspend Tenant ──────► PATCH /api/admin/tenants/:id
     │                           │
     │                           ├── Set subscriptionStatus = 'SUSPENDED'
     │                           ├── Subscription Guard activates
     │                           │
     │                           ▼
     │                    ┌──────────────────────────────────┐
     │                    │ ALL write operations BLOCKED for │
     │                    │ this tenant's users:             │
     │                    │ ● Cannot create goals            │
     │                    │ ● Cannot submit reviews          │
     │                    │ ● Cannot give feedback           │
     │                    │ ● Cannot upload Excel            │
     │                    │ ● Cannot use AI agents           │
     │                    │                                  │
     │                    │ READ operations still work:      │
     │                    │ ● Can view dashboard             │
     │                    │ ● Can read existing data         │
     │                    │ ● Can export reports             │
     │                    └──────────────────────────────────┘
     │
     ├── Activate Tenant ──────► PATCH /api/admin/tenants/:id
     │                           │
     │                           ├── Set subscriptionStatus = 'ACTIVE'
     │                           ├── All write operations restored
     │                           └── Audit logged: TENANT_ACTIVATED
     │
     EFFECT ON OTHER USERS:
     ● ALL users in tenant: Write operations blocked/restored
     ● Tenant Admin: Cannot manage users, roles, config
     ● Managers: Cannot create reviews, calibrate
     ● Employees: Cannot create goals, submit feedback
```

### 3.3 License & Subscription Management

```
[SA-03] LICENSE MANAGEMENT WORKFLOW

Super Admin
     │
     ├── View Tenant License Usage
     │   GET /api/admin/tenants/:id
     │   │
     │   ▼
     │   ┌────────────────────────────────┐
     │   │ License Dashboard Shows:       │
     │   │ ● Active Users: 47 / 50 seats │
     │   │ ● By Level: L1=10, L2=15...   │
     │   │ ● By Department: Eng=20...     │
     │   │ ● Upload History               │
     │   └────────────────────────────────┘
     │
     ├── Update License Count
     │   PATCH /api/admin/tenants/:id
     │   { licenseCount: 100 }
     │   │
     │   ▼
     │   enforceSeatLimit() recalculates
     │   │
     │   EFFECT: Tenant can now add 53 more users
     │
     ├── Change Subscription Plan
     │   PATCH /api/admin/tenants/:id
     │   { subscriptionPlan: 'ENTERPRISE', subscriptionExpiresAt: '2027-03-16' }
     │   │
     │   ▼
     │   New features unlocked:
     │   ● All 70 AI agents (was 20)
     │   ● Unlimited review cycles
     │   ● Full analytics + exports
     │   ● Custom roles + delegation
     │
     EFFECT ON OTHER USERS:
     ● Tenant Admin: See updated license count, new features available
     ● Managers: Gain access to additional features (if plan upgraded)
     ● Employees: More users can be added, AI features expanded
```

### 3.4 Security Management

```
[SA-04] SECURITY MONITORING WORKFLOW

Super Admin
     │
     ├── View Security Dashboard
     │   GET /api/admin/security
     │   │
     │   ▼
     │   ┌───────────────────────────────────────┐
     │   │ Security Alerts:                      │
     │   │ ● Brute Force: 5+ failed logins/hr   │
     │   │ ● Cross-Tenant: 3+ attempts/hr       │
     │   │ ● Bulk Deactivation: 5+ users/hr     │
     │   │ ● Suspicious AI: Unusual token usage  │
     │   └───────────────────────────────────────┘
     │
     ├── Block IP Address
     │   POST /api/admin/security/block-ip
     │   { ip: '192.168.1.100', reason: 'Brute force attempt' }
     │   │
     │   EFFECT: All requests from this IP rejected (403)
     │
     ├── Terminate Session
     │   DELETE /api/admin/security/sessions/:sessionId
     │   │
     │   EFFECT: User's JWT invalidated, forced re-login
     │
     ├── View Threat Detection
     │   GET /api/admin/security/threats
     │   │
     │   ▼
     │   Cross-tenant access attempts logged:
     │   User X (Tenant A) tried accessing Tenant B data
     │   → CROSS_TENANT_ACCESS_BLOCKED logged via auditLogger
     │
     EFFECT ON OTHER USERS:
     ● Blocked IP users: Cannot access platform
     ● Terminated session users: Must re-login
     ● Alert targets: Under monitoring
```

---

## 4. Feature Workflows with Expected Outcomes

### [SA-05] Cross-Tenant User Management

```
Workflow:
1. Super Admin searches users across ALL tenants
   GET /api/admin/users?search=john&tenantId=all

2. Views user detail with full activity
   GET /api/admin/users/:userId
   → Shows: roles, goals, reviews, login history, AI usage

3. Can deactivate/activate any user
   PATCH /api/admin/users/:userId { isActive: false }

4. Can change user roles (cross-tenant)
   POST /api/admin/users/:userId/roles { roleId: '...' }

Expected Outcomes:
● User list: Shows all users across all tenants with search/filter
● User detail: Full profile with activity timeline
● Deactivation: User immediately loses access, license seat freed
● Role change: User's permissions updated instantly

Impact on Other Users:
● Deactivated user: Cannot log in, all sessions terminated
● Role-changed user: Immediate permission changes (may lose/gain features)
● Tenant Admin: Sees updated user count in license dashboard
● Managers: Deactivated direct reports removed from team view
```

### [SA-06] Billing & Revenue Tracking

```
Workflow:
1. View revenue dashboard
   GET /api/admin/billing/overview
   → Total MRR, active subscriptions, churn rate

2. View tenant billing details
   GET /api/admin/billing/tenants/:id
   → Invoice history, payment status, usage metrics

3. Generate invoices
   POST /api/admin/billing/invoices

4. Update pricing plans
   PUT /api/admin/billing/plans/:planId

Expected Outcomes:
● Dashboard: Real-time revenue metrics across all tenants
● Invoices: Generated and tracked per tenant
● Plan changes: Reflected in tenant's feature access

Impact on Other Users:
● Plan downgrades: Features may be restricted for affected tenants
● Overdue invoices: May trigger tenant suspension
```

### [SA-07] System Configuration & Health

```
Workflow:
1. Check system health
   GET /api/admin/system/health
   → Database: OK, Redis: OK, API: OK, AI Providers: Status

2. Clear cache
   POST /api/admin/system/cache/clear
   → Redis cache flushed (session, rate-limit, AI cache reset)

3. Update global settings
   PUT /api/admin/system/config
   → Default rate limits, AI budgets, security thresholds

Expected Outcomes:
● Health check: Green/red status for all services
● Cache clear: Temporary performance degradation, then fresh data
● Config update: Platform-wide behavior change

Impact on Other Users:
● Cache clear: All users experience cold-cache latency briefly
● Config change: Rate limits, AI budgets, etc. affect all tenants
```

### [SA-08] Audit Log Review

```
Workflow:
1. View cross-tenant audit logs
   GET /api/admin/audit?startDate=2026-03-01&tenantId=all

2. Filter by action type
   GET /api/admin/audit?action=CROSS_TENANT_ACCESS_BLOCKED

3. Export audit trail
   GET /api/admin/audit/export?format=csv

Log Entry Structure:
┌─────────────────────────────────────────────────────────┐
│ Timestamp    │ Action           │ UserId │ TenantId     │
│ 2026-03-16T… │ USER_DEACTIVATED │ uuid   │ tenant-uuid  │
│ EntityType   │ EntityId         │ Metadata              │
│ USER         │ target-uuid      │ { reason: 'Policy' }  │
└─────────────────────────────────────────────────────────┘

Logged Actions Include:
● Authentication: LOGIN_SUCCESS, LOGIN_FAILED, TOKEN_REFRESH
● User Management: USER_CREATED, USER_DEACTIVATED, ROLE_ASSIGNED
● Tenant: TENANT_CREATED, TENANT_SUSPENDED, LICENSE_UPDATED
● Security: CROSS_TENANT_ACCESS_BLOCKED, IP_BLOCKED
● AI: AGENT_TASK_STARTED, AGENT_ACTION_APPROVED
● Excel: EXCEL_UPLOAD_STARTED, EXCEL_UPLOAD_COMPLETED
```

### [SA-09] Upgrade Request Management

```
Workflow:
1. View pending upgrade requests
   GET /api/admin/upgrade-requests?status=pending
   → List of tenants requesting plan upgrades

2. Review request details
   GET /api/admin/upgrade-requests/:id
   → Current plan, requested plan, justification, usage metrics

3. Approve/Reject
   POST /api/admin/upgrade-requests/:id/approve
   POST /api/admin/upgrade-requests/:id/reject

Expected Outcomes:
● Approve: Tenant plan upgraded, new features unlocked, billing updated
● Reject: Tenant notified with reason, remains on current plan

Impact on Other Users:
● Approved upgrade: Tenant Admin sees new features, all users benefit
● Rejected upgrade: No change, Tenant Admin notified
```

---

## 5. Mathematical Equations Used

The Super Admin role primarily deals with **platform metrics** rather than individual performance math. However, several calculations are relevant:

### License Utilization Rate

```
UtilizationRate = (ActiveUsers / LicenseCount) × 100

Example:
  ActiveUsers = 47, LicenseCount = 50
  UtilizationRate = 94% (near capacity)
```

### Revenue Metrics

```
MRR (Monthly Recurring Revenue) = Σ(TenantMonthlyFee)
ARR (Annual Recurring Revenue) = MRR × 12
Churn Rate = (LostTenants / TotalTenants) × 100 per period
ARPU (Average Revenue Per User) = MRR / TotalActiveUsers
```

### Security Thresholds (Alerts Service)

```
Brute Force Detection:
  failedLogins(userId, lastHour) ≥ 5  →  ALERT

Cross-Tenant Detection:
  crossTenantAttempts(userId, lastHour) ≥ 3  →  ALERT

Bulk Deactivation Detection:
  deactivations(tenantId, lastHour) ≥ 5  →  ALERT
```

### Subscription Enforcement

```
enforceSeatLimit(tenant):
  IF subscriptionStatus ≠ 'ACTIVE':
    BLOCK all write operations
  IF subscriptionExpiresAt < NOW():
    BLOCK all write operations
  IF activeUsers ≥ licenseCount:
    BLOCK new user creation
```

---

## 6. Impact on Other Users

### How Super Admin Actions Affect Each Role

| Super Admin Action | Tenant Admin Impact | Manager Impact | Employee Impact |
|--------------------|-------------------|----------------|-----------------|
| **Create Tenant** | Receives welcome email, can log in | Gets manager assignment email | N/A (no employees yet) |
| **Suspend Tenant** | All write ops blocked | Cannot create reviews/goals | Cannot submit anything |
| **Activate Tenant** | Write ops restored | Full functionality restored | Full functionality restored |
| **Increase Licenses** | Can add more users | More team members possible | N/A |
| **Decrease Licenses** | Must deactivate excess users | May lose team members | May be deactivated |
| **Upgrade Plan** | New features unlocked | Additional tools available | More AI agents, features |
| **Downgrade Plan** | Features removed | Loses advanced analytics | AI agents limited |
| **Block IP** | Cannot access from that IP | Cannot access from that IP | Cannot access from that IP |
| **Terminate Session** | Forced re-login | Forced re-login | Forced re-login |
| **Deactivate User** | N/A (if targeting admin, see note) | Loses team member | Loses account access |
| **Clear Cache** | Temporary slow loading | Temporary slow loading | Temporary slow loading |

---

## 7. Testing Segments

### [SA-01] Tenant Creation & Onboarding
**Priority:** Critical | **Est. Time:** 45 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Create tenant with all required fields | Tenant created, appears in list |
| 2 | Welcome email sent to Tenant Admin | Email received with login credentials |
| 3 | Assign designated manager | Manager receives assignment email |
| 4 | Tenant Admin can log in to web app | Login successful, dashboard shows |
| 5 | Verify tenant isolation (no cross-data) | Cannot see other tenants' data |
| 6 | Verify license count set correctly | License dashboard shows correct count |

### [SA-02] Tenant Suspension & Activation
**Priority:** Critical | **Est. Time:** 30 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Suspend active tenant | Status changes to SUSPENDED |
| 2 | Verify write operations blocked | All POST/PUT/DELETE return 403 |
| 3 | Verify read operations still work | GET endpoints return data |
| 4 | Activate suspended tenant | Status changes to ACTIVE |
| 5 | Verify write operations restored | POST/PUT/DELETE succeed again |
| 6 | Audit log entries created | Suspension/activation logged |

### [SA-03] License Management
**Priority:** High | **Est. Time:** 30 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View license usage for tenant | Shows active/total/by-level/by-dept |
| 2 | Increase license count | Tenant can add more users |
| 3 | Decrease below active users | Error: cannot reduce below active count |
| 4 | Update subscription plan | Features updated per plan |
| 5 | Set subscription expiry | After expiry, writes blocked |
| 6 | Excel upload respects seat limit | Upload blocked if exceeds license |

### [SA-04] Security Management
**Priority:** Critical | **Est. Time:** 45 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View security alerts dashboard | Shows recent alerts by type |
| 2 | Trigger brute force (5+ failed logins) | Alert generated |
| 3 | Block IP address | Requests from IP return 403 |
| 4 | Unblock IP address | Requests from IP succeed |
| 5 | Terminate user session | User forced to re-login |
| 6 | Cross-tenant access attempt | CROSS_TENANT_ACCESS_BLOCKED logged |
| 7 | Bulk deactivation alert | Alert triggered at 5+ deactivations/hr |

### [SA-05] Cross-Tenant User Management
**Priority:** High | **Est. Time:** 30 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Search users across all tenants | Returns matching users from all tenants |
| 2 | View user detail (cross-tenant) | Full profile + activity shown |
| 3 | Deactivate user from different tenant | User loses access, seat freed |
| 4 | Change user role (cross-tenant) | Permissions updated immediately |
| 5 | Verify audit logging | All actions logged with SA user ID |

### [SA-06] Billing & Revenue
**Priority:** Medium | **Est. Time:** 20 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View revenue dashboard | MRR, ARR, tenant count displayed |
| 2 | View tenant billing detail | Invoice history, payment status |
| 3 | Update subscription pricing | New price reflected for new invoices |
| 4 | Generate invoice for tenant | Invoice created and accessible |

### [SA-07] System Configuration
**Priority:** Medium | **Est. Time:** 20 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Check system health | All services show OK/ERROR status |
| 2 | Clear Redis cache | Cache cleared, cold-cache latency |
| 3 | Update global rate limit config | New limits take effect |
| 4 | Update AI budget defaults | New defaults for tenant AI usage |

### [SA-08] Audit Log Review
**Priority:** High | **Est. Time:** 20 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View cross-tenant audit logs | All actions across all tenants |
| 2 | Filter by action type | Only matching actions shown |
| 3 | Filter by date range | Only actions in range shown |
| 4 | Filter by tenant | Only that tenant's actions |
| 5 | Export audit trail | CSV/JSON download |

### [SA-09] Upgrade Request Processing
**Priority:** Medium | **Est. Time:** 15 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View pending upgrade requests | List of requests with details |
| 2 | Approve upgrade request | Tenant plan upgraded, features unlocked |
| 3 | Reject upgrade request | Tenant notified, plan unchanged |
| 4 | Audit log entry created | Approval/rejection logged |

### [SA-10] Super Admin Authentication
**Priority:** Critical | **Est. Time:** 20 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Login to admin portal | Separate auth context, SA session created |
| 2 | Rate limiting on auth endpoint | Blocked after N failed attempts |
| 3 | JWT token contains SA scope | Token has platform-wide permissions |
| 4 | Session management | Can view/terminate own sessions |
| 5 | Logout properly clears session | Session invalidated in DB |

### [SA-11] Admin Portal UI
**Priority:** Medium | **Est. Time:** 30 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Dashboard loads with metrics | Tenant count, user count, revenue |
| 2 | Tenant list with search/filter | Paginated, searchable list |
| 3 | Tenant detail page | Full metrics, users, config visible |
| 4 | User list with cross-tenant search | Search returns users from all tenants |
| 5 | Navigation between all pages | All routes accessible, no 404s |

### [SA-12] Edge Cases & Error Handling
**Priority:** Medium | **Est. Time:** 20 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Create tenant with duplicate domain | Error: domain already exists |
| 2 | Suspend already suspended tenant | No-op or appropriate error |
| 3 | Delete tenant with active users | Requires confirmation, cascade handling |
| 4 | Set license count to 0 | Error or appropriate handling |
| 5 | Non-SA user access /api/admin | 403 Forbidden |

---

### Testing Timeline Summary

```
[SA-01] Tenant Creation          ██████████  45 min  CRITICAL
[SA-02] Suspension/Activation    ██████      30 min  CRITICAL
[SA-03] License Management       ██████      30 min  HIGH
[SA-04] Security Management      ██████████  45 min  CRITICAL
[SA-05] User Management          ██████      30 min  HIGH
[SA-06] Billing                  ████        20 min  MEDIUM
[SA-07] System Config            ████        20 min  MEDIUM
[SA-08] Audit Logs               ████        20 min  HIGH
[SA-09] Upgrade Requests         ███         15 min  MEDIUM
[SA-10] Authentication           ████        20 min  CRITICAL
[SA-11] Admin Portal UI          ██████      30 min  MEDIUM
[SA-12] Edge Cases               ████        20 min  MEDIUM
                                 ─────────────────
                                 Total: ~5.5 hours
```

---

> **Dependency:** Super Admin workflows (SA-01 Tenant Creation) must complete before Tenant Admin testing can begin.
>
> **Next:** `03_TENANT_ADMIN_WORKFLOW.md` - Tenant Admin & Manager workflow
