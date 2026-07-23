# GUIDE-B48 — How to Produce the UX Audit Section
## Within `UI-REFLECTION-STATE.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 58 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any UX audit):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file guides the production of the **UX Audit section** appended to
`UI-REFLECTION-STATE.md`. The UX audit systematically verifies each role's
accessible screen coverage, applies the ZIP-14 10-priority UI/UX checks, and
documents FC-18 compliance status for all React pages in the flow.

---

## WHAT THIS GUIDANCE COVERS

The UX audit section is appended to the existing `UI-REFLECTION-STATE.md` document
(which records the 5-state indicator verdicts per task type — see GUIDE-B47).
The audit section adds a second layer: per-role quality verification using the
ZIP-14 UI/UX Pro Max skill library's 10 priority categories and SK-539's 29 checks.

**Position in UI-REFLECTION-STATE.md:**
```
[Summary + Per-Process Verdict Table]          ← GUIDE-B47 produces this
[Process Details with 5 state indicators]      ← GUIDE-B47 produces this

## UX AUDIT                                    ← this guidance produces this
  [Per-role audit: screens, panels, checks]
  [SK-539 CRITICAL checks]
  [FC-18 compliance per page]
```

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-14 | PRIMARY | `.claude/skills/ui-ux-pro-max/SKILL.md` — 10 priority categories (P1-P10) with CRITICAL/HIGH/MEDIUM/LOW tags, Quick Reference checks, Pre-Delivery Checklist. P1 Accessibility and P2 Touch & Interaction are CRITICAL |
| ZIP-14 | PRIMARY | `.claude/skills/ui-styling/references/shadcn-accessibility.md` — ARIA patterns, keyboard navigation, skip-to-content implementation, focus management, screen reader patterns for shadcn/ui (Radix UI primitives) |
| ZIP-15 | PRIMARY (§1) | `XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE.md` §1 — 9-family role taxonomy; audit must cover every role identified for the flow |
| ZIP-15 | PRIMARY (§2) | §2 — Screen Visibility Matrix format; audit verifies the correct screens are accessible per role |
| ZIP-15 | PRIMARY (§6) | §6 — Special categories: §6.1 Minor Users (parental consent gate), §6.2 Anonymous Attendee (ROLE-0 vs ROLE-ANON-ATTENDEE distinction), §6.3 Delegated Agency Access |
| ZIP-17 | PRIMARY | `docs/ux-review/reviews-reputation/UX-REVIEW.md` — canonical ✅ Shippable per-flow audit: per-PNG findings table, 8 evaluation axes (State fidelity, Content, Redundant, Form, Validation, Success), Cross-PNG patterns, Business-logic phase coverage |
| ZIP-17 | PRIMARY | `docs/ux-review/UX-REVIEW-ROLLUP.md` — 8-axis evaluation rubric across 47 flows; severity totals (🔴 BLOCKER 35%, 🟠 HIGH 15%) |
| ZIP-17 | PRIMARY | `docs/design-reviews/FLEET-VALIDATION-v1.md` §5 — 7 ranked consolidated findings: touch target (HIGH P2), prefers-reduced-motion (MEDIUM P1), skip-to-main-content (MEDIUM P1), emoji as icons (MEDIUM P4), icon-only aria-label (LOW P1), desktop-first (LOW P5), no mobile nav (LOW P9) |
| ZIP-17 | REFERENCE | **SK-539 UX-01..UX-29** — 29 mandatory checks for React pages (referenced in fc-18-ui-ux-compliance-gate.md and HOW-TO-USE-SKILLS v4.4.0) |

---

## OUTPUT FILE SPECIFICATION

**Appended to:** `docs/sessions/FLOW-XX/UI-REFLECTION-STATE.md`

The UX audit section follows the Process Details section of the existing
UI-REFLECTION-STATE.md. Same file, new `## UX AUDIT` heading.

---

## THE TEN PRIORITY CATEGORIES (ZIP-14 SKILL.md)

