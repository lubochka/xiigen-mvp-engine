# FLOW-DESIGN SKILL SET — INDEX & INTEGRATION GUIDE
## v2.3.0 — 2026-03-26 | +8 new skills, +2 extensions
## Works in: Claude.ai Project (web sessions) AND Claude Code (execution)

---

## WHAT CHANGED IN v2.3.0

Source: Skills Gap Analysis — Architecture Designing Capabilities (2026-03-26)

Eight gaps identified from codebase measurement session + multi-review synthesis.
All eight are immediately applicable. Five require no infrastructure.
Three benefit from convergence.handler (Task 7) or semantic RAG (Group A).

| Gap | Description | Resolution |
|-----|-------------|------------|
| Gap 9 | No output contract — sessions drift on scope | RESOLVED — SK-448 |
| Gap 10 | Iron rules invented, not derived | RESOLVED — SK-449 |
| Gap 11 | Planning decisions not consistently captured | RESOLVED — SK-450 |
| Gap 12 | MACHINE vs FREEDOM classification unencoded | RESOLVED — SK-451 |
| Gap 13 | Convergence challenger prompts missing from session files | RESOLVED — SK-452 |
| Gap 14 | INCOMPATIBLE verdicts not challenged for mechanism vs design | RESOLVED — SK-453 |
| Gap 15 | Intake methodology re-derived each session | RESOLVED — SK-454 |
| Gap 16 | Wave assignment made by intuition | RESOLVED — SK-455 |
| Ext-1 | SK-441 cannot simulate cross-flow boundaries | RESOLVED — PATCH CROSS_FLOW_TRACE |
| Ext-2 | SK-436 doesn't cover convergence context resolution | RESOLVED — PATCH CONVERGENCE-CONTEXT |

---

## COMPLETE SKILL TABLE (v2.3.0)

### New in v2.3.0

| File | SK | Category | Load | When |
|------|----|----------|------|------|
| `planning--output-contract-SKILL.md` | SK-448 | planning | -1 | Before EVERY session starts |
| `planning--iron-rule-derivation-SKILL.md` | SK-449 | planning | 1 | Before writing any genesis prompt |
| `planning--architecture-decision-capture-SKILL.md` | SK-450 | planning | 98 | Gate C — before session files |
| `planning--freedom-machine-classification-SKILL.md` | SK-451 | planning | 1 | Before writing any value into code or config |
| `planning--convergence-round-design-SKILL.md` | SK-452 | planning | 1 | Designing convergence topology (FLOW-37) |
| `planning--stack-portability-design-SKILL.md` | SK-453 | planning | 1 | Before stackCoupling annotation; any INCOMPATIBLE verdict |
| `planning--system-intake-SKILL.md` | SK-454 | planning | 0 | Before designing for existing codebase |
| `planning--wave-assignment-SKILL.md` | SK-455 | planning | 0.5 | Before any flow planning session starts |
| `planning--assumption-registry-SKILL.md` | SK-456 | planning | -1 | After plan produced, before writing session files |
| `code-execution--phase-preflight-SKILL.md` | SK-457 | code-execution | -1 | Claude Code session START — before any code written |

### Extended in v2.3.0

| File | SK | Extension |
|------|----|-----------|
| `PATCH--simulation-protocol-CROSS-FLOW-TRACE.md` | SK-441 | Adds CROSS_FLOW_TRACE protocol for cross-flow boundary simulation |
| `PATCH--simulation-protocol-GAP-TAXONOMY.md` | SK-441 | Adds gap_class A-I taxonomy (9 architectural layer classes) to gap column |
| `PATCH--github-lab-CONVERGENCE-CONTEXT.md` | SK-436 | Adds convergence-time context resolution for DOWNSTREAM_CONTRACT / REST_CONTRACT / SCHEMA_VERSION |
| `PATCH--root-cause-ladder-TRIGGERS.md` | SK-432 | Adds "after running simulations" + "gap catalog produced" triggers |

### From v2.2.0 (carry-forward, no content changes)

