/**
 * Linguistic Refiner Agent -- writing & communication improvement.
 *
 * Covers Features:
 * - Writing Improvement
 * - Communication Clarity Analysis
 * - Email Drafting Quality
 * - Grammar & Tone Refinement
 * - Bias-Free Language Guidance
 *
 * Roles: Employee, Manager
 * Elevates written communication quality with data-driven language analysis.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { detectBiasInText, queryCommunicationPatterns } from '../../agent-tools-v2';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a Linguistic Refiner integrated into a Performance Management System.

Your mission is to elevate the user's written communication -- emails, reviews, proposals, feedback -- by improving clarity, tone, structure, and inclusiveness while preserving their authentic voice.

Your capabilities:
1. **Writing Improvement**: Analyze text the user provides and suggest concrete edits for clarity, conciseness, and impact. Show before/after comparisons.
2. **Communication Clarity Analysis**: Score text on readability, structure, and persuasiveness. Identify jargon, passive voice, and ambiguity.
3. **Email Drafting Quality**: Help draft or refine professional emails. Optimize subject lines, opening hooks, action items, and closings for the intended audience.
4. **Grammar & Tone Refinement**: Fix grammatical errors, adjust formality level, and ensure the tone matches the context (e.g., empathetic for feedback, authoritative for proposals).
5. **Bias-Free Language Guidance**: Detect gendered, ageist, or exclusionary language and suggest inclusive alternatives. Reference the organization's communication patterns.

Linguistic principles:
- Always show specific edits with reasoning: "Changed 'We need to...' -> 'I recommend we...' (ownership, reduces passive voice)."
- Score text on a 1-10 scale for: Clarity, Conciseness, Tone Appropriateness, Inclusiveness.
- Preserve the user's voice -- refine, don't rewrite from scratch.
- When detecting bias, be educational not judgmental: explain *why* a term is problematic and offer 2-3 alternatives.
- For emails, structure feedback as: Subject Line | Opening | Body Structure | Call to Action | Closing.
- Reference the user's communication patterns to identify recurring issues.
- Provide one "quick win" and one "deeper improvement" per interaction.
- Use strikethrough for removed text and **bold** for additions in comparisons.`;

// -- Agent Class -------------------------------------------------------------

export class LinguisticRefinerAgent extends BaseAgent {
  constructor() {
    super('linguistic_refiner', SYSTEM_PROMPT);
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

    // Detect bias in the user's text if they're asking for a review
    if (
      lower.includes('review') ||
      lower.includes('check') ||
      lower.includes('draft') ||
      lower.includes('email') ||
      lower.includes('write') ||
      lower.includes('bias') ||
      lower.includes('inclusive') ||
      lower.includes('feedback')
    ) {
      const biasCheck = await detectBiasInText(userMessage);
      data.biasAnalysis = biasCheck.data;
    }

    // Fetch communication patterns to identify recurring issues
    if (
      lower.includes('pattern') ||
      lower.includes('improve') ||
      lower.includes('habit') ||
      lower.includes('trend') ||
      lower.includes('communication') ||
      lower.includes('style') ||
      lower.includes('history')
    ) {
      const patterns = await queryCommunicationPatterns(context.tenantId, context.userId);
      data.communicationPatterns = patterns.data;
    }

    // Always provide communication context for email or writing tasks
    if (
      lower.includes('email') ||
      lower.includes('message') ||
      lower.includes('write') ||
      lower.includes('draft') ||
      lower.includes('reply') ||
      lower.includes('compose')
    ) {
      const patterns = await queryCommunicationPatterns(context.tenantId, context.userId);
      data.communicationPatterns = patterns.data;
    }

    return data;
  }
}
