# FLOW-DESIGN SKILL SET — INDEX & INTEGRATION GUIDE
## v3.2.0 — 2026-03-26 | +10 new skills (SK-510..SK-519), Layer 5 dynamic decision architecture
## Works in: Claude.ai Project (web sessions) AND Claude Code (execution)

---

## WHAT CHANGED IN v3.2.0

Source: Dynamic AI architecture synthesis + 4 independent gap analyses + 3 reviews

| Change | What it adds |
|--------|-------------|
| NEW SK-510 | four-tier-decision-classification: BOUNDARY / FREEDOM / GRAPH / AI test |
| NEW SK-511 | graph-entity-schema-design: nodes, edges, types, seeds, promotion paths |
| NEW SK-512 | confidence-lifecycle-design: seeding → learning → promotion → decay → graduation |
| NEW SK-513 | ai-decision-pipeline-design: 4 roles, V9-002 for planning decisions |
| NEW SK-514 | planning-dpo-authoring: GENERATED vs REINFORCEMENT, outcome attribution |
| NEW SK-515 | learning-loop-closure: four-event loop, retrospective plan template |
| NEW SK-516 | static-to-graph-topology-refactoring: before/after, two-step feedback |
| NEW SK-517 | graph-rag-fabric-integration: IGraphRagService injection + query patterns |
| NEW SK-518 | top-manager-extension-protocol: GraphMutationProposal, 3-phase approval |
| NEW SK-519 | skill-graph-sync: GOVERNS_SEED, GraphDriftDetector, SkillCompiler |
| LAYER ADDED | Layer 5 — Dynamic Decision Architecture (SK-510..SK-519) |
| SUPERSEDED | SK-451 superseded for new components (still valid for clear MACHINE/FREEDOM) |
| EXTENDED | SK-468 with 3 planning signal types + REINFORCEMENT category |
| UPDATED | SK-426 bootstrap boundary list: SkillCompiler added |

---

## WHAT CHANGED IN v3.1.0

Source: Product vision gap analysis (20 gaps) + self-extension analysis (5 skills)

| Change | What it adds |
|--------|-------------|
| NEW SK-492 | requirement-to-flow: UML/spec → flow list, task types, dependency order |
| NEW SK-493 | product-scope-validation: post-wave product intent validation |
| NEW SK-494 | domain-event-design: naming, payload, versioning, consumer limit (≤5) |
| NEW SK-495 | cross-cutting-service: service appearance counting, 3 sharing patterns |
| NEW SK-496 | service-boundary-design: UML service → task type mapping principles |
| NEW SK-497 | algorithm-as-service: ranking/matching/scoring as ALGORITHM archetype |
| NEW SK-498 | event-driven-debugging: cross-service event trace, 3-step isolation protocol |
| NEW SK-499 | user-journey-acceptance-testing: E2E scenario from UML sequence diagrams |
| NEW SK-500 | data-flow-integrity: output schema of service N vs input of service N+1 |
| NEW SK-501 | multi-service-local-dev: minimum running set, seed data, event mock |
| NEW SK-502 | feature-prioritization: business value × dependency multiplier × infra cost |
| NEW SK-503 | temporal-behavior-design: time-delta state machines, phase transitions |
| NEW SK-504 | shared-infrastructure-design: cache/ML/search across flows |
| NEW SK-505 | capability-state-reader: query own manifest before any extension session |
| NEW SK-506 | gap-to-proposal: CONVENTION→ADAPTATION→EXTENSION→NEW FLOW ladder for engine gaps |
| NEW SK-507 | implementation-integrity: verify gap closed, guard installed, no new gaps |
| NEW SK-508 | training-data-gap-audit: remediate triples from gap window |
| NEW SK-509 | extension-session-type: SELF-EXTENSION as formal session type |
| LAYER ADDED | Layer 3 — Product Lifecycle (SK-492..SK-504) |
| LAYER ADDED | Layer 4 — Engine Self-Awareness (SK-505..SK-509) |

---

## LAYER MAP (complete — 5 layers)

