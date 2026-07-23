# DR-242: Filesystem-First Snapshot Persistence

**Date:** 2026-03-19 | **Decided by:** Luba

## Decision
Learning snapshots stored as JSON files in `snapshots/` directory. Not in Elasticsearch.

## Rationale
1. Simplest path to enable model comparison — works immediately with zero infra deps
2. Portable — files can be shared between environments and inspected directly
3. Same gradual pattern as AF-3: in-memory → filesystem → ES

## Alternatives Considered
- **Elasticsearch**: Queryable, tenant-scoped, fabric-compliant. Deferred.
- **Both**: Best of both. Deferred until query patterns emerge from Phase A.

## De-scoped Items (documented)
- ES _bulk export (item 5) — Tier 1 manages ES state
- Benchmark result file copy (item 6) — filesystem artifacts, copy separately
- AF pipeline trace copy (item 7) — log files, copy separately
