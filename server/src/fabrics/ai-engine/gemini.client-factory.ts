/**
 * Gemini Real Client Factory — Fabric layer adapter.
 * Bridges @google/generative-ai SDK to the IGeminiClient protocol interface.
 *
 * FABRIC RULE: This file lives in the fabrics layer and is the ONLY place
 * that imports the Google Generative AI SDK. Service code never imports this.
 *
 * Note: The IGeminiClient interface mirrors the Python aio API shape.
 * This adapter wraps the Node.js SDK to match that interface.
 *
 * DNA: Fabric First (Rule 1). Keys injected via TenantKeyResolver — never hardcoded.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { IGeminiClient, GeminiGenerateContentConfig, GeminiResponse } from './protocols';

/**
 * Create a real Gemini client that implements IGeminiClient.
 * Called by GeminiProvider when a real API key is available.
 */
export function createGeminiClient(apiKey: string): IGeminiClient {
  const genAI = new GoogleGenerativeAI(apiKey);

  return {
    aio: {
      models: {
        async generate_content(params: {
          model: string;
          contents: string;
          config?: GeminiGenerateContentConfig;
        }): Promise<GeminiResponse> {
          const modelInit = { model: params.model } as Record<string, unknown>;

          if (params.config?.system_instruction) {
            modelInit['systemInstruction'] = params.config.system_instruction;
          }

          // Cast to unknown first to satisfy strict type overlap check
          const model = genAI.getGenerativeModel(
            modelInit as unknown as Parameters<typeof genAI.getGenerativeModel>[0],
          );

          const generationConfig: Record<string, unknown> = {};
          if (params.config?.max_output_tokens !== undefined) {
            generationConfig['maxOutputTokens'] = params.config.max_output_tokens;
          }
          if (params.config?.temperature !== undefined) {
            generationConfig['temperature'] = params.config.temperature;
          }

          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: params.contents }] }],
            generationConfig: generationConfig as Parameters<
              typeof model.generateContent
            >[0] extends { generationConfig?: infer C }
              ? C
              : never,
          });

          const response = result.response;
          const text = response.text();
          const usage = response.usageMetadata;

          return {
            text: text ?? null,
            usage_metadata: {
              prompt_token_count: usage?.promptTokenCount ?? 0,
              candidates_token_count: usage?.candidatesTokenCount ?? 0,
              total_token_count: usage?.totalTokenCount ?? 0,
            },
          };
        },
      },
    },
  };
}
