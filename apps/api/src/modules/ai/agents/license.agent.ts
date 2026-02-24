/**
 * License Optimization Agent — proactive license management and predictions.
 *
 * Roles: Super Admin, Admin
 * Capabilities:
 * - Predictive license usage
 * - Archival recommendations (inactive 90+ days)
 * - Growth planning
 * - Revenue optimization (SA only)
 */

import { AgenticBaseAgent, type AgentContext } from '../agentic-base-agent';
import * as tools from '../agent-tools';
import { isAdmin } from '../../../utils/roles';
import { DAYS, INACTIVE_USER_THRESHOLD_DAYS } from '../../../utils/constants';

const SYSTEM_PROMPT = `You are a license and subscription optimization expert for a multi-tenant SaaS platform.

Your capabilities:
1. **License Usage Analysis**: Analyze current usage vs limits, identify trends
2. **Archival Recommendations**: Find inactive users (90+ days no login) that could be archived to free seats
3. **Growth Prediction**: Based on hiring trends, predict when licenses will run out
4. **Cost Optimization**: Suggest plan changes, bulk discounts, right-sizing

IMPORTANT: License and subscription data is restricted to Admin and Super Admin roles only.
If the user does not have admin access, politely inform them that license data requires admin privileges.

When answering (for admins):
- Always provide specific numbers and percentages
- Highlight urgent items (>90% usage) with warnings
- Suggest concrete actions with expected impact
- Format financial figures clearly
- Use emoji for status indicators (✅ ⚠️ 🔴 📊 💰)`;

export class LicenseAgent extends AgenticBaseAgent {
  constructor() {
    super('license', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    _userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: License data is admin-only
    if (!isAdmin(context.userRoles)) {
      return {
        accessDenied: true,
        message: 'License and subscription data is restricted to administrators. Please contact your admin for license information.',
      };
    }

    const [license, users, recentAudit] = await Promise.all([
      tools.queryLicenseUsage(context.tenantId),
      tools.queryUsers(context.tenantId, { limit: 100 }),
      tools.queryAuditEvents(context.tenantId, {
        action: 'USER_CREATED',
        since: new Date(Date.now() - DAYS(INACTIVE_USER_THRESHOLD_DAYS)),
        limit: 50,
      }),
    ]);

    // Find inactive users
    const allUsers = (users.data as Array<Record<string, unknown>>) ?? [];
    const ninetyDaysAgo = new Date(Date.now() - DAYS(INACTIVE_USER_THRESHOLD_DAYS));
    const inactiveUsers = allUsers.filter((u) => {
      const lastLogin = u.lastLoginAt as string | null;
      return u.isActive && (!lastLogin || new Date(lastLogin) < ninetyDaysAgo);
    });

    return {
      licenseUsage: license.data,
      totalEmployees: allUsers.length,
      inactiveUsers: inactiveUsers.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        lastLogin: u.lastLoginAt,
        level: u.level,
      })),
      recentHires: (recentAudit.data as unknown[])?.length ?? 0,
    };
  }
}
