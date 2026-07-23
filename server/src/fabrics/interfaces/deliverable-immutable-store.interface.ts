// file: server/src/fabrics/interfaces/deliverable-immutable-store.interface.ts
// IDeliverableImmutableStore (F613) — write-once deliverable store interface.
// GAP-17-05: DR-94 / INV-17-9 — deliverables are immutable after submission.
//
// IMPORTANT: This interface intentionally has NO update(), delete(), patch(),
// or resubmit() methods.
//
// If a client wants to resubmit: create a NEW milestone with a new deliverable.
// The original submission is sealed forever.

import { DataProcessResult } from '../../kernel/data-process-result';

export const DELIVERABLE_IMMUTABLE_STORE = Symbol('DELIVERABLE_IMMUTABLE_STORE');

/**
 * Context passed to every deliverable store operation.
 * tenantId is read from AsyncLocalStorage (DNA-5) — NOT a parameter here.
 */
export interface StoreContext {
  /** Correlation ID for tracing. */
  correlationId: string;
}

/**
 * IDeliverableImmutableStore (F613) — write-once deliverable store.
 *
 * DR-94 / INV-17-9: Deliverables are IMMUTABLE after submission.
 *
 * There is NO update(), NO delete(), NO patch(), NO resubmit().
 * This is enforced at the TypeScript interface level (compile-time safety) AND
 * at the validate node via the 'immutable_after_submit' named check (runtime safety).
 *
 * To resubmit: the caller must create a NEW milestone, not update this record.
 */
export interface IDeliverableImmutableStore {
  /**
   * Store a deliverable. WRITE ONCE — immutable after this call.
   * DR-94/INV-17-9: No update, no delete, no patch.
   * Returns the generated deliverableId.
   */
  storeDeliverable(
    ctx: StoreContext,
    deliverable: Record<string, unknown>,
  ): Promise<DataProcessResult<string>>; // returns deliverableId

  /**
   * Read a deliverable by ID.
   * Returns NOT_FOUND if the deliverableId does not exist.
   */
  getDeliverable(
    ctx: StoreContext,
    deliverableId: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  /**
   * Check if a deliverable already exists (idempotency check before storeDeliverable).
   * Use this to prevent duplicate submissions.
   */
  exists(ctx: StoreContext, deliverableId: string): Promise<DataProcessResult<boolean>>;

  // ────────────────────────────────────────────────────────────────────────────
  // NO update()
  // NO delete()
  // NO patch()
  // NO resubmit()
  //
  // Resubmission requires a NEW milestone (new deliverableId), not an update.
  // ────────────────────────────────────────────────────────────────────────────
}
