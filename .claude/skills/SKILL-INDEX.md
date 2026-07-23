# XIIGEN SKILLS — MASTER INDEX
## Date: 2026-03-26 | 86 skills | Single source of truth
## Naming: {human-name}-SKILL.md — no more SK-XXX in filenames

---

## ⚠️ GOLDEN RULE — SKILL NAMING

**ALWAYS reference skills by their human-readable name. NEVER by their alphanumeric key.**

| ✅ Correct | ❌ Wrong |
|-----------|---------|
| `run **flow-plan-review**` | `run SK-437` |
| `invoke **flow-examination**` | `use SK-438` |
| `see **arbiter-registration**` | `see SK-440` |
| `**promptops-cycle** handles this` | `SK-442 handles this` |

**The `sk_number:` field in skill frontmatter is the ONLY place an SK-### number appears.**
It is an artifact tracking ID — internal metadata only. It is never used to invoke or reference the skill.

**Applies everywhere:** plan files, session masters, AGENTS.md, skill bodies, gap tables, commit messages, chat.
Any document that references a skill by SK-### instead of its name is INCORRECT and must be updated.

---

## DIRECTORY STRUCTURE

```
xiigen-skills-unified/
  SKILL-INDEX.md                    ← this file
  HOW-TO-USE-SKILLS.md              ← master guide
  NEW-TASK-PLANNING-PROMPT.md       ← paste to start any planning session
  SESSION-0-PLAN-REVIEW-TEMPLATE.md ← gate before execution

  planning/                         ← 23 skills (web sessions: you + Claude)
  session-output/                   ← 4 skills (Claude Code output format)
  pipeline/                         ← 13 skills (pipeline orchestration + AF pipeline execution)
  code-execution/                   ← 20 skills (Claude Code runtime)
  reference/                        ← 4 skills (engine knowledge base)
  audit/                            ← 5 skills (review & audit)
```

---

## WHAT CHANGED IN v8 (2026-03-22)

```
ROOT CAUSE: FLOW-01 review passed 31/31 but plan routed to wrong executor.
  Genesis prompts treated as Claude Code instructions instead of AF-1 input.
  Plan contained Angular/Android stateNotes for stacks nobody is implementing.

FIXES:
  NEW:  implementation-mode-gate-SKILL.md — routes af-pipeline vs manual
  P12:  Implementation Mode Declaration (xiigen-core-principles v4)
  P13:  Scope Discipline (xiigen-core-principles v4)
  V0-MODE + V0-SCOPE in flow-completeness-checker v1.5 (33 items)
  Question 0 in planning-session-startup v1.2
  Step ⓪ in how-to-prepare-a-plan v6 (10-step pipeline)
  Pass 7 updated in flow-reexamination v1.1 (genesis = AF-1 input)
  NEW-A7 added (AF prompt seeding in INJECT phase)

RULE: FLOW-01 through FLOW-24 use implementationMode: "af-pipeline".
  Claude Code writes contracts + prompts. XIIGen AF pipeline generates services.
  No SESSION file creates .service.ts files directly for user-facing flows.
```

---

## PLANNING SKILLS (23)

