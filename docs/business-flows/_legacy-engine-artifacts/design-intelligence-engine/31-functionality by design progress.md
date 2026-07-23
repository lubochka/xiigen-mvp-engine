NO-CODE EXPLANATION — FLOW-31: Design Intelligence Engine
What FLOW-31 Is
FLOW-31 extends the XIIGen engine to understand Figma screens as structured functional artifacts — not pixels — and use GraphRAG + Vector RAG to map each screen to Genie DNA modules, infer system type (shop / social / report / etc.), and complete missing functionality. This is the engine capability described in the 31-functionality_by_a_design*.md documents.

THE 7 PHASES
PHASE 1 — Plan, Validate, Examples (this session)
Define all artifact numbers. Validate coverage. Produce examples. Write SESSION_STATE stub.

PHASE 2 — ENGINE_ARCHITECTURE
Factories F1075–F1142, Families 154–162 (9 zones × 7-8 factories each). Zones: Figma Ingestion → DesignIR Processing → AI Semantic → Graph Index → Vector → Module Mapping → System Type → Gap Completion → Learning Loop. Save point: file 31-functionality by a design ENGINE_ARCHITECTURE.md

PHASE 3 — TASK_TYPES_CATALOG
Task types T389–T415 (27 contracts, full engine format — ARCHETYPE, FACTORY DEPENDENCIES, FABRIC RESOLUTION, AF CONFIGURATION, BFA VALIDATION, IRON RULES, QUALITY GATES). Save point: file 31-functionality by a design TASK_TYPES_CATALOG.md

PHASE 4 — SKILLS_FACTORY_RAG
Skills SK-251–SK-265 (15 skills: Figma ingest, DesignIR, screen semantics, UI graph, GraphRAG retrieval, vector embedding, module mapping, system type, gap completion, learning loop, evidence gate, multimodal prompt, design token, prototype flow, feedback correction). Save point: file 31-functionality by a design SKILLS_FACTORY_RAG.md

PHASE 5 — V62_BFA_STRESS_TEST
BFA rules CF-510–CF-551 (42 rules). Stress tests ST-300–ST-325 (26 tests). Key conflicts: Figma rate limit abuse, schema drift across tenants, typed model creation (DNA-1 violation), cross-flow entity naming collision with existing FLOW-01–FLOW-25. Save point: file 31-functionality by a design V62_BFA_STRESS_TEST.md

PHASE 6 — UNIFIED_SOURCE_INDEX
Design Decisions DD-245–DD-264 (20). Design Records DR-184–DR-197 (14). Templates 83–90 (8 JSON DAG templates: ingestion, semantics, graph build, mapping, gap, feedback). Save point: file 31-functionality by a design UNIFIED_SOURCE_INDEX.md

PHASE 7 — MASTER_EXECUTION_PLAN + SESSION_STATE
P0–P7 execution plan (8 phases, each 15-45 min). Final SESSION_STATE with all numbers updated. Save point: both files.

PLAN VALIDATION
Requirement from basic_prompt.txt	Covered?
Every factory declares WHICH FABRIC it resolves through	✅ Phase 2 — each factory maps to DATABASE/QUEUE/AI/RAG/CORE/FLOW fabric
Full engine contract format for every task type	✅ Phase 3 — 27 task types with all 10 fields
AF station mapping (Genesis → Judge → Feedback)	✅ Phase 3 — each T has AF CONFIGURATION
BFA cross-flow validation (FLOW-01–FLOW-25 checked)	✅ Phase 5 — CF-510+ rules check all prior flows
Flow template (JSON DAG for FlowOrchestrator)	✅ Phase 6 — Templates 83–90
Genie DNA compliance (all 9 patterns)	✅ Phase 4 skills + Phase 5 BFA rules enforce all
No typed models (ParseDocument — DNA-1)	✅ ScreenSemanticsIR is Dictionary<string,object>
Backward compatibility (T1–T388, F1–F1074 unchanged)	✅ New numbers start at T389, F1075
UI fabric-first (zero platform-specific values)	✅ Phase 4 SK-257/258 enforce module config docs
Learning loop (feedback improves future AI calls)	✅ Phase 2 F1133–F1137, Phase 4 SK-260/265
GraphRAG + Vector RAG both present	✅ Dual fabric — RAG FABRIC routes to Graph strategy + Vector strategy
Module matrix from module-architecture used as ontology	✅ Phase 2 F1114 ModuleMatrixLoader + Phase 3 T408–T411
Figma rate limiting / caching as first-class requirement	✅ F1082 FigmaRateLimitGuard + DR-184
✅ ALL requirements covered.

