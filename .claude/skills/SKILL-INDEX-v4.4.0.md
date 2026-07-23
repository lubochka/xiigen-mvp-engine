# XIIGEN SKILLS — MASTER INDEX
## Date: 2026-04-24 | v4.4.0 | 128 skills + 1 protocol | Single source of truth
## Naming: {human-name}-SKILL.md — no more SK-XXX in filenames
##   flow-portability-test-protocol — SK-553 registered (new v4.3.0)
##     Loadable wrapper for FLOW-PORTABILITY-TEST-PROTOCOL-v1.2.md.
##     Sessions citing the protocol can now load it as a skill.
##     Three layers: Layer 1 (unit), Layer 2 (Playwright), Layer 3 (SK-549).
##     MOBILE → TENANT-READY certification with STATE.json portabilityTest record.
##     Closes G-12.
##
##   CODE-REVIEW-PROTOCOL bumped to v2.0:
##     FC-7c: detection before scope claim (N flows claimed = N flows detected)
##     FC-7d: new rows trigger arbiter re-run (FLOW-40..48 gap closed)
##     Closes G-05, G-07, G-11.
##
##   FLOW-DOCUMENT-AUTHORING-GUIDE bumped to v1.18:
##     Rule 37: H-29 cross-flow event contract extension protocol.
##     Four required elements: optional field, FREEDOM key gate, validated format,
##     consumer update declaration. Closes G-17.
##
##   Total skills: 128 (+1 SK-553); Next available SK: SK-554
##
## What changed in v4.3.0 (earlier in this session):
##   8 code execution skill version bumps — portability + behavioral assertion fixes
##   Closes: G-29..G-34 + G-35b + G-38 from gap-to-guidance mapping R3
##
##   dna-compliance-guard 1.0 → 1.1.0 (MANDATORY):
##     5 portability checks P-1..P-5 added alongside 9 DNA rules:
##     P-1 no ClsService import (GAP-01), P-2 @connectionType FLOW_SCOPED (GAP-16a),
##     P-3 FREEDOM keys flow-scoped prefix (GAP-09), P-4 no local interface clones (GAP-02),
##     P-5 requiredCoInstalls declared (GAP-10). Priority RECOMMENDED → MANDATORY.
##     Portability gate exits 1 on failure — phase cannot close.
##
##   generated-code-review — → 1.1.0 (HIGH):
##     Layer 2 DNA-5 check fixed: was grep scope_id (misses GAP-01), now greps
##     ClsService import — the actual violation pattern.
##     Layer 4 added: behavioral assertion gate (D2-F1) — stub tests rejected
##     before DPO capture; three required assertions per service.
##
##   test-integrity — → 2.1.0 (MANDATORY):
##     Rule 6 added: behavioral assertion gate (FM-6). Stub count = 0 required.
##     Each service needs ≥1 domain-outcome assertion + ≥1 tenant isolation assertion.
##     Concurrent tenant isolation test required for any service with Promise.all().
##
##   self-verification 1.0 → 1.1.0:
##     PORTABILITY_REMEDIATION added as 5th change category in Rule 2.
##     Test requirement: L1 + V9 portability gate + Layer 1 portability protocol
##     + concurrent isolation test. NOT classified as BACKWARD_COMPAT.
##
##   retroactive-development 1.0 → 1.1.0:
##     Portability fix propagation table added (P-1..P-5 per row):
##     service file fix + genesis prompt fix + 8-step verification protocol.
##     Portability fixes do not regenerate — they annotate + verify.
##
##   flow-implementation-guide 1.0 → 1.2.0 (SUPREME):
##     Step 3.b added: @connectionType FLOW_SCOPED annotation on all service files.
##     V9 portability gate added: 5 bash checks, portabilityStatus in STATE.json.
##     V9 MOBILE = distributable; PARTIAL_GAP = runs in monorepo only.
##     V9 does NOT block ACTIVE promotion.
##
##   phase-preflight 1.0 → 1.1.0 (MANDATORY):
##     Default check #5: portability prerequisites — scans existing services
##     for ClsService before new code is written; Pattern 4 portability resumption.
##
##   data-connection-classification 1.0 → 2.0.0 (SUPREME):
##     Extended from ES documents to TypeScript service files.
##     @connectionType FLOW_SCOPED JSDoc annotation standard defined.
##     @portability MOBILE only after dna-compliance-guard P-1..P-4 pass.
##     New checklist section for TypeScript service files.
##
##   flow-design-check-catalog — portability addendum added:
##     P-001..P-005 checks with PORTABILITY_BLOCK severity.
##     PORTABILITY_BLOCK: ACTIVE but not MOBILE — does not block monorepo;
##     blocks distribution and PROOF-1..PROOF-5.
##
##   Guidance library (4 files updated):
##     GUIDE-B17 v6.2: Phase G Mobility Gate (C34) after Phase F — mandatory
##     GUIDE-B21 v3.1: portability constraints in FLOW-SPECIFIC CONSTRAINTS template
##     GUIDE-B04 v3.1: Q5 redefined — actual portability conditions, not scope_isolation
##     GUIDE-B46 v3.1: Step 0d AdminCrudPanel/PlatformOpsPage coupling check added
##     prompt-to-claude v3.1: Rule 7 (Phase G) + FP-6 failure pattern added
##
##   Total skills: 127 (unchanged — version bumps only)
##   Next available SK: SK-553 (unchanged)
##
## What changed in v4.2.0:
##   SK-529 reconnaissance-gate bumped to v2.5.0
##     Gate 3 extended: three paths — Path A reword, Path B read file (Claude Code),
##     Path C HANDOFF block (web session cannot produce IMPLEMENTATION evidence:
##     produce exact command + confirm/deny signals, claim PENDING not rejected)
##     T0-4.5 BEHAVIORAL-CORRECTIONS-REGISTRY.md added to Tier-0 search list
##     Tier-0 total: 9 file reads (was 8)
##   SK-552 per-entity-examination-protocol bumped to v1.1.0
##     §9 Examination Freeze Gate added: three conditions for FROZEN_COMPLETE:
##     Condition 1 all-N completeness, Condition 2 convergence (no new finding
##     classes in second half of examination), Condition 3 IMPLEMENTATION evidence
##     per hypothesis (or Gate 3 HANDOFF → FROZEN_PENDING_VERIFICATION)
##   Reference documents updated:
##     HOW-TO-USE-SKILLS → v5.1 (ROUND CONTRACT + MANDATORY STOP FORMAT + Q4 FORMAT RULE)
##     CODE-REVIEW-PROTOCOL → v1.9 (FC-7b: DNA compliance for REMEDIATION plans)
##     FLOW-DOCUMENT-AUTHORING-GUIDE → v1.17 (Rule 36: skill prerequisites in flow docs)
##     SESSION-START-PROMPT → v5.1 (behavioral contract, visible STOP format)
##     BEHAVIORAL-CORRECTIONS-REGISTRY.md → v1.0 (NEW: 10 entries BC-001..BC-010)
##   Next available SK: SK-553 (unchanged)
## What changed in v4.1.0:
##   Layer 14 — Multi-entity examination protocol (SK-552)
##     SK-552 per-entity-examination-protocol — systematic N-instance examination before
##       synthesis; mandatory hypothesis pre-declaration; fixed per-instance step sequence;
##       structured result records; running tally every 10 instances; synthesis in separate
##       session only; closes the gap where sessions synthesize from 3-5 instances and
##       receive TRAJECTORY corrections about premature conclusions
##   SK-529 version references updated to v2.4.0
##     v2.4.0 adds mandatory hypothesis declaration gate (Gate 5) and §8.1
##     (when hypotheses must precede examination for N ≥ 5 instances)
##   DESIGN-ARCHITECT-SESSION-GUIDE references updated to v2.2
##     v2.0: Q-MINUS-2 goal-type classification (REMEDIATION/GREENFIELD/HYBRID)
##     v2.1: perspective artifact blocks (IMPLEMENTATION/PRODUCT INTENT/PRINCIPLES)
##     v2.2: correction severity classification (LOCAL/TRAJECTORY/SESSION-RESTART)
##   Next available SK: SK-553
## What changed in v4.0.0:
##   Layer 8 — Governance discipline (SK-529..SK-539) registered
##   Layer 9 — Response construction protocol registered
##   Layer 10 — Screen examination + design context (SK-540..SK-542) registered
##   Header updated: 86 skills → 117 skills + 1 protocol
##   Next available: SK-543

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
| **flow-lifecycle** | **1.1.0** | Lifecycle transitions + **portabilityStatus / authStatus / tenantCertTier** CAS writes (Steps 6a/6b/6c). Guard 14 enforcement at TIER_C. | Phase A start + Phase E end + Phase G/H/I |
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
| **test-integrity** | **2.2.0-GR001** | 6 rules + **Rule 7 (401/403 auth tests per controller)** + **Rule 8 (R6 cross-tenant JWT isolation)** + **GR-001 Zero Tech Debt Golden Rule**. Stub count = 0; domain-outcome assertions required |
| **self-verification** | **1.2.0** | 6 post-fix verification rules + PORTABILITY_REMEDIATION + **AUTH_PROTECTION_ADDITION** (6th category) — 8-step auth verification checklist |
| **mental-debug** | 2.0 | 4 moves + 13 pattern rules |
| **code-examination** | 1.0 | How to read existing code |
| **debug-session** | 1.0 | Structured debugging protocol |
| **context-overflow** | 1.0 | Handle context window limits |
| **bug-to-tests** | 1.0 | Bug reports → regression tests |
| **dna-compliance-guard** | **1.2.0 MANDATORY** | 9 DNA patterns + P-1..P-5 portability + **A-1..A-3 auth checks** (@UseGuards, @Roles, bypass-paths) + **D-HIST-001 SDK import check**. AUTH GATE verdict. |
| **docker-local-testing** | 1.0 | Fabric coverage, provider swap, tenant isolation |
| **documentation-sync** | 2.0 | Keep docs in sync with code |
| **engine-qa** | 1.0 | Engine quality + known violations |
| **flow-implementation-guide** | **1.3.0** | 7-step protocol + V9 portability + **V10 authStatus gate** (AUTH_READY/AUTH_DEFERRED) + **V11 tenantCertTier gate** (NONE→TIER_D) + **Phase H** (auth A-1..A-3 + Rule 7) + **Phase I** (tenant cert + Guard 14 + TIER-C checklist) |
| **flow-prerequisites** | **1.1.0** | Check prerequisites before starting + **TIER 1 P-5 auth infrastructure check** (4-component score, NON-BLOCKING); TIER 2/3 renumbered P-6..P-11 |
| **retroactive-development** | **1.2.0** | Engine fix propagation + portability fix table + **auth fix propagation table** (A-1..A-3 + D-HIST-001 rows: 8-step auth protocol + cross-fleet scope scans) |
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
| **data-connection-classification** | **2.0.0** | Classify ES documents + **TypeScript service files** (@connectionType FLOW_SCOPED JSDoc annotation standard; @portability MOBILE after P-1..P-4) |

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

