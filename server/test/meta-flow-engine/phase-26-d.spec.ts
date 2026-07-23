/**
 * FLOW-26 Phase D — Validation & Analysis Tests (T398, T399, T400, T401, T402).
 *
 * T398 DnaComplianceChecker
 * T399 BfaConflictScanner
 * T400 FlowQualityGate
 * T401 SyntaxValidationRunner
 * T402 CrossFlowImpactAnalyzer
 */

import { DnaComplianceChecker } from '../../src/engine/flows/flow-extension-engine/dna-compliance-checker.service';
import { BfaConflictScanner } from '../../src/engine/flows/flow-extension-engine/bfa-conflict-scanner.service';
import { FlowQualityGate } from '../../src/engine/flows/flow-extension-engine/flow-quality-gate.service';
import { SyntaxValidationRunner } from '../../src/engine/flows/flow-extension-engine/syntax-validation-runner.service';
import { CrossFlowImpactAnalyzer } from '../../src/engine/flows/flow-extension-engine/cross-flow-impact-analyzer.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-flow26-d';
const FLOW_ID = 'FLOW-99';
const ASM_ID = 'asm-1';
const CODE_ID = 'code-1';

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

function makeFreedom(data: Record<string, unknown> = {}) {
  return {
    get: jest.fn(async () => DataProcessResult.success(data)),
  } as any;
}

const VALID_CODE = `
import { DataProcessResult } from '../kernel/data-process-result';

export class TestService {
  async doWork(tenantId: string): Promise<DataProcessResult<Record<string, unknown>>> {
    return DataProcessResult.success({ done: true });
  }
}
`;

const VALID_BFA = { entities: ['entity_new'], events: ['event_new'], apiRoutes: ['/api/new'] };

// ── T398 DnaComplianceChecker ─────────────────────────────────────────────────

