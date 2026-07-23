# PHASE-0 REPORT — Calibration Infrastructure

**Phase:** S-4 Phase 0 (CalibrationRunner + OssCurriculumRunner)
**Date:** 2026-04-05
**Branch:** crazy-shannon
**Status:** ✅ COMPLETE — awaiting Luba approval before Phase 1

---

## Summary

Phase 0 delivers the full calibration and OSS curriculum infrastructure: data model, storage layer, controller, module wiring, unit tests, and E2E tests. All code is tsc-clean and passes the full jest suite with 0 new failures.

Key deliverables:
- `CalibrationRunner` — runs CycleChainService 3× per flow (CF-CAL-01), stores to `xiigen-calibration-baseline`, dispatches `OssCurriculumRunner`
- `OssCurriculumRunner` — 3 OSS models × 5 cycles (CF-OSS-02), grades simulated in Phase 0 (CF-OSS-03), RAG seeding at ≥ 0.85
- `POST /api/calibration/run` — controller wired, validates input, returns structured result
- `CalibrationModule` — imports DatabaseModule, registered in EngineModule
- Two ES fixture schemas — `xiigen-calibration-baseline` + `xiigen-oss-curriculum-runs`
- `xiigen-training-data` fixture updated with `station`, `depth`, `nodeIntent` fields

---

## Test Counts

| Suite | Tests | Pass | Fail |
|-------|-------|------|------|
| `calibration-runner.service.spec.ts` | 9 | 9 | 0 |
| `oss-curriculum-runner.service.spec.ts` | 9 | 9 | 0 |
| `calibration.e2e.spec.ts` | 5 | 5 | 0 |
| **S-4 total** | **23** | **23** | **0** |
| Full suite (pre-existing failures excluded) | 7973 | 7929 | 3 pre-existing |

Pre-existing failures (confirmed present before S-4):
- `test/e2e/flow-01/cycle1-planner.e2e.spec.ts`
- `src/engine/node-handlers/arbiter-panel.integration.spec.ts`
- `test/api/engine-controller.spec.ts`

---

## Calibration (Phase 0)

| Item | Status |
|------|--------|
| CALIBRATION_RUNS = 3 (CF-CAL-01) | ✅ Hardcoded |
| terminationDepth = 3 default (CF-CAL-02) | ✅ Hardcoded |
| Records stored to `xiigen-calibration-baseline` | ✅ Verified (E2E test) |
| schema: station, depth, nodeIntent, model, grade, tenantId, createdAt | ✅ Present |
| DNA-8: storeDocument before OSS dispatch | ✅ Verified (unit test) |
| DNA-3: CycleChain failure continues run | ✅ Verified (unit test) |
| DNA-5: tenantId from CLS only | ✅ NO_TENANT guard present |
| `detectRegressions()` static method | ✅ Grade drop > 0.05 at matching (station, depth, model) |
| `detectDepthOverload()` static method | ✅ Drop > 0.10 depth0→depth1 |
| Tenant isolation: records tagged with correct tenantId | ✅ E2E test |
| No provider secrets in stored records | ✅ E2E test (sk-ant/AIza/encryptedKey check) |

---

## OSS Curriculum (5 cycles)

| Item | Status |
|------|--------|
| OSS_MODELS = llama3:8b, codellama:13b, deepseek-coder:6.7b (CF-OSS-01) | ✅ Hardcoded |
| DEFAULT_CYCLES = 5 (CF-OSS-02) | ✅ Hardcoded |
| `runOssModelCycle()` simulated (CF-OSS-03) | ✅ 0.45 + 0.04/cycle, plateau 0.73 |
| Records stored to `xiigen-oss-curriculum-runs` | ✅ Verified (unit + E2E) |
| schema: ossModel, station, depth, nodeIntent, cycle, grade | ✅ Present |
| RAG seeding at grade ≥ 0.85 | ✅ Verified (unit test) |
| No RAG seeding at grade < 0.85 | ✅ Verified (unit test — contamination prevention) |
| `computeSignal()`: UP / FLAT / DOWN per model | ✅ Verified |
| `detectDepthOverload()`: > 0.10 drop depth0→depth1 | ✅ Verified |
| DNA-3: storeDocument failure does not halt runner | ✅ Verified |

