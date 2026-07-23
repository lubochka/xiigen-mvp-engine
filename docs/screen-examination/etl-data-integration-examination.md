# Flow UI examination — FLOW-14 etl-data-integration

## Date: 2026-04-20 · Run: RUN-59 · Batch: E (Grammar 1 Progress Strip)

## One-sentence spec (F1)
> When a data source publishes an event on the XIIGen platform, extract and
> transform the payload through the ETL pipeline, validate against the 25
> CloudEvent schemas, and enforce BFA peer-flow rules before loading.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-03.md`)
- **platform-admin** — pipeline config + monitoring
- **tenant-admin** — consumer (connects tenant data sources)
- **platform-support** — audit

## Grammar
**G1 Progress Strip** — per-pipeline-run phase strip + row-counts per phase.
**Reference:** **Airbyte + Fivetran + Stitch** (ETL tools with pipeline-run status).

## Classification
- **Q1 CRUD?** Likely — EtlDataIntegrationPage likely AdminCrudPanel default.
- **Q2 Error/empty?** Empty pipelines: "Connect a data source to get started" CTA.
- **Q3 Engineering leak?** "CloudEvent schemas", "BFA peer-flow rules" — for admin audience acceptable; translate to "Event format validation", "Cross-flow rules".
- **Q4 Role-correct?** 3-role scope.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) for pipeline-run list + phase strip.

## 24 existing PNGs

## Planned fixes (G1 Progress Strip)
- Pipeline list: card per pipeline with source + target + last-run status + row-count delta
- Per-run detail: phase strip (Source connected → Extracted → Transformed → Validated → Loaded)
- Row counts per phase (e.g., "12,450 rows extracted / 12,448 transformed / 2 validation errors")
- Re-run with backfill action on failed runs
- Backfill date range picker when re-running