| Skill | Version | What it does | When to invoke |
|-------|---------|-------------|----------------|
| **implementation-mode-gate** | 1.0 | Routes af-pipeline vs manual (P12) | **Step ⓪ — before everything** |
| **planning-session-startup** | 1.2 | Q0: mode+scope. Q1-3: baseline, decisions, docs | Always first after step ⓪ |
| **decision-reopening** | 1.0 | Protocol to challenge locked decisions | "Should we reconsider D-XX?" |
| **flow-completeness-checker** | 1.5 | 33-item checklist (V0-MODE, V0-SCOPE, V1–V31) | Before producing session files |
| **event-contract-designer** | 1.1 | Event schema design with stack-neutral check | Designing Mode C contracts |
| **client-server-symmetry** | 1.0 | Client state map per DAG node | Flows with user-facing screens |
| **e2e-test-matrix-builder** | 1.0 | 8 mandatory test categories | After Pass 6 |
| **meta-escalation-router** | 1.0 | Decide: escalate vs retry vs continue | When something goes wrong |
| **document-hierarchy** | 1.0 | Find the right document | "Where is X documented?" |
| **blast-radius-assessor** | 1.0 | Impact assessment before changes | Before modifying engine/contracts |
| **model-selection** | 1.0 | Choose AI model for cost vs quality | Selecting models for AF pipeline |
| **naming-conventions-enforcer** | 1.0 | Domain names for files, contracts, Jira | Step ⑧ |
| **stack-coupling-auditor** | 1.0 | Classify across stack taxonomy | Step ⑨ |
| **hybrid-prompt-builder** | 1.0 | Convert genesis prompts to AF-1 input format | Pass 7 |
| **angular-observable-chain-auditor** | 1.0 | Angular-specific state analysis | Flows targeting Angular |
| **parallel-wave-coordinator** | 1.0 | Wave 2+ parallel execution | parallel_wave in STATE.json |
| **product-variant-router** | 1.0 | FLOW-34 marketplace adapter decisions | Planning plugin adapters |
| **bundle-version-guard** | 1.0 | Bundle min-version compatibility | After Case A/C promotion |
| **flow-reexamination** | 1.1 | 7-pass algorithm (Pass 7 = AF-1 input) | Any user-facing flow |
| **how-to-prepare-a-plan** | 6.0 | 10-step pipeline, 13 principles | Every planning session |
| **xiigen-core-principles** | 4.0 | 13 principles (P1-P13) | Every plan |
| **plan-review** | 1.0 | FC checks, failure catalog, root cause | Step ⑥ |
| *session-0-plan-review-template* | 2.0 | Gate template before execution | Before SESSION-1 |

---

## SESSION OUTPUT SKILLS (4)

| Skill | Version | What it does |
|-------|---------|-------------|
| **session-execution-log** | 1.0 | EXECUTION-LOG JSON format |
| **phase-completion-packager** | 1.1 | 3 output files after every gate |
| **web-session-handoff** | 1.0 | SESSION-BRIEF for next web session |
| **phase-git-report** | 1.0 | Git commit report |

---

## PIPELINE ORCHESTRATION SKILLS (4)

| Skill | Version | Pipeline step |
|-------|---------|---------------|
| **agent-output-format** | 2.0 | Step ① |
| **infrastructure-discovery** | 1.0 | Step ④ |
| **planning** | 1.0 | Step ⑤ |
| **skill-advisor** | 1.0 | Automatic |

---

## AF PIPELINE EXECUTION SKILLS (9)

All 9 skills live in `pipeline/` directory. Invoke in order per phase.

| Skill | Version | What it does | When to invoke |
|-------|---------|-------------|----------------|
| **flow-plan-review** | 2.0.0 | **Two-layer gate.** Gate 0: Infrastructure Readiness (8-phase, 30-gap check — blocks all flows until engine can run). Gate 1: 12-section plan completeness check. Both must pass. | **Event-triggered** — any FLOW-XX plan document, "execute flow", "start phase A" |
| **flow-examination** | 2.0.0 | Produce SESSION-MASTER, MISSING-INFRASTRUCTURE, LEARNING-SPEC from reference plan. v2: executability-first, 3 Phase B paths, BUILD specs for gaps. | Before Phase A of any flow |
| **fixture-json-builder** | 1.0.0 | Exact schema + rules for all 6 fixture types (contract, prompt, RAG, topology, arbiter, event schema). | Phase A of any flow |
| **arbiter-registration** | 1.0.0 | Arbiter fixture format, NAMED_CHECK IDs, arbiter replay gate (V18). | Phase A of any flow with arbiters |
| **run-trace-reader** | 1.0.0 | 8-node trace interpretation, score band → action routing, escalation triggers. | After every Phase B run |
| **promptops-cycle** | 1.0.0 | 9-step PromptOps iteration: read trace → NEGATIVE EXAMPLE → PUT /api/prompts → re-run → DPO. | Phase B score 0.60–0.79 |
| **flow-lifecycle** | 1.0.0 | Lifecycle transitions: INJECTING → GENERATING → INTEGRATING → ACTIVE. CAS writes, prereq checks. | Phase A start + Phase E end |
| **dpo-training-data** | 1.0.0 | Full DPO triple format (6 fields), where each comes from, Phase E verification, fine-tuning export. | Phase E verification + GAP-08 debugging |
| **flow-state-snapshot** | 1.0.0 | Write path (sync + deferred), read path (GET /api/flow/:id/state), C5 client test protocol. | Phase D when appReopenBehavior tests present |

