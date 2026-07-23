Now I have a thorough understanding of what's needed. Let me do the no-code explanation first before generating files.

📋 NO-CODE EXPLANATION — FLOW-34: Skill Multi-Target Translation
What We're Building
FLOW-34 extends the XIIGen engine to translate any existing skill (currently .NET server + React Native client) into multi-target implementations across:

Client targets: ReactJS, Vue, Angular, WordPress Plugin, WordPress Theme
Server targets: Node.js, Go, Java, Rust, PHP
The engine principle: We don't port code — we define a Canonical Skill Spec (language/framework-neutral contract + tests + UI intent model), then the existing AF pipeline generates target adapters through fabric interfaces.

5 Phases
Phase 1 — ENGINE ARCHITECTURE (F631–F685, Families 84–93) New factory families: CanonicalSkillSpec store, VariantRegistry, TargetAdapterEngine, WordPress packaging adapter (plugin + theme), per-language MicroserviceBase SDKs, Graph RAG skill index, ConformanceTestRunner. Every factory resolves through an existing fabric (DB/Queue/AI/RAG/Core).

Phase 2 — TASK TYPES CATALOG (T247–T268, Templates 50–57) Full engine contracts for: skill canonicalization extraction, server variant generation (per language), client variant generation (per framework), WordPress plugin packaging gate, WordPress theme packaging gate, cross-variant conformance validation, Graph RAG ingestion, variant selection/routing.

Phase 3 — SKILLS_FACTORY_RAG (SK-145–SK-168) New skill patterns: Canonical Skill Spec format, CLIENT VARIANTS block (mirrors existing LANGUAGE VARIANTS), per-language MicroserviceBase SDK patterns (Go/Java/Rust/PHP/Node), WordPress plugin skill pattern, WordPress theme skill pattern, Graph RAG variant-selection skill.

Phase 4 — BFA_STRESS_TEST (CF-295–CF-332, ST-164–ST-198) Conflict rules: no business logic duplication across variants, no secrets in client bundles, tenant scope enforced in every language variant, idempotency key stable across retries in all client targets, WordPress REST permission_callback required, cross-variant canonical test suite must pass before promotion.

Phase 5 — SESSION_STATE + UNIFIED_SOURCE_INDEX + MASTER_EXECUTION_PLAN State save, artifact cross-reference, 4-phase execution plan (P0=spec normalization, P1=server variants, P2=client variants, P3=WordPress, P4=Graph RAG).

✅ Validation Against Requirements
Requirement	Covered
Fabric-first (no provider imports)	✅ All factories → existing fabrics
Full engine contracts (not stubs)	✅ T247-T268 full format
AF station mapping	✅ Each task type maps AF-1→AF-11
BFA cross-flow validation	✅ CF-295-CF-332
Flow DAG template	✅ Template 50: multi-target translation DAG
Genie DNA (all 6 patterns)	✅ Enforced in all variants
Backward compatibility	✅ T1-T246, F1-F630 unchanged
WordPress plugin + theme	✅ First-class targets with packaging rules
Regular alternatives first → Graph RAG	✅ Phases P0-P3 then P4
"Skill with alternatives" library format	✅ SK-145 defines the extended format
✅ Positive Example
Engine runs T247 on SK-69 (.NET source) → extracts contracts/tests/UI model → stores Canonical Skill Spec in ES via DB Fabric → AF-9 judges DNA compliance → returns DataProcessResult<Dictionary> with canonicalId: "SK-69-canonical-v1". Then T252 runs with targetLanguage: "go" → AF-1 generates Go service implementing MicroserviceBase-Go SDK → AF-7 checks DNA compliance → variant SK-69#server#go promoted to INJECTED.

❌ Negative Example (what we reject)
Engine draft generates a Node file: import { Pool } from 'pg'; const pool = new Pool(...) — BUILD FAILURE: direct provider import violates DNA-4 (MicroserviceBase) and DNA-1 (typed model). Correct: use IDatabaseService.SearchDocuments(filter).

Now generating all 7 files:


Created 6 files, ran a command
Created 6 files, ran a command

Create output directory

Script

FLOW-34 Session State - save point and tracker
34-translate-to-alternatives_SESSION_STATE.md

FLOW-34 Engine Architecture - factories and families
34-translate-to-alternatives_ENGINE_ARCHITECTURE.md

FLOW-34 Task Types Catalog - T247-T268 full engine contracts
34-translate-to-alternatives_TASK_TYPES_CATALOG.md

FLOW-34 Skills Factory RAG - SK-145 to SK-168
34-translate-to-alternatives_SKILLS_FACTORY_RAG.md

FLOW-34 BFA Stress Test - CF-295 to CF-332 and ST-164 to ST-198
34-translate-to-alternatives_V62_BFA_STRESS_TEST.md

FLOW-34 Master Execution Plan
text

# FLOW-34 MASTER EXECUTION PLAN — Skill Multi-Target Translation
## "Translate to Alternatives"

---

