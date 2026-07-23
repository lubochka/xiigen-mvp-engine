# Role Analysis — Batch 2 of ~10 (FLOW-06 → FLOW-10)

## Date: 2026-04-20 | Branch: claude/pensive-tereshkova-baf347
## Source: `business flows.zip` + inferred from topology + downstream flow context
## Scope constraint: per Luba, no more than 5 flows per run

---

## Zip-to-XIIGen mapping for batch 2

| Business doc | XIIGen flow |
|--------------|-------------|
| (no zip doc) | **FLOW-06 user-groups-communities** — inferred from slug + P1 |
| `07-friend-request-feed-integration` | **FLOW-07 friend-request-social-feed** (plus the post-publishing carryover from batch 1) |
| `06-marketplace-publishing` (+ `10-shops-modules` reference) | **FLOW-08 marketplace** (zip number 06 → XIIGen number 08) |
| `09-event-participation` (zip labels it "FLOW-08") | **FLOW-09 transactional-event-participation** |
| (no zip doc) | **FLOW-10 reviews-reputation** — inferred from slug + commerce-platform context |

Mapping drift continues: the zip's "FLOW-06" internal label matches XIIGen's FLOW-08; the zip's "FLOW-08" internal label matches XIIGen's FLOW-09. This batch honours the XIIGen numbering (which the ROLE-COVERAGE-MATRIX row order follows).

---

## FLOW-06 — User Groups & Communities (inferred)