**AF Pipeline phase → skill mapping:**

| Phase | Skills | Priority |
|-------|--------|----------|
| Before Phase A (examine any new flow) | **flow-plan-review** + **flow-examination** | MANDATORY |
| Phase A (INJECT) | **fixture-json-builder** + **arbiter-registration** | MANDATORY |
| Phase B (GENERATE) — after every run | **run-trace-reader** | MANDATORY |
| Phase B — score 0.60–0.79 | **promptops-cycle** | MANDATORY |
| Phase B — score < 0.60 | Escalate — do not run another cycle | MANDATORY |
| Phase A start + Phase E end | **flow-lifecycle** | MANDATORY |
| Phase E (PROMOTE) | **dpo-training-data** | MANDATORY |
| Phase D (client tests with appReopenBehavior) | **flow-state-snapshot** | MANDATORY |

---

## CODE EXECUTION SKILLS (20)

| Skill | Version | What it does |
|-------|---------|-------------|
| **agent-constitution** | — | Core behavioral rules + 4 rule sub-files |
| **dev-safety** | — | Build gates, git discipline |
| **no-product-decisions** | — | Claude never declares regressions as correct |
| **test-integrity** | — | 5 rules: branch reachability, contract testing |
| **self-verification** | 1.0 | 6 post-fix verification rules |
| **mental-debug** | 2.0 | 4 moves + 13 pattern rules |
| **code-examination** | 1.0 | How to read existing code |
| **debug-session** | 1.0 | Structured debugging protocol |
| **context-overflow** | 1.0 | Handle context window limits |
| **bug-to-tests** | 1.0 | Bug reports → regression tests |
| **dna-compliance-guard** | 1.0 | Enforce 9 DNA patterns |
| **docker-local-testing** | 1.0 | Fabric coverage, provider swap, tenant isolation |
| **documentation-sync** | 2.0 | Keep docs in sync with code |
| **engine-qa** | 1.0 | Engine quality + known violations |
| **flow-implementation-guide** | 1.0 | 4-phase AF pattern (INJECT→GENERATE→JUDGE→IMPROVE) |
| **flow-prerequisites** | 1.0 | Check prerequisites before starting |
| **retroactive-development** | 1.0 | Apply new standards to existing code |
| **self-implementation** | 1.0 | Engine generating its own code (boundary rule) |
| **three-level-verification** | — | Verify at unit, integration, e2e |
| **tracker** | — | Progress tracking |

---

## REFERENCE SKILLS (4)

| Skill | Version | What it does |
|-------|---------|-------------|
| **xiigen-engine** | 2.1 | AF pipeline, DNA patterns, fabric interfaces |
| **xiigen-flow-builder** | 2.1 | Contract templates, flow registry, merge protocol |
| **artifact-numbering** | 1.0 | Artifact ID management |
| **data-connection-classification** | 1.0 | Classify data connections |

---

## AUDIT SKILLS (5)

| Skill | Version | What it does |
|-------|---------|-------------|
| **api-shape-verification** | 1.0 | Verify imports before writing tests |
| **audit-protocol** | 1.0 | 10-point mandatory review checklist |
| **blast-radius-tagger** | 1.0 | Tag changes by risk category |
| **chain-arithmetic-audit** | 1.0 | Baseline + deltas = final |
| **plan-execution-feedback** | 1.0 | Track discovery rate and test accuracy |

