---
name: implementation-mode-gate
version: "1.0.0"
description: >
  Determines WHO writes the service code for a flow: the XIIGen AF pipeline
  (AI-generated) or Claude Code (manual). This is the first question answered
  for any flow plan. Without it, a plan can pass all 31 completeness checks
  and still route to the wrong executor.
  FLOW-01 through FLOW-24: always af-pipeline.
  Infrastructure flows (FLOW-00.x, FLOW-35 internals): manual or hybrid.
layer: planning
createdAt: "2026-03-22"
updatedAt: "2026-03-22"
requires: []
complements: [planning-session-startup, flow-completeness-checker, how-to-prepare-a-plan]
triggers:
  - any flow plan creation
  - "who writes the code"
  - "implementation mode"
  - "af-pipeline or manual"
  - beginning of any planning session
---

# Implementation Mode Gate

## Why This Skill Exists

XIIGen is a code generation engine. The whole point is that the AF pipeline
generates service code from contracts — not that Claude Code types the .ts
files manually. But nothing in the planning pipeline asked "who generates
the code?" until this skill was added.

A plan that passes 31/31 completeness checks can still route to Claude Code
writing services by hand — bypassing AF-1 generation, AF-9 judgment, model
preference learning, DPO training data, and the entire improvement loop.

This skill makes the routing explicit and verifiable.

## The Three Modes

```
af-pipeline
  Claude Code writes: EngineContracts, AF prompts (genesis/review/compliance/judge),
                      seeds them to ES, topology files, event schemas, test matrix
  XIIGen generates:   Service code (.service.ts), unit tests, integration stubs
  SESSION files say:  "Submit to engine.generate()" / "Submit contract to AF pipeline"
  Phase pattern:      INJECT → GENERATE → JUDGE → IMPROVE
  Valid for:          FLOW-01 through FLOW-24 (user-facing flows)
                      FLOW-25+ (engine flows where AF pipeline is operational)

manual
  Claude Code writes: Everything — contracts, services, tests
  XIIGen does:        Nothing (engine not yet available for this code type)
  SESSION files say:  "Create file" / write code directly
  Phase pattern:      Standard phase A-E
  Valid for:          FLOW-00.x (bootstrap), FLOW-35 Phase A-C (before AF pipeline exists)
  Justification:      REQUIRED — must explain why AF pipeline cannot be used

hybrid
  Claude Code writes: Scaffold (contracts, prompts, infra wiring, test harness)
  XIIGen generates:   Service code from contracts via AF pipeline
  Claude Code also:   May write glue code that the AF pipeline can't generate yet
  Valid for:          First flow on a new engine capability where AF pipeline
                      needs human-written examples before it can self-generate
```

## The Decision Table

| Flow Range | Mode | Why |
|-----------|------|-----|
| FLOW-00, FLOW-00.1, FLOW-00.2 | manual | Bootstrap infrastructure — AF pipeline doesn't exist yet |
| FLOW-35 Phase A-C | manual | Building the AF pipeline itself |
| FLOW-35 Phase D+ | hybrid | AF pipeline exists, testing on own code |
| FLOW-36 | af-pipeline | Feature registry — AF pipeline operational |
| FLOW-01 through FLOW-24 | af-pipeline | User-facing flows — engine generates services |
| FLOW-25 through FLOW-33 | af-pipeline | Engine flows — AF pipeline operational |
| FLOW-34 (marketplace) | af-pipeline | Plugin adapters — AF pipeline operational |

## What Must Appear in STATE.json

```json
{
  "implementationMode": "af-pipeline",
  "implementationModeReason": "User-facing flow. AF pipeline operational after FLOW-35."
}
```

If `manual`:
```json
{
  "implementationMode": "manual",
  "implementationModeReason": "Bootstrap flow. AF pipeline not yet available."
}
```

## What Must Appear in SESSION Files

### For af-pipeline mode:

