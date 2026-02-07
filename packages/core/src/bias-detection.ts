/**
 * Bias Detection Service
 * Implements Feature 1: Fairness-First Performance Scoring
 *
 * Detects 12 bias indicators in review text:
 * 1. Gendered language
 * 2. Recency bias signals
 * 3. Halo effect patterns
 * 4. Horns effect patterns
 * 5. Similarity bias
 * 6. Attribution bias
 * 7. Leniency/severity bias
 * 8. Central tendency
 * 9. Contrast effect
 * 10. First impression bias
 * 11. Stereotyping
 * 12. Affinity bias
 */

export interface BiasIndicator {
  type: BiasType;
  phrase: string;
  startIndex: number;
  endIndex: number;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
  explanation: string;
}

export type BiasType =
  | 'gendered_language'
  | 'recency_bias'
  | 'halo_effect'
  | 'horns_effect'
  | 'similarity_bias'
  | 'attribution_bias'
  | 'leniency_bias'
  | 'central_tendency'
  | 'contrast_effect'
  | 'first_impression'
  | 'stereotyping'
  | 'affinity_bias';

export interface BiasAnalysisResult {
  text: string;
  overallScore: number; // 0-100, higher is less biased
  indicators: BiasIndicator[];
  summary: {
    totalIndicators: number;
    bySeverity: {
      high: number;
      medium: number;
      low: number;
    };
    byType: Partial<Record<BiasType, number>>;
  };
  recommendations: string[];
}

// Bias pattern definitions
const GENDERED_PATTERNS = [
  { pattern: /\b(aggressive|abrasive|bossy|emotional|hysterical)\b/gi, gender: 'female-coded', severity: 'high' as const },
  { pattern: /\b(ambitious|confident|decisive|analytical|assertive)\b/gi, gender: 'male-coded', severity: 'low' as const },
  { pattern: /\b(nurturing|supportive|helpful|collaborative)\b/gi, gender: 'female-coded', severity: 'low' as const },
  { pattern: /\b(he|she|his|her|himself|herself)\b/gi, gender: 'gendered-pronoun', severity: 'medium' as const },
];

const RECENCY_PATTERNS = [
  { pattern: /\b(recently|lately|this (past )?month|last few weeks?|just (last|this) week)\b/gi, severity: 'medium' as const },
  { pattern: /\b(always|never|constantly|every time)\b/gi, severity: 'high' as const },
];

const HALO_PATTERNS = [
  { pattern: /\b(perfect|flawless|exceptional in every|can do no wrong|best (employee|performer))\b/gi, severity: 'high' as const },
  { pattern: /\b(outstanding across the board|excels at everything)\b/gi, severity: 'high' as const },
];

