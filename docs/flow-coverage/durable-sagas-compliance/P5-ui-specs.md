# FLOW-19 UI Spec — Phase 5 Deliverable

**Flow:** Durable Sagas & Compliance (`durable-sagas-compliance`)
**Classification:** ADMIN_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `ComplianceAuditPage.tsx` | `/admin/durable-sagas-compliance/compliance-audit` | `audit-id`, `compliance-audit-page`, `event-type-field`, `expires-at-field`, `legal-hold-field`, `no-records` +9 |
| `SagaDashboardPage.tsx` | `/admin/durable-sagas-compliance/saga-dashboard` | `compensate-button`, `execute-saga-button`, `saga-dashboard-page`, `saga-error`, `saga-id`, `saga-state-panel` +3 |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | Every task type in T287-T306 has at least one plan step | `ComplianceAuditPage.tsx` | `page-complianceaudit` |
| 2 | Every plan step is scoped to a single responsibility (single task type) | `ComplianceAuditPage.tsx` | `page-complianceaudit` |
| 3 | No step imports provider SDKs directly (fabric-first) | `ComplianceAuditPage.tsx` | `page-complianceaudit` |
| 4 | No step creates entity-specific controllers | `ComplianceAuditPage.tsx` | `page-complianceaudit` |
| 5 | All steps return DataProcessResult<T> | `ComplianceAuditPage.tsx` | `page-complianceaudit` |
| 6 | Focus areas covered: 9 named check evaluators, EP-5 crash harness | `ComplianceAuditPage.tsx` | `page-complianceaudit` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 6 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
