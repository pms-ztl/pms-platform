# PMS Platform — User Manual & Feature Math Reference

> **Generated from repository scan on 2026-02-11**
> Source: `D:\CDC\PMS\pms-platform` (apps/web frontend + packages/core math engine)

---

## Executive Summary

The **PMS Platform** (Performance Management System) is a comprehensive, enterprise-grade web application that manages the full employee performance lifecycle — from goal setting and alignment, through ongoing check-ins and feedback, to formal reviews, calibration, and talent decisions (promotions, compensation, succession planning).

**Who it's for:** Employees, Managers, HR Administrators, and Executives across organizations of any size.

**What makes it unique:**
1. An **8-dimensional Comprehensive Performance Intelligence Score (CPIS)** that replaces single-number ratings with a rich, statistically fair composite.
2. **Real-time performance tracking** with live dashboards, anomaly detection, and sentiment gauges — not just end-of-cycle snapshots.
3. **Built-in fairness engine** — z-score calibration, Bayesian smoothing for sparse data, bias detection, and disparate impact analysis ensure equitable outcomes.
4. A unified platform covering goals, OKRs, reviews, 360-degree feedback, 1-on-1s, PIPs, skills matrix, career pathing, succession planning, and compensation — all interconnected.
5. **Evidence-based decisions** — every rating can be traced back to verified evidence, goal data, and feedback, creating a defensible audit trail.

---

## How to Use This Manual

- **Product Managers / Project Managers:** Read Sections 3–6 for a complete understanding of every feature, its purpose, inputs, outputs, and scoring logic.
- **For a quick overview:** Start with Section 4 (End-to-End Workflow) to understand how all pieces fit together.
- **For scoring details:** Jump to Section 6 (Scoring System Deep Dive) for formulas, weights, and worked examples.
- **For pitch preparation:** Section 8 (Product Pitch Notes) provides USPs and a 60-second pitch script.

---

## 3. Product Overview

### 3.1 Roles & Permissions

The platform enforces role-based access control (RBAC). Every screen and action is gated by the user's role.

| Role | Description | Access Level |
|------|-------------|-------------|
| **Employee** | Individual contributor | Own goals, self-appraisal, feedback (give/receive), recognition, evidence, skills, career path, leaderboard, development plans |
| **Manager** | Team lead / supervisor | Everything an Employee sees + team dashboards, team goals, assign goals to reports, conduct reviews, run 1-on-1s, create PIPs, approve/reject promotions, verify evidence |
| **HR Admin** | Human Resources administrator | Everything a Manager sees + create review cycles, calibration sessions, compensation decisions, compliance reviews, user management, configuration, analytics, bias analysis, normalization |
| **Admin / Super Admin** | System administrator | Full access to all features including audit logs, system configuration, and all HR Admin capabilities |

### 3.2 Core Objects Explained

| Object | Plain-Language Meaning |
|--------|----------------------|
| **Goal** | A measurable target assigned to an employee (e.g., "Increase sales by 15%"). Goals can be individual, team, department, or company-wide. They can also be OKR Objectives or Key Results. |
| **OKR** | Objectives and Key Results — a goal-setting framework where a high-level Objective breaks down into measurable Key Results. |
| **Review** | A formal performance evaluation conducted by a manager, peer, or the employee themselves (self-assessment). Reviews happen within Review Cycles. |
| **Review Cycle** | A time-bounded evaluation period (e.g., "Q1 2026 Annual Review") during which all reviews are collected, calibrated, and finalized. |
| **Feedback** | Informal, ongoing input from colleagues. Can be Praise, Constructive, Suggestion, or Recognition. Can be anonymous. |
| **Recognition** | A public or private acknowledgment of a colleague's contribution, tagged with company values (e.g., "Teamwork", "Innovation"). |
| **1-on-1 (One-on-One)** | A scheduled meeting between a manager and their direct report with agenda items, notes, and action items. |
| **Self-Appraisal** | An employee's self-assessment of their own performance, including competency ratings and reflection. |
| **Calibration** | A fairness process where HR/managers adjust review ratings to remove bias and ensure consistency across teams. |
| **PIP** | Performance Improvement Plan — a structured plan for employees who need support to meet expectations, with milestones, check-ins, and success criteria. |
| **CPIS** | Comprehensive Performance Intelligence Score — the platform's flagship 8-dimensional scoring system (0–100). |
| **Competency** | A skill or behavior assessed during reviews (e.g., Leadership, Communication, Technical Skills). |
| **Evidence** | Documents, certificates, project outcomes, or metrics that support performance claims. Evidence can be verified by managers and linked to reviews. |
| **Development Plan** | A structured learning plan for career growth, with activities, milestones, and target roles. |
| **Skills Matrix** | An inventory of employee skills with self-ratings, manager ratings, target levels, and gap analysis. |
| **Succession Plan** | Identifies critical roles, potential successors, and their readiness levels. Uses a 9-box grid (Performance vs. Potential). |

---

## 4. End-to-End Workflow

This section describes the typical performance management cycle from start to finish.

### Step 1: Cycle Setup (HR Admin)
HR Admin creates a **Review Cycle** (e.g., "Annual Review 2026") specifying dates, review type, and whether to include self-assessment and peer feedback. HR can select a review template and configure auto-assignment of reviewers.

### Step 2: Goal Setting (Employee + Manager)
Employees create **Goals** for the cycle. Goals include a title, description, type (Individual/Team/Department/Company/OKR), priority (Low/Medium/High/Critical), weight (0–10), and due date. Managers can **assign goals** to their direct reports and create **sub-goals** that cascade down the org hierarchy.

### Step 3: Goal Alignment (Manager + HR)
Using the **Goal Alignment** page, managers and HR verify that individual goals roll up to team, department, and company goals. The tree view shows parent-child relationships, progress, and alignment strength.

### Step 4: Ongoing Tracking (Employee + Manager)
- Employees **update goal progress** regularly (0–100%).
- Managers and employees conduct **1-on-1 meetings** with agenda items, notes, and action items.
- Colleagues exchange **feedback** (Praise, Constructive, Suggestion) and **recognition** tagged with company values.
- Employees submit **evidence** (documents, certificates, metrics) to support their performance claims.
- The **Leaderboard** shows real-time rankings across Performance, Goals, Recognition, and Learning.
- **Real-time dashboards** display live activity heatmaps, anomaly detection, sentiment gauges, and deadline alerts.

### Step 5: Self-Appraisal (Employee)
When the review cycle opens, employees complete a **Self-Appraisal** — rating themselves on 6 competencies (Leadership, Communication, Technical Skills, Teamwork, Problem Solving, Adaptability) on a 1–5 scale, plus an overall self-rating and written reflections.

### Step 6: Manager Review (Manager)
Managers complete **performance reviews** for each direct report. The review form includes:
- Written assessments of accomplishments and goal progress
- Star ratings (1–5) for Core Competencies, Collaboration, and Initiative
- An overall performance rating (1–5)
- Key Strengths and Areas for Growth lists
- A summary narrative

### Step 7: Peer / 360 Reviews (Colleagues)
If configured, peers also submit reviews. The **Moderator Dashboard** compiles all perspectives (Self, Manager, Peer) side-by-side.

### Step 8: Moderation & Calibration (HR + Calibration Committee)
The **Moderator Dashboard** shows:
- A weighted average: Self (20%) + Manager (50%) + Peers (30%)
- Gap analysis between reviewer types
- Rating distribution charts

**Calibration sessions** use z-score normalization to remove reviewer bias — lenient and harsh reviewers are adjusted to a common scale. HR can apply **normalization** across the organization.

### Step 9: Finalization & Acknowledgment
Reviews are **finalized** by the moderator. Employees **acknowledge** their final review. The CPIS score is computed automatically.

### Step 10: Talent Decisions (HR + Manager)
Based on finalized scores:
- **Compensation** decisions are created (merit increases, bonuses, equity).
- **Promotion** nominations are submitted and flow through an approval workflow.
- **PIP**s are created for underperforming employees.
- **Succession plans** are updated based on the 9-box grid.
- **Development plans** are created for growth areas.

### Step 11: Reporting & Analytics (HR + Executives)
HR generates **reports** (Performance Summary, 360-Degree Feedback, Team Analytics, Compensation Analysis, etc.) in PDF, Excel, or CSV. **Analytics dashboards** show trends, distributions, bias metrics, and compliance rates.

---

## 5. Feature Catalog

---

### Feature: Dashboard (Individual Home)

**What it is (simple):** The main landing page every user sees after login — a personalized performance snapshot.

**Why it exists in PMS (business reason):** Gives employees instant visibility into their performance standing, pending actions, and upcoming commitments without navigating to multiple pages.

**Who uses it:** All authenticated users (Employee, Manager, HR Admin, Admin).

**Where it appears in the UI:** `/dashboard` — the default page after login.

**Inputs (what the user provides):** None — this is a read-only dashboard driven entirely by data.

**Outputs (what the user sees):**
- **CPIS Score** — An 8-dimension radar chart showing the Comprehensive Performance Intelligence Score (0–100), with a grade (A+ through D), star rating (1–5), confidence level (%), and trajectory (improving/stable/declining).
- **CPIS Dimension Cards** — 8 cards showing each dimension's score, grade, and weight.
- **Stats Grid** — 4 summary cards: Active Goals (with at-risk count), Pending Reviews, Feedback Received (with sentiment), and CPIS Score with grade.
- **My Goals** — Top 5 active goals with risk badges (LOW/MEDIUM/HIGH/CRITICAL), progress bars, and composite scores from child goals.
- **Quick Actions** — Pending reviews to complete and at-risk goals requiring attention.
- **Recent Activity** — Timeline of goal completions, feedback received, and review milestones.
- **Achievement Badges** — Earned dynamically: "Elite Grade A+", "Goal Crusher", "Team Player", "Review Star", "Trending Up", "On Track".
- **Goal Cascade Overview** (Managers only) — Summary of team goals: total, completed, average progress, top 5 cascaded goals with owner and progress.
- **1-on-1 Widget** — Next 3 upcoming meetings with participant, date/time, duration, and agenda preview.

**How it works (plain-English logic):** The page fetches the user's active goals, pending reviews, received feedback, CPIS score, goal risk assessments, and upcoming 1-on-1s. For managers, it additionally fetches the team goal tree. All data is displayed in real-time with automatic refresh.

**Math / Weightage / Scoring:**
- CPIS score display: 0–100, computed by the math engine (see Section 6).
- Grade mapping: A+ (≥90), A (≥80), B+ (≥70), B (≥60), C+ (≥50), C (≥40), D (<40).
- Star rating: 5 (≥90), 4 (≥75), 3 (≥55), 2 (≥35), 1 (<35).
- Goal risk: Schedule Risk % + Velocity Risk % combined into LOW/MEDIUM/HIGH/CRITICAL.

**Dependencies:** Goals API, Reviews API, Feedback API, Performance Math API (CPIS + Risk), One-on-One API.

**Edge cases / special rules:** If no CPIS data is available, a placeholder message is shown. Managers see an additional "Goal Cascade Overview" section. Achievement badges appear only when earned criteria are met.

**USP angle:** Unlike typical PMS tools that show a single number, this dashboard presents an 8-dimensional radar view with confidence intervals and trajectory — giving employees a nuanced, fair picture of their standing.

---

### Feature: Goal Setting & Management

**What it is (simple):** Create, track, and manage performance goals with hierarchical alignment (OKR support).

**Why it exists in PMS (business reason):** Goals are the foundation of performance management. This feature ensures every employee has clear, measurable targets that roll up to organizational strategy.

**Who uses it:** All employees (create own goals), Managers (assign goals to reports, create sub-goals).

**Where it appears in the UI:** `/goals` (list/tree view), `/goals/:id` (detail), `/goal-alignment` (alignment visualization).

**Inputs (what the user provides):**
- **Create Goal form**: Title, Description, Parent Goal (optional), Assign To (manager-only), Goal Type (INDIVIDUAL / TEAM / DEPARTMENT / COMPANY / OKR_OBJECTIVE / OKR_KEY_RESULT), Priority (LOW / MEDIUM / HIGH / CRITICAL), Due Date, Weight (0–10, default 5).
- **Update Progress**: Progress percentage (0–100) + optional note.
- **Edit Goal**: Title, Description, Status (DRAFT / ACTIVE / ON_HOLD / COMPLETED / CANCELLED), Priority.
- **Create Sub-Goal** (manager): Title, Description, Assign To, Type, Priority, Weight, Due Date.

**Outputs (what the user sees):**
- **List View**: Paginated table with goal title, type badge, owner, status, priority, progress bar + %, due date.
- **Tree View**: Hierarchical tree showing parent-child relationships with expand/collapse, type badges, owner avatars, progress bars, and weight indicators.
- **Goal Detail Page**:
  - Progress card with bar and percentage.
  - **SMART Score Indicator**: 5 circles (S/M/A/R/T) showing criteria met — S (description ≥20 chars), M (has target + unit), A (weight > 0), R (has parent goal), T (has start + due date). Shows X/5 criteria met.
  - **Contribution Breakdown** (when goal has children): Composite Score %, Completion %, Quality-Adjusted %, Efficiency %. Per-child weighted contribution.
  - Progress history timeline with notes.
  - Comments section.

**How it works (plain-English logic):** Goals exist in a hierarchy. Company goals break into department goals, which break into team goals, which break into individual goals. OKR Objectives contain Key Results. Each goal has a weight (importance), and child goals contribute to parent goals proportionally. The system tracks progress over time and computes risk assessments.

**Math / Weightage / Scoring:**
- **Composite Score** (from child goals): `Σ(child_progress × child_weight) / Σ(child_weights)`
- **SMART criteria**: Binary check (5 criteria), displayed as X/5.
- **Tracking Status**: ON_TRACK (progress ≥ 70%), AT_RISK (40–70%), BEHIND (<40%).
- See Section 6 for the full Goal Attainment Index formula.

**Dependencies:** Parent goals (for alignment), Users API (for assignment), Performance Math API (for risk and composite scores).

