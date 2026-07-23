# XIIGen Skills Index — v1.0
> All 23 governance skills + 2 pre-existing engine skills. Generated Phase 12.

---

## Load Order Table

| Order | SK # | Skill | Priority | Phase | Trigger Phrase |
|-------|------|-------|----------|-------|----------------|
| 1 | — | `agent-constitution` | SUPREME | P1 | session start |
| 2 | — | `no-product-decisions` | SUPREME | P1 | "build X feature" |
| 3 | — | `dev-safety` | BLOCKING | P1 | before any code |
| 4 | — | `skill-advisor-skill` | ADVISOR | P1 | AF-4 / skill selection |
| 5 | — | `infrastructure-discovery` | MANDATORY | P2 | before planning |
| 6 | — | `planning-skill` | MANDATORY | P2 | 8 gates |
| 7 | — | `xiigen-core-principles-skill` | MANDATORY | P2 | P1–P8 principles |
| 8 | — | `plan-review-skill` | MANDATORY | P2 | FC-1–FC-12 |
| 9 | SK-411 | `agent-output-format` | MANDATORY | P3 | web session output |
| 10 | SK-412 | `how-to-prepare-a-plan-skill` | MANDATORY | P3 | plan preparation |
| 11 | SK-413* | `engine-qa` | RECOMMENDED | P5/P8 | bug classification |
| 12 | SK-414 | `test-integrity` | RECOMMENDED | P4 | test discipline |
| 13 | SK-415 | `bug-to-tests` | RECOMMENDED | P4 | bug → 3 tests |
| 14 | SK-413* | `three-level-verification` | RECOMMENDED | P4 | fix verification |
| 15 | SK-423 | `code-examination-skill` | RECOMMENDED | P6 | before modifying |
| 16 | SK-416 | `mental-debug` | RECOMMENDED | P6 | runtime debugging |
| 17 | SK-417 | `self-verification` | RECOMMENDED | P7 | verify fix |
| 18 | SK-418 | `dna-compliance-guard` | RECOMMENDED | P9 | DNA violation |
| 19 | SK-420 | `artifact-numbering` | RECOMMENDED | P9 | assign numbers |
| 20 | SK-419 | `retroactive-development` | RECOMMENDED | P9 | fix in engine |
| 21 | SK-421 | `docker-local-testing` | RECOMMENDED | P10 | docker / fabric test |
| — | SK-422 | `documentation-sync` | OPTIONAL | P10 | session end |
| — | — | `tracker-skill` | OPTIONAL | P1 | tracker configured |
| — | — | `xiigen-engine` | RECOMMENDED | pre | any engine change |
| — | — | `xiigen-flow-builder` | RECOMMENDED | pre | new flow / FLOW-32+ |
| — | SK-430 | `SK-430` | MANDATORY | P2 | any new file / rename / class name review |

> *SK-413 collision: both `engine-qa` and `three-level-verification` were assigned SK-413 across sessions. Tracked in STATE-FINAL.json. No functional impact — both skills load correctly.

---

## Skill Dependency Map

```
agent-constitution
  └─ dev-safety
  └─ no-product-decisions

how-to-prepare-a-plan-skill
  └─ xiigen-core-principles-skill   (Gate 0)
  └─ infrastructure-discovery       (Gate 0, 10-step)
  └─ planning-skill                 (Gates 1–7)
  └─ plan-review-skill              (FC-1–FC-12)
  └─ agent-output-format            (output format)

skill-advisor-skill
  └─ AF-4 selectSkillsForContext()
  └─ AF-9 cross-validate
  └─ AF-11 getSkillEffectiveness()

three-level-verification
  └─ feeds into: bug-to-tests
  └─ feeds into: self-verification

engine-qa
  └─ known-violations-registry.md
```

---

## Injectable Skill Blocks (AF-4 → AF-1 Genesis)

| Block | Key | Activation Rule |
|-------|-----|-----------------|
| Planning | SK-PLAN | iteration ≤ 2 OR archetype === 'ORCHESTRATION' |
| DNA Compliance | SK-DNA | dna_compliance < 0.7 OR is_new_service |
| Test Quality | SK-TEST | test_quality < 0.5 |
| BFA Validation | SK-BFA | factory_dependencies.length > 0 OR has_new_entities |
| Documentation | SK-DOCS | is_last_step === true |

Max 3 blocks active per AF call (MACHINE rule).

---

## Skill File Locations

All skills at: `.claude/skills/{skill-name}/`