## GAPS CLOSED IN v4.4.0 (2026-04-24)

| Gap | Closed by |
|-----|-----------|
| G-AUTH-01: No skill requires @UseGuards on controllers | **dna-compliance-guard** v1.2.0 A-1 + **flow-implementation-guide** v1.3.0 Phase H |
| G-AUTH-02: No skill requires @Roles/@Public() on routes | **dna-compliance-guard** v1.2.0 A-2 + Phase H |
| G-AUTH-03: @Public() routes not validated against bypass-paths.registry.ts | **dna-compliance-guard** v1.2.0 A-3 + Phase H Step H.4 |
| G-AUTH-04: No 401/403 auth tests required | **test-integrity** v2.2.0-GR001 Rule 7 + Phase H Step H.5 |
| G-AUTH-05: No R6 cross-tenant JWT isolation test required | **test-integrity** v2.2.0-GR001 Rule 8 |
| G-AUTH-06: Auth violations not propagated retroactively | **retroactive-development** v1.2.0 auth fix propagation table |
| G-AUTH-07: Auth changes not tracked as verification category | **self-verification** v1.2.0 AUTH_PROTECTION_ADDITION |
| G-AUTH-08: Auth infrastructure not checked in phase preflight | **phase-preflight** v1.2.0 default check #6 |
| G-AUTH-09: Generated code review misses auth declarations | **generated-code-review** v1.2.0 Layer 5 |
| G-AUTH-10: No V10 authStatus gate in implementation plan | **flow-implementation-guide** v1.3.0 V10 |
| G-AUTH-11: No V11 tenantCertTier gate in implementation plan | **flow-implementation-guide** v1.3.0 V11 |
| G-AUTH-12: Lifecycle index never writes auth/cert status | **flow-lifecycle** v1.1.0 Steps 6a/6b/6c |
| G-NDJSON-01: No skill defines minimum NDJSON arbiter types | **SK-554** arbiter-ndjson-requirements v1.0.0 (NEW) |
| G-NDJSON-02: scope_isolation=0 not a TEACH-QA trigger | **GUIDE-B19** v2 UC-7 + **SK-554** |
| G-NDJSON-03: NDJSON type coverage not in Phase A gate | **flow-implementation-guide** v1.3.0 Phase A gate |
| G-NDJSON-04: NDJSON coverage not in QA coverage dimensions | **GUIDE-B04** v3.2 Q7/Q8 |

