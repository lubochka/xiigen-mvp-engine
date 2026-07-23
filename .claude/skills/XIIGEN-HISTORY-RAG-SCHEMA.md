# XIIGEN-HISTORY-RAG-SCHEMA
## Phase R1 — Field Mapping Specification
## Generated: 2026-04-19 | Corpus: 186 decisions, 12 batches
## Status: AUTHORITATIVE — all conversion scripts apply these mappings

---

## §1 — Source Formats (10 formats, 12 batches)

> Live target fields confirmed from:
> - `additive-subtractive-aggregate-001.json` (rag-patterns) → `['appliesTo', 'archetype', 'codeSnippet', 'connectionType', 'curriculumTier', 'domainId', 'flowId', 'ironRules', 'keywords', 'knowledgeScope', 'patternId', 'patternType', 'qualityScore', 'seededAt', 'sourceDocument', 'tags']`
> - `adaptive-rag-deep-research-design-decisions.json` (design-reasoning) → `['appliesTo', 'connectionType', 'curriculumTier', 'discriminatingConstraint', 'domainId', 'flowId', 'keywords', 'knowledgeScope', 'negativeExample', 'patternId', 'patternType', 'positiveExample', 'qualityScore', 'seededAt', 'sourceDocument', 'tags', 'teachingPoint']`

---

### Format A: historyRag extraction — Batches A-1, A-2, B, C — 120 decisions
Source: `docs/sessions/historyRag/pass*.json`

| Field | Type | Notes |
|---|---|---|
| `decisionId` | string | ARCH-NNN, FLOW-DESIGN-NNN, ENG-EXT-NNN |
| `patternType` | string | ARCH_PATTERN or DESIGN_REASONING |
| `task` | string | The design question / task description |
| `taskType.archetype` | string | e.g. ORCHESTRATION, ROUTING |
| `taskType.curriculumTier` | int | 1–5 |
| `chosen.approach` | string | The chosen solution |
| `chosen.keyConstraint` | string | The binding constraint |
| `rejected.approach` | string | The rejected alternative |
| `rejected.why` | string | Rejection reason |
| `reasoning` | string | Explanation of the choice |
| `teachingPoint` | string | Lesson for future generation |
| `qualityScore` | float | 0.0–1.0 |
| `tags` | string[] | Keywords including FLOW-XX refs |
| `sourceFile` | string | Origin document name |

### Format B: per-flow ARCHITECTURE-DECISIONS.json — Batch D — 12 decisions
Source: `docs/sessions/FLOW-{01,03,04}/*/FLOW-*-ARCHITECTURE-DECISIONS.json`

| Field | Type | Notes |
|---|---|---|
| `decisionId` | string | D-01-N, D-03-N, D-04-N |
| `type` | string | e.g. ARCHETYPE_CLASSIFICATION, SILENT_FAILURE_PREVENTION |
| `capability` | string | Task type and capability description |
| `proposed` | string | The naïve / wrong approach |
| `challenge` | string | Why the proposed approach fails |
| `resolution` | string | The correct approach |
| `principleApplied` | string | The governing rule |
| `teachingPoint` | string | Lesson for future generation |

### Format C: DECISIONS.md markdown — Batch E — 3 decisions
Source: `docs/decisions/DECISIONS.md`

| Field | Type | Notes |
|---|---|---|
| `heading` | string | ## DR-P8-NNN: title |
| `Date` | string | Date field |
| `Question` | string | The design question |
| `Decision` | string | What was decided |
| `Rationale` | string | Why |

### Format D: docs/decisions/ architectureDecisions — Batch G DECALT — 3 decisions
Source: `docs/decisions/FLOW-01-ARCHITECTURE-DECISIONS.json`

| Field | Type | Notes |
|---|---|---|
| `decisionId` | string | D-01-N |
| `type` | string | e.g. INCOMPATIBLE_RECLASSIFICATION, DEPENDENCY_DIRECTION |
| `question` | string | The design question |
| `reasoning` | string | Explanation |
| `principle` | string | The governing principle |
| `outcome` | string | What was decided |