| Priority | Category | Severity | Key checks |
|----------|----------|----------|------------|
| P1 | Accessibility | **CRITICAL** | Contrast 4.5:1, Alt text, Keyboard nav, Aria-labels, Skip-links, Heading hierarchy, Color not only |
| P2 | Touch & Interaction | **CRITICAL** | Min 44×44pt touch target, 8px+ spacing, Hover vs tap, Loading buttons, Error feedback, Cursor pointer |
| P3 | Performance | HIGH | WebP/AVIF images, Lazy loading, Reserve space (CLS < 0.1) |
| P4 | Style Selection | HIGH | Match product type, Consistency, SVG icons (no emoji) |
| P5 | Layout & Responsive | HIGH | Mobile-first breakpoints, Viewport meta, No horizontal scroll |
| P6 | Typography & Color | MEDIUM | Base 16px, Line-height 1.5, Semantic color tokens |
| P7 | Animation | MEDIUM | Duration 150-300ms, Motion conveys meaning, `prefers-reduced-motion` |
| P8 | Forms & Feedback | MEDIUM | Visible labels, Error near field, Helper text, Progressive disclosure |
| P9 | Navigation Patterns | HIGH | Predictable back, Bottom nav ≤5, Deep linking |
| P10 | Charts & Data | LOW | Accessible chart alternatives, Data table |

---

## THE 5 CRITICAL SK-539 FINDINGS FROM FLEET-VALIDATION §5

These five findings from the fleet-wide validation are mandatory checks in every
UX audit. They were found fleet-wide — meaning all flows need to be checked.

| # | Severity | Category | Finding | Fix |
|---|----------|----------|---------|-----|
| 1 | HIGH | P2 Touch | No `min-h-[44px]` across the fleet — touch target minimum not enforced | Define shared `tap-target` class in `index.css` (`min-height: 44px; min-width: 44px;`); apply to every `<button>` |
| 2 | MEDIUM | P1 Accessibility | No `prefers-reduced-motion` handling anywhere | Add `@media (prefers-reduced-motion: reduce) { * { animation: none; transition: none; } }` to `index.css` |
| 3 | MEDIUM | P1 Accessibility | No skip-to-main-content link | Add `<a href="#main-content" className="sr-only focus:not-sr-only">Skip to main</a>` at top of App shell |
| 4 | MEDIUM | P4 Style | Emoji used as icons (🌐 📋 🎯 🎟️ ⏳ ✓) across flows | Replace with `lucide-react` SVG icons |
| 5 | LOW | P1 Accessibility | Icon-only buttons sparse `aria-label` coverage | Audit all `<button>` without text content; add `aria-label` |

These five findings are **flow-independent** — they describe the shared codebase.
In the UX audit, for each flow, declare whether the flow introduces or worsens any
of these findings, or inherits the fleet-wide state.

---

## THE 8 UX EVALUATION AXES (UX-REVIEW-ROLLUP rubric)

Per-flow UX reviews use these 8 axes (from UX-REVIEW-ROLLUP and per-flow UX-REVIEW.md):

| Axis | Description |
|------|-------------|
| **State fidelity** | Does the screenshot show the intended business state, or a loading placeholder? |
| **Content** | Is the content real/representative, or placeholder data? |
| **Redundant** | Are multiple screenshots showing byte-identical or near-identical states? |
| **Form** | Are forms properly labeled, validated, accessible? |
| **Validation** | Do validation errors appear near the field that caused them? |
| **Success** | Is the success state clearly communicated with next-action options? |
| **Copy** | Is text clear, correctly spelled, using domain terminology (not tech IDs)? |
| **Navigation** | Can the user reach the flow's core screens from normal navigation? |

---

## THE UX AUDIT SECTION FORMAT

```markdown
## UX AUDIT

**Audited:** [YYYY-MM-DD] | **Branch:** [branch-name]
**Flows with client UI:** [N] | **SK-539 critical checks:** [PASS/PARTIAL/FAIL]
**Overall UX verdict:** [✅ Shippable | ⚠️ Needs fixes | 🚫 Not representative]

---

### Fleet-Wide Check (applies to all flows)

| Finding | Status for FLOW-XX | Evidence |
|---------|-------------------|---------|
| P2-TOUCH: min-h-[44px] on buttons | [PASS/FAIL/INHERITED] | [file:line or "shared baseline — not fixed for this flow"] |
| P1-MOTION: prefers-reduced-motion in index.css | [PASS/FAIL/INHERITED] | [file:line or "shared baseline — fix needed"] |
| P1-SKIP: skip-to-main-content link in App shell | [PASS/FAIL/INHERITED] | [file:line or "shared baseline — fix needed"] |
| P4-EMOJI: no emoji used as icons | [PASS/FAIL — list emojis] | [which component uses emojis] |
| P1-ARIA: icon-only buttons have aria-label | [PASS/FAIL — N buttons] | [file:line of offending buttons] |

---

### Per-Role Audit

#### Role: [ROLE-ID] — [role name]

```
Screens accessible (ZIP-15 §2): [list screens this role can reach]
Panel access (ZIP-15 §5 Level 3): [which panels per screen]