---

## GAPS CLOSED IN v4.3.0 (2026-04-23)

| Gap | Closed by |
|-----|-----------|
| dna-compliance-guard had no portability checks; ClsService/annotations/FREEDOM keys silently passed | **dna-compliance-guard** v1.1.0 P-1..P-5 + MANDATORY priority |
| generated-code-review DNA-5 checked scope_id (wrong) — missed ClsService import (actual GAP-01) | **generated-code-review** v1.1.0 Layer 2 DNA-5 fix |
| No behavioral assertion requirement — stub tests entered DPO corpus as "valid" | **generated-code-review** v1.1.0 Layer 4 + **test-integrity** v2.1.0 Rule 6 |
| self-verification classified ClsService removal as BACKWARD_COMPAT — under-tested portability fixes | **self-verification** v1.1.0 PORTABILITY_REMEDIATION category |
| retroactive-development had no portability fix guidance — developers had no protocol for GAP-01..GAP-10 | **retroactive-development** v1.1.0 portability fix propagation table |
| flow-implementation-guide had no portability step — V1-V8 could all pass with unportable code | **flow-implementation-guide** v1.2.0 Step 3.b + V9 |
| phase-preflight default checks never scanned existing services for ClsService | **phase-preflight** v1.1.0 default check #5 |
| data-connection-classification applied to ES documents only — TypeScript service files unclassified | **data-connection-classification** v2.0.0 TypeScript annotation standard |
| flow-design-check-catalog had no portability checks — P-001..P-005 never fired in CI/CD | **flow-design-check-catalog** portability addendum P-001..P-005 PORTABILITY_BLOCK |
| GUIDE-B17 had no Phase G — all generated implementation plans produce ACTIVE-not-MOBILE flows | **GUIDE-B17** v6.2 Phase G Mobility Gate (C34 amendment) |
| GUIDE-B04 Q5 measured AI pipeline isolation (scope_isolation arbiter), not distribution mobility | **GUIDE-B04** v3.1 Q5 redefined with P-1..P-5 portability conditions |
| GUIDE-B21 FLOW-SPECIFIC CONSTRAINTS had no portability constraints | **GUIDE-B21** v3.1 portability block (P-1..P-5) in FLOW-SPECIFIC CONSTRAINTS template |
| GUIDE-B46 had no AdminCrudPanel/PlatformOpsPage coupling check | **GUIDE-B46** v3.1 Step 0d coupling check |
| prompt-to-claude.md had no portability rule — 6 rules all UI-only | **prompt-to-claude** v3.1 Rule 7 Phase G + FP-6 failure pattern |

---

## GAPS CLOSED IN v4.2.0

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
| code-execution/code-execution--phase-preflight-SKILL.md | SK-457 | **v1.2.0** — check #6 auth infrastructure (4-component score) + Pattern 5 auth resumption scan |

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
| code-execution/code-execution--generated-code-review-SKILL.md | — | **v1.2.0** — Layer 5 auth declaration check; D-HIST-001 in Layer 2; AUTH_DEFERRED exception for DPO capture |
| code-execution/code-execution--score-zero-investigation-SKILL.md | — | Score-0 found: root cause protocol |
| code-execution/code-execution--flow-portability-test-protocol-SKILL.md | SK-553 | **v1.0.0** — Loadable wrapper for FLOW-PORTABILITY-TEST-PROTOCOL; MOBILE → TENANT-READY certification; Layer 1 (unit) + Layer 2 (Playwright) + Layer 3 (SK-549 visual) |

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

**Next available SK after v3.1.0: SK-510**

## FLOW DESIGN SKILLS — v3.2.0 (Added 2026-03-26)

Layer 5 — Dynamic Decision Architecture (SK-510..SK-519).
Layer 6 — AI-driven topology planning (SK-520..SK-525).
Layer 6x — Scope isolation (SK-526). Layer 7 — Pipeline position (SK-528).

