---
name: remediation-session-design
sk_number: SK-466
version: "1.0.0"
priority: HIGH
load_order: 1
category: planning
author: luba
updated: "2026-03-26"
contexts: ["web-session"]
description: >
  Takes SK-432's output (K root causes, dependency-ordered) and translates it
  into an ordered session plan. Three steps: estimate file count and lines per
  root cause group, assign session type per fix class, produce ordered session
  list with dependencies. Doc 8 correction: SK-432 does steps (a) and (b) —
  cross-gap convergence and root cause grouping — this skill does only (c), (d),
  (e). SK-434 solution-scope-gate is one input to the blast-radius rule, not a
  prerequisite. Without this skill, session grouping uses inline judgment:
  inconsistent blast-radius isolation, wrong session type assignments.
triggers:
  - "remediation session"
  - "group the fixes"
  - "session plan from gaps"
  - "how many sessions"
  - "order the fixes"
  - "session A B C D"
  - "blast radius"
  - "fix grouping"
  - "translate gaps to sessions"
---

# Remediation Session Design Skill (SK-466) v1.0

## PREREQUISITE

Run `planning--root-cause-ladder-SKILL.md` (SK-432) first.
This skill starts from SK-432's output: K root causes, dependency-ordered.

```
SK-432 output format (expected input to this skill):
  Root cause 1: [description] — covers gaps [N, M, P]
  Root cause 2: [description] — covers gaps [Q, R]
  Dependency: Root cause 1 must be fixed before root cause 2
  ...
```

If you have raw gaps but haven't run SK-432 yet: run SK-432 first. Do not
attempt to group raw gaps into sessions — collapse to root causes first.

---

## STEP C: ESTIMATE FILE COUNT AND LINES PER ROOT CAUSE GROUP

For each root cause group, count the files and lines the fix touches:

```bash
# Example: root cause group = "score.handler does not read arbiterConfig"
# Find all files that need changing:
grep -rn "score\.handler\|arbiterConfig\|ArbiterPanelConfig" server/src/ \
  | grep -v ".spec." | cut -d: -f1 | sort -u
# Count lines in each file:
wc -l [file1] [file2] ...
```

Record:
```
Root cause 1: score.handler arbiter dispatch
  Files: score.handler.ts, fabrics.module.ts, arbiter-context-builder.ts (new)
  Lines to change: ~80 lines (score.handler) + ~20 (module) + ~60 new file
  Total: ~160 lines
```

---

## STEP D: ASSIGN SESSION TYPE PER FIX CLASS

Apply fix class taxonomy first (from SK-434 solution-scope-gate):

```
fix_class       session type        rule
──────────────────────────────────────────────────────────────────────────────
CONTENT         MAINTENANCE         file count ≤ 3 AND line count ≤ 50
                                    → batch with other CONTENT fixes

CONTENT         MAINTENANCE         file count ≤ 3 AND line count 50–150
(isolated)      (isolated)          → own session if changes are functionally unrelated

EXTENSION       MAINTENANCE         file count ≤ 5 AND structural guard is clear
                                    → same session if blast radius is contained

EXTENSION       MAINTENANCE         file count > 5 OR blast radius high
(isolated)      (isolated)          → own session

INFRASTRUCTURE  MAINTENANCE +       always own session
                gate review         plan-review (FC checks) before execution

NEW_HANDLER     GENERATION          own session + Gate C + session files
                session             SK-443 self-containment required

NEW FLOW        PLANNING session    own planning session → Gate C → session files
                + Gate C            Q1-Q4 gate applies
```

**Blast radius rule:**
```
Low blast radius:   ≤ 3 files, ≤ 50 lines, no new tokens registered → CONTENT, batch OK
Medium blast radius: ≤ 5 files, ≤ 150 lines, 0–1 new token → EXTENSION, may batch
High blast radius:   > 5 files OR > 150 lines OR new fabric token → isolate, own session
FC-31 style:        N > 10 files → always own isolated session (grep-and-replace risk)
```

---

## STEP E: PRODUCE ORDERED SESSION LIST

Order sessions by dependency chain from SK-432, then by session type within each
dependency level:

```
Rule: MAINTENANCE sessions before GENERATION sessions at same dependency level
Rule: Infrastructure fixes before handler fixes (handlers depend on modules)
Rule: Module registration before injection (injection depends on registration)
```

**Output format:**

