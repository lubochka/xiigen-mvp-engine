/**
 * FLOW-27 Seed Prompts — genesis prompts for T413–T422 (Human Interaction Gate).
 *
 * Tier-2 platform-level genesis prompts seeded into PromptLibrary at bootstrap.
 * The arbitration loop improves these prompts across rounds via FeedbackSynthesizer.
 *
 * connection_type: FLOW_SCOPED (belongs to FLOW-27 — not tenant-exportable)
 * flow_id: FLOW-27
 */

/** Shape of a FLOW-27 genesis prompt record. */
export interface Flow27GenesisPrompt {
  readonly taskType: string;
  readonly promptText: string;
  readonly connection_type: 'FLOW_SCOPED';
  readonly flow_id: 'FLOW-27';
  readonly version: string;
}

// ── ORCHESTRATION ─────────────────────────────────────────────────────────

export const T413_GENESIS_PROMPT: Flow27GenesisPrompt = {
  taskType: 'T413',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-27',
  version: '1.0.0',
  promptText: `
You are generating ApprovalRequestCreator for the XIIGen Human Interaction Gate (FLOW-27).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts approval request metadata (Record<string, unknown>): requesterTenantId, workflowId, stepId, reviewerGroup
2. Creates and stores an approval request document (insert-only) via IDatabaseService
3. Emits approval.request.created CloudEvent via IQueueService to notify reviewer
4. Returns QUEUED immediately — NEVER blocks waiting for human response
5. Returns DataProcessResult<{ requestId: string; status: 'QUEUED'; notifiedAt: string }>

## Critical Iron Rules
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern
- Service MUST return QUEUED immediately — never poll/await for human response
- Insert-only — approval requests are immutable once created
- requestId MUST be a unique non-empty string (UUID or similar)

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- NEVER import DB/queue SDK directly — inject IDatabaseService and IQueueService
`.trim(),
};

export const T416_GENESIS_PROMPT: Flow27GenesisPrompt = {
  taskType: 'T416',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-27',
  version: '1.0.0',
  promptText: `
You are generating HumanTaskAssigner for the XIIGen Human Interaction Gate (FLOW-27).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts task assignment payload: taskId, assigneeId (user or group), deadline, priority
2. Stores assignment record via IDatabaseService (insert-only, tenant-scoped)
3. Emits task.assigned CloudEvent via IQueueService after store
4. Returns DataProcessResult<{ assignmentId: string; assignedAt: string; assigneeId: string }>

## Critical Iron Rules
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern
- Assignment records are insert-only — never mutate an existing assignment
- Deadline and priority MUST be echoed in result

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
`.trim(),
};

export const T419_GENESIS_PROMPT: Flow27GenesisPrompt = {
  taskType: 'T419',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-27',
  version: '1.0.0',
  promptText: `
You are generating ApprovalChainOrchestrator for the XIIGen Human Interaction Gate (FLOW-27).

## Task
Generate a NestJS service (TypeScript) that:
1. Reads chain configuration from FREEDOM config (key: flow27_approval_chain)
2. Supports both sequential (one-at-a-time) and parallel (all-at-once) chain modes
3. Creates an approval chain record with all required steps
4. Emits approval.chain.started CloudEvent after storing the chain record
5. Returns DataProcessResult<{ chainId: string; mode: string; stepCount: number; startedAt: string }>

## Critical Iron Rules
- Chain config MUST come from FREEDOM config — never hardcoded
- storeDocument() MUST be called BEFORE enqueue() — DNA-8
- Mode MUST be one of: SEQUENTIAL, PARALLEL

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
`.trim(),
};

export const T422_GENESIS_PROMPT: Flow27GenesisPrompt = {
  taskType: 'T422',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-27',
  version: '1.0.0',
  promptText: `
You are generating TaskDelegationOrchestrator (T422) for the XIIGen Human Interaction Gate (FLOW-27).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts delegation request: taskId, fromAssignee, toAssignee, reason
2. Records the delegation in an insert-only delegation history via IDatabaseService
3. Emits task.delegated CloudEvent via IQueueService after store
4. Returns DataProcessResult<{ delegationId: string; delegatedAt: string; fromAssignee: string; toAssignee: string }>

## Critical Iron Rules
- storeDocument() MUST be called BEFORE enqueue() — DNA-8
- Delegation history is insert-only — NEVER mutate prior delegation records
- Circular delegation (A→B→A) MUST return CIRCULAR_DELEGATION error

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
`.trim(),
};

// ── ARBITRATION ───────────────────────────────────────────────────────────

export const T414_GENESIS_PROMPT: Flow27GenesisPrompt = {
  taskType: 'T414',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-27',
  version: '1.0.0',
  promptText: `
You are generating ApprovalDecisionCapture for the XIIGen Human Interaction Gate (FLOW-27).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts: requestId, decision ('APPROVED' | 'REJECTED'), decidedBy, reason
2. Uses atomic set-if-not-exists idempotency (IScopedMemoryService.setIfAbsent()) — if decision already captured for requestId, return existing decision
3. Stores decision via IDatabaseService (insert-only) — storeDocument() BEFORE enqueue()
4. Emits approval.decision.captured CloudEvent via IQueueService
5. Returns DataProcessResult<{ decisionId: string; requestId: string; decision: string; decidedAt: string; duplicate: boolean }>

## Critical Iron Rules
- Atomic set-if-not-exists idempotency (IScopedMemoryService.setIfAbsent()): a second call for same requestId MUST return existing decision without re-storing
- decision field MUST be exactly 'APPROVED' or 'REJECTED'
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
`.trim(),
};

