# XIIGen — FLOW-02 + FCE → SINGLE SOURCE OF TRUTH
## Merge Plan | Date: 2026-02-25
## Status: PLANNING

---

# NO-CODE EXPLANATION

## What We're Doing (Plain English)

Right now, the XIIGen documentation is like a partially assembled IKEA bookshelf. The parts 
are all manufactured (FLOW-02 contracts T50-T52, factories F182-F189; FCE contracts T53-T58, 
factories F190-F196) — they exist in a "parts box" (FCE_EXEC_P1_P5.md). But they haven't been 
inserted into the actual bookshelf yet (the 4 reference documents that AI agents read).

An AI agent reading TASK_TYPES_CATALOG sees T1-T49 and then... nothing. It doesn't know T50 
exists. An agent reading ENGINE_ARCHITECTURE sees F1-F181 and a gap. The catalog says "18 
families" but Family 19 and 20 aren't physically present in the file.

This merge operation takes all the manufactured parts and snaps them into place so every 
reference document is complete, self-consistent, and tells one unified story from F1 to F196, 
from T1 to T58, with all 20 families, 12 flow templates, 7 DNA patterns, and 7 closed BFA gaps.

## What Changes For Each Document

| Document | Before | After |
|----------|--------|-------|
| TASK_TYPES_CATALOG | T1-T49, 18 families, 10 templates | T1-T58, 20 families, 12 templates |
| ENGINE_ARCHITECTURE | F1-F181, 6 DNA, 18 families | F1-F196, 7 DNA, 20 families, Queue+3, BFA G1-G7 ENFORCED |
| UNIFIED_SOURCE_INDEX | FLOW-01/05 only | +FLOW-02 + FCE sections |
| SKILLS_FACTORY_RAG | Family 17-18 only | +Family 19-20 addendum |
| V62_BFA_STRESS_TEST | 7 gaps IDENTIFIED | 7 gaps ENFORCED |

## What Does NOT Change

- T1-T49 content: untouched (backward compatible)
- F1-F181 content: untouched (backward compatible)
- FLOW-01, FLOW-05 extensions: untouched
- basic_prompt.txt: unchanged (foundation)
- All existing flow templates: unchanged

---

# PHASES (4 phases, each ≤30 min, each with state save)

| Phase | Name | Output | Save Key |
|-------|------|--------|----------|
| P1 | TASK_TYPES_CATALOG merge | T50-T58 + Family 19+20 + templates appended | MERGE:P1 |
| P2 | ENGINE_ARCHITECTURE merge | F182-F196 + Queue+3 + DNA-7 + BFA G1-G7 appended | MERGE:P2 |
| P3 | Supporting docs merge | UNIFIED_SOURCE_INDEX + SKILLS_RAG + V62 updated | MERGE:P3 |
| P4 | Final validation + state save | Cross-doc integrity check, final state doc | MERGE:P4 |

### Recovery
- "Continue MERGE from P1" → Start TASK_TYPES_CATALOG merge
- "Continue MERGE from P2" → Start ENGINE_ARCHITECTURE merge  
- "Continue MERGE from P3" → Start supporting docs merge
- "Continue MERGE from P4" → Run validation + produce final state

---

# PLAN VALIDATION — REQUIREMENTS COVERAGE

## basic_prompt.txt Requirements

| # | Requirement | Covered? | Where |
|---|-------------|----------|-------|
| R1 | New FACTORY INTERFACES each resolving through FABRIC | ✅ | P2: F182-F189 (FLOW-02) + F190-F196 (FCE) |
| R2 | New ENGINE CONTRACTS in FULL format | ✅ | P1: T50-T52 + T53-T58 |
| R3 | AF STATION MAPPING for new capabilities | ✅ | P1: 11-station map per contract |
| R4 | BFA CROSS-FLOW VALIDATION | ✅ | P1: BFA per contract + P2: G1-G7 indexes |
| R5 | FLOW TEMPLATE (DAG for FlowOrchestrator) | ✅ | P1: business-onboarding-v1 + FCE templates |
| R6 | GENIE DNA COMPLIANCE (6+1 patterns) | ✅ | P2: DNA-7 added, 261/261 compliance |
| R7 | MACHINE/FREEDOM classification | ✅ | P1: every T50-T58 has M/F section |
| R8 | Backward compatibility | ✅ | P4: numbering chain proof F1-F196, T1-T58 |
| R9 | Fabric-first UI | ✅ | P1: T56 + P2: F195 component model |
| R10 | No typed models | ✅ | P2: DNA-1 enforced on all factories |
| R11 | No direct provider imports | ✅ | P2: Fabric resolution tables on all F182-F196 |
| R12 | MicroserviceBase on all | ✅ | P2: DNA-4 enforced |

## FLOW-02 Specification Requirements

| # | Requirement | Covered? | Source |
|---|-------------|----------|--------|
| F2-1 | 3 parallel branches | ✅ | T50 fork-join |
| F2-2 | Matching algorithm (4 weights) | ✅ | T51 FREEDOM section |
| F2-3 | Feed + Events personalization | ✅ | F188 + F189 |
| F2-4 | Graceful degradation | ✅ | T50 degraded_ok |
| F2-5 | OnboardingCompleted gates downstream | ✅ | T52 CF-8 BFA |
| F2-6 | 4 data stores | ✅ | F182-F189 fabric resolution |
| F2-7 | Cache TTLs | ✅ | T50/T51 FREEDOM |
| F2-8 | Debounce (5-min) | ✅ | Queue SupersedeAsync |
| F2-9 | GDPR erasure cascade | ✅ | T52 + G6 |

