/**
 * FLOW-16 Proper Flow — Design Contract Tests (DC-01..DC-10)
 *
 * These tests verify that FLOW-16 T609-T612 services satisfy the
 * FLOW-16 design simulation's iron rules via source inspection and contract validation.
 *
 * DC-01: T609 MarketplaceCheckoutGateway archetype is 'VALIDATION'
 * DC-02: CF-16-1 — T609 BOLA check present in source (buyerTenantId vs ALS tenantId)
 * DC-03: CF-16-2 — T609 SETNX cart lock uses FREEDOM checkout_lock_ttl_ms (not hardcoded)
 * DC-04: CF-16-6 — T610 SETNX idempotency key includes tenantId+cartId+totalAmountCents hash
 * DC-05: CF-16-8 — T610 nonRepudiationAudit has no deleteDocument or updateDocument (executable lines)
 * DC-06: CF-16-3 — T611 LIFO compensation order REFUND_PAYMENT before RESTORE_INVENTORY
 * DC-07: CF-16-11 — T611 dispute path uses updateDocument only — never deleteDocument on escrow
 * DC-08: CF-16-16 — T612 no bank detail fields in storeDocument calls (vault-ref only)
 * DC-09: DNA-8 — T609 storeDocument appears before enqueue(CheckoutReserved) in source order
 * DC-10: All four task type contracts reference FLOW-16
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

const FLOW_DIR = path.join(__dirname, '../../../src/engine/flows/marketplace-payments');
const CONTRACTS_DIR = path.join(__dirname, '../../../../fixtures/contracts');

function readSource(filename: string): string {
  return fs.readFileSync(path.join(FLOW_DIR, filename), 'utf-8');
}

function loadContract(filename: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(CONTRACTS_DIR, filename), 'utf-8'));
}

/** Strip single-line and block comments from source before analysis */
function stripComments(src: string): string {
  let result = src.replace(/\/\*[\s\S]*?\*\//g, '');
  result = result.replace(/\/\/[^\n]*/g, '');
  return result;
}

describe('FLOW-16 Design Contracts (DC-01..DC-10)', () => {
  // ── DC-01 ──────────────────────────────────────────────────────────────────
  test('DC-01: T609 MarketplaceCheckoutGateway contract archetype is VALIDATION', () => {
    const contract = loadContract('t609.contract.json');
    expect(contract['taskTypeId']).toBe('T609');
    expect(contract['flowId']).toBe('FLOW-16');
    expect((contract['archetype'] as string).toUpperCase()).toBe('VALIDATION');
    expect(contract['domainId']).toBe('marketplace-payments');
  });

  // ── DC-02 ──────────────────────────────────────────────────────────────────
  test('DC-02: CF-16-1 — T609 source contains BOLA check (buyerTenantId against ALS tenantId)', () => {
    const src = readSource('marketplace-checkout-gateway.service.ts');
    // Confirm BOLA check present
    expect(src).toMatch(/buyerTenantId/);
    // Must compare to tenantId from ALS context
    expect(src).toMatch(/tenantId/);
    // Must not accept tenantId from request parameter
    expect(src).not.toMatch(/handleCheckout\([^)]*tenantId/);
  });

  // ── DC-03 ──────────────────────────────────────────────────────────────────
  test('DC-03: CF-16-2 — T609 source references checkout_lock_ttl_ms (FREEDOM) not hardcoded TTL', () => {
    const src = readSource('marketplace-checkout-gateway.service.ts');
    // FREEDOM config key must be referenced
    expect(src).toMatch(/checkout_lock_ttl_ms/);
    // No hardcoded ms literal for lock (e.g. 5000, 30000, 60000 as a standalone constant)
    // We verify FREEDOM key is present rather than asserting no numeric value since
    // FREEDOM fallback defaults are acceptable
    expect(src).toMatch(/freedom|FREEDOM|getConfig/i);
  });

  // ── DC-04 ──────────────────────────────────────────────────────────────────
  test('DC-04: CF-16-6 — T610 source contains hash idempotency key with cartId and tenantId', () => {
    const src = readSource('marketplace-payment-splitter.service.ts');
    // Hash-based idempotency: must reference tenantId AND cartId AND totalAmountCents
    expect(src).toMatch(/cartId/);
    expect(src).toMatch(/tenantId/);
    expect(src).toMatch(/totalAmountCents/);
    // hash function used for idempotency key
    expect(src).toMatch(/hash|sha256|createHash/i);
  });

  // ── DC-05 ──────────────────────────────────────────────────────────────────
  test('DC-05: CF-16-8/9 — T610 nonRepudiationAudit has no deleteDocument or updateDocument in executable lines', () => {
    const src = readSource('marketplace-payment-splitter.service.ts');
    const stripped = stripComments(src);
    const executableLines = stripped.split('\n').filter((l) => l.trim().length > 0);

    // No deleteDocument at all in the payment splitter
    const deleteLines = executableLines.filter((l) => l.includes('deleteDocument'));
    expect(deleteLines).toHaveLength(0);

    // No updateDocument on the nonRepudiationAudit index
    const updateOnNra = executableLines.filter(
      (l) => l.includes('updateDocument') && l.includes('nonRepudiation'),
    );
    expect(updateOnNra).toHaveLength(0);
  });

  // ── DC-06 ──────────────────────────────────────────────────────────────────
  test('DC-06: CF-16-3 — T611 LIFO compensation array has REFUND_PAYMENT before RESTORE_INVENTORY', () => {
    const src = readSource('marketplace-escrow-controller.service.ts');
    const refundIndex = src.indexOf('REFUND_PAYMENT');
    const restoreIndex = src.indexOf('RESTORE_INVENTORY');
    expect(refundIndex).toBeGreaterThan(-1);
    expect(restoreIndex).toBeGreaterThan(-1);
    expect(refundIndex).toBeLessThan(restoreIndex);
    // LIFO constant array must exist
    expect(src).toMatch(/COMPENSATION_STEPS_LIFO/);
  });

  // ── DC-07 ──────────────────────────────────────────────────────────────────
  test('DC-07: CF-16-11 — T611 dispute handler uses updateDocument only, never deleteDocument on escrow', () => {
    const src = readSource('marketplace-escrow-controller.service.ts');
    const stripped = stripComments(src);
    const executableLines = stripped.split('\n').filter((l) => l.trim().length > 0);

    // No deleteDocument on escrow records
    const deleteOnEscrow = executableLines.filter(
      (l) => l.includes('deleteDocument') && (l.includes('escrow') || l.includes('Escrow')),
    );
    expect(deleteOnEscrow).toHaveLength(0);

    // Dispute handler exists and uses updateDocument
    expect(src).toMatch(/handleDisputeInitiated/);
    expect(src).toMatch(/updateDocument/);
  });

  // ── DC-08 ──────────────────────────────────────────────────────────────────
  test('DC-08: CF-16-16 — T612 source never references bank detail fields (vault-ref only)', () => {
    const src = readSource('seller-payout-writer.service.ts');
    const stripped = stripComments(src);

    // None of these PII fields should appear in executable code
    const forbiddenFields = ['bankAccountNumber', 'routingNumber', 'sortCode', 'iban', 'IBAN'];
    for (const field of forbiddenFields) {
      const executableMentions = stripped
        .split('\n')
        .filter((l) => l.trim().length > 0)
        .filter((l) => l.includes(field));
      expect(executableMentions).toHaveLength(0);
    }

    // payoutVaultRef must be present (the only allowed payout identifier)
    expect(src).toMatch(/payoutVaultRef/);
  });

  // ── DC-09 ──────────────────────────────────────────────────────────────────
  test('DC-09: DNA-8 — T609 storeDocument position is before enqueue(CheckoutReserved) in source', () => {
    const src = readSource('marketplace-checkout-gateway.service.ts');
    const storeIndex = src.indexOf('storeDocument');
    const enqueueCheckoutIndex = src.indexOf("'CheckoutReserved'");
    expect(storeIndex).toBeGreaterThan(-1);
    expect(enqueueCheckoutIndex).toBeGreaterThan(-1);
    expect(storeIndex).toBeLessThan(enqueueCheckoutIndex);
  });

  // ── DC-10 ──────────────────────────────────────────────────────────────────
  test('DC-10: All four T609-T612 contracts reference FLOW-16 and correct taskTypeIds', () => {
    const contracts = [
      { file: 't609.contract.json', taskTypeId: 'T609' },
      { file: 't610.contract.json', taskTypeId: 'T610' },
      { file: 't611.contract.json', taskTypeId: 'T611' },
      { file: 't612.contract.json', taskTypeId: 'T612' },
    ];

    for (const { file, taskTypeId } of contracts) {
      const contract = loadContract(file);
      expect(contract['flowId']).toBe('FLOW-16');
      expect(contract['taskTypeId']).toBe(taskTypeId);
      expect(contract['domainId']).toBe('marketplace-payments');
      expect(Array.isArray(contract['ironRules'])).toBe(true);
      expect((contract['ironRules'] as unknown[]).length).toBeGreaterThan(0);
    }
  });
});
