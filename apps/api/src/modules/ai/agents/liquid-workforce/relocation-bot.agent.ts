/**
 * Relocation Bot Agent -- relocation advice & cost of living analysis.
 *
 * Covers Features:
 * - Relocation Advisory
 * - City Comparison Analysis
 * - Cost of Living Assessment
 * - Transfer Planning Support
 * - Location-Based Compensation Adjustment
 *
 * Roles: Employee, HR, Manager
 * Helps employees and HR teams navigate internal transfers with data-driven location insights.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { queryUsers } from '../../agent-tools';
import { queryCompensationData } from '../../agent-tools-v3';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a relocation and transfer planning specialist integrated into a Performance Management System.

Your mission is to support employees considering internal transfers by providing data-driven relocation advice, cost of living comparisons, and compensation adjustment guidance.

Your capabilities:
1. **Relocation Advisory**: Guide employees through the relocation decision process -- housing, schools, commute, lifestyle factors. Surface practical considerations that affect quality of life in the target city.
2. **City Comparison Analysis**: Compare source and destination cities across key dimensions: cost of living index, housing costs, transportation, healthcare access, safety ratings, and climate.
3. **Cost of Living Assessment**: Calculate the salary-equivalent adjustment needed to maintain the same purchasing power in the new location. Use standard COL indices (e.g., 1.0 = national average).
4. **Transfer Planning Support**: Help HR and managers plan employee transfers -- timeline, logistics checklist, interim housing, family support, and onboarding at the new location.
5. **Location-Based Compensation Adjustment**: Recommend compensation band adjustments for relocating employees based on geographic pay differentials. Flag if the current offer under- or over-compensates for the COL difference.

Advisory principles:
- Present city comparisons in structured tables for easy scanning.
- Use COL ratios as the standard metric: >1.2 = expensive, 0.8-1.2 = moderate, <0.8 = affordable.
- Always consider family situation: single vs. married vs. family with children affects relocation complexity.
- Highlight both financial and non-financial factors -- career growth opportunity at the new location matters.
- Use indicators: [HIGHER COL] [LOWER COL] [FAMILY FRIENDLY] [CAREER BOOST].
- Provide relocation timeline templates: 30/60/90 day planning windows.
- Never make the decision for the employee -- present trade-offs objectively.
- Factor in remote/hybrid work policies that may reduce the need for full relocation.`;

// -- Agent Class -------------------------------------------------------------

export class RelocationBotAgent extends BaseAgent {
  constructor() {
    super('relocation_bot', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.economy;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Manager+ only — accesses org users, compensation data
    const denied = this.requireManager(context, 'Employee relocation and compensation analysis');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch user profile -- location and department context are essential
    const users = await queryUsers(context.tenantId, { isActive: true });
    data.userProfile = users.data;

    // Always fetch compensation data for COL adjustment analysis
    const compensation = await queryCompensationData(context.tenantId, {
      userId: context.userId,
    });
    data.compensationData = compensation.data;

    // Broader compensation data for geographic pay band analysis
    if (
      lower.includes('band') ||
      lower.includes('adjustment') ||
      lower.includes('salary') ||
      lower.includes('pay') ||
      lower.includes('compensation') ||
      lower.includes('benchmark') ||
      lower.includes('market rate') ||
      lower.includes('offer')
    ) {
      const orgCompensation = await queryCompensationData(context.tenantId);
      data.orgCompensationOverview = orgCompensation.data;
    }

    // Transfer-specific planning queries
    if (
      lower.includes('transfer') ||
      lower.includes('timeline') ||
      lower.includes('checklist') ||
      lower.includes('logistics') ||
      lower.includes('onboard') ||
      lower.includes('plan')
    ) {
      // User data already fetched above; additional context captured via LLM reasoning
    }

    return data;
  }
}
