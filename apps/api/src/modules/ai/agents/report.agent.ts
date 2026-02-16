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

import { BaseAgent, type AgentContext } from '../base-agent';
import * as tools from '../agent-tools';
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

Report types by role:
- Employee: Personal performance summary
- Manager: Team health and individual reviews
- Admin: Company-wide performance and license usage
- Super Admin: Platform-wide metrics and revenue`;

export class ReportAgent extends BaseAgent {
  constructor() {
    super('report', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const data: Record<string, unknown> = {};

    // Always get license/company data
    const license = await tools.queryLicenseUsage(context.tenantId);
    data.companyOverview = license.data;

    // Get users
    const users = await tools.queryUsers(context.tenantId, { limit: 100 });
    data.employees = users.data;

    // Goals overview
    const goals = await tools.queryGoals(context.tenantId, { limit: 100 });
    data.goals = goals.data;

    // Reviews
    const reviews = await tools.queryReviews(context.tenantId, { limit: 50 });
    data.reviews = reviews.data;

    // Performance metrics
    const analytics = await tools.queryAnalytics(context.tenantId, {
      since: new Date(Date.now() - DAYS(30)),
      limit: 100,
    });
    data.performanceMetrics = analytics.data;

    // Feedback
    const feedback = await tools.queryFeedback(context.tenantId, { limit: 30 });
    data.feedback = feedback.data;

    return data;
  }
}
