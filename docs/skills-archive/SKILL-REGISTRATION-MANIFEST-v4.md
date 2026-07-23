# XIIGEN PLANNING SESSION SKILLS — REGISTRATION MANIFEST
## Skills SK-416 through SK-436, plus SK-430 NamingConventionsEnforcer
## Date: 2026-03-22 | Updated: 2026-03-22 (v4 — adds SK-430)
## Register SK-416–SK-425 + SK-434–436 in SkillGraphService after FLOW-35 Phase A
## Register SK-426–SK-429 in SkillGraphService after FLOW-35 Phase I
## Register SK-430 in SkillGraphService after FLOW-00.1 Phase D
## Note: SK-430–SK-433 in v3 were PROVISIONAL Feature Registry skills.
##       SK-430 is now RESERVED for NamingConventionsEnforcer (2026-03-22).
##       Feature Registry skills shift to SK-431–SK-434 (verify at FLOW-36 Phase A).

---

## NAMING NOTE — SK-430 RESERVATION

In SKILL-REGISTRATION-MANIFEST-v3, SK-430–433 were provisionally assigned to
Feature Registry prompt skills. Those assignments were NOT yet registered in code.

SK-430 is now assigned to NamingConventionsEnforcer (registered in FLOW-00.1).
Feature Registry skills are re-numbered SK-431 through SK-434 (verify exact
numbers against INFRASTRUCTURE-FLOWS-STATE at FLOW-36 Phase A session start).

---

## FT-XXX NAMESPACE WARNING

```
⚠️ FT-001 onwards is RESERVED for Feature Registry artifacts (D-FT-1).
DO NOT use FT-prefix for any skill, factory, task type, or other artifact.
```

---

## New in v4: SK-430 NamingConventionsEnforcer

| SK | Name | Layer | Purpose | Trigger phrases | Registered when |
|----|------|-------|---------|-----------------|-----------------|
| SK-430 | NamingConventionsEnforcer | planning | Enforce domain file names, flowId+flowName in contracts, flow_name in STATE.json, 5-section Jira comments | "naming review", "does this comply", any new engine-contracts file, any new engine/flows dir | FLOW-00.1 Phase D |

### Registration command for SK-430

```python
naming_skill = {
    "id": "SK-430",
    "name": "NamingConventionsEnforcer",
    "layer": "planning",
    "path": ".claude/skills/SK-430/SKILL.md",
    "requires": ["SK-416"],
    "complements": ["SK-418", "SK-423", "SK-429"],
    "weight": 0.95,
    "triggerKeywords": [
        "naming review", "file name", "does this comply",
        "naming convention", "flowName", "flow_name",
        "engine-contracts", "engine/flows", "jira comment"
    ]
}
```

### Skill graph edges for SK-430

```
SK-416 → SK-430  (session startup enables naming check)
SK-418 ← SK-430  (naming check runs AFTER completeness check, BEFORE session files)
SK-429 ← SK-430  (SK-429 Jira template must satisfy SK-430 Rule 5)
SK-430 → SK-423  (naming violations may require document hierarchy checks)
```

**Position in pipeline:** Step 8 — runs after SK-418 (FlowCompletenessChecker),
before any session file is produced. Blocks session file production on any violation.

### Where to store the skill file

```
.claude/skills/SK-430/
└── SKILL.md   ← NamingConventionsEnforcer (v1.0)
```

---

## All Skills Reference (v4 complete list)

### Planning skills (SK-416–SK-425, SK-430) — registered after FLOW-35 Phase A except SK-430

| SK | Name | Layer | Purpose |
|----|------|-------|---------|
| SK-416 | PlanningSessionStartup | planning | Orient at session start |
| SK-417 | DecisionReopeningProtocol | planning | Challenge locked decisions correctly |
| SK-418 | FlowCompletenessChecker | planning | Validate flow plan (28-item checklist) |
| SK-419 | ModeCEventContractDesigner | planning | Design event schemas for Mode C |
| SK-420 | ClientServerSymmetry | planning | Examine flows from client perspective |
| SK-421 | E2ETestMatrixBuilder | planning | Build complete E2E test matrix |
| SK-422 | MetaEscalationRouter | meta | Decide escalate vs algorithmic resolution |
| SK-423 | DocumentHierarchyNavigator | planning | Prevent competing documents |
| SK-424 | BlastRadiusAssessor | planning | Assess impact before changes |
| SK-425 | CostEffectiveModelSelection | meta | AI model cost vs quality tradeoffs |
| SK-430 | NamingConventionsEnforcer | planning | Enforce domain names (files/dirs/schema/Jira) |

### Session output skills (SK-426–SK-429) — registered after FLOW-35 Phase I

| SK | Name | Layer | Purpose |
|----|------|-------|---------|
| SK-426 | SessionExecutionLogSchema | session-output | Structured log after every phase gate |
| SK-427 | PhaseCompletionPackager | session-output | 3 output files after gate passes |
| SK-428 | WebSessionHandoff | session-output | SESSION-BRIEF for next web session |
| SK-429 | PhaseGitReport | session-output | Git diff tied to SESSION file |

