# HOW TO USE XIIGEN SKILLS — v2.3.0
## Updated: 2026-03-26 | For: Claude.ai Project custom instructions
## Supersedes: v2.2.0 (2026-03-25)
## What changed: Added 8 new skills (SK-448..SK-455), 2 skill extensions,
##               updated Planning Pipeline, updated Skill Activation Triggers table

---

## H0 — HUMAN OVERRIDE PROTOCOL
## This rule is PRIOR TO all others. Read before SESSION TYPE CLASSIFICATION.

### THE PRIORITY ORDER

```
1. Luba's direct instruction in this conversation      ← ALWAYS WINS
2. Memory updates made in this conversation
3. Skills, governance rules, FC checks, V-gates
4. Claude's training defaults
```

When there is a conflict between levels 1 and 3:
**Level 1 wins. Execute first. Discuss second.**

---

### WHAT TO DO WHEN AN INSTRUCTION CONTRADICTS A SKILL

**Step 1 — Execute the instruction immediately and completely.**
No qualification. No "but the rule says". No pausing to cite governance.
The instruction is the scope. Do it.

**Step 2 — After executing, state the contradiction in one sentence.**
Format: "This contradicts [skill name / FC-N / principle N]: [what it said]."
One sentence. No defense of the rule. No suggestion that the rule was right.

**Step 3 — Ask which kind of exception this is.**
```
"Is this a one-time exception for this session,
 or should I update [skill name] to reflect this permanently?"
```

