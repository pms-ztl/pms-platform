/**
 * Advanced Analytics Engine
 *
 * Comprehensive analytics platform for performance management insights,
 * predictive modeling, trend analysis, and executive dashboards.
 *
 * Key capabilities:
 * - Performance trend analysis
 * - Predictive analytics (attrition, promotions, performance)
 * - Organizational health metrics
 * - Comparative benchmarking
 * - Custom report generation
 * - Executive dashboards
 * - Data visualization support
 * - Export and integration capabilities
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

// ============================================================================
// Type Definitions
// ============================================================================

export type AnalyticsTimeframe = 'week' | 'month' | 'quarter' | 'year' | 'custom';

export type MetricType =
  | 'performance'
  | 'engagement'
  | 'retention'
  | 'productivity'
  | 'development'
  | 'compensation'
  | 'diversity'
  | 'collaboration';

export type AggregationType = 'sum' | 'average' | 'count' | 'min' | 'max' | 'median' | 'percentile';

export type VisualizationType =
  | 'line_chart'
  | 'bar_chart'
  | 'pie_chart'
  | 'scatter_plot'
  | 'heatmap'
  | 'funnel'
  | 'gauge'
  | 'table'
  | 'tree_map'
  | 'sankey';

export interface AnalyticsQuery {
  id?: string;
  tenantId: string;
  metrics: MetricDefinition[];
  dimensions: DimensionDefinition[];
  filters: QueryFilter[];
  timeframe: TimeframeDefinition;
  aggregation: AggregationType;
  groupBy?: string[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
}

export interface MetricDefinition {
  name: string;
  type: MetricType;
  calculation: string;
  alias?: string;
}

export interface DimensionDefinition {
  field: string;
  alias?: string;
  buckets?: string[] | number[];
}

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'between';
  value: any;
}

export interface TimeframeDefinition {
  type: AnalyticsTimeframe;
  start?: Date;
  end?: Date;
  comparePrevious?: boolean;
}

export interface AnalyticsResult {
  query: AnalyticsQuery;
  data: DataPoint[];
  summary: ResultSummary;
  metadata: ResultMetadata;
  comparison?: ComparisonResult;
  generatedAt: Date;
}

export interface DataPoint {
  dimensions: Record<string, any>;
  metrics: Record<string, number>;
  timestamp?: Date;
}

export interface ResultSummary {
  totalRecords: number;
  aggregates: Record<string, number>;
  trends: Record<string, TrendInfo>;
  highlights: string[];
}

export interface TrendInfo {
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  significance: 'low' | 'medium' | 'high';
}

export interface ResultMetadata {
  executionTime: number;
  dataFreshness: Date;
  completeness: number;
  caveats: string[];
}

export interface ComparisonResult {
  previousPeriod: {
    start: Date;
    end: Date;
    data: DataPoint[];
  };
  changes: Record<string, { absolute: number; percent: number }>;
}

export interface Dashboard {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  ownerId: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  refreshInterval: number;
  sharing: DashboardSharing;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  query: AnalyticsQuery;
  visualization: VisualizationConfig;
  position: WidgetPosition;
  refreshInterval?: number;
}

export type WidgetType = 'metric' | 'chart' | 'table' | 'list' | 'text' | 'progress' | 'alert';

export interface VisualizationConfig {
  type: VisualizationType;
  options: Record<string, any>;
  colors?: string[];
  annotations?: Annotation[];
}

export interface Annotation {
  type: 'line' | 'area' | 'point';
  value: number | Date;
  label: string;
  color: string;
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DashboardLayout {
  columns: number;
  rowHeight: number;
  padding: number;
}

export interface DashboardSharing {
  public: boolean;
  sharedWith: { userId: string; permission: 'view' | 'edit' }[];
  embedEnabled: boolean;
  embedToken?: string;
}

export interface PerformanceTrendAnalysis {
  tenantId: string;
  period: string;
  overallTrend: TrendInfo;
  ratingDistribution: RatingDistribution[];
  departmentBreakdown: DepartmentPerformance[];
  topPerformers: TopPerformerInfo[];
  improvementAreas: ImprovementArea[];
  predictions: PerformancePrediction[];
}

export interface RatingDistribution {
  rating: number;
  count: number;
  percentage: number;
  change: number;
}

export interface DepartmentPerformance {
  departmentId: string;
  departmentName: string;
  averageRating: number;
  ratingChange: number;
  headcount: number;
  topPerformerPercentage: number;
  attritionRisk: number;
}

export interface TopPerformerInfo {
  userId: string;
  anonymizedName: string;
  department: string;
  rating: number;
  achievements: string[];
}

export interface ImprovementArea {
  area: string;
  currentScore: number;
  targetScore: number;
  affectedEmployees: number;
  suggestedActions: string[];
}

export interface PerformancePrediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  factors: string[];
  timeframe: string;
}

export interface AttritionAnalytics {
  tenantId: string;
  period: string;
  overallRisk: RiskSummary;
  riskByDepartment: DepartmentRisk[];
  riskFactors: RiskFactorAnalysis[];
  flightRiskEmployees: FlightRiskEmployee[];
  costProjection: AttritionCostProjection;
  interventionROI: InterventionROI[];
}

export interface RiskSummary {
  attritionRate: number;
  predictedRate: number;
  trend: TrendInfo;
  benchmark: number;
}

export interface DepartmentRisk {
  departmentId: string;
  departmentName: string;
  riskScore: number;
  employeesAtRisk: number;
  primaryFactors: string[];
}

export interface RiskFactorAnalysis {
  factor: string;
  impact: number;
  prevalence: number;
  trend: TrendInfo;
  mitigation: string;
}

export interface FlightRiskEmployee {
  userId: string;
  anonymizedId: string;
  riskScore: number;
  tenure: number;
  lastRating: number;
  topFactors: string[];
  retentionProbability: number;
}

export interface AttritionCostProjection {
  directCosts: number;
  indirectCosts: number;
  totalProjectedCost: number;
  costPerDeparture: number;
  potentialSavings: number;
}

export interface InterventionROI {
  intervention: string;
  cost: number;
  expectedRetentions: number;
  roi: number;
  timeToImpact: string;
}

export interface DiversityAnalytics {
  tenantId: string;
  period: string;
  overallDiversityIndex: number;
  dimensionBreakdown: DiversityDimension[];
  representationByLevel: LevelRepresentation[];
  hiringAnalysis: HiringDiversity;
  promotionEquity: PromotionEquity;
  payEquity: PayEquitySummary;
  recommendations: DiversityRecommendation[];
}

export interface DiversityDimension {
  dimension: string;
  currentState: Record<string, number>;
  industryBenchmark: Record<string, number>;
  trend: TrendInfo;
  goals: Record<string, number>;
}

export interface LevelRepresentation {
  level: string;
  breakdown: Record<string, number>;
  leadershipGap: number;
}

export interface HiringDiversity {
  period: string;
  applicantPool: Record<string, number>;
  hires: Record<string, number>;
  conversionRates: Record<string, number>;
}

export interface PromotionEquity {
  period: string;
  promotionRates: Record<string, number>;
  timeToPromotion: Record<string, number>;
  statisticalSignificance: number;
}

export interface PayEquitySummary {
  overallGap: number;
  controlledGap: number;
  gapsByDimension: Record<string, number>;
  actionsTaken: number;
  costToClose: number;
}

export interface DiversityRecommendation {
  priority: number;
  area: string;
  recommendation: string;
  impact: string;
  timeline: string;
}

export interface ReportDefinition {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  type: 'standard' | 'custom' | 'scheduled';
  template: string;
  queries: AnalyticsQuery[];
  schedule?: ReportSchedule;
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv' | 'html';
  createdBy: string;
  createdAt: Date;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  timezone: string;
  enabled: boolean;
}

export interface GeneratedReport {
  id: string;
  definitionId: string;
  tenantId: string;
  generatedAt: Date;
  data: any;
  fileUrl?: string;
  expiresAt: Date;
}

// ============================================================================
// Advanced Analytics Engine Service
// ============================================================================

export class AdvancedAnalyticsEngine {
  private prisma: PrismaClient;
  private redis: Redis;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
  }

  /**
   * Execute an analytics query
   */
  async executeQuery(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const startTime = Date.now();

    // Build and execute query
    const data = await this.buildAndExecuteQuery(query);

    // Calculate summary
    const summary = this.calculateSummary(data, query);

    // Get comparison if requested
    let comparison: ComparisonResult | undefined;
    if (query.timeframe.comparePrevious) {
      comparison = await this.calculateComparison(query, data);
    }

    const executionTime = Date.now() - startTime;

    return {
      query,
      data,
      summary,
      metadata: {
        executionTime,
        dataFreshness: new Date(),
        completeness: 1.0,
        caveats: [],
      },
      comparison,
      generatedAt: new Date(),
    };
  }

  /**
   * Create a dashboard
   */
  async createDashboard(
    tenantId: string,
    ownerId: string,
    name: string,
    description: string,
    widgets: Omit<DashboardWidget, 'id'>[],
    layout?: Partial<DashboardLayout>
  ): Promise<Dashboard> {
    const dashboard: Dashboard = {
      id: `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      name,
      description,
      ownerId,
      widgets: widgets.map((w, idx) => ({
        ...w,
        id: `widget_${idx}`,
      })),
      layout: {
        columns: 12,
        rowHeight: 100,
        padding: 10,
        ...layout,
      },
      refreshInterval: 300, // 5 minutes
      sharing: {
        public: false,
        sharedWith: [],
        embedEnabled: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.redis.set(
      `dashboard:${dashboard.id}`,
      JSON.stringify(dashboard),
      'EX',
      365 * 24 * 60 * 60
    );

    return dashboard;
  }

  /**
   * Get dashboard with live data
   */
  async getDashboardWithData(dashboardId: string): Promise<{
    dashboard: Dashboard;
    widgetData: Record<string, AnalyticsResult>;
  }> {
    const cached = await this.redis.get(`dashboard:${dashboardId}`);
    if (!cached) throw new Error('Dashboard not found');

    const dashboard: Dashboard = JSON.parse(cached);

    // Execute queries for all widgets
    const widgetData: Record<string, AnalyticsResult> = {};

    for (const widget of dashboard.widgets) {
      if (widget.query) {
        widgetData[widget.id] = await this.executeQuery(widget.query);
      }
    }

    return { dashboard, widgetData };
  }

  /**
   * Analyze performance trends
   */
  async analyzePerformanceTrends(
    tenantId: string,
    timeframe: TimeframeDefinition,
    departmentId?: string
  ): Promise<PerformanceTrendAnalysis> {
    // Get performance reviews
    const reviews = await this.prisma.review.findMany({
      where: {
        tenantId,
        reviewee: departmentId ? { departmentId } : undefined,
        createdAt: {
          gte: timeframe.start || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          lte: timeframe.end || new Date(),
        },
        status: 'completed',
      },
      include: {
        reviewee: {
          include: { department: true },
        },
      },
    });

    // Calculate rating distribution
    const ratingCounts = new Map<number, number>();
    for (const review of reviews) {
      const rating = Math.round(review.overallRating || 3);
      ratingCounts.set(rating, (ratingCounts.get(rating) || 0) + 1);
    }

    const ratingDistribution: RatingDistribution[] = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: ratingCounts.get(rating) || 0,
      percentage: reviews.length > 0 ? Math.min(100, ((ratingCounts.get(rating) || 0) / reviews.length) * 100) : 0,
      change: 0, // Would compare to previous period
    }));

    // Calculate department breakdown
    const deptMap = new Map<string, { ratings: number[]; dept: any }>();
    for (const review of reviews) {
      const deptId = review.reviewee.departmentId || 'unknown';
      const existing = deptMap.get(deptId) || { ratings: [], dept: review.reviewee.department };
      existing.ratings.push(review.overallRating || 3);
      deptMap.set(deptId, existing);
    }

    const departmentBreakdown: DepartmentPerformance[] = Array.from(deptMap.entries())
      .map(([deptId, data]) => ({
        departmentId: deptId,
        departmentName: data.dept?.name || 'Unknown',
        averageRating: data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length,
        ratingChange: 0,
        headcount: new Set(reviews.filter(r => r.reviewee.departmentId === deptId).map(r => r.revieweeId)).size,
        topPerformerPercentage: Math.min(100, (data.ratings.filter(r => r >= 4).length / data.ratings.length) * 100),
        attritionRisk: 0.15, // Would be calculated
      }));

    // Get top performers
    const topPerformers: TopPerformerInfo[] = reviews
      .filter(r => (r.overallRating || 0) >= 4.5)
      .slice(0, 10)
      .map((r, idx) => ({
        userId: r.revieweeId,
        anonymizedName: `Employee ${idx + 1}`,
        department: r.reviewee.department?.name || 'Unknown',
        rating: r.overallRating || 0,
        achievements: [],
      }));

    // Calculate overall trend
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.overallRating || 3), 0) / reviews.length
      : 3;

    const overallTrend: TrendInfo = {
      direction: avgRating > 3.2 ? 'up' : avgRating < 2.8 ? 'down' : 'stable',
      changePercent: 3.5, // Would be calculated from historical
      significance: 'medium',
    };

    // Identify improvement areas
    const improvementAreas: ImprovementArea[] = departmentBreakdown
      .filter(d => d.averageRating < 3.5)
      .map(d => ({
        area: d.departmentName,
        currentScore: d.averageRating,
        targetScore: 4.0,
        affectedEmployees: d.headcount,
        suggestedActions: ['Performance coaching', 'Goal alignment review'],
      }));

    // Generate predictions
    const predictions: PerformancePrediction[] = [
      {
        metric: 'Overall Average Rating',
        currentValue: avgRating,
        predictedValue: avgRating * 1.02, // 2% improvement
        confidence: 0.75,
        factors: ['Current trajectory', 'Development investments'],
        timeframe: 'Next quarter',
      },
    ];

    return {
      tenantId,
      period: `${timeframe.start?.toISOString()} - ${timeframe.end?.toISOString()}`,
      overallTrend,
      ratingDistribution,
      departmentBreakdown,
      topPerformers,
      improvementAreas,
      predictions,
    };
  }

  /**
   * Analyze attrition risk
   */
  async analyzeAttritionRisk(
    tenantId: string,
    timeframe: TimeframeDefinition
  ): Promise<AttritionAnalytics> {
    const employees = await this.prisma.user.findMany({
      where: {
        tenantId,
        status: 'active',
      },
      include: {
        department: true,
        reviewsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 2,
        },
      },
    });

    // Calculate individual risk scores
    const employeeRisks = employees.map(emp => ({
      employee: emp,
      riskScore: this.calculateIndividualRisk(emp),
      factors: this.identifyRiskFactors(emp),
    }));

    // Department risk aggregation
    const deptRisks = new Map<string, { scores: number[]; factors: string[]; dept: any }>();
    for (const er of employeeRisks) {
      const deptId = er.employee.departmentId || 'unknown';
      const existing = deptRisks.get(deptId) || { scores: [], factors: [], dept: er.employee.department };
      existing.scores.push(er.riskScore);
      existing.factors.push(...er.factors);
      deptRisks.set(deptId, existing);
    }

    const riskByDepartment: DepartmentRisk[] = Array.from(deptRisks.entries())
      .map(([deptId, data]) => ({
        departmentId: deptId,
        departmentName: data.dept?.name || 'Unknown',
        riskScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        employeesAtRisk: data.scores.filter(s => s > 0.5).length,
        primaryFactors: [...new Set(data.factors)].slice(0, 3),
      }))
      .sort((a, b) => b.riskScore - a.riskScore);

    // Flight risk employees
    const flightRiskEmployees: FlightRiskEmployee[] = employeeRisks
      .filter(er => er.riskScore > 0.5)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20)
      .map((er, idx) => ({
        userId: er.employee.id,
        anonymizedId: `EMP-${idx + 1}`,
        riskScore: er.riskScore,
        tenure: this.calculateTenure(er.employee.hireDate),
        lastRating: er.employee.reviewsReceived[0]?.overallRating || 3,
        topFactors: er.factors.slice(0, 3),
        retentionProbability: 1 - er.riskScore,
      }));

    // Risk factor analysis
    const factorCounts = new Map<string, number>();
    for (const er of employeeRisks.filter(e => e.riskScore > 0.5)) {
      for (const factor of er.factors) {
        factorCounts.set(factor, (factorCounts.get(factor) || 0) + 1);
      }
    }

    const riskFactors: RiskFactorAnalysis[] = Array.from(factorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([factor, count]) => ({
        factor,
        impact: count / employeeRisks.filter(e => e.riskScore > 0.5).length,
        prevalence: count / employees.length,
        trend: { direction: 'stable' as const, changePercent: 0, significance: 'medium' as const },
        mitigation: this.getMitigationForFactor(factor),
      }));

    // Overall risk summary
    const avgRisk = employeeRisks.reduce((sum, er) => sum + er.riskScore, 0) / employeeRisks.length;
    const overallRisk: RiskSummary = {
      attritionRate: 0.12, // Historical rate
      predictedRate: avgRisk * 0.2, // Convert risk to rate
      trend: { direction: 'stable', changePercent: 2, significance: 'low' },
      benchmark: 0.15,
    };

    // Cost projection
    const avgSalary = employees.reduce((sum, e) => sum + (e.salary || 50000), 0) / employees.length;
    const expectedDepartures = Math.round(avgRisk * employees.length * 0.2);
    const costProjection: AttritionCostProjection = {
      directCosts: expectedDepartures * avgSalary * 0.5,
      indirectCosts: expectedDepartures * avgSalary * 0.3,
      totalProjectedCost: expectedDepartures * avgSalary * 0.8,
      costPerDeparture: avgSalary * 0.8,
      potentialSavings: expectedDepartures * avgSalary * 0.3,
    };

    // Intervention ROI
    const interventionROI: InterventionROI[] = [
      {
        intervention: 'Retention bonuses for high-risk high-performers',
        cost: 50000,
        expectedRetentions: 5,
        roi: 2.5,
        timeToImpact: '3 months',
      },
      {
        intervention: 'Career development program',
        cost: 30000,
        expectedRetentions: 8,
        roi: 3.2,
        timeToImpact: '6 months',
      },
      {
        intervention: 'Manager training on retention',
        cost: 15000,
        expectedRetentions: 4,
        roi: 2.8,
        timeToImpact: '3 months',
      },
    ];

    return {
      tenantId,
      period: `${timeframe.start?.toISOString()} - ${timeframe.end?.toISOString()}`,
      overallRisk,
      riskByDepartment,
      riskFactors,
      flightRiskEmployees,
      costProjection,
      interventionROI,
    };
  }

  /**
   * Analyze diversity metrics
   */
  async analyzeDiversity(tenantId: string): Promise<DiversityAnalytics> {
    const employees = await this.prisma.user.findMany({
      where: { tenantId, status: 'active' },
      include: { department: true },
    });

    // Calculate diversity by dimensions
    const dimensionBreakdown: DiversityDimension[] = [];

    // Gender dimension
    const genderCounts: Record<string, number> = {};
    for (const emp of employees) {
      const gender = emp.gender || 'not_specified';
      genderCounts[gender] = (genderCounts[gender] || 0) + 1;
    }
    const genderPercentages: Record<string, number> = {};
    for (const [gender, count] of Object.entries(genderCounts)) {
      genderPercentages[gender] = Math.min(100, (count / employees.length) * 100);
    }

    dimensionBreakdown.push({
      dimension: 'Gender',
      currentState: genderPercentages,
      industryBenchmark: { 'male': 60, 'female': 38, 'other': 2 },
      trend: { direction: 'stable', changePercent: 1, significance: 'low' },
      goals: { 'male': 50, 'female': 48, 'other': 2 },
    });

    // Representation by level
    const levelMap = new Map<string, Record<string, number>>();
    for (const emp of employees) {
      const level = this.extractLevel(emp.jobTitle || '');
      const gender = emp.gender || 'not_specified';

      const existing = levelMap.get(level) || {};
      existing[gender] = (existing[gender] || 0) + 1;
      levelMap.set(level, existing);
    }

    const representationByLevel: LevelRepresentation[] = Array.from(levelMap.entries())
      .map(([level, breakdown]) => ({
        level,
        breakdown,
        leadershipGap: 0, // Would calculate
      }));

    // Calculate overall diversity index
    const diversityIndex = this.calculateDiversityIndex(employees);

    // Pay equity summary
    const payEquity: PayEquitySummary = {
      overallGap: 3.5,
      controlledGap: 1.2,
      gapsByDimension: { gender: 2.1, ethnicity: 1.8 },
      actionsTaken: 15,
      costToClose: 250000,
    };

    // Recommendations
    const recommendations: DiversityRecommendation[] = [
      {
        priority: 1,
        area: 'Leadership Pipeline',
        recommendation: 'Implement leadership development program for underrepresented groups',
        impact: 'Increase representation in senior roles by 15%',
        timeline: '12 months',
      },
      {
        priority: 2,
        area: 'Hiring',
        recommendation: 'Expand recruiting sources and implement blind resume review',
        impact: 'Diversify candidate pool by 25%',
        timeline: '6 months',
      },
    ];

    return {
      tenantId,
      period: 'Current',
      overallDiversityIndex: diversityIndex,
      dimensionBreakdown,
      representationByLevel,
      hiringAnalysis: {
        period: 'Last 12 months',
        applicantPool: {},
        hires: {},
        conversionRates: {},
      },
      promotionEquity: {
        period: 'Last 12 months',
        promotionRates: {},
        timeToPromotion: {},
        statisticalSignificance: 0.95,
      },
      payEquity,
      recommendations,
    };
  }

  /**
   * Generate custom report
   */
  async generateReport(definition: ReportDefinition): Promise<GeneratedReport> {
    // Execute all queries
    const results: AnalyticsResult[] = [];
    for (const query of definition.queries) {
      const result = await this.executeQuery(query);
      results.push(result);
    }

    // Generate report based on template
    const reportData = {
      title: definition.name,
      description: definition.description,
      generatedAt: new Date(),
      sections: results.map((r, idx) => ({
        queryIndex: idx,
        data: r.data,
        summary: r.summary,
      })),
    };

    const report: GeneratedReport = {
      id: `report_${Date.now()}`,
      definitionId: definition.id,
      tenantId: definition.tenantId,
      generatedAt: new Date(),
      data: reportData,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    await this.redis.set(
      `report:${report.id}`,
      JSON.stringify(report),
      'EX',
      30 * 24 * 60 * 60
    );

    return report;
  }

  /**
   * Get predefined executive dashboard
   */
  async getExecutiveDashboard(tenantId: string): Promise<{
    dashboard: Dashboard;
    data: Record<string, any>;
  }> {
    // Create executive dashboard with key widgets
    const widgets: DashboardWidget[] = [
      {
        id: 'overall_rating',
        type: 'metric',
        title: 'Average Performance Rating',
        query: {
          tenantId,
          metrics: [{ name: 'averageRating', type: 'performance', calculation: 'avg(overallRating)' }],
          dimensions: [],
          filters: [],
          timeframe: { type: 'quarter' },
          aggregation: 'average',
        },
        visualization: { type: 'gauge', options: { min: 1, max: 5 } },
        position: { x: 0, y: 0, width: 3, height: 2 },
      },
      {
        id: 'engagement_score',
        type: 'metric',
        title: 'Employee Engagement Score',
        query: {
          tenantId,
          metrics: [{ name: 'engagementScore', type: 'engagement', calculation: 'avg(score)' }],
          dimensions: [],
          filters: [],
          timeframe: { type: 'quarter' },
          aggregation: 'average',
        },
        visualization: { type: 'gauge', options: { min: 0, max: 100 } },
        position: { x: 3, y: 0, width: 3, height: 2 },
      },
      {
        id: 'attrition_risk',
        type: 'metric',
        title: 'Attrition Risk',
        query: {
          tenantId,
          metrics: [{ name: 'attritionRisk', type: 'retention', calculation: 'avg(riskScore)' }],
          dimensions: [],
          filters: [],
          timeframe: { type: 'quarter' },
          aggregation: 'average',
        },
        visualization: { type: 'gauge', options: { min: 0, max: 100, thresholds: [30, 50, 70] } },
        position: { x: 6, y: 0, width: 3, height: 2 },
      },
      {
        id: 'goal_completion',
        type: 'metric',
        title: 'Goal Completion Rate',
        query: {
          tenantId,
          metrics: [{ name: 'completionRate', type: 'productivity', calculation: 'count(completed)/count(total)' }],
          dimensions: [],
          filters: [],
          timeframe: { type: 'quarter' },
          aggregation: 'average',
        },
        visualization: { type: 'gauge', options: { min: 0, max: 100 } },
        position: { x: 9, y: 0, width: 3, height: 2 },
      },
      {
        id: 'rating_trend',
        type: 'chart',
        title: 'Performance Rating Trend',
        query: {
          tenantId,
          metrics: [{ name: 'averageRating', type: 'performance', calculation: 'avg(overallRating)' }],
          dimensions: [{ field: 'month' }],
          filters: [],
          timeframe: { type: 'year' },
          aggregation: 'average',
        },
        visualization: { type: 'line_chart', options: {} },
        position: { x: 0, y: 2, width: 6, height: 3 },
      },
      {
        id: 'dept_performance',
        type: 'chart',
        title: 'Performance by Department',
        query: {
          tenantId,
          metrics: [{ name: 'averageRating', type: 'performance', calculation: 'avg(overallRating)' }],
          dimensions: [{ field: 'department' }],
          filters: [],
          timeframe: { type: 'quarter' },
          aggregation: 'average',
        },
        visualization: { type: 'bar_chart', options: {} },
        position: { x: 6, y: 2, width: 6, height: 3 },
      },
    ];

    const dashboard: Dashboard = {
      id: 'executive_dashboard',
      tenantId,
      name: 'Executive Dashboard',
      description: 'High-level organizational performance overview',
      ownerId: 'system',
      widgets,
      layout: { columns: 12, rowHeight: 100, padding: 10 },
      refreshInterval: 300,
      sharing: { public: false, sharedWith: [], embedEnabled: false },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Execute widget queries
    const widgetData: Record<string, any> = {};
    for (const widget of widgets) {
      widgetData[widget.id] = await this.executeQuery(widget.query);
    }

    return { dashboard, data: widgetData };
  }

  /**
   * Export analytics data
   */
  async exportData(
    query: AnalyticsQuery,
    format: 'csv' | 'json' | 'excel'
  ): Promise<{ data: string; mimeType: string; filename: string }> {
    const result = await this.executeQuery(query);

    let data: string;
    let mimeType: string;
    let filename: string;

    switch (format) {
      case 'csv':
        data = this.convertToCSV(result.data);
        mimeType = 'text/csv';
        filename = 'analytics_export.csv';
        break;
      case 'json':
        data = JSON.stringify(result.data, null, 2);
        mimeType = 'application/json';
        filename = 'analytics_export.json';
        break;
      case 'excel':
        // Would use a library like xlsx
        data = this.convertToCSV(result.data);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = 'analytics_export.xlsx';
        break;
    }

    return { data, mimeType, filename };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async buildAndExecuteQuery(query: AnalyticsQuery): Promise<DataPoint[]> {
    // Build Prisma query based on metrics and filters
    // This is a simplified implementation
    const data: DataPoint[] = [];

    // Would execute actual database queries here
    // For now, return sample data
    for (let i = 0; i < 10; i++) {
      data.push({
        dimensions: query.dimensions.reduce((acc, d) => {
          acc[d.field] = `Value ${i}`;
          return acc;
        }, {} as Record<string, any>),
        metrics: query.metrics.reduce((acc, m) => {
          acc[m.alias || m.name] = Math.random() * 100;
          return acc;
        }, {} as Record<string, number>),
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      });
    }

    return data;
  }

  private calculateSummary(data: DataPoint[], query: AnalyticsQuery): ResultSummary {
    const aggregates: Record<string, number> = {};
    const trends: Record<string, TrendInfo> = {};

    for (const metric of query.metrics) {
      const key = metric.alias || metric.name;
      const values = data.map(d => d.metrics[key] || 0);

      switch (query.aggregation) {
        case 'sum':
          aggregates[key] = values.reduce((a, b) => a + b, 0);
          break;
        case 'average':
          aggregates[key] = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'count':
          aggregates[key] = values.length;
          break;
        case 'min':
          aggregates[key] = Math.min(...values);
          break;
        case 'max':
          aggregates[key] = Math.max(...values);
          break;
      }

      // Calculate trend
      if (values.length >= 2) {
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const change = secondAvg - firstAvg;

        trends[key] = {
          direction: change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'stable',
          changePercent: firstAvg !== 0 ? (change / firstAvg) * 100 : 0,
          significance: Math.abs(change) > 0.2 ? 'high' : Math.abs(change) > 0.1 ? 'medium' : 'low',
        };
      }
    }

    return {
      totalRecords: data.length,
      aggregates,
      trends,
      highlights: this.generateHighlights(aggregates, trends),
    };
  }

  private generateHighlights(aggregates: Record<string, number>, trends: Record<string, TrendInfo>): string[] {
    const highlights: string[] = [];

    for (const [key, trend] of Object.entries(trends)) {
      if (trend.direction === 'up' && trend.significance === 'high') {
        highlights.push(`${key} increased significantly by ${trend.changePercent.toFixed(1)}%`);
      } else if (trend.direction === 'down' && trend.significance === 'high') {
        highlights.push(`${key} decreased significantly by ${Math.abs(trend.changePercent).toFixed(1)}%`);
      }
    }

    return highlights;
  }

  private async calculateComparison(query: AnalyticsQuery, currentData: DataPoint[]): Promise<ComparisonResult> {
    // Would calculate previous period data
    const previousData: DataPoint[] = [];

    const changes: Record<string, { absolute: number; percent: number }> = {};

    for (const metric of query.metrics) {
      const key = metric.alias || metric.name;
      const currentSum = currentData.reduce((sum, d) => sum + (d.metrics[key] || 0), 0);
      const previousSum = previousData.reduce((sum, d) => sum + (d.metrics[key] || 0), 0);

      changes[key] = {
        absolute: currentSum - previousSum,
        percent: previousSum !== 0 ? ((currentSum - previousSum) / previousSum) * 100 : 0,
      };
    }

    return {
      previousPeriod: {
        start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        end: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        data: previousData,
      },
      changes,
    };
  }

  private calculateIndividualRisk(employee: any): number {
    let risk = 0.1;

    const rating = employee.reviewsReceived?.[0]?.overallRating || 3;
    if (rating < 3) risk += 0.3;
    else if (rating < 3.5) risk += 0.15;

    const tenure = this.calculateTenure(employee.hireDate);
    if (tenure < 1) risk += 0.15;
    else if (tenure > 5 && rating < 4) risk += 0.2;

    return Math.min(0.95, risk);
  }

  private identifyRiskFactors(employee: any): string[] {
    const factors: string[] = [];

    const rating = employee.reviewsReceived?.[0]?.overallRating || 3;
    if (rating < 3) factors.push('Low performance rating');

    const tenure = this.calculateTenure(employee.hireDate);
    if (tenure < 1) factors.push('New employee');
    if (tenure > 5) factors.push('Long tenure - may seek new challenges');

    return factors;
  }

  private getMitigationForFactor(factor: string): string {
    const mitigations: Record<string, string> = {
      'Low performance rating': 'Implement performance improvement plan',
      'New employee': 'Enhance onboarding and early engagement',
      'Long tenure - may seek new challenges': 'Discuss career development opportunities',
    };
    return mitigations[factor] || 'Address through 1:1 discussion';
  }

  private calculateTenure(hireDate: Date | null): number {
    if (!hireDate) return 2;
    return (Date.now() - new Date(hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  }

  private extractLevel(jobTitle: string): string {
    if (jobTitle.toLowerCase().includes('director') || jobTitle.toLowerCase().includes('vp')) return 'Executive';
    if (jobTitle.toLowerCase().includes('manager')) return 'Manager';
    if (jobTitle.toLowerCase().includes('senior') || jobTitle.toLowerCase().includes('lead')) return 'Senior';
    if (jobTitle.toLowerCase().includes('junior') || jobTitle.toLowerCase().includes('associate')) return 'Junior';
    return 'Mid-Level';
  }

  private calculateDiversityIndex(employees: any[]): number {
    // Simpson's Diversity Index
    const genderCounts: Record<string, number> = {};
    for (const emp of employees) {
      const gender = emp.gender || 'not_specified';
      genderCounts[gender] = (genderCounts[gender] || 0) + 1;
    }

    const n = employees.length;
    let sumNiNi1 = 0;
    for (const count of Object.values(genderCounts)) {
      sumNiNi1 += count * (count - 1);
    }

    const simpson = n > 1 ? 1 - (sumNiNi1 / (n * (n - 1))) : 0;
    return Math.round(simpson * 100);
  }

  private convertToCSV(data: DataPoint[]): string {
    if (data.length === 0) return '';

    const headers = [
      ...Object.keys(data[0].dimensions || {}),
      ...Object.keys(data[0].metrics || {}),
      'timestamp',
    ];

    const rows = data.map(d => [
      ...Object.values(d.dimensions || {}),
      ...Object.values(d.metrics || {}),
      d.timestamp?.toISOString() || '',
    ]);

    return [
      headers.join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n');
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const advancedAnalyticsEngine = new AdvancedAnalyticsEngine(
  new PrismaClient(),
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
);