Note: Phase 0 OSS grades are simulated (0.45→0.73 curve). No grades reach the ≥ 0.85 RAG seed threshold under default simulation. RAG seeding path is tested via spy mock.

---

## Security

| Check | Result |
|-------|--------|
| No `sk-ant`, `sk-*`, `AIza`, or `encryptedKey` in stored records | ✅ PASS |
| tenantId via CLS — no parameter leakage | ✅ PASS |
| `terminationDepth` has safe default (3) | ✅ PASS |
| No HTTP calls between services (queue-only) | ✅ PASS |

---

## Definition of Done

- [x] tsc --noEmit = 0 errors
- [x] 0 new test failures (23/23 new tests pass, 3 pre-existing failures unchanged)
- [x] `POST /api/calibration/run` controller wired and validated
- [x] CalibrationModule registered in EngineModule
- [x] ES fixtures committed for both new indices
- [x] DNA-3 (DataProcessResult), DNA-5 (CLS tenant), DNA-8 (store-before-dispatch) all satisfied
- [x] PHASE-0-REPORT.md created

---

## Carry-Forward Items

| ID | Item | When |
|----|------|------|
| CF-CAL-01 | CALIBRATION_RUNS: read from FREEDOM config (`calibration.runs`) | Phase 1 |
| CF-CAL-02 | terminationDepth: read from FREEDOM config (`calibration.terminationDepth`) | Phase 1 |
| CF-OSS-01 | OSS_MODELS: read from FREEDOM config (`oss.models`) | Phase 1 |
| CF-OSS-02 | DEFAULT_CYCLES: read from FREEDOM config (`oss.cyclesPerModel`) | Phase 1 |
| CF-OSS-03 | `runOssModelCycle()`: replace simulated grades with real OllamaProvider call | Phase 1 |
| CF-SCOPE-01 | Add `knowledgeScope` (PRIVATE/MODULE/GLOBAL), `ownerId`, `moduleId`, `pricingModel` to all 6 learning-layer fixtures and services | Before Phase 1 |
| CF-SCOPE-02 | `xiigen-knowledge-policy` fixture + service — per-(tenantId, flowId, phase, station, depth) scope decision | Before Phase 1 |
| CF-SCOPE-03 | `xiigen-module-library` fixture + service — MODULE template registry with RAG snapshot | Before Phase 1 |
| CF-SCOPE-04 | `xiigen-module-adoptions` fixture + service — copy-on-adopt with pricing tracking | Before Phase 1 |
| CF-PORT-01 | `ModuleExportService` — packages (RAG + graph + prompts + calibration baseline) into a versioned module snapshot | Before Phase 1 |
| CF-PORT-02 | `FreshTenantTestService` — provisions ephemeral tenant, imports module snapshot, re-runs calibration, grade parity ≥ 0.90 required | Before Phase 1 |
| CF-PORT-03 | DoD update: every phase must pass portability test (fresh tenant grade parity ≥ 0.90 per station/depth) before marked complete | Before Phase 1 |

**Note on CF-SCOPE and CF-PORT:** Architectural decision confirmed — everything built in XIIGen is MODULE scope by default. "Phase complete" requires portability validation: export → fresh tenant → import → re-run calibration → grade parity ≥ 0.90. CF-SCOPE-01..04 and CF-PORT-01..03 are prerequisites for Phase 1. They constitute a separate session (SCOPE + PORTABILITY LAYER session) that must be approved and executed before Phase 1 begins.

---

⛔ STOP — awaiting Luba approval before Phase 1 begins.
