// T70 PurchaseOverlapAnalyzer [DATA_PIPELINE]
//
// Analyzes purchase history overlap between two users.
// Triggers on SocialConnectionEstablished (not PurchaseRecorded) — DR-08-D
// Full recompute from purchase history intersection — NEVER delta (FULL_RECOMPUTE_PATTERN)
// R2 correction: if either user has no purchase history, return success({ overlapCount: 0, partial: true })
// storeDocument BEFORE PurchaseOverlapComputed emit (DNA-8)
// knowledgeScope: 'PRIVATE'
//
// Factories:
//   F234: IDatabaseService — purchase history + overlap records
//   F236: IQueueService — PurchaseOverlapComputed CloudEvent

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface PurchaseOverlapInput {
  userIdA: string;
  userIdB: string;
  tenantId: string;
  connectionId?: string;
}

export interface PurchaseOverlapResult {
  userIdA: string;
  userIdB: string;
  tenantId: string;
  overlapCount: number;
  partial?: boolean;
  computedAt: string;
}

export class PurchaseOverlapAnalyzerService {
  constructor(
    /** F234: IDatabaseService — purchase history + overlap records */
    private readonly db: IDatabaseService,
    /** F236: IQueueService — PurchaseOverlapComputed CloudEvent */
    private readonly queue: IQueueService,
  ) {}

  async analyzePurchaseOverlap(
    input: PurchaseOverlapInput,
  ): Promise<DataProcessResult<PurchaseOverlapResult>> {
    const computedAt = new Date().toISOString();

    // ── STEP 1: Fetch FULL purchase history for userIdA (full recompute — never delta) ─
    const historyAResult = await this.db.searchDocuments('xiigen-purchase-history', {
      userId: input.userIdA,
      tenantId: input.tenantId,
    });

    // R2 null-read fallback: if either user has no purchase history
    if (
      !historyAResult.isSuccess ||
      !Array.isArray(historyAResult.data) ||
      historyAResult.data.length === 0
    ) {
      return DataProcessResult.success({
        userIdA: input.userIdA,
        userIdB: input.userIdB,
        tenantId: input.tenantId,
        overlapCount: 0,
        partial: true,
        computedAt,
      });
    }

    // ── STEP 2: Fetch FULL purchase history for userIdB ───────────────────────────
    const historyBResult = await this.db.searchDocuments('xiigen-purchase-history', {
      userId: input.userIdB,
      tenantId: input.tenantId,
    });

    if (
      !historyBResult.isSuccess ||
      !Array.isArray(historyBResult.data) ||
      historyBResult.data.length === 0
    ) {
      return DataProcessResult.success({
        userIdA: input.userIdA,
        userIdB: input.userIdB,
        tenantId: input.tenantId,
        overlapCount: 0,
        partial: true,
        computedAt,
      });
    }

    // ── STEP 3: Full recompute of intersection (not delta) ────────────────────────
    const eventIdsA = new Set<string>(
      (historyAResult.data as Array<Record<string, unknown>>).map((p) => p['eventId'] as string),
    );
    const eventIdsB = (historyBResult.data as Array<Record<string, unknown>>).map(
      (p) => p['eventId'] as string,
    );

    const overlapCount = eventIdsB.filter((id) => eventIdsA.has(id)).length;

    // ── STEP 4: storeDocument BEFORE enqueue (DNA-8) ─────────────────────────────
    const storeResult = await this.db.storeDocument(
      'xiigen-purchase-overlaps',
      {
        userIdA: input.userIdA,
        userIdB: input.userIdB,
        tenantId: input.tenantId,
        overlapCount,
        computedAt,
        knowledgeScope: 'PRIVATE',
      },
      `overlap-${input.userIdA}-${input.userIdB}-${input.tenantId}`,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store overlap: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // ── STEP 5: enqueue PurchaseOverlapComputed (DNA-8 — after store) ────────────
    await this.queue.enqueue('participation.purchase.overlap.computed', {
      userIdA: input.userIdA,
      userIdB: input.userIdB,
      tenantId: input.tenantId,
      overlapCount,
      computedAt,
    });

    return DataProcessResult.success({
      userIdA: input.userIdA,
      userIdB: input.userIdB,
      tenantId: input.tenantId,
      overlapCount,
      computedAt,
    });
  }
}
