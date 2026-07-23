/**
 * MartKpiBuilderService (T220) — unit tests
 *
 * Coverage:
 *  1.  Happy path — PII clean, KPIs computed, MartRefreshed emitted
 *  2.  IR-1/DR-63: PII gate at ORDER 1 before mart write (F462 called first)
 *  3.  IR-2: piiFieldsDetected > 0 → PII_GATE_BLOCKED, no mart write
 *  4.  IR-3: PiiClassificationCompleted emitted BEFORE MartRefreshed
 *  5.  IR-4: RLS applied before returning results
 *  6.  IR-5: MartRefreshed includes piiGateApplied: true
 *  7.  IR-6: KPIComputationCompleted emitted after aggregation
 *  8.  IR-7/DNA-8: storeDocument BEFORE enqueue MartRefreshed
 *  9.  Store failure → returns STORE_FAILED
 * 10.  knowledgeScope PRIVATE in mart and PII result records
 * 11.  PiiClassificationCompleted emitted even when blocked (before failure)
 * 12.  Validation: missing connectorId → failure
 */

import { MartKpiBuilderService } from './mart-kpi-builder.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('MartKpiBuilderService (T220)', () => {
  let mockDb: { searchDocuments: jest.Mock; storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let mockCls: { getCurrentTenantId: jest.Mock };
  let mockPii: { classifyFields: jest.Mock };
  let mockRls: { applyPolicies: jest.Mock };
  let service: MartKpiBuilderService;
  let callOrder: string[];

  const TENANT = 'tenant-t196';

  beforeEach(() => {
    callOrder = [];

    mockDb = {
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
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

    mockCls = { getCurrentTenantId: jest.fn().mockReturnValue(DataProcessResult.success(TENANT)) };

    mockPii = {
      classifyFields: jest.fn().mockImplementation(async () => {
        callOrder.push('piiClassify');
        return {
          safeToWrite: true,
          piiFieldsDetected: [],
          maskedFields: { amount: 100, count: 5 },
        };
      }),
    };

    mockRls = {
      applyPolicies: jest
        .fn()
        .mockImplementation(async (connectorId: string, tenantId: string, records: unknown[]) => {
          callOrder.push('rlsApply');
          return records;
        }),
    };

    service = new MartKpiBuilderService(
      mockDb as any,
      mockQueue as any,
      mockCls as any,
      mockPii as any,
      mockRls as any,
    );
  });

  it('T220-1: happy path — PII clean, KPIs computed, MartRefreshed emitted', async () => {
    const result = await service.buildKpis({
      connectorId: 'conn-001',
      martEntity: 'sales_mart',
      factRecords: [{ orderId: 'o1', amount: 100 }],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['piiGateApplied']).toBe(true);
    const martCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'MartRefreshed');
    expect(martCall).toBeDefined();
  });

  it('T220-2: IR-1/DR-63 — PII classify called before mart store', async () => {
    await service.buildKpis({
      connectorId: 'conn-002',
      martEntity: 'sales_mart',
      factRecords: [{ amount: 200 }],
    });

    const piiIdx = callOrder.indexOf('piiClassify');
    const storeIdx = callOrder.findIndex((e) => e.startsWith('storeDocument:xiigen-mart-records'));
    expect(piiIdx).toBeGreaterThanOrEqual(0);
    expect(storeIdx).toBeGreaterThan(piiIdx);
  });

  it('T220-3: IR-2 — piiFieldsDetected > 0 → PII_GATE_BLOCKED, no mart write', async () => {
    mockPii.classifyFields.mockResolvedValue({
      safeToWrite: false,
      piiFieldsDetected: ['email', 'phone'],
      maskedFields: {},
    });

    const result = await service.buildKpis({
      connectorId: 'conn-003',
      martEntity: 'sales_mart',
      factRecords: [{ email: 'alice@example.com', phone: '555-0100' }],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PII_GATE_BLOCKED');
    expect(mockDb.storeDocument).not.toHaveBeenCalledWith(
      'xiigen-mart-records',
      expect.anything(),
      expect.anything(),
    );
  });

  it('T220-4: IR-3 — PiiClassificationCompleted emitted BEFORE MartRefreshed', async () => {
    await service.buildKpis({
      connectorId: 'conn-004',
      martEntity: 'sales_mart',
      factRecords: [{ amount: 50 }],
    });

    const piiEvtIdx = callOrder.indexOf('enqueue:PiiClassificationCompleted');
    const martEvtIdx = callOrder.indexOf('enqueue:MartRefreshed');
    expect(piiEvtIdx).toBeGreaterThanOrEqual(0);
    expect(martEvtIdx).toBeGreaterThan(piiEvtIdx);
  });

  it('T220-5: IR-4 — RLS applyPolicies called before returning results', async () => {
    const result = await service.buildKpis({
      connectorId: 'conn-005',
      martEntity: 'sales_mart',
      factRecords: [{ amount: 80 }],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['rlsApplied']).toBe(true);
    expect(mockRls.applyPolicies).toHaveBeenCalled();
  });

  it('T220-6: IR-5 — MartRefreshed payload includes piiGateApplied: true', async () => {
    await service.buildKpis({
      connectorId: 'conn-006',
      martEntity: 'sales_mart',
      factRecords: [{ amount: 60 }],
    });

    const martCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'MartRefreshed');
    expect(martCall).toBeDefined();
    expect(martCall![1]).toHaveProperty('piiGateApplied', true);
  });

  it('T220-7: IR-6 — KPIComputationCompleted emitted after aggregation', async () => {
    await service.buildKpis({
      connectorId: 'conn-007',
      martEntity: 'sales_mart',
      factRecords: [{ amount: 120 }],
    });

    const kpiCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'KPIComputationCompleted');
    expect(kpiCall).toBeDefined();
    expect(kpiCall![1]).toHaveProperty('kpis');
  });

  it('T220-8: IR-7/DNA-8 — storeDocument mart records BEFORE enqueue MartRefreshed', async () => {
    await service.buildKpis({
      connectorId: 'conn-008',
      martEntity: 'sales_mart',
      factRecords: [{ amount: 90 }],
    });

    const storeIdx = callOrder.findIndex((e) => e.startsWith('storeDocument:xiigen-mart-records'));
    const enqueueIdx = callOrder.indexOf('enqueue:MartRefreshed');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('T220-9: store failure → returns STORE_FAILED', async () => {
    mockDb.storeDocument.mockImplementation(async (index: string) => {
      if (index === 'xiigen-mart-records')
        return DataProcessResult.failure('DISK_FULL', 'no space');
      return DataProcessResult.success({});
    });

    const result = await service.buildKpis({
      connectorId: 'conn-009',
      martEntity: 'sales_mart',
      factRecords: [{ amount: 70 }],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('STORE_FAILED');
  });

  it('T220-10: knowledgeScope PRIVATE in mart and PII result records', async () => {
    await service.buildKpis({
      connectorId: 'conn-010',
      martEntity: 'sales_mart',
      factRecords: [{ amount: 40 }],
    });

    const martCall = mockDb.storeDocument.mock.calls.find((c) => c[0] === 'xiigen-mart-records');
    expect(martCall![1]).toMatchObject({ knowledgeScope: 'PRIVATE' });

    const piiCall = mockDb.storeDocument.mock.calls.find(
      (c) => c[0] === 'xiigen-pii-classification-results',
    );
    expect(piiCall![1]).toMatchObject({ knowledgeScope: 'PRIVATE' });
  });

  it('T220-11: PiiClassificationCompleted emitted even when PII gate blocks mart write', async () => {
    mockPii.classifyFields.mockResolvedValue({
      safeToWrite: false,
      piiFieldsDetected: ['ssn'],
      maskedFields: {},
    });

    await service.buildKpis({
      connectorId: 'conn-011',
      martEntity: 'sales_mart',
      factRecords: [{ ssn: '123-45-6789' }],
    });

    const piiEvt = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'PiiClassificationCompleted');
    expect(piiEvt).toBeDefined();
  });

  it('T220-12: validation — missing connectorId → failure', async () => {
    const result = await service.buildKpis({ martEntity: 'sales_mart', factRecords: [] });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILED');
  });
});
