---
name: how-to-prepare-a-plan-skill
version: "4.0.0"
description: >
  Master orchestration skill for preparing plans that Codex can actually
  execute. Includes 5 core sub-skills + SK-416-430 planning skills.
  10 principles (P1-P10) must all be answered before any other planning work.
  SK-430 NamingConventionsEnforcer added as step 8 — runs before session files are produced.
  DECISIONS-LOCKED.md is the authoritative source for all architectural decisions.
author: luba
updated: "2026-03-22"
priority: SUPREME
triggers:
  - "make a plan for Codex"
  - "prepare a plan"
  - "new flow"
  - "new feature"
  - "planning for Codex"
  - "plan FLOW-"
changes_from_v3:
  - SK-430 NamingConventionsEnforcer added as step 8 of the pipeline
  - FC-16, FC-17, FC-18 added to SESSION-0 checklist
  - flow_name required in all STATE.json templates
  - FLOW-00.1 added to execution order (before FLOW-01)
  - Jira comment now requires 5-section business context format
  - Lint gate (npm run lint:naming) added to every Phase D + Phase E gate
---

# How to Prepare a Plan for Codex v4.0

## Before Anything Else: Read These Three Documents

```
1. PROJECT_REFERENCE.md         ← Master navigation guide (read at session start)
2. DECISIONS-LOCKED.md          ← All architecture decisions D1-D18 + D-NAMING-1
3. INFRASTRUCTURE-FLOWS-STATE-v4.json ← Authoritative baseline numbers
```

**These three documents govern everything. Any plan that contradicts them is wrong.**

---

## The 8-Skill Pipeline (in order)

```
1. agent-output-format-skill      ← session START, declare consumer
2. xiigen-core-principles-skill   ← GATE 0: 10 principles (P1-P10, 44 items)
3. SK-416 PlanningSessionStartup  ← verify STATE.json + DECISIONS-LOCKED.md
                                     MANDATORY: extract stackTargets + clientTargets
                                     and state them explicitly before step 4.
                                     These are the SCOPE FILTER for all subsequent steps.
                                     Example output: "SCOPE: server=node-nestjs, client=react-web"
4. infrastructure-discovery       ← verify codebase facts against live docs
5. planning-skill (8 gates)       ← validate content
6. plan-review-skill (FC-1-18)    ← validate structure + naming compliance
7. SK-418 FlowCompletenessChecker ← V0 scope check FIRST, then V1–V31
8. SK-430 NamingConventionsEnforcer ← validate all names before session files
→ 3-gate approval (A/B/C)
→ Codex executes
```

**GATE 0 (P1–P10) must pass before infrastructure discovery.**
**Step 3 (SK-416) MUST produce explicit SCOPE statement before step 4.**
**Step 8 (SK-430) must pass before session files are produced.**
A plan with file names like `flow35-contracts.ts` or missing `flow_name` in STATE.json
fails Step 8 and session files are not produced.

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

See `xiigen-core-principles-skill/SKILL.md` for full 44-item checklist.

---

## Current Artifact Boundaries (post FLOW-35 — ALWAYS verify against live docs)

```
ALWAYS read from INFRASTRUCTURE-FLOWS-STATE-v4.json before using ANY number.
These are the session-start reference values only.

Next Factory:   F1491     (FLOW-35 uses F1484-F1490)
Next Family:    224       (FLOW-35 uses Family 223)
Next Task Type: T567      (FLOW-35 uses T565-T566; FLOW-0 Bootstrap uses T567+)
Next BFA Rule:  CF-796    (FLOW-35 uses CF-789-CF-795)
Next Skill:     SK-430    (registered in FLOW-00.1 Phase D)
Test baseline:  ≥ 4,050   (after FLOW-35 complete)

Execution order:
  FLOW-0A → SKILL-GRAPH-S1 → FLOW-25 → FLOW-27 → FLOW-29 → FLOW-30
  → FLOW-26 → FLOW-31 → FLOW-33 → FLOW-35 → FLOW-36 → FLOW-00
  → FLOW-00.1 (naming fix-up)             ← NEW
  → FLOW-01 → FLOW-02 → FLOW-03..24
```

