/**
 * Agent Coordinator — Multi-agent task decomposition & parallel execution.
 *
 * This is the brain of true multi-agent agentic AI.
 * When a complex goal spans multiple domains, the coordinator:
 * 1. Analyzes the goal and determines which specialist agents are needed
 * 2. Decomposes the goal into sub-tasks with dependency ordering
 * 3. Executes sub-tasks in parallel where possible, sequentially where dependent
 * 4. Passes context from completed sub-tasks to dependent ones
 * 5. Synthesizes all results into a unified response
 *
 * Each sub-task creates its own AgentTask linked to a parent coordinator task,
 * making the entire multi-agent flow auditable and visible in the Tasks UI.
 */

import { prisma } from '@pms/database';
import { logger, auditLogger } from '../../utils/logger';
import { llmClient, type LLMMessage } from './llm-client';
import type { AgentResponse } from './base-agent';
import { agentOrchestrator } from './orchestrator';
import { agentMemory } from './agent-memory';

// ── Agent Display Names ──────────────────────────────────

const AGENT_LABELS: Record<string, string> = {
  performance: 'Performance Analytics',
  nlp_query: 'Data Query',
  coaching: 'Coaching',
  career: 'Career Development',
  report: 'Reports',
  workforce_intel: 'Workforce Intelligence',
  governance: 'Governance & Compliance',
  strategic_alignment: 'Strategic Alignment',
  talent_marketplace: 'Talent Marketplace',
  conflict_resolution: 'Conflict Resolution',
  security: 'Security',
  notification: 'Notification',
  onboarding: 'Onboarding',
  license: 'License Management',
  excel_validation: 'Excel Validation',
  goal_intelligence: 'Goal Intelligence',
  performance_signal: 'Performance Signal',
  review_drafter: 'Review Drafter',
  compensation_promotion: 'Compensation & Promotion',
  one_on_one_advisor: '1:1 Advisor',
  neuro_focus: 'Neuro Focus',
  circadian_sync: 'Circadian Sync',
  micro_break: 'Micro Break',
  cortisol_monitor: 'Cortisol Monitor',
  burnout_interceptor: 'Burnout Guard',
  sleep_optimizer: 'Sleep Optimizer',
  ergonomics: 'Ergonomics',
  hydration_nutrition: 'Hydration & Nutrition',
  vocal_tone: 'Vocal Tone',
  environment_ctrl: 'Environment Control',
  shadow_learning: 'Shadow Learning',
  micro_learning: 'Micro Learning',
  ar_mentor: 'AR Mentor',
  sparring_partner: 'Sparring Partner',
  skill_gap_forecaster: 'Skill Forecast',
  knowledge_broker: 'Knowledge Broker',
  credential_ledger: 'Credentials',
  linguistic_refiner: 'Linguistic Refiner',
  curiosity_scout: 'Curiosity Scout',
  logic_validator: 'Logic Validator',
  cross_training: 'Cross-Training',
  career_sim: 'Career Simulation',
  task_bidder: 'Task Bidder',
  gig_sourcer: 'Gig Sourcer',
  nano_payment: 'Nano Payment',
  market_value: 'Market Value',
  tax_optimizer: 'Tax Optimizer',
  equity_realizer: 'Equity Realizer',
  pension_guard: 'Pension Guard',
  relocation_bot: 'Relocation',
  vendor_negotiator: 'Vendor Negotiator',
  succession_sentry: 'Succession Planning',
  culture_weaver: 'Culture Weaver',
  bias_neutralizer: 'Bias Neutralizer',
  gratitude_sentinel: 'Gratitude Sentinel',
  conflict_mediator: 'Conflict Mediator',
  inclusion_monitor: 'Inclusion Monitor',
  empathy_coach: 'Empathy Coach',
  social_bonding: 'Social Bonding',
  legacy_archivist: 'Legacy Archivist',
  whistleblower: 'Whistleblower',
  mood_radiator: 'Mood Radiator',
  posh_sentinel: 'POSH Compliance',
  labor_compliance: 'Labor Compliance',
  policy_translator: 'Policy Translator',
  data_privacy: 'Data Privacy',
  audit_trail: 'Audit Trail',
  conflict_of_interest: 'Conflict of Interest',
  leave_optimizer: 'Leave Optimizer',
  onboarding_orchestrator: 'Onboarding Orchestrator',
};

