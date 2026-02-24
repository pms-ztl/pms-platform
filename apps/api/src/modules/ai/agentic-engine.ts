/**
 * Agentic Execution Engine — the brain of true agentic AI.
 *
 * Implements the full autonomous execution loop:
 *   Plan → Execute → Observe → Replan → Self-Correct
 *
 * Features:
 * - Multi-step task planning via LLM tool calling
 * - Automatic execution of read + low-write tools
 * - Human-in-the-loop approval for high-write actions
 * - Self-correction on tool failures (retry up to 2x with alternative approach)
 * - Observation-driven replanning (LLM adjusts plan based on tool results)
 * - Full audit trail via AgentTask + AgentAction records
 * - Cost tracking per step and per task
 */

import { prisma } from '@pms/database';

import { logger, auditLogger } from '../../utils/logger';
import { llmClient, type LLMMessage } from './llm-client';
import { toolRegistry, type ToolResult } from './tool-registry';
import { type AgentContext, type RoleCategory, resolveRoleCategory } from './base-agent';
import { sendNotification } from './agent-tools';
// Lazy import to break circular dependency:
// orchestrator → agents → agentic-base-agent → agentic-engine → orchestrator
const getOrchestrator = () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (require('./orchestrator') as { agentOrchestrator: any }).agentOrchestrator;

// ── Types ──────────────────────────────────────────────────

export interface AgentStep {
  toolName: string;
  toolInput: Record<string, unknown>;
  reasoning: string;
  impactLevel: string;
  requiresApproval: boolean;
}

export interface TaskExecutionResult {
  taskId: string;
  status: string;
  message: string;
  totalSteps: number;
  completedSteps: number;
  awaitingApproval: boolean;
}

// ── Constants ──────────────────────────────────────────────

const MAX_RETRIES = 2;
const MAX_STEPS = 15;
const MAX_REPLAN_ATTEMPTS = 3;
const MAX_DELEGATION_DEPTH = 3;
/** Maximum total tokens (input + output) per task before circuit breaker triggers */
const MAX_TASK_TOKENS = 50_000;
/** Maximum cost in cents per task before circuit breaker triggers */
const MAX_TASK_COST_CENTS = 50;

// ── Planning Prompts ───────────────────────────────────────

const PLANNING_SYSTEM_PROMPT = `You are an autonomous AI agent for a Performance Management System (PMS).
Your job is to break down user goals into concrete, executable steps using the available tools.

IMPORTANT RULES:
1. Only use tools that are available to you. Do NOT invent tool names.
2. Each step should have a clear purpose (reasoning).
3. Order steps logically — gather data first, then analyze, then act.
4. For write operations (creating goals, sending feedback), include all required parameters.
5. Keep plans efficient — use the minimum number of steps needed.
6. Maximum ${MAX_STEPS} steps per plan.

Respond with a JSON array of steps. Each step has:
- toolName: exact name of the tool to call
- toolInput: parameters object matching the tool's input schema
- reasoning: brief explanation of why this step is needed

Example:
[
  {"toolName": "query_users", "toolInput": {"departmentId": "xxx"}, "reasoning": "First, get all team members to analyze their goals"},
  {"toolName": "query_goals", "toolInput": {"userId": "yyy"}, "reasoning": "Get goals for each team member"},
  {"toolName": "create_insight_card", "toolInput": {"title": "..."}, "reasoning": "Summarize findings as an insight card"}
]`;

const OBSERVE_SYSTEM_PROMPT = `You are observing the results of an executed tool step in a multi-step agentic task.

Based on the tool output, decide:
1. "continue" — proceed to the next planned step
2. "replan" — the result changes what we should do next. Provide updated remaining steps.
3. "abort" — something went critically wrong, stop the task

Respond with JSON:
{"decision": "continue"|"replan"|"abort", "reason": "brief explanation", "updatedSteps": [...] (only if replan)}`;

const RECOVERY_SYSTEM_PROMPT = `A tool execution failed during an agentic task. Analyze the error and suggest a recovery strategy.

Options:
1. "retry_different" — try a different approach with different parameters
2. "skip" — skip this step and continue (if it's not critical)
3. "abort" — the error is unrecoverable, stop the task

Respond with JSON:
{"strategy": "retry_different"|"skip"|"abort", "reason": "explanation", "alternativeStep": {...} (if retry_different)}`;

const SUMMARY_SYSTEM_PROMPT = `Summarize the completed agentic task execution. You are writing a clear, professional summary for the user about what was accomplished.

Include:
- What was the original goal
- What steps were taken
- Key findings or results
- Any actions that were taken (goals created, notifications sent, etc.)
- Any issues encountered

Keep it concise but comprehensive. Use markdown formatting.`;

// ── Robust JSON Parser ──────────────────────────────────────