---

## GAPS CLOSED IN v9 (2026-03-23)

| Gap | Closed by |
|-----|-----------|
| No gate prevented execution on incomplete flow plans | **flow-plan-review** |
| Arbiters could be inferred rather than declared | **flow-plan-review** Hard Rule: NEVER infer arbiters |
| Missing infrastructure section could be skipped | **flow-plan-review** Hard Rule: absent Section 3 = automatic rejection |
| DPO expectations had no contrast pair source requirement | **flow-plan-review** Section 12 requires contrast pair declaration |
| No standard flow examination methodology | **flow-examination** |
| Fixture JSON format undocumented — Claude Code had to guess | **fixture-json-builder** |
| Arbiter replay gate (V18) had no operational procedure | **arbiter-registration** |
| Run trace interpretation was undocumented — diagnosis was guesswork | **run-trace-reader** |
| "PromptPatch" mentioned in 5 skills but procedure never defined | **promptops-cycle** |
| No AF Pipeline Execution Chain in AGENTS.md | Added — maps phase to required skills |
| No improvement cycle protocol in HOW-TO-USE-SKILLS.md | Added to AGENTS.md pipeline chain |
| flow-examination based on v1 prompt (missing 3 Phase B paths, BUILD specs) | **flow-examination** v2.0.0 |
| No lifecycle tracking protocol for flow states | **flow-lifecycle** |

## GAPS CLOSED IN v2.2.0 (2026-03-25)

| Gap | Closed by |
|-----|-----------|
| Claude cited rules before executing direct instructions | H0 protocol in `HOW-TO-USE-SKILLS-v2.2.0.md` |
| Contradictions between instructions and skills went unclassified | FC-32 in `planning--plan-review-SKILL.md` |
| Letter+number identifiers obscured architectural findings | SK-447 `planning--naming-conventions-enforcer-SKILL.md` |
| SK-439 had no protocol for governance contradictions | SK-439 v2.0 PART 1 added |

## GAPS CLOSED IN v9.1 (2026-03-23 — after FLOW-03/04/05 examinations)

| Gap | Closed by |
|-----|-----------|
| flow-plan-review had no infrastructure readiness check — plans approved on missing engine | **flow-plan-review** v2.0.0 Gate 0: 8-phase, 30-gap infrastructure check |
| Engine would run flows on hardcoded TypeScript switch statements — unmaintainable at 13+ archetypes | Gate 0 CHECK 3.1: archetype templates must be JSON fixtures, decompose must load from registry |
| Named checks hardcoded in validate.handler — unmaintainable at 30+ checks | Gate 0 CHECK 3.2: 7 generic evaluator patterns must be externally loadable |
| MACHINE constant logic absent from score.handler — config.get() always good/bad regardless of contract | Gate 0 CHECK 3.3: machine_constant gate must be contract-aware (reads machineConstants[]) |
| 14 dead code files would shadow the new infrastructure during build | Gate 0 CHECK 1.2: dead code confirmed deleted before any flow runs |
| Wave 2+ plans could be approved with ⛔ REQUIRED pre-allocation placeholders | Gate 1 Section 1: pre-allocation confirmed + T-range collision guard for out-of-order ranges |
| Plans with MACHINE constant declarations had no negative scenario testing config.get() violation | Gate 1 Section 7: MACHINE/FREEDOM conflict negative scenarios required |
| IR-5 ambiguity resolution missing from review (reference plan could contradict itself) | Gate 1 Section 3: unresolved contradictions = automatic rejection |
| Pattern transfer rate not tracked across flows | Gate 0 approval output now shows transfer rate + HEALTHY/LOW signal |
| Bundle membership not checked at Phase E | Gate 1 Section 4 Phase E: bundle version check required for Wave 2+ flows |
| DPO triple format incomplete (GAP-08) | **dpo-training-data** |
| FlowStateSnapshot write/read protocol undocumented | **flow-state-snapshot** |