```
Layer 1 — ENGINE INTERNALS (SK-426..SK-470, 47 skills)
  How the AF pipeline works, flows, session governance.
  STATUS: Complete.

Layer 2 — ENGINE LIFECYCLE (SK-471..SK-491, 21 skills)
  Score interpretation, PromptPatch, test triage, code review.
  STATUS: Complete (v3.0.0).

Layer 3 — PRODUCT LIFECYCLE (SK-492..SK-504, 13 skills)
  UML→flows, event design, service boundaries, QA, local dev.
  STATUS: Complete (v3.1.0).

Layer 4 — ENGINE SELF-AWARENESS (SK-505..SK-509, 5 skills)
  Capability state, gap detection, extension session governance.
  STATUS: Complete (v3.1.0).

Layer 5 — DYNAMIC DECISION ARCHITECTURE (SK-510..SK-519, 10 skills) ← NEW v3.2.0
  Four-tier classification, graph entity design, confidence lifecycle,
  AI pipeline design, planning DPO, learning loop, topology refactoring,
  fabric integration, Top Manager protocol, skill-graph sync.
  STATUS: Complete.
```

---

## NEW SKILL TABLE — v3.1.0

### Layer 3 — Product Lifecycle (HIGH urgency, SK-492..SK-499)
*Run before first customer product*

| File | SK | Category | Load | When |
|------|----|----------|------|------|
| `planning--requirement-to-flow-SKILL.md` | SK-492 | planning | 0 | New product planning; UML to flows |
| `planning--product-scope-validation-SKILL.md` | SK-493 | planning | 99 | After each wave is ACTIVE |
| `planning--domain-event-design-SKILL.md` | SK-494 | planning | 1 | Before any event schema is defined |
| `planning--cross-cutting-service-SKILL.md` | SK-495 | planning | 0 | During SK-492 decomposition; before Wave 1+ design |
| `planning--service-boundary-design-SKILL.md` | SK-496 | planning | 1 | When mapping UML services to task types |
| `planning--algorithm-as-service-SKILL.md` | SK-497 | planning | 1 | Any ranking/matching/scoring task type |
| `code-execution--event-driven-debugging-SKILL.md` | SK-498 | code-execution | 0 | Cross-service failure with event chain |
| `qa--user-journey-acceptance-testing-SKILL.md` | SK-499 | qa | 99 | Before claiming wave deliverable |

### Layer 3 — Product Lifecycle (MEDIUM urgency, SK-500..SK-504)
*Run before Wave 2 parallel execution*

| File | SK | Category | Load | When |
|------|----|----------|------|------|
| `qa--data-flow-integrity-SKILL.md` | SK-500 | qa | 99 | After any wave completes |
| `code-execution--multi-service-local-dev-SKILL.md` | SK-501 | code-execution | 0 | Before Phase B of any Wave 1+ flow |
| `planning--feature-prioritization-SKILL.md` | SK-502 | planning | 0 | When >3 flows are unblocked simultaneously |
| `planning--temporal-behavior-design-SKILL.md` | SK-503 | planning | 1 | Any time-delta state machine service |
| `planning--shared-infrastructure-design-SKILL.md` | SK-504 | planning | 0 | Before designing shared fabric interfaces |

### Layer 4 — Engine Self-Awareness (SK-505..SK-509)

| File | SK | Category | Load | When |
|------|----|----------|------|------|
| `self--capability-state-reader-SKILL.md` | SK-505 | self | -2 | Start of every SELF-EXTENSION session |
| `self--gap-to-proposal-SKILL.md` | SK-506 | self | 0 | After SK-505 detects MISSING capability |
| `self--implementation-integrity-SKILL.md` | SK-507 | self | 99 | After capability extension completes |
| `self--training-data-gap-audit-SKILL.md` | SK-508 | self | 99 | After SK-507 confirms integrity |
| `self--extension-session-type-SKILL.md` | SK-509 | self | -2 | Session type reference for self-extension |

### Layer 5 — Dynamic Decision Architecture (SK-510..SK-519)   ← NEW v3.2.0
*Run before any component that makes decisions*