### Format E: standalone DR-NNN markdown — Batch G DR-242
Source: `docs/decisions/DR-242-filesystem-snapshot-persistence.md`

| Field | Type | Notes |
|---|---|---|
| `heading` | string | # DR-NNN: title |
| `Decision` | string | Decision paragraph |
| `Rationale` | string | Bullet rationale |
| `Alternatives Considered` | string | Option list |

### Format F: ADR markdown — Batch G ADR-FLOW-18
Source: `docs/decisions/ADR-USER-JOURNEY-RECONNECTION-INDEX-RECONCILIATION.md`

| Field | Type | Notes |
|---|---|---|
| `Status` | string | Accepted (locked) |
| `Context` | string | Problem statement |
| `Options` | string | Options A/B |
| `Decision` | string | Locked option + rationale |

### Format G: SESSION-TEACH-WHY ES payload — Batch H — 7 decisions
Source: `docs/sessions/FLOW-02/.../SESSION-TEACH-WHY-*.md (curl payloads)`

| Field | Type | Notes |
|---|---|---|
| `decisionId` | string | D-02-FAN-01, D-02-CONV-01, etc. |
| `flowId` | string | FLOW-02 |
| `archetype` | string | FAN_IN, CONVERGENCE, BROADCAST |
| `designQuestion` | string | The decision question |
| `chosen.decision` | string | The correct approach |
| `chosen.codeSnippet` | string | Code example |
| `rejected.decision` | string | The wrong approach |
| `rejected.antiPattern` | string | Anti-pattern label |
| `rationale` | string[] | Reasons for the choice |
| `teachingPoint` | string | Lesson |

### Format H: XIIGEN-GAP-REVIEW analysis — Batch I — 5 engine architecture decisions
Source: `docs/flow-plan-preparation/XIIGEN-GAP-REVIEW-2026-04-01.md`

| Field | Type | Notes |
|---|---|---|
| `GAP-N heading` | string | ### GAP-N: title |
| `What should happen` | string | Correct design (→ positiveExample) |
| `What actually happens` | string | Current anti-pattern (→ negativeExample) |
| `Root cause Level 3` | string | Architectural root cause (→ discriminatingConstraint) |
| `Evidence` | string | Code references supporting the finding |

### Format I: DECISIONS-LOCKED.md entries — Batch J — 25 locked decisions
Source: `docs/decisions/DECISIONS-LOCKED.md`

| Field | Type | Notes |
|---|---|---|
| `D-XX-N heading` | string | ## D-XX-N — title or inline D-XX-N: label |
| `Status` | string | LOCKED |
| `Decision` | string | The locked decision text |
| `Rationale` | string | Why it was locked |
| `Source` | string | Originating plan document |
| `To change` | string | SK-417 decision reopening required |

### Format J: docs/architecture/ documentation — Batch K — 8 decisions
Source: `docs/architecture/DELIVERY_DOCUMENTATION.md + KNOWLEDGE_DIGEST.md`

| Field | Type | Notes |
|---|---|---|
| `Section heading` | string | §7 Key Architectural Decisions / §18 Self-Sufficiency / §19 Dynamic AI Decision Architecture |
| `Decision row` | string | | Decision | Why | pattern in table |
| `Narrative` | string | Prose description of the pattern |
| `Code snippet` | string | Illustrative TypeScript or pseudocode |

---

## §2 — Target Format A: `fixtures/rag-patterns/hist_*.json` (ARCH_PATTERN)

Applies to: Batch A-1 (40) + Batch A-2 (21) = **61 files**
Required fields confirmed from live corpus: `['appliesTo', 'archetype', 'codeSnippet', 'connectionType', 'curriculumTier', 'domainId', 'flowId', 'ironRules', 'keywords', 'knowledgeScope', 'patternId', 'patternType', 'qualityScore', 'seededAt', 'sourceDocument', 'tags']`

