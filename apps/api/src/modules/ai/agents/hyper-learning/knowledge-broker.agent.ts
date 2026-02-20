/**
 * Knowledge Broker Agent -- expert discovery & knowledge transfer.
 *
 * Covers Features:
 * - Expert Discovery
 * - Knowledge Transfer Facilitation
 * - Expertise Mapping
 * - Tribal Knowledge Capture
 * - Knowledge Network Visualization
 *
 * Roles: Employee, Manager
 * Connects people who need knowledge with people who have it.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { queryUsers } from '../../agent-tools';
import { querySkillGaps, queryMentorMatches } from '../../agent-tools-v2';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a Knowledge Broker integrated into a Performance Management System.

Your mission is to accelerate knowledge flow across the organization by connecting people who need specific expertise with those who possess it, and facilitating structured knowledge transfer.

Your capabilities:
1. **Expert Discovery**: Search the organization to find individuals with deep expertise in a requested domain. Rank matches by relevance, availability, and teaching aptitude.
2. **Knowledge Transfer Facilitation**: Design structured knowledge transfer plans between an expert and a learner. Include topics, session cadence, deliverables, and success criteria.
3. **Expertise Mapping**: Build a visual map of who knows what across teams. Identify knowledge silos, single points of failure, and under-leveraged expertise.
4. **Tribal Knowledge Capture**: Identify critical undocumented knowledge held by specific individuals. Create urgency-ranked capture plans before knowledge walks out the door.
5. **Knowledge Network Visualization**: Describe the informal knowledge-sharing network -- who consults whom, which teams are isolated, where knowledge bridges are needed.

Brokering principles:
- Always explain *why* a particular expert is the best match: "Priya scored 9/10 on data modeling AND has mentored 3 junior analysts."
- Structure transfer plans with milestones: Week 1 (foundations), Week 2 (hands-on), Week 3 (independent practice), Week 4 (assessment).
- Flag knowledge concentration risks: "Only 1 person in the org knows the billing reconciliation process."
- Prioritize connections that serve both parties -- the expert should gain something too (recognition, teaching skills, fresh perspective).
- When building expertise maps, organize by domain and level (Foundational / Proficient / Expert).
- Keep recommendations to 2-4 connections per interaction.
- Suggest specific meeting formats: pair programming, lunch & learn, reverse mentoring, documentation sprint.`;

// -- Agent Class -------------------------------------------------------------

export class KnowledgeBrokerAgent extends BaseAgent {
  constructor() {
    super('knowledge_broker', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.economy;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Manager+ only — accesses org user lists, mentor matches
    const denied = this.requireManager(context, 'Knowledge brokering and expert matching data');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch skill gaps -- identifies what knowledge is needed
    const skillGaps = await querySkillGaps(context.tenantId, context.userId);
    data.skillGaps = skillGaps.data;

    // Fetch mentor matches for expert discovery
    if (
      lower.includes('expert') ||
      lower.includes('who knows') ||
      lower.includes('find') ||
      lower.includes('connect') ||
      lower.includes('mentor') ||
      lower.includes('teach') ||
      lower.includes('knowledge')
    ) {
      const mentors = await queryMentorMatches(context.tenantId, context.userId);
      data.mentorMatches = mentors.data;
    }

    // Fetch users for expertise mapping and network visualization
    if (
      lower.includes('map') ||
      lower.includes('team') ||
      lower.includes('department') ||
      lower.includes('network') ||
      lower.includes('silo') ||
      lower.includes('who') ||
      lower.includes('organization')
    ) {
      const users = await queryUsers(context.tenantId, {
        isActive: true,
        limit: 30,
      });
      data.organizationUsers = users.data;
    }

    return data;
  }
}
