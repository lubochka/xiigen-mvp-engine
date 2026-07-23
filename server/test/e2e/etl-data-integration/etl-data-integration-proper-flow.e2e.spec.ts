/**
 * FLOW-14 Proper Flow — Design Contract Tests (DC-01..DC-10)
 *
 * These tests verify that FLOW-14 T213-T224 services satisfy the
 * FLOW-14 design simulation's iron rules.
 *
 * DC-01: ConnectorRegistrationHandler archetype is 'provisioning'
 * DC-02: CF-211 — WebhookIngestionHandler uses timingSafeEqual (not string ===)
 * DC-03: CF-192 — raw zone records written with storeDocument only (no updateDocument on raw)
 * DC-04: CF-193 — EtlSyncSagaHandler validates monotonic cursor before commit
 * DC-05: DR-62 — DimensionalModelBuilder uses storeDocument for SCD-2 (no updateDocument)
 * DC-06: DR-63 — MartKpiBuilder PII gate blocks mart write when piiFieldsDetected > 0
 * DC-07: DR-64 — ReverseEtlPushHandler emits ReverseETLPushed with transport='queue_fabric'
 * DC-08: CF-204 — IdentityJoinResolver rejects cross-tenant join inputs
 * DC-09: DNA-8 — WarehouseProvisioningHandler stores warehouse record before enqueue
 * DC-10: knowledgeScope PRIVATE in all raw and staging records
 *
 * Design refs: CF-192, CF-193, CF-204, CF-211, DR-62, DR-63, DR-64, DNA-8
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { createHmac } from 'crypto';
import { DataProcessResult } from '../../../src/kernel/data-process-result';

function loadContract(filename: string): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../../../fixtures/contracts', filename), 'utf-8'),
  );
}

function makeDb(
  overrides: Partial<{
    storeDocument: jest.Mock;
    searchDocuments: jest.Mock;
  }> = {},
) {
  const callOrder: string[] = [];
  return {
    callOrder,
    storeDocument: jest.fn().mockImplementation(async (index: string) => {
      callOrder.push(`store:${index}`);
      return DataProcessResult.success({});
    }),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    ...overrides,
  };
}

function makeQueue(callOrder?: string[]) {
  const order = callOrder ?? [];
  return {
    enqueue: jest.fn().mockImplementation(async (evt: string) => {
      order.push(`enqueue:${evt}`);
      return DataProcessResult.success({});
    }),
  };
}

function makeCls(tenantId = 'dc-tenant') {
  return { getCurrentTenantId: jest.fn().mockReturnValue(DataProcessResult.success(tenantId)) };
}

describe('FLOW-14 Design Contracts (DC-01..DC-10)', () => {
  test('DC-01: ConnectorRegistrationHandler archetype is provisioning', () => {
    const t213 = loadContract('t213.contract.json');
    expect(t213['archetype']).toBe('provisioning');
    expect(t213['taskTypeId']).toBe('T213');
    expect(t213['flowId']).toBe('FLOW-14');
  });

  test('DC-02: CF-211 — WebhookIngestionHandler source uses timingSafeEqual (not ===)', () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '../../../src/engine/flows/etl-data-integration/webhook-ingestion-handler.service.ts',
      ),
      'utf-8',
    );
    expect(source).toContain('timingSafeEqual');
    // Must NOT compare signatures with ===
    expect(source).not.toMatch(/signature\s*===\s*computed/);
    expect(source).not.toMatch(/computed\s*===\s*signature/);

    const t215 = loadContract('t215.contract.json');
    const ironRules = t215['ironRules'] as Array<{ rule: string }>;
    const rule = ironRules.find((r) => r.rule.includes('timingSafeEqual'));
    expect(rule).toBeDefined();
    expect(rule!['severity']).toBe('BUILD_FAILURE');
  });

  test('DC-03: CF-192 — raw zone only has storeDocument calls (no updateDocument)', () => {
    // EtlSyncSagaHandler must not call updateDocument for raw records
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '../../../src/engine/flows/etl-data-integration/etl-sync-saga-handler.service.ts',
      ),
      'utf-8',
    );
    expect(source).not.toContain('updateDocument');

    const t214 = loadContract('t214.contract.json');
    const namedChecks = t214['namedChecks'] as string[];
    expect(namedChecks).toContain('raw_zone_append_only');
  });

  test('DC-04: CF-193 — EtlSyncSagaHandler validates monotonic cursor before commit', () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '../../../src/engine/flows/etl-data-integration/etl-sync-saga-handler.service.ts',
      ),
      'utf-8',
    );
    expect(source).toContain('validateMonotonic');

    const t214 = loadContract('t214.contract.json');
    const ironRules = t214['ironRules'] as Array<{ rule: string }>;
    const rule = ironRules.find(
      (r) => r.rule.includes('CF-193') || r.rule.includes('validateMonotonic'),
    );
    expect(rule).toBeDefined();
    expect(rule!['severity']).toBe('BUILD_FAILURE');
  });

  test('DC-05: DR-62 — DimensionalModelBuilder uses storeDocument for SCD-2 (no updateDocument)', () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '../../../src/engine/flows/etl-data-integration/dimensional-model-builder.service.ts',
      ),
      'utf-8',
    );
    expect(source).not.toContain('updateDocument');
    expect(source).toContain('effectiveFrom');
    expect(source).toContain('effectiveTo');

    const t219 = loadContract('t219.contract.json');
    const ironRules = t219['ironRules'] as Array<{ rule: string }>;
    const rule = ironRules.find(
      (r) => r.rule.includes('DR-62') || r.rule.includes('updateDocument'),
    );
    expect(rule).toBeDefined();
    expect(rule!['severity']).toBe('BUILD_FAILURE');
  });

  test('DC-06: DR-63 — MartKpiBuilder PII gate blocks mart write when piiFieldsDetected > 0', async () => {
    const { MartKpiBuilderService } =
      await import('../../../src/engine/flows/etl-data-integration/mart-kpi-builder.service');

    const db = makeDb();
    const queue = makeQueue();
    const cls = makeCls();
    // classifyFields(connectorId, fields) → { safeToWrite, piiFieldsDetected, maskedFields }
    const pii = {
      classifyFields: jest
        .fn()
        .mockResolvedValue({ safeToWrite: false, piiFieldsDetected: ['email'], maskedFields: {} }),
    };
    const rls = {
      applyPolicies: jest
        .fn()
        .mockImplementation(async (_c: unknown, _t: unknown, r: unknown) => r),
    };

    const service = new MartKpiBuilderService(
      db as any,
      queue as any,
      cls as any,
      pii as any,
      rls as any,
    );

    const result = await service.buildKpis({
      connectorId: 'dc-conn',
      martEntity: 'orders',
      factRecords: [{ email: 'user@test.com', amount: 100 }],
    });

    // PII gate returns failure (PII_GATE_BLOCKED), not success with ingested:false
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PII_GATE_BLOCKED');
    // Mart write must NOT have happened
    expect(db.storeDocument).not.toHaveBeenCalledWith(
      'xiigen-mart-records',
      expect.anything(),
      expect.anything(),
    );
  });

  test('DC-07: DR-64 — ReverseEtlPushHandler emits ReverseETLPushed with transport=queue_fabric', async () => {
    const { ReverseEtlPushHandlerService } =
      await import('../../../src/engine/flows/etl-data-integration/reverse-etl-push-handler.service');

    const callOrder: string[] = [];
    const db = makeDb({
      storeDocument: jest.fn().mockImplementation(async (index: string) => {
        callOrder.push(`store:${index}`);
        return DataProcessResult.success({});
      }),
    });
    const queue = makeQueue(callOrder);
    const cls = makeCls();
    // checkRateLimit(connectorId, operation) → { allowed, retryAfterMs }
    const rate = {
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, retryAfterMs: 0 }),
    };

    const service = new ReverseEtlPushHandlerService(
      db as any,
      queue as any,
      cls as any,
      rate as any,
    );

    await service.push({
      connectorId: 'dc-conn',
      destination: 'salesforce',
      records: [{ id: '1', value: 'x' }],
    });

    const pushCall = queue.enqueue.mock.calls.find((c: unknown[]) => c[0] === 'ReverseETLPushed');
    expect(pushCall).toBeDefined();
    expect(pushCall![1]).toHaveProperty('transport', 'queue_fabric');
    // Source confirms no direct HTTP
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '../../../src/engine/flows/etl-data-integration/reverse-etl-push-handler.service.ts',
      ),
      'utf-8',
    );
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('http.get(');
    expect(source).not.toContain('axios');
  });

  test('DC-08: CF-204 — IdentityJoinResolver rejects cross-tenant join inputs', async () => {
    const { IdentityJoinResolverService } =
      await import('../../../src/engine/flows/etl-data-integration/identity-join-resolver.service');

    const db = makeDb();
    const queue = makeQueue();
    const cls = makeCls('tenant-A');
    const freedom = { get: jest.fn().mockReturnValue(0.9) };

    const service = new IdentityJoinResolverService(
      db as any,
      queue as any,
      cls as any,
      freedom as any,
    );

    // API: connectorId + joinInputs[{ entityId, tenantId }]
    // Cross-tenant input (tenant-B ≠ CLS tenant-A) → CROSS_TENANT_JOIN_BLOCKED failure
    const result = await service.resolve({
      connectorId: 'dc-conn',
      joinInputs: [
        { entityId: 'e1', tenantId: 'tenant-A', name: 'Alice' },
        { entityId: 'e2', tenantId: 'tenant-B', name: 'Alice' }, // different tenant — blocked
      ],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CROSS_TENANT_JOIN_BLOCKED');

    // Contract confirms CF-204 guard is a BUILD_FAILURE iron rule
    const t221 = loadContract('t221.contract.json');
    const ironRules = t221['ironRules'] as Array<{ rule: string; severity: string }>;
    const rule = ironRules.find(
      (r) => r.rule.includes('CF-204') || r.rule.includes('cross-tenant'),
    );
    expect(rule).toBeDefined();
    expect(rule!['severity']).toBe('BUILD_FAILURE');
  });

  test('DC-09: DNA-8 — WarehouseProvisioningHandler stores warehouse record before enqueue', async () => {
    const { WarehouseProvisioningHandlerService } =
      await import('../../../src/engine/flows/etl-data-integration/warehouse-provisioning-handler.service');

    const callOrder: string[] = [];
    const db = makeDb({
      storeDocument: jest.fn().mockImplementation(async (index: string) => {
        callOrder.push(`store:${index}`);
        return DataProcessResult.success({});
      }),
    });
    const queue = makeQueue(callOrder);
    const cls = makeCls();
    const rls = { registerPolicy: jest.fn().mockResolvedValue({ policyId: 'pol-1' }) };
    const audit = { recordProvisioning: jest.fn().mockResolvedValue(undefined) };

    const service = new WarehouseProvisioningHandlerService(
      db as any,
      queue as any,
      cls as any,
      rls as any,
      audit as any,
    );
    await service.provision({ warehouseId: 'wh-dc09' });

    const storeIdx = callOrder.findIndex((e) => e.startsWith('store:xiigen-warehouse-tenants'));
    const enqueueIdx = callOrder.indexOf('enqueue:WarehouseTenantProvisioned');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  test('DC-10: knowledgeScope PRIVATE in raw records (WebhookIngestionHandler)', async () => {
    const { WebhookIngestionHandlerService } =
      await import('../../../src/engine/flows/etl-data-integration/webhook-ingestion-handler.service');

    const db = makeDb();
    const queue = makeQueue();
    const cls = makeCls();
    const vault = {
      retrieveCredential: jest.fn().mockResolvedValue({ hmacSecret: 'test-secret' }),
    };

    const service = new WebhookIngestionHandlerService(
      db as any,
      queue as any,
      cls as any,
      vault as any,
    );
    const rawBody = JSON.stringify({ x: 1 });
    const sig = require('crypto').createHmac('sha256', 'test-secret').update(rawBody).digest('hex');

    await service.ingest({ connectorId: 'dc-conn', rawBody, signature: sig, payload: { x: 1 } });

    const rawCall = db.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-raw-records',
    );
    expect(rawCall).toBeDefined();
    expect(rawCall![1]).toMatchObject({ knowledgeScope: 'PRIVATE' });
  });
});
