/**
 * Burnout-Interceptor Agent -- burnout early detection & work-life balance.
 *
 * Covers Features:
 * - Burnout Early Warning System
 * - Work-Life Balance Analysis
 * - Overwork Pattern Identification
 * - Recovery Planning
 * - Team-Wide Burnout Risk Assessment (Managers)
 *
 * Roles: Employee, Manager
 * Synthesizes burnout risk, workload distribution, attrition risk, and
 * communication patterns to detect and prevent burnout before it escalates.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import {
  queryBurnoutRisk,
  queryWorkloadDistribution,
  queryAttritionRisk,
  queryCommunicationPatterns,
} from '../../agent-tools-v2';
import { isManager } from '../../../../utils/roles';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a burnout prevention and work-life balance specialist integrated into a Performance Management System.

Your mission is to detect early burnout signals, analyze work-life balance, and provide intervention strategies before burnout becomes critical.

Your capabilities:
1. **Burnout Early Warning System**: Synthesize multiple data signals -- burnout risk scores, workload trends, communication pattern changes, and attrition risk -- to generate a composite burnout threat level: [GREEN] [YELLOW] [ORANGE] [RED].
2. **Work-Life Balance Analysis**: Assess the balance between work intensity and recovery signals. Identify periods of sustained overwork (>50 hrs/week patterns), weekend/holiday work, and insufficient recovery gaps between intense periods.
3. **Overwork Pattern Identification**: Detect chronic overwork patterns: consistently long sessions, increasing task counts, shrinking break intervals, and growing after-hours activity. Distinguish between temporary sprints and unsustainable patterns.
4. **Recovery Planning**: When burnout indicators are elevated, create personalized recovery plans: workload redistribution suggestions, mandatory break protocols, and gradual re-engagement schedules.
5. **Team-Wide Burnout Risk Assessment**: For managers, aggregate team-level burnout indicators to identify hot spots -- departments, teams, or roles with disproportionately high burnout signals.

Coaching principles:
- Reference specific, quantified indicators (e.g., "Burnout risk score: 7.2/10, up from 4.1 last month. Workload increased 35%, communication volume up 50%").
- Treat burnout as an organizational issue, not a personal failing.
- For [ORANGE] and [RED] levels, recommend concrete immediate actions and suggest escalation to HR/management.
- If attrition risk is also elevated alongside burnout, flag this correlation explicitly.
- Use empathetic, non-judgmental language.
- Provide both self-care strategies and systemic recommendations (workload changes, delegation, boundary-setting).
- For managers: frame team burnout data as an early leadership opportunity, not a failure indicator.
- Always recommend professional mental health support for severe cases.`;

// -- Agent Class -------------------------------------------------------------

export class BurnoutInterceptorAgent extends AgenticBaseAgent {
  constructor() {
    super('burnout_interceptor', SYSTEM_PROMPT);
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
    const managerAccess = isManager(context.userRoles);

    // Burnout risk — employees see own workload only, managers see dept-wide
    if (managerAccess) {
      const burnout = await queryBurnoutRisk(context.tenantId, {
        departmentId: context.userDepartment,
      });
      data.burnoutRisk = burnout.data;
    }

    // Workload distribution — scoped to own user
    const workload = await queryWorkloadDistribution(context.tenantId, context.userId);
    data.workloadDistribution = workload.data;

    // Attrition risk — manager+ only (dept-wide sensitive data)
    if (
      managerAccess && (
      lower.includes('quit') ||
      lower.includes('leave') ||
      lower.includes('resign') ||
      lower.includes('retention') ||
      lower.includes('attrition') ||
      lower.includes('turnover') ||
      lower.includes('severe') ||
      lower.includes('critical') ||
      lower.includes('team risk'))
    ) {
      const attrition = await queryAttritionRisk(context.tenantId, {
        departmentId: context.userDepartment,
      });
      data.attritionRisk = attrition.data;
    }

    // Communication patterns — scoped to own user
    if (
      lower.includes('communicat') ||
      lower.includes('isolat') ||
      lower.includes('withdraw') ||
      lower.includes('team') ||
      lower.includes('meeting') ||
      lower.includes('overload') ||
      lower.includes('disconnect') ||
      lower.includes('social')
    ) {
      const comms = await queryCommunicationPatterns(context.tenantId, context.userId);
      data.communicationPatterns = comms.data;
    }

    return data;
  }
}
