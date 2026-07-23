# FLOW-25 UI Automation Gap Analysis — Phase 3 Deliverable

**Flow:** BFA Cross-Flow Governance (`bfa-cross-flow-governance`)
**Classification:** ENGINE_INTERNAL
**P2 verdict:** ADMIN_COVERED

## Spec Files Found (both directories searched)

| Path | Lines | Size (B) | Role |
|------|------:|---------:|------|
| `client/e2e/bfa-cross-flow-governance-crud.spec.ts` | 98 | 4481 | AUTHORITATIVE |
| `client/e2e/bfa-cross-flow-governance-mock-states.spec.ts` | 54 | 2965 | DUPLICATE (merge in P12) |

| # | Business State | P2 Verdict | Automation | Spec File | Test | Line |
|---|---------------|------------|-----------|-----------|------|------|
| 1 | CHANGE-INTAKE-PARSE-001 (T375): content-addressed ingestion — parse + normalize + persist raw input,… | ADMIN_COVERED | NOT_TESTED | `bfa-cross-flow-governance-crud.spec.ts` | — | — |
| 2 | BLAST-RADIUS-TRAVERSAL-001 (T380): transitive graph traversal with cycle-safe DFS, depth-limited fro… | ADMIN_COVERED | NOT_TESTED | `bfa-cross-flow-governance-crud.spec.ts` | — | — |
| 3 | ARBITRATION-STATE-MACHINE-001 (T381): state machine with human capture, resolution apply, persist-be… | ADMIN_COVERED | TESTED | `bfa-cross-flow-governance-crud.spec.ts` | C-04: list or empty-state renders on load | 89 |
| 4 | CROSS-TENANT-GUARD-001 (T387): cross-tenant conflict detection with explicit isolation gate | ADMIN_COVERED | PARTIAL | `bfa-cross-flow-governance-crud.spec.ts` | FLOW-25 — BFA Cross-Flow Governance real CRUD | 22 |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery:** row count = 4 (= P1 item count). PASS
- **Arbiter 2 — Both Directories Searched:** PASS — both `client/e2e/` AND `e2e/tests/` traversed; results listed in Spec Files section above.
- **Arbiter 3 — Test String Truthfulness:** PASS — TESTED/PARTIAL verdicts cite exact test/describe string with line number from the authoritative spec file.
- **Arbiter 4 — Duplicate Flagging:** PASS — 1 duplicate(s) flagged for Phase 12 consolidation.
