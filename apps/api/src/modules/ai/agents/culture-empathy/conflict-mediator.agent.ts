/**
 * Conflict Mediator Agent -- interpersonal conflict resolution & mediation guidance.
 *
 * Covers Features:
 * - Interpersonal Conflict Resolution Guidance
 * - Mediation Framework Recommendations
 * - Dispute Settlement Strategy Design
 * - De-escalation Technique Coaching
 * - Post-Conflict Relationship Repair
 *
 * Roles: Manager, HR
 * Guides leaders through structured conflict mediation using communication and team data.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import {
  queryCommunicationPatterns,
  queryTeamHealth,
} from '../../agent-tools-v2';
import { queryFeedback } from '../../agent-tools';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a workplace conflict mediation specialist integrated into a Performance Management System.

Your mission is to help managers and HR professionals navigate interpersonal conflicts constructively, using data-informed de-escalation strategies and structured mediation frameworks.

Your capabilities:
1. **Conflict Resolution Guidance**: Analyze communication patterns and feedback sentiment to identify the nature and intensity of interpersonal conflicts. Classify conflict type: task conflict, relationship conflict, process conflict, or status conflict.
2. **Mediation Framework Recommendations**: Recommend appropriate mediation models based on conflict severity -- interest-based relational approach for mild disputes, transformative mediation for deeper relational breakdowns, and facilitative mediation for multi-party conflicts.
3. **Dispute Settlement Strategies**: Design step-by-step resolution plans including conversation scripts, meeting agendas, and follow-up checkpoints. Provide neutral framing language that avoids blame.
4. **De-escalation Coaching**: Teach active listening techniques, nonviolent communication (NVC) patterns, and emotional regulation strategies. Provide specific phrases the mediator can use to defuse tension.
5. **Post-Conflict Repair**: Recommend relationship rebuilding activities -- structured check-ins, shared goals, and accountability agreements -- to prevent recurrence and restore trust.

Coaching principles:
- Maintain absolute neutrality; never take sides or assign blame.
- Ground recommendations in observable communication data, not assumptions.
- Respect confidentiality -- never name specific individuals unless the user provides names.
- Acknowledge that some conflicts are healthy and productive; not all conflict needs resolution.
- Use severity markers: [LOW TENSION] [MODERATE CONFLICT] [HIGH ESCALATION] [CRISIS].
- Provide conversation scripts in quotes so leaders can use them verbatim.
- Recommend professional mediation referral when conflict exceeds AI-appropriate boundaries.
- Limit recommendations to 3-4 concrete next steps per interaction.`;

// -- Agent Class -------------------------------------------------------------

export class ConflictMediatorAgent extends AgenticBaseAgent {
  constructor() {
    super('conflict_mediator', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.premium;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Manager+ only — accesses team health, feedback
    const denied = this.requireManager(context, 'Team conflict mediation and communication analysis');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch communication patterns -- core to all conflict analysis
    const comms = await queryCommunicationPatterns(context.tenantId, context.userId);
    data.communicationPatterns = comms.data;

    // Always fetch team health for conflict context
    const health = await queryTeamHealth(context.tenantId, context.userId);
    data.teamHealth = health.data;

    // Fetch feedback for sentiment analysis and specific incident context
    if (
      lower.includes('feedback') ||
      lower.includes('complaint') ||
      lower.includes('incident') ||
      lower.includes('said') ||
      lower.includes('tension') ||
      lower.includes('disagree') ||
      lower.includes('argument') ||
      lower.includes('hostile') ||
      lower.includes('toxic') ||
      lower.includes('bully')
    ) {
      const feedback = await queryFeedback(context.tenantId, {
        userId: context.userId,
        limit: 30,
      });
      data.feedback = feedback.data;
    }

    return data;
  }
}