function formatAgentName(agentType: string): string {
  if (AGENT_LABELS[agentType]) return AGENT_LABELS[agentType];
  return agentType
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Types ─────────────────────────────────────────────────

interface SubTaskPlan {
  agentType: string;
  subGoal: string;
  dependsOn: number[]; // Indices of sub-tasks this depends on
  reasoning: string;
}

interface SubTaskResult {
  index: number;
  agentType: string;
  subGoal: string;
  status: 'completed' | 'failed';
  response: string;
  taskId?: string;
  data?: Record<string, unknown>;
}

export interface CoordinationResult {
  parentTaskId: string;
  status: 'completed' | 'failed' | 'awaiting_approval';
  message: string;
  subTasks: SubTaskResult[];
  totalAgents: number;
  completedAgents: number;
}

// ── Constants ─────────────────────────────────────────────

/** Maximum number of sub-tasks that can execute concurrently within a coordination level.
 *  Set to 1 to force sequential execution — essential for rate-limited LLM providers
 *  like Groq (30 req/min). Each sub-task triggers 1+ LLM calls; running 3 in parallel
 *  instantly exhausts the rate limit window. */
const MAX_CONCURRENT_SUBTASKS = 1;
/** Delay between sequential sub-task executions to let rate-limit windows clear */
const SUBTASK_DELAY_MS = 2000;
/** Maximum sub-tasks a coordinator can decompose a goal into */
const MAX_SUBTASKS = 6;

// ── Concurrency Limiter ───────────────────────────────────

/**
 * Simple semaphore-based concurrency limiter.
 * Ensures no more than `limit` promises run simultaneously.
 */
function limitConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
  delayMs = 0,
): Promise<PromiseSettledResult<T>[]> {
  return new Promise((resolve) => {
    const results: PromiseSettledResult<T>[] = new Array(tasks.length);
    let running = 0;
    let next = 0;
    let settled = 0;

    function run(): void {
      while (running < limit && next < tasks.length) {
        const index = next++;
        running++;
        tasks[index]()
          .then((value) => {
            results[index] = { status: 'fulfilled', value };
          })
          .catch((reason) => {
            results[index] = { status: 'rejected', reason };
          })
          .finally(() => {
            running--;
            settled++;
            if (settled === tasks.length) {
              resolve(results);
            } else if (delayMs > 0) {
              // Rate-limit-aware: wait between sequential task executions
              // to let the LLM provider's rate-limit window clear.
              setTimeout(run, delayMs);
            } else {
              run();
            }
          });
      }
    }

    if (tasks.length === 0) {
      resolve([]);
    } else {
      run();
    }
  });
}

// ── Robust JSON Parser ──────────────────────────────────────

/**
 * Multi-strategy JSON parser for LLM responses (R10).
 * Same logic as agentic-engine.ts — duplicated to avoid circular imports.
 */
