/**
 * Tool Registry — bridges legacy prompt-injection tools to native LLM tool calling.
 *
 * Every tool wraps an existing agent-tools function with:
 * 1. JSON Schema definition (for LLM tool_use)
 * 2. Impact level (read / low_write / high_write)
 * 3. Approval requirement flag
 * 4. RBAC filtering by role category
 *
 * Write tools (create_goal, send_feedback, etc.) require human-in-the-loop
 * approval for high-impact actions.
 */

import { prisma } from '@pms/database';

import { logger, auditLogger } from '../../utils/logger';
import type { RoleCategory } from './base-agent';

// ── Import existing tool functions ───────────────────────

import {
  queryUsers,
  queryGoals,
  queryReviews,
  queryFeedback,
  queryAnalytics,
  queryLicenseUsage,
  queryAuditEvents,
  sendNotification,
  createInsightCard,
  type ToolResult,
} from './agent-tools';

import {
  queryBurnoutRisk,
  queryAttritionRisk,
  querySkillGaps,
  queryTeamHealth,
  queryBiasMetrics,
  queryGoalAlignment,
  querySuccessionReadiness,
  queryPerformanceSnapshots,
  queryWorkloadDistribution,
  queryCommunicationPatterns,
  queryLearningProgress,
  detectBiasInText,
} from './agent-tools-v2';

import {
  queryComplianceStatus,
  queryCultureDiagnostics,
  queryEngagementPatterns,
  queryOneOnOneHistory,
  querySessionActivity,
  queryCareerSimulation,
  queryProjectContributions,
} from './agent-tools-v3';

import {
  createEvidence,
  scheduleOneOnOne,
  createDevelopmentPlan,
  logDevelopmentActivity,
  createComplianceAssessment,
  logComplianceViolation,
  createSuccessionPlan,
  createPIP,
  createSkillAssessment,
  createProjectMilestone,
} from './agent-tools-v4';

import {
  createWellnessCheckIn,
  logPerformanceAnomaly,
  logActivityEvent,
  logSentimentAnalysis,
  createCompensationRecommendation,
  createPromotionRecommendation,
  createInnovationContribution,
  createCultureDiagnostic,
  createPerformanceAlert,
  createFeedbackNomination,
} from './agent-tools-v5';

import {
  createCareerPath,
  assignTeamMember,
  createCalendarEvent,
  createBoardAnnouncement,
  createDevelopmentCheckpoint,
  logSkillProgress,
  createDeadlineAlert,
  createCompliancePolicy,
  createAgentTask,
  createPerformanceBenchmark,
} from './agent-tools-v6';

// ── Types ──────────────────────────────────────────────────

export type ImpactLevel = 'read' | 'low_write' | 'high_write';

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema for tool parameters */
  inputSchema: Record<string, unknown>;
  impactLevel: ImpactLevel;
  requiresApproval: boolean;
  /** Execute the tool and return result */
  execute: (
    tenantId: string,
    userId: string,
    params: Record<string, unknown>,
  ) => Promise<ToolResult>;
}

// Re-export ToolResult for convenience
export type { ToolResult };

// ── READ Tools ─────────────────────────────────────────────

const READ_TOOLS: ToolDefinition[] = [
  // ── V1 tools ──
  {
    name: 'query_users',
    description:
      'Search and list employees within the organization. Filter by name, department, level, role, or active status. Returns employee profiles with name, email, job title, level, and last login.',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Search by name or email' },
        departmentId: { type: 'string', description: 'Filter by department UUID' },
        level: { type: 'number', description: 'Filter by job level (1-10)' },
        isActive: { type: 'boolean', description: 'Filter active/inactive users' },
        limit: { type: 'number', description: 'Max results (default 50, max 100)' },
      },
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryUsers(tenantId, params as any),
  },
  {
    name: 'query_goals',
    description:
      'Retrieve performance goals. Filter by owner or status (not_started, in_progress, completed, overdue). Returns goal title, description, progress, due date, and priority.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Filter goals for a specific user UUID' },
        status: { type: 'string', description: 'Filter by status: not_started, in_progress, completed, overdue' },
        limit: { type: 'number', description: 'Max results (default 50)' },
      },
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryGoals(tenantId, params as any),
  },
  {
    name: 'query_reviews',
    description:
      'Query performance reviews. Filter by user (reviewee or reviewer), review cycle, or status. Returns review ratings, comments, and completion status.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Filter by reviewee or reviewer UUID' },
        cycleId: { type: 'string', description: 'Filter by review cycle UUID' },
        status: { type: 'string', description: 'Filter by status' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryReviews(tenantId, params as any),
  },
  {
    name: 'query_feedback',
    description:
      'Fetch peer and manager feedback. Filter by user (sender or receiver) and type (peer, manager, self). Returns feedback content, type, and timestamp.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Filter by sender or receiver UUID' },
        type: { type: 'string', description: 'Filter by type: peer, manager, self' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryFeedback(tenantId, params as any),
  },
  {
    name: 'query_analytics',
    description:
      'Query daily performance metrics for a user or across the tenant. Returns metric values over time for trend analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User UUID for individual metrics' },
        metric: { type: 'string', description: 'Specific metric name to filter' },
        since: { type: 'string', description: 'ISO date string to start from' },
        limit: { type: 'number', description: 'Max data points (default 30)' },
      },
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryAnalytics(tenantId, params as any),
  },
  {
    name: 'query_license_usage',
    description:
      'Get tenant license information: total seats, active users, archived users, and subscription status.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId) => queryLicenseUsage(tenantId),
  },
  {
    name: 'query_audit_events',
    description:
      'Retrieve audit trail events. Filter by action type, user, entity type, or time period. Returns event details with actor, action, and timestamp.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'Filter by action type' },
        userId: { type: 'string', description: 'Filter by actor UUID' },
        entityType: { type: 'string', description: 'Filter by entity type' },
        since: { type: 'string', description: 'ISO date string to start from' },
        limit: { type: 'number', description: 'Max results (default 50)' },
      },
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryAuditEvents(tenantId, params as any),
  },

  // ── V2 tools ──
  {
    name: 'query_burnout_risk',
    description:
      'Analyze employee burnout risk using workload metrics, overtime hours, and pending work. Returns a 0-100 risk score per user with contributing factors.',
    inputSchema: {
      type: 'object',
      properties: {
        departmentId: { type: 'string', description: 'Filter by department UUID' },
        limit: { type: 'number', description: 'Max users to analyze' },
      },
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryBurnoutRisk(tenantId, params as any),
  },
  {
    name: 'query_attrition_risk',
    description:
      'Predict employee flight risk using engagement trends, feedback sentiment, goal stagnation, and tenure analysis. Returns risk scores with contributing factors.',
    inputSchema: {
      type: 'object',
      properties: {
        departmentId: { type: 'string', description: 'Filter by department UUID' },
        limit: { type: 'number', description: 'Max users to analyze' },
      },
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryAttritionRisk(tenantId, params as any),
  },
  {
    name: 'query_skill_gaps',
    description:
      'Identify skill gaps by comparing assessment scores against career path requirements. Returns skills needing development with current vs target proficiency.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Analyze gaps for specific user (optional)' },
      },
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      querySkillGaps(tenantId, params.userId as string | undefined),
  },
  {
    name: 'query_team_health',
    description:
      'Aggregate team-level metrics: sentiment, workload balance, collaboration score, feedback frequency, and at-risk member count.',
    inputSchema: {
      type: 'object',
      properties: {
        managerId: { type: 'string', description: 'Manager UUID to scope to their team' },
      },
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryTeamHealth(tenantId, params.managerId as string | undefined),
  },
  {
    name: 'query_bias_metrics',
    description:
      'Analyze review ratings for statistical bias across departments and levels. Flags groups deviating >1.5 standard deviations from the mean.',
    inputSchema: {
      type: 'object',
      properties: {
        cycleId: { type: 'string', description: 'Filter by review cycle UUID' },
      },
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryBiasMetrics(tenantId, params as any),
  },
  {
    name: 'query_goal_alignment',
    description:
      'Check organization-wide goal alignment coverage and identify orphan goals with no parent or alignment link.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId) => queryGoalAlignment(tenantId),
  },
  {
    name: 'query_succession_readiness',
    description:
      'Assess succession pipeline: bench strength, readiness level, and gaps per critical role.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId) => querySuccessionReadiness(tenantId),
  },
  {
    name: 'query_performance_snapshots',
    description:
      'Generate a combined performance snapshot for a user: goals, recent feedback, reviews, and activity metrics. Ideal for 1:1 prep.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Target user UUID (required)' },
      },
      required: ['userId'],
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryPerformanceSnapshots(tenantId, params.userId as string),
  },
  {
    name: 'query_workload_distribution',
    description:
      'Analyze workload distribution across a manager\'s team with per-member scores and pending work items.',
    inputSchema: {
      type: 'object',
      properties: {
        managerId: { type: 'string', description: 'Manager UUID' },
      },
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryWorkloadDistribution(tenantId, params.managerId as string | undefined),
  },
  {
    name: 'query_communication_patterns',
    description:
      'Analyze communication patterns: sentiment trends, interaction frequency, collaboration index.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Analyze for specific user' },
      },
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryCommunicationPatterns(tenantId, params.userId as string | undefined),
  },
  {
    name: 'query_learning_progress',
    description:
      'Track development plan progress and learning activity completion rates.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Track for specific user' },
      },
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryLearningProgress(tenantId, params.userId as string | undefined),
  },
  {
    name: 'detect_bias_in_text',
    description:
      'Analyze text for gendered language and vague feedback patterns. Returns flags with improvement suggestions. Does not access database.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to analyze for bias' },
      },
      required: ['text'],
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (_tenantId, _userId, params) =>
      detectBiasInText(params.text as string),
  },

  // ── V3 tools ──
  {
    name: 'query_compliance_status',
    description:
      'Query compliance posture: active policies, recent violations, and assessment summaries.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Filter for specific user' },
        policyType: { type: 'string', description: 'Filter by policy type' },
        limit: { type: 'number', description: 'Max results' },
      },
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryComplianceStatus(tenantId, params as any),
  },
  {
    name: 'query_culture_diagnostics',
    description:
      'Pull organizational health metrics, department health, and culture diagnostic assessments.',
    inputSchema: {
      type: 'object',
      properties: {
        departmentId: { type: 'string', description: 'Filter by department' },
      },
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryCultureDiagnostics(tenantId, params as any),
  },
  {
    name: 'query_engagement_patterns',
    description:
      'Analyze engagement via scores, sentiment trends, and engagement events over time.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Filter for specific user' },
        departmentId: { type: 'string', description: 'Filter by department' },
        days: { type: 'number', description: 'Number of days to analyze (default 30)' },
      },
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryEngagementPatterns(tenantId, params as any),
  },
  {
    name: 'query_one_on_one_history',
    description:
      'Retrieve 1:1 meeting history for a user as host or participant.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User UUID (required)' },
        limit: { type: 'number', description: 'Max results' },
      },
      required: ['userId'],
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryOneOnOneHistory(tenantId, params.userId as string, params as any),
  },
  {
    name: 'query_session_activity',
    description:
      'Query session and hourly activity data with peak productivity hours and late-night activity tracking.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User UUID (required)' },
        days: { type: 'number', description: 'Number of days to analyze' },
      },
      required: ['userId'],
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      querySessionActivity(tenantId, params.userId as string, params as any),
  },
  {
    name: 'query_career_simulation',
    description:
      'Retrieve career paths, promotion recommendations, and succession plans for career trajectory analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Filter for specific user' },
      },
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryCareerSimulation(tenantId, params.userId as string | undefined),
  },
  {
    name: 'query_project_contributions',
    description:
      'Query project evaluations, contribution scores, and milestone data.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Filter for specific user' },
        limit: { type: 'number', description: 'Max results' },
      },
    },
    impactLevel: 'read',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      queryProjectContributions(tenantId, params as any),
  },
];

