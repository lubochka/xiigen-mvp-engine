# Cross-Flow UX Review Rollup

**Scope:** 47 flows / 622 PNGs captured under `docs/e2e-snapshots/{slug}/`.
**Rubric:** [RUBRIC.md](RUBRIC.md) — 4-level severity, 8 evaluation axes, user-perspective review.
**Method:** 6 senior-UX-designer reviewers read every PNG multimodally and wrote per-flow `docs/ux-review/{slug}/UX-REVIEW.md`.

## Executive verdict

> **The P13 test gate (0 failures, all PNGs > 1KB, gallery exists) is passing.**
> **The UX gate is failing.** ≥92% of captured PNGs carry at least one UX finding. The
> test suite proves pages load; it does not prove the intended business states render.
> The shipping-evidence set is **not representative** for the majority of flows.

## Severity totals

| Severity | Count | % of 622 PNGs |
|----------|------:|--------------:|
| 🔴 BLOCKER (wrong/placeholder content, state not shown) | **220** | 35% |
| 🟠 HIGH | 96 | 15% |
| 🟡 MEDIUM | 136 | 22% |
| 🔵 LOW | 123 | 20% |
| **Total findings** | **575** | **92%** |

(PNGs can raise >1 finding — total > unique PNGs counted once.)

## Flow-level verdict matrix

Legend: ✅ shippable · ⚠️ needs fixes · 🚫 not representative