| File | SK | What it does |
|------|----|-------------|
| planning/planning--four-tier-decision-classification-SKILL.md | SK-510 | Four-tier decision classification; any component with decision points |
| planning/planning--graph-entity-schema-design-SKILL.md | SK-511 | Graph entity schema design; after SK-510 classifies as GRAPH RAG |
| planning/planning--confidence-lifecycle-design-SKILL.md | SK-512 | Confidence lifecycle design; after SK-511 entity design |
| planning/planning--ai-decision-pipeline-design-SKILL.md | SK-513 | AI decision pipeline design; after SK-510 classifies as AI PIPELINE |
| planning/planning--planning-dpo-authoring-SKILL.md | SK-514 | Planning DPO authoring; after SK-513 pipeline design |
| planning/planning--learning-loop-closure-SKILL.md | SK-515 | Learning loop closure; after SK-512 + SK-514 |
| planning/planning--static-to-graph-topology-refactoring-SKILL.md | SK-516 | Static-to-graph topology refactoring |
| planning/planning--graph-rag-fabric-integration-SKILL.md | SK-517 | Graph RAG fabric integration; any service querying the decision graph |
| planning/planning--top-manager-extension-protocol-SKILL.md | SK-518 | Top Manager extension protocol; novel case or Top Manager proposal |
| planning/planning--skill-graph-sync-SKILL.md | SK-519 | Skill-graph sync; skill version bump or graph drift detected |
| planning/planning--intent-to-plan-SKILL.md | SK-520 | Intent-to-plan; FLOW-PLAN session type, step 1 |
| planning/planning--depth-decision-SKILL.md | SK-521 | Depth decision; before any plan depth commitment |
| planning/planning--ai-context-package-authoring-SKILL.md | SK-522 | AI context package authoring; FLOW-PLAN session type, step 2 |
| planning/planning--principles-arbiter-SKILL.md | SK-523 | Principles arbiter integration; any flow with principles requirements |
| planning/planning--cycle-visibility-SKILL.md | SK-524 | Cycle visibility; render cycle state for tenant visibility |
| planning/planning--meta-arbiter-SKILL.md | SK-525 | Meta-arbiter; arbitration of arbiters |
| planning/planning--scope-isolation-arbiter-SKILL.md | SK-526 | Scope isolation arbiter; FC-32 enforcement; every arbiter panel |
| planning/planning--pipeline-position-check-SKILL.md | SK-528 | Pipeline position check; Q0 enforcement; GENERATION/PLANNING/MATERIALIZATION |

**Next available SK after v3.2.0: SK-529**

---

## GOVERNANCE SKILLS — v4.0.0 (Added 2026-04-20)

### Layer 8 — Governance discipline (SK-529..SK-539)

*Load at session start per HOW-TO-USE-SKILLS v5.1 load order.*

| File | SK | Load order | Version | What it does |
|------|----|------------|---------|-------------|
| planning/planning--reconnaissance-gate-SKILL.md | SK-529 | 0 | **v2.5.0** | Evidence before synthesis; STATE.recon; XIIGen Tier-0 search list (9 files + 2 greps, T0-4.5 BEHAVIORAL-CORRECTIONS-REGISTRY added); thresholds by session type; evidence-layer tags (DESIGN_DOC/IMPLEMENTATION/TEST/RECONCILIATION) on every excerpt (v2.2.0); domain universe declaration + coverage fraction (v2.3.0); mandatory hypothesis pre-declaration for N ≥ 5 multi-entity sessions — Gate 5 + §8.1 (v2.4.0); Gate 3 three-path routing: Path A reword / Path B read file (Claude Code) / Path C HANDOFF block for web sessions — claim PENDING not rejected (v2.5.0) |
| planning/planning--session-mode-declaration-SKILL.md | SK-535 | 1 | v1.0.0 | 5 modes (ARCHITECT/PLANNER/REVIEWER/EXECUTOR/MATERIALIZATION); drift detection; scope-out reminder |
| planning/planning--goal-context-persistence-SKILL.md | SK-536 | 2 | v1.0.0 | Verbatim goal anchor; STATE.goalContext; two-layer Goal Reminder Block (session + product goal) at every STOP |
| planning/planning--claim-as-hypothesis-SKILL.md | SK-531 | 3 | — | User claims captured as STATE.claims PENDING_VERIFICATION; must be VERIFIED/DISCONFIRMED/PARTIAL/DEFERRED before planning |
| planning/planning--design-artifact-completeness-SKILL.md | SK-537 | 3 | — | Referenced artifacts Checks 1-2 (exist + populated); FC-15 |
| planning/planning--materialization-session-type-SKILL.md | SK-532 | 4 | — | MATERIALIZATION session constraint: 1-5 tasks hard upper bound; abbreviated arbiter panel |
| planning/planning--mvp-round-trip-verification-SKILL.md | SK-533 | 4 | — | Tenant-observable round-trip nomination; STATE.roundTrip.thisSessionAdvances mandatory |
| planning/planning--specificity-calibration-SKILL.md | SK-530 | 5 | — | Specificity thresholds: PLAN-REVIEW 20, ARCHITECT 11, MATERIALIZATION 20 |
| planning/planning--goal-delivery-completeness-SKILL.md | SK-534 | 5 | — | FIRST arbiter in every panel; FC-14; goal elements → plan turns mapping |
| planning/planning--architect-behavior-classifier-SKILL.md | SK-538 | 6 | v1.2.0 | 30-habit catalog (7 positive, 4 neutral, 19 negative); three-step doc-first loop; FC-16 |
| planning/planning--ui-ux-compliance-SKILL.md | SK-539 | 5.5 | v1.1.0 | 31 UX checks (UX-01..UX-30); Section 0 pre-design gate; 7 grammar types (G1-G7); 52-role taxonomy; 12 visibility scopes; 7 screen templates T-1..T-7; MARKET-REFERENCE-CATALOG reference; FC-18 |

