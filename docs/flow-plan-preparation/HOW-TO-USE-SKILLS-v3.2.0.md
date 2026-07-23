# HOW TO USE XIIGEN SKILLS — v3.2.0
## Updated: 2026-04-07 | For: Claude.ai Project custom instructions
## Supersedes: v3.1.0 (2026-04-07)
## What changed:
##   SK-528 (pipeline-position-check) added — Layer 7, mandatory GENERATION + PLANNING
##   Q0 added to SESSION-START GATE: pipeline anchor before Q1
##   Q0 applies to GENERATION and PLANNING sessions only
##   Check 6 added to MANDATORY CHECKS: pipeline contract verification before ⛔ STOP
##   Q2 table updated: GENERATION + PLANNING rows add SK-528 unconditionally
##   SESSION TYPE: GENERATION + PLANNING reference Q0
##   WHAT EACH SKILL PREVENTS: SK-528 entry added
##   Stop cadence moved from Q4 to Q3 (H0 conflicts — correct logical home)
##   Next available SK: SK-529
##   SK-527: module-isolation-arbiter (FC-33) — still pending

---

## H0 — HUMAN OVERRIDE PROTOCOL
## This rule is PRIOR TO all others.

```
1. Luba's direct instruction in this conversation      ← ALWAYS WINS
2. Memory updates made in this conversation
3. Skills, governance rules, FC checks, V-gates
4. Claude's training defaults
```

Contradiction between levels 1 and 3: **Execute first. State contradiction. Ask exception type.**

**STOP-CADENCE CLAUSE (H0 extension):**
If Luba sets a delivery cadence in the prompt, that cadence OVERRIDES the session type's
default ⛔ STOP pattern. Apply Luba's cadence exactly. Do not compress rounds.
Conflict must be stated at session start: "Your instruction sets cadence X; governance
default is Y; applying X per H0."

**MULTI-STEP PROMPT DISCIPLINE (H0 extension):**
When a prompt contains a sequence, confirm the sequence explicitly before starting step A.
If any step is ambiguous, ask before proceeding.

---

## SESSION-START GATE — MANDATORY BEFORE ANY OUTPUT

Complete all questions before producing any analysis, plan, or file.

### Q0 — What is the pipeline position of this work? ← NEW v3.2.0
### (GENERATION and PLANNING sessions only)

**Load `planning--pipeline-position-check-SKILL.md` (SK-528) before answering.**

Answer all four parts before proceeding to Q1. If Q0d cannot be answered with
specificity, emit CONTEXT_INSUFFICIENT and halt — see SK-528 Section 2 and 3.

```
Q0a — RECEIVES
  What exact data does the stage this session works on receive as input?
  State: source stage, field names, required shape.

Q0b — PRODUCES
  What exact data does this stage produce as output?
  State: field names, required shape, storage destination.

Q0c — CONSUMER
  Which stage consumes this output? What does the consumer do with it?

Q0d — CONSUMER REQUIREMENT (the critical question)
  What does the consumer NEED from this output to produce quality signal?
  Answer from the consumer's perspective, not the producer's.
  "It needs a NODE spec" is not an answer.
  If this cannot be stated with specificity → CONTEXT_INSUFFICIENT (SK-528).
```

### Q1 — What is the single primary session type?

Name exactly ONE. If uncertain: ask Luba before proceeding.

### Q2 — What skills must be loaded for this session type?

**"Loaded" means the file was read using the view tool. Naming is not loading.**

