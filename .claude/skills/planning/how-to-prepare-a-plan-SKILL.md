---
name: how-to-prepare-a-plan-skill
version: "6.0.0"
description: >
  Master orchestration skill for preparing plans. 10-step pipeline (step ⓪
  is implementation mode gate). 13 principles (P1-P13). FC-1 through FC-21
  + V0-MODE/V0-SCOPE. Plans for user-facing flows (FLOW-01..24) MUST route
  service code generation through the XIIGen AF pipeline, not Claude Code.
author: luba
updated: "2026-03-22"
priority: SUPREME
triggers:
  - "prepare a plan"
  - "new flow"
  - "planning for Claude Code"
  - "plan FLOW-"
---

# How to Prepare a Plan v6.0

## Before Anything Else: Read These Documents

```
1. PROJECT_REFERENCE.md              ← Master navigation
2. DECISIONS-LOCKED.md               ← All D-xxx decisions
3. INFRASTRUCTURE-FLOWS-STATE-v4.json ← Authoritative baseline numbers
```

---

## The 10-Step Pipeline

```
⓪ implementation-mode-gate        ← WHO writes code? af-pipeline vs manual (P12)
                                     + SCOPE: stackTargets/clientTargets (P13)
① agent-output-format-skill       ← session START, declare consumer
② xiigen-core-principles v4       ← GATE 0: 13 principles (P1-P13)
③ planning-session-startup v1.2   ← verify STATE.json + DECISIONS-LOCKED.md
                                     + implementationMode + scope extraction
④ infrastructure-discovery        ← verify codebase facts against live docs
⑤ planning-skill (8 gates)        ← validate content
⑥ plan-review-skill (FC-1–21)     ← validate structure + naming + stack coupling
⑦ flow-reexamination              ← user-facing flows: 7-pass algorithm
⑧ naming-conventions-enforcer     ← Rules 1–6 before session files
⑨ stack-coupling-auditor          ← V29/V30/V31 before session files
   + hybrid-prompt-builder         ← genesis prompts as AF-1 input (not Claude Code instructions)
→ Gate A (V0-MODE + V0-SCOPE + FC-1–21 automated)
→ Gate B (2 AI cross-reviews)
→ Gate C (Luba written approval)
   ⛔ Gate C requires FLOW-XX-ARCHITECTURE-DECISIONS.json (P15 + v1.0.3)
```

**Step ⓪ must pass before anything else. If implementationMode is wrong,
the entire plan is wrong.**
**GATE 0 (P1–P13) must pass before infrastructure discovery.**
**Steps 8 and 9 must pass before any session file is produced.**

---

## The 13 Principles — Quick Reference

| # | Principle | Key question |
|---|-----------|-------------|
| P1 | Multi-Tenant | tenantId on every entity, RAG filtered, isolation test? |
| P2 | Safe Configs | ISecretsService for creds, FREEDOM for tenant values? |
| P3 | Prompt Improvement | PromptAsset versioning + PromptPatch cycle from AF-9? |
| P4 | Dual RAG | ES global tier AND local docker tier both designed? |
| P5 | Always Improve | 6 metrics/run, improvement cycle defined? |
| P6 | Arbitrate Decisions | 5 arbiters per new T-XXX? |
| P7 | Test Locally | All 4 layers, zero cloud credentials, docker-compose? |
| P8 | Local Model | Training capture, FREEDOM endpoint, per-tenant isolation? |
| P9 | Mode C Event-First | Event contracts in contracts/events/? QUEUE FABRIC only? |
| P10 | Client Architecture | Client state map, FlowStateSnapshot, optimistic contracts? |
| P11 | Stack Coupling | stackCoupling on all task types, INCOMPATIBLE flags, stateNotes? |
| **P12** | **Implementation Mode** | **af-pipeline for FLOW-01..24? SESSION files use afPipeline.run()?** |
| **P13** | **Scope Discipline** | **Content ONLY for declared stackTargets/clientTargets?** |

---

## Current Artifact Boundaries

```
ALWAYS read from INFRASTRUCTURE-FLOWS-STATE-v4.json before using ANY number.

Next Factory:   F1491
Next Task Type: T567 (FLOW-0 Bootstrap uses T567+)
Next BFA Rule:  CF-796
Next Skill:     SK-433 (SK-430/431/432 registered in FLOW-00.1/FLOW-00.2)
Test baseline:  ≥ 4,050 (after FLOW-35 + FLOW-00.2 complete)

Execution order:
  FLOW-0A → SKILL-GRAPH-S1 → FLOW-25 → FLOW-27 → FLOW-29 → FLOW-30
  → FLOW-26 → FLOW-31 → FLOW-33 → FEATURE-REGISTRY-S1
  → FLOW-35 → FLOW-36 → FLOW-00
  → FLOW-00.1 (naming fix-up)        ← lint:naming must exit 0 before FLOW-01
  → FLOW-00.2 (stack coupling base)  ← SK-431/432 registered, 31-item checklist
  → FLOW-00.3 (cost pipeline wiring) ← required before af-pipeline mode
  → FLOW-34 (marketplace plugin adapters — C5 Canva as canonical example)
  → FLOW-01 re-review → FLOW-02 re-review → FLOW-03 re-review → FLOW-04 re-review
  → FLOW-01 execution (Wave 0) — af-pipeline mode
  → FLOW-02 → FLOW-03/04 (Wave 2 parallel) — af-pipeline mode
```

