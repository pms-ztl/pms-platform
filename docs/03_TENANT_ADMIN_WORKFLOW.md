# PMS Platform - Tenant Admin & Manager Workflow & Testing Segments

> **Roles Covered:** Tenant Admin (TENANT_ADMIN / ADMIN) + HR Admin (HR_ADMIN) + Manager (MANAGER)
> **Scope:** Tenant-wide (Tenant Admin/HR Admin) or Team scope (Manager)
> **App:** Web App (`apps/web/`)
> **API Base:** `/api/v1/`

---

## Table of Contents

1. [Role Overview & Hierarchy](#1-role-overview--hierarchy)
2. [Feature Map & Access Matrix](#2-feature-map--access-matrix)
3. [Workflow Diagrams](#3-workflow-diagrams)
4. [Feature Workflows with Expected Outcomes](#4-feature-workflows-with-expected-outcomes)
5. [Mathematical Equations Used](#5-mathematical-equations-used)
6. [Impact on Other Users](#6-impact-on-other-users)
7. [Testing Segments](#7-testing-segments)

---

## 1. Role Overview & Hierarchy

```
┌──────────────────────────────────────────────────────────────────┐
│                    TENANT ADMIN                                   │
│                    (Organization Owner)                            │
│                                                                   │
│  Full control of ONE tenant:                                      │
│  ● User management (create, deactivate, roles)                    │
│  ● Configuration (settings, features, policies)                   │
│  ● License & subscription management                              │
│  ● Review cycle creation & management                             │
│  ● All analytics & reporting                                      │
│  ● AI agent administration                                        │
│  ● Audit log access                                               │
│  ● Excel bulk upload                                              │
├──────────────────────────────────────────────────────────────────┤
│                    HR ADMIN                                        │
│                    (HR Department Head)                            │
│                                                                   │
│  Same features as Tenant Admin but:                               │
│  ● Typically assigned to HR leadership                            │
│  ● Focus on people operations                                     │
│  ● Succession planning, compliance                                │
│  ● Talent intelligence, culture diagnostics                       │
├──────────────────────────────────────────────────────────────────┤
│                    MANAGER                                         │
│                    (Team Lead / Direct Supervisor)                 │
│                                                                   │
│  Team-scoped access:                                              │
│  ● Direct reports management                                      │
│  ● Team goals, reviews, feedback                                  │
│  ● Calibration participation                                      │
│  ● Performance analytics (team view)                              │
│  ● Excel upload for team                                          │
│  ● PIP creation for direct reports                                │
│  ● 1-on-1 scheduling with reports                                 │
│  ● Delegation management                                          │
└──────────────────────────────────────────────────────────────────┘
```

### Scope Differences

| Feature Area | Tenant Admin | HR Admin | Manager |
|-------------|-------------|----------|---------|
| User Management | All users in tenant | All users in tenant | Direct reports only |
| Analytics | Tenant-wide | Tenant-wide | Team only |
| Review Cycles | Create & manage | Create & manage | Participate only |
| Calibration | Create sessions | Create sessions | Participate |
| Excel Upload | Tenant-wide | Tenant-wide | Team upload |
| PIP | All employees | All employees | Direct reports |
| Succession | Full access | Full access | No access |
| Compliance | Full access | Full access | No access |
| Config/Settings | Full access | Full access | No access |
| AI Insights | Full access | Full access | Team insights only |
| Delegations | Create/manage | Create/manage | Create/manage |

---

## 2. Feature Map & Access Matrix

### Tenant Admin & HR Admin Exclusive Features

| # | Feature | Route | API Endpoint |
|---|---------|-------|-------------|
| 1 | **User Management** | `/admin/users` | `GET/POST/PUT/DELETE /api/v1/users` |
| 2 | **Role Management** | `/admin/roles` | `GET/POST/PUT/DELETE /api/v1/roles` |
| 3 | **License Dashboard** | `/admin/licenses` | `GET /api/v1/users/breakdown` |
| 4 | **AI Access Control** | `/admin/ai-access` | `PUT /api/v1/users/:id/ai-access` |
| 5 | **Tenant Config** | `/admin/config` | `GET/PUT /api/v1/admin-config` |
| 6 | **Audit Logs** | `/admin/audit` | `GET /api/v1/audit` |
| 7 | **Access Policies** | `/admin/policies` | `CRUD /api/v1/policies` |
| 8 | **RBAC Dashboard** | `/admin/rbac-dashboard` | Various RBAC endpoints |
| 9 | **Subscription Upgrade** | `/admin/upgrade` | `POST /api/v1/upgrade-requests` |
| 10 | **HR Analytics** | `/hr-analytics` | `GET /api/v1/analytics/hr/*` |
| 11 | **Succession Planning** | `/succession` | `CRUD /api/v1/succession` |
| 12 | **Compliance** | `/compliance` | `GET /api/v1/compliance` |
| 13 | **Skill Gaps** | `/skill-gaps` | `GET /api/v1/skills/gaps` |
| 14 | **AI Insights** | `/ai-insights` | `GET /api/v1/ai-insights/*` |
| 15 | **Talent Intelligence** | `/talent-intelligence` | `GET /api/v1/talent-intelligence` |
| 16 | **Team Optimizer** | `/team-optimizer` | `GET /api/v1/team-optimizer` |
| 17 | **Culture Diagnostics** | `/culture-diagnostics` | `GET /api/v1/culture-diagnostics` |

### Manager + Admin Shared Features

| # | Feature | Route | API Endpoint |
|---|---------|-------|-------------|
| 1 | **Manager Dashboard** | `/manager-dashboard` | `GET /api/v1/analytics/dashboard` |
| 2 | **Team Management** | `/team` | `GET /api/v1/users/direct-reports` |
| 3 | **Review Cycles** | `/review-cycles` | `CRUD /api/v1/reviews/cycles` |
| 4 | **Calibration** | `/calibration` | `CRUD /api/v1/calibration` |
| 5 | **Analytics** | `/analytics` | `GET /api/v1/analytics/*` |
| 6 | **Reports** | `/reports` | `CRUD /api/v1/reports` |
| 7 | **Real-time Dashboard** | `/realtime` | `GET /api/v1/realtime-performance` |
| 8 | **PIP** | `/pip` | `CRUD /api/v1/pip` |
| 9 | **Compensation** | `/compensation` | `GET /api/v1/compensation` |
| 10 | **Promotions** | `/promotions` | `GET /api/v1/promotions` |
| 11 | **Excel Upload** | `/admin/excel-upload` | `POST /api/v1/excel-upload` |
| 12 | **Delegations** | `/admin/delegations` | `CRUD /api/v1/delegations` |
| 13 | **Wellbeing** | `/wellbeing` | `GET /api/v1/health-metrics` |
| 14 | **Meeting Analytics** | `/meeting-analytics` | `GET /api/v1/meeting-analytics` |
| 15 | **Anomalies** | `/anomalies` | `GET /api/v1/ai-insights/anomalies` |
| 16 | **Benchmarks** | `/benchmarks` | `GET /api/v1/ai-insights/benchmarks` |
| 17 | **Engagement** | `/engagement` | `GET /api/v1/engagement` |
| 18 | **Health Dashboard** | `/health-dashboard` | `GET /api/v1/health-metrics` |

---

## 3. Workflow Diagrams

### 3.1 Employee Onboarding (Tenant Admin)

```
[TA-01] EMPLOYEE ONBOARDING WORKFLOW

Tenant Admin
     │
     ├── Option A: Individual Creation
     │   POST /api/v1/users
     │   { email, name, level, departmentId, managerId, roles }
     │   │
     │   ├── enforceSeatLimit() check ──── FAIL → "License limit reached"
     │   │                                         Contact Super Admin
     │   ├── Create User record
     │   ├── Assign roles (UserRole)
     │   ├── Send set-password email
     │   └── Audit: USER_CREATED
     │
     ├── Option B: Excel Bulk Upload
     │   POST /api/v1/excel-upload/analyze
     │   (Upload Excel file with employee data)
     │   │
     │   ├── Phase 1: ANALYZE
     │   │   ├── Validate format
     │   │   ├── Check license capacity
     │   │   ├── Validate departments, levels, managers
     │   │   ├── Detect duplicates
     │   │   ├── AI-enhanced validation (if enabled)
     │   │   └── Return: preview + errors + warnings
     │   │
     │   ├── Phase 2: CONFIRM
     │   │   POST /api/v1/excel-upload/confirm
     │   │   ├── Create all valid users
     │   │   ├── Assign roles
     │   │   ├── Send bulk set-password emails
     │   │   ├── Update license usage
     │   │   └── Audit: EXCEL_UPLOAD_COMPLETED
     │   │
     │   └── Track history
     │       GET /api/v1/excel-upload/history
     │
     EFFECT ON OTHER USERS:
     ● New Employee: Receives set-password email, can log in
     ● Assigned Manager: Sees new direct report in team view
     ● Org Chart: Updated with new employee
     ● License Dashboard: Updated seat count
```

### 3.2 Review Cycle Management (Tenant Admin / HR Admin)

```
[TA-02] REVIEW CYCLE WORKFLOW

Tenant Admin / HR Admin
     │
     ├── 1. Create Review Cycle
     │   POST /api/v1/reviews/cycles
     │   { name, type, startDate, endDate, participants }
     │   │
     │   └── Status: DRAFT
     │
     ├── 2. Configure Cycle
     │   PUT /api/v1/reviews/cycles/:id
     │   ├── Set review type (ANNUAL, QUARTERLY, 360_DEGREE, etc.)
     │   ├── Assign reviewers to reviewees
     │   ├── Set deadlines
     │   └── Configure rating scale
     │
     ├── 3. Launch Cycle
     │   POST /api/v1/reviews/cycles/:id/launch
     │   │
     │   ├── Status: ACTIVE
     │   ├── Notifications sent to ALL participants
     │   ├── Reviews created for each reviewer-reviewee pair
     │   └── Deadlines tracked
     │
     ├── 4. Monitor Progress
     │   GET /api/v1/reviews/cycles/:id/stats
     │   │
     │   ├── Completion rate: X% (reviews submitted / total)
     │   ├── By department breakdown
     │   ├── By level breakdown
     │   ├── Overdue reviews count
     │   └── Timeline visualization
     │
     ├── 5. Advance Status
     │   POST /api/v1/reviews/cycles/:id/advance
     │   │
     │   Status Flow:
     │   DRAFT → ACTIVE → IN_REVIEW → CALIBRATION → COMPLETED
     │
     └── 6. Post-Cycle
         ├── Calibration sessions (see [TA-04])
         ├── Performance scores calculated
         ├── CPIS updated for all participants
         └── Reports generated

     EFFECT ON OTHER USERS:
     ● Managers: Receive notification to review direct reports
     ● Employees: See pending reviews in dashboard, submit self-reviews
     ● Reviewers: Must complete reviews before deadline
     ● All Participants: Performance scores updated after cycle completion
```

### 3.3 Goal Cascade & Alignment (Tenant Admin / Manager)

```
[TA-03] GOAL CASCADE WORKFLOW

Tenant Admin / Manager
     │
     ├── 1. Create Organizational Goals
     │   POST /api/v1/goals
     │   { title, priority: 'CRITICAL', weight: 3, dueDate, alignedToId: null }
     │   │
     │   └── Top-level org goal (no parent)
     │
     ├── 2. Cascade to Department Goals
     │   POST /api/v1/goals
     │   { title, alignedToId: orgGoalId, priority: 'HIGH' }
     │   │
     │   └── Aligned to org goal (alignment depth = 1)
     │
     ├── 3. Manager Creates Team Goals
     │   POST /api/v1/goals
     │   { title, alignedToId: deptGoalId, userId: managerId }
     │   │
     │   └── Alignment depth = 2
     │
     ├── 4. View Goal Tree
     │   GET /api/v1/goals/tree
     │   │
     │   ┌──────────────────────────────────────────┐
     │   │ Org Goal: "Increase Revenue 20%"         │
     │   │   ├── Dept Goal: "Launch 3 New Products" │
     │   │   │   ├── Team Goal: "Ship Feature X"    │
     │   │   │   │   ├── Employee: "Design UI"      │
     │   │   │   │   └── Employee: "Build API"      │
     │   │   │   └── Team Goal: "QA Automation"     │
     │   │   └── Dept Goal: "Reduce Churn to <5%"   │
     │   └──────────────────────────────────────────┘
     │
     └── 5. Track Alignment Impact
         │
         Alignment Bonus in CPIS GAI dimension:
         Aᵢ = 1 + (alignmentDepth × 0.03), max 1.15
         │
         Depth 0 (standalone): 1.00 (no bonus)
         Depth 1 (aligned to dept): 1.03 (+3%)
         Depth 2 (aligned to org): 1.06 (+6%)
         Depth 3+: capped at 1.15 (+15%)

     EFFECT ON OTHER USERS:
     ● Employees: See aligned goals in goal tree, alignment bonus in CPIS
     ● Other Managers: See cross-team alignment
     ● Analytics: Goal alignment metrics updated
```

### 3.4 Calibration Session (Tenant Admin / HR Admin)

```
[TA-04] CALIBRATION WORKFLOW

Tenant Admin / HR Admin
     │
     ├── 1. Create Calibration Session
     │   POST /api/v1/calibration/sessions
     │   { name, reviewCycleId, participants: [managerIds] }
     │   │
     │   └── Status: PENDING
     │
     ├── 2. Start Session
     │   POST /api/v1/calibration/sessions/:id/start
     │   │
     │   ├── Status: ACTIVE
     │   ├── Load all reviews from cycle
     │   └── Managers can view & adjust
     │
     ├── 3. Managers Review Ratings
     │   GET /api/v1/calibration/sessions/:id/ratings
     │   │
     │   ┌────────────────────────────────────────────┐
     │   │ Original Rating │ Calibrated │ Adjustment   │
     │   │ Employee A: 4.5 │    4.2     │   -0.3       │
     │   │ Employee B: 3.0 │    3.4     │   +0.4       │
     │   │ Employee C: 5.0 │    4.5     │   -0.5       │
     │   └────────────────────────────────────────────┘
     │
     ├── 4. Mathematical Calibration
     │   (Auto-calculated using Z-Score Normalization)
     │   │
     │   For each reviewer:
     │   │
     │   │  IF reviewerStdDev = 0 OR samples < 3:
     │   │    calibrated = rating - (reviewerMean - globalMean)
     │   │  ELSE:
     │   │    z = (rating - reviewerMean) / reviewerStdDev
     │   │    calibrated = z × globalStdDev + globalMean
     │   │    clamped to [1, 5]
     │   │
     │   Result: Removes "easy grader" vs "tough grader" effects
     │
     ├── 5. Adjust Ratings (Evidence-Based)
     │   POST /api/v1/calibration/sessions/:id/adjust
     │   { reviewId, newRating, reason }
     │   │
     │   └── Audit: CALIBRATION_ADJUSTMENT
     │
     └── 6. Complete Session
         POST /api/v1/calibration/sessions/:id/complete
         │
         ├── Calibrated ratings saved
         ├── CPIS RQS dimension updated for affected employees
         └── Performance scores recalculated

     EFFECT ON OTHER USERS:
     ● Employees: Final performance ratings may change after calibration
     ● Managers: See calibrated vs original ratings
     ● CPIS: RQS dimension recalculated with calibrated ratings
```

### 3.5 User & Role Management (Tenant Admin)

```
[TA-05] USER & ROLE MANAGEMENT WORKFLOW

Tenant Admin
     │
     ├── User Management
     │   │
     │   ├── Create User ─────────── enforceSeatLimit() check
     │   ├── Deactivate User ─────── Frees license seat
     │   │                           Audit: USER_DEACTIVATED
     │   ├── Archive User ────────── Soft delete, frees seat
     │   ├── Update User ─────────── Change dept, level, manager
     │   ├── Upload Avatar ────────── Profile picture
     │   └── View Org Chart ───────── Hierarchical visualization
     │
     ├── Role Management
     │   │
     │   ├── Create Custom Role
     │   │   POST /api/v1/roles
     │   │   { name, category: 'MANAGER', permissions: ['goals:read:team', ...] }
     │   │
     │   ├── Assign Role to User
     │   │   POST /api/v1/users/:userId/roles
     │   │   { roleId, expiresAt? }  (time-bound possible)
     │   │
     │   ├── Remove Role
     │   │   DELETE /api/v1/users/:userId/roles/:roleId
     │   │
     │   └── View Role Assignments
     │       GET /api/v1/roles/:id/users
     │
     ├── Access Policies (ABAC)
     │   │
     │   ├── Create Policy
     │   │   POST /api/v1/policies
     │   │   {
     │   │     name: 'HR Only - Salary Data',
     │   │     effect: 'DENY',
     │   │     resource: 'compensation',
     │   │     action: 'read',
     │   │     conditions: { targetRoles: ['EMPLOYEE'], targetDepts: ['*'] },
     │   │     priority: 100
     │   │   }
     │   │
     │   └── Result: Employees cannot view salary data
     │
     └── Delegation Management
         │
         ├── Create Delegation
         │   POST /api/v1/delegations
         │   {
         │     delegatorId: managerId,
         │     delegateeId: seniorEmployeeId,
         │     type: 'ACTING_MANAGER',
         │     startDate, endDate
         │   }
         │
         └── Result: Delegatee gains Manager permissions temporarily
             (evaluated by checkResourceAccessAsync in authorize.ts)

     EFFECT ON OTHER USERS:
     ● New roles: User gains/loses feature access immediately
     ● Custom role: All users with that role affected
     ● ABAC policy: Affects all users matching conditions
     ● Delegation: Delegatee gains temporary elevated access
```

### 3.6 Performance Analytics (Admin / Manager)

```
[TA-06] ANALYTICS WORKFLOW

Tenant Admin / HR Admin / Manager
     │
     ├── Dashboard Metrics
     │   GET /api/v1/analytics/dashboard
     │   │
     │   ┌─────────────────────────────────────┐
     │   │ Role-Adaptive Dashboard:             │
     │   │                                      │
     │   │ TENANT ADMIN sees:                   │
     │   │ ● Org-wide performance distribution  │
     │   │ ● Total active review cycles         │
     │   │ ● License utilization                │
     │   │ ● AI usage across org                │
     │   │                                      │
     │   │ MANAGER sees:                        │
     │   │ ● Team performance distribution      │
     │   │ ● Direct reports' goal completion    │
     │   │ ● License usage widget               │
     │   │ ● Recent upload history              │
     │   └─────────────────────────────────────┘
     │
     ├── Performance Distribution
     │   GET /api/v1/analytics/performance-distribution
     │   │
     │   Rating Spread Analysis:
     │   ★★★★★ (5): 12%  ████
     │   ★★★★  (4): 35%  ████████████
     │   ★★★   (3): 38%  █████████████
     │   ★★    (2): 12%  ████
     │   ★     (1):  3%  █
     │   │
     │   Shannon Entropy: 0.78 (0=all same, 1=perfectly uniform)
     │   Gini Coefficient: 0.15 (low inequality)
     │
     ├── Goal Trends
     │   GET /api/v1/analytics/goal-trends
     │   │
     │   ├── Completion rate over time (line chart)
     │   ├── On-time delivery rate
     │   ├── By priority breakdown
     │   └── Risk distribution (CRITICAL/HIGH/MEDIUM/LOW)
     │
     ├── Bias Detection
     │   GET /api/v1/analytics/bias-metrics
     │   │
     │   ├── Detected bias types (12 categories)
     │   ├── Per-reviewer bias patterns
     │   ├── Department-level fairness scores
     │   └── Disparate impact analysis
     │   │
     │   Disparate Impact (4/5ths Rule):
     │   IF groupScore / referenceGroupScore < 0.80
     │     → FLAG: Potential adverse impact detected
     │
     └── Report Generation
         POST /api/v1/reports
         │
         ├── Performance Summary Report
         ├── Goal Progress Report
         ├── Review Completion Report
         ├── Bias Analysis Report
         ├── Team Analytics Report
         └── Custom Report (scheduled via cron)

     EFFECT ON OTHER USERS:
     ● Employees: Analytics about them are aggregated (anonymized in some views)
     ● Other Managers: Can benchmark against other teams
     ● HR: Gets org-wide perspective for strategic decisions
```

### 3.7 PIP Management (Admin / Manager)

```
[TA-07] PIP (Performance Improvement Plan) WORKFLOW

Manager / HR Admin
     │
     ├── 1. Identify Underperformer
     │   (CPIS score < 35 = "Needs Support" rank)
     │   (Performance anomaly detected by AI)
     │
     ├── 2. Create PIP
     │   POST /api/v1/pip
     │   {
     │     employeeId, reason, duration: 90,
     │     milestones: [
     │       { title: 'Complete training', dueDate: '...' },
     │       { title: 'Achieve 70% goal completion', dueDate: '...' },
     │       { title: 'Receive 3+ positive feedback', dueDate: '...' }
     │     ]
     │   }
     │   │
     │   └── Status: ACTIVE
     │
     ├── 3. Employee Acknowledgment
     │   POST /api/v1/pip/:id/acknowledge
     │   │
     │   └── Employee confirms receipt
     │
     ├── 4. Regular Check-ins
     │   POST /api/v1/pip/:id/checkins
     │   { progress, notes, managerFeedback }
     │   │
     │   └── Tracked milestone completion
     │
     ├── 5. HR Approval (for closure)
     │   POST /api/v1/pip/:id/approve
     │   │
     │   └── HR reviews overall progress
     │
     └── 6. Resolution
         POST /api/v1/pip/:id/close
         { outcome: 'COMPLETED_SUCCESSFULLY' | 'EXTENDED' | 'TERMINATED' }

     EFFECT ON OTHER USERS:
     ● Employee: Sees PIP in dashboard, must acknowledge, attend check-ins
     ● Manager: Tracks PIP progress, provides regular feedback
     ● HR Admin: Reviews and approves PIP outcomes
     ● CPIS: PIP participation may affect consistency dimension
```

### 3.8 AI Agent Administration (Tenant Admin)

```
[TA-08] AI ADMINISTRATION WORKFLOW

Tenant Admin
     │
     ├── Enable/Disable AI Access Per User
     │   PUT /api/v1/users/:id/ai-access
     │   { aiAccessEnabled: true/false }
     │
     ├── View AI Usage Stats
     │   GET /api/v1/ai/usage
     │   │
     │   ┌────────────────────────────────────┐
     │   │ 30-Day Rolling Window:             │
     │   │ Total conversations: 234           │
     │   │ Total tokens used: 1.2M            │
     │   │ Total cost: $18.50 (₹1,701)        │
     │   │ Avg tokens/conversation: 5,128     │
     │   │ Most active agent: help_assistant   │
     │   │ By provider: Claude 60%, Gemini 40%│
     │   └────────────────────────────────────┘
     │
     ├── Review Pending Approvals
     │   GET /api/v1/ai/actions/pending
     │   │
     │   ├── Action: "Create PIP for Employee X"
     │   │   Impact: HIGH_WRITE
     │   │   Agent: performance_signal
     │   │   Reasoning: "CPIS score dropped below 35..."
     │   │
     │   └── APPROVE / REJECT
     │
     ├── Monitor Active Agents
     │   GET /api/v1/ai/agents/active
     │   │
     │   └── Live feed of executing agent tasks (top 20)
     │
     └── Configure AI Budget
         PUT /api/v1/admin-config
         { aiMonthlyBudget: 100, aiMaxTokensPerTask: 50000 }

     EFFECT ON OTHER USERS:
     ● Employees with AI disabled: Cannot access AI chat/agents
     ● All users: Budget limits may throttle AI usage
     ● Approved actions: Execute autonomously (goal creation, PIP, etc.)
     ● Rejected actions: Cancelled, user notified
```

### 3.9 Excel Bulk Upload (Admin / Manager)

```
[TA-09] EXCEL UPLOAD WORKFLOW

Tenant Admin / Manager
     │
     ├── 1. Download Template
     │   GET /api/v1/excel-upload/template
     │   → Excel template with required columns
     │
     ├── 2. Upload & Analyze
     │   POST /api/v1/excel-upload/analyze
     │   │
     │   ├── Subscription check (must be active)
     │   ├── License capacity check
     │   ├── Format validation
     │   ├── Data validation (email format, dept exists, etc.)
     │   ├── AI-enhanced validation (optional)
     │   │
     │   ├── Return: Preview
     │   │   ┌────────────────────────────────────┐
     │   │   │ Valid rows: 45                     │
     │   │   │ Errors: 3 (invalid email format)   │
     │   │   │ Warnings: 2 (duplicate emails)     │
     │   │   │ License remaining: 5 seats         │
     │   │   │ Will use: 45 seats                 │
     │   │   │ Status: EXCEEDS LICENSE (need 40+) │
     │   │   └────────────────────────────────────┘
     │   │
     │   └── Audit: EXCEL_UPLOAD_STARTED
     │
     ├── 3. Confirm Upload
     │   POST /api/v1/excel-upload/confirm
     │   │
     │   ├── Create users from valid rows
     │   ├── Send set-password emails
     │   ├── Assign roles
     │   ├── Update license count
     │   └── Audit: EXCEL_UPLOAD_COMPLETED
     │
     └── 4. View History
         GET /api/v1/excel-upload/history
         │
         └── Past uploads: date, count, errors, status

     EFFECT ON OTHER USERS:
     ● New employees: Receive set-password emails
     ● Managers: See new direct reports
     ● License: Seats consumed
     ● Org chart: Updated
```

---

## 4. Feature Workflows with Expected Outcomes

### [TA-10] Team Performance View (Manager)

```
Manager
     │
     ├── View Team Dashboard
     │   GET /api/v1/users/direct-reports
     │   GET /api/v1/performance-math/team-analytics
     │   │
     │   ┌──────────────────────────────────────────────┐
     │   │ TEAM ANALYTICS                               │
     │   │                                              │
     │   │ Team Average: 72.5                           │
     │   │ Score Spread (StdDev): 12.3                  │
     │   │ Rating Entropy: 0.82 (good differentiation)  │
     │   │ Gini: 0.18 (low inequality)                  │
     │   │ Velocity Trend: +2.5/period (improving)      │
     │   │                                              │
     │   │ Member Z-Scores:                             │
     │   │ ● Alice:  +1.5 (HIGH performer)              │
     │   │ ● Bob:    +0.3 (AVERAGE)                     │
     │   │ ● Carol:  -0.2 (AVERAGE)                     │
     │   │ ● Dave:   -1.8 (LOW - needs attention)       │
     │   └──────────────────────────────────────────────┘
     │
     │   Mathematical Formulas Used:
     │   ● Team Average: mean(memberScores)
     │   ● Score Spread: standardDeviation(scores)
     │   ● Rating Entropy: shannonEntropy(ratingBuckets) normalized to [0,1]
     │   ● Gini: (2×Σ(i×xᵢ))/(n×Σxᵢ) - (n+1)/n
     │   ● Velocity: linearRegression(historical).slope
     │   ● Z-Scores: (score - teamMean) / teamStdDev
     │
     └── Actions Based on Data:
         ├── High performers → Promotion consideration
         ├── Low performers → PIP / coaching
         └── Velocity trend → Strategic decisions
```

### [TA-11] CPIS Review (Admin / HR)

```
Tenant Admin / HR Admin
     │
     ├── View Employee CPIS
     │   GET /api/v1/performance-math/cpis/:userId
     │   │
     │   ┌──────────────────────────────────────────────────┐
     │   │ CPIS SCORE: 72.5 | Grade: B | ★★★★ | "Strong"  │
     │   │                                                  │
     │   │ Dimension Breakdown:                             │
     │   │ D1 GAI (25%): 78 ████████████████████            │
     │   │ D2 RQS (20%): 80 ████████████████████████        │
     │   │ D3 FSI (12%): 72 ██████████████████              │
     │   │ D4 CIS (10%): 65 ████████████████                │
     │   │ D5 CRI (10%): 72 ██████████████████              │
     │   │ D6 GTS  (8%): 58 ██████████████                  │
     │   │ D7 EQS  (8%): 50 ████████████                    │
     │   │ D8 III  (7%): 35 ████████                        │
     │   │                                                  │
     │   │ Fairness:                                        │
     │   │ ● Bias detected: No                              │
     │   │ ● Disparate impact ratio: 1.01 (OK)             │
     │   │ ● Confidence: 0.76 (Good)                       │
     │   │ ● Bounds: [67.5, 77.5]                          │
     │   │                                                  │
     │   │ Trajectory: Improving (+2.5/period)              │
     │   │ Strengths: Reviews, Goals                        │
     │   │ Growth Areas: Initiative, Evidence               │
     │   │                                                  │
     │   │ Formula:                                         │
     │   │ GAI(78)×0.25 + RQS(80)×0.20 + FSI(72)×0.12    │
     │   │ + CIS(65)×0.10 + CRI(72)×0.10 + GTS(58)×0.08  │
     │   │ + EQS(50)×0.08 + III(35)×0.07                  │
     │   │ × TenureFactor(1.0125) + FairnessAdj(0)        │
     │   │ = 72.5                                          │
     │   └──────────────────────────────────────────────────┘
     │
     └── Use CPIS for Decisions:
         ├── Promotions: CPIS ≥ 85 + 2+ review cycles
         ├── PIP: CPIS < 35 sustained over 2+ periods
         ├── Compensation: CPIS percentile-based bonus tiers
         └── Succession: Top CPIS in department → ready pool
```

### [TA-12] Succession Planning (HR Admin)

```
HR Admin
     │
     ├── View Succession Plans
     │   GET /api/v1/succession
     │
     ├── Nine-Box Grid
     │   GET /api/v1/succession/nine-box
     │   │
     │   ┌───────────────────────────────────────────────┐
     │   │            NINE-BOX GRID                       │
     │   │                                                │
     │   │ High     │ Enigma    │ Growth Star│ Consistent │
     │   │ Potential│           │            │ Star       │
     │   │          │           │     ●●     │     ●      │
     │   │ ─────────┼───────────┼────────────┼──────────  │
     │   │ Medium   │ Dilemma   │ Core       │ High       │
     │   │ Potential│           │ Player     │ Performer  │
     │   │          │    ●      │   ●●●●●    │    ●●●     │
     │   │ ─────────┼───────────┼────────────┼──────────  │
     │   │ Low      │ Risk      │ Average    │ Workhouse  │
     │   │ Potential│           │ Performer  │            │
     │   │          │    ●      │    ●●      │            │
     │   │          │           │            │            │
     │   │          │  Low      │  Medium    │  High      │
     │   │          │        Performance →                │
     │   └───────────────────────────────────────────────┘
     │
     │   Grid placement uses:
     │   ● X-axis (Performance): CPIS score percentile
     │   ● Y-axis (Potential): Growth trajectory + skills growth + dev plan progress
     │
     └── Create Successor Plan
         POST /api/v1/succession
         {
           positionId, incumbentId,
           successors: [
             { userId, readiness: 'READY_NOW', devGaps: ['leadership'] },
             { userId, readiness: 'READY_1_YEAR', devGaps: ['strategic_planning'] }
           ]
         }

     EFFECT ON OTHER USERS:
     ● Successors: May see career path recommendations
     ● Managers: See succession readiness for key positions
     ● Development plans: Auto-generated for successor gap closure
```

### [TA-13] Compensation & Promotion Analysis

```
HR Admin / Tenant Admin
     │
     ├── View Compensation Analysis
     │   GET /api/v1/compensation/analysis
     │   │
     │   ├── Pay equity metrics by department/level/gender
     │   ├── Compa-ratio distribution (actual vs market)
     │   └── Budget utilization
     │
     ├── View Promotion Pipeline
     │   GET /api/v1/promotions
     │   │
     │   ├── Eligible employees (CPIS ≥ 85 + tenure ≥ 1yr)
     │   ├── Pending promotions
     │   └── Promotion history
     │
     └── CPIS-Driven Decisions:
         │
         ● Star Rating ≥ 4 + Rank "High Achiever"+ → Promotion eligible
         ● Percentile ≥ 90th → Fast-track candidate
         ● Grade A+ (≥95) → "Exceptional Performer" bonus tier
         ● Grade C or below → Performance improvement consideration

     EFFECT ON OTHER USERS:
     ● Promoted employees: Level change, salary update, new permissions
     ● Team: Reporting structure may change
     ● Compensation: Budget allocation affects raises for others
```

---

## 5. Mathematical Equations Used

### Equations by Feature Area

| Feature | Equation | Purpose |
|---------|----------|---------|
| **Goal Scoring** | `CS = (0.50×Completion + 0.30×Quality + 0.20×Timeliness) × Efficiency` | Composite goal score |
| **Goal Risk** | `0.40×Schedule + 0.30×Velocity + 0.15×Dependency + 0.15×Complexity` | Predict goal failure |
| **Review Calibration** | `z = (rating - μ_reviewer) / σ_reviewer; calibrated = z × σ_global + μ_global` | Remove reviewer bias |
| **Reviewer Trust** | `trust = (volumeFactor × 0.6 + consistencyFactor × 0.4) × 100` | Rate reviewer reliability |
| **Bias Detection** | `score = max(0, 100 - normalizedPenalty × 5)` | Detect 12 bias types in text |
| **Team Analytics** | `mean, stdDev, entropy, gini, regression` | Team performance health |
| **CPIS** | `Σ(Dᵢ × Wᵢ) × TenureFactor + FairnessAdj` | 8-dimension performance score |
| **Disparate Impact** | `IF score/deptAvg < 0.80 → FLAG` | Fairness compliance (4/5ths rule) |
| **Bayesian Shrinkage** | `posterior = (prior×weight + observed×n) / (weight + n)` | Smooth sparse data |
| **Percentile Rank** | `(count below x / N) × 100` | Relative performance position |
| **Engagement Trend** | `EWMA(sentiments, α=0.3)` | Track engagement momentum |
| **Velocity** | `linearRegression(historicalScores).slope` | Performance trajectory |

### How Equations Work Together

```
Employee completes goals
        │
        ▼
Goal Scoring (CS) ─────────────────────────────────► GAI Dimension (25%)
        │                                                   │
        ▼                                                   │
Goal Risk Assessment ──► Alerts to Manager                  │
                                                            │
Reviews submitted ──► Calibration (Z-Score) ──► RQS (20%)  │
        │                                           │       │
        ▼                                           │       │
Bias Detection ──► Flag reviewers                   │       │
        │                                           │       │
Reviewer Trust ──► Weight reviews                   │       │
                                                    │       │
Feedback given ──► Sentiment EWMA ──────────► FSI (12%)    │
                                                    │       │
Collaboration data ──► Sigmoid normalize ──► CIS (10%)     │
                                                    │       │
Delivery data ──► Consistency metrics ──────► CRI (10%)    │
                                                    │       │
Historical scores ──► Linear regression ──► GTS (8%)       │
                                                    │       │
Evidence uploads ──► Quality scoring ──────► EQS (8%)      │
                                                    │       │
Initiative data ──► Sigmoid normalize ──────► III (7%)     │
                                                    │       │
All 8 Dimensions ──────────────────────────────────┘       │
        │                                                   │
        ▼                                                   │
CPIS = Σ(Dᵢ × Wᵢ) × TenureFactor + FairnessAdj           │
        │                                                   │
        ▼                                                   │
Grade (A+ to F) + Stars (1-5) + Rank Label                 │
        │                                                   │
        ▼                                                   │
Used for: Promotions, PIP, Compensation, Succession ◄──────┘
```

---

## 6. Impact on Other Users

### How Tenant Admin/Manager Actions Affect Employees

| Action | Employee Impact | Manager Impact | HR Impact |
|--------|----------------|----------------|-----------|
| **Create Review Cycle** | Must complete self-review + peer reviews by deadline | Must review all direct reports | Monitors cycle progress |
| **Launch Calibration** | Final rating may change (±0.5 typical) | Participates in calibration meeting | Facilitates session |
| **Create PIP** | Enters improvement program, regular check-ins | Must provide regular feedback | Approves outcome |
| **Assign Goal** | New goal appears in dashboard, affects CPIS GAI | Tracks team goal progress | Sees org goal completion |
| **Change Role** | Immediate feature access change | May gain/lose team management | Reflects in RBAC dashboard |
| **Excel Upload** | New employees join team | New direct reports appear | License seats consumed |
| **Enable AI** | Can/cannot use AI chat and agents | N/A (Manager has own setting) | Sees usage stats |
| **Create Policy** | ABAC rule may restrict data access | May affect team operations | Monitors compliance |
| **Set Delegation** | Delegatee gains temporary authority | Loses some control temporarily | Audits delegation usage |
| **Generate Report** | Data included anonymously in reports | Receives report | Uses for strategic planning |

---

## 7. Testing Segments

### [TA-01] Employee Onboarding
**Priority:** Critical | **Est. Time:** 40 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Create individual user | User created, seat consumed |
| 2 | Verify set-password email | Email sent with secure link |
| 3 | Assign department & manager | Org chart updated |
| 4 | Assign multiple roles | All role permissions active |
| 5 | Exceed license limit | Error: seat limit reached |
| 6 | Create user with time-bound role | Role expires on date |

### [TA-02] Review Cycle Management
**Priority:** Critical | **Est. Time:** 60 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Create draft review cycle | Cycle in DRAFT status |
| 2 | Configure participants & reviewers | Assignments saved |
| 3 | Launch cycle | Status ACTIVE, notifications sent |
| 4 | Monitor completion progress | Stats show % complete |
| 5 | Advance to IN_REVIEW | Status transitions correctly |
| 6 | Advance to CALIBRATION | Calibration session available |
| 7 | Complete cycle | All reviews finalized |
| 8 | Performance scores recalculated | CPIS RQS updated |

### [TA-03] Goal Cascade & Tree
**Priority:** High | **Est. Time:** 30 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Create org-level goal | Top of goal tree |
| 2 | Create aligned department goal | Linked to org goal (depth 1) |
| 3 | Create aligned team goal | Linked to dept goal (depth 2) |
| 4 | View goal tree | Hierarchical view shows alignment |
| 5 | Verify alignment bonus in CPIS | Aᵢ = 1 + (depth × 0.03) |
| 6 | Track progress rollup | Parent progress reflects children |

### [TA-04] Calibration Session
**Priority:** High | **Est. Time:** 45 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Create calibration session | Session in PENDING status |
| 2 | Start session | Status ACTIVE, reviews loaded |
| 3 | View original vs calibrated ratings | Z-score normalization applied |
| 4 | Manually adjust rating with evidence | Adjustment saved with reason |
| 5 | Complete session | Calibrated ratings saved |
| 6 | Verify CPIS RQS updated | Uses calibrated ratings |

### [TA-05] User & Role Management
**Priority:** High | **Est. Time:** 40 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Create custom role with permissions | Role saved with perms |
| 2 | Assign custom role to user | User gains new feature access |
| 3 | Create ABAC access policy | Policy enforced on matching users |
| 4 | Set up delegation (ACTING_MANAGER) | Delegatee gains manager access |
| 5 | Deactivate user | User logged out, seat freed |
| 6 | Archive user | Soft deleted, data preserved |
| 7 | View RBAC dashboard | Shows all roles, policies, delegations |

### [TA-06] Performance Analytics
**Priority:** High | **Est. Time:** 35 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View org-wide dashboard | Metrics for all employees |
| 2 | Performance distribution chart | Rating spread with entropy/gini |
| 3 | Goal trends over time | Line chart shows progress |
| 4 | Bias detection report | 12 bias types detected |
| 5 | Disparate impact analysis | 4/5ths rule compliance check |
| 6 | Generate scheduled report | Report created, downloadable |

### [TA-07] PIP Management
**Priority:** Medium | **Est. Time:** 30 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Create PIP for underperformer | PIP in ACTIVE status |
| 2 | Employee acknowledges | Acknowledgment recorded |
| 3 | Add check-in notes | Progress tracked |
| 4 | HR approves closure | Approval recorded |
| 5 | Close PIP (successful) | Status COMPLETED |
| 6 | Close PIP (terminated) | Status TERMINATED |

### [TA-08] AI Administration
**Priority:** Medium | **Est. Time:** 25 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Enable AI for specific user | User can access AI chat |
| 2 | Disable AI for user | AI features blocked |
| 3 | View usage stats | Token count, cost, provider breakdown |
| 4 | Approve pending AI action | Action executes |
| 5 | Reject pending AI action | Action cancelled |
| 6 | Monitor active agents | Live feed of executing tasks |

### [TA-09] Excel Upload
**Priority:** High | **Est. Time:** 30 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Download template | Excel template with headers |
| 2 | Upload valid file | Analyze returns preview |
| 3 | Upload with errors | Errors listed, valid rows shown |
| 4 | Confirm upload | Users created, emails sent |
| 5 | Exceed license in upload | Blocked: insufficient seats |
| 6 | Upload with expired subscription | Blocked: subscription guard |
| 7 | View upload history | Past uploads with stats |

### [TA-10] Team Management (Manager)
**Priority:** High | **Est. Time:** 30 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View direct reports | List of team members |
| 2 | View team analytics | avg, stddev, entropy, gini, z-scores |
| 3 | View team goal tree | Team-scoped goal hierarchy |
| 4 | Schedule 1-on-1 meeting | Meeting created, employee notified |
| 5 | Complete 1-on-1 with notes | Notes saved, tracked |
| 6 | View team CPIS summary | All direct reports' CPIS scores |

### [TA-11] CPIS Calculation
**Priority:** Critical | **Est. Time:** 45 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Request CPIS for user with full data | All 8 dimensions scored |
| 2 | CPIS with missing goals (dynamic reweight) | Other dimensions get more weight |
| 3 | CPIS with no reviews | Defaults to 50, reweighted |
| 4 | CPIS for new employee (<6mo) | Bayesian shrinkage applied |
| 5 | Verify fairness analysis | Disparate impact checked |
| 6 | Verify confidence interval | Wider for sparse data |
| 7 | Verify formula breakdown string | Transparent calculation trace |
| 8 | Check grade, stars, rank label | Matches score thresholds |

### [TA-12] Succession Planning
**Priority:** Medium | **Est. Time:** 20 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View nine-box grid | Grid populated with CPIS data |
| 2 | Create succession plan | Plan saved with successors |
| 3 | View readiness assessment | Dev gaps identified |
| 4 | Generate talent pool report | Top performers listed |

### [TA-13] Compensation & Promotion
**Priority:** Medium | **Est. Time:** 20 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View pay equity analysis | Breakdown by dept/level/gender |
| 2 | View promotion eligibility | CPIS-based filtering |
| 3 | Track promotion pipeline | Pending/approved promotions |

### [TA-14] Engagement & Wellbeing
**Priority:** Medium | **Est. Time:** 20 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View engagement overview | 6-month trend, dept breakdown |
| 2 | Identify at-risk employees | AI-flagged engagement drops |
| 3 | View wellbeing metrics | Work-life indicators |
| 4 | View meeting analytics | Meeting effectiveness scores |

### [TA-15] Compliance & Policies
**Priority:** Medium | **Est. Time:** 15 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View compliance dashboard | Regulatory tracking status |
| 2 | Create/update policy | Policy published |
| 3 | Track acknowledgments | Employee compliance rate |

### [TA-16] Delegations
**Priority:** Medium | **Est. Time:** 20 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Create ACTING_MANAGER delegation | Delegatee gains manager perms |
| 2 | Create PROXY_APPROVER delegation | Can approve on behalf |
| 3 | Verify time-bound expiry | Delegation expires on endDate |
| 4 | Verify delegation in authorize.ts | checkResourceAccessAsync passes |

### [TA-17] Configuration
**Priority:** Medium | **Est. Time:** 15 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Update tenant settings | Config saved |
| 2 | Toggle feature flags | Features enabled/disabled |
| 3 | Update review templates | Templates available in cycles |

### [TA-18] Audit Logs
**Priority:** Medium | **Est. Time:** 15 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View tenant audit logs | All actions for this tenant |
| 2 | Filter by action type | Matching logs shown |
| 3 | Filter by user | User-specific actions |
| 4 | Export audit trail | CSV/JSON download |

---

### Testing Timeline Summary

```
[TA-01]  Employee Onboarding       ████████    40 min  CRITICAL
[TA-02]  Review Cycles             ████████████ 60 min  CRITICAL
[TA-03]  Goal Cascade              ██████      30 min  HIGH
[TA-04]  Calibration               █████████   45 min  HIGH
[TA-05]  User & Role Mgmt         ████████    40 min  HIGH
[TA-06]  Analytics                 ███████     35 min  HIGH
[TA-07]  PIP Management           ██████      30 min  MEDIUM
[TA-08]  AI Administration        █████       25 min  MEDIUM
[TA-09]  Excel Upload             ██████      30 min  HIGH
[TA-10]  Team Management          ██████      30 min  HIGH
[TA-11]  CPIS Calculation         █████████   45 min  CRITICAL
[TA-12]  Succession Planning      ████        20 min  MEDIUM
[TA-13]  Compensation/Promotion   ████        20 min  MEDIUM
[TA-14]  Engagement/Wellbeing     ████        20 min  MEDIUM
[TA-15]  Compliance/Policies      ███         15 min  MEDIUM
[TA-16]  Delegations              ████        20 min  MEDIUM
[TA-17]  Configuration            ███         15 min  MEDIUM
[TA-18]  Audit Logs               ███         15 min  MEDIUM
                                  ────────────────────
                                  Total: ~8.5 hours
```

---

> **Dependencies:**
> - [SA-01] Tenant must exist before Tenant Admin testing
> - [TA-01] Users must be created before review/goal/feedback testing
> - [TA-02] Review cycle must complete before calibration [TA-04]
>
> **Next:** `04_EMPLOYEE_WORKFLOW.md` - Employee workflow
