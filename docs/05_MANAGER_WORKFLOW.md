# PMS Platform - Manager Workflow & Testing Segments

> **Role:** Manager (MANAGER)
> **Test User:** preethisivachandran0@gmail.com | Password: Demo@123
> **Title:** Senior Engineering Manager | **Department:** Product Engineering
> **Tenant:** XZ Technologies (demo-company)
> **Scope:** Team (direct reports) + Own data
> **App:** Web App (`apps/web/`)
> **API Base:** `/api/v1/`

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

The **Manager** is a team leader who manages direct reports' performance, conducts reviews, runs 1-on-1s, handles PIPs, participates in calibration, and monitors team health. Unlike Tenant Admin/HR Admin, the Manager's scope is **team-level** — limited to direct reports and their associated data.

```
┌──────────────────────────────────────────────────────────────────┐
│                    MANAGER SCOPE                                  │
│                    preethisivachandran0@gmail.com                 │
│                    Senior Engineering Manager                     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │               TEAM DATA (Direct Reports)                 │     │
│  │                                                          │     │
│  │  ● Team members' goals, progress, risk scores            │     │
│  │  ● Team members' reviews (write manager reviews)         │     │
│  │  ● Team members' feedback (view team timeline)           │     │
│  │  ● Team analytics (avg, z-scores, trends)                │     │
│  │  ● Team CPIS scores (all 8 dimensions per member)        │     │
│  │  ● Team pulse surveys (aggregated/anonymized)            │     │
│  │  ● Team engagement & wellbeing metrics                   │     │
│  │  ● 1-on-1 meetings with direct reports                   │     │
│  │  ● PIPs for underperforming direct reports               │     │
│  │  ● Calibration (participate in sessions)                 │     │
│  │  ● Team workload, heatmaps, real-time dashboards         │     │
│  │  ● Reports & scheduled reports (team/dept scope)         │     │
│  │  ● Excel bulk upload (team data)                         │     │
│  │  ● Delegation management                                 │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │               OWN DATA (Personal)                        │     │
│  │                                                          │     │
│  │  ● Own goals, reviews, feedback, CPIS                    │     │
│  │  ● Own skills, development, career path                  │     │
│  │  ● Own pulse, check-ins, chat, notifications             │     │
│  │  ● Own AI conversations                                  │     │
│  │  ● Own evidence portfolio                                │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
│  CANNOT ACCESS:                                                   │
│  ✗ HR Analytics, Succession Planning, Compliance                  │
│  ✗ User Management (create/delete users, assign roles)            │
│  ✗ Tenant Configuration, Audit Logs, License Dashboard            │
│  ✗ Access Policies (ABAC), RBAC Dashboard                        │
│  ✗ AI Access Management (toggle per user)                        │
│  ✗ Skill Gaps (org-wide), Talent Intelligence                    │
│  ✗ Team Optimizer, Culture Diagnostics                           │
│  ✗ Super Admin pages                                             │
└──────────────────────────────────────────────────────────────────┘
```

### Manager vs Other Roles — Quick Reference

| Capability | Employee | **Manager** | HR Admin | Tenant Admin |
|-----------|----------|-------------|----------|-------------|
| Own goals/reviews/feedback | Yes | **Yes** | Yes | Yes |
| View team goals/progress | No | **Yes** | Yes (all) | Yes (all) |
| Write manager reviews | No | **Yes** | Yes | Yes |
| Participate in calibration | No | **Yes** | Create + participate | Create + participate |
| Create PIP | No | **Yes (team)** | Yes (all) | Yes (all) |
| Team analytics | No | **Yes (team)** | Yes (all) | Yes (all) |
| View team CPIS | No | **Yes (team)** | Yes (all) | Yes (all) |
| 1-on-1 scheduling | Request only | **Schedule + manage** | Schedule | Schedule |
| Reports generation | No | **Yes (team)** | Yes (all) | Yes (all) |
| Excel upload | No | **Yes** | Yes | Yes |
| Delegation management | No | **Yes** | Yes | Yes |
| Real-time dashboard | No | **Yes** | Yes | Yes |
| Engagement/wellbeing | No | **Yes (team)** | Yes (all) | Yes (all) |
| Pulse analytics | No | **Yes (team)** | Yes (all) | Yes (all) |
| User management | No | **No** | Yes | Yes |
| Tenant config | No | **No** | Yes | Yes |
| Audit logs | No | **No** | Yes | Yes |
| Succession planning | No | **No** | Yes | Yes |

---

## 2. Feature Map & Access Matrix

### Manager-Accessible Routes (Beyond Employee)

| # | Feature | Route | Scope | Description |
|---|---------|-------|-------|-------------|
| 1 | **Manager Dashboard** | `/manager-dashboard` | Team | Central hub: reports, goals, reviews, PIPs, 1-on-1s |
| 2 | **Team View** | `/team` | Team | Direct reports list, org chart, search |
| 3 | **Team Insights** | `/team-insights` | Team | Performance distribution, health, goal trends |
| 4 | **Calibration** | `/calibration` | Session | View sessions, adjust ratings, participate |
| 5 | **PIP Management** | `/pip` | Team | Create, check-in, milestone, close |
| 6 | **Analytics** | `/analytics` | Team | Performance distribution, goal/feedback trends |
| 7 | **Real-Time Dashboard** | `/realtime` | Team | Live workload, goal progress, activity heatmap |
| 8 | **Reports** | `/reports` | Dept | Generate, schedule, export reports |
| 9 | **Report Schedules** | `/report-schedules` | Dept | Automated recurring reports |
| 10 | **Compensation** | `/compensation` | Team | View team compensation data |
| 11 | **Promotions** | `/promotions` | Team | Track promotion eligibility/pipeline |
| 12 | **Review Cycles** | `/review-cycles` | Session | View active cycles, track progress |
| 13 | **Review Moderation** | `/reviews/moderate` | Team | Moderate team member reviews |
| 14 | **Engagement** | `/engagement` | Team | Engagement overview, at-risk, trends |
| 15 | **Health Dashboard** | `/health-dashboard` | Team | Team health metrics, dept breakdown |
| 16 | **Wellbeing** | `/wellbeing` | Team | Burnout risk, work-life metrics |
| 17 | **Meeting Analytics** | `/meeting-analytics` | Team | 1-on-1 effectiveness, frequency |
| 18 | **Anomalies** | `/anomalies` | Team | Performance drop detection |
| 19 | **Benchmarks** | `/benchmarks` | Team | Performance benchmarks vs org avg |
| 20 | **AI Development** | `/ai-development` | Team | AI-generated development plans |
| 21 | **Excel Upload** | `/admin/excel-upload` | Team | Bulk data import |
| 22 | **Delegations** | `/admin/delegations` | Own | Create/manage delegations |

### Manager API Endpoints (Key Ones)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/users/my-reports` | GET | List direct reports |
| `/performance-math/team/me` | GET | Team analytics (avg, z-scores, trends) |
| `/performance-math/cpis/:userId` | GET | Team member's CPIS score |
| `/performance-math/score/:userId` | GET | Team member's performance score |
| `/performance-math/goal-risk/:goalId` | GET | Goal risk assessment |
| `/goals/team-tree` | GET | Team goal hierarchy |
| `/goals` (scope: team) | POST | Create goals for direct reports |
| `/reviews/:id/submit` | POST | Submit manager review |
| `/calibration/sessions/:id/ratings` | POST | Adjust calibration rating |
| `/pip` | POST | Create PIP for direct report |
| `/pip/:id/check-ins` | POST | Add PIP check-in |
| `/pip/:id/close` | POST | Close PIP |
| `/one-on-ones` | POST | Schedule 1-on-1 with report |
| `/one-on-ones/:id/complete` | POST | Complete 1-on-1 meeting |
| `/feedback/team` | GET | Team feedback timeline |
| `/engagement/at-risk` | GET | At-risk employees |
| `/pulse/analytics/overview` | GET | Team pulse overview |
| `/realtime-performance/workload/team` | GET | Team workload |
| `/realtime-performance/heatmap/team` | GET | Team activity heatmap |
| `/delegations` | POST | Create delegation |
| `/reports/generate` | POST | Generate team report |
| `/reports/schedules` | POST | Schedule recurring report |