---

## Step 8: SK-430 NamingConventionsEnforcer — What It Checks

```
Rule 1: engine-contracts/ files use domain names (not flow{NN}-*)
        ✓ meta-arbitration-engine-contracts.ts  ✗ flow35-contracts.ts

Rule 2: engine/flows/ directories use domain names (not flow{NN}/)
        ✓ engine/flows/meta-arbitration-engine/  ✗ engine/flows/flow35/

Rule 3: EngineContract includes flowId + flowName
        ✓ flowId: 'FLOW-35', flowName: 'Meta-Arbitration Engine'

Rule 4: STATE.json includes flow_name
        ✓ "flow_name": "Meta-Arbitration Engine"

Rule 5: Jira comments (SK-429) have 5 sections:
        Business purpose, Flow context (with "Will be used by"),
        Technical delivery, Architecture fit
        ✗ "Phase D complete. 5 files. 30 tests."

Rule 6: Constants use domain prefixes (not FLOW{NN}_*)
        ✓ META_ARBITRATION_ENGINE_QUALITY_GATES  ✗ FLOW35_QUALITY_GATES_CORE
```

Authoritative domain name table: DECISIONS-LOCKED.md → D-NAMING-1

---

## Step 9: SK-431 StackCouplingAuditor + SK-432 HybridPromptBuilder

**SK-431** classifies every element as CONCEPT_NEUTRAL / IMPL_VARIES /
STACK_COUPLED / INCOMPATIBLE. Produces stackCoupling annotations.
Flags INCOMPATIBLE stacks before implementation. Runs for ALL flows.

**SK-432** converts genesis prompts to Option C hybrid format (D-STACK-2).
Section 1 gets only XIIGen vocabulary — no framework names.
Section 4 gets per-stack generation frames keyed by "{stackType}:{side}".

**Together they satisfy V29, V30, V31 of SK-418 v1.3.**

```
Key test for Section 1: can a developer who knows only the business domain
(no specific tech stack) read every rule and know exactly what to enforce?
If yes → it belongs in Section 1.
If no → it belongs in Section 4.
```

---

## SESSION-0 Checklist (FC-1 through FC-21)

FC-1 through FC-15: original checks (event contracts, DNA compliance, etc.)
FC-16: All proposed service files use domain names (not t47-*, not flow01-*)
FC-17: STATE.json includes flow_name AND stackTargets AND clientTargets
FC-18: Jira comment template has 5-section SK-430 Rule 5 structure
FC-19: All genesis prompts in HybridGenesisPrompt format (4 sections)
FC-20: All ⛔ INCOMPATIBLE stacks flagged with reason + mitigation
FC-21: Client nodes with reactive state have stateNotes per stack entry

---

## For User-Facing Flows (FLOW-01 through FLOW-24)

7-pass re-examination algorithm (unchanged). SK-418 v1.3 31-item checklist.

**Additional prerequisite before FLOW-01 Phase A:**
```
✓ FLOW-00.1 complete (npm run lint:naming exits 0)
✓ FLOW-00.2 complete (SK-431/432 registered, stack-coupling.ts exists)
✓ FLOW-00.3 complete (cost pipeline wired — CostTracker, SpendGovernor, AF-11)
✓ EngineContract schema has stackCoupling field
✓ HybridGenesisPrompt interface exists
```

**PHASE A PREREQUISITE: NODE CONVERGENCE (v1.0.3)**
```
Before writing any Phase A session content, define the NODE for
each capability this flow will generate.

For each task type (T-XXX) with capabilityRouting[].decision = FLOW:
  □ structure: inputShape, outputShape, dependencies, triggers, emits
  □ intent: purpose (one sentence, plain language, NO stack names),
            invariants[], failureModes[], domainConcepts[]
  □ constraints: iron rules in CF-N format
  □ quality: scoringCriteria[], acceptanceThreshold, degradationConditions

The NODE is written in the FLOW-XX-REFERENCE-PLAN.md.
Session files reference the NODE. They do NOT restate it.

Until convergence.handler infrastructure exists (Task 7 — pre-FLOW-01):
  Build NODEs manually in REFERENCE-PLAN.md using the node: field template.
  Capture design reasoning as DESIGN_REASONING signals manually at Gate C.

Gate: every task type with decision=FLOW has a complete NODE representation
before Phase A is marked COMPLETE.
```

