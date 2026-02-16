import { prisma } from '@pms/database';
import { logger } from '../../utils/logger';
import { dataAggregationService, PeriodType, AggregationType } from './data-aggregation.service';

export type TrendDirection = 'increasing' | 'decreasing' | 'stable' | 'volatile';

interface TrendDataPoint {
  period: string;
  value: number;
  date: Date;
}

interface TrendAnalysisResult {
  metricName: string;
  metricCategory: string;
  periodType: PeriodType;
  periodStart: Date;
  periodEnd: Date;
  periodsAnalyzed: number;
  trendDirection: TrendDirection;
  trendStrength: number; // 0-100
  trendSlope: number;
  currentValue: number;
  previousValue: number;
  changeAbsolute: number;
  changePercentage: number;
  movingAvg7: number;
  movingAvg30: number;
  movingAvg90: number;
  weekOverWeekGrowth: number | null;
  monthOverMonthGrowth: number | null;
  quarterOverQuarterGrowth: number | null;
  yearOverYearGrowth: number | null;
  forecastedValue: number;
  forecastConfidence: number;
  patternsDetected: string[];
  interpretation: string;
  recommendations: string[];
}

/**
 * Trend Analysis Service
 *
 * Provides comprehensive trend analysis including:
 * - Moving averages (7, 30, 90 periods)
 * - Growth rates (WoW, MoM, QoQ, YoY)
 * - Trend detection and classification
 * - Pattern recognition (seasonality, cycles, anomalies)
 * - Forecasting with confidence intervals
 */
export class TrendAnalysisService {
  /**
   * Calculate simple moving average
   */
  private calculateMovingAverage(data: number[], window: number): number {
    if (data.length < window) {
      window = data.length;
    }

    const recentData = data.slice(-window);
    const sum = recentData.reduce((acc, val) => acc + val, 0);
    return sum / window;
  }

  /**
   * Calculate linear regression (trend line)
   */
  private calculateLinearRegression(dataPoints: TrendDataPoint[]): {
    slope: number;
    intercept: number;
    rSquared: number;
  } {
    const n = dataPoints.length;

    if (n === 0) {
      return { slope: 0, intercept: 0, rSquared: 0 };
    }

    // Use indices as x values
    const xValues = dataPoints.map((_, i) => i);
    const yValues = dataPoints.map(d => d.value);

    // Calculate means
    const xMean = xValues.reduce((a, b) => a + b, 0) / n;
    const yMean = yValues.reduce((a, b) => a + b, 0) / n;

    // Calculate slope and intercept
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
      denominator += Math.pow(xValues[i] - xMean, 2);
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = yMean - slope * xMean;

    // Calculate R-squared
    let ssRes = 0; // Sum of squares of residuals
    let ssTot = 0; // Total sum of squares

    for (let i = 0; i < n; i++) {
      const predicted = slope * xValues[i] + intercept;
      ssRes += Math.pow(yValues[i] - predicted, 2);
      ssTot += Math.pow(yValues[i] - yMean, 2);
    }

    const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

    return { slope, intercept, rSquared };
  }

  /**
   * Determine trend direction based on slope and R-squared
   */
  private determineTrendDirection(slope: number, rSquared: number): TrendDirection {
    const threshold = 0.01; // Minimum slope to consider as trending
    const volatilityThreshold = 0.3; // Below this R-squared, trend is volatile

    if (rSquared < volatilityThreshold) {
      return 'volatile';
    }

    if (Math.abs(slope) < threshold) {
      return 'stable';
    }

    return slope > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Calculate trend strength (0-100)
   */
  private calculateTrendStrength(rSquared: number, slope: number, values: number[]): number {
    // Combine R-squared with normalized slope magnitude
    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
    const normalizedSlope = avgValue === 0 ? 0 : Math.abs(slope) / avgValue;

    // Weight R-squared more heavily (70%) vs normalized slope (30%)
    const strength = rSquared * 0.7 + Math.min(normalizedSlope, 1) * 0.3;

    return Math.round(strength * 100);
  }

  /**
   * Detect patterns in the data
   */
  private detectPatterns(dataPoints: TrendDataPoint[]): string[] {
    const patterns: string[] = [];

    if (dataPoints.length < 4) {
      return patterns;
    }

    const values = dataPoints.map(d => d.value);

    // Check for seasonality (simple check: repeating peaks)
    const peaks: number[] = [];
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
        peaks.push(i);
      }
    }

