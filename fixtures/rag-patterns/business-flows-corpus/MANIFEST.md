# Business-flow Specs RAG Corpus — Manifest

**Date:** 2026-04-22
**Total patterns:** 27
**Pattern type:** `BUSINESS_FLOW_SPEC`

## Purpose

This directory holds business-flow specs as retrievable RAG patterns, so AI agent
sessions querying "what does the user want in flow X?" find the PM-authored source
of truth at parity with existing ARCH_PATTERN, DESIGN_REASONING, and SERVICE_PATTERN
records.

## Record schema

Each `{slug}-business-spec.json` file is a single pattern with these fields:

| Field | Type | Meaning |
|---|---|---|
| `patternId` | string | `spec-{slug}` — unique stable identifier |
| `patternType` | string | Always `"BUSINESS_FLOW_SPEC"` |
| `flowId` | string | Canonical `FLOW-XX` |
| `domainId` | string | Canonical slug (e.g. `user-registration`) |
| `seededAt` | ISO-8601 | When this pattern entered the corpus |
| `grammar` | string | G1–G7 UI grammar type (from business-flows-registry) |
| `implementationState` | string | `live` / `half-built` / `designed` / `sketched` (from 47-flow matrix) |
| `tags` | string[] | 3–5 domain keywords derived from content |
| `keywords` | string | Space-separated top-15 terms — matches existing pattern shape |
| `connectionType` | string | Always `"FLOW_SCOPED"` (design-time, cross-tenant) |
| `tenantId` | string | Always `""` (FLOW_SCOPED records never carry tenant) |
| `content` | string | Verbatim spec content, provenance header stripped |
| `contentBytes` | int | Size of content in bytes |
| `qualityScore` | number | `0.85` baseline for PM-authored spec |
| `sourceDocument` | string | Path to primary spec at `docs/business-flows/NN-{slug}.md` |
| `sourceZipFilename` | string | Original filename in `business flows.zip` |
| `canonicalSince` | date | Date this spec became canonical (`2026-04-22`) |

## Retrieval query template (Elasticsearch / curl)

```bash
# Get the spec for a specific flow
curl -s "localhost:9200/xiigen-rag-patterns/_search" \
  -H "Content-Type: application/json" \
  -d '{"query":{"bool":{"filter":[
    {"term":{"patternType.keyword":"BUSINESS_FLOW_SPEC"}},
    {"term":{"flowId.keyword":"FLOW-01"}}
  ]}}}' | jq '.hits.hits[]._source.content'

# Find flows by implementation state
curl -s "localhost:9200/xiigen-rag-patterns/_search" \
  -H "Content-Type: application/json" \
  -d '{"query":{"bool":{"filter":[
    {"term":{"patternType.keyword":"BUSINESS_FLOW_SPEC"}},
    {"term":{"implementationState.keyword":"half-built"}}
  ]}}}' | jq '.hits.hits[]._source | {flowId, domainId, grammar}'

# Find flows by grammar type
curl -s "localhost:9200/xiigen-rag-patterns/_search" \
  -H "Content-Type: application/json" \
  -d '{"query":{"bool":{"filter":[
    {"term":{"patternType.keyword":"BUSINESS_FLOW_SPEC"}},
    {"term":{"grammar.keyword":"G4"}}
  ]}}}' | jq '.hits.hits[]._source.domainId'
```

## Tag derivation rule (mechanical)

Tags are derived from each spec's content using this procedure:

1. Lowercase content.
2. Extract tokens matching `[a-z]{3,}`.
3. Remove English + XIIGen stopwords (`the`, `a`, `user`, `platform`, `system`, `flow`, `xiigen`, `engine`, etc. — see `seed-rag.py` for full list).
4. Count unigrams; take top 5 by frequency.
5. If fewer than 3 unique tokens emerge, pad with slug components.

## Quality score conventions

| Score | Source |
|---|---|
| 1.00 | Luba-approved locked decision (DECISIONS-LOCKED) |
| 0.95 | Cross-flow architectural pattern (ARCH_PATTERN) |
| 0.91 | Per-flow architectural pattern with iron rules (existing convention) |
| **0.85** | **PM-authored business-flow spec (this corpus)** |
| 0.70 | Deep-research revision (not seeded by default) |
| 0.50 | Auto-generated / machine-derived |

## How to extend

When a new flow's primary spec is added to `docs/business-flows/NN-{slug}.md`:

1. Add its `(flow_id, grammar, implementation_state, source_zip_filename)` tuple to the `META` dict in `docs/sessions/business-flows-integration/seed-rag.py`.
2. Run `python docs/sessions/business-flows-integration/seed-rag.py`.
3. A new `{slug}-business-spec.json` appears here.

## Cross-references

- **Source documents:** [`docs/business-flows/`](../../../docs/business-flows/)
- **Product state map:** [`docs/business-flows/PRODUCT-STATE.md`](../../../docs/business-flows/PRODUCT-STATE.md)
- **Canonical slug + grammar registry:** [`.claude/skills/flow-prep-library/planning--business-flows-registry.md`](../../../.claude/skills/flow-prep-library/planning--business-flows-registry.md)
- **Examination records (WHO/VERB/GRAMMAR):** [`docs/screen-examination/`](../../../docs/screen-examination/)
- **Session state:** [`docs/sessions/business-flows-integration/STATE.json`](../../../docs/sessions/business-flows-integration/STATE.json)

## Files in this directory

```
27 × {slug}-business-spec.json   — one per canonical flow with a primary spec
1  × MANIFEST.md                        — this file
```
