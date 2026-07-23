/**
 * FLOW-26 Phase C — Service Tests (T393, T394, T395, T396, T397).
 *
 * T393 CodeScaffoldGenerator
 * T394 ServiceCodeGenerator
 * T395 TestCodeGenerator
 * T396 ContractCodeEmitter
 * T397 CodeAssemblyOrchestrator
 */

import { CodeScaffoldGenerator } from '../../src/engine/flows/flow-extension-engine/code-scaffold-generator.service';
import { ServiceCodeGenerator } from '../../src/engine/flows/flow-extension-engine/service-code-generator.service';
import { TestCodeGenerator } from '../../src/engine/flows/flow-extension-engine/test-code-generator.service';
import { ContractCodeEmitter } from '../../src/engine/flows/flow-extension-engine/contract-code-emitter.service';
import { CodeAssemblyOrchestrator } from '../../src/engine/flows/flow-extension-engine/code-assembly-orchestrator.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-flow26-c';
const TEMPLATE_ID = 'tmpl-set-1';
const SCAFFOLD_ID = 'scaffold-1';
const CODE_ID = 'code-1';
const FLOW_ID = 'FLOW-99';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDb(existingDocs: Record<string, unknown>[] = []) {
  const stored: Record<string, unknown>[] = [];
  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) => {
      stored.push(doc);
      return DataProcessResult.success({ ...doc, _id: id ?? 'x' });
    }),
    searchDocuments: jest.fn(async () => DataProcessResult.success(existingDocs)),
    _stored: stored,
  } as any;
}

function makeFailingDb() {
  return {
    storeDocument: jest.fn(async () => DataProcessResult.failure('STORAGE_FAILED', 'write error')),
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
  } as any;
}

function makeQueue() {
  const events: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: any) => {
      events.push({ evt, data });
      return DataProcessResult.success('m');
    }),
    _events: events,
  } as any;
}

const VALID_TASK_TYPES = [
  {
    taskTypeId: 'T500',
    name: 'TestService',
    archetype: 'BUILD',
    bfaRegistration: { entities: ['entity_a'], events: ['event_a'], apiRoutes: ['/api/a'] },
    machineComponents: ['outbox ordering'],
    freedomComponents: ['config_key'],
  },
];

// ── T393 CodeScaffoldGenerator ────────────────────────────────────────────────

describe('CodeScaffoldGenerator (T393)', () => {
  it('F26C-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new CodeScaffoldGenerator(makeDb(), makeQueue());
    const r = await svc.generate('', TEMPLATE_ID, ['T500']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26C-2: valid args → success', async () => {
    const svc = new CodeScaffoldGenerator(makeDb(), makeQueue());
    const r = await svc.generate(TENANT, TEMPLATE_ID, ['T500', 'T501']);
    expect(r.isSuccess).toBe(true);
  });

  it('F26C-3: filesGenerated equals taskTypes count', async () => {
    const svc = new CodeScaffoldGenerator(makeDb(), makeQueue());
    const r = await svc.generate(TENANT, TEMPLATE_ID, ['T500', 'T501', 'T502']);
    expect(r.data!.filesGenerated).toBe(3);
  });

  it('F26C-4: scaffoldId is non-empty string', async () => {
    const svc = new CodeScaffoldGenerator(makeDb(), makeQueue());
    const r = await svc.generate(TENANT, TEMPLATE_ID, ['T500']);
    expect(r.data!.scaffoldId.length).toBeGreaterThan(0);
  });

  it('F26C-5: storeDocument() BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
    } as any;
    await new CodeScaffoldGenerator(db, queue).generate(TENANT, TEMPLATE_ID, ['T500']);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26C-6: emits flow.scaffold.generated', async () => {
    const queue = makeQueue();
    await new CodeScaffoldGenerator(makeDb(), queue).generate(TENANT, TEMPLATE_ID, ['T500']);
    expect(queue.enqueue).toHaveBeenCalledWith('flow.scaffold.generated', expect.any(Object));
  });

  it('F26C-7: DB store failure → error propagated', async () => {
    const r = await new CodeScaffoldGenerator(makeFailingDb(), makeQueue()).generate(
      TENANT,
      TEMPLATE_ID,
      ['T500'],
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });
});

// ── T394 ServiceCodeGenerator ─────────────────────────────────────────────────

describe('ServiceCodeGenerator (T394)', () => {
  it('F26C-8: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new ServiceCodeGenerator(makeDb(), makeQueue()).generate(
      '',
      SCAFFOLD_ID,
      'T500',
      {},
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26C-9: valid args → success', async () => {
    const r = await new ServiceCodeGenerator(makeDb(), makeQueue()).generate(
      TENANT,
      SCAFFOLD_ID,
      'T500',
      {},
    );
    expect(r.isSuccess).toBe(true);
  });

  it('F26C-10: taskType echoed in result', async () => {
    const r = await new ServiceCodeGenerator(makeDb(), makeQueue()).generate(
      TENANT,
      SCAFFOLD_ID,
      'T500',
      {},
    );
    expect(r.data!.taskType).toBe('T500');
  });

  it('F26C-11: linesGenerated > 0', async () => {
    const r = await new ServiceCodeGenerator(makeDb(), makeQueue()).generate(
      TENANT,
      SCAFFOLD_ID,
      'T500',
      {},
    );
    expect(r.data!.linesGenerated).toBeGreaterThan(0);
  });

  it('F26C-12: storeDocument() BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
    } as any;
    await new ServiceCodeGenerator(db, queue).generate(TENANT, SCAFFOLD_ID, 'T500', {});
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26C-13: emits flow.service.generated', async () => {
    const queue = makeQueue();
    await new ServiceCodeGenerator(makeDb(), queue).generate(TENANT, SCAFFOLD_ID, 'T500', {});
    expect(queue.enqueue).toHaveBeenCalledWith('flow.service.generated', expect.any(Object));
  });
});

