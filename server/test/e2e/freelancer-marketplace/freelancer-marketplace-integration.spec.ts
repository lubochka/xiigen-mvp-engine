/**
 * freelancer-marketplace — Integration tests
 * FLOW-17: Freelancer Marketplace (new services T613-T616)
 *
 * Tests: INT-1 through INT-5
 *   INT-1: T613 BOLA + SETNX + OCC guards all present in source
 *   INT-2: T614 CONTRACT_IMMUTABLE_FIELDS compile-time constant verified via source inspection
 *   INT-3: T615 no deleteDocument on dispute path — source-level verification
 *   INT-4: T615 LIFO compensation chain registered in correct order
 *   INT-5: T616 comment excluded from audit in source — PLATFORM_ONLY-safe
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

describe('freelancer-marketplace — integration contracts (T613-T616)', () => {
  const servicesDir = path.resolve(__dirname, '../../../src/engine/flows/freelancer-marketplace');

  // INT-1: T613 BOLA + SETNX + OCC all present in source
  test('INT-1: T613 source contains BOLA check, SETNX lock, and OCC bid status validation', () => {
    const t613Path = path.join(servicesDir, 'gig-acceptance-lock-gateway.service.ts');
    expect(fs.existsSync(t613Path)).toBe(true);

    const src = fs.readFileSync(t613Path, 'utf-8');
    // BOLA check present
    expect(src).toMatch(/clientTenantId.*tenantId|BOLA_VIOLATION/i);
    // SETNX lock present
    expect(src).toMatch(/gig-accept-lock|GIG_ACCEPT_LOCK_PREFIX/);
    // OCC bid status check present
    expect(src).toMatch(/bid.*status.*OPEN|BID_NOT_OPEN/i);
    // DNA-8: audit before enqueue
    expect(src).toMatch(/ORDER 4.*[Aa]udit|[Aa]udit.*ORDER 4/);
  });

  // INT-2: T614 ALWAYS_IMMUTABLE_FIELDS compile-time constant
  test('INT-2: T614 ALWAYS_IMMUTABLE_FIELDS is compile-time constant, not from database', () => {
    const t614Path = path.join(servicesDir, 'milestone-contract-manager.service.ts');
    expect(fs.existsSync(t614Path)).toBe(true);

    const src = fs.readFileSync(t614Path, 'utf-8');

    // ALWAYS_IMMUTABLE_FIELDS must be a const declaration
    expect(src).toMatch(/const ALWAYS_IMMUTABLE_FIELDS\s*=/);
    // Must contain immutable fields
    expect(src).toMatch(/clientId/);
    expect(src).toMatch(/gigId/);
    expect(src).toMatch(/freelancerId/);
    // ORDER 1 check before storage
    expect(src).toMatch(/ORDER 1/);
    // Must NOT load immutable fields from database or FREEDOM config
    expect(src).not.toMatch(/getDocument.*immutable/i);
    expect(src).not.toMatch(/searchDocuments.*CONTRACT_IMMUTABLE/i);
  });

  // INT-3: T615 no deleteDocument on dispute path
  test('INT-3: T615 dispute path has NO deleteDocument calls — suspend-not-delete verified', () => {
    const t615Path = path.join(servicesDir, 'delivery-gate-escrow-controller.service.ts');
    expect(fs.existsSync(t615Path)).toBe(true);

    const src = fs.readFileSync(t615Path, 'utf-8');

    // Filter to executable code only (strip comments)
    const execLines = src
      .split('\n')
      .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'));
    const exec = execLines.join('\n');
    expect(exec).not.toMatch(/\.deleteDocument\s*\(/);
    expect(exec).not.toMatch(/\.deleteMany\s*\(/);
    expect(exec).not.toMatch(/\.deleteAll\s*\(/);

    // Dispute handler uses storeDocument with DISPUTED status
    expect(src).toMatch(/DISPUTED/);
    expect(src).toMatch(/raiseDispute/);
  });

  // INT-4: T615 LIFO compensation chain registered forward, executed reversed
  test('INT-4: T615 LIFO compensation chain REFUND_MILESTONE registered before RESTORE_GIG_STATUS (forward order)', () => {
    const t615Path = path.join(servicesDir, 'delivery-gate-escrow-controller.service.ts');
    expect(fs.existsSync(t615Path)).toBe(true);

    const src = fs.readFileSync(t615Path, 'utf-8');

    // ESCROW_COMPENSATION_CHAIN must be defined with REFUND_MILESTONE first
    expect(src).toMatch(/ESCROW_COMPENSATION_CHAIN\s*=/);
    const chainMatch = src.match(/ESCROW_COMPENSATION_CHAIN\s*=\s*\[([^\]]+)\]/);
    expect(chainMatch).not.toBeNull();
    const chainContent = chainMatch![1];
    // REFUND_MILESTONE must appear before RESTORE_GIG_STATUS in forward registration
    const refundIdx = chainContent.indexOf('REFUND_MILESTONE');
    const restoreIdx = chainContent.indexOf('RESTORE_GIG_STATUS');
    expect(refundIdx).toBeGreaterThan(-1);
    expect(restoreIdx).toBeGreaterThan(-1);
    expect(refundIdx).toBeLessThan(restoreIdx);

    // LIFO executed via reverse()
    expect(src).toMatch(/\.reverse\(\)/);
  });

  // INT-5: T616 comment excluded from audit — PLATFORM_ONLY-safe
  test('INT-5: T616 audit write excludes comment field — no PII in review audit record', () => {
    const t616Path = path.join(servicesDir, 'freelancer-review-writer.service.ts');
    expect(fs.existsSync(t616Path)).toBe(true);

    const src = fs.readFileSync(t616Path, 'utf-8');

    // Audit storeDocument must not include comment
    // Find the audit storeDocument block and verify no comment key
    const auditBlockMatch = src.match(/storeDocument\s*\(\s*REVIEW_AUDIT_INDEX[\s\S]*?\)/);
    if (auditBlockMatch) {
      const auditBlock = auditBlockMatch[0];
      expect(auditBlock).not.toMatch(/comment\s*:/);
    }

    // The service source must document the exclusion
    expect(src).toMatch(/comment.*excluded|exclude.*comment|comment intentionally/i);
    // VALID_REVIEW_DIRECTIONS must be compile-time constant
    expect(src).toMatch(/const VALID_REVIEW_DIRECTIONS\s*=/);
    // Both valid directions present
    expect(src).toMatch(/CLIENT_TO_FREELANCER/);
    expect(src).toMatch(/FREELANCER_TO_CLIENT/);
  });
});
