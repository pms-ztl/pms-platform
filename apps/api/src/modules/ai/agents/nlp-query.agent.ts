/**
 * NLP Query Agent — answers natural language questions about PMS data.
 *
 * Roles: All users
 * Examples: "Who are my top performers?", "How many licenses left?", "Show me Q2 goals"
 */

import { BaseAgent, type AgentContext } from '../base-agent';
import * as tools from '../agent-tools';
import { isEmployeeOnly } from '../../../utils/roles';

const SYSTEM_PROMPT = `You are a smart data analyst for a Performance Management System (PMS).
Your job is to answer questions about employees, teams, goals, reviews, feedback, and analytics.

When answering:
- Use the provided data to give accurate, specific answers
- Include relevant numbers, percentages, and names
- If data is limited, acknowledge it and suggest how to get more detail
- Format lists and tables in markdown
- Be concise but thorough`;

export class NLPQueryAgent extends BaseAgent {
  constructor() {
    super('nlp_query', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Determine what data to fetch based on the question
    if (lower.includes('employee') || lower.includes('user') || lower.includes('team') ||
        lower.includes('who') || lower.includes('people') || lower.includes('staff')) {
      const users = await tools.queryUsers(context.tenantId, { limit: 50 });
      data.employees = users.data;
    }

    if (lower.includes('goal') || lower.includes('objective') || lower.includes('target') ||
        lower.includes('okr')) {
      const goals = await tools.queryGoals(context.tenantId, {
        userId: isEmployeeOnly(context.userRoles) ? context.userId : undefined,
        limit: 50,
      });
      data.goals = goals.data;
    }

    if (lower.includes('review') || lower.includes('rating') || lower.includes('performance') ||
        lower.includes('performer')) {
      const reviews = await tools.queryReviews(context.tenantId, {
        userId: isEmployeeOnly(context.userRoles) ? context.userId : undefined,
        limit: 50,
      });
      data.reviews = reviews.data;
    }

    if (lower.includes('feedback') || lower.includes('recognition')) {
      const feedback = await tools.queryFeedback(context.tenantId, {
        userId: isEmployeeOnly(context.userRoles) ? context.userId : undefined,
        limit: 30,
      });
      data.feedback = feedback.data;
    }

    if (lower.includes('license') || lower.includes('seat') || lower.includes('subscription') ||
        lower.includes('plan')) {
      const license = await tools.queryLicenseUsage(context.tenantId);
      data.licenseUsage = license.data;
    }

    if (lower.includes('analytics') || lower.includes('metric') || lower.includes('productivity') ||
        lower.includes('engagement')) {
      const analytics = await tools.queryAnalytics(context.tenantId, {
        userId: isEmployeeOnly(context.userRoles) ? context.userId : undefined,
        limit: 30,
      });
      data.analytics = analytics.data;
    }

    // If no specific category detected, provide a general overview
    if (Object.keys(data).length === 0) {
      const [users, goals, license] = await Promise.all([
        tools.queryUsers(context.tenantId, { isActive: true, limit: 10 }),
        tools.queryGoals(context.tenantId, { limit: 10 }),
        tools.queryLicenseUsage(context.tenantId),
      ]);
      data.employees = users.data;
      data.goals = goals.data;
      data.licenseUsage = license.data;
    }

    return data;
  }

}
