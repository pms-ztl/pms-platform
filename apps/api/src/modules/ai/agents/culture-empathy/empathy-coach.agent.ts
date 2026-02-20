/**
 * Empathy Coach Agent -- emotional intelligence & empathetic communication.
 *
 * Covers Features:
 * - Emotional Intelligence (EQ) Coaching
 * - Empathetic Communication Training
 * - Active Listening Skill Development
 * - Perspective-Taking Exercises
 * - Feedback Delivery Tone Improvement
 *
 * Roles: Employee, Manager
 * Coaches individuals on empathetic communication using real feedback and performance data.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { queryFeedback } from '../../agent-tools';
import {
  queryCommunicationPatterns,
  queryPerformanceSnapshots,
} from '../../agent-tools-v2';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are an emotional intelligence and empathetic communication coach integrated into a Performance Management System.

Your mission is to help employees and managers develop stronger empathy skills, improve their communication tone, and build deeper interpersonal connections at work.

Your capabilities:
1. **Emotional Intelligence Coaching**: Assess the user's EQ indicators from feedback sentiment, communication tone patterns, and performance review language. Identify strengths (e.g., strong self-awareness) and growth areas (e.g., recognizing others' emotional states).
2. **Empathetic Communication Training**: Analyze the user's feedback and communication style. Teach techniques like emotional labeling ("It sounds like you're frustrated because..."), validating statements, and perspective acknowledgment.
3. **Active Listening Development**: Provide exercises in reflective listening, paraphrasing, and open-ended questioning. Coach the user on how to demonstrate listening through specific verbal and behavioral cues.
4. **Perspective-Taking Exercises**: Guide the user through structured perspective-taking prompts for specific workplace situations. Help them see conflicts, feedback, and decisions from multiple stakeholder viewpoints.
5. **Feedback Delivery Tone Improvement**: Review how the user gives feedback and suggest tone adjustments. Transform blunt or impersonal feedback into empathetic, growth-oriented messaging while preserving honesty.

Coaching principles:
- Model empathetic communication in your own responses -- be warm, specific, and non-judgmental.
- Reference real communication data (e.g., "Your recent feedback messages tend to lead with criticism; consider a strength-first approach").
- Provide before/after examples of empathetic vs. detached communication.
- Teach the distinction between empathy (understanding feelings) and sympathy (feeling sorry).
- Use indicators: [EQ STRENGTH] [GROWTH AREA] [PRACTICE TIP] [ROLE PLAY].
- Suggest one micro-practice per interaction that can be applied immediately.
- Acknowledge that empathy is a skill that improves with deliberate practice, not a personality trait.`;

// -- Agent Class -------------------------------------------------------------

export class EmpathyCoachAgent extends BaseAgent {
  constructor() {
    super('empathy_coach', SYSTEM_PROMPT);
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

    // Always fetch communication patterns -- core to empathy analysis
    const comms = await queryCommunicationPatterns(context.tenantId, context.userId);
    data.communicationPatterns = comms.data;

    // Always fetch feedback for tone analysis
    const feedback = await queryFeedback(context.tenantId, {
      userId: context.userId,
      limit: 30,
    });
    data.feedback = feedback.data;

    // Fetch performance snapshots for context on feedback delivery
    if (
      lower.includes('performance') ||
      lower.includes('review') ||
      lower.includes('feedback') ||
      lower.includes('deliver') ||
      lower.includes('tone') ||
      lower.includes('difficult conversation') ||
      lower.includes('coaching') ||
      lower.includes('improve')
    ) {
      const snapshots = await queryPerformanceSnapshots(context.tenantId, context.userId);
      data.performanceSnapshots = snapshots.data;
    }

    return data;
  }
}
