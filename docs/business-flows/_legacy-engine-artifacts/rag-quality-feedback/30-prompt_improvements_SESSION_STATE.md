# XIIGen SESSION STATE — Post FLOW-30 Specification
## Date: 2026-03-01
## Status: FLOW-30 SPECIFIED ✅ — 7 canonical files produced (not yet merged into main docs)

---

## SYSTEM STATE (Post FLOW-30 Specification)

| Artifact | Pre-FLOW-30 | FLOW-30 Adds | Post-FLOW-30 Total |
|----------|-------------|-------------|-------------------|
| Factories | 1074 (F1–F1274) | +23 (F1275–F1297) | 1097 |
| Families | 174 | +6 (175–180) | 180 |
| Task Types | 444 (T1–T444) | +21 (T445–T465) | 465 |
| Templates | 89 (1–89) | +3 (90–92) | 92 |
| BFA Rules | 569 (CF-1–CF-569) | +25 (CF-570–CF-594) | 594 |
| Stress Tests | 339 (ST-1–ST-339) | +15 (ST-340–ST-354) | 354 |
| Skills | 260 (SK-1–SK-260) | +10 (SK-261–SK-270) | 270 |
| Design Decisions | 264 (DD-1–DD-264) | +5 (DD-265–DD-269) | 269 |
| Design Records | 199 (DR-1–DR-199) | +3 (DR-200–DR-202) | 202 |
| Flows Complete | 25 (FLOW-01–FLOW-25) | +1 (FLOW-30) | 26 defined |

> NOTE: Flows 26–29 are not yet specified. FLOW-30 starting numbers assume
> FLOW-26–FLOW-29 collectively consumed F1075–F1274, T389–T444, Families 154–173.
> Actual merge numbers should be reconciled against FLOW-26–29 actuals before merging.

---

## NEXT AVAILABLE NUMBERS (FLOW-31 starts here)

```
Factory:         F1298    Family: 181
Task Type:       T466
Template:        93
BFA Rule:        CF-595
Stress Test:     ST-355
Skill:           SK-271
Design Decision: DD-270
Design Record:   DR-203
```

---

## FLOW REGISTRY (FLOW-30 added)

| Flow | Domain | Factories | Task Types | Families |
|------|--------|-----------|------------|----------|
| FLOW-01 | User Registration | F174–F181 | T47–T49 | 18 |
| FLOW-02 | Content Management | F182–F189 | T50–T52 | 19 |
| FLOW-03 | Event Creation & Promotion | F197–F204 | T59–T62 | 21 |
| FLOW-04 | Notification Pipeline | F190–F196 | T53–T58 | 20 |
| FLOW-05 | Lesson Gamification | F166–F173 | T44–T46 | 17 |
| FLOW-06 | Marketplace Publishing | F225–F233 | T63–T72 | 25 |
| FLOW-07 | Friend Request & Feed | F234–F243 | T73–T82 | 26 |
| FLOW-08 | Payment Processing | F244–F260 | T83–T98 | 27–29 |
| FLOW-09 | Search & Discovery | F261–F280 | T99–T118 | 30–33 |
| FLOW-10 | Analytics & Reporting | F281–F300 | T119–T138 | 34–37 |
| FLOW-11 | Media Processing | F301–F320 | T139–T158 | 38–41 |
| FLOW-12 | Chat & Messaging | F321–F350 | T159–T168 | 42–47 |
| FLOW-13 | AI Content Pipeline | F351–F380 | T169–T178 | 48–53 |
| FLOW-14 | Warehouse & Logistics | F381–F420 | T179–T198 | 54–59 |
| FLOW-15 | MVP Builder Platform | F466–F565 | T179–T218 | 60–73 |
| FLOW-16 | Giant Shop Platforms | F566–F579 | T219–T226 | 74 |
| FLOW-17 | Freelancer Marketplace | F580–F630 | T227–T246 | 75–83 |
| FLOW-18 | Visual Flow Creation & Code Injection | F631–F696 | T247–T268 | 84–93 |
| FLOW-19 | CI/CD & DevOps Control Plane | F697–F733 | T269–T286 | 94–102 |
| FLOW-20 | Sponsored Content + Graph API | F734–F851 | T287–T306 | 103–118 |
| FLOW-21 | Forms & Flow Automation Builder | F852–F900 | T307–T326 | 119–127 |
| FLOW-22 | Visual Editor & Site Builder Platform | F901–F944 | T327–T346 | 128–134 |
| FLOW-23 | Visual Editor Extended | F945–F981 | T347–T366 | 135–139 |
| FLOW-24 | Learning Calendar Extension | F982–F1027 | T367–T374 | 140–146 |
| FLOW-25 | Business Flow Arbiter | F1028–F1074 | T375–T388 | 147–153 |
| FLOW-26 | [Not yet specified] | F1075–? | T389–? | 154–? |
| FLOW-27 | [Not yet specified] | TBD | TBD | TBD |
| FLOW-28 | [Not yet specified] | TBD | TBD | TBD |
| FLOW-29 | [Not yet specified] | TBD | TBD | TBD |
| **FLOW-30** | **PromptOps — Self-Learning Prompt Engineering** | **F1275–F1297** | **T445–T465** | **175–180** |

---

## FLOW-30 DETAILS

### Domain: PromptOps — Self-Learning Prompt Engineering Engine Extension

