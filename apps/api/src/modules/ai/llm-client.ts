/**
 * LLM Client - Dual-provider abstraction for Claude (Anthropic) + OpenAI
 *
 * Features:
 * - Automatic fallback: if primary fails, retries with secondary
 * - Token counting and cost tracking per request
 * - Response caching via Redis (1hr TTL)
 * - Tenant-level rate limiting
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import crypto from 'crypto';

import { config } from '../../config';
import { logger } from '../../utils/logger';
import { cacheGet, cacheSet } from '../../utils/redis';

// ── Types ──────────────────────────────────────────────────

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
  provider?: 'anthropic' | 'openai';
  /** Skip cache lookup/store for this call */
  noCache?: boolean;
  /** Tenant ID for rate-limit tracking */
  tenantId?: string;
}

export interface LLMResponse {
  content: string;
  provider: 'anthropic' | 'openai';
  model: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  latencyMs: number;
  cached: boolean;
}

// ── Cost constants (approx cents per 1K tokens) ─────────

const COST_PER_1K: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 0.3, output: 1.5 },
  'claude-3-5-sonnet-20241022': { input: 0.3, output: 1.5 },
  'claude-3-haiku-20240307': { input: 0.025, output: 0.125 },
  'gpt-4o': { input: 0.25, output: 1.0 },
  'gpt-4o-mini': { input: 0.015, output: 0.06 },
};

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const CACHE_PREFIX = 'llm:cache:';
const CACHE_TTL = 3600; // 1 hour
const RATE_LIMIT_PREFIX = 'llm:rate:';
const RATE_LIMIT_WINDOW = 60; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute per tenant

// ── LLM Client ─────────────────────────────────────────

class LLMClient {
  private anthropic: Anthropic | null = null;
  private openai: OpenAI | null = null;
  private primaryProvider: 'anthropic' | 'openai';

  constructor() {
    this.primaryProvider = config.AI_PRIMARY_PROVIDER ?? 'anthropic';

    if (config.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
    }

    if (config.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
    }

    if (!this.anthropic && !this.openai) {
      logger.warn('No LLM API keys configured — AI features will be unavailable');
    }
  }

  /** Check whether at least one provider is available */
  get isAvailable(): boolean {
    return this.anthropic !== null || this.openai !== null;
  }

  /**
   * Send a chat completion request.
   * Automatically tries fallback provider on failure.
   */
  async chat(
    messages: LLMMessage[],
    options: LLMOptions = {},
  ): Promise<LLMResponse> {
    if (!this.isAvailable) {
      throw new Error('No LLM provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.');
    }

    // Rate-limit check
    if (options.tenantId) {
      await this.checkRateLimit(options.tenantId);
    }

    // Cache check
    if (!options.noCache) {
      const cached = await this.getCached(messages, options);
      if (cached) return cached;
    }

    const provider = options.provider ?? this.primaryProvider;
    const fallback = provider === 'anthropic' ? 'openai' : 'anthropic';

    try {
      const response = await this.callProvider(provider, messages, options);
      if (!options.noCache) {
        await this.setCached(messages, options, response);
      }
      return response;
    } catch (primaryErr) {
      logger.warn(`LLM primary provider (${provider}) failed, trying fallback`, {
        error: (primaryErr as Error).message,
      });

      try {
        const response = await this.callProvider(fallback, messages, options);
        if (!options.noCache) {
          await this.setCached(messages, options, response);
        }
        return response;
      } catch (fallbackErr) {
        logger.error('Both LLM providers failed', {
          primary: (primaryErr as Error).message,
          fallback: (fallbackErr as Error).message,
        });
        throw new Error(`LLM call failed: ${(primaryErr as Error).message}`);
      }
    }
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

  // ── Private helpers ───────────────────────────────────

  private async callProvider(
    provider: 'anthropic' | 'openai',
    messages: LLMMessage[],
    options: LLMOptions,
  ): Promise<LLMResponse> {
    if (provider === 'anthropic') return this.callAnthropic(messages, options);
    return this.callOpenAI(messages, options);
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
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const start = Date.now();
    const response = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature: options.temperature ?? 0.3,
      ...(systemMsg ? { system: systemMsg.content } : {}),
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

  private async checkRateLimit(tenantId: string): Promise<void> {
    try {
      const key = `${RATE_LIMIT_PREFIX}${tenantId}`;
      const current = await cacheGet<number>(key);
      if (current !== null && current >= RATE_LIMIT_MAX) {
        throw new Error('AI rate limit exceeded. Please try again in a minute.');
      }
      await cacheSet(key, (current ?? 0) + 1, RATE_LIMIT_WINDOW);
    } catch (err) {
      if ((err as Error).message.includes('rate limit')) throw err;
      // ignore Redis errors for rate limiting
    }
  }
}

export const llmClient = new LLMClient();
