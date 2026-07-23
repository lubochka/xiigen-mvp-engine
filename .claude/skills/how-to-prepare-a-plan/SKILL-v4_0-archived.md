---
name: how-to-prepare-a-plan-skill
version: "5.0.0"
description: >
  Master orchestration skill for preparing plans that Claude Code can actually
  execute. Includes 5 core sub-skills + SK-416-433 planning skills from the
  Mode C / Client Architecture session + FLOW-00.2 stack coupling skills.
  11 principles (P1-P11) must all be answered before any other planning work.
  DECISIONS-LOCKED.md is the authoritative source for all architectural decisions.
author: luba
updated: "2026-03-20"
priority: SUPREME
triggers:
  - "make a plan for Claude Code"
  - "prepare a plan"
  - "new flow"
  - "new feature"
  - "planning for Claude Code"
  - "plan FLOW-"
---

# How to Prepare a Plan for Claude Code v5.0

## Before Anything Else: Read These Three Documents

```
1. PROJECT_REFERENCE.md         ← Master navigation guide (read at session start)
2. DECISIONS-LOCKED.md          ← All architecture decisions D1-D18 + SDK/CLIENT/E2E
3. INFRASTRUCTURE-FLOWS-STATE-v4.json ← Authoritative baseline numbers
```

**These three documents govern everything. Any plan that contradicts them is wrong.**

---

## The 9-Skill Pipeline (in order)

```
1. agent-output-format-skill      ← session START, declare consumer
2. xiigen-core-principles-skill   ← GATE 0: 11 principles (P1-P11, 44+ items)
3. SK-416 PlanningSessionStartup  ← verify STATE.json + DECISIONS-LOCKED.md
4. infrastructure-discovery       ← verify codebase facts against live docs
5. planning-skill (8 gates)       ← validate content
6. plan-review-skill (FC-1-15)    ← validate structure
7. SK-418 FlowCompletenessChecker ← for user-facing flows: 31-item checklist
8. SK-432 HybridPromptBuilder     ← convert genesis prompts to Option C format
9. SK-431 StackCouplingAuditor    ← stack coupling audit (ALL flows)
→ 3-gate approval (A/B/C)
→ Claude Code executes
```

**GATE 0 (P1–P11) must pass before infrastructure discovery.**
A plan that cannot answer all checklist items is INCOMPLETE.
Step 9 (SK-431) runs for ALL flows — single-stack plans produce minimal annotations.

---

## The 10 Principles — Quick Reference

| # | Principle | Key question |
|---|-----------|-------------|
| P1 | Multi-Tenant | tenantId on every entity, RAG filtered, isolation test exists? |
| P2 | Safe Configs | ISecretsService for creds, FREEDOM for tenant values? |
| P3 | Prompt Improvement | PromptAsset versioning + PromptPatch cycle from AF-9? |
| P4 | Dual RAG | ES global tier AND local docker tier both designed? |
| P5 | Always Improve | 6 metrics/run captured, improvement cycle defined? |
| P6 | Arbitrate Decisions | 5 arbiters configured for each new T-XXX? |
| P7 | Test Locally | All 4 layers, zero cloud credentials, docker-compose? |
| P8 | Local Model | Training capture, FREEDOM endpoint, per-tenant isolation? |
| P9 | Mode C Event-First | Event contracts in contracts/events/? QUEUE FABRIC only? No PII? |
| P10 | Client Architecture | Client state map, FlowStateSnapshot, optimistic contracts, SDK? |
| P11 | Stack Coupling Awareness | stackTargets declared, stackCoupling on all task types, INCOMPATIBLE flags? |

See `xiigen-core-principles-skill/SKILL.md` for full checklist.

---

## Current Artifact Boundaries (post FLOW-35 — ALWAYS verify against live docs)

```
ALWAYS read from INFRASTRUCTURE-FLOWS-STATE-v4.json before using ANY number.
These are the session-start reference values only.

Next Factory:   F1491     (FLOW-35 uses F1484-F1490)
Next Family:    224       (FLOW-35 uses Family 223)
Next Task Type: T567      (FLOW-35 uses T565-T566; FLOW-0 Bootstrap uses T567+)
Next BFA Rule:  CF-796    (FLOW-35 uses CF-789-CF-795)
Next Skill:     SK-426    (FLOW-35 uses SK-402-SK-415; session skills SK-416-SK-425)
Test baseline:  ≥ 4,050   (after FLOW-35 complete)

Execution order:
  FLOW-0A → SKILL-GRAPH-S1 → FLOW-25 → FLOW-27 → FLOW-29 → FLOW-30
  → FLOW-26 → FLOW-31 → FLOW-33 → FLOW-35 → FLOW-01 through FLOW-24
```

---

## Planning Session Skill Index (SK-416–SK-425)

These skills are loaded by AF-4 during planning conversations.
They complement the 5-skill pipeline — invoke as needed.

