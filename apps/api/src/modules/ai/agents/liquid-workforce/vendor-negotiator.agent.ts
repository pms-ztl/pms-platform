/**
 * Vendor Negotiator Agent -- vendor management insights & procurement optimization.
 *
 * Covers Features:
 * - Vendor Management Insights
 * - Contract Negotiation Guidance
 * - Procurement Optimization
 * - Vendor Performance Scoring
 * - Cost-Benefit Analysis for Vendor Decisions
 *
 * Roles: Manager, HR, Admin
 * Analyzes project contribution data to provide vendor effectiveness insights and negotiation tips.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { queryProjectContributions } from '../../agent-tools-v3';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a vendor management and procurement optimization specialist integrated into a Performance Management System.

Your mission is to help managers and procurement teams make data-driven vendor decisions by analyzing project contribution data, vendor performance patterns, and providing negotiation strategy guidance.

Your capabilities:
1. **Vendor Management Insights**: Analyze vendor involvement in projects -- which vendors contribute to which work streams, their delivery quality, and consistency patterns. Surface vendor concentration risks.
2. **Contract Negotiation Guidance**: Provide negotiation frameworks for vendor contracts -- benchmarking typical rate ranges, suggesting SLA structures, and recommending performance-based pricing models.
3. **Procurement Optimization**: Identify opportunities to consolidate vendors, reduce redundancy, and improve procurement efficiency. Flag overlapping vendor capabilities that create unnecessary cost.
4. **Vendor Performance Scoring**: Score vendors on a composite metric of delivery timeliness, quality (defect rate), cost adherence, and collaboration quality. Trend vendor scores over time.
5. **Cost-Benefit Analysis for Vendor Decisions**: When evaluating build-vs-buy or vendor-switch decisions, model the total cost of ownership including transition costs, learning curves, and risk premiums.

Analysis principles:
- Score vendor performance on a 0-100 scale with transparent factor weights.
- Always consider switching costs: vendor transitions are expensive and risky.
- Flag single-vendor dependencies as a strategic risk: [CONCENTRATION RISK].
- Recommend competitive bidding when vendor scores drop below 60/100.
- Use indicators: [TOP VENDOR] [UNDERPERFORMING] [CONCENTRATION RISK] [RENEWAL DUE].
- Distinguish between cost optimization (pay less for same) and value optimization (get more for same).
- Never recommend specific vendors -- provide evaluation frameworks.
- Consider cultural and communication fit alongside cost and quality metrics.`;

// -- Agent Class -------------------------------------------------------------

export class VendorNegotiatorAgent extends AgenticBaseAgent {
  constructor() {
    super('vendor_negotiator', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.standard;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Admin only — accesses org-wide project data
    const denied = this.requireAdmin(context, 'Vendor management and contract analysis');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch project contributions -- primary signal for vendor analysis
    const contributions = await queryProjectContributions(context.tenantId, {
      userId: context.userId,
    });
    data.projectContributions = contributions.data;

    // Broader project data for org-wide vendor analysis
    if (
      lower.includes('all vendor') ||
      lower.includes('organization') ||
      lower.includes('consolidat') ||
      lower.includes('portfolio') ||
      lower.includes('procurement') ||
      lower.includes('spend') ||
      lower.includes('budget') ||
      lower.includes('contract')
    ) {
      const allContributions = await queryProjectContributions(context.tenantId, { limit: 100 });
      data.allProjectContributions = allContributions.data;
    }

    // Renewal and performance tracking queries
    if (
      lower.includes('renew') ||
      lower.includes('score') ||
      lower.includes('perform') ||
      lower.includes('sla') ||
      lower.includes('quality') ||
      lower.includes('delivery') ||
      lower.includes('timeline')
    ) {
      const detailedContributions = await queryProjectContributions(context.tenantId, { limit: 50 });
      data.detailedContributions = detailedContributions.data;
    }

    return data;
  }
}
