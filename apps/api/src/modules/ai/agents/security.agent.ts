/**
 * Security Agent — anomaly detection and compliance monitoring.
 *
 * Roles: Super Admin, Admin
 * Capabilities:
 * - Anomaly detection in login patterns
 * - Cross-tenant access attempt analysis
 * - Suspicious bulk operation detection
 * - Compliance check summaries
 */

import { BaseAgent, type AgentContext } from '../base-agent';
import * as tools from '../agent-tools';
import { MS_PER_HOUR, MS_PER_DAY } from '../../../utils/constants';

const SYSTEM_PROMPT = `You are a security analyst for a multi-tenant SaaS platform.

Your capabilities:
1. **Threat Detection**: Analyze login failures, brute force attempts, unusual patterns
2. **Cross-Tenant Security**: Monitor for unauthorized cross-tenant access attempts
3. **Bulk Operation Monitoring**: Flag suspicious mass operations (bulk exports, deletions)
4. **Compliance Reporting**: Summarize compliance status and flag violations
5. **IP Analysis**: Review blocked IPs and suspicious origins

When reporting security events:
- Use severity levels: 🔴 Critical, 🟡 Warning, 🟢 Normal
- Include timestamps, IP addresses, and affected users (anonymized if needed)
- Provide actionable recommendations
- Quantify threat severity (e.g., "5 failed attempts in 10 minutes")
- Compare to baseline activity patterns

Always prioritize:
1. Active threats (ongoing attacks)
2. Policy violations (compliance)
3. Suspicious patterns (potential future threats)
4. Informational items (general monitoring)`;

export class SecurityAgent extends BaseAgent {
  constructor() {
    super('security', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const lower = userMessage.toLowerCase();
    const oneHourAgo = new Date(Date.now() - MS_PER_HOUR);
    const oneDayAgo = new Date(Date.now() - MS_PER_DAY);

    const data: Record<string, unknown> = {};

    // Failed logins
    const failedLogins = await tools.queryAuditEvents(context.tenantId, {
      action: 'LOGIN_FAILED',
      since: oneDayAgo,
      limit: 100,
    });
    data.failedLogins = failedLogins.data;

    // Cross-tenant attempts
    const crossTenant = await tools.queryAuditEvents(context.tenantId, {
      action: 'CROSS_TENANT_ACCESS_BLOCKED',
      since: oneDayAgo,
      limit: 50,
    });
    data.crossTenantAttempts = crossTenant.data;

    // Recent security events
    if (lower.includes('audit') || lower.includes('log') || lower.includes('event')) {
      const events = await tools.queryAuditEvents(context.tenantId, {
        since: oneDayAgo,
        limit: 100,
      });
      data.recentEvents = events.data;
    }

    // User activity
    if (lower.includes('user') || lower.includes('suspicious')) {
      const users = await tools.queryUsers(context.tenantId, { limit: 50 });
      data.users = users.data;
    }

    return data;
  }
}
