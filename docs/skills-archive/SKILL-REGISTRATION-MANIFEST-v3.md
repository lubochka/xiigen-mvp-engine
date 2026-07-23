# XIIGEN PLANNING SESSION SKILLS — REGISTRATION MANIFEST
## Skills SK-416 through SK-436
## Date: 2026-03-20 | Updated: 2026-03-20 (v3 — adds SK-434, SK-435, SK-436, SK-418 v1.1)
## Register SK-416–SK-425 in SkillGraphService after FLOW-35 Phase A
## Register SK-426–SK-429 in SkillGraphService after FLOW-35 Phase I
## Register SK-430–SK-433 in SkillGraphService after FLOW-36 Phase A
## Register SK-434–SK-436 in SkillGraphService after FLOW-35 Phase A (alongside SK-416–425)

---

## FT-XXX NAMESPACE WARNING

```
⚠️ FT-001 onwards is RESERVED for Feature Registry artifacts (D-FT-1).
DO NOT use FT-prefix for any skill, factory, task type, or other artifact.
FLOW-35 Phase A MUST NOT register any skill with ID beginning "FT-".
```

---

## Skills in this package (SK-416–SK-425)

| SK | Name | Layer | Purpose | Trigger phrases |
|----|------|-------|---------|-----------------|
| SK-416 | PlanningSessionStartup | planning | Orient at session start | "let's plan", "continue from", "start flow" |
| SK-417 | DecisionReopeningProtocol | planning | Challenge locked decisions correctly | "reconsider", "this decision doesn't work" |
| SK-418 | FlowCompletenessChecker | planning | Validate flow plan is complete (15 items) | "is this ready", "what's missing", "check the plan" |
| SK-419 | ModeC EventContractDesigner | planning | Design event schemas for Mode C | "event contracts", "schema for", "what events does" |
| SK-420 | ClientServerSymmetry | planning | Examine flows from client perspective | "what does user see", "app reopen", "client side" |
| SK-421 | E2ETestMatrixBuilder | planning | Build complete E2E test matrix | "test matrix", "what tests", "virtual clock" |
| SK-422 | MetaEscalationRouter | meta | Decide escalate vs algorithmic resolution | "should I escalate", ESCALATE decision from controller |
| SK-423 | DocumentHierarchyNavigator | planning | Prevent competing documents | "let me document", "where do I find", "write a doc for" |
| SK-424 | BlastRadiusAssessor | planning | Assess impact before changes | "what will this break", "is it safe to", before any protocol |
| SK-425 | CostEffectiveModelSelection | meta | AI model cost vs quality tradeoffs | "drop this model", "OSS readiness", "budget warning" |

---

## Session output skills (SK-426–SK-429) — registered in FLOW-35 Phase I

| SK | Name | Layer | Purpose |
|----|------|-------|---------|
| SK-426 | SessionExecutionLogSchema | session-output | Structured log written after every phase gate |
| SK-427 | PhaseCompletionPackager | session-output | Produces 3 output files after gate passes |
| SK-428 | WebSessionHandoff | session-output | SESSION-BRIEF format for next web session |
| SK-429 | PhaseGitReport | session-output | Structured git diff tied to SESSION file |

These are registered in FLOW-35 Phase I, not Phase A.

---

## Visibility and bundle skills (SK-434–SK-436) — registered in FLOW-35 Phase A

These three skills emerged from the flow visibility planning session and are
registered alongside SK-416–425 in FLOW-35 Phase A.

| SK | Name | Layer | Purpose | Trigger phrases |
|----|------|-------|---------|-----------------| 
| SK-434 | ParallelWaveCoordinator | planning | Govern parallel-wave execution (pre-allocation, delta gate, CAS write) | "Wave 2", "parallel_wave", "parallel instance", "pre-allocated ranges" |
| SK-435 | ProductVariantRouter | planning | Route feature decisions: thin vs full adapter, D-34-1 enforcement | "FLOW-34 scope", "MODE-B-thin", "MODE-B-full", "enterprise .NET", "which variant" |
| SK-436 | BundleVersionGuard | planning | Check minFlowVersions after promotion, emit BundleDegraded | "bundle degraded", "minFlowVersions", "bundle version check", after any promotion |

