/**
 * LLM Client - Multi-provider abstraction for Claude + GPT + Gemini + DeepSeek + Groq
 *
 * Features:
 * - Automatic fallback chain: primary → secondary → tertiary
 * - Token counting and cost tracking per request
 * - Response caching via Redis (1hr TTL)
 * - Tenant-level rate limiting
 *
 * Supported providers:
 * - Anthropic (Claude): claude-sonnet-4, claude-3.5-sonnet, claude-3-haiku
 * - OpenAI (GPT): gpt-4o, gpt-4o-mini
 * - Google (Gemini): gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash
 * - DeepSeek: deepseek-chat, deepseek-reasoner
 * - Groq: llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import crypto from 'crypto';

import { config } from '../../config';
import { logger } from '../../utils/logger';
import { cacheGet, cacheSet } from '../../utils/redis';

// ── Types ──────────────────────────────────────────────────

export type LLMProvider = 'anthropic' | 'openai' | 'gemini' | 'deepseek' | 'groq';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
  provider?: LLMProvider;
  /** Skip cache lookup/store for this call */
  noCache?: boolean;
  /** Tenant ID for rate-limit tracking */
  tenantId?: string;
  /** User ID for per-user rate-limit tracking */
  userId?: string;
  /** If true, uses separate system rate-limit bucket (for proactive/scheduler tasks) */
  isSystemCall?: boolean;
  /** If true, request JSON-structured output from the provider (eliminates regex parsing) */
  jsonMode?: boolean;
}

export interface LLMResponse {
  content: string;
  provider: LLMProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  latencyMs: number;
  cached: boolean;
}

// ── Tool Calling Types ──────────────────────────────────────

export interface ToolSchema {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface LLMToolResponse extends LLMResponse {
  toolCalls: ToolCall[];
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens';
}

// ── Cost constants (approx cents per 1K tokens) ─────────

const COST_PER_1K: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-sonnet-4-20250514': { input: 0.3, output: 1.5 },
  'claude-3-5-sonnet-20241022': { input: 0.3, output: 1.5 },
  'claude-3-haiku-20240307': { input: 0.025, output: 0.125 },
  // OpenAI
  'gpt-4o': { input: 0.25, output: 1.0 },
  'gpt-4o-mini': { input: 0.015, output: 0.06 },
  // Google Gemini
  'gemini-2.0-flash': { input: 0.01, output: 0.04 },
  'gemini-1.5-pro': { input: 0.125, output: 0.5 },
  'gemini-1.5-flash': { input: 0.0075, output: 0.03 },
  // DeepSeek
  'deepseek-chat': { input: 0.014, output: 0.028 },
  'deepseek-reasoner': { input: 0.055, output: 0.219 },
  // Groq (fast inference)
  'llama-3.3-70b-versatile': { input: 0.059, output: 0.079 },
  'llama-3.1-8b-instant': { input: 0.005, output: 0.008 },
  'mixtral-8x7b-32768': { input: 0.024, output: 0.024 },
  'llama-3.1-70b-versatile': { input: 0.059, output: 0.079 },
};

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
const CACHE_PREFIX = 'llm:cache:';
const CACHE_TTL = 3600; // 1 hour

// ── Rate Limiting (per-user and per-tenant buckets) ──────
const RATE_LIMIT_PREFIX = 'llm:rate:';
const RATE_LIMIT_WINDOW = 60; // 1 minute
const RATE_LIMIT_TENANT_MAX = 60; // 60 requests per minute per tenant
const RATE_LIMIT_USER_MAX = 15; // 15 requests per minute per user
const RATE_LIMIT_SYSTEM_PREFIX = 'llm:rate:sys:'; // separate bucket for proactive/system tasks

// ── Circuit Breaker ─────────────────────────────────────
const CIRCUIT_BREAKER_THRESHOLD = 3; // consecutive failures to trip
const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown

// ── LLM Client ─────────────────────────────────────────

class LLMClient {
  private anthropic: Anthropic | null = null;
  private openai: OpenAI | null = null;
  private gemini: GoogleGenerativeAI | null = null;
  private deepseek: OpenAI | null = null;
  private groq: Groq | null = null;
  private primaryProvider: LLMProvider;
  private availableProviders: LLMProvider[] = [];

  /** Circuit breaker state per provider */
  private circuitBreaker = new Map<LLMProvider, {
    failures: number;
    trippedAt: number | null;
  }>();

