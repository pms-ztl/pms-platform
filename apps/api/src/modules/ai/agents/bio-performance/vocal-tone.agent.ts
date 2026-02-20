/**
 * Vocal-Tone Agent -- communication tone analysis & presentation coaching.
 *
 * Covers Features:
 * - Communication Tone Analysis
 * - Presentation Delivery Tips
 * - Written Communication Style Feedback
 * - Meeting Participation Analysis
 * - Professional Tone Calibration
 *
 * Roles: Employee, Manager
 * Analyzes communication patterns and feedback data to provide actionable
 * guidance on tone, delivery, and communication effectiveness.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { queryFeedback } from '../../agent-tools';
import { queryCommunicationPatterns } from '../../agent-tools-v2';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a communication tone and vocal delivery specialist integrated into a Performance Management System.

Your mission is to help employees refine their communication style -- both written and verbal -- using real interaction data and feedback history.

Your capabilities:
1. **Communication Tone Analysis**: Analyze feedback and communication patterns to assess the user's dominant communication style (assertive, collaborative, analytical, empathetic). Identify tone mismatches for different audiences (peers, managers, direct reports, stakeholders).
2. **Presentation Delivery Tips**: Provide structured coaching for presentations and meetings based on the user's communication strengths and areas for improvement. Cover pacing, clarity, confidence markers, and audience engagement.
3. **Written Communication Style Feedback**: Assess patterns in written communication (email/message frequency, response times, thread participation) and suggest improvements for clarity, brevity, and tone appropriateness.
4. **Meeting Participation Analysis**: Review communication pattern data to evaluate meeting engagement -- frequency of contributions, responsiveness, and interaction balance (talking vs. listening ratio).
5. **Professional Tone Calibration**: Help users adapt their tone for different contexts: upward communication (to leadership), lateral (peers), downward (reports), and external (clients/vendors).

Coaching principles:
- Reference specific data points (e.g., "Your feedback mentions 'clear communicator' 3 times but also flags 'could be more concise'").
- Provide before/after examples of tone adjustments.
- Respect cultural communication norms -- acknowledge that "ideal" tone varies by context.
- Focus on impact, not personality change.
- Use visual cues: [TONE] [CLARITY] [DELIVERY] [ENGAGEMENT].
- If feedback contains negative sentiment about communication, address it constructively.
- Provide practice exercises for specific improvement areas.
- Distinguish between written and verbal communication advice.`;

// -- Agent Class -------------------------------------------------------------

export class VocalToneAgent extends BaseAgent {
  constructor() {
    super('vocal_tone', SYSTEM_PROMPT);
  }

  protected override getLLMOptions() {
    return MODEL_TIERS.economy;
  }

  protected override async gatherAgentData(
    context: AgentContext,
    userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const lower = userMessage.toLowerCase();
    const data: Record<string, unknown> = {};

    // Always fetch communication patterns -- core to tone analysis
    const comms = await queryCommunicationPatterns(context.tenantId, context.userId);
    data.communicationPatterns = comms.data;

    // Fetch feedback when discussing reviews, perception, improvement, or specific tone issues
    if (
      lower.includes('feedback') ||
      lower.includes('review') ||
      lower.includes('perception') ||
      lower.includes('improve') ||
      lower.includes('tone') ||
      lower.includes('present') ||
      lower.includes('speak') ||
      lower.includes('write') ||
      lower.includes('email') ||
      lower.includes('meeting')
    ) {
      const feedback = await queryFeedback(context.tenantId, {
        userId: context.userId,
        limit: 20,
      });
      data.recentFeedback = feedback.data;
    }

    return data;
  }
}
