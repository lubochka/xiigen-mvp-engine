/**
 * ABTestAllocator — T456 EXPERIMENTATION service for FLOW-29.
 *
 * Deterministic hash-based A/B variant allocation.
 * Same (tenantId, userId, experimentId) → same variant ALWAYS.
 * Assignment stored in DATABASE FABRIC — not recomputed per request.
 * Results collected via QUEUE FABRIC — never mixed across tenants.
 *
 * Iron rules:
 *   DETERMINISTIC:  same input → same variant always (hash-based)
 *   DB_STORED:      assignment stored in DB — not recomputed
 *   TENANT_SCOPED:  results NEVER mixed across tenants
 *   CF-476:         tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:          All methods return DataProcessResult<T> — never throw
 *   DNA-8:          storeDocument() BEFORE enqueue()
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface VariantAssignment {
  readonly assignmentId: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly experimentId: string;
  readonly variant: string;
  readonly assignedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ASSIGNMENTS_INDEX = 'flow29-ab-assignments';
const ASSIGNED_EVENT = 'rag.experiment.variant.assigned';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Deterministic hash: djb2 over string → unsigned 32-bit int. */
function djb2Hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ABTestAllocator {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  /**
   * Allocate a variant for the given (tenantId, userId, experimentId).
   *
   * Deterministic: same inputs → same variant always.
   * Checks DB for existing assignment first (idempotent).
   * DNA-8: storeDocument() BEFORE enqueue().
   */
  async allocate(
    tenantId: string,
    userId: string,
    experimentId: string,
    variants: string[],
  ): Promise<DataProcessResult<VariantAssignment>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!userId || userId.trim() === '') {
      return DataProcessResult.failure('MISSING_USER_ID', 'userId is required');
    }
    if (!experimentId || experimentId.trim() === '') {
      return DataProcessResult.failure('MISSING_EXPERIMENT_ID', 'experimentId is required');
    }
    if (!variants || variants.length === 0) {
      return DataProcessResult.failure('MISSING_VARIANTS', 'variants array must not be empty');
    }

    // Check for existing assignment (idempotent)
    const existingResult = await this.db.searchDocuments(ASSIGNMENTS_INDEX, {
      tenant_id: tenantId,
      user_id: userId,
      experiment_id: experimentId,
    });
    const existing = existingResult.isSuccess ? (existingResult.data ?? [])[0] : null;
    if (existing) {
      return DataProcessResult.success({
        assignmentId: String(existing['assignment_id'] ?? ''),
        tenantId,
        userId,
        experimentId,
        variant: String(existing['variant'] ?? variants[0]),
        assignedAt: String(existing['assigned_at'] ?? new Date().toISOString()),
      });
    }

    // Deterministic allocation via djb2 hash
    const hashKey = `${tenantId}:${userId}:${experimentId}`;
    const hashVal = djb2Hash(hashKey);
    const variant = variants[hashVal % variants.length];
    const assignmentId = `ab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const assignedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      assignment_id: assignmentId,
      tenant_id: tenantId,
      user_id: userId,
      experiment_id: experimentId,
      variant,
      assigned_at: assignedAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.db.storeDocument(ASSIGNMENTS_INDEX, doc, assignmentId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store variant assignment',
      );
    }

    await this.queue.enqueue(ASSIGNED_EVENT, {
      assignment_id: assignmentId,
      tenant_id: tenantId,
      user_id: userId,
      experiment_id: experimentId,
      variant,
      assigned_at: assignedAt,
    });

    return DataProcessResult.success({
      assignmentId,
      tenantId,
      userId,
      experimentId,
      variant,
      assignedAt,
    });
  }
}