function parseJsonResponse<T>(content: string, type: 'array' | 'object'): T | null {
  const trimmed = content.trim();

  // Strategy 1: Direct parse
  try {
    const parsed = JSON.parse(trimmed);
    if (type === 'array' && Array.isArray(parsed)) return parsed as T;
    if (type === 'object' && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as T;
    if (type === 'array' && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const values = Object.values(parsed);
      if (values.length === 1 && Array.isArray(values[0])) return values[0] as T;
    }
  } catch {
    // Not clean JSON
  }

  // Strategy 2: Code block extraction
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

  // Strategy 3: Regex extraction (last resort)
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

// ── Prompts ───────────────────────────────────────────────

const DECOMPOSITION_PROMPT = `You are a task coordinator for a Performance Management System with 70 specialized AI agents.

Your job: Break down a complex goal into sub-tasks, each assigned to the most appropriate specialist agent.

Available agent clusters and their specialties:
- performance: Performance reviews, metrics, tracking
- goal_intelligence: SMART goals, goal alignment, OKR management
- coaching: Career coaching, development recommendations
- workforce_intel: Team analytics, workforce insights, org health
- burnout_interceptor: Burnout detection, work-life balance, overwork patterns
- performance_signal: Performance evidence, signal-to-goal mapping
- review_drafter: Writing self-reviews, manager reviews
- compensation_promotion: Pay equity, promotion readiness
- one_on_one_advisor: 1:1 meeting prep, conversation guides
- career: Career pathing, growth opportunities
- strategic_alignment: OKR alignment, strategy cascade
- talent_marketplace: Internal mobility, skill matching
- conflict_resolution: Conflict mediation, resolution strategies
- report: Data reports, analytics summaries
- security: Access audit, compliance checks
- notification: Sending alerts and reminders
- license: License management and usage
- skill_gap_forecaster: Future skill needs, training gaps
- culture_weaver: Culture analysis, values alignment
- bias_neutralizer: Bias detection, fairness analysis
- empathy_coach: Empathy development, emotional intelligence
- inclusion_monitor: DEI metrics, inclusion tracking

RULES:
1. Assign each sub-task to exactly ONE agent
2. Use dependsOn to express ordering — subtasks with no deps run in parallel
3. Keep sub-tasks focused — each agent should have a clear, specific goal
4. Maximum 6 sub-tasks (avoid over-decomposition)
5. Pass context between steps — later steps should reference data from earlier ones

Respond with a JSON array:
[
  {"agentType": "performance", "subGoal": "Analyze team performance metrics for the last quarter", "dependsOn": [], "reasoning": "Need baseline data first"},
  {"agentType": "burnout_interceptor", "subGoal": "Check burnout risk for team members", "dependsOn": [], "reasoning": "Can run in parallel with performance analysis"},
  {"agentType": "goal_intelligence", "subGoal": "Create improvement goals for struggling members based on performance data", "dependsOn": [0, 1], "reasoning": "Needs performance + burnout data to create relevant goals"}
]`;

const SYNTHESIS_PROMPT = `You are synthesizing the results from multiple specialist AI agents who collaborated on a complex task.

Create a comprehensive, well-organized summary that:
1. Highlights the most important findings across all agents
2. Shows how the agents' work connects (e.g., performance data → goals → coaching tips)
3. Lists any actions that were taken (goals created, notifications sent, etc.)
4. Flags anything that requires user attention (pending approvals, warnings)

Use markdown formatting. Be concise but thorough.`;

// ── Agent Coordinator ─────────────────────────────────────

class AgentCoordinator {
  /**
   * Coordinate a multi-agent task execution.
   * Decomposes the goal, executes sub-tasks in dependency order, and synthesizes results.
   */
  async coordinateTask(
    tenantId: string,
    userId: string,
    goal: string,
    agentTypes: string[],
    conversationId?: string,
  ): Promise<CoordinationResult> {
    const start = Date.now();

    // 1. Create parent coordinator task
    const parentTask = await prisma.agentTask.create({
      data: {
        tenantId,
        userId,
        agentType: 'coordinator',
        title: goal.length > 100 ? goal.slice(0, 97) + '...' : goal,
        goal,
        status: 'planning',
        conversationId: conversationId || null,
      },
    });

    logger.info('Coordinator task created', {
      taskId: parentTask.id,
      goal: goal.slice(0, 100),
      agentTypes,
    });

    try {
      // 2. Decompose goal into sub-tasks
      const subTaskPlan = await this.decomposeGoal(goal, agentTypes);

      if (!subTaskPlan || subTaskPlan.length === 0) {
        await prisma.agentTask.update({
          where: { id: parentTask.id },
          data: {
            status: 'failed',
            error: 'Could not decompose goal into sub-tasks',
            completedAt: new Date(),
          },
        });
        return {
          parentTaskId: parentTask.id,
          status: 'failed',
          message: 'I could not break this goal into sub-tasks. Try rephrasing or being more specific.',
          subTasks: [],
          totalAgents: 0,
          completedAgents: 0,
        };
      }

      // 3. Update parent task with plan
      await prisma.agentTask.update({
        where: { id: parentTask.id },
        data: {
          plan: subTaskPlan as any,
          totalSteps: subTaskPlan.length,
          status: 'executing',
          startedAt: new Date(),
        },
      });

      // 4. Execute sub-tasks in dependency order
      const results = await this.executeSubTasks(
        tenantId,
        userId,
        parentTask.id,
        subTaskPlan,
        conversationId,
      );

      // 5. Check for any awaiting approval
      const awaitingApproval = results.some(
        (r) => r.status === 'completed' && r.data?.taskStatus === 'awaiting_approval',
      );

      // 6. Synthesize results
      const synthesizedMessage = await this.synthesizeResults(goal, results);

      // 7. Complete parent task
      const completedCount = results.filter((r) => r.status === 'completed').length;
      const finalStatus = awaitingApproval
        ? 'awaiting_approval'
        : completedCount === results.length
          ? 'completed'
          : 'failed';

      await prisma.agentTask.update({
        where: { id: parentTask.id },
        data: {
          status: finalStatus === 'awaiting_approval' ? 'awaiting_approval' : finalStatus,
          completedAt: new Date(),
          currentStep: completedCount,
          result: {
            summary: synthesizedMessage,
            subTaskResults: results.map((r) => ({
              agentType: r.agentType,
              status: r.status,
              taskId: r.taskId,
            })),
          } as any,
        },
      });

      auditLogger(
        'AI_COORDINATED_TASK_COMPLETED',
        userId,
        tenantId,
        'agent_task',
        parentTask.id,
        {
          totalAgents: results.length,
          completedAgents: completedCount,
          durationMs: Date.now() - start,
        },
      );

      return {
        parentTaskId: parentTask.id,
        status: finalStatus as CoordinationResult['status'],
        message: synthesizedMessage,
        subTasks: results,
        totalAgents: results.length,
        completedAgents: completedCount,
      };
    } catch (err) {
      logger.error('Coordination failed', {
        taskId: parentTask.id,
        error: (err as Error).message,
      });

      await prisma.agentTask.update({
        where: { id: parentTask.id },
        data: {
          status: 'failed',
          error: (err as Error).message,
          completedAt: new Date(),
        },
      });

      return {
        parentTaskId: parentTask.id,
        status: 'failed',
        message: `Multi-agent coordination failed: ${(err as Error).message}`,
        subTasks: [],
        totalAgents: 0,
        completedAgents: 0,
      };
    }
  }

  /**
   * Decompose a complex goal into sub-tasks with agent assignments.
   */
  private async decomposeGoal(
    goal: string,
    suggestedAgents: string[],
  ): Promise<SubTaskPlan[]> {
    const messages: LLMMessage[] = [
      { role: 'system', content: DECOMPOSITION_PROMPT },
      {
        role: 'user',
        content: `Goal: "${goal}"\n\nSuggested agents (you may add others if needed): ${suggestedAgents.join(', ')}\n\nDecompose this into sub-tasks.`,
      },
    ];

    const response = await llmClient.chat(messages, {
      temperature: 0.2,
      maxTokens: 2000,
      jsonMode: true, // R10: Structured output for decomposition
    });

    // R10: Use robust multi-strategy parser instead of fragile regex
    const parsed = parseJsonResponse<SubTaskPlan[]>(response.content, 'array');

    if (!parsed || parsed.length === 0) {
      logger.warn('Failed to parse decomposition: no valid JSON array found', {
        content: response.content.slice(0, 200),
      });
      return [];
    }

    // Validate: ensure all agentTypes are valid
    const validAgents = agentOrchestrator.getAvailableAgents();
    return parsed
      .filter(
        (p) =>
          validAgents.includes(p.agentType) &&
          typeof p.subGoal === 'string' &&
          Array.isArray(p.dependsOn),
      )
      .slice(0, MAX_SUBTASKS); // Hard cap to prevent over-decomposition
  }

  /**
   * Execute sub-tasks respecting dependency ordering.
   * Tasks at the same dependency level run in parallel.
   */
  private async executeSubTasks(
    tenantId: string,
    userId: string,
    parentTaskId: string,
    plan: SubTaskPlan[],
    conversationId?: string,
  ): Promise<SubTaskResult[]> {
    const results: SubTaskResult[] = new Array(plan.length);
    const completed = new Set<number>();

    // Build dependency levels
    const levels = this.buildExecutionLevels(plan);

    for (const level of levels) {
      // Execute tasks at this level sequentially with rate-limit delay
      const levelTasks = level.map((index) => async () => {
        const subTask = plan[index];

        // Gather context from completed dependencies
        const depContext = subTask.dependsOn
          .filter((d) => completed.has(d))
          .map(
            (d) =>
              `[${plan[d].agentType}] Result: ${results[d]?.response?.slice(0, 2000) || 'No response'}`,
          )
          .join('\n\n');

        const fullGoal = depContext
          ? `${subTask.subGoal}\n\n--- Context from previous agents ---\n${depContext}`
          : subTask.subGoal;

        try {
          // Create child task record
          const childTask = await prisma.agentTask.create({
            data: {
              tenantId,
              userId,
              agentType: subTask.agentType,
              parentTaskId,
              title: `[${subTask.agentType}] ${subTask.subGoal.slice(0, 80)}`,
              goal: fullGoal,
              status: 'executing',
              startedAt: new Date(),
              totalSteps: 1,
            },
          });

          // Route to the specialist agent via orchestrator
          // delegationDepth=1 since coordinator is one level of delegation
          const agentResponse = await agentOrchestrator.routeMessage(
            tenantId,
            userId,
            fullGoal,
            subTask.agentType,
            conversationId,
            1, // coordinator sub-tasks start at delegation depth 1
          );

          // Mark child task complete
          await prisma.agentTask.update({
            where: { id: childTask.id },
            data: {
              status: agentResponse.taskId ? 'executing' : 'completed',
              completedAt: agentResponse.taskId ? undefined : new Date(),
              currentStep: 1,
              result: {
                message: agentResponse.message.slice(0, 2000),
                agentType: agentResponse.agentType,
                taskId: agentResponse.taskId,
              } as any,
            },
          });

          results[index] = {
            index,
            agentType: subTask.agentType,
            subGoal: subTask.subGoal,
            status: 'completed',
            response: agentResponse.message,
            taskId: agentResponse.taskId || childTask.id,
            data: agentResponse.data as Record<string, unknown> | undefined,
          };

          logger.info('Sub-task completed', {
            parentTaskId,
            agentType: subTask.agentType,
            index,
          });
        } catch (err) {
          results[index] = {
            index,
            agentType: subTask.agentType,
            subGoal: subTask.subGoal,
            status: 'failed',
            response: `Agent ${subTask.agentType} failed: ${(err as Error).message}`,
          };

          logger.error('Sub-task failed', {
            parentTaskId,
            agentType: subTask.agentType,
            index,
            error: (err as Error).message,
          });
        }

        completed.add(index);
      });

      // Wait for all tasks at this level with concurrency limit + delay
      await limitConcurrency(levelTasks, MAX_CONCURRENT_SUBTASKS, SUBTASK_DELAY_MS);

      // Update parent progress
      await prisma.agentTask.update({
        where: { id: parentTaskId },
        data: { currentStep: completed.size },
      });
    }

    return results;
  }

  /**
   * Build execution levels from dependency graph.
   * Level 0: no dependencies (run first, in parallel)
   * Level 1: depends only on level 0 tasks (run second)
   * etc.
   */
  private buildExecutionLevels(plan: SubTaskPlan[]): number[][] {
    const levels: number[][] = [];
    const placed = new Set<number>();

    // Safety limit to prevent infinite loops
    let iteration = 0;
    const maxIterations = plan.length + 1;

    while (placed.size < plan.length && iteration < maxIterations) {
      const currentLevel: number[] = [];

      for (let i = 0; i < plan.length; i++) {
        if (placed.has(i)) continue;

        // Check if all dependencies are already placed
        const allDepsPlaced = plan[i].dependsOn.every((d) => placed.has(d));
        if (allDepsPlaced) {
          currentLevel.push(i);
        }
      }

      if (currentLevel.length === 0) {
        // Circular dependency — force remaining into this level
        for (let i = 0; i < plan.length; i++) {
          if (!placed.has(i)) currentLevel.push(i);
        }
      }

      currentLevel.forEach((i) => placed.add(i));
      levels.push(currentLevel);
      iteration++;
    }

    return levels;
  }

  /**
   * Synthesize results from all sub-tasks into a unified response.
   */
  private async synthesizeResults(
    goal: string,
    results: SubTaskResult[],
  ): Promise<string> {
    const resultsSummary = results
      .map(
        (r) =>
          `### Agent: ${formatAgentName(r.agentType)} (${r.status})\n` +
          `**Sub-task:** ${r.subGoal}\n` +
          `**Result:** ${r.response.slice(0, 1500)}`,
      )
      .join('\n\n---\n\n');

    const messages: LLMMessage[] = [
      { role: 'system', content: SYNTHESIS_PROMPT },
      {
        role: 'user',
        content: `Original goal: "${goal}"\n\n## Agent Results\n\n${resultsSummary}`,
      },
    ];

    try {
      const response = await llmClient.chat(messages, {
        temperature: 0.3,
        maxTokens: 2000,
      });
      return response.content;
    } catch (err) {
      // Fallback: just concatenate results
      return (
        `## Coordinated Task Results\n\n` +
        results
          .map((r) => `### ${formatAgentName(r.agentType)}\n${r.response.slice(0, 500)}`)
          .join('\n\n')
      );
    }
  }
}

export const agentCoordinator = new AgentCoordinator();
