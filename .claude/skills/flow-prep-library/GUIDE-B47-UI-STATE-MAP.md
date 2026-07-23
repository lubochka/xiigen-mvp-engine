# GUIDE-B47 — How to Produce the UI State Map Section
## Within `FLOW-XX-STEP-9-VISIBILITY.md` and `UI-REFLECTION-STATE.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 57 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any UI state map):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file guides the production of the **UI State Map** section — the document
that maps each task type's visible business states across roles, design tokens,
and guard mechanisms. The UI state map spans two file families:
`FLOW-XX-STEP-9-VISIBILITY.md` (the planning section) and
`UI-REFLECTION-STATE.md` (the post-implementation audit record).

---

## STEP 0 — EXAMINATION RECORD + GRAMMAR TYPE (NEW — run first)

Before producing any state map entries, check for an examination record and
confirm the grammar type declared for this flow:

```bash
# Check examination record
cat docs/screen-examination/{slug}-examination.md 2>/dev/null | grep -A 5 "## Grammar"
# If present: use the declared grammar type (G1-G7) as the primary content structure.
#   The examination record states which states already exist as PNGs, which are
#   missing, and which are misclassified. Use this to populate the state map.

# Confirm grammar from registry
grep -A 3 "{slug}" planning--business-flows-registry.md 2>/dev/null
# Registry pre-declares the grammar. Use to cross-check examination record.

# Check MARKET-REFERENCE-CATALOG for per-state rendering conventions
# Path: docs/screen-examination/MARKET-REFERENCE-CATALOG.md
# Section: §{N} where N corresponds to the grammar type (§1=G1, §2=G2, etc.)
# For each business state: the catalog names how the reference platform
# (e.g. Vercel, Stripe, n8n) renders that state. Use this to specify
# what the populated/error/empty states should look like.
```

**Grammar → MARKET-REFERENCE-CATALOG section mapping:**
- G1 PROGRESS_STRIP → §1 (Vercel/GitHub Actions per-phase rendering)
- G2 VERDICT_GRID → §2 (Linear/PR diff per-cell state)
- G3 CARD_LIST → §3 (Stripe/Trello per-card state badge)
- G4 TOPOLOGY_CANVAS → §4 (n8n per-node state colour)
- G5 KIOSK → §5 (Stripe Checkout per-step state)
- G6 DASHBOARD → §6 (Stripe Dashboard metric + chart states)
- G7 SETTINGS_TABS → §7 (Notion/Vercel settings tab states)

The grammar type determines the structure of every state entry below.
A G1 flow has phase-strip states. A G3 flow has card-badge states.
Do not produce generic "loading/populated/error" entries — produce
grammar-specific states that match how the reference platform renders them.

---

## WHAT THIS GUIDANCE COVERS

The UI state map answers: "For each task type that has a user-visible surface,
what are the distinct business states a user can observe, which roles see each
state, and what visual/guard mechanism controls visibility?"

**The two files this guidance covers:**

| File | When produced | Purpose |
|------|--------------|---------|
| `FLOW-XX-STEP-9-VISIBILITY.md` (state map section) | During simulation (Step 9) | Planned state coverage — what states SHOULD exist |
| `UI-REFLECTION-STATE.md` | Post-implementation audit | Actual state coverage — what states DO exist in the code |

**What the UI-REFLECTION-STATE records:**
Per task type: file path, events emitted/consumed, React components, hooks, client tests, e2e tests, and **5 state indicators** (initiate, in_progress, result, error, next_step). The verdict is one of: `FULL_UI`, `PARTIAL_UI`, `NO_UI`, `INTERNAL_ONLY`, `EVENT_ONLY_NO_OBSERVER`.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-14 | PRIMARY | `.claude/skills/design-system/references/states-and-variants.md` — 6 interactive states (default/hover/focus/active/disabled/loading), state priority order, transition durations (color 150ms, transform 200ms), error state CSS variables, disabled treatment, ARIA state annotations |
| ZIP-14 | PRIMARY | `src/ui-ux-pro-max/data/ux-guidelines.csv` — 50+ UX guidelines per category: Navigation/Forms/Feedback/Accessibility/Layout. Each row: Issue, Platform, Description, Do, Don't, Code Example |
| ZIP-14 | PRIMARY | `src/ui-ux-pro-max/data/app-interface.csv` — mobile/cross-platform interaction patterns: accessibility labels, form control labels, role/traits, dynamic updates per state |
| ZIP-14 | REFERENCE | `.claude/skills/design-system/references/semantic-tokens.md` — `--color-success`, `--color-warning`, `--color-destructive` for state visual tokens |
| ZIP-15 | PRIMARY (§3) | `XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE.md` §3 — 5 structural templates: which roles exist per flow type; determines which roles appear in the state map |
| ZIP-15 | PRIMARY (§4) | §4 — Role Relationship Types (HIERARCHY, CONTEXT, TENANT-CONFIG, MUTUAL_EXCLUSIVE, DELEGATION): determines which role interactions require guard mechanisms |
| ZIP-15 | PRIMARY (§5 Level 3) | §5 Level 3 — Panel-Level Visibility (C24): same route, same screen, different panels per role |
| ZIP-17 | PRIMARY | `FLOW-46/UI-REFLECTION-STATE.md` — canonical production example: 7 task types, per-process format (Summary + Per-Process Verdict Table + Process Details with 5 state indicators), verdicts (FULL_UI/PARTIAL_UI/INTERNAL_ONLY) |
| ZIP-17 | PRIMARY | `FLOW-01/UI-REFLECTION-STATE.md` — 3 task types; shows PARTIAL_UI (missing initiate state) and n/a for next_step on single-step service |
| ZIP-17 | PRIMARY | `docs/ux-review/UX-REVIEW-ROLLUP.md` — **FP-2 evidence**: flows with byte-identical PNGs = 1 state captured for all phases; only 5 of 47 flows rated ✅ shippable |

