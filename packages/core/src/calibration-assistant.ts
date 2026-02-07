/**
 * AI-Powered Calibration Assistant
 * Implements Feature 2: AI-Powered Calibration Assistant
 *
 * Provides:
 * - Pre-session analysis
 * - Outlier detection
 * - Discussion recommendations
 * - Real-time bias alerts
 * - Rating distribution analysis
 */

import { biasDetectionService, type BiasAnalysisResult } from './bias-detection';

export interface ReviewData {
  reviewId: string;
  revieweeId: string;
  revieweeName: string;
  reviewerId: string;
  reviewerName: string;
  departmentId: string;
  departmentName: string;
  level: number;
  rating: number;
  calibratedRating?: number;
  content: string;
  strengths: string[];
  areasForGrowth: string[];
}

export interface OutlierResult {
  reviewId: string;
  revieweeName: string;
  rating: number;
  outlierType: 'high' | 'low';
  deviation: number;
  percentile: number;
  suggestedDiscussion: string;
  relatedReviews: string[]; // Similar employees with different ratings
}

export interface BiasAlert {
  alertType: 'department_bias' | 'level_bias' | 'reviewer_bias' | 'language_bias' | 'distribution_skew';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedReviewIds: string[];
  recommendation: string;
}

export interface DistributionAnalysis {
  mean: number;
  median: number;
  standardDeviation: number;
  skewness: number;
  distribution: Record<string, number>; // rating bucket -> count
  expectedDistribution: Record<string, number>;
  distributionFit: 'good' | 'skewed_high' | 'skewed_low' | 'bimodal' | 'uniform';
}

export interface ReviewerAnalysis {
  reviewerId: string;
  reviewerName: string;
  reviewCount: number;
  averageRating: number;
  ratingVariance: number;
  trend: 'lenient' | 'strict' | 'neutral';
  biasScore: number;
}

export interface DiscussionTopic {
  priority: 'high' | 'medium' | 'low';
  topic: string;
  description: string;
  relatedReviewIds: string[];
  suggestedTime: number; // minutes
}

export interface CalibrationPreAnalysis {
  sessionId: string;
  analyzedAt: Date;
  totalReviews: number;
  outliers: OutlierResult[];
  biasAlerts: BiasAlert[];
  distributionAnalysis: DistributionAnalysis;
  reviewerAnalysis: ReviewerAnalysis[];
  discussionTopics: DiscussionTopic[];
  recommendations: string[];
  estimatedSessionDuration: number; // minutes
}

export class CalibrationAssistantService {
  /**
   * Performs comprehensive pre-calibration analysis
   */
  analyzePreSession(reviews: ReviewData[], sessionId: string): CalibrationPreAnalysis {
    const ratings = reviews.map(r => r.rating);

    // Core analysis
    const distributionAnalysis = this.analyzeDistribution(ratings);
    const outliers = this.detectOutliers(reviews, distributionAnalysis);
    const reviewerAnalysis = this.analyzeReviewers(reviews);
    const biasAlerts = this.detectBiasPatterns(reviews, reviewerAnalysis, distributionAnalysis);
    const discussionTopics = this.generateDiscussionTopics(reviews, outliers, biasAlerts, reviewerAnalysis);
    const recommendations = this.generateRecommendations(reviews, outliers, biasAlerts, distributionAnalysis);

    // Estimate session duration
    const estimatedSessionDuration = this.estimateSessionDuration(
      reviews.length,
      outliers.length,
      biasAlerts.filter(a => a.severity === 'high').length
    );

    return {
      sessionId,
      analyzedAt: new Date(),
      totalReviews: reviews.length,
      outliers,
      biasAlerts,
      distributionAnalysis,
      reviewerAnalysis,
      discussionTopics,
      recommendations,
      estimatedSessionDuration,
    };
  }

