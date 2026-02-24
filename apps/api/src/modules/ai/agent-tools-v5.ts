/**
 * Agent Tools V5 — Domain-specific WRITE operations (batch 2).
 *
 * Covers: Bio-performance cluster, core chatbots, culture-empathy agents,
 * and select hyper-learning agents.
 *
 * Tools 11-20: createWellnessCheckIn, logPerformanceAnomaly, logActivityEvent,
 * logSentimentAnalysis, createCompensationRecommendation,
 * createPromotionRecommendation, createInnovationContribution,
 * createCultureDiagnostic, createPerformanceAlert, createFeedbackNomination.
 */

import { prisma } from '@pms/database';

import { logger, auditLogger } from '../../utils/logger';
import type { ToolResult } from './agent-tools';

// ── 11. Wellness Check-In (Pulse Survey Response) ───────────

/**
 * Create a wellness check-in (pulse survey) capturing mood, energy, and stress.
 * Used by: SleepOptimizerAgent, CircadianSyncAgent, HydrationNutritionAgent,
 *          MicroBreakAgent, MoodRadiatorAgent
 */
export async function createWellnessCheckIn(
  tenantId: string,
  userId: string,
  params: {
    targetUserId: string;
    moodScore: number;
    energyScore?: number;
    stressScore?: number;
    comment?: string;
    isAnonymous?: boolean;
    surveyType?: string;
    surveyDate?: string;
  },
): Promise<ToolResult> {
  try {
    const targetUser = await prisma.user.findFirst({
      where: { id: params.targetUserId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!targetUser) return { success: false, data: null, error: `User ${params.targetUserId} not found in tenant` };

    const response = await prisma.pulseSurveyResponse.create({
      data: {
        tenantId,
        userId: params.targetUserId,
        moodScore: Math.max(1, Math.min(10, params.moodScore)),
        energyScore: params.energyScore != null ? Math.max(1, Math.min(10, params.energyScore)) : null,
        stressScore: params.stressScore != null ? Math.max(1, Math.min(10, params.stressScore)) : null,
        comment: params.comment || null,
        isAnonymous: params.isAnonymous ?? false,
        surveyType: params.surveyType || 'DAILY',
        surveyDate: params.surveyDate ? new Date(params.surveyDate) : new Date(),
      },
      select: { id: true, moodScore: true, energyScore: true, stressScore: true, surveyDate: true, surveyType: true },
    });

    auditLogger(
      'AI_WELLNESS_CHECK_IN_CREATED',
      userId,
      tenantId,
      'pulse_survey_response',
      response.id,
      { targetUserId: params.targetUserId, moodScore: params.moodScore, surveyType: params.surveyType || 'DAILY' },
    );

    return { success: true, data: response };
  } catch (err) {
    logger.error('Failed to create wellness check-in', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 12. Performance Anomaly ─────────────────────────────────

/**
 * Log a performance anomaly (deviation from expected metrics).
 * Used by: CortisolMonitorAgent, NeuroFocusAgent, ErgonomicsAgent, EnvironmentCtrlAgent
 */
export async function logPerformanceAnomaly(
  tenantId: string,
  userId: string,
  params: {
    targetUserId: string;
    anomalyType: string;
    severity: string;
    metricName: string;
    expectedValue?: number;
    actualValue?: number;
    deviationPercentage?: number;
    zScore?: number;
    baselinePeriodDays?: number;
    metadata?: Record<string, unknown>;
  },
): Promise<ToolResult> {
  try {
    const targetUser = await prisma.user.findFirst({
      where: { id: params.targetUserId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!targetUser) return { success: false, data: null, error: `User ${params.targetUserId} not found in tenant` };

    const anomaly = await prisma.performanceAnomaly.create({
      data: {
        tenantId,
        userId: params.targetUserId,
        anomalyType: params.anomalyType,
        severity: params.severity,
        metricName: params.metricName,
        expectedValue: params.expectedValue ?? null,
        actualValue: params.actualValue ?? null,
        deviationPercentage: params.deviationPercentage ?? null,
        zScore: params.zScore ?? null,
        baselinePeriodDays: params.baselinePeriodDays ?? null,
        status: 'detected',
        managerNotified: false,
        metadata: (params.metadata || {}) as any,
        detectedAt: new Date(),
      },
      select: { id: true, anomalyType: true, severity: true, metricName: true, status: true, detectedAt: true },
    });

    auditLogger(
      'AI_PERFORMANCE_ANOMALY_LOGGED',
      userId,
      tenantId,
      'performance_anomaly',
      anomaly.id,
      { targetUserId: params.targetUserId, anomalyType: params.anomalyType, severity: params.severity, metricName: params.metricName },
    );

    return { success: true, data: anomaly };
  } catch (err) {
    logger.error('Failed to log performance anomaly', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 13. Activity Event ──────────────────────────────────────

/**
 * Log an activity event (work activity, break, focus session, etc.).
 * Used by: SleepOptimizerAgent, CircadianSyncAgent, MicroBreakAgent,
 *          NeuroFocusAgent, ErgonomicsAgent
 */
export async function logActivityEvent(
  tenantId: string,
  userId: string,
  params: {
    targetUserId: string;
    eventType: string;
    eventSubtype?: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<ToolResult> {
  try {
    const event = await prisma.activityEvent.create({
      data: {
        tenantId,
        userId: params.targetUserId,
        eventType: params.eventType,
        eventSubtype: params.eventSubtype || null,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        metadata: (params.metadata || {}) as any,
      },
      select: { id: true, eventType: true, eventSubtype: true, entityType: true },
    });

    auditLogger(
      'AI_ACTIVITY_EVENT_LOGGED',
      userId,
      tenantId,
      'activity_event',
      event.id,
      { targetUserId: params.targetUserId, eventType: params.eventType, eventSubtype: params.eventSubtype },
    );

    return { success: true, data: event };
  } catch (err) {
    logger.error('Failed to log activity event', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 14. Sentiment Analysis ──────────────────────────────────

/**
 * Log a sentiment analysis result for communication or text content.
 * Used by: VocalToneAgent, EmpathyCoachAgent, BiasNeutralizerAgent, LinguisticRefinerAgent
 */
export async function logSentimentAnalysis(
  tenantId: string,
  userId: string,
  params: {
    targetUserId: string;
    sourceType: string;
    sentimentScore: number;
    sentimentLabel: string;
    confidence: number;
    sourceId?: string;
    sourceReference?: string;
    contentSample?: string;
    emotions?: Record<string, unknown>;
  },
): Promise<ToolResult> {
  try {
    const analysis = await prisma.sentimentAnalysis.create({
      data: {
        tenant: { connect: { id: tenantId } },
        user: { connect: { id: params.targetUserId } },
        sourceType: params.sourceType,
        sentimentScore: params.sentimentScore,
        sentimentLabel: params.sentimentLabel,
        confidence: params.confidence,
        sourceId: params.sourceId || null,
        sourceReference: params.sourceReference || null,
        contentSample: params.contentSample || null,
        emotions: (params.emotions || {}) as any,
        modelVersion: '1.0',
        modelType: 'ai_agent',
        analyzedAt: new Date(),
      },
      select: { id: true, sentimentScore: true, sentimentLabel: true, confidence: true, sourceType: true },
    });

    auditLogger(
      'AI_SENTIMENT_ANALYSIS_LOGGED',
      userId,
      tenantId,
      'sentiment_analysis',
      analysis.id,
      { targetUserId: params.targetUserId, sourceType: params.sourceType, sentimentLabel: params.sentimentLabel },
    );

    return { success: true, data: analysis };
  } catch (err) {
    logger.error('Failed to log sentiment analysis', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 15. Compensation Recommendation ─────────────────────────

/**
 * Create a compensation recommendation (salary change, bonus, equity).
 * Used by: CompensationPromotionAgent, EquityRealizerAgent, MarketValueAgent, TaxOptimizerAgent
 */
export async function createCompensationRecommendation(
  tenantId: string,
  userId: string,
  params: {
    employeeId: string;
    type: string;
    previousAmount: number;
    newAmount: number;
    effectiveDate: string;
    reason: string;
    currency?: string;
    justification?: string;
    performanceRating?: number;
    marketData?: Record<string, unknown>;
    equityAnalysis?: Record<string, unknown>;
    reviewCycleId?: string;
  },
): Promise<ToolResult> {
  try {
    const employee = await prisma.user.findFirst({
      where: { id: params.employeeId, tenantId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!employee) return { success: false, data: null, error: `Employee ${params.employeeId} not found in tenant` };

    const changeAmount = params.newAmount - params.previousAmount;
    const changePercent = params.previousAmount > 0 ? (changeAmount / params.previousAmount) * 100 : 0;

    const decision = await prisma.compensationDecision.create({
      data: {
        tenantId,
        employeeId: params.employeeId,
        type: params.type as any,
        status: 'DRAFT' as any,
        previousAmount: params.previousAmount,
        newAmount: params.newAmount,
        changeAmount,
        changePercent,
        currency: params.currency || 'USD',
        effectiveDate: new Date(params.effectiveDate),
        reason: params.reason,
        justification: params.justification || null,
        performanceRating: params.performanceRating ?? null,
        marketData: (params.marketData || null) as any,
        equityAnalysis: (params.equityAnalysis || null) as any,
        reviewCycleId: params.reviewCycleId || null,
        proposedById: userId,
        proposedAt: new Date(),
        metadata: { generatedBy: 'AI' } as any,
      },
      select: { id: true, type: true, status: true, previousAmount: true, newAmount: true, changePercent: true, effectiveDate: true },
    });

    auditLogger(
      'AI_COMPENSATION_RECOMMENDATION_CREATED',
      userId,
      tenantId,
      'compensation_decision',
      decision.id,
      { employeeId: params.employeeId, type: params.type, changePercent },
    );

    return { success: true, data: decision };
  } catch (err) {
    logger.error('Failed to create compensation recommendation', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 16. Promotion Recommendation ────────────────────────────

/**
 * Create a promotion recommendation for an employee.
 * Used by: CompensationPromotionAgent, CareerSimAgent
 */
export async function createPromotionRecommendation(
  tenantId: string,
  userId: string,
  params: {
    employeeId: string;
    type?: string;
    previousLevel?: number;
    newLevel?: number;
    previousTitle?: string;
    newTitle?: string;
    effectiveDate?: string;
    readinessScore?: number;
    criteriaScores?: Record<string, unknown>;
    strengths?: string[];
    developmentAreas?: string[];
    justification?: string;
    reviewCycleId?: string;
  },
): Promise<ToolResult> {
  try {
    const employee = await prisma.user.findFirst({
      where: { id: params.employeeId, tenantId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!employee) return { success: false, data: null, error: `Employee ${params.employeeId} not found in tenant` };

    const promotion = await prisma.promotionDecision.create({
      data: {
        tenantId,
        employeeId: params.employeeId,
        type: (params.type as any) || 'LEVEL_PROMOTION',
        status: 'NOMINATED' as any,
        previousLevel: params.previousLevel ?? null,
        newLevel: params.newLevel ?? null,
        previousTitle: params.previousTitle || null,
        newTitle: params.newTitle || null,
        effectiveDate: params.effectiveDate ? new Date(params.effectiveDate) : null,
        readinessScore: params.readinessScore ?? null,
        criteriaScores: (params.criteriaScores || null) as any,
        strengths: params.strengths || [],
        developmentAreas: params.developmentAreas || [],
        justification: params.justification || null,
        reviewCycleId: params.reviewCycleId || null,
        nominatedById: userId,
        nominatedAt: new Date(),
        metadata: { generatedBy: 'AI' } as any,
      },
      select: { id: true, type: true, status: true, previousLevel: true, newLevel: true, readinessScore: true },
    });

    auditLogger(
      'AI_PROMOTION_RECOMMENDATION_CREATED',
      userId,
      tenantId,
      'promotion_decision',
      promotion.id,
      { employeeId: params.employeeId, type: params.type || 'LEVEL_PROMOTION', newLevel: params.newLevel },
    );

    return { success: true, data: promotion };
  } catch (err) {
    logger.error('Failed to create promotion recommendation', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 17. Innovation Contribution ─────────────────────────────

/**
 * Record an innovation contribution (idea, improvement, experiment).
 * Used by: CuriosityScoutAgent, SparringPartnerAgent
 */
export async function createInnovationContribution(
  tenantId: string,
  userId: string,
  params: {
    targetUserId: string;
    title: string;
    description: string;
    innovationType: string;
    category?: string;
    expectedImpact?: string;
    impactMetrics?: Record<string, unknown>;
  },
): Promise<ToolResult> {
  try {
    const contribution = await prisma.innovationContribution.create({
      data: {
        tenantId,
        userId: params.targetUserId,
        title: params.title,
        description: params.description,
        innovationType: params.innovationType,
        category: params.category || null,
        submittedAt: new Date(),
        status: 'SUBMITTED',
        expectedImpact: params.expectedImpact || null,
        impactMetrics: (params.impactMetrics || {}) as any,
      },
      select: { id: true, title: true, innovationType: true, status: true, submittedAt: true },
    });

    auditLogger(
      'AI_INNOVATION_CONTRIBUTION_CREATED',
      userId,
      tenantId,
      'innovation_contribution',
      contribution.id,
      { targetUserId: params.targetUserId, title: params.title, innovationType: params.innovationType },
    );

    return { success: true, data: contribution };
  } catch (err) {
    logger.error('Failed to create innovation contribution', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 18. Culture Diagnostic ──────────────────────────────────

/**
 * Create a culture diagnostic assessment with organizational health metrics.
 * Used by: CultureWeaverAgent, InclusionMonitorAgent
 */
export async function createCultureDiagnostic(
  tenantId: string,
  userId: string,
  params: {
    diagnosticType: string;
    diagnosticDate?: string;
    clanCulture: number;
    adhocracyCulture: number;
    marketCulture: number;
    hierarchyCulture: number;
    psychologicalSafety: number;
    trustLevel: number;
    autonomy: number;
    transparency: number;
    accountability: number;
    innovation: number;
    customerFocus: number;
    resultsOrientation: number;
    valuesAlignment: number;
    missionClarity: number;
    visionAlignment: number;
    desiredCulture?: Record<string, unknown>;
  },
): Promise<ToolResult> {
  try {
    const diagnostic = await prisma.cultureDiagnostic.create({
      data: {
        tenantId,
        diagnosticDate: params.diagnosticDate ? new Date(params.diagnosticDate) : new Date(),
        diagnosticType: params.diagnosticType,
        clanCulture: params.clanCulture,
        adhocracyCulture: params.adhocracyCulture,
        marketCulture: params.marketCulture,
        hierarchyCulture: params.hierarchyCulture,
        psychologicalSafety: params.psychologicalSafety,
        trustLevel: params.trustLevel,
        autonomy: params.autonomy,
        transparency: params.transparency,
        accountability: params.accountability,
        innovation: params.innovation,
        customerFocus: params.customerFocus,
        resultsOrientation: params.resultsOrientation,
        valuesAlignment: params.valuesAlignment,
        missionClarity: params.missionClarity,
        visionAlignment: params.visionAlignment,
        desiredCulture: (params.desiredCulture || {}) as any,
      },
      select: {
        id: true, diagnosticType: true, diagnosticDate: true,
        psychologicalSafety: true, trustLevel: true, innovation: true,
      },
    });

    auditLogger(
      'AI_CULTURE_DIAGNOSTIC_CREATED',
      userId,
      tenantId,
      'culture_diagnostic',
      diagnostic.id,
      { diagnosticType: params.diagnosticType, psychologicalSafety: params.psychologicalSafety },
    );

    return { success: true, data: diagnostic };
  } catch (err) {
    logger.error('Failed to create culture diagnostic', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 19. Performance Alert ───────────────────────────────────

/**
 * Create a performance alert (warning, anomaly, compliance issue, etc.).
 * Used by: SecurityAgent, ConflictResolutionAgent, GovernanceAgent,
 *          LicenseAgent, ConflictMediatorAgent, EnvironmentCtrlAgent
 */
export async function createPerformanceAlert(
  tenantId: string,
  userId: string,
  params: {
    alertType: string;
    alertCategory: string;
    severity: string;
    title: string;
    description?: string;
    targetUserId?: string;
    targetTeamId?: string;
    targetDepartmentId?: string;
    actionRequired?: string;
    actionUrl?: string;
    priority?: number;
    expiresAt?: string;
    notifyUser?: boolean;
    notifyManager?: boolean;
    notifyHr?: boolean;
    metadata?: Record<string, unknown>;
  },
): Promise<ToolResult> {
  try {
    const alert = await prisma.performanceAlert.create({
      data: {
        tenantId,
        alertType: params.alertType,
        alertCategory: params.alertCategory,
        severity: params.severity,
        title: params.title,
        description: params.description || null,
        targetUserId: params.targetUserId || null,
        targetTeamId: params.targetTeamId || null,
        targetDepartmentId: params.targetDepartmentId || null,
        actionRequired: params.actionRequired || null,
        actionUrl: params.actionUrl || null,
        priority: params.priority ?? 0,
        status: 'active',
        expiresAt: params.expiresAt ? new Date(params.expiresAt) : null,
        notifyUser: params.notifyUser ?? true,
        notifyManager: params.notifyManager ?? false,
        notifyHr: params.notifyHr ?? false,
        notificationChannels: ['in_app'],
        metadata: (params.metadata || {}) as any,
      },
      select: { id: true, alertType: true, alertCategory: true, severity: true, title: true, status: true },
    });

    auditLogger(
      'AI_PERFORMANCE_ALERT_CREATED',
      userId,
      tenantId,
      'performance_alert',
      alert.id,
      { alertType: params.alertType, severity: params.severity, title: params.title },
    );

    return { success: true, data: alert };
  } catch (err) {
    logger.error('Failed to create performance alert', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 20. Feedback Nomination ─────────────────────────────────

/**
 * Create a 360° feedback nomination (request peer/manager feedback for someone).
 * Used by: GratitudeSentinelAgent, ConflictMediatorAgent
 */
export async function createFeedbackNomination(
  tenantId: string,
  userId: string,
  params: {
    cycleId: string;
    subjectId: string;
    reviewerId: string;
    relationship: string;
    nominationReason?: string;
  },
): Promise<ToolResult> {
  try {
    // Validate cycle exists
    const cycle = await prisma.feedbackCycle.findFirst({
      where: { id: params.cycleId, tenantId },
      select: { id: true, status: true },
    });
    if (!cycle) return { success: false, data: null, error: `Feedback cycle ${params.cycleId} not found in tenant` };

    // Validate both users exist
    const [subject, reviewer] = await Promise.all([
      prisma.user.findFirst({ where: { id: params.subjectId, tenantId, deletedAt: null }, select: { id: true } }),
      prisma.user.findFirst({ where: { id: params.reviewerId, tenantId, deletedAt: null }, select: { id: true } }),
    ]);
    if (!subject) return { success: false, data: null, error: `Subject ${params.subjectId} not found in tenant` };
    if (!reviewer) return { success: false, data: null, error: `Reviewer ${params.reviewerId} not found in tenant` };

    const nomination = await prisma.feedbackNomination.create({
      data: {
        tenantId,
        cycleId: params.cycleId,
        subjectId: params.subjectId,
        reviewerId: params.reviewerId,
        relationship: params.relationship,
        nominatedBy: userId,
        nominationReason: params.nominationReason || null,
        status: 'PENDING',
      },
      select: { id: true, relationship: true, status: true },
    });

    auditLogger(
      'AI_FEEDBACK_NOMINATION_CREATED',
      userId,
      tenantId,
      'feedback_nomination',
      nomination.id,
      { cycleId: params.cycleId, subjectId: params.subjectId, reviewerId: params.reviewerId, relationship: params.relationship },
    );

    return { success: true, data: nomination };
  } catch (err) {
    logger.error('Failed to create feedback nomination', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}