| File | SK | Category | Load | When |
|------|----|----------|------|------|
| `planning--arbiter-panel-design-SKILL.md` | SK-442 | planning | 1 | Writing multi-generate or arbiter-panel nodes |
| `planning--session-file-authoring-SKILL.md` | SK-443 | planning | 98 | Gate C — all session file production |
| `planning--principles-arbiter-SKILL.md` | SK-444 | planning | 1 | Configuring key_principles arbiter |
| `session-output--mission-progress-SKILL.md` | SK-445 | session-output | 99 | Before every ⛔ STOP |
| `planning--escalation-orchestrator-SKILL.md` | SK-446 | planning | 1 | Arbiter panel escalation config |
| `planning--naming-conventions-enforcer-SKILL.md` | SK-447 | planning | 99 | Before presenting any finding or output |

### From v1.0.3 (carry-forward, no content changes)

| File | SK | Category | Load | When |
|------|----|----------|------|------|
| `planning--problem-decomposition-SKILL.md` | SK-430 | planning | 0 | Session start with ambiguous problem |
| `planning--claim-verification-SKILL.md` | SK-431 | planning | 0 | Any review doc or map received |
| `planning--root-cause-ladder-SKILL.md` | SK-432 | planning | 0 | Recurring or multi-layer problem |
| `session-output--investigation-handoff-SKILL.md` | SK-433 | session-output | 99 | End of investigation session |
| `planning--solution-scope-gate-SKILL.md` | SK-434 | planning | 0 | Before any solution is proposed |
| `code-execution--node-convergence-SKILL.md` | SK-435 | code-execution | 1 | Before any genesis prompt |
| `code-execution--github-lab-SKILL.md` | SK-436 | code-execution | 0 | Cross-branch analysis + convergence context |
| `planning--node-design-review-SKILL.md` | SK-437 | planning | 1 | After NODE built, before Phase B |
| `planning--architectural-decision-testing-SKILL.md` | SK-438 | planning | 99 | Gate C + arch review |
| `planning--level-correction-response-SKILL.md` | SK-439 | planning | -1 | When challenged on level |
| `planning--change-propagation-SKILL.md` | SK-440 | planning | -1 | Blast radius at task start |
| `planning--simulation-protocol-SKILL.md` | SK-441 | planning | 1 | Simulation + CROSS_FLOW_TRACE |

### From v1.0.2 (carry-forward, no content changes)

| File | SK | Category | Load | When |
|------|----|----------|------|------|
| `planning--bootstrap-boundary-SKILL.md` | SK-426 | planning | 0 | Step ⓪ every planning session |
| `planning--flow-vs-service-gate-SKILL.md` | SK-427 | planning | 0.5 | After implementation-mode-gate |
| `code-execution--topology-structure-SKILL.md` | SK-428 | code-execution | 1 | Writing topology contracts |
| `code-execution--self-questioning-SKILL.md` | SK-429 | code-execution | 2 | ai-generate prompts for design |
| `code-execution--learning-signal-capture-SKILL.md` | — | code-execution | 3 | feedback.handler + Gate C |
| `planning--flow-design-cycle-SKILL.md` | — | planning | 4 | Reviewing infra flow plans |
| `code-execution--flow-restructure-SKILL.md` | — | code-execution | 0 | Restructuring flow files |

---

## UPDATED GAP TABLE

