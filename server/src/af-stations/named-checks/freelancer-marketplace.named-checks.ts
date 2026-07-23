/**
 * FLOW-17 Named Checks — 11 IP Management & Licensing correctness checks.
 * GAP-17-04 (R5): Populated per SESSION-GAP-R5.
 *
 * Covers:
 *   ep2_server_triggered         — CF-293: EP-2 periodic capture must be server-triggered
 *   screenshot_external_ref_only — CF-293: screenshots as external refs only
 *   activity_counts_numeric_only — CF-294: activity counts numeric, no keystroke content
 *   escrow_lifo_order            — T236: ESCROW_SAGA compensation must be LIFO (C3→C2→C1)
 *   append_only_ledger           — INV-17-1: F607 escrow ledger is append-only
 *   atomic_pg_transaction        — T236/T239: atomic PG transaction required
 *   escrow_idempotency_key_on_all_money_ops — INV-17-8: all money ops carry idempotency key
 *   db_unique_idempotency        — INV-17-3: DB-level UNIQUE constraint for token spends
 *   immutable_after_submit       — DR-94/INV-17-9: deliverables immutable after submission
 *   ip_transfer_immutable_after_certified — INV-17-5: IP transfer immutable after CERTIFIED
 *   derived_never_stored         — QG-245-1: reputation score derived at query time, never stored
 *
 * All 11 checks registered with globalNamedCheckRegistry at module init.
 */
import { NamedCheckFn, globalNamedCheckRegistry } from '../named-check-registry';

export const flow17NamedChecks: Record<string, NamedCheckFn> = {
  /**
   * CF-293: EP-2 work diary capture must be server-triggered periodic (@Interval),
   * not client-triggered via HTTP POST.
   */
  ep2_server_triggered: async (ctx) => {
    const code = String(ctx['generatedCode'] ?? ctx['source'] ?? '');
    // Must have a scheduling mechanism
    const hasServerTrigger = /@Interval|@Cron|schedule|setInterval|timer|periodic/i.test(code);
    // Must NOT be client-triggered
    const hasClientTrigger = /@Post.*capture|onClientRequest|req\.body.*screenshot/i.test(code);
    return hasServerTrigger && !hasClientTrigger;
  },

  /**
   * CF-293: Screenshots must be stored as external object references only.
   * Never inline binary, base64, or Buffer.
   */
  screenshot_external_ref_only: async (ctx) => {
    const code = String(ctx['generatedCode'] ?? ctx['source'] ?? '');
    const hasInlineBinary =
      /Buffer\.|base64|\.readFile.*screenshot|binary.*screenshot|screenshot.*binary|inline.*binary/i.test(
        code,
      );
    return !hasInlineBinary;
  },

  /**
   * CF-294: Activity counts must be NUMERIC ONLY.
   * No keystroke content arrays, no mouse coordinates, no click detail arrays.
   */
  activity_counts_numeric_only: async (ctx) => {
    const code = String(ctx['generatedCode'] ?? ctx['source'] ?? '');
    const hasKeystrokeContent = /keystroke[sS]*\s*[:=]\s*[['"]]/i.test(code);
    const hasPrivacyViolation = /keylog|keypress.*content|mouseEvent.*coords|clickCoord/i.test(
      code,
    );
    return !hasKeystrokeContent && !hasPrivacyViolation;
  },

  /**
   * ESCROW_SAGA: Compensation must execute in LIFO order (C3→C2→C1).
   * Forward registration: C1→C2→C3. Execution: C3→C2→C1. SACRED.
   */
  escrow_lifo_order: async (ctx) => {
    const code = String(ctx['generatedCode'] ?? ctx['source'] ?? '');
    if (!/escrow|ESCROW/i.test(code)) return true;
    return /C3.*C2.*C1|compensate.*reverse.*order|LIFO|releaseHold.*before.*reverseFee/s.test(code);
  },

  /**
   * INV-17-1: F607 escrow ledger is append-only.
   * UPDATE or DELETE on the ledger is a BUILD_FAILURE.
   */
  append_only_ledger: async (ctx) => {
    const code = String(ctx['generatedCode'] ?? ctx['source'] ?? '');
    const hasMutation =
      /update.*ledger|delete.*ledger|\.update\(.*607|\.delete\(.*607|\bUPDATE\b.*escrow_ledger/i.test(
        code,
      );
    return !hasMutation;
  },

  /**
   * T236/T239: PostgreSQL operations spanning multiple tables must use
   * explicit atomic transactions (BEGIN/COMMIT). No split auto-commit.
   */
  atomic_pg_transaction: async (ctx) => {
    const code = String(ctx['generatedCode'] ?? ctx['source'] ?? '');
    if (!/pgTransaction|pg.*transaction|db\.transaction/i.test(code)) return true;
    return /BEGIN|COMMIT|ROLLBACK|transaction\s*\(|runInTransaction/i.test(code);
  },

  /**
   * INV-17-8: All money operations (F606/F607/F608) must carry an idempotency key.
   * Prevents duplicate financial transactions on retry.
   */
  escrow_idempotency_key_on_all_money_ops: async (ctx) => {
    const code = String(ctx['generatedCode'] ?? ctx['source'] ?? '');
    const hasMoneyOp = /escrow|payout|charge|transfer|ESCROW|PAYOUT/i.test(code);
    if (!hasMoneyOp) return true;
    return /idempotencyKey|idempotency_key|IDEMPOTENCY_KEY/i.test(code);
  },

  /**
   * INV-17-3: Token spend idempotency must be enforced via DB-level UNIQUE constraint.
   * Redis SETNX alone is insufficient (not durable across restarts).
   */
  db_unique_idempotency: async (ctx) => {
    const code = String(ctx['generatedCode'] ?? ctx['source'] ?? '');
    if (!/idempotencyKey|idempotency_key/i.test(code)) return true;
    return /ON CONFLICT.*DO NOTHING|UNIQUE.*constraint|unique.*idempotency|INSERT.*ON DUPLICATE/i.test(
      code,
    );
  },

  /**
   * DR-94/INV-17-9: Deliverables (F613) are immutable after submission.
   * No update or delete on submitted records.
   */
  immutable_after_submit: async (ctx) => {
    const code = String(ctx['generatedCode'] ?? ctx['source'] ?? '');
    const hasMutation = /F613.*update|F613.*delete|deliverable.*update|deliverable.*patch/i.test(
      code,
    );
    return !hasMutation;
  },

  /**
   * INV-17-5: IP transfer records (F630) are immutable after CERTIFIED status.
   * No rollback, no ownership undo after certification. PLATFORM-ONLY.
   */
  ip_transfer_immutable_after_certified: async (ctx) => {
    const code = String(ctx['generatedCode'] ?? ctx['source'] ?? '');
    const hasRollback = /F630.*update|ownership.*rollback|transfer.*undo/i.test(code);
    const hasCertified = /CERTIFIED|certify/i.test(code);
    return !hasRollback && hasCertified;
  },

  /**
   * QG-245-1: Reputation score must be DERIVED at query time from the journal.
   * Score must never be stored or persisted as a mutable field.
   */
  derived_never_stored: async (ctx) => {
    const code = String(ctx['generatedCode'] ?? ctx['source'] ?? '');
    const hasStoredScore = /store.*score|persist.*score|update.*reputationScore|save.*score/i.test(
      code,
    );
    return !hasStoredScore;
  },
};

// Register FLOW-17 named checks with the global registry at module init.
globalNamedCheckRegistry.registerFlow('FLOW-17', flow17NamedChecks);
