# Round 2 — Per-Cell UX Improvement Matrix Plan

**Purpose:** a plan Claude Code can apply to every cell of the matrix (screen × language × role × business-logic phase × state) using the UX/UI skill libraries we have. Each cell gets a concrete audit, a concrete fix criterion, and a concrete gate.

**Authority:** /.impeccable.md (design context), flow-prep-library/* (FLOW-PREP-LIBRARY-SKILL, SK-540 product-design-context, SK-541 screen-craft-audit, SK-542 flow-ui-examination-protocol, planning--business-flows-registry.md, GUIDE-B01..B50), ext-skills-flat/* (impeccable-SKILL, interface-design-SKILL, design-for-ai-SKILL, critique-SKILL, ui-ux-pro-max-SKILL), docs in `Missing gaps/` (UX-FIX-THREE-TRACK-PLAN, ARCHITECT-GUIDE-v2, ARCHITECT-RESPONSE).

**Date:** 2026-04-20 · **Round:** 2 · **Branch:** claude/pensive-tereshkova-baf347

---

## The matrix

Every leaf cell of this matrix is one "examinable unit" — one screen for one role speaking one language in one business-logic phase in one state.

```
FLOW-XX  (48 total: FLOW-00..47 + FLOW-48)
  └── Screen  (each page component for this flow)
      └── Language  (en / he-RTL / fr)
          └── Role  (anonymous / public-marketplace-visitor / tenant-user /
                    referral-user / freelancer / business-partner /
                    event-organiser / tenant-admin / platform-support /
                    platform-admin)  — not every role applies to every flow
              └── Business-logic phase  (from P1 inventory, flow-specific:
                  e.g. DRAFT / REVIEW_REQUESTED / APPROVED / PUBLISHED / ARCHIVED)
                  └── State  (empty / loading / populated / error / success)
```

Bounding: ~48 × ~3 screens × 3 langs × 3–10 roles × 5–8 phases × 5 states ≈ 30,000+ theoretical cells. Not every combination is valid. The plan is to **prioritise cells that differ observably** and **batch cells that share the same verdict**.

---

## The per-cell audit protocol

For every cell Claude Code examines, run the five-layer audit derived from the UX/UI skills:

### Layer 0 — Read the ground truth before looking at anything
(from ARCHITECT-GUIDE-v2)

```
1. docs/flow-coverage/{slug}/P1-business-logic-inventory.md    → WHO does WHAT to achieve WHAT
2. docs/flow-coverage/{slug}/P5-ui-specs.md                    → expected screen states
3. docs/flow-coverage/{slug}/P2-ui-gap-analysis.md             → known gaps (don't re-discover)
4. docs/screen-examination/{slug}-examination.md (if exists)   → prior classification
5. /.impeccable.md                                             → XIIGen aesthetic + signature + token vocab
6. planning--business-flows-registry.md row for this flow     → grammar type + CFI flags + role matrix
```

Extract three things before opening any PNG:
- **WHO:** the persona sentence (role + context + trigger) from P1+P2
- **VERB:** the one action this person is here to take
- **GRAMMAR:** PROGRESS_STRIP | VERDICT_GRID | CARD_LIST | TOPOLOGY_CANVAS | KIOSK | DASHBOARD | SETTINGS_TABS

If any is missing → stop and read the source files again; do not proceed to JSX.

---

### Layer 1 — Accessibility + interaction (ui-ux-pro-max P1–P2)

Apply to each rendered PNG for this cell. Any P1 failure = BLOCK.

| Check | What to verify |
|-------|---------------|
| `color-not-only` | State not communicated by colour alone — text or icon alongside |
| `aria-labels` | Icon-only interactive elements labelled for screen readers |
| `form-labels` | Every input has a visible `<label>` |
| `heading-hierarchy` | `h1 → h2 → h3` without level-skipping |
| `loading-buttons` | Async action buttons disabled + indicator during async |
| `error-feedback` | Errors shown near the field that caused them, not global-only |
| `nav-state-active` | Current-location highlighted in any nav (CONCERN if missing) |
| `drawer-usage` | Sidebar hidden for consumer/public roles (BLOCK if visible) |
| `touch-target-size` | Interactive element ≥ 44×44 px on mobile breakpoint |
| `skip-link` | App shell ships a "skip to main content" link (already present) |

---

### Layer 2 — AI-slop tell detection (design-for-ai CHECKER)

10-tell checklist (from `design-for-ai--ai-tells.md`). Score: 0–2 tells PASS · 3–5 CONCERN · 6+ BLOCK (aesthetic-direction gap).

- [ ] Typography: Inter / Roboto / system-ui as primary, no intentional choice
- [ ] Typography: monospace used as lazy "technical" shorthand (outside of data cells)
- [ ] Colour: cyan-on-dark "AI dashboard" palette
- [ ] Colour: pure #000 / #fff throughout (no tint)
- [ ] Layout: hero metric template (big number + small label + gradient card)
- [ ] Layout: identical card grid, same padding, same radius, repeated 6×+
- [ ] Layout: centre-everything, no asymmetry
- [ ] Detail: side-stripe border > 1px on cards as the visual indicator
- [ ] Detail: gradient text (`background-clip: text` + gradient bg)
- [ ] Detail: emoji-as-action-icons inside buttons

On any CONCERN or BLOCK, check `/.impeccable.md` is present and the page implements the declared FEEL + Rejects-Defaults list.

---

### Layer 3 — Nielsen heuristics spot-check (critique — H1 / H2 / H8 / H9)

Score 0–4 per heuristic. Thresholds: H1 ≤ 1 or H2 ≤ 1 → BLOCK · total < 8 → BLOCK · 8–11 → CONCERN · ≥ 12 → PASS.

- **H1 Visibility of status:** is the user told what the system is doing?
- **H2 Match system / real world:** user-language copy, zero engineering identifiers
- **H8 Aesthetic / minimalist:** nothing decorative, everything earns its place
- **H9 Error recovery:** errors are actionable — user knows the next step

Engineering acronyms (BFA, DNA, AF-station, arbiter, FREEDOM config, DLQ, T-numbers, CF-numbers, `/api/dynamic/xiigen-*`, test spec filenames, `ENGINE_INTERNAL` badges) automatically score H2 = 0 → BLOCK.

---

### Layer 4 — Grammar verification (UX-30)

Read `.impeccable.md` grammar declaration or the flow's row in `planning--business-flows-registry.md`. Verify the rendered PNG implements that grammar.

A CRUD table backed by `/api/dynamic/xiigen-*` with Name/Status/Notes/Actions columns on a TENANT_CONSUMER or PUBLIC surface → UX-30 BLOCK.

---

### Layer 5 — Intent-first mandate checks (interface-design)

Post-build, before shipping:

| Check | Pass criterion |
|-------|----------------|
| Swap test | Could the typeface / layout / pattern be swapped for a generic alternative without anyone noticing? If yes, defaulted somewhere. |
| Squint test | Blur eyes → hierarchy still visible? Action-required items dominant? Nothing harsh? |
| Signature test | 5+ specific elements carrying XIIGen's signature (budget strip / state counter bar / capacity strip / activity indicator / competition signal — per flow domain)? |
| Token test | CSS variables / class usage sound like XIIGen's world (`--signal-live` / `--fault` / `--paper`) or generic (`bg-white`, `text-gray-500`)? |
| Non-technical reviewer test | Someone who knows nothing about XIIGen can: understand what this does, see what to do next, see nothing left by a developer. |

---

## Per-axis specialisation

### Axis 1 — Screen

Default to one page component per screen. For screens with multiple panels (FLOW-29 topology + detail panel + state counter bar), treat each panel as its own cell so you don't conflate failures.

### Axis 2 — Language

Run the 5-layer audit at minimum on `en`, and additionally on `he` to catch RTL-specific bugs. `fr` is lower priority (same LTR direction as `en`).

RTL-specific checks (extend Layer 1):
- [ ] Layout: `<html dir>` is `rtl` when locale is `he` (RUN-119 baseline passes this)
- [ ] Layout: physical `left-*` / `ml-*` / `right-*` / `mr-*` classes are absent from the page — use logical `start-*` / `ms-*` / `end-*` / `me-*` instead
- [ ] Iconography: chevrons / arrows carrying "next" / "back" semantics flip direction under `dir=rtl`
- [ ] Progress strips / stepper bars: the filled direction flips (left→right in en, right→left in he)
- [ ] Text alignment: body text `text-align: start`, not `text-left`
- [ ] Numbers: stay LTR even inside RTL text (tabular-nums wrapping)
- [ ] Punctuation: Hebrew copy uses geresh/gershayim correctly (out of scope for automated check — flag for human review)

### Axis 3 — Role

Per-flow role visibility comes from `planning--business-flows-registry.md` and the per-flow `ROLE-ANALYSIS-BATCH-*.md`. For every role the registry says the flow applies to:

- [ ] A role-specific branch renders (not a generic fallback)
- [ ] The primary action on this page matches this role's verb (e.g., tenant-user bidding vs freelancer posting vs platform-admin moderating)
- [ ] Labels, copy, icons reflect the role's context (not engineering context)
- [ ] The role sees the right shell chrome (consumer shell vs admin shell per RUN-120)

### Axis 4 — Business-logic phase

From the flow's P1 inventory + server status enums (per UX-FIX-THREE-TRACK-PLAN UX-2 protocol). Examples:

- FLOW-22 CMS: DRAFT → REVIEW_REQUESTED → APPROVED → PUBLISHED → ARCHIVED
- FLOW-16 Checkout: CART → PAYMENT → CONFIRMED → REFUNDED
- FLOW-29 Deep Research: RECEIVED → PLAN → SEARCH → SOURCES → SYNTHESIS → FEEDBACK

For each phase: a distinct mock-state URL param exists (`?mock=<phase-key>`) and captures a PNG that shows that phase's dominant visual.

### Axis 5 — State (per phase)

For each (phase, role, language) combination, check all five states:

- **empty** — explained + primary CTA + no shame
- **loading** — skeleton or progress-strip-aware, not spinner-forever
- **populated** — the normal operating state; most scrutiny here
- **error** — specific error + recovery action (Nielsen H9)
- **success** — confirmation + next-action link (not a dead end)

---

## Plain-language audit (Luba directive 2026-04-20)

Dedicated protocol — every admin surface goes through this before being called "done":

### Engineering terms to replace or explain

| Term shown today | Problem | Replace with |
|------------------|---------|--------------|
| BFA | "Business Flow Arbitration" — invisible to humans | "Cross-flow policy check" / "policy validator" |
| DNA | XIIGen internal architecture pattern | "Data convention" / omit unless platform-admin |
| AF station | XIIGen pipeline stage | "Generation stage" / "pipeline step" |
| Arbiter | internal evaluator | "Policy evaluator" / "reviewer" |
| FREEDOM config | config vs code model | "Configuration" / "settings" |
| MACHINE code | engine code | "Engine logic" / omit |
| DLQ | Dead-Letter Queue | "Failed-delivery queue" or "Retry queue" |
| MRR | Monthly Recurring Revenue | OK (widely understood business term) |
| CTR | Click-through Rate | OK (widely understood ad-platform term) |
| SLA | Service-Level Agreement | OK (widely understood) |
| T-number (T621) | internal task-type ID | omit — replace with human task name |
| CF-number (CF-842) | BFA rule ID | omit or "policy rule #{N}" |
| ENGINE_INTERNAL | role-tier badge | omit on tenant-facing pages |
| Provider keys missing | infra warning | gate to platform-admin only (already RUN-49) |
| /api/dynamic/xiigen-* | ES index path | omit from any user-visible copy |
| DataProcessResult | generic return type | omit / describe the domain data |
| scope_isolation | multi-tenant boundary | "tenant boundary" if needed |

### Scan-and-replace strategy

- Grep `grep -rn 'BFA\|DNA-[0-9]\|AF-station\|arbiter\|FREEDOM config\|MACHINE code\|ENGINE_INTERNAL' client/src/pages/` once per cell audit.
- Any hit on a TENANT_CONSUMER / PUBLIC surface = auto-BLOCK (H2 = 0).
- Admin surfaces (platform-admin / platform-support only) may retain a limited set of internal terminology if paired with a human label; the rule is "never bare".

### Example — FLOW-25 BFA Cross-Flow Governance page

Current heading: "BFA Cross-Flow Governance"
Replacement candidate: "Cross-Flow Policy Review" (page title) + helper text "Each row below is a generation round checked against your cross-flow policies."

Subtitle current: "5 policies × N rounds verdict grid" with policy names like `scope_isolation` shown as-is.
Replacement: "Policies: Tenant boundary · Cost ceiling · Quality bar · Drift control · Improvement" — each internal policy name gets a human label, with the internal slug retained only in the hover tooltip so platform-admins can still find it.

---

## Progressive topology disclosure (Luba directive 2026-04-20)

Dedicated protocol for topology canvas screens (FLOW-11 / FLOW-18 / FLOW-26 / FLOW-29 / FLOW-34 / FLOW-35 / FLOW-47):

### The problem

All nodes of a 27-node pipeline displayed simultaneously on one canvas = visual overload. A viewer cannot tell which phase is important, which connection matters, or where an issue is.

### The fix — two-level drill-down

**Level 1 — Phase strip (high-level composition anchor):**
A horizontal strip of 6-ish phases (Ingest · Retrieval · Gates · Knowledge · Feedback · Policy) with:
- Per-phase state dot (emerald running, amber waiting, rose failed, slate not-reached)
- Per-phase count ("4 / 6 steps complete")
- Click a phase → Level 2 opens with just that phase's nodes + its inbound/outbound edges

**Level 2 — Phase detail (drill-down):**
Only the selected phase's nodes rendered on the canvas. Connections to other phases shown as entry/exit "pipes" on the edges of the canvas (labelled with the data that flows).

**Level 3 — Node detail (existing):**
Click a node inside Level 2 → side panel with inputs / outputs / state (already present per RUN-50 FLOW-29).

This matches the Vercel / Datadog / Grafana "dashboard → drill-down" pattern. The viewer always has an overview and a focused view; never drowning in the full graph unless they ask for the "View all nodes" escape hatch.

---

## Execution prioritisation

Given the matrix explodes to thousands of cells, run in this order:

### Wave A — Framing (ship once, affects every cell)

1. Module-vs-admin shell (RUN-120 ✓ — tenant-user + referral-user hidden-sidebar)
2. RTL baseline (RUN-119 ✓ — dir-flip on language change, ms-56 logical margin)
3. Plain-language cross-cutting substitutions (acronym substitution table applied to all TENANT_CONSUMER pages)
4. Two-level topology disclosure applied to the canvas component used by 6 flows

### Wave B — Per-flow deep examination (one flow at a time)

For each flow in priority order (TENANT_CONSUMER surfaces first, PLATFORM_INTERNAL last):
1. Run Layer 0 (read P1 / P5 / P2 / .impeccable.md / registry row)
2. Run the 5-layer audit for `en` × primary-consumer-role × populated state
3. Fix the highest-severity finding
4. Re-run with `he-RTL` to catch direction bugs
5. Re-run for each additional role with a distinct branch
6. Capture PNGs for each (language × role × phase × state) cell that differs

Priority order (by TENANT_CONSUMER impact):
- FLOW-08 Marketplace, FLOW-16 Checkout, FLOW-09 Ticket — purchase funnel
- FLOW-01 Registration, FLOW-02 Profile — onboarding funnel
- FLOW-04/09 Event attendance/registration — attendance funnel
- FLOW-07 Social feed, FLOW-06 Groups — engagement
- FLOW-10 Reviews, FLOW-17 Gigs, FLOW-20 Ads — marketplace adjacent
- FLOW-22 CMS public reader, FLOW-28 Blog — public content
- FLOW-24 AI Safety anonymous — trust & safety
- Everything else — admin surfaces (lower priority for consumer experience, but still in scope)

### Wave C — State coverage (PNG fleet)

For each cell that passes Wave B at the `populated` state, also capture:
- empty / loading / error / success state PNGs via `?mock=` params
- `he-RTL` variant PNGs for at least the populated state

---

## Round-2 gate criteria (definition of done)

This round closes when **all** hold:

1. Wave A framing changes committed and pushed (3/4 done; 4th = topology drill-down)
2. Plain-language audit: zero matches for `BFA|DNA-[1-9]|AF-station|ENGINE_INTERNAL|T\d{3}|CF-\d{3}|DataProcessResult` visible in any TENANT_CONSUMER-classified page file
3. For each of the top-20 priority flows: one examination record updated at `docs/screen-examination/{slug}-examination.md` citing P1/P5, the 5-layer verdict, and the applied fix
4. For each top-20 flow: a `he-RTL` PNG captured for the populated state of the primary role, showing the layout flips correctly
5. For each topology-canvas flow (6 total): the two-level drill-down pattern replaces the flat 27-node dump
6. `ROUND-2-STATE.json` documents every commit with flow, run-id, verdict-layer-that-passed, remaining follow-ups

---

## Self-execution commands (what Claude Code runs per cell)

```bash
# Layer 0 — read the ground truth
cat docs/flow-coverage/{slug}/P1-business-logic-inventory.md
cat docs/flow-coverage/{slug}/P5-ui-specs.md 2>/dev/null
cat docs/flow-coverage/{slug}/P2-ui-gap-analysis.md 2>/dev/null
cat .impeccable.md | head -40
grep -A 6 "FLOW-{NN}" .claude/skills/flow-prep-library/planning--business-flows-registry.md

# Layer 1 — accessibility lint (component-level)
grep -nE "aria-label|role=|htmlFor" client/src/pages/{slug}/*.tsx | wc -l   # should be > 0
grep -nE "color-only|only colour|status === " client/src/pages/{slug}/*.tsx # manual review

# Layer 2 — AI-slop tell grep
grep -cE "text-2xl font-bold text-(blue|green|amber|red|emerald|purple)-\d+\s+mt-1" client/src/pages/{slug}/*.tsx
# > 0 on a TENANT_CONSUMER page = hero-metric tell

# Layer 3 — language audit
grep -rnE "BFA|DNA-[1-9]|AF[- ]station|ENGINE_INTERNAL|T[0-9]{3}|CF-[0-9]{3}" client/src/pages/{slug}/*.tsx

# Layer 4 — grammar verification
grep -nE "api/dynamic/xiigen-" client/src/pages/{slug}/*.tsx
# > 0 paired with a <table> on TENANT_CONSUMER = UX-30 BLOCK

# Layer 5 — intent-first checks
# Run the site in a headed browser, switch to Hebrew, visit the flow page,
# verify the mandate checks pass visually.

# Capture state-specific PNGs
npx playwright test client/e2e/{slug}.spec.ts --reporter=list
```

---

## Relationship to prior work

Round 1 (RUN-87..115b, 28 commits) did **cross-cutting regression fixes**:
- hero-metric → summary-row across 15 flows
- emoji-as-icons → SVG
- Engineering error copy → human copy
- Missing signature → embedded per-card signature (5 domains)

This plan covers what Round 1 did NOT: per-language, per-role-beyond-primary, per-phase, per-state systematic coverage, plus the three new directives (shell, RTL, plain language, topology drill-down).

---

## Open questions

To be resolved before Wave B starts:

1. Do `docs/flow-coverage/{slug}/P1-P5` files exist for all 48 flows? (Only `adaptive-rag-deep-research` confirmed; need a full inventory.)
2. For topology drill-down (Wave A4): do we refactor the existing `ResearchCanvas` in FLOW-29, or build a shared `TopologyCanvasDrillDown` component first and retrofit?
3. Plain-language glossary: should the substitution be per-locale (so Hebrew has its own translations) or English-first with i18n follow-up? Starting English-first keeps the current scope tractable.

These go back to Luba for decision before the corresponding waves start.

---

## END OF MATRIX PLAN
