# XIIGen Engine — Master Agent Instructions

> **Stack:** NestJS 10 + TypeScript 5 (server) | React 18 + Vite 5 + Tailwind (client)
> **Tests:** ~9,500 passing | **Branch:** claude/vigorous-margulis | **Skills:** SK-426..SK-528 (103+ flow-design skills delivered)

---

## Governance Chain (load in this order, every session)

| # | Skill | Priority | When |
|---|-------|----------|------|
| 1 | `agent-constitution` | SUPREME | Session start |
| 2 | `no-product-decisions` | SUPREME | Session start |
| 3 | `dev-safety` | BLOCKING | Before any code |
| 4 | `skill-advisor-skill` | ADVISOR | AF-4→AF-9→AF-11 |

## Planning Chain (required before any plan is approved)

| # | Skill | Priority | Gates |
|---|-------|----------|-------|
| 5 | `infrastructure-discovery` | MANDATORY | Gate 0: 10-step discovery |
| 6 | `planning-skill` | MANDATORY | Gates 0–7 |
| 7 | `xiigen-core-principles-skill` | MANDATORY | P1–P8 (32-item) |
| 8 | `plan-review-skill` | MANDATORY | FC-1–FC-12 |
| 9 | `agent-output-format` | MANDATORY | Three-file rule, SESSION-0 |
| 10 | `how-to-prepare-a-plan-skill` | MANDATORY | 5-skill orchestrator |

## Quality Chain

| # | Skill | Load Order |
|---|-------|-----------|
| 11 | `engine-qa` | 11 |
| 12 | `test-integrity` | 12 |
| 13 | `bug-to-tests` | 13 |
| 14 | `three-level-verification` | 14 |

## Debugging Chain

| # | Skill | Load Order |
|---|-------|-----------|
| 15 | `code-examination-skill` | 15 |
| 16 | `mental-debug` | 16 |
| 17 | `self-verification` | 17 |

## Engine Chain

| # | Skill | Load Order |
|---|-------|-----------|
| 18 | `dna-compliance-guard` | 18 |
| 19 | `artifact-numbering` | 19 |
| 20 | `retroactive-development` | 20 |

## Infrastructure

| # | Skill | Load Order |
|---|-------|-----------|
| 21 | `docker-local-testing` | 21 |

## Session-End / Optional

| Skill | When |
|-------|------|
| `documentation-sync` (SK-422) | End of any session with TypeScript changes |
| `tracker-skill` | When project tracker is configured |

## Audit Chain (SK-424 to SK-428)

| SK | Skill | Priority | When |
|----|-------|----------|------|
| SK-424 | `chain-arithmetic-audit` | MANDATORY | FC-1 check + session Section A |
| SK-425 | `blast-radius-tagger` | MANDATORY | G0 before any write |
| SK-426 | `api-shape-verification` | MANDATORY | G0 before any test file |
| SK-427 | `audit-protocol` | MANDATORY | Gate B cross-model review |
| SK-428 | `plan-execution-feedback` | ADVISORY | Session end — track WF discovery rate |

## Context + Debug Chain (SK-429 to SK-430)

| SK | Skill | Priority | When |
|----|-------|----------|------|
| SK-429 | `context-overflow-skill` | MANDATORY | Check at >35% / ≤35% / ≤25% context thresholds |
| SK-430 | `debug-session-skill` | RECOMMENDED | Start of any debug session |

## AF Pipeline Execution Chain — registered 2026-03-23

All 9 skills live in `pipeline/` directory. Execute in phase order for every FLOW-XX:

