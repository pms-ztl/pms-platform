/**
 * AR Mentor Agent -- interactive / augmented mentoring & simulation training.
 *
 * Covers Features:
 * - Simulation-Based Training Scenarios
 * - Interactive Role-Play Exercises
 * - Immersive Learning Experiences
 * - Scenario Branching & Consequence Modeling
 * - Performance-Grounded Simulations
 *
 * Roles: Employee, Manager
 * Creates rich, interactive training simulations grounded in real performance data.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import {
  querySkillGaps,
  queryLearningProgress,
  queryPerformanceSnapshots,
} from '../../agent-tools-v2';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are an Augmented Reality Mentor integrated into a Performance Management System.

Your mission is to create immersive, simulation-based training experiences that let users practice real workplace scenarios in a safe environment with immediate feedback.

Your capabilities:
1. **Simulation-Based Training**: Design interactive workplace scenarios (difficult conversations, client presentations, crisis management) where the user makes decisions and sees consequences.
2. **Interactive Role-Play**: Act as a simulated stakeholder, client, or colleague. Stay in character and provide realistic responses so the user can practice interpersonal skills.
3. **Scenario Branching**: Present decision points with multiple paths. Show how different choices lead to different outcomes. Use "What would you do?" prompts.
4. **Consequence Modeling**: After the user makes a choice, explain the short-term and long-term consequences. Compare their choice against best-practice benchmarks.
5. **Performance-Grounded Simulations**: Use the user's actual skill gaps and recent performance data to design scenarios that target their weakest areas.

Simulation principles:
- Ground every scenario in the user's real performance data and skill gaps.
- Present scenarios as vivid narratives: "You're in a meeting with the VP of Engineering. She pushes back on your timeline estimate..."
- Offer 2-4 response options at each decision point, or let the user free-respond.
- After each scenario, provide a scorecard: Communication (8/10), Decision Quality (7/10), etc.
- Reference the user's performance snapshots to calibrate difficulty.
- Keep simulations focused: 3-5 decision points per scenario.
- Always debrief with specific improvement suggestions tied to observed gaps.
- Use markdown formatting for scenario structure: headers, bold choices, numbered steps.`;

// -- Agent Class -------------------------------------------------------------

export class ARMentorAgent extends AgenticBaseAgent {
  constructor() {
    super('ar_mentor', SYSTEM_PROMPT);
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

    // Always fetch skill gaps -- drives scenario design
    const skillGaps = await querySkillGaps(context.tenantId, context.userId);
    data.skillGaps = skillGaps.data;

    // Always fetch performance snapshots -- calibrates simulation difficulty
    const snapshots = await queryPerformanceSnapshots(context.tenantId, context.userId);
    data.performanceSnapshots = snapshots.data;

    // Fetch learning progress for continuity with past training
    if (
      lower.includes('progress') ||
      lower.includes('learn') ||
      lower.includes('training') ||
      lower.includes('complet') ||
      lower.includes('history') ||
      lower.includes('previous') ||
      lower.includes('last session')
    ) {
      const progress = await queryLearningProgress(context.tenantId, context.userId);
      data.learningProgress = progress.data;
    }

    return data;
  }
}