---

## 3. Workflow Diagrams

### 3.1 Manager Daily Workflow

```
┌──────────────────────────────────────────────────────────────────┐
│              TYPICAL MANAGER DAY (Preethi)                        │
│              preethisivachandran0@gmail.com                       │
│                                                                   │
│  Morning:                                                         │
│  ├── Login → Manager Dashboard                                    │
│  │   ┌────────────────────────────────────────────────────┐      │
│  │   │ MANAGER HUB                                        │      │
│  │   │                                                    │      │
│  │   │ Team Size: 8 reports  │ Avg Goal Progress: 67%     │      │
│  │   │ Pending Reviews: 3    │ Team Health: 78/100        │      │
│  │   │ Upcoming 1-on-1s: 2   │ Active PIPs: 1            │      │
│  │   │                                                    │      │
│  │   │ Goals At Risk:                                     │      │
│  │   │ ● Alice: "API migration" - 35% (due in 5 days) ⚠️ │      │
│  │   │ ● Bob: "Test coverage" - 20% (due in 3 days) 🔴   │      │
│  │   │                                                    │      │
│  │   │ Action Items:                                      │      │
│  │   │ ● Review Dave's self-appraisal (due today)         │      │
│  │   │ ● 1-on-1 with Carol at 2 PM                       │      │
│  │   │ ● PIP check-in with Eve (overdue)                  │      │
│  │   └────────────────────────────────────────────────────┘      │
│  │                                                                │
│  ├── Check team pulse (anonymized aggregates)                     │
│  ├── Review goal risk alerts                                      │
│  └── Check notifications (review deadlines, feedback received)    │
│                                                                   │
│  During Work:                                                     │
│  ├── Write manager review for direct report                       │
│  ├── Schedule 1-on-1 with at-risk employee                       │
│  ├── Conduct 1-on-1 meeting, take notes                          │
│  ├── Give constructive feedback to team member                    │
│  ├── Assign new goal to direct report (aligned to team goal)      │
│  ├── Update PIP check-in notes                                   │
│  ├── Review AI agent approval (goal creation for team member)     │
│  └── Chat with team in group channel                              │
│                                                                   │
│  Weekly:                                                          │
│  ├── Review team analytics (z-scores, velocity trends)            │
│  ├── Review engagement/wellbeing dashboard                        │
│  ├── Generate team performance report                             │
│  ├── Review anomaly alerts (performance drops)                    │
│  ├── Review team CPIS scores                                      │
│  └── Participate in calibration session (if active)               │
│                                                                   │
│  Periodically:                                                    │
│  ├── Create PIP for underperformer                                │
│  ├── Recommend promotions for top performers                      │
│  ├── Bulk upload team data via Excel                              │
│  ├── Set up delegation (when on leave)                            │
│  └── Schedule automated weekly reports                            │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Team Performance Monitoring Workflow

```
[MGR-01] TEAM PERFORMANCE MONITORING

Manager (Preethi)
     │
     ├── 1. View Team Analytics
     │   GET /api/v1/performance-math/team/me
     │   │
     │   ┌──────────────────────────────────────────────────────┐
     │   │ TEAM ANALYTICS — Product Engineering (8 members)     │
     │   │                                                      │
     │   │ Team Average: 72.5 / 100                             │
     │   │ Score Spread (σ): 12.3                               │
     │   │ Rating Entropy: 0.82 (good differentiation)          │
     │   │ Gini Coefficient: 0.18 (low inequality)              │
     │   │ Velocity Trend: +2.5/period (improving ↗)            │
     │   │ Predicted Next Avg: 75.0                             │
     │   │                                                      │
     │   │ Member Z-Scores:                                     │
     │   │ ┌──────────┬───────┬────────┬────────────────┐      │
     │   │ │ Member   │ Score │ Z-Score│ Category       │      │
     │   │ ├──────────┼───────┼────────┼────────────────┤      │
     │   │ │ Alice    │  92   │ +1.58  │ HIGH ⭐        │      │
     │   │ │ Bob      │  85   │ +1.02  │ HIGH ⭐        │      │
     │   │ │ Carol    │  78   │ +0.45  │ AVERAGE        │      │
     │   │ │ Dave     │  74   │ +0.12  │ AVERAGE        │      │
     │   │ │ Eve      │  70   │ -0.20  │ AVERAGE        │      │
     │   │ │ Frank    │  65   │ -0.61  │ AVERAGE        │      │
     │   │ │ Grace    │  58   │ -1.18  │ LOW ⚠️         │      │
     │   │ │ Hank     │  48   │ -1.99  │ LOW 🔴         │      │
     │   │ └──────────┴───────┴────────┴────────────────┘      │
     │   │                                                      │
     │   │ Math:                                                │
     │   │ ● mean = Σ(scores) / n = 580 / 8 = 72.5             │
     │   │ ● σ = √(Σ(xᵢ - μ)² / N) = 12.3                    │
     │   │ ● z(Alice) = (92 - 72.5) / 12.3 = +1.58            │
     │   │ ● z(Hank) = (48 - 72.5) / 12.3 = -1.99             │
     │   │ ● entropy = -Σ(pᵢ × log₂(pᵢ)) normalized = 0.82   │
     │   │ ● gini = (2×Σ(i×xᵢ))/(n×Σxᵢ) - (n+1)/n = 0.18    │
     │   │ ● velocity = linearRegression(hist).slope = +2.5     │
     │   └──────────────────────────────────────────────────────┘
     │
     ├── 2. Drill Into Individual CPIS
     │   GET /api/v1/performance-math/cpis/:userId  (e.g., Hank)
     │   │
     │   ┌──────────────────────────────────────────────────────┐
     │   │ HANK — CPIS: 48 | Grade: D | ★★ | "Developing"      │
     │   │                                                      │
     │   │ D1 GAI (25%):  35 ████████                           │
     │   │ D2 RQS (20%):  55 ██████████████                     │
     │   │ D3 FSI (12%):  50 ████████████                       │
     │   │ D4 CIS (10%):  40 ██████████                         │
     │   │ D5 CRI (10%):  45 ███████████                        │
     │   │ D6 GTS  (8%):  60 ███████████████                    │
     │   │ D7 EQS  (8%):  50 ████████████  (default, no data)  │
     │   │ D8 III  (7%):  25 ██████                             │
     │   │                                                      │
     │   │ Strengths: Growth Trajectory (improving)             │
     │   │ Growth Areas: Goals (35), Initiative (25), Collab(40)│
     │   │ Trajectory: Stable (slope: +0.5)                     │
     │   │ Confidence: 0.68 (moderate data)                     │
     │   │ Recommendation: PIP candidate (CPIS < 50)            │
     │   └──────────────────────────────────────────────────────┘
     │
     ├── 3. Actions Based on Data
     │   │
     │   ├── HIGH performers (z > +1): Alice, Bob
     │   │   → Promotion consideration
     │   │   → Stretch goal assignments
     │   │   → Mentor pairing with low performers
     │   │
     │   ├── AVERAGE performers: Carol, Dave, Eve, Frank
     │   │   → Regular 1-on-1 coaching
     │   │   → Skill development plans
     │   │   → Goal alignment check
     │   │
     │   └── LOW performers (z < -1): Grace, Hank
     │       → Hank (CPIS 48, Grade D): CREATE PIP [see MGR-05]
     │       → Grace (CPIS 58, Grade C): Increased 1-on-1 frequency
     │       → Identify root causes via anomaly detection
     │
     EFFECT ON OTHER USERS:
     ● Employees: Manager's attention/coaching based on z-score category
     ● HR Admin: Sees aggregated team health in org-wide analytics
     ● Tenant Admin: Team metrics roll up to org performance
