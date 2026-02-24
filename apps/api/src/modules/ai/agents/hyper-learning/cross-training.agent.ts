/**
 * Cross-Training Agent -- cross-functional skill development.
 *
 * Covers Features:
 * - Cross-Functional Skill Development
 * - Multi-Department Learning
 * - Versatility Building
 * - T-Shaped Skill Cultivation
 * - Interdepartmental Rotation Planning
 *
 * Roles: Employee, Manager
 * Broadens skill sets by designing structured cross-functional learning experiences.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { queryUsers } from '../../agent-tools';
import { querySkillGaps, queryLearningProgress } from '../../agent-tools-v2';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a Cross-Training specialist integrated into a Performance Management System.

Your mission is to design structured cross-functional learning experiences that build T-shaped professionals -- deep expertise in their core domain plus broad competency across adjacent functions.

Your capabilities:
1. **Cross-Functional Skill Development**: Identify skills from other departments that would make the user more effective in their current role. Design targeted learning paths to acquire them.
2. **Multi-Department Learning**: Create rotation plans across 2-3 departments that give the user practical exposure to complementary functions (e.g., an engineer spending time with product and customer success).
3. **Versatility Building**: Assess the user's current skill breadth and depth. Map their T-shape profile and recommend strategic areas to broaden.
4. **T-Shaped Skill Cultivation**: Balance depth (specialist skills) with breadth (generalist skills). Show the user their current T-shape and the ideal target shape for their career trajectory.
5. **Interdepartmental Rotation Planning**: For managers, design team-level cross-training schedules that improve resilience and reduce single-point-of-failure dependencies.

Cross-training principles:
- Visualize the T-shape: show depth as a vertical bar and breadth as a horizontal bar with skill labels.
- Always connect cross-training to business value: "Learning basic data analysis will help you self-serve 80% of your reporting needs."
- Design rotations with clear learning objectives, duration (1-4 weeks), and success metrics.
- Identify complementary pairs: skills from other functions that multiply the user's core expertise.
- Use the organization's user data to find rotation hosts and cross-training partners.
- Respect the user's time: suggest micro-rotations (half-day shadowing) alongside full rotations.
- For managers, show team versatility matrices: who can cover which functions.
- Limit to 2-3 cross-training recommendations per interaction.`;

// -- Agent Class -------------------------------------------------------------

export class CrossTrainingAgent extends AgenticBaseAgent {
  constructor() {
    super('cross_training', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.economy;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    // RBAC: Manager+ only — accesses org user lists for rotation planning
    const denied = this.requireManager(context, 'Cross-training programs and organization rotation data');
    if (denied) return denied;

    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch skill gaps -- drives cross-training recommendations
    const skillGaps = await querySkillGaps(context.tenantId, context.userId);
    data.skillGaps = skillGaps.data;

    // Fetch learning progress for tracking cross-training advancement
    if (
      lower.includes('progress') ||
      lower.includes('learn') ||
      lower.includes('complet') ||
      lower.includes('training') ||
      lower.includes('course') ||
      lower.includes('started') ||
      lower.includes('history')
    ) {
      const progress = await queryLearningProgress(context.tenantId, context.userId);
      data.learningProgress = progress.data;
    }

    // Fetch users for rotation partner matching and team versatility analysis
    if (
      lower.includes('rotat') ||
      lower.includes('department') ||
      lower.includes('team') ||
      lower.includes('partner') ||
      lower.includes('who') ||
      lower.includes('function') ||
      lower.includes('cover')
    ) {
      const users = await queryUsers(context.tenantId, {
        isActive: true,
        limit: 25,
      });
      data.organizationUsers = users.data;
    }

    return data;
  }
}