---

## Planning Session Skill Index (SK-416–SK-430)

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
| SK-430 | NamingConventionsEnforcer | Step 8 of pipeline — before every session file is produced |

---

## SK-430 — What It Checks (Step 8 of pipeline)

Run SK-430 after SK-418 and before producing any session file.
SK-430 blocks session file production if any violation is found.

```
Rule 1 — engine-contracts/ file names
  ✓ meta-arbitration-engine-contracts.ts
  ✗ flow35-contracts.ts

Rule 2 — engine/flows/ directory names
  ✓ engine/flows/meta-arbitration-engine/
  ✗ engine/flows/flow35/

Rule 3 — EngineContract schema
  ✓ flowId: 'FLOW-35', flowName: 'Meta-Arbitration Engine'
  ✗ (missing flowId or flowName)

Rule 4 — STATE.json
  ✓ "flow_name": "Meta-Arbitration Engine"
  ✗ (missing flow_name)

Rule 5 — Jira comments (SK-429)
  ✓ All 5 sections present: business purpose, flow context, technical
    delivery, architecture fit, will be used by
  ✗ "Phase D complete. 5 files. 30 tests."

Rule 6 — Constants
  ✓ const META_ARBITRATION_ENGINE_QUALITY_GATES = [...]
  ✗ const FLOW35_QUALITY_GATES_CORE = [...]
```

**Authoritative domain name table:** DECISIONS-LOCKED.md → D-NAMING-1

---

## SESSION-0 Checklist (FC-1 through FC-18)

The original FC-1 through FC-15 are unchanged. Three new checks added:

```
FC-16: All proposed service files use domain names (not t47-*, not flow01-*)
FC-17: STATE.json template includes flow_name field
FC-18: Jira comment template follows SK-430 Rule 5 (5 sections present)
```

---

## For User-Facing Flows (FLOW-01 through FLOW-24)

After steps 1-8 of the pipeline, run the 7-pass re-examination algorithm.
All 7 passes unchanged. SK-418 28-item checklist unchanged.

**New prerequisite before FLOW-01 Phase A:**
```
✓ FLOW-00.1 complete (npm run lint:naming exits 0)
✓ EngineContract schema has flowId + flowName (Phase A of FLOW-00.1)
```

**Generated service file naming:**
```
Pattern: {verb}-{domain-noun}.service.ts

FLOW-01 examples:
  T47 → user-registration-initiator.service.ts
  T48 → email-verification-wait.service.ts
  T49 → onboarding-delivery.service.ts

FLOW-02 examples:
  T50 → parallel-profile-enricher.service.ts
  T51 → matching-convergence-gate.service.ts
  T52 → onboarding-completion-broadcaster.service.ts
```

**Phase D gate addition for all user-facing flows:**
```
✓ npm run lint:naming — exits 0
✓ All new .service.ts files follow {verb}-{domain-noun} pattern
✓ No t{N}-*.ts or flow{NN}-*.ts files created
```

---

## For Engine/Meta-Arbitration Changes (FLOW-35 and extensions)

Unchanged from v3, with one addition:
```
□ FLOW-00.1 must be complete before FLOW-35 Phase I session output runs
  (SK-429 Jira template must already be updated to 5-section format)
```

---

## Full Session Checklist

