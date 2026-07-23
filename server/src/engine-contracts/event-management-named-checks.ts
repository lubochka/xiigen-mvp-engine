/**
 * FLOW-03 Named Checks — 3 runtime-enforceable assertions.
 * Each check returns DataProcessResult — never throws.
 *
 * Gaps covered:
 *   GAP-03-1: event_created_stored_before_emitted   (CF-03-1, DNA-8)
 *   GAP-03-2: capacity_null_means_unlimited          (CF-03-2)
 *   GAP-03-3: content_safety_before_promoted         (CF-03-3)
 */

import { DataProcessResult } from '../kernel/data-process-result';

// ─── CHECK-1 ─────────────────────────────────────────────────────────────────
/**
 * event_created_stored_before_emitted
 * CF-03-1, DNA-8: EventCreated document must be written to the database
 * (storeDocument) BEFORE the EventCreated event is emitted on the queue.
 * storeIndex < emitIndex in the call-order array.
 */
export function check_event_created_stored_before_emitted(
  storeDocumentCallIndex: number | null,
  emitEventCallIndex: number | null,
): DataProcessResult<void> {
  if (storeDocumentCallIndex === null) {
    return DataProcessResult.failure(
      'CF_03_1_STORE_NOT_CALLED',
      'storeDocument was never called during EventCreated processing. Violates CF-03-1, DNA-8.',
    );
  }
  if (emitEventCallIndex === null) {
    return DataProcessResult.failure(
      'CF_03_1_EMIT_NOT_CALLED',
      'Event emit was never called during EventCreated processing. Violates CF-03-1.',
    );
  }
  if (storeDocumentCallIndex >= emitEventCallIndex) {
    return DataProcessResult.failure(
      'CF_03_1_OUTBOX_VIOLATION',
      `storeDocument (index ${storeDocumentCallIndex}) must precede event emit ` +
        `(index ${emitEventCallIndex}). Violates CF-03-1, DNA-8.`,
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-2 ─────────────────────────────────────────────────────────────────
/**
 * capacity_null_means_unlimited
 * CF-03-2: capacity === null signals unlimited attendance. Any other falsy value
 * (0, '', undefined) is NOT unlimited — it is either an error or a zero cap.
 * This must be a strict null check; never coerce with `!capacity`.
 */
export function check_capacity_null_means_unlimited(
  capacityValue: unknown,
  resolvedAsUnlimited: boolean,
): DataProcessResult<void> {
  const isStrictlyNull = capacityValue === null;

  if (!isStrictlyNull && resolvedAsUnlimited) {
    return DataProcessResult.failure(
      'CF_03_2_LOOSE_UNLIMITED_CHECK',
      `capacity is ${JSON.stringify(capacityValue)} (not null) but was resolved as unlimited. ` +
        'Only strict null (=== null) means unlimited. Violates CF-03-2.',
    );
  }
  if (isStrictlyNull && !resolvedAsUnlimited) {
    return DataProcessResult.failure(
      'CF_03_2_NULL_NOT_UNLIMITED',
      'capacity is null but was NOT resolved as unlimited. null must mean unlimited. Violates CF-03-2.',
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-3 ─────────────────────────────────────────────────────────────────
/**
 * content_safety_before_promoted
 * CF-03-3: Content-safety check (T61 ContentSafetyFilter) must complete BEFORE
 * the EventPromoted outcome is recorded or the PromotionCompleted event emitted.
 * safetyCheckIndex < promotedIndex in the call-order array.
 */
export function check_content_safety_before_promoted(
  safetyCheckCallIndex: number | null,
  promotedRecordCallIndex: number | null,
): DataProcessResult<void> {
  if (safetyCheckCallIndex === null) {
    return DataProcessResult.failure(
      'CF_03_3_SAFETY_NOT_CALLED',
      'Content-safety check was not called before EventPromoted was recorded. Violates CF-03-3.',
    );
  }
  if (promotedRecordCallIndex === null) {
    // Nothing was promoted — constraint vacuously satisfied.
    return DataProcessResult.success(undefined);
  }
  if (safetyCheckCallIndex >= promotedRecordCallIndex) {
    return DataProcessResult.failure(
      'CF_03_3_SAFETY_ORDER_VIOLATION',
      `Content-safety check (index ${safetyCheckCallIndex}) must precede EventPromoted record ` +
        `(index ${promotedRecordCallIndex}). Violates CF-03-3.`,
    );
  }
  return DataProcessResult.success(undefined);
}
