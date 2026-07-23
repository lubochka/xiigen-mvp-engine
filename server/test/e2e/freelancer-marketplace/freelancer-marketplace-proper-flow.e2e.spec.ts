/**
 * freelancer-marketplace — Proper Flow Contract Tests (DC-01..DC-10)
 * FLOW-17: Freelancer Marketplace (new services T613-T616)
 *
 * Verifies all CF/DR rules from design simulation:
 *   DC-01: CF-17-1 — T613 BOLA at ORDER 1 before SETNX
 *   DC-02: CF-17-1 — T613 SETNX lock acquired before OCC bid check
 *   DC-03: CF-17-1 — T613 GigAcceptanceFailed emitted on guard failures
 *   DC-04: CF-17-2 — T614 CONTRACT_IMMUTABLE_FIELDS compile-time, ORDER 1 rejection
 *   DC-05: CF-17-2 — T614 sum validation at ORDER 2, MilestoneSumMismatch on failure
 *   DC-06: CF-17-3 — T615 delivery gate validation before funds release
 *   DC-07: CF-17-3 — T615 no deleteDocument on dispute path
 *   DC-08: CF-17-3 — T615 LIFO compensation chain in correct order
 *   DC-09: CF-17-4 — T616 direction check at ORDER 1, VALID_REVIEW_DIRECTIONS compile-time
 *   DC-10: CF-17-4 — T616 comment excluded from audit, append-only reviews
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

const servicesDir = path.resolve(__dirname, '../../../src/engine/flows/freelancer-marketplace');

function readService(filename: string): string {
  return fs.readFileSync(path.join(servicesDir, filename), 'utf-8').replace(/\r\n/g, '\n');
}

describe('freelancer-marketplace — proper flow contract tests (DC-01..DC-10)', () => {
  // DC-01: CF-17-1 — T613 BOLA at ORDER 1 before SETNX lock
  test('DC-01: CF-17-1 — T613 BOLA check occurs before SETNX lock acquisition', () => {
    const src = readService('gig-acceptance-lock-gateway.service.ts');

    // BOLA check comment present
    expect(src).toMatch(/ORDER 1.*BOLA|BOLA.*ORDER 1/i);
    // In acceptGig method, BOLA check (clientTenantId check) appears before SETNX lock store
    const methodStart = src.indexOf('async acceptGig');
    const methodSrc = src.substring(methodStart);
    const bolaIdx = methodSrc.indexOf('clientTenantId !== tenantId');
    const setnxIdx = methodSrc.indexOf('storeDocument(\n      GIG_ACCEPT_LOCKS_INDEX');
    expect(bolaIdx).toBeGreaterThan(-1);
    expect(setnxIdx).toBeGreaterThan(-1);
    expect(bolaIdx).toBeLessThan(setnxIdx);
  });

  // DC-02: CF-17-1 — T613 SETNX lock before OCC bid check
  test('DC-02: CF-17-1 — T613 SETNX lock acquired before OCC bid status check', () => {
    const src = readService('gig-acceptance-lock-gateway.service.ts');

    // SETNX comment present
    expect(src).toMatch(/ORDER 2.*SETNX|SETNX.*ORDER 2/i);
    // ORDER 3 OCC check present
    expect(src).toMatch(/ORDER 3.*OCC|OCC.*ORDER 3/i);

    const methodStart = src.indexOf('async acceptGig');
    const methodSrc = src.substring(methodStart);
    // SETNX store must come before bid status check
    const lockStoreIdx = methodSrc.indexOf('GIG_ACCEPT_LOCKS_INDEX');
    const bidCheckIdx = methodSrc.indexOf('BIDS_INDEX');
    // Lock acquisition (store) must come before bid lookup
    const lockStoreFirstIdx = methodSrc.indexOf('storeDocument(\n      GIG_ACCEPT_LOCKS_INDEX');
    const bidSearchIdx = methodSrc.indexOf('searchDocuments(BIDS_INDEX');
    expect(lockStoreFirstIdx).toBeGreaterThan(-1);
    expect(bidSearchIdx).toBeGreaterThan(-1);
    expect(lockStoreFirstIdx).toBeLessThan(bidSearchIdx);
  });

  // DC-03: CF-17-1 — T613 GigAcceptanceFailed emitted on guard failures
  test('DC-03: CF-17-1 — T613 emits GigAcceptanceFailed with reason on BOLA, SETNX, and OCC failures', () => {
    const src = readService('gig-acceptance-lock-gateway.service.ts');
    expect(src).toMatch(/GigAcceptanceFailed/);
    expect(src).toMatch(/BOLA_VIOLATION/);
    expect(src).toMatch(/BID_NOT_OPEN/);
    // Multiple GigAcceptanceFailed emits
    const failedEmitCount = (src.match(/GigAcceptanceFailed/g) ?? []).length;
    expect(failedEmitCount).toBeGreaterThanOrEqual(2);
  });

  // DC-04: CF-17-2 — T614 ALWAYS_IMMUTABLE_FIELDS compile-time, ORDER 1 rejection
  test('DC-04: CF-17-2 — T614 ALWAYS_IMMUTABLE_FIELDS is compile-time constant at ORDER 1', () => {
    const src = readService('milestone-contract-manager.service.ts');
    // ALWAYS_IMMUTABLE_FIELDS is a const
    expect(src).toMatch(/const ALWAYS_IMMUTABLE_FIELDS\s*=/);
    // Contains immutable fields (clientId, gigId, freelancerId)
    expect(src).toMatch(/clientId.*gigId.*freelancerId/s);
    // ORDER 1 check before any storage
    expect(src).toMatch(/ORDER 1/);
    // No database lookup for immutable fields
    expect(src).not.toMatch(/searchDocuments.*CONTRACT_IMMUTABLE/i);
    expect(src).not.toMatch(/getDocument.*CONTRACT_IMMUTABLE/i);
  });

  // DC-05: CF-17-2 — T614 sum validation at ORDER 2
  test('DC-05: CF-17-2 — T614 sum validation at ORDER 2, MilestoneSumMismatch emitted', () => {
    const src = readService('milestone-contract-manager.service.ts');
    // Sum validation present
    expect(src).toMatch(/reduce.*sum|sum.*reduce/i);
    expect(src).toMatch(/milestonesSum.*contractTotal|contractTotal.*milestonesSum/i);
    // MilestoneSumMismatch emitted on failure
    expect(src).toMatch(/MilestoneSumMismatch/);
    // Expected and actual in event payload
    expect(src).toMatch(/expected.*contractTotal|actual.*milestonesSum/);
  });

  // DC-06: CF-17-3 — T615 delivery gate validation before funds release
  test('DC-06: CF-17-3 — T615 delivery gate validates delivery.status before milestone storeDocument', () => {
    const src = readService('delivery-gate-escrow-controller.service.ts');
    // Delivery gate comment present
    expect(src).toMatch(/ORDER 1.*[Dd]elivery [Gg]ate|[Dd]elivery [Gg]ate.*ORDER 1/i);
    // DELIVERY_NOT_SUBMITTED error
    expect(src).toMatch(/DELIVERY_NOT_SUBMITTED/);

    // In releaseEscrow, delivery search must precede milestone storeDocument
    const methodStart = src.indexOf('async releaseEscrow');
    const methodSrc = src.substring(methodStart, src.indexOf('async raiseDispute'));
    const deliverySearchIdx = methodSrc.indexOf('searchDocuments(DELIVERIES_INDEX');
    const milestoneStoreIdx = methodSrc.indexOf('storeDocument(\n      MILESTONES_INDEX');
    expect(deliverySearchIdx).toBeGreaterThan(-1);
    expect(milestoneStoreIdx).toBeGreaterThan(-1);
    expect(deliverySearchIdx).toBeLessThan(milestoneStoreIdx);
  });

  // DC-07: CF-17-3 — T615 no deleteDocument on dispute path
  test('DC-07: CF-17-3 — T615 dispute path has NO deleteDocument calls', () => {
    const src = readService('delivery-gate-escrow-controller.service.ts');
    const execLines = src
      .split('\n')
      .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'));
    const exec = execLines.join('\n');
    expect(exec).not.toMatch(/\.deleteDocument\s*\(/);
    expect(exec).not.toMatch(/\.deleteMany\s*\(/);
    expect(exec).not.toMatch(/\.deleteAll\s*\(/);
    // Dispute uses storeDocument with DISPUTED status
    expect(src).toMatch(/status.*DISPUTED|DISPUTED.*status/);
  });

  // DC-08: CF-17-3 — T615 LIFO compensation chain correct order
  test('DC-08: CF-17-3 — T615 LIFO chain: REFUND_MILESTONE registered before RESTORE_GIG_STATUS, executed reversed', () => {
    const src = readService('delivery-gate-escrow-controller.service.ts');
    expect(src).toMatch(/ESCROW_COMPENSATION_CHAIN/);
    expect(src).toMatch(/REFUND_MILESTONE/);
    expect(src).toMatch(/RESTORE_GIG_STATUS/);
    // Executed via reverse()
    expect(src).toMatch(/\.reverse\(\)/);
    // Forward registration: REFUND_MILESTONE before RESTORE_GIG_STATUS
    const chainDecl = src.match(/ESCROW_COMPENSATION_CHAIN\s*=\s*\[([^\]]+)\]/);
    expect(chainDecl).not.toBeNull();
    const content = chainDecl![1];
    expect(content.indexOf('REFUND_MILESTONE')).toBeLessThan(content.indexOf('RESTORE_GIG_STATUS'));
  });

  // DC-09: CF-17-4 — T616 direction check at ORDER 1, VALID_REVIEW_DIRECTIONS compile-time
  test('DC-09: CF-17-4 — T616 VALID_REVIEW_DIRECTIONS compile-time constant, direction check at ORDER 1', () => {
    const src = readService('freelancer-review-writer.service.ts');
    // Compile-time constant
    expect(src).toMatch(/const VALID_REVIEW_DIRECTIONS\s*=/);
    // Both directions present
    expect(src).toMatch(/CLIENT_TO_FREELANCER/);
    expect(src).toMatch(/FREELANCER_TO_CLIENT/);
    // ORDER 1 direction check
    expect(src).toMatch(/ORDER 1/);
    // INVALID_DIRECTION error code
    expect(src).toMatch(/INVALID_DIRECTION/);
    // Duplicate check at ORDER 2
    expect(src).toMatch(/ORDER 2/);
    expect(src).toMatch(/DUPLICATE_REVIEW/);
  });

  // DC-10: CF-17-4 — T616 comment excluded from audit, append-only
  test('DC-10: CF-17-4 — T616 audit excludes comment, no updateDocument on review records', () => {
    const src = readService('freelancer-review-writer.service.ts');

    // Comment exclusion documented in code
    expect(src).toMatch(/comment.*excluded|exclude.*comment|comment intentionally/i);

    // Find audit storeDocument block and confirm no comment key
    const reviewAuditIdx = src.indexOf('REVIEW_AUDIT_INDEX');
    if (reviewAuditIdx > -1) {
      // Find the storeDocument call with REVIEW_AUDIT_INDEX
      const storeCallIdx = src.lastIndexOf('storeDocument', reviewAuditIdx);
      const storeCallBlock = src.substring(storeCallIdx, reviewAuditIdx + 200);
      expect(storeCallBlock).not.toMatch(/comment\s*:/);
    }

    // No updateDocument calls on review records (append-only)
    const execLines = src
      .split('\n')
      .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'));
    const exec = execLines.join('\n');
    expect(exec).not.toMatch(/\.updateDocument\s*\(/);
  });
});