---

## OUTPUT FILE SPECIFICATION

**For the planning section:**
Added as `## UI STATE MAP` section within:
`docs/sessions/FLOW-XX/FLOW-XX-STEP-9-VISIBILITY.md`

**For the audit record:**
`docs/sessions/FLOW-XX/UI-REFLECTION-STATE.md`
`docs/sessions/FLOW-XX/UI-REFLECTION-STATE.json`

---

## THE MINIMUM STATE REQUIREMENT (C32/FP-2) — MANDATORY

**Every flow's UI state map must document ≥3 distinct visible states per role.**

States must produce **visibly different output** — not just different data in the
same layout. Each state's distinctness must be explicitly noted.

**Acceptable distinct states (examples from ZIP-17):**
- `initiate` — form/button to start the action
- `in_progress` — loading spinner or "Running…" text
- `result` — populated data or success confirmation
- `error` — error message with specific error code
- `next_step` — actionable next step prompt or navigation

**FAILS the minimum state requirement (FP-2 evidence):**
- All PNGs byte-identical → 1 state captured despite N labeled phases
- Only "Loading..." spinner → 1 functional state
- CRUD table on every screen → no business-phase-specific state

**If a flow cannot produce ≥3 distinct states for a role:** declare
`NEEDS-CONTEXT` with explanation. Example: a pure background processing flow
with no tenant-facing surface has only INTERNAL_ONLY — document this explicitly.

**Cross-cutting substrate flows (Cluster 3):** When a role's UI states surface through
host flows rather than through the flow's own owned pages (e.g., anonymous users seeing
ads from FLOW-20 inline in FLOW-08/FLOW-17 feeds), NEEDS-CONTEXT is the correct verdict.
Declare which host flow provides the states: "NEEDS-CONTEXT: anonymous ad-consumer states
surface through FLOW-08 and FLOW-17 feed pages, not through FLOW-20's owned surfaces."
Do NOT mark this as FAIL — cross-cutting substrate role surfacing is by design. *(G6 — R64)*

---

## THE FIVE STATE INDICATORS

Every task type in the UI state map gets evaluated on five state indicators:

| Indicator | What it means | Typical UI element |
|-----------|---------------|-------------------|
| `initiate` | User can trigger this task type | Button, form submit |
| `in_progress` | In-flight state is shown | Spinner, "Running…" |
| `result` | Output is displayed | Data card, success message |
| `error` | Failure state is shown | Error message, alert |
| `next_step` | Next action is available | CTA, navigation link |

**Verdict logic:**
```
All 5 present → FULL_UI
Some present, some missing → PARTIAL_UI (note which are missing)
None present, UI exists but only admin → INTERNAL_ONLY
No React components at all → NO_UI or EVENT_ONLY_NO_OBSERVER
next_step = N/A for single-step flows (not counted as missing)
```

---

## UI-REFLECTION-STATE.MD FORMAT

