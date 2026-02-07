/**
 * Real-Time Performance Graph / Performance Timeline
 * USP Feature 3: Time-series view of performance evolution
 *
 * This service:
 * - Tracks performance signals continuously, not just at review time
 * - Eliminates single-point annual bias
 * - Shows performance trends and trajectories
 * - Provides real-time performance indicators
 * - Enables early intervention for performance issues
 */

export interface PerformanceSignal {
  id: string;
  userId: string;
  type: SignalType;
  category: SignalCategory;
  value: number; // Normalized 0-100
  weight: number; // Importance weight
  source: SignalSource;
  timestamp: Date;
  metadata: Record<string, any>;
  isVerified: boolean;
}

export type SignalType =
  | 'TASK_COMPLETION'
  | 'GOAL_PROGRESS'
  | 'FEEDBACK_RECEIVED'
  | 'RECOGNITION_RECEIVED'
  | 'CODE_QUALITY'
  | 'CODE_VOLUME'
  | 'REVIEW_PARTICIPATION'
  | 'MEETING_CONTRIBUTION'
  | 'TICKET_RESOLUTION'
  | 'CUSTOMER_SATISFACTION'
  | 'INCIDENT_RESPONSE'
  | 'DOCUMENTATION_CONTRIBUTION'
  | 'MENTORSHIP_ACTIVITY'
  | 'LEARNING_COMPLETION'
  | 'COLLABORATION_INDEX'
  | 'INNOVATION_CONTRIBUTION'
  | 'DEADLINE_ADHERENCE'
  | 'QUALITY_SCORE'
  | 'PEER_RATING'
  | 'MANAGER_CHECKPOINT';

export type SignalCategory =
  | 'PRODUCTIVITY'
  | 'QUALITY'
  | 'COLLABORATION'
  | 'GROWTH'
  | 'LEADERSHIP'
  | 'RELIABILITY'
  | 'INNOVATION';

export type SignalSource =
  | 'JIRA'
  | 'GITHUB'
  | 'GITLAB'
  | 'SLACK'
  | 'TEAMS'
  | 'CALENDAR'
  | 'LMS'
  | 'CRM'
  | 'HELPDESK'
  | 'MANUAL'
  | 'SYSTEM';

export interface PerformanceSnapshot {
  userId: string;
  timestamp: Date;
  period: SnapshotPeriod;
  scores: CategoryScores;
  overallScore: number;
  trend: TrendDirection;
  trendStrength: number; // 0-100
  signalCount: number;
  highlights: string[];
  concerns: string[];
}

export type SnapshotPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

export type TrendDirection = 'IMPROVING' | 'STABLE' | 'DECLINING' | 'VOLATILE';

export interface CategoryScores {
  productivity: number;
  quality: number;
  collaboration: number;
  growth: number;
  leadership: number;
  reliability: number;
  innovation: number;
}

export interface PerformanceTimeline {
  userId: string;
  userName: string;
  timeRange: { start: Date; end: Date };
  granularity: TimelineGranularity;
  dataPoints: TimelineDataPoint[];
  summary: TimelineSummary;
  milestones: PerformanceMilestone[];
  anomalies: PerformanceAnomaly[];
  forecast: PerformanceForecast;
}

export type TimelineGranularity = 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';

export interface TimelineDataPoint {
  timestamp: Date;
  overallScore: number;
  categoryScores: CategoryScores;
  signalCount: number;
  confidence: number; // Based on signal quality and quantity
  annotations: string[];
}

export interface TimelineSummary {
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  volatility: number;
  consistencyScore: number;
  growthRate: number; // Percentage change over period
  strongestCategory: keyof CategoryScores;
  weakestCategory: keyof CategoryScores;
  trendAnalysis: string;
}

export interface PerformanceMilestone {
  type: 'PEAK' | 'BREAKTHROUGH' | 'ACHIEVEMENT' | 'RECOGNITION' | 'CERTIFICATION' | 'PROMOTION';
  timestamp: Date;
  title: string;
  description: string;
  impact: number; // Score impact
  linkedSignals: string[];
}

export interface PerformanceAnomaly {
  type: 'SPIKE' | 'DROP' | 'GAP' | 'INCONSISTENCY';
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  description: string;
  possibleCauses: string[];
  recommendedAction: string;
}

export interface PerformanceForecast {
  nextQuarter: {
    predictedScore: number;
    confidence: number;
    factors: string[];
  };
  trajectory: 'GROWTH' | 'STABLE' | 'DECLINE';
  riskFactors: string[];
  opportunities: string[];
}

export interface RealTimeIndicator {
  userId: string;
  calculatedAt: Date;
  status: 'EXCEPTIONAL' | 'ON_TRACK' | 'NEEDS_ATTENTION' | 'AT_RISK' | 'CRITICAL';
  currentScore: number;
  scoreTrend: number; // Percentage change from last period
  velocity: number; // Rate of change
  momentum: 'ACCELERATING' | 'STEADY' | 'DECELERATING' | 'REVERSING';
  alerts: PerformanceAlert[];
  recommendations: string[];
}