### Layer 9 — Response construction (1 protocol)

| File | Load order | Version | What it does |
|------|------------|---------|-------------|
| XIIGEN-RESPONSE-CONSTRUCTION-PROTOCOL-v1.md | 7 | v1.0 | Seven-step protocol (decompose → absorb → correction-thread → draft → source-layer → recheck → send); light + full modes; FC-17; maps step-by-step to SK-538 negative habits |

### Layer 10 — Screen examination + design context (SK-540..SK-542)

*Load at session start (5.3/5.4) and at Phase 7 Step 5 (SK-541).*

| File | SK | Load order | Version | What it does |
|------|----|------------|---------|-------------|
| flow-ui-examination-protocol-SKILL.md | SK-542 | 5.3 | v1.0.0 | Session orchestrator for screen examination/repair; loads REPAIR-GUIDANCE + SPEC-LOCATION-MAP + MARKET-REFERENCE-CATALOG + business-flows-registry; checks prior examination record; routes to SK-540 (first-time design) or SK-541 (audit); one-finding-per-run discipline; CFI-05 Page rewrite template |
| planning/planning--product-design-context-SKILL.md | SK-540 | 5.4 | v1.0.0 | Pre-design gate; checks examination record first (Step 1b for 38 flows); 6-file spec read (Step 1a) when absent; domain exploration (Step 2); produces docs/design-context/{slug}/.impeccable.md with WHO/VERB/GRAMMAR/FEEL declared; once per flow |
| planning/planning--screen-craft-audit-SKILL.md | SK-541 | Phase 7 Step 5 | v1.0.0 | Four-layer PNG audit: L1 accessibility (ui-ux-pro-max P1/P2), L2 AI slop (10-tell checklist), L3 Nielsen H1/H2/H8/H9 (0-4 scoring), L4 grammar (UX-30 enforcement); REPAIR-GUIDANCE Parts 2/3 as authoritative protocol; SK-541 AUDIT output → FC-18 Audit Trail |

**Next available SK: SK-543**

---

## Layer 11 — UI/UX Fleet Discipline (SK-543..SK-547)

| File | SK | Load order | Version | What it does |
|------|----|------------|---------|-------------|
| planning/planning--work-scope-inventory-SKILL.md | SK-543 | 0 | v1.0.0 | Denominator before any UI/UX work; STATE.scope six-count protocol (total_flows, examined, blocked, not_yet_examined, needs_purpose_built_ui, in_progress); prevents fleet claims without established scope |
| planning/planning--improvement-measurement-protocol-SKILL.md | SK-544 | 5 | v1.0.0 | Layer 2 observable PNG delta required before any improvement claim; distinguishes grep-score improvement (automatable) from visual quality improvement (requires PNG read); proxy check before STOP |
| planning/planning--ui-fleet-completion-criteria-SKILL.md | SK-545 | 5 | v1.0.0 | Three-criterion minimum per flow; 10-batch structure; N_examined/(48-N_blocked) as the only valid fleet progress metric; prevents partial-batch completion claims |
| planning/planning--coverage-completeness-gate-SKILL.md | SK-546 | 5 | v1.0.0 | Claim scope must match evidence scope; fires at Step 6 of Response Construction Protocol; downgrade protocol when coverage insufficient |
| planning/planning--output-skepticism-SKILL.md | SK-547 | 5 | v1.0.0 | Three skeptic questions (refutation / scope / proxy) before any STOP; planning equivalent of SK-429; catches -63.6%-from-5-flows class of claims |

## Layer 12 — Plan Integrity (SK-548)

| File | SK | Load order | Version | What it does |
|------|----|------------|---------|-------------|
| planning/planning--plan-self-validation-SKILL.md | SK-548 | 0 | v1.0.0 | Phase 0 mandatory in every plan before Phase 1 executes; runs SK-410 focused battery: FC-3 phantom skills, FC-5 missing registrations, SK-440 blast radius, execution order inversions; Phase 1 blocked until Phase 0 passes |

## Layer 13 — Visual Examination (SK-549..SK-551)

| File | SK | Load order | Version | What it does |
|------|----|------------|---------|-------------|
| planning/planning--per-image-validation-SKILL.md | SK-549 | 5.6 | v1.0.0 | 7-axis validation per PNG: Axis A shell correctness (kiosk/module/admin), Axis B role branching (right content for this role), Axis C language/RTL, Axis D business-logic phase + state (mandatory for NEEDS_PURPOSE_BUILT_UI — validates domain fields match spec), Axis E human-friendliness, Axis F 5-layer UX audit (extends SK-541 with shell/role/language/state axes), Axis G follow-ups; output → ROUND-2-COVERAGE-MATRIX.json |
| planning/planning--visual-examination-round-SKILL.md | SK-550 | 5.7 | v1.0.0 | Multi-round fleet visual improvement protocol: Phase 1 baseline (no claims before baseline), Phase 2 systemic fixes, Phase 3 per-cell, Phase 4 rescore, Phase 5 convergence; dual convergence criterion: score-delta < 1% AND primary cells examined = 100% AND NEEDS_PURPOSE_BUILT_UI Axis D verified; per-round deliverables; closes V-R7 failure |
| planning/planning--coverage-matrix-SKILL.md | SK-551 | 5.8 | v1.0.0 | Governs ROUND-2-COVERAGE-MATRIX.json at cell granularity (flow × screen × role × language × state); Python queries for NOT_YET_EXAMINED, BLOCK, Axis D; three convergence conditions; is_converged() function; coverage summary required at every STOP claiming visual progress |

## Layer 14 — Multi-entity Examination Protocol (SK-552) *(NEW v4.1.0)*

