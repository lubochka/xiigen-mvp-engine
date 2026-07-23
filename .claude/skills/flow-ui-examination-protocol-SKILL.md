---
name: flow-ui-examination-protocol
version: "1.0.0"
sk_number: SK-542
load_order: 5.3
category: planning
updated: "2026-04-20"
contexts: ["web-session", "claude-code"]
---

# SK-542 Flow UI Examination Protocol — Session orchestrator for screen work

## When to invoke

- At session start for any session **examining, repairing, or rebuilding** a flow's React pages
- Before SK-540 (load_order 5.4) and SK-539 (load_order 5.5)
- Whenever a flow's PNGs, page files, or examination record are the subject of work

SK-542 is **conditional**: it fires for screen examination/repair sessions. Sessions
producing only new pages with no examination of existing pages do not need SK-542 — they
go directly to SK-540 at 5.4.

## What this skill does

Loads four companion documents, checks for a prior examination record, routes the session
to the correct procedure (SK-540 for first-time design, SK-541 for audit), and enforces
one-finding-per-run discipline. It does not perform the examination itself — that is SK-541.
It ensures the session starts with the right context rather than re-discovering it.

---

## Step 1 — Load companion documents (5 minutes total)

Read in this order:

**1. `docs/screen-examination/REPAIR-GUIDANCE.md`**
Read Part 1 (spec sources), Part 3 (decision tree), Part 4 (build standard), Part 8
(what not to do). Parts 2, 5, 6, 7 are reference — read on demand during Step 3 classification.

**2. `docs/screen-examination/SPEC-LOCATION-MAP.md`**
Read the 6-file table and resolution rule. Bookmark for Step 2.

**3. `docs/screen-examination/MARKET-REFERENCE-CATALOG.md`**
Scan the grammar groupings table. Read the specific section for this flow's grammar type.
The per-state rendering notes answer "what does the empty/populated/error state look like?"
without asking the user.

**4. `planning--business-flows-registry.md`**
Find the row for this flow. Read: grammar, CFI notes, examination record presence, F4 spec
availability.

---

## Step 2 — Read the flow's spec files

Using `docs/screen-examination/SPEC-LOCATION-MAP.md` as the read order:

```bash
# F1 — user intent (verbatim)
grep -A 5 "user_intent" docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md

# F2 — process + state list
head -60 docs/sessions/FLOW-XX/UI-REFLECTION-STATE.md

# F3 — roles (batch from planning--business-flows-registry.md)
grep -A 25 "FLOW-XX\|{slug}" docs/design-reviews/ROLE-ANALYSIS-BATCH-NN.md 2>/dev/null | head -25

# Examination record (read before F4-F6 — this is ground truth where present)
cat docs/screen-examination/{slug}-examination.md 2>/dev/null | head -60

# F6 — reconciliation (check verdict before reading F4/F5)
grep "Verdict\|verdict\|DEMONSTRABLY" \
  docs/sessions/FLOW-XX/FLOW-XX-RECONCILIATION-STATE.md 2>/dev/null | head -5
```

**F6 resolution rule:** If verdict = DEMONSTRABLY_WRONG, do not use existing components as
the baseline. Base the UI on F1 + F2 + F3 + F4 instead.

**CFI-12 halt (FLOW-04, FLOW-09, FLOW-34):** if this flow has a CFI-12 flag in the registry,
halt and request spec alignment from Luba before any UI work. F1 contradicts slug and pages.

---

## Step 3 — Classify the work

From the companion documents and spec reads, classify the session's primary finding:

| Classification | Severity | What to do |
|---------------|----------|-----------|
| NEEDS_PURPOSE_BUILT_UI | P0 | Throw out CRUD table. Build new page using spec + states + grammar reference. |
| NEEDS_ERROR_HANDLING | P0 | Add specific error message + retry action. Never "Failed to fetch". |
| NEEDS_EMPTY_STATE | P1 | Add empty state with domain-appropriate explanation + CTA. |
| NEEDS_LABEL_SANITISATION | P1 | Replace all T-numbers/CF-numbers/task IDs with plain language. |
| NEEDS_ROLE_BRANCH | P1 | Each declared role needs its own view scoped to that role's task. |
| CFI-05 PAGE_REWRITE | P0 | Page wrapper defaults to AdminCrudPanel despite purpose-built component existing. Apply FLOW-45 RUN-52 template. |
| PASSES | — | Capture PNG evidence. Add inventory row. Move on. |

