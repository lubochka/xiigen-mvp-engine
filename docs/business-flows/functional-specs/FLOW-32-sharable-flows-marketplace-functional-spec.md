# Functional Spec — FLOW-32 Sharable Flows Marketplace

**Grammar:** G3 Card list with state badge
**Primary role tiers:** TENANT_OPS (publisher + installer), PLATFORM_OPS (curator)
**Current state:** **Half-built** — 20 services. No marketplace wiring; tenants can't discover or install.
**Primary unblock:** marketplace discovery page + install flow + publisher console.

---

## 1. Summary

Any tenant can package a working flow (or bundle of flows) and publish it to a public marketplace — other tenants browse, preview, and install with one click. The installing tenant gets a copy of the flow running on their own data. Publishers see installs, feedback, revenue (if paid). Platform curators feature quality flows. All 20 services exist; the user-facing marketplace doesn't.

---

## 2. Roles & modes

| Role | Route | What they do |
|---|---|---|
| **TENANT_OPS** (publisher) | `/admin/marketplace/publish` | Package a flow, set pricing, publish |
| **TENANT_OPS** (installer) | `/marketplace` | Browse, preview, install |
| **TENANT_CONSUMER** | `/marketplace` (read-only preview) | Browse public listings; see previews |
| **PLATFORM_OPS** (curator) | `/admin/engine/marketplace/` | Feature, moderate, audit |

**Modes:** public browse / authenticated install / preview mode / draft-publish.

---

## 3. User stories

### Story 3.1 — Tenant browses and installs a flow

**Screens:** `/marketplace` → flow detail → install flow wizard → success.

**Happy path:**
1. `/marketplace` hub: featured strip at top, card grid below with category chips (Commerce / Social / Analytics / Content / Admin), sort (Popular / New / Price).
2. Each card: thumbnail, flow name, one-line description, publisher name + avatar, install count, rating, price (free / paid).
3. Click card → flow detail page: full description, screenshot carousel, included task types, data footprint, permissions required, installer testimonials, **Install** CTA.
4. **Install** → wizard: pick workspace, confirm permissions, configure per-tenant FREEDOM keys (if any), confirm billing (if paid).
5. On install: progress strip showing provisioning stages; on completion: *"{flow-name} is live in your workspace"* with link to the first screen.

### Story 3.2 — Publisher packages a flow for marketplace

**Screens:** `/admin/marketplace/publish` → wizard → preview → submit-for-review.

**Happy path:**
1. Wizard: (1) pick flow from your workspace; (2) describe (name, description, screenshots, category, tags); (3) configure (what's tenant-configurable, what's locked); (4) pricing (free / paid / subscription); (5) legal (terms + privacy).
2. Preview: see exactly how it'll appear in the marketplace.
3. **Submit for review**: goes to platform curators; publisher sees "In review" card in their Publish dashboard.

### Story 3.3 — Publisher watches installs and feedback

**Screens:** `/admin/marketplace/publish/:id` → analytics tab.

**Happy path:**
1. Publisher dashboard: published flows + install counts + ratings + reviews.
2. Per-flow analytics: install trend, active-vs-dormant installs, review summary.
3. Per-review detail: ratings, text, reply affordance.

### Story 3.4 — Platform curator features a quality flow

**Screens:** `/admin/engine/marketplace/` → review queue + feature manager.

**Happy path:**
1. Review queue: submitted flows awaiting approval (G2 verdict grid).
2. Approve → flow goes live in marketplace.
3. Feature manager: drag-and-drop order of "Featured" strip on `/marketplace`.

---

## 4. Screen structure

### 4.1 `/marketplace` (public + authenticated)

Featured strip + category chips + card grid + sort + filter. Zero admin chrome.

### 4.2 Flow detail page

Hero + screenshots + description + metadata + **Install** CTA + reviews section.

### 4.3 Install wizard

4-step progress strip. Last step is provisioning — uses the FLOW-00 bundle-activation G1 pattern.

### 4.4 Publisher dashboard

Card list of published + draft + in-review flows with per-flow analytics drill-in.

### 4.5 Curator console

G2 verdict grid for reviews + drag-drop feature manager.

---

## 5. Edge cases

| Case | Expected behaviour |
|---|---|
| Tenant installs the same flow twice | Prompt: *"You already have this installed — install another copy?"* with confirm. |
| Flow requires permissions the tenant doesn't have | Block install with *"This flow needs {permission} — ask an admin to grant it first"*. |
| Publisher updates a published flow | Update shows on all installs as "Update available" banner; installers can upgrade when ready. |
| Paid flow, billing fails | Rollback install; card *"Payment failed — try again"* with help. |
| Flow has dependencies on another flow not installed | Prompt: *"This flow needs FLOW-08 marketplace — install that first?"* with one-click chained install. |

---

## 6. Problematic states

| State | What the user sees |
|---|---|
| **Empty marketplace** | *"No flows published yet — be the first to share."* |
| **Loading** | Skeleton cards. |
| **Install fails (provisioning)** | Progress strip shows failing step; **Retry** / **Contact support**; local state rolled back. |
| **Flow no longer available** (unpublished) | *"This flow is no longer available."* + link to similar flows. |
| **Review queue empty** (curator) | *"Clean queue."* |
| **Rate limited** (publisher submits 10 flows in an hour) | *"Slow down — max 5 submissions per hour."* |

---

## 7. Visual direction

**Grammar:** G3 Card list with state badge.

**Feel:** *Welcoming · Legitimate · Browseable*. Should feel like a well-curated app store, not a marketplace of plugins that might break.

**Reference UIs:** Chrome Web Store, iOS App Store, Notion Template Gallery, Figma Community.

**Colour world:** neutral chrome; category chips with distinct colours; state badges (Free / Paid / Installed / Update available).

**Signature:** the **Featured strip** at the top of `/marketplace` — hand-curated by platform curators, gives the marketplace personality.

**Anti-patterns:**
- Admin sidebar on the public `/marketplace` page.
- Identical cards with same padding (use variety in card size based on category / featured status).
- Fake "popular" badges that aren't earned.

---

## 8. Acceptance criteria

- [ ] `/marketplace` public hub renders without admin chrome.
- [ ] Flow detail page with screenshots + metadata + reviews + install CTA.
- [ ] Install wizard with provisioning progress strip.
- [ ] Publisher dashboard with analytics.
- [ ] Curator verdict grid for review queue + feature manager.
- [ ] Dependency chain installs prompted.
- [ ] All 6 problematic states documented.
- [ ] Zero engineering terminology on public pages.
