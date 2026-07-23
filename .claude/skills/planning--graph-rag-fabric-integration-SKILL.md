---
name: graph-rag-fabric-integration
sk_number: SK-517
version: "1.0.0"
priority: MEDIUM
load_order: 2
category: planning
layer: dynamic-decision-architecture
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  How to inject and use IGraphRagService in any NestJS service. Query patterns,
  provider migration via FREEDOM config, D-GRAPH-001 Phase 1 constraints, and
  anti-patterns for direct SDK imports. Every service that reads from or writes
  to the decision graph must follow these patterns.
triggers:
  - "query the graph"
  - "IGraphRagService"
  - "inject graph"
  - "switch graph backend"
  - "fabric interface for graph"
  - "GRAPH_RAG_SERVICE"
  - "decision graph query"
---

# Graph RAG Fabric Integration (SK-517)

## WHEN TO INVOKE

When any service needs to query the decision graph. Before writing any code
that calls IGraphRagService methods. When switching graph backends. When
reviewing code for direct SDK imports.

---

## WHAT THIS SKILL PREVENTS

- Direct SDK imports in services (DNA violation — fabric-first)
- Assuming multi-hop traversal in Phase 1 (D-GRAPH-001 constraint)
- Building custom graph clients instead of using the fabric interface
- Creating a new fabric interface when adding a method to IGraphRagService suffices
- Services that break when the graph backend changes

---

## INJECTION PATTERN

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../graph/interfaces/i-graph-rag.service';

@Injectable()
export class MyDecisionService {
  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
  ) {}
}
```

---

## QUERY PATTERNS

**Pattern 1 — Decision lookup (most common):**
```typescript
const result = await this.graphRag.query({
  fromEntity: 'ARCHETYPE:ROUTING',
  relationship: 'REQUIRES_MINIMUM',
  minConfidence: 0.85,
});
// result.edges = GraphEdge[] sorted by confidence desc
// result.formatted() = human-readable string for prompt injection
```

**Pattern 2 — Anti-pattern check:**
```typescript
const avoids = await this.graphRag.query({
  fromEntity: 'ARCHETYPE:ROUTING',
  relationship: 'AVOID',
});
// All AVOID edges for this archetype — inject into arbiter prompts
```

**Pattern 3 — Vector similarity (semantic retrieval from graph):**
```typescript
const similar = await this.graphRag.vectorSearch({
  queryText: 'scope isolation enforcement pattern',
  entityType: 'ANTI_PATTERN',
  topK: 5,
  minScore: 0.7,
});
// Returns: Array<{ edge: GraphEdge; score: number }>
```

**Pattern 4 — Edge update (after outcome observed):**
```typescript
await this.graphRag.updateEdgeWeight({
  fromEntity: 'ARCHETYPE:ROUTING',
  relationship: 'ROUTES_TO',
  toEntity: 'PROMPT_PATCH',
  delta: +0.05,
  observationId: runId,
});
// Immutable edges silently skip (logged as warning)
// Confidence clamped to [0, 1]
```

---

## PROVIDER MIGRATION (FREEDOM config only)

```
Phase 1: engine.graphRag.provider = 'elasticsearch'
         Zero new infrastructure. Single-hop traversal. ES dense_vector kNN.

Phase 2: engine.graphRag.provider = 'lightrag'
         LightRAG server via HttpService. Neo4j for graph. ES for vectors.
         Trigger: graph traversal depth > 1 needed, OR edge count > 10k.

Phase 3: engine.graphRag.provider = 'pinecone+es' | 'azure-ai-search' | 'neo4j'
         Customer-driven selection. FREEDOM config change only.
```

Per D-GRAPH-001: Phase 1 is single-hop only. Multi-hop traversal (depth > 2)
triggers migration to LightRAG or Neo4j. Observable metric: query time > 200ms.

---

## D-GRAPH-001 CONSTRAINTS (Phase 1)

```
DO:     graphRag.query({ fromEntity: 'X', relationship: 'Y' })      — single-hop ✓
DO:     graphRag.vectorSearch({ queryText: '...' })                   — kNN search ✓
DON'T:  graphRag.query({ fromEntity: 'X', depth: 3 })               — multi-hop ✗
DON'T:  graphRag.query({ fromEntity: 'X' }).then(r =>
          graphRag.query({ fromEntity: r.edges[0].toEntity }))       — manual 2-hop ⚠️
```

Manual 2-hop (chaining two single-hop queries) works but is a code smell that
signals the decision graph needs a multi-hop backend. Track these and migrate
when they accumulate.

---

## ANTI-PATTERNS

❌ `import { Client } from '@elastic/elasticsearch'` — use IGraphRagService
❌ `import neo4j from 'neo4j-driver'` — use IGraphRagService
❌ `import { Pinecone } from '@pinecone-database/pinecone'` — use IGraphRagService
❌ `this.graphRag.query({ depth: 3 })` — D-GRAPH-001: Phase 1 is single-hop
❌ Creating a new fabric interface when adding a method to IGraphRagService suffices
❌ Calling `IEmbeddingService.embed()` directly instead of `IGraphRagService.vectorSearch()`
   — the provider handles embedding internally
