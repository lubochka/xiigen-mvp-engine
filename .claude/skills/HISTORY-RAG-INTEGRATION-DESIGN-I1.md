# HISTORY-RAG-INTEGRATION-DESIGN-I1
## Integration Round I1 — Q-21, Q-22, Q9 Step 5, Mistake 21
## Date: 2026-04-19 | Status: READY FOR EXECUTION
## Applies to: XIIGEN-CODEBASE-ORIENTATION-MAP (→ D3) + XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE (→ D4)
## Source: HISTORY-RAG-INDEX.md + ARCHITECTURAL-DECISION-ADDENDUM.md

---

## Purpose

This document specifies the EXACT text additions needed to wire the RAG index
into the two session governance files. These specifications feed directly into
Rounds D3 and D4 (final document production). No session files are modified here —
this is the design-only specification.

---

## §1 — ORIENTATION-MAP v1.1: Q-21 and Q-22

### Insertion Point (confirmed from live v1.0 file)

Insert after line 382 (the `---` that closes Q-20), before line 384 (`## 4. Document
Authority Hierarchy`).

**Exact surrounding context (lines 379–384 of v1.0):**
```
grep -A 3 "FLOW-XX\|{slug}" CARRY-FORWARD-ISSUES.md
```

---

## 4. Document Authority Hierarchy
```

**Q-21 and Q-22 insert between these two lines.**

---

### Q-21 — Historical precedent or prior decision for a topic

Exact text to insert:

```markdown
### Q-21 — Historical precedent or prior architectural decision

```bash
# Keyword search across all historical fixture files
grep -ril "{keyword}" fixtures/rag-patterns/hist_*.json \
  fixtures/design-reasoning/historical/hist_*.json

# Navigate by theme cluster (12 clusters)
grep -i "{keyword}" docs/sessions/historyRag/HISTORY-RAG-INDEX.md

# Show all decisions for a specific flow
grep -A 20 "^\*\*FLOW-XX\*\*" docs/sessions/historyRag/HISTORY-RAG-INDEX.md

# Show lock candidates (D-HIST namespace proposals)
grep "D-HIST\|⭐⭐🔒\|qs=0.97" docs/sessions/historyRag/HISTORY-RAG-INDEX.md | head -20

# Show all locked decisions (Batch J — 25 decisions)
ls fixtures/design-reasoning/historical/hist_locked_*.json

# Show engine architecture gap decisions (Batch I — highest tier)
ls fixtures/design-reasoning/historical/hist_gap_review_*.json
```

**Primary:** `docs/sessions/historyRag/HISTORY-RAG-INDEX.md`
**Secondary:** `fixtures/rag-patterns/hist_*.json` (61 ARCH_PATTERN) +
              `fixtures/design-reasoning/historical/hist_*.json` (124 DESIGN_REASONING)
**When:** Any architect question about prior decisions, lock candidates, or cross-flow
architectural patterns. Fires BEFORE synthesis when the question class is known.
**Note:** 186 decisions indexed across 12 theme clusters. Q9 Step 5 uses §3 per-flow
table for flow-specific lookup. Q-21 covers cross-flow and engine-level questions.
```

---

### Q-22 — Principle for AI context package design

Exact text to insert:

```markdown
### Q-22 — Principle for AI context package design

```bash
cat docs/flow-plan-preparation/XIIGEN-ARCHITECTURAL-DECISION-ADDENDUM.md
# Key sections:
#   THE GOVERNING QUESTION — "Am I making this decision for the AI..."
#   THE TWO FAILURE MODES — Over-Prescription vs Under-Specification
#   THREE-SIGNAL TEST — how to detect genuine convergence
```

**Primary:** `docs/flow-plan-preparation/XIIGEN-ARCHITECTURAL-DECISION-ADDENDUM.md`
**When:** Any session authoring AF pipeline prompts, genesis prompts, context packages,
or NODE convergence designs. Mandatory read before authoring any prompt that will be
sent to a generator model.
**Governing question (verbatim):** "Am I making this decision for the AI, or am I giving
the AI the minimum it needs to make the decision itself?"
```

---

### Complete insertion block (Q-21 + Q-22 together)

The two questions are inserted as a single block between Q-20's closing `---` and
`## 4. Document Authority Hierarchy`.

Exact block to insert at line 383:

```
### Q-21 — Historical precedent or prior architectural decision

[Q-21 content from above]

---

### Q-22 — Principle for AI context package design

[Q-22 content from above]

---

```

The final `---` above becomes the separator before `## 4. Document Authority Hierarchy`.

---

## §2 — SESSION-GUIDE v1.6: Q9 Step 5

### 2a — Header change

**Current line 64:**
```
Execute these four reads in order before any synthesis. Each read counts toward the SK-529 ARCHITECT threshold (20/8/10).
```

**Replace with:**
```
Execute these four reads in order before any synthesis (plus conditional Step 5 if historical decisions exist for the flow). Each read counts toward the SK-529 ARCHITECT threshold (20/8/10).
```