| File | SK | Load order | Version | What it does |
|------|----|------------|---------|-------------|
| planning/planning--per-entity-examination-protocol-SKILL.md | SK-552 | 5.9 | **v1.1.0** | Systematic examination of N ≥ 5 instances before synthesis; 7-step protocol: (1) declare universe + N, (2) declare hypotheses with Confirms-if/Refutes-if before instance 1, (3) define fixed per-instance step sequence (max 5 steps), (4) define result record format, (5) examine all N in sequence, (6) running tally every 10, (7) synthesis in separate session only; CONSISTENT/INCONSISTENT/PARTIAL/NOT_TESTABLE verdict vocabulary; OPEN_QUESTIONS pre-classified on SK-506 resolution ladder; strict examiner/synthesis-session separation; closes TRAJECTORY-correction class where sessions synthesize from 3–5 instances; §9 Examination Freeze Gate (v1.1.0): Condition 1 completeness / Condition 2 convergence (no new finding classes in second half) / Condition 3 IMPLEMENTATION evidence per hypothesis or Gate 3 HANDOFF; states: FROZEN_COMPLETE / FROZEN_PENDING_VERIFICATION |

**Next available SK: SK-554**

| Document | Where | What it provides |
|----------|-------|-----------------|
| XIIGEN-CODEBASE-ORIENTATION-MAP v1.3 | governance/ | Q-08..Q-26; UI/UX design intent authority hierarchy; question-class → file + command lookup; examination record as ground truth (Q-26) |
| planning--business-flows-registry.md | planning/ | All 48 flows → grammar type, spec paths, ROLE-ANALYSIS-BATCH file, exam record status, CFI notes; CFI-12 BLOCKED flags for FLOW-04/09/34; FLOW-29 reference implementation |
| docs/screen-examination/REPAIR-GUIDANCE.md | repo | 8-part screen examination + classification protocol (authoritative); Parts 2/3 called by SK-541 |
| docs/screen-examination/SPEC-LOCATION-MAP.md | repo | 6-file read order with exact paths per flow; F1..F6 map |
| docs/screen-examination/SPEC-LOCATION-INDEX.md | repo | Per-flow file existence inventory |
| docs/screen-examination/MARKET-REFERENCE-CATALOG.md | repo | Per-flow real-world platform refs; per-state rendering (empty/loading/populated/error/success) per grammar type |
| docs/screen-examination/PNG-INVENTORY.md | repo | Per-PNG verdict catalog (628 fleet + 109 role-coverage PNGs) |
| docs/screen-examination/{slug}-examination.md (×38) | repo | Per-flow examination records — ground truth for WHO/VERB/GRAMMAR (highest authority source) |

---

## LAYER SUMMARY — v4.3.0