## FCE Requirements

| # | Requirement | Covered? | Source |
|---|-------------|----------|--------|
| FCE-1 | Flow DSL compilation | ✅ | T53 |
| FCE-2 | DAG runtime (fork/join/wait/timeout) | ✅ | T54 |
| FCE-3 | Event reliability (CloudEvents, outbox) | ✅ | T55 |
| FCE-4 | Visual builder (fabric-first) | ✅ | T56 |
| FCE-5 | AI flow composition | ✅ | T57 |
| FCE-6 | Engine self-extension | ✅ | T58 |
| FCE-7 | Queue Fabric extension (+3) | ✅ | OutboxWriteAsync, SupersedeAsync, CorrelateAsync |
| FCE-8 | DNA-7 (W3C Trace Context) | ✅ | P2 DNA section |
| FCE-9 | BFA G1-G7 enforcement | ✅ | P2 BFA indexes |
| FCE-10 | FLOW-02 v2 migration | ✅ | T59/P1 flow template |

## Anti-Pattern Check

| # | Anti-Pattern | Verified Not Present |
|---|-------------|---------------------|
| AP1 | Services as standalone | ✅ All via fabric |
| AP2 | Skip fabric resolution | ✅ Every F has table |
| AP3 | One-line task stubs | ✅ Full format on all |
| AP4 | No AF mapping | ✅ 11-station per T |
| AP5 | Direct provider imports | ✅ Fabric only |
| AP6 | Typed models | ✅ Dictionary only |
| AP7 | Breaking backward compat | ✅ T1-T49, F1-F181 untouched |
| AP8 | Platform-specific UI | ✅ Config docs only |
| AP9 | FCE before FLOW-02 | ✅ T50-T52 before T53 |

---

# POSITIVE AND NEGATIVE EXAMPLES

## Example 1: Factory in TASK_TYPES_CATALOG

### ✅ POSITIVE (what we produce)
```
TASK TYPE: T50 — Parallel Profile Enrichment Gate
ARCHETYPE: ORCHESTRATION
ENTRY: Fires after UserOnboardingCompleted (FLOW-01 T49 output)
PURPOSE: Fork into 3 parallel branches (Profile, Analytics, Learning)
DISTINCT FROM: T44 (single-branch fan-out), T40 (3-way join — merge, not fork)
FACTORY DEPENDENCIES: F182, F184, F185 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F182→DATABASE FABRIC(MongoDB), F184→DATABASE FABRIC(Elasticsearch),
  F185→AI ENGINE FABRIC(Claude/Gemini)
AF CONFIGURATION: AF-1 generates, AF-4 finds Skill 05/07 patterns, AF-9 validates
BFA VALIDATION: CF-1 (profile field conflicts), CF-2 (analytics overlap)
MACHINE: fork/join orchestration, timeout enforcement (30s branch, 60s total)
FREEDOM: degraded_ok flags per branch, retry intervals, TTLs
IRON RULES: IR-1 through IR-8 (fork MUST have matching join, etc.)
QUALITY GATES: QG-1 through QG-7
```

### ❌ NEGATIVE (what we must NOT produce)
```
T50: Profile Enrichment — Creates business profiles with 3 branches.
Uses PostgreSQL for storage and calls matching service directly.
```
(Missing: ARCHETYPE, FACTORY DEPS, FABRIC RESOLUTION, AF CONFIG, BFA, IRON RULES, QG)

## Example 2: Factory in ENGINE_ARCHITECTURE

### ✅ POSITIVE
```
F183 — IMatchingService
  Family: 19 (Business Onboarding Intelligence)
  Methods: CalculateCompatibility, FindMatches, GetMatchScore, UpdateMatchWeights
  Fabric Resolution:
    Primary: DATABASE FABRIC → PostgreSQL (match_scores index)
    Cache: DATABASE FABRIC → Redis (match-cache:{userId}, TTL: 12h)
    AI: AI ENGINE FABRIC → Claude/Gemini (weight tuning)
  DNA Compliance: 7/7 ✅
  Machine: Cosine similarity base algorithm, minimum 4 factors
  Freedom: Factor weights (industry, location, stage, interest) — ES config doc
  Factory Creation Block:
    var matchingService = await _factory.CreateAsync<IMatchingService>(ctx);
    var result = await matchingService.FindMatches(userId, criteria);
```

### ❌ NEGATIVE
```
F183: Matching Service — handles matching between businesses.
Uses direct PostgreSQL queries and imports NpgsqlConnection.
class MatchResult { public string UserId; public double Score; }
```
(Violates: fabric resolution missing, direct import, typed model)

## Example 3: BFA Gap Status

### ✅ POSITIVE
```
G1 | Event payload changes don't trigger T32 | CRITICAL | ENFORCED |
  Enforcement: EVENT_SCHEMA_CHANGE index in Elasticsearch
  Runtime: IChangeDetector extended with event schema diff capability
  Reference: T55 (Event Reliability Gate) AF-9 QG-2
```

### ❌ NEGATIVE
```
G1 | Event payload changes | IDENTIFIED | TODO
```
(Not actionable — missing enforcement artifact, still marked as open)

---

# STATE TRACKING
MERGE_STATE: PLANNING_COMPLETE
NEXT: Execute Phase 1
DATE: 2026-02-25