// ── WRITE Tools ────────────────────────────────────────────

const WRITE_TOOLS: ToolDefinition[] = [
  {
    name: 'create_goal',
    description:
      'Create a new SMART goal for a user. Provide title, description, type, priority, and due date. The goal will be created with "not_started" status.',
    inputSchema: {
      type: 'object',
      properties: {
        ownerId: { type: 'string', description: 'User UUID who will own this goal (required)' },
        title: { type: 'string', description: 'Short goal title (required)' },
        description: { type: 'string', description: 'Detailed SMART description' },
        type: {
          type: 'string',
          description: 'Goal type: individual, team, department, company',
          enum: ['individual', 'team', 'department', 'company'],
        },
        priority: {
          type: 'string',
          description: 'Priority: low, medium, high, critical',
          enum: ['low', 'medium', 'high', 'critical'],
        },
        dueDate: { type: 'string', description: 'ISO date string for deadline' },
      },
      required: ['ownerId', 'title'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) => {
      try {
        const goal = await prisma.goal.create({
          data: {
            tenantId,
            ownerId: params.ownerId as string,
            title: params.title as string,
            description: (params.description as string) || '',
            type: ((params.type as string) || 'INDIVIDUAL').toUpperCase() as any,
            priority: ((params.priority as string) || 'MEDIUM').toUpperCase() as any,
            status: 'DRAFT' as any,
            progress: 0,
            startDate: new Date(),
            dueDate: params.dueDate ? new Date(params.dueDate as string) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            createdById: userId,
          },
          select: { id: true, title: true, status: true, dueDate: true },
        });
        auditLogger('AI_GOAL_CREATED', userId, tenantId, 'goal', goal.id, {
          title: goal.title,
          ownerId: params.ownerId,
          createdByAI: true,
        });
        return { success: true, data: goal };
      } catch (err) {
        logger.error('create_goal tool failed', { tenantId, error: (err as Error).message });
        return { success: false, data: null, error: (err as Error).message };
      }
    },
  },
  {
    name: 'update_goal_status',
    description:
      'Update the status or progress of an existing goal. Can mark goals as in_progress, completed, or update progress percentage.',
    inputSchema: {
      type: 'object',
      properties: {
        goalId: { type: 'string', description: 'Goal UUID to update (required)' },
        status: {
          type: 'string',
          description: 'New status',
          enum: ['not_started', 'in_progress', 'completed', 'overdue'],
        },
        progress: { type: 'number', description: 'Progress percentage 0-100' },
      },
      required: ['goalId'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) => {
      try {
        const data: Record<string, unknown> = {};
        if (params.status) data.status = params.status;
        if (params.progress !== undefined) data.progress = params.progress;
        if (params.status === 'completed') data.completedAt = new Date();

        const goal = await prisma.goal.updateMany({
          where: { id: params.goalId as string, tenantId },
          data,
        });
        auditLogger('AI_GOAL_UPDATED', userId, tenantId, 'goal', params.goalId as string, {
          updates: data,
          updatedByAI: true,
        });
        return { success: true, data: { updated: goal.count } };
      } catch (err) {
        logger.error('update_goal_status tool failed', { tenantId, error: (err as Error).message });
        return { success: false, data: null, error: (err as Error).message };
      }
    },
  },
  {
    name: 'send_feedback',
    description:
      'Send peer or manager feedback to a user. The feedback will be recorded in the system with the AI as creator.',
    inputSchema: {
      type: 'object',
      properties: {
        toUserId: { type: 'string', description: 'Recipient user UUID (required)' },
        type: {
          type: 'string',
          description: 'Feedback type: peer, manager, self',
          enum: ['peer', 'manager', 'self'],
        },
        content: { type: 'string', description: 'Feedback text content (required)' },
        rating: { type: 'number', description: 'Optional rating 1-5' },
      },
      required: ['toUserId', 'content'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) => {
      try {
        const feedback = await prisma.feedback.create({
          data: {
            tenantId,
            fromUserId: userId,
            toUserId: params.toUserId as string,
            type: ((params.type as string) || 'PRAISE').toUpperCase() as any,
            content: params.content as string,
            visibility: 'MANAGER_VISIBLE' as any,
          },
          select: { id: true, type: true, toUserId: true },
        });
        auditLogger('AI_FEEDBACK_SENT', userId, tenantId, 'feedback', feedback.id, {
          toUserId: params.toUserId,
          type: feedback.type,
          createdByAI: true,
        });
        return { success: true, data: feedback };
      } catch (err) {
        logger.error('send_feedback tool failed', { tenantId, error: (err as Error).message });
        return { success: false, data: null, error: (err as Error).message };
      }
    },
  },
  {
    name: 'send_notification',
    description:
      'Send a notification to a user. Notifications appear in the user\'s notification center.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Recipient user UUID (required)' },
        type: { type: 'string', description: 'Notification type (e.g., info, warning, action_required)' },
        title: { type: 'string', description: 'Notification title (required)' },
        message: { type: 'string', description: 'Notification body text (required)' },
        actionUrl: { type: 'string', description: 'Optional URL for CTA button' },
      },
      required: ['userId', 'title', 'message'],
    },
    impactLevel: 'low_write',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      sendNotification(tenantId, params.userId as string, {
        type: (params.type as string) || 'info',
        title: params.title as string,
        message: params.message as string,
        actionUrl: params.actionUrl as string | undefined,
      }),
  },
  {
    name: 'create_insight_card',
    description:
      'Create an AI insight card that appears in the user\'s insight panel. Use for recommendations, warnings, or opportunities.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Target user UUID (null for tenant-wide)' },
        agentType: { type: 'string', description: 'Agent type creating this insight' },
        insightType: {
          type: 'string',
          description: 'Type of insight',
          enum: ['warning', 'opportunity', 'recommendation', 'achievement', 'alert'],
        },
        title: { type: 'string', description: 'Card title (required)' },
        description: { type: 'string', description: 'Card description (required)' },
        priority: {
          type: 'string',
          description: 'Priority level',
          enum: ['low', 'medium', 'high', 'critical'],
        },
        actionUrl: { type: 'string', description: 'Optional action URL' },
        actionLabel: { type: 'string', description: 'Optional action button label' },
      },
      required: ['title', 'description', 'insightType'],
    },
    impactLevel: 'low_write',
    requiresApproval: false,
    execute: async (tenantId, _userId, params) =>
      createInsightCard(tenantId, {
        userId: params.userId as string | undefined,
        agentType: (params.agentType as string) || 'agentic_engine',
        insightType: params.insightType as string,
        title: params.title as string,
        description: params.description as string,
        priority: (params.priority as string) || 'medium',
        actionUrl: params.actionUrl as string | undefined,
        actionLabel: params.actionLabel as string | undefined,
      }),
  },
  {
    name: 'generate_report',
    description:
      'Queue a background report generation job. Reports are processed asynchronously and available when complete.',
    inputSchema: {
      type: 'object',
      properties: {
        reportType: {
          type: 'string',
          description: 'Report type (required)',
          enum: ['performance_summary', 'goal_progress', 'team_analytics', 'feedback_summary', 'engagement_report'],
        },
        entityId: { type: 'string', description: 'Entity UUID to scope the report (user, department, etc.)' },
        dateRange: {
          type: 'object',
          description: 'Date range for the report',
          properties: {
            start: { type: 'string', description: 'Start date ISO string' },
            end: { type: 'string', description: 'End date ISO string' },
          },
        },
      },
      required: ['reportType'],
    },
    impactLevel: 'low_write',
    requiresApproval: false,
    execute: async (tenantId, userId, params) => {
      try {
        // Create a background job record
        const job = await prisma.backgroundJob.create({
          data: {
            tenantId,
            createdById: userId,
            jobType: 'report_generation',
            jobName: `AI Report: ${(params.reportType as string) || 'general'}`,
            status: 'pending',
            jobData: params as any,
          },
        });
        auditLogger('AI_REPORT_QUEUED', userId, tenantId, 'report', job.id, {
          reportType: params.reportType,
          createdByAI: true,
        });
        return { success: true, data: { jobId: job.id, status: 'queued' } };
      } catch (err) {
        logger.error('generate_report tool failed', { tenantId, error: (err as Error).message });
        return { success: false, data: null, error: (err as Error).message };
      }
    },
  },

  // ── Domain-Specific Write Tools (V4) ──────────────────────

  {
    name: 'create_evidence',
    description:
      'Create a performance evidence record for an employee. Evidence captures achievements, contributions, and observable behaviors that support performance reviews. Types: TASK, PULL_REQUEST, PROJECT_MILESTONE, CUSTOMER_FEEDBACK, PEER_FEEDBACK, RECOGNITION_RECEIVED, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        employeeId: { type: 'string', description: 'UUID of the employee this evidence is for (required)' },
        type: {
          type: 'string',
          description: 'Evidence type: TASK, PULL_REQUEST, PROJECT_MILESTONE, CUSTOMER_FEEDBACK, PEER_FEEDBACK, MANAGER_OBSERVATION, METRIC_ACHIEVEMENT, RECOGNITION_RECEIVED, TRAINING_COMPLETION, etc.',
        },
        title: { type: 'string', description: 'Short descriptive title for the evidence (required)' },
        description: { type: 'string', description: 'Detailed description of the achievement or behavior' },
        occurredAt: { type: 'string', description: 'ISO date when this occurred (defaults to now)' },
        source: { type: 'string', description: 'Evidence source: INTERNAL, MANUAL, JIRA, GITHUB, SLACK, etc.' },
        impactScore: { type: 'number', description: 'Impact score 0-10' },
        effortScore: { type: 'number', description: 'Effort score 0-10' },
        qualityScore: { type: 'number', description: 'Quality score 0-10' },
        tags: { type: 'array', description: 'Tags for categorization', items: { type: 'string' } },
        skillTags: { type: 'array', description: 'Skills demonstrated', items: { type: 'string' } },
      },
      required: ['employeeId', 'type', 'title'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createEvidence(tenantId, userId, params as any),
  },
  {
    name: 'schedule_one_on_one',
    description:
      'Schedule a one-on-one meeting between a manager and an employee. Auto-populates agenda and action items based on context.',
    inputSchema: {
      type: 'object',
      properties: {
        managerId: { type: 'string', description: 'UUID of the manager (required)' },
        employeeId: { type: 'string', description: 'UUID of the employee (required)' },
        scheduledAt: { type: 'string', description: 'ISO datetime for the meeting (required)' },
        duration: { type: 'number', description: 'Duration in minutes (default: 30)' },
        agenda: {
          type: 'array',
          description: 'Agenda items',
          items: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
              duration: { type: 'number' },
            },
          },
        },
        actionItems: {
          type: 'array',
          description: 'Pre-populated action items',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              assignee: { type: 'string' },
            },
          },
        },
      },
      required: ['managerId', 'employeeId', 'scheduledAt'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      scheduleOneOnOne(tenantId, userId, params as any),
  },
  {
    name: 'create_development_plan',
    description:
      'Create a career or skill development plan for an employee. Includes career goals, target skills, development areas, and timeline. Plan types: CAREER_GROWTH, SKILL_DEVELOPMENT, LEADERSHIP, PERFORMANCE_IMPROVEMENT.',
    inputSchema: {
      type: 'object',
      properties: {
        targetUserId: { type: 'string', description: 'UUID of the employee this plan is for (required)' },
        planName: { type: 'string', description: 'Name of the development plan (required)' },
        planType: {
          type: 'string',
          description: 'Plan type: CAREER_GROWTH, SKILL_DEVELOPMENT, LEADERSHIP, PERFORMANCE_IMPROVEMENT',
        },
        startDate: { type: 'string', description: 'ISO date for plan start (required)' },
        targetCompletionDate: { type: 'string', description: 'ISO date for target completion (required)' },
        careerGoal: { type: 'string', description: 'The overarching career goal (required)' },
        currentLevel: { type: 'string', description: 'Current level/role of the employee (required)' },
        targetRole: { type: 'string', description: 'Target role the employee is developing towards' },
        developmentAreas: { type: 'array', description: 'Areas needing development', items: { type: 'string' } },
        targetSkills: {
          type: 'array',
          description: 'Skills to develop',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              currentLevel: { type: 'string' },
              targetLevel: { type: 'string' },
            },
          },
        },
      },
      required: ['targetUserId', 'planName', 'planType', 'startDate', 'targetCompletionDate', 'careerGoal', 'currentLevel'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createDevelopmentPlan(tenantId, userId, params as any),
  },
  {
    name: 'log_development_activity',
    description:
      'Log a development activity within a development plan. Activity types: TRAINING, COURSE, CERTIFICATION, MENTORING, PROJECT, SHADOWING, READING.',
    inputSchema: {
      type: 'object',
      properties: {
        developmentPlanId: { type: 'string', description: 'UUID of the parent development plan (required)' },
        targetUserId: { type: 'string', description: 'UUID of the employee (required)' },
        activityType: {
          type: 'string',
          description: 'Activity type: TRAINING, COURSE, CERTIFICATION, MENTORING, PROJECT, SHADOWING, READING',
        },
        title: { type: 'string', description: 'Activity title (required)' },
        description: { type: 'string', description: 'Detailed description of the activity (required)' },
        targetSkills: { type: 'array', description: 'Skills this activity develops', items: { type: 'string' } },
        dueDate: { type: 'string', description: 'ISO date deadline for this activity' },
        estimatedHours: { type: 'number', description: 'Estimated hours to complete' },
        priority: { type: 'string', description: 'Priority: HIGH, MEDIUM, LOW' },
      },
      required: ['developmentPlanId', 'targetUserId', 'activityType', 'title', 'description'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      logDevelopmentActivity(tenantId, userId, params as any),
  },
  {
    name: 'create_compliance_assessment',
    description:
      'Create a compliance assessment for a user, team, department, or organization. Scope: USER, TEAM, DEPARTMENT, ORGANIZATION.',
    inputSchema: {
      type: 'object',
      properties: {
        assessmentType: { type: 'string', description: 'Type of assessment (e.g., POLICY_ADHERENCE, SAFETY, DATA_PRIVACY) (required)' },
        assessmentScope: {
          type: 'string',
          description: 'Assessment scope: USER, TEAM, DEPARTMENT, ORGANIZATION (required)',
        },
        periodStart: { type: 'string', description: 'ISO date for assessment period start (required)' },
        periodEnd: { type: 'string', description: 'ISO date for assessment period end (required)' },
        targetUserId: { type: 'string', description: 'UUID of the user being assessed (for USER scope)' },
        departmentId: { type: 'string', description: 'UUID of the department (for DEPARTMENT scope)' },
        teamId: { type: 'string', description: 'UUID of the team (for TEAM scope)' },
        riskLevel: { type: 'string', description: 'Risk level: LOW, MEDIUM, HIGH, CRITICAL' },
      },
      required: ['assessmentType', 'assessmentScope', 'periodStart', 'periodEnd'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createComplianceAssessment(tenantId, userId, params as any),
  },
  {
    name: 'log_compliance_violation',
    description:
      'Log a compliance violation detected during an assessment. Severity: CRITICAL, HIGH, MEDIUM, LOW.',
    inputSchema: {
      type: 'object',
      properties: {
        assessmentId: { type: 'string', description: 'UUID of the parent compliance assessment (required)' },
        violationType: { type: 'string', description: 'Type of violation (e.g., POLICY_BREACH, SAFETY_VIOLATION, DATA_LEAK) (required)' },
        severity: {
          type: 'string',
          description: 'Severity: CRITICAL, HIGH, MEDIUM, LOW (required)',
        },
        ruleViolated: { type: 'string', description: 'The specific rule or policy violated (required)' },
        description: { type: 'string', description: 'Detailed description of the violation (required)' },
        detectionMethod: { type: 'string', description: 'How detected: AUTOMATED, MANUAL, REPORTED' },
        targetUserId: { type: 'string', description: 'UUID of the user involved (if applicable)' },
      },
      required: ['assessmentId', 'violationType', 'severity', 'ruleViolated', 'description'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      logComplianceViolation(tenantId, userId, params as any),
  },
  {
    name: 'create_succession_plan',
    description:
      'Create a succession plan for a critical position. Identifies successors, assesses vacancy risk, and tracks bench strength. Criticality: CRITICAL, HIGH, MEDIUM, LOW.',
    inputSchema: {
      type: 'object',
      properties: {
        positionId: { type: 'string', description: 'UUID of the position (required)' },
        positionTitle: { type: 'string', description: 'Title of the position (required)' },
        criticality: {
          type: 'string',
          description: 'Position criticality: CRITICAL, HIGH, MEDIUM, LOW (required)',
        },
        vacancyImpact: {
          type: 'string',
          description: 'Impact of vacancy: SEVERE, SIGNIFICANT, MODERATE, MINIMAL (required)',
        },
        currentIncumbentId: { type: 'string', description: 'UUID of current position holder' },
        retirementRisk: { type: 'boolean', description: 'Whether incumbent has retirement risk' },
        turnoverRisk: { type: 'string', description: 'Turnover risk: HIGH, MEDIUM, LOW' },
        successors: {
          type: 'array',
          description: 'Potential successor candidates',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              readiness: { type: 'string', description: 'READY_NOW, READY_1_YEAR, READY_2_YEARS, DEVELOPMENTAL' },
              probability: { type: 'number', description: 'Probability 0-1' },
            },
          },
        },
        notes: { type: 'string', description: 'Additional notes for the plan' },
      },
      required: ['positionId', 'positionTitle', 'criticality', 'vacancyImpact'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createSuccessionPlan(tenantId, userId, params as any),
  },
  {
    name: 'create_pip',
    description:
      'Create a Performance Improvement Plan (PIP) for an underperforming employee. Includes specific goals, support resources, timeline, and consequences. PIP types: PERFORMANCE, BEHAVIOR, ATTENDANCE, SKILLS. Severity: STANDARD, SERIOUS, FINAL_WARNING.',
    inputSchema: {
      type: 'object',
      properties: {
        targetUserId: { type: 'string', description: 'UUID of the employee (required)' },
        pipTitle: { type: 'string', description: 'Title of the PIP (required)' },
        pipType: {
          type: 'string',
          description: 'PIP type: PERFORMANCE, BEHAVIOR, ATTENDANCE, SKILLS (required)',
        },
        severity: {
          type: 'string',
          description: 'Severity: STANDARD, SERIOUS, FINAL_WARNING (required)',
        },
        startDate: { type: 'string', description: 'ISO date for PIP start (required)' },
        endDate: { type: 'string', description: 'ISO date for PIP end (required)' },
        impactStatement: { type: 'string', description: 'Statement of performance impact (required)' },
        performanceExpectations: { type: 'string', description: 'Clear expectations for improvement (required)' },
        performanceIssues: {
          type: 'array',
          description: 'Specific performance issues with evidence',
          items: {
            type: 'object',
            properties: {
              issue: { type: 'string' },
              evidence: { type: 'string' },
              date: { type: 'string' },
            },
          },
        },
        specificGoals: {
          type: 'array',
          description: 'Measurable improvement goals',
          items: {
            type: 'object',
            properties: {
              goal: { type: 'string' },
              metric: { type: 'string' },
              target: { type: 'string' },
              deadline: { type: 'string' },
            },
          },
        },
        supportProvided: {
          type: 'array',
          description: 'Support resources offered',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
        consequencesOfNonCompliance: { type: 'string', description: 'Consequences if PIP goals are not met' },
      },
      required: ['targetUserId', 'pipTitle', 'pipType', 'severity', 'startDate', 'endDate', 'impactStatement', 'performanceExpectations'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createPIP(tenantId, userId, params as any),
  },
  {
    name: 'create_skill_assessment',
    description:
      'Create a technical skill assessment for an employee. Records skill level, scores from multiple methods (self, manager, test, peer), and improvement plan. Skill levels: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT.',
    inputSchema: {
      type: 'object',
      properties: {
        targetUserId: { type: 'string', description: 'UUID of the employee being assessed (required)' },
        skillCategoryId: { type: 'string', description: 'UUID of the skill category (required)' },
        skillName: { type: 'string', description: 'Name of the specific skill (required)' },
        skillLevel: {
          type: 'string',
          description: 'Assessed skill level: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT (required)',
        },
        selfAssessment: { type: 'number', description: 'Self-assessment score 0-1' },
        managerAssessment: { type: 'number', description: 'Manager assessment score 0-1' },
        testScore: { type: 'number', description: 'Test/certification score 0-100' },
        finalScore: { type: 'number', description: 'Aggregated final score 0-1 (required)' },
        improvementPlan: { type: 'string', description: 'Recommended improvement plan' },
        certifications: {
          type: 'array',
          description: 'Relevant certifications',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              issuedBy: { type: 'string' },
              date: { type: 'string' },
            },
          },
        },
      },
      required: ['targetUserId', 'skillCategoryId', 'skillName', 'skillLevel', 'finalScore'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createSkillAssessment(tenantId, userId, params as any),
  },
  {
    name: 'create_project_milestone',
    description:
      'Create a project milestone optionally linked to a goal. Milestones track progress towards goal completion with planned dates, owners, and completion criteria.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Milestone title (required)' },
        description: { type: 'string', description: 'Milestone description' },
        plannedDate: { type: 'string', description: 'ISO date for planned completion (required)' },
        goalId: { type: 'string', description: 'UUID of the parent goal (if linked)' },
        teamId: { type: 'string', description: 'UUID of the owning team' },
        ownerId: { type: 'string', description: 'UUID of the milestone owner' },
        milestoneType: { type: 'string', description: 'Milestone type (e.g., deliverable, checkpoint, phase)' },
        completionCriteria: {
          type: 'array',
          description: 'Criteria for milestone completion',
          items: {
            type: 'object',
            properties: {
              criterion: { type: 'string' },
              weight: { type: 'number' },
            },
          },
        },
      },
      required: ['title', 'plannedDate'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createProjectMilestone(tenantId, userId, params as any),
  },

  // ── Domain-Specific Write Tools (V5) — Bio-Performance, Core, Culture ──

  {
    name: 'create_wellness_check_in',
    description:
      'Create a wellness check-in (pulse survey) capturing mood, energy, and stress scores for an employee. Score range: 1-10. Survey types: DAILY, WEEKLY, ADHOC.',
    inputSchema: {
      type: 'object',
      properties: {
        targetUserId: { type: 'string', description: 'UUID of the employee (required)' },
        moodScore: { type: 'number', description: 'Mood score 1-10 (required)' },
        energyScore: { type: 'number', description: 'Energy score 1-10' },
        stressScore: { type: 'number', description: 'Stress score 1-10 (higher = more stress)' },
        comment: { type: 'string', description: 'Optional freeform comment' },
        isAnonymous: { type: 'boolean', description: 'Whether the check-in is anonymous (default false)' },
        surveyType: { type: 'string', description: 'Survey type: DAILY, WEEKLY, ADHOC (default DAILY)' },
        surveyDate: { type: 'string', description: 'ISO date of the check-in (defaults to today)' },
      },
      required: ['targetUserId', 'moodScore'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createWellnessCheckIn(tenantId, userId, params as any),
  },
  {
    name: 'log_performance_anomaly',
    description:
      'Log a performance anomaly when metrics deviate significantly from baselines. Anomaly types: PRODUCTIVITY_DROP, QUALITY_DECLINE, ENGAGEMENT_SPIKE, BURNOUT_SIGNAL, STRESS_INDICATOR, ERGONOMIC_RISK. Severity: CRITICAL, HIGH, MEDIUM, LOW.',
    inputSchema: {
      type: 'object',
      properties: {
        targetUserId: { type: 'string', description: 'UUID of the employee (required)' },
        anomalyType: { type: 'string', description: 'Anomaly type (required)' },
        severity: { type: 'string', description: 'Severity: CRITICAL, HIGH, MEDIUM, LOW (required)' },
        metricName: { type: 'string', description: 'Name of the metric that deviated (required)' },
        expectedValue: { type: 'number', description: 'Expected baseline value' },
        actualValue: { type: 'number', description: 'Actual observed value' },
        deviationPercentage: { type: 'number', description: 'Deviation percentage from baseline' },
        zScore: { type: 'number', description: 'Z-score of the deviation' },
        baselinePeriodDays: { type: 'number', description: 'Days used for baseline calculation' },
        metadata: { type: 'object', description: 'Additional context data' },
      },
      required: ['targetUserId', 'anomalyType', 'severity', 'metricName'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      logPerformanceAnomaly(tenantId, userId, params as any),
  },
  {
    name: 'log_activity_event',
    description:
      'Log a work activity event (focus session, break, meeting, deep work, etc.). Event types: FOCUS_SESSION, MICRO_BREAK, DEEP_WORK, ERGONOMIC_ADJUSTMENT, SLEEP_LOG, CIRCADIAN_CHECK, EXERCISE, HYDRATION.',
    inputSchema: {
      type: 'object',
      properties: {
        targetUserId: { type: 'string', description: 'UUID of the employee (required)' },
        eventType: { type: 'string', description: 'Event type (required)' },
        eventSubtype: { type: 'string', description: 'Event subtype for granularity' },
        entityType: { type: 'string', description: 'Related entity type (goal, task, etc.)' },
        entityId: { type: 'string', description: 'Related entity UUID' },
        metadata: { type: 'object', description: 'Additional event data (duration, intensity, etc.)' },
      },
      required: ['targetUserId', 'eventType'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      logActivityEvent(tenantId, userId, params as any),
  },
  {
    name: 'log_sentiment_analysis',
    description:
      'Log a sentiment analysis result for communication content. Source types: FEEDBACK, REVIEW, GOAL_COMMENT, CHAT_MESSAGE, MEETING_NOTES, VOCAL_ANALYSIS. Sentiment labels: POSITIVE, NEGATIVE, NEUTRAL, MIXED.',
    inputSchema: {
      type: 'object',
      properties: {
        targetUserId: { type: 'string', description: 'UUID of the user analyzed (required)' },
        sourceType: { type: 'string', description: 'Content source type (required)' },
        sentimentScore: { type: 'number', description: 'Sentiment score -1.0 to 1.0 (required)' },
        sentimentLabel: { type: 'string', description: 'Label: POSITIVE, NEGATIVE, NEUTRAL, MIXED (required)' },
        confidence: { type: 'number', description: 'Confidence 0-1 (required)' },
        sourceId: { type: 'string', description: 'UUID of the source content' },
        sourceReference: { type: 'string', description: 'Reference label for the source' },
        contentSample: { type: 'string', description: 'Brief sample of analyzed content' },
        emotions: { type: 'object', description: 'Emotion breakdown (e.g., {joy: 0.7, frustration: 0.2})' },
      },
      required: ['targetUserId', 'sourceType', 'sentimentScore', 'sentimentLabel', 'confidence'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      logSentimentAnalysis(tenantId, userId, params as any),
  },
  {
    name: 'create_compensation_recommendation',
    description:
      'Create a compensation recommendation (salary change, bonus, equity grant). Created in DRAFT status for HR approval. Types: SALARY_INCREASE, BONUS, EQUITY_GRANT, MARKET_ADJUSTMENT, PROMOTION_ADJUSTMENT.',
    inputSchema: {
      type: 'object',
      properties: {
        employeeId: { type: 'string', description: 'UUID of the employee (required)' },
        type: { type: 'string', description: 'Compensation type (required)' },
        previousAmount: { type: 'number', description: 'Current compensation amount (required)' },
        newAmount: { type: 'number', description: 'Proposed new amount (required)' },
        effectiveDate: { type: 'string', description: 'ISO date for effective date (required)' },
        reason: { type: 'string', description: 'Reason for the change (required)' },
        currency: { type: 'string', description: 'Currency code (default USD)' },
        justification: { type: 'string', description: 'Detailed justification' },
        performanceRating: { type: 'number', description: 'Performance rating for context' },
        marketData: { type: 'object', description: 'Market comparison data' },
        equityAnalysis: { type: 'object', description: 'Pay equity analysis data' },
        reviewCycleId: { type: 'string', description: 'Linked review cycle UUID' },
      },
      required: ['employeeId', 'type', 'previousAmount', 'newAmount', 'effectiveDate', 'reason'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createCompensationRecommendation(tenantId, userId, params as any),
  },
  {
    name: 'create_promotion_recommendation',
    description:
      'Create a promotion recommendation for an employee. Created in NOMINATED status for review. Types: LEVEL_PROMOTION, ROLE_CHANGE, LATERAL_MOVE, TITLE_CHANGE.',
    inputSchema: {
      type: 'object',
      properties: {
        employeeId: { type: 'string', description: 'UUID of the employee (required)' },
        type: { type: 'string', description: 'Promotion type (default LEVEL_PROMOTION)' },
        previousLevel: { type: 'number', description: 'Current job level' },
        newLevel: { type: 'number', description: 'Proposed new level' },
        previousTitle: { type: 'string', description: 'Current title' },
        newTitle: { type: 'string', description: 'Proposed new title' },
        effectiveDate: { type: 'string', description: 'ISO date for effective date' },
        readinessScore: { type: 'number', description: 'Readiness score 0-1' },
        criteriaScores: { type: 'object', description: 'Scores per promotion criterion' },
        strengths: { type: 'array', description: 'Key strengths supporting promotion', items: { type: 'string' } },
        developmentAreas: { type: 'array', description: 'Areas still needing development', items: { type: 'string' } },
        justification: { type: 'string', description: 'Detailed justification' },
        reviewCycleId: { type: 'string', description: 'Linked review cycle UUID' },
      },
      required: ['employeeId'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createPromotionRecommendation(tenantId, userId, params as any),
  },
  {
    name: 'create_innovation_contribution',
    description:
      'Record an innovation contribution (idea, process improvement, experiment). Types: PROCESS_IMPROVEMENT, PRODUCT_IDEA, COST_SAVING, TECHNOLOGY_ADOPTION, CUSTOMER_INSIGHT.',
    inputSchema: {
      type: 'object',
      properties: {
        targetUserId: { type: 'string', description: 'UUID of the contributing employee (required)' },
        title: { type: 'string', description: 'Title of the innovation (required)' },
        description: { type: 'string', description: 'Detailed description (required)' },
        innovationType: { type: 'string', description: 'Innovation type (required)' },
        category: { type: 'string', description: 'Category for grouping' },
        expectedImpact: { type: 'string', description: 'Expected business impact' },
        impactMetrics: { type: 'object', description: 'Quantified impact metrics (e.g., {costSaving: 5000, timeReduction: 20})' },
      },
      required: ['targetUserId', 'title', 'description', 'innovationType'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createInnovationContribution(tenantId, userId, params as any),
  },
  {
    name: 'create_culture_diagnostic',
    description:
      'Create a culture diagnostic assessment measuring organizational culture dimensions (Competing Values Framework). All dimension scores are 0-100. Types: ANNUAL, QUARTERLY, PULSE, EVENT_DRIVEN.',
    inputSchema: {
      type: 'object',
      properties: {
        diagnosticType: { type: 'string', description: 'Diagnostic type: ANNUAL, QUARTERLY, PULSE, EVENT_DRIVEN (required)' },
        diagnosticDate: { type: 'string', description: 'ISO date (defaults to now)' },
        clanCulture: { type: 'number', description: 'Clan (collaboration) score 0-100 (required)' },
        adhocracyCulture: { type: 'number', description: 'Adhocracy (innovation) score 0-100 (required)' },
        marketCulture: { type: 'number', description: 'Market (competition) score 0-100 (required)' },
        hierarchyCulture: { type: 'number', description: 'Hierarchy (control) score 0-100 (required)' },
        psychologicalSafety: { type: 'number', description: 'Psychological safety score 0-100 (required)' },
        trustLevel: { type: 'number', description: 'Trust score 0-100 (required)' },
        autonomy: { type: 'number', description: 'Autonomy score 0-100 (required)' },
        transparency: { type: 'number', description: 'Transparency score 0-100 (required)' },
        accountability: { type: 'number', description: 'Accountability score 0-100 (required)' },
        innovation: { type: 'number', description: 'Innovation score 0-100 (required)' },
        customerFocus: { type: 'number', description: 'Customer focus score 0-100 (required)' },
        resultsOrientation: { type: 'number', description: 'Results orientation score 0-100 (required)' },
        valuesAlignment: { type: 'number', description: 'Values alignment score 0-100 (required)' },
        missionClarity: { type: 'number', description: 'Mission clarity score 0-100 (required)' },
        visionAlignment: { type: 'number', description: 'Vision alignment score 0-100 (required)' },
        desiredCulture: { type: 'object', description: 'Target culture profile' },
      },
      required: [
        'diagnosticType', 'clanCulture', 'adhocracyCulture', 'marketCulture', 'hierarchyCulture',
        'psychologicalSafety', 'trustLevel', 'autonomy', 'transparency', 'accountability',
        'innovation', 'customerFocus', 'resultsOrientation', 'valuesAlignment', 'missionClarity', 'visionAlignment',
      ],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createCultureDiagnostic(tenantId, userId, params as any),
  },
  {
    name: 'create_performance_alert',
    description:
      'Create a performance alert for individuals, teams, or departments. Alert types: UNDERPERFORMANCE, BURNOUT_RISK, CONFLICT_DETECTED, SECURITY_THREAT, LICENSE_THRESHOLD, COMPLIANCE_RISK, ENGAGEMENT_DROP. Categories: PERFORMANCE, WELLBEING, SECURITY, COMPLIANCE, ENGAGEMENT.',
    inputSchema: {
      type: 'object',
      properties: {
        alertType: { type: 'string', description: 'Alert type (required)' },
        alertCategory: { type: 'string', description: 'Category: PERFORMANCE, WELLBEING, SECURITY, COMPLIANCE, ENGAGEMENT (required)' },
        severity: { type: 'string', description: 'Severity: CRITICAL, HIGH, MEDIUM, LOW (required)' },
        title: { type: 'string', description: 'Alert title (required)' },
        description: { type: 'string', description: 'Detailed description' },
        targetUserId: { type: 'string', description: 'UUID of affected user' },
        targetTeamId: { type: 'string', description: 'UUID of affected team' },
        targetDepartmentId: { type: 'string', description: 'UUID of affected department' },
        actionRequired: { type: 'string', description: 'Recommended action' },
        actionUrl: { type: 'string', description: 'URL for the action' },
        priority: { type: 'number', description: 'Priority number (0 = lowest)' },
        expiresAt: { type: 'string', description: 'ISO date when alert expires' },
        notifyUser: { type: 'boolean', description: 'Notify affected user (default true)' },
        notifyManager: { type: 'boolean', description: 'Notify manager (default false)' },
        notifyHr: { type: 'boolean', description: 'Notify HR (default false)' },
        metadata: { type: 'object', description: 'Additional alert data' },
      },
      required: ['alertType', 'alertCategory', 'severity', 'title'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createPerformanceAlert(tenantId, userId, params as any),
  },
  {
    name: 'create_feedback_nomination',
    description:
      'Nominate a reviewer to provide 360° feedback for an employee. Relationships: PEER, MANAGER, DIRECT_REPORT, CROSS_FUNCTIONAL, EXTERNAL.',
    inputSchema: {
      type: 'object',
      properties: {
        cycleId: { type: 'string', description: 'UUID of the feedback cycle (required)' },
        subjectId: { type: 'string', description: 'UUID of the person being reviewed (required)' },
        reviewerId: { type: 'string', description: 'UUID of the nominated reviewer (required)' },
        relationship: { type: 'string', description: 'Relationship: PEER, MANAGER, DIRECT_REPORT, CROSS_FUNCTIONAL, EXTERNAL (required)' },
        nominationReason: { type: 'string', description: 'Reason for this nomination' },
      },
      required: ['cycleId', 'subjectId', 'reviewerId', 'relationship'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createFeedbackNomination(tenantId, userId, params as any),
  },

  // ── Domain-Specific Write Tools (V6) — Liquid-Workforce, Governance, Remaining ──

  {
    name: 'create_career_path',
    description:
      'Create a career path definition with roles, progression levels, branching options, and skill requirements. Used for career simulation and trajectory planning.',
    inputSchema: {
      type: 'object',
      properties: {
        pathName: { type: 'string', description: 'Name of the career path (required)' },
        pathDescription: { type: 'string', description: 'Detailed description of the path (required)' },
        startingRole: { type: 'string', description: 'Entry-level role for this path (required)' },
        department: { type: 'string', description: 'Department this path belongs to' },
        roles: {
          type: 'array', description: 'Roles in this path',
          items: { type: 'object', properties: { title: { type: 'string' }, level: { type: 'number' }, description: { type: 'string' } } },
        },
        levels: {
          type: 'array', description: 'Progression levels',
          items: { type: 'object', properties: { level: { type: 'number' }, title: { type: 'string' }, requirements: { type: 'array', items: { type: 'string' } } } },
        },
        branches: {
          type: 'array', description: 'Branching options',
          items: { type: 'object', properties: { name: { type: 'string' }, fromRole: { type: 'string' }, toRole: { type: 'string' } } },
        },
        skillRequirements: { type: 'object', description: 'Skill requirements per level' },
      },
      required: ['pathName', 'pathDescription', 'startingRole'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createCareerPath(tenantId, userId, params as any),
  },
  {
    name: 'assign_team_member',
    description:
      'Assign an employee to a team with role, allocation percentage, and time boundaries. Supports gig assignments, cross-functional teams, and project rotations.',
    inputSchema: {
      type: 'object',
      properties: {
        teamId: { type: 'string', description: 'UUID of the team (required)' },
        targetUserId: { type: 'string', description: 'UUID of the employee to assign (required)' },
        role: { type: 'string', description: 'Team role: MEMBER, LEAD, CONTRIBUTOR, ADVISOR (default MEMBER)' },
        allocation: { type: 'number', description: 'Allocation percentage 0-100 (default 100)' },
        startDate: { type: 'string', description: 'ISO date for assignment start (defaults to now)' },
        endDate: { type: 'string', description: 'ISO date for assignment end (null for permanent)' },
        isPrimary: { type: 'boolean', description: 'Whether this is the primary team (default false)' },
      },
      required: ['teamId', 'targetUserId'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      assignTeamMember(tenantId, userId, params as any),
  },
  {
    name: 'create_calendar_event',
    description:
      'Create a calendar event (leave request, team activity, deadline reminder, wellness check). Types: PERSONAL, GOAL_DEADLINE, REVIEW, TEAM_EVENT, ONE_ON_ONE, LEAVE, WELLNESS.',
    inputSchema: {
      type: 'object',
      properties: {
        targetUserId: { type: 'string', description: 'UUID of the user this event is for (required)' },
        title: { type: 'string', description: 'Event title (required)' },
        eventDate: { type: 'string', description: 'ISO date of the event (required)' },
        description: { type: 'string', description: 'Event description' },
        startTime: { type: 'string', description: 'ISO datetime for start time' },
        endTime: { type: 'string', description: 'ISO datetime for end time' },
        allDay: { type: 'boolean', description: 'Whether this is an all-day event (default false)' },
        type: { type: 'string', description: 'Event type (default PERSONAL)' },
        color: { type: 'string', description: 'Display color hex code' },
        goalId: { type: 'string', description: 'Linked goal UUID' },
        reviewCycleId: { type: 'string', description: 'Linked review cycle UUID' },
        reminderMinutes: { type: 'array', description: 'Reminder times in minutes before event', items: { type: 'number' } },
        metadata: { type: 'object', description: 'Additional event data' },
      },
      required: ['targetUserId', 'title', 'eventDate'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createCalendarEvent(tenantId, userId, params as any),
  },
  {
    name: 'create_board_announcement',
    description:
      'Create a notification board announcement visible to affected users. Item types: ACHIEVEMENT, MILESTONE, ONBOARDING, RECOGNITION, TEAM_UPDATE, LEGACY_KNOWLEDGE. Categories: PERFORMANCE, CULTURE, LEARNING, SOCIAL, GOVERNANCE.',
    inputSchema: {
      type: 'object',
      properties: {
        itemType: { type: 'string', description: 'Item type (required)' },
        category: { type: 'string', description: 'Category (required)' },
        title: { type: 'string', description: 'Announcement title (required)' },
        message: { type: 'string', description: 'Announcement body (required)' },
        sourceType: { type: 'string', description: 'Source: AI_AGENT, SYSTEM, USER (required)' },
        priority: { type: 'string', description: 'Priority: low, normal, high, urgent (default normal)' },
        details: { type: 'object', description: 'Additional structured details' },
        targetType: { type: 'string', description: 'Target type: USER, TEAM, DEPARTMENT' },
        targetId: { type: 'string', description: 'Target UUID' },
        affectedUserIds: { type: 'array', description: 'UUIDs of affected users', items: { type: 'string' } },
        actionUrl: { type: 'string', description: 'CTA URL' },
        actionLabel: { type: 'string', description: 'CTA button label' },
        isDismissible: { type: 'boolean', description: 'Whether users can dismiss (default true)' },
        expiresAt: { type: 'string', description: 'ISO date when announcement expires' },
      },
      required: ['itemType', 'category', 'title', 'message', 'sourceType'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createBoardAnnouncement(tenantId, userId, params as any),
  },
  {
    name: 'create_development_checkpoint',
    description:
      'Create a development checkpoint to assess progress on a development plan at a point in time. Types: WEEKLY_CHECK, MONTHLY_REVIEW, QUARTERLY_ASSESSMENT, MILESTONE_CHECK, ONBOARDING_GATE.',
    inputSchema: {
      type: 'object',
      properties: {
        developmentPlanId: { type: 'string', description: 'UUID of the parent development plan (required)' },
        targetUserId: { type: 'string', description: 'UUID of the employee (required)' },
        checkpointName: { type: 'string', description: 'Name of this checkpoint (required)' },
        checkpointDate: { type: 'string', description: 'ISO date for the checkpoint (required)' },
        checkpointType: { type: 'string', description: 'Checkpoint type (required)' },
        progressReview: { type: 'string', description: 'Progress review narrative' },
        skillsAcquired: { type: 'array', description: 'Skills acquired since last checkpoint', items: { type: 'string' } },
        competenciesImproved: { type: 'object', description: 'Competency improvements with scores' },
      },
      required: ['developmentPlanId', 'targetUserId', 'checkpointName', 'checkpointDate', 'checkpointType'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createDevelopmentCheckpoint(tenantId, userId, params as any),
  },
  {
    name: 'log_skill_progress',
    description:
      'Log a skill score change over time for an existing skill assessment. Tracks progression from previous to new score with reasons and evidence.',
    inputSchema: {
      type: 'object',
      properties: {
        assessmentId: { type: 'string', description: 'UUID of the skill assessment (required)' },
        previousScore: { type: 'number', description: 'Previous score 0-1 (required)' },
        newScore: { type: 'number', description: 'New score 0-1 (required)' },
        changeReason: { type: 'string', description: 'Reason for the score change' },
        evidenceId: { type: 'string', description: 'UUID of supporting evidence' },
        notes: { type: 'string', description: 'Additional notes' },
      },
      required: ['assessmentId', 'previousScore', 'newScore'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      logSkillProgress(tenantId, userId, params as any),
  },
  {
    name: 'create_deadline_alert',
    description:
      'Create a deadline alert for an approaching or overdue goal, task, or review. Alert levels: ON_TRACK, AT_RISK, CRITICAL, OVERDUE.',
    inputSchema: {
      type: 'object',
      properties: {
        targetUserId: { type: 'string', description: 'UUID of the employee (required)' },
        entityType: { type: 'string', description: 'Entity type: GOAL, TASK, REVIEW, PIP, DEVELOPMENT_PLAN (required)' },
        entityId: { type: 'string', description: 'UUID of the entity (required)' },
        entityTitle: { type: 'string', description: 'Title of the entity (required)' },
        deadline: { type: 'string', description: 'ISO date of the deadline (required)' },
        alertLevel: { type: 'string', description: 'Alert level: ON_TRACK, AT_RISK, CRITICAL, OVERDUE (required)' },
        currentProgress: { type: 'number', description: 'Current progress percentage 0-100' },
        completionProbability: { type: 'number', description: 'Estimated completion probability 0-100' },
        requiredDailyProgress: { type: 'number', description: 'Required daily progress to meet deadline' },
      },
      required: ['targetUserId', 'entityType', 'entityId', 'entityTitle', 'deadline', 'alertLevel'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createDeadlineAlert(tenantId, userId, params as any),
  },
  {
    name: 'create_compliance_policy',
    description:
      'Create or draft a compliance policy with rules, violation definitions, and enforcement parameters. Policy types: ATTENDANCE, DATA_PRIVACY, SAFETY, CONDUCT, FINANCIAL, ANTI_HARASSMENT.',
    inputSchema: {
      type: 'object',
      properties: {
        policyName: { type: 'string', description: 'Policy name (required)' },
        policyCode: { type: 'string', description: 'Unique policy code (required)' },
        policyType: { type: 'string', description: 'Policy type (required)' },
        applicableScope: { type: 'string', description: 'Scope: ORGANIZATION, DEPARTMENT, TEAM, ROLE (required)' },
        description: { type: 'string', description: 'Policy description' },
        version: { type: 'string', description: 'Version string (default 1.0)' },
        complianceRules: {
          type: 'array', description: 'Compliance rules',
          items: { type: 'object', properties: { rule: { type: 'string' }, severity: { type: 'string' } } },
        },
        violationDefinitions: {
          type: 'array', description: 'Violation definitions',
          items: { type: 'object', properties: { type: { type: 'string' }, description: { type: 'string' }, severity: { type: 'string' } } },
        },
        enforcementLevel: { type: 'string', description: 'Enforcement: ADVISORY, MANDATORY, STRICT (default ADVISORY)' },
        gracePeriodDays: { type: 'number', description: 'Grace period in days (default 0)' },
        effectiveDate: { type: 'string', description: 'ISO date for policy effective date' },
        expirationDate: { type: 'string', description: 'ISO date for policy expiration' },
      },
      required: ['policyName', 'policyCode', 'policyType', 'applicableScope'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createCompliancePolicy(tenantId, userId, params as any),
  },
  {
    name: 'create_agent_task',
    description:
      'Create an autonomous background task for agent execution. Tasks track multi-step plans with progress. Agent types correspond to the executing specialist.',
    inputSchema: {
      type: 'object',
      properties: {
        agentType: { type: 'string', description: 'Agent type that will execute this task (required)' },
        title: { type: 'string', description: 'Task title (required)' },
        goal: { type: 'string', description: 'Task goal description (required)' },
        description: { type: 'string', description: 'Detailed task description' },
        plan: {
          type: 'array', description: 'Execution plan steps',
          items: { type: 'object', properties: { step: { type: 'number' }, action: { type: 'string' }, status: { type: 'string' } } },
        },
        totalSteps: { type: 'number', description: 'Total planned steps (auto-computed from plan)' },
        isProactive: { type: 'boolean', description: 'Whether this task was proactively created (default false)' },
        parentTaskId: { type: 'string', description: 'UUID of parent task (for sub-tasks)' },
      },
      required: ['agentType', 'title', 'goal'],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createAgentTask(tenantId, userId, params as any),
  },
  {
    name: 'create_performance_benchmark',
    description:
      'Create a statistical performance benchmark with percentile distributions. Used for market-value comparisons and performance norming. Benchmark types: ROLE_BASED, LEVEL_BASED, DEPARTMENT_BASED, INDUSTRY.',
    inputSchema: {
      type: 'object',
      properties: {
        benchmarkName: { type: 'string', description: 'Benchmark name (required)' },
        benchmarkType: { type: 'string', description: 'Type: ROLE_BASED, LEVEL_BASED, DEPARTMENT_BASED, INDUSTRY (required)' },
        metricName: { type: 'string', description: 'Metric being benchmarked (required)' },
        metricCategory: { type: 'string', description: 'Metric category (required)' },
        percentile25: { type: 'number', description: '25th percentile value (required)' },
        percentile50: { type: 'number', description: '50th percentile / median value (required)' },
        percentile75: { type: 'number', description: '75th percentile value (required)' },
        percentile90: { type: 'number', description: '90th percentile value (required)' },
        mean: { type: 'number', description: 'Mean value (required)' },
        standardDeviation: { type: 'number', description: 'Standard deviation (required)' },
        minValue: { type: 'number', description: 'Minimum observed value (required)' },
        maxValue: { type: 'number', description: 'Maximum observed value (required)' },
        sampleSize: { type: 'number', description: 'Number of individuals in sample (required)' },
        dataPoints: { type: 'number', description: 'Total data points used (required)' },
        validFrom: { type: 'string', description: 'ISO date benchmark is valid from (required)' },
        validUntil: { type: 'string', description: 'ISO date benchmark expires (required)' },
        targetRole: { type: 'string', description: 'Target role for this benchmark' },
        targetDepartment: { type: 'string', description: 'Target department UUID' },
        targetLevel: { type: 'number', description: 'Target job level' },
        modelVersion: { type: 'string', description: 'Computation model version (default 1.0)' },
        computationMethod: { type: 'string', description: 'Method: percentile_rank, z_score, etc. (default percentile_rank)' },
      },
      required: [
        'benchmarkName', 'benchmarkType', 'metricName', 'metricCategory',
        'percentile25', 'percentile50', 'percentile75', 'percentile90',
        'mean', 'standardDeviation', 'minValue', 'maxValue',
        'sampleSize', 'dataPoints', 'validFrom', 'validUntil',
      ],
    },
    impactLevel: 'high_write',
    requiresApproval: true,
    execute: async (tenantId, userId, params) =>
      createPerformanceBenchmark(tenantId, userId, params as any),
  },
];

// ── Delegation Tool (Inter-Agent Communication) ────────────

/**
 * Special tool that enables agent-to-agent delegation.
 * When executed, routes the sub-goal to another specialist agent via the orchestrator.
 * This is what makes the system truly multi-agent — agents can collaborate.
 *
 * NOTE: The actual execution is intercepted by the agentic engine,
 * which routes through the orchestrator instead of calling this execute() directly.
 */
const DELEGATION_TOOL: ToolDefinition = {
  name: 'delegate_to_agent',
  description:
    'Delegate a sub-task to a specialized agent. Use this when the current task requires expertise from another domain. ' +
    'Available agents: performance, goal_intelligence, coaching, workforce_intel, burnout_interceptor, ' +
    'review_drafter, compensation_promotion, performance_signal, one_on_one_advisor, security, report, ' +
    'career, onboarding, notification, license, strategic_alignment, talent_marketplace, conflict_resolution, ' +
    'governance, nlp_query, neuro_focus, circadian_sync, micro_break, cortisol_monitor, ergonomics, ' +
    'sleep_optimizer, skill_gap_forecaster, knowledge_broker, culture_weaver, bias_neutralizer, ' +
    'empathy_coach, inclusion_monitor, audit_trail, data_privacy, labor_compliance, leave_optimizer.',
  inputSchema: {
    type: 'object',
    properties: {
      agentType: {
        type: 'string',
        description: 'The agent type to delegate to (e.g., "burnout_interceptor", "goal_intelligence")',
      },
      subGoal: {
        type: 'string',
        description: 'The specific sub-task or question for the target agent',
      },
      context: {
        type: 'string',
        description: 'Optional context from previous steps to pass to the target agent',
      },
    },
    required: ['agentType', 'subGoal'],
  },
  impactLevel: 'low_write',
  requiresApproval: false,
  execute: async (_tenantId, _userId, params) => {
    // This is a placeholder — the agentic engine intercepts 'delegate_to_agent'
    // and routes through the orchestrator instead.
    return {
      success: false,
      data: null,
      error: 'delegate_to_agent must be executed through the agentic engine, not directly',
    };
  },
};

// ── Tool Registry Class ────────────────────────────────────

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  constructor() {
    [...READ_TOOLS, ...WRITE_TOOLS, DELEGATION_TOOL].forEach((t) =>
      this.tools.set(t.name, t),
    );
    logger.info(`Tool Registry initialized with ${this.tools.size} tools (incl. delegation)`);
  }

  /**
   * Get tools available to a given role category (RBAC filtering).
   */
  getToolsForRole(roleCategory: RoleCategory): ToolDefinition[] {
    // Employee-accessible write tools (self-service actions for personal wellness, learning, and contributions)
    const EMPLOYEE_WRITE_TOOLS = new Set([
      'create_evidence',
      'log_development_activity',
      'create_skill_assessment',
      'create_wellness_check_in',    // Self-report mood/energy/stress
      'log_activity_event',          // Log own activity events (breaks, focus sessions)
      'create_innovation_contribution', // Submit own innovation ideas
      'create_calendar_event',       // Create own calendar events
      'log_skill_progress',          // Track own skill progression
    ]);

    return Array.from(this.tools.values()).filter((t) => {
      // Employees: read tools + specific self-service write tools
      if (roleCategory === 'employee' && t.impactLevel !== 'read') {
        return EMPLOYEE_WRITE_TOOLS.has(t.name);
      }
      // Managers: read + low_write + high_write (but high_write requires approval)
      // Admins & super_admins: everything
      return true;
    });
  }

  /**
   * Convert tool definitions to Anthropic-compatible tool schemas for LLM.
   */
  getToolSchemas(tools: ToolDefinition[]): Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }> {
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
    }));
  }

  /**
   * Look up a specific tool by name.
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tool names.
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get count of registered tools.
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * Validate tool input params against the tool's input schema.
   * Lightweight validation — checks required fields and basic types.
   * Returns null if valid, or an error message if invalid.
   */
  validateToolInput(toolName: string, params: Record<string, unknown>): string | null {
    const tool = this.tools.get(toolName);
    if (!tool) return `Unknown tool: ${toolName}`;

    const schema = tool.inputSchema;
    if (!schema) return null; // No schema = no validation

    // Check required fields
    const required = schema.required as string[] | undefined;
    if (required) {
      for (const field of required) {
        if (params[field] === undefined || params[field] === null) {
          return `Missing required parameter: "${field}" for tool "${toolName}"`;
        }
      }
    }

    // Basic type checking on provided properties
    const properties = schema.properties as Record<string, { type?: string }> | undefined;
    if (properties) {
      for (const [key, value] of Object.entries(params)) {
        const propSchema = properties[key];
        if (!propSchema) continue; // Extra params are ok (flexible)

        if (propSchema.type === 'string' && typeof value !== 'string') {
          return `Parameter "${key}" for tool "${toolName}" must be a string, got ${typeof value}`;
        }
        if (propSchema.type === 'number' && typeof value !== 'number') {
          return `Parameter "${key}" for tool "${toolName}" must be a number, got ${typeof value}`;
        }
        if (propSchema.type === 'boolean' && typeof value !== 'boolean') {
          return `Parameter "${key}" for tool "${toolName}" must be a boolean, got ${typeof value}`;
        }
      }
    }

    return null; // Valid
  }
}

/** Singleton tool registry instance */
export const toolRegistry = new ToolRegistry();