// ── T395 TestCodeGenerator ────────────────────────────────────────────────────

describe('TestCodeGenerator (T395)', () => {
  it('F26C-14: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new TestCodeGenerator(makeDb(), makeQueue()).generate('', CODE_ID, 'T500', {});
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26C-15: valid args → success', async () => {
    const r = await new TestCodeGenerator(makeDb(), makeQueue()).generate(
      TENANT,
      CODE_ID,
      'T500',
      {},
    );
    expect(r.isSuccess).toBe(true);
  });

  it('F26C-16: testCount > 0', async () => {
    const r = await new TestCodeGenerator(makeDb(), makeQueue()).generate(
      TENANT,
      CODE_ID,
      'T500',
      {},
    );
    expect(r.data!.testCount).toBeGreaterThan(0);
  });

  it('F26C-17: testSuiteId is non-empty string', async () => {
    const r = await new TestCodeGenerator(makeDb(), makeQueue()).generate(
      TENANT,
      CODE_ID,
      'T500',
      {},
    );
    expect(r.data!.testSuiteId.length).toBeGreaterThan(0);
  });

  it('F26C-18: storeDocument() BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
    } as any;
    await new TestCodeGenerator(db, queue).generate(TENANT, CODE_ID, 'T500', {});
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26C-19: emits flow.tests.generated', async () => {
    const queue = makeQueue();
    await new TestCodeGenerator(makeDb(), queue).generate(TENANT, CODE_ID, 'T500', {});
    expect(queue.enqueue).toHaveBeenCalledWith('flow.tests.generated', expect.any(Object));
  });
});

// ── T396 ContractCodeEmitter ──────────────────────────────────────────────────

describe('ContractCodeEmitter (T396)', () => {
  it('F26C-20: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new ContractCodeEmitter(makeDb(), makeQueue()).emit(
      '',
      FLOW_ID,
      VALID_TASK_TYPES,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26C-21: valid args → success', async () => {
    const r = await new ContractCodeEmitter(makeDb(), makeQueue()).emit(
      TENANT,
      FLOW_ID,
      VALID_TASK_TYPES,
    );
    expect(r.isSuccess).toBe(true);
  });

  it('F26C-22: contractCount equals taskTypes length', async () => {
    const r = await new ContractCodeEmitter(makeDb(), makeQueue()).emit(
      TENANT,
      FLOW_ID,
      VALID_TASK_TYPES,
    );
    expect(r.data!.contractCount).toBe(VALID_TASK_TYPES.length);
  });

  it('F26C-23: invalid contract shape → INVALID_CONTRACT_SHAPE', async () => {
    const badTypes = [{ taskTypeId: 'T500', name: 'Test', archetype: 'BUILD' } as any];
    const r = await new ContractCodeEmitter(makeDb(), makeQueue()).emit(TENANT, FLOW_ID, badTypes);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('INVALID_CONTRACT_SHAPE');
  });

  it('F26C-24: storeDocument() BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
    } as any;
    await new ContractCodeEmitter(db, queue).emit(TENANT, FLOW_ID, VALID_TASK_TYPES);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26C-25: emits flow.contract.emitted', async () => {
    const queue = makeQueue();
    await new ContractCodeEmitter(makeDb(), queue).emit(TENANT, FLOW_ID, VALID_TASK_TYPES);
    expect(queue.enqueue).toHaveBeenCalledWith('flow.contract.emitted', expect.any(Object));
  });
});

// ── T397 CodeAssemblyOrchestrator ─────────────────────────────────────────────

describe('CodeAssemblyOrchestrator (T397)', () => {
  it('F26C-26: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new CodeAssemblyOrchestrator(makeDb(), makeQueue()).assemble('', FLOW_ID, {});
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26C-27: valid args → success with QUEUED status', async () => {
    const r = await new CodeAssemblyOrchestrator(makeDb(), makeQueue()).assemble(
      TENANT,
      FLOW_ID,
      {},
    );
    expect(r.isSuccess).toBe(true);
    expect(r.data!.status).toBe('QUEUED');
  });

  it('F26C-28: idempotent — second call returns existing without re-assembling', async () => {
    const existing = [
      { assemblyId: 'existing-asm', flowId: FLOW_ID, assembledAt: '2024-01-01T00:00:00.000Z' },
    ];
    const db = makeDb(existing);
    const r = await new CodeAssemblyOrchestrator(db, makeQueue()).assemble(TENANT, FLOW_ID, {});
    expect(r.data!.assemblyId).toBe('existing-asm');
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('F26C-29: flowId echoed in result', async () => {
    const r = await new CodeAssemblyOrchestrator(makeDb(), makeQueue()).assemble(
      TENANT,
      FLOW_ID,
      {},
    );
    expect(r.data!.flowId).toBe(FLOW_ID);
  });

  it('F26C-30: storeDocument() BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
      searchDocuments: jest.fn(async () => DataProcessResult.success([])),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
    } as any;
    await new CodeAssemblyOrchestrator(db, queue).assemble(TENANT, FLOW_ID, {});
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26C-31: emits flow.code.assembled', async () => {
    const queue = makeQueue();
    await new CodeAssemblyOrchestrator(makeDb(), queue).assemble(TENANT, FLOW_ID, {});
    expect(queue.enqueue).toHaveBeenCalledWith('flow.code.assembled', expect.any(Object));
  });
});
