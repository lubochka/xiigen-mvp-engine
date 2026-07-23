/**
 * BootstrapDifficultyPredictor — IDifficultyPredictor bootstrap implementation.
 *
 * Predicts cycle budget using:
 *   - Historical HISTORICAL_CYCLE_BUDGET edges from decision graph
 *   - First-occurrence penalty (checks xiigen-rag-patterns via IRagService)
 *   - Novelty, clarity, and inversion bonuses
 *
 * Formula: budget = clamp(1, 4, round(1 + first_occurrence + novelty - clarity + inversion))
 *
 * Phase 2: graph traversal + RAG search, no AI dependency.
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { IRagService, RAG_SERVICE } from '../../interfaces/rag.interface';
import { IDifficultyPredictor } from './planning-abstracts';
import { ES_INDEX } from '../../../kernel/es-index-constants';

@Injectable()
export class BootstrapDifficultyPredictor extends IDifficultyPredictor {
  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Optional() @Inject(RAG_SERVICE) private readonly rag?: IRagService,
  ) {
    super();
  }

  async predict(params: {
    archetype: string;
    novelPatterns: string[];
    hasClarityNote: boolean;
    isInversionCase: boolean;
  }): Promise<{ budget: number; rationale: string; confidence: number }> {
    // Query graph for historical budget distribution for this archetype
    const historical = await this.graphRag.query({
      fromEntity: params.archetype,
      relationship: 'HISTORICAL_CYCLE_BUDGET',
    });

    // Check if this archetype pattern exists in RAG patterns index
    // Uses IRagService.search() — count result to determine first-occurrence penalty
    let ragCount = 0;
    if (this.rag) {
      try {
        const ragResult = await this.rag.search(params.archetype, {
          namespace: ES_INDEX.RAG_PATTERNS,
          filters: { patternType: 'ARCH_PATTERN' },
          topK: 1,
        });
        ragCount = ragResult.isSuccess && ragResult.data?.length ? ragResult.data.length : 0;
      } catch {
        // RAG unavailable — treat as first occurrence (conservative)
        ragCount = 0;
      }
    }

    const firstOccurrencePenalty = ragCount === 0 ? 1 : 0;
    const noveltySum = params.novelPatterns.length * 0.5;
    const clarityDisc = params.hasClarityNote ? 1 : 0;
    const inversionBonus = params.isInversionCase ? 1 : 0;

    const formula = 1 + firstOccurrencePenalty + noveltySum - clarityDisc + inversionBonus;
    const budget = Math.max(1, Math.min(4, Math.round(formula)));

    const rationale =
      `base(1) + first_occurrence(${firstOccurrencePenalty}) + novelty(${noveltySum}) ` +
      `- clarity(${clarityDisc}) + inversion(${inversionBonus}) = ${formula.toFixed(1)} → ${budget}`;

    const confidence =
      historical.edges.length > 5 ? 0.8 : firstOccurrencePenalty === 1 ? 0.45 : 0.6;

    return { budget, rationale, confidence };
  }
}
