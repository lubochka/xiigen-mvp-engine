/**
 * IGameficationLedger (F1014) — APPEND-ONLY
 *
 * DD-222: This ledger is INSERT-only. It follows the same pattern as:
 * - FLOW-17 IEscrowLedger (financial escrow)
 * - FLOW-20 ISpendLedger (token consumption)
 *
 * The current balance is derived by summing all point entries for a student.
 * Corrections are made by appending a new entry with a negative delta.
 * No existing entry can ever be modified.
 *
 * PLATFORM-ONLY factory: F1014.
 *
 * Rule 4: All methods return DataProcessResult<T>.
 * Rule 6: No tenantId parameter — read from AsyncLocalStorage.
 */
import { DataProcessResult } from '../../kernel/data-process-result';

/**
 * A single immutable gamification ledger entry.
 * Once created, a LedgerEntry cannot be modified.
 * All fields are readonly.
 */
export interface LedgerEntry {
  readonly entryId: string; // UUID v4 — unique entry identifier
  readonly studentId: string; // Tenant-scoped student ID
  readonly eventType: string; // 'QUIZ_COMPLETED' | 'STREAK_MILESTONE' | 'LESSON_COMPLETED' | etc.
  readonly points: number; // Positive = earned, Negative = deduction/penalty
  readonly sourceId: string; // ID of event that triggered this entry
  readonly occurredAt: string; // ISO-8601 UTC — set by implementation, not by caller
  readonly metadata: Record<string, unknown>; // DNA-2: flexible event metadata
}

export interface IGameficationLedger {
  /**
   * DD-222: Appends a new immutable gamification event to the ledger.
   * This is the ONLY write method on this interface.
   *
   * For corrections: append a new entry with eventType='POINTS_CORRECTION'
   * and a negative points value (correction delta).
   *
   * @param entry - Entry data (entryId and occurredAt are set by implementation)
   * @returns The created LedgerEntry with all fields populated
   */
  append(
    entry: Omit<LedgerEntry, 'entryId' | 'occurredAt'>,
  ): Promise<DataProcessResult<LedgerEntry>>;

  /**
   * Returns the current points balance for a student.
   * Computed by summing all entry.points values for the student.
   * Includes positive (earned) and negative (deductions/corrections).
   */
  getBalance(studentId: string): Promise<DataProcessResult<number>>;

  /**
   * Returns paginated ledger history for a student (read-only).
   *
   * @param studentId - Tenant-scoped student ID
   * @param limit - Max entries to return (default: 50)
   * @param afterEntryId - Pagination cursor (entries after this ID)
   */
  getHistory(
    studentId: string,
    limit?: number,
    afterEntryId?: string,
  ): Promise<DataProcessResult<LedgerEntry[]>>;

  // NOTE: This interface intentionally has no:
  //   update() — DD-222 forbids modification of existing entries
  //   delete() — DD-222 forbids removal of ledger entries
  //   upsert() — Not allowed; would enable silent modification
}

export const GAMIFICATION_LEDGER = Symbol('GAMIFICATION_LEDGER');
