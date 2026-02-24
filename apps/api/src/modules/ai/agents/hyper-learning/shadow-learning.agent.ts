/**
 * Shadow Learning Agent -- job shadowing & experiential learning.
 *
 * Covers Features:
 * - Job Shadowing Recommendations
 * - Peer Observation Matching
 * - Experiential Learning Paths
 * - Cross-Role Exposure Planning
 * - Shadow Debrief Generation
 *
 * Roles: Employee, Manager
 * Matches employees with shadow opportunities that accelerate hands-on skill acquisition.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { queryUsers } from '../../agent-tools';
import { querySkillGaps, queryMentorMatches } from '../../agent-tools-v2';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a Shadow Learning specialist integrated into a Performance Management System.

Your mission is to design high-impact job shadowing and peer observation experiences that accelerate practical skill development through real-world exposure.

Your capabilities:
1. **Job Shadowing Recommendations**: Identify roles and individuals the user should shadow to fill specific skill gaps. Pair the shadow opportunity with the exact competency it addresses.
2. **Peer Observation Matching**: Find colleagues whose day-to-day work demonstrates skills the user needs. Explain what to observe and what to take notes on.
3. **Experiential Learning Paths**: Build multi-week shadow rotations across departments or functions that progressively deepen a targeted competency.
4. **Cross-Role Exposure Planning**: Map out short stints in adjacent roles (1-3 days) that broaden the user's understanding of cross-functional workflows.
5. **Shadow Debrief Generation**: After a shadow session, help the user structure reflections into actionable takeaways and follow-up learning goals.

Shadowing principles:
- Always tie each recommendation to a specific, measurable skill gap.
- Prefer internal matches within the same tenant before suggesting external learning.
- Include a suggested observation checklist for every shadow pairing.
- Recommend shadow durations (e.g., half-day, 2-day, 1-week rotation).
- Be specific: "Shadow Maria Chen (Sr. Product Manager) to observe stakeholder negotiation in sprint planning."
- Provide a debrief template with reflection prompts after each session.
- Limit recommendations to 2-4 actionable shadow experiences per interaction.`;

// -- Agent Class -------------------------------------------------------------

export class ShadowLearningAgent extends AgenticBaseAgent {
  constructor() {
    super('shadow_learning', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.economy;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Manager+ only — accesses org user lists, mentor matches
    const denied = this.requireManager(context, 'Shadow learning and peer observation programs');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch skill gaps -- core to shadow matching
    const skillGaps = await querySkillGaps(context.tenantId, context.userId);
    data.skillGaps = skillGaps.data;

    // Fetch mentor/shadow matches if discussing pairing, observation, or shadowing
    if (
      lower.includes('shadow') ||
      lower.includes('observe') ||
      lower.includes('pair') ||
      lower.includes('mentor') ||
      lower.includes('watch') ||
      lower.includes('learn from') ||
      lower.includes('rotation')
    ) {
      const mentors = await queryMentorMatches(context.tenantId, context.userId);
      data.mentorMatches = mentors.data;
    }

    // Fetch user pool for cross-role exploration
    if (
      lower.includes('role') ||
      lower.includes('department') ||
      lower.includes('cross') ||
      lower.includes('team') ||
      lower.includes('function') ||
      lower.includes('who')
    ) {
      const users = await queryUsers(context.tenantId, {
        isActive: true,
        limit: 20,
      });
      data.availableUsers = users.data;
    }

    return data;
  }
}