| File | SK | Category | Load | When |
|------|----|----------|------|------|
| `planning--four-tier-decision-classification-SKILL.md` | SK-510 | planning | 0 | Any component design with decision points |
| `planning--graph-entity-schema-design-SKILL.md` | SK-511 | planning | 1 | After SK-510 classifies as GRAPH RAG |
| `planning--confidence-lifecycle-design-SKILL.md` | SK-512 | planning | 1 | After SK-511 entity design |
| `planning--ai-decision-pipeline-design-SKILL.md` | SK-513 | planning | 1 | After SK-510 classifies as AI PIPELINE |
| `planning--planning-dpo-authoring-SKILL.md` | SK-514 | planning | 2 | After SK-513 pipeline design |
| `planning--learning-loop-closure-SKILL.md` | SK-515 | planning | 2 | After SK-512 + SK-514 |
| `planning--static-to-graph-topology-refactoring-SKILL.md` | SK-516 | planning | 2 | Refactoring existing topology to graph-backed |
| `planning--graph-rag-fabric-integration-SKILL.md` | SK-517 | planning | 2 | Any service querying the decision graph |
| `planning--top-manager-extension-protocol-SKILL.md` | SK-518 | planning | 3 | Novel case, Top Manager proposal |
| `planning--skill-graph-sync-SKILL.md` | SK-519 | planning | 3 | Skill version bump or drift detected |

---

## ALL PRIOR SKILLS — unchanged from v3.0.0

(SK-426..SK-491 table unchanged — see v3.0.0 for full listing)

---

## UPDATED GAP TABLE — v3.1.0 additions

| Gap | Description | Status |
|-----|-------------|--------|
| Gap 54 | No skill for UML/spec → flow decomposition | RESOLVED — SK-492 |
| Gap 55 | No skill for post-wave product intent validation | RESOLVED — SK-493 |
| Gap 56 | 50+ domain events with no design discipline | RESOLVED — SK-494 |
| Gap 57 | Feed/Notification appear in 5-7 UMLs — no shared service identification | RESOLVED — SK-495 |
| Gap 58 | UML service → task type mapping made by judgment each time | RESOLVED — SK-496 |
| Gap 59 | 5 distinct algorithm services with no design pattern | RESOLVED — SK-497 |
| Gap 60 | Cross-service event chain failure has no debug protocol | RESOLVED — SK-498 |
| Gap 61 | User journey E2E validation absent ("all services pass, platform broken") | RESOLVED — SK-499 |
| Gap 62 | Data flow integrity across 8-service chains unverified | RESOLVED — SK-500 |
| Gap 63 | Local dev with upstream service dependencies unguided | RESOLVED — SK-501 |
| Gap 64 | Flow build order when business priority conflicts with dependency order | RESOLVED — SK-502 |
| Gap 65 | Time-delta state machines have no archetype or design pattern | RESOLVED — SK-503 |
| Gap 66 | Shared cache/ML/search design not distinguished from per-flow services | RESOLVED — SK-504 |
| Gap 67 | Engine cannot query its own capability state | RESOLVED — SK-505 |
| Gap 68 | Capability gaps require human to detect and classify | RESOLVED — SK-506 |
| Gap 69 | Capability sessions don't verify closure or guard installation | RESOLVED — SK-507 |
| Gap 70 | Training data from gap windows accumulates without remediation | RESOLVED — SK-508 |
| Gap 71 | Self-extension has no formal session type — happens ad hoc | RESOLVED — SK-509 |

### v3.2.0 gap additions (Layer 5)

| Gap | Description | Status |
|-----|-------------|--------|
| Gap 72 | SK-451 only classifies MACHINE/FREEDOM — no GRAPH RAG or AI PIPELINE tier | RESOLVED — SK-510 |
| Gap 73 | No skill for designing graph entities (nodes, edges, types, seeds) | RESOLVED — SK-511 |
| Gap 74 | Confidence lifecycle scattered across 6 documents, no single source of truth | RESOLVED — SK-512 |
| Gap 75 | No skill for designing AI-arbitrated planning decisions with V9-002 compliance | RESOLVED — SK-513 |
| Gap 76 | SK-468 only covers code-gen DPO — no planning signal types, no REINFORCEMENT | RESOLVED — SK-514 |
| Gap 77 | Decisions produce DPO triples but graph weights never update (no learning loop) | RESOLVED — SK-515 |
| Gap 78 | No before/after pattern for converting static topology to graph-backed | RESOLVED — SK-516 |
| Gap 79 | No skill for IGraphRagService injection, query patterns, or D-GRAPH-001 constraints | RESOLVED — SK-517 |
| Gap 80 | Top Manager has no structured protocol — proposals are free-form text | RESOLVED — SK-518 |
| Gap 81 | Graph and skills diverge silently — no drift detection or resolution protocol | RESOLVED — SK-519 |

---

