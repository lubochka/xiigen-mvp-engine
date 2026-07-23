---
name: assumption-registry
sk_number: SK-456
version: "1.0.0"
priority: MANDATORY
load_order: -1
category: planning
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  Every plan rests on assumptions about what exists, what works, and what is true.
  When an assumption is wrong, the plan fails — not at planning time where it can
  be corrected cheaply, but at execution time where it causes blocking issues and
  review cycles. This skill captures all assumptions at plan authoring time,
  classifies each by verifiability, and produces a verification command for every
  assumption that can be checked. The phase-preflight skill (SK-457) executes
  these verifications at Claude Code session start before any code is written.
triggers:
  - "what are we assuming"
  - "assumption check"
  - "before writing session files"
  - "what might be wrong with this plan"
  - "preconditions for this session"
  - "what does this plan depend on"
  - "assumption registry"
  - "verify before executing"
  - "what could block this"
  - "plan depends on"
---

# Assumption Registry Skill (SK-456) v1.0

## WHEN TO INVOKE

After a plan is produced, before session files are written.
In planning sessions: after step ⑥ (plan-review), before Gate C.
The output feeds into `phase-preflight-SKILL.md` (SK-457) which executes
the verification commands at Claude Code session start.

---

## WHY THIS EXISTS

Three blocking issues appeared in the planning files review cycle:
1. `createFeedbackRecord` assumed to exist in `feedback-types.ts` — didn't
2. LightRAG registration assumed to be in `rag.module.ts` — wasn't
3. `arbiterConfig` field assumed to be camelCase in score.handler — wrong (was snake_case)

All three were identified in review, not in planning. If assumptions had been
registered and verified at plan authoring time, none would have reached Claude Code.
The cost of a wrong assumption discovered in review: 1 review cycle.
The cost discovered by Claude Code at execution: blocked session + re-plan + re-review.

---

## THE THREE ASSUMPTION CLASSES

### Class 1 — INFRASTRUCTURE (verifiable by grep or file existence)

Something must exist in the codebase that the plan depends on.

```
Example:  "createFeedbackRecord function exists in feedback-types.ts"
Verify:   grep -n "createFeedbackRecord\|export function create" server/src/learning/feedback-types.ts
Expected: 1+ hits
Fallback: If 0 hits — inline object creation in feedback.handler, no factory function needed
```

### Class 2 — BEHAVIORAL (verifiable by reading the code)

Something must behave a certain way — a method signature, a field name, a return type.

```
Example:  "score.handler reads arbiterConfig from TypeScript contract (camelCase)"
Verify:   grep -n "contract\.\|contractDoc\[" server/src/engine/node-handlers/score.handler.ts | head -5
          Then check: does the field access use arbiterConfig or arbiter_config?
Expected: camelCase (TypeScript object, not ES-serialized dict)
Fallback: If snake_case — change access to typedContract.arbiterConfig
```

### Class 3 — OPERATIONAL (verifiable by running a command)

Something must be running or configured at execution time.

```
Example:  "LightRAG service is running at LIGHTRAG_URL"
Verify:   echo ${LIGHTRAG_URL:-NOT_SET}
Expected: a URL (not NOT_SET)
Fallback: If NOT_SET — rag-retrieve.handler falls back to InMemoryProvider (acceptable)
```

---

## THE ASSUMPTION REGISTRY FORMAT

Produce an `ASSUMPTIONS.json` block for every session file. It belongs in the
session file's STEP 0 (PRE-FLIGHT VERIFICATION) section:

```markdown
## STEP 0 — PRE-FLIGHT: ASSUMPTION REGISTRY

Before executing any step, verify all assumptions. A failed assumption is BLOCKING
unless a fallback is specified. If BLOCKING and no fallback: STOP. Escalate to Luba.

| # | Assumption | Class | Verification | Expected | Fallback |
|---|-----------|-------|--------------|----------|---------|
| A1 | FeedbackRecord factory function exists | INFRA | `grep -n "createFeedbackRecord" server/src/learning/feedback-types.ts` | 1+ hits | Inline object construction — no factory needed |
| A2 | LightRagProvider registration exists | INFRA | `grep -n "lightrag\|LightRag" server/src/fabrics/rag/rag.module.ts` | 1+ hits | BLOCKING — rag.module.ts must be updated before A-3 |
| A3 | score.handler reads camelCase arbiterConfig | BEHAVIORAL | `grep -n "contract\.arbiterConfig\b" server/src/engine/node-handlers/score.handler.ts` | 1+ hits | BLOCKING — integration code must use camelCase |
| A4 | Group A changes present | INFRA | `grep -n "return 0\.7" server/src/engine/node-handlers/score.handler.ts` | 1 hit | BLOCKING — complete Group A before running Group B |
```

**Each row must have:**
- A single testable claim (not "everything is set up")
- A literal bash command
- The expected output
- A fallback OR "BLOCKING"

---

## HOW TO IDENTIFY ASSUMPTIONS FROM A PLAN

Read each fix in the plan. For every fix, ask:

```
1. What file does this fix touch?
   → Does that file exist? (Class 1: INFRASTRUCTURE)

2. What method or field does this fix call or read?
   → Does that method/field have the expected signature? (Class 2: BEHAVIORAL)
   → Will it be there at execution time (not just at review time)?

3. What state must the system be in for this fix to work?
   → Is a prior group complete? (Class 1: INFRASTRUCTURE)
   → Is a service running? (Class 3: OPERATIONAL)
```

