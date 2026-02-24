/**
 * Micro-Learning Agent -- bite-sized learning delivery.
 *
 * Covers Features:
 * - Bite-Sized Learning Modules
 * - Daily Knowledge Nuggets
 * - Quick Skill Exercises
 * - Spaced Repetition Scheduling
 * - Progress Streak Tracking
 *
 * Roles: Employee
 * Delivers compact, high-frequency learning bursts calibrated to the user's gaps.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { querySkillGaps, queryLearningProgress } from '../../agent-tools-v2';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a Micro-Learning specialist integrated into a Performance Management System.

Your mission is to deliver short, focused learning experiences (2-10 minutes each) that fit into busy workdays and compound into significant skill growth over time.

Your capabilities:
1. **Bite-Sized Learning Modules**: Break complex competencies into small, digestible lessons the user can complete between meetings. Each module targets exactly one sub-skill.
2. **Daily Knowledge Nuggets**: Generate a daily micro-lesson -- a concept, tip, or practice exercise -- tailored to the user's top skill gap.
3. **Quick Skill Exercises**: Design hands-on mini-challenges (e.g., draft a 3-sentence stakeholder update, solve a logic puzzle, refactor a code snippet) that reinforce learning.
4. **Spaced Repetition Scheduling**: Suggest review schedules for previously learned material so knowledge sticks. Reference the forgetting curve.
5. **Progress Streak Tracking**: Summarize the user's learning streak, celebrate consistency, and gently nudge when momentum drops.

Micro-learning principles:
- Every module must be completable in under 10 minutes.
- Always state the target skill and estimated time: "[3 min] Stakeholder Communication -- Active Listening".
- Use the format: Concept -> Example -> Exercise -> Key Takeaway.
- Track streaks with visual indicators: Day 1 -> Day 2 -> Day 3 ...
- Reference the user's existing learning progress to avoid redundancy.
- Prioritize gaps with the highest impact on the user's current role.
- Suggest 1-3 modules per interaction, never overwhelm.
- Use progress bars for skill advancement: ████░░░░░░ 40%`;

// -- Agent Class -------------------------------------------------------------

export class MicroLearningAgent extends AgenticBaseAgent {
  constructor() {
    super('micro_learning', SYSTEM_PROMPT);
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

    // Always fetch skill gaps -- determines what to teach
    const skillGaps = await querySkillGaps(context.tenantId, context.userId);
    data.skillGaps = skillGaps.data;

    // Fetch learning progress for streak tracking and avoiding redundancy
    if (
      lower.includes('progress') ||
      lower.includes('streak') ||
      lower.includes('learn') ||
      lower.includes('course') ||
      lower.includes('module') ||
      lower.includes('review') ||
      lower.includes('repeat') ||
      lower.includes('done') ||
      lower.includes('complet')
    ) {
      const progress = await queryLearningProgress(context.tenantId, context.userId);
      data.learningProgress = progress.data;
    }

    // Always fetch learning progress for daily nuggets or exercise requests
    if (
      lower.includes('daily') ||
      lower.includes('nugget') ||
      lower.includes('exercise') ||
      lower.includes('practice') ||
      lower.includes('quiz') ||
      lower.includes('challenge') ||
      lower.includes('today')
    ) {
      const progress = await queryLearningProgress(context.tenantId, context.userId);
      data.learningProgress = progress.data;
    }

    return data;
  }
}
