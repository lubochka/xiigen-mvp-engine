# FLOW-07 UI Spec — Phase 5 Deliverable

**Flow:** Friend Request & Social Feed (`friend-request-social-feed`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `ConnectionsPage.tsx` | `/friend-request-social-feed/connections` | `connection-item`, `connection-strength`, `connections-error`, `connections-list-section`, `connections-loading`, `connections-page` +5 |
| `FriendRequestPage.tsx` | `/friend-request-social-feed/friend-request` | `accept-btn`, `friend-request-page`, `no-requests`, `pending-requests`, `recipient-id-input`, `reject-btn` +6 |
| `SocialFeedPage.tsx` | `/friend-request-social-feed/social-feed` | `empty-feed`, `feed-error`, `feed-item`, `feed-item-score`, `feed-item-type`, `feed-list` +2 |
| `SocialGraphPage.tsx` | `/friend-request-social-feed/social-graph` | `analytics-card`, `analytics-count`, `analytics-error`, `analytics-grid`, `analytics-loading`, `analytics-type` +2 |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | FriendRequestProcessor — orchestration step entered via `POST /friends/request (calls T81 … | `FriendRequestPage.tsx` | `page-friendrequest` |
| 2 | FriendRequestResponder — orchestration step entered via `FriendRequestSent event` | `ConnectionsPage.tsx` | `page-connections` |
| 3 | ConnectionGraphWriter — orchestration step entered via `FriendRequestAccepted event (bidir… | `ConnectionsPage.tsx` | `page-connections` |
| 4 | FeedItemGenerator — ai_generation step entered via `ConnectionEstablished event (calls T81… | `ConnectionsPage.tsx` | `page-connections` |
| 5 | FeedScorer — ai_generation step entered via `FeedItemGenerated event (score=0 passes throu… | `ConnectionsPage.tsx` | `page-connections` |
| 6 | FeedDeliveryOrchestrator — orchestration step entered via `FeedItemScored event (two-phase… | `ConnectionsPage.tsx` | `page-connections` |
| 7 | SocialNotificationDispatcher — orchestration step entered via `ConnectionEstablished event… | `ConnectionsPage.tsx` | `page-connections` |
| 8 | SocialGraphAnalytics — observability step entered via `Graph topology analysis (TTL-window… | `SocialGraphPage.tsx` | `page-socialgraph` |
| 9 | FriendRequestRequested → FriendRequestProcessor when `` (emits `xiigen.friend-request.requ… | `FriendRequestPage.tsx` | `page-friendrequest` |
| 10 | FriendRequestProcessor → FriendRequestResponder when `` (emits `xiigen.friend-request.requ… | `FriendRequestPage.tsx` | `page-friendrequest` |
| 11 | FriendRequestResponder → ConnectionGraphWriter when `accepted` (emits `xiigen.friend-reque… | `FriendRequestPage.tsx` | `page-friendrequest` |
| 12 | ConnectionGraphWriter → FeedItemGenerator when `` (emits `xiigen.friend-request.connection… | `FriendRequestPage.tsx` | `page-friendrequest` |
| 13 | ConnectionGraphWriter → SocialNotificationDispatcher when `` (emits `xiigen.friend-request… | `FriendRequestPage.tsx` | `page-friendrequest` |
| 14 | FeedItemGenerator → FeedScorer when `` (emits `xiigen.friend-request.feed-item-generated.v… | `FriendRequestPage.tsx` | `page-friendrequest` |
| 15 | FeedScorer → FeedDeliveryOrchestrator when `` (emits `xiigen.friend-request.feed-item-scor… | `FriendRequestPage.tsx` | `page-friendrequest` |
| 16 | FeedDeliveryOrchestrator → SocialGraphAnalytics when `` (emits `xiigen.friend-request.feed… | `FriendRequestPage.tsx` | `page-friendrequest` |
| 17 | SocialNotificationDispatcher → SocialGraphAnalytics when `` (emits `xiigen.friend-request.… | `FriendRequestPage.tsx` | `page-friendrequest` |
| 18 | SocialGraphAnalytics → SocialConnectionsComplete when `terminal` (emits `xiigen.friend-req… | `FriendRequestPage.tsx` | `page-friendrequest` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 18 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