| Flow | Verdict | B | H | M | L | Dominant finding |
|------|:-------:|--:|--:|--:|--:|------------------|
| adaptive-rag-deep-research | 🚫 | 2 | 2 | 2 | 1 | No research console — only CRUD |
| ads-platform | 🚫 | 2 | 2 | 2 | 1 | **Actively broken — "Failed to fetch" in every capture** |
| ai-safety-moderation | 🚫 | 9 ident | 2 | 3 | 2 | 9 byte-identical CRUD; no moderation queue |
| ai-self-modification | ⚠️ | 1 | 3 | 3 | 3 | Ships literal `TBD` string; sensitive domain, zero controls |
| bfa-cross-flow-governance | ⚠️ | 6 | 2 | 4 | 3 | Real state cards but 6 duplicate CRUD shots |
| blog-cms-modules | 🚫 | 2 | 2 | 2 | 1 | TENANT_FACING label but ships raw CRUD to customers |
| bundle-activation | 🚫 | 20 | 3 | 2 | 1 | 20/25 PNGs byte-identical admin table |
| client-push | 🚫 | 1 | 3 | 2 | 1 | TBD placeholder; no push console |
| cms-publishing | 🚫 | 8 | 2 | 4 | 2 | 8 identical CRUD; `after-create` timing bug |
| completion-gamification | 🚫 | 12 | 4 | 6 | 2 | 12 identical "Loading your gamification data..." placeholders |
| cycle-chain-extension | ⚠️ | 1 | 3 | 3 | 3 | Same TBD template; no cycle visualization |
| data-warehouse-analytics | 🚫 | 8 | 2 | 4 | 2 | 8 identical CRUD; no warehouse dataset browser |
| design-intelligence-engine | 🚫 | 2 | 2 | 2 | 1 | No DR triple / mutation UI |
| design-system-governance | ⚠️ | 1 | 3 | 3 | 3 | CRUD + 3 state cards; 5 duplicate CRUD shots |
| durable-sagas-compliance | 🚫 | 1 | 2 | 2 | 1 | 6 PNGs identical empty filter form |
| dynamic-forms-workflows | 🚫 | 9 | 2 | 3 | 2 | 9 byte-identical CRUD; 0/6 business phases shown |
| etl-data-integration | 🚫 | 8 | 2 | 4 | 2 | 8 identical CRUD; no sources/sinks/runs surfaces |
| event-attendance | ⚠️ | 9 | 3 | 5 | 2 | Tenant UI shippable; 9 topology captures pixel-identical |
| event-management | ⚠️ | 9 | 2 | 5 | 3 | **Validation error lacks per-field messaging** (production bug) |
| feature-registry | ✅ | 0 | 2 | 4 | 21 | Domain-tailored CRUD, honest mock states; terminal decisions missing rationale |
| form-builder-templates | 🚫 | 2 | 2 | 2 | 1 | Dashboard repeated 6×; T-IDs leaked |
| freelancer-marketplace | 🚫 | 2 | 2 | 2 | 1 | Post-a-Gig repeated 6×; **"Valid" badge on empty form** |
| friend-request-social-feed | 🚫 | 19 | 2 | 6 | 4 | 19/31 identical empty pages; no accepted/rejected states |
| human-interaction-gate | 🚫 | 17 | 4 | 1 | 1 | **Shows DNA-engine principle cards instead of human-gate UI** |
| marketplace | 🚫 | 14 | 0 | 0 | 0 | **All 14 PNGs byte-identical "No bootstrap records"** |
| marketplace-payments | 🚫 | 1 | 3 | 2 | 1 | Bare Cart-ID input labeled "Checkout"; no items/total/payment |
| marketplace-plugin-adapter | 🚫 | 2 | 2 | 2 | 1 | ADMIN_FACING badge, ENGINE_INTERNAL look |
| meta-arbitration-engine | 🚫 | 2 | 2 | 2 | 1 | No arbitration UI, only CRUD |
| meta-flow-engine | 🚫 | 17 | 4 | 1 | 1 | **Shows DNA-engine principle cards instead of meta-flow states** |
| meta-flow-orchestration | ⚠️ | 1 | 3 | 3 | 3 | Same TBD template; nothing meta-flow-specific |
| module-lifecycle | 🚫 | 2 | 2 | 2 | 1 | No install/enable/disable UI, only CRUD |
| oss-curriculum | 🚫 | 1 | 3 | 2 | 1 | TBD placeholder in state-1 |
| platform-agent | ✅ | 0 | 2 | 6 | 19 | Honest "mock state N" framing; state cards thin; empty `(emits )` templates |
| profile-enrichment | ⚠️ | 4 | 2 | 4 | 2 | Real tenant UI; 4 orchestration phases show same spinner |
| rag-quality-feedback | 🚫 | 1 | 3 | 2 | 1 | TBD placeholder |
| rag-quality-graph | ⚠️ | 1 | 3 | 3 | 3 | Ships literal `TBD` string to users |
| reviews-reputation | ✅ | 1 | 2 | 3 | 3 | Best-looking flow; **`:entityId` literal rendered in URL/heading** |
| saas-multi-tenancy | 🚫 | 1 | 2 | 2 | 1 | All 6 PNGs sparse lifecycle page |
| schema-registry-dag | ⚠️ | 5 | 2 | 3 | 3 | Real UI in r-* pairs; 01–06 all show DAG empty page |
| sharable-flows-marketplace | 🚫 | 2 | 2 | 2 | 1 | Table of UUIDs, not a marketplace |
| subscription-billing | ✅ | 0 | 2 | 3 | 3 | Strong Billing Dashboard; **"price-in-cents" UX trap** |
| system-initiation-bootstrap | 🚫 | 2 | 2 | 2 | 1 | Generic CRUD for a BOOT flow |
| tenant-lifecycle-manager | 🚫 | 2 | 2 | 2 | 1 | 4/5 CRUD duplicates; "no topology" fallback |
| transactional-event-participation | 🚫 | 18 | 4 | 5 | 5 | **18 PNGs stuck on "Loading booking..."; no confirmed state ever rendered** |
| user-groups-communities | ⚠️ | 6 | 4 | 5 | 2 | Real Discover/Join/Approve UX; paywall rendering bug on `07-locked-content` |
| user-registration | ✅ | 2 | 2 | 5 | 2 | 10/12 business phases have dedicated UX |
| visual-flow-engine | 🚫 | 1 | 2 | 2 | 1 | All 6 PNGs identical empty canvas |

