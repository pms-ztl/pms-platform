/**
 * Coaching Agent -- hyper-contextual performance coaching.
 *
 * Covers Features:
 * - Context-Aware Micro-Coaching
 * - Skill Gap Simulation
 * - Automated Learning Pathways
 * - Just-in-Time Mentorship Matching
 * - Post-Performance Learning Bridge
 *
 * Roles: Employee, Manager
 * Delivers specific, data-backed coaching rather than generic advice.
 */

import { BaseAgent, type AgentContext } from '../base-agent';
import { queryFeedback } from '../agent-tools';
import {
  querySkillGaps,
  queryLearningProgress,
  queryMentorMatches,
  queryPerformanceSnapshots,
} from '../agent-tools-v2';

// ── System Prompt ───────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert performance coach integrated into a Performance Management System.

Your mission is to deliver hyper-contextual guidance grounded in real work data -- never generic advice.

Your capabilities:
1. **Context-Aware Micro-Coaching**: Analyze the user's current skill gaps, recent feedback, and performance snapshots to deliver targeted coaching tips they can apply immediately.
2. **Skill Gap Simulation**: Identify missing competencies for the user's current role and next-level expectations. Quantify each gap and suggest the fastest path to close it.
3. **Automated Learning Pathways**: Build personalized development plans with prioritized learning modules, estimated time investment, and milestone checkpoints.
4. **Just-in-Time Mentorship Matching**: Recommend internal mentors whose strengths directly complement the user's gaps. Explain *why* each match is relevant.
5. **Post-Performance Learning Bridge**: After reviews or feedback, translate findings into concrete learning actions so no insight is wasted.

Coaching principles:
- Always reference specific data points (e.g., "Your Q4 feedback scored 3.2/5 on stakeholder communication").
- Recommend 1-3 high-impact actions per interaction, not laundry lists.
- Include estimated time-to-impact for each recommendation.
- Be encouraging but direct -- acknowledge strengths before addressing gaps.
- Format skill gaps as progress bars where helpful: ████████░░ 80%
- When matching mentors, explain the complementary skill rationale.`;

// ── Agent Class ─────────────────────────────────────────────

export class CoachingAgent extends BaseAgent {
  constructor() {
    super('coaching', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch skill gaps -- core to all coaching interactions
    const skillGaps = await querySkillGaps(context.tenantId, context.userId);
    data.skillGaps = skillGaps.data;

    // Always fetch recent performance snapshots for grounding
    const snapshots = await queryPerformanceSnapshots(context.tenantId, context.userId);
    data.performanceSnapshots = snapshots.data;

    // Fetch learning progress if discussing pathways, courses, or development
    if (
      lower.includes('learn') ||
      lower.includes('course') ||
      lower.includes('pathway') ||
      lower.includes('develop') ||
      lower.includes('training') ||
      lower.includes('skill') ||
      lower.includes('growth')
    ) {
      const learning = await queryLearningProgress(context.tenantId, context.userId);
      data.learningProgress = learning.data;
    }

    // Fetch mentor matches if discussing mentorship, guidance, or coaching
    if (
      lower.includes('mentor') ||
      lower.includes('coach') ||
      lower.includes('guidance') ||
      lower.includes('pair') ||
      lower.includes('shadow') ||
      lower.includes('learn from')
    ) {
      const mentors = await queryMentorMatches(context.tenantId, context.userId);
      data.mentorMatches = mentors.data;
    }

    // Fetch recent feedback for post-review coaching or general improvement
    if (
      lower.includes('feedback') ||
      lower.includes('review') ||
      lower.includes('improve') ||
      lower.includes('strength') ||
      lower.includes('weakness') ||
      lower.includes('area')
    ) {
      const feedback = await queryFeedback(context.tenantId, {
        userId: context.userId,
        limit: 15,
      });
      data.recentFeedback = feedback.data;
    }

    return data;
  }
}

// ── Singleton Export ─────────────────────────────────────────

export const coachingAgent = new CoachingAgent();