| Skill | SKILL.md | AGENTS.md | skill.yaml | rules/ |
|-------|----------|-----------|------------|--------|
| agent-constitution | ✅ | ✅ | ✅ | ✅ |
| no-product-decisions | ✅ | ✅ | ✅ | — |
| dev-safety | ✅ | ✅ | ✅ | — |
| skill-advisor-skill | ✅ | ✅ | ✅ | ✅ |
| tracker-skill | ✅ | — | ✅ | — |
| infrastructure-discovery | ✅ | — | ✅ | — |
| planning-skill | ✅ | — | ✅ | ✅ |
| xiigen-core-principles-skill | ✅ | ✅ | ✅ | — |
| plan-review-skill | ✅ | ✅ | ✅ | ✅ |
| agent-output-format | ✅ | ✅ | ✅ | ✅ |
| how-to-prepare-a-plan-skill | ✅ | ✅ | ✅ | — |
| engine-qa | ✅ | — | ✅ | ✅ |
| test-integrity | ✅ | ✅ | ✅ | ✅ |
| bug-to-tests | ✅ | ✅ | ✅ | — |
| three-level-verification | ✅ | ✅ | ✅ | — |
| code-examination-skill | ✅ | ✅ | ✅ | ✅ |
| mental-debug | ✅ | ✅ | ✅ | ✅ |
| self-verification | ✅ | ✅ | ✅ | — |
| dna-compliance-guard | ✅ | ✅ | ✅ | ✅ |
| artifact-numbering | ✅ | ✅ | ✅ | — |
| retroactive-development | ✅ | ✅ | ✅ | — |
| docker-local-testing | ✅ | ✅ | ✅ | ✅ |
| documentation-sync | ✅ | ✅ | ✅ | — |
| xiigen-engine | ✅ | — | ✅ | ✅ |
| xiigen-flow-builder | ✅ | — | ✅ | ✅ |

---

## Layer 3 — Domain & Pattern Skills (v2.8.0, 2026-03-26)

| File | SK | What it does |
|------|----|-------------|
| planning--requirement-to-flow-SKILL.md | SK-492 | 6-step: domain boundary → flow decomposition |
| planning--product-scope-validation-SKILL.md | SK-493 | Product intent tracing against live ES state |
| planning--domain-event-design-SKILL.md | SK-494 | Entity+PastVerb naming; ≤5 consumers; frozen schemas |
| planning--cross-cutting-service-SKILL.md | SK-495 | Identify shared infrastructure (≥3 UML appearances) |
| planning--service-boundary-design-SKILL.md | SK-496 | 4 boundary tests; transaction/lifecycle/consumer/domain |
| planning--algorithm-as-service-SKILL.md | SK-497 | 5 algorithm classes; FREEDOM config keys per class |
| code-execution--event-driven-debugging-SKILL.md | SK-498 | 4 root cause classes; binary search for event chain breaks |
| qa--user-journey-acceptance-testing-SKILL.md | SK-499 | UML scenario extraction; test stubs before implementation |
| qa--data-flow-integrity-SKILL.md | SK-500 | 5-step: build map → schema diff → gap classify → report |
| code-execution--multi-service-local-dev-SKILL.md | SK-501 | 6-step local dev setup; fabric mocks; teardown script |
| planning--feature-prioritization-SKILL.md | SK-502 | 3-axis: business value × dependency × infra cost |
| planning--temporal-behavior-design-SKILL.md | SK-503 | Multi-stage state machines; ISchedulerService |
| planning--shared-infrastructure-design-SKILL.md | SK-504 | 3 categories: cache / ML inference / search index |

## Layer 4 — Self-Extension Skills (v2.8.0, 2026-03-26)

| File | SK | What it does |
|------|----|-------------|
| self--capability-state-reader-SKILL.md | SK-505 | Query fabric/check/flow registry; capability snapshot |
| self--gap-to-proposal-SKILL.md | SK-506 | CONVENTION→ADAPTATION→EXTENSION→NEW_FLOW ladder |
| self--implementation-integrity-SKILL.md | SK-507 | Golden Rule; 4 checks; Implementation Integrity Report |
| self--training-data-gap-audit-SKILL.md | SK-508 | Find gap window; classify RECOVERABLE/CONTAMINATED |
| self--extension-session-type-SKILL.md | SK-509 | SELF-EXTENSION as formal session type; governance chain |

## Layer 5 — Dynamic Decision Architecture (v2.8.0, 2026-03-26)

| File | SK | What it does |
|------|----|-------------|
| planning--four-tier-decision-classification-SKILL.md | SK-510 | Q1-Q4 classification; 5 learnable indicators |
| planning--graph-entity-schema-design-SKILL.md | SK-511 | NODE/EDGE/PROPERTY/IMMUTABLE; 5-field edge schema |
| planning--confidence-lifecycle-design-SKILL.md | SK-512 | Seeding formula; ±0.05 delta; 3-tier promotion; decay window |
| planning--ai-decision-pipeline-design-SKILL.md | SK-513 | 4-role: implementors→arbiters→context→manager; V9-002 |
| planning--planning-dpo-authoring-SKILL.md | SK-514 | 3 new signal types; GENERATED vs REINFORCEMENT; cross-layer |
| planning--learning-loop-closure-SKILL.md | SK-515 | 4-event loop; retrospective plan; pre-graph discovery rule |
| planning--static-to-graph-topology-refactoring-SKILL.md | SK-516 | Before/after YAML; 5 refactoring rules |
| planning--graph-rag-fabric-integration-SKILL.md | SK-517 | 4 query patterns; provider migration phases |
| planning--top-manager-extension-protocol-SKILL.md | SK-518 | 3 escalation triggers; GraphMutationProposal; 3-phase approval |
| planning--skill-graph-sync-SKILL.md | SK-519 | GOVERNS_SEED edge; GraphDriftDetector; SkillCompiler |

**Next available SK: SK-520**