```
patternId         ← "hist_arch_NNN"          (Batch A-1: ARCH-NNN)
                     "hist_fd_NNN"            (Batch A-2: FLOW-DESIGN ARCH)
patternType       ← "ARCH_PATTERN"
archetype         ← taskType.archetype
tags[]            ← source tags preserved
keywords          ← task[:80] + " " + " ".join(tags)
ironRules[0]      ← chosen.approach[:120]
ironRules[1]      ← chosen.keyConstraint  |  "see reasoning below"
ironRules[2]      ← "REJECTED: " + rejected.approach[:80]
codeSnippet       ← teachingPoint (verbatim)
appliesTo[]       ← [t for t in tags if t.startswith("FLOW-")]  |  ["ALL_FLOWS"]
curriculumTier    ← taskType.curriculumTier
qualityScore      ← source qualityScore preserved
sourceDocument    ← sourceFile
connectionType    ← "FLOW_SCOPED"   ("HISTORICAL_ONLY" for ARCH-023..040)
knowledgeScope    ← "GLOBAL"        ("INFORMATIONAL"   for ARCH-023..040)
flowOrigin        ← decisionId  (Batch A-2 only — preserves flow-design provenance)
```

**ARCH-023..040 note:** C#→NestJS migration decisions tagged `HISTORICAL_ONLY` / `INFORMATIONAL` —
retrievable for context but do not drive `ironRules` violations.

---

## §3 — Target Format B: `fixtures/design-reasoning/historical/hist_*.json` (DESIGN_REASONING)

Applies to: Batches B, C, D, E, F(append), G, H, I, J, K = **125 files**
Required fields confirmed from live corpus: `['appliesTo', 'connectionType', 'curriculumTier', 'discriminatingConstraint', 'domainId', 'flowId', 'keywords', 'knowledgeScope', 'negativeExample', 'patternId', 'patternType', 'positiveExample', 'qualityScore', 'seededAt', 'sourceDocument', 'tags', 'teachingPoint']`

```
patternId              ← see §5 Naming Conventions
patternType            ← "DESIGN_REASONING"
flowId                 ← first FLOW-XX tag  |  "ENGINE_EXTENSION"  |  "ALL_FLOWS"
                          "ENGINE_ARCHITECTURE"  (Batches I, K)
teachingPoint          ← [Format A] reasoning + chosen.approach[:120]
                         [Format B] resolution + " " + teachingPoint
                         [Format C] Decision paragraph + Rationale[0]
                         [Format D] reasoning + " " + outcome
                         [Format E] Decision paragraph
                         [Format F] locked option + context[:100]
                         [Format G] teachingPoint  |  rationale[0]
                         [Format H] GAP description + root cause Level 3
                         [Format I] Decision text + Rationale[:150]
                         [Format J] decision row text + narrative snippet
positiveExample        ← "CORRECT: " + chosen approach
negativeExample        ← "WRONG: "   + rejected approach + " — " + why[:80]
discriminatingConstraint ← chosen.keyConstraint  |  principleApplied  |  rationale[1]
                           lock text for Batch J  |  architectural constraint for Batch K
appliesTo[]            ← [FLOW-XX tags]  |  ["ALL_FLOWS"]  |  ["ENGINE_ARCHITECTURE"]
curriculumTier         ← taskType.curriculumTier
                         3  (default — Batches D, G, H)
                         5  (Batches I, J, K — highest architectural tier)
qualityScore           ← source  |  0.90 (D/G)  |  0.75 (E)  |  0.88 (H)
                                  |  0.95 (I)   |  0.97 (J)  |  0.94 (K)
sourceDocument         ← source filename with section reference where applicable
tags[]                 ← derived from source tags + type field
keywords               ← concatenation of tags + task[:80]
connectionType         ← "FLOW_SCOPED"          (most decisions)
                         "SESSION_GOVERNANCE"    (Batch E)
knowledgeScope         ← "GLOBAL"
```

