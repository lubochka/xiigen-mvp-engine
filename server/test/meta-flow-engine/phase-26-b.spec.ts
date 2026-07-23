/**
 * FLOW-26 Phase B — Service Tests (T389, T390, T391, T392).
 *
 * T389 FlowSpecParser
 * T390 FlowSpecValidator
 * T391 FlowDependencyMapper
 * T392 FlowTemplateResolver
 */

import { FlowSpecParser } from '../../src/engine/flows/flow-extension-engine/flow-spec-parser.service';
import { FlowSpecValidator } from '../../src/engine/flows/flow-extension-engine/flow-spec-validator.service';
import { FlowDependencyMapper } from '../../src/engine/flows/flow-extension-engine/flow-dependency-mapper.service';
import { FlowTemplateResolver } from '../../src/engine/flows/flow-extension-engine/flow-template-resolver.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-flow26-b';
const SPEC_ID = 'spec-test-1';

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

function makeFreedom(
  rules: Record<string, unknown> = { min_task_types: 1, required_archetypes: [] },
) {
  return {
    get: jest.fn(async () => DataProcessResult.success(rules)),
  } as any;
}

function makeFailingFreedom() {
  return {
    get: jest.fn(async () => DataProcessResult.failure('CONFIG_NOT_FOUND', 'no config')),
  } as any;
}

// ── T389 FlowSpecParser ───────────────────────────────────────────────────────

