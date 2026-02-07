/**
 * Performance Benchmarking Service
 * AI-powered statistical benchmarking and comparison
 */

import axios from 'axios';
import { PrismaClient } from '@pms/database';

const prisma = new PrismaClient();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

export interface BenchmarkComparisonResult {
  user_value: number;
  benchmark_value: number;
  percentile_rank: number;
  performance_level: string;
  relative_position: string;
  z_score: number;
  benchmark_stats: {
    mean: number;
    median: number;
    p75: number;
    p90: number;
    std: number;
  };
  strengths: string[];
  improvement_areas: string[];
  recommendations: string[];
}

export class PerformanceBenchmarkingService {
  /**
   * Create or update benchmark
   */
  async createBenchmark(params: {
    tenantId: string;
    benchmarkName: string;
    benchmarkType: 'ROLE' | 'DEPARTMENT' | 'LEVEL' | 'INDUSTRY';
    metricName: string;
    metricCategory: string;
    targetRole?: string;
    targetDepartment?: string;
    targetLevel?: number;
    validFrom: Date;
    validUntil: Date;
  }): Promise<any> {
    // Collect data for benchmark
    const data = await this.collectBenchmarkData(params);

    if (data.length < 10) {
      throw new Error(`Insufficient data points (${data.length}) for reliable benchmark. Need at least 10.`);
    }

    // Calculate statistics
    const values = data.map(d => Number(d.value));
    values.sort((a, b) => a - b);

    const stats = {
      percentile25: this.percentile(values, 25),
      percentile50: this.percentile(values, 50),
      percentile75: this.percentile(values, 75),
      percentile90: this.percentile(values, 90),
      mean: values.reduce((sum, v) => sum + v, 0) / values.length,
      std: this.standardDeviation(values),
      min: Math.min(...values),
      max: Math.max(...values)
    };

    // Store benchmark
    const benchmark = await prisma.performanceBenchmark.upsert({
      where: {
        tenantId_benchmarkType_targetRole_targetDepartment_targetLevel_metricName_validFrom: {
          tenantId: params.tenantId,
          benchmarkType: params.benchmarkType,
          targetRole: params.targetRole || null,
          targetDepartment: params.targetDepartment || null,
          targetLevel: params.targetLevel || null,
          metricName: params.metricName,
          validFrom: params.validFrom
        }
      },
      create: {
        tenantId: params.tenantId,
        benchmarkName: params.benchmarkName,
        benchmarkType: params.benchmarkType,
        targetRole: params.targetRole,
        targetDepartment: params.targetDepartment,
        targetLevel: params.targetLevel,
        metricName: params.metricName,
        metricCategory: params.metricCategory,
        percentile25: stats.percentile25,
        percentile50: stats.percentile50,
        percentile75: stats.percentile75,
        percentile90: stats.percentile90,
        mean: stats.mean,
        standardDeviation: stats.std,
        minValue: stats.min,
        maxValue: stats.max,
        sampleSize: data.length,
        dataPoints: data.length,
        modelVersion: '1.0.0',
        computationMethod: 'STATISTICAL',
        validFrom: params.validFrom,
        validUntil: params.validUntil,
        computedAt: new Date()
      },
      update: {
        percentile25: stats.percentile25,
        percentile50: stats.percentile50,
        percentile75: stats.percentile75,
        percentile90: stats.percentile90,
        mean: stats.mean,
        standardDeviation: stats.std,
        minValue: stats.min,
        maxValue: stats.max,
        sampleSize: data.length,
        dataPoints: data.length,
        computedAt: new Date()
      }
    });

    return benchmark;
  }

  /**
   * Compare user to benchmark
   */
  async compareToBenchmark(params: {
    tenantId: string;
    userId: string;
    metricName: string;
    metricValue: number;
    benchmarkType?: string;
    targetRole?: string;
    targetDepartment?: string;
    targetLevel?: number;
  }): Promise<any> {
    // Find applicable benchmark
    const benchmark = await prisma.performanceBenchmark.findFirst({
      where: {
        tenantId: params.tenantId,
        metricName: params.metricName,
        benchmarkType: params.benchmarkType || 'ROLE',
        ...(params.targetRole && { targetRole: params.targetRole }),
        ...(params.targetDepartment && { targetDepartment: params.targetDepartment }),
        ...(params.targetLevel && { targetLevel: params.targetLevel }),
        isActive: true,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() }
      },
      orderBy: { computedAt: 'desc' }
    });

