/**
 * Nano Payment Agent -- micro-recognition & spot bonus recommendation engine.
 *
 * Covers Features:
 * - Micro-Recognition Analysis
 * - Spot Bonus Recommendations
 * - Peer-to-Peer Recognition Patterns
 * - Recognition Frequency Optimization
 * - Gratitude Economy Insights
 *
 * Roles: Manager, HR, Employee
 * Analyzes recognition patterns and recommends timely micro-rewards for sustained engagement.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { queryFeedback } from '../../agent-tools';
import {
  queryPerformanceSnapshots,
} from '../../agent-tools-v2';
import { queryEngagementPatterns } from '../../agent-tools-v3';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a micro-recognition and nano-payment specialist integrated into a Performance Management System.

Your mission is to optimize the organization's recognition culture by analyzing peer feedback patterns, identifying recognition gaps, and recommending timely spot bonuses and micro-rewards that reinforce high-performance behaviors.

Your capabilities:
1. **Micro-Recognition Analysis**: Analyze feedback frequency, sentiment, and distribution across teams. Identify who is being recognized, who is being overlooked, and which behaviors are most valued.
2. **Spot Bonus Recommendations**: Based on performance snapshots and recent achievements, recommend specific employees for spot bonuses with justification tied to measurable impact (e.g., "Completed 3 critical deliverables ahead of schedule").
3. **Peer-to-Peer Recognition Patterns**: Map the recognition network -- who recognizes whom, how often, and for what. Detect cliques, isolated individuals, and recognition deserts.
4. **Recognition Frequency Optimization**: Analyze whether recognition cadence is healthy (weekly/biweekly) or sparse. Recommend optimal recognition rhythms per team size.
5. **Gratitude Economy Insights**: Track the ratio of recognition given vs. received per employee. Identify "givers" who rarely receive and "receivers" who rarely give back.

Recommendation principles:
- Tie every bonus recommendation to specific, observable contributions -- never generic praise.
- Flag employees with strong performance but zero recent recognition (recognition debt).
- Recommend recognition amounts proportional to impact: micro ($10-25), small ($25-75), medium ($75-200).
- Detect recognition bias: are certain demographics, levels, or departments systematically under-recognized?
- Use indicators: [RECOGNITION GAP] [SPOT BONUS] [TOP GIVER] [OVERLOOKED].
- Cap spot bonus recommendations at the organization's budget norms.
- Encourage distributed recognition: avoid concentrating rewards on a few star performers.`;

// -- Agent Class -------------------------------------------------------------

export class NanoPaymentAgent extends AgenticBaseAgent {
  constructor() {
    super('nano_payment', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.economy;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Manager+ only — accesses cross-org recognition data
    const denied = this.requireManager(context, 'Micro-recognition and reward analytics');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch feedback -- core to all recognition analysis
    const feedback = await queryFeedback(context.tenantId, {
      userId: context.userId,
    });
    data.feedbackHistory = feedback.data;

    // Always fetch engagement patterns for recognition cadence analysis
    const engagement = await queryEngagementPatterns(context.tenantId, {
      userId: context.userId,
      departmentId: context.userDepartment,
    });
    data.engagementPatterns = engagement.data;

    // Fetch performance snapshots when discussing bonuses or achievements
    if (
      lower.includes('bonus') ||
      lower.includes('reward') ||
      lower.includes('achievement') ||
      lower.includes('perform') ||
      lower.includes('impact') ||
      lower.includes('deliver') ||
      lower.includes('contribut') ||
      lower.includes('spot')
    ) {
      const snapshots = await queryPerformanceSnapshots(context.tenantId, context.userId);
      data.performanceSnapshots = snapshots.data;
    }

    // Broader feedback analysis for team-level recognition patterns
    if (
      lower.includes('team') ||
      lower.includes('pattern') ||
      lower.includes('peer') ||
      lower.includes('network') ||
      lower.includes('who') ||
      lower.includes('distribution') ||
      lower.includes('gap') ||
      lower.includes('overlooked')
    ) {
      const teamFeedback = await queryFeedback(context.tenantId, {});
      data.teamFeedback = teamFeedback.data;
    }

    return data;
  }
}
