/**
 * Agent Orchestrator — routes incoming requests to the correct specialized agent.
 *
 * If an agentType is specified, routes directly.
 * Otherwise, uses LLM to classify the user's intent.
 */

import { logger } from '../../utils/logger';
import { llmClient } from './llm-client';
import type { BaseAgent, AgentResponse } from './base-agent';

// Import all specialized agents
import { NLPQueryAgent } from './agents/nlp-query.agent';
import { ExcelValidationAgent } from './agents/excel-validation.agent';
import { LicenseAgent } from './agents/license.agent';
import { PerformanceAgent } from './agents/performance.agent';
import { CareerAgent } from './agents/career.agent';
import { OnboardingAgent } from './agents/onboarding.agent';
import { SecurityAgent } from './agents/security.agent';
import { ReportAgent } from './agents/report.agent';
import { NotificationAgent } from './agents/notification.agent';

// ── Agent Registry ─────────────────────────────────────────

const AGENT_TYPES = [
  'nlp_query',
  'excel_validation',
  'license',
  'performance',
  'career',
  'onboarding',
  'security',
  'report',
  'notification',
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

// ── Intent Classification Prompt ───────────────────────────

const CLASSIFY_PROMPT = `You are a router for a Performance Management System (PMS).
Given a user message, classify which agent should handle it.

Available agents:
- nlp_query: General questions about employees, teams, data queries, "who", "how many", "show me", "list"
- excel_validation: Anything about Excel uploads, CSV, employee data imports, bulk operations
- license: Questions about licenses, seats, subscriptions, plans, usage limits, billing
- performance: Goal setting, performance reviews, ratings, progress tracking, self-reviews, coaching
- career: Career development, promotions, skill gaps, career paths, L-level progression
- onboarding: New employee setup, welcome emails, onboarding checklists, first-day tasks
- security: Security threats, login attempts, suspicious activity, compliance, audit logs, IP blocking
- report: Generate reports, analytics summaries, team health, monthly/quarterly reviews
- notification: Notification preferences, alert settings, digest summaries

Respond with ONLY the agent type (one word from the list above), nothing else.`;

// ── Orchestrator ───────────────────────────────────────────

class AgentOrchestrator {
  private agents: Map<string, BaseAgent>;

  constructor() {
    this.agents = new Map();

    // Register all agents
    this.agents.set('nlp_query', new NLPQueryAgent());
    this.agents.set('excel_validation', new ExcelValidationAgent());
    this.agents.set('license', new LicenseAgent());
    this.agents.set('performance', new PerformanceAgent());
    this.agents.set('career', new CareerAgent());
    this.agents.set('onboarding', new OnboardingAgent());
    this.agents.set('security', new SecurityAgent());
    this.agents.set('report', new ReportAgent());
    this.agents.set('notification', new NotificationAgent());
  }

  /**
   * Route a message to the appropriate agent.
   */
  async routeMessage(
    tenantId: string,
    userId: string,
    message: string,
    agentType?: string,
    conversationId?: string,
  ): Promise<AgentResponse> {
    // Determine agent type
    let resolvedType = agentType;

    if (!resolvedType || !this.agents.has(resolvedType)) {
      resolvedType = await this.classifyIntent(message);
    }

    const agent = this.agents.get(resolvedType);
    if (!agent) {
      // Fallback to NLP query agent
      logger.warn('Unknown agent type, falling back to nlp_query', {
        requested: resolvedType,
      });
      const fallback = this.agents.get('nlp_query')!;
      return fallback.process(tenantId, userId, message, conversationId);
    }

    logger.info(`Routing to agent: ${resolvedType}`, {
      tenantId,
      userId,
      agentType: resolvedType,
    });

    return agent.process(tenantId, userId, message, conversationId);
  }

  /**
   * Classify user intent using LLM.
   */
  async classifyIntent(message: string): Promise<string> {
    try {
      const response = await llmClient.chat(
        [
          { role: 'system', content: CLASSIFY_PROMPT },
          { role: 'user', content: message },
        ],
        {
          maxTokens: 20,
          temperature: 0,
        },
      );

      const classified = response.content.trim().toLowerCase().replace(/[^a-z_]/g, '');

      if (AGENT_TYPES.includes(classified as AgentType)) {
        return classified;
      }

      logger.warn('LLM classification returned unknown type, defaulting to nlp_query', {
        classified,
        message: message.slice(0, 100),
      });
      return 'nlp_query';
    } catch (err) {
      logger.warn('Intent classification failed, defaulting to nlp_query', {
        error: (err as Error).message,
      });
      return 'nlp_query';
    }
  }

  /**
   * Get list of available agent types.
   */
  getAvailableAgents(): string[] {
    return Array.from(this.agents.keys());
  }
}

export const agentOrchestrator = new AgentOrchestrator();