| Phase | Skill file | Priority |
|-------|-----------|----------|
| Flow plan submitted | `pipeline/flow-plan-review-SKILL.md` | **Event-triggered** — fires immediately |
| Before Phase A (examine reference plan) | `pipeline/flow-examination-SKILL.md` | MANDATORY — produces 3 deliverables |
| Phase A (INJECT) — fixture authoring | `pipeline/fixture-json-builder-SKILL.md` | MANDATORY |
| Phase A (INJECT) — arbiter seeding | `pipeline/arbiter-registration-SKILL.md` | MANDATORY |
| Phase A start — lifecycle write | `pipeline/flow-lifecycle-SKILL.md` | MANDATORY |
| Phase B (GENERATE) — after every run | `pipeline/run-trace-reader-SKILL.md` | MANDATORY |
| Phase B — score 0.60–0.79 | `pipeline/promptops-cycle-SKILL.md` | MANDATORY |
| Phase B — score < 0.60 OR plateau after 3 cycles | Escalate to web session ⛔ | MANDATORY |
| Phase D — appReopenBehavior tests | `pipeline/flow-state-snapshot-SKILL.md` | MANDATORY |
| Phase E (PROMOTE) — DPO verification | `pipeline/dpo-training-data-SKILL.md` | MANDATORY |
| Phase E end — lifecycle ACTIVE | `pipeline/flow-lifecycle-SKILL.md` | MANDATORY |

**THE IMPROVEMENT CYCLE — when Phase B score < 0.80:**
```
Step 1: run-trace-reader — read GET /api/runs/:runId/trace, identify failing node
Step 2: Score 0.60-0.79 → promptops-cycle — patch prompt, bump version, re-run
Step 3: Score < 0.60 or same score after 2 cycles → ⛔ STOP, escalate, wait for web session
Step 4: DPO triple captured automatically by feedback.handler — verify n8 dpo_triple_id not null
```

---

## Flow Plan Review Skill — registered 2026-03-23

**flow-plan-review** (`pipeline/flow-plan-review-SKILL.md`) — event-triggered (not in sequential load order).
Fires immediately when any FLOW-XX plan document is submitted — before `implementation-mode-gate`,
before `planning-session-startup`, before any execution work begins.
Validates 12 mandatory sections. Rejects with itemized list if any section is missing or underspecified.
Approved plans receive structured summary + two-level cycle reminder.
Trigger: `@<FLOW-XX-*.md>`, "here is the flow plan", "plan for flow", `flow_id:` in document opening.

---

## Stack Coupling Skills (SK-431, SK-432, SK-433) — registered in FLOW-00.2

**SK-431 StackCouplingAuditor** — step 9 of the planning pipeline.
Classifies every element of a flow plan as CONCEPT_NEUTRAL, IMPL_VARIES,
STACK_COUPLED, or INCOMPATIBLE. Run for ALL flows.
Trigger: any new genesis prompt, any planning session.

**SK-432 HybridPromptBuilder** — builds Option C hybrid genesis prompts.
Separates neutral iron rules (Section 1) from stack-specific generation
frames (Section 4). NestJS-specific syntax never appears in Section 1.
Trigger: "genesis prompt", Pass 7 of any flow reexamination.

**SK-433 AngularObservableChainAuditor** — Angular-specific.
Determines Subject type, service scope, blast radius, and route guard
needs for every observable client node.
Trigger: angular in clientTargets AND node.client.tier != CONCEPT_NEUTRAL.

---

## The 14 Iron Rules (MACHINE — never break these)

1. Fabric First — no provider SDK imports in service code
2. No typed models (DNA-1) — `Record<string, unknown>` only
3. BuildSearchFilter (DNA-2) — all queries use dynamic builder
4. DataProcessResult (DNA-3) — all methods return this, never throw
5. MicroserviceBase (DNA-4) — all services extend it
6. Scope Isolation (DNA-5) — tenant via AsyncLocalStorage
7. DynamicController (DNA-6) — no entity-specific controllers
8. Idempotency (DNA-7) — queue consumers deduplicate
9. Outbox (DNA-8) — storeDocument() BEFORE enqueue()
10. CloudEvents (DNA-9) — inter-service events use envelope
11. No HTTP between services — queue only
12. Factory resolution via createAsync()
13. BFA before ship — validate against all existing flows before deployment
14. Config over code — business user changes → FREEDOM config

---

## OP-2 Code Quality Rules (enforced by OP-7 pre-commit gate)

These apply to EVERY production TypeScript file created or modified:

