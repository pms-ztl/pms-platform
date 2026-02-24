/**
 * Strategic Alignment Agent -- OKR alignment, milestone tracking, and manager assistant.
 *
 * Covers Features:
 * - Dynamic OKR Alignment
 * - Real-Time Strategic Alignment
 * - Self-Triggering Review Cycles
 * - Autonomous Milestone Tracking
 * - Performance Snapshots
 * - Voice-First Manager Assistant
 *
 * Roles: Manager, Employee, HR, Admin
 * Ensures every individual contribution maps to organizational objectives.
 */

import { AgenticBaseAgent, type AgentContext } from '../agentic-base-agent';
import { queryGoals, queryAnalytics } from '../agent-tools';
import {
  queryGoalAlignment,
  queryPerformanceSnapshots,
  queryWorkloadDistribution,
} from '../agent-tools-v2';
import { isManager } from '../../../utils/roles';

// ── System Prompt ───────────────────────────────────────────

const SYSTEM_PROMPT = `You are a strategic alignment specialist for a Performance Management System.

Your mission is to ensure every individual contribution maps to organizational objectives and that no strategic effort is wasted.

Your capabilities:
1. **Dynamic OKR Alignment**: Continuously validate that individual goals cascade correctly to team OKRs and company objectives. Flag misalignment with specific gap analysis and suggest realignment actions.
2. **Real-Time Strategic Alignment**: When company strategy shifts, instantly surface which teams and goals are affected. Provide impact assessments and recommended cascading updates.
3. **Self-Triggering Review Cycles**: Detect when review milestones should trigger based on goal completion, project delivery, or time intervals. Recommend optimal timing for check-ins and formal reviews.
4. **Autonomous Milestone Tracking**: Monitor goal progress against deadlines. Proactively alert when milestones are at risk, stalled, or ahead of schedule. Suggest corrective actions for at-risk items.
5. **Performance Snapshots**: Generate concise, data-rich performance summaries for 1:1 meetings, skip-levels, or calibration sessions. Include goal progress, feedback themes, and key metrics.
6. **Voice-First Manager Assistant**: Serve as a conversational assistant for managers who prefer voice-style interactions. Provide quick answers about team status, upcoming deadlines, and priority items in concise, spoken-language format.

Alignment principles:
- Always show the connection chain: Individual Goal -> Team OKR -> Company Objective.
- Quantify alignment as a percentage and show which links are weak.
- For milestone tracking, use status indicators: ON TRACK, AT RISK, BEHIND, COMPLETED.
- Performance snapshots should be 1-page summaries: key metrics, highlights, concerns, suggested topics.
- When acting as voice assistant, keep responses under 3 sentences unless asked to elaborate.
- Never recommend removing goals without suggesting alternatives.
- Include time-context: "Q1 is 67% elapsed, but this goal is only 30% complete."`;

// ── Agent Class ─────────────────────────────────────────────

export class StrategicAlignmentAgent extends AgenticBaseAgent {
  constructor() {
    super('strategic_alignment', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};
    const managerAccess = isManager(context.userRoles);

    // Goal alignment — managers see org-wide, employees see own alignment only
    if (managerAccess) {
      const alignment = await queryGoalAlignment(context.tenantId);
      data.goalAlignment = alignment.data;
    }

    // Always fetch user's own goals for milestone tracking
    const goals = await queryGoals(context.tenantId, {
      userId: context.userId,
      limit: 30,
    });
    data.goals = goals.data;

    // Performance snapshots for 1:1 meetings and reviews
    if (
      lower.includes('snapshot') ||
      lower.includes('1:1') ||
      lower.includes('one-on-one') ||
      lower.includes('summary') ||
      lower.includes('prep') ||
      lower.includes('meeting') ||
      lower.includes('calibration')
    ) {
      const snapshots = await queryPerformanceSnapshots(context.tenantId, context.userId);
      data.performanceSnapshots = snapshots.data;
    }

    // Analytics for trend data and metrics
    if (
      lower.includes('metric') ||
      lower.includes('trend') ||
      lower.includes('analytics') ||
      lower.includes('progress') ||
      lower.includes('track') ||
      lower.includes('status') ||
      lower.includes('behind') ||
      lower.includes('risk')
    ) {
      const analytics = await queryAnalytics(context.tenantId, {
        userId: context.userId,
        limit: 30,
      });
      data.performanceMetrics = analytics.data;
    }

    // Workload distribution — manager+ only
    if (
      managerAccess && (
      lower.includes('capacity') ||
      lower.includes('workload') ||
      lower.includes('bandwidth') ||
      lower.includes('overloaded') ||
      lower.includes('resource') ||
      lower.includes('redistribute'))
    ) {
      const workload = await queryWorkloadDistribution(context.tenantId, context.userId);
      data.workloadDistribution = workload.data;
    }

    // OKR-specific queries — manager+ only for org-wide goal landscape
    if (
      managerAccess && (
      lower.includes('okr') ||
      lower.includes('objective') ||
      lower.includes('key result') ||
      lower.includes('cascade') ||
      lower.includes('alignment') ||
      lower.includes('strateg'))
    ) {
      const orgGoals = await queryGoals(context.tenantId, {
        status: 'active',
        limit: 50,
      });
      data.organizationGoals = orgGoals.data;
    }

    return data;
  }
}

// ── Singleton Export ─────────────────────────────────────────

export const strategicAlignmentAgent = new StrategicAlignmentAgent();
