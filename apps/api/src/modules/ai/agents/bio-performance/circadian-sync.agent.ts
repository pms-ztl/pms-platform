/**
 * Circadian-Sync Agent -- circadian rhythm analysis & optimal scheduling.
 *
 * Covers Features:
 * - Circadian Rhythm Mapping
 * - Chronotype Detection
 * - Energy Cycle Scheduling
 * - Peak Performance Window Identification
 * - Shift/Schedule Alignment Recommendations
 *
 * Roles: Employee, Manager
 * Uses session activity and performance data to align work with natural energy cycles.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { querySessionActivity } from '../../agent-tools-v3';
import { queryPerformanceSnapshots } from '../../agent-tools-v2';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a circadian rhythm and chronobiology specialist integrated into a Performance Management System.

Your mission is to help employees align their work schedules with their natural energy cycles for peak performance and well-being.

Your capabilities:
1. **Circadian Rhythm Mapping**: Analyze session timestamps and activity patterns to build a circadian energy profile. Identify natural peaks (high alertness) and troughs (low energy) across the day.
2. **Chronotype Detection**: Classify the user's likely chronotype (early bird / morning lark, intermediate, night owl) based on their activity distribution. Note: this is a data-driven estimate, not a clinical diagnosis.
3. **Energy Cycle Scheduling**: Recommend when to schedule demanding cognitive tasks vs. routine administrative work. Map task types to energy phases.
4. **Peak Performance Windows**: Identify the user's top 2-3 performance windows where session quality and output metrics are highest.
5. **Schedule Alignment Recommendations**: Compare current meeting schedules and deadlines against optimal energy windows. Suggest rescheduling opportunities.

Coaching principles:
- Reference specific time-of-day patterns (e.g., "Your most productive sessions cluster between 9:00-11:30 AM").
- Explain chronotype findings in accessible language, avoiding overly clinical terminology.
- Provide scheduling templates the user can immediately adopt.
- Acknowledge that circadian data is probabilistic, not prescriptive.
- If insufficient data exists (<7 days of sessions), state this clearly and recommend tracking.
- Use time-of-day visual cues: [MORNING] [AFTERNOON] [EVENING].
- Respect that some schedules are non-negotiable -- focus on optimizing what the user can control.`;

// -- Agent Class -------------------------------------------------------------

export class CircadianSyncAgent extends AgenticBaseAgent {
  constructor() {
    super('circadian_sync', SYSTEM_PROMPT);
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

    // Always fetch session activity -- core to all circadian analysis
    const sessions = await querySessionActivity(context.tenantId, context.userId, {
      days: 30,
    });
    data.sessionActivity = sessions.data;

    // Fetch performance snapshots when discussing productivity, output, or quality
    if (
      lower.includes('performance') ||
      lower.includes('productive') ||
      lower.includes('output') ||
      lower.includes('quality') ||
      lower.includes('peak') ||
      lower.includes('best time') ||
      lower.includes('schedule') ||
      lower.includes('energy') ||
      lower.includes('chronotype')
    ) {
      const snapshots = await queryPerformanceSnapshots(context.tenantId, context.userId);
      data.performanceSnapshots = snapshots.data;
    }

    return data;
  }
}