## SKILL ACTIVATION ADDITIONS — v3.1.0

### Product planning (new triggers for Layer 3)

```
Before any new product planning session:
  SK-492 requirement-to-flow           ← first step for every new product
  SK-495 cross-cutting-service         ← inside SK-492, before Wave 1+ design

Before any event schema is defined:
  SK-494 domain-event-design           ← naming, payload, consumer limit

When UML service → task type mapping:
  SK-496 service-boundary-design       ← merge/split principles

Any ranking, matching, scoring task type:
  SK-497 algorithm-as-service          ← ALGORITHM archetype design

Any time-delta state machine service:
  SK-503 temporal-behavior-design      ← phase boundaries, scheduler use

When ≥3 flows are unblocked simultaneously:
  SK-502 feature-prioritization        ← value × dependency × infra cost

Before designing shared fabric interfaces:
  SK-504 shared-infrastructure-design  ← cache/ML/search design protocol

Before Phase B of any Wave 1+ flow:
  SK-501 multi-service-local-dev       ← minimum running set + seed data

After any wave reaches ACTIVE:
  SK-493 product-scope-validation      ← business outcome verification
  SK-499 user-journey-acceptance-testing ← E2E scenario validation
  SK-500 data-flow-integrity           ← schema chain verification

Cross-service failure with event chain:
  SK-498 event-driven-debugging        ← trace, isolate, identify

SELF-EXTENSION session:
  SK-509 extension-session-type        ← session type governance
  SK-505 capability-state-reader       ← step 1: read state
  SK-506 gap-to-proposal               ← step 2: classify + propose
  (⛔ STOP — await approval)
  SK-507 implementation-integrity      ← step 4: verify closure
  SK-508 training-data-gap-audit       ← step 5: remediate triples
```

### Dynamic decision architecture (new triggers for Layer 5)

```
Any component design with decision points:
  SK-510 four-tier-decision-classification ← ENTRY POINT: which tier?
  ├─ BOUNDARY CODE → SK-451/SK-426 (existing, stop)
  ├─ FREEDOM CONFIG → SK-451 (existing, stop)
  ├─ GRAPH RAG:
  │   SK-511 graph-entity-schema-design
  │   SK-512 confidence-lifecycle-design
  │   SK-517 graph-rag-fabric-integration
  │   SK-516 static-to-graph-topology-refactoring
  └─ AI PIPELINE:
      SK-513 ai-decision-pipeline-design
      SK-514 planning-dpo-authoring
      SK-515 learning-loop-closure

Novel case or Top Manager proposal:
  SK-518 top-manager-extension-protocol

Skill version bump or graph drift detected:
  SK-519 skill-graph-sync

TRANSFORMATION session:
  SK-510 FIRST → classification table → ⛔ STOP 1
  SK-511 + SK-512 → entity schema + retrospective plan → ⛔ STOP 2
  Then remaining Layer 5 skills as classified
```

---

## FILE INVENTORY (v3.2.0 complete — 96 skill files)

**New in v3.2.0 (10 skills — Layer 5 Dynamic Decision Architecture):**
- `planning--four-tier-decision-classification-SKILL.md` (SK-510)
- `planning--graph-entity-schema-design-SKILL.md` (SK-511)
- `planning--confidence-lifecycle-design-SKILL.md` (SK-512)
- `planning--ai-decision-pipeline-design-SKILL.md` (SK-513)
- `planning--planning-dpo-authoring-SKILL.md` (SK-514)
- `planning--learning-loop-closure-SKILL.md` (SK-515)
- `planning--static-to-graph-topology-refactoring-SKILL.md` (SK-516)
- `planning--graph-rag-fabric-integration-SKILL.md` (SK-517)
- `planning--top-manager-extension-protocol-SKILL.md` (SK-518)
- `planning--skill-graph-sync-SKILL.md` (SK-519)

**New in v3.1.0 (18 skills):**
Layer 3 HIGH: SK-492..SK-499 (8 files, planning + code-execution + qa categories)
Layer 3 MEDIUM: SK-500..SK-504 (5 files, qa + code-execution + planning categories)
Layer 4: SK-505..SK-509 (5 files, self category)

**All prior skills:** SK-426..SK-491 (68 files, unchanged from v3.0.0)

---

## NEXT AVAILABLE SK NUMBER

After v3.2.0: **SK-520**
