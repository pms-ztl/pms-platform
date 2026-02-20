/**
 * POSH Sentinel Agent -- Prevention of Sexual Harassment compliance & guidance.
 *
 * Covers Features:
 * - POSH Compliance Monitoring
 * - Inappropriate Behavior Detection
 * - Harassment Prevention Guidance
 * - ICC (Internal Complaints Committee) Process Support
 * - Awareness & Training Compliance Tracking
 *
 * Roles: HR, Admin, Compliance Officer
 * Uses compliance status and audit events to monitor, detect, and guide POSH compliance.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { queryComplianceStatus } from '../../agent-tools-v3';
import { queryAuditEvents } from '../../agent-tools';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a POSH (Prevention of Sexual Harassment) compliance specialist integrated into a Performance Management System.

Your mission is to provide accurate, sensitive, and legally informed guidance on sexual harassment prevention, compliance monitoring, and incident response within the workplace.

Your capabilities:
1. **Compliance Monitoring**: Track POSH policy adherence across the organization. Monitor whether mandatory awareness training has been completed, ICC committees are constituted, and annual reports are filed.
2. **Inappropriate Behavior Detection**: Analyze activity patterns and compliance records for red flags such as repeated complaints against the same individual, patterns of policy violations, or missing mandatory training completions.
3. **Harassment Prevention Guidance**: Provide clear, empathetic guidance on what constitutes harassment under POSH Act 2013, how to report incidents, whistleblower protections, and organizational responsibilities.
4. **ICC Process Support**: Guide HR and compliance officers through the Internal Complaints Committee process including timelines (90-day inquiry completion), interim relief options, and documentation requirements.
5. **Training & Awareness Tracking**: Monitor completion rates for mandatory POSH awareness programs and flag departments or individuals who are overdue.

Critical principles:
- This is an extremely sensitive topic. Always respond with empathy, professionalism, and legal accuracy.
- Never trivialize or dismiss concerns about harassment.
- Maintain strict confidentiality -- never reveal complainant identities or case details unless the user has explicit HR/compliance access.
- Reference specific compliance data points (e.g., "3 of 12 departments have not completed mandatory training").
- When in doubt about legal specifics, recommend consulting the organization's legal counsel.
- Clearly distinguish between legal requirements, organizational policies, and best practices.
- Use severity indicators: [COMPLIANT] [AT RISK] [NON-COMPLIANT] [URGENT].
- Never provide legal advice -- provide legal information and recommend professional counsel for specific cases.`;

// -- Agent Class -------------------------------------------------------------

export class POSHSentinelAgent extends BaseAgent {
  constructor() {
    super('posh_sentinel', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.premium;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Admin only — POSH compliance data is highly sensitive
    const denied = this.requireAdmin(context, 'POSH compliance monitoring and incident data');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch compliance status -- core to all POSH analysis
    const compliance = await queryComplianceStatus(context.tenantId, {
      policyType: 'posh',
    });
    data.complianceStatus = compliance.data;

    // Fetch audit events when discussing incidents, complaints, or investigations
    if (
      lower.includes('incident') ||
      lower.includes('complaint') ||
      lower.includes('report') ||
      lower.includes('investigation') ||
      lower.includes('violation') ||
      lower.includes('icc') ||
      lower.includes('committee') ||
      lower.includes('case') ||
      lower.includes('misconduct') ||
      lower.includes('harassment')
    ) {
      const events = await queryAuditEvents(context.tenantId, {
        entityType: 'compliance',
        limit: 50,
      });
      data.auditEvents = events.data;
    }

    // Fetch training-related audit events when discussing awareness or training
    if (
      lower.includes('training') ||
      lower.includes('awareness') ||
      lower.includes('completion') ||
      lower.includes('overdue') ||
      lower.includes('mandatory')
    ) {
      const trainingEvents = await queryAuditEvents(context.tenantId, {
        action: 'TRAINING_COMPLETED',
        limit: 50,
      });
      data.trainingEvents = trainingEvents.data;
    }

    return data;
  }
}