---

## §4 — Validation Gate (8 checks — all fixtures must pass)

| # | Check | Rule | Fail action |
|---|---|---|---|
| 1 | Namespace | `patternId` starts with `hist_` | Skip, log to MANUAL-REVIEW.md |
| 2 | Type | `patternType` ∈ {ARCH_PATTERN, DESIGN_REASONING} | Skip, log |
| 3 | Tags | `len(tags) >= 2` | Skip, log |
| 4 | Content | `len(codeSnippet or teachingPoint) >= 20` | Skip, log |
| 5 | Quality | `qualityScore >= 0.70` | Skip, log |
| 6 | Scope | `knowledgeScope` present | Skip, log |
| 7 | Provenance | `sourceDocument` present | Skip, log |
| 8 | Constraint | `discriminatingConstraint` present (DESIGN_REASONING only) | Skip, log |

---

## §5 — Naming Conventions

```
hist_arch_NNN.json                 ←  ARCH-NNN                 (Batch A-1)
hist_fd_NNN.json                   ←  FLOW-DESIGN ARCH         (Batch A-2)
hist_fd_dr_NNN.json                ←  FLOW-DESIGN DR           (Batch B)
hist_eng_NNN.json                  ←  ENG-EXT-NNN              (Batch C)
hist_flow_FLOWNN_d_NN_N.json       ←  per-flow ARCH-DECISIONS  (Batch D)
hist_dr_p8_NNN.json                ←  DR-P8-NNN                (Batch E)
hist_decalt_d_01_N.json            ←  DECALT docs/decisions/   (Batch G)
hist_dr_242.json                   ←  DR-242                   (Batch G)
hist_adr_flow18_topology.json      ←  ADR-FLOW-18              (Batch G)
hist_tw_flow02_d_02_fan_01.json    ←  D-02-FAN-01              (Batch H)
hist_tw_flow02_d_02_conv_0N.json   ←  D-02-CONV-01..03         (Batch H)
hist_tw_flow02_d_02_broad_0N.json  ←  D-02-BROAD-01..03        (Batch H)
hist_gap_review_00N.json           ←  GAP-1..5                 (Batch I)
hist_locked_ft_N.json              ←  D-FT-1..3                (Batch J)
hist_locked_vis_N.json             ←  D-VIS-1..4               (Batch J)
hist_locked_parallel_N.json        ←  D-PARALLEL-1..3          (Batch J)
hist_locked_34_1.json              ←  D-34-1                   (Batch J)
hist_locked_bundle_N.json          ←  D-BUNDLE-1..2            (Batch J)
hist_locked_client_N.json          ←  D-CLIENT-1..3            (Batch J)
hist_locked_naming_1.json          ←  D-NAMING-1               (Batch J)
hist_locked_stack_N.json           ←  D-STACK-1..8             (Batch J)
hist_arch_delivery_di_N.json       ←  ARCH-DI-1..3             (Batch K)
hist_arch_delivery_ss_N.json       ←  ARCH-SS-1..2             (Batch K)
hist_arch_delivery_dada_N.json     ←  ARCH-DADA-1..3           (Batch K)
```

---

## §6 — curriculumTier Guide

| Tier | Meaning | Batches |
|---|---|---|
| 1 | Basic pattern — syntax, simple DNA rule | A-1 (low qualityScore range) |
| 2 | Intermediate — multi-step pattern, one domain | A-1, B |
| 3 | Flow-level — integrates multiple patterns | D, G, H (default) |
| 4 | Cross-flow — impacts multiple flows or engine | C, A-2 |
| 5 | Architectural — engine-level, universal, non-negotiable | I (GAP-REVIEW), J (LOCKED), K (docs/architecture/) |

---

## §7 — qualityScore Assignment

