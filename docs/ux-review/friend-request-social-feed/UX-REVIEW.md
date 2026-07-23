# UX Review — Friend Request & Social Feed (`friend-request-social-feed`)

**PNGs reviewed:** 31 | **Blockers:** 19 | **High:** 2 | **Medium:** 6 | **Low:** 4
**Overall verdict:** Not representative

## Summary

The tenant-facing UI that *does* exist is minimal but correct — a simple Friend Requests
submission form with disabled-when-empty primary action, and legitimate empty-state pages
for My Connections, Social Feed, and Social Graph Analytics that name the next action clearly.
The fatal problem is state fidelity: of 31 PNGs, 19 are visually identical captures of one of
three empty pages (Friend Requests, My Connections, Social Graph Analytics) despite their
filenames advertising eight distinct orchestration phases, nine cross-service transitions,
and the happy-path states that a real user cares about (`friend-request-accepted`,
`friend-request-rejected`, `social-feed`, `feed-zero-score-items`, `feed-privacy-filtered`,
`mutual-connections`, `connection-strength`). The flow never visually evidences a single
successful friend-request round-trip or any content in the feed.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-friend-request-form.png` | Low | Positive | Clean "Send Friend Request" form: Recipient User ID + Optional message fields, disabled (light-blue) Send Request button when empty, and a "Pending Requests — No pending requests" section below. Good affordance discipline. | Raw user IDs feel developer-ish for end users; for real tenants a user search/autocomplete would be friendlier. |
| 2 | `01-friendrequestprocessor-orchestration-ste.png` | BLOCKER | State fidelity | Filename implies the FriendRequestProcessor orchestration phase entry; PNG shows the empty Friend Requests form. No orchestration phase UI is rendered. | Capture after a request is submitted and the processor has it in-flight, or surface a phase-status indicator. |
| 3 | `02-friend-request-filled.png` | Low | Positive | Form with `user-test-recipient` typed into Recipient User ID, Send Request button now enabled (saturated blue). Good evidence the button state is data-driven. | — |
| 4 | `02-friendrequestresponder-orchestration-ste.png` | BLOCKER | State fidelity | Identical empty Friend Requests form — no responder phase UI. | Same as #2. |
| 5 | `03-connectiongraphwriter-orchestration-step.png` | BLOCKER | State fidelity | Shows empty My Connections ("All Connections (0) — No connections yet", "Mutual Connections — No mutual connection data yet") instead of the graph-writer phase. | Capture should show the edge being written — a newly-added connection row or an "updating graph" indicator. |
| 6 | `03-friend-request-accepted.png` | BLOCKER | State fidelity | Advertises "request accepted"; PNG shows the empty Friend Requests form (no pending, no history). Critical happy-path evidence missing. | Capture the post-acceptance state: green "Request accepted" toast + the new connection appearing in Pending→Accepted list. |
| 7 | `04-feeditemgenerator-ai-generation-step-ent.png` | BLOCKER | State fidelity | Shows empty My Connections instead of feed-generator phase. | Capture the feed item being generated (spinner + partial card) or post-generation populated feed. |
| 8 | `04-friend-request-rejected.png` | BLOCKER | State fidelity | Advertises "request rejected"; PNG is the empty Friend Requests form. No rejection feedback shown. | Capture rejection state: orange/red "Request declined" message + how the user un-stucks (resend later?). |
| 9 | `05-feedscorer-ai-generation-step-entered-vi.png` | BLOCKER | State fidelity | Empty My Connections page — not a scorer view. | Capture a feed row showing score/rank or a scored-items panel. |
| 10 | `05-social-feed.png` | Medium | Empty states | Social Feed page is legitimately empty — "No feed items yet. Connect with friends to see activity here." Copy is clear but there is no CTA (e.g., "Find friends", "Invite a contact"), so a new user has no onward path. | Add a secondary CTA linking to the Friend Requests page or a suggested-users panel. |
| 11 | `06-feed-zero-score-items.png` | BLOCKER | State fidelity | Filename advertises a feed with zero-scored items (items present but ranked 0); PNG shows the same empty Social Feed. Does not demonstrate the zero-score filter behavior. | Capture a feed containing items with a visible "0" score badge or a "Low-relevance items hidden" control. |
| 12 | `06-feeddeliveryorchestrator-orchestration-s.png` | BLOCKER | State fidelity | Empty My Connections page — not the delivery orchestrator view. | Capture delivery-in-progress UI or a delivered-feed snapshot. |
| 13 | `07-feed-privacy-filtered.png` | BLOCKER | State fidelity | Advertises privacy-filtered feed; PNG is the empty Social Feed — there is no way to see that privacy filtering actually removed anything. | Capture feed with a "privacy filter is hiding N items — adjust settings" hint, or a toggle control that changes the count. |
| 14 | `07-socialnotificationdispatcher-orchestrati.png` | BLOCKER | State fidelity | Empty My Connections page — no notification-dispatcher UI. | Capture a notification toast or a notifications panel. |
| 15 | `08-mutual-connections.png` | BLOCKER | State fidelity | Filename implies a mutual-connections list; PNG is the empty My Connections page ("No mutual connection data yet"). Should show at least one pair. | Seed a user with mutuals and capture a populated list. |
| 16 | `08-socialgraphanalytics-observability-step.png` | BLOCKER | State fidelity | Filename implies analytics observability phase; PNG shows the empty Social Graph Analytics page ("No analytics data available"). | Capture an analytics panel with at least one metric tile or a synthetic demo dataset. |
| 17 | `09-connection-strength.png` | BLOCKER | State fidelity | Advertises connection-strength UI (bar / badge / score); PNG is the empty My Connections page with no strength indicator anywhere. | Capture a row showing a strength meter (e.g., "Strong — 87% · 12 mutual contacts"). |
| 18 | `09-friendrequestrequested-friendrequestproc.png` | BLOCKER | State fidelity | Empty Friend Requests form — no cross-service transition evidence. | Capture the emit-edge: e.g., "Request submitted" ghost row appearing in Pending, or a sender → processor topology frame. |
| 19 | `10-friendrequestprocessor-friendrequestresp.png` | BLOCKER | State fidelity | Empty Friend Requests form. | Same as #18. |
| 20 | `10-privacy-settings-feed.png` | BLOCKER | State fidelity | Filename implies privacy-settings panel for the feed; PNG is the empty Social Feed page. No privacy controls visible anywhere. | Capture the settings/toggle UI itself ("Who can see your feed: Friends / Public / Only me"). |
| 21 | `11-friendrequestresponder-connectiongraphwr.png` | BLOCKER | State fidelity | Empty Friend Requests form. | Capture the transition state (e.g., accepted request becoming a connection). |
| 22 | `11-social-graph-tenant-isolated.png` | Medium | State fidelity | Filename implies a tenant-isolation demo (two tenants, two graphs); PNG is the empty Friend Requests form. No isolation is visually demonstrated. | Capture two side-by-side sessions or a "Current tenant: X" badge with scoped counts. |
| 23 | `12-connectiongraphwriter-feeditemgenerator.png` | BLOCKER | State fidelity | Empty Friend Requests form. | Capture the cross-service emission state. |
| 24 | `13-connectiongraphwriter-socialnotification.png` | High | Consistency | Empty Friend Requests form **AND** the chrome banner is RED-TINTED instead of amber — "No AI provider keys configured. Flows will use mock AI only." Visual inconsistency with every other PNG in the set (all amber "Missing provider keys"). | Either normalize the banner color/copy across all routes, or document the two states as distinct severities. |
| 25 | `14-feeditemgenerator-feedscorer-when-emits.png` | High | Consistency | Empty Friend Requests form with the same RED-variant banner as #24. | Same as #24. |
| 26 | `15-feedscorer-feeddeliveryorchestrator-when.png` | BLOCKER | State fidelity | Empty Friend Requests form. | Capture the emission state. |
| 27 | `16-feeddeliveryorchestrator-socialgraphanal.png` | BLOCKER | State fidelity | Empty Friend Requests form. | Capture the delivery → analytics transition. |
| 28 | `17-socialnotificationdispatcher-socialgraph.png` | BLOCKER | State fidelity | Empty Friend Requests form. | Capture the notification-dispatcher → analytics transition. |
| 29 | `18-socialgraphanalytics-socialconnectionsco.png` | BLOCKER | State fidelity | Empty Friend Requests form. | Capture analytics → social-connections-score transition. |
| 30 | `r-02-before.png` | Medium | Redundant capture | Duplicate of `01-friend-request-form.png` (same empty form). Ambiguous filename. | Rename or merge with primary artifact. |
| 31 | `r-03-before.png` | Medium | Redundant capture | Duplicate of `01-friend-request-form.png`. | Same as #30. |

## Cross-PNG patterns (flow-level)

- **State-fidelity is the dominant failure.** 19 of 31 PNGs are one of three visually identical empty pages (Friend Requests form / My Connections / Social Graph Analytics) despite advertising eight orchestration phases, nine `when-emits` transitions, and six happy-path user states. A reviewer cannot verify any orchestrated business phase or any successful user outcome from this set.
- **Happy-path evidence is entirely missing.** There is no PNG showing: an accepted request, a rejected request, a populated feed, a zero-score item, a privacy-filtered item, a mutual connection, a connection-strength score, or a privacy-settings panel. Every one of those named captures points to an unrelated empty page.
- **Banner inconsistency (#24, #25).** Two PNGs (`13-` and `14-`) show a RED-tinted "No AI provider keys configured. Flows will use mock AI only." banner; every other PNG in the flow shows the usual amber "Missing provider keys: openai, gemini. DPO triples will be MONO_MODEL_CALIBRATION." banner. Both describe similar underlying conditions but use different colors and wording — a user seeing both would not understand they refer to the same misconfiguration.
- **The authored tenant UI is consistently good** where it exists: the Send Friend Request form has correct disabled-primary-when-empty behavior, the three empty pages use consistent "No X yet" phrasing in the same text color, and the sidebar navigation (RSVP, Attendance in the Engine section) matches the Event Attendance flow's layout exactly. This is the flow's strength.
- **Redundant `r-*-before.png` captures** add no independent UX value — both are duplicates of `01-friend-request-form.png`.
- **Persistent amber "Missing provider keys" banner** occupies the top 48px on 29 of 31 PNGs. In a friend-request / social-feed flow where tenants do not interact with provider keys directly, this banner is noise that compresses primary content.

## Business-logic phase coverage

Covered visually:
- Friend Request form: empty + filled (01, 02)
- Social Feed empty state (05)
- My Connections empty state (multiple PNGs)
- Social Graph Analytics empty state (08)

Not covered / misrepresented:
- **n1 FriendRequestProcessor orchestration entry** — empty form, no phase UI.
- **n2 FriendRequestResponder orchestration entry** — empty form.
- **n3 ConnectionGraphWriter orchestration entry** — empty connections page.
- **n4 FeedItemGenerator AI step** — empty connections page.
- **n5 FeedScorer AI step** — empty connections page.
- **n6 FeedDeliveryOrchestrator** — empty connections page.
- **n7 SocialNotificationDispatcher** — empty connections page.
- **n8 SocialGraphAnalytics observability** — empty analytics page.
- **All 9 cross-service `when-emits` transitions** — empty forms / empty connections.
- **Friend request accepted (03)** — empty form instead of accepted state.
- **Friend request rejected (04)** — empty form instead of rejected state.
- **Feed zero-score items (06)** — empty feed.
- **Feed privacy-filtered (07)** — empty feed.
- **Mutual connections (08)** — empty connections page.
- **Connection strength (09)** — empty connections page.
- **Privacy settings feed (10)** — empty feed page.
- **Social graph tenant isolation (11)** — empty form.