```
Layer 1  — Engine internals (47 skills, SK-426..SK-470):               COMPLETE
           dna-compliance-guard **v1.1.0** — P-1..P-5 portability checks; MANDATORY ← NEW v4.3.0
           flow-implementation-guide **v1.2.0** — Step 3.b @connectionType; V9 portability gate ← NEW v4.3.0
           retroactive-development **v1.2.0** — portability + auth fix propagation table + D-HIST-001 ← NEW v4.3.0
           phase-preflight **v1.1.0** — default check #5 portability prereqs ← NEW v4.3.0
           generated-code-review **v1.2.0** — Layer 5 auth declaration + D-HIST-001 in Layer 2 + AUTH_DEFERRED DPO ← v5.3
           test-integrity **v2.2.0-GR001** — Rule 6 + Rule 7 (401/403) + Rule 8 (R6 cross-tenant) + GR-001 (D2-F1) ← NEW v4.3.0
           self-verification **v1.2.0** — PORTABILITY_REMEDIATION + AUTH_PROTECTION_ADDITION (6th category) ← NEW v4.3.0
Layer 2  — Engine lifecycle (21 skills, SK-471..SK-491):               COMPLETE
Layer 3  — Product lifecycle (13 skills, SK-492..SK-504):              COMPLETE
Layer 4  — Self-awareness (5 skills, SK-505..SK-509):                  COMPLETE
Layer 5  — Dynamic decision architecture (10 skills, SK-510..SK-519):  COMPLETE
Layer 6  — AI-driven topology planning (6 skills, SK-520..SK-525):     COMPLETE
Layer 6x — Scope isolation enforcement (1 skill, SK-526):              COMPLETE
Layer 7  — Pipeline position enforcement (1 skill, SK-528):            COMPLETE
Layer 8  — Governance discipline (11 skills, SK-529..SK-539):          COMPLETE
           SK-529 **v2.5.0** — Tier-0 XIIGen search list (9 files, T0-4.5 added);
                           evidence-layer tags; domain universe declaration;
                           mandatory hypothesis pre-declaration (Gate 5 + §8.1);
                           Gate 3 three-path routing: Path A reword / Path B read
                           file / Path C HANDOFF block for web sessions (v2.5.0)
           SK-539 v1.1.0 — 31 checks, Section 0 pre-design gate, G1-G7 grammar types
Layer 9  — Response construction (1 protocol, v1.0):                   COMPLETE
Layer 10 — Screen examination + design context (3 skills, SK-540..SK-542): COMPLETE
           SK-540 v1.0.0 — product design context + .impeccable.md
           SK-541 v1.0.0 — four-layer screen craft audit
           SK-542 v1.0.0 — flow UI examination protocol (session orchestrator)
Layer 11 — UI/UX Fleet Discipline (5 skills, SK-543..SK-547):          COMPLETE
           SK-543 v1.0.0 — work-scope-inventory: denominator before fleet work
           SK-544 v1.0.0 — improvement-measurement-protocol: observable PNG delta required
           SK-545 v1.0.0 — ui-fleet-completion-criteria: three-criterion minimum per flow
           SK-546 v1.0.0 — coverage-completeness-gate: claim scope = evidence scope
           SK-547 v1.0.0 — output-skepticism: refutation/scope/proxy before STOP
Layer 12 — Plan Integrity (1 skill, SK-548):                           COMPLETE
           SK-548 v1.0.0 — plan-self-validation: Phase 0 before Phase 1; SK-410 battery
Layer 13 — Visual Examination (3 skills, SK-549..SK-551):              COMPLETE
           SK-549 v1.0.0 — per-image-validation: 7-axis PNG protocol; Axis D mandatory
                           for NEEDS_PURPOSE_BUILT_UI flows; closes V-R7 gap
           SK-550 v1.0.0 — visual-examination-round: multi-round protocol; dual
                           convergence criterion (score-delta + primary-cells coverage)
           SK-551 v1.0.0 — coverage-matrix: cell-level tracking; three convergence
                           conditions; governs ROUND-2-COVERAGE-MATRIX.json
Layer 14 — Multi-entity Examination Protocol (1 skill, SK-552):        COMPLETE
           SK-552 **v1.1.0** — per-entity-examination-protocol: N ≥ 5 instance examination
                           before synthesis; hypotheses pre-declared; fixed step sequence;
                           result record format; examiner/synthesis-session separation;
                           closes TRAJECTORY-correction class from module-separation corpus;
                           §9 Examination Freeze Gate: FROZEN_COMPLETE (all 3 conditions)
                           or FROZEN_PENDING_VERIFICATION (Condition 3 pending Claude Code)

Reference documents (no SK):
  XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE **v2.2** — updated v4.1.0
    v2.0: Q-MINUS-2 goal-type classification (REMEDIATION/GREENFIELD/HYBRID)
    v2.1: perspective artifact blocks (IMPLEMENTATION/PRODUCT INTENT/PRINCIPLES)
    v2.2: correction severity classification (LOCAL/TRAJECTORY/SESSION-RESTART)
    Mistakes catalog: 1–31; Observability checklist updated
  CODE-REVIEW-PROTOCOL **v2.0** — updated v4.3.0 ← BUMPED
    FC-7c: detection before scope claim (claimed N = detected N)
    FC-7d: new rows trigger arbiter re-run (FLOW-40..48 gap)
  FLOW-DOCUMENT-AUTHORING-GUIDE **v1.18** — updated v4.3.0 ← BUMPED
    Rule 37: H-29 cross-flow event contract extension protocol
  SK-553 flow-portability-test-protocol **v1.1.0** — loadable wrapper; MOBILE → TENANT-READY;
    three-layer certification; Phase 0 auth pre-flight; D-HIST-001 in Layer 1;
    full per-role cell matrix; R6 cross-tenant JWT; Guard 14 enforcement
  **NEW SK-554** arbiter-ndjson-requirements **v1.0.0** ← v4.4.0
    NDJSON minimum type matrix (9 conditions: scope_isolation mandatory; security for
    PII/auth flows; domain for business-logic); 6 detection commands;
    UC-7 trigger for TEACH-QA R1-FINAL; Phase A gate scope_isolation count check
  XIIGEN-SESSION-START-PROMPT **v5.1** — updated v4.2.0
    Behavioral contract every response; visible STOP format; Q4 binary format
  CODE-REVIEW-PROTOCOL **v1.9** — updated v4.2.0
    FC-7b: DNA compliance for REMEDIATION plans
  FLOW-DOCUMENT-AUTHORING-GUIDE **v1.17** — updated v4.2.0
    Rule 36: skill references in flow documents require Prerequisites sections
  docs/sessions/BEHAVIORAL-CORRECTIONS-REGISTRY.md **v1.0** — NEW v4.2.0
    10 behavioral corrections BC-001..BC-010; Tier-0 T0-4.5 position
  GUIDE-B17 **v6.3** — updated v4.4.0 ← BUMPED
    Phase H (auth A-1..A-3 + Rule 7); Phase I (tenant cert + Guard 14 + TIER-C); SK-554 Phase A gate
  GUIDE-B21 **v3.2** — updated v4.4.0 ← BUMPED
    Auth constraints block (Option A/B/C); flow_module_name FREEDOM key (CF-FORK-01)
  GUIDE-B04 **v3.2** — updated v4.4.0 ← BUMPED
    Q7 auth_protection_declared; Q8 tenant_cert_tier; TBD on completed flow = BLOCKED
  GUIDE-B02 **v6.2** — updated v4.4.0 ← BUMPED
    authStatus/authGaps/tenantCertTier/portabilityTest/protocolStatus fields; Phase G/H/I labels
  GUIDE-B03 **v2.1** — updated v4.4.0 ← BUMPED
    authConstraints block (Option A/B/C); tenantCertTarget; Step 2b authoring instructions
  GUIDE-B19 **v2** — updated v4.4.0 ← BUMPED
    UC-7 NDJSON type coverage (SK-554); CRITICAL trigger scope_isolation=0; GAP TYPE template
  GUIDE-B37 **v2** — updated v4.4.0 ← BUMPED
    Protocol status block in gate results; ENGINE PROGRESS portability/auth/cert rows
  plan-review-skill **v2.1.0 + GR001** — updated v4.4.0 ← BUMPED
    FC-19 (auth declaration); FC-20 (NDJSON types); FC-21 (definition of done + Guard 14)
  GUIDE-B46 **v3.1** — updated v4.3.0 ← BUMPED
    Step 0d: AdminCrudPanel/PlatformOpsPage coupling check
  prompt-to-claude **v3.2** — updated v4.4.0 ← BUMPED
    Rule 8: Phase H mandatory; Rule 9: Phase I mandatory; FP-7/FP-8 auth/cert failure patterns
  data-connection-classification **v2.0.0** — updated v4.3.0 ← BUMPED
    TypeScript service file classification; @connectionType JSDoc standard
  XIIGEN-CODEBASE-ORIENTATION-MAP v1.3 — unchanged
  planning--business-flows-registry.md — unchanged

Total: 128 skills + 1 protocol
Next available SK: SK-555
Next available FC: FC-22
Pending: SK-527 (module-isolation-arbiter, FC-33 — tracked separately)
```

