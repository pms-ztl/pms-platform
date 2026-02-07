/**
 * Trust Score System
 * USP Feature 2: Measures reliability of feedback, ratings, and reviewers
 *
 * This service:
 * - Calculates trust scores for reviewers based on historical patterns
 * - Detects political manipulation, favoritism, and rating inflation
 * - Weights feedback and ratings by source credibility
 * - Provides transparency into rating reliability
 * - Prevents gaming of the performance system
 */

export interface ReviewerTrustProfile {
  reviewerId: string;
  reviewerName: string;
  overallTrustScore: number; // 0-100
  components: TrustComponents;
  flags: TrustFlag[];
  reliabilityTier: 'EXCEPTIONAL' | 'TRUSTED' | 'STANDARD' | 'MONITORED' | 'RESTRICTED';
  historicalData: HistoricalMetrics;
  recommendations: string[];
  lastUpdated: Date;
}

export interface TrustComponents {
  consistency: number; // How consistent are ratings across reviewees
  accuracy: number; // How well do ratings predict actual performance
  differentiation: number; // Does reviewer differentiate between performers
  timeliness: number; // Reviews submitted on time
  evidenceQuality: number; // Quality of justification provided
  biasScore: number; // Inverted bias detection score (higher = less biased)
  calibrationAlignment: number; // How often ratings align with calibration
  feedbackActionability: number; // Is feedback specific and actionable
}

export interface TrustFlag {
  type: TrustFlagType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  evidence: string[];
  status: 'active' | 'resolved' | 'investigating';
}

export type TrustFlagType =
  | 'RATING_INFLATION'
  | 'RATING_DEFLATION'
  | 'FAVORITISM_PATTERN'
  | 'RECIPROCITY_BIAS'
  | 'HALO_EFFECT'
  | 'CENTRAL_TENDENCY'
  | 'LENIENCY_BIAS'
  | 'STRICTNESS_BIAS'
  | 'RECENCY_BIAS'
  | 'SIMILARITY_BIAS'
  | 'REVENGE_RATING'
  | 'RETALIATION_PATTERN'
  | 'TIMING_MANIPULATION'
  | 'EVIDENCE_MISMATCH'
  | 'INCONSISTENT_NARRATIVE';

export interface HistoricalMetrics {
  totalReviewsGiven: number;
  reviewPeriods: number;
  averageRating: number;
  ratingStandardDeviation: number;
  calibrationAdjustments: number;
  adjustmentDirection: 'up' | 'down' | 'mixed' | 'none';
  averageAdjustmentSize: number;
  onTimeSubmissionRate: number;
  feedbackResponseRate: number; // How often reviewees respond positively to feedback
}

export interface FeedbackCredibility {
  feedbackId: string;
  credibilityScore: number; // 0-100
  sourceReliability: number;
  contentQuality: number;
  contextMatch: number;
  weight: number; // Applied weight in aggregations
  flags: string[];
}

export interface RatingReliability {
  reviewId: string;
  reliabilityScore: number; // 0-100
  reviewerTrustScore: number;
  evidenceAlignment: number;
  peerComparison: number;
  calibrationPrediction: number; // Predicted calibration adjustment
  confidenceInterval: { lower: number; upper: number };
  adjustmentRecommendation: number | null;
  flags: string[];
}

export interface RelationshipAnalysis {
  reviewer1Id: string;
  reviewer2Id: string;
  relationshipType: 'PEER' | 'MANAGER' | 'CROSS_FUNCTIONAL' | 'UNKNOWN';
  mutualRatingHistory: MutualRating[];
  reciprocityScore: number; // 0-100, high = suspicious
  biasIndicators: string[];
}

export interface MutualRating {
  period: string;
  rating1to2: number;
  rating2to1: number;
  difference: number;
}

export interface TeamTrustMetrics {
  teamId: string;
  teamName: string;
  averageTrustScore: number;
  trustDistribution: { tier: string; count: number }[];
  systemIntegrity: number; // Overall system health
  riskAreas: string[];
  recommendations: string[];
}

export interface ManipulationDetection {
  detected: boolean;
  patterns: ManipulationPattern[];
  overallRiskScore: number; // 0-100
  affectedReviews: string[];
  recommendedActions: string[];
}

export interface ManipulationPattern {
  type: string;
  confidence: number;
  description: string;
  involvedParties: string[];
  evidencePoints: string[];
}

// Configuration for trust scoring
const TRUST_WEIGHTS = {
  consistency: 0.15,
  accuracy: 0.20,
  differentiation: 0.15,
  timeliness: 0.10,
  evidenceQuality: 0.15,
  biasScore: 0.10,
  calibrationAlignment: 0.10,
  feedbackActionability: 0.05,
};

const RELIABILITY_THRESHOLDS = {
  EXCEPTIONAL: 85,
  TRUSTED: 70,
  STANDARD: 50,
  MONITORED: 35,
  RESTRICTED: 0,
};