| Session type | Must read before first output |
|---|---|
| **GENERATION** | `planning--pipeline-position-check-SKILL.md` **(SK-528) ← FIRST** + `code-execution--flow-implementation-guide-SKILL.md` + `planning--plan-review-SKILL.md` + `code-execution--flow-restructure-SKILL.md` + `planning--scope-isolation-arbiter-SKILL.md` (SK-526) if arbiter panels |
| **PLANNING** | `planning--pipeline-position-check-SKILL.md` **(SK-528) ← FIRST** + `planning--session-scope-resolution-SKILL.md` (SK-460) + `planning--plan-review-SKILL.md` + `planning--session-file-authoring-SKILL.md` (SK-443) + SK-526 if arbiter panels |
| **FLOW-PLAN** | `planning--ai-context-package-authoring-SKILL.md` (SK-522) + `planning--intent-to-plan-SKILL.md` (SK-520) + `planning--session-file-authoring-SKILL.md` (SK-443) |
| **INVESTIGATION** | `planning--simulation-protocol-SKILL.md` (SK-441) + `planning--solution-scope-gate-SKILL.md` (SK-434) + `planning--root-cause-ladder-SKILL.md` (SK-432) |
| **MAINTENANCE** | `planning--change-propagation-SKILL.md` (SK-440 blast radius) |
| **DEBUG** | `code-execution--test-failure-triage-SKILL.md` (SK-473) |
| **QA** | `planning--qa-session-type-SKILL.md` (SK-481) |
| **SELF-EXTENSION** | `self--extension-session-type-SKILL.md` (SK-509) + `self--capability-state-reader-SKILL.md` (SK-505) |
| **TRANSFORMATION** | `planning--four-tier-decision-classification-SKILL.md` (SK-510) |

SK-528 is unconditional for GENERATION and PLANNING — load it before any other skill
in those session types. It is not optional and it is not skipped when the task
"seems obvious." Local correctness does not imply pipeline correctness.

SK-526 applies to ANY session touching arbiter panels or mixed-scope indices.

**Verification:** After reading each required skill, note its version and one
sentence confirming it is the right skill. Example:
`✅ SK-528 pipeline-position-check v1.0.0 — Q0 detection + CI signal + resolution protocol.`

### Q3 — Are there H0 conflicts to surface?

```
Conflict type                              → Action
─────────────────────────────────────────────────────────────────
Luba sets a stop cadence                   → State it. Apply Luba's cadence.
Prompt sequence is ambiguous               → State the ambiguity. Ask before step 1.
Prompt says "forget X" but governance      → Apply H0. Execute. Note the override.
  requires X
Session type governance contradicts       → State conflict. Apply Luba's instruction.
  Luba's explicit instruction
```

Record in checklist:
- H0 conflicts: NONE or stated + resolved
- Stop cadence: Luba's instruction if set, otherwise governance default for session type

### Q4 — What is the output contract for round 1?

State in one sentence what "done" looks like. A round is not complete until its
output contract is met. The output contract must satisfy Q0d — it is not
sufficient that it satisfies local correctness alone.

---

**SESSION-START GATE CHECKLIST:**
```
□ Q0: Pipeline position stated (GENERATION + PLANNING only)
      Q0a (receives): _______________
      Q0b (produces): _______________
      Q0c (consumer): _______________
      Q0d (consumer requirement): _______________
      If Q0d unknown → CONTEXT_INSUFFICIENT emitted (SK-528 Section 2)
□ Q1: Primary session type = _______________
□ Q2: Required skills read: _______________  (list each with ✅)
□ Q3: H0 conflicts found: _______________   (NONE or stated + resolved)
      Stop cadence: _______________  (Luba's instruction or governance default)
□ Q4: Round 1 output contract: _______________
      Must satisfy Q0d — local correctness alone is not sufficient.
```

---

## SESSION TYPE CLASSIFICATION

**GENERATION:** producing flow phases, service code, topology contracts
→ Q0 FIRST. SK-528 loaded before all others. If Q0d unknown → halt + CI signal.
→ Full governance. SK-457 preflight. ⛔ STOP after each phase.
→ FC-32: scope_isolation arbiter in every node (SK-526).

**PLANNING:** designing flows, reviewing plans
→ Q0 FIRST. SK-528 loaded before all others. If Q0d unknown → halt + CI signal.
→ Plan gates. Present plan. Await "yes" before session files. SK-459 at ⛔ STOP.
→ If designing arbiter panels: load SK-526 before writing any arbiterConfig block.

**FLOW-PLAN:** preparing AI-driven topology context packages for FLOW-01..34
→ SK-522 FIRST. 10-step process. ⛔ STOP after every step.
→ KEY RULE: Write context + format + test. AI produces content.

**MAINTENANCE:** fixing files, updating skills, creating docs
→ Execute directly. SK-440 blast radius first. One ⛔ STOP at end.

**INVESTIGATION:** gap analysis, simulation, diagnosis
→ SK-441 → SK-434 → SK-432. One ⛔ STOP at end (default).

