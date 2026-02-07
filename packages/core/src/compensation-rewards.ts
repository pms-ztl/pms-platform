/**
 * Compensation & Rewards Module
 *
 * Comprehensive compensation management system integrating pay equity analysis,
 * merit-based compensation, bonus calculations, and reward administration with
 * performance data.
 *
 * Key capabilities:
 * - Pay equity analysis and gap detection
 * - Performance-linked compensation modeling
 * - Merit increase calculations
 * - Bonus pool management
 * - Equity/stock award administration
 * - Total rewards statements
 * - Compensation benchmarking
 * - Budget planning and tracking
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

// ============================================================================
// Type Definitions
// ============================================================================

export type CompensationType = 'base_salary' | 'bonus' | 'equity' | 'commission' | 'allowance' | 'benefits';

export type MeritBasis = 'performance' | 'market' | 'tenure' | 'promotion' | 'retention' | 'equity_adjustment';

export type EquityVestingSchedule = 'cliff_1yr' | 'monthly_4yr' | 'quarterly_4yr' | 'custom';

export interface CompensationBand {
  id: string;
  tenantId: string;
  levelId: string;
  levelName: string;
  jobFamily: string;
  location: string;
  currency: string;
  minimumSalary: number;
  midpointSalary: number;
  maximumSalary: number;
  targetBonus: number; // Percentage of base
  equityRange: { min: number; max: number };
  effectiveDate: Date;
  expiryDate?: Date;
}

export interface EmployeeCompensation {
  userId: string;
  tenantId: string;
  baseSalary: number;
  currency: string;
  salaryEffectiveDate: Date;
  targetBonus: number;
  actualBonus?: number;
  bonusPeriod?: string;
  equityGrants: EquityGrant[];
  allowances: Allowance[];
  benefits: Benefit[];
  totalCashCompensation: number;
  totalDirectCompensation: number;
  compaRatio: number;
  bandPosition: number; // 0-1 position within band
  lastReviewDate: Date;
}

export interface EquityGrant {
  id: string;
  grantType: 'rsu' | 'iso' | 'nso' | 'phantom';
  grantDate: Date;
  vestingSchedule: EquityVestingSchedule;
  totalShares: number;
  vestedShares: number;
  unvestedShares: number;
  grantPrice?: number;
  currentValue: number;
  vestingEvents: VestingEvent[];
}

export interface VestingEvent {
  date: Date;
  shares: number;
  vested: boolean;
  value?: number;
}

export interface Allowance {
  type: string;
  amount: number;
  frequency: 'monthly' | 'annual' | 'one_time';
  startDate: Date;
  endDate?: Date;
}

export interface Benefit {
  type: string;
  description: string;
  employerCost: number;
  employeeContribution: number;
}

export interface MeritIncreaseRecommendation {
  userId: string;
  currentSalary: number;
  recommendedIncrease: number;
  recommendedPercentage: number;
  basis: MeritBasis[];
  performanceRating: number;
  compaRatioBefore: number;
  compaRatioAfter: number;
  justification: string[];
  alternativeOptions: AlternativeCompOption[];
  constraints: string[];
  approved: boolean;
  approvedAmount?: number;
}

export interface AlternativeCompOption {
  type: CompensationType;
  amount: number;
  rationale: string;
  taxImplication: string;
}

export interface PayEquityAnalysis {
  tenantId: string;
  analysisDate: Date;
  overallEquityScore: number;
  gapsByDimension: EquityGapDimension[];
  highRiskCases: PayEquityCase[];
  trendAnalysis: EquityTrend[];
  recommendations: EquityRecommendation[];
  legalRiskScore: number;
}

export interface EquityGapDimension {
  dimension: 'gender' | 'age' | 'ethnicity' | 'tenure' | 'location' | 'department';
  gapPercentage: number;
  statisticalSignificance: number;
  affectedEmployees: number;
  medianDifference: number;
  controlledGap: number; // After controlling for job-related factors
}

export interface PayEquityCase {
  userId: string;
  gap: number;
  gapPercentage: number;
  factors: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedAdjustment: number;
  priority: number;
}

export interface EquityTrend {
  period: string;
  overallGap: number;
  controlledGap: number;
  direction: 'improving' | 'stable' | 'worsening';
}

export interface EquityRecommendation {
  priority: number;
  category: string;
  recommendation: string;
  impact: string;
  cost: number;
  timeframe: string;
}

export interface BonusCalculation {
  userId: string;
  bonusPeriod: string;
  targetBonus: number;
  performanceMultiplier: number;
  companyMultiplier: number;
  individualMultiplier: number;
  calculatedBonus: number;
  adjustments: BonusAdjustment[];
  finalBonus: number;
  breakdown: BonusBreakdown;
}

export interface BonusAdjustment {
  type: string;
  amount: number;
  reason: string;
  approvedBy?: string;
}

export interface BonusBreakdown {
  individualPerformance: number;
  teamPerformance: number;
  companyPerformance: number;
  discretionary: number;
}

export interface CompensationBudget {
  id: string;
  tenantId: string;
  departmentId?: string;
  fiscalYear: string;
  totalBudget: number;
  allocatedBudget: number;
  remainingBudget: number;
  categories: BudgetCategory[];
  status: 'planning' | 'approved' | 'active' | 'closed';
}

export interface BudgetCategory {
  category: CompensationType;
  budget: number;
  allocated: number;
  remaining: number;
}

export interface TotalRewardsStatement {
  userId: string;
  statementPeriod: string;
  generatedAt: Date;
  compensation: {
    baseSalary: number;
    bonus: number;
    equity: number;
    otherCash: number;
    totalCash: number;
  };
  benefits: {
    healthInsurance: number;
    retirement: number;
    paidTimeOff: number;
    otherBenefits: number;
    totalBenefits: number;
  };
  perquisites: {
    items: { name: string; value: number }[];
    total: number;
  };
  totalRewards: number;
  yearOverYearChange: number;
  marketComparison: {
    percentile: number;
    aboveMarket: boolean;
  };
}

export interface MarketBenchmark {
  jobFamily: string;
  level: string;
  location: string;
  percentile25: number;
  percentile50: number;
  percentile75: number;
  percentile90: number;
  dataDate: Date;
  source: string;
  sampleSize: number;
}

// ============================================================================
// Compensation & Rewards Service
// ============================================================================

export class CompensationRewardsService {
  private prisma: PrismaClient;
  private redis: Redis;

  // Merit matrix based on performance and compa-ratio
  private readonly meritMatrix: Record<string, Record<string, number>> = {
    'exceptional': { 'below_band': 0.08, 'low': 0.06, 'mid': 0.05, 'high': 0.03, 'above_band': 0.02 },
    'exceeds': { 'below_band': 0.06, 'low': 0.05, 'mid': 0.04, 'high': 0.025, 'above_band': 0.015 },
    'meets': { 'below_band': 0.05, 'low': 0.04, 'mid': 0.03, 'high': 0.02, 'above_band': 0.01 },
    'developing': { 'below_band': 0.03, 'low': 0.02, 'mid': 0.015, 'high': 0.01, 'above_band': 0 },
    'below': { 'below_band': 0.01, 'low': 0, 'mid': 0, 'high': 0, 'above_band': 0 },
  };

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
  }

  /**
   * Get comprehensive employee compensation details
   */
  async getEmployeeCompensation(userId: string, tenantId: string): Promise<EmployeeCompensation> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
      },
    });

    if (!user) throw new Error('User not found');

    // Get compensation band
    const band = await this.getCompensationBand(user.jobTitle || '', user.location || '', tenantId);

    // Calculate compa-ratio
    const compaRatio = band ? (user.salary || 0) / band.midpointSalary : 1;

    // Calculate band position
    const bandPosition = band
      ? Math.max(0, Math.min(1, ((user.salary || 0) - band.minimumSalary) / (band.maximumSalary - band.minimumSalary)))
      : 0.5;

    // Get equity grants
    const equityGrants = await this.getEquityGrants(userId, tenantId);

    // Get allowances and benefits
    const allowances = await this.getAllowances(userId, tenantId);
    const benefits = await this.getBenefits(userId, tenantId);

    // Calculate totals
    const baseSalary = user.salary || 0;
    const targetBonus = band ? baseSalary * (band.targetBonus / 100) : 0;
    const equityValue = equityGrants.reduce((sum, g) => sum + g.currentValue, 0);
    const allowanceTotal = allowances.reduce((sum, a) =>
      sum + (a.frequency === 'annual' ? a.amount : a.amount * 12), 0);

    return {
      userId,
      tenantId,
      baseSalary,
      currency: 'USD',
      salaryEffectiveDate: user.hireDate || new Date(),
      targetBonus,
      equityGrants,
      allowances,
      benefits,
      totalCashCompensation: baseSalary + targetBonus + allowanceTotal,
      totalDirectCompensation: baseSalary + targetBonus + equityValue + allowanceTotal,
      compaRatio,
      bandPosition,
      lastReviewDate: new Date(),
    };
  }

  /**
   * Calculate merit increase recommendations
   */
  async calculateMeritIncrease(
    userId: string,
    tenantId: string,
    budgetConstraint?: number
  ): Promise<MeritIncreaseRecommendation> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        reviewsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) throw new Error('User not found');

    const currentSalary = user.salary || 50000;
    const latestRating = user.reviewsReceived[0]?.overallRating || 3;

    // Get compensation band
    const band = await this.getCompensationBand(user.jobTitle || '', user.location || '', tenantId);
    const compaRatioBefore = band ? currentSalary / band.midpointSalary : 1;

    // Determine performance tier
    const performanceTier = this.getPerformanceTier(latestRating);

    // Determine compa-ratio position
    const compaPosition = this.getCompaPosition(compaRatioBefore);

    // Get recommended percentage from merit matrix
    const recommendedPercentage = this.meritMatrix[performanceTier]?.[compaPosition] || 0.03;

    // Calculate recommended increase
    let recommendedIncrease = currentSalary * recommendedPercentage;

    // Apply budget constraint if provided
    const constraints: string[] = [];
    if (budgetConstraint && recommendedIncrease > budgetConstraint) {
      constraints.push(`Budget constrained: ${budgetConstraint} available`);
      recommendedIncrease = budgetConstraint;
    }

    // Check if increase would exceed band maximum
    if (band && (currentSalary + recommendedIncrease) > band.maximumSalary) {
      const maxIncrease = band.maximumSalary - currentSalary;
      constraints.push(`Band maximum would be exceeded`);
      recommendedIncrease = Math.max(0, maxIncrease);
    }

    const compaRatioAfter = band ? (currentSalary + recommendedIncrease) / band.midpointSalary : 1;

    // Build justification
    const justification: string[] = [];
    justification.push(`Performance rating: ${latestRating.toFixed(1)}/5 (${performanceTier})`);
    justification.push(`Current compa-ratio: ${(compaRatioBefore * 100).toFixed(0)}%`);
    justification.push(`Merit matrix recommendation: ${(recommendedPercentage * 100).toFixed(1)}%`);

    // Generate alternatives
    const alternativeOptions: AlternativeCompOption[] = [];

    if (recommendedPercentage < 0.04) {
      alternativeOptions.push({
        type: 'bonus',
        amount: currentSalary * 0.05,
        rationale: 'One-time bonus in lieu of lower base increase',
        taxImplication: 'Taxed as supplemental wages',
      });
    }

    if (compaRatioBefore >= 1.1) {
      alternativeOptions.push({
        type: 'equity',
        amount: currentSalary * 0.1,
        rationale: 'Equity grant for retention when at top of band',
        taxImplication: 'RSUs taxed at vesting',
      });
    }

    return {
      userId,
      currentSalary,
      recommendedIncrease: Math.round(recommendedIncrease),
      recommendedPercentage: recommendedIncrease / currentSalary,
      basis: ['performance', compaRatioBefore < 0.9 ? 'equity_adjustment' : 'market'].filter(Boolean) as MeritBasis[],
      performanceRating: latestRating,
      compaRatioBefore,
      compaRatioAfter,
      justification,
      alternativeOptions,
      constraints,
      approved: false,
    };
  }

  /**
   * Perform pay equity analysis
   */
  async analyzePayEquity(tenantId: string, departmentId?: string): Promise<PayEquityAnalysis> {
    const employees = await this.prisma.user.findMany({
      where: {
        tenantId,
        departmentId: departmentId || undefined,
        status: 'active',
        salary: { gt: 0 },
      },
      include: {
        department: true,
      },
    });

    // Analyze gaps by dimension
    const gapsByDimension: EquityGapDimension[] = [];

    // Gender analysis
    const genderGap = this.analyzeGapByDimension(employees, 'gender');
    gapsByDimension.push(genderGap);

    // Age analysis (groups)
    const ageGap = this.analyzeGapByDimension(employees, 'age');
    gapsByDimension.push(ageGap);

    // Tenure analysis
    const tenureGap = this.analyzeGapByDimension(employees, 'tenure');
    gapsByDimension.push(tenureGap);

    // Location analysis
    const locationGap = this.analyzeGapByDimension(employees, 'location');
    gapsByDimension.push(locationGap);

    // Identify high-risk cases
    const highRiskCases = await this.identifyPayEquityCases(employees, tenantId);

    // Calculate overall equity score
    const overallEquityScore = 100 - gapsByDimension.reduce((sum, g) =>
      sum + Math.abs(g.controlledGap) * 10, 0);

    // Calculate legal risk score
    const legalRiskScore = this.calculateLegalRiskScore(gapsByDimension, highRiskCases);

    // Generate recommendations
    const recommendations = this.generateEquityRecommendations(gapsByDimension, highRiskCases);

    return {
      tenantId,
      analysisDate: new Date(),
      overallEquityScore: Math.max(0, Math.min(100, overallEquityScore)),
      gapsByDimension,
      highRiskCases,
      trendAnalysis: [],
      recommendations,
      legalRiskScore,
    };
  }

  /**
   * Calculate bonus for employee
   */
  async calculateBonus(
    userId: string,
    bonusPeriod: string,
    companyPerformance: number, // 0-1.5
    tenantId: string
  ): Promise<BonusCalculation> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        reviewsReceived: {
          where: {
            createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        team: true,
      },
    });

    if (!user) throw new Error('User not found');

    // Get compensation band for target bonus
    const band = await this.getCompensationBand(user.jobTitle || '', user.location || '', tenantId);
    const targetBonus = band
      ? (user.salary || 50000) * (band.targetBonus / 100)
      : (user.salary || 50000) * 0.1;

    // Calculate individual multiplier based on performance
    const rating = user.reviewsReceived[0]?.overallRating || 3;
    const individualMultiplier = this.calculateIndividualMultiplier(rating);

    // Calculate team multiplier (would come from team metrics)
    const teamMultiplier = 1.0;

    // Calculate overall performance multiplier
    const performanceMultiplier = (individualMultiplier * 0.6 + teamMultiplier * 0.2 + companyPerformance * 0.2);

    // Calculate base bonus
    const calculatedBonus = targetBonus * performanceMultiplier;

    // Apply any adjustments
    const adjustments: BonusAdjustment[] = [];

    // Pro-rata for partial year (if applicable)
    const tenure = this.calculateTenure(user.hireDate);
    if (tenure < 1) {
      const proRataFactor = tenure;
      adjustments.push({
        type: 'pro_rata',
        amount: calculatedBonus * (proRataFactor - 1),
        reason: `Pro-rated for ${(tenure * 12).toFixed(0)} months`,
      });
    }

    const finalBonus = calculatedBonus + adjustments.reduce((sum, a) => sum + a.amount, 0);

    return {
      userId,
      bonusPeriod,
      targetBonus,
      performanceMultiplier,
      companyMultiplier: companyPerformance,
      individualMultiplier,
      calculatedBonus,
      adjustments,
      finalBonus: Math.max(0, Math.round(finalBonus)),
      breakdown: {
        individualPerformance: targetBonus * individualMultiplier * 0.6,
        teamPerformance: targetBonus * teamMultiplier * 0.2,
        companyPerformance: targetBonus * companyPerformance * 0.2,
        discretionary: adjustments.reduce((sum, a) => sum + a.amount, 0),
      },
    };
  }

  /**
   * Generate total rewards statement
   */
  async generateTotalRewardsStatement(
    userId: string,
    tenantId: string,
    period: string
  ): Promise<TotalRewardsStatement> {
    const compensation = await this.getEmployeeCompensation(userId, tenantId);
    const bonusCalculation = await this.calculateBonus(userId, period, 1.0, tenantId);

    // Calculate benefit values
    const benefitValues = compensation.benefits.reduce((acc, b) => ({
      healthInsurance: acc.healthInsurance + (b.type === 'health' ? b.employerCost : 0),
      retirement: acc.retirement + (b.type === 'retirement' ? b.employerCost : 0),
      paidTimeOff: acc.paidTimeOff,
      otherBenefits: acc.otherBenefits + (!['health', 'retirement'].includes(b.type) ? b.employerCost : 0),
    }), { healthInsurance: 0, retirement: 0, paidTimeOff: 0, otherBenefits: 0 });

    // Estimate PTO value
    const dailyRate = compensation.baseSalary / 260;
    benefitValues.paidTimeOff = dailyRate * 20; // Assume 20 PTO days

    const equityValue = compensation.equityGrants.reduce((sum, g) => sum + g.currentValue, 0);
    const allowanceValue = compensation.allowances.reduce((sum, a) =>
      sum + (a.frequency === 'annual' ? a.amount : a.amount * 12), 0);

    const totalCash = compensation.baseSalary + bonusCalculation.finalBonus + allowanceValue;
    const totalBenefits = Object.values(benefitValues).reduce((a, b) => a + b, 0);

    // Get market comparison
    const band = await this.getCompensationBand('', '', tenantId);
    const percentile = band
      ? this.calculatePercentile(compensation.baseSalary, band)
      : 50;

    return {
      userId,
      statementPeriod: period,
      generatedAt: new Date(),
      compensation: {
        baseSalary: compensation.baseSalary,
        bonus: bonusCalculation.finalBonus,
        equity: equityValue,
        otherCash: allowanceValue,
        totalCash,
      },
      benefits: {
        ...benefitValues,
        totalBenefits,
      },
      perquisites: {
        items: [],
        total: 0,
      },
      totalRewards: totalCash + equityValue + totalBenefits,
      yearOverYearChange: 0.05, // Would be calculated from historical data
      marketComparison: {
        percentile,
        aboveMarket: percentile > 50,
      },
    };
  }

  /**
   * Manage compensation budget
   */
  async createCompensationBudget(
    tenantId: string,
    fiscalYear: string,
    departmentId: string | null,
    totalBudget: number,
    allocation: Record<CompensationType, number>
  ): Promise<CompensationBudget> {
    const categories: BudgetCategory[] = Object.entries(allocation).map(([category, budget]) => ({
      category: category as CompensationType,
      budget,
      allocated: 0,
      remaining: budget,
    }));

    const budget: CompensationBudget = {
      id: `budget_${Date.now()}`,
      tenantId,
      departmentId: departmentId || undefined,
      fiscalYear,
      totalBudget,
      allocatedBudget: 0,
      remainingBudget: totalBudget,
      categories,
      status: 'planning',
    };

    await this.redis.set(
      `comp_budget:${tenantId}:${fiscalYear}:${departmentId || 'org'}`,
      JSON.stringify(budget),
      'EX',
      365 * 24 * 60 * 60
    );

    return budget;
  }

  /**
   * Get compensation band for role and location
   */
  async getCompensationBand(
    jobTitle: string,
    location: string,
    tenantId: string
  ): Promise<CompensationBand | null> {
    // In production, this would query from a compensation bands table
    // For now, return a default band
    return {
      id: 'default_band',
      tenantId,
      levelId: 'L3',
      levelName: 'Senior',
      jobFamily: 'Engineering',
      location: location || 'US',
      currency: 'USD',
      minimumSalary: 100000,
      midpointSalary: 125000,
      maximumSalary: 150000,
      targetBonus: 15,
      equityRange: { min: 10000, max: 50000 },
      effectiveDate: new Date(),
    };
  }

  /**
   * Get market benchmark data
   */
  async getMarketBenchmark(
    jobFamily: string,
    level: string,
    location: string
  ): Promise<MarketBenchmark> {
    // In production, this would integrate with compensation survey data
    return {
      jobFamily,
      level,
      location,
      percentile25: 90000,
      percentile50: 110000,
      percentile75: 135000,
      percentile90: 160000,
      dataDate: new Date(),
      source: 'Market Survey',
      sampleSize: 500,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async getEquityGrants(userId: string, tenantId: string): Promise<EquityGrant[]> {
    // Would fetch from equity management table
    return [];
  }

  private async getAllowances(userId: string, tenantId: string): Promise<Allowance[]> {
    return [];
  }

  private async getBenefits(userId: string, tenantId: string): Promise<Benefit[]> {
    return [
      { type: 'health', description: 'Medical/Dental/Vision', employerCost: 15000, employeeContribution: 3000 },
      { type: 'retirement', description: '401k Match', employerCost: 8000, employeeContribution: 0 },
    ];
  }

  private getPerformanceTier(rating: number): string {
    if (rating >= 4.5) return 'exceptional';
    if (rating >= 4.0) return 'exceeds';
    if (rating >= 3.0) return 'meets';
    if (rating >= 2.0) return 'developing';
    return 'below';
  }

  private getCompaPosition(compaRatio: number): string {
    if (compaRatio < 0.85) return 'below_band';
    if (compaRatio < 0.95) return 'low';
    if (compaRatio < 1.05) return 'mid';
    if (compaRatio < 1.15) return 'high';
    return 'above_band';
  }

  private analyzeGapByDimension(
    employees: any[],
    dimension: 'gender' | 'age' | 'tenure' | 'location'
  ): EquityGapDimension {
    const groups = new Map<string, number[]>();

    for (const emp of employees) {
      let groupKey: string;
      switch (dimension) {
        case 'gender':
          groupKey = emp.gender || 'unknown';
          break;
        case 'age':
          const age = this.calculateAge(emp.birthDate);
          groupKey = age < 30 ? 'under30' : age < 40 ? '30-40' : age < 50 ? '40-50' : '50+';
          break;
        case 'tenure':
          const tenure = this.calculateTenure(emp.hireDate);
          groupKey = tenure < 1 ? '<1yr' : tenure < 3 ? '1-3yr' : tenure < 5 ? '3-5yr' : '5+yr';
          break;
        case 'location':
          groupKey = emp.location || 'unknown';
          break;
      }

      const salaries = groups.get(groupKey) || [];
      salaries.push(emp.salary || 0);
      groups.set(groupKey, salaries);
    }

    // Calculate medians for each group
    const medians = new Map<string, number>();
    for (const [group, salaries] of groups) {
      if (salaries.length > 0) {
        salaries.sort((a, b) => a - b);
        medians.set(group, salaries[Math.floor(salaries.length / 2)]);
      }
    }

    // Calculate gap
    const medianValues = Array.from(medians.values()).filter(m => m > 0);
    const maxMedian = Math.max(...medianValues);
    const minMedian = Math.min(...medianValues);
    const gapPercentage = maxMedian > 0 ? ((maxMedian - minMedian) / maxMedian) * 100 : 0;

    return {
      dimension,
      gapPercentage,
      statisticalSignificance: employees.length > 30 ? 0.95 : 0.7,
      affectedEmployees: employees.length,
      medianDifference: maxMedian - minMedian,
      controlledGap: gapPercentage * 0.7, // Simplified controlled gap
    };
  }

  private async identifyPayEquityCases(employees: any[], tenantId: string): Promise<PayEquityCase[]> {
    const cases: PayEquityCase[] = [];

    for (const emp of employees) {
      const band = await this.getCompensationBand(emp.jobTitle || '', emp.location || '', tenantId);
      if (!band) continue;

      const compaRatio = (emp.salary || 0) / band.midpointSalary;

      // Flag significantly below midpoint cases
      if (compaRatio < 0.85) {
        const gap = band.midpointSalary - (emp.salary || 0);
        cases.push({
          userId: emp.id,
          gap,
          gapPercentage: (1 - compaRatio) * 100,
          factors: ['Below market midpoint'],
          riskLevel: compaRatio < 0.75 ? 'high' : 'medium',
          recommendedAdjustment: gap * 0.5,
          priority: compaRatio < 0.75 ? 1 : 2,
        });
      }
    }

    return cases.sort((a, b) => a.priority - b.priority);
  }

  private calculateLegalRiskScore(
    gaps: EquityGapDimension[],
    cases: PayEquityCase[]
  ): number {
    let risk = 0;

    // High gaps in protected dimensions increase risk
    const genderGap = gaps.find(g => g.dimension === 'gender');
    if (genderGap && genderGap.controlledGap > 5) {
      risk += 30;
    }

    const ageGap = gaps.find(g => g.dimension === 'age');
    if (ageGap && ageGap.controlledGap > 5) {
      risk += 20;
    }

    // High-risk individual cases increase risk
    const criticalCases = cases.filter(c => c.riskLevel === 'critical' || c.riskLevel === 'high');
    risk += criticalCases.length * 5;

    return Math.min(100, risk);
  }

  private generateEquityRecommendations(
    gaps: EquityGapDimension[],
    cases: PayEquityCase[]
  ): EquityRecommendation[] {
    const recommendations: EquityRecommendation[] = [];

    // Address high-risk individual cases first
    if (cases.filter(c => c.riskLevel === 'high').length > 0) {
      recommendations.push({
        priority: 1,
        category: 'Individual Adjustments',
        recommendation: 'Address high-risk pay equity cases with immediate salary adjustments',
        impact: 'Reduce legal risk and improve employee equity',
        cost: cases.reduce((sum, c) => sum + c.recommendedAdjustment, 0),
        timeframe: '30 days',
      });
    }

    // Address systemic gaps
    for (const gap of gaps.filter(g => g.controlledGap > 5)) {
      recommendations.push({
        priority: 2,
        category: 'Systemic Review',
        recommendation: `Review ${gap.dimension} pay gap of ${gap.controlledGap.toFixed(1)}%`,
        impact: `Affects ${gap.affectedEmployees} employees`,
        cost: gap.medianDifference * gap.affectedEmployees * 0.3,
        timeframe: '90 days',
      });
    }

    // Preventive measures
    recommendations.push({
      priority: 3,
      category: 'Process Improvement',
      recommendation: 'Implement standardized pay review process with equity checks',
      impact: 'Prevent future pay equity issues',
      cost: 5000,
      timeframe: '60 days',
    });

    return recommendations;
  }

  private calculateIndividualMultiplier(rating: number): number {
    if (rating >= 4.5) return 1.3;
    if (rating >= 4.0) return 1.15;
    if (rating >= 3.5) return 1.0;
    if (rating >= 3.0) return 0.9;
    if (rating >= 2.5) return 0.7;
    return 0.5;
  }

  private calculateTenure(hireDate: Date | null): number {
    if (!hireDate) return 2;
    return (Date.now() - new Date(hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  }

  private calculateAge(birthDate: Date | null): number {
    if (!birthDate) return 35;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  private calculatePercentile(salary: number, band: CompensationBand): number {
    const range = band.maximumSalary - band.minimumSalary;
    const position = salary - band.minimumSalary;
    return Math.min(100, Math.max(0, (position / range) * 100));
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const compensationRewardsService = new CompensationRewardsService(
  new PrismaClient(),
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
);
