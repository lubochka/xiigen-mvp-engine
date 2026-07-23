/**
 * AI Engine Fabric — all exports.
 * Interfaces come from ../interfaces. This barrel exports providers + infrastructure.
 */

// Base types + model catalog
export {
  AiProviderType,
  estimateCost,
  supportsCapability,
  modelProfileToDict,
  CLAUDE_OPUS,
  CLAUDE_SONNET,
  GPT_4_1,
  GPT_5,
  GEMINI_2_5_FLASH_LITE,
  GEMINI_2_5_FLASH,
  GEMINI_2_5_PRO,
  GROK_4,
  GEMINI_TIER_DEFAULTS,
  OPENAI_TIER_DEFAULTS,
  ANTHROPIC_TIER_DEFAULTS,
  roleToTier,
  DEFAULT_MODEL_CATALOG,
  defaultAiConfig,
  getModel,
  getDefaultModel,
  listModels,
  listModelIds,
} from './base';
export type { ModelProfile, AiConfig } from './base';

// Protocol interfaces
export type {
  IAnthropicClient,
  IAnthropicMessagesApi,
  AnthropicMessage,
  IOpenAiClient,
  IOpenAiChatApi,
  IOpenAiCompletionsApi,
  OpenAiChatCompletion,
  IGeminiClient,
  IGeminiAioApi,
  IGeminiModelsApi,
  GeminiResponse,
  GeminiUsageMetadata,
  GeminiGenerateContentConfig,
  IGrokClient,
  IGrokChatApi,
  IGrokChat,
  GrokSampleResponse,
  GrokUsage,
} from './protocols';
export { grokSystemMessage, grokUserMessage } from './protocols';

// Provider Registry
export { AiProviderRegistry } from './provider-registry';
export type { AiProviderFactory } from './provider-registry';

// Fabric Resolver
export { AiFabricResolver } from './fabric-resolver';
export type { AiResolverConfig } from './fabric-resolver';

// Mock Provider (P2.3)
export { MockAiProvider } from './mock.provider';
export type { MockAiProviderOptions } from './mock.provider';

// Skill-Faithful Mock Provider — SK-520/452/521 output contracts
export { SkillFaithfulMockProvider } from './providers/skill-faithful-mock.provider';
export type { SkillFaithfulMockOptions } from './providers/skill-faithful-mock.provider';

// Concrete Providers (P4.2)
export { AnthropicProvider } from './anthropic.provider';
export type { AnthropicClientFactory } from './anthropic.provider';
export { OpenAiProvider } from './openai.provider';
export type { OpenAiClientFactory } from './openai.provider';
export { GeminiProvider } from './gemini.provider';
export type { GeminiClientFactory } from './gemini.provider';
export { GrokProvider } from './grok.provider';
export type { GrokClientFactory } from './grok.provider';

// Supporting Infrastructure (P4.3)
export { OutputScorer, DEFAULT_RUBRIC } from './scoring';
export { CostTracker } from './cost-tracker';
export { TokenBudget } from './token-budget';
export { createExecutionRecipe, executionRecipeToDict } from './execution-recipe';
export type { ExecutionRecipe } from './execution-recipe';

// AiDispatcher (P4.4)
export { AiDispatcher } from './dispatcher';

// Module (P4.5)
export { AiEngineModule } from './ai-engine.module';
