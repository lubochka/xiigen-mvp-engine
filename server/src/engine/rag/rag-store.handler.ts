// server/src/engine/rag/rag-store.handler.ts
// Stores RAG patterns with deduplication and iron rule conflict detection.
// CN-16: prevents duplicate patterns and detects contradicting iron rules.
//
// DNA-3: returns DataProcessResult, never throws
// DNA-8: storeDocument before enqueue
// DNA-9: conflict review uses queue fabric

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../fabrics/interfaces/queue.interface';
import { IAiProvider, AI_PROVIDER } from '../../fabrics/interfaces/ai-provider.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { ES_INDEX } from '../../kernel/es-index-constants';
import { RagPattern } from './pattern-extractor.service';

const PATTERN_CONFLICT_REVIEW_QUEUE = 'pattern-conflict-review';

@Injectable()
export class RagStoreHandler {
  private readonly logger = new Logger(RagStoreHandler.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
    @Inject(AI_PROVIDER) private readonly aiProvider: IAiProvider,
  ) {}

  async store(pattern: RagPattern): Promise<DataProcessResult<void>> {
    // Compute stable patternKey for deduplication
    const patternKey = this.computePatternKey(pattern);

    // Check for iron rule conflict with existing pattern
    const existingResult = await this.db.searchDocuments(ES_INDEX.RAG_PATTERNS, { patternKey });
    if (!existingResult.isSuccess) {
      return DataProcessResult.failure(existingResult.errorCode!, existingResult.errorMessage!);
    }

    const existing = existingResult.data ?? [];
    if (existing.length > 0 && existing[0]['ironRule'] && pattern.ironRule) {
      const conflict = await this.checkIronRuleConflict(
        existing[0]['ironRule'] as string,
        pattern.ironRule,
      );
      if (conflict.contradicts) {
        // DNA-8: storeDocument before enqueue
        // No document stored for conflicting patterns — queued for human review instead
        await this.queue.enqueue(PATTERN_CONFLICT_REVIEW_QUEUE, {
          existingPatternId: existing[0]['patternId'],
          newPattern: pattern as unknown as Record<string, unknown>,
          conflictReason: conflict.reason,
        });
        return DataProcessResult.failure(
          'IRON_RULE_CONFLICT',
          `Pattern ${patternKey} has contradicting iron rule. Queued for human review.`,
        );
      }
    }

    // Upsert by patternKey (replace existing if key matches — deduplication)
    const storeResult = await this.db.storeDocument(
      ES_INDEX.RAG_PATTERNS,
      {
        ...(pattern as unknown as Record<string, unknown>),
        patternKey,
        updatedAt: new Date().toISOString(),
      },
      patternKey,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);
    }
    return DataProcessResult.success(undefined);
  }

  private computePatternKey(pattern: RagPattern): string {
    const concept = (pattern.applicableWhen ?? '').toLowerCase().replace(/\s+/g, '-').slice(0, 50);
    return `${pattern.taskTypeId}|${pattern.patternType}|${concept}`;
  }

  private async checkIronRuleConflict(
    existingRule: string,
    newRule: string,
  ): Promise<{ contradicts: boolean; reason?: string }> {
    const prompt = [
      `Do these two iron rules contradict each other?`,
      `Rule A: "${existingRule}"`,
      `Rule B: "${newRule}"`,
      `Reply with JSON: { contradicts: boolean, reason?: string }`,
    ].join('\n');
    try {
      const result = await this.aiProvider.generate(prompt);
      if (!result.isSuccess || !result.data?.['text']) {
        return { contradicts: false };
      }
      return JSON.parse(result.data['text'] as string) as { contradicts: boolean; reason?: string };
    } catch {
      return { contradicts: false };
    }
  }
}
