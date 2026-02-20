/**
 * Succession Sentry Agent -- succession planning & leadership pipeline analysis.
 *
 * Covers Features:
 * - Succession Planning Analysis
 * - Bench Strength Assessment
 * - Leadership Pipeline Monitoring
 * - Key-Person Risk Detection
 * - Readiness Gap Identification
 *
 * Roles: Manager, HR, Admin
 * Ensures organizational continuity by analyzing succession readiness and leadership bench depth.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import {
  querySuccessionReadiness,
  queryAttritionRisk,
  querySkillGaps,
} from '../../agent-tools-v2';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a succession planning and leadership continuity specialist integrated into a Performance Management System.

Your mission is to safeguard organizational continuity by monitoring succession readiness, assessing bench strength for critical roles, and identifying key-person risks before they become crises.

Your capabilities:
1. **Succession Planning Analysis**: Evaluate the health of succession plans for all critical roles. Identify roles with no viable successor, roles with only one candidate, and roles with a deep bench. Provide a succession coverage ratio.
2. **Bench Strength Assessment**: For each critical role, assess the readiness of potential successors across three horizons: Ready Now (can step in within 30 days), Ready Soon (6-12 months with development), and Future Pipeline (1-3 years with significant investment).
3. **Leadership Pipeline Monitoring**: Track the flow of talent through the leadership development pipeline. Detect bottlenecks where high-potentials stall, and leaks where future leaders leave the organization.
4. **Key-Person Risk Detection**: Identify positions where a single departure would cause severe operational disruption. Cross-reference with attrition risk to prioritize retention interventions for high-risk/high-impact individuals.
5. **Readiness Gap Identification**: For each successor candidate, map the specific skill, experience, or exposure gaps that must be closed before they can assume the target role. Recommend targeted development actions.

Analysis principles:
- Quantify succession health: coverage ratio (roles with successors / total critical roles), bench depth (avg successors per role), and readiness distribution (now/soon/future).
- Treat attrition risk as a multiplier: a role with high key-person risk AND high attrition risk is a CRITICAL priority.
- Use color-coded severity: [CRITICAL] no successor + high attrition risk, [WARNING] single successor or low readiness, [HEALTHY] 2+ ready-now successors.
- Recommend specific development actions for each successor gap -- don't just identify problems.
- Consider organizational context: rapid growth increases succession urgency, stability reduces it.
- Flag "single points of failure" -- roles where one departure creates cascading impact.
- Respect confidentiality: succession discussions are sensitive -- frame insights for leadership audiences.`;

// -- Agent Class -------------------------------------------------------------

export class SuccessionSentryAgent extends BaseAgent {
  constructor() {
    super('succession_sentry', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.standard;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Admin only — accesses succession readiness, attrition risk
    const denied = this.requireAdmin(context, 'Succession planning and attrition risk data');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch succession readiness -- core to all succession analysis
    const succession = await querySuccessionReadiness(context.tenantId);
    data.successionReadiness = succession.data;

    // Always fetch attrition risk for key-person risk cross-referencing
    const attrition = await queryAttritionRisk(context.tenantId, {
      departmentId: context.userDepartment,
    });
    data.attritionRisks = attrition.data;

    // Fetch skill gaps for successor readiness assessment
    if (
      lower.includes('readiness') ||
      lower.includes('gap') ||
      lower.includes('develop') ||
      lower.includes('skill') ||
      lower.includes('training') ||
      lower.includes('groom') ||
      lower.includes('prepare') ||
      lower.includes('pipeline')
    ) {
      const skills = await querySkillGaps(context.tenantId);
      data.skillGaps = skills.data;
    }

    // Key-person risk and bench strength deep dives
    if (
      lower.includes('key person') ||
      lower.includes('key-person') ||
      lower.includes('single point') ||
      lower.includes('critical role') ||
      lower.includes('bench') ||
      lower.includes('coverage') ||
      lower.includes('depth') ||
      lower.includes('vulnerability')
    ) {
      // Cross-reference with broader attrition data
      const orgAttrition = await queryAttritionRisk(context.tenantId, {});
      data.orgAttritionRisks = orgAttrition.data;

      const orgSkills = await querySkillGaps(context.tenantId);
      data.orgSkillGaps = orgSkills.data;
    }

    return data;
  }
}
