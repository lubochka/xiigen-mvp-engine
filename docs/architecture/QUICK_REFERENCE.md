# XIIGen Quick Reference

## Next Artifact Numbers (verify against `docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json`)
```
F1601  ·  Family 209  ·  T650  ·  CF-809  ·  SK-529  ·  DR-240
```
Updated 2026-04-14: FLOW-15..24 consumed T605-T649, F1519-F1600, CF-15-1..CF-24-4.

---

## Commands
```bash
cd server && npm run start:dev                     # Run server
cd server && npx jest --verbose                    # All 10,100+ server tests
cd server && npx jest --coverage                   # Test with coverage
cd server && npx jest --testPathPattern="fabrics"  # Test specific module
cd client && npm run dev                           # Run client
cd client && npx jest --verbose                    # ~1,080 client tests
docker compose up --build                          # Full stack
```

---

## 9 DNA Patterns -- Pass/Fail

| DNA | Do | Never |
|-----|-------|---------|
| 1 | `Record<string, unknown>` for all business data | `class Product { name: string }` |
| 2 | `buildSearchFilter()` skips empty fields | Hardcoded ES query with manual field checks |
| 3 | `return DataProcessResult.failure(...)` | `throw new Error(...)` |
| 4 | `class Svc extends MicroserviceBase` | Standalone class without base |
| 5 | `tenantId` from AsyncLocalStorage (automatic) | Passing tenantId as method parameter |
| 6 | DynamicController for all CRUD | `@Controller('products')` |
| 7 | Idempotency key on all queue consumers | Queue consumer without dedup |
| 8 | `storeDocument()` THEN `enqueue()` | Queue before persist |
| 9 | `createCloudEvent()` on all inter-service events | Plain object event |

---

## 6 Fabric Interfaces + Graph Intelligence

```
DATABASE    IDatabaseService       ES, PostgreSQL, InMemory
QUEUE       IQueueService          InMemory, SQS + DLQ
AI_ENGINE   IAiProvider            Anthropic, OpenAI, Gemini, Grok, Ollama, Mock
            IAiDispatcher          parallel multi-model + aggregation
RAG         IRagService            InMemory, Pinecone, LightRAG, Memgraph, NanoGraphRAG
SECRETS     ISecretsService        AWS, EnvVar, InMemory
FLOW_ENGINE IFlowOrchestrator      InMemory DAG executor + definition store
GRAPH       IGraphRagService       Graph Intelligence Layer (confidence-gated planning)
            IGraphLearningService  ElasticsearchGraphLearningProvider
```
All fabric interfaces: `server/src/fabrics/interfaces/`
Graph interfaces: `server/src/fabrics/graph/interfaces/`

---

## Injection Tokens

```typescript
export const DATABASE_SERVICE  = Symbol('IDatabaseService');
export const QUEUE_SERVICE     = Symbol('IQueueService');
export const AI_PROVIDER       = Symbol('IAiProvider');
export const AI_DISPATCHER     = Symbol('IAiDispatcher');
export const RAG_SERVICE       = Symbol('IRagService');
export const SECRETS_SERVICE   = Symbol('ISecretsService');
export const FLOW_ORCHESTRATOR = Symbol('IFlowOrchestrator');

// Graph fabric tokens (string-based)
export const GRAPH_RAG_SERVICE       = 'GRAPH_RAG_SERVICE';
export const GRAPH_LEARNING_SERVICE  = 'GRAPH_LEARNING_SERVICE';
export const GRAPH_CONFIG_READER     = 'GRAPH_CONFIG_READER';
export const EDGE_VERSIONING_SERVICE = 'EDGE_VERSIONING_SERVICE';
```

---

## Factory Resolution Pattern

```typescript
// Correct -- inject fabric interface
constructor(@Inject(DATABASE_SERVICE) private db: IDatabaseService) {}

// Wrong -- never import provider SDK
import { Client } from '@elastic/elasticsearch';
```

---

## Task Type Contract (12 required sections)

```
TASK TYPE - ARCHETYPE - ENTRY - PURPOSE - DISTINCT FROM
FACTORY DEPENDENCIES - FABRIC RESOLUTION - AF CONFIGURATION
BFA VALIDATION - MACHINE/FREEDOM - IRON RULES - QUALITY GATES
```
Full template: `CLAUDE.md` or `KNOWLEDGE_DIGEST.md` Section 7

---

## 7 Canonical Files (design-time reference)

```
ENGINE_ARCHITECTURE_MERGED.md    F1-F1338+, 31+ flows
TASK_TYPES_CATALOG_MERGED.md     T1-T515+ engine contracts
SKILLS_FACTORY_RAG_MERGED.md     SK-1-SK-329+
V62_BFA_STRESS_TEST_MERGED.md    CF-1-CF-714+
UNIFIED_SOURCE_INDEX_MERGED.md   cross-reference
SESSION_STATE_MERGE.md           global tracker
MASTER_EXECUTION_PLAN_MERGED.md  all execution plans
```

---

## Promotion Ladder

```
GENERATED -> INJECTED -> MINIMAL -> CORE
```
Transitions: basic tests (INJECTED), DNA+BFA pass (MINIMAL), full coverage (CORE)

---

## ES Index Naming

```
xiigen-flow-executions           flow state
xiigen-prompts                   AF-3 prompt library
xiigen-rag-patterns              AF-4 RAG patterns
xiigen-feedback                  AF-11 quality scores
xiigen-feature-flags             per-tenant features
xiigen-{entity}-{tenantId}       dynamic entity docs
xiigen-spec-audit-reports        SpecAudit results (self-sufficiency)
xiigen-capability-gap-proposals  flow proposals + overlap decisions
xiigen-fabric-registry           registered fabric interfaces
xiigen-capability-manifest       FREEDOM keys + capabilities
xiigen-graph-edges               graph edge documents (confidence, relationships)
xiigen-graph-proposals           mutation proposal lifecycle
xiigen-graph-rejections          rejection history (window-based)
xiigen-edge-snapshots            highest-confidence snapshot per edge
xiigen-planning-decisions        DPO triples for planning decisions
xiigen-training-data             arbiter signals + training data
xiigen-flow-lifecycle            routing decision outcomes
```

---

## Graph Intelligence (Dynamic AI Decision Architecture)

```
if (edge.confidence >= threshold) -> use graph (bootstrap, zero AI cost)
else                              -> IAIDecisionPipeline (4-role AI protocol)
```

Mode switch: `process.env.ENGINE_DECISION_MODE` = `'bootstrap'` (default) | `'ai-driven'`

Mutation lifecycle: `PENDING_SCREEN -> PENDING_SIMULATION -> PENDING_HUMAN -> APPROVED | REJECTED | ROLLED_BACK`

---

## State Recovery

```bash
cat docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json    # Flow status + artifact boundaries
cd server && npx jest --verbose 2>&1 | tail -5       # Current test count
git log --oneline -10                                # Recent commits
```
