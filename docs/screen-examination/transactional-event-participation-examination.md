# Flow UI examination — FLOW-09 transactional-event-participation

## Date: 2026-04-20 · Run: RUN-58 · Batch: D (Grammar 5 checkout + Grammar 5 confirmation)

## One-sentence spec

**F1 (literal):**
> When a generation cycle completes on the XIIGen engine, extract the RAG
> patterns from the output, index the identified skills into the knowledge
> graph, and make the patterns available for future retrieval.

**Spec gap flagged:** F1 describes RAG pattern extraction (engine-internal),
but slug `transactional-event-participation`, existing pages
(TicketPurchasePage, WaitlistPage, BookingConfirmationPage, QRCodePage, RefundPage),
and 32 PNGs all describe consumer ticket purchasing. **Following slug per
Rule 16**; flagging F1 as misaligned (third occurrence — FLOW-04, FLOW-09, FLOW-34).

## Roles (F3 — `ROLE-ANALYSIS-BATCH-02.md`)
- **anonymous** — guest ticket checkout
- **tenant-user (attendee)** — primary; buy / waitlist / receive QR / refund
- **event-organiser** — attendee list (overlap with FLOW-04)
- **platform-admin** — cross-tenant refund policy

## Grammar (compound)
- **G5 Kiosk** for TicketPurchasePage (Stripe Checkout two-column pattern)
- **G5 Kiosk** for BookingConfirmationPage (celebratory — QR code + "Added to Google Wallet")
- **G5 Kiosk** for WaitlistPage (single "Join waitlist" action)
- **G5 Kiosk** for QRCodePage (full-screen QR with event metadata)
- **G3 Card List** for RefundPage (per-order history with Request-refund action)

## Reference
**Eventbrite checkout + Airbnb booking** (two-column checkout with order summary left + payment right);
**Ticketmaster confirmation** (QR + wallet add);
**Stripe Refund flow** (per-order refund dialog).

## Classification
- **Q1 CRUD?** ❌ NO — 5 dedicated pages.
- **Q2 Error/empty?** **P0 RISK** — per REPAIR-GUIDANCE Part 5: "booking event-organiser shows 'not found' — needs mock data". Needs confirmation.
- **Q3 Engineering leak?** F1 jargon must not appear. "Transactional event participation" slug itself is engineering-speak for users.
- **Q4 Role-correct?** ✅ 5-page split.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) to ensure "booking not found" error doesn't appear as normal state + F1 spec-gap.

## 32 existing PNGs

## Planned fixes
- TicketPurchasePage: Stripe-style 2-column checkout (order summary left, payment form right)
- BookingConfirmationPage: celebratory full-screen with QR + "Add to Apple Wallet" / "Google Wallet" CTA + event summary
- QRCodePage: full-screen scannable QR + large event name + date/time + seat info
- WaitlistPage: single "Join waitlist" with "You're #N in line" confirmation
- RefundPage: order list with per-order refund status + request-refund kiosk flow