**Edge cases / special rules:** Goals can be put ON_HOLD or CANCELLED. Completed goals cannot be edited. Sub-goal assignment requires the manager to have direct reports.

**USP angle:** Full OKR support with hierarchical cascading, SMART score indicators, and real-time contribution breakdown from child goals — most PMS tools only track flat goal lists.

---

### Feature: Goal Alignment Visualization

**What it is (simple):** A visual map showing how individual goals connect up to team, department, and company objectives.

**Why it exists in PMS (business reason):** Ensures strategic alignment — every employee's work contributes to organizational priorities. Makes misalignment visible.

**Who uses it:** All employees (own goals), Managers (team hierarchy), HR (organization-wide).

**Where it appears in the UI:** `/goal-alignment`

**Inputs:** Filters for Goal Type, Status, and Owner. View toggle (Tree / List).

**Outputs:**
- **Stats Bar**: Total Goals, On Track %, At Risk %, Behind %, Avg Progress %.
- **Tree View**: Card-based hierarchical nodes with color-coded type dots, progress bars, connection lines between parent/child, and a detail panel on click.
- **List View**: Tabular rows with tree depth indicators, color-coded left borders.
- **Detail Panel** (desktop sidebar): Full goal info, meta badges, target vs. current, days remaining, parent/child links, contribution weight.

**Math / Weightage / Scoring:**
- On Track: progress ≥ 70% or COMPLETED.
- At Risk: 40% ≤ progress < 70%.
- Behind: progress < 40%.
- Days remaining: color-coded (red if overdue, orange if < 7 days).

**Dependencies:** Goals API (tree structure).

**USP angle:** Interactive, filterable alignment tree — not just a static org chart but a live view of how strategy cascades down.

---

### Feature: One-on-One Meetings

**What it is (simple):** Structured manager-employee check-in meetings with agenda, notes, and action items.

**Why it exists in PMS (business reason):** Regular check-ins are the backbone of continuous performance management. This replaces ad-hoc meetings with trackable, structured conversations.

**Who uses it:** Managers (schedule and conduct), Employees (participate and contribute notes).

**Where it appears in the UI:** `/one-on-ones` (list), `/one-on-ones/:id` (detail).

**Inputs:**
- **Schedule form**: Employee (from direct reports), Date/Time, Duration (15/30/45/60 min), Location, Meeting Link, Agenda Topics (dynamic list).
- **During meeting**: Manager Notes (private), Employee Notes (private), Shared Notes, Action Items (add/toggle/remove).

**Outputs:**
- **Meeting cards** (grid): Participant info, status badge (Scheduled/In Progress/Completed/Cancelled), date, time, duration, location, agenda preview, action items count (X/Y done).
- **Detail page**: Full agenda, private notes sections, shared notes, action item checklist, meeting timeline (Created → Scheduled → Started → Completed/Cancelled), participant cards.

**How it works:** Managers schedule meetings, add agenda items. Both participants can add notes during the meeting (manager/employee notes are private to each). Action items are tracked with completion status. Meetings flow through states: Scheduled → In Progress → Completed.

**Math / Weightage / Scoring:** Action items completion ratio displayed (X/Y). No scoring formulas — this is an operational feature.

**Dependencies:** Users API (for reports list). Feeds into CPIS Collaboration dimension.

**USP angle:** Private + shared notes in one view, with action item tracking and timeline — ensures 1-on-1s are productive and documented.

---

### Feature: Self-Appraisal

**What it is (simple):** An employee's own assessment of their performance, including competency self-ratings and written reflections.

**Why it exists in PMS (business reason):** Self-reflection is a critical part of 360-degree reviews. It gives employees voice in their evaluation and surfaces self-awareness gaps.

**Who uses it:** Employees only.

**Where it appears in the UI:** `/self-appraisal`

**Inputs:**
- **6 Competency Ratings** (1–5 stars each): Leadership, Communication, Technical Skills, Teamwork, Problem Solving, Adaptability.
- **Overall Self-Rating** (1–5 stars).
- **Written reflections**: Key Accomplishments, Challenges Faced, Areas for Improvement, Development Goals for Next Period.

**Outputs:**
- **Performance Summary Cards**: Goals Completed (X/Y), Avg Progress (%), Feedback Received (count), Review Period (year).
- **Competency rating cards** with star inputs.
- **Overall rating** with numeric display (X/5).

**How it works:** The page loads the employee's goal and feedback data to provide context. The employee rates themselves on each competency and writes reflections. The appraisal can be saved as draft or submitted.

**Math / Weightage / Scoring:**
- Goals Completion Rate: completed / total.
- Avg Progress: mean of all goal progress percentages.
- Self-ratings feed into the Moderator Dashboard's weighted average (Self gets 20% weight).

**Dependencies:** Goals API, Reviews API, Feedback API.

**USP angle:** Pre-populated performance data (goals, feedback) alongside the self-assessment gives employees real data to reflect on rather than guessing.

---

### Feature: Performance Reviews

**What it is (simple):** Formal performance evaluations by managers (and optionally peers) with structured rating forms.

**Why it exists in PMS (business reason):** The core evaluation mechanism — translates ongoing performance into formal ratings that drive talent decisions.

**Who uses it:** Managers (as reviewers), Employees (as reviewees who acknowledge), HR Admin (manages cycles).

**Where it appears in the UI:** `/reviews` (list), `/reviews/:id` (detail), `/review-cycles` (cycle management).

**Inputs (Review Form):**
- **6 Assessment questions**: Key Accomplishments (text), Goal Progress (text), Core Competencies (1–5 stars), Collaboration & Teamwork (1–5 stars), Initiative & Proactivity (1–5 stars), Areas for Development (text).
- **Overall Performance Rating** (1–5 stars) with legend: 1=Needs Improvement, 3=Meets Expectations, 5=Exceptional.
- **Review Summary** (text).
- **Key Strengths** (dynamic list — add/remove items).
- **Areas for Growth** (dynamic list — add/remove items).

**Inputs (Review Cycle — HR Admin):**
- Cycle Name, Description, Type (ANNUAL / SEMI_ANNUAL / QUARTERLY / MONTHLY / PROBATION / PROJECT), Start/End Dates, Review Template (optional), Auto-assign reviewers (checkbox), Include self-assessment (checkbox), Include peer feedback (checkbox).

**Outputs:**
- **Reviews Page**: Cards showing reviewee info, type, cycle, status badge (NOT_STARTED / IN_PROGRESS / SUBMITTED / CALIBRATED / FINALIZED / ACKNOWLEDGED), overall rating (X/5).
- **Review Cycles Page**: Active cycle banner with days remaining, completion progress, 5-stage workflow indicator (Draft → Active → Calibration → Finalized → Closed), cycle stats (Total, Not Started, In Progress, Submitted, Calibrated, Finalized, Acknowledged, Completion %).
- **Review Detail**: Full form with star ratings, strengths/growth lists, reviewee's goals sidebar with progress bars.

**How it works:** HR creates a cycle, then launches it. Reviews are auto-assigned or manually assigned. Reviewers complete their assessments. Reviews flow through: NOT_STARTED → IN_PROGRESS → SUBMITTED → (calibration) → FINALIZED → ACKNOWLEDGED.

**Math / Weightage / Scoring:**
- Completion rate: `(submitted + calibrated + finalized + acknowledged) / total × 100`.
- Review ratings (1–5) feed into the CPIS Review Quality Score dimension.

**Dependencies:** Review Cycles, Goals (for context), Templates (from Configuration).

**USP angle:** Multi-stage workflow with built-in self-assessment, peer feedback, and calibration stages — not just a single manager form.

---

### Feature: Moderator Dashboard

**What it is (simple):** A specialized view for HR/calibration moderators to compare all review inputs (Self, Manager, Peer) side-by-side and make calibration decisions.

**Why it exists in PMS (business reason):** Enables fair, informed calibration by showing all perspectives in one place with gap analysis.

**Who uses it:** HR Admin, Calibration Moderators.

**Where it appears in the UI:** `/reviews/moderate`

**Inputs:** Cycle selector, employee search, status filter (All/Pending/In Progress/Complete). Calibrate Rating modal: final calibrated rating (1–5) + justification (required). Send Back modal: revision notes (required).

**Outputs:**
- **Employee list** (left panel): avatars, names, completion %, status icons.
- **3-column review breakdown** (center):
  - Self-Assessment column (blue border): competency averages, comments, summary.
  - Manager Review column (green border): competency averages, comments, summary.
  - Peer Feedback column (purple border): competency averages, comments, summary.
- **Compiled Summary**:
  - **Weighted Average**: `Self (20%) + Manager (50%) + Peers (30%)`.
  - Individual averages grid.
  - **Rating Distribution Bar Chart** (1–5 stars).
  - **Gap Analysis** (3 cards): Self vs. Manager, Self vs. Peers, Manager vs. Peers. Color-coded: Green (<0.75 gap), Amber (0.75–1.5), Red (≥1.5) with labels ("Significant gap detected" / "Moderate difference" / "Within expected range").
- **Team Rating Distribution Chart** (bottom): bar chart across all employees.

**Math / Weightage / Scoring:**
- Weighted Average: `(selfAvg × 0.20) + (managerAvg × 0.50) + (peerAvg × 0.30)`
- Gap magnitude thresholds: < 0.75 (normal), 0.75–1.5 (moderate), ≥ 1.5 (significant)
- Rating distribution: histogram of ratings across all employees

**Dependencies:** Review Cycles, Reviews, Calibration system.

**USP angle:** Three-perspective side-by-side comparison with automated gap analysis is rare — most tools just show average ratings without revealing disagreement patterns.

---

### Feature: Calibration

**What it is (simple):** A structured process to adjust review ratings across teams to ensure fairness and remove reviewer bias.

**Why it exists in PMS (business reason):** Different managers rate differently — some are lenient, others harsh. Calibration normalizes ratings so employees are compared fairly regardless of who reviewed them.

**Who uses it:** HR Admin (creates/starts sessions), Calibration facilitators (adjust ratings).

**Where it appears in the UI:** `/calibration`

**Inputs:**
- **Create Session**: Review Cycle (from cycles in CALIBRATION status), Session Name, Scheduled Start (date/time).
- **Adjust Rating** (per employee review): New Rating (1–5 buttons), Rationale (text, required).

**Outputs:**
- **Session cards**: Name, status badge (SCHEDULED/IN_PROGRESS/COMPLETED), description, date/time, facilitator info. Pre-session analysis: Total Reviews, Outliers count, Bias Alerts count.
- **Calibration Workspace**:
  - **Rating Distribution Chart** (5 bars, 1–5 stars, color-coded red→blue).
  - **Quick Stats**: Total Reviews, Calibrated count, Pending count, Avg Original rating, Avg Calibrated rating.
  - **Reviews Table**: Employee, Reviewer, Level, Original rating, Calibrated rating (color: green if up, red if down), Status (Calibrated/Pending), Adjust button.

**How it works (plain-English logic):** HR creates a calibration session tied to a review cycle. During the session, facilitators review each employee's rating and can adjust it up or down with a required rationale. The system shows the distribution before and after adjustments.

**Math / Weightage / Scoring (from math engine):**
- **Z-Score Normalization**: For each reviewer, compute their mean and standard deviation. Convert each rating to a z-score: `z = (rating - reviewer_mean) / reviewer_stddev`. Rescale to the global distribution: `calibrated = z × global_stddev + global_mean`. Clamp to [1, 5].
- This means a "4" from a lenient reviewer (whose average is 4.2) and a "3" from a harsh reviewer (whose average is 2.5) may end up closer together after calibration.

**Dependencies:** Review Cycles (must be in CALIBRATION status), Reviews (submitted ratings).

**USP angle:** Statistical z-score calibration built right into the platform — most competitors require spreadsheet exports or third-party tools for calibration.

---

### Feature: Feedback

**What it is (simple):** Informal, ongoing performance feedback exchanged between colleagues — supporting continuous performance conversations.

**Why it exists in PMS (business reason):** Annual reviews alone miss the day-to-day. Continuous feedback captures real-time observations and creates a richer performance picture.

**Who uses it:** All employees.

**Where it appears in the UI:** `/feedback`

**Inputs:**
- **Give Feedback**: Recipient, Type (PRAISE / CONSTRUCTIVE / SUGGESTION / RECOGNITION), Visibility (PRIVATE / MANAGER_VISIBLE / PUBLIC), Message, Tags (comma-separated), Anonymous toggle.
- **Request Feedback**: Request from (team member), Message (optional).

**Outputs:**
- **Stats Cards**: Praise Received, Feedback Given, Unacknowledged.
- **Tabs**: Received, Given, Timeline.
- **Feedback cards**: Sender (or "Anonymous"), type badge (color-coded), time ago, content, tags, visibility label, acknowledge button.
- **Timeline tab**: Chronological event stream.

**How it works:** Employees can give feedback to any team member. The recipient sees it in their "Received" tab and can acknowledge it. Feedback type and sentiment feed into the CPIS Feedback Sentiment Index.

**Math / Weightage / Scoring:** Feedback sentiment is computed by the math engine using EWMA (Exponentially Weighted Moving Average) — recent feedback weighs more than older feedback. This feeds the CPIS FSI dimension.

**Dependencies:** Users API (team members). Feeds into CPIS and Moderator Dashboard.

**USP angle:** Anonymous option + visibility controls (Private/Manager-Visible/Public) + skill tagging — gives employees psychological safety to share honest feedback.

---

### Feature: Recognition

**What it is (simple):** A public recognition wall where colleagues can acknowledge each other's contributions, tagged with company values.

**Why it exists in PMS (business reason):** Public recognition drives engagement and reinforces desired behaviors. Value-tagging connects recognition to company culture.

**Who uses it:** All employees (peer-to-peer).

**Where it appears in the UI:** `/recognition`

**Inputs:**
- **Give Recognition**: Recipient (search/autocomplete), Message (required), Value Tags (optional, from suggestions: Teamwork, Innovation, Leadership, Customer Focus, Integrity, Excellence, Collaboration, Ownership).