**Business-logic summary (inferred):** Admin creates a group (public / private / invite-only). Users discover, request to join, post inside, moderate. Some groups gate by tier (free / premium / member-only). Groups become an audience target for posts (FLOW-07) and marketplace listings (FLOW-08 cooperator's "group-member-discount").

**Entry points (inferred):** `POST /groups` (creator), `POST /groups/:id/join` (applicant), `POST /groups/:id/posts` (member-poster), `GET /groups/:id` (reader — visibility depends on group privacy), `POST /groups/:id/moderate` (group admin).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** | Browses a public group via shared link | Group header + member count + "Sign in to join" + public posts only | ✅ YES — public read-only |
| **`public-marketplace-visitor`** | Arrives at a group that hosts marketplace listings | Same as anonymous + marketplace teaser cards (read-only) | ⚠️ near-merge with anonymous |
| **`tenant-user`** (non-member) | Discovers a group via feed or search | Group header + "Request to join" / "Join" button (depends on privacy) + post preview (only if public) | ✅ YES — non-member applicant |
| **`tenant-user`** (member) | Regular participation | Full posts + compose + reactions + member roster | ✅ YES — member primary |
| **`tenant-user`** (group admin / moderator) | Admin role granted per-group (not tenant-wide) | Member management + moderation queue + group settings + approve-join requests | ✅ YES — group admin |
| **`tenant-admin`** | Tenant-level admin viewing all groups in tenant | Group directory + compliance flags + creator identities | ✅ YES — tenant-level admin |
| **`freelancer`** | Member of a freelancer-specific group | Default member view + "Gig posts" sub-tab (freelancer-specific group feature) | ⚠️ sub-tab variant |
| **`platform-admin`** | Cross-tenant group oversight (rare — usually only for ToS violations) | Tenant attribution on every group + content-policy flags | ⚠️ moderation view |

### Cross-role surfaces

- **Group header card**: visible to all roles but with different action affordances (see above).
- **Compose post within group**: gated. Non-members see "Join to post"; members see composer; group-admin sees composer + "pin this post" + "announce" toggles.
- **Join-request queue**: visible only to group-admin; tenant-admin can audit but not approve/reject.

### Template implications

1. `GroupDetailPage` — role-aware via `<RoleScopedView>`. 6 branches: anonymous → join-gate, tenant-user non-member → apply-to-join, tenant-user member → compose + feed, group-admin → +moderation shelf, tenant-admin → +audit panel, platform-admin → +cross-tenant attribution.
2. `GroupDiscoveryPage` — anonymous sees public groups only; tenant-user sees public + invited-private-showing-in-their-network; group-admin sees "My groups" pinned.
3. **Group privacy × role interaction** — orthogonal to role but drives visibility: public groups render for all roles; private groups render only to members + group-admin + tenant-admin.

### Not-relevant roles

- `referral-user`, `event-organiser`, `business-partner`, `platform-support` — FLOW-06's business logic does not distinguish these. They merge into tenant-user member.

### ROLE-COVERAGE-MATRIX update for FLOW-06

anon ✅ · public-mkt ⚠️ · tenant-user ✅ · tenant-admin ✅ · referral — · freelancer ⚠️ (sub-tab) · biz-partner — · event-org — · platform-admin ⚠️ · platform-support —

(Previously 3 cells; now **6 active** cells.)

---

## FLOW-07 — Friend Request & Social Feed Integration

**Business-logic summary (from `business flows/07-friend-request-feed-integration.md`):** request lifecycle with rich integration weight calculation. After acceptance, 4 parallel services compute sub-weights (groups 20% + events 20% + purchases 15% + questionnaires 20% + base match 25%). Strong connections (>0.8) merge 20 posts from history into top 20% of each other's feeds. Connection strength evolves over time based on interaction frequency.

**Entry points:** `POST /relations/connect` (requester), `POST /relations/:id/accept` or `/decline` (recipient), `GET /feed` (any connected user — feed is role-mixed).

**Note:** this flow absorbs the post-publishing content from batch-1's zip doc 04 as well (post composer + distribution).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** | Arrives at a profile's public posts page via share link | Read-only post cards + "Sign in to follow" CTA + blurred-out restricted posts | ✅ YES — public profile |
| **`public-marketplace-visitor`** | Arrives at a post flagged `public: true` | Full post + "Sign in to comment/like" | ✅ YES — public post share page |
| **`tenant-user`** (requester) | Viewing a candidate's profile | "Add friend" button + match-grade indicator + pre-calculated integration-weight preview | ✅ YES — pre-connection view |
| **`tenant-user`** (recipient) | Incoming request card in notifications | Match summary (shared groups/events/questionnaires) + Accept/Decline | ✅ YES — incoming request |
| **`tenant-user`** (post author) | Publishing a post | Composer + audience preview + post-publish distribution report | ✅ YES — author |
| **`tenant-user`** (post reader) | Post card in feed | Like / comment / share + connection-strength badge | ✅ YES — reader default |
| **`freelancer`** (post author) | Publishing a gig post | Composer with extra fields: service category, rate, availability | ✅ YES — freelancer composer |
| **`business-partner`** (post author) | Publishing a hiring/sponsorship post | Composer with extra fields: partnership type, budget range | ✅ YES — business composer |
| **`tenant-admin`** | Moderating flagged posts + friend-request abuse | Moderation queue + spam-pattern flags + "disconnect both parties" action | ✅ YES — moderation |
| **`platform-admin`** | Cross-tenant content policy + NLP category audits | Same as tenant-admin + cross-tenant aggregation | ✅ YES — platform moderation |

### Cross-role surfaces

- **Profile page**: anonymous sees only public posts; tenant-user (non-connected) sees preview + "Add friend"; tenant-user (connected) sees full timeline; group-shared connections see "also in X groups" bridge.
- **Feed**: every authenticated role sees the feed but the ranking inputs differ — freelancer's feed skews toward gig-related posts; business-partner's feed toward hiring posts. No extra UI needed beyond correctly-tagged post source; the existing ranking algorithm handles it.
- **Connection-strength badge** — displayed on every connected user's post card. Same widget, role-agnostic.

### Template implications

1. `ProfilePage` (public facing) — 4 role templates: anonymous / tenant-user non-connected / tenant-user connected / tenant-admin moderation view.
2. `PostComposer` — 3 variants via `<RoleScopedView>`: default / freelancer / business-partner.
3. `PublicPostSharePage` — new route for anonymous share-link landings (carried from batch-1 post-publishing analysis).
4. `ModerationQueue` at `/admin/moderation/posts` — tenant-admin + platform-admin variants.

### Not-relevant roles

- `referral-user` merges with tenant-user — the referral fact doesn't change post visibility or friend-request semantics.
- `event-organiser` is a role-tag used by FLOW-03/04, not by the friend-request flow itself.

### ROLE-COVERAGE-MATRIX update for FLOW-07

anon ✅ · public-mkt ⚠️ · tenant-user ✅ · tenant-admin ✅ · referral — · freelancer ✅ · biz-partner ✅ · event-org — · platform-admin ⚠️ · platform-support —

(Previously 2 cells; now **7 active** cells — major upgrade.)

---

## FLOW-08 — Marketplace Publishing & Distribution

**Business-logic summary (from `business flows/06-marketplace-publishing.md`):** seller creates listing → 3 parallel processes: analytics (buyer persona), post-service (auto-generated marketplace post), cooperator-service (synergy-matched partners). Multi-audience distribution: friends (purchase-affinity scored) + groups (marketplace-enabled) + cooperators (partnership cards). Pricing tiers: friend discount 5-10%, group member 10-15%, cooperator bundle custom.

**Entry points:** `POST /marketplace/items` (seller), `GET /marketplace` (browser — role-aware), `GET /marketplace/items/:id` (detail — role-aware), `POST /marketplace/items/:id/purchase` (buyer), `POST /marketplace/items/:id/partnership` (cooperator).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** | Browsing public marketplace | Listing grid + detail page read-only + "Sign in to purchase" CTA + no pricing-tier logic visible | ✅ YES — public marketplace browser |
| **`public-marketplace-visitor`** | Arriving via a specific marketplace-listing shared link | Full listing detail + marketing copy + "Sign in to purchase or explore bundles" CTA | ✅ YES — public detail landing |
| **`tenant-user`** (buyer) | Normal authenticated browsing | Listing cards + personalised "friend discount" tier shown + purchase CTA | ✅ YES — buyer primary |
| **`tenant-user`** (group member) | Listing auto-posted into a marketplace-enabled group they're in | "Member discount 10-15%" badge + group-member checkout path | ⚠️ sub-state (not a separate page, a pricing badge) |
| **`tenant-user`** (seller) | Authoring listing + managing inventory | Listing editor + inventory counter + pricing tier editor + cooperator match list | ✅ YES — seller primary |
| **`referral-user`** | Browsing with referral relationship to seller | Additional "referrer reward on purchase" banner | ⚠️ banner-only variant |
| **`freelancer`** | Listing services (not just physical goods) | Editor has service-specific fields (hourly rate, availability, portfolio link); browse view shows service-specific filters | ✅ YES — service-listing editor |
| **`business-partner`** (cooperator) | Seeing a listing flagged as cooperator-match | "Partnership Opportunity" card with synergy score + audience overlap + "Propose bundle" / "Cross-promote" actions | ✅ YES — cooperator view |
| **`tenant-admin`** | Moderating listings + fraud detection + enforcing content policy | Listing moderation queue + seller verification status + flagged-content actions | ✅ YES — admin moderation |
| **`platform-admin`** | Cross-tenant marketplace oversight + platform-fee reconciliation | Cross-tenant listing aggregate + fee reports + seller-trust scoring | ✅ YES — platform oversight |
| **`platform-support`** | Resolving a listing dispute (buyer complaint, refund claim) | Read-only listing history + transaction trace + escalation actions | ✅ YES — support read-only |

### Cross-role surfaces

- **Listing detail page** is the densest role-template target so far — **8 primary branches**: anonymous, public-mkt, tenant-user, tenant-user-group-member (sub-state), seller, freelancer (service-listing), business-partner (cooperator), tenant-admin (moderation).
- **Cooperator partnership card** is invisible to everyone except `business-partner` — it's a whole rendered component that appears only when the listing has cooperator-match status AND the viewer is a matched cooperator.
- **Pricing tier visibility**: public-mkt sees MSRP only; tenant-user sees MSRP + their personalised friend-discount; group member sees MSRP + friend + group discount; cooperator sees MSRP + cooperator bundle custom quote.

### Template implications

1. `MarketplaceListingDetailPage` — extend the FLOW-08 EventDiscoveryPage pilot pattern to 8 branches.
2. `MarketplaceSellerEditorPage` — role-gated (tenant-user = basic editor, freelancer = service-specific editor).
3. `CooperatorPartnershipCard` — new component, appears conditionally when role = business-partner AND synergy-score ≥ threshold.
4. `MarketplaceModerationQueuePage` at `/admin/marketplace/moderation` — tenant-admin + platform-admin variants.

### Not-relevant roles

- `event-organiser` — doesn't interact with the marketplace flow in its primary business logic. May overlap at FLOW-03 event + FLOW-08 ticketing intersection but that lives in FLOW-09.

### ROLE-COVERAGE-MATRIX update for FLOW-08

anon ✅ · public-mkt ✅ · tenant-user ✅ · tenant-admin ✅ · referral ⚠️ (banner) · freelancer ✅ · biz-partner ✅ · event-org — · platform-admin ✅ · platform-support ✅

(Previously 7 cells; now **9 active** cells. Densest role target in the fleet; upgrades the existing marketplace pilot to a full rollout target.)

---

## FLOW-09 — Transactional Event Participation

**Business-logic summary (from `business flows/09-event-participation.md`):** payment + ticketing + calendar + progressive reminders + social integration among co-attendees. 14 services, 145 steps. Time-evolving connection weights: base → 1.5× at T-7 → 2× at T-1 day → 3× on event day → decay back to base by T+7 with permanent +0.05 bonus for all co-attendees.

**Entry points:** `POST /events/:id/participate` (attendee — redirects to `/payments/process` for paid), `GET /tickets/:id` (holder), `POST /events/:id/checkin` (organiser at door), `POST /events/:id/waitlist` (over-capacity applicant).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** | Clicks "participate" on an event page (FLOW-03) — needs to authenticate first | Redirect to `/register?return=/events/:id/participate` with event-context preview | ✅ YES — pre-auth redirect page |
| **`tenant-user`** (attendee) | Completing payment → receiving ticket → adding to calendar → getting reminders | Payment form → ticket QR code + Apple Wallet + calendar link + reminder opt-in | ✅ YES — participation primary |
| **`tenant-user`** (ticket holder pre-event) | Opens their ticket | QR code + event details + "Add to calendar" + "Share with friend" (referral trigger for FLOW-04 RSVP boost) | ✅ YES — ticket wallet |
| **`tenant-user`** (attendee day-of) | At the door with phone | Large QR + offline-fallback ticket number + "Check-in status" indicator | ✅ YES — day-of QR view |
| **`referral-user`** | Arrives via shared "I'm going" link → completes participation | Referrer acknowledgement banner + standard participation flow | ⚠️ banner variant |
| **`event-organiser`** | Day-of check-in scanner | Scanner UI + attendee status list (checked-in count, waitlist promotions) + walk-up registration form | ✅ YES — organiser scanner |
| **`event-organiser`** (pre-event) | Managing capacity + waitlist + payments | Dashboard: paid / pending / refund-requested / waitlist + bulk actions | ✅ YES — organiser dashboard |
| **`tenant-admin`** | Financial reconciliation + refund approvals | Revenue view + refund queue + payment-gateway incidents | ✅ YES — admin financial |
| **`freelancer`** | Attendee offering services at the event (FLOW-03 extension) | Standard ticket + "I'm offering services here" badge on profile | ⚠️ badge-only |
| **`business-partner`** | Attendee sponsoring the event (FLOW-03 extension) | Standard ticket + "Sponsor" badge + sponsor-perks CTA | ⚠️ badge-only |
| **`platform-admin`** | Payment-compliance + PCI oversight + cross-tenant ticket fraud detection | Cross-tenant transaction log + fraud flags + compliance audit | ✅ YES — platform finance |
| **`platform-support`** | Resolving participant disputes (lost ticket, refund failures) | Read-only ticket history + escalation path + refund override | ✅ YES — support read-only |

### Cross-role surfaces

- **Ticket page** (`/tickets/:id`) — the SAME ticket URL renders 4 distinct templates: the holder (full details), the organiser scanning at door (QR-only view), the tenant-admin auditor (metadata + payment trace), and the support staff (read-only history).
- **Payment confirmation** — payment-form is identical for all attendee roles; the "after payment" state differs (organiser sees capacity-ticker update in their dashboard).

### Template implications

1. `TicketDetailPage` — 4 role templates (holder / organiser scan / admin audit / support read-only).
2. `CheckInScannerPage` at `/events/:id/checkin` — event-organiser + tenant-admin only; others redirect.
3. `ParticipationRedirectPage` — new, for pre-auth anonymous flows.
4. `RefundRequestQueue` at `/admin/refunds` — tenant-admin + platform-admin variants.

### Not-relevant roles

- `public-marketplace-visitor` — this flow assumes the user reached FLOW-03 event detail first; the marketplace-public path lives there, not here.

### ROLE-COVERAGE-MATRIX update for FLOW-09

anon ✅ · public-mkt — · tenant-user ✅ · tenant-admin ✅ · referral ⚠️ (banner) · freelancer ⚠️ (badge) · biz-partner ⚠️ (badge) · event-org ✅ · platform-admin ✅ · platform-support ✅

(Previously 3 cells; now **8 active** cells.)

---

## FLOW-10 — Reviews & Reputation (inferred)

**Business-logic summary (inferred from slug + commerce-platform context in `10-shops-modules.md` §2.1):** buyers/participants leave reviews on marketplace listings, service providers, events, and other users. Aggregate reputation scores roll up per user/listing. Verified-purchase flag distinguishes credible reviews. Admin moderation for spam / abusive content. Public reviews are discoverable via search and contribute to SEO.

**Entry points (inferred):** `POST /reviews` (authenticated buyer/attendee), `GET /reviews/:entityId` (public read), `POST /reviews/:id/flag` (any authenticated user), `POST /reviews/:id/moderate` (admin).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** | Reads reviews on a public marketplace listing or public business profile | Review list + star rating aggregate + "Sign in to write a review" CTA (no write access) | ✅ YES — public read |
| **`public-marketplace-visitor`** | Arrives via shared review permalink | Single-review focus + full text + "Sign in to reply or flag" | ✅ YES — permalink landing |
| **`tenant-user`** (reviewer with verified purchase) | Posts a review after a purchase or event | Compose form with star ratings + 4 sub-criteria (per FLOW-05 pattern) + "Verified purchase" badge auto-applied | ✅ YES — authenticated author |
| **`tenant-user`** (reviewer without purchase / general commenter) | Wants to leave a non-verified review | Same form but no "Verified" badge + clear disclaimer | ⚠️ copy variant |
| **`tenant-user`** (reviewee — the subject of the review) | Sees someone review their own listing / service | Review + "Reply publicly" CTA + "Flag as inappropriate" action | ✅ YES — reviewee response |
| **`freelancer`** (reviewee) | Reviews on freelancer's own service offerings | Default reviewee view + "Add to portfolio highlights" action (carryover from FLOW-05 batch-1 analysis) | ⚠️ portfolio-action variant |
| **`business-partner`** | Reviews on a cooperator's product | Standard review read + "Share to my network" CTA | ⚠️ share-action variant |
| **`tenant-admin`** | Moderating flagged reviews + enforcing review-authenticity rules | Moderation queue + evidence viewer + "Remove / Hide / Warn" actions + bulk-delete for spam waves | ✅ YES — admin moderation |
| **`platform-admin`** | Cross-tenant reputation abuse (review bombing, reputation-as-a-service fraud) | Cross-tenant aggregation + pattern detection + global sanctions | ✅ YES — platform oversight |
| **`platform-support`** | Dispute resolution (reviewer claims review was wrongly removed) | Read-only review history + removal rationale + restoration path | ✅ YES — support read-only |

### Cross-role surfaces

- **Review card** renders to all roles. The available *actions* on the card are role-gated: flag (any authenticated), reply (reviewee + reviewer), remove (admin), escalate (platform-support).
- **Reputation score badge** on profile/listing pages — visible to all but with different drill-down: tenant-user sees aggregate + histogram; tenant-admin sees aggregate + breakdown by review source + trust score.

### Template implications

1. `ReviewsPage` at `/reviews/:entityId` — role-aware via `<RoleScopedView>` with 6 branches (anonymous / tenant-user author / reviewee / admin / support / platform-admin).
2. `ReviewComposer` — role-gated: verified-purchase path (auto-badge) vs general commenter path (disclaimer). Could use the existing P5 pattern.
3. `ReviewModerationQueue` — admin + platform-admin variants.

### Not-relevant roles

- `referral-user`, `event-organiser` — FLOW-10's business logic doesn't differentiate these. They merge into tenant-user.

### ROLE-COVERAGE-MATRIX update for FLOW-10

anon ✅ · public-mkt ✅ · tenant-user ✅ · tenant-admin ✅ · referral — · freelancer ⚠️ (portfolio) · biz-partner ⚠️ (share) · event-org — · platform-admin ✅ · platform-support ✅

(Previously 6 cells; now **7 active** cells.)

---

## Consolidated role signals across batch 2

| Role | Flows in batch 2 needing it | Notes |
|------|:---------------------------:|-------|
| `anonymous` | FLOW-06, -07, -08, -09, -10 | All 5 flows have some public surface |
| `public-marketplace-visitor` | FLOW-08, -10 (direct); -06, -07 (share-links) | Marketplace + review surfaces confirmed highest-priority |
| `tenant-user` | All 5 | Primary authenticated persona everywhere |
| `tenant-admin` | All 5 | Every flow in batch 2 has a moderation surface |
| `referral-user` | FLOW-08 ⚠️, -09 ⚠️ | Banner-only variants, not full templates |
| `freelancer` | FLOW-06 ⚠️, -07 ✅, -08 ✅, -09 ⚠️, -10 ⚠️ | Most relevant in FLOW-07 composer + FLOW-08 service-listing |
| `business-partner` | FLOW-07 ✅, -08 ✅, -09 ⚠️, -10 ⚠️ | Cooperator concept in FLOW-08 is a full-template target |
| `event-organiser` | FLOW-09 ✅ | Scanner + dashboard views |
| `platform-admin` | FLOW-06 ⚠️, -07 ⚠️, -08 ✅, -09 ✅, -10 ✅ | Cross-tenant moderation + compliance |
| `platform-support` | FLOW-08, -09, -10 | Dispute resolution consistently appears |

### Biggest finding

**FLOW-08 marketplace-listing detail page has 8 primary role templates** — matches the FLOW-03 event-detail density from batch 1. Together these two pages are the two densest role-template surfaces in the fleet and should be the next RoleScopedView rollouts.

FLOW-09 transactional-event-participation is next most dense (7+ templates with its ticket page supporting 4 branches alone).

### Consolidated batch 1 + 2 density (per flow)

| Flow | Active role cells | Density rank |
|------|------------------:|-------------:|
| FLOW-08 marketplace | 9 | #1 |
| FLOW-09 transactional-event-participation | 8 | #2 |
| FLOW-03 event-management | 8 | #2 tied |
| FLOW-01 user-registration | 7 | #4 |
| FLOW-07 friend-request-social-feed | 7 | #4 tied |
| FLOW-10 reviews-reputation | 7 | #4 tied |
| FLOW-06 user-groups-communities | 6 | #7 |
| FLOW-04 event-attendance | 5 | #8 |
| FLOW-02 profile-enrichment | 4 | #9 |
| FLOW-05 completion-gamification | 3 | #10 |

**Fleet-level rollout priority** (top 5 flows to RoleScopedView-ify first): FLOW-08, FLOW-03, FLOW-09, FLOW-07, FLOW-01.

---

## Next batch

Batch 3 target: **FLOW-11 → FLOW-15**. These shift from social-marketplace into more engine-internal territory (schema-registry-dag, subscription-billing, data-warehouse-analytics, etl-data-integration, saas-multi-tenancy). Expect lower role density — most will be tenant-admin + platform-admin heavy.

Produces: `docs/design-reviews/ROLE-ANALYSIS-BATCH-03.md` on the next run.

---

## Footer

Produces artifact at: `docs/design-reviews/ROLE-ANALYSIS-BATCH-02.md`.
Companion: `docs/design-reviews/ROLE-COVERAGE-MATRIX.md` (matrix rows 06..10 updated).
Prior batch: `docs/design-reviews/ROLE-ANALYSIS-BATCH-01.md`.
Fleet verdict context: `docs/design-reviews/FLEET-VALIDATION-v2.md`.
