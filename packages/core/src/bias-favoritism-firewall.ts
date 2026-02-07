/**
 * Bias & Favoritism Firewall - USP Feature 7
 *
 * Advanced system that acts as a real-time guardian against biased performance decisions.
 * Unlike simple bias detection, this firewall actively prevents biased actions from
 * being committed, requires justification for flagged decisions, and tracks patterns
 * across the organization to identify systematic favoritism.
 *
 * Key capabilities:
 * - Real-time decision interception and analysis
 * - Multi-dimensional bias pattern detection
 * - Favoritism network mapping
 * - Mandatory justification workflows
 * - Audit trail with immutable logging
 * - Organizational bias health scoring
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

// ============================================================================
// Type Definitions
// ============================================================================

export type BiasCategory =
  | 'gender'
  | 'age'
  | 'tenure'
  | 'ethnicity'
  | 'department'
  | 'location'
  | 'education'
  | 'personality'
  | 'similarity'
  | 'recency'
  | 'halo'
  | 'horn'
  | 'central_tendency'
  | 'leniency'
  | 'strictness'
  | 'contrast'
  | 'affinity';

export type DecisionType =
  | 'rating'
  | 'promotion'
  | 'compensation'
  | 'assignment'
  | 'feedback'
  | 'calibration_adjustment'
  | 'pip_initiation'
  | 'termination'
  | 'bonus'
  | 'development_opportunity';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type FirewallAction = 'allow' | 'warn' | 'require_justification' | 'block' | 'escalate';

export interface DecisionContext {
  decisionId: string;
  tenantId: string;
  deciderId: string;
  subjectId: string;
  decisionType: DecisionType;
  proposedValue: any;
  previousValue?: any;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface BiasSignal {
  category: BiasCategory;
  strength: number; // 0-1
  evidence: string[];
  historicalPattern: boolean;
  affectedDemographic?: string;
}

export interface FavoritismIndicator {
  type: 'direct' | 'indirect' | 'network';
  relationship: string;
  strength: number;
  patterns: string[];
  frequency: number;
}

export interface FirewallDecision {
  decisionId: string;
  action: FirewallAction;
  riskLevel: RiskLevel;
  overallRiskScore: number;
  biasSignals: BiasSignal[];
  favoritismIndicators: FavoritismIndicator[];
  requiredJustifications: JustificationRequirement[];
  alternativeRecommendations: AlternativeRecommendation[];
  auditTrail: AuditEntry;
  expiresAt?: Date;
}

export interface JustificationRequirement {
  id: string;
  category: BiasCategory | 'favoritism';
  prompt: string;
  minimumLength: number;
  requiredEvidence: string[];
  approverLevel: 'manager' | 'hr' | 'executive' | 'committee';
}

export interface AlternativeRecommendation {
  description: string;
  suggestedValue: any;
  rationale: string;
  biasReduction: number;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  decisionContext: DecisionContext;
  firewallDecision: Omit<FirewallDecision, 'auditTrail'>;
  justificationProvided?: string;
  finalOutcome: 'proceeded' | 'modified' | 'cancelled' | 'escalated';
  reviewedBy?: string[];
  immutableHash: string;
}

export interface RelationshipEdge {
  fromUserId: string;
  toUserId: string;
  relationshipType: string;
  strength: number;
  interactions: number;
  favorableDecisions: number;
  totalDecisions: number;
}

export interface FavoritismNetwork {
  tenantId: string;
  nodes: NetworkNode[];
  edges: RelationshipEdge[];
  clusters: FavoritismCluster[];
  overallRisk: number;
  generatedAt: Date;
}

export interface NetworkNode {
  userId: string;
  role: 'decider' | 'beneficiary' | 'both';
  totalDecisionsMade: number;
  totalDecisionsReceived: number;
  favorabilityScore: number;
  flaggedDecisions: number;
}

export interface FavoritismCluster {
  id: string;
  members: string[];
  centralFigure: string;
  averageFavorability: number;
  decisionPatterns: string[];
  riskLevel: RiskLevel;
}

export interface OrganizationalBiasHealth {
  tenantId: string;
  overallScore: number; // 0-100
  categoryScores: Record<BiasCategory, number>;
  trendDirection: 'improving' | 'stable' | 'declining';
  hotspots: BiasHotspot[];
  recommendations: string[];
  benchmarkComparison?: number;
  generatedAt: Date;
}

export interface BiasHotspot {
  location: string; // department, team, or individual
  locationType: 'department' | 'team' | 'individual';
  primaryBiasType: BiasCategory;
  severity: number;
  affectedEmployees: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface FirewallConfig {
  enabled: boolean;
  strictnessLevel: 'low' | 'medium' | 'high' | 'maximum';
  autoBlockThreshold: number;
  requireJustificationThreshold: number;
  warnThreshold: number;
  enabledCategories: BiasCategory[];
  exemptRoles: string[];
  escalationChain: string[];
  auditRetentionDays: number;
}

// ============================================================================
// Bias & Favoritism Firewall Service
// ============================================================================

export class BiasFavoritismFirewall {
  private prisma: PrismaClient;
  private redis: Redis;
  private config: FirewallConfig;

  // Bias pattern weights based on research
  private readonly biasWeights: Record<BiasCategory, number> = {
    gender: 1.0,
    age: 0.95,
    tenure: 0.7,
    ethnicity: 1.0,
    department: 0.6,
    location: 0.5,
    education: 0.65,
    personality: 0.75,
    similarity: 0.85,
    recency: 0.8,
    halo: 0.9,
    horn: 0.9,
    central_tendency: 0.6,
    leniency: 0.7,
    strictness: 0.7,
    contrast: 0.75,
    affinity: 0.95,
  };

  constructor(prisma: PrismaClient, redis: Redis, config?: Partial<FirewallConfig>) {
    this.prisma = prisma;
    this.redis = redis;
    this.config = {
      enabled: true,
      strictnessLevel: 'medium',
      autoBlockThreshold: 0.9,
      requireJustificationThreshold: 0.7,
      warnThreshold: 0.5,
      enabledCategories: Object.keys(this.biasWeights) as BiasCategory[],
      exemptRoles: [],
      escalationChain: [],
      auditRetentionDays: 2555, // 7 years for compliance
      ...config,
    };
  }

  /**
   * Main entry point - intercepts a decision and returns firewall verdict
   */
  async interceptDecision(context: DecisionContext): Promise<FirewallDecision> {
    if (!this.config.enabled) {
      return this.createAllowDecision(context);
    }

    // Check for exempt roles
    const decider = await this.getDeciderInfo(context.deciderId, context.tenantId);
    if (this.config.exemptRoles.includes(decider.role)) {
      return this.createAllowDecision(context);
    }

    // Parallel analysis for performance
    const [
      biasSignals,
      favoritismIndicators,
      historicalPatterns,
      demographicAnalysis,
    ] = await Promise.all([
      this.detectBiasSignals(context),
      this.detectFavoritismIndicators(context),
      this.analyzeHistoricalPatterns(context),
      this.analyzeDemographicImpact(context),
    ]);

    // Combine all signals
    const allBiasSignals = [...biasSignals, ...historicalPatterns];

    // Calculate overall risk score
    const riskScore = this.calculateRiskScore(allBiasSignals, favoritismIndicators);
    const riskLevel = this.determineRiskLevel(riskScore);
    const action = this.determineAction(riskScore, context.decisionType);

    // Generate justification requirements if needed
    const requiredJustifications = action === 'require_justification' || action === 'escalate'
      ? this.generateJustificationRequirements(allBiasSignals, favoritismIndicators)
      : [];

    // Generate alternative recommendations
    const alternativeRecommendations = riskScore > this.config.warnThreshold
      ? await this.generateAlternatives(context, allBiasSignals)
      : [];

    // Create audit entry
    const auditEntry = await this.createAuditEntry(context, {
      action,
      riskLevel,
      overallRiskScore: riskScore,
      biasSignals: allBiasSignals,
      favoritismIndicators,
      requiredJustifications,
      alternativeRecommendations,
    });

    const decision: FirewallDecision = {
      decisionId: context.decisionId,
      action,
      riskLevel,
      overallRiskScore: riskScore,
      biasSignals: allBiasSignals,
      favoritismIndicators,
      requiredJustifications,
      alternativeRecommendations,
      auditTrail: auditEntry,
      expiresAt: action === 'require_justification'
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        : undefined,
    };

    // Cache decision for quick retrieval
    await this.cacheDecision(decision);

    // Emit event for real-time monitoring
    await this.emitFirewallEvent(decision);

    return decision;
  }

  /**
   * Submit justification for a flagged decision
   */
  async submitJustification(
    decisionId: string,
    justification: string,
    evidence: string[],
    submitterId: string
  ): Promise<{
    accepted: boolean;
    feedback: string;
    nextSteps: string[];
  }> {
    const cachedDecision = await this.getCachedDecision(decisionId);
    if (!cachedDecision) {
      throw new Error('Decision not found or expired');
    }

    // Analyze justification quality
    const qualityScore = await this.analyzeJustificationQuality(
      justification,
      evidence,
      cachedDecision.requiredJustifications
    );

    // Check if justification meets requirements
    const meetsRequirements = cachedDecision.requiredJustifications.every(req => {
      const hasMinLength = justification.length >= req.minimumLength;
      const hasEvidence = req.requiredEvidence.every(e =>
        evidence.some(provided => provided.toLowerCase().includes(e.toLowerCase()))
      );
      return hasMinLength && hasEvidence;
    });

    if (meetsRequirements && qualityScore > 0.7) {
      // Update audit trail
      await this.updateAuditWithJustification(decisionId, justification, submitterId, 'proceeded');

      return {
        accepted: true,
        feedback: 'Justification accepted. Decision may proceed.',
        nextSteps: ['Decision has been logged for compliance records'],
      };
    }

    // Determine what's missing
    const missingElements: string[] = [];
    for (const req of cachedDecision.requiredJustifications) {
      if (justification.length < req.minimumLength) {
        missingElements.push(`Justification should be at least ${req.minimumLength} characters`);
      }
      for (const evidence of req.requiredEvidence) {
        if (!evidence.some((e: string) => e.toLowerCase().includes(evidence.toLowerCase()))) {
          missingElements.push(`Missing evidence: ${evidence}`);
        }
      }
    }

    return {
      accepted: false,
      feedback: 'Justification does not meet requirements.',
      nextSteps: missingElements,
    };
  }

  /**
   * Build favoritism network graph for visualization
   */
  async buildFavoritismNetwork(tenantId: string): Promise<FavoritismNetwork> {
    // Get all decisions in the past year
    const decisions = await this.prisma.review.findMany({
      where: {
        tenantId,
        createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
      },
      include: {
        reviewer: true,
        reviewee: true,
      },
    });

    // Build relationship map
    const relationshipMap = new Map<string, RelationshipEdge>();

    for (const decision of decisions) {
      const key = `${decision.reviewerId}-${decision.revieweeId}`;
      const existing = relationshipMap.get(key);

      const isFavorable = this.isDecisionFavorable(decision);

      if (existing) {
        existing.interactions++;
        existing.totalDecisions++;
        if (isFavorable) existing.favorableDecisions++;
        existing.strength = existing.favorableDecisions / existing.totalDecisions;
      } else {
        relationshipMap.set(key, {
          fromUserId: decision.reviewerId,
          toUserId: decision.revieweeId,
          relationshipType: 'reviewer-reviewee',
          strength: isFavorable ? 1 : 0,
          interactions: 1,
          favorableDecisions: isFavorable ? 1 : 0,
          totalDecisions: 1,
        });
      }
    }

    const edges = Array.from(relationshipMap.values());

    // Build nodes
    const nodeMap = new Map<string, NetworkNode>();
    for (const edge of edges) {
      // Update decider node
      const deciderNode = nodeMap.get(edge.fromUserId) || {
        userId: edge.fromUserId,
        role: 'decider' as const,
        totalDecisionsMade: 0,
        totalDecisionsReceived: 0,
        favorabilityScore: 0,
        flaggedDecisions: 0,
      };
      deciderNode.totalDecisionsMade += edge.totalDecisions;
      nodeMap.set(edge.fromUserId, deciderNode);

      // Update beneficiary node
      const beneficiaryNode = nodeMap.get(edge.toUserId) || {
        userId: edge.toUserId,
        role: 'beneficiary' as const,
        totalDecisionsMade: 0,
        totalDecisionsReceived: 0,
        favorabilityScore: 0,
        flaggedDecisions: 0,
      };
      beneficiaryNode.totalDecisionsReceived += edge.totalDecisions;
      beneficiaryNode.favorabilityScore =
        (beneficiaryNode.favorabilityScore * (beneficiaryNode.totalDecisionsReceived - edge.totalDecisions) +
         edge.strength * edge.totalDecisions) / beneficiaryNode.totalDecisionsReceived;
      nodeMap.set(edge.toUserId, beneficiaryNode);
    }

    // Update roles for users who are both deciders and beneficiaries
    for (const node of nodeMap.values()) {
      if (node.totalDecisionsMade > 0 && node.totalDecisionsReceived > 0) {
        node.role = 'both';
      }
    }

    const nodes = Array.from(nodeMap.values());

    // Detect favoritism clusters using community detection
    const clusters = this.detectFavoritismClusters(nodes, edges);

    // Calculate overall network risk
    const overallRisk = this.calculateNetworkRisk(clusters, edges);

    return {
      tenantId,
      nodes,
      edges,
      clusters,
      overallRisk,
      generatedAt: new Date(),
    };
  }

  /**
   * Calculate organizational bias health score
   */
  async calculateOrganizationalBiasHealth(tenantId: string): Promise<OrganizationalBiasHealth> {
    // Get audit entries from the past quarter
    const auditEntries = await this.getRecentAuditEntries(tenantId, 90);

    // Calculate category scores
    const categoryScores: Record<BiasCategory, number> = {} as any;
    const categoryCounts: Record<BiasCategory, number[]> = {} as any;

    for (const category of this.config.enabledCategories) {
      categoryCounts[category] = [];
    }

    for (const entry of auditEntries) {
      for (const signal of entry.firewallDecision.biasSignals) {
        if (categoryCounts[signal.category]) {
          categoryCounts[signal.category].push(signal.strength);
        }
      }
    }

    for (const category of this.config.enabledCategories) {
      const scores = categoryCounts[category];
      if (scores.length > 0) {
        const avgBias = scores.reduce((a, b) => a + b, 0) / scores.length;
        categoryScores[category] = Math.round((1 - avgBias) * 100);
      } else {
        categoryScores[category] = 100; // No bias detected
      }
    }

    // Calculate overall score (weighted average)
    const totalWeight = Object.values(this.biasWeights).reduce((a, b) => a + b, 0);
    let weightedSum = 0;
    for (const category of this.config.enabledCategories) {
      weightedSum += categoryScores[category] * this.biasWeights[category];
    }
    const overallScore = Math.round(weightedSum / totalWeight);

    // Detect hotspots
    const hotspots = await this.detectBiasHotspots(tenantId, auditEntries);

    // Determine trend
    const previousQuarter = await this.getRecentAuditEntries(tenantId, 180);
    const previousScore = this.calculateQuarterScore(previousQuarter.slice(auditEntries.length));
    const trendDirection = overallScore > previousScore + 5
      ? 'improving'
      : overallScore < previousScore - 5
        ? 'declining'
        : 'stable';

    // Generate recommendations
    const recommendations = this.generateBiasRecommendations(categoryScores, hotspots);

    return {
      tenantId,
      overallScore,
      categoryScores,
      trendDirection,
      hotspots,
      recommendations,
      generatedAt: new Date(),
    };
  }

  /**
   * Real-time bias signal detection
   */
  private async detectBiasSignals(context: DecisionContext): Promise<BiasSignal[]> {
    const signals: BiasSignal[] = [];

    // Get subject and decider demographics
    const [subject, decider] = await Promise.all([
      this.getUserDemographics(context.subjectId, context.tenantId),
      this.getUserDemographics(context.deciderId, context.tenantId),
    ]);

    // Get comparison group data
    const comparisonGroup = await this.getComparisonGroup(context);

    // 1. Gender bias detection
    if (this.config.enabledCategories.includes('gender')) {
      const genderSignal = this.detectGenderBias(context, subject, comparisonGroup);
      if (genderSignal) signals.push(genderSignal);
    }

    // 2. Age bias detection
    if (this.config.enabledCategories.includes('age')) {
      const ageSignal = this.detectAgeBias(context, subject, comparisonGroup);
      if (ageSignal) signals.push(ageSignal);
    }

    // 3. Tenure bias detection
    if (this.config.enabledCategories.includes('tenure')) {
      const tenureSignal = this.detectTenureBias(context, subject, comparisonGroup);
      if (tenureSignal) signals.push(tenureSignal);
    }

    // 4. Similarity/affinity bias (decider favoring similar people)
    if (this.config.enabledCategories.includes('similarity')) {
      const similaritySignal = this.detectSimilarityBias(subject, decider, context);
      if (similaritySignal) signals.push(similaritySignal);
    }

    // 5. Recency bias
    if (this.config.enabledCategories.includes('recency')) {
      const recencySignal = await this.detectRecencyBias(context);
      if (recencySignal) signals.push(recencySignal);
    }

    // 6. Halo/Horn effect
    if (this.config.enabledCategories.includes('halo') || this.config.enabledCategories.includes('horn')) {
      const haloHornSignal = await this.detectHaloHornEffect(context);
      if (haloHornSignal) signals.push(haloHornSignal);
    }

    // 7. Central tendency bias
    if (this.config.enabledCategories.includes('central_tendency')) {
      const centralSignal = this.detectCentralTendencyBias(context, comparisonGroup);
      if (centralSignal) signals.push(centralSignal);
    }

    // 8. Leniency/Strictness bias
    if (this.config.enabledCategories.includes('leniency') || this.config.enabledCategories.includes('strictness')) {
      const leniencySignal = await this.detectLeniencyStrictnessBias(context);
      if (leniencySignal) signals.push(leniencySignal);
    }

    // 9. Contrast effect
    if (this.config.enabledCategories.includes('contrast')) {
      const contrastSignal = await this.detectContrastEffect(context);
      if (contrastSignal) signals.push(contrastSignal);
    }

    return signals;
  }

  /**
   * Detect favoritism patterns between decider and subject
   */
  private async detectFavoritismIndicators(context: DecisionContext): Promise<FavoritismIndicator[]> {
    const indicators: FavoritismIndicator[] = [];

    // Check direct relationship
    const directRelationship = await this.checkDirectRelationship(
      context.deciderId,
      context.subjectId,
      context.tenantId
    );
    if (directRelationship) {
      indicators.push(directRelationship);
    }

    // Check indirect relationships (shared connections)
    const indirectRelationships = await this.checkIndirectRelationships(
      context.deciderId,
      context.subjectId,
      context.tenantId
    );
    indicators.push(...indirectRelationships);

    // Check network patterns
    const networkPatterns = await this.checkNetworkPatterns(context);
    indicators.push(...networkPatterns);

    return indicators;
  }

  /**
   * Analyze historical patterns for this decider
   */
  private async analyzeHistoricalPatterns(context: DecisionContext): Promise<BiasSignal[]> {
    const signals: BiasSignal[] = [];

    // Get decider's historical decisions
    const historicalDecisions = await this.prisma.review.findMany({
      where: {
        reviewerId: context.deciderId,
        tenantId: context.tenantId,
        createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
      },
      include: {
        reviewee: true,
      },
    });

    if (historicalDecisions.length < 10) {
      return signals; // Not enough data
    }

    // Analyze patterns by demographic groups
    const demographicAnalysis = this.analyzeDecisionsByDemographics(historicalDecisions);

    for (const [category, analysis] of Object.entries(demographicAnalysis)) {
      if (analysis.variance > 0.3) {
        signals.push({
          category: category as BiasCategory,
          strength: Math.min(analysis.variance, 1),
          evidence: analysis.evidence,
          historicalPattern: true,
          affectedDemographic: analysis.disadvantagedGroup,
        });
      }
    }

    return signals;
  }

  /**
   * Analyze demographic impact of this decision
   */
  private async analyzeDemographicImpact(context: DecisionContext): Promise<{
    impactedGroups: string[];
    disparateImpact: boolean;
  }> {
    // Placeholder for advanced disparate impact analysis
    return {
      impactedGroups: [],
      disparateImpact: false,
    };
  }

  // ============================================================================
  // Bias Detection Helpers
  // ============================================================================

  private detectGenderBias(
    context: DecisionContext,
    subject: any,
    comparisonGroup: any[]
  ): BiasSignal | null {
    if (!subject.gender || comparisonGroup.length < 5) return null;

    const sameGender = comparisonGroup.filter(c => c.gender === subject.gender);
    const diffGender = comparisonGroup.filter(c => c.gender !== subject.gender);

    if (sameGender.length < 3 || diffGender.length < 3) return null;

    const sameGenderAvg = this.calculateAverageRating(sameGender);
    const diffGenderAvg = this.calculateAverageRating(diffGender);
    const proposedValue = typeof context.proposedValue === 'number'
      ? context.proposedValue
      : context.proposedValue?.rating;

    if (!proposedValue) return null;

    const deviation = Math.abs(proposedValue - diffGenderAvg) - Math.abs(proposedValue - sameGenderAvg);

    if (Math.abs(sameGenderAvg - diffGenderAvg) > 0.5 && deviation > 0.3) {
      return {
        category: 'gender',
        strength: Math.min(Math.abs(sameGenderAvg - diffGenderAvg) / 2, 1),
        evidence: [
          `Average rating for ${subject.gender}: ${sameGenderAvg.toFixed(2)}`,
          `Average rating for other gender: ${diffGenderAvg.toFixed(2)}`,
          `Proposed rating: ${proposedValue}`,
        ],
        historicalPattern: false,
        affectedDemographic: diffGenderAvg < sameGenderAvg ? 'other gender' : subject.gender,
      };
    }

    return null;
  }

  private detectAgeBias(
    context: DecisionContext,
    subject: any,
    comparisonGroup: any[]
  ): BiasSignal | null {
    if (!subject.birthDate) return null;

    const subjectAge = this.calculateAge(subject.birthDate);
    const ageGroups = this.groupByAge(comparisonGroup);

    const subjectGroup = subjectAge < 30 ? 'young' : subjectAge < 50 ? 'middle' : 'senior';
    const otherGroups = Object.entries(ageGroups).filter(([g]) => g !== subjectGroup);

    if (otherGroups.length === 0 || !ageGroups[subjectGroup] || ageGroups[subjectGroup].length < 3) {
      return null;
    }

    const subjectGroupAvg = this.calculateAverageRating(ageGroups[subjectGroup]);
    const otherGroupsAvg = otherGroups.reduce((sum, [_, group]) =>
      sum + this.calculateAverageRating(group), 0) / otherGroups.length;

    if (Math.abs(subjectGroupAvg - otherGroupsAvg) > 0.5) {
      return {
        category: 'age',
        strength: Math.min(Math.abs(subjectGroupAvg - otherGroupsAvg) / 2, 1),
        evidence: [
          `Subject age group: ${subjectGroup} (${subjectAge} years old)`,
          `Average rating for ${subjectGroup}: ${subjectGroupAvg.toFixed(2)}`,
          `Average rating for other age groups: ${otherGroupsAvg.toFixed(2)}`,
        ],
        historicalPattern: false,
        affectedDemographic: subjectGroupAvg < otherGroupsAvg ? subjectGroup : 'other age groups',
      };
    }

    return null;
  }

  private detectTenureBias(
    context: DecisionContext,
    subject: any,
    comparisonGroup: any[]
  ): BiasSignal | null {
    if (!subject.hireDate) return null;

    const subjectTenure = this.calculateTenure(subject.hireDate);
    const tenureGroups = this.groupByTenure(comparisonGroup);

    const subjectGroup = subjectTenure < 1 ? 'new' : subjectTenure < 3 ? 'established' : 'veteran';

    if (!tenureGroups[subjectGroup] || tenureGroups[subjectGroup].length < 3) {
      return null;
    }

    // Check if new employees are rated lower regardless of performance
    const newAvg = tenureGroups['new'] ? this.calculateAverageRating(tenureGroups['new']) : 0;
    const veteranAvg = tenureGroups['veteran'] ? this.calculateAverageRating(tenureGroups['veteran']) : 0;

    if (Math.abs(newAvg - veteranAvg) > 0.7 && tenureGroups['new'] && tenureGroups['veteran']) {
      return {
        category: 'tenure',
        strength: Math.min(Math.abs(newAvg - veteranAvg) / 2, 1),
        evidence: [
          `New employee average: ${newAvg.toFixed(2)}`,
          `Veteran employee average: ${veteranAvg.toFixed(2)}`,
          `Subject tenure: ${subjectTenure.toFixed(1)} years`,
        ],
        historicalPattern: false,
        affectedDemographic: newAvg < veteranAvg ? 'new employees' : 'veteran employees',
      };
    }

    return null;
  }

  private detectSimilarityBias(
    subject: any,
    decider: any,
    context: DecisionContext
  ): BiasSignal | null {
    const similarities: string[] = [];
    let similarityScore = 0;

    // Check various similarity dimensions
    if (subject.education === decider.education) {
      similarities.push('Same educational background');
      similarityScore += 0.2;
    }
    if (subject.department === decider.department) {
      similarities.push('Same department');
      similarityScore += 0.15;
    }
    if (subject.location === decider.location) {
      similarities.push('Same location');
      similarityScore += 0.1;
    }
    if (Math.abs(this.calculateAge(subject.birthDate) - this.calculateAge(decider.birthDate)) < 5) {
      similarities.push('Similar age');
      similarityScore += 0.15;
    }
    if (subject.gender === decider.gender) {
      similarities.push('Same gender');
      similarityScore += 0.1;
    }

    // High similarity + favorable decision = potential bias
    const proposedValue = typeof context.proposedValue === 'number'
      ? context.proposedValue
      : context.proposedValue?.rating;

    if (similarityScore > 0.4 && proposedValue && proposedValue > 3.5) {
      return {
        category: 'similarity',
        strength: similarityScore * 0.8,
        evidence: [
          `Similarity factors: ${similarities.join(', ')}`,
          `Similarity score: ${(similarityScore * 100).toFixed(0)}%`,
          `Proposed favorable rating: ${proposedValue}`,
        ],
        historicalPattern: false,
      };
    }

    return null;
  }

  private async detectRecencyBias(context: DecisionContext): Promise<BiasSignal | null> {
    // Get recent events for the subject
    const recentEvents = await this.prisma.feedback.findMany({
      where: {
        receiverId: context.subjectId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    const olderEvents = await this.prisma.feedback.findMany({
      where: {
        receiverId: context.subjectId,
        createdAt: {
          gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (recentEvents.length < 2 || olderEvents.length < 2) return null;

    const recentSentiment = this.calculateAverageSentiment(recentEvents);
    const olderSentiment = this.calculateAverageSentiment(olderEvents);

    if (Math.abs(recentSentiment - olderSentiment) > 0.4) {
      return {
        category: 'recency',
        strength: Math.abs(recentSentiment - olderSentiment),
        evidence: [
          `Recent feedback sentiment: ${recentSentiment.toFixed(2)}`,
          `Older feedback sentiment: ${olderSentiment.toFixed(2)}`,
          `Significant difference suggests recency bias`,
        ],
        historicalPattern: false,
      };
    }

    return null;
  }

  private async detectHaloHornEffect(context: DecisionContext): Promise<BiasSignal | null> {
    // Check if one strong trait is influencing other ratings
    const previousReviews = await this.prisma.review.findMany({
      where: {
        revieweeId: context.subjectId,
        reviewerId: context.deciderId,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (previousReviews.length < 2) return null;

    // Calculate rating variance across dimensions
    const ratings = previousReviews.map(r => r.overallRating).filter(Boolean) as number[];
    const variance = this.calculateVariance(ratings);

    // Very low variance might indicate halo/horn effect
    if (variance < 0.2 && ratings.length >= 3) {
      const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const category: BiasCategory = avgRating > 3.5 ? 'halo' : 'horn';

      return {
        category,
        strength: 1 - (variance * 2),
        evidence: [
          `All ratings cluster around ${avgRating.toFixed(2)}`,
          `Very low variance (${variance.toFixed(3)}) suggests ${category} effect`,
          `Individual performance dimensions may not be independently evaluated`,
        ],
        historicalPattern: true,
      };
    }

    return null;
  }

  private detectCentralTendencyBias(
    context: DecisionContext,
    comparisonGroup: any[]
  ): BiasSignal | null {
    if (comparisonGroup.length < 10) return null;

    const ratings = comparisonGroup.map(c => c.rating).filter(Boolean) as number[];
    const variance = this.calculateVariance(ratings);
    const mean = ratings.reduce((a, b) => a + b, 0) / ratings.length;

    // Very low variance with mean near center indicates central tendency
    if (variance < 0.3 && Math.abs(mean - 3) < 0.5) {
      return {
        category: 'central_tendency',
        strength: 1 - variance,
        evidence: [
          `Rating distribution variance: ${variance.toFixed(3)}`,
          `Mean rating: ${mean.toFixed(2)}`,
          `Ratings are clustered around the middle of the scale`,
        ],
        historicalPattern: false,
      };
    }

    return null;
  }

  private async detectLeniencyStrictnessBias(context: DecisionContext): Promise<BiasSignal | null> {
    // Compare this decider's average ratings to organizational average
    const deciderReviews = await this.prisma.review.findMany({
      where: {
        reviewerId: context.deciderId,
        tenantId: context.tenantId,
        createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
      },
    });

    const orgReviews = await this.prisma.review.findMany({
      where: {
        tenantId: context.tenantId,
        createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
      },
    });

    if (deciderReviews.length < 5 || orgReviews.length < 20) return null;

    const deciderAvg = deciderReviews.reduce((sum, r) => sum + (r.overallRating || 0), 0) / deciderReviews.length;
    const orgAvg = orgReviews.reduce((sum, r) => sum + (r.overallRating || 0), 0) / orgReviews.length;

    const deviation = deciderAvg - orgAvg;

    if (Math.abs(deviation) > 0.5) {
      const category: BiasCategory = deviation > 0 ? 'leniency' : 'strictness';
      return {
        category,
        strength: Math.min(Math.abs(deviation) / 1.5, 1),
        evidence: [
          `Decider's average rating: ${deciderAvg.toFixed(2)}`,
          `Organization average: ${orgAvg.toFixed(2)}`,
          `Deviation: ${deviation > 0 ? '+' : ''}${deviation.toFixed(2)}`,
        ],
        historicalPattern: true,
      };
    }

    return null;
  }

  private async detectContrastEffect(context: DecisionContext): Promise<BiasSignal | null> {
    // Check if rating is influenced by previously reviewed employees
    const recentReviews = await this.prisma.review.findMany({
      where: {
        reviewerId: context.deciderId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (recentReviews.length < 2) return null;

    const lastRating = recentReviews[0].overallRating;
    const proposedRating = typeof context.proposedValue === 'number'
      ? context.proposedValue
      : context.proposedValue?.rating;

    if (!lastRating || !proposedRating) return null;

    // Large swing from last review might indicate contrast effect
    const swing = Math.abs(proposedRating - lastRating);
    if (swing > 1.5) {
      return {
        category: 'contrast',
        strength: Math.min(swing / 3, 1),
        evidence: [
          `Previous review rating: ${lastRating}`,
          `Current proposed rating: ${proposedRating}`,
          `Large swing (${swing.toFixed(2)}) may indicate contrast effect`,
        ],
        historicalPattern: false,
      };
    }

    return null;
  }

  // ============================================================================
  // Favoritism Detection Helpers
  // ============================================================================

  private async checkDirectRelationship(
    deciderId: string,
    subjectId: string,
    tenantId: string
  ): Promise<FavoritismIndicator | null> {
    // Check for personal relationships, past collaborations, etc.
    const directConnections = await this.prisma.feedback.count({
      where: {
        OR: [
          { giverId: deciderId, receiverId: subjectId },
          { giverId: subjectId, receiverId: deciderId },
        ],
        tenantId,
      },
    });

    // Check mentorship relationships
    const mentorship = await this.prisma.user.findFirst({
      where: {
        id: subjectId,
        mentorId: deciderId,
      },
    });

    if (directConnections > 10 || mentorship) {
      return {
        type: 'direct',
        relationship: mentorship ? 'mentor-mentee' : 'frequent collaborators',
        strength: Math.min(directConnections / 20, 1),
        patterns: [
          mentorship ? 'Formal mentorship relationship' : null,
          directConnections > 10 ? `${directConnections} direct feedback exchanges` : null,
        ].filter(Boolean) as string[],
        frequency: directConnections,
      };
    }

    return null;
  }

  private async checkIndirectRelationships(
    deciderId: string,
    subjectId: string,
    tenantId: string
  ): Promise<FavoritismIndicator[]> {
    const indicators: FavoritismIndicator[] = [];

    // Check for common connections
    const deciderConnections = await this.prisma.feedback.findMany({
      where: { giverId: deciderId, tenantId },
      select: { receiverId: true },
    });

    const subjectConnections = await this.prisma.feedback.findMany({
      where: { giverId: subjectId, tenantId },
      select: { receiverId: true },
    });

    const deciderSet = new Set(deciderConnections.map(c => c.receiverId));
    const commonConnections = subjectConnections.filter(c => deciderSet.has(c.receiverId));

    if (commonConnections.length > 5) {
      indicators.push({
        type: 'indirect',
        relationship: 'shared network',
        strength: Math.min(commonConnections.length / 15, 1),
        patterns: [`${commonConnections.length} common connections in feedback network`],
        frequency: commonConnections.length,
      });
    }

    return indicators;
  }

  private async checkNetworkPatterns(context: DecisionContext): Promise<FavoritismIndicator[]> {
    const indicators: FavoritismIndicator[] = [];

    // Check if this subject consistently receives favorable decisions from this decider
    const historicalDecisions = await this.prisma.review.findMany({
      where: {
        reviewerId: context.deciderId,
        revieweeId: context.subjectId,
        tenantId: context.tenantId,
      },
    });

    if (historicalDecisions.length >= 3) {
      const favorableCount = historicalDecisions.filter(d => (d.overallRating || 0) >= 4).length;
      const favorableRate = favorableCount / historicalDecisions.length;

      if (favorableRate > 0.8) {
        indicators.push({
          type: 'network',
          relationship: 'consistent favorability',
          strength: favorableRate,
          patterns: [
            `${favorableCount}/${historicalDecisions.length} reviews were favorable`,
            `Favorable rate: ${(favorableRate * 100).toFixed(0)}%`,
          ],
          frequency: historicalDecisions.length,
        });
      }
    }

    return indicators;
  }

  // ============================================================================
  // Scoring and Decision Helpers
  // ============================================================================

  private calculateRiskScore(
    biasSignals: BiasSignal[],
    favoritismIndicators: FavoritismIndicator[]
  ): number {
    let biasScore = 0;
    for (const signal of biasSignals) {
      const weight = this.biasWeights[signal.category] || 0.5;
      const historicalMultiplier = signal.historicalPattern ? 1.3 : 1;
      biasScore += signal.strength * weight * historicalMultiplier;
    }
    biasScore = Math.min(biasScore / 2, 1); // Normalize

    let favoritismScore = 0;
    for (const indicator of favoritismIndicators) {
      const typeWeight = indicator.type === 'direct' ? 1.2 : indicator.type === 'network' ? 1 : 0.8;
      favoritismScore += indicator.strength * typeWeight;
    }
    favoritismScore = Math.min(favoritismScore / 1.5, 1); // Normalize

    // Combined score with bias weighted slightly higher
    return biasScore * 0.6 + favoritismScore * 0.4;
  }

  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  private determineAction(score: number, decisionType: DecisionType): FirewallAction {
    // Adjust thresholds based on strictness level
    const strictnessMultiplier = {
      low: 1.2,
      medium: 1,
      high: 0.8,
      maximum: 0.6,
    }[this.config.strictnessLevel];

    const adjustedAutoBlock = this.config.autoBlockThreshold * strictnessMultiplier;
    const adjustedJustify = this.config.requireJustificationThreshold * strictnessMultiplier;
    const adjustedWarn = this.config.warnThreshold * strictnessMultiplier;

    // High-impact decisions have stricter thresholds
    const highImpactTypes: DecisionType[] = ['promotion', 'termination', 'pip_initiation', 'compensation'];
    const impactMultiplier = highImpactTypes.includes(decisionType) ? 0.8 : 1;

    if (score >= adjustedAutoBlock * impactMultiplier) return 'block';
    if (score >= adjustedJustify * impactMultiplier) return 'require_justification';
    if (score >= adjustedWarn * impactMultiplier) return 'warn';
    return 'allow';
  }

  private generateJustificationRequirements(
    biasSignals: BiasSignal[],
    favoritismIndicators: FavoritismIndicator[]
  ): JustificationRequirement[] {
    const requirements: JustificationRequirement[] = [];

    for (const signal of biasSignals.filter(s => s.strength > 0.5)) {
      requirements.push({
        id: `just_${signal.category}_${Date.now()}`,
        category: signal.category,
        prompt: this.getJustificationPrompt(signal.category),
        minimumLength: 100,
        requiredEvidence: this.getRequiredEvidence(signal.category),
        approverLevel: signal.strength > 0.8 ? 'hr' : 'manager',
      });
    }

    if (favoritismIndicators.length > 0) {
      requirements.push({
        id: `just_favoritism_${Date.now()}`,
        category: 'favoritism',
        prompt: 'Please explain the objective criteria used for this decision, independent of your relationship with the employee.',
        minimumLength: 150,
        requiredEvidence: ['performance metrics', 'peer comparison', 'goal completion'],
        approverLevel: favoritismIndicators.some(i => i.strength > 0.8) ? 'executive' : 'hr',
      });
    }

    return requirements;
  }

  private getJustificationPrompt(category: BiasCategory): string {
    const prompts: Record<BiasCategory, string> = {
      gender: 'Please provide objective, job-related criteria that support this rating, independent of gender.',
      age: 'Please explain how this rating reflects job performance rather than age-related factors.',
      tenure: 'Please justify this rating based on current performance, not tenure length.',
      ethnicity: 'Please provide evidence-based justification for this rating.',
      department: 'Please explain how cross-departmental comparison was fairly conducted.',
      location: 'Please justify how remote/location factors were objectively considered.',
      education: 'Please explain how job performance, not educational background, influenced this rating.',
      personality: 'Please provide behavioral evidence supporting this rating.',
      similarity: 'Please provide objective metrics that support this rating, independent of personal similarities.',
      recency: 'Please consider the full review period, not just recent events.',
      halo: 'Please evaluate each performance dimension independently.',
      horn: 'Please evaluate each performance dimension independently.',
      central_tendency: 'Please differentiate performance more clearly across the rating scale.',
      leniency: 'Please calibrate this rating against organizational standards.',
      strictness: 'Please calibrate this rating against organizational standards.',
      contrast: 'Please rate this employee independently of other recent reviews.',
      affinity: 'Please provide objective justification independent of personal affinity.',
    };
    return prompts[category];
  }

  private getRequiredEvidence(category: BiasCategory): string[] {
    const evidence: Record<BiasCategory, string[]> = {
      gender: ['objective metrics', 'peer comparison'],
      age: ['performance data', 'skills assessment'],
      tenure: ['recent achievements', 'goal completion'],
      ethnicity: ['performance metrics', 'documented achievements'],
      department: ['cross-functional feedback', 'objective criteria'],
      location: ['output metrics', 'collaboration evidence'],
      education: ['job performance', 'skills demonstration'],
      personality: ['behavioral examples', 'outcome data'],
      similarity: ['measurable outcomes', 'peer comparison'],
      recency: ['full period review', 'quarterly data'],
      halo: ['individual dimension scores', 'specific examples'],
      horn: ['individual dimension scores', 'specific examples'],
      central_tendency: ['differentiated criteria', 'ranking justification'],
      leniency: ['calibration data', 'peer comparison'],
      strictness: ['calibration data', 'peer comparison'],
      contrast: ['independent assessment', 'objective criteria'],
      affinity: ['measurable performance', 'third-party feedback'],
    };
    return evidence[category];
  }

  private async generateAlternatives(
    context: DecisionContext,
    biasSignals: BiasSignal[]
  ): Promise<AlternativeRecommendation[]> {
    const alternatives: AlternativeRecommendation[] = [];

    const proposedValue = typeof context.proposedValue === 'number'
      ? context.proposedValue
      : context.proposedValue?.rating;

    if (!proposedValue) return alternatives;

    // Get objective baseline
    const comparisonGroup = await this.getComparisonGroup(context);
    const groupAverage = this.calculateAverageRating(comparisonGroup);

    // If proposed is significantly different from objective baseline
    if (Math.abs(proposedValue - groupAverage) > 0.5) {
      alternatives.push({
        description: 'Align with peer group average',
        suggestedValue: Math.round(groupAverage * 10) / 10,
        rationale: `Based on objective comparison with ${comparisonGroup.length} peers in similar roles`,
        biasReduction: 0.4,
      });
    }

    // Suggest calibrated rating
    if (biasSignals.some(s => s.category === 'leniency' || s.category === 'strictness')) {
      const calibratedValue = this.calculateCalibratedRating(proposedValue, context);
      alternatives.push({
        description: 'Apply organizational calibration',
        suggestedValue: calibratedValue,
        rationale: 'Adjusted to align with organizational rating distribution',
        biasReduction: 0.3,
      });
    }

    return alternatives;
  }

  // ============================================================================
  // Cluster Detection
  // ============================================================================

  private detectFavoritismClusters(
    nodes: NetworkNode[],
    edges: RelationshipEdge[]
  ): FavoritismCluster[] {
    const clusters: FavoritismCluster[] = [];
    const visited = new Set<string>();

    // Simple clustering based on high-strength edges
    for (const edge of edges.filter(e => e.strength > 0.7)) {
      if (visited.has(edge.fromUserId) && visited.has(edge.toUserId)) continue;

      const clusterMembers = new Set<string>([edge.fromUserId, edge.toUserId]);

      // Expand cluster
      for (const otherEdge of edges) {
        if (otherEdge.strength > 0.6) {
          if (clusterMembers.has(otherEdge.fromUserId)) {
            clusterMembers.add(otherEdge.toUserId);
          }
          if (clusterMembers.has(otherEdge.toUserId)) {
            clusterMembers.add(otherEdge.fromUserId);
          }
        }
      }

      if (clusterMembers.size >= 3) {
        const members = Array.from(clusterMembers);
        members.forEach(m => visited.add(m));

        // Find central figure (most decisions made)
        const centralFigure = members.reduce((max, m) => {
          const node = nodes.find(n => n.userId === m);
          const maxNode = nodes.find(n => n.userId === max);
          return (node?.totalDecisionsMade || 0) > (maxNode?.totalDecisionsMade || 0) ? m : max;
        });

        const clusterEdges = edges.filter(e =>
          clusterMembers.has(e.fromUserId) && clusterMembers.has(e.toUserId)
        );
        const avgFavorability = clusterEdges.reduce((sum, e) => sum + e.strength, 0) / clusterEdges.length;

        clusters.push({
          id: `cluster_${clusters.length + 1}`,
          members,
          centralFigure,
          averageFavorability: avgFavorability,
          decisionPatterns: [`${clusterEdges.length} favorable decisions within cluster`],
          riskLevel: avgFavorability > 0.8 ? 'high' : avgFavorability > 0.6 ? 'medium' : 'low',
        });
      }
    }

    return clusters;
  }

  private calculateNetworkRisk(clusters: FavoritismCluster[], edges: RelationshipEdge[]): number {
    if (edges.length === 0) return 0;

    const clusterRisk = clusters.reduce((sum, c) => {
      const sizeWeight = Math.min(c.members.length / 10, 1);
      const favorabilityWeight = c.averageFavorability;
      return sum + sizeWeight * favorabilityWeight;
    }, 0) / Math.max(clusters.length, 1);

    const edgeRisk = edges.filter(e => e.strength > 0.7).length / edges.length;

    return (clusterRisk + edgeRisk) / 2;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private async getDeciderInfo(deciderId: string, tenantId: string): Promise<any> {
    return this.prisma.user.findUnique({
      where: { id: deciderId },
      include: { role: true },
    }) || { role: 'employee' };
  }

  private async getUserDemographics(userId: string, tenantId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { department: true },
    });
    return user || {};
  }

  private async getComparisonGroup(context: DecisionContext): Promise<any[]> {
    // Get employees in similar roles for comparison
    const subject = await this.prisma.user.findUnique({
      where: { id: context.subjectId },
    });

    if (!subject) return [];

    const peers = await this.prisma.user.findMany({
      where: {
        tenantId: context.tenantId,
        departmentId: subject.departmentId,
        id: { not: context.subjectId },
      },
      include: {
        reviewsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return peers.map(p => ({
      ...p,
      rating: p.reviewsReceived[0]?.overallRating,
    }));
  }

  private calculateAverageRating(group: any[]): number {
    const ratings = group.map(g => g.rating).filter(r => r != null);
    if (ratings.length === 0) return 3;
    return ratings.reduce((a, b) => a + b, 0) / ratings.length;
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateAge(birthDate: Date | null): number {
    if (!birthDate) return 35; // Default
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  private calculateTenure(hireDate: Date): number {
    const today = new Date();
    return (today.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  }

  private groupByAge(users: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = { young: [], middle: [], senior: [] };
    for (const user of users) {
      const age = this.calculateAge(user.birthDate);
      if (age < 30) groups.young.push(user);
      else if (age < 50) groups.middle.push(user);
      else groups.senior.push(user);
    }
    return groups;
  }

  private groupByTenure(users: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = { new: [], established: [], veteran: [] };
    for (const user of users) {
      if (!user.hireDate) continue;
      const tenure = this.calculateTenure(user.hireDate);
      if (tenure < 1) groups.new.push(user);
      else if (tenure < 3) groups.established.push(user);
      else groups.veteran.push(user);
    }
    return groups;
  }

  private calculateAverageSentiment(feedbacks: any[]): number {
    // Simplified sentiment - would integrate with actual NLP service
    return feedbacks.length > 0 ? 0.6 : 0.5;
  }

  private analyzeDecisionsByDemographics(decisions: any[]): Record<string, any> {
    const analysis: Record<string, any> = {};

    // Group by gender
    const byGender: Record<string, number[]> = {};
    for (const d of decisions) {
      const gender = d.reviewee?.gender || 'unknown';
      if (!byGender[gender]) byGender[gender] = [];
      if (d.overallRating) byGender[gender].push(d.overallRating);
    }

    const genderGroups = Object.keys(byGender).filter(g => byGender[g].length >= 3);
    if (genderGroups.length >= 2) {
      const averages = genderGroups.map(g => ({
        group: g,
        avg: byGender[g].reduce((a, b) => a + b, 0) / byGender[g].length,
      }));
      const maxAvg = Math.max(...averages.map(a => a.avg));
      const minAvg = Math.min(...averages.map(a => a.avg));

      analysis.gender = {
        variance: maxAvg - minAvg,
        evidence: averages.map(a => `${a.group}: ${a.avg.toFixed(2)}`),
        disadvantagedGroup: averages.find(a => a.avg === minAvg)?.group,
      };
    }

    return analysis;
  }

  private isDecisionFavorable(decision: any): boolean {
    return (decision.overallRating || 0) >= 4;
  }

  private calculateCalibratedRating(proposed: number, context: DecisionContext): number {
    // Simple calibration - pull toward 3.0
    const calibrationStrength = 0.3;
    return proposed + (3 - proposed) * calibrationStrength;
  }

  private async analyzeJustificationQuality(
    justification: string,
    evidence: string[],
    requirements: JustificationRequirement[]
  ): Promise<number> {
    // Simplified quality analysis
    let score = 0;

    // Length check
    const avgRequiredLength = requirements.reduce((sum, r) => sum + r.minimumLength, 0) / requirements.length;
    if (justification.length >= avgRequiredLength) score += 0.3;

    // Evidence check
    const totalRequiredEvidence = requirements.flatMap(r => r.requiredEvidence);
    const evidenceMatches = totalRequiredEvidence.filter(req =>
      evidence.some(e => e.toLowerCase().includes(req.toLowerCase()))
    );
    score += (evidenceMatches.length / totalRequiredEvidence.length) * 0.4;

    // Content quality (simplified)
    const hasSpecificExamples = /\d+/.test(justification) || /example|instance|specifically/i.test(justification);
    if (hasSpecificExamples) score += 0.3;

    return score;
  }

  private createAllowDecision(context: DecisionContext): FirewallDecision {
    return {
      decisionId: context.decisionId,
      action: 'allow',
      riskLevel: 'low',
      overallRiskScore: 0,
      biasSignals: [],
      favoritismIndicators: [],
      requiredJustifications: [],
      alternativeRecommendations: [],
      auditTrail: {
        id: `audit_${Date.now()}`,
        timestamp: new Date(),
        decisionContext: context,
        firewallDecision: {} as any,
        finalOutcome: 'proceeded',
        immutableHash: this.generateHash(context),
      },
    };
  }

  private async createAuditEntry(
    context: DecisionContext,
    decision: Omit<FirewallDecision, 'decisionId' | 'auditTrail' | 'expiresAt'>
  ): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: `audit_${context.decisionId}_${Date.now()}`,
      timestamp: new Date(),
      decisionContext: context,
      firewallDecision: { ...decision, decisionId: context.decisionId },
      finalOutcome: decision.action === 'allow' ? 'proceeded' : 'proceeded', // Updated on completion
      immutableHash: this.generateHash({ context, decision }),
    };

    // Store in database
    await this.redis.set(
      `firewall:audit:${entry.id}`,
      JSON.stringify(entry),
      'EX',
      this.config.auditRetentionDays * 24 * 60 * 60
    );

    return entry;
  }

  private async updateAuditWithJustification(
    decisionId: string,
    justification: string,
    reviewerId: string,
    outcome: 'proceeded' | 'modified' | 'cancelled' | 'escalated'
  ): Promise<void> {
    const key = `firewall:decision:${decisionId}`;
    const cached = await this.redis.get(key);
    if (cached) {
      const decision = JSON.parse(cached);
      decision.auditTrail.justificationProvided = justification;
      decision.auditTrail.reviewedBy = [reviewerId];
      decision.auditTrail.finalOutcome = outcome;
      await this.redis.set(key, JSON.stringify(decision));
    }
  }

  private async cacheDecision(decision: FirewallDecision): Promise<void> {
    await this.redis.set(
      `firewall:decision:${decision.decisionId}`,
      JSON.stringify(decision),
      'EX',
      decision.expiresAt
        ? Math.floor((decision.expiresAt.getTime() - Date.now()) / 1000)
        : 7 * 24 * 60 * 60
    );
  }

  private async getCachedDecision(decisionId: string): Promise<FirewallDecision | null> {
    const cached = await this.redis.get(`firewall:decision:${decisionId}`);
    return cached ? JSON.parse(cached) : null;
  }

  private async emitFirewallEvent(decision: FirewallDecision): Promise<void> {
    await this.redis.publish('firewall:events', JSON.stringify({
      type: 'decision',
      decision,
      timestamp: new Date().toISOString(),
    }));
  }

  private async getRecentAuditEntries(tenantId: string, days: number): Promise<AuditEntry[]> {
    // In production, this would query from the database
    // For now, return mock data structure
    return [];
  }

  private async detectBiasHotspots(tenantId: string, auditEntries: AuditEntry[]): Promise<BiasHotspot[]> {
    const hotspots: BiasHotspot[] = [];

    // Group by department
    const byDepartment = new Map<string, AuditEntry[]>();
    for (const entry of auditEntries) {
      const dept = entry.decisionContext.metadata.department || 'Unknown';
      const existing = byDepartment.get(dept) || [];
      existing.push(entry);
      byDepartment.set(dept, existing);
    }

    for (const [dept, entries] of byDepartment) {
      const avgRisk = entries.reduce((sum, e) => sum + e.firewallDecision.overallRiskScore, 0) / entries.length;
      if (avgRisk > 0.5) {
        // Find primary bias type
        const biasCounts = new Map<BiasCategory, number>();
        for (const entry of entries) {
          for (const signal of entry.firewallDecision.biasSignals) {
            biasCounts.set(signal.category, (biasCounts.get(signal.category) || 0) + 1);
          }
        }

        const primaryBias = Array.from(biasCounts.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'gender';

        hotspots.push({
          location: dept,
          locationType: 'department',
          primaryBiasType: primaryBias,
          severity: avgRisk,
          affectedEmployees: new Set(entries.map(e => e.decisionContext.subjectId)).size,
          trend: 'stable',
        });
      }
    }

    return hotspots.sort((a, b) => b.severity - a.severity).slice(0, 10);
  }

  private calculateQuarterScore(entries: AuditEntry[]): number {
    if (entries.length === 0) return 75;
    const avgRisk = entries.reduce((sum, e) => sum + e.firewallDecision.overallRiskScore, 0) / entries.length;
    return Math.round((1 - avgRisk) * 100);
  }

  private generateBiasRecommendations(
    categoryScores: Record<BiasCategory, number>,
    hotspots: BiasHotspot[]
  ): string[] {
    const recommendations: string[] = [];

    // Find lowest scoring categories
    const sortedCategories = Object.entries(categoryScores)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3);

    for (const [category, score] of sortedCategories) {
      if (score < 70) {
        recommendations.push(this.getCategoryRecommendation(category as BiasCategory, score));
      }
    }

    // Add hotspot-specific recommendations
    for (const hotspot of hotspots.slice(0, 2)) {
      recommendations.push(
        `Focus bias training in ${hotspot.location} department - ${hotspot.affectedEmployees} employees affected by ${hotspot.primaryBiasType} bias`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue current bias prevention practices - scores are within acceptable ranges');
    }

    return recommendations;
  }

  private getCategoryRecommendation(category: BiasCategory, score: number): string {
    const recommendations: Record<BiasCategory, string> = {
      gender: 'Implement structured interview protocols and blind resume screening to reduce gender bias',
      age: 'Review age-related language in evaluations and ensure skills-based assessments',
      tenure: 'Calibrate new employee ratings separately to account for learning curves',
      ethnicity: 'Conduct mandatory bias training and ensure diverse review panels',
      department: 'Standardize cross-departmental evaluation criteria',
      location: 'Implement output-based metrics for remote workers to ensure fair evaluation',
      education: 'Focus on demonstrated skills rather than educational credentials',
      personality: 'Use behavioral evidence and measurable outcomes in evaluations',
      similarity: 'Rotate reviewers and implement 360-degree feedback to reduce affinity bias',
      recency: 'Require documentation throughout the review period, not just recent events',
      halo: 'Train reviewers to evaluate dimensions independently with specific examples',
      horn: 'Ensure negative events are contextualized against overall performance',
      central_tendency: 'Implement forced ranking or provide clearer rating guidelines',
      leniency: 'Calibration sessions with peer comparison data',
      strictness: 'Review and align individual reviewer standards with organizational norms',
      contrast: 'Randomize review order and use absolute criteria rather than comparison',
      affinity: 'Require objective evidence for all favorable decisions',
    };
    return recommendations[category] || `Address ${category} bias through targeted training`;
  }

  private generateHash(data: any): string {
    // In production, use proper cryptographic hashing
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `hash_${Math.abs(hash).toString(16)}`;
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const biasFavoritismFirewall = new BiasFavoritismFirewall(
  new PrismaClient(),
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
);
