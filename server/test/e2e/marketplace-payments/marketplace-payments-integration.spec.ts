/**
 * FLOW-16 — Marketplace Payments
 * Integration Tests — Phase 3
 *
 * INT-1: T610 triggered by CheckoutReserved (T609 output) — verify T610 handles CheckoutReserved
 * INT-2: T611 does NOT handle CheckoutReserved — handles EscrowReleaseRequested/DisputeInitiated only
 * INT-3: T612 triggered by EscrowReleased (T611 output) — verify source
 * INT-4: T610 nonRepudiationAudit has no deleteDocument/updateDocument (executable lines only)
 * INT-5: T611 LIFO compensation order: REFUND before RESTORE
 */

import * as fs from 'fs';
import * as path from 'path';

const FLOW_DIR = path.join(__dirname, '../../../src/engine/flows/marketplace-payments');

function readSource(filename: string): string {
  return fs.readFileSync(path.join(FLOW_DIR, filename), 'utf-8');
}

/** Strip single-line comments and block comments from source before searching */
function stripComments(src: string): string {
  // Remove block comments
  let result = src.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove single-line comments
  result = result.replace(/\/\/[^\n]*/g, '');
  return result;
}

describe('FLOW-16 Marketplace Payments — Integration Tests', () => {
  // ── INT-1 ─────────────────────────────────────────────────────────────────

  it('INT-1: T610 (marketplace-payment-splitter) has handleCheckoutReserved method and is triggered by CheckoutReserved event', () => {
    const src = readSource('marketplace-payment-splitter.service.ts');

    // Verify T610 declares a handler for CheckoutReserved
    expect(src).toMatch(/handleCheckoutReserved/);

    // Confirm the entry event comment or JSDoc mentions CheckoutReserved as entry point
    expect(src).toMatch(/CheckoutReserved/);
  });

  // ── INT-2 ─────────────────────────────────────────────────────────────────

  it('INT-2: T611 (marketplace-escrow-controller) handles EscrowReleaseRequested and DisputeInitiated — NOT CheckoutReserved', () => {
    const src = readSource('marketplace-escrow-controller.service.ts');

    // T611 MUST handle these two events
    expect(src).toMatch(/handleEscrowReleaseRequested/);
    expect(src).toMatch(/handleDisputeInitiated/);

    // T611 MUST NOT contain a CheckoutReserved handler
    expect(src).not.toMatch(/handleCheckoutReserved/);

    // Confirm CheckoutReserved does not appear as an entry trigger in T611
    const entryLine = src.split('\n').find((l) => /Entry:/.test(l));
    if (entryLine) {
      expect(entryLine).not.toContain('CheckoutReserved');
    }
  });

  // ── INT-3 ─────────────────────────────────────────────────────────────────

  it('INT-3: T612 (seller-payout-writer) is triggered by EscrowReleased — T611 output event', () => {
    const src = readSource('seller-payout-writer.service.ts');

    // T612 entry event must be EscrowReleased (the output of T611)
    expect(src).toMatch(/EscrowReleased/);

    // T612 must have a handler for EscrowReleased
    expect(src).toMatch(/handleEscrowReleased/);

    // Confirm the file header or comment states EscrowReleased as entry
    expect(src).toMatch(/Entry:\s*EscrowReleased/);
  });

  // ── INT-4 ─────────────────────────────────────────────────────────────────

  it('INT-4: T610 nonRepudiationAudit index has no deleteDocument or updateDocument in executable lines', () => {
    const src = readSource('marketplace-payment-splitter.service.ts');
    const stripped = stripComments(src);

    // Split into lines and filter out blank lines
    const executableLines = stripped.split('\n').filter((l) => l.trim().length > 0);

    // Gather all lines that mention nonRepudiationAudit context
    // The rule: no deleteDocument OR updateDocument on the nonRepudiationAudit index
    const forbiddenOnAudit = executableLines.filter(
      (l) =>
        (l.includes('deleteDocument') || l.includes('updateDocument')) &&
        l.includes('nonRepudiationAudit'),
    );

    expect(forbiddenOnAudit).toHaveLength(0);

    // Additionally: no deleteDocument at all in the splitter service (append-only iron rule)
    const anyDelete = executableLines.filter((l) => l.includes('deleteDocument'));
    expect(anyDelete).toHaveLength(0);
  });

  // ── INT-5 ─────────────────────────────────────────────────────────────────

  it('INT-5: T611 LIFO compensation order — REFUND_PAYMENT defined before RESTORE_INVENTORY in constant array', () => {
    const src = readSource('marketplace-escrow-controller.service.ts');

    // The LIFO constant array must contain REFUND_PAYMENT before RESTORE_INVENTORY
    expect(src).toMatch(/REFUND_PAYMENT/);
    expect(src).toMatch(/RESTORE_INVENTORY/);

    const refundIndex = src.indexOf('REFUND_PAYMENT');
    const restoreIndex = src.indexOf('RESTORE_INVENTORY');

    // REFUND must appear before RESTORE in the source
    expect(refundIndex).toBeGreaterThan(-1);
    expect(restoreIndex).toBeGreaterThan(-1);
    expect(refundIndex).toBeLessThan(restoreIndex);

    // Confirm LIFO constant array exists
    expect(src).toMatch(/COMPENSATION_STEPS_LIFO\s*=\s*\[/);
  });
});
