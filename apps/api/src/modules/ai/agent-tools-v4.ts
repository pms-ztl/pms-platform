/**
 * Agent Tools V4 — Domain-specific WRITE operations for autonomous agent actions.
 *
 * These tools enable agents to take real actions beyond generic PMS operations.
 * Each function creates business records in the database with full audit trails.
 *
 * All writes enforce tenant isolation and require human-in-the-loop approval
 * via the tool registry's requiresApproval flag.
 */

import { prisma } from '@pms/database';

import { logger, auditLogger } from '../../utils/logger';
import type { ToolResult } from './agent-tools';

// ── 1. Evidence ──────────────────────────────────────────────

/**
 * Create a performance evidence record for an employee.
 * Used by: PerformanceSignalAgent, ReviewDrafterAgent
 */
export async function createEvidence(
  tenantId: string,
  userId: string,
  params: {
    employeeId: string;
    type: string;
    title: string;
    description?: string;
    occurredAt?: string;
    source?: string;
    impactScore?: number;
    effortScore?: number;
    qualityScore?: number;
    tags?: string[];
    skillTags?: string[];
  },
): Promise<ToolResult> {
  try {
    const evidence = await prisma.evidence.create({
      data: {
        tenantId,
        employeeId: params.employeeId,
        type: params.type as any,
        source: (params.source as any) || 'INTERNAL',
        status: 'PENDING_VERIFICATION',
        title: params.title,
        description: params.description || null,
        occurredAt: params.occurredAt ? new Date(params.occurredAt) : new Date(),
        impactScore: params.impactScore ?? null,
        effortScore: params.effortScore ?? null,
        qualityScore: params.qualityScore ?? null,
        tags: params.tags || [],
        skillTags: params.skillTags || [],
      },
      select: { id: true, title: true, type: true, status: true, occurredAt: true },
    });

    auditLogger(
      'AI_EVIDENCE_CREATED',
      userId,
      tenantId,
      'evidence',
      evidence.id,
      { employeeId: params.employeeId, type: params.type, title: params.title },
    );

    return { success: true, data: evidence };
  } catch (err) {
    logger.error('Failed to create evidence', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 2. One-on-One Meetings ──────────────────────────────────

/**
 * Schedule a one-on-one meeting between a manager and employee.
 * Used by: OneOnOneAdvisorAgent, CoachingAgent
 */
export async function scheduleOneOnOne(
  tenantId: string,
  userId: string,
  params: {
    managerId: string;
    employeeId: string;
    scheduledAt: string;
    duration?: number;
    agenda?: Array<{ topic: string; duration?: number }>;
    actionItems?: Array<{ text: string; assignee?: string }>;
  },
): Promise<ToolResult> {
  try {
    // Validate that both users exist in this tenant
    const [manager, employee] = await Promise.all([
      prisma.user.findFirst({ where: { id: params.managerId, tenantId, deletedAt: null }, select: { id: true, firstName: true } }),
      prisma.user.findFirst({ where: { id: params.employeeId, tenantId, deletedAt: null }, select: { id: true, firstName: true } }),
    ]);

    if (!manager) return { success: false, data: null, error: `Manager ${params.managerId} not found in tenant` };
    if (!employee) return { success: false, data: null, error: `Employee ${params.employeeId} not found in tenant` };

    const oneOnOne = await prisma.oneOnOne.create({
      data: {
        tenantId,
        managerId: params.managerId,
        employeeId: params.employeeId,
        scheduledAt: new Date(params.scheduledAt),
        duration: params.duration || 30,
        status: 'SCHEDULED',
        agenda: (params.agenda || []) as any,
        actionItems: (params.actionItems || []) as any,
      },
      select: { id: true, scheduledAt: true, duration: true, status: true },
    });

    auditLogger(
      'AI_ONE_ON_ONE_SCHEDULED',
      userId,
      tenantId,
      'one_on_one',
      oneOnOne.id,
      { managerId: params.managerId, employeeId: params.employeeId, scheduledAt: params.scheduledAt },
    );

    return { success: true, data: oneOnOne };
  } catch (err) {
    logger.error('Failed to schedule one-on-one', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 3. Development Plans ─────────────────────────────────────

/**
 * Create a career/skill development plan for an employee.
 * Used by: CareerAgent, SkillGapForecasterAgent, CoachingAgent
 */
export async function createDevelopmentPlan(
  tenantId: string,
  userId: string,
  params: {
    targetUserId: string;
    planName: string;
    planType: string;
    startDate: string;
    targetCompletionDate: string;
    careerGoal: string;
    currentLevel: string;
    targetRole?: string;
    developmentAreas?: string[];
    targetSkills?: Array<{ name: string; currentLevel: string; targetLevel: string }>;
  },
): Promise<ToolResult> {
  try {
    const start = new Date(params.startDate);
    const end = new Date(params.targetCompletionDate);
    const durationMonths = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));

    const plan = await prisma.developmentPlan.create({
      data: {
        tenantId,
        userId: params.targetUserId,
        planName: params.planName,
        planType: params.planType,
        duration: durationMonths,
        startDate: start,
        targetCompletionDate: end,
        careerGoal: params.careerGoal,
        currentLevel: params.currentLevel,
        targetRole: params.targetRole || null,
        developmentAreas: params.developmentAreas || [],
        targetSkills: (params.targetSkills || []) as any,
        status: 'DRAFT',
        progressPercentage: 0,
        generatedBy: 'AI',
      },
      select: { id: true, planName: true, planType: true, status: true, startDate: true, targetCompletionDate: true },
    });

    auditLogger(
      'AI_DEVELOPMENT_PLAN_CREATED',
      userId,
      tenantId,
      'development_plan',
      plan.id,
      { targetUserId: params.targetUserId, planType: params.planType, planName: params.planName },
    );

    return { success: true, data: plan };
  } catch (err) {
    logger.error('Failed to create development plan', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 4. Development Activities ────────────────────────────────

/**
 * Log a development activity (training, course, mentoring session, etc.)
 * Used by: MicroLearningAgent, CrossTrainingAgent, ShadowLearningAgent
 */
export async function logDevelopmentActivity(
  tenantId: string,
  userId: string,
  params: {
    developmentPlanId: string;
    targetUserId: string;
    activityType: string;
    title: string;
    description: string;
    targetSkills?: string[];
    dueDate?: string;
    estimatedHours?: number;
    priority?: string;
  },
): Promise<ToolResult> {
  try {
    // Validate that the development plan exists and belongs to this tenant
    const plan = await prisma.developmentPlan.findFirst({
      where: { id: params.developmentPlanId, tenantId },
      select: { id: true },
    });
    if (!plan) return { success: false, data: null, error: `Development plan ${params.developmentPlanId} not found` };

    const activity = await prisma.developmentActivity.create({
      data: {
        tenantId,
        developmentPlanId: params.developmentPlanId,
        userId: params.targetUserId,
        activityType: params.activityType,
        title: params.title,
        description: params.description,
        targetSkills: params.targetSkills || [],
        dueDate: params.dueDate ? new Date(params.dueDate) : null,
        estimatedHours: params.estimatedHours ?? null,
        priority: params.priority || 'MEDIUM',
        status: 'NOT_STARTED',
        progressPercentage: 0,
      },
      select: { id: true, title: true, activityType: true, status: true, dueDate: true },
    });

    auditLogger(
      'AI_DEVELOPMENT_ACTIVITY_LOGGED',
      userId,
      tenantId,
      'development_activity',
      activity.id,
      { planId: params.developmentPlanId, activityType: params.activityType, title: params.title },
    );

    return { success: true, data: activity };
  } catch (err) {
    logger.error('Failed to log development activity', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 5. Compliance Assessments ────────────────────────────────

/**
 * Create a compliance assessment for a user, team, or department.
 * Used by: AuditTrailAgent, LaborComplianceAgent, DataPrivacyAgent, POSHSentinelAgent
 */
export async function createComplianceAssessment(
  tenantId: string,
  userId: string,
  params: {
    assessmentType: string;
    assessmentScope: string;
    periodStart: string;
    periodEnd: string;
    targetUserId?: string;
    departmentId?: string;
    teamId?: string;
    riskLevel?: string;
  },
): Promise<ToolResult> {
  try {
    const assessment = await prisma.complianceAssessment.create({
      data: {
        tenantId,
        assessmentType: params.assessmentType,
        assessmentScope: params.assessmentScope,
        assessmentPeriodStart: new Date(params.periodStart),
        assessmentPeriodEnd: new Date(params.periodEnd),
        userId: params.targetUserId || null,
        departmentId: params.departmentId || null,
        teamId: params.teamId || null,
        complianceStatus: 'PENDING',
        riskLevel: params.riskLevel || null,
        autoDetected: true,
        assessedBy: userId,
        assessedAt: new Date(),
      },
      select: { id: true, assessmentType: true, assessmentScope: true, complianceStatus: true, assessedAt: true },
    });

    auditLogger(
      'AI_COMPLIANCE_ASSESSMENT_CREATED',
      userId,
      tenantId,
      'compliance_assessment',
      assessment.id,
      { assessmentType: params.assessmentType, scope: params.assessmentScope },
    );

    return { success: true, data: assessment };
  } catch (err) {
    logger.error('Failed to create compliance assessment', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 6. Compliance Violations ─────────────────────────────────

/**
 * Log a compliance violation detected during an assessment.
 * Used by: ConflictOfInterestAgent, WhistleblowerAgent
 */
export async function logComplianceViolation(
  tenantId: string,
  userId: string,
  params: {
    assessmentId: string;
    violationType: string;
    severity: string;
    ruleViolated: string;
    description: string;
    detectionMethod?: string;
    targetUserId?: string;
  },
): Promise<ToolResult> {
  try {
    // Validate that the assessment exists and belongs to this tenant
    const assessment = await prisma.complianceAssessment.findFirst({
      where: { id: params.assessmentId, tenantId },
      select: { id: true },
    });
    if (!assessment) return { success: false, data: null, error: `Assessment ${params.assessmentId} not found` };

    const violation = await prisma.complianceViolation.create({
      data: {
        tenantId,
        assessmentId: params.assessmentId,
        violationType: params.violationType,
        severity: params.severity,
        ruleViolated: params.ruleViolated,
        description: params.description,
        detectionMethod: params.detectionMethod || 'AUTOMATED',
        userId: params.targetUserId || null,
        status: 'OPEN',
        detectedAt: new Date(),
      },
      select: { id: true, violationType: true, severity: true, status: true, detectedAt: true },
    });

    // Update violation count on the assessment
    await prisma.complianceAssessment.update({
      where: { id: params.assessmentId },
      data: {
        violationCount: { increment: 1 },
        ...(params.severity === 'CRITICAL' ? { criticalViolations: { increment: 1 } } : { minorViolations: { increment: 1 } }),
      },
    });

    auditLogger(
      'AI_COMPLIANCE_VIOLATION_LOGGED',
      userId,
      tenantId,
      'compliance_violation',
      violation.id,
      { assessmentId: params.assessmentId, violationType: params.violationType, severity: params.severity },
    );

    return { success: true, data: violation };
  } catch (err) {
    logger.error('Failed to log compliance violation', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 7. Succession Plans ──────────────────────────────────────

/**
 * Create a succession plan for a critical position.
 * Used by: SuccessionSentryAgent, WorkforceIntelAgent
 */
export async function createSuccessionPlan(
  tenantId: string,
  userId: string,
  params: {
    positionId: string;
    positionTitle: string;
    criticality: string;
    vacancyImpact: string;
    currentIncumbentId?: string;
    retirementRisk?: boolean;
    turnoverRisk?: string;
    successors?: Array<{ userId: string; readiness: string; probability: number }>;
    notes?: string;
  },
): Promise<ToolResult> {
  try {
    const plan = await prisma.successionPlan.create({
      data: {
        tenantId,
        positionId: params.positionId,
        positionTitle: params.positionTitle,
        criticality: params.criticality,
        vacancyImpact: params.vacancyImpact,
        currentIncumbent: params.currentIncumbentId || null,
        retirementRisk: params.retirementRisk ?? false,
        turnoverRisk: params.turnoverRisk || null,
        successors: (params.successors || []) as any,
        benchStrength: params.successors?.filter((s) => s.readiness === 'READY_NOW').length ?? 0,
        status: 'ACTIVE',
        notes: params.notes || null,
      },
      select: { id: true, positionTitle: true, criticality: true, vacancyImpact: true, benchStrength: true, status: true },
    });

    auditLogger(
      'AI_SUCCESSION_PLAN_CREATED',
      userId,
      tenantId,
      'succession_plan',
      plan.id,
      { positionTitle: params.positionTitle, criticality: params.criticality },
    );

    return { success: true, data: plan };
  } catch (err) {
    logger.error('Failed to create succession plan', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 8. Performance Improvement Plans ─────────────────────────

/**
 * Create a Performance Improvement Plan (PIP) for an employee.
 * Used by: PerformanceAgent, BurnoutInterceptorAgent
 */
export async function createPIP(
  tenantId: string,
  userId: string,
  params: {
    targetUserId: string;
    pipTitle: string;
    pipType: string;
    severity: string;
    startDate: string;
    endDate: string;
    impactStatement: string;
    performanceExpectations: string;
    performanceIssues?: Array<{ issue: string; evidence: string; date?: string }>;
    specificGoals?: Array<{ goal: string; metric: string; target: string; deadline: string }>;
    supportProvided?: Array<{ type: string; description: string }>;
    consequencesOfNonCompliance?: string;
  },
): Promise<ToolResult> {
  try {
    // Validate target user exists
    const targetUser = await prisma.user.findFirst({
      where: { id: params.targetUserId, tenantId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!targetUser) return { success: false, data: null, error: `Employee ${params.targetUserId} not found` };

    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    const pip = await prisma.performanceImprovementPlan.create({
      data: {
        tenantId,
        userId: params.targetUserId,
        createdBy: userId,
        pipTitle: params.pipTitle,
        pipType: params.pipType,
        severity: params.severity,
        startDate: start,
        endDate: end,
        duration: durationDays,
        reviewFrequency: durationDays <= 30 ? 'WEEKLY' : 'BI_WEEKLY',
        impactStatement: params.impactStatement,
        performanceExpectations: params.performanceExpectations,
        performanceIssues: (params.performanceIssues || []) as any,
        specificGoals: (params.specificGoals || []) as any,
        supportProvided: (params.supportProvided || []) as any,
        consequencesOfNonCompliance: params.consequencesOfNonCompliance || 'Continued underperformance may result in further disciplinary action.',
        status: 'DRAFT',
        progressPercentage: 0,
        generatedBy: 'AI',
      },
      select: { id: true, pipTitle: true, pipType: true, severity: true, status: true, startDate: true, endDate: true },
    });

    auditLogger(
      'AI_PIP_CREATED',
      userId,
      tenantId,
      'performance_improvement_plan',
      pip.id,
      { targetUserId: params.targetUserId, pipType: params.pipType, severity: params.severity },
    );

    return { success: true, data: pip };
  } catch (err) {
    logger.error('Failed to create PIP', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 9. Skill Assessments ─────────────────────────────────────

/**
 * Create a technical skill assessment for an employee.
 * Used by: SkillGapForecasterAgent, CrossTrainingAgent, KnowledgeBrokerAgent
 */
export async function createSkillAssessment(
  tenantId: string,
  userId: string,
  params: {
    targetUserId: string;
    skillCategoryId: string;
    skillName: string;
    skillLevel: string;
    selfAssessment?: number;
    managerAssessment?: number;
    testScore?: number;
    finalScore: number;
    improvementPlan?: string;
    certifications?: Array<{ name: string; issuedBy: string; date: string }>;
  },
): Promise<ToolResult> {
  try {
    const assessment = await prisma.technicalSkillAssessment.create({
      data: {
        tenantId,
        userId: params.targetUserId,
        skillCategoryId: params.skillCategoryId,
        skillName: params.skillName,
        skillLevel: params.skillLevel,
        selfAssessment: params.selfAssessment ?? null,
        managerAssessment: params.managerAssessment ?? null,
        testScore: params.testScore ?? null,
        finalScore: params.finalScore,
        improvementPlan: params.improvementPlan || null,
        certifications: (params.certifications || []) as any,
        lastAssessedAt: new Date(),
      },
      select: { id: true, skillName: true, skillLevel: true, finalScore: true, lastAssessedAt: true },
    });

    auditLogger(
      'AI_SKILL_ASSESSMENT_CREATED',
      userId,
      tenantId,
      'skill_assessment',
      assessment.id,
      { targetUserId: params.targetUserId, skillName: params.skillName, skillLevel: params.skillLevel },
    );

    return { success: true, data: assessment };
  } catch (err) {
    logger.error('Failed to create skill assessment', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}

// ── 10. Project Milestones ───────────────────────────────────

/**
 * Create a project milestone linked to a goal.
 * Used by: GoalIntelligenceAgent, StrategicAlignmentAgent
 */
export async function createProjectMilestone(
  tenantId: string,
  userId: string,
  params: {
    title: string;
    description?: string;
    plannedDate: string;
    goalId?: string;
    teamId?: string;
    ownerId?: string;
    milestoneType?: string;
    completionCriteria?: Array<{ criterion: string; weight: number }>;
  },
): Promise<ToolResult> {
  try {
    const milestone = await prisma.projectMilestone.create({
      data: {
        tenantId,
        title: params.title,
        description: params.description || null,
        plannedDate: new Date(params.plannedDate),
        goalId: params.goalId || null,
        teamId: params.teamId || null,
        ownerId: params.ownerId || null,
        milestoneType: params.milestoneType || null,
        completionCriteria: (params.completionCriteria || []) as any,
        status: 'pending',
        progressPercentage: 0,
      },
      select: { id: true, title: true, plannedDate: true, status: true },
    });

    auditLogger(
      'AI_MILESTONE_CREATED',
      userId,
      tenantId,
      'project_milestone',
      milestone.id,
      { title: params.title, goalId: params.goalId },
    );

    return { success: true, data: milestone };
  } catch (err) {
    logger.error('Failed to create project milestone', { error: (err as Error).message, tenantId });
    return { success: false, data: null, error: (err as Error).message };
  }
}