SK-539 P1 (Accessibility — CRITICAL):
  - color-contrast: [PASS/FAIL — ratio measured or inferred]
  - focus-states: [PASS/FAIL — focus rings present on interactive elements]
  - aria-labels: [PASS/FAIL — icon-only buttons labeled]
  - skip-links: [PASS/FAIL — app-level check]
  Overall P1: [PASS/FAIL]

SK-539 P2 (Touch & Interaction — CRITICAL):
  - touch-target-size: [PASS/FAIL — 44×44pt minimum]
  - touch-spacing: [PASS/FAIL — 8px+ between targets]
  - loading-buttons: [PASS/FAIL — disabled during async + feedback shown]
  Overall P2: [PASS/FAIL]

P3 Performance (HIGH): [PASS/PARTIAL/FAIL — key issues if any]
P4 Style Selection (HIGH): [PASS/PARTIAL — SVG icons, no emoji, product-type match]
P5 Layout & Responsive (HIGH): [PASS/PARTIAL/FAIL — mobile-first, no horizontal scroll]
P6 Typography & Color (MEDIUM): [PASS/FAIL — 16px base, semantic tokens]
P7 Animation (MEDIUM): [PASS/FAIL — 150-300ms, prefers-reduced-motion]
P8 Forms & Feedback (MEDIUM): [PASS/PARTIAL/FAIL — visible labels, inline errors]
P9 Navigation (HIGH): [PASS/FAIL — predictable back, route in nav]

Guard mechanism (ZIP-15 §4): [YES/NO — route guard active for this role]
Minor user consent (ZIP-15 §6.1): [REQUIRED/NOT-APPLICABLE — flow FLOW-24 style]
Delegation annotations (ZIP-15 §3.5): [PRESENT/NOT-APPLICABLE]

FC-18 compliance:
  Role audience declared: [PASS/FAIL]
  Screen template declared (T-1..T-7): [PASS/FAIL — which template]
  No INTERNAL_ONLY content shown: [PASS/FAIL]
```

#### Role: [second role]
[same format]

---

### Per-Screen UX Findings

Using the 8 evaluation axes (UX-REVIEW-ROLLUP rubric):

| Screen | State fidelity | Content | Redundant | Form | Validation | Success | Copy | Nav | Verdict |
|--------|---------------|---------|-----------|------|-----------|---------|------|-----|---------|
| /[route] | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/⚠️/🚫 |

**Blockers (🔴):** [list specific blocker findings]
**High (🟠):** [list high-severity findings]
**Medium (🟡):** [list medium findings]
**Low (🔵):** [list low findings]

---

### Business-Logic Phase Coverage

**Visually covered:** [list which business phases have dedicated screenshots]
**Missing:** [list phases with no visual evidence or placeholder content]

FP-2 minimum state check: [≥3 distinct states per role: PASS/FAIL per role]
  [role]: [N states identified — PASS or FAIL(needs N more)]

---

### Carry-Forward Items (for next session)

| Item | Severity | Fix description |
|------|----------|----------------|
| [deferred item] | [HIGH/MED/LOW] | [what to fix and where] |
```

---

## HOW TO PRODUCE THE UX AUDIT

### Step 0 — Examination record + SK-541 audit (NEW — run before role identification)

The analysis established that GUIDE-B48 previously used ZIP-14 (ui-ux-pro-max P1-P10)
as its sole quality framework. This is incomplete: P1/P2 are CRITICAL but the
design quality audit (Nielsen heuristics, AI slop detection, grammar verification)
was entirely missing. Step 0 adds the SK-541 four-layer audit.

```bash
# Check examination record for pre-existing audit findings
cat docs/screen-examination/{slug}-examination.md 2>/dev/null |   grep -A 10 "## Classification\|## Primary finding\|Q3 Engineering\|Q4 Role"
# If present: examination record already classifies pages (NEEDS_PURPOSE_BUILT_UI,
# CRUD_FALLBACK, DOMAIN_SCREEN). Use these classifications as inputs to the audit.

# Verify SK-541 audit was run during Phase 7
grep "SK-541 AUDIT" docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md 2>/dev/null
# If present: import Layer 1/2/3/4 results into the UX audit section.
# If absent: run SK-541 now (planning--screen-craft-audit-SKILL.md).
```

