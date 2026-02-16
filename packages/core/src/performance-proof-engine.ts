/**
 * Performance Proof Engine
 * USP Feature 1: Evidence-Based Performance Scoring
 *
 * Every performance score MUST be backed by verifiable evidence.
 * This service:
 * - Links tasks, outputs, commits, documents to ratings
 * - Calculates evidence strength scores
 * - Validates that ratings are justified by actual work
 * - Provides audit trail for all performance claims
 * - Prevents subjective/political ratings
 */

export interface WorkArtifact {
  id: string;
  type: ArtifactType;
  source: ArtifactSource;
  title: string;
  description?: string;
  url?: string;
  externalId?: string; // ID in external system (Jira, GitHub, etc.)
  createdAt: Date;
  completedAt?: Date;
  metrics: ArtifactMetrics;
  metadata: Record<string, any>;
}

export type ArtifactType =
  | 'TASK'
  | 'TICKET'
  | 'PULL_REQUEST'
  | 'CODE_COMMIT'
  | 'DOCUMENT'
  | 'PRESENTATION'
  | 'DESIGN'
  | 'PROJECT_MILESTONE'
  | 'CUSTOMER_FEEDBACK'
  | 'INCIDENT_RESOLUTION'
  | 'MENTORSHIP_SESSION'
  | 'TRAINING_COMPLETION'
  | 'CERTIFICATION'
  | 'MEETING_FACILITATION'
  | 'PROCESS_IMPROVEMENT'
  | 'RECOGNITION_RECEIVED'
  | 'COLLABORATION_CONTRIBUTION'
  | 'KNOWLEDGE_SHARING';

export type ArtifactSource =
  | 'JIRA'
  | 'GITHUB'
  | 'GITLAB'
  | 'AZURE_DEVOPS'
  | 'CONFLUENCE'
  | 'NOTION'
  | 'GOOGLE_DOCS'
  | 'SLACK'
  | 'TEAMS'
  | 'SALESFORCE'
  | 'ZENDESK'
  | 'MANUAL'
  | 'API_IMPORT'
  | 'INTERNAL';

export interface ArtifactMetrics {
  complexity?: number; // 1-10
  impact?: number; // 1-10
  effort?: number; // hours or story points
  qualityScore?: number; // 0-100
  collaborators?: number;
  reviewers?: number;
  linesChanged?: number;
  testCoverage?: number;
  bugCount?: number;
  customerSatisfaction?: number;
}

export interface PerformanceEvidence {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  artifacts: WorkArtifact[];
  summary: EvidenceSummary;
  categories: CategoryEvidence[];
  gaps: EvidenceGap[];
  recommendations: string[];
}

export interface EvidenceSummary {
  totalArtifacts: number;
  byType: Record<ArtifactType, number>;
  bySource: Record<ArtifactSource, number>;
  averageComplexity: number;
  averageImpact: number;
  totalEffort: number;
  evidenceScore: number; // 0-100: how well-documented is this person's work
  consistencyScore: number; // 0-100: how consistent is output over time
  qualityScore: number; // 0-100: quality of deliverables
}

export interface CategoryEvidence {
  category: PerformanceCategory;
  artifacts: WorkArtifact[];
  score: number; // 0-100
  justification: string;
  suggestedRating: number; // 1-5
  confidence: number; // 0-100
}

export type PerformanceCategory =
  | 'TECHNICAL_DELIVERY'
  | 'COLLABORATION'
  | 'LEADERSHIP'
  | 'INNOVATION'
  | 'CUSTOMER_FOCUS'
  | 'PROCESS_IMPROVEMENT'
  | 'LEARNING_GROWTH'
  | 'COMMUNICATION';

