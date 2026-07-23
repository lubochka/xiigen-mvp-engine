# FLOW-34 MERGE MASTER PLAN — Skill Multi-Target Translation
## Date: 2026-03-03 | Status: PLANNING
## Mission: Merge FLOW-34 into all 7 canonical documents with correct post-FLOW-33 numbering

---

# ═══ RENUMBER MAP ═══

## Starting Points

| Artifact | FLOW-34 Input Uses | Actual Post-FLOW-33 Start | Offset |
|----------|--------------------|--------------------------|--------|
| Factory | F631 | F1429 | +798 |
| Family | 84 | 213 | +129 |
| Task Type | T247 | T543 | +296 |
| Template | 50 | 126 | +76 |
| BFA Rule | CF-295 | CF-751 | +456 |
| Stress Test | ST-164 | ST-463 | +299 |
| Skill | SK-145 | SK-355 | +210 |
| Design Decision | DD-130 | DD-342 | +212 |
| Design Record | DR-99 | DR-255 | +156 |

## Ending Points (After FLOW-34)

| Artifact | FLOW-34 Input End | Actual End | Count |
|----------|-------------------|------------|-------|
| Factory | F685 | F1483 | 55 |
| Family | 93 | 222 | 10 |
| Task Type | T268 | T564 | 22 |
| Template | 57 | 133 | 8 |
| BFA Rule | CF-332 | CF-788 | 38 |
| Stress Test | ST-198 | ST-497 | 35 |
| Skill | SK-168 | SK-378 | 24 |
| Design Decision | DD-145 | DD-357 | 16 |
| Design Record | DR-110 | DR-266 | 12 |

## Family Renumber Map

| Original | Renumbered | Domain |
|----------|-----------|--------|
| Family 84 | Family 213 | Canonical Skill Store & Spec Management |
| Family 85 | Family 214 | Variant Registry & Selection Engine |
| Family 86 | Family 215 | Target Adapter Code Generation |
| Family 87 | Family 216 | WordPress Plugin Packaging |
| Family 88 | Family 217 | WordPress Theme Packaging |
| Family 89 | Family 218 | Server Language SDK Scaffolding |
| Family 90 | Family 219 | Cross-Variant Conformance Testing |
| Family 91 | Family 220 | Graph RAG Skill Index |
| Family 92 | Family 221 | Variant Promotion Pipeline |
| Family 93 | Family 222 | Multi-Target Orchestration Control |

## Factory Renumber Map (F631→F1429 through F685→F1483)

