# UX Review — Event Attendance (`event-attendance`)

**PNGs reviewed:** 31 | **Blockers:** 9 | **High:** 3 | **Medium:** 5 | **Low:** 2
**Overall verdict:** Needs fixes

## Summary

The genuine tenant-facing UI in this flow is actually very good — the RSVP form,
confirmation card, waitlist message, cancel-confirm dialog, Check-In Kiosk, and
Attendance dashboard are all well-designed, purposeful, and demonstrate real product
thinking (visible status badges, readable cancellation/refund copy, distinct kiosk
styling with a large green Check-In button). The single biggest problem is that the
nine topology-named captures (`01-n1-...` through `09-n4-n5-when-emits.png`) are all
visually identical screenshots of the Attendance dashboard — they do not depict the
business phases their filenames claim, which is a state-fidelity BLOCKER for every
one of them. The duplicate `at-*-before.png` variants add nothing beyond what the
primary numbered captures already show.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-rsvp-form.png` | Low | Copy | Clean RSVP form with good helper copy ("Reserve your place… confirmation immediately"). Attendee ID / Event ID look developer-ish for an end-user form. | For real tenants, replace raw IDs with attendee email + event-picker dropdown. |
| 2 | `01-n1-processing-step-entered-via-system-in.png` | BLOCKER | State fidelity | Filename implies the n1 processing phase; PNG shows the Attendance roster dashboard (3/2/2 stats). Doesn't depict phase entry. | Capture should show the request entering processing — e.g. a pending RSVP row, or gate outside the roster page. |
| 3 | `02-n2-processing-step-entered-via-system-in.png` | BLOCKER | State fidelity | Identical to #2 — same Attendance roster. | Same as #2. |
| 4 | `02-rsvp-validation-error.png` | Medium | Error states | Red banner "Please review your submission." is too generic — doesn't tell the user which field is wrong. | Inline field errors ("Attendee ID is required") + summary banner. |
| 5 | `03-n3-processing-step-entered-via-system-in.png` | BLOCKER | State fidelity | Identical Attendance roster screen. | Same as #2. |
| 6 | `03-rsvp-confirmed.png` | Low | Positive | Great confirmation card — green styling, "Your spot is confirmed", CONFIRMED status line, clear Cancel RSVP link. This is shippable. | — |
| 7 | `03b-rsvp-cancelled.png` | Low | Positive | "Your RSVP has been cancelled" + "RSVP again →" link is clear and recoverable. Shippable. | — |
| 8 | `04-n4-processing-step-entered-via-system-in.png` | BLOCKER | State fidelity | Identical Attendance roster screen. | Same as #2. |
| 9 | `04-rsvp-waitlisted.png` | Low | Positive | Good amber/yellow waitlist card, "You'll be notified…", Remove from waitlist affordance. Shippable. | — |
| 10 | `05-n5-processing-step-entered-via-system-in.png` | BLOCKER | State fidelity | Identical Attendance roster screen. | Same as #2. |
| 11 | `05-rsvp-duplicate.png` | Low | Positive | Friendly blue info card: "You already have an RSVP for this event." Clear and correct. | — |
| 12 | `06-n1-n2-when-emits.png` | BLOCKER | State fidelity | Filename implies event emission visualization; shows Attendance roster. | Capture should show either the event topology emitting or the pre/post state diff — not the roster page. |
| 13 | `06-rsvp-window-closed.png` | Low | Positive | Orange "Cancellation window has closed" card with deadline explanation. Good. | — |
| 14 | `07-n2-n3-when-emits.png` | BLOCKER | State fidelity | Identical Attendance roster. | Same as #12. |
| 15 | `07-rsvp-error.png` | Medium | Error states | "Something went wrong. Please try again or contact support." — no error code, no retry button, no context. | Add retry CTA + optional "details" disclosure with correlation ID for support. |
| 16 | `08-cancel-confirm-dialog.png` | Low | Positive | Dialog style with red destructive "Yes, cancel" + neutral "Keep my RSVP". Good pattern. | — |
| 17 | `08-n3-n4-when-emits.png` | BLOCKER | State fidelity | Identical Attendance roster. | Same as #12. |
| 18 | `09-n4-n5-when-emits.png` | BLOCKER | State fidelity | Identical Attendance roster. | Same as #12. |
| 19 | `09-rsvp-submitted.png` | Low | Copy | Near-duplicate of #6 but also shows the generated RSVP id (`rsvp-1776…`). Fine as evidence. | Consider hiding the raw internal RSVP id from tenant-facing view. |
| 20 | `10-attendance-dashboard.png` | Low | Positive | Canonical Attendance dashboard — readable stats, legible badges, aligned rows. Shippable. | — |
| 21 | `11-attendance-empty.png` | Medium | Empty states | "No RSVPs for this event yet." is fine but there's no next-action CTA (e.g., "Share the RSVP link") or link back to event. | Add secondary CTA like "Copy RSVP link" or "Open RSVP page" to keep organizers productive. |
| 22 | `12-attendance-error.png` | Medium | Error states | Red "Failed to load attendance data. Please refresh or try again." — no retry button inside the banner, only vague instruction. | Add a "Retry" button and show error correlation id for support. |
| 23 | `13-checkin-kiosk.png` | Low | Positive | Large input + prominent green "Check In" button is correctly kiosk-optimized. The instruction copy is clear. | Consider a large QR scanner affordance for production kiosks. |
| 24 | `14-checkin-success.png` | Low | Positive | Green "Checked in successfully." inline confirmation is appropriate for high-throughput door use. | Consider also resetting/focusing input for the next attendee. |
| 25 | `15-checkin-not-found.png` | Medium | Error states | "No confirmed RSVP found." — fine message, but in a kiosk context the operator probably needs a big-label fallback path ("Register this attendee"). | Add secondary CTA to onboard walk-ins. |
| 26 | `16-feedback-window.png` | High | Information | "Feedback window is open" banner with close time is informative, but the page is otherwise EMPTY — no actual feedback form, no "Submit feedback" button, no list of existing feedback. Users land here and can't act. | Add feedback form (star rating + text) or a disabled placeholder with "Feedback form opens when event ends." |
| 27 | `at-02-before.png` | Medium | Redundant capture | Duplicate of `01-rsvp-form.png` — same form, same empty state. Naming `at-02` is ambiguous to a reviewer. | Rename test artifact or merge with `01-rsvp-form.png`. |
| 28 | `at-08-before.png` | High | Redundant capture | Appears identical to `03-rsvp-confirmed.png`. As the "before" of test 08 (cancel dialog) it's implied context, but as a shipped UX artifact it's duplicate evidence. | Exclude from review set, or document intent. |
| 29 | `at-09-before.png` | Medium | Redundant capture | Duplicate of `01-rsvp-form.png`. | Exclude from review set. |
| 30 | `at-14-before.png` | Medium | Redundant capture | Duplicate of `13-checkin-kiosk.png`. | Exclude from review set. |
| 31 | `at-15-before.png` | High | Redundant capture | Duplicate of `13-checkin-kiosk.png` — identical kiosk screen. | Exclude from review set. |

## Cross-PNG patterns (flow-level)

- **All 9 topology-named PNGs (`01-n1`, `02-n2`, `03-n3`, `04-n4`, `05-n5`, `06-n1-n2`, `07-n2-n3`, `08-n3-n4`, `09-n4-n5`) are pixel-identical** captures of the Attendance dashboard with the same 3/2/2 stats and same roster rows. This is a state-fidelity BLOCKER for each: no phase-specific UI state is ever shown. At minimum these should capture distinct URLs or distinct roster rows reflecting the specific transition.
- **Empty and error states lack recovery actions.** `11-attendance-empty.png` has no secondary CTA; `12-attendance-error.png` and `07-rsvp-error.png` lack Retry buttons. Users in failure paths have no obvious next step.
- **Persistent amber "Missing provider keys" banner** eats the top 48px of nearly every PNG. In an Attendance flow that has no AI/LLM dependency, this banner is noise for an end-user and should be scoped to admin/designer routes only.
- **The `at-*-before.png` family of 5 PNGs is redundant** — each duplicates evidence already in the primary numbered series. They add no independent UX value.
- **The business-state PNGs (03-rsvp-confirmed, 04-rsvp-waitlisted, 05-rsvp-duplicate, 06-rsvp-window-closed) are consistently excellent** — semantic color, precise copy, right affordances. The flow's tenant UI is shippable where it exists.

## Business-logic phase coverage

Covered visually:
- RSVP submission (01-rsvp-form, 09-rsvp-submitted)
- RSVP validation failure (02-rsvp-validation-error)
- RSVP confirmed/cancelled/waitlisted/duplicate/window-closed/error (03, 03b, 04, 05, 06, 07)
- Cancel confirmation (08-cancel-confirm-dialog)
- Organizer dashboard: populated (10), empty (11), error (12)
- Check-in kiosk: empty/success/not-found (13, 14, 15)
- Feedback window open (16 — but UI incomplete)

Not covered / misrepresented:
- **n1 (request received by orchestrator)** — PNG shows roster, not phase-entry UI.
- **n2 (validation/eligibility pass)** — PNG shows roster.
- **n3 (confirmation written)** — PNG shows roster.
- **n4 (capacity/waitlist arbitration)** — PNG shows roster.
- **n5 (attendance finalized)** — PNG shows roster.
- **All n_i → n_j transitions (n1→n2, n2→n3, n3→n4, n4→n5)** — 4 duplicated captures, no transition visualization.
- **Check-in complete + feedback-window-closed end states** — feedback form itself is missing.