| SK | Name | When to invoke |
|----|------|----------------|
| SK-416 | PlanningSessionStartup | Session start — read STATE.json + DECISIONS-LOCKED.md |
| SK-417 | DecisionReopeningProtocol | Before challenging any locked decision |
| SK-418 | FlowCompletenessChecker | Before producing session files for any flow |
| SK-419 | ModeCEventContractDesigner | When designing event schemas (Pass 1/2 of reexamination) |
| SK-420 | ClientServerSymmetry | When examining flows from client perspective (Pass 2/3) |
| SK-421 | E2ETestMatrixBuilder | When building test matrix for any flow (Pass 6) |
| SK-422 | MetaEscalationRouter | When meta::round-controller produces ESCALATE/HALT |
| SK-423 | DocumentHierarchyNavigator | Before producing any new document |
| SK-424 | BlastRadiusAssessor | Before any engine modification or contract change |
| SK-425 | CostEffectiveModelSelection | When model fitness signals need interpretation |
| SK-431 | StackCouplingAuditor | Step 9 — stack coupling audit for ALL flows |
| SK-432 | HybridPromptBuilder | Convert genesis prompts to Option C hybrid format |
| SK-433 | AngularObservableChainAuditor | When angular is a clientTarget with observable state |

---

## For User-Facing Flows (FLOW-01 through FLOW-24)

After steps 1-6 of the pipeline, run the 7-pass re-examination algorithm:

```
Pass 1: Event contract extraction      → server + client + compensation schemas
Pass 2: Client event identification    → optimistic contracts, clientTimestamp
Pass 3: Client state map               → what each DAG node shows to user
Pass 4: Retry and compensation review  → LIFO order, execution-unit owns retry
Pass 5: Observability additions        → phase-aware logging, Grafana dashboard
Pass 6: E2E test matrix                → 8 mandatory categories, virtual clock
Pass 7: Genesis prompt updates         → Mode C section, integration boundary

Validation: SK-418 FlowCompletenessChecker runs 15-item checklist.
All 15 must pass before session files are produced.
```

Reference: `FLOW-REEXAMINATION-ALGORITHM.md` + `FLOW-01-REFERENCE-PLAN-v5.md`

---

## For Engine/Meta-Arbitration Changes (FLOW-35 and extensions)

```
Additional skills:
  META-ARBITRATION-LAYER.md         ← data structures + 5 meta-arbiter specs
  ENGINE-MODIFICATION-PROTOCOLS.md  ← 8 protocols (SK-407-SK-414)
  SK-424 BlastRadiusAssessor         ← CRITICAL for any engine change

Pre-conditions before any engine modification:
  □ Read the correct protocol (ADD_STATION through CHANGE_STREAM)
  □ Verify ALL pre-conditions — none are optional
  □ Take baseline snapshot before touching files
  □ Post-conditions verified after modification
  □ Rollback procedure documented before starting
```

---

## Full Session Checklist

```
☐ agent-output-format: consumer declared (Claude Code vs human), format locked
☐ SK-416 PlanningSessionStartup: STATE.json read, DECISIONS-LOCKED.md checked
☐ GATE 0 — 10 principles: all 44 items answered (see xiigen-core-principles-skill)
☐ infrastructure-discovery: paths/counts/artifacts verified against LIVE docs
☐ planning-skill gates 0–7: all pass
☐ SK-423 DocumentHierarchy: no competing documents created
☐ SK-424 BlastRadius: impact assessed for any engine/contract change

For user-facing flows additionally:
☐ SK-418 FlowCompleteness: all 15 items pass
☐ SK-419 ModeCContracts: event schemas in contracts/events/FLOW-XX/
☐ SK-420 ClientSymmetry: client state map defined
☐ SK-421 E2EMatrix: test matrix with virtual clock tests

Deliverables:
☐ STATE.json + SESSION-0 + SESSION-1 + REFERENCE-PLAN.md (labeled do not execute)
☐ plan-review-skill: FC-1 to FC-15 all pass
☐ Gate A: automated FC checks
☐ Gate B: 2 AI model cross-reviews
☐ Gate C: Luba written approval
```

---

## Hard Constraints (never change)

```
NEVER:
✗ Use numbers from memory — always verify against live canonical docs
✗ Re-open a locked decision without an ADR entry in DECISIONS-LOCKED.md
✗ Create a document that competes with an existing Tier 1-3 document
✗ Chain phases without explicit per-phase approval
✗ Declare a phase complete if either npm test suite regresses
✗ Produce session files before SK-418 FlowCompletenessChecker passes (for flows)

ALWAYS:
✓ Read PROJECT_REFERENCE.md + DECISIONS-LOCKED.md + STATE-v4.json first
✓ Both cd server && npm test AND cd client && npm test in every gate
✓ Save STATE.json after every phase
✓ ⛔ STOP after every phase — wait for explicit "yes" before continuing
✓ QUEUE FABRIC events are the only inter-service communication (Mode C)
✓ Event contracts in contracts/events/FLOW-XX/ (not embedded in service code)
```
