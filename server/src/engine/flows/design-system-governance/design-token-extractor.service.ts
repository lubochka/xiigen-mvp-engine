/**
 * DesignTokenExtractor — T491 [INGESTION].
 *
 * Extracts design tokens (colors, spacing, typography, shadows) from design specs.
 * Normalizes to token registry format.
 *
 * DNA-8: storeDocument() BEFORE enqueue().
 * DNA-3: All methods return DataProcessResult — never throw.
 * CF-476: tenantId required — UNSCOPED_QUERY on missing.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { randomUUID } from 'crypto';

interface IDb {
  storeDocument(
    index: string,
    doc: Record<string, unknown>,
    id?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

export interface TokenExtractionResult {
  extractionId: string;
  specId: string;
  tokenCount: number;
  extractedAt: string;
}

const TOKEN_CATEGORIES = ['color', 'spacing', 'typography', 'shadow', 'border', 'animation'];

export class DesignTokenExtractor {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async extract(
    tenantId: string,
    specId: string,
    tokens: Array<{ name: string; category: string; value: string }>,
  ): Promise<DataProcessResult<TokenExtractionResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');
    if (!tokens.length) return DataProcessResult.failure('MISSING_TOKENS', 'tokens are required');

    // Validate token categories
    for (const token of tokens) {
      if (!TOKEN_CATEGORIES.includes(token.category)) {
        return DataProcessResult.failure(
          'INVALID_TOKEN_CATEGORY',
          `category must be one of: ${TOKEN_CATEGORIES.join(', ')}`,
        );
      }
    }

    const extractionId = randomUUID();
    const tokenCount = tokens.length;
    const extractedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      extractionId,
      tenantId,
      specId,
      tokens,
      tokenCount,
      extractedAt,
    };

    const stored = await this.db.storeDocument('flow31-tokens', doc, extractionId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.tokens.extracted', {
      extractionId,
      tenantId,
      specId,
      tokenCount,
      extractedAt,
    });

    return DataProcessResult.success({ extractionId, specId, tokenCount, extractedAt });
  }
}