| Rule | Correct | Wrong |
|------|---------|-------|
| No `as any` | `as unknown as ArbiterPanelConfig` | `as any` |
| No `: any` constructors | `private db: IDatabaseService` | `private db: any` |
| No eslint-disable banners | Fix the violation | `/* eslint-disable */` |
| No em-dash in inline disables | `// eslint-disable-next-line @typescript-eslint/no-unsafe-call` | `// eslint-disable-next-line — @typescript-eslint/...` |
| Semantic slug names | `marketplace-payments-contracts.ts` | `flow-16-contracts.ts` |
| No new file-level eslint banners | Fix the violation | `/* eslint-disable @typescript-eslint/no-explicit-any */` at top of file |

---

## OP-7 Pre-Commit Gate (MANDATORY before every git commit)

```bash
./scripts/pre-commit-check.sh
# Expected: ALL 7 CHECKS PASSED
```

The script enforces:
1. Server lint exits 0
2. Server tsc --noEmit exits 0
3. Server jest passes (0 failures)
4. Client tsc --noEmit exits 0
5. Zero em-dash eslint-disable comments in staged files
6. Zero new file-level eslint-disable banners in staged files
7. Zero new `as any` in staged production files

If any check fails, the commit is blocked. Fix before committing. Never bypass with `--no-verify`.

---

## Zero-Regression Rule

```
Δ new failures vs preExistingFailures[] = 0
```
Test count must never decrease. Pre-existing failures are documented in `.claude/skills/CARRY-FORWARD-ISSUES.md` and excluded from the zero gate.

---

## Naming Convention — Semantic Slugs (ABSOLUTE RULE)

`flow-NN` numeric naming is **prohibited** in all code paths. Only permitted in:
- `docs/sessions/FLOW-XX/` planning documents
- `flowId: "FLOW-XX"` data field values inside JSON

**Complete Flow → Slug mapping:**

```
FLOW-00  bundle-activation              FLOW-21  dynamic-forms-workflows
FLOW-01  user-registration              FLOW-22  cms-publishing
FLOW-02  profile-enrichment             FLOW-23  form-builder-templates
FLOW-03  event-management               FLOW-24  ai-safety-moderation
FLOW-04  event-attendance               FLOW-25  bfa-cross-flow-governance
FLOW-05  completion-gamification        FLOW-26  meta-flow-engine
FLOW-06  user-groups-communities        FLOW-27  human-interaction-gate
FLOW-07  friend-request-social-feed     FLOW-28  blog-cms-modules
FLOW-08  marketplace                    FLOW-29  adaptive-rag-deep-research
FLOW-09  transactional-event-participation  FLOW-30  tenant-lifecycle-manager
FLOW-10  reviews-reputation             FLOW-31  design-intelligence-engine
FLOW-11  schema-registry-dag            FLOW-32  sharable-flows-marketplace
FLOW-12  subscription-billing           FLOW-33  system-initiation-bootstrap
FLOW-13  data-warehouse-analytics       FLOW-34  marketplace-plugin-adapter
FLOW-14  etl-data-integration           FLOW-35  meta-arbitration-engine
FLOW-15  saas-multi-tenancy             FLOW-36  feature-registry
FLOW-16  marketplace-payments           FLOW-37  design-system-governance
FLOW-17  freelancer-marketplace         FLOW-38  rag-quality-feedback
FLOW-18  visual-flow-engine             FLOW-39  oss-curriculum
FLOW-19  durable-sagas-compliance       FLOW-40  client-push
FLOW-20  ads-platform
```

**Verification command (should return 0 results):**
```bash
find server/src server/test client/src client/__tests__ -type d \
  \( -name "flow-[0-9][0-9]" -o -name "flow[0-9][0-9]" -o -name "flow[0-9][0-9][0-9]" \) \
  | grep -v "docs/sessions\|node_modules"
# Expected: 0 lines
```

---

## TECH DEBT TRACKER

Active issues that Claude Code must not introduce further instances of:

