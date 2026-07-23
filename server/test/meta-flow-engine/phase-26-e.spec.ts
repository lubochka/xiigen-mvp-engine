/**
 * FLOW-26 Phase E — Registration Pipeline Tests (T403, T404, T405, T406, T407).
 *
 * T403 FlowRegistrationOrchestrator
 * T404 TaskTypeRegistrar
 * T405 FactoryRegistrar
 * T406 SeedPromptRegistrar
 * T407 FlowDeploymentGate
 */

import { FlowRegistrationOrchestrator } from '../../src/engine/flows/flow-extension-engine/flow-registration-orchestrator.service';
import { TaskTypeRegistrar } from '../../src/engine/flows/flow-extension-engine/task-type-registrar.service';
import { FactoryRegistrar } from '../../src/engine/flows/flow-extension-engine/factory-registrar.service';
import { SeedPromptRegistrar } from '../../src/engine/flows/flow-extension-engine/seed-prompt-registrar.service';
import { FlowDeploymentGate } from '../../src/engine/flows/flow-extension-engine/flow-deployment-gate.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-flow26-e';
const FLOW_ID = 'FLOW-99';
const TASK_TYPE_ID = 'T500';
const FACTORY_ID = 'F1200';

const ALL_PHASES = [
  'code_assembled',
  'dna_checked',
  'bfa_scanned',
  'quality_passed',
  'syntax_validated',
  'impact_analyzed',
  'registered',
];

const VALID_PROMPTS = [
  {
    taskType: 'T500',
    promptText: 'Generate a NestJS service that follows all DNA patterns.',
    connection_type: 'FLOW_SCOPED',
    flow_id: FLOW_ID,
  },
];

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

// ── T403 FlowRegistrationOrchestrator ─────────────────────────────────────────

