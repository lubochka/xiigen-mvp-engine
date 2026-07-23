// file: server/src/fabrics/interfaces/escrow-ledger.service.interface.ts
// IEscrowLedgerService (F607) — append-only escrow ledger interface.
// GAP-17-02: DR-89 / INV-17-1 — escrow ledger is immutable (append-only forever).
//
// IMPORTANT: This interface intentionally has NO update(), delete(), patch(),
// markReverted(), or markVoided() methods.
//
// Compensation appends a NEW entry (type: 'HOLD_RELEASE' or 'REVERSAL').
// It does NOT modify or delete the original HOLD entry.

import { DataProcessResult } from '../../kernel/data-process-result';

export const ESCROW_LEDGER_SERVICE = Symbol('ESCROW_LEDGER_SERVICE');

/**
 * Context passed to every escrow ledger operation.
 * tenantId is read from AsyncLocalStorage (DNA-5) — NOT a parameter here.
 */
export interface LedgerContext {
  /** Correlation ID for tracing across services. */
  correlationId: string;
}

/**
 * An individual entry in the append-only escrow ledger.
 *
 * Compensation creates a NEW entry with type 'HOLD_RELEASE' or 'REVERSAL'.
 * Original entries are never modified or deleted.
 */
export interface EscrowLedgerEntry {
  entryId: string;
  milestoneId: string;
  type: 'HOLD' | 'HOLD_RELEASE' | 'RELEASE' | 'REFUND' | 'REVERSAL';
  amount: number;
  /** INV-17-8: all money ops must carry idempotency key. */
  idempotencyKey: string;
  timestamp: string;
  /** Task type that created this entry: T236, T238, etc. */
  createdBy: string;
  correlationId: string;
}

/**
 * IEscrowLedgerService (F607) — append-only escrow ledger.
 *
 * DR-89 / INV-17-1: This ledger is IMMUTABLE. Entries can only be appended.
 *
 * There is NO update(), NO delete(), NO patch(), NO markReverted(), NO markVoided().
 * This is enforced at the TypeScript interface level (compile-time safety) AND
 * at the validate node via the 'append_only_ledger' named check (runtime safety).
 */
export interface IEscrowLedgerService {
  /**
   * Append a new entry to the escrow ledger.
   * This is the ONLY write method. Immutable after write.
   * DR-89/INV-17-1: Escrow ledger is append-only forever.
   */
  appendEntry(
    ctx: LedgerContext,
    entry: EscrowLedgerEntry,
  ): Promise<DataProcessResult<EscrowLedgerEntry>>;

  /**
   * Read all entries for a given milestone.
   * Entries are ordered by timestamp ascending (append order).
   */
  getEntries(
    ctx: LedgerContext,
    milestoneId: string,
  ): Promise<DataProcessResult<EscrowLedgerEntry[]>>;

  /**
   * Count entries for a given milestone.
   */
  getCount(ctx: LedgerContext, milestoneId: string): Promise<DataProcessResult<number>>;

  // ────────────────────────────────────────────────────────────────────────────
  // NO update()
  // NO delete()
  // NO patch()
  // NO markReverted()
  // NO markVoided()
  //
  // To "undo" an escrow hold: appendEntry() with type: 'HOLD_RELEASE' or 'REVERSAL'
  // ────────────────────────────────────────────────────────────────────────────
}
