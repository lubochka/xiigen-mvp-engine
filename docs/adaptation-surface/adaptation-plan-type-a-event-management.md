# Adaptation Plan - Type A - Event Management

Flow: FLOW-03 Event Management
Tenant: acme-corp
Adapted module name: event-management-acme-curated-events
Version: 1.0.1

## Summary

Acme Corp adapts Event Management into a curated small-group event package. The
service code remains structurally unchanged: the adaptation is expressed through
flow-scoped configuration values that the existing services already read.

## Changed Values

| Tenant-facing behavior | Platform value | Acme value | Evidence |
|---|---:|---:|---|
| Active events per organiser | 100 | 3 | Fourth Acme event returns the rate-limit result |
| Attendees per event | 500 | 10 | Eleventh attendee is routed to the waitlist |
| Promotion channels | in-app and push | in-app only | Promotion payload stores only in-app |
| Campaign completion threshold | 1000 | 5 | Fifth campaign engagement completes the campaign |

## Applied Surface

- `docs/adaptation-surface/adaptation-surface-event-management.json`
- `server/test/event-management/phase-03-adaptation-freedom-config.spec.ts`
- `client/src/pages/event-management/EventCreationPage.tsx`
- `client/src/pages/sharable-flows-marketplace/SharableFlowsMarketplacePage.tsx`
- `client/e2e/event-management-visual.spec.ts`
- `client/e2e/event-management-phase4-marketplace.spec.ts`

## Verification Plan

1. Run the Flow 03 adaptation Jest spec.
2. Run the full Flow 03 Jest path.
3. Capture 27 adapted role screenshots under
   `docs/e2e-snapshots/event-management/tenant-a-v1.0.1/`.
4. Capture the marketplace listing screenshot at
   `docs/e2e-snapshots/marketplace/event-management-v1.0.1-listing.png`.
5. Run the standard review gate and pre-commit gate before commit.

## Plain-Language UI Requirement

The rendered UI must not expose configuration key names. It should say:

"Acme curated event policy: up to 10 attendees per event, 3 active events per
organiser, promotion through in-app updates only."

That sentence proves the adapted values are visible to reviewers without
showing engine internals to users.
