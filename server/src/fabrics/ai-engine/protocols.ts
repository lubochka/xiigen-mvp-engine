/**
 * AI Engine Fabric — Protocol Interfaces for external AI SDKs.
 *
 * Each interface matches the async API surface of the corresponding SDK.
 * Tests inject mock objects implementing these interfaces.
 * Real SDKs are NOT installed — these enable fabric-first testing.
 *
 * Phase 4.1: Interfaces only. Concrete providers in P4.2.
 */

// ── Anthropic SDK Protocol ───────────────────────────
// Matches: @anthropic-ai/sdk AsyncAnthropic

export interface AnthropicMessage {
  id: string;
  type: string;
  role: string;
  model: string;
  content: Array<{ type: string; text?: string }>;
  usage: { input_tokens: number; output_tokens: number };
  stop_reason: string | null;
}

export interface IAnthropicMessagesApi {
  create(params: {
    model: string;
    max_tokens: number;
    messages: Array<{ role: string; content: string }>;
    system?: string;
    temperature?: number;
  }): Promise<AnthropicMessage>;
}

export interface IAnthropicClient {
  messages: IAnthropicMessagesApi;
}

// ── OpenAI SDK Protocol ──────────────────────────────
// Matches: openai AsyncOpenAI

export interface OpenAiChatCompletion {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string | null };
    finish_reason: string | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    completion_tokens_details?: {
      reasoning_tokens?: number;
    };
  };
}

export interface IOpenAiCompletionsApi {
  create(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    max_tokens?: number;
    max_completion_tokens?: number;
    temperature?: number;
  }): Promise<OpenAiChatCompletion>;
}

export interface IOpenAiChatApi {
  completions: IOpenAiCompletionsApi;
}

export interface IOpenAiClient {
  chat: IOpenAiChatApi;
}

// ── Google Gemini SDK Protocol ───────────────────────
// Matches: google-genai Client (aio.models.generate_content)

export interface GeminiUsageMetadata {
  prompt_token_count: number;
  candidates_token_count: number;
  total_token_count: number;
  thoughts_token_count?: number;
}

export interface GeminiResponse {
  text: string | null;
  usage_metadata: GeminiUsageMetadata;
}

export interface GeminiGenerateContentConfig {
  system_instruction?: string;
  max_output_tokens?: number;
  temperature?: number;
}

export interface IGeminiModelsApi {
  generate_content(params: {
    model: string;
    contents: string;
    config?: GeminiGenerateContentConfig;
  }): Promise<GeminiResponse>;
}

export interface IGeminiAioApi {
  models: IGeminiModelsApi;
}

export interface IGeminiClient {
  aio: IGeminiAioApi;
}

// ── Grok / xAI SDK Protocol ─────────────────────────
// Matches: xai-sdk AsyncClient (chat.create → sample)

export interface GrokUsage {
  prompt_tokens: number;
  completion_tokens: number;
}

export interface GrokSampleResponse {
  content: string | null;
  usage: GrokUsage;
  id: string;
}

export interface IGrokChat {
  append(message: { role: string; content: string }): void;
  sample(): Promise<GrokSampleResponse>;
}

export interface IGrokChatApi {
  create(params: { model: string; max_tokens?: number; temperature?: number }): IGrokChat;
}

export interface IGrokClient {
  chat: IGrokChatApi;
}

// ── Helper functions for Grok message creation ──────

export function grokSystemMessage(content: string): { role: string; content: string } {
  return { role: 'system', content };
}

export function grokUserMessage(content: string): { role: string; content: string } {
  return { role: 'user', content };
}
