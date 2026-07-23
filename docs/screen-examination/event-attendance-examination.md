# Flow UI examination — FLOW-04 event-attendance

## Date: 2026-04-20 · Run: RUN-58 · Batch: D (Grammar 3 attendee list + Grammar 5 check-in kiosk)

## One-sentence spec

**F1 (literal):**
> When a generation cycle completes on the XIIGen platform, capture the DPO training
> signal — record the chosen and rejected outputs, assign curriculum tier, and store
> the training triple for model improvement.

**Spec gap flagged:** F1 text describes engine-internal DPO capture, but the
slug `event-attendance`, existing pages (`RsvpPage`, `AttendanceDashboardPage`),
and 31-PNG inventory all describe consumer event-attendance. **Following
the slug per Rule 16**; flagging F1 as misaligned (same pattern as FLOW-34).

## Roles (F3 — `ROLE-ANALYSIS-BATCH-01.md`)
- **tenant-user (attendee)** — RSVP, check-in, view agenda
- **event-organiser** — attendee list, check-in scanner, capacity tracking
- **tenant-admin** — event policy + moderation
- **anonymous / public-mkt** — browse public events (overlap with FLOW-03)

## Grammar (compound)
- **G3 Card List with State Badge** for attendee list (organiser view)
- **G5 Kiosk** for check-in scanner (single primary action: scan QR)
- **G5 Kiosk** for attendee's RSVP confirmation + calendar download

## Reference
**Eventbrite attendee list, Airbnb reservations, Luma attendee manager** (card list);
**Eventbrite check-in iOS app** (scanner kiosk).

## Classification
- **Q1 CRUD?** 🟡 RsvpPage + AttendanceDashboardPage exist — need rendering check.
- **Q2 Error/empty?** "No attendees yet" / "No RSVPs" empty states.
- **Q3 Engineering leak?** F1 jargon must not appear in tenant-facing attendee UI.
- **Q4 Role-correct?** ✅ attendee vs organiser branches needed.

**Primary finding:** likely 🟡 partial + F1 spec-gap to file.

## 31 existing PNGs

## Planned fixes
- RsvpPage: attendee-view — event summary + RSVP form (name / email / dietary / accessibility) + "Confirm" primary
- Post-RSVP: confirmation screen with QR code + calendar-download link + "Add to Google Calendar" CTA
- AttendanceDashboardPage: organiser-view — capacity bar (e.g., 47/100) + attendee card list with state badge (Registered / Checked-in / Cancelled / No-show)
- Check-in scanner: separate full-screen mode for event-organiser (Grammar 5 kiosk)