| Batch | Score | Source | Rationale |
|---|---|---|---|
| A-1, A-2, B, C | preserved | historyRag source file | Already scored during historyRag extraction |
| D | 0.90 | assigned | Per-flow architecture decisions — well-validated in implementation |
| E | 0.75 | assigned | DR-P8 governance records — important but session-specific |
| F | 0.87 | assigned | DR-07-G — validated best-effort pattern |
| G | 0.90 / 0.82 / 0.91 | assigned per item | docs/decisions/ — varies by maturity |
| H | 0.88 | assigned | TEACH-WHY — validated in FLOW-02 execution |
| I | 0.95 | assigned | GAP-REVIEW — root cause analysis, high architectural impact |
| J | 0.97 | assigned | DECISIONS-LOCKED — locked by Luba approval, SK-417 required to change |
| K | 0.94 | assigned | docs/architecture/ — authoritative reference documentation |

---

## §8 — Sample Conversions (one per critical batch)

**Batch A-1 — ARCH-001 → hist_arch_001.json**
```json
{
  "patternId": "hist_arch_001",
  "patternType": "ARCH_PATTERN",
  "archetype": "ORCHESTRATION",
  "tags": ["fabric-first","generic-interfaces","provider-abstraction","Rule-1"],
  "ironRules": [
    "Generic interface layer (IDatabaseService, IAiService, IQueueService)",
    "Generated services import only interfaces — never provider SDKs",
    "REJECTED: Provider-specific direct implementations"
  ],
  "codeSnippet": "Every service imports IDatabaseService not ElasticsearchService",
  "appliesTo": ["ALL_FLOWS"],
  "curriculumTier": 5, "qualityScore": 0.95,
  "sourceDocument": "COMPARISON_AND_MIGRATION_GUIDE.md",
  "connectionType": "FLOW_SCOPED", "knowledgeScope": "GLOBAL"
}
```

**Batch D — D-03-1 → hist_flow_flow03_d_03_1.json (LOCK CANDIDATE ★★🔒)**
```json
{
  "patternId": "hist_flow_flow03_d_03_1",
  "patternType": "DESIGN_REASONING",
  "flowId": "FLOW-03",
  "teachingPoint": "REGISTRATION atomic: registerAtomically() wraps capacity check + write in ONE transaction. cycleBudget=3 — model generates separate check+write on cycle 1.",
  "positiveExample": "CORRECT: registrationService.registerAtomically(eventId, userId) — one atomic op.",
  "negativeExample": "WRONG: capacityService.check() then registrationService.create() — race condition. Two users see capacity=1, both register, capacity goes to -1.",
  "discriminatingConstraint": "REGISTRATION archetype: single atomic op, cycleBudget=3. Score-0 for separate check+write.",
  "appliesTo": ["FLOW-03","FLOW-04","ALL_ORCHESTRATION"],
  "curriculumTier": 3, "qualityScore": 0.90,
  "sourceDocument": "FLOW-03-ARCHITECTURE-DECISIONS.json",
  "connectionType": "FLOW_SCOPED", "knowledgeScope": "GLOBAL"
}
```

**Batch H — D-02-FAN-01 → hist_tw_flow02_d_02_fan_01.json**
```json
{
  "patternId": "hist_tw_flow02_d_02_fan_01",
  "patternType": "DESIGN_REASONING",
  "flowId": "FLOW-02",
  "teachingPoint": "Use Promise.allSettled (not Promise.all) for all FAN_IN parallel source calls. Partial results beat all-or-nothing failure.",
  "positiveExample": "CORRECT: Promise.allSettled([enrichA(), enrichB(), enrichC()]) — one failure returns {status:'rejected'}, others succeed.",
  "negativeExample": "WRONG: Promise.all([enrichA(), enrichB(), enrichC()]) — one failure causes T50 to fail entirely.",
  "discriminatingConstraint": "FAN_IN archetype: one source failing must not prevent the others from contributing. allSettled is canonical.",
  "appliesTo": ["FLOW-02"], "curriculumTier": 3, "qualityScore": 0.88,
  "sourceDocument": "SESSION-TEACH-WHY-FAN-IN.md",
  "connectionType": "FLOW_SCOPED", "knowledgeScope": "GLOBAL"
}
```

