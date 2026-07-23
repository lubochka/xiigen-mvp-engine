/**
 * FLOW-04 Named Checks — 3 runtime-enforceable assertions.
 * Each check returns DataProcessResult — never throws.
 *
 * Gaps covered:
 *   GAP-04-1: rsvp_single_store_document       (CF-04-1)
 *   GAP-04-2: waitlist_fifo_by_join_timestamp  (CF-04-2)
 *   GAP-04-3: feedback_window_event_triggered  (CF-04-3)
 */

import { DataProcessResult } from '../kernel/data-process-result';

// ─── CHECK-1 ─────────────────────────────────────────────────────────────────
/**
 * rsvp_single_store_document
 * CF-04-1: Exactly ONE storeDocument call must occur per RSVP creation request —
 * whether the outcome is CONFIRMED, WAITLISTED, or idempotent return of an
 * existing record. Multiple writes per request violate atomicity.
 */
export function check_rsvp_single_store_document(
  storeDocumentCallCount: number,
  rsvpOutcome: 'CONFIRMED' | 'WAITLISTED' | 'DUPLICATE',
): DataProcessResult<void> {
  if (rsvpOutcome === 'DUPLICATE' && storeDocumentCallCount !== 0) {
    return DataProcessResult.failure(
      'CF_04_1_DUPLICATE_EXTRA_WRITE',
      `RSVP outcome DUPLICATE must produce 0 storeDocument calls but got ${storeDocumentCallCount}. ` +
        'Violates CF-04-1.',
    );
  }
  if (
    (rsvpOutcome === 'CONFIRMED' || rsvpOutcome === 'WAITLISTED') &&
    storeDocumentCallCount !== 1
  ) {
    return DataProcessResult.failure(
      'CF_04_1_ATOMICITY_VIOLATION',
      `RSVP outcome ${rsvpOutcome} must produce exactly 1 storeDocument call but got ` +
        `${storeDocumentCallCount}. Violates CF-04-1.`,
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-2 ─────────────────────────────────────────────────────────────────
/**
 * waitlist_fifo_by_join_timestamp
 * CF-04-2: Waitlist promotion must select the attendee with the earliest
 * join_timestamp (FIFO). Given a list of waitlisted RSVPs, the promoted record
 * must be the one with the minimum join_timestamp value.
 */
export function check_waitlist_fifo_by_join_timestamp(
  promotedRsvpId: string,
  waitlistedRsvps: Array<{ rsvpId: string; joinTimestamp: string }>,
): DataProcessResult<void> {
  if (waitlistedRsvps.length === 0) {
    return DataProcessResult.failure(
      'CF_04_2_EMPTY_WAITLIST',
      'check_waitlist_fifo_by_join_timestamp called with empty waitlist. ' +
        'Cannot verify FIFO ordering. Violates CF-04-2.',
    );
  }

  const earliest = waitlistedRsvps.reduce((min, entry) => {
    return new Date(entry.joinTimestamp).getTime() < new Date(min.joinTimestamp).getTime()
      ? entry
      : min;
  });

  if (promotedRsvpId !== earliest.rsvpId) {
    return DataProcessResult.failure(
      'CF_04_2_FIFO_VIOLATION',
      `Promoted rsvpId '${promotedRsvpId}' is not the earliest waitlisted entry. ` +
        `Earliest is '${earliest.rsvpId}' (joinTimestamp: ${earliest.joinTimestamp}). ` +
        'Waitlist must use FIFO ordering by join_timestamp. Violates CF-04-2.',
    );
  }
  return DataProcessResult.success(undefined);
}

// ─── CHECK-3 ─────────────────────────────────────────────────────────────────
/**
 * feedback_window_event_triggered
 * CF-04-3: The feedback window (T66 FeedbackWindowService) must be opened by
 * the 'event.ended' domain event — never by a timer or a direct HTTP call.
 * Acceptable triggers: 'event.ended'
 * Forbidden triggers: 'timer', 'http', 'cron', 'manual'
 */
export function check_feedback_window_event_triggered(
  triggerSource: string,
): DataProcessResult<void> {
  const ALLOWED_TRIGGER = 'event.ended';
  const FORBIDDEN_TRIGGERS = ['timer', 'http', 'cron', 'manual'];

  if (FORBIDDEN_TRIGGERS.includes(triggerSource)) {
    return DataProcessResult.failure(
      'CF_04_3_FORBIDDEN_TRIGGER',
      `Feedback window opened via '${triggerSource}'. Only '${ALLOWED_TRIGGER}' is permitted. ` +
        'Timers and direct calls bypass the event-driven audit trail. Violates CF-04-3.',
    );
  }
  if (triggerSource !== ALLOWED_TRIGGER) {
    return DataProcessResult.failure(
      'CF_04_3_UNKNOWN_TRIGGER',
      `Feedback window opened via unknown trigger '${triggerSource}'. ` +
        `Only '${ALLOWED_TRIGGER}' is permitted. Violates CF-04-3.`,
    );
  }
  return DataProcessResult.success(undefined);
}