// ── GOVERNANCE ────────────────────────────────────────────────────────────

export const T415_GENESIS_PROMPT: Flow27GenesisPrompt = {
  taskType: 'T415',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-27',
  version: '1.0.0',
  promptText: `
You are generating ApprovalTimeoutHandler for the XIIGen Human Interaction Gate (FLOW-27).

## Task
Generate a NestJS service (TypeScript) that:
1. Checks if an approval request has exceeded its timeout threshold
2. Reads timeout thresholds from FREEDOM config (key: flow27_timeout_thresholds)
3. If timed out: stores escalation record (insert-only) and emits approval.escalated CloudEvent
4. Returns DataProcessResult<{ timedOut: boolean; escalationId?: string; timeoutThresholdMinutes: number }>

## Critical Iron Rules
- Timeout threshold MUST come from FREEDOM config — never hardcoded
- storeDocument() MUST be called BEFORE enqueue() — DNA-8
- escalationId MUST be non-empty when timedOut = true

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
`.trim(),
};

export const T421_GENESIS_PROMPT: Flow27GenesisPrompt = {
  taskType: 'T421',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-27',
  version: '1.0.0',
  promptText: `
You are generating HumanTaskAuditTrail for the XIIGen Human Interaction Gate (FLOW-27).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts an audit event: eventType, entityId, actorId, details (Record<string, unknown>)
2. Stores the audit record via IDatabaseService — INSERT ONLY, never update or delete
3. Emits audit.event.recorded CloudEvent via IQueueService after store
4. Returns DataProcessResult<{ auditId: string; recordedAt: string; eventType: string }>

## Critical Iron Rules
- Audit records are IMMUTABLE — insert-only, no updates, no deletes
- storeDocument() MUST be called BEFORE enqueue() — DNA-8
- auditId MUST be unique and non-empty

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
`.trim(),
};

// ── GUARD ─────────────────────────────────────────────────────────────────

export const T420_GENESIS_PROMPT: Flow27GenesisPrompt = {
  taskType: 'T420',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-27',
  version: '1.0.0',
  promptText: `
You are generating ApprovalGateEnforcer (T420) for the XIIGen Human Interaction Gate (FLOW-27).

## Task
Generate a NestJS service (TypeScript) that:
1. Checks whether a gate (identified by requestId) has been approved
2. If NOT approved: returns GATE_BLOCKED — hard stop, no bypass
3. If approved: stores gate-passed audit record and emits gate.passed CloudEvent
4. Returns DataProcessResult<{ passed: boolean; requestId: string; blockedReason?: string }>

## Critical Iron Rules
- HARD STOP if gate not approved — NO bypass path whatsoever
- storeDocument() MUST be called BEFORE enqueue() — DNA-8
- GATE_BLOCKED error code MUST be used when approval is missing

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
`.trim(),
};

// ── BUILD + LEARNING ──────────────────────────────────────────────────────

export const T418_GENESIS_PROMPT: Flow27GenesisPrompt = {
  taskType: 'T418',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-27',
  version: '1.0.0',
  promptText: `
You are generating ScheduledTaskTrigger for the XIIGen Human Interaction Gate (FLOW-27).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts: taskId, triggerAt (ISO string), payload (Record<string, unknown>)
2. Idempotent — same (taskId, triggerAt) compound key returns existing trigger without re-storing
3. Stores trigger record via IDatabaseService, then emits task.trigger.scheduled CloudEvent
4. Returns DataProcessResult<{ triggerId: string; taskId: string; triggerAt: string; duplicate: boolean }>

## Critical Iron Rules
- Idempotency by (taskId, triggerAt) compound key — duplicate returns existing WITHOUT re-store
- storeDocument() MUST be called BEFORE enqueue() — DNA-8
- triggerId MUST be non-empty string

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
`.trim(),
};

export const T417_GENESIS_PROMPT: Flow27GenesisPrompt = {
  taskType: 'T417',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-27',
  version: '1.0.0',
  promptText: `
You are generating TaskCompletionTracker for the XIIGen Human Interaction Gate (FLOW-27).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts completion event: taskId, completedBy, completionStatus, durationMinutes
2. NEVER processes on live path — completion metrics go via queue ONLY (async-only, SCORE-0)
3. Stores completion record via IDatabaseService, then emits task.completed CloudEvent
4. Returns DataProcessResult<{ trackingId: string; taskId: string; recordedAt: string }>

## Critical Iron Rules
- ASYNC-ONLY: TaskCompletionTracker MUST only be triggered via queue consumer — never on live request path
- storeDocument() MUST be called BEFORE enqueue() — DNA-8
- SLA metrics are queue-only — NEVER inline on live path

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
`.trim(),
};

// ── Catalog ───────────────────────────────────────────────────────────────

/** All FLOW-27 genesis prompts in task-type order. */
export const HUMAN_APPROVAL_GATE_SEED_PROMPTS: Flow27GenesisPrompt[] = [
  T413_GENESIS_PROMPT,
  T414_GENESIS_PROMPT,
  T415_GENESIS_PROMPT,
  T416_GENESIS_PROMPT,
  T417_GENESIS_PROMPT,
  T418_GENESIS_PROMPT,
  T419_GENESIS_PROMPT,
  T420_GENESIS_PROMPT,
  T421_GENESIS_PROMPT,
  T422_GENESIS_PROMPT,
];