**Batch I — GAP-2 → hist_gap_review_002.json (engine architecture ★)**
```json
{
  "patternId": "hist_gap_review_002",
  "patternType": "DESIGN_REASONING",
  "flowId": "ENGINE_ARCHITECTURE",
  "teachingPoint": "NODE = {structure, intent, constraints, quality} is the canonical unit of work. It is distinct from an AF pipeline topology node. The NODE primitive must be a first-class object — not a taskTypeId string pointing to a pre-authored contract.",
  "positiveExample": "CORRECT: Cycle 2 produces NODE with 4 fields: structure (I/O shape), intent (purpose), constraints (DNA+BFA), quality (test criteria). Stack-neutral, immutable once verified.",
  "negativeExample": "WRONG: decompose.handler returns planSteps:[{name:'generate',order:0}] — flat strings. No NODE object. Unit of work is a taskTypeId pointing to a pre-authored ES document.",
  "discriminatingConstraint": "Engine conflates AF pipeline node (a) with XIIGen NODE primitive (b). Only (a) exists. (b) must be built.",
  "appliesTo": ["ALL_FLOWS"], "curriculumTier": 5, "qualityScore": 0.95,
  "sourceDocument": "XIIGEN-GAP-REVIEW-2026-04-01.md GAP-2",
  "connectionType": "FLOW_SCOPED", "knowledgeScope": "GLOBAL"
}
```

**Batch J — D-STACK-1 → hist_locked_stack_1.json (LOCKED ★🔒)**
```json
{
  "patternId": "hist_locked_stack_1",
  "patternType": "DESIGN_REASONING",
  "flowId": "ALL_FLOWS",
  "teachingPoint": "Stack coupling has 4 tiers: CONCEPT_NEUTRAL (rule identical on any stack), IMPL_VARIES (concept identical; syntax differs), STACK_COUPLED (fundamentally different per stack; no shared template), INCOMPATIBLE (cannot be implemented on this stack). Every iron rule must be classified before a genesis prompt is written.",
  "positiveExample": "CORRECT: DNA-5 (tenant scope via AsyncLocalStorage) is CONCEPT_NEUTRAL — identical on NestJS, Laravel, FastAPI. Section 1 neutralIronRules contains it unchanged.",
  "negativeExample": "WRONG: One stackImplementations entry claiming to cover all stacks for a STACK_COUPLED rule. STACK_COUPLED rules require separate entries per StackKey — no shared template.",
  "discriminatingConstraint": "INCOMPATIBLE must include reason + mitigation before implementation begins. CONCEPT_NEUTRAL rules go in section 1 only. Change requires SK-417.",
  "appliesTo": ["ALL_FLOWS"], "curriculumTier": 5, "qualityScore": 0.97,
  "sourceDocument": "docs/decisions/DECISIONS-LOCKED.md D-STACK-1",
  "connectionType": "FLOW_SCOPED", "knowledgeScope": "GLOBAL"
}
```

**Batch K — ARCH-DI-1 → hist_arch_delivery_di_1.json (NestJS DI ★)**
```json
{
  "patternId": "hist_arch_delivery_di_1",
  "patternType": "DESIGN_REASONING",
  "flowId": "ENGINE_ARCHITECTURE",
  "teachingPoint": "Every constructor parameter typed to an interface (IDatabaseService, IAiProvider, etc.) MUST have @Optional() decorator. NestJS erases TypeScript interface types to 'Object' at runtime, causing UnknownDependenciesException without @Optional().",
  "positiveExample": "CORRECT: constructor(@Optional() @Inject(DATABASE_SERVICE) private db: IDatabaseService) {} — @Optional() prevents UnknownDependenciesException.",
  "negativeExample": "WRONG: constructor(@Inject(DATABASE_SERVICE) private db: IDatabaseService) {} — NestJS sees IDatabaseService as type 'Object'. DI throws UnknownDependenciesException. Module fails.",
  "discriminatingConstraint": "@Optional() + @Inject(TOKEN) is the required pair for interface injection in NestJS. @Inject alone is insufficient.",
  "appliesTo": ["ALL_FLOWS"], "curriculumTier": 5, "qualityScore": 0.94,
  "sourceDocument": "docs/architecture/DELIVERY_DOCUMENTATION.md §7",
  "connectionType": "FLOW_SCOPED", "knowledgeScope": "GLOBAL"
}
```

