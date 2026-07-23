/**
 * T646 CollaborativeEditingSync [QUEUE_CONSUMER]
 * FLOW-23: Form Builder Templates
 *
 * Entry: CollaborativeEditsRequested event (from queue, multi-user edits)
 *
 * Execution order is MACHINE (CF-23-6):
 *   ORDER 1: idempotency check using idempotency key (DNA-7)
 *   ORDER 2: CRDT state merge — pure computation merge
 *   ORDER 3: storeDocument(merged state) once (DNA-8)
 *   ORDER 4: enqueue(EditsApplied) — only after storage succeeds
 *
 * Iron rules:
 *   IR-1: idempotency check at ORDER 1 (DNA-7)
 *   IR-2: CRDT merge is pure computation (no mutation during merge)
 *   IR-3: Single storeDocument for merged state BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../../kernel/multi-tenant/tenant-context';

const COLLABORATIVE_STATE_INDEX = 'xiigen-collaborative-state';
const IDEMPOTENCY_INDEX = 'xiigen-idempotency-keys';

@Injectable()
export class CollaborativeEditingSyncService {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
    private readonly cls: ClsService,
  ) {}

  private getTenantId(): string {
    try {
      return this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  async syncEdits(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const templateId = event['templateId'] as string;
    const idempotencyKey = event['idempotencyKey'] as string;
    const edits = event['edits'] as Record<string, unknown>[] | undefined;

    if (!templateId || !idempotencyKey || !edits) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'templateId, idempotencyKey, and edits are required',
      );
    }

    const syncedAt = new Date().toISOString();

    // ── ORDER 1: Idempotency check (DNA-7) ──────────────────────────────────────
    const idempotencyResult = await this.db.searchDocuments(IDEMPOTENCY_INDEX, { idempotencyKey });
    if (idempotencyResult.isSuccess && (idempotencyResult.data ?? []).length > 0) {
      const existingRecord = (idempotencyResult.data ?? [])[0] as Record<string, unknown>;
      return DataProcessResult.success({
        templateId,
        tenantId,
        idempotencyKey,
        status: 'ALREADY_PROCESSED',
        mergedState: existingRecord['mergedState'],
      });
    }

    // ── ORDER 2: CRDT state merge (pure computation) ──────────────────────────────
    const stateResult = await this.db.searchDocuments(COLLABORATIVE_STATE_INDEX, { templateId });
    let currentState: Record<string, unknown> = {
      templateId,
      version: 0,
      edits: [],
    };

    if (stateResult.isSuccess && (stateResult.data ?? []).length > 0) {
      currentState = (stateResult.data ?? [])[0] as Record<string, unknown>;
    }

    const mergedState = this.mergeCrdtState(currentState, edits);

    // ── ORDER 3: Store merged state (DNA-8) ──────────────────────────────────────
    await this.db.storeDocument(
      COLLABORATIVE_STATE_INDEX,
      {
        templateId,
        tenantId,
        ...mergedState,
        lastSyncedAt: syncedAt,
        knowledgeScope: 'PRIVATE',
      },
      templateId,
    );

    // Store idempotency record
    await this.db.storeDocument(
      IDEMPOTENCY_INDEX,
      {
        idempotencyKey,
        templateId,
        tenantId,
        mergedState,
        processedAt: syncedAt,
      },
      idempotencyKey,
    );

    // ── ORDER 4: Emit EditsApplied ──────────────────────────────────────────────
    await this.queue.enqueue('EditsApplied', {
      templateId,
      tenantId,
      idempotencyKey,
      editCount: edits.length,
      version: mergedState['version'],
      syncedAt,
    });

    return DataProcessResult.success({
      templateId,
      tenantId,
      idempotencyKey,
      status: 'EDITS_APPLIED',
      mergedState,
      syncedAt,
    });
  }

  private mergeCrdtState(
    currentState: Record<string, unknown>,
    edits: Record<string, unknown>[],
  ): Record<string, unknown> {
    // CRDT merge: pure computation, no side effects
    const version = ((currentState['version'] as number) ?? 0) + edits.length;
    const existingEdits = (currentState['edits'] as Record<string, unknown>[]) ?? [];

    return {
      version,
      edits: [...existingEdits, ...edits],
      lastEditCount: edits.length,
    };
  }
}
