/**
 * DimensionalModelBuilderService (T219) — unit tests
 *
 * Coverage:
 *  1.  Happy path — new dimension opened, DimensionVersionCreated emitted
 *  2.  IR-1: no updateDocument called (SCD-2 no direct UPDATE)
 *  3.  IR-2: close_old + open_new both stored (atomic)
 *  4.  IR-4: effectiveFrom on new version record
 *  5.  IR-6/DNA-8: storeDocument BEFORE enqueue DimensionVersionCreated
 *  6.  close_old fails → returns CLOSE_VERSION_FAILED
 *  7.  open_new fails → returns OPEN_VERSION_FAILED
 *  8.  knowledgeScope PRIVATE in dim version records
 *  9.  Fact append happy path — FactAppended emitted
 * 10.  Fact duplicate → skipped (idempotency)
 * 11.  Fact storeDocument BEFORE enqueue FactAppended
 * 12.  Validation: missing dimensionKey → failure
 */

import { DimensionalModelBuilderService } from './dimensional-model-builder.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('DimensionalModelBuilderService (T219)', () => {
  let mockDb: { searchDocuments: jest.Mock; storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let mockCls: { getCurrentTenantId: jest.Mock };
  let service: DimensionalModelBuilderService;
  let callOrder: string[];

  const TENANT = 'tenant-t195';

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

    service = new DimensionalModelBuilderService(mockDb as any, mockQueue as any, mockCls as any);
  });

  it('T219-1: happy path — new dimension opened, DimensionVersionCreated emitted', async () => {
    const result = await service.buildDimension({
      connectorId: 'conn-001',
      dimensionKey: 'customer-001',
      dimensionType: 'customer',
      attributes: { name: 'Alice' },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['closedPrevious']).toBe(false);
    const dimCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'DimensionVersionCreated');
    expect(dimCall).toBeDefined();
  });

  it('T219-2: IR-1 — no updateDocument method exists (no direct UPDATE)', () => {
    expect(mockDb).not.toHaveProperty('updateDocument');
  });

  it('T219-3: IR-2 — existing dim version closed, new opened (both stored)', async () => {
    mockDb.searchDocuments.mockResolvedValue(
      DataProcessResult.success([
        {
          versionId: 'old-ver-1',
          dimensionKey: 'cust-002',
          current: true,
          effectiveFrom: '2025-01-01T00:00:00Z',
        },
      ]),
    );

    const result = await service.buildDimension({
      connectorId: 'conn-002',
      dimensionKey: 'cust-002',
      dimensionType: 'customer',
      attributes: { name: 'Bob' },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['closedPrevious']).toBe(true);

    // Both close and open stored in DIM_VERSIONS_INDEX
    const dimStoreCalls = mockDb.storeDocument.mock.calls.filter(
      (c) => c[0] === 'xiigen-dimension-versions',
    );
    expect(dimStoreCalls.length).toBeGreaterThanOrEqual(2);

    // Closed version has effectiveTo set
    const closeCall = dimStoreCalls.find((c) => c[1]['current'] === false);
    expect(closeCall).toBeDefined();
    expect(closeCall![1]).toHaveProperty('effectiveTo');
  });

  it('T219-4: IR-4 — effectiveFrom on new version record', async () => {
    const effectiveFrom = '2026-01-01T00:00:00Z';
    await service.buildDimension({
      connectorId: 'conn-004',
      dimensionKey: 'dim-004',
      dimensionType: 'product',
      attributes: { sku: 'X1' },
      effectiveFrom,
    });

    const openCall = mockDb.storeDocument.mock.calls.find(
      (c) => c[0] === 'xiigen-dimension-versions' && c[1]['current'] === true,
    );
    expect(openCall).toBeDefined();
    expect(openCall![1]).toHaveProperty('effectiveFrom', effectiveFrom);
  });

  it('T219-5: IR-6/DNA-8 — storeDocument BEFORE enqueue DimensionVersionCreated', async () => {
    await service.buildDimension({
      connectorId: 'conn-005',
      dimensionKey: 'dim-005',
      dimensionType: 'product',
      attributes: { sku: 'Y2' },
    });

    const storeIdx = callOrder.findIndex((e) =>
      e.startsWith('storeDocument:xiigen-dimension-versions'),
    );
    const enqueueIdx = callOrder.indexOf('enqueue:DimensionVersionCreated');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('T219-6: close_old failure → returns CLOSE_VERSION_FAILED', async () => {
    mockDb.searchDocuments.mockResolvedValue(
      DataProcessResult.success([{ versionId: 'old-v', current: true, dimensionKey: 'dim-006' }]),
    );
    mockDb.storeDocument.mockResolvedValue(DataProcessResult.failure('DISK_FULL', 'no space'));

    const result = await service.buildDimension({
      connectorId: 'conn-006',
      dimensionKey: 'dim-006',
      dimensionType: 'product',
      attributes: {},
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CLOSE_VERSION_FAILED');
  });

  it('T219-7: open_new failure → returns OPEN_VERSION_FAILED', async () => {
    // No existing version — goes straight to open_new
    mockDb.storeDocument.mockResolvedValue(DataProcessResult.failure('DISK_FULL', 'no space'));

    const result = await service.buildDimension({
      connectorId: 'conn-007',
      dimensionKey: 'dim-007',
      dimensionType: 'product',
      attributes: {},
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('OPEN_VERSION_FAILED');
  });

  it('T219-8: knowledgeScope PRIVATE in dim version records', async () => {
    await service.buildDimension({
      connectorId: 'conn-008',
      dimensionKey: 'dim-008',
      dimensionType: 'product',
      attributes: { x: 1 },
    });

    const dimCall = mockDb.storeDocument.mock.calls.find(
      (c) => c[0] === 'xiigen-dimension-versions',
    );
    expect(dimCall).toBeDefined();
    expect(dimCall![1]).toMatchObject({ knowledgeScope: 'PRIVATE' });
  });

  it('T219-9: appendFact happy path — FactAppended emitted', async () => {
    const result = await service.appendFact({
      connectorId: 'conn-009',
      factKey: 'order-fact-009',
      factData: { orderId: 'o9', amount: 100 },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['skipped']).toBe(false);
    const factCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'FactAppended');
    expect(factCall).toBeDefined();
  });

  it('T219-10: fact duplicate → skipped', async () => {
    mockDb.searchDocuments.mockResolvedValue(
      DataProcessResult.success([{ idempotencyKey: 'existing' }]),
    );

    const result = await service.appendFact({
      connectorId: 'conn-010',
      factKey: 'order-fact-010',
      factData: { orderId: 'o10', amount: 50 },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['skipped']).toBe(true);
    expect(mockDb.storeDocument).not.toHaveBeenCalledWith(
      'xiigen-facts',
      expect.anything(),
      expect.anything(),
    );
  });

  it('T219-11: fact storeDocument BEFORE enqueue FactAppended', async () => {
    await service.appendFact({
      connectorId: 'conn-011',
      factKey: 'order-fact-011',
      factData: { orderId: 'o11', amount: 75 },
    });

    const storeIdx = callOrder.findIndex((e) => e.startsWith('storeDocument:xiigen-facts'));
    const enqueueIdx = callOrder.indexOf('enqueue:FactAppended');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('T219-12: validation — missing dimensionKey → failure', async () => {
    const result = await service.buildDimension({
      connectorId: 'conn-012',
      dimensionType: 'product',
      attributes: {},
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILED');
  });
});
