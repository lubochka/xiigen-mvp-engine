/**
 * FLOW-26 Seed Prompts — genesis prompts for T389–T412 (Self-Developing Meta-Flow Engine).
 *
 * Tier-2 platform-level genesis prompts seeded into PromptLibrary at bootstrap.
 *
 * connection_type: FLOW_SCOPED (belongs to FLOW-26 — not tenant-exportable)
 * flow_id: FLOW-26
 */

/** Shape of a FLOW-26 genesis prompt record. */
export interface Flow26GenesisPrompt {
  readonly taskType: string;
  readonly promptText: string;
  readonly connection_type: 'FLOW_SCOPED';
  readonly flow_id: 'FLOW-26';
  readonly version: string;
}

const BASE: Pick<Flow26GenesisPrompt, 'connection_type' | 'flow_id' | 'version'> = {
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-26',
  version: '1.0.0',
};

export const T389_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T389',
  promptText: `
You are generating FlowSpecParser for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a raw flow spec document (Record<string, unknown>): flowId, name, description, taskTypes
2. Parses and normalizes into a canonical FlowSpecDocument
3. Stores the document INSERT-ONLY via IDatabaseService — idempotent by specId
4. Emits flow.spec.parsed CloudEvent via IQueueService after store
5. Returns DataProcessResult<{ specId: string; flowId: string; taskCount: number; parsedAt: string }>

## Iron Rules
- storeDocument() MUST be called BEFORE enqueue() — DNA-8
- Idempotent by specId — duplicate returns existing without re-storing
- Insert-only — never update or delete

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
`.trim(),
};

export const T390_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T390',
  promptText: `
You are generating FlowSpecValidator for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Reads validation rules from FREEDOM config (key: flow26_validation_rules)
2. Validates a flow spec (specId, taskTypes, archetypes) against those rules
3. Stores validation result via IDatabaseService
4. Emits flow.spec.validated or flow.spec.invalid CloudEvent via IQueueService
5. Returns DataProcessResult<{ validationId: string; valid: boolean; errors: string[]; validatedAt: string }>

## Iron Rules
- Validation rules MUST come from FREEDOM config — never hardcoded
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T391_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T391',
  promptText: `
You are generating FlowDependencyMapper for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts specId and the new flow's BFA entities/events/routes
2. Maps inter-flow dependencies by checking overlap with existing flows
3. Stores dependency map via IDatabaseService
4. Emits flow.dependencies.mapped CloudEvent via IQueueService
5. Returns DataProcessResult<{ mapId: string; dependentFlows: string[]; conflictSurface: string[]; mappedAt: string }>

## Iron Rules
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T392_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T392',
  promptText: `
You are generating FlowTemplateResolver for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Reads template registry from FREEDOM config (key: flow26_template_registry)
2. Resolves code generation templates for each task type in the spec based on archetype
3. Stores resolved template set via IDatabaseService
4. Emits flow.templates.resolved CloudEvent via IQueueService
5. Returns DataProcessResult<{ templateSetId: string; resolvedCount: number; resolvedAt: string }>

## Iron Rules
- Template registry MUST come from FREEDOM config — never hardcoded
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T393_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T393',
  promptText: `
You are generating CodeScaffoldGenerator for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts templateSetId and flowId
2. Generates NestJS service scaffold (class skeleton, imports, MicroserviceBase extension) for each task type
3. Stores scaffold document via IDatabaseService
4. Emits flow.scaffold.generated CloudEvent via IQueueService
5. Returns DataProcessResult<{ scaffoldId: string; filesGenerated: number; generatedAt: string }>

## Iron Rules
- Generated scaffold MUST include MicroserviceBase extension (DNA-4)
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T394_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T394',
  promptText: `
You are generating ServiceCodeGenerator for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts scaffoldId and task type spec
2. Generates full NestJS service implementation via IAiProvider (AF pipeline)
3. ALL generated methods must return DataProcessResult<T> — never throw
4. Stores generated code via IDatabaseService
5. Returns DataProcessResult<{ codeId: string; taskType: string; linesGenerated: number; generatedAt: string }>

## Iron Rules
- ALL generated methods MUST return DataProcessResult<T> — DNA-3
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T395_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T395',
  promptText: `
You are generating TestCodeGenerator for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts codeId and service spec
2. Generates unit + integration test suite covering: UNSCOPED_QUERY, DNA-8 ordering, DB failure propagation
3. Stores generated tests via IDatabaseService
4. Emits flow.tests.generated CloudEvent via IQueueService
5. Returns DataProcessResult<{ testSuiteId: string; testCount: number; generatedAt: string }>

## Iron Rules
- Tests MUST cover UNSCOPED_QUERY, DNA-8 store-before-enqueue ordering, and DB failure propagation
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T396_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T396',
  promptText: `
You are generating ContractCodeEmitter for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts flowId, task types array, and BFA registration data
2. Emits a valid EngineContract TypeScript file using bfaRegistration/machineComponents/freedomComponents shape
3. Stores contract code artifact via IDatabaseService
4. Emits flow.contract.emitted CloudEvent via IQueueService
5. Returns DataProcessResult<{ artifactId: string; contractCount: number; emittedAt: string }>

## Iron Rules
- Contract MUST use bfaRegistration/machineComponents/freedomComponents — NOT bfaEntities/bfaEvents/bfaRoutes
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T397_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T397',
  promptText: `
