---
name: per-image-validation
sk_number: SK-549
version: "1.0.0"
priority: MANDATORY
load_order: 5.6
category: planning
author: luba
updated: "2026-04-21"
contexts: ["claude-code", "web-session"]
description: >
  7-axis validation protocol applied to one PNG at a time. Extends SK-541's
  4-layer UX audit with Axis A (shell correctness), Axis B (role branching),
  Axis C (language/RTL), Axis D (business-logic phase + state identity), and
  Axis E (human-friendliness). Produces one completed template block per PNG,
  appended to docs/screen-examination/ROUND-2-COVERAGE-MATRIX.json.
  This is the cell-level examination protocol — SK-541 audits a page within a
  session; SK-549 validates any individual PNG at any point, including
  re-examination after a fix. Mandatory for any flow flagged
  NEEDS_PURPOSE_BUILT_UI in its examination record.
triggers:
  - "examine this PNG"
  - "validate screen"
  - "review screenshot"
  - "check this capture"
  - "per-image audit"
  - "PNG audit"
  - "visual cell"
  - "re-examine"
---

# Per-Image Validation Skill (SK-549)

## Purpose

Validate one rendered PNG across 7 axes. The axes confirm:
- The screen is the correct type for this surface (Axis A)
- The right content is shown for this role (Axis B)
- The locale is rendered correctly (Axis C)
- The PNG is of a meaningful business state (Axis D)
- The screen speaks plain human language (Axis E)
- The screen passes the 5-layer UX audit (Axis F)
- Remaining work is tracked (Axis G)

**Why this skill exists separately from SK-541:** SK-541 runs at Phase 7 Step 5
for pages a session just built. SK-549 applies to *any* PNG at *any* time —
baseline capture, re-examination after fix, spot-check, or fleet audit. It is
the unit-level inspection; SK-549 + SK-550 (coverage matrix) together replace
the claim "this flow is done" with "this cell passed all 7 axes."

**Critical fix for the dynamic-forms-workflows failure class:** The convergence
score (ROUND-CONVERGENCE.json) measures grep-countable axes only. A screen can
score 0 automated offences and still fail Axis D (no meaningful domain fields
shown) or Axis B (wrong content for this role). SK-549 Axis D is the only gate
that validates whether functional spec content actually shipped.

---

## When to Invoke

- Any session examining a captured PNG for any flow
- Before declaring a flow "PASS" at any round — at least the primary populated
  state cell must have a completed SK-549 block
- Any flow flagged `NEEDS_PURPOSE_BUILT_UI` in its examination record: SK-549
  Axis D is **mandatory** before the flow can be considered fixed
- Re-examination after any fix that was supposed to address a visual defect
- Fleet-level audit sessions (used per-cell within SK-550 coverage matrix)

---

## Step 0 — Read Ground Truth Before Opening the PNG

For the flow this PNG belongs to, read in this order:

```bash
# 1. Prior examination record (highest authority)
cat docs/screen-examination/{slug}-examination.md 2>/dev/null | head -30

# 2. Business logic spec — WHO/VERB for this role
cat docs/flow-coverage/{slug}/P1-business-logic-inventory.md 2>/dev/null | head -40

# 3. UI specs — expected screen states
cat docs/flow-coverage/{slug}/P5-ui-specs.md 2>/dev/null | head -30

# 4. Design context
cat docs/design-context/{slug}/.impeccable.md 2>/dev/null | head -20

# 5. Grammar from registry
grep -A 3 "{slug}" planning--business-flows-registry.md 2>/dev/null

# 6. MARKET-REFERENCE-CATALOG for per-state rendering conventions
# Section §N where N matches grammar type (§1=G1, §2=G2, etc.)
```

Extract before opening the PNG:
- **WHO:** the persona sentence for the role in this cell
- **VERB:** the one action this person is here to take
- **GRAMMAR:** G1-G7 from .impeccable.md or examination record
- **PHASE:** which business-logic phase this PNG represents

If any of WHO / VERB / GRAMMAR is missing → stop; read source files again.
Do not validate a PNG without knowing what it is supposed to show.

---

## The Template — One Block Per PNG

Copy this block once per PNG. Fill every field. Record the verdict.