describe('FlowSpecParser (T389)', () => {
  it('F26B-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new FlowSpecParser(makeDb(), makeQueue());
    const r = await svc.parse('', { flowId: 'FLOW-99', name: 'Test' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26B-2: missing flowId in spec → MISSING_FLOW_ID', async () => {
    const svc = new FlowSpecParser(makeDb(), makeQueue());
    const r = await svc.parse(TENANT, { name: 'Test' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_FLOW_ID');
  });

  it('F26B-3: valid args → success', async () => {
    const svc = new FlowSpecParser(makeDb(), makeQueue());
    const r = await svc.parse(TENANT, { flowId: 'FLOW-99', name: 'Test', taskTypes: ['T500'] });
    expect(r.isSuccess).toBe(true);
  });

  it('F26B-4: specId is non-empty string', async () => {
    const svc = new FlowSpecParser(makeDb(), makeQueue());
    const r = await svc.parse(TENANT, { flowId: 'FLOW-99', name: 'Test', taskTypes: ['T500'] });
    expect(r.data!.specId.length).toBeGreaterThan(0);
  });

  it('F26B-5: taskCount reflects taskTypes array length', async () => {
    const svc = new FlowSpecParser(makeDb(), makeQueue());
    const r = await svc.parse(TENANT, {
      flowId: 'FLOW-99',
      name: 'Test',
      taskTypes: ['T500', 'T501', 'T502'],
    });
    expect(r.data!.taskCount).toBe(3);
  });

  it('F26B-6: idempotent — second call returns existing without re-storing', async () => {
    const existing = [
      {
        specId: 'existing-spec',
        flowId: 'FLOW-99',
        taskCount: 2,
        parsedAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    const db = makeDb(existing);
    const svc = new FlowSpecParser(db, makeQueue());
    const r = await svc.parse(TENANT, { flowId: 'FLOW-99', name: 'Test' });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.specId).toBe('existing-spec');
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('F26B-7: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new FlowSpecParser(db, queue);
    await svc.parse(TENANT, { flowId: 'FLOW-99', name: 'Test' });
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26B-8: emits flow.spec.parsed event', async () => {
    const queue = makeQueue();
    const svc = new FlowSpecParser(makeDb(), queue);
    await svc.parse(TENANT, { flowId: 'FLOW-99', name: 'Test' });
    expect(queue.enqueue).toHaveBeenCalledWith('flow.spec.parsed', expect.any(Object));
  });

  it('F26B-9: DB store failure → error propagated', async () => {
    const svc = new FlowSpecParser(makeFailingDb(), makeQueue());
    const r = await svc.parse(TENANT, { flowId: 'FLOW-99', name: 'Test' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });
});

// ── T390 FlowSpecValidator ────────────────────────────────────────────────────

describe('FlowSpecValidator (T390)', () => {
  it('F26B-10: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new FlowSpecValidator(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.validate('', SPEC_ID, ['T500'], ['INGESTION']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26B-11: valid spec → success, valid: true', async () => {
    const svc = new FlowSpecValidator(
      makeDb(),
      makeQueue(),
      makeFreedom({ min_task_types: 1, required_archetypes: ['INGESTION'] }),
    );
    const r = await svc.validate(TENANT, SPEC_ID, ['T500'], ['INGESTION']);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.valid).toBe(true);
    expect(r.data!.errors).toHaveLength(0);
  });

  it('F26B-12: too few task types → errors populated, valid: false', async () => {
    const svc = new FlowSpecValidator(
      makeDb(),
      makeQueue(),
      makeFreedom({ min_task_types: 5, required_archetypes: [] }),
    );
    const r = await svc.validate(TENANT, SPEC_ID, ['T500'], []);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.valid).toBe(false);
    expect(r.data!.errors.length).toBeGreaterThan(0);
  });

  it('F26B-13: FREEDOM config failure → error propagated', async () => {
    const svc = new FlowSpecValidator(makeDb(), makeQueue(), makeFailingFreedom());
    const r = await svc.validate(TENANT, SPEC_ID, ['T500'], []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('CONFIG_NOT_FOUND');
  });

  it('F26B-14: valid spec → emits flow.spec.validated', async () => {
    const queue = makeQueue();
    const svc = new FlowSpecValidator(makeDb(), queue, makeFreedom());
    await svc.validate(TENANT, SPEC_ID, ['T500'], []);
    expect(queue.enqueue).toHaveBeenCalledWith('flow.spec.validated', expect.any(Object));
  });

  it('F26B-15: invalid spec → emits flow.spec.invalid', async () => {
    const queue = makeQueue();
    const svc = new FlowSpecValidator(
      makeDb(),
      queue,
      makeFreedom({ min_task_types: 10, required_archetypes: [] }),
    );
    await svc.validate(TENANT, SPEC_ID, ['T500'], []);
    expect(queue.enqueue).toHaveBeenCalledWith('flow.spec.invalid', expect.any(Object));
  });

  it('F26B-16: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new FlowSpecValidator(db, queue, makeFreedom());
    await svc.validate(TENANT, SPEC_ID, ['T500'], []);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });
});

// ── T391 FlowDependencyMapper ─────────────────────────────────────────────────

describe('FlowDependencyMapper (T391)', () => {
  it('F26B-17: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new FlowDependencyMapper(makeDb(), makeQueue());
    const r = await svc.map('', SPEC_ID, [], [], []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26B-18: valid args → success', async () => {
    const svc = new FlowDependencyMapper(makeDb(), makeQueue());
    const r = await svc.map(TENANT, SPEC_ID, ['entity_a'], ['event_a'], ['/api/a']);
    expect(r.isSuccess).toBe(true);
  });

  it('F26B-19: no overlaps → empty dependentFlows and conflictSurface', async () => {
    const svc = new FlowDependencyMapper(makeDb([]), makeQueue());
    const r = await svc.map(TENANT, SPEC_ID, ['entity_a'], ['event_a'], ['/api/a']);
    expect(r.data!.dependentFlows).toHaveLength(0);
    expect(r.data!.conflictSurface).toHaveLength(0);
  });

  it('F26B-20: mapId is non-empty string', async () => {
    const svc = new FlowDependencyMapper(makeDb(), makeQueue());
    const r = await svc.map(TENANT, SPEC_ID, [], [], []);
    expect(r.data!.mapId.length).toBeGreaterThan(0);
  });

  it('F26B-21: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new FlowDependencyMapper(db, queue);
    await svc.map(TENANT, SPEC_ID, [], [], []);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26B-22: emits flow.dependencies.mapped event', async () => {
    const queue = makeQueue();
    const svc = new FlowDependencyMapper(makeDb(), queue);
    await svc.map(TENANT, SPEC_ID, [], [], []);
    expect(queue.enqueue).toHaveBeenCalledWith('flow.dependencies.mapped', expect.any(Object));
  });
});

// ── T392 FlowTemplateResolver ─────────────────────────────────────────────────

describe('FlowTemplateResolver (T392)', () => {
  it('F26B-23: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new FlowTemplateResolver(
      makeDb(),
      makeQueue(),
      makeFreedom({ INGESTION: 'ingestion-template' }),
    );
    const r = await svc.resolve('', SPEC_ID, ['INGESTION']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26B-24: valid args → success', async () => {
    const svc = new FlowTemplateResolver(
      makeDb(),
      makeQueue(),
      makeFreedom({ INGESTION: 'ingestion-template' }),
    );
    const r = await svc.resolve(TENANT, SPEC_ID, ['INGESTION']);
    expect(r.isSuccess).toBe(true);
  });

  it('F26B-25: templateSetId is non-empty string', async () => {
    const svc = new FlowTemplateResolver(
      makeDb(),
      makeQueue(),
      makeFreedom({ INGESTION: 'ingestion-template' }),
    );
    const r = await svc.resolve(TENANT, SPEC_ID, ['INGESTION']);
    expect(r.data!.templateSetId.length).toBeGreaterThan(0);
  });

  it('F26B-26: resolvedCount matches archetypes with templates', async () => {
    const svc = new FlowTemplateResolver(
      makeDb(),
      makeQueue(),
      makeFreedom({ INGESTION: 'tmpl-a', BUILD: 'tmpl-b' }),
    );
    const r = await svc.resolve(TENANT, SPEC_ID, ['INGESTION', 'BUILD']);
    expect(r.data!.resolvedCount).toBe(2);
  });

  it('F26B-27: FREEDOM config failure → error propagated', async () => {
    const svc = new FlowTemplateResolver(makeDb(), makeQueue(), makeFailingFreedom());
    const r = await svc.resolve(TENANT, SPEC_ID, ['INGESTION']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('CONFIG_NOT_FOUND');
  });

  it('F26B-28: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new FlowTemplateResolver(db, queue, makeFreedom({ INGESTION: 'tmpl' }));
    await svc.resolve(TENANT, SPEC_ID, ['INGESTION']);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26B-29: emits flow.templates.resolved event', async () => {
    const queue = makeQueue();
    const svc = new FlowTemplateResolver(makeDb(), queue, makeFreedom({ INGESTION: 'tmpl' }));
    await svc.resolve(TENANT, SPEC_ID, ['INGESTION']);
    expect(queue.enqueue).toHaveBeenCalledWith('flow.templates.resolved', expect.any(Object));
  });
});
