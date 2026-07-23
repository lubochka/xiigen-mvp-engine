/**
 * RagQueryHandler — G6: Pre-retrieval RAG query reformulation.
 *
 * Before RAG retrieval, reformulates the task step text into a precise
 * retrieval query optimized for architectural pattern databases.
 * Captures architectural concerns, failure modes, and constraints at
 * pattern level (not surface action level).
 *
 * DNA-3: never throws — returns DataProcessResult
 * DNA-8: storeDocument to xiigen-rag-queries before returning
 * DNA-1: all business data as Record<string, unknown>
 */

import { Injectable, Inject } from '@nestjs/common';
import { IAiProvider, AI_JUDGE_PROVIDER } from '../../fabrics/interfaces/ai-provider.interface';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { randomUUID } from 'crypto';

export interface RagQueryInput {
  stepText: string;
  constraints: string[];
  upstreamContext?: string;
  prevCycleSummaries?: string[];
}

export interface RagQueryOutput {
  reformulatedQuery: string;
  queryRationale: string;
  originalStepText: string;
}

@Injectable()
export class RagQueryHandler {
  constructor(
    @Inject(AI_JUDGE_PROVIDER) private readonly judgeAi: IAiProvider,
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
  ) {}

  async reformulate(
    params: RagQueryInput,
    tenantId: string,
  ): Promise<DataProcessResult<RagQueryOutput>> {
    try {
      const { stepText, constraints, upstreamContext, prevCycleSummaries } = params;

      // Pre-condition: empty or blank stepText — return original immediately without AI call
      if (!stepText || !stepText.trim()) {
        return DataProcessResult.success({
          reformulatedQuery: stepText,
          queryRationale: 'No reformulation needed for empty step',
          originalStepText: stepText,
        });
      }

      // Build user prompt with all context
      const userParts: string[] = [`Step: ${stepText}`];
      if (constraints.length > 0) {
        userParts.push(`Constraints: ${constraints.join('; ')}`);
      }
      if (upstreamContext) {
        userParts.push(`Upstream context: ${upstreamContext}`);
      }
      if (prevCycleSummaries && prevCycleSummaries.length > 0) {
        userParts.push(
          `Previous cycle decisions (query must reflect what these steps already established):\n${prevCycleSummaries
            .map((s, i) => `  Step ${i + 1}: ${s}`)
            .join('\n')}`,
        );
      }
      userParts.push('Reformulate this step into a retrieval query for architectural patterns.');

      const systemPrompt =
        'Reformulate a task step into a precise retrieval query for an architectural pattern database. Capture architectural concerns, failure modes, constraints — not surface action. Return JSON: { reformulatedQuery, queryRationale }. 1-3 sentences. No code, no tech names — pattern-level only.';
      const userPrompt = userParts.join('\n');

      const aiResult = await this.judgeAi.generate(userPrompt, { systemPrompt });

      // Parse AI response
      let reformulatedQuery = stepText; // graceful degradation fallback
      let queryRationale = '';
      if (aiResult.isSuccess) {
        try {
          const parsed = JSON.parse(String(aiResult.data?.['text'] ?? '{}')) as {
            reformulatedQuery?: string;
            queryRationale?: string;
          };
          if (parsed.reformulatedQuery) {
            reformulatedQuery = parsed.reformulatedQuery;
            queryRationale = parsed.queryRationale ?? '';
          }
          // If reformulatedQuery missing, keep fallback (graceful degradation)
        } catch {
          // Parse failure — graceful degradation: use original stepText
        }
      }

      // DNA-8: storeDocument to xiigen-rag-queries before returning
      const docId = randomUUID();
      await this.db.storeDocument(
        'xiigen-rag-queries',
        {
          id: docId,
          stepText,
          reformulatedQuery,
          queryRationale,
          tenantId,
          connectionType: 'FLOW_SCOPED',
          knowledgeScope: 'PRIVATE',
          createdAt: new Date().toISOString(),
        } as Record<string, unknown>,
        docId,
      );

      return DataProcessResult.success({
        reformulatedQuery,
        queryRationale,
        originalStepText: stepText,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'RAG_QUERY_ERROR',
        `RagQueryHandler.reformulate threw: ${String(err)}`,
      );
    }
  }
}