**SK-418 is also updated to v1.1 in this package** — 23-item checklist replaces
the original 15-item checklist. Archive the existing file before installing v1.1.

### Skill graph edges for SK-434–SK-436

```
SK-416 → SK-434  (session startup enables wave coordination check)
SK-418 ← SK-434  (completeness checker validates V16 wave assignment)
SK-418 ← SK-436  (completeness checker validates V23 bundle check)
SK-424 → SK-435  (blast radius assessment feeds product variant routing)
SK-422 → SK-435  (escalation router may need variant routing context)
SK-427 ← SK-436  (packager includes bundle status in PHASE-COMPLETE)
```

### Registration commands for SK-434–SK-436 (add to FLOW-35 Phase A)

```python
additional_skills = [
    {
        "id": "SK-434",
        "name": "ParallelWaveCoordinator",
        "layer": "planning",
        "path": ".claude/skills/SK-434/SKILL.md",
        "requires": ["SK-416"],
        "complements": ["SK-418", "SK-427"],
        "weight": 0.85,
        "triggerKeywords": ["wave 2", "parallel_wave", "parallel instance",
                           "pre-allocated ranges", "delta gate", "CAS write"]
    },
    {
        "id": "SK-435",
        "name": "ProductVariantRouter",
        "layer": "planning",
        "path": ".claude/skills/SK-435/SKILL.md",
        "requires": ["SK-416"],
        "complements": ["SK-418", "SK-422", "SK-424"],
        "weight": 0.80,
        "triggerKeywords": ["MODE-B-thin", "MODE-B-full", "FLOW-34 scope",
                           "enterprise", "which variant", "adapterMode",
                           "portingCandidate", "xiigen-enterprise", "xiigen-lean"]
    },
    {
        "id": "SK-436",
        "name": "BundleVersionGuard",
        "layer": "planning",
        "path": ".claude/skills/SK-436/SKILL.md",
        "requires": [],
        "complements": ["SK-418", "SK-427"],
        "weight": 0.75,
        "triggerKeywords": ["bundle degraded", "minFlowVersions",
                           "bundle version check", "BundleDegraded",
                           "promotion", "CASE A", "CASE C"]
    }
]
```
See FLOW-35-REFERENCE-PLAN-v2.md → Phase I for registration commands.

---

## Feature Registry skills (SK-430+) — registered in FLOW-36 Phase A

FLOW-36 Phase A will register the following skills at SK-430+
(exact numbers verified at FLOW-36 Phase A session start):

| SK | Provisional | Name | Purpose |
|----|-------------|------|---------|
| SK-[+0] | SK-430 | FeatureExtractionPrompt | Genesis prompt for FeatureExtractor including portingCandidate rules |
| SK-[+1] | SK-431 | PortingCostPrompt | Genesis prompt for PortingCostEstimator |
| SK-[+2] | SK-432 | PlatformConstraintRAG | RAG strategy for platform API constraints |
| SK-[+3] | SK-433 | SignalThresholdConfig | FREEDOM config template for MODE_A and MODE_B signal thresholds |

These are NOT registered in FLOW-35. FLOW-36 Phase A handles its own skill registration.

---

## Registration commands for SK-416–SK-425 (run in FLOW-35 Phase A)

