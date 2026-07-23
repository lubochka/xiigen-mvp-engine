# FLOW-39 UI Automation Gap Analysis — Phase 3 Deliverable

**Flow:** OSS Curriculum (`oss-curriculum`)
**Classification:** ENGINE_INTERNAL
**P2 verdict:** ADMIN_COVERED

## Spec Files Found (both directories searched)

| Path | Lines | Size (B) | Role |
|------|------:|---------:|------|
| `client/e2e/oss-curriculum-crud.spec.ts` | 98 | 4250 | AUTHORITATIVE |
| `client/e2e/oss-curriculum.spec.ts` | 64 | 2536 | DUPLICATE (merge in P12) |
| `client/e2e/oss-curriculum-mock-states.spec.ts` | 36 | 1539 | DUPLICATE (merge in P12) |

| # | Business State | P2 Verdict | Automation | Spec File | Test | Line |
|---|---------------|------------|-----------|-----------|------|------|
| 1 | Local Model Curriculum — OSS Teaching Pipeline-specific patterns TBD | ADMIN_COVERED | TESTED | `oss-curriculum-crud.spec.ts` | FLOW-39 — OSS Curriculum real CRUD | 22 |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery:** row count = 1 (= P1 item count). PASS
- **Arbiter 2 — Both Directories Searched:** PASS — both `client/e2e/` AND `e2e/tests/` traversed; results listed in Spec Files section above.
- **Arbiter 3 — Test String Truthfulness:** PASS — TESTED/PARTIAL verdicts cite exact test/describe string with line number from the authoritative spec file.
- **Arbiter 4 — Duplicate Flagging:** PASS — 2 duplicate(s) flagged for Phase 12 consolidation.
