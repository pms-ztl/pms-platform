/**
 * NLP Query Agent — answers natural language questions about PMS data.
 *
 * Roles: All users
 * Examples: "Who are my top performers?", "How many licenses left?", "Show me Q2 goals"
 */

import { AgenticBaseAgent, type AgentContext } from '../agentic-base-agent';
import * as tools from '../agent-tools';
import { isAdmin, isManager, isEmployeeOnly } from '../../../utils/roles';

const SYSTEM_PROMPT = `You are a smart data analyst for a Performance Management System (PMS).
Your job is to answer questions about employees, teams, goals, reviews, feedback, and analytics.

When answering:
- Use the provided data to give accurate, specific answers
- Include relevant numbers, percentages, and names
- If data is limited, acknowledge it and suggest how to get more detail
- Format lists and tables in markdown
- Be concise but thorough
- IMPORTANT: Always respect the user's access level. Only answer with data that was provided to you.`;

export class NLPQueryAgent extends AgenticBaseAgent {
  constructor() {
    super('nlp_query', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};
    const employeeOnly = isEmployeeOnly(context.userRoles);
    const adminAccess = isAdmin(context.userRoles);
    const managerAccess = isManager(context.userRoles);

    // ── Employee lists: managers+ can see team/all, employees see nothing ──
    if (lower.includes('employee') || lower.includes('user') || lower.includes('team') ||
        lower.includes('who') || lower.includes('people') || lower.includes('staff')) {
      if (managerAccess) {
        const users = await tools.queryUsers(context.tenantId, { limit: 50 });
        data.employees = users.data;
      }
      // Employees: no user listing provided — RBAC system prompt will instruct LLM to decline
    }

    // ── Goals: scoped to own for employees ──
    if (lower.includes('goal') || lower.includes('objective') || lower.includes('target') ||
        lower.includes('okr')) {
      const goals = await tools.queryGoals(context.tenantId, {
        userId: employeeOnly ? context.userId : undefined,
        limit: 50,
      });
      data.goals = goals.data;
    }

    // ── Reviews: scoped to own for employees ──
    if (lower.includes('review') || lower.includes('rating') || lower.includes('performance') ||
        lower.includes('performer')) {
      const reviews = await tools.queryReviews(context.tenantId, {
        userId: employeeOnly ? context.userId : undefined,
        limit: 50,
      });
      data.reviews = reviews.data;
    }

    // ── Feedback: scoped to own for employees ──
    if (lower.includes('feedback') || lower.includes('recognition')) {
      const feedback = await tools.queryFeedback(context.tenantId, {
        userId: employeeOnly ? context.userId : undefined,
        limit: 30,
      });
      data.feedback = feedback.data;
    }

    // ── License data: ADMIN ONLY ──
    if (lower.includes('license') || lower.includes('seat') || lower.includes('subscription') ||
        lower.includes('plan')) {
      if (adminAccess) {
        const license = await tools.queryLicenseUsage(context.tenantId);
        data.licenseUsage = license.data;
      }
      // Non-admins: no data provided — RBAC prompt will instruct LLM to decline
    }

    // ── Analytics: scoped by role ──
    if (lower.includes('analytics') || lower.includes('metric') || lower.includes('productivity') ||
        lower.includes('engagement')) {
      const analytics = await tools.queryAnalytics(context.tenantId, {
        userId: employeeOnly ? context.userId : undefined,
        limit: 30,
      });
      data.analytics = analytics.data;
    }

    // ── General fallback: role-scoped overview ──
    if (Object.keys(data).length === 0) {
      if (adminAccess) {
        // Admins get full overview
        const [users, goals, license] = await Promise.all([
          tools.queryUsers(context.tenantId, { isActive: true, limit: 10 }),
          tools.queryGoals(context.tenantId, { limit: 10 }),
          tools.queryLicenseUsage(context.tenantId),
        ]);
        data.employees = users.data;
        data.goals = goals.data;
        data.licenseUsage = license.data;
      } else if (managerAccess) {
        // Managers get team overview, no license
        const [users, goals] = await Promise.all([
          tools.queryUsers(context.tenantId, { isActive: true, limit: 10 }),
          tools.queryGoals(context.tenantId, { limit: 10 }),
        ]);
        data.employees = users.data;
        data.goals = goals.data;
      } else {
        // Employees get only their own data
        const goals = await tools.queryGoals(context.tenantId, {
          userId: context.userId,
          limit: 10,
        });
        data.myGoals = goals.data;
      }
    }

    return data;
  }

}