export interface EvidenceGap {
  category: PerformanceCategory;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface RatingValidation {
  isValid: boolean;
  proposedRating: number;
  suggestedRating: number;
  evidenceScore: number;
  ratingJustified: boolean;
  gaps: string[];
  warnings: string[];
  supportingEvidence: WorkArtifact[];
  missingEvidence: string[];
}

export interface ProofReport {
  userId: string;
  userName: string;
  periodStart: Date;
  periodEnd: Date;
  overallScore: number;
  categories: Array<{
    name: string;
    score: number;
    rating: number;
    artifactCount: number;
    highlights: string[];
  }>;
  keyAchievements: string[];
  evidenceStrength: 'weak' | 'moderate' | 'strong' | 'exceptional';
  auditTrail: AuditEntry[];
  generatedAt: Date;
}

export interface AuditEntry {
  timestamp: Date;
  action: string;
  details: string;
  artifactIds: string[];
}

// Weights for different artifact types in performance scoring
const ARTIFACT_WEIGHTS: Record<ArtifactType, number> = {
  'TASK': 1.0,
  'TICKET': 1.0,
  'PULL_REQUEST': 1.5,
  'CODE_COMMIT': 0.5,
  'DOCUMENT': 1.2,
  'PRESENTATION': 1.3,
  'DESIGN': 1.4,
  'PROJECT_MILESTONE': 2.0,
  'CUSTOMER_FEEDBACK': 1.5,
  'INCIDENT_RESOLUTION': 1.8,
  'MENTORSHIP_SESSION': 1.3,
  'TRAINING_COMPLETION': 1.0,
  'CERTIFICATION': 1.5,
  'MEETING_FACILITATION': 0.8,
  'PROCESS_IMPROVEMENT': 1.6,
  'RECOGNITION_RECEIVED': 1.2,
  'COLLABORATION_CONTRIBUTION': 1.0,
  'KNOWLEDGE_SHARING': 1.1,
};

// Mapping of artifact types to performance categories
const CATEGORY_MAPPINGS: Record<ArtifactType, PerformanceCategory[]> = {
  'TASK': ['TECHNICAL_DELIVERY'],
  'TICKET': ['TECHNICAL_DELIVERY', 'CUSTOMER_FOCUS'],
  'PULL_REQUEST': ['TECHNICAL_DELIVERY', 'COLLABORATION'],
  'CODE_COMMIT': ['TECHNICAL_DELIVERY'],
  'DOCUMENT': ['COMMUNICATION', 'LEARNING_GROWTH'],
  'PRESENTATION': ['COMMUNICATION', 'LEADERSHIP'],
  'DESIGN': ['INNOVATION', 'TECHNICAL_DELIVERY'],
  'PROJECT_MILESTONE': ['TECHNICAL_DELIVERY', 'LEADERSHIP'],
  'CUSTOMER_FEEDBACK': ['CUSTOMER_FOCUS'],
  'INCIDENT_RESOLUTION': ['TECHNICAL_DELIVERY', 'CUSTOMER_FOCUS'],
  'MENTORSHIP_SESSION': ['LEADERSHIP', 'COLLABORATION'],
  'TRAINING_COMPLETION': ['LEARNING_GROWTH'],
  'CERTIFICATION': ['LEARNING_GROWTH', 'TECHNICAL_DELIVERY'],
  'MEETING_FACILITATION': ['LEADERSHIP', 'COMMUNICATION'],
  'PROCESS_IMPROVEMENT': ['PROCESS_IMPROVEMENT', 'INNOVATION'],
  'RECOGNITION_RECEIVED': ['COLLABORATION', 'LEADERSHIP'],
  'COLLABORATION_CONTRIBUTION': ['COLLABORATION'],
  'KNOWLEDGE_SHARING': ['LEARNING_GROWTH', 'COMMUNICATION'],
};

export class PerformanceProofEngine {
  /**
   * Collects and analyzes all evidence for a user's performance
   */
  collectEvidence(
    userId: string,
    artifacts: WorkArtifact[],
    periodStart: Date,
    periodEnd: Date
  ): PerformanceEvidence {
    // Filter artifacts to the review period
    const periodArtifacts = artifacts.filter(a =>
      a.createdAt >= periodStart && a.createdAt <= periodEnd
    );

    // Calculate summary statistics
    const summary = this.calculateSummary(periodArtifacts);

    // Analyze by category
    const categories = this.analyzeCategories(periodArtifacts);

    // Identify gaps
    const gaps = this.identifyGaps(categories, periodArtifacts);

    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, categories, gaps);