---

## GAPS CLOSED IN v8

| Gap | Closed by |
|-----|-----------|
| No skill asked "who writes the code?" | P12 + implementation-mode-gate + V0-MODE |
| Plans passed 31/31 with AF pipeline bypassed | V0-MODE rejects if SESSION files create .service.ts |
| No skill checked scope discipline | P13 + V0-SCOPE |
| Plans had Angular/Android for react-web scope | V0-SCOPE rejects stateNotes outside clientTargets |
| Genesis prompts treated as Claude Code instructions | Pass 7 v1.1 marks them as AF-1 input |
| self-implementation skill walled off from planning | implementation-mode-gate bridges the boundary rule |
| Phase A had no AF prompt seeding step | NEW-A7 in flow-reexamination v1.1 |

---

## FLOW DESIGN SKILLS — v1.0.2 (Added 2026-03-24)

| File | SK | What it does |
|------|----|-------------|
| planning/planning--bootstrap-boundary-SKILL.md | SK-426 | Step ⓪ every planning session |
| planning/planning--flow-vs-service-gate-SKILL.md | SK-427 | After implementation-mode-gate |
| code-execution/code-execution--topology-structure-SKILL.md | SK-428 | Writing topology contracts |
| code-execution/code-execution--self-questioning-SKILL.md | SK-429 | ai-generate prompts for design |
| code-execution/code-execution--learning-signal-capture-SKILL.md | — | feedback.handler + Gate C |
| planning/planning--flow-design-cycle-SKILL.md | — | Reviewing infra flow plans |
| code-execution/code-execution--flow-restructure-SKILL.md | — | Restructuring flow files |

## FLOW DESIGN SKILLS — v1.0.3 (Added 2026-03-24)

| File | SK | What it does |
|------|----|-------------|
| planning/planning--problem-decomposition-SKILL.md | SK-430 | Decompose before acting |
| planning/planning--claim-verification-SKILL.md | SK-431 | 3-class verification before trusting claims |
| planning/planning--root-cause-ladder-SKILL.md | SK-432 | Act at the right level |
| session-output/session-output--investigation-handoff-SKILL.md | SK-433 | discoveries[] + rejected_claims[] |
| planning/planning--solution-scope-gate-SKILL.md | SK-434 | Minimum scope ladder |
| code-execution/code-execution--node-convergence-SKILL.md | SK-435 | Build NODE via convergence |
| code-execution/code-execution--github-lab-SKILL.md | SK-436 | 4-call branch analysis |
| planning/planning--node-design-review-SKILL.md | SK-437 | NODE readiness gate |
| planning/planning--architectural-decision-testing-SKILL.md | SK-438 | Decision validation |
| planning/planning--level-correction-response-SKILL.md | SK-439 | Abandon frame on level challenge; load order -1 |
| planning/planning--change-propagation-SKILL.md | SK-440 | Blast radius before any task; prevents partial updates |

## FLOW DESIGN SKILLS — v2.0.0 (Added 2026-03-25)

| File | SK | What it does |
|------|----|-------------|
| planning/planning--arbiter-panel-design-SKILL.md | SK-442 | 7 specialized arbiters + upper judge + arbiterConfig template |
| planning/planning--session-file-authoring-SKILL.md | SK-443 | Crystallization protocol; 7 self-containment checks; Gate C mandatory |
| planning/planning--principles-arbiter-SKILL.md | SK-444 | Isolation rule; growth rule; self-reinforcement |
| session-output/session-output--mission-progress-SKILL.md | SK-445 | 5 mission questions; DECISION THRESHOLDS; ENGINE PROGRESS table |
| planning/planning--escalation-orchestrator-SKILL.md | SK-446 | 6 decision rules; ARBITER_VERDICT/DISAGREEMENT signals |

## FLOW DESIGN SKILLS — v2.2.0 (Added 2026-03-25)

