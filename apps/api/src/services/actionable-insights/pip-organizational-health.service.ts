/**
 * PIP Automation & Organizational Health Service
 * Features 49-50: Performance Improvement Plan Automation & Organizational Health Diagnostics
 *
 * Implements automated PIP generation with dynamic content and organizational health analytics.
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// FEATURE 49: PIP AUTOMATION
// ============================================================================

export interface PIPGenerationInput {
  tenantId: string;
  userId: string;
  createdBy: string;
  pipType: string; // PERFORMANCE, BEHAVIOR, ATTENDANCE, SKILLS
  severity: string; // STANDARD, SERIOUS, FINAL_WARNING
  performanceIssues: any[];
  duration?: number; // days, default 90
}

export class PIPAutomationService {

  /**
   * Generate Performance Improvement Plan automatically
   */
  async generatePIP(input: PIPGenerationInput) {
    const {
      tenantId,
      userId,
      createdBy,
      pipType,
      severity,
      performanceIssues,
      duration = 90
    } = input;

    // Get user data and performance history
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        performanceComparisons: {
          orderBy: { comparisonDate: 'desc' },
          take: 3
        },
        engagementScores: {
          orderBy: { scoreDate: 'desc' },
          take: 3
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate PIP title
    const pipTitle = this.generatePIPTitle(user, pipType);

    // Generate specific behaviors from issues
    const specificBehaviors = this.extractSpecificBehaviors(performanceIssues);

    // Generate impact statement
    const impactStatement = this.generateImpactStatement(performanceIssues, pipType);

    // Get previous discussions/warnings
    const previousDiscussions = await this.getPreviousDiscussions(tenantId, userId);

    // Generate performance expectations
    const performanceExpectations = this.generateExpectations(pipType, performanceIssues);

    // Generate SMART goals
    const specificGoals = this.generateSMARTGoals(performanceIssues, pipType, duration);

    // Generate measurable objectives
    const measurableObjectives = this.generateMeasurableObjectives(performanceIssues);

    // Define success criteria
    const successCriteria = this.defineSuccessCriteria(pipType, specificGoals);

    // Generate support resources
    const supportProvided = this.generateSupportResources(pipType, performanceIssues);

    // Determine training requirements
    const trainingRequired = this.determineTrainingNeeds(performanceIssues, pipType);

    // Recommend mentor
    const mentorAssigned = await this.recommendPIPMentor(tenantId, userId);

    // Generate coaching schedule
    const coachingSchedule = this.generateCoachingSchedule(duration);

    // Generate milestones
    const milestones = this.generatePIPMilestones(duration, specificGoals);

    // Generate check-in dates
    const checkInDates = this.generateCheckInDates(new Date(), duration);

    // Generate consequences statement
    const consequencesOfNonCompliance = this.generateConsequencesStatement(severity);

    // Generate escalation path
    const escalationPath = this.generateEscalationPath(severity);

    // Start and end dates
    const startDate = new Date();
    const endDate = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

    // Determine review frequency
    const reviewFrequency = duration <= 30 ? 'WEEKLY' : duration <= 60 ? 'BI_WEEKLY' : 'MONTHLY';

    // Create PIP
    const pip = await prisma.performanceImprovementPlan.create({
      data: {
        tenantId,
        userId,
        createdBy,
        pipTitle,
        pipType,
        severity,
        startDate,
        endDate,
        duration,
        reviewFrequency,
        performanceIssues,
        specificBehaviors,
        impactStatement,
        previousDiscussions,
        performanceExpectations,
        specificGoals,
        measurableObjectives,
        successCriteria,
        supportProvided,
        trainingRequired,
        mentorAssigned,
        coachingSchedule,
        milestones,
        checkInDates,
        consequencesOfNonCompliance,
        escalationPath,
        generatedBy: 'AI'
      }
    });

    // Create milestone records
    for (const milestone of milestones) {
      await prisma.pIPMilestone.create({
        data: {
          tenantId,
          pipId: pip.id,
          milestoneName: milestone.name,
          description: milestone.description,
          dueDate: milestone.dueDate,
          successCriteria: milestone.criteria,
          measurableTargets: milestone.targets
        }
      });
    }

    return pip;
  }

  private generatePIPTitle(user: any, pipType: string): string {
    const typeMap: Record<string, string> = {
      'PERFORMANCE': 'Performance Improvement Plan',
      'BEHAVIOR': 'Behavioral Correction Plan',
      'ATTENDANCE': 'Attendance Improvement Plan',
      'SKILLS': 'Skills Development Plan'
    };

    return `${typeMap[pipType]} - ${user.firstName} ${user.lastName}`;
  }

  private extractSpecificBehaviors(issues: any[]): string[] {
    return issues.map(issue => issue.behavior || issue.description).filter(Boolean);
  }

  private generateImpactStatement(issues: any[], pipType: string): string {
    const impacts = issues.map(i => i.impact).filter(Boolean);

    if (impacts.length > 0) {
      return `The following performance concerns have been identified and are impacting team productivity and business objectives: ${impacts.join('; ')}`;
    }

    const templates: Record<string, string> = {
      'PERFORMANCE': 'Current performance levels are below expected standards, impacting team deliverables and overall business results.',
      'BEHAVIOR': 'Behavioral issues are creating challenges in team dynamics and workplace culture.',
      'ATTENDANCE': 'Attendance patterns are affecting team capacity and project timelines.',
      'SKILLS': 'Skill gaps are limiting effectiveness in current role responsibilities.'
    };

    return templates[pipType] || 'Performance improvement is required to meet role expectations.';
  }

  private async getPreviousDiscussions(tenantId: string, userId: string): Promise<any[]> {
    const [feedback, oneOnOnes] = await Promise.all([
      prisma.feedback.findMany({
        where: { tenantId, toUserId: userId, type: { in: ['CONSTRUCTIVE', 'REQUEST'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { createdAt: true, type: true, content: true },
      }),
      prisma.oneOnOne.findMany({
        where: { tenantId, OR: [{ managerId: userId }, { employeeId: userId }], status: 'COMPLETED' },
        orderBy: { scheduledDate: 'desc' },
        take: 10,
        select: { scheduledDate: true, notes: true },
      }),
    ]);

    const discussions: any[] = [];
    for (const fb of feedback) {
      discussions.push({
        date: fb.createdAt,
        type: fb.type === 'REQUEST' ? 'Improvement Request' : 'Constructive Feedback',
        summary: fb.content?.substring(0, 200) || 'Performance feedback provided',
      });
    }
    for (const meeting of oneOnOnes) {
      discussions.push({
        date: meeting.scheduledDate,
        type: '1-on-1 Discussion',
        summary: (meeting.notes as string)?.substring(0, 200) || 'One-on-one meeting held',
      });
    }
    return discussions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private generateExpectations(pipType: string, issues: any[]): string {
    const templates: Record<string, string> = {
      'PERFORMANCE': 'Employee is expected to meet or exceed all performance standards for their role, including quality, timeliness, and productivity metrics.',
      'BEHAVIOR': 'Employee must demonstrate professional behavior aligned with company values and cultural expectations at all times.',
      'ATTENDANCE': 'Employee is required to maintain consistent attendance and punctuality as per company policy.',
      'SKILLS': 'Employee must develop and demonstrate proficiency in required technical and soft skills for their role.'
    };

    return templates[pipType] || 'Employee must meet all role requirements and expectations.';
  }

  private generateSMARTGoals(issues: any[], pipType: string, duration: number): any[] {
    const goals: any[] = [];

    // Generate goals based on issues
    for (let i = 0; i < Math.min(issues.length, 5); i++) {
      const issue = issues[i];
      goals.push({
        goalNumber: i + 1,
        specific: issue.goal || `Address ${issue.category || 'performance concern'}`,
        measurable: issue.metric || 'Achieve 80% or higher rating',
        achievable: `Complete required actions within ${duration} days`,
        relevant: `Directly addresses identified performance gap in ${issue.category || 'key area'}`,
        timeBound: `To be achieved by end of PIP period (${duration} days)`,
        priority: issue.priority || 'HIGH'
      });
    }

    // Add catch-all goal if less than 3 specific goals
    if (goals.length < 3) {
      goals.push({
        goalNumber: goals.length + 1,
        specific: 'Demonstrate consistent improvement in overall performance',
        measurable: 'Achieve "Meets Expectations" rating or higher',
        achievable: 'Through focused effort and utilization of provided support',
        relevant: 'Critical for continued employment',
        timeBound: `Within ${duration} days`,
        priority: 'HIGH'
      });
    }

    return goals;
  }

  private generateMeasurableObjectives(issues: any[]): any[] {
    return issues.slice(0, 5).map((issue, i) => ({
      objectiveNumber: i + 1,
      description: issue.objective || `Improve ${issue.category}`,
      metric: issue.metric || 'Performance rating',
      baseline: issue.baseline || 'Current level',
      target: issue.target || '80% or higher',
      measurementMethod: issue.measurementMethod || 'Manager assessment and performance data'
    }));
  }

  private defineSuccessCriteria(pipType: string, goals: any[]): any[] {
    const criteria: any[] = [];

    for (const goal of goals) {
      criteria.push({
        criterion: `Successfully complete Goal ${goal.goalNumber}`,
        requiredEvidence: [
          'Documented progress in weekly check-ins',
          'Measurable improvement in key metrics',
          'Positive feedback from manager and peers'
        ],
        weight: 100 / goals.length
      });
    }

    // Overall success criterion
    criteria.push({
      criterion: 'Overall Performance Assessment',
      requiredEvidence: [
        'Consistent meeting of all performance expectations',
        'No new performance issues during PIP period',
        'Positive trajectory in all measured areas'
      ],
      weight: 0,
      note: 'This is an overarching criterion that must be met'
    });

    return criteria;
  }

  private generateSupportResources(pipType: string, issues: any[]): any[] {
    const resources: any[] = [
      {
        type: 'MENTORING',
        description: 'Assigned mentor for guidance and support',
        frequency: 'Weekly 1-hour sessions'
      },
      {
        type: 'MANAGER_SUPPORT',
        description: 'Regular check-ins with direct manager',
        frequency: 'As per review frequency'
      }
    ];

    if (pipType === 'SKILLS') {
      resources.push({
        type: 'TRAINING',
        description: 'Access to required training programs',
        frequency: 'As needed'
      });
    }

    if (pipType === 'PERFORMANCE') {
      resources.push({
        type: 'TOOLS',
        description: 'Additional tools and resources for productivity',
        frequency: 'Ongoing'
      });
    }

    return resources;
  }

  private determineTrainingNeeds(issues: any[], pipType: string): string[] {
    const training: string[] = [];

    if (pipType === 'SKILLS') {
      training.push('Technical skills training relevant to role');
    }

    if (pipType === 'BEHAVIOR') {
      training.push('Professional workplace behavior training');
      training.push('Communication skills workshop');
    }

    if (pipType === 'PERFORMANCE') {
      training.push('Time management and productivity training');
      training.push('Role-specific skills refresher');
    }

    return training;
  }

  private async recommendPIPMentor(tenantId: string, userId: string): Promise<string | null> {
    // Find high-performing senior employees
    const mentors = await prisma.user.findMany({
      where: {
        tenantId,
        id: { not: userId },
        isActive: true
      },
      include: {
        performanceComparisons: {
          orderBy: { comparisonDate: 'desc' },
          take: 1
        }
      },
      take: 5
    });

    const qualified = mentors.filter(m =>
      m.performanceComparisons[0]?.performanceLevel === 'ABOVE' ||
      m.performanceComparisons[0]?.performanceLevel === 'EXCEPTIONAL'
    );

    return qualified[0]?.id || null;
  }

  private generateCoachingSchedule(duration: number): any[] {
    const schedule: any[] = [];
    const weeklyFreq = duration <= 30 ? 1 : duration <= 60 ? 2 : 4;

    for (let week = weeklyFreq; week <= duration / 7; week += weeklyFreq) {
      schedule.push({
        week,
        date: new Date(Date.now() + week * 7 * 24 * 60 * 60 * 1000),
        topic: `Week ${week} Coaching Session`,
        focus: week <= duration / 14 ? 'Goal setting and initial progress' :
               week <= duration / 7 * 0.7 ? 'Mid-point review and adjustments' :
               'Final assessment and next steps'
      });
    }

    return schedule;
  }

  private generatePIPMilestones(duration: number, goals: any[]): any[] {
    const milestones: any[] = [];
    const milestoneCount = duration <= 30 ? 2 : duration <= 60 ? 3 : 4;

    for (let i = 1; i <= milestoneCount; i++) {
      const dueDate = new Date(Date.now() + (duration / milestoneCount * i) * 24 * 60 * 60 * 1000);
      milestones.push({
        name: `Milestone ${i} - ${Math.floor(100 / milestoneCount * i)}% Progress`,
        description: `Demonstrate ${Math.floor(100 / milestoneCount * i)}% progress toward all PIP goals`,
        dueDate,
        criteria: goals.slice(0, Math.ceil(goals.length / milestoneCount * i)).map(g =>
          `Significant progress on Goal ${g.goalNumber}`
        ),
        targets: {
          progressPercentage: Math.floor(100 / milestoneCount * i),
          goalsOnTrack: Math.ceil(goals.length / milestoneCount * i)
        }
      });
    }

    return milestones;
  }

  private generateCheckInDates(startDate: Date, duration: number): Date[] {
    const dates: Date[] = [];
    const frequency = duration <= 30 ? 7 : duration <= 60 ? 14 : 30;

    for (let day = frequency; day <= duration; day += frequency) {
      dates.push(new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000));
    }

    return dates;
  }

  private generateConsequencesStatement(severity: string): string {
    const statements: Record<string, string> = {
      'STANDARD': 'Failure to meet the expectations outlined in this Performance Improvement Plan may result in further disciplinary action, up to and including termination of employment.',
      'SERIOUS': 'This is a serious performance matter. Failure to demonstrate substantial and sustained improvement will result in termination of employment.',
      'FINAL_WARNING': 'This Performance Improvement Plan represents a final opportunity to demonstrate acceptable performance. Any failure to meet the specified expectations will result in immediate termination of employment.'
    };

    return statements[severity] || statements['STANDARD'];
  }

  private generateEscalationPath(severity: string): any[] {
    if (severity === 'FINAL_WARNING') {
      return [
        { step: 1, action: 'Final PIP (Current)', consequence: 'Last chance to improve' },
        { step: 2, action: 'PIP Failure', consequence: 'Immediate termination' }
      ];
    }

    return [
      { step: 1, action: 'Current PIP', consequence: 'Opportunity to improve' },
      { step: 2, action: 'PIP Failure', consequence: 'Written warning and possible second PIP' },
      { step: 3, action: 'Continued underperformance', consequence: 'Final warning or termination' }
    ];
  }

  /**
   * Conduct PIP check-in
   */
  async conductCheckIn(input: {
    pipId: string;
    userId: string;
    conductedBy: string;
    progressSummary: string;
    onTrack: boolean;
    managerFeedback: string;
    tenantId: string;
  }) {
    const checkIn = await prisma.pIPCheckIn.create({
      data: {
        tenantId: input.tenantId,
        pipId: input.pipId,
        userId: input.userId,
        checkInDate: new Date(),
        checkInType: 'SCHEDULED',
        conductedBy: input.conductedBy,
        progressSummary: input.progressSummary,
        goalsMetStatus: {},
        onTrack: input.onTrack,
        positiveObservations: [],
        concernsRaised: [],
        managerFeedback: input.managerFeedback
      }
    });

    // Update PIP status based on progress
    await prisma.performanceImprovementPlan.update({
      where: { id: input.pipId },
      data: {
        status: input.onTrack ? 'ON_TRACK' : 'AT_RISK'
      }
    });

    return checkIn;
  }

  /**
   * Complete PIP with outcome
   */
  async completePIP(pipId: string, outcome: string, outcomeNotes: string) {
    return await prisma.performanceImprovementPlan.update({
      where: { id: pipId },
      data: {
        outcome,
        outcomeDate: new Date(),
        outcomeNotes,
        status: outcome === 'SUCCESSFUL' ? 'SUCCESSFUL' : 'UNSUCCESSFUL'
      }
    });
  }
}

// ============================================================================
// FEATURE 50: ORGANIZATIONAL HEALTH & CULTURE DIAGNOSTICS
// ============================================================================

export class OrganizationalHealthService {

  /**
   * Calculate comprehensive organizational health metrics
   */
  async calculateOrganizationalHealth(tenantId: string, period: string = 'MONTHLY') {
    const periodStart = this.getPeriodStart(period);
    const periodEnd = new Date();

    // Get all active employees
    const employees = await prisma.user.findMany({
      where: { tenantId, isActive: true },
      include: {
        performanceComparisons: {
          where: { comparisonDate: { gte: periodStart } },
          orderBy: { comparisonDate: 'desc' },
          take: 1
        },
        engagementScores: {
          where: { scoreDate: { gte: periodStart } },
          orderBy: { scoreDate: 'desc' },
          take: 1
        },
        sentimentAnalyses: {
          where: { analyzedAt: { gte: periodStart } }
        }
      }
    });

    // Calculate component scores
    const engagementScore = this.calculateAverageEngagement(employees);
    const performanceScore = this.calculateAveragePerformance(employees);
    const cultureScore = await this.calculateCultureScore(tenantId);
    const leadershipScore = await this.calculateLeadershipScore(tenantId);
    const collaborationScore = await this.calculateCollaborationScore(tenantId);
    const innovationScore = await this.calculateInnovationScore(tenantId, periodStart);
    const wellbeingScore = await this.calculateWellbeingScore(employees);

    // Calculate overall health score (weighted average)
    const overallHealthScore = (
      engagementScore * 0.20 +
      performanceScore * 0.20 +
      cultureScore * 0.15 +
      leadershipScore * 0.15 +
      collaborationScore * 0.10 +
      innovationScore * 0.10 +
      wellbeingScore * 0.10
    );

    // Determine health level
    const healthLevel = this.determineHealthLevel(overallHealthScore);

    // Get headcount metrics
    const headcount = employees.length;
    const activeEmployees = employees.filter(e => e.isActive).length;

    // Calculate turnover
    const turnoverMetrics = await this.calculateTurnoverMetrics(tenantId, periodStart, periodEnd);

    // Engagement metrics
    const avgEngagementScore = engagementScore;
    const eNPS = await this.calculateENPS(tenantId);

    // Performance metrics
    const avgPerformanceRating = performanceScore / 20; // Convert to 0-5 scale
    const performanceDistribution = this.categorizePerformance(employees);

    // Development metrics
    const devMetrics = await this.calculateDevelopmentMetrics(tenantId);

    // Risk indicators
    const riskIndicators = await this.calculateRiskIndicators(tenantId);

    // Sentiment metrics
    const sentimentMetrics = this.calculateSentimentMetrics(employees);

    // Identify strengths and concerns
    const strengths = this.identifyStrengths(overallHealthScore, engagementScore, performanceScore);
    const concerns = this.identifyConcerns(riskIndicators, turnoverMetrics.turnoverRate);

    // Generate recommendations
    const recommendations = this.generateHealthRecommendations(concerns, overallHealthScore);

    // Save metrics
    const metrics = await prisma.organizationalHealthMetrics.create({
      data: {
        tenantId,
        metricDate: new Date(),
        period,
        periodStart,
        periodEnd,
        overallHealthScore,
        healthLevel,
        engagementScore,
        performanceScore,
        cultureScore,
        leadershipScore,
        collaborationScore,
        innovationScore,
        wellbeingScore,
        headcount,
        activeEmployees,
        newHires: turnoverMetrics.newHires,
        terminations: turnoverMetrics.terminations,
        turnoverRate: turnoverMetrics.turnoverRate,
        retentionRate: 100 - turnoverMetrics.turnoverRate,
        avgEngagementScore,
        eNPS,
        avgPerformanceRating,
        highPerformers: performanceDistribution.high,
        lowPerformers: performanceDistribution.low,
        goalCompletionRate: 75, // Would calculate from actual goal data
        employeesInDevelopment: devMetrics.inDevelopment,
        avgDevelopmentHours: devMetrics.avgHours,
        atRiskEmployees: riskIndicators.atRisk,
        burnoutRiskCount: riskIndicators.burnout,
        disengagementRisk: riskIndicators.disengagement,
        flightRiskCount: riskIndicators.flightRisk,
        avgSentimentScore: sentimentMetrics.avgScore,
        positiveSentiment: sentimentMetrics.positive,
        negativeSentiment: sentimentMetrics.negative,
        strengths,
        concerns,
        recommendations
      }
    });

    return metrics;
  }

  private getPeriodStart(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'WEEKLY':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'MONTHLY':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'QUARTERLY':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'ANNUAL':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private calculateAverageEngagement(employees: any[]): number {
    const scores = employees
      .map(e => e.engagementScores[0]?.overallScore.toNumber())
      .filter(Boolean);

    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 50;
  }

  private calculateAveragePerformance(employees: any[]): number {
    const scores = employees
      .map(e => e.performanceComparisons[0]?.percentileRank.toNumber())
      .filter(Boolean);

    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 50;
  }

  private async calculateCultureScore(tenantId: string): Promise<number> {
    const diagnostics = await prisma.cultureDiagnostic.findFirst({
      where: { tenantId },
      orderBy: { diagnosticDate: 'desc' }
    });

    if (!diagnostics) return 70; // Default neutral score

    // Average of culture dimensions
    const avg = (
      diagnostics.psychologicalSafety.toNumber() +
      diagnostics.trustLevel.toNumber() +
      diagnostics.transparency.toNumber() +
      diagnostics.accountability.toNumber()
    ) / 4;

    return avg;
  }

  private async calculateLeadershipScore(tenantId: string): Promise<number> {
    const scores = await prisma.leadershipCompetencyScore.findMany({
      where: { tenantId },
      orderBy: { assessmentDate: 'desc' }
    });

    if (scores.length === 0) return 70;

    const avg = scores.reduce((sum, s) => sum + s.score.toNumber(), 0) / scores.length;
    return avg;
  }

  private async calculateCollaborationScore(tenantId: string): Promise<number> {
    const scores = await prisma.behavioralCompetencyScore.findMany({
      where: {
        tenantId,
        competencyName: { in: ['Collaboration', 'Teamwork', 'Communication'] },
      },
    });
    if (scores.length === 0) return 0;
    return scores.reduce((sum, s) => sum + s.score.toNumber(), 0) / scores.length;
  }

  private async calculateInnovationScore(tenantId: string, since: Date): Promise<number> {
    const innovations = await prisma.innovationContribution.count({
      where: { tenantId, contributedAt: { gte: since } }
    });

    // Score based on innovation rate
    return Math.min(50 + innovations * 5, 100);
  }

  private async calculateWellbeingScore(employees: any[]): Promise<number> {
    // Check for burnout and stress indicators
    const atRisk = employees.filter(e =>
      e.engagementScores[0]?.atRisk === true
    ).length;

    const riskPercentage = employees.length > 0 ? atRisk / employees.length : 0;

    // Invert risk to get wellbeing score
    return (1 - riskPercentage) * 100;
  }

  private determineHealthLevel(score: number): string {
    if (score >= 85) return 'EXCELLENT';
    if (score >= 70) return 'GOOD';
    if (score >= 55) return 'FAIR';
    if (score >= 40) return 'POOR';
    return 'CRITICAL';
  }

  private async calculateTurnoverMetrics(tenantId: string, start: Date, end: Date) {
    const [totalEmployees, newHires, terminations] = await Promise.all([
      prisma.user.count({ where: { tenantId, isActive: true } }),
      prisma.user.count({ where: { tenantId, hireDate: { gte: start, lte: end } } }),
      prisma.user.count({ where: { tenantId, isActive: false, updatedAt: { gte: start, lte: end } } }),
    ]);
    const turnoverRate = totalEmployees > 0 ? (terminations / totalEmployees) * 100 : 0;
    return { newHires, terminations, turnoverRate: Math.round(turnoverRate * 10) / 10 };
  }

  private async calculateENPS(tenantId: string): Promise<number> {
    // Calculate from engagement scores: promoters (>80) - detractors (<50) as % of total
    const scores = await prisma.engagementScore.findMany({
      where: { tenantId },
      orderBy: { scoreDate: 'desc' },
      distinct: ['userId'],
      select: { overallScore: true },
    });
    if (scores.length === 0) return 0;
    const promoters = scores.filter(s => s.overallScore.toNumber() > 80).length;
    const detractors = scores.filter(s => s.overallScore.toNumber() < 50).length;
    return Math.round(((promoters - detractors) / scores.length) * 100);
  }

  private categorizePerformance(employees: any[]) {
    const high = employees.filter(e =>
      e.performanceComparisons[0]?.performanceLevel === 'ABOVE' ||
      e.performanceComparisons[0]?.performanceLevel === 'EXCEPTIONAL'
    ).length;

    const low = employees.filter(e =>
      e.performanceComparisons[0]?.performanceLevel === 'BELOW'
    ).length;

    return { high, low };
  }

  private async calculateDevelopmentMetrics(tenantId: string) {
    const [plans, activities] = await Promise.all([
      prisma.developmentPlan.count({ where: { tenantId, status: 'ACTIVE' } }),
      prisma.developmentActivity.findMany({
        where: { plan: { tenantId, status: 'ACTIVE' } },
        select: { estimatedHours: true },
      }),
    ]);

    const totalHours = activities.reduce((sum, a) => sum + (a.estimatedHours?.toNumber() ?? 0), 0);
    const avgHours = plans > 0 ? Math.round((totalHours / plans) * 10) / 10 : 0;

    return { inDevelopment: plans, avgHours };
  }

  private async calculateRiskIndicators(tenantId: string) {
    const anomalies = await prisma.anomalyDetection.findMany({
      where: { tenantId, status: 'ACTIVE' }
    });

    const burnout = anomalies.filter(a => a.anomalyTypes.includes('BURNOUT')).length;
    const disengagement = anomalies.filter(a => a.anomalyTypes.includes('DISENGAGEMENT')).length;
    const flightRisk = burnout + disengagement; // Simplified

    return {
      atRisk: anomalies.length,
      burnout,
      disengagement,
      flightRisk
    };
  }

  private calculateSentimentMetrics(employees: any[]) {
    const allSentiments = employees.flatMap(e => e.sentimentAnalyses);

    if (allSentiments.length === 0) {
      return { avgScore: 0, positive: 50, negative: 50 };
    }

    const avgScore = allSentiments.reduce((sum, s) => sum + s.sentimentScore.toNumber(), 0) / allSentiments.length;
    const positive = (allSentiments.filter(s => s.sentimentScore.toNumber() > 0.3).length / allSentiments.length) * 100;
    const negative = (allSentiments.filter(s => s.sentimentScore.toNumber() < -0.3).length / allSentiments.length) * 100;

    return { avgScore, positive, negative };
  }

  private identifyStrengths(overall: number, engagement: number, performance: number): string[] {
    const strengths: string[] = [];

    if (overall >= 80) strengths.push('Strong overall organizational health');
    if (engagement >= 75) strengths.push('High employee engagement levels');
    if (performance >= 75) strengths.push('Excellent performance across organization');

    return strengths;
  }

  private identifyConcerns(risks: any, turnover: number): string[] {
    const concerns: string[] = [];

    if (risks.atRisk > 10) concerns.push(`${risks.atRisk} employees flagged as at-risk`);
    if (risks.burnout > 5) concerns.push(`${risks.burnout} employees showing burnout indicators`);
    if (turnover > 15) concerns.push(`High turnover rate at ${turnover}%`);

    return concerns;
  }

  private generateHealthRecommendations(concerns: string[], healthScore: number): any[] {
    const recommendations: any[] = [];

    if (healthScore < 70) {
      recommendations.push({
        priority: 'HIGH',
        category: 'OVERALL_HEALTH',
        action: 'Conduct comprehensive organizational assessment',
        impact: 'Identify root causes of health issues'
      });
    }

    if (concerns.some(c => c.includes('burnout'))) {
      recommendations.push({
        priority: 'HIGH',
        category: 'WELLBEING',
        action: 'Implement burnout prevention programs',
        impact: 'Reduce employee stress and improve retention'
      });
    }

    if (concerns.some(c => c.includes('turnover'))) {
      recommendations.push({
        priority: 'HIGH',
        category: 'RETENTION',
        action: 'Launch retention initiative and conduct exit interviews',
        impact: 'Understand and address turnover drivers'
      });
    }

    return recommendations;
  }

  /**
   * Conduct culture diagnostic
   */
  async conductCultureDiagnostic(tenantId: string) {
    // Compute culture metrics from real employee data
    const [engagementScores, behavioralScores, innovations, feedback] = await Promise.all([
      prisma.engagementScore.findMany({
        where: { tenantId },
        orderBy: { scoreDate: 'desc' },
        distinct: ['userId'],
      }),
      prisma.behavioralCompetencyScore.findMany({
        where: { tenantId },
        orderBy: { assessmentDate: 'desc' },
      }),
      prisma.innovationContribution.count({ where: { tenantId } }),
      prisma.feedback.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: { type: true, sentiment: true },
      }),
    ]);

    const avgEngagement = engagementScores.length > 0
      ? engagementScores.reduce((s, e) => s + e.overallScore.toNumber(), 0) / engagementScores.length
      : 0;

    // Derive culture scores from behavioral competencies
    const competencyAvg = (names: string[]) => {
      const matching = behavioralScores.filter(b => names.some(n => b.competencyName.toLowerCase().includes(n)));
      return matching.length > 0 ? matching.reduce((s, b) => s + b.score.toNumber(), 0) / matching.length : 0;
    };

    const clanCulture = competencyAvg(['teamwork', 'collaboration', 'mentoring']);
    const adhocracyCulture = competencyAvg(['innovation', 'creativity', 'adaptability']);
    const marketCulture = competencyAvg(['results', 'customer', 'achievement']);
    const hierarchyCulture = competencyAvg(['process', 'compliance', 'quality']);

    const accountability = competencyAvg(['accountability', 'ownership', 'responsibility']);
    const innovation = Math.min(50 + innovations * 2, 100);
    const transparency = competencyAvg(['communication', 'transparency', 'openness']);

    const positiveFb = feedback.filter(f => f.type === 'PRAISE' || f.type === 'RECOGNITION').length;
    const totalFb = feedback.length || 1;
    const psychologicalSafety = Math.round((positiveFb / totalFb) * 100);

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const scores = { clanCulture, adhocracyCulture, marketCulture, hierarchyCulture, accountability, innovation, transparency, psychologicalSafety };
    for (const [key, val] of Object.entries(scores)) {
      if (val >= 70) strengths.push(`Strong ${key.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}`);
      else if (val < 50 && val > 0) weaknesses.push(`Low ${key.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}`);
    }

    const diagnostic = await prisma.cultureDiagnostic.create({
      data: {
        tenantId,
        diagnosticDate: new Date(),
        diagnosticType: 'COMPREHENSIVE',
        clanCulture: Math.round(clanCulture),
        adhocracyCulture: Math.round(adhocracyCulture),
        marketCulture: Math.round(marketCulture),
        hierarchyCulture: Math.round(hierarchyCulture),
        psychologicalSafety: Math.round(psychologicalSafety),
        trustLevel: Math.round(avgEngagement * 0.8),
        autonomy: Math.round(avgEngagement * 0.7),
        transparency: Math.round(transparency),
        accountability: Math.round(accountability),
        innovation: Math.round(innovation),
        customerFocus: Math.round(marketCulture),
        resultsOrientation: Math.round(marketCulture),
        valuesAlignment: Math.round(avgEngagement * 0.75),
        missionClarity: Math.round(avgEngagement * 0.8),
        visionAlignment: Math.round(avgEngagement * 0.7),
        desiredCulture: {},
        currentCulture: { clanCulture, adhocracyCulture, marketCulture, hierarchyCulture },
        cultureGaps: [],
        culturalStrengths: strengths.length > 0 ? strengths : ['No data to evaluate strengths'],
        culturalWeaknesses: weaknesses.length > 0 ? weaknesses : ['No data to evaluate weaknesses'],
        culturalRisks: [],
      },
    });

    return diagnostic;
  }
}
