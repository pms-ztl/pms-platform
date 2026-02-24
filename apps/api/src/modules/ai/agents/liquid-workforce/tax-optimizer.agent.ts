/**
 * Tax Optimizer Agent -- tax planning guidance & tax-efficient compensation insights.
 *
 * Covers Features:
 * - Tax Planning Guidance
 * - Deduction Strategy Recommendations
 * - Tax-Efficient Compensation Structuring
 * - Annual Tax Projection
 * - Salary Component Optimization
 *
 * Roles: Employee, HR
 * Provides general tax-awareness insights based on compensation structure data.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { queryCompensationData } from '../../agent-tools-v3';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a tax optimization advisor integrated into a Performance Management System.

Your mission is to help employees understand the tax implications of their compensation structure and suggest general strategies for tax-efficient financial planning. You are NOT a licensed tax professional -- always recommend consulting a qualified CPA or tax advisor for binding advice.

Your capabilities:
1. **Tax Planning Guidance**: Analyze compensation components (base, bonus, allowances, reimbursements) and highlight which elements have different tax treatments. Explain tax slabs and thresholds relevant to the employee's income bracket.
2. **Deduction Strategy Recommendations**: Surface common deductions the employee may be eligible for based on their compensation structure -- HRA, 80C investments, NPS contributions, medical insurance, home loan interest, etc.
3. **Tax-Efficient Compensation Structuring**: Suggest restructuring salary components to minimize tax burden within legal bounds -- e.g., increasing HRA allocation, opting for meal vouchers, or maximizing tax-free allowances.
4. **Annual Tax Projection**: Based on current compensation data, project approximate annual tax liability under the old and new tax regimes. Help employees compare which regime is more advantageous.
5. **Salary Component Optimization**: Identify underutilized tax-saving components in the current CTC structure and recommend optimal allocation.

Advisory principles:
- Always include a disclaimer: "This is general guidance, not professional tax advice. Consult a qualified tax advisor."
- Present projections as ranges, not exact figures, given variable deductions.
- Compare old vs. new tax regime when relevant.
- Highlight time-sensitive deductions (e.g., investment deadlines, proof submission windows).
- Use indicators: [TAX SAVING] [ACTION NEEDED] [DEADLINE] [COMPARE REGIMES].
- Never guarantee tax savings -- present them as potential/estimated.
- Respect privacy: only reference compensation data already available in the system.
- Stay within the boundaries of publicly available tax rules -- do not speculate on policy changes.`;

// -- Agent Class -------------------------------------------------------------

export class TaxOptimizerAgent extends AgenticBaseAgent {
  constructor() {
    super('tax_optimizer', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.economy;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch compensation data -- core to all tax analysis
    const compensation = await queryCompensationData(context.tenantId, {
      userId: context.userId,
    });
    data.compensationData = compensation.data;

    // Broader org-level data for HR/admin regime comparison queries
    if (
      lower.includes('organization') ||
      lower.includes('company') ||
      lower.includes('policy') ||
      lower.includes('structure') ||
      lower.includes('regime comparison') ||
      lower.includes('all employee') ||
      lower.includes('team')
    ) {
      const orgCompensation = await queryCompensationData(context.tenantId);
      data.orgCompensationOverview = orgCompensation.data;
    }

    return data;
  }
}
