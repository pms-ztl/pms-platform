/**
 * Leave Optimizer Agent -- leave planning, PTO scheduling, and absence impact analysis.
 *
 * Covers Features:
 * - Leave Planning Optimization
 * - PTO Scheduling Recommendations
 * - Vacation Management & Balance Tracking
 * - Absence Impact Analysis
 * - Team Coverage Planning
 *
 * Roles: Employee, Manager, HR
 * Uses leave calendars, workload distribution, and team health to optimize leave planning.
 */

import { AgenticBaseAgent, MODEL_TIERS, type AgentContext } from '../../agentic-base-agent';
import { queryLeaveCalendar } from '../../agent-tools-v3';
import {
  queryWorkloadDistribution,
  queryTeamHealth,
} from '../../agent-tools-v2';

// -- System Prompt -----------------------------------------------------------

const SYSTEM_PROMPT = `You are a leave planning optimization specialist integrated into a Performance Management System.

Your mission is to help employees plan their time off effectively, help managers maintain team coverage, and optimize PTO scheduling to minimize disruption while maximizing rest and recovery.

Your capabilities:
1. **Leave Planning Optimization**: Analyze leave balances, upcoming deadlines, team schedules, and project timelines to recommend optimal leave windows. Identify periods with lower business impact for extended time off.
2. **PTO Scheduling Recommendations**: Suggest strategic PTO usage to maximize long weekends, bridge gaps between holidays, and avoid leave expiration. Consider carry-over limits and use-it-or-lose-it policies.
3. **Vacation Balance Tracking**: Present current leave balances across all leave types (annual, sick, personal, compensatory). Project balances at year-end based on current accrual rates and planned usage.
4. **Absence Impact Analysis**: Assess how a planned absence will affect team workload, ongoing projects, and deliverable timelines. Flag high-risk periods where the employee's absence would cause significant disruption.
5. **Team Coverage Planning**: For managers, analyze team-wide leave schedules to ensure adequate coverage. Flag overlapping absences and suggest staggering strategies.

Planning principles:
- Reference specific dates and balances (e.g., "You have 12 days remaining with 8 months left; consider using 4 days before Q2 close").
- Consider both the employee's well-being (rest is important) and team operational needs.
- Visualize leave data when helpful: calendars, balance projections, team coverage grids.
- Use planning indicators: [OPTIMAL] [GOOD] [CAUTION] [BLOCKED].
- Proactively warn about leave balance expiration, blackout periods, or team conflicts.
- For managers, provide a team-level view showing who is out when and where gaps exist.
- Encourage regular time off -- never suggest deferring all leave unless operationally critical.
- Account for public holidays and suggest bridge days for maximum rest efficiency.`;

// -- Agent Class -------------------------------------------------------------

export class LeaveOptimizerAgent extends AgenticBaseAgent {
  constructor() {
    super('leave_optimizer', SYSTEM_PROMPT);
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

    // Always fetch leave calendar -- core to all leave optimization
    const leave = await queryLeaveCalendar(context.tenantId, {
      userId: context.userId,
    });
    data.leaveCalendar = leave.data;

    // Fetch workload data when discussing impact, timing, or scheduling
    if (
      lower.includes('impact') ||
      lower.includes('workload') ||
      lower.includes('busy') ||
      lower.includes('deadline') ||
      lower.includes('project') ||
      lower.includes('schedule') ||
      lower.includes('when') ||
      lower.includes('best time') ||
      lower.includes('optimal')
    ) {
      const workload = await queryWorkloadDistribution(context.tenantId, context.userId);
      data.workloadDistribution = workload.data;
    }

    // Fetch team health for team coverage and overlap analysis
    if (
      lower.includes('team') ||
      lower.includes('coverage') ||
      lower.includes('overlap') ||
      lower.includes('department') ||
      lower.includes('colleagues') ||
      lower.includes('stagger') ||
      lower.includes('manager')
    ) {
      const teamHealth = await queryTeamHealth(context.tenantId, context.userId);
      data.teamHealth = teamHealth.data;

      // Also fetch team-wide leave calendar for overlap detection
      const teamLeave = await queryLeaveCalendar(context.tenantId);
      data.teamLeaveCalendar = teamLeave.data;
    }

    // Fetch broader workload context for balance/projection queries
    if (
      lower.includes('balance') ||
      lower.includes('remaining') ||
      lower.includes('accrual') ||
      lower.includes('expir') ||
      lower.includes('carry over') ||
      lower.includes('use it')
    ) {
      const workload = await queryWorkloadDistribution(context.tenantId, context.userId);
      data.workloadContext = workload.data;
    }

    return data;
  }
}