    return {
      userId,
      periodStart,
      periodEnd,
      artifacts: periodArtifacts,
      summary,
      categories,
      gaps,
      recommendations,
    };
  }

  /**
   * Validates if a proposed rating is justified by evidence
   */
  validateRating(
    proposedRating: number,
    category: PerformanceCategory,
    evidence: PerformanceEvidence
  ): RatingValidation {
    const categoryEvidence = evidence.categories.find(c => c.category === category);

    if (!categoryEvidence) {
      return {
        isValid: false,
        proposedRating,
        suggestedRating: 3.0, // Default to meets expectations
        evidenceScore: 0,
        ratingJustified: false,
        gaps: [`No evidence found for category: ${category}`],
        warnings: ['Rating cannot be validated without supporting evidence'],
        supportingEvidence: [],
        missingEvidence: [
          'Add work artifacts that demonstrate performance in this category',
          'Link relevant tasks, documents, or projects',
        ],
      };
    }

    const suggestedRating = categoryEvidence.suggestedRating;
    const ratingDiff = Math.abs(proposedRating - suggestedRating);
    const isWithinRange = ratingDiff <= 0.5;

    const gaps: string[] = [];
    const warnings: string[] = [];

    if (!isWithinRange) {
      if (proposedRating > suggestedRating) {
        warnings.push(
          `Proposed rating (${proposedRating}) is ${ratingDiff.toFixed(1)} points higher than evidence suggests (${suggestedRating.toFixed(1)})`
        );
        gaps.push('Additional evidence needed to support higher rating');
      } else {
        warnings.push(
          `Proposed rating (${proposedRating}) is ${ratingDiff.toFixed(1)} points lower than evidence suggests (${suggestedRating.toFixed(1)})`
        );
      }
    }

    // Check evidence strength
    if (categoryEvidence.confidence < 50) {
      warnings.push('Low confidence in rating suggestion due to limited evidence');
    }

    if (categoryEvidence.artifacts.length < 3) {
      gaps.push('Fewer than 3 supporting artifacts - consider adding more evidence');
    }

    // Determine missing evidence types
    const missingEvidence: string[] = [];
    const presentTypes = new Set(categoryEvidence.artifacts.map(a => a.type));

    const recommendedTypes = this.getRecommendedTypes(category);
    for (const type of recommendedTypes) {
      if (!presentTypes.has(type)) {
        missingEvidence.push(`Add ${type.toLowerCase().replace('_', ' ')} evidence`);
      }
    }

    return {
      isValid: isWithinRange && categoryEvidence.confidence >= 50,
      proposedRating,
      suggestedRating,
      evidenceScore: categoryEvidence.score,
      ratingJustified: isWithinRange,
      gaps,
      warnings,
      supportingEvidence: categoryEvidence.artifacts,
      missingEvidence,
    };
  }

  /**
   * Generates a comprehensive proof report for auditing
   */
  generateProofReport(
    userId: string,
    userName: string,
    evidence: PerformanceEvidence
  ): ProofReport {
    const categories = evidence.categories.map(c => ({
      name: c.category.replace('_', ' '),
      score: c.score,
      rating: c.suggestedRating,
      artifactCount: c.artifacts.length,
      highlights: this.extractHighlights(c.artifacts),
    }));

    const overallScore = categories.length > 0
      ? categories.reduce((sum, c) => sum + c.score, 0) / categories.length
      : 0;

    const keyAchievements = this.identifyKeyAchievements(evidence.artifacts);

    let evidenceStrength: ProofReport['evidenceStrength'] = 'weak';
    if (evidence.summary.evidenceScore >= 80) evidenceStrength = 'exceptional';
    else if (evidence.summary.evidenceScore >= 60) evidenceStrength = 'strong';
    else if (evidence.summary.evidenceScore >= 40) evidenceStrength = 'moderate';

    const auditTrail = this.buildAuditTrail(evidence.artifacts);

    return {
      userId,
      userName,
      periodStart: evidence.periodStart,
      periodEnd: evidence.periodEnd,
      overallScore: Math.round(overallScore),
      categories,
      keyAchievements,
      evidenceStrength,
      auditTrail,
      generatedAt: new Date(),
    };
  }

