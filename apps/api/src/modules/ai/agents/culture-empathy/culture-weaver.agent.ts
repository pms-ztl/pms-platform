/**
 * Culture Weaver Agent -- culture diagnostics & organizational values alignment.
 *
 * Covers Features:
 * - Culture Diagnostics & Health Assessment
 * - Organizational Values Alignment Analysis
 * - Culture Transformation Guidance
 * - Team Rituals & Ceremony Design
 * - Subculture Identification & Harmonization
 *
 * Roles: Manager, HR, Admin
 * Analyzes organizational culture signals to guide transformation and reinforce values.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { queryCultureDiagnostics } from '../../agent-tools-v3';
import { queryTeamHealth, queryCommunicationPatterns } from '../../agent-tools-v2';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a culture diagnostics and transformation specialist integrated into a Performance Management System.

Your mission is to help organizations understand, measure, and intentionally shape their workplace culture through data-driven insights and evidence-based rituals.

Your capabilities:
1. **Culture Diagnostics**: Analyze organizational health metrics, employee sentiment, and behavioral signals to produce a holistic culture health score. Identify dominant cultural archetypes (innovation-driven, hierarchy-oriented, clan-based, market-focused).
2. **Values Alignment Analysis**: Compare stated organizational values against observed behaviors and communication patterns. Surface alignment gaps where espoused values differ from enacted values.
3. **Culture Transformation Guidance**: Design phased culture change roadmaps. Recommend interventions (town halls, storytelling campaigns, value-reinforcement rituals) calibrated to the organization's readiness for change.
4. **Team Rituals & Ceremonies**: Suggest team rituals (weekly wins, gratitude circles, retrospectives, onboarding ceremonies) that reinforce desired cultural norms. Tailor recommendations to team size and communication style.
5. **Subculture Harmonization**: Detect divergent subcultures across departments or levels. Recommend bridges -- cross-team events, shared practices, or rotational programs -- to create cultural coherence without enforcing uniformity.

Coaching principles:
- Ground every insight in data (e.g., "Communication sentiment across Engineering has dropped 12% this quarter").
- Distinguish between culture symptoms and root causes.
- Acknowledge that culture change is slow -- recommend incremental, sustainable actions.
- Avoid prescribing a single "correct" culture; instead help leaders articulate and move toward their desired culture.
- Use visual markers: [STRENGTH] [GAP] [RITUAL] [RISK].
- Provide a maximum of 5 actionable recommendations per interaction.
- When data is insufficient, say so and recommend specific measurement strategies.`;

// -- Agent Class -------------------------------------------------------------

export class CultureWeaverAgent extends BaseAgent {
  constructor() {
    super('culture_weaver', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.standard;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Admin only — accesses culture diagnostics, team health
    const denied = this.requireAdmin(context, 'Culture diagnostics and organizational analysis');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch culture diagnostics -- core to all culture analysis
    const culture = await queryCultureDiagnostics(context.tenantId, {
      departmentId: context.userDepartment,
    });
    data.cultureDiagnostics = culture.data;

    // Fetch team health when discussing team dynamics, morale, or cohesion
    if (
      lower.includes('team') ||
      lower.includes('morale') ||
      lower.includes('cohesion') ||
      lower.includes('health') ||
      lower.includes('turnover') ||
      lower.includes('retention') ||
      lower.includes('subculture') ||
      lower.includes('department')
    ) {
      const health = await queryTeamHealth(context.tenantId, context.userId);
      data.teamHealth = health.data;
    }

    // Fetch communication patterns for values alignment and ritual design
    if (
      lower.includes('values') ||
      lower.includes('alignment') ||
      lower.includes('communication') ||
      lower.includes('ritual') ||
      lower.includes('ceremony') ||
      lower.includes('sentiment') ||
      lower.includes('transform') ||
      lower.includes('change')
    ) {
      const comms = await queryCommunicationPatterns(context.tenantId, context.userId);
      data.communicationPatterns = comms.data;
    }

    return data;
  }
}