You are generating CodeAssemblyOrchestrator for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts flowId and artifact IDs (scaffoldId, codeId, testSuiteId, artifactId)
2. Idempotent by flowId — second call returns existing assembly without re-assembling
3. Assembles all artifacts into a complete deployable set
4. Stores assembly record via IDatabaseService, emits flow.code.assembled
5. Returns DataProcessResult<{ assemblyId: string; status: 'QUEUED'; flowId: string; assembledAt: string }>

## Iron Rules
- Idempotent by flowId — duplicate returns existing WITHOUT re-assembling
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T398_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T398',
  promptText: `
You are generating DnaComplianceChecker for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts assemblyId and assembled code content
2. Atomic set-if-not-exists idempotency by assemblyId — if already checked, return existing result (IScopedMemoryService.setIfAbsent() — no separate check + write)
3. Verifies all 9 DNA rules (DNA-1 through DNA-9) are satisfied in the generated code
4. Stores compliance report via IDatabaseService, emits flow.dna.checked
5. Returns DataProcessResult<{ reportId: string; compliant: boolean; violations: string[]; checkedAt: string; duplicate: boolean }>

## Iron Rules
- setIfAbsent (IScopedMemoryService.setIfAbsent()): second call for same assemblyId returns existing WITHOUT re-checking
- All 9 DNA rules must be checked
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T399_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T399',
  promptText: `
You are generating BfaConflictScanner for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts flowId and BFA registration data (entities, events, routes)
2. Scans for conflicts with all 31 existing flows (entity, event, route overlaps)
3. Stores scan report via IDatabaseService, emits flow.bfa.scanned
4. Returns DataProcessResult<{ scanId: string; conflictsFound: number; conflicts: Record<string,unknown>[]; scannedAt: string }>

## Iron Rules
- MUST check against all 31 existing flows — no partial scan
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T400_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T400',
  promptText: `
You are generating FlowQualityGate for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Reads quality check results for the flowId from IDatabaseService (DNA, BFA, syntax checks)
2. If any check failed or missing: returns QUALITY_GATE_FAILED — HARD STOP, NO bypass
3. If all passed: stores gate-passed record, emits flow.quality.passed
4. Returns DataProcessResult<{ gateId: string; passed: boolean; failedChecks: string[] }>

## Iron Rules
- HARD STOP if any quality check failed — QUALITY_GATE_FAILED, NO bypass path whatsoever
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T401_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T401',
  promptText: `
You are generating SyntaxValidationRunner for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts assemblyId and TypeScript source content
2. Runs TypeScript syntax/type validation (parse tree check, type error detection)
3. Stores validation result via IDatabaseService, emits flow.syntax.validated or flow.syntax.failed
4. Returns DataProcessResult<{ validationId: string; valid: boolean; errors: string[]; validatedAt: string }>

## Iron Rules
- TypeScript compiler errors reported as structured DataProcessResult.failure
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T402_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T402',
  promptText: `
You are generating CrossFlowImpactAnalyzer for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts scanId (from T399 BFA scan) and conflict list
2. Analyzes severity of each conflict (LOW/MEDIUM/HIGH/CRITICAL)
3. Stores impact report via IDatabaseService, emits flow.impact.analyzed
4. Returns DataProcessResult<{ reportId: string; maxSeverity: string; impactedFlows: string[]; analyzedAt: string }>

## Iron Rules
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T403_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T403',
  promptText: `
You are generating FlowRegistrationOrchestrator for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts flowId and assemblyId
2. Idempotent by flowId — second call returns existing registration without re-registering
3. Coordinates registration phases (task types → factories → seed prompts) in sequence
4. Stores registration record, emits flow.registered
5. Returns DataProcessResult<{ registrationId: string; status: 'QUEUED'; flowId: string; registeredAt: string }>

## Iron Rules
- Idempotent by flowId — duplicate returns QUEUED status
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T404_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T404',
  promptText: `
You are generating TaskTypeRegistrar for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a list of EngineContract task type records
2. Idempotent per taskTypeId — skip existing without error, return skipped count
3. Stores registration record per new task type, emits task.types.registered
4. Returns DataProcessResult<{ registrationId: string; registered: number; skipped: number; registeredAt: string }>

## Iron Rules
- Idempotent per taskTypeId — no duplicate registrations
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T405_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T405',
  promptText: `
You are generating FactoryRegistrar for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a list of factory dependency records (factoryId, interfaceName, fabricType)
2. Idempotent per factoryId — skip existing without error
3. Stores factory registration records, emits factories.registered
4. Returns DataProcessResult<{ registrationId: string; registered: number; skipped: number; registeredAt: string }>

