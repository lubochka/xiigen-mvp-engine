/**
 * Unit tests for PhaseRequirementsSeeder — FLOW-37 Phase A
 */

import 'reflect-metadata';
import { PhaseRequirementsSeeder } from './phase-requirements-seeder.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MASTER_TENANT_ID } from '../../../bootstrap/bootstrap-seeder.service';

function makeMockDb() {
  return {
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  };
}

beforeEach(() => jest.clearAllMocks());

describe('PhaseRequirementsSeeder', () => {
  it('seeds 6 phase requirement documents to xiigen-phase-requirements', async () => {
    const db = makeMockDb();
    const seeder = new PhaseRequirementsSeeder(db as any);

    const result = await seeder.seed();

    expect(result.isSuccess).toBe(true);
    expect(result.data!.phaseRequirementsSeeded).toBe(6);

    const phaseCalls = (db.storeDocument as jest.Mock).mock.calls.filter(
      ([index]: [string]) => index === 'xiigen-phase-requirements',
    );
    expect(phaseCalls.length).toBe(6);
  });

  it('seeds 5 FLOW_DESIGN RAG patterns to xiigen-rag-patterns', async () => {
    const db = makeMockDb();
    const seeder = new PhaseRequirementsSeeder(db as any);

    const result = await seeder.seed();

    expect(result.isSuccess).toBe(true);
    expect(result.data!.ragPatternsSeeded).toBe(5);

    const ragCalls = (db.storeDocument as jest.Mock).mock.calls.filter(
      ([index]: [string]) => index === 'xiigen-rag-patterns',
    );
    expect(ragCalls.length).toBe(5);
  });

  it('stores phase docs with correct flowId and status=NOT_STARTED', async () => {
    const db = makeMockDb();
    const seeder = new PhaseRequirementsSeeder(db as any);
    await seeder.seed();

    const phaseCalls = (db.storeDocument as jest.Mock).mock.calls.filter(
      ([index]: [string]) => index === 'xiigen-phase-requirements',
    ) as Array<[string, Record<string, unknown>, string]>;

    for (const [, doc] of phaseCalls) {
      expect(doc['flowId']).toBe('FLOW-37');
      expect(doc['status']).toBe('NOT_STARTED');
      expect(doc['connectionType']).toBe('FLOW_SCOPED');
      expect(doc['tenantId']).toBe(MASTER_TENANT_ID);
    }
  });

  it('stores RAG seeds with patternType=FLOW_DESIGN and correct IDs', async () => {
    const db = makeMockDb();
    const seeder = new PhaseRequirementsSeeder(db as any);
    await seeder.seed();

    const ragCalls = (db.storeDocument as jest.Mock).mock.calls.filter(
      ([index]: [string]) => index === 'xiigen-rag-patterns',
    ) as Array<[string, Record<string, unknown>, string]>;

    const ids = ragCalls.map(([, doc]) => doc['patternId'] as string);
    expect(ids).toContain('FLOW-37-DESIGN-001');
    expect(ids).toContain('FLOW-37-DESIGN-005');

    for (const [, doc] of ragCalls) {
      expect(doc['patternType']).toBe('FLOW_DESIGN');
      expect(doc['flowId']).toBe('FLOW-37');
      expect(doc['connectionType']).toBe('FLOW_SCOPED');
      expect(doc['tenantId']).toBe(MASTER_TENANT_ID);
    }
  });

  it('uses patternId as document ID for RAG seeds (DNA-8)', async () => {
    const db = makeMockDb();
    const seeder = new PhaseRequirementsSeeder(db as any);
    await seeder.seed();

    const ragCalls = (db.storeDocument as jest.Mock).mock.calls.filter(
      ([index]: [string]) => index === 'xiigen-rag-patterns',
    ) as Array<[string, Record<string, unknown>, string]>;

    for (const [, doc, docId] of ragCalls) {
      expect(docId).toBe(doc['patternId']);
    }
  });

  it('uses FLOW-37-{phaseId} as document ID for phase docs', async () => {
    const db = makeMockDb();
    const seeder = new PhaseRequirementsSeeder(db as any);
    await seeder.seed();

    const phaseCalls = (db.storeDocument as jest.Mock).mock.calls.filter(
      ([index]: [string]) => index === 'xiigen-phase-requirements',
    ) as Array<[string, Record<string, unknown>, string]>;

    for (const [, doc, docId] of phaseCalls) {
      expect(docId).toBe(`FLOW-37-${doc['phaseId']}`);
    }
  });

  it('DNA-3: returns success with partial counts when some stores fail', async () => {
    const db = makeMockDb();
    let callCount = 0;
    db.storeDocument.mockImplementation(async () => {
      callCount++;
      // Fail every other call
      return callCount % 2 === 0
        ? DataProcessResult.failure('STORE_FAIL', 'disk error')
        : DataProcessResult.success({});
    });
    const seeder = new PhaseRequirementsSeeder(db as any);

    const result = await seeder.seed();

    expect(result.isSuccess).toBe(true);
    // Total 11 calls (6 phase + 5 rag), half fail
    expect(result.data!.phaseRequirementsSeeded + result.data!.ragPatternsSeeded).toBeLessThan(11);
  });

  it('DNA-3: returns failure on unexpected error', async () => {
    const db = makeMockDb();
    db.storeDocument.mockRejectedValue(new Error('unexpected crash'));
    const seeder = new PhaseRequirementsSeeder(db as any);

    const result = await seeder.seed();

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SEEDER_ERROR');
  });

  it('DNA-3: returns DataProcessResult on success', async () => {
    const db = makeMockDb();
    const seeder = new PhaseRequirementsSeeder(db as any);
    const result = await seeder.seed();
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
  });
});
