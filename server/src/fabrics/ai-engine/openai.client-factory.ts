/**
 * OpenAI Real Client Factory — Fabric layer adapter.
 * Bridges the openai SDK to the IOpenAiClient protocol interface.
 *
 * FABRIC RULE: This file lives in the fabrics layer and is the ONLY place
 * that imports the OpenAI SDK. Service code never imports this.
 *
 * DNA: Fabric First (Rule 1). Keys injected via TenantKeyResolver — never hardcoded.
 */

import OpenAI from 'openai';
import type { IOpenAiClient } from './protocols';

/**
 * Create a real OpenAI client that implements IOpenAiClient.
 * Called by OpenAiProvider when a real API key is available.
 */
export function createOpenAiClient(apiKey: string): IOpenAiClient {
  const sdk = new OpenAI({ apiKey });

  return {
    chat: {
      completions: {
        async create(params) {
          const response = await sdk.chat.completions.create({
            model: params.model,
            messages: params.messages as Array<{
              role: 'system' | 'user' | 'assistant';
              content: string;
            }>,
            ...(params.max_tokens !== undefined ? { max_tokens: params.max_tokens } : {}),
            ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
          });

          return {
            id: response.id,
            model: response.model,
            choices: response.choices.map((c) => ({
              index: c.index,
              message: {
                role: c.message.role,
                content: c.message.content,
              },
              finish_reason: c.finish_reason ?? null,
            })),
            usage: {
              prompt_tokens: response.usage?.prompt_tokens ?? 0,
              completion_tokens: response.usage?.completion_tokens ?? 0,
              total_tokens: response.usage?.total_tokens ?? 0,
            },
          };
        },
      },
    },
  };
}
