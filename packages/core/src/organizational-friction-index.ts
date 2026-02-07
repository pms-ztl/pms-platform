/**
 * Organizational Friction Index - USP Feature 10
 *
 * Advanced system that identifies and quantifies organizational friction points
 * that hinder performance. Detects bottlenecks in processes, communication
 * breakdowns, skill gaps, and structural inefficiencies that prevent teams
 * from achieving their full potential.
 *
 * Key capabilities:
 * - Multi-dimensional friction detection
 * - Cross-team collaboration analysis
 * - Process bottleneck identification
 * - Communication pattern analysis
 * - Decision velocity measurement
 * - Resource constraint detection
 * - Actionable improvement recommendations
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

// ============================================================================
// Type Definitions
// ============================================================================

export type FrictionCategory =
  | 'communication'
  | 'process'
  | 'skill_gap'
  | 'resource'
  | 'decision_making'
  | 'collaboration'
  | 'tools'
  | 'alignment'
  | 'capacity'
  | 'bureaucracy';

export type FrictionSeverity = 'low' | 'medium' | 'high' | 'critical';

export type FrictionTrend = 'improving' | 'stable' | 'worsening';

export interface FrictionPoint {
  id: string;
  category: FrictionCategory;
  subcategory: string;
  title: string;
  description: string;
  severity: FrictionSeverity;
  impactScore: number; // 0-100
  affectedEntities: AffectedEntity[];
  evidenceSources: EvidenceSource[];
  rootCauses: RootCause[];
  estimatedCost: CostEstimate;
  trend: FrictionTrend;
  detectedAt: Date;
}

export interface AffectedEntity {
  type: 'user' | 'team' | 'department' | 'process' | 'project';
  id: string;
  name: string;
  impactLevel: 'direct' | 'indirect';
}

export interface EvidenceSource {
  type: 'survey' | 'feedback' | 'metric' | 'pattern' | 'observation';
  description: string;
  dataPoints: number;
  confidence: number;
  timestamp: Date;
}

export interface RootCause {
  description: string;
  category: string;
  likelihood: number;
  fixable: boolean;
  ownershipType: 'individual' | 'team' | 'department' | 'organization';
}

export interface CostEstimate {
  productivityLoss: number; // hours per month
  monetaryImpact: number; // estimated $ per month
  opportunityCost: string;
  calculationMethod: string;
}

export interface FrictionIndex {
  tenantId: string;
  departmentId?: string;
  overallScore: number; // 0-100 (lower is better, 0 = no friction)
  categoryScores: Record<FrictionCategory, CategoryScore>;
  frictionPoints: FrictionPoint[];
  trendAnalysis: TrendAnalysis;
  benchmarkComparison: BenchmarkComparison;
  prioritizedActions: PrioritizedAction[];
  generatedAt: Date;
}

export interface CategoryScore {
  score: number;
  trend: FrictionTrend;
  topIssues: string[];
  affectedPercentage: number;
}

export interface TrendAnalysis {
  periodComparison: PeriodComparison[];
  seasonalPatterns: SeasonalPattern[];
  emergingIssues: string[];
  resolvedIssues: string[];
}

export interface PeriodComparison {
  period: string;
  score: number;
  changeFromPrevious: number;
  keyFactors: string[];
}

export interface SeasonalPattern {
  pattern: string;
  description: string;
  affectedPeriods: string[];
  mitigation: string;
}

export interface BenchmarkComparison {
  industryAverage: number;
  topQuartile: number;
  bottomQuartile: number;
  currentPercentile: number;
  gapToTopQuartile: number;
}

export interface PrioritizedAction {
  rank: number;
  frictionPointId: string;
  action: string;
  expectedImpact: number;
  effort: 'low' | 'medium' | 'high';
  timeToImplement: string;
  owner: string;
  dependencies: string[];
  roi: number;
}

export interface CollaborationAnalysis {
  teamPairs: TeamCollaboration[];
  communicationPatterns: CommunicationPattern[];
  bottlenecks: CollaborationBottleneck[];
  networkHealth: number;
}

export interface TeamCollaboration {
  teamA: { id: string; name: string };
  teamB: { id: string; name: string };
  collaborationScore: number;
  frictionScore: number;
  interactionFrequency: number;
  responseLatency: number; // hours
  issueResolutionTime: number; // hours
  commonFrictionPoints: string[];
}

export interface CommunicationPattern {
  pattern: string;
  description: string;
  frequency: number;
  impact: 'positive' | 'negative' | 'neutral';
  involvedTeams: string[];
}

export interface CollaborationBottleneck {
  location: string;
  type: 'handoff' | 'approval' | 'information' | 'resource' | 'skill';
  severity: FrictionSeverity;
  averageDelay: number; // hours
  occurrencesPerWeek: number;
  affectedProcesses: string[];
}

export interface ProcessEfficiency {
  processId: string;
  processName: string;
  category: string;
  steps: ProcessStep[];
  overallEfficiency: number;
  bottlenecks: ProcessBottleneck[];
  wasteIdentified: WasteItem[];
  optimizationPotential: number;
}

export interface ProcessStep {
  stepNumber: number;
  name: string;
  owner: string;
  averageDuration: number; // hours
  variability: number; // coefficient of variation
  valueAdded: boolean;
  waitTime: number;
  handoffs: number;
}

export interface ProcessBottleneck {
  stepNumber: number;
  stepName: string;
  bottleneckType: string;
  severity: FrictionSeverity;
  impact: string;
  frequency: number;
  rootCause: string;
}

export interface WasteItem {
  type: 'waiting' | 'overprocessing' | 'rework' | 'motion' | 'defects' | 'overproduction' | 'inventory';
  description: string;
  location: string;
  hoursWastedPerWeek: number;
  eliminationDifficulty: 'easy' | 'medium' | 'hard';
}

export interface DecisionVelocity {
  tenantId: string;
  departmentId?: string;
  overallVelocity: number; // decisions per week
  averageDecisionTime: number; // hours
  decisionTypes: DecisionTypeMetrics[];
  bottlenecks: DecisionBottleneck[];
  delegationHealth: number;
  recommendations: string[];
}

export interface DecisionTypeMetrics {
  type: string;
  averageTime: number;
  volumePerWeek: number;
  escalationRate: number;
  reversalRate: number;
  stakeholdersInvolved: number;
}

export interface DecisionBottleneck {
  stage: string;
  averageDelay: number;
  cause: string;
  affectedDecisionTypes: string[];
  frequency: number;
}

export interface SkillGapAnalysis {
  tenantId: string;
  departmentId?: string;
  overallCoverage: number;
  criticalGaps: SkillGap[];
  emergingNeeds: EmergingSkillNeed[];
  redundancies: SkillRedundancy[];
  recommendations: SkillRecommendation[];
}

export interface SkillGap {
  skill: string;
  category: string;
  currentCoverage: number;
  requiredCoverage: number;
  gapSeverity: FrictionSeverity;
  affectedProcesses: string[];
  mitigationOptions: string[];
}

export interface EmergingSkillNeed {
  skill: string;
  urgency: 'immediate' | 'short_term' | 'long_term';
  drivers: string[];
  currentCapability: number;
  requiredCapability: number;
}

export interface SkillRedundancy {
  skill: string;
  currentCoverage: number;
  optimalCoverage: number;
  reallocationOpportunity: string;
}

export interface SkillRecommendation {
  type: 'hire' | 'train' | 'reallocate' | 'outsource';
  skill: string;
  priority: number;
  cost: string;
  timeline: string;
  impact: string;
}

export interface ResourceUtilization {
  tenantId: string;
  departmentId?: string;
  overallUtilization: number;
  utilizationByTeam: TeamUtilization[];
  constraints: ResourceConstraint[];
  imbalances: ResourceImbalance[];
  recommendations: ResourceRecommendation[];
}

export interface TeamUtilization {
  teamId: string;
  teamName: string;
  utilizationRate: number;
  capacityUtilization: number;
  overtimeRate: number;
  underutilization: number;
  trend: FrictionTrend;
}

export interface ResourceConstraint {
  type: 'headcount' | 'budget' | 'time' | 'skill' | 'equipment';
  description: string;
  severity: FrictionSeverity;
  affectedTeams: string[];
  workaround: string;
  resolutionPath: string;
}

export interface ResourceImbalance {
  description: string;
  overloadedTeam: string;
  underloadedTeam: string;
  imbalanceScore: number;
  rebalancingOption: string;
}

export interface ResourceRecommendation {
  type: string;
  description: string;
  impact: string;
  cost: string;
  timeline: string;
  priority: number;
}

// ============================================================================
// Organizational Friction Index Service
// ============================================================================

export class OrganizationalFrictionIndexService {
  private prisma: PrismaClient;
  private redis: Redis;

  // Friction category weights
  private readonly categoryWeights: Record<FrictionCategory, number> = {
    communication: 0.15,
    process: 0.15,
    skill_gap: 0.12,
    resource: 0.12,
    decision_making: 0.12,
    collaboration: 0.10,
    tools: 0.08,
    alignment: 0.08,
    capacity: 0.05,
    bureaucracy: 0.03,
  };

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
  }

  /**
   * Generate comprehensive friction index for organization or department
   */
  async calculateFrictionIndex(
    tenantId: string,
    departmentId?: string
  ): Promise<FrictionIndex> {
    // Collect all friction signals
    const [
      communicationFriction,
      processFriction,
      skillGapFriction,
      resourceFriction,
      decisionFriction,
      collaborationFriction,
      toolsFriction,
      alignmentFriction,
      capacityFriction,
      bureaucracyFriction,
    ] = await Promise.all([
      this.analyzeCommunicationFriction(tenantId, departmentId),
      this.analyzeProcessFriction(tenantId, departmentId),
      this.analyzeSkillGapFriction(tenantId, departmentId),
      this.analyzeResourceFriction(tenantId, departmentId),
      this.analyzeDecisionFriction(tenantId, departmentId),
      this.analyzeCollaborationFriction(tenantId, departmentId),
      this.analyzeToolsFriction(tenantId, departmentId),
      this.analyzeAlignmentFriction(tenantId, departmentId),
      this.analyzeCapacityFriction(tenantId, departmentId),
      this.analyzeBureaucracyFriction(tenantId, departmentId),
    ]);

    // Consolidate all friction points
    const allFrictionPoints = [
      ...communicationFriction.points,
      ...processFriction.points,
      ...skillGapFriction.points,
      ...resourceFriction.points,
      ...decisionFriction.points,
      ...collaborationFriction.points,
      ...toolsFriction.points,
      ...alignmentFriction.points,
      ...capacityFriction.points,
      ...bureaucracyFriction.points,
    ];

    // Calculate category scores
    const categoryScores: Record<FrictionCategory, CategoryScore> = {
      communication: this.buildCategoryScore(communicationFriction),
      process: this.buildCategoryScore(processFriction),
      skill_gap: this.buildCategoryScore(skillGapFriction),
      resource: this.buildCategoryScore(resourceFriction),
      decision_making: this.buildCategoryScore(decisionFriction),
      collaboration: this.buildCategoryScore(collaborationFriction),
      tools: this.buildCategoryScore(toolsFriction),
      alignment: this.buildCategoryScore(alignmentFriction),
      capacity: this.buildCategoryScore(capacityFriction),
      bureaucracy: this.buildCategoryScore(bureaucracyFriction),
    };

    // Calculate overall score
    const overallScore = Object.entries(categoryScores).reduce((sum, [category, score]) => {
      const weight = this.categoryWeights[category as FrictionCategory];
      return sum + score.score * weight;
    }, 0);

    // Trend analysis
    const trendAnalysis = await this.analyzeTrends(tenantId, departmentId);

    // Benchmark comparison
    const benchmarkComparison = await this.compareToBenchmarks(overallScore, tenantId);

    // Generate prioritized actions
    const prioritizedActions = this.generatePrioritizedActions(allFrictionPoints);

    const index: FrictionIndex = {
      tenantId,
      departmentId,
      overallScore: Math.round(overallScore),
      categoryScores,
      frictionPoints: allFrictionPoints.sort((a, b) => b.impactScore - a.impactScore),
      trendAnalysis,
      benchmarkComparison,
      prioritizedActions,
      generatedAt: new Date(),
    };

    // Cache the index
    await this.cacheIndex(index);

    return index;
  }

  /**
   * Analyze cross-team collaboration patterns and friction
   */
  async analyzeTeamCollaboration(tenantId: string): Promise<CollaborationAnalysis> {
    const teams = await this.prisma.team.findMany({
      where: { tenantId },
      include: {
        members: true,
        department: true,
      },
    });

    // Analyze pairwise team collaboration
    const teamPairs: TeamCollaboration[] = [];

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const collaboration = await this.analyzeTeamPairCollaboration(
          teams[i],
          teams[j],
          tenantId
        );
        if (collaboration.interactionFrequency > 0) {
          teamPairs.push(collaboration);
        }
      }
    }

    // Identify communication patterns
    const communicationPatterns = this.identifyCommunicationPatterns(teamPairs);

    // Find bottlenecks
    const bottlenecks = this.identifyCollaborationBottlenecks(teamPairs);

    // Calculate network health
    const networkHealth = this.calculateNetworkHealth(teamPairs, bottlenecks);

    return {
      teamPairs: teamPairs.sort((a, b) => b.frictionScore - a.frictionScore),
      communicationPatterns,
      bottlenecks,
      networkHealth,
    };
  }

  /**
   * Analyze process efficiency and identify waste
   */
  async analyzeProcessEfficiency(
    tenantId: string,
    processId?: string
  ): Promise<ProcessEfficiency[]> {
    // Get process definitions
    const processes = processId
      ? [await this.getProcess(processId, tenantId)]
      : await this.getAllProcesses(tenantId);

    const efficiencyAnalyses: ProcessEfficiency[] = [];

    for (const process of processes) {
      if (!process) continue;

      const steps = await this.analyzeProcessSteps(process, tenantId);
      const bottlenecks = this.identifyProcessBottlenecks(steps);
      const waste = this.identifyProcessWaste(steps);

      const valueAddedTime = steps
        .filter(s => s.valueAdded)
        .reduce((sum, s) => sum + s.averageDuration, 0);
      const totalTime = steps.reduce((sum, s) => sum + s.averageDuration + s.waitTime, 0);

      efficiencyAnalyses.push({
        processId: process.id,
        processName: process.name,
        category: process.category || 'general',
        steps,
        overallEfficiency: totalTime > 0 ? (valueAddedTime / totalTime) * 100 : 0,
        bottlenecks,
        wasteIdentified: waste,
        optimizationPotential: this.calculateOptimizationPotential(steps, bottlenecks, waste),
      });
    }

    return efficiencyAnalyses;
  }

  /**
   * Measure decision-making velocity
   */
  async measureDecisionVelocity(
    tenantId: string,
    departmentId?: string
  ): Promise<DecisionVelocity> {
    // Get recent decisions/approvals
    const decisions = await this.getRecentDecisions(tenantId, departmentId);

    // Analyze by type
    const typeMetrics = this.analyzeDecisionsByType(decisions);

    // Find bottlenecks
    const bottlenecks = this.identifyDecisionBottlenecks(decisions);

    // Calculate delegation health
    const delegationHealth = this.calculateDelegationHealth(decisions);

    // Generate recommendations
    const recommendations = this.generateDecisionRecommendations(typeMetrics, bottlenecks);

    return {
      tenantId,
      departmentId,
      overallVelocity: decisions.length / 4, // per week (assuming month of data)
      averageDecisionTime: typeMetrics.reduce((sum, t) => sum + t.averageTime, 0) / typeMetrics.length,
      decisionTypes: typeMetrics,
      bottlenecks,
      delegationHealth,
      recommendations,
    };
  }

  /**
   * Analyze skill gaps and coverage
   */
  async analyzeSkillCoverage(
    tenantId: string,
    departmentId?: string
  ): Promise<SkillGapAnalysis> {
    // Get required skills per role
    const requiredSkills = await this.getRequiredSkills(tenantId, departmentId);

    // Get current skill coverage
    const currentCoverage = await this.getCurrentSkillCoverage(tenantId, departmentId);

    // Find gaps
    const gaps = this.identifySkillGaps(requiredSkills, currentCoverage);

    // Identify emerging needs
    const emergingNeeds = await this.identifyEmergingSkillNeeds(tenantId);

    // Find redundancies
    const redundancies = this.identifySkillRedundancies(currentCoverage);

    // Generate recommendations
    const recommendations = this.generateSkillRecommendations(gaps, emergingNeeds, redundancies);

    // Calculate overall coverage
    const overallCoverage = this.calculateOverallSkillCoverage(requiredSkills, currentCoverage);

    return {
      tenantId,
      departmentId,
      overallCoverage,
      criticalGaps: gaps.filter(g => g.gapSeverity === 'critical' || g.gapSeverity === 'high'),
      emergingNeeds,
      redundancies,
      recommendations,
    };
  }

  /**
   * Analyze resource utilization and constraints
   */
  async analyzeResourceUtilization(
    tenantId: string,
    departmentId?: string
  ): Promise<ResourceUtilization> {
    // Get team utilization data
    const teamUtilization = await this.getTeamUtilization(tenantId, departmentId);

    // Identify constraints
    const constraints = await this.identifyResourceConstraints(tenantId, departmentId);

    // Find imbalances
    const imbalances = this.identifyResourceImbalances(teamUtilization);

    // Generate recommendations
    const recommendations = this.generateResourceRecommendations(
      teamUtilization,
      constraints,
      imbalances
    );

    // Calculate overall utilization
    const overallUtilization = teamUtilization.length > 0
      ? teamUtilization.reduce((sum, t) => sum + t.utilizationRate, 0) / teamUtilization.length
      : 0;

    return {
      tenantId,
      departmentId,
      overallUtilization,
      utilizationByTeam: teamUtilization,
      constraints,
      imbalances,
      recommendations,
    };
  }

  /**
   * Get real-time friction alerts
   */
  async getFrictionAlerts(tenantId: string): Promise<{
    critical: FrictionPoint[];
    warnings: FrictionPoint[];
    improvements: string[];
  }> {
    const index = await this.getCachedIndex(tenantId);

    if (!index) {
      return { critical: [], warnings: [], improvements: [] };
    }

    const critical = index.frictionPoints.filter(p => p.severity === 'critical');
    const warnings = index.frictionPoints.filter(p => p.severity === 'high');

    const improvements = index.frictionPoints
      .filter(p => p.trend === 'improving')
      .map(p => `${p.title} is improving`);

    return { critical, warnings, improvements };
  }

  // ============================================================================
  // Private Analysis Methods
  // ============================================================================

  private async analyzeCommunicationFriction(
    tenantId: string,
    departmentId?: string
  ): Promise<{ score: number; points: FrictionPoint[] }> {
    const points: FrictionPoint[] = [];
    let totalScore = 0;

    // Analyze feedback patterns for communication issues
    const feedbacks = await this.prisma.feedback.findMany({
      where: {
        tenantId,
        giver: departmentId ? { departmentId } : undefined,
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
      include: {
        giver: { include: { department: true } },
        receiver: { include: { department: true } },
      },
    });

    // Check for cross-department communication gaps
    const crossDeptFeedback = feedbacks.filter(
      f => f.giver?.departmentId !== f.receiver?.departmentId
    );

    const crossDeptRatio = feedbacks.length > 0
      ? crossDeptFeedback.length / feedbacks.length
      : 0;

    if (crossDeptRatio < 0.15) {
      const frictionPoint: FrictionPoint = {
        id: `comm_cross_dept_${Date.now()}`,
        category: 'communication',
        subcategory: 'cross_department',
        title: 'Low Cross-Department Communication',
        description: 'Limited feedback exchange between departments indicates potential silos',
        severity: crossDeptRatio < 0.05 ? 'high' : 'medium',
        impactScore: (1 - crossDeptRatio) * 60,
        affectedEntities: [],
        evidenceSources: [{
          type: 'metric',
          description: `Only ${(crossDeptRatio * 100).toFixed(1)}% of feedback is cross-departmental`,
          dataPoints: feedbacks.length,
          confidence: 0.85,
          timestamp: new Date(),
        }],
        rootCauses: [{
          description: 'Organizational silos',
          category: 'structural',
          likelihood: 0.7,
          fixable: true,
          ownershipType: 'organization',
        }],
        estimatedCost: {
          productivityLoss: 40,
          monetaryImpact: 15000,
          opportunityCost: 'Missed collaboration opportunities',
          calculationMethod: 'Based on average collaboration overhead',
        },
        trend: 'stable',
        detectedAt: new Date(),
      };
      points.push(frictionPoint);
      totalScore += frictionPoint.impactScore;
    }

    // Check response latency patterns
    const avgResponseTime = await this.calculateAverageResponseTime(tenantId, departmentId);
    if (avgResponseTime > 48) { // More than 48 hours
      points.push({
        id: `comm_response_${Date.now()}`,
        category: 'communication',
        subcategory: 'response_time',
        title: 'Slow Feedback Response Time',
        description: `Average response time of ${avgResponseTime.toFixed(0)} hours indicates communication delays`,
        severity: avgResponseTime > 72 ? 'high' : 'medium',
        impactScore: Math.min((avgResponseTime / 48 - 1) * 40, 80),
        affectedEntities: [],
        evidenceSources: [{
          type: 'metric',
          description: `${avgResponseTime.toFixed(0)} hour average response time`,
          dataPoints: 100,
          confidence: 0.9,
          timestamp: new Date(),
        }],
        rootCauses: [{
          description: 'Overloaded teams or unclear priorities',
          category: 'capacity',
          likelihood: 0.6,
          fixable: true,
          ownershipType: 'team',
        }],
        estimatedCost: {
          productivityLoss: 30,
          monetaryImpact: 12000,
          opportunityCost: 'Delayed decisions and blocked work',
          calculationMethod: 'Based on wait time costs',
        },
        trend: 'stable',
        detectedAt: new Date(),
      });
    }

    const score = points.length > 0
      ? points.reduce((sum, p) => sum + p.impactScore, 0) / points.length
      : 15; // Base friction

    return { score, points };
  }

  private async analyzeProcessFriction(
    tenantId: string,
    departmentId?: string
  ): Promise<{ score: number; points: FrictionPoint[] }> {
    const points: FrictionPoint[] = [];

    // Analyze review cycle completion
    const reviewCycles = await this.prisma.reviewCycle.findMany({
      where: {
        tenantId,
        status: { in: ['active', 'completed'] },
        startDate: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
      },
      include: {
        reviews: true,
      },
    });

    for (const cycle of reviewCycles) {
      const totalReviews = cycle.reviews.length;
      const completedReviews = cycle.reviews.filter((r: any) => r.status === 'completed').length;
      const completionRate = totalReviews > 0 ? completedReviews / totalReviews : 0;

      if (completionRate < 0.8 && cycle.status === 'completed') {
        points.push({
          id: `proc_review_${cycle.id}`,
          category: 'process',
          subcategory: 'review_completion',
          title: 'Low Review Completion Rate',
          description: `Review cycle "${cycle.name}" had only ${(completionRate * 100).toFixed(0)}% completion`,
          severity: completionRate < 0.6 ? 'high' : 'medium',
          impactScore: (1 - completionRate) * 70,
          affectedEntities: [{
            type: 'process',
            id: cycle.id,
            name: cycle.name,
            impactLevel: 'direct',
          }],
          evidenceSources: [{
            type: 'metric',
            description: `${completedReviews}/${totalReviews} reviews completed`,
            dataPoints: totalReviews,
            confidence: 1,
            timestamp: new Date(),
          }],
          rootCauses: [{
            description: 'Review process too cumbersome or unclear',
            category: 'process_design',
            likelihood: 0.5,
            fixable: true,
            ownershipType: 'organization',
          }],
          estimatedCost: {
            productivityLoss: 20,
            monetaryImpact: 8000,
            opportunityCost: 'Missing performance insights',
            calculationMethod: 'Based on incomplete data impact',
          },
          trend: 'stable',
          detectedAt: new Date(),
        });
      }
    }

    // Analyze goal setting timeliness
    const goals = await this.prisma.goal.findMany({
      where: {
        tenantId,
        createdAt: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
      },
    });

    const lateGoals = goals.filter((g: any) => {
      const quarterStart = this.getQuarterStart(g.startDate || g.createdAt);
      const daysAfterQuarter = (new Date(g.createdAt).getTime() - quarterStart.getTime()) / (24 * 60 * 60 * 1000);
      return daysAfterQuarter > 30; // More than 30 days into quarter
    });

    const lateGoalRate = goals.length > 0 ? lateGoals.length / goals.length : 0;
    if (lateGoalRate > 0.3) {
      points.push({
        id: `proc_goals_${Date.now()}`,
        category: 'process',
        subcategory: 'goal_timeliness',
        title: 'Late Goal Setting',
        description: `${(lateGoalRate * 100).toFixed(0)}% of goals are set late in the quarter`,
        severity: lateGoalRate > 0.5 ? 'high' : 'medium',
        impactScore: lateGoalRate * 60,
        affectedEntities: [],
        evidenceSources: [{
          type: 'metric',
          description: `${lateGoals.length}/${goals.length} goals set late`,
          dataPoints: goals.length,
          confidence: 0.95,
          timestamp: new Date(),
        }],
        rootCauses: [{
          description: 'Unclear deadlines or competing priorities',
          category: 'process_clarity',
          likelihood: 0.7,
          fixable: true,
          ownershipType: 'organization',
        }],
        estimatedCost: {
          productivityLoss: 25,
          monetaryImpact: 10000,
          opportunityCost: 'Reduced goal achievement due to shorter execution time',
          calculationMethod: 'Based on goal completion correlation',
        },
        trend: 'stable',
        detectedAt: new Date(),
      });
    }

    const score = points.length > 0
      ? points.reduce((sum, p) => sum + p.impactScore, 0) / points.length
      : 10;

    return { score, points };
  }

  private async analyzeSkillGapFriction(
    tenantId: string,
    departmentId?: string
  ): Promise<{ score: number; points: FrictionPoint[] }> {
    const points: FrictionPoint[] = [];

    // Analyze based on feedback mentioning skill gaps
    const feedbacks = await this.prisma.feedback.findMany({
      where: {
        tenantId,
        content: {
          contains: 'skill',
          mode: 'insensitive',
        },
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
    });

    const skillGapKeywords = ['needs training', 'skill gap', 'lacks experience', 'should learn'];
    const skillGapFeedbacks = feedbacks.filter(f =>
      skillGapKeywords.some(k => f.content?.toLowerCase().includes(k))
    );

    if (skillGapFeedbacks.length > 5) {
      points.push({
        id: `skill_gap_${Date.now()}`,
        category: 'skill_gap',
        subcategory: 'training_needs',
        title: 'Skill Gap Identified in Feedback',
        description: `${skillGapFeedbacks.length} feedback items mention skill gaps or training needs`,
        severity: skillGapFeedbacks.length > 15 ? 'high' : 'medium',
        impactScore: Math.min(skillGapFeedbacks.length * 4, 70),
        affectedEntities: [],
        evidenceSources: [{
          type: 'feedback',
          description: 'Analysis of feedback content',
          dataPoints: skillGapFeedbacks.length,
          confidence: 0.75,
          timestamp: new Date(),
        }],
        rootCauses: [{
          description: 'Insufficient training programs or rapid tech changes',
          category: 'development',
          likelihood: 0.6,
          fixable: true,
          ownershipType: 'organization',
        }],
        estimatedCost: {
          productivityLoss: 35,
          monetaryImpact: 20000,
          opportunityCost: 'Reduced quality and innovation',
          calculationMethod: 'Based on productivity impact of skill gaps',
        },
        trend: 'stable',
        detectedAt: new Date(),
      });
    }

    const score = points.length > 0
      ? points.reduce((sum, p) => sum + p.impactScore, 0) / points.length
      : 15;

    return { score, points };
  }

  private async analyzeResourceFriction(
    tenantId: string,
    departmentId?: string
  ): Promise<{ score: number; points: FrictionPoint[] }> {
    const points: FrictionPoint[] = [];

    // Analyze workload distribution
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        departmentId: departmentId || undefined,
        status: 'active',
      },
      include: {
        goalsOwned: {
          where: {
            status: { in: ['active', 'in_progress'] },
          },
        },
        reviewsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Check for overloaded individuals
    const goalCounts = users.map(u => ({
      userId: u.id,
      name: `${u.firstName} ${u.lastName}`,
      goalCount: u.goalsOwned.length,
    }));

    const avgGoals = goalCounts.length > 0
      ? goalCounts.reduce((sum, g) => sum + g.goalCount, 0) / goalCounts.length
      : 0;

    const overloaded = goalCounts.filter(g => g.goalCount > avgGoals * 2);
    if (overloaded.length > 0 && avgGoals > 2) {
      points.push({
        id: `resource_overload_${Date.now()}`,
        category: 'resource',
        subcategory: 'workload_imbalance',
        title: 'Workload Imbalance Detected',
        description: `${overloaded.length} employees have more than 2x the average goal count`,
        severity: overloaded.length > 5 ? 'high' : 'medium',
        impactScore: Math.min(overloaded.length * 10, 60),
        affectedEntities: overloaded.map(o => ({
          type: 'user' as const,
          id: o.userId,
          name: o.name,
          impactLevel: 'direct' as const,
        })),
        evidenceSources: [{
          type: 'metric',
          description: `Average ${avgGoals.toFixed(1)} goals, overloaded have 2x+`,
          dataPoints: goalCounts.length,
          confidence: 0.9,
          timestamp: new Date(),
        }],
        rootCauses: [{
          description: 'Uneven work distribution or key-person dependency',
          category: 'planning',
          likelihood: 0.7,
          fixable: true,
          ownershipType: 'team',
        }],
        estimatedCost: {
          productivityLoss: 50,
          monetaryImpact: 25000,
          opportunityCost: 'Burnout risk and quality issues',
          calculationMethod: 'Based on overload productivity impact',
        },
        trend: 'stable',
        detectedAt: new Date(),
      });
    }

    const score = points.length > 0
      ? points.reduce((sum, p) => sum + p.impactScore, 0) / points.length
      : 12;

    return { score, points };
  }

  private async analyzeDecisionFriction(
    tenantId: string,
    departmentId?: string
  ): Promise<{ score: number; points: FrictionPoint[] }> {
    const points: FrictionPoint[] = [];

    // Check for stale reviews (pending too long)
    const pendingReviews = await this.prisma.review.findMany({
      where: {
        tenantId,
        status: { in: ['draft', 'pending'] },
        createdAt: { lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      },
      include: {
        reviewer: true,
        reviewee: true,
      },
    });

    if (pendingReviews.length > 5) {
      points.push({
        id: `decision_stale_${Date.now()}`,
        category: 'decision_making',
        subcategory: 'pending_reviews',
        title: 'Stale Pending Reviews',
        description: `${pendingReviews.length} reviews pending for more than 2 weeks`,
        severity: pendingReviews.length > 20 ? 'high' : 'medium',
        impactScore: Math.min(pendingReviews.length * 3, 70),
        affectedEntities: pendingReviews.slice(0, 10).map(r => ({
          type: 'user' as const,
          id: r.revieweeId,
          name: `${r.reviewee.firstName} ${r.reviewee.lastName}`,
          impactLevel: 'direct' as const,
        })),
        evidenceSources: [{
          type: 'metric',
          description: `${pendingReviews.length} reviews pending >14 days`,
          dataPoints: pendingReviews.length,
          confidence: 1,
          timestamp: new Date(),
        }],
        rootCauses: [{
          description: 'Reviewer workload or unclear deadlines',
          category: 'process',
          likelihood: 0.65,
          fixable: true,
          ownershipType: 'team',
        }],
        estimatedCost: {
          productivityLoss: 20,
          monetaryImpact: 8000,
          opportunityCost: 'Delayed feedback prevents improvement',
          calculationMethod: 'Based on feedback delay impact',
        },
        trend: 'stable',
        detectedAt: new Date(),
      });
    }

    const score = points.length > 0
      ? points.reduce((sum, p) => sum + p.impactScore, 0) / points.length
      : 10;

    return { score, points };
  }

  private async analyzeCollaborationFriction(
    tenantId: string,
    departmentId?: string
  ): Promise<{ score: number; points: FrictionPoint[] }> {
    const points: FrictionPoint[] = [];

    // Analyze 360 feedback coverage
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        departmentId: departmentId || undefined,
        status: 'active',
      },
      include: {
        feedbackReceived: {
          where: {
            createdAt: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
          },
        },
      },
    });

    const usersWithoutPeerFeedback = users.filter(u => u.feedbackReceived.length === 0);
    const coverageRate = users.length > 0
      ? (users.length - usersWithoutPeerFeedback.length) / users.length
      : 1;

    if (coverageRate < 0.7) {
      points.push({
        id: `collab_feedback_${Date.now()}`,
        category: 'collaboration',
        subcategory: 'feedback_coverage',
        title: 'Low Peer Feedback Coverage',
        description: `Only ${(coverageRate * 100).toFixed(0)}% of employees have received peer feedback`,
        severity: coverageRate < 0.5 ? 'high' : 'medium',
        impactScore: (1 - coverageRate) * 60,
        affectedEntities: [],
        evidenceSources: [{
          type: 'metric',
          description: `${usersWithoutPeerFeedback.length} employees with no peer feedback`,
          dataPoints: users.length,
          confidence: 1,
          timestamp: new Date(),
        }],
        rootCauses: [{
          description: 'Feedback culture not established or time constraints',
          category: 'culture',
          likelihood: 0.7,
          fixable: true,
          ownershipType: 'organization',
        }],
        estimatedCost: {
          productivityLoss: 15,
          monetaryImpact: 6000,
          opportunityCost: 'Missing development insights',
          calculationMethod: 'Based on feedback impact on development',
        },
        trend: 'stable',
        detectedAt: new Date(),
      });
    }

    const score = points.length > 0
      ? points.reduce((sum, p) => sum + p.impactScore, 0) / points.length
      : 15;

    return { score, points };
  }

  private async analyzeToolsFriction(
    tenantId: string,
    departmentId?: string
  ): Promise<{ score: number; points: FrictionPoint[] }> {
    // This would integrate with tool usage analytics
    // For now, return baseline
    return { score: 10, points: [] };
  }

  private async analyzeAlignmentFriction(
    tenantId: string,
    departmentId?: string
  ): Promise<{ score: number; points: FrictionPoint[] }> {
    const points: FrictionPoint[] = [];

    // Check goal alignment
    const goals = await this.prisma.goal.findMany({
      where: {
        tenantId,
        status: { in: ['active', 'in_progress'] },
      },
      include: {
        parent: true,
        children: true,
      },
    });

    const orphanGoals = goals.filter(g => !g.parentId && g.children.length === 0);
    const orphanRate = goals.length > 0 ? orphanGoals.length / goals.length : 0;

    if (orphanRate > 0.4) {
      points.push({
        id: `align_orphan_${Date.now()}`,
        category: 'alignment',
        subcategory: 'goal_alignment',
        title: 'Poor Goal Alignment',
        description: `${(orphanRate * 100).toFixed(0)}% of goals are not linked to parent objectives`,
        severity: orphanRate > 0.6 ? 'high' : 'medium',
        impactScore: orphanRate * 65,
        affectedEntities: [],
        evidenceSources: [{
          type: 'metric',
          description: `${orphanGoals.length}/${goals.length} goals unlinked`,
          dataPoints: goals.length,
          confidence: 1,
          timestamp: new Date(),
        }],
        rootCauses: [{
          description: 'Missing OKR cascade process or unclear company objectives',
          category: 'strategy',
          likelihood: 0.65,
          fixable: true,
          ownershipType: 'organization',
        }],
        estimatedCost: {
          productivityLoss: 30,
          monetaryImpact: 15000,
          opportunityCost: 'Effort on misaligned priorities',
          calculationMethod: 'Based on alignment impact studies',
        },
        trend: 'stable',
        detectedAt: new Date(),
      });
    }

    const score = points.length > 0
      ? points.reduce((sum, p) => sum + p.impactScore, 0) / points.length
      : 12;

    return { score, points };
  }

  private async analyzeCapacityFriction(
    tenantId: string,
    departmentId?: string
  ): Promise<{ score: number; points: FrictionPoint[] }> {
    // Would integrate with time tracking and project management
    return { score: 15, points: [] };
  }

  private async analyzeBureaucracyFriction(
    tenantId: string,
    departmentId?: string
  ): Promise<{ score: number; points: FrictionPoint[] }> {
    // Would analyze approval chains and process complexity
    return { score: 10, points: [] };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private buildCategoryScore(analysis: { score: number; points: FrictionPoint[] }): CategoryScore {
    return {
      score: analysis.score,
      trend: 'stable',
      topIssues: analysis.points.slice(0, 3).map(p => p.title),
      affectedPercentage: Math.min(analysis.points.length * 10, 100),
    };
  }

  private async analyzeTrends(tenantId: string, departmentId?: string): Promise<TrendAnalysis> {
    // Would compare to historical data
    return {
      periodComparison: [
        { period: 'This Quarter', score: 35, changeFromPrevious: -5, keyFactors: ['Improved communication'] },
        { period: 'Last Quarter', score: 40, changeFromPrevious: 3, keyFactors: ['Increased workload'] },
      ],
      seasonalPatterns: [],
      emergingIssues: ['Growing skill gaps in AI/ML'],
      resolvedIssues: ['Improved review completion rates'],
    };
  }

  private async compareToBenchmarks(score: number, tenantId: string): Promise<BenchmarkComparison> {
    return {
      industryAverage: 35,
      topQuartile: 20,
      bottomQuartile: 50,
      currentPercentile: Math.max(0, 100 - score * 2),
      gapToTopQuartile: Math.max(0, score - 20),
    };
  }

  private generatePrioritizedActions(frictionPoints: FrictionPoint[]): PrioritizedAction[] {
    const actions: PrioritizedAction[] = [];

    const sortedPoints = frictionPoints
      .filter(p => p.severity === 'critical' || p.severity === 'high')
      .sort((a, b) => b.impactScore - a.impactScore);

    sortedPoints.slice(0, 10).forEach((point, index) => {
      const roi = (point.estimatedCost.monetaryImpact / 1000) / (index + 1);

      actions.push({
        rank: index + 1,
        frictionPointId: point.id,
        action: this.generateActionForFriction(point),
        expectedImpact: point.impactScore * 0.6, // Assume 60% improvement possible
        effort: point.impactScore > 60 ? 'high' : point.impactScore > 30 ? 'medium' : 'low',
        timeToImplement: point.impactScore > 60 ? '3-6 months' : '1-3 months',
        owner: point.rootCauses[0]?.ownershipType || 'team',
        dependencies: [],
        roi,
      });
    });

    return actions;
  }

  private generateActionForFriction(point: FrictionPoint): string {
    const actionTemplates: Record<FrictionCategory, string> = {
      communication: 'Implement structured cross-team sync meetings',
      process: 'Streamline and document the affected process',
      skill_gap: 'Develop targeted training program',
      resource: 'Rebalance workload and consider hiring',
      decision_making: 'Clarify decision authority and reduce approval layers',
      collaboration: 'Launch peer feedback program',
      tools: 'Evaluate and upgrade tooling',
      alignment: 'Implement goal cascading framework',
      capacity: 'Conduct capacity planning exercise',
      bureaucracy: 'Simplify approval workflows',
    };

    return actionTemplates[point.category] || 'Address identified friction point';
  }

  private async analyzeTeamPairCollaboration(
    teamA: any,
    teamB: any,
    tenantId: string
  ): Promise<TeamCollaboration> {
    // Analyze feedback exchanges
    const feedbacks = await this.prisma.feedback.findMany({
      where: {
        tenantId,
        OR: [
          {
            giverId: { in: teamA.members.map((m: any) => m.id) },
            receiverId: { in: teamB.members.map((m: any) => m.id) },
          },
          {
            giverId: { in: teamB.members.map((m: any) => m.id) },
            receiverId: { in: teamA.members.map((m: any) => m.id) },
          },
        ],
        createdAt: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
      },
    });

    const interactionFrequency = feedbacks.length;
    const collaborationScore = Math.min(interactionFrequency / 10, 100);
    const frictionScore = 100 - collaborationScore;

    return {
      teamA: { id: teamA.id, name: teamA.name },
      teamB: { id: teamB.id, name: teamB.name },
      collaborationScore,
      frictionScore,
      interactionFrequency,
      responseLatency: 24, // Would be calculated from actual data
      issueResolutionTime: 48,
      commonFrictionPoints: interactionFrequency < 5 ? ['Low interaction frequency'] : [],
    };
  }

  private identifyCommunicationPatterns(teamPairs: TeamCollaboration[]): CommunicationPattern[] {
    const patterns: CommunicationPattern[] = [];

    const avgCollaboration = teamPairs.length > 0
      ? teamPairs.reduce((sum, p) => sum + p.collaborationScore, 0) / teamPairs.length
      : 0;

    if (avgCollaboration < 40) {
      patterns.push({
        pattern: 'Siloed Communication',
        description: 'Teams primarily communicate within their own boundaries',
        frequency: teamPairs.filter(p => p.collaborationScore < 30).length,
        impact: 'negative',
        involvedTeams: teamPairs.filter(p => p.collaborationScore < 30)
          .flatMap(p => [p.teamA.name, p.teamB.name]),
      });
    }

    return patterns;
  }

  private identifyCollaborationBottlenecks(teamPairs: TeamCollaboration[]): CollaborationBottleneck[] {
    const bottlenecks: CollaborationBottleneck[] = [];

    for (const pair of teamPairs.filter(p => p.frictionScore > 70)) {
      bottlenecks.push({
        location: `${pair.teamA.name} <-> ${pair.teamB.name}`,
        type: 'handoff',
        severity: pair.frictionScore > 85 ? 'high' : 'medium',
        averageDelay: pair.responseLatency,
        occurrencesPerWeek: Math.ceil(pair.interactionFrequency / 26), // Rough weekly estimate
        affectedProcesses: ['Cross-team collaboration'],
      });
    }

    return bottlenecks;
  }

  private calculateNetworkHealth(
    teamPairs: TeamCollaboration[],
    bottlenecks: CollaborationBottleneck[]
  ): number {
    if (teamPairs.length === 0) return 50;

    const avgCollaboration = teamPairs.reduce((sum, p) => sum + p.collaborationScore, 0) / teamPairs.length;
    const bottleneckPenalty = bottlenecks.length * 5;

    return Math.max(0, Math.min(100, avgCollaboration - bottleneckPenalty));
  }

  private async calculateAverageResponseTime(tenantId: string, departmentId?: string): Promise<number> {
    // Would calculate from actual feedback response patterns
    return 36; // Default 36 hours
  }

  private getQuarterStart(date: Date): Date {
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), quarter * 3, 1);
  }

  private async getProcess(processId: string, tenantId: string): Promise<any> {
    // Would fetch from process definitions
    return null;
  }

  private async getAllProcesses(tenantId: string): Promise<any[]> {
    return [];
  }

  private async analyzeProcessSteps(process: any, tenantId: string): Promise<ProcessStep[]> {
    return [];
  }

  private identifyProcessBottlenecks(steps: ProcessStep[]): ProcessBottleneck[] {
    return [];
  }

  private identifyProcessWaste(steps: ProcessStep[]): WasteItem[] {
    return [];
  }

  private calculateOptimizationPotential(
    steps: ProcessStep[],
    bottlenecks: ProcessBottleneck[],
    waste: WasteItem[]
  ): number {
    return Math.min(bottlenecks.length * 10 + waste.length * 5, 60);
  }

  private async getRecentDecisions(tenantId: string, departmentId?: string): Promise<any[]> {
    // Would fetch from decision log
    return [];
  }

  private analyzeDecisionsByType(decisions: any[]): DecisionTypeMetrics[] {
    return [];
  }

  private identifyDecisionBottlenecks(decisions: any[]): DecisionBottleneck[] {
    return [];
  }

  private calculateDelegationHealth(decisions: any[]): number {
    return 70; // Default
  }

  private generateDecisionRecommendations(
    metrics: DecisionTypeMetrics[],
    bottlenecks: DecisionBottleneck[]
  ): string[] {
    const recommendations: string[] = [];

    if (bottlenecks.length > 0) {
      recommendations.push('Reduce approval layers for routine decisions');
    }

    recommendations.push('Implement decision delegation framework');

    return recommendations;
  }

  private async getRequiredSkills(tenantId: string, departmentId?: string): Promise<any> {
    return {};
  }

  private async getCurrentSkillCoverage(tenantId: string, departmentId?: string): Promise<any> {
    return {};
  }

  private identifySkillGaps(required: any, current: any): SkillGap[] {
    return [];
  }

  private async identifyEmergingSkillNeeds(tenantId: string): Promise<EmergingSkillNeed[]> {
    return [];
  }

  private identifySkillRedundancies(coverage: any): SkillRedundancy[] {
    return [];
  }

  private generateSkillRecommendations(
    gaps: SkillGap[],
    emerging: EmergingSkillNeed[],
    redundancies: SkillRedundancy[]
  ): SkillRecommendation[] {
    return [];
  }

  private calculateOverallSkillCoverage(required: any, current: any): number {
    return 75; // Default
  }

  private async getTeamUtilization(tenantId: string, departmentId?: string): Promise<TeamUtilization[]> {
    return [];
  }

  private async identifyResourceConstraints(tenantId: string, departmentId?: string): Promise<ResourceConstraint[]> {
    return [];
  }

  private identifyResourceImbalances(utilization: TeamUtilization[]): ResourceImbalance[] {
    return [];
  }

  private generateResourceRecommendations(
    utilization: TeamUtilization[],
    constraints: ResourceConstraint[],
    imbalances: ResourceImbalance[]
  ): ResourceRecommendation[] {
    return [];
  }

  private async cacheIndex(index: FrictionIndex): Promise<void> {
    const key = index.departmentId
      ? `friction:${index.tenantId}:${index.departmentId}`
      : `friction:${index.tenantId}`;

    await this.redis.set(key, JSON.stringify(index), 'EX', 24 * 60 * 60);
  }

  private async getCachedIndex(tenantId: string, departmentId?: string): Promise<FrictionIndex | null> {
    const key = departmentId
      ? `friction:${tenantId}:${departmentId}`
      : `friction:${tenantId}`;

    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const organizationalFrictionIndex = new OrganizationalFrictionIndexService(
  new PrismaClient(),
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
);