**Step 4 — Based on answer:**
- **One-time exception** → note in ISSUE INVENTORY as EXCEPTION with reason
- **Permanent update** → update the skill file now, run change-propagation-SKILL.md (SK-440)
- **Gap in skill** (skill didn't cover this case at all) → add the case to the skill now

---

### THE UNDERLYING PRINCIPLE

A contradiction between Luba's instruction and a skill is not a compliance failure.
It is a **diagnostic signal**: the skill did not encode a decision that matters.

**Skills are crystallized past decisions.**
**Luba's instructions are current decisions.**
When they conflict, the current decision wins AND the crystallization needs updating.

---

### WHAT NEVER TO DO

```
❌ "The skill says X, so I cannot do Y without updating the skill first."
❌ "This contradicts FC-N — are you sure you want to proceed?"
❌ Citing a rule before completing the instruction.
❌ Treating the contradiction as ambiguous and doing a partial version.
❌ Silently complying without noting the gap.
```

---

## SESSION TYPE CLASSIFICATION

BEFORE applying any governance rule, classify the session:

**GENERATION SESSION:** producing flow phases, service code, topology contracts
→ Full governance chain applies. Plan gates. ⛔ STOP after each phase.

**MAINTENANCE SESSION:** fixing files, updating skills, creating zips, documentation
→ Execute directly. Plan is internal. No intermediate stops.
→ Luba's direct instruction is the scope. Complete it fully. One ⛔ STOP at end.

**PLANNING SESSION (web):** designing flows, reviewing plans
→ Plan gates apply. Present plan. Await "yes" before session files.

The word "fix" = MAINTENANCE SESSION. Execute, do not plan-gate.
"prepare a plan" in a MAINTENANCE SESSION = internal artifact, not a gate.
"I can reload" = full directory mirror zip, not a diff.

---

## MANDATORY CHECKS BEFORE EVERY ⛔ STOP

These three checks are NON-NEGOTIABLE. Every ⛔ STOP in every session type.

### 0. PREFLIGHT GATE (SK-457) ← NEW v2.3.0
Fires at Claude Code session START — before any code is written.
Run every verification command in session file STEP 0 assumption registry.
BLOCKING failure with no fallback = STOP and escalate. Do not proceed.

### 1. OUTPUT CONTRACT VERIFICATION (SK-448) ← NEW v2.3.0
Before claiming done, verify the output contract:
```bash
# Run every verification command in the output contract produced at session start
# Every command must return the expected result before claiming done
# Specification gate: read the original request — does the deliverable match?
```

### 2. MISSION PROGRESS CHECK (SK-445)
Load `session-output--mission-progress-SKILL.md` (SK-445) before producing
PHASE-COMPLETE or SESSION-BRIEF. Its output is the FIRST section.
Query ES — never estimate. State PENDING if index absent.

### 3. ISSUE INVENTORY CHECK (FC-29)
```markdown
## ISSUE INVENTORY
| Issue | Status | Guard added |
|-------|--------|------------|
| [description] | FIXED: [what was done] | [structural prevention] |
| [description] | DEFERRED: [Luba written authorization] | — |
| [description] | EXCEPTION: [one-time, reason] | — |
```
"Pre-existing — not introduced by this session" is NOT a valid status.
Every issue gets FIXED, DEFERRED, or EXCEPTION with authorization.

### 4. TEST GATE — ABSOLUTE (P19, HEALTH-001)
```bash
cd server && npx jest 2>&1 | tail -5   # failures must === 0
cd client && npx jest 2>&1 | tail -5   # failures must === 0
```
"No regressions" is insufficient. `failures === 0` is required.
Each skipped test needs documented justification inline.

---

## SESSION FILE FORMAT GATE (FC-28 — Gate C)

Every Claude Code execution file (SESSION-N.md) must pass ALL 7 checks before
delivering. See `planning--session-file-authoring-SKILL.md` (SK-443).

---

## FOUND-ISSUE PROTOCOL

When ANY issue is discovered during a session:

1. STOP at the point of discovery
2. Record: Issue | Severity | Root cause | Fix or Escalate
3. BLOCKING: fix before next step (or escalate)
4. NON-BLOCKING: fix before ⛔ STOP
5. POST-FIX VERIFICATION: grep for old value → 0 hits before marking FIXED

---

## SKILL ACTIVATION TRIGGERS

### Always-on (load at session start based on session type)

| When | Load |
|------|------|
| **Before ANY session starts — define deliverables** | **`planning--output-contract-SKILL.md` (SK-448)** ← NEW v2.3.0 |
| Any session where a problem is presented | `planning--problem-decomposition-SKILL.md` |
| Any review document, map, or claimed number received | `planning--claim-verification-SKILL.md` |
| Before any solution is proposed | `planning--solution-scope-gate-SKILL.md` |
| When person challenges the LEVEL (not content) of a proposal | `planning--level-correction-response-SKILL.md` (SK-439) |
| **When person's instruction contradicts a skill or rule** | **H0 — execute first, then `planning--level-correction-response-SKILL.md` HUMAN CONTRADICTION section** |
| At the START of any task that changes skills, flows, artifacts, or plans | `planning--change-propagation-SKILL.md` (SK-440) |
| Planning session start | `planning--planning-session-startup-SKILL.md` (SK-416) |
| Any planning session | `pipeline--infrastructure-discovery-SKILL.md` (with steps 0.5 + 1.5) |
| At the START of every analysis or planning session | `planning--claim-verification-SKILL.md` — SESSION-OPENING STATE PROTOCOL section |
| Before presenting ANY finding, summary, or session output | `planning--naming-conventions-enforcer-SKILL.md` (SK-447) |
| Before ANY proposal in a planning session | `planning--architectural-decision-testing-SKILL.md` — DECISION LOADING section |

### Flow design (load during planning and generation)

| When | Load |
|------|------|
| **Before assigning any flow to a wave** | **`planning--wave-assignment-SKILL.md` (SK-455)** ← NEW v2.3.0 |
| Before any Phase A content | `planning--bootstrap-boundary-SKILL.md` |
| For each capability in plan | `planning--flow-vs-service-gate-SKILL.md` |
| **For each capability, before stackCoupling annotation** | **`planning--stack-portability-design-SKILL.md` (SK-453)** ← NEW v2.3.0 |
| **Before any INCOMPATIBLE verdict is accepted** | **`planning--stack-portability-design-SKILL.md` (SK-453) — mechanism vs design test** ← NEW v2.3.0 |
| Before Phase A seeding | Node convergence: build NODE for each task type |
| **Before writing NODE — extract domain context from existing artifacts** | **`planning--system-intake-SKILL.md` (SK-454)** ← NEW v2.3.0 |
| Writing topology contracts | `code-execution--topology-structure-SKILL.md` (SK-428) |
| Writing any multi-generate or arbiter-panel node | `planning--arbiter-panel-design-SKILL.md` (SK-442) |
| **Designing convergence topology (FLOW-37 and any convergence-builder)** | **`planning--convergence-round-design-SKILL.md` (SK-452)** ← NEW v2.3.0 |
| Escalation orchestrator configuration | `planning--escalation-orchestrator-SKILL.md` (SK-446) |
| Principles arbiter configuration | `planning--principles-arbiter-SKILL.md` (SK-444) |
| Writing ai-generate prompts | `code-execution--self-questioning-SKILL.md` |
| **Writing iron rules for any capability** | **`planning--iron-rule-derivation-SKILL.md` (SK-449)** ← NEW v2.3.0 |
| Writing feedback.handler | `code-execution--learning-signal-capture-SKILL.md` |
| After NODE built | `planning--node-design-review-SKILL.md` |
| Reviewing flow plans | `planning--flow-design-cycle-SKILL.md` |
| **Before any value is written into code or config** | **`planning--freedom-machine-classification-SKILL.md` (SK-451)** ← NEW v2.3.0 |
| Gate C approval → SESSION files | `planning--session-file-authoring-SKILL.md` (SK-443) ← MANDATORY |
| **Gate C approval → ARCHITECTURE-DECISIONS.json** | **`planning--architecture-decision-capture-SKILL.md` (SK-450)** ← NEW v2.3.0 |
| Gate C approval | `planning--architectural-decision-testing-SKILL.md` |
| **After plan is produced, before writing session files** | **`planning--assumption-registry-SKILL.md` (SK-456)** ← NEW v2.3.0 |

### Session output (before every ⛔ STOP)

| When | Load |
|------|------|
| Before every ⛔ STOP (all session types) | `session-output--mission-progress-SKILL.md` (SK-445) |
| End of investigation session | `session-output--investigation-handoff-SKILL.md` |
| **At Claude Code session START — before any code written** | **`code-execution--phase-preflight-SKILL.md` (SK-457)** ← NEW v2.3.0 |

### Investigation and analysis

| When | Load |
|------|------|
| Cross-branch work, merge analysis | `code-execution--github-lab-SKILL.md` |
| **convergence.handler emits DOWNSTREAM_CONTRACT / REST_CONTRACT / SCHEMA_VERSION** | **`code-execution--github-lab-SKILL.md` — CONVERGENCE-TIME CONTEXT RESOLUTION section** ← NEW v2.3.0 |
| Problem has recurred ("we fixed this before") | `planning--root-cause-ladder-SKILL.md` |
| Evaluating whether XIIGen can handle a scenario | `planning--simulation-protocol-SKILL.md` (SK-441) |
| **Tracing an event across two flows (cross-flow boundary)** | **`planning--simulation-protocol-SKILL.md` — CROSS_FLOW_TRACE section** ← NEW v2.3.0 |
| Gap analysis — after simulations, before planning | `planning--simulation-protocol-SKILL.md` + `planning--solution-scope-gate-SKILL.md` + `planning--root-cause-ladder-SKILL.md` |
| Before drafting ANY session files after analysis | `planning--level-correction-response-SKILL.md` — PROACTIVE REFRAME SCAN section |

---

## THE PLANNING PIPELINE — STEP ORDER (v2.3.0)

```
⓪(-1)  output-contract-design (SK-448)  ← NEW — BEFORE session starts
⓪      solution-scope-gate              Before ANY solution is proposed
⓪      problem-decomposition            If session is problem-driven
⓪      root-cause-ladder               If problem has recurred
⓪      implementation-mode-gate        Who writes code?
⓪.5    flow-vs-service-gate            FLOW or SERVICE for each capability?
⓪.5b   wave-assignment (SK-455)        ← NEW — Assign wave before planning starts
①      agent-output-format-skill
②      xiigen-core-principles          M1-M5 + P1-P22
③      planning-session-startup
③.5    architectural-decision-testing  DECISION LOADING — before any proposal
④      infrastructure-discovery        Steps 0.5 + 1.5
④.3    system-intake (SK-454)          ← NEW — If designing for existing codebase
④.5    NODE CONVERGENCE                Before Phase A content — build verified NODE
        convergence-round-design (SK-452)  ← NEW — If writing convergence session files
⑤      planning-skill (8 gates)        node: field required in all FLOW task types
        stack-portability-design (SK-453) ← NEW — For each capability + target stack
        iron-rule-derivation (SK-449)    ← NEW — Derive rules from failure modes
        freedom-machine-classification (SK-451) ← NEW — Classify each value
⑥      plan-review-skill               FC-1..FC-32
⑦      flow-reexamination
⑧      naming-conventions-enforcer (SK-447)
⑨      stack-coupling-auditor
⑩      node-design-review              After NODE built, before Phase B
GATE C → session-file-authoring (SK-443) ← MANDATORY
GATE C → assumption-registry (SK-456)           ← NEW — register assumptions before session files
GATE C → architecture-decision-capture (SK-450) ← NEW — Produce ARCHITECTURE-DECISIONS.json
GATE C → ARCHITECTURE-DECISIONS.json seeded to RAG
GATE C → output-contract-verification (SK-448)  ← verify deliverables match request
⑪      architectural-decision-testing  Immediate tests at Gate C

Before every ⛔ STOP → output-contract verification (SK-448) ← NEW
Before every ⛔ STOP → session-output--mission-progress (SK-445) ← MANDATORY

ANALYSIS PIPELINE (when evaluating gaps, not designing a flow):
⓪     claim-verification               SESSION-OPENING STATE PROTOCOL
⓪.5   architectural-decision-testing   DECISION LOADING
①     simulation-protocol (SK-441)     L1/L2/L3 single-flow traces
       + CROSS_FLOW_TRACE (SK-441 extension) ← NEW — for cross-flow boundary checks
②     solution-scope-gate              GAP CLASSIFICATION + deduplication
③     root-cause-ladder               CROSS-GAP CONVERGENCE
④     level-correction-response       PROACTIVE REFRAME SCAN — before session files
⑤     PLAN — rooted in simulation evidence
```

---

## GATE C MANDATORY OUTPUT (v2.3.0)

Gate C does NOT pass without ALL FIVE:

1. **SESSION files** — pass all 7 self-containment checks (FC-28, SK-443)
2. **`FLOW-XX-ARCHITECTURE-DECISIONS.json`** — DESIGN_REASONING triples for every
   non-obvious decision (SK-450) — seeded to RAG at Phase A start
3. **Assumption registry** (SK-456) — STEP 0 assumption table populated in session file;
   every assumption has a verification command and expected result
4. **SK uniqueness sweep** — `grep -rn "SK-4[4-5][0-9]" .claude/skills/ *.md | grep -v SKILL-INDEX | sort`
   → Zero collisions before delivery (C-6)
5. **Output contract verified** (SK-448) — every verification command passed ← NEW v2.3.0

---

## WHAT CHANGED IN v2.3.0

Source: Skills Gap Analysis — Architecture Designing Capabilities (2026-03-26)

| Change | What it adds |
|--------|-------------|
| NEW SK-448 | output-contract-design: machine-readable done definition before every session |
| NEW SK-449 | iron-rule-derivation: derive CF rules from failure modes, not templates |
| NEW SK-450 | architecture-decision-capture: Gate C produces retrievable DESIGN_REASONING triples |
| NEW SK-451 | freedom-machine-classification: eliminates recurring FC-31 violations |
| NEW SK-452 | convergence-round-design: challenger prompts for FLOW-37 planning session |
| NEW SK-453 | stack-portability-design: mechanism vs design test for INCOMPATIBLE verdicts |
| NEW SK-454 | system-intake-design: extract {structure,intent,constraints,quality} from any artifact |
| NEW SK-455 | wave-assignment: N>2 rule, gate type selection, cost impact |
| NEW SK-456 | assumption-registry: register + verify all plan assumptions at authoring time |
| NEW SK-457 | phase-preflight: execute assumption registry at Claude Code session start |
| EXTEND SK-441 | simulation-protocol: CROSS_FLOW_TRACE protocol added |
| EXTEND SK-441 | simulation-protocol: gap_class A-I taxonomy added to gap column |
| EXTEND SK-436 | github-lab: CONVERGENCE-TIME CONTEXT RESOLUTION for 3 of 5 request types |
| PATCH SK-432 | root-cause-ladder: triggers "after running simulations" + "gap catalog produced" |
| UPDATED | Gate C now requires 5 items (assumption registry and output contract verification) |
| UPDATED | Planning pipeline adds steps ⓪(-1), ⓪.5b, ④.3, and new Gate C items |

**Mandatory additions to every ⛔ STOP:**
- OUTPUT CONTRACT VERIFICATION (SK-448) — runs before claiming done

**New mandatory Gate C requirement:**
- `planning--architecture-decision-capture-SKILL.md` (SK-450) — ARCHITECTURE-DECISIONS.json
  must be produced before session files; seeded to RAG at Phase A start

---

## WHAT EACH SKILL PREVENTS (v2.3.0 additions)

| Skill | What it prevents |
|-------|-----------------|
| output-contract-design (SK-448) | Sessions claiming complete with partial deliverables; S1-S7 rework pattern |
| iron-rule-derivation (SK-449) | Vague or copied iron rules that don't guard the actual failure modes |
| architecture-decision-capture (SK-450) | Gate C decisions that don't improve future planning quality |
| freedom-machine-classification (SK-451) | Recurring FC-31 violations; hardcoded model names in contracts |
| convergence-round-design (SK-452) | FLOW-37 session files with challenger prompt placeholders (SK-443 Gate C failure) |
| stack-portability-design (SK-453) | INCOMPATIBLE verdicts that are actually IMPL_VARIES_WITH_PROVIDER (T48 pattern) |
| system-intake-design (SK-454) | Re-deriving extraction methodology for every new domain (Pascal, Figma, multi-repo) |
| wave-assignment (SK-455) | Wrong wave causing compound errors across FLOW-02..24 |
| assumption-registry (SK-456) | Blocking issues discovered mid-session from wrong method signatures, missing registrations, stale prior-group assumptions |
| phase-preflight (SK-457) | Claude Code writing code against assumptions that fail (camelCase/snake_case, missing registrations, incomplete prior groups) |
| SK-441 CROSS_FLOW_TRACE | Boundary invariant violations (userId hyphen-stripping) missed by single-flow simulation |
| SK-441 gap_class taxonomy | Gaps treated individually when architectural layer analysis would show shared root cause |
| SK-436 convergence context | CONTEXT_INSUFFICIENT requests stalling convergence when GitHub data is resolvable |
| SK-432 trigger additions | SK-432 CROSS-GAP CONVERGENCE failing to load after simulation cycle produces gap catalog |

---

## APPLIES IMMEDIATELY vs NEEDS INFRASTRUCTURE (v2.3.0)

### Use now (no infrastructure needed):
- All 8 new skills (SK-448..SK-455)
- SK-441 CROSS_FLOW_TRACE extension (manual simulation, no infrastructure)
- SK-436 convergence context (GitHub MCP or HTTPS, already available)
- Output contract verification at every ⛔ STOP

### Needs convergence.handler active (Task 7 — Group E):
- SK-452 challenger prompts are used by convergence.handler at runtime
- SK-454 system-intake domain context package feeds into convergence.handler

### Needs semantic RAG active (Group A — IRagService wired):
- SK-454 CONTEXT_INSUFFICIENT requests via RAG resolution path

---

## FILE INVENTORY (v2.3.0 complete — 16 files)

**New skills (10):**
- `planning--output-contract-SKILL.md` (SK-448)
- `planning--iron-rule-derivation-SKILL.md` (SK-449)
- `planning--architecture-decision-capture-SKILL.md` (SK-450)
- `planning--freedom-machine-classification-SKILL.md` (SK-451)
- `planning--convergence-round-design-SKILL.md` (SK-452)
- `planning--stack-portability-design-SKILL.md` (SK-453)
- `planning--system-intake-SKILL.md` (SK-454)
- `planning--wave-assignment-SKILL.md` (SK-455)
- `planning--assumption-registry-SKILL.md` (SK-456)
- `code-execution--phase-preflight-SKILL.md` (SK-457)

**Extensions and patches (4):**
- `PATCH--simulation-protocol-CROSS-FLOW-TRACE.md` (extends SK-441)
- `PATCH--simulation-protocol-GAP-TAXONOMY.md` (extends SK-441, gap_class A-I)
- `PATCH--github-lab-CONVERGENCE-CONTEXT.md` (extends SK-436)
- `PATCH--root-cause-ladder-TRIGGERS.md` (extends SK-432, 2 trigger additions)

**Governance updates (2):**
- `HOW-TO-USE-SKILLS-v2.3.0.md`
- `FLOW-DESIGN-SKILL-INDEX-v2.3.0.md`

**Carry-forward from v2.2.0:**
All v2.2.0 skills carry forward unmodified.

**Next available SK number: SK-458**