  constructor() {
    this.primaryProvider = config.AI_PRIMARY_PROVIDER ?? 'anthropic';

    if (config.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
      this.availableProviders.push('anthropic');
    }

    if (config.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
      this.availableProviders.push('openai');
    }

    if (config.GEMINI_API_KEY) {
      this.gemini = new GoogleGenerativeAI(config.GEMINI_API_KEY);
      this.availableProviders.push('gemini');
    }

    if (config.DEEPSEEK_API_KEY) {
      this.deepseek = new OpenAI({
        apiKey: config.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com',
      });
      this.availableProviders.push('deepseek');
    }

    if (config.GROQ_API_KEY) {
      this.groq = new Groq({ apiKey: config.GROQ_API_KEY });
      this.availableProviders.push('groq');
    }

    if (this.availableProviders.length === 0) {
      logger.warn('No LLM API keys configured — AI features will be unavailable');
    } else {
      logger.info(`LLM providers initialized: ${this.availableProviders.join(', ')} (primary: ${this.primaryProvider})`);
    }
  }

  /** Check whether at least one provider is available */
  get isAvailable(): boolean {
    return this.availableProviders.length > 0;
  }

  /**
   * Build the fallback chain: primary first, then remaining configured providers.
   * Providers with tripped circuit breakers are excluded.
   */
  private getFallbackChain(preferred?: LLMProvider): LLMProvider[] {
    const primary = preferred ?? this.primaryProvider;
    const chain: LLMProvider[] = [];

    // Primary first (if available and not circuit-broken)
    if (this.availableProviders.includes(primary) && !this.isCircuitOpen(primary)) {
      chain.push(primary);
    }

    // Then all other available providers in their registration order
    for (const p of this.availableProviders) {
      if (!chain.includes(p) && !this.isCircuitOpen(p)) {
        chain.push(p);
      }
    }

    // If ALL providers are circuit-broken, include them anyway (stale is better than nothing)
    if (chain.length === 0) {
      logger.warn('All LLM providers have tripped circuit breakers, attempting anyway');
      return [preferred ?? this.primaryProvider, ...this.availableProviders.filter(p => p !== (preferred ?? this.primaryProvider))];
    }

    return chain;
  }

  // ── Circuit Breaker Methods ────────────────────────────

  /**
   * Check if a provider's circuit breaker is open (tripped).
   */
  private isCircuitOpen(provider: LLMProvider): boolean {
    const state = this.circuitBreaker.get(provider);
    if (!state?.trippedAt) return false;

    // Check if cooldown has elapsed
    if (Date.now() - state.trippedAt >= CIRCUIT_BREAKER_COOLDOWN_MS) {
      // Reset circuit breaker (half-open: allow next attempt)
      state.failures = 0;
      state.trippedAt = null;
      logger.info(`Circuit breaker reset for provider: ${provider}`);
      return false;
    }

    return true;
  }

  /**
   * Record a provider failure. Trips circuit breaker after threshold.
   */
  private recordProviderFailure(provider: LLMProvider): void {
    let state = this.circuitBreaker.get(provider);
    if (!state) {
      state = { failures: 0, trippedAt: null };
      this.circuitBreaker.set(provider, state);
    }

    state.failures++;

    if (state.failures >= CIRCUIT_BREAKER_THRESHOLD && !state.trippedAt) {
      state.trippedAt = Date.now();
      logger.warn(`Circuit breaker TRIPPED for provider: ${provider} after ${state.failures} consecutive failures. Cooldown: ${CIRCUIT_BREAKER_COOLDOWN_MS / 1000}s`);
    }
  }

  /**
   * Record a provider success. Resets failure counter.
   */
  private recordProviderSuccess(provider: LLMProvider): void {
    const state = this.circuitBreaker.get(provider);
    if (state) {
      state.failures = 0;
      state.trippedAt = null;
    }
  }