Adds prompt versioning, optimization loops, canary promotion, and meta-learning RAG as
first-class engine capabilities. Every node execution produces replayable traces.
When judge scores fall below threshold or user feedback is negative, an optimization
sub-flow generates improved prompt candidates, validates them on eval suites, and
canary-promotes winners through multi-gate governance. Prompts are immutable versioned
assets — never silently mutated. Multi-tenant safe: MACHINE fields locked, FREEDOM fields
configurable per tenant. Self-learning via PromptOps RAG (separate from operational RAG)
using hybrid vector+graph retrieval for evidence-based improvement.

### Zones (6 Families)

| Zone | Scope | Family | Factories |
|------|-------|--------|-----------|
| A — Prompt Asset Control Plane | Templates, Versions, Policies, Patches, Rubrics | 175 | F1275–F1279 |
| B — PromptOps RAG (Meta-Memory) | Hybrid retrieval, trace indexing, eval assets | 176 | F1280–F1283 |
| C — Prompt Optimization Engine | Critic, Editor, Guard, Evaluator | 177 | F1284–F1287 |
| D — Canary Promotion Pipeline | Assignment, Decisions, Routing, Rollback | 178 | F1288–F1291 |
| E — PromptOps Observability | Trace, Metrics, Audit (append-only) | 179 | F1292–F1294 |
| F — Multi-Tenant PromptOps Safety | Tenant profiles, cross-tenant learning, scope guard | 180 | F1295–F1297 |

### Archetypes (5)

| Archetype | Task Types | Description |
|-----------|-----------|-------------|
| ORCHESTRATION | T445, T447, T449, T450, T454, T455, T456, T460, T462 | Selection, trigger gates, promotion, routing, overrides |
| AI_GENERATION | T446, T451, T452, T461 | Execution, critique, candidate generation, cross-tenant learning |
| JUDGMENT | T448, T453 | Verdict capture, eval suite evaluation |
| EVENT_PROCESSING | T457, T458, T459, T463, T464 | Rollback, RAG ingestion, harvest, metrics, audit |
| COMPLIANCE | T465 | Prompt injection guard |

### Critical Iron Rules (FLOW-30)

1. PromptOps RAG must be separate from Operational RAG — CF-570
2. Single-judge verdict cannot promote to production — CF-571
3. Prompt version text is immutable after creation — CF-572
4. Audit log is append-only, never mutated — CF-574
5. Injection detection must fire SECURITY_ALERT — CF-575
6. PII traces excluded from eval suite harvest — CF-577
7. MACHINE fields locked per tenant — CF-580
8. Backward compatibility with FLOW-01–FLOW-29 — CF-594

---

## FILES PRODUCED THIS SESSION

| File | Status | Content |
|------|--------|---------|
| 30-prompt_improvements_ENGINE_ARCHITECTURE.md | ✅ Complete | 6 families, 23 factories, fabric map, DD/DR |
| 30-prompt_improvements_TASK_TYPES_CATALOG.md | ✅ Complete | 21 full engine contracts T445–T465, 3 templates |
| 30-prompt_improvements_SKILLS_FACTORY_RAG.md | ✅ Complete | 10 skills SK-261–SK-270 with patterns |
| 30-prompt_improvements_V62_BFA_STRESS_TEST.md | ✅ Complete | 25 BFA rules CF-570–CF-594, 15 stress tests |
| 30-prompt_improvements_UNIFIED_SOURCE_INDEX.md | ✅ Complete | Full cross-reference all artifacts |
| 30-prompt_improvements_SESSION_STATE.md | ✅ Complete | This file |
| 30-prompt_improvements_MASTER_EXECUTION_PLAN.md | ✅ Complete | P0–P6 phased plan |

---

## MERGE INSTRUCTIONS (when merging FLOW-30 into canonical docs)

1. RESOLVE FLOW-26–29 FIRST: Confirm actual factory/task type numbers for FLOW-26–29
   before merging FLOW-30 (numbers may shift if flows 26–29 used different ranges).

2. UPDATE ENGINE_ARCHITECTURE_MERGED.md:
   - Add Families 175–180 (F1275–F1297) to factory registry
   - Add DD-265–DD-269 to design decisions section
   - Add DR-200–DR-202 to design records section

3. UPDATE TASK_TYPES_CATALOG_MERGED.md:
   - Append T445–T465 (full contracts)
   - Add Templates 90–92

4. UPDATE SKILLS_FACTORY_RAG_MERGED.md:
   - Append SK-261–SK-270

5. UPDATE V62_BFA_STRESS_TEST_MERGED.md:
   - Append CF-570–CF-594
   - Append ST-340–ST-354

6. UPDATE UNIFIED_SOURCE_INDEX_MERGED.md:
   - Append FLOW-30 cross-references

7. UPDATE SESSION_STATE_MERGE.md:
   - Register FLOW-30 in flow registry
   - Update all artifact counts
   - Set NEXT AVAILABLE to F1298/T466/CF-595/ST-355/SK-271/DD-270/DR-203/Template-93

---

## RECOVERY PROTOCOL

If session interrupted, resume with:
1. Files are in /mnt/user-data/outputs/ (all 7 files)
2. Numbers: F1275–F1297, T445–T465, CF-570–CF-594, ST-340–ST-354, SK-261–SK-270
3. Next flow starts at F1298, T466, CF-595, Family 181
4. Merge depends on FLOW-26–29 number confirmation