export class TrustScoreSystem {
  /**
   * Calculates comprehensive trust profile for a reviewer
   */
  calculateReviewerTrustProfile(
    reviewerId: string,
    reviewerName: string,
    reviews: ReviewData[],
    calibrationData: CalibrationData[],
    feedbackHistory: FeedbackData[]
  ): ReviewerTrustProfile {
    // Filter to this reviewer's reviews
    const reviewerReviews = reviews.filter(r => r.reviewerId === reviewerId);

    if (reviewerReviews.length === 0) {
      return this.createDefaultProfile(reviewerId, reviewerName);
    }

    // Calculate each trust component
    const components = this.calculateTrustComponents(
      reviewerReviews,
      reviews,
      calibrationData,
      feedbackHistory
    );

    // Calculate overall trust score
    const overallTrustScore = this.calculateOverallScore(components);

    // Detect trust flags
    const flags = this.detectTrustFlags(
      reviewerId,
      reviewerReviews,
      reviews,
      calibrationData
    );

    // Determine reliability tier
    const reliabilityTier = this.determineReliabilityTier(overallTrustScore, flags);

    // Calculate historical metrics
    const historicalData = this.calculateHistoricalMetrics(
      reviewerReviews,
      calibrationData
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      components,
      flags,
      historicalData
    );

    return {
      reviewerId,
      reviewerName,
      overallTrustScore,
      components,
      flags,
      reliabilityTier,
      historicalData,
      recommendations,
      lastUpdated: new Date(),
    };
  }

  /**
   * Assesses the credibility of a specific feedback item
   */
  assessFeedbackCredibility(
    feedback: FeedbackData,
    giverProfile: ReviewerTrustProfile,
    recipientHistory: ReviewData[]
  ): FeedbackCredibility {
    const flags: string[] = [];

    // Source reliability based on giver's trust score
    const sourceReliability = giverProfile.overallTrustScore;

    // Content quality analysis
    const contentQuality = this.analyzeContentQuality(feedback.content);

    if (contentQuality < 30) {
      flags.push('Low content quality - vague or non-specific feedback');
    }

    // Context match - does feedback align with known performance patterns
    const contextMatch = this.analyzeContextMatch(feedback, recipientHistory);

    if (contextMatch < 40) {
      flags.push('Feedback context may not align with historical performance');
    }

    // Calculate overall credibility
    const credibilityScore = Math.round(
      sourceReliability * 0.4 +
      contentQuality * 0.35 +
      contextMatch * 0.25
    );

    // Calculate applied weight
    const weight = this.calculateFeedbackWeight(
      credibilityScore,
      giverProfile.reliabilityTier
    );

    // Check for anomalies
    if (giverProfile.reliabilityTier === 'RESTRICTED') {
      flags.push('Source reviewer has restricted reliability status');
    }

    return {
      feedbackId: feedback.id,
      credibilityScore,
      sourceReliability,
      contentQuality,
      contextMatch,
      weight,
      flags,
    };
  }

  /**
   * Assesses reliability of a rating
   */
  assessRatingReliability(
    review: ReviewData,
    reviewerProfile: ReviewerTrustProfile,
    peerReviews: ReviewData[],
    evidenceScore: number
  ): RatingReliability {
    const flags: string[] = [];

    // Base reliability on reviewer trust
    const reviewerTrustScore = reviewerProfile.overallTrustScore;

    // Check evidence alignment
    const evidenceAlignment = this.calculateEvidenceAlignment(
      review.rating,
      evidenceScore
    );

    if (evidenceAlignment < 50) {
      flags.push('Rating may not align with documented evidence');
    }

    // Compare with peer reviews for same reviewee
    const peerComparison = this.calculatePeerComparison(
      review,
      peerReviews
    );

    if (peerComparison < 40) {
      flags.push('Rating significantly differs from peer assessments');
    }

    // Predict calibration adjustment
    const calibrationPrediction = this.predictCalibrationAdjustment(
      review,
      reviewerProfile,
      peerReviews
    );

    // Calculate confidence interval
    const reliability = (
      reviewerTrustScore * 0.35 +
      evidenceAlignment * 0.30 +
      peerComparison * 0.35
    );

    const confidenceInterval = this.calculateConfidenceInterval(
      review.rating,
      reliability
    );

    // Calculate adjustment recommendation
    let adjustmentRecommendation: number | null = null;
    if (Math.abs(calibrationPrediction) > 0.3) {
      adjustmentRecommendation = review.rating + calibrationPrediction;
      flags.push(`Calibration adjustment of ${calibrationPrediction > 0 ? '+' : ''}${calibrationPrediction.toFixed(1)} predicted`);
    }

    return {
      reviewId: review.id,
      reliabilityScore: Math.round(reliability),
      reviewerTrustScore,
      evidenceAlignment,
      peerComparison,
      calibrationPrediction,
      confidenceInterval,
      adjustmentRecommendation,
      flags,
    };
  }