/**
 * Multi-strategy JSON parser for LLM responses (R10).
 * Eliminates fragile regex-only parsing (CV-6) by trying:
 * 1. Direct JSON.parse (works when provider JSON mode is active)
 * 2. Code block extraction (```json ... ```)
 * 3. Regex extraction (last resort fallback)
 */
function parseJsonResponse<T>(content: string, type: 'array' | 'object'): T | null {
  const trimmed = content.trim();

  // Strategy 1: Direct parse — works when provider returns clean JSON
  try {
    const parsed = JSON.parse(trimmed);
    if (type === 'array' && Array.isArray(parsed)) return parsed as T;
    if (type === 'object' && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as T;
    // Some providers wrap arrays in an object: { "steps": [...] }
    if (type === 'array' && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const values = Object.values(parsed);
      if (values.length === 1 && Array.isArray(values[0])) return values[0] as T;
    }
  } catch {
    // Not clean JSON, try other strategies
  }

  // Strategy 2: Code block extraction (```json ... ```)
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (type === 'array' && Array.isArray(parsed)) return parsed as T;
      if (type === 'object' && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as T;
    } catch {
      // Not valid JSON in code block
    }
  }

  // Strategy 3: Regex extraction (last resort — old behavior as fallback)
  const regex = type === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const regexMatch = trimmed.match(regex);
  if (regexMatch) {
    try {
      const parsed = JSON.parse(regexMatch[0]);
      if (type === 'array' && Array.isArray(parsed)) return parsed as T;
      if (type === 'object' && typeof parsed === 'object') return parsed as T;
    } catch {
      // Not valid JSON from regex
    }
  }

  return null;
}

// ── Token Budget Tracker ────────────────────────────────────

/**
 * Tracks cumulative token usage and cost within a single task execution.
 * Acts as a circuit breaker when limits are exceeded.
 */
class TaskTokenBudget {
  totalInputTokens = 0;
  totalOutputTokens = 0;
  totalCostCents = 0;
  llmCallCount = 0;

  get totalTokens(): number {
    return this.totalInputTokens + this.totalOutputTokens;
  }

  get isExceeded(): boolean {
    return this.totalTokens > MAX_TASK_TOKENS || this.totalCostCents > MAX_TASK_COST_CENTS;
  }

  get exceedReason(): string {
    if (this.totalTokens > MAX_TASK_TOKENS) {
      return `Token budget exceeded: ${this.totalTokens.toLocaleString()} tokens used (limit: ${MAX_TASK_TOKENS.toLocaleString()})`;
    }
    if (this.totalCostCents > MAX_TASK_COST_CENTS) {
      return `Cost budget exceeded: $${(this.totalCostCents / 100).toFixed(2)} (limit: $${(MAX_TASK_COST_CENTS / 100).toFixed(2)})`;
    }
    return '';
  }

  record(inputTokens: number, outputTokens: number, costCents: number): void {
    this.totalInputTokens += inputTokens;
    this.totalOutputTokens += outputTokens;
    this.totalCostCents += costCents;
    this.llmCallCount++;
  }
}

// ── Agentic Engine ─────────────────────────────────────────

