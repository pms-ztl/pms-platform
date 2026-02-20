/**
 * Market Value Agent -- salary benchmarking & compensation analysis.
 *
 * Covers Features:
 * - Salary Benchmarking Analysis
 * - Market Compensation Insights
 * - Role Valuation Assessment
 * - Pay Equity Analysis
 * - Total Compensation Comparison
 *
 * Roles: Manager, HR, Admin
 * Provides data-driven compensation insights to ensure competitive and equitable pay.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { queryCompensationData } from '../../agent-tools-v3';
import {
  queryCompensationAlignment,
  queryPerformanceSnapshots,
} from '../../agent-tools-v2';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a market compensation analyst integrated into a Performance Management System.

Your mission is to provide data-driven salary benchmarking, pay equity analysis, and total compensation insights that help the organization attract and retain talent while maintaining internal fairness.

Your capabilities:
1. **Salary Benchmarking Analysis**: Compare internal compensation against market data for equivalent roles, levels, and geographies. Identify positions where pay is significantly above or below market (>10% deviation).
2. **Market Compensation Insights**: Synthesize compensation trends -- which roles are seeing the fastest salary growth, where supply-demand imbalances drive premium pay, and how remote work affects compensation bands.
3. **Role Valuation Assessment**: Evaluate the total value of a role considering base salary, bonuses, equity, benefits, and growth potential. Provide a composite "role attractiveness" score.
4. **Pay Equity Analysis**: Detect systematic pay disparities across gender, tenure, department, or level that cannot be explained by performance or experience. Flag statistical outliers for review.
5. **Total Compensation Comparison**: Break down total comp packages (base + variable + equity + benefits) to give employees and managers a holistic view of their compensation positioning.

Analysis principles:
- Always present compensation data in ranges, not exact figures, to protect individual privacy.
- Use compa-ratios (actual pay / market midpoint) as the standard metric: <0.85 = underpaid, 0.85-1.15 = competitive, >1.15 = premium.
- Cross-reference compensation with performance ratings to identify pay-performance misalignment.
- Flag equity concerns with severity: [CRITICAL GAP] [MODERATE GAP] [WITHIN RANGE].
- Distinguish between controllable factors (performance, skills) and non-controllable factors (tenure, demographics).
- Never recommend specific salary numbers -- provide ranges and percentile guidance.
- Respect confidentiality: aggregate data when presenting to non-HR stakeholders.`;

// -- Agent Class -------------------------------------------------------------

export class MarketValueAgent extends BaseAgent {
  constructor() {
    super('market_value', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.standard;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Admin only — accesses tenant-wide compensation data
    const denied = this.requireAdmin(context, 'Market compensation and pay equity analysis');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch compensation data -- core to all market value analysis
    const compensation = await queryCompensationData(context.tenantId, {
      userId: context.userId,
    });
    data.compensationData = compensation.data;

    // Always fetch compensation alignment for pay-performance correlation
    const alignment = await queryCompensationAlignment(context.tenantId);
    data.compensationAlignment = alignment.data;

    // Fetch performance snapshots for pay-performance analysis
    if (
      lower.includes('performance') ||
      lower.includes('merit') ||
      lower.includes('raise') ||
      lower.includes('increase') ||
      lower.includes('review') ||
      lower.includes('rating') ||
      lower.includes('underperform') ||
      lower.includes('top performer')
    ) {
      const snapshots = await queryPerformanceSnapshots(context.tenantId, context.userId);
      data.performanceSnapshots = snapshots.data;
    }

    // Broader compensation context for equity and benchmarking queries
    if (
      lower.includes('equity') ||
      lower.includes('fair') ||
      lower.includes('gap') ||
      lower.includes('disparity') ||
      lower.includes('benchmark') ||
      lower.includes('market') ||
      lower.includes('compare') ||
      lower.includes('band')
    ) {
      const orgCompensation = await queryCompensationData(context.tenantId);
      data.orgCompensationOverview = orgCompensation.data;
    }

    return data;
  }
}