**SK-541 four-layer audit — run for every React page and include results in UX audit:**

**Layer 1 — Accessibility and interaction (ui-ux-pro-max P1/P2 CRITICAL):**
  P1 CRITICAL: color-not-only, aria-labels, form-labels, heading-hierarchy
  P2 CRITICAL: loading-buttons, error-feedback (any P1/P2 fail = BLOCK)
  P9 Navigation: nav-state-active, drawer-usage

**Layer 2 — AI slop detection (design-for-ai CHECKER mode — 10 tells):**
  Typography: Inter/system-ui default (no intentional choice), monospace as "technical"
  Color: cyan-on-dark palette, pure black/white, hero-metric template
  Layout: identical card grid, everything centered, same spacing everywhere
  Detail: side-stripe card borders, gradient text
  Score: 0-2 tells = PASS | 3-5 = CONCERN | 6+ = BLOCK
  If 3+ tells: check docs/design-context/{slug}/.impeccable.md — if absent, SK-540 skipped → BLOCK

**Layer 3 — Nielsen heuristics spot check (impeccable critique — H1/H2/H8/H9):**
  H1 Visibility of System Status (0-4): 0-1 = BLOCK
  H2 Match System/Real World (0-4): 0-1 = BLOCK (engineering jargon = automatic 0)
  H8 Aesthetic and Minimalist Design (0-4): 0-1 = CONCERN
  H9 Error Recovery (0-4): 0 = BLOCK (error with no recovery path)
  Total (H1+H2+H8+H9): ≥12 = PASS | 8-11 = CONCERN | <8 = BLOCK

**Layer 4 — Grammar verification vs declared type (UX-30):**
  Read grammar from docs/design-context/{slug}/.impeccable.md
  Check PNG primary content against declared grammar:
  CRUD table backed by /api/dynamic/ for TENANT_CONSUMER/PUBLIC → UX-30 BLOCK

**Fleet-wide findings to record for every flow (from FLEET-VALIDATION §5):**
These apply fleet-wide — record PASS/FAIL/INHERITED for each:
  1. Touch targets ≥44×44px (P2 CRITICAL) — FLOW-08 pilot shows none implemented fleet-wide
  2. prefers-reduced-motion media query (P1 CRITICAL) — missing fleet-wide
  3. Skip-to-main-content link (P1 CRITICAL) — missing fleet-wide
  4. No emoji as icons (P4 MEDIUM) — found in 8+ flows
  5. Icon-only buttons have aria-label (P1 LOW) — missing on topology canvas flows

---

### Step 1 — Identify all roles from ZIP-15 §1

```bash
# Find roles mentioned in the flow's contracts
grep -n "ROLE-\|role\[" server/src/engine-contracts/[slug]-contracts.ts | head -20

# Cross-reference with ZIP-15 §1 taxonomy to get canonical role IDs
# Common roles: ROLE-0 (anonymous), ROLE-1 (authenticated), ROLE-PLATFORM-ADMIN,
# plus flow-specific: ROLE-1-ORGANIZER (FLOW-03), ROLE-1-BUYER (FLOW-06), etc.
```

### Step 2 — Check fleet-wide findings

For each of the 5 fleet-wide findings, check if the flow introduced the issue
or inherits it from the shared codebase:

```bash
# P2 TOUCH — check button classes
grep -rn "min-h-\[44" client/src --include="*.tsx" | head -5
grep -rn "<button\|<Button" client/src/pages/[slug] --include="*.tsx" | \
  grep -v "min-h-\[44" | head -10

# P1 MOTION — check index.css or global styles
grep -rn "prefers-reduced-motion" client/src | head -5

# P1 SKIP — check App.tsx
grep -n "skip.*main\|sr-only.*Skip\|href.*#main" client/src/App.tsx | head -5

# P4 EMOJI — check for emoji in components
grep -rn "🎯\|📋\|🌐\|🎟️\|⏳\|✓\|✅\|❌" client/src/pages/[slug] --include="*.tsx" | head -10

# P1 ARIA — check icon-only buttons
grep -rn "<button\|<Button" client/src/pages/[slug] --include="*.tsx" | \
  grep -v "aria-label\|>.*[A-Za-z].*<" | head -10
```

### Step 3 — Apply per-role audit

