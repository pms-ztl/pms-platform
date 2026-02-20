/**
 * Agent Orchestrator — routes incoming requests to the correct specialized agent.
 *
 * Architecture (v2 — 52-agent Neural Swarm):
 * - Two-stage intent classification: Cluster → Agent
 * - Lazy agent instantiation via factory map (agents created on first use)
 * - If agentType is explicitly specified, skips classification entirely
 */

import { logger } from '../../utils/logger';
import { llmClient } from './llm-client';
import type { BaseAgent, AgentResponse } from './base-agent';

// ── Lazy imports: Core agents ────────────────────────────

import { NLPQueryAgent } from './agents/nlp-query.agent';
import { ExcelValidationAgent } from './agents/excel-validation.agent';
import { LicenseAgent } from './agents/license.agent';
import { PerformanceAgent } from './agents/performance.agent';
import { CareerAgent } from './agents/career.agent';
import { OnboardingAgent } from './agents/onboarding.agent';
import { SecurityAgent } from './agents/security.agent';
import { ReportAgent } from './agents/report.agent';
import { NotificationAgent } from './agents/notification.agent';
import { CoachingAgent } from './agents/coaching.agent';
import { WorkforceIntelAgent } from './agents/workforce-intel.agent';
import { GovernanceAgent } from './agents/governance.agent';
import { ConflictResolutionAgent } from './agents/conflict-resolution.agent';
import { TalentMarketplaceAgent } from './agents/talent-marketplace.agent';
import { StrategicAlignmentAgent } from './agents/strategic-alignment.agent';

// ── Lazy imports: Bio-Performance cluster ────────────────

import {
  NeuroFocusAgent,
  CircadianSyncAgent,
  MicroBreakAgent,
  CortisolMonitorAgent,
  ErgonomicsAgent,
  SleepOptimizerAgent,
  HydrationNutritionAgent,
  VocalToneAgent,
  EnvironmentCtrlAgent,
  BurnoutInterceptorAgent,
} from './agents/bio-performance';

// ── Lazy imports: Hyper-Learning cluster ─────────────────

import {
  ShadowLearningAgent,
  MicroLearningAgent,
  ARMentorAgent,
  SparringPartnerAgent,
  SkillGapForecasterAgent,
  KnowledgeBrokerAgent,
  CredentialLedgerAgent,
  LinguisticRefinerAgent,
  CuriosityScoutAgent,
  LogicValidatorAgent,
  CrossTrainingAgent,
  CareerSimAgent,
} from './agents/hyper-learning';

// ── Lazy imports: Liquid Workforce cluster ───────────────

import {
  TaskBidderAgent,
  GigSourcerAgent,
  NanoPaymentAgent,
  MarketValueAgent,
  TaxOptimizerAgent,
  EquityRealizerAgent,
  PensionGuardAgent,
  RelocationBotAgent,
  VendorNegotiatorAgent,
  SuccessionSentryAgent,
} from './agents/liquid-workforce';

// ── Lazy imports: Culture & Empathy cluster ──────────────

import {
  CultureWeaverAgent,
  BiasNeutralizerAgent,
  GratitudeSentinelAgent,
  ConflictMediatorAgent,
  InclusionMonitorAgent,
  EmpathyCoachAgent,
  SocialBondingAgent,
  LegacyArchivistAgent,
  WhistleblowerAgent,
  MoodRadiatorAgent,
} from './agents/culture-empathy';

// ── Lazy imports: Governance & Logic cluster ─────────────

import {
  POSHSentinelAgent,
  LaborComplianceAgent,
  PolicyTranslatorAgent,
  DataPrivacyAgent,
  AuditTrailAgent,
  ConflictOfInterestAgent,
  LeaveOptimizerAgent,
  OnboardingOrchestratorAgent,
} from './agents/governance-logic';

// ══════════════════════════════════════════════════════════
// Agent Type Registry — all 52 agents
// ══════════════════════════════════════════════════════════

