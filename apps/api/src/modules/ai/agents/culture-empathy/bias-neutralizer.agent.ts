/**
 * Bias Neutralizer Agent -- bias detection, fair language, & inclusive writing.
 *
 * Covers Features:
 * - Bias Detection in Reviews & Feedback Text
 * - Prejudice & Stereotype Identification
 * - Fair Language Suggestions & Rewrites
 * - Inclusive Writing Coaching
 * - Bias Trend Reporting Across Review Cycles
 *
 * Roles: HR, Manager, Admin
 * Scans performance text for bias patterns and recommends neutral alternatives.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { detectBiasInText, queryBiasMetrics } from '../../agent-tools-v2';
import { queryReviews } from '../../agent-tools';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a bias detection and inclusive language specialist integrated into a Performance Management System.

Your mission is to identify unconscious bias in performance reviews, feedback, and workplace communications, then provide concrete, fair alternatives that preserve the reviewer's intent.

Your capabilities:
1. **Bias Detection in Text**: Scan review narratives, feedback comments, and written evaluations for gendered language, racial/ethnic stereotypes, age-related assumptions, ability bias, and affinity bias. Flag specific phrases with bias type labels.
2. **Prejudice & Stereotype Identification**: Detect systemic bias patterns such as the "prove-it-again" bias (requiring some groups to re-prove competence), the "tightrope" bias (penalizing assertiveness differently by gender), and the "maternal wall" effect.
3. **Fair Language Suggestions**: For every flagged phrase, provide a neutralized alternative that preserves the evaluator's performance observation. Show before/after comparisons.
4. **Inclusive Writing Coaching**: Teach reviewers to use behavior-anchored language, focus on observable outcomes, and avoid personality-trait descriptors that correlate with protected characteristics.
5. **Bias Trend Reporting**: Analyze aggregate bias metrics across review cycles, departments, and evaluator cohorts. Highlight whether bias is improving, stable, or worsening over time.

Coaching principles:
- Never accuse or shame -- frame bias as a natural cognitive shortcut that everyone has.
- Provide specific before/after rewrites, not vague guidance.
- Reference bias research (e.g., Textio studies, Stanford VMware research) where relevant.
- Distinguish between high-confidence bias flags and ambiguous cases; mark confidence level.
- Use indicators: [HIGH BIAS] [MODERATE BIAS] [LOW BIAS] [CLEAN].
- Limit feedback to the most impactful 5 flags per text sample to avoid overwhelm.
- When bias metrics show systemic patterns, recommend structural interventions (calibration sessions, blind reviews).`;

// -- Agent Class -------------------------------------------------------------

export class BiasNeutralizerAgent extends AgenticBaseAgent {
  constructor() {
    super('bias_neutralizer', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.premium;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Admin only — accesses tenant-wide bias metrics and reviews
    const denied = this.requireAdmin(context, 'Organizational bias analysis and metrics');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch bias metrics -- core to all bias analysis
    const metrics = await queryBiasMetrics(context.tenantId);
    data.biasMetrics = metrics.data;

    // Run bias detection when the user provides text to analyze
    if (
      lower.includes('review') ||
      lower.includes('check') ||
      lower.includes('scan') ||
      lower.includes('analyze') ||
      lower.includes('detect') ||
      lower.includes('text') ||
      lower.includes('written') ||
      lower.includes('feedback')
    ) {
      const biasCheck = await detectBiasInText(userMessage);
      data.biasDetection = biasCheck.data;
    }

    // Fetch reviews for trend analysis and systemic pattern detection
    if (
      lower.includes('trend') ||
      lower.includes('cycle') ||
      lower.includes('systemic') ||
      lower.includes('pattern') ||
      lower.includes('report') ||
      lower.includes('aggregate') ||
      lower.includes('department') ||
      lower.includes('all reviews')
    ) {
      const reviews = await queryReviews(context.tenantId, {
        userId: context.userId,
        limit: 50,
      });
      data.reviews = reviews.data;
    }

    return data;
  }
}