export interface PerformanceAlert {
  type: 'WARNING' | 'CONCERN' | 'OPPORTUNITY' | 'RECOGNITION';
  category: SignalCategory;
  message: string;
  triggeredAt: Date;
  severity: number; // 1-10
  actionRequired: boolean;
}

export interface TeamPerformanceHeatmap {
  teamId: string;
  teamName: string;
  period: { start: Date; end: Date };
  members: TeamMemberPerformance[];
  teamAverages: CategoryScores;
  distribution: PerformanceDistribution;
  trends: TeamTrends;
}

export interface TeamMemberPerformance {
  userId: string;
  userName: string;
  currentScore: number;
  trend: TrendDirection;
  position: 'TOP' | 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE' | 'BOTTOM';
  categoryScores: CategoryScores;
}

export interface PerformanceDistribution {
  exceptional: number; // Count of members
  aboveAverage: number;
  average: number;
  belowAverage: number;
  needsAttention: number;
}

export interface TeamTrends {
  improving: number;
  stable: number;
  declining: number;
  newMembers: number;
}

// Signal category mappings
const SIGNAL_CATEGORY_MAP: Record<SignalType, SignalCategory> = {
  'TASK_COMPLETION': 'PRODUCTIVITY',
  'GOAL_PROGRESS': 'PRODUCTIVITY',
  'FEEDBACK_RECEIVED': 'COLLABORATION',
  'RECOGNITION_RECEIVED': 'COLLABORATION',
  'CODE_QUALITY': 'QUALITY',
  'CODE_VOLUME': 'PRODUCTIVITY',
  'REVIEW_PARTICIPATION': 'COLLABORATION',
  'MEETING_CONTRIBUTION': 'COLLABORATION',
  'TICKET_RESOLUTION': 'PRODUCTIVITY',
  'CUSTOMER_SATISFACTION': 'QUALITY',
  'INCIDENT_RESPONSE': 'RELIABILITY',
  'DOCUMENTATION_CONTRIBUTION': 'QUALITY',
  'MENTORSHIP_ACTIVITY': 'LEADERSHIP',
  'LEARNING_COMPLETION': 'GROWTH',
  'COLLABORATION_INDEX': 'COLLABORATION',
  'INNOVATION_CONTRIBUTION': 'INNOVATION',
  'DEADLINE_ADHERENCE': 'RELIABILITY',
  'QUALITY_SCORE': 'QUALITY',
  'PEER_RATING': 'COLLABORATION',
  'MANAGER_CHECKPOINT': 'PRODUCTIVITY',
};

// Default weights for signal types
const SIGNAL_WEIGHTS: Record<SignalType, number> = {
  'TASK_COMPLETION': 1.0,
  'GOAL_PROGRESS': 1.5,
  'FEEDBACK_RECEIVED': 1.0,
  'RECOGNITION_RECEIVED': 1.2,
  'CODE_QUALITY': 1.3,
  'CODE_VOLUME': 0.8,
  'REVIEW_PARTICIPATION': 0.9,
  'MEETING_CONTRIBUTION': 0.6,
  'TICKET_RESOLUTION': 1.0,
  'CUSTOMER_SATISFACTION': 1.4,
  'INCIDENT_RESPONSE': 1.2,
  'DOCUMENTATION_CONTRIBUTION': 0.8,
  'MENTORSHIP_ACTIVITY': 1.1,
  'LEARNING_COMPLETION': 0.9,
  'COLLABORATION_INDEX': 1.0,
  'INNOVATION_CONTRIBUTION': 1.3,
  'DEADLINE_ADHERENCE': 1.1,
  'QUALITY_SCORE': 1.2,
  'PEER_RATING': 1.0,
  'MANAGER_CHECKPOINT': 1.5,
};

export class PerformanceTimelineService {
  /**
   * Records a new performance signal
   */
  recordSignal(
    userId: string,
    type: SignalType,
    value: number,
    source: SignalSource,
    metadata: Record<string, any> = {}
  ): PerformanceSignal {
    const signal: PerformanceSignal = {
      id: this.generateId(),
      userId,
      type,
      category: SIGNAL_CATEGORY_MAP[type],
      value: Math.max(0, Math.min(100, value)),
      weight: SIGNAL_WEIGHTS[type],
      source,
      timestamp: new Date(),
      metadata,
      isVerified: source !== 'MANUAL',
    };

    return signal;
  }

