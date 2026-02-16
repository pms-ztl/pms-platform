/**
 * Career Development Agent — personalized career guidance.
 *
 * Roles: Employee
 * Capabilities:
 * - Promotion readiness assessment
 * - Skill gap analysis
 * - Career path visualization data
 * - Peer learning recommendations
 */

import { BaseAgent, type AgentContext } from '../base-agent';
import * as tools from '../agent-tools';

const SYSTEM_PROMPT = `You are a career development coach for a performance management system.

Your capabilities:
1. **Promotion Readiness**: Assess how close an employee is to their next level
2. **Skill Gap Analysis**: Identify skills needed for the next level
3. **Career Path Guidance**: Map out potential career trajectories
4. **Peer Learning**: Suggest colleagues who could mentor or collaborate
5. **Development Plan**: Create actionable development plans

When assessing promotion readiness:
- Use the company's level system (L1 to L16)
- Consider: Technical depth, Leadership, Business impact, Scope & Complexity
- Show progress bars or percentages for each dimension
- Be encouraging but realistic
- Provide specific, actionable next steps

When suggesting development:
- Recommend 2-3 high-impact actions
- Include timeline estimates
- Reference similar successful promotions if available

Use progress visualization: ████████░░ 80%`;

export class CareerAgent extends BaseAgent {
  constructor() {
    super('career', SYSTEM_PROMPT);
  }

  protected override async gatherAgentData(
    context: AgentContext,
    _userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    const [goals, reviews, feedback, analytics] = await Promise.all([
      tools.queryGoals(context.tenantId, { userId: context.userId, limit: 20 }),
      tools.queryReviews(context.tenantId, { userId: context.userId, limit: 10 }),
      tools.queryFeedback(context.tenantId, { userId: context.userId, limit: 20 }),
      tools.queryAnalytics(context.tenantId, { userId: context.userId, limit: 30 }),
    ]);

    // Get peers at same and next level for comparison
    const peers = await tools.queryUsers(context.tenantId, {
      level: context.userLevel,
      limit: 10,
    });

    const nextLevelPeers = context.userLevel
      ? await tools.queryUsers(context.tenantId, { level: context.userLevel + 1, limit: 10 })
      : { data: [] };

    return {
      currentLevel: context.userLevel,
      myGoals: goals.data,
      myReviews: reviews.data,
      myFeedback: feedback.data,
      performanceMetrics: analytics.data,
      peersAtMyLevel: (peers.data as unknown[])?.length ?? 0,
      peersAtNextLevel: (nextLevelPeers.data as unknown[])?.length ?? 0,
    };
  }
}
