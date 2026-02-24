/**
 * AgenticBaseAgent — extends BaseAgent with autonomous task execution capability.
 *
 * When a user message is classified as an "agentic task" (multi-step goal),
 * it delegates to the AgenticExecutionEngine instead of single-shot LLM response.
 *
 * Chat questions still flow through the normal BaseAgent.process() path — 100%
 * backward compatible. Agents that extend this class gain agentic capability
 * without any code changes to their existing logic.
 *
 * Intent Classification:
 *   "What are my team's goals?" → chat (single-shot answer)
 *   "Create SMART goals for my team based on OKRs" → agentic_task (multi-step)
 */

import { logger } from '../../utils/logger';
import { llmClient, type LLMMessage } from './llm-client';
import { BaseAgent, type AgentResponse } from './base-agent';
import { outputValidator } from './output-validator';

// Re-export everything from base-agent so agents extending AgenticBaseAgent
// only need a single import source change.
export { type AgentContext, type AgentResponse, type RoleCategory, MODEL_TIERS, resolveRoleCategory } from './base-agent';
import { agenticEngine, type TaskExecutionResult } from './agentic-engine';
import { agentMemory } from './agent-memory';

// ── Intent Classification ──────────────────────────────────

type UserIntent = 'chat' | 'agentic_task';

const INTENT_CLASSIFY_PROMPT = `You are an intent classifier for a Performance Management System AI.
Classify the user's message into ONE of two categories:

1. "chat" — The user is asking a question, seeking information, or having a conversation.
   Examples: "What are my goals?", "How is my team performing?", "Explain the review process"

2. "agentic_task" — The user wants you to DO something that requires multiple steps, creating/modifying data, or autonomous execution.
   Examples: "Create goals for my team", "Analyze burnout risk and notify managers", "Generate a performance report and send it", "Set up 1:1 meeting prep for all my direct reports", "Review all pending goals and flag alignment issues"

Keywords that signal agentic_task: "create", "generate", "set up", "analyze and...", "send", "update", "prepare", "build", "draft", "schedule", "notify", "flag", "fix"

Respond with ONLY one word: "chat" or "agentic_task"`;

// ── AgenticBaseAgent ───────────────────────────────────────

export abstract class AgenticBaseAgent extends BaseAgent {
  /**
   * Override process() to detect agentic intents.
   */
  override async process(
    tenantId: string,
    userId: string,
    userMessage: string,
    conversationId?: string,
    delegationDepth: number = 0,
  ): Promise<AgentResponse> {
    // Classify intent
    const intent = await this.classifyIntent(userMessage);

    if (intent === 'chat') {
      // Normal chat flow — 100% backward compatible
      return super.process(tenantId, userId, userMessage, conversationId, delegationDepth);
    }

    // Agentic task flow
    logger.info('Agentic intent detected', {
      agentType: this.agentType,
      intent,
      message: userMessage.slice(0, 100),
    });

    // Get or create conversation for tracking
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

    // Execute the agentic task
    const start = Date.now();
    const result = await agenticEngine.executeTask(
      tenantId,
      userId,
      userMessage,
      this.agentType,
      convoId,
      undefined, // parentTaskId
      delegationDepth,
    );

    const latencyMs = Date.now() - start;

    // Build response message based on task outcome
    const rawResponse = this.buildAgenticResponse(result);

    // VALIDATE: Run output through guardrails
    const validated = outputValidator.validate(rawResponse);
    const responseMessage = validated.content;

    // Store assistant response
    await agentMemory.addMessage(convoId, 'assistant', responseMessage, {
      taskId: result.taskId,
      taskStatus: result.status,
      isAgentic: true,
      latencyMs,
    });

    return {
      message: responseMessage,
      conversationId: convoId,
      agentType: this.agentType,
      metadata: {
        provider: 'agentic_engine',
        model: 'multi-step',
        inputTokens: 0,
        outputTokens: 0,
        costCents: 0,
        latencyMs,
      },
      taskId: result.taskId,
      data: {
        taskId: result.taskId,
        taskStatus: result.status,
        totalSteps: result.totalSteps,
        completedSteps: result.completedSteps,
        awaitingApproval: result.awaitingApproval,
      },
    };
  }

  /**
   * Classify whether the user message is a chat question or an agentic task.
   */
  private async classifyIntent(userMessage: string): Promise<UserIntent> {
    try {
      const messages: LLMMessage[] = [
        { role: 'system', content: INTENT_CLASSIFY_PROMPT },
        { role: 'user', content: userMessage },
      ];

      const response = await llmClient.chat(messages, {
        temperature: 0,
        maxTokens: 10,
        noCache: true,
        // Use economy tier for fast classification
        model: 'gemini-2.0-flash',
        provider: 'gemini',
      });

      const cleaned = response.content.trim().toLowerCase().replace(/[^a-z_]/g, '');
      if (cleaned === 'agentic_task' || cleaned === 'agentictask') {
        return 'agentic_task';
      }
      return 'chat';
    } catch (err) {
      logger.warn('Intent classification failed, defaulting to chat', {
        error: (err as Error).message,
      });
      return 'chat'; // Safe default
    }
  }

  /**
   * Build a user-friendly response message based on task execution result.
   */
  private buildAgenticResponse(result: TaskExecutionResult): string {
    switch (result.status) {
      case 'completed':
        return result.message;

      case 'awaiting_approval':
        return `${result.message}\n\n` +
          `You can review and approve pending actions in the **Tasks** panel.\n` +
          `Progress: ${result.completedSteps}/${result.totalSteps} steps completed.`;

      case 'failed':
        return `I encountered an issue while executing this task.\n\n` +
          `${result.message}\n\n` +
          `You can try rephrasing your request or breaking it into smaller steps.`;

      case 'cancelled':
        return 'This task was cancelled.';

      default:
        return result.message;
    }
  }
}
