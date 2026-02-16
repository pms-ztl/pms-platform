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
}

export const aiController = new AIController();