  /**
   * Send a chat completion request.
   * Automatically cascades through fallback providers on failure.
   */
  async chat(
    messages: LLMMessage[],
    options: LLMOptions = {},
  ): Promise<LLMResponse> {
    if (!this.isAvailable) {
      throw new Error(
        'No LLM provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or GROQ_API_KEY.',
      );
    }

    // Rate-limit check (per-tenant + per-user)
    if (options.tenantId) {
      await this.checkRateLimit(options.tenantId, options.userId, options.isSystemCall);
    }

    // Cache check
    if (!options.noCache) {
      const cached = await this.getCached(messages, options);
      if (cached) return cached;
    }

    const chain = this.getFallbackChain(options.provider);
    const errors: Array<{ provider: string; error: string }> = [];

    for (const provider of chain) {
      try {
        const response = await this.callProvider(provider, messages, options);
        if (!options.noCache) {
          await this.setCached(messages, options, response);
        }
        this.recordProviderSuccess(provider);
        return response;
      } catch (err) {
        const msg = (err as Error).message;
        errors.push({ provider, error: msg });
        this.recordProviderFailure(provider);
        logger.warn(`LLM provider (${provider}) failed`, { error: msg });
      }
    }

    // All providers failed
    logger.error('All LLM providers failed', { errors });
    throw new Error(`LLM call failed — all providers exhausted: ${errors[0]?.error}`);
  }

  /**
   * Convenience: send a single-shot prompt and get text back.
   */
  async generateText(
    prompt: string,
    options: LLMOptions = {},
  ): Promise<LLMResponse> {
    return this.chat([{ role: 'user', content: prompt }], options);
  }

  /**
   * Chat with native tool calling support.
   * The LLM can request tool executions which the caller handles.
   *
   * Currently supports:
   * - Anthropic (native tool_use)
   * - OpenAI (native function calling)
   * - Other providers: prompt-based fallback
   */
  async chatWithTools(
    messages: LLMMessage[],
    tools: ToolSchema[],
    options: LLMOptions = {},
  ): Promise<LLMToolResponse> {
    if (!this.isAvailable) {
      throw new Error('No LLM provider configured.');
    }

    if (options.tenantId) {
      await this.checkRateLimit(options.tenantId, options.userId, options.isSystemCall);
    }

    const chain = this.getFallbackChain(options.provider);
    const errors: Array<{ provider: string; error: string }> = [];

    for (const provider of chain) {
      try {
        let result: LLMToolResponse;
        if (provider === 'anthropic') {
          result = await this.callAnthropicWithTools(messages, tools, options);
        } else if (provider === 'openai') {
          result = await this.callOpenAIWithTools(messages, tools, options);
        } else {
          // Fallback for other providers: embed tool descriptions in prompt
          result = await this.callWithToolsPromptFallback(provider, messages, tools, options);
        }
        this.recordProviderSuccess(provider);
        return result;
      } catch (err) {
        const msg = (err as Error).message;
        errors.push({ provider, error: msg });
        this.recordProviderFailure(provider);
        logger.warn(`LLM tool-calling provider (${provider}) failed`, { error: msg });
      }
    }

    logger.error('All LLM providers failed for tool calling', { errors });
    throw new Error(`LLM tool-call failed — all providers exhausted: ${errors[0]?.error}`);
  }

  // ── Tool-calling provider implementations ─────────────

  private async callAnthropicWithTools(
    messages: LLMMessage[],
    tools: ToolSchema[],
    options: LLMOptions,
  ): Promise<LLMToolResponse> {
    if (!this.anthropic) throw new Error('Anthropic client not configured');

    const model = options.model ?? DEFAULT_ANTHROPIC_MODEL;
    const maxTokens = options.maxTokens ?? config.AI_MAX_TOKENS ?? 4096;

    // Separate system message
    const systemMsgs = messages.filter((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const systemContent = systemMsgs.map((m) => m.content).join('\n\n');

    // Convert tools to Anthropic format
    const anthropicTools = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: { type: 'object' as const, ...t.input_schema },
    }));