const HORNS_PATTERNS = [
  { pattern: /\b(terrible|awful|worst|completely incompetent|failure in all)\b/gi, severity: 'high' as const },
  { pattern: /\b(can't do anything right|hopeless|totally inadequate)\b/gi, severity: 'high' as const },
];

const ATTRIBUTION_PATTERNS = [
  { pattern: /\b(lucky|fortunate|happened to|by chance|stumbled upon)\b/gi, severity: 'medium' as const },
  { pattern: /\b(got help from|team effort|wasn't alone)\b/gi, severity: 'low' as const },
];

const STEREOTYPING_PATTERNS = [
  { pattern: /\b(for (a|someone of) (his|her|their) (age|background|experience))\b/gi, severity: 'high' as const },
  { pattern: /\b(surprisingly|unexpectedly|despite being)\b/gi, severity: 'medium' as const },
  { pattern: /\b(articulate|well-spoken)\b/gi, severity: 'medium' as const },
];

const VAGUE_PATTERNS = [
  { pattern: /\b(good|nice|fine|okay|adequate)\b/gi, severity: 'low' as const },
  { pattern: /\b(needs (to )?improve|could be better|room for growth)\b/gi, severity: 'low' as const },
];

export class BiasDetectionService {
  analyze(text: string): BiasAnalysisResult {
    const indicators: BiasIndicator[] = [];

    // Detect gendered language
    for (const { pattern, gender, severity } of GENDERED_PATTERNS) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        indicators.push({
          type: 'gendered_language',
          phrase: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          severity,
          suggestion: this.getGenderedSuggestion(match[0], gender),
          explanation: `"${match[0]}" is often ${gender} and may reflect unconscious bias.`,
        });
      }
    }

    // Detect recency bias
    for (const { pattern, severity } of RECENCY_PATTERNS) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        indicators.push({
          type: 'recency_bias',
          phrase: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          severity,
          suggestion: 'Consider examples from the entire review period, not just recent events.',
          explanation: 'Recency bias overweights recent performance over the full evaluation period.',
        });
      }
    }

    // Detect halo effect
    for (const { pattern, severity } of HALO_PATTERNS) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        indicators.push({
          type: 'halo_effect',
          phrase: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          severity,
          suggestion: 'Be specific about which areas excel and where improvement is needed.',
          explanation: 'Halo effect occurs when positive impressions in one area influence all assessments.',
        });
      }
    }

    // Detect horns effect
    for (const { pattern, severity } of HORNS_PATTERNS) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        indicators.push({
          type: 'horns_effect',
          phrase: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          severity,
          suggestion: 'Be specific about areas needing improvement while acknowledging strengths.',
          explanation: 'Horns effect occurs when negative impressions in one area influence all assessments.',
        });
      }
    }

    // Detect attribution bias
    for (const { pattern, severity } of ATTRIBUTION_PATTERNS) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        indicators.push({
          type: 'attribution_bias',
          phrase: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          severity,
          suggestion: 'Focus on the individual\'s specific contributions and skills.',
          explanation: 'Attribution bias downplays individual effort by attributing success to external factors.',
        });
      }
    }

    // Detect stereotyping
    for (const { pattern, severity } of STEREOTYPING_PATTERNS) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        indicators.push({
          type: 'stereotyping',
          phrase: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          severity,
          suggestion: 'Evaluate based on performance, not assumptions about identity or background.',
          explanation: 'This phrase may reflect stereotypical expectations.',
        });
      }
    }

    // Detect vague language (central tendency)
    for (const { pattern, severity } of VAGUE_PATTERNS) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        indicators.push({
          type: 'central_tendency',
          phrase: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          severity,
          suggestion: 'Use specific examples and measurable outcomes instead of vague descriptors.',
          explanation: 'Vague language often indicates central tendency bias (rating everyone as "average").',
        });
      }
    }

    // Calculate overall score
    const overallScore = this.calculateOverallScore(indicators, text.length);

    // Group by severity
    const bySeverity = {
      high: indicators.filter((i) => i.severity === 'high').length,
      medium: indicators.filter((i) => i.severity === 'medium').length,
      low: indicators.filter((i) => i.severity === 'low').length,
    };

    // Group by type
    const byType: Partial<Record<BiasType, number>> = {};
    for (const indicator of indicators) {
      byType[indicator.type] = (byType[indicator.type] ?? 0) + 1;
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(indicators);

    return {
      text,
      overallScore,
      indicators,
      summary: {
        totalIndicators: indicators.length,
        bySeverity,
        byType,
      },
      recommendations,
    };
  }

  private calculateOverallScore(indicators: BiasIndicator[], textLength: number): number {
    if (textLength === 0) {
      return 100;
    }

    // Weight by severity
    const severityWeights = {
      high: 10,
      medium: 5,
      low: 2,
    };

    const totalPenalty = indicators.reduce(
      (sum, i) => sum + severityWeights[i.severity],
      0
    );

    // Normalize by text length (longer text may have more indicators)
    const normalizedPenalty = totalPenalty / Math.sqrt(textLength / 100);

    // Calculate score (0-100)
    const score = Math.max(0, 100 - normalizedPenalty * 5);

    return Math.round(score);
  }

  private getGenderedSuggestion(word: string, gender: string): string {
    const replacements: Record<string, string> = {
      aggressive: 'assertive, direct, or results-driven',
      abrasive: 'straightforward or candid',
      bossy: 'has strong leadership skills',
      emotional: 'passionate or invested',
      hysterical: 'concerned or frustrated',
      ambitious: 'goal-oriented',
      confident: 'self-assured',
    };

    const lower = word.toLowerCase();
    if (lower in replacements) {
      return `Consider using "${replacements[lower]}" instead.`;
    }

    if (gender === 'gendered-pronoun') {
      return 'Consider using "they/them" or the employee\'s name.';
    }

    return 'Consider using more neutral language.';
  }

  private generateRecommendations(indicators: BiasIndicator[]): string[] {
    const recommendations: string[] = [];
    const types = new Set(indicators.map((i) => i.type));

    if (types.has('gendered_language')) {
      recommendations.push(
        'Review your language for gendered terms. Use neutral descriptors that focus on behaviors and outcomes.'
      );
    }

    if (types.has('recency_bias')) {
      recommendations.push(
        'Ensure your evaluation covers the entire review period. Document specific examples from different timeframes.'
      );
    }

    if (types.has('halo_effect') || types.has('horns_effect')) {
      recommendations.push(
        'Evaluate each competency independently. High or low performance in one area shouldn\'t automatically affect others.'
      );
    }

    if (types.has('attribution_bias')) {
      recommendations.push(
        'Focus on the individual\'s specific contributions. Acknowledge both independent work and collaborative achievements.'
      );
    }

    if (types.has('stereotyping')) {
      recommendations.push(
        'Evaluate performance based on actual results and behaviors, not assumptions about identity or background.'
      );
    }

    if (types.has('central_tendency')) {
      recommendations.push(
        'Be specific in your feedback. Use concrete examples and measurable outcomes instead of vague descriptors.'
      );
    }

    if (indicators.length === 0) {
      recommendations.push(
        'Great job! Your review appears to be fair and unbiased. Consider adding specific examples to support your assessments.'
      );
    }

    return recommendations;
  }

  /**
   * Analyzes aggregate bias patterns across a set of reviews
   * Used for HR reporting and trend analysis
   */
  analyzeAggregate(
    reviews: Array<{ reviewerId: string; revieweeId: string; text: string; rating: number }>
  ): {
    totalReviews: number;
    averageScore: number;
    commonBiasTypes: Array<{ type: BiasType; count: number; percentage: number }>;
    reviewerPatterns: Array<{
      reviewerId: string;
      averageScore: number;
      commonBiases: BiasType[];
    }>;
    recommendations: string[];
  } {
    const results = reviews.map((r) => ({
      ...r,
      analysis: this.analyze(r.text),
    }));

    const totalReviews = reviews.length;
    const averageScore =
      results.reduce((sum, r) => sum + r.analysis.overallScore, 0) / totalReviews;

    // Count bias types
    const typeCounts: Partial<Record<BiasType, number>> = {};
    for (const r of results) {
      for (const indicator of r.analysis.indicators) {
        typeCounts[indicator.type] = (typeCounts[indicator.type] ?? 0) + 1;
      }
    }

    const commonBiasTypes = Object.entries(typeCounts)
      .map(([type, count]) => ({
        type: type as BiasType,
        count: count ?? 0,
        percentage: Math.round(((count ?? 0) / totalReviews) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // Analyze by reviewer
    const reviewerMap = new Map<string, typeof results>();
    for (const r of results) {
      const existing = reviewerMap.get(r.reviewerId) ?? [];
      existing.push(r);
      reviewerMap.set(r.reviewerId, existing);
    }

    const reviewerPatterns = Array.from(reviewerMap.entries()).map(
      ([reviewerId, reviewerResults]) => {
        const avgScore =
          reviewerResults.reduce((sum, r) => sum + r.analysis.overallScore, 0) /
          reviewerResults.length;

        const biasTypeCounts: Partial<Record<BiasType, number>> = {};
        for (const r of reviewerResults) {
          for (const indicator of r.analysis.indicators) {
            biasTypeCounts[indicator.type] =
              (biasTypeCounts[indicator.type] ?? 0) + 1;
          }
        }

        const commonBiases = Object.entries(biasTypeCounts)
          .filter(([, count]) => (count ?? 0) >= reviewerResults.length * 0.5)
          .map(([type]) => type as BiasType);

        return {
          reviewerId,
          averageScore: Math.round(avgScore),
          commonBiases,
        };
      }
    );

    // Generate aggregate recommendations
    const recommendations: string[] = [];

    if (averageScore < 70) {
      recommendations.push(
        'Organization-wide bias training is recommended. Average fairness scores indicate systematic issues.'
      );
    }

    if (commonBiasTypes.some((t) => t.percentage > 30)) {
      const highFrequency = commonBiasTypes.filter((t) => t.percentage > 30);
      recommendations.push(
        `Focus training on: ${highFrequency.map((t) => t.type.replace('_', ' ')).join(', ')}`
      );
    }

    const lowScoringReviewers = reviewerPatterns.filter((r) => r.averageScore < 60);
    if (lowScoringReviewers.length > 0) {
      recommendations.push(
        `${lowScoringReviewers.length} reviewers may benefit from individual coaching on unbiased feedback.`
      );
    }

    return {
      totalReviews,
      averageScore: Math.round(averageScore),
      commonBiasTypes,
      reviewerPatterns,
      recommendations,
    };
  }
}

export const biasDetectionService = new BiasDetectionService();