  /**
   * Analyzes relationship dynamics for reciprocity bias
   */
  analyzeRelationshipDynamics(
    person1Id: string,
    person2Id: string,
    allReviews: ReviewData[]
  ): RelationshipAnalysis {
    // Find mutual reviews
    const reviews1to2 = allReviews.filter(
      r => r.reviewerId === person1Id && r.revieweeId === person2Id
    );
    const reviews2to1 = allReviews.filter(
      r => r.reviewerId === person2Id && r.revieweeId === person1Id
    );

    const mutualRatingHistory: MutualRating[] = [];
    const biasIndicators: string[] = [];

    // Match by review period
    const periods = new Set([
      ...reviews1to2.map(r => r.cycleId),
      ...reviews2to1.map(r => r.cycleId),
    ]);

    for (const period of periods) {
      const r1 = reviews1to2.find(r => r.cycleId === period);
      const r2 = reviews2to1.find(r => r.cycleId === period);

      if (r1 && r2) {
        mutualRatingHistory.push({
          period,
          rating1to2: r1.rating,
          rating2to1: r2.rating,
          difference: Math.abs(r1.rating - r2.rating),
        });
      }
    }

    // Calculate reciprocity score
    // High score = suspicious (ratings are too similar)
    let reciprocityScore = 0;

    if (mutualRatingHistory.length >= 2) {
      const avgDifference = mutualRatingHistory.reduce(
        (sum, m) => sum + m.difference, 0
      ) / mutualRatingHistory.length;

      // If ratings are consistently within 0.5 of each other, suspicious
      if (avgDifference < 0.3) {
        reciprocityScore = 90;
        biasIndicators.push('Ratings consistently match - possible collusion');
      } else if (avgDifference < 0.5) {
        reciprocityScore = 70;
        biasIndicators.push('Ratings closely aligned across periods');
      } else if (avgDifference < 1.0) {
        reciprocityScore = 40;
      } else {
        reciprocityScore = 20;
      }

      // Check for quid pro quo patterns
      const bothHigh = mutualRatingHistory.filter(
        m => m.rating1to2 >= 4.0 && m.rating2to1 >= 4.0
      );
      if (bothHigh.length > mutualRatingHistory.length * 0.7) {
        reciprocityScore += 20;
        biasIndicators.push('Pattern of mutual high ratings detected');
      }
    }

    // Determine relationship type (simplified - would use org data in production)
    const relationshipType: 'PEER' | 'MANAGER' | 'CROSS_FUNCTIONAL' | 'UNKNOWN' = 'PEER';

    return {
      reviewer1Id: person1Id,
      reviewer2Id: person2Id,
      relationshipType,
      mutualRatingHistory,
      reciprocityScore: Math.min(100, reciprocityScore),
      biasIndicators,
    };
  }

  /**
   * Calculates team-level trust metrics
   */
  calculateTeamTrustMetrics(
    teamId: string,
    teamName: string,
    memberProfiles: ReviewerTrustProfile[]
  ): TeamTrustMetrics {
    if (memberProfiles.length === 0) {
      return {
        teamId,
        teamName,
        averageTrustScore: 50,
        trustDistribution: [],
        systemIntegrity: 50,
        riskAreas: ['No reviewer data available'],
        recommendations: ['Collect more review data to assess team trust metrics'],
      };
    }

    // Calculate average trust score
    const averageTrustScore = Math.round(
      memberProfiles.reduce((sum, p) => sum + p.overallTrustScore, 0) /
      memberProfiles.length
    );

    // Calculate distribution by tier
    const tierCounts: Record<string, number> = {};
    for (const profile of memberProfiles) {
      tierCounts[profile.reliabilityTier] = (tierCounts[profile.reliabilityTier] || 0) + 1;
    }

    const trustDistribution = Object.entries(tierCounts).map(([tier, count]) => ({
      tier,
      count,
    }));

    // Calculate system integrity
    const flagCount = memberProfiles.reduce(
      (sum, p) => sum + p.flags.filter(f => f.severity !== 'low').length, 0
    );
    const systemIntegrity = Math.max(0, 100 - flagCount * 5);

    // Identify risk areas
    const riskAreas: string[] = [];
    const recommendations: string[] = [];

    const monitoredCount = memberProfiles.filter(
      p => p.reliabilityTier === 'MONITORED' || p.reliabilityTier === 'RESTRICTED'
    ).length;

    if (monitoredCount > memberProfiles.length * 0.3) {
      riskAreas.push(`${monitoredCount} reviewers require monitoring`);
      recommendations.push('Consider additional reviewer training for team');
    }

    const commonFlags = this.findCommonFlags(memberProfiles);
    if (commonFlags.length > 0) {
      riskAreas.push(`Common issues: ${commonFlags.join(', ')}`);
      recommendations.push('Address systematic rating patterns in team calibration');
    }

    if (averageTrustScore < 50) {
      riskAreas.push('Below-average team trust score');
      recommendations.push('Implement targeted interventions to improve rating quality');
    }

    return {
      teamId,
      teamName,
      averageTrustScore,
      trustDistribution,
      systemIntegrity,
      riskAreas,
      recommendations,
    };
  }