For every YES answer: the thing in question is an assumption. Register it.
For every assumption: write the verification command.

---

## ASSUMPTION REGISTRY IN SESSION FILES

The assumption registry replaces the "Verify target files exist" boilerplate
that currently appears as basic ls checks in Group A through D. It is more rigorous:
it checks content (behavioral assumptions), not just existence.

**Comparison:**

Current approach (weak):
```bash
ls server/src/engine/node-handlers/feedback.handler.ts
# Expected: file exists
```

Assumption registry approach (strong):
```bash
# A1: PersistentFeedbackStore.record() exists and accepts FeedbackRecord
grep -n "record(feedback: FeedbackRecord" server/src/learning/feedback-store.ts
# Expected: 1 hit — method signature present
# Fallback: If 0 hits — check if method name changed; update import in feedback.handler.ts
```

The ls check confirms the file exists. The assumption registry confirms the thing
the plan depends on exists inside the file and has the right shape.

---

## ANTI-PATTERNS

```
❌ Assumptions stated in prose ("we assume the feedback store works")
   → Every assumption must have a verification command
   → Prose assumptions are the exact failure mode that caused the three blocking issues

❌ Registering only the obvious assumptions
   → The three blocking issues were all non-obvious:
     createFeedbackRecord existence, LightRAG registration, camelCase field access
   → The less obvious an assumption, the more important it is to register it

❌ Fallback of "check manually"
   → "Check manually" is not a fallback — it means the session will pause for human review
   → Write the specific command to run; or mark BLOCKING and escalate at planning time

❌ Assumption registry at the end of the plan, after session files
   → Assumption registry is produced before session files
   → It feeds into the session file's STEP 0
   → If an assumption fails, the session file content may need to change
```

---

## INTEGRATION WITH SK-457 (Phase Preflight)

SK-456 produces the assumption registry at planning time.
SK-457 executes the assumption registry at Claude Code session start.

```
Planning session:
  SK-456 → ASSUMPTIONS registered → session file STEP 0 populated

Claude Code session start:
  SK-457 → reads STEP 0 → runs each verification command → reports PASS/FAIL/FALLBACK
  → If any BLOCKING fails: STOP, do not proceed to Fix A-1
  → If fallback available: apply fallback, note in ISSUE INVENTORY, continue
```

The two skills are a pair. SK-456 without SK-457 means assumptions are registered
but not systematically verified. SK-457 without SK-456 means execution is preceded
by a pre-flight check, but the check may not cover the right assumptions.

---

## INTEGRATION

```
Invoke after:  plan-review (step ⑥) passes
Invoke before: Gate C — session file authoring
Produces:      assumption registry rows → populate session file STEP 0
Feeds into:    planning--phase-preflight-SKILL.md (SK-457) — Claude Code execution
References:    planning--output-contract-SKILL.md (SK-448) — output contract
               planning--session-file-authoring-SKILL.md (SK-443) — session file format
```

---

## G08 universal addition from llm_mvp_core — registry-before-session-files, OPERATIONAL baseline, RAG sidecar class

The three classes (INFRASTRUCTURE / BEHAVIORAL / OPERATIONAL), one-testable-claim-per-row,
literal command + expected + fallback/BLOCKING, and STEP-0 placement are the universal core
and are already here. This block pins two universal points and adds the Python sidecar.

### A. The registry is built BEFORE session files (ordering is part of the rule)

Registering assumptions is a *pre-authoring* gate, not a closing checklist. It is produced
after plan-review and before any session file is written, because a failed assumption can
change what the session file must contain. An assumption registry written after the session
files is the anti-pattern this skill exists to prevent.

### B. OPERATIONAL baseline row is mandatory for every mvp plan

Every plan registers a baseline OPERATIONAL assumption with a command run THIS session:

```
| A0 | server test baseline is green (no NEW failures introduced) | OPERATIONAL |
     `cd server && npx jest 2>&1 | grep "Tests:" | tail -1` | Failed: 0 (or known pre-existing set) | BLOCKING |
| A0b| type surface compiles | OPERATIONAL | `npx tsc --noEmit` | 0 errors | BLOCKING |
```

### C. RAG sidecar assumption class (Python)

When the plan touches retrieval, register the sidecar contract as its own rows:

```
| Ax | RAG sidecar route exists | INFRA |
     `grep -rn "APIRouter\|@app\.\(get\|post\)" rag/` | 1+ hits | BLOCKING for retrieval work |
| Ay | sidecar reachable / health route present | OPERATIONAL |
     `grep -rn "health" rag/` (record route; do NOT start a server) | route present | fallback: InMemory RAG provider |
| Az | sidecar request/response shape matches NestJS RAG fabric | BEHAVIORAL |
     read rag/ Pydantic model + the fabric call site | shapes match | BLOCKING — wire mismatch |
```

### Note-only (NOT ported — stays in G12, R5)

Assumptions about shared-model internals (DPO/checkpoint state) belong to `llm_mvp_core`;
here the assumption stops at "the `.xiigen` manifest/locator for the shared model is present".