const AGENT_TYPES = [
  // Core (15)
  'nlp_query', 'excel_validation', 'license', 'performance', 'career',
  'onboarding', 'security', 'report', 'notification', 'coaching',
  'workforce_intel', 'governance', 'conflict_resolution', 'talent_marketplace',
  'strategic_alignment',
  // Bio-Performance (10)
  'neuro_focus', 'circadian_sync', 'micro_break', 'cortisol_monitor',
  'ergonomics', 'sleep_optimizer', 'hydration_nutrition', 'vocal_tone',
  'environment_ctrl', 'burnout_interceptor',
  // Hyper-Learning (12)
  'shadow_learning', 'micro_learning', 'ar_mentor', 'sparring_partner',
  'skill_gap_forecaster', 'knowledge_broker', 'credential_ledger',
  'linguistic_refiner', 'curiosity_scout', 'logic_validator',
  'cross_training', 'career_sim',
  // Liquid Workforce (10)
  'task_bidder', 'gig_sourcer', 'nano_payment', 'market_value',
  'tax_optimizer', 'equity_realizer', 'pension_guard', 'relocation_bot',
  'vendor_negotiator', 'succession_sentry',
  // Culture & Empathy (10)
  'culture_weaver', 'bias_neutralizer', 'gratitude_sentinel',
  'conflict_mediator', 'inclusion_monitor', 'empathy_coach',
  'social_bonding', 'legacy_archivist', 'whistleblower', 'mood_radiator',
  // Governance & Logic (8)
  'posh_sentinel', 'labor_compliance', 'policy_translator', 'data_privacy',
  'audit_trail', 'conflict_of_interest', 'leave_optimizer',
  'onboarding_orchestrator',
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

// ══════════════════════════════════════════════════════════
// Cluster Map — for two-stage classification
// ══════════════════════════════════════════════════════════

type ClusterId = 'core' | 'bio_performance' | 'hyper_learning' | 'liquid_workforce' | 'culture_empathy' | 'governance_logic';

const CLUSTER_MAP: Record<ClusterId, readonly string[]> = {
  core: [
    'nlp_query', 'excel_validation', 'license', 'performance', 'career',
    'onboarding', 'security', 'report', 'notification', 'coaching',
    'workforce_intel', 'governance', 'conflict_resolution', 'talent_marketplace',
    'strategic_alignment',
  ],
  bio_performance: [
    'neuro_focus', 'circadian_sync', 'micro_break', 'cortisol_monitor',
    'ergonomics', 'sleep_optimizer', 'hydration_nutrition', 'vocal_tone',
    'environment_ctrl', 'burnout_interceptor',
  ],
  hyper_learning: [
    'shadow_learning', 'micro_learning', 'ar_mentor', 'sparring_partner',
    'skill_gap_forecaster', 'knowledge_broker', 'credential_ledger',
    'linguistic_refiner', 'curiosity_scout', 'logic_validator',
    'cross_training', 'career_sim',
  ],
  liquid_workforce: [
    'task_bidder', 'gig_sourcer', 'nano_payment', 'market_value',
    'tax_optimizer', 'equity_realizer', 'pension_guard', 'relocation_bot',
    'vendor_negotiator', 'succession_sentry',
  ],
  culture_empathy: [
    'culture_weaver', 'bias_neutralizer', 'gratitude_sentinel',
    'conflict_mediator', 'inclusion_monitor', 'empathy_coach',
    'social_bonding', 'legacy_archivist', 'whistleblower', 'mood_radiator',
  ],
  governance_logic: [
    'posh_sentinel', 'labor_compliance', 'policy_translator', 'data_privacy',
    'audit_trail', 'conflict_of_interest', 'leave_optimizer',
    'onboarding_orchestrator',
  ],
};

const CLUSTER_IDS = Object.keys(CLUSTER_MAP) as ClusterId[];

// ══════════════════════════════════════════════════════════
// Stage 1: Cluster Classification Prompt
// ══════════════════════════════════════════════════════════

const CLUSTER_CLASSIFY_PROMPT = `You are a router for a Performance Management System with 52 specialized AI agents organized into 6 clusters.
Given a user message, classify which CLUSTER should handle it.

Available clusters:
- core: General PMS queries, data lookups, Excel uploads, licenses, performance reviews, career paths, onboarding, security, reports, notifications, coaching, workforce intelligence, governance/bias detection, conflict resolution, talent marketplace, strategic alignment
- bio_performance: Biological & cognitive optimization — focus/attention, circadian rhythms, break scheduling, stress/cortisol monitoring, ergonomics, sleep patterns, hydration/nutrition, vocal tone, environment control, burnout detection
- hyper_learning: Skill development & training — shadow learning, micro-learning, AR mentoring, sparring/debate practice, skill gap forecasting, knowledge brokering, credential tracking, linguistic refinement, curiosity/innovation scouting, logic validation, cross-training, career simulation
- liquid_workforce: Economic & workforce allocation — task bidding, internal gig sourcing, nano-payment/recognition, market value analysis, tax optimization, equity realization, pension planning, relocation advice, vendor negotiation, succession planning
- culture_empathy: Human-centered workplace — culture diagnostics, bias neutralization, gratitude tracking, conflict mediation, inclusion monitoring, empathy coaching, social bonding, legacy archiving, whistleblower support, mood tracking
- governance_logic: Compliance & policy — POSH/harassment prevention, labor law compliance, policy translation, data privacy, audit trails, conflict of interest detection, leave optimization, onboarding orchestration

Respond with ONLY the cluster name (one of: core, bio_performance, hyper_learning, liquid_workforce, culture_empathy, governance_logic), nothing else.`;

// ══════════════════════════════════════════════════════════
// Stage 2: Per-cluster Agent Classification Prompts
// ══════════════════════════════════════════════════════════

const AGENT_CLASSIFY_PROMPTS: Record<ClusterId, string> = {
  core: `You are a router for the Core PMS cluster.
Given a user message, classify which agent should handle it.

Available agents:
- nlp_query: General questions about employees, teams, data queries, "who", "how many", "show me", "list"
- excel_validation: Excel uploads, CSV, employee data imports, bulk operations
- license: Licenses, seats, subscriptions, plans, usage limits, billing
- performance: Goal setting, performance reviews, ratings, progress tracking
- career: Career development, promotions, career paths, L-level progression
- onboarding: New employee setup, welcome emails, onboarding checklists
- security: Security threats, login attempts, suspicious activity, audit logs
- report: Generate reports, analytics summaries, business reviews
- notification: Notification preferences, alert settings
- coaching: Personalized coaching, micro-learning, skill improvement, mentorship
- workforce_intel: Burnout risk, attrition prediction, flight risk, retention, team health, succession
- governance: Bias detection, fairness audits, equity analysis, review language bias
- conflict_resolution: Team conflicts, friction, toxic communication, morale issues
- talent_marketplace: Internal mobility, skill marketplace, project matching
- strategic_alignment: OKR alignment, strategy shifts, milestone tracking, 1:1 prep

Respond with ONLY the agent type, nothing else.`,

  bio_performance: `You are a router for the Bio-Performance cluster.
Given a user message, classify which agent should handle it.

Available agents:
- neuro_focus: Focus optimization, attention span, deep work sessions, concentration, flow state, cognitive load management
- circadian_sync: Circadian rhythm, body clock, optimal work schedule, chronotype, energy cycles
- micro_break: Break reminders, Pomodoro, rest intervals, stretch breaks, eye strain prevention
- cortisol_monitor: Stress monitoring, cortisol levels, anxiety indicators, stress management
- ergonomics: Posture, workspace setup, desk ergonomics, physical strain, RSI prevention
- sleep_optimizer: Sleep quality, sleep schedule, insomnia, rest patterns, sleep hygiene
- hydration_nutrition: Water intake, nutrition, energy food, meal timing, dietary optimization
- vocal_tone: Voice tone analysis, communication style, presentation delivery, vocal strain
- environment_ctrl: Workspace environment, lighting, noise, temperature, air quality
- burnout_interceptor: Burnout detection, work-life balance, exhaustion, chronic stress, overwork patterns

Respond with ONLY the agent type, nothing else.`,

  hyper_learning: `You are a router for the Hyper-Learning cluster.
Given a user message, classify which agent should handle it.

Available agents:
- shadow_learning: Job shadowing, peer observation, experiential learning, learning by watching
- micro_learning: Bite-sized lessons, quick courses, daily learning, knowledge nuggets
- ar_mentor: Augmented/interactive mentoring, immersive learning, simulation-based training
- sparring_partner: Debate practice, idea challenging, critical thinking, argument validation
- skill_gap_forecaster: Future skill requirements, skill demand prediction, workforce skill planning
- knowledge_broker: Connecting experts, knowledge transfer, information sharing, expertise discovery
- credential_ledger: Certifications tracking, credential verification, qualification management
- linguistic_refiner: Writing improvement, grammar, communication clarity, email drafting quality
- curiosity_scout: Innovation discovery, new ideas, research trends, creative exploration
- logic_validator: Logical reasoning check, argument validation, decision analysis, critical thinking
- cross_training: Cross-functional skills, multi-department learning, versatility development
- career_sim: Career path simulation, role exploration, "what-if" career scenarios, promotion modeling

Respond with ONLY the agent type, nothing else.`,

  liquid_workforce: `You are a router for the Liquid Workforce cluster.
Given a user message, classify which agent should handle it.

Available agents:
- task_bidder: Task allocation, project bidding, work assignment optimization
- gig_sourcer: Internal gig matching, project staffing, freelance-style internal work
- nano_payment: Micro-recognition, spot bonuses, instant reward, peer-to-peer recognition
- market_value: Salary benchmarking, market compensation, role valuation, pay equity analysis
- tax_optimizer: Tax planning, deductions, tax-efficient compensation strategies
- equity_realizer: Stock options, equity vesting, RSU management, ownership stakes
- pension_guard: Retirement planning, pension optimization, 401k/provident fund
- relocation_bot: Relocation advice, city comparison, cost of living, transfer planning
- vendor_negotiator: Vendor management, contract negotiation, procurement optimization
- succession_sentry: Succession planning, bench strength, leadership pipeline, key-person risk

Respond with ONLY the agent type, nothing else.`,

  culture_empathy: `You are a router for the Culture & Empathy cluster.
Given a user message, classify which agent should handle it.

Available agents:
- culture_weaver: Culture diagnostics, organizational values, culture transformation, rituals
- bias_neutralizer: Bias detection, prejudice identification, fair language, inclusive writing
- gratitude_sentinel: Gratitude tracking, appreciation analytics, recognition patterns
- conflict_mediator: Interpersonal conflict resolution, mediation, dispute settlement
- inclusion_monitor: Diversity metrics, inclusion assessment, representation tracking, belonging
- empathy_coach: Emotional intelligence, empathetic communication, active listening
- social_bonding: Team building, social connection, community events, relationship building
- legacy_archivist: Institutional knowledge, company history, cultural memory, lessons learned
- whistleblower: Ethical reporting, misconduct detection, anonymous concerns, compliance issues
- mood_radiator: Mood tracking, team sentiment, emotional climate, morale dashboard

Respond with ONLY the agent type, nothing else.`,

  governance_logic: `You are a router for the Governance & Logic cluster.
Given a user message, classify which agent should handle it.

Available agents:
- posh_sentinel: Sexual harassment prevention, POSH compliance, inappropriate behavior detection
- labor_compliance: Labor law compliance, working hours regulations, overtime rules, employment law
- policy_translator: Policy interpretation, rule explanation, guideline simplification
- data_privacy: Data protection, GDPR compliance, privacy regulations, data handling
- audit_trail: Audit logs, activity tracking, compliance documentation, record keeping
- conflict_of_interest: COI detection, dual relationships, competing interests, ethical boundaries
- leave_optimizer: Leave planning, PTO optimization, vacation scheduling, absence management
- onboarding_orchestrator: New hire coordination, onboarding workflow, integration planning

Respond with ONLY the agent type, nothing else.`,
};

// ══════════════════════════════════════════════════════════
// Orchestrator — lazy factory + two-stage classification
// ══════════════════════════════════════════════════════════

class AgentOrchestrator {
  /** Factory map — agents instantiated on first use */
  private agentFactories = new Map<string, () => BaseAgent>();

  constructor() {
    const f = this.agentFactories;
    // Core (15)
    f.set('nlp_query', () => new NLPQueryAgent());
    f.set('excel_validation', () => new ExcelValidationAgent());
    f.set('license', () => new LicenseAgent());
    f.set('performance', () => new PerformanceAgent());
    f.set('career', () => new CareerAgent());
    f.set('onboarding', () => new OnboardingAgent());
    f.set('security', () => new SecurityAgent());
    f.set('report', () => new ReportAgent());
    f.set('notification', () => new NotificationAgent());
    f.set('coaching', () => new CoachingAgent());
    f.set('workforce_intel', () => new WorkforceIntelAgent());
    f.set('governance', () => new GovernanceAgent());
    f.set('conflict_resolution', () => new ConflictResolutionAgent());
    f.set('talent_marketplace', () => new TalentMarketplaceAgent());
    f.set('strategic_alignment', () => new StrategicAlignmentAgent());
    // Bio-Performance (10)
    f.set('neuro_focus', () => new NeuroFocusAgent());
    f.set('circadian_sync', () => new CircadianSyncAgent());
    f.set('micro_break', () => new MicroBreakAgent());
    f.set('cortisol_monitor', () => new CortisolMonitorAgent());
    f.set('ergonomics', () => new ErgonomicsAgent());
    f.set('sleep_optimizer', () => new SleepOptimizerAgent());
    f.set('hydration_nutrition', () => new HydrationNutritionAgent());
    f.set('vocal_tone', () => new VocalToneAgent());
    f.set('environment_ctrl', () => new EnvironmentCtrlAgent());
    f.set('burnout_interceptor', () => new BurnoutInterceptorAgent());
    // Hyper-Learning (12)
    f.set('shadow_learning', () => new ShadowLearningAgent());
    f.set('micro_learning', () => new MicroLearningAgent());
    f.set('ar_mentor', () => new ARMentorAgent());
    f.set('sparring_partner', () => new SparringPartnerAgent());
    f.set('skill_gap_forecaster', () => new SkillGapForecasterAgent());
    f.set('knowledge_broker', () => new KnowledgeBrokerAgent());
    f.set('credential_ledger', () => new CredentialLedgerAgent());
    f.set('linguistic_refiner', () => new LinguisticRefinerAgent());
    f.set('curiosity_scout', () => new CuriosityScoutAgent());
    f.set('logic_validator', () => new LogicValidatorAgent());
    f.set('cross_training', () => new CrossTrainingAgent());
    f.set('career_sim', () => new CareerSimAgent());
    // Liquid Workforce (10)
    f.set('task_bidder', () => new TaskBidderAgent());
    f.set('gig_sourcer', () => new GigSourcerAgent());
    f.set('nano_payment', () => new NanoPaymentAgent());
    f.set('market_value', () => new MarketValueAgent());
    f.set('tax_optimizer', () => new TaxOptimizerAgent());
    f.set('equity_realizer', () => new EquityRealizerAgent());
    f.set('pension_guard', () => new PensionGuardAgent());
    f.set('relocation_bot', () => new RelocationBotAgent());
    f.set('vendor_negotiator', () => new VendorNegotiatorAgent());
    f.set('succession_sentry', () => new SuccessionSentryAgent());
    // Culture & Empathy (10)
    f.set('culture_weaver', () => new CultureWeaverAgent());
    f.set('bias_neutralizer', () => new BiasNeutralizerAgent());
    f.set('gratitude_sentinel', () => new GratitudeSentinelAgent());
    f.set('conflict_mediator', () => new ConflictMediatorAgent());
    f.set('inclusion_monitor', () => new InclusionMonitorAgent());
    f.set('empathy_coach', () => new EmpathyCoachAgent());
    f.set('social_bonding', () => new SocialBondingAgent());
    f.set('legacy_archivist', () => new LegacyArchivistAgent());
    f.set('whistleblower', () => new WhistleblowerAgent());
    f.set('mood_radiator', () => new MoodRadiatorAgent());
    // Governance & Logic (8)
    f.set('posh_sentinel', () => new POSHSentinelAgent());
    f.set('labor_compliance', () => new LaborComplianceAgent());
    f.set('policy_translator', () => new PolicyTranslatorAgent());
    f.set('data_privacy', () => new DataPrivacyAgent());
    f.set('audit_trail', () => new AuditTrailAgent());
    f.set('conflict_of_interest', () => new ConflictOfInterestAgent());
    f.set('leave_optimizer', () => new LeaveOptimizerAgent());
    f.set('onboarding_orchestrator', () => new OnboardingOrchestratorAgent());
  }

  /** Agent instance cache — populated lazily */
  private agentCache: Map<string, BaseAgent> = new Map();

  /**
   * Get (or lazily create) an agent instance.
   */
  private getAgent(type: string): BaseAgent | null {
    if (this.agentCache.has(type)) {
      return this.agentCache.get(type)!;
    }
    const factory = this.agentFactories.get(type);
    if (!factory) return null;

    const agent = factory();
    this.agentCache.set(type, agent);
    return agent;
  }

  /**
   * Route a message to the appropriate agent.
   * If agentType is provided and valid, routes directly (zero classification overhead).
   * Otherwise, uses two-stage LLM classification: Cluster → Agent.
   */
  async routeMessage(
    tenantId: string,
    userId: string,
    message: string,
    agentType?: string,
    conversationId?: string,
  ): Promise<AgentResponse> {
    let resolvedType = agentType;

    // If agentType specified and exists in factory, use it directly
    if (resolvedType && this.agentFactories.has(resolvedType)) {
      // Direct route — skip classification
    } else {
      // Two-stage classification
      resolvedType = await this.classifyIntent(message);
    }

    const agent = this.getAgent(resolvedType!);
    if (!agent) {
      logger.warn('Unknown agent type, falling back to nlp_query', { requested: resolvedType });
      const fallback = this.getAgent('nlp_query')!;
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
   * Two-stage intent classification:
   * Stage 1: Classify into one of 6 clusters
   * Stage 2: Classify into specific agent within that cluster
   */
  async classifyIntent(message: string): Promise<string> {
    try {
      // Stage 1: Cluster classification
      const clusterResponse = await llmClient.chat(
        [
          { role: 'system', content: CLUSTER_CLASSIFY_PROMPT },
          { role: 'user', content: message },
        ],
        { maxTokens: 20, temperature: 0 },
      );

      const cluster = clusterResponse.content.trim().toLowerCase().replace(/[^a-z_]/g, '') as ClusterId;

      if (!CLUSTER_IDS.includes(cluster)) {
        logger.warn('Cluster classification returned unknown cluster, defaulting to core', {
          classified: cluster,
          message: message.slice(0, 100),
        });
        return this.classifyAgentInCluster(message, 'core');
      }

      // Stage 2: Agent classification within cluster
      return this.classifyAgentInCluster(message, cluster);
    } catch (err) {
      logger.warn('Two-stage classification failed, defaulting to nlp_query', {
        error: (err as Error).message,
      });
      return 'nlp_query';
    }
  }

  /**
   * Stage 2: Classify specific agent within a cluster.
   */
  private async classifyAgentInCluster(message: string, cluster: ClusterId): Promise<string> {
    try {
      const prompt = AGENT_CLASSIFY_PROMPTS[cluster];
      if (!prompt) return 'nlp_query';

      const response = await llmClient.chat(
        [
          { role: 'system', content: prompt },
          { role: 'user', content: message },
        ],
        { maxTokens: 30, temperature: 0 },
      );

      const classified = response.content.trim().toLowerCase().replace(/[^a-z_]/g, '');
      const validAgents = CLUSTER_MAP[cluster];

      if (validAgents.includes(classified)) {
        return classified;
      }

      logger.warn('Agent classification returned unknown type within cluster, defaulting', {
        cluster,
        classified,
        message: message.slice(0, 100),
      });

      // Default to first agent in cluster (usually the most general)
      return cluster === 'core' ? 'nlp_query' : validAgents[0];
    } catch (err) {
      logger.warn('Agent-level classification failed', {
        cluster,
        error: (err as Error).message,
      });
      return 'nlp_query';
    }
  }

  /**
   * Get list of all available agent types (52 total).
   */
  getAvailableAgents(): string[] {
    return [...AGENT_TYPES];
  }

  /**
   * Get agents grouped by cluster.
   */
  getAgentsByCluster(): Record<string, readonly string[]> {
    return { ...CLUSTER_MAP };
  }
}

export const agentOrchestrator = new AgentOrchestrator();
