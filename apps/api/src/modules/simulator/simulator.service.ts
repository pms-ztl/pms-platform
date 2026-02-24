import { prisma } from '@pms/database';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SimulationInput {
  scenarioType: 'rating_change' | 'promotion' | 'career_paths' | 'team_restructure' | 'budget_allocation';
  employeeId?: string;
  teamId?: string;
  parameters: Record<string, unknown>;
}

export interface SimulationImpact {
  area: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  direction: 'positive' | 'negative' | 'neutral';
  value?: number;
}

export interface SimulationResult {
  scenarioType: string;
  confidence: number;
  impacts: SimulationImpact[];
  cascadingEffects: Array<{ trigger: string; effect: string; probability: number }>;
  recommendations: Array<{ title: string; description: string; priority: string }>;
  constraints: Array<{ name: string; violated: boolean; message: string }>;
}

// ── Simulator Service ─────────────────────────────────────────────────────────

class SimulatorService {
  async runSimulation(tenantId: string, input: SimulationInput): Promise<SimulationResult> {
    switch (input.scenarioType) {
      case 'rating_change':
        return this.simulateRatingChange(tenantId, input);
      case 'promotion':
        return this.simulatePromotion(tenantId, input);
      case 'career_paths':
        return this.simulateCareerPaths(tenantId, input);
      case 'team_restructure':
        return this.simulateTeamRestructure(tenantId, input);
      case 'budget_allocation':
        return this.simulateBudgetAllocation(tenantId, input);
      default:
        throw new Error(`Unknown scenario type: ${input.scenarioType}`);
    }
  }

  // ── Rating Change Simulation ────────────────────────────────────────────────

  private async simulateRatingChange(tenantId: string, input: SimulationInput): Promise<SimulationResult> {
    const newRating  = Number(input.parameters.newRating ?? 3);
    const prevRating = Number(input.parameters.previousRating ?? 3);
    const delta      = newRating - prevRating;

    let employee: { firstName: string; lastName: string; level: number | null; department: { name: string } | null } | null = null;
    if (input.employeeId) {
      employee = await prisma.user.findFirst({
        where: { id: input.employeeId, tenantId },
        select: { firstName: true, lastName: true, level: true, department: { select: { name: true } } },
      });
    }

    const name = employee ? `${employee.firstName} ${employee.lastName}` : 'Employee';

    const impacts: SimulationImpact[] = [
      {
        area: 'Performance Score',
        description: `${name}'s CPIS score will shift by approximately ${(delta * 12).toFixed(1)} points`,
        severity: Math.abs(delta) >= 2 ? 'high' : Math.abs(delta) >= 1 ? 'medium' : 'low',
        direction: delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral',
        value: parseFloat((delta * 12).toFixed(1)),
      },
      {
        area: 'Team Morale',
        description: delta > 0
          ? 'Increased rating may positively influence peer motivation'
          : 'Decreased rating may require coaching support to avoid disengagement',
        severity: Math.abs(delta) >= 2 ? 'medium' : 'low',
        direction: delta >= 0 ? 'positive' : 'negative',
      },
      {
        area: 'Compensation Eligibility',
        description: newRating >= 4
          ? 'Employee will qualify for merit increase consideration'
          : newRating <= 2
          ? 'Employee may be placed on performance improvement plan'
          : 'No immediate compensation impact expected',
        severity: newRating >= 4 || newRating <= 2 ? 'high' : 'low',
        direction: newRating >= 4 ? 'positive' : newRating <= 2 ? 'negative' : 'neutral',
      },
      {
        area: 'Goal Target Adjustment',
        description: `Rating change may trigger re-calibration of ${name}'s goal targets for next cycle`,
        severity: 'low',
        direction: 'neutral',
      },
    ];

    return {
      scenarioType: 'rating_change',
      confidence: 0.82,
      impacts,
      cascadingEffects: [
        { trigger: 'Rating update', effect: 'Recalculated performance percentile', probability: 1.0 },
        { trigger: 'Rating update', effect: 'Compensation band eligibility change', probability: newRating >= 4 ? 0.75 : 0.3 },
        { trigger: 'Rating update', effect: '1-on-1 meeting flagged for manager', probability: Math.abs(delta) >= 1 ? 0.9 : 0.4 },
      ],
      recommendations: [
        {
          title: 'Document Rating Rationale',
          description: 'Ensure rating change is backed by specific evidence and behavioural examples',
          priority: 'high',
        },
        {
          title: 'Schedule Feedback Session',
          description: `Discuss rating change with ${name} within 5 business days`,
          priority: Math.abs(delta) >= 1 ? 'high' : 'medium',
        },
        {
          title: 'Update Development Plan',
          description: delta < 0
            ? 'Create a targeted improvement plan with clear milestones'
            : 'Identify stretch goals that leverage the improved performance rating',
          priority: 'medium',
        },
      ],
      constraints: [
        {
          name: 'Calibration Lock',
          violated: false,
          message: 'Rating can be changed if review cycle calibration has not been finalised',
        },
        {
          name: 'Rating Range',
          violated: newRating < 1 || newRating > 5,
          message: 'Rating must be between 1 and 5',
        },
      ],
    };
  }

