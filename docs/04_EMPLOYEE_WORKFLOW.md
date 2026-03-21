# PMS Platform - Employee Workflow & Testing Segments

> **Role:** Employee (EMPLOYEE)
> **Scope:** Own data only (userId matches)
> **App:** Web App (`apps/web/`)
> **API Base:** `/api/v1/`

---

## Table of Contents

1. [Role Overview](#1-role-overview)
2. [Feature Map & Access Matrix](#2-feature-map--access-matrix)
3. [Workflow Diagrams](#3-workflow-diagrams)
4. [Feature Workflows with Expected Outcomes](#4-feature-workflows-with-expected-outcomes)
5. [Mathematical Equations That Affect Employees](#5-mathematical-equations-that-affect-employees)
6. [Impact on Other Users](#6-impact-on-other-users)
7. [Testing Segments](#7-testing-segments)

---

## 1. Role Overview

The **Employee** is the base-level user who interacts with the PMS platform for personal performance management. All data access is **self-scoped** - employees can only see their own goals, reviews, feedback, and scores.

```
┌──────────────────────────────────────────────────────────────────┐
│                    EMPLOYEE SCOPE                                 │
│                                                                   │
│  ┌─────────────────────────────────────────────┐                 │
│  │              SELF (Own Data)                 │                 │
│  │                                              │                 │
│  │  ● My Goals & Progress                       │                 │
│  │  ● My Reviews (assigned to me)               │                 │
│  │  ● My Feedback (given & received)            │                 │
│  │  ● My CPIS Score & Dimensions                │                 │
│  │  ● My Development Plans                      │                 │
│  │  ● My Skills & Career Path                   │                 │
│  │  ● My 1-on-1s with Manager                   │                 │
│  │  ● My Pulse Surveys                          │                 │
│  │  ● My Notifications                          │                 │
│  │  ● My AI Conversations                       │                 │
│  │  ● My Check-ins                              │                 │
│  │  ● My Mentoring (as mentee)                  │                 │
│  │  ● My Recognition (give & receive)           │                 │
│  └─────────────────────────────────────────────┘                 │
│                                                                   │
│  CANNOT ACCESS:                                                   │
│  ✗ Other employees' goals/reviews/scores                          │
│  ✗ Team analytics / manager dashboard                             │
│  ✗ Calibration sessions                                           │
│  ✗ Admin features (user mgmt, config, audit)                     │
│  ✗ HR analytics, succession, compliance                          │
│  ✗ PIP management (can only view own PIP)                        │
│  ✗ Compensation management                                       │
│  ✗ Report generation                                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Feature Map & Access Matrix

### Employee-Accessible Features

| # | Feature | Route | API Endpoint | Description |
|---|---------|-------|-------------|-------------|
| 1 | **Dashboard** | `/dashboard` | `GET /api/v1/analytics/dashboard` | Personal KPIs, recent activity |
| 2 | **Goals** | `/goals` | `CRUD /api/v1/goals` (own scope) | Create, track, update personal goals |
| 3 | **Goal Detail** | `/goals/:id` | `GET /api/v1/goals/:id` | Goal progress, history, comments |
| 4 | **Reviews** | `/reviews` | `GET /api/v1/reviews` (own) | View assigned reviews, submit |
| 5 | **Review Detail** | `/reviews/:id` | `GET/PUT /api/v1/reviews/:id` | Draft, submit, acknowledge |
| 6 | **Self-Appraisal** | `/self-appraisal` | via Reviews API | Self-review form |
| 7 | **Feedback** | `/feedback` | `CRUD /api/v1/feedback` | Give/receive peer feedback |
| 8 | **Recognition** | `/recognition` | `CRUD /api/v1/recognition` | Give/view recognition posts |
| 9 | **One-on-Ones** | `/one-on-ones` | `CRUD /api/v1/one-on-ones` | Schedule/view 1-on-1s with manager |
| 10 | **Development** | `/development` | `CRUD /api/v1/development` | Personal development plans |
| 11 | **Skills** | `/skills` | `GET/PUT /api/v1/skills` | Skill self-assessment, matrix |
| 12 | **Career Path** | `/career` | `GET /api/v1/career` | Career visualization, growth requirements |
| 13 | **Mentoring** | `/mentoring` | `CRUD /api/v1/mentoring` | Find mentor, track sessions |
| 14 | **Pulse Survey** | `/pulse` | `POST /api/v1/pulse` | Daily mood/sentiment submission |
| 15 | **Check-ins** | `/checkins` | `CRUD /api/v1/checkins` | Weekly/monthly reflections |
| 16 | **Leaderboard** | `/leaderboard` | `GET /api/v1/leaderboard` | Performance/goal/recognition rankings |
| 17 | **Chat** | `/chat` | `CRUD /api/v1/chat` | Direct messages, group chats, channels |
| 18 | **Directory** | `/directory` | `GET /api/v1/users` (limited) | Employee directory lookup |
| 19 | **Org Chart** | `/org-chart` | `GET /api/v1/users/org-chart` | Organizational hierarchy view |
| 20 | **Calendar** | `/calendar` | `CRUD /api/v1/calendar` | Events, meetings |
| 21 | **Announcements** | `/announcements` | `GET /api/v1/announcements` | Company announcements (read-only) |
| 22 | **Notifications** | `/notifications` | `GET /api/v1/notifications` | Personal notification feed |
| 23 | **Profile** | `/profile` | `GET/PUT /api/v1/users/me` | Edit profile, upload avatar |
| 24 | **Settings** | `/settings` | `PUT /api/v1/users/me/settings` | Notification preferences |
| 25 | **AI Chat** | (embedded) | `POST /api/v1/ai/chat` | AI assistant conversations |
| 26 | **Help** | `/help` | `GET /api/v1/ai/chat` (help_assistant) | PMS knowledge base chatbot |
| 27 | **Evidence** | `/evidence` | `CRUD /api/v1/evidence` | Upload work evidence |

---

## 3. Workflow Diagrams

### 3.1 Employee Daily Workflow

```
┌──────────────────────────────────────────────────────────────────┐
│                  TYPICAL EMPLOYEE DAY                              │
│                                                                   │
│  Morning:                                                         │
│  ├── Login → Dashboard                                            │
│  ├── Check notifications (reviews due, feedback received)         │
│  ├── Submit pulse survey (daily mood/sentiment)                   │
│  └── Review goal progress                                         │
│                                                                   │
│  During Work:                                                     │
│  ├── Update goal progress (% complete)                            │
│  ├── Give feedback to peer                                        │
│  ├── Give recognition to colleague                                │
│  ├── Chat with team members                                       │
│  ├── Upload evidence for completed work                           │
│  ├── Ask AI assistant for help                                    │
│  └── Attend 1-on-1 with manager                                  │
│                                                                   │
│  Weekly:                                                          │
│  ├── Submit weekly check-in                                       │
│  ├── Update skill assessments                                     │
│  ├── Review development plan progress                             │
│  └── Check leaderboard rankings                                   │
│                                                                   │
│  Periodically:                                                    │
│  ├── Complete self-review (during review cycle)                   │
│  ├── Complete peer reviews (when assigned)                        │
│  ├── Update career path goals                                     │
│  ├── Attend mentoring sessions                                    │
│  └── Acknowledge PIP (if applicable)                              │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Goal Management Workflow

```
[EMP-01] GOAL MANAGEMENT WORKFLOW

Employee
     │
     ├── 1. Create Goal
     │   POST /api/v1/goals
     │   {
     │     title: "Complete React certification",
     │     description: "...",
     │     priority: "HIGH",         // CRITICAL, HIGH, MEDIUM, LOW
     │     weight: 2,                // Importance (1-10)
     │     dueDate: "2026-06-30",
     │     complexity: 3,            // 1-5
     │     alignedToId: teamGoalId   // Optional: align to manager's goal
     │   }
     │
     ├── 2. Update Progress
     │   PUT /api/v1/goals/:id
     │   { progress: 45 }            // 0-100
     │   │
     │   ├── Progress history recorded
     │   ├── Velocity calculated (progress per day)
     │   └── Goal risk reassessed
     │
     ├── 3. View Goal Risk
     │   GET /api/v1/performance-math/goal-risk/:goalId
     │   │
     │   ┌────────────────────────────────────────────────┐
     │   │ GOAL RISK ASSESSMENT                           │
     │   │                                                │
     │   │ Overall Risk: 35 (MEDIUM)                      │
     │   │                                                │
     │   │ Components:                                    │
     │   │ ● Schedule Risk:   40%  (behind expected pace) │
     │   │ ● Velocity Risk:   25%  (acceptable velocity)  │
     │   │ ● Dependency Risk: 30%  (blocker at medium risk)│
     │   │ ● Complexity Risk: 45%  (complex + much left)  │
     │   │                                                │
     │   │ Current Velocity:  2.1 progress/day            │
     │   │ Required Velocity: 3.5 progress/day            │
     │   │ Projected Completion: 2026-07-15 (15 days late)│
     │   │                                                │
     │   │ Risk Formula:                                  │
     │   │ 0.40×Schedule + 0.30×Velocity                  │
     │   │ + 0.15×Dependency + 0.15×Complexity            │
     │   │ = 0.40(40) + 0.30(25) + 0.15(30) + 0.15(45)  │
     │   │ = 16 + 7.5 + 4.5 + 6.75 = 34.75 → MEDIUM     │
     │   └────────────────────────────────────────────────┘
     │
     ├── 4. Add Comments
     │   POST /api/v1/goals/:id/comments
     │   { content: "Blocked by API team, discussing workaround" }
     │
     ├── 5. Complete Goal
     │   PUT /api/v1/goals/:id
     │   { progress: 100, status: 'COMPLETED' }
     │   │
     │   ├── Goal Composite Score calculated
     │   ├── CPIS GAI dimension updated
     │   └── Manager notified
     │
     └── 6. View Goal Tree
         GET /api/v1/goals
         │
         Shows all personal goals with alignment to team/org goals

     EFFECT ON OTHER USERS:
     ● Manager: Sees goal progress in team dashboard, gets completion notification
     ● Aligned goals: Parent goal progress may be affected
     ● CPIS: GAI dimension recalculated
     ● Leaderboard: Goal completion ranking updated
```

### 3.3 Review & Self-Appraisal Workflow

```
[EMP-02] REVIEW WORKFLOW

Employee
     │
     ├── 1. Notification: "Review Cycle Launched"
     │   (Triggered by Tenant Admin launching cycle)
     │
     ├── 2. Complete Self-Review
     │   GET /api/v1/reviews?type=SELF&status=PENDING
     │   │
     │   ├── View review form with rating criteria
     │   │
     │   PUT /api/v1/reviews/:id
     │   {
     │     ratings: { goals: 4, teamwork: 5, initiative: 3 },
     │     comments: "I exceeded my goal targets by 15%...",
     │     status: 'DRAFT'        // Save as draft first
     │   }
     │   │
     │   POST /api/v1/reviews/:id/submit
     │   │
     │   └── Status: SUBMITTED
     │       Self-review weight in CPIS RQS: 0.5 (lowest)
     │
     ├── 3. Complete Peer Reviews (if assigned)
     │   GET /api/v1/reviews?type=PEER&reviewerId=me&status=PENDING
     │   │
     │   For each peer:
     │   PUT /api/v1/reviews/:id
     │   { ratings: {...}, comments: "..." }
     │   POST /api/v1/reviews/:id/submit
     │   │
     │   Your review → Affects peer's CPIS RQS
     │   Your trust score → Weights your review
     │   │
     │   Bias Detection runs on your review text:
     │   ● Checks for 12 bias types
     │   ● biasScore stored (0-1)
     │   ● High bias → Rating discounted in CPIS
     │
     ├── 4. Receive Manager Review
     │   (Manager submits review of you)
     │   │
     │   GET /api/v1/reviews?revieweeId=me&type=MANAGER
     │   │
     │   Manager review weight in CPIS RQS: 1.5 (highest)
     │
     ├── 5. View Calibrated Results
     │   (After calibration session completes)
     │   │
     │   ┌────────────────────────────────────────────────┐
     │   │ YOUR REVIEW RESULTS                            │
     │   │                                                │
     │   │ Self-Assessment:  4.2 / 5.0                    │
     │   │ Peer Average:     3.8 / 5.0  (3 reviewers)    │
     │   │ Manager Rating:   4.0 / 5.0                    │
     │   │                                                │
     │   │ Calibrated Rating: 3.9 / 5.0                   │
     │   │ (Adjusted by Z-score normalization)             │
     │   │                                                │
     │   │ Calibration Formula Applied:                   │
     │   │ z = (4.0 - 3.5) / 0.8 = 0.625                 │
     │   │ calibrated = 0.625 × 0.7 + 3.8 = 4.24         │
     │   │ → Clamped to [1, 5]                            │
     │   └────────────────────────────────────────────────┘
     │
     └── 6. Acknowledge Review
         POST /api/v1/reviews/:id/acknowledge
         │
         └── Review acknowledged, cycle for this employee complete

     EFFECT ON OTHER USERS:
     ● Self-review: Contributes to own CPIS RQS (weight 0.5)
     ● Peer reviews: Directly affect peer's CPIS RQS (weight 1.0)
     ● Manager: Sees self-review before writing manager review
     ● Calibration: Your ratings may be adjusted ±0.5 during calibration
     ● YOUR trust score affects how much your peer reviews matter:
       trustScore = (volumeFactor × 0.6 + consistencyFactor × 0.4) × 100
```

### 3.4 Feedback & Recognition Workflow

```
[EMP-03] FEEDBACK & RECOGNITION WORKFLOW

Employee
     │
     ├── Give Feedback
     │   POST /api/v1/feedback
     │   {
     │     receiverId: peerUserId,
     │     type: 'PRAISE',           // PRAISE, CONSTRUCTIVE, RECOGNITION
     │     content: "Great presentation skills in the Q1 demo...",
     │     skillTags: ['communication', 'presentation'],
     │     valueTags: ['innovation']
     │   }
     │   │
     │   ├── Sentiment auto-analyzed (0 to 1)
     │   ├── 30-second grace period for edit/delete
     │   ├── Receiver notified
     │   │
     │   Effect on RECEIVER's CPIS:
     │   ├── FSI Dimension: sentiment added to EWMA
     │   │   EWMA(sentiments, α=0.35)
     │   │   Quality multiplier: base 1.0 + 0.1(skillTags) + 0.1(valueTags)
     │   │
     │   └── CIS Dimension: feedbackReceived count incremented
     │       feedbackReceivedScore = boundedSigmoid(count, 0, 100, k=0.3, x₀=5)
     │
     ├── Give Recognition
     │   POST /api/v1/recognition
     │   {
     │     recipientId: colleagueId,
     │     message: "Thank you for staying late to fix the production bug!",
     │     badge: 'TEAM_PLAYER'
     │   }
     │   │
     │   ├── Appears on Recognition Wall
     │   ├── Leaderboard: recognition counts updated
     │   │
     │   Effect on YOUR CPIS CIS Dimension:
     │   recognitionScore = boundedSigmoid(recognitionsGiven, 0, 100, k=0.5, x₀=3)
     │
     ├── Receive Feedback
     │   GET /api/v1/feedback?receiverId=me
     │   │
     │   ├── View feedback timeline
     │   ├── Acknowledge feedback
     │   └── Sentiment contributes to YOUR CPIS FSI
     │
     ├── Request Feedback
     │   POST /api/v1/feedback/requests
     │   { requestedFromId: peerId, context: "Q1 project collaboration" }
     │   │
     │   └── Peer receives notification to provide feedback
     │
     └── View Recognition Wall
         GET /api/v1/recognition
         │
         └── Public feed of all recognition posts in tenant

     EFFECT ON OTHER USERS:
     ● Feedback RECEIVER: Their CPIS FSI + CIS dimensions updated
     ● Recognition RECIPIENT: Appears on wall, leaderboard updated
     ● YOUR CPIS: CIS dimension (feedbackGiven, recognitionsGiven) updated
     ● Manager: Sees feedback activity in team dashboard
```

### 3.5 Skill & Development Workflow

```
[EMP-04] SKILLS & DEVELOPMENT WORKFLOW

Employee
     │
     ├── Skill Self-Assessment
     │   GET /api/v1/skills/matrix?userId=me
     │   │
     │   ┌────────────────────────────────────────┐
     │   │ MY SKILL MATRIX                        │
     │   │                                        │
     │   │ Technical:                              │
     │   │ ● React:      ████████░░  4/5          │
     │   │ ● TypeScript:  ███████░░░  3.5/5       │
     │   │ ● Node.js:    ██████░░░░  3/5          │
     │   │                                        │
     │   │ Soft Skills:                            │
     │   │ ● Leadership:  █████░░░░░  2.5/5       │
     │   │ ● Communication:████████░░  4/5        │
     │   │                                        │
     │   │ Skill Gaps (vs role requirements):      │
     │   │ ● Node.js: Need 4, Have 3 (gap: -1)   │
     │   │ ● Leadership: Need 3, Have 2.5 (-0.5)  │
     │   └────────────────────────────────────────┘
     │
     │   PUT /api/v1/skills/assessments
     │   { skillId, rating: 4, evidence: "Completed advanced course" }
     │   │
     │   Effect on CPIS GTS:
     │   skillGrowth = sigmoid(skillProgressions, k=0.5, x₀=3) × 100
     │
     ├── Development Plan
     │   GET /api/v1/development/plans?userId=me
     │   │
     │   ├── View current plan (activities, checkpoints)
     │   │
     │   PUT /api/v1/development/plans/:id/activities/:actId
     │   { status: 'COMPLETED', completedAt: '2026-03-15' }
     │   │
     │   Effect on CPIS GTS:
     │   devPlanProgress = (completedActivities / totalActivities) × 100
     │
     ├── AI Development Recommendations
     │   POST /api/v1/ai/chat
     │   { message: "What skills should I develop for promotion to L4?" }
     │   │
     │   Agent: career agent analyzes:
     │   ● Current skills vs L4 requirements
     │   ● CPIS growth areas
     │   ● Industry trends
     │   └── Returns personalized learning plan
     │
     ├── Career Path Visualization
     │   GET /api/v1/career?userId=me
     │   │
     │   ┌────────────────────────────────────────┐
     │   │ CAREER PATH                             │
     │   │                                         │
     │   │ Current: L3 Software Engineer           │
     │   │    │                                    │
     │   │    ▼                                    │
     │   │ Next: L4 Senior Software Engineer       │
     │   │ Gap: Leadership (2.5 → 3.0 needed)     │
     │   │ Gap: System Design (new requirement)    │
     │   │ Readiness: 72%                          │
     │   │    │                                    │
     │   │    ▼                                    │
     │   │ Future: L5 Staff Engineer               │
     │   │ Readiness: 35%                          │
     │   └────────────────────────────────────────┘
     │   │
     │   Effect on CPIS GTS:
     │   readinessScore = promotionReadinessPercentage (0-100)
     │
     └── Mentoring
         POST /api/v1/mentoring/requests
         { mentorId, focusAreas: ['leadership', 'system-design'] }
         │
         GET /api/v1/mentoring/sessions
         │
         Effect on CPIS III:
         mentoringScore = sigmoid(mentoringSessions, k=0.4, x₀=3) × 100

     EFFECT ON OTHER USERS:
     ● Manager: Sees skill gaps, development progress in team view
     ● Mentor: Receives mentoring request, tracks sessions
     ● HR: Sees org-wide skill heatmap, identifies training needs
     ● CPIS: GTS (growth) + III (initiative) dimensions updated
```

### 3.6 Pulse Survey & Check-in Workflow

```
[EMP-05] PULSE & CHECK-IN WORKFLOW

Employee
     │
     ├── Daily Pulse Survey
     │   POST /api/v1/pulse
     │   {
     │     mood: 4,               // 1-5 scale
     │     energyLevel: 3,
     │     stressLevel: 2,
     │     workLifeBalance: 4,
     │     comments: "Productive day, wrapped up the sprint"
     │   }
     │   │
     │   ├── Sentiment tracked over time
     │   ├── EWMA smoothing applied
     │   └── Manager sees aggregated team pulse (anonymized)
     │
     ├── Weekly Check-in
     │   POST /api/v1/checkins
     │   {
     │     type: 'WEEKLY',
     │     goalProgress: "Completed 3 of 5 sprint tasks",
     │     blockers: "Waiting for API spec from backend team",
     │     nextWeekPlan: "Focus on integration testing",
     │     mood: 'GOOD'
     │   }
     │   │
     │   ├── Tracked in check-in history
     │   ├── Manager notified of blockers
     │   │
     │   Effect on CPIS CRI:
     │   streakDays incremented (consistent check-in = streak)
     │   streakFactor = sigmoid(streakDays, k=0.1, x₀=14) × 100
     │
     └── View Pulse Trends
         GET /api/v1/pulse/analytics (limited to own data for employees)
         │
         ┌────────────────────────────────────────┐
         │ MY PULSE TREND (Last 30 Days)          │
         │                                        │
         │ Mood:     ████████░░  3.8 avg          │
         │ Energy:   ███████░░░  3.5 avg          │
         │ Stress:   ████░░░░░░  2.0 avg (good)   │
         │ Balance:  ████████░░  3.7 avg          │
         │                                        │
         │ Trend: Slightly improving ↗             │
         └────────────────────────────────────────┘

     EFFECT ON OTHER USERS:
     ● Manager: Sees team pulse trends (anonymized/aggregated)
     ● AI Agents: Burnout detection agent monitors stress patterns
     ● HR: Engagement dashboard shows org-wide pulse metrics
```

### 3.7 AI Assistant Workflow

```
[EMP-06] AI CHAT WORKFLOW

Employee
     │
     ├── Chat with AI
     │   POST /api/v1/ai/chat
     │   { message: "Help me write SMART goals for Q2" }
     │   │
     │   ├── Orchestrator classifies → goal_intelligence agent
     │   │
     │   ├── Agent gathers YOUR data:
     │   │   ● Your current goals
     │   │   ● Your CPIS growth areas
     │   │   ● Your skill gaps
     │   │   ● Your department's objectives
     │   │
     │   └── Response: Personalized SMART goals drafted
     │
     ├── Agent writes goal (if approved)
     │   Agent calls: create_goal tool (HIGH_WRITE)
     │   │
     │   ├── Impact: HIGH_WRITE → Requires approval
     │   ├── AgentAction created: awaiting_approval
     │   │
     │   Employee gets notification:
     │   "AI wants to create goal: 'Complete AWS certification by Q2'"
     │   │
     │   POST /api/v1/ai/actions/:id/approve
     │   └── Goal created in your account
     │
     ├── Ask Help Assistant
     │   POST /api/v1/ai/chat
     │   { message: "How do I request feedback from a peer?" }
     │   │
     │   ├── Routed to: help_assistant agent
     │   ├── Uses: economy model (Gemini Flash - cheapest)
     │   ├── Always available (exempt from subscription check)
     │   └── Response: Step-by-step guide from PMS knowledge base
     │
     ├── Self-Review Drafting
     │   POST /api/v1/ai/chat
     │   { message: "Help me draft my self-review for Q1" }
     │   │
     │   ├── Routed to: review_drafter agent
     │   ├── Uses: premium model (Claude Sonnet 4 - best reasoning)
     │   │
     │   ├── Agent reads YOUR data:
     │   │   ● Completed goals + scores
     │   │   ● Feedback received
     │   │   ● Evidence uploaded
     │   │   ● Skill progressions
     │   │   ● Check-in history
     │   │
     │   └── Generates: Structured self-review draft
     │       (Employee must review and submit manually)
     │
     └── View Conversations
         GET /api/v1/ai/conversations
         │
         ├── List of past AI conversations
         ├── Can rename, archive
         └── Token usage tracked

     RATE LIMITS:
     ● 15 calls per minute per user
     ● 50,000 tokens per task
     ● $0.50 max cost per task
     ● Redis cache: 1hr TTL (repeated queries are free)

     EFFECT ON OTHER USERS:
     ● Manager: Sees AI usage in team overview (count, not content)
     ● Tenant Admin: Token/cost tracked in usage stats
     ● AI actions: Only affect YOUR data (own scope)
```

### 3.8 Evidence Upload Workflow

```
[EMP-07] EVIDENCE UPLOAD WORKFLOW

Employee
     │
     ├── Upload Evidence
     │   POST /api/v1/evidence
     │   {
     │     goalId: linkedGoalId,
     │     type: 'PROJECT_ARTIFACT',  // CODE, DOCUMENT, PRESENTATION, etc.
     │     title: "Q1 Dashboard Feature Implementation",
     │     description: "Led development of real-time analytics dashboard",
     │     url: "https://github.com/...",
     │     impactScore: 85,           // Self-assessed 0-100
     │     qualityScore: 80           // Self-assessed 0-100
     │   }
     │   │
     │   ├── Evidence linked to goal
     │   ├── Awaiting verification (by manager)
     │   │
     │   Effect on CPIS EQS Dimension:
     │   ● verificationRate = (verified / total) × 100
     │   ● avgImpact = mean(impactScores)
     │   ● avgQuality = mean(qualityScores)
     │   ● diversityBonus = sigmoid(uniqueTypes, k=0.5, x₀=3) × 100
     │   │
     │   EQS = 0.25×VerificationRate + 0.30×AvgImpact
     │         + 0.25×AvgQuality + 0.20×DiversityBonus
     │
     └── View Evidence Portfolio
         GET /api/v1/evidence?userId=me
         │
         ┌────────────────────────────────────────┐
         │ MY EVIDENCE PORTFOLIO                   │
         │                                        │
         │ Total: 8 items                         │
         │ Verified: 5 (62.5%)                    │
         │ Types: CODE(3), DOCUMENT(2),           │
         │        PRESENTATION(2), RESEARCH(1)    │
         │ Avg Impact: 78                         │
         │ Avg Quality: 75                        │
         │                                        │
         │ EQS = 0.25(62.5) + 0.30(78)           │
         │     + 0.25(75) + 0.20(sigmoid(4))      │
         │ = 15.6 + 23.4 + 18.75 + 17.6          │
         │ = 75.4                                 │
         └────────────────────────────────────────┘

     EFFECT ON OTHER USERS:
     ● Manager: Receives evidence for verification
     ● CPIS: EQS dimension directly updated
     ● Reviews: Evidence linked to goals supports review ratings
```

### 3.9 Chat & Messaging Workflow

```
[EMP-08] INTERNAL CHAT WORKFLOW

Employee
     │
     ├── Direct Message
     │   POST /api/v1/chat/conversations
     │   { type: 'DIRECT', participantIds: [peerId] }
     │   │
     │   POST /api/v1/chat/messages
     │   { conversationId, content: "Hey, can we sync on the API changes?" }
     │
     ├── Group Chat
     │   POST /api/v1/chat/conversations
     │   { type: 'GROUP', name: 'Q1 Sprint Team', participantIds: [...] }
     │
     ├── Team Channel
     │   (Admin-created team channels)
     │   POST /api/v1/chat/messages
     │   { conversationId: teamChannelId, content: "Sprint update..." }
     │
     ├── Features:
     │   ├── Edit message (within grace period)
     │   ├── Delete message
     │   ├── Pin important messages
     │   ├── React with emoji
     │   ├── Forward messages
     │   ├── Search messages
     │   └── Mute conversations
     │
     └── AI Email Drafting
         POST /api/v1/chat/email/draft
         { context: "Follow up on meeting with client", tone: "professional" }
         │
         └── AI drafts email for review before sending

     EFFECT ON OTHER USERS:
     ● Message recipients: See messages in real-time (Socket.IO)
     ● Team: Channel messages visible to all team members
     ● Pinned messages: Visible to all participants
```

### 3.10 One-on-One Meeting Workflow

```
[EMP-09] ONE-ON-ONE WORKFLOW

Employee
     │
     ├── View Upcoming 1-on-1s
     │   GET /api/v1/one-on-ones/upcoming
     │
     ├── Request 1-on-1
     │   POST /api/v1/one-on-ones
     │   { managerId, scheduledDate, agenda: "Q1 goal review" }
     │   │
     │   └── Manager notified
     │
     ├── During Meeting
     │   PUT /api/v1/one-on-ones/:id
     │   { notes: "...", actionItems: [...] }
     │
     └── Complete Meeting
         POST /api/v1/one-on-ones/:id/complete
         │
         Effect on CPIS CIS Dimension:
         oneOnOneScore = boundedSigmoid(oneOnOneCount, 0, 100, k=0.5, x₀=4)
         │
         Weight in CIS: 0.15

     EFFECT ON OTHER USERS:
     ● Manager: Receives meeting request, sees notes
     ● CPIS: CIS dimension updated (1-on-1 participation counted)
```

---

## 4. Feature Workflows with Expected Outcomes

### [EMP-10] Leaderboard & Rankings

```
Employee
     │
     ├── View Performance Leaderboard
     │   GET /api/v1/leaderboard/performance
     │   │
     │   ┌────────────────────────────────────────┐
     │   │ PERFORMANCE LEADERBOARD                │
     │   │                                        │
     │   │ #1  Alice Chen      CPIS: 92  ★★★★★   │
     │   │ #2  Bob Kumar       CPIS: 88  ★★★★    │
     │   │ #3  You             CPIS: 85  ★★★★    │
     │   │ #4  David Lee       CPIS: 82  ★★★★    │
     │   │ ...                                    │
     │   └────────────────────────────────────────┘
     │
     ├── View Goal Completion Leaderboard
     │   GET /api/v1/leaderboard/goals
     │
     ├── View Recognition Leaderboard
     │   GET /api/v1/leaderboard/recognition
     │   │
     │   └── Top recognized employees by count
     │
     └── View Personal Stats
         GET /api/v1/leaderboard/me
         │
         ├── Your rank: #3 of 50
         ├── Percentile: 94th
         └── Trend: ↗ +2 positions from last period
```

### [EMP-11] Notification System

```
Employee
     │
     ├── View Notifications
     │   GET /api/v1/notifications
     │   │
     │   Notification Types:
     │   ├── 🎯 Goal deadline approaching (3 days)
     │   ├── 📝 Review cycle launched, self-review due
     │   ├── 💬 Feedback received from peer
     │   ├── 🏆 Recognition received
     │   ├── 📅 1-on-1 meeting scheduled
     │   ├── 🤖 AI agent action needs approval
     │   ├── 📊 CPIS score updated
     │   ├── ⚠️  Goal risk: HIGH → needs attention
     │   ├── 📋 PIP assigned (if applicable)
     │   └── 📢 New company announcement
     │
     ├── Mark as Read
     │   PUT /api/v1/notifications/:id/read
     │
     ├── Bulk Mark Read
     │   PUT /api/v1/notifications/mark-all-read
     │
     └── Notification Preferences
         PUT /api/v1/users/me/settings
         { emailNotifications: true, pushNotifications: true,
           quietHours: { start: '22:00', end: '08:00' } }
```

### [EMP-12] PIP (Employee Perspective)

```
Employee (if PIP is assigned)
     │
     ├── Receive PIP Notification
     │   "A Performance Improvement Plan has been created for you"
     │
     ├── View PIP Details
     │   GET /api/v1/pip/:id
     │   │
     │   ┌────────────────────────────────────────┐
     │   │ PERFORMANCE IMPROVEMENT PLAN            │
     │   │                                        │
     │   │ Status: ACTIVE                         │
     │   │ Duration: 90 days                      │
     │   │ Start: 2026-03-01                      │
     │   │ End: 2026-05-30                        │
     │   │                                        │
     │   │ Milestones:                            │
     │   │ ✅ Week 2: Complete training course     │
     │   │ ⏳ Week 6: Achieve 70% goal completion │
     │   │ ⏳ Week 10: Get 3+ positive feedback    │
     │   │ ⏳ Week 12: CPIS score ≥ 50            │
     │   │                                        │
     │   │ Next Check-in: March 20, 2026          │
     │   └────────────────────────────────────────┘
     │
     ├── Acknowledge PIP
     │   POST /api/v1/pip/:id/acknowledge
     │   │
     │   └── Acknowledgment recorded with timestamp
     │
     └── Attend Check-ins
         (Manager-scheduled, employee participates)
         │
         └── Progress tracked against milestones

     EFFECT ON OTHER USERS:
     ● Manager: Tracks PIP progress, provides feedback at check-ins
     ● HR Admin: Reviews and approves PIP outcomes
```

---

## 5. Mathematical Equations That Affect Employees

### How Each Employee Action Feeds Into CPIS

```
┌─────────────────────────────────────────────────────────────────────┐
│              HOW YOUR ACTIONS AFFECT YOUR CPIS SCORE                │
│                                                                     │
│  ACTION                    → CPIS DIMENSION    → FORMULA            │
│  ───────────────────────────────────────────────────────────────     │
│                                                                     │
│  Complete goals on time    → GAI (25%)                              │
│    Each goal scored:       CS = (0.50×Completion + 0.30×Quality     │
│                                + 0.20×Timeliness) × Efficiency      │
│    GAI = Σ(Gᵢ × Wᵢ × Pᵢ × Tᵢ × Aᵢ) / Σ(Wᵢ)                    │
│    Priority bonus: CRITICAL=1.35, HIGH=1.15, MEDIUM=1.0, LOW=0.85 │
│    Alignment bonus: +3% per alignment level (max +15%)              │
│                                                                     │
│  Get good reviews         → RQS (20%)                              │
│    Your rating (1-5) weighted by:                                   │
│    ● Reviewer trust score (0-100)                                   │
│    ● Review type (Manager=1.5x, Peer=1.0x, Self=0.5x)             │
│    ● Bias discount (biasScore reduces rating weight)                │
│    RQS = WHM(calibratedRatings × trustWeights) × 20                │
│                                                                     │
│  Receive positive feedback → FSI (12%)                             │
│    FSI = EWMA(sentiment × qualityMultiplier, α=0.35) × 100         │
│    Recent feedback weighs MORE (exponential decay)                  │
│    Skill/value tags boost quality multiplier (+0.1 each)            │
│                                                                     │
│  Collaborate with others  → CIS (10%)                              │
│    6 channels measured via sigmoid normalization:                    │
│    ● Cross-functional goals    (weight 0.20, midpoint x₀=3)        │
│    ● Feedback given            (weight 0.15, midpoint x₀=5)        │
│    ● Feedback received         (weight 0.15, midpoint x₀=5)        │
│    ● One-on-one meetings       (weight 0.15, midpoint x₀=4)        │
│    ● Recognitions given        (weight 0.15, midpoint x₀=3)        │
│    ● Team goal contributions   (weight 0.20, midpoint x₀=2)        │
│    CIS = Σ(boundedSigmoid(count, 0, 100, k, x₀) × weight)         │
│                                                                     │
│  Deliver consistently     → CRI (10%)                              │
│    CRI = 0.30×OnTimeRate + 0.25×VelocityConsistency                │
│        + 0.20×StreakFactor + 0.15×RatingConsistency                │
│        + 0.10×DeadlineScore                                        │
│    Streak = consecutive active days (check-ins help!)               │
│                                                                     │
│  Grow your skills         → GTS (8%)                               │
│    GTS = 0.35×TrendScore + 0.20×SkillGrowth                        │
│        + 0.15×TrainingScore + 0.15×DevPlanProgress                 │
│        + 0.15×ReadinessScore                                       │
│    TrendScore: linear regression on historical CPIS scores          │
│    SkillGrowth: sigmoid(skillProgressions, k=0.5, x₀=3) × 100     │
│                                                                     │
│  Upload evidence          → EQS (8%)                               │
│    EQS = 0.25×VerificationRate + 0.30×AvgImpact                    │
│        + 0.25×AvgQuality + 0.20×DiversityBonus                    │
│    Diverse evidence types earn sigmoid bonus                        │
│                                                                     │
│  Show initiative          → III (7%)                               │
│    III = 0.25×Innovation + 0.20×Mentoring + 0.20×Knowledge         │
│        + 0.15×ProcessImprovements + 0.20×VoluntaryGoals            │
│    Each normalized: sigmoid(count, k, x₀) × 100                    │
│                                                                     │
│  ═══════════════════════════════════════════════════════════════     │
│                                                                     │
│  FINAL CPIS = Σ(Dimensionᵢ × Weightᵢ) × TenureFactor              │
│              + FairnessAdjustment                                   │
│                                                                     │
│  TenureFactor = min(1.12, 1 + years × 0.025)                       │
│  FairnessAdj = Bayesian shrinkage + disparate impact correction     │
│                                                                     │
│  GRADE:  A+(≥95) A(85-94) B+(78-84) B(70-77) C+(62-69)            │
│          C(50-61) D(35-49) F(<35)                                   │
│                                                                     │
│  STARS:  5★(≥90) 4★(75-89) 3★(55-74) 2★(35-54) 1★(<35)           │
│                                                                     │
│  RANK:   "Exceptional Performer"(≥95) → "Needs Support"(<35)       │
└─────────────────────────────────────────────────────────────────────┘
```

### Employee Actions Priority for CPIS Improvement

| Priority | Action | CPIS Impact | Dimension |
|----------|--------|-------------|-----------|
| 1 | Complete goals on time with quality | HIGH (25% weight) | GAI |
| 2 | Get strong manager/peer reviews | HIGH (20% weight) | RQS |
| 3 | Give & receive positive feedback | MEDIUM (12% weight) | FSI |
| 4 | Participate in cross-functional work | MEDIUM (10% weight) | CIS |
| 5 | Meet deadlines consistently | MEDIUM (10% weight) | CRI |
| 6 | Complete training & dev plans | LOW-MEDIUM (8%) | GTS |
| 7 | Upload verified work evidence | LOW-MEDIUM (8%) | EQS |
| 8 | Volunteer for extra work, mentor others | LOW (7%) | III |

---

## 6. Impact on Other Users

### How Employee Actions Affect Others

| Employee Action | Manager Impact | Peer Impact | HR Impact |
|-----------------|---------------|-------------|-----------|
| **Complete goal** | Team goal progress updated, notified | N/A | Org goal metrics updated |
| **Submit self-review** | Can see before writing manager review | N/A | Review cycle progress updated |
| **Write peer review** | N/A | Peer's CPIS RQS affected by your rating | Review completion tracked |
| **Give feedback** | Sees in team feedback view | Peer's CPIS FSI updated | Feedback volume tracked |
| **Give recognition** | Team recognition activity | Recipient on recognition wall | Engagement metrics |
| **Submit pulse** | Team pulse trend (anonymized) | N/A | Org engagement metrics |
| **Update skills** | Team skill matrix updated | N/A | Org skill heatmap |
| **Upload evidence** | Evidence for verification | N/A | Evidence quality metrics |
| **AI chat** | Usage stats tracked | N/A | Token/cost tracked |
| **Check-in** | Blocker notifications | N/A | Check-in rate tracked |
| **Request 1-on-1** | Meeting request notification | N/A | Meeting analytics |

### How Other Users' Actions Affect the Employee

| Other's Action | Effect on Employee |
|---------------|-------------------|
| **Admin creates review cycle** | Must complete self-review + peer reviews |
| **Manager reviews employee** | CPIS RQS updated (manager weight: 1.5x) |
| **Peer reviews employee** | CPIS RQS updated (peer weight: 1.0x) |
| **Calibration completed** | Final rating may change (Z-score normalization) |
| **Manager creates PIP** | Enters improvement program |
| **Admin changes role** | Feature access changes immediately |
| **Admin disables AI** | Cannot access AI chat/agents |
| **Peer gives feedback** | CPIS FSI updated, notification received |
| **Peer gives recognition** | Appears on recognition wall, leaderboard |
| **Admin suspends tenant** | All write operations blocked |

---

## 7. Testing Segments

### [EMP-01] Goal Management
**Priority:** Critical | **Est. Time:** 40 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Create personal goal | Goal appears in dashboard |
| 2 | Create aligned goal (linked to manager's goal) | Alignment shown in goal tree |
| 3 | Update goal progress (0→45→100) | Progress history recorded |
| 4 | View goal risk assessment | Risk score with 4 components |
| 5 | Add goal comments | Comment saved, visible |
| 6 | Complete goal | Status COMPLETED, CPIS GAI updated |
| 7 | Verify alignment bonus in CPIS | Aᵢ calculated correctly |
| 8 | Delete own goal | Goal removed (if not completed) |
| 9 | Cannot view other's goals | 403 Forbidden |

### [EMP-02] Review & Self-Appraisal
**Priority:** Critical | **Est. Time:** 45 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View pending reviews | Self + peer reviews listed |
| 2 | Draft self-review (save as draft) | Draft saved, not submitted |
| 3 | Submit self-review | Status SUBMITTED |
| 4 | Complete peer review | Rating stored, bias analyzed |
| 5 | View received manager review | Rating visible after cycle |
| 6 | View calibrated results | Calibrated rating shown |
| 7 | Acknowledge review | Acknowledgment recorded |
| 8 | Cannot view other's review of others | 403 Forbidden |
| 9 | Verify CPIS RQS updated | Calibrated ratings used |

### [EMP-03] Feedback & Recognition
**Priority:** High | **Est. Time:** 30 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Give praise feedback with skill tags | Feedback saved, receiver notified |
| 2 | Give constructive feedback | Sentiment < 0.5, saved |
| 3 | Edit feedback within 30 seconds | Edit succeeds |
| 4 | Edit feedback after 30 seconds | Edit fails (grace period expired) |
| 5 | Request feedback from peer | Peer receives request notification |
| 6 | Give recognition with badge | Appears on recognition wall |
| 7 | View feedback timeline | All received feedback chronological |
| 8 | Verify receiver's CPIS FSI updated | EWMA recalculated |
| 9 | Verify CIS (feedback given count) | Sigmoid score updated |

### [EMP-04] Skills & Development
**Priority:** Medium | **Est. Time:** 30 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View skill matrix | Current skill ratings displayed |
| 2 | Self-assess skill (update rating) | Rating saved |
| 3 | View skill gaps vs role requirements | Gaps identified |
| 4 | View development plan | Activities and checkpoints listed |
| 5 | Complete development activity | Progress updated |
| 6 | View career path | Current + next level shown |
| 7 | Request mentoring | Mentor receives request |
| 8 | Verify CPIS GTS updated | Skill growth, training score recalculated |

### [EMP-05] Pulse Survey & Check-ins
**Priority:** Medium | **Est. Time:** 20 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Submit daily pulse | Saved with timestamp |
| 2 | Submit weekly check-in | Check-in recorded |
| 3 | View pulse trend (own data) | 30-day chart displayed |
| 4 | Check-in streak tracking | Consecutive days counted |
| 5 | Verify CPIS CRI streak factor | sigmoid(streakDays) calculated |

### [EMP-06] AI Assistant
**Priority:** High | **Est. Time:** 35 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Chat with help assistant | Response from PMS knowledge base |
| 2 | Ask goal intelligence agent | SMART goals drafted |
| 3 | Ask review drafter agent | Self-review draft generated |
| 4 | Agent creates goal (approval flow) | Action pending approval |
| 5 | Approve agent action | Goal created |
| 6 | Reject agent action | Action cancelled |
| 7 | Rate limit test (15+ calls/min) | 429 Too Many Requests |
| 8 | Verify data scoping (can't see others) | Agent only returns own data |
| 9 | AI disabled by admin → access blocked | 403: AI access disabled |

### [EMP-07] Evidence Upload
**Priority:** Medium | **Est. Time:** 15 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Upload evidence linked to goal | Evidence saved |
| 2 | Upload multiple types (code, doc, pres) | Diversity tracked |
| 3 | View evidence portfolio | Summary with stats |
| 4 | Verify CPIS EQS calculation | All 4 sub-metrics computed |

### [EMP-08] Chat & Messaging
**Priority:** Medium | **Est. Time:** 20 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Send direct message | Message delivered, real-time |
| 2 | Create group chat | Group created, participants added |
| 3 | Pin message | Message pinned, visible to group |
| 4 | React to message | Reaction displayed |
| 5 | Search messages | Matching messages returned |
| 6 | Edit message (within grace) | Edit succeeds |
| 7 | Delete message | Message removed |

### [EMP-09] One-on-One Meetings
**Priority:** Medium | **Est. Time:** 15 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View upcoming 1-on-1s | List of scheduled meetings |
| 2 | Request new 1-on-1 | Manager notified |
| 3 | Add meeting notes | Notes saved |
| 4 | Complete meeting | Status updated |
| 5 | Verify CPIS CIS (1-on-1 count) | oneOnOneScore updated |

### [EMP-10] Leaderboard & Rankings
**Priority:** Low | **Est. Time:** 10 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View performance leaderboard | Ranked list with CPIS scores |
| 2 | View goal completion leaderboard | Ranked by completion rate |
| 3 | View recognition leaderboard | Top recognized employees |
| 4 | View personal rank & percentile | Your position shown |

### [EMP-11] Notifications
**Priority:** Medium | **Est. Time:** 15 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View notification feed | All notifications listed |
| 2 | Unread count badge | Correct count shown |
| 3 | Mark single as read | Count decremented |
| 4 | Mark all as read | All cleared |
| 5 | Update notification preferences | Settings saved |
| 6 | Real-time notification (Socket.IO) | New notification appears without refresh |

### [EMP-12] PIP (If Applicable)
**Priority:** Medium | **Est. Time:** 15 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View assigned PIP | PIP details visible |
| 2 | Acknowledge PIP | Acknowledgment recorded |
| 3 | View milestone progress | Status per milestone |
| 4 | View check-in notes | Manager feedback visible |

### [EMP-13] Profile & Settings
**Priority:** Low | **Est. Time:** 10 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View own profile | All personal info shown |
| 2 | Update profile (name, bio) | Changes saved |
| 3 | Upload avatar | Image uploaded, displayed |
| 4 | Change notification settings | Preferences saved |
| 5 | Change password | Password updated |

### [EMP-14] Directory & Org Chart
**Priority:** Low | **Est. Time:** 10 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Search employee directory | Results from own tenant |
| 2 | View org chart | Hierarchy visualization |
| 3 | Click on colleague in org chart | Basic profile visible |

### [EMP-15] Calendar & Announcements
**Priority:** Low | **Est. Time:** 10 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View calendar events | Personal + team events |
| 2 | Create calendar event | Event saved |
| 3 | View announcements | Company-wide posts visible |
| 4 | Acknowledge announcement | Acknowledgment recorded |

### [EMP-16] CPIS Score Verification (End-to-End)
**Priority:** Critical | **Est. Time:** 30 min

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Complete goal → verify GAI updates | GAI recalculated |
| 2 | Receive review → verify RQS updates | RQS recalculated |
| 3 | Receive feedback → verify FSI updates | EWMA updated |
| 4 | Give feedback + 1-on-1 → verify CIS | Collaboration score updated |
| 5 | Consistent check-ins → verify CRI | Streak factor calculated |
| 6 | Complete training → verify GTS | Growth trajectory updated |
| 7 | Upload evidence → verify EQS | Evidence quality scored |
| 8 | Volunteer for extra work → verify III | Initiative counted |
| 9 | View final CPIS with all 8 dimensions | Score, grade, stars, rank correct |
| 10 | Verify formula breakdown transparency | Calculation trace shown |
| 11 | Verify confidence interval | Bounds reflect data volume |
| 12 | Verify fairness analysis | Bias check + disparate impact |

---

### Testing Timeline Summary

```
[EMP-01]  Goal Management          ████████    40 min  CRITICAL
[EMP-02]  Reviews & Self-Appraisal █████████   45 min  CRITICAL
[EMP-03]  Feedback & Recognition   ██████      30 min  HIGH
[EMP-04]  Skills & Development     ██████      30 min  MEDIUM
[EMP-05]  Pulse & Check-ins        ████        20 min  MEDIUM
[EMP-06]  AI Assistant             ███████     35 min  HIGH
[EMP-07]  Evidence Upload          ███         15 min  MEDIUM
[EMP-08]  Chat & Messaging         ████        20 min  MEDIUM
[EMP-09]  One-on-One Meetings      ███         15 min  MEDIUM
[EMP-10]  Leaderboard              ██          10 min  LOW
[EMP-11]  Notifications            ███         15 min  MEDIUM
[EMP-12]  PIP (if applicable)      ███         15 min  MEDIUM
[EMP-13]  Profile & Settings       ██          10 min  LOW
[EMP-14]  Directory & Org Chart    ██          10 min  LOW
[EMP-15]  Calendar & Announcements ██          10 min  LOW
[EMP-16]  CPIS End-to-End          ██████      30 min  CRITICAL
                                   ────────────────────
                                   Total: ~5.8 hours
```

---

### Cross-Reference: Feature ↔ CPIS Dimension

```
┌─────────────────────────────────────────────────────────────────────┐
│  FEATURE → TEST SEGMENT → CPIS DIMENSION                           │
│                                                                     │
│  Goals [EMP-01]           → GAI (25%)  Goal Attainment Index        │
│  Reviews [EMP-02]         → RQS (20%)  Review Quality Score         │
│  Feedback [EMP-03]        → FSI (12%)  Feedback Sentiment Index     │
│  1-on-1s [EMP-09]         → CIS (10%)  Collaboration Impact Score   │
│  Feedback Given [EMP-03]  → CIS (10%)  (feedbackGiven channel)      │
│  Recognition [EMP-03]     → CIS (10%)  (recognitionsGiven channel)  │
│  Check-ins [EMP-05]       → CRI (10%)  Consistency & Reliability    │
│  Goals on-time [EMP-01]   → CRI (10%)  (onTimeRate, deadlines)      │
│  Skills [EMP-04]          → GTS (8%)   Growth Trajectory Score      │
│  Development [EMP-04]     → GTS (8%)   (devPlanProgress)            │
│  Evidence [EMP-07]        → EQS (8%)   Evidence Quality Score       │
│  Mentoring [EMP-04]       → III (7%)   Initiative & Innovation      │
│  Voluntary goals [EMP-01] → III (7%)   (voluntaryGoals)             │
│                                                                     │
│  End-to-End [EMP-16]      → ALL 8 DIMENSIONS verified together     │
└─────────────────────────────────────────────────────────────────────┘
```

---

> **Dependencies:**
> - [SA-01] Tenant must exist
> - [TA-01] Employee must be onboarded (user created)
> - [TA-02] Review cycle must be active for review testing
> - Employee tests can run in parallel with Manager tests (different users)
>
> **Total Testing Time Across All 4 Documents:**
> - Infrastructure: ~2 hours
> - Super Admin [SA-01 to SA-12]: ~5.5 hours
> - Tenant Admin/Manager [TA-01 to TA-18]: ~8.5 hours
> - Employee [EMP-01 to EMP-16]: ~5.8 hours
> - AI Agents: ~3 hours
> - Math Engine: ~2.5 hours
> - Integration: ~3 hours
> - **Grand Total: ~30 hours (4 working days)**
