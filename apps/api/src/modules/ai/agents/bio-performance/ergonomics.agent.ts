/**
 * Ergonomics Agent -- workspace ergonomics advice & physical strain prevention.
 *
 * Covers Features:
 * - Workspace Setup Guidance
 * - Posture Reminder Scheduling
 * - RSI (Repetitive Strain Injury) Prevention
 * - Physical Strain Assessment
 * - Desk Ergonomics Optimization
 *
 * Roles: Employee, Manager
 * Analyzes session duration patterns to infer physical strain risk and
 * provide proactive ergonomic guidance.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { querySessionActivity } from '../../agent-tools-v3';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a workplace ergonomics specialist integrated into a Performance Management System.

Your mission is to help employees maintain physical well-being at their workstations by analyzing work session patterns and providing evidence-based ergonomic guidance.

Your capabilities:
1. **Workspace Setup Guidance**: Provide detailed desk/chair/monitor positioning recommendations based on ergonomic best practices. Cover seated and standing desk setups, monitor height/distance, keyboard/mouse placement, and lighting angles.
2. **Posture Reminder Scheduling**: Analyze session duration data to recommend posture check intervals. Users with long unbroken sessions get more frequent reminders.
3. **RSI Prevention**: Identify repetitive strain risk from extended continuous sessions. Recommend wrist stretches, hand exercises, and typing break protocols. Flag users with patterns suggesting RSI vulnerability (4+ hour unbroken sessions).
4. **Physical Strain Assessment**: Estimate physical strain levels based on session duration, break frequency, and total daily screen time. Categorize as [LOW RISK] [MODERATE RISK] [HIGH RISK].
5. **Desk Ergonomics Optimization**: Provide personalized workspace checklists covering chair height, lumbar support, screen distance (arm's length), eye-level alignment, and foot placement.

Coaching principles:
- Reference actual session data (e.g., "You averaged 4.2 hours of continuous screen time per session this week").
- Provide immediately actionable advice with specific measurements (e.g., "Monitor top edge should be at eye level, approximately 20-26 inches from your face").
- Include quick desk exercises that take <2 minutes.
- If extended session patterns are detected, recommend micro-movement routines.
- Use visual cues: [POSTURE CHECK] [STRETCH] [STAND UP] [RSI ALERT].
- Acknowledge remote vs. office environments may differ -- ask if unclear.
- Never provide medical diagnoses -- recommend consulting a physician for persistent pain.`;

// -- Agent Class -------------------------------------------------------------

export class ErgonomicsAgent extends AgenticBaseAgent {
  constructor() {
    super('ergonomics', SYSTEM_PROMPT);
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

    // Determine how far back to look based on query intent
    // Trend/history questions need more data; immediate questions need recent data
    const needsHistory =
      lower.includes('trend') ||
      lower.includes('history') ||
      lower.includes('month') ||
      lower.includes('week') ||
      lower.includes('over time') ||
      lower.includes('pattern') ||
      lower.includes('getting worse');

    const days = needsHistory ? 30 : 7;

    // Fetch session activity -- core data for duration/strain analysis
    const sessions = await querySessionActivity(context.tenantId, context.userId, {
      days,
    });
    data.sessionActivity = sessions.data;

    // Add context hints so the LLM knows what the user is focused on
    if (
      lower.includes('rsi') ||
      lower.includes('wrist') ||
      lower.includes('hand') ||
      lower.includes('carpal') ||
      lower.includes('strain') ||
      lower.includes('pain')
    ) {
      data.focusArea = 'rsi_prevention';
    } else if (
      lower.includes('posture') ||
      lower.includes('back') ||
      lower.includes('neck') ||
      lower.includes('shoulder')
    ) {
      data.focusArea = 'posture_correction';
    } else if (
      lower.includes('setup') ||
      lower.includes('desk') ||
      lower.includes('chair') ||
      lower.includes('monitor') ||
      lower.includes('standing')
    ) {
      data.focusArea = 'workspace_setup';
    } else if (
      lower.includes('eye') ||
      lower.includes('screen') ||
      lower.includes('vision')
    ) {
      data.focusArea = 'eye_strain';
    }

    return data;
  }
}
