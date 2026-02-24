/**
 * Compensation & Promotion Insight Agent — promotion readiness and pay equity engine.
 *
 * Primary Agent #6 of 6.
 *
 * Capabilities:
 * - Assesses promotion readiness based on performance trends, goal achievement, peer feedback
 * - Summarizes multi-cycle performance evidence to support promotion cases
 * - Detects pay equity issues — flags unexplained compensation disparities
 * - Recommends (never decides) — all outputs require human approval
 * - Provides compensation benchmarking context for manager conversations
 *
 * Roles: Manager, HR, Admin
 *
 * IMPORTANT: This agent recommends only. Final compensation and promotion decisions
 * require explicit human approval. The agent surfaces evidence; humans decide.
 */

import { AgenticBaseAgent, type AgentContext } from '../agentic-base-agent';
import { queryUsers, queryGoals, queryReviews, queryFeedback, queryAnalytics } from '../agent-tools';
import {
  queryPerformanceSnapshots,
  querySuccessionReadiness,
  queryCompensationAlignment,
} from '../agent-tools-v2';
import { queryCompensationData } from '../agent-tools-v3';
import { isAdmin, isManager } from '../../../utils/roles';

// ── System Prompt ────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Compensation & Promotion Insight Agent — a specialist in synthesizing performance evidence into promotion readiness assessments and pay equity analysis.

⚠️ IMPORTANT: You RECOMMEND only. You never decide. Every output you produce requires human review and approval. Always make this explicit in your responses.

## Your Two Core Functions

---

### Function 1: Promotion Readiness Assessment

#### What You Analyze
- **Performance Trends**: Rating trajectory across review cycles (improving, stable, declining?)
- **Goal Achievement**: Consistency of hitting/exceeding targets over multiple cycles
- **Peer & Manager Feedback**: Themes that indicate next-level capability
- **Behavioral Evidence**: Leadership signals, cross-functional impact, initiative
- **Level Expectations**: Does this person already perform at the next level?

#### Promotion Readiness Output Format
**Readiness Score**: [Not Ready / Developing / Ready / Overdue]

**Evidence Summary:**
- ✅ Strength 1 (with data)
- ✅ Strength 2 (with data)
- ⚠️ Gap 1 (honest development area)

**Recommendation**: [Promote now / Promote next cycle / Continue development — with rationale]

**Data Gaps**: [What additional evidence would strengthen this case]

⚠️ This assessment is a recommendation only. Final decision requires manager + HR approval.

---

### Function 2: Pay Equity & Compensation Analysis

#### What You Detect
- **Pay disparity by gender/tenure/department** that isn't explained by performance or seniority
- **Employees paid significantly below market** for their level and performance tier
- **Compensation drift**: high performers under-compensated vs. average performers
- **Internal equity issues**: similar roles/levels with unexplained pay gaps

#### Pay Equity Output Format
**Flag Type**: [Gender Gap / Tenure Anomaly / Level Compression / Market Lag]
**Affected Employee(s)**: [anonymized if possible]
**Gap Magnitude**: [e.g., 12% below comparable peers]
**Risk Level**: 🔴 High / ⚠️ Medium / ✅ Low
**Recommended Action**: [Compensation review / Band adjustment / Calibration discussion]

⚠️ This is a flag for human review, not an automatic adjustment. HR approval required.

---

### Function 3: Performance Trend Summary (for Promotion Conversations)
Synthesize a multi-cycle narrative ready for promotion committee review:
"Over 3 consecutive cycles, [name] has: achieved/exceeded 87% of goals, received consistent 'exceeds' ratings on technical quality, been cited in 6 peer feedback responses for cross-team leadership, and has been operating at L5 expectations while holding an L4 title for 18 months."

---

## Principles
- Always cite specific data points, not vague impressions
- Separate facts (data-backed) from inferences (pattern-based)
- Flag data gaps honestly — incomplete data = incomplete recommendation
- Never produce output that could be used to discriminate
- Defer to human judgment on all final decisions

Use 🎖️ for promotion signals, 💰 for compensation flags, 📊 for data citations, ⚠️ for gaps.`;

// ── Agent Class ──────────────────────────────────────────────

export class CompensationPromotionAgent extends AgenticBaseAgent {
  constructor() {
    super('compensation_promotion', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // This agent is manager/HR/admin only
    if (!isManager(context.userRoles) && !isAdmin(context.userRoles)) {
      return {
        accessDenied: true,
        message: 'Compensation and promotion insights are available to managers and HR only.',
      };
    }

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Performance snapshots — the core evidence base
    const snapshots = await queryPerformanceSnapshots(context.tenantId, context.userId);
    data.performanceSnapshots = snapshots.data;

    // Goal achievement history
    const goals = await queryGoals(context.tenantId, {
      userId: context.userId,
      limit: 30,
    });
    data.goalHistory = goals.data;

    // Multi-cycle review ratings
    const reviews = await queryReviews(context.tenantId, {
      userId: context.userId,
      limit: 10,
    });
    data.reviewHistory = reviews.data;

    // Peer and manager feedback themes
    const feedback = await queryFeedback(context.tenantId, {
      userId: context.userId,
      limit: 30,
    });
    data.feedbackThemes = feedback.data;

    // Succession readiness data (bench strength context)
    const succession = await querySuccessionReadiness(context.tenantId);
    data.successionReadiness = succession.data;

    // Compensation data (pay equity analysis)
    if (
      lower.includes('pay') || lower.includes('salary') ||
      lower.includes('compensation') || lower.includes('equity') ||
      lower.includes('raise') || lower.includes('band')
    ) {
      const compData = await queryCompensationData(context.tenantId, {
        userId: context.userId,
      });
      data.compensationData = compData.data;

      const compAlignment = await queryCompensationAlignment(context.tenantId);
      data.compensationAlignment = compAlignment.data;
    }

    // Analytics for quantitative performance metrics
    const analytics = await queryAnalytics(context.tenantId, {
      userId: context.userId,
      limit: 30,
    });
    data.performanceMetrics = analytics.data;

    // Team member context (for comparative analysis)
    if (isAdmin(context.userRoles) || lower.includes('team') || lower.includes('compare')) {
      const teamMembers = await queryUsers(context.tenantId, { limit: 50 });
      data.teamContext = teamMembers.data;
    }

    data.userContext = {
      level: context.userLevel,
      department: context.userDepartment,
      roleCategory: context.roleCategory,
    };

    return data;
  }
}
