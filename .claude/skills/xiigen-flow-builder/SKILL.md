---
name: xiigen-flow-builder
version: "2.1.0"
description: |
  Skill for extending XIIGen with new flows (FLOW-32+). Use when: the user wants to add a
  new flow, define new task types, register new factory interfaces, create flow DAG templates,
  run BFA cross-flow validation, or plan a new engine extension.
  Triggers: "new flow", "FLOW-32", "FLOW-33", "add flow", "extend engine", "new task type",
  "T516", "F1339", "factory interface", "flow template", "flow DAG", "cross-flow",
  "BFA validation", "backward compatibility", "new family", "engine extension",
  "fabric resolution", "register factory", "flow specification", "flow design".
  ALWAYS use this skill when the user references adding capabilities to the engine that
  involve new flows, task types, or factory families. If the user says "build X feature",
  this skill teaches how to make the ENGINE generate X — not how to implement X directly.
allowed-tools: Read Write Edit Bash
argument-hint: "[flow name | 'plan' | 'validate' | 'merge']"
---

# XIIGen Flow Builder Skill

> You are NOT writing service code. You ARE extending the engine. The engine generates services.

## The Cardinal Rule

When someone says "build a marketplace" or "add payment processing", the correct response is NOT to write marketplace code. The correct response is:

1. Define new factory interfaces that resolve through existing fabrics
2. Create full engine contracts (task types) in the required format
3. Map AF stations for code generation and validation
4. Register in BFA for cross-flow conflict detection
5. Create a flow template DAG for the flow orchestrator
6. Verify DNA compliance and backward compatibility

---

## Before Starting Any Flow Extension

### Step 0: Check Numbers

Current next-available artifact numbers:

```
Factory:          F1339    Family: 200
Task Type:        T516
BFA Rule:         CF-715
Stress Test:      ST-431
Skill:            SK-330
Design Decision:  DD-323
Design Record:    DR-240
```

**CRITICAL:** Before assigning numbers, verify against the latest state of ENGINE_ARCHITECTURE_MERGED.md. Numbers may have advanced since this skill was written.

### Step 1: Read the Anchor Documents

Before writing anything, consult:
- `ENGINE_ARCHITECTURE_MERGED.md` — current engine state
- `TASK_TYPES_CATALOG_MERGED.md` — existing task type formats
- `V62_BFA_STRESS_TEST_MERGED.md` — existing BFA rules to avoid conflicts

---

## Phase 1: Plan (No Code Yet)

For each new flow, produce a plan document with:

### 1A: Flow Summary
- Flow name and ID (e.g., FLOW-32)
- Domain description (one paragraph)
- Number of factory families needed
- Number of task types needed

### 1B: Factory Interface Inventory
List every new factory interface with fabric resolution:

```
F1339:IOrderAggregator     → DATABASE FABRIC (PostgreSQL) — aggregates orders across sources
F1340:IOrderEventPublisher  → QUEUE FABRIC (Redis Streams) — publishes order lifecycle events  
F1341:IOrderClassifier      → AI ENGINE FABRIC (Claude)    — NLP classification of order types
F1342:IOrderTemplateStore   → RAG FABRIC (InMemory)        — retrieves order processing patterns
```

**Every factory MUST declare which fabric it resolves through.** This is non-negotiable.

### 1C: Task Type Inventory
List every new task type with archetype:

```
T516: Order Ingestion Gate      — ORCHESTRATION
T517: Order NLP Classification  — AI_GENERATION  
T518: Order Routing Dispatcher  — EVENT_HANDLER
```

### 1D: BFA Impact Assessment
Check against ALL existing flows (FLOW-01 through FLOW-31):

- Entity conflicts: Do any of my entities overlap with existing flows?
- Route conflicts: Do any of my API routes overlap?
- Event conflicts: Do any of my event types overlap?

**Wait for plan approval before proceeding.**

---

## Phase 2: Full Engine Contracts

For EACH task type, produce the FULL contract. Read: [references/contract-template.md](references/contract-template.md)

**One-line stubs are NEVER acceptable.** Each contract must include:
- Archetype
- Entry condition
- Purpose
- Distinction from existing task types
- Factory dependencies WITH fabric resolution
- AF station configuration
- BFA registration
- MACHINE vs FREEDOM split
- Iron rules
- Quality gates

---

## Phase 3: Factory Registration

For each factory interface:

```typescript
factoryRegistry.register({
  factoryId: 'F1339',
  interfaceName: 'IOrderAggregator',
  familyId: 'Family-200',
  fabricType: FabricType.DATABASE,
  provider: 'postgresql',
  description: 'Aggregates orders across sources',
  methods: ['aggregate', 'getAggregation', 'listAggregations'],
  status: 'GENERATED',
});
```

---

## Phase 4: AF Station Mapping

For each task type, define which AF stations participate:

```typescript
// T516 AF Configuration
afConfiguration: [
  // INVENTORY
  { stationId: 'AF-3', role: 'prompt_library', config: { domain: 'order-processing' } },
  { stationId: 'AF-4', role: 'rag_context', config: { patterns: ['orchestration', 'event-sourcing'] } },
  
  // SYNTHESIS  
  { stationId: 'AF-2', role: 'planning', config: { maxSteps: 5 } },
  { stationId: 'AF-1', role: 'generate', modelHint: 'claude-sonnet-4-20250514' },
  
  // JUDGMENT
  { stationId: 'AF-6', role: 'review', config: { focusAreas: ['error-handling', 'tenant-isolation'] } },
  { stationId: 'AF-9', role: 'judge', config: { gates: ['dna_compliance', 'scope_isolation', 'outbox_pattern'] } },
]
```

