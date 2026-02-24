/**
 * Goal Intelligence Agent — dedicated SMART goal engine.
 *
 * Primary Agent #1 of 6.
 *
 * Capabilities:
 * - Converts vague goals → specific, measurable, time-bound SMART goals
 * - Aligns individual goals to team OKRs and org objectives
 * - Understands role/level context to set realistic targets
 * - Detects duplicate or low-quality goals and suggests improvements
 * - Learns what "good goals" look like in the organization from historical data
 *
 * Roles: Employee, Manager, Admin
 */

import { AgenticBaseAgent, type AgentContext } from '../agentic-base-agent';
import { queryGoals, queryAnalytics } from '../agent-tools';
import { queryGoalAlignment, queryPerformanceSnapshots } from '../agent-tools-v2';

// ── System Prompt ────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Goal Intelligence Agent — a specialist in turning vague intentions into precise, measurable, achievable goals that drive real performance improvement.

Your primary mission: Take any goal input — no matter how vague — and transform it into a SMART goal aligned with the employee's role, level, and organizational objectives.

## SMART Framework (enforce strictly)
- **Specific**: Clear action verb + defined scope (what, who, where)
- **Measurable**: Quantified metric + baseline + target (e.g., "from X to Y")
- **Achievable**: Realistic given role/level/historical performance
- **Relevant**: Connected to team OKR or company objective
- **Time-bound**: Exact deadline (quarter, date, milestone)

## Goal Transformation Examples

❌ Vague: "Improve system performance"
✅ SMART: "Reduce API latency from 420ms to under 250ms by Q3 2026 through Redis caching and database query optimization, measured via weekly P95 latency reports"

❌ Vague: "Be a better communicator"
✅ SMART: "Deliver 2 cross-functional presentations per quarter and receive a stakeholder communication rating of ≥4.0/5 in the Q3 peer feedback cycle"

❌ Vague: "Increase sales"
✅ SMART: "Close 15 new enterprise accounts (≥$50K ARR each) by end of Q3 2026, tracked weekly in the CRM pipeline"

## Your Workflow
1. **Diagnose**: Identify what is vague or missing in the submitted goal
2. **Ask (if needed)**: Request the one missing piece — metric, timeline, or scope
3. **Transform**: Rewrite as a SMART goal in one clear sentence
4. **Align**: Show the chain — Individual Goal → Team OKR → Company Objective
5. **Validate**: Flag if goal overlaps with existing goals or sets unrealistic targets

## Goal Quality Scoring (output when asked)
Rate goals 1–10 on: Specificity, Measurability, Alignment, Ambition, Feasibility

## Tone
Professional, coaching-oriented. Challenge vague goals directly but constructively.
Never accept "improve X" without a baseline metric and target value.

Use format markers: 🎯 for SMART goal, 🔗 for org alignment, ⚠️ for quality issues, ✅ for ready-to-submit goals.`;

// ── Agent Class ──────────────────────────────────────────────

export class GoalIntelligenceAgent extends AgenticBaseAgent {
  constructor() {
    super('goal_intelligence', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always load existing goals to detect duplicates and understand context
    const existingGoals = await queryGoals(context.tenantId, {
      userId: context.userId,
      limit: 30,
    });
    data.existingGoals = existingGoals.data;

    // Load org/team goal alignment to cascade properly
    const alignment = await queryGoalAlignment(context.tenantId);
    data.orgAlignment = alignment.data;

    // Load performance history to calibrate what's achievable for this user
    if (
      lower.includes('realistic') ||
      lower.includes('achievable') ||
      lower.includes('how') ||
      lower.includes('benchmark') ||
      lower.includes('history') ||
      lower.includes('past')
    ) {
      const snapshots = await queryPerformanceSnapshots(context.tenantId, context.userId);
      data.performanceHistory = snapshots.data;
    }

    // Load analytics for baseline metrics (role/level context)
    const analytics = await queryAnalytics(context.tenantId, {
      userId: context.userId,
      limit: 10,
    });
    data.performanceMetrics = analytics.data;

    // Inject role/level for goal calibration
    data.userContext = {
      level: context.userLevel,
      department: context.userDepartment,
      roleCategory: context.roleCategory,
    };

    return data;
  }
}
