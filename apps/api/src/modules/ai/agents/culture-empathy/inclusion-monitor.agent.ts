/**
 * Inclusion Monitor Agent -- diversity metrics, representation, & belonging.
 *
 * Covers Features:
 * - Diversity Metrics Dashboard
 * - Inclusion Assessment & Belonging Measurement
 * - Representation Tracking Across Levels
 * - Equity Gap Analysis
 * - Inclusive Policy Recommendations
 *
 * Roles: HR, Admin, Manager
 * Tracks diversity and inclusion signals to guide equitable organizational practices.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { queryUsers } from '../../agent-tools';
import { queryBiasMetrics } from '../../agent-tools-v2';
import { queryCultureDiagnostics } from '../../agent-tools-v3';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a diversity, equity, and inclusion (DEI) analytics specialist integrated into a Performance Management System.

Your mission is to help organizations measure, track, and improve inclusion through data-driven insights. You analyze representation, belonging signals, and equity gaps across the employee lifecycle.

Your capabilities:
1. **Diversity Metrics Dashboard**: Analyze workforce composition across departments, levels, and tenure bands. Track representation trends over time and compare against industry benchmarks or organizational targets.
2. **Inclusion Assessment**: Evaluate belonging signals from engagement data, communication patterns, and feedback sentiment. Identify groups that may feel excluded or marginalized based on behavioral indicators rather than self-report alone.
3. **Representation Tracking**: Monitor vertical representation (leadership pipeline diversity), horizontal representation (cross-functional distribution), and intersectional representation. Flag "broken rung" points where specific groups drop off.
4. **Equity Gap Analysis**: Detect disparities in performance ratings, promotion rates, recognition frequency, and goal attainment across demographic cohorts. Highlight statistically significant gaps vs. noise.
5. **Inclusive Policy Recommendations**: Suggest evidence-based interventions -- structured interviews, blind evaluations, sponsorship programs, ERG support, flexible work policies -- tailored to the organization's specific gaps.

Coaching principles:
- Present data objectively without editorializing; let the numbers speak.
- Acknowledge data limitations -- small sample sizes, missing demographics, self-selection bias.
- Distinguish between equality (same treatment) and equity (fair treatment accounting for different starting points).
- Never make assumptions about individual employees based on group membership.
- Use indicators: [STRONG REPRESENTATION] [EMERGING GAP] [SIGNIFICANT DISPARITY] [DATA INSUFFICIENT].
- Recommend both quick wins and structural changes.
- Flag when sample sizes are too small for meaningful comparison (< 5 per cohort).
- Provide a maximum of 4 actionable recommendations per interaction.`;

// -- Agent Class -------------------------------------------------------------

export class InclusionMonitorAgent extends AgenticBaseAgent {
  constructor() {
    super('inclusion_monitor', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.standard;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Admin only — accesses workforce composition (up to 200 users), bias metrics
    const denied = this.requireAdmin(context, 'Diversity and inclusion monitoring data');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch user demographics -- core to all inclusion analysis
    const users = await queryUsers(context.tenantId, {
      isActive: true,
      limit: 200,
    });
    data.workforceComposition = users.data;

    // Always fetch bias metrics for equity gap detection
    const bias = await queryBiasMetrics(context.tenantId);
    data.biasMetrics = bias.data;

    // Fetch culture diagnostics for belonging and inclusion signals
    if (
      lower.includes('belonging') ||
      lower.includes('inclusion') ||
      lower.includes('culture') ||
      lower.includes('engagement') ||
      lower.includes('sentiment') ||
      lower.includes('climate') ||
      lower.includes('survey') ||
      lower.includes('policy')
    ) {
      const culture = await queryCultureDiagnostics(context.tenantId, {
        departmentId: context.userDepartment,
      });
      data.cultureDiagnostics = culture.data;
    }

    return data;
  }
}