| File | SK | What it does |
|------|----|-------------|
| planning/planning--naming-conventions-enforcer-SKILL.md | SK-447 | Extends naming-conventions to XIIGen; letter+number trigger; ARCHITECTURAL IMPLICATION format |
| planning/planning--level-correction-response-SKILL.md | SK-439 v2.0 | PART 1 added: human override protocol — execute instruction first, classify contradiction |

## FLOW DESIGN SKILLS — v2.3.0 (Added 2026-03-26)

| File | SK | What it does |
|------|----|-------------|
| planning/planning--output-contract-SKILL.md | SK-448 | Session output contract; load order -1; before EVERY session |
| planning/planning--iron-rule-derivation-SKILL.md | SK-449 | Derive iron rules from failure modes; before any genesis prompt |
| planning/planning--architecture-decision-capture-SKILL.md | SK-450 | Produce ARCHITECTURE-DECISIONS.json; Gate C mandatory |
| planning/planning--freedom-machine-classification-SKILL.md | SK-451 | Classify each value MACHINE vs FREEDOM; before any value in code/config |
| planning/planning--convergence-round-design-SKILL.md | SK-452 | Convergence challenger prompts; designing FLOW-37 topology |
| planning/planning--stack-portability-design-SKILL.md | SK-453 | stackCoupling annotation; any INCOMPATIBLE verdict |
| planning/planning--system-intake-SKILL.md | SK-454 | Intake methodology for existing codebases; before designing for existing codebase |
| planning/planning--wave-assignment-SKILL.md | SK-455 | Wave assignment discipline; before any flow planning session |
| planning/planning--assumption-registry-SKILL.md | SK-456 | Register assumptions at plan authoring time; after plan produced |
| code-execution/code-execution--phase-preflight-SKILL.md | SK-457 | Claude Code session START gate; before any code written |

**Extensions in v2.3.0:**

| Patch File | Extends | What it adds |
|-----------|---------|-------------|
| PATCH--simulation-protocol-CROSS-FLOW-TRACE.md | SK-441 | CROSS_FLOW_TRACE protocol for cross-flow boundary simulation |
| PATCH--simulation-protocol-GAP-TAXONOMY.md | SK-441 | gap_class A-I taxonomy (9 architectural layer classes) |
| PATCH--github-lab-CONVERGENCE-CONTEXT.md | SK-436 | Convergence-time context resolution for DOWNSTREAM_CONTRACT / REST_CONTRACT / SCHEMA_VERSION |
| PATCH--root-cause-ladder-TRIGGERS.md | SK-432 | "after running simulations" + "gap catalog produced" triggers |

**Next available SK: SK-458**

## FLOW DESIGN SKILLS — v2.5.0 (Added 2026-03-26)

| File | SK | What it does |
|------|----|-------------|
| planning/planning--difficulty-prediction-SKILL.md | SK-461 | Cycle budget prediction before session file authoring |
| planning/planning--adaptation-map-SKILL.md | SK-462 | Phase B section design after difficulty prediction |
| planning/planning--cross-flow-dependency-design-SKILL.md | SK-463 | Phase F event registration design |
| planning/planning--flow-retrospective-SKILL.md | SK-464 | R-1 retrospective before Wave 2 pre-allocation |
| code-execution/code-execution--capability-measurement-SKILL.md | SK-465 | Static + runtime capability audit |
| planning/planning--remediation-session-design-SKILL.md | SK-466 | Root causes → ordered session plan |
| code-execution/code-execution--learning-path-audit-SKILL.md | SK-467 | 5 signal types learning audit |
| code-execution/code-execution--learning-signal-capture-SKILL.md | SK-468 | feedback.handler + Gate C (SK assigned) |
| planning/planning--flow-design-cycle-SKILL.md | SK-469 | Reviewing infra flow plans (SK assigned) |
| code-execution/code-execution--flow-restructure-SKILL.md | SK-470 | Restructuring flow files (SK assigned) |

## FLOW DESIGN SKILLS — v3.0.0 (Added 2026-03-26)

