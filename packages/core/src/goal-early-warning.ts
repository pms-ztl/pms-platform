/**
 * Goal Failure Early Warning System
 * USP Feature 5: Predicts missed OKRs weeks in advance
 *
 * This service:
 * - Monitors goal progress trajectories in real-time
 * - Predicts goal completion likelihood using multiple signals
 * - Alerts stakeholders before failures occur
 * - Suggests interventions to get goals back on track
 * - Enables proactive management instead of reactive discovery
 */

export interface GoalRiskAssessment {
  goalId: string;
  goalTitle: string;
  ownerId: string;
  ownerName: string;
  riskLevel: 'ON_TRACK' | 'AT_RISK' | 'HIGH_RISK' | 'CRITICAL';
  riskScore: number; // 0-100 (higher = more risk)
  completionProbability: number; // 0-100
  daysUntilDeadline: number;
  predictedCompletionDate: Date | null;
  willMissDeadline: boolean;
  riskFactors: RiskFactor[];
  recommendations: Recommendation[];
  historicalContext: HistoricalContext;
  trendAnalysis: TrendAnalysis;
  alertsGenerated: Alert[];
  assessedAt: Date;
}

export interface RiskFactor {
  factor: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
  dataPoints: string[];
  mitigationPossible: boolean;
}

export interface Recommendation {
  priority: 1 | 2 | 3;
  action: string;
  expectedImpact: string;
  owner: 'employee' | 'manager' | 'team';
  timeframe: string;
  resources?: string[];
}

export interface HistoricalContext {
  previousGoalSuccessRate: number;
  avgDaysToComplete: number;
  similarGoalsComparison: {
    goalTitle: string;
    wasSuccessful: boolean;
    daysToComplete: number;
  }[];
  ownerTrackRecord: 'excellent' | 'good' | 'average' | 'below_average' | 'new';
}

export interface TrendAnalysis {
  progressVelocity: number; // Points per day
  requiredVelocity: number; // Points per day to meet deadline
  velocityGap: number;
  accelerating: boolean;
  weekOverWeekChange: number;
  projectedProgress: ProjectedProgress[];
  confidence: number;
}

export interface ProjectedProgress {
  date: Date;
  projectedProgress: number;
  lowerBound: number;
  upperBound: number;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: 'INFO' | 'WARNING' | 'URGENT' | 'CRITICAL';
  title: string;
  message: string;
  recipients: string[];
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  actions: AlertAction[];
}

export type AlertType =
  | 'PROGRESS_STALL'
  | 'VELOCITY_DROP'
  | 'DEADLINE_APPROACHING'
  | 'TRAJECTORY_MISS'
  | 'BLOCKER_DETECTED'
  | 'DEPENDENCY_AT_RISK'
  | 'RESOURCE_CONSTRAINT'
  | 'SCOPE_CREEP';

export interface AlertAction {
  label: string;
  action: string;
  url?: string;
}

export interface TeamRiskDashboard {
  teamId: string;
  teamName: string;
  managerId: string;
  assessedAt: Date;
  summary: TeamRiskSummary;
  goalsByRisk: GoalsByRiskLevel;
  topRisks: GoalRiskAssessment[];
  healthScore: number;
  recommendations: string[];
  trends: TeamTrends;
}

export interface TeamRiskSummary {
  totalGoals: number;
  onTrack: number;
  atRisk: number;
  highRisk: number;
  critical: number;
  avgCompletionProbability: number;
}

export interface GoalsByRiskLevel {
  onTrack: GoalRiskAssessment[];
  atRisk: GoalRiskAssessment[];
  highRisk: GoalRiskAssessment[];
  critical: GoalRiskAssessment[];
}

export interface TeamTrends {
  weeklyRiskChange: number;
  goalsRecovered: number;
  goalsEscalated: number;
  avgVelocityTrend: 'improving' | 'stable' | 'declining';
}

export interface GoalData {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  managerId?: string;
  teamId?: string;
  type: 'INDIVIDUAL' | 'TEAM' | 'DEPARTMENT' | 'COMPANY' | 'OKR_OBJECTIVE' | 'OKR_KEY_RESULT';
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
  progress: number;
  targetValue?: number;
  currentValue?: number;
  startDate: Date;
  dueDate: Date;
  weight: number;
  tags?: string[];
  dependencies?: string[];
  progressHistory: ProgressUpdate[];
}

export interface ProgressUpdate {
  date: Date;
  progress: number;
  value?: number;
  note?: string;
}

export interface UserHistoricalData {
  userId: string;
  totalGoalsCompleted: number;
  totalGoalsMissed: number;
  avgCompletionRate: number;
  avgDaysEarlyOrLate: number;
  recentGoalVelocities: number[];
}