  /**
   * Creates a performance snapshot for a given period
   */
  createSnapshot(
    userId: string,
    signals: PerformanceSignal[],
    period: SnapshotPeriod,
    periodEnd: Date = new Date()
  ): PerformanceSnapshot {
    const periodStart = this.getPeriodStart(periodEnd, period);

    // Filter signals for this period
    const periodSignals = signals.filter(s =>
      s.timestamp >= periodStart && s.timestamp <= periodEnd
    );

    // Calculate category scores
    const scores = this.calculateCategoryScores(periodSignals);

    // Calculate overall score
    const overallScore = this.calculateOverallScore(scores, periodSignals);

    // Determine trend
    const previousPeriodEnd = periodStart;
    const previousPeriodStart = this.getPeriodStart(previousPeriodEnd, period);
    const previousSignals = signals.filter(s =>
      s.timestamp >= previousPeriodStart && s.timestamp < periodStart
    );

    const { trend, trendStrength } = this.calculateTrend(
      periodSignals,
      previousSignals
    );

    // Generate highlights and concerns
    const highlights = this.identifyHighlights(periodSignals, scores);
    const concerns = this.identifyConcerns(periodSignals, scores);

    return {
      userId,
      timestamp: periodEnd,
      period,
      scores,
      overallScore,
      trend,
      trendStrength,
      signalCount: periodSignals.length,
      highlights,
      concerns,
    };
  }

  /**
   * Builds a complete performance timeline
   */
  buildTimeline(
    userId: string,
    userName: string,
    signals: PerformanceSignal[],
    startDate: Date,
    endDate: Date,
    granularity: TimelineGranularity
  ): PerformanceTimeline {
    const dataPoints = this.generateDataPoints(
      signals,
      startDate,
      endDate,
      granularity
    );

    const summary = this.calculateTimelineSummary(dataPoints);
    const milestones = this.identifyMilestones(signals, dataPoints);
    const anomalies = this.detectAnomalies(dataPoints);
    const forecast = this.generateForecast(dataPoints, signals);

    return {
      userId,
      userName,
      timeRange: { start: startDate, end: endDate },
      granularity,
      dataPoints,
      summary,
      milestones,
      anomalies,
      forecast,
    };
  }

  /**
   * Gets real-time performance indicator
   */
  getRealTimeIndicator(
    userId: string,
    recentSignals: PerformanceSignal[],
    historicalSnapshots: PerformanceSnapshot[]
  ): RealTimeIndicator {
    const now = new Date();

    // Calculate current score from recent signals
    const last7Days = recentSignals.filter(s => {
      const daysDiff = (now.getTime() - s.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    });

    const scores = this.calculateCategoryScores(last7Days);
    const currentScore = this.calculateOverallScore(scores, last7Days);

    // Calculate trend from historical snapshots
    let scoreTrend = 0;
    let velocity = 0;
    let momentum: RealTimeIndicator['momentum'] = 'STEADY';

    if (historicalSnapshots.length >= 2) {
      const sorted = [...historicalSnapshots].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );

      const latestScore = sorted[0].overallScore;
      const previousScore = sorted[1].overallScore;

      scoreTrend = latestScore - previousScore;
      velocity = this.calculateVelocity(sorted);
      momentum = this.determineMomentum(sorted);
    }

    // Determine status
    const status = this.determineStatus(currentScore, scoreTrend);

    // Generate alerts
    const alerts = this.generateAlerts(scores, currentScore, scoreTrend);

    // Generate recommendations
    const recommendations = this.generateTimelineRecommendations(
      scores,
      currentScore,
      alerts
    );

    return {
      userId,
      calculatedAt: now,
      status,
      currentScore,
      scoreTrend: Math.round(scoreTrend * 100) / 100,
      velocity: Math.round(velocity * 100) / 100,
      momentum,
      alerts,
      recommendations,
    };
  }

  /**
   * Compares performance across a team
   */
  buildTeamHeatmap(
    teamId: string,
    teamName: string,
    memberSignals: Map<string, { userName: string; signals: PerformanceSignal[] }>,
    period: { start: Date; end: Date }
  ): TeamPerformanceHeatmap {
    const members: TeamMemberPerformance[] = [];
    const allScores: number[] = [];

    for (const [userId, { userName, signals }] of memberSignals) {
      const periodSignals = signals.filter(s =>
        s.timestamp >= period.start && s.timestamp <= period.end
      );

      const categoryScores = this.calculateCategoryScores(periodSignals);
      const currentScore = this.calculateOverallScore(categoryScores, periodSignals);

      allScores.push(currentScore);

      // Calculate trend from last month
      const lastMonth = new Date(period.end);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const previousSignals = signals.filter(s =>
        s.timestamp >= lastMonth && s.timestamp < period.start
      );

      const previousScores = this.calculateCategoryScores(previousSignals);
      const previousScore = this.calculateOverallScore(previousScores, previousSignals);

      let trend: TrendDirection = 'STABLE';
      const diff = currentScore - previousScore;
      if (diff > 5) trend = 'IMPROVING';
      else if (diff < -5) trend = 'DECLINING';

      members.push({
        userId,
        userName,
        currentScore,
        trend,
        position: 'AVERAGE', // Will be calculated after
        categoryScores,
      });
    }

    // Calculate positions
    const sortedScores = [...allScores].sort((a, b) => b - a);
    const avgScore = sortedScores.reduce((a, b) => a + b, 0) / sortedScores.length;

    for (const member of members) {
      const percentile = (sortedScores.indexOf(member.currentScore) + 1) / sortedScores.length;

      if (percentile <= 0.1) member.position = 'TOP';
      else if (member.currentScore > avgScore + 10) member.position = 'ABOVE_AVERAGE';
      else if (member.currentScore < avgScore - 10) member.position = 'BELOW_AVERAGE';
      else if (percentile >= 0.9) member.position = 'BOTTOM';
      else member.position = 'AVERAGE';
    }

    // Calculate team averages
    const teamAverages = this.calculateTeamAverages(members);

    // Calculate distribution
    const distribution = this.calculateDistribution(members);

    // Calculate trends
    const trends = this.calculateTeamTrends(members);

    return {
      teamId,
      teamName,
      period,
      members,
      teamAverages,
      distribution,
      trends,
    };
  }