| Original | Renumbered | Interface |
|----------|-----------|-----------|
| F631 | F1429 | ICanonicalSkillSpecService |
| F632 | F1430 | ISkillFamilyRegistryService |
| F633 | F1431 | ISkillSpecVersioningService |
| F634 | F1432 | ISkillContractValidatorService |
| F635 | F1433 | ISkillMetadataIndexService |
| F636 | F1434 | ISkillGoldenTestStoreService |
| F637 | F1435 | ISkillLineageTrackerService |
| F638 | F1436 | IVariantRegistryService |
| F639 | F1437 | IVariantSelectorService |
| F640 | F1438 | IVariantMaturityService |
| F641 | F1439 | IVariantDependencyService |
| F642 | F1440 | IVariantConformanceStatusService |
| F643 | F1441 | IVariantEventPublisherService |
| F644 | F1442 | IVariantFallbackService |
| F645 | F1443 | IAdapterGenerationOrchestratorService |
| F646 | F1444 | IServerAdapterGeneratorService |
| F647 | F1445 | IClientAdapterGeneratorService |
| F648 | F1446 | IAdapterPromptLibraryService |
| F649 | F1447 | IAdapterDNAComplianceService |
| F650 | F1448 | IAdapterBundleStoreService |
| F651 | F1449 | IAdapterRetryOrchestratorService |
| F652 | F1450 | IWpPluginScaffoldService |
| F653 | F1451 | IWpSettingsPageService |
| F654 | F1452 | IWpBlockGeneratorService |
| F655 | F1453 | IWpPluginPackagingService |
| F656 | F1454 | IWpRestProxyGeneratorService |
| F657 | F1455 | IWpThemeJsonGeneratorService |
| F658 | F1456 | IWpTemplatePartGeneratorService |
| F659 | F1457 | IWpBlockPatternGeneratorService |
| F660 | F1458 | IWpThemePackagingService |
| F661 | F1459 | IWpTokenExportService |
| F662 | F1460 | IMicroserviceSdkGeneratorService |
| F663 | F1461 | IDataProcessResultAdapterService |
| F664 | F1462 | IDynamicRoutingAdapterService |
| F665 | F1463 | ITenantScopeAdapterService |
| F666 | F1464 | ISdkConformanceValidatorService |
| F667 | F1465 | ISdkArtifactStoreService |
| F668 | F1466 | IConformanceTestOrchestratorService |
| F669 | F1467 | IGoldenTestReplayService |
| F670 | F1468 | IVariantTestReporterService |
| F671 | F1469 | IApiConformanceCheckerService |
| F672 | F1470 | IEventEnvelopeValidatorService |
| F673 | F1471 | IGraphSkillIndexService |
| F674 | F1472 | IGraphEdgeLinkingService |
| F675 | F1473 | IGraphVariantQueryService |
| F676 | F1474 | IGraphCoverageReportService |
| F677 | F1475 | IGraphSyncService |
| F678 | F1476 | IVariantPromotionOrchestratorService |
| F679 | F1477 | IPromotionGateService |
| F680 | F1478 | IPromotionAuditService |
| F681 | F1479 | IPromotionRollbackService |
| F682 | F1480 | IMultiTargetTranslationOrchestratorService |
| F683 | F1481 | ITranslationTraceService |
| F684 | F1482 | ITranslationEventBusService |
| F685 | F1483 | ITranslationDashboardService |

## Task Type Renumber Map

| Original | Renumbered | Name |
|----------|-----------|------|
| T247 | T543 | Canonical Skill Extraction Gate |
| T248 | T544 | Skill Variant Descriptor Attach |
| T249 | T545 | Canonical Spec Conformance Seed |
| T250 | T546 | Server Variant Generation — Node |
| T251 | T547 | Server Variant Generation — Go |
| T252 | T548 | Server Variant Generation — Java |
| T253 | T549 | Server Variant Generation — Rust |
| T254 | T550 | Server Variant Generation — PHP |
| T255 | T551 | Server Variant Cross-Language Judge |
| T256 | T552 | Client Variant Generation — ReactJS |
| T257 | T553 | Client Variant Generation — Vue |
| T258 | T554 | Client Variant Generation — Angular |
| T259 | T555 | Client Variant Fabric Compliance Gate |
| T260 | T556 | WordPress Plugin Packaging Gate |
| T261 | T557 | WordPress Theme Packaging Gate |
| T262 | T558 | WordPress Security & Auth Gate |
| T263 | T559 | Cross-Variant Conformance Runner |
| T264 | T560 | Variant Promotion Ladder Gate |
| T265 | T561 | Graph RAG Node Ingestion |
| T266 | T562 | Graph RAG Edge Linking |
| T267 | T563 | Graph RAG Variant Selection Query |
| T268 | T564 | Multi-Target Translation Orchestrator |

## Skill Renumber Map