SESSION-FLOW-XX-A.md (Phase 0: INJECT):
```
Claude Code tasks:
  1. Write EngineContracts for T{N} with all iron rules + factory interfaces
  2. Write 4 AF prompts per task type: genesis, review, compliance, judge
  3. Seed contracts to ES (xiigen-engine-contracts index)
  4. Seed prompts to ES (xiigen-prompts index)
  5. Register in AF-3 in-memory prompt map
  6. Create event schemas in contracts/events/FLOW-XX/
  7. Create topology in contracts/topologies/FLOW-XX.topology.json
  8. Create test matrix in contracts/tests/FLOW-XX.test-matrix.json

Claude Code does NOT:
  ✗ Write .service.ts files
  ✗ Write service implementation code
  ✗ Create unit test implementations for services
```

SESSION-FLOW-XX-B.md (Phase 1: GENERATE):
```
Submit to AF pipeline via FlowGenerator:
  const engineContract = new EngineContract(contractParams);
  const result = await engine.generate(engineContract, testTenantId);

Capture: result.isSuccess, result.data.pipelineMetadata['score'], result.data.elapsedMs
If score < threshold: PromptOps generates PromptPatch (PUT /api/prompts/:taskTypeId), re-run
If score >= threshold: promote to MINIMAL
```

SESSION-FLOW-XX-C/D.md (Phase 2: JUDGE + Phase 3: IMPROVE):
```
AF-6 code review, AF-7 DNA compliance, AF-8 security, AF-9 scoring
If score >= 80: promote to INJECTED, capture DPO training data
If 60-79: iterate with PromptPatch
If < 60: escalate to Luba
```

### For manual mode:

SESSION files describe direct file creation — standard Claude Code execution.
Justification required in STATE.json.

## Red Flags — Implementation Mode Violations

```
✗ SESSION file says "Create user-registration-initiator.service.ts" for a FLOW-01 task
  → This should be "Submit T47 contract to FlowOrchestrator"

✗ Genesis prompt treated as instructions for Claude Code to follow
  → Genesis prompt is AF-1 input, not a human coding guide

✗ Plan has "Phase B: implement T47" with Claude Code writing the service
  → Phase B should be "Submit T47 to AF pipeline, capture result"

✗ No implementationMode in STATE.json
  → Fundamental routing decision missing

✗ implementationMode: "manual" for FLOW-01 through FLOW-24 without justification
  → User-facing flows use the engine. Always.

✗ Plan passes all 31 V-checks but SESSION files bypass AF pipeline
  → V0 (this check) should have caught it
```

## The Key Test

For any plan with `implementationMode: "af-pipeline"`:

```
Grep all SESSION files for:
  "create_file.*\.service\.ts"     → VIOLATION (Claude Code writing services)
  "engine\.generate"               → CORRECT (engine generating services)
  "afPipeline\.run"                → CORRECT (legacy name, still accepted)
  "FlowOrchestrator"              → CORRECT
  "Submit.*contract"              → CORRECT

If any SESSION file creates a .service.ts file directly: FAIL V0.
If no SESSION file references engine.generate() / afPipeline.run() / FlowOrchestrator: FAIL V0.
```

## Phase Structure Comparison

```
MANUAL MODE (infrastructure flows):
  Phase A: contracts + event schemas + topology
  Phase B: service implementation (Claude Code writes .service.ts)
  Phase C: service implementation continued
  Phase D: integration wiring + naming gate
  Phase E: e2e tests + final verification

AF-PIPELINE MODE (user-facing flows):
  Phase A: INJECT — contracts, prompts, schemas, topology seeded to ES
  Phase B: GENERATE — submit task types to AF pipeline, capture results
  Phase C: JUDGE — AF-6/7/8/9 score, iterate if needed
  Phase D: INTEGRATE — wire generated services, naming gate, client tests
  Phase E: PROMOTE — promote to INJECTED, DPO export, final verification
```
