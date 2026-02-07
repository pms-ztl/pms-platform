import { describe, it, expect, beforeEach } from 'vitest';
import { CalibrationAssistantService, type ReviewData } from './calibration-assistant';

describe('CalibrationAssistantService', () => {
  let service: CalibrationAssistantService;

  const createMockReviews = (count: number, options?: {
    ratings?: number[];
    departments?: string[];
    levels?: number[];
    reviewerIds?: string[];
  }): ReviewData[] => {
    const reviews: ReviewData[] = [];
    for (let i = 0; i < count; i++) {
      reviews.push({
        reviewId: `review-${i}`,
        revieweeId: `emp-${i}`,
        revieweeName: `Employee ${i}`,
        reviewerId: options?.reviewerIds?.[i] ?? `reviewer-${i % 3}`,
        reviewerName: `Reviewer ${i % 3}`,
        departmentId: options?.departments?.[i] ?? `dept-${i % 2}`,
        departmentName: `Department ${i % 2}`,
        level: options?.levels?.[i] ?? ((i % 5) + 1),
        rating: options?.ratings?.[i] ?? 3 + Math.random() * 1.5,
        content: 'Employee demonstrated solid performance during the review period.',
        strengths: ['Communication', 'Problem solving'],
        areasForGrowth: ['Time management'],
      });
    }
    return reviews;
  };

  beforeEach(() => {
    service = new CalibrationAssistantService();
  });

  describe('analyzePreSession', () => {
    it('should return complete pre-analysis structure', () => {
      const reviews = createMockReviews(10);
      const result = service.analyzePreSession(reviews, 'session-123');

      expect(result).toHaveProperty('sessionId', 'session-123');
      expect(result).toHaveProperty('analyzedAt');
      expect(result).toHaveProperty('totalReviews', 10);
      expect(result).toHaveProperty('outliers');
      expect(result).toHaveProperty('biasAlerts');
      expect(result).toHaveProperty('distributionAnalysis');
      expect(result).toHaveProperty('reviewerAnalysis');
      expect(result).toHaveProperty('discussionTopics');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('estimatedSessionDuration');
    });

    it('should handle empty reviews array', () => {
      const result = service.analyzePreSession([], 'session-empty');

      expect(result.totalReviews).toBe(0);
      expect(result.distributionAnalysis.mean).toBe(0);
      expect(result.outliers).toHaveLength(0);
    });

    it('should set correct session timestamp', () => {
      const before = new Date();
      const reviews = createMockReviews(5);
      const result = service.analyzePreSession(reviews, 'session-time');
      const after = new Date();

      expect(result.analyzedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.analyzedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('distribution analysis', () => {
    it('should calculate correct mean', () => {
      const reviews = createMockReviews(5, {
        ratings: [2, 3, 4, 4, 5],
      });
      const result = service.analyzePreSession(reviews, 'session-mean');

      expect(result.distributionAnalysis.mean).toBe(3.6);
    });

    it('should calculate correct median for odd count', () => {
      const reviews = createMockReviews(5, {
        ratings: [1, 2, 3, 4, 5],
      });
      const result = service.analyzePreSession(reviews, 'session-median');

      expect(result.distributionAnalysis.median).toBe(3);
    });

    it('should calculate correct median for even count', () => {
      const reviews = createMockReviews(4, {
        ratings: [1, 2, 4, 5],
      });
      const result = service.analyzePreSession(reviews, 'session-median-even');

      expect(result.distributionAnalysis.median).toBe(3);
    });

    it('should calculate standard deviation', () => {
      const reviews = createMockReviews(5, {
        ratings: [3, 3, 3, 3, 3],
      });
      const result = service.analyzePreSession(reviews, 'session-std');

      expect(result.distributionAnalysis.standardDeviation).toBe(0);
    });

    it('should detect skewed high distribution', () => {
      // Ratings concentrated at low end with tail toward high = positive skewness
      const reviews = createMockReviews(10, {
        ratings: [1, 1, 1, 1.5, 2, 2, 2, 3, 4, 5],
      });
      const result = service.analyzePreSession(reviews, 'session-skew-high');

      // Positive skewness = skewed_high (tail toward higher values)
      expect(result.distributionAnalysis.distributionFit).toBe('skewed_high');
    });

    it('should detect skewed low distribution', () => {
      // Ratings concentrated at high end with tail toward low = negative skewness
      const reviews = createMockReviews(10, {
        ratings: [1, 2, 3, 4, 4.5, 4.5, 5, 5, 5, 5],
      });
      const result = service.analyzePreSession(reviews, 'session-skew-low');

      // Negative skewness = skewed_low (tail toward lower values)
      expect(result.distributionAnalysis.distributionFit).toBe('skewed_low');
    });

    it('should detect uniform distribution', () => {
      const reviews = createMockReviews(10, {
        ratings: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      });
      const result = service.analyzePreSession(reviews, 'session-uniform');

      expect(result.distributionAnalysis.distributionFit).toBe('uniform');
    });

    it('should populate distribution buckets', () => {
      const reviews = createMockReviews(10, {
        ratings: [1, 2, 3, 3.5, 4, 4, 4.5, 5, 5, 5],
      });
      const result = service.analyzePreSession(reviews, 'session-buckets');

      expect(result.distributionAnalysis.distribution).toHaveProperty('3.0');
      expect(result.distributionAnalysis.distribution).toHaveProperty('5.0');
    });
  });

  describe('outlier detection', () => {
    it('should detect high outliers', () => {
      const reviews = createMockReviews(10, {
        ratings: [3, 3, 3, 3, 3, 3, 3, 3, 3, 5],
      });
      const result = service.analyzePreSession(reviews, 'session-outlier-high');

      const highOutliers = result.outliers.filter((o) => o.outlierType === 'high');
      expect(highOutliers.length).toBeGreaterThan(0);
    });

    it('should detect low outliers', () => {
      const reviews = createMockReviews(10, {
        ratings: [3, 3, 3, 3, 3, 3, 3, 3, 3, 1],
      });
      const result = service.analyzePreSession(reviews, 'session-outlier-low');

      const lowOutliers = result.outliers.filter((o) => o.outlierType === 'low');
      expect(lowOutliers.length).toBeGreaterThan(0);
    });

    it('should include percentile for outliers', () => {
      const reviews = createMockReviews(10, {
        ratings: [3, 3, 3, 3, 3, 3, 3, 3, 3, 5],
      });
      const result = service.analyzePreSession(reviews, 'session-percentile');

      for (const outlier of result.outliers) {
        expect(outlier.percentile).toBeGreaterThanOrEqual(0);
        expect(outlier.percentile).toBeLessThanOrEqual(100);
      }
    });

    it('should generate discussion suggestion for outliers', () => {
      const reviews = createMockReviews(10, {
        ratings: [3, 3, 3, 3, 3, 3, 3, 3, 3, 5],
      });
      const result = service.analyzePreSession(reviews, 'session-discussion');

      for (const outlier of result.outliers) {
        expect(outlier.suggestedDiscussion).toBeTruthy();
        expect(outlier.suggestedDiscussion.length).toBeGreaterThan(0);
      }
    });

    it('should not detect outliers with insufficient data', () => {
      const reviews = createMockReviews(3, {
        ratings: [1, 3, 5],
      });
      const result = service.analyzePreSession(reviews, 'session-insufficient');

      expect(result.outliers.length).toBe(0);
    });
  });

  describe('reviewer analysis', () => {
    it('should analyze reviewers with multiple reviews', () => {
      const reviews = createMockReviews(9, {
        reviewerIds: ['rev-1', 'rev-1', 'rev-1', 'rev-2', 'rev-2', 'rev-2', 'rev-3', 'rev-3', 'rev-3'],
        ratings: [4, 4.5, 4, 2, 2.5, 2, 3, 3, 3],
      });
      const result = service.analyzePreSession(reviews, 'session-reviewer');

      expect(result.reviewerAnalysis.length).toBeGreaterThan(0);

      const lenientReviewer = result.reviewerAnalysis.find((r) => r.trend === 'lenient');
      const strictReviewer = result.reviewerAnalysis.find((r) => r.trend === 'strict');

      expect(lenientReviewer).toBeDefined();
      expect(strictReviewer).toBeDefined();
    });

    it('should calculate bias score for reviewers', () => {
      const reviews = createMockReviews(6, {
        reviewerIds: ['rev-1', 'rev-1', 'rev-1', 'rev-2', 'rev-2', 'rev-2'],
        ratings: [3, 3, 3, 3, 3, 3],
      });
      const result = service.analyzePreSession(reviews, 'session-bias-score');

      for (const reviewer of result.reviewerAnalysis) {
        expect(reviewer.biasScore).toBeGreaterThanOrEqual(0);
        expect(reviewer.biasScore).toBeLessThanOrEqual(100);
      }
    });

    it('should skip reviewers with single review', () => {
      const reviews = createMockReviews(3, {
        reviewerIds: ['rev-1', 'rev-2', 'rev-3'],
      });
      const result = service.analyzePreSession(reviews, 'session-single-reviewer');

      expect(result.reviewerAnalysis.length).toBe(0);
    });
  });

  describe('bias alerts', () => {
    it('should detect department bias', () => {
      const reviews = createMockReviews(10, {
        departments: ['dept-a', 'dept-a', 'dept-a', 'dept-a', 'dept-a', 'dept-b', 'dept-b', 'dept-b', 'dept-b', 'dept-b'],
        ratings: [4, 4.5, 4.5, 4, 4.5, 2, 2.5, 2, 2.5, 2],
      });
      const result = service.analyzePreSession(reviews, 'session-dept-bias');

      const deptBias = result.biasAlerts.find((a) => a.alertType === 'department_bias');
      expect(deptBias).toBeDefined();
    });

    it('should detect level bias (correlation)', () => {
      const reviews = createMockReviews(15, {
        levels: [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5],
        ratings: [2, 2.5, 2, 3, 3, 3, 3.5, 3.5, 3.5, 4, 4, 4, 4.5, 4.5, 5],
      });
      const result = service.analyzePreSession(reviews, 'session-level-bias');

      const levelBias = result.biasAlerts.find((a) => a.alertType === 'level_bias');
      expect(levelBias).toBeDefined();
    });

    it('should detect distribution skew', () => {
      const reviews = createMockReviews(10, {
        ratings: [4.5, 4.5, 5, 5, 5, 5, 5, 5, 5, 5],
      });
      const result = service.analyzePreSession(reviews, 'session-dist-skew');

      const distSkew = result.biasAlerts.find((a) => a.alertType === 'distribution_skew');
      expect(distSkew).toBeDefined();
    });

    it('should sort alerts by severity', () => {
      const reviews = createMockReviews(20, {
        departments: Array(10).fill('dept-a').concat(Array(10).fill('dept-b')),
        ratings: Array(10).fill(4.5).concat(Array(10).fill(2)),
      });
      const result = service.analyzePreSession(reviews, 'session-alert-sort');

      if (result.biasAlerts.length > 1) {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        for (let i = 1; i < result.biasAlerts.length; i++) {
          expect(
            severityOrder[result.biasAlerts[i].severity]
          ).toBeGreaterThanOrEqual(severityOrder[result.biasAlerts[i - 1].severity]);
        }
      }
    });
  });

  describe('discussion topics', () => {
    it('should generate topics for outliers', () => {
      const reviews = createMockReviews(10, {
        ratings: [3, 3, 3, 3, 3, 3, 3, 3, 1, 5],
      });
      const result = service.analyzePreSession(reviews, 'session-topics-outliers');

      const outlierTopics = result.discussionTopics.filter(
        (t) => t.topic.toLowerCase().includes('outlier')
      );
      expect(outlierTopics.length).toBeGreaterThan(0);
    });

    it('should prioritize high priority topics', () => {
      const reviews = createMockReviews(10, {
        ratings: [3, 3, 3, 3, 3, 3, 3, 3, 1, 5],
      });
      const result = service.analyzePreSession(reviews, 'session-topic-priority');

      const highPriority = result.discussionTopics.filter((t) => t.priority === 'high');
      expect(highPriority.length).toBeGreaterThan(0);
    });

    it('should estimate time for each topic', () => {
      const reviews = createMockReviews(10, {
        ratings: [3, 3, 3, 3, 3, 3, 3, 3, 1, 5],
      });
      const result = service.analyzePreSession(reviews, 'session-topic-time');

      for (const topic of result.discussionTopics) {
        expect(topic.suggestedTime).toBeGreaterThan(0);
      }
    });

    it('should include related review IDs', () => {
      const reviews = createMockReviews(10, {
        ratings: [3, 3, 3, 3, 3, 3, 3, 3, 1, 5],
      });
      const result = service.analyzePreSession(reviews, 'session-topic-reviews');

      for (const topic of result.discussionTopics) {
        expect(Array.isArray(topic.relatedReviewIds)).toBe(true);
      }
    });
  });

  describe('session duration estimation', () => {
    it('should estimate reasonable duration for small session', () => {
      const reviews = createMockReviews(5);
      const result = service.analyzePreSession(reviews, 'session-duration-small');

      expect(result.estimatedSessionDuration).toBeGreaterThanOrEqual(15);
      expect(result.estimatedSessionDuration).toBeLessThanOrEqual(120);
    });

    it('should estimate longer duration for complex session', () => {
      const reviews = createMockReviews(30, {
        ratings: [
          ...Array(10).fill(1),
          ...Array(10).fill(3),
          ...Array(10).fill(5),
        ],
      });
      const result = service.analyzePreSession(reviews, 'session-duration-complex');

      expect(result.estimatedSessionDuration).toBeGreaterThan(30);
    });

    it('should round duration to nearest 15 minutes', () => {
      const reviews = createMockReviews(10);
      const result = service.analyzePreSession(reviews, 'session-duration-round');

      expect(result.estimatedSessionDuration % 15).toBe(0);
    });
  });

  describe('recommendations', () => {
    it('should generate recommendations', () => {
      const reviews = createMockReviews(10);
      const result = service.analyzePreSession(reviews, 'session-recommendations');

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should recommend differentiation for uniform distribution', () => {
      // Uniform distribution (all same rating = low std deviation) triggers differentiate recommendation
      const reviews = createMockReviews(10, {
        ratings: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      });
      const result = service.analyzePreSession(reviews, 'session-reco-training');

      const hasDifferentiateReco = result.recommendations.some(
        (r) => r.toLowerCase().includes('differentiate') || r.toLowerCase().includes('central tendency')
      );
      expect(hasDifferentiateReco).toBe(true);
    });

    it('should provide positive recommendation when no issues', () => {
      const reviews = createMockReviews(5, {
        ratings: [2.5, 3, 3.5, 3.5, 4],
      });
      const result = service.analyzePreSession(reviews, 'session-reco-positive');

      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
});
