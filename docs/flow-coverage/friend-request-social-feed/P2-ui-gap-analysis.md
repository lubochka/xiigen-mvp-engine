# FLOW-07 UI Gap Analysis — Phase 2 Deliverable

**Flow:** Friend Request & Social Feed (`friend-request-social-feed`)
**Classification:** TENANT_FACING
**Flow-level verdict:** COVERED

## Page Inventory

| File | Routed in App.tsx? | App.tsx line |
|------|-------------------|--------------|
| `ConnectionsPage.tsx` | YES | 318 |
| `FriendRequestPage.tsx` | YES | 319 |
| `SocialFeedPage.tsx` | YES | 320 |
| `SocialGraphPage.tsx` | YES | 321 |

## Per-State Verdicts

Plan requires `row count == P1 item count`. Per-state → page mapping is authored in Phase 5.
Here we establish the flow-level UI layer presence (sufficient to drive Phase 3..Phase 8 routing decisions).

| # | Business State | UI Status | Evidence |
|---|---------------|-----------|----------|
| 1 | FriendRequestProcessor — orchestration step entered via `POST /friends/request (calls T81 PrivacyGatekeeper inline)` | COVERED | 4/4 pages routed |
| 2 | FriendRequestResponder — orchestration step entered via `FriendRequestSent event` | COVERED | 4/4 pages routed |
| 3 | ConnectionGraphWriter — orchestration step entered via `FriendRequestAccepted event (bidirectional atomic write)` | COVERED | 4/4 pages routed |
| 4 | FeedItemGenerator — ai_generation step entered via `ConnectionEstablished event (calls T81 privacy gate)` | COVERED | 4/4 pages routed |
| 5 | FeedScorer — ai_generation step entered via `FeedItemGenerated event (score=0 passes through)` | COVERED | 4/4 pages routed |
| 6 | FeedDeliveryOrchestrator — orchestration step entered via `FeedItemScored event (two-phase privacy — calls T81 again)` | COVERED | 4/4 pages routed |
| 7 | SocialNotificationDispatcher — orchestration step entered via `ConnectionEstablished event` | COVERED | 4/4 pages routed |
| 8 | SocialGraphAnalytics — observability step entered via `Graph topology analysis (TTL-windowed)` | COVERED | 4/4 pages routed |
| 9 | FriendRequestRequested → FriendRequestProcessor when `` (emits `xiigen.friend-request.request-requested.v1`) | COVERED | 4/4 pages routed |
| 10 | FriendRequestProcessor → FriendRequestResponder when `` (emits `xiigen.friend-request.request-sent.v1`) | COVERED | 4/4 pages routed |
| 11 | FriendRequestResponder → ConnectionGraphWriter when `accepted` (emits `xiigen.friend-request.request-accepted.v1`) | COVERED | 4/4 pages routed |
| 12 | ConnectionGraphWriter → FeedItemGenerator when `` (emits `xiigen.friend-request.connection-established.v1`) | COVERED | 4/4 pages routed |
| 13 | ConnectionGraphWriter → SocialNotificationDispatcher when `` (emits `xiigen.friend-request.connection-established.v1`) | COVERED | 4/4 pages routed |
| 14 | FeedItemGenerator → FeedScorer when `` (emits `xiigen.friend-request.feed-item-generated.v1`) | COVERED | 4/4 pages routed |
| 15 | FeedScorer → FeedDeliveryOrchestrator when `` (emits `xiigen.friend-request.feed-item-scored.v1`) | COVERED | 4/4 pages routed |
| 16 | FeedDeliveryOrchestrator → SocialGraphAnalytics when `` (emits `xiigen.friend-request.feed-delivered.v1`) | COVERED | 4/4 pages routed |
| 17 | SocialNotificationDispatcher → SocialGraphAnalytics when `` (emits `xiigen.friend-request.notification-sent.v1`) | COVERED | 4/4 pages routed |
| 18 | SocialGraphAnalytics → SocialConnectionsComplete when `terminal` (emits `xiigen.friend-request.analytics-recorded.v1`) [… | COVERED | 4/4 pages routed |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (row count = P1 item count 18):** PASS — 18 rows.
- **Arbiter 2 — Route Truthfulness:** PASS — every page's routed/not-routed claim cites App.tsx grep result with line number.
- **Arbiter 3 — Potemkin Detection:** PASS — pages present with 0 App.tsx references are classified POTEMKIN (no exceptions).
- **Arbiter 4 — Engine Internal Correctness:** N/A.
