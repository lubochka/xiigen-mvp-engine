# XIIGen Teaching Pipeline

> Note: this is an operational guide for the RAG/teaching pipeline, part of how
> XIIGen is built. It is not an introduction to XIIGen or user-facing product
> documentation — see the top-level README.md first.

This document explains how to run the OSS LLM teaching pipeline for XIIGen.

The teaching pipeline seeds FLOW-01 and FLOW-02 design patterns into two knowledge stores:
- **Elasticsearch** (`xiigen-rag-patterns`, `xiigen-planning-decisions`) — vector/keyword search
- **nano-graphrag** — GraphRAG knowledge graph for entity/relation-aware OSS LLM retrieval

The OSS LLM (default: `qwen2.5-coder:7b` via Ollama) learns from:
- Architectural decision patterns (FAN_IN / CONVERGENCE / BROADCAST archetypes)
- Design reasoning triples (why a design was chosen, what was rejected, and the discriminating constraint)
- Plan exemplars (the full T50→T51→T52 task sequence for FLOW-02 business onboarding)

---

## What is being taught

XIIGen generates application flows. Before generating a new flow, the engine retrieves
design patterns that match the target archetype and domain. The teaching pipeline ensures
the OSS LLM retrieves the right patterns and applies them correctly.

### FLOW-02 patterns (8 arch + 1 plan + 7 DR triples)

| Pattern | Archetype | Teaching point |
|---|---|---|
| `arch--fan-in-parallel-merge` | FAN_IN | A1+A2 run in parallel via `Promise.allSettled` — never `Promise.all` |
| `arch--dual-record-write` | FAN_IN | A1 writes PRIVATE (full profile) + GLOBAL (4 match-safe fields only) |
| `arch--upstream-event-not-trigger` | FAN_IN | A3 triggers on `BusinessProfileCreated` — never `QuestionnaireCompleted` |
| `arch--timeout-as-success-mode` | CONVERGENCE | B1 30s timeout → `partialResults:true` → `DataProcessResult.success` |
| `arch--partial-input-partial-output` | CONVERGENCE | Partial upstream input → partial output, never failure |
| `arch--degradable-analytics` | CONVERGENCE | 4 optional inputs each have named fallbacks — always produces output |
| `arch--completion-event-distinct-per-flow` | BROADCAST | FLOW-02 owns `PersonalizationCompleted`; FLOW-01 owns `OnboardingCompleted` |
| `arch--debounce-as-subflow` | ROUTING | Debounce is a 3-node SUBFLOW (D1/D2/D3), not a constraint; key = `tenantId:userId` |
| `plan-flow02-business-onboarding` | PLAN_EXEMPLAR | Full T50→T51→T52 task sequence with cross-flow gate and critical constraints |

### Design reasoning triples (DR-02-A through DR-02-G)

Each triple has: `teachingPoint`, `positiveExample` (chosen), `negativeExample` (rejected), `discriminatingConstraint`.

| ID | Teaches |
|---|---|
| DR-02-A | Same input = parallel (A1+A2 share QuestionnaireCompleted — not chained) |
| DR-02-B | Degraded completion is first-class state, not an error |
| DR-02-C | Each flow emits a distinct completion event — collision = silent duplicate downstream |
| DR-02-D | Personalization quality degrades gracefully — missing signal ≠ broken output |
| DR-02-E | Debounce key = compound `tenantId:userId` — single dimension contaminates cross-tenant |
| DR-02-F | Debounce scenario requires its own nodes/audit records — a narrative constraint produces no code |
| DR-02-G | Timeout that produces output belongs in `successModes`, not `failureModes` |

---

## Starting the teaching stack

```bash
# Start Elasticsearch and nano-graphrag (infra profile)
docker compose --profile infra up elasticsearch nano-graphrag -d

# Wait for health checks to pass
curl localhost:9200/_cluster/health
# Expected: {"status":"green",...} or {"status":"yellow",...}

curl localhost:8080/health
# Expected: {"status":"healthy","provider":"nano-graphrag",...}
```