**Outputs:**
- **Recognition Wall** (main feed): Cards with sender avatar, sender name, "recognized" label, recipient name (bold), message, value tags (amber badges), time ago.
- **Top Recognized Leaderboard** (sidebar): Period selector (Month/Quarter/Year), ranked list with medals, user info, recognition count badge.
- **Recognition Impact Card**: Total recognition count.
- **Popular Values**: Suggested value tags displayed.

**Math / Weightage / Scoring:** Recognition count feeds into the Leaderboard recognition tab and the CPIS Collaboration dimension.

**Dependencies:** Users API (team member search). Feeds into Leaderboard and CPIS.

**USP angle:** Value-tagged recognition creates a direct link between peer acknowledgment and company culture — with a leaderboard to gamify engagement.

---

### Feature: Leaderboard

**What it is (simple):** Ranked lists showing top performers across multiple dimensions — Performance, Goals, Recognition, and Learning.

**Why it exists in PMS (business reason):** Healthy competition drives engagement. The multi-dimensional approach ensures it's not just about one metric.

**Who uses it:** All employees.

**Where it appears in the UI:** `/leaderboard`

**Inputs:** Period selector (This Week / This Month / This Quarter / This Year), Tab selection.

**Outputs:**
- **Podium Display** (top 3): Gold/Silver/Bronze medal layout with avatars, names, scores, departments, trophy animation.
- **Performance Tab**: Rank, change indicator, user info, department, composite score (color-coded), goals completed/total, review rating, trend arrow.
- **Goals Tab**: Rank, goals completed/total, completion rate (progress bar), avg progress (progress bar), on-time rate %.
- **Recognition Tab**: Rank, recognition score, total received, praise count, avg sentiment.
- **Learning Tab**: Rank, plans completed/total, avg progress, activities completed/total, learning score.
- **Department Comparison Chart**: Horizontal bar chart with department names, average scores, member counts.
- **My Stats Sidebar**: Personal rankings (#rank per category), scores with percentiles ("Top X%"), total user counts.

**Math / Weightage / Scoring:**
- Performance Score: Composite of goals completed, review rating, and trend.
- Goals Score: Completion rate + on-time rate + avg progress.
- Recognition Score: Feedback sentiment + praise count.
- Learning Score: Plan completion + activity completion + avg progress.
- Percentile: `rank / total_users × 100` (displayed as "Top X%").

**Dependencies:** Leaderboard API (all 4 category endpoints + departments + personal stats).

**USP angle:** 4-dimensional leaderboard (Performance, Goals, Recognition, Learning) with department comparison — avoids the toxic single-metric approach.

---

### Feature: Real-Time Performance Dashboard

**What it is (simple):** A live-updating dashboard with 8 specialized monitoring widgets for real-time performance visibility.

**Why it exists in PMS (business reason):** Traditional PMS is backward-looking. This enables proactive management by surfacing issues as they happen.

**Who uses it:** All authenticated users (some widgets have enhanced team-level data for managers).

**Where it appears in the UI:** `/realtime`

**Inputs:** Tab navigation (Overview + 8 individual widgets). Refresh button.

**Outputs (8 widgets):**
1. **Hourly Performance Tracker** — Minute-by-minute performance metrics.
2. **Goal Progress Dashboard** — Live goal progress tracking with real-time updates.
3. **Deadline Alert System** — Overdue and upcoming deadline warnings with urgency badges.
4. **Workload Distribution Analyzer** — Team workload balance visualization.
5. **Anomaly Detector** — Statistical outlier detection with confidence intervals.
6. **Sentiment Gauge** — Real-time feedback sentiment scoring (0–100).
7. **Milestone Tracker** — Milestone achievement timeline with live notifications.
8. **Activity Heatmap** — GitHub-style contribution heatmap with 5 intensity levels (0–4).

**How it works:** Uses WebSocket (Socket.IO) for live data streaming. Each widget renders independently and updates in real-time.

**Math / Weightage / Scoring:** Activity heatmap intensity levels (0=none, 1=low, 2=medium, 3=high, 4=very high). Anomaly detection uses z-scores (>2σ from mean). Sentiment gauge: 0–100 scale from EWMA of feedback sentiment.

**Dependencies:** WebSocket connection, Goals API, Feedback API, Activity data.

**USP angle:** Live performance monitoring is extremely rare in PMS tools — this is more like an observability dashboard for people performance.

---

### Feature: Performance Improvement Plan (PIP)

**What it is (simple):** A structured remediation plan for employees who are not meeting expectations, with milestones, check-ins, and clear success criteria.

**Why it exists in PMS (business reason):** PIPs formalize the improvement process, protect both the employee and the organization, and create a documented trail.

**Who uses it:** Managers (create/manage), HR Admin (approve), Employees (acknowledge and participate).

**Where it appears in the UI:** `/pip` (list), `/pip/:id` (detail).

**Inputs (Create PIP):**
- Employee, PIP Title, Type (PERFORMANCE / BEHAVIOR / ATTENDANCE / SKILLS), Severity (STANDARD / SERIOUS / FINAL_WARNING), Start/End Dates, Review Frequency (WEEKLY / BI_WEEKLY / MONTHLY).
- Performance Issues (list with issue + details), Impact Statement, Performance Expectations, Specific Goals (with metrics), Measurable Objectives (with targets), Success Criteria, Support Provided, Training Required (tags), Consequences of Non-Compliance.

**Inputs (Check-in):**
- Check-in Date, Type (SCHEDULED / UNSCHEDULED / URGENT), Progress Summary, Performance Rating (1–5 stars), On Track toggle, Positive Observations (list), Concerns Raised (list), Manager Feedback, Employee Feedback, Action Items (with assignee + due date), Next Steps.

**Outputs:**
- **PIP Cards**: Employee info, severity badge, title, status/type/frequency badges, date range, days remaining (color-coded: red ≤7, amber ≤14), HR approval status, employee acknowledgment status.
- **PIP Detail**: Overview card, Milestones Timeline (visual with colored dots per status), Check-ins list (expandable with ratings/observations/action items), Performance Expectations display.

**Math / Weightage / Scoring:**
- Days remaining: `differenceInDays(endDate, today)`. Negative = overdue.
- Check-in performance ratings (1–5 stars).

**Dependencies:** Users API (reports). PIP status feeds into Manager Dashboard action items.

**USP angle:** Comprehensive PIP structure with milestones, multi-type check-ins, and an employee acknowledgment workflow — ensures due process.

---

### Feature: Skills Matrix

**What it is (simple):** An inventory of employee skills with self-ratings, manager ratings, target levels, and gap analysis — visualized as a heatmap for teams.

**Why it exists in PMS (business reason):** Identifies skill gaps at individual, team, and organizational levels to drive targeted development and hiring.

**Who uses it:** Employees (self-assess), Managers (assess team, view heatmap), HR Admin (view org gaps, manage categories).

**Where it appears in the UI:** `/skills`

**Inputs:**
- **Add/Edit Assessment**: Skill Category, Skill Name, Current Level (1–5 stars), Target Level (1–5 stars), Self Rating (1–5 stars), Assessment Date, Evidence Notes.
- **Manage Categories** (HR only): Category Name, Description.

**Outputs:**
- **My Skills Tab**: Skills grouped by category with self rating, manager rating (or "Pending"), target level, gap indicator (On Target / Minor Gap / Critical Gap), sparkline trend chart, evidence notes.
- **Team Skills Tab** (managers): Summary cards (Team Members, Categories, Avg Rating, Below Target), heatmap table (team members × skill categories, cells color-coded from dark green to red).
- **Skill Gaps Tab** (HR): Summary cards (Total Skills, Avg Level, Critical Gaps, Improvement Rate %), Top 10 gaps bar chart, Department × Category heatmap.

**Math / Weightage / Scoring:**
- Gap calculation: `targetLevel - max(selfRating, managerRating)`.
- Gap labels: ≤ 0 = "On Target" (green), = 1 = "Minor Gap" (amber), ≥ 2 = "Critical Gap" (red).
- Improvement Rate: `skills with gap ≤ 0 / total skills × 100%`.
- Heatmap colors: 4.5–5 = dark green, 3.5–4.5 = light green, 2.5–3.5 = yellow, 1.5–2.5 = orange, 1–1.5 = red.

**Dependencies:** Skill Categories (configured by HR). Feeds into Career Path and Development Plans.

**USP angle:** Visual heatmap at team and org level makes skill gaps immediately visible — not buried in spreadsheets.

---

### Feature: Career Path

**What it is (simple):** A visual career progression tool showing current role, possible next roles, lateral moves, and growth requirements.

**Why it exists in PMS (business reason):** Employee retention depends on clear growth paths. This feature makes career possibilities visible and actionable.

**Who uses it:** Employees (explore own path), Managers (advise reports).

**Where it appears in the UI:** `/career`

**Inputs:** Role Explorer: search by title/department/skill, department filter, level filter.

**Outputs:**
- **Career Path Visualization** (3-column layout): Previous Roles → Current Role → Next Roles, with connecting lines.
- **Current Position Card**: Title, performance badge (Exceptional/Exceeds/Meets/Developing), performance score (1–5 with colored progress ring), level (1–7), department, tenure, top 5 skills with progress bars.
- **Growth Requirements Panel** (on role selection): Competency comparison (current vs. required with colored gaps), skills gap (amber badges), recommended activities (type + duration), estimated timeline, mentorship suggestions.
- **Role Explorer Tab**: Grid of role cards with title, department, level range, description, required skills.
- **My Career Goals Tab**: Goal cards with target role, target date, progress %, milestone checklist.

**Math / Weightage / Scoring:**
- Performance score: 1–5 scale with colored progress (red < 2.5, amber 2.5–3.5, green > 3.5).
- Level: 1=Junior, 2=Mid-Level, 3=Senior, 4=Staff, 5=Principal, 6=Director, 7=VP.
- Competency gaps: `required_level - current_level`.
- Goal progress: 0–100% with visual progress bar and milestone completion.

**Dependencies:** Skills Matrix (for competency data), Performance data, Role catalog (HR-configured).

**USP angle:** Visual career mapping with competency gap analysis and recommended activities — turns vague "career development" into a concrete plan.

---

### Feature: Development Plans

**What it is (simple):** Structured learning and growth plans with timelines, activities, and progress tracking.

**Why it exists in PMS (business reason):** Development plans translate career aspirations and skill gaps into actionable learning paths.

**Who uses it:** Employees (create own plans), Managers (view team plans).

**Where it appears in the UI:** `/development` (list), `/development/:id` (detail).

**Inputs (Create Plan):**
- Plan Name, Type (CAREER_GROWTH / SKILL_DEVELOPMENT / LEADERSHIP / PERFORMANCE_IMPROVEMENT), Career Goal, Target Role, Current Level, Duration (months), Start Date, Target Completion Date, Strengths (tags), Development Areas (tags).

**Outputs:**
- **Plan cards**: Employee info (team view), plan name, progress ring (circular 0–100%), type badge, status badge (Draft/Active/Completed/Cancelled), career goal, current level → target role, progress bar, dates, development area tags.

**Math / Weightage / Scoring:** Overall progress (0–100%). Plan duration in months.

**Dependencies:** Career Path (for goal/role context), Skills Matrix (for gap identification).

**USP angle:** Integrated with career pathing — development plans are created from identified gaps, not in a vacuum.

---

### Feature: Evidence Management

**What it is (simple):** A centralized repository for performance evidence — documents, certificates, project outcomes, metrics, and testimonials.

**Why it exists in PMS (business reason):** Evidence-based performance management prevents "recency bias" and ensures ratings are defensible.

**Who uses it:** Employees (submit evidence), Managers (verify evidence), HR Admin (manage).

**Where it appears in the UI:** `/evidence`

**Inputs:**
- Title, Description, Type (22 types — see Appendix C.6 for full list; includes DOCUMENT, CERTIFICATE, PROJECT_MILESTONE, METRIC_ACHIEVEMENT, PULL_REQUEST, CODE_COMMIT, CUSTOMER_FEEDBACK, MENTORSHIP_SESSION, and more), Source (16 integrations — see Appendix C.6; includes JIRA, GITHUB, GITLAB, SALESFORCE, WORKDAY, MANUAL, and more), URL (optional), Assign to User (optional), Metadata (JSON, optional).

**Outputs:**
- **Summary Cards**: Total Evidence, Pending Review, Verified, Archived.
- **Evidence Table** (sortable): Title with type icon, type badge, source, status badge, user, created date, actions.
- **Row Actions**: View, Edit (if PENDING_VERIFICATION), Verify (managers), Archive, Link to Review (if VERIFIED).
- **Evidence Status Workflow**: PENDING_VERIFICATION → VERIFIED → (linked to review) or DISPUTED/REJECTED/ARCHIVED.

**Math / Weightage / Scoring:** Evidence feeds into the CPIS Evidence Quality Score (EQS) dimension. Verification rate and type diversity affect the score.

**Dependencies:** Reviews (for linking). Users API (for assignment).

**USP angle:** Evidence verification by managers creates accountability. Linking evidence to reviews creates an auditable trail.

---

### Feature: Compensation Management

**What it is (simple):** A workflow for creating, approving, and implementing compensation changes (merit increases, bonuses, equity, adjustments).

**Why it exists in PMS (business reason):** Links performance outcomes to pay decisions. Budget tracking prevents overspending.

**Who uses it:** Managers (propose), HR Admin (approve/implement).

**Where it appears in the UI:** `/compensation`

**Inputs:**
- Employee, Type (MERIT_INCREASE / PROMOTION_RAISE / BONUS / EQUITY / ADJUSTMENT), Proposed Amount, Currency (USD/EUR/GBP/INR/AED), Justification, Effective Date, Linked Evidence (optional).

**Outputs:**
- **Summary Cards**: Total Proposals, Pending Approval, Approved, Budget Utilized %.
- **Budget utilization** progress bar (green < 70%, amber 70–90%, red > 90%).
- **Decision Table** (expandable): Employee, type badge, current amount, proposed amount, change %, status badge, effective date.
- **Department Budget Breakdown**: Allocated vs. used vs. remaining with utilization %.

**Math / Weightage / Scoring:**
- Change %: `((proposed - current) / current) × 100`.
- Budget utilization: `used / allocated × 100`.

**Dependencies:** Employee data, Evidence (for linking), Performance data (for justification).

**USP angle:** Built-in budget tracking per department and evidence-linked justifications — prevents arbitrary pay decisions.

---

### Feature: Promotions

**What it is (simple):** A structured workflow for nominating, reviewing, approving, and implementing employee promotions.

**Why it exists in PMS (business reason):** Formalizes the promotion process with approvals and documentation, preventing ad-hoc or biased decisions.

**Who uses it:** Managers (nominate, review), HR Admin (approve, implement).

**Where it appears in the UI:** `/promotions`

**Inputs:**
- Employee, Promotion Type (TITLE_CHANGE / LEVEL_PROMOTION / ROLE_CHANGE / LATERAL_MOVE), Proposed Role, Proposed Level, Justification (min 50 chars), Effective Date, Linked Evidence.

**Outputs:**
- **Summary Cards**: Total Nominations, Under Review, Approved, Implemented.
- **Table**: Employee with avatar, type badge, role change (current → proposed), level change, status badge, nominated by, date.

**How it works:** Workflow: NOMINATED → UNDER_REVIEW → APPROVED/REJECTED/DEFERRED → IMPLEMENTED. Managers can defer with a reason and optional date.

**Dependencies:** Employee data, Evidence, Performance reviews.

**USP angle:** Multi-step approval workflow with deferral option and evidence linking — most tools treat promotions as simple status changes.

---

### Feature: Succession Planning

**What it is (simple):** Identifies critical roles, maps potential successors, and tracks their readiness — using a 9-box grid of Performance vs. Potential.

**Why it exists in PMS (business reason):** Proactive talent risk management ensures continuity when key people leave.

**Who uses it:** HR Admin, Senior Leadership.

**Where it appears in the UI:** `/succession`

**Inputs:**
- Position Title, Criticality (CRITICAL/HIGH/MEDIUM/LOW), Current Incumbent, Turnover Risk (HIGH/MEDIUM/LOW), Vacancy Impact (SEVERE/SIGNIFICANT/MODERATE/MINIMAL), Time to Fill (days), Review Frequency, Notes.

**Outputs:**
- **Nine-Box Grid**: 3×3 matrix (Performance axis: Low/Medium/High; Potential axis: Low/Medium/High).
  - Cell categories: Underperformers, Average Performers, Workhorses (bottom row), Up or Out, Core Players, High Performers (middle), Enigmas, High Potentials, Stars (top).
  - Summary stats: Total employees, Stars count/%, High potential %, Underperformers %.
  - Avatar stacks in each cell with click-to-expand detail.
- **Succession Plans**: Plan cards with position, criticality badge, incumbent, bench strength, turnover risk, vacancy impact, review frequency, readiness badges (READY_NOW / READY_1_YEAR / READY_2_YEARS / DEVELOPMENT_NEEDED).

**Math / Weightage / Scoring:** Performance and potential scores place employees on the 9-box grid. Bench strength = count of successors.

**Dependencies:** Performance scores, potential assessments, employee data.

**USP angle:** Integrated 9-box grid directly connected to performance data — no manual plotting required.

---

### Feature: Compliance Dashboard

**What it is (simple):** Tracks completion of mandated activities — review completion, goal setting, feedback frequency, calibration, training.

**Why it exists in PMS (business reason):** Ensures organizational process compliance and regulatory requirements are met on time.

**Who uses it:** HR Admin, Compliance Officers.

**Where it appears in the UI:** `/compliance`

**Inputs:**
- Employee, Review Type (REVIEW_COMPLETION / GOAL_SETTING / FEEDBACK_FREQUENCY / CALIBRATION / TRAINING), Deadline, Priority (LOW/MEDIUM/HIGH/CRITICAL), Notes.

**Outputs:**
- **Summary Cards**: Total Reviews, Pending, Completed, Overdue, Compliance Rate %.
- **Compliance Table**: Employee, type badge, status badge, deadline with urgency indicator (overdue/urgent/upcoming), priority, reviewer, last updated.
- **Upcoming Deadlines Sidebar**: Cards with urgency labels.

**Math / Weightage / Scoring:**
- Compliance Rate: `completed / total × 100`.
- Deadline urgency: Overdue (past due), Urgent (≤3 days), Upcoming (≤7 days).

**Dependencies:** Review data, Goal data, Training data.

**USP angle:** Proactive compliance tracking with deadline urgency calculation — prevents last-minute scrambles.

---

### Feature: Analytics

**What it is (simple):** Performance analytics dashboards with trend charts, distributions, and bias detection.

**Why it exists in PMS (business reason):** Data-driven decision making. Surfaces patterns, trends, and potential issues that manual review would miss.

**Who uses it:** Managers (team analytics), HR Admin (org-wide + fairness).

**Where it appears in the UI:** `/analytics`

**Inputs:** Review cycle selector. Tab navigation (Overview, Performance, Goals, Feedback, Fairness).

**Outputs:**
- **Overview Tab**: Key metric cards (Total Goals, Avg Progress, Review Completion %, Feedback Given), goal status breakdown, reviews overview, team overview (managers).
- **Performance Tab**: Rating distribution bar chart (1–5 stars), team comparison table (HR only: department, employees, avg progress, avg rating, feedback count).
- **Goals Tab**: Goal completion trends line chart (6 months), completion rate bar chart.
- **Feedback Tab**: Feedback trends line chart (Praise/Constructive/Total), type breakdown pie chart.
- **Fairness Tab** (HR only): Rating analysis by dimension with variance flagging (>1.0 variance highlighted).
- **Export buttons** (HR): Export Goals CSV, Export Reviews CSV, Export Feedback CSV.

**Math / Weightage / Scoring:**
- Goal status: On Track (≥70%), At Risk (40–70%), Behind (<40%).
- Variance flagging: variance > 1.0 = "review needed".

**Dependencies:** Goals, Reviews, Feedback APIs, Review Cycles.

**USP angle:** Built-in fairness tab with variance detection — not an add-on but a core analytics feature.

---

### Feature: HR Analytics

**What it is (simple):** Advanced HR-specific analytics including compensation modeling, bias analysis, and rating normalization.

**Why it exists in PMS (business reason):** Provides HR with tools to detect and correct systemic bias, model compensation impacts, and normalize ratings.

**Who uses it:** HR Admin only.

**Where it appears in the UI:** `/hr-analytics`

**Inputs:** "Apply Normalization" confirmation (modal).

**Outputs:**
- **Compensation Modeling Tab**: Stat cards (median comp, avg by tier), performance vs. compensation scatter plot (by department), compensation gap analysis table (with gap % color-coded: red overpaid, green underpaid), department compensation ratios.
- **Bias Analysis Tab**: Rating distribution by department bar chart, statistical indicators table (mean, std dev, significance badge), manager rating comparison bar chart (lenient/neutral/severe coloring with org-wide mean reference line), demographic parity check table.
- **Rating Normalization Tab**: Bell curve metrics (R², skewness, kurtosis), before/after distribution area chart, normalization preview table (employee, department, original rating, z-score, normalized rating, adjustment delta).

**Math / Weightage / Scoring:**
- Compensation correlation: `compensation = slope × rating + intercept` (linear regression).
- Significance detection: stdDev > 1.0 flagged as "Significant Difference Detected".
- Demographic parity: gap > 0.3 from overall mean = "Review Needed".
- Normalization z-score: `z = (rating - dept_mean) / dept_stddev`, rescaled to `global_mean + z × global_stddev`.
- Bell curve metrics: R² (fit to normal), skewness (0 = symmetric), kurtosis (3 = normal).

**Dependencies:** Analytics API (compensation, bias, normalization data).

**USP angle:** Integrated bias detection and z-score normalization in one view — most PMS tools require external data science tools for this.

---

### Feature: Manager Dashboard (Manager Hub)

**What it is (simple):** A dedicated command center for managers showing team performance, action items, goal tracking, and quick actions.

**Why it exists in PMS (business reason):** Managers need a single place to see everything about their team without navigating to 10 different pages.

**Who uses it:** Managers, Admins.

**Where it appears in the UI:** `/manager-dashboard`

**Inputs:** Date range toggle (This Week/Month/Quarter), Sort field (Name/Performance/Goal Progress).

**Outputs:**
- **Summary Cards** (5): Team Size, Avg Goal Progress %, Pending Reviews, Upcoming 1:1s, Active PIPs.
- **Team Performance Table**: Member info (linked), job title, goal progress (bar + %), last rating (mini stars), feedback %, status dot (red/amber/green).
- **Action Items**: Urgency badges (Overdue/Due Today/Upcoming), pending reviews, upcoming 1:1s, active PIPs with navigation links.
- **Goal Tracker**: On Track/At Risk/Behind cards with counts and percentages, closest-to-completion (top 5), most at-risk (bottom 5).
- **Quick Actions** (6 gradient cards): Schedule 1:1, Give Feedback, Start Review, Create Goal, View Reports, Team Analytics.
- **Recent Activity Feed**: Timeline of team events.

**Math / Weightage / Scoring:**
- Goal tracking status: On Track (≥70%), At Risk (40–70%), Behind (<40%).
- Team average goal progress %.

**Dependencies:** Team data, Goals, Reviews, Feedback, 1-on-1s, PIPs, Performance Math API.

**USP angle:** Unified manager view with action items prioritized by urgency — reduces the "manager overhead" complaint.

---

### Feature: Reports & Export

**What it is (simple):** Generate and download performance reports in PDF, Excel, or CSV format, with optional scheduled generation.

**Why it exists in PMS (business reason):** Stakeholders need offline/printable reports for board meetings, compliance, and archival.

**Who uses it:** HR Admin, Managers.

**Where it appears in the UI:** `/reports`

**Inputs:**
- **Generate Report form**: Report Type (Performance Summary / 360-Degree Feedback / Team Analytics / Compensation Analysis / Development Progress / Goal Achievement / PIP Status), Start/End Date, Scope (Individual/Team/Department/Organization), Format (PDF/Excel/CSV).
- **Create Schedule**: Report Type, Cron Expression, Start/End Date.

**Outputs:**
- **Generated Reports Table**: Report name, type badge, generated date, status badge (COMPLETED/PENDING/PROCESSING/FAILED), format badges, download buttons.
- **Scheduled Reports Table**: Report type, cron expression, next run, last run, status (ACTIVE/PAUSED).

**Dependencies:** All performance data (goals, reviews, feedback, compensation, development, PIPs).

**USP angle:** 7 report types + scheduled generation with cron support — automated reporting without manual effort.

---

### Feature: Employee Profile

**What it is (simple):** A comprehensive view of any employee's performance data — scores, goals, reviews, feedback, development, and evidence.

**Why it exists in PMS (business reason):** Provides a 360-degree view of an employee for managers and HR making talent decisions.

**Who uses it:** All employees (own profile), Managers (reports' profiles).

**Where it appears in the UI:** `/employees/:id`

**Inputs:** Tab navigation (Overview, Goals, Reviews, Feedback, Development, Evidence).

**Outputs:**
- **Header**: Avatar, name, status badge, job title, department, manager, email.
- **Performance Score Card**: Overall score (color-coded), derived rating (1–5 stars), percentile vs. peers, trajectory (trend), confidence %, data point counts (goals, reviews, feedback).
- **Score Breakdown Bars**: Goal attainment, Review score, Feedback score (each 0–5).
- **Summary Cards**: Goals (total/completed/active/at risk), Avg Progress %, Feedback (total, praise vs. constructive), Latest Review (rating/5).
- **Tab contents**: Goals table, reviews list, feedback cards, development plans, evidence table.

**Math / Weightage / Scoring:**
- Overall performance score from math engine.
- Percentile ranking vs. peer population.
- Trajectory: trend direction from historical data.
- Avg Progress: `sum(all goal progress) / goal_count`.

**Dependencies:** Performance Math API, Goals, Reviews, Feedback, Evidence, Development Plans.

**USP angle:** Six-tab comprehensive profile with computed percentile and trajectory — a true "employee performance passport."

---

### Feature: User Management (Admin)

**What it is (simple):** Administrative interface for creating, editing, deactivating, and managing user accounts and roles.

**Who uses it:** HR Admin, Super Admin.

**Where it appears in the UI:** `/admin/users`

**Inputs:** Create/Edit User form (first name, last name, email, password, job title, department, roles). Role management (add/remove roles per user). Search and active-only filter.

**Outputs:** Stats cards (Total/Active/Inactive/Admins), user table (avatar, name, email, role badges, department, status, actions).

**Dependencies:** Roles, Departments.

---

### Feature: System Configuration (Admin)

**What it is (simple):** Configure rating scales, review templates, competency frameworks, and questionnaires.

**Who uses it:** Admin, HR Admin.

**Where it appears in the UI:** `/admin/config`

**Inputs:** Review template creation (name, sections with weights), competency framework creation (name, hierarchical competencies), questionnaire creation (name, type, questions with types).

**Outputs:** Rating scale cards with visual gradients, template cards, expandable competency trees, questionnaire lists.

**Dependencies:** Used by Reviews, Self-Appraisal.

---

### Feature: Audit Log (Admin)

**What it is (simple):** A complete record of all system activities for compliance and security.

**Who uses it:** Admin, Compliance Officers.

**Where it appears in the UI:** `/admin/audit`

**Inputs:** Filters: date range, entity type (USER/GOAL/REVIEW/etc.), action (CREATE/UPDATE/DELETE/LOGIN/etc.), user search. Export CSV button.

**Outputs:** Stats cards (Total Events with trend, Events Today, Active Users, Most Common Action), event table (timestamp, user, action badge, entity type, entity ID, IP address, expandable JSON diff with before/after states), timeline sidebar (grouped by date).

**Math / Weightage / Scoring:** Event count trending (compared to previous period).

**Dependencies:** All system events.

---

### Feature: Team Management

**What it is (simple):** A directory and org-chart view of team members with quick actions for email and feedback.

**Why it exists in PMS (business reason):** Managers need a clear view of their team structure to manage performance effectively. The org chart shows reporting relationships at a glance.

**Who uses it:** Managers (full team view + activity heatmap), All employees (team directory).

**Where it appears in the UI:** `/team`

**Inputs:** Search by name/email, view toggle (List / Org Chart).

**Outputs:**
- **Direct Reports Section** (managers only): Grid of report cards with avatar, name, job title, department, manager link, action buttons (Email, Give Feedback).
- **Team Activity Heatmap** (managers only): GitHub-style activity visualization.
- **User Cards** (list view): Avatar, name, badges ("You", "Inactive"), job title, department, reports-to info, action buttons.
- **Org Chart View**: Tree structure with nested levels, connection lines, expand/collapse for reporting hierarchy.

**Math / Weightage / Scoring:** None — operational feature.

**Dependencies:** Users API, Activity data (for heatmap).

**USP angle:** Integrated activity heatmap on team page — managers see engagement patterns without switching tools.

---

### Feature: Announcements

**What it is (simple):** Company-wide announcements and news feed with acknowledgment tracking.

**Why it exists in PMS (business reason):** Centralized communication ensures important organizational updates reach all employees within the performance context.

**Who uses it:** All employees.

**Where it appears in the UI:** `/announcements`

**Outputs:** Announcement feed with read indicators. Acknowledgment tracking.

**Dependencies:** None.

---

### Feature: Help & Documentation

**What it is (simple):** In-app help center with documentation, FAQs, and support contact.

**Why it exists in PMS (business reason):** Reduces support burden by providing self-service answers within the platform.

**Who uses it:** All users.

**Where it appears in the UI:** `/help`

**Outputs:** Help articles, FAQ sections, contact support form.

---

### Feature: Profile & Settings

**What it is (simple):** Personal profile editing and user preferences (notification settings, display settings, theme).

**Who uses it:** All users.

**Where it appears in the UI:** `/profile`, `/settings`

**Outputs:** Profile editor, avatar upload, theme toggle (light/dark/system), notification preferences.

---

## 6. Scoring System Deep Dive

### 6.1 Overview (Non-Technical)

The PMS Platform uses a **layered scoring system** where raw data (goals, reviews, feedback, attendance, evidence) flows through mathematical formulas to produce meaningful performance scores. The flagship score is the **CPIS (Comprehensive Performance Intelligence Score)** — an 8-dimensional composite that rates each employee on a 0–100 scale.

Think of it like a credit score for work performance: instead of one number pulled from thin air, it's built from 8 measurable dimensions, each weighted to reflect organizational priorities. The system also includes **fairness mechanisms** (bias detection, calibration, Bayesian smoothing) to ensure scores are equitable.

### 6.2 CPIS: The 8-Dimensional Score

The CPIS is the platform's core scoring engine. It produces a final score (0–100), a grade (A+ through D), and a star rating (1–5).

#### Dimension Weights

| # | Dimension | Code | Weight | What It Measures |
|---|-----------|------|--------|------------------|
| 1 | Goal Attainment Index | GAI | 25% | How well goals are completed — factoring in progress, priority, timeliness, and strategic alignment |
| 2 | Review Quality Score | RQS | 20% | Calibrated review ratings — weighted by reviewer type and trust, adjusted for bias |
| 3 | Feedback Sentiment Index | FSI | 12% | Ongoing feedback sentiment — recent feedback weighs more than older feedback |
| 4 | Collaboration Impact Score | CIS | 10% | Cross-functional work, feedback exchanged, 1-on-1 participation, recognition given |
| 5 | Consistency & Reliability Index | CRI | 10% | On-time delivery rate, velocity consistency, streaks, rating stability, deadline adherence |
| 6 | Growth Trajectory Score | GTS | 8% | Performance trend (improving?), skill progressions, training, development plan progress |
| 7 | Evidence Quality Score | EQS | 8% | Quality and diversity of submitted evidence — verification rate, impact, variety |
| 8 | Initiative & Innovation Index | III | 7% | Innovation contributions, mentoring, knowledge sharing, process improvements, voluntary activities |
| | **Total** | | **100%** | |

#### Master Formula

```
Step 1: Compute each dimension score (0–100)
Step 2: Raw Composite = Σ(Dimension_i × Weight_i)
Step 3: Tenure Factor = min(1.10, 1 + tenure_years × 0.02)    [max +10% for experience]
Step 4: Raw Score = min(100, Raw Composite × Tenure Factor)
Step 5: Fair-Adjusted Score = Bayesian Smoothing(Raw Score, Department Average, Data Points)
Step 6: Data Confidence = 0.5 + 0.5 × sigmoid(total_data_points, k=0.2, x₀=10)
Step 7: Final Score = Fair-Adjusted × Data Confidence + 50 × (1 - Data Confidence)
```

**What this means in plain language:**
- Steps 1–2: Calculate each dimension and combine them by weight.
- Step 3: Employees with more tenure get a small bonus (up to +10%) for institutional experience.
- Steps 5–6: If there isn't much data about an employee (new hires, sparse feedback), the score is pulled toward the department average — preventing unfair extremes from small samples. As more data accumulates, the individual score gets more weight.
- Step 7: Confidence determines how much we trust the individual score vs. the "safe" midpoint of 50.

#### Grade & Star Mapping

| Score Range | Grade | Stars |
|-------------|-------|-------|
| ≥ 95 | A+ | 5 |
| ≥ 85 | A | 5 (if ≥90) or 4 |
| ≥ 78 | B+ | 4 |
| ≥ 70 | B | 4 (if ≥75) or 3 |
| ≥ 62 | C+ | 3 |
| ≥ 50 | C | 3 (if ≥55) or 2 |
| ≥ 35 | D | 2 |
| < 35 | F | 1 |

#### Rank Labels (derived from score)

| Score Range | Rank Label |
|-------------|-----------|
| ≥ 95 | Exceptional Performer |
| ≥ 85 | Elite Performer |
| ≥ 75 | High Achiever |
| ≥ 65 | Strong Contributor |
| ≥ 55 | Solid Performer |
| ≥ 45 | Developing Talent |
| ≥ 35 | Emerging Talent |
| < 35 | Needs Support |

#### Confidence Interval Calculation

The CPIS includes a confidence interval [that tells you how reliable the score is based on available data]:

```
confidenceLevel = sigmoid(totalDataPoints, k=0.2, x₀=10)
margin = max(2, 15 × (1 - confidenceLevel))
lowerBound = max(0, finalScore - margin)
upperBound = min(100, finalScore + margin)
```

- With 1–3 data points: confidence ~50%, margin ~8–10 points (wide range)
- With 10 data points: confidence ~73%, margin ~4 points
- With 20+ data points: confidence ~88%+, margin ~2 points (tight range)
- Minimum margin is always 2 points (never claims perfect certainty)

#### Trajectory Calculation

```
direction: slope > 1.0 = "improving", slope < -1.0 = "declining", else "stable"
predictedNext = slope × (scoreCount) + intercept
```

Uses linear regression on historical CPIS scores. R² indicates fit quality.

### 6.3 Dimension Formulas (Detailed)

#### D1: Goal Attainment Index (GAI) — Weight: 25%

```
GAI = Σ(Progress_i × Weight_i × Priority_i × Timeliness_i × Alignment_i × Complexity_i) / Σ(Weight_i)
```

| Input | Source | Description |
|-------|--------|-------------|
| Progress_i | Goal progress (0–100) | How far along the goal is |
| Weight_i | Goal weight (0–10) | Importance of this goal |
| Priority_i | Goal priority | LOW=0.85, MEDIUM=1.0, HIGH=1.15, CRITICAL=1.35 |
| Timeliness_i | Days late/early | `boundedSigmoid(-daysLate, min=0.6, max=1.4, k=0.15, x₀=0)` — early goals score up to 1.4×, late goals down to 0.6× |
| Alignment_i | Alignment depth | `min(1.15, 1 + depth × 0.03)` — bonus up to +15% for goals aligned to strategic objectives |
| Complexity_i | Goal complexity (1–5) | `1 + (complexity - 3) × 0.04` — complexity 5 adds +8%, complexity 1 subtracts -8% |

**Sub-metrics:** Completion rate (%), Average progress, On-time rate (%), Complexity-adjusted score, Aligned goals count.

**Example:** Employee has 3 goals:
- Goal A: 100% complete, weight 8, HIGH priority, 3 days early, aligned depth 2 → 100 × 8 × 1.15 × 1.35 × 1.06 = ~1319
- Goal B: 60% complete, weight 5, MEDIUM priority, on time, no alignment → 60 × 5 × 1.0 × 1.0 × 1.0 = 300
- Goal C: 30% complete, weight 3, LOW priority, 10 days late, no alignment → 30 × 3 × 0.85 × 0.75 × 1.0 = ~57.4
- GAI = (1319 + 300 + 57.4) / (8 + 5 + 3) = **104.8** → capped at **100**

#### D2: Review Quality Score (RQS) — Weight: 20%

```
RQS = WeightedHarmonicMean(Rating_i × (1 - Bias_i), Trust_i × TypeWeight_i) × 20
```

| Input | Description |
|-------|-------------|
| Rating_i | Calibrated rating (1–5) for each review |
| Bias_i | Reviewer's bias score (0–1), max 50% penalty |
| Trust_i | Reviewer's trust score (0–100), based on review volume and consistency |
| TypeWeight_i | MANAGER=1.5, THREE_SIXTY=1.3, PEER=1.0, UPWARD=0.9, EXTERNAL=0.8, SELF=0.5 |

The weighted harmonic mean is used because it better handles rate-based data. Manager reviews count 3× as much as self-assessments.

**Example:** One manager review (rating 4, trust 80) and one peer review (rating 3.5, trust 60):
- Manager: value = 4 × 1.0 = 4, weight = 80 × 1.5 = 120
- Peer: value = 3.5 × 1.0 = 3.5, weight = 60 × 1.0 = 60
- WHM = (120 + 60) / (120/4 + 60/3.5) = 180 / (30 + 17.14) = **3.82**
- RQS = 3.82 × 20 = **76.3**

#### D3: Feedback Sentiment Index (FSI) — Weight: 12%

```
FSI = EWMA(Sentiment_i × Quality_i, α=0.35) × 100
```

Uses Exponentially Weighted Moving Average — recent feedback counts more than old feedback (decay factor α=0.35). Quality multiplier adds +10% for feedback with skill tags and +10% for feedback with value tags.

#### D4: Collaboration Impact Score (CIS) — Weight: 10%

Six collaboration channels, each converted to a 0–100 score using a bounded sigmoid curve (0–100 range):

| Channel | Weight | Sigmoid k | Sigmoid x₀ (midpoint) | Meaning of x₀ |
|---------|--------|-----------|----------------------|----------------|
| Cross-functional goals | 20% | 0.5 | 3 | ~3 cross-team goals = 50th percentile |
| Feedback given | 15% | 0.3 | 5 | ~5 feedback items given = 50th percentile |
| Feedback received | 15% | 0.3 | 5 | ~5 feedback items received = 50th percentile |
| 1-on-1 meetings attended | 15% | 0.5 | 4 | ~4 meetings = 50th percentile |
| Recognitions given | 15% | 0.5 | 3 | ~3 recognitions = 50th percentile |
| Team contributions | 20% | 0.5 | 2 | ~2 contributions = 50th percentile |

CIS = weighted mean of all 6 channels. Each channel uses `boundedSigmoid(count, 0, 100, k, x₀)` to convert raw counts into scores.

#### D5: Consistency & Reliability Index (CRI) — Weight: 10%

```
CRI = 0.30 × OnTimeRate + 0.25 × VelocityConsistency + 0.20 × StreakFactor
      + 0.15 × RatingConsistency + 0.10 × DeadlineScore
```

**Sub-metric formulas:**
- **OnTimeRate** = `onTimeDeliveries / totalDeliveries × 100`
- **VelocityConsistency** = `max(0, (1 - min(1, goalVelocityVariance / 50)) × 100)` — variance normalized by divisor 50; lower variance = higher score
- **StreakFactor** = `sigmoid(streakDays, k=0.1, x₀=14) × 100` — 14-day streak = 50th percentile; growth rate 0.1
- **RatingConsistency** = `max(0, (1 - min(1, reviewRatingStdDev / 2)) × 100)` — std dev normalized by divisor 2; lower variation = higher score
- **DeadlineScore** = `(totalDeadlines - missedDeadlines) / totalDeadlines × 100`

Rewards employees who consistently deliver on time, maintain steady velocity, sustain performance streaks, and receive stable ratings.

#### D6: Growth Trajectory Score (GTS) — Weight: 8%

```
GTS = 0.35 × TrendScore + 0.20 × SkillGrowth + 0.15 × TrainingScore
      + 0.15 × DevPlanProgress + 0.15 × ReadinessScore
```

**Sub-metric sigmoid parameters:**
- **TrendScore** = `sigmoid(linearRegression.slope, k=0.5, x₀=0) × 100` — positive slope = improving
- **SkillGrowth** = `sigmoid(skillProgressions, k=0.5, x₀=3) × 100` — 3 skill progressions = 50th percentile
- **TrainingScore** = `sigmoid(trainingsCompleted, k=0.5, x₀=2) × 100` — 2 trainings = 50th percentile
- **DevPlanProgress** = development plan completion percentage (0–100)
- **ReadinessScore** = succession readiness percentage (0–100)

Measures whether the employee is improving over time. TrendScore uses linear regression on historical performance data.

#### D7: Evidence Quality Score (EQS) — Weight: 8%

```
EQS = 0.25 × VerificationRate + 0.30 × AvgImpact + 0.25 × AvgQuality + 0.20 × DiversityBonus
```

**Sub-metric details:**
- **VerificationRate** = `verifiedCount / totalEvidence × 100`
- **AvgImpact** = average impact score of all evidence (0–100)
- **AvgQuality** = average quality score of all evidence (0–100)
- **DiversityBonus** = `sigmoid(distinctEvidenceTypes, k=0.5, x₀=3) × 100` — 3 different types = 50th percentile

Rewards verified, high-impact, high-quality evidence across multiple types.

#### D8: Initiative & Innovation Index (III) — Weight: 7%

```
III = 0.25 × InnovationScore + 0.20 × MentoringScore + 0.20 × KnowledgeScore
      + 0.15 × ProcessScore + 0.20 × VoluntaryScore
```

**Sub-metric sigmoid parameters:**

| Sub-metric | Count Input | k | x₀ (midpoint) |
|------------|------------|---|----------------|
| InnovationScore | Innovation contributions | 0.6 | 2 |
| MentoringScore | Mentoring sessions | 0.4 | 3 |
| KnowledgeScore | Knowledge-sharing activities | 0.5 | 2 |
| ProcessScore | Process improvements | 0.6 | 1 |
| VoluntaryScore | Voluntary goal completions | 0.5 | 2 |

Each sub-metric uses `sigmoid(count, k, x₀) × 100` to convert raw activity counts into 0–100 scores.

### 6.4 Fairness Mechanisms

| Mechanism | What It Does | When It Applies |
|-----------|-------------|-----------------|
| **Z-Score Calibration** | Normalizes reviewer ratings to remove lenient/harsh bias | During calibration sessions |
| **Bayesian Smoothing** | Pulls scores toward department average when data is sparse | When employee has < 10 data points |
| **New Employee Adjustment** | Protects employees with < 6 months tenure from extreme scores | Automatic in CPIS calculation |
| **Disparate Impact Analysis** | Computes score/departmentAvg ratio to flag groups | Automatic fairness flag |
| **Reviewer Bias Detection** | Flags reviewers with biasScore > 0.3 | In analytics and calibration |
| **Self-Assessment Inflation Detection** | Flags when self-avg exceeds others-avg by > 1.3× | In moderator dashboard gap analysis |

**Bayesian Smoothing Formula (detailed):**

```
priorWeight = max(0, 5 - totalDataPoints × 0.5)
fairAdjustedScore = (departmentAvg × priorWeight + rawScore × totalDataPoints) / (priorWeight + totalDataPoints)
```

- With 0 data points: priorWeight = 5, score = 100% department average
- With 5 data points: priorWeight = 2.5, score = 67% individual + 33% department avg
- With 10+ data points: priorWeight = 0, score = 100% individual (no smoothing)

**New Employee Adjustment:** If tenure < 0.5 years AND totalDataPoints < 5, Bayesian shrinkage is applied more aggressively.

**Reviewer Bias Scoring Formula:**

```
biasScore = 100 - |avgRating - overallMean| × 20 - (variance < 0.3 ? 10 : 0)
combinedBias = (biasScore + avgContentBias) / 2
```

A reviewer with ratings far from the mean or with very low variance (always gives same score) gets a lower bias score.

### 6.5 Goal Risk Assessment

The platform computes a risk score (0–100) for each goal:

```
Risk = 0.40 × ScheduleRisk + 0.30 × VelocityRisk + 0.15 × DependencyRisk + 0.15 × ComplexityRisk
```

| Component | Formula | Meaning |
|-----------|---------|---------|
| Schedule Risk | `sigmoid(scheduleDeviation, k=3, x₀=0) × 100` where scheduleDeviation = (expected - actual) / expected | Is the goal behind where it should be by now? |
| Velocity Risk | `sigmoid(velocityRatio - 1, k=2, x₀=0) × 100` where velocityRatio = required / current | Can the employee maintain the pace needed to finish on time? |
| Dependency Risk | mean(dependency_risks) × 0.6 + max(dependency_risks) × 0.4 | Are blocking dependencies at risk? |
| Complexity Risk | (complexity / 5) × (remaining_progress / 100) × 100 | How complex is the remaining work? |

**Risk Levels:** LOW (< 25), MEDIUM (25–50), HIGH (50–75), CRITICAL (≥ 75).

### 6.6 Task-to-Goal Composite Score

When a goal has child goals or tasks:

```
CompositeScore = (0.50 × CompletionScore + 0.30 × QualityScore + 0.20 × TimelinessScore) × EfficiencyMultiplier

Where:
  CompletionScore = Σ(task_progress × task_weight) / Σ(task_weights)
  QualityScore = EWMA(quality_ratings) / 5 × 100
  TimelinessScore = sigmoid(-avg_days_late) × 100
  EfficiencyMultiplier = clamp(avg_quality / avg_complexity, 0.5, 1.5)
```

### 6.7 Individual Performance Score (Simplified)

For contexts outside CPIS (e.g., population ranking), a simplified score is computed:

```
OverallScore = 0.40 × GoalAttainment + 0.30 × ReviewScore + 0.10 × FeedbackScore
               + 0.10 × AttendanceScore + 0.10 × CollaborationScore
```

Rating derivation (1–5 scale):
- Percentile-based: ≥90th = 5, ≥70th = 4, ≥30th = 3, ≥10th = 2, <10th = 1.
- Score-based fallback: ≥85 = 5, ≥70 = 4, ≥50 = 3, ≥30 = 2, else 1.

### 6.8 Team Analytics

For manager dashboards:

| Metric | Formula | Meaning |
|--------|---------|---------|
| Average Score | mean(team_member_scores) | Team performance center |
| Score Spread | standard_deviation(team_scores) | How varied is performance? |
| Rating Entropy | Shannon entropy of rating distribution | How evenly distributed are ratings? (0=all same, 1=perfectly spread) |
| Gini Coefficient | Standard Gini formula | Inequality measure (0=equal, 1=all concentrated in one person) |
| Velocity Trend | Linear regression slope on scores over time | Is the team improving or declining? |
| Predicted Next Avg | Regression extrapolation | Forecasted next period average |
| Member Z-Scores | (member_score - team_mean) / team_stddev | How far each member is from team average |

### 6.9 Reviewer Trust Score

```
TrustScore = (VolumeFactor × 0.6 + ConsistencyFactor × 0.4) × 100

Where:
  VolumeFactor = 1 / (1 + e^(-0.3 × (reviewCount - 5)))
  ConsistencyFactor = 1 - min(1, ((stdDev - 0.75) / 1.5)²)
```

**Parameter meaning:**
- **Volume sigmoid** (growth rate 0.3, midpoint 5): A reviewer with 1 review gets ~0.23 volume factor; 5 reviews gets ~0.50; 10+ reviews gets ~0.82. Ensures reviewers with more experience carry more weight.
- **Consistency parabola** (ideal stdDev 0.75, scaling 1.5): Peaks when a reviewer's rating standard deviation is exactly 0.75 — meaning they differentiate between employees (not all same score) but aren't wildly inconsistent. A stdDev of 0 or >2.25 scores near 0.
- **Trust weights**: 60% volume + 40% consistency — volume matters more than consistency.

**Example:** A reviewer with 8 reviews and stdDev of 0.8:
- VolumeFactor = 1/(1+e^(-0.3×3)) ≈ 0.71
- ConsistencyFactor = 1 - min(1, ((0.8-0.75)/1.5)²) = 1 - 0.001 ≈ 0.999
- TrustScore = (0.71×0.6 + 0.999×0.4) × 100 = **(42.6 + 40.0) = 82.6**

### 6.10 Worked Examples

#### Example 1: Mid-Level Employee

**Data:**
- 3 goals: 90% avg progress, 2 on time, 1 late by 5 days, weights 5/7/3
- 1 manager review: rating 4/5, trust 85
- 1 peer review: rating 3.5/5, trust 60
- 8 feedback items: 6 positive, 2 constructive (avg sentiment 0.72)
- Tenure: 2 years
- 15 data points total

**Calculation:**
- GAI ≈ 82 (good progress, one late goal hurts slightly)
- RQS ≈ 76 (solid ratings, manager review weighs more)
- FSI ≈ 72 (positive sentiment trend)
- CIS ≈ 55 (moderate collaboration activity)
- CRI ≈ 70 (mostly reliable, one missed deadline)
- GTS ≈ 50 (neutral trajectory)
- EQS ≈ 40 (few evidence items submitted)
- III ≈ 30 (limited initiative data)

Raw Composite = 0.25×82 + 0.20×76 + 0.12×72 + 0.10×55 + 0.10×70 + 0.08×50 + 0.08×40 + 0.07×30
= 20.5 + 15.2 + 8.64 + 5.5 + 7.0 + 4.0 + 3.2 + 2.1 = **66.1**

Tenure Factor = min(1.10, 1 + 2 × 0.02) = 1.04
Raw Score = min(100, 66.1 × 1.04) = **68.7**

Data Confidence ≈ 0.82 (15 data points is good)
Final Score ≈ 68.7 × 0.82 + 50 × 0.18 = 56.3 + 9.0 = **65.3**

**Result:** Score 65.3 → Grade: **C+** → Stars: **3**

#### Example 2: High Performer

**Data:**
- 5 goals: 95% avg progress, all on time, aligned to company objectives
- 2 manager reviews: rating 4.5, trust 90
- 3 peer reviews: avg rating 4.2, trust 70
- 20 positive feedback items, 3 constructive
- Active in 1-on-1s, recognition, cross-functional projects
- Tenure: 4 years, 30+ data points
- Submitted 10 verified evidence items of 4 types

**Calculation:**
- GAI ≈ 96, RQS ≈ 88, FSI ≈ 85, CIS ≈ 80, CRI ≈ 90, GTS ≈ 70, EQS ≈ 82, III ≈ 60

Raw Composite = 0.25×96 + 0.20×88 + 0.12×85 + 0.10×80 + 0.10×90 + 0.08×70 + 0.08×82 + 0.07×60
= 24 + 17.6 + 10.2 + 8.0 + 9.0 + 5.6 + 6.56 + 4.2 = **85.2**

Tenure Factor = min(1.10, 1 + 4 × 0.02) = 1.08
Raw Score = min(100, 85.2 × 1.08) = **92.0**

Data Confidence ≈ 0.95 (30+ data points is excellent)
Final Score ≈ 92.0 × 0.95 + 50 × 0.05 = 87.4 + 2.5 = **89.9**

**Result:** Score 89.9 → Grade: **A** → Stars: **5**

#### Example 3: New Employee (Sparse Data)

**Data:**
- 1 goal: 50% progress, on track
- No reviews yet
- 2 feedback items (1 positive, 1 constructive)
- Tenure: 3 months, 3 data points total

**Calculation:**
- GAI ≈ 50, RQS = 0 (no reviews), FSI ≈ 55, others ≈ 20–30

Raw Composite ≈ 0.25×50 + 0.20×0 + 0.12×55 + remainder ≈ 27.1

Data Confidence ≈ 0.56 (only 3 data points — heavily smoothed)
Department Average = 65

Fair-Adjusted = Bayesian(27.1, 65, 3) ≈ 55.2 (pulled toward dept avg)
Final Score ≈ 55.2 × 0.56 + 50 × 0.44 = 30.9 + 22.0 = **52.9**

**Result:** Score 52.9 → Grade: **C** → Stars: **3** (conservative — fair to a new hire with little data)

---

## 7. Practical User Guide

### 7.1 As an Employee, How Do I...

**Set Goals:**
1. Go to **Goals** in the sidebar.
2. Click **Create Goal**.
3. Fill in Title, Description, Type (usually INDIVIDUAL or OKR_KEY_RESULT), Priority, Due Date, and Weight.
4. If your goal supports a team/department goal, select it as **Parent Goal**.
5. Click **Create**. Your goal appears with a progress bar at 0%.

**Log Progress:**
1. Click on a goal to open the **Goal Detail** page.
2. Click **Update Progress**.
3. Enter the new percentage (e.g., 40%) and an optional note.
4. Click **Save**. The progress bar updates and the entry appears in the history timeline.

**Submit a Self-Appraisal:**
1. Go to **Self-Appraisal** in the sidebar.
2. Review your stats at the top (goals completed, avg progress, feedback count).
3. Rate yourself on each of the 6 competencies (1–5 stars).
4. Set your Overall Self-Rating.
5. Write your Key Accomplishments, Challenges, Areas for Improvement, and Development Goals.
6. Click **Submit Self-Appraisal** (or **Save Draft** to return later).

**Request and Give Feedback:**
1. Go to **Feedback** in the sidebar.
2. To give: Click **Give Feedback**, select a colleague, choose a type (Praise/Constructive/etc.), write your message, set visibility, and optionally send anonymously.
3. To request: Click **Request Feedback**, select a colleague, and optionally add a message.
4. Check the **Received** tab to see feedback others have given you. Click **Acknowledge** to mark it read.

**Submit Evidence:**
1. Go to **Evidence** in the sidebar.
2. Click **Submit Evidence**.
3. Fill in Title, Description, Type (e.g., Project, Certificate), Source, and optionally a URL.
4. Click **Create**. Wait for manager verification.

**Check Your Score:**
1. Go to **Dashboard** — your CPIS score is displayed prominently with the 8-dimension radar chart, grade, and confidence level.
2. Go to **Leaderboard** to see where you rank and check the **My Stats** sidebar for your percentile.

### 7.2 As a Manager, How Do I...

**Review a Team Member:**
1. Go to **Reviews** → find the pending review in "Reviews to Complete."
2. Click **Start Review**.
3. Answer each question: write about accomplishments, rate competencies (1–5 stars), set overall rating.
4. Add Key Strengths and Areas for Growth.
5. Click **Submit Review**.

**Run a 1-on-1:**
1. Go to **1-on-1s** → Click **Schedule 1-on-1**.
2. Select your report, set date/time/duration, add agenda topics.
3. During the meeting, click **Start Meeting**.
4. Add notes (private Manager Notes + Shared Notes) and action items.
5. Click **Complete Meeting** when done.

**Compare Team Performance:**
1. Go to **Manager Hub** — see the Team Performance Table with goal progress, last rating, and status dots.
2. Sort by Performance or Goal Progress.
3. Check the **Goal Tracker** section for On Track/At Risk/Behind breakdowns.
4. Go to **Analytics** for trend charts and distributions.

**Spot Low Performance:**
1. Check the **Manager Hub** Action Items — overdue reviews, at-risk goals, and active PIPs surface automatically.
2. Look at the Goal Tracker's "Most At Risk" list (bottom 5 goals by progress).
3. If needed, go to **PIP** → **Create PIP** to initiate a Performance Improvement Plan.

**Approve a Promotion:**
1. Go to **Promotions** → find the nomination in "Under Review" status.
2. Review the justification and linked evidence.
3. Click **Approve** or **Reject** (with reason), or **Defer** (with date).

### 7.3 As HR/Admin, How Do I...

**Create a Review Cycle:**
1. Go to **Review Cycles** → Click **Create Cycle**.
2. Enter name, description, type (Annual/Quarterly/etc.), date range.
3. Optionally select a review template, enable self-assessment and peer feedback.
4. Click **Create** (status: DRAFT).
5. Click **Launch** to activate the cycle and begin reviews.

**Run Calibration:**
1. Ensure the review cycle status is "CALIBRATION" (advance it from Active when reviews are submitted).
2. Go to **Calibration** → **Create Session** and select the cycle.
3. Start the session. In the workspace, review the rating distribution.
4. For each employee, click **Adjust** to set a calibrated rating with rationale.
5. When finished, the session automatically shows Avg Original vs. Avg Calibrated.

**Configure Scoring Rubrics:**
1. Go to **Admin → Configuration**.
2. Under **Rating Scales**, view the configured scales and levels.
3. Under **Review Templates**, create or edit templates with sections and weights.
4. Under **Competency Frameworks**, create frameworks and add competencies in a hierarchy.
5. Under **Questionnaires**, create self-assessment, peer review, or 360 questionnaires.

**Generate Reports:**
1. Go to **Reports** → select Report Type, date range, scope, and format.
2. Click **Generate Report**. Wait for status to change to COMPLETED.
3. Click the download button (PDF/Excel/CSV).
4. Optionally, set up **Scheduled Reports** with a cron expression for automated generation.

**Apply Rating Normalization:**
1. Go to **HR Analytics** → **Rating Normalization** tab.
2. Review the Before/After distribution chart and z-score adjustments.
3. Check R², skewness, and kurtosis metrics.
4. Click **Apply Normalization** → confirm in the modal.

---

## 8. Product Pitch Notes

### 8.1 Unique Selling Propositions (USPs)

1. **8-Dimensional CPIS Score** — Replaces single-number ratings with a comprehensive, statistically rigorous composite that measures goals, reviews, feedback, collaboration, consistency, growth, evidence, and initiative. No competitor offers this level of multidimensional scoring.

2. **Built-In Fairness Engine** — Z-score calibration, Bayesian smoothing for sparse data, bias detection, self-assessment inflation detection, and disparate impact analysis are built right in — not an afterthought or add-on.

3. **Real-Time Performance Monitoring** — Live dashboards with activity heatmaps, anomaly detection, sentiment gauges, and deadline alerts. Performance management becomes proactive, not just retrospective.

4. **Evidence-Based Decisions** — Every rating can be traced back to verified evidence, goal data, and feedback. Creates a defensible, auditable trail for compensation and promotion decisions.

5. **Full OKR Support with Cascading** — Goals cascade from company to department to team to individual with visual alignment trees, contribution breakdowns, and SMART score indicators.

6. **Integrated Career Pathing** — Visual career progression mapping with competency gap analysis, role exploration, and automated development plan generation.

7. **Sophisticated Calibration Workspace** — Side-by-side three-perspective comparison (Self/Manager/Peer) with weighted averages, gap analysis, and statistical normalization.

8. **4-Dimensional Leaderboard** — Performance, Goals, Recognition, and Learning rankings with department comparison — drives healthy competition without toxic single-metric focus.

9. **Skills Matrix with Team Heatmaps** — Color-coded heatmaps show skill gaps at individual, team, and organizational levels — visible and actionable, not hidden in spreadsheets.

10. **Comprehensive PIP Workflow** — Structured improvement plans with milestones, multi-type check-ins, and employee acknowledgment — ensures due process and documentation.

11. **Nine-Box Succession Grid** — Integrated with live performance data for talent risk management, with readiness tracking and bench strength metrics.

12. **Automated Reporting & Scheduling** — 7 report types in PDF/Excel/CSV with cron-based scheduled generation for hands-free compliance.

### 8.2 Pain → Feature → Outcome Mapping

| Buyer Pain Point | Platform Feature | Measurable Outcome |
|-----------------|-----------------|-------------------|
| "Our reviews feel arbitrary and biased" | Z-score calibration + fairness analytics + 8-dim CPIS | Reduced rating variance across departments, defensible scores |
| "We only do performance reviews once a year" | Continuous feedback + real-time dashboards + 1-on-1s | Year-round performance visibility, not end-of-year surprises |
| "Managers rate inconsistently" | Calibration workspace + reviewer trust scoring + bias detection | Normalized ratings across all teams |
| "Employees don't know how they're doing" | CPIS radar chart + confidence intervals + trajectory | Transparent, multi-dimensional self-service performance view |
| "Our goals are disconnected from strategy" | OKR cascading + alignment tree + contribution breakdown | Visible goal-to-strategy alignment at every level |
| "We can't justify compensation/promotion decisions" | Evidence linking + audit trail + weighted scoring | Documented, data-backed talent decisions |
| "High performers leave because they see no growth path" | Career pathing + skills matrix + development plans | Clear progression with skill gap analysis and mentorship |
| "We find out about performance issues too late" | Goal risk assessment + deadline alerts + anomaly detection | Proactive identification of at-risk employees and goals |
| "HR spends weeks building performance reports" | Automated reports + scheduled generation + CSV/PDF export | Reports generated in minutes, not weeks |

### 8.3 60-Second Pitch Script

> "Performance reviews shouldn't be a once-a-year guessing game. Our PMS Platform replaces arbitrary ratings with the CPIS — an 8-dimensional performance score built from real data: goals, reviews, peer feedback, collaboration, consistency, growth, evidence, and initiative.
>
> Every score includes a confidence level and fairness checks. Our built-in calibration engine uses z-score normalization to remove manager bias. New employees aren't penalized — Bayesian smoothing protects them until enough data accumulates.
>
> But we're not just about year-end reviews. Real-time dashboards show live activity heatmaps, anomaly detection, and sentiment tracking. Managers get proactive alerts when goals are at risk — not after they've already failed.
>
> Goals cascade from company strategy down to individual OKRs with visual alignment trees. Skills matrices show team-wide competency gaps in color-coded heatmaps. Career paths are mapped with concrete development plans.
>
> Everything is evidence-based and auditable — from compensation decisions to promotion approvals. Seven report types generate automatically on a schedule.
>
> The result: fair, transparent, continuous performance management that employees trust and HR can defend."

---

## Appendix A: Trend Analysis Formulas

The platform computes performance trends using these methods (from `trend-analysis.service.ts`):

**Linear Regression:**
```
slope = (n × Σ(x×y) - Σx × Σy) / (n × Σ(x²) - (Σx)²)
intercept = mean(y) - slope × mean(x)
R² = 1 - (SS_residual / SS_total)
```

**Trend Direction Classification:**
| Condition | Direction |
|-----------|----------|
| R² < 0.30 | Volatile (insufficient signal) |
| \|slope\| < 0.01 | Stable |
| slope > 0.01 | Increasing |
| slope < -0.01 | Decreasing |

**Trend Strength:** `R² × 0.70 + min(1, |slope| / avgValue) × 0.30` — values: strong (> 70), moderate (> 40), weak (≤ 40)

**Moving Averages:** MA_7 (7-period), MA_30 (30-period), MA_90 (90-period) — simple arithmetic mean of last N values.

**Growth Rates:**
- WoW (week-over-week): `(current - previous) / previous × 100`
- MoM (month-over-month): same formula, monthly periods
- QoQ (quarter-over-quarter): current vs. 4 periods ago
- YoY (year-over-year): current vs. 12 periods ago

**Forecasting:**
```
nextValue = slope × (n + periodsAhead - 1) + intercept
confidence = R² × max(0, 1 - periodsAhead × 0.1) × 100
```
Confidence decreases by 10% per period into the future.

**Pattern Detection Thresholds:**
| Pattern | Detection Rule |
|---------|---------------|
| Seasonality | Peak variance < avgInterval × 0.20 (evenly spaced peaks) |
| Cyclical | Direction changes ≥ 40% of data points |
| Anomaly | Value > 2σ from mean |
| Sustained Trend | 70%+ consecutive same-direction movements |

---

## Appendix B: Calibration Engine Constants

From `calibration-assistant.ts` — constants used during pre-calibration analysis:

**Distribution Fit Classification:**
| Condition | Classification |
|-----------|---------------|
| -0.5 ≤ skewness ≤ 0.5 | Good (normal) |
| skewness > 0.5 | Skewed High (too many high ratings) |
| skewness < -0.5 | Skewed Low (too many low ratings) |
| stdDev > 1.2 | Bimodal (two clusters) |
| stdDev < 0.3 | Uniform (everyone rated the same) |

**Outlier Detection:**
- **IQR method:** Lower bound = Q1 - 1.5 × IQR, Upper bound = Q3 + 1.5 × IQR
- **Z-score method:** Flagged if |z-score| > 2

**Bias Detection Thresholds:**
| Bias Type | Threshold | High Severity |
|-----------|-----------|--------------|
| Department rating gap | > 0.5 from mean | > 0.8 from mean |
| Level-rating correlation | \|r\| > 0.7 | \|r\| > 0.85 |
| Reviewer bias score | < 60 (with ≥ 3 reviews) | — |
| Language bias (% flagged) | > 20% of reviews | > 40% of reviews |

**Manager Leniency/Severity Labels (HR Analytics):**
- Lenient: avgRating > orgMean + 0.5
- Neutral: within ± 0.5 of orgMean
- Severe: avgRating < orgMean - 0.5

**Session Duration Estimation:** Base 15 min + 1 min/review (cap 30 min) + 5 min/outlier + 10 min/high-severity alert, rounded to nearest 15 min.

---

## Appendix C: Complete Value Definitions Reference

### C.1 Goal Definitions

| Field | Valid Values |
|-------|-------------|
| **GoalType** | INDIVIDUAL, TEAM, DEPARTMENT, COMPANY, OKR_OBJECTIVE, OKR_KEY_RESULT |
| **GoalStatus** | DRAFT, ACTIVE, COMPLETED, CANCELLED, ON_HOLD |
| **GoalPriority** | LOW, MEDIUM, HIGH, CRITICAL |
| **Priority Multipliers** | LOW=0.85, MEDIUM=1.0, HIGH=1.15, CRITICAL=1.35 |
| **Complexity Mapping** | LOW=2, MEDIUM=3, HIGH=4, CRITICAL=5 |
| **Tracking Status** | ON_TRACK (progress ≥ 70% or COMPLETED), AT_RISK (40–70%), BEHIND (< 40%) |

> **Note on thresholds:** The Goal Alignment page uses 70%/40% for on-track/at-risk. The data aggregation service uses 50% as the on-track threshold for reporting metrics. Both are valid in their respective contexts.

### C.2 Review Definitions

| Field | Valid Values |
|-------|-------------|
| **ReviewCycleType** | ANNUAL, SEMI_ANNUAL, QUARTERLY, MONTHLY, PROBATION, PROJECT, AD_HOC |
| **ReviewCycleStatus** | DRAFT, SCHEDULED, SELF_ASSESSMENT, MANAGER_REVIEW, CALIBRATION, FINALIZATION, SHARING, COMPLETED, CANCELLED |
| **ReviewStatus** | NOT_STARTED, IN_PROGRESS, SUBMITTED, CALIBRATED, FINALIZED, ACKNOWLEDGED |
| **ReviewType** | SELF, MANAGER, PEER, UPWARD, EXTERNAL, THREE_SIXTY |
| **Review Type Weights (CPIS)** | MANAGER=1.5, THREE_SIXTY=1.3, PEER=1.0, UPWARD=0.9, EXTERNAL=0.8, SELF=0.5 |
| **Rating Scale** | 1 (Needs Improvement) → 3 (Meets Expectations) → 5 (Exceptional) |

### C.3 Feedback & Recognition Definitions

| Field | Valid Values |
|-------|-------------|
| **FeedbackType** | PRAISE, CONSTRUCTIVE, SUGGESTION, REQUEST, RECOGNITION |
| **FeedbackVisibility** | PRIVATE, MANAGER_VISIBLE, PUBLIC |

### C.4 Calibration Definitions

| Field | Valid Values |
|-------|-------------|
| **CalibrationStatus** | SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED |
| **Moderator Weighted Average** | Self = 20%, Manager = 50%, Peers = 30% |
| **Gap Analysis Thresholds** | < 0.75 = normal (green), 0.75–1.5 = moderate (amber), ≥ 1.5 = significant (red) |

### C.5 PIP Definitions

| Field | Valid Values |
|-------|-------------|
| **PIP Type** | PERFORMANCE, BEHAVIOR, ATTENDANCE, SKILLS |
| **PIP Severity** | STANDARD, SERIOUS, FINAL_WARNING |
| **PIP Status** | DRAFT, ACTIVE, ON_TRACK, AT_RISK, SUCCESSFUL, UNSUCCESSFUL, CANCELLED |
| **Review Frequency** | WEEKLY, BI_WEEKLY, MONTHLY |
| **Check-in Type** | SCHEDULED, UNSCHEDULED, URGENT |
| **Milestone Status** | NOT_STARTED, IN_PROGRESS, COMPLETED, FAILED |
| **Achievement Level** | EXCEEDED, MET, PARTIALLY_MET, NOT_MET |

### C.6 Evidence Definitions

| Field | Valid Values |
|-------|-------------|
| **EvidenceType** | TASK, TICKET, PULL_REQUEST, CODE_COMMIT, DOCUMENT, PRESENTATION, DESIGN, PROJECT_MILESTONE, CUSTOMER_FEEDBACK, INCIDENT_RESOLUTION, MENTORSHIP_SESSION, TRAINING_COMPLETION, CERTIFICATION, MEETING_FACILITATION, PROCESS_IMPROVEMENT, RECOGNITION_RECEIVED, COLLABORATION_CONTRIBUTION, KNOWLEDGE_SHARING, PEER_FEEDBACK, MANAGER_OBSERVATION, SELF_ASSESSMENT, METRIC_ACHIEVEMENT |
| **EvidenceSource** | JIRA, GITHUB, GITLAB, AZURE_DEVOPS, CONFLUENCE, NOTION, GOOGLE_DOCS, SLACK, TEAMS, SALESFORCE, ZENDESK, BAMBOO_HR, WORKDAY, MANUAL, API_IMPORT, INTERNAL |
| **EvidenceStatus** | PENDING_VERIFICATION, VERIFIED, DISPUTED, REJECTED, ARCHIVED |

### C.7 Compensation Definitions

| Field | Valid Values |
|-------|-------------|
| **CompensationType** | BASE_SALARY, BONUS, EQUITY, COMMISSION, ALLOWANCE, BENEFITS, ONE_TIME_PAYMENT, RETENTION_BONUS, SIGN_ON_BONUS |
| **CompensationDecisionStatus** | DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, IMPLEMENTED, CANCELLED |

### C.8 Promotion Definitions

| Field | Valid Values |
|-------|-------------|
| **PromotionType** | LEVEL_PROMOTION, ROLE_CHANGE, TITLE_CHANGE, LATERAL_MOVE, CAREER_TRACK_CHANGE |
| **PromotionDecisionStatus** | NOMINATED, UNDER_REVIEW, PENDING_APPROVAL, APPROVED, REJECTED, DEFERRED, IMPLEMENTED, CANCELLED |

### C.9 One-on-One Definitions

| Field | Valid Values |
|-------|-------------|
| **OneOnOneStatus** | SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED |
| **Duration Options** | 15, 30, 45, 60 minutes |

### C.10 Organization & Team Definitions

| Field | Valid Values |
|-------|-------------|
| **TeamType** | FUNCTIONAL, CROSS_FUNCTIONAL, VIRTUAL, MATRIX |
| **TeamMemberRole** | LEAD, DEPUTY_LEAD, MEMBER, CONTRIBUTOR, OBSERVER |
| **ReportingLineType** | SOLID, DOTTED, MATRIX, PROJECT |
| **DelegationType** | ACTING_MANAGER, PROXY_APPROVER, REVIEW_DELEGATE, FULL_DELEGATION |
| **DelegationStatus** | PENDING, ACTIVE, EXPIRED, REVOKED |

### C.11 System Definitions

| Field | Valid Values |
|-------|-------------|
| **User Roles** | SUPER_ADMIN, ADMIN, HR_ADMIN, MANAGER, EMPLOYEE |
| **NotificationStatus** | PENDING, SENT, FAILED, READ |
| **IntegrationStatus** | ACTIVE, INACTIVE, ERROR, PENDING_AUTH |
| **CalendarEventType** | MEETING, DEADLINE, REMINDER, PERSONAL, GOAL_RELATED, REVIEW_RELATED |
| **Questionnaire Type** | SELF_ASSESSMENT, PEER_REVIEW, MANAGER_REVIEW, 360_FEEDBACK, SURVEY |

### C.12 Skills Matrix Definitions

| Field | Valid Values |
|-------|-------------|
| **Rating Scale** | 1–5 stars (self and manager ratings) |
| **Gap Classification** | On Target (gap ≤ 0), Minor Gap (gap = 1), Critical Gap (gap ≥ 2) |
| **Heatmap Colors** | 1–1.5 = red, 1.5–2.5 = orange, 2.5–3.5 = yellow, 3.5–4.5 = light green, 4.5–5 = dark green |

### C.13 Succession Planning Definitions

| Field | Valid Values |
|-------|-------------|
| **Criticality** | CRITICAL, HIGH, MEDIUM, LOW |
| **Turnover Risk** | HIGH, MEDIUM, LOW |
| **Vacancy Impact** | SEVERE, SIGNIFICANT, MODERATE, MINIMAL |
| **Readiness Level** | READY_NOW, READY_1_YEAR, READY_2_YEARS, DEVELOPMENT_NEEDED |
| **Nine-Box Categories** | Stars, High Potentials, Enigmas (top row); High Performers, Core Players, Up or Out (middle); Workhorses, Average Performers, Underperformers (bottom) |

---

## 9. Coverage Report

### 9.1 All UI Routes/Pages Found

| # | Route | Page Component | Status |
|---|-------|---------------|--------|
| 1 | `/login` | LoginPage | Documented |
| 2 | `/forgot-password` | ForgotPasswordPage | Documented |
| 3 | `/dashboard` | DashboardPage | Documented |
| 4 | `/goals` | GoalsPage | Documented |
| 5 | `/goals/:id` | GoalDetailPage | Documented |
| 6 | `/goal-alignment` | GoalAlignmentPage | Documented |
| 7 | `/reviews` | ReviewsPage | Documented |
| 8 | `/reviews/:id` | ReviewDetailPage | Documented |
| 9 | `/reviews/moderate` | ModeratorDashboardPage | Documented |
| 10 | `/review-cycles` | ReviewCyclesPage | Documented |
| 11 | `/feedback` | FeedbackPage | Documented |
| 12 | `/one-on-ones` | OneOnOnesPage | Documented |
| 13 | `/one-on-ones/:id` | OneOnOneDetailPage | Documented |
| 14 | `/development` | DevelopmentPage | Documented |
| 15 | `/development/:id` | DevelopmentPlanDetailPage | Documented (list page; detail page not read individually) |
| 16 | `/pip` | PIPPage | Documented |
| 17 | `/pip/:id` | PIPDetailPage | Documented |
| 18 | `/recognition` | RecognitionPage | Documented |
| 19 | `/calibration` | CalibrationPage | Documented |
| 20 | `/analytics` | AnalyticsPage | Documented |
| 21 | `/realtime` | RealtimePerformancePage | Documented |
| 22 | `/team` | TeamPage | Documented |
| 23 | `/profile` | ProfilePage | Documented |
| 24 | `/settings` | SettingsPage | Documented |
| 25 | `/self-appraisal` | SelfAppraisalPage | Documented |
| 26 | `/reports` | ReportsPage | Documented |
| 27 | `/hr-analytics` | HRAnalyticsPage | Documented |
| 28 | `/succession` | SuccessionPage | Documented |
| 29 | `/help` | HelpPage | Documented |
| 30 | `/admin/users` | UserManagementPage | Documented |
| 31 | `/admin/config` | ConfigurationPage | Documented |
| 32 | `/admin/audit` | AuditLogPage | Documented |
| 33 | `/skills` | SkillsMatrixPage | Documented |
| 34 | `/compensation` | CompensationPage | Documented |
| 35 | `/promotions` | PromotionsPage | Documented |
| 36 | `/evidence` | EvidencePage | Documented |
| 37 | `/employees/:id` | EmployeeProfilePage | Documented |
| 38 | `/compliance` | CompliancePage | Documented |
| 39 | `/announcements` | AnnouncementsPage | Documented |
| 40 | `/career` | CareerPathPage | Documented |
| 41 | `/manager-dashboard` | ManagerDashboardPage | Documented |
| 42 | `/leaderboard` | LeaderboardPage | Documented |

**Total: 42 routes documented (100% coverage)**

### 9.2 Top 30 Key Components/Modules Relied On

| # | Component/Module | File Path |
|---|-----------------|-----------|
| 1 | DashboardPage | `apps/web/src/pages/DashboardPage.tsx` |
| 2 | GoalsPage | `apps/web/src/pages/goals/GoalsPage.tsx` |
| 3 | GoalDetailPage | `apps/web/src/pages/goals/GoalDetailPage.tsx` |
| 4 | GoalAlignmentPage | `apps/web/src/pages/goals/GoalAlignmentPage.tsx` |
| 5 | ReviewsPage | `apps/web/src/pages/reviews/ReviewsPage.tsx` |
| 6 | ReviewDetailPage | `apps/web/src/pages/reviews/ReviewDetailPage.tsx` |
| 7 | ReviewCyclesPage | `apps/web/src/pages/reviews/ReviewCyclesPage.tsx` |
| 8 | ModeratorDashboardPage | `apps/web/src/pages/reviews/ModeratorDashboardPage.tsx` |
| 9 | CalibrationPage | `apps/web/src/pages/calibration/CalibrationPage.tsx` |
| 10 | FeedbackPage | `apps/web/src/pages/feedback/FeedbackPage.tsx` |
| 11 | RecognitionPage | `apps/web/src/pages/recognition/RecognitionPage.tsx` |
| 12 | LeaderboardPage | `apps/web/src/pages/leaderboard/LeaderboardPage.tsx` |
| 13 | SelfAppraisalPage | `apps/web/src/pages/self-appraisal/SelfAppraisalPage.tsx` |
| 14 | ManagerDashboardPage | `apps/web/src/pages/manager/ManagerDashboardPage.tsx` |
| 15 | RealtimePerformancePage | `apps/web/src/pages/realtime/RealtimePerformancePage.tsx` |
| 16 | AnalyticsPage | `apps/web/src/pages/analytics/AnalyticsPage.tsx` |
| 17 | HRAnalyticsPage | `apps/web/src/pages/analytics/HRAnalyticsPage.tsx` |
| 18 | SkillsMatrixPage | `apps/web/src/pages/skills/SkillsMatrixPage.tsx` |
| 19 | CareerPathPage | `apps/web/src/pages/career/CareerPathPage.tsx` |
| 20 | PIPPage | `apps/web/src/pages/pip/PIPPage.tsx` |
| 21 | CompensationPage | `apps/web/src/pages/compensation/CompensationPage.tsx` |
| 22 | PromotionsPage | `apps/web/src/pages/promotions/PromotionsPage.tsx` |
| 23 | SuccessionPage | `apps/web/src/pages/succession/SuccessionPage.tsx` |
| 24 | EvidencePage | `apps/web/src/pages/evidence/EvidencePage.tsx` |
| 25 | ReportsPage | `apps/web/src/pages/reports/ReportsPage.tsx` |
| 26 | DashboardLayout | `apps/web/src/components/layouts/DashboardLayout.tsx` |
| 27 | Math Engine | `packages/core/src/math-engine.ts` |
| 28 | Calibration Assistant | `packages/core/src/calibration-assistant.ts` |
| 29 | Performance Math Controller | `apps/api/src/modules/performance-math/performance-math.controller.ts` |
| 30 | Data Aggregation Service | `apps/api/src/services/reporting/data-aggregation.service.ts` |

### 9.3 Files Containing Scoring/Math Logic

| File | Key Functions | What It Computes |
|------|--------------|-----------------|
| `packages/core/src/math-engine.ts` (1694 lines) | `calculateCPIS()`, `calculatePerformanceScore()`, `calculateGoalFromTasks()`, `calculateTeamAnalytics()`, `assessGoalRisk()`, `calibrateRatings()`, `mean()`, `weightedMean()`, `weightedHarmonicMean()`, `zScore()`, `sigmoid()`, `ewma()`, `pearsonCorrelation()`, `linearRegression()`, `bayesianEstimate()`, `giniCoefficient()`, `shannonEntropy()`, `percentileRank()` | All core scoring: CPIS, goal risk, team analytics, calibration, statistics |
| `packages/core/src/calibration-assistant.ts` | Pre-calibration analysis, distribution fit, outlier detection, reviewer analysis | Calibration preparation: skewness, IQR outliers, z-score outliers, bias patterns |
| `apps/api/src/modules/performance-math/performance-math.controller.ts` | Trust score calculation, population score, API orchestration | Reviewer trust, simplified composite score |
| `apps/api/src/services/reporting/data-aggregation.service.ts` | Aggregation by period/scope | Goal/review/feedback/performance metric aggregation |
| `apps/api/src/services/reporting/trend-analysis.service.ts` | Trend calculations, forecasting | Linear regression, moving averages, growth rates, pattern detection, seasonality |
| `apps/api/src/modules/analytics/analytics.service.ts` | Distribution analysis, compensation analysis, normalization | Rating distributions, bias by department/level, z-score normalization, bell curve fitness |

### 9.4 Features NOT Found But Commonly Expected

| Feature | Status | What Was Searched |
|---------|--------|------------------|
| **360-Degree Feedback (dedicated UI)** | Partially implemented | Review type "360_DEGREE" exists in cycle creation; no dedicated 360 page but supported through standard review workflow |
| **Employee Engagement Surveys** | Not found in repository scan | Searched for "survey", "engagement", "pulse" in pages and components. Questionnaire type "SURVEY" exists in config but no dedicated survey page |
| **Learning Management System (LMS)** | Not found as standalone feature | Searched for "course", "training", "lms", "learning". Development Plans reference training but no course catalog or LMS integration UI found |
| **Expense Management** | Not found in repository scan | Searched for "expense", "reimbursement". Not expected in a PMS but sometimes bundled |
| **Time Tracking** | Not found in repository scan | Searched for "timesheet", "time tracking", "clock in". Not present |
| **Onboarding Workflow** | Not found in repository scan | Searched for "onboard", "welcome", "new hire". Not present as a dedicated feature |
| **Exit Interview / Offboarding** | Not found in repository scan | Searched for "exit", "offboard", "separation". Not present |
| **Custom Dashboards (user-configurable)** | Not found in repository scan | `DashboardFramework` component exists in packages/ui but no user-facing dashboard builder page found |
| **What-If Simulator** | Not found in repository scan | `WhatIfSimulator` component exists in packages/ui but no dedicated page integrates it |
| **Mobile App UI** | Not reviewed | `apps/mobile` directory exists but was outside scope (web frontend focus) |

---

*End of Document*
