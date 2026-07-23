/**
 * FLOW-04 Named Checks Test Suite — all 3 checks
 * Gaps: GAP-04-1, GAP-04-2, GAP-04-3
 */

import {
  check_rsvp_single_store_document,
  check_waitlist_fifo_by_join_timestamp,
  check_feedback_window_event_triggered,
} from '../event-attendance-named-checks';

describe('FLOW-04 Named Checks', () => {
  // ── CHECK-1: rsvp_single_store_document ───────────────────────────────────

  describe('check_rsvp_single_store_document', () => {
    it('passes: CONFIRMED outcome with exactly 1 storeDocument call', () => {
      expect(check_rsvp_single_store_document(1, 'CONFIRMED').isSuccess).toBe(true);
    });

    it('passes: WAITLISTED outcome with exactly 1 storeDocument call', () => {
      expect(check_rsvp_single_store_document(1, 'WAITLISTED').isSuccess).toBe(true);
    });

    it('passes: DUPLICATE outcome with 0 storeDocument calls', () => {
      expect(check_rsvp_single_store_document(0, 'DUPLICATE').isSuccess).toBe(true);
    });

    it('fails: CONFIRMED outcome with 0 storeDocument calls', () => {
      const result = check_rsvp_single_store_document(0, 'CONFIRMED');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_04_1_ATOMICITY_VIOLATION');
    });

    it('fails: CONFIRMED outcome with 2 storeDocument calls (double-write)', () => {
      const result = check_rsvp_single_store_document(2, 'CONFIRMED');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_04_1_ATOMICITY_VIOLATION');
    });

    it('fails: WAITLISTED outcome with 2 storeDocument calls', () => {
      const result = check_rsvp_single_store_document(2, 'WAITLISTED');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_04_1_ATOMICITY_VIOLATION');
    });

    it('fails: DUPLICATE outcome with 1 storeDocument call (extra write)', () => {
      const result = check_rsvp_single_store_document(1, 'DUPLICATE');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_04_1_DUPLICATE_EXTRA_WRITE');
    });
  });

  // ── CHECK-2: waitlist_fifo_by_join_timestamp ──────────────────────────────

  describe('check_waitlist_fifo_by_join_timestamp', () => {
    const makeEntry = (rsvpId: string, joinTimestamp: string) => ({ rsvpId, joinTimestamp });

    it('passes: promoted is the earliest entry (2 records)', () => {
      const waitlisted = [
        makeEntry('rsvp-002', '2026-06-01T10:00:00.000Z'),
        makeEntry('rsvp-001', '2026-06-01T09:00:00.000Z'), // earliest
      ];
      expect(check_waitlist_fifo_by_join_timestamp('rsvp-001', waitlisted).isSuccess).toBe(true);
    });

    it('passes: promoted is the earliest among 3 records', () => {
      const waitlisted = [
        makeEntry('rsvp-003', '2026-06-02T08:00:00.000Z'),
        makeEntry('rsvp-001', '2026-05-30T07:00:00.000Z'), // earliest
        makeEntry('rsvp-002', '2026-06-01T09:00:00.000Z'),
      ];
      expect(check_waitlist_fifo_by_join_timestamp('rsvp-001', waitlisted).isSuccess).toBe(true);
    });

    it('passes: single-item waitlist, promoted is that item', () => {
      const waitlisted = [makeEntry('rsvp-001', '2026-06-01T09:00:00.000Z')];
      expect(check_waitlist_fifo_by_join_timestamp('rsvp-001', waitlisted).isSuccess).toBe(true);
    });

    it('fails: promoted is NOT the earliest (FIFO violation)', () => {
      const waitlisted = [
        makeEntry('rsvp-002', '2026-06-01T10:00:00.000Z'),
        makeEntry('rsvp-001', '2026-06-01T09:00:00.000Z'), // earliest — but not promoted
      ];
      const result = check_waitlist_fifo_by_join_timestamp('rsvp-002', waitlisted);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_04_2_FIFO_VIOLATION');
    });

    it('fails: empty waitlist cannot verify FIFO ordering', () => {
      const result = check_waitlist_fifo_by_join_timestamp('rsvp-001', []);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_04_2_EMPTY_WAITLIST');
    });
  });

  // ── CHECK-3: feedback_window_event_triggered ──────────────────────────────

  describe('check_feedback_window_event_triggered', () => {
    it('passes: trigger is event.ended', () => {
      expect(check_feedback_window_event_triggered('event.ended').isSuccess).toBe(true);
    });

    it('fails: trigger is timer', () => {
      const result = check_feedback_window_event_triggered('timer');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_04_3_FORBIDDEN_TRIGGER');
    });

    it('fails: trigger is http', () => {
      const result = check_feedback_window_event_triggered('http');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_04_3_FORBIDDEN_TRIGGER');
    });

    it('fails: trigger is cron', () => {
      const result = check_feedback_window_event_triggered('cron');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_04_3_FORBIDDEN_TRIGGER');
    });

    it('fails: trigger is manual', () => {
      const result = check_feedback_window_event_triggered('manual');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_04_3_FORBIDDEN_TRIGGER');
    });

    it('fails: unknown trigger source', () => {
      const result = check_feedback_window_event_triggered('scheduled-job');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CF_04_3_UNKNOWN_TRIGGER');
    });
  });

  // ── Meta-test ─────────────────────────────────────────────────────────────

  it('ALL 3 checks are exported functions', () => {
    const checks = [
      check_rsvp_single_store_document,
      check_waitlist_fifo_by_join_timestamp,
      check_feedback_window_event_triggered,
    ];
    expect(checks).toHaveLength(3);
    checks.forEach((fn) => expect(typeof fn).toBe('function'));
  });
});