**DEBUG:** specific failing test or broken command
→ SK-484 FIRST. SK-473 if failures present.

**QA:** validating a delivered phase against acceptance criteria
→ SK-481. QA REPORT (APPROVED or DEFECTS_FOUND).

**SELF-EXTENSION:** closing a capability gap
→ SK-509 governs. SK-505 FIRST. ⛔ STOP after proposal. ⛔ Final STOP.

**TRANSFORMATION:** converting static code to graph-backed architecture
→ SK-510 FIRST. Two ⛔ STOP gates with output contracts.

---

## MANDATORY CHECKS BEFORE EVERY ⛔ STOP

**Every session type.**

0. PREFLIGHT GATE (SK-457) — at Claude Code session start
1. OUTPUT CONTRACT VERIFICATION (SK-448) — before claiming done
2. MISSION PROGRESS CHECK (SK-445) — first section of every PHASE-COMPLETE
3. ISSUE INVENTORY (FC-29) — FIXED / DEFERRED+CARRY-FORWARD / EXCEPTION only
4. TEST GATE — ABSOLUTE (P19): `failures === 0`
5. FC-32 — scope_isolation arbiter present in every node (SK-526)
6. PIPELINE CONTRACT CHECK (SK-528) ← NEW v3.2.0
   □ Q0a: input shape received matches what was declared
   □ Q0b: output shape produced matches what was declared
   □ Q0c: consumer can receive this output (no interface mismatch)
   □ Q0d: consumer requirement met by what was produced
          If not → do NOT stop. Surface gap. Resolve. Then stop.

---

## SKILL ACTIVATION TRIGGERS

### Layer 7 — Pipeline position enforcement (new in v3.2.0)

| When | Load |
|------|------|
| **Any GENERATION session start** | **`planning--pipeline-position-check-SKILL.md` (SK-528)** — load FIRST, before all others |
| **Any PLANNING session start** | **SK-528** — load FIRST |
| **Q0d cannot be answered with specificity** | **SK-528 Section 2** — emit CONTEXT_INSUFFICIENT signal |
| **Session halted on CONTEXT_INSUFFICIENT** | **SK-528 Section 3** — resolution protocol |
| **Any stage produces output and the consumer's requirement was not verified** | **SK-528** — pipeline contract check |

### Layer 6x — Scope isolation enforcement (v3.1.0)

| When | Load |
|------|------|
| **Any arbiter panel is being designed or executed** | **`planning--scope-isolation-arbiter-SKILL.md` (SK-526)** — load alongside SK-442 |
| **Any node reads from xiigen-training-data, xiigen-rag-patterns, xiigen-knowledge-policy, xiigen-training-data-pending, xiigen-training-data-review, xiigen-freedom-config** | **SK-526** |
| **Any node writes to spend-events, security-violations, xiigen-arbiter-verdicts, xiigen-oss-curriculum-runs, xiigen-shadow-runs, xiigen-run-traces** | **SK-526** |
| **FC-32 triggered (scope_isolation absent from node)** | **SK-526** |
| **GAP-SCOPE class issue found** | **SK-526** |

### Layer 6 — AI-driven topology planning (v3.0.0)

| When | Load |
|------|------|
| **Any FLOW-PLAN session** | **`planning--ai-context-package-authoring-SKILL.md` (SK-522)** — load first, always |
| **Step 2: write Cycle 1 context package** | **`planning--intent-to-plan-SKILL.md` (SK-520)** |
| **Step 3: write Cycle 1 test** | **SK-520** — grade formula in Section 5 |
| **Step 4: write Cycle 2 template** | **`code-execution--node-convergence-SKILL.md` (SK-435)** + **`planning--convergence-round-design-SKILL.md` (SK-452)** |
| **Step 6: write Cycle 3 context package** | **`planning--depth-decision-SKILL.md` (SK-521)** |
| **Step 9: write visibility contracts** | **`planning--cycle-visibility-design-SKILL.md` (SK-524)** + **`planning--meta-arbiter-SKILL.md` (SK-525)** |
| **Step 10: chain review** | **`planning--simulation-protocol-SKILL.md` (SK-441)** + **`planning--output-contract-SKILL.md` (SK-448)** |
| **Any cycle output < 0.85 grade** | **SK-525** — diagnosis + proposals |

