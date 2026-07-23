/**
 * FLOW-18 BFA Rules — Visual Flow Creation & Code Injection Engine (new services T617-T620)
 *
 * CF-18-1: T617 BOLA ORDER 1 + FLOW_IMMUTABLE ORDER 2 + DRAFT→PUBLISHED one-way guard
 * CF-18-2: T618 DFS cycle detection ORDER 1 + type compatibility per-edge ORDER 2 + OCC DRAFT→PUBLISHED
 * CF-18-3: T619 SETNX before both writes + redis.del in catch on failure
 * CF-18-4: T620 version lock ORDER 1 + pre-write audit ORDER 2 + append-only injection audit
 */

export const VISUAL_FLOW_ENGINE_BFA_RULES = [
  {
    ruleId: 'CF-18-1',
    flowId: 'FLOW-18',
    description:
      'T617 FlowCanvasWriter: two-guard canvas write gate is MACHINE-FIXED. ' +
      'BOLA check (flow.tenantId === ALS.tenantId) at ORDER 1 before any state check. ' +
      'FLOW_IMMUTABLE guard (flow.status !== PUBLISHED) at ORDER 2 after BOLA. ' +
      'DRAFT→PUBLISHED is a one-way state transition — published flows cannot be modified. ' +
      'FlowImmutableRejected emitted immediately on published flow write attempt. ' +
      'FLOW_IMMUTABLE_STATES = [PUBLISHED] — compile-time constant, never from config. ' +
      'storeDocument(audit) at ORDER 4 BEFORE enqueue(FlowCanvasUpdated). DNA-8. ' +
      'SF-CHECK-18-1.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-18-2',
    flowId: 'FLOW-18',
    description:
      'T618 FlowPublicationOrchestrator: DFS cycle detection is MACHINE-FIXED at ORDER 1. ' +
      'WHITE/GRAY/BLACK node coloring. GRAY node re-visit = cycle → CycleDetected emitted, no further processing. ' +
      'Type compatibility per-edge validated at ORDER 2 — source output schema must be compatible with target input schema. ' +
      'TypeMismatch emitted with edge identifier and schema details on incompatibility. ' +
      'OCC updateDocument(status:PUBLISHED, expectedVersion) at ORDER 3 — NOT plain storeDocument. ' +
      'OCC_CONFLICT → FlowPublicationConflict emitted. ' +
      'DFS after type check, or type check after write, or plain storeDocument for publish = BUILD_FAILURE. ' +
      'storeDocument(audit) before FlowPublished enqueue. DNA-8. ' +
      'SF-CHECK-18-2.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-18-3',
    flowId: 'FLOW-18',
    description:
      'T619 NodeTypeRegistrar: atomic dual-write with SETNX is MACHINE-FIXED. ' +
      'SETNX(node-type-reg-lock:{nodeTypeId}) at ORDER 1 before either write. ' +
      'NodeTypeAlreadyExists emitted if lock is already held — idempotent duplicate rejection. ' +
      'storeDocument(nodeType, GLOBAL) at ORDER 2 — first write in dual-write pair. ' +
      'storeDocument(capabilityIndex) at ORDER 3 — second write in dual-write pair. ' +
      'redis.del(lockKey) MUST be called in catch block on any write failure. ' +
      'Missing redis.del = hung lock = future registrations permanently blocked for that nodeTypeId. ' +
      'Any write without SETNX, or missing redis.del in catch = BUILD_FAILURE. ' +
      'storeDocument(audit) before NodeTypeRegistered enqueue. DNA-8. ' +
      'SF-CHECK-18-3.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  // P11 (CF-957..CF-960) — edge-case coverage from docs/flow-coverage/visual-flow-engine/P10-server-specs.md
  {
    ruleId: 'CF-957',
    flowId: 'FLOW-18',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-5 Optimistic concurrency on POST /api/dynamic/visual-flow-engine — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-958',
    flowId: 'FLOW-18',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-6 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-959',
    flowId: 'FLOW-18',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-8 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-960',
    flowId: 'FLOW-18',
    type: 'DNA8_ORDERING',
    description:
      'EC-9 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-18-4',
    flowId: 'FLOW-18',
    description:
      'T620 CodeInjectionProcessor: version lock + pre-write audit is MACHINE-FIXED. ' +
      'Version lock (injection-version-lock:{nodeId}:{version}) at ORDER 1 — InjectionConflict on concurrent injection. ' +
      'Pre-write audit storeDocument(phase:PRE_WRITE) at ORDER 2 BEFORE injection code runs. ' +
      'This pre-write audit serves as the rollback pointer — it exists even if injection fails. ' +
      'Inject code at ORDER 3 after lock and pre-write audit confirmed. ' +
      'INJECTION_AUDIT_PHASES = [PRE_WRITE, COMPLETE, FAILED] — compile-time constant. ' +
      'Append-only audit: never updateDocument on any injection audit record. ' +
      'Each phase creates a new storeDocument record. ' +
      'Extends NON-REPUDIATION-AUDIT-001 from FLOW-16. ' +
      'Injection without version lock, or audit after injection, or updateDocument on audit = BUILD_FAILURE. ' +
      'storeDocument(result audit) before CodeInjected enqueue. DNA-8. ' +
      'scope_isolation arbiter present in all arbiterConfig blocks (FC-32). ' +
      'SF-CHECK-18-4 + SF-CHECK-18-5.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
];
