/**
 * FLOW-19 Phase C — ComplianceAuditWriterService (T623) e2e tests
 *
 * Coverage:
 *  1. Happy path — record written with auditHash and retentionExpiresAt, event emitted
 *  2. CF-19-3: retentionExpiresAt from FREEDOM config, not hardcoded
 *  3. CF-19-3: auditHash is deterministic SHA-256 of [tenantId:sagaId:eventType:writtenAt]
 *  4. CF-19-3: knowledgeScope PLATFORM_ONLY on compliance records
 *  5. DNA-8: storeDocument before enqueue(ComplianceRecordWritten)
 */

import 'reflect-metadata';
import { ComplianceAuditWriterService } from '../../../src/engine/flows/durable-sagas-compliance/compliance-audit-writer.service';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { createHash } from 'crypto';

function makeDb(callOrder: string[]) {
  return {
    storeDocument: jest.fn().mockImplementation(async (index: string) => {
      callOrder.push(`store:${index}`);
      return DataProcessResult.success({});
    }),
  };
}

function makeQueue(callOrder: string[]) {
  return {
    enqueue: jest.fn().mockImplementation(async (evt: string) => {
      callOrder.push(`enqueue:${evt}`);
      return DataProcessResult.success({});
    }),
  };
}

function makeCls(tenantId = 'e2e-tenant-t623') {
  return { get: jest.fn().mockReturnValue({ tenantId }) };
}

function makeRetentionConfig(days = 365) {
  return {
    getRetentionDays: jest.fn().mockResolvedValue(days),
  };
}

describe('FLOW-19 Phase C — ComplianceAuditWriter (T623)', () => {
  test('C-1: happy path — record written, ComplianceRecordWritten emitted with auditId', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const retentionConfig = makeRetentionConfig();

    const service = new ComplianceAuditWriterService(
      db as any,
      queue as any,
      makeCls() as any,
      retentionConfig as any,
    );

    const result = await service.writeAuditRecord({
      sagaId: 'saga-c001',
      sagaType: 'PAYMENT_SAGA',
      eventType: 'PAYMENT_PROCESSED',
      stepIndex: 0,
      contextData: { amount: 250 },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['auditId']).toBeDefined();
    expect(result.data!['retentionExpiresAt']).toBeDefined();
    const writtenEvt = queue.enqueue.mock.calls.find((c) => c[0] === 'ComplianceRecordWritten');
    expect(writtenEvt).toBeDefined();
    expect(writtenEvt![1]).toHaveProperty('auditId');
    expect(writtenEvt![1]).toHaveProperty('retentionExpiresAt');
  });

  test('C-2: CF-19-3 — retentionExpiresAt computed from FREEDOM config (90-day test)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const retentionConfig = makeRetentionConfig(90); // 90-day retention

    const service = new ComplianceAuditWriterService(
      db as any,
      queue as any,
      makeCls() as any,
      retentionConfig as any,
    );

    const result = await service.writeAuditRecord({
      sagaId: 'saga-c002',
      sagaType: 'TEST_SAGA',
      eventType: 'COMPLIANCE_REQUIRED',
      stepIndex: 1,
      contextData: {},
    });

    expect(result.isSuccess).toBe(true);

    const storeCall = db.storeDocument.mock.calls.find((c) => c[0] === 'xiigen-compliance-records');
    const storedRecord = storeCall![1] as Record<string, unknown>;
    expect(storedRecord['retentionDays']).toBe(90);

    // Verify expiry is ~90 days from writtenAt
    const writtenAt = new Date(storedRecord['writtenAt'] as string).getTime();
    const expiresAt = new Date(storedRecord['retentionExpiresAt'] as string).getTime();
    const diffDays = (expiresAt - writtenAt) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(90, 0);
  });

  test('C-3: CF-19-3 — auditHash = SHA-256(tenantId:sagaId:eventType:writtenAt)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const retentionConfig = makeRetentionConfig();
    const tenantId = 'e2e-tenant-t623';

    const service = new ComplianceAuditWriterService(
      db as any,
      queue as any,
      makeCls(tenantId) as any,
      retentionConfig as any,
    );

    const result = await service.writeAuditRecord({
      sagaId: 'saga-c003',
      sagaType: 'TEST_SAGA',
      eventType: 'SAGA_COMPLETED',
      stepIndex: 2,
      contextData: {},
    });

    const auditHash = result.data!['auditHash'] as string;
    expect(auditHash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 = 64 hex chars

    // Recompute expected hash
    const storeCall = db.storeDocument.mock.calls.find((c) => c[0] === 'xiigen-compliance-records');
    const writtenAt = (storeCall![1] as Record<string, unknown>)['writtenAt'] as string;
    const expectedHash = createHash('sha256')
      .update([tenantId, 'saga-c003', 'SAGA_COMPLETED', writtenAt].join(':'))
      .digest('hex');

    expect(auditHash).toBe(expectedHash);
  });

  test('C-4: CF-19-3 — knowledgeScope PLATFORM_ONLY on compliance record', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const retentionConfig = makeRetentionConfig();

    const service = new ComplianceAuditWriterService(
      db as any,
      queue as any,
      makeCls() as any,
      retentionConfig as any,
    );

    await service.writeAuditRecord({
      sagaId: 'saga-c004',
      sagaType: 'TEST_SAGA',
      eventType: 'COMPLIANCE_REQUIRED',
      stepIndex: 0,
      contextData: {},
    });

    const storeCall = db.storeDocument.mock.calls.find((c) => c[0] === 'xiigen-compliance-records');
    expect(storeCall![1]).toMatchObject({ knowledgeScope: 'PLATFORM_ONLY' });
  });

  test('C-5: DNA-8 — storeDocument before enqueue(ComplianceRecordWritten)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const retentionConfig = makeRetentionConfig();

    const service = new ComplianceAuditWriterService(
      db as any,
      queue as any,
      makeCls() as any,
      retentionConfig as any,
    );

    await service.writeAuditRecord({
      sagaId: 'saga-c005',
      sagaType: 'TEST_SAGA',
      eventType: 'SAGA_COMPLETED',
      stepIndex: 0,
      contextData: {},
    });

    const storeIdx = callOrder.findIndex((e) => e === 'store:xiigen-compliance-records');
    const enqueueIdx = callOrder.findIndex((e) => e === 'enqueue:ComplianceRecordWritten');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });
});