```
═══════════════════════════════════════════════════════════════════════════
IMAGE IDENTITY (the 5 axes — every PNG is one specific cell)
═══════════════════════════════════════════════════════════════════════════
flow          : FLOW-XX
slug          : {slug}
screen        : ComponentName
role          : anonymous | public-marketplace-visitor | tenant-user |
                referral-user | freelancer | business-partner |
                event-organiser | tenant-admin | platform-support |
                platform-admin
language      : en | he-RTL | fr
phase         : <flow-specific phase name>
state         : empty | loading | populated | error | success
url           : /path?mock=<state>&role=<role>&lang=<lang>

png_path      : docs/e2e-snapshots/{slug}/<file>.png
last_examined : RUN-<NN>
first_verdict : PASS | CONCERN | BLOCK
current_verdict: PASS | CONCERN | BLOCK

═══════════════════════════════════════════════════════════════════════════
AXIS A — EXTERNAL / INTERNAL FRAMING (shell correctness)
═══════════════════════════════════════════════════════════════════════════
surface_kind  : external-public | external-tenant-module |
                internal-tenant-admin | internal-platform
expected_shell: kiosk | module | admin
actual_shell  : kiosk | module | admin
shell_verdict : PASS | BLOCK   (actual ≠ expected → BLOCK)

Shell rules:
  kiosk  — no sidebar, minimal wordmark, full-width (anonymous / celebratory)
  module — no XIIGen engine sidebar; tenant/module chrome (tenant-user)
  admin  — XIIGen sidebar + full admin chrome (tenant-admin, platform-admin,
            platform-support)

═══════════════════════════════════════════════════════════════════════════
AXIS B — ROLE BRANCHING (the RIGHT content is rendered for THIS role)
═══════════════════════════════════════════════════════════════════════════
expected_verb : <the one action this role is here to take>
                Source: P1-business-logic-inventory.md + ROLE-ANALYSIS-BATCH
primary_cta   : <what the PNG actually shows as primary action>
role_correct  : YES | NO | PARTIAL
labels_role_scoped: YES | NO   (labels + buttons reflect THIS role's context)
forbidden_role_leaks: <list>   (engine nav shown to anon; T-numbers on tenant;
                                 admin actions on consumer role; etc.)
role_verdict  : PASS | CONCERN | BLOCK

BLOCK if: wrong shell for role, forbidden content visible, primary CTA
          does not match expected_verb.

═══════════════════════════════════════════════════════════════════════════
AXIS C — LANGUAGE (the UI speaks this locale correctly)
═══════════════════════════════════════════════════════════════════════════
document_dir  : ltr | rtl   (must match locale; he/ar/fa/ur → rtl)
document_lang : <locale-code>
layout_flips_correctly: YES | NO | N/A
physical_direction_classes: <grep result for ml-*, mr-*, text-left, text-right,
                              left-*, right-* in component file>
translations_present: YES | PARTIAL | NO
numbers_tabular_nums_correct: YES | NO   (numbers stay LTR inside RTL text)
language_verdict: PASS | CONCERN | BLOCK

BLOCK if: rtl locale with ltr layout, or physical-direction classes present
          in component (use logical properties instead).

═══════════════════════════════════════════════════════════════════════════
AXIS D — BUSINESS-LOGIC PHASE + STATE
(MANDATORY for NEEDS_PURPOSE_BUILT_UI flows)
═══════════════════════════════════════════════════════════════════════════
phase_from_P1 : <phase name from P1-business-logic-inventory.md>
state_kind    : empty | loading | populated | error | success
mock_state_url_param: ?mock=<key>   (what produced this PNG)
domain_fields_shown: <list of domain-meaningful fields visible in the PNG>
                     These must come from the business spec, not from the
                     component's internal names. Examples:
                       Good: eventName, registeredCount, capacity
                       Bad:  taskTypeId, processResult, ENGINE_INTERNAL
topology_edge_leak : YES | NO   ('ServiceX → ServiceY when emits...' labels)
state_verdict : PASS | CONCERN | BLOCK

BLOCK if:
  - state is empty/error rendered as the populated representation
  - domain_fields_shown is empty on a populated state
  - topology_edge_leak is YES
  - populated state shows only generic Name/Status/Notes/Actions columns
    backed by /api/dynamic/xiigen-* (UX-30 violation)

For NEEDS_PURPOSE_BUILT_UI flows — verify specifically:
  The purpose-built component is rendered (not AdminCrudPanel default).
  The component shows the declared grammar's content structure.
  At least 3 domain fields from the business spec are visible.

═══════════════════════════════════════════════════════════════════════════
AXIS E — HUMAN-FRIENDLINESS / PLAIN LANGUAGE
═══════════════════════════════════════════════════════════════════════════
visible_acronyms: <count + list>
  Grep for: BFA | DNA | AF[- ]station | arbiter | FREEDOM | MACHINE |
            DLQ | T[0-9]{3} | CF-[0-9]{3} | DataProcessResult |
            scope_isolation | ENGINE_INTERNAL | SCREAMING_SNAKE values |
            camelCase class/method names | /api/ paths | spec filenames |
            ES index names
engineering_leaks: <list of any developer-context strings visible to users>
non_technical_reviewer_test:
  • 'I understand what this feature does': YES | NO
  • 'I can see what I should do next': YES | NO
  • 'Nothing here looks like a developer left it': YES | NO
human_friendly_verdict:
  PASS    — all three YES, 0 acronym leaks
  CONCERN — 1 test NO, 1–2 leaks
  BLOCK   — 2+ tests NO, or 3+ leaks

═══════════════════════════════════════════════════════════════════════════
AXIS F — 5-LAYER UX AUDIT
Authority: /.impeccable.md + SK-541 + ui-ux-pro-max + design-for-ai + critique
═══════════════════════════════════════════════════════════════════════════

— Layer 1 (ui-ux-pro-max P1 accessibility + P2 interaction)
color_not_only          : PASS | BLOCK
aria_labels             : PASS | BLOCK
form_labels             : PASS | BLOCK
heading_hierarchy       : PASS | BLOCK   (h1→h2→h3, no skipping)
loading_buttons         : PASS | BLOCK
error_feedback          : PASS | BLOCK
nav_state_active        : PASS | CONCERN
drawer_usage            : PASS | BLOCK   (sidebar hidden for consumer/public)
touch_target_size       : PASS | CONCERN (≥44×44px on mobile)
layer1_verdict          : PASS | CONCERN | BLOCK

— Layer 2 (design-for-ai 10-tell detection)
tells_count             : 0–2 PASS | 3–5 CONCERN | 6+ BLOCK
tells_present           : <list of triggered tells>
  Checklist:
  □ Inter/Roboto/system-ui as primary — no intentional font choice
  □ Monospace used as lazy "technical" shorthand (outside data cells)
  □ Cyan-on-dark "AI dashboard" palette
  □ Pure #000/#fff throughout (no tint)
  □ Hero metric (big number + small label + gradient card)
  □ Identical card grid (same padding, radius, repeated 6×+)
  □ Centre-everything, no asymmetry
  □ Side-stripe border >1px as visual indicator
  □ Gradient text (background-clip: text + gradient bg)
  □ Emoji-as-action-icons inside buttons
layer2_verdict          : PASS | CONCERN | BLOCK

— Layer 3 (Nielsen H1/H2/H8/H9 — score 0–4 each)
H1_visibility_of_status : 0–4   (0=no feedback; 4=all states clear)
H2_match_real_world     : 0–4   (engineering jargon auto-scores 0 → BLOCK)
H8_aesthetic_minimalist : 0–4   (0=everything competes; 4=nothing decorative)
H9_error_recovery       : 0–4   (0=no errors or cryptic; 4=actionable recovery)
total_score             : N / 16
layer3_verdict          : PASS (≥12) | CONCERN (8–11) | BLOCK (<8 or H1/H2 ≤1)

— Layer 4 (UX-30 grammar verification)
declared_grammar        : PROGRESS_STRIP | VERDICT_GRID | CARD_LIST |
                          TOPOLOGY_CANVAS | KIOSK | DASHBOARD | SETTINGS_TABS
implemented_grammar     : <what the PNG shows as primary content structure>
grammar_matches         : YES | PARTIAL | NO
dyn_crud_table_on_tenant_or_public: YES (→ auto-BLOCK) | NO
layer4_verdict          : PASS | CONCERN | BLOCK

— Layer 5 (interface-design mandate checks)
swap_test               : PASS (typeface/layout swap would be felt) | FAIL
squint_test             : PASS (hierarchy + primary action visible blurred) | FAIL
signature_test          : PASS (5+ domain-signature elements pointable) | FAIL
token_test              : PASS (tokens sound domain-native) | PARTIAL | FAIL
non_tech_reviewer_test  : PASS (all 3 questions YES) | FAIL
layer5_verdict          : PASS (all 5) | CONCERN (1 FAIL) | BLOCK (2+ FAIL)

═══════════════════════════════════════════════════════════════════════════
AXIS G — FOLLOW-UPS
═══════════════════════════════════════════════════════════════════════════
open_items    : <bullet list; each item is one concrete action>
blocked_on    : Luba | architectural-decision | none
owner         : Claude Code
target_run    : RUN-<NN>

═══════════════════════════════════════════════════════════════════════════
FINAL VERDICT FOR THIS PNG
═══════════════════════════════════════════════════════════════════════════
any_block     : YES | NO
any_concern   : YES | NO
overall       : PASS | CONCERN | BLOCK | NOT_YET_EXAMINED
audit_commit  : <git hash of run that produced this audit>
```