```
☐ agent-output-format: consumer declared (Codex vs human), format locked
☐ SK-416 PlanningSessionStartup: STATE.json read, DECISIONS-LOCKED.md checked
☐ GATE 0 — 10 principles: all 44 items answered
☐ infrastructure-discovery: paths/counts/artifacts verified against LIVE docs
☐ planning-skill gates 0–7: all pass
☐ SK-423 DocumentHierarchy: no competing documents created
☐ SK-424 BlastRadius: impact assessed for any engine/contract change
☐ SK-430 NamingConventionsEnforcer: Rules 1–6 all pass ← NEW

For user-facing flows additionally:
☐ SK-418 FlowCompleteness: all 28 items pass
☐ SK-419 ModeCContracts: event schemas in contracts/events/FLOW-XX/
☐ SK-420 ClientSymmetry: client state map defined
☐ SK-421 E2EMatrix: test matrix with virtual clock tests

Deliverables:
☐ STATE.json (includes flow_name) + SESSION-0 + SESSION-1 + REFERENCE-PLAN.md
☐ plan-review-skill: FC-1 to FC-18 all pass  ← FC-16/17/18 new
☐ Gate A: automated FC checks
☐ Gate B: 2 AI model cross-reviews
☐ Gate C: Luba written approval
☐ Gate C ADDITIONAL: FLOW-XX-ARCHITECTURE-DECISIONS.json present and seeded

GATE C ADDITIONAL REQUIRED OUTPUT: FLOW-XX-ARCHITECTURE-DECISIONS.json

Before session files are produced, produce FLOW-XX-ARCHITECTURE-DECISIONS.json.

Required entries — one for each of these that occurred in this session:
  □ Any Q1-Q4 classification where the answer was non-obvious
  □ Any capability reclassification (INCOMPATIBLE → IMPL_VARIES_WITH_PROVIDER,
    MANUAL → FLOW, SERVICE → FLOW)
  □ Any wave assignment (if non-obvious — more than one valid wave would work)
  □ Any iron rule derived from domain analysis (not copied from a template)
  □ Any fabric interface introduced to replace a hardcoded dependency
  □ Any cross-flow dependency identified that could produce a BFA conflict

Each entry uses the DESIGN_REASONING triple format:
  { decisionId, type, capability, context, proposed, challenge,
    resolution, principleApplied, teachingPoint }
  (see docs/design-reasoning-triple.schema.json for full schema)

SEEDING: Seed to xiigen-rag-patterns with patternType: ARCHITECTURE_DECISION
at the START of Phase A seeding. Future planning sessions need these immediately.

⛔ Gate C does NOT pass without ARCHITECTURE-DECISIONS.json present and seeded.

PHASE A PREREQUISITE: NODE CONVERGENCE

Before writing any Phase A session content, define the NODE for each capability
this flow will generate. For each task type (T-XXX) with decision = FLOW:
  □ structure: inputShape, outputShape, dependencies, triggers, emits
  □ intent: purpose (one sentence), invariants[], failureModes[], domainConcepts[]
  □ constraints: iron rules in CF-N format
  □ quality: scoringCriteria[], acceptanceThreshold, degradationConditions

PHASE A EXIT GATE — STACK PORTABILITY CHECK

For each task type where stackProfiles contains more than one stack:
  □ At least one stack has tier: IMPL_VARIES or IMPL_VARIES_WITH_PROVIDER
  □ No INCOMPATIBLE without documented mitigation path (or confirmed design-level)
  □ Section 4 exists for each non-INCOMPATIBLE stack in genesis prompt
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
✗ Produce session files before SK-430 NamingConventionsEnforcer passes ← NEW
✗ Name any file flow{NN}-*.ts or directory flow{NN}/ ← NEW
✗ Create an EngineContract without flowId + flowName fields ← NEW
✗ Produce a STATE.json without flow_name ← NEW
✗ Write a Jira comment without 5-section business context ← NEW

ALWAYS:
✓ Read PROJECT_REFERENCE.md + DECISIONS-LOCKED.md + STATE-v4.json first
✓ Both cd server && npm test AND cd client && npm test in every gate
✓ npm run lint:naming in every Phase D + Phase E gate ← NEW
✓ Save STATE.json (with flow_name) after every phase ← NEW
✓ ⛔ STOP after every phase — wait for explicit "yes" before continuing
✓ QUEUE FABRIC events are the only inter-service communication (Mode C)
✓ Event contracts in contracts/events/FLOW-XX/ (not embedded in service code)
```
