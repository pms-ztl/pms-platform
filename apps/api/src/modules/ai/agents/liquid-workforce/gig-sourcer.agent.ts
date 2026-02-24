/**
 * Gig Sourcer Agent -- internal gig matching & freelance-style project staffing.
 *
 * Covers Features:
 * - Internal Gig Matching
 * - Project Staffing Recommendations
 * - Freelance-Style Work Opportunities
 * - Cross-Functional Talent Discovery
 * - Skill-to-Project Mapping
 *
 * Roles: Manager, HR, Employee
 * Matches employees to internal gig opportunities based on skills and project needs.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { queryProjectContributions } from '../../agent-tools-v3';
import { querySkillGaps } from '../../agent-tools-v2';
import { queryUsers } from '../../agent-tools';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are an internal gig economy specialist integrated into a Performance Management System.

Your mission is to connect employees with internal project opportunities using a freelance-marketplace mindset -- matching available talent to short-term projects, stretch assignments, and cross-functional gigs.

Your capabilities:
1. **Internal Gig Matching**: Surface internal gig opportunities (projects, task forces, committees) and match employees based on skill fit, availability, and career interests.
2. **Project Staffing Recommendations**: For new or understaffed projects, recommend optimal team composition from the internal talent pool. Score candidates by skill coverage and collaborative fit.
3. **Freelance-Style Work Opportunities**: Identify employees who could benefit from short-term rotations or micro-assignments outside their primary role. Flag "hidden talent" with underutilized skills.
4. **Cross-Functional Talent Discovery**: Map skills across departments to find non-obvious talent matches. Surface employees whose side skills (e.g., a developer who excels at UX research) could fill project gaps.
5. **Skill-to-Project Mapping**: Maintain a dynamic view of which skills are in demand across active projects vs. which skills are available in the talent pool. Highlight supply-demand mismatches.

Matching principles:
- Score gig-candidate matches on a 0-100 scale with transparent factor weighting.
- Prioritize developmental value: gigs should grow the employee, not just fill a seat.
- Always check project contribution history to avoid recommending burned-out contributors.
- Flag employees with relevant skills who have never had cross-functional exposure.
- Use indicators: [STRONG MATCH] [GROWTH OPPORTUNITY] [AVAILABLE] [OVERCOMMITTED].
- When no strong internal match exists, explicitly state the gap.
- Respect department managers: note any cross-team borrowing implications.`;

// -- Agent Class -------------------------------------------------------------

export class GigSourcerAgent extends AgenticBaseAgent {
  constructor() {
    super('gig_sourcer', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.economy;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Manager+ only — accesses org-wide user data
    const denied = this.requireManager(context, 'Internal gig sourcing and talent pool data');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch project contributions -- core to gig sourcing
    const contributions = await queryProjectContributions(context.tenantId, {
      userId: context.userId,
    });
    data.projectContributions = contributions.data;

    // Always fetch skill gaps to inform matching
    const skills = await querySkillGaps(context.tenantId, context.userId);
    data.skillGaps = skills.data;

    // Fetch broader talent pool for staffing and cross-functional queries
    if (
      lower.includes('staff') ||
      lower.includes('team') ||
      lower.includes('talent') ||
      lower.includes('cross-function') ||
      lower.includes('candidate') ||
      lower.includes('who can') ||
      lower.includes('find someone') ||
      lower.includes('recommend')
    ) {
      const users = await queryUsers(context.tenantId, { isActive: true });
      data.activeTalentPool = users.data;

      const teamSkills = await querySkillGaps(context.tenantId);
      data.teamSkillGaps = teamSkills.data;
    }

    // Fetch individual user profile for personal gig discovery
    if (
      lower.includes('my gig') ||
      lower.includes('opportunity') ||
      lower.includes('side project') ||
      lower.includes('rotation') ||
      lower.includes('stretch') ||
      lower.includes('explore')
    ) {
      const allProjects = await queryProjectContributions(context.tenantId, { limit: 50 });
      data.allProjectContributions = allProjects.data;
    }

    return data;
  }
}
