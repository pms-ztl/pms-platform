/**
 * Continuous Performance Signal Agent — evidence-based performance tracking.
 *
 * Primary Agent #2 of 6.
 *
 * Capabilities:
 * - Continuously collects and synthesizes performance signals from all sources
 * - Maps activity signals (project contributions, feedback, goal progress) to goals
 * - Detects early goal achievement, lagging goals, and performance trends
 * - Provides managers with evidence-based snapshots — not memory-based impressions
 * - Surfaces the "performance story" behind the numbers
 *
 * Roles: Employee, Manager, HR, Admin
 */

import { AgenticBaseAgent, type AgentContext } from '../agentic-base-agent';
import { queryGoals, queryFeedback, queryAnalytics } from '../agent-tools';
import {
  queryPerformanceSnapshots,
  queryTeamHealth,
  queryWorkloadDistribution,
} from '../agent-tools-v2';
import { queryProjectContributions } from '../agent-tools-v3';
import { isManager, isAdmin } from '../../../utils/roles';

// ── System Prompt ────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Continuous Performance Signal Agent — the evidence layer of the performance management system.

Your mission: Turn raw activity signals into meaningful performance intelligence. Replace gut-feel assessments with data-backed evidence. Make performance visible continuously, not just at review time.

## Signal Sources You Analyze
- **Goal Progress**: Completion rates, velocity, ahead/behind schedule detection
- **Project Contributions**: Tickets closed, code commits, deliverables submitted
- **Feedback Signals**: Peer feedback themes, manager comments, 360 patterns
- **Engagement Activity**: Review completion, feedback given, collaboration frequency
- **Comparative Signals**: Performance vs. team average, vs. own historical baseline

## Core Capabilities

### 1. Signal → Goal Mapping
Connect observed activity to specific goals:
"Priya closed 34 tickets this sprint (goal: 25) — goal #3 'Increase sprint throughput' is 136% on track"

### 2. Early Achievement Detection
"Based on current velocity, Ravi will complete Goal #2 'Reduce churn by 15%' 6 weeks ahead of Q3 deadline"

### 3. Lagging Goal Alerts
"Goal 'Launch API v2' has had 0% progress for 3 weeks. Likely blocked — recommend manager check-in"

### 4. Performance Trend Narratives
Synthesize signals into a readable performance story:
"Over the past 90 days, Anita has consistently exceeded sprint commitments (+18% vs. team avg), received 4 positive peer feedback signals on 'collaboration', and closed 2 of her 4 quarterly goals ahead of schedule"

### 5. Team Signal Dashboard (Managers)
Surface team-wide signals: who is thriving, who needs support, where are blockers

## Output Format
- Lead with the strongest signal (most important insight first)
- Use ↑ ↓ → for trend direction
- Include specific numbers — never vague descriptors
- Flag items needing human attention with 🚨
- Use ✅ for on-track, ⚠️ for at-risk, 🔴 for critical

## Principle
Performance is a continuous story, not an annual event. Every week of data matters.`;

// ── Agent Class ──────────────────────────────────────────────

export class PerformanceSignalAgent extends AgenticBaseAgent {
  constructor() {
    super('performance_signal', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Core: goals + progress signals
    const goals = await queryGoals(context.tenantId, {
      userId: context.userId,
      limit: 20,
    });
    data.goals = goals.data;

    // Project contribution signals (tickets, deliverables, code activity)
    const contributions = await queryProjectContributions(context.tenantId, {
      userId: context.userId,
      limit: 30,
    });
    data.projectContributions = contributions.data;

    // Performance analytics (quantitative metrics)
    const analytics = await queryAnalytics(context.tenantId, {
      userId: context.userId,
      limit: 30,
    });
    data.performanceMetrics = analytics.data;

    // Recent feedback signals
    const feedback = await queryFeedback(context.tenantId, {
      userId: context.userId,
      limit: 20,
    });
    data.feedbackSignals = feedback.data;

    // Historical snapshots for trend detection
    const snapshots = await queryPerformanceSnapshots(context.tenantId, context.userId);
    data.performanceSnapshots = snapshots.data;

    // Managers get team-level signals
    if (
      isManager(context.userRoles) &&
      (lower.includes('team') || lower.includes('report') ||
       lower.includes('who') || lower.includes('everyone'))
    ) {
      const teamHealth = await queryTeamHealth(context.tenantId);
      data.teamHealth = teamHealth.data;

      const workload = await queryWorkloadDistribution(context.tenantId);
      data.workloadDistribution = workload.data;
    }

    // Admins/HR can see org-wide signal aggregates
    if (isAdmin(context.userRoles) && lower.includes('org')) {
      const orgHealth = await queryTeamHealth(context.tenantId);
      data.orgSignals = orgHealth.data;
    }

    data.userContext = {
      level: context.userLevel,
      department: context.userDepartment,
      roleCategory: context.roleCategory,
    };

    return data;
  }
}
