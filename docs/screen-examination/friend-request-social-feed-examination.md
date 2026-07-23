# Flow UI examination — FLOW-07 friend-request-social-feed

## Date: 2026-04-20 · Run: RUN-57 · Batch: C (Grammar 3 Card List)

## One-sentence spec (F1)
> When a user interacts with the XIIGen social platform, route them through the
> active A/B experiment, record the interaction to the social feed, and track
> the experiment assignment for analysis.

## Roles (F3)
- **tenant-user** — primary; posts content, sends/accepts friend requests, views feed
- **tenant-admin** — community moderator (overlap with FLOW-24 moderation)
- **anonymous** — no surface; private social graph
- **platform-admin** — experiment config + feed algorithm tuning

## Grammar
**G3 Card List with State Badge** — feed is infinite-scroll card list; friend requests are a card list with Pending / Accept / Decline badges.
**Reference:** Twitter/X, LinkedIn feed, Facebook feed + connections.

## F4 Business doc
`business_flows.zip / 04-post-publishing.md` + `07-friend-request-feed-integration.md`

## Classification
- **Q1 CRUD?** 🟡 Likely — existing pages (ConnectionsPage, FriendRequestPage, SocialFeedPage, SocialGraphPage). Needs PNG inspection.
- **Q2 Error/empty?** Feed with no posts needs teaching copy ("Follow people to fill your feed").
- **Q3 Engineering leak?** A/B experiment IDs must not appear in UI.
- **Q4 Role-correct?** ✅ 4 pages cover the main surfaces.

**Primary finding:** NEEDS_EMPTY_STATE (P1) for feed + friend-requests; likely NEEDS_PURPOSE_BUILT_UI for feed if still CRUD.

## 31 existing PNGs
One of the densest PNG directories. Needs sweep.

## Planned fixes
- Feed card format: author avatar + name + timestamp (top-left), body, like/comment/share row (bottom)
- Friend-request card with Accept / Decline inline actions + mutual-connections line
- Empty feed: "Follow people to see their posts here"

## Phase 3 mobility/auth visual examination - 2026-05-03

### Scope
- FLOW-07 role matrix: 7 roles x 3 Playwright projects = 21 PNGs.
- Screenshot root: `docs/e2e-snapshots/visual-audit/{chromium-desktop,chromium-tablet,chromium-mobile}/friend-request-social-feed/primary-{role}.png`.
- Roles examined: anonymous, public-marketplace-visitor, tenant-user, freelancer, business-partner, tenant-admin, platform-admin.
- Primary desktop spot-checks opened after recapture: tenant-user, freelancer, business-partner.

### First-pass blocked findings
- Axis A BLOCK: freelancer and business-partner rendered the XIIGen engine sidebar even though the FLOW-07 role matrix treats them as module-facing social/feed operators.
- Axis E BLOCK risk: tenant-user seed posts contained engineering/product-build language (`adaptive-rag`, topology canvas, build-gate, CRUD) instead of social-feed copy.

### Fixes applied
- `client/src/App.tsx`: added freelancer and business-partner to the consumer/module shell set so they render without the engine admin sidebar.
- `client/src/pages/friend-request-social-feed/SocialFeedPage.tsx`: replaced technical seed-post copy with plain social/community copy.
- `client/e2e/friend-request-social-feed-role-matrix.spec.ts`: added screenshot-time assertions for:
  - no visible plain-language blocklist terms;
  - no `Engine Client` sidebar for anonymous, public-marketplace-visitor, tenant-user, freelancer, or business-partner.

### Verification evidence
- `client npx tsc --noEmit`: passed.
- `client npx playwright test e2e/friend-request-social-feed-role-matrix.spec.ts --workers=1` with `VITE_PORT=5180`, `CLIENT_URL=http://localhost:5180`, `VITE_API_URL=http://localhost:33001`: 21 passed.
- PNG sanity: 21 role-matrix PNGs present, 0 under 5 KB, minimum size 23490 bytes.

### Axis verdicts
- Axis A external/internal framing: PASS. Module-facing roles have no engine sidebar; tenant-admin and platform-admin retain admin framing.
- Axis B role branching: PASS. Each role lands on its role-specific FLOW-07 surface.
- Axis C language: PASS for the English role matrix captured in this phase.
- Axis D business/state: PASS. Tenant-user populated feed renders meaningful cards; freelancer/business-partner render meaningful composer/empty states.
- Axis E plain language: PASS. Playwright visible-text blocklist found zero leaks across all 21 captures.
- Axis F UX layers: PASS for phase-gate purposes. No CRUD table, no topology leak, no engine chrome on module-facing roles.
- Axis G follow-ups: none for Phase 3.

### Final verdict
PASS. Phase 3 visual examination has no remaining BLOCK findings after the recapture.
