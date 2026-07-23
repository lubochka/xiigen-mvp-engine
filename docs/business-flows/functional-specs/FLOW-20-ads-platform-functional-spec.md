# Functional Spec — FLOW-20 Ads Platform + Privacy Settings

**Grammar:** G3 Card list (feed + sponsored slots) + G6 Dashboard (advertiser console) + G7 Settings tabs (user privacy)
**Primary role tiers:** PUBLIC, TENANT_CONSUMER, TENANT_OPS (advertiser), PLATFORM_OPS
**Current state:** **Half-built** — 4 services running the consent enforcer; **`/settings/privacy` route doesn't exist** — users can't reach the UI to manage their consent
**Primary unblock:** add the privacy-settings route + page

---

## 1. Summary

Three audiences touch this flow. **End users** need a trustworthy privacy-settings page where they can see and change what data is used for ad personalisation. **Advertisers** need a console where they brief a campaign, upload creative, and watch spend + delivery + audience response. **Platform admins** need an oversight panel for fraud, policy violations, and platform-level metrics. Today only the consent-enforcement pipeline runs on the server — the user-facing consent UI, the advertiser console, and the admin oversight panel are all absent.

---

## 2. Roles & modes

| Role | Route prefix | What they do |
|---|---|---|
| **TENANT_CONSUMER** (end user) | `/settings/privacy` | See what data is used, grant/revoke consent per category, see ad-interaction history |
| **TENANT_OPS** (advertiser admin) | `/admin/ads/` | Brief campaigns, upload creative, set budget + audience, watch delivery |
| **PLATFORM_OPS** | `/admin/engine/ads/` | Review policy violations, ban/unban advertisers, see platform revenue |
| **PUBLIC** | `/` feed | Sees sponsored slots in the feed with clear "Sponsored" label + why-am-I-seeing-this link |

**Modes:**
- **First-run** (user has never seen the privacy page): show a plain-English intro before the toggles.
- **Returning** (user has seen it before): go straight to the toggles; show a "last changed" line.
- **Under-13** / **EU resident** / **California resident**: jurisdiction-specific banners + legal defaults (never opt-in for under-13; strict opt-in-only for EU).
- **Desktop** / **mobile**: settings-tabs collapse to a single-column accordion on narrow viewports.

---

## 3. User stories

### Story 3.1 — End user reviews and changes their privacy settings *(TENANT_CONSUMER, G7)*

**Screens:** Profile menu → `/settings/privacy` → confirm modal → success toast.

**Trigger:** user clicks "Privacy" in the profile menu, or lands from a "Manage your preferences" link in a cookie banner.

**Happy path:**
1. User clicks "Privacy" in the profile menu.
2. `/settings/privacy` loads with the left-rail settings-tabs layout. "Privacy" is the active tab.
3. Right pane shows five sections: *What we use · What we share · Ad personalisation · Ad interaction history · Export my data*.
4. User toggles "Ad personalisation" off.
5. Confirm modal: *"Turn off ad personalisation? You'll still see ads — they just won't be tailored to you. Change back anytime."* with **Turn off** (primary, destructive-neutral colour) and **Cancel** (secondary).
6. On confirm: toggle flips, success toast: *"Ad personalisation off. Applies within 5 minutes."* (with undo affordance for 10 seconds).
7. Page shows a new "Last changed just now" line under the toggle.

**UI elements:**
- Left rail: settings tabs (General / Members / Billing / Integrations / Advanced / **Privacy** / Notifications / Language).
- Right pane: vertically-stacked cards, one per section. Each card has a short title, a one-line explanation *in plain language* (no legal jargon), the control (toggle / dropdown / chips), and a "Last changed" timestamp.
- Primary action colour: blue. Destructive-neutral (turn off): amber. Destructive-severe (delete data): red.
- No dark patterns — every toggle is binary, no pre-checked off-by-default that the user has to hunt for.

### Story 3.2 — End user requests a data export *(TENANT_CONSUMER)*

**Screens:** `/settings/privacy` → request modal → email confirmation → download link (via email).

**Trigger:** user clicks "Export my data" at the bottom of the Privacy tab.