  /**
   * Generates time-series data for charting
   */
  generateChartData(
    timeline: PerformanceTimeline
  ): {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      color: string;
    }>;
  } {
    const labels = timeline.dataPoints.map(dp =>
      this.formatTimestamp(dp.timestamp, timeline.granularity)
    );

    const datasets = [
      {
        label: 'Overall Score',
        data: timeline.dataPoints.map(dp => dp.overallScore),
        color: '#3B82F6',
      },
      {
        label: 'Productivity',
        data: timeline.dataPoints.map(dp => dp.categoryScores.productivity),
        color: '#10B981',
      },
      {
        label: 'Quality',
        data: timeline.dataPoints.map(dp => dp.categoryScores.quality),
        color: '#8B5CF6',
      },
      {
        label: 'Collaboration',
        data: timeline.dataPoints.map(dp => dp.categoryScores.collaboration),
        color: '#F59E0B',
      },
    ];

    return { labels, datasets };
  }

  // Private helper methods

  private generateId(): string {
    return `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getPeriodStart(end: Date, period: SnapshotPeriod): Date {
    const start = new Date(end);

    switch (period) {
      case 'DAILY':
        start.setDate(start.getDate() - 1);
        break;
      case 'WEEKLY':
        start.setDate(start.getDate() - 7);
        break;
      case 'MONTHLY':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'QUARTERLY':
        start.setMonth(start.getMonth() - 3);
        break;
    }

    return start;
  }

  private calculateCategoryScores(signals: PerformanceSignal[]): CategoryScores {
    const categoryTotals: Record<SignalCategory, { sum: number; weight: number }> = {
      PRODUCTIVITY: { sum: 0, weight: 0 },
      QUALITY: { sum: 0, weight: 0 },
      COLLABORATION: { sum: 0, weight: 0 },
      GROWTH: { sum: 0, weight: 0 },
      LEADERSHIP: { sum: 0, weight: 0 },
      RELIABILITY: { sum: 0, weight: 0 },
      INNOVATION: { sum: 0, weight: 0 },
    };

    for (const signal of signals) {
      const category = categoryTotals[signal.category];
      category.sum += signal.value * signal.weight;
      category.weight += signal.weight;
    }

    return {
      productivity: this.safeAverage(categoryTotals.PRODUCTIVITY),
      quality: this.safeAverage(categoryTotals.QUALITY),
      collaboration: this.safeAverage(categoryTotals.COLLABORATION),
      growth: this.safeAverage(categoryTotals.GROWTH),
      leadership: this.safeAverage(categoryTotals.LEADERSHIP),
      reliability: this.safeAverage(categoryTotals.RELIABILITY),
      innovation: this.safeAverage(categoryTotals.INNOVATION),
    };
  }

  private safeAverage(totals: { sum: number; weight: number }): number {
    return totals.weight > 0 ? Math.round(totals.sum / totals.weight) : 50;
  }

  private calculateOverallScore(
    scores: CategoryScores,
    signals: PerformanceSignal[]
  ): number {
    const weights = {
      productivity: 0.20,
      quality: 0.20,
      collaboration: 0.15,
      growth: 0.10,
      leadership: 0.10,
      reliability: 0.15,
      innovation: 0.10,
    };

    let totalWeight = 0;
    let weightedSum = 0;

    for (const [category, weight] of Object.entries(weights)) {
      const score = scores[category as keyof CategoryScores];
      if (score > 0) {
        weightedSum += score * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
  }

  private calculateTrend(
    currentSignals: PerformanceSignal[],
    previousSignals: PerformanceSignal[]
  ): { trend: TrendDirection; trendStrength: number } {
    if (previousSignals.length === 0) {
      return { trend: 'STABLE', trendStrength: 0 };
    }

    const currentScores = this.calculateCategoryScores(currentSignals);
    const currentOverall = this.calculateOverallScore(currentScores, currentSignals);

    const previousScores = this.calculateCategoryScores(previousSignals);
    const previousOverall = this.calculateOverallScore(previousScores, previousSignals);

    const diff = currentOverall - previousOverall;
    const percentChange = previousOverall > 0 ? (diff / previousOverall) * 100 : 0;

    // Check for volatility
    const volatility = this.calculateVolatility(currentSignals);

    let trend: TrendDirection;
    if (volatility > 30) {
      trend = 'VOLATILE';
    } else if (diff > 5) {
      trend = 'IMPROVING';
    } else if (diff < -5) {
      trend = 'DECLINING';
    } else {
      trend = 'STABLE';
    }

    return {
      trend,
      trendStrength: Math.min(100, Math.abs(percentChange) * 2),
    };
  }

  private calculateVolatility(signals: PerformanceSignal[]): number {
    if (signals.length < 5) return 0;

    const values = signals.map(s => s.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;

    return Math.sqrt(variance);
  }

  private identifyHighlights(
    signals: PerformanceSignal[],
    scores: CategoryScores
  ): string[] {
    const highlights: string[] = [];

    // Find exceptional scores
    for (const [category, score] of Object.entries(scores)) {
      if (score >= 80) {
        highlights.push(`Exceptional ${category}: ${score}%`);
      }
    }

    // Find high-impact signals
    const highImpact = signals.filter(s => s.value >= 85);
    if (highImpact.length > 0) {
      highlights.push(`${highImpact.length} high-impact contributions`);
    }

    // Recognition signals
    const recognitions = signals.filter(s => s.type === 'RECOGNITION_RECEIVED');
    if (recognitions.length > 0) {
      highlights.push(`Received ${recognitions.length} recognition(s)`);
    }

    return highlights.slice(0, 5);
  }

  private identifyConcerns(
    signals: PerformanceSignal[],
    scores: CategoryScores
  ): string[] {
    const concerns: string[] = [];

    // Find low scores
    for (const [category, score] of Object.entries(scores)) {
      if (score < 40 && score > 0) {
        concerns.push(`${category} needs attention: ${score}%`);
      }
    }

    // Check for declining patterns
    const sortedSignals = [...signals].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    if (sortedSignals.length >= 5) {
      const recent = sortedSignals.slice(-5);
      const earlier = sortedSignals.slice(0, 5);

      const recentAvg = recent.reduce((sum, s) => sum + s.value, 0) / recent.length;
      const earlierAvg = earlier.reduce((sum, s) => sum + s.value, 0) / earlier.length;

      if (earlierAvg - recentAvg > 15) {
        concerns.push('Performance showing declining trend');
      }
    }

    return concerns.slice(0, 3);
  }

  private generateDataPoints(
    signals: PerformanceSignal[],
    startDate: Date,
    endDate: Date,
    granularity: TimelineGranularity
  ): TimelineDataPoint[] {
    const dataPoints: TimelineDataPoint[] = [];
    const msPerPeriod = this.getMsPerPeriod(granularity);

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const periodEnd = new Date(currentDate.getTime() + msPerPeriod);

      const periodSignals = signals.filter(s =>
        s.timestamp >= currentDate && s.timestamp < periodEnd
      );

      const categoryScores = this.calculateCategoryScores(periodSignals);
      const overallScore = this.calculateOverallScore(categoryScores, periodSignals);

      // Calculate confidence based on signal count and verification
      const verifiedCount = periodSignals.filter(s => s.isVerified).length;
      const confidence = periodSignals.length === 0 ? 0 :
        Math.min(100, (periodSignals.length * 10 + verifiedCount * 5));

      dataPoints.push({
        timestamp: new Date(currentDate),
        overallScore,
        categoryScores,
        signalCount: periodSignals.length,
        confidence,
        annotations: this.getAnnotationsForPeriod(periodSignals),
      });

      currentDate = periodEnd;
    }

    return dataPoints;
  }

  private getMsPerPeriod(granularity: TimelineGranularity): number {
    const ms = {
      HOUR: 60 * 60 * 1000,
      DAY: 24 * 60 * 60 * 1000,
      WEEK: 7 * 24 * 60 * 60 * 1000,
      MONTH: 30 * 24 * 60 * 60 * 1000,
    };
    return ms[granularity];
  }

  private getAnnotationsForPeriod(signals: PerformanceSignal[]): string[] {
    const annotations: string[] = [];

    // Check for special signal types
    if (signals.some(s => s.type === 'CERTIFICATION')) {
      annotations.push('Certification completed');
    }

    if (signals.some(s => s.type === 'RECOGNITION_RECEIVED')) {
      annotations.push('Recognition received');
    }

    // Check for high-value signals
    const exceptional = signals.filter(s => s.value >= 95);
    if (exceptional.length > 0) {
      annotations.push(`${exceptional.length} exceptional contribution(s)`);
    }

    return annotations;
  }

  private calculateTimelineSummary(dataPoints: TimelineDataPoint[]): TimelineSummary {
    if (dataPoints.length === 0) {
      return {
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        volatility: 0,
        consistencyScore: 0,
        growthRate: 0,
        strongestCategory: 'productivity',
        weakestCategory: 'productivity',
        trendAnalysis: 'Insufficient data',
      };
    }

    const scores = dataPoints.map(dp => dp.overallScore).filter(s => s > 0);

    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    const highestScore = Math.max(...scores, 0);
    const lowestScore = Math.min(...scores, 100);

    const volatility = this.calculateScoreVolatility(scores);
    const consistencyScore = Math.max(0, 100 - volatility * 2);

    // Growth rate
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.length > 0
      ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      : 0;
    const secondAvg = secondHalf.length > 0
      ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
      : 0;

    const growthRate = firstAvg > 0
      ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100)
      : 0;

    // Find strongest/weakest categories
    const categoryAverages = this.calculateAverageCategoryScores(dataPoints);
    const categories = Object.entries(categoryAverages).sort((a, b) => b[1] - a[1]);

    const strongestCategory = categories[0][0] as keyof CategoryScores;
    const weakestCategory = categories[categories.length - 1][0] as keyof CategoryScores;

    // Generate trend analysis
    let trendAnalysis = 'Performance is ';
    if (growthRate > 10) trendAnalysis += 'showing strong improvement';
    else if (growthRate > 0) trendAnalysis += 'gradually improving';
    else if (growthRate > -10) trendAnalysis += 'stable';
    else trendAnalysis += 'declining - intervention may be needed';

    return {
      averageScore,
      highestScore,
      lowestScore,
      volatility: Math.round(volatility),
      consistencyScore,
      growthRate,
      strongestCategory,
      weakestCategory,
      trendAnalysis,
    };
  }

  private calculateScoreVolatility(scores: number[]): number {
    if (scores.length < 2) return 0;

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;

    return Math.sqrt(variance);
  }

  private calculateAverageCategoryScores(
    dataPoints: TimelineDataPoint[]
  ): Record<keyof CategoryScores, number> {
    const totals: Record<keyof CategoryScores, number[]> = {
      productivity: [],
      quality: [],
      collaboration: [],
      growth: [],
      leadership: [],
      reliability: [],
      innovation: [],
    };

    for (const dp of dataPoints) {
      for (const [key, value] of Object.entries(dp.categoryScores)) {
        if (value > 0) {
          totals[key as keyof CategoryScores].push(value);
        }
      }
    }

    const averages: Record<string, number> = {};
    for (const [key, values] of Object.entries(totals)) {
      averages[key] = values.length > 0
        ? values.reduce((a, b) => a + b, 0) / values.length
        : 0;
    }

    return averages as Record<keyof CategoryScores, number>;
  }

  private identifyMilestones(
    signals: PerformanceSignal[],
    dataPoints: TimelineDataPoint[]
  ): PerformanceMilestone[] {
    const milestones: PerformanceMilestone[] = [];

    // Find peak scores
    const scores = dataPoints.map(dp => dp.overallScore);
    const maxScore = Math.max(...scores);
    const maxIndex = scores.indexOf(maxScore);

    if (maxScore >= 80) {
      milestones.push({
        type: 'PEAK',
        timestamp: dataPoints[maxIndex].timestamp,
        title: 'Performance Peak',
        description: `Reached highest score of ${maxScore}`,
        impact: maxScore,
        linkedSignals: [],
      });
    }

    // Find certifications
    const certifications = signals.filter(s => s.type === 'CERTIFICATION');
    for (const cert of certifications) {
      milestones.push({
        type: 'CERTIFICATION',
        timestamp: cert.timestamp,
        title: 'Certification Achieved',
        description: cert.metadata.name || 'Professional certification completed',
        impact: cert.value,
        linkedSignals: [cert.id],
      });
    }

    // Find recognitions
    const recognitions = signals.filter(s => s.type === 'RECOGNITION_RECEIVED');
    for (const rec of recognitions) {
      milestones.push({
        type: 'RECOGNITION',
        timestamp: rec.timestamp,
        title: 'Recognition Received',
        description: rec.metadata.reason || 'Recognized for outstanding contribution',
        impact: rec.value,
        linkedSignals: [rec.id],
      });
    }

    return milestones.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private detectAnomalies(dataPoints: TimelineDataPoint[]): PerformanceAnomaly[] {
    const anomalies: PerformanceAnomaly[] = [];

    if (dataPoints.length < 3) return anomalies;

    const scores = dataPoints.map(dp => dp.overallScore);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const stdDev = Math.sqrt(
      scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length
    );

    for (let i = 1; i < dataPoints.length; i++) {
      const dp = dataPoints[i];
      const prevDp = dataPoints[i - 1];

      // Detect spikes
      if (dp.overallScore - avg > 2 * stdDev) {
        anomalies.push({
          type: 'SPIKE',
          severity: 'low',
          timestamp: dp.timestamp,
          description: `Unusual performance spike: ${dp.overallScore}% (avg: ${Math.round(avg)}%)`,
          possibleCauses: ['Project completion', 'Recognition event', 'Data entry batch'],
          recommendedAction: 'Verify signal sources for accuracy',
        });
      }

      // Detect drops
      if (avg - dp.overallScore > 2 * stdDev) {
        anomalies.push({
          type: 'DROP',
          severity: 'medium',
          timestamp: dp.timestamp,
          description: `Significant performance drop: ${dp.overallScore}% (avg: ${Math.round(avg)}%)`,
          possibleCauses: ['Time off', 'Role transition', 'External factors', 'Workload issues'],
          recommendedAction: 'Schedule check-in to understand context',
        });
      }

      // Detect gaps
      if (dp.signalCount === 0 && prevDp.signalCount > 0) {
        anomalies.push({
          type: 'GAP',
          severity: 'low',
          timestamp: dp.timestamp,
          description: 'No performance signals recorded for this period',
          possibleCauses: ['PTO', 'System integration issue', 'Role change'],
          recommendedAction: 'Confirm no data collection issues',
        });
      }
    }

    return anomalies;
  }

  private generateForecast(
    dataPoints: TimelineDataPoint[],
    signals: PerformanceSignal[]
  ): PerformanceForecast {
    if (dataPoints.length < 4) {
      return {
        nextQuarter: {
          predictedScore: 50,
          confidence: 20,
          factors: ['Insufficient historical data for accurate prediction'],
        },
        trajectory: 'STABLE',
        riskFactors: [],
        opportunities: [],
      };
    }

    // Simple linear regression for trend
    const scores = dataPoints.map(dp => dp.overallScore);
    const n = scores.length;

    const xMean = (n - 1) / 2;
    const yMean = scores.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (scores[i] - yMean);
      denominator += (i - xMean) * (i - xMean);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const predictedChange = slope * (n / 4); // Predict 1/4 of the data range ahead

    const predictedScore = Math.max(0, Math.min(100, yMean + predictedChange));

    // Determine trajectory
    let trajectory: PerformanceForecast['trajectory'] = 'STABLE';
    if (slope > 0.5) trajectory = 'GROWTH';
    else if (slope < -0.5) trajectory = 'DECLINE';

    // Calculate confidence based on consistency
    const volatility = this.calculateScoreVolatility(scores);
    const confidence = Math.max(20, 100 - volatility * 2);

    // Identify factors
    const factors: string[] = [];
    if (slope > 0) factors.push('Consistent upward trend in recent periods');
    if (slope < 0) factors.push('Downward trend detected');

    const recentAvg = scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
    if (recentAvg > yMean + 5) factors.push('Recent performance above historical average');
    if (recentAvg < yMean - 5) factors.push('Recent performance below historical average');

    // Risk factors
    const riskFactors: string[] = [];
    if (volatility > 20) riskFactors.push('High performance volatility');
    if (trajectory === 'DECLINE') riskFactors.push('Declining performance trajectory');

    const recentSignals = signals.filter(s => {
      const daysDiff = (Date.now() - s.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30;
    });

    if (recentSignals.length < 5) {
      riskFactors.push('Limited recent activity signals');
    }

    // Opportunities
    const opportunities: string[] = [];
    if (trajectory === 'GROWTH') opportunities.push('Continue growth trajectory with current practices');

    const categoryAvgs = this.calculateAverageCategoryScores(dataPoints);
    for (const [category, avg] of Object.entries(categoryAvgs)) {
      if (avg < 50) {
        opportunities.push(`Improve ${category} for balanced performance`);
      }
    }

    return {
      nextQuarter: {
        predictedScore: Math.round(predictedScore),
        confidence: Math.round(confidence),
        factors,
      },
      trajectory,
      riskFactors,
      opportunities,
    };
  }

  private calculateVelocity(snapshots: PerformanceSnapshot[]): number {
    if (snapshots.length < 3) return 0;

    const changes: number[] = [];
    for (let i = 1; i < snapshots.length; i++) {
      changes.push(snapshots[i - 1].overallScore - snapshots[i].overallScore);
    }

    return changes.reduce((a, b) => a + b, 0) / changes.length;
  }

  private determineMomentum(snapshots: PerformanceSnapshot[]): RealTimeIndicator['momentum'] {
    if (snapshots.length < 3) return 'STEADY';

    const recentChanges = [];
    for (let i = 0; i < Math.min(3, snapshots.length - 1); i++) {
      recentChanges.push(snapshots[i].overallScore - snapshots[i + 1].overallScore);
    }

    const avgRecentChange = recentChanges.reduce((a, b) => a + b, 0) / recentChanges.length;

    if (avgRecentChange > 2) {
      // Check if accelerating
      if (recentChanges[0] > recentChanges[1]) return 'ACCELERATING';
      return 'STEADY';
    } else if (avgRecentChange < -2) {
      if (recentChanges[0] < recentChanges[1]) return 'DECELERATING';
      return 'REVERSING';
    }

    return 'STEADY';
  }

  private determineStatus(score: number, trend: number): RealTimeIndicator['status'] {
    if (score >= 85) return 'EXCEPTIONAL';
    if (score >= 70 && trend >= 0) return 'ON_TRACK';
    if (score >= 50) return 'NEEDS_ATTENTION';
    if (score >= 30 || trend < -10) return 'AT_RISK';
    return 'CRITICAL';
  }

  private generateAlerts(
    scores: CategoryScores,
    overallScore: number,
    trend: number
  ): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];
    const now = new Date();

    // Category-specific alerts
    for (const [category, score] of Object.entries(scores)) {
      if (score < 40) {
        alerts.push({
          type: 'CONCERN',
          category: category.toUpperCase() as SignalCategory,
          message: `${category} score is below threshold (${score}%)`,
          triggeredAt: now,
          severity: score < 25 ? 8 : 5,
          actionRequired: score < 25,
        });
      }

      if (score >= 90) {
        alerts.push({
          type: 'RECOGNITION',
          category: category.toUpperCase() as SignalCategory,
          message: `Exceptional performance in ${category} (${score}%)`,
          triggeredAt: now,
          severity: 1,
          actionRequired: false,
        });
      }
    }

    // Trend alerts
    if (trend < -10) {
      alerts.push({
        type: 'WARNING',
        category: 'PRODUCTIVITY',
        message: `Performance declining: ${trend}% from last period`,
        triggeredAt: now,
        severity: Math.abs(trend) > 20 ? 9 : 6,
        actionRequired: true,
      });
    }

    if (trend > 15) {
      alerts.push({
        type: 'OPPORTUNITY',
        category: 'GROWTH',
        message: `Strong improvement: +${trend}% from last period`,
        triggeredAt: now,
        severity: 2,
        actionRequired: false,
      });
    }

    return alerts.sort((a, b) => b.severity - a.severity);
  }

  private generateTimelineRecommendations(
    scores: CategoryScores,
    overallScore: number,
    alerts: PerformanceAlert[]
  ): string[] {
    const recommendations: string[] = [];

    // Based on alerts
    const criticalAlerts = alerts.filter(a => a.severity >= 7);
    if (criticalAlerts.length > 0) {
      recommendations.push('Schedule 1:1 meeting to discuss recent performance trends');
    }

    // Based on category scores
    const weakCategories = Object.entries(scores)
      .filter(([, score]) => score < 50)
      .map(([category]) => category);

    if (weakCategories.length > 0) {
      recommendations.push(`Focus development on: ${weakCategories.join(', ')}`);
    }

    // Overall score recommendations
    if (overallScore < 50) {
      recommendations.push('Create performance improvement plan with specific milestones');
    } else if (overallScore >= 80) {
      recommendations.push('Consider for stretch assignments or leadership opportunities');
    }

    return recommendations;
  }

  private calculateTeamAverages(members: TeamMemberPerformance[]): CategoryScores {
    const totals: Record<keyof CategoryScores, number[]> = {
      productivity: [],
      quality: [],
      collaboration: [],
      growth: [],
      leadership: [],
      reliability: [],
      innovation: [],
    };

    for (const member of members) {
      for (const [key, value] of Object.entries(member.categoryScores)) {
        totals[key as keyof CategoryScores].push(value);
      }
    }

    const averages: CategoryScores = {
      productivity: 0,
      quality: 0,
      collaboration: 0,
      growth: 0,
      leadership: 0,
      reliability: 0,
      innovation: 0,
    };

    for (const [key, values] of Object.entries(totals)) {
      averages[key as keyof CategoryScores] = values.length > 0
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        : 0;
    }

    return averages;
  }

  private calculateDistribution(members: TeamMemberPerformance[]): PerformanceDistribution {
    return {
      exceptional: members.filter(m => m.currentScore >= 85).length,
      aboveAverage: members.filter(m => m.currentScore >= 70 && m.currentScore < 85).length,
      average: members.filter(m => m.currentScore >= 50 && m.currentScore < 70).length,
      belowAverage: members.filter(m => m.currentScore >= 30 && m.currentScore < 50).length,
      needsAttention: members.filter(m => m.currentScore < 30).length,
    };
  }

  private calculateTeamTrends(members: TeamMemberPerformance[]): TeamTrends {
    return {
      improving: members.filter(m => m.trend === 'IMPROVING').length,
      stable: members.filter(m => m.trend === 'STABLE').length,
      declining: members.filter(m => m.trend === 'DECLINING').length,
      newMembers: 0, // Would need additional data
    };
  }

  private formatTimestamp(date: Date, granularity: TimelineGranularity): string {
    switch (granularity) {
      case 'HOUR':
        return date.toLocaleString('en-US', { hour: 'numeric', day: 'numeric', month: 'short' });
      case 'DAY':
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      case 'WEEK':
        return `Week ${this.getWeekNumber(date)}`;
      case 'MONTH':
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
  }

  private getWeekNumber(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - start.getTime();
    const oneWeek = 604800000;
    return Math.ceil((diff + start.getDay() * 86400000) / oneWeek);
  }
}

export const performanceTimelineService = new PerformanceTimelineService();
