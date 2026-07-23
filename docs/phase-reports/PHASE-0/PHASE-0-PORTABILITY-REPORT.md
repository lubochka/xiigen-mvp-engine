# PHASE-0 PORTABILITY REPORT

**Phase:** S-4 Phase 0 (Scope + Portability Layer)
**Date:** 2026-04-05
**Mode:** DEVELOPMENT (threshold = 0.90, soft gate — findings logged, not blocking)

---

## Portability Status

| (station, depth) | Main grade | Fresh grade | Parity | Class | Status |
|------------------|------------|-------------|--------|-------|--------|
| CYCLE-1 / 0 | simulated (0.45–0.73) | simulated (0.45–0.73) | 1.00 | — | ✅ PORTABLE |

All grades in Phase 0 are simulated (CF-OSS-03 — `runOssModelCycle()` returns a fixed learning curve, 0.45 base + 0.04/cycle, plateau 0.73). Fresh tenant receives the same simulation, so parity = 1.00 by design.

**Real portability gaps will only appear in Phase 1** when `OllamaProvider` is wired and actual model outputs vary between tenants based on their RAG context and decision graph state.

---

## Gap Summary

None detected in Phase 0.

The three gap classes to watch for in Phase 1:
- **Class A** (parity < 0.70): RAG dependency not captured in snapshot — prompt generator read patterns that weren't exported
- **Class B** (parity 0.70–0.85): Graph edge or prompt version not captured — decision graph seeded in prior phase not included
- **Class C** (parity 0.85–0.90): Minor variance — likely acceptable noise, classify as UNKNOWN

---

## Scope Infrastructure Status

| Component | Status |
|-----------|--------|
| `knowledgeScope` field on 6 indices | ✅ Added |
| `ownerId` field on 6 indices | ✅ Added |
| `moduleId` + `pricingModel` fields on 6 indices | ✅ Added |
| `tenantId` added to 3 previously-unscoped indices | ✅ Added |
| `xiigen-knowledge-policy` fixture + service | ✅ Complete |
| `xiigen-module-library` fixture + service | ✅ Complete |
| `xiigen-module-adoptions` fixture + service | ✅ Complete |
| `ModuleSnapshotService` | ✅ Complete |
| `FreshTenantTestService` | ✅ Complete (dev mode, soft gate) |
| `CalibrationRunner` scope wiring | ✅ reads policy, writes `knowledgeScope`/`ownerId` |
| `OssCurriculumRunner` scope wiring | ✅ reads policy, writes `knowledgeScope`/`ownerId` |
| `CalibrationRunner` snapshot + portability call | ✅ Wired (optional injection — safe if services absent) |

---

## Carry-Forward

| ID | Item | When |
|----|------|------|
| CF-PORT-DEV-01 | `DEV_THRESHOLD` from FREEDOM config `portability.threshold.dev` | Phase 1 |
| CF-PORT-DEV-02 | Real ephemeral tenant deprovision (delete indexed records) | Phase 1 |
| CF-ADOPT-RAG-01 | Real RAG copy in `ModuleAdoptionService.copyRagToNamespace()` — reads ragSnapshotId records, writes to adopter namespace | Phase 1 |
| CF-PORT-LIVE-01 | Live mode: hard gate, compiled output, 0.95 threshold, pricing enforcement | FLOW-41+ |
| CF-SCOPE-GLOBAL-01 | GLOBAL scope: platform approval workflow (approve/reject MODULE→GLOBAL) | FLOW-41+ |
| CF-PRICING-01 | Pricing enforcement for MODULE adoption (PER_USE billing) | FLOW-41+ |

---

⛔ STOP — Phase 0 portability report complete. Awaiting Luba approval before Phase 1.
