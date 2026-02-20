/**
 * Conflict of Interest Agent -- COI detection, dual relationships, and ethical boundaries.
 *
 * Covers Features:
 * - Conflict of Interest Detection
 * - Dual Relationship Identification
 * - Competing Interests Analysis
 * - Ethical Boundary Guidance
 * - Recusal Recommendation Engine
 *
 * Roles: HR, Admin, Compliance Officer, Manager
 * Uses user data, project contributions, and compliance status to identify potential COI situations.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { queryUsers } from '../../agent-tools';
import { queryProjectContributions, queryComplianceStatus } from '../../agent-tools-v3';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a conflict of interest (COI) detection and ethics specialist integrated into a Performance Management System.

Your mission is to help organizations identify, assess, and manage conflicts of interest including dual relationships, competing interests, and ethical boundary concerns in performance management processes.

Your capabilities:
1. **COI Detection**: Analyze relationships between reviewers, reviewees, and project collaborators to detect potential conflicts. Flag situations where a manager reviews someone they have a personal relationship with, financial interest in, or competing loyalties.
2. **Dual Relationship Identification**: Detect when individuals hold multiple roles that could create bias -- such as a mentor who is also an evaluator, a project partner who is also a compensation approver, or a family member in the reporting chain.
3. **Competing Interests Analysis**: Identify scenarios where personal interests (side projects, external board seats, vendor relationships) may conflict with organizational responsibilities or objectivity in reviews.
4. **Ethical Boundary Guidance**: Provide clear guidance on maintaining ethical boundaries in performance evaluations, promotion decisions, and compensation reviews. Explain what constitutes a conflict and the appropriate mitigation steps.
5. **Recusal Recommendations**: When a conflict is identified, recommend specific recusal actions (e.g., "Manager A should recuse from reviewing Employee B; suggest Manager C as an alternative reviewer").

Ethics principles:
- Apply the "reasonable person" test: would a reasonable, informed third party perceive a conflict?
- Present COI findings as risks to manage, not accusations of wrongdoing.
- Provide specific, actionable mitigation steps for each identified conflict.
- Use risk indicators: [NO CONFLICT] [POTENTIAL COI] [CONFIRMED COI] [RECUSAL RECOMMENDED].
- Distinguish between actual conflicts, potential conflicts, and perceived conflicts -- all three matter.
- Recommend disclosure as the first step for most potential conflicts.
- Maintain strict neutrality -- never take sides in COI disputes.
- When analyzing reviewer-reviewee relationships, check for shared projects, reporting lines, and departmental overlaps.`;

// -- Agent Class -------------------------------------------------------------

export class ConflictOfInterestAgent extends BaseAgent {
  constructor() {
    super('conflict_of_interest', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.standard;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Admin only — COI analysis exposes relationship and reporting-chain data
    const denied = this.requireAdmin(context, 'Conflict of interest analysis');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Fetch compliance status for COI policies and disclosures
    const compliance = await queryComplianceStatus(context.tenantId, {
      policyType: 'conduct',
    });
    data.complianceStatus = compliance.data;

    // Fetch user/team data when analyzing relationships or reviewer assignments
    if (
      lower.includes('review') ||
      lower.includes('team') ||
      lower.includes('manager') ||
      lower.includes('relationship') ||
      lower.includes('report') ||
      lower.includes('department') ||
      lower.includes('assign')
    ) {
      const users = await queryUsers(context.tenantId, {
        isActive: true,
        departmentId: context.userDepartment,
        limit: 50,
      });
      data.teamUsers = users.data;
    }

    // Fetch project contributions when checking for shared project conflicts
    if (
      lower.includes('project') ||
      lower.includes('collaborat') ||
      lower.includes('partner') ||
      lower.includes('vendor') ||
      lower.includes('shared') ||
      lower.includes('overlap')
    ) {
      const contributions = await queryProjectContributions(context.tenantId, {
        userId: context.userId,
        limit: 30,
      });
      data.projectContributions = contributions.data;
    }

    // Broad COI analysis -- fetch all relevant data
    if (
      lower.includes('conflict') ||
      lower.includes('coi') ||
      lower.includes('interest') ||
      lower.includes('recusal') ||
      lower.includes('bias') ||
      lower.includes('ethical')
    ) {
      const allUsers = await queryUsers(context.tenantId, {
        isActive: true,
        limit: 100,
      });
      data.organizationUsers = allUsers.data;

      const allProjects = await queryProjectContributions(context.tenantId, {
        limit: 50,
      });
      data.allProjectContributions = allProjects.data;
    }

    return data;
  }
}
