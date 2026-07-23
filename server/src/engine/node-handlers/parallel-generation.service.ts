import { Injectable, Logger } from '@nestjs/common';

export interface GeneratorConfig {
  providerId: string;
  modelToken: string;
  weight?: number;
}

export interface GenerationCandidate {
  providerId: string;
  label: string; // blind label: 'A', 'B', 'C'...
  code: string;
  model: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface ParallelGenerationResult {
  candidates: GenerationCandidate[];
  shuffleWasApplied: boolean;
  isSingleProviderFallback: boolean;
  activeProviderCount: number;
}

@Injectable()
export class ParallelGenerationService {
  private readonly logger = new Logger(ParallelGenerationService.name);

  /**
   * Run all configured generators in parallel and return shuffled, blind-labeled candidates.
   * If < 2 providers are active: single-provider fallback (shuffleWasApplied: false).
   * NEVER throws.
   */
  async generate(params: {
    prompt: string;
    generators: GeneratorConfig[];
    providerMap: Record<string, unknown>; // providerId → IAiProvider instance
    context?: Record<string, unknown>;
  }): Promise<ParallelGenerationResult> {
    try {
      const { prompt, generators, providerMap } = params;

      // Filter to active generators (those with a provider in providerMap)
      const active = generators.filter((g) => !!providerMap[g.providerId]);

      // Single-provider fallback
      if (active.length < 2) {
        this.logger.warn(
          `ParallelGenerationService: only ${active.length} active provider(s) — single-provider fallback. DPO triple will be MONO_MODEL_CALIBRATION.`,
        );
        const single = active[0];
        if (!single) {
          return {
            candidates: [],
            shuffleWasApplied: false,
            isSingleProviderFallback: true,
            activeProviderCount: 0,
          };
        }
        const provider = providerMap[single.providerId] as {
          generate: (p: string) => Promise<{ code: string; model?: string }>;
        };
        try {
          const result = await provider.generate(prompt);
          return {
            candidates: [
              {
                providerId: single.providerId,
                label: 'A',
                code: result.code,
                model: result.model ?? single.modelToken,
              },
            ],
            shuffleWasApplied: false,
            isSingleProviderFallback: true,
            activeProviderCount: 1,
          };
        } catch {
          return {
            candidates: [],
            shuffleWasApplied: false,
            isSingleProviderFallback: true,
            activeProviderCount: 1,
          };
        }
      }

      // Parallel generation via Promise.allSettled
      const results = await Promise.allSettled(
        active.map(async (g) => {
          const provider = providerMap[g.providerId] as {
            generate: (p: string) => Promise<{ code: string; model?: string }>;
          };
          const result = await provider.generate(prompt);
          return {
            providerId: g.providerId,
            code: result.code,
            model: result.model ?? g.modelToken,
          };
        }),
      );

      const successful: Array<{ providerId: string; code: string; model: string }> = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          successful.push(r.value);
        } else {
          this.logger.warn(`Generator ${active[i]!.providerId} failed: ${r.reason}`);
        }
      });

      if (successful.length === 0) {
        return {
          candidates: [],
          shuffleWasApplied: false,
          isSingleProviderFallback: true,
          activeProviderCount: active.length,
        };
      }

      // Fisher-Yates shuffle
      const shuffled = [...successful];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
      }

      // Assign blind labels
      const candidates: GenerationCandidate[] = shuffled.map((s, idx) => ({
        providerId: s.providerId,
        label: String.fromCharCode(65 + idx), // A, B, C...
        code: s.code,
        model: s.model,
      }));

      return {
        candidates,
        shuffleWasApplied: true,
        isSingleProviderFallback: false,
        activeProviderCount: active.length,
      };
    } catch {
      // Never throws
      return {
        candidates: [],
        shuffleWasApplied: false,
        isSingleProviderFallback: true,
        activeProviderCount: 0,
      };
    }
  }
}
