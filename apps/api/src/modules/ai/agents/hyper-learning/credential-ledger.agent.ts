/**
 * Credential Ledger Agent -- certification & qualification management.
 *
 * Covers Features:
 * - Certification Tracking
 * - Qualification Management
 * - Credential Verification
 * - Expiry Alerts & Renewal Planning
 * - Credential Gap Analysis
 *
 * Roles: Employee, Manager, HR
 * Maintains a complete ledger of professional credentials and drives timely renewals.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { queryLearningProgress, querySkillGaps } from '../../agent-tools-v2';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a Credential Ledger specialist integrated into a Performance Management System.

Your mission is to maintain a complete, accurate view of the user's professional certifications, qualifications, and licenses, ensuring nothing expires unnoticed and identifying credential gaps that hinder career progress.

Your capabilities:
1. **Certification Tracking**: Maintain a ledger of all active, expired, and in-progress certifications. Show status, issue date, expiry date, and issuing body for each.
2. **Qualification Management**: Track formal qualifications (degrees, diplomas, professional designations) and map them to role requirements.
3. **Expiry Alerts & Renewal Planning**: Identify certifications expiring within 90 days and build a renewal timeline with study hours, exam dates, and cost estimates.
4. **Credential Gap Analysis**: Compare the user's current credentials against role requirements and next-level expectations. Highlight missing certifications that block promotion.
5. **Credential Verification Status**: Track verification status of each credential (verified, pending, unverified) and suggest next steps for incomplete verifications.

Credential management principles:
- Present credentials in a structured table format: Name | Status | Issued | Expires | Issuer.
- Use urgency indicators: EXPIRED (red), Expiring Soon (yellow within 90 days), Active (green).
- Always calculate days until expiry and flag anything under 90 days.
- When analyzing gaps, reference the user's current skill gaps and role requirements.
- Estimate renewal effort: study hours, cost, and recommended prep resources.
- For managers, aggregate team credential status with compliance percentages.
- Recommend credential stacking strategies: "Get AWS Solutions Architect before attempting the DevOps Professional."
- Limit recommendations to 2-3 high-priority credential actions per interaction.`;

// -- Agent Class -------------------------------------------------------------

export class CredentialLedgerAgent extends BaseAgent {
  constructor() {
    super('credential_ledger', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.economy;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch learning progress -- contains certification data
    const progress = await queryLearningProgress(context.tenantId, context.userId);
    data.learningProgress = progress.data;

    // Fetch skill gaps for credential gap analysis
    if (
      lower.includes('gap') ||
      lower.includes('missing') ||
      lower.includes('need') ||
      lower.includes('require') ||
      lower.includes('promot') ||
      lower.includes('role') ||
      lower.includes('qualification') ||
      lower.includes('next level')
    ) {
      const skillGaps = await querySkillGaps(context.tenantId, context.userId);
      data.skillGaps = skillGaps.data;
    }

    // Also fetch skill gaps for renewal prioritization
    if (
      lower.includes('renew') ||
      lower.includes('expir') ||
      lower.includes('priority') ||
      lower.includes('which') ||
      lower.includes('important') ||
      lower.includes('first')
    ) {
      const skillGaps = await querySkillGaps(context.tenantId, context.userId);
      data.skillGaps = skillGaps.data;
    }

    return data;
  }
}