**Happy path:**
1. Button opens modal: *"We'll put together a ZIP of your data — profile, posts, interactions, ad preferences — and email you a download link within 24 hours."*
2. User clicks **Start export**. Modal closes; toast: *"Export requested. We'll email ben@example.com when it's ready."*
3. A job runs server-side (FLOW-20 export service).
4. On completion, user receives an email with a signed-URL download link (48-hour expiry).
5. User can see request history on the Privacy tab: *"Export requested Apr 22 · ready · download"* (if still within the 48 hours) or *"expired"*.

**UI elements:** request button + history list with per-request state badge.

### Story 3.3 — End user revokes consent and sees a feed with no sponsored slots *(TENANT_CONSUMER + PUBLIC)*

**Screens:** `/settings/privacy` → save → `/feed`

**Trigger:** user revokes all ad-personalisation consent.

**Happy path:**
1. User flips all consent toggles off on the Privacy tab, saves.
2. Within 5 minutes, the feed server-side starts treating this user as "no personalisation".
3. When the user returns to the feed, they still see sponsored slots **but** they're un-personalised (rotating through a generic advertiser pool).
4. A subtle "Why am I seeing this?" link on each sponsored card opens a popover: *"This is a general sponsored slot — we're not targeting it to you based on your interests."*

**UI elements:** Sponsored slots have the "Sponsored" badge top-right, identical card visual to non-sponsored content, a dotted or subtle border distinction. Pro-max rule: never hide that a slot is sponsored.

### Story 3.4 — Advertiser briefs a new campaign *(TENANT_OPS, G6 dashboard with G5 create-campaign wizard)*

**Screens:** `/admin/ads/` dashboard → **New campaign** CTA → 4-step wizard (*Audience → Creative → Budget → Review*) → active campaign card.

**Trigger:** advertiser clicks **New campaign**.

**Happy path:**
1. Dashboard shows card list of existing campaigns with state badges (Draft / Pending review / Active / Paused / Completed / Rejected).
2. Click **New campaign** → wizard step 1.
3. **Step 1 — Audience:** define target (region, age, interests, exclusions). Live estimate of reach on the right: *"~124,000 people match this audience."*
4. **Step 2 — Creative:** upload image + headline + body + CTA. Right pane: **live preview** showing the ad in its sponsored-slot form.
5. **Step 3 — Budget:** set daily cap + total cap + dates + bid strategy.
6. **Step 4 — Review:** summary of everything + *"Campaigns go through a policy review within 24 hours."*
7. Submit → campaign card appears in dashboard with state "Pending review". Email notification promised.

**UI elements:** per-step breadcrumb, live reach estimate, live preview pane, summary review cards. No engineering jargon ("audience segment ID", "budget bucket" — never visible to user).

### Story 3.5 — Platform admin reviews a flagged advertiser campaign *(PLATFORM_OPS, G2 verdict grid)*

**Screens:** `/admin/engine/ads/review-queue` (verdict grid) → campaign detail → approve / reject / request changes.

**Trigger:** a campaign triggered automated policy checks or was reported by a user.

**Happy path:**
1. `/admin/engine/ads/review-queue` renders a Grammar-2 verdict grid: rows = flagged campaigns, columns = each policy check's verdict (Content safety, Brand safety, Audience targeting, Budget legitimacy, Creative authenticity).
2. Cells are colour + icon + label ("Pass / Concern / Fail / Needs review"). Click a cell for the specific evidence.
3. Admin clicks a campaign row → detail view: full creative + audience + budget + flag reasons + user reports.
4. Admin's three actions: **Approve** / **Reject with reason** / **Request changes from advertiser**.
5. On action: verdict logged, advertiser notified, campaign moves out of review queue.

**UI elements:** verdict grid with colour + text + icon (never colour-only per pro-max rule), per-cell evidence popover, action bar at the bottom of the detail view.

---

## 4. Screen structure & UI elements

### 4.1 `/settings/privacy` (G7 Settings tabs)

**Layout:**
- **Header:** breadcrumb *Profile › Privacy*
- **Left rail:** tab list with icons. Privacy tab is the active one. Max 8 tabs; collapse to accordion under 640px viewport.
- **Right pane:** scrollable. Vertically-stacked section cards (not nested cards — see anti-patterns).
- **Footer:** link to full privacy policy (external).

