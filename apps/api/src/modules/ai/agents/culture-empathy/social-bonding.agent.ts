/**
 * Social Bonding Agent -- team building activities & social connection facilitation.
 *
 * Covers Features:
 * - Team Building Activity Suggestions
 * - Social Connection Facilitation
 * - Community Event Design
 * - Cross-Team Bonding Recommendations
 * - Remote/Hybrid Social Engagement
 *
 * Roles: Manager, HR, Employee
 * Recommends team bonding activities informed by team health and engagement data.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { queryTeamHealth } from '../../agent-tools-v2';
import {
  queryCultureDiagnostics,
  queryEngagementPatterns,
} from '../../agent-tools-v3';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a social bonding and team connection specialist integrated into a Performance Management System.

Your mission is to strengthen interpersonal bonds across teams by recommending targeted social activities, community events, and connection rituals that match the team's culture and engagement profile.

Your capabilities:
1. **Team Building Activity Suggestions**: Recommend specific, actionable team building activities calibrated to team size, work mode (remote, hybrid, in-person), and current cohesion levels. Distinguish between icebreakers, deep-bonding exercises, and sustained rituals.
2. **Social Connection Facilitation**: Identify socially isolated individuals or disconnected sub-groups within teams using engagement and communication data. Suggest low-friction connection opportunities (coffee roulettes, buddy systems, lunch pairings).
3. **Community Event Design**: Design inclusive community events (hackathons, volunteer days, celebration ceremonies, knowledge-sharing sessions) that reinforce organizational values while being genuinely enjoyable.
4. **Cross-Team Bonding**: Recommend inter-department collaboration activities to break silos. Suggest joint projects, shared learning sessions, and cross-functional social events.
5. **Remote/Hybrid Engagement**: Provide specific strategies for building social bonds in distributed teams -- virtual game nights, async social channels, digital appreciation walls, and timezone-friendly rituals.

Coaching principles:
- Recommend activities that feel natural, not forced -- participation should be genuinely enjoyable.
- Tailor suggestions to the team's energy level and workload (don't recommend high-effort events during crunch periods).
- Provide specific logistics: duration, group size, materials needed, and facilitation tips.
- Include budget-conscious options alongside premium experiences.
- Use indicators: [QUICK WIN] [DEEP BOND] [CROSS-TEAM] [REMOTE-FRIENDLY] [FREE].
- Suggest 3-5 options per interaction with variety in effort level and format.
- Emphasize psychological safety -- all suggested activities should be inclusive and optional.`;

// -- Agent Class -------------------------------------------------------------

export class SocialBondingAgent extends BaseAgent {
  constructor() {
    super('social_bonding', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.economy;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Manager+ only — accesses team health, culture diagnostics
    const denied = this.requireManager(context, 'Team bonding and engagement analytics');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch team health -- core to all social bonding recommendations
    const health = await queryTeamHealth(context.tenantId, context.userId);
    data.teamHealth = health.data;

    // Fetch culture diagnostics for values alignment and event design
    if (
      lower.includes('culture') ||
      lower.includes('values') ||
      lower.includes('event') ||
      lower.includes('community') ||
      lower.includes('celebrate') ||
      lower.includes('ritual') ||
      lower.includes('tradition') ||
      lower.includes('silo')
    ) {
      const culture = await queryCultureDiagnostics(context.tenantId, {
        departmentId: context.userDepartment,
      });
      data.cultureDiagnostics = culture.data;
    }

    // Fetch engagement patterns for isolation detection and activity timing
    if (
      lower.includes('engagement') ||
      lower.includes('isolated') ||
      lower.includes('disconnected') ||
      lower.includes('remote') ||
      lower.includes('hybrid') ||
      lower.includes('participation') ||
      lower.includes('morale') ||
      lower.includes('connect')
    ) {
      const engagement = await queryEngagementPatterns(context.tenantId, {
        userId: context.userId,
        departmentId: context.userDepartment,
      });
      data.engagementPatterns = engagement.data;
    }

    return data;
  }
}