**GATE C ADDITIONAL REQUIRED OUTPUT: FLOW-XX-ARCHITECTURE-DECISIONS.json (v1.0.3)**
```
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
  (see code-execution--learning-signal-capture-SKILL.md, DESIGN_REASONING section)

SEEDING: ARCHITECTURE-DECISIONS.json is seeded to xiigen-rag-patterns with
patternType: ARCHITECTURE_DECISION at the START of Phase A seeding.
Do NOT defer seeding to Phase F. Future planning sessions need these decisions
immediately — not after the entire flow completes.

⛔ Gate C does NOT pass without ARCHITECTURE-DECISIONS.json present.
```

**Service file naming (SK-430 Rule 1):**
```
Pattern: {verb}-{domain-noun}.service.ts

FLOW-01: T47 → user-registration-initiator.service.ts
         T48 → email-verification-wait.service.ts
         T49 → onboarding-delivery.service.ts
Directory: engine/flows/user-registration-onboarding/
```

**Phase D gate additions (all user flows):**
```
✓ npm run lint:naming — exits 0
✓ All new .service.ts files follow {verb}-{domain-noun} pattern
✓ No t{N}-*.ts or flow{NN}-*.ts files created
```

---

## For Marketplace Plugin Adapters (FLOW-34)

Read FLOW-34-REFERENCE-PLAN-v1.md first. C5 (Canva Text Elements Adapter)
is the canonical example. Every plugin adapter plan adds FC-22 through FC-28:

```
FC-22: FT record exists with adapterMode: "MODE-B-thin"
FC-23: stackCoupling has "@xiigen/plugin-sdk:platform" as CONCEPT_NEUTRAL
FC-24: stackCoupling has platform client entry as STACK_COUPLED
FC-25: StackCapabilityDeclaration exists for the target platform SDK
FC-26: API mapping document produced before any adapter code
FC-27: ≥ 2 traffic conversion mechanisms documented
FC-28: Platform review timeline noted
```

---

## Stack Coupling Quick Reference

```
StackKey:  "{stackType}:{side}"
  side:    server | client | platform | other

Well-known keys:
  "node-nestjs:server"              ← priority server (D-STACK-3)
  "react-web:client"                ← priority client (D-STACK-3)
  "canva-app:client"                ← Canva Apps SDK
  "figma-plugin:client"             ← Figma Plugin API
  "redis:platform"                  ← SETNX, TTL management
  "@xiigen/plugin-sdk:platform"     ← neutral plugin adapter layer (D-STACK-8)
  "jest:platform"                   ← virtualClock injection
  "webpack:platform"                ← Canva mandates this bundler
  "aws-ses:platform"                ← email delivery
  "php-wordpress:server"            ← commonly INCOMPATIBLE for async tasks

stackCategory (closed enum, 22 values):
  design-platform-plugin  whiteboard-plugin  ecommerce-app  productivity-plugin
  browser-extension  crm-extension  automation-node  payment-plugin
  web-framework  cms-plugin  erp-extension  mobile-native  mobile-cross
  desktop-native  client-spa  client-ssr  platform-service  sdk-package
  build-tool  test-runner  ci-cd  custom
```

---

## Deliverables for Every Plan

```
STATE.json          ← flow_id, flow_name, stackTargets, clientTargets,
                       parallel_wave, wave, test_baseline
SESSION-0           ← FC-1 through FC-21 (+ FC-22–FC-28 for FLOW-34)
SESSION-1           ← first executable phase
REFERENCE-PLAN.md   ← this document (labeled DO NOT EXECUTE)
```

---

## Hard Constraints

```
NEVER:
✗ Use numbers from memory — verify against live canonical docs
✗ Re-open a locked decision without SK-417 ADR entry
✗ Create a document competing with an existing Tier 1-3 document
✗ Chain phases without explicit per-phase approval
✗ Produce session files before SK-418 31/31 passes
✗ Produce session files before SK-430 Rules 1–6 pass
✗ Produce session files before SK-431 V29/V30/V31 pass
✗ Write "Generate a NestJS service..." in genesis prompt Section 1
✗ Name any file flow{NN}-*.ts or directory flow{NN}/
✗ Create EngineContract without stackCoupling field (for new flows)
✗ Create STATE.json without flow_name, stackTargets, clientTargets

ALWAYS:
✓ Read PROJECT_REFERENCE.md + DECISIONS-LOCKED.md + STATE-v4.json first
✓ npm run lint:naming in every Phase D + Phase E gate
✓ Both server + client npm test in every gate
✓ Save STATE.json after every phase
✓ ⛔ STOP after every phase — wait for explicit "yes"
✓ QUEUE FABRIC only for inter-service communication
✓ Jira comments follow SK-430 Rule 5 (5 sections)
```