**Sections** (in this order — hierarchy matters):
1. **What we use** — data categories (profile, interactions, location, device). Each a toggle.
2. **What we share** — third parties (ad network, analytics, email provider). Each a toggle.
3. **Ad personalisation** — single master toggle + per-category granular toggles (interests, demographics, behaviour).
4. **Ad interaction history** — a list of recent sponsored-slot interactions (show / click / dismiss) with per-row remove action.
5. **Export my data** — button + history list.
6. **Danger zone** (at the very bottom, visually separated by a horizontal rule and a red-tinted border): *Delete all my data*. Triple confirm required.

**Empty states:** *Ad interaction history* empty: *"You haven't interacted with any sponsored content yet."* Never a CRUD table showing 0 rows.

**Loading:** skeleton for the card grid while fetching (no spinner alone — skeleton plus a fade-in on data arrival).

**Error states:** if the save fails, inline banner above the section: *"Couldn't save that change — check your connection and try again."* with a **Retry** button. Never a full-page error replacing the settings view.

### 4.2 `/admin/ads/` (Advertiser console, G6 dashboard + G3 campaign card list)

**Layout:**
- **Header:** "Campaigns" title + **New campaign** CTA (primary, top-right).
- **Above the fold, left:** metric tiles (Active campaigns, Spend this month, Impressions, Click-through rate).
- **Above the fold, right:** spend-over-time chart (last 30 days).
- **Below the fold:** filter bar (state, date range) + card list of campaigns.

**Campaign card:** thumbnail creative + title + state badge + budget-vs-spent progress bar + primary action (Edit / View / Duplicate).

**Empty state:** *"No campaigns yet — brief your first one."* with illustration + CTA. Critical: never show a sample campaign with fake numbers that could be mistaken for real.

### 4.3 `/admin/engine/ads/review-queue` (Platform ops, G2 verdict grid)

**Layout:**
- **Header:** "Review queue" + count of pending.
- **Verdict grid:** rows = campaigns, columns = policy checks, cells = Pass / Concern / Fail / Needs review.
- **Side rail:** filter by flag type, date range, advertiser, region.

**Empty state:** *"Nothing to review — nice."* Friendly, not smug.

### 4.4 Sponsored slots in the feed (G3 card list, inline)

Identical visual weight to organic content. Badge "Sponsored" top-right. Dotted or subtle border. "Why am I seeing this?" link opens a popover that names the targeting reason in plain language.

---

## 5. Edge cases

| Case | Expected behaviour |
|---|---|
| User toggles off ad personalisation then immediately returns to the feed | Feed personalisation flag propagates within 5 min; the feed shows generic sponsored slots during that window, not no slots at all (avoids confusion). |
| User has already revoked consent via a cookie banner in a different browser | `/settings/privacy` reflects the aggregate revoked state on all devices within the TTL. |
| Advertiser uploads a creative that fails automated policy checks | Upload succeeds; campaign enters "Rejected — policy" state; detail view shows the specific check that failed + a "Request human review" button. |
| Two admins approve the same flagged campaign in the same second | Second admin's action is a no-op; both see the "already approved by {admin}" banner. |
| User under 13 loads `/settings/privacy` | All ad-personalisation toggles disabled and locked in the off position with a note: *"Personalised ads are not available for accounts under 13."* |
| EU user loads the feed with no consent given | Sponsored slots are contextual (non-personalised) only. A one-time banner asks for opt-in; dismissing it keeps contextual-only mode. |

---

## 6. Problematic states (visual description to the user)

