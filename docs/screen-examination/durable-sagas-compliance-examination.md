# Flow UI examination — FLOW-19 durable-sagas-compliance

## Date: 2026-04-20 · Run: RUN-59 · Batch: E (Grammar 1 Progress Strip saga timeline)

## One-sentence spec (F1)
> When a multi-step saga is initiated on the XIIGen platform, evaluate
> the 9 named check conditions, run the EP-5 crash harness against the
> saga steps, and emit the compliance event on completion.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-04.md`)
- **tenant-admin** — saga orchestration + compliance dashboard for tenant
- **tenant-user** — narrow GDPR slice ("status of my data delete request")
- **platform-admin** — cross-tenant saga ops + compliance export
- **platform-support** — read-only

## Grammar
**G1 Progress Strip** (saga step timeline with compensation branches).
**Reference:** **Temporal UI**, **Cadence saga view**, **AWS Step Functions visual**.

## Classification
- **Q1 CRUD?** 🟡 2 pages (ComplianceAuditPage / SagaDashboardPage).
- **Q2 Error/empty?** Empty saga list: "No sagas active" — rare but valid empty state.
- **Q3 Engineering leak?** "9 named check conditions", "EP-5 crash harness", "compliance event" must not appear in tenant-user GDPR view.
- **Q4 Role-correct?** ✅ 4 roles with distinct views including tenant-user narrow slice.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) for saga timeline with compensation branches + NEEDS_ROLE_BRANCH for tenant-user GDPR-only slice.

## 6 existing PNGs

## Planned fixes
- SagaDashboardPage (admin): saga list with status + per-saga timeline view
- Timeline: linear steps forward + compensation branch below when rollback occurs
- ComplianceAuditPage: per-period compliance report (SOC2 / GDPR) + audit trail export
- NEW MyDataRequestsPage (`/my/data-requests`): narrow tenant-user view — only sagas affecting this user's data (GDPR delete, account merge)
- Copy: "Your data deletion request is pending (ETA 5 days)" — plain English, no saga terminology
