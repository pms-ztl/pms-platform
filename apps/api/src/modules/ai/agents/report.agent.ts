/**
 * Report Generation Agent — generates comprehensive reports on-demand.
 *
 * Roles: All users (role-scoped data)
 * Capabilities:
 * - Team health reports (managers)
 * - Quarterly performance summaries (admins)
 * - Monthly business reviews (SA)
 * - Workforce forecast reports
 */

import { AgenticBaseAgent, type AgentContext } from '../agentic-base-agent';
import * as tools from '../agent-tools';
import { isAdmin, isManager, isEmployeeOnly } from '../../../utils/roles';
import { DAYS } from '../../../utils/constants';

const SYSTEM_PROMPT = `You are a business intelligence report generator for a Performance Management System.

Your capabilities:
1. **Team Health Reports**: Performance averages, goal completion rates, engagement scores
2. **Performance Summaries**: Top/bottom performers, trends, department comparisons
3. **Business Reviews**: Revenue, growth, churn indicators, license utilization
4. **Workforce Forecasts**: Hiring predictions, attrition risks, capacity planning
5. **Custom Reports**: Generate any report based on available data

Report formatting rules:
- Start with an Executive Summary (2-3 bullet points)
- Use sections with headers
- Include relevant metrics and KPIs
- Add trend indicators: ↑ up, ↓ down, → stable
- Use tables for comparisons
- End with Recommendations (actionable items)

IMPORTANT: Scope reports strictly by the user's role:
- Employee: Only their own personal performance summary — no team or company data
- Manager: Team health and their direct reports — no license/billing data
- Admin: Company-wide performance and license usage
- Super Admin: Platform-wide metrics and revenue`;

export class ReportAgent extends AgenticBaseAgent {
  constructor() {
    super('report', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const data: Record<string, unknown> = {};
    const employeeOnly = isEmployeeOnly(context.userRoles);
    const adminAccess = isAdmin(context.userRoles);
    const managerAccess = isManager(context.userRoles);

    // ── Admin: full company overview including license ──
    if (adminAccess) {
      const [license, users, goals, reviews, analytics, feedback] = await Promise.all([
        tools.queryLicenseUsage(context.tenantId),
        tools.queryUsers(context.tenantId, { limit: 100 }),
        tools.queryGoals(context.tenantId, { limit: 100 }),
        tools.queryReviews(context.tenantId, { limit: 50 }),
        tools.queryAnalytics(context.tenantId, { since: new Date(Date.now() - DAYS(30)), limit: 100 }),
        tools.queryFeedback(context.tenantId, { limit: 30 }),
      ]);
      data.companyOverview = license.data;
      data.employees = users.data;
      data.goals = goals.data;
      data.reviews = reviews.data;
      data.performanceMetrics = analytics.data;
      data.feedback = feedback.data;
    }
    // ── Manager: team-level data, no license ──
    else if (managerAccess) {
      const [users, goals, reviews, analytics, feedback] = await Promise.all([
        tools.queryUsers(context.tenantId, { limit: 100 }),
        tools.queryGoals(context.tenantId, { limit: 100 }),
        tools.queryReviews(context.tenantId, { limit: 50 }),
        tools.queryAnalytics(context.tenantId, { since: new Date(Date.now() - DAYS(30)), limit: 100 }),
        tools.queryFeedback(context.tenantId, { limit: 30 }),
      ]);
      data.employees = users.data;
      data.goals = goals.data;
      data.reviews = reviews.data;
      data.performanceMetrics = analytics.data;
      data.feedback = feedback.data;
    }
    // ── Employee: own data only ──
    else {
      const [goals, reviews, feedback] = await Promise.all([
        tools.queryGoals(context.tenantId, { userId: context.userId, limit: 20 }),
        tools.queryReviews(context.tenantId, { userId: context.userId, limit: 10 }),
        tools.queryFeedback(context.tenantId, { userId: context.userId, limit: 10 }),
      ]);
      data.myGoals = goals.data;
      data.myReviews = reviews.data;
      data.myFeedback = feedback.data;
    }

    return data;
  }
}