class AgenticExecutionEngine {
  /**
   * Main entry: create and begin executing an agentic task.
   */
  async executeTask(
    tenantId: string,
    userId: string,
    goal: string,
    agentType: string,
    conversationId?: string,
    parentTaskId?: string,
    delegationDepth: number = 0,
  ): Promise<TaskExecutionResult> {
    const start = Date.now();

    // 0. Check delegation depth to prevent infinite recursion
    if (delegationDepth > MAX_DELEGATION_DEPTH) {
      logger.warn('Delegation depth limit exceeded', {
        agentType,
        delegationDepth,
        maxDepth: MAX_DELEGATION_DEPTH,
        goal: goal.slice(0, 100),
      });
      return {
        taskId: `depth_exceeded_${Date.now()}`,
        status: 'failed',
        message: `Delegation depth limit (${MAX_DELEGATION_DEPTH}) exceeded. The agent tried to delegate too many layers deep. Try breaking your request into simpler tasks.`,
        totalSteps: 0,
        completedSteps: 0,
        awaitingApproval: false,
      };
    }

    // 1. Create task record
    const task = await prisma.agentTask.create({
      data: {
        tenantId,
        userId,
        agentType,
        conversationId: conversationId || null,
        parentTaskId: parentTaskId || null,
        title: goal.length > 100 ? goal.slice(0, 97) + '...' : goal,
        goal,
        status: 'planning',
      },
    });

    logger.info('Agentic task created', { taskId: task.id, agentType, goal: goal.slice(0, 100) });

    // Initialize token budget tracker for this task
    const budget = new TaskTokenBudget();

    try {
      // 2. Build context
      const context = await this.buildContext(tenantId, userId);

      // 3. Get available tools for this role
      const availableTools = toolRegistry.getToolsForRole(context.roleCategory);
      const toolSchemas = toolRegistry.getToolSchemas(availableTools);

      // 4. Generate plan
      const plan = await this.generatePlan(goal, context, toolSchemas, budget);

      if (!plan || plan.length === 0) {
        await prisma.agentTask.update({
          where: { id: task.id },
          data: { status: 'failed', error: 'LLM could not generate a valid execution plan' },
        });
        return {
          taskId: task.id,
          status: 'failed',
          message: 'I could not create an execution plan for this request. Try rephrasing your goal.',
          totalSteps: 0,
          completedSteps: 0,
          awaitingApproval: false,
        };
      }

      // 5. Annotate plan steps with impact/approval info
      const annotatedPlan = plan.map((step) => {
        const toolDef = toolRegistry.getTool(step.toolName);
        return {
          ...step,
          impactLevel: toolDef?.impactLevel || 'read',
          requiresApproval: toolDef?.requiresApproval || false,
        };
      });

      // 6. Save plan
      await prisma.agentTask.update({
        where: { id: task.id },
        data: {
          plan: annotatedPlan as any,
          totalSteps: annotatedPlan.length,
          status: 'executing',
          startedAt: new Date(),
        },
      });

      // 7. Execute steps
      const result = await this.executeSteps(task.id, annotatedPlan, context, delegationDepth, budget);

      auditLogger(
        'AI_AGENTIC_TASK_COMPLETED',
        userId,
        tenantId,
        'agent_task',
        task.id,
        {
          agentType,
          totalSteps: annotatedPlan.length,
          completedSteps: result.completedSteps,
          status: result.status,
          durationMs: Date.now() - start,
        },
      );

      return result;
    } catch (err) {
      logger.error('Agentic task execution failed', {
        taskId: task.id,
        error: (err as Error).message,
      });

      await prisma.agentTask.update({
        where: { id: task.id },
        data: {
          status: 'failed',
          error: (err as Error).message,
          completedAt: new Date(),
        },
      });

      return {
        taskId: task.id,
        status: 'failed',
        message: `Task execution failed: ${(err as Error).message}`,
        totalSteps: 0,
        completedSteps: 0,
        awaitingApproval: false,
      };
    }
  }

  /**
   * Generate a step-by-step plan from the user's goal.
   */
  private async generatePlan(
    goal: string,
    context: AgentContext,
    toolSchemas: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>,
    budget?: TaskTokenBudget,
  ): Promise<AgentStep[]> {
    const toolListText = toolSchemas
      .map((t) => `- **${t.name}**: ${t.description}\n  Input: ${JSON.stringify(t.input_schema)}`)
      .join('\n');

    const messages: LLMMessage[] = [
      { role: 'system', content: PLANNING_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `## User Context
User: ${context.userName} (${context.roleCategory})
Company: ${context.tenantName}
${context.userLevel ? `Level: L${context.userLevel}` : ''}
User ID: ${context.userId}
Tenant ID: ${context.tenantId}

## Available Tools
${toolListText}

## Goal
${goal}

Generate a step-by-step execution plan as a JSON array.`,
      },
    ];

    const response = await llmClient.chat(messages, {
      noCache: true,
      temperature: 0.2,
      maxTokens: 4096,
      jsonMode: true, // R10: Use structured output to eliminate regex parsing
    });

    // Track token usage for planning call
    if (budget) {
      budget.record(response.inputTokens, response.outputTokens, response.costCents);
    }

    // Parse plan from LLM response using robust multi-strategy parser (R10)
    const rawPlan = parseJsonResponse<AgentStep[]>(response.content, 'array');

    if (!rawPlan || rawPlan.length === 0) {
      logger.warn('LLM plan response did not contain valid JSON array', {
        content: response.content.slice(0, 200),
      });
      return [];
    }

    // Validate: only keep steps with valid tool names
    const validPlan = rawPlan
      .filter((step) => {
        if (!toolRegistry.getTool(step.toolName)) {
          logger.warn(`Plan references unknown tool: ${step.toolName}`);
          return false;
        }
        return true;
      })
      .slice(0, MAX_STEPS);

    return validPlan;
  }