POSITIVE EXAMPLE (expected output)
Input: 3 Figma screens — product grid, product detail with "Add to Cart", checkout summary.

Engine produces:

json
{
  "systemModelIR": {
    "system_type_candidates": [{"type":"store","confidence":0.94}],
    "module_map": [
      {"screen":"ProductGrid","modules":["Catalog","Search/Filter"],"confidence":0.91},
      {"screen":"ProductDetail","modules":["Catalog","Cart","Pricing"],"confidence":0.88},
      {"screen":"CheckoutSummary","modules":["Checkout","Invoice"],"confidence":0.85}
    ],
    "gaps": [
      {"missing_module":"Invoices/Receipts","severity":"HIGH","reason":"Cart+Checkout exist but no receipt screen"},
      {"missing_module":"EmptyState","severity":"MEDIUM","reason":"ProductGrid has no empty-results variant"}
    ],
    "evidence": [
      {"claim":"Catalog","nodeId":"5:32","text":"ProductCard","component":"ProductCard/default"}
    ]
  }
}
```
Every module claim has `evidence[]` with nodeId + text. BFA confirms no conflict with FLOW-16 (Giant Shop) entities.

---

## NEGATIVE EXAMPLE (what the engine rejects)

**Bad**: AI returns `"system_type": "shop"` with no evidence. Judge (AF-9) fires **EVIDENCE_COVERAGE_GATE_FAIL** — every module/action/entity claim must reference ≥1 evidence item. Build stops.

**Bad**: Service code does `var product = new ProductModel()` — DNA-1 violation, `ParseDocument` gate fires, CF-510 blocks promotion.

**Bad**: Factory F1099 calls `new Neo4jClient()` directly — DNA-4 violation, must go through DATABASE FABRIC (Skill 05) IDatabaseService.

---

## ARTIFACT NUMBERS (FLOW-31)
```
Factory:         F1075–F1142  (68 factories)
Family:          154–162      (9 families)
Task Type:       T389–T415    (27 types)
Template:        83–90        (8 templates)
BFA Rule:        CF-510–CF-551 (42 rules)
Stress Test:     ST-300–ST-325 (26 tests)
Skill:           SK-251–SK-265 (15 skills)
Design Decision: DD-245–DD-264 (20 decisions)
Design Record:   DR-184–DR-197 (14 records)
Now I'll build all 7 files. Starting with Phase 2 (ENGINE_ARCHITECTURE), then proceeding through each phase.


Orchestrated generation of seven interconnected architecture files
Orchestrated generation of seven interconnected architecture files

Check skills directory structure
Good. Now let me create the 7 output files. I'll start with the ENGINE_ARCHITECTURE file, which is the largest and most important.

Done
Now building all 7 files. Starting with ENGINE_ARCHITECTURE:


Created 4 files
Created 4 files

FLOW-31 ENGINE_ARCHITECTURE - Factory registry for Design Intelligence engine
31-functionality by a design ENGINE_ARCHITECTURE.md

FLOW-31 TASK_TYPES_CATALOG - 27 engine contracts T389-T415
31-functionality by a design TASK_TYPES_CATALOG.md

FLOW-31 SKILLS_FACTORY_RAG - 15 skills SK-251 to SK-265
31-functionality by a design SKILLS_FACTORY_RAG.md

FLOW-31 BFA Stress Test - BFA rules CF-510 to CF-572 and stress tests ST-300 to ST-325
text

# FLOW-31 — BFA STRESS TEST
## Domain: Design Intelligence — Figma Screen Understanding, GraphRAG Module Mapping, Gap Completion
## Status: COMPLETE ✅
## BFA Rules: CF-510–CF-572 (63 rules)