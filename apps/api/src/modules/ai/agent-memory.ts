/**
 * Agent Memory — manages conversation history for AI agents.
 *
 * Uses AgentConversation + AgentMessage Prisma models.
 * - Creates / retrieves conversations
 * - Stores messages
 * - Limits context window to last N messages
 * - Generates titles from first user message
 */

import { prisma } from '@pms/database';

import { logger } from '../../utils/logger';
import { llmClient } from './llm-client';

// ── Types ──────────────────────────────────────────────────

export interface ConversationSummary {
  id: string;
  agentType: string;
  title: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

export interface MessageRecord {
  id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// ── Constants ──────────────────────────────────────────────

const MAX_CONTEXT_MESSAGES = 20;

// ── Agent Memory ───────────────────────────────────────────

class AgentMemory {
  /**
   * Create a new conversation.
   */
  async createConversation(
    tenantId: string,
    userId: string,
    agentType: string,
    title?: string,
  ): Promise<string> {
    const convo = await prisma.agentConversation.create({
      data: { tenantId, userId, agentType, title: title ?? null },
    });
    return convo.id;
  }

  /**
   * Add a message to a conversation.
   */
  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<string> {
    const msg = await prisma.agentMessage.create({
      data: {
        conversationId,
        role,
        content,
        metadata: (metadata ?? undefined) as import('@prisma/client').Prisma.InputJsonValue | undefined,
      },
    });

    // Auto-generate title from first user message
    if (role === 'user') {
      const convo = await prisma.agentConversation.findUnique({
        where: { id: conversationId },
        select: { title: true },
      });
      if (!convo?.title) {
        const title = content.length > 60 ? content.slice(0, 57) + '...' : content;
        await prisma.agentConversation.update({
          where: { id: conversationId },
          data: { title },
        });
      }
    }

    return msg.id;
  }

  /**
   * Get conversation history (last N messages).
   */
  async getHistory(
    conversationId: string,
    limit: number = MAX_CONTEXT_MESSAGES,
  ): Promise<MessageRecord[]> {
    const messages = await prisma.agentMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        role: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
    });

    // Return in chronological order
    return messages.reverse().map((m) => ({
      ...m,
      metadata: m.metadata as Record<string, unknown> | null,
    }));
  }

  /**
   * Get full conversation with messages.
   */
  async getConversation(
    conversationId: string,
    tenantId: string,
  ) {
    return prisma.agentConversation.findFirst({
      where: { id: conversationId, tenantId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  /**
   * List conversations for a user.
   */
  async listConversations(
    tenantId: string,
    userId: string,
    options: { page?: number; limit?: number; agentType?: string } = {},
  ): Promise<{ data: ConversationSummary[]; total: number }> {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId, userId, status: 'active' };
    if (options.agentType) where.agentType = options.agentType;

    const [conversations, total] = await Promise.all([
      prisma.agentConversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: { _count: { select: { messages: true } } },
      }),
      prisma.agentConversation.count({ where }),
    ]);

    return {
      data: conversations.map((c) => ({
        id: c.id,
        agentType: c.agentType,
        title: c.title,
        status: c.status,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messageCount: c._count.messages,
      })),
      total,
    };
  }

  /**
   * Archive a conversation.
   */
  async archiveConversation(
    conversationId: string,
    tenantId: string,
  ): Promise<void> {
    await prisma.agentConversation.updateMany({
      where: { id: conversationId, tenantId },
      data: { status: 'archived' },
    });
  }

  /**
   * If a conversation has too many messages, summarize older ones
   * to keep the context window manageable.
   */
  async summarizeIfNeeded(conversationId: string): Promise<void> {
    const count = await prisma.agentMessage.count({
      where: { conversationId },
    });

    if (count <= MAX_CONTEXT_MESSAGES * 2) return; // No need yet

    try {
      const oldMessages = await prisma.agentMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: count - MAX_CONTEXT_MESSAGES,
        select: { id: true, role: true, content: true },
      });

      // Summarise with LLM
      const summaryText = oldMessages
        .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
        .join('\n');

      const summaryResponse = await llmClient.generateText(
        `Summarize this conversation history in 2-3 sentences:\n\n${summaryText}`,
        { maxTokens: 256, temperature: 0.2, noCache: true },
      );

      // Delete old messages and insert summary
      await prisma.agentMessage.deleteMany({
        where: { id: { in: oldMessages.map((m) => m.id) } },
      });

      await prisma.agentMessage.create({
        data: {
          conversationId,
          role: 'system',
          content: `[Conversation summary]: ${summaryResponse.content}`,
        },
      });

      logger.info('Conversation summarized', {
        conversationId,
        deletedMessages: oldMessages.length,
      });
    } catch (err) {
      logger.warn('Failed to summarize conversation', {
        conversationId,
        error: (err as Error).message,
      });
    }
  }
}

export const agentMemory = new AgentMemory();
