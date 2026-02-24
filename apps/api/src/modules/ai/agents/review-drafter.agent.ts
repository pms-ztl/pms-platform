/**
 * Review Drafter Agent — dedicated self-review and manager review drafting engine.
 *
 * Primary Agent #3 of 6.
 *
 * Capabilities:
 * - Drafts self-reviews using actual goal progress, feedback, and performance data
 * - Drafts manager reviews for direct reports with specific evidence
 * - Eliminates generic language — every sentence references real data
 * - Reduces bias by grounding language in observable behaviors and outcomes
 * - Saves hours per review cycle while improving review quality
 *
 * Roles: Employee (self-review), Manager (manager review + self-review)
 */

import { AgenticBaseAgent, type AgentContext } from '../agentic-base-agent';
import { queryGoals, queryReviews, queryFeedback, queryAnalytics, queryUsers } from '../agent-tools';
import { queryPerformanceSnapshots } from '../agent-tools-v2';
import { isManager } from '../../../utils/roles';

// ── System Prompt ────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Review Drafter Agent — a specialist in writing high-quality, evidence-based performance reviews that are ready for manager approval with minimal editing.

Your mission: Replace vague, memory-based reviews with precise, data-backed narratives. Every review you write should make a reader say "this person clearly achieved X, evidenced by Y."

## Review Types You Draft

### Self-Review Draft (Employee)
Structure:
1. **Key Accomplishments** (3-5 bullet points with metrics)
2. **Goal Achievement Summary** (each goal: status + evidence)
3. **Strengths Demonstrated** (backed by specific feedback or outcomes)
4. **Areas for Growth** (honest, constructive, forward-looking)
5. **Development Goals for Next Cycle**

### Manager Review Draft (Manager → Direct Report)
Structure:
1. **Performance Summary** (2-3 sentence overview)
2. **Goal Performance** (each goal with rating rationale and evidence)
3. **Behavioral Strengths** (specific examples from feedback and observations)
4. **Development Opportunities** (growth-oriented, not punitive)
5. **Overall Rating Recommendation** with justification

## Language Principles (strictly enforced)
- ✅ "Anita exceeded sprint commitments by 18%, closing 34 of 30 assigned tickets"
- ❌ "Anita is a hard worker and always tries her best"
- ✅ "Received 4 peer feedback nominations citing 'cross-team collaboration'"
- ❌ "Works well with others"
- ✅ "Goal #2 achieved 3 weeks ahead of deadline with measurable 22% latency reduction"
- ❌ "Made good progress on technical goals"

## Anti-Bias Rules
- Focus on outcomes, deliverables, and behaviors — not personality traits
- Avoid gendered descriptors (bossy, aggressive, likeable, supportive when applied asymmetrically)
- Give equal specificity to all employees regardless of visibility
- If data is insufficient, state it explicitly rather than filling with impressions

## Output Format
- Provide a complete draft ready for copy-paste
- Mark data-backed statements with 📊 and inferred statements with 💭
- Add a note at the end listing data gaps that the reviewer should manually fill
- Offer to adjust tone (formal/conversational) or length (brief/detailed)

## Tone
Professional, clear, constructive. Suitable for HR records and calibration sessions.`;

// ── Agent Class ──────────────────────────────────────────────

export class ReviewDrafterAgent extends AgenticBaseAgent {
  constructor() {
    super('review_drafter', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Determine if drafting for self or a specific direct report
    const isDraftingForOther =
      isManager(context.userRoles) &&
      (lower.includes('for') || lower.includes('their') ||
       lower.includes('report') || lower.includes('team member'));

    // Always load the subject's goals
    const goals = await queryGoals(context.tenantId, {
      userId: context.userId,
      limit: 20,
    });
    data.goals = goals.data;

    // Load all reviews — self and received
    const reviews = await queryReviews(context.tenantId, {
      userId: context.userId,
      limit: 15,
    });
    data.pastReviews = reviews.data;

    // Load all feedback received (peer + manager)
    const feedback = await queryFeedback(context.tenantId, {
      userId: context.userId,
      limit: 30,
    });
    data.feedbackReceived = feedback.data;

    // Load quantitative performance metrics
    const analytics = await queryAnalytics(context.tenantId, {
      userId: context.userId,
      limit: 30,
    });
    data.performanceMetrics = analytics.data;

    // Load performance snapshots for trend context
    const snapshots = await queryPerformanceSnapshots(context.tenantId, context.userId);
    data.performanceSnapshots = snapshots.data;

    // Managers drafting for direct reports: get team context
    if (isDraftingForOther) {
      const teamGoals = await queryGoals(context.tenantId, { limit: 50 });
      data.teamGoals = teamGoals.data;

      const teamMembers = await queryUsers(context.tenantId, { limit: 30 });
      data.teamMembers = teamMembers.data;
    }

    data.userContext = {
      level: context.userLevel,
      department: context.userDepartment,
      roleCategory: context.roleCategory,
      userName: context.userName,
    };

    return data;
  }
}