---

### 2b — New Step 5 table row

**Current Q9 table (lines 65–70):**
```
| Step | Read | What it answers |
|------|------|----------------|
| 1 | `docs/XIIGEN_PRODUCT_SPECS.md` §FLOW-XX | Product intent, business logic, entities, user journey, cross-flow correlations |
| 2 | `docs/sessions/FLOW-XX/FLOW-XX-RECONCILIATION-STATE.md` | What is actually built vs. what is designed — the implementation reality |
| 3 | `docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R1.md` §ROUND 1 | Original design decomposition and design decisions |
| 4 | `docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md` row for FLOW-XX | Track A (topology), Track B (marketplace wiring), Track C (e2e) — observable readiness |
```

**Append after Step 4 row:**
```
| 5 (conditional) | `docs/sessions/historyRag/HISTORY-RAG-INDEX.md` §3 row for FLOW-XX | Prior architectural decisions not visible in design simulation — race condition guards, DPO training rules, security invariants, lock candidates |
```

---

### 2c — Step 5 execution block

**Insert after the "What's observable" bullet and before `**Contribution to threshold:**`**

Current line 79:
```
**Contribution to threshold:** 4 of the 20 ARCHITECT file reads. Combined with the 8 Tier-0 reads from SK-529 §10, the session has 12 reads complete — 60% of threshold — before any flow-specific or task-specific reconnaissance begins.
```

**Insert this block before line 79:**
```markdown
**Step 5 execution (conditional):**
```bash
grep -A 25 "^\*\*FLOW-XX\*\*" docs/sessions/historyRag/HISTORY-RAG-INDEX.md
```
- Entries found → read ⭐⭐ and 🔒 entries first; load the named fixture(s)
- `(none)` → Step 5 complete with zero reads
- Each fixture read counts as +1 toward ARCHITECT threshold

**Per-flow historical decision counts (reference):**
- FLOW-01: 9 decisions | FLOW-02: 10 decisions | FLOW-03: 7 decisions
- FLOW-04: 7 decisions | FLOW-05: 6 decisions  | FLOW-07: 4 decisions
- FLOW-09: 6 decisions | Flows 08/10/15/18/26/33: 1–3 decisions each
- Flows 11–14, 16–17, 19–25, 27–32, 34–47: 0 decisions (⟹ Step 5 = skip)
```

---

### 2d — Updated Contribution to threshold line

**Replace line 79 with:**
```
**Contribution to threshold:** Steps 1–4 = 4 of the 20 ARCHITECT file reads. Step 5 adds N reads (where N = number of historical fixtures loaded). Combined with the 8 Tier-0 reads from SK-529 §10, the session has 12+N reads complete before any flow-specific or task-specific reconnaissance begins.
```

---

### 2e — Updated Q9 artifact schema

**Current schema (lines 88–95):**
```
Q9 — Flow named: [FLOW-XX | none]
  Step 1 (product specs): [read | skipped — no flow named]
  Step 2 (reconciliation state): [read | skipped]
  Step 3 (design simulation R1): [read | skipped]
  Step 4 (47-flow matrix row): [read | skipped]
  Threshold contribution: [4 reads | 0 reads] toward SK-529 ARCHITECT threshold
```

**Replace with:**
```
Q9 — Flow named: [FLOW-XX | none]
  Step 1 (product specs): [read | skipped — no flow named]
  Step 2 (reconciliation state): [read | skipped]
  Step 3 (design simulation R1): [read | skipped]
  Step 4 (47-flow matrix row): [read | skipped]
  Step 5 (history RAG index): [N fixtures read | (none) — no historical decisions | skipped — no flow named]
  Threshold contribution: [4+N reads | 0 reads] toward SK-529 ARCHITECT threshold
```

---

### 2f — Updated §8 Handoff Q9 reference

**Current line 352:**
```
- Q9 artifact: which flow was named, which four reads were completed
```

**Replace with:**
```
- Q9 artifact: which flow was named, which five steps were completed (Step 5: which historical fixtures were loaded)
```

**Current line 354:**
```
The Q9 artifact matters for handoff because the next session needs to know whether the four flow-specific reads are already in STATE.recon or need to be re-run. A session that inherits Q9 reads already done saves 4 threshold reads.
```

**Replace with:**
```
The Q9 artifact matters for handoff because the next session needs to know whether the flow-specific reads and historical fixture lookups are already in STATE.recon or need to be re-run. A session that inherits Q9 reads already done saves 4+N threshold reads (where N = historical fixtures loaded).
```

**Current line 381:**
```
- Q9 artifact present: flow named (or declared absent), four reads completed or skipped with reason
```

**Replace with:**
```
- Q9 artifact present: flow named (or declared absent), five steps completed or skipped with reason, Step 5 N-count declared
```

---

## §3 — SESSION-GUIDE v1.6: Mistake 21

### Insertion point

Insert after Mistake 20's closing `---` (current line ~130 in the Mistakes catalog section),
before `## 7. When you notice you're doing one of these`.

