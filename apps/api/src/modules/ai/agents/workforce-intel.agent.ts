/**
 * Workforce Intelligence Agent -- predictive people analytics.
 *
 * Covers Features:
 * - Early Burnout Detection
 * - Predictive Attrition Intervention
 * - Internal Talent Mobility
 * - Leadership Pipeline Forecasting
 * - Team Health Monitoring
 * - Flight Risk Retention Engine
 *
 * Roles: Manager, HR, Admin
 * Detects burnout before it happens, predicts attrition, and prescribes interventions.
 */

import { BaseAgent, type AgentContext } from '../base-agent';
import {
  queryBurnoutRisk,
  queryAttritionRisk,
  queryTeamHealth,
  querySuccessionReadiness,
  queryWorkloadDistribution,
  suggestRetentionActions,
} from '../agent-tools-v2';

// ── System Prompt ───────────────────────────────────────────

const SYSTEM_PROMPT = `You are a predictive workforce intelligence analyst for a Performance Management System.

Your mission is to surface hidden people risks before they become crises and recommend data-driven interventions.

Your capabilities:
1. **Early Burnout Detection**: Analyze workload patterns, engagement decline, overtime trends, and sentiment shifts to flag employees approaching burnout. Provide a burnout risk score (0-100) with contributing factors.
2. **Predictive Attrition Intervention**: Identify flight risks using performance trajectory, engagement drop-offs, peer departure patterns, and compensation benchmarks. Prescribe specific retention strategies per individual.
3. **Internal Talent Mobility**: Surface employees ready for lateral moves, stretch assignments, or cross-functional rotations. Match internal demand to supply.
4. **Leadership Pipeline Forecasting**: Assess succession readiness for key roles. Identify pipeline gaps where no viable internal successor exists within 12-18 months.
5. **Team Health Monitoring**: Track collaboration quality, workload balance, morale trends, and manager effectiveness across teams. Flag teams in distress.
6. **Flight Risk Retention Engine**: For flagged high-risk employees, generate personalized retention action plans with estimated impact and cost.

Analysis principles:
- Always quantify risk: use scores, percentages, and confidence levels.
- Segment insights by team/department when patterns differ.
- Prioritize: show the most urgent risks first, then emerging trends.
- For every risk surfaced, provide at least one actionable intervention.
- Use severity indicators: CRITICAL (red), WARNING (yellow), HEALTHY (green).
- Never speculate without data -- if signals are weak, say so explicitly.
- Respect privacy: aggregate individual data when reporting to leadership.`;

// ── Agent Class ─────────────────────────────────────────────

export class WorkforceIntelAgent extends BaseAgent {
  constructor() {
    super('workforce_intel', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch team health -- foundational for all workforce intelligence
    const teamHealth = await queryTeamHealth(context.tenantId, context.userId);
    data.teamHealth = teamHealth.data;

    // Always fetch workload distribution to detect imbalances
    const workload = await queryWorkloadDistribution(context.tenantId, context.userId);
    data.workloadDistribution = workload.data;

    // Burnout detection
    if (
      lower.includes('burnout') ||
      lower.includes('stress') ||
      lower.includes('overwork') ||
      lower.includes('exhaustion') ||
      lower.includes('wellness') ||
      lower.includes('workload') ||
      lower.includes('overtime')
    ) {
      const burnout = await queryBurnoutRisk(context.tenantId, {
        departmentId: context.userDepartment,
      });
      data.burnoutRisks = burnout.data;
    }

    // Attrition and flight risk
    if (
      lower.includes('attrition') ||
      lower.includes('flight') ||
      lower.includes('retention') ||
      lower.includes('leaving') ||
      lower.includes('turnover') ||
      lower.includes('resign') ||
      lower.includes('quit') ||
      lower.includes('churn')
    ) {
      const attrition = await queryAttritionRisk(context.tenantId, {
        departmentId: context.userDepartment,
      });
      data.attritionRisks = attrition.data;

      // For high-risk employees, get retention suggestions
      if (attrition.success && Array.isArray(attrition.data)) {
        const highRisk = (attrition.data as Array<{ userId: string; riskLevel: string }>)
          .filter((r) => r.riskLevel === 'critical' || r.riskLevel === 'high')
          .slice(0, 5);

        if (highRisk.length > 0) {
          const retentionPlans = await Promise.all(
            highRisk.map((r) =>
              suggestRetentionActions(context.tenantId, r.userId),
            ),
          );
          data.retentionPlans = retentionPlans.map((p) => p.data);
        }
      }
    }

    // Leadership pipeline and succession
    if (
      lower.includes('succession') ||
      lower.includes('pipeline') ||
      lower.includes('leadership') ||
      lower.includes('successor') ||
      lower.includes('bench') ||
      lower.includes('readiness')
    ) {
      const succession = await querySuccessionReadiness(context.tenantId);
      data.successionReadiness = succession.data;
    }

    // General risk overview -- broad queries get everything
    if (
      lower.includes('risk') ||
      lower.includes('overview') ||
      lower.includes('dashboard') ||
      lower.includes('summary') ||
      lower.includes('health')
    ) {
      const [burnout, attrition, succession] = await Promise.all([
        queryBurnoutRisk(context.tenantId, { departmentId: context.userDepartment }),
        queryAttritionRisk(context.tenantId, { departmentId: context.userDepartment }),
        querySuccessionReadiness(context.tenantId),
      ]);
      data.burnoutRisks = data.burnoutRisks ?? burnout.data;
      data.attritionRisks = data.attritionRisks ?? attrition.data;
      data.successionReadiness = data.successionReadiness ?? succession.data;
    }

    return data;
  }
}

// ── Singleton Export ─────────────────────────────────────────

export const workforceIntelAgent = new WorkforceIntelAgent();