Layer 2 — Engine Lifecycle (SK-471..SK-491). Urgent tier needed before Phase B.

| File | SK | What it does |
|------|----|-------------|
| planning/planning--session-scope-resolution-SKILL.md | SK-460 | Session scope gate; resolve ambiguous scope before session starts |
| planning/planning--qa-session-type-SKILL.md | SK-481 | QA session type governance; phase approval protocol |
| code-execution/code-execution--score-interpretation-SKILL.md | — | Phase B score output → action mapping |
| code-execution/code-execution--prompt-patch-authoring-SKILL.md | — | PromptPatch authoring protocol |
| code-execution/code-execution--test-failure-triage-SKILL.md | — | Test failure diagnosis before fix |
| code-execution/code-execution--generated-code-review-SKILL.md | — | After Phase B generates: review protocol |
| code-execution/code-execution--score-zero-investigation-SKILL.md | — | Score-0 found: root cause protocol |

## FLOW DESIGN SKILLS — v3.1.0 (Added 2026-03-26)

Layer 3 — Product Lifecycle (SK-492..SK-504). Layer 4 — Self-Awareness (SK-505..SK-509).

| File | SK | What it does |
|------|----|-------------|
| planning/planning--requirement-to-flow-SKILL.md | SK-492 | UML/spec → flow list, task types, dependency order |
| planning/planning--product-scope-validation-SKILL.md | SK-493 | Post-wave product intent validation |
| planning/planning--domain-event-design-SKILL.md | SK-494 | Event naming, payload, versioning, consumer limit (≤5) |
| planning/planning--cross-cutting-service-SKILL.md | SK-495 | Service appearance counting, 3 sharing patterns |
| planning/planning--service-boundary-design-SKILL.md | SK-496 | UML service → task type mapping principles |
| planning/planning--algorithm-as-service-SKILL.md | SK-497 | Ranking/matching/scoring as ALGORITHM archetype |
| code-execution/code-execution--event-driven-debugging-SKILL.md | SK-498 | Cross-service event trace, 3-step isolation protocol |
| qa/qa--user-journey-acceptance-testing-SKILL.md | SK-499 | E2E scenario from UML sequence diagrams |
| qa/qa--data-flow-integrity-SKILL.md | SK-500 | Output schema of service N vs input of service N+1 |
| code-execution/code-execution--multi-service-local-dev-SKILL.md | SK-501 | Minimum running set, seed data, event mock |
| planning/planning--feature-prioritization-SKILL.md | SK-502 | Business value × dependency multiplier × infra cost |
| planning/planning--temporal-behavior-design-SKILL.md | SK-503 | Time-delta state machines, phase transitions |
| planning/planning--shared-infrastructure-design-SKILL.md | SK-504 | Cache/ML/search across flows |
| self/self--capability-state-reader-SKILL.md | SK-505 | Query own capability manifest before extension session |
| self/self--gap-to-proposal-SKILL.md | SK-506 | CONVENTION→ADAPTATION→EXTENSION→NEW FLOW ladder |
| self/self--implementation-integrity-SKILL.md | SK-507 | Verify gap closed, guard installed, no new gaps |
| self/self--training-data-gap-audit-SKILL.md | SK-508 | Remediate triples from gap window |
| self/self--extension-session-type-SKILL.md | SK-509 | SELF-EXTENSION formal session type governance |

**Next available SK: SK-510**

---

## XIIGen Universal Skills Overlay

These skills supplement the existing XIIGen master index for process, safety, review,
verification, debugging, and documentation guidance. They do not replace active XIIGen
architecture, source contracts, or local skill routing.

