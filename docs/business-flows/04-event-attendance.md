# FLOW-04 - Event Attendance

## Purpose

Event Attendance manages the attendee side of an event after an event exists:
RSVP capture, waitlist handling, check-in, feedback windows, and cancellation.
It depends on Event Management for the event source record and remains a
separate installable flow because attendance policies vary by tenant.

## Primary Roles

- Anonymous visitor: can view event attendance context but must sign in before RSVP.
- Tenant user: can RSVP, see own attendance status, cancel when policy allows, and submit feedback.
- Referral user: has the same attendance path as a tenant user, with referral attribution preserved.
- Event organiser: monitors capacity, waitlist, check-in, and feedback progress.
- Tenant admin: reviews attendance issues, refunds, and policy enforcement.

## Processing Stages

1. RSVP Orchestrator receives attendee and event identity, verifies capacity,
   stores the RSVP, and emits the result after storage succeeds.
2. Waitlist Manager keeps a FIFO waitlist when capacity is exhausted and
   promotes the earliest waiting attendee when a confirmed slot opens.
3. Check-In Processor accepts only confirmed RSVP records and records the
   attendee check-in with tenant-scoped data.
4. Feedback Window Controller opens feedback collection only after the event has ended.
5. Cancellation Processor changes RSVP status to cancelled, then triggers
   waitlist promotion only when a confirmed slot was freed.

## Tenant Configuration Surface

- `flow04_rsvp_cancellation_window_hours`: attendee cancellation window before event start.
- `flow04_feedback_window_hours`: post-event feedback collection window.

These values are tenant policy. They must be stored per tenant through the
configuration or secret system, not hardcoded into forked service logic.

## Cross-Flow Contract

Event Attendance requires Event Management as a co-install because RSVP and
check-in decisions depend on an event source record. FLOW-04 consumes the
event lifecycle boundary; FLOW-03 does not depend on FLOW-04.

## Portability Acceptance

A portable Event Attendance fork must include:

- The complete FLOW-04 source service set.
- The functional spec and Step 1 invariants.
- The adaptation surface and tenant config.
- Tenant-isolated auth checks for missing token, wrong role, and cross-tenant token replay.
- Visual evidence for source, adapted, installed, and cascade states.
- Green standalone tenant CI after GitHub fork creation.
