import { describe, it, expect, beforeEach } from 'vitest';
import { BiasDetectionService, type BiasType } from './bias-detection';

describe('BiasDetectionService', () => {
  let service: BiasDetectionService;

  beforeEach(() => {
    service = new BiasDetectionService();
  });

  describe('analyze', () => {
    describe('gendered language detection', () => {
      it('should detect high-severity gendered words', () => {
        const result = service.analyze('She is aggressive and bossy in meetings.');

        const genderedIndicators = result.indicators.filter(
          (i) => i.type === 'gendered_language'
        );

        expect(genderedIndicators.length).toBeGreaterThan(0);
        expect(genderedIndicators.some((i) => i.phrase.toLowerCase() === 'aggressive')).toBe(true);
        expect(genderedIndicators.some((i) => i.phrase.toLowerCase() === 'bossy')).toBe(true);
      });

      it('should detect gendered pronouns', () => {
        const result = service.analyze('He did a great job on his project.');

        const pronounIndicators = result.indicators.filter(
          (i) => i.type === 'gendered_language' && i.phrase.toLowerCase().match(/\bhe\b|\bhis\b/)
        );

        expect(pronounIndicators.length).toBeGreaterThan(0);
        expect(pronounIndicators[0].suggestion).toContain('they');
      });

      it('should provide appropriate suggestions for gendered terms', () => {
        const result = service.analyze('The employee was emotional during the review.');

        const emotional = result.indicators.find(
          (i) => i.phrase.toLowerCase() === 'emotional'
        );

        expect(emotional).toBeDefined();
        expect(emotional?.suggestion).toContain('passionate');
      });
    });

    describe('recency bias detection', () => {
      it('should detect recency indicators', () => {
        const result = service.analyze('Recently, John has been underperforming.');

        const recencyIndicators = result.indicators.filter(
          (i) => i.type === 'recency_bias'
        );

        expect(recencyIndicators.length).toBeGreaterThan(0);
        expect(recencyIndicators[0].phrase.toLowerCase()).toContain('recently');
      });

      it('should flag absolute terms as high severity recency bias', () => {
        const result = service.analyze('She always misses deadlines and never follows up.');

        const highSeverity = result.indicators.filter(
          (i) => i.type === 'recency_bias' && i.severity === 'high'
        );

        expect(highSeverity.length).toBeGreaterThanOrEqual(2);
        expect(highSeverity.some((i) => i.phrase.toLowerCase() === 'always')).toBe(true);
        expect(highSeverity.some((i) => i.phrase.toLowerCase() === 'never')).toBe(true);
      });
    });

    describe('halo effect detection', () => {
      it('should detect halo effect language', () => {
        const result = service.analyze('John is the best employee and perfect in every way.');

        const haloIndicators = result.indicators.filter((i) => i.type === 'halo_effect');

        expect(haloIndicators.length).toBeGreaterThan(0);
        expect(haloIndicators.some((i) => i.phrase.toLowerCase().includes('perfect'))).toBe(true);
      });

      it('should flag exceptional across the board', () => {
        const result = service.analyze('She excels at everything and can do no wrong.');

        const haloIndicators = result.indicators.filter((i) => i.type === 'halo_effect');

        expect(haloIndicators.length).toBeGreaterThan(0);
      });
    });

    describe('horns effect detection', () => {
      it('should detect horns effect language', () => {
        const result = service.analyze('This employee is terrible and completely incompetent.');

        const hornsIndicators = result.indicators.filter((i) => i.type === 'horns_effect');

        expect(hornsIndicators.length).toBeGreaterThan(0);
        expect(hornsIndicators.some((i) => i.severity === 'high')).toBe(true);
      });
    });

    describe('attribution bias detection', () => {
      it('should detect attribution bias language', () => {
        const result = service.analyze('She was lucky to close that deal and got help from the team.');

        const attributionIndicators = result.indicators.filter(
          (i) => i.type === 'attribution_bias'
        );

        expect(attributionIndicators.length).toBeGreaterThan(0);
        expect(attributionIndicators.some((i) => i.phrase.toLowerCase() === 'lucky')).toBe(true);
      });
    });

    describe('stereotyping detection', () => {
      it('should detect stereotyping language', () => {
        const result = service.analyze('For someone of her background, she is surprisingly articulate.');

        const stereotypingIndicators = result.indicators.filter(
          (i) => i.type === 'stereotyping'
        );

        expect(stereotypingIndicators.length).toBeGreaterThan(0);
      });

      it('should flag condescending phrases', () => {
        const result = service.analyze('He is surprisingly well-spoken for someone of his age.');

        const stereotypingIndicators = result.indicators.filter(
          (i) => i.type === 'stereotyping'
        );

        // Should detect "surprisingly" and/or "for someone of his age"
        expect(stereotypingIndicators.length).toBeGreaterThan(0);
      });
    });

    describe('central tendency detection', () => {
      it('should detect vague language', () => {
        const result = service.analyze('Performance is good and okay overall.');

        const vagueIndicators = result.indicators.filter(
          (i) => i.type === 'central_tendency'
        );

        expect(vagueIndicators.length).toBeGreaterThan(0);
        expect(vagueIndicators.some((i) => i.phrase.toLowerCase() === 'good')).toBe(true);
        expect(vagueIndicators.some((i) => i.phrase.toLowerCase() === 'okay')).toBe(true);
      });
    });

    describe('overall score calculation', () => {
      it('should return high score for unbiased text', () => {
        const result = service.analyze(
          'The employee completed 15 projects this quarter, exceeding the target of 10. ' +
          'Documentation was thorough and code reviews showed 95% test coverage.'
        );

        expect(result.overallScore).toBeGreaterThan(80);
      });

      it('should return low score for heavily biased text', () => {
        const result = service.analyze(
          'She is always aggressive and bossy. For her age, she is surprisingly good. ' +
          'Recently she was lucky to close a deal.'
        );

        expect(result.overallScore).toBeLessThan(60);
      });

      it('should return 100 for empty text', () => {
        const result = service.analyze('');

        expect(result.overallScore).toBe(100);
      });
    });

    describe('summary generation', () => {
      it('should correctly summarize indicators by severity', () => {
        const result = service.analyze('She always acts aggressive and bossy in meetings.');

        expect(result.summary.bySeverity).toHaveProperty('high');
        expect(result.summary.bySeverity).toHaveProperty('medium');
        expect(result.summary.bySeverity).toHaveProperty('low');
        expect(result.summary.totalIndicators).toBe(
          result.summary.bySeverity.high + result.summary.bySeverity.medium + result.summary.bySeverity.low
        );
      });

      it('should correctly summarize indicators by type', () => {
        const result = service.analyze('He always performs good recently.');

        expect(result.summary.byType).toBeDefined();
        expect(Object.keys(result.summary.byType).length).toBeGreaterThan(0);
      });
    });

    describe('recommendations', () => {
      it('should generate recommendations for detected biases', () => {
        const result = service.analyze('She is always aggressive.');

        expect(result.recommendations.length).toBeGreaterThan(0);
        expect(result.recommendations.some((r) => r.toLowerCase().includes('gender'))).toBe(true);
      });

      it('should provide positive feedback for unbiased text', () => {
        const result = service.analyze(
          'Completed all assigned tasks with high quality deliverables.'
        );

        expect(result.recommendations.some((r) => r.toLowerCase().includes('great job'))).toBe(true);
      });
    });
  });

  describe('analyzeAggregate', () => {
    const mockReviews = [
      { reviewerId: 'rev1', revieweeId: 'emp1', text: 'She is always aggressive.', rating: 3 },
      { reviewerId: 'rev1', revieweeId: 'emp2', text: 'He is bossy and emotional.', rating: 2 },
      { reviewerId: 'rev2', revieweeId: 'emp3', text: 'Completed tasks on time.', rating: 4 },
      { reviewerId: 'rev2', revieweeId: 'emp4', text: 'Good performance overall.', rating: 3 },
      { reviewerId: 'rev3', revieweeId: 'emp5', text: 'Recently has been lucky.', rating: 3 },
    ];

    it('should calculate correct total reviews', () => {
      const result = service.analyzeAggregate(mockReviews);

      expect(result.totalReviews).toBe(5);
    });

    it('should calculate average score', () => {
      const result = service.analyzeAggregate(mockReviews);

      expect(result.averageScore).toBeGreaterThan(0);
      expect(result.averageScore).toBeLessThanOrEqual(100);
    });

    it('should identify common bias types', () => {
      const result = service.analyzeAggregate(mockReviews);

      expect(result.commonBiasTypes).toBeDefined();
      expect(Array.isArray(result.commonBiasTypes)).toBe(true);
    });

    it('should analyze patterns by reviewer', () => {
      const result = service.analyzeAggregate(mockReviews);

      expect(result.reviewerPatterns.length).toBeGreaterThan(0);

      const rev1Pattern = result.reviewerPatterns.find((p) => p.reviewerId === 'rev1');
      expect(rev1Pattern).toBeDefined();
      expect(rev1Pattern?.averageScore).toBeLessThan(result.averageScore);
    });

    it('should generate aggregate recommendations', () => {
      const result = service.analyzeAggregate(mockReviews);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate percentage for each bias type', () => {
      const result = service.analyzeAggregate(mockReviews);

      for (const biasType of result.commonBiasTypes) {
        expect(biasType.percentage).toBeGreaterThanOrEqual(0);
        expect(biasType.percentage).toBeLessThanOrEqual(100);
      }
    });
  });
});