**CFI-05 Page rewrite template (from FLOW-45 RUN-52):**

```tsx
// Pattern: PlatformOpsPage wrapping purpose-built screen
// ?mock=<state-key>  → BusinessStateCard for each canonical state
// no ?mock           → PlatformOpsPage wrapping the purpose-built screen
//                      with populated seed data (6–10 records)
```

Apply this pattern to:
- FLOW-36 → `FeatureMatrixScreen` (G3 CARD_LIST)
- FLOW-37 → `StackPortingScreen` (G2 VERDICT_GRID)
- FLOW-38 → `RagQualityScreen` (G6 DASHBOARD)
- FLOW-39 → `OssCurriculumScreen` (G1 PROGRESS_STRIP)
- FLOW-40 → `ClientPushScreen` (G3 CARD_LIST)

---

## Step 4 — Route to the correct skill

| Work type | Next skill |
|-----------|-----------|
| Designing new page for first time (no `.impeccable.md`) | SK-540 (design context) → SK-539 §1 (compliance) |
| Auditing or repairing existing page | SK-541 (screen craft audit) → REPAIR-GUIDANCE Part 2 |
| Verifying after repair | SK-541 Layer 4 grammar check → Phase 7 → SK-541 full audit |
| Capturing PNG evidence | Playwright spec with `?mock=<state-key>` param → PNG-INVENTORY.md row |

**Routing logic:**

```bash
# Does .impeccable.md exist for this flow?
cat docs/design-context/{slug}/.impeccable.md 2>/dev/null | head -3

# If absent → run SK-540 first
# If present → skip SK-540; run SK-541 for audit layers
```

---

## Step 5 — One-finding-per-run discipline

Per REPAIR-GUIDANCE.md Part 8: fix one finding per run. This prevents compounding
regressions and keeps each PNG cleanly attributable to one change.

Write the finding in the session record **before touching any code**:

```
Finding:        {classification} for {slug} / {PageName}
Source evidence: {spec file + quote, or examination record + primary finding}
Fix:            {one specific code change}
PNG gate:       populated state for {role} using ?mock={state-key}
```

Do not fix more than one finding per run. After the single fix is committed and the PNG
gate passes, close the run and start a new one for the next finding.

---

## Step 6 — PNG gate

After the fix is applied:

```bash
# Run Playwright spec with populated mock state
npx playwright test client/e2e/{slug}.spec.ts

# Verify PNG shows populated state (not empty, not error)
ls docs/e2e-snapshots/{slug}/*.png
```

PNG gate requirements (per REPAIR-GUIDANCE Part 4):
1. A non-technical reviewer can read the screen and state what the flow does
2. Primary action matches what the spec says the user is here to do
3. No engineering identifiers visible (T-numbers, CF-numbers, API paths, spec file names)
4. At least one non-default state shown (use `?mock=` param — not the default empty render)

---

## Integration with SK-540 and SK-541

SK-542 is the **session orchestrator**. It does not replace SK-540 or SK-541.

```
SK-542 (5.3) — loads context, classifies work, routes
    ↓
SK-540 (5.4) — design context gate (if .impeccable.md absent)
    ↓
SK-539 (5.5) — compliance gate (Section 0 + role questions)
    ↓
[implementation]
    ↓
SK-541 (Phase 7 Step 5) — four-layer PNG audit
    ↓
FC-18 Audit Trail
```

SK-542 must load its four companion documents and classify the work before SK-540 or
SK-539 run. The examination record it finds (or confirms absent) determines whether
SK-540 runs at all.