---

## Phase 5: BFA Cross-Flow Validation

Register new flow's entities, events, and routes:

```typescript
const registration: BfaRegistration = {
  entities: ['order_aggregate', 'order_classification'],
  events: ['order.ingested', 'order.classified', 'order.routed'],
  apiRoutes: ['/api/dynamic/order_aggregate', '/api/dynamic/order_classification'],
};

const conflicts = bfa.checkConflicts('FLOW-32', registration);
// Must return 0 errors (warnings may be acceptable)
```

---

## Phase 6: Flow Template DAG

Create the JSON flow definition for FlowOrchestrator:

```typescript
const flowTemplate = {
  flowId: 'FLOW-32',
  name: 'Order Processing Pipeline',
  version: '1.0.0',
  steps: [
    {
      stepId: 'ingest',
      taskTypeId: 'T516',
      factoryId: 'F1339',
      fabricType: 'DATABASE',
      next: ['classify'],
    },
    {
      stepId: 'classify',
      taskTypeId: 'T517',
      factoryId: 'F1341',
      fabricType: 'AI_ENGINE',
      next: ['route'],
    },
    {
      stepId: 'route',
      taskTypeId: 'T518',
      factoryId: 'F1340',
      fabricType: 'QUEUE',
      next: [],
    },
  ],
};
```

Each step = a factory interface resolved through a fabric via createAsync().

---

## Phase 7: DNA Compliance Verification

ALL generated services for this flow must pass:

- [ ] DNA-1: No typed models (Record<string, unknown> only)
- [ ] DNA-2: BuildSearchFilter on all queries
- [ ] DNA-3: DataProcessResult<T> on all methods
- [ ] DNA-4: Extends MicroserviceBase
- [ ] DNA-5: Tenant scope automatic via AsyncLocalStorage
- [ ] DNA-6: No entity-specific controllers
- [ ] DNA-7: Idempotency keys on queue consumers
- [ ] DNA-8: storeDocument() before enqueue()
- [ ] DNA-9: CloudEvents envelope on inter-service events

---

## Phase 8: Backward Compatibility Check

Verify:
- [ ] All T1–T515 still validate in TaskTypeRegistry
- [ ] All F1–F1338 still resolve in FactoryRegistry
- [ ] All CF-1–CF-714 still pass in BFA
- [ ] New artifact numbers don't collide with any existing
- [ ] No modification to any existing contract or factory

---

## Maintenance Rules — Canonical Doc Sync (v2.1)

When any TypeScript file is modified, the following canonical docs must be updated in the **same commit**. Cross-check with `documentation-sync` skill at session end.

| File Changed | Canonical Docs to Update |
|-------------|--------------------------|
| `server/src/engine-contracts/*.ts` | `ENGINE_ARCHITECTURE_MERGED`, `CLAUDE.md` |
| `server/src/factories/*.ts` | `ENGINE_ARCHITECTURE_MERGED`, `TASK_TYPES_CATALOG_MERGED` |
| `server/src/af-stations/*.ts` | `ENGINE_ARCHITECTURE_MERGED` |
| `server/src/fabrics/**/*.ts` | `ENGINE_ARCHITECTURE_MERGED` |
| `server/src/fabrics/*/provider-registry.ts` | `ENGINE_ARCHITECTURE_MERGED` (provider key list — case-sensitive) |
| New factory ID (F-XXXX) added | `ENGINE_ARCHITECTURE_MERGED`, `CLAUDE.md` (nextFactory number) |
| New task type (T-XXX) added | `TASK_TYPES_CATALOG_MERGED`, `CLAUDE.md` (nextTaskType number) |

**Anti-pattern:** Committing TypeScript changes without a matching doc update in the same commit.

---

## Reference Files

| File | When to Read |
|------|-------------|
| [references/contract-template.md](references/contract-template.md) | Before writing any engine contract |
| [references/flow-registry.md](references/flow-registry.md) | To check existing flows and avoid conflicts |
| [references/merge-protocol.md](references/merge-protocol.md) | When merging flow into canonical documents |
| [references/flow-34-adapter-pattern.md](references/flow-34-adapter-pattern.md) | Before writing any FLOW-34 marketplace adapter (MODE-B-thin) |

---

## Common Mistakes

1. **Writing service code instead of engine extensions** — You don't write OrderService. You create the engine contract that GENERATES OrderService.

2. **Skipping fabric resolution** — Every factory MUST say which fabric. `F1339:IOrderAggregator → DATABASE FABRIC` not just `F1339:IOrderAggregator`.

3. **One-line task type stubs** — `T516: Order Ingestion` is NOT a task type. It needs archetype, factory deps, AF config, BFA registration, quality gates.

4. **Importing providers in generated service code** — Generated services use fabric interfaces. Only provider files import SDKs.

5. **Forgetting BFA validation** — New flows MUST be checked against ALL existing 31 flows before shipping.

6. **Breaking backward compatibility** — New artifacts use new numbers only. Never modify existing T1–T515 or F1–F1338.