    if (peaks.length >= 3) {
      // Check if peaks are evenly spaced
      const intervals = [];
      for (let i = 1; i < peaks.length; i++) {
        intervals.push(peaks[i] - peaks[i - 1]);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;

      if (variance < avgInterval * 0.2) {
        // Low variance means regular intervals
        patterns.push('seasonality');
      }
    }

    // Check for cycles (alternating up and down trends)
    let direction = 0;
    let cycles = 0;

    for (let i = 1; i < values.length; i++) {
      const currentDirection = values[i] > values[i - 1] ? 1 : -1;
      if (direction !== 0 && direction !== currentDirection) {
        cycles++;
      }
      direction = currentDirection;
    }

    if (cycles >= values.length * 0.4) {
      patterns.push('cyclical');
    }

    // Check for anomalies (values > 2 standard deviations from mean)
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );

    const anomalies = values.filter(val => Math.abs(val - mean) > 2 * stdDev);

    if (anomalies.length > 0) {
      patterns.push(`anomalies_detected_${anomalies.length}`);
    }

    // Check for sustained growth/decline
    let sustained = 0;
    for (let i = 1; i < values.length; i++) {
      if (
        (values[i] > values[i - 1] && direction === 1) ||
        (values[i] < values[i - 1] && direction === -1)
      ) {
        sustained++;
      }
    }

    if (sustained >= values.length * 0.7) {
      patterns.push('sustained_trend');
    }