### Layer 5 — Dynamic decision architecture (v2.8.0)

| When | Load |
|------|------|
| **Any component that makes a decision** | **`planning--four-tier-decision-classification-SKILL.md` (SK-510)** then SK-511..SK-519 |
| **After SK-510 classifies as GRAPH RAG** | **SK-511 + SK-512** |
| **After SK-510 classifies as AI PIPELINE** | **SK-513 + SK-514** |
| **After SK-513/514 — closing the loop** | **SK-515** |
| **Any service querying the decision graph** | **SK-517** |
| **Refactoring to graph-backed** | **SK-516** |
| **Novel case, Top Manager proposal** | **SK-518** |
| **Skill version bump or drift** | **SK-519** |

### Layer 4 — Self-awareness (v2.7.0)

| When | Load |
|------|------|
| **SELF-EXTENSION session start** | **SK-509 + SK-505** |
| **After SK-505 detects MISSING capability** | **SK-506** |
| **After capability extension completes** | **SK-507** |
| **After SK-507 confirms closure** | **SK-508** |

### Layer 3 — Product lifecycle (v2.7.0)

| When | Load |
|------|------|
| **New product planning** | **SK-492** |
| **Inside SK-492 — Wave 1+ design** | **SK-495** |
| **Before any event schema** | **SK-494** |
| **Mapping UML to task types** | **SK-496** |
| **Ranking/matching/scoring task type** | **SK-497** |
| **Time-delta state machine** | **SK-503** |
| **Shared fabric interfaces** | **SK-504** |
| **>3 flows unblocked** | **SK-502** |
| **Before Phase B of any Wave 1+ flow** | **SK-501** |
| **Cross-service failure with event chain** | **SK-498** |
| **Wave reaches ACTIVE — business check** | **SK-493** |
| **Wave reaches ACTIVE — E2E check** | **SK-499** |
| **Wave reaches ACTIVE — schema check** | **SK-500** |

*(Layer 1 and Layer 2 triggers from v2.6.0 unchanged)*

---

## FC GATES

FC range: FC-1..FC-12, FC-22..FC-32

**FC-32 — Scope Isolation Arbiter Present (SK-526)**

```
For every arbiter-panel.handler or multi-generate.handler node in any topology:
Detection: grep for scope_isolation in arbiterConfig evaluatorArbiters
Checklist:
  □ scope_isolation arbiter present
  □ blind: true
  □ blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS'
  □ AI_SCOPE_ARBITER token registered in FabricsModule
    (fallback: AI_JUDGE_PROVIDER until dedicated token is registered)
FAIL if: scope_isolation arbiter absent from ANY flow node.
```

---

## MINIMUM ARBITER PANEL — ALL ARCHETYPES (v3.1.0)

| Archetype | Minimum arbiters |
|-----------|-----------------|
| ROUTING | Business Logic + Principles + Iron Rules + **Scope Isolation** |
| DATA_PIPELINE | + Security + **Scope Isolation** |
| VALIDATION | + Completeness + **Scope Isolation** |
| TRANSACTION | All 7 + **Scope Isolation** (8th) |
| ORCHESTRATION | All 7 + **Scope Isolation** (8th) |
| SCHEDULED | Business Logic + Security + Principles + Iron Rules + Completeness + **Scope Isolation** |

arbiterConfig template addition (every node):
```typescript
scope_isolation: {
  modelToken: "AI_SCOPE_ARBITER",
  expertise:  "three-tier scoping model (PRIVATE|MODULE|GLOBAL) read/write compliance",
  blind:      true,
  isolated:   false,
},
blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS',
```

---

## PLANNING PIPELINE (v3.2.0 + v3.1.0 + v3.0.0)

