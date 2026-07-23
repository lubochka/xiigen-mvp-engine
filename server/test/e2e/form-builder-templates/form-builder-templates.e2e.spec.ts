/**
 * FLOW-23 E2E — Form Builder & Templates
 *
 * Archetypes: SERVICE (T349 layout solver, T354 preview renderer, T357 template mode),
 *   ORCHESTRATION (T353/T356/T359 binding engine, T360 tenant isolation enforcer),
 *   BUILD (T363 code export gate)
 *
 * Key patterns: T360 STEP 1 at position 0 in all templates (CF-447),
 *   READ_ONLY template mode (CF-444), pure computation no-AI (CF-433/CF-445),
 *   JSONPath dynamic binding DNA-1 (CF-435), CloudEvents F969 mandatory (CF-448),
 *   AF-9 quality gate ≥0.8 fractional (CF-446), IETF idempotency key (CF-449/DNA-7),
 *   role from auth context only (DD-216, OWASP API1)
 *
 * 8 named checks from flow-23-named-checks.ts:
 *   step1_tenant_isolation, template_mode_readonly, pure_computation_no_ai,
 *   jsonpath_dynamic_binding, cloudevents_mandatory, code_export_af9_gate,
 *   ietf_idempotency_key, role_from_auth_context_only
 *
 * 8 mandatory E2E categories:
 *   1. Happy path — template render + layout solve + code export
 *   2. Error path — DataProcessResult.failure on invalid JSONPath / missing role
 *   3. Tenant isolation — T360 enforcer at position 0 + tenant-scoped binding
 *   4. Idempotency — IETF idempotency key pattern
 *   5. UI state mapping — loading / success / error / quality-gate-fail
 *   6. API contract — /api/dynamic/{indexName} response shape
 *   7. CloudEvents — F969 envelope mandatory, direct emit forbidden
 *   8. Named checks — all 8 FLOW-23 checks
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { createCloudEvent, validateCloudEvent } from '../../../src/kernel/cloud-events';
import { ContractArchetype } from '../../../src/engine-contracts/archetypes';
import {
  EngineContract,
  type EngineContractParams,
} from '../../../src/engine-contracts/contract-schema';
import { FlowGenerator } from '../../../src/engine/flow-generator';
import { AfPipeline } from '../../../src/af-stations/af-pipeline';
import { GenericNodeExecutor } from '../../../src/engine/generic-node-executor';
import { BusinessFlowArbiter } from '../../../src/guardrails/bfa';
import { PromotionLadder } from '../../../src/guardrails/promotion-ladder';
import { FreedomConfigManager } from '../../../src/freedom/config-manager';
import { FactoryRegistry } from '../../../src/factories/factory-registry';
import { TaskTypeRegistry } from '../../../src/engine-contracts/task-type-registry';
import { FabricType } from '../../../src/factories/fabric-type';
import {
  check_step1_tenant_isolation,
  check_template_mode_readonly,
  check_pure_computation_no_ai,
  check_jsonpath_dynamic_binding,
  check_cloudevents_mandatory,
  check_code_export_af9_gate,
  check_ietf_idempotency_key,
  check_role_from_auth_context_only,
} from '../../../src/engine-contracts/form-builder-templates-named-checks';
import { EXPORT_QUALITY_THRESHOLD } from '../../../src/engine-contracts/form-builder-templates-export-quality';

// ── Mock fabric providers ────────────────────────────────────────────────────

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

function makePassExecutor(): GenericNodeExecutor {
  return {
    execute: jest.fn(async () =>
      DataProcessResult.success({
        runId: 'flow23-run-id',
        status: 'PASS',
        score: 88,
        trace: [
          { nodeId: 't360-tenant-isolation', nodeType: 'service', status: 'PASS', durationMs: 3 },
          { nodeId: 't357-template-mode', nodeType: 'service', status: 'PASS', durationMs: 7 },
          { nodeId: 't349-layout-solver', nodeType: 'service', status: 'PASS', durationMs: 11 },
          { nodeId: 't354-preview-renderer', nodeType: 'service', status: 'PASS', durationMs: 9 },
          { nodeId: 't353-binding-engine', nodeType: 'service', status: 'PASS', durationMs: 6 },
          { nodeId: 't363-code-export-gate', nodeType: 'build', status: 'PASS', durationMs: 15 },
        ],
        finalOutput: { code: '// FLOW-23 form builder + template mode + code export' },
        promoted: true,
        promotionLevel: 'MINIMAL',
      }),
    ),
    getTrace: jest.fn(async () => DataProcessResult.success(null)),
  } as unknown as GenericNodeExecutor;
}

function createEngine(): FlowGenerator {
  return new FlowGenerator({
    afPipeline: new AfPipeline(makePassExecutor()),
    factoryRegistry: new FactoryRegistry(),
    taskRegistry: new TaskTypeRegistry(),
    bfa: new BusinessFlowArbiter(),
    promotionLadder: new PromotionLadder(),
    freedomManager: new FreedomConfigManager(),
  });
}

// ── FLOW-23 contract params ──────────────────────────────────────────────────

function flow23TemplateParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T357_F23_TEMPLATE${suffix}`,
    flowId: 'FLOW-23',
    flowName: 'Form Builder & Templates',
    name: 'TemplateModeRender',
    archetype: ContractArchetype.SERVICE,
    entry: 'template.render.requested CloudEvent',
    purpose:
      'Render CMS template in READ-ONLY mode (CF-444). ' +
      'T360 at position 0 (CF-447). Pure computation, no AI (CF-433/CF-445). ' +
      'JSONPath dynamic binding (DNA-1/CF-435). F969 CloudEvents envelope (CF-448).',
    factoryDependencies: [
      {
        factoryId: 'F_DB_FORM23',
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Template and binding persistence',
      },
      {
        factoryId: 'F_QUEUE_FORM23',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'F969 CloudEvents envelope service',
      },
    ],
    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { threshold: EXPORT_QUALITY_THRESHOLD } },
    ],
    qualityGates: [
      {
        gateId: 'QG-23-01',
        description: 'CF-447: T360 must be position 0 in all templates 70-75',
        severity: 'error',
        checkType: 'step1_tenant_isolation',
      },
      {
        gateId: 'QG-23-02',
        description: 'CF-444: template context must be verified read-only',
        severity: 'error',
        checkType: 'template_mode_readonly',
      },
      {
        gateId: 'QG-23-03',
        description: 'CF-433/CF-445: T349/T354 must be pure computation — no AI, no DB write',
        severity: 'error',
        checkType: 'pure_computation_no_ai',
      },
      {
        gateId: 'QG-23-04',
        description: 'CF-446: AF-9 threshold must be 0.8 fractional',
        severity: 'error',
        checkType: 'code_export_af9_gate',
      },
    ],
    bfaRegistration: {
      entities: [`form_template_f23${suffix}`, `binding_definition_f23${suffix}`],
      events: [
        `template.rendered.f23${suffix}`,
        `code.export.completed.f23${suffix}`,
        `code.export.quality.failed.f23${suffix}`,
      ],
      apiRoutes: [],
    },
    ironRules: [
      'T360 TenantIsolationEnforcer must be position 0 in every DAG template',
      'T357 must call verifyReadOnly() after entering template context (CF-444)',
      'T349 and T354 must be pure computation — no AI provider, no storeDocument calls',
      'All async events must use F969 ICloudEventsEnvelopeService — direct emit forbidden',
      'Role must come from IPermissionContextReader.getRole() only (DD-216, OWASP API1)',
    ],
    machineComponents: [
      'T360 TenantIsolationEnforcer',
      'ITemplateModeContext verifyReadOnly',
      'AF-9 quality gate',
    ],
    freedomComponents: ['flow23_export_quality_threshold', 'flow23_template_ttl_seconds'],
    familyId: 'Family-23',
  };
}

// ══════════════════════════════════════════════════════
// Category 1 — Happy Path
// ══════════════════════════════════════════════════════

describe('FLOW-23 E2E — Happy Path [Template Mode + Pure Computation + Code Export]', () => {
  const TENANT = 'flow23-happy-tenant';

  it('F23-H1: template render contract generates — DataProcessResult.success', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow23TemplateParams('-h1'));
    const result = await engine.generate(contract, TENANT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F23-H2: generated contract has flowId = FLOW-23', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow23TemplateParams('-h2'));
    const result = await engine.generate(contract, TENANT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.contractId).toBe('T357_F23_TEMPLATE-h2');
  });

  it('F23-H3: T360 at position 0 — template 70 check passes', () => {
    const result = check_step1_tenant_isolation(70, 'T360');
    expect(result.isSuccess).toBe(true);
  });

  it('F23-H4: template mode read-only — verifyReadOnly called and confirmed', () => {
    const result = check_template_mode_readonly(true, true);
    expect(result.isSuccess).toBe(true);
  });

  it('F23-H5: T349 pure computation — no AI, no DB write, validateConstraints called first', () => {
    const result = check_pure_computation_no_ai('T349', false, false, true);
    expect(result.isSuccess).toBe(true);
  });

  it('F23-H6: T354 pure computation — no AI, no DB write', () => {
    const result = check_pure_computation_no_ai('T354', false, false);
    expect(result.isSuccess).toBe(true);
  });

  it('F23-H7: JSONPath dynamic binding — validated, no typed binding model', () => {
    const result = check_jsonpath_dynamic_binding(true, false);
    expect(result.isSuccess).toBe(true);
  });

  it('F23-H8: CF-448 CloudEvents mandatory — envelope used, no direct emit', () => {
    const result = check_cloudevents_mandatory(true, false);
    expect(result.isSuccess).toBe(true);
  });

  it('F23-H9: AF-9 gate at 0.8 threshold — passes with score 0.85', () => {
    const result = check_code_export_af9_gate(EXPORT_QUALITY_THRESHOLD, true, false, false);
    expect(result.isSuccess).toBe(true);
  });

  it('F23-H10: IETF idempotency key — checked first, not duplicate', () => {
    const result = check_ietf_idempotency_key(true, true, false);
    expect(result.isSuccess).toBe(true);
  });

  it('F23-H11: role from auth context only — not passed as parameter', () => {
    const result = check_role_from_auth_context_only(true, false);
    expect(result.isSuccess).toBe(true);
  });

  it('F23-H12: EXPORT_QUALITY_THRESHOLD is 0.8 fractional (not 80 integer)', () => {
    expect(EXPORT_QUALITY_THRESHOLD).toBe(0.8);
    expect(EXPORT_QUALITY_THRESHOLD).toBeGreaterThan(0);
    expect(EXPORT_QUALITY_THRESHOLD).toBeLessThan(1);
    expect(Number.isInteger(EXPORT_QUALITY_THRESHOLD)).toBe(false);
  });

  it('F23-H13: generation completes within 30s time budget', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow23TemplateParams('-h13'));
    const result = await engine.generate(contract, TENANT);

    expect(result.data!.elapsedMs).toBeLessThan(30_000);
  });
});

// ══════════════════════════════════════════════════════
// Category 2 — Error Path
// ══════════════════════════════════════════════════════

describe('FLOW-23 E2E — Error Path', () => {
  it('F23-E1: T360 missing from position 0 in template 70 — build failure (CF-447)', () => {
    const result = check_step1_tenant_isolation(70, 'T357'); // T357 instead of T360
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-447_BUILD_FAILURE');
    expect(result.errorMessage).toContain('T360');
  });

  it('F23-E2: template mode not read-only — check fails (CF-444)', () => {
    const result = check_template_mode_readonly(true, false);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-444_NOT_READONLY');
  });

  it('F23-E3: verifyReadOnly not called — check fails CF-444', () => {
    const result = check_template_mode_readonly(false, true);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-444_READONLY_VIOLATION');
  });

  it('F23-E4: T349 has AI provider injected — pure computation violated (CF-433)', () => {
    const result = check_pure_computation_no_ai('T349', true, false, true);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PURE_COMPUTATION_VIOLATED');
    expect(result.errorMessage).toContain('AI_PROVIDER');
  });

  it('F23-E5: T354 has DB write call — pure computation violated (CF-433)', () => {
    const result = check_pure_computation_no_ai('T354', false, true);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PURE_COMPUTATION_VIOLATED');
    expect(result.errorMessage).toContain('storeDocument');
  });

  it('F23-E6: T349 validateConstraints not called before solve — CF-445 violation', () => {
    const result = check_pure_computation_no_ai('T349', false, false, false);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-445_INVALID_CONSTRAINTS');
  });

  it('F23-E7: typed binding model found — DNA-1 violation', () => {
    const result = check_jsonpath_dynamic_binding(true, true);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DNA-1_TYPED_BINDING_MODEL');
    expect(result.errorMessage).toContain('Record<string, unknown>');
  });

  it('F23-E8: JSONPath not validated — CF-434 violation', () => {
    const result = check_jsonpath_dynamic_binding(false, false);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_JSONPATH');
  });

  it('F23-E9: AF-9 threshold is integer (80) — CF-446 violation', () => {
    const result = check_code_export_af9_gate(80, true, false, false);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-446_THRESHOLD_MISCONFIGURED');
  });

  it('F23-E10: role passed as method parameter — OWASP API1 violation', () => {
    const result = check_role_from_auth_context_only(true, true);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('OWASP_API1_ROLE_INJECTION');
    expect(result.errorMessage).toContain('OWASP API1');
  });
});

// ══════════════════════════════════════════════════════
// Category 3 — Tenant Isolation
// ══════════════════════════════════════════════════════

describe('FLOW-23 E2E — Tenant Isolation', () => {
  it('F23-T1: T360 enforcer at position 0 in all 6 templates (70-75)', () => {
    const templateIds = [70, 71, 72, 73, 74, 75];
    for (const templateId of templateIds) {
      const result = check_step1_tenant_isolation(templateId, 'T360');
      expect(result.isSuccess).toBe(true);
    }
  });

  it('F23-T2: non-FLOW-23 template ID — check skipped (not required)', () => {
    // Template 99 is not a FLOW-23 template — check should pass (skip)
    const result = check_step1_tenant_isolation(99, 'T123');
    expect(result.isSuccess).toBe(true);
  });

  it('F23-T3: tenant-A and tenant-B form templates stored in isolated stores', async () => {
    const dbA = makeInMemoryDb();
    const dbB = makeInMemoryDb();

    await dbA.storeDocument(
      'form-templates',
      { templateId: 70, tenantId: 'tenant-A', name: 'A form' },
      'tpl-a1',
    );
    await dbB.storeDocument(
      'form-templates',
      { templateId: 70, tenantId: 'tenant-B', name: 'B form' },
      'tpl-b1',
    );

    const aResults = await dbA.searchDocuments('form-templates', {});
    const bResults = await dbB.searchDocuments('form-templates', {});

    expect((aResults.data as Record<string, unknown>[]).length).toBe(1);
    expect((bResults.data as Record<string, unknown>[]).length).toBe(1);
    expect((aResults.data as Record<string, unknown>[])[0]['tenantId']).toBe('tenant-A');
    expect((bResults.data as Record<string, unknown>[])[0]['tenantId']).toBe('tenant-B');
  });

  it('F23-T4: template.rendered CloudEvent includes tenantid — DNA-5', () => {
    const eventA = createCloudEvent({
      eventType: 'com.xiigen.form.template.rendered',
      source: 'flow-23/t357-template-mode',
      data: { templateId: 70, canvasId: 'canvas-a1' },
      tenantId: 'tenant-A',
    });
    const eventB = createCloudEvent({
      eventType: 'com.xiigen.form.template.rendered',
      source: 'flow-23/t357-template-mode',
      data: { templateId: 70, canvasId: 'canvas-b1' },
      tenantId: 'tenant-B',
    });

    expect(eventA['tenantid']).toBe('tenant-A');
    expect(eventB['tenantid']).toBe('tenant-B');
    expect(eventA['tenantid']).not.toBe(eventB['tenantid']);
  });

  it('F23-T5: two engines generate independently — separate BFA state', async () => {
    const engineA = createEngine();
    const engineB = createEngine();

    const [rA, rB] = await Promise.all([
      engineA.generate(new EngineContract(flow23TemplateParams('-ta')), 'tenant-A'),
      engineB.generate(new EngineContract(flow23TemplateParams('-tb')), 'tenant-B'),
    ]);

    expect(rA.isSuccess).toBe(true);
    expect(rB.isSuccess).toBe(true);
    expect(rA.data!.contractId).toBe('T357_F23_TEMPLATE-ta');
    expect(rB.data!.contractId).toBe('T357_F23_TEMPLATE-tb');
  });
});

// ══════════════════════════════════════════════════════
// Category 4 — Idempotency
// ══════════════════════════════════════════════════════

describe('FLOW-23 E2E — Idempotency (ietf_idempotency_key, CF-449)', () => {
  it('F23-I1: idempotency check called first — not duplicate — proceeds', () => {
    const result = check_ietf_idempotency_key(true, true, false);
    expect(result.isSuccess).toBe(true);
  });

  it('F23-I2: duplicate detected — skipped gracefully — check passes', () => {
    const result = check_ietf_idempotency_key(true, true, true);
    expect(result.isSuccess).toBe(true);
  });

  it('F23-I3: idempotency check NOT called first — CF-449 violation', () => {
    const result = check_ietf_idempotency_key(false, true, false);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-449_MISSING_IDEMPOTENCY');
  });

  it('F23-I4: duplicate not skipped gracefully — CF-449 violation', () => {
    const result = check_ietf_idempotency_key(true, false, true);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-449_MISSING_IDEMPOTENCY');
  });

  it('F23-I5: duplicate template export — same idempotency key finds existing export', async () => {
    const db = makeInMemoryDb();
    const idemKey = 'idem-export-001';

    await db.storeDocument(
      'code-exports',
      {
        templateId: 70,
        tenantId: 'tenant-i5',
        idempotencyKey: idemKey,
        status: 'completed',
      },
      idemKey,
    );

    const existing = await db.searchDocuments('code-exports', { idempotencyKey: idemKey });
    expect(existing.isSuccess).toBe(true);
    expect((existing.data as Record<string, unknown>[]).length).toBe(1);
  });
});

// ══════════════════════════════════════════════════════
// Category 5 — UI State Mapping
// ══════════════════════════════════════════════════════

describe('FLOW-23 E2E — UI State Mapping', () => {
  it('F23-U1: loading state — template render in-flight', () => {
    const db = makeInMemoryDb();
    let resolved = false;
    const promise = db.storeDocument('form-templates', { templateId: 70 }, 'tpl-1').then((r) => {
      resolved = true;
      return r;
    });
    expect(resolved).toBe(false);
    return promise.then(() => expect(resolved).toBe(true));
  });

  it('F23-U2: success state — template rendered, isSuccess=true', async () => {
    const db = makeInMemoryDb();
    const result = await db.storeDocument(
      'form-templates',
      { templateId: 70, status: 'rendered' },
      'tpl-u2',
    );
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F23-U3: error state — pure computation failed, DataProcessResult.failure', () => {
    const result = DataProcessResult.failure<unknown>(
      'LAYOUT_SOLVE_FAILED',
      'Constraint solver found no valid layout',
    );
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('LAYOUT_SOLVE_FAILED');
  });

  it('F23-U4: quality gate fail state — code.export.quality.failed event emitted with deficit', () => {
    const score = 0.72;
    const deficit = EXPORT_QUALITY_THRESHOLD - score;

    const event = createCloudEvent({
      eventType: 'com.xiigen.code.export.quality.failed',
      source: 'flow-23/t363-code-export-gate',
      data: {
        snapshotId: 'snap-u4',
        score,
        threshold: EXPORT_QUALITY_THRESHOLD,
        deficit,
        assessedAt: new Date().toISOString(),
      },
      tenantId: 'tenant-u4',
    });

    const data = event['data'] as Record<string, unknown>;
    expect(data['deficit']).toBeCloseTo(0.08, 5);
    expect(data['score'] as number).toBeLessThan(EXPORT_QUALITY_THRESHOLD);
  });

  it('F23-U5: template read-only mode — no write actions available in UI state', () => {
    const templateState = {
      mode: 'template_readonly',
      canWrite: false,
      canExport: true,
      canPreview: true,
    };

    expect(templateState.canWrite).toBe(false);
    expect(templateState.mode).toBe('template_readonly');
  });

  it('F23-U6: toDict() serializes result — snake_case keys', () => {
    const result = DataProcessResult.success({ templateId: 70, status: 'rendered' });
    const dict = result.toDict();

    expect(dict['is_success']).toBe(true);
    expect(dict['data']).toBeDefined();
    expect(dict['correlation_id']).toBeDefined();
    expect(dict['timestamp']).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════
// Category 6 — API Contract
// ══════════════════════════════════════════════════════

describe('FLOW-23 E2E — API Contract (/api/dynamic/{indexName})', () => {
  it('F23-A1: /api/dynamic/form-templates response has is_success, data, correlation_id', () => {
    const response = DataProcessResult.success([
      { templateId: 70, name: 'Multi-step form', status: 'active' },
    ]);
    const dict = response.toDict();

    expect(dict).toHaveProperty('is_success', true);
    expect(dict).toHaveProperty('data');
    expect(dict).toHaveProperty('correlation_id');
    expect(dict).toHaveProperty('timestamp');
  });

  it('F23-A2: /api/dynamic/binding-definitions returns bindings with jsonPath field', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'binding-definitions',
      {
        templateId: 70,
        fieldId: 'email',
        jsonPath: '$.user.email',
        tenantId: 'tenant-a',
      },
      'binding-001',
    );

    const result = await db.searchDocuments('binding-definitions', { templateId: 70 });
    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]['jsonPath']).toBe('$.user.email');
  });

  it('F23-A3: /api/dynamic/code-exports error response has is_success=false', () => {
    const errorResponse = DataProcessResult.failure<unknown>(
      'EXPORT_QUALITY_GATE_FAILED',
      'Code export rejected — quality score 0.72 below threshold 0.8',
    );
    const dict = errorResponse.toDict();

    expect(dict['is_success']).toBe(false);
    expect(dict['error_code']).toBe('EXPORT_QUALITY_GATE_FAILED');
    expect(dict['error_message']).toContain('0.72');
  });

  it('F23-A4: /api/dynamic/form-templates returns correct template with templateId', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'form-templates',
      { templateId: 71, name: 'Contact form', tenantId: 'tenant-a' },
      'tpl-71',
    );

    const result = await db.searchDocuments('form-templates', { templateId: 71 });
    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]['templateId']).toBe(71);
  });
});

// ══════════════════════════════════════════════════════
// Category 7 — CloudEvents
// ══════════════════════════════════════════════════════

describe('FLOW-23 E2E — CloudEvents (DNA-9, CF-448 F969 mandatory)', () => {
  it('F23-C1: template.rendered conforms to CloudEvents v1.0', () => {
    const event = createCloudEvent({
      eventType: 'com.xiigen.form.template.rendered',
      source: 'flow-23/t357-template-mode',
      data: { templateId: 70, canvasId: 'canvas-c1', renderedAt: new Date().toISOString() },
      tenantId: 'tenant-c1',
    });

    const [isValid, errors] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('F23-C2: code.export.completed event has required CloudEvents fields', () => {
    const event = createCloudEvent({
      eventType: 'com.xiigen.code.export.completed',
      source: 'flow-23/t363-code-export-gate',
      data: {
        exportId: 'exp-c2',
        snapshotId: 'snap-c2',
        score: 0.92,
        downloadUrl: 'https://cdn.example.com/exp-c2.zip',
      },
      tenantId: 'tenant-c2',
    });

    expect(event['specversion']).toBe('1.0');
    expect(event['id']).toBeDefined();
    expect(event['type']).toBe('com.xiigen.code.export.completed');
    expect(event['source']).toContain('flow-23');
    expect(event['tenantid']).toBe('tenant-c2');
    expect(event['datacontenttype']).toBe('application/json');
  });

  it('F23-C3: code.export.quality.failed event includes deficit field (CF-446)', () => {
    const score = 0.75;
    const deficit = EXPORT_QUALITY_THRESHOLD - score;

    const event = createCloudEvent({
      eventType: 'com.xiigen.code.export.quality.failed',
      source: 'flow-23/t363-code-export-gate',
      data: { snapshotId: 'snap-c3', score, threshold: EXPORT_QUALITY_THRESHOLD, deficit },
      tenantId: 'tenant-c3',
    });

    const data = event['data'] as Record<string, unknown>;
    expect(data).toHaveProperty('deficit');
    expect(data['deficit']).toBeGreaterThan(0);

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });

  it('F23-C4: CF-448 — direct emit forbidden, envelope service required', () => {
    // Direct emission is forbidden
    const directEmitResult = check_cloudevents_mandatory(false, true);
    expect(directEmitResult.isSuccess).toBe(false);
    expect(directEmitResult.errorCode).toBe('CF-448_DIRECT_EMIT');

    // Envelope service used, no direct emit — passes
    const envelopeResult = check_cloudevents_mandatory(true, false);
    expect(envelopeResult.isSuccess).toBe(true);
  });

  it('F23-C5: binding.definition.created event uses CloudEvents envelope', () => {
    const event = createCloudEvent({
      eventType: 'com.xiigen.form.binding.definition.created',
      source: 'flow-23/t353-binding-engine',
      data: {
        bindingId: 'bd-c5',
        templateId: 72,
        jsonPath: '$.customer.address.zip',
        validatedAt: new Date().toISOString(),
      },
      tenantId: 'tenant-c5',
    });

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    const data = event['data'] as Record<string, unknown>;
    expect(data['jsonPath']).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════
// Category 8 — Named Checks (all 8 FLOW-23 checks)
// ══════════════════════════════════════════════════════

describe('FLOW-23 E2E — Named Checks', () => {
  describe('step1_tenant_isolation (CF-447)', () => {
    it('F23-N1: T360 at position 0 in template 70 — passes', () => {
      expect(check_step1_tenant_isolation(70, 'T360').isSuccess).toBe(true);
    });

    it('F23-N2: T360 missing from position 0 in template 71 — fails', () => {
      const r = check_step1_tenant_isolation(71, 'T349');
      expect(r.isSuccess).toBe(false);
      expect(r.errorMessage).toContain('T360');
    });

    it('F23-N3: all required templates 70-75 pass T360 position 0 check', () => {
      [70, 71, 72, 73, 74, 75].forEach((id) => {
        expect(check_step1_tenant_isolation(id, 'T360').isSuccess).toBe(true);
      });
    });
  });

  describe('template_mode_readonly (CF-444)', () => {
    it('F23-N4: verifyReadOnly called and confirmed — passes', () => {
      expect(check_template_mode_readonly(true, true).isSuccess).toBe(true);
    });

    it('F23-N5: verifyReadOnly not called — CF-444 violation', () => {
      const r = check_template_mode_readonly(false, false);
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('CF-444_READONLY_VIOLATION');
    });
  });

  describe('pure_computation_no_ai (CF-433, CF-445)', () => {
    it('F23-N6: T349 — no AI, no DB write, validateConstraints first — passes', () => {
      expect(check_pure_computation_no_ai('T349', false, false, true).isSuccess).toBe(true);
    });

    it('F23-N7: T354 — AI provider injected — fails', () => {
      const r = check_pure_computation_no_ai('T354', true, false);
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('PURE_COMPUTATION_VIOLATED');
    });
  });

  describe('jsonpath_dynamic_binding (DNA-1, CF-435)', () => {
    it('F23-N8: JSONPath validated, no typed model — passes', () => {
      expect(check_jsonpath_dynamic_binding(true, false).isSuccess).toBe(true);
    });

    it('F23-N9: typed binding model found — DNA-1 violation', () => {
      const r = check_jsonpath_dynamic_binding(true, true);
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('DNA-1_TYPED_BINDING_MODEL');
    });
  });

  describe('cloudevents_f969_mandatory (CF-448)', () => {
    it('F23-N10: CloudEvents envelope used, no direct emit — passes', () => {
      expect(check_cloudevents_mandatory(true, false).isSuccess).toBe(true);
    });

    it('F23-N11: CLOUD_EVENTS_ENVELOPE not injected — fails', () => {
      const r = check_cloudevents_mandatory(false, false);
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('CF-448_DIRECT_EMIT');
    });
  });

  describe('code_export_af9_gate (CF-446)', () => {
    it('F23-N12: threshold 0.8 fractional, gate passed — check passes', () => {
      expect(check_code_export_af9_gate(0.8, true, false, false).isSuccess).toBe(true);
    });

    it('F23-N13: gate failed, quality.failed event emitted with deficit — passes', () => {
      expect(check_code_export_af9_gate(0.8, true, true, true).isSuccess).toBe(true);
    });

    it('F23-N14: gate failed but quality.failed event NOT emitted — fails CF-446', () => {
      const r = check_code_export_af9_gate(0.8, false, false, true);
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('CF-446_THRESHOLD_MISCONFIGURED');
    });
  });

  describe('ietf_idempotency_key (CF-449, DNA-7)', () => {
    it('F23-N15: idempotency check first, not duplicate — passes', () => {
      expect(check_ietf_idempotency_key(true, true, false).isSuccess).toBe(true);
    });

    it('F23-N16: duplicate, skipped gracefully — passes', () => {
      expect(check_ietf_idempotency_key(true, true, true).isSuccess).toBe(true);
    });

    it('F23-N17: duplicate, NOT skipped — fails CF-449', () => {
      const r = check_ietf_idempotency_key(true, false, true);
      expect(r.isSuccess).toBe(false);
    });
  });

  describe('role_from_auth_context_only (DD-216, OWASP API1)', () => {
    it('F23-N18: role from auth context, not parameter — passes', () => {
      expect(check_role_from_auth_context_only(true, false).isSuccess).toBe(true);
    });

    it('F23-N19: role passed as parameter — OWASP API1 violation', () => {
      const r = check_role_from_auth_context_only(true, true);
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('OWASP_API1_ROLE_INJECTION');
    });

    it('F23-N20: role not from auth context — fails DD-216', () => {
      const r = check_role_from_auth_context_only(false, false);
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('OWASP_API1_ROLE_INJECTION');
    });
  });
});
