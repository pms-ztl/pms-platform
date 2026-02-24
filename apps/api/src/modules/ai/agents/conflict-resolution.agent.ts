/**
 * Conflict Resolution Agent -- team dynamics and friction mediation.
 *
 * Covers Features:
 * - Autonomous Conflict Mediation & Team Health Agents
 * - Human-Agent Ratio Performance Metrics
 *
 * Roles: Manager, HR
 * Detects early friction signals, monitors collaboration health,
 * mediates conflicts, and coaches on communication styles.
 */

import { AgenticBaseAgent, type AgentContext } from '../agentic-base-agent';
import { queryFeedback } from '../agent-tools';
import {
  queryTeamHealth,
  queryCommunicationPatterns,
  queryWorkloadDistribution,
} from '../agent-tools-v2';

// ── System Prompt ───────────────────────────────────────────

const SYSTEM_PROMPT = `You are a team dynamics specialist for a Performance Management System.

Your mission is to detect early friction, monitor collaboration health, and provide mediation guidance before conflicts escalate.

Your capabilities:
1. **Early Friction Detection**: Analyze feedback sentiment, communication pattern changes, and collaboration frequency drops to identify team friction before it becomes a conflict. Flag the specific signals you detected.
2. **Conflict Mediation Guidance**: When friction is identified, recommend structured mediation approaches: conversation starters, meeting formats, and resolution frameworks appropriate to the conflict type.
3. **Communication Style Coaching**: Analyze how team members give feedback and communicate. Identify style mismatches that cause friction and coach teams toward more effective patterns.
4. **Collaboration Health Metrics**: Track and report on team collaboration indicators -- response times, feedback quality, cross-functional engagement, and mutual support patterns.
5. **Human-Agent Ratio Metrics**: Monitor the balance between AI-assisted and human-led interventions. Ensure the system augments managers rather than replacing human judgment.

Mediation principles:
- Remain neutral -- never take sides or assign blame.
- Quantify friction: use collaboration scores (0-100) and trend directions.
- Focus on behaviors and patterns, never personalities.
- Suggest specific conversation frameworks (e.g., SBI model, nonviolent communication).
- Escalate to HR when signals exceed thresholds -- do not attempt to resolve harassment or policy violations.
- Protect anonymity when reporting feedback-derived friction signals.
- Track intervention effectiveness: did collaboration metrics improve post-mediation?`;

// ── Agent Class ─────────────────────────────────────────────

export class ConflictResolutionAgent extends AgenticBaseAgent {
  constructor() {
    super('conflict_resolution', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Manager+ only — accesses team health, feedback, and communication data
    const denied = this.requireManager(context, 'Conflict resolution and team dynamics analysis');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch team health -- foundational for conflict detection
    const teamHealth = await queryTeamHealth(context.tenantId, context.userId);
    data.teamHealth = teamHealth.data;

    // Always fetch communication patterns to detect friction signals
    const commPatterns = await queryCommunicationPatterns(context.tenantId, context.userId);
    data.communicationPatterns = commPatterns.data;

    // Fetch constructive/negative feedback for friction analysis
    if (
      lower.includes('conflict') ||
      lower.includes('friction') ||
      lower.includes('issue') ||
      lower.includes('problem') ||
      lower.includes('tension') ||
      lower.includes('disagree') ||
      lower.includes('feedback') ||
      lower.includes('complaint')
    ) {
      const negativeFeedback = await queryFeedback(context.tenantId, {
        type: 'constructive',
        limit: 20,
      });
      data.constructiveFeedback = negativeFeedback.data;
    }

    // Workload distribution -- imbalances often cause friction
    if (
      lower.includes('workload') ||
      lower.includes('fair') ||
      lower.includes('overwork') ||
      lower.includes('balance') ||
      lower.includes('burnt') ||
      lower.includes('frustrat')
    ) {
      const workload = await queryWorkloadDistribution(context.tenantId, context.userId);
      data.workloadDistribution = workload.data;
    }

    return data;
  }
}

// ── Singleton Export ─────────────────────────────────────────

export const conflictResolutionAgent = new ConflictResolutionAgent();
