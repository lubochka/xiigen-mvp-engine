/**
 * T652 PlatformContextEnricher — FLOW-46 Phase B
 *
 * Read-only enricher inserted between AF-4 and AF-5. Reads xiigen-rag-patterns
 * filtered by knowledgeScope=GLOBAL + tenantId=MASTER_TENANT_ID + keyword tags
 * extracted from userIntent. Returns enriched context (AF-4 patterns + global
 * platformPatterns merged non-destructively) plus platformPatternsMatched count
 * which T653 reads to drive the CF-840 zero-cost branch.
 *
 * Iron rules:
 *   IR-1: read-only; no writes.
 *   IR-2: augment-not-replace — existing AF-4 fields preserved.
 *   IR-3: platformPatternsMatched returned for CF-840 downstream.
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import {
  IDatabaseService,
  DATABASE_SERVICE,
} from '../../../fabrics/interfaces/database.interface';
import { MASTER_TENANT_ID } from '../../../bootstrap/bootstrap-seeder.service';

const RAG_PATTERNS_INDEX = 'xiigen-rag-patterns';

export interface Af4StationOutput {
  patterns?: Array<Record<string, unknown>>;
  linkedModules?: Array<Record<string, unknown>>;
  userIntent?: string;
  keywords?: string[];
  [key: string]: unknown;
}

export interface EnrichedContext {
  patterns: Array<Record<string, unknown>>;
  linkedModules: Array<Record<string, unknown>>;
  platformPatterns: Array<Record<string, unknown>>;
  platformPatternsMatched: number;
}

@Injectable()
export class PlatformContextEnricher {
  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  async execute(
    af4Context: Af4StationOutput,
  ): Promise<DataProcessResult<EnrichedContext>> {
    const keywords = af4Context.keywords ?? this.extractKeywords(af4Context.userIntent ?? '');
    const filter: Record<string, unknown> = {
      knowledgeScope: 'GLOBAL',
      tenantId: MASTER_TENANT_ID,
    };
    if (keywords.length > 0) {
      filter['tags'] = keywords;
    }

    const search = await this.db.searchDocuments(RAG_PATTERNS_INDEX, filter);
    if (!search.isSuccess) {
      return DataProcessResult.failure(
        'SEARCH_FAILED',
        search.errorMessage ?? 'xiigen-rag-patterns search failed',
      );
    }

    const platformPatterns = search.data ?? [];
    return DataProcessResult.success({
      patterns: af4Context.patterns ?? [],
      linkedModules: af4Context.linkedModules ?? [],
      platformPatterns,
      platformPatternsMatched: platformPatterns.length,
    });
  }

  private extractKeywords(text: string): string[] {
    if (!text) return [];
    const normalized = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
    const stop = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'with',
      'for',
      'on',
      'to',
      'in',
      'of',
      'is',
      'are',
      'was',
      'were',
      'be',
      'this',
      'that',
      'it',
    ]);
    return Array.from(
      new Set(
        normalized
          .split(/\s+/)
          .filter((w) => w.length >= 3 && !stop.has(w))
          .slice(0, 8),
      ),
    );
  }
}