  /**
   * Detects potential manipulation patterns
   */
  detectManipulation(
    reviews: ReviewData[],
    profiles: ReviewerTrustProfile[]
  ): ManipulationDetection {
    const patterns: ManipulationPattern[] = [];
    const affectedReviews: string[] = [];
    const recommendedActions: string[] = [];

    // Pattern 1: Rating Collusion Rings
    const collusionDetection = this.detectCollusionRings(reviews);
    if (collusionDetection.detected) {
      patterns.push({
        type: 'RATING_COLLUSION',
        confidence: collusionDetection.confidence,
        description: 'Group of reviewers showing suspicious mutual rating patterns',
        involvedParties: collusionDetection.parties,
        evidencePoints: collusionDetection.evidence,
      });
      affectedReviews.push(...collusionDetection.reviewIds);
      recommendedActions.push('Investigate rating patterns among identified reviewers');
    }

    // Pattern 2: Revenge/Retaliation Ratings
    const retaliationDetection = this.detectRetaliationPatterns(reviews, profiles);
    if (retaliationDetection.detected) {
      patterns.push({
        type: 'RETALIATION_PATTERN',
        confidence: retaliationDetection.confidence,
        description: 'Rating appears to be in retaliation for previous low rating',
        involvedParties: retaliationDetection.parties,
        evidencePoints: retaliationDetection.evidence,
      });
      affectedReviews.push(...retaliationDetection.reviewIds);
      recommendedActions.push('Review ratings for bias and consider adjustment');
    }

    // Pattern 3: Timing Manipulation
    const timingDetection = this.detectTimingManipulation(reviews);
    if (timingDetection.detected) {
      patterns.push({
        type: 'TIMING_MANIPULATION',
        confidence: timingDetection.confidence,
        description: 'Suspicious timing patterns in review submissions',
        involvedParties: timingDetection.parties,
        evidencePoints: timingDetection.evidence,
      });
      affectedReviews.push(...timingDetection.reviewIds);
      recommendedActions.push('Monitor future submission patterns');
    }

    // Pattern 4: Systematic Inflation/Deflation
    const systematicBias = this.detectSystematicBias(reviews, profiles);
    if (systematicBias.detected) {
      patterns.push({
        type: 'SYSTEMATIC_BIAS',
        confidence: systematicBias.confidence,
        description: `Systematic ${systematicBias.direction} detected across reviews`,
        involvedParties: systematicBias.parties,
        evidencePoints: systematicBias.evidence,
      });
      affectedReviews.push(...systematicBias.reviewIds);
      recommendedActions.push('Apply calibration adjustment to affected ratings');
    }

    const overallRiskScore = patterns.length === 0 ? 0 :
      Math.min(100, patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length + patterns.length * 10);

    return {
      detected: patterns.length > 0,
      patterns,
      overallRiskScore,
      affectedReviews: [...new Set(affectedReviews)],
      recommendedActions,
    };
  }

  /**
   * Calculates weighted rating based on trust scores
   */
  calculateTrustWeightedRating(
    ratings: Array<{ rating: number; reviewerId: string }>,
    profiles: ReviewerTrustProfile[]
  ): {
    weightedRating: number;
    simpleAverage: number;
    adjustment: number;
    contributions: Array<{ reviewerId: string; rating: number; weight: number; contribution: number }>;
  } {
    const profileMap = new Map(profiles.map(p => [p.reviewerId, p]));

    let totalWeight = 0;
    let weightedSum = 0;
    let simpleSum = 0;
    const contributions: Array<{
      reviewerId: string;
      rating: number;
      weight: number;
      contribution: number;
    }> = [];

    for (const { rating, reviewerId } of ratings) {
      const profile = profileMap.get(reviewerId);
      const trustScore = profile?.overallTrustScore || 50;

      // Calculate weight based on trust score
      // Weight ranges from 0.5 (low trust) to 1.5 (high trust)
      const weight = 0.5 + (trustScore / 100);

      totalWeight += weight;
      weightedSum += rating * weight;
      simpleSum += rating;

      contributions.push({
        reviewerId,
        rating,
        weight: Math.round(weight * 100) / 100,
        contribution: Math.round(rating * weight * 100) / 100,
      });
    }

    const weightedRating = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const simpleAverage = ratings.length > 0 ? simpleSum / ratings.length : 0;

    return {
      weightedRating: Math.round(weightedRating * 100) / 100,
      simpleAverage: Math.round(simpleAverage * 100) / 100,
      adjustment: Math.round((weightedRating - simpleAverage) * 100) / 100,
      contributions,
    };
  }

  // Private helper methods

  private createDefaultProfile(reviewerId: string, reviewerName: string): ReviewerTrustProfile {
    return {
      reviewerId,
      reviewerName,
      overallTrustScore: 50,
      components: {
        consistency: 50,
        accuracy: 50,
        differentiation: 50,
        timeliness: 50,
        evidenceQuality: 50,
        biasScore: 50,
        calibrationAlignment: 50,
        feedbackActionability: 50,
      },
      flags: [],
      reliabilityTier: 'STANDARD',
      historicalData: {
        totalReviewsGiven: 0,
        reviewPeriods: 0,
        averageRating: 0,
        ratingStandardDeviation: 0,
        calibrationAdjustments: 0,
        adjustmentDirection: 'none',
        averageAdjustmentSize: 0,
        onTimeSubmissionRate: 100,
        feedbackResponseRate: 0,
      },
      recommendations: ['Complete more reviews to build trust profile'],
      lastUpdated: new Date(),
    };
  }