| Gap | Description | Status |
|-----|-------------|--------|
| Gap 1 | NODE does not exist | Skills + patches ready; convergence.handler = Task 7 (Group E) |
| Gap 2 | RAG used as database | PARTIALLY RESOLVED — Group A wires IRagService; semantic indexing in progress |
| Gap 3 | Arbiters uniform | RESOLVED — SK-442/446/444 + FC-26/30 |
| Gap 4 | Planning not training data | RESOLVED — SK-450 + DESIGN_REASONING signal |
| Gap 5 | No context acquisition | RESOLVED — SK-436 extended (GitHub-resolvable types); SK-435 covers RAG + human types |
| Gap 6 | Mission layer absent | RESOLVED — M1-M5/P17-P22 + SK-445 |
| Gap 7 | Session files not self-contained | RESOLVED — SK-443 + FC-28 |
| Gap 8 | Teaching fields missing from DPO | RESOLVED — P18 + DPO validity gate |
| Gap 9 | Output contract missing | RESOLVED — SK-448 |
| Gap 10 | Iron rules invented, not derived | RESOLVED — SK-449 |
| Gap 11 | Planning decisions inconsistently captured | RESOLVED — SK-450 |
| Gap 12 | MACHINE/FREEDOM classification unencoded | RESOLVED — SK-451 |
| Gap 13 | Convergence challenger prompts missing | RESOLVED — SK-452 |
| Gap 14 | INCOMPATIBLE verdicts unchallenged | RESOLVED — SK-453 |
| Gap 15 | Intake methodology re-derived | RESOLVED — SK-454 |
| Gap 16 | Wave assignment by intuition | RESOLVED — SK-455 |
| Gap 17 | Cross-flow simulation not possible | RESOLVED — SK-441 CROSS_FLOW_TRACE |
| Gap 18 | Assumptions not registered at plan authoring time | RESOLVED — SK-456 |
| Gap 19 | Assumptions not verified at Claude Code session start | RESOLVED — SK-457 |
| Gap 20 | Gaps lack architectural layer classification | RESOLVED — SK-441 gap_class A-I |
| Gap 21 | SK-432 fails to load after simulation produces gap catalog | RESOLVED — SK-432 trigger patch |

---

## UPDATED PLANNING PIPELINE (v2.3.0)

```
⓪(-1)  output-contract-design (SK-448)       ← NEW — before session starts
⓪      solution-scope-gate (SK-434)
⓪      problem-decomposition (SK-430)         if problem-driven
⓪      root-cause-ladder (SK-432)             if recurring
⓪      implementation-mode-gate
⓪.5    flow-vs-service-gate (SK-427)
⓪.5b   wave-assignment (SK-455)               ← NEW — assign wave before planning
①      agent-output-format-skill
②      xiigen-core-principles (M1-M5 + P1-P22)
③      planning-session-startup (SK-416)
③.5    architectural-decision-testing (SK-438) DECISION LOADING
④      infrastructure-discovery (+step 0.5/1.5)
④.3    system-intake (SK-454)                  ← NEW — if existing codebase
④.5    NODE CONVERGENCE (SK-435)               build verified NODE
        convergence-round-design (SK-452)       ← NEW — if writing convergence session files
⑤      planning-skill (8 gates)
        stack-portability-design (SK-453)       ← NEW — for each capability + target stack
        iron-rule-derivation (SK-449)            ← NEW — derive rules from failure modes
        freedom-machine-classification (SK-451)  ← NEW — classify each value
⑥      plan-review-skill (FC-1..FC-32)
⑦      flow-reexamination
⑧      naming-conventions-enforcer (SK-447)
⑨      stack-coupling-auditor
⑩      node-design-review (SK-437)             after NODE built
GATE C → session-file-authoring (SK-443)        MANDATORY
GATE C → architecture-decision-capture (SK-450) ← NEW — produce ARCHITECTURE-DECISIONS.json
GATE C → ARCHITECTURE-DECISIONS.json seeded to RAG
GATE C → output-contract-verification (SK-448)  ← NEW — verify deliverables match request
⑪      architectural-decision-testing (SK-438)  immediate tests

Before every ⛔ STOP:
  output-contract verification (SK-448)  ← NEW
  session-output--mission-progress (SK-445)
```

---

## DOCUMENT AUTHORITY MAP

Canonical homes for all governance content:
**`DOCUMENT-AUTHORITY-MAP.md`** (in this package).

For new skills added in v2.3.0: content home is the skill file itself.
SK-448 through SK-455 are each the canonical document for their content.
FC-31 canonical detection command: `XIIGEN-GOLDEN-RULE.md` Gap C table.

---

## NEXT AVAILABLE SK NUMBER

After v2.3.0: **SK-458**
