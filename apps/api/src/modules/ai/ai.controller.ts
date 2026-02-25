/**
 * AI Controller — handles HTTP requests for AI endpoints.
 */

import type { Response, NextFunction } from 'express';
import { z } from 'zod';

import type { AuthenticatedRequest } from '../../types';
import { ValidationError } from '../../utils/errors';
import { aiService } from './ai.service';

// ── Zod Schemas ────────────────────────────────────────────

const chatSchema = z.object({
  message: z.string().min(1).max(5000),
  agentType: z.string().optional(),
  conversationId: z.string().uuid().optional(),
});

const reportSchema = z.object({
  reportType: z.string().min(1),
  params: z.record(z.unknown()).optional(),
});

const excelAnalyzeSchema = z.object({
  rows: z.array(z.record(z.unknown())),
  errors: z.array(
    z.object({
      row: z.number(),
      field: z.string(),
      message: z.string(),
    }),
  ),
});

// ── Controller ─────────────────────────────────────────────

class AIController {
  /**
   * POST /ai/chat — send a message to AI
   */
  async chat(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = chatSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid chat input', { errors: parsed.error.format() });
      }

      const { message, agentType, conversationId } = parsed.data;
      const response = await aiService.chat(
        req.tenantId!,
        req.user!.id,
        { message, agentType, conversationId },
      );

      res.status(200).json({ success: true, data: response });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /ai/conversations — list user conversations
   */
  async listConversations(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { page, limit, agentType } = req.query as {
        page?: string;
        limit?: string;
        agentType?: string;
      };

      const result = await aiService.getConversations(
        req.tenantId!,
        req.user!.id,
        {
          page: page ? parseInt(page, 10) : 1,
          limit: limit ? parseInt(limit, 10) : 20,
          agentType,
        },
      );

      res.status(200).json({ success: true, data: result.data, meta: { total: result.total } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /ai/conversations/:id — get conversation with messages
   */
  async getConversation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const convo = await aiService.getConversation(
        req.tenantId!,
        req.user!.id,
        req.params.id,
      );

      if (!convo) {
        res.status(404).json({ success: false, error: { message: 'Conversation not found' } });
        return;
      }

      res.status(200).json({ success: true, data: convo });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /ai/conversations/:id — archive conversation
   */
  async archiveConversation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      await aiService.archiveConversation(
        req.tenantId!,
        req.user!.id,
        req.params.id,
      );

      res.status(200).json({ success: true, message: 'Conversation archived' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /ai/conversations/:id — rename conversation
   */
  async renameConversation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const titleSchema = z.object({
        title: z.string().min(1).max(200),
      });
      const parsed = titleSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid title', { errors: parsed.error.format() });
      }

      await aiService.renameConversation(
        req.tenantId!,
        req.user!.id,
        req.params.id,
        parsed.data.title,
      );

      res.status(200).json({ success: true, message: 'Conversation renamed' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /ai/excel/analyze — AI-enhanced Excel validation
   */
  async analyzeExcel(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const parsed = excelAnalyzeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid Excel data', { errors: parsed.error.format() });
      }

      const validData = parsed.data as {
        rows: Record<string, unknown>[];
        errors: Array<{ row: number; field: string; message: string }>;
      };
      const result = await aiService.analyzeExcel(
        req.tenantId!,
        req.user!.id,
        validData,
      );

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /ai/insights — get AI insight cards
   */
  async getInsights(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { page, limit, agentType, insightType, priority, isRead } = req.query as Record<
        string,
        string | undefined
      >;

      const result = await aiService.getInsights(req.tenantId!, req.user!.id, {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        agentType,
        insightType,
        priority,
        isRead: isRead !== undefined ? isRead === 'true' : undefined,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /ai/insights/:id/read — mark insight as read
   */
  async markInsightRead(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      await aiService.markInsightRead(req.tenantId!, req.user!.id, req.params.id);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /ai/insights/:id/dismiss — dismiss insight
   */
  async dismissInsight(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      await aiService.dismissInsight(req.tenantId!, req.user!.id, req.params.id);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /ai/insights/summary — get daily AI summary
   */
  async getInsightsSummary(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const summary = await aiService.getInsightsSummary(req.tenantId!, req.user!.id);
      res.status(200).json({ success: true, data: { summary } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /ai/reports/generate — generate an AI report
   */
  async generateReport(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const parsed = reportSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid report input', { errors: parsed.error.format() });
      }

      const result = await aiService.generateReport(
        req.tenantId!,
        req.user!.id,
        parsed.data.reportType,
        parsed.data.params,
      );

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /ai/usage — get AI usage stats
   */
  async getUsage(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const stats = await aiService.getUsageStats(req.tenantId!);
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  // ── Agentic Task Endpoints ────────────────────────────────

  /**
   * GET /ai/tasks — list user's agentic tasks
   */
  async listTasks(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { status, page, limit } = req.query as {
        status?: string;
        page?: string;
        limit?: string;
      };

      const result = await aiService.getTasks(req.tenantId!, req.user!.id, {
        status,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /ai/tasks/:id — get task with full action details
   */
  async getTask(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const task = await aiService.getTask(req.tenantId!, req.user!.id, req.params.id);
      if (!task) {
        res.status(404).json({ success: false, error: { message: 'Task not found' } });
        return;
      }
      res.status(200).json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /ai/tasks/:id/cancel — cancel a running task
   */
  async cancelTask(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      await aiService.cancelTask(req.tenantId!, req.user!.id, req.params.id);
      res.status(200).json({ success: true, message: 'Task cancelled' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /ai/actions/pending — get all pending approvals
   */
  async getPendingApprovals(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const actions = await aiService.getPendingApprovals(req.tenantId!, req.user!.id);
      res.status(200).json({ success: true, data: actions });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /ai/actions/:id/approve — approve a pending action
   */
  async approveAction(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await aiService.approveAction(
        req.tenantId!,
        req.user!.id,
        req.params.id,
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /ai/actions/:id/reject — reject a pending action
   */
  async rejectAction(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { reason } = req.body as { reason?: string };
      if (!reason || reason.trim().length === 0) {
        throw new ValidationError('Rejection reason is required');
      }

      const result = await aiService.rejectAction(
        req.tenantId!,
        req.user!.id,
        req.params.id,
        reason,
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
  // ── Coordinated Multi-Agent Chat ─────────────────────────

  /**
   * POST /ai/chat/coordinate — coordinate a multi-agent task
   */
  async coordinateChat(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { message, agentTypes, conversationId } = req.body as {
        message: string;
        agentTypes: string[];
        conversationId?: string;
      };

      if (!message || message.trim().length === 0) {
        throw new ValidationError('Message is required');
      }
      if (!agentTypes || !Array.isArray(agentTypes) || agentTypes.length < 2) {
        throw new ValidationError('At least 2 agent types are required for coordination');
      }

      const result = await aiService.coordinateChat(req.tenantId!, req.user!.id, {
        message,
        agentTypes,
        conversationId,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /ai/agents/active — get currently active agent tasks (for live feed)
   */
  async getActiveAgents(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const agents = await aiService.getActiveAgents(req.tenantId!);
      res.status(200).json({ success: true, data: agents });
    } catch (error) {
      next(error);
    }
  }
}

export const aiController = new AIController();
