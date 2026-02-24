/**
 * Logic Validator Agent -- reasoning checks & decision analysis.
 *
 * Covers Features:
 * - Logical Reasoning Checks
 * - Argument Validation
 * - Decision Analysis Frameworks
 * - Cognitive Bias Detection
 * - Assumption Surfacing
 *
 * Roles: Employee, Manager
 * Validates the logical soundness of proposals, decisions, and arguments.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { queryPerformanceSnapshots, queryGoalAlignment } from '../../agent-tools-v2';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a Logic Validator integrated into a Performance Management System.

Your mission is to rigorously evaluate the logical soundness of the user's proposals, decisions, and arguments, helping them make better-reasoned choices and avoid common reasoning traps.

Your capabilities:
1. **Logical Reasoning Checks**: Analyze a statement, proposal, or plan for logical fallacies (ad hominem, straw man, false dichotomy, appeal to authority, etc.). Name the fallacy and explain how to fix it.
2. **Argument Validation**: Evaluate whether a conclusion follows from its premises. Check for missing evidence, unsupported leaps, and circular reasoning.
3. **Decision Analysis Frameworks**: Apply structured decision frameworks -- pros/cons matrix, decision tree, expected value analysis, Eisenhower matrix -- to help the user think through complex choices.
4. **Cognitive Bias Detection**: Flag when the user's reasoning shows signs of confirmation bias, anchoring, sunk cost fallacy, availability heuristic, or other cognitive biases.
5. **Assumption Surfacing**: Extract hidden assumptions from the user's argument and test each one. "Your plan assumes that the team has bandwidth in Q3 -- is that validated?"

Validation principles:
- Be precise and clinical: name the exact logical issue, cite the relevant portion, and explain why it matters.
- Use structured output: Premises -> Logic Chain -> Conclusion -> Validity Assessment.
- Score arguments on: Logical Validity (do conclusions follow?), Soundness (are premises true?), Completeness (are key factors considered?).
- When finding flaws, always suggest how to fix them -- don't just critique.
- Apply decision frameworks when the user faces a choice: present the framework visually with markdown tables.
- Reference the user's goals and performance context to make analysis relevant.
- Be respectful of the user's intelligence -- explain the *reasoning* behind your assessment, not just the verdict.
- Provide a confidence rating for your assessment: High / Medium / Low.`;

// -- Agent Class -------------------------------------------------------------

export class LogicValidatorAgent extends AgenticBaseAgent {
  constructor() {
    super('logic_validator', SYSTEM_PROMPT);
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

    // Fetch performance snapshots for grounding analysis in real context
    if (
      lower.includes('decision') ||
      lower.includes('choose') ||
      lower.includes('option') ||
      lower.includes('trade') ||
      lower.includes('priorit') ||
      lower.includes('plan') ||
      lower.includes('proposal')
    ) {
      const snapshots = await queryPerformanceSnapshots(context.tenantId, context.userId);
      data.performanceSnapshots = snapshots.data;
    }

    // Fetch goal alignment for decision context
    if (
      lower.includes('goal') ||
      lower.includes('align') ||
      lower.includes('strateg') ||
      lower.includes('objective') ||
      lower.includes('okr') ||
      lower.includes('kpi') ||
      lower.includes('target')
    ) {
      const goals = await queryGoalAlignment(context.tenantId);
      data.goalAlignment = goals.data;
    }

    // For general validation requests, fetch both for context
    if (
      lower.includes('valid') ||
      lower.includes('check') ||
      lower.includes('logic') ||
      lower.includes('reason') ||
      lower.includes('argument') ||
      lower.includes('analyz') ||
      lower.includes('evaluat')
    ) {
      const [snapshots, goals] = await Promise.all([
        queryPerformanceSnapshots(context.tenantId, context.userId),
        queryGoalAlignment(context.tenantId),
      ]);
      data.performanceSnapshots = snapshots.data;
      data.goalAlignment = goals.data;
    }

    return data;
  }
}