  /**
   * Links an artifact to a performance claim with validation
   */
  linkArtifactToRating(
    artifact: WorkArtifact,
    category: PerformanceCategory,
    claimedImpact: string
  ): {
    isValid: boolean;
    relevanceScore: number;
    impactScore: number;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check if artifact type matches category
    const validCategories = CATEGORY_MAPPINGS[artifact.type] || [];
    const isRelevant = validCategories.includes(category);

    if (!isRelevant) {
      warnings.push(`${artifact.type} is not typically associated with ${category}`);
    }

    // Calculate relevance score
    const relevanceScore = isRelevant ? 100 : 30;

    // Calculate impact score based on metrics
    let impactScore = 50; // Base score

    if (artifact.metrics.impact) {
      impactScore = artifact.metrics.impact * 10;
    } else if (artifact.metrics.complexity && artifact.metrics.effort) {
      impactScore = (artifact.metrics.complexity * 5 + (artifact.metrics.effort > 8 ? 50 : artifact.metrics.effort * 6));
    }

    // Validate claimed impact
    if (artifact.metrics.impact && artifact.metrics.impact < 5 && claimedImpact.toLowerCase().includes('high impact')) {
      warnings.push('Claimed "high impact" but metrics suggest moderate impact');
    }

    return {
      isValid: isRelevant && warnings.length === 0,
      relevanceScore,
      impactScore: Math.min(100, Math.round(impactScore)),
      warnings,
    };
  }

