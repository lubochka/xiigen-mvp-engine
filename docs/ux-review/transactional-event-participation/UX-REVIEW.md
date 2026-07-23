# UX Review — Transactional Event Participation (`transactional-event-participation`)

**PNGs reviewed:** 32 | **Blockers:** 18 | **High:** 4 | **Medium:** 5 | **Low:** 5
**Overall verdict:** Not representative

## Summary

This flow has three genuinely well-designed tenant screens — Purchase Ticket,
Join Waitlist, Request Refund — each with clear fields, recognizable primary actions,
and sensible color semantics (blue Reserve, amber Waitlist, red Refund). Unfortunately,
the majority of the capture set is non-representative: eighteen PNGs are stuck on
"Loading booking…" with no body content, and several happy-path captures
(`03-booking-pending`, `04-qr-code-display`, `08-booking-confirmed`, `09-waitlist-position`)
show either error states or the empty waitlist form rather than the state their
filenames claim. The single biggest issue is that the perpetual "Loading booking…"
state dominates the topology captures, meaning a reviewer (or auditor) cannot verify
any of the orchestrated business phases visually.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-eventparticipationorchestrator-orchestra.png` | BLOCKER | State fidelity | Only "Loading booking…" text. No orchestration phase visible. | Stabilize capture after data loads; or render a dedicated phase-indicator. |
| 2 | `01-ticket-purchase-form.png` | Low | Positive | Clean Purchase Ticket form: Event ID input with placeholder `event-001`, Ticket Tier dropdown, blue "Reserve Seat & Purchase" CTA. Good. | Consider replacing raw Event ID with event-picker dropdown for end-users. |
| 3 | `02-ticketinventorymanager-data-pipeline-ste.png` | BLOCKER | State fidelity | "Loading booking…" only. | Same as #1. |
| 4 | `02-waitlist-form.png` | Medium | Copy | "Join Waitlist" form — Event ID field has NO placeholder, unlike Purchase Ticket's `event-001` example. Inconsistent. | Add matching placeholder for consistency. |
| 5 | `03-booking-pending.png` | BLOCKER | State fidelity | Filename implies pending-booking confirmation view; PNG shows a red "Booking not found" error. This is the opposite of the advertised state. | Capture after booking is actually created and in pending state. |
| 6 | `03-paymenteligibilitygate-validation-step-e.png` | BLOCKER | State fidelity | "Loading booking…" only. | Same as #1. |
| 7 | `04-qr-code-display.png` | BLOCKER | State fidelity | Red "QR code not found" error — no QR is shown. Filename implies successful QR display. | Capture only when QR is actually rendered. |
| 8 | `04-ticketissuer-data-pipeline-step-entered.png` | BLOCKER | State fidelity | "Loading booking…" only. | Same as #1. |
| 9 | `05-refundorchestrator-orchestration-step-en.png` | BLOCKER | State fidelity | "Loading booking…" only. | Same as #1. |
| 10 | `05-waitlist-event-input.png` | Medium | Redundant | Identical to #4 (empty Join Waitlist form). | Either show filled state to distinguish, or remove. |
| 11 | `06-attendancetokenservice-processing-step-e.png` | BLOCKER | State fidelity | "Loading booking…" only. | Same as #1. |
| 12 | `06-refund-form.png` | Low | Positive | Clean Request Refund form with Purchase ID input, Reason textarea, red "Submit Refund Request" button. Destructive red is appropriate. | Add character counter or soft minimum for Reason text. |
| 13 | `07-purchase-form-input.png` | Low | Positive | Purchase Ticket form with `event-001` pre-filled in the Event ID field. Fine as evidence of input. | — |
| 14 | `07-tokenredemptionprocessor-processing-step.png` | BLOCKER | State fidelity | "Loading booking…" only. | Same as #1. |
| 15 | `08-booking-confirmed.png` | BLOCKER | State fidelity | Filename says "booking confirmed" but PNG shows "Loading booking…". Critical happy-path evidence missing. | Capture the confirmed booking card (ticket ID, seat info, QR, next steps). |
| 16 | `08-participationanalytics-observability-ste.png` | BLOCKER | State fidelity | "Loading booking…" only. | Same as #1. |
| 17 | `09-participationrequested-eventparticipatio.png` | BLOCKER | State fidelity | "Loading booking…" only. | Same as #1. |
| 18 | `09-waitlist-position.png` | BLOCKER | State fidelity | Filename implies "you are #N on waitlist"; PNG is the empty Join Waitlist submission form. Wrong state entirely. | Capture the post-submission state showing position / expected-availability. |
| 19 | `10-eventparticipationorchestrator-ticketinv.png` | BLOCKER | State fidelity | "Loading booking…" only. | Same as #1. |
| 20 | `10-refund-reason-input.png` | Low | Positive | Refund form with "Changed my plans" typed in Reason textarea — shows the form handles input. | — |
| 21 | `11-eventparticipationorchestrator-participa.png` | BLOCKER | State fidelity | "Loading booking…" only. | Same as #1. |
| 22 | `12-ticketinventorymanager-paymenteligibilit.png` | BLOCKER | State fidelity | "Loading booking…" only. | Same as #1. |
| 23 | `13-ticketinventorymanager-soldout-when-capa.png` | BLOCKER | State fidelity | Filename advertises SOLD OUT state; PNG shows empty Refund form (Purchase ID, Reason). Not sold-out UI. | Capture the sold-out tier state (disabled option or explicit "Sold out" badge). |
| 24 | `14-paymenteligibilitygate-ticketissuer-when.png` | Medium | State fidelity | Shows Purchase Ticket form with empty Event ID — relevant context but not the cross-service transition state. | Capture the specific event handoff, or accept as environmental reference. |
| 25 | `15-paymenteligibilitygate-refundorchestrato.png` | Medium | State fidelity | Shows empty Refund form. Tangentially related to refund orchestrator, but not the "when-emits" transition. | Capture the event flight, or at minimum a Refund state with data. |
| 26 | `16-ticketissuer-attendancetokenservice-when.png` | Medium | State fidelity | Shows empty Purchase Ticket form — unrelated to token-service handoff. | Capture post-purchase handoff (issued ticket + token generated). |
| 27 | `17-attendancetokenservice-tokenredemptionpr.png` | BLOCKER | State fidelity | "Loading booking…" only. | Same as #1. |
| 28 | `18-tokenredemptionprocessor-participationan.png` | BLOCKER | State fidelity | "Loading booking…" only. | Same as #1. |
| 29 | `19-refundorchestrator-participationanalytic.png` | High | State fidelity | Shows empty Refund form — related subject but not the analytics/observability screen the filename implies. | Capture an analytics widget or summary with refund metrics. |
| 30 | `20-participationanalytics-participationflow.png` | High | State fidelity | Shows Purchase Ticket form — unrelated to analytics terminal state. | Capture the flow summary/analytics dashboard. |
| 31 | `r-07-after.png` | Low | Positive | Purchase Ticket form with `event-001` entered. Useful as "after input" evidence. | — |
| 32 | `r-10-after.png` | Low | Positive | Refund form with "Changed my plans" typed. Useful evidence of form state. | — |

## Cross-PNG patterns (flow-level)

- **18 PNGs — more than half the set — are stuck on "Loading booking…".** This is the dominant BLOCKER. Tests appear to capture before React resolves `bookingId` from route/state. No actual topology phase is rendered anywhere. Fix by awaiting a data-ready signal before `page.screenshot()`.
- **Critical happy-path evidence is missing or misleading.** The captures named for the three moments an actual customer cares about — pending booking, confirmed booking, QR code — each show the wrong state (error or loading). A reviewer cannot verify the end-to-end purchase path from this set.
- **Error copy is inconsistent.** "Booking not found" vs "QR code not found" have matching style, but no retry, no event link, no instructional next step.
- **The three authored tenant forms are consistently good** (Purchase Ticket, Join Waitlist, Request Refund). Color semantics, button hierarchy, and labels are right. This is the flow's strength.
- **Waitlist form inconsistency**: the Purchase form uses a placeholder example `event-001`; the Waitlist form's Event ID field has no placeholder. Minor but fixable.
- **Persistent amber "Missing provider keys" banner** obscures the top 48px everywhere, even on a pure ticket-purchase flow that has no AI path. Should be scoped away from tenant routes.

## Business-logic phase coverage

Covered visually:
- Purchase Ticket form, filled and empty (01, 07, r-07-after)
- Join Waitlist form, empty (02, 05, 09)
- Request Refund form, empty and with reason (06, 10, r-10-after)

Not covered / misrepresented:
- **Orchestration phases 1–20 (all n-transitions)** — each is either "Loading booking…" or an unrelated form. No phase-specific UI is ever shown.
- **Pending booking state (03)** — shows error, not pending.
- **Paid + ticket issued (04 QR code)** — shows "not found" error, not a QR.
- **Booking confirmed (08)** — stuck in loading, happy-path success is never visually evidenced.
- **Waitlist position / expected availability (09)** — shows empty Join form instead.
- **Sold out tier (13)** — shows empty Refund form instead.
- **Analytics / observability terminal state (19, 20)** — shows forms instead of analytics.
