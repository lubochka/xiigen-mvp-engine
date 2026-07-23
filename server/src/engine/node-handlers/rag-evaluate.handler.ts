/**
 * RagEvaluateHandler — G3: Post-retrieval RAG applicability filter.
 *
 * After RAG retrieval, this handler evaluates which patterns are actually
 * applicable to the current task step, filtering out noise patterns.
 *
 * DNA-3: never throws — returns DataProcessResult
 * DNA-8: storeDocument to xiigen-rag-evaluations before returning
 * DNA-1: all business data as Record<string, unknown>
 */

import { Injectable, Inject } from '@nestjs/common';
import { IAiProvider, AI_JUDGE_PROVIDER } from '../../fabrics/interfaces/ai-provider.interface';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { randomUUID } from 'crypto';

export interface RagEvaluatorInput {
  patterns: Array<Record<string, unknown>>;
  stepText: string;
  stepContext: string;
}

export interface RagEvaluatorOutput {
  applicablePatterns: Array<Record<string, unknown>>;
  filteredOut: Array<{ patternId: string; reason: string }>;
  evaluationSummary: string;
  patternCount: number;
  applicableCount: number;
}

@Injectable()
export class RagEvaluateHandler {
  constructor(
    @Inject(AI_JUDGE_PROVIDER) private readonly judgeAi: IAiProvider,
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
  ) {}

  async evaluate(
    params: RagEvaluatorInput,
    tenantId: string,
  ): Promise<DataProcessResult<RagEvaluatorOutput>> {
    try {
      const { patterns, stepText, stepContext } = params;

      // Pre-condition: empty patterns — return immediately without AI call
      if (patterns.length === 0) {
        return DataProcessResult.success({
          applicablePatterns: [],
          filteredOut: [],
          evaluationSummary: 'No patterns to evaluate',
          patternCount: 0,
          applicableCount: 0,
        });
      }

      // AI call to evaluate applicability
      const systemPrompt =
        'Evaluate which patterns are applicable to the current task step. Return JSON: { evaluations: [{ patternId, applicable, reason }] }. Applicable if archetype, constraints, or codeSnippet directly inform this step.';
      const userPrompt = `Step: ${stepText}\nContext: ${stepContext}\nPatterns:\n${JSON.stringify(patterns)}`;

      const aiResult = await this.judgeAi.generate(userPrompt, {
        systemPrompt,
        role: undefined,
      });

      // Parse evaluations
      let evaluations: Array<{ patternId: string; applicable: boolean; reason: string }> = [];
      if (aiResult.isSuccess) {
        try {
          const parsed = JSON.parse(String(aiResult.data?.['text'] ?? '{}')) as {
            evaluations?: Array<{ patternId: string; applicable: boolean; reason: string }>;
          };
          if (Array.isArray(parsed.evaluations)) {
            evaluations = parsed.evaluations;
          }
        } catch {
          // Parse failure — treat all as non-applicable (safe default)
        }
      }

      // Build applicablePatterns and filteredOut
      const applicablePatterns: Array<Record<string, unknown>> = [];
      const filteredOut: Array<{ patternId: string; reason: string }> = [];

      for (const pattern of patterns) {
        const patternId = String(pattern['id'] ?? pattern['patternId'] ?? '');
        const evaluation = evaluations.find((e) => e.patternId === patternId);

        if (evaluation?.applicable === true) {
          // Scope check: pattern must belong to same tenant or be GLOBAL
          if (pattern['tenantId'] !== tenantId && pattern['knowledgeScope'] !== 'GLOBAL') {
            filteredOut.push({ patternId, reason: 'SCOPE_VIOLATION' });
          } else {
            applicablePatterns.push(pattern);
          }
        } else {
          filteredOut.push({
            patternId,
            reason: evaluation?.reason ?? 'Not applicable to this step',
          });
        }
      }

      const patternCount = patterns.length;
      const applicableCount = applicablePatterns.length;
      const evaluationSummary = `${applicableCount}/${patternCount} patterns applicable`;

      // DNA-8: storeDocument to xiigen-rag-evaluations before returning
      const evaluationId = randomUUID();
      await this.db.storeDocument(
        'xiigen-rag-evaluations',
        {
          evaluationId,
          tenantId,
          patternCount,
          applicableCount,
          createdAt: new Date().toISOString(),
          connectionType: 'FLOW_SCOPED',
          knowledgeScope: 'PRIVATE',
        } as Record<string, unknown>,
        evaluationId,
      );

      return DataProcessResult.success({
        applicablePatterns,
        filteredOut,
        evaluationSummary,
        patternCount,
        applicableCount,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'RAG_EVALUATE_ERROR',
        `RagEvaluateHandler.evaluate threw: ${String(err)}`,
      );
    }
  }
}
