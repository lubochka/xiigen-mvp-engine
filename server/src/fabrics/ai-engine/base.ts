/**
 * AI Engine Fabric — base types, enums, model profiles, config.
 *
 * Follows same pattern as database/base.ts and queue/base.ts:
 *   - AiProviderType enum for all supported AI providers
 *   - ModelProfile with capability metadata + cost helpers
 *   - AiConfig with default model, catalog, timeout
 *   - Pre-configured model catalog for 5 default models
 *
 * Phase 4.1: Types only. Concrete providers in P4.2.
 */

import { AiModelRole } from '../interfaces/ai-provider.interface';

// ── Provider Type Enum ───────────────────────────────

export enum AiProviderType {
  MOCK = 'mock',
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GOOGLE = 'google',
  GROK = 'grok',
}

// ── Model Profile ────────────────────────────────────

export interface ModelProfile {
  readonly provider: AiProviderType;
  readonly modelId: string;
  readonly displayName: string;
  readonly maxTokens: number;
  readonly contextWindow: number;
  readonly costPerInputToken: number;
  readonly costPerOutputToken: number;
  readonly costPerThinkingToken?: number; // only set for reasoning models (Gemini 2.5, gpt-o*)
  readonly role: AiModelRole;
  readonly capabilities: Record<string, boolean>;
  readonly version: string;
}

/** Estimate total cost for a given token count. */
export function estimateCost(
  profile: ModelProfile,
  inputTokens: number,
  outputTokens: number,
  thinkingTokens = 0,
): number {
  const thinkingCost =
    thinkingTokens * (profile.costPerThinkingToken ?? profile.costPerOutputToken);
  return (
    inputTokens * profile.costPerInputToken +
    outputTokens * profile.costPerOutputToken +
    thinkingCost
  );
}

/** Check if a model supports a given capability. */
export function supportsCapability(profile: ModelProfile, capability: string): boolean {
  return profile.capabilities[capability] === true;
}

/** Serialize ModelProfile to dict (DNA-1). */
export function modelProfileToDict(profile: ModelProfile): Record<string, unknown> {
  return {
    provider: profile.provider,
    model_id: profile.modelId,
    display_name: profile.displayName,
    max_tokens: profile.maxTokens,
    context_window: profile.contextWindow,
    cost_per_input_token: profile.costPerInputToken,
    cost_per_output_token: profile.costPerOutputToken,
    role: profile.role,
    capabilities: { ...profile.capabilities },
    version: profile.version,
  };
}

// ── Pre-configured Model Profiles ────────────────────

export const CLAUDE_OPUS: ModelProfile = {
  provider: AiProviderType.ANTHROPIC,
  modelId: 'claude-opus-4-5',
  displayName: 'Claude Opus 4.5',
  maxTokens: 8192,
  contextWindow: 200_000,
  costPerInputToken: 0.000015,
  costPerOutputToken: 0.000075,
  role: AiModelRole.PRIMARY,
  capabilities: { structured_output: true, vision: true, long_context: true },
  version: '4.5',
};

export const CLAUDE_SONNET: ModelProfile = {
  provider: AiProviderType.ANTHROPIC,
  modelId: 'claude-sonnet-4-5',
  displayName: 'Claude Sonnet 4.5',
  maxTokens: 8192,
  contextWindow: 200_000,
  costPerInputToken: 0.000003,
  costPerOutputToken: 0.000015,
  role: AiModelRole.FAST,
  capabilities: { structured_output: true, vision: true, long_context: true },
  version: '4.5',
};

export const CLAUDE_ECONOMY: ModelProfile = {
  provider: AiProviderType.ANTHROPIC,
  modelId: 'claude-haiku-4-5',
  displayName: 'Claude Haiku 4.5',
  maxTokens: 8192,
  contextWindow: 200_000,
  costPerInputToken: 0.0000008, // $0.80/M
  costPerOutputToken: 0.000004, // $4/M
  role: AiModelRole.FAST,
  capabilities: { structured_output: true, function_calling: true },
  version: '4.5',
};