---

## Operational Procedures

### Fresh PNG (never examined)

1. Run Step 0 — read ground truth for the flow.
2. Copy template block above.
3. Fill IMAGE IDENTITY axes (flow/slug/screen/role/language/phase/state).
4. Open the PNG.
5. Run Axis A → G top to bottom — record each verdict.
6. Set overall verdict.
7. Append completed block to `docs/screen-examination/ROUND-2-COVERAGE-MATRIX.json`.
8. If any BLOCK: write one focused fix (one finding per run per REPAIR-GUIDANCE §8).

### Re-examination after a fix

1. Find prior entry in `ROUND-2-COVERAGE-MATRIX.json`.
2. Update `last_examined`, `current_verdict`, any axis that changed.
3. Note the new `audit_commit`.
4. If overall moves to PASS: update the examination record for the flow.

### Batch audit across many PNGs

Use grep commands to identify which flows carry which failure patterns:

```bash
# Find UX-30 violations (CRUD table on tenant/public pages)
grep -rl "api/dynamic/xiigen-" client/src/pages/ | xargs grep -l "<table\|TableRow"

# Find engineering leaks
grep -rn "BFA\|DNA-[1-9]\|AF.station\|ENGINE_INTERNAL\|T[0-9]{3}\b" \
  client/src/pages/ --include="*.tsx"

# Find sidebar on consumer pages
grep -rn "isConsumerShell\|SidebarLayout\|AdminLayout" client/src/pages/ \
  --include="*.tsx" | grep -v "= true\|admin\|platform"

# Find physical direction classes (RTL failures)
grep -rn "text-left\|text-right\|ml-\|mr-\|left-\|right-" \
  client/src/pages/ --include="*.tsx"
```