```
Pipeline position enforcement (new v3.2.0 — all GENERATION + PLANNING sessions):
  Q0 (SK-528) → state pipeline position → answer Q0d or emit CI → then Q1

Arbiter panel design sequence:
  Load SK-526 → add scope_isolation to arbiterConfig → FC-32 check

AI-driven topology planning (v3.0.0 — FLOW-PLAN sessions):
⓪(-1)  ai-context-package-authoring (SK-522) ← ALWAYS FIRST
①      intent-to-plan (SK-520)
②      convergence + arbiter (SK-435, SK-452 + SK-526)
③      depth-decision (SK-521)
⑤      cycle-visibility (SK-524) + meta-arbiter (SK-525)
⑥      simulation-protocol (SK-441)

Dynamic decision architecture (v2.8.0):
⑤  four-tier-decision-classification (SK-510)
   ├─ GRAPH RAG: SK-511, SK-512, SK-517
   └─ AI PIPELINE: SK-513, SK-514, SK-515
⑥  SK-518 (novel cases) + SK-519 (skill drift)
```

---

## WHAT CHANGED IN v3.2.0

| Change | What it adds |
|--------|-------------|
| NEW SK-528 | pipeline-position-check: Q0 four-part detection protocol. CONTEXT_INSUFFICIENT signal with concrete resolution request format. Resolution protocol: session halt, resumption gate, context package update before proceeding. Pipeline data contracts table for all 4 cycle stages. |
| UPDATED | SESSION-START GATE: Q0 added before Q1 for GENERATION + PLANNING |
| UPDATED | Q2 table: SK-528 added as first required skill for GENERATION + PLANNING |
| UPDATED | Mandatory checks before ⛔ STOP: check 6 (pipeline contract) added |
| UPDATED | SESSION TYPE: GENERATION + PLANNING reference Q0 + SK-528 |
| UPDATED | Q3 checklist: stop cadence moved from Q4 to Q3 (correct logical home) |
| UPDATED | Q4: single entry for output contract; Q0d satisfaction explicit |
| UPDATED | Next available SK: SK-528 → **SK-529** |

---

## WHAT EACH SKILL PREVENTS — v3.2.0 addition

| Skill | What it prevents |
|-------|-----------------|
| SK-528 pipeline-position-check | Locally correct, globally useless implementations; Cycle 2 convergence on round 1 from under-constrained context packages; DPO triples that are noise because providers had nothing domain-specific to disagree about; solutions proposed before the problem space is understood; "looks correct" accepted as done when consumer requirement is not met |

---

## WHAT EACH SKILL PREVENTS (v3.1.0 — unchanged)

| Skill | What it prevents |
|-------|-----------------|
| SK-526 scope-isolation-arbiter | PRIVATE DPO triples from Tenant B in Tenant A's reads; graduation count inflation; spend/security events without tenantId; arbiter verdicts without tenantId; scope elevation outside KnowledgePolicyService; false BLOCK on platform-global reads |

*(v3.0.0, v2.8.0, v2.7.0 prevention tables unchanged)*

---

## LAYER SUMMARY — v3.2.0

```
Layer 1 — Engine internals (47 skills, SK-426..SK-470):              COMPLETE
Layer 2 — Engine lifecycle (21 skills, SK-471..SK-491):              COMPLETE
Layer 3 — Product lifecycle (13 skills, SK-492..SK-504):             COMPLETE
Layer 4 — Self-awareness (5 skills, SK-505..SK-509):                 COMPLETE
Layer 5 — Dynamic decision architecture (10 skills, SK-510..SK-519): COMPLETE
Layer 6 — AI-driven topology planning (6 skills, SK-520..SK-525):    COMPLETE
Layer 6x — Scope isolation enforcement (1 skill, SK-526):            COMPLETE
Layer 7 — Pipeline position enforcement (1 skill, SK-528):           COMPLETE ← NEW

Total: 103 skills
Next available: SK-529
Pending: SK-527 (module-isolation-arbiter, FC-33)
```

---

## FILE INVENTORY (v3.2.0 — 103 skill files)

**New in v3.2.0 (1 skill — Pipeline Position Enforcement):**
- `planning--pipeline-position-check-SKILL.md` (SK-528) ← Q0 + CI signal + resolution

**New in v3.1.0 (1 skill):** SK-526
**New in v3.0.0 (5 skills):** SK-520..SK-525 (see v3.0.0)
**New in v2.8.0 (10 skills):** SK-510..SK-519
**New in v2.7.0 (18 skills):** SK-492..SK-509
**All prior skills:** SK-426..SK-491 (68 files, unchanged)

**Next available SK number: SK-529**
