/**
 * ContextPackAssembler — T542 [ORCHESTRATION].
 *
 * TTL-managed hybrid RAG context pack assembly for family code generation.
 *
 * CF-747: Stale ContextPack MUST NOT be reused across retry rounds.
 *
 * TTL from FREEDOM config key "flow33_context_pack_ttl_minutes" — NEVER hardcoded.
 *
 * DNA-3: All methods return DataProcessResult — never throw.
 * DNA-8: storeDocument() BEFORE enqueue().
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { randomUUID } from 'crypto';
import type {
  Flow33ContextPack,
  Flow33DocumentStore,
  Flow33FreedomConfig,
  Flow33Queue,
  Flow33RagSearcher,
} from './flow33-shared-interfaces';

export type ContextPack = Flow33ContextPack & {
  tenantId: string;
  sources: string[];
  ttlExpiresAt: string;
  assembledAt: string;
};

const DEFAULT_TTL_MINUTES = 30; // fallback if FREEDOM config unavailable

export class ContextPackAssembler {
  constructor(
    private readonly db: Flow33DocumentStore,
    private readonly rag: Flow33RagSearcher,
    private readonly queue: Flow33Queue,
    private readonly freedom: Flow33FreedomConfig,
  ) {}

  /**
   * Read TTL from FREEDOM config — never hardcode (CF-14 / DNA compliance).
   */
  private async readTtlMinutes(): Promise<number> {
    const result = await this.freedom.get('flow33_context_pack_ttl_minutes');
    if (!result.isSuccess || result.data == null) return DEFAULT_TTL_MINUTES;
    const val = Number(result.data);
    return isNaN(val) || val <= 0 ? DEFAULT_TTL_MINUTES : val;
  }

  /**
   * Check if an existing ContextPack is still valid (not expired — CF-747).
   */
  private isExpired(pack: ContextPack): boolean {
    return new Date(pack.ttlExpiresAt) <= new Date();
  }

  /**
   * Assemble a fresh ContextPack for a family implementation attempt.
   * CF-747: stale pack (TTL expired) triggers refresh — never reused.
   */
  async assemble(
    tenantId: string,
    familyId: string,
    query: string,
  ): Promise<DataProcessResult<ContextPack>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!familyId) return DataProcessResult.failure('MISSING_FAMILY_ID', 'familyId is required');
    if (!query)
      return DataProcessResult.failure('MISSING_QUERY', 'query is required for RAG retrieval');

    // CF-747: Check for existing pack — reject stale
    const existingResult = await this.db.searchDocuments('flow33-context-packs', {
      tenantId,
      familyId,
    });
    if (existingResult.isSuccess && existingResult.data?.length) {
      const existing = existingResult.data[0] as unknown as ContextPack;
      if (!this.isExpired(existing)) {
        // Pack is fresh — return it
        return DataProcessResult.success(existing);
      }
      // Pack is stale — emit staleness event and refresh
      await this.queue.enqueue('context_pack.stale_detected', {
        packId: existing.packId,
        familyId,
        tenantId,
        expiredAt: existing.ttlExpiresAt,
      });
    }

    // Fetch TTL from FREEDOM config
    const ttlMinutes = await this.readTtlMinutes();
    const now = new Date();
    const ttlExpiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();
    const assembledAt = now.toISOString();

    // Hybrid RAG: vector results from GraphRAG index
    const ragResult = await this.rag.searchSimilar('flow33-graphrag', query, 10);
    const vectorResults = ragResult.isSuccess ? (ragResult.data ?? []) : [];

    // Graph edges from edge index
    const edgeResult = await this.db.searchDocuments('flow33-graphrag-edges', { tenantId });
    const graphEdges = edgeResult.isSuccess ? (edgeResult.data ?? []) : [];

    const packId = randomUUID();
    const pack: ContextPack = {
      packId,
      familyId,
      tenantId,
      sources: ['flow33-graphrag', 'flow33-graphrag-edges'],
      vectorResults,
      graphEdges,
      ttlExpiresAt,
      assembledAt,
    };

    // DNA-8: storeDocument BEFORE enqueue
    const stored = await this.db.storeDocument(
      'flow33-context-packs',
      pack as unknown as Record<string, unknown>,
      `${tenantId}::${familyId}`,
    );
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('context_pack.assembled', {
      packId,
      familyId,
      tenantId,
      ttlExpiresAt,
      assembledAt,
    });

    return DataProcessResult.success(pack);
  }
}
