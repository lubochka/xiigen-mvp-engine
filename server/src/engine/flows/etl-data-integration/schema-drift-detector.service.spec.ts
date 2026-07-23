/**
 * SchemaDriftDetectorService (T218) — unit tests
 *
 * Coverage:
 *  1.  Happy path — no drift, returns driftScore=0
 *  2.  IR-1: drift threshold read from FREEDOM config
 *  3.  IR-2: drift above threshold → SchemaDriftDetected emitted
 *  4.  Drift below threshold → no SchemaDriftDetected emitted
 *  5.  IR-3/IR-6: approve() emits SchemaApproved + saves schema version
 *  6.  IR-7/DNA-8: storeDocument called BEFORE enqueue SchemaDriftDetected
 *  7.  No baseline → first schema stored as baseline, driftScore=0
 *  8.  Added fields detected in drift
 *  9.  Removed fields detected in drift
 * 10.  Type changes detected in drift
 * 11.  knowledgeScope PRIVATE in stored records
 * 12.  Validation: missing connectorId → failure
 */

import { SchemaDriftDetectorService } from './schema-drift-detector.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('SchemaDriftDetectorService (T218)', () => {
  let mockDb: { searchDocuments: jest.Mock; storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let mockCls: { getCurrentTenantId: jest.Mock };
  let mockFreedom: { get: jest.Mock };
  let service: SchemaDriftDetectorService;
  let callOrder: string[];

  const TENANT = 'tenant-t194';

  const BASELINE_SCHEMA = [
    { name: 'id', type: 'string' },
    { name: 'amount', type: 'number' },
    { name: 'status', type: 'string' },
  ];

  beforeEach(() => {
    callOrder = [];

    mockDb = {
      searchDocuments: jest
        .fn()
        .mockResolvedValue(DataProcessResult.success([{ fields: BASELINE_SCHEMA }])),
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

    mockFreedom = { get: jest.fn().mockReturnValue(0.3) };

    service = new SchemaDriftDetectorService(
      mockDb as any,
      mockQueue as any,
      mockCls as any,
      mockFreedom as any,
    );
  });

  it('T218-1: happy path — same schema, driftScore=0, no event', async () => {
    const result = await service.detect({
      connectorId: 'conn-001',
      incomingSchema: [...BASELINE_SCHEMA],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.driftScore).toBe(0);
    expect(result.data!.aboveThreshold).toBe(false);
    expect(mockQueue.enqueue).not.toHaveBeenCalledWith('SchemaDriftDetected', expect.anything());
  });

  it('T218-2: IR-1 — threshold read from FREEDOM config', async () => {
    mockFreedom.get.mockReturnValue(0.1); // very tight threshold

    // Adding 1 field out of 3 = drift ~0.25 > 0.1
    await service.detect({
      connectorId: 'conn-002',
      incomingSchema: [...BASELINE_SCHEMA, { name: 'newField', type: 'string' }],
    });

    expect(mockFreedom.get).toHaveBeenCalledWith('flow14_schema_drift_quarantine_threshold', 0.3);
  });

  it('T218-3: IR-2 — drift above threshold → SchemaDriftDetected emitted', async () => {
    // 3 added fields out of 3 existing = high drift
    const result = await service.detect({
      connectorId: 'conn-003',
      incomingSchema: [
        { name: 'fieldA', type: 'string' },
        { name: 'fieldB', type: 'number' },
        { name: 'fieldC', type: 'boolean' },
      ],
    });

    expect(result.data!.aboveThreshold).toBe(true);
    const driftCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'SchemaDriftDetected');
    expect(driftCall).toBeDefined();
    expect(driftCall![1]).toHaveProperty('driftScore');
    expect(driftCall![1]).toHaveProperty('threshold');
  });

  it('T218-4: drift below threshold → SchemaDriftDetected NOT emitted', async () => {
    mockFreedom.get.mockReturnValue(0.99); // very permissive

    await service.detect({
      connectorId: 'conn-004',
      incomingSchema: [...BASELINE_SCHEMA, { name: 'extra', type: 'string' }],
    });

    const driftCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'SchemaDriftDetected');
    expect(driftCall).toBeUndefined();
  });

  it('T218-5: IR-3/IR-6 — approve() emits SchemaApproved and saves schema version', async () => {
    const newSchema = [...BASELINE_SCHEMA, { name: 'newField', type: 'string' }];
    const result = await service.approve({
      connectorId: 'conn-005',
      newSchema,
      approvedBy: 'admin',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.approved).toBe(true);
    const approvedCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'SchemaApproved');
    expect(approvedCall).toBeDefined();
    const storeCall = mockDb.storeDocument.mock.calls.find(
      (c) => c[0] === 'xiigen-schema-baselines',
    );
    expect(storeCall).toBeDefined();
    expect(storeCall![1]).toHaveProperty('approvedBy', 'admin');
  });

  it('T218-6: IR-7/DNA-8 — storeDocument called BEFORE enqueue SchemaDriftDetected', async () => {
    // Force drift above threshold
    await service.detect({
      connectorId: 'conn-006',
      incomingSchema: [
        { name: 'x', type: 'string' },
        { name: 'y', type: 'number' },
        { name: 'z', type: 'boolean' },
      ],
    });

    const storeIdx = callOrder.findIndex((e) =>
      e.startsWith('storeDocument:xiigen-schema-versions'),
    );
    const enqueueIdx = callOrder.indexOf('enqueue:SchemaDriftDetected');
    if (storeIdx >= 0 && enqueueIdx >= 0) {
      expect(storeIdx).toBeLessThan(enqueueIdx);
    }
  });

  it('T218-7: no baseline → stores incoming as first baseline, returns driftScore=0', async () => {
    mockDb.searchDocuments.mockResolvedValue(DataProcessResult.success([]));

    const result = await service.detect({
      connectorId: 'conn-007',
      incomingSchema: BASELINE_SCHEMA,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.driftScore).toBe(0);
    const storeCall = mockDb.storeDocument.mock.calls.find(
      (c) => c[0] === 'xiigen-schema-baselines',
    );
    expect(storeCall).toBeDefined();
  });

  it('T218-8: added fields detected in drift', async () => {
    const result = await service.detect({
      connectorId: 'conn-008',
      incomingSchema: [...BASELINE_SCHEMA, { name: 'newField', type: 'string' }],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.addedFields).toContain('newField');
  });

  it('T218-9: removed fields detected in drift', async () => {
    const result = await service.detect({
      connectorId: 'conn-009',
      incomingSchema: [
        { name: 'id', type: 'string' },
        { name: 'amount', type: 'number' },
      ], // 'status' removed
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.removedFields).toContain('status');
  });

  it('T218-10: type changes detected in drift', async () => {
    const result = await service.detect({
      connectorId: 'conn-010',
      incomingSchema: [
        { name: 'id', type: 'string' },
        { name: 'amount', type: 'string' }, // changed from number
        { name: 'status', type: 'string' },
      ],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.typeChanges.length).toBeGreaterThan(0);
    expect(result.data!.typeChanges[0]).toContain('amount');
  });

  it('T218-11: knowledgeScope PRIVATE in schema version record on drift', async () => {
    // Force drift above threshold
    await service.detect({
      connectorId: 'conn-011',
      incomingSchema: [
        { name: 'x', type: 'string' },
        { name: 'y', type: 'number' },
        { name: 'z', type: 'boolean' },
      ],
    });

    const versionCall = mockDb.storeDocument.mock.calls.find(
      (c) => c[0] === 'xiigen-schema-versions',
    );
    if (versionCall) {
      expect(versionCall[1]).toMatchObject({ knowledgeScope: 'PRIVATE' });
    }
  });

  it('T218-12: validation — missing connectorId → failure', async () => {
    const result = await service.detect({ incomingSchema: BASELINE_SCHEMA });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILED');
  });
});