**Batch K — ARCH-DADA-1 → hist_arch_delivery_dada_1.json (Graph Intelligence ★)**
```json
{
  "patternId": "hist_arch_delivery_dada_1",
  "patternType": "DESIGN_REASONING",
  "flowId": "ENGINE_ARCHITECTURE",
  "teachingPoint": "Graph-first confidence-gate: if edge.confidence >= threshold, use graph answer (zero AI cost, bootstrap path). If below threshold, call IAIDecisionPipeline (4-role: blind-shuffled Implementors → AI Arbiters → Upper Manager → DPO storage). Mode: ENGINE_DECISION_MODE=bootstrap|ai-driven.",
  "positiveExample": "CORRECT: Planning request → graph.query(context) returns edge confidence=0.92, threshold=0.85 → return graph answer directly. No AI call. Confidence rises as more flows confirm.",
  "negativeExample": "WRONG: Every planning decision calls AI pipeline regardless of graph state. Graph accumulates outcomes but is never consulted. Zero AI cost savings, no progressive improvement.",
  "discriminatingConstraint": "Bootstrap mode (default) uses static graph lookups. AI-driven activates when confidence is insufficient. Architecture enables gradual transition.",
  "appliesTo": ["ALL_FLOWS"], "curriculumTier": 5, "qualityScore": 0.94,
  "sourceDocument": "docs/architecture/KNOWLEDGE_DIGEST.md §19",
  "connectionType": "FLOW_SCOPED", "knowledgeScope": "GLOBAL"
}
```

---

## §9 — Batch Summary

| Batch | Source | Count | Dest dir | Format | Score | Tier |
|---|---|---|---|---|---|---|
| A-1 | historyRag ARCH-NNN (pass1/pass1b2) | 40 | `rag-patterns/` | A | preserved | varies |
| A-2 | historyRag FLOW-DESIGN ARCH (pass2/pass3) | 21 | `rag-patterns/` | A | preserved | varies |
| B | historyRag FLOW-DESIGN DR (pass2) | 35 | `historical/` | A | preserved | varies |
| C | historyRag ENG-EXT DR (pass3) | 24 | `historical/` | A | preserved | varies |
| D | sessions/ per-flow ARCH-DECISIONS (FLOW-01/03/04) | 12 | `historical/` | B | 0.90 | 3 |
| E | DECISIONS.md DR-P8-001..003 | 3 | `historical/` | C | 0.75 | 3 |
| F | FLOW-07 DR-07-G (append existing) | 1 | `design-reasoning/` | B | 0.87 | 3 |
| G | docs/decisions/ (DECALT, DR-242, ADR-18) | 5 | `historical/` | D/E/F | 0.82-0.91 | 3 |
| H | SESSION-TEACH-WHY-* FLOW-02 | 7 | `historical/` | G | 0.88 | 3 |
| I | XIIGEN-GAP-REVIEW-2026-04-01.md | 5 | `historical/` | H | 0.95 | 5 |
| J | docs/decisions/DECISIONS-LOCKED.md | 25 | `historical/` | I | 0.97 | 5 |
| K | docs/architecture/ (DELIVERY_DOC §7 + KNOWLEDGE_DIGEST §18-19) | 8 | `historical/` | J | 0.94 | 5 |

**Totals:** 61 rag-patterns + 125 historical = **186 fixture files**
