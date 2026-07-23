/**
 * Unit tests for FeatureRegistryScanner — FLOW-36 Phase A
 */

import 'reflect-metadata';
import { FeatureRegistryScanner } from './feature-registry-scanner.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MASTER_TENANT_ID } from '../../../bootstrap/bootstrap-seeder.service';

const mockTaskTypes: Array<Record<string, unknown>> = [
  { taskTypeId: 'T44', name: 'Sample Contract A', archetype: 'SERVICE', flowId: 'FLOW-01' },
  { taskTypeId: 'T45', name: 'Sample Contract B', archetype: 'ORCHESTRATION', flowId: 'FLOW-01' },
  { taskTypeId: 'T71', name: 'User Group Create', archetype: 'SERVICE', flowId: 'FLOW-06' },
  { taskTypeId: 'T536', name: 'BootstrapOrchestrator', archetype: 'ORCHESTRATION', flowId: '' },
  { taskTypeId: 'T539', name: 'ImplementFamilyMetaLoop', archetype: 'ORCHESTRATION', flowId: '' },
];

function makeMockDb(taskTypes = mockTaskTypes) {
  return {
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(taskTypes)),
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  };
}

beforeEach(() => jest.clearAllMocks());

describe('FeatureRegistryScanner', () => {
  it('creates FT records for all registered task types', async () => {
    const db = makeMockDb();
    const scanner = new FeatureRegistryScanner(db as any);

    const result = await scanner.scan({ tenantId: MASTER_TENANT_ID });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.ftRecordsCreated).toBe(5);
    expect(result.data!.ftRecordsSkipped).toBe(0);
    expect(db.storeDocument).toHaveBeenCalledTimes(5);
  });

  it('marks bootstrap-list task types as portingCandidate: false', async () => {
    const db = makeMockDb();
    const scanner = new FeatureRegistryScanner(db as any);
    await scanner.scan({ tenantId: MASTER_TENANT_ID });

    const calls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    const t536Call = calls.find(([, doc]) => doc['taskTypeId'] === 'T536');
    const t539Call = calls.find(([, doc]) => doc['taskTypeId'] === 'T539');
    const t44Call = calls.find(([, doc]) => doc['taskTypeId'] === 'T44');

    expect(t536Call![1]['portingCandidate']).toBe(false);
    expect(t539Call![1]['portingCandidate']).toBe(false);
    // Non-bootstrap task types are portingCandidate: true
    expect(t44Call![1]['portingCandidate']).toBe(true);
  });

  it('assigns FT IDs keyed by taskTypeId (stable, not sequential)', async () => {
    const db = makeMockDb();
    const scanner = new FeatureRegistryScanner(db as any);
    await scanner.scan({ tenantId: MASTER_TENANT_ID });

    const calls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    const ftIdByTaskType = Object.fromEntries(
      calls.map(([, doc]) => [doc['taskTypeId'] as string, doc['ftId'] as string]),
    );

    expect(ftIdByTaskType['T44']).toBe('FT-T44');
    expect(ftIdByTaskType['T45']).toBe('FT-T45');
    expect(ftIdByTaskType['T536']).toBe('FT-T536');
    // All FT IDs follow FT-{taskTypeId} pattern
    for (const [taskTypeId, ftId] of Object.entries(ftIdByTaskType)) {
      expect(ftId).toBe(`FT-${taskTypeId}`);
    }
  });

  it('stores records with FLOW_SCOPED connectionType', async () => {
    const db = makeMockDb();
    const scanner = new FeatureRegistryScanner(db as any);
    await scanner.scan({ tenantId: MASTER_TENANT_ID });

    const calls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    for (const [, doc] of calls) {
      expect(doc['connectionType']).toBe('FLOW_SCOPED');
    }
  });

  it('stores records to xiigen-feature-registry index', async () => {
    const db = makeMockDb();
    const scanner = new FeatureRegistryScanner(db as any);
    await scanner.scan({ tenantId: MASTER_TENANT_ID });

    const calls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    for (const [index] of calls) {
      expect(index).toBe('xiigen-feature-registry');
    }
  });

  it('reads from xiigen-engine-contracts with size=1000 (DNA-2)', async () => {
    const db = makeMockDb();
    const scanner = new FeatureRegistryScanner(db as any);
    await scanner.scan({ tenantId: MASTER_TENANT_ID });

    expect(db.searchDocuments).toHaveBeenCalledWith('xiigen-engine-contracts', {}, 1000);
  });

  it('DNA-3: returns failure when database read fails', async () => {
    const db = makeMockDb();
    db.searchDocuments.mockResolvedValue(
      DataProcessResult.failure('DB_ERROR', 'connection refused'),
    );
    const scanner = new FeatureRegistryScanner(db as any);

    const result = await scanner.scan({ tenantId: MASTER_TENANT_ID });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SCANNER_READ_FAILED');
  });

  it('skips task types with missing taskTypeId and increments skipped count', async () => {
    const db = makeMockDb([
      { taskTypeId: 'T44', name: 'Valid', archetype: 'SERVICE' },
      { name: 'No taskTypeId', archetype: 'SERVICE' }, // no taskTypeId
    ]);
    const scanner = new FeatureRegistryScanner(db as any);

    const result = await scanner.scan({ tenantId: MASTER_TENANT_ID });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.ftRecordsCreated).toBe(1);
    expect(result.data!.ftRecordsSkipped).toBe(1);
  });

  it('DNA-3: returns failure on unexpected error', async () => {
    const db = makeMockDb();
    db.searchDocuments.mockRejectedValue(new Error('unexpected crash'));
    const scanner = new FeatureRegistryScanner(db as any);

    const result = await scanner.scan({ tenantId: MASTER_TENANT_ID });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SCANNER_ERROR');
  });
});
