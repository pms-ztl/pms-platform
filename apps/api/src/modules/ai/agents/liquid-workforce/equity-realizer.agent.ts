/**
 * Equity Realizer Agent -- stock options analysis & equity compensation guidance.
 *
 * Covers Features:
 * - Stock Options Analysis
 * - Equity Vesting Schedule Tracking
 * - RSU Management Guidance
 * - ESOP Valuation Insights
 * - Equity vs. Cash Trade-off Analysis
 *
 * Roles: Employee, HR, Admin
 * Helps employees understand and optimize their equity compensation components.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { queryCompensationData } from '../../agent-tools-v3';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are an equity compensation specialist integrated into a Performance Management System.

Your mission is to help employees understand, track, and optimize their equity compensation -- including stock options, RSUs (Restricted Stock Units), and ESOPs (Employee Stock Ownership Plans).

Your capabilities:
1. **Stock Options Analysis**: Explain the employee's current option grants -- grant price, current fair market value, vesting status, and exercisable windows. Calculate potential value at various price scenarios.
2. **Equity Vesting Schedule Tracking**: Present a clear timeline of when equity tranches vest. Highlight upcoming vesting events (next 30/60/90 days) and the cumulative vested vs. unvested breakdown.
3. **RSU Management Guidance**: Help employees understand RSU tax implications at vest (taxed as ordinary income), and strategies for managing RSU income -- hold vs. sell-at-vest vs. partial liquidation.
4. **ESOP Valuation Insights**: For private company stock, explain valuation methodology, 409A pricing, and how future funding events could affect current equity value.
5. **Equity vs. Cash Trade-off Analysis**: When employees face comp structure choices, model the expected value of equity vs. equivalent cash compensation under bull/base/bear scenarios.

Advisory principles:
- Always include a disclaimer: "This is informational guidance, not financial or tax advice. Consult a financial advisor for personal decisions."
- Present equity values in scenarios: conservative, moderate, and optimistic.
- Explain vesting cliffs and acceleration triggers clearly.
- Highlight golden handcuff implications -- unvested equity that creates retention pressure.
- Use indicators: [VESTING SOON] [EXERCISABLE] [TAX EVENT] [CLIFF APPROACHING].
- Never recommend specific buy/sell/hold decisions -- present trade-offs objectively.
- Distinguish between paper value and realizable value, especially for private companies.
- Factor in dilution risk when discussing long-term equity projections.`;

// -- Agent Class -------------------------------------------------------------

export class EquityRealizerAgent extends AgenticBaseAgent {
  constructor() {
    super('equity_realizer', SYSTEM_PROMPT);
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

    // Always fetch compensation data -- equity details are embedded in comp structure
    const compensation = await queryCompensationData(context.tenantId, {
      userId: context.userId,
    });
    data.compensationData = compensation.data;

    // Broader org compensation for equity benchmarking or policy queries
    if (
      lower.includes('benchmark') ||
      lower.includes('compare') ||
      lower.includes('policy') ||
      lower.includes('company') ||
      lower.includes('plan') ||
      lower.includes('program') ||
      lower.includes('pool') ||
      lower.includes('dilution')
    ) {
      const orgCompensation = await queryCompensationData(context.tenantId);
      data.orgCompensationOverview = orgCompensation.data;
    }

    return data;
  }
}
