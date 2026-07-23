# HIST-ARCH-RAG-BATCH
## Phase R2 — ARCH_PATTERN Fixture Batch Report
## Date: 2026-04-19 | Status: ✅ COMPLETE
## Written: 61 fixtures | Errors: 0 | Skipped: 0

---

## §1 — Summary

| Metric | Value |
|---|---|
| Batch A-1 (ARCH-001..ARCH-040) | 40 files → `fixtures/rag-patterns/hist_arch_NNN.json` |
| Batch A-2 (FLOW-DESIGN ARCH_PATTERN) | 21 files → `fixtures/rag-patterns/hist_fd_NNN.json` |
| Total written | **61** |
| Validation errors | 0 |
| connectionType HISTORICAL_ONLY | 18 (ARCH-023..040 — C#→NestJS migration) |
| connectionType FLOW_SCOPED | 43 |
| All 8 validation checks | PASS |

---

## §2 — Confirmed Field Mapping (live fixture → schema)

All 61 fixtures contain exactly these fields (matches confirmed rag-patterns schema):

```
patternId        patternType      flowId           domainId
seededAt         archetype        tags[]           keywords
ironRules[]      codeSnippet      appliesTo[]      curriculumTier
qualityScore     sourceDocument   connectionType   knowledgeScope
```

Batch A-2 additionally includes `flowOrigin` (preserves FLOW-DESIGN-NNN provenance).

---

## §3 — HISTORICAL_ONLY Fixtures (ARCH-023..040)

ARCH-023 through ARCH-040 encode C#→NestJS migration decisions.
These carry `connectionType: HISTORICAL_ONLY` and `knowledgeScope: INFORMATIONAL`.
They are retrievable by AF-4 for migration context but do not drive `ironRules` violations
in NestJS-native generation sessions.

| Range | Count | Purpose |
|---|---|---|
| ARCH-023..040 | 18 | C#→NestJS pattern mapping decisions |
| ARCH-001..022 | 22 | Core architecture decisions (FLOW_SCOPED / GLOBAL) |

---

## §4 — Spot-Check Results

| File | connectionType | knowledgeScope | qualityScore | Notes |
|---|---|---|---|---|
| hist_arch_001 | FLOW_SCOPED | GLOBAL | 0.95 | Fabric-first — all flows |
| hist_arch_023 | HISTORICAL_ONLY | INFORMATIONAL | 0.91 | C#→NestJS boundary |
| hist_arch_040 | HISTORICAL_ONLY | INFORMATIONAL | 0.88 | C#→NestJS boundary |
| hist_fd_017 | FLOW_SCOPED | GLOBAL | 0.97 | V39 Rule — factory-first ★ |

---

## §5 — Note on hist_fd_001

Source data (historyRag pass files) begins FLOW-DESIGN numbering at FLOW-DESIGN-002.
There is no FLOW-DESIGN-001 in any pass file. `hist_fd_001.json` does not exist — this
is correct. No gap; numbering follows source IDs.

---

## §6 — Next Phase

Phase R3: `python3 convert_dr_batch.py`
Produces 59 DESIGN_REASONING fixtures for Batches B (35) + C (24).
Creates `fixtures/design-reasoning/historical/` directory if absent.