    const start = Date.now();
    const response = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature: options.temperature ?? 0.3,
      ...(systemContent ? { system: systemContent } : {}),
      messages: chatMessages,
      tools: anthropicTools,
    });
    const latencyMs = Date.now() - start;

    // Parse response content blocks
    let textContent = '';
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        });
      }
    }

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;

    return {
      content: textContent,
      provider: 'anthropic',
      model,
      inputTokens,
      outputTokens,
      costCents: this.calculateCost(model, inputTokens, outputTokens),
      latencyMs,
      cached: false,
      toolCalls,
      stopReason: response.stop_reason === 'tool_use' ? 'tool_use' : 'end_turn',
    };
  }

  private async callOpenAIWithTools(
    messages: LLMMessage[],
    tools: ToolSchema[],
    options: LLMOptions,
  ): Promise<LLMToolResponse> {
    if (!this.openai) throw new Error('OpenAI client not configured');

    const model = options.model ?? DEFAULT_OPENAI_MODEL;
    const maxTokens = options.maxTokens ?? config.AI_MAX_TOKENS ?? 4096;

    // Convert tools to OpenAI function format
    const openaiTools = tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }));

    const start = Date.now();
    const response = await this.openai.chat.completions.create({
      model,
      max_tokens: maxTokens,
      temperature: options.temperature ?? 0.3,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      tools: openaiTools,
    });
    const latencyMs = Date.now() - start;

    const choice = response.choices[0];
    const content = choice?.message?.content ?? '';
    const toolCalls: ToolCall[] = [];

    if (choice?.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        const fn = (tc as any).function;
        if (fn) {
          toolCalls.push({
            id: tc.id,
            name: fn.name,
            input: JSON.parse(fn.arguments || '{}'),
          });
        }
      }
    }

    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;

    return {
      content,
      provider: 'openai',
      model,
      inputTokens,
      outputTokens,
      costCents: this.calculateCost(model, inputTokens, outputTokens),
      latencyMs,
      cached: false,
      toolCalls,
      stopReason: choice?.finish_reason === 'tool_calls' ? 'tool_use' : 'end_turn',
    };
  }

  /**
   * Fallback for providers without native tool calling (Gemini, DeepSeek, Groq).
   * Embeds tool descriptions in the system prompt and parses JSON tool calls from output.
   */
  private async callWithToolsPromptFallback(
    provider: LLMProvider,
    messages: LLMMessage[],
    tools: ToolSchema[],
    options: LLMOptions,
  ): Promise<LLMToolResponse> {
    // Build tool description block
    const toolDescriptions = tools
      .map(
        (t) =>
          `- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.input_schema)}`,
      )
      .join('\n');

    const toolPrompt = `\nYou have access to the following tools. To use a tool, respond with a JSON block:\n\`\`\`json\n{"tool_calls": [{"name": "tool_name", "input": {...}}]}\n\`\`\`\n\nAvailable tools:\n${toolDescriptions}\n\nIf you don't need any tool, respond normally without the JSON block.`;

    // Inject tool prompt into the first system message
    const augmentedMessages = messages.map((m, i) => {
      if (m.role === 'system' && i === 0) {
        return { ...m, content: m.content + toolPrompt };
      }
      return m;
    });

    // If no system message, prepend one
    if (!augmentedMessages.some((m) => m.role === 'system')) {
      augmentedMessages.unshift({ role: 'system', content: toolPrompt });
    }

    const response = await this.callProvider(provider, augmentedMessages, options);

    // Try to parse tool calls from the response
    const toolCalls: ToolCall[] = [];
    const toolCallMatch = response.content.match(/```json\s*\n?([\s\S]*?)\n?```/);
    if (toolCallMatch) {
      try {
        const parsed = JSON.parse(toolCallMatch[1]);
        if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
          for (const tc of parsed.tool_calls) {
            toolCalls.push({
              id: `fallback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              name: tc.name,
              input: tc.input || {},
            });
          }
        }
      } catch {
        // Not valid JSON — treat as regular text response
      }
    }

    // Remove the JSON block from content if tool calls were found
    const cleanContent = toolCalls.length > 0
      ? response.content.replace(/```json\s*\n?[\s\S]*?\n?```/, '').trim()
      : response.content;

    return {
      ...response,
      content: cleanContent,
      toolCalls,
      stopReason: toolCalls.length > 0 ? 'tool_use' : 'end_turn',
    };
  }

  // ── Private helpers ───────────────────────────────────

  private async callProvider(
    provider: LLMProvider,
    messages: LLMMessage[],
    options: LLMOptions,
  ): Promise<LLMResponse> {
    if (provider === 'anthropic') return this.callAnthropic(messages, options);
    if (provider === 'openai') return this.callOpenAI(messages, options);
    if (provider === 'deepseek') return this.callDeepSeek(messages, options);
    if (provider === 'groq') return this.callGroq(messages, options);
    return this.callGemini(messages, options);
  }

  private async callAnthropic(
    messages: LLMMessage[],
    options: LLMOptions,
  ): Promise<LLMResponse> {
    if (!this.anthropic) throw new Error('Anthropic client not configured');

    const model = options.model ?? DEFAULT_ANTHROPIC_MODEL;
    const maxTokens = options.maxTokens ?? config.AI_MAX_TOKENS ?? 4096;

    // Separate system message from conversation
    const systemMsg = messages.find((m) => m.role === 'system');
    // Anthropic has no native JSON mode — enforce via system prompt enhancement
    const systemContent = options.jsonMode && systemMsg
      ? `${systemMsg.content}\n\nIMPORTANT: Respond with ONLY valid JSON. No markdown, no explanation, no code blocks — just the raw JSON.`
      : systemMsg?.content;
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const start = Date.now();
    const response = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature: options.temperature ?? 0.3,
      ...(systemContent ? { system: systemContent } : {}),
      messages: chatMessages,
    });
    const latencyMs = Date.now() - start;

    const content =
      response.content[0]?.type === 'text' ? response.content[0].text : '';

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;

    return {
      content,
      provider: 'anthropic',
      model,
      inputTokens,
      outputTokens,
      costCents: this.calculateCost(model, inputTokens, outputTokens),
      latencyMs,
      cached: false,
    };
  }

  private async callOpenAI(
    messages: LLMMessage[],
    options: LLMOptions,
  ): Promise<LLMResponse> {
    if (!this.openai) throw new Error('OpenAI client not configured');

    const model = options.model ?? DEFAULT_OPENAI_MODEL;
    const maxTokens = options.maxTokens ?? config.AI_MAX_TOKENS ?? 4096;

    const start = Date.now();
    const response = await this.openai.chat.completions.create({
      model,
      max_tokens: maxTokens,
      temperature: options.temperature ?? 0.3,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      ...(options.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    });
    const latencyMs = Date.now() - start;

    const content = response.choices[0]?.message?.content ?? '';
    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;

    return {
      content,
      provider: 'openai',
      model,
      inputTokens,
      outputTokens,
      costCents: this.calculateCost(model, inputTokens, outputTokens),
      latencyMs,
      cached: false,
    };
  }

  private async callDeepSeek(
    messages: LLMMessage[],
    options: LLMOptions,
  ): Promise<LLMResponse> {
    if (!this.deepseek) throw new Error('DeepSeek client not configured');

    const model = options.model ?? DEFAULT_DEEPSEEK_MODEL;
    const maxTokens = options.maxTokens ?? config.AI_MAX_TOKENS ?? 4096;

    const start = Date.now();
    const response = await this.deepseek.chat.completions.create({
      model,
      max_tokens: maxTokens,
      temperature: options.temperature ?? 0.3,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      ...(options.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    });
    const latencyMs = Date.now() - start;

    const content = response.choices[0]?.message?.content ?? '';
    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;

    return {
      content,
      provider: 'deepseek',
      model,
      inputTokens,
      outputTokens,
      costCents: this.calculateCost(model, inputTokens, outputTokens),
      latencyMs,
      cached: false,
    };
  }

  private async callGroq(
    messages: LLMMessage[],
    options: LLMOptions,
  ): Promise<LLMResponse> {
    if (!this.groq) throw new Error('Groq client not configured');

    const model = options.model ?? DEFAULT_GROQ_MODEL;
    const maxTokens = options.maxTokens ?? config.AI_MAX_TOKENS ?? 4096;

    const start = Date.now();
    const response = await this.groq.chat.completions.create({
      model,
      max_tokens: maxTokens,
      temperature: options.temperature ?? 0.3,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      ...(options.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    });
    const latencyMs = Date.now() - start;

    const content = response.choices[0]?.message?.content ?? '';
    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;

    return {
      content,
      provider: 'groq',
      model,
      inputTokens,
      outputTokens,
      costCents: this.calculateCost(model, inputTokens, outputTokens),
      latencyMs,
      cached: false,
    };
  }

  private async callGemini(
    messages: LLMMessage[],
    options: LLMOptions,
  ): Promise<LLMResponse> {
    if (!this.gemini) throw new Error('Gemini client not configured');

    const model = options.model ?? DEFAULT_GEMINI_MODEL;
    const maxTokens = options.maxTokens ?? config.AI_MAX_TOKENS ?? 4096;

    // Convert messages to Gemini format
    // Gemini uses 'user' and 'model' roles with a separate systemInstruction
    const systemMsg = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    // Pass systemInstruction at the model level where formatSystemInstruction handles it
    const genModel = this.gemini.getGenerativeModel({
      model,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: options.temperature ?? 0.3,
        ...(options.jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
      ...(systemMsg ? { systemInstruction: systemMsg.content } : {}),
    });

    // Build the Gemini history (all messages except the last user message)
    const geminiHistory = chatMessages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Last message is the one we send
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (!lastMessage) throw new Error('No messages to send to Gemini');

    const start = Date.now();

    const chat = genModel.startChat({
      history: geminiHistory as any,
    });

    const result = await chat.sendMessage(lastMessage.content);
    const latencyMs = Date.now() - start;

    const response = result.response;
    const content = response.text();

    // Extract token usage from response metadata
    const usageMetadata = response.usageMetadata;
    const inputTokens = usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = usageMetadata?.candidatesTokenCount ?? 0;

    return {
      content,
      provider: 'gemini',
      model,
      inputTokens,
      outputTokens,
      costCents: this.calculateCost(model, inputTokens, outputTokens),
      latencyMs,
      cached: false,
    };
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const rates = COST_PER_1K[model] ?? { input: 0.1, output: 0.3 };
    return Number(
      ((inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output).toFixed(4),
    );
  }

  // ── Caching ───────────────────────────────────────────

  private cacheKey(messages: LLMMessage[], options: LLMOptions): string {
    const hash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          messages,
          model: options.model,
          provider: options.provider,
          temperature: options.temperature,
        }),
      )
      .digest('hex')
      .slice(0, 16);
    return `${CACHE_PREFIX}${hash}`;
  }

  private async getCached(
    messages: LLMMessage[],
    options: LLMOptions,
  ): Promise<LLMResponse | null> {
    try {
      const key = this.cacheKey(messages, options);
      const cached = await cacheGet<LLMResponse>(key);
      if (cached) {
        return { ...cached, cached: true, latencyMs: 0 };
      }
    } catch {
      // ignore cache errors
    }
    return null;
  }

  private async setCached(
    messages: LLMMessage[],
    options: LLMOptions,
    response: LLMResponse,
  ): Promise<void> {
    try {
      const key = this.cacheKey(messages, options);
      await cacheSet(key, response, CACHE_TTL);
    } catch {
      // ignore cache errors
    }
  }

  // ── Rate Limiting ─────────────────────────────────────

  private async checkRateLimit(tenantId: string, userId?: string, isSystemCall?: boolean): Promise<void> {
    try {
      // 1. Check per-tenant rate limit
      const tenantKey = `${RATE_LIMIT_PREFIX}tenant:${tenantId}`;
      const tenantCount = await cacheGet<number>(tenantKey);
      if (tenantCount !== null && tenantCount >= RATE_LIMIT_TENANT_MAX) {
        throw new Error('AI rate limit exceeded for your organization. Please try again in a minute.');
      }
      await cacheSet(tenantKey, (tenantCount ?? 0) + 1, RATE_LIMIT_WINDOW);

      // 2. Check per-user rate limit (skip for system/proactive calls)
      if (userId && !isSystemCall) {
        const userKey = `${RATE_LIMIT_PREFIX}user:${userId}`;
        const userCount = await cacheGet<number>(userKey);
        if (userCount !== null && userCount >= RATE_LIMIT_USER_MAX) {
          throw new Error('AI rate limit exceeded for your account. Please try again in a minute.');
        }
        await cacheSet(userKey, (userCount ?? 0) + 1, RATE_LIMIT_WINDOW);
      }

      // 3. System calls use a separate bucket (so proactive scheduler doesn't compete with users)
      if (isSystemCall) {
        const sysKey = `${RATE_LIMIT_SYSTEM_PREFIX}${tenantId}`;
        const sysCount = await cacheGet<number>(sysKey);
        if (sysCount !== null && sysCount >= RATE_LIMIT_TENANT_MAX) {
          throw new Error('System AI rate limit exceeded. Proactive tasks will resume shortly.');
        }
        await cacheSet(sysKey, (sysCount ?? 0) + 1, RATE_LIMIT_WINDOW);
      }
    } catch (err) {
      if ((err as Error).message.includes('rate limit')) throw err;
      // ignore Redis errors for rate limiting
    }
  }
}

export const llmClient = new LLMClient();
