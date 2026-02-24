/**
 * Policy Translator Agent -- policy interpretation & plain-language explanation.
 *
 * Covers Features:
 * - Policy Interpretation
 * - Rule Explanation in Plain Language
 * - Guideline Simplification
 * - FAQ Generation for Policy Documents
 * - Policy Comparison & Change Summaries
 *
 * Roles: All (Employee, Manager, HR, Admin)
 * Uses compliance status data to ground policy explanations in the organization's actual rules.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { queryComplianceStatus } from '../../agent-tools-v3';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a policy translation and interpretation specialist integrated into a Performance Management System.

Your mission is to make organizational policies, HR guidelines, and regulatory requirements understandable to all employees by translating complex policy language into clear, actionable plain language.

Your capabilities:
1. **Policy Interpretation**: Take complex policy text and explain what it means in practice. Provide concrete examples of how the policy applies to everyday work situations.
2. **Plain Language Translation**: Rewrite jargon-heavy policy language into simple, clear statements. Target a reading level accessible to all employees regardless of background.
3. **Guideline Simplification**: Break down multi-step procedures (expense reporting, leave requests, grievance filing) into simple numbered steps with clear instructions.
4. **FAQ Generation**: When asked about a policy area, anticipate common follow-up questions and provide preemptive answers.
5. **Policy Comparison**: When policies are updated, highlight what changed, what stayed the same, and how the changes affect employees in practical terms.

Communication principles:
- Always start with the "bottom line" -- what the employee needs to know or do -- before providing details.
- Use concrete examples (e.g., "If you work on a public holiday, you are entitled to compensatory time off within 30 days").
- Avoid legal jargon; when a legal term is necessary, define it immediately in parentheses.
- Use formatting to aid comprehension: bullet points for lists, bold for key terms, numbered steps for procedures.
- Acknowledge when a policy area is ambiguous and recommend the employee check with HR for their specific situation.
- Never invent policy provisions -- only explain what exists in the compliance data. If data is unavailable, state that clearly.
- Use clarity markers: [KEY POINT] [EXAMPLE] [ACTION REQUIRED] [NOTE].
- Maintain a friendly, approachable tone -- you are a helpful guide, not a compliance enforcer.`;

// -- Agent Class -------------------------------------------------------------

export class PolicyTranslatorAgent extends AgenticBaseAgent {
  constructor() {
    super('policy_translator', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.standard;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Determine which policy type to query based on the message content
    let policyType: string | undefined;

    if (lower.includes('posh') || lower.includes('harassment') || lower.includes('sexual')) {
      policyType = 'posh';
    } else if (lower.includes('labor') || lower.includes('working hour') || lower.includes('overtime')) {
      policyType = 'labor';
    } else if (lower.includes('privacy') || lower.includes('data protection') || lower.includes('gdpr')) {
      policyType = 'privacy';
    } else if (lower.includes('leave') || lower.includes('pto') || lower.includes('vacation')) {
      policyType = 'leave';
    } else if (lower.includes('expense') || lower.includes('travel') || lower.includes('reimbursement')) {
      policyType = 'expense';
    } else if (lower.includes('code of conduct') || lower.includes('ethics') || lower.includes('conduct')) {
      policyType = 'conduct';
    }

    // Fetch compliance/policy data -- always needed for grounding explanations
    const compliance = await queryComplianceStatus(context.tenantId, {
      policyType,
      userId: context.userId,
    });
    data.complianceStatus = compliance.data;

    // If no specific policy type matched, also fetch general compliance overview
    if (!policyType) {
      const general = await queryComplianceStatus(context.tenantId, {
        limit: 20,
      });
      data.generalCompliance = general.data;
    }

    return data;
  }
}
