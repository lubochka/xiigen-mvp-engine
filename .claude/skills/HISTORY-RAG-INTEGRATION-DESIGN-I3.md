# HISTORY-RAG-INTEGRATION-DESIGN-I3
## Integration Round I3 — SESSION-LOAD-PLAN v29 Diff Specification
## Date: 2026-04-19 | Status: READY FOR EXECUTION
## Applies to: XIIGEN-SESSION-LOAD-PLAN-v28.md (→ D5: XIIGEN-SESSION-LOAD-PLAN-v29.md)

---

## Purpose

This document specifies the exact 4-change diff that upgrades SESSION-LOAD-PLAN from
v28 to v29. D5 applies these changes to produce the final v29 document.
No new governance decisions are made here — all changes reflect the RAG integration
work completed in Phases R0-R5 and Rounds I1-I2.

---

## §1 — Change 1: Document Registry (4 modifications)

**Location:** Lines 273–291 (`## Document Registry` table)

### 1a — Bump XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE to v1.6

**Current row (line 281):**
```
| `XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE` | **v1.5** | Per-session architect discipline, Q0-Q9, Mistakes 1-20 |
```

**Replace with:**
```
| `XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE` | **v1.6** | Per-session architect discipline, Q0-Q9 + Step 5, Mistakes 1-21 |
```

---

### 1b — Bump XIIGEN-CODEBASE-ORIENTATION-MAP to v1.1

**Current row (line 286):**
```
| `XIIGEN-CODEBASE-ORIENTATION-MAP` | **v1.0 NEW** | Question-class → file-path lookup; XIIGen question-to-tool bash commands |
```

**Replace with:**
```
| `XIIGEN-CODEBASE-ORIENTATION-MAP` | **v1.1** | Question-class → file-path lookup; Q-21 (historical RAG), Q-22 (context package); bash commands |
```

---

### 1c — Add HISTORY-RAG-INDEX row

**After DECISIONS-LOCKED row (line 290), insert new row:**

Current:
```
| `DECISIONS-LOCKED` | rolling | Architectural decisions locked from override without approval |
| `SKILL-INDEX` | current | Full skill catalog with load-order mapping |
```

**Replace with:**
```
| `DECISIONS-LOCKED` | rolling | Architectural decisions locked from override without approval |
| `HISTORY-RAG-INDEX` | **v1.0 NEW** | Navigation index for 186 historical architecture decisions; 12 clusters; per-flow table; 8 D-HIST lock candidates; location: `docs/sessions/historyRag/` |
| `ARCHITECTURAL-DECISION-ADDENDUM` | v1.0 | "Give AI the minimum to decide" governing question; failure modes A+B; three-signal test; location: `docs/flow-plan-preparation/` |
| `SKILL-INDEX` | current | Full skill catalog with load-order mapping |
```

---

## §2 — Change 2: CFI-08 (append after CFI-07)

**Location:** Line 473 (after CFI-07 bullet)

**Current last CFI line:**
```
- **CFI-07** — FLOW-32 marketplace: 20/20 contracts, 0 unit tests, Potemkin UI. Requires full reconciliation before marketplace work proceeds.
```

**Append immediately after (before the blank line + `---`):**
```
- **CFI-08** — 15 design simulations have empty Section 8 DR triples (no `DESIGN_REASONING` decisions authored): `FLOW-29`, `FLOW-30`, `FLOW-31`, `FLOW-32`, `FLOW-33`, `FLOW-34`, `FLOW-35`, `FLOW-38`, `FLOW-39`, `FLOW-40`, `FLOW-41`, `FLOW-42`, `FLOW-43`, `FLOW-44`, `FLOW-45`. Historical RAG plan (Phase R0-R5) does not cover these flows. A dedicated DR-authoring session is required per flow to produce `DESIGN_REASONING` triples for the RAG corpus. Does not block any current work.
```

---

## §3 — Change 3: Change History (append v29 block)

**Location:** After the v28 block (after line ~548, before `---`)

**Current last Change History line:**
```
  - Next FC: FC-18 (unchanged)
```

**Append this block after the v28 block:**
```
- **v29 — NEW:**
  - **Document Registry** — DESIGN-ARCHITECT-SESSION-GUIDE bumped to v1.6 (+Q9 Step 5, +Mistake 21); ORIENTATION-MAP bumped to v1.1 (+Q-21 historical RAG lookup, +Q-22 context package principle); `HISTORY-RAG-INDEX` v1.0 added (186-decision navigation index, 12 clusters, per-flow table); `ARCHITECTURAL-DECISION-ADDENDUM` v1.0 added (governing question reference)
  - **CFI-08** — 15 flows (FLOW-29..FLOW-35, FLOW-38..FLOW-45) have no DESIGN_REASONING decisions in historical RAG; dedicated DR-authoring session required per flow
  - **D-HIST group** — D-HIST-001..D-HIST-008 appended to DECISIONS-LOCKED.md (8 proposed lock entries derived from historical RAG fixtures; Luba approval required)
  - **186 new fixtures** — `fixtures/rag-patterns/hist_*` (61) + `fixtures/design-reasoning/historical/hist_*` (124) + DR-07-G append; no T/F/SK/FC/CF counters consumed
  - **Total mandatory checks: 14** (unchanged)
  - **Total skills: 113** (unchanged — no new SK numbers consumed)
  - **Next SK: SK-539** (unchanged)
  - **Next FC: FC-18** (unchanged)
  - **Artifact Boundaries** — unchanged; no counters consumed by RAG integration work
```