### Visibility and bundle skills (SK-434–SK-436) — registered after FLOW-35 Phase A

| SK | Name | Layer | Purpose |
|----|------|-------|---------|
| SK-434 | ParallelWaveCoordinator | planning | Wave coordination, pre-allocation, delta gate |
| SK-435 | ProductVariantRouter | planning | Thin vs full adapter, D-34-1 enforcement |
| SK-436 | BundleVersionGuard | planning | minFlowVersions check after promotion |

### Feature Registry skills (SK-431–SK-434 provisional) — registered after FLOW-36 Phase A

| SK | Provisional | Name | Purpose |
|----|-------------|------|---------|
| SK-431 | was SK-430 | FeatureExtractionPrompt | Genesis prompt for FeatureExtractor |
| SK-432 | was SK-431 | PortingCostPrompt | Genesis prompt for PortingCostEstimator |
| SK-433 | was SK-432 | PlatformConstraintRAG | RAG strategy for platform API constraints |
| SK-434 | was SK-433 | SignalThresholdConfig | FREEDOM config for signal thresholds |

⚠️ **Verify exact SK numbers against INFRASTRUCTURE-FLOWS-STATE at FLOW-36 Phase A.**
The above provisional numbers assume SK-430 is consumed by NamingConventionsEnforcer.

---

## Updated Skill Graph (after SK-430 registration)

```
Planning layer:

  SK-416 → SK-417  (session start enables decision reopening)
  SK-416 → SK-418  (session start enables completeness check)
  SK-416 → SK-419  (session start enables contract design)
  SK-416 → SK-423  (session start enables document navigation)
  SK-416 → SK-424  (session start enables blast radius assessment)
  SK-416 → SK-430  (session start enables naming check) ← NEW
  SK-419 → SK-420  (event contracts enable client perspective)
  SK-419 → SK-421  (event contracts enable test matrix)
  SK-420 → SK-421  (client perspective feeds test matrix)
  SK-418 ← SK-419  (completeness check validates contracts)
  SK-418 ← SK-420  (completeness check validates client map)
  SK-418 ← SK-421  (completeness check validates test matrix)
  SK-430 → SK-423  (naming violations may trigger doc hierarchy check) ← NEW
  SK-430 ← SK-418  (naming check runs after completeness) ← NEW (ordering edge)

Meta layer:

  SK-422 → SK-424  (escalation needs blast radius of proposed options)
  SK-422 → SK-423  (escalation may reference documents)
  SK-425 → SK-422  (model fitness signal feeds escalation context)

Session output layer:

  SK-427 → SK-428  (packager calls handoff skill)
  SK-427 → SK-429  (packager calls git report skill)
  SK-429 ← SK-430  (SK-429 Jira template must satisfy SK-430 Rule 5) ← NEW
```

---

## FLOW-35 Phase A gate update (add to checklist)

```
□ Register SK-416–SK-425 in SkillGraphService
□ Register SK-434–SK-436 in SkillGraphService
□ Verify FT-XXX namespace NOT assigned to any skill (D-FT-1)
□ Note: SK-430 NamingConventionsEnforcer is NOT registered in Phase A
  (it is registered in FLOW-00.1 Phase D, which runs after FLOW-00)
```

---

## FLOW-00.1 Phase D gate (SK-430 registration)

```
□ Copy SK-430-SKILL.md to .claude/skills/SK-430/SKILL.md
□ Register SK-430 in SkillGraphService:
  skill_graph_service.register(naming_skill)
□ Register skill graph edges:
  SK-416 → SK-430
  SK-430 → SK-423
  SK-430 ← SK-418  (ordering edge)
  SK-429 ← SK-430  (template constraint)
□ Verify SK-430 retrievable via GET /engine/skills/SK-430
□ Verify npm run lint:naming exits 0
□ Update AGENTS.md: add SK-430 to planning skills section
```

---

## AGENTS.md addition (append to skills section after FLOW-00.1)

```markdown
## Naming Conventions Skill (SK-430) — registered in FLOW-00.1

SK-430 NamingConventionsEnforcer runs as step 8 of the planning pipeline,
after SK-418 FlowCompletenessChecker and before session files are produced.

It enforces 6 rules:
  Rule 1: engine-contracts/ files use domain names (not flow{NN}-*)
  Rule 2: engine/flows/ directories use domain names (not flow{NN}/)
  Rule 3: EngineContract instances include flowId + flowName
  Rule 4: STATE.json includes flow_name
  Rule 5: Jira comments (SK-429) have 5 sections with business context
  Rule 6: Constants use domain prefixes (not FLOW{NN}_*)

Trigger: invoked by how-to-prepare-a-plan-SKILL-v4 step 8.
Also invoked standalone: "naming review", "does this naming comply?"
Lint gate: npm run lint:naming (scripts/naming-lint.js) enforces Rules 1+2 in CI.
Authoritative table: DECISIONS-LOCKED.md → D-NAMING-1
```
