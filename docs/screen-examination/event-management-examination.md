# Flow UI examination — FLOW-03 event-management

## Date: 2026-04-20 · Run: RUN-58 · Batch: D (Grammar 5 Form Wizard)

## One-sentence spec (F1)
> When a developer on the XIIGen community platform creates an event, orchestrate the
> multi-step AI generation loop — validate the event platform contract, generate the event
> creation service, and confirm the orchestration is complete.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-01.md`)
- **tenant-user (event-organiser)** — primary creator
- **tenant-admin** — approve / feature events
- **anonymous / public-mkt** — browse public events
- **platform-admin** — cross-tenant event moderation

## Grammar
**G5 Kiosk → multi-step wizard** — Details → Tickets → Promotion → Publish.
**Reference:** **Eventbrite create event**, **Luma create event**, **Meetup**.

## F4 Business doc
`business_flows.zip / 03-event-creation-promotion.md`

## Classification
- **Q1 CRUD?** ❌ NO — EventListPage + EventCreationPage (2 pages).
- **Q2 Error/empty?** Empty event list: "No events yet — create your first event" CTA.
- **Q3 Engineering leak?** "AI generation loop", "event platform contract" — internal; UI copy: "Creating your event", "Event details".
- **Q4 Role-correct?** ✅ creator vs browser split.

**Primary finding:** 🟡 partial — wizard layout needs verification; right-panel live preview required.

## 25 existing PNGs

## Planned fixes
- EventCreationPage as multi-step wizard (left steps, right live preview)
- Step 1 Details: title + description + date/time + location + cover image
- Step 2 Tickets: ticket types + prices + capacity + registration-window
- Step 3 Promotion: AI-suggested tags + social share previews + featured-slot bid (optional)
- Step 4 Publish: final preview + publish primary CTA
- Post-publish: AI match score / audience prediction surfaced
- EventListPage: card grid with date + capacity + "View" / "Edit" (organiser) / "RSVP" (attendee)
