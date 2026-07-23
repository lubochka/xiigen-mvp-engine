/**
 * DelegatingAiProvider — Phase B-3: per-request AI provider selection.
 *
 * Replaces the module-init-time `AI_PROVIDER` resolution (BOOTSTRAP env var check).
 * At every AI call, reads TenantKeyResolver at call time to determine which provider
 * the current tenant has keys for, and delegates to that provider.
 *
 * Resolution order:
 *   0. AI_PROVIDER=mock                     → MockAiProvider (zero-cost testing)
 *   1. AI_PROVIDER=gemini hint              → GeminiProvider (if wired)
 *   2. AI_PROVIDER=openai hint              → OpenAiProvider (if wired)
 *   3. anthropic key present (key-based)    → AnthropicProvider
 *   4. openai key present (key-based)       → OpenAiProvider
 *   5. google key present (key-based)       → GeminiProvider
 *   6. fallback                             → MockAiProvider
 *
 * DNA-3: never throws — delegates to the resolved provider's DataProcessResult contract.
 * DNA-6: reads tenantId from AsyncLocalStorage via TenantKeyResolver — no tenantId param.
 */

import { Injectable } from '@nestjs/common';
import { IAiProvider } from '../interfaces/ai-provider.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantKeyResolver } from '../../kernel/multi-tenant/tenant-key.resolver';

@Injectable()
export class DelegatingAiProvider extends IAiProvider {
  constructor(
    private readonly keyResolver: TenantKeyResolver,
    /** Anthropic instance — used when tenant has 'anthropic' key or BOOTSTRAP_ANTHROPIC_KEY set */
    private readonly anthropic: IAiProvider,
    /** OpenAI instance — used when tenant has 'openai' key. Null if not configured. */
    private readonly openai: IAiProvider | null,
    /** Gemini instance — used when tenant has 'google' key. Null if not configured. */
    private readonly gemini: IAiProvider | null,
    /** MockAiProvider — fallback when no keys are available */
    private readonly mock: IAiProvider,
  ) {
    super();
  }

  async generate(
    prompt: string,
    options?: { systemPrompt?: string; model?: string; maxTokens?: number; temperature?: number },
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    return this.resolveProvider().generate(prompt, options);
  }

  async generateStructured(
    prompt: string,
    outputSchema: Record<string, unknown>,
    options?: { systemPrompt?: string; model?: string },
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    return this.resolveProvider().generateStructured(prompt, outputSchema, options);
  }

  getModelInfo(): Record<string, unknown> {
    return this.resolveProvider().getModelInfo();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /**
   * Resolve the concrete provider at call time — reads TenantContext from AsyncLocalStorage.
   *
   * Resolution order:
   *   0. AI_PROVIDER=mock                     → MockAiProvider (zero-cost testing)
   *   1. AI_PROVIDER=gemini hint              → GeminiProvider (if wired)
   *   2. AI_PROVIDER=openai hint              → OpenAiProvider (if wired)
   *   3. anthropic key present (key-based)    → AnthropicProvider
   *   4. openai key present (key-based)       → OpenAiProvider
   *   5. google key present (key-based)       → GeminiProvider
   *   6. fallback                             → MockAiProvider
   */
  private resolveProvider(): IAiProvider {
    const hint = process.env['AI_PROVIDER'];

    // Explicit mock — zero cost, for logic verification
    if (hint === 'mock') return this.mock;

    // Explicit provider hint — overrides key-based ordering.
    // AI_PROVIDER=gemini routes ALL planner/judge/arbiter calls to Gemini,
    // even when BOOTSTRAP_ANTHROPIC_KEY is also present in .env.
    if (hint === 'gemini' && this.gemini) return this.gemini;
    if (hint === 'openai' && this.openai) return this.openai;
    // 'anthropic' hint falls through to key-based resolution below (same result)

    // No hint or unrecognised hint → key-based priority order
    if (this.keyResolver.getKey('anthropic')) return this.anthropic;
    if (this.openai && this.keyResolver.getKey('openai')) return this.openai;
    if (this.gemini && this.keyResolver.getKey('google')) return this.gemini;
    return this.mock;
  }
}