**Exact surrounding context:**
```
**Fix:** Run Q9's four-step read sequence before any synthesis. The four reads take 3–5 minutes and prevent a full round of correction.

---

## 7. When you notice...
```

**Mistake 21 block to insert:**

```markdown
### Mistake 21 — Skipping Q9 Step 5 when historical decisions exist for the flow *(NEW v1.6)*

**Trigger:** Architect session on FLOW-03. Q9 Steps 1–4 completed. Session proceeds to synthesis without Step 5.

**Signature:** Session proposes REGISTRATION archetype for T60 with a separate `capacityService.check()` followed by `registrationService.create()`. D-03-1 (REGISTRATION atomic, lock candidate) and D-03-4 (best-effort observer, lock candidate) are correctness-propagating decisions that are invisible in the design simulation and product specs — they live only in historical fixtures.

**Fix:**
```bash
grep -A 25 "**FLOW-03**" docs/sessions/historyRag/HISTORY-RAG-INDEX.md
```
Returns `hist_flow_flow03_d_03_1 ⭐⭐🔒` and `hist_flow_flow03_d_03_4 ⭐⭐🔒`.
Load both fixtures before any synthesis involving registration, capacity, or observer task types.
D-03-1 teaching: "When you see 'check available then register', it is always a race condition."
D-03-4 teaching: "If a task type observes another task type's output, it is best-effort. try/catch entire handler."

**Why it matters:** These decisions were made during FLOW-03 implementation after the design simulation was written. They are not visible in FLOW-03-DESIGN-SIMULATION-R1.md. Without Step 5, the architect re-derives these decisions from first principles — expensively and with risk of getting them wrong.

---
```

---

## §4 — SESSION-GUIDE v1.6: Version history entry

**Append after current v1.5 line (line 367):**

```
- v1.6 — Q9 Step 5 added (conditional historical decision lookup via HISTORY-RAG-INDEX.md §3); Q9 table header updated; Step 5 execution block added with per-flow counts; Q9 artifact schema extended (+Step 5 N-count); §8 Handoff updated (+Step 5 in Q9 artifact, +N-count explanation); §10 Observability updated (+Step 5 in Q9 artifact checklist); Mistake 21 added (skipping Step 5 when historical decisions exist for the flow); HISTORY-RAG-INDEX.md referenced throughout
```

---

## §5 — §10 Observability (SESSION-GUIDE update)

**Current line 381:**
```
- Q9 artifact present: flow named (or declared absent), four reads completed or skipped with reason
```

This is already covered in §2f above. Same replacement applies.

---

## §6 — Summary of changes per document

### ORIENTATION-MAP v1.0 → v1.1

| Location | Change |
|---|---|
| Line 383 (between Q-20 `---` and `## 4.`) | INSERT Q-21 (historical precedent lookup) |
| Line 383 (same block) | INSERT Q-22 (AI context package principle) |
| Header | Bump to v1.1 |

Total: 2 new Q entries inserted, 1 version bump.

### SESSION-GUIDE v1.5 → v1.6

| Location | Change |
|---|---|
| Line 64 | REPLACE: add "(plus conditional Step 5...)" to header |
| Lines 65–70 (Q9 table) | APPEND Step 5 row after Step 4 |
| Before line 79 | INSERT Step 5 execution block + per-flow counts |
| Line 79 | REPLACE: Contribution to threshold updated for N |
| Lines 88–95 (Q9 artifact) | REPLACE: add Step 5 N-count |
| Line 352 | REPLACE: "four" → "five", add Step 5 |
| Line 354 | REPLACE: "four" → "five", add N |
| Line 381 | REPLACE: add Step 5 to observability checklist |
| After line ~130 (Mistake 20 `---`) | INSERT Mistake 21 |
| Line 367 (version history) | APPEND v1.6 entry |
| Header | Bump to v1.6 |

Total: 2 header bumps, 8 line replacements, 2 insertions.

---

## §7 — Dependency chain

This I1 spec feeds:
- **Round D3** → produces `XIIGEN-CODEBASE-ORIENTATION-MAP.md` v1.1 (final)
- **Round D4** → produces `XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.6.md` (final)

Neither D3 nor D4 requires any further design decision — all text is fully specified here.
The only execution step in D3/D4 is applying these diffs to the live documents.

---

## §8 — Verification commands (for D3/D4 execution)

```bash
# After D3 — verify Q-21 and Q-22 present
grep -n "Q-21\|Q-22\|HISTORY-RAG-INDEX" XIIGEN-CODEBASE-ORIENTATION-MAP.md
# Expected: ≥3 hits, versions bumped to v1.1

# After D4 — verify Step 5 and Mistake 21 present
grep -n "Step 5\|Mistake 21\|HISTORY-RAG-INDEX" XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.6.md
# Expected: ≥6 hits, version history shows v1.6
grep -c "Step 5" XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.6.md
# Expected: ≥5
```
