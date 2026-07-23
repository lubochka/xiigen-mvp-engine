# HOW TO USE XIIGEN SKILLS — v3.1.0
## Updated: 2026-04-07 | For: Claude.ai Project custom instructions
## Supersedes: v3.0.0 (2026-04-01)
## What changed:
##   SK-526 (scope-isolation-arbiter) added — Layer 6x, mandatory 8th panel member
##   FC-32 added: scope_isolation arbiter mandatory on every node
##   Q2 table updated: GENERATION + PLANNING rows add SK-526 when arbiter panels involved
##   Layer 6x trigger table added
##   Minimum arbiter panels updated for ALL archetypes (SK-442 amended)
##   "Every node" rule stated explicitly — no archetype exceptions
##   Next available SK: SK-527

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

Complete all 4 questions before producing any analysis, plan, or file.

### Q1 — What is the single primary session type?

Name exactly ONE. If uncertain: ask Luba before proceeding.

### Q2 — What skills must be loaded for this session type?

**"Loaded" means the file was read using the view tool. Naming is not loading.**

| Session type | Must read before first output |
|---|---|
| **GENERATION** | `code-execution--flow-implementation-guide-SKILL.md` + `planning--plan-review-SKILL.md` + `code-execution--flow-restructure-SKILL.md` + **`planning--scope-isolation-arbiter-SKILL.md` (SK-526) if designing arbiter panels** |
| **PLANNING** | `planning--session-scope-resolution-SKILL.md` (SK-460) + `planning--plan-review-SKILL.md` + `planning--session-file-authoring-SKILL.md` (SK-443) + **`planning--scope-isolation-arbiter-SKILL.md` (SK-526) if designing arbiter panels** |
| **FLOW-PLAN** | `planning--ai-context-package-authoring-SKILL.md` (SK-522) + `planning--intent-to-plan-SKILL.md` (SK-520) + `planning--session-file-authoring-SKILL.md` (SK-443) |
| **INVESTIGATION** | `planning--simulation-protocol-SKILL.md` (SK-441) + `planning--solution-scope-gate-SKILL.md` (SK-434) + `planning--root-cause-ladder-SKILL.md` (SK-432) |
| **MAINTENANCE** | `planning--change-propagation-SKILL.md` (SK-440 blast radius) |
| **DEBUG** | `code-execution--test-failure-triage-SKILL.md` (SK-473) |
| **QA** | `planning--qa-session-type-SKILL.md` (SK-481) |
| **SELF-EXTENSION** | `self--extension-session-type-SKILL.md` (SK-509) + `self--capability-state-reader-SKILL.md` (SK-505) |
| **TRANSFORMATION** | `planning--four-tier-decision-classification-SKILL.md` (SK-510) |

SK-526 applies to ANY session that designs or reviews an arbiter panel, or touches
any node that reads from mixed-scope indices or writes to per-tenant indices.
It is not session-type-specific — it is node-specific.

**Verification:** After reading each required skill, note its version and one
sentence confirming it is the right skill. Example:
`✅ SK-526 scope-isolation-arbiter v1.1.0 — mandatory 8th panel member, BLOCK on unfiltered mixed-scope reads.`

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

### Q4 — What is the output contract for round 1?

State in one sentence what "done" looks like. A round is not complete until its
output contract is met.

---

**SESSION-START GATE CHECKLIST:**
```
□ Q1: Primary session type = _______________
□ Q2: Required skills read: _______________  (list each with ✅)
□ Q3: H0 conflicts found: _______________   (NONE or stated + resolved)
□ Q4: Round 1 output contract: _______________
□ Q4: Stop cadence for this session: _______________
```

---

## SESSION TYPE CLASSIFICATION

**GENERATION:** producing flow phases, service code, topology contracts
→ Full governance. SK-457 preflight. ⛔ STOP after each phase.
→ FC-32: scope_isolation arbiter in every node (SK-526).

**PLANNING:** designing flows, reviewing plans
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
5. FC-32 — scope_isolation arbiter present in every node (SK-526) ← NEW v3.1.0

---

## SKILL ACTIVATION TRIGGERS

### Layer 6x — Scope isolation enforcement (new in v3.1.0)