**Verdict counts across 47 flows:** 5 ✅ · 13 ⚠️ · **29 🚫**

## Cross-flow patterns (the bugs to fix once, ripple everywhere)

### 1. 🔴 State-fidelity collapse (the dominant pattern) — **~150 BLOCKERS**
Captures labeled with distinct business-phase identifiers render the same placeholder, spinner, or empty CRUD list. Worst offenders:
- `marketplace`: 14 of 14 PNGs byte-identical
- `bundle-activation`: 20 of 25
- `friend-request-social-feed`: 19 of 31
- `transactional-event-participation`: 18 of 32 stuck loading
- `meta-flow-engine` + `human-interaction-gate`: 17 of 23 each rendering DNA-principle cards from a shared template
- `completion-gamification`: 12 of 29 identical loading placeholders
- `ai-safety-moderation`, `dynamic-forms-workflows`, `cms-publishing`, `data-warehouse-analytics`, `etl-data-integration`: 8–9 byte-identical CRUD captures each

**Root cause:** `page.screenshot()` fires before the route-specific UI (or an empty-state fallback) resolves. The test visits the URL and captures whatever is painted — usually a persistent dashboard chrome + a loading spinner or CRUD shell.

**Fix pattern:**
```ts
// gate every screenshot behind an explicit data-ready assertion
await expect(page.getByTestId(`phase-${phase}-ready`)).toBeVisible();
await page.screenshot({ path, fullPage: true });
```
and seed fixtures so the happy-path/error states actually have data to render.

### 2. 🔴 `TBD` placeholder strings shipped to end-users — **5 flows**
`rag-quality-graph`, `meta-flow-orchestration`, `cycle-chain-extension`, `ai-self-modification`, `oss-curriculum`, `rag-quality-feedback`, `client-push` each display state-cards whose body literally reads `"<Feature Name>-specific patterns TBD"`. A planning-doc placeholder has flowed straight through into the rendered product.

**Fix:** template substitution is firing on the label but not on the body — sweep the shared state-card component for unresolved `TBD`.

### 3. 🔴 Wrong content rendered in domain frame — **2 flows**
`meta-flow-engine` and `human-interaction-gate` both display cards titled "DNA-1: Record<string, unknown>", "DNA-9: CloudEvents envelope", etc. — these are XIIGen architectural principles, not domain UI. Someone wired the DNA cheat-sheet component to the wrong route(s).

### 4. 🟠 Test metadata leaking into the production UI — **~10 flows**
`crud-after-create.png` captures show the user-facing Notes column containing `created by bundle-activation-crud.spec.ts`, `created by meta-flow-engine-crud.spec.ts`, etc. The spec filename is being written into the Notes field by the test harness and persisting into the UI.

**Fix:** either (a) strip `.spec.ts` paths from e2e POST payloads, or (b) render a generic "Created via UI form" string regardless of the posted value.

### 5. 🟠 Actively broken UI captured — **ads-platform**
Both captured pages show live "Failed to fetch" error banners. The test passes because the error banner is rendered, but the product is non-functional in the captured state.

### 6. 🟠 Production UX dead-end — **event-management validation**
`06-validation-error.png` shows only "Please review your submission." with no per-field inline error, no field highlight, no indication of which field is invalid. A real user reaches a dead-end they cannot diagnose.

### 7. 🟠 Template holes shipped verbatim — **multiple flows**
- `:entityId` literal rendered in `reviews-reputation` heading/URL
- Raw backticks in `platform-agent` state cards
- Empty `(emits )` template parentheses in `platform-agent`
- "FLOW-XX has no documented states — topology and product spec both missing, and n..." fallback text is **itself truncated** in `state-1-flow-has.png` across 8+ flows

### 8. 🟡 Test-harness identifiers shown to users — **~20 flows**
Record names like `ui-1776451823105` (epoch timestamps), raw UUIDs, raw task-type IDs `T637/T638/T639/T640` appear in columns labeled "Name" — unreadable for any human user.