  /**
   * Detects potential evidence manipulation or inflation
   */
  detectEvidenceAnomaly(
    currentEvidence: PerformanceEvidence,
    historicalEvidence: PerformanceEvidence[]
  ): {
    hasAnomalies: boolean;
    anomalies: Array<{
      type: 'volume_spike' | 'quality_drop' | 'source_concentration' | 'timing_cluster' | 'metric_inflation';
      description: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  } {
    const anomalies: Array<{
      type: 'volume_spike' | 'quality_drop' | 'source_concentration' | 'timing_cluster' | 'metric_inflation';
      description: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    if (historicalEvidence.length === 0) {
      return { hasAnomalies: false, anomalies: [] };
    }

    // Calculate historical averages
    const historicalAvgArtifacts = historicalEvidence.reduce(
      (sum, e) => sum + e.artifacts.length, 0
    ) / historicalEvidence.length;

    // Check for volume spike
    if (currentEvidence.artifacts.length > historicalAvgArtifacts * 2) {
      anomalies.push({
        type: 'volume_spike',
        description: `Current period has ${currentEvidence.artifacts.length} artifacts vs historical average of ${Math.round(historicalAvgArtifacts)}`,
        severity: currentEvidence.artifacts.length > historicalAvgArtifacts * 3 ? 'high' : 'medium',
      });
    }

    // Check for source concentration (too many from one source)
    const sourceDistribution = currentEvidence.summary.bySource;
    const totalArtifacts = currentEvidence.artifacts.length;

    for (const [source, count] of Object.entries(sourceDistribution)) {
      const concentration = (count as number) / totalArtifacts;
      if (concentration > 0.8 && totalArtifacts > 5) {
        anomalies.push({
          type: 'source_concentration',
          description: `${Math.round(concentration * 100)}% of evidence comes from ${source}`,
          severity: concentration > 0.9 ? 'high' : 'medium',
        });
      }
    }

    // Check for timing cluster (many items created near review deadline)
    const now = new Date();
    const recentItems = currentEvidence.artifacts.filter(a => {
      const daysDiff = (now.getTime() - a.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 14;
    });

    if (recentItems.length > currentEvidence.artifacts.length * 0.6) {
      anomalies.push({
        type: 'timing_cluster',
        description: `${Math.round((recentItems.length / currentEvidence.artifacts.length) * 100)}% of evidence was added in the last 2 weeks`,
        severity: 'medium',
      });
    }

    // Check for metric inflation
    const historicalAvgImpact = historicalEvidence.reduce(
      (sum, e) => sum + e.summary.averageImpact, 0
    ) / historicalEvidence.length;

    if (currentEvidence.summary.averageImpact > historicalAvgImpact * 1.5) {
      anomalies.push({
        type: 'metric_inflation',
        description: `Average impact score (${currentEvidence.summary.averageImpact.toFixed(1)}) is 50% higher than historical average (${historicalAvgImpact.toFixed(1)})`,
        severity: 'medium',
      });
    }

    return {
      hasAnomalies: anomalies.length > 0,
      anomalies,
    };
  }

  /**
   * Calculates the evidence-backed maximum rating
   * This prevents ratings that exceed what evidence supports
   */
  calculateMaxSupportedRating(evidence: PerformanceEvidence): {
    maxRating: number;
    rationale: string;
    requirements: Array<{ rating: number; currentMet: boolean; requirements: string[] }>;
  } {
    const score = evidence.summary.evidenceScore;
    const quality = evidence.summary.qualityScore;
    const consistency = evidence.summary.consistencyScore;

    // Combined score determines max rating
    const combinedScore = (score * 0.4 + quality * 0.35 + consistency * 0.25);

    let maxRating: number;
    let rationale: string;

    if (combinedScore >= 90) {
      maxRating = 5.0;
      rationale = 'Exceptional evidence across all dimensions';
    } else if (combinedScore >= 75) {
      maxRating = 4.5;
      rationale = 'Strong evidence with high quality and consistency';
    } else if (combinedScore >= 60) {
      maxRating = 4.0;
      rationale = 'Good evidence supporting above-average performance';
    } else if (combinedScore >= 45) {
      maxRating = 3.5;
      rationale = 'Moderate evidence supporting solid performance';
    } else if (combinedScore >= 30) {
      maxRating = 3.0;
      rationale = 'Limited evidence - meets basic expectations';
    } else {
      maxRating = 2.5;
      rationale = 'Insufficient evidence to support higher rating';
    }

    const requirements = [
      {
        rating: 5.0,
        currentMet: combinedScore >= 90,
        requirements: [
          'Evidence score >= 90%',
          'Quality score >= 85%',
          'Consistency score >= 80%',
          'Artifacts in 6+ categories',
        ],
      },
      {
        rating: 4.0,
        currentMet: combinedScore >= 60,
        requirements: [
          'Evidence score >= 60%',
          'Quality score >= 60%',
          'Consistency score >= 55%',
          'Artifacts in 4+ categories',
        ],
      },
      {
        rating: 3.0,
        currentMet: combinedScore >= 30,
        requirements: [
          'Evidence score >= 30%',
          'At least 5 documented artifacts',
          'Coverage of primary job responsibilities',
        ],
      },
    ];

    return { maxRating, rationale, requirements };
  }

  // Private helper methods

  private calculateSummary(artifacts: WorkArtifact[]): EvidenceSummary {
    const byType = this.countByKey(artifacts, 'type') as Record<ArtifactType, number>;
    const bySource = this.countByKey(artifacts, 'source') as Record<ArtifactSource, number>;

    const complexities = artifacts.filter(a => a.metrics.complexity).map(a => a.metrics.complexity!);
    const impacts = artifacts.filter(a => a.metrics.impact).map(a => a.metrics.impact!);
    const efforts = artifacts.filter(a => a.metrics.effort).map(a => a.metrics.effort!);
    const qualities = artifacts.filter(a => a.metrics.qualityScore).map(a => a.metrics.qualityScore!);

    const averageComplexity = complexities.length > 0
      ? complexities.reduce((a, b) => a + b, 0) / complexities.length
      : 5;

    const averageImpact = impacts.length > 0
      ? impacts.reduce((a, b) => a + b, 0) / impacts.length
      : 5;

    const totalEffort = efforts.reduce((a, b) => a + b, 0);

    // Evidence score based on quantity, diversity, and completeness
    const typeCount = Object.keys(byType).length;
    const sourceCount = Object.keys(bySource).length;
    const artifactCount = artifacts.length;

    let evidenceScore = Math.min(100,
      (artifactCount * 3) +
      (typeCount * 8) +
      (sourceCount * 6) +
      (averageImpact * 5)
    );

    // Consistency score based on artifact distribution over time
    const consistencyScore = this.calculateConsistency(artifacts);

    // Quality score based on artifact metrics
    const qualityScore = qualities.length > 0
      ? qualities.reduce((a, b) => a + b, 0) / qualities.length
      : 60;

    return {
      totalArtifacts: artifactCount,
      byType,
      bySource,
      averageComplexity: Math.round(averageComplexity * 10) / 10,
      averageImpact: Math.round(averageImpact * 10) / 10,
      totalEffort: Math.round(totalEffort),
      evidenceScore: Math.round(evidenceScore),
      consistencyScore: Math.round(consistencyScore),
      qualityScore: Math.round(qualityScore),
    };
  }

  private analyzeCategories(artifacts: WorkArtifact[]): CategoryEvidence[] {
    const categoryMap = new Map<PerformanceCategory, WorkArtifact[]>();

    // Group artifacts by category
    for (const artifact of artifacts) {
      const categories = CATEGORY_MAPPINGS[artifact.type] || [];
      for (const category of categories) {
        const existing = categoryMap.get(category) || [];
        existing.push(artifact);
        categoryMap.set(category, existing);
      }
    }

    const results: CategoryEvidence[] = [];

    for (const [category, categoryArtifacts] of categoryMap) {
      // Calculate weighted score for category
      let totalWeight = 0;
      let weightedScore = 0;

      for (const artifact of categoryArtifacts) {
        const weight = ARTIFACT_WEIGHTS[artifact.type] || 1;
        const artifactScore = this.calculateArtifactScore(artifact);
        totalWeight += weight;
        weightedScore += weight * artifactScore;
      }

      const score = totalWeight > 0 ? weightedScore / totalWeight : 0;
      const suggestedRating = this.scoreToRating(score);
      const confidence = this.calculateConfidence(categoryArtifacts);

      results.push({
        category,
        artifacts: categoryArtifacts,
        score: Math.round(score),
        justification: this.generateJustification(category, categoryArtifacts, score),
        suggestedRating,
        confidence,
      });
    }

    return results;
  }

  private identifyGaps(
    categories: CategoryEvidence[],
    artifacts: WorkArtifact[]
  ): EvidenceGap[] {
    const gaps: EvidenceGap[] = [];
    const presentCategories = new Set(categories.map(c => c.category));

    // Check for missing critical categories
    const criticalCategories: PerformanceCategory[] = [
      'TECHNICAL_DELIVERY',
      'COLLABORATION',
      'COMMUNICATION',
    ];

    for (const critical of criticalCategories) {
      if (!presentCategories.has(critical)) {
        gaps.push({
          category: critical,
          description: `No evidence for ${critical.replace('_', ' ').toLowerCase()}`,
          severity: 'high',
          suggestion: `Add artifacts demonstrating ${critical.toLowerCase().replace('_', ' ')} skills`,
        });
      }
    }

    // Check for low-evidence categories
    for (const category of categories) {
      if (category.artifacts.length < 3) {
        gaps.push({
          category: category.category,
          description: `Limited evidence (${category.artifacts.length} artifacts) for ${category.category.replace('_', ' ')}`,
          severity: 'medium',
          suggestion: `Add more artifacts to strengthen ${category.category.toLowerCase().replace('_', ' ')} evidence`,
        });
      }
    }

    // Check for low confidence scores
    for (const category of categories) {
      if (category.confidence < 50) {
        gaps.push({
          category: category.category,
          description: `Low confidence score (${category.confidence}%) for ${category.category.replace('_', ' ')}`,
          severity: 'medium',
          suggestion: 'Add artifacts with clear metrics and outcomes',
        });
      }
    }

    return gaps;
  }

  private generateRecommendations(
    summary: EvidenceSummary,
    categories: CategoryEvidence[],
    gaps: EvidenceGap[]
  ): string[] {
    const recommendations: string[] = [];

    if (summary.evidenceScore < 50) {
      recommendations.push(
        'Increase evidence documentation: Link more work artifacts to build a stronger performance record'
      );
    }

    if (summary.consistencyScore < 50) {
      recommendations.push(
        'Improve consistency: Document work regularly throughout the review period, not just at the end'
      );
    }

    if (Object.keys(summary.bySource).length < 2) {
      recommendations.push(
        'Diversify evidence sources: Include artifacts from multiple systems (e.g., code repos, documents, customer feedback)'
      );
    }

    const highGaps = gaps.filter(g => g.severity === 'high');
    if (highGaps.length > 0) {
      recommendations.push(
        `Address critical gaps: ${highGaps.map(g => g.category.replace('_', ' ')).join(', ')}`
      );
    }

    const lowConfidenceCategories = categories.filter(c => c.confidence < 50);
    if (lowConfidenceCategories.length > 0) {
      recommendations.push(
        'Strengthen evidence quality: Add artifacts with measurable outcomes and clear impact metrics'
      );
    }

    return recommendations;
  }

  private calculateArtifactScore(artifact: WorkArtifact): number {
    let score = 50; // Base score

    if (artifact.metrics.impact) {
      score += (artifact.metrics.impact - 5) * 5; // -25 to +25
    }
    if (artifact.metrics.complexity) {
      score += (artifact.metrics.complexity - 5) * 3; // -15 to +15
    }
    if (artifact.metrics.qualityScore) {
      score += (artifact.metrics.qualityScore - 50) * 0.3; // -15 to +15
    }
    if (artifact.completedAt) {
      score += 5; // Bonus for completed items
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateConsistency(artifacts: WorkArtifact[]): number {
    if (artifacts.length < 4) return 50;

    // Sort by creation date
    const sorted = [...artifacts].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Calculate gaps between artifacts
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const daysDiff = (sorted[i].createdAt.getTime() - sorted[i-1].createdAt.getTime()) / (1000 * 60 * 60 * 24);
      gaps.push(daysDiff);
    }

    if (gaps.length === 0) return 50;

    // Calculate variance of gaps
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((sum, g) => sum + Math.pow(g - avgGap, 2), 0) / gaps.length;
    const stdDev = Math.sqrt(variance);

    // Lower variance = higher consistency
    // If stdDev is small compared to avgGap, consistency is high
    const coefficientOfVariation = avgGap > 0 ? stdDev / avgGap : 1;

    return Math.max(0, Math.min(100, 100 - coefficientOfVariation * 50));
  }

  private calculateConfidence(artifacts: WorkArtifact[]): number {
    if (artifacts.length === 0) return 0;
    if (artifacts.length < 3) return 30;

    // Confidence based on:
    // 1. Number of artifacts
    // 2. Completeness of metrics
    // 3. Diversity of artifact types

    const quantityScore = Math.min(30, artifacts.length * 3);

    const metricsCompleteness = artifacts.reduce((sum, a) => {
      let complete = 0;
      if (a.metrics.impact) complete++;
      if (a.metrics.complexity) complete++;
      if (a.metrics.effort) complete++;
      if (a.metrics.qualityScore) complete++;
      return sum + (complete / 4);
    }, 0) / artifacts.length;
    const metricsScore = metricsCompleteness * 40;

    const types = new Set(artifacts.map(a => a.type));
    const diversityScore = Math.min(30, types.size * 6);

    return Math.round(quantityScore + metricsScore + diversityScore);
  }

  private scoreToRating(score: number): number {
    if (score >= 90) return 5.0;
    if (score >= 80) return 4.5;
    if (score >= 70) return 4.0;
    if (score >= 60) return 3.5;
    if (score >= 50) return 3.0;
    if (score >= 40) return 2.5;
    if (score >= 30) return 2.0;
    return 1.5;
  }

  private generateJustification(
    category: PerformanceCategory,
    artifacts: WorkArtifact[],
    score: number
  ): string {
    const count = artifacts.length;
    const avgImpact = artifacts
      .filter(a => a.metrics.impact)
      .reduce((sum, a) => sum + a.metrics.impact!, 0) / (count || 1);

    const categoryName = category.toLowerCase().replace('_', ' ');

    if (score >= 80) {
      return `Exceptional ${categoryName}: ${count} high-quality artifacts with average impact ${avgImpact.toFixed(1)}/10`;
    } else if (score >= 60) {
      return `Strong ${categoryName}: ${count} artifacts demonstrating consistent performance`;
    } else if (score >= 40) {
      return `Solid ${categoryName}: ${count} artifacts showing expected competency`;
    } else {
      return `Limited ${categoryName} evidence: ${count} artifacts - consider documenting more work`;
    }
  }

  private extractHighlights(artifacts: WorkArtifact[]): string[] {
    // Sort by impact and take top 3
    const sorted = [...artifacts]
      .filter(a => a.metrics.impact && a.metrics.impact >= 7)
      .sort((a, b) => (b.metrics.impact || 0) - (a.metrics.impact || 0))
      .slice(0, 3);

    return sorted.map(a => a.title);
  }

  private identifyKeyAchievements(artifacts: WorkArtifact[]): string[] {
    return artifacts
      .filter(a =>
        a.type === 'PROJECT_MILESTONE' ||
        (a.metrics.impact && a.metrics.impact >= 8) ||
        a.type === 'CERTIFICATION'
      )
      .slice(0, 5)
      .map(a => a.title);
  }

  private buildAuditTrail(artifacts: WorkArtifact[]): AuditEntry[] {
    const trail: AuditEntry[] = [];

    // Group by month
    const byMonth = new Map<string, WorkArtifact[]>();
    for (const artifact of artifacts) {
      const monthKey = artifact.createdAt.toISOString().slice(0, 7);
      const existing = byMonth.get(monthKey) || [];
      existing.push(artifact);
      byMonth.set(monthKey, existing);
    }

    for (const [month, monthArtifacts] of byMonth) {
      trail.push({
        timestamp: new Date(month + '-01'),
        action: 'ARTIFACTS_RECORDED',
        details: `${monthArtifacts.length} work artifacts documented`,
        artifactIds: monthArtifacts.map(a => a.id),
      });
    }

    trail.push({
      timestamp: new Date(),
      action: 'PROOF_REPORT_GENERATED',
      details: 'Performance proof report generated for review period',
      artifactIds: [],
    });

    return trail.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private getRecommendedTypes(category: PerformanceCategory): ArtifactType[] {
    const recommendations: Record<PerformanceCategory, ArtifactType[]> = {
      'TECHNICAL_DELIVERY': ['PULL_REQUEST', 'TASK', 'TICKET', 'PROJECT_MILESTONE'],
      'COLLABORATION': ['COLLABORATION_CONTRIBUTION', 'PULL_REQUEST', 'MENTORSHIP_SESSION'],
      'LEADERSHIP': ['MENTORSHIP_SESSION', 'PROJECT_MILESTONE', 'PRESENTATION'],
      'INNOVATION': ['DESIGN', 'PROCESS_IMPROVEMENT', 'DOCUMENT'],
      'CUSTOMER_FOCUS': ['CUSTOMER_FEEDBACK', 'INCIDENT_RESOLUTION', 'TICKET'],
      'PROCESS_IMPROVEMENT': ['PROCESS_IMPROVEMENT', 'DOCUMENT'],
      'LEARNING_GROWTH': ['TRAINING_COMPLETION', 'CERTIFICATION', 'KNOWLEDGE_SHARING'],
      'COMMUNICATION': ['DOCUMENT', 'PRESENTATION', 'KNOWLEDGE_SHARING'],
    };

    return recommendations[category] || [];
  }

  private countByKey<T>(items: T[], key: keyof T): Record<string, number> {
    return items.reduce((acc, item) => {
      const k = String(item[key]);
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

export const performanceProofEngine = new PerformanceProofEngine();