export class GoalEarlyWarningSystem {
  /**
   * Assesses risk for a single goal
   */
  assessGoalRisk(
    goal: GoalData,
    userHistory: UserHistoricalData,
    relatedGoals?: GoalData[]
  ): GoalRiskAssessment {
    const now = new Date();
    const daysUntilDeadline = this.calculateDaysUntil(goal.dueDate);
    const daysSinceStart = this.calculateDaysSince(goal.startDate);

    // Calculate progress trajectory
    const trendAnalysis = this.analyzeProgressTrend(goal, daysUntilDeadline);

    // Calculate completion probability
    const completionProbability = this.calculateCompletionProbability(
      goal,
      trendAnalysis,
      userHistory,
      daysUntilDeadline
    );

    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(
      goal,
      trendAnalysis,
      userHistory,
      relatedGoals
    );

    // Calculate risk score
    const riskScore = this.calculateRiskScore(
      goal,
      completionProbability,
      riskFactors,
      daysUntilDeadline
    );

    // Determine risk level
    const riskLevel = this.determineRiskLevel(riskScore);

    // Predict completion
    const { predictedDate, willMiss } = this.predictCompletion(
      goal,
      trendAnalysis,
      daysUntilDeadline
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      goal,
      riskLevel,
      riskFactors,
      trendAnalysis
    );

    // Build historical context
    const historicalContext = this.buildHistoricalContext(goal, userHistory);

    // Generate alerts
    const alertsGenerated = this.generateAlerts(
      goal,
      riskLevel,
      riskFactors,
      daysUntilDeadline
    );

    return {
      goalId: goal.id,
      goalTitle: goal.title,
      ownerId: goal.ownerId,
      ownerName: goal.ownerName,
      riskLevel,
      riskScore,
      completionProbability,
      daysUntilDeadline,
      predictedCompletionDate: predictedDate,
      willMissDeadline: willMiss,
      riskFactors,
      recommendations,
      historicalContext,
      trendAnalysis,
      alertsGenerated,
      assessedAt: now,
    };
  }

  /**
   * Builds a team-level risk dashboard
   */
  buildTeamDashboard(
    teamId: string,
    teamName: string,
    managerId: string,
    goals: GoalData[],
    userHistories: Map<string, UserHistoricalData>,
    previousAssessments?: GoalRiskAssessment[]
  ): TeamRiskDashboard {
    // Assess all goals
    const assessments = goals.map(goal => {
      const history = userHistories.get(goal.ownerId) || this.createDefaultHistory(goal.ownerId);
      return this.assessGoalRisk(goal, history);
    });

    // Categorize by risk level
    const goalsByRisk: GoalsByRiskLevel = {
      onTrack: assessments.filter(a => a.riskLevel === 'ON_TRACK'),
      atRisk: assessments.filter(a => a.riskLevel === 'AT_RISK'),
      highRisk: assessments.filter(a => a.riskLevel === 'HIGH_RISK'),
      critical: assessments.filter(a => a.riskLevel === 'CRITICAL'),
    };

    // Calculate summary
    const summary: TeamRiskSummary = {
      totalGoals: goals.length,
      onTrack: goalsByRisk.onTrack.length,
      atRisk: goalsByRisk.atRisk.length,
      highRisk: goalsByRisk.highRisk.length,
      critical: goalsByRisk.critical.length,
      avgCompletionProbability: assessments.length > 0
        ? Math.round(assessments.reduce((sum, a) => sum + a.completionProbability, 0) / assessments.length)
        : 0,
    };

    // Top risks (sorted by risk score)
    const topRisks = assessments
      .filter(a => a.riskLevel !== 'ON_TRACK')
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);

    // Calculate health score
    const healthScore = this.calculateTeamHealthScore(summary);

    // Calculate trends
    const trends = this.calculateTeamTrends(assessments, previousAssessments);

    // Team recommendations
    const recommendations = this.generateTeamRecommendations(summary, topRisks, trends);