| When | Load |
|------|------|
| **Any arbiter panel is being designed or executed** | **`planning--scope-isolation-arbiter-SKILL.md` (SK-526)** — load alongside SK-442 |
| **Any node reads from xiigen-training-data, xiigen-rag-patterns, xiigen-knowledge-policy, xiigen-training-data-pending, xiigen-training-data-review, xiigen-freedom-config** | **SK-526** |
| **Any node writes to spend-events, security-violations, xiigen-arbiter-verdicts, xiigen-oss-curriculum-runs, xiigen-shadow-runs, xiigen-run-traces** | **SK-526** |
| **FC-32 triggered (scope_isolation absent from node)** | **SK-526** — defines arbiter and context builder |
| **GAP-SCOPE class issue found** | **SK-526** — diagnose which IR-SCOPE rule was violated |

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

## FC GATES — UPDATED

FC range: FC-1..FC-12, FC-22..FC-32

**FC-32 — Scope Isolation Arbiter Present (SK-526) ← NEW v3.1.0**

```
For every arbiter-panel.handler or multi-generate.handler node in any topology:

Detection:
  grep for scope_isolation in arbiterConfig evaluatorArbiters

Checklist:
  □ scope_isolation arbiter present
  □ blind: true
  □ blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS'
  □ AI_SCOPE_ARBITER token registered in FabricsModule
    (fallback: AI_JUDGE_PROVIDER until dedicated token is registered — do NOT skip)

FAIL if: scope_isolation arbiter absent from ANY flow node (no archetype exception).
```

---

## MINIMUM ARBITER PANEL — UPDATED FOR ALL ARCHETYPES (v3.1.0)

SK-442 amended by SK-526. Scope Isolation added to every archetype row unconditionally:

| Archetype | Minimum arbiters |
|-----------|-----------------|
| ROUTING | Business Logic + Principles + Iron Rules + **Scope Isolation** |
| DATA_PIPELINE | + Security + **Scope Isolation** |
| VALIDATION | + Completeness + **Scope Isolation** |
| TRANSACTION | All 7 + **Scope Isolation** (8th) |
| ORCHESTRATION | All 7 + **Scope Isolation** (8th) |
| SCHEDULED | Business Logic + Security + Principles + Iron Rules + Completeness + **Scope Isolation** |

**Bold = added by SK-526. No archetype exception. No size exception.**

arbiterConfig template addition (every node):
```typescript
scope_isolation: {
  modelToken: "AI_SCOPE_ARBITER",   // register in FabricsModule: AiModelRole.FAST
                                     // fallback: AI_JUDGE_PROVIDER until registered
  expertise:  "three-tier scoping model (PRIVATE|MODULE|GLOBAL) read/write compliance",
  blind:      true,
  isolated:   false,
},
blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS',
```

---

## PLANNING PIPELINE ADDITIONS (v3.1.0 + v3.0.0)

```
Arbiter panel design sequence — add at every ② node step:
  Load SK-526 → add scope_isolation to arbiterConfig → FC-32 check

AI-driven topology planning sequence (v3.0.0 — FLOW-PLAN sessions):
⓪(-1)  ai-context-package-authoring (SK-522) ← ALWAYS FIRST
①      intent-to-plan (SK-520)              ← Steps 2-3
②      convergence + arbiter (SK-435, SK-452 + SK-526) ← Steps 4-5
③      depth-decision (SK-521)              ← Steps 6-7
⑤      cycle-visibility (SK-524) + meta-arbiter (SK-525) ← Step 9
⑥      simulation-protocol (SK-441)         ← Step 10

Dynamic decision architecture (v2.8.0):
⑤  four-tier-decision-classification (SK-510)
   ├─ GRAPH RAG: SK-511, SK-512, SK-517
   └─ AI PIPELINE: SK-513, SK-514, SK-515
⑥  SK-518 (novel cases) + SK-519 (skill drift)
```

---

## WHAT CHANGED IN v3.1.0

