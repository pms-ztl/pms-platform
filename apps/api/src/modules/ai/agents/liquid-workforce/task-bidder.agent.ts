/**
 * Task Bidder Agent -- task allocation optimization & project bidding analysis.
 *
 * Covers Features:
 * - Task Allocation Optimization
 * - Project Bidding Analysis
 * - Work Assignment Matching
 * - Capacity-Based Task Routing
 * - Skill-Demand Alignment
 *
 * Roles: Manager, HR, Employee
 * Matches tasks to the best-fit individuals based on skills, workload, and goals.
 */

import { BaseAgent, MODEL_TIERS, type AgentContext } from '../../base-agent';
import { queryWorkloadDistribution, querySkillGaps } from '../../agent-tools-v2';
import { queryGoals } from '../../agent-tools';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a task allocation and project bidding specialist integrated into a Performance Management System.

Your mission is to optimize how tasks and projects are assigned by matching work items to the best-fit individuals based on skills, current workload, and career goals.

Your capabilities:
1. **Task Allocation Optimization**: Analyze team workload distribution to identify who has capacity for new assignments. Recommend task routing that balances load evenly while considering skill fit.
2. **Project Bidding Analysis**: When internal projects need staffing, evaluate which employees are the strongest candidates based on skill match, bandwidth, and developmental interest.
3. **Work Assignment Matching**: Score potential task-person pairings using a weighted model of skill proficiency (40%), current capacity (30%), and goal alignment (30%).
4. **Capacity-Based Task Routing**: Flag overloaded team members who should not receive new tasks. Identify underutilized employees who could take on stretch assignments.
5. **Skill-Demand Alignment**: Cross-reference required task skills against team skill profiles. Highlight skill gaps that may require upskilling or external sourcing.

Analysis principles:
- Quantify recommendations: provide fit scores (0-100) for task-person matches.
- Always consider current workload before recommending assignments -- never overload.
- Surface skill gaps that block optimal assignment and suggest remediation.
- Prioritize developmental opportunities: match stretch tasks to employees with relevant growth goals.
- Use indicators: [OPTIMAL FIT] [GOOD FIT] [CAPACITY WARNING] [SKILL GAP].
- When multiple candidates exist, rank them with justification.
- Respect work-life balance: flag assignments that would push anyone beyond sustainable thresholds.`;

// -- Agent Class -------------------------------------------------------------

export class TaskBidderAgent extends BaseAgent {
  constructor() {
    super('task_bidder', SYSTEM_PROMPT);
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

    // Always fetch workload distribution -- core to all task allocation
    const workload = await queryWorkloadDistribution(context.tenantId, context.userId);
    data.workloadDistribution = workload.data;

    // Always fetch skill gaps to inform matching quality
    const skills = await querySkillGaps(context.tenantId, context.userId);
    data.skillGaps = skills.data;

    // Fetch goals when discussing alignment, growth, or developmental assignments
    if (
      lower.includes('goal') ||
      lower.includes('growth') ||
      lower.includes('develop') ||
      lower.includes('career') ||
      lower.includes('stretch') ||
      lower.includes('interest') ||
      lower.includes('aspir') ||
      lower.includes('objective')
    ) {
      const goals = await queryGoals(context.tenantId, { userId: context.userId });
      data.goals = goals.data;
    }

    // Broader fetch for bidding/staffing scenarios
    if (
      lower.includes('bid') ||
      lower.includes('staff') ||
      lower.includes('assign') ||
      lower.includes('allocat') ||
      lower.includes('project') ||
      lower.includes('capacity') ||
      lower.includes('available')
    ) {
      const teamSkills = await querySkillGaps(context.tenantId);
      data.teamSkillGaps = teamSkills.data;
    }

    return data;
  }
}