```markdown
# FLOW-XX [slug] - UI Reflection State

_Generated: [YYYY-MM-DD] | Branch: [branch-name]_

## Summary
- Total processes: [N]
- FULL_UI: [N] | PARTIAL_UI: [N] | NO_UI: [N] | INTERNAL_ONLY: [N] | EVENT_ONLY_NO_OBSERVER: [N]

## Per-Process Verdict Table

| processId | initiate | in_progress | result | error | next_step | verdict | missing |
|-----------|----------|-------------|--------|-------|-----------|---------|---------| 
| T[NNN]-[ServiceName] | Y/. | Y/. | Y/. | Y/. | Y/./n/a | [verdict] | [list missing states or -] |

## Process Details

### T[NNN]-[ServiceName] ([ClassName])
- File: `server/src/engine/flows/[slug]/[filename].service.ts:[line]`
- Events emitted: [CloudEvent names, comma-separated]
- Events consumed: [if applicable]
- Endpoints: [HTTP method + route, comma-separated]
- React components: [file paths, comma-separated]
- Hooks: [file paths, or _none_]
- Client tests: [test file paths, or _none_]
- E2E tests: [e2e spec paths, or _none_]
- State indicators:
  - **initiate**: [YES - [file:line] - [code excerpt that shows initiate state] | no ([reason])]
  - **in_progress**: [YES - [file:line] - [code excerpt] | no ([reason])]
  - **result**: [YES - [file:line] - [code excerpt] | no ([reason])]
  - **error**: [YES - [file:line] - [code excerpt] | no ([reason])]
  - **next_step**: [YES - [file:line] - [code excerpt] | no ([reason]) | n/a ([why n/a])]
- **Verdict**: [FULL_UI | PARTIAL_UI | NO_UI | INTERNAL_ONLY | EVENT_ONLY_NO_OBSERVER]
- Missing: [list missing state names or -]
```

---

## UI STATE MAP SECTION IN STEP-9-VISIBILITY.MD

The planning-phase UI state map goes inside STEP-9-VISIBILITY.md as an additional
section. It declares the **intended** states before implementation, using the format:

```markdown
## UI STATE MAP (C32/FP-2 — ≥3 distinct states per role required)

**State count verification:** [N] roles × ≥3 states = [N×3] minimum entries required.

---

### State: [business state name]
```
State: [business logic state name — e.g., TicketPurchase_InProgress]
Roles affected: [from ZIP-15 §1 — e.g., ROLE-1 (authenticated attendee), ROLE-1-ORGANIZER]
Panels visible:
  ROLE-1 (attendee): [panel list — e.g., payment-form, event-summary-header]
  ROLE-1-ORGANIZER:  [panel list — e.g., capacity-counter, sales-dashboard (read-only)]
Design token: [from ZIP-14 semantic-tokens.md — e.g., --color-warning for in_progress]
Guard: [from ZIP-15 §4 — e.g., CONTEXT relationship: same user sees different panels based on ownership]
Minor user override: [if applicable — e.g., payment form hidden for ROLE-STUDENT]
State distinctness note: [how this state differs from the ≥2 other states for this role]
```

### State: [second state]
[same format]

### State: [third state]
[same format]

**Minimum state count check:**
| Role | State 1 | State 2 | State 3 | State 4+ | Count | PASS/NEEDS-CONTEXT |
|------|---------|---------|---------|----------|-------|--------------------|
| ROLE-1 (attendee) | initiate | in_progress | result | error | 4 | PASS |
| ROLE-1-ORGANIZER | result | error | — | — | 2 | NEEDS-CONTEXT: organizer sees read-only view only |

---

**NEEDS-CONTEXT declarations:**
[For any role with <3 states: explain why and what would be needed to reach 3]
```

---

## HOW TO PRODUCE UI-REFLECTION-STATE.MD

This file is generated after implementation by scanning the actual codebase:

### Step 1 — Find all services for this flow

```bash
SLUG="[slug]"
find server/src/engine/flows/$SLUG -name "*.service.ts" | sort
```

### Step 2 — For each service, check the 5 state indicators

```bash
SERVICE="[filename].service.ts"

# initiate: does a React component have a submit/trigger for this service?
grep -rn "onSubmit\|handleSubmit\|data-testid.*submit\|navigate.*register" client/src \
  --include="*.tsx" --include="*.ts" | grep -i "$SLUG" | head -3

# in_progress: does any component show loading/submitting state?
grep -rn "loading\|submitting\|SUBMITTING\|Running\|spinner" client/src \
  --include="*.tsx" | grep -i "$SLUG" | head -3

# result: does any component render the service's output?
grep -rn "data-testid.*result\|data-testid.*session\|.then\|setData" client/src \
  --include="*.tsx" | grep -i "$SLUG" | head -3

# error: does any component render error state?
grep -rn "errorCode\|setError\|data-testid.*error\|catch.*set" client/src \
  --include="*.tsx" | grep -i "$SLUG" | head -3

# next_step: does any component navigate or show next action?
grep -rn "navigate\|next_step\|ActionCard\|nextStep" client/src \
  --include="*.tsx" | grep -i "$SLUG" | head -3
```

### Step 3 — Assign verdict

```python
def verdict(indicators):
    present = sum(1 for v in indicators.values() if v and v != 'n/a')
    total = sum(1 for v in indicators.values() if v != 'n/a')
    
    if present == 0:
        return 'NO_UI'  # or EVENT_ONLY_NO_OBSERVER if events exist
    elif present == total:
        return 'FULL_UI'
    else:
        return 'PARTIAL_UI'

# INTERNAL_ONLY: service has no React components, no client tests
# EVENT_ONLY_NO_OBSERVER: service emits events but no UI observes them
```

