/**
 * Governance Agent -- ethics, bias auditing, and fairness calibration.
 *
 * Covers Features:
 * - Bias Neutralization Audits
 * - Explainable Performance Scoring
 * - Human-in-the-Loop Approval Gates
 * - Bias-Neutralizing Real-Time Review Auditor
 * - Autonomous Benchmarking & Fairness Calibrator
 *
 * Roles: HR, Admin, Manager
 * Ensures fair, unbiased, and transparent performance decisions.
 */

import { AgenticBaseAgent, type AgentContext } from '../agentic-base-agent';
import { isManager } from '../../../utils/roles';
import { queryReviews, queryAnalytics } from '../agent-tools';
import {
  queryBiasMetrics,
  detectBiasInText,
} from '../agent-tools-v2';

// ── System Prompt ───────────────────────────────────────────

const SYSTEM_PROMPT = `You are an ethics and governance auditor for a Performance Management System.

Your mission is to ensure every performance decision is fair, unbiased, explainable, and auditable.

Your capabilities:
1. **Bias Neutralization Audits**: Scan reviews and ratings for gendered language, recency bias, halo/horns effects, and demographic skew. Flag specific phrases and suggest neutral alternatives.
2. **Explainable Performance Scoring**: Break down any performance score into its contributing factors with weighted evidence trails. Ensure no score is a "black box."
3. **Human-in-the-Loop Approval Gates**: Identify decisions that require human review -- outlier ratings, cross-demographic rating gaps, first-time manager reviews, and high-stakes promotion decisions. Recommend escalation when appropriate.
4. **Real-Time Review Auditor**: Analyze review text as it is written for biased language patterns (affinity bias, attribution bias, gendered descriptors). Provide real-time rewording suggestions.
5. **Fairness Calibration**: Compare rating distributions across demographics (gender, level, department, tenure) to detect systemic calibration drift. Recommend recalibration when distributions diverge beyond acceptable thresholds.

Auditing principles:
- Be precise: cite the exact phrase, metric, or pattern that triggered a flag.
- Classify bias severity: HIGH (action required), MEDIUM (review recommended), LOW (informational).
- Always provide a neutral alternative for flagged language.
- Show statistical evidence: "Women at L5 received 0.3 lower average ratings than men (n=47, p<0.05)."
- Distinguish between individual review bias and systemic calibration issues.
- Never accuse -- frame findings as "patterns to investigate" not "proof of bias."
- Recommend human review gates using clear criteria, not blanket escalation.`;

// ── Agent Class ─────────────────────────────────────────────

export class GovernanceAgent extends AgenticBaseAgent {
  constructor() {
    super('governance', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Governance/bias data is manager+ only
    if (!isManager(context.userRoles)) {
      return {
        accessDenied: true,
        message: 'Governance and bias auditing data is available to managers, HR, and admins only. If you believe a review is unfair, please raise it with your manager or HR department.',
      };
    }

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch bias metrics -- core to governance
    const biasMetrics = await queryBiasMetrics(context.tenantId);
    data.biasMetrics = biasMetrics.data;

    // Always fetch recent reviews for audit context
    const reviews = await queryReviews(context.tenantId, {
      limit: 30,
    });
    data.recentReviews = reviews.data;

    // Real-time text bias detection -- if user provides text to audit
    if (
      lower.includes('audit') ||
      lower.includes('check') ||
      lower.includes('review this') ||
      lower.includes('analyze') ||
      lower.includes('scan') ||
      lower.includes('language')
    ) {
      // Extract review text from the message if provided (after a colon or quotes)
      const textMatch = userMessage.match(/[""](.+?)[""]|:\s*(.+)$/s);
      const textToAudit = textMatch?.[1] || textMatch?.[2];

      if (textToAudit) {
        const biasDetection = await detectBiasInText(textToAudit.trim());
        data.biasDetectionResult = biasDetection.data;
      }
    }

    // Rating distribution analytics for fairness calibration
    if (
      lower.includes('fair') ||
      lower.includes('calibrat') ||
      lower.includes('distribution') ||
      lower.includes('demographic') ||
      lower.includes('equity') ||
      lower.includes('disparity') ||
      lower.includes('benchmark')
    ) {
      const analytics = await queryAnalytics(context.tenantId, {
        limit: 100,
      });
      data.ratingDistributions = analytics.data;
    }

    // Approval gate queries
    if (
      lower.includes('approval') ||
      lower.includes('escalat') ||
      lower.includes('gate') ||
      lower.includes('outlier') ||
      lower.includes('flag')
    ) {
      // Fetch analytics to identify outlier ratings
      const analytics = await queryAnalytics(context.tenantId, {
        limit: 100,
      });
      data.analyticsForOutliers = analytics.data;
    }

    return data;
  }
}

// ── Singleton Export ─────────────────────────────────────────

export const governanceAgent = new GovernanceAgent();
