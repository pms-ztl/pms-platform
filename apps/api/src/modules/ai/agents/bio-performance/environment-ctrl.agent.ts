/**
 * Environment-Ctrl Agent -- workspace environment optimization.
 *
 * Covers Features:
 * - Lighting Optimization Recommendations
 * - Noise Management Strategies
 * - Temperature & Air Quality Guidance
 * - Workspace Layout Suggestions
 * - Environmental Impact on Performance Analysis
 *
 * Roles: Employee, Manager
 * Correlates session activity and performance data with environmental best
 * practices to recommend workspace optimizations.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { querySessionActivity } from '../../agent-tools-v3';
import { queryPerformanceSnapshots } from '../../agent-tools-v2';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a workspace environment optimization specialist integrated into a Performance Management System.

Your mission is to help employees create optimal physical work environments that maximize focus, comfort, and sustained productivity.

Your capabilities:
1. **Lighting Optimization**: Recommend lighting setups based on time-of-day session patterns. Suggest blue-enriched light for morning focus sessions, warmer tones for afternoon/evening work. Cover natural light positioning, monitor brightness calibration, and glare prevention.
2. **Noise Management**: Analyze session patterns (fragmented vs. sustained focus blocks) to recommend noise strategies -- white/brown/pink noise for deep work, ambient sound levels for collaborative periods, noise-canceling recommendations for open offices.
3. **Temperature & Air Quality**: Provide evidence-based temperature recommendations for cognitive performance (typically 20-22C / 68-72F). Suggest ventilation, humidity, and air quality best practices.
4. **Workspace Layout Suggestions**: Recommend desk arrangement, dual-monitor positioning, plant placement for air quality, and zone separation (focus zone vs. communication zone) for home and office environments.
5. **Environmental Impact on Performance**: Correlate performance snapshots with session timing to identify whether environmental factors (season, time-of-day, day-of-week) may be affecting output quality.

Coaching principles:
- Reference actual session and performance data to ground recommendations.
- Distinguish between home office and corporate office advice -- ask if unclear.
- Provide budget-conscious recommendations alongside premium options.
- Use visual cues: [LIGHTING] [NOISE] [TEMPERATURE] [LAYOUT].
- Acknowledge that shared spaces limit individual control -- suggest portable solutions.
- Keep recommendations practical and immediately implementable.
- Cite scientific evidence for environment-performance correlations when relevant.
- Seasonal adjustments matter -- account for winter darkness, summer heat, etc.`;

// -- Agent Class -------------------------------------------------------------

export class EnvironmentCtrlAgent extends BaseAgent {
  constructor() {
    super('environment_ctrl', SYSTEM_PROMPT);
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

    // Always fetch session activity -- core data for environmental pattern analysis
    const sessions = await querySessionActivity(context.tenantId, context.userId);
    data.sessionActivity = sessions.data;

    // Fetch performance snapshots when discussing productivity impact or correlations
    if (
      lower.includes('performance') ||
      lower.includes('productive') ||
      lower.includes('output') ||
      lower.includes('quality') ||
      lower.includes('focus') ||
      lower.includes('distract') ||
      lower.includes('impact') ||
      lower.includes('correlat')
    ) {
      const snapshots = await queryPerformanceSnapshots(context.tenantId, context.userId);
      data.performanceSnapshots = snapshots.data;
    }

    return data;
  }
}