| ID | Issue | Location | Status |
|----|-------|----------|--------|
| TD-001 | 168 em-dash eslint-disable comments | ~65 production files | ✅ RESOLVED 2026-04-13 |
| TD-010 | 19 `: any` constructor injections | FLOW-10 reviews-reputation services | ✅ RESOLVED 2026-04-13 |
| TD-011 | `as any` metadata access in cycle-chain.service.ts | cycle-chain.service.ts | Active — CI-FIX-PLAN.md item 1 |

**Pre-existing violations listed above are documented exceptions.** New code must not add to these counts.
Reference: `.claude/skills/CARRY-FORWARD-ISSUES.md` for full list.

---

## Commands

```bash
cd server && npm run build          # build (0 errors expected)
cd server && npx jest --verbose     # ~9,500 tests
cd server && npx tsc --noEmit       # type check (0 errors expected)
cd client && npx jest --verbose     # client tests
./scripts/pre-commit-check.sh       # OP-7 gate — ALL 7 CHECKS MUST PASS
docker compose up --build           # full stack
```

---

## FLOW DESIGN SKILLS — Layer 1 Engine Internals (SK-426..SK-470)

### v1.0.2 — Load order 0 (foundational)

| Skill | Load when | SK |
|-------|-----------|-----|
| planning/planning--bootstrap-boundary-SKILL.md | Step ⓪ every planning session | SK-426 |
| planning/planning--flow-vs-service-gate-SKILL.md | After implementation-mode-gate | SK-427 |
| code-execution/code-execution--topology-structure-SKILL.md | Before writing any .topology.json | SK-428 |
| code-execution/code-execution--self-questioning-SKILL.md | Before writing any ai-generate prompt | SK-429 |
| code-execution/code-execution--learning-signal-capture-SKILL.md | Before writing any feedback.handler | SK-468 |
| planning/planning--flow-design-cycle-SKILL.md | After Phase A to verify 5-stage cycle | SK-469 |
| code-execution/code-execution--flow-restructure-SKILL.md | Restructuring flow files | SK-470 |

### v1.0.3 (SK-430..SK-441)

```
load_order  0: planning/planning--solution-scope-gate-SKILL.md       (before ANY solution proposed)
load_order  0: planning/planning--problem-decomposition-SKILL.md     (problem-driven sessions)
load_order  0: planning/planning--root-cause-ladder-SKILL.md         (recurring problems)
load_order  1: code-execution/code-execution--node-convergence-SKILL.md    (before genesis prompt)
load_order  1: planning/planning--node-design-review-SKILL.md        (after NODE, before Phase B)
load_order  0: code-execution/code-execution--github-lab-SKILL.md    (cross-branch analysis)
load_order 99: session-output/session-output--investigation-handoff-SKILL.md (end of investigation)
load_order 99: planning/planning--architectural-decision-testing-SKILL.md (Gate C + arch review)
load_order -1: planning/planning--level-correction-response-SKILL.md  (SK-439, when challenged on level)
load_order -1: planning/planning--change-propagation-SKILL.md          (SK-440, START of any task changing skills/flows)
load_order  1: planning/planning--simulation-protocol-SKILL.md        (SK-441, simulation + CROSS_FLOW_TRACE)
```

# Invoke planning/planning--claim-verification-SKILL.md whenever:
#   - a review document arrives
#   - a renumbering map is proposed
#   - a model states an artifact number

### v2.0.0 (SK-442..SK-447)

```
load_order  1: planning/planning--arbiter-panel-design-SKILL.md      (writing multi-generate/arbiter-panel nodes)
load_order  1: planning/planning--principles-arbiter-SKILL.md        (configuring key_principles arbiter)
load_order  1: planning/planning--escalation-orchestrator-SKILL.md   (arbiter panel escalation)
load_order 98: planning/planning--session-file-authoring-SKILL.md    (Gate C — ALL session file production)
load_order 99: session-output/session-output--mission-progress-SKILL.md    (before every ⛔ STOP)
load_order 99: planning/planning--naming-conventions-enforcer-SKILL.md  (SK-447, before any finding/output)
```

### v2.3.0 (SK-448..SK-457)