## EXECUTIVE SUMMARY

**Goal:** Extend the XIIGen engine to translate any existing skill from .NET/React Native into multi-stack implementations across 5 server languages (Node, Go, Java, Rust, PHP) and 5 client targets (ReactJS, Vue, Angular, WordPress Plugin, WordPress Theme) — without duplicating business logic.

**Strategy:** Canonical Skill Spec (language-neutral truth) → variant adapters generated through existing AF pipeline → fabric-first throughout → Graph RAG for Phase B discovery.

**Phases:** P0 (Foundation) → P1 (Server Variants) → P2 (Client Variants) → P3 (WordPress) → P4 (Graph RAG)

**Starting Numbers:**
```
Factory:     F631   (Family 84)
Task Type:   T247
BFA Rule:    CF-295
Stress Test: ST-164
Skill:       SK-145
Template:    50
DD:          DD-130
DR:          DR-99
```

---

## PHASE P0 — CANONICAL FOUNDATION
**Duration:** 1-2 sessions | **Save Point:** P0_COMPLETE

### P0-1: Engine Architecture Registration
- Register Family 84 (F631–F637): Canonical Skill Store
- Register Family 85 (F638–F644): Variant Registry & Selection
- Register Family 93 (F682–F685): Multi-Target Orchestration Control
- All families: verify fabric resolution mapping in ENGINE_ARCHITECTURE doc

**Validation:**
- F631–F637 resolve through DATABASE FABRIC (ES) ✓
- F638–F644 resolve through DATABASE FABRIC + QUEUE FABRIC ✓
- No factory ID conflict with F1–F630 ✓

### P0-2: Skill Spec Format Definition
- Create SK-145 (Canonical Skill Spec Format)
- Create SK-146 (Variant Descriptor Block Schema)
- Create SK-158 (CloudEvents Envelope Pattern)
- Create SK-159 (OpenAPI Canonical Contract Pattern)
- Create SK-160 (JSON Schema Payload Validator)

**Validation:**
- CLIENT VARIANTS block mirrors LANGUAGE VARIANTS pattern ✓
- CloudEvents required attributes defined ✓
- OpenAPI 3.1 with additionalProperties:true (never fixed typed schema) ✓

### P0-3: Task Types T247–T249
- Define T247 (Canonical Skill Extraction Gate) — full engine contract format
- Define T248 (Skill Variant Descriptor Attach)
- Define T249 (Canonical Spec Conformance Seed)

**Validation:**
- Each task type has: ARCHETYPE, FACTORY DEPENDENCIES, FABRIC RESOLUTION, AF CONFIGURATION, BFA VALIDATION, IRON RULES, QUALITY GATES ✓
- T247 IRON RULES include: no language-specific type names, min 3 golden tests, CloudEvents definition ✓

### P0-4: BFA Rules CF-295–CF-299 + Stress Tests ST-169–ST-171
- CF-295: Source lineage required
- CF-296: No duplicate canonical families
- CF-297–CF-298: API route + DynamicRouter rules
- CF-299: Spec version before variant generation

**Save Point: P0_COMPLETE**
```
Artifacts confirmed:
  Families: 84, 85, 93
  Factories: F631–F637, F638–F644, F682–F685
  Task Types: T247–T249, T268 (orchestrator)
  Skills: SK-145, SK-146, SK-158–SK-160
  BFA: CF-295–CF-299
  Stress Tests: ST-169–ST-171, ST-184, ST-190, ST-193, ST-198 (end-to-end)
```

---

## PHASE P1 — SERVER LANGUAGE VARIANTS
**Duration:** 1-2 sessions | **Save Point:** P1_COMPLETE

### P1-1: Server SDK Family Registration
- Register Family 89 (F662–F667): Server Language SDK Scaffolding
- Register Family 90 (F668–F672): Cross-Variant Conformance Testing
- Register Family 92 (F678–F681): Variant Promotion Pipeline

### P1-2: Server Language SDK Skills
- Create SK-147 (MicroserviceBase-Node SDK Pattern)
- Create SK-148 (MicroserviceBase-Go SDK Pattern)
- Create SK-149 (MicroserviceBase-Java SDK Pattern)
- Create SK-150 (MicroserviceBase-Rust SDK Pattern)
- Create SK-151 (MicroserviceBase-PHP SDK Pattern)
- Create SK-166 (Tenant Scope Propagation — Multi-Language)
- Create SK-167 (Idempotency Key Stability Pattern)
- Create SK-168 (Canonical Test Replay Runner)
- Create SK-161 (Cross-Variant Golden Test Suite)

**Validation for each SDK skill:**
- DataProcessResult equivalent defined ✓
- ParseDocument → map/dict only (no typed domain classes) ✓
- tenantId extraction from auth context documented ✓
- DynamicRouter equivalent documented ✓
- Trace context propagation documented ✓
- Fabric call pattern shown (never direct driver import) ✓
- AI Agent Prompt included ✓

### P1-3: Task Types 