```python
skills_to_register = [
    {
        "id": "SK-416",
        "name": "PlanningSessionStartup",
        "layer": "planning",
        "path": ".claude/skills/SK-416/SKILL.md",
        "requires": [],
        "complements": ["SK-417", "SK-423", "SK-424"],
        "weight": 0.9,
        "triggerKeywords": ["plan", "continue from", "start flow", "new session"]
    },
    {
        "id": "SK-417",
        "name": "DecisionReopeningProtocol",
        "layer": "planning",
        "path": ".claude/skills/SK-417/SKILL.md",
        "requires": ["SK-416"],
        "complements": ["SK-424"],
        "weight": 0.7,
        "triggerKeywords": ["reconsider", "reopen", "this decision", "change the architecture"]
    },
    {
        "id": "SK-418",
        "name": "FlowCompletenessChecker",
        "layer": "planning",
        "path": ".claude/skills/SK-418/SKILL.md",
        "requires": ["SK-416"],
        "complements": ["SK-419", "SK-420", "SK-421"],
        "weight": 0.8,
        "triggerKeywords": ["is this ready", "what's missing", "check the plan", "produce session files"]
    },
    {
        "id": "SK-419",
        "name": "ModeCEventContractDesigner",
        "layer": "planning",
        "path": ".claude/skills/SK-419/SKILL.md",
        "requires": ["SK-416"],
        "complements": ["SK-418", "SK-420"],
        "weight": 0.8,
        "triggerKeywords": ["event contract", "schema", "mode c", "what events", "client event"]
    },
    {
        "id": "SK-420",
        "name": "ClientServerSymmetry",
        "layer": "planning",
        "path": ".claude/skills/SK-420/SKILL.md",
        "requires": ["SK-416", "SK-419"],
        "complements": ["SK-418", "SK-421"],
        "weight": 0.75,
        "triggerKeywords": ["user sees", "client side", "app reopen", "what screen", "optimistic"]
    },
    {
        "id": "SK-421",
        "name": "E2ETestMatrixBuilder",
        "layer": "planning",
        "path": ".claude/skills/SK-421/SKILL.md",
        "requires": ["SK-419", "SK-420"],
        "complements": ["SK-418"],
        "weight": 0.75,
        "triggerKeywords": ["test matrix", "e2e tests", "virtual clock", "compensation test"]
    },
    {
        "id": "SK-422",
        "name": "MetaEscalationRouter",
        "layer": "meta",
        "path": ".claude/skills/SK-422/SKILL.md",
        "requires": [],
        "complements": ["SK-423", "SK-424"],
        "weight": 0.9,
        "triggerKeywords": ["escalate", "gap analysis", "options for", "briefing"]
    },
    {
        "id": "SK-423",
        "name": "DocumentHierarchyNavigator",
        "layer": "planning",
        "path": ".claude/skills/SK-423/SKILL.md",
        "requires": ["SK-416"],
        "complements": ["SK-417"],
        "weight": 0.85,
        "triggerKeywords": ["document", "where is", "competing doc", "canonical", "superseded",
                            "feature manifest", "FT record", "contracts/features"]
    },
    {
        "id": "SK-424",
        "name": "BlastRadiusAssessor",
        "layer": "planning",
        "path": ".claude/skills/SK-424/SKILL.md",
        "requires": ["SK-416"],
        "complements": ["SK-417", "SK-422"],
        "weight": 0.8,
        "triggerKeywords": ["what breaks", "impact", "safe to change", "blast radius", "modify",
                            "portingCandidate", "feature-manifest.schema"]
    },
    {
        "id": "SK-425",
        "name": "CostEffectiveModelSelection",
        "layer": "meta",
        "path": ".claude/skills/SK-425/SKILL.md",
        "requires": [],
        "complements": ["SK-422"],
        "weight": 0.7,
        "triggerKeywords": ["drop model", "oss readiness", "budget", "value ratio", "model fitness"]
    }
]
```

---

## Skill graph edges after registration

```
Planning layer (AF-4 retrieves for planning sessions):

  SK-416 → SK-417  (session start enables decision reopening)
  SK-416 → SK-418  (session start enables completeness check)
  SK-416 → SK-419  (session start enables contract design)
  SK-416 → SK-423  (session start enables document navigation)
  SK-416 → SK-424  (session start enables blast radius assessment)
  SK-419 → SK-420  (event contracts enable client perspective)
  SK-419 → SK-421  (event contracts enable test matrix)
  SK-420 → SK-421  (client perspective needed for test matrix)
  SK-418 ← SK-419  (completeness check validates contracts)
  SK-418 ← SK-420  (completeness check validates client map)
  SK-418 ← SK-421  (completeness check validates test matrix)

Meta layer (invoked by meta-arbitration pipeline):

  SK-422 → SK-424  (escalation needs blast radius of proposed options)
  SK-422 → SK-423  (escalation may reference documents)
  SK-425 → SK-422  (model fitness signal feeds escalation context)
```