  // ── Promotion Simulation ────────────────────────────────────────────────────

  private async simulatePromotion(tenantId: string, input: SimulationInput): Promise<SimulationResult> {
    const targetLevel    = Number(input.parameters.targetLevel ?? 0);
    const salaryIncrease = Number(input.parameters.salaryIncrease ?? 0);

    let employee: { firstName: string; lastName: string; level: number | null } | null = null;
    if (input.employeeId) {
      employee = await prisma.user.findFirst({
        where: { id: input.employeeId, tenantId },
        select: { firstName: true, lastName: true, level: true },
      });
    }
    const name = employee ? `${employee.firstName} ${employee.lastName}` : 'Employee';
    const currentLevel = employee?.level ?? 0;

    // Count open seats at target level across tenant
    const usersAtTargetLevel = await prisma.user.count({ where: { tenantId, level: targetLevel } });

    return {
      scenarioType: 'promotion',
      confidence: 0.78,
      impacts: [
        {
          area: 'Budget Impact',
          description: `Estimated annual compensation increase: ${salaryIncrease > 0 ? `${salaryIncrease}%` : 'to be determined based on compensation bands'}`,
          severity: salaryIncrease > 20 ? 'high' : salaryIncrease > 10 ? 'medium' : 'low',
          direction: 'neutral',
          value: salaryIncrease,
        },
        {
          area: 'Team Hierarchy',
          description: `${name} will move from Level ${currentLevel} to Level ${targetLevel}. There are currently ${usersAtTargetLevel} employees at Level ${targetLevel}.`,
          severity: 'medium',
          direction: 'positive',
        },
        {
          area: 'Responsibility Scope',
          description: `Promotion will expand ${name}'s scope of responsibilities and accountability level`,
          severity: 'medium',
          direction: 'positive',
        },
        {
          area: 'Peer Perception',
          description: 'Visible recognition may boost broader team engagement and set performance benchmarks',
          severity: 'low',
          direction: 'positive',
        },
      ],
      cascadingEffects: [
        { trigger: 'Promotion approved', effect: 'Compensation band reclassification', probability: 0.95 },
        { trigger: 'Promotion approved', effect: 'Role permissions and access level update', probability: 1.0 },
        { trigger: 'Promotion approved', effect: 'Reporting structure re-alignment', probability: 0.6 },
        { trigger: 'Promotion approved', effect: 'New goal targets set for next cycle', probability: 0.9 },
      ],
      recommendations: [
        {
          title: 'Verify Budget Approval',
          description: 'Ensure the compensation increase is within approved headcount budget',
          priority: 'high',
        },
        {
          title: 'Prepare Transition Plan',
          description: `Create a 30-60-90 day plan for ${name}'s new responsibilities`,
          priority: 'high',
        },
        {
          title: 'Communicate to Team',
          description: 'Announce promotion through official channels to reinforce transparent culture',
          priority: 'medium',
        },
      ],
      constraints: [
        {
          name: 'Budget Availability',
          violated: false,
          message: 'Verify that headcount budget has been approved for this level upgrade',
        },
        {
          name: 'Tenure Requirement',
          violated: false,
          message: 'Most promotion policies require a minimum of 12 months at current level',
        },
        {
          name: 'Performance Rating',
          violated: false,
          message: 'Promotion eligibility typically requires a rating of 4 or above in the last cycle',
        },
      ],
    };
  }

  // ── Career Paths Simulation ─────────────────────────────────────────────────

