# Engine Contracts Reference

## What Is an Engine Contract?

An engine contract (task type) tells the engine what it knows how to build. Each contract is a complete specification including factory dependencies, fabric resolution, AF station mapping, BFA registration, and quality gates.

## Current State

- Task Types: T1–T515 (across 31 flows)
- Factories: F1–F1338 (199 families)
- BFA Rules: CF-1–CF-714

## Next Available Numbers (FLOW-32+)

```
Factory:          F1339    Family: 200
Task Type:        T516
BFA Rule:         CF-715
Stress Test:      ST-431
Skill:            SK-330
Design Decision:  DD-323
Design Record:    DR-240
```

---

## Full Contract Format (Required)

Every new task type MUST use this exact format. One-line stubs are NOT acceptable.

```typescript
const contract: EngineContract = {
  // IDENTITY
  taskTypeId: 'T516',
  name: 'Descriptive Name',
  version: '1.0.0',
  
  // ARCHETYPE — one of:
  // ORCHESTRATION, DATA_PIPELINE, AI_GENERATION,
  // EVENT_HANDLER, INTEGRATION, VALIDATION
  archetype: ContractArchetype.ORCHESTRATION,
  
  // TRIGGER
  entry: 'Fires after [specific event or condition]',
  
  // PURPOSE
  purpose: 'What this task type produces and why',
  
  // DISTINCTION — what existing task type is similar and how this differs
  distinctFrom: {
    taskTypeId: 'T40',
    reason: 'T40 merges 3 streams; T516 handles N streams with dynamic fan-in',
  },
  
  // FACTORY DEPENDENCIES — each must declare fabric type
  factoryDependencies: [
    {
      factoryId: 'F1339',
      interfaceName: 'IMyService',
      fabricType: FabricType.DATABASE,       // ← WHICH FABRIC
      providerHint: 'postgresql',
      description: 'Stores aggregated results',
    },
    {
      factoryId: 'F1340',
      interfaceName: 'IMyQueueService',
      fabricType: FabricType.QUEUE,           // ← WHICH FABRIC
      providerHint: 'redis_streams',
      description: 'Event coordination between steps',
    },
    {
      factoryId: 'F1341',
      interfaceName: 'IMyAiService',
      fabricType: FabricType.AI_ENGINE,       // ← WHICH FABRIC
      providerHint: 'anthropic',
      description: 'NLP classification of incoming payload',
    },
  ],
  
  // AF STATION CONFIGURATION
  afConfiguration: [
    {
      stationId: 'AF-1',
      role: 'generate',
      modelHint: 'claude-sonnet-4-20250514',
      config: { strategy: 'template-based' },
    },
    {
      stationId: 'AF-4',
      role: 'rag_context',
      config: {
        patterns: ['orchestration', 'event-driven', 'fan-in'],
        maxPatterns: 5,
      },
    },
    {
      stationId: 'AF-9',
      role: 'judge',
      config: {
        gates: ['dna_compliance', 'scope_isolation', 'outbox_pattern'],
        minScore: 0.7,
      },
    },
  ],
  
  // BFA REGISTRATION — for cross-flow conflict detection
  bfaRegistration: {
    entities: ['my_entity', 'my_aggregate'],
    events: ['my_entity.created', 'my_entity.processed', 'my_aggregate.completed'],
    apiRoutes: ['/api/dynamic/my_entity', '/api/dynamic/my_aggregate'],
  },
  
  // MACHINE vs FREEDOM SPLIT
  machineFreedom: {
    machine: [
      'Queue coordination pattern (Main → Consumed → Archive)',
      'Retry logic with exponential backoff',
      'State machine transitions',
      'Idempotency key generation',
    ],
    freedom: [
      'Entity field definitions',
      'Notification templates',
      'Approval thresholds',
      'AI model selection per step',
      'Feature flags per tenant',
    ],
  },
  
  // IRON RULES — violations = BUILD FAILURE
  ironRules: [
    'All services MUST extend MicroserviceBase',
    'All returns MUST be DataProcessResult<T>',
    'No typed models for business data',
    'storeDocument() BEFORE enqueue()',
    'Tenant scope on every query',
  ],
  
  // QUALITY GATES — what AF-9 checks
  qualityGates: [
    { gate: 'dna_compliance', weight: 0.3, threshold: 1.0 },
    { gate: 'scope_isolation', weight: 0.2, threshold: 1.0 },
    { gate: 'outbox_pattern', weight: 0.15, threshold: 1.0 },
    { gate: 'test_coverage', weight: 0.2, threshold: 0.8 },
    { gate: 'code_complexity', weight: 0.15, threshold: 0.7 },
  ],
};
```

---

## 6 Contract Archetypes

| Archetype | Use For | Key Characteristic |
|-----------|---------|-------------------|
| ORCHESTRATION | Multi-step flow coordination | Multiple factory deps, queue between steps |
| DATA_PIPELINE | ETL / data transformation | Source→Transform→Sink pattern |
| AI_GENERATION | AI-driven content/code creation | Heavy AI Engine Fabric usage |
| EVENT_HANDLER | Single event → reaction | One trigger, focused response |
| INTEGRATION | External system bridge | Adapter pattern, circuit breaker |
| VALIDATION | Cross-flow or cross-service checks | BFA-heavy, read-only |

---

## Registration Steps

1. Create the contract object following the full format above
2. Register in `TaskTypeRegistry.register(contract)`
3. Register all factory dependencies in `FactoryRegistry.register(entry)`
4. Run `BFA.checkConflicts(flowId, bfaRegistration)` — must return 0 errors
5. Validate backward compatibility: existing T1–T515 unchanged
6. Write tests: contract validation, BFA conflict checks, factory resolution

---

## BFA Conflict Checks

The BFA checks three things against ALL existing flows:

1. **Entity ownership:** If your contract claims entity `order`, and FLOW-08 already owns it → ERROR
2. **API route overlap:** If your contract registers `/api/dynamic/payment`, and FLOW-08 already has it → ERROR  
3. **Event collision:** If your contract publishes `payment.completed`, and FLOW-08 also publishes it → WARNING

Fix entity conflicts by namespacing: `myflow_order` instead of `order`.
Fix route conflicts by using unique index names.
Event warnings may be acceptable for event bus patterns.

---

## Backward Compatibility Rules

When adding new contracts:
- ALL existing T1–T515 must continue to validate
- ALL existing F1–F1338 must continue to resolve
- ALL existing CF-1–CF-714 must continue to pass
- New artifacts use numbers >= F1339, T516, CF-715
- Never modify existing contract definitions — only add new ones