| Skill | Category | Purpose | Path | Status |
|---|---|---|---|---|
| Planning Session Startup | Planning | Start XIIGen work with scope, authority, evidence, and output expectations aligned. | `.claude/skills/universal/planning-session-startup/SKILL.md` | active |
| Phase Planning | Planning | Break a goal into bounded phases with deliverables, gates, and handoff evidence. | `.claude/skills/universal/phase-planning/SKILL.md` | active |
| Plan Review | Planning | Review a proposed plan for correctness, scope fit, risks, and verifiable completion. | `.claude/skills/universal/plan-review/SKILL.md` | active |
| Plan Self Validation | Planning | Force the author of a plan to test it against requirements before presenting or executing it. | `.claude/skills/universal/plan-self-validation/SKILL.md` | active |
| Authority Requirement Binding | Governance | Bind every action to explicit user, system, repository, or project authority. | `.claude/skills/universal/authority-requirement-binding/SKILL.md` | active |
| Coverage Completeness Gate | Quality Gate | Ensure all requested items, surfaces, and edge obligations are covered before completion. | `.claude/skills/universal/coverage-completeness-gate/SKILL.md` | active |
| Output Readability Gate | Quality Gate | Make final outputs concise, navigable, and useful to the next human or agent. | `.claude/skills/universal/output-readability-gate/SKILL.md` | active |
| Goal Delivery Completeness | Quality Gate | Confirm the delivered result satisfies the actual user goal, not only the easiest visible subset. | `.claude/skills/universal/goal-delivery-completeness/SKILL.md` | active |
| Verification Before Completion | Verification | Require fresh evidence before any completion claim. | `.claude/skills/universal/verification-before-completion/SKILL.md` | active |
| Session Output Contract | Session Output | Define what the final response and handoff must contain. | `.claude/skills/universal/session-output-contract/SKILL.md` | active |
| Agent Output Format | Session Output | Standardize agent-authored reports so they are clear, actionable, and easy to audit. | `.claude/skills/universal/agent-output-format/SKILL.md` | active |
| Claim Verification | Verification | Make every factual claim traceable to evidence. | `.claude/skills/universal/claim-verification/SKILL.md` | active |
| Reconnaissance Gate | Investigation | Inspect the current state before planning edits or making review judgments. | `.claude/skills/universal/reconnaissance-gate/SKILL.md` | active |
| Session Execution Log | Session Output | Keep a compact trace of decisions, actions, and evidence during longer work. | `.claude/skills/universal/session-execution-log/SKILL.md` | active |
| Multi Reviewer Design | Review | Use distinct review lenses to evaluate plans, docs, or implementation before delivery. | `.claude/skills/universal/multi-reviewer-design/SKILL.md` | active |
| Specificity Calibration | Review | Set the right level of detail for instructions, plans, checks, and reports. | `.claude/skills/universal/specificity-calibration/SKILL.md` | active |
| Implementation Integrity | Implementation | Ensure implementation work is real, scoped, convention-aligned, and not cosmetic. | `.claude/skills/universal/implementation-integrity/SKILL.md` | active |
| Test Integrity | Verification | Keep tests behavior-focused, honest, and resistant to false confidence. | `.claude/skills/universal/test-integrity/SKILL.md` | active |
| Documentation Sync | Documentation | Keep docs, indexes, and guidance aligned with actual delivered behavior and conventions. | `.claude/skills/universal/documentation-sync/SKILL.md` | active |
| Dev Safety | Safety | Protect the repository, user work, secrets, and concurrent-agent boundaries during development. | `.claude/skills/universal/dev-safety/SKILL.md` | active |
| Root Cause Tracing | Debugging | Trace a symptom backward through evidence until the real cause is identified. | `.claude/skills/universal/root-cause-tracing/SKILL.md` | active |
| Systematic Debugging | Debugging | Debug through reproduction, evidence, hypothesis, fix, and verification. | `.claude/skills/universal/systematic-debugging/SKILL.md` | active |
| Code Examination | Investigation | Read code deeply enough to understand behavior before changing or reviewing it. | `.claude/skills/universal/code-examination/SKILL.md` | active |
| Work Scope Inventory | Governance | Make in-scope and out-of-scope work explicit before editing or reviewing. | `.claude/skills/universal/work-scope-inventory/SKILL.md` | active |