  /**
   * Analyzes rating distribution using statistical methods
   */
  private analyzeDistribution(ratings: number[]): DistributionAnalysis {
    const n = ratings.length;
    if (n === 0) {
      return {
        mean: 0,
        median: 0,
        standardDeviation: 0,
        skewness: 0,
        distribution: {},
        expectedDistribution: {},
        distributionFit: 'good',
      };
    }

    // Calculate statistics
    const sorted = [...ratings].sort((a, b) => a - b);
    const mean = ratings.reduce((sum, r) => sum + r, 0) / n;
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / n;
    const standardDeviation = Math.sqrt(variance);

    // Calculate skewness
    const skewness = n > 2
      ? ratings.reduce((sum, r) => sum + Math.pow((r - mean) / standardDeviation, 3), 0) / n
      : 0;

    // Distribution buckets (1-5 scale, 0.5 increments)
    const buckets = ['1.0', '1.5', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0'];
    const distribution: Record<string, number> = {};
    const expectedDistribution: Record<string, number> = {};

    // Initialize buckets
    buckets.forEach(b => {
      distribution[b] = 0;
      // Expected normal distribution centered at 3.0
      const bucketVal = parseFloat(b);
      expectedDistribution[b] = Math.round(n * this.normalPDF(bucketVal, 3.0, 0.8) * 0.5);
    });

    // Count actual distribution
    ratings.forEach(r => {
      const bucket = (Math.round(r * 2) / 2).toFixed(1);
      if (distribution[bucket] !== undefined) {
        distribution[bucket]++;
      }
    });

    // Determine distribution fit
    let distributionFit: DistributionAnalysis['distributionFit'] = 'good';
    if (skewness > 0.5) distributionFit = 'skewed_high';
    else if (skewness < -0.5) distributionFit = 'skewed_low';
    else if (standardDeviation > 1.2) distributionFit = 'bimodal';
    else if (standardDeviation < 0.3) distributionFit = 'uniform';

    return {
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      skewness: Math.round(skewness * 100) / 100,
      distribution,
      expectedDistribution,
      distributionFit,
    };
  }

  /**
   * Detects statistical outliers using IQR and Z-score methods
   */
  private detectOutliers(reviews: ReviewData[], distribution: DistributionAnalysis): OutlierResult[] {
    const outliers: OutlierResult[] = [];
    const ratings = reviews.map(r => r.rating);
    const sorted = [...ratings].sort((a, b) => a - b);
    const n = ratings.length;

    if (n < 4) return outliers;

    // Calculate IQR
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    for (const review of reviews) {
      const zScore = (review.rating - distribution.mean) / (distribution.standardDeviation || 1);
      const isOutlier = review.rating < lowerBound || review.rating > upperBound || Math.abs(zScore) > 2;

      if (isOutlier) {
        const percentile = (sorted.filter(r => r <= review.rating).length / n) * 100;
        const outlierType = review.rating > distribution.mean ? 'high' : 'low';
        const deviation = Math.abs(review.rating - distribution.mean);

        // Find similar employees with different ratings
        const relatedReviews = reviews
          .filter(r =>
            r.reviewId !== review.reviewId &&
            r.departmentId === review.departmentId &&
            r.level === review.level &&
            Math.abs(r.rating - review.rating) > 1
          )
          .map(r => r.reviewId)
          .slice(0, 3);

        outliers.push({
          reviewId: review.reviewId,
          revieweeName: review.revieweeName,
          rating: review.rating,
          outlierType,
          deviation: Math.round(deviation * 100) / 100,
          percentile: Math.round(percentile),
          suggestedDiscussion: this.generateOutlierDiscussion(review, outlierType, deviation),
          relatedReviews,
        });
      }
    }

    return outliers.sort((a, b) => b.deviation - a.deviation);
  }

  /**
   * Analyzes individual reviewers for bias patterns
   */
  private analyzeReviewers(reviews: ReviewData[]): ReviewerAnalysis[] {
    const reviewerMap = new Map<string, ReviewData[]>();

    for (const review of reviews) {
      const existing = reviewerMap.get(review.reviewerId) ?? [];
      existing.push(review);
      reviewerMap.set(review.reviewerId, existing);
    }

    const overallMean = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const results: ReviewerAnalysis[] = [];

    for (const [reviewerId, reviewerReviews] of reviewerMap) {
      if (reviewerReviews.length < 2) continue;

      const ratings = reviewerReviews.map(r => r.rating);
      const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      const variance = ratings.reduce((sum, r) => sum + Math.pow(r - avgRating, 2), 0) / ratings.length;

      let trend: ReviewerAnalysis['trend'] = 'neutral';
      if (avgRating - overallMean > 0.3) trend = 'lenient';
      else if (overallMean - avgRating > 0.3) trend = 'strict';

      // Calculate bias score based on deviation from mean and variance
      const biasScore = Math.min(100, Math.max(0,
        100 - Math.abs(avgRating - overallMean) * 20 - (variance < 0.3 ? 10 : 0)
      ));

      // Analyze content for bias
      const contentBias = reviewerReviews.map(r =>
        biasDetectionService.analyze(r.content).overallScore
      );
      const avgContentBias = contentBias.reduce((sum, s) => sum + s, 0) / contentBias.length;

      results.push({
        reviewerId,
        reviewerName: reviewerReviews[0].reviewerName,
        reviewCount: reviewerReviews.length,
        averageRating: Math.round(avgRating * 100) / 100,
        ratingVariance: Math.round(variance * 100) / 100,
        trend,
        biasScore: Math.round((biasScore + avgContentBias) / 2),
      });
    }

    return results.sort((a, b) => a.biasScore - b.biasScore);
  }

  /**
   * Detects various bias patterns across the review set
   */
  private detectBiasPatterns(
    reviews: ReviewData[],
    reviewerAnalysis: ReviewerAnalysis[],
    distribution: DistributionAnalysis
  ): BiasAlert[] {
    const alerts: BiasAlert[] = [];

    // 1. Department bias - different departments have significantly different averages
    const deptGroups = this.groupBy(reviews, 'departmentId');
    const deptAverages = Object.entries(deptGroups).map(([deptId, deptReviews]) => ({
      deptId,
      deptName: deptReviews[0].departmentName,
      avg: deptReviews.reduce((sum, r) => sum + r.rating, 0) / deptReviews.length,
      count: deptReviews.length,
      reviewIds: deptReviews.map(r => r.reviewId),
    }));

    const maxDeptDiff = Math.max(...deptAverages.map(d => Math.abs(d.avg - distribution.mean)));
    if (maxDeptDiff > 0.5 && deptAverages.length > 1) {
      const highDept = deptAverages.find(d => d.avg - distribution.mean > 0.5);
      const lowDept = deptAverages.find(d => distribution.mean - d.avg > 0.5);

      if (highDept || lowDept) {
        alerts.push({
          alertType: 'department_bias',
          severity: maxDeptDiff > 0.8 ? 'high' : 'medium',
          description: `Significant rating disparity detected across departments. ${
            highDept ? `${highDept.deptName} avg: ${highDept.avg.toFixed(2)}` : ''
          } ${lowDept ? `${lowDept.deptName} avg: ${lowDept.avg.toFixed(2)}` : ''}`,
          affectedReviewIds: [...(highDept?.reviewIds ?? []), ...(lowDept?.reviewIds ?? [])],
          recommendation: 'Review whether department differences reflect actual performance or reviewer calibration issues.',
        });
      }
    }

    // 2. Level bias - junior vs senior employees rated differently
    const levelGroups = this.groupBy(reviews, 'level');
    const levelAverages = Object.entries(levelGroups)
      .map(([level, levelReviews]) => ({
        level: parseInt(level),
        avg: levelReviews.reduce((sum, r) => sum + r.rating, 0) / levelReviews.length,
        count: levelReviews.length,
        reviewIds: levelReviews.map(r => r.reviewId),
      }))
      .sort((a, b) => a.level - b.level);

    if (levelAverages.length >= 3) {
      const correlation = this.calculateCorrelation(
        levelAverages.map(l => l.level),
        levelAverages.map(l => l.avg)
      );

      if (Math.abs(correlation) > 0.7) {
        alerts.push({
          alertType: 'level_bias',
          severity: Math.abs(correlation) > 0.85 ? 'high' : 'medium',
          description: `Strong correlation (${(correlation * 100).toFixed(0)}%) between employee level and rating. ${
            correlation > 0 ? 'Higher levels receive higher ratings.' : 'Lower levels receive higher ratings.'
          }`,
          affectedReviewIds: reviews.map(r => r.reviewId),
          recommendation: 'Ensure ratings reflect individual performance rather than seniority.',
        });
      }
    }

    // 3. Reviewer bias - some reviewers consistently rate higher/lower
    const biasedReviewers = reviewerAnalysis.filter(r => r.biasScore < 60 && r.reviewCount >= 3);
    if (biasedReviewers.length > 0) {
      for (const reviewer of biasedReviewers) {
        const reviewerReviews = reviews.filter(r => r.reviewerId === reviewer.reviewerId);
        alerts.push({
          alertType: 'reviewer_bias',
          severity: reviewer.biasScore < 40 ? 'high' : 'medium',
          description: `${reviewer.reviewerName} shows ${reviewer.trend} rating tendency (avg: ${reviewer.averageRating}) with potential bias indicators.`,
          affectedReviewIds: reviewerReviews.map(r => r.reviewId),
          recommendation: `Consider re-reviewing ratings from ${reviewer.reviewerName} for consistency.`,
        });
      }
    }

    // 4. Language bias - analyze review content for biased language
    const contentAnalysis = reviews.map(r => ({
      reviewId: r.reviewId,
      analysis: biasDetectionService.analyze(r.content),
    }));

    const highBiasContent = contentAnalysis.filter(c => c.analysis.overallScore < 60);
    if (highBiasContent.length > reviews.length * 0.2) {
      alerts.push({
        alertType: 'language_bias',
        severity: highBiasContent.length > reviews.length * 0.4 ? 'high' : 'medium',
        description: `${highBiasContent.length} reviews (${Math.round(highBiasContent.length / reviews.length * 100)}%) contain potentially biased language.`,
        affectedReviewIds: highBiasContent.map(c => c.reviewId),
        recommendation: 'Review flagged content for gendered language, stereotypes, or other bias indicators.',
      });
    }

    // 5. Distribution skew
    if (distribution.distributionFit !== 'good') {
      let description = '';
      let recommendation = '';

      switch (distribution.distributionFit) {
        case 'skewed_high':
          description = `Rating distribution is skewed high (skewness: ${distribution.skewness}). Most ratings are above average.`;
          recommendation = 'Consider whether ratings accurately differentiate performance levels.';
          break;
        case 'skewed_low':
          description = `Rating distribution is skewed low (skewness: ${distribution.skewness}). Most ratings are below average.`;
          recommendation = 'Review whether performance issues are organization-wide or if ratings are too strict.';
          break;
        case 'bimodal':
          description = `Rating distribution appears bimodal with high variance (SD: ${distribution.standardDeviation}).`;
          recommendation = 'Investigate whether there are two distinct performance groups or inconsistent rating standards.';
          break;
        case 'uniform':
          description = `Rating distribution is unusually flat (SD: ${distribution.standardDeviation}). All ratings cluster around the mean.`;
          recommendation = 'This may indicate central tendency bias - reviewers avoiding extreme ratings.';
          break;
      }

      alerts.push({
        alertType: 'distribution_skew',
        severity: distribution.distributionFit === 'bimodal' || distribution.distributionFit === 'uniform' ? 'high' : 'medium',
        description,
        affectedReviewIds: reviews.map(r => r.reviewId),
        recommendation,
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Generates discussion topics prioritized by importance
   */
  private generateDiscussionTopics(
    reviews: ReviewData[],
    outliers: OutlierResult[],
    biasAlerts: BiasAlert[],
    reviewerAnalysis: ReviewerAnalysis[]
  ): DiscussionTopic[] {
    const topics: DiscussionTopic[] = [];

    // High outliers first
    const highOutliers = outliers.filter(o => o.outlierType === 'high' && o.deviation > 1);
    if (highOutliers.length > 0) {
      topics.push({
        priority: 'high',
        topic: 'Review High Outlier Ratings',
        description: `${highOutliers.length} employee(s) have ratings significantly above peers. Verify these reflect exceptional performance.`,
        relatedReviewIds: highOutliers.map(o => o.reviewId),
        suggestedTime: Math.min(30, highOutliers.length * 5),
      });
    }

    // Low outliers
    const lowOutliers = outliers.filter(o => o.outlierType === 'low' && o.deviation > 1);
    if (lowOutliers.length > 0) {
      topics.push({
        priority: 'high',
        topic: 'Review Low Outlier Ratings',
        description: `${lowOutliers.length} employee(s) have ratings significantly below peers. Ensure fair assessment and documentation.`,
        relatedReviewIds: lowOutliers.map(o => o.reviewId),
        suggestedTime: Math.min(30, lowOutliers.length * 5),
      });
    }

    // High-severity bias alerts
    const highBiasAlerts = biasAlerts.filter(a => a.severity === 'high');
    for (const alert of highBiasAlerts) {
      topics.push({
        priority: 'high',
        topic: `Address ${alert.alertType.replace('_', ' ')}`,
        description: alert.description,
        relatedReviewIds: alert.affectedReviewIds,
        suggestedTime: 10,
      });
    }

    // Borderline ratings (ratings close to cut-offs)
    const borderline = reviews.filter(r =>
      (r.rating >= 2.8 && r.rating <= 3.2) || // "meets expectations" boundary
      (r.rating >= 3.8 && r.rating <= 4.2)    // "exceeds" boundary
    );
    if (borderline.length > 0) {
      topics.push({
        priority: 'medium',
        topic: 'Review Borderline Ratings',
        description: `${borderline.length} employees have ratings near performance tier boundaries. Confirm appropriate tier placement.`,
        relatedReviewIds: borderline.map(r => r.reviewId),
        suggestedTime: Math.min(20, borderline.length * 3),
      });
    }

    // Reviewer calibration
    const inconsistentReviewers = reviewerAnalysis.filter(r => r.ratingVariance < 0.2 && r.reviewCount >= 3);
    if (inconsistentReviewers.length > 0) {
      const affectedReviews = reviews.filter(r =>
        inconsistentReviewers.some(ir => ir.reviewerId === r.reviewerId)
      );
      topics.push({
        priority: 'medium',
        topic: 'Reviewer Differentiation Check',
        description: `${inconsistentReviewers.length} reviewer(s) show very little rating variance, suggesting potential central tendency bias.`,
        relatedReviewIds: affectedReviews.map(r => r.reviewId),
        suggestedTime: 10,
      });
    }

    // Medium bias alerts
    const mediumBiasAlerts = biasAlerts.filter(a => a.severity === 'medium');
    for (const alert of mediumBiasAlerts) {
      topics.push({
        priority: 'medium',
        topic: `Discuss ${alert.alertType.replace('_', ' ')}`,
        description: alert.description,
        relatedReviewIds: alert.affectedReviewIds,
        suggestedTime: 5,
      });
    }

    return topics;
  }

  /**
   * Generates actionable recommendations
   */
  private generateRecommendations(
    reviews: ReviewData[],
    outliers: OutlierResult[],
    biasAlerts: BiasAlert[],
    distribution: DistributionAnalysis
  ): string[] {
    const recommendations: string[] = [];

    if (outliers.length > reviews.length * 0.15) {
      recommendations.push(
        'High outlier rate detected. Consider whether rating criteria need clarification or if there are genuine performance variations.'
      );
    }

    if (biasAlerts.some(a => a.alertType === 'reviewer_bias' && a.severity === 'high')) {
      recommendations.push(
        'Some reviewers show significant rating patterns. Consider targeted calibration coaching before next cycle.'
      );
    }

    if (biasAlerts.some(a => a.alertType === 'language_bias')) {
      recommendations.push(
        'Multiple reviews contain potentially biased language. Share bias detection feedback with reviewers for improvement.'
      );
    }

    if (distribution.distributionFit === 'uniform') {
      recommendations.push(
        'Rating distribution suggests central tendency bias. Encourage reviewers to differentiate performance more clearly.'
      );
    }

    if (distribution.standardDeviation > 1.2) {
      recommendations.push(
        'High rating variance suggests inconsistent standards. Consider additional reviewer training on rating criteria.'
      );
    }

    if (biasAlerts.some(a => a.alertType === 'department_bias')) {
      recommendations.push(
        'Cross-departmental calibration recommended to ensure consistent standards across the organization.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Pre-analysis shows generally consistent ratings. Focus calibration on outliers and borderline cases.'
      );
    }

    return recommendations;
  }

  /**
   * Estimates session duration based on complexity
   */
  private estimateSessionDuration(
    totalReviews: number,
    outlierCount: number,
    highSeverityAlerts: number
  ): number {
    const baseTime = 15; // minutes for setup and intro
    const perReviewTime = 1; // minute per review for overview
    const perOutlierTime = 5; // minutes per outlier discussion
    const perAlertTime = 10; // minutes per high-severity alert

    const estimated = baseTime +
      Math.min(totalReviews * perReviewTime, 30) + // cap overview at 30 min
      outlierCount * perOutlierTime +
      highSeverityAlerts * perAlertTime;

    // Round to nearest 15 minutes
    return Math.ceil(estimated / 15) * 15;
  }

  /**
   * Generates discussion prompt for an outlier
   */
  private generateOutlierDiscussion(review: ReviewData, type: 'high' | 'low', deviation: number): string {
    if (type === 'high') {
      return `${review.revieweeName}'s rating is ${deviation.toFixed(1)} points above average. ` +
        `Discuss: What specific achievements justify this rating? Are there peer comparisons supporting this?`;
    } else {
      return `${review.revieweeName}'s rating is ${deviation.toFixed(1)} points below average. ` +
        `Discuss: Is there documented evidence supporting this rating? Are there extenuating circumstances?`;
    }
  }

  // Helper methods
  private groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
    return items.reduce((groups, item) => {
      const groupKey = String(item[key]);
      const group = groups[groupKey] ?? [];
      group.push(item);
      groups[groupKey] = group;
      return groups;
    }, {} as Record<string, T[]>);
  }

  private normalPDF(x: number, mean: number, stdDev: number): number {
    const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
    return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
    const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }
}

export const calibrationAssistantService = new CalibrationAssistantService();
