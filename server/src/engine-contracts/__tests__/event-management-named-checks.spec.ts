/**
 * FLOW-03 Named Checks Test Suite — all 3 checks
 * Gaps: GAP-03-1, GAP-03-2, GAP-03-3
 */

import {
  check_event_created_stored_before_emitted,
  check_capacity_null_means_unlimited,
  check_content_safety_before_promoted,
} from '../event-management-named-checks';

describe('FLOW-03 Named Checks', () => {
  // ── CHECK-1: event_created_stored_before_emitted ──────────────────────────

  describe('check_event_created_stored_before_emitted', () => {
    it('passes when storeDocument precedes event emit', () => {
      expect(check_event_created_stored_before_emitted(0, 1).isSuccess).toBe(true);
    });

    it('passes with higher indices so long as store < emit', () => {
      expect(check_event_created_stored_before_emitted(3, 7).isSuccess).toBe(true);
    });

    it('fails when storeDocument is null (never called)', () => {
      const result = check_event_created_stored_before_emitted(null, 1);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_03_1_STORE_NOT_CALLED');
    });

    it('fails when emit is null (never called)', () => {
      const result = check_event_created_stored_before_emitted(0, null);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_03_1_EMIT_NOT_CALLED');
    });

    it('fails when emit precedes storeDocument (outbox violation)', () => {
      const result = check_event_created_stored_before_emitted(5, 3);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_03_1_OUTBOX_VIOLATION');
    });

    it('fails when storeDocument and emit have the same index (simultaneous)', () => {
      const result = check_event_created_stored_before_emitted(2, 2);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_03_1_OUTBOX_VIOLATION');
    });
  });

  // ── CHECK-2: capacity_null_means_unlimited ────────────────────────────────

  describe('check_capacity_null_means_unlimited', () => {
    it('passes when capacity is null and resolvedAsUnlimited is true', () => {
      expect(check_capacity_null_means_unlimited(null, true).isSuccess).toBe(true);
    });

    it('passes when capacity is a number and resolvedAsUnlimited is false', () => {
      expect(check_capacity_null_means_unlimited(50, false).isSuccess).toBe(true);
    });

    it('fails when capacity is 0 but resolvedAsUnlimited is true (loose check)', () => {
      const result = check_capacity_null_means_unlimited(0, true);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_03_2_LOOSE_UNLIMITED_CHECK');
    });

    it('fails when capacity is undefined but resolvedAsUnlimited is true', () => {
      const result = check_capacity_null_means_unlimited(undefined, true);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_03_2_LOOSE_UNLIMITED_CHECK');
    });

    it('fails when capacity is empty string but resolvedAsUnlimited is true', () => {
      const result = check_capacity_null_means_unlimited('', true);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_03_2_LOOSE_UNLIMITED_CHECK');
    });

    it('fails when capacity is null but resolvedAsUnlimited is false', () => {
      const result = check_capacity_null_means_unlimited(null, false);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_03_2_NULL_NOT_UNLIMITED');
    });
  });

  // ── CHECK-3: content_safety_before_promoted ───────────────────────────────

  describe('check_content_safety_before_promoted', () => {
    it('passes when safety check precedes promoted record', () => {
      expect(check_content_safety_before_promoted(1, 2).isSuccess).toBe(true);
    });

    it('passes when safety check ran but nothing was promoted (null promotedIndex)', () => {
      expect(check_content_safety_before_promoted(1, null).isSuccess).toBe(true);
    });

    it('fails when safety check was never called', () => {
      const result = check_content_safety_before_promoted(null, 1);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_03_3_SAFETY_NOT_CALLED');
    });

    it('fails when safety check index equals promoted record index', () => {
      const result = check_content_safety_before_promoted(3, 3);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_03_3_SAFETY_ORDER_VIOLATION');
    });

    it('fails when promoted record precedes safety check', () => {
      const result = check_content_safety_before_promoted(5, 2);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_03_3_SAFETY_ORDER_VIOLATION');
    });
  });

  // ── Meta-test ─────────────────────────────────────────────────────────────

  it('ALL 3 checks are exported functions', () => {
    const checks = [
      check_event_created_stored_before_emitted,
      check_capacity_null_means_unlimited,
      check_content_safety_before_promoted,
    ];
    expect(checks).toHaveLength(3);
    checks.forEach((fn) => expect(typeof fn).toBe('function'));
  });
});
