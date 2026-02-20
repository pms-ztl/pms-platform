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
import { isSuperAdmin, isAdmin, isManager, isEmployeeOnly } from '../../utils/roles';
import { llmClient, type LLMMessage, type LLMResponse, type LLMProvider } from './llm-client';
import { agentMemory } from './agent-memory';

// ── Role Category (for RBAC) ─────────────────────────────
export type RoleCategory = 'super_admin' | 'admin' | 'manager' | 'employee';

export function resolveRoleCategory(roles: string[]): RoleCategory {
  if (isSuperAdmin(roles)) return 'super_admin';
  if (isAdmin(roles)) return 'admin';
  if (isManager(roles)) return 'manager';
  return 'employee';
}

// ── Model Tier Presets ───────────────────────────────────

export const MODEL_TIERS = {
  /** Economy: Gemini Flash — fast, cheap, good for advisory agents */
  economy: { model: 'gemini-2.0-flash', provider: 'gemini' as LLMProvider },
  /** Standard: Uses primary provider (Claude Sonnet) — balanced */
  standard: {},
  /** Premium: Claude Sonnet — complex reasoning, sensitive topics */
  premium: { model: 'claude-sonnet-4-20250514', provider: 'anthropic' as LLMProvider },
} as const;

// ── Types ──────────────────────────────────────────────────

export interface AgentContext {
  tenantId: string;
  userId: string;
  userRoles: string[];
  /** Resolved RBAC tier: super_admin > admin > manager > employee */
  roleCategory: RoleCategory;
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

      // 4. REASON — call LLM (merge per-agent model tier options)
      const agentLLMOpts = this.getLLMOptions();
      const llmResponse = await llmClient.chat(messages, {
        tenantId,
        maxTokens: agentLLMOpts.maxTokens ?? 2048,
        temperature: agentLLMOpts.temperature ?? 0.3,
        noCache: true, // Don't cache conversation responses
        ...(agentLLMOpts.model ? { model: agentLLMOpts.model } : {}),
        ...(agentLLMOpts.provider ? { provider: agentLLMOpts.provider } : {}),
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

  /**
   * Build the system message with context injection and RBAC enforcement.
   */
  protected buildSystemMessage(context: AgentContext): string {
    const rbacBlock = this.buildRBACBlock(context);

    return `${this.systemPrompt}

== User Context ==
User: ${context.userName}
Role: ${context.roleCategory.toUpperCase()} (${context.userRoles.join(', ')})
Company: ${context.tenantName}
${context.userLevel ? `Level: L${context.userLevel}` : ''}

== General Rules ==
- You are an AI assistant for the PMS (Performance Management System) platform.
- Always respond helpfully and professionally.
- Only discuss data relevant to this user's tenant (company: ${context.tenantName}).
- Never reveal data from other companies/tenants.
- If you don't have enough data to answer, say so clearly.
- Format responses with markdown for readability.
- Keep responses concise but informative.

${rbacBlock}`;
  }

  /**
   * Build role-specific access rules that the LLM MUST follow.
   */
  private buildRBACBlock(context: AgentContext): string {
    switch (context.roleCategory) {
      case 'super_admin':
        return `== Access Level: SUPER ADMIN ==
You have full platform access. You may discuss:
- All tenant data, cross-tenant comparisons, platform-wide metrics
- License counts, subscription plans, billing, revenue data
- Security audit logs, failed login attempts, threat analysis
- All employee data across the organization
- System configuration, infrastructure status`;

      case 'admin':
        return `== Access Level: TENANT ADMIN ==
You have full access within this tenant. You may discuss:
- All employee data within ${context.tenantName}
- License usage, seat counts, subscription status for this tenant
- Audit logs, security events for this tenant
- Department-level and company-wide analytics
- User management, role assignments, settings

You MUST NOT:
- Reveal data from other tenants
- Discuss platform-wide revenue or billing details (super admin only)`;

      case 'manager':
        return `== Access Level: MANAGER / HR ==
You have team-level and departmental access. You may discuss:
- Performance data for the user's direct reports and team members
- Team-level analytics, department-level aggregates
- Goal progress and review status for the user's team
- Coaching recommendations for team members
- General company announcements and policies

You MUST NOT reveal or discuss:
- License counts, seat limits, subscription plans, or billing — say "This information is restricted to administrators"
- Security audit logs, failed logins, threat data — say "Security data requires admin access"
- Other managers' team data or individual data outside the user's scope
- Salary, compensation, or financial details of individuals (unless this is an HR role)
- Platform-wide or cross-tenant data`;

      case 'employee':
      default:
        return `== Access Level: EMPLOYEE ==
This user is a regular employee. You may ONLY discuss:
- The user's OWN performance reviews, goals, and feedback
- The user's OWN career development, skills, and learning paths
- General company policies, announcements, and public information
- Self-improvement tips, coaching advice, and wellness guidance
- Public team/department information (names, structure) but NOT individual performance of peers

You MUST NOT reveal or discuss — politely decline with a brief explanation:
- License counts, seat limits, subscription status — say "License information is only available to administrators."
- Any other employee's performance data, ratings, or reviews — say "I can only share your own performance data."
- Security logs, audit trails, login attempts — say "Security information requires admin access."
- Workforce analytics, attrition risks, burnout scores of others — say "Workforce analytics are available to managers and above."
- Team-level performance rankings or comparisons between employees — say "I can only discuss your individual performance."
- Revenue, billing, financial data — say "Financial data is restricted to administrators."
- Salary or compensation data of any employee (including their own unless provided in context)

When in doubt, err on the side of caution and restrict access. Always be polite when declining.`;
    }
  }

  /**
   * Override in subclasses to declare model tier / LLM options.
   * Merged into the llmClient.chat() call — allows agents to use
   * economy (gemini-flash), standard (primary), or premium (claude) tiers.
   *
   * Example: `return MODEL_TIERS.economy;`
   */
  protected getLLMOptions(): { maxTokens?: number; temperature?: number; model?: string; provider?: LLMProvider } {
    return {}; // defaults — uses primary provider chain
  }

  // ── RBAC Guard Helpers ─────────────────────────────────
  // Call these inside gatherAgentData() to enforce access at the data layer.

  /**
   * Require admin (or super admin) access. Returns accessDenied payload for non-admins.
   */
  protected requireAdmin(context: AgentContext, featureLabel: string): Record<string, unknown> | null {
    if (isAdmin(context.userRoles)) return null; // OK
    return {
      accessDenied: true,
      message: `${featureLabel} is restricted to administrators. Please contact your admin for access.`,
    };
  }

  /**
   * Require manager+ (manager, HR, admin, super admin) access.
   * Returns accessDenied payload for employees.
   */
  protected requireManager(context: AgentContext, featureLabel: string): Record<string, unknown> | null {
    if (isManager(context.userRoles)) return null; // OK
    return {
      accessDenied: true,
      message: `${featureLabel} is available to managers and above. As an employee, you can ask about your own performance and career development.`,
    };
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