  /**
   * Execute plan steps sequentially with observe/replan loop.
   */
  private async executeSteps(
    taskId: string,
    plan: AgentStep[],
    context: AgentContext,
    delegationDepth: number = 0,
    budget?: TaskTokenBudget,
  ): Promise<TaskExecutionResult> {
    let currentPlan = [...plan];
    let completedSteps = 0;
    const executionLog: Array<{ step: number; tool: string; result: ToolResult }> = [];
    let replanCount = 0;

    for (let i = 0; i < currentPlan.length; i++) {
      const step = currentPlan[i];

      // R12: Refresh context every 5 steps to prevent stale RBAC/user data
      if (i > 0 && i % 5 === 0) {
        try {
          const refreshed = await this.buildContext(context.tenantId, context.userId);
          Object.assign(context, refreshed);
          logger.info('Context refreshed during long-running task', { taskId, step: i });
        } catch {
          // Non-critical: continue with existing context
        }
      }

      // Check if task was cancelled
      const task = await prisma.agentTask.findUnique({ where: { id: taskId } });
      if (!task || task.status === 'cancelled') {
        return {
          taskId,
          status: 'cancelled',
          message: 'Task was cancelled.',
          totalSteps: currentPlan.length,
          completedSteps,
          awaitingApproval: false,
        };
      }

      // Create action record
      const action = await prisma.agentAction.create({
        data: {
          taskId,
          stepIndex: i,
          toolName: step.toolName,
          toolInput: step.toolInput as any,
          impactLevel: step.impactLevel,
          requiresApproval: step.requiresApproval,
          reasoning: step.reasoning,
          status: step.requiresApproval ? 'awaiting_approval' : 'executing',
        },
      });

      // If approval needed, pause
      if (step.requiresApproval) {
        await prisma.agentTask.update({
          where: { id: taskId },
          data: {
            status: 'awaiting_approval',
            currentStep: i,
            plan: currentPlan as any,
          },
        });

        // Send notification to user
        try {
          await sendNotification(context.tenantId, context.userId, {
            type: 'action_required',
            title: 'AI Action Requires Approval',
            message: `${step.reasoning} — Tool: ${step.toolName}`,
            actionUrl: `/ai/tasks/${taskId}`,
          });
        } catch {
          // Non-critical if notification fails
        }

        return {
          taskId,
          status: 'awaiting_approval',
          message: `Task paused at step ${i + 1}/${currentPlan.length}: "${step.reasoning}" requires your approval.`,
          totalSteps: currentPlan.length,
          completedSteps,
          awaitingApproval: true,
        };
      }

      // Execute the tool
      const toolDef = toolRegistry.getTool(step.toolName);
      if (!toolDef) {
        await prisma.agentAction.update({
          where: { id: action.id },
          data: { status: 'failed', toolOutput: { error: `Tool ${step.toolName} not found` } as any },
        });
        continue;
      }

      let result: ToolResult;
      let retryCount = 0;

      // R6: Validate tool input before execution
      const validationError = toolRegistry.validateToolInput(step.toolName, step.toolInput);
      if (validationError) {
        logger.warn('Tool input validation failed', { taskId, step: i, tool: step.toolName, error: validationError });
        await prisma.agentAction.update({
          where: { id: action.id },
          data: {
            status: 'failed',
            toolOutput: { error: validationError, validationFailed: true } as any,
          },
        });
        continue;
      }

      while (retryCount <= MAX_RETRIES) {
        try {
          const stepStart = Date.now();

          // DELEGATION: If tool is 'delegate_to_agent', route through orchestrator
          if (step.toolName === 'delegate_to_agent') {
            // Check delegation depth BEFORE recursing
            if (delegationDepth >= MAX_DELEGATION_DEPTH) {
              result = {
                success: false,
                data: null,
                error: `Delegation depth limit (${MAX_DELEGATION_DEPTH}) reached. Cannot delegate further to ${step.toolInput.agentType}.`,
              };
              logger.warn('Delegation depth limit hit during step execution', {
                taskId,
                targetAgent: step.toolInput.agentType,
                currentDepth: delegationDepth,
              });
            } else {
            const delegateResponse = await getOrchestrator().routeMessage(
              context.tenantId,
              context.userId,
              `${step.toolInput.subGoal as string}${step.toolInput.context ? `\n\nContext: ${step.toolInput.context}` : ''}`,
              step.toolInput.agentType as string,
              undefined,
              delegationDepth + 1,
            );
            result = {
              success: true,
              data: {
                agentType: delegateResponse.agentType,
                response: delegateResponse.message,
                taskId: delegateResponse.taskId,
              },
            };
            logger.info('Agent delegation completed', {
              taskId,
              fromStep: i,
              toAgent: step.toolInput.agentType,
              delegateTaskId: delegateResponse.taskId,
              delegationDepth: delegationDepth + 1,
            });
            }
          } else {
            result = await toolDef.execute(context.tenantId, context.userId, step.toolInput);
          }

          const latencyMs = Date.now() - stepStart;

          await prisma.agentAction.update({
            where: { id: action.id },
            data: {
              status: result.success ? 'completed' : 'failed',
              toolOutput: result as any,
              latencyMs,
            },
          });

          if (result.success) {
            completedSteps++;
            executionLog.push({ step: i, tool: step.toolName, result });

            // Update task progress
            await prisma.agentTask.update({
              where: { id: taskId },
              data: { currentStep: i + 1 },
            });

            // TOKEN BUDGET CHECK: abort if we've exceeded limits
            if (budget?.isExceeded) {
              const reason = budget.exceedReason;
              logger.warn('Task token budget exceeded', {
                taskId,
                totalTokens: budget.totalTokens,
                totalCost: budget.totalCostCents,
                llmCalls: budget.llmCallCount,
              });
              await prisma.agentTask.update({
                where: { id: taskId },
                data: {
                  status: 'failed',
                  error: reason,
                  completedAt: new Date(),
                  result: {
                    tokenBudgetExceeded: true,
                    totalTokens: budget.totalTokens,
                    totalCostCents: budget.totalCostCents,
                    llmCallCount: budget.llmCallCount,
                  } as any,
                },
              });
              return {
                taskId,
                status: 'failed',
                message: `Task stopped: ${reason}. ${completedSteps} of ${currentPlan.length} steps were completed before the limit was reached.`,
                totalSteps: currentPlan.length,
                completedSteps,
                awaitingApproval: false,
              };
            }

            // OBSERVE: let LLM decide if we should replan based on results
            if (i < currentPlan.length - 1 && replanCount < MAX_REPLAN_ATTEMPTS) {
              const observeResult = await this.observe(
                taskId,
                currentPlan,
                i,
                result,
                context,
                executionLog,
                budget,
              );

              // R9: Persist observation reasoning for full chain-of-thought traceability
              await prisma.agentAction.create({
                data: {
                  taskId,
                  stepIndex: i,
                  toolName: '_observe',
                  toolInput: { afterStep: i, decision: observeResult.decision } as any,
                  toolOutput: { reason: observeResult.reason, hasReplan: !!observeResult.updatedSteps } as any,
                  status: 'completed',
                  impactLevel: 'read',
                  reasoning: `Observation after step ${i + 1}: ${observeResult.decision} — ${observeResult.reason}`,
                },
              });

              if (observeResult.decision === 'replan' && observeResult.updatedSteps) {
                // Replace remaining steps with LLM-generated updates
                currentPlan = [
                  ...currentPlan.slice(0, i + 1),
                  ...observeResult.updatedSteps.slice(0, MAX_STEPS - i - 1),
                ];
                await prisma.agentTask.update({
                  where: { id: taskId },
                  data: { plan: currentPlan as any, totalSteps: currentPlan.length },
                });
                replanCount++;
                logger.info('Task replanned', { taskId, reason: observeResult.reason, newStepCount: currentPlan.length });
              } else if (observeResult.decision === 'abort') {
                await prisma.agentTask.update({
                  where: { id: taskId },
                  data: { status: 'failed', error: observeResult.reason, completedAt: new Date() },
                });
                return {
                  taskId,
                  status: 'failed',
                  message: `Task aborted: ${observeResult.reason}`,
                  totalSteps: currentPlan.length,
                  completedSteps,
                  awaitingApproval: false,
                };
              }
            }

            break; // Success, move to next step
          } else {
            // Tool returned error — attempt recovery
            retryCount++;
            if (retryCount <= MAX_RETRIES) {
              const recovery = await this.attemptRecovery(step, result, context, budget);

              // R9: Persist recovery reasoning
              await prisma.agentAction.create({
                data: {
                  taskId,
                  stepIndex: i,
                  toolName: '_recovery',
                  toolInput: { failedTool: step.toolName, error: result.error } as any,
                  toolOutput: { strategy: recovery.strategy, reason: recovery.reason } as any,
                  status: 'completed',
                  impactLevel: 'read',
                  reasoning: `Recovery for step ${i + 1}: ${recovery.strategy} — ${recovery.reason}`,
                },
              });

              if (recovery.strategy === 'retry_different' && recovery.alternativeStep) {
                step.toolInput = recovery.alternativeStep.toolInput;
                logger.info('Retrying with alternative approach', {
                  taskId,
                  stepIndex: i,
                  attempt: retryCount,
                });
              } else if (recovery.strategy === 'skip') {
                logger.info('Skipping failed step', { taskId, stepIndex: i, reason: recovery.reason });
                break;
              } else {
                // Abort
                await prisma.agentTask.update({
                  where: { id: taskId },
                  data: { status: 'failed', error: recovery.reason, completedAt: new Date() },
                });
                return {
                  taskId,
                  status: 'failed',
                  message: `Task failed at step ${i + 1}: ${recovery.reason}`,
                  totalSteps: currentPlan.length,
                  completedSteps,
                  awaitingApproval: false,
                };
              }
            }
          }
        } catch (err) {
          retryCount++;
          logger.error(`Tool execution error (attempt ${retryCount})`, {
            taskId,
            tool: step.toolName,
            error: (err as Error).message,
          });

          if (retryCount > MAX_RETRIES) {
            await prisma.agentAction.update({
              where: { id: action.id },
              data: {
                status: 'failed',
                toolOutput: { error: (err as Error).message } as any,
              },
            });

            // Try recovery
            const recovery = await this.attemptRecovery(
              step,
              { success: false, data: null, error: (err as Error).message },
              context,
              budget,
            );
            if (recovery.strategy === 'skip') {
              break;
            }
            // Abort on unrecoverable error
            await prisma.agentTask.update({
              where: { id: taskId },
              data: { status: 'failed', error: (err as Error).message, completedAt: new Date() },
            });
            return {
              taskId,
              status: 'failed',
              message: `Task failed at step ${i + 1}: ${(err as Error).message}`,
              totalSteps: currentPlan.length,
              completedSteps,
              awaitingApproval: false,
            };
          }
        }
      }
    }

    // All steps completed — generate summary
    const summary = await this.generateSummary(taskId, plan, executionLog, context);

    await prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        result: {
          summary,
          executionLog: executionLog.map((e) => ({ step: e.step, tool: e.tool })),
          ...(budget ? {
            tokenUsage: {
              totalTokens: budget.totalTokens,
              inputTokens: budget.totalInputTokens,
              outputTokens: budget.totalOutputTokens,
              totalCostCents: budget.totalCostCents,
              llmCallCount: budget.llmCallCount,
            },
          } : {}),
        } as any,
      },
    });

    return {
      taskId,
      status: 'completed',
      message: summary,
      totalSteps: currentPlan.length,
      completedSteps,
      awaitingApproval: false,
    };
  }

  /**
   * OBSERVE: After each step, ask LLM if the plan needs adjustment.
   */
  private async observe(
    taskId: string,
    plan: AgentStep[],
    currentIndex: number,
    result: ToolResult,
    context: AgentContext,
    executionLog: Array<{ step: number; tool: string; result: ToolResult }>,
    budget?: TaskTokenBudget,
  ): Promise<{ decision: 'continue' | 'replan' | 'abort'; reason: string; updatedSteps?: AgentStep[] }> {
    try {
      const messages: LLMMessage[] = [
        { role: 'system', content: OBSERVE_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `## Task Context
Task ID: ${taskId}
User: ${context.userName} (${context.roleCategory})

## Completed Step (${currentIndex + 1}/${plan.length})
Tool: ${plan[currentIndex].toolName}
Reasoning: ${plan[currentIndex].reasoning}
Result: ${JSON.stringify(result.data).slice(0, 3000)}

## Remaining Steps
${plan
  .slice(currentIndex + 1)
  .map((s, i) => `${currentIndex + 2 + i}. ${s.toolName}: ${s.reasoning}`)
  .join('\n')}

## Previous Results Summary
${executionLog.slice(-3).map((e) => `Step ${e.step + 1} (${e.tool}): ${e.result.success ? 'success' : 'failed'}`).join('\n')}

Should we continue, replan, or abort?`,
        },
      ];

      const response = await llmClient.chat(messages, {
        noCache: true,
        temperature: 0.1,
        maxTokens: 2048,
        model: 'gemini-2.0-flash',
        provider: 'gemini',
        jsonMode: true, // R10: Structured output for observe calls
      });

      // Track token usage for observation call
      if (budget) {
        budget.record(response.inputTokens, response.outputTokens, response.costCents);
      }

      // R10: Use robust multi-strategy parser instead of fragile regex
      const parsed = parseJsonResponse<{ decision?: string; reason?: string; updatedSteps?: AgentStep[] }>(
        response.content,
        'object',
      );
      if (!parsed) return { decision: 'continue', reason: 'Could not parse observation' };

      return {
        decision: (parsed.decision as 'continue' | 'replan' | 'abort') || 'continue',
        reason: parsed.reason || '',
        updatedSteps: parsed.updatedSteps,
      };
    } catch (err) {
      logger.warn('Observe step failed, continuing', { error: (err as Error).message });
      return { decision: 'continue', reason: 'Observation failed, continuing with original plan' };
    }
  }

  /**
   * SELF-CORRECT: When a tool fails, ask LLM for recovery strategy.
   */
  private async attemptRecovery(
    step: AgentStep,
    failedResult: ToolResult,
    context: AgentContext,
    budget?: TaskTokenBudget,
  ): Promise<{ strategy: 'retry_different' | 'skip' | 'abort'; reason: string; alternativeStep?: AgentStep }> {
    try {
      const messages: LLMMessage[] = [
        { role: 'system', content: RECOVERY_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `## Failed Step
Tool: ${step.toolName}
Input: ${JSON.stringify(step.toolInput)}
Reasoning: ${step.reasoning}
Error: ${failedResult.error || 'Unknown error'}

## Context
User: ${context.userName} (${context.roleCategory})

Suggest a recovery strategy.`,
        },
      ];

      const response = await llmClient.chat(messages, {
        noCache: true,
        temperature: 0.1,
        maxTokens: 1024,
        model: 'gemini-2.0-flash',
        provider: 'gemini',
        jsonMode: true, // R10: Structured output for recovery calls
      });

      // Track token usage for recovery call
      if (budget) {
        budget.record(response.inputTokens, response.outputTokens, response.costCents);
      }

      // R10: Use robust multi-strategy parser instead of fragile regex
      const parsed = parseJsonResponse<{ strategy?: string; reason?: string; alternativeStep?: AgentStep }>(
        response.content,
        'object',
      );
      if (!parsed) return { strategy: 'skip', reason: 'Could not parse recovery response' };

      return {
        strategy: (parsed.strategy as 'retry_different' | 'skip' | 'abort') || 'skip',
        reason: parsed.reason || '',
        alternativeStep: parsed.alternativeStep,
      };
    } catch (err) {
      logger.warn('Recovery attempt failed', { error: (err as Error).message });
      return { strategy: 'skip', reason: 'Recovery failed, skipping step' };
    }
  }

  /**
   * Generate a human-readable summary of the completed task.
   */
  private async generateSummary(
    taskId: string,
    plan: AgentStep[],
    executionLog: Array<{ step: number; tool: string; result: ToolResult }>,
    context: AgentContext,
  ): Promise<string> {
    try {
      const task = await prisma.agentTask.findUnique({ where: { id: taskId } });

      const messages: LLMMessage[] = [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `## Original Goal
${task?.goal || 'Unknown'}

## Execution Plan
${plan.map((s, i) => `${i + 1}. [${s.toolName}] ${s.reasoning}`).join('\n')}

## Execution Results
${executionLog
  .map(
    (e) =>
      `Step ${e.step + 1} (${e.tool}): ${e.result.success ? 'SUCCESS' : 'FAILED'}${
        e.result.data ? '\nData: ' + JSON.stringify(e.result.data).slice(0, 500) : ''
      }`,
  )
  .join('\n\n')}

## Context
User: ${context.userName}
Company: ${context.tenantName}

Generate a clear summary.`,
        },
      ];

      const response = await llmClient.chat(messages, {
        noCache: true,
        temperature: 0.3,
        maxTokens: 1500,
      });

      return response.content;
    } catch (err) {
      logger.warn('Summary generation failed', { error: (err as Error).message });
      return `Task completed with ${executionLog.filter((e) => e.result.success).length}/${plan.length} steps successful.`;
    }
  }

  /**
   * Resume a task after user approves a pending action.
   */
  async approveAction(actionId: string, approverUserId: string): Promise<TaskExecutionResult> {
    const action = await prisma.agentAction.findUnique({
      where: { id: actionId },
      include: { task: true },
    });

    if (!action) throw new Error('Action not found');
    if (action.status !== 'awaiting_approval') {
      throw new Error(`Action is not awaiting approval (status: ${action.status})`);
    }

    const task = action.task;
    const toolDef = toolRegistry.getTool(action.toolName);
    if (!toolDef) throw new Error(`Tool ${action.toolName} not found`);

    // Execute the approved tool
    const stepStart = Date.now();
    const result = await toolDef.execute(
      task.tenantId,
      task.userId,
      action.toolInput as Record<string, unknown>,
    );
    const latencyMs = Date.now() - stepStart;

    await prisma.agentAction.update({
      where: { id: actionId },
      data: {
        status: 'approved',
        approvedBy: approverUserId,
        approvedAt: new Date(),
        toolOutput: result as any,
        latencyMs,
      },
    });

    auditLogger(
      'AI_ACTION_APPROVED',
      approverUserId,
      task.tenantId,
      'agent_action',
      actionId,
      { taskId: task.id, toolName: action.toolName },
    );

    // Resume task execution from next step
    const plan = (task.plan as unknown as AgentStep[]) || [];
    const nextStep = action.stepIndex + 1;

    if (nextStep >= plan.length) {
      // This was the last step — complete the task
      const context = await this.buildContext(task.tenantId, task.userId);
      const summary = await this.generateSummary(
        task.id,
        plan,
        [{ step: action.stepIndex, tool: action.toolName, result }],
        context,
      );

      await prisma.agentTask.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          currentStep: nextStep,
          result: { summary } as any,
        },
      });

      return {
        taskId: task.id,
        status: 'completed',
        message: summary,
        totalSteps: plan.length,
        completedSteps: nextStep,
        awaitingApproval: false,
      };
    }

    // Continue with remaining steps
    await prisma.agentTask.update({
      where: { id: task.id },
      data: { status: 'executing', currentStep: nextStep },
    });

    const context = await this.buildContext(task.tenantId, task.userId);
    const remainingPlan = plan.slice(nextStep);
    return this.executeSteps(task.id, remainingPlan, context);
  }

  /**
   * Reject a pending action — ask LLM to replan without it.
   */
  async rejectAction(actionId: string, reason: string): Promise<TaskExecutionResult> {
    const action = await prisma.agentAction.findUnique({
      where: { id: actionId },
      include: { task: true },
    });

    if (!action) throw new Error('Action not found');
    if (action.status !== 'awaiting_approval') {
      throw new Error(`Action is not awaiting approval (status: ${action.status})`);
    }

    await prisma.agentAction.update({
      where: { id: actionId },
      data: { status: 'rejected', rejectionReason: reason },
    });

    auditLogger(
      'AI_ACTION_REJECTED',
      action.task.userId,
      action.task.tenantId,
      'agent_action',
      actionId,
      { taskId: action.task.id, reason },
    );

    // Ask LLM to replan the remaining steps without the rejected action
    const task = action.task;
    const plan = (task.plan as unknown as AgentStep[]) || [];
    const context = await this.buildContext(task.tenantId, task.userId);

    const availableTools = toolRegistry.getToolsForRole(context.roleCategory);
    const toolSchemas = toolRegistry.getToolSchemas(availableTools);

    const messages: LLMMessage[] = [
      { role: 'system', content: PLANNING_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `The user rejected step ${action.stepIndex + 1} of the plan.
Rejected tool: ${action.toolName}
Rejection reason: ${reason}

Original goal: ${task.goal}

Completed steps so far:
${plan.slice(0, action.stepIndex).map((s, i) => `${i + 1}. [${s.toolName}] ${s.reasoning} — DONE`).join('\n')}

Please create an updated plan for the remaining work that avoids the rejected action.
Available tools: ${toolSchemas.map((t) => t.name).join(', ')}

Respond with a JSON array of remaining steps.`,
      },
    ];

    try {
      const response = await llmClient.chat(messages, {
        noCache: true,
        temperature: 0.2,
        maxTokens: 2048,
        jsonMode: true, // R10: Structured output for replan-after-rejection
      });

      // R10: Use robust multi-strategy parser
      const newSteps = parseJsonResponse<AgentStep[]>(response.content, 'array');
      if (newSteps && newSteps.length > 0) {
        const annotatedSteps = newSteps.map((step) => {
          const toolDef = toolRegistry.getTool(step.toolName);
          return {
            ...step,
            impactLevel: toolDef?.impactLevel || 'read',
            requiresApproval: toolDef?.requiresApproval || false,
          };
        });

        const updatedPlan = [...plan.slice(0, action.stepIndex), ...annotatedSteps];
        await prisma.agentTask.update({
          where: { id: task.id },
          data: {
            plan: updatedPlan as any,
            totalSteps: updatedPlan.length,
            status: 'executing',
            currentStep: action.stepIndex,
          },
        });

        return this.executeSteps(task.id, annotatedSteps, context);
      }
    } catch (err) {
      logger.error('Replan after rejection failed', { taskId: task.id, error: (err as Error).message });
    }

    // If replan fails, complete task with partial results
    await prisma.agentTask.update({
      where: { id: task.id },
      data: { status: 'completed', completedAt: new Date() },
    });

    return {
      taskId: task.id,
      status: 'completed',
      message: `Task completed with ${action.stepIndex} steps. Step "${action.toolName}" was rejected: ${reason}`,
      totalSteps: plan.length,
      completedSteps: action.stepIndex,
      awaitingApproval: false,
    };
  }

  /**
   * Cancel a running or awaiting task.
   */
  async cancelTask(taskId: string): Promise<void> {
    await prisma.agentTask.update({
      where: { id: taskId },
      data: { status: 'cancelled', completedAt: new Date() },
    });
    logger.info('Agentic task cancelled', { taskId });
  }

  /**
   * Build context for the task executor (reuses BaseAgent pattern).
   */
  private async buildContext(tenantId: string, userId: string): Promise<AgentContext> {
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

    const roles = user?.userRoles.map((ur) => ur.role.name) ?? [];

    return {
      tenantId,
      userId,
      userRoles: roles,
      roleCategory: resolveRoleCategory(roles),
      userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
      tenantName: tenant?.name ?? 'Unknown Tenant',
      userLevel: user?.level ?? undefined,
      userDepartment: user?.departmentId ?? undefined,
    };
  }
}

/** Singleton agentic engine instance */
export const agenticEngine = new AgenticExecutionEngine();
