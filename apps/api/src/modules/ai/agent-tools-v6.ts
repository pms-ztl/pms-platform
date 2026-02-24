/**
 * Agent Tools V6 — Domain-specific WRITE operations (batch 3).
 *
 * Covers: Liquid-workforce cluster, governance agents, remaining hyper-learning
 * agents, and supplementary tools for culture-empathy agents.
 *
 * Tools 21-30: createCareerPath, assignTeamMember, createCalendarEvent,
 * createBoardAnnouncement, createDevelopmentCheckpoint, logSkillProgress,
 * createDeadlineAlert, createCompliancePolicy, createAgentTask,
 * createPerformanceBenchmark.
 */

import { prisma } from '@pms/database';

import { logger, auditLogger } from '../../utils/logger';
import type { ToolResult } from './agent-tools';

// ── 21. Career Path ─────────────────────────────────────────

/**
 * Create a career path definition with roles, levels, and skill requirements.
 * Used by: CareerSimAgent
 */
export async function createCareerPath(
  tenantId: string,
  userId: string,
  params: {
    pathName: string;
    pathDescription: string;
    startingRole: string;
    department?: string;
    roles?: Array<{ title: string; level: number; description: string }>;
    levels?: Array<{ level: number; title: string; requirements: string[] }>;
    branches?: Array<{ name: string; fromRole: string; toRole: string }>;
    skillRequirements?: Record<string, unknown>;
  },
): Promise<ToolResult> {
  try {
    const path = await prisma.careerPath.create({
      data: {
        tenantId,
        pathName: params.pathName,
        pathDescription: params.pathDescription,
        startingRole: params.startingRole,
        department: params.department || null,
        roles: (params.roles || []) as any,
        levels: (params.levels || []) as any,
        branches: (params.branches || []) as any,
        skillRequirements: (params.skillRequirements || {}) as any,
      },
      select: { id: true, pathName: true, startingRole: true, department: true },
    });

    auditLogger(
      'AI_CAREER_PATH_CREATED',
      userId,
      tenantId,
      'career_path',
      path.id,
      { pathName: params.pathName, startingRole: params.startingRole },
    );

    return { success: true, data: path };
  } catch (err) {
    logger.error('Failed to create career path', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 22. Team Member Assignment ──────────────────────────────

/**
 * Assign or reassign an employee to a team (gig, project, cross-functional).
 * Used by: GigSourcerAgent, TaskBidderAgent, TalentMarketplaceAgent, RelocationBotAgent
 */
export async function assignTeamMember(
  tenantId: string,
  userId: string,
  params: {
    teamId: string;
    targetUserId: string;
    role?: string;
    allocation?: number;
    startDate?: string;
    endDate?: string;
    isPrimary?: boolean;
  },
): Promise<ToolResult> {
  try {
    // Validate team exists in this tenant
    const team = await prisma.team.findFirst({
      where: { id: params.teamId, tenantId },
      select: { id: true, name: true },
    });
    if (!team) return { success: false, data: null, error: `Team ${params.teamId} not found in tenant` };

    // Validate target user exists
    const targetUser = await prisma.user.findFirst({
      where: { id: params.targetUserId, tenantId, deletedAt: null },
      select: { id: true, firstName: true },
    });
    if (!targetUser) return { success: false, data: null, error: `User ${params.targetUserId} not found in tenant` };

    const member = await prisma.teamMember.create({
      data: {
        teamId: params.teamId,
        userId: params.targetUserId,
        role: (params.role as any) || 'MEMBER',
        allocation: params.allocation ?? 100,
        startDate: params.startDate ? new Date(params.startDate) : new Date(),
        endDate: params.endDate ? new Date(params.endDate) : null,
        isPrimary: params.isPrimary ?? false,
      },
      select: { id: true, role: true, allocation: true, startDate: true, endDate: true },
    });

    auditLogger(
      'AI_TEAM_MEMBER_ASSIGNED',
      userId,
      tenantId,
      'team_member',
      member.id,
      { teamId: params.teamId, teamName: team.name, targetUserId: params.targetUserId, role: params.role || 'MEMBER' },
    );

    return { success: true, data: { ...member, teamName: team.name } };
  } catch (err) {
    logger.error('Failed to assign team member', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 23. Calendar Event ──────────────────────────────────────

/**
 * Create a calendar event (leave, team event, deadline, review reminder).
 * Used by: LeaveOptimizerAgent, SocialBondingAgent
 */
export async function createCalendarEvent(
  tenantId: string,
  userId: string,
  params: {
    targetUserId: string;
    title: string;
    eventDate: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    allDay?: boolean;
    type?: string;
    color?: string;
    goalId?: string;
    reviewCycleId?: string;
    reminderMinutes?: number[];
    metadata?: Record<string, unknown>;
  },
): Promise<ToolResult> {
  try {
    const event = await prisma.calendarEvent.create({
      data: {
        tenantId,
        userId: params.targetUserId,
        title: params.title,
        eventDate: new Date(params.eventDate),
        description: params.description || null,
        startTime: params.startTime ? new Date(params.startTime) : null,
        endTime: params.endTime ? new Date(params.endTime) : null,
        allDay: params.allDay ?? false,
        type: (params.type as any) || 'PERSONAL',
        color: params.color || null,
        goalId: params.goalId || null,
        reviewCycleId: params.reviewCycleId || null,
        reminderMinutes: params.reminderMinutes || [],
        metadata: (params.metadata || {}) as any,
      },
      select: { id: true, title: true, eventDate: true, type: true, allDay: true },
    });

    auditLogger(
      'AI_CALENDAR_EVENT_CREATED',
      userId,
      tenantId,
      'calendar_event',
      event.id,
      { targetUserId: params.targetUserId, title: params.title, type: params.type || 'PERSONAL' },
    );

    return { success: true, data: event };
  } catch (err) {
    logger.error('Failed to create calendar event', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 24. Board Announcement ──────────────────────────────────

/**
 * Create a notification board announcement (recognition, milestone, onboarding update).
 * Used by: GratitudeSentinelAgent, LegacyArchivistAgent, SocialBondingAgent,
 *          OnboardingAgent, NotificationAgent
 */
export async function createBoardAnnouncement(
  tenantId: string,
  userId: string,
  params: {
    itemType: string;
    category: string;
    title: string;
    message: string;
    sourceType: string;
    priority?: string;
    details?: Record<string, unknown>;
    targetType?: string;
    targetId?: string;
    affectedUserIds?: string[];
    actionUrl?: string;
    actionLabel?: string;
    isDismissible?: boolean;
    expiresAt?: string;
  },
): Promise<ToolResult> {
  try {
    const item = await prisma.notificationBoardItem.create({
      data: {
        tenantId,
        itemType: params.itemType,
        category: params.category,
        title: params.title,
        message: params.message,
        sourceType: params.sourceType,
        priority: params.priority || 'normal',
        details: (params.details || null) as any,
        targetType: params.targetType || null,
        targetId: params.targetId || null,
        affectedUserIds: params.affectedUserIds || [],
        actionUrl: params.actionUrl || null,
        actionLabel: params.actionLabel || null,
        isDismissible: params.isDismissible ?? true,
        status: 'active',
        expiresAt: params.expiresAt ? new Date(params.expiresAt) : null,
      },
      select: { id: true, itemType: true, category: true, title: true, priority: true, status: true },
    });

    auditLogger(
      'AI_BOARD_ANNOUNCEMENT_CREATED',
      userId,
      tenantId,
      'notification_board_item',
      item.id,
      { itemType: params.itemType, category: params.category, title: params.title },
    );

    return { success: true, data: item };
  } catch (err) {
    logger.error('Failed to create board announcement', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 25. Development Checkpoint ──────────────────────────────

/**
 * Create a development checkpoint to assess progress on a development plan.
 * Used by: ARMentorAgent, OnboardingOrchestratorAgent
 */
export async function createDevelopmentCheckpoint(
  tenantId: string,
  userId: string,
  params: {
    developmentPlanId: string;
    targetUserId: string;
    checkpointName: string;
    checkpointDate: string;
    checkpointType: string;
    progressReview?: string;
    skillsAcquired?: string[];
    competenciesImproved?: Record<string, unknown>;
  },
): Promise<ToolResult> {
  try {
    // Validate development plan exists in this tenant
    const plan = await prisma.developmentPlan.findFirst({
      where: { id: params.developmentPlanId, tenantId },
      select: { id: true, planName: true },
    });
    if (!plan) return { success: false, data: null, error: `Development plan ${params.developmentPlanId} not found` };

    const checkpoint = await prisma.developmentCheckpoint.create({
      data: {
        tenantId,
        developmentPlanId: params.developmentPlanId,
        userId: params.targetUserId,
        checkpointName: params.checkpointName,
        checkpointDate: new Date(params.checkpointDate),
        checkpointType: params.checkpointType,
        progressReview: params.progressReview || null,
        skillsAcquired: params.skillsAcquired || [],
        competenciesImproved: (params.competenciesImproved || {}) as any,
      },
      select: { id: true, checkpointName: true, checkpointDate: true, checkpointType: true },
    });

    auditLogger(
      'AI_DEVELOPMENT_CHECKPOINT_CREATED',
      userId,
      tenantId,
      'development_checkpoint',
      checkpoint.id,
      { planId: params.developmentPlanId, planName: plan.planName, checkpointName: params.checkpointName },
    );

    return { success: true, data: checkpoint };
  } catch (err) {
    logger.error('Failed to create development checkpoint', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 26. Skill Progress Entry ────────────────────────────────

/**
 * Log a skill progress entry tracking score changes over time.
 * Used by: CredentialLedgerAgent, LogicValidatorAgent
 */
export async function logSkillProgress(
  tenantId: string,
  userId: string,
  params: {
    assessmentId: string;
    previousScore: number;
    newScore: number;
    changeReason?: string;
    evidenceId?: string;
    notes?: string;
  },
): Promise<ToolResult> {
  try {
    // Validate assessment exists in this tenant
    const assessment = await prisma.technicalSkillAssessment.findFirst({
      where: { id: params.assessmentId, tenantId },
      select: { id: true, skillName: true },
    });
    if (!assessment) return { success: false, data: null, error: `Skill assessment ${params.assessmentId} not found` };

    const progress = await prisma.skillProgressHistory.create({
      data: {
        assessmentId: params.assessmentId,
        previousScore: params.previousScore,
        newScore: params.newScore,
        changeReason: params.changeReason || null,
        evidenceId: params.evidenceId || null,
        assessedBy: userId,
        notes: params.notes || null,
      },
      select: { id: true, previousScore: true, newScore: true, changeReason: true, createdAt: true },
    });

    auditLogger(
      'AI_SKILL_PROGRESS_LOGGED',
      userId,
      tenantId,
      'skill_progress_history',
      progress.id,
      { assessmentId: params.assessmentId, skillName: assessment.skillName, previousScore: params.previousScore, newScore: params.newScore },
    );

    return { success: true, data: { ...progress, skillName: assessment.skillName } };
  } catch (err) {
    logger.error('Failed to log skill progress', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 27. Deadline Alert ──────────────────────────────────────

/**
 * Create a deadline alert for an approaching or overdue item.
 * Used by: ExcelValidationAgent, NLPQueryAgent
 */
export async function createDeadlineAlert(
  tenantId: string,
  userId: string,
  params: {
    targetUserId: string;
    entityType: string;
    entityId: string;
    entityTitle: string;
    deadline: string;
    alertLevel: string;
    currentProgress?: number;
    completionProbability?: number;
    requiredDailyProgress?: number;
  },
): Promise<ToolResult> {
  try {
    const deadlineDate = new Date(params.deadline);
    const now = new Date();
    const msUntil = deadlineDate.getTime() - now.getTime();
    const daysUntil = Math.ceil(msUntil / (1000 * 60 * 60 * 24));
    const hoursUntil = Math.ceil(msUntil / (1000 * 60 * 60));

    const alert = await prisma.deadlineAlert.create({
      data: {
        tenantId,
        userId: params.targetUserId,
        entityType: params.entityType,
        entityId: params.entityId,
        entityTitle: params.entityTitle,
        deadline: deadlineDate,
        daysUntilDeadline: daysUntil,
        hoursUntilDeadline: hoursUntil,
        alertLevel: params.alertLevel,
        currentProgress: params.currentProgress ?? null,
        completionProbability: params.completionProbability ?? null,
        requiredDailyProgress: params.requiredDailyProgress ?? null,
        isAcknowledged: false,
        isSnoozed: false,
        notificationCount: 0,
      },
      select: { id: true, entityTitle: true, deadline: true, alertLevel: true, daysUntilDeadline: true },
    });

    auditLogger(
      'AI_DEADLINE_ALERT_CREATED',
      userId,
      tenantId,
      'deadline_alert',
      alert.id,
      { entityType: params.entityType, entityTitle: params.entityTitle, alertLevel: params.alertLevel, daysUntil },
    );

    return { success: true, data: alert };
  } catch (err) {
    logger.error('Failed to create deadline alert', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 28. Compliance Policy ───────────────────────────────────

/**
 * Create or draft a compliance policy document.
 * Used by: PolicyTranslatorAgent
 */
export async function createCompliancePolicy(
  tenantId: string,
  userId: string,
  params: {
    policyName: string;
    policyCode: string;
    policyType: string;
    applicableScope: string;
    description?: string;
    version?: string;
    complianceRules?: Array<{ rule: string; severity: string }>;
    violationDefinitions?: Array<{ type: string; description: string; severity: string }>;
    enforcementLevel?: string;
    gracePeriodDays?: number;
    effectiveDate?: string;
    expirationDate?: string;
  },
): Promise<ToolResult> {
  try {
    const policy = await prisma.compliancePolicy.create({
      data: {
        tenantId,
        policyName: params.policyName,
        policyCode: params.policyCode,
        policyType: params.policyType,
        applicableScope: params.applicableScope,
        description: params.description || null,
        version: params.version || '1.0',
        complianceRules: (params.complianceRules || []) as any,
        violationDefinitions: (params.violationDefinitions || []) as any,
        automatedChecks: [] as any,
        enforcementLevel: params.enforcementLevel || 'ADVISORY',
        gracePeriodDays: params.gracePeriodDays ?? 0,
        escalationRules: [] as any,
        applicableEntities: [] as any,
        status: 'DRAFT',
        effectiveDate: params.effectiveDate ? new Date(params.effectiveDate) : null,
        expirationDate: params.expirationDate ? new Date(params.expirationDate) : null,
        createdBy: userId,
      },
      select: { id: true, policyName: true, policyCode: true, policyType: true, status: true, enforcementLevel: true },
    });

    auditLogger(
      'AI_COMPLIANCE_POLICY_CREATED',
      userId,
      tenantId,
      'compliance_policy',
      policy.id,
      { policyName: params.policyName, policyCode: params.policyCode, policyType: params.policyType },
    );

    return { success: true, data: policy };
  } catch (err) {
    logger.error('Failed to create compliance policy', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 29. Agent Task ──────────────────────────────────────────

/**
 * Create an autonomous agent task for background execution.
 * Used by: VendorNegotiatorAgent, PensionGuardAgent, NanoPaymentAgent
 */
export async function createAgentTask(
  tenantId: string,
  userId: string,
  params: {
    agentType: string;
    title: string;
    goal: string;
    description?: string;
    plan?: Array<{ step: number; action: string; status?: string }>;
    totalSteps?: number;
    isProactive?: boolean;
    parentTaskId?: string;
  },
): Promise<ToolResult> {
  try {
    const task = await prisma.agentTask.create({
      data: {
        tenantId,
        userId,
        agentType: params.agentType,
        title: params.title,
        goal: params.goal,
        description: params.description || null,
        plan: (params.plan || null) as any,
        totalSteps: params.totalSteps ?? (params.plan?.length || 0),
        currentStep: 0,
        status: 'pending',
        isProactive: params.isProactive ?? false,
        parentTaskId: params.parentTaskId || null,
      },
      select: { id: true, agentType: true, title: true, status: true, totalSteps: true, isProactive: true },
    });

    auditLogger(
      'AI_AGENT_TASK_CREATED',
      userId,
      tenantId,
      'agent_task',
      task.id,
      { agentType: params.agentType, title: params.title, isProactive: params.isProactive ?? false },
    );

    return { success: true, data: task };
  } catch (err) {
    logger.error('Failed to create agent task', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 30. Performance Benchmark ───────────────────────────────

/**
 * Create a performance benchmark for market-value and percentile comparisons.
 * Used by: MarketValueAgent, ReportAgent
 */
export async function createPerformanceBenchmark(
  tenantId: string,
  userId: string,
  params: {
    benchmarkName: string;
    benchmarkType: string;
    metricName: string;
    metricCategory: string;
    percentile25: number;
    percentile50: number;
    percentile75: number;
    percentile90: number;
    mean: number;
    standardDeviation: number;
    minValue: number;
    maxValue: number;
    sampleSize: number;
    dataPoints: number;
    validFrom: string;
    validUntil: string;
    targetRole?: string;
    targetDepartment?: string;
    targetLevel?: number;
    modelVersion?: string;
    computationMethod?: string;
  },
): Promise<ToolResult> {
  try {
    const benchmark = await prisma.performanceBenchmark.create({
      data: {
        tenantId,
        benchmarkName: params.benchmarkName,
        benchmarkType: params.benchmarkType,
        metricName: params.metricName,
        metricCategory: params.metricCategory,
        percentile25: params.percentile25,
        percentile50: params.percentile50,
        percentile75: params.percentile75,
        percentile90: params.percentile90,
        mean: params.mean,
        standardDeviation: params.standardDeviation,
        minValue: params.minValue,
        maxValue: params.maxValue,
        sampleSize: params.sampleSize,
        dataPoints: params.dataPoints,
        validFrom: new Date(params.validFrom),
        validUntil: new Date(params.validUntil),
        computedAt: new Date(),
        targetRole: params.targetRole || null,
        targetDepartment: params.targetDepartment || null,
        targetLevel: params.targetLevel ?? null,
        modelVersion: params.modelVersion || '1.0',
        computationMethod: params.computationMethod || 'percentile_rank',
        isActive: true,
      },
      select: { id: true, benchmarkName: true, benchmarkType: true, metricName: true, sampleSize: true, isActive: true },
    });

    auditLogger(
      'AI_PERFORMANCE_BENCHMARK_CREATED',
      userId,
      tenantId,
      'performance_benchmark',
      benchmark.id,
      { benchmarkName: params.benchmarkName, benchmarkType: params.benchmarkType, metricName: params.metricName },
    );

    return { success: true, data: benchmark };
  } catch (err) {
    logger.error('Failed to create performance benchmark', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}