    if (!benchmark) {
      throw new Error('No applicable benchmark found for the specified criteria');
    }

    // Calculate comparison metrics
    const userValue = params.metricValue;
    const benchmarkValue = Number(benchmark.percentile50);

    // Calculate percentile rank
    const percentileRank = this.calculatePercentileRank(userValue, {
      p25: Number(benchmark.percentile25),
      p50: Number(benchmark.percentile50),
      p75: Number(benchmark.percentile75),
      p90: Number(benchmark.percentile90),
      min: Number(benchmark.minValue),
      max: Number(benchmark.maxValue)
    });

    // Calculate deviation and z-score
    const mean = Number(benchmark.mean);
    const std = Number(benchmark.standardDeviation);
    const deviationFromMean = userValue - mean;
    const zScore = std > 0 ? deviationFromMean / std : 0;

    // Classify performance
    const performanceLevel = this.classifyPerformanceLevel(percentileRank);
    const relativePosition = this.getRelativePosition(percentileRank);

    // Generate insights
    const insights = this.generateInsights(userValue, percentileRank, benchmark);

    // Store comparison
    const comparison = await prisma.performanceComparison.upsert({
      where: {
        tenantId_userId_benchmarkId_comparisonDate: {
          tenantId: params.tenantId,
          userId: params.userId,
          benchmarkId: benchmark.id,
          comparisonDate: new Date()
        }
      },
      create: {
        tenantId: params.tenantId,
        userId: params.userId,
        benchmarkId: benchmark.id,
        userValue,
        benchmarkValue,
        percentileRank,
        deviationFromMean,
        zScore,
        performanceLevel,
        relativePosition,
        strengths: insights.strengths,
        improvementAreas: insights.improvementAreas,
        recommendations: insights.recommendations,
        comparisonDate: new Date()
      },
      update: {
        userValue,
        benchmarkValue,
        percentileRank,
        deviationFromMean,
        zScore,
        performanceLevel,
        relativePosition,
        strengths: insights.strengths,
        improvementAreas: insights.improvementAreas,
        recommendations: insights.recommendations
      }
    });

