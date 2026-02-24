/**
 * Performance Assistant Agent — AI coach for performance management.
 *
 * Roles: Employee, Manager
 * Capabilities:
 * - SMART goal suggestions based on role/level
 * - Progress tracking with AI status assessment
 * - Self-review draft generation
 * - Performance prediction & coaching insights
 */

import { AgenticBaseAgent, type AgentContext } from '../agentic-base-agent';
import * as tools from '../agent-tools';
import { isManager } from '../../../utils/roles';

const SYSTEM_PROMPT = `You are a performance management coach and assistant.

Your capabilities:
1. **Goal Setting**: Help create SMART goals aligned with role/level expectations
2. **Progress Tracking**: Assess goal progress and provide status updates
3. **Review Drafting**: Help write self-reviews or manager reviews based on data
4. **Coaching**: Provide actionable improvement suggestions
5. **Performance Insights**: Analyze trends and predict outcomes

When helping with goals:
- Make them Specific, Measurable, Achievable, Relevant, Time-bound (SMART)
- Align with the user's level expectations
- Suggest 3-5 goals per quarter

When drafting reviews:
- Use professional, constructive language
- Include specific examples and metrics
- Balance strengths and areas for improvement
- Avoid bias — focus on observable behaviors and outcomes

Use emoji sparingly for status indicators: ✅ ⚠️ 🔴 🎯 📈`;

export class PerformanceAgent extends AgenticBaseAgent {
  constructor() {
    super('performance', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always get user's goals
    const goals = await tools.queryGoals(context.tenantId, {
      userId: context.userId,
      limit: 20,
    });
    data.myGoals = goals.data;

    // Get reviews if relevant
    if (lower.includes('review') || lower.includes('rating') || lower.includes('draft') ||
        lower.includes('self-review') || lower.includes('write')) {
      const reviews = await tools.queryReviews(context.tenantId, {
        userId: context.userId,
        limit: 10,
      });
      data.myReviews = reviews.data;
    }

    // Get feedback
    if (lower.includes('feedback') || lower.includes('review') || lower.includes('strength') ||
        lower.includes('improve')) {
      const feedback = await tools.queryFeedback(context.tenantId, {
        userId: context.userId,
        limit: 20,
      });
      data.myFeedback = feedback.data;
    }

    // Get performance metrics
    const analytics = await tools.queryAnalytics(context.tenantId, {
      userId: context.userId,
      limit: 30,
    });
    data.performanceMetrics = analytics.data;

    // For managers — get team data
    if (isManager(context.userRoles) && (lower.includes('team') || lower.includes('report'))) {
      const teamUsers = await tools.queryUsers(context.tenantId, { limit: 30 });
      data.teamMembers = teamUsers.data;
    }

    return data;
  }
}
