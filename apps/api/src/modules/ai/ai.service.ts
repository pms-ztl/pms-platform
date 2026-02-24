/**
 * AI Service — orchestrates between the controller and the agent framework.
 */

import { prisma } from '@pms/database';

import { logger, auditLogger } from '../../utils/logger';
import { DAYS } from '../../utils/constants';
import { agentOrchestrator } from './orchestrator';
import { agentMemory } from './agent-memory';
import { llmClient } from './llm-client';
import { agenticEngine } from './agentic-engine';
import type { AgentResponse } from './base-agent';

// ── Types ──────────────────────────────────────────────────

export interface ChatInput {
  message: string;
  agentType?: string;
  conversationId?: string;
}

export interface InsightFilters {
  agentType?: string;
  insightType?: string;
  priority?: string;
  isRead?: boolean;
  isDismissed?: boolean;
  limit?: number;
  page?: number;
}

// ── Service ────────────────────────────────────────────────

class AIService {
  /**
   * Send a message to the AI — routes to appropriate agent.
   */
  async chat(
    tenantId: string,
    userId: string,
    input: ChatInput,
  ): Promise<AgentResponse> {
    logger.info('AI chat request', {
      tenantId,
      userId,
      agentType: input.agentType,
      hasConversation: !!input.conversationId,
    });

    // Verify conversation belongs to this user/tenant if provided
    let validConversationId = input.conversationId;
    if (input.conversationId) {
      const convo = await prisma.agentConversation.findFirst({
        where: {
          id: input.conversationId,
          tenantId,
          userId,
          status: 'active',
        },
      });
      if (!convo) {
        // Conversation not found — start a fresh one instead of failing
        logger.warn('Conversation not found, starting new conversation', {
          conversationId: input.conversationId,
          tenantId,
          userId,
        });
        validConversationId = undefined;
      }
    }

    const response = await agentOrchestrator.routeMessage(
      tenantId,
      userId,
      input.message,
      input.agentType,
      validConversationId,
    );

    return response;
  }

  /**
   * List conversations for a user.
   */
  async getConversations(
    tenantId: string,
    userId: string,
    options: { page?: number; limit?: number; agentType?: string } = {},
  ) {
    return agentMemory.listConversations(tenantId, userId, options);
  }

  /**
   * Get a single conversation with all messages.
   */
  async getConversation(
    tenantId: string,
    userId: string,
    conversationId: string,
  ) {
    const convo = await agentMemory.getConversation(conversationId, tenantId);
    if (!convo || convo.userId !== userId) {
      return null;
    }
    return convo;
  }

  /**
   * Archive a conversation.
   */
  async archiveConversation(
    tenantId: string,
    userId: string,
    conversationId: string,
  ): Promise<void> {
    // Verify ownership
    const convo = await prisma.agentConversation.findFirst({
      where: { id: conversationId, tenantId, userId },
    });
    if (!convo) throw new Error('Conversation not found');

    await agentMemory.archiveConversation(conversationId, tenantId);
  }

  /**
   * Rename a conversation.
   */
  async renameConversation(
    tenantId: string,
    userId: string,
    conversationId: string,
    title: string,
  ): Promise<void> {
    const convo = await prisma.agentConversation.findFirst({
      where: { id: conversationId, tenantId, userId },
    });
    if (!convo) throw new Error('Conversation not found');

    await prisma.agentConversation.update({
      where: { id: conversationId },
      data: { title },
    });
  }

  /**
   * Get AI insight cards for a user.
   */
  async getInsights(
    tenantId: string,
    userId: string,
    filters: InsightFilters = {},
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId,
      OR: [{ userId }, { userId: null }], // User-specific + tenant-wide
      isDismissed: filters.isDismissed ?? false,
    };

    if (filters.agentType) where.agentType = filters.agentType;
    if (filters.insightType) where.insightType = filters.insightType;
    if (filters.priority) where.priority = filters.priority;
    if (filters.isRead !== undefined) where.isRead = filters.isRead;

    const [insights, total] = await Promise.all([
      prisma.aIInsightCard.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.aIInsightCard.count({ where }),
    ]);

