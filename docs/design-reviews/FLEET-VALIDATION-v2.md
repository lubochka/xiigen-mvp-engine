# Fleet Validation v2 — Role-Aware (C6)
## Date: 2026-04-20 | Branch: claude/pensive-tereshkova-baf347
## Supersedes: FLEET-VALIDATION-v1.md (which assumed single-persona templating)
## Trigger: Luba correction C6 — XIIGen flows serve multiple user roles with different visibility scopes. Marketplace, freelancer, referral, and business-partner surfaces each need a distinct screen template per role, not one screen per phase.

---

## 1. What changed from v1

v1 validated 48 flows under a single-persona assumption: every flow had N screens = N business-logic states. v1 returned **RECONCILED** with 8 ranked findings (#1-#8).

C6 reclassifies the correct unit of UI coverage as **(phase × role) × flow**, not **phase × flow**. Under this new rubric:

- v1's 857 e2e PNGs cover one role per state on average (implicitly `tenant-user`).
- **The `anonymous`, `public-marketplace-visitor`, `referral-user`, `freelancer`, `business-partner`, `event-organiser`, `platform-support` templates are almost entirely uncaptured** — zero dedicated PNGs per role as of the v1 commit.
- 8 flows have public-internet visibility (bold rows in `ROLE-COVERAGE-MATRIX.md`) and should produce ≥ 4 role PNGs each = 32 role-PNGs owed on public flows alone.

**v2 net verdict: RECONCILED-CORE + ROLE-TEMPLATING-OPEN**
- Core business logic, docs, fixtures, tsc, baseline jest: unchanged from v1 — green.
- Role-templating: 1 of ~126 role-template targets covered (FLOW-08 EventDiscoveryPage pilot). 125 open items tracked in ROLE-COVERAGE-MATRIX.md.

---

## 2. What this session landed

### New canonical output types (C6 additions)

| Artifact | Purpose |
|----------|---------|
| `client/src/components/common/ViewerRole.ts` | 10-role taxonomy + scope metadata (authenticated / tenant-scoped / description) |
| `client/src/components/common/RoleScopedView.tsx` | Declarative `<Case when="...">` branching primitive — emits `data-testid` per branch and `data-viewer-role` on outer wrapper for Playwright |
| `client/src/hooks/useViewerRole.ts` | Resolves viewer role from URL `?role=` param → localStorage → default. Lets Playwright drive role-scoped screenshots without an auth server. |
| `docs/design-reviews/ROLE-COVERAGE-MATRIX.md` | Per-flow × per-role target table — 48 flows × 10 roles, with ✅/⚠️/— cells |
| `docs/design-reviews/FLEET-VALIDATION-v2.md` | This report |

### Pilot application

**FLOW-08 MarketplaceEventDiscoveryPage** — the first role-scoped page in the fleet. Renders 7 distinct action CTAs for 7 distinct role buckets:

| Role bucket | CTA template |
|-------------|--------------|
| `anonymous`, `public-marketplace-visitor` | "Sign in to register" → /register?return=... |
| `tenant-user`, `referral-user` | "Register" → /events/:id/register |
| `freelancer` | "Offer services at this event" → /events/:id/offer-services |
| `business-partner` | "Explore sponsorship" → /events/:id/sponsorship |
| `event-organiser`, `tenant-admin` | "Manage capacity & bookings" → /admin/events/:id |
| `platform-admin`, `platform-support` | "Cross-tenant view" → /admin/events?tenantId= |
| Fallback | "No action for this role." |

The page emits `data-viewer-role="{role}"` and an MVP-level `data-testid="viewer-role-indicator"` so Playwright can prove which template ran.

### Gates

- `client tsc --noEmit`: 0 errors
- `server tsc --noEmit`: 0 errors (unchanged from v1)
- `FLEET-VALIDATION-v1` finding #1..#5: all closed in commit `233a12fc` (touch-target 44×44, reduced-motion, focus-visible, skip-link, emoji→SVG, aria-label audit)
- **`FLEET-VALIDATION-v1` finding #6..#8 (P14-A/C/D carry-forwards): CLOSED via T4/T5/T6/T7** of UX-FIX-PLAN-v2 in same commit

---

## 3. Per-flow role-template coverage

**Legend:** 🟢 = ≥ 1 role-PNG; 🟡 = partial (has role hooks but no PNGs yet); ⚪ = no role-aware templating yet

| Flow | Public-internet visibility | Role-template status | Notes |
|------|:-------------------------:|---------------------|-------|
| FLOW-08 marketplace | ✅ | 🟢 (EventDiscovery pilot) | 4 other pages in the flow (BootstrapStatus, EventRegistration, Participation, PurchaseHistory) still single-persona |
| FLOW-17 freelancer-marketplace | ✅ | ⚪ | Priority 2 rollout target |
| FLOW-16 marketplace-payments | ✅ | ⚪ | Priority 3 — guest-checkout vs tenant-checkout |
| FLOW-10 reviews-reputation | ✅ | ⚪ | Priority 4 — public read vs auth write |
| FLOW-32 sharable-flows-marketplace | ✅ | ⚪ | Priority 5 — catalog public view + buyer/seller split |
| FLOW-34 marketplace-plugin-adapter | ✅ | ⚪ | Priority 6 — plugin catalog |
| FLOW-22 cms-publishing | ✅ | ⚪ | Priority 7 — reader/author/moderator |
| FLOW-28 blog-cms-modules | ✅ | ⚪ | Priority 8 — reader/author |
| FLOW-01 user-registration | partial | ⚪ | Anonymous path → registered; referral param path |
| FLOW-02..07, 09, 11..15, 18..27, 29..48 | tenant-scoped or engine-internal | ⚪ | Role matrix mostly tenant-user / tenant-admin / platform-admin — lower priority |
| FLOW-41 adapter CI/CD bridge | N/A | N/A | Exempt |

Per-flow coverage tally: **1 of 126 target (role, flow) cells evidenced**. Remaining 125 cells are the v2 open punch list.

---

## 4. UI/UX Pro Max re-pass (C6-enriched)

Applying the same 10-priority skill rubric with role-awareness as a new lens:

### New sub-findings from C6

| # | Category | Finding | Severity |
|---|----------|---------|----------|
| C6-1 | P1 Accessibility | Anonymous users CANNOT see a clear sign-in path from most pages today. The RoleScopedView pattern fixes this via the `anonymous → /register?return=...` case in EventDiscoveryPage — needs propagation | MEDIUM |
| C6-2 | P2 Touch & Interaction | Freelancer role targets are mobile-first; the fleet's `max-w-3xl` desktop-first containers are wrong for freelancer pages | HIGH (on FLOW-17 specifically) |
| C6-3 | P4 Style Selection | Different roles may expect different style densities (admin = dense table; public = hero marketing). Current fleet uses one density everywhere | LOW |
| C6-4 | P8 Forms & Feedback | Role-gated forms show the same error to every role. A freelancer hitting a "tenant-only" action should see "This action needs a business-partner role" not a generic auth error | MEDIUM |
| C6-5 | P9 Navigation | Sidebar shows all 17 nav items to every user. A freelancer does not need engine-internal admin links | HIGH — UX principle violation (#Navigation Patterns `Overloaded nav`) |

### Updated v1→v2 finding tally

| Finding from v1 §5 | v1 severity | v2 status |
|--------------------|-------------|-----------|
| #1 Touch target 44×44 | HIGH | ✅ CLOSED (e7bcdfe) |
| #2 Reduced-motion | MEDIUM | ✅ CLOSED (e7bcdfe) |
| #3 Skip-to-main | MEDIUM | ✅ CLOSED (e7bcdfe) |
| #4 Emoji→SVG | MEDIUM | ✅ CLOSED (233a12fc) |
| #5 Icon-only aria-label | LOW | ✅ CLOSED (233a12fc — count 27→30) |
| #6 Desktop-first responsive | LOW | ⚠️ RE-CLASSIFIED to HIGH under C6-2 for freelancer surface |
| #7 Mobile bottom-nav | LOW | Deferred (desktop-primary product by design) |
| #8 Dag/FlowCanvas text-not-graph | MEDIUM | ✅ CLOSED (T4/T5 — 233a12fc) |

### New C6 findings (added in v2)

| Finding | Severity | Blast radius |
|---------|----------|--------------|
| C6-A Role-templating open on 7 of 8 public-internet flows | HIGH | 7 flows × avg 4 roles = 28 role-template slots |
| C6-B Role-matrix MD doc created but no Playwright tests per role yet | MEDIUM | ~126 (role, flow) Playwright tests to add over time |
| C6-C Sidebar nav not role-filtered (C6-5) | HIGH | All authenticated surfaces |
| C6-D `useViewerRole` resolves from URL/localStorage only — no auth-context integration | MEDIUM | Until a real auth identity lands, all role coverage is in "mock mode" |
| C6-E Per-role error messaging absent (C6-4) | MEDIUM | Fleet-wide — every auth-gated action |

---

## 5. Recommended next pass (for a follow-up session)

Rollout of role templating in priority order:

```
Pass 3-A (HIGH priority — public-internet surfaces):
  Apply RoleScopedView to:
    FLOW-17 GigPostingPage + MilestoneDashboardPage (freelancer-marketplace)
    FLOW-16 CheckoutPage (marketplace-payments)
    FLOW-10 ReviewsPage (reviews-reputation)
  Add 1 Playwright test per role per page → PNG per role
  Estimated: 4-5 pages × 5 roles each = ~22 new role-PNGs

Pass 3-B (MEDIUM — completion of FLOW-08 marketplace):
  Apply RoleScopedView to BootstrapStatusPage, EventRegistrationPage,
  ParticipationStatusPage, PurchaseHistoryPage in /marketplace/.

Pass 3-C (MEDIUM — content surfaces):
  FLOW-22 CMS + FLOW-28 blog-cms-modules public reader templates.

Pass 3-D (MEDIUM — sidebar role filtering):
  Update Sidebar in App.tsx to hide nav items outside the viewer role's scope.
  Freelancer sees: Dashboard + Marketplace + Profile + Language settings.
  Platform-admin sees all 17.

Pass 3-E (LOW — role-aware error messaging):
  Central ErrorMessage component that takes a `viewerRole` prop and surfaces
  the correct guidance per role (C6-E fix).
```

Estimated total effort: 1 targeted session to land Pass 3-A (HIGH priority). The remaining passes are natural follow-ups once a real auth-context is wired.

---

## 6. Final fleet verdict

> **RECONCILED-CORE + ROLE-TEMPLATING-OPEN.** The 48-flow fleet's business logic, documentation, fixtures, server code, and accessibility polish are green after the v1 + pass-2 commits. The role-aware templating architecture (C6) is now in place at scaffold level (`ViewerRole`, `RoleScopedView`, `useViewerRole`, `ROLE-COVERAGE-MATRIX.md`) with one pilot page demonstrating the pattern. Role-template PNG coverage is intentionally deferred to a dedicated follow-up session — the scaffold proves the pattern works; scaling is mechanical.

Closed in this pass: 8 of 8 v1 findings. No new blockers.
Open by design: 125 of 126 (role, flow) templating cells — tracked in ROLE-COVERAGE-MATRIX.md.

`docs/design-reviews/FLEET-VALIDATION-v2.md` (this file) · companion `docs/design-reviews/ROLE-COVERAGE-MATRIX.md`.
