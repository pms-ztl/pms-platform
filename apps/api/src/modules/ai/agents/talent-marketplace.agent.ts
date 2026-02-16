/**
 * Talent Marketplace Agent -- skill liquidity and internal mobility.
 *
 * Covers Features:
 * - Dynamic Skill-Liquidity Marketplace
 * - Internal Talent Mobility Matching
 * - Self-Healing Goal Ecosystems
 *
 * Roles: Employee, Manager, HR
 * Matches employees to growth opportunities, facilitates internal mobility,
 * and dynamically redistributes goals when priorities shift.
 */

import { BaseAgent, type AgentContext } from '../base-agent';
import { queryUsers, queryGoals } from '../agent-tools';
import {
  querySkillGaps,
  queryGoalAlignment,
  queryLearningProgress,
} from '../agent-tools-v2';

// ── System Prompt ───────────────────────────────────────────

const SYSTEM_PROMPT = `You are a talent marketplace coordinator for a Performance Management System.

Your mission is to continuously match employees to growth opportunities, turning performance management into a real-time talent mobility platform.

Your capabilities:
1. **Dynamic Skill-Liquidity Marketplace**: Map the organization's skill supply and demand in real time. Identify where critical skills are concentrated, where gaps exist, and which employees could fill cross-functional needs.
2. **Internal Talent Mobility Matching**: When roles open or projects need talent, match internal candidates based on skill fit, growth trajectory, and career aspirations. Prioritize internal mobility over external hiring.
3. **Self-Healing Goal Ecosystems**: When strategic priorities shift, detect orphaned or misaligned goals and recommend cascading updates. Redistribute goals to maintain team balance and organizational alignment.

Marketplace principles:
- Quantify skill matches as fit percentages (e.g., "87% skill overlap with the Data Analytics lead role").
- Highlight both ready-now candidates and develop-in-6-months candidates.
- When recommending mobility, consider employee career preferences and manager impact.
- For goal redistribution, explain the cascade logic: what changed upstream and how it ripples down.
- Present opportunities as growth-framed, never deficit-framed.
- Include estimated ramp-up time for stretch assignments.
- Show skill supply vs. demand heat maps where relevant.`;

// ── Agent Class ─────────────────────────────────────────────

export class TalentMarketplaceAgent extends BaseAgent {
  constructor() {
    super('talent_marketplace', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch current user's skill gaps for personalized matching
    const skillGaps = await querySkillGaps(context.tenantId, context.userId);
    data.mySkillGaps = skillGaps.data;

    // Always fetch active goals for goal ecosystem management
    const goals = await queryGoals(context.tenantId, {
      userId: context.userId,
      status: 'active',
      limit: 20,
    });
    data.activeGoals = goals.data;

    // Goal alignment for detecting misaligned or orphaned goals
    const alignment = await queryGoalAlignment(context.tenantId);
    data.goalAlignment = alignment.data;

    // Talent search -- fetch users by skill/level for mobility matching
    if (
      lower.includes('match') ||
      lower.includes('mobil') ||
      lower.includes('role') ||
      lower.includes('candidate') ||
      lower.includes('talent') ||
      lower.includes('hire') ||
      lower.includes('transfer') ||
      lower.includes('opportunity')
    ) {
      const candidates = await queryUsers(context.tenantId, {
        isActive: true,
        limit: 50,
      });
      data.availableTalent = candidates.data;
    }

    // Learning progress for development-readiness assessment
    if (
      lower.includes('skill') ||
      lower.includes('learn') ||
      lower.includes('develop') ||
      lower.includes('ready') ||
      lower.includes('grow') ||
      lower.includes('ramp')
    ) {
      const learning = await queryLearningProgress(context.tenantId, context.userId);
      data.learningProgress = learning.data;
    }

    // Goal redistribution -- fetch broader goal landscape
    if (
      lower.includes('redistribute') ||
      lower.includes('rebalance') ||
      lower.includes('realign') ||
      lower.includes('cascade') ||
      lower.includes('orphan') ||
      lower.includes('shift') ||
      lower.includes('priority')
    ) {
      const allGoals = await queryGoals(context.tenantId, {
        status: 'active',
        limit: 50,
      });
      data.organizationGoals = allGoals.data;
    }

    return data;
  }
}

// ── Singleton Export ─────────────────────────────────────────

export const talentMarketplaceAgent = new TalentMarketplaceAgent();
