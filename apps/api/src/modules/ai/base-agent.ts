/**
 * Base Agent — abstract class that all specialized agents extend.
 *
 * Implements the Perceive → Reason → Act → Learn cycle:
 * 1. Perceive: build context from tenant/user data
 * 2. Reason: send to LLM with system prompt + tools
 * 3. Act: return structured response
 * 4. Learn: store interaction in memory
 */

import { prisma } from '@pms/database';

import { logger, auditLogger } from '../../utils/logger';
import { llmClient, type LLMMessage, type LLMResponse } from './llm-client';
import { agentMemory } from './agent-memory';

// ── Types ──────────────────────────────────────────────────

export interface AgentContext {
  tenantId: string;
  userId: string;
  userRoles: string[];
  userName: string;
  tenantName: string;
  userLevel?: number;
  userDepartment?: string;
}

export interface AgentResponse {
  message: string;
  conversationId: string;
  agentType: string;
  metadata: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costCents: number;
    latencyMs: number;
  };
  /** Optional structured data the agent wants to surface (e.g., tables, charts) */
  data?: Record<string, unknown>;
  /** Suggested actions the user can take */
  suggestedActions?: Array<{ label: string; url?: string; action?: string }>;
}

// ── Base Agent ─────────────────────────────────────────────

export abstract class BaseAgent {
  readonly agentType: string;
  protected systemPrompt: string;

  constructor(agentType: string, systemPrompt: string) {
    this.agentType = agentType;
    this.systemPrompt = systemPrompt;
  }

  /**
   * Main entry point — processes a user message.
   */
  async process(
    tenantId: string,
    userId: string,
    userMessage: string,
    conversationId?: string,
  ): Promise<AgentResponse> {
    const start = Date.now();

    try {
      // 1. PERCEIVE — gather context
      const context = await this.buildContext(tenantId, userId);

      // 2. Get or create conversation
      let convoId = conversationId;
      if (!convoId) {
        convoId = await agentMemory.createConversation(
          tenantId,
          userId,
          this.agentType,
        );
      }

      // Store user message
      await agentMemory.addMessage(convoId, 'user', userMessage);

      // 3. Build messages array
      const history = await agentMemory.getHistory(convoId);
      const systemMessage = this.buildSystemMessage(context);

      // Get agent-specific data to inject into context
      const agentData = await this.gatherAgentData(context, userMessage);

      const messages: LLMMessage[] = [
        { role: 'system', content: systemMessage },
      ];

      // Add agent data as a system context if available
      if (agentData) {
        messages.push({
          role: 'system',
          content: `Here is the relevant data from the system:\n\n${JSON.stringify(agentData, null, 2)}`,
        });
      }

      // Add conversation history
      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }

      // 4. REASON — call LLM
      const llmResponse = await llmClient.chat(messages, {
        tenantId,
        maxTokens: 2048,
        temperature: 0.3,
        noCache: true, // Don't cache conversation responses
      });

      // 5. ACT — store response and return
      await agentMemory.addMessage(convoId, 'assistant', llmResponse.content, {
        provider: llmResponse.provider,
        model: llmResponse.model,
        inputTokens: llmResponse.inputTokens,
        outputTokens: llmResponse.outputTokens,
        costCents: llmResponse.costCents,
        latencyMs: llmResponse.latencyMs,
      });

      // 6. LEARN — audit log
      auditLogger(
        'AI_AGENT_INTERACTION',
        userId,
        tenantId,
        'ai_agent',
        convoId,
        {
          agentType: this.agentType,
          inputTokens: llmResponse.inputTokens,
          outputTokens: llmResponse.outputTokens,
          costCents: llmResponse.costCents,
          latencyMs: llmResponse.latencyMs,
        },
      );

      // Summarize conversation if too long
      agentMemory.summarizeIfNeeded(convoId).catch((err) => {
        logger.warn('Failed to summarize conversation', { conversationId: convoId, error: (err as Error).message });
      });

      // Parse structured data from response if the agent supports it
      const parsed = this.parseResponse(llmResponse);

      return {
        message: parsed.message,
        conversationId: convoId,
        agentType: this.agentType,
        metadata: {
          provider: llmResponse.provider,
          model: llmResponse.model,
          inputTokens: llmResponse.inputTokens,
          outputTokens: llmResponse.outputTokens,
          costCents: llmResponse.costCents,
          latencyMs: llmResponse.latencyMs,
        },
        data: parsed.data,
        suggestedActions: parsed.suggestedActions,
      };
    } catch (err) {
      logger.error(`Agent ${this.agentType} processing failed`, {
        tenantId,
        userId,
        error: (err as Error).message,
      });
      throw err;
    }
  }

  /**
   * Build user/tenant context from the database.
   */
  protected async buildContext(
    tenantId: string,
    userId: string,
  ): Promise<AgentContext> {
    const [user, tenant] = await Promise.all([
      prisma.user.findFirst({
        where: { id: userId, tenantId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          level: true,
          departmentId: true,
          userRoles: { include: { role: { select: { name: true } } } },
        },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      }),
    ]);

    return {
      tenantId,
      userId,
      userRoles: user?.userRoles.map((ur) => ur.role.name) ?? [],
      userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
      tenantName: tenant?.name ?? 'Unknown Tenant',
      userLevel: user?.level ?? undefined,
      userDepartment: user?.departmentId ?? undefined,
    };
  }

  /**
   * Build the system message with context injection.
   */
  protected buildSystemMessage(context: AgentContext): string {
    return `${this.systemPrompt}

== User Context ==
User: ${context.userName}
Roles: ${context.userRoles.join(', ')}
Company: ${context.tenantName}
${context.userLevel ? `Level: L${context.userLevel}` : ''}

== Rules ==
- You are an AI assistant for the PMS (Performance Management System) platform.
- Always respond helpfully and professionally.
- Only discuss data relevant to this user's tenant (company: ${context.tenantName}).
- Never reveal data from other companies/tenants.
- If you don't have enough data to answer, say so clearly.
- Format responses with markdown for readability.
- Keep responses concise but informative.`;
  }

  /**
   * Override in subclasses to gather agent-specific data before the LLM call.
   * Returns data that will be injected as system context.
   */
  protected async gatherAgentData(
    _context: AgentContext,
    _userMessage: string,
  ): Promise<Record<string, unknown> | null> {
    return null;
  }

  /**
   * Override in subclasses to parse structured data from LLM response.
   */
  protected parseResponse(llmResponse: LLMResponse): {
    message: string;
    data?: Record<string, unknown>;
    suggestedActions?: Array<{ label: string; url?: string; action?: string }>;
  } {
    return { message: llmResponse.content };
  }
}