Create one template block per (flow × role × language × state) where a grep hit
is found, with the relevant axis set to BLOCK.

---

## Relationship to Other Skills

| Skill | Relationship |
|-------|-------------|
| SK-541 screen-craft-audit | SK-541 runs at Phase 7 Step 5 for pages just built. SK-549 runs on any PNG at any time. SK-549 Axes A/B/D are not covered by SK-541. |
| SK-542 flow-ui-examination-protocol | SK-542 orchestrates the session. SK-549 is the per-image protocol within that session. |
| SK-550 visual-examination-round | SK-550 organises rounds and convergence. SK-549 produces the cell entries that SK-550 counts. |
| SK-551 coverage-matrix | SK-549 produces one block per PNG. SK-551 manages the coverage matrix where those blocks live. |
| SK-543 work-scope-inventory | SK-543 counts flows. SK-549 counts cells (flow × role × language × state) — a finer granularity. |

---

## Convergence Criterion Correction

The ROUND-CONVERGENCE.json itself states:

> "The convergence criterion should be 'score-delta < 1% AND
> coverage_NOT_YET_EXAMINED = 0' — otherwise we are just converging
> on the automatable subset."

This skill enforces the second condition. A round cannot declare convergence
unless every flow's primary populated state (primary role × en × populated)
has a completed SK-549 block with overall ≠ NOT_YET_EXAMINED.

Flows flagged NEEDS_PURPOSE_BUILT_UI in their examination record additionally
require Axis D to be PASS before the flow can be declared converged.

---

## Anti-Patterns

```
❌ "The grep score is 0 — this flow passed"
   → grep score measures automatable axes only. Axis D (functional content)
     requires visual inspection. Run SK-549 Axis D before claiming PASS.

❌ "We rescored 21 of 45 flows — we have 53% improvement"
   → Only cells with completed SK-549 blocks count toward coverage.
     Extrapolated scores are estimates, not audits.

❌ "The examination record says NEEDS_PURPOSE_BUILT_UI was fixed"
   → The examination record records planned fixes, not verified fixes.
     Until SK-549 Axis D is PASS with audit_commit, the fix is unverified.

❌ Opening a PNG before reading P1-business-logic-inventory.md
   → You cannot audit Axis B or D without knowing what the screen
     is supposed to show. Read ground truth first.
```