describe('DnaComplianceChecker (T398)', () => {
  it('F26D-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new DnaComplianceChecker(makeDb(), makeQueue()).check('', ASM_ID, []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26D-2: valid args with no violations → success, passed=true', async () => {
    const r = await new DnaComplianceChecker(makeDb(), makeQueue()).check(TENANT, ASM_ID, []);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.passed).toBe(true);
  });

  it('F26D-3: artifacts with violation flags → passed=false, violations non-empty', async () => {
    const artifacts = [{ artifactId: 'a1', dnaFlags: ['VIOLATION:DNA-3'] }];
    const r = await new DnaComplianceChecker(makeDb(), makeQueue()).check(
      TENANT,
      ASM_ID,
      artifacts,
    );
    expect(r.isSuccess).toBe(true);
    expect(r.data!.passed).toBe(false);
    expect(r.data!.violations.length).toBeGreaterThan(0);
  });

  it('F26D-4: assemblyId echoed in result', async () => {
    const r = await new DnaComplianceChecker(makeDb(), makeQueue()).check(TENANT, ASM_ID, []);
    expect(r.data!.assemblyId).toBe(ASM_ID);
  });

  it('F26D-5: idempotent — second call returns existing without re-storing', async () => {
    const existing = [
      {
        checkId: 'existing-chk',
        assemblyId: ASM_ID,
        passed: true,
        violations: [],
        checkedAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    const db = makeDb(existing);
    const r = await new DnaComplianceChecker(db, makeQueue()).check(TENANT, ASM_ID, []);
    expect(r.data!.checkId).toBe('existing-chk');
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('F26D-6: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    await new DnaComplianceChecker(db, queue).check(TENANT, ASM_ID, []);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26D-7: emits flow.dna.checked', async () => {
    const queue = makeQueue();
    await new DnaComplianceChecker(makeDb(), queue).check(TENANT, ASM_ID, []);
    expect(queue.enqueue).toHaveBeenCalledWith('flow.dna.checked', expect.any(Object));
  });

  it('F26D-8: DB store failure → error propagated', async () => {
    const r = await new DnaComplianceChecker(makeFailingDb(), makeQueue()).check(
      TENANT,
      ASM_ID,
      [],
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });
});

// ── T399 BfaConflictScanner ───────────────────────────────────────────────────

describe('BfaConflictScanner (T399)', () => {
  it('F26D-9: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new BfaConflictScanner(makeDb(), makeQueue()).scan('', FLOW_ID, VALID_BFA);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26D-10: no existing flows → success, no conflicts', async () => {
    const r = await new BfaConflictScanner(makeDb(), makeQueue()).scan(TENANT, FLOW_ID, VALID_BFA);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.conflicts).toHaveLength(0);
  });

  it('F26D-11: entity conflict in existing flow → BFA_CONFLICT_DETECTED', async () => {
    const existing = [
      {
        flowId: 'FLOW-01',
        bfaRegistration: { entities: ['entity_new'], events: [], apiRoutes: [] },
      },
    ];
    const r = await new BfaConflictScanner(makeDb(existing), makeQueue()).scan(
      TENANT,
      FLOW_ID,
      VALID_BFA,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('BFA_CONFLICT_DETECTED');
  });

  it('F26D-12: event conflict in existing flow → BFA_CONFLICT_DETECTED', async () => {
    const existing = [
      {
        flowId: 'FLOW-01',
        bfaRegistration: { entities: [], events: ['event_new'], apiRoutes: [] },
      },
    ];
    const r = await new BfaConflictScanner(makeDb(existing), makeQueue()).scan(
      TENANT,
      FLOW_ID,
      VALID_BFA,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('BFA_CONFLICT_DETECTED');
  });

  it('F26D-13: route conflict in existing flow → BFA_CONFLICT_DETECTED', async () => {
    const existing = [
      {
        flowId: 'FLOW-01',
        bfaRegistration: { entities: [], events: [], apiRoutes: ['/api/new'] },
      },
    ];
    const r = await new BfaConflictScanner(makeDb(existing), makeQueue()).scan(
      TENANT,
      FLOW_ID,
      VALID_BFA,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('BFA_CONFLICT_DETECTED');
  });

  it('F26D-14: scannedFlowCount matches existing flows (excluding self)', async () => {
    const existing = [
      { flowId: 'FLOW-01', bfaRegistration: { entities: [], events: [], apiRoutes: [] } },
      { flowId: 'FLOW-02', bfaRegistration: { entities: [], events: [], apiRoutes: [] } },
    ];
    const r = await new BfaConflictScanner(makeDb(existing), makeQueue()).scan(
      TENANT,
      FLOW_ID,
      VALID_BFA,
    );
    expect(r.data!.scannedFlowCount).toBe(2);
  });

  it('F26D-15: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    await new BfaConflictScanner(db, queue).scan(TENANT, FLOW_ID, VALID_BFA);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26D-16: emits flow.bfa.scanned', async () => {
    const queue = makeQueue();
    await new BfaConflictScanner(makeDb(), queue).scan(TENANT, FLOW_ID, VALID_BFA);
    expect(queue.enqueue).toHaveBeenCalledWith('flow.bfa.scanned', expect.any(Object));
  });
});

// ── T400 FlowQualityGate ──────────────────────────────────────────────────────

describe('FlowQualityGate (T400)', () => {
  const PASS_METRICS = { testCoverage: 0.9, dnaScore: 1.0, bfaScore: 1.0 };
  const FAIL_METRICS = { testCoverage: 0.5, dnaScore: 0.7, bfaScore: 1.0 };

  it('F26D-17: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new FlowQualityGate(makeDb(), makeQueue(), makeFreedom()).evaluate(
      '',
      FLOW_ID,
      PASS_METRICS,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26D-18: metrics below threshold → QUALITY_GATE_FAILED hard stop', async () => {
    const r = await new FlowQualityGate(makeDb(), makeQueue(), makeFreedom()).evaluate(
      TENANT,
      FLOW_ID,
      FAIL_METRICS,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('QUALITY_GATE_FAILED');
  });

  it('F26D-19: all metrics passing → success, passed=true', async () => {
    const r = await new FlowQualityGate(makeDb(), makeQueue(), makeFreedom()).evaluate(
      TENANT,
      FLOW_ID,
      PASS_METRICS,
    );
    expect(r.isSuccess).toBe(true);
    expect(r.data!.passed).toBe(true);
  });

  it('F26D-20: score is average of three metrics', async () => {
    const r = await new FlowQualityGate(makeDb(), makeQueue(), makeFreedom()).evaluate(
      TENANT,
      FLOW_ID,
      PASS_METRICS,
    );
    const expected =
      (PASS_METRICS.testCoverage + PASS_METRICS.dnaScore + PASS_METRICS.bfaScore) / 3;
    expect(r.data!.score).toBeCloseTo(expected, 5);
  });

  it('F26D-21: FREEDOM config overrides default threshold', async () => {
    const freedom = makeFreedom({ minTestCoverage: 0.3, minDnaScore: 0.3, minBfaScore: 0.3 });
    const lowMetrics = { testCoverage: 0.4, dnaScore: 0.4, bfaScore: 0.4 };
    const r = await new FlowQualityGate(makeDb(), makeQueue(), freedom).evaluate(
      TENANT,
      FLOW_ID,
      lowMetrics,
    );
    expect(r.isSuccess).toBe(true);
  });

  it('F26D-22: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    await new FlowQualityGate(db, queue, makeFreedom()).evaluate(TENANT, FLOW_ID, PASS_METRICS);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26D-23: emits flow.quality.passed', async () => {
    const queue = makeQueue();
    await new FlowQualityGate(makeDb(), queue, makeFreedom()).evaluate(
      TENANT,
      FLOW_ID,
      PASS_METRICS,
    );
    expect(queue.enqueue).toHaveBeenCalledWith('flow.quality.passed', expect.any(Object));
  });
});

// ── T401 SyntaxValidationRunner ───────────────────────────────────────────────

describe('SyntaxValidationRunner (T401)', () => {
  it('F26D-24: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new SyntaxValidationRunner(makeDb(), makeQueue()).validate(
      '',
      CODE_ID,
      VALID_CODE,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26D-25: valid TypeScript code → success', async () => {
    const r = await new SyntaxValidationRunner(makeDb(), makeQueue()).validate(
      TENANT,
      CODE_ID,
      VALID_CODE,
    );
    expect(r.isSuccess).toBe(true);
    expect(r.data!.valid).toBe(true);
  });

  it('F26D-26: empty code → EMPTY_CODE_CONTENT', async () => {
    const r = await new SyntaxValidationRunner(makeDb(), makeQueue()).validate(TENANT, CODE_ID, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('EMPTY_CODE_CONTENT');
  });

  it('F26D-27: unmatched braces → SYNTAX_VALIDATION_FAILED', async () => {
    const bad = 'export class Foo { doWork() { return { done: true; }';
    const r = await new SyntaxValidationRunner(makeDb(), makeQueue()).validate(
      TENANT,
      CODE_ID,
      bad,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('SYNTAX_VALIDATION_FAILED');
  });

  it('F26D-28: codeId echoed in result', async () => {
    const r = await new SyntaxValidationRunner(makeDb(), makeQueue()).validate(
      TENANT,
      CODE_ID,
      VALID_CODE,
    );
    expect(r.data!.codeId).toBe(CODE_ID);
  });

  it('F26D-29: errorCount is 0 on success', async () => {
    const r = await new SyntaxValidationRunner(makeDb(), makeQueue()).validate(
      TENANT,
      CODE_ID,
      VALID_CODE,
    );
    expect(r.data!.errorCount).toBe(0);
  });

  it('F26D-30: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    await new SyntaxValidationRunner(db, queue).validate(TENANT, CODE_ID, VALID_CODE);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26D-31: emits flow.syntax.validated', async () => {
    const queue = makeQueue();
    await new SyntaxValidationRunner(makeDb(), queue).validate(TENANT, CODE_ID, VALID_CODE);
    expect(queue.enqueue).toHaveBeenCalledWith('flow.syntax.validated', expect.any(Object));
  });
});

// ── T402 CrossFlowImpactAnalyzer ──────────────────────────────────────────────

describe('CrossFlowImpactAnalyzer (T402)', () => {
  it('F26D-32: missing tenantId → UNSCOPED_QUERY', async () => {
    const r = await new CrossFlowImpactAnalyzer(makeDb(), makeQueue()).analyze(
      '',
      FLOW_ID,
      ['T500'],
      ['event_a'],
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F26D-33: no existing flows → success, severity NONE', async () => {
    const r = await new CrossFlowImpactAnalyzer(makeDb(), makeQueue()).analyze(
      TENANT,
      FLOW_ID,
      ['T500'],
      ['event_a'],
    );
    expect(r.isSuccess).toBe(true);
    expect(r.data!.severity).toBe('NONE');
    expect(r.data!.impactScore).toBe(0);
  });

  it('F26D-34: no overlapping task types or events → NONE severity', async () => {
    const existing = [{ flowId: 'FLOW-01', taskTypes: ['T001'], events: ['event_old'] }];
    const r = await new CrossFlowImpactAnalyzer(makeDb(existing), makeQueue()).analyze(
      TENANT,
      FLOW_ID,
      ['T500'],
      ['event_a'],
    );
    expect(r.data!.severity).toBe('NONE');
    expect(r.data!.affectedFlows).toHaveLength(0);
  });

  it('F26D-35: partial overlap → affected flows listed', async () => {
    const existing = [
      { flowId: 'FLOW-01', taskTypes: ['T500'], events: ['event_old'] },
      { flowId: 'FLOW-02', taskTypes: ['T999'], events: ['event_other'] },
    ];
    const r = await new CrossFlowImpactAnalyzer(makeDb(existing), makeQueue()).analyze(
      TENANT,
      FLOW_ID,
      ['T500'],
      ['event_a'],
    );
    expect(r.data!.affectedFlows).toContain('FLOW-01');
    expect(r.data!.affectedFlows).not.toContain('FLOW-02');
  });

  it('F26D-36: impactScore between 0 and 1', async () => {
    const r = await new CrossFlowImpactAnalyzer(makeDb(), makeQueue()).analyze(
      TENANT,
      FLOW_ID,
      ['T500'],
      ['event_a'],
    );
    expect(r.data!.impactScore).toBeGreaterThanOrEqual(0);
    expect(r.data!.impactScore).toBeLessThanOrEqual(1);
  });

  it('F26D-37: flowId echoed in result', async () => {
    const r = await new CrossFlowImpactAnalyzer(makeDb(), makeQueue()).analyze(
      TENANT,
      FLOW_ID,
      ['T500'],
      ['event_a'],
    );
    expect(r.data!.flowId).toBe(FLOW_ID);
  });

  it('F26D-38: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    await new CrossFlowImpactAnalyzer(db, queue).analyze(TENANT, FLOW_ID, ['T500'], ['event_a']);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F26D-39: emits flow.impact.analyzed', async () => {
    const queue = makeQueue();
    await new CrossFlowImpactAnalyzer(makeDb(), queue).analyze(
      TENANT,
      FLOW_ID,
      ['T500'],
      ['event_a'],
    );
    expect(queue.enqueue).toHaveBeenCalledWith('flow.impact.analyzed', expect.any(Object));
  });

  it('F26D-40: DB store failure → error propagated', async () => {
    const r = await new CrossFlowImpactAnalyzer(makeFailingDb(), makeQueue()).analyze(
      TENANT,
      FLOW_ID,
      ['T500'],
      ['event_a'],
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });
});
