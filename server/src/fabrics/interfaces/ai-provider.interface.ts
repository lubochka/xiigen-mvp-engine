/**
 * FABRIC 3: IAiProvider + IAiDispatcher (Skills 06/07)
 *
 * AI Engine Fabric — single provider + multi-model dispatcher.
 * 4+ providers: Claude, OpenAI, Gemini, DeepSeek (extensible).
 * Service code calls IAiProvider.generate(), never openai.chat().
 *
 * v4: No tenant_id parameter. Per-tenant API keys resolved via
 * TenantKeyResolver inside each concrete provider.
 */

import { DataProcessResult } from '../../kernel/data-process-result';

/** Role of an AI model in the pipeline. */
export enum AiModelRole {
  PRIMARY = 'primary',
  FAST = 'fast',
  CROSS_VALIDATE = 'cross_validate',
  JUDGE = 'judge',
}

/** Single AI provider interface. */
export abstract class IAiProvider {
  /**
   * Generate text completion.
   * Returns { text, model, tokens_used, cost }.
   */
  abstract generate(
    prompt: string,
    options?: {
      systemPrompt?: string;
      model?: string; // explicit model override — wins over role
      maxTokens?: number;
      temperature?: number;
      role?: AiModelRole; // purpose hint → tier selection (FAST/PRIMARY/CROSS_VALIDATE)
    },
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  /**
   * Generate structured output conforming to a schema.
   * Returns parsed object matching the schema.
   */
  abstract generateStructured(
    prompt: string,
    outputSchema: Record<string, unknown>,
    options?: {
      systemPrompt?: string;
      model?: string;
      role?: AiModelRole; // purpose hint → tier selection
    },
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  /** Return provider/model metadata. */
  abstract getModelInfo(): Record<string, unknown>;
}

/** AI Dispatcher — orchestrates parallel multi-model execution. */
export abstract class IAiDispatcher {
  /**
   * Run multiple models in parallel, score, return best.
   * Returns { text, model_used, scores, all_outputs }.
   */
  abstract generateWithConsensus(
    prompt: string,
    modelIds: string[],
    options?: {
      systemPrompt?: string;
      judgeRubric?: Record<string, unknown>;
      keepAll?: boolean; // when true, all_outputs includes every model's response
    },
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  /** Run a single specified model. */
  abstract generateSingle(
    prompt: string,
    modelId: string,
    options?: {
      systemPrompt?: string;
    },
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

/** Injection tokens. */
export const AI_PROVIDER = Symbol('IAiProvider');
export const AI_DISPATCHER = Symbol('IAiDispatcher');
/**
 * Dedicated judge provider token — wired to claude-sonnet-4-5 (same model family as AI_PROVIDER).
 * Judge uses same model family as generator but separate instance —
 * never receives generation requests, only evaluation.
 * Used for blind multi-model judging: receives shuffled Output A/B/C, returns JSON ranking.
 */
export const AI_JUDGE_PROVIDER = Symbol('IAiJudgeProvider');

/**
 * OpenAI provider token — wired to OpenAiProvider (gpt-4o default).
 * Registered as @Optional() — gracefully absent when OPENAI_API_KEY not set.
 */
export const AI_OPENAI_PROVIDER = Symbol('IAiOpenAiProvider');

/**
 * Gemini provider token — wired to GeminiProvider (gemini-2.0-flash default).
 * Registered as @Optional() — gracefully absent when GEMINI_API_KEY not set.
 */
export const AI_GEMINI_PROVIDER = Symbol('IAiGeminiProvider');

/**
 * Scope isolation arbiter token — dedicated economy-tier provider for the
 * scope_isolation arbiter (FC-32, SK-526, Rule 18, CF-POLICY-01).
 * Separate from AI_JUDGE_PROVIDER: two distinct economy-tier calls per panel run.
 * Wired as useExisting: AI_JUDGE_PROVIDER until a dedicated model is configured.
 */
export const AI_SCOPE_ARBITER = Symbol('IAiScopeArbiter');