  private async simulateCareerPaths(tenantId: string, input: SimulationInput): Promise<SimulationResult> {
    const targetRole = String(input.parameters.targetRole ?? 'Senior Individual Contributor');

    let employee: { firstName: string; lastName: string; level: number | null; jobTitle: string | null } | null = null;
    if (input.employeeId) {
      employee = await prisma.user.findFirst({
        where: { id: input.employeeId, tenantId },
        select: { firstName: true, lastName: true, level: true, jobTitle: true },
      });
    }
    const name = employee ? `${employee.firstName} ${employee.lastName}` : 'Employee';

    return {
      scenarioType: 'career_paths',
      confidence: 0.71,
      impacts: [
        {
          area: 'Skill Gap',
          description: `Moving to ${targetRole} requires acquiring specific technical and leadership competencies`,
          severity: 'high',
          direction: 'neutral',
        },
        {
          area: 'Timeline',
          description: `Estimated 12-24 months to reach ${targetRole} based on current trajectory`,
          severity: 'medium',
          direction: 'neutral',
        },
        {
          area: 'Development Investment',
          description: 'Training, mentorship, and stretch assignments will be required',
          severity: 'medium',
          direction: 'positive',
        },
        {
          area: 'Retention Risk',
          description: 'Clear career path visibility significantly reduces flight risk',
          severity: 'high',
          direction: 'positive',
        },
      ],
      cascadingEffects: [
        { trigger: 'Career path defined', effect: 'Development plan updated with milestones', probability: 0.95 },
        { trigger: 'Career path defined', effect: 'Mentoring assignment created', probability: 0.7 },
        { trigger: 'Career path defined', effect: 'Skill assessment scheduled', probability: 0.85 },
      ],
      recommendations: [
        {
          title: 'Create Development Plan',
          description: `Build a structured 12-month development plan for ${name} targeting ${targetRole}`,
          priority: 'high',
        },
        {
          title: 'Assign Mentor',
          description: `Connect ${name} with a senior employee currently in or near the ${targetRole} role`,
          priority: 'high',
        },
        {
          title: 'Identify Stretch Assignments',
          description: 'Find projects that build the required competencies over the next 6 months',
          priority: 'medium',
        },
      ],
      constraints: [
        {
          name: 'Skill Readiness',
          violated: false,
          message: 'Employee must demonstrate core competencies before role transition',
        },
        {
          name: 'Vacancy Availability',
          violated: false,
          message: 'Target role must have an open headcount slot',
        },
      ],
    };
  }

  // ── Team Restructure Simulation ─────────────────────────────────────────────

  private async simulateTeamRestructure(tenantId: string, input: SimulationInput): Promise<SimulationResult> {
    const moveCount = Number(input.parameters.employeeCount ?? 1);

    let teamSize = 0;
    if (input.teamId) {
      teamSize = await prisma.user.count({ where: { tenantId, managerId: input.teamId } });
    }

    return {
      scenarioType: 'team_restructure',
      confidence: 0.68,
      impacts: [
        {
          area: 'Team Productivity',
          description: `Moving ${moveCount} employee${moveCount > 1 ? 's' : ''} will temporarily reduce productivity by an estimated 10-15% during transition`,
          severity: moveCount > 3 ? 'high' : 'medium',
          direction: 'negative',
          value: -12,
        },
        {
          area: 'Knowledge Transfer',
          description: 'Institutional knowledge gaps may emerge — documentation handover is critical',
          severity: 'high',
          direction: 'negative',
        },
        {
          area: 'Long-term Performance',
          description: 'Well-planned restructures typically improve performance by 15-25% within 6 months',
          severity: 'medium',
          direction: 'positive',
          value: 20,
        },
        {
          area: 'Reporting Lines',
          description: `${teamSize > 0 ? `Current team size: ${teamSize}. ` : ''}New reporting lines will need to be established and communicated`,
          severity: 'medium',
          direction: 'neutral',
        },
      ],
      cascadingEffects: [
        { trigger: 'Restructure initiated', effect: 'Manager dashboard updated with new direct reports', probability: 1.0 },
        { trigger: 'Restructure initiated', effect: 'Goal ownership re-assignment required', probability: 0.85 },
        { trigger: 'Restructure initiated', effect: 'Access permissions review', probability: 0.9 },
        { trigger: 'Restructure initiated', effect: 'Affected employees may require 1-on-1 check-ins', probability: 0.95 },
      ],
      recommendations: [
        {
          title: 'Communicate Early',
          description: 'Announce restructure decisions at least 2 weeks before effective date',
          priority: 'high',
        },
        {
          title: 'Create Handover Documents',
          description: 'Require outgoing team members to document all active projects and responsibilities',
          priority: 'high',
        },
        {
          title: 'Plan Integration Period',
          description: 'Allow 4-6 weeks for new team members to fully integrate before measuring performance',
          priority: 'medium',
        },
      ],
      constraints: [
        {
          name: 'HR Policy',
          violated: false,
          message: 'Restructures must follow company change management policy and notice periods',
        },
        {
          name: 'Active Projects',
          violated: false,
          message: 'Check for active project dependencies before moving employees',
        },
      ],
    };
  }