export const GPT_4O: ModelProfile = {
  provider: AiProviderType.OPENAI,
  modelId: 'gpt-4o',
  displayName: 'GPT-4o',
  maxTokens: 4096,
  contextWindow: 128_000,
  costPerInputToken: 0.0000025,
  costPerOutputToken: 0.00001,
  role: AiModelRole.CROSS_VALIDATE,
  capabilities: { structured_output: true, function_calling: true, vision: true },
  version: '4o',
};

export const GPT_5: ModelProfile = {
  provider: AiProviderType.OPENAI,
  modelId: 'gpt-5',
  displayName: 'GPT-5',
  maxTokens: 16384,
  contextWindow: 128_000,
  costPerInputToken: 0.000015, // $15/M input
  costPerOutputToken: 0.00006, // $60/M output (reasoning tokens billed at same rate)
  role: AiModelRole.CROSS_VALIDATE,
  capabilities: { structured_output: true, function_calling: true, reasoning: true },
  version: '5',
};

export const GEMINI_2_5_PRO: ModelProfile = {
  provider: AiProviderType.GOOGLE,
  modelId: 'gemini-2.5-pro',
  displayName: 'Gemini 2.5 Pro',
  maxTokens: 8192,
  contextWindow: 1_000_000,
  costPerInputToken: 0.00000125, // $1.25/M (≤200K context)
  costPerOutputToken: 0.00001, // $10/M output
  costPerThinkingToken: 0.0000035, // $3.50/M thinking tokens
  role: AiModelRole.CROSS_VALIDATE,
  capabilities: { structured_output: true, vision: true, long_context: true, reasoning: true },
  version: '2.5',
};

export const GROK_4: ModelProfile = {
  provider: AiProviderType.GROK,
  modelId: 'grok-4',
  displayName: 'Grok 4',
  maxTokens: 8192,
  contextWindow: 128_000,
  costPerInputToken: 0.000003,
  costPerOutputToken: 0.000015,
  role: AiModelRole.CROSS_VALIDATE,
  capabilities: { structured_output: true, function_calling: true },
  version: '4.0',
};

// ── Gemini tier profiles ──────────────────────────────

export const GEMINI_2_5_FLASH: ModelProfile = {
  provider: AiProviderType.GOOGLE,
  modelId: 'gemini-2.5-flash',
  displayName: 'Gemini 2.5 Flash',
  maxTokens: 8192,
  contextWindow: 1_000_000,
  costPerInputToken: 0.00000015, // $0.15/M
  costPerOutputToken: 0.0000006, // $0.60/M
  costPerThinkingToken: 0.0000003, // $0.30/M thinking
  role: AiModelRole.PRIMARY,
  capabilities: { structured_output: true, vision: true, long_context: true, reasoning: true },
  version: '2.5-flash',
};

export const GEMINI_2_5_FLASH_LITE: ModelProfile = {
  provider: AiProviderType.GOOGLE,
  modelId: 'gemini-2.5-flash-lite',
  displayName: 'Gemini 2.5 Flash Lite',
  maxTokens: 8192,
  contextWindow: 1_000_000,
  costPerInputToken: 0.00000002, // $0.02/M
  costPerOutputToken: 0.0000001, // $0.10/M
  costPerThinkingToken: 0, // no thinking
  role: AiModelRole.FAST,
  capabilities: { structured_output: true, vision: true, long_context: true },
  version: '2.5-flash-lite',
};

// ── OpenAI economy tier ───────────────────────────────

export const GPT_4_1: ModelProfile = {
  provider: AiProviderType.OPENAI,
  modelId: 'gpt-4.1',
  displayName: 'GPT-4.1',
  maxTokens: 16384,
  contextWindow: 128_000,
  costPerInputToken: 0.000002, // $2/M
  costPerOutputToken: 0.000008, // $8/M
  role: AiModelRole.PRIMARY,
  capabilities: { structured_output: true, function_calling: true },
  version: '4.1',
};

