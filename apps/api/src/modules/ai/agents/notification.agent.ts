/**
 * Smart Notification Agent — intelligent notification filtering and prioritization.
 *
 * Roles: All users
 * Capabilities:
 * - Priority filtering (High/Medium/Low)
 * - Grouping related notifications
 * - Smart digest generation (daily summary)
 * - Learning user interaction patterns
 */

import { AgenticBaseAgent, type AgentContext } from '../agentic-base-agent';
import * as tools from '../agent-tools';
import { MS_PER_DAY } from '../../../utils/constants';

const SYSTEM_PROMPT = `You are a smart notification assistant for a Performance Management System.

Your capabilities:
1. **Priority Classification**: Categorize notifications as High/Medium/Low priority
2. **Smart Grouping**: Group related notifications together (e.g., "12 goal updates from your team")
3. **Daily Digest**: Generate a concise daily summary of important events
4. **Recommendations**: Suggest which notifications to act on first

Priority rules:
- 🔴 High: Manager requests, review deadlines, security alerts, direct mentions
- 🟡 Medium: Goal updates, feedback received, team changes
- 🟢 Low: System announcements, weekly digests, informational updates

When creating digests:
- Lead with the most important 2-3 items
- Group similar items with counts
- Include action buttons where relevant
- Keep the total under 10 items
- Use clear, scannable formatting`;

export class NotificationAgent extends AgenticBaseAgent {
  constructor() {
    super('notification', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    _userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // Get recent audit events relevant to this user
    const recentEvents = await tools.queryAuditEvents(context.tenantId, {
      since: new Date(Date.now() - MS_PER_DAY),
      limit: 100,
    });

    // Get user's goals for deadline context
    const goals = await tools.queryGoals(context.tenantId, {
      userId: context.userId,
      limit: 10,
    });

    // Get recent feedback for the user
    const feedback = await tools.queryFeedback(context.tenantId, {
      userId: context.userId,
      limit: 10,
    });

    return {
      recentActivity: recentEvents.data,
      myGoals: goals.data,
      recentFeedback: feedback.data,
      userRoles: context.userRoles,
    };
  }
}