## Iron Rules
- Idempotent per factoryId — no duplicate registrations
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T406_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T406',
  promptText: `
You are generating SeedPromptRegistrar for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts an array of genesis prompt records (taskType, promptText, connection_type, flow_id)
2. Idempotent by (taskType, flow_id) compound key — skip existing without error
3. All prompts must have connection_type: FLOW_SCOPED
4. Stores seeding records, emits seed.prompts.registered
5. Returns DataProcessResult<{ seedingId: string; seeded: number; skipped: number; seededAt: string }>

## Iron Rules
- Idempotent by (taskType, flow_id) compound key — no duplicate seeding
- connection_type MUST be FLOW_SCOPED
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T407_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T407',
  promptText: `
You are generating FlowDeploymentGate for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts flowId and checks that DNA compliance, BFA scan, quality gate, syntax validation, impact analysis all passed
2. If any prerequisite check is missing or failed: returns FLOW_DEPLOYMENT_BLOCKED — HARD STOP, NO bypass
3. If all passed: stores deployment gate record, emits flow.deployment.approved
4. Returns DataProcessResult<{ gateId: string; approved: boolean; missingChecks: string[] }>

## Iron Rules
- HARD STOP — FLOW_DEPLOYMENT_BLOCKED if any prerequisite missing — NO bypass
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T408_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T408',
  promptText: `
You are generating SelfExtensionLearner for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. SCORE-0 ASYNC-ONLY: must only be triggered via queue consumer — never on live path
2. Accepts flowId, outcome (SUCCESS/FAILURE), and generation metrics
3. Aggregates learnings from generation outcomes into a learning record
4. Stores learning record via IDatabaseService, emits self.extension.learned
5. Returns DataProcessResult<{ learningId: string; period: string; learnedAt: string }>

## Iron Rules
- ASYNC-ONLY: MUST only be triggered via queue consumer — never on live request path
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T409_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T409',
  promptText: `
You are generating FlowEvolutionTracker for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts flowId, version, changeType, and changelog entry
2. Stores evolution record INSERT-ONLY via IDatabaseService — never update, never delete
3. Emits flow.evolution.tracked CloudEvent via IQueueService after store
4. Returns DataProcessResult<{ evolutionId: string; version: string; trackedAt: string }>

## Iron Rules
- Evolution records are IMMUTABLE — insert-only, no updates, no deletes
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T410_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T410',
  promptText: `
You are generating MetaFlowAuditEmitter for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts eventType, entityId, actorId, details (Record<string, unknown>)
2. Stores audit record INSERT-ONLY via IDatabaseService — never update, never delete
3. Emits meta.flow.audit.recorded CloudEvent via IQueueService after store
4. Returns DataProcessResult<{ auditId: string; recordedAt: string; eventType: string }>

## Iron Rules
- Audit records are IMMUTABLE — insert-only, no updates, no deletes
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T411_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T411',
  promptText: `
You are generating ExtensionHealthScorer for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Reads generation success rate, validation pass rate, BFA conflict rate from IDatabaseService
2. Computes a health score in range 0.0–1.0
3. Stores health score via IDatabaseService, emits extension.health.scored
4. Returns DataProcessResult<{ scoreId: string; healthScore: number; scoredAt: string }>

## Iron Rules
- Health score MUST be in range 0.0–1.0 (inclusive)
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T412_GENESIS_PROMPT: Flow26GenesisPrompt = {
  ...BASE,
  taskType: 'T412',
  promptText: `
You are generating MetaFlowOrchestrator for the XIIGen Self-Developing Meta-Flow Engine (FLOW-26).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts extensionRequestId, flowSpec (Record<string, unknown>)
2. Idempotent by extensionRequestId — second call returns existing cycle record with QUEUED status
3. Stores orchestration record (insert-only) via IDatabaseService
4. Emits meta.flow.cycle.complete CloudEvent via IQueueService after store
5. Returns DataProcessResult<{ cycleId: string; status: 'QUEUED'; extensionRequestId: string; startedAt: string }>

## Iron Rules
- Idempotent by extensionRequestId — duplicate returns existing QUEUED record
- Return QUEUED immediately — never block for pipeline completion
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
`.trim(),
};

/** All FLOW-26 genesis prompts in task-type order. */
export const FLOW_EXTENSION_ENGINE_SEED_PROMPTS: Flow26GenesisPrompt[] = [
  T389_GENESIS_PROMPT,
  T390_GENESIS_PROMPT,
  T391_GENESIS_PROMPT,
  T392_GENESIS_PROMPT,
  T393_GENESIS_PROMPT,
  T394_GENESIS_PROMPT,
  T395_GENESIS_PROMPT,
  T396_GENESIS_PROMPT,
  T397_GENESIS_PROMPT,
  T398_GENESIS_PROMPT,
  T399_GENESIS_PROMPT,
  T400_GENESIS_PROMPT,
  T401_GENESIS_PROMPT,
  T402_GENESIS_PROMPT,
  T403_GENESIS_PROMPT,
  T404_GENESIS_PROMPT,
  T405_GENESIS_PROMPT,
  T406_GENESIS_PROMPT,
  T407_GENESIS_PROMPT,
  T408_GENESIS_PROMPT,
  T409_GENESIS_PROMPT,
  T410_GENESIS_PROMPT,
  T411_GENESIS_PROMPT,
  T412_GENESIS_PROMPT,
];