// ── Provider tier defaults (env-var-overridable) ──────

export const GEMINI_TIER_DEFAULTS = {
  economy: process.env['GEMINI_MODEL_ECONOMY'] ?? 'gemini-2.5-flash-lite',
  balanced: process.env['GEMINI_MODEL_BALANCED'] ?? 'gemini-2.5-flash',
  premium: process.env['GEMINI_MODEL_PREMIUM'] ?? 'gemini-2.5-pro',
} as const;

export const OPENAI_TIER_DEFAULTS = {
  economy: process.env['OPENAI_MODEL_ECONOMY'] ?? 'gpt-4.1',
  balanced: process.env['OPENAI_MODEL_BALANCED'] ?? 'gpt-4.1',
  premium: process.env['OPENAI_MODEL_PREMIUM'] ?? 'gpt-5',
} as const;

export const ANTHROPIC_TIER_DEFAULTS = {
  economy: process.env['ANTHROPIC_MODEL_ECONOMY'] ?? 'claude-haiku-4-5',
  balanced: process.env['ANTHROPIC_MODEL_BALANCED'] ?? 'claude-sonnet-4-5',
  premium: process.env['ANTHROPIC_MODEL_PREMIUM'] ?? 'claude-opus-4-5',
} as const;

/** Map AiModelRole to the correct tier key. */
export function roleToTier(role: AiModelRole): 'economy' | 'balanced' | 'premium' {
  switch (role) {
    case AiModelRole.FAST:
      return 'economy';
    case AiModelRole.CROSS_VALIDATE:
      return 'premium';
    case AiModelRole.PRIMARY:
    default:
      return 'balanced';
  }
}

/** Default model catalog — all models pre-configured. */
export const DEFAULT_MODEL_CATALOG: Record<string, ModelProfile> = {
  [CLAUDE_OPUS.modelId]: CLAUDE_OPUS,
  [CLAUDE_SONNET.modelId]: CLAUDE_SONNET,
  [CLAUDE_ECONOMY.modelId]: CLAUDE_ECONOMY,
  [GPT_5.modelId]: GPT_5,
  [GPT_4_1.modelId]: GPT_4_1,
  [GEMINI_2_5_PRO.modelId]: GEMINI_2_5_PRO,
  [GEMINI_2_5_FLASH.modelId]: GEMINI_2_5_FLASH,
  [GEMINI_2_5_FLASH_LITE.modelId]: GEMINI_2_5_FLASH_LITE,
  [GROK_4.modelId]: GROK_4,
};

// ── AI Config ────────────────────────────────────────

export interface AiConfig {
  readonly defaultModel: string;
  readonly models: Record<string, ModelProfile>;
  readonly timeoutSeconds: number;
  readonly maxRetries: number;
  readonly options: Record<string, unknown>;
}

/** Sensible defaults for AI config. */
export function defaultAiConfig(overrides?: Partial<AiConfig>): AiConfig {
  return {
    defaultModel: 'claude-sonnet-4-5',
    models: { ...DEFAULT_MODEL_CATALOG },
    timeoutSeconds: 30,
    maxRetries: 2,
    options: {},
    ...overrides,
  };
}

/** Get a model profile by ID from config. */
export function getModel(config: AiConfig, modelId: string): ModelProfile | undefined {
  return config.models[modelId];
}

/** Get the default model profile from config. */
export function getDefaultModel(config: AiConfig): ModelProfile | undefined {
  return config.models[config.defaultModel];
}

/** List all models, optionally filtered by role. */
export function listModels(config: AiConfig, role?: AiModelRole): ModelProfile[] {
  const all = Object.values(config.models);
  if (role !== undefined) {
    return all.filter((p) => p.role === role);
  }
  return all;
}

/** List all model IDs. */
export function listModelIds(config: AiConfig): string[] {
  return Object.keys(config.models);
}
