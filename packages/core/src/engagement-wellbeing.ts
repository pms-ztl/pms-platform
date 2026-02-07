/**
 * Employee Engagement & Wellbeing Module
 *
 * Comprehensive system for measuring and improving employee engagement,
 * monitoring wellbeing indicators, and providing actionable insights
 * to prevent burnout and improve workplace satisfaction.
 *
 * Key capabilities:
 * - Engagement surveys and pulse checks
 * - Wellbeing index calculation
 * - Burnout risk detection
 * - Work-life balance monitoring
 * - Sentiment analysis
 * - Recognition and appreciation tracking
 * - Team health diagnostics
 * - Actionable improvement recommendations
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

// ============================================================================
// Type Definitions
// ============================================================================

export type EngagementDimension =
  | 'purpose'
  | 'growth'
  | 'autonomy'
  | 'impact'
  | 'connection'
  | 'recognition'
  | 'wellbeing'
  | 'leadership'
  | 'culture'
  | 'resources';

export type WellbeingIndicator =
  | 'workload'
  | 'stress'
  | 'work_life_balance'
  | 'physical_health'
  | 'mental_health'
  | 'social_connection'
  | 'purpose'
  | 'autonomy';

export type SurveyType = 'annual' | 'quarterly' | 'pulse' | 'onboarding' | 'exit' | 'custom';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface EngagementSurvey {
  id: string;
  tenantId: string;
  name: string;
  type: SurveyType;
  questions: SurveyQuestion[];
  targetAudience: SurveyAudience;
  startDate: Date;
  endDate: Date;
  anonymityLevel: 'anonymous' | 'confidential' | 'identified';
  status: 'draft' | 'active' | 'closed' | 'analyzed';
  responseRate: number;
  totalResponses: number;
}

export interface SurveyQuestion {
  id: string;
  text: string;
  dimension: EngagementDimension;
  type: 'rating' | 'multiple_choice' | 'text' | 'nps';
  required: boolean;
  options?: string[];
  benchmarkAverage?: number;
}

export interface SurveyAudience {
  type: 'all' | 'department' | 'team' | 'custom';
  departmentIds?: string[];
  teamIds?: string[];
  userIds?: string[];
  excludedUserIds?: string[];
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentId?: string; // null if anonymous
  responses: QuestionResponse[];
  submittedAt: Date;
  completionTime: number; // seconds
  sentiment: number; // -1 to 1
}

export interface QuestionResponse {
  questionId: string;
  value: number | string | string[];
  sentiment?: number;
}

export interface EngagementScore {
  userId?: string; // null for aggregate
  tenantId: string;
  departmentId?: string;
  teamId?: string;
  overallScore: number; // 0-100
  dimensionScores: Record<EngagementDimension, DimensionScore>;
  enps: number; // Employee Net Promoter Score
  trend: ScoreTrend;
  percentile?: number;
  generatedAt: Date;
}

export interface DimensionScore {
  score: number;
  trend: 'improving' | 'stable' | 'declining';
  benchmarkComparison: number; // vs industry
  topStrengths: string[];
  topConcerns: string[];
}

export interface ScoreTrend {
  direction: 'up' | 'stable' | 'down';
  changePercent: number;
  period: string;
}

export interface WellbeingIndex {
  userId: string;
  overallIndex: number; // 0-100
  indicators: Record<WellbeingIndicator, IndicatorScore>;
  burnoutRisk: BurnoutRisk;
  recommendations: WellbeingRecommendation[];
  alerts: WellbeingAlert[];
  lastUpdated: Date;
}

export interface IndicatorScore {
  score: number;
  trend: 'improving' | 'stable' | 'declining';
  signals: string[];
  riskLevel: RiskLevel;
}

export interface BurnoutRisk {
  level: RiskLevel;
  score: number; // 0-100
  factors: BurnoutFactor[];
  predictedOnset?: Date;
  interventionUrgency: 'low' | 'medium' | 'high' | 'immediate';
}

export interface BurnoutFactor {
  factor: string;
  weight: number;
  currentValue: number;
  thresholdValue: number;
  trend: 'improving' | 'stable' | 'worsening';
}

export interface WellbeingRecommendation {
  id: string;
  category: WellbeingIndicator;
  recommendation: string;
  rationale: string;
  priority: number;
  effort: 'low' | 'medium' | 'high';
  expectedImpact: string;
  resources: string[];
}

export interface WellbeingAlert {
  id: string;
  type: 'burnout_risk' | 'workload' | 'disconnection' | 'declining_engagement';
  severity: RiskLevel;
  message: string;
  detectedAt: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export interface RecognitionEvent {
  id: string;
  tenantId: string;
  giverId: string;
  receiverId: string;
  type: 'praise' | 'award' | 'badge' | 'bonus' | 'thank_you';
  category: string;
  message: string;
  visibility: 'private' | 'team' | 'department' | 'company';
  value?: number; // Points or monetary value
  reactions: { userId: string; type: string }[];
  createdAt: Date;
}

export interface RecognitionMetrics {
  userId: string;
  period: string;
  recognitionsGiven: number;
  recognitionsReceived: number;
  topCategories: { category: string; count: number }[];
  recognitionScore: number; // Composite score
  peerInfluence: number; // How much their recognition matters
  topRecognizers: { userId: string; count: number }[];
  trend: ScoreTrend;
}

export interface TeamHealthDiagnostic {
  teamId: string;
  overallHealth: number;
  dimensions: TeamHealthDimension[];
  dysfunctions: TeamDysfunction[];
  strengths: string[];
  improvements: TeamImprovement[];
  benchmarkComparison: number;
  generatedAt: Date;
}

export interface TeamHealthDimension {
  dimension: string;
  score: number;
  indicators: string[];
  suggestions: string[];
}

export interface TeamDysfunction {
  type: string;
  severity: RiskLevel;
  symptoms: string[];
  rootCause: string;
  intervention: string;
}

export interface TeamImprovement {
  area: string;
  currentState: string;
  targetState: string;
  actions: string[];
  timeline: string;
  owner: string;
}

export interface PulseCheck {
  id: string;
  tenantId: string;
  question: string;
  dimension: EngagementDimension;
  frequency: 'daily' | 'weekly' | 'biweekly';
  responses: PulseResponse[];
  aggregateScore: number;
  trend: number[];
  activeFrom: Date;
  activeTo?: Date;
}

export interface PulseResponse {
  userId: string;
  score: number;
  comment?: string;
  timestamp: Date;
}

export interface SentimentAnalysis {
  entityId: string;
  entityType: 'user' | 'team' | 'department' | 'org';
  overallSentiment: number; // -1 to 1
  sentimentBySource: {
    source: string;
    sentiment: number;
    volume: number;
  }[];
  topics: {
    topic: string;
    sentiment: number;
    frequency: number;
    trend: 'improving' | 'stable' | 'declining';
  }[];
  keyPhrases: {
    phrase: string;
    sentiment: number;
    count: number;
  }[];
  period: string;
}

// ============================================================================
// Engagement & Wellbeing Service
// ============================================================================

export class EngagementWellbeingService {
  private prisma: PrismaClient;
  private redis: Redis;

  // Burnout risk factors and weights
  private readonly burnoutFactors: Record<string, { weight: number; threshold: number }> = {
    workload: { weight: 0.25, threshold: 70 },
    overtime_hours: { weight: 0.20, threshold: 10 },
    consecutive_work_days: { weight: 0.15, threshold: 14 },
    feedback_sentiment: { weight: 0.15, threshold: 0.3 },
    goal_overload: { weight: 0.10, threshold: 8 },
    recognition_gap: { weight: 0.10, threshold: 30 },
    vacation_days_unused: { weight: 0.05, threshold: 10 },
  };

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
  }

  /**
   * Create an engagement survey
   */
  async createSurvey(
    tenantId: string,
    name: string,
    type: SurveyType,
    questions: Omit<SurveyQuestion, 'id'>[],
    audience: SurveyAudience,
    startDate: Date,
    endDate: Date,
    anonymityLevel: 'anonymous' | 'confidential' | 'identified'
  ): Promise<EngagementSurvey> {
    const survey: EngagementSurvey = {
      id: `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      name,
      type,
      questions: questions.map((q, idx) => ({ ...q, id: `q_${idx}` })),
      targetAudience: audience,
      startDate,
      endDate,
      anonymityLevel,
      status: 'draft',
      responseRate: 0,
      totalResponses: 0,
    };

    await this.redis.set(
      `survey:${survey.id}`,
      JSON.stringify(survey),
      'EX',
      365 * 24 * 60 * 60
    );

    return survey;
  }

  /**
   * Submit survey response
   */
  async submitSurveyResponse(
    surveyId: string,
    respondentId: string | null,
    responses: Omit<QuestionResponse, 'sentiment'>[],
    tenantId: string
  ): Promise<SurveyResponse> {
    const survey = await this.getSurvey(surveyId);
    if (!survey) throw new Error('Survey not found');

    // Analyze sentiment for text responses
    const processedResponses: QuestionResponse[] = responses.map(r => {
      const sentiment = typeof r.value === 'string' && r.value.length > 10
        ? this.analyzeSentiment(r.value)
        : undefined;
      return { ...r, sentiment };
    });

    // Calculate overall response sentiment
    const textResponses = processedResponses.filter(r => r.sentiment !== undefined);
    const overallSentiment = textResponses.length > 0
      ? textResponses.reduce((sum, r) => sum + (r.sentiment || 0), 0) / textResponses.length
      : 0;

    const response: SurveyResponse = {
      id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      surveyId,
      respondentId: survey.anonymityLevel === 'anonymous' ? undefined : respondentId || undefined,
      responses: processedResponses,
      submittedAt: new Date(),
      completionTime: 0, // Would be tracked from survey start
      sentiment: overallSentiment,
    };

    // Store response
    await this.redis.lpush(`survey:responses:${surveyId}`, JSON.stringify(response));

    // Update survey stats
    survey.totalResponses++;
    await this.redis.set(`survey:${surveyId}`, JSON.stringify(survey));

    return response;
  }

  /**
   * Calculate engagement score
   */
  async calculateEngagementScore(
    tenantId: string,
    scope: { userId?: string; departmentId?: string; teamId?: string }
  ): Promise<EngagementScore> {
    // Get relevant survey responses
    const surveys = await this.getCompletedSurveys(tenantId);
    const responses = await this.getFilteredResponses(surveys, scope);

    if (responses.length === 0) {
      return this.getDefaultEngagementScore(tenantId, scope);
    }

    // Calculate dimension scores
    const dimensionScores: Record<EngagementDimension, DimensionScore> = {} as any;
    const dimensions: EngagementDimension[] = [
      'purpose', 'growth', 'autonomy', 'impact', 'connection',
      'recognition', 'wellbeing', 'leadership', 'culture', 'resources'
    ];

    for (const dimension of dimensions) {
      dimensionScores[dimension] = this.calculateDimensionScore(responses, dimension);
    }

    // Calculate overall score (weighted average)
    const weights: Record<EngagementDimension, number> = {
      purpose: 0.12, growth: 0.12, autonomy: 0.10, impact: 0.10, connection: 0.10,
      recognition: 0.10, wellbeing: 0.12, leadership: 0.10, culture: 0.08, resources: 0.06,
    };

    const overallScore = dimensions.reduce(
      (sum, d) => sum + dimensionScores[d].score * weights[d],
      0
    );

    // Calculate eNPS
    const enps = this.calculateENPS(responses);

    // Get trend
    const previousScore = await this.getPreviousEngagementScore(tenantId, scope);
    const trend: ScoreTrend = {
      direction: overallScore > previousScore + 2 ? 'up' : overallScore < previousScore - 2 ? 'down' : 'stable',
      changePercent: previousScore > 0 ? ((overallScore - previousScore) / previousScore) * 100 : 0,
      period: 'quarter',
    };

    return {
      userId: scope.userId,
      tenantId,
      departmentId: scope.departmentId,
      teamId: scope.teamId,
      overallScore: Math.round(overallScore),
      dimensionScores,
      enps,
      trend,
      generatedAt: new Date(),
    };
  }

  /**
   * Calculate wellbeing index for individual
   */
  async calculateWellbeingIndex(userId: string, tenantId: string): Promise<WellbeingIndex> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        feedbackReceived: {
          where: {
            createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
        },
        goalsOwned: {
          where: { status: { in: ['active', 'in_progress'] } },
        },
        reviewsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 2,
        },
      },
    });

    if (!user) throw new Error('User not found');

    // Calculate indicator scores
    const indicators: Record<WellbeingIndicator, IndicatorScore> = {} as any;

    // Workload indicator
    const goalCount = user.goalsOwned.length;
    indicators.workload = {
      score: Math.max(0, 100 - (goalCount > 5 ? (goalCount - 5) * 10 : 0)),
      trend: 'stable',
      signals: goalCount > 8 ? ['High number of active goals'] : [],
      riskLevel: goalCount > 10 ? 'high' : goalCount > 7 ? 'moderate' : 'low',
    };

    // Stress indicator (from feedback sentiment)
    const feedbackSentiment = this.calculateAverageSentiment(user.feedbackReceived);
    indicators.stress = {
      score: Math.round((feedbackSentiment + 1) * 50), // Convert -1 to 1 range to 0-100
      trend: 'stable',
      signals: feedbackSentiment < 0 ? ['Negative feedback sentiment detected'] : [],
      riskLevel: feedbackSentiment < -0.3 ? 'high' : feedbackSentiment < 0 ? 'moderate' : 'low',
    };

    // Work-life balance (simplified - would integrate with time tracking)
    indicators.work_life_balance = {
      score: 70, // Default
      trend: 'stable',
      signals: [],
      riskLevel: 'low',
    };

    // Social connection (feedback network analysis)
    const uniqueFeedbackGivers = new Set(user.feedbackReceived.map(f => f.giverId)).size;
    indicators.social_connection = {
      score: Math.min(100, uniqueFeedbackGivers * 10 + 40),
      trend: 'stable',
      signals: uniqueFeedbackGivers < 3 ? ['Limited peer interaction detected'] : [],
      riskLevel: uniqueFeedbackGivers < 2 ? 'moderate' : 'low',
    };

    // Purpose indicator (from goal alignment and review content)
    indicators.purpose = {
      score: 75,
      trend: 'stable',
      signals: [],
      riskLevel: 'low',
    };

    // Autonomy indicator
    indicators.autonomy = {
      score: 70,
      trend: 'stable',
      signals: [],
      riskLevel: 'low',
    };

    // Physical and mental health defaults (would integrate with health programs)
    indicators.physical_health = {
      score: 75,
      trend: 'stable',
      signals: [],
      riskLevel: 'low',
    };

    indicators.mental_health = {
      score: 70,
      trend: 'stable',
      signals: [],
      riskLevel: 'low',
    };

    // Calculate overall index
    const indicatorWeights: Record<WellbeingIndicator, number> = {
      workload: 0.15, stress: 0.15, work_life_balance: 0.15, physical_health: 0.10,
      mental_health: 0.15, social_connection: 0.10, purpose: 0.10, autonomy: 0.10,
    };

    const overallIndex = (Object.entries(indicators) as [WellbeingIndicator, IndicatorScore][])
      .reduce((sum, [key, val]) => sum + val.score * (indicatorWeights[key] || 0.1), 0);

    // Calculate burnout risk
    const burnoutRisk = await this.calculateBurnoutRisk(user, indicators);

    // Generate recommendations
    const recommendations = this.generateWellbeingRecommendations(indicators, burnoutRisk);

    // Check for alerts
    const alerts = this.checkWellbeingAlerts(indicators, burnoutRisk);

    return {
      userId,
      overallIndex: Math.round(overallIndex),
      indicators,
      burnoutRisk,
      recommendations,
      alerts,
      lastUpdated: new Date(),
    };
  }

  /**
   * Record recognition event
   */
  async recordRecognition(
    tenantId: string,
    giverId: string,
    receiverId: string,
    type: RecognitionEvent['type'],
    category: string,
    message: string,
    visibility: RecognitionEvent['visibility'],
    value?: number
  ): Promise<RecognitionEvent> {
    const event: RecognitionEvent = {
      id: `recog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      giverId,
      receiverId,
      type,
      category,
      message,
      visibility,
      value,
      reactions: [],
      createdAt: new Date(),
    };

    await this.redis.lpush(`recognition:${tenantId}`, JSON.stringify(event));
    await this.redis.lpush(`recognition:user:${receiverId}`, JSON.stringify(event));
    await this.redis.lpush(`recognition:given:${giverId}`, JSON.stringify(event));

    return event;
  }

  /**
   * Get recognition metrics for user
   */
  async getRecognitionMetrics(userId: string, period: string, tenantId: string): Promise<RecognitionMetrics> {
    const received = await this.getRecognitionsReceived(userId, period);
    const given = await this.getRecognitionsGiven(userId, period);

    // Calculate top categories
    const categoryCounts = new Map<string, number>();
    for (const r of received) {
      categoryCounts.set(r.category, (categoryCounts.get(r.category) || 0) + 1);
    }
    const topCategories = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    // Calculate top recognizers
    const recognizerCounts = new Map<string, number>();
    for (const r of received) {
      recognizerCounts.set(r.giverId, (recognizerCounts.get(r.giverId) || 0) + 1);
    }
    const topRecognizers = Array.from(recognizerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => ({ userId, count }));

    // Calculate recognition score
    const recognitionScore = this.calculateRecognitionScore(received.length, given.length);

    // Calculate peer influence (simplified)
    const peerInfluence = given.length > 0
      ? Math.min(1, given.length / 10) * 100
      : 0;

    return {
      userId,
      period,
      recognitionsGiven: given.length,
      recognitionsReceived: received.length,
      topCategories,
      recognitionScore,
      peerInfluence,
      topRecognizers,
      trend: {
        direction: 'stable',
        changePercent: 0,
        period,
      },
    };
  }

  /**
   * Generate team health diagnostic
   */
  async generateTeamHealthDiagnostic(teamId: string, tenantId: string): Promise<TeamHealthDiagnostic> {
    const teamMembers = await this.prisma.user.findMany({
      where: {
        OR: [
          { teamId },
          { departmentId: teamId },
        ],
        tenantId,
        status: 'active',
      },
      include: {
        feedbackReceived: {
          where: {
            createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
        },
        feedbackGiven: {
          where: {
            createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
        },
      },
    });

    // Calculate dimension scores
    const dimensions: TeamHealthDimension[] = [];

    // Trust dimension
    const feedbackFrequency = teamMembers.reduce((sum, m) =>
      sum + m.feedbackGiven.length + m.feedbackReceived.length, 0) / teamMembers.length;
    dimensions.push({
      dimension: 'Trust',
      score: Math.min(100, feedbackFrequency * 10 + 50),
      indicators: feedbackFrequency > 5 ? ['Active feedback culture'] : ['Low feedback frequency'],
      suggestions: feedbackFrequency < 5 ? ['Encourage regular feedback exchanges'] : [],
    });

    // Collaboration dimension
    const crossMemberFeedback = this.calculateCrossMemberInteraction(teamMembers);
    dimensions.push({
      dimension: 'Collaboration',
      score: Math.round(crossMemberFeedback * 100),
      indicators: crossMemberFeedback > 0.5 ? ['Strong team interaction'] : ['Siloed work patterns'],
      suggestions: crossMemberFeedback < 0.5 ? ['Implement pair work or cross-training'] : [],
    });

    // Communication dimension
    dimensions.push({
      dimension: 'Communication',
      score: 70, // Would be calculated from meeting/message data
      indicators: [],
      suggestions: [],
    });

    // Accountability dimension
    dimensions.push({
      dimension: 'Accountability',
      score: 75,
      indicators: [],
      suggestions: [],
    });

    // Results orientation
    dimensions.push({
      dimension: 'Results Focus',
      score: 72,
      indicators: [],
      suggestions: [],
    });

    // Identify dysfunctions
    const dysfunctions: TeamDysfunction[] = [];

    if (feedbackFrequency < 2) {
      dysfunctions.push({
        type: 'Absence of Trust',
        severity: 'moderate',
        symptoms: ['Low feedback exchange', 'Limited vulnerability'],
        rootCause: 'Team members may not feel safe being vulnerable',
        intervention: 'Personal history exercises and team building',
      });
    }

    if (crossMemberFeedback < 0.3) {
      dysfunctions.push({
        type: 'Silos',
        severity: 'moderate',
        symptoms: ['Limited cross-member interaction', 'Knowledge hoarding'],
        rootCause: 'Lack of shared goals or collaboration incentives',
        intervention: 'Create cross-functional projects',
      });
    }

    // Identify strengths
    const strengths: string[] = [];
    for (const dim of dimensions.filter(d => d.score >= 80)) {
      strengths.push(`Strong ${dim.dimension.toLowerCase()}`);
    }

    // Generate improvements
    const improvements: TeamImprovement[] = dimensions
      .filter(d => d.score < 70)
      .map(d => ({
        area: d.dimension,
        currentState: `Score: ${d.score}`,
        targetState: `Score: 80+`,
        actions: d.suggestions,
        timeline: '90 days',
        owner: 'Team Lead',
      }));

    // Calculate overall health
    const overallHealth = Math.round(
      dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
    );

    return {
      teamId,
      overallHealth,
      dimensions,
      dysfunctions,
      strengths,
      improvements,
      benchmarkComparison: 5, // 5 points above benchmark
      generatedAt: new Date(),
    };
  }

  /**
   * Create pulse check
   */
  async createPulseCheck(
    tenantId: string,
    question: string,
    dimension: EngagementDimension,
    frequency: PulseCheck['frequency']
  ): Promise<PulseCheck> {
    const pulse: PulseCheck = {
      id: `pulse_${Date.now()}`,
      tenantId,
      question,
      dimension,
      frequency,
      responses: [],
      aggregateScore: 0,
      trend: [],
      activeFrom: new Date(),
    };

    await this.redis.set(
      `pulse:${pulse.id}`,
      JSON.stringify(pulse),
      'EX',
      365 * 24 * 60 * 60
    );

    return pulse;
  }

  /**
   * Submit pulse check response
   */
  async submitPulseResponse(
    pulseId: string,
    userId: string,
    score: number,
    comment?: string
  ): Promise<void> {
    const pulseKey = `pulse:${pulseId}`;
    const cached = await this.redis.get(pulseKey);

    if (!cached) throw new Error('Pulse check not found');

    const pulse: PulseCheck = JSON.parse(cached);

    pulse.responses.push({
      userId,
      score,
      comment,
      timestamp: new Date(),
    });

    // Update aggregate score
    pulse.aggregateScore = pulse.responses.reduce((sum, r) => sum + r.score, 0) / pulse.responses.length;

    // Update trend
    pulse.trend.push(pulse.aggregateScore);
    if (pulse.trend.length > 30) pulse.trend.shift();

    await this.redis.set(pulseKey, JSON.stringify(pulse));
  }

  /**
   * Analyze sentiment across organization
   */
  async analyzeSentiment(
    tenantId: string,
    entityType: 'user' | 'team' | 'department' | 'org',
    entityId: string,
    period: string
  ): Promise<SentimentAnalysis> {
    // Get all text data for analysis
    const feedbacks = await this.getFeedbackText(tenantId, entityType, entityId, period);
    const surveyComments = await this.getSurveyComments(tenantId, entityType, entityId, period);

    const allText = [...feedbacks, ...surveyComments];

    // Analyze overall sentiment
    const sentiments = allText.map(t => ({
      text: t.text,
      source: t.source,
      sentiment: this.analyzeSentiment(t.text),
    }));

    const overallSentiment = sentiments.length > 0
      ? sentiments.reduce((sum, s) => sum + s.sentiment, 0) / sentiments.length
      : 0;

    // Group by source
    const bySource = new Map<string, { total: number; count: number }>();
    for (const s of sentiments) {
      const existing = bySource.get(s.source) || { total: 0, count: 0 };
      existing.total += s.sentiment;
      existing.count++;
      bySource.set(s.source, existing);
    }

    const sentimentBySource = Array.from(bySource.entries()).map(([source, data]) => ({
      source,
      sentiment: data.total / data.count,
      volume: data.count,
    }));

    // Extract topics (simplified)
    const topics = this.extractTopics(allText.map(t => t.text));

    // Extract key phrases (simplified)
    const keyPhrases = this.extractKeyPhrases(allText.map(t => t.text), sentiments);

    return {
      entityId,
      entityType,
      overallSentiment,
      sentimentBySource,
      topics,
      keyPhrases,
      period,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async getSurvey(surveyId: string): Promise<EngagementSurvey | null> {
    const cached = await this.redis.get(`survey:${surveyId}`);
    return cached ? JSON.parse(cached) : null;
  }

  private async getCompletedSurveys(tenantId: string): Promise<EngagementSurvey[]> {
    // Would fetch from database
    return [];
  }

  private async getFilteredResponses(
    surveys: EngagementSurvey[],
    scope: { userId?: string; departmentId?: string; teamId?: string }
  ): Promise<SurveyResponse[]> {
    // Would filter based on scope
    return [];
  }

  private getDefaultEngagementScore(
    tenantId: string,
    scope: { userId?: string; departmentId?: string; teamId?: string }
  ): EngagementScore {
    const defaultDimensionScore: DimensionScore = {
      score: 70,
      trend: 'stable',
      benchmarkComparison: 0,
      topStrengths: [],
      topConcerns: [],
    };

    return {
      userId: scope.userId,
      tenantId,
      departmentId: scope.departmentId,
      teamId: scope.teamId,
      overallScore: 70,
      dimensionScores: {
        purpose: defaultDimensionScore,
        growth: defaultDimensionScore,
        autonomy: defaultDimensionScore,
        impact: defaultDimensionScore,
        connection: defaultDimensionScore,
        recognition: defaultDimensionScore,
        wellbeing: defaultDimensionScore,
        leadership: defaultDimensionScore,
        culture: defaultDimensionScore,
        resources: defaultDimensionScore,
      },
      enps: 30,
      trend: { direction: 'stable', changePercent: 0, period: 'quarter' },
      generatedAt: new Date(),
    };
  }

  private calculateDimensionScore(responses: SurveyResponse[], dimension: EngagementDimension): DimensionScore {
    // Would calculate from actual responses
    return {
      score: 70 + Math.random() * 20,
      trend: 'stable',
      benchmarkComparison: 5,
      topStrengths: [],
      topConcerns: [],
    };
  }

  private calculateENPS(responses: SurveyResponse[]): number {
    // Would calculate from NPS question
    // eNPS = % Promoters (9-10) - % Detractors (0-6)
    return 30; // Default
  }

  private async getPreviousEngagementScore(
    tenantId: string,
    scope: { userId?: string; departmentId?: string; teamId?: string }
  ): Promise<number> {
    return 68; // Default previous score
  }

  private async calculateBurnoutRisk(user: any, indicators: Record<WellbeingIndicator, IndicatorScore>): Promise<BurnoutRisk> {
    const factors: BurnoutFactor[] = [];
    let totalScore = 0;

    // Workload factor
    const workloadValue = 100 - indicators.workload.score;
    factors.push({
      factor: 'Workload',
      weight: this.burnoutFactors.workload.weight,
      currentValue: workloadValue,
      thresholdValue: this.burnoutFactors.workload.threshold,
      trend: indicators.workload.trend === 'improving' ? 'improving' : indicators.workload.trend === 'declining' ? 'worsening' : 'stable',
    });
    totalScore += workloadValue * this.burnoutFactors.workload.weight;

    // Stress factor
    const stressValue = 100 - indicators.stress.score;
    factors.push({
      factor: 'Stress Level',
      weight: this.burnoutFactors.feedback_sentiment.weight,
      currentValue: stressValue,
      thresholdValue: this.burnoutFactors.feedback_sentiment.threshold * 100,
      trend: 'stable',
    });
    totalScore += stressValue * this.burnoutFactors.feedback_sentiment.weight;

    // Goal overload
    const goalCount = user.goalsOwned?.length || 0;
    const goalFactor = Math.min(100, goalCount * 10);
    factors.push({
      factor: 'Goal Overload',
      weight: this.burnoutFactors.goal_overload.weight,
      currentValue: goalFactor,
      thresholdValue: this.burnoutFactors.goal_overload.threshold * 10,
      trend: 'stable',
    });
    totalScore += goalFactor * this.burnoutFactors.goal_overload.weight;

    // Determine risk level
    const level: RiskLevel = totalScore > 70 ? 'critical' :
      totalScore > 50 ? 'high' :
      totalScore > 30 ? 'moderate' : 'low';

    const urgency = level === 'critical' ? 'immediate' :
      level === 'high' ? 'high' :
      level === 'moderate' ? 'medium' : 'low';

    return {
      level,
      score: Math.round(totalScore),
      factors,
      interventionUrgency: urgency,
    };
  }

  private generateWellbeingRecommendations(
    indicators: Record<WellbeingIndicator, IndicatorScore>,
    burnoutRisk: BurnoutRisk
  ): WellbeingRecommendation[] {
    const recommendations: WellbeingRecommendation[] = [];
    let priority = 1;

    // Address high-risk indicators
    for (const [indicator, score] of Object.entries(indicators) as [WellbeingIndicator, IndicatorScore][]) {
      if (score.riskLevel === 'high' || score.riskLevel === 'critical') {
        recommendations.push({
          id: `rec_${priority}`,
          category: indicator,
          recommendation: this.getRecommendationForIndicator(indicator),
          rationale: `${indicator.replace(/_/g, ' ')} score is ${score.score}, indicating concern`,
          priority,
          effort: 'medium',
          expectedImpact: 'Significant improvement in wellbeing',
          resources: this.getResourcesForIndicator(indicator),
        });
        priority++;
      }
    }

    // Add burnout prevention if at risk
    if (burnoutRisk.level !== 'low') {
      recommendations.push({
        id: `rec_${priority}`,
        category: 'workload',
        recommendation: 'Schedule a workload review with manager',
        rationale: `Burnout risk level: ${burnoutRisk.level}`,
        priority: 1,
        effort: 'low',
        expectedImpact: 'Prevent burnout and maintain productivity',
        resources: ['EAP services', 'Manager 1:1'],
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private getRecommendationForIndicator(indicator: WellbeingIndicator): string {
    const recommendations: Record<WellbeingIndicator, string> = {
      workload: 'Review and prioritize current tasks with manager',
      stress: 'Consider stress management techniques or EAP resources',
      work_life_balance: 'Set clear boundaries between work and personal time',
      physical_health: 'Utilize wellness program benefits',
      mental_health: 'Explore mental health resources available through benefits',
      social_connection: 'Engage in team activities and peer networking',
      purpose: 'Discuss role alignment with career goals',
      autonomy: 'Request more ownership of projects aligned with strengths',
    };
    return recommendations[indicator] || 'Discuss concerns with manager or HR';
  }

  private getResourcesForIndicator(indicator: WellbeingIndicator): string[] {
    const resources: Record<WellbeingIndicator, string[]> = {
      workload: ['Task management training', 'Priority matrix template'],
      stress: ['EAP counseling', 'Meditation app subscription'],
      work_life_balance: ['Flexible work policy', 'Time management workshop'],
      physical_health: ['Gym membership', 'Ergonomic assessment'],
      mental_health: ['EAP services', 'Mental health days'],
      social_connection: ['ERG groups', 'Team events calendar'],
      purpose: ['Career coaching', 'Role clarity session'],
      autonomy: ['Delegation training', 'Project ownership framework'],
    };
    return resources[indicator] || [];
  }

  private checkWellbeingAlerts(
    indicators: Record<WellbeingIndicator, IndicatorScore>,
    burnoutRisk: BurnoutRisk
  ): WellbeingAlert[] {
    const alerts: WellbeingAlert[] = [];

    if (burnoutRisk.level === 'critical' || burnoutRisk.level === 'high') {
      alerts.push({
        id: `alert_burnout_${Date.now()}`,
        type: 'burnout_risk',
        severity: burnoutRisk.level,
        message: `Burnout risk detected: ${burnoutRisk.level} level`,
        detectedAt: new Date(),
        acknowledged: false,
      });
    }

    for (const [indicator, score] of Object.entries(indicators) as [WellbeingIndicator, IndicatorScore][]) {
      if (score.riskLevel === 'critical') {
        alerts.push({
          id: `alert_${indicator}_${Date.now()}`,
          type: indicator === 'workload' ? 'workload' : 'declining_engagement',
          severity: 'critical',
          message: `Critical concern in ${indicator.replace(/_/g, ' ')}`,
          detectedAt: new Date(),
          acknowledged: false,
        });
      }
    }

    return alerts;
  }

  private calculateAverageSentiment(feedbacks: any[]): number {
    if (feedbacks.length === 0) return 0;

    const sentiments = feedbacks.map(f => this.analyzeSentiment(f.content || ''));
    return sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
  }

  private analyzeSentiment(text: string): number {
    // Simplified sentiment analysis
    const positiveWords = ['great', 'excellent', 'good', 'amazing', 'helpful', 'appreciate', 'thank', 'wonderful'];
    const negativeWords = ['bad', 'poor', 'difficult', 'issue', 'problem', 'concern', 'frustrated', 'disappointed'];

    const words = text.toLowerCase().split(/\s+/);
    let score = 0;

    for (const word of words) {
      if (positiveWords.some(p => word.includes(p))) score += 0.1;
      if (negativeWords.some(n => word.includes(n))) score -= 0.1;
    }

    return Math.max(-1, Math.min(1, score));
  }

  private async getRecognitionsReceived(userId: string, period: string): Promise<RecognitionEvent[]> {
    const cached = await this.redis.lrange(`recognition:user:${userId}`, 0, -1);
    return cached.map(c => JSON.parse(c));
  }

  private async getRecognitionsGiven(userId: string, period: string): Promise<RecognitionEvent[]> {
    const cached = await this.redis.lrange(`recognition:given:${userId}`, 0, -1);
    return cached.map(c => JSON.parse(c));
  }

  private calculateRecognitionScore(received: number, given: number): number {
    // Balanced score that values both receiving and giving
    return Math.min(100, (received * 5) + (given * 3) + 30);
  }

  private calculateCrossMemberInteraction(members: any[]): number {
    if (members.length < 2) return 0;

    const memberIds = new Set(members.map(m => m.id));
    let crossInteractions = 0;
    let totalInteractions = 0;

    for (const member of members) {
      for (const feedback of member.feedbackGiven || []) {
        totalInteractions++;
        if (memberIds.has(feedback.receiverId)) {
          crossInteractions++;
        }
      }
    }

    return totalInteractions > 0 ? crossInteractions / totalInteractions : 0;
  }

  private async getFeedbackText(
    tenantId: string,
    entityType: string,
    entityId: string,
    period: string
  ): Promise<{ text: string; source: string }[]> {
    // Would fetch from database
    return [];
  }

  private async getSurveyComments(
    tenantId: string,
    entityType: string,
    entityId: string,
    period: string
  ): Promise<{ text: string; source: string }[]> {
    return [];
  }

  private extractTopics(texts: string[]): { topic: string; sentiment: number; frequency: number; trend: 'improving' | 'stable' | 'declining' }[] {
    // Simplified topic extraction
    const topicKeywords: Record<string, string[]> = {
      'Work-Life Balance': ['balance', 'hours', 'overtime', 'flexible'],
      'Management': ['manager', 'leadership', 'direction', 'support'],
      'Growth': ['growth', 'learning', 'development', 'career'],
      'Culture': ['culture', 'team', 'environment', 'values'],
    };

    const results: { topic: string; count: number; sentiment: number }[] = [];

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      let count = 0;
      let sentimentSum = 0;

      for (const text of texts) {
        const lower = text.toLowerCase();
        if (keywords.some(k => lower.includes(k))) {
          count++;
          sentimentSum += this.analyzeSentiment(text);
        }
      }

      if (count > 0) {
        results.push({
          topic,
          count,
          sentiment: sentimentSum / count,
        });
      }
    }

    return results.map(r => ({
      topic: r.topic,
      sentiment: r.sentiment,
      frequency: r.count,
      trend: 'stable' as const,
    }));
  }

  private extractKeyPhrases(
    texts: string[],
    sentiments: { text: string; sentiment: number }[]
  ): { phrase: string; sentiment: number; count: number }[] {
    // Simplified key phrase extraction
    const phraseCounts = new Map<string, { count: number; sentiment: number }>();

    for (const item of sentiments) {
      const words = item.text.toLowerCase().split(/\s+/);
      for (let i = 0; i < words.length - 1; i++) {
        const phrase = `${words[i]} ${words[i + 1]}`;
        if (phrase.length > 5) {
          const existing = phraseCounts.get(phrase) || { count: 0, sentiment: 0 };
          existing.count++;
          existing.sentiment += item.sentiment;
          phraseCounts.set(phrase, existing);
        }
      }
    }

    return Array.from(phraseCounts.entries())
      .filter(([_, data]) => data.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([phrase, data]) => ({
        phrase,
        sentiment: data.sentiment / data.count,
        count: data.count,
      }));
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const engagementWellbeingService = new EngagementWellbeingService(
  new PrismaClient(),
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
);
