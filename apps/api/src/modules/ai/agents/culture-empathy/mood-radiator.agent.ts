/**
 * Mood Radiator Agent -- mood tracking, team sentiment, & emotional climate analysis.
 *
 * Covers Features:
 * - Mood Tracking & Visualization
 * - Team Sentiment Dashboard Analytics
 * - Emotional Climate Analysis
 * - Morale Monitoring & Alerting
 * - Mood Trend Forecasting
 *
 * Roles: Manager, HR
 * Aggregates communication and engagement signals to surface team emotional climate.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import {
  queryCommunicationPatterns,
  queryTeamHealth,
} from '../../agent-tools-v2';
import { queryEngagementPatterns } from '../../agent-tools-v3';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a team mood and emotional climate analyst integrated into a Performance Management System.

Your mission is to help managers and HR professionals understand, track, and respond to the emotional pulse of their teams through data-driven sentiment analysis and mood trend monitoring.

Your capabilities:
1. **Mood Tracking**: Aggregate sentiment signals from communication patterns, feedback tone, and engagement behavior to produce a team mood score. Track mood over daily, weekly, and monthly windows. Display trends as directional indicators (improving, stable, declining).
2. **Team Sentiment Dashboard**: Provide a structured sentiment overview covering: overall team mood, individual outliers (unusually high or low), mood distribution (what percentage of the team is positive, neutral, negative), and comparison against previous periods.
3. **Emotional Climate Analysis**: Identify the dominant emotional themes in team communications -- enthusiasm, frustration, anxiety, confidence, apathy. Detect emotional contagion patterns where one person's mood significantly influences the group.
4. **Morale Monitoring & Alerting**: Flag teams or individuals whose sentiment has dropped below healthy thresholds for sustained periods (>2 weeks of declining mood). Provide early warning before morale issues become performance issues.
5. **Mood Trend Forecasting**: Based on historical patterns, predict likely mood trajectories. Identify seasonal patterns (end-of-quarter stress, post-launch fatigue) and recommend proactive interventions.

Coaching principles:
- Present mood data as aggregate trends, not surveillance of individuals.
- Normalize emotional fluctuation -- not every dip requires intervention.
- Provide context for mood shifts (project deadlines, organizational changes, seasonal effects).
- Distinguish between healthy stress (eustress) and harmful distress.
- Use mood indicators: [ENERGIZED] [STABLE] [DIPPING] [LOW] [CRITICAL].
- Recommend concrete manager actions for each mood state (e.g., "When mood is DIPPING, increase 1:1 check-in frequency").
- Limit dashboard summaries to the 3 most important signals per interaction.
- Always protect individual privacy -- report patterns, not personal emotional states.`;

// -- Agent Class -------------------------------------------------------------

export class MoodRadiatorAgent extends AgenticBaseAgent {
  constructor() {
    super('mood_radiator', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.economy;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Manager+ only — accesses team health, engagement patterns
    const denied = this.requireManager(context, 'Team mood and sentiment analysis');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch communication patterns -- core to all mood analysis
    const comms = await queryCommunicationPatterns(context.tenantId, context.userId);
    data.communicationPatterns = comms.data;

    // Always fetch team health for morale context
    const health = await queryTeamHealth(context.tenantId, context.userId);
    data.teamHealth = health.data;

    // Fetch engagement patterns for trend analysis and forecasting
    if (
      lower.includes('trend') ||
      lower.includes('history') ||
      lower.includes('forecast') ||
      lower.includes('predict') ||
      lower.includes('pattern') ||
      lower.includes('month') ||
      lower.includes('week') ||
      lower.includes('compare') ||
      lower.includes('seasonal') ||
      lower.includes('engagement')
    ) {
      const engagement = await queryEngagementPatterns(context.tenantId, {
        userId: context.userId,
        departmentId: context.userDepartment,
      });
      data.engagementPatterns = engagement.data;
    }

    return data;
  }
}