    return {
      teamId,
      teamName,
      managerId,
      assessedAt: new Date(),
      summary,
      goalsByRisk,
      topRisks,
      healthScore,
      recommendations,
      trends,
    };
  }

  /**
   * Generates proactive intervention plan
   */
  generateInterventionPlan(
    assessment: GoalRiskAssessment,
    goal: GoalData,
    managerContext: { name: string; id: string }
  ): InterventionPlan {
    const interventions: Intervention[] = [];

    // Based on risk level
    if (assessment.riskLevel === 'CRITICAL') {
      interventions.push({
        type: 'IMMEDIATE_ACTION',
        title: 'Emergency Goal Review',
        description: 'Schedule immediate meeting with goal owner to assess situation',
        owner: managerContext.name,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        status: 'PENDING',
        priority: 1,
      });

      interventions.push({
        type: 'SCOPE_ADJUSTMENT',
        title: 'Evaluate Goal Scope',
        description: 'Consider reducing scope or extending deadline if feasible',
        owner: managerContext.name,
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
        priority: 1,
      });
    }

    if (assessment.riskLevel === 'HIGH_RISK' || assessment.riskLevel === 'CRITICAL') {
      interventions.push({
        type: 'RESOURCE_REVIEW',
        title: 'Resource Assessment',
        description: 'Review if additional resources or support can accelerate progress',
        owner: managerContext.name,
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
        priority: 2,
      });

      interventions.push({
        type: 'BLOCKER_REMOVAL',
        title: 'Identify and Remove Blockers',
        description: 'Work with goal owner to identify and address any blockers',
        owner: assessment.ownerName,
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
        priority: 2,
      });
    }

    if (assessment.riskLevel === 'AT_RISK') {
      interventions.push({
        type: 'CHECK_IN',
        title: 'Weekly Progress Check-in',
        description: 'Add goal to weekly 1:1 agenda for closer monitoring',
        owner: managerContext.name,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
        priority: 3,
      });
    }

    // Add interventions based on specific risk factors
    for (const factor of assessment.riskFactors.filter(f => f.impact === 'high')) {
      if (factor.factor.includes('velocity')) {
        interventions.push({
          type: 'VELOCITY_IMPROVEMENT',
          title: 'Accelerate Progress',
          description: 'Break down remaining work into smaller milestones with daily targets',
          owner: assessment.ownerName,
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          status: 'PENDING',
          priority: 2,
        });
      }

      if (factor.factor.includes('stall')) {
        interventions.push({
          type: 'RESTART_PLAN',
          title: 'Create Restart Plan',
          description: 'Identify what caused the stall and create a concrete restart plan',
          owner: assessment.ownerName,
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          status: 'PENDING',
          priority: 1,
        });
      }
    }

    // Calculate expected outcome
    const expectedOutcome = this.calculateInterventionImpact(interventions, assessment);

    return {
      goalId: goal.id,
      goalTitle: goal.title,
      currentRiskLevel: assessment.riskLevel,
      createdAt: new Date(),
      interventions: interventions.sort((a, b) => a.priority - b.priority),
      expectedOutcome,
      escalationPath: this.defineEscalationPath(assessment.riskLevel),
      checkpoints: this.defineCheckpoints(assessment, goal),
    };
  }

  /**
   * Monitors multiple goals and returns prioritized alerts
   */
  monitorGoals(
    goals: GoalData[],
    userHistories: Map<string, UserHistoricalData>
  ): MonitoringResult {
    const assessments: GoalRiskAssessment[] = [];
    const allAlerts: Alert[] = [];
    const actionRequired: GoalRiskAssessment[] = [];

    for (const goal of goals) {
      if (goal.status !== 'ACTIVE') continue;

      const history = userHistories.get(goal.ownerId) || this.createDefaultHistory(goal.ownerId);
      const assessment = this.assessGoalRisk(goal, history);

      assessments.push(assessment);
      allAlerts.push(...assessment.alertsGenerated);

      if (assessment.riskLevel === 'CRITICAL' || assessment.riskLevel === 'HIGH_RISK') {
        actionRequired.push(assessment);
      }
    }

    // Sort alerts by severity
    const sortedAlerts = allAlerts.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, URGENT: 1, WARNING: 2, INFO: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    // Calculate overall health
    const overallHealth = this.calculateOverallHealth(assessments);

    return {
      timestamp: new Date(),
      totalGoalsMonitored: goals.filter(g => g.status === 'ACTIVE').length,
      assessments,
      alerts: sortedAlerts,
      actionRequired: actionRequired.sort((a, b) => b.riskScore - a.riskScore),
      overallHealth,
      summary: this.generateMonitoringSummary(assessments),
    };
  }

  // Private helper methods

  private calculateDaysUntil(date: Date): number {
    const now = new Date();
    const diff = new Date(date).getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  private calculateDaysSince(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private analyzeProgressTrend(
    goal: GoalData,
    daysUntilDeadline: number
  ): TrendAnalysis {
    const history = goal.progressHistory || [];

    if (history.length < 2) {
      return this.createDefaultTrendAnalysis(goal, daysUntilDeadline);
    }

    // Sort by date
    const sorted = [...history].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate velocity (progress points per day)
    const recentUpdates = sorted.slice(-5);
    let totalProgressChange = 0;
    let totalDays = 0;

    for (let i = 1; i < recentUpdates.length; i++) {
      const progressChange = recentUpdates[i].progress - recentUpdates[i - 1].progress;
      const daysDiff = this.calculateDaysBetween(
        recentUpdates[i - 1].date,
        recentUpdates[i].date
      );

      if (daysDiff > 0) {
        totalProgressChange += progressChange;
        totalDays += daysDiff;
      }
    }

    const progressVelocity = totalDays > 0 ? totalProgressChange / totalDays : 0;

    // Calculate required velocity
    const remainingProgress = 100 - goal.progress;
    const requiredVelocity = daysUntilDeadline > 0 ? remainingProgress / daysUntilDeadline : remainingProgress;

    const velocityGap = requiredVelocity - progressVelocity;

    // Check if accelerating
    const midpoint = Math.floor(sorted.length / 2);
    const firstHalfVelocity = this.calculateVelocityForRange(sorted.slice(0, midpoint));
    const secondHalfVelocity = this.calculateVelocityForRange(sorted.slice(midpoint));
    const accelerating = secondHalfVelocity > firstHalfVelocity;

    // Week over week change
    const lastWeekProgress = this.getProgressAtDaysAgo(sorted, 7) || 0;
    const twoWeeksAgoProgress = this.getProgressAtDaysAgo(sorted, 14) || 0;
    const lastWeekChange = goal.progress - lastWeekProgress;
    const previousWeekChange = lastWeekProgress - twoWeeksAgoProgress;
    const weekOverWeekChange = lastWeekChange - previousWeekChange;

    // Generate projections
    const projectedProgress = this.generateProjections(
      goal.progress,
      progressVelocity,
      daysUntilDeadline
    );

    // Confidence based on data quality
    const confidence = Math.min(100, history.length * 10 + 20);

    return {
      progressVelocity: Math.round(progressVelocity * 100) / 100,
      requiredVelocity: Math.round(requiredVelocity * 100) / 100,
      velocityGap: Math.round(velocityGap * 100) / 100,
      accelerating,
      weekOverWeekChange: Math.round(weekOverWeekChange * 100) / 100,
      projectedProgress,
      confidence,
    };
  }

  private createDefaultTrendAnalysis(
    goal: GoalData,
    daysUntilDeadline: number
  ): TrendAnalysis {
    const daysSinceStart = this.calculateDaysSince(goal.startDate);
    const progressVelocity = daysSinceStart > 0 ? goal.progress / daysSinceStart : 0;
    const remainingProgress = 100 - goal.progress;
    const requiredVelocity = daysUntilDeadline > 0 ? remainingProgress / daysUntilDeadline : remainingProgress;

    return {
      progressVelocity: Math.round(progressVelocity * 100) / 100,
      requiredVelocity: Math.round(requiredVelocity * 100) / 100,
      velocityGap: Math.round((requiredVelocity - progressVelocity) * 100) / 100,
      accelerating: false,
      weekOverWeekChange: 0,
      projectedProgress: [],
      confidence: 30,
    };
  }

  private calculateCompletionProbability(
    goal: GoalData,
    trend: TrendAnalysis,
    history: UserHistoricalData,
    daysUntilDeadline: number
  ): number {
    let probability = 50; // Base

    // Factor 1: Current progress (weight: 25%)
    const progressFactor = goal.progress / 100;
    probability += (progressFactor - 0.5) * 25;

    // Factor 2: Velocity vs required velocity (weight: 30%)
    if (trend.requiredVelocity > 0) {
      const velocityRatio = trend.progressVelocity / trend.requiredVelocity;
      probability += (Math.min(velocityRatio, 1.5) - 0.5) * 30;
    }

    // Factor 3: Historical track record (weight: 20%)
    probability += (history.avgCompletionRate - 50) * 0.2;

    // Factor 4: Time remaining (weight: 15%)
    if (daysUntilDeadline <= 0) {
      probability -= 30;
    } else if (daysUntilDeadline <= 7) {
      probability -= (7 - daysUntilDeadline) * 3;
    }

    // Factor 5: Trend direction (weight: 10%)
    if (trend.accelerating) {
      probability += 10;
    } else if (trend.weekOverWeekChange < -5) {
      probability -= 10;
    }

    return Math.max(0, Math.min(100, Math.round(probability)));
  }

  private identifyRiskFactors(
    goal: GoalData,
    trend: TrendAnalysis,
    history: UserHistoricalData,
    relatedGoals?: GoalData[]
  ): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Check for stalled progress
    const daysSinceUpdate = goal.progressHistory?.length > 0
      ? this.calculateDaysSince(goal.progressHistory[goal.progressHistory.length - 1].date)
      : this.calculateDaysSince(goal.startDate);

    if (daysSinceUpdate > 14) {
      factors.push({
        factor: 'Progress Stall',
        impact: 'high',
        description: `No progress updates in ${daysSinceUpdate} days`,
        dataPoints: [`Last update: ${daysSinceUpdate} days ago`],
        mitigationPossible: true,
      });
    }

    // Check velocity gap
    if (trend.velocityGap > 2) {
      factors.push({
        factor: 'Insufficient Velocity',
        impact: trend.velocityGap > 5 ? 'high' : 'medium',
        description: `Current pace will not meet deadline. Need ${trend.velocityGap.toFixed(1)} more points/day`,
        dataPoints: [
          `Current velocity: ${trend.progressVelocity.toFixed(1)}/day`,
          `Required velocity: ${trend.requiredVelocity.toFixed(1)}/day`,
        ],
        mitigationPossible: true,
      });
    }

    // Check for declining trajectory
    if (!trend.accelerating && trend.weekOverWeekChange < -5) {
      factors.push({
        factor: 'Declining Momentum',
        impact: 'medium',
        description: 'Progress is slowing week over week',
        dataPoints: [`WoW change: ${trend.weekOverWeekChange.toFixed(1)}%`],
        mitigationPossible: true,
      });
    }

    // Check historical performance
    if (history.avgCompletionRate < 60) {
      factors.push({
        factor: 'Historical Track Record',
        impact: 'medium',
        description: 'Owner has below-average goal completion history',
        dataPoints: [
          `Completion rate: ${history.avgCompletionRate.toFixed(0)}%`,
          `Goals completed: ${history.totalGoalsCompleted}`,
          `Goals missed: ${history.totalGoalsMissed}`,
        ],
        mitigationPossible: true,
      });
    }

    // Check for tight deadline
    const daysRemaining = this.calculateDaysUntil(goal.dueDate);
    const remainingProgress = 100 - goal.progress;

    if (daysRemaining < 7 && remainingProgress > 30) {
      factors.push({
        factor: 'Time Pressure',
        impact: 'high',
        description: `${remainingProgress}% remaining with only ${daysRemaining} days`,
        dataPoints: [
          `Days remaining: ${daysRemaining}`,
          `Progress remaining: ${remainingProgress}%`,
        ],
        mitigationPossible: daysRemaining > 0,
      });
    }

    // Check dependencies
    if (relatedGoals && relatedGoals.length > 0) {
      const blockedDependencies = relatedGoals.filter(g =>
        g.status === 'ACTIVE' && g.progress < 80
      );

      if (blockedDependencies.length > 0) {
        factors.push({
          factor: 'Dependency Risk',
          impact: 'medium',
          description: `${blockedDependencies.length} related goal(s) may not complete in time`,
          dataPoints: blockedDependencies.map(g => `${g.title}: ${g.progress}%`),
          mitigationPossible: true,
        });
      }
    }

    return factors;
  }

  private calculateRiskScore(
    goal: GoalData,
    completionProbability: number,
    riskFactors: RiskFactor[],
    daysUntilDeadline: number
  ): number {
    // Start with inverse of completion probability
    let score = 100 - completionProbability;

    // Add factor penalties
    for (const factor of riskFactors) {
      if (factor.impact === 'high') score += 15;
      else if (factor.impact === 'medium') score += 8;
      else score += 3;
    }

    // Time urgency multiplier
    if (daysUntilDeadline <= 0) {
      score = Math.min(100, score * 1.5);
    } else if (daysUntilDeadline <= 7) {
      score = Math.min(100, score * 1.2);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private determineRiskLevel(riskScore: number): GoalRiskAssessment['riskLevel'] {
    if (riskScore >= 80) return 'CRITICAL';
    if (riskScore >= 60) return 'HIGH_RISK';
    if (riskScore >= 40) return 'AT_RISK';
    return 'ON_TRACK';
  }

  private predictCompletion(
    goal: GoalData,
    trend: TrendAnalysis,
    daysUntilDeadline: number
  ): { predictedDate: Date | null; willMiss: boolean } {
    if (goal.progress >= 100) {
      return { predictedDate: new Date(), willMiss: false };
    }

    if (trend.progressVelocity <= 0) {
      return { predictedDate: null, willMiss: true };
    }

    const remainingProgress = 100 - goal.progress;
    const daysToComplete = remainingProgress / trend.progressVelocity;

    const predictedDate = new Date();
    predictedDate.setDate(predictedDate.getDate() + Math.ceil(daysToComplete));

    const willMiss = daysToComplete > daysUntilDeadline;

    return { predictedDate, willMiss };
  }

  private generateRecommendations(
    goal: GoalData,
    riskLevel: GoalRiskAssessment['riskLevel'],
    factors: RiskFactor[],
    trend: TrendAnalysis
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (riskLevel === 'CRITICAL') {
      recommendations.push({
        priority: 1,
        action: 'Schedule emergency review meeting with manager',
        expectedImpact: 'Identify blockers and create recovery plan',
        owner: 'employee',
        timeframe: '24 hours',
      });

      recommendations.push({
        priority: 1,
        action: 'Evaluate scope reduction or deadline extension options',
        expectedImpact: 'May salvage goal success with adjustments',
        owner: 'manager',
        timeframe: '48 hours',
      });
    }

    if (factors.some(f => f.factor === 'Progress Stall')) {
      recommendations.push({
        priority: 1,
        action: 'Identify and document specific blockers',
        expectedImpact: 'Clear blockers to resume progress',
        owner: 'employee',
        timeframe: '1 day',
      });
    }

    if (factors.some(f => f.factor === 'Insufficient Velocity')) {
      recommendations.push({
        priority: 2,
        action: 'Break remaining work into daily achievable milestones',
        expectedImpact: `Increase velocity from ${trend.progressVelocity.toFixed(1)} to ${trend.requiredVelocity.toFixed(1)}/day`,
        owner: 'employee',
        timeframe: '2 days',
      });

      recommendations.push({
        priority: 2,
        action: 'Dedicate focused time blocks for this goal',
        expectedImpact: 'Remove distractions and increase output',
        owner: 'employee',
        timeframe: 'Immediate',
      });
    }

    if (factors.some(f => f.factor === 'Declining Momentum')) {
      recommendations.push({
        priority: 2,
        action: 'Review what changed in recent weeks',
        expectedImpact: 'Identify root cause of slowdown',
        owner: 'employee',
        timeframe: '2 days',
      });
    }

    if (factors.some(f => f.factor === 'Dependency Risk')) {
      recommendations.push({
        priority: 2,
        action: 'Coordinate with dependent goal owners',
        expectedImpact: 'Align timelines and identify workarounds',
        owner: 'team',
        timeframe: '3 days',
      });
    }

    // Default recommendation
    if (recommendations.length === 0 && riskLevel === 'AT_RISK') {
      recommendations.push({
        priority: 3,
        action: 'Increase progress update frequency',
        expectedImpact: 'Better visibility and accountability',
        owner: 'employee',
        timeframe: 'Ongoing',
      });
    }

    return recommendations;
  }

  private buildHistoricalContext(
    goal: GoalData,
    history: UserHistoricalData
  ): HistoricalContext {
    let trackRecord: HistoricalContext['ownerTrackRecord'];

    if (history.totalGoalsCompleted + history.totalGoalsMissed < 3) {
      trackRecord = 'new';
    } else if (history.avgCompletionRate >= 90) {
      trackRecord = 'excellent';
    } else if (history.avgCompletionRate >= 75) {
      trackRecord = 'good';
    } else if (history.avgCompletionRate >= 50) {
      trackRecord = 'average';
    } else {
      trackRecord = 'below_average';
    }

    return {
      previousGoalSuccessRate: history.avgCompletionRate,
      avgDaysToComplete: history.avgDaysEarlyOrLate,
      similarGoalsComparison: [], // Would need additional data
      ownerTrackRecord: trackRecord,
    };
  }

  private generateAlerts(
    goal: GoalData,
    riskLevel: GoalRiskAssessment['riskLevel'],
    factors: RiskFactor[],
    daysUntilDeadline: number
  ): Alert[] {
    const alerts: Alert[] = [];
    const now = new Date();

    if (riskLevel === 'CRITICAL') {
      alerts.push({
        id: `alert_${goal.id}_critical_${now.getTime()}`,
        type: 'TRAJECTORY_MISS',
        severity: 'CRITICAL',
        title: `Goal "${goal.title}" is unlikely to complete on time`,
        message: `Current trajectory shows goal will miss deadline. Immediate intervention required.`,
        recipients: [goal.ownerId, goal.managerId!].filter(Boolean),
        createdAt: now,
        actions: [
          { label: 'View Details', action: 'view_goal', url: `/goals/${goal.id}` },
          { label: 'Schedule Meeting', action: 'schedule_meeting' },
        ],
      });
    }

    if (factors.some(f => f.factor === 'Progress Stall')) {
      alerts.push({
        id: `alert_${goal.id}_stall_${now.getTime()}`,
        type: 'PROGRESS_STALL',
        severity: 'WARNING',
        title: `No progress on "${goal.title}"`,
        message: `This goal hasn't been updated recently. Is there a blocker?`,
        recipients: [goal.ownerId],
        createdAt: now,
        actions: [
          { label: 'Update Progress', action: 'update_progress', url: `/goals/${goal.id}/update` },
          { label: 'Report Blocker', action: 'report_blocker' },
        ],
      });
    }

    if (daysUntilDeadline <= 7 && daysUntilDeadline > 0 && goal.progress < 80) {
      alerts.push({
        id: `alert_${goal.id}_deadline_${now.getTime()}`,
        type: 'DEADLINE_APPROACHING',
        severity: daysUntilDeadline <= 3 ? 'URGENT' : 'WARNING',
        title: `Deadline approaching for "${goal.title}"`,
        message: `${daysUntilDeadline} days remaining with ${100 - goal.progress}% still to complete.`,
        recipients: [goal.ownerId],
        createdAt: now,
        actions: [
          { label: 'View Goal', action: 'view_goal', url: `/goals/${goal.id}` },
        ],
      });
    }

    if (factors.some(f => f.factor === 'Insufficient Velocity' && f.impact === 'high')) {
      alerts.push({
        id: `alert_${goal.id}_velocity_${now.getTime()}`,
        type: 'VELOCITY_DROP',
        severity: 'WARNING',
        title: `Pace too slow for "${goal.title}"`,
        message: `Current progress rate will not meet the deadline. Acceleration needed.`,
        recipients: [goal.ownerId, goal.managerId!].filter(Boolean),
        createdAt: now,
        actions: [
          { label: 'View Recommendations', action: 'view_recommendations' },
        ],
      });
    }

    return alerts;
  }

  private calculateTeamHealthScore(summary: TeamRiskSummary): number {
    if (summary.totalGoals === 0) return 100;

    const weights = {
      onTrack: 100,
      atRisk: 60,
      highRisk: 30,
      critical: 0,
    };

    const weightedSum =
      summary.onTrack * weights.onTrack +
      summary.atRisk * weights.atRisk +
      summary.highRisk * weights.highRisk +
      summary.critical * weights.critical;

    return Math.round(weightedSum / summary.totalGoals);
  }

  private calculateTeamTrends(
    current: GoalRiskAssessment[],
    previous?: GoalRiskAssessment[]
  ): TeamTrends {
    if (!previous || previous.length === 0) {
      return {
        weeklyRiskChange: 0,
        goalsRecovered: 0,
        goalsEscalated: 0,
        avgVelocityTrend: 'stable',
      };
    }

    const currentHighRisk = current.filter(a =>
      a.riskLevel === 'HIGH_RISK' || a.riskLevel === 'CRITICAL'
    ).length;

    const previousHighRisk = previous.filter(a =>
      a.riskLevel === 'HIGH_RISK' || a.riskLevel === 'CRITICAL'
    ).length;

    // Track recovered goals (were at risk, now on track)
    const recovered = current.filter(c => {
      const prev = previous.find(p => p.goalId === c.goalId);
      return prev &&
        (prev.riskLevel === 'AT_RISK' || prev.riskLevel === 'HIGH_RISK') &&
        c.riskLevel === 'ON_TRACK';
    }).length;

    // Track escalated goals
    const escalated = current.filter(c => {
      const prev = previous.find(p => p.goalId === c.goalId);
      return prev &&
        (prev.riskLevel === 'ON_TRACK' || prev.riskLevel === 'AT_RISK') &&
        (c.riskLevel === 'HIGH_RISK' || c.riskLevel === 'CRITICAL');
    }).length;

    // Velocity trend
    const currentAvgVelocity = current.reduce(
      (sum, a) => sum + a.trendAnalysis.progressVelocity, 0
    ) / current.length;

    const previousAvgVelocity = previous.reduce(
      (sum, a) => sum + a.trendAnalysis.progressVelocity, 0
    ) / previous.length;

    let avgVelocityTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (currentAvgVelocity - previousAvgVelocity > 0.5) {
      avgVelocityTrend = 'improving';
    } else if (previousAvgVelocity - currentAvgVelocity > 0.5) {
      avgVelocityTrend = 'declining';
    }

    return {
      weeklyRiskChange: currentHighRisk - previousHighRisk,
      goalsRecovered: recovered,
      goalsEscalated: escalated,
      avgVelocityTrend,
    };
  }

  private generateTeamRecommendations(
    summary: TeamRiskSummary,
    topRisks: GoalRiskAssessment[],
    trends: TeamTrends
  ): string[] {
    const recommendations: string[] = [];

    if (summary.critical > 0) {
      recommendations.push(`Immediate attention needed: ${summary.critical} critical goal(s) require intervention`);
    }

    if (summary.highRisk > summary.totalGoals * 0.3) {
      recommendations.push('Consider team capacity review - high percentage of goals at risk');
    }

    if (trends.goalsEscalated > trends.goalsRecovered) {
      recommendations.push('More goals escalating than recovering - review workload and priorities');
    }

    if (trends.avgVelocityTrend === 'declining') {
      recommendations.push('Team velocity declining - check for systemic blockers or resource constraints');
    }

    if (summary.avgCompletionProbability < 70) {
      recommendations.push('Overall completion probability is low - consider deadline or scope adjustments');
    }

    if (recommendations.length === 0) {
      recommendations.push('Team is on track - maintain current pace and monitoring');
    }

    return recommendations;
  }

  private calculateInterventionImpact(
    interventions: Intervention[],
    assessment: GoalRiskAssessment
  ): ExpectedOutcome {
    // Simulate impact of interventions
    let projectedRiskReduction = 0;
    let projectedProbabilityGain = 0;

    for (const intervention of interventions) {
      switch (intervention.type) {
        case 'IMMEDIATE_ACTION':
          projectedRiskReduction += 15;
          projectedProbabilityGain += 10;
          break;
        case 'VELOCITY_IMPROVEMENT':
          projectedProbabilityGain += 15;
          break;
        case 'BLOCKER_REMOVAL':
          projectedRiskReduction += 20;
          projectedProbabilityGain += 15;
          break;
        case 'RESOURCE_REVIEW':
          projectedProbabilityGain += 10;
          break;
        case 'SCOPE_ADJUSTMENT':
          projectedProbabilityGain += 20;
          break;
        default:
          projectedRiskReduction += 5;
      }
    }

    return {
      projectedRiskLevel: this.determineRiskLevel(
        Math.max(0, assessment.riskScore - projectedRiskReduction)
      ),
      projectedCompletionProbability: Math.min(
        100,
        assessment.completionProbability + projectedProbabilityGain
      ),
      confidence: Math.min(80, 40 + interventions.length * 10),
    };
  }

  private defineEscalationPath(
    riskLevel: GoalRiskAssessment['riskLevel']
  ): EscalationStep[] {
    const steps: EscalationStep[] = [];

    if (riskLevel === 'AT_RISK' || riskLevel === 'HIGH_RISK' || riskLevel === 'CRITICAL') {
      steps.push({
        level: 1,
        trigger: 'No progress after 3 days of intervention',
        action: 'Escalate to skip-level manager',
        owner: 'Manager',
      });
    }

    if (riskLevel === 'HIGH_RISK' || riskLevel === 'CRITICAL') {
      steps.push({
        level: 2,
        trigger: 'No improvement after 1 week',
        action: 'Involve HR/leadership for resource review',
        owner: 'Skip-level manager',
      });
    }

    if (riskLevel === 'CRITICAL') {
      steps.push({
        level: 3,
        trigger: 'Goal cannot be salvaged',
        action: 'Document lessons learned and adjust future planning',
        owner: 'Leadership',
      });
    }

    return steps;
  }

  private defineCheckpoints(
    assessment: GoalRiskAssessment,
    goal: GoalData
  ): Checkpoint[] {
    const checkpoints: Checkpoint[] = [];
    const daysRemaining = assessment.daysUntilDeadline;

    if (daysRemaining > 14) {
      checkpoints.push({
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        expectedProgress: goal.progress + (assessment.trendAnalysis.requiredVelocity * 7),
        checkType: 'WEEKLY_REVIEW',
      });

      checkpoints.push({
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        expectedProgress: goal.progress + (assessment.trendAnalysis.requiredVelocity * 14),
        checkType: 'WEEKLY_REVIEW',
      });
    } else if (daysRemaining > 7) {
      checkpoints.push({
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        expectedProgress: goal.progress + (assessment.trendAnalysis.requiredVelocity * 3),
        checkType: 'MIDWEEK_CHECK',
      });

      checkpoints.push({
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        expectedProgress: goal.progress + (assessment.trendAnalysis.requiredVelocity * 7),
        checkType: 'WEEKLY_REVIEW',
      });
    } else if (daysRemaining > 0) {
      checkpoints.push({
        date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        expectedProgress: goal.progress + assessment.trendAnalysis.requiredVelocity,
        checkType: 'DAILY_CHECK',
      });
    }

    return checkpoints;
  }

  private calculateDaysBetween(date1: Date, date2: Date): number {
    const diff = new Date(date2).getTime() - new Date(date1).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  private calculateVelocityForRange(updates: ProgressUpdate[]): number {
    if (updates.length < 2) return 0;

    const first = updates[0];
    const last = updates[updates.length - 1];

    const progressChange = last.progress - first.progress;
    const days = this.calculateDaysBetween(first.date, last.date);

    return days > 0 ? progressChange / days : 0;
  }

  private getProgressAtDaysAgo(
    history: ProgressUpdate[],
    daysAgo: number
  ): number | null {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysAgo);

    // Find closest update before target date
    const before = history
      .filter(u => new Date(u.date) <= targetDate)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    return before?.progress ?? null;
  }

  private generateProjections(
    currentProgress: number,
    velocity: number,
    daysUntilDeadline: number
  ): ProjectedProgress[] {
    const projections: ProjectedProgress[] = [];
    const today = new Date();

    const checkpoints = [7, 14, 21, daysUntilDeadline].filter(d => d <= daysUntilDeadline);

    for (const days of checkpoints) {
      const date = new Date(today);
      date.setDate(date.getDate() + days);

      const projected = Math.min(100, currentProgress + velocity * days);
      const variance = Math.min(10, days * 0.5);

      projections.push({
        date,
        projectedProgress: Math.round(projected),
        lowerBound: Math.max(0, Math.round(projected - variance)),
        upperBound: Math.min(100, Math.round(projected + variance)),
      });
    }

    return projections;
  }

  private createDefaultHistory(userId: string): UserHistoricalData {
    return {
      userId,
      totalGoalsCompleted: 0,
      totalGoalsMissed: 0,
      avgCompletionRate: 70, // Assume average for new users
      avgDaysEarlyOrLate: 0,
      recentGoalVelocities: [],
    };
  }

  private calculateOverallHealth(assessments: GoalRiskAssessment[]): number {
    if (assessments.length === 0) return 100;

    const avgProbability = assessments.reduce(
      (sum, a) => sum + a.completionProbability, 0
    ) / assessments.length;

    const criticalCount = assessments.filter(a => a.riskLevel === 'CRITICAL').length;
    const highRiskCount = assessments.filter(a => a.riskLevel === 'HIGH_RISK').length;

    const penaltyForCritical = criticalCount * 10;
    const penaltyForHighRisk = highRiskCount * 5;

    return Math.max(0, Math.round(avgProbability - penaltyForCritical - penaltyForHighRisk));
  }

  private generateMonitoringSummary(assessments: GoalRiskAssessment[]): string {
    const critical = assessments.filter(a => a.riskLevel === 'CRITICAL').length;
    const highRisk = assessments.filter(a => a.riskLevel === 'HIGH_RISK').length;
    const atRisk = assessments.filter(a => a.riskLevel === 'AT_RISK').length;
    const onTrack = assessments.filter(a => a.riskLevel === 'ON_TRACK').length;

    if (critical > 0) {
      return `ALERT: ${critical} critical and ${highRisk} high-risk goals require immediate attention`;
    } else if (highRisk > 0) {
      return `WARNING: ${highRisk} high-risk goals need intervention. ${onTrack} goals on track.`;
    } else if (atRisk > 0) {
      return `ATTENTION: ${atRisk} goals at risk. ${onTrack} goals on track.`;
    } else {
      return `All ${onTrack} monitored goals are on track`;
    }
  }
}

// Supporting types

interface InterventionPlan {
  goalId: string;
  goalTitle: string;
  currentRiskLevel: GoalRiskAssessment['riskLevel'];
  createdAt: Date;
  interventions: Intervention[];
  expectedOutcome: ExpectedOutcome;
  escalationPath: EscalationStep[];
  checkpoints: Checkpoint[];
}

interface Intervention {
  type: string;
  title: string;
  description: string;
  owner: string;
  deadline: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  priority: number;
}

interface ExpectedOutcome {
  projectedRiskLevel: GoalRiskAssessment['riskLevel'];
  projectedCompletionProbability: number;
  confidence: number;
}

interface EscalationStep {
  level: number;
  trigger: string;
  action: string;
  owner: string;
}

interface Checkpoint {
  date: Date;
  expectedProgress: number;
  checkType: 'DAILY_CHECK' | 'MIDWEEK_CHECK' | 'WEEKLY_REVIEW';
}

interface MonitoringResult {
  timestamp: Date;
  totalGoalsMonitored: number;
  assessments: GoalRiskAssessment[];
  alerts: Alert[];
  actionRequired: GoalRiskAssessment[];
  overallHealth: number;
  summary: string;
}

export const goalEarlyWarningSystem = new GoalEarlyWarningSystem();