```
Layer 1  — Engine internals (47 skills, SK-426..SK-470):               COMPLETE
Layer 2  — Engine lifecycle (21 skills, SK-471..SK-491):               COMPLETE
Layer 3  — Product lifecycle (13 skills, SK-492..SK-504):              COMPLETE
Layer 4  — Self-awareness (5 skills, SK-505..SK-509):                  COMPLETE
Layer 5  — Dynamic decision architecture (10 skills, SK-510..SK-519):  COMPLETE
Layer 6  — AI-driven topology planning (6 skills, SK-520..SK-525):     COMPLETE
Layer 6x — Scope isolation enforcement (1 skill, SK-526):              COMPLETE
Layer 7  — Pipeline position enforcement (1 skill, SK-528):            COMPLETE
Layer 8  — Governance discipline (11 skills, SK-529..SK-539):          COMPLETE ← NEW v4.0.0
           SK-529 **v2.5.0** — Tier-0 XIIGen search list (9 files, T0-4.5 added);
                           evidence-layer tags; domain universe declaration;
                           mandatory hypothesis pre-declaration (Gate 5 + §8.1);
                           Gate 3 three-path routing: Path A reword / Path B read
                           file / Path C HANDOFF block for web sessions (v2.5.0)
           SK-539 v1.1.0 — 31 checks, Section 0 pre-design gate, G1-G7 grammar types
Layer 9  — Response construction (1 protocol, v1.0):                   COMPLETE ← NEW v4.0.0
Layer 10 — Screen examination + design context (3 skills, SK-540..SK-542): COMPLETE ← NEW v4.0.0
           SK-540 v1.0.0 — product design context + .impeccable.md
           SK-541 v1.0.0 — four-layer screen craft audit
           SK-542 v1.0.0 — flow UI examination protocol (session orchestrator)
Layer 11 — UI/UX Fleet Discipline (5 skills, SK-543..SK-547):          COMPLETE
           SK-543 v1.0.0 — work-scope-inventory: denominator before fleet work
           SK-544 v1.0.0 — improvement-measurement-protocol: observable PNG delta required
           SK-545 v1.0.0 — ui-fleet-completion-criteria: three-criterion minimum per flow
           SK-546 v1.0.0 — coverage-completeness-gate: claim scope = evidence scope
           SK-547 v1.0.0 — output-skepticism: refutation/scope/proxy before STOP
Layer 12 — Plan Integrity (1 skill, SK-548):                           COMPLETE
           SK-548 v1.0.0 — plan-self-validation: Phase 0 before Phase 1; SK-410 battery
Layer 13 — Visual Examination (3 skills, SK-549..SK-551):              COMPLETE
           SK-549 v1.0.0 — per-image-validation: 7-axis PNG protocol; Axis D mandatory
                           for NEEDS_PURPOSE_BUILT_UI flows; closes V-R7 gap
           SK-550 v1.0.0 — visual-examination-round: multi-round protocol; dual
                           convergence criterion (score-delta + primary-cells coverage)
           SK-551 v1.0.0 — coverage-matrix: cell-level tracking; three convergence
                           conditions; governs ROUND-2-COVERAGE-MATRIX.json
Layer 14 — Multi-entity Examination Protocol (1 skill, SK-552):        COMPLETE ← NEW v4.1.0
           SK-552 **v1.1.0** — per-entity-examination-protocol: N ≥ 5 instance examination
                           before synthesis; hypotheses pre-declared; fixed step sequence;
                           result record format; examiner/synthesis-session separation;
                           closes TRAJECTORY-correction class from module-separation corpus;
                           §9 Examination Freeze Gate: FROZEN_COMPLETE (all 3 conditions)
                           or FROZEN_PENDING_VERIFICATION (Condition 3 pending Claude Code)

Reference documents (no SK):
  XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE **v2.2** — updated v4.1.0
    v2.0: Q-MINUS-2 goal-type classification (REMEDIATION/GREENFIELD/HYBRID)
    v2.1: perspective artifact blocks (IMPLEMENTATION/PRODUCT INTENT/PRINCIPLES)
    v2.2: correction severity classification (LOCAL/TRAJECTORY/SESSION-RESTART)
    Mistakes catalog: 1–31; Observability checklist updated
  HOW-TO-USE-SKILLS **v5.3** — updated v4.4.0
    ROUND CONTRACT (5 checks before every response); MANDATORY STOP FORMAT
    (4-field visible STOP block); Q4 FORMAT RULE (binary done criteria)
  XIIGEN-SESSION-START-PROMPT **v5.1** — updated v4.2.0
    Behavioral contract every response; visible STOP format; Q4 binary format
  CODE-REVIEW-PROTOCOL **v1.9** — updated v4.2.0
    FC-7b: DNA compliance for REMEDIATION plans (DNA-5/7/8/3 per proposed change;
    IMPLEMENTATION evidence required; DESIGN_DOC evidence rejected)
  FLOW-DOCUMENT-AUTHORING-GUIDE **v1.17** — updated v4.2.0
    Rule 36: skill references in flow documents require Prerequisites sections;
    Completion Gate check added
  docs/sessions/BEHAVIORAL-CORRECTIONS-REGISTRY.md **v1.0** — NEW v4.2.0
    10 behavioral corrections BC-001..BC-010 from confirmed H1-H9 corpus;
    Tier-0 T0-4.5 position — read at every session start alongside DECISIONS-LOCKED
  XIIGEN-CODEBASE-ORIENTATION-MAP v1.3 — unchanged
  planning--business-flows-registry.md — unchanged

Total: 128 skills + 1 protocol  ← v4.4.0 +1 SK-554
Next available SK: SK-555
Next available FC: FC-22
Pending: SK-527 (module-isolation-arbiter, FC-33 — tracked separately)
```
