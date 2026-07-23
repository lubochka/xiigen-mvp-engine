# Flow UI examination — FLOW-40 client-push

## Date: 2026-04-20 · Run: RUN-57 · Batch: C (Grammar 3 Card List — connection monitor)

## One-sentence spec (F1)
> When clients connect to wait for long-running flow steps, accept SSE
> connections authenticated by tenantId and correlationId, register each
> connection in ISseConnectionPool, push real-time events when flow state
> changes (email.verified, verification.expired, onboarding.step.N), send
> keepalive pings on a configurable interval, and clean up dropped connections.

## Roles (F3)
- **platform-admin** — primary; SSE connection monitor + delivery audit
- **platform-support** — read-only

**Important:** Per `SPEC-LOCATION-MAP-ADDENDUM-FLOW36-45.md` — **tenant-user
has NO UI here**. SSE is infrastructure the tenant consumes via flow
status updates in other flows (e.g., FLOW-01 registration pending page),
NOT via this admin console.

## Grammar
**G3 Card List (connection monitor)** — active SSE connections table with state badges.
**Reference:** **New Relic connection inspector**, **OneSignal admin dashboard**, network-monitoring tools.

## CFI-05 status
**Orphaned screen** — `ClientPushScreen.tsx`, `SseConnectionStatusBadge.tsx`,
`EventDeliveryTag.tsx`, `KeepaliveStatusRow.tsx` exist at
`client/src/components/client-push/` but `ClientPushPage.tsx` renders
`AdminCrudPanel` default. **FLOW-45 RUN-52 template applies.**

## Classification
- **Q1 CRUD?** ✅ YES — current page is AdminCrudPanel default + BusinessStateCard.
- **Q2 Error/empty?** Empty-state copy: "No active SSE connections — clients will appear here when they subscribe."
- **Q3 Engineering leak?** "tenantId", "correlationId", "ISseConnectionPool", "keepalive cadence" — internal; for admin audience may be acceptable but should be "Tenant", "Correlation ID", "Connection pool", "Keepalive interval".
- **Q4 Role-correct?** 2-role scope.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) — rewrite Page to wire `ClientPushScreen` as default.

## 14 existing PNGs

## Planned fixes (Page rewrite per FLOW-45 template)

```
?mock=<key>  → BusinessStateCard with canonical connection states
no ?mock     → PlatformOpsPage wrapping ClientPushScreen with populated
                connection list (6-8 connections across states)
```

ClientPushScreen rendering:
- Active connections table: tenantId / correlationId / state badge / last event / time connected
- Event delivery log: recent pushed events with delivery confirmation
- Connection health tiles: connections/min, avg lifetime, keepalive rate