```
load_order -1: planning/planning--output-contract-SKILL.md           (SK-448, before EVERY session starts)
load_order  1: planning/planning--iron-rule-derivation-SKILL.md       (SK-449, before any genesis prompt)
load_order 98: planning/planning--architecture-decision-capture-SKILL.md (SK-450, Gate C)
load_order  1: planning/planning--freedom-machine-classification-SKILL.md (SK-451, before any value in code/config)
load_order  1: planning/planning--convergence-round-design-SKILL.md   (SK-452, designing FLOW-37 topology)
load_order  1: planning/planning--stack-portability-design-SKILL.md   (SK-453, any INCOMPATIBLE verdict)
load_order  0: planning/planning--system-intake-SKILL.md              (SK-454, before designing for existing codebase)
load_order 0.5: planning/planning--wave-assignment-SKILL.md           (SK-455, before any flow planning session)
load_order -1: planning/planning--assumption-registry-SKILL.md        (SK-456, after plan produced)
load_order -1: code-execution/code-execution--phase-preflight-SKILL.md (SK-457, Claude Code session START)
```

### v2.5.0 (SK-461..SK-470)

```
load_order 0.5: planning/planning--difficulty-prediction-SKILL.md      (SK-461, before session file authoring)
load_order  1: planning/planning--adaptation-map-SKILL.md              (SK-462, Phase B section design)
load_order  1: planning/planning--cross-flow-dependency-design-SKILL.md (SK-463, Phase F event registration)
load_order  1: planning/planning--flow-retrospective-SKILL.md           (SK-464, after last sequential flow ACTIVE)
load_order  0: code-execution/code-execution--capability-measurement-SKILL.md (SK-465, capability audit start)
load_order  1: planning/planning--remediation-session-design-SKILL.md   (SK-466, after SK-432 root causes)
load_order  0: code-execution/code-execution--learning-path-audit-SKILL.md    (SK-467, after SK-465)
```

## FLOW DESIGN SKILLS — Layer 2 Engine Lifecycle (SK-460, SK-471..SK-491) — v3.0.0

```
load_order -2: planning/planning--session-scope-resolution-SKILL.md     (SK-460, resolve scope before session)
load_order  0: code-execution/code-execution--score-zero-investigation-SKILL.md (score-0 found)
load_order  0: code-execution/code-execution--test-failure-triage-SKILL.md      (test failures present)
load_order  0: planning/planning--qa-session-type-SKILL.md               (SK-481, phase approval sessions)
load_order  2: code-execution/code-execution--score-interpretation-SKILL.md     (Phase B score output)
load_order  3: code-execution/code-execution--prompt-patch-authoring-SKILL.md   (before PromptPatch)
load_order  3: code-execution/code-execution--generated-code-review-SKILL.md    (after Phase B generates)
```

## FLOW DESIGN SKILLS — Layer 3 Product Lifecycle (SK-492..SK-504) — v3.1.0

```
load_order  0: planning/planning--requirement-to-flow-SKILL.md          (SK-492, new product; UML → flows)
load_order  0: planning/planning--cross-cutting-service-SKILL.md         (SK-495, inside SK-492 decomposition)
load_order  1: planning/planning--domain-event-design-SKILL.md           (SK-494, before any event schema)
load_order  1: planning/planning--service-boundary-design-SKILL.md       (SK-496, UML service → task type)
load_order  1: planning/planning--algorithm-as-service-SKILL.md          (SK-497, ranking/matching/scoring)
load_order  1: planning/planning--temporal-behavior-design-SKILL.md      (SK-503, time-delta state machines)
load_order  0: planning/planning--feature-prioritization-SKILL.md        (SK-502, when >3 flows unblocked)
load_order  0: planning/planning--shared-infrastructure-design-SKILL.md  (SK-504, shared fabric interfaces)
load_order  0: code-execution/code-execution--multi-service-local-dev-SKILL.md (SK-501, before Phase B Wave 1+)
load_order  0: code-execution/code-execution--event-driven-debugging-SKILL.md  (SK-498, cross-service failure)
load_order 99: planning/planning--product-scope-validation-SKILL.md      (SK-493, after wave ACTIVE)
load_order 99: qa/qa--user-journey-acceptance-testing-SKILL.md           (SK-499, before wave deliverable)
load_order 99: qa/qa--data-flow-integrity-SKILL.md                       (SK-500, after wave completes)
```