    return patterns;
  }

  /**
   * Generate interpretation of the trend
   */
  private generateInterpretation(
    metricName: string,
    trendDirection: TrendDirection,
    trendStrength: number,
    changePercentage: number,
    patterns: string[]
  ): string {
    const strength = trendStrength > 70 ? 'strong' : trendStrength > 40 ? 'moderate' : 'weak';
    const change = Math.abs(changePercentage).toFixed(1);

    let interpretation = `${metricName} shows a ${strength} ${trendDirection} trend`;

    if (trendDirection === 'increasing' || trendDirection === 'decreasing') {
      interpretation += ` with a ${change}% change over the period`;
    }

    if (patterns.includes('seasonality')) {
      interpretation += '. Seasonal patterns detected, indicating regular cyclical variations';
    }

    if (patterns.includes('cyclical')) {
      interpretation += '. Cyclical behavior observed with alternating periods of growth and decline';
    }

    if (patterns.some(p => p.startsWith('anomalies_detected'))) {
      const count = patterns.find(p => p.startsWith('anomalies_detected'))?.split('_')[2];
      interpretation += `. ${count} anomalous data points detected that deviate significantly from the norm`;
    }

    if (patterns.includes('sustained_trend')) {
      interpretation += '. The trend shows sustained consistency over the analysis period';
    }

    interpretation += '.';

    return interpretation;
  }

  /**
   * Generate recommendations based on trend analysis
   */
  private generateRecommendations(
    metricName: string,
    metricCategory: string,
    trendDirection: TrendDirection,
    trendStrength: number,
    changePercentage: number,
    patterns: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Performance-related recommendations
    if (metricCategory === 'performance') {
      if (trendDirection === 'decreasing' && trendStrength > 50) {
        recommendations.push(
          `${metricName} is declining significantly. Consider investigating root causes and implementing corrective actions.`
        );
        recommendations.push('Schedule 1:1 meetings to understand challenges and provide support.');
      } else if (trendDirection === 'increasing' && trendStrength > 50) {
        recommendations.push(
          `${metricName} is improving consistently. Identify and document success factors for replication.`
        );
      } else if (trendDirection === 'volatile') {
        recommendations.push(
          `${metricName} shows high volatility. Establish more consistent processes and clearer expectations.`
        );
      }
    }

    // Goal-related recommendations
    if (metricCategory === 'goals') {
      if (trendDirection === 'decreasing' && metricName.includes('completion')) {
        recommendations.push('Goal completion is declining. Review goal difficulty and resource availability.');
        recommendations.push('Consider adjusting goal targets or providing additional support.');
      }

      if (patterns.includes('seasonality')) {
        recommendations.push('Seasonal patterns detected. Plan resource allocation accordingly.');
      }
    }

    // Workload recommendations
    if (metricCategory === 'workload') {
      if (trendDirection === 'increasing' && changePercentage > 20) {
        recommendations.push('Workload is increasing significantly. Monitor for burnout risks.');
        recommendations.push('Consider workload rebalancing or additional resource allocation.');
      }
    }

    // Wellbeing recommendations
    if (metricCategory === 'wellbeing') {
      if (trendDirection === 'decreasing' && trendStrength > 40) {
        recommendations.push('Wellbeing metrics are declining. Prioritize employee support initiatives.');
        recommendations.push('Schedule check-ins and ensure access to wellness resources.');
      }
    }

    // Generic recommendation if no specific ones
    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring this metric for significant changes.');
    }

    return recommendations;
  }

  /**
   * Forecast future value using linear regression
   */
  private forecast(dataPoints: TrendDataPoint[], periodsAhead: number, confidence: number): {
    value: number;
    confidence: number;
  } {
    const { slope, intercept, rSquared } = this.calculateLinearRegression(dataPoints);

    // Forecast value
    const nextX = dataPoints.length + periodsAhead - 1;
    const forecastedValue = slope * nextX + intercept;

    // Confidence decreases with distance and lower R-squared
    const distancePenalty = Math.max(0, 1 - periodsAhead * 0.1);
    const forecastConfidence = rSquared * distancePenalty * 100;

    return {
      value: Math.max(0, forecastedValue), // Ensure non-negative
      confidence: Math.round(forecastConfidence),
    };
  }

  /**
   * Analyze trend for a specific metric
   */
  async analyzeTrend(
    tenantId: string,
    aggregationType: AggregationType,
    entityId: string,
    metricName: string,
    metricCategory: string,
    periodType: PeriodType,
    numberOfPeriods: number = 12
  ): Promise<TrendAnalysisResult> {
    logger.info('Starting trend analysis', {
      tenantId,
      aggregationType,
      entityId,
      metricName,
      periodType,
      numberOfPeriods,
    });

    // Get aggregated data for the periods
    const aggregations = await dataAggregationService.batchAggregateForPeriods(
      tenantId,
      aggregationType,
      entityId,
      periodType,
      numberOfPeriods
    );

    // Extract metric values
    const dataPoints: TrendDataPoint[] = aggregations.map((agg, index) => ({
      period: agg.period,
      value: (agg.metrics as any)[metricName] || 0,
      date: new Date(), // This should be the actual period date
    }));

    const values = dataPoints.map(d => d.value);
    const currentValue = values[values.length - 1] || 0;
    const previousValue = values[values.length - 2] || 0;

    // Calculate changes
    const changeAbsolute = currentValue - previousValue;
    const changePercentage = previousValue === 0 ? 0 : (changeAbsolute / previousValue) * 100;

    // Calculate moving averages
    const movingAvg7 = this.calculateMovingAverage(values, 7);
    const movingAvg30 = this.calculateMovingAverage(values, 30);
    const movingAvg90 = this.calculateMovingAverage(values, 90);

    // Linear regression for trend
    const { slope, rSquared } = this.calculateLinearRegression(dataPoints);

    // Determine trend characteristics
    const trendDirection = this.determineTrendDirection(slope, rSquared);
    const trendStrength = this.calculateTrendStrength(rSquared, slope, values);

    // Pattern detection
    const patternsDetected = this.detectPatterns(dataPoints);

    // Calculate growth rates
    let weekOverWeekGrowth: number | null = null;
    let monthOverMonthGrowth: number | null = null;
    let quarterOverQuarterGrowth: number | null = null;
    let yearOverYearGrowth: number | null = null;

    if (periodType === 'weekly' && values.length >= 2) {
      weekOverWeekGrowth = changePercentage;
    }

    if (periodType === 'monthly' && values.length >= 2) {
      monthOverMonthGrowth = changePercentage;
    }

    if (periodType === 'quarterly' && values.length >= 2) {
      quarterOverQuarterGrowth = changePercentage;
    }

    if (periodType === 'yearly' && values.length >= 2) {
      yearOverYearGrowth = changePercentage;
    }

    // For cross-period growth rates (e.g., YoY in monthly data)
    if (periodType === 'monthly' && values.length >= 12) {
      const valueYearAgo = values[values.length - 13] || 0;
      yearOverYearGrowth = valueYearAgo === 0 ? 0 : ((currentValue - valueYearAgo) / valueYearAgo) * 100;
    }

    if (periodType === 'monthly' && values.length >= 3) {
      const valueQuarterAgo = values[values.length - 4] || 0;
      quarterOverQuarterGrowth =
        valueQuarterAgo === 0 ? 0 : ((currentValue - valueQuarterAgo) / valueQuarterAgo) * 100;
    }

    if (periodType === 'weekly' && values.length >= 4) {
      const valueMonthAgo = values[values.length - 5] || 0;
      monthOverMonthGrowth = valueMonthAgo === 0 ? 0 : ((currentValue - valueMonthAgo) / valueMonthAgo) * 100;
    }

    // Forecasting
    const { value: forecastedValue, confidence: forecastConfidence } = this.forecast(dataPoints, 1, rSquared);

    // Generate interpretation and recommendations
    const interpretation = this.generateInterpretation(
      metricName,
      trendDirection,
      trendStrength,
      changePercentage,
      patternsDetected
    );

    const recommendations = this.generateRecommendations(
      metricName,
      metricCategory,
      trendDirection,
      trendStrength,
      changePercentage,
      patternsDetected
    );

    const { start, end } = dataAggregationService.getPeriodBoundaries(periodType);

    const result: TrendAnalysisResult = {
      metricName,
      metricCategory,
      periodType,
      periodStart: start,
      periodEnd: end,
      periodsAnalyzed: numberOfPeriods,
      trendDirection,
      trendStrength,
      trendSlope: slope,
      currentValue,
      previousValue,
      changeAbsolute,
      changePercentage,
      movingAvg7,
      movingAvg30,
      movingAvg90,
      weekOverWeekGrowth,
      monthOverMonthGrowth,
      quarterOverQuarterGrowth,
      yearOverYearGrowth,
      forecastedValue,
      forecastConfidence,
      patternsDetected,
      interpretation,
      recommendations,
    };

    logger.info('Trend analysis completed', {
      tenantId,
      metricName,
      trendDirection,
      trendStrength,
      changePercentage,
    });

    return result;
  }

  /**
   * Save trend analysis to database
   */
  async saveTrendAnalysis(
    tenantId: string,
    entityType: AggregationType,
    entityId: string,
    analysis: TrendAnalysisResult
  ): Promise<void> {
    await prisma.trendAnalysis.upsert({
      where: {
        tenantId_entityType_entityId_metricName_periodType_periodStart: {
          tenantId,
          entityType,
          entityId,
          metricName: analysis.metricName,
          periodType: analysis.periodType,
          periodStart: analysis.periodStart,
        },
      },
      create: {
        tenantId,
        entityType,
        entityId,
        metricName: analysis.metricName,
        metricCategory: analysis.metricCategory,
        periodType: analysis.periodType,
        periodStart: analysis.periodStart,
        periodEnd: analysis.periodEnd,
        periodsAnalyzed: analysis.periodsAnalyzed,
        trendDirection: analysis.trendDirection,
        trendStrength: analysis.trendStrength,
        trendSlope: analysis.trendSlope,
        currentValue: analysis.currentValue,
        previousValue: analysis.previousValue,
        changeAbsolute: analysis.changeAbsolute,
        changePercentage: analysis.changePercentage,
        movingAvg7: analysis.movingAvg7,
        movingAvg30: analysis.movingAvg30,
        movingAvg90: analysis.movingAvg90,
        weekOverWeekGrowth: analysis.weekOverWeekGrowth,
        monthOverMonthGrowth: analysis.monthOverMonthGrowth,
        quarterOverQuarterGrowth: analysis.quarterOverQuarterGrowth,
        yearOverYearGrowth: analysis.yearOverYearGrowth,
        forecastedValue: analysis.forecastedValue,
        forecastConfidence: analysis.forecastConfidence,
        patternsDetected: analysis.patternsDetected,
        interpretation: analysis.interpretation,
        recommendations: analysis.recommendations,
        calculationMethod: 'linear_regression',
        dataPoints: analysis.periodsAnalyzed,
        dataQuality: 100,
      },
      update: {
        trendDirection: analysis.trendDirection,
        trendStrength: analysis.trendStrength,
        trendSlope: analysis.trendSlope,
        currentValue: analysis.currentValue,
        previousValue: analysis.previousValue,
        changeAbsolute: analysis.changeAbsolute,
        changePercentage: analysis.changePercentage,
        movingAvg7: analysis.movingAvg7,
        movingAvg30: analysis.movingAvg30,
        movingAvg90: analysis.movingAvg90,
        weekOverWeekGrowth: analysis.weekOverWeekGrowth,
        monthOverMonthGrowth: analysis.monthOverMonthGrowth,
        quarterOverQuarterGrowth: analysis.quarterOverQuarterGrowth,
        yearOverYearGrowth: analysis.yearOverYearGrowth,
        forecastedValue: analysis.forecastedValue,
        forecastConfidence: analysis.forecastConfidence,
        patternsDetected: analysis.patternsDetected,
        interpretation: analysis.interpretation,
        recommendations: analysis.recommendations,
        updatedAt: new Date(),
      },
    });

    logger.info('Trend analysis saved to database', {
      tenantId,
      entityType,
      entityId,
      metricName: analysis.metricName,
    });
  }

  /**
   * Batch analyze multiple metrics
   */
  async batchAnalyzeTrends(
    tenantId: string,
    aggregationType: AggregationType,
    entityId: string,
    metrics: Array<{ name: string; category: string }>,
    periodType: PeriodType,
    numberOfPeriods: number = 12
  ): Promise<TrendAnalysisResult[]> {
    const results: TrendAnalysisResult[] = [];

    for (const metric of metrics) {
      const analysis = await this.analyzeTrend(
        tenantId,
        aggregationType,
        entityId,
        metric.name,
        metric.category,
        periodType,
        numberOfPeriods
      );

      results.push(analysis);

      // Save to database
      await this.saveTrendAnalysis(tenantId, aggregationType, entityId, analysis);
    }

    return results;
  }
}

export const trendAnalysisService = new TrendAnalysisService();