  private calculateTrustComponents(
    reviewerReviews: ReviewData[],
    allReviews: ReviewData[],
    calibrationData: CalibrationData[],
    feedbackHistory: FeedbackData[]
  ): TrustComponents {
    // Consistency: How varied are this reviewer's ratings
    const ratings = reviewerReviews.map(r => r.rating);
    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const variance = ratings.reduce((sum, r) => sum + Math.pow(r - avgRating, 2), 0) / ratings.length;
    const stdDev = Math.sqrt(variance);

    // Low variance is suspicious (central tendency), high variance may indicate inconsistency
    const consistency = stdDev >= 0.5 && stdDev <= 1.5 ? 80 : stdDev < 0.5 ? 40 : 60;

    // Accuracy: How often ratings are confirmed in calibration
    const calibrations = calibrationData.filter(c =>
      reviewerReviews.some(r => r.id === c.reviewId)
    );
    let accuracy = 70; // Default
    if (calibrations.length > 0) {
      const adjustments = calibrations.filter(c => Math.abs(c.adjustment) > 0.3);
      accuracy = Math.max(0, 100 - (adjustments.length / calibrations.length) * 50);
    }

    // Differentiation: Does reviewer give different ratings to different performers
    const uniqueRatings = new Set(ratings.map(r => Math.round(r * 2) / 2));
    const differentiation = Math.min(100, uniqueRatings.size * 20);

    // Timeliness: Reviews submitted on time
    const onTimeReviews = reviewerReviews.filter(r => !r.isLate);
    const timeliness = (onTimeReviews.length / reviewerReviews.length) * 100;

    // Evidence quality: Based on review content length and specificity
    const avgContentLength = reviewerReviews.reduce(
      (sum, r) => sum + (r.content?.length || 0), 0
    ) / reviewerReviews.length;
    const evidenceQuality = Math.min(100, avgContentLength / 5); // 500 chars = 100%

    // Bias score: Inverted from bias detection analysis
    const biasScore = 70; // Would integrate with BiasDetectionService

    // Calibration alignment
    const calibrationAlignment = accuracy; // Similar metric

    // Feedback actionability
    const avgStrengths = reviewerReviews.reduce(
      (sum, r) => sum + (r.strengths?.length || 0), 0
    ) / reviewerReviews.length;
    const avgGrowthAreas = reviewerReviews.reduce(
      (sum, r) => sum + (r.areasForGrowth?.length || 0), 0
    ) / reviewerReviews.length;
    const feedbackActionability = Math.min(100, (avgStrengths + avgGrowthAreas) * 15);

    return {
      consistency: Math.round(consistency),
      accuracy: Math.round(accuracy),
      differentiation: Math.round(differentiation),
      timeliness: Math.round(timeliness),
      evidenceQuality: Math.round(evidenceQuality),
      biasScore: Math.round(biasScore),
      calibrationAlignment: Math.round(calibrationAlignment),
      feedbackActionability: Math.round(feedbackActionability),
    };
  }

  private calculateOverallScore(components: TrustComponents): number {
    let score = 0;
    for (const [key, weight] of Object.entries(TRUST_WEIGHTS)) {
      const componentValue = components[key as keyof TrustComponents];
      score += componentValue * weight;
    }
    return Math.round(score);
  }

  private detectTrustFlags(
    reviewerId: string,
    reviewerReviews: ReviewData[],
    allReviews: ReviewData[],
    calibrationData: CalibrationData[]
  ): TrustFlag[] {
    const flags: TrustFlag[] = [];
    const now = new Date();

    // Check for rating inflation
    const avgRating = reviewerReviews.reduce((sum, r) => sum + r.rating, 0) / reviewerReviews.length;
    const overallAvg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    if (avgRating - overallAvg > 0.5) {
      flags.push({
        type: 'RATING_INFLATION',
        severity: avgRating - overallAvg > 0.8 ? 'high' : 'medium',
        description: `Average rating (${avgRating.toFixed(2)}) is ${(avgRating - overallAvg).toFixed(2)} points above organization average`,
        detectedAt: now,
        evidence: [`Reviewer average: ${avgRating.toFixed(2)}`, `Org average: ${overallAvg.toFixed(2)}`],
        status: 'active',
      });
    } else if (overallAvg - avgRating > 0.5) {
      flags.push({
        type: 'RATING_DEFLATION',
        severity: overallAvg - avgRating > 0.8 ? 'high' : 'medium',
        description: `Average rating (${avgRating.toFixed(2)}) is ${(overallAvg - avgRating).toFixed(2)} points below organization average`,
        detectedAt: now,
        evidence: [`Reviewer average: ${avgRating.toFixed(2)}`, `Org average: ${overallAvg.toFixed(2)}`],
        status: 'active',
      });
    }

    // Check for central tendency
    const ratings = reviewerReviews.map(r => r.rating);
    const variance = ratings.reduce((sum, r) => sum + Math.pow(r - avgRating, 2), 0) / ratings.length;

    if (variance < 0.2 && reviewerReviews.length >= 5) {
      flags.push({
        type: 'CENTRAL_TENDENCY',
        severity: 'medium',
        description: 'Ratings clustered around the mean with very low variance',
        detectedAt: now,
        evidence: [`Variance: ${variance.toFixed(2)}`, `Expected minimum: 0.3`],
        status: 'active',
      });
    }

    // Check calibration adjustments
    const reviewerCalibrations = calibrationData.filter(c =>
      reviewerReviews.some(r => r.id === c.reviewId)
    );

    const significantAdjustments = reviewerCalibrations.filter(c => Math.abs(c.adjustment) > 0.5);

    if (significantAdjustments.length > reviewerCalibrations.length * 0.5 && reviewerCalibrations.length >= 3) {
      const avgAdjustment = significantAdjustments.reduce((sum, c) => sum + c.adjustment, 0) / significantAdjustments.length;

      flags.push({
        type: avgAdjustment > 0 ? 'LENIENCY_BIAS' : 'STRICTNESS_BIAS',
        severity: 'high',
        description: `Over ${Math.round((significantAdjustments.length / reviewerCalibrations.length) * 100)}% of ratings required significant calibration adjustment`,
        detectedAt: now,
        evidence: [
          `Adjustments needed: ${significantAdjustments.length}/${reviewerCalibrations.length}`,
          `Average adjustment: ${avgAdjustment.toFixed(2)}`,
        ],
        status: 'active',
      });
    }

    return flags;
  }

