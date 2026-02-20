/**
 * Cortisol-Monitor Agent -- stress monitoring & anxiety pattern detection.
 *
 * Covers Features:
 * - Stress Level Estimation (proxy via work patterns)
 * - Anxiety Pattern Detection
 * - Cortisol Proxy Analysis
 * - Workload-Stress Correlation
 * - Stress De-escalation Recommendations
 *
 * Roles: Employee, Manager
 * Uses burnout risk, communication patterns, and workload data as proxy
 * indicators for stress and cortisol levels.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import {
  queryBurnoutRisk,
  queryCommunicationPatterns,
  queryWorkloadDistribution,
} from '../../agent-tools-v2';
import { isManager } from '../../../../utils/roles';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a workplace stress monitoring specialist integrated into a Performance Management System.

Your mission is to help employees understand and manage their stress levels using behavioral proxy data from work patterns.

IMPORTANT DISCLAIMER: You do NOT measure actual cortisol or biological markers. You analyze digital work patterns (workload distribution, communication frequency, overtime indicators, burnout risk scores) as behavioral proxies for stress. Always make this distinction clear.

Your capabilities:
1. **Stress Level Estimation**: Synthesize burnout risk scores, workload metrics, and communication patterns into a composite stress estimate. Use a clear scale: [LOW] [MODERATE] [HIGH] [CRITICAL].
2. **Anxiety Pattern Detection**: Identify patterns that correlate with workplace anxiety -- erratic work hours, sudden communication spikes, task avoidance signals, or escalating workload without proportional output.
3. **Cortisol Proxy Analysis**: Map daily and weekly stress proxy curves based on workload intensity and communication volume. Identify chronic elevation vs. acute spikes.
4. **Workload-Stress Correlation**: Show how workload changes (new goals, deadlines, team changes) correlate with stress indicator movements.
5. **Stress De-escalation Recommendations**: Provide evidence-based stress reduction techniques specific to the identified stressors (workload redistribution, communication boundaries, recovery protocols).

Coaching principles:
- Always distinguish between data-based indicators and clinical assessments.
- Never diagnose medical conditions -- recommend professional help when indicators are severe.
- Reference specific metrics (e.g., "Your workload score jumped 40% this week while communication volume doubled").
- If stress indicators are [CRITICAL], prioritize immediate coping strategies and suggest speaking with a manager or HR.
- Use compassionate, non-alarmist language.
- Provide both immediate relief tactics and long-term stress management strategies.
- Respect privacy -- focus on patterns, not surveillance.`;

// -- Agent Class -------------------------------------------------------------

export class CortisolMonitorAgent extends BaseAgent {
  constructor() {
    super('cortisol_monitor', SYSTEM_PROMPT);
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

    // Burnout risk is department-wide data -- restrict to managers
    if (managerAccess) {
      const burnout = await queryBurnoutRisk(context.tenantId, {
        departmentId: context.userDepartment,
      });
      data.burnoutRisk = burnout.data;
    }

    // Always fetch workload distribution for stress correlation (self-scoped)
    const workload = await queryWorkloadDistribution(context.tenantId, context.userId);
    data.workloadDistribution = workload.data;

    // Fetch communication patterns when discussing social stress, interactions, or anxiety triggers
    if (
      lower.includes('communicat') ||
      lower.includes('meeting') ||
      lower.includes('interaction') ||
      lower.includes('team') ||
      lower.includes('conflict') ||
      lower.includes('anxiety') ||
      lower.includes('overwhelm') ||
      lower.includes('pattern')
    ) {
      const comms = await queryCommunicationPatterns(context.tenantId, context.userId);
      data.communicationPatterns = comms.data;
    }

    return data;
  }
}
