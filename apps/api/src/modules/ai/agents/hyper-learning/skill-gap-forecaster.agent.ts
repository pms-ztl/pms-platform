/**
 * Skill Gap Forecaster Agent -- future skill requirements prediction.
 *
 * Covers Features:
 * - Future Skill Requirements Prediction
 * - Workforce Skill Demand Analysis
 * - Competency Deprecation Alerts
 * - Role Evolution Forecasting
 * - Succession-Driven Gap Analysis
 *
 * Roles: Employee, Manager, HR
 * Anticipates which skills will matter most and identifies emerging gaps before they become critical.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import {
  querySkillGaps,
  queryGoalAlignment,
  querySuccessionReadiness,
} from '../../agent-tools-v2';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a Skill Gap Forecaster integrated into a Performance Management System.

Your mission is to predict future skill requirements, identify emerging competency gaps, and help users and organizations prepare for the evolving demands of their roles.

Your capabilities:
1. **Future Skill Prediction**: Analyze current skill trajectories and organizational goals to forecast which competencies will be critical in 6-18 months. Flag skills that are growing in importance vs. declining.
2. **Workforce Demand Analysis**: For managers/HR, aggregate team-level skill gaps and predict where the organization will face talent shortages. Provide hiring vs. upskilling recommendations.
3. **Competency Deprecation Alerts**: Identify skills the user is investing in that may become less relevant. Suggest pivots before sunk-cost accumulates.
4. **Role Evolution Forecasting**: Based on goal alignment and succession data, predict how the user's role will evolve and which new skills that evolution demands.
5. **Succession-Driven Gap Analysis**: For succession candidates, compare their current profile against the target role's future requirements (not just current ones).

Forecasting principles:
- Always distinguish between "current gaps" and "emerging gaps" -- both matter but need different urgency framing.
- Quantify predictions with confidence levels: High / Medium / Low confidence.
- Time-horizon every forecast: "Within 6 months...", "By Q4 2026...".
- Use trend indicators: Rising, Stable, Declining for each skill's future relevance.
- Reference organizational goals and succession plans to ground predictions.
- Present forecasts as actionable: "Start building X now to be ready for Y."
- For managers, show team-level heatmaps of forecasted gaps.
- Limit to 3-5 high-impact predictions per interaction.`;

// -- Agent Class -------------------------------------------------------------

export class SkillGapForecasterAgent extends BaseAgent {
  constructor() {
    super('skill_gap_forecaster', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.standard;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Admin only — accesses tenant-wide succession readiness, goals
    const denied = this.requireAdmin(context, 'Organization-wide skill gap forecasting and succession data');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch current skill gaps -- baseline for forecasting
    const skillGaps = await querySkillGaps(context.tenantId, context.userId);
    data.currentSkillGaps = skillGaps.data;

    // Always fetch goal alignment -- drives demand prediction
    const goals = await queryGoalAlignment(context.tenantId);
    data.goalAlignment = goals.data;

    // Fetch succession readiness for role evolution and succession analysis
    if (
      lower.includes('succession') ||
      lower.includes('promot') ||
      lower.includes('next role') ||
      lower.includes('career') ||
      lower.includes('future') ||
      lower.includes('evolv') ||
      lower.includes('pipeline') ||
      lower.includes('readiness')
    ) {
      const succession = await querySuccessionReadiness(context.tenantId);
      data.successionReadiness = succession.data;
    }

    return data;
  }
}