  private determineReliabilityTier(
    score: number,
    flags: TrustFlag[]
  ): ReviewerTrustProfile['reliabilityTier'] {
    // Critical flags override score
    const criticalFlags = flags.filter(f => f.severity === 'critical');
    if (criticalFlags.length > 0) return 'RESTRICTED';

    const highFlags = flags.filter(f => f.severity === 'high');
    if (highFlags.length >= 2) return 'MONITORED';

    // Score-based tiers
    if (score >= RELIABILITY_THRESHOLDS.EXCEPTIONAL) return 'EXCEPTIONAL';
    if (score >= RELIABILITY_THRESHOLDS.TRUSTED) return 'TRUSTED';
    if (score >= RELIABILITY_THRESHOLDS.STANDARD) return 'STANDARD';
    if (score >= RELIABILITY_THRESHOLDS.MONITORED) return 'MONITORED';
    return 'RESTRICTED';
  }

  private calculateHistoricalMetrics(
    reviews: ReviewData[],
    calibrations: CalibrationData[]
  ): HistoricalMetrics {
    const ratings = reviews.map(r => r.rating);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    const variance = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + Math.pow(r - avgRating, 2), 0) / ratings.length
      : 0;

    const reviewPeriods = new Set(reviews.map(r => r.cycleId)).size;

    const reviewerCalibrations = calibrations.filter(c =>
      reviews.some(r => r.id === c.reviewId)
    );

    const adjustments = reviewerCalibrations.filter(c => Math.abs(c.adjustment) > 0.2);
    const avgAdjustment = adjustments.length > 0
      ? adjustments.reduce((sum, c) => sum + c.adjustment, 0) / adjustments.length
      : 0;

    let adjustmentDirection: 'up' | 'down' | 'mixed' | 'none' = 'none';
    if (adjustments.length > 0) {
      const ups = adjustments.filter(a => a.adjustment > 0);
      const downs = adjustments.filter(a => a.adjustment < 0);
      if (ups.length > downs.length * 2) adjustmentDirection = 'up';
      else if (downs.length > ups.length * 2) adjustmentDirection = 'down';
      else adjustmentDirection = 'mixed';
    }

    const onTimeReviews = reviews.filter(r => !r.isLate);