```

### 3.3 Manager Review Workflow

```
[MGR-02] WRITING MANAGER REVIEWS

Manager (Preethi)
     │
     ├── 1. Review Cycle Active (Launched by Tenant Admin)
     │   Notification: "Q1 Review Cycle — 8 manager reviews due by March 31"
     │
     ├── 2. View Pending Reviews
     │   GET /api/v1/reviews?reviewerId=me&type=MANAGER&status=PENDING
     │   │
     │   ┌────────────────────────────────────────────────┐
     │   │ PENDING MANAGER REVIEWS                        │
     │   │                                                │
     │   │ ● Alice Chen — Due: Mar 25 (4 days)           │
     │   │ ● Bob Kumar — Due: Mar 25 (4 days)            │
     │   │ ● Carol Lee — Due: Mar 28 (7 days)            │
     │   │ ● Dave Park — Due: Mar 28 (7 days)            │
     │   │ ● Eve Wright — Due: Mar 31 (10 days)          │
     │   │ ● Frank Zhao — Due: Mar 31 (10 days)          │
     │   │ ● Grace Kim — Due: Mar 31 (10 days)           │
     │   │ ● Hank Patel — Due: Mar 31 (10 days)          │
     │   └────────────────────────────────────────────────┘
     │
     ├── 3. Review Employee Data Before Rating
     │   │
     │   For each direct report, manager reviews:
     │   ├── Their self-review (if submitted)
     │   ├── Peer reviews (if submitted)
     │   ├── Goal completion & scores
     │   ├── Feedback received
     │   ├── Evidence uploaded
     │   ├── 1-on-1 meeting notes
     │   └── CPIS breakdown
     │
     ├── 4. Write Manager Review
     │   PUT /api/v1/reviews/:id/draft
     │   {
     │     ratings: {
     │       goalAchievement: 4,
     │       teamwork: 5,
     │       initiative: 3,
     │       communication: 4,
     │       technical: 4
     │     },
     │     overallRating: 4.0,
     │     comments: "Alice consistently exceeded targets and
     │                demonstrated strong leadership in the API
     │                migration project. Areas for growth include
     │                cross-team initiative."
     │   }
     │   │
     │   ├── Bias Detection runs on review text:
     │   │   12 bias types checked
     │   │   biasScore stored (0-1)
     │   │   IF biasScore > 0.3 → flagged for calibration
     │   │
     │   └── Save as DRAFT (can revise)
     │
     ├── 5. Submit Review
     │   POST /api/v1/reviews/:id/submit
     │   │
     │   ├── Status: SUBMITTED
     │   ├── Cannot edit after submission
     │   ├── Manager's review weight in CPIS RQS: 1.5 (HIGHEST)
     │   │
     │   │   RQS Formula for this review:
     │   │   normalizedRating = (4.0 / 5) × 100 = 80
     │   │   weight = trustScore × typeWeight
     │   │         = (managerTrust/100) × 1.5
     │   │   biasAdjusted = normalizedRating × (1 - biasScore)
     │   │
     │   └── Employee notified: "Manager review received"
     │
     └── 6. Post-Calibration
         │
         After calibration session:
         ├── Manager's rating may be adjusted
         │   (Z-score normalization removes grading bias)
         │
         │   IF manager grades higher than global mean:
         │     z = (rating - managerMean) / managerStdDev
         │     calibrated = z × globalStdDev + globalMean
         │     (typically lowers inflated ratings)
         │
         │   IF manager grades lower than global mean:
         │     (typically raises deflated ratings)
         │
         └── Employee sees CALIBRATED rating (not raw)

     EFFECT ON OTHER USERS:
     ● Employee: CPIS RQS dimension updated (manager weight 1.5x)
     ● Employee: Final rating may differ from raw after calibration
     ● HR Admin: Review completion progress updated
     ● Calibration: Manager's ratings included in session
     ● Manager's trust score affects review weight:
       trustScore = (volumeFactor×0.6 + consistencyFactor×0.4) × 100
```

### 3.4 One-on-One Management Workflow

```
[MGR-03] ONE-ON-ONE MANAGEMENT

