/**
 * ArbiterService — runs one arbiter prompt against one candidate.
 *
 * Injects the candidate code into the arbiter's promptTemplate
 * and calls IAiProvider. Parses structured JSON verdict.
 *
 * G-2 fix: uses AI_JUDGE_PROVIDER (dedicated judge) to prevent same-model bias.
 * Falls back to AI_PROVIDER with a visible warning when judge is not configured.
 *
 * DNA-3: DataProcessResult returns — never throws for business logic.
 */

import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import {
  IAiProvider,
  AI_PROVIDER,
  AI_JUDGE_PROVIDER,
} from '../../fabrics/interfaces/ai-provider.interface';
import { ArbiterDefinition, ArbiterVerdict } from './arbiter-registry';

@Injectable()
export class ArbiterService {
  private readonly logger = new Logger(ArbiterService.name);

  constructor(
    // AI_JUDGE_PROVIDER: dedicated judge — separate from the generator (G-2 fix).
    // Prevents same-model bias: the model that generated the code cannot judge it.
    // Falls back to AI_PROVIDER with a visible warning when judge is not configured.
    @Optional() @Inject(AI_JUDGE_PROVIDER) private readonly judgeAi: IAiProvider | null = null,
    @Inject(AI_PROVIDER) private readonly fallbackAi: IAiProvider,
  ) {}

  /** Returns judge provider, with fallback + warning when judge is not configured. */
  private get ai(): IAiProvider {
    if (!this.judgeAi) {
      this.logger.warn(
        'AI_JUDGE_PROVIDER not available — arbiter using AI_PROVIDER (generation model). ' +
          'Scores may be inflated. Register AI_JUDGE_PROVIDER to fix.',
      );
    }
    return this.judgeAi ?? this.fallbackAi;
  }

  async judge(
    candidate: Record<string, unknown>,
    arbiter: ArbiterDefinition,
  ): Promise<DataProcessResult<ArbiterVerdict>> {
    const code = (candidate['code'] as string) ?? JSON.stringify(candidate);
    const model = (candidate['model'] as string) ?? 'unknown';

    const prompt = arbiter.promptTemplate.replace('{{CODE}}', code);

    const aiResult = await this.ai.generate(prompt, {
      systemPrompt: 'You are a code review arbiter. Respond ONLY with valid JSON.',
      temperature: 0.1,
      maxTokens: 1000,
    });

    if (!aiResult.isSuccess) {
      return DataProcessResult.failure('AI_FAILED', aiResult.errorMessage ?? 'AI call failed');
    }

    try {
      const text = (aiResult.data!['text'] as string) ?? '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        return DataProcessResult.failure('PARSE_FAILED', 'AI did not return JSON verdict');
      }
      const parsed = JSON.parse(match[0]) as {
        score: number;
        passed: boolean;
        notes: string[];
        suggestions: string[];
      };

      const score = parsed.score ?? 0;
      return DataProcessResult.success({
        arbiterId: arbiter.id,
        candidateModel: model,
        score,
        passed: score >= arbiter.minPassScore,
        notes: parsed.notes ?? [],
        suggestions: parsed.suggestions ?? [],
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return DataProcessResult.failure('PARSE_ERROR', `Failed to parse verdict: ${msg}`);
    }
  }
}