---

## §4 — Change 4: Cross-references (append HISTORY-RAG-INDEX)

**Location:** Lines 569–585 (`## Cross-references` section)

**Current last bullet in cross-references:**
```
- **DECISIONS-LOCKED** — locked architectural decisions
```

**Append after DECISIONS-LOCKED bullet:**
```
- **HISTORY-RAG-INDEX v1.0** — navigation index for 186 historical architecture decisions across 12 theme clusters; per-flow lookup table; Q-21 entry point; location: `docs/sessions/historyRag/HISTORY-RAG-INDEX.md`
- **ARCHITECTURAL-DECISION-ADDENDUM v1.0** — "give AI the minimum to decide" governing question; two failure modes; three-signal test; Q-22 entry point; location: `docs/flow-plan-preparation/XIIGEN-ARCHITECTURAL-DECISION-ADDENDUM.md`
```

Also update the two version-specific references that appear in the session start checklist / cross-references block:

**Current line ~572:**
```
- **DESIGN-ARCHITECT-SESSION-GUIDE v1.5** — per-session architect discipline, Q0-Q9, Mistakes 1-20
```
**Replace with:**
```
- **DESIGN-ARCHITECT-SESSION-GUIDE v1.6** — per-session architect discipline, Q0-Q9 + Step 5, Mistakes 1-21
```

**Current line ~573:**
```
- **XIIGEN-CODEBASE-ORIENTATION-MAP v1.0** — question-class → file-path lookup; bash commands for XIIGen questions
```
**Replace with:**
```
- **XIIGEN-CODEBASE-ORIENTATION-MAP v1.1** — question-class → file-path lookup; Q-21 (historical RAG), Q-22 (context package); bash commands
```

---

## §5 — Header update

**Current file header (lines 1–4):**
```
# XIIGEN — SESSION LOAD PLAN v28
## Date: [date] | Branch: claude/vigorous-margulis
## What changed in v28:
##   - ...
```

**Replace first line with:**
```
# XIIGEN — SESSION LOAD PLAN v29
```

**Append to What-changed block:**
```
## What changed in v29:
##   - HISTORY-RAG-INDEX v1.0 (186 decisions, 12 clusters) + ARCHITECTURAL-DECISION-ADDENDUM registered
##   - DESIGN-ARCHITECT-SESSION-GUIDE bumped to v1.6 (Q9 Step 5, Mistake 21)
##   - ORIENTATION-MAP bumped to v1.1 (Q-21, Q-22)
##   - D-HIST-001..008 appended to DECISIONS-LOCKED.md
##   - CFI-08 added (15 flows with empty DR triples)
```

---

## §6 — Complete change summary

| Change | Location | Type | Lines affected |
|---|---|---|---|
| 1a: SESSION-GUIDE → v1.6 | Document Registry | REPLACE | Line 281 |
| 1b: ORIENTATION-MAP → v1.1 | Document Registry | REPLACE | Line 286 |
| 1c: HISTORY-RAG-INDEX row | Document Registry | INSERT 2 rows | After line 290 |
| 2: CFI-08 | Current CFI Issues | INSERT 1 bullet | After line 473 |
| 3: v29 Change History | Change History | APPEND block | After line ~548 |
| 4a: HISTORY-RAG-INDEX cross-ref | Cross-references | INSERT 2 bullets | After line 582 |
| 4b: SESSION-GUIDE version | Cross-references | REPLACE | Line ~572 |
| 4c: ORIENTATION-MAP version | Cross-references | REPLACE | Line ~573 |
| 5: Header | File header | REPLACE + APPEND | Lines 1–4 |

**Total:** 9 surgical edits. File length increases by ~15 lines.
No governance rules change. No mandatory checks change. No SK/FC consumed.

---

## §7 — Verification commands (for D5 execution)

```bash
# After D5 — verify version bumps
grep "SESSION-GUIDE\|ORIENTATION-MAP\|HISTORY-RAG-INDEX\|ARCHITECTURAL-DECISION-ADDENDUM" \
  XIIGEN-SESSION-LOAD-PLAN-v29.md | grep -v "^##"
# Expected: v1.6, v1.1, v1.0 NEW, v1.0 entries

# Verify CFI-08 present
grep "CFI-08" XIIGEN-SESSION-LOAD-PLAN-v29.md
# Expected: 1 hit with the 15-flows text

# Verify v29 change history block
grep -A 12 "\*\*v29" XIIGEN-SESSION-LOAD-PLAN-v29.md
# Expected: full bullet list with all changes

# Verify cross-references have new entries
grep "HISTORY-RAG-INDEX\|ARCHITECTURAL-DECISION" XIIGEN-SESSION-LOAD-PLAN-v29.md | wc -l
# Expected: ≥4 hits (registry + cross-references each)

# Verify header
head -2 XIIGEN-SESSION-LOAD-PLAN-v29.md
# Expected: "# XIIGEN — SESSION LOAD PLAN v29"
```

---

## §8 — Dependency chain

This I3 spec feeds:
- **Round D5** → produces `XIIGEN-SESSION-LOAD-PLAN-v29.md` (final)

D5 execution = apply the 9 surgical edits above to a copy of v28. No new decisions needed.