    return {
      data: insights,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Mark an insight as read.
   */
  async markInsightRead(
    tenantId: string,
    userId: string,
    insightId: string,
  ): Promise<void> {
    await prisma.aIInsightCard.updateMany({
      where: {
        id: insightId,
        tenantId,
        OR: [{ userId }, { userId: null }],
      },
      data: { isRead: true },
    });
  }

  /**
   * Dismiss an insight.
   */
  async dismissInsight(
    tenantId: string,
    userId: string,
    insightId: string,
  ): Promise<void> {
    await prisma.aIInsightCard.updateMany({
      where: {
        id: insightId,
        tenantId,
        OR: [{ userId }, { userId: null }],
      },
      data: { isDismissed: true },
    });
  }

  /**
   * Generate an AI-powered daily summary.
   */
  async getInsightsSummary(tenantId: string, userId: string): Promise<string> {
    // Get unread insights
    const unread = await prisma.aIInsightCard.findMany({
      where: {
        tenantId,
        OR: [{ userId }, { userId: null }],
        isRead: false,
        isDismissed: false,
      },
      orderBy: { priority: 'desc' },
      take: 20,
    });

    if (unread.length === 0) {
      return 'No new insights. Everything looks good! ✅';
    }

    // Use LLM to summarize
    try {
      const summaryData = unread.map((i) => ({
        type: i.insightType,
        priority: i.priority,
        title: i.title,
        description: i.description,
      }));

      const response = await llmClient.generateText(
        `Summarize these ${unread.length} AI insights into a brief daily digest (max 200 words):\n\n${JSON.stringify(summaryData, null, 2)}`,
        { maxTokens: 512, temperature: 0.3, tenantId },
      );

      return response.content;
    } catch {
      // Fallback to simple summary
      const critical = unread.filter((i) => i.priority === 'critical' || i.priority === 'high');
      return `You have ${unread.length} unread insights${critical.length > 0 ? ` (${critical.length} high priority)` : ''}. Check your AI Insights for details.`;
    }
  }

  /**
   * AI-enhanced Excel analysis.
   */
  async analyzeExcel(
    tenantId: string,
    userId: string,
    data: {
      rows: Record<string, unknown>[];
      errors: Array<{ row: number; field: string; message: string }>;
      warnings?: Array<{ row: number; field: string; message: string; severity: string }>;
      suggestions?: Array<{ row: number; field: string; currentValue: string; suggestedValue: string; reason: string }>;
    },
  ) {
    const { ExcelValidationAgent } = await import('./agents/excel-validation.agent');
    const agent = new ExcelValidationAgent();
    return agent.analyzeExcelData(tenantId, userId, data.rows, data.errors, data.warnings ?? [], data.suggestions ?? []);
  }

  /**
   * Generate an AI report.
   */
  async generateReport(
    tenantId: string,
    userId: string,
    reportType: string,
    params?: Record<string, unknown>,
  ) {
    const prompt = `Generate a ${reportType} report.${params ? ` Parameters: ${JSON.stringify(params)}` : ''}`;
    return agentOrchestrator.routeMessage(tenantId, userId, prompt, 'report');
  }

  /**
   * Get AI usage stats for a tenant.
   */
  async getUsageStats(tenantId: string) {
    const thirtyDaysAgo = new Date(Date.now() - DAYS(30));

    const [conversations, messages, insights] = await Promise.all([
      prisma.agentConversation.count({
        where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.agentMessage.count({
        where: {
          conversation: { tenantId },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.aIInsightCard.count({
        where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    // Aggregate token/cost data from message metadata
    const recentMessages = await prisma.agentMessage.findMany({
      where: {
        conversation: { tenantId },
        role: 'assistant',
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { metadata: true },
    });

    let totalTokens = 0;
    let totalCostCents = 0;

    for (const msg of recentMessages) {
      const meta = msg.metadata as Record<string, unknown> | null;
      if (meta) {
        totalTokens += ((meta.inputTokens as number) ?? 0) + ((meta.outputTokens as number) ?? 0);
        totalCostCents += (meta.costCents as number) ?? 0;
      }
    }

    return {
      period: '30 days',
      conversations,
      messages,
      insights,
      totalTokens,
      totalCostCents: Math.round(totalCostCents * 100) / 100,
      averageTokensPerMessage: messages > 0 ? Math.round(totalTokens / messages) : 0,
    };
  }
  // ── Agentic Task Methods ─────────────────────────────────

  /**
   * List agentic tasks for a user.
   */
  async getTasks(
    tenantId: string,
    userId: string,
    options: { status?: string; page?: number; limit?: number } = {},
  ) {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId, userId };
    if (options.status) where.status = options.status;

    const [tasks, total] = await Promise.all([
      prisma.agentTask.findMany({
        where,
        include: {
          actions: {
            orderBy: { stepIndex: 'asc' },
            select: {
              id: true,
              stepIndex: true,
              toolName: true,
              status: true,
              impactLevel: true,
              requiresApproval: true,
              reasoning: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.agentTask.count({ where }),
    ]);

    return {
      data: tasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single task with full action details.
   */
  async getTask(tenantId: string, userId: string, taskId: string) {
    const task = await prisma.agentTask.findFirst({
      where: { id: taskId, tenantId, userId },
      include: {
        actions: {
          orderBy: { stepIndex: 'asc' },
        },
      },
    });

    return task;
  }

  /**
   * Cancel a running task.
   */
  async cancelTask(tenantId: string, userId: string, taskId: string): Promise<void> {
    const task = await prisma.agentTask.findFirst({
      where: { id: taskId, tenantId, userId },
    });

    if (!task) throw new Error('Task not found');
    if (['completed', 'failed', 'cancelled'].includes(task.status)) {
      throw new Error(`Cannot cancel task with status: ${task.status}`);
    }

    await agenticEngine.cancelTask(taskId);

    auditLogger(
      'AI_TASK_CANCELLED',
      userId,
      tenantId,
      'agent_task',
      taskId,
      { previousStatus: task.status },
    );
  }

  /**
   * Get all pending approval actions for a user.
   */
  async getPendingApprovals(tenantId: string, userId: string) {
    const actions = await prisma.agentAction.findMany({
      where: {
        status: 'awaiting_approval',
        task: { tenantId, userId },
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            agentType: true,
            goal: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return actions;
  }

  /**
   * Approve a pending action and resume task execution.
   */
  async approveAction(tenantId: string, userId: string, actionId: string) {
    // Verify the action belongs to this user's tenant
    const action = await prisma.agentAction.findFirst({
      where: {
        id: actionId,
        status: 'awaiting_approval',
        task: { tenantId, userId },
      },
    });

    if (!action) throw new Error('Action not found or not awaiting approval');

    return agenticEngine.approveAction(actionId, userId);
  }

  /**
   * Reject a pending action with reason.
   */
  async rejectAction(tenantId: string, userId: string, actionId: string, reason: string) {
    const action = await prisma.agentAction.findFirst({
      where: {
        id: actionId,
        status: 'awaiting_approval',
        task: { tenantId, userId },
      },
    });

    if (!action) throw new Error('Action not found or not awaiting approval');

    return agenticEngine.rejectAction(actionId, reason);
  }

  // ── Coordinated Multi-Agent Chat ─────────────────────────

  /**
   * Coordinate a multi-agent task across multiple specialists.
   */
  async coordinateChat(tenantId: string, userId: string, input: {
    message: string;
    agentTypes: string[];
    conversationId?: string;
  }) {
    const result = await agentOrchestrator.coordinateMessage(
      tenantId,
      userId,
      input.message,
      input.agentTypes,
      input.conversationId,
    );

    return result;
  }

  // ── Active Agent Status ──────────────────────────────────

  /**
   * Get currently executing agent tasks for live activity feed.
   */
  async getActiveAgents(tenantId: string) {
    const activeTasks = await prisma.agentTask.findMany({
      where: {
        tenantId,
        status: { in: ['planning', 'executing', 'awaiting_approval'] },
      },
      select: {
        id: true,
        agentType: true,
        title: true,
        status: true,
        currentStep: true,
        totalSteps: true,
        startedAt: true,
        isProactive: true,
        parentTaskId: true,
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    return activeTasks;
  }
}

export const aiService = new AIService();
