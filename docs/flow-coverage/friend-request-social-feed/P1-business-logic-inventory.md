# FLOW-07 Business Logic Inventory — Phase 1 Deliverable

**Flow:** Friend Request & Social Feed (`friend-request-social-feed`)
**Classification:** TENANT_FACING
**Source:** TOPOLOGY
**Source document:** `contracts/topologies/friend-request-social-feed.topology.json`

**Topology shape:** 8 nodes, 10 edges. Minimum inventory items: 18.

## Business States & Transitions

1. FriendRequestProcessor — orchestration step entered via `POST /friends/request (calls T81 PrivacyGatekeeper inline)`
2. FriendRequestResponder — orchestration step entered via `FriendRequestSent event`
3. ConnectionGraphWriter — orchestration step entered via `FriendRequestAccepted event (bidirectional atomic write)`
4. FeedItemGenerator — ai_generation step entered via `ConnectionEstablished event (calls T81 privacy gate)`
5. FeedScorer — ai_generation step entered via `FeedItemGenerated event (score=0 passes through)`
6. FeedDeliveryOrchestrator — orchestration step entered via `FeedItemScored event (two-phase privacy — calls T81 again)`
7. SocialNotificationDispatcher — orchestration step entered via `ConnectionEstablished event`
8. SocialGraphAnalytics — observability step entered via `Graph topology analysis (TTL-windowed)`
9. FriendRequestRequested → FriendRequestProcessor when `` (emits `xiigen.friend-request.request-requested.v1`)
10. FriendRequestProcessor → FriendRequestResponder when `` (emits `xiigen.friend-request.request-sent.v1`)
11. FriendRequestResponder → ConnectionGraphWriter when `accepted` (emits `xiigen.friend-request.request-accepted.v1`)
12. ConnectionGraphWriter → FeedItemGenerator when `` (emits `xiigen.friend-request.connection-established.v1`)
13. ConnectionGraphWriter → SocialNotificationDispatcher when `` (emits `xiigen.friend-request.connection-established.v1`)
14. FeedItemGenerator → FeedScorer when `` (emits `xiigen.friend-request.feed-item-generated.v1`)
15. FeedScorer → FeedDeliveryOrchestrator when `` (emits `xiigen.friend-request.feed-item-scored.v1`)
16. FeedDeliveryOrchestrator → SocialGraphAnalytics when `` (emits `xiigen.friend-request.feed-delivered.v1`)
17. SocialNotificationDispatcher → SocialGraphAnalytics when `` (emits `xiigen.friend-request.notification-sent.v1`)
18. SocialGraphAnalytics → SocialConnectionsComplete when `terminal` (emits `xiigen.friend-request.analytics-recorded.v1`) [TERMINAL]

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (edge+node formula: 10+8=18):** PASS — 18 items produced.
- **Arbiter 2 — Scope Isolation:** PASS — state descriptions reference nodes/events; no TypeScript types, no file paths, no class names.
- **Arbiter 3 — Terminal State Coverage:** PASS — terminal-labeled edges (condition contains 'terminal') appear as `[TERMINAL]` entries.
- **Arbiter 4 — Iron Rule Labels:** DEFERRED — CF-XX labels require cross-reference with `server/src/engine-contracts/{slug}-bfa-rules.ts`; applied in Phase 9 (edge case discovery) where iron rules directly govern edge cases.
- **Arbiter 5 — Branch Honest Flagging:** PASS (Branch A — no flag required).
