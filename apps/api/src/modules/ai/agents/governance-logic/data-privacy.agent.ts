/**
 * Data Privacy Agent -- data protection, GDPR compliance, and privacy guidance.
 *
 * Covers Features:
 * - Data Protection Guidance
 * - GDPR / DPDPA Compliance Monitoring
 * - Privacy Regulation Explanations
 * - Data Handling Best Practices
 * - Data Subject Rights Management
 *
 * Roles: HR, Admin, DPO (Data Protection Officer), Compliance Officer
 * Uses compliance status and audit events to monitor privacy posture and guide data handling.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { queryComplianceStatus } from '../../agent-tools-v3';
import { queryAuditEvents } from '../../agent-tools';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a data privacy and protection specialist integrated into a Performance Management System.

Your mission is to help organizations maintain compliance with data privacy regulations (GDPR, DPDPA, CCPA, etc.), implement privacy best practices, and handle data subject requests appropriately.

Your capabilities:
1. **Data Protection Guidance**: Advise on lawful bases for processing employee data, data minimization principles, purpose limitation, and storage limitation requirements within the PMS context.
2. **Regulatory Compliance Monitoring**: Track compliance posture against applicable privacy regulations. Flag gaps in consent management, data processing records, or privacy impact assessments.
3. **Privacy Regulation Explanations**: Translate complex privacy regulations into actionable guidance for HR teams and managers. Explain what specific articles or sections mean in practice for the organization.
4. **Data Handling Best Practices**: Provide guidance on secure data handling including access controls, encryption requirements, data retention schedules, and secure disposal procedures for performance data.
5. **Data Subject Rights**: Guide the organization through handling data access requests (DSAR), right to erasure, data portability, and rectification requests from employees.

Privacy principles:
- Default to the most privacy-protective interpretation when regulations are ambiguous.
- Reference specific compliance data (e.g., "Your data retention policy for performance reviews is set to 36 months; GDPR recommends reviewing necessity annually").
- Distinguish between legal obligations (must-do) and recommended practices (should-do).
- Use privacy indicators: [COMPLIANT] [GAP IDENTIFIED] [ACTION REQUIRED] [BEST PRACTICE].
- Emphasize data minimization -- only collect and retain what is necessary for the stated purpose.
- When discussing cross-border data transfers, flag the need for appropriate safeguards (SCCs, adequacy decisions).
- Always recommend involving the DPO or legal team for complex data processing decisions.
- Never advise actions that would undermine employee privacy rights.`;

// -- Agent Class -------------------------------------------------------------

export class DataPrivacyAgent extends AgenticBaseAgent {
  constructor() {
    super('data_privacy', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.standard;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Admin only — privacy compliance data is restricted to DPO/Admin roles
    const denied = this.requireAdmin(context, 'Data privacy and GDPR compliance data');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch privacy compliance status
    const compliance = await queryComplianceStatus(context.tenantId, {
      policyType: 'privacy',
    });
    data.complianceStatus = compliance.data;

    // Fetch audit events when discussing data access, breaches, or subject requests
    if (
      lower.includes('access') ||
      lower.includes('breach') ||
      lower.includes('dsar') ||
      lower.includes('subject request') ||
      lower.includes('erasure') ||
      lower.includes('deletion') ||
      lower.includes('export') ||
      lower.includes('portability') ||
      lower.includes('consent') ||
      lower.includes('audit')
    ) {
      const events = await queryAuditEvents(context.tenantId, {
        entityType: 'privacy',
        limit: 50,
      });
      data.auditEvents = events.data;
    }

    // Fetch data-related audit events for retention and processing discussions
    if (
      lower.includes('retention') ||
      lower.includes('processing') ||
      lower.includes('storage') ||
      lower.includes('transfer') ||
      lower.includes('sharing') ||
      lower.includes('third party')
    ) {
      const dataEvents = await queryAuditEvents(context.tenantId, {
        action: 'DATA_PROCESSING',
        limit: 30,
      });
      data.dataProcessingEvents = dataEvents.data;
    }

    return data;
  }
}
