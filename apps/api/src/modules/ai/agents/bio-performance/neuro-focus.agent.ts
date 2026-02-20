/**
 * Neuro-Focus Agent -- cognitive focus optimization & deep work planning.
 *
 * Covers Features:
 * - Focus Session Optimization
 * - Attention Span Analysis
 * - Deep Work Block Planning
 * - Cognitive Load Management
 * - Distraction Pattern Detection
 *
 * Roles: Employee, Manager
 * Analyzes session activity and performance data to maximize productive focus time.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { querySessionActivity } from '../../agent-tools-v3';
import {
  queryPerformanceSnapshots,
  queryBurnoutRisk,
} from '../../agent-tools-v2';
import { isManager } from '../../../../utils/roles';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a neuro-focus optimization specialist integrated into a Performance Management System.

Your mission is to help employees maximize their cognitive focus, plan deep work sessions, and manage mental load using real session data.

Your capabilities:
1. **Focus Session Optimization**: Analyze session activity to identify the user's peak focus windows, average session lengths, and patterns of productive vs. fragmented work.
2. **Attention Span Analysis**: Detect trends in how long the user sustains focused activity before context-switching. Track improvement or degradation over time.
3. **Deep Work Block Planning**: Recommend optimal time blocks for deep work based on historical session patterns. Suggest calendar-friendly schedules (e.g., "90-min blocks at 9:00 AM, 2:30 PM").
4. **Cognitive Load Management**: Assess current workload intensity from performance snapshots and burnout risk indicators. Flag when cognitive load exceeds sustainable thresholds.
5. **Distraction Pattern Detection**: Identify recurring interruption patterns — time-of-day, day-of-week, and session fragmentation signals.

Coaching principles:
- Reference specific session metrics (e.g., "Your average focused session this week was 47 minutes, down from 62 minutes last week").
- Recommend evidence-based focus techniques (Pomodoro, time-boxing, attention residue mitigation).
- Provide a maximum of 3 actionable recommendations per interaction.
- Use visual indicators where helpful: [FOCUS] [WARNING] [OPTIMAL].
- If burnout risk is elevated, prioritize recovery over productivity.
- Tailor deep work recommendations to the user's role and department context.`;

// -- Agent Class -------------------------------------------------------------

export class NeuroFocusAgent extends BaseAgent {
  constructor() {
    super('neuro_focus', SYSTEM_PROMPT);
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

    // Always fetch session activity -- core to all focus analysis (self-scoped)
    const sessions = await querySessionActivity(context.tenantId, context.userId);
    data.sessionActivity = sessions.data;

    // Always fetch performance snapshots for cognitive load assessment (self-scoped)
    const snapshots = await queryPerformanceSnapshots(context.tenantId, context.userId);
    data.performanceSnapshots = snapshots.data;

    // Burnout risk is department-wide data -- restrict to managers
    if (
      managerAccess && (
      lower.includes('burnout') ||
      lower.includes('overload') ||
      lower.includes('fatigue') ||
      lower.includes('exhaust') ||
      lower.includes('tired') ||
      lower.includes('strain') ||
      lower.includes('stress') ||
      lower.includes('cognitive load'))
    ) {
      const burnout = await queryBurnoutRisk(context.tenantId, {
        departmentId: context.userDepartment,
      });
      data.burnoutRisk = burnout.data;
    }

    return data;
  }
}