| Change | What it adds |
|--------|-------------|
| NEW SK-526 | scope-isolation-arbiter v1.1: mandatory 8th panel member. Three-tier scoping model (PRIVATE/MODULE/GLOBAL). BLOCK on unfiltered mixed-scope reads. ADVISORY (not BLOCK) on unnecessary tenantId on platform-global reads. Five test vectors. |
| NEW FC-32 | scope_isolation arbiter absent from ANY node = BUILD_FAILURE |
| UPDATED | Q2 table: GENERATION + PLANNING rows — SK-526 when arbiter panels involved |
| UPDATED | SK-442 minimum panel: all archetypes gain Scope Isolation unconditionally |
| UPDATED | Mandatory checks before ⛔ STOP: FC-32 added as check 5 |
| UPDATED | arbiter-context-builders.ts: buildScopeIsolationContext() added (SESSION 4) |
| UPDATED | arbiter-panel.handler.ts: scope_isolation in parallel contexts (SESSION 4) |
| UPDATED | Next available SK: SK-526 → **SK-527** |
| NOTED | SK-527: Module Isolation Arbiter (cross-module factory injection, FC-33) — pending |

---

## WHAT EACH SKILL PREVENTS — v3.1.0 addition

| Skill | What it prevents |
|-------|-----------------|
| SK-526 scope-isolation-arbiter | PRIVATE DPO triples from Tenant B in Tenant A's reads; graduation count inflation from other tenants' triples; spend/security events stored without tenantId; arbiter verdicts stored without tenantId; scope elevation outside KnowledgePolicyService; false BLOCK on legitimate platform-global reads |

---

## WHAT EACH SKILL PREVENTS (v3.0.0 additions — unchanged)

| Skill | What it prevents |
|-------|-----------------|
| SK-520 intent-to-plan | Technology names in plan steps; scope drift; steps combining two responsibilities |
| SK-521 depth-decision | Infinite recursion; untraceable LEAF/EXPAND verdicts; EXPAND without sub-flow plan |
| SK-522 ai-context-package-authoring | Instruction files instead of context packages; PRIOR_ART as copied content |
| SK-524 cycle-visibility-design | Empty DECIDED fields; invisible cycles; CHANGED treated as optional |
| SK-525 meta-arbiter | Bad grades with no structured improvement; single-model self-ranking (V9-002) |

*(v2.8.0, v2.7.0 prevention tables unchanged — see v3.0.0)*

---

## LAYER SUMMARY — v3.1.0

```
Layer 1 — Engine internals (47 skills, SK-426..SK-470):              COMPLETE
Layer 2 — Engine lifecycle (21 skills, SK-471..SK-491):              COMPLETE
Layer 3 — Product lifecycle (13 skills, SK-492..SK-504):             COMPLETE
Layer 4 — Self-awareness (5 skills, SK-505..SK-509):                 COMPLETE
Layer 5 — Dynamic decision architecture (10 skills, SK-510..SK-519): COMPLETE
Layer 6 — AI-driven topology planning (6 skills, SK-520..SK-525):    COMPLETE
Layer 6x — Scope isolation enforcement (1 skill, SK-526):            COMPLETE ← NEW

Total: 102 skills
Next available: SK-527
Pending: SK-527 (module-isolation-arbiter, FC-33)
```

---

## FILE INVENTORY (v3.1.0 complete — 102 skill files)

**New in v3.1.0 (1 skill — Scope Isolation Enforcement):**
- `planning--scope-isolation-arbiter-SKILL.md` (SK-526) ← mandatory 8th panel member

**New in v3.0.0 (5 skills — Layer 6):**
- `planning--ai-context-package-authoring-SKILL.md` (SK-522)
- `planning--intent-to-plan-SKILL.md` (SK-520)
- `planning--depth-decision-SKILL.md` (SK-521)
- `planning--cycle-visibility-design-SKILL.md` (SK-524)
- `planning--meta-arbiter-SKILL.md` (SK-525)

**New in v2.8.0 (10 skills — Layer 5):**
- SK-510 through SK-519 (see v3.0.0 for full list)

**New in v2.7.0 (18 skills — Layers 3 + 4):**
- SK-492 through SK-509 (see v3.0.0 for full list)

**All prior skills:** SK-426..SK-491 (68 files, unchanged)

**Next available SK number: SK-527**
