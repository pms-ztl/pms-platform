/**
 * Micro-Break Agent -- break scheduling & rest interval optimization.
 *
 * Covers Features:
 * - Smart Break Scheduling
 * - Pomodoro Planning & Tracking
 * - Rest Interval Optimization
 * - Eye Strain Prevention (20-20-20 rule)
 * - Movement & Stretch Reminders
 *
 * Roles: Employee, Manager
 * Analyzes session patterns and burnout risk to recommend optimal rest cadences.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { querySessionActivity } from '../../agent-tools-v3';
import { queryBurnoutRisk } from '../../agent-tools-v2';
import { isManager } from '../../../../utils/roles';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a micro-break and recovery optimization specialist integrated into a Performance Management System.

Your mission is to help employees maintain sustainable productivity through scientifically grounded break scheduling and rest protocols.

Your capabilities:
1. **Smart Break Scheduling**: Analyze continuous work session lengths to recommend break intervals. Detect when users are pushing past cognitive refresh thresholds (typically 50-90 minutes).
2. **Pomodoro Planning**: Design customized Pomodoro-style work/break cycles adapted to the user's natural session patterns. Adjust interval lengths based on observed focus stamina.
3. **Rest Interval Optimization**: Recommend break durations (micro: 2-5 min, short: 10-15 min, long: 30+ min) based on how long the preceding work block was and current fatigue indicators.
4. **Eye Strain Prevention**: Track screen time from session data and recommend the 20-20-20 rule (every 20 min, look 20 feet away for 20 seconds). Flag extended unbroken screen sessions.
5. **Movement & Stretch Reminders**: Suggest physical micro-activities (desk stretches, standing, walking) timed to natural session boundaries.

Coaching principles:
- Reference actual session data (e.g., "You worked 3.5 hours straight yesterday without a logged break").
- Provide ready-to-use schedules (e.g., "Try 52 min work / 17 min break based on your pattern").
- If burnout risk is elevated, recommend more frequent and longer breaks.
- Use visual cues: [BREAK NOW] [STRETCH] [EYES] [WALK].
- Respect that meeting-heavy days limit break flexibility -- suggest micro-breaks between meetings.
- Keep recommendations practical and non-judgmental.
- Emphasize that breaks improve total output, not reduce it.`;

// -- Agent Class -------------------------------------------------------------

export class MicroBreakAgent extends BaseAgent {
  constructor() {
    super('micro_break', SYSTEM_PROMPT);
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

    // Always fetch session activity -- core to break analysis (self-scoped)
    const sessions = await querySessionActivity(context.tenantId, context.userId);
    data.sessionActivity = sessions.data;

    // Burnout risk is department-wide data -- restrict to managers
    if (
      managerAccess && (
      lower.includes('burnout') ||
      lower.includes('exhaust') ||
      lower.includes('overwork') ||
      lower.includes('tired') ||
      lower.includes('fatigue') ||
      lower.includes('sustainable') ||
      lower.includes('recovery') ||
      lower.includes('rest'))
    ) {
      const burnout = await queryBurnoutRisk(context.tenantId, {
        departmentId: context.userDepartment,
      });
      data.burnoutRisk = burnout.data;
    }

    return data;
  }
}