```markdown
## REMEDIATION SESSION PLAN

### Group A — [session type]: [one-line description]
Fix class:    CONTENT + EXTENSION
Files:        [list]
Lines:        ~[N]
Blast radius: LOW
Depends on:   nothing (can start immediately)
Blocks:       Group B (Group B injects what Group A registers)

Fixes:
  A1: [root cause 1 description] — [file:what to change]
  A2: [root cause 2 description] — [file:what to change]

Pre-flight assumptions (SK-456):
  A-1: [assumption] | verify: [command] | expected: [result]
  A-2: [assumption] | verify: [command] | expected: [result]

### Group B — [session type]: [description]
Depends on:   Group A complete
Blocks:       Group C
...
```

---

## WORKED EXAMPLE (from Doc 8 Groups A–D)

**Input from SK-432 (3 root causes):**
```
Root cause 1: Learning loop disconnected (prompt evolver, RAG tracker, judge fallback)
  → covers: feedback.handler disconnections, score.handler heuristic fallback
Root cause 2: Arbiter layer missing specialization and BLOCK semantics
  → covers: score.handler dispatch, escalation, key principles arbiter
Root cause 3: Semantic retrieval not wired
  → covers: rag-retrieve.handler, IRagService injection, seed-time ingest
Dependency: Root cause 2 partially depends on root cause 1 (judge model fix needed first)
```

**Output:**

```markdown
### Group A — MAINTENANCE (isolated): Learning loop wiring
Files:  engine-bootstrapper.ts, feedback.handler.ts, score.handler.ts
Lines:  ~40
Blast:  LOW
Depends on: nothing

Fixes:
  A1: FREEDOM config in bootstrapper — hardcoded 'claude-sonnet' → freedom.get()
  A2: Prompt evolver connected — promptOpsTriggered=true → analyzeFailures() call
  A3: RAG tracker connected — missing call → recordPatternUsage() after generation
  A4: Judge fallback score — 1.0 heuristic → 0.7 (neutral/unknown) when judge absent

### Group B — MAINTENANCE (isolated): Score.handler arbiter dispatch
Files:  score.handler.ts, fabrics.module.ts, arbiter-context-builder.ts (new)
Lines:  ~160
Blast:  MEDIUM (new file + module registration)
Depends on: Group A (judge model wired first)

Fixes:
  B1: score.handler reads arbiterConfig → dispatches per role with isolated context
  B2: Escalation BLOCK semantics → BLOCK verdict removes from candidate pool
  B3: Key Principles Arbiter context isolation → isolated:true context package

### Group C — EXTENSION: RAG semantic retrieval
Files:  rag-retrieve.handler.ts, flow-rag-seed.base.ts
Lines:  ~80
Blast:  MEDIUM
Depends on: nothing (independent of A and B)

Fix:
  C1: rag-retrieve.handler injects IRagService + builds semantic query from NODE
  C2: flow-rag-seed.base.ts adds IRagService.ingest() at seed time

### Group D — CONVENTION + EXTENSION: DESIGN_REASONING capture
Files:  flow-rag-seed.base.ts, rag-retrieve.handler.ts (add patternType filter)
Lines:  ~20 + Gate C process change
Blast:  LOW
Depends on: nothing

Fix:
  D1: Add ARCHITECTURE_DECISION to valid patternType in seed base
  D2: Gate C produces FLOW-XX-ARCHITECTURE-DECISIONS.json (process gate)
```

---

## ANTI-PATTERNS

```
❌ Grouping fixes before running SK-432
   → SK-432 collapses N gaps to K root causes first
   → Grouping 20 individual gaps into sessions skips the convergence step
   → Result: 20-session plan instead of 4-session plan

❌ Assigning session type before estimating file count
   → File count determines blast radius
   → Blast radius determines session type
   → Guessing session type skips the estimation step

❌ Batching fixes with high blast radius "for efficiency"
   → A 15-file grep-and-replace in a maintenance session is a test-failure risk
   → Isolate; the extra session is cheaper than a broken test suite
```

---

## INTEGRATION

```
Invoke after:  planning--root-cause-ladder-SKILL.md (SK-432) produces K root causes
Reads from:    SK-432 output (root cause groups + dependency order)
               planning--solution-scope-gate-SKILL.md (SK-434) fix class per gap
Produces:      Ordered session plan (Groups A–N with dependencies and pre-flight)
Feeds into:    planning--assumption-registry-SKILL.md (SK-456) — pre-flight per group
               code-execution--phase-preflight-SKILL.md (SK-457) — execution verification
Supersedes:    Inline session grouping reasoning in PHASE-THREE-PREPARATION-GUIDE
```