| Original | Renumbered | Name |
|----------|-----------|------|
| SK-145 | SK-355 | Canonical Skill Spec Format |
| SK-146 | SK-356 | Variant Descriptor Block Schema |
| SK-147 | SK-357 | MicroserviceBase-Node SDK Pattern |
| SK-148 | SK-358 | MicroserviceBase-Go SDK Pattern |
| SK-149 | SK-359 | MicroserviceBase-Java SDK Pattern |
| SK-150 | SK-360 | MicroserviceBase-Rust SDK Pattern |
| SK-151 | SK-361 | MicroserviceBase-PHP SDK Pattern |
| SK-152 | SK-362 | ReactJS Client Variant Adapter |
| SK-153 | SK-363 | Vue Client Variant Adapter |
| SK-154 | SK-364 | Angular Client Variant Adapter |
| SK-155 | SK-365 | WordPress Plugin Variant Adapter |
| SK-156 | SK-366 | WordPress Theme Variant Adapter |
| SK-157 | SK-367 | WordPress Block Variant Adapter |
| SK-158 | SK-368 | CloudEvents Envelope Pattern |
| SK-159 | SK-369 | OpenAPI Canonical Contract Pattern |
| SK-160 | SK-370 | JSON Schema Payload Validator |
| SK-161 | SK-371 | Cross-Language Conformance Runner |
| SK-162 | SK-372 | Graph RAG Skill Node Schema |
| SK-163 | SK-373 | Graph RAG Edge Type Catalog |
| SK-164 | SK-374 | Variant Promotion Workflow |
| SK-165 | SK-375 | Multi-Target Translation DAG |
| SK-166 | SK-376 | WP Plugin Packaging Checklist |
| SK-167 | SK-377 | WP Theme Packaging Checklist |
| SK-168 | SK-378 | SDK DNA Conformance Matrix |

---

# ═══ PHASES ═══

## Phase 0: Setup & Renumber Script
**Save Point: P0_RENUMBER_READY**
- Create renumber JSON map
- Create sed/Python renumber script
- Test on one small file
- Validate no collisions with existing F1-F1428, T1-T542, etc.

## Phase 1: SESSION_STATE_MERGE.md
**Save Point: P1_SESSION_STATE_DONE**
- Copy original to working dir
- Append FLOW-34 section (renumbered)
- Update global artifact counts
- Update "Next Available Numbers"
- Update Flow Registry table
- Validate: no duplicate F/T/SK numbers

## Phase 2: ENGINE_ARCHITECTURE_MERGED.md
**Save Point: P2_ENGINE_ARCH_DONE**
- Copy original to working dir
- Append all 10 renumbered families (213-222)
- Each factory with: Interface, Fabric Resolution, Purpose
- Validate: all F-references are renumbered, no stale F631-F685 refs

## Phase 3: TASK_TYPES_CATALOG_MERGED.md
**Save Point: P3_TASK_TYPES_DONE**
- Copy original to working dir
- Append all 22 renumbered engine contracts (T543-T564)
- FULL FORMAT: ARCHETYPE, FACTORY DEPENDENCIES, FABRIC RESOLUTION, AF CONFIGURATION, BFA VALIDATION, IRON RULES, QUALITY GATES
- Validate: all F-references within contracts use renumbered F-numbers

## Phase 4: SKILLS_FACTORY_RAG_MERGED.md
**Save Point: P4_SKILLS_DONE**
- Copy original to working dir
- Append all 24 renumbered skills (SK-355 through SK-378)
- Validate: factory/task type references use renumbered numbers

## Phase 5: V62_BFA_STRESS_TEST_MERGED.md
**Save Point: P5_BFA_DONE**
- Copy original to working dir
- Append 38 renumbered BFA rules (CF-751 through CF-788)
- Append 35 renumbered stress tests (ST-463 through ST-497)
- Validate: factory/task type references use renumbered numbers

## Phase 6: UNIFIED_SOURCE_INDEX_MERGED.md
**Save Point: P6_INDEX_DONE**
- Copy original to working dir
- Append FLOW-34 cross-reference section
- All factory→task type→skill→BFA mappings renumbered

## Phase 7: MASTER_EXECUTION_PLAN_MERGED.md
**Save Point: P7_PLAN_DONE**
- Copy original to working dir
- Append FLOW-34 execution plan with renumbered phases
- Templates 126-133

