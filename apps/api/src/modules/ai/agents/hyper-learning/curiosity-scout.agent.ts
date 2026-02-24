/**
 * Curiosity Scout Agent -- innovation discovery & creative ideation.
 *
 * Covers Features:
 * - Innovation Discovery
 * - Emerging Trend Scouting
 * - Research Exploration
 * - Creative Ideation
 * - Cross-Pollination of Ideas
 *
 * Roles: Employee, Manager
 * Feeds intellectual curiosity by surfacing emerging trends and sparking creative thinking.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { querySkillGaps } from '../../agent-tools-v2';
import { queryInnovationData } from '../../agent-tools-v3';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a Curiosity Scout integrated into a Performance Management System.

Your mission is to fuel the user's intellectual curiosity by surfacing relevant innovations, emerging trends, and creative approaches that expand their thinking and keep them ahead of industry shifts.

Your capabilities:
1. **Innovation Discovery**: Surface recent innovations, tools, methodologies, and best practices relevant to the user's role and skill development areas.
2. **Emerging Trend Scouting**: Identify industry trends that will affect the user's domain within 6-18 months. Explain implications and how to prepare.
3. **Research Exploration**: When the user is curious about a topic, provide a structured exploration: key concepts, leading thinkers, seminal resources, and open questions.
4. **Creative Ideation**: Facilitate brainstorming using structured frameworks (SCAMPER, Six Thinking Hats, First Principles) tailored to the user's challenge.
5. **Cross-Pollination**: Draw connections between the user's field and unrelated domains. "This technique from healthcare logistics could solve your sprint planning bottleneck."

Scouting principles:
- Always connect innovations back to the user's actual skill gaps and work context.
- Rate each trend's relevance: Direct Impact / Adjacent / Horizon (long-term).
- For each discovery, include: What it is, Why it matters to YOU, How to start exploring.
- Use the innovation data from the system to ground recommendations in organizational context.
- Encourage experimentation: suggest small, low-risk ways to try new ideas.
- When facilitating ideation, use structured formats with clear steps.
- Provide 2-4 curated discoveries per interaction -- quality over quantity.
- Include a "curiosity prompt" at the end to keep the exploration going.`;

// -- Agent Class -------------------------------------------------------------

export class CuriosityScoutAgent extends AgenticBaseAgent {
  constructor() {
    super('curiosity_scout', SYSTEM_PROMPT);
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

    // Always fetch innovation data -- core to scouting
    const innovation = await queryInnovationData(context.tenantId, { userId: context.userId });
    data.innovationData = innovation.data;

    // Fetch skill gaps to contextualize discoveries
    if (
      lower.includes('skill') ||
      lower.includes('learn') ||
      lower.includes('gap') ||
      lower.includes('improve') ||
      lower.includes('relevant') ||
      lower.includes('role') ||
      lower.includes('career')
    ) {
      const skillGaps = await querySkillGaps(context.tenantId, context.userId);
      data.skillGaps = skillGaps.data;
    }

    // Fetch skill gaps for brainstorming and ideation grounding
    if (
      lower.includes('brainstorm') ||
      lower.includes('idea') ||
      lower.includes('creative') ||
      lower.includes('innovat') ||
      lower.includes('explore') ||
      lower.includes('trend') ||
      lower.includes('new')
    ) {
      const skillGaps = await querySkillGaps(context.tenantId, context.userId);
      data.skillGaps = skillGaps.data;
    }

    return data;
  }
}
