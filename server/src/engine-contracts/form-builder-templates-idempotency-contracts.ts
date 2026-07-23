/**
 * FLOW-23 GAP-23-7: IETF Idempotency Key Service F970
 * BFA Rules: CF-449, DNA-7
 * Error Correction: HIGH
 * Task Types: T361, T362, T363, T366
 * Factory: F970 (IIETFIdempotencyKeyService) — PLATFORM-ONLY
 */

import { DataProcessResult } from '../kernel/data-process-result';

export const IETF_IDEMPOTENCY_KEY_SERVICE = 'IETF_IDEMPOTENCY_KEY_SERVICE';

/**
 * IETF Idempotency Key Service — PLATFORM-ONLY.
 * CF-449: All queue consumers must call check() before processing.
 * DNA-7: Deduplication prevents double-processing of redelivered messages.
 */
export interface IIETFIdempotencyKeyService {
  /**
   * Check if an operation with this key was already processed.
   * Call BEFORE processing any queue message.
   * If isDuplicate: true — skip processing, return success.
   */
  check(idempotencyKey: string): Promise<
    DataProcessResult<{
      isDuplicate: boolean;
      firstSeenAt?: string;
      key: string;
    }>
  >;

  /**
   * Mark an operation as successfully processed.
   * Call AFTER successful processing — not before.
   */
  mark(
    idempotencyKey: string,
    ttlSeconds?: number, // default: 86400 (24 hours)
  ): Promise<
    DataProcessResult<{
      marked: boolean;
      markedAt: string;
      expiresAt: string;
    }>
  >;

  /**
   * Generate an IETF-compliant idempotency key.
   * Format: <flowId>:<taskTypeId>:<uuid>
   * e.g., 'FLOW-23:T361:8f14e45f-ceea-4c5d-b31b-35fe'
   */
  generate(
    flowId: string,
    taskTypeId: string,
  ): Promise<
    DataProcessResult<{
      key: string;
      flowId: string;
      taskTypeId: string;
    }>
  >;
}
