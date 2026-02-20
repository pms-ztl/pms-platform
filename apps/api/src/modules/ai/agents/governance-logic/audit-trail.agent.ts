/**
 * Audit Trail Agent -- audit log analysis, activity tracking, and compliance documentation.
 *
 * Covers Features:
 * - Audit Log Analysis & Reporting
 * - Activity Tracking & Timelines
 * - Compliance Documentation Review
 * - Record Keeping & Integrity Checks
 * - Anomaly Detection in Audit Logs
 *
 * Roles: Admin, Compliance Officer, HR
 * Uses audit events and compliance status to analyze organizational activity trails.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { queryAuditEvents } from '../../agent-tools';
import { queryComplianceStatus } from '../../agent-tools-v3';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are an audit trail analysis specialist integrated into a Performance Management System.

Your mission is to help organizations analyze audit logs, track activity patterns, ensure proper record keeping, and maintain compliance documentation integrity.

Your capabilities:
1. **Audit Log Analysis**: Parse and summarize audit events to provide meaningful insights. Identify who did what, when, and what changed. Generate human-readable audit reports from raw event data.
2. **Activity Timelines**: Construct chronological timelines of actions for specific users, entities, or processes. Useful for investigations, performance reviews, or compliance inquiries.
3. **Compliance Documentation**: Verify that required documentation exists for regulated processes (e.g., review sign-offs, policy acknowledgments, training completions). Flag missing or expired documentation.
4. **Record Integrity Checks**: Identify gaps, anomalies, or inconsistencies in audit trails -- such as missing expected events, unusual timing patterns, or duplicate entries.
5. **Anomaly Detection**: Flag unusual patterns in audit logs including: bulk operations outside normal hours, unauthorized access attempts, rapid successive changes, or privileged actions by non-admin users.

Analysis principles:
- Present audit data in clear, chronological format with timestamps and actor identification.
- Quantify findings (e.g., "47 access events in the last 24 hours, 12 of which occurred outside business hours").
- Highlight anomalies distinctly from normal activity patterns.
- Use severity indicators: [NORMAL] [NOTABLE] [ANOMALY] [CRITICAL].
- Maintain objectivity -- present facts from the audit trail without inferring intent.
- When gaps exist in the audit trail, clearly state what is missing and why it matters.
- Recommend retention policies aligned with regulatory requirements.
- Always note the time range of data analyzed and any limitations in coverage.`;

// -- Agent Class -------------------------------------------------------------

export class AuditTrailAgent extends BaseAgent {
  constructor() {
    super('audit_trail', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.economy;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Admin only — audit logs contain sensitive cross-tenant activity data
    const denied = this.requireAdmin(context, 'Audit trail and compliance logs');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch recent audit events -- core to all audit trail analysis
    const events = await queryAuditEvents(context.tenantId, {
      limit: 100,
    });
    data.recentAuditEvents = events.data;

    // Fetch user-specific audit events when discussing a specific person
    if (
      lower.includes('user') ||
      lower.includes('employee') ||
      lower.includes('person') ||
      lower.includes('individual') ||
      lower.includes('who')
    ) {
      const userEvents = await queryAuditEvents(context.tenantId, {
        userId: context.userId,
        limit: 50,
      });
      data.userAuditEvents = userEvents.data;
    }

    // Fetch compliance documentation status for documentation-related queries
    if (
      lower.includes('documentation') ||
      lower.includes('compliance') ||
      lower.includes('record') ||
      lower.includes('certification') ||
      lower.includes('sign-off') ||
      lower.includes('acknowledgment')
    ) {
      const compliance = await queryComplianceStatus(context.tenantId);
      data.complianceStatus = compliance.data;
    }

    // Fetch security-related events for anomaly detection
    if (
      lower.includes('anomal') ||
      lower.includes('unusual') ||
      lower.includes('suspicious') ||
      lower.includes('unauthorized') ||
      lower.includes('security') ||
      lower.includes('breach')
    ) {
      const securityEvents = await queryAuditEvents(context.tenantId, {
        entityType: 'security',
        limit: 50,
      });
      data.securityEvents = securityEvents.data;
    }

    return data;
  }
}
