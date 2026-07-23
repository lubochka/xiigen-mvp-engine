/**
 * Anthropic Real Client Factory — Fabric layer adapter.
 * Bridges @anthropic-ai/sdk to the IAnthropicClient protocol interface.
 *
 * FABRIC RULE: This file lives in the fabrics layer and is the ONLY place
 * that imports the Anthropic SDK. Service code never imports this.
 *
 * DNA: Fabric First (Rule 1). Keys injected via TenantKeyResolver — never hardcoded.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { IAnthropicClient } from './protocols';

/**
 * Create a real Anthropic client that implements IAnthropicClient.
 * Called by AnthropicProvider when a real API key is available.
 */
export function createAnthropicClient(apiKey: string): IAnthropicClient {
  const sdk = new Anthropic({ apiKey });

  return {
    messages: {
      async create(params) {
        const response = await sdk.messages.create({
          model: params.model,
          max_tokens: params.max_tokens,
          messages: params.messages as Array<{ role: 'user' | 'assistant'; content: string }>,
          ...(params.system ? { system: params.system } : {}),
          ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
        });

        return {
          id: response.id,
          type: response.type,
          role: response.role,
          model: response.model,
          content: response.content.map((block) => ({
            type: block.type,
            text: block.type === 'text' ? block.text : undefined,
          })),
          usage: {
            input_tokens: response.usage.input_tokens,
            output_tokens: response.usage.output_tokens,
          },
          stop_reason: response.stop_reason ?? null,
        };
      },
    },
  };
}