The nano-graphrag service defaults to `LLM_PROVIDER=mock` — no GPU or Ollama required.
To use a real OSS LLM, see [Using Ollama](#using-ollama) below.

---

## Seeding the patterns

```bash
# Seed FLOW-02 patterns to both ES and nano-graphrag
python rag-benchmark/seed_flow02_patterns.py

# Verify ES seeding
curl 'localhost:9200/xiigen-rag-patterns/_count?q=flowId:FLOW-02'
# Expected: {"count":9,...}

curl 'localhost:9200/xiigen-planning-decisions/_count?q=flowId:FLOW-02'
# Expected: {"count":7,...}

# Dry-run (parse and validate only — no writes)
python rag-benchmark/seed_flow02_patterns.py --dry-run
# Expected: 16 records, 0 errors
```

### Seed script options

```
python rag-benchmark/seed_flow02_patterns.py [OPTIONS]

  --dry-run           Parse and validate fixtures only — no writes
  --skip-es           Skip Elasticsearch seeding
  --skip-graphrag     Skip nano-graphrag insertion
  --es-endpoint URL   Elasticsearch endpoint (default: http://localhost:19200)
  --graphrag-url URL  nano-graphrag server URL (default: http://localhost:8001)
```

---

## Querying the GraphRAG

```bash
# Query the FLOW-02 knowledge graph
curl -X POST localhost:8080/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "dual record write business profile",
    "workspace": "flow02-design",
    "mode": "local"
  }'
# Expected: {"results":[{"content":"...","score":1.0,...}],...}

# Other useful queries
curl -X POST localhost:8080/query \
  -H "Content-Type: application/json" \
  -d '{"query": "timeout success mode partial results", "workspace": "flow02-design", "mode": "local"}'

curl -X POST localhost:8080/query \
  -H "Content-Type: application/json" \
  -d '{"query": "PersonalizationCompleted machine literal cross flow collision", "workspace": "flow02-design", "mode": "local"}'
```

---

## Running teaching pipeline QA

The Playwright spec validates that all seeds landed and are queryable. All tests
skip gracefully when services are not running.

```bash
# Run from the client directory
cd client && npx playwright test e2e/teaching-pipeline.spec.ts

# Expected output when services are running and seeded:
#   10 passed

# Expected output when services are NOT running:
#   10 skipped

# Run with custom service endpoints
ES_URL=http://localhost:9200 GRAPHRAG_URL=http://localhost:8080 \
  npx playwright test e2e/teaching-pipeline.spec.ts
```

### What each test validates

| Test | Validates |
|---|---|
| SEED-01 | FLOW-02 arch patterns in ES (count >= 8) |
| SEED-02 | FLOW-01 arch patterns in ES (count >= 4) |
| SEED-03 | FLOW-02 DR triples in planning-decisions (count >= 7) |
| SEED-04 | FAN_IN pattern keyword-searchable |
| SEED-05 | dual-record-write pattern keyword-searchable |
| SEED-06 | nano-graphrag health endpoint responds |
| SEED-07 | nano-graphrag returns results for FLOW-02 design query |
| SEED-08 | FLOW-02 arbiters in xiigen-arbiters (count >= 6) |
| SEED-09 | `plan-flow02-business-onboarding` PLAN_EXEMPLAR present |
| SEED-10 | FLOW-01 DR triples in planning-decisions (requires FLOW-01 seed) |

---

## Using Ollama

To use a real OSS LLM instead of the mock backend:

```bash
# Install Ollama (https://ollama.ai)
ollama pull qwen2.5-coder:7b

# Start nano-graphrag with Ollama backend
LLM_PROVIDER=ollama docker compose --profile infra up nano-graphrag -d

# Or start Ollama separately and point to it
OLLAMA_BASE_URL=http://host.docker.internal:11434 \
LLM_PROVIDER=ollama \
  docker compose --profile infra up nano-graphrag -d

# Re-seed to build entity/relation graph with real LLM
python rag-benchmark/seed_flow02_patterns.py --skip-es
# (--skip-es because ES was already seeded; only graphrag needs re-seeding with real LLM)
```

---

## Fixture file locations

```
fixtures/
  rag-patterns/          ← 8 ARCH_PATTERN + 1 PLAN_EXEMPLAR (FLOW-02)
  design-reasoning/
    flow02-design-decisions.json   ← 7 DR triples (FLOW-02)
  contracts/
    t50.contract.json    ← FAN_IN  (ProfileEnrichmentFanIn)
    t51.contract.json    ← CONVERGENCE (CompatibilityScoringConvergence)
    t52.contract.json    ← BROADCAST (PersonalizationBroadcast)
  flow-definitions/
    flow-02-t50.topology.json
    flow-02-t51.topology.json
    flow-02-t52.topology.json
  arbiters/
    flow-02-arbiters.bulk.ndjson   ← 6 arbiters (load via ES bulk API)
  event-schemas/
    flow-02/             ← 13 event schema files

rag-benchmark/
  seed_flow02_patterns.py          ← FLOW-02 seeder
```

### Loading arbiters into Elasticsearch

The arbiter file uses ES bulk API format. Load it directly:

```bash
curl -X POST localhost:9200/_bulk \
  -H "Content-Type: application/x-ndjson" \
  --data-binary @fixtures/arbiters/flow-02-arbiters.bulk.ndjson
# Expected: {"errors":false,...}
```

---

## Troubleshooting

**`nano-graphrag unreachable`** — The service requires Docker. Start with:
```bash
docker compose --profile infra up nano-graphrag -d
```

**`ES unreachable`** — Start with:
```bash
docker compose --profile infra up elasticsearch -d
```

**`0 records in index after seeding`** — The seed script uses port 19200 by default (matches `docker-compose.test.yml`). If your ES runs on 9200:
```bash
python rag-benchmark/seed_flow02_patterns.py --es-endpoint http://localhost:9200
```

**`nano-graphrag slow on first insert`** — Normal. The initial workspace build extracts entities and relations. Subsequent inserts to the same workspace are faster. Use `LLM_PROVIDER=mock` for fast iteration without LLM quality.
