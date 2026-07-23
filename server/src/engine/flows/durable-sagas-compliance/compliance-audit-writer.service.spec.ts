/**
 * ComplianceAuditWriterService (T623) — unit tests
 *
 * Coverage:
 *  1. Happy path — compliance record written, ComplianceRecordWritten emitted
 *  2. IR-1: retentionExpiresAt computed from FREEDOM config (not hardcoded)
 *  3. IR-2: auditHash = SHA-256(tenantId:sagaId:eventType:writtenAt)
 *  4. IR-3: append-only — no updateDocument call on compliance index
 *  5. IR-4/DNA-8: storeDocument before enqueue(ComplianceRecordWritten)
 */

import { ComplianceAuditWriterService } from './compliance-audit-writer.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { createHash } from 'crypto';

describe('ComplianceAuditWriterService (T623)', () => {
  let mockDb: { storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let mockCls: { get: jest.Mock };
  let mockRetentionConfig: { getRetentionDays: jest.Mock };
  let service: ComplianceAuditWriterService;
  let callOrder: string[];

  const TENANT = 'tenant-t623';

  beforeEach(() => {
    callOrder = [];

    mockDb = {
      storeDocument: jest.fn().mockImplementation(async (index: string) => {
        callOrder.push(`storeDocument:${index}`);
        return DataProcessResult.success({});
      }),
    };

    mockQueue = {
      enqueue: jest.fn().mockImplementation(async (evt: string) => {
        callOrder.push(`enqueue:${evt}`);
        return DataProcessResult.success({});
      }),
    };

    mockCls = { get: jest.fn().mockReturnValue({ tenantId: TENANT }) };

    mockRetentionConfig = {
      getRetentionDays: jest.fn().mockResolvedValue(365),
    };

    service = new ComplianceAuditWriterService(
      mockDb as any,
      mockQueue as any,
      mockCls as any,
      mockRetentionConfig as any,
    );
  });

  it('T623-1: happy path — record written, ComplianceRecordWritten emitted', async () => {
    const result = await service.writeAuditRecord({
      sagaId: 'saga-a001',
      sagaType: 'PAYMENT_SAGA',
      eventType: 'PAYMENT_PROCESSED',
      stepIndex: 0,
      contextData: { amount: 100 },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['auditId']).toBeDefined();
    expect(result.data!['retentionExpiresAt']).toBeDefined();
    const writtenCall = mockQueue.enqueue.mock.calls.find(
      (c) => c[0] === 'ComplianceRecordWritten',
    );
    expect(writtenCall).toBeDefined();
  });

  it('T623-2: IR-1 — retentionExpiresAt from FREEDOM config (getRetentionDays called)', async () => {
    await service.writeAuditRecord({
      sagaId: 'saga-a002',
      sagaType: 'TEST_SAGA',
      eventType: 'TEST_EVENT',
      stepIndex: 0,
      contextData: {},
    });

    expect(mockRetentionConfig.getRetentionDays).toHaveBeenCalledWith(
      'flow19_compliance_retention_days',
    );

    const storeCall = mockDb.storeDocument.mock.calls.find(
      (c) => c[0] === 'xiigen-compliance-records',
    );
    expect(storeCall).toBeDefined();
    expect(storeCall![1]).toHaveProperty('retentionExpiresAt');
    expect(storeCall![1]).toHaveProperty('retentionDays', 365);
  });

  it('T623-3: IR-2 — auditHash is SHA-256(tenantId:sagaId:eventType:writtenAt)', async () => {
    const before = new Date();
    const result = await service.writeAuditRecord({
      sagaId: 'saga-a003',
      sagaType: 'TEST_SAGA',
      eventType: 'SAGA_COMPLETED',
      stepIndex: 1,
      contextData: {},
    });
    const after = new Date();

    expect(result.isSuccess).toBe(true);
    const auditId = result.data!['auditId'] as string;
    const auditHash = result.data!['auditHash'] as string;
    expect(auditId).toBe(auditHash); // auditId === auditHash

    // Verify hash format — it should be a 64-char hex string (SHA-256)
    expect(auditHash).toMatch(/^[0-9a-f]{64}$/);

    // Verify hash is computed from the right fields
    const storeCall = mockDb.storeDocument.mock.calls.find(
      (c) => c[0] === 'xiigen-compliance-records',
    );
    const storedRecord = storeCall![1] as Record<string, unknown>;
    const writtenAt = storedRecord['writtenAt'] as string;
    const expectedHash = createHash('sha256')
      .update([TENANT, 'saga-a003', 'SAGA_COMPLETED', writtenAt].join(':'))
      .digest('hex');
    expect(auditHash).toBe(expectedHash);
  });

  it('T623-4: IR-3 — append-only: mockDb has no updateDocument method', async () => {
    // Compliance writer should never call updateDocument
    await service.writeAuditRecord({
      sagaId: 'saga-a004',
      sagaType: 'TEST_SAGA',
      eventType: 'AUDIT_EVENT',
      stepIndex: 0,
      contextData: {},
    });

    expect(mockDb).not.toHaveProperty('updateDocument');
    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-compliance-records',
      expect.objectContaining({ knowledgeScope: 'PLATFORM_ONLY' }),
      expect.any(String),
    );
  });

  it('T623-5: IR-4/DNA-8 — storeDocument before enqueue(ComplianceRecordWritten)', async () => {
    await service.writeAuditRecord({
      sagaId: 'saga-a005',
      sagaType: 'TEST_SAGA',
      eventType: 'SAGA_COMPLETED',
      stepIndex: 0,
      contextData: {},
    });

    const storeIdx = callOrder.findIndex((e) =>
      e.startsWith('storeDocument:xiigen-compliance-records'),
    );
    const enqueueIdx = callOrder.findIndex((e) => e === 'enqueue:ComplianceRecordWritten');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });
});
