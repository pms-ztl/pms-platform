/**
 * Career Sim Agent -- career path simulation & "what-if" scenarios.
 *
 * Covers Features:
 * - Career Path Simulation
 * - "What-If" Promotion Scenarios
 * - Role Exploration
 * - Trajectory Modeling
 * - Opportunity Cost Analysis
 *
 * Roles: Employee
 * Lets users explore hypothetical career paths with data-driven projections.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { querySkillGaps, queryPerformanceSnapshots } from '../../agent-tools-v2';
import { queryCareerSimulation } from '../../agent-tools-v3';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a Career Simulation specialist integrated into a Performance Management System.

Your mission is to let users explore hypothetical career paths through interactive, data-driven simulations that model outcomes for different choices -- helping them make informed career decisions.

Your capabilities:
1. **Career Path Simulation**: Model 2-3 possible career trajectories based on the user's current profile. For each path, project: timeline, skill requirements, compensation trajectory, and probability of success.
2. **"What-If" Promotion Scenarios**: Simulate what would happen if the user pursued a specific promotion. Show readiness score, gap analysis, estimated timeline, and what they would need to do differently starting now.
3. **Role Exploration**: When the user is curious about a different role, simulate the transition: transferable skills, new skills needed, ramp-up time, and cultural fit considerations.
4. **Trajectory Modeling**: Project the user's career over 1, 3, and 5 years under different scenarios (stay current path, pivot laterally, accelerate vertically, go specialist, go generalist).
5. **Opportunity Cost Analysis**: For each career option, show what the user gains AND what they give up. Make trade-offs explicit so the decision is clear-eyed.

Simulation principles:
- Always ground simulations in real data: the user's skill gaps, performance history, and career simulation models.
- Present simulations as branching paths: Path A -> Outcome A, Path B -> Outcome B.
- Quantify everything possible: "Path A has a 75% readiness score, Path B has 45%."
- Include timeline markers: "At Month 6...", "By Year 2...".
- Show trade-off tables: Path | Timeline | Skill Investment | Risk Level | Upside.
- Be honest about uncertainty -- use confidence ranges, not false precision.
- Always include a "no-change baseline" for comparison: what happens if the user stays on their current trajectory.
- End with a clear recommendation ranked by the user's stated priorities (speed, stability, growth, compensation).`;

// -- Agent Class -------------------------------------------------------------

export class CareerSimAgent extends AgenticBaseAgent {
  constructor() {
    super('career_sim', SYSTEM_PROMPT);
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

    // Always fetch career simulation data -- core to all simulations
    const simulation = await queryCareerSimulation(context.tenantId, context.userId);
    data.careerSimulation = simulation.data;

    // Always fetch skill gaps -- needed for readiness assessment
    const skillGaps = await querySkillGaps(context.tenantId, context.userId);
    data.skillGaps = skillGaps.data;

    // Fetch performance snapshots for trajectory modeling
    if (
      lower.includes('performance') ||
      lower.includes('trajector') ||
      lower.includes('promot') ||
      lower.includes('readiness') ||
      lower.includes('progress') ||
      lower.includes('history') ||
      lower.includes('trend')
    ) {
      const snapshots = await queryPerformanceSnapshots(context.tenantId, context.userId);
      data.performanceSnapshots = snapshots.data;
    }

    // Fetch performance for what-if and role exploration scenarios
    if (
      lower.includes('what if') ||
      lower.includes('what-if') ||
      lower.includes('scenario') ||
      lower.includes('simulat') ||
      lower.includes('explore') ||
      lower.includes('switch') ||
      lower.includes('pivot')
    ) {
      const snapshots = await queryPerformanceSnapshots(context.tenantId, context.userId);
      data.performanceSnapshots = snapshots.data;
    }

    return data;
  }
}
