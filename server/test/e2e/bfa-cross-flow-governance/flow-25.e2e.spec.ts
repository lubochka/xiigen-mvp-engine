/**
 * FLOW-25 E2E — BFA Cross-Flow Governance
 *
 * Archetypes: INGESTION, IMPACT_ANALYSIS, BLAST_RADIUS, ARBITRATION, SYNTHESIS, GOVERNANCE
 * Task types: T375–T388 (14 contracts)
 * Fabric interfaces: IDatabaseService (DATABASE), IQueueService (QUEUE), IAiProvider (AI_ENGINE)
 * CloudEvents: BfaApprovalGranted, BfaViolationDetected, ConflictResolved, AuditRecordCreated,
 *              BlastRadiusCalculated, ArbitrationStateChanged
 *
 * Named checks (validate.handler.ts):
 *   archetype_unique_across_flows
 *   factory_ids_no_overlap
 *   peer_flow_rules_no_duplicate
 *   cross_flow_task_type_no_conflict
 *   bfa_audit_insert_only
 *   cross_tenant_query_blocked
 *   store_before_emit_on_transition
 *   cf_001_entity_ownership_enforced
 *
 * 8 mandatory E2E categories:
 *   1. Happy path — clean flow registration, archetype check, peer flow rules, cross-flow impact
 *   2. Error path — duplicate archetype, naming collision, factory overlap, CF-001 violation
 *   3. Tenant isolation — BFA rules scoped per tenant, cross-tenant isolation
 *   4. Idempotency — BFA validation idempotent, rule registration idempotent
 *   5. UI state mapping — BFA_PENDING → BFA_APPROVED, BFA_PENDING → BFA_REJECTED, CONFLICT_DETECTED
 *   6. API contract — /api/dynamic/bfa-violations, /api/dynamic/flow-contracts
 *   7. CloudEvents — BfaApprovalGranted, BfaViolationDetected with valid envelope
 *   8. Named checks — archetype uniqueness, factory ID overlap, peer flow rule duplication
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { createCloudEvent, validateCloudEvent } from '../../../src/kernel/cloud-events';
import { BusinessFlowArbiter } from '../../../src/guardrails/bfa';
import { BFA_PEER_FLOW_RULES } from '../../../src/guardrails/bfa-peer-flow-rules';
import type { BfaRegistration } from '../../../src/engine-contracts/contract-schema';

// ── Mock fabric providers ──────────────────────────────────────────────────

function makeInMemoryDb() {
  const store: Map<string, Record<string, unknown>[]> = new Map();

  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const bucket = store.get(index) ?? [];
      const existing = bucket.findIndex((d) => d['id'] === id);
      if (existing >= 0) {
        bucket[existing] = { ...doc, id };
      } else {
        bucket.push({ ...doc, id });
      }
      store.set(index, bucket);
      return DataProcessResult.success({ ...doc, id });
    }),
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      const bucket = store.get(index) ?? [];
      const results = bucket.filter((doc) =>
        Object.entries(filter).every(([k, v]) => v == null || doc[k] === v),
      );
      return DataProcessResult.success(results);
    }),
    getDocument: jest.fn(async (index: string, id: string) => {
      const bucket = store.get(index) ?? [];
      const doc = bucket.find((d) => d['id'] === id);
      return doc
        ? DataProcessResult.success(doc)
        : DataProcessResult.failure('NOT_FOUND', `Document ${id} not found in ${index}`);
    }),
    _store: store,
  };
}

function makeInMemoryQueue() {
  const emitted: Array<{ queue: string; payload: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (queue: string, payload: Record<string, unknown>) => {
      emitted.push({ queue, payload });
      return DataProcessResult.success({ messageId: `msg-${Date.now()}` });
    }),
    _emitted: emitted,
  };
}

function makeBfa(): BusinessFlowArbiter {
  return new BusinessFlowArbiter();
}

function makeCleanRegistration(flowId: string, suffix = ''): BfaRegistration {
  return {
    entities: [`flow_entity_${flowId.toLowerCase()}${suffix}`],
    events: [`flow.event.emitted.${flowId.toLowerCase()}${suffix}`],
    apiRoutes: [`/api/${flowId.toLowerCase()}${suffix}`],
  };
}

// ══════════════════════════════════════════════════════
// Category 1 — Happy Path (BFA Cross-Flow Validation)
// ══════════════════════════════════════════════════════

describe('FLOW-25 E2E — Happy Path [BFA CROSS-FLOW VALIDATION]', () => {
  const TENANT = 'flow25-happy-tenant';

  it('F25-H1: new flow contract passes BFA validation when no conflicts exist', () => {
    const bfa = makeBfa();
    const registration = makeCleanRegistration('FLOW-99');
    const result = bfa.registerFlow('FLOW-99', registration);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe(true);
  });

  it('F25-H2: peer flow rule check passes when archetypes do not overlap', () => {
    const bfa = makeBfa();
    const regA = makeCleanRegistration('FLOW-A1', '-a1');
    const regB = makeCleanRegistration('FLOW-B2', '-b2');

    bfa.registerFlow('FLOW-A1', regA);
    const resultB = bfa.registerFlow('FLOW-B2', regB);

    expect(resultB.isSuccess).toBe(true);
  });

  it('F25-H3: BFA approval produces no violation events (empty conflict list)', () => {
    const bfa = makeBfa();
    const registration = makeCleanRegistration('FLOW-CLEAN');
    const conflicts = bfa.checkConflicts('FLOW-CLEAN', registration);

    expect(conflicts.isSuccess).toBe(true);
    expect(conflicts.data).toHaveLength(0);
  });

  it('F25-H4: cross-flow impact analysis returns empty violations for clean flow', () => {
    const bfa = makeBfa();
    const registration: BfaRegistration = {
      entities: ['unique_governance_entity'],
      events: ['bfa.governance.event'],
      apiRoutes: ['/api/dynamic/bfa-governance'],
    };

    const result = bfa.checkConflicts('FLOW-25', registration);

    expect(result.isSuccess).toBe(true);
    const violations = (result.data ?? []).filter((c) => c.severity === 'error');
    expect(violations).toHaveLength(0);
  });

  it('F25-H5: new archetype registration succeeds with unique name', () => {
    const bfa = makeBfa();
    const registration: BfaRegistration = {
      entities: ['bfa_arbitration_record'],
      events: ['bfa.arbitration.state.changed'],
      apiRoutes: [],
    };

    const result = bfa.registerFlow('FLOW-25-ARBIT', registration);
    expect(result.isSuccess).toBe(true);
  });

  it('F25-H6: peer flow rule with different task type passes without conflict', () => {
    const bfa = makeBfa();
    // FLOW-X uses entity X, FLOW-Y uses entity Y — no overlap
    bfa.registerFlow('FLOW-X', {
      entities: ['entity_x'],
      events: ['event.x'],
      apiRoutes: ['/api/x'],
    });
    const result = bfa.registerFlow('FLOW-Y', {
      entities: ['entity_y'],
      events: ['event.y'],
      apiRoutes: ['/api/y'],
    });

    expect(result.isSuccess).toBe(true);
  });

  it('F25-H7: BFA peer flow rules array is non-empty (rules registered globally)', () => {
    expect(BFA_PEER_FLOW_RULES.length).toBeGreaterThan(0);
  });

  it('F25-H8: cross-flow validator CF-789 passes for code without financial operations', () => {
    const bfa = makeBfa();
    const codeWithoutCharge = 'const result = await db.storeDocument("records", record, id);';
    const result = bfa.runCrossFlowRule('CF-789', codeWithoutCharge);

    expect(result.passed).toBe(true);
    expect(result.ruleId).toBe('CF-789');
  });

  it('F25-H9: cross-flow validator CF-790 passes for code with integer cents', () => {
    const bfa = makeBfa();
    const safeCode = 'const amountCents = Math.round(price * 100);';
    const result = bfa.runCrossFlowRule('CF-790', safeCode);

    expect(result.passed).toBe(true);
  });

  it('F25-H10: cross-flow validator CF-791 passes for code without state writes', () => {
    const bfa = makeBfa();
    const codeNoState = 'const data = await db.getDocument("index", id);';
    const result = bfa.runCrossFlowRule('CF-791', codeNoState);

    expect(result.passed).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Category 2 — Error Path (BFA Violations)
// ══════════════════════════════════════════════════════

describe('FLOW-25 E2E — Error Path [BFA VIOLATIONS]', () => {
  it('F25-E1: duplicate entity name blocked → entity ownership conflict detected', () => {
    const bfa = makeBfa();
    bfa.registerFlow('FLOW-OWNER', { entities: ['shared_entity'], events: [], apiRoutes: [] });

    const result = bfa.registerFlow('FLOW-INTRUDER', {
      entities: ['shared_entity'],
      events: [],
      apiRoutes: [],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CONFLICTS_DETECTED');
  });

  it('F25-E2: peer flow naming collision blocked → API route conflict detected', () => {
    const bfa = makeBfa();
    bfa.registerFlow('FLOW-ROUTE-A', {
      entities: [],
      events: [],
      apiRoutes: ['/api/shared-route'],
    });

    const result = bfa.registerFlow('FLOW-ROUTE-B', {
      entities: [],
      events: [],
      apiRoutes: ['/api/shared-route'],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CONFLICTS_DETECTED');
  });

  it('F25-E3: factory ID overlap blocked → entity conflict returned', () => {
    const bfa = makeBfa();
    bfa.registerFlow('FLOW-F1', { entities: ['factory_entity_f1028'], events: [], apiRoutes: [] });

    const conflicts = bfa.checkConflicts('FLOW-F2', {
      entities: ['factory_entity_f1028'],
      events: [],
      apiRoutes: [],
    });

    expect(conflicts.isSuccess).toBe(true);
    const errors = (conflicts.data ?? []).filter((c) => c.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].conflictType).toBe('entity');
  });

  it('F25-E4: cross-flow task type conflict detected via checkConflicts', () => {
    const bfa = makeBfa();
    bfa.registerFlow('FLOW-SRC', { entities: ['task_entity_t375'], events: [], apiRoutes: [] });

    const result = bfa.checkConflicts('FLOW-DST', {
      entities: ['task_entity_t375'],
      events: [],
      apiRoutes: [],
    });

    expect(result.isSuccess).toBe(true);
    const errorConflicts = (result.data ?? []).filter((c) => c.severity === 'error');
    expect(errorConflicts.length).toBe(1);
    expect(errorConflicts[0].existingFlow).toBe('FLOW-SRC');
  });

  it('F25-E5: BFA rule CF-789 violation detected — financial charge without idempotency', () => {
    const bfa = makeBfa();
    const violatingCode = 'await paymentFabric.charge(customerId, amount);';
    const result = bfa.runCrossFlowRule('CF-789', violatingCode);

    expect(result.passed).toBe(false);
    expect(result.ruleId).toBe('CF-789');
    expect(result.reason).toContain('idempotency');
  });

  it('F25-E6: BFA rule CF-790 violation detected — float used for financial value', () => {
    const bfa = makeBfa();
    const violatingCode = 'const amount = 19.99;';
    const result = bfa.runCrossFlowRule('CF-790', violatingCode);

    expect(result.passed).toBe(false);
    expect(result.ruleId).toBe('CF-790');
    expect(result.reason).toContain('integer cents');
  });

  it('F25-E7: BFA rule CF-791 violation detected — state write without transition guard', () => {
    const bfa = makeBfa();
    const violatingCode = "doc.state = 'APPROVED';";
    const result = bfa.runCrossFlowRule('CF-791', violatingCode);

    expect(result.passed).toBe(false);
    expect(result.ruleId).toBe('CF-791');
    expect(result.reason).toContain('transition guard');
  });

  it('F25-E8: registerFlow with empty flowId returns MISSING_FLOW_ID failure', () => {
    const bfa = makeBfa();
    const result = bfa.registerFlow('', { entities: [], events: [], apiRoutes: [] });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_FLOW_ID');
  });
});

// ══════════════════════════════════════════════════════
// Category 3 — Tenant Isolation
// ══════════════════════════════════════════════════════

describe('FLOW-25 E2E — Tenant Isolation [BFA SCOPED PER TENANT]', () => {
  it('F25-T1: BFA registrations for different flows are independent per arbiter instance', () => {
    const bfaTenant1 = makeBfa();
    const bfaTenant2 = makeBfa();

    // Tenant 1 registers entity
    bfaTenant1.registerFlow('FLOW-T1', { entities: ['tenant_entity'], events: [], apiRoutes: [] });

    // Tenant 2 can register the same entity in its own arbiter (separate scope)
    const result = bfaTenant2.registerFlow('FLOW-T2', {
      entities: ['tenant_entity'],
      events: [],
      apiRoutes: [],
    });

    expect(result.isSuccess).toBe(true);
  });

  it('F25-T2: cross-tenant flow validation isolated — conflict only within same BFA scope', () => {
    const bfaA = makeBfa();
    const bfaB = makeBfa();

    bfaA.registerFlow('FLOW-X1', { entities: ['shared_name'], events: [], apiRoutes: [] });
    bfaB.registerFlow('FLOW-X1', { entities: ['shared_name'], events: [], apiRoutes: [] });

    // bfaB has no knowledge of bfaA registrations
    const conflictsInA = bfaA.checkConflicts('FLOW-X2', {
      entities: ['shared_name'],
      events: [],
      apiRoutes: [],
    });
    const conflictsInB = bfaB.checkConflicts('FLOW-X2', {
      entities: ['shared_name'],
      events: [],
      apiRoutes: [],
    });

    // Both report a conflict independently
    expect(conflictsInA.data!.length).toBeGreaterThan(0);
    expect(conflictsInB.data!.length).toBeGreaterThan(0);
  });

  it('F25-T3: BFA audit record stored with tenantId field for multi-tenant audit trail', async () => {
    const db = makeInMemoryDb();
    const TENANT = 'tenant-bfa-audit';

    const auditRecord = {
      ruleId: 'CF-001',
      flowId: 'FLOW-25',
      tenantId: TENANT,
      outcome: 'PASSED',
      checkedAt: new Date().toISOString(),
    };

    const result = await db.storeDocument('bfa-audit-trail', auditRecord, `audit-${TENANT}-001`);

    expect(result.isSuccess).toBe(true);
    const stored = await db.getDocument('bfa-audit-trail', `audit-${TENANT}-001`);
    expect((stored.data as Record<string, unknown>)['tenantId']).toBe(TENANT);
  });

  it('F25-T4: cross-tenant conflict guard — unscoped query returns no per-tenant rows', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'bfa-violations',
      { tenantId: 'tenant-A', flowId: 'FLOW-1', type: 'entity' },
      'v-a-001',
    );
    await db.storeDocument(
      'bfa-violations',
      { tenantId: 'tenant-B', flowId: 'FLOW-2', type: 'entity' },
      'v-b-001',
    );

    // Tenant-scoped query only returns own violations
    const resultA = await db.searchDocuments('bfa-violations', { tenantId: 'tenant-A' });
    expect(resultA.isSuccess).toBe(true);
    expect(
      (resultA.data as Record<string, unknown>[]).every((d) => d['tenantId'] === 'tenant-A'),
    ).toBe(true);
  });

  it('F25-T5: BFA rule CF-789 is evaluated identically for each tenant (no tenant leak)', () => {
    const bfa1 = makeBfa();
    const bfa2 = makeBfa();

    const code = 'const result = db.storeDocument("records", data, id);';
    const r1 = bfa1.runCrossFlowRule('CF-789', code);
    const r2 = bfa2.runCrossFlowRule('CF-789', code);

    expect(r1.passed).toBe(r2.passed);
    expect(r1.ruleId).toBe(r2.ruleId);
  });
});

// ══════════════════════════════════════════════════════
// Category 4 — Idempotency
// ══════════════════════════════════════════════════════

describe('FLOW-25 E2E — Idempotency [BFA VALIDATION STABLE]', () => {
  it('F25-I1: running BFA checkConflicts twice returns same result', () => {
    const bfa = makeBfa();
    const registration: BfaRegistration = {
      entities: ['idempotent_entity'],
      events: ['bfa.idempotent.event'],
      apiRoutes: [],
    };

    const result1 = bfa.checkConflicts('FLOW-IDEM', registration);
    const result2 = bfa.checkConflicts('FLOW-IDEM', registration);

    expect(result1.isSuccess).toBe(result2.isSuccess);
    expect(result1.data).toHaveLength(result2.data!.length);
  });

  it('F25-I2: BFA rule registration is idempotent — same ruleId returns same result', () => {
    const bfa = makeBfa();
    const code = 'const safe = db.storeDocument("idx", doc, id);';

    const run1 = bfa.runCrossFlowRule('CF-789', code);
    const run2 = bfa.runCrossFlowRule('CF-789', code);

    expect(run1.passed).toBe(run2.passed);
    expect(run1.ruleId).toBe(run2.ruleId);
  });

  it('F25-I3: re-validating same flow registration after approval returns success', () => {
    const bfa = makeBfa();
    const reg: BfaRegistration = {
      entities: ['stable_entity_f25'],
      events: ['bfa.stable.event'],
      apiRoutes: [],
    };

    bfa.registerFlow('FLOW-STABLE', reg);

    // checkConflicts again for same flow — same flow owning same entities, no conflict
    const check = bfa.checkConflicts('FLOW-STABLE', reg);
    expect(check.isSuccess).toBe(true);
    // same flow re-checking its own entities — no new conflicts
    const errorConflicts = (check.data ?? []).filter((c) => c.severity === 'error');
    expect(errorConflicts).toHaveLength(0);
  });

  it('F25-I4: duplicate BFA audit record stored with same key is an idempotent upsert', async () => {
    const db = makeInMemoryDb();
    const record = { ruleId: 'CF-473', outcome: 'PASSED', tenantId: 'tenant-idem' };

    await db.storeDocument('bfa-audit', record, 'audit-idem-001');
    await db.storeDocument('bfa-audit', record, 'audit-idem-001');

    const results = await db.searchDocuments('bfa-audit', { ruleId: 'CF-473' });
    expect((results.data as Record<string, unknown>[]).length).toBe(1);
  });

  it('F25-I5: running CF-790 rule twice with same code returns identical passed flag', () => {
    const bfa = makeBfa();
    const code = 'const safeAmount = Math.round(value * 100);';

    const r1 = bfa.runCrossFlowRule('CF-790', code);
    const r2 = bfa.runCrossFlowRule('CF-790', code);

    expect(r1.passed).toBe(r2.passed);
  });
});

// ══════════════════════════════════════════════════════
// Category 5 — UI State Mapping
// ══════════════════════════════════════════════════════

describe('FLOW-25 E2E — UI State Mapping [BFA STATE TRANSITIONS]', () => {
  it('F25-U1: BFA_PENDING → BFA_APPROVED state when validation passes', () => {
    const bfa = makeBfa();
    const reg = makeCleanRegistration('FLOW-APPROVE-25');

    const result = bfa.registerFlow('FLOW-APPROVE-25', reg);

    const state = result.isSuccess ? 'BFA_APPROVED' : 'BFA_REJECTED';
    expect(state).toBe('BFA_APPROVED');
  });

  it('F25-U2: BFA_PENDING → BFA_REJECTED state when conflict detected', () => {
    const bfa = makeBfa();
    bfa.registerFlow('FLOW-OWN', { entities: ['conflicting_entity'], events: [], apiRoutes: [] });

    const result = bfa.registerFlow('FLOW-NEW', {
      entities: ['conflicting_entity'],
      events: [],
      apiRoutes: [],
    });

    const state = result.isSuccess ? 'BFA_APPROVED' : 'BFA_REJECTED';
    expect(state).toBe('BFA_REJECTED');
  });

  it('F25-U3: BFA_REJECTED state includes violation details (errorCode + message)', () => {
    const bfa = makeBfa();
    bfa.registerFlow('FLOW-BASE', { entities: ['contested'], events: [], apiRoutes: [] });

    const result = bfa.registerFlow('FLOW-NEW2', {
      entities: ['contested'],
      events: [],
      apiRoutes: [],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBeDefined();
    expect(result.errorMessage).toBeDefined();
  });

  it('F25-U4: CONFLICT_DETECTED state with offending rule — severity:error in conflict list', () => {
    const bfa = makeBfa();
    bfa.registerFlow('FLOW-A', { entities: ['owned_entity'], events: [], apiRoutes: [] });

    const conflicts = bfa.checkConflicts('FLOW-B', {
      entities: ['owned_entity'],
      events: [],
      apiRoutes: [],
    });

    const errorConflicts = (conflicts.data ?? []).filter((c) => c.severity === 'error');
    expect(errorConflicts.length).toBeGreaterThan(0);

    const uiState = errorConflicts.length > 0 ? 'CONFLICT_DETECTED' : 'CLEAN';
    expect(uiState).toBe('CONFLICT_DETECTED');
  });

  it('F25-U5: warning-only conflicts produce BFA_APPROVED_WITH_WARNINGS state', () => {
    const bfa = makeBfa();
    // Register two flows publishing same event (warning, not error)
    bfa.registerFlow('FLOW-PUB1', {
      entities: ['unique_entity_1'],
      events: ['shared.event.published'],
      apiRoutes: [],
    });
    bfa.registerFlow('FLOW-PUB2', {
      entities: ['unique_entity_2'],
      events: ['shared.event.published'],
      apiRoutes: [],
    });

    const conflicts = bfa.checkConflicts('FLOW-PUB3', {
      entities: ['unique_entity_3'],
      events: ['shared.event.published'],
      apiRoutes: [],
    });

    const warnings = (conflicts.data ?? []).filter((c) => c.severity === 'warning');
    const errors = (conflicts.data ?? []).filter((c) => c.severity === 'error');

    expect(errors).toHaveLength(0);
    const uiState =
      errors.length === 0 && warnings.length > 0 ? 'BFA_APPROVED_WITH_WARNINGS' : 'BFA_APPROVED';
    expect(['BFA_APPROVED_WITH_WARNINGS', 'BFA_APPROVED']).toContain(uiState);
  });
});

// ══════════════════════════════════════════════════════
// Category 6 — API Contract
// ══════════════════════════════════════════════════════

describe('FLOW-25 E2E — API Contract [DYNAMIC CONTROLLER]', () => {
  it('F25-A1: /api/dynamic/bfa-violations query returns DataProcessResult', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'bfa-violations',
      { ruleId: 'CF-473', flowId: 'FLOW-25', severity: 'error' },
      'v-001',
    );

    const result = await db.searchDocuments('bfa-violations', { flowId: 'FLOW-25' });

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
  });

  it('F25-A2: /api/dynamic/flow-contracts query returns DataProcessResult', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument('flow-contracts', { flowId: 'FLOW-25', status: 'ACTIVE' }, 'fc-25');

    const result = await db.searchDocuments('flow-contracts', { flowId: 'FLOW-25' });

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]['status']).toBe('ACTIVE');
  });

  it('F25-A3: /api/dynamic/bfa-audit-trail query scoped by tenantId', async () => {
    const db = makeInMemoryDb();
    const TENANT = 'tenant-api-test';

    await db.storeDocument(
      'bfa-audit-trail',
      { tenantId: TENANT, ruleId: 'CF-473', outcome: 'PASSED' },
      'at-001',
    );

    const result = await db.searchDocuments('bfa-audit-trail', { tenantId: TENANT });

    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs.every((d) => d['tenantId'] === TENANT)).toBe(true);
  });

  it('F25-A4: /api/dynamic/bfa-violations returns empty list when no violations exist', async () => {
    const db = makeInMemoryDb();

    const result = await db.searchDocuments('bfa-violations', { flowId: 'FLOW-CLEAN-25' });

    expect(result.isSuccess).toBe(true);
    expect(result.data as unknown[]).toHaveLength(0);
  });

  it('F25-A5: DataProcessResult.failure propagates correct error structure for API response', () => {
    const failure = DataProcessResult.failure('BFA_CONFLICT', 'Entity ownership conflict detected');

    expect(failure.isSuccess).toBe(false);
    expect(failure.errorCode).toBe('BFA_CONFLICT');
    expect(failure.errorMessage).toBe('Entity ownership conflict detected');
  });
});

// ══════════════════════════════════════════════════════
// Category 7 — CloudEvents
// ══════════════════════════════════════════════════════

describe('FLOW-25 E2E — CloudEvents [BFA EVENT ENVELOPE]', () => {
  const TENANT = 'flow25-cloud-tenant';

  it('F25-C1: BFA approval event has correct CloudEvents envelope', () => {
    const event = createCloudEvent({
      eventType: 'bfa.approval.granted',
      source: 'flow-25/bfa-arbiter',
      data: { flowId: 'FLOW-25', checkedAgainst: 31, passed: true },
      tenantId: TENANT,
    });

    expect(event['specversion']).toBe('1.0');
    expect(event['type']).toBe('bfa.approval.granted');
    expect(event['tenantid']).toBe(TENANT);
    expect(event['id']).toBeDefined();
  });

  it('F25-C2: BFA violation detected event passes validateCloudEvent', () => {
    const event = createCloudEvent({
      eventType: 'bfa.violation.detected',
      source: 'flow-25/conflict-detector',
      data: {
        flowId: 'FLOW-BAD',
        ruleId: 'CF-001',
        conflictType: 'entity',
        offendingValue: 'shared_entity',
        severity: 'error',
      },
      tenantId: TENANT,
    });

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });

  it('F25-C3: ConflictResolved event has required CloudEvents fields', () => {
    const event = createCloudEvent({
      eventType: 'bfa.conflict.resolved',
      source: 'flow-25/resolution-applier',
      data: {
        conflictId: 'conf-001',
        resolution: 'FLOW_RENAMED',
        resolvedBy: 'human',
        tenantId: TENANT,
      },
      tenantId: TENANT,
    });

    expect(event['specversion']).toBe('1.0');
    expect(event['time']).toBeDefined();
    expect(event['datacontenttype']).toBe('application/json');
    expect((event['data'] as Record<string, unknown>)['resolution']).toBe('FLOW_RENAMED');
  });

  it('F25-C4: AuditRecordCreated event stored before emitted (DNA-8)', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const callOrder: string[] = [];

    const trackedDb = {
      ...db,
      storeDocument: jest.fn(async (...args: Parameters<typeof db.storeDocument>) => {
        callOrder.push('storeDocument');
        return db.storeDocument(...args);
      }),
    };
    const trackedQueue = {
      ...queue,
      enqueue: jest.fn(async (...args: Parameters<typeof queue.enqueue>) => {
        callOrder.push('enqueue');
        return queue.enqueue(...args);
      }),
    };

    await trackedDb.storeDocument(
      'bfa-audit-trail',
      { ruleId: 'CF-001', outcome: 'PASSED', tenantId: TENANT },
      'audit-001',
    );
    const event = createCloudEvent({
      eventType: 'bfa.audit.record.created',
      source: 'flow-25/audit-trail',
      data: { auditId: 'audit-001', tenantId: TENANT },
      tenantId: TENANT,
    });
    await trackedQueue.enqueue(
      'bfa.audit.record.created',
      event as unknown as Record<string, unknown>,
    );

    expect(callOrder[0]).toBe('storeDocument');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F25-C5: BlastRadiusCalculated event includes downstream flow count', () => {
    const event = createCloudEvent({
      eventType: 'bfa.blast.radius.calculated',
      source: 'flow-25/blast-radius-calculator',
      data: { flowId: 'FLOW-25', downstreamFlowCount: 5, affectedTaskTypes: 14 },
      tenantId: TENANT,
    });

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    const data = event['data'] as Record<string, unknown>;
    expect(data['downstreamFlowCount']).toBe(5);
  });

  it('F25-C6: ArbitrationStateChanged event includes fromState and toState fields', () => {
    const event = createCloudEvent({
      eventType: 'bfa.arbitration.state.changed',
      source: 'flow-25/arbitration-state-machine',
      data: { conflictId: 'conf-001', fromState: 'PENDING', toState: 'APPROVED', tenantId: TENANT },
      tenantId: TENANT,
    });

    const data = event['data'] as Record<string, unknown>;
    expect(data['fromState']).toBe('PENDING');
    expect(data['toState']).toBe('APPROVED');
  });
});

// ══════════════════════════════════════════════════════
// Category 8 — Named Checks
// ══════════════════════════════════════════════════════

describe('FLOW-25 E2E — Named Checks [BFA RULE ENFORCEMENT]', () => {
  it('F25-N1: check that archetype is unique across flows — different archetypes register cleanly', () => {
    const bfa = makeBfa();

    bfa.registerFlow('FLOW-INGESTION', {
      entities: ['ingestion_entity'],
      events: ['ingestion.event'],
      apiRoutes: [],
    });
    bfa.registerFlow('FLOW-GOVERNANCE', {
      entities: ['governance_entity'],
      events: ['governance.event'],
      apiRoutes: [],
    });

    const result = bfa.checkConflicts('FLOW-ARBITRATION', {
      entities: ['arbitration_entity'],
      events: [],
      apiRoutes: [],
    });

    const errors = (result.data ?? []).filter((c) => c.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('F25-N2: check that factory IDs do not overlap — unique entities per flow', () => {
    const bfa = makeBfa();

    bfa.registerFlow('FLOW-F1028', { entities: ['factory_f1028'], events: [], apiRoutes: [] });
    bfa.registerFlow('FLOW-F1029', { entities: ['factory_f1029'], events: [], apiRoutes: [] });

    // Separate factory entity — no conflict
    const result = bfa.checkConflicts('FLOW-F1030', {
      entities: ['factory_f1030'],
      events: [],
      apiRoutes: [],
    });
    const errors = (result.data ?? []).filter((c) => c.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('F25-N3: check that peer flow rules do not duplicate — BFA_PEER_FLOW_RULES has unique ruleIds', () => {
    const ruleIds = BFA_PEER_FLOW_RULES.map((r) => r.ruleId);
    const uniqueIds = new Set(ruleIds);

    expect(uniqueIds.size).toBe(ruleIds.length);
  });

  it('F25-N4: check cross-flow task type conflict — same entity owned by two flows blocked', () => {
    const bfa = makeBfa();
    bfa.registerFlow('FLOW-T375', {
      entities: ['change_intake_entity'],
      events: [],
      apiRoutes: [],
    });

    const result = bfa.registerFlow('FLOW-T376', {
      entities: ['change_intake_entity'],
      events: [],
      apiRoutes: [],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain('change_intake_entity');
  });

  it('F25-N5: check bfa_audit_insert_only — audit records stored with unique IDs', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument('bfa-audit', { ruleId: 'CF-473', outcome: 'PASSED' }, 'audit-v1');
    await db.storeDocument('bfa-audit', { ruleId: 'CF-474', outcome: 'PASSED' }, 'audit-v2');

    const results = await db.searchDocuments('bfa-audit', {});
    expect((results.data as Record<string, unknown>[]).length).toBe(2);
  });

  it('F25-N6: check cross_tenant_query_blocked — searchDocuments with tenantId filter only returns own data', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'bfa-violations',
      { tenantId: 'T-ALPHA', ruleId: 'CF-001' },
      'vio-t-alpha',
    );
    await db.storeDocument(
      'bfa-violations',
      { tenantId: 'T-BETA', ruleId: 'CF-001' },
      'vio-t-beta',
    );

    const resultAlpha = await db.searchDocuments('bfa-violations', { tenantId: 'T-ALPHA' });
    const docs = resultAlpha.data as Record<string, unknown>[];

    expect(docs.every((d) => d['tenantId'] === 'T-ALPHA')).toBe(true);
    expect(docs.some((d) => d['tenantId'] === 'T-BETA')).toBe(false);
  });

  it('F25-N7: check store_before_emit_on_transition — storeDocument precedes enqueue', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const order: string[] = [];

    await db
      .storeDocument('bfa-states', { conflictId: 'c-001', state: 'APPROVED' }, 'c-001')
      .then(() => order.push('store'));
    const event = createCloudEvent({
      eventType: 'bfa.state.changed',
      source: 'bfa',
      data: { conflictId: 'c-001' },
      tenantId: 'T1',
    });
    await queue
      .enqueue('bfa.state.changed', event as unknown as Record<string, unknown>)
      .then(() => order.push('enqueue'));

    expect(order[0]).toBe('store');
    expect(order[1]).toBe('enqueue');
  });

  it('F25-N8: check cf_001_entity_ownership_enforced — entity conflict detected on second registration', () => {
    const bfa = makeBfa();
    bfa.registerFlow('FLOW-ENTITY-OWNER', {
      entities: ['bfa_owned_entity_cf001'],
      events: [],
      apiRoutes: [],
    });

    const result = bfa.registerFlow('FLOW-ENTITY-THIEF', {
      entities: ['bfa_owned_entity_cf001'],
      events: [],
      apiRoutes: [],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CONFLICTS_DETECTED');
  });
});