    return comparison;
  }

  /**
   * Get user's benchmark comparisons
   */
  async getUserComparisons(params: {
    tenantId: string;
    userId: string;
    metricName?: string;
  }): Promise<any[]> {
    return prisma.performanceComparison.findMany({
      where: {
        tenantId: params.tenantId,
        userId: params.userId
      },
      include: {
        benchmark: true
      },
      orderBy: { comparisonDate: 'desc' }
    });
  }

  /**
   * Get team benchmark summary
   */
  async getTeamBenchmarkSummary(params: {
    tenantId: string;
    teamId: string;
    metricName: string;
  }): Promise<any> {
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: params.teamId },
      select: { userId: true }
    });

    const userIds = teamMembers.map(m => m.userId);

    const comparisons = await prisma.performanceComparison.findMany({
      where: {
        tenantId: params.tenantId,
        userId: { in: userIds }
      },
      include: {
        benchmark: {
          where: {
            metricName: params.metricName
          }
        }
      },
      orderBy: { comparisonDate: 'desc' },
      distinct: ['userId']
    });

    const levelDistribution = comparisons.reduce((acc, c) => {
      acc[c.performanceLevel] = (acc[c.performanceLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgPercentileRank = comparisons.reduce((sum, c) => sum + Number(c.percentileRank), 0) / comparisons.length || 0;

    return {
      teamSize: userIds.length,
      comparisonsAvailable: comparisons.length,
      avgPercentileRank: Number(avgPercentileRank.toFixed(2)),
      levelDistribution,
      topPerformers: comparisons.filter(c => c.performanceLevel === 'EXCEPTIONAL').length,
      needsImprovement: comparisons.filter(c => c.performanceLevel === 'BELOW').length
    };
  }

  /**
   * Collect data for benchmark calculation
   */
  private async collectBenchmarkData(params: {
    tenantId: string;
    benchmarkType: string;
    metricName: string;
    targetRole?: string;
    targetDepartment?: string;
    targetLevel?: number;
  }): Promise<Array<{ userId: string; value: number }>> {
    const data: Array<{ userId: string; value: number }> = [];

    // Build where clause based on benchmark type
    const whereClause: any = {
      tenantId: params.tenantId,
      isActive: true
    };

    if (params.benchmarkType === 'ROLE' && params.targetRole) {
      whereClause.jobTitle = params.targetRole;
    } else if (params.benchmarkType === 'DEPARTMENT' && params.targetDepartment) {
      whereClause.departmentId = params.targetDepartment;
    } else if (params.benchmarkType === 'LEVEL' && params.targetLevel) {
      whereClause.level = params.targetLevel;
    }

    // Get users matching criteria
    const users = await prisma.user.findMany({
      where: whereClause,
      select: { id: true }
    });

    // Collect metric values based on metric name
    for (const user of users) {
      let value: number | null = null;

      if (params.metricName === 'productivity_score') {
        const prediction = await prisma.productivityPrediction.findFirst({
          where: { entityType: 'USER', entityId: user.id },
          orderBy: { predictionDate: 'desc' }
        });
        value = prediction ? Number(prediction.actualScore || prediction.predictedScore) : null;
      } else if (params.metricName === 'engagement_score') {
        const engagement = await prisma.engagementScore.findFirst({
          where: { userId: user.id },
          orderBy: { scoreDate: 'desc' }
        });
        value = engagement ? Number(engagement.overallScore) : null;
      }

      if (value !== null) {
        data.push({ userId: user.id, value });
      }
    }

    return data;
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Calculate standard deviation
   */
  private standardDeviation(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate percentile rank for a value
   */
  private calculatePercentileRank(value: number, benchmark: any): number {
    if (value <= benchmark.p25) {
      if (value <= benchmark.min) return 0;
      return 25 * (value - benchmark.min) / (benchmark.p25 - benchmark.min);
    } else if (value <= benchmark.p50) {
      return 25 + 25 * (value - benchmark.p25) / (benchmark.p50 - benchmark.p25);
    } else if (value <= benchmark.p75) {
      return 50 + 25 * (value - benchmark.p50) / (benchmark.p75 - benchmark.p50);
    } else if (value <= benchmark.p90) {
      return 75 + 15 * (value - benchmark.p75) / (benchmark.p90 - benchmark.p75);
    } else {
      if (value >= benchmark.max) return 100;
      return 90 + 10 * (value - benchmark.p90) / (benchmark.max - benchmark.p90);
    }
  }

  /**
   * Classify performance level
   */
  private classifyPerformanceLevel(percentileRank: number): string {
    if (percentileRank >= 90) return 'EXCEPTIONAL';
    if (percentileRank >= 75) return 'ABOVE';
    if (percentileRank >= 25) return 'AT';
    return 'BELOW';
  }

  /**
   * Get relative position
   */
  private getRelativePosition(percentileRank: number): string {
    if (percentileRank >= 90) return 'TOP_10';
    if (percentileRank >= 75) return 'TOP_25';
    if (percentileRank >= 25) return 'MIDDLE_50';
    if (percentileRank >= 10) return 'BOTTOM_25';
    return 'BOTTOM_10';
  }

  /**
   * Generate insights
   */
  private generateInsights(userValue: number, percentileRank: number, benchmark: any): any {
    const strengths: string[] = [];
    const improvementAreas: string[] = [];
    const recommendations: string[] = [];

    if (percentileRank >= 90) {
      strengths.push('Performing in top 10%');
      recommendations.push('Continue current practices');
      recommendations.push('Consider mentoring others');
    } else if (percentileRank >= 75) {
      strengths.push('Above average performance');
      recommendations.push('Look for opportunities to push to top 10%');
    } else if (percentileRank < 25) {
      improvementAreas.push('Performance below 25th percentile');
      recommendations.push('Schedule 1-on-1 to discuss performance');
      recommendations.push('Create focused improvement plan');
    }

    if (userValue < Number(benchmark.mean)) {
      const gap = Number(benchmark.mean) - userValue;
      improvementAreas.push(`${gap.toFixed(1)} points below average`);
    }

    return { strengths, improvementAreas, recommendations };
  }
}