    return {
      totalReviewsGiven: reviews.length,
      reviewPeriods,
      averageRating: Math.round(avgRating * 100) / 100,
      ratingStandardDeviation: Math.round(Math.sqrt(variance) * 100) / 100,
      calibrationAdjustments: adjustments.length,
      adjustmentDirection,
      averageAdjustmentSize: Math.round(Math.abs(avgAdjustment) * 100) / 100,
      onTimeSubmissionRate: reviews.length > 0
        ? Math.round((onTimeReviews.length / reviews.length) * 100)
        : 100,
      feedbackResponseRate: 0, // Would need additional data
    };
  }

  private generateRecommendations(
    components: TrustComponents,
    flags: TrustFlag[],
    history: HistoricalMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (components.differentiation < 50) {
      recommendations.push('Differentiate ratings more clearly between high and low performers');
    }

    if (components.evidenceQuality < 50) {
      recommendations.push('Provide more detailed written feedback with specific examples');
    }

    if (components.timeliness < 80) {
      recommendations.push('Submit reviews on time to maintain trust score');
    }

    if (flags.some(f => f.type === 'CENTRAL_TENDENCY')) {
      recommendations.push('Avoid rating everyone as "average" - use the full rating scale');
    }

    if (flags.some(f => f.type === 'RATING_INFLATION')) {
      recommendations.push('Calibrate ratings against organization benchmarks');
    }

    if (history.calibrationAdjustments > 2) {
      recommendations.push('Review calibration feedback from past sessions to improve accuracy');
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current high-quality review practices');
    }

    return recommendations;
  }

  private analyzeContentQuality(content: string): number {
    if (!content) return 0;

    let score = 0;

    // Length
    if (content.length >= 500) score += 30;
    else if (content.length >= 200) score += 20;
    else if (content.length >= 100) score += 10;

    // Specificity (presence of numbers, dates, names)
    const hasNumbers = /\d+/.test(content);
    const hasActionWords = /\b(improved|delivered|completed|achieved|exceeded|developed|led|created)\b/i.test(content);
    const hasExamples = /\b(for example|such as|specifically|instance|demonstrated)\b/i.test(content);

    if (hasNumbers) score += 20;
    if (hasActionWords) score += 25;
    if (hasExamples) score += 25;

    return Math.min(100, score);
  }

  private analyzeContextMatch(feedback: FeedbackData, history: ReviewData[]): number {
    if (history.length === 0) return 50;

    // Check if feedback sentiment matches historical performance
    const avgRating = history.reduce((sum, r) => sum + r.rating, 0) / history.length;

    const isPositiveFeedback = feedback.type === 'PRAISE' || feedback.type === 'RECOGNITION';
    const isNegativeFeedback = feedback.type === 'CONSTRUCTIVE';

    if (isPositiveFeedback && avgRating >= 3.5) return 80;
    if (isNegativeFeedback && avgRating <= 3.0) return 80;
    if (isPositiveFeedback && avgRating <= 2.5) return 30; // Mismatch
    if (isNegativeFeedback && avgRating >= 4.0) return 40; // Possible but notable

    return 60;
  }

  private calculateFeedbackWeight(credibility: number, tier: ReviewerTrustProfile['reliabilityTier']): number {
    const tierMultiplier = {
      'EXCEPTIONAL': 1.3,
      'TRUSTED': 1.1,
      'STANDARD': 1.0,
      'MONITORED': 0.8,
      'RESTRICTED': 0.5,
    };

    return Math.round((credibility / 100) * tierMultiplier[tier] * 100) / 100;
  }

  private calculateEvidenceAlignment(rating: number, evidenceScore: number): number {
    // Map evidence score to expected rating range
    const expectedRating = (evidenceScore / 100) * 4 + 1; // 1-5 scale
    const difference = Math.abs(rating - expectedRating);

    if (difference <= 0.5) return 100;
    if (difference <= 1.0) return 70;
    if (difference <= 1.5) return 40;
    return 20;
  }

  private calculatePeerComparison(review: ReviewData, peerReviews: ReviewData[]): number {
    if (peerReviews.length === 0) return 50;

    const peerAvg = peerReviews.reduce((sum, r) => sum + r.rating, 0) / peerReviews.length;
    const difference = Math.abs(review.rating - peerAvg);

    if (difference <= 0.3) return 100;
    if (difference <= 0.6) return 80;
    if (difference <= 1.0) return 50;
    return 20;
  }

  private predictCalibrationAdjustment(
    review: ReviewData,
    profile: ReviewerTrustProfile,
    peerReviews: ReviewData[]
  ): number {
    let adjustment = 0;

    // Adjust based on reviewer's historical pattern
    if (profile.historicalData.adjustmentDirection === 'down') {
      adjustment -= profile.historicalData.averageAdjustmentSize * 0.5;
    } else if (profile.historicalData.adjustmentDirection === 'up') {
      adjustment += profile.historicalData.averageAdjustmentSize * 0.5;
    }

    // Adjust based on peer comparison
    if (peerReviews.length > 0) {
      const peerAvg = peerReviews.reduce((sum, r) => sum + r.rating, 0) / peerReviews.length;
      const diff = peerAvg - review.rating;
      adjustment += diff * 0.3;
    }

    return Math.round(adjustment * 100) / 100;
  }

  private calculateConfidenceInterval(
    rating: number,
    reliability: number
  ): { lower: number; upper: number } {
    const margin = ((100 - reliability) / 100) * 1.0; // Max 1.0 point margin

    return {
      lower: Math.max(1, Math.round((rating - margin) * 10) / 10),
      upper: Math.min(5, Math.round((rating + margin) * 10) / 10),
    };
  }

  private findCommonFlags(profiles: ReviewerTrustProfile[]): string[] {
    const flagCounts: Record<string, number> = {};

    for (const profile of profiles) {
      for (const flag of profile.flags) {
        flagCounts[flag.type] = (flagCounts[flag.type] || 0) + 1;
      }
    }

    return Object.entries(flagCounts)
      .filter(([, count]) => count >= profiles.length * 0.3)
      .map(([type]) => type);
  }

  private detectCollusionRings(reviews: ReviewData[]): {
    detected: boolean;
    confidence: number;
    parties: string[];
    evidence: string[];
    reviewIds: string[];
  } {
    // Simplified collusion detection
    // Would need more sophisticated graph analysis in production

    const mutualReviews = new Map<string, ReviewData[]>();

    for (const review of reviews) {
      const key = [review.reviewerId, review.revieweeId].sort().join(':');
      const existing = mutualReviews.get(key) || [];
      existing.push(review);
      mutualReviews.set(key, existing);
    }

    const suspiciousPairs: string[][] = [];
    const evidence: string[] = [];
    const reviewIds: string[] = [];

    for (const [key, pairReviews] of mutualReviews) {
      if (pairReviews.length >= 2) {
        const allHigh = pairReviews.every(r => r.rating >= 4.0);
        if (allHigh) {
          suspiciousPairs.push(key.split(':'));
          evidence.push(`Mutual high ratings between ${key}`);
          reviewIds.push(...pairReviews.map(r => r.id));
        }
      }
    }

    return {
      detected: suspiciousPairs.length >= 3,
      confidence: Math.min(90, suspiciousPairs.length * 20),
      parties: [...new Set(suspiciousPairs.flat())],
      evidence,
      reviewIds,
    };
  }

  private detectRetaliationPatterns(
    reviews: ReviewData[],
    profiles: ReviewerTrustProfile[]
  ): {
    detected: boolean;
    confidence: number;
    parties: string[];
    evidence: string[];
    reviewIds: string[];
  } {
    // Detect if low ratings follow receiving low ratings
    const evidence: string[] = [];
    const reviewIds: string[] = [];
    const parties: string[] = [];

    // Group by reviewer
    const byReviewer = new Map<string, ReviewData[]>();
    for (const review of reviews) {
      const existing = byReviewer.get(review.reviewerId) || [];
      existing.push(review);
      byReviewer.set(review.reviewerId, existing);
    }

    for (const [reviewerId, reviewerReviews] of byReviewer) {
      // Find if this reviewer received a low rating before giving one
      const receivedLow = reviews.filter(r =>
        r.revieweeId === reviewerId && r.rating <= 2.5
      );

      if (receivedLow.length === 0) continue;

      for (const lowReceived of receivedLow) {
        // Check if reviewer then gave a low rating to the person who rated them low
        const retaliationReview = reviewerReviews.find(r =>
          r.revieweeId === lowReceived.reviewerId &&
          r.rating <= 2.5 &&
          r.createdAt > lowReceived.createdAt
        );

        if (retaliationReview) {
          parties.push(reviewerId, lowReceived.reviewerId);
          evidence.push(
            `Possible retaliation: ${reviewerId} rated ${lowReceived.reviewerId} low after receiving low rating`
          );
          reviewIds.push(retaliationReview.id);
        }
      }
    }

    return {
      detected: evidence.length > 0,
      confidence: Math.min(80, evidence.length * 40),
      parties: [...new Set(parties)],
      evidence,
      reviewIds,
    };
  }

  private detectTimingManipulation(reviews: ReviewData[]): {
    detected: boolean;
    confidence: number;
    parties: string[];
    evidence: string[];
    reviewIds: string[];
  } {
    // Detect reviews submitted very close to deadline in bulk
    const evidence: string[] = [];
    const reviewIds: string[] = [];
    const parties: string[] = [];

    // Group by reviewer
    const byReviewer = new Map<string, ReviewData[]>();
    for (const review of reviews) {
      const existing = byReviewer.get(review.reviewerId) || [];
      existing.push(review);
      byReviewer.set(review.reviewerId, existing);
    }

    for (const [reviewerId, reviewerReviews] of byReviewer) {
      if (reviewerReviews.length < 3) continue;

      // Check if most reviews submitted within short window
      const sorted = [...reviewerReviews].sort(
        (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime()
      );

      const firstSubmit = sorted[0].submittedAt.getTime();
      const lastSubmit = sorted[sorted.length - 1].submittedAt.getTime();
      const hoursDiff = (lastSubmit - firstSubmit) / (1000 * 60 * 60);

      if (hoursDiff < 2 && reviewerReviews.length > 5) {
        parties.push(reviewerId);
        evidence.push(`${reviewerReviews.length} reviews submitted within ${hoursDiff.toFixed(1)} hours`);
        reviewIds.push(...reviewerReviews.map(r => r.id));
      }
    }

    return {
      detected: parties.length > 0,
      confidence: Math.min(70, parties.length * 30),
      parties: [...new Set(parties)],
      evidence,
      reviewIds,
    };
  }

  private detectSystematicBias(
    reviews: ReviewData[],
    profiles: ReviewerTrustProfile[]
  ): {
    detected: boolean;
    confidence: number;
    direction: string;
    parties: string[];
    evidence: string[];
    reviewIds: string[];
  } {
    const biasedReviewers = profiles.filter(p =>
      p.flags.some(f => f.type === 'RATING_INFLATION' || f.type === 'RATING_DEFLATION')
    );

    if (biasedReviewers.length < 2) {
      return {
        detected: false,
        confidence: 0,
        direction: 'none',
        parties: [],
        evidence: [],
        reviewIds: [],
      };
    }

    const inflators = biasedReviewers.filter(p =>
      p.flags.some(f => f.type === 'RATING_INFLATION')
    );
    const deflators = biasedReviewers.filter(p =>
      p.flags.some(f => f.type === 'RATING_DEFLATION')
    );

    const direction = inflators.length > deflators.length ? 'inflation' : 'deflation';
    const parties = biasedReviewers.map(p => p.reviewerId);
    const evidence = biasedReviewers.map(p =>
      `${p.reviewerName}: ${p.flags.find(f => f.type.includes('RATING'))?.description}`
    );

    const affectedReviews = reviews.filter(r => parties.includes(r.reviewerId));

    return {
      detected: true,
      confidence: Math.min(85, biasedReviewers.length * 25),
      direction,
      parties,
      evidence,
      reviewIds: affectedReviews.map(r => r.id),
    };
  }
}

// Supporting types for the service
interface ReviewData {
  id: string;
  reviewerId: string;
  revieweeId: string;
  cycleId: string;
  rating: number;
  content?: string;
  strengths?: string[];
  areasForGrowth?: string[];
  submittedAt: Date;
  createdAt: Date;
  isLate: boolean;
}

interface CalibrationData {
  reviewId: string;
  adjustment: number;
  originalRating: number;
  calibratedRating: number;
}

interface FeedbackData {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: 'PRAISE' | 'CONSTRUCTIVE' | 'SUGGESTION' | 'REQUEST' | 'RECOGNITION';
  content: string;
  createdAt: Date;
}

export const trustScoreSystem = new TrustScoreSystem();
