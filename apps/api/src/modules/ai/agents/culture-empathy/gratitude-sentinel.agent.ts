/**
 * Gratitude Sentinel Agent -- gratitude tracking & recognition pattern analysis.
 *
 * Covers Features:
 * - Gratitude & Appreciation Tracking
 * - Recognition Pattern Analytics
 * - Praise Distribution Fairness
 * - Gratitude Frequency Monitoring
 * - Recognition Gap Identification
 *
 * Roles: Manager, HR, Employee
 * Monitors recognition behaviors to ensure appreciation is consistent and equitable.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { queryFeedback } from '../../agent-tools';
import { queryEngagementPatterns } from '../../agent-tools-v3';
import { queryCommunicationPatterns } from '../../agent-tools-v2';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a gratitude and recognition analytics specialist integrated into a Performance Management System.

Your mission is to track appreciation patterns, ensure recognition is equitably distributed, and help leaders build a culture of consistent, meaningful gratitude.

Your capabilities:
1. **Gratitude Tracking**: Monitor positive feedback frequency, peer recognition events, and manager appreciation messages. Track gratitude volume over time and compare against organizational benchmarks.
2. **Recognition Pattern Analytics**: Identify who gives recognition most often, who receives it, and whether certain individuals or teams are systematically overlooked. Surface "recognition deserts" -- people or groups receiving disproportionately little praise.
3. **Praise Distribution Fairness**: Analyze whether recognition is equitably distributed across departments, levels, genders, and tenure bands. Flag skewed patterns (e.g., senior staff receiving 3x more praise than junior contributors).
4. **Gratitude Frequency Monitoring**: Track the cadence of recognition (daily, weekly, monthly) and alert when gratitude activity drops below healthy thresholds for a team or individual.
5. **Recognition Gap Identification**: Detect employees who consistently deliver strong results but receive minimal recognition. Recommend specific, timely recognition actions for managers.

Coaching principles:
- Celebrate what is working well before highlighting gaps.
- Provide specific data (e.g., "Team Alpha received 23 recognitions this month vs. 6 for Team Beta").
- Recommend concrete recognition actions, not abstract advice.
- Distinguish between formal recognition (awards, bonuses) and informal recognition (thank-you messages, shout-outs).
- Use indicators: [THRIVING] [HEALTHY] [AT RISK] [RECOGNITION DESERT].
- Suggest 2-3 quick-win recognition actions per interaction.
- Remind leaders that timely, specific recognition is more impactful than delayed, generic praise.`;

// -- Agent Class -------------------------------------------------------------

export class GratitudeSentinelAgent extends BaseAgent {
  constructor() {
    super('gratitude_sentinel', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.economy;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Manager+ only — accesses team-wide feedback
    const denied = this.requireManager(context, 'Team gratitude and recognition analytics');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch feedback -- core to all gratitude analysis
    const feedback = await queryFeedback(context.tenantId, {
      userId: context.userId,
      limit: 50,
    });
    data.feedback = feedback.data;

    // Fetch engagement patterns for recognition frequency and trends
    if (
      lower.includes('trend') ||
      lower.includes('frequency') ||
      lower.includes('pattern') ||
      lower.includes('engagement') ||
      lower.includes('cadence') ||
      lower.includes('month') ||
      lower.includes('week') ||
      lower.includes('drop')
    ) {
      const engagement = await queryEngagementPatterns(context.tenantId, {
        userId: context.userId,
        departmentId: context.userDepartment,
      });
      data.engagementPatterns = engagement.data;
    }

    // Fetch communication patterns for sentiment and praise distribution
    if (
      lower.includes('distribution') ||
      lower.includes('fairness') ||
      lower.includes('equity') ||
      lower.includes('team') ||
      lower.includes('department') ||
      lower.includes('who') ||
      lower.includes('gap') ||
      lower.includes('desert')
    ) {
      const comms = await queryCommunicationPatterns(context.tenantId, context.userId);
      data.communicationPatterns = comms.data;
    }

    return data;
  }
}
