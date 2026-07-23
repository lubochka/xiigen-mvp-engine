---
name: problem-decomposition
sk_number: SK-430
version: "1.0.0"
priority: HIGH
load_order: 0
category: planning
author: luba
updated: "2026-03-24"
contexts: ["web-session", "claude-code"]
description: >
  Before acting on any complex problem, decompose it: identify the correct
  level (immediate/structural/architectural), find the minimum information
  needed, classify incoming claims, scope the response, and produce an
  executable handoff. Prevents treating symptoms as root causes.
triggers:
  - "we have a problem with"
  - "something is wrong with"
  - "can xiigen handle"
  - "how do we deal with"
  - "we need to figure out"
  - "what caused this"
  - "why is this happening"
---

# Problem Decomposition Skill v1.0

## WHEN TO INVOKE

At the START of any session where a complex or ambiguous problem arrives.
Before any file is read, before any fix is proposed, before any plan is written.

---

## THE FIVE STEPS

### STEP 1: SYMPTOM OR ROOT CAUSE?

Ask "why does this problem exist?" three times.

```
First answer  = immediate cause   → fix with a maintenance session
Second answer = structural cause  → fix with a skill or template update
Third answer  = architectural cause → fix with a design decision or new flow
```

**Rule:** Identify the level before proposing the solution. A Level-1 solution
for a Level-3 problem fixes today and breaks tomorrow.

**Example:**
```
Problem: CLAUDE.md says Next T=T567 but T573 is already assigned
Level 1: Update CLAUDE.md to T580 (fixes today's session)
Level 2: No write path from Phase F back to artifact registry.
         Add ARTIFACT_RANGE seeding to Phase F gate template.
Level 3: Self-knowledge is in a file, not in self-learning RAG.
         Architectural decision: registry belongs in xiigen-rag-patterns.
```

---

### STEP 2: MINIMUM INFORMATION NEEDED

Do NOT read everything. Answer: which 3–5 artifacts tell the whole story?

```
For execution position problems:  STATE files > source files
For artifact problems:            CLAUDE.md + one grep > reading all contracts
For merge problems:               directory diff + byte counts > reading both files
For architectural problems:       session history > current code
For plan problems:                STATE.json + one plan section > full plan
```

**Rule:** Start narrow. Widen only when the narrow read is insufficient.
Every extra file read without a specific question is noise.

---

### STEP 3: CLASSIFY INCOMING CLAIMS

Before accepting any factual claim from a review document, model output, or prior session:

```
VERIFIED   = reviewer provides the exact command that confirmed it
             → spot-check one data point

INFERRED   = reasonable deduction, derivation shown but not verified
             → run the verification command yourself

ASSUMED    = stated as fact, no derivation shown
             → treat as hypothesis until confirmed
```

**Rule:** Renumbering maps, file existence claims, test counts, artifact assignments
→ ALWAYS verify before using in a plan. One grep costs 30 seconds. A wrong
number in a plan costs multiple remediation sessions.

---

### STEP 4: SCOPE THE RESPONSE

Apply `planning--solution-scope-gate-SKILL.md` before proposing anything.

```
CONVENTION → ADAPTATION → EXTENSION → NEW FLOW → NEW INFRA
```

Start at the lowest scope that genuinely solves the problem.
Document why each lower scope is insufficient before claiming the higher one.

---

### STEP 5: PRODUCE EXECUTABLE HANDOFF

Output is commands + state, not prose.

Claude Code must be able to run the plan without interpretation. Include:
- Exact verification commands with expected output
- Exact sed/grep/cp commands for mechanical work
- `MERGE-STATE.json` or equivalent for discovery persistence
- discoveries[] and rejected_claims[] (see `session-output--investigation-handoff-SKILL.md`)

---

## ANTI-PATTERNS

```
❌ Starting to fix before identifying the level
   → "The fix is obviously to update CLAUDE.md" — maybe it's also to fix the write path

❌ Reading all files before identifying which 3 answer the question
   → Information overload causes the actual signal to be missed

❌ Accepting a review document's numbers without running the verification commands
   → Three wrong renumbering maps in one session were each caused by this

❌ Proposing infrastructure for a problem that a one-line AGENTS.md rule solves
   → The workspace convention problem was solved by a convention, not a FLOW

❌ Treating every problem as architectural
   → Over-engineering. Some problems are just stale files.
```

---

## INTEGRATION

```
Invoke before: planning-session-startup, planning-skill, infrastructure-discovery
Invoke at:     session start when problem is ambiguous or multi-layered
Produces:      decomposition notes → feed into session handoff discoveries[]
References:    planning--solution-scope-gate-SKILL.md
               planning--root-cause-ladder-SKILL.md
               planning--claim-verification-SKILL.md
               session-output--investigation-handoff-SKILL.md
```

---

## G08 universal addition from llm_mvp_core — TS scope ladder, Jest as the verify step

The five steps are the universal core. This block restates the scope ladder (STEP 4) and
the claim-verify (STEP 3) in mvp's actual stack, so a future agent does not re-derive them
from C#-shaped examples.

### A. STEP 4 scope ladder expressed as TS layers

```
FUNCTION  →  CLASS/SERVICE  →  INTERFACE/DTO  →  MODULE  →  ARCHITECTURE
   |             |                  |               |             |
 one method   a NestJS         a typed contract   a Nest module  a DECISIONS
 / pure fn    @Injectable      (interface/DTO) or   + its DI       record (cross
 / React      service or       React props/route  registration   -module / new
 handler      hook             shape                              fabric)
```

Start at the lowest layer that genuinely fixes the problem; write down why each lower layer
is insufficient before claiming a higher one. Acting one layer too high is over-engineering;
acting one layer too low re-installs the symptom.

### B. STEP 3 — every classified claim gets a mvp verify command

INFERRED/ASSUMED claims are not usable in a plan until verified. The verify is a real
command run THIS session:

```
"interface X exists"          → grep -rn "interface X\b" server/src client/src
"service implements it"       → grep -rn "implements X" server/src
"N tests pass"                → cd server && npx jest 2>&1 | grep -E "Tests:" | tail -1
"it type-checks"              → npx tsc --noEmit
"the RAG route exists"        → grep -rn "APIRouter\|@app\." rag/
```

A number in a plan that you did not produce with a command this session is `ASSUMED`, and
`ASSUMED` numbers cause the multi-session remediations the anti-patterns warn about.

### C. STEP 2 minimum-information for mvp problem classes

```
execution-position problem   → STATE/registry file > source files
type/contract problem        → the failing *.spec.ts + the class under test + its interface/DTO
runtime/render problem        → the component + its Playwright e2e + one console trace
retrieval problem            → the NestJS RAG fabric + the sidecar route contract (rag/)
```

### Note-only (NOT ported — stays in G12, R5)

ML-engine decomposition (DPO/arbiter/pipeline-node level-3 decisions) is a `llm_mvp_core`
concern; here Level-3 "architectural" stops at a mvp DECISIONS record + manifest contract.