Manager (Preethi)
     │
     ├── 1. Schedule 1-on-1
     │   POST /api/v1/one-on-ones
     │   {
     │     employeeId: graceUserId,
     │     scheduledDate: "2026-03-20T14:00:00",
     │     agenda: "Discuss goal progress and support needed",
     │     recurring: true,
     │     frequency: "WEEKLY"
     │   }
     │   │
     │   └── Grace notified: "1-on-1 scheduled for March 20 at 2 PM"
     │
     ├── 2. Prepare for Meeting
     │   Review before meeting:
     │   ├── Grace's goal progress (35% behind expected)
     │   ├── Grace's recent feedback (mixed sentiment)
     │   ├── Grace's pulse trend (stress level rising)
     │   ├── Grace's CPIS (58, Grade C, z-score: -1.18)
     │   └── Previous 1-on-1 action items
     │
     ├── 3. Start Meeting
     │   POST /api/v1/one-on-ones/:id/start
     │   │
     │   Status: IN_PROGRESS
     │
     ├── 4. Conduct Meeting & Take Notes
     │   PUT /api/v1/one-on-ones/:id
     │   {
     │     notes: "Grace feeling overwhelmed with API migration scope.
     │             Agreed to break goal into smaller milestones.
     │             Will pair with Alice for knowledge transfer.",
     │     actionItems: [
     │       "Grace: Break API goal into 3 sub-tasks by March 22",
     │       "Preethi: Set up Alice-Grace pairing session",
     │       "Grace: Update goal progress by March 25"
     │     ]
     │   }
     │
     ├── 5. Complete Meeting
     │   POST /api/v1/one-on-ones/:id/complete
     │   │
     │   ├── Status: COMPLETED
     │   ├── Duration tracked
     │   ├── Meeting analytics updated
     │   │
     │   Effect on BOTH Preethi's and Grace's CPIS CIS:
     │   oneOnOneScore = boundedSigmoid(count, 0, 100, k=0.5, x₀=4)
     │   Weight in CIS: 0.15
     │
     └── 6. View Meeting Analytics
         GET /api/v1/meeting-analytics
         │
         ┌────────────────────────────────────────────────┐
         │ 1-ON-1 ANALYTICS (Preethi's Team)              │
         │                                                │
         │ Total meetings this month: 12                  │
         │ Avg frequency per report: 1.5/month            │
         │ Avg duration: 28 minutes                       │
         │ Reports with 0 meetings: 1 (Frank)             │
         │                                                │
         │ Coverage:                                      │
         │ ● Alice: 2 meetings ✅                         │
         │ ● Bob: 2 meetings ✅                           │
         │ ● Carol: 1 meeting ✅                          │
         │ ● Dave: 1 meeting ✅                           │
         │ ● Eve: 2 meetings ✅                           │
         │ ● Frank: 0 meetings ⚠️                        │
         │ ● Grace: 3 meetings ✅ (increased for support) │
         │ ● Hank: 1 meeting ✅                           │
         └────────────────────────────────────────────────┘

     EFFECT ON OTHER USERS:
     ● Employee: Receives meeting notification, sees notes/action items
     ● Both: CPIS CIS dimension updated (1-on-1 count)
     ● HR: Meeting analytics roll up to org engagement metrics
```

### 3.5 PIP Creation & Management Workflow

```
[MGR-05] PIP MANAGEMENT

Manager (Preethi)
     │
     ├── 1. Identify Candidate (from Team Analytics)
     │   Hank: CPIS 48, Grade D, z-score -1.99 (LOW)
     │   Sustained low performance for 2+ review cycles
     │
     ├── 2. Create PIP
     │   POST /api/v1/pip
     │   {
     │     employeeId: hankUserId,
     │     reason: "CPIS score consistently below 50 for 2 cycles.
     │              Goal attainment at 35%, collaboration at 40%.",
     │     duration: 90,    // days
     │     startDate: "2026-03-16",
     │     endDate: "2026-06-14",
     │     milestones: [
     │       {
     │         title: "Complete React advanced training",
     │         dueDate: "2026-04-01",
     │         description: "Finish Udemy course + certification"
     │       },
     │       {
     │         title: "Achieve 70% goal completion rate",
     │         dueDate: "2026-05-01",
     │         description: "At least 3 of 5 active goals at 70%+"
     │       },
     │       {
     │         title: "Receive 3+ positive peer feedback",
     │         dueDate: "2026-05-15",
     │         description: "Actively collaborate and seek feedback"
     │       },
     │       {
     │         title: "CPIS score ≥ 55",
     │         dueDate: "2026-06-14",
     │         description: "Sustained improvement across all dimensions"
     │       }
     │     ]
     │   }
     │   │
     │   ├── PIP Status: ACTIVE
     │   ├── Hank notified: "Performance Improvement Plan assigned"
     │   ├── HR Admin notified for oversight
     │   └── Audit: PIP_CREATED
     │
     ├── 3. Employee Acknowledges
     │   (Hank) POST /api/v1/pip/:id/acknowledge
     │
     ├── 4. Bi-Weekly Check-ins
     │   POST /api/v1/pip/:id/check-ins
     │   {
     │     date: "2026-03-30",
     │     progress: "Hank has enrolled in React course.
     │                Goal progress improved from 35% to 45%.
     │                Had 1 positive peer interaction.",
     │     managerFeedback: "Good start. Need to accelerate goal work.
     │                       Recommend pairing with Bob on shared goals.",
     │     nextSteps: "Complete React training by Apr 1 milestone."
     │   }
     │
     ├── 5. Update Milestones
     │   PUT /api/v1/pip/milestones/:milestoneId
     │   { status: 'COMPLETED', completedAt: '2026-04-01' }
     │
     ├── 6. HR Reviews Progress
     │   (HR Admin) POST /api/v1/pip/:id/approve
     │
     └── 7. Close PIP
         POST /api/v1/pip/:id/close
         {
           outcome: 'COMPLETED_SUCCESSFULLY'
           // or 'EXTENDED' or 'TERMINATED'
         }
         │
         ├── COMPLETED_SUCCESSFULLY: Hank continues normally
         ├── EXTENDED: Additional 30-60 days
         └── TERMINATED: Further HR action

     EFFECT ON OTHER USERS:
     ● Hank (Employee):
       - Sees PIP in dashboard, must acknowledge
       - Regular check-in meetings with Preethi
       - Milestones as additional tracked goals
       - CPIS monitored more closely
     ● HR Admin:
       - Reviews and approves PIP outcome
       - Sees PIP status in compliance dashboard
     ● Other team members:
       - Not directly informed (PIP is private)
       - May notice increased collaboration from Hank
```

### 3.6 Goal Assignment & Risk Monitoring

```
[MGR-04] GOAL ASSIGNMENT & RISK MONITORING

Manager (Preethi)
     │
     ├── 1. Create Team Goal
     │   POST /api/v1/goals
     │   {
     │     title: "Deliver API v2 by Q2",
     │     priority: "CRITICAL",
     │     weight: 3,
     │     complexity: 4,
     │     dueDate: "2026-06-30"
     │   }
     │
     ├── 2. Assign Sub-Goals to Reports
     │   POST /api/v1/goals
     │   {
     │     title: "Implement authentication endpoints",
     │     userId: aliceUserId,     // Assign to Alice
     │     alignedToId: teamGoalId, // Linked to team goal
     │     priority: "HIGH",
     │     weight: 2,
     │     complexity: 3,
     │     dueDate: "2026-05-15"
     │   }
     │   │
     │   Alignment bonus in Alice's CPIS GAI:
     │   Aᵢ = 1 + (1 × 0.03) = 1.03 (+3%)
     │
     ├── 3. View Team Goal Tree
     │   GET /api/v1/goals/team-tree
     │   │
     │   ┌──────────────────────────────────────────────────┐
     │   │ TEAM GOAL TREE (Preethi's Team)                  │
     │   │                                                  │
     │   │ 🎯 Deliver API v2 by Q2 (Preethi) — 45%         │
     │   │ ├── Auth endpoints (Alice) — 70% ✅              │
     │   │ ├── Database migration (Bob) — 55% 🟡            │
     │   │ ├── Integration tests (Carol) — 40% 🟡           │
     │   │ ├── Documentation (Dave) — 30% ⚠️               │
     │   │ └── Performance testing (Frank) — 15% 🔴         │
     │   │                                                  │
     │   │ 🎯 Improve code quality (Preethi) — 60%          │
     │   │ ├── Test coverage 80% (Eve) — 55%                │
     │   │ ├── Linting rules (Grace) — 70%                  │
     │   │ └── PR review process (Hank) — 35% ⚠️           │
     │   └──────────────────────────────────────────────────┘
     │
     ├── 4. Monitor Goal Risk
     │   GET /api/v1/performance-math/goal-risk/:goalId
     │   (For Frank's "Performance testing" goal — 15%, due in 3.5 months)
     │   │
     │   ┌──────────────────────────────────────────────────┐
     │   │ GOAL RISK: Performance testing (Frank)            │
     │   │                                                  │
     │   │ Overall Risk: 62 (HIGH)                          │
     │   │                                                  │
     │   │ Schedule Risk:   70% (well behind expected pace) │
     │   │ Velocity Risk:   55% (slowing velocity)          │
     │   │ Dependency Risk: 45% (blocked by Bob's migration)│
     │   │ Complexity Risk: 64% (high complexity, much left)│
     │   │                                                  │
     │   │ Current velocity:  0.8 progress/day              │
     │   │ Required velocity: 2.3 progress/day              │
     │   │ Projected: Won't complete without intervention   │
     │   │                                                  │
     │   │ Risk = 0.40(70) + 0.30(55) + 0.15(45) + 0.15(64)│
     │   │      = 28 + 16.5 + 6.75 + 9.6 = 60.85 → HIGH   │
     │   └──────────────────────────────────────────────────┘
     │
     └── 5. Take Action
         ├── Schedule 1-on-1 with Frank to unblock
         ├── Adjust goal scope or deadline if needed
         ├── Pair Frank with Alice (top performer)
         └── Create AI development plan for Frank

     EFFECT ON OTHER USERS:
     ● Employee (assignee): New goal appears in their dashboard
     ● Employee: Alignment bonus in CPIS GAI dimension
     ● HR: Team goal progress feeds org-wide analytics
     ● Parent goal: Progress rollup reflects children
```

### 3.7 Calibration Participation

```
[MGR-06] CALIBRATION PARTICIPATION

Manager (Preethi) — Participating (not creating session)
     │
     ├── 1. Invited to Calibration Session
     │   (Created by HR Admin / Tenant Admin)
     │   Notification: "Calibration session for Q1 cycle — Join by March 25"
     │
     ├── 2. View Session
     │   GET /api/v1/calibration/sessions/:id
     │   │
     │   ├── Session status: ACTIVE
     │   ├── Participants: [Preethi, Other Managers]
     │   └── Reviews loaded from Q1 cycle
     │
     ├── 3. View Ratings Comparison
     │   GET /api/v1/calibration/sessions/:id/ratings
     │   │
     │   ┌──────────────────────────────────────────────────────┐
     │   │ CALIBRATION: Q1 Review Cycle                         │
     │   │                                                      │
     │   │ Global Mean: 3.6    Global σ: 0.72                   │
     │   │ Preethi's Mean: 3.9  Preethi's σ: 0.65              │
     │   │ → Preethi rates slightly above average               │
     │   │                                                      │
     │   │ ┌──────────┬────────┬────────────┬────────────┐      │
     │   │ │ Employee │ Raw    │ Calibrated │ Adjustment │      │
     │   │ ├──────────┼────────┼────────────┼────────────┤      │
     │   │ │ Alice    │  4.5   │   4.2      │   -0.3     │      │
     │   │ │ Bob      │  4.0   │   3.8      │   -0.2     │      │
     │   │ │ Carol    │  3.8   │   3.7      │   -0.1     │      │
     │   │ │ Dave     │  3.5   │   3.5      │    0.0     │      │
     │   │ │ Eve      │  3.5   │   3.5      │    0.0     │      │
     │   │ │ Frank    │  3.0   │   3.1      │   +0.1     │      │
     │   │ │ Grace    │  2.8   │   3.0      │   +0.2     │      │
     │   │ │ Hank     │  2.5   │   2.8      │   +0.3     │      │
     │   │ └──────────┴────────┴────────────┴────────────┘      │
     │   │                                                      │
     │   │ Calibration Math:                                    │
     │   │ For Alice: z = (4.5 - 3.9) / 0.65 = 0.923           │
     │   │ calibrated = 0.923 × 0.72 + 3.6 = 4.26 → 4.2       │
     │   │                                                      │
     │   │ For Hank: z = (2.5 - 3.9) / 0.65 = -2.15            │
     │   │ calibrated = -2.15 × 0.72 + 3.6 = 2.05 → clamp 2.8 │
     │   │ (Bayesian shrinkage pulls extreme lows toward mean)   │
     │   └──────────────────────────────────────────────────────┘
     │
     ├── 4. Make Evidence-Based Adjustment
     │   POST /api/v1/calibration/sessions/:id/ratings
     │   {
     │     reviewId: graceReviewId,
     │     adjustedRating: 3.2,
     │     reason: "Grace led the linting initiative which improved
     │              team code quality by 30%. Evidence in her portfolio."
     │   }
     │   │
     │   └── Audit: CALIBRATION_ADJUSTMENT
     │
     └── 5. Session Complete
         (HR Admin completes session)
         │
         ├── Calibrated ratings REPLACE raw ratings
         ├── All employees' CPIS RQS recalculated
         └── Employees see calibrated rating in their profile

     EFFECT ON OTHER USERS:
     ● All reviewed employees: Final ratings adjusted by calibration
     ● Employees: CPIS RQS dimension uses calibrated (not raw) ratings
     ● HR Admin: Sees calibration impact on org distribution
     ● Other managers: Their ratings also calibrated in same session
```

### 3.8 Engagement & Wellbeing Monitoring

```
[MGR-07] ENGAGEMENT & WELLBEING MONITORING

Manager (Preethi)
     │
     ├── 1. View Engagement Dashboard
     │   GET /api/v1/engagement/overview
     │   │
     │   ┌──────────────────────────────────────────────────┐
     │   │ TEAM ENGAGEMENT (Product Engineering)             │
     │   │                                                  │
     │   │ Overall Score: 76/100 (Good)                     │
     │   │ 6-Month Trend: ▁▃▅▆▇▇ (improving)               │
     │   │                                                  │
     │   │ At-Risk Employees: 2                             │
     │   │ ● Grace — Declining pulse score (3.8 → 2.5)     │
     │   │ ● Hank — Low engagement + PIP active             │
     │   └──────────────────────────────────────────────────┘
     │
     ├── 2. View Pulse Analytics
     │   GET /api/v1/pulse/analytics/overview
     │   │
     │   Team pulse (anonymized aggregates):
     │   ├── Avg Mood: 3.6 / 5
     │   ├── Avg Energy: 3.4 / 5
     │   ├── Avg Stress: 2.8 / 5 (moderate)
     │   ├── Work-Life Balance: 3.5 / 5
     │   └── Trend: Stress increasing last 2 weeks ⚠️
     │
     ├── 3. View Wellbeing Dashboard
     │   GET /api/v1/health-metrics (wellbeing)
     │   │
     │   ├── Burnout risk indicators
     │   ├── Work hours distribution
     │   ├── Weekend/late-night activity flags
     │   └── Team workload balance
     │
     ├── 4. Real-Time Team Workload
     │   GET /api/v1/realtime-performance/workload/team
     │   │
     │   ┌──────────────────────────────────────────────────┐
     │   │ TEAM WORKLOAD DISTRIBUTION                       │
     │   │                                                  │
     │   │ Alice:  ████████████████████░░░░  85% capacity   │
     │   │ Bob:    ████████████████░░░░░░░░  70% capacity   │
     │   │ Carol:  ██████████████████░░░░░░  78% capacity   │
     │   │ Dave:   ████████████░░░░░░░░░░░░  55% capacity   │
     │   │ Eve:    ████████████████████████  100% ⚠️ OVER   │
     │   │ Frank:  ██████████████████████░░  90% capacity   │
     │   │ Grace:  ████████████████████████  95% ⚠️ HIGH    │
     │   │ Hank:   ████████░░░░░░░░░░░░░░░░  40% capacity  │
     │   └──────────────────────────────────────────────────┘
     │
     ├── 5. Anomaly Detection
     │   GET /api/v1/ai-insights/anomalies
     │   │
     │   ├── Eve: "Performance drop of 15% in last 2 weeks"
     │   ├── Grace: "Pulse score dropped below team average"
     │   └── Alice: "Goal velocity 2x above team avg" (positive anomaly)
     │
     └── 6. Take Action
         ├── Schedule extra 1-on-1 with Grace (declining engagement)
         ├── Redistribute Eve's workload to Dave/Hank
         ├── Discuss work-life balance in team meeting
         └── Create AI-powered wellness recommendations

     EFFECT ON OTHER USERS:
     ● Team members: May receive workload adjustments
     ● At-risk employees: Increased manager attention
     ● HR Admin: Org-wide engagement trends include team data
     ● AI Agents: Burnout detection agent may proactively flag
```

### 3.9 Delegation Management

```
[MGR-08] DELEGATION MANAGEMENT

Manager (Preethi) — Going on leave for 2 weeks
     │
     ├── 1. Create Delegation
     │   POST /api/v1/delegations
     │   {
     │     delegatorId: preethiUserId,
     │     delegateeId: aliceUserId,      // Alice (top performer)
     │     type: "ACTING_MANAGER",
     │     startDate: "2026-04-01",
     │     endDate: "2026-04-14",
     │     scope: "FULL",
     │     notes: "Alice to handle all team management during leave"
     │   }
     │   │
     │   ├── Alice notified: "You have been delegated ACTING_MANAGER"
     │   ├── Delegation active from April 1
     │   └── Audit: DELEGATION_CREATED
     │
     ├── 2. Alice Gains During Delegation:
     │   │
     │   ├── Can view all team member data
     │   ├── Can approve/reject pending items
     │   ├── Can create 1-on-1 meetings
     │   ├── Can add PIP check-in notes
     │   ├── Can submit reviews (if deadline falls in period)
     │   ├── Can view team analytics
     │   └── authorize.ts → checkResourceAccessAsync evaluates delegation
     │
     ├── 3. During Delegation Period
     │   │
     │   All of Preethi's MANAGER permissions → Alice
     │   (evaluated by hasDelegationFrom() in authorize middleware)
     │
     └── 4. Delegation Expires
         │
         After endDate (April 14):
         ├── Alice's elevated permissions automatically revoked
         ├── Preethi resumes full management
         └── Audit: DELEGATION_EXPIRED

     EFFECT ON OTHER USERS:
     ● Alice (delegatee): Temporary MANAGER access to team
     ● Team members: See Alice as acting manager during period
     ● HR Admin: Delegation tracked in RBAC dashboard
     ● Audit: All actions by Alice during delegation logged with context
```

### 3.10 Report Generation & Scheduling

```
[MGR-09] REPORTS & SCHEDULING

Manager (Preethi)
     │
     ├── Generate On-Demand Report
     │   POST /api/v1/reports/generate
     │   { type: 'TEAM_PERFORMANCE', scope: 'team', format: 'PDF' }
     │   │
     │   Report includes:
     │   ├── Team average CPIS
     │   ├── Individual CPIS breakdowns
     │   ├── Goal completion rates
     │   ├── Review cycle summary
     │   ├── Feedback volume
     │   ├── Engagement metrics
     │   └── Recommendations
     │
     ├── Schedule Recurring Report
     │   POST /api/v1/reports/schedules
     │   {
     │     name: "Weekly Team Performance",
     │     type: 'TEAM_PERFORMANCE',
     │     scope: 'department',
     │     frequency: 'WEEKLY',
     │     dayOfWeek: 'MONDAY',
     │     recipients: [preethiEmail],
     │     format: 'PDF'
     │   }
     │   │
     │   └── Auto-generated every Monday
     │
     └── View Report History
         GET /api/v1/reports
         │
         └── Past reports with download links

     EFFECT ON OTHER USERS:
     ● HR Admin: Can see scheduled reports in admin view
     ● Employees: Data included in reports (aggregated)
```

---

## 4. Feature Workflows with Expected Outcomes

### [MGR-10] Real-Time Dashboard

```
Manager (Preethi)
     │
     GET /api/v1/realtime-performance/snapshot
     GET /api/v1/realtime-performance/heatmap/team
     GET /api/v1/realtime-performance/sentiment/team
     │
     ┌──────────────────────────────────────────────────────┐
     │ REAL-TIME PERFORMANCE (Live)                         │
     │                                                      │
     │ Active Now: 6 of 8 team members                      │
     │                                                      │
     │ Goal Progress (Last 24h):                            │
     │ ● 3 goals updated, 1 completed                       │
     │                                                      │
     │ Activity Heatmap (This Week):                        │
     │      Mon  Tue  Wed  Thu  Fri                         │
     │  9AM  ██   ██   ██   ██   █                          │
     │ 10AM  ███  ███  ███  ██   ██                         │
     │ 11AM  ██   ████ ████ ███  ██                         │
     │ 12PM  █    █    █    █    █                          │
     │  1PM  ██   ██   ███  ██   █                          │
     │  2PM  ███  ███  ████ ███  ██                         │
     │  3PM  ████ ████ ███  ████ ███                        │
     │  4PM  ██   ███  ██   ███  ██                         │
     │  5PM  █    ██   █    ██   █                          │
     │                                                      │
     │ Team Morale (Sentiment): 0.72 (Positive)             │
     └──────────────────────────────────────────────────────┘
```

### [MGR-11] Benchmark Analysis

```
Manager (Preethi)
     │
     GET /api/v1/ai-insights/benchmarks
     │
     ┌──────────────────────────────────────────────────────┐
     │ TEAM vs ORGANIZATION BENCHMARK                       │
     │                                                      │
     │ Metric           │ My Team │ Org Avg │ Delta         │
     │ ─────────────────┼─────────┼─────────┼──────         │
     │ CPIS Average     │  72.5   │  68.0   │ +4.5 ✅      │
     │ Goal Completion  │  67%    │  72%    │ -5%  ⚠️      │
     │ Review Score     │  3.8    │  3.6    │ +0.2 ✅      │
     │ Feedback Volume  │  4.2/mo │  3.8/mo │ +0.4 ✅      │
     │ Pulse (Mood)     │  3.6    │  3.7    │ -0.1 ➖      │
     │ 1-on-1 Frequency │  1.5/mo │  1.2/mo │ +0.3 ✅      │
     │ PIP Rate         │  12.5%  │  8%     │ +4.5% ⚠️     │
     │ Turnover Risk    │  Low    │  Low    │  Same         │
     └──────────────────────────────────────────────────────┘
     │
     Insights:
     ├── Team outperforms org in CPIS (+4.5), reviews, feedback
     ├── Goal completion lagging org average (-5%) → needs focus
     └── Higher PIP rate (1 active out of 8) → contributing factor
```

### [MGR-12] AI Agent Interaction (Manager Scope)

```
Manager (Preethi)
     │
     ├── Chat: "Which team members need attention this week?"
     │   → Routed to: workforce_intel agent
     │   → Agent queries: team CPIS, goal risks, pulse trends
     │   → Response: "Grace (declining pulse, CPIS 58) and Frank
     │     (performance testing goal at HIGH risk) need 1-on-1s"
     │
     ├── Chat: "Draft a development plan for Hank"
     │   → Routed to: career agent + coaching agent (multi-agent)
     │   → Agents read: Hank's CPIS gaps, skill matrix, PIP status
     │   → Tool: create_development_plan (HIGH_WRITE)
     │   → Approval required from Preethi
     │   → Approve → Development plan created for Hank
     │
     ├── Chat: "Analyze Q1 team performance trends"
     │   → Routed to: report agent
     │   → Agent queries: team analytics, historical scores
     │   → Response: Summary with trend analysis and recommendations
     │
     └── Manager-specific data scoping:
         Agent resolveRoleCategory() → 'manager'
         → Only team members' data accessible
         → Cannot access other teams' data

     EFFECT ON OTHER USERS:
     ● Employees: AI-created plans/goals appear in their dashboard
     ● AI actions: Require manager approval before affecting team data
```

---

## 5. Mathematical Equations Used

### Equations the Manager Directly Interacts With

| Feature | Equation | What Manager Sees |
|---------|----------|-------------------|
| **Team Average** | `μ = Σ(scores) / n` | Overall team health indicator |
| **Score Spread** | `σ = √(Σ(xᵢ - μ)² / N)` | How varied team performance is |
| **Member Z-Scores** | `z = (score - μ) / σ` | Who's HIGH / AVERAGE / LOW |
| **Rating Entropy** | `H = -Σ(pᵢ × log₂(pᵢ))` | Is manager differentiating enough? |
| **Gini Coefficient** | `G = (2×Σ(i×xᵢ))/(n×Σxᵢ) - (n+1)/n` | Performance inequality in team |
| **Velocity Trend** | `linearRegression(historical).slope` | Team improving or declining? |
| **Predicted Next** | `slope × (n+1) + intercept` | Forecast next period average |
| **Goal Risk** | `0.40×Sched + 0.30×Veloc + 0.15×Dep + 0.15×Complex` | Which goals need intervention |
| **Calibration** | `z = (rating - μ_r) / σ_r; cal = z × σ_g + μ_g` | How ratings adjust after session |
| **Bias Detection** | `score = max(0, 100 - penalty × 5)` | Flags in manager's review text |
| **Reviewer Trust** | `trust = (volFactor×0.6 + consFactor×0.4) × 100` | Manager's review weight |
| **CPIS per member** | `Σ(Dᵢ × Wᵢ) × TenureFactor + FairnessAdj` | Individual performance scores |

### How Manager's Review Rating Flows Into Employee's CPIS

```
Manager writes review
     │
     ├── Raw rating: 4.0 / 5.0
     │
     ├── Bias Detection on review text
     │   biasScore = 0.08 (low, acceptable)
     │
     ├── Manager's Trust Score
     │   volumeFactor = 1 / (1 + e^(-0.3 × (reviewCount - 5)))
     │   (If Preethi has reviewed 20 people over time: volumeFactor ≈ 0.99)
     │
     │   consistencyFactor = 1 - min(1, ((σ - 0.75) / 1.5)²)
     │   (If Preethi's rating σ = 0.65: consistencyFactor ≈ 0.99)
     │
     │   trustScore = (0.99 × 0.6 + 0.99 × 0.4) × 100 = 99
     │
     ├── Type Weight: MANAGER = 1.5
     │
     ├── Calibration (Z-Score Normalization)
     │   z = (4.0 - 3.9) / 0.65 = 0.154
     │   calibrated = 0.154 × 0.72 + 3.6 = 3.71
     │
     ├── Into Employee's CPIS RQS:
     │   normalizedRating = (3.71 / 5) × 100 = 74.2
     │   biasAdjusted = 74.2 × (1 - 0.08) = 68.3
     │   weight = (99/100) × 1.5 = 1.485
     │
     │   RQS = WHM(allRatings × weights) × 20
     │   (Weighted Harmonic Mean across ALL reviews of employee)
     │
     └── RQS feeds into CPIS at 20% weight
         CPIS impact = RQS × 0.20
```

---

## 6. Impact on Other Users

### How Manager Actions Affect Each Role

| Manager Action | Employee Impact | HR Admin Impact | Tenant Admin Impact |
|----------------|-----------------|-----------------|---------------------|
| **Write review** | CPIS RQS updated (weight 1.5x), employee notified | Review cycle progress updated | Org review completion metrics |
| **Create PIP** | Enters improvement plan, must acknowledge, regular check-ins | Notified for oversight, approves outcome | PIP rate tracked in org metrics |
| **Assign goal** | New goal in dashboard, alignment bonus in CPIS GAI | Goal alignment visible in org tree | Org goal completion metrics |
| **Schedule 1-on-1** | Meeting notification, sees agenda/notes | Meeting analytics updated | Org engagement metrics |
| **Give feedback** | CPIS FSI updated, notification | Feedback volume tracked | Org feedback metrics |
| **Calibrate rating** | Final rating changes (may go up/down ±0.5) | Calibration impact analysis | Rating distribution shifts |
| **Generate report** | Data included (aggregated) | Report visible in admin view | Org-wide report metrics |
| **Create delegation** | Delegatee gains temp authority | RBAC dashboard updated | Delegation tracked in audit |
| **Upload Excel** | New colleagues appear in team | Seat count updated | License utilization changes |
| **AI approval** | Goal/plan created in employee's account | AI usage tracked | Token cost tracked |
| **Flag anomaly** | May lead to coaching/PIP | Anomaly patterns visible | Org health metrics |

### How Other Users' Actions Affect the Manager

| Other's Action | Effect on Manager |
|---------------|-------------------|
| **Admin creates review cycle** | Manager must review all direct reports by deadline |
| **Admin creates calibration** | Manager invited to participate |
| **Employee submits self-review** | Manager can view before writing review |
| **Employee updates goal** | Goal progress visible in team dashboard |
| **Employee submits pulse** | Team pulse aggregates updated |
| **Peer gives feedback to report** | Visible in team feedback timeline |
| **AI agent flags burnout** | Manager notified, insight card created |
| **Admin changes team structure** | Direct reports list changes |
| **Admin changes role** | May gain/lose management features |
| **Admin suspends tenant** | All write operations blocked |

---

## 7. Testing Segments

### [MGR-01] Manager Dashboard
**Priority:** Critical | **Est. Time:** 30 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Login as preethisivachandran0@gmail.com | Dashboard loads with team data |
| 2 | Verify team size card | Shows correct direct report count |
| 3 | Verify avg goal progress | Calculated from team goals |
| 4 | Verify pending reviews count | Matches assigned manager reviews |
| 5 | Verify action items list | Overdue items highlighted |
| 6 | Verify goals at risk list | Shows HIGH/CRITICAL goals |
| 7 | Verify license usage widget | Shows seat allocation |
| 8 | Verify recent uploads widget | Shows Excel upload history |
| 9 | Click on team member → navigates to detail | Profile loads |
| 10 | Cannot access admin routes (users, config, audit) | 403 or redirect |

### [MGR-02] Team Analytics & CPIS
**Priority:** Critical | **Est. Time:** 40 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | GET /performance-math/team/me | Returns teamSize, avgScore, z-scores |
| 2 | Verify z-score categories | HIGH (>+1), AVERAGE, LOW (<-1) |
| 3 | Verify score spread (σ) | Standard deviation calculated |
| 4 | Verify rating entropy | Shannon entropy normalized 0-1 |
| 5 | Verify gini coefficient | Inequality measure 0-1 |
| 6 | Verify velocity trend | Linear regression slope |
| 7 | View individual CPIS for team member | All 8 dimensions scored |
| 8 | Verify CPIS formula breakdown | Transparent calculation trace |
| 9 | Cannot view CPIS of non-team member | 403 Forbidden |
| 10 | Team insights page loads with charts | Performance distribution visible |

### [MGR-03] Writing Manager Reviews
**Priority:** Critical | **Est. Time:** 45 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View pending reviews list | All team reviews shown with deadlines |
| 2 | View employee's self-review before writing | Self-review visible |
| 3 | Draft manager review (save draft) | Draft saved, not submitted |
| 4 | Submit manager review | Status SUBMITTED, employee notified |
| 5 | Bias detection on review text | biasScore calculated (0-1) |
| 6 | High-bias text flagged | Warning shown if biasScore > 0.3 |
| 7 | Verify manager review weight = 1.5 | Higher than peer (1.0) and self (0.5) |
| 8 | Cannot edit after submission | Edit blocked |
| 9 | Verify CPIS RQS updates for reviewee | Calibrated rating used |
| 10 | Review moderation page loads | Can moderate team reviews |

### [MGR-04] One-on-One Management
**Priority:** High | **Est. Time:** 30 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Schedule 1-on-1 with direct report | Meeting created, employee notified |
| 2 | View upcoming meetings | List with dates and employees |
| 3 | Start meeting | Status IN_PROGRESS |
| 4 | Add notes and action items | Saved with timestamps |
| 5 | Complete meeting | Status COMPLETED, duration tracked |
| 6 | View meeting analytics | Frequency per report, coverage chart |
| 7 | Verify CPIS CIS updated (both parties) | 1-on-1 count incremented |
| 8 | Cannot schedule with non-report | Scoped to direct reports |

### [MGR-05] Goal Assignment & Risk
**Priority:** High | **Est. Time:** 35 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Create goal for direct report | Goal created in employee's account |
| 2 | Create aligned goal (linked to team goal) | Alignment shown in tree |
| 3 | View team goal tree | Hierarchical tree with all team goals |
| 4 | View goal risk assessment | 4 risk components scored |
| 5 | Verify alignment bonus in CPIS GAI | Aᵢ = 1 + (depth × 0.03) |
| 6 | Track progress on team goals | Progress history visible |
| 7 | Cannot assign goal to non-report | Scope: team only |

### [MGR-06] PIP Management
**Priority:** High | **Est. Time:** 35 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Create PIP for underperforming report | PIP ACTIVE, employee notified |
| 2 | Add milestones with due dates | Milestones saved |
| 3 | Employee acknowledges PIP | Acknowledgment timestamp recorded |
| 4 | Add check-in notes | Progress tracked per check-in |
| 5 | Update milestone status | COMPLETED / IN_PROGRESS |
| 6 | Close PIP (successful) | Outcome recorded |
| 7 | Close PIP (terminated) | Outcome recorded, HR notified |
| 8 | Cannot create PIP for non-report | Scope: team only |

### [MGR-07] Calibration Participation
**Priority:** High | **Est. Time:** 30 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View invited calibration session | Session details visible |
| 2 | View team ratings (raw vs calibrated) | Z-score adjustments shown |
| 3 | Make evidence-based rating adjustment | Adjustment saved with reason |
| 4 | View calibration impact on team | Before/after comparison |
| 5 | Cannot create calibration session | Manager can participate, not create |
| 6 | Verify CPIS RQS uses calibrated ratings | Post-calibration recalculation |

### [MGR-08] Engagement & Wellbeing
**Priority:** High | **Est. Time:** 30 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View engagement overview | Score, trend, department breakdown |
| 2 | View at-risk employees | Declining engagement flagged |
| 3 | View pulse analytics (team) | Aggregated/anonymized pulse data |
| 4 | View wellbeing dashboard | Burnout risk indicators |
| 5 | View real-time workload | Team capacity visualization |
| 6 | View activity heatmap | Weekly activity patterns |
| 7 | View anomaly detection | Performance drops flagged |
| 8 | View benchmark comparison | Team vs org averages |

### [MGR-09] Delegation Management
**Priority:** Medium | **Est. Time:** 20 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Create ACTING_MANAGER delegation | Delegatee gains manager perms |
| 2 | Create PROXY_APPROVER delegation | Delegatee can approve on behalf |
| 3 | Verify delegatee access during period | authorize.ts passes checks |
| 4 | Verify delegation expires on endDate | Permissions automatically revoked |
| 5 | View active delegations | List with status |

### [MGR-10] Reports & Scheduling
**Priority:** Medium | **Est. Time:** 20 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Generate team performance report | Report generated, downloadable |
| 2 | Schedule weekly recurring report | Schedule saved |
| 3 | Pause scheduled report | Report paused |
| 4 | Resume scheduled report | Report resumed |
| 5 | View report history | Past reports listed |

### [MGR-11] Excel Upload
**Priority:** Medium | **Est. Time:** 20 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Download template | Excel template downloaded |
| 2 | Upload and analyze | Preview with validation results |
| 3 | Confirm upload | Users created, emails sent |
| 4 | View upload history | Past uploads visible |
| 5 | Upload blocked if subscription expired | Subscription guard active |

### [MGR-12] AI Agent Interaction
**Priority:** Medium | **Est. Time:** 25 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Chat: "Who on my team needs help?" | workforce_intel agent responds with data |
| 2 | Chat: "Draft development plan for [member]" | career agent drafts plan |
| 3 | Approve AI-created goal for team member | Goal created in member's account |
| 4 | Reject AI action | Action cancelled |
| 5 | Verify data scoping (team only) | Agent can't access other teams |
| 6 | View AI usage for team | Token/cost stats |

### [MGR-13] Feedback & Recognition (Team View)
**Priority:** Medium | **Est. Time:** 20 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View team feedback timeline | All team members' feedback visible |
| 2 | Give feedback to direct report | Feedback saved, employee notified |
| 3 | Give recognition to team member | Appears on wall |
| 4 | View feedback trends for team | Volume and sentiment over time |
| 5 | Cannot view non-team feedback | Scoped to direct reports |

### [MGR-14] Compensation & Promotions
**Priority:** Medium | **Est. Time:** 15 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View team compensation data | Salary/equity info for reports |
| 2 | View promotion eligibility | CPIS-based eligible list |
| 3 | Track promotion pipeline | Pending/approved for team |

---

### Testing Timeline Summary

```
[MGR-01]  Manager Dashboard         ██████      30 min  CRITICAL
[MGR-02]  Team Analytics & CPIS     ████████    40 min  CRITICAL
[MGR-03]  Manager Reviews           █████████   45 min  CRITICAL
[MGR-04]  One-on-One Management     ██████      30 min  HIGH
[MGR-05]  Goal Assignment & Risk    ███████     35 min  HIGH
[MGR-06]  PIP Management            ███████     35 min  HIGH
[MGR-07]  Calibration               ██████      30 min  HIGH
[MGR-08]  Engagement & Wellbeing    ██████      30 min  HIGH
[MGR-09]  Delegation Management     ████        20 min  MEDIUM
[MGR-10]  Reports & Scheduling      ████        20 min  MEDIUM
[MGR-11]  Excel Upload              ████        20 min  MEDIUM
[MGR-12]  AI Agent Interaction      █████       25 min  MEDIUM
[MGR-13]  Feedback & Recognition    ████        20 min  MEDIUM
[MGR-14]  Compensation & Promotions ███         15 min  MEDIUM
                                    ────────────────────
                                    Total: ~6.6 hours
```

---

### Cross-Reference: Manager Feature → CPIS Dimension Impact

```
┌──────────────────────────────────────────────────────────────────────┐
│  MANAGER ACTION → EMPLOYEE CPIS DIMENSION IMPACT                     │
│                                                                      │
│  Manager writes review         → RQS (20%)  Weight 1.5x (highest)   │
│  Manager assigns aligned goal  → GAI (25%)  Alignment bonus +3%/lvl │
│  Manager gives feedback        → FSI (12%)  Sentiment EWMA updated  │
│  Manager conducts 1-on-1       → CIS (10%)  Both parties' count++   │
│  Manager completes calibration → RQS (20%)  Calibrated ratings used │
│  Manager creates PIP           → CRI (10%)  PIP milestones tracked  │
│  Manager flags performance     → triggers re-evaluation of CPIS     │
│  Manager approves AI action    → varies (goal→GAI, plan→GTS, etc.)  │
│                                                                      │
│  Manager's OWN CPIS also affected by:                               │
│  ● Own goals completion      → GAI (25%)                             │
│  ● Reviews received          → RQS (20%)                             │
│  ● Feedback given/received   → FSI (12%) + CIS (10%)                │
│  ● 1-on-1s conducted        → CIS (10%)                             │
│  ● Consistent delivery      → CRI (10%)                             │
│  ● Skills & development     → GTS (8%)                              │
│  ● Evidence uploaded        → EQS (8%)                              │
│  ● Mentoring & initiative   → III (7%)                              │
└──────────────────────────────────────────────────────────────────────┘
```

---

> **Dependencies:**
> - [SA-01] Tenant must exist
> - [TA-01] Manager user (preethisivachandran0@gmail.com) must be onboarded with MANAGER role
> - [TA-01] Direct reports must be created under this manager
> - [TA-02] Review cycle must be active for review testing [MGR-03]
> - [TA-04] Calibration session must be created for [MGR-07]
> - Manager tests can run in parallel with Employee tests (different user sessions)
>
> **Updated Total Testing Time Across All 5 Documents:**
> - Infrastructure: ~2 hours
> - Super Admin [SA-01 to SA-12]: ~5.5 hours
> - Tenant Admin/HR Admin [TA-01 to TA-18]: ~8.5 hours
> - **Manager [MGR-01 to MGR-14]: ~6.6 hours**
> - Employee [EMP-01 to EMP-16]: ~5.8 hours
> - AI Agents: ~3 hours
> - Math Engine: ~2.5 hours
> - Integration: ~3 hours
> - **Grand Total: ~37 hours (5 working days)**