### 9. 🟡 Inconsistent banner severity — **human-interaction-gate**
`default.png` shows the provider-keys banner in **red** while the same banner is **yellow** on every other page/flow — a consistency/severity contract violation.

### 10. 🟡 Validation state contradiction — **freelancer-marketplace**
`post-a-gig.png` shows a green "Valid" badge while all required fields are empty — the validation state contradicts the form state.

### 11. 🔵 UX trap — **subscription-billing**
Amounts appear to be rendered in cents without a unit indicator; easy for a user to misread "999" as dollars.

### 12. 🔵 Persistent chrome occlusion
The yellow "Missing provider keys: openai, gemini. DPO triples will be MONO_MODEL_CALIBRATION. Configure keys" banner occupies the top 48px of every one of the 622 PNGs. In most flows it is not obscuring critical content, but for captures meant to prove the page title + breadcrumb, it is. Consider rendering captures with the banner dismissed for evidence collection.

## Shippable-UI shortlist (positive findings)

These 5 flows meet the "intuitive, logical, appropriate" bar per the rubric:

1. **user-registration** — Create account form, onboarding "Welcome aboard" card with pending items, real verification states (pending / expired / invalid / rate-limit).
2. **subscription-billing** — Strong Billing Dashboard with tier/MRR/next-renewal card, plan comparison, failed-payment remediation.
3. **reviews-reputation** — Best-looking flow overall; reputation score display, per-review actions, moderator queue.
4. **feature-registry** — Domain-tailored columns (Feature ID / Status / Notes), honest "mock state N" framing rather than fake-real data.
5. **platform-agent** — Honest `ADMIN_FACING` state-N mock framing, state cards thin but not deceptive.

And a further tier of "needs fixes but skeleton is right" (13 ⚠️ flows) where the real UI exists for a subset of states — notably `event-management`, `event-attendance`, `user-groups-communities`, `profile-enrichment`, `schema-registry-dag`.

## Prescription — what to do next

Ordered by ROI (highest impact first):

| # | Fix | Flows affected | Severity removed |
|--:|-----|---------------:|------------------:|
| 1 | Gate every `page.screenshot()` behind `await expect(testid(`phase-N-ready`)).toBeVisible()` + seed fixtures for the depicted state | ~25 | ~150 BLOCKERS |
| 2 | Sweep shared state-card template for unresolved `TBD` / `<Feature Name>` placeholders | 7 | 7 BLOCKERS |
| 3 | Route-wiring audit for `meta-flow-engine` and `human-interaction-gate` (stop showing DNA-principle cards) | 2 | 34 BLOCKERS |
| 4 | Strip `.spec.ts` paths from e2e test payloads so Notes column does not leak spec filenames | ~10 | ~10 HIGH |
| 5 | Fix `ads-platform` data fetch error before re-capturing | 1 | 2 BLOCKERS |
| 6 | Add per-field inline validation to `event-management` Create Event form | 1 | 1 HIGH (real production bug) |
| 7 | Template substitution: `:entityId`, `(emits )`, backticks, truncated fallback text | ~10 | ~15 MEDIUM |
| 8 | Replace epoch-timestamp record names with human-readable labels | ~20 | ~20 MEDIUM |
| 9 | Unify provider-keys banner severity to yellow across all pages | 1 | 1 MEDIUM |
| 10 | Add currency unit indicator (`$9.99` not `999`) to `subscription-billing` | 1 | 1 LOW |

Fixes 1–3 alone would turn ~200 of the 220 BLOCKERS into passes and move ~20 flows from 🚫 → ⚠️.

## How to read this rollup

- Per-flow deep dives live at `docs/ux-review/{slug}/UX-REVIEW.md` — open any row's slug column.
- The rubric used is at `docs/ux-review/RUBRIC.md`.
- All findings are reader-perspective, actionable, and written assuming no access to this session's chat.
