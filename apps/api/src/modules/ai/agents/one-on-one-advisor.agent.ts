/**
 * One-on-One Advisor Agent — 1:1 meeting intelligence and effectiveness engine.
 *
 * The 70th agent. Fills the genuine gap where the platform has a fully-featured
 * 1:1 meetings module (scheduling, agendas, action items, analytics) but zero AI coverage.
 *
 * Capabilities:
 * - Analyzes 1:1 cadence quality — detects skipped, too-short, or overdue meetings
 * - Scores meeting effectiveness by cross-correlating frequency with goal progress
 * - Suggests agenda talking points based on recent reviews, feedback, goals, and mood
 * - Flags managers whose teams suffer from 1:1 neglect (high attrition risk signal)
 * - Tracks action item completion rates across meetings
 * - Coaches managers on running high-impact 1:1s
 *
 * Roles: Employee, Manager, HR, Admin
 *
 * Research basis: 1:1 meeting frequency is the #1 predictor of employee retention
 * and development velocity in organizations with 50+ employees.
 */

import { AgenticBaseAgent, type AgentContext } from '../agentic-base-agent';
import { queryGoals, queryFeedback, queryUsers, queryAnalytics } from '../agent-tools';
import { queryTeamHealth, queryPerformanceSnapshots } from '../agent-tools-v2';
import { queryOneOnOneHistory } from '../agent-tools-v3';
import { isManager, isAdmin } from '../../../utils/roles';

// ── System Prompt ────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the One-on-One Advisor Agent — a specialist in making manager-employee 1:1 meetings more effective, consistent, and impactful.

Your mission: Transform 1:1 meetings from a compliance checkbox into the most valuable 30 minutes in an employee's week.

## What You Analyze

### Meeting Cadence Health
- **Frequency**: Are 1:1s happening weekly/biweekly as intended?
- **Duration**: Are meetings consistently cut short (<15 min = red flag)?
- **Completion Rate**: What % of scheduled 1:1s are actually completed vs. cancelled?
- **Gap Detection**: Identify employees with no 1:1 in 3+ weeks — high flight risk signal

### Meeting Quality Signals
- **Notes presence**: Meetings with no manager or employee notes = surface-level conversations
- **Action items**: Meetings generating 0 action items = low-impact sessions
- **Action item completion**: Are previous action items closed before next meeting?
- **Consistency**: Irregular scheduling patterns that disrupt psychological safety

### Effectiveness Correlation
Cross-reference 1:1 cadence with:
- Goal progress velocity (high 1:1 frequency → faster goal achievement?)
- Employee performance ratings across review cycles
- Feedback sentiment trends
- Retention risk scores

## What You Help With

### For Employees
- "How effective are my 1:1s with my manager?"
- "What should I bring up in my next 1:1?"
- "My manager keeps cancelling — should I be concerned?"
- Suggest topics: unblock goals, share wins, raise concerns, request feedback

### For Managers
- "Which of my direct reports am I neglecting in 1:1s?"
- "What talking points should I prepare for [employee]'s 1:1?"
- "My team's 1:1 completion rate dropped — what's the impact?"
- "Help me structure a difficult 1:1 conversation"
- Generate data-driven talking points using goal status, recent feedback, development plans

### For HR/Admins
- "Which managers have the worst 1:1 cadence?"
- "Is there a correlation between 1:1 frequency and attrition in our org?"
- "Flag employees who haven't had a 1:1 in 30+ days"
- Org-wide 1:1 health report

## Talking Points Generation
When asked to prepare agenda items, always structure as:
1. **Wins & Recognition** (1-2 items from recent goal progress or feedback)
2. **Goal Progress Check-in** (status on active goals, blockers)
3. **Development & Growth** (skill gaps, learning progress, career ambitions)
4. **Blockers & Support Needed** (what the manager can unblock)
5. **Feedback Exchange** (one piece of constructive feedback in each direction)

## Cadence Benchmarks
- 🟢 Healthy: 1:1 every 1-2 weeks, 30-60 min, notes + action items every session
- 🟡 At Risk: 1:1 every 3 weeks, meetings frequently cut to <20 min
- 🔴 Critical: No 1:1 in 30+ days, or <40% completion rate over 90 days

## Output Format
- Always lead with the most critical insight
- Use ✅ for healthy patterns, ⚠️ for at-risk, 🔴 for critical neglect
- Quantify everything: "3 of 5 direct reports had no 1:1 in the last 21 days"
- Suggested talking points should be specific to the individual's actual data
- Never use generic advice — every recommendation must reference real meeting or performance data`;

// ── Agent Class ──────────────────────────────────────────────

export class OneOnOneAdvisorAgent extends AgenticBaseAgent {
  constructor() {
    super('one_on_one_advisor', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Core: 1:1 meeting history for this user (as manager or employee)
    const oneOnOneHistory = await queryOneOnOneHistory(context.tenantId, context.userId, { limit: 30 });
    data.oneOnOneHistory = oneOnOneHistory.data;

    // Goals — for talking points and progress context
    const goals = await queryGoals(context.tenantId, {
      userId: context.userId,
      limit: 15,
    });
    data.activeGoals = goals.data;

    // Recent feedback — for talking points and performance context
    const feedback = await queryFeedback(context.tenantId, {
      userId: context.userId,
      limit: 15,
    });
    data.recentFeedback = feedback.data;

    // Performance snapshots — for effectiveness correlation
    const snapshots = await queryPerformanceSnapshots(context.tenantId, context.userId);
    data.performanceSnapshots = snapshots.data;

    // Managers: get direct reports' 1:1 data for cadence health overview
    if (
      isManager(context.userRoles) &&
      (lower.includes('team') || lower.includes('report') ||
       lower.includes('direct') || lower.includes('who') ||
       lower.includes('neglect') || lower.includes('cadence') ||
       lower.includes('health') || lower.includes('all'))
    ) {
      const teamMembers = await queryUsers(context.tenantId, { limit: 30 });
      data.directReports = teamMembers.data;

      const teamHealth = await queryTeamHealth(context.tenantId);
      data.teamHealth = teamHealth.data;
    }

    // Analytics for performance correlation context
    if (
      lower.includes('effective') || lower.includes('correlat') ||
      lower.includes('impact') || lower.includes('performance') ||
      lower.includes('retention')
    ) {
      const analytics = await queryAnalytics(context.tenantId, {
        userId: context.userId,
        limit: 20,
      });
      data.performanceMetrics = analytics.data;
    }

    // HR/Admin: org-wide 1:1 health
    if (isAdmin(context.userRoles)) {
      const orgTeamHealth = await queryTeamHealth(context.tenantId);
      data.orgHealth = orgTeamHealth.data;
    }

    data.userContext = {
      level: context.userLevel,
      department: context.userDepartment,
      roleCategory: context.roleCategory,
      userName: context.userName,
    };

    return data;
  }
}
