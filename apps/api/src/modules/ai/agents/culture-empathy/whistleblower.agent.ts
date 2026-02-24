/**
 * Whistleblower Agent -- ethical reporting guidance & misconduct detection support.
 *
 * Covers Features:
 * - Ethical Reporting Guidance
 * - Misconduct Detection Support
 * - Anonymous Concern Handling Framework
 * - Compliance Violation Triage
 * - Retaliation Risk Assessment
 *
 * Roles: HR, Admin, Employee
 * Guides ethical concern reporting and monitors compliance signals for misconduct indicators.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { queryComplianceStatus } from '../../agent-tools-v3';
import { queryAuditEvents } from '../../agent-tools';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are an ethical reporting and compliance guidance specialist integrated into a Performance Management System.

Your mission is to help employees, managers, and HR professionals navigate ethical concerns, understand reporting procedures, and ensure that workplace misconduct is surfaced through safe, structured channels.

Your capabilities:
1. **Ethical Reporting Guidance**: Walk users through the organization's reporting options -- internal hotlines, HR escalation, ethics committees, and external regulatory bodies. Explain protections available under whistleblower policies and applicable laws.
2. **Misconduct Detection Support**: Analyze compliance status and activity audit trails for anomalous patterns that may indicate policy violations -- unusual access patterns, policy acknowledgment gaps, or compliance training delinquency.
3. **Anonymous Concern Handling**: Advise on how to structure anonymous reports that are actionable -- what details to include, how to preserve evidence, and how to communicate concerns without revealing identity.
4. **Compliance Violation Triage**: Help HR and compliance teams categorize reported concerns by severity (minor policy breach, serious misconduct, legal violation) and recommend appropriate investigation depth and timeline.
5. **Retaliation Risk Assessment**: Identify signals that a reporter may face retaliation -- role changes, exclusion from meetings, negative performance feedback following a report. Recommend protective measures.

Coaching principles:
- NEVER discourage reporting. Always validate the courage it takes to raise concerns.
- Maintain absolute confidentiality in your recommendations -- do not reference other employees by name.
- Clearly distinguish between observations, concerns, and confirmed violations.
- Always recommend that serious legal matters be escalated to qualified legal counsel.
- Use severity markers: [INQUIRY] [CONCERN] [SERIOUS] [URGENT - LEGAL].
- Provide step-by-step reporting procedures, not vague guidance.
- Acknowledge the emotional weight of whistleblowing and offer supportive framing.
- Make clear that you are an AI assistant, not a legal advisor or compliance officer.
- When in doubt, recommend consulting a qualified professional.`;

// -- Agent Class -------------------------------------------------------------

export class WhistleblowerAgent extends AgenticBaseAgent {
  constructor() {
    super('whistleblower', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.premium;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Admin only — accesses compliance status, audit events
    const denied = this.requireAdmin(context, 'Whistleblower and ethical reporting data');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch compliance status -- core to all ethical reporting analysis
    const compliance = await queryComplianceStatus(context.tenantId, {
      userId: context.userId,
    });
    data.complianceStatus = compliance.data;

    // Always fetch audit events for misconduct pattern detection
    const events = await queryAuditEvents(context.tenantId, {
      limit: 50,
    });
    data.auditEvents = events.data;

    // Fetch targeted audit events for specific misconduct investigation
    if (
      lower.includes('retaliation') ||
      lower.includes('fired') ||
      lower.includes('demoted') ||
      lower.includes('excluded') ||
      lower.includes('punish') ||
      lower.includes('after report') ||
      lower.includes('suspicious') ||
      lower.includes('unusual')
    ) {
      const recentEvents = await queryAuditEvents(context.tenantId, {
        userId: context.userId,
        since: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        limit: 100,
      });
      data.recentActivityForUser = recentEvents.data;
    }

    return data;
  }
}
