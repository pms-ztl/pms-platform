/**
 * Agent Orchestrator — routes incoming requests to the correct specialized agent.
 *
 * If an agentType is specified, routes directly.
 * Otherwise, uses LLM to classify the user's intent.
 */

import { logger } from '../../utils/logger';
import { llmClient } from './llm-client';
import type { BaseAgent, AgentResponse } from './base-agent';

// Import original agents
import { NLPQueryAgent } from './agents/nlp-query.agent';
import { ExcelValidationAgent } from './agents/excel-validation.agent';
import { LicenseAgent } from './agents/license.agent';
import { PerformanceAgent } from './agents/performance.agent';
import { CareerAgent } from './agents/career.agent';
import { OnboardingAgent } from './agents/onboarding.agent';
import { SecurityAgent } from './agents/security.agent';
import { ReportAgent } from './agents/report.agent';
import { NotificationAgent } from './agents/notification.agent';

// Import new specialized agents (35-feature coverage)
import { CoachingAgent } from './agents/coaching.agent';
import { WorkforceIntelAgent } from './agents/workforce-intel.agent';
import { GovernanceAgent } from './agents/governance.agent';
import { ConflictResolutionAgent } from './agents/conflict-resolution.agent';
import { TalentMarketplaceAgent } from './agents/talent-marketplace.agent';
import { StrategicAlignmentAgent } from './agents/strategic-alignment.agent';

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
  'coaching',
  'workforce_intel',
  'governance',
  'conflict_resolution',
  'talent_marketplace',
  'strategic_alignment',
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

// ── Intent Classification Prompt ───────────────────────────

const CLASSIFY_PROMPT = `You are a router for a Performance Management System (PMS).
Given a user message, classify which agent should handle it.

Available agents:
- nlp_query: General questions about employees, teams, data queries, "who", "how many", "show me", "list"
- excel_validation: Anything about Excel uploads, CSV, employee data imports, bulk operations
- license: Questions about licenses, seats, subscriptions, plans, usage limits, billing
- performance: Goal setting, performance reviews, ratings, progress tracking, self-reviews
- career: Career development, promotions, career paths, L-level progression
- onboarding: New employee setup, welcome emails, onboarding checklists, first-day tasks
- security: Security threats, login attempts, suspicious activity, compliance, audit logs
- report: Generate reports, analytics summaries, monthly/quarterly business reviews
- notification: Notification preferences, alert settings, digest summaries
- coaching: Personalized coaching, micro-learning, skill improvement, mentorship matching, "coach me", "help me improve"
- workforce_intel: Burnout risk, attrition prediction, flight risk, retention strategies, team health, workforce planning, succession pipeline
- governance: Bias detection, fairness audits, equity analysis, review language bias, calibration fairness, explainable scoring
- conflict_resolution: Team conflicts, friction, toxic communication, morale issues, collaboration problems, team dynamics
- talent_marketplace: Internal mobility, skill marketplace, project matching, role changes, goal redistribution, talent reallocation
- strategic_alignment: OKR alignment, strategy shifts, milestone tracking, performance snapshots, 1:1 prep, company objectives

Respond with ONLY the agent type (one word/phrase from the list above), nothing else.`;

// ── Orchestrator ───────────────────────────────────────────

class AgentOrchestrator {
  private agents: Map<string, BaseAgent>;

  constructor() {
    this.agents = new Map();

    // Register original 9 agents
    this.agents.set('nlp_query', new NLPQueryAgent());
    this.agents.set('excel_validation', new ExcelValidationAgent());
    this.agents.set('license', new LicenseAgent());
    this.agents.set('performance', new PerformanceAgent());
    this.agents.set('career', new CareerAgent());
    this.agents.set('onboarding', new OnboardingAgent());
    this.agents.set('security', new SecurityAgent());
    this.agents.set('report', new ReportAgent());
    this.agents.set('notification', new NotificationAgent());

    // Register new 6 agents (35-feature coverage)
    this.agents.set('coaching', new CoachingAgent());
    this.agents.set('workforce_intel', new WorkforceIntelAgent());
    this.agents.set('governance', new GovernanceAgent());
    this.agents.set('conflict_resolution', new ConflictResolutionAgent());
    this.agents.set('talent_marketplace', new TalentMarketplaceAgent());
    this.agents.set('strategic_alignment', new StrategicAlignmentAgent());
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