describe('FlowRegistrationOrchestrator (T403)', () => {
  it('F26E-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new FlowRegistrationOrchestrator(makeDb(), makeQueue()).register(
      '',
      FLOW_ID,
      {},
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26E-2: valid args → success with REGISTERED status', async () => {
    const r = await new FlowRegistrationOrchestrator(makeDb(), makeQueue()).register(
      TENANT,
      FLOW_ID,
      {},
    );
    expect(r.isSuccess).toBe(true);
    expect(r.data!.status).toBe('REGISTERED');
  });

  it('F26E-3: flowId echoed in result', async () => {
    const r = await new FlowRegistrationOrchestrator(makeDb(), makeQueue()).register(
      TENANT,
      FLOW_ID,
      {},
    );
    expect(r.data!.flowId).toBe(FLOW_ID);
  });

  it('F26E-4: idempotent — second call returns existing without re-storing', async () => {
    const existing = [
      {
        registrationId: 'existing-reg',
        flowId: FLOW_ID,
        status: 'REGISTERED',
        registeredAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    const db = makeDb(existing);
    const r = await new FlowRegistrationOrchestrator(db, makeQueue()).register(TENANT, FLOW_ID, {});
    expect(r.data!.registrationId).toBe('existing-reg');
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('F26E-5: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    await new FlowRegistrationOrchestrator(db, queue).register(TENANT, FLOW_ID, {});
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26E-6: emits flow.registered', async () => {
    const queue = makeQueue();
    await new FlowRegistrationOrchestrator(makeDb(), queue).register(TENANT, FLOW_ID, {});
    expect(queue.enqueue).toHaveBeenCalledWith('flow.registered', expect.any(Object));
  });

  it('F26E-7: DB store failure → error propagated', async () => {
    const r = await new FlowRegistrationOrchestrator(makeFailingDb(), makeQueue()).register(
      TENANT,
      FLOW_ID,
      {},
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });
});

// ── T404 TaskTypeRegistrar ────────────────────────────────────────────────────

describe('TaskTypeRegistrar (T404)', () => {
  const VALID_DEF = { name: 'TestService', archetype: 'BUILD' };

  it('F26E-8: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new TaskTypeRegistrar(makeDb(), makeQueue()).register(
      '',
      TASK_TYPE_ID,
      VALID_DEF,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26E-9: valid args → success', async () => {
    const r = await new TaskTypeRegistrar(makeDb(), makeQueue()).register(
      TENANT,
      TASK_TYPE_ID,
      VALID_DEF,
    );
    expect(r.isSuccess).toBe(true);
  });

  it('F26E-10: taskTypeId echoed in result', async () => {
    const r = await new TaskTypeRegistrar(makeDb(), makeQueue()).register(
      TENANT,
      TASK_TYPE_ID,
      VALID_DEF,
    );
    expect(r.data!.taskTypeId).toBe(TASK_TYPE_ID);
  });

  it('F26E-11: missing name or archetype → INVALID_TASK_TYPE_DEF', async () => {
    const r = await new TaskTypeRegistrar(makeDb(), makeQueue()).register(TENANT, TASK_TYPE_ID, {
      name: 'Test',
    });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('INVALID_TASK_TYPE_DEF');
  });

  it('F26E-12: idempotent — second call returns existing without re-storing', async () => {
    const existing = [
      {
        registrationId: 'existing-tt',
        taskTypeId: TASK_TYPE_ID,
        registeredAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    const db = makeDb(existing);
    const r = await new TaskTypeRegistrar(db, makeQueue()).register(
      TENANT,
      TASK_TYPE_ID,
      VALID_DEF,
    );
    expect(r.data!.registrationId).toBe('existing-tt');
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('F26E-13: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    await new TaskTypeRegistrar(db, queue).register(TENANT, TASK_TYPE_ID, VALID_DEF);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26E-14: emits flow.tasktype.registered', async () => {
    const queue = makeQueue();
    await new TaskTypeRegistrar(makeDb(), queue).register(TENANT, TASK_TYPE_ID, VALID_DEF);
    expect(queue.enqueue).toHaveBeenCalledWith('flow.tasktype.registered', expect.any(Object));
  });
});

// ── T405 FactoryRegistrar ─────────────────────────────────────────────────────

describe('FactoryRegistrar (T405)', () => {
  const VALID_FACTORY_DEF = { fabricType: 'DATABASE', resolutionMethod: 'createAsync' };

  it('F26E-15: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new FactoryRegistrar(makeDb(), makeQueue()).register(
      '',
      FACTORY_ID,
      VALID_FACTORY_DEF,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26E-16: valid args → success', async () => {
    const r = await new FactoryRegistrar(makeDb(), makeQueue()).register(
      TENANT,
      FACTORY_ID,
      VALID_FACTORY_DEF,
    );
    expect(r.isSuccess).toBe(true);
  });

  it('F26E-17: factoryId echoed in result', async () => {
    const r = await new FactoryRegistrar(makeDb(), makeQueue()).register(
      TENANT,
      FACTORY_ID,
      VALID_FACTORY_DEF,
    );
    expect(r.data!.factoryId).toBe(FACTORY_ID);
  });

  it('F26E-18: invalid fabricType → INVALID_FABRIC_TYPE', async () => {
    const r = await new FactoryRegistrar(makeDb(), makeQueue()).register(TENANT, FACTORY_ID, {
      fabricType: 'INVALID',
    });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('INVALID_FABRIC_TYPE');
  });

  it('F26E-19: missing fabricType → INVALID_FABRIC_TYPE', async () => {
    const r = await new FactoryRegistrar(makeDb(), makeQueue()).register(TENANT, FACTORY_ID, {});
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('INVALID_FABRIC_TYPE');
  });

  it('F26E-20: idempotent — second call returns existing without re-storing', async () => {
    const existing = [
      {
        registrationId: 'existing-fac',
        factoryId: FACTORY_ID,
        registeredAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    const db = makeDb(existing);
    const r = await new FactoryRegistrar(db, makeQueue()).register(
      TENANT,
      FACTORY_ID,
      VALID_FACTORY_DEF,
    );
    expect(r.data!.registrationId).toBe('existing-fac');
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('F26E-21: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    await new FactoryRegistrar(db, queue).register(TENANT, FACTORY_ID, VALID_FACTORY_DEF);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26E-22: emits flow.factory.registered', async () => {
    const queue = makeQueue();
    await new FactoryRegistrar(makeDb(), queue).register(TENANT, FACTORY_ID, VALID_FACTORY_DEF);
    expect(queue.enqueue).toHaveBeenCalledWith('flow.factory.registered', expect.any(Object));
  });
});

// ── T406 SeedPromptRegistrar ──────────────────────────────────────────────────

describe('SeedPromptRegistrar (T406)', () => {
  it('F26E-23: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new SeedPromptRegistrar(makeDb(), makeQueue()).register(
      '',
      FLOW_ID,
      VALID_PROMPTS,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26E-24: valid args → success', async () => {
    const r = await new SeedPromptRegistrar(makeDb(), makeQueue()).register(
      TENANT,
      FLOW_ID,
      VALID_PROMPTS,
    );
    expect(r.isSuccess).toBe(true);
  });

  it('F26E-25: promptCount equals prompts length', async () => {
    const prompts = [
      ...VALID_PROMPTS,
      {
        taskType: 'T501',
        promptText: 'Generate a second NestJS service following DNA patterns.',
        connection_type: 'FLOW_SCOPED',
        flow_id: FLOW_ID,
      },
    ];
    const r = await new SeedPromptRegistrar(makeDb(), makeQueue()).register(
      TENANT,
      FLOW_ID,
      prompts,
    );
    expect(r.data!.promptCount).toBe(2);
  });

  it('F26E-26: non-FLOW_SCOPED connection_type → INVALID_CONNECTION_TYPE', async () => {
    const bad = [
      {
        taskType: 'T500',
        promptText: 'some prompt text long enough',
        connection_type: 'GLOBAL',
        flow_id: FLOW_ID,
      },
    ];
    const r = await new SeedPromptRegistrar(makeDb(), makeQueue()).register(TENANT, FLOW_ID, bad);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('INVALID_CONNECTION_TYPE');
  });

  it('F26E-27: empty promptText → INVALID_PROMPT_TEXT', async () => {
    const bad = [
      { taskType: 'T500', promptText: '', connection_type: 'FLOW_SCOPED', flow_id: FLOW_ID },
    ];
    const r = await new SeedPromptRegistrar(makeDb(), makeQueue()).register(TENANT, FLOW_ID, bad);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('INVALID_PROMPT_TEXT');
  });

  it('F26E-28: flowId echoed in result', async () => {
    const r = await new SeedPromptRegistrar(makeDb(), makeQueue()).register(
      TENANT,
      FLOW_ID,
      VALID_PROMPTS,
    );
    expect(r.data!.flowId).toBe(FLOW_ID);
  });

  it('F26E-29: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    await new SeedPromptRegistrar(db, queue).register(TENANT, FLOW_ID, VALID_PROMPTS);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26E-30: emits flow.prompts.registered', async () => {
    const queue = makeQueue();
    await new SeedPromptRegistrar(makeDb(), queue).register(TENANT, FLOW_ID, VALID_PROMPTS);
    expect(queue.enqueue).toHaveBeenCalledWith('flow.prompts.registered', expect.any(Object));
  });
});

// ── T407 FlowDeploymentGate ───────────────────────────────────────────────────

describe('FlowDeploymentGate (T407)', () => {
  it('F26E-31: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new FlowDeploymentGate(makeDb(), makeQueue()).approve('', FLOW_ID, ALL_PHASES);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26E-32: all phases complete → success, approved=true', async () => {
    const r = await new FlowDeploymentGate(makeDb(), makeQueue()).approve(
      TENANT,
      FLOW_ID,
      ALL_PHASES,
    );
    expect(r.isSuccess).toBe(true);
    expect(r.data!.approved).toBe(true);
  });

  it('F26E-33: missing required phases → FLOW_DEPLOYMENT_BLOCKED hard stop', async () => {
    const partial = ['code_assembled', 'dna_checked'];
    const r = await new FlowDeploymentGate(makeDb(), makeQueue()).approve(TENANT, FLOW_ID, partial);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('FLOW_DEPLOYMENT_BLOCKED');
  });

  it('F26E-34: empty phases → FLOW_DEPLOYMENT_BLOCKED', async () => {
    const r = await new FlowDeploymentGate(makeDb(), makeQueue()).approve(TENANT, FLOW_ID, []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('FLOW_DEPLOYMENT_BLOCKED');
  });

  it('F26E-35: flowId echoed in result', async () => {
    const r = await new FlowDeploymentGate(makeDb(), makeQueue()).approve(
      TENANT,
      FLOW_ID,
      ALL_PHASES,
    );
    expect(r.data!.flowId).toBe(FLOW_ID);
  });

  it('F26E-36: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    await new FlowDeploymentGate(db, queue).approve(TENANT, FLOW_ID, ALL_PHASES);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26E-37: emits flow.deployment.approved', async () => {
    const queue = makeQueue();
    await new FlowDeploymentGate(makeDb(), queue).approve(TENANT, FLOW_ID, ALL_PHASES);
    expect(queue.enqueue).toHaveBeenCalledWith('flow.deployment.approved', expect.any(Object));
  });

  it('F26E-38: DB store failure → error propagated', async () => {
    const r = await new FlowDeploymentGate(makeFailingDb(), makeQueue()).approve(
      TENANT,
      FLOW_ID,
      ALL_PHASES,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });
});