## FLOW DESIGN SKILLS — Layer 4 Self-Awareness (SK-505..SK-509) — v3.1.0

```
load_order -2: self/self--extension-session-type-SKILL.md               (SK-509, SELF-EXTENSION session start)
load_order -2: self/self--capability-state-reader-SKILL.md              (SK-505, read state before planning)
load_order  0: self/self--gap-to-proposal-SKILL.md                      (SK-506, after MISSING capability detected)
load_order 99: self/self--implementation-integrity-SKILL.md             (SK-507, after extension completes)
load_order 99: self/self--training-data-gap-audit-SKILL.md              (SK-508, after SK-507 confirms closure)
```

## FLOW DESIGN SKILLS — Layer 5 Graph Intelligence (SK-510..SK-519) — v2.8.0

```
load_order  1: planning/planning--graph-rag-fabric-integration-SKILL.md  (SK-510, before any graph query)
load_order  1: planning/planning--confidence-lifecycle-design-SKILL.md   (SK-511, designing edge confidence flows)
load_order  1: planning/planning--ai-decision-pipeline-design-SKILL.md   (SK-512, 4-role AI pipeline design)
load_order  1: planning/planning--learning-loop-closure-SKILL.md         (SK-513, before retrospective design)
load_order  0: planning/planning--graph-entity-schema-design-SKILL.md    (SK-514, graph entity / edge schema)
load_order  0: planning/planning--top-manager-extension-protocol-SKILL.md (SK-515, governance layer proposals)
load_order  0: planning/planning--four-tier-decision-classification-SKILL.md (SK-516, decision tier routing)
load_order  0: planning/planning--planning-dpo-authoring-SKILL.md        (SK-517, DPO triple authoring)
load_order  0: planning/planning--skill-graph-sync-SKILL.md              (SK-518, skill↔graph registry sync)
load_order  1: planning/planning--static-to-graph-topology-refactoring-SKILL.md (SK-519, bootstrap→graph migration)
```

## FLOW DESIGN SKILLS — SK-520..SK-528

```
SK-526: AI_SCOPE_ARBITER — scope isolation arbiter for multi-tenant flows (FC-32)
        Trigger: any flow with PRIVATE or PLATFORM_ONLY index classification
```

---

## Artifact Numbers (Next Available)

```
Factory: F1601    Task Type: T650    Skill: SK-529
BFA Rule: CF-809  Family: 209        DR: DR-240
```
**CRITICAL:** Read from `CLAUDE.md` + `docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json` at session start. Never use cached numbers.

---

## XIIGen Design Documents (RAG Reference)

Canonical design documents are in `docs/xiigenDesign/`. Use `RAG_INDEX.md` as the navigation entry point.

| Document | Topic | When to consult |
|----------|-------|-----------------|
| `RAG_INDEX.md` | Navigation index with actual counts + flow directory map | **START HERE** for any design lookup |
| `README.md` | Stack, structure, artifact boundaries | Project overview, getting started |
| `ENGINE_ARCHITECTURE_MERGED.md` | Factories, fabrics, DNA, bootstrap (30K lines) | Architecture decisions, factory/fabric design |
| `TASK_TYPES_CATALOG_MERGED.md` | Task type contracts (30K lines) | Task type definitions, archetypes, iron rules |
| `V62_BFA_STRESS_TEST_MERGED.md` | BFA rules + stress tests (20K lines) | BFA rule design, cross-flow validation |
| `SKILLS_FACTORY_RAG_MERGED.md` | Skills + RAG mapping (18K lines) | Skill patterns, RAG seeding strategies |
| `MT_FOUNDATION_STANDARD_P26.md` | Multi-tenant foundation | Tenant isolation, scope enforcement |

All design docs have ⚠️ IMPLEMENTATION UPDATE headers noting differences from design-phase values.
Design docs reference Python/FastAPI stack — live code is NestJS 11 + TypeScript 5.
