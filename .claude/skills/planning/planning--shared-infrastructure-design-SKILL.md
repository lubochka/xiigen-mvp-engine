---
name: shared-infrastructure-design
sk_number: SK-504
version: "1.0.0"
priority: MEDIUM
load_order: 0
category: planning
layer: product
author: luba
updated: "2026-03-26"
contexts: ["web-session"]
description: >
  How to design the fabric interfaces and backing services for shared
  infrastructure — cache layers, ML inference, search indices — that are
  referenced across 3+ flows but don't belong to any single flow's domain.
  SK-495 identifies which services are shared. This skill designs them.
  Fires before any Wave 1+ flow that requires shared infrastructure.
triggers:
  - "design shared cache"
  - "ML inference service"
  - "search index design"
  - "shared index across flows"
  - "infrastructure not owned by a flow"
  - "cache layer"
  - "recommendation engine design"
---

# Shared Infrastructure Design Skill (SK-504)

## WHAT THIS SKILL PREVENTS

Building a cache inside FLOW-03 and a different cache inside FLOW-05 that cache
the same data (member scores) but with different TTLs, different key structures,
and no invalidation coordination. Or building a search index for events in FLOW-03
and a separate search index for posts in FLOW-05 when both should feed the same
unified search surface.

---

## THE THREE SHARED INFRASTRUCTURE CATEGORIES

### Category 1 — Shared Read Cache

A cache layer used by multiple services to avoid repeated database reads.

**Design protocol:**
```
1. Identify the data being cached: member profiles, event records, scoring weights
2. Define the key structure: must include tenantId prefix (DNA-5)
   Key pattern: "${tenantId}:cache:${dataType}:${id}"
3. TTL policy: FREEDOM config key per data type
   cache.memberProfile.ttlSeconds = 300
   cache.eventRecord.ttlSeconds = 60
4. Invalidation events: what event causes the cache to be stale?
   MemberUpdated → invalidate cache.memberProfile entries for that member
5. Fabric interface: IScopedMemoryService (already exists) — no new interface needed
   unless the cache requires set operations or sorted sets
```

### Category 2 — Shared ML Inference

An ML model that multiple flows call for predictions/scoring.

**Design protocol:**
```
1. Define the model contract (inputs → outputs, not implementation)
   Input:  {memberId: string, contextVector: number[], featureSet: Record<string, number>}
   Output: {score: number, confidence: number, modelVersion: string}

2. IMLService fabric interface (already defined in XIIGEN-VISION-ALIGNMENT-PLAN)
   FREEDOM config: ml.provider = 'internal' | 'vertex_ai' | 'sagemaker' | 'mock'

3. Versioning: modelVersion in every output — never implicit
   D-ML-001 architecture decision must precede this design

4. DPO consideration: ML inference results are NOT DPO training signals for XIIGen's
   engine. They are domain data. Keep them in a separate index from xiigen-training-data.

5. Per D-ML-001: community platform ML stays in its own index (domainId: 'community-platform').
   XIIGen engine DPO stays in xiigen-training-data. No sharing until FLOW-38 is proven.
```

### Category 3 — Shared Search Index

A unified search surface that multiple flows write to and multiple views read from.

**Design protocol:**
```
1. Define document types that go in the index:
   { type: 'event' | 'post' | 'member' | 'listing', ... }

2. ISearchService fabric interface:
   FREEDOM config: search.provider = 'elasticsearch' | 'opensearch' | 'mock'

3. Index key convention: "${tenantId}-${indexName}" (multi-tenant isolation)
   Never: "${indexName}" without tenant prefix

4. Write responsibilities: which flow owns writes for each document type
   FLOW-03 → event documents
   FLOW-05 → post documents
   FLOW-08 → listing documents
   FLOW-01 → member documents
   No flow reads another flow's write responsibility

5. Named check: search_write_uses_fabric_not_direct
   Score-0. No direct ES/Opensearch client calls in service code.
```

---

## PRE-FLOW BUILD PROTOCOL

For each shared infrastructure item identified by SK-495:

```
1. Define the fabric interface (if not already existing)
2. Implement a Mock provider for local development
3. Seed the index schema in Elasticsearch (empty mappings)
4. Register in xiigen-infrastructure-manifest
5. Add to prerequisite-chain-SKILL.md (SK-458) for flows that depend on it
```

---

## OUTPUT: INFRASTRUCTURE MANIFEST ENTRY

```json
{
  "id": "shared-feed-index",
  "type": "elasticsearch-index",
  "fabricInterface": "IFeedService",
  "requiredByFlows": ["FLOW-05", "FLOW-08", "FLOW-09"],
  "mustExistBefore": "FLOW-05-Phase-A",
  "namingConvention": "${tenantId}-community-feed",
  "namedCheck": "feed_writes_via_ifeed_service",
  "mockProvider": "InMemoryFeedProvider",
  "freedomConfigKey": "feed.provider"
}
```