---

## AGENTS.md addition (append to skills section)

```markdown
## Planning Session Skills (SK-416–SK-425)

These skills govern how to navigate and extend the XIIGen project.
Retrieved by AF-4 during planning conversations and by the meta-arbitration
layer during round escalations.

### Layer: planning (SK-416–421, SK-423–424)
Retrieved when: planning a flow, checking completeness, designing contracts,
examining client behavior, building test matrices, assessing change impact

### Layer: meta (SK-422, SK-425)
Retrieved when: meta::round-controller produces ESCALATE/HALT,
model fitness signals need interpretation

### Entry point
SK-416 PlanningSessionStartup is the entry point for any planning session.
Always load this skill first. Includes execution order and document tier
references updated for FEATURE-REGISTRY-S1, FLOW-35, FLOW-36, FLOW-34.

## Session Output Skills (SK-426–SK-429)
Registered in FLOW-35 Phase I. Run automatically after every phase gate.
See SESSION-END-CHAIN in this file for invocation order.

## Feature Registry Skills (SK-430+)
Registered in FLOW-36 Phase A.
Trigger keywords: "feature manifest", "FT record", "portingCandidate",
"porting decision", "platform adapter".
```

---

## Update to FLOW-35 Phase A (add to gate checklist)

```
□ Register SK-416–SK-425 in SkillGraphService
  (implementations provided — stubs become live immediately)
  Total after: 78 existing + 14 (SK-402–415) + 10 (SK-416–425) = 102
  NOTE: SK-426–429 are NOT registered in Phase A — they are Phase I

□ Verify FT-XXX namespace NOT assigned to any skill (D-FT-1)
  Assert: no skill ID matches pattern /^FT-[0-9]+$/

□ Verify skill graph edges registered correctly
□ Verify all 10 skills retrievable via GET /engine/skills/{id}
□ Verify AGENTS.md has planning skills section
```

---

## Where to store the skill files in the repo

```
.claude/skills/
├── SK-416/
│   └── SKILL.md   ← PlanningSessionStartup (v1.1 — includes FLOW-36 awareness)
├── SK-417/
│   └── SKILL.md   ← DecisionReopeningProtocol
├── SK-418/
│   └── SKILL.md   ← FlowCompletenessChecker
├── SK-419/
│   └── SKILL.md   ← ModeCEventContractDesigner
├── SK-420/
│   └── SKILL.md   ← ClientServerSymmetry
├── SK-421/
│   └── SKILL.md   ← E2ETestMatrixBuilder
├── SK-422/
│   └── SKILL.md   ← MetaEscalationRouter
├── SK-423/
│   └── SKILL.md   ← DocumentHierarchyNavigator
├── SK-424/
│   └── SKILL.md   ← BlastRadiusAssessor
└── SK-425/
    └── SKILL.md   ← CostEffectiveModelSelection

Feature Registry skills (registered by FLOW-36 Phase A):
├── SK-430/
│   └── SKILL.md   ← FeatureExtractionPrompt
├── SK-431/
│   └── SKILL.md   ← PortingCostPrompt
├── SK-432/
│   └── SKILL.md   ← PlatformConstraintRAG
└── SK-433/
    └── SKILL.md   ← SignalThresholdConfig

Visibility and bundle skills (registered by FLOW-35 Phase A — same session as SK-416–425):
├── SK-434/
│   └── SKILL.md   ← ParallelWaveCoordinator (v1.0)
├── SK-435/
│   └── SKILL.md   ← ProductVariantRouter (v1.0)
└── SK-436/
    └── SKILL.md   ← BundleVersionGuard (v1.0)

SK-418 updated to v1.1 (archive existing before installing):
├── SK-418/
│   ├── SKILL-v1_0-archived.md  ← keep the original
│   └── SKILL.md                ← install SK-418-SKILL-v1_1.md here
```
