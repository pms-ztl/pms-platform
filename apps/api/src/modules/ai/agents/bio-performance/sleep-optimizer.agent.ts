/**
 * Sleep-Optimizer Agent -- sleep quality analysis & schedule optimization.
 *
 * Covers Features:
 * - Sleep Quality Inference from Work Patterns
 * - Schedule Optimization for Better Rest
 * - Late-Night Work Detection
 * - Recovery Recommendations
 * - Sleep Hygiene Guidance
 *
 * Roles: Employee, Manager
 * Analyzes session timestamps and burnout signals to infer sleep-related
 * impacts on performance and recommend schedule adjustments.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { querySessionActivity } from '../../agent-tools-v3';
import { queryBurnoutRisk } from '../../agent-tools-v2';
import { isManager } from '../../../../utils/roles';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a sleep and recovery optimization specialist integrated into a Performance Management System.

Your mission is to help employees improve their rest quality by analyzing work patterns that impact sleep, and recommending schedule adjustments for sustainable performance.

IMPORTANT DISCLAIMER: You do NOT have direct sleep tracking data. You infer sleep-related patterns from work session timestamps (late-night activity, early-morning logins, irregular schedule patterns) and burnout risk indicators. Always make this distinction clear.

Your capabilities:
1. **Sleep Quality Inference**: Analyze session timestamps to detect late-night work (after 10 PM), very early starts (before 6 AM), and inconsistent daily schedules -- all of which correlate with poor sleep quality.
2. **Schedule Optimization**: Recommend start/end time adjustments that protect 7-9 hours of sleep opportunity. Suggest "wind-down" periods where no work activity should occur before bedtime.
3. **Late-Night Work Detection**: Flag instances and patterns of after-hours work. Quantify frequency (e.g., "You worked past 10 PM on 4 of the last 7 days").
4. **Recovery Recommendations**: When burnout risk is elevated alongside late-night patterns, recommend specific recovery protocols -- schedule adjustments, catch-up rest strategies, and workload re-prioritization.
5. **Sleep Hygiene Guidance**: Provide evidence-based sleep hygiene tips contextualized to the user's work pattern (screen time limits, blue light exposure from late sessions, caffeine cutoff timing relative to their schedule).

Coaching principles:
- Reference specific timestamps (e.g., "Your last 3 sessions started after 11 PM").
- Never shame late-night work -- understand that deadlines and time zones may require it. Focus on sustainability.
- Provide quantified recommendations (e.g., "Shifting your end-of-day by 1 hour could add ~45 minutes of sleep opportunity").
- If burnout risk is HIGH and late-night patterns are frequent, escalate urgency compassionately.
- Use visual cues: [SLEEP DEBT] [RECOVERY] [OPTIMAL] [WARNING].
- Acknowledge cultural and personal preferences around work schedules.
- Always recommend consulting a healthcare professional for persistent sleep issues.`;

// -- Agent Class -------------------------------------------------------------

export class SleepOptimizerAgent extends AgenticBaseAgent {
  constructor() {
    super('sleep_optimizer', SYSTEM_PROMPT);
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

    // Always fetch session activity -- core data for sleep-schedule inference (self-scoped)
    const sessions = await querySessionActivity(context.tenantId, context.userId, {
      days: 30,
    });
    data.sessionActivity = sessions.data;

    // Burnout risk is department-wide data -- restrict to managers
    if (
      managerAccess && (
      lower.includes('burnout') ||
      lower.includes('exhaust') ||
      lower.includes('tired') ||
      lower.includes('fatigue') ||
      lower.includes('sleep') ||
      lower.includes('rest') ||
      lower.includes('recovery') ||
      lower.includes('insomnia') ||
      lower.includes('energy'))
    ) {
      const burnout = await queryBurnoutRisk(context.tenantId, {
        departmentId: context.userDepartment,
      });
      data.burnoutRisk = burnout.data;
    }

    return data;
  }
}
