/**
 * Performance Simulator - USP Feature 8
 *
 * Advanced what-if simulation engine that allows managers and HR to model
 * the impact of performance decisions before committing them. Simulates
 * cascading effects on team dynamics, compensation budgets, promotion
 * pipelines, and organizational health metrics.
 *
 * Key capabilities:
 * - Rating change impact simulation
 * - Promotion scenario modeling
 * - Compensation budget optimization
 * - Team composition forecasting
 * - Attrition risk prediction
 * - Career path simulation
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

// ============================================================================
// Type Definitions
// ============================================================================

export type SimulationType =
  | 'rating_change'
  | 'promotion'
  | 'compensation'
  | 'team_restructure'
  | 'goal_adjustment'
  | 'pip_initiation'
  | 'termination'
  | 'hiring'
  | 'career_path'
  | 'budget_allocation';

export interface SimulationScenario {
  id: string;
  tenantId: string;
  createdBy: string;
  name: string;
  description: string;
  type: SimulationType;
  baselineSnapshot: OrganizationalSnapshot;
  changes: SimulationChange[];
  constraints: SimulationConstraint[];
  createdAt: Date;
  status: 'draft' | 'running' | 'completed' | 'failed';
}

export interface SimulationChange {
  id: string;
  changeType: SimulationType;
  targetId: string; // User, team, or department ID
  targetType: 'user' | 'team' | 'department';
  currentValue: any;
  proposedValue: any;
  effectiveDate: Date;
  rationale?: string;
}

export interface SimulationConstraint {
  type: 'budget' | 'headcount' | 'distribution' | 'timeline' | 'policy';
  parameter: string;
  operator: 'eq' | 'lt' | 'lte' | 'gt' | 'gte' | 'between';
  value: number | [number, number];
  hardConstraint: boolean; // If true, simulation fails if violated
}

export interface OrganizationalSnapshot {
  timestamp: Date;
  totalEmployees: number;
  totalCompensation: number;
  averageRating: number;
  ratingDistribution: Record<string, number>;
  departmentMetrics: DepartmentMetrics[];
  promotionPipeline: PromotionCandidate[];
  attritionRisk: AttritionRiskSummary;
  engagementScore: number;
}

export interface DepartmentMetrics {
  departmentId: string;
  departmentName: string;
  headcount: number;
  avgRating: number;
  avgCompensation: number;
  avgTenure: number;
  attritionRate: number;
  promotionRate: number;
  openPositions: number;
}

export interface PromotionCandidate {
  userId: string;
  currentLevel: string;
  targetLevel: string;
  readinessScore: number;
  timeInRole: number;
  blockers: string[];
}

export interface AttritionRiskSummary {
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  topRiskFactors: string[];
  estimatedCost: number;
}

export interface SimulationResult {
  scenarioId: string;
  executedAt: Date;
  success: boolean;
  futureSnapshot: OrganizationalSnapshot;
  impacts: SimulationImpact[];
  cascadingEffects: CascadingEffect[];
  constraintViolations: ConstraintViolation[];
  recommendations: SimulationRecommendation[];
  confidenceScore: number;
  alternativeScenarios: AlternativeScenario[];
}

export interface SimulationImpact {
  category: string;
  metric: string;
  currentValue: number;
  projectedValue: number;
  changePercent: number;
  trend: 'positive' | 'negative' | 'neutral';
  significance: 'low' | 'medium' | 'high' | 'critical';
}

export interface CascadingEffect {
  id: string;
  triggerChange: string;
  affectedEntity: string;
  entityType: 'user' | 'team' | 'department' | 'budget' | 'policy';
  effect: string;
  magnitude: number;
  probability: number;
  timeframe: string;
}

export interface ConstraintViolation {
  constraintType: string;
  parameter: string;
  limit: number | [number, number];
  actualValue: number;
  severity: 'warning' | 'error' | 'critical';
  suggestion: string;
}

export interface SimulationRecommendation {
  priority: number;
  category: string;
  recommendation: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
}

export interface AlternativeScenario {
  name: string;
  description: string;
  changes: SimulationChange[];
  projectedOutcome: Partial<SimulationResult>;
  tradeoffs: string[];
}

export interface TeamDynamicsProjection {
  teamId: string;
  currentState: TeamState;
  projectedState: TeamState;
  moralePrediction: number;
  productivityPrediction: number;
  collaborationScore: number;
  riskFactors: string[];
}

export interface TeamState {
  size: number;
  avgPerformance: number;
  skillCoverage: Record<string, number>;
  seniorityMix: Record<string, number>;
  diversityMetrics: Record<string, number>;
  openRoles: number;
}

export interface CareerPathSimulation {
  userId: string;
  currentRole: string;
  currentLevel: number;
  simulatedPaths: CareerPath[];
  optimalPath: CareerPath;
  developmentGaps: DevelopmentGap[];
}

export interface CareerPath {
  pathId: string;
  name: string;
  steps: CareerStep[];
  totalDuration: number; // months
  probability: number;
  requirements: string[];
  blockers: string[];
}

export interface CareerStep {
  stepNumber: number;
  role: string;
  level: number;
  expectedDuration: number; // months
  prerequisites: string[];
  developmentActivities: string[];
}

export interface DevelopmentGap {
  skill: string;
  currentLevel: number;
  requiredLevel: number;
  urgency: 'low' | 'medium' | 'high';
  suggestedActions: string[];
}

export interface BudgetSimulation {
  scenarioId: string;
  currentBudget: BudgetBreakdown;
  proposedBudget: BudgetBreakdown;
  impactAnalysis: BudgetImpact[];
  optimizationSuggestions: BudgetOptimization[];
}

export interface BudgetBreakdown {
  totalCompensation: number;
  baseSalary: number;
  bonusPool: number;
  equityPool: number;
  benefitsCost: number;
  trainingBudget: number;
  contingency: number;
}

export interface BudgetImpact {
  category: string;
  currentSpend: number;
  projectedSpend: number;
  variance: number;
  variancePercent: number;
  justification: string;
}

export interface BudgetOptimization {
  area: string;
  currentAllocation: number;
  suggestedAllocation: number;
  expectedROI: number;
  rationale: string;
}

// ============================================================================
// Performance Simulator Service
// ============================================================================

export class PerformanceSimulator {
  private prisma: PrismaClient;
  private redis: Redis;

  // Simulation parameters
  private readonly attritionCoefficients = {
    lowRating: 0.35,
    belowMarketPay: 0.25,
    limitedGrowth: 0.20,
    poorManagerRelation: 0.15,
    workLifeBalance: 0.10,
    marketConditions: 0.08,
  };

  private readonly promotionReadinessWeights = {
    performanceHistory: 0.30,
    skillDevelopment: 0.25,
    leadershipPotential: 0.20,
    timeInRole: 0.15,
    sponsorship: 0.10,
  };

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
  }

  /**
   * Create a new simulation scenario
   */
  async createScenario(
    tenantId: string,
    createdBy: string,
    name: string,
    description: string,
    type: SimulationType,
    changes: SimulationChange[],
    constraints: SimulationConstraint[] = []
  ): Promise<SimulationScenario> {
    // Capture current organizational snapshot
    const baselineSnapshot = await this.captureOrganizationalSnapshot(tenantId);

    const scenario: SimulationScenario = {
      id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      createdBy,
      name,
      description,
      type,
      baselineSnapshot,
      changes,
      constraints,
      createdAt: new Date(),
      status: 'draft',
    };

    // Cache scenario
    await this.redis.set(
      `simulation:${scenario.id}`,
      JSON.stringify(scenario),
      'EX',
      7 * 24 * 60 * 60 // 7 days
    );

    return scenario;
  }

  /**
   * Run a simulation and calculate impacts
   */
  async runSimulation(scenarioId: string): Promise<SimulationResult> {
    const scenario = await this.getScenario(scenarioId);
    if (!scenario) {
      throw new Error('Scenario not found');
    }

    // Update status
    scenario.status = 'running';
    await this.updateScenario(scenario);

    try {
      // Apply changes to virtual snapshot
      const futureSnapshot = await this.applyChangesToSnapshot(
        scenario.baselineSnapshot,
        scenario.changes,
        scenario.tenantId
      );

      // Calculate impacts
      const impacts = this.calculateImpacts(scenario.baselineSnapshot, futureSnapshot);

      // Detect cascading effects
      const cascadingEffects = await this.detectCascadingEffects(
        scenario.changes,
        scenario.tenantId
      );

      // Check constraints
      const constraintViolations = this.checkConstraints(
        scenario.constraints,
        futureSnapshot,
        impacts
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        impacts,
        cascadingEffects,
        constraintViolations
      );

      // Calculate confidence score
      const confidenceScore = this.calculateConfidenceScore(
        scenario.changes,
        cascadingEffects,
        constraintViolations
      );

      // Generate alternative scenarios
      const alternativeScenarios = await this.generateAlternatives(
        scenario,
        impacts,
        constraintViolations
      );

      const result: SimulationResult = {
        scenarioId,
        executedAt: new Date(),
        success: constraintViolations.filter(v => v.severity === 'critical').length === 0,
        futureSnapshot,
        impacts,
        cascadingEffects,
        constraintViolations,
        recommendations,
        confidenceScore,
        alternativeScenarios,
      };

      // Update scenario status
      scenario.status = 'completed';
      await this.updateScenario(scenario);

      // Cache result
      await this.redis.set(
        `simulation:result:${scenarioId}`,
        JSON.stringify(result),
        'EX',
        7 * 24 * 60 * 60
      );

      return result;

    } catch (error) {
      scenario.status = 'failed';
      await this.updateScenario(scenario);
      throw error;
    }
  }

  /**
   * Simulate rating change impact on individual and team
   */
  async simulateRatingChange(
    tenantId: string,
    userId: string,
    currentRating: number,
    newRating: number
  ): Promise<{
    individualImpact: SimulationImpact[];
    teamImpact: TeamDynamicsProjection;
    compensationImpact: BudgetImpact[];
    attritionRisk: number;
    recommendations: SimulationRecommendation[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        team: true,
        manager: true,
      },
    });

    if (!user) throw new Error('User not found');

    // Individual impact
    const individualImpact: SimulationImpact[] = [];

    // Rating change impact
    const ratingDelta = newRating - currentRating;
    individualImpact.push({
      category: 'Performance',
      metric: 'Performance Rating',
      currentValue: currentRating,
      projectedValue: newRating,
      changePercent: (ratingDelta / currentRating) * 100,
      trend: ratingDelta > 0 ? 'positive' : ratingDelta < 0 ? 'negative' : 'neutral',
      significance: Math.abs(ratingDelta) >= 1 ? 'high' : Math.abs(ratingDelta) >= 0.5 ? 'medium' : 'low',
    });

    // Bonus impact
    const bonusMultiplier = this.calculateBonusMultiplier(newRating);
    const currentBonusMultiplier = this.calculateBonusMultiplier(currentRating);
    individualImpact.push({
      category: 'Compensation',
      metric: 'Bonus Multiplier',
      currentValue: currentBonusMultiplier,
      projectedValue: bonusMultiplier,
      changePercent: ((bonusMultiplier - currentBonusMultiplier) / currentBonusMultiplier) * 100,
      trend: bonusMultiplier > currentBonusMultiplier ? 'positive' : 'negative',
      significance: Math.abs(bonusMultiplier - currentBonusMultiplier) > 0.2 ? 'high' : 'medium',
    });

    // Promotion eligibility impact
    const currentPromoEligible = currentRating >= 4;
    const newPromoEligible = newRating >= 4;
    if (currentPromoEligible !== newPromoEligible) {
      individualImpact.push({
        category: 'Career',
        metric: 'Promotion Eligibility',
        currentValue: currentPromoEligible ? 1 : 0,
        projectedValue: newPromoEligible ? 1 : 0,
        changePercent: newPromoEligible ? 100 : -100,
        trend: newPromoEligible ? 'positive' : 'negative',
        significance: 'high',
      });
    }

    // Team impact
    const teamImpact = await this.projectTeamDynamics(
      user.teamId || user.departmentId || '',
      [{ userId, oldRating: currentRating, newRating }],
      tenantId
    );

    // Compensation impact
    const compensationImpact = this.calculateCompensationImpact(
      user,
      currentRating,
      newRating
    );

    // Attrition risk
    const attritionRisk = this.calculateAttritionRisk(user, newRating);

    // Recommendations
    const recommendations: SimulationRecommendation[] = [];

    if (ratingDelta < -1) {
      recommendations.push({
        priority: 1,
        category: 'Development',
        recommendation: 'Create performance improvement plan with clear milestones',
        impact: 'Prevent further performance decline and potential attrition',
        effort: 'medium',
        timeframe: '30 days',
      });
    }

    if (attritionRisk > 0.6) {
      recommendations.push({
        priority: 1,
        category: 'Retention',
        recommendation: 'Schedule one-on-one discussion to understand concerns',
        impact: 'Reduce attrition risk by addressing underlying issues',
        effort: 'low',
        timeframe: '7 days',
      });
    }

    return {
      individualImpact,
      teamImpact,
      compensationImpact,
      attritionRisk,
      recommendations,
    };
  }

  /**
   * Simulate promotion impact
   */
  async simulatePromotion(
    tenantId: string,
    userId: string,
    targetLevel: string,
    effectiveDate: Date
  ): Promise<{
    readinessAssessment: PromotionCandidate;
    budgetImpact: BudgetSimulation;
    teamImpact: TeamDynamicsProjection;
    peerComparison: any[];
    successProbability: number;
    recommendations: SimulationRecommendation[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        team: true,
        reviewsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        goalsOwned: {
          where: { status: 'completed' },
        },
      },
    });

    if (!user) throw new Error('User not found');

    // Readiness assessment
    const readinessAssessment = await this.assessPromotionReadiness(user, targetLevel);

    // Budget impact
    const budgetImpact = await this.simulateBudgetImpact(
      tenantId,
      [{ type: 'promotion', userId, targetLevel, effectiveDate }]
    );

    // Team impact
    const teamImpact = await this.projectTeamDynamics(
      user.teamId || user.departmentId || '',
      [],
      tenantId,
      [{ userId, newLevel: targetLevel }]
    );

    // Peer comparison
    const peerComparison = await this.compareToPeers(user, targetLevel, tenantId);

    // Success probability
    const successProbability = this.calculatePromotionSuccess(readinessAssessment);

    // Recommendations
    const recommendations: SimulationRecommendation[] = [];

    if (readinessAssessment.readinessScore < 0.7) {
      recommendations.push({
        priority: 1,
        category: 'Development',
        recommendation: `Address blockers: ${readinessAssessment.blockers.join(', ')}`,
        impact: 'Increase promotion success probability',
        effort: 'medium',
        timeframe: '60 days',
      });
    }

    if (budgetImpact.impactAnalysis.some(i => i.variancePercent > 10)) {
      recommendations.push({
        priority: 2,
        category: 'Budget',
        recommendation: 'Consider phased compensation increase',
        impact: 'Reduce immediate budget strain',
        effort: 'low',
        timeframe: 'immediate',
      });
    }

    return {
      readinessAssessment,
      budgetImpact,
      teamImpact,
      peerComparison,
      successProbability,
      recommendations,
    };
  }

  /**
   * Simulate career path options
   */
  async simulateCareerPaths(
    tenantId: string,
    userId: string
  ): Promise<CareerPathSimulation> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        reviewsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        goalsOwned: true,
        skills: true,
      },
    });

    if (!user) throw new Error('User not found');

    // Get available career paths
    const paths = await this.getAvailableCareerPaths(user, tenantId);

    // Simulate each path
    const simulatedPaths: CareerPath[] = [];

    for (const pathTemplate of paths) {
      const simulatedPath = this.simulatePath(user, pathTemplate);
      simulatedPaths.push(simulatedPath);
    }

    // Identify optimal path
    const optimalPath = simulatedPaths.reduce((best, current) =>
      (current.probability > best.probability) ? current : best
    );

    // Identify development gaps
    const developmentGaps = this.identifyDevelopmentGaps(user, optimalPath);

    return {
      userId,
      currentRole: user.jobTitle || 'Unknown',
      currentLevel: this.extractLevel(user.jobTitle || ''),
      simulatedPaths,
      optimalPath,
      developmentGaps,
    };
  }

  /**
   * Simulate team restructuring
   */
  async simulateTeamRestructure(
    tenantId: string,
    teamId: string,
    changes: {
      additions: string[];
      removals: string[];
      roleChanges: { userId: string; newRole: string }[];
    }
  ): Promise<{
    currentState: TeamState;
    projectedState: TeamState;
    impacts: SimulationImpact[];
    risks: string[];
    recommendations: SimulationRecommendation[];
  }> {
    // Get current team state
    const currentState = await this.captureTeamState(teamId, tenantId);

    // Apply changes
    const projectedState = this.applyTeamChanges(currentState, changes);

    // Calculate impacts
    const impacts: SimulationImpact[] = [];

    // Headcount impact
    impacts.push({
      category: 'Team',
      metric: 'Headcount',
      currentValue: currentState.size,
      projectedValue: projectedState.size,
      changePercent: ((projectedState.size - currentState.size) / currentState.size) * 100,
      trend: projectedState.size > currentState.size ? 'positive' : 'negative',
      significance: Math.abs(projectedState.size - currentState.size) > 2 ? 'high' : 'medium',
    });

    // Performance impact
    impacts.push({
      category: 'Team',
      metric: 'Average Performance',
      currentValue: currentState.avgPerformance,
      projectedValue: projectedState.avgPerformance,
      changePercent: ((projectedState.avgPerformance - currentState.avgPerformance) / currentState.avgPerformance) * 100,
      trend: projectedState.avgPerformance > currentState.avgPerformance ? 'positive' : 'negative',
      significance: Math.abs(projectedState.avgPerformance - currentState.avgPerformance) > 0.3 ? 'high' : 'medium',
    });

    // Identify risks
    const risks: string[] = [];

    // Skill coverage risk
    for (const [skill, coverage] of Object.entries(projectedState.skillCoverage)) {
      if (coverage < 0.5) {
        risks.push(`Critical skill gap: ${skill} coverage dropped to ${(coverage * 100).toFixed(0)}%`);
      }
    }

    // Seniority risk
    const seniorRatio = (projectedState.seniorityMix['senior'] || 0) /
      Object.values(projectedState.seniorityMix).reduce((a, b) => a + b, 0);
    if (seniorRatio < 0.2) {
      risks.push('Team may lack senior guidance - senior ratio below 20%');
    }

    // Recommendations
    const recommendations: SimulationRecommendation[] = [];

    if (changes.removals.length > changes.additions.length) {
      recommendations.push({
        priority: 1,
        category: 'Hiring',
        recommendation: 'Consider backfilling to maintain team capacity',
        impact: 'Prevent work overload on remaining team members',
        effort: 'high',
        timeframe: '30-60 days',
      });
    }

    return {
      currentState,
      projectedState,
      impacts,
      risks,
      recommendations,
    };
  }

  /**
   * Simulate budget allocation scenarios
   */
  async simulateBudgetAllocation(
    tenantId: string,
    proposedAllocation: Partial<BudgetBreakdown>
  ): Promise<BudgetSimulation> {
    // Get current budget
    const currentBudget = await this.getCurrentBudget(tenantId);

    // Apply proposed changes
    const proposedBudget: BudgetBreakdown = {
      ...currentBudget,
      ...proposedAllocation,
    };

    // Analyze impact
    const impactAnalysis: BudgetImpact[] = [];

    for (const [category, currentValue] of Object.entries(currentBudget)) {
      const projectedValue = proposedBudget[category as keyof BudgetBreakdown] || 0;
      const variance = projectedValue - currentValue;

      impactAnalysis.push({
        category,
        currentSpend: currentValue,
        projectedSpend: projectedValue,
        variance,
        variancePercent: currentValue > 0 ? (variance / currentValue) * 100 : 0,
        justification: this.getVarianceJustification(category, variance),
      });
    }

    // Generate optimization suggestions
    const optimizationSuggestions = this.generateBudgetOptimizations(
      currentBudget,
      proposedBudget,
      tenantId
    );

    return {
      scenarioId: `budget_${Date.now()}`,
      currentBudget,
      proposedBudget,
      impactAnalysis,
      optimizationSuggestions,
    };
  }

  /**
   * Monte Carlo simulation for attrition forecasting
   */
  async simulateAttritionScenarios(
    tenantId: string,
    timeframeMonths: number,
    iterations: number = 1000
  ): Promise<{
    expectedAttrition: number;
    confidenceInterval: [number, number];
    distribution: number[];
    highRiskEmployees: { userId: string; risk: number; factors: string[] }[];
    costProjection: number;
    recommendations: SimulationRecommendation[];
  }> {
    // Get all employees with risk factors
    const employees = await this.prisma.user.findMany({
      where: { tenantId, status: 'active' },
      include: {
        reviewsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        department: true,
      },
    });

    // Calculate individual risk scores
    const employeeRisks = employees.map(emp => ({
      userId: emp.id,
      risk: this.calculateAttritionRisk(emp),
      factors: this.identifyRiskFactors(emp),
      salary: emp.salary || 50000, // Default for calculation
    }));

    // Run Monte Carlo simulation
    const attritionResults: number[] = [];

    for (let i = 0; i < iterations; i++) {
      let attritionCount = 0;
      for (const emp of employeeRisks) {
        // Adjust risk for timeframe
        const adjustedRisk = 1 - Math.pow(1 - emp.risk, timeframeMonths / 12);
        if (Math.random() < adjustedRisk) {
          attritionCount++;
        }
      }
      attritionResults.push(attritionCount);
    }

    // Calculate statistics
    attritionResults.sort((a, b) => a - b);
    const expectedAttrition = attritionResults.reduce((a, b) => a + b, 0) / iterations;
    const confidenceInterval: [number, number] = [
      attritionResults[Math.floor(iterations * 0.05)],
      attritionResults[Math.floor(iterations * 0.95)],
    ];

    // Create distribution histogram
    const maxAttrition = Math.max(...attritionResults);
    const distribution = new Array(maxAttrition + 1).fill(0);
    for (const result of attritionResults) {
      distribution[result]++;
    }

    // High risk employees
    const highRiskEmployees = employeeRisks
      .filter(e => e.risk > 0.5)
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 20)
      .map(e => ({ userId: e.userId, risk: e.risk, factors: e.factors }));

    // Cost projection
    const avgReplacementCost = 0.5; // 50% of salary
    const costProjection = employeeRisks.reduce((sum, emp) => {
      const adjustedRisk = 1 - Math.pow(1 - emp.risk, timeframeMonths / 12);
      return sum + (adjustedRisk * emp.salary * avgReplacementCost);
    }, 0);

    // Recommendations
    const recommendations: SimulationRecommendation[] = [];

    if (highRiskEmployees.length > employees.length * 0.1) {
      recommendations.push({
        priority: 1,
        category: 'Retention',
        recommendation: 'Initiate retention program for high-risk employees',
        impact: `Could prevent ${Math.round(highRiskEmployees.length * 0.3)} departures`,
        effort: 'medium',
        timeframe: '30 days',
      });
    }

    const commonFactors = this.findCommonRiskFactors(highRiskEmployees);
    for (const factor of commonFactors.slice(0, 3)) {
      recommendations.push({
        priority: 2,
        category: 'Root Cause',
        recommendation: `Address common risk factor: ${factor.factor}`,
        impact: `Affects ${factor.count} high-risk employees`,
        effort: factor.effort,
        timeframe: factor.timeframe,
      });
    }

    return {
      expectedAttrition,
      confidenceInterval,
      distribution,
      highRiskEmployees,
      costProjection,
      recommendations,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async captureOrganizationalSnapshot(tenantId: string): Promise<OrganizationalSnapshot> {
    const employees = await this.prisma.user.findMany({
      where: { tenantId, status: 'active' },
      include: {
        department: true,
        reviewsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const totalEmployees = employees.length;
    const totalCompensation = employees.reduce((sum, e) => sum + (e.salary || 0), 0);

    // Rating distribution
    const ratings = employees
      .map(e => e.reviewsReceived[0]?.overallRating)
      .filter((r): r is number => r != null);
    const averageRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 3;

    const ratingDistribution: Record<string, number> = {
      '1': ratings.filter(r => r >= 1 && r < 2).length,
      '2': ratings.filter(r => r >= 2 && r < 3).length,
      '3': ratings.filter(r => r >= 3 && r < 4).length,
      '4': ratings.filter(r => r >= 4 && r < 5).length,
      '5': ratings.filter(r => r === 5).length,
    };

    // Department metrics
    const departments = await this.prisma.department.findMany({
      where: { tenantId },
      include: { users: true },
    });

    const departmentMetrics: DepartmentMetrics[] = departments.map(dept => {
      const deptEmployees = employees.filter(e => e.departmentId === dept.id);
      const deptRatings = deptEmployees
        .map(e => e.reviewsReceived[0]?.overallRating)
        .filter((r): r is number => r != null);

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        headcount: deptEmployees.length,
        avgRating: deptRatings.length > 0
          ? deptRatings.reduce((a, b) => a + b, 0) / deptRatings.length
          : 3,
        avgCompensation: deptEmployees.length > 0
          ? deptEmployees.reduce((sum, e) => sum + (e.salary || 0), 0) / deptEmployees.length
          : 0,
        avgTenure: this.calculateAvgTenure(deptEmployees),
        attritionRate: 0.1, // Would be calculated from historical data
        promotionRate: 0.08,
        openPositions: 0,
      };
    });

    // Promotion pipeline
    const promotionPipeline = employees
      .filter(e => (e.reviewsReceived[0]?.overallRating || 0) >= 4)
      .map(e => ({
        userId: e.id,
        currentLevel: e.jobTitle || 'Unknown',
        targetLevel: this.getNextLevel(e.jobTitle || ''),
        readinessScore: this.calculateQuickReadiness(e),
        timeInRole: this.calculateTenure(e.hireDate),
        blockers: [],
      }));

    // Attrition risk summary
    const attritionRisks = employees.map(e => this.calculateAttritionRisk(e));
    const attritionRisk: AttritionRiskSummary = {
      highRisk: attritionRisks.filter(r => r > 0.6).length,
      mediumRisk: attritionRisks.filter(r => r > 0.3 && r <= 0.6).length,
      lowRisk: attritionRisks.filter(r => r <= 0.3).length,
      topRiskFactors: ['Compensation', 'Growth Opportunities', 'Work-Life Balance'],
      estimatedCost: attritionRisks.reduce((sum, r) => sum + r * 50000, 0), // Simplified
    };

    return {
      timestamp: new Date(),
      totalEmployees,
      totalCompensation,
      averageRating,
      ratingDistribution,
      departmentMetrics,
      promotionPipeline,
      attritionRisk,
      engagementScore: 72, // Would come from engagement surveys
    };
  }

  private async applyChangesToSnapshot(
    baseline: OrganizationalSnapshot,
    changes: SimulationChange[],
    tenantId: string
  ): Promise<OrganizationalSnapshot> {
    const future = { ...baseline, timestamp: new Date() };

    for (const change of changes) {
      switch (change.changeType) {
        case 'rating_change':
          this.applyRatingChange(future, change);
          break;
        case 'promotion':
          this.applyPromotion(future, change);
          break;
        case 'compensation':
          this.applyCompensationChange(future, change);
          break;
        case 'hiring':
          this.applyHiring(future, change);
          break;
        case 'termination':
          this.applyTermination(future, change);
          break;
      }
    }

    // Recalculate derived metrics
    future.averageRating = this.recalculateAverageRating(future.ratingDistribution);

    return future;
  }

  private applyRatingChange(snapshot: OrganizationalSnapshot, change: SimulationChange): void {
    const oldBucket = Math.floor(change.currentValue as number).toString();
    const newBucket = Math.floor(change.proposedValue as number).toString();

    if (snapshot.ratingDistribution[oldBucket]) {
      snapshot.ratingDistribution[oldBucket]--;
    }
    snapshot.ratingDistribution[newBucket] = (snapshot.ratingDistribution[newBucket] || 0) + 1;
  }

  private applyPromotion(snapshot: OrganizationalSnapshot, change: SimulationChange): void {
    snapshot.totalCompensation += (change.proposedValue.salaryIncrease || 0);

    // Update promotion pipeline
    snapshot.promotionPipeline = snapshot.promotionPipeline.filter(
      p => p.userId !== change.targetId
    );
  }

  private applyCompensationChange(snapshot: OrganizationalSnapshot, change: SimulationChange): void {
    const delta = (change.proposedValue as number) - (change.currentValue as number);
    snapshot.totalCompensation += delta;
  }

  private applyHiring(snapshot: OrganizationalSnapshot, change: SimulationChange): void {
    snapshot.totalEmployees++;
    snapshot.totalCompensation += (change.proposedValue.salary || 50000);
  }

  private applyTermination(snapshot: OrganizationalSnapshot, change: SimulationChange): void {
    snapshot.totalEmployees--;
    snapshot.totalCompensation -= (change.currentValue.salary || 50000);

    // Update attrition risk
    snapshot.attritionRisk.highRisk = Math.max(0, snapshot.attritionRisk.highRisk - 1);
  }

  private recalculateAverageRating(distribution: Record<string, number>): number {
    let sum = 0;
    let count = 0;
    for (const [rating, num] of Object.entries(distribution)) {
      sum += parseFloat(rating) * num;
      count += num;
    }
    return count > 0 ? sum / count : 3;
  }

  private calculateImpacts(
    baseline: OrganizationalSnapshot,
    future: OrganizationalSnapshot
  ): SimulationImpact[] {
    const impacts: SimulationImpact[] = [];

    // Headcount impact
    impacts.push({
      category: 'Organization',
      metric: 'Total Headcount',
      currentValue: baseline.totalEmployees,
      projectedValue: future.totalEmployees,
      changePercent: ((future.totalEmployees - baseline.totalEmployees) / baseline.totalEmployees) * 100,
      trend: future.totalEmployees >= baseline.totalEmployees ? 'positive' : 'negative',
      significance: Math.abs(future.totalEmployees - baseline.totalEmployees) > 5 ? 'high' : 'medium',
    });

    // Compensation impact
    impacts.push({
      category: 'Budget',
      metric: 'Total Compensation',
      currentValue: baseline.totalCompensation,
      projectedValue: future.totalCompensation,
      changePercent: ((future.totalCompensation - baseline.totalCompensation) / baseline.totalCompensation) * 100,
      trend: 'neutral',
      significance: Math.abs(future.totalCompensation - baseline.totalCompensation) > baseline.totalCompensation * 0.05 ? 'high' : 'medium',
    });

    // Rating impact
    impacts.push({
      category: 'Performance',
      metric: 'Average Rating',
      currentValue: baseline.averageRating,
      projectedValue: future.averageRating,
      changePercent: ((future.averageRating - baseline.averageRating) / baseline.averageRating) * 100,
      trend: future.averageRating > baseline.averageRating ? 'positive' : 'negative',
      significance: Math.abs(future.averageRating - baseline.averageRating) > 0.2 ? 'high' : 'low',
    });

    return impacts;
  }

  private async detectCascadingEffects(
    changes: SimulationChange[],
    tenantId: string
  ): Promise<CascadingEffect[]> {
    const effects: CascadingEffect[] = [];

    for (const change of changes) {
      // Rating changes can affect team morale
      if (change.changeType === 'rating_change') {
        const ratingDelta = (change.proposedValue as number) - (change.currentValue as number);
        if (ratingDelta < -1) {
          effects.push({
            id: `effect_${effects.length}`,
            triggerChange: `Rating decrease for ${change.targetId}`,
            affectedEntity: 'Team morale',
            entityType: 'team',
            effect: 'Potential decrease in team morale if handled poorly',
            magnitude: Math.abs(ratingDelta) * 0.3,
            probability: 0.6,
            timeframe: '1-3 months',
          });
        }
      }

      // Promotions affect peer dynamics
      if (change.changeType === 'promotion') {
        effects.push({
          id: `effect_${effects.length}`,
          triggerChange: `Promotion of ${change.targetId}`,
          affectedEntity: 'Peer employees',
          entityType: 'team',
          effect: 'May trigger increased promotion expectations from peers',
          magnitude: 0.4,
          probability: 0.5,
          timeframe: '1-6 months',
        });
      }

      // Terminations affect team workload
      if (change.changeType === 'termination') {
        effects.push({
          id: `effect_${effects.length}`,
          triggerChange: `Termination of ${change.targetId}`,
          affectedEntity: 'Team workload',
          entityType: 'team',
          effect: 'Increased workload on remaining team members',
          magnitude: 0.7,
          probability: 0.9,
          timeframe: 'Immediate',
        });
      }
    }

    return effects;
  }

  private checkConstraints(
    constraints: SimulationConstraint[],
    snapshot: OrganizationalSnapshot,
    impacts: SimulationImpact[]
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const constraint of constraints) {
      let actualValue: number;

      switch (constraint.parameter) {
        case 'totalCompensation':
          actualValue = snapshot.totalCompensation;
          break;
        case 'headcount':
          actualValue = snapshot.totalEmployees;
          break;
        case 'averageRating':
          actualValue = snapshot.averageRating;
          break;
        default:
          continue;
      }

      let violated = false;
      switch (constraint.operator) {
        case 'lt':
          violated = actualValue >= (constraint.value as number);
          break;
        case 'lte':
          violated = actualValue > (constraint.value as number);
          break;
        case 'gt':
          violated = actualValue <= (constraint.value as number);
          break;
        case 'gte':
          violated = actualValue < (constraint.value as number);
          break;
        case 'eq':
          violated = actualValue !== (constraint.value as number);
          break;
        case 'between':
          const [min, max] = constraint.value as [number, number];
          violated = actualValue < min || actualValue > max;
          break;
      }

      if (violated) {
        violations.push({
          constraintType: constraint.type,
          parameter: constraint.parameter,
          limit: constraint.value,
          actualValue,
          severity: constraint.hardConstraint ? 'critical' : 'warning',
          suggestion: `Adjust changes to bring ${constraint.parameter} within limits`,
        });
      }
    }

    return violations;
  }

  private generateRecommendations(
    impacts: SimulationImpact[],
    cascadingEffects: CascadingEffect[],
    violations: ConstraintViolation[]
  ): SimulationRecommendation[] {
    const recommendations: SimulationRecommendation[] = [];

    // Address constraint violations
    for (const violation of violations) {
      recommendations.push({
        priority: violation.severity === 'critical' ? 1 : 2,
        category: 'Constraint',
        recommendation: violation.suggestion,
        impact: `Resolve ${violation.severity} constraint violation`,
        effort: 'medium',
        timeframe: 'Before implementation',
      });
    }

    // Address high-magnitude cascading effects
    for (const effect of cascadingEffects.filter(e => e.magnitude > 0.5)) {
      recommendations.push({
        priority: 2,
        category: 'Risk Mitigation',
        recommendation: `Prepare for: ${effect.effect}`,
        impact: `Mitigate ${(effect.magnitude * 100).toFixed(0)}% impact on ${effect.affectedEntity}`,
        effort: 'medium',
        timeframe: effect.timeframe,
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private calculateConfidenceScore(
    changes: SimulationChange[],
    cascadingEffects: CascadingEffect[],
    violations: ConstraintViolation[]
  ): number {
    let score = 0.9; // Start high

    // Reduce for each high-impact change
    score -= changes.filter(c => c.changeType === 'termination').length * 0.05;

    // Reduce for uncertain cascading effects
    score -= cascadingEffects.filter(e => e.probability < 0.7).length * 0.03;

    // Reduce for violations
    score -= violations.filter(v => v.severity === 'critical').length * 0.1;
    score -= violations.filter(v => v.severity === 'warning').length * 0.05;

    return Math.max(0.3, Math.min(1, score));
  }

  private async generateAlternatives(
    scenario: SimulationScenario,
    impacts: SimulationImpact[],
    violations: ConstraintViolation[]
  ): Promise<AlternativeScenario[]> {
    const alternatives: AlternativeScenario[] = [];

    // If there are budget violations, suggest phased approach
    if (violations.some(v => v.constraintType === 'budget')) {
      alternatives.push({
        name: 'Phased Implementation',
        description: 'Spread changes over multiple quarters to manage budget impact',
        changes: scenario.changes.map(c => ({
          ...c,
          effectiveDate: new Date(c.effectiveDate.getTime() + 90 * 24 * 60 * 60 * 1000),
        })),
        projectedOutcome: {
          confidenceScore: 0.85,
        },
        tradeoffs: ['Delayed benefits realization', 'Reduced immediate impact on employees'],
      });
    }

    // Conservative alternative
    alternatives.push({
      name: 'Conservative Approach',
      description: 'Implement only high-confidence changes',
      changes: scenario.changes.filter(c =>
        c.changeType !== 'termination' && c.changeType !== 'pip_initiation'
      ),
      projectedOutcome: {
        confidenceScore: 0.95,
      },
      tradeoffs: ['Some performance issues may persist', 'Higher short-term costs'],
    });

    return alternatives;
  }

  private async projectTeamDynamics(
    teamId: string,
    ratingChanges: { userId: string; oldRating: number; newRating: number }[],
    tenantId: string,
    promotions: { userId: string; newLevel: string }[] = []
  ): Promise<TeamDynamicsProjection> {
    const currentState = await this.captureTeamState(teamId, tenantId);

    // Apply changes to get projected state
    const projectedState = { ...currentState };

    for (const change of ratingChanges) {
      const delta = change.newRating - change.oldRating;
      projectedState.avgPerformance += delta / projectedState.size;
    }

    // Morale prediction
    const negativeDelta = ratingChanges.filter(c => c.newRating < c.oldRating).length;
    const moralePrediction = Math.max(0.4, 0.8 - (negativeDelta * 0.1));

    // Productivity prediction
    const avgRatingChange = ratingChanges.reduce((sum, c) => sum + (c.newRating - c.oldRating), 0) / (ratingChanges.length || 1);
    const productivityPrediction = Math.max(0.5, 0.75 + avgRatingChange * 0.1);

    return {
      teamId,
      currentState,
      projectedState,
      moralePrediction,
      productivityPrediction,
      collaborationScore: 0.7,
      riskFactors: negativeDelta > 2 ? ['Multiple negative rating changes may affect team cohesion'] : [],
    };
  }

  private async captureTeamState(teamId: string, tenantId: string): Promise<TeamState> {
    const teamMembers = await this.prisma.user.findMany({
      where: {
        OR: [
          { teamId },
          { departmentId: teamId },
        ],
        tenantId,
        status: 'active',
      },
      include: {
        reviewsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const ratings = teamMembers
      .map(m => m.reviewsReceived[0]?.overallRating)
      .filter((r): r is number => r != null);

    return {
      size: teamMembers.length,
      avgPerformance: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 3,
      skillCoverage: { 'general': 0.8 }, // Simplified
      seniorityMix: {
        'junior': teamMembers.filter(m => this.calculateTenure(m.hireDate) < 2).length,
        'mid': teamMembers.filter(m => this.calculateTenure(m.hireDate) >= 2 && this.calculateTenure(m.hireDate) < 5).length,
        'senior': teamMembers.filter(m => this.calculateTenure(m.hireDate) >= 5).length,
      },
      diversityMetrics: {},
      openRoles: 0,
    };
  }

  private applyTeamChanges(
    current: TeamState,
    changes: { additions: string[]; removals: string[]; roleChanges: { userId: string; newRole: string }[] }
  ): TeamState {
    return {
      ...current,
      size: current.size + changes.additions.length - changes.removals.length,
    };
  }

  private calculateBonusMultiplier(rating: number): number {
    if (rating >= 4.5) return 1.5;
    if (rating >= 4) return 1.25;
    if (rating >= 3.5) return 1.1;
    if (rating >= 3) return 1.0;
    if (rating >= 2.5) return 0.75;
    return 0.5;
  }

  private calculateAttritionRisk(employee: any, rating?: number): number {
    let risk = 0.1; // Base risk

    const currentRating = rating || employee.reviewsReceived?.[0]?.overallRating || 3;

    // Low rating increases risk
    if (currentRating < 3) {
      risk += this.attritionCoefficients.lowRating;
    }

    // Tenure effects (both new and very long tenure increase risk)
    const tenure = this.calculateTenure(employee.hireDate);
    if (tenure < 1 || tenure > 7) {
      risk += 0.1;
    }

    // Market conditions (simplified)
    risk += this.attritionCoefficients.marketConditions;

    return Math.min(0.9, risk);
  }

  private identifyRiskFactors(employee: any): string[] {
    const factors: string[] = [];

    const rating = employee.reviewsReceived?.[0]?.overallRating || 3;
    if (rating < 3) factors.push('Low performance rating');

    const tenure = this.calculateTenure(employee.hireDate);
    if (tenure < 1) factors.push('New employee (< 1 year)');
    if (tenure > 7) factors.push('Long tenure without promotion');

    return factors;
  }

  private calculateCompensationImpact(
    user: any,
    currentRating: number,
    newRating: number
  ): BudgetImpact[] {
    const currentBonus = (user.salary || 50000) * this.calculateBonusMultiplier(currentRating) * 0.15;
    const newBonus = (user.salary || 50000) * this.calculateBonusMultiplier(newRating) * 0.15;

    return [{
      category: 'Bonus',
      currentSpend: currentBonus,
      projectedSpend: newBonus,
      variance: newBonus - currentBonus,
      variancePercent: ((newBonus - currentBonus) / currentBonus) * 100,
      justification: `Rating change from ${currentRating} to ${newRating}`,
    }];
  }

  private async assessPromotionReadiness(user: any, targetLevel: string): Promise<PromotionCandidate> {
    const ratings = user.reviewsReceived
      .map((r: any) => r.overallRating)
      .filter((r: number | null): r is number => r != null);
    const avgRating = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 3;

    const performanceScore = Math.min(avgRating / 5, 1) * this.promotionReadinessWeights.performanceHistory;
    const timeScore = Math.min(this.calculateTenure(user.hireDate) / 3, 1) * this.promotionReadinessWeights.timeInRole;
    const goalScore = user.goalsOwned?.length > 0
      ? user.goalsOwned.filter((g: any) => g.status === 'completed').length / user.goalsOwned.length
      : 0.5;

    const readinessScore = performanceScore + timeScore + goalScore * 0.35;

    const blockers: string[] = [];
    if (avgRating < 4) blockers.push('Performance rating below promotion threshold');
    if (this.calculateTenure(user.hireDate) < 1) blockers.push('Insufficient time in current role');

    return {
      userId: user.id,
      currentLevel: user.jobTitle || 'Unknown',
      targetLevel,
      readinessScore,
      timeInRole: this.calculateTenure(user.hireDate),
      blockers,
    };
  }

  private async simulateBudgetImpact(
    tenantId: string,
    changes: any[]
  ): Promise<BudgetSimulation> {
    const currentBudget = await this.getCurrentBudget(tenantId);

    let additionalCost = 0;
    for (const change of changes) {
      if (change.type === 'promotion') {
        additionalCost += 15000; // Avg promotion raise
      }
    }

    const proposedBudget = {
      ...currentBudget,
      baseSalary: currentBudget.baseSalary + additionalCost,
    };

    return {
      scenarioId: `budget_sim_${Date.now()}`,
      currentBudget,
      proposedBudget,
      impactAnalysis: [{
        category: 'Salary',
        currentSpend: currentBudget.baseSalary,
        projectedSpend: proposedBudget.baseSalary,
        variance: additionalCost,
        variancePercent: (additionalCost / currentBudget.baseSalary) * 100,
        justification: 'Promotion-related salary increase',
      }],
      optimizationSuggestions: [],
    };
  }

  private async compareToPeers(user: any, targetLevel: string, tenantId: string): Promise<any[]> {
    const peers = await this.prisma.user.findMany({
      where: {
        tenantId,
        departmentId: user.departmentId,
        jobTitle: { contains: targetLevel },
      },
      include: {
        reviewsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      take: 5,
    });

    return peers.map(p => ({
      userId: p.id,
      rating: p.reviewsReceived[0]?.overallRating || 3,
      tenure: this.calculateTenure(p.hireDate),
    }));
  }

  private calculatePromotionSuccess(readiness: PromotionCandidate): number {
    let probability = readiness.readinessScore;

    // Reduce for each blocker
    probability -= readiness.blockers.length * 0.1;

    return Math.max(0.1, Math.min(0.95, probability));
  }

  private async getAvailableCareerPaths(user: any, tenantId: string): Promise<any[]> {
    // Simplified path templates
    return [
      {
        name: 'Individual Contributor Track',
        steps: [
          { role: 'Senior', level: 3, duration: 24 },
          { role: 'Staff', level: 4, duration: 36 },
          { role: 'Principal', level: 5, duration: 48 },
        ],
      },
      {
        name: 'Management Track',
        steps: [
          { role: 'Team Lead', level: 3, duration: 18 },
          { role: 'Manager', level: 4, duration: 24 },
          { role: 'Director', level: 5, duration: 36 },
        ],
      },
    ];
  }

  private simulatePath(user: any, template: any): CareerPath {
    const currentLevel = this.extractLevel(user.jobTitle || '');
    const relevantSteps = template.steps.filter((s: any) => s.level > currentLevel);

    return {
      pathId: `path_${Date.now()}`,
      name: template.name,
      steps: relevantSteps.map((s: any, i: number) => ({
        stepNumber: i + 1,
        role: s.role,
        level: s.level,
        expectedDuration: s.duration,
        prerequisites: [],
        developmentActivities: [],
      })),
      totalDuration: relevantSteps.reduce((sum: number, s: any) => sum + s.duration, 0),
      probability: 0.7 - (relevantSteps.length * 0.1),
      requirements: [],
      blockers: [],
    };
  }

  private identifyDevelopmentGaps(user: any, path: CareerPath): DevelopmentGap[] {
    // Simplified gap analysis
    return [
      {
        skill: 'Leadership',
        currentLevel: 2,
        requiredLevel: 4,
        urgency: 'high',
        suggestedActions: ['Mentorship program', 'Lead a project'],
      },
    ];
  }

  private extractLevel(jobTitle: string): number {
    if (jobTitle.toLowerCase().includes('principal') || jobTitle.toLowerCase().includes('director')) return 5;
    if (jobTitle.toLowerCase().includes('staff') || jobTitle.toLowerCase().includes('manager')) return 4;
    if (jobTitle.toLowerCase().includes('senior') || jobTitle.toLowerCase().includes('lead')) return 3;
    if (jobTitle.toLowerCase().includes('mid') || jobTitle.toLowerCase().includes('ii')) return 2;
    return 1;
  }

  private getNextLevel(jobTitle: string): string {
    const level = this.extractLevel(jobTitle);
    const levels = ['Junior', 'Mid-Level', 'Senior', 'Staff', 'Principal'];
    return levels[Math.min(level, levels.length - 1)];
  }

  private calculateQuickReadiness(employee: any): number {
    const rating = employee.reviewsReceived?.[0]?.overallRating || 3;
    return Math.min(rating / 5, 1) * 0.8;
  }

  private calculateTenure(hireDate: Date | null): number {
    if (!hireDate) return 2;
    return (Date.now() - new Date(hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  }

  private calculateAvgTenure(employees: any[]): number {
    if (employees.length === 0) return 0;
    return employees.reduce((sum, e) => sum + this.calculateTenure(e.hireDate), 0) / employees.length;
  }

  private async getCurrentBudget(tenantId: string): Promise<BudgetBreakdown> {
    const employees = await this.prisma.user.findMany({
      where: { tenantId, status: 'active' },
    });

    const baseSalary = employees.reduce((sum, e) => sum + (e.salary || 50000), 0);

    return {
      totalCompensation: baseSalary * 1.35,
      baseSalary,
      bonusPool: baseSalary * 0.15,
      equityPool: baseSalary * 0.1,
      benefitsCost: baseSalary * 0.08,
      trainingBudget: baseSalary * 0.02,
      contingency: baseSalary * 0.05,
    };
  }

  private getVarianceJustification(category: string, variance: number): string {
    if (variance === 0) return 'No change';
    const direction = variance > 0 ? 'increase' : 'decrease';
    return `${category} ${direction} of ${Math.abs(variance).toLocaleString()}`;
  }

  private generateBudgetOptimizations(
    current: BudgetBreakdown,
    proposed: BudgetBreakdown,
    tenantId: string
  ): BudgetOptimization[] {
    const optimizations: BudgetOptimization[] = [];

    if (proposed.bonusPool > current.bonusPool * 1.1) {
      optimizations.push({
        area: 'Bonus Pool',
        currentAllocation: current.bonusPool,
        suggestedAllocation: current.bonusPool * 1.05,
        expectedROI: 1.2,
        rationale: 'Moderate bonus increase maintains motivation while managing costs',
      });
    }

    return optimizations;
  }

  private findCommonRiskFactors(
    highRiskEmployees: { factors: string[] }[]
  ): { factor: string; count: number; effort: 'low' | 'medium' | 'high'; timeframe: string }[] {
    const factorCounts = new Map<string, number>();

    for (const emp of highRiskEmployees) {
      for (const factor of emp.factors) {
        factorCounts.set(factor, (factorCounts.get(factor) || 0) + 1);
      }
    }

    return Array.from(factorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([factor, count]) => ({
        factor,
        count,
        effort: 'medium' as const,
        timeframe: '30-90 days',
      }));
  }

  private async getScenario(scenarioId: string): Promise<SimulationScenario | null> {
    const cached = await this.redis.get(`simulation:${scenarioId}`);
    return cached ? JSON.parse(cached) : null;
  }

  private async updateScenario(scenario: SimulationScenario): Promise<void> {
    await this.redis.set(
      `simulation:${scenario.id}`,
      JSON.stringify(scenario),
      'EX',
      7 * 24 * 60 * 60
    );
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const performanceSimulator = new PerformanceSimulator(
  new PrismaClient(),
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
);