### Step 4 — Apply FP-2 minimum state check

After collecting all verdicts, verify that TENANT_FACING flows have at least one
task type with `FULL_UI` verdict — meaning at least 5 distinct business states are
visible. If all task types are `PARTIAL_UI` or `INTERNAL_ONLY`, the flow fails the
minimum state requirement.

---

## ZIP-14 STATE VOCABULARY INTEGRATION

From `states-and-variants.md`, the six interactive states map to business states:

| ZIP-14 state | Business state mapping | Design token |
|--------------|----------------------|--------------|
| `default` | No interaction yet / uninitiated | `--color-secondary` |
| `loading` | `in_progress` — async action running | `--color-muted` + spinner |
| `active` | Active selection, `result` pending | `--color-primary-active` |
| `focus` | User is in the form field (initiate phase) | `--color-ring` |
| `disabled` | Guard blocked — role lacks permission | `opacity: 0.5` + `not-allowed` |
| `error` | `error` state — validation or server failure | `--color-error` = `--color-destructive` |

**From `ux-guidelines.csv`:** Every state transition should provide visual feedback:
- `in_progress` → loading indicator within 100ms of trigger
- `error` → positioned below the field that caused it; icon for accessibility
- `result` → clear success signal; navigation option for `next_step`

**From `app-interface.csv`:** Dynamic state updates must use `accessibilityLiveRegion`
or `announceForAccessibility` so screen readers announce state changes.

---

## ACCEPTANCE CRITERIA

Before the UI state map is considered complete:

**For the planning section (in STEP-9-VISIBILITY.md):**
- [ ] ≥3 distinct states documented per role (C32/FP-2 minimum state requirement)
- [ ] State distinctness note present for each state
- [ ] Design token from ZIP-14 semantic-tokens.md cited per state
- [ ] Guard mechanism from ZIP-15 §4 cited per state
- [ ] Minimum state count check table present
- [ ] NEEDS-CONTEXT declarations for any role with <3 states

**For the audit record (UI-REFLECTION-STATE.md):**
- [ ] Summary section with verdict counts
- [ ] Per-Process Verdict Table with all task types
- [ ] Process Details with all 5 state indicators + code citations (file:line)
- [ ] next_step = n/a acceptable for single-step services
- [ ] INTERNAL_ONLY tasks explicitly documented (not silently omitted)
- [ ] Verdicts consistent with FP-2: at least one FULL_UI for TENANT_FACING flows

---

## KEY RULES

**1. State distinctness is binary, not gradient.**
"Loading state with different data" is NOT a distinct state. A distinct state
means a visibly different UI structure — different panels visible, different
components rendered, different interaction affordances available.

**2. The ≥3 minimum applies to each role independently.**
If ROLE-1 (tenant user) has 4 states but ROLE-PLATFORM-ADMIN has 1 state
(read-only dashboard), ROLE-PLATFORM-ADMIN fails the minimum independently.
Apply the check per role, not per flow.

**3. INTERNAL_ONLY is a valid verdict — never leave it undocumented.**
Services like T651-AgentIntakeService (internal intent normalizer) have no UI.
Documenting them as INTERNAL_ONLY is correct. Silently omitting them from the
UI-REFLECTION-STATE creates a gap that looks like the reflection was incomplete.

**4. The code citations (file:line) in Process Details are mandatory.**
"YES - initiate state exists" without a file:line citation is unverifiable.
The citation is what allows the next session to verify the state indicator
is still present after code changes.

**5. FP-2 is a fleet-wide finding — apply to every flow.**
The UX-REVIEW-ROLLUP found that only 5 of 47 flows were rated ✅ shippable.
The dominant failure was byte-identical PNGs = effectively 1 state for all
labeled phases. The minimum state requirement is the design-time gate that
prevents this before implementation begins.

---

*End of GUIDE-B47 — UI State Map sections*
*List A sources: ZIP-14 (states-and-variants.md — 6 interactive states + transitions,*
*ux-guidelines.csv — 50+ UX guidelines per state category,*
*app-interface.csv — mobile accessibility per state, semantic-tokens.md — state design tokens),*
*ZIP-15 §3 (structural templates for role identification), §4 (guard mechanisms),*
*§5 Level 3 (panel-level visibility per role),*
*ZIP-17 (FLOW-46 UI-REFLECTION-STATE.md canonical format, FLOW-01 partial example,*
*UX-REVIEW-ROLLUP.md FP-2 byte-identical PNG evidence)*
*Target B-type: B-47 — UI State Map section in STEP-9-VISIBILITY.md + UI-REFLECTION-STATE.md*
*Round: 57 of 72*