| State | What the user sees |
|---|---|
| **Unauthenticated** on `/settings/privacy` | Redirect to `/login?return=/settings/privacy`. Not a "401 Unauthorised" screen. |
| **Permission denied** (end user on `/admin/ads/`) | `/404` with friendly copy: *"This page isn't for your account type."* Not a raw 403. |
| **Session expired mid-save** | Full-screen modal: *"Your session expired — sign in again to save this change."* with **Sign in** button that preserves the partial form state and redirects back to the privacy page with the pending change re-applied. |
| **Network offline on save** | Inline banner above the affected section: *"Can't save right now — we'll try again when you're back online."* Toggle stays in its new position visually but a yellow dot marks it as "pending sync". Auto-retry on reconnect. |
| **Rate limited** (user flipped 50 toggles in 10 seconds) | Soft: inline banner: *"Slow down — give us a second to catch up."* with a countdown. Not a 429 page. |
| **Server error (5xx) on load** | Card placeholders stay visible; top banner: *"Something's off on our side — try again in a minute. Your saved changes are safe."* with **Retry** button. |
| **Export link expired** | History list shows *"expired"* with a **Request again** link. No silent broken link. |
| **Validation error** (advertiser uploads over-size image) | Inline field error under the upload zone: *"Max 5 MB — this is 7.3 MB."* with **Compress & retry** suggestion. |
| **Empty review queue** (admin) | *"Nothing to review — nice."* with illustration. |
| **Conflict** (advertiser edits a campaign another admin is also editing) | Save button disabled with tooltip: *"Another teammate is editing this campaign — reloading will pull their changes."* with **Reload** link. |
| **Stale data** (user opened privacy page in a tab 30 min ago, settings changed on another device) | Top banner: *"Your settings changed on another device — **Reload** to see the latest."* Refresh-on-focus also auto-reloads after 5 min idle. |
| **Danger-zone action** (delete all my data) | Triple confirm: modal 1 *"This deletes everything permanently"* → modal 2 *"Type DELETE to confirm"* → email verification step → final success + signout. Not recoverable. |
| **Third-party provider down** (advertiser's payment provider unreachable) | Campaign submit doesn't block; campaign enters state *"Submitted — awaiting payment verification"*. Advertiser sees a yellow banner explaining the delay, not an error. |

---

## 7. Visual direction

**Grammar:** G7 settings tabs (end user) + G6 dashboard (advertiser) + G2 verdict grid (admin). Never mix grammars in one screen.

**Feel (3 words):** *Trustworthy · Calm · Clear*. Not "modern" or "vibrant" — privacy needs to feel boring and safe.

**Domain vocabulary:** consent, data, share, export, personalisation, sponsored, campaign, audience, budget, creative, policy, review. Never "segment", "pixel", "impression bucket", "ad slot ID".

**Colour world:**
- Trust-blue for primary actions (denim blue `#3b5bdb`)
- Neutral-grey for the settings-tabs chrome (`#f4f5f7`, `#e5e7ea`, `#9ca3af`)
- Amber for destructive-neutral (turn off, revoke)
- Red only for danger-zone and policy-fail verdict grid cells
- Green for "approved" and "consent granted" states
- Pro-max rule — every state is colour + text + icon, never colour alone

**Signature element:** the *"Last changed 3 days ago · change history →"* timestamp line under every toggle. It tells the user the system remembers what they did, and gives them a way to audit themselves.

**Anti-references (never look like):**
- The early 2010s Facebook privacy settings (buried, opaque, pre-checked)
- A legal policy page (walls of text)
- A dark-pattern cookie banner (reject-all hidden behind three clicks)

**Anti-patterns:**
- Pre-checked opt-in toggles
- Engineering terminology in user-facing copy
- Generic admin sidebar when the user is on a consumer route
- Cards nested in cards (the Privacy page is vertically-stacked sections, not cards-in-cards)
- Inter as the display face — use a warmer humanist sans for this flow (e.g. Söhne, Söhne Breit, or Unica77)

---

## 8. Acceptance criteria

- [ ] `/settings/privacy` renders for any authenticated TENANT_CONSUMER; redirects anonymous users to login.
- [ ] Settings-tabs layout collapses cleanly to single-column under 640px.
- [ ] Every toggle has plain-language explanation, "last changed" timestamp, and live server sync within 5 min.
- [ ] Data export requests succeed end-to-end; user receives email with signed-URL link; history list reflects state.
- [ ] Danger-zone delete requires three confirms (modal, type-DELETE, email verification).
- [ ] Advertiser console at `/admin/ads/` renders for TENANT_OPS only; TENANT_CONSUMER gets `/404`.
- [ ] New-campaign wizard has live reach estimate + live creative preview; enters "Pending review" state on submit.
- [ ] Platform review queue at `/admin/engine/ads/review-queue` renders G2 verdict grid with colour + text + icon per cell.
- [ ] Sponsored slots in the feed carry the "Sponsored" badge + "Why am I seeing this?" link.
- [ ] All 13 problematic states (§6) have the documented visual response — no raw 4xx/5xx pages in the user flow.
- [ ] Zero engineering terminology in user-facing copy — scan UI strings for `FLOW-`, `T-`, `TaskType`, `Arbiter`, `Orchestrator` etc.
- [ ] WCAG AA contrast on every foreground/background pair.
- [ ] Under-13 and EU-resident treatments apply server-side and render the right locked state client-side.
