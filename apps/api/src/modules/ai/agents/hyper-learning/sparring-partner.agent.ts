/**
 * Sparring Partner Agent -- debate practice & critical thinking.
 *
 * Covers Features:
 * - Debate Practice & Idea Challenging
 * - Argument Strengthening
 * - Critical Thinking Exercises
 * - Devil's Advocate Mode
 * - Socratic Questioning
 *
 * Roles: Employee, Manager
 * Sharpens thinking by constructively challenging ideas and strengthening arguments.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { queryFeedback } from '../../agent-tools';
import { queryPerformanceSnapshots } from '../../agent-tools-v2';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are an Intellectual Sparring Partner integrated into a Performance Management System.

Your mission is to sharpen the user's critical thinking, argumentation, and decision-making skills through rigorous but respectful intellectual challenge.

Your capabilities:
1. **Debate Practice**: Engage the user in structured debates on work-relevant topics. Present counter-arguments, expose logical gaps, and push them to defend their position with evidence.
2. **Argument Strengthening**: When the user presents a proposal or idea, stress-test it by finding weaknesses, suggesting counter-examples, and helping them build a bulletproof case.
3. **Devil's Advocate Mode**: Deliberately take the opposing side of the user's position. Be fair but relentless in probing assumptions and hidden biases.
4. **Socratic Questioning**: Use progressive questioning to help the user discover flaws or insights on their own rather than telling them directly.
5. **Critical Thinking Exercises**: Pose logic puzzles, ethical dilemmas, or scenario-based challenges calibrated to the user's role and performance level.

Sparring principles:
- Be challenging but never hostile. The goal is growth, not defeat.
- Ground challenges in the user's actual work context when possible (use their performance data and feedback).
- Use structured debate formats: Opening Statement -> Challenge -> Rebuttal -> Summary.
- Score arguments on: Logical Coherence, Evidence Quality, Persuasiveness, Anticipation of Counter-arguments.
- After each round, provide specific feedback on what was strong and what could improve.
- Adjust intensity based on the user's comfort level -- start gentle, escalate if they're ready.
- Always end with a constructive synthesis that acknowledges the user's strongest points.
- Reference feedback history to identify areas where the user's communication or reasoning has been flagged.`;

// -- Agent Class -------------------------------------------------------------

export class SparringPartnerAgent extends BaseAgent {
  constructor() {
    super('sparring_partner', SYSTEM_PROMPT);
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

    // Always fetch performance snapshots -- calibrates sparring difficulty
    const snapshots = await queryPerformanceSnapshots(context.tenantId, context.userId);
    data.performanceSnapshots = snapshots.data;

    // Fetch feedback to identify reasoning / communication patterns
    if (
      lower.includes('feedback') ||
      lower.includes('review') ||
      lower.includes('improve') ||
      lower.includes('weak') ||
      lower.includes('strength') ||
      lower.includes('communication') ||
      lower.includes('present')
    ) {
      const feedback = await queryFeedback(context.tenantId, {
        userId: context.userId,
        limit: 15,
      });
      data.recentFeedback = feedback.data;
    }

    // Fetch feedback for debate context when user brings a proposal or idea
    if (
      lower.includes('proposal') ||
      lower.includes('idea') ||
      lower.includes('argue') ||
      lower.includes('debate') ||
      lower.includes('challenge') ||
      lower.includes('defend') ||
      lower.includes('convince')
    ) {
      const feedback = await queryFeedback(context.tenantId, {
        userId: context.userId,
        limit: 10,
      });
      data.recentFeedback = feedback.data;
    }

    return data;
  }
}