  // ── Budget Allocation Simulation ─────────────────────────────────────────────

  private async simulateBudgetAllocation(tenantId: string, input: SimulationInput): Promise<SimulationResult> {
    const totalBudget  = Number(input.parameters.totalBudget ?? 0);
    const meritPct     = Number(input.parameters.meritPercent ?? 60);
    const developPct   = Number(input.parameters.developmentPercent ?? 25);
    const bonusPct     = 100 - meritPct - developPct;

    const meritAmount  = totalBudget * (meritPct / 100);
    const developAmount= totalBudget * (developPct / 100);
    const bonusAmount  = totalBudget * (bonusPct / 100);

    const userCount = await prisma.user.count({ where: { tenantId, archivedAt: null } });
    const perHead   = userCount > 0 ? totalBudget / userCount : 0;

    return {
      scenarioType: 'budget_allocation',
      confidence: 0.85,
      impacts: [
        {
          area: 'Merit Increases',
          description: `${meritPct}% (${totalBudget > 0 ? `$${meritAmount.toLocaleString()}` : 'TBD'}) allocated to merit-based salary increases`,
          severity: meritPct >= 50 ? 'high' : 'medium',
          direction: 'positive',
          value: meritPct,
        },
        {
          area: 'Development Budget',
          description: `${developPct}% (${totalBudget > 0 ? `$${developAmount.toLocaleString()}` : 'TBD'}) for training, conferences, and learning programs`,
          severity: developPct >= 20 ? 'medium' : 'low',
          direction: 'positive',
          value: developPct,
        },
        {
          area: 'Bonus Pool',
          description: `${bonusPct}% (${totalBudget > 0 ? `$${bonusAmount.toLocaleString()}` : 'TBD'}) available for performance bonuses`,
          severity: bonusPct >= 20 ? 'medium' : 'low',
          direction: 'positive',
          value: bonusPct,
        },
        {
          area: 'Per-Employee Average',
          description: userCount > 0
            ? `Average of $${perHead.toFixed(0)} per active employee (${userCount} total)`
            : 'Per-employee amount will be calculated based on active headcount',
          severity: 'low',
          direction: 'neutral',
          value: Math.round(perHead),
        },
      ],
      cascadingEffects: [
        { trigger: 'Budget approved', effect: 'Compensation reviews triggered for all eligible employees', probability: 0.95 },
        { trigger: 'Merit pool released', effect: 'High performers receive above-average increases', probability: 0.8 },
        { trigger: 'Development budget released', effect: 'Training requests unlocked for managers', probability: 0.9 },
      ],
      recommendations: [
        {
          title: 'Prioritise High Performers',
          description: `Allocate a higher proportion of the merit pool to employees rated 4-5 to ensure retention`,
          priority: 'high',
        },
        {
          title: 'Link Development to Goals',
          description: 'Require that development budget requests are tied to active goals or skill gaps',
          priority: 'medium',
        },
        {
          title: 'Communicate Budget Timeline',
          description: 'Give managers a clear calendar for compensation discussions and offer letters',
          priority: 'high',
        },
      ],
      constraints: [
        {
          name: 'Budget Availability',
          violated: totalBudget <= 0,
          message: totalBudget <= 0 ? 'Total budget must be specified to run this simulation' : 'Budget is within specified limits',
        },
        {
          name: 'Allocation Percentages',
          violated: meritPct + developPct > 100,
          message: meritPct + developPct > 100
            ? 'Merit and Development percentages exceed 100%'
            : 'Allocation percentages are valid',
        },
      ],
    };
  }
}

export const simulatorService = new SimulatorService();