For each role, determine which screens they can access (from ZIP-15 §2 matrix
or from the flow's route guard configuration):

```bash
# Check route guards for this flow
grep -rn "requireAuth\|useAuth\|RoleGuard\|[role]" client/src/App.tsx | \
  grep -i "[slug]" | head -10
```

### Step 4 — Apply 8-axis per-screen evaluation

For each screen in the flow, evaluate the 8 axes. Focus on:
- State fidelity: does the page show real business state or loading/placeholder?
- Copy: does the page use domain terms or raw IDs like `:entityId`?
- Form: if there's a form, do inline error messages appear near the field?

### Step 5 — Write carry-forward items

Items that cannot be fixed in the current session go into the carry-forward table.
Each item must have a severity and specific fix description.

---

## ACCEPTANCE CRITERIA

Before the UX audit section is considered complete:

- [ ] Fleet-wide check table present with all 5 FLEET-VALIDATION §5 findings
- [ ] Each finding has PASS/FAIL/INHERITED status
- [ ] Per-role audit covers every role from ZIP-15 §1 identified for this flow
- [ ] SK-539 P1 (CRITICAL) explicitly evaluated per role with PASS/FAIL
- [ ] SK-539 P2 (CRITICAL) explicitly evaluated per role with PASS/FAIL
- [ ] P3-P9 evaluated at least at PASS/PARTIAL/FAIL level
- [ ] Guard mechanism (ZIP-15 §4) declared for each role
- [ ] Minor user consent check (ZIP-15 §6.1) if flow serves users under 18
- [ ] FC-18 compliance declared per role (role audience + screen template + no INTERNAL_ONLY)
- [ ] Per-screen findings table using 8-axis rubric
- [ ] Business-logic phase coverage section present
- [ ] FP-2 minimum state check (≥3 distinct states) verified per role
- [ ] Overall UX verdict declared (✅ Shippable / ⚠️ Needs fixes / 🚫 Not representative)

---

## KEY RULES

**1. P1 and P2 are CRITICAL — they must pass or be explicitly blocked.**
If P1 (Accessibility) or P2 (Touch & Interaction) fails, the screen cannot be
marked ✅ Shippable. These are non-negotiable for production React pages.

**2. The 5 fleet-wide findings are inherited — declare status, not blame.**
All five fleet-wide findings are shared baseline issues. The audit does not blame
individual flows for them — it declares whether each finding is "INHERITED (fleet
baseline — not fixed for this flow)" or "FIXED (fix applied in this session)" or
"INTRODUCED (this flow adds new instances)."

**3. FC-18 compliance per role requires three specific checks.**
Per the HOW-TO-USE-SKILLS v4.4.0 Check 15 and the fc-18-ui-ux-compliance-gate:
(a) role audience declared, (b) screen template from T-1..T-7 declared,
(c) no INTERNAL_ONLY content (DNA engine cards, platform diagnostics) shown to
tenant users. See GUIDE-B44 Section on FP-4/INTERNAL_ONLY.

**4. The reviews-reputation flow is the ✅ Shippable reference.**
FLOW-10 (reviews-reputation) is the best-performing flow in the UX audit —
rated ✅ Shippable. Its per-PNG findings table is the baseline for what a
well-structured UX audit looks like: real page screenshots, real business
states (Reputation Dashboard with 4.2★, Moderation Queue with Approve/Reject,
Submit Review form), actual validation feedback. The one blocker (`:entityId`
literal in the heading) shows that even the best flows have at least one finding.

**5. The per-screen findings table maps to the UX-REVIEW.md format.**
The 8-axis table in this guidance mirrors what the per-flow `UX-REVIEW.md` files
contain. If a flow already has a `docs/ux-review/[slug]/UX-REVIEW.md`, its
findings should be imported directly into the per-screen table rather than
re-audited from scratch.

---

*End of GUIDE-B48 — UX Audit section within UI-REFLECTION-STATE.md*
*List A sources: ZIP-14 (ui-ux-pro-max SKILL.md 10 categories + Pre-Delivery Checklist,*
*shadcn-accessibility.md ARIA patterns + skip-to-content implementation),*
*ZIP-15 §1 (role taxonomy for audit scope), §2 (screen visibility matrix),*
*§6 (special categories: minors, anonymous attendees, delegation),*
*ZIP-17 (reviews-reputation UX-REVIEW.md canonical ✅ example,*
*UX-REVIEW-ROLLUP.md 8-axis rubric, FLEET-VALIDATION-v1.md §5 ranked findings,*
*SK-539 UX-01..UX-29 29 mandatory checks)*
*Target B-type: B-48 — UX Audit section in UI-REFLECTION-STATE.md*
*Round: 58 of 72*