## Phase 8: Final Validation
**Save Point: P8_COMPLETE**
- Verify no stale F631-F685 references in any output file
- Verify no stale T247-T268 references
- Verify global counts match
- Produce validation report

---

# ═══ VALIDATION MATRIX ═══

| Requirement | Covered In Phase | Check |
|-------------|-----------------|-------|
| All factories renumbered F1429-F1483 | P2 | grep -c 'F1429\|F1483' |
| All task types renumbered T543-T564 | P3 | grep -c 'T543\|T564' |
| Full engine contract format for all 22 TTs | P3 | manual |
| Fabric resolution on every factory | P2, P3 | manual |
| AF station mapping for new flow | P3 | manual |
| BFA cross-flow validation | P5 | grep CF-751 |
| DNA compliance declared | P3, P4 | manual |
| No stale old numbers (F631-F685) | P8 | grep check |
| Backward compat (F1-F1428 unchanged) | P8 | diff check |
| MACHINE/FREEDOM split in all TTs | P3 | manual |
| Iron rules in all TTs | P3 | manual |
| Quality gates in all TTs | P3 | manual |

---

# ═══ POSITIVE EXAMPLES (correct output) ═══

## ✅ CORRECT: Factory entry (renumbered)
```
| F1429 | ICanonicalSkillSpecService | 213 | DATABASE FABRIC (ES) |
```
Uses F1429 (not F631). Family 213 (not 84).

## ✅ CORRECT: Task type factory reference (renumbered)
```
TASK TYPE: T543
FACTORY DEPENDENCIES:
  F1429:ICanonicalSkillSpecService — store canonical spec
  F1433:ISkillMetadataIndexService — index for AF-4 retrieval
FABRIC RESOLUTION:
  F1429 → DATABASE FABRIC (ES) via IDatabaseService.StoreDocument
  F1433 → DATABASE FABRIC (ES) via IDatabaseService.StoreDocument
```
All F-numbers are in the F1429+ range. T-number is T543.

## ✅ CORRECT: BFA rule reference (renumbered)
```
ID: CF-751
ENTITIES: CanonicalSkillSpec, SourceSkill
RULE: Every CanonicalSkillSpec MUST record sourceSkillId (F1435)
```
Uses CF-751 (not CF-295). References F1435 (not F637).

## ✅ CORRECT: Session state counts
```
| Factories | 1,483 | F1–F1483 (222 families) |
| Task Types | 564 | T1–T564 |
```

---

# ═══ NEGATIVE EXAMPLES (what we must NOT produce) ═══

## ❌ WRONG: Stale factory number
```
| F631 | ICanonicalSkillSpecService | 84 | DATABASE FABRIC (ES) |
```
F631 is ALREADY used by FLOW-18. Family 84 is ALREADY used by FLOW-18.

## ❌ WRONG: Mixed old/new references
```
TASK TYPE: T543
FACTORY DEPENDENCIES:
  F631:ICanonicalSkillSpecService  ← STALE! Should be F1429
```
T-number renumbered but F-reference left as old number.

## ❌ WRONG: One-line task type stub
```
T543 — Canonical Skill Extraction Gate (Family 213)
```
MISSING: ARCHETYPE, FACTORY DEPENDENCIES, FABRIC RESOLUTION, AF CONFIG, BFA VALIDATION, IRON RULES, QUALITY GATES.

## ❌ WRONG: Service described as standalone
```
CanonicalSkillService connects to Elasticsearch directly via elastic client.
```
MUST be: "resolves through DATABASE FABRIC (ES) via IDatabaseService.StoreDocument"

## ❌ WRONG: Provider import in generated code
```
const { Client } = require('@elastic/elasticsearch');
```
MUST use fabric interface. Never import a provider directly.

## ❌ WRONG: Typed model instead of dictionary
```
public class CanonicalSkillSpec { public string Name { get; set; } }
```
MUST be Dictionary<string,object> via ParseDocument (DNA-1).
